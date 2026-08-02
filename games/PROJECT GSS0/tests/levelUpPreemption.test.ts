import { describe, expect, it } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';
import type { GrowthView, UltraEffect, UltraSegment } from '../src/shared/protocol';

interface TestPlayer {
  entityId: number;
  col: number;
  row: number;
  level: number;
  xp: number;
  xpNeeded: number;
  segments: UltraSegment[];
  growth: GrowthView | null;
  growthQueue: Array<{ color: string; special: boolean }>;
  upgradePending: boolean;
  upgradeRevealTimer: number;
}

describe('储能节经验流程', () => {
  it('经验满时立即启动升级，未播完的吃球动画不会改写身体', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-a', '玩家甲', 0, 'player-a');
    expect(world.spawn('account-a', 0)).toBe(true);

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayer>).get('account-a')!;
    const initialSegments = player.segments.slice();
    const storage = player.segments.at(-1)!;
    expect(player.segments).toHaveLength(2);
    expect(player.segments[0]).toMatchObject({ module: 'spark', moduleLevel: 1, storage: false });
    expect(storage.storage).toBe(true);
    player.xp = player.xpNeeded - 1;
    player.growth = { color: '#b8f53f', special: false, elapsed: 0.1, nodeCount: 2 };
    player.growthQueue = [{ color: '#24c7d9', special: false }];

    const spawnFood = Reflect.get(world, 'spawnFood') as (point: { col: number; row: number }, special: boolean) => boolean;
    expect(spawnFood.call(world, { col: player.col + 2, row: player.row }, false)).toBe(true);
    const collectFood = Reflect.get(world, 'collectFood') as (owner: TestPlayer, foodIndex: number, collector: { col: number; row: number }) => void;
    collectFood.call(world, player, 0, player);

    expect(player.xp).toBe(player.xpNeeded);
    expect(player.upgradePending).toBe(true);
    expect(player.upgradeRevealTimer).toBeGreaterThan(0);
    expect(player.growth).not.toBeNull();
    expect(player.growthQueue).toHaveLength(1);
    expect(player.segments).toEqual(initialSegments);
    expect((Reflect.get(world, 'foods') as unknown[])).toHaveLength(0);
    const pendingEffects = Reflect.get(world, 'pendingEffects') as UltraEffect[];
    expect(pendingEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'sound', kind: 'levelCharge', audienceEntityId: player.entityId }),
    ]));
  });

  it('升级保留溢出经验，并把新机体插入永久储能节之前', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-b', '玩家乙', 0, 'player-b');
    expect(world.spawn('account-b', 0)).toBe(true);

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayer>).get('account-b')!;
    const storage = player.segments.at(-1)!;
    player.growth = { color: '#24c7d9', special: false, elapsed: 0, nodeCount: 2 };
    player.xp = player.xpNeeded + 2;
    const applyUpgrade = Reflect.get(world, 'applyUpgrade') as (owner: TestPlayer, moduleId: 'ricochet', now: number) => void;
    applyUpgrade.call(world, player, 'ricochet', 0);
    const updateGrowth = Reflect.get(world, 'updatePlayerGrowth') as (owner: TestPlayer, delta: number, realDelta: number, now: number) => void;
    updateGrowth.call(world, player, 0.01, 0.01, 0);

    expect(player.level).toBe(1);
    expect(player.xp).toBe(2);
    expect(player.xpNeeded).toBe(10);
    expect(player.segments.at(-1)).toBe(storage);
    expect(player.segments).toHaveLength(3);
    expect(player.segments[0]).toMatchObject({ module: 'spark', storage: false });
    expect(player.segments[1]).toMatchObject({ module: 'ricochet', storage: false });
    expect(storage).toMatchObject({ module: null, storage: true });
    expect(player.growth?.nodeCount).toBe(4);
  });

  it('尾部隔离舱作为初始机体时立即生成拦截节且储能节仍保持末端', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-c', '玩家丙', 0, 'player-c');
    expect(world.spawn('account-c', 0, 'tailguard')).toBe(true);

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayer>).get('account-c')!;
    expect(player.segments[0]).toMatchObject({ module: 'tailguard', moduleLevel: 1, storage: false });
    expect(player.segments.filter((segment) => segment.tailGuard)).toHaveLength(2);
    expect(player.segments.at(-1)).toMatchObject({ module: null, storage: true });
  });
});
