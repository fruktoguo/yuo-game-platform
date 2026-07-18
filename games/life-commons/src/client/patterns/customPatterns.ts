import { MAX_CUSTOM_PATTERNS } from '../../shared/constants';
import { isValidCustomPatternData, type CustomPatternData } from '../../shared/patterns';

const STORAGE_KEY = 'life-commons-custom-patterns-v1';

export interface SavedCustomPattern extends CustomPatternData {
  id: string;
  createdAt: number;
}

export function loadCustomPatterns(): SavedCustomPattern[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    const result: SavedCustomPattern[] = [];
    const ids = new Set<string>();
    for (const value of parsed) {
      if (result.length >= MAX_CUSTOM_PATTERNS || !isSavedCustomPattern(value) || ids.has(value.id)) continue;
      ids.add(value.id);
      result.push({
        id: value.id,
        name: value.name.trim(),
        cells: value.cells.map((cell) => ({ x: cell.x, y: cell.y })),
        createdAt: value.createdAt,
      });
    }
    return result;
  } catch {
    return [];
  }
}

export function persistCustomPatterns(patterns: SavedCustomPattern[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns.slice(0, MAX_CUSTOM_PATTERNS)));
}

export function createSavedPattern(pattern: CustomPatternData): SavedCustomPattern {
  return {
    id: crypto.randomUUID(),
    name: pattern.name.trim(),
    cells: pattern.cells.map((cell) => ({ ...cell })),
    createdAt: Date.now(),
  };
}

function isSavedCustomPattern(value: unknown): value is SavedCustomPattern {
  if (!isValidCustomPatternData(value)) return false;
  const candidate = value as Partial<SavedCustomPattern>;
  return typeof candidate.id === 'string'
    && /^[a-zA-Z0-9-]{8,72}$/.test(candidate.id)
    && typeof candidate.createdAt === 'number'
    && Number.isFinite(candidate.createdAt);
}
