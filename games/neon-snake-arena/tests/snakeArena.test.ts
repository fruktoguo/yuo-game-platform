import { describe, expect, it, vi } from 'vitest';
import { DISCONNECT_GRACE_MS } from '../src/shared/constants';
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
