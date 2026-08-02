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
    perspective: number,
    foreshortening: number,
    overscan: number,
  ): string;
  project(x: number, y: number, target?: { x: number; y: number }): { x: number; y: number };
  unproject(x: number, y: number, target?: { x: number; y: number }): { x: number; y: number };
  scale(): number;
  transform(): string;
}

const projectionApi = (globalThis as typeof globalThis & {
  GSS0CameraProjection: { create(): CameraProjectionRuntime };
}).GSS0CameraProjection;

describe('强伪3D摄像机投影', () => {
  it('关闭强度时保持完全相同的屏幕坐标', () => {
    const projection = projectionApi.create();
    expect(projection.update(1920, 1080, 1, 0, 0, 0.11, 0.12, 0.36)).toBe('none');
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
    projection.update(1920, 1080, axisX, axisY, 1.35, 0.11, 0.12, 0.36);
    const samples = [
      [0, 0], [1920, 0], [1920, 1080], [0, 1080],
      [960, 540], [137.25, 842.75], [1644.5, 238.125],
    ];
    for (const [x, y] of samples) {
      const screen = projection.project(x, y, { x: 0, y: 0 });
      const canvas = projection.unproject(screen.x, screen.y, { x: 0, y: 0 });
      expect(canvas.x).toBeCloseTo(x, 7);
      expect(canvas.y).toBeCloseTo(y, 7);
    }
    expect(projection.transform()).toMatch(/^matrix3d\(/u);
    expect(projection.scale()).toBeGreaterThan(1);
  });

  it('瞄准方向远端收窄且近端放大', () => {
    const projection = projectionApi.create();
    projection.update(1920, 1080, 1, 0, 1, 0.11, 0.12, 0.36);
    const nearTop = projection.project(120, 360, { x: 0, y: 0 });
    const nearBottom = projection.project(120, 720, { x: 0, y: 0 });
    const farTop = projection.project(1800, 360, { x: 0, y: 0 });
    const farBottom = projection.project(1800, 720, { x: 0, y: 0 });
    expect(Math.abs(nearBottom.y - nearTop.y)).toBeGreaterThan(Math.abs(farBottom.y - farTop.y));
  });
});
