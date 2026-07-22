import { describe, expect, it } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';
import {
  ENEMY_SPAWN_ACTIVATION_PARTICLE_COUNT,
  ENEMY_SPAWN_WARNING_TIME,
  SNAKE_SEGMENT_SPACING,
} from '../src/shared/constants';
import { ENEMY_ARCHETYPES, type EnemyArchetypeDefinition } from '../src/shared/enemyArchetypes';
import type { GridPoint, UltraEffect } from '../src/shared/protocol';

interface TestPendingSpawn extends GridPoint {
  id: number;
  segments: GridPoint[];
  bodyCells: GridPoint[];
  timer: number;
}

describe('敌蛇预生成表现', () => {
  it('预生成与激活复用真实间距实体并逐节播放显现效果', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    const queueEnemySpawn = Reflect.get(world, 'queueEnemySpawn') as (
      archetype: EnemyArchetypeDefinition,
      health: number,
    ) => boolean;

    expect(queueEnemySpawn.call(world, ENEMY_ARCHETYPES[0], 6)).toBe(true);
    const pendingSpawns = Reflect.get(world, 'pendingSpawns') as TestPendingSpawn[];
    const enemies = Reflect.get(world, 'enemies') as TestPendingSpawn[];
    const pending = pendingSpawns[0];

    expect(enemies).toHaveLength(0);
    expect(pending.bodyCells).toBe(pending.segments);
    let previous: GridPoint = pending;
    for (const segment of pending.segments) {
      expect(Math.hypot(previous.col - segment.col, previous.row - segment.row)).toBeCloseTo(SNAKE_SEGMENT_SPACING, 8);
      previous = segment;
    }

    const effects = Reflect.get(world, 'pendingEffects') as UltraEffect[];
    effects.length = 0;
    const updateWarnings = Reflect.get(world, 'updateEnemySpawnWarnings') as (delta: number) => void;
    updateWarnings.call(world, ENEMY_SPAWN_WARNING_TIME + 0.01);

    expect(pendingSpawns).toHaveLength(0);
    expect(enemies).toHaveLength(1);
    expect(enemies[0]).toBe(pending);
    const nodeCount = pending.segments.length + 1;
    expect(effects.filter((effect) => effect.type === 'burst')).toHaveLength(nodeCount);
    expect(effects.filter((effect) => effect.type === 'burst')).toEqual(expect.arrayContaining([
      expect.objectContaining({ count: ENEMY_SPAWN_ACTIVATION_PARTICLE_COUNT }),
    ]));
    expect(effects.filter((effect) => effect.type === 'ring')).toHaveLength(nodeCount);
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'sound', kind: 'enemySpawn' }),
    ]));
  });
});
