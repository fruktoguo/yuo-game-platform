import { describe, expect, it } from 'vitest';
import { enemyWaveDirector } from '../src/shared/waveDirector';

describe('敌人波次导演', () => {
  it('固定波次边界、高压波和预期经验遵循正式曲线', () => {
    const expected = [
      [1, 1, 0],
      [5, 2, 12],
      [10, 2, 28],
      [11, 2, 32],
      [30, 4, 114],
      [31, 3, 120],
      [90, 10, 516],
      [91, 6, 528],
      [95, 12, 560],
      [100, 12, 606],
    ];
    for (const [wave, enemyCount, experience] of expected) {
      const plan = enemyWaveDirector.plan(wave);
      expect(plan.enemyCount).toBe(enemyCount);
      expect(plan.expectedExperience).toBe(experience);
    }
    expect(enemyWaveDirector.experienceBeforeWave(101)).toBe(620);
  });

  it('第1波与第100波威胁值匹配验收口径', () => {
    expect(enemyWaveDirector.plan(1)).toMatchObject({ expectedLevel: 0, expectedDps: 1 / 6, totalThreat: 1.5 });
    expect(enemyWaveDirector.plan(100)).toMatchObject({ expectedLevel: 22, expectedExperience: 606, enemyCount: 12 });
    expect(enemyWaveDirector.plan(100).totalThreat).toBeCloseTo(205.62, 8);
  });

  it('每只敌人独立浮动权重并在分配后概率取整', () => {
    const rolls = [0, 0.999999, 0.8, 0.2];
    const allocation = enemyWaveDirector.allocateHealth([1, 1], 10, () => rolls.shift() ?? 0.5);
    expect(allocation.actualWeights[0]).toBeCloseTo(0.75, 5);
    expect(allocation.actualWeights[1]).toBeCloseTo(1.25, 5);
    expect(allocation.health).toEqual([3, 7]);
    expect(allocation.actualTotalHealth).toBe(10);
  });
});
