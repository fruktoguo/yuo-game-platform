import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESIGNER_BALANCE, moduleCooldownPercent, moduleCooldownSeconds, moduleDesignState } from '../src/shared/designerConfig';
import { ACTIVE_SKILL_MODULES, MODULES, UPGRADE_MODULES } from '../src/shared/modules';

const editorHtml = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');
const launcherCmd = readFileSync(new URL('../balance-editor-launcher.cmd', import.meta.url), 'utf8');
const launcherServer = readFileSync(new URL('../balance-editor-server.ps1', import.meta.url), 'utf8');

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
      playerSpeedPerLevel: 0,
      playerTurnRate: 4.2,
      enemyBaseSpeed: 4,
      enemySpeedPerMinute: 0.01,
      enemySpeedMaxMultiplier: 1.12,
      enemyHealthGrowthIntervalSeconds: 180,
      enemyThreatBudgetBase: 1.5,
      enemyThreatBudgetPerMinute: 0.36,
      enemyThreatBudgetLateStartMinute: 5,
      enemyThreatBudgetLatePerMinute: 0.14,
      enemyMaxSpawnsPerPlayerPerWave: 6,
      enemyConcurrentCapPerPlayer: 18,
      enemySurgeEveryWaves: 5,
      enemySurgeBudgetMultiplier: 1.55,
      enemySurgeRecoveryIntervalMultiplier: 1.4,
      enemyScoutSpawnWeight: 5,
      enemyScoutThreatCost: 1,
      enemyScoutHealthMin: 1,
      enemyScoutHealthMax: 2,
      enemyChargerUnlockSeconds: 90,
      enemyChargerTelegraphDuration: 0.7,
      enemyCourierCarryThreshold: 3,
      enemyCutterUnlockSeconds: 180,
      enemyCoilerUnlockSeconds: 300,
      enemyWardenUnlockSeconds: 420,
      waveInterval: 6,
      foodsPerPlayerPerWave: 2,
      projectileSpeedScale: 3,
      projectileSizeScale: 2,
      headAttackInterval: 6,
      poisonInitialTickDelay: 1.4,
      poisonTickInterval: 2.3,
      activeSkillBaseCooldown: 6,
      arenaAreaPerLevel: 0.05,
      upgradeInvulnerabilityDuration: 1,
      respawnLocatorConvergeDuration: 1,
      respawnLocatorFadeDuration: 3,
      maxRenderFps: 160,
      maxRenderDpr: 1.25,
      networkPlayerStateHz: 20,
      networkCollisionClaimCooldownMs: 500,
      networkInterpolationMinMs: 90,
      networkInterpolationMaxMs: 120,
      networkCollisionHistoryMs: 800,
      networkHeadCollisionValidationTolerance: 0.65,
      networkHeadCollisionContactAllowance: 0.12,
      networkHeadCollisionEventGraceMs: 120,
      networkHeadCollisionSeparationRate: 4,
      networkHeadCollisionRemoteImpulse: 0.22,
      networkHeadCollisionRemoteImpulseDuration: 0.24,
      enemyDeathHeadParticles: 28,
      enemyDeathBodyParticles: 7,
      enemyDeathHeadParticleSpeed: 185,
      enemyDeathBodyParticleSpeed: 105,
      enemyBodyReconnectDuration: 0.28,
      profileSaveDelaySeconds: 30,
    });
  });

  it('主动技能使用公共基础冷却与独立百分比', () => {
    const source = (globalThis as typeof globalThis & {
      GSS0_DESIGNER_CONFIG: { moduleCooldownPercentages: Record<string, number> };
    }).GSS0_DESIGNER_CONFIG;

    expect(Object.keys(source.moduleCooldownPercentages).sort()).toEqual(ACTIVE_SKILL_MODULES.map((module) => module.id).sort());
    expect(moduleCooldownPercent('spark')).toBe(100);
    expect(moduleCooldownSeconds('spark')).toBe(6);
    expect(moduleCooldownPercent('crossfire')).toBe(240);
    expect(moduleCooldownSeconds('crossfire')).toBeCloseTo(14.4);
    expect(moduleCooldownPercent('fan')).toBe(375);
    expect(moduleCooldownSeconds('fan')).toBeCloseTo(22.5);
  });

  it('全部现有机体都有状态且默认进入升级池', () => {
    const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG: { moduleStates: Record<string, string> } }).GSS0_DESIGNER_CONFIG;
    expect(Object.keys(source.moduleStates).sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(MODULES.every((module) => moduleDesignState(module.id) === 'normal')).toBe(true);
    expect(UPGRADE_MODULES.map((module) => module.id)).toEqual(MODULES.map((module) => module.id));
  });

  it('本地编辑器与运行时配置使用完全相同的参数和机体 ID', () => {
    const parameterKeys = editorDefinitionIds('const ALL_PARAMETER_DEFINITIONS = [', 'const ENEMY_PARAMETER_GROUPS =', 'key');
    const moduleIds = editorDefinitionIds('const MODULES = [', 'const STATUS_LABELS =', 'id');

    expect(parameterKeys.sort()).toEqual(Object.keys(DESIGNER_BALANCE).sort());
    expect(moduleIds.sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(new Set(parameterKeys).size).toBe(125);
    expect(new Set(moduleIds).size).toBe(58);
  });

  it('本地编辑器默认加载配置、自动保存且不存在缺失控件', () => {
    const queriedIds = [...editorHtml.matchAll(/document\.querySelector\("#([^"]+)"\)/g)].map((match) => match[1]);
    const inlineScripts = [...editorHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);

    for (const id of queriedIds) expect(editorHtml).toContain(`id="${id}"`);
    for (const script of inlineScripts) expect(() => new Function(script)).not.toThrow();
    expect(editorHtml).toMatch(/<script src="designer-config\.js\?v=\d+"><\/script>/u);
    expect(editorHtml).toContain('scheduleAutoSave();');
    expect(editorHtml).toContain('id="description-detail"');
    expect(editorHtml).toContain('draft.moduleCooldownPercentages[module.id]');
    expect(editorHtml).toContain('range.max = "1000"');
    expect(editorHtml).toContain('actual.textContent = `实际 ${moduleCooldownLabel(module)}`');
    expect(editorHtml).toContain('data-view="enemies"');
    expect(editorHtml).toContain('id="enemies-view"');
    expect(editorHtml).toContain('id="enemy-config-list"');
    expect(editorHtml).toContain('const ENEMY_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('const PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('parameters.append(...ENEMY_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).not.toContain('id="save-config"');
  });

  it('一键启动器只在本机以随机令牌读写固定配置文件', () => {
    expect(launcherCmd).toContain('balance-editor-server.ps1');
    expect(launcherServer).toContain('[Net.IPAddress]::Loopback');
    expect(launcherServer).not.toContain('[Net.IPAddress]::Any');
    expect(launcherServer).toContain('RandomNumberGenerator');
    expect(launcherServer).toContain('X-GSS0-Editor-Token');
    expect(launcherServer).toContain('"/api/config"');
    expect(launcherServer).toContain('"designer-config.js"');
    expect(launcherServer).toContain('"/enemy-codex.js"');
    expect(launcherServer).toContain('Editor dependency is not served');
    expect(editorHtml).toContain('"X-GSS0-Editor-Token": helperToken');
    expect(editorHtml).toContain('await requestHelper({');
  });
});
