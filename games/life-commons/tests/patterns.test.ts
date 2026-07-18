import { describe, expect, it } from 'vitest';
import { MAX_CUSTOM_PATTERN_CELLS } from '../src/shared/constants';
import { customPatternCost, isValidCustomPatternData, transformCells } from '../src/shared/patterns';

describe('自定义生命图案', () => {
  it('接受不重复且不超过 255 格的图案', () => {
    const cells = Array.from({ length: MAX_CUSTOM_PATTERN_CELLS }, (_, index) => ({
      x: index % 17 - 8,
      y: Math.floor(index / 17) - 7,
    }));
    expect(isValidCustomPatternData({ name: '大型图案', cells })).toBe(true);
    expect(customPatternCost(cells.length)).toBe(357);
  });

  it('拒绝超过上限、重复坐标和超出设计网格的图案', () => {
    const tooMany = Array.from({ length: MAX_CUSTOM_PATTERN_CELLS + 1 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) }));
    expect(isValidCustomPatternData({ name: '过大', cells: tooMany })).toBe(false);
    expect(isValidCustomPatternData({ name: '重复', cells: [{ x: 0, y: 0 }, { x: 0, y: 0 }] })).toBe(false);
    expect(isValidCustomPatternData({ name: '越界', cells: [{ x: 128, y: 0 }] })).toBe(false);
  });

  it('自定义图案支持旋转和镜像', () => {
    expect(transformCells([{ x: 1, y: 2 }], 1, false)).toEqual([{ x: -2, y: 1 }]);
    expect(transformCells([{ x: 1, y: 2 }], 0, true)).toEqual([{ x: -1, y: 2 }]);
  });
});
