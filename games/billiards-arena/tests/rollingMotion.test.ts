import { describe, expect, it } from 'vitest';
import { calculateRollingStep } from '../src/client/game/RollingMotion';

describe('球体滚动方向', () => {
  it('沿 X 正方向移动时绕 Z 负轴旋转', () => {
    const step = calculateRollingStep(0.1, 0, 0.05);
    expect(step).toEqual({ axisX: 0, axisZ: -1, angle: 2 });
  });

  it('沿 Z 正方向移动时绕 X 正轴旋转', () => {
    const step = calculateRollingStep(0, 0.1, 0.05);
    expect(step).toEqual({ axisX: 1, axisZ: -0, angle: 2 });
  });

  it('静止或半径无效时不产生旋转', () => {
    expect(calculateRollingStep(0, 0, 0.05)).toBeNull();
    expect(calculateRollingStep(0.1, 0, 0)).toBeNull();
  });
});
