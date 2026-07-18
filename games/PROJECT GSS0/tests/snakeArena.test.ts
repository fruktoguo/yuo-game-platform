import { describe, expect, it, vi } from 'vitest';
import { CANONICAL_CELL_SIZE, DISCONNECT_GRACE_MS, RESPAWN_DELAY_MS } from '../src/shared/constants';
import type { UltraEffect } from '../src/shared/protocol';
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

  it('只接受递增输入序号并按原版转向速率移动', () => {
    const world = new UltraWorld({ random: () => 0.4 });
    world.connectPlayer('account-a', '玩家甲', 0);
    world.spawn('account-a', 0);
    expect(world.applyInput('account-a', { sequence: 1, desiredAngle: Math.PI / 2 })).toBe(true);
    expect(world.applyInput('account-a', { sequence: 1, desiredAngle: 0 })).toBe(false);

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
    expect(world.applyInput('account-a', { sequence: 900, desiredAngle: Math.PI / 2 })).toBe(true);

    world.disconnectPlayer('account-a', 50);
    world.connectPlayer('account-a', '玩家甲', 100);

    expect(world.applyInput('account-a', { sequence: 1, desiredAngle: Math.PI })).toBe(true);
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
    expect(expiryEffects.every((effect) => effect.audienceEntityId === Reflect.get(owner, 'entityId'))).toBe(true);
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

    const headWorld = new UltraWorld({ random: () => 0.3 });
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

    headWorld.step(0, 100);

    expect(headWorld.getRoster().every((player) => player.alive)).toBe(true);
    expect(left.collisionCooldown).toBeGreaterThan(0);
    expect(right.collisionCooldown).toBeGreaterThan(0);
    expect(left.knockbackX).not.toBe(0);
    expect(right.knockbackX).not.toBe(0);
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

    expect(world.applyInput('account-a', { sequence: 1, desiredAngle: Math.PI })).toBe(false);
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
  col: number;
  row: number;
  angle: number;
  collisionCooldown: number;
  knockbackX: number;
  segments: ReturnType<typeof testSegment>[];
}

function testSegment(col: number, row: number) {
  return { col, row, angle: 0, module: null, neutral: true, timer: 0, ready: true, cooldown: 0, orbit: 0, birthAge: null } as const;
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
