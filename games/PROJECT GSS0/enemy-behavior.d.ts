export interface GSS0EnemyBehaviorApi {
  randomBetween(minimum: number, maximum: number, random?: () => number): number;
  randomAngle(random?: () => number): number;
  sampleCircleTarget(
    originCol: number,
    originRow: number,
    centerCol: number,
    centerRow: number,
    radius: number,
    minimumDistance: number,
    random?: () => number,
    attempts?: number,
  ): { col: number; row: number };
  interceptAngle(
    pursuerCol: number,
    pursuerRow: number,
    targetCol: number,
    targetRow: number,
    targetVelocityCol: number,
    targetVelocityRow: number,
    pursuerSpeed: number,
    maximumTime: number,
  ): number;
  canCollectFood(archetype: string): boolean;
  usesIndependentCourse(archetype: string): boolean;
}

declare global {
  var GSS0EnemyBehavior: GSS0EnemyBehaviorApi;
}
