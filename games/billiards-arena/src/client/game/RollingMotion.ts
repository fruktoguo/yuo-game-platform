export interface RollingStep {
  axisX: number;
  axisZ: number;
  angle: number;
}

const MIN_ROLL_DISTANCE = 0.000_001;

/**
 * 根据画面中的真实位移计算无滑动滚动。旋转轴使用世界坐标，避免连续转向后欧拉角沿局部轴累积失真。
 */
export function calculateRollingStep(deltaX: number, deltaZ: number, radius: number): RollingStep | null {
  const distance = Math.hypot(deltaX, deltaZ);
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || distance < MIN_ROLL_DISTANCE || radius <= 0) return null;
  return {
    axisX: deltaZ / distance,
    axisZ: -deltaX / distance,
    angle: distance / radius,
  };
}
