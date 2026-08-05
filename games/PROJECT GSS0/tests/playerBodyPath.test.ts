import { describe, expect, it } from 'vitest';
import { PLAYER_BODY_PATH, type PlayerBodyPathSegment } from '../src/shared/playerBodyPath';

describe('玩家严格历史轨迹', () => {
  it('急转弯时每个关节依次经过蛇头写下的同一转角', () => {
    const head = { col: 0, row: 0, angle: 0 };
    const segments = lineSegments(-1, -2, -3);
    const path = PLAYER_BODY_PATH.create();
    PLAYER_BODY_PATH.reset(path, head, segments, 1);

    move(path, head, segments, 1, 0);
    move(path, head, segments, 2, 0);
    move(path, head, segments, 2, 1);
    move(path, head, segments, 2, 2);

    expectPoint(segments[0], 2, 1);
    expectPoint(segments[1], 2, 0);
    expectPoint(segments[2], 1, 0);
  });

  it('速度步长突然变化不会改变累计路径上的关节间距', () => {
    const head = { col: 0, row: 0, angle: 0 };
    const segments = lineSegments(-1, -2, -3);
    const path = PLAYER_BODY_PATH.create();
    PLAYER_BODY_PATH.reset(path, head, segments, 1);

    for (const col of [0.1, 0.25, 1.75, 1.8, 3]) move(path, head, segments, col, 0);

    expectPoint(segments[0], 2, 0);
    expectPoint(segments[1], 1, 0);
    expectPoint(segments[2], 0, 0);
  });

  it('墙面修正替换越界端点，反弹后的身体沿真实折线路径移动', () => {
    const head = { col: 0, row: 0, angle: 0 };
    const segments = lineSegments(-1, -2);
    const path = PLAYER_BODY_PATH.create();
    PLAYER_BODY_PATH.reset(path, head, segments, 1);

    move(path, head, segments, 2, 0);
    PLAYER_BODY_PATH.resample(path, head, segments, 1);
    head.col = 1;
    PLAYER_BODY_PATH.correct(path, head, segments, 1);
    move(path, head, segments, 1, 1);

    expect(path.points.some((point) => point.col > 1.0000001)).toBe(false);
    expectPoint(segments[0], 1, 0);
    expectPoint(segments[1], 0, 0);
  });

  it('新增长度立即从已有历史轨迹取得位置', () => {
    const head = { col: 0, row: 0, angle: 0 };
    const segments = lineSegments(-1, -2);
    const path = PLAYER_BODY_PATH.create();
    PLAYER_BODY_PATH.reset(path, head, segments, 1);
    move(path, head, segments, 1, 0);
    move(path, head, segments, 2, 0);
    move(path, head, segments, 2, 1);
    move(path, head, segments, 2, 2);

    segments.push({ ...segments.at(-1)! });
    PLAYER_BODY_PATH.resample(path, head, segments, 1);

    expectPoint(segments[0], 2, 1);
    expectPoint(segments[1], 2, 0);
    expectPoint(segments[2], 1, 0);
  });

  it('长时间移动会裁剪尾部之外的历史且保持稳定采样', () => {
    const head = { col: 0, row: 0, angle: 0 };
    const segments = lineSegments(-1, -2, -3, -4, -5, -6);
    const path = PLAYER_BODY_PATH.create();
    PLAYER_BODY_PATH.reset(path, head, segments, 1);

    for (let index = 1; index <= 4_000; index += 1) {
      move(path, head, segments, index * 0.025, Math.sin(index * 0.01) * 0.02);
    }

    expect(path.points.length).toBeLessThan(1_000);
    for (const segment of segments) {
      expect(Number.isFinite(segment.col)).toBe(true);
      expect(Number.isFinite(segment.row)).toBe(true);
    }
    for (let index = 1; index < path.points.length; index += 1) {
      expect(path.points[index].distance).toBeGreaterThan(path.points[index - 1].distance);
    }
  });
});

function lineSegments(...columns: number[]): PlayerBodyPathSegment[] {
  return columns.map((col) => ({ col, row: 0, angle: 0 }));
}

function move(
  path: ReturnType<typeof PLAYER_BODY_PATH.create>,
  head: { col: number; row: number; angle: number },
  segments: PlayerBodyPathSegment[],
  col: number,
  row: number,
): void {
  head.col = col;
  head.row = row;
  PLAYER_BODY_PATH.advance(path, head, segments, 1);
}

function expectPoint(point: PlayerBodyPathSegment, col: number, row: number): void {
  expect(point.col).toBeCloseTo(col, 8);
  expect(point.row).toBeCloseTo(row, 8);
}
