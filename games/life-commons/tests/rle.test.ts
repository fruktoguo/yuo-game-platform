import { describe, expect, it } from 'vitest';
import { isValidCustomPatternData } from '../src/shared/patterns';
import { parseRlePattern } from '../src/shared/rle';

const REQUESTED_RLE = `textx = 36, y = 9, rule = B3/S23
24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
obo$10bo5bo7bo$11bo3bo$12b2o!`;

describe('RLE 图案导入', () => {
  it('兼容用户给出的 textx 前缀和换行代码', () => {
    const pattern = parseRlePattern(REQUESTED_RLE, '战争图案');
    expect(pattern).toMatchObject({ name: '战争图案', width: 36, height: 9, rule: 'B3/S23' });
    expect(pattern.cells.length).toBeGreaterThan(30);
    expect(Math.max(...pattern.cells.map((cell) => cell.x)) - Math.min(...pattern.cells.map((cell) => cell.x)) + 1).toBe(36);
    expect(isValidCustomPatternData(pattern)).toBe(true);
  });

  it('支持标准名称注释并拒绝非 B3/S23 规则', () => {
    expect(parseRlePattern('#N 滑翔机\nx = 3, y = 3\nbo$2bo$3o!').name).toBe('滑翔机');
    expect(() => parseRlePattern('x = 3, y = 3, rule = B36/S23\nbo$2bo$3o!')).toThrow('仅支持 B3/S23');
  });
});
