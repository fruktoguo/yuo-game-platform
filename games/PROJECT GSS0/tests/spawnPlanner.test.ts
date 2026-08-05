import { describe, expect, it } from 'vitest';
import { ARENA_GEOMETRY } from '../src/shared/arenaGeometry';
import {
  chooseCircularSpawn,
  spaceSpawnBody,
  type CircularSpawnOptions,
  type SpawnPoint,
} from '../src/shared/spawnPlanner';

const clientPlanner = (globalThis as typeof globalThis & {
  GSS0SpawnPlanner: {
    choose: typeof chooseCircularSpawn;
    spaceSpawnBody: typeof spaceSpawnBody;
  };
}).GSS0SpawnPlanner;

describe('圆形敌人出生规划器', () => {
  it.each([
    { seed: 17, bodySegmentCount: 5 },
    { seed: 83, bodySegmentCount: 40 },
    { seed: 144, bodySegmentCount: 160 },
  ])('客户端与服务器共享连续圆内出生规则 %#', ({ seed, bodySegmentCount }) => {
    const serverOptions = optionsFor(seed, bodySegmentCount);
    const clientOptions = optionsFor(seed, bodySegmentCount);
    const serverPlacement = chooseCircularSpawn(serverOptions);
    const clientPlacement = clientPlanner.choose(clientOptions);

    expect(serverPlacement).not.toBeNull();
    expect(clientPlacement).toEqual(serverPlacement);
    expect(serverPlacement?.body).toHaveLength(bodySegmentCount);
    expect(Number.isInteger(serverPlacement?.head.col)).toBe(false);

    const path = [serverPlacement!.head, ...serverPlacement!.body, serverPlacement!.next];
    for (const point of path) {
      expect(ARENA_GEOMETRY.containsPoint(point.col, point.row, 11.5, 11.5, 11.5)).toBe(true);
    }
  });

  it('安全候选与玩家和已有实体保持配置距离', () => {
    const options = optionsFor(29, 12);
    const placement = chooseCircularSpawn(options)!;
    const playerDistance = Math.min(...options.players.map((player) => distance(placement.head, player)));
    const occupiedDistance = Math.min(
      ...[placement.head, ...placement.body, placement.next]
        .flatMap((point) => options.occupiedPoints.map((occupied) => distance(point, occupied))),
    );

    expect(playerDistance).toBeGreaterThanOrEqual(options.safetyDistance - 1e-8);
    expect(occupiedDistance).toBeGreaterThanOrEqual(options.occupancyDistance - 1e-8);
  });

  it('预生成机体使用真实连接距离且不截断超长身体', () => {
    const placement = chooseCircularSpawn(optionsFor(61, 160))!;
    const body = spaceSpawnBody(placement.head, placement.body, 0.66, 160);

    expect(body).toHaveLength(160);
    expect(clientPlanner.spaceSpawnBody(placement.head, placement.body, 0.66, 160)).toEqual(body);
    let previous = placement.head;
    for (const segment of body) {
      expect(Math.hypot(previous.col - segment.col, previous.row - segment.row)).toBeLessThanOrEqual(0.66000001);
      expect(ARENA_GEOMETRY.containsPoint(segment.col, segment.row, 11.5, 11.5, 11.5)).toBe(true);
      previous = segment;
    }
  });
});

function optionsFor(seed: number, bodySegmentCount: number): CircularSpawnOptions {
  return {
    centerCol: 11.5,
    centerRow: 11.5,
    radius: 11.5,
    bodySegmentCount,
    safetyDistance: 5,
    occupancyDistance: 0.66,
    forwardPathHalfWidth: 1.5,
    occupiedPoints: [
      { col: 3.25, row: 3.75 },
      { col: 18.4, row: 5.2 },
      { col: 7.8, row: 18.1 },
    ],
    players: [
      { col: 11.5, row: 11.5, angle: 0 },
      { col: 15.2, row: 15.8, angle: -Math.PI / 2 },
    ],
    attempts: 256,
    random: seededRandom(seed),
  };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function distance(left: SpawnPoint, right: SpawnPoint): number {
  return Math.hypot(left.col - right.col, left.row - right.row);
}
