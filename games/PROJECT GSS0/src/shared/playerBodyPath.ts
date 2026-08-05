import '../../player-body-path.js';
import type { GridPoint } from './protocol';

export interface PlayerBodyPathPoint extends GridPoint {
  distance: number;
}

export interface PlayerBodyPathState {
  points: PlayerBodyPathPoint[];
  heading: number;
  initialized: boolean;
  lastAdvance: {
    pointCount: number;
    latest: PlayerBodyPathPoint;
  } | null;
}

export interface PlayerBodyPathHead extends GridPoint {
  angle?: number;
}

export interface PlayerBodyPathSegment extends GridPoint {
  angle?: number;
}

interface PlayerBodyPathApi {
  create(): PlayerBodyPathState;
  reset(path: PlayerBodyPathState, head: PlayerBodyPathHead, segments: PlayerBodyPathSegment[], spacing: number): PlayerBodyPathSegment[];
  reconcile(path: PlayerBodyPathState, head: PlayerBodyPathHead, segments: PlayerBodyPathSegment[], spacing: number): PlayerBodyPathSegment[];
  advance(path: PlayerBodyPathState, head: PlayerBodyPathHead, segments: PlayerBodyPathSegment[], spacing: number): PlayerBodyPathSegment[];
  correct(path: PlayerBodyPathState, head: PlayerBodyPathHead, segments: PlayerBodyPathSegment[], spacing: number): PlayerBodyPathSegment[];
  resample(path: PlayerBodyPathState, head: PlayerBodyPathHead, segments: PlayerBodyPathSegment[], spacing: number): PlayerBodyPathSegment[];
}

const api = (globalThis as typeof globalThis & { GSS0PlayerBodyPath?: PlayerBodyPathApi }).GSS0PlayerBodyPath;
if (!api) throw new Error('PROJECT GSS0 玩家历史轨迹未加载');

export const PLAYER_BODY_PATH = api;
