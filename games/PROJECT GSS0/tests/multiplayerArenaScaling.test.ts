import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_BASE_AREA,
  ARENA_BASE_SIZE,
  GRID_SIZE,
  SNAKE_BODY_SIZE_SCALE,
  SNAKE_SEGMENT_SPACING,
} from '../src/shared/constants';

const clientSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');

describe('多人场地等级缩放', () => {
  it('基础场地按实际面积配置并缩小40%', () => {
    expect(ARENA_BASE_AREA).toBeCloseTo(300, 10);
    expect(ARENA_BASE_SIZE ** 2).toBeCloseTo(ARENA_BASE_AREA, 10);
    expect(GRID_SIZE).toBe(24);
    expect(clientSource).toContain('const ARENA_BASE_SIZE = Math.sqrt(designerNumber("arenaBaseArea", 300, 64, 4096));');
    expect(serverSource).toContain('const target = ARENA_BASE_SIZE * Math.sqrt(1 + totalLevel * ARENA_AREA_PER_LEVEL);');
    expect(editorSource).toContain('{ key: "arenaBaseArea", group: "场地", label: "基础场地面积"');
  });

  it('按所有在场玩家总等级计算场地面积', () => {
    expect(serverSource).toContain('const totalLevel = presentPlayers.reduce((total, player) => total + Math.max(0, player.level), 0);');
    expect(serverSource).toContain('1 + totalLevel * ARENA_AREA_PER_LEVEL');
    expect(serverSource).not.toContain('const highestLevel = presentPlayers.reduce');
    expect(editorSource).toContain('多人按所有在场玩家总等级增加的场地面积倍率');
  });

  it('使用两个参数同步蛇体大小、碰撞体积与单机多人间距', () => {
    expect(SNAKE_BODY_SIZE_SCALE).toBeGreaterThan(0);
    expect(SNAKE_SEGMENT_SPACING).toBeGreaterThan(0);
    expect(clientSource).toContain('segmentSpacing: playerSegmentSpacing');
    expect(clientSource).toContain('return SNAKE_SEGMENT_SPACING * (1 + MODULE_EFFECTS.segmentSpacingBonus(moduleCount("linkage")));');
    expect(clientSource).toContain('followContinuousSegments(player.col, player.row, player.segments, playerSegmentSpacing());');
    expect(serverSource).toContain("return SNAKE_SEGMENT_SPACING * (1 + MODULE_PROGRESSION.effects.segmentSpacingBonus(this.moduleCount(player, 'linkage')));");
    expect(serverSource).toContain('followContinuousSegments(player.col, player.row, player.segments, this.playerSegmentSpacing(player));');
    expect(serverSource).toContain('followEnemySegments(enemy, delta, SNAKE_SEGMENT_SPACING);');
    expect(serverSource).toContain('return 18 / CANONICAL_CELL_SIZE * SNAKE_BODY_SIZE_SCALE;');
    expect(editorSource).toContain('{ key: "snakeBodySizeScale", group: "表现", label: "蛇体大小"');
    expect(editorSource).toContain('{ key: "snakeSegmentSpacing", group: "表现", label: "连接线距离"');
  });
});
