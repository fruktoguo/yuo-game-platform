import type { BallSnapshot, GameSnapshot } from '../../shared/protocol';

export const SNAPSHOT_INTERPOLATION_DELAY_MS = 85;
export const MAX_SNAPSHOT_EXTRAPOLATION_MS = 120;

interface BufferedSnapshot {
  snapshot: GameSnapshot;
  receivedAt: number;
}

export interface InterpolatedBall extends BallSnapshot {}

export interface SnapshotPushResult {
  accepted: boolean;
  reset: boolean;
}

export class SnapshotInterpolator {
  private frames: BufferedSnapshot[] = [];

  push(snapshot: GameSnapshot, receivedAt = performance.now()): SnapshotPushResult {
    const previous = this.frames.at(-1);
    if (previous && snapshot.sequence <= previous.snapshot.sequence && snapshot.serverTime <= previous.snapshot.serverTime) {
      return { accepted: false, reset: false };
    }

    const reset = !previous || shouldResetTimeline(previous.snapshot, snapshot);
    const frame = { snapshot, receivedAt };
    if (reset) this.frames = [frame];
    else this.frames.push(frame);
    if (this.frames.length > 12) this.frames.splice(0, this.frames.length - 12);
    return { accepted: true, reset };
  }

  sample(ballNumber: number, now = performance.now()): InterpolatedBall | null {
    const latestFrame = this.frames.at(-1);
    if (!latestFrame) return null;

    const elapsedSinceLatest = clamp(now - latestFrame.receivedAt, 0, MAX_SNAPSHOT_EXTRAPOLATION_MS);
    const renderServerTime = latestFrame.snapshot.serverTime + elapsedSinceLatest - SNAPSHOT_INTERPOLATION_DELAY_MS;
    const firstFrame = this.frames[0];

    if (renderServerTime <= firstFrame.snapshot.serverTime) return findBall(firstFrame.snapshot, ballNumber);

    for (let index = 1; index < this.frames.length; index += 1) {
      const from = this.frames[index - 1];
      const to = this.frames[index];
      if (renderServerTime > to.snapshot.serverTime) continue;
      const duration = Math.max(1, to.snapshot.serverTime - from.snapshot.serverTime);
      const alpha = clamp((renderServerTime - from.snapshot.serverTime) / duration, 0, 1);
      return interpolateBall(findBall(from.snapshot, ballNumber), findBall(to.snapshot, ballNumber), alpha);
    }

    const latestBall = findBall(latestFrame.snapshot, ballNumber);
    if (!latestBall) return null;
    if (latestFrame.snapshot.phase !== 'rolling' || latestBall.pocketed) return { ...latestBall };

    const extrapolationMs = clamp(renderServerTime - latestFrame.snapshot.serverTime, 0, MAX_SNAPSHOT_EXTRAPOLATION_MS);
    return {
      ...latestBall,
      x: latestBall.x + latestBall.vx * extrapolationMs / 1000,
      z: latestBall.z + latestBall.vz * extrapolationMs / 1000,
    };
  }

  clear(): void {
    this.frames = [];
  }
}

function interpolateBall(from: BallSnapshot | null, to: BallSnapshot | null, alpha: number): InterpolatedBall | null {
  if (!from) return to ? { ...to } : null;
  if (!to) return { ...from };
  return {
    number: to.number,
    x: lerp(from.x, to.x, alpha),
    z: lerp(from.z, to.z, alpha),
    vx: lerp(from.vx, to.vx, alpha),
    vz: lerp(from.vz, to.vz, alpha),
    pocketed: from.pocketed || (to.pocketed && alpha >= 0.7),
  };
}

function shouldResetTimeline(previous: GameSnapshot, next: GameSnapshot): boolean {
  if (next.serverTime < previous.serverTime) return true;
  if (previous.phase !== 'rolling' && next.phase !== 'rolling') return true;
  if (previous.phase === 'finished' && next.phase === 'placing') return true;
  if (previous.phase !== 'rolling' || next.phase !== 'placing') return false;

  let largeJumps = 0;
  for (const nextBall of next.balls) {
    if (nextBall.number === 0 || nextBall.pocketed) continue;
    const previousBall = findBall(previous, nextBall.number);
    if (!previousBall || previousBall.pocketed || Math.hypot(nextBall.x - previousBall.x, nextBall.z - previousBall.z) > 0.22) {
      largeJumps += 1;
    }
  }
  return largeJumps >= 5;
}

function findBall(snapshot: GameSnapshot, number: number): BallSnapshot | null {
  return snapshot.balls.find((ball) => ball.number === number) ?? null;
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
