import {
  CLAIMABLE_MAX_X,
  CLAIMABLE_MAX_Y,
  CLAIMABLE_MIN_X,
  CLAIMABLE_MIN_Y,
  SECTOR_COLUMNS,
  SECTOR_ROWS,
  SECTOR_SIZE,
} from './constants';

export function sectorIndexAt(x: number, y: number): number | null {
  if (x < CLAIMABLE_MIN_X || x > CLAIMABLE_MAX_X || y < CLAIMABLE_MIN_Y || y > CLAIMABLE_MAX_Y) return null;
  const column = Math.floor((x - CLAIMABLE_MIN_X) / SECTOR_SIZE);
  const row = Math.floor((y - CLAIMABLE_MIN_Y) / SECTOR_SIZE);
  if (column < 0 || column >= SECTOR_COLUMNS || row < 0 || row >= SECTOR_ROWS) return null;
  return row * SECTOR_COLUMNS + column;
}

export function sectorOrigin(sector: number): { x: number; y: number } {
  return {
    x: CLAIMABLE_MIN_X + sector % SECTOR_COLUMNS * SECTOR_SIZE,
    y: CLAIMABLE_MIN_Y + Math.floor(sector / SECTOR_COLUMNS) * SECTOR_SIZE,
  };
}
