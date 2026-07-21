import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARENA_BASE_AREA, ARENA_BASE_SIZE, GRID_SIZE } from '../src/shared/constants';

const clientSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');

describe('多人场地等级缩放', () => {
  it('基础场地按实际面积配置并缩小40%', () => {
    expect(ARENA_BASE_AREA).toBeCloseTo(24 ** 2 * 0.6, 10);
    expect(ARENA_BASE_SIZE ** 2).toBeCloseTo(ARENA_BASE_AREA, 10);
    expect(GRID_SIZE).toBe(24);
    expect(clientSource).toContain('const ARENA_BASE_SIZE = Math.sqrt(designerNumber("arenaBaseArea", 345.6, 64, 4096));');
    expect(serverSource).toContain('const target = ARENA_BASE_SIZE * Math.sqrt(1 + totalLevel * ARENA_AREA_PER_LEVEL);');
    expect(editorSource).toContain('{ key: "arenaBaseArea", group: "场地", label: "基础场地面积"');
  });

  it('按所有在场玩家总等级计算场地面积', () => {
    expect(serverSource).toContain('const totalLevel = presentPlayers.reduce((total, player) => total + Math.max(0, player.level), 0);');
    expect(serverSource).toContain('1 + totalLevel * ARENA_AREA_PER_LEVEL');
    expect(serverSource).not.toContain('const highestLevel = presentPlayers.reduce');
    expect(editorSource).toContain('多人按所有在场玩家总等级增加的场地面积倍率');
  });
});
