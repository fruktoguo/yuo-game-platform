import { MAX_CUSTOM_PATTERN_CELLS, MAX_CUSTOM_PATTERN_DIMENSION } from './constants';
import { isValidCustomPatternData, type CellOffset, type CustomPatternData } from './patterns';

export interface ParsedRlePattern extends CustomPatternData {
  width: number;
  height: number;
  rule: 'B3/S23';
}

export function parseRlePattern(source: string, requestedName?: string): ParsedRlePattern {
  if (typeof source !== 'string') throw new Error('RLE 代码无效');
  const lines = source.replace(/^\ufeff/u, '').replace(/\r/gu, '').split('\n');
  const commentName = lines.map((line) => /^\s*#N\s+(.+)$/iu.exec(line)?.[1]?.trim()).find((name): name is string => Boolean(name));
  let headerIndex = -1;
  let header = '';
  for (let index = 0; index < lines.length; index += 1) {
    const candidate = lines[index].trim().replace(/^text(?=x\s*=)/iu, '');
    if (/^x\s*=/iu.test(candidate)) {
      headerIndex = index;
      header = candidate;
      break;
    }
  }
  if (headerIndex < 0) throw new Error('缺少 RLE 尺寸头');
  const headerMatch = /^x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)(?:\s*,\s*rule\s*=\s*([^,]+))?\s*$/iu.exec(header);
  if (!headerMatch) throw new Error('RLE 尺寸头格式无效');
  const width = Number(headerMatch[1]);
  const height = Number(headerMatch[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > MAX_CUSTOM_PATTERN_DIMENSION || height > MAX_CUSTOM_PATTERN_DIMENSION) {
    throw new Error(`RLE 宽高必须在 1 至 ${MAX_CUSTOM_PATTERN_DIMENSION} 之间`);
  }
  const rule = (headerMatch[3] ?? 'B3/S23').replace(/\s/gu, '').toUpperCase();
  if (rule !== 'B3/S23') throw new Error('仅支持 B3/S23 规则');
  const body = lines.slice(headerIndex + 1).filter((line) => !/^\s*(?:#|```)/u.test(line)).join('').replace(/\s/gu, '');
  const cells = decodeBody(body, width, height);
  const name = normalizeName(requestedName?.trim() || commentName || 'RLE 图案');
  const pattern = { name, cells: centerCells(cells) };
  if (!isValidCustomPatternData(pattern)) throw new Error('RLE 图案超出自定义图案限制');
  return { ...pattern, width, height, rule: 'B3/S23' };
}

function decodeBody(body: string, width: number, height: number): CellOffset[] {
  if (!body) throw new Error('RLE 图案内容为空');
  const cells: CellOffset[] = [];
  let x = 0;
  let y = 0;
  let digits = '';
  let terminated = false;
  for (let index = 0; index < body.length; index += 1) {
    const token = body[index].toLowerCase();
    if (/\d/u.test(token)) {
      digits += token;
      if (digits.length > 6) throw new Error('RLE 连续长度过大');
      continue;
    }
    if (token !== 'b' && token !== 'o' && token !== '$' && token !== '!') throw new Error(`RLE 包含无效字符：${body[index]}`);
    const run = digits ? Number(digits) : 1;
    digits = '';
    if (!Number.isSafeInteger(run) || run < 1) throw new Error('RLE 连续长度无效');
    if (token === '!') {
      if (run !== 1 || index !== body.length - 1) throw new Error('RLE 结束标记无效');
      terminated = true;
      break;
    }
    if (token === '$') {
      y += run;
      x = 0;
      if (y > height) throw new Error('RLE 图案超出声明高度');
      continue;
    }
    if (y >= height || x + run > width) throw new Error('RLE 图案超出声明尺寸');
    if (token === 'o') {
      if (cells.length + run > MAX_CUSTOM_PATTERN_CELLS) throw new Error(`图案最多包含 ${MAX_CUSTOM_PATTERN_CELLS} 个活细胞`);
      for (let offset = 0; offset < run; offset += 1) cells.push({ x: x + offset, y });
    }
    x += run;
  }
  if (digits || !terminated) throw new Error('RLE 图案缺少结束标记');
  if (cells.length === 0) throw new Error('RLE 图案没有活细胞');
  return cells;
}

function centerCells(cells: readonly CellOffset[]): CellOffset[] {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);
  return cells.map((cell) => ({ x: cell.x - centerX, y: cell.y - centerY })).sort((left, right) => left.y - right.y || left.x - right.x);
}

function normalizeName(value: string): string {
  const name = value.normalize('NFKC').trim();
  if (Array.from(name).length < 1 || Array.from(name).length > 16 || /[\u0000-\u001f\u007f]/u.test(name)) throw new Error('图案名称需为 1 至 16 个字符');
  return name;
}
