import '../../arena-geometry.js';

export interface ArenaPoint {
  col: number;
  row: number;
}

export interface ConstrainedArenaPoint extends ArenaPoint {
  normalCol: number;
  normalRow: number;
  collided: boolean;
}

export interface ArenaGeometryApi {
  boundaryRadius(diameter: number, margin?: number): number;
  centerForGrid(gridSize: number): number;
  chooseSpawnPoint(options: {
    centerCol: number;
    centerRow: number;
    radius: number;
    preferred?: ArenaPoint | null;
    occupiedPoints?: readonly ArenaPoint[];
    safetyDistance?: number;
    attempts?: number;
    random?: () => number;
  }): ArenaPoint;
  constrainPoint(col: number, row: number, centerCol: number, centerRow: number, radius: number): ConstrainedArenaPoint;
  containsPoint(col: number, row: number, centerCol: number, centerRow: number, radius: number): boolean;
  diameterFromArea(area: number): number;
  distanceFromCenter(col: number, row: number, centerCol: number, centerRow: number): number;
  distanceToBoundary(col: number, row: number, centerCol: number, centerRow: number, radius: number): number;
  playableRadius(diameter: number, margin?: number): number;
  reflectVector(col: number, row: number, normalCol: number, normalRow: number): ArenaPoint;
  sampleUniformPoint(centerCol: number, centerRow: number, radius: number, random?: () => number): ArenaPoint;
  wallNormal(col: number, row: number, centerCol: number, centerRow: number, radius: number): ArenaPoint | null;
}

const api = (globalThis as typeof globalThis & { GSS0ArenaGeometry?: ArenaGeometryApi }).GSS0ArenaGeometry;
if (!api) throw new Error('PROJECT GSS0 圆形场地几何未加载');

export const ARENA_GEOMETRY = api;
