import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { chooseSerpentineSpawn, type SerpentineSpawnOptions, type SpawnPoint } from '../src/shared/spawnPlanner';

runInThisContext(readFileSync(new URL('../spawn-planner.js', import.meta.url), 'utf8'));

const clientPlanner = (globalThis as typeof globalThis & {
  GSS0SpawnPlanner: { choose: typeof chooseSerpentineSpawn };
}).GSS0SpawnPlanner;

describe('敌人出生规划器', () => {
  it.each([
    {
      minimum: 0,
      maximum: 7,
      bodySegmentCount: 5,
      minimumHeadDistance: 2,
      occupiedCells: occupiedCodes(['0,0', '1,0', '4,5']),
      players: [{ col: 3.2, row: 3.7 }],
      fallbackDistance: 8,
      random: () => 0.63,
    },
    {
      minimum: -3,
      maximum: 8,
      bodySegmentCount: 40,
      minimumHeadDistance: 3,
      occupiedCells: occupiedCodes(['-3,-3', '-2,-3', '8,8', '2,2']),
      players: [{ col: 0.2, row: 0.6 }, { col: 5.4, row: 4.8 }],
      fallbackDistance: 12,
      random: () => 0.19,
    },
    {
      minimum: 0,
      maximum: 23,
      bodySegmentCount: 160,
      minimumHeadDistance: 5,
      occupiedCells: occupiedCodes(['12,12', '11,12', '10,12', '4,19', '20,4']),
      players: [{ col: 12.3, row: 12.1 }, { col: 7.8, row: 16.2 }, { col: 18.1, row: 7.4 }],
      fallbackDistance: 24,
      random: () => 0.82,
    },
  ])('与 V8 选择规则保持一致 %#', (options) => {
    const expected = chooseWithV8Algorithm(options);
    expect(chooseSerpentineSpawn(options)).toEqual(expected);
    expect(clientPlanner.choose(options)).toEqual(expected);
  });
});

function chooseWithV8Algorithm(options: SerpentineSpawnOptions) {
  const gridWidth = Math.max(1, options.maximum - options.minimum + 1);
  const visibleLength = Math.min(options.bodySegmentCount, gridWidth * gridWidth - 2);
  const candidates: Array<{
    head: SpawnPoint;
    body: SpawnPoint[];
    next: SpawnPoint;
    headDistance: number;
    nearestPlayerDistance: number;
  }> = [];
  for (const path of buildV8Paths(options.minimum, options.maximum)) {
    for (let index = visibleLength; index < path.length - 1; index += 1) {
      const head = path[index];
      const body: SpawnPoint[] = [];
      let conflicts = options.occupiedCells.has(pointCode(head)) ? 1 : 0;
      for (let offset = 1; offset <= visibleLength; offset += 1) {
        const cell = path[index - offset];
        body.push(cell);
        if (options.occupiedCells.has(pointCode(cell))) conflicts += 1;
      }
      const next = path[index + 1];
      if (options.occupiedCells.has(pointCode(next))) conflicts += 1;
      if (conflicts > 0) continue;
      const headDistance = options.players.length > 0
        ? Math.min(...options.players.map((player) => Math.hypot(head.col - player.col, head.row - player.row)))
        : options.fallbackDistance;
      if (headDistance < options.minimumHeadDistance) continue;
      const spawnCells = [head, ...body, next];
      const nearestPlayerDistance = options.players.length > 0
        ? Math.min(...options.players.flatMap((player) => spawnCells.map((cell) => Math.hypot(cell.col - player.col, cell.row - player.row))))
        : options.fallbackDistance;
      candidates.push({ head, body, next, headDistance, nearestPlayerDistance });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => right.headDistance - left.headDistance || right.nearestPlayerDistance - left.nearestPlayerDistance);
  const farthest = candidates.filter((candidate) => Math.abs(candidate.headDistance - candidates[0].headDistance) < 0.001);
  const safestDistance = farthest[0].nearestPlayerDistance;
  const safest = farthest.filter((candidate) => Math.abs(candidate.nearestPlayerDistance - safestDistance) < 0.001);
  const selected = safest[Math.floor(options.random() * safest.length)];
  return { head: selected.head, body: selected.body, next: selected.next };
}

function buildV8Paths(minimum: number, maximum: number): SpawnPoint[][] {
  const base: SpawnPoint[] = [];
  for (let row = minimum; row <= maximum; row += 1) {
    for (let step = minimum; step <= maximum; step += 1) {
      base.push({ col: (row - minimum) % 2 === 0 ? step : minimum + maximum - step, row });
    }
  }
  const transforms = [
    (cell: SpawnPoint) => ({ col: cell.col, row: cell.row }),
    (cell: SpawnPoint) => ({ col: minimum + maximum - cell.col, row: cell.row }),
    (cell: SpawnPoint) => ({ col: cell.col, row: minimum + maximum - cell.row }),
    (cell: SpawnPoint) => ({ col: cell.row, row: cell.col }),
    (cell: SpawnPoint) => ({ col: minimum + maximum - cell.row, row: cell.col }),
    (cell: SpawnPoint) => ({ col: cell.row, row: minimum + maximum - cell.col }),
  ];
  const paths: SpawnPoint[][] = [];
  for (const transform of transforms) {
    const path = base.map(transform);
    paths.push(path, [...path].reverse());
  }
  return paths;
}

function pointCode(point: SpawnPoint): number {
  return (Math.round(point.row) & 0xffff) << 16 | (Math.round(point.col) & 0xffff);
}

function occupiedCodes(keys: string[]): Set<number> {
  return new Set(keys.map((key) => {
    const [col, row] = key.split(',').map(Number);
    return pointCode({ col, row });
  }));
}
