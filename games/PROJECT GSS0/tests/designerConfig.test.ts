import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESIGNER_BALANCE, moduleDesignState } from '../src/shared/designerConfig';
import { MODULES, UPGRADE_MODULES } from '../src/shared/modules';

const editorHtml = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');

function editorDefinitionIds(marker: string, endMarker: string, property: string): string[] {
  const start = editorHtml.indexOf(marker);
  const end = editorHtml.indexOf(endMarker, start + marker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const definitionSource = editorHtml.slice(start, end);
  return [...definitionSource.matchAll(new RegExp(`\\b${property}: "([^"]+)"`, 'g'))].map((match) => match[1]);
}

describe('设计配置', () => {
  it('默认参数保持现有玩法数值', () => {
    expect(DESIGNER_BALANCE).toMatchObject({
      playerBaseSpeed: 5,
      playerTurnRate: 4.2,
      enemyBaseSpeed: 4,
      enemyBaseHealth: 1,
      waveInterval: 6,
      foodsPerPlayerPerWave: 2,
      enemiesPerPlayerPerWave: 1,
      projectileSpeedScale: 3,
      headAttackInterval: 1.9,
    });
  });

  it('全部现有机体都有状态且默认进入升级池', () => {
    const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG: { moduleStates: Record<string, string> } }).GSS0_DESIGNER_CONFIG;
    expect(Object.keys(source.moduleStates).sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(MODULES.every((module) => moduleDesignState(module.id) === 'normal')).toBe(true);
    expect(UPGRADE_MODULES.map((module) => module.id)).toEqual(MODULES.map((module) => module.id));
  });

  it('本地编辑器与运行时配置使用完全相同的参数和机体 ID', () => {
    const parameterKeys = editorDefinitionIds('const PARAMETER_DEFINITIONS = [', 'const MODULES = [', 'key');
    const moduleIds = editorDefinitionIds('const MODULES = [', 'const STATUS_LABELS =', 'id');

    expect(parameterKeys.sort()).toEqual(Object.keys(DESIGNER_BALANCE).sort());
    expect(moduleIds.sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(new Set(parameterKeys).size).toBe(16);
    expect(new Set(moduleIds).size).toBe(58);
  });
});
