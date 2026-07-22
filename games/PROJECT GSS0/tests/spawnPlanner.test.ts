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
      safetyDistance: 2,
      forwardPathHalfWidth: 1,
      occupiedCells: occupiedCodes(['0,0', '1,0', '4,5']),
      players: [{ col: 3.2, row: 3.7, angle: 0 }],
      random: () => 0.63,
    },
    {
      minimum: -3,
      maximum: 8,
      bodySegmentCount: 40,
      safetyDistance: 3,
      forwardPathHalfWidth: 1.5,
      occupiedCells: occupiedCodes(['-3,-3', '-2,-3', '8,8', '2,2']),
      players: [{ col: 0.2, row: 0.6, angle: Math.PI / 4 }, { col: 5.4, row: 4.8, angle: -Math.PI / 2 }],
      random: () => 0.19,
    },
    {
      minimum: 0,
      maximum: 23,
      bodySegmentCount: 160,
      safetyDistance: 5,
      forwardPathHalfWidth: 1.5,
      occupiedCells: occupiedCodes(['12,12', '11,12', '10,12', '4,19', '20,4']),
      players: [{ col: 12.3, row: 12.1, angle: 0 }, { col: 7.8, row: 16.2, angle: Math.PI }, { col: 18.1, row: 7.4, angle: Math.PI / 2 }],
      random: () => 0.82,
    },
  ])('客户端与服务器共享均匀随机及路径规避规则 %#', (options) => {
    const expected = chooseWithCurrentAlgorithm(options);
    expect(chooseSerpentineSpawn(options)).toEqual(expected);
    expect(clientPlanner.choose(options)).toEqual(expected);
  });
});

function chooseWithCurrentAlgorithm(options: SerpentineSpawnOptions) {
  const gridWidth = Math.max(1, options.maximum - options.minimum + 1);
  const visibleLength = Math.min(options.bodySegmentCount, gridWidth * gridWidth - 2);
  const candidatesByHead = new Map<number, Array<{
    head: SpawnPoint;
    body: SpawnPoint[];
    next: SpawnPoint;
  }>>();
  for (const path of buildPaths(options.minimum, options.maximum)) {
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
      const spawnCells = [head, ...body, next];
      if (spawnCells.some((cell) => isInForwardPath(cell, options))) continue;
      const headDistance = options.players.length > 0
        ? Math.min(...options.players.map((player) => Math.hypot(head.col - player.col, head.row - player.row)))
        : Infinity;
      if (headDistance < options.safetyDistance) continue;
      const headCode = pointCode(head);
      const candidates = candidatesByHead.get(headCode) ?? [];
      candidates.push({ head, body, next });
      candidatesByHead.set(headCode, candidates);
    }
  }
  const locations = [...candidatesByHead.values()];
  if (locations.length === 0) return null;
  const routes = locations[randomIndex(locations.length, options.random)];
  const selected = routes[randomIndex(routes.length, options.random)];
  return { head: selected.head, body: selected.body, next: selected.next };
}

function isInForwardPath(point: SpawnPoint, options: SerpentineSpawnOptions): boolean {
  if (options.forwardPathHalfWidth <= 0) return false;
  return options.players.some((player) => {
    const offsetCol = point.col - player.col;
    const offsetRow = point.row - player.row;
    const directionCol = Math.cos(player.angle);
    const directionRow = Math.sin(player.angle);
    const forwardDistance = offsetCol * directionCol + offsetRow * directionRow;
    const lateralDistance = Math.abs(offsetCol * directionRow - offsetRow * directionCol);
    return forwardDistance > 0 && lateralDistance <= options.forwardPathHalfWidth;
  });
}

function randomIndex(length: number, random: () => number): number {
  return Math.min(length - 1, Math.floor(Math.max(0, random()) * length));
}

function buildPaths(minimum: number, maximum: number): SpawnPoint[][] {
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
