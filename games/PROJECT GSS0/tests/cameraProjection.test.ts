import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

runInThisContext(readFileSync(new URL('../camera-projection.js', import.meta.url), 'utf8'));

interface CameraProjectionRuntime {
  update(
    width: number,
    height: number,
    axisX: number,
    axisY: number,
    strength: number,
    pitchForeshortening: number,
    yawShear: number,
    rollDegrees: number,
    verticalAimInfluence: number,
  ): string;
  project(x: number, y: number, target?: { x: number; y: number }): { x: number; y: number };
  unproject(x: number, y: number, target?: { x: number; y: number }): { x: number; y: number };
  projectAngle(angle: number): number;
  matrix(): Float64Array;
  billboardMatrix(): Float64Array;
  scale(): number;
  transform(): string;
}

const projectionApi = (globalThis as typeof globalThis & {
  GSS0CameraProjection: { create(): CameraProjectionRuntime };
}).GSS0CameraProjection;

const CAMERA_PARAMETERS = [0.075, 0.018, 0.65, 0.16] as const;

describe('稳定伪3D摄像机投影', () => {
  it('关闭强度时保持完全相同的屏幕坐标', () => {
    const projection = projectionApi.create();
    expect(projection.update(1920, 1080, 1, 0, 0, ...CAMERA_PARAMETERS)).toBe('none');
    expect(projection.project(731.5, 426.25)).toEqual({ x: 731.5, y: 426.25 });
    expect(projection.unproject(731.5, 426.25)).toEqual({ x: 731.5, y: 426.25 });
    expect(projection.scale()).toBe(1);
  });

  it.each([
    [1, 0],
    [0, 1],
    [0.6, 0.8],
    [-0.94, 0.34],
  ])('任意瞄准方向都能精确往返屏幕与画布坐标 %#', (axisX, axisY) => {
    const projection = projectionApi.create();
    projection.update(1920, 1080, axisX, axisY, 1.5, ...CAMERA_PARAMETERS);
    const samples = [
      [0, 0], [1920, 0], [1920, 1080], [0, 1080],
      [960, 540], [137.25, 842.75], [1644.5, 238.125],
    ];
    for (const [x, y] of samples) {
      const screen = projection.project(x, y, { x: 0, y: 0 });
      const canvas = projection.unproject(screen.x, screen.y, { x: 0, y: 0 });
      expect(canvas.x).toBeCloseTo(x, 9);
      expect(canvas.y).toBeCloseTo(y, 9);
    }
    expect(projection.transform()).toMatch(/^matrix\(/u);
    expect(projection.scale()).toBe(1);
  });

  it('最大强度仍保持平行边，不会把战场压成梯形', () => {
    const projection = projectionApi.create();
    projection.update(1920, 1080, 1, 0, 99, ...CAMERA_PARAMETERS);
    const topLeft = projection.project(0, 0, { x: 0, y: 0 });
    const topRight = projection.project(1920, 0, { x: 0, y: 0 });
    const bottomLeft = projection.project(0, 1080, { x: 0, y: 0 });
    const bottomRight = projection.project(1920, 1080, { x: 0, y: 0 });
    const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
    const bottomWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
    expect(topWidth).toBeCloseTo(bottomWidth, 9);
    expect(topWidth).toBeCloseTo(1920, 5);
    expect(Math.abs(topRight.y - topLeft.y)).toBeLessThan(36);
  });

  it('实体逆矩阵抵消地面倾斜并保持屏幕朝向', () => {
    const projection = projectionApi.create();
    projection.update(1920, 1080, 0.8, -0.2, 1.5, ...CAMERA_PARAMETERS);
    const ground = projection.matrix();
    const billboard = projection.billboardMatrix();
    expect(ground[0] * billboard[0] + ground[2] * billboard[1]).toBeCloseTo(1, 10);
    expect(ground[0] * billboard[2] + ground[2] * billboard[3]).toBeCloseTo(0, 10);
    expect(ground[1] * billboard[0] + ground[3] * billboard[1]).toBeCloseTo(0, 10);
    expect(ground[1] * billboard[2] + ground[3] * billboard[3]).toBeCloseTo(1, 10);
    expect(Number.isFinite(projection.projectAngle(Math.PI / 3))).toBe(true);
  });
});
