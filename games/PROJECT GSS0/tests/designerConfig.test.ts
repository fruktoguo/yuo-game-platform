import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESIGNER_BALANCE, DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE, moduleCooldownPercent, moduleCooldownSeconds, moduleDesignState } from '../src/shared/designerConfig';
import { experienceRequiredForLevel } from '../src/shared/constants';
import { ACTIVE_SKILL_MODULES, MODULES, UPGRADE_MODULES } from '../src/shared/modules';

const editorHtml = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');
const moduleCatalogSource = readFileSync(new URL('../module-catalog.js', import.meta.url), 'utf8');
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
      xpRequirementBase: 5,
      xpRequirementPerLevel: 2,
      experienceCompressionBase: 5,
      initialModuleSlots: 5,
      moduleSlotUnlockLevel1: 8,
      moduleSlotUnlockLevel2: 12,
      moduleSlotUnlockLevel3: 18,
      moduleSlotUnlockLevel4: 25,
      newModuleOfferChance: 0.5,
      playerTurnRate: 4.2,
      enemyBaseSpeed: 4,
      enemySpeedPerMinute: 0.01,
      enemySpeedMaxMultiplier: 1.12,
      enemyPressureWaveInterval: 5,
      enemyPressureEnemyCountMultiplier: 2,
      enemyPressureThreatMultiplier: 2,
      enemyExpectedDpsInterval: 6,
      enemyThreatTimeCoefficient: 9,
      enemyThreatGrowthPerWave: 0.02,
      enemyHealthWeightVariation: 0.25,
      enemyScoutSpawnWeight: 5,
      enemyScoutHealthWeight: 1,
      enemyForagerHealthWeight: 1.65,
      enemyCourierHealthWeight: 2,
      enemyChargerHealthWeight: 2.2,
      enemyCutterHealthWeight: 3.6,
      enemyCoilerHealthWeight: 4,
      enemyWardenHealthWeight: 6.2,
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
      moduleRepulseRangePerLevelPixels: 110,
      moduleHasteSpeedPerLevel: 0.045,
      moduleCacheKillsPerTrigger: 5,
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
      experienceCompressionDuration: 0.42,
      experienceCompressionCascadeDelay: 0.18,
      profileSaveDelaySeconds: 30,
    });
    expect(DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE).toEqual([
      { startWave: 1, enemyCount: 1 },
      { startWave: 11, enemyCount: 2 },
      { startWave: 31, enemyCount: 3 },
      { startWave: 51, enemyCount: 4 },
      { startWave: 71, enemyCount: 5 },
      { startWave: 91, enemyCount: 6 },
    ]);
  });

  it('升级经验需求按基础值与当前等级线性增长', () => {
    expect(experienceRequiredForLevel(0)).toBe(5);
    expect(experienceRequiredForLevel(1)).toBe(7);
    expect(experienceRequiredForLevel(2)).toBe(9);
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

  it('没有独立冷却的常驻与触发型机体统一归为被动技能', () => {
    const passiveModules = MODULES.filter((module) => !module.activeCooldown);
    const feast = MODULES.find((module) => module.id === 'feast');

    expect(passiveModules.length).toBeGreaterThan(0);
    expect(passiveModules.every((module) => module.cooldown === '被动效果')).toBe(true);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'echo')).toBe(false);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'emergency')).toBe(false);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'feast')).toBe(false);
    expect(feast?.desc).toContain('吃球后2.5秒内');
    expect(moduleCatalogSource).not.toMatch(/cooldown: "(?:常驻|吃球触发|击破触发|伤害触发|每\d+次击破)/u);
    expect(editorHtml).toContain('cooldownSummary.textContent = moduleUsageLabel(module);');
  });

  it('全部现有机体都有审查状态且禁用项不会进入升级池', () => {
    const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG: { moduleStates: Record<string, string> } }).GSS0_DESIGNER_CONFIG;
    expect(Object.keys(source.moduleStates).sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(Object.values(source.moduleStates).filter((state) => state === 'normal')).toHaveLength(33);
    expect(Object.values(source.moduleStates).filter((state) => state === 'tune')).toHaveLength(12);
    expect(Object.values(source.moduleStates).filter((state) => state === 'rework')).toHaveLength(6);
    expect(Object.values(source.moduleStates).filter((state) => state === 'disabled')).toHaveLength(7);
    expect(UPGRADE_MODULES.map((module) => module.id)).toEqual(MODULES.filter((module) => moduleDesignState(module.id) !== 'disabled').map((module) => module.id));
  });

  it('本地编辑器与运行时配置使用完全相同的参数和机体 ID', () => {
    const parameterKeys = editorDefinitionIds('const ALL_PARAMETER_DEFINITIONS = [', 'const ENEMY_PARAMETER_GROUPS =', 'key');
    const moduleIds = [...moduleCatalogSource.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);

    expect(parameterKeys.sort()).toEqual(Object.keys(DESIGNER_BALANCE).sort());
    expect(moduleIds.sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(new Set(parameterKeys).size).toBe(146);
    expect(new Set(moduleIds).size).toBe(58);
  });

  it('全部机体共用唯一描述目录且被动参数明确', () => {
    expect(MODULES).toHaveLength(58);
    expect(MODULES.every((module) => module.desc.trim().length > 0)).toBe(true);
    expect(new Set(MODULES.map((module) => module.id)).size).toBe(MODULES.length);
    expect(MODULES.find((module) => module.id === 'spark')?.desc).toBe('发射1枚高速焰弹，造成1伤害。');
    expect(MODULES.find((module) => module.id === 'haste')?.desc).toContain('4.5%移动速度');
    expect(MODULES.find((module) => module.id === 'haste')?.desc).toContain('0.18弧度/秒转向速度');
    expect(MODULES.some((module) => (module.category as string) === '恢复')).toBe(false);
    expect(MODULES.filter((module) => module.category === '发育')).toHaveLength(5);
    expect(editorHtml).toContain('src="module-catalog.js?v=58"');
    expect(editorHtml).toContain('src="module-progression.js?v=58"');
    expect(editorHtml).toContain('const MODULES = moduleCatalog;');
    expect(editorHtml).toContain('descriptionText.textContent = describeModule(module.id, draft.balance);');
    expect(editorHtml).toContain('ID: ${module.id}');
    expect(editorHtml).toContain('function bulkSetModuleStatus(state)');
    expect(editorHtml).toContain('window.confirm(`确认将当前筛选条件下的');
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
    expect(editorHtml).not.toContain('id="description-detail"');
    expect(editorHtml).not.toContain('gss0-detailed-descriptions');
    expect(editorHtml).toContain('draft.moduleCooldownPercentages[module.id]');
    expect(editorHtml).toContain('range.max = "1000"');
    expect(editorHtml).toContain('actual.textContent = `实际 ${moduleCooldownLabel(module)}`');
    expect(editorHtml).toContain('data-view="enemies"');
    expect(editorHtml).toContain('id="enemies-view"');
    expect(editorHtml).toContain('id="enemy-config-list"');
    expect(editorHtml).toContain('data-view="waves"');
    expect(editorHtml).toContain('id="waves-view"');
    expect(editorHtml).toContain('id="wave-schedule-list"');
    expect(editorHtml).toContain('id="wave-preview-body"');
    expect(editorHtml).toContain('const WAVE_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('waveDirectorApi.create({');
    expect(editorHtml).toContain('const ENEMY_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('const PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('const MODULE_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('parameterList.append(...moduleParameters.map(createParameterRow));');
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
    expect(launcherServer).toContain('"/wave-director.js"');
    expect(launcherServer).toContain('"/module-catalog.js"');
    expect(launcherServer).toContain('"/module-progression.js"');
    expect(launcherServer).toContain('Editor dependency is not served');
    expect(editorHtml).toContain('"X-GSS0-Editor-Token": helperToken');
    expect(editorHtml).toContain('await requestHelper({');
  });
});
