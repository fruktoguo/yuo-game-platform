import { describe, expect, it } from 'vitest';
import { ENEMY_BEHAVIOR } from '../src/shared/enemyBehavior';

describe('基础主动敌群共享行为', () => {
  it('为乱窜体按均匀面积采样圆内远目标', () => {
    const values = [0, 0.01, 0.25, 1];
    let index = 0;
    const target = ENEMY_BEHAVIOR.sampleCircleTarget(0, 0, 0, 0, 10, 5, () => values[index++ % values.length]);
    expect(Math.hypot(target.col, target.row)).toBeLessThanOrEqual(10);
    expect(Math.hypot(target.col, target.row)).toBeGreaterThanOrEqual(5);
  });

  it('冲角者瞄准可达的预计交汇方向，并在超时后退回当前位置', () => {
    const predicted = ENEMY_BEHAVIOR.interceptAngle(0, 0, 8, 0, 0, 2, 5, 5);
    const fallback = ENEMY_BEHAVIOR.interceptAngle(0, 0, 8, 0, 0, 2, 5, 0.1);
    expect(predicted).toBeGreaterThan(0);
    expect(fallback).toBeCloseTo(0, 8);
  });

  it('仅觅食旧敌人保留捡球能力，锁向敌人不接受主动避障', () => {
    expect(ENEMY_BEHAVIOR.canCollectFood('scout')).toBe(false);
    expect(ENEMY_BEHAVIOR.canCollectFood('forager')).toBe(true);
    expect(ENEMY_BEHAVIOR.canCollectFood('liner')).toBe(false);
    expect(ENEMY_BEHAVIOR.usesIndependentCourse('liner')).toBe(true);
    expect(ENEMY_BEHAVIOR.usesIndependentCourse('headhunter')).toBe(true);
    expect(ENEMY_BEHAVIOR.usesIndependentCourse('skitter')).toBe(false);
  });
});
