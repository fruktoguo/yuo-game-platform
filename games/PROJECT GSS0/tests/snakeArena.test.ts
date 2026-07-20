import { describe, expect, it, vi } from 'vitest';
import {
  CANONICAL_CELL_SIZE,
  DISCONNECT_GRACE_MS,
  ENEMY_BASE_SPEED,
  PLAYER_BASE_SPEED,
  RESPAWN_DELAY_MS,
  UPGRADE_INVULNERABILITY_DURATION,
} from '../src/shared/constants';
import type { PlayerHeadCollisionEvent, UltraEffect, UltraProjectileEvent } from '../src/shared/protocol';
import { UltraWorld } from '../src/server/UltraWorld';

describe('UltraWorld 原版 PvE 与多人共享世界', () => {
  it('首帧严格生成两枚球和一条敌蛇预警', () => {
    const effects: UltraEffect[] = [];
    const world = new UltraWorld({ random: () => 0.25, callbacks: { onEffects: (items) => effects.push(...items) } });
    world.connectPlayer('account-a', '玩家甲', 0);
    expect(world.spawn('account-a', 0)).toBe(true);

    world.step(1 / 30, 34);
    const snapshot = world.getSnapshot(34);

    expect(snapshot.waveCount).toBe(1);
    expect(snapshot.foods).toHaveLength(2);
    expect(snapshot.enemies).toHaveLength(0);
    expect(snapshot.pendingSpawns).toHaveLength(1);
    expect(snapshot.pendingSpawns[0].timer).toBeCloseTo(1.5, 2);
    expect(effects.filter((effect) => effect.type === 'sound').map((effect) => effect.kind)).toEqual(expect.arrayContaining(['start', 'foodSpawn', 'enemyWarning']));
  });

  it('客户端吃球确认可覆盖蛇头和身体的网络延迟，但拒绝远距离与重复领取', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & { speed: number; xp: number }>).get('account-a')!;
    player.col = 10;
    player.row = 10;
    player.speed = 5;
    player.segments = [testSegment(9.3, 10)];
    Reflect.set(world, 'foods', [
      testFood(1, 10.9, 10),
      testFood(2, 9.3, 10.35),
      testFood(3, 16, 16),
    ]);

    expect(world.claimFoods('account-a', [1, 2, 3, 1])).toEqual([1, 2]);
    expect(player.xp).toBe(2);
    expect(world.getSnapshot(0).foods.map((food) => food.id)).toEqual([3]);
    expect(world.claimFoods('account-a', [1, 2, 3])).toEqual([]);
  });

  it('场地面积按最高等级增长，并在最高等级玩家死亡后平滑收缩并产生真实墙壁碰撞', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '高等级玩家', 0);
    world.connectPlayer('account-b', '留场玩家', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    Reflect.set(world, 'waveTimer', 999);
    const players = Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & { alive: boolean; level: number }>;
    const highLevel = players.get('account-a')!;
    const survivor = players.get('account-b')!;
    highLevel.level = 10;
    survivor.level = 2;
    const updateArenaSize = Reflect.get(world, 'updateArenaSize') as (delta: number) => void;

    updateArenaSize.call(world, 0.05);
    expect(world.getSnapshot(0).arenaSize).toBeGreaterThan(24);
    expect(world.getSnapshot(0).arenaSize).toBeLessThan(24 * Math.sqrt(1.5));
    for (let index = 0; index < 200; index += 1) updateArenaSize.call(world, 0.05);
    expect(world.getSnapshot(0).arenaSize ** 2 / 24 ** 2).toBeCloseTo(1.5, 4);

    highLevel.alive = false;
    const expandedSize = world.getSnapshot(0).arenaSize;
    updateArenaSize.call(world, 0.05);
    expect(world.getSnapshot(0).arenaSize).toBeLessThan(expandedSize);
    for (let index = 0; index < 200; index += 1) updateArenaSize.call(world, 0.05);
    expect(world.getSnapshot(0).arenaSize ** 2 / 24 ** 2).toBeCloseTo(1.1, 4);

    survivor.col = -3;
    survivor.row = 12;
    survivor.autopilot = true;
    world.step(0, 100);
    const minimum = (24 - world.getSnapshot(100).arenaSize) / 2;
    expect(survivor.col).toBeGreaterThanOrEqual(minimum);
    expect(survivor.knockbackX).toBeGreaterThan(0);
  });

  it('玩家等级不再提高移动速度，敌人每点初始生命仅提高 2% 速度', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '速度测试玩家', 0);
    world.spawn('account-a', 0);
    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & {
      level: number;
      xp: number;
      xpNeeded: number;
    }>).get('account-a')!;
    const playerBaseSpeed = Reflect.get(world, 'playerBaseSpeed') as (entity: unknown) => number;

    player.level = 0;
    expect(playerBaseSpeed.call(world, player)).toBe(PLAYER_BASE_SPEED);
    player.level = 10;
    expect(playerBaseSpeed.call(world, player)).toBe(PLAYER_BASE_SPEED);

    const materializeEnemySpawn = Reflect.get(world, 'materializeEnemySpawn') as (spawn: unknown) => void;
    materializeEnemySpawn.call(world, {
      id: 99,
      headCell: { col: 6, row: 6 },
      nextCell: { col: 7, row: 6 },
      bodyCells: Array.from({ length: 4 }, (_, index) => ({ col: 5 - index, row: 6 })),
      totalLength: 5,
      color: '#ff5c62',
      timer: 0,
      maxTimer: 0,
    });
    const [enemy] = Reflect.get(world, 'enemies') as Array<{ speed: number }>;
    expect(enemy.speed).toBeCloseTo(ENEMY_BASE_SPEED * 1.1, 6);
  });

  it('选择升级后获得配置化全身保护且仍可移动吃球', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '升级保护玩家', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & {
      alive: boolean;
      choosingUpgrade: boolean;
      desiredAngle: number;
      invulnerable: number;
      upgradeOffer: { level: number; expiresAt: number; options: string[] } | null;
      xp: number;
    }>).get('account-a')!;
    player.choosingUpgrade = true;
    player.upgradeOffer = { level: 1, expiresAt: 0, options: ['spark'] };
    player.desiredAngle = 0;
    Reflect.set(world, 'foods', [testFood(1, player.col, player.row)]);

    expect(world.chooseUpgrade('account-a', 'spark', 0)).toBe(true);
    expect(player.invulnerable).toBe(UPGRADE_INVULNERABILITY_DURATION);
    const previousCol = player.col;
    world.step(0.05, 50);

    expect(player.col).toBeGreaterThan(previousCol);
    expect(player.xp).toBe(1);
    expect(world.getSnapshot(50).foods).toHaveLength(0);
    expect(player.invulnerable).toBeCloseTo(UPGRADE_INVULNERABILITY_DURATION - 0.05, 6);
  });

  it('长局敌人身体空间桶跨模拟帧复用', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '性能测试玩家', 0);
    world.spawn('account-a', 0);
    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const enemy = testEnemy(18, 18, { segments: [testSegment(17.4, 18), testSegment(16.8, 18)] });
    Reflect.set(world, 'enemies', [enemy]);
    const updateEnemies = Reflect.get(world, 'updateEnemies') as (delta: number, active: unknown[], present: unknown[]) => void;
    const buckets = Reflect.get(world, 'enemyBodyBuckets') as Map<number, { entries: unknown[]; count: number }>;

    updateEnemies.call(world, 0, [player], [player]);
    const firstBuckets = [...buckets.values()];
    const firstEntries = firstBuckets.map((bucket) => bucket.entries[0]);
    updateEnemies.call(world, 0, [player], [player]);
    const secondBuckets = [...buckets.values()];
    const secondEntries = secondBuckets.map((bucket) => bucket.entries[0]);

    expect(secondBuckets).toHaveLength(firstBuckets.length);
    expect(secondBuckets.every((bucket) => firstBuckets.includes(bucket))).toBe(true);
    expect(secondEntries.every((entry) => firstEntries.includes(entry))).toBe(true);
    expect(secondBuckets.every((bucket) => bucket.count > 0)).toBe(true);
  });

  it('暂停或无敌玩家仍参与敌人避让，撞向其头部或身体的单位只会被弹开', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '行动玩家', 0);
    world.connectPlayer('account-b', '保护玩家', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    Reflect.set(world, 'waveTimer', 999);
    const players = Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & {
      alive: boolean;
      paused: boolean;
      choosingUpgrade: boolean;
      invulnerable: number;
      knockbackY: number;
    }>;
    const attacker = players.get('account-a')!;
    const protectedPlayer = players.get('account-b')!;
    attacker.col = 4;
    attacker.row = 4;
    protectedPlayer.col = 10;
    protectedPlayer.row = 10;
    protectedPlayer.segments = [testSegment(10.3, 10)];
    protectedPlayer.paused = true;
    const enemy = testEnemy(8.6, 10, { desiredAngle: 0 });
    const avoidance = Reflect.get(world, 'playerBodyAvoidance') as (enemy: unknown, players: unknown[]) => unknown;
    expect(avoidance.call(world, enemy, [protectedPlayer])).not.toBeNull();

    enemy.col = 10.15;
    Reflect.set(world, 'enemies', [enemy]);
    const updateEnemies = Reflect.get(world, 'updateEnemies') as (delta: number, active: unknown[], present: unknown[]) => void;
    updateEnemies.call(world, 0, [attacker], [attacker, protectedPlayer]);
    expect(enemy.dead).toBe(false);
    expect(Math.hypot(enemy.knockbackX, enemy.knockbackY)).toBeGreaterThan(0);
    expect(Math.hypot(protectedPlayer.knockbackX, protectedPlayer.knockbackY)).toBe(0);

    Reflect.set(world, 'enemies', []);
    protectedPlayer.paused = false;
    protectedPlayer.invulnerable = 1;
    attacker.col = 10.2;
    attacker.row = 10;
    attacker.collisionCooldown = 0;
    attacker.autopilot = true;
    const checkCollisions = Reflect.get(world, 'checkCollisions') as (now: number, active: unknown[], present: unknown[]) => void;
    checkCollisions.call(world, 100, [attacker, protectedPlayer], [attacker, protectedPlayer]);
    expect(attacker.alive).toBe(true);
    expect(Math.hypot(attacker.knockbackX, attacker.knockbackY)).toBeGreaterThan(0);
    expect(Math.hypot(protectedPlayer.knockbackX, protectedPlayer.knockbackY)).toBe(0);
  });

  it('广播快照复用世界实体，普通快照仍保持隔离副本', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const internal = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;

    const networkSnapshot = world.getNetworkSnapshot(100);
    const isolatedSnapshot = world.getSnapshot(100);

    expect(networkSnapshot.players[0]).toBe(internal);
    expect(networkSnapshot.players[0].segments).toBe(internal.segments);
    expect(isolatedSnapshot.players[0]).not.toBe(internal);
    expect(isolatedSnapshot.players[0].segments).not.toBe(internal.segments);
  });

  it('空间特效和战斗音效广播给全场，纯个人反馈仍定向发送', () => {
    const effects: UltraEffect[] = [];
    const world = new UltraWorld({ callbacks: { onEffects: (items) => effects.push(...items) } });
    const burst = Reflect.get(world, 'burst') as (...args: unknown[]) => void;
    const ring = Reflect.get(world, 'ring') as (...args: unknown[]) => void;
    const beam = Reflect.get(world, 'beam') as (...args: unknown[]) => void;
    const textEffect = Reflect.get(world, 'textEffect') as (...args: unknown[]) => void;
    const effectSound = Reflect.get(world, 'effectSound') as (...args: unknown[]) => void;
    const flushEffects = Reflect.get(world, 'flushEffects') as () => void;

    burst.call(world, 4, 5, '#ff5c62', 20, 150, 7);
    ring.call(world, 4, 5, '#ff5c62', 0.5, 4, 2, 7);
    beam.call(world, 'beam', { col: 4, row: 5 }, { col: 6, row: 5 }, '#ffffff', 0.2, 7);
    textEffect.call(world, 4, 5, '击破', '#ffffff', 0.8, 7);
    effectSound.call(world, 'kill', 7);
    effectSound.call(world, 'level', 7);
    flushEffects.call(world);

    expect(effects.filter((effect) => effect.type !== 'sound').every((effect) => effect.audienceEntityId === undefined)).toBe(true);
    expect(effects.find((effect) => effect.type === 'sound' && effect.kind === 'kill')?.audienceEntityId).toBeUndefined();
    expect(effects.find((effect) => effect.type === 'sound' && effect.kind === 'level')?.audienceEntityId).toBe(7);
  });

  it('投射物只通过生命周期事件同步，常规广播快照不再携带逐帧位置', () => {
    const projectileEvents: UltraProjectileEvent[] = [];
    const world = new UltraWorld({ random: () => 0.3, callbacks: { onProjectiles: (items) => projectileEvents.push(...items) } });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const createProjectile = Reflect.get(world, 'createProjectile') as (
      player: unknown,
      origin: { col: number; row: number },
      angle: number,
      options: Record<string, number | string>,
    ) => void;
    const flushProjectileEvents = Reflect.get(world, 'flushProjectileEvents') as () => void;

    createProjectile.call(world, owner, owner, 0, { speed: 100, life: 1, color: '#123456' });
    flushProjectileEvents.call(world);
    expect(projectileEvents[0]).toMatchObject({ type: 'spawn', projectile: { id: 1, color: '#123456' } });
    expect(world.getProjectileStates()).toHaveLength(1);
    expect(world.getNetworkSnapshot(0).projectiles).toHaveLength(0);
    expect(world.getSnapshot(0, false).projectiles).toHaveLength(0);
    expect(world.getSnapshot(0).projectiles).toHaveLength(1);

    (Reflect.get(world, 'projectiles') as Array<{ life: number }>)[0].life = 0;
    world.step(0, 50);
    expect(projectileEvents).toContainEqual(expect.objectContaining({ type: 'destroy', id: 1 }));
    expect(world.getProjectileStates()).toHaveLength(0);

    createProjectile.call(world, owner, { col: 23.49, row: 12 }, 0, { speed: 10, life: 1, color: '#654321', bounces: 1 });
    const updateProjectiles = Reflect.get(world, 'updateProjectiles') as (delta: number) => void;
    updateProjectiles.call(world, 0.05);
    flushProjectileEvents.call(world);
    expect(projectileEvents.map((event) => event.type).slice(0, 2)).toEqual(['spawn', 'destroy']);
    expect(projectileEvents.at(-1)).toMatchObject({
      type: 'update',
      projectile: { id: 2, bounces: 0, targetId: null },
    });
    const bounced = projectileEvents.at(-1);
    if (bounced?.type !== 'update') throw new Error('预期收到投射物反弹更新');
    expect(bounced.projectile.vx).toBeLessThan(0);
  });

  it('击破敌人会保留原版普通球掉落，并向全场广播对应视听事件', () => {
    const effects: UltraEffect[] = [];
    const world = new UltraWorld({ random: () => 0.3, callbacks: { onEffects: (items) => effects.push(...items) } });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const flushEffects = Reflect.get(world, 'flushEffects') as () => void;
    flushEffects.call(world);
    effects.length = 0;

    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const enemy = testEnemy(18, 18, { segments: [testSegment(17.4, 18), testSegment(16.8, 18)] });
    Reflect.set(world, 'enemies', [enemy]);
    const killEnemy = Reflect.get(world, 'killEnemy') as (target: unknown, player: unknown) => void;
    killEnemy.call(world, enemy, owner);
    flushEffects.call(world);

    expect(world.getSnapshot(0).foods).toHaveLength(1);
    expect(effects.map((effect) => effect.type)).toEqual(expect.arrayContaining(['snakeDeath', 'ring', 'text', 'sound']));
    expect(effects.find((effect) => effect.type === 'snakeDeath')).toMatchObject({ enemyId: 99, segments: [{ col: 17.4 }, { col: 16.8 }] });
    expect(effects.filter((effect) => effect.type === 'sound').map((effect) => effect.kind)).toEqual(expect.arrayContaining(['kill', 'foodSpawn']));
    expect(effects.filter((effect) => effect.type !== 'shake').every((effect) => effect.audienceEntityId === undefined)).toBe(true);
  });

  it('最后一名玩家死亡并重置场地后仍保留本次死亡演出', () => {
    const effects: UltraEffect[] = [];
    const world = new UltraWorld({ callbacks: { onEffects: (items) => effects.push(...items) } });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const flushEffects = Reflect.get(world, 'flushEffects') as () => void;
    flushEffects.call(world);
    effects.length = 0;

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const eliminatePlayer = Reflect.get(world, 'eliminatePlayer') as (victim: unknown, killer: null, now: number, reason: string) => void;
    eliminatePlayer.call(world, player, null, 100, '测试');
    flushEffects.call(world);

    expect(world.getSnapshot(100)).toMatchObject({ gameTime: 0, foods: [], enemies: [], projectiles: [] });
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'burst' }),
      expect.objectContaining({ type: 'sound', kind: 'death' }),
      expect.objectContaining({ type: 'flash', audienceEntityId: 1 }),
    ]));
  });

  it('只接受递增输入序号并按原版转向速率移动', () => {
    const world = new UltraWorld({ random: () => 0.4 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const controlled = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    expect(world.applyInput('account-a', movementState(controlled, 1, Math.PI / 2))).toBe(true);
    expect(world.applyInput('account-a', movementState(controlled, 1, 0))).toBe(false);

    const before = world.getSnapshot(0).players[0];
    world.step(0.05, 50);
    const after = world.getSnapshot(50).players[0];

    expect(after.angle).toBeCloseTo(4.2 * 0.05, 5);
    expect(after.col).toBeGreaterThan(before.col);
    expect(after.row).toBeGreaterThan(before.row);
  });

  it('玩家重新接入后允许客户端从新输入序号开始', () => {
    const world = new UltraWorld({ random: () => 0.4 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const controlled = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    expect(world.applyInput('account-a', movementState(controlled, 900, Math.PI / 2))).toBe(true);

    world.disconnectPlayer('account-a', 50);
    world.connectPlayer('account-a', '玩家甲', 100);

    expect(world.applyInput('account-a', movementState(controlled, 1, Math.PI))).toBe(true);
  });

  it('手动玩家位置由客户端状态包驱动，服务器只结算其可靠碰撞声明', () => {
    const world = new UltraWorld({ random: () => 0.4 });
    world.connectPlayer('account-a', '本地权威玩家', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const controlled = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    controlled.col = 8;
    controlled.row = 8;
    controlled.angle = 0;
    controlled.segments = [testSegment(7.42, 8)];
    const enemy = testEnemy(8, 8);
    Reflect.set(world, 'enemies', [enemy]);

    expect(world.applyInput('account-a', movementState(controlled, 1, 0))).toBe(true);
    world.step(0, 50);
    expect(controlled.collisionCooldown).toBe(0);
    expect(enemy.collisionCooldown).toBe(0);

    expect(world.applyCollisionClaim('account-a', { kind: 'enemy-head', targetId: 99, normalCol: -1, normalRow: 0 }, 60)).toBe(true);
    expect(controlled.collisionCooldown).toBe(0);
    expect(enemy.collisionCooldown).toBeGreaterThan(0);
  });

  it('玩家头撞按客户端所见时刻回溯校验，双方重复声明只广播一次', () => {
    const collisions: PlayerHeadCollisionEvent[] = [];
    const world = new UltraWorld({
      random: () => 0.4,
      callbacks: { onPlayerHeadCollision: (event) => collisions.push(event) },
    });
    world.connectPlayer('account-a', '左侧玩家', 0);
    world.connectPlayer('account-b', '右侧玩家', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    Reflect.set(world, 'waveTimer', 999);
    const players = Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>;
    const left = players.get('account-a')!;
    const right = players.get('account-b')!;
    left.col = 10;
    left.row = 10;
    left.angle = 0;
    right.col = 10.9;
    right.row = 10;
    right.angle = Math.PI;

    expect(world.applyInput('account-a', movementState(left, 1, 0), 100)).toBe(true);
    expect(world.applyInput('account-b', movementState(right, 1, Math.PI), 100)).toBe(true);
    expect(world.applyCollisionClaim('account-a', {
      kind: 'player-head',
      targetId: right.entityId,
      sequence: 1,
      observedAt: 100,
      sourceCol: 10,
      sourceRow: 10,
      targetCol: 10.9,
      targetRow: 10,
      normalCol: -1,
      normalRow: 0,
    }, 120)).toBe(true);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({
      id: `${left.entityId}:1`,
      sourceEntityId: left.entityId,
      targetEntityId: right.entityId,
      normalCol: -1,
      normalRow: 0,
    });

    expect(world.applyCollisionClaim('account-b', {
      kind: 'player-head',
      targetId: left.entityId,
      sequence: 1,
      observedAt: 100,
      sourceCol: 10.9,
      sourceRow: 10,
      targetCol: 10,
      targetRow: 10,
      normalCol: 1,
      normalRow: 0,
    }, 130)).toBe(true);
    expect(collisions).toHaveLength(1);
  });

  it('敌蛇在原版 1.5 秒预警后生成并自主移动', () => {
    const world = new UltraWorld({ random: () => 0.37 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    for (let step = 1; step <= 32; step += 1) world.step(0.05, step * 50);

    const spawned = world.getSnapshot(1_600);
    expect(spawned.pendingSpawns).toHaveLength(0);
    expect(spawned.enemies).toHaveLength(1);
    const before = spawned.enemies[0];
    world.step(0.05, 1_650);
    const after = world.getSnapshot(1_650).enemies[0];

    expect(Math.hypot(after.col - before.col, after.row - before.row)).toBeGreaterThan(0.01);
  });

  it('多人波次按存活玩家数量倍增，暂停只冻结本人且全员暂停时冻结世界', () => {
    const world = new UltraWorld({ random: () => 0.2 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.connectPlayer('account-b', '玩家乙', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    world.step(0.05, 50);
    const initial = world.getSnapshot(50);
    expect(initial.players.filter((player) => player.alive)).toHaveLength(2);
    expect(initial.foods).toHaveLength(4);
    expect(initial.pendingSpawns).toHaveLength(2);

    expect(world.setPaused('account-a', true)).toBe(true);
    const pausedA = world.getSnapshot(50).players.find((player) => player.name === '玩家甲')!;
    const movingB = world.getSnapshot(50).players.find((player) => player.name === '玩家乙')!;
    world.step(0.05, 100);
    const afterA = world.getSnapshot(100).players.find((player) => player.name === '玩家甲')!;
    const afterB = world.getSnapshot(100).players.find((player) => player.name === '玩家乙')!;
    expect(afterA.col).toBe(pausedA.col);
    expect(afterA.row).toBe(pausedA.row);
    expect(Math.hypot(afterB.col - movingB.col, afterB.row - movingB.row)).toBeGreaterThan(0.01);

    expect(world.setPaused('account-b', true)).toBe(true);
    const frozenTime = world.getSnapshot(100).gameTime;
    world.step(0.05, 150);
    expect(world.getSnapshot(150).gameTime).toBe(frozenTime);
  });

  it('单人升级揭示保持原版慢动作，多人升级不拖慢共享世界', () => {
    const solo = new UltraWorld({ random: () => 0.2 });
    solo.connectPlayer('account-a', '玩家甲', 0);
    solo.spawn('account-a', 0);
    Reflect.set(solo, 'waveTimer', 999);
    const soloPlayer = (Reflect.get(solo, 'playersByAccount') as Map<string, TestPlayerEntity & { upgradePending: boolean; upgradeRevealTimer: number }>).get('account-a')!;
    soloPlayer.upgradePending = true;
    soloPlayer.upgradeRevealTimer = 0.9;
    solo.step(0.05, 50);
    expect(solo.getSnapshot(50).gameTime).toBeCloseTo(0.0075, 5);

    const multiplayer = new UltraWorld({ random: () => 0.2 });
    multiplayer.connectPlayer('account-a', '玩家甲', 0);
    multiplayer.connectPlayer('account-b', '玩家乙', 0);
    multiplayer.spawn('account-a', 0);
    multiplayer.spawn('account-b', 0);
    Reflect.set(multiplayer, 'waveTimer', 999);
    const multiplayerPlayer = (Reflect.get(multiplayer, 'playersByAccount') as Map<string, TestPlayerEntity & { upgradePending: boolean; upgradeRevealTimer: number }>).get('account-a')!;
    multiplayerPlayer.upgradePending = true;
    multiplayerPlayer.upgradeRevealTimer = 0.9;
    multiplayer.step(0.05, 50);
    expect(multiplayer.getSnapshot(50).gameTime).toBeCloseTo(0.05, 5);
  });

  it('每名玩家对应的敌人分别按本人等级生成', () => {
    const world = new UltraWorld({ random: () => 0.25 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.connectPlayer('account-b', '玩家乙', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    const players = Reflect.get(world, 'playersByAccount') as Map<string, { level: number }>;
    players.get('account-a')!.level = 0;
    players.get('account-b')!.level = 3;

    world.step(0.05, 50);

    expect(world.getSnapshot(50).pendingSpawns.map((spawn) => spawn.bodyCells.length).sort((left, right) => left - right)).toEqual([0, 4]);
  });

  it('没有敌蛇时，玩家武器不会把其他玩家当成目标', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.connectPlayer('account-b', '玩家乙', 0);
    world.spawn('account-a', 0);
    world.spawn('account-b', 0);
    Reflect.set(world, 'waveTimer', 999);

    for (let step = 1; step <= 100; step += 1) world.step(0.05, step * 50);

    expect(world.getSnapshot(5_000).projectiles).toHaveLength(0);
  });

  it('锁定技能会等到找到目标并成功释放后才进入冷却', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & { headFireTimer: number }>).get('account-a')!;
    const spark = { ...testSegment(owner.col - 0.5, owner.row), module: 'spark' as const, neutral: false, timer: 0 };
    Reflect.set(owner, 'segments', [spark]);
    owner.headFireTimer = 0;
    const updateHeadWeapon = Reflect.get(world, 'updateHeadWeapon') as (player: unknown, delta: number) => void;
    const updateModules = Reflect.get(world, 'updateModules') as (player: unknown, delta: number) => void;

    updateHeadWeapon.call(world, owner, 0.05);
    updateModules.call(world, owner, 0.05);

    expect(owner.headFireTimer).toBe(0);
    expect(spark.timer).toBe(0);
    expect(Reflect.get(world, 'projectiles')).toHaveLength(0);

    Reflect.set(world, 'enemies', [testEnemy(owner.col + 3, owner.row)]);
    updateHeadWeapon.call(world, owner, 0.05);
    updateModules.call(world, owner, 0.05);

    expect(owner.headFireTimer).toBeGreaterThan(0);
    expect(spark.timer).toBeGreaterThan(0);
    expect(Reflect.get(world, 'projectiles')).toHaveLength(2);
  });

  it('有锁定距离的子弹最多飞行对应距离的 1.2 倍', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const createProjectile = Reflect.get(world, 'createProjectile') as (
      player: unknown,
      origin: { col: number; row: number },
      angle: number,
      options: Record<string, number>,
    ) => void;

    createProjectile.call(world, owner, owner, 0, { speed: 300, life: 99, range: 620 });
    const projectile = (Reflect.get(world, 'projectiles') as Array<{ speed: number; life: number }>)[0];

    expect(projectile.speed * projectile.life).toBeCloseTo(620 * 1.2 / CANONICAL_CELL_SIZE, 5);
  });

  it('子弹未命中而结束飞行时生成轻量消散动画', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const createProjectile = Reflect.get(world, 'createProjectile') as (
      player: unknown,
      origin: { col: number; row: number },
      angle: number,
      options: Record<string, number | string>,
    ) => void;
    const updateProjectiles = Reflect.get(world, 'updateProjectiles') as (delta: number) => void;

    createProjectile.call(world, owner, owner, 0, { speed: 50, life: 0.01, color: '#123456' });
    updateProjectiles.call(world, 0.05);
    const expiryEffects = (Reflect.get(world, 'pendingEffects') as UltraEffect[]).filter((effect) => 'color' in effect && effect.color === '#123456');

    expect(expiryEffects.map((effect) => effect.type)).toEqual(expect.arrayContaining(['ring', 'burst']));
    expect(expiryEffects.every((effect) => effect.audienceEntityId === undefined)).toBe(true);
  });

  it('玩家头撞身体直接死亡，头碰头则双方反弹', () => {
    const bodyWorld = new UltraWorld({ random: () => 0.3 });
    bodyWorld.connectPlayer('account-a', '玩家甲', 0);
    bodyWorld.connectPlayer('account-b', '玩家乙', 0);
    bodyWorld.spawn('account-a', 0);
    bodyWorld.spawn('account-b', 0);
    Reflect.set(bodyWorld, 'waveTimer', 999);
    const bodyPlayers = Reflect.get(bodyWorld, 'playersByAccount') as Map<string, TestPlayerEntity>;
    const attacker = bodyPlayers.get('account-a')!;
    const defender = bodyPlayers.get('account-b')!;
    attacker.col = 7;
    attacker.row = 7;
    defender.col = 14;
    defender.row = 14;
    defender.segments = [testSegment(7, 7)];

    const checkPlayerBodyHit = Reflect.get(bodyWorld, 'checkPlayerBodyHit') as (attacker: TestPlayerEntity, defender: TestPlayerEntity, now: number) => void;
    checkPlayerBodyHit.call(bodyWorld, attacker, defender, 100);

    expect(bodyWorld.getRoster().find((player) => player.name === '玩家甲')?.alive).toBe(false);
    expect(bodyWorld.getRoster().find((player) => player.name === '玩家乙')?.alive).toBe(true);

    const headCollisions: PlayerHeadCollisionEvent[] = [];
    const headWorld = new UltraWorld({
      random: () => 0.3,
      callbacks: { onPlayerHeadCollision: (event) => headCollisions.push(event) },
    });
    headWorld.connectPlayer('account-a', '玩家甲', 0);
    headWorld.connectPlayer('account-b', '玩家乙', 0);
    headWorld.spawn('account-a', 0);
    headWorld.spawn('account-b', 0);
    Reflect.set(headWorld, 'waveTimer', 999);
    const headPlayers = Reflect.get(headWorld, 'playersByAccount') as Map<string, TestPlayerEntity>;
    const left = headPlayers.get('account-a')!;
    const right = headPlayers.get('account-b')!;
    left.col = right.col = 9;
    left.row = right.row = 9;
    left.angle = 0;
    right.angle = Math.PI;
    left.autopilot = true;
    right.autopilot = true;

    headWorld.step(0, 100);

    expect(headWorld.getRoster().every((player) => player.alive)).toBe(true);
    expect(left.collisionCooldown).toBeGreaterThan(0);
    expect(right.collisionCooldown).toBeGreaterThan(0);
    expect(left.knockbackX).not.toBe(0);
    expect(right.knockbackX).not.toBe(0);
    expect(headCollisions).toHaveLength(1);
  });

  it('联机自动驾驶无需客户端输入也会持续转向并自动选择升级', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '自动玩家', 0);
    world.spawn('account-a', 0);
    world.setAutopilot('account-a', true);
    Reflect.set(world, 'waveTimer', 999);
    Reflect.set(world, 'foods', [{ id: 1, col: 12, row: 18, color: '#b8f53f', phase: 0, special: false, isPulled: false, pullTimer: 0 }]);
    const automatic = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity & {
      autopilot: boolean;
      desiredAngle: number;
      upgradePending: boolean;
      upgradeRevealTimer: number;
      growth: null;
      growthQueue: unknown[];
      level: number;
      choosingUpgrade: boolean;
    }>).get('account-a')!;
    automatic.col = 12;
    automatic.row = 12;
    automatic.angle = 0;
    automatic.desiredAngle = 0;

    expect(world.applyInput('account-a', movementState(automatic, 1, Math.PI))).toBe(false);
    world.step(0.05, 50);
    expect(automatic.angle).toBeGreaterThan(0);

    automatic.upgradePending = true;
    automatic.upgradeRevealTimer = 0.01;
    automatic.growth = null;
    automatic.growthQueue = [];
    world.step(0.05, 100);
    expect(automatic.level).toBe(1);
    expect(automatic.choosingUpgrade).toBe(false);
  });

  it('自动玩家死亡后按重生冷却自行重新开始', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '自动玩家', 0);
    world.spawn('account-a', 0);
    world.setAutopilot('account-a', true);
    const automatic = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const eliminatePlayer = Reflect.get(world, 'eliminatePlayer') as (victim: TestPlayerEntity, killer: null, now: number, reason: string) => void;

    eliminatePlayer.call(world, automatic, null, 100, '测试淘汰');
    expect(world.getRoster()[0].alive).toBe(false);
    world.step(0, 100 + RESPAWN_DELAY_MS - 1);
    expect(world.getRoster()[0].alive).toBe(false);
    world.step(0, 100 + RESPAWN_DELAY_MS + 1);
    expect(world.getRoster()[0].alive).toBe(true);
  });

  it('高速敌蛇在反弹冷却期间也会被玩家身体截停', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    owner.col = 14;
    owner.row = 10;
    owner.angle = 0;
    owner.autopilot = true;
    owner.segments = Array.from({ length: 6 }, (_, index) => testSegment(13.42 - index * 0.58, 10));
    Reflect.set(world, 'enemies', [testEnemy(9.5, 10, { speed: 30, collisionCooldown: 0.3 })]);

    world.step(0.05, 50);

    expect(world.getSnapshot(50).enemies).toHaveLength(0);
    expect(world.getRoster()[0].kills).toBe(1);
  });

  it('高速敌蛇先扫到玩家头部时保持头碰头反弹规则', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    Reflect.set(world, 'waveTimer', 999);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    owner.col = 12;
    owner.row = 10;
    owner.angle = 0;
    owner.autopilot = true;
    owner.segments = Array.from({ length: 5 }, (_, index) => testSegment(11.42 - index * 0.58, 10));
    Reflect.set(world, 'enemies', [testEnemy(14, 10, { angle: Math.PI, desiredAngle: Math.PI, speed: 70 })]);

    world.step(0.05, 50);

    expect(world.getSnapshot(50).enemies).toHaveLength(1);
    expect(owner.collisionCooldown).toBeGreaterThan(0);
    expect((Reflect.get(world, 'enemies') as Array<{ collisionCooldown: number }>)[0].collisionCooldown).toBeGreaterThan(0);
  });

  it('高速投射物跨过敌蛇身体时仍按运动轨迹命中', () => {
    const world = new UltraWorld({ random: () => 0.3 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    const owner = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayerEntity>).get('account-a')!;
    const target = testEnemy(18, 10, { segments: [testSegment(6.2, 10)] });
    Reflect.set(world, 'enemies', [target]);
    const createProjectile = Reflect.get(world, 'createProjectile') as (
      player: unknown,
      origin: { col: number; row: number },
      angle: number,
      options: Record<string, number>,
    ) => void;
    const updateProjectiles = Reflect.get(world, 'updateProjectiles') as (delta: number) => void;

    createProjectile.call(world, owner, { col: 5, row: 10 }, 0, { speed: 590, size: 7, life: 0.01 });
    updateProjectiles.call(world, 0.05);

    expect(target.segments).toHaveLength(0);
    expect((Reflect.get(world, 'projectiles') as Array<{ life: number }>)[0].life).toBe(0);
  });

  it('最后一名玩家结束行动时立即重置共享场地', () => {
    const world = new UltraWorld({ random: () => 0.2 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    world.step(0.05, 50);
    expect(world.getSnapshot(50).foods).toHaveLength(2);

    expect(world.leaveRun('account-a', 100)).toBe(true);

    expect(world.getSnapshot(100)).toMatchObject({ gameTime: 0, waveCount: 0, foods: [], enemies: [], pendingSpawns: [] });
  });

  it('十二名玩家满员时首波为每人安排一条敌蛇', () => {
    const world = new UltraWorld({ random: () => 0.2 });
    for (let index = 0; index < 12; index += 1) {
      const accountId = `account-${index}`;
      expect(world.connectPlayer(accountId, `玩家${index}`, 0)).not.toBeNull();
      expect(world.spawn(accountId, 0)).toBe(true);
    }
    world.step(0.05, 50);
    expect(world.getSnapshot(50).pendingSpawns).toHaveLength(12);
  });

  it('断线宽限期结束后清理实体并结算战绩', () => {
    const onRunEnded = vi.fn();
    const world = new UltraWorld({ random: () => 0.3, callbacks: { onRunEnded } });
    world.connectPlayer('account-a', '离线玩家', 0);
    world.spawn('account-a', 0);
    world.disconnectPlayer('account-a', 0);

    world.step(0, DISCONNECT_GRACE_MS + 1);

    expect(world.getRoster()).toHaveLength(0);
    expect(world.getSnapshot(DISCONNECT_GRACE_MS + 1)).toMatchObject({ gameTime: 0, foods: [], enemies: [], pendingSpawns: [] });
    expect(onRunEnded).toHaveBeenCalledOnce();
    expect(onRunEnded.mock.calls[0][0]).toMatchObject({ accountId: 'account-a', name: '离线玩家', level: 0 });
  });
});

interface TestPlayerEntity {
  entityId: number;
  col: number;
  row: number;
  angle: number;
  speed: number;
  collisionCooldown: number;
  knockbackX: number;
  knockbackY: number;
  slow: number;
  autopilot: boolean;
  segments: ReturnType<typeof testSegment>[];
}

function movementState(player: TestPlayerEntity, sequence: number, desiredAngle: number) {
  return {
    sequence,
    col: player.col,
    row: player.row,
    angle: player.angle,
    desiredAngle,
    speed: player.speed,
    knockbackX: player.knockbackX,
    knockbackY: player.knockbackY,
    collisionCooldown: player.collisionCooldown,
    slow: player.slow,
    segments: player.segments.map((segment) => ({ col: segment.col, row: segment.row, angle: segment.angle })),
  };
}

function testSegment(col: number, row: number) {
  return { col, row, angle: 0, module: null, neutral: true, timer: 0, ready: true, cooldown: 0, orbit: 0, birthAge: null } as const;
}

function testFood(id: number, col: number, row: number) {
  return { id, col, row, color: '#b8f53f', phase: 0, special: false, isPulled: false, pullTimer: 0 };
}

function testEnemy(col: number, row: number, overrides: Record<string, unknown> = {}) {
  return {
    id: 99, col, row, angle: 0, color: '#ff5c62', captured: 0, segments: [], birthLength: 1,
    speed: 0, desiredAngle: 0, targetFoodId: null, think: 999, wobble: 0, slow: 0,
    knockbackX: 0, knockbackY: 0, poisonTicks: 0, poisonTimer: 0, poisonColor: null,
    poisonOwnerEntityId: null, bladeCooldown: 0, sawCooldown: 0, collisionCooldown: 0, dead: false,
    ...overrides,
  };
}
