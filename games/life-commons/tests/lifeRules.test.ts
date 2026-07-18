import { describe, expect, it } from 'vitest';
import { evolveGeneration } from '../src/server/lifeRules';
import { PATTERNS, type PatternId } from '../src/shared/patterns';

describe('康威 B3/S23 规则', () => {
  it('孤立细胞因邻居不足而死亡', () => {
    const state = createWorld(5, 5, [[2, 2, 1]]);
    const next = evolve(state);
    expect(next.owners[indexOf(2, 2, 5)]).toBe(0);
  });

  it('方块静物保持不变', () => {
    const state = createWorld(6, 6, [[2, 2, 4], [3, 2, 4], [2, 3, 4], [3, 3, 4]]);
    const next = evolve(state);
    expect(aliveCoordinates(next.owners, 6)).toEqual(['2,2:4', '2,3:4', '3,2:4', '3,3:4']);
  });

  it('闪烁器在水平与垂直状态间振荡', () => {
    const state = createWorld(7, 7, [[2, 3, 2], [3, 3, 2], [4, 3, 2]]);
    const next = evolve(state);
    expect(aliveCoordinates(next.owners, 7)).toEqual(['3,2:2', '3,3:2', '3,4:2']);
  });

  it('三个父细胞中的多数归属决定新生细胞归属', () => {
    const state = createWorld(5, 5, [[1, 2, 8], [2, 1, 8], [3, 2, 9]]);
    const next = evolve(state);
    expect(next.owners[indexOf(2, 2, 5)]).toBe(8);
  });

  it('三个不同归属时由年龄最大的父细胞继承', () => {
    const state = createWorld(5, 5, [[1, 2, 3, 2], [2, 1, 4, 9], [3, 2, 5, 4]]);
    const next = evolve(state);
    expect(next.owners[indexOf(2, 2, 5)]).toBe(4);
  });

  it('世界边缘之外按死亡格处理，不与另一侧相连', () => {
    const state = createWorld(5, 5, [[4, 2, 1], [0, 1, 1], [0, 3, 1]]);
    const next = evolve(state);
    expect(next.owners[indexOf(0, 2, 5)]).toBe(0);
  });

  it('边缘以内的三个邻居仍可正常繁殖', () => {
    const state = createWorld(5, 5, [[0, 0, 1], [1, 0, 1], [1, 1, 1]]);
    const next = evolve(state);
    expect(next.owners[indexOf(0, 1, 5)]).toBe(1);
  });

  it.each(['tub', 'boat', 'beehive', 'loaf'] as const)('新增静物 %s 在演化后保持不变', (patternId) => {
    const state = createPatternWorld(patternId);
    const next = evolve(state);
    expect(aliveCoordinates(next.owners, state.width)).toEqual(aliveCoordinates(state.owners, state.width));
  });

  it.each(['toad', 'beacon'] as const)('新增二周期振荡器 %s 在两代后回到原形', (patternId) => {
    const state = createPatternWorld(patternId);
    const first = evolve(state);
    const second = evolve(first);
    expect(aliveCoordinates(first.owners, state.width)).not.toEqual(aliveCoordinates(state.owners, state.width));
    expect(aliveCoordinates(second.owners, state.width)).toEqual(aliveCoordinates(state.owners, state.width));
  });

  it('十五周期振荡器在十五代后回到原形', () => {
    const state = createPatternWorld('pentadecathlon', 32, 20);
    let next = state;
    for (let generation = 0; generation < 15; generation += 1) next = evolve(next);
    expect(aliveCoordinates(next.owners, state.width)).toEqual(aliveCoordinates(state.owners, state.width));
  });

  it('内置图案坐标均不重复且包含扩充的混沌种子', () => {
    expect(Object.keys(PATTERNS)).toHaveLength(17);
    expect(PATTERNS.diehard.cells).toHaveLength(7);
    for (const pattern of Object.values(PATTERNS)) {
      const coordinates = new Set(pattern.cells.map((cell) => `${cell.x}:${cell.y}`));
      expect(coordinates.size, pattern.name).toBe(pattern.cells.length);
    }
  });
});

function createWorld(width: number, height: number, cells: Array<[number, number, number, number?]>) {
  const owners = new Uint16Array(width * height);
  const ages = new Uint8Array(width * height);
  for (const [x, y, ownerId, age = 1] of cells) {
    owners[indexOf(x, y, width)] = ownerId;
    ages[indexOf(x, y, width)] = age;
  }
  return { width, height, owners, ages };
}

function evolve(state: ReturnType<typeof createWorld>) {
  const count = state.width * state.height;
  const nextOwners = new Uint16Array(count);
  const nextAges = new Uint8Array(count);
  evolveGeneration(state.owners, state.ages, state.width, state.height, {
    nextOwners,
    nextAges,
    populations: new Uint32Array(65_536),
    births: new Uint32Array(65_536),
    elders: new Uint32Array(65_536),
  });
  return { width: state.width, height: state.height, owners: nextOwners, ages: nextAges };
}

function createPatternWorld(patternId: PatternId, width = 20, height = 20) {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  return createWorld(width, height, PATTERNS[patternId].cells.map((cell) => [centerX + cell.x, centerY + cell.y, 1] as [number, number, number]));
}

function indexOf(x: number, y: number, width: number): number {
  return y * width + x;
}

function aliveCoordinates(owners: Uint16Array, width: number): string[] {
  const result: string[] = [];
  owners.forEach((ownerId, index) => {
    if (ownerId !== 0) result.push(`${index % width},${Math.floor(index / width)}:${ownerId}`);
  });
  return result.sort();
}
