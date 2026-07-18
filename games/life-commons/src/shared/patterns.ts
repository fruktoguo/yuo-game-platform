import { MAX_CUSTOM_PATTERN_CELLS, MAX_CUSTOM_PATTERN_OFFSET, MAX_ENERGY } from './constants';

export interface CellOffset {
  x: number;
  y: number;
}

export interface CustomPatternData {
  name: string;
  cells: CellOffset[];
}

export interface LifePattern {
  id: string;
  name: string;
  category: '基础' | '静物' | '振荡' | '移动' | '混沌' | '工程';
  cost: number;
  cells: readonly CellOffset[];
}

const pulsar = centerPattern([
  ...[-6, -1, 1, 6].flatMap((y) => [-4, -3, -2, 2, 3, 4].map((x) => ({ x, y }))),
  ...[-6, -1, 1, 6].flatMap((x) => [-4, -3, -2, 2, 3, 4].map((y) => ({ x, y }))),
]);

const gosperGun = centerPattern([
  [0, 4], [0, 5], [1, 4], [1, 5],
  [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8], [14, 5],
  [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
  [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5],
  [24, 0], [24, 1], [24, 5], [24, 6],
  [34, 2], [34, 3], [35, 2], [35, 3],
].map(([x, y]) => ({ x, y })));

const pentadecathlon = centerPattern([
  [2, 0], [7, 0],
  [0, 1], [1, 1], [3, 1], [4, 1], [5, 1], [6, 1], [8, 1], [9, 1],
  [2, 2], [7, 2],
].map(([x, y]) => ({ x, y })));

const diehard = centerPattern([
  [6, 0],
  [0, 1], [1, 1],
  [1, 2], [5, 2], [6, 2], [7, 2],
].map(([x, y]) => ({ x, y })));

export const PATTERNS = {
  cell: {
    id: 'cell', name: '单细胞', category: '基础', cost: 1,
    cells: [{ x: 0, y: 0 }],
  },
  block: {
    id: 'block', name: '方块', category: '静物', cost: 5,
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  },
  tub: {
    id: 'tub', name: '浴盆', category: '静物', cost: 5,
    cells: [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  },
  boat: {
    id: 'boat', name: '船', category: '静物', cost: 7,
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
  },
  beehive: {
    id: 'beehive', name: '蜂巢', category: '静物', cost: 8,
    cells: [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  },
  loaf: {
    id: 'loaf', name: '面包', category: '静物', cost: 9,
    cells: [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
  },
  blinker: {
    id: 'blinker', name: '闪烁器', category: '振荡', cost: 4,
    cells: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
  },
  toad: {
    id: 'toad', name: '蟾蜍', category: '振荡', cost: 8,
    cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  },
  beacon: {
    id: 'beacon', name: '灯塔', category: '振荡', cost: 11,
    cells: [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 },
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ],
  },
  pentadecathlon: {
    id: 'pentadecathlon', name: '十五周期', category: '振荡', cost: 18,
    cells: pentadecathlon,
  },
  glider: {
    id: 'glider', name: '滑翔机', category: '移动', cost: 8,
    cells: [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  },
  lwss: {
    id: 'lwss', name: '轻型飞船', category: '移动', cost: 14,
    cells: [
      { x: -2, y: -1 }, { x: 1, y: -1 },
      { x: 2, y: 0 },
      { x: -2, y: 1 }, { x: 2, y: 1 },
      { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ],
  },
  rPentomino: {
    id: 'rPentomino', name: 'R 五连块', category: '混沌', cost: 9,
    cells: [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
  },
  acorn: {
    id: 'acorn', name: '橡果', category: '混沌', cost: 12,
    cells: [{ x: -3, y: 0 }, { x: -2, y: 0 }, { x: -2, y: -2 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  },
  diehard: {
    id: 'diehard', name: '顽强种子', category: '混沌', cost: 12,
    cells: diehard,
  },
  pulsar: {
    id: 'pulsar', name: '脉冲星', category: '振荡', cost: 56,
    cells: pulsar,
  },
  gosperGun: {
    id: 'gosperGun', name: '高斯帕滑翔机枪', category: '工程', cost: 60,
    cells: gosperGun,
  },
} as const satisfies Record<string, LifePattern>;

export type PatternId = keyof typeof PATTERNS;

export function isPatternId(value: unknown): value is PatternId {
  return typeof value === 'string' && value in PATTERNS;
}

export function transformPattern(patternId: PatternId, rotation: number, flipped: boolean): CellOffset[] {
  return transformCells(PATTERNS[patternId].cells, rotation, flipped);
}

export function transformCells(cells: readonly CellOffset[], rotation: number, flipped: boolean): CellOffset[] {
  const turns = ((Math.round(rotation) % 4) + 4) % 4;
  return cells.map((cell) => {
    let x = flipped ? -cell.x : cell.x;
    let y = cell.y;
    for (let turn = 0; turn < turns; turn += 1) [x, y] = [-y, x];
    return { x, y };
  });
}

export function customPatternCost(cellCount: number): number {
  return Math.min(MAX_ENERGY, Math.max(1, Math.ceil(cellCount * 1.4)));
}

export function isValidCustomPatternData(value: unknown): value is CustomPatternData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CustomPatternData>;
  if (typeof candidate.name !== 'string') return false;
  const name = candidate.name.trim();
  if (Array.from(name).length < 1 || Array.from(name).length > 16 || /[\u0000-\u001f\u007f]/u.test(name)) return false;
  if (!Array.isArray(candidate.cells) || candidate.cells.length < 1 || candidate.cells.length > MAX_CUSTOM_PATTERN_CELLS) return false;
  const coordinates = new Set<string>();
  for (const cell of candidate.cells) {
    if (!cell || typeof cell !== 'object' || !Number.isInteger(cell.x) || !Number.isInteger(cell.y)) return false;
    if (Math.abs(cell.x) > MAX_CUSTOM_PATTERN_OFFSET || Math.abs(cell.y) > MAX_CUSTOM_PATTERN_OFFSET) return false;
    const key = `${cell.x}:${cell.y}`;
    if (coordinates.has(key)) return false;
    coordinates.add(key);
  }
  return true;
}

function centerPattern(cells: CellOffset[]): CellOffset[] {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);
  return cells.map((cell) => ({ x: cell.x - centerX, y: cell.y - centerY }));
}
