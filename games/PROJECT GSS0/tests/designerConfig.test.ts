import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DESIGNER_BALANCE, DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE, moduleCooldownPercent, moduleCooldownSeconds, moduleDesignState } from '../src/shared/designerConfig';
import { experienceRequiredForLevel } from '../src/shared/constants';
import { ACTIVE_SKILL_MODULES, MODULES, UPGRADE_MODULES } from '../src/shared/modules';

const editorHtml = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');
const moduleCatalogSource = readFileSync(new URL('../module-catalog.js', import.meta.url), 'utf8');
const moduleProgressionSource = readFileSync(new URL('../module-progression.js', import.meta.url), 'utf8');
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
      snakeBodySizeScale: 0.775,
      snakeSegmentSpacing: 0.66,
      playerMaxHealth: 15,
      playerHealthRegenPerSecond: 0.25,
      playerEnemyBodyCollisionDamage: 10,
      playerWallCollisionDamage: 5,
      playerKnockbackRearBlockedAngleDegrees: 60,
      playerKnockbackRearCorrectionAngleDegrees: 150,
      playerCollisionDamage: 1,
      enemyCollisionDamage: 1,
      xpRequirementBase: 5,
      xpRequirementPerLevel: 2,
      experienceCompressionBase: 5,
      initialModuleSlots: 5,
      moduleSlotUnlockLevel1: 8,
      moduleSlotUnlockLevel2: 12,
      moduleSlotUnlockLevel3: 18,
      moduleSlotUnlockLevel4: 25,
      moduleSlotGrowthIntervalAfterFullUnlock: 10,
      playerTurnRate: 4.2,
      automaticSharpTurnThresholdDegrees: 70,
      automaticSelfAvoidanceStrength: 3.2,
      automaticSelfAvoidanceRange: 3.2,
      automaticTeammateAvoidanceStrength: 3.4,
      automaticTeammateAvoidanceRange: 3.5,
      networkManualPredictionMs: 400,
      networkRemoteCorrectionThresholdCells: 0.75,
      networkRemoteCorrectionSpeedCellsPerSecond: 18,
      networkRemoteCorrectionMinMs: 120,
      networkRemoteCorrectionMaxMs: 450,
      enemyBaseSpeed: 3,
      enemySpeedPerWave: 0.01,
      enemySpeedMaxMultiplier: 2,
      enemyTurnRate: 2.4,
      enemyPressureWaveInterval: 5,
      enemyPressureEnemyCountMultiplier: 2,
      enemyPressureThreatMultiplier: 2,
      enemyExpectedDpsInterval: 6,
      enemyThreatTimeCoefficient: 4.5,
      enemyThreatGrowthPerWave: 0.01,
      enemyHealthWeightVariation: 0.25,
      enemyWallAvoidanceDistance: 1.35,
      enemySpawnSafetyDistance: 5,
      enemySpawnForwardPathHalfWidth: 1.5,
      enemyScoutSpawnWeight: 10,
      enemyScoutHealthWeight: 1,
      enemyScoutFoodRange: 6,
      enemyForagerHealthWeight: 2,
      enemyCourierHealthWeight: 4,
      enemyChargerHealthWeight: 1,
      enemyChargerTrackingWobble: 0.16,
      enemyCutterHealthWeight: 2,
      enemyCoilerHealthWeight: 2,
      enemyWardenHealthWeight: 8,
      enemyChargerUnlockSeconds: 60,
      enemyCutterUnlockSeconds: 120,
      enemyCoilerUnlockSeconds: 180,
      enemyWardenUnlockSeconds: 240,
      waveInterval: 6,
      foodsPerPlayerPerWave: 2,
      projectileSpeedScale: 3,
      projectileSizeScale: 2,
      frostSlowPerStack: 0.2,
      frostMinimumSpeedRatio: 0.1,
      burnTickInterval: 0.3,
      burnDamagePerTick: 1,
      corrosionTickInterval: 3,
      corrosionDamagePerTick: 1,
      activeSkillBaseCooldown: 6,
      moduleAttackSizePerLevel: 0.1,
      moduleStatusStrikeStacksPerLevel: 1,
      moduleStatusEffectBonusPerLevel: 0.1,
      moduleMineBlastRadiusPixels: 62,
      moduleMineVisualRadiusPixels: 15,
      moduleCollisionDoubleChancePerLevel: 0.2,
      moduleProjectileDoubleChancePerLevel: 0.12,
      moduleEchoProjectilesPerLevel: 2,
      moduleBarrageProjectileCount: 16,
      moduleRepulseRangePerLevelPixels: 110,
      moduleHasteTurnRatePerLevel: 0.2,
      moduleTractorRangePerLevel: 1,
      moduleTractorPullSpeedPerLevel: 1,
      moduleFeastDuration: 3,
      moduleFeastSpeedPerLevel: 0.3,
      moduleBufferCollisionReductionPerLevel: 0.2,
      moduleBeaconEnemyCountPerLevel: 0.15,
      moduleProgressorSpeedPerLevel: 0.2,
      moduleLinkageSpacingPerLevel: 0.2,
      moduleBladeOrbitSpeed: 0.6,
      moduleBladeOrbitRadiusCells: 2,
      moduleBladeOrbitConvergeSpeedCellsPerSecond: 8,
      modulePulseRadiusCells: 3,
      moduleClusterBlastRadiusCells: 2,
      moduleShieldMaxCharges: 5,
      moduleEnemyWallDamagePerLevel: 0.5,
      moduleEnemyWallKnockbackPerLevel: 0.5,
      moduleDeathBurstProjectilesPerLevel: 2,
      moduleBonusXpChancePerLevel: 0.1,
      moduleMaxHealthPerLevel: 5,
      moduleHealthRegenPerLevel: 0.25,
      moduleDamageReductionPerLevel: 0.1,
      moduleFoodReplicationChancePerLevel: 0.06,
      moduleFoodHealPerLevel: 0.5,
      moduleCacheKillsPerTrigger: 5,
      moduleCrisisRegenPerLevel: 0.5,
      arenaBaseArea: 300,
      arenaAreaPerLevel: 0.1,
      cameraFollowZoomMin: 0.75,
      cameraFollowZoomDefault: 1.5,
      cameraFollowZoomMax: 2.5,
      cameraFollowRenderOverscanPixels: 120,
      cameraFollowFoodIndicatorLimit: 6,
      cameraFollowEnemyIndicatorLimit: 8,
      upgradeInvulnerabilityDuration: 1,
      respawnLocatorConvergeDuration: 1,
      respawnLocatorFadeDuration: 3,
      multiplayerGhostSpeed: 0.6,
      multiplayerGhostPleaInterval: 0.65,
      multiplayerGhostPleaDuration: 0.9,
      multiplayerGhostOpacity: 0.36,
      multiplayerGhostPulseStrength: 0.12,
      multiplayerGhostPulseRate: 1.1,
      multiplayerReviveContactRange: 0.46,
      multiplayerReviveHealth: 1,
      multiplayerReviveInvulnerabilityDuration: 2,
      playerDamageEffectDuration: 0.65,
      playerDamageFlashStrength: 0.55,
      playerDamageShakeStrength: 9,
      playerDamageParticleCount: 26,
      playerDamageParticleSpeed: 190,
      enemyDamageNumberDuration: 0.82,
      combatTextFontSize: 38,
      foodBirthDuration: 0.36,
      enemySpawnActivationDuration: 0.38,
      enemySpawnActivationParticleCount: 5,
      enemySpawnActivationParticleSpeed: 90,
      enemySpawnActivationRadiusCells: 0.52,
      maxRenderFps: 120,
      minRenderDpr: 0.65,
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
      enemyHeadReformDuration: 0.42,
      experienceCompressionDuration: 0.42,
      experienceCompressionCascadeDelay: 0.18,
      profileSaveDelaySeconds: 30,
    });
    expect(DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE).toEqual([
      { startWave: 1, enemyCount: 1 },
      { startWave: 11, enemyCount: 2 },
      { startWave: 31, enemyCount: 3 },
      { startWave: 61, enemyCount: 4 },
      { startWave: 101, enemyCount: 5 },
      { startWave: 301, enemyCount: 6 },
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
    expect(moduleCooldownPercent('spark')).toBe(50);
    expect(moduleCooldownSeconds('spark')).toBe(3);
    expect(moduleCooldownPercent('crossfire')).toBe(310);
    expect(moduleCooldownSeconds('crossfire')).toBeCloseTo(18.6);
    expect(moduleCooldownPercent('fan')).toBe(375);
    expect(moduleCooldownSeconds('fan')).toBeCloseTo(22.5);
    expect(moduleCooldownPercent('barrage')).toBe(1500);
    expect(moduleCooldownSeconds('barrage')).toBe(90);
    expect(moduleCooldownPercent('shield')).toBe(500);
    expect(moduleCooldownSeconds('shield')).toBe(30);
  });

  it('没有独立冷却的常驻与触发型机体统一归为被动技能', () => {
    const passiveModules = MODULES.filter((module) => !module.activeCooldown);
    const feast = MODULES.find((module) => module.id === 'feast');

    expect(passiveModules.length).toBeGreaterThan(0);
    expect(passiveModules.every((module) => module.cooldown === '被动效果')).toBe(true);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'echo')).toBe(false);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'emergency')).toBe(false);
    expect(ACTIVE_SKILL_MODULES.some((module) => module.id === 'feast')).toBe(false);
    expect(feast?.desc).toContain('吃球后3秒内');
    expect(moduleCatalogSource).not.toMatch(/cooldown: "(?:常驻|吃球触发|击破触发|伤害触发|每\d+次击破)/u);
    expect(editorHtml).toContain('cooldownSummary.textContent = moduleUsageLabel(module);');
  });

  it('全部现有机体都有审查状态且禁用项不会进入升级池', () => {
    const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG: { moduleStates: Record<string, string> } }).GSS0_DESIGNER_CONFIG;
    expect(Object.keys(source.moduleStates).sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(Object.values(source.moduleStates).filter((state) => state === 'normal')).toHaveLength(53);
    expect(Object.values(source.moduleStates).filter((state) => state === 'tune')).toHaveLength(0);
    expect(Object.values(source.moduleStates).filter((state) => state === 'rework')).toHaveLength(0);
    expect(Object.values(source.moduleStates).filter((state) => state === 'disabled')).toHaveLength(29);
    expect(moduleDesignState('prism')).toBe('disabled');
    expect(UPGRADE_MODULES.map((module) => module.id)).toEqual(MODULES.filter((module) => moduleDesignState(module.id) !== 'disabled').map((module) => module.id));
  });

  it('本地编辑器与运行时配置使用完全相同的参数和机体 ID', () => {
    const parameterKeys = editorDefinitionIds('const ALL_PARAMETER_DEFINITIONS = [', 'const ENEMY_PARAMETER_GROUPS =', 'key');
    const moduleIds = [...moduleCatalogSource.matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);

    expect(parameterKeys.sort()).toEqual(Object.keys(DESIGNER_BALANCE).sort());
    expect(moduleIds.sort()).toEqual(MODULES.map((module) => module.id).sort());
    expect(moduleProgressionSource).toContain('config?.schemaVersion !== 42');
    expect(new Set(parameterKeys).size).toBe(237);
    expect(parameterKeys).not.toContain('playerSpeedPerLevel');
    expect(parameterKeys).not.toContain('moduleEffectReductionMaximum');
    expect(parameterKeys).not.toContain('newModuleOfferChance');
    expect(new Set(moduleIds).size).toBe(82);
  });

  it('全部机体共用唯一描述目录且被动参数明确', () => {
    expect(MODULES).toHaveLength(82);
    expect(MODULES.every((module) => module.desc.trim().length > 0)).toBe(true);
    expect(new Set(MODULES.map((module) => module.id)).size).toBe(MODULES.length);
    expect(MODULES.find((module) => module.id === 'spark')?.desc).toBe('向随机方向发射1枚子弹。');
    expect(MODULES.find((module) => module.id === 'frost')?.desc).toBe('扇形发射3枚子弹，附带1层冰冻效果。');
    expect(MODULES.find((module) => module.id === 'echo')?.desc).toContain('每级向随机方向发射2枚子弹');
    expect(MODULES.find((module) => module.id === 'barrage')?.desc).toBe('向四周发射16枚可无限反弹墙壁的子弹。');
    expect(MODULES.find((module) => module.id === 'wallbreaker')?.desc).toBe('每级使敌蛇撞墙与互撞的伤害和击退提高50%');
    expect(MODULES.find((module) => module.id === 'haste')?.desc).toBe('每级使玩家转向速度提高20%。');
    expect(MODULES.find((module) => module.id === 'headstrike')?.desc).toContain('敌蛇蛇头');
    expect(MODULES.find((module) => module.id === 'ram')?.desc).toContain('敌蛇任意部位');
    expect(MODULES.find((module) => module.id === 'venom')?.desc).toBe('发射腐蚀弹，附带1层腐蚀效果。');
    expect(MODULES.find((module) => module.id === 'corrosionfield')?.desc).toContain('腐蚀之地');
    expect(MODULES.find((module) => module.id === 'statusstrike')?.desc).toBe('撞击敌人时，每级随机附带1层冰冻、燃烧或腐蚀。');
    expect(MODULES.find((module) => module.id === 'statusstrike')?.note.split('\n')).toHaveLength(3);
    expect(MODULES.find((module) => module.id === 'statusamp')?.desc).toBe('每级使冰冻减速幅度、燃烧层数与腐蚀频率提高10%。');
    expect(MODULES.find((module) => module.id === 'replicator')?.desc).toBe('吃球时，每级有6%概率在蛇尾后方生成1枚球。此机体生成的球也可以再次触发此效果。');
    expect(MODULES.find((module) => module.id === 'buffer')?.category).toBe('辅助');
    expect(MODULES.find((module) => module.id === 'buffer')?.desc).toContain('撞击敌人时');
    expect(MODULES.find((module) => module.id === 'linkage')?.desc).toBe('每级使自身机体连接距离提高20%。');
    expect(MODULES.find((module) => module.id === 'deathburst')?.desc).toContain('每级向随机方向发射2枚子弹');
    expect(MODULES.find((module) => module.id === 'arsenal')?.desc).toBe('每级使主动技能的尺寸提高10%。（各类子弹尺寸、爆炸范围与激光半径等）');
    expect(MODULES.find((module) => module.id === 'incendiary')?.desc).toBe('瞄准生命值最高的敌蛇发射追踪燃烧弹；命中造成1伤害，并附带其50%生命值的燃烧层数。');
    expect(MODULES.find((module) => module.id === 'incendiary')?.note).toBe('燃烧：每0.3秒，随机摧毁一节身体，并失去一层燃烧层数。');
    expect(MODULES.find((module) => module.id === 'doublehit')?.desc).toContain('20%概率');
    expect(MODULES.find((module) => module.id === 'multishot')?.desc).toContain('12%概率');
    expect(MODULES.some((module) => ['输出', '进攻', '防御', '恢复'].includes(module.category as string))).toBe(false);
    expect(MODULES.every((module) => ['攻击', '生存', '辅助', '发育'].includes(module.category))).toBe(true);
    expect(MODULES.filter((module) => module.category === '发育')).toHaveLength(9);
    expect(editorHtml).toContain('src="module-catalog.js?v=120"');
    expect(editorHtml).toContain('src="module-progression.js?v=120"');
    expect(editorHtml).toContain('const MODULES = moduleCatalog;');
    expect(editorHtml).toContain('descriptionText.textContent = describeModule(module.id, draft.balance);');
    expect(editorHtml).toContain('descriptionNote.textContent = describeModuleNote(module.id, draft.balance);');
    expect(editorHtml).toContain('ID: ${module.id}');
    expect(editorHtml).toContain('nameInput.className = "module-name-input";');
    expect(editorHtml).toContain('draft.moduleNames[module.id] = configuredName;');
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
    expect(editorHtml).toContain('moduleNames: {}');
    expect(editorHtml).toContain('{ key: "playerMaxHealth", group: "玩家", label: "玩家生命上限", hint: "每次出生时拥有的生命值与生命上限", min: 0, max: 100');
    expect(editorHtml).toContain('{ key: "playerHealthRegenPerSecond", group: "玩家", label: "玩家生命恢复", hint: "存活并正常行动时每秒恢复的生命值", min: 0, max: 1');
    expect(editorHtml).toContain('range.max = "2000"');
    expect(editorHtml).toContain('actual.textContent = `实际 ${moduleCooldownLabel(module)}`');
    expect(editorHtml).toContain('data-view="enemies"');
    expect(editorHtml).toContain('id="enemies-view"');
    expect(editorHtml).toContain('id="enemy-config-list"');
    expect(editorHtml).toContain('data-view="waves"');
    expect(editorHtml).toContain('id="waves-view"');
    expect(editorHtml).toContain('id="wave-schedule-list"');
    expect(editorHtml).toContain('id="wave-preview-body"');
    expect(editorHtml).toContain('<span>难度设计</span>');
    expect(editorHtml).toContain('id="enemy-global-parameter-list"');
    expect(editorHtml).toContain('const ENEMY_GLOBAL_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('!DIFFICULTY_PARAMETER_GROUPS.has(definition.group)');
    expect(editorHtml).toContain('ui.enemyGlobalParameterList.replaceChildren');
    expect(editorHtml).toContain('const WAVE_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('waveDirectorApi.create({');
    expect(editorHtml).toContain('const ENEMY_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('const PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('const MODULE_PARAMETER_DEFINITIONS = ALL_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('parameterList.append(...moduleParameters.map(createParameterRow));');
    expect(editorHtml).toContain('parameters.append(...ENEMY_PARAMETER_DEFINITIONS.filter');
    expect(editorHtml).toContain('id="save-config"');
    expect(editorHtml).toContain('async function saveConfigNow()');
    expect(editorHtml).toContain('await flushAutoSave(true, true);');
    expect(editorHtml).toContain('const pendingDraft = isDirty() ? structuredClone(draft) : null;');
    expect(editorHtml).toContain('number.className = "number-input cooldown-number-input";');
    expect(editorHtml).toContain('number.addEventListener("input", () => updateCooldown(number.value));');
    expect(editorHtml).toContain('renderModules(true);');
    expect(editorHtml).toContain('statusButton.classList.toggle("is-active", statusButton.dataset.state === state);');
  });

  it('一键启动器只在本机以随机令牌读写固定配置文件', () => {
    expect(launcherCmd).toContain('balance-editor-server.ps1');
    expect(launcherServer).toContain('[Net.IPAddress]::Loopback');
    expect(launcherServer).not.toContain('[Net.IPAddress]::Any');
    expect(launcherServer).toContain('RandomNumberGenerator');
    expect(launcherServer).toContain('X-GSS0-Editor-Token');
    expect(launcherServer).toContain('$config.schemaVersion -eq $currentConfig.schemaVersion');
    expect(launcherServer).not.toContain('$config.schemaVersion -eq 16');
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
