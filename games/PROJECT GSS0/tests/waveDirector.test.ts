import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enemyWaveDirector } from '../src/shared/waveDirector';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');

describe('敌人波次导演', () => {
  it('固定波次边界、高压波和预期经验遵循正式曲线', () => {
    const expected = [
      [1, 3, 3, 0, 0],
      [5, 3, 3, 24, 2],
      [10, 3, 3, 54, 4],
      [11, 4, 4, 60, 4],
      [30, 4, 4, 212, 8],
      [31, 5, 5, 220, 8],
      [90, 6, 6, 868, 18],
      [91, 6, 6, 880, 18],
      [95, 6, 6, 928, 18],
      [100, 6, 6, 988, 19],
    ];
    for (const [wave, foodCount, enemyCount, experience, expectedLevel] of expected) {
      const plan = enemyWaveDirector.plan(wave);
      expect(plan.foodCount).toBe(foodCount);
      expect(plan.enemyCount).toBe(enemyCount);
      expect(plan.expectedExperience).toBe(experience);
      expect(plan.expectedLevel).toBe(expectedLevel);
    }
    expect(enemyWaveDirector.experienceBeforeWave(101)).toBe(1000);
    expect(enemyWaveDirector.expectedLevelForExperience(1000)).toBe(19);
  });

  it('第1波与第100波威胁值匹配验收口径', () => {
    expect(enemyWaveDirector.plan(1)).toMatchObject({ expectedLevel: 0, expectedDps: 3 / 6, totalThreat: 2.25 });
    expect(enemyWaveDirector.plan(100)).toMatchObject({ expectedLevel: 19, expectedExperience: 988, foodCount: 6, enemyCount: 6 });
    expect(enemyWaveDirector.plan(100).totalThreat).toBeCloseTo(65.67, 8);
  });

  it('按波次同步提高敌人的移动速度与转向速率', () => {
    expect(enemyWaveDirector.speedMultiplier(1)).toBe(1);
    expect(enemyWaveDirector.speedMultiplier(2)).toBe(1.01);
    expect(enemyWaveDirector.speedMultiplier(1000)).toBe(2);
    expect(enemyWaveDirector.plan(31).speedMultiplier).toBeCloseTo(1.3, 8);
    expect(gameSource).toContain('dt * enemy.turnRate * waveSpeedMultiplier');
    expect(gameSource).toContain('enemy.speed * waveSpeedMultiplier * chronosMultiplier');
    expect(serverSource).toContain('delta * enemy.turnRate * waveSpeedMultiplier');
    expect(serverSource).toContain('enemy.speed * waveSpeedMultiplier * chronosMultiplier');
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
