import { describe, expect, it } from 'vitest';
import { ENEMY_ARMOR, type EnemyArmorTuning } from '../src/shared/enemyArmor';

const tuning: EnemyArmorTuning = {
  headCoreRadius: 0.41,
  bodyCoreRadius: 0.205,
  layerThickness: 0.043,
  baseSpacing: 0.66,
  spacingScale: 1,
  spacingResponse: 12,
};

describe('敌人指数装甲', () => {
  it.each([
    [1, [1]],
    [2, [1, 1]],
    [3, [1, 1, 1]],
    [4, [1, 1, 2]],
    [5, [1, 1, 2, 1]],
    [8, [1, 1, 2, 4]],
    [13, [1, 1, 2, 4, 5]],
    [100, [1, 1, 2, 4, 8, 16, 32, 36]],
  ])('%i 血分解为核心、二次幂层和最外余数层', (health, capacities) => {
    const layers = ENEMY_ARMOR.layers(health, health);
    expect(layers.map((layer) => layer.capacity)).toEqual(capacities);
    expect(layers.every((layer) => layer.health === layer.capacity && layer.fill === 1)).toBe(true);
  });

  it('13 血受到高伤害时按 5、4、2、1 的顺序由外向内连续破甲', () => {
    expect(ENEMY_ARMOR.damageTransitions(13, 13, 0).map((layer) => layer.capacity)).toEqual([5, 4, 2, 1]);
  });

  it('高容量层压缩为有限板数并保留板内损伤', () => {
    const full = ENEMY_ARMOR.plates(36, 36, 8);
    const damaged = ENEMY_ARMOR.plates(36, 35, 8);
    expect(full).toHaveLength(8);
    expect(full.every((plate) => plate.fill === 1)).toBe(true);
    expect(damaged.at(-1)?.fill).toBe(0.75);
  });

  it('装甲层消失时半径对数级缩小，中心距平滑追向相邻半径结果', () => {
    const fullRadius = ENEMY_ARMOR.radius(13, 13, false, tuning);
    const strippedRadius = ENEMY_ARMOR.radius(1, 13, false, tuning);
    expect(fullRadius).toBeCloseTo(tuning.bodyCoreRadius + tuning.layerThickness * 4, 8);
    expect(strippedRadius).toBe(tuning.bodyCoreRadius);

    const fullSpacing = ENEMY_ARMOR.spacing({ health: 13, maxHealth: 13 }, true, { health: 8, maxHealth: 8 }, tuning);
    const strippedSpacing = ENEMY_ARMOR.spacing({ health: 1, maxHealth: 13 }, true, { health: 1, maxHealth: 8 }, tuning);
    expect(fullSpacing).toBeGreaterThan(strippedSpacing);
    const halfway = ENEMY_ARMOR.smoothSpacing(fullSpacing, strippedSpacing, 1 / 60, tuning.spacingResponse);
    expect(halfway).toBeLessThan(fullSpacing);
    expect(halfway).toBeGreaterThan(strippedSpacing);
  });
});
