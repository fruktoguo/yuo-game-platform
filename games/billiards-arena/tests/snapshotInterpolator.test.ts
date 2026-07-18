import { describe, expect, it } from 'vitest';
import type { BallSnapshot, GameSnapshot } from '../src/shared/protocol';
import {
  MAX_SNAPSHOT_EXTRAPOLATION_MS,
  SNAPSHOT_INTERPOLATION_DELAY_MS,
  SnapshotInterpolator,
} from '../src/client/game/SnapshotInterpolator';

describe('联机快照插值', () => {
  it('按服务器时间在相邻快照之间连续插值', () => {
    const interpolator = new SnapshotInterpolator();
    interpolator.push(createSnapshot(1, 1_000, 0, 2), 0);
    interpolator.push(createSnapshot(2, 1_050, 0.5, 2), 50);
    interpolator.push(createSnapshot(3, 1_100, 1, 2), 100);

    expect(interpolator.sample(0, 100)?.x).toBeCloseTo(0.15, 4);
    expect(interpolator.sample(0, 125)?.x).toBeCloseTo(0.4, 4);
  });

  it('丢包时只做有限时长的速度外推', () => {
    const interpolator = new SnapshotInterpolator();
    interpolator.push(createSnapshot(1, 1_000, 0, 2), 0);
    const sample = interpolator.sample(0, 1_000);
    expect(sample?.x).toBeCloseTo(2 * (MAX_SNAPSHOT_EXTRAPOLATION_MS - SNAPSHOT_INTERPOLATION_DELAY_MS) / 1000, 4);
  });

  it('忽略服务器时间和序号都更旧的乱序快照', () => {
    const interpolator = new SnapshotInterpolator();
    expect(interpolator.push(createSnapshot(2, 1_050, 0.5, 1), 50).accepted).toBe(true);
    expect(interpolator.push(createSnapshot(1, 1_000, 0, 1), 60).accepted).toBe(false);
    expect(interpolator.sample(0, 60)?.x).toBeCloseTo(0.5, 4);
  });

  it('静止阶段的状态变更会立即重置时间线', () => {
    const interpolator = new SnapshotInterpolator();
    interpolator.push(createSnapshot(1, 1_000, 0, 0, 'aiming'), 0);
    const result = interpolator.push(createSnapshot(2, 1_100, 1, 0, 'placing'), 100);
    expect(result.reset).toBe(true);
    expect(interpolator.sample(0, 100)?.x).toBe(1);
  });

  it('落袋标记在球接近袋口后再生效', () => {
    const interpolator = new SnapshotInterpolator();
    interpolator.push(createSnapshot(1, 1_000, 0, 1), 0);
    interpolator.push(createSnapshot(2, 1_100, 1, 0, 'rolling', true), 100);

    expect(interpolator.sample(0, 100)?.pocketed).toBe(false);
    expect(interpolator.sample(0, 170)?.pocketed).toBe(true);
  });
});

function createSnapshot(
  sequence: number,
  serverTime: number,
  x: number,
  vx: number,
  phase: GameSnapshot['phase'] = 'rolling',
  pocketed = false,
): GameSnapshot {
  const ball: BallSnapshot = { number: 0, x, z: 0, vx, vz: 0, pocketed };
  return {
    sequence,
    serverTime,
    phase,
    turnNumber: 1,
    currentPlayerId: 'player-a',
    breakerId: 'player-a',
    tableOpen: true,
    calledPocket: null,
    ballInHand: null,
    balls: [ball],
    winnerId: null,
    status: '',
  };
}
