import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enemyWaveDirector } from '../src/shared/waveDirector';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');

describe('敌人波次导演', () => {
  it('固定波次边界、高压波和预期经验遵循正式曲线', () => {
    const expected = [
      [1, 1, 0],
      [5, 2, 12],
      [10, 2, 28],
      [11, 2, 32],
      [30, 4, 114],
      [31, 3, 120],
      [90, 8, 482],
      [91, 4, 492],
      [95, 8, 516],
      [100, 8, 550],
    ];
    for (const [wave, enemyCount, experience] of expected) {
      const plan = enemyWaveDirector.plan(wave);
      expect(plan.enemyCount).toBe(enemyCount);
      expect(plan.expectedExperience).toBe(experience);
    }
    expect(enemyWaveDirector.experienceBeforeWave(101)).toBe(560);
  });

  it('第1波与第100波威胁值匹配验收口径', () => {
    expect(enemyWaveDirector.plan(1)).toMatchObject({ expectedLevel: 0, expectedDps: 1 / 6, totalThreat: 0.75 });
    expect(enemyWaveDirector.plan(100)).toMatchObject({ expectedLevel: 21, expectedExperience: 550, enemyCount: 8 });
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
