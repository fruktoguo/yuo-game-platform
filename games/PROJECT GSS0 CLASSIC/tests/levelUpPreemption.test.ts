import { describe, expect, it } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';
import type { GrowthView, UltraEffect, UltraSegment } from '../src/shared/protocol';

interface TestPlayer {
  entityId: number;
  col: number;
  row: number;
  xp: number;
  xpNeeded: number;
  segments: UltraSegment[];
  growth: GrowthView | null;
  growthQueue: Array<{ color: string; special: boolean; spawnTailFood: boolean }>;
  upgradePending: boolean;
  upgradeRevealTimer: number;
}

function neutralSegment(col: number, row: number): UltraSegment {
  return {
    col,
    row,
    angle: 0,
    module: null,
    moduleLevel: 0,
    neutral: true,
    tailGuard: false,
    experienceTier: 0,
    timer: 0,
    ready: true,
    cooldown: 0,
    orbit: 0,
    birthAge: null,
  };
}

describe('升级流程抢占经验动画', () => {
  it('经验满时立即结算成长与合成并启动升级演出', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-a', '玩家甲', 0, 'player-a');
    expect(world.spawn('account-a', 0)).toBe(true);

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, TestPlayer>).get('account-a')!;
    player.xp = player.xpNeeded - 1;
    player.segments = Array.from({ length: 4 }, () => neutralSegment(player.col, player.row));
    player.growth = {
      color: '#b8f53f',
      special: false,
      spawnTailFood: true,
      elapsed: 0.1,
      nodeCount: 5,
    };
    player.growthQueue = [{ color: '#24c7d9', special: false, spawnTailFood: false }];

    const spawnFood = Reflect.get(world, 'spawnFood') as (point: { col: number; row: number }, special: boolean) => boolean;
    expect(spawnFood.call(world, { col: player.col + 2, row: player.row }, false)).toBe(true);

    const pendingEffects = Reflect.get(world, 'pendingEffects') as UltraEffect[];
    pendingEffects.length = 0;
    pendingEffects.push({
      id: 'old-compression',
      type: 'experienceCompress',
      sources: [{ col: player.col, row: player.row }],
      target: { col: player.col, row: player.row },
      fromTier: 0,
      toTier: 1,
      delay: 0.2,
      ownerEntityId: player.entityId,
    });

    const collectFood = Reflect.get(world, 'collectFood') as (owner: TestPlayer, foodIndex: number, collector: { col: number; row: number }) => void;
    collectFood.call(world, player, 0, player);

    expect(player.growth).toBeNull();
    expect(player.growthQueue).toHaveLength(0);
    expect(player.upgradePending).toBe(true);
    expect(player.upgradeRevealTimer).toBeGreaterThan(0);
    expect(player.segments.filter((segment) => segment.neutral && segment.experienceTier === 0)).toHaveLength(2);
    expect(player.segments.filter((segment) => segment.neutral && segment.experienceTier === 1)).toHaveLength(1);
    expect(player.segments.filter((segment) => segment.neutral).every((segment) => segment.birthAge === null)).toBe(true);
    expect((Reflect.get(world, 'foods') as unknown[])).toHaveLength(1);
    expect(pendingEffects.some((effect) => effect.type === 'experienceCompress')).toBe(false);
    expect(pendingEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'experienceSettle', ownerEntityId: player.entityId }),
      expect.objectContaining({ type: 'sound', kind: 'levelCharge', audienceEntityId: player.entityId }),
    ]));
  });
});
