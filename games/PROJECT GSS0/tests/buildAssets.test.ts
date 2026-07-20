import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { referencedClassicScripts } from '../vite.config';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = referencedClassicScripts(indexHtml);

describe('生产客户端脚本资产', () => {
  it('自动收集 index.html 引用的全部本地经典脚本', () => {
    expect(scripts).toContain('wave-director.js');
    expect(scripts).toContain('module-catalog.js');
    expect(scripts).toContain('game.js');
    expect(new Set(scripts).size).toBe(scripts.length);
    expect(scripts.every((fileName) => existsSync(fileURLToPath(new URL(`../${fileName}`, import.meta.url))))).toBe(true);
  });
});
