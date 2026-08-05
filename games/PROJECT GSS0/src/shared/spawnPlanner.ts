import '../../spawn-planner.js';
import type { ArenaPoint } from './arenaGeometry';

export type SpawnPoint = ArenaPoint;

export interface SpawnPlayer extends SpawnPoint {
  angle: number;
}

export interface CircularSpawnOptions {
  centerCol: number;
  centerRow: number;
  radius: number;
  bodySegmentCount: number;
  safetyDistance: number;
  occupancyDistance: number;
  forwardPathHalfWidth: number;
  occupiedPoints: readonly SpawnPoint[];
  players: readonly SpawnPlayer[];
  attempts: number;
  random: () => number;
}

export interface CircularSpawn {
  head: SpawnPoint;
  body: SpawnPoint[];
  next: SpawnPoint;
}

interface SpawnPlannerApi {
  choose(options: CircularSpawnOptions): CircularSpawn | null;
  spaceSpawnBody(head: SpawnPoint, bodyPath: readonly SpawnPoint[], spacing: number, segmentCount?: number): SpawnPoint[];
}

const api = (globalThis as typeof globalThis & { GSS0SpawnPlanner?: SpawnPlannerApi }).GSS0SpawnPlanner;
if (!api) throw new Error('PROJECT GSS0 圆形出生规划器未加载');
const spawnPlannerApi: SpawnPlannerApi = api;

export function chooseCircularSpawn(options: CircularSpawnOptions): CircularSpawn | null {
  return spawnPlannerApi.choose(options);
}

export function spaceSpawnBody(
  head: SpawnPoint,
  bodyPath: readonly SpawnPoint[],
  spacing: number,
  segmentCount = bodyPath.length,
): SpawnPoint[] {
  return spawnPlannerApi.spaceSpawnBody(head, bodyPath, spacing, segmentCount);
}
