import { describe, expect, it } from 'vitest';
import { ARENA_GEOMETRY } from '../src/shared/arenaGeometry';

describe('圆形竞技场几何', () => {
  it('从真实圆面积换算直径', () => {
    expect(ARENA_GEOMETRY.diameterFromArea(Math.PI * 9 ** 2)).toBeCloseTo(18, 10);
  });

  it('使用 sqrt(random) 在圆内按面积均匀采样', () => {
    const random = seededRandom(144);
    let radiusTotal = 0;
    for (let index = 0; index < 5_000; index += 1) {
      const point = ARENA_GEOMETRY.sampleUniformPoint(0, 0, 10, random);
      const radius = Math.hypot(point.col, point.row);
      expect(radius).toBeLessThanOrEqual(10.00000001);
      radiusTotal += radius;
    }
    expect(radiusTotal / 5_000).toBeGreaterThan(6.3);
    expect(radiusTotal / 5_000).toBeLessThan(7);
  });

  it('径向约束提供内向法线并按圆周反射', () => {
    const constrained = ARENA_GEOMETRY.constrainPoint(8, 0, 0, 0, 5);
    expect(constrained).toMatchObject({ col: 5, row: 0, normalCol: -1, collided: true });
    expect(constrained.normalRow).toBeCloseTo(0, 10);
    expect(ARENA_GEOMETRY.reflectVector(3, 1, constrained.normalCol, constrained.normalRow)).toEqual({ col: -3, row: 1 });
  });

  it('安全距离无法满足时仍返回圆内最佳候选', () => {
    const point = ARENA_GEOMETRY.chooseSpawnPoint({
      centerCol: 0,
      centerRow: 0,
      radius: 4,
      occupiedPoints: [{ col: 0, row: 0 }, { col: 3, row: 0 }, { col: -3, row: 0 }],
      safetyDistance: 100,
      attempts: 12,
      random: seededRandom(5),
    });
    expect(ARENA_GEOMETRY.containsPoint(point.col, point.row, 0, 0, 4)).toBe(true);
  });
});

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}
