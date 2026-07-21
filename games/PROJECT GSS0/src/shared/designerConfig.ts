import '../../designer-config.js';

export type ModuleDesignState = 'normal' | 'tune' | 'rework' | 'disabled';

interface DesignerConfigSource {
  schemaVersion?: unknown;
  balance?: Record<string, unknown>;
  waveEnemyCountSchedule?: unknown;
  moduleCooldownPercentages?: Record<string, unknown>;
  moduleStates?: Record<string, unknown>;
}

const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG?: DesignerConfigSource }).GSS0_DESIGNER_CONFIG;
if (source?.schemaVersion !== 19) throw new Error('PROJECT GSS0 设计配置版本无效，需要 schemaVersion 19');

function numberSetting(key: string, fallback: number, minimum: number, maximum: number, integer = false): number {
  const candidate = source?.balance?.[key];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return fallback;
  const clamped = Math.max(minimum, Math.min(maximum, candidate));
  return integer ? Math.round(clamped) : clamped;
}

export interface WaveEnemyCountTier {
  startWave: number;
  enemyCount: number;
}

function waveEnemyCountScheduleSetting(): readonly WaveEnemyCountTier[] {
  if (!Array.isArray(source?.waveEnemyCountSchedule) || source.waveEnemyCountSchedule.length === 0) {
    throw new Error('PROJECT GSS0 缺少波次敌人数计划');
  }
  const schedule = source.waveEnemyCountSchedule.map((entry, index) => {
    const candidate = entry as { startWave?: unknown; enemyCount?: unknown };
    const startWave = Math.max(1, Math.round(Number(candidate?.startWave)));
    const enemyCount = Math.max(1, Math.round(Number(candidate?.enemyCount)));
    if (!Number.isFinite(startWave) || !Number.isFinite(enemyCount)) throw new Error(`PROJECT GSS0 第 ${index + 1} 段波次计划无效`);
    return Object.freeze({ startWave, enemyCount });
  });
  if (schedule[0].startWave !== 1) throw new Error('PROJECT GSS0 波次敌人数计划必须从第 1 波开始');
  for (let index = 1; index < schedule.length; index += 1) {
    if (schedule[index].startWave <= schedule[index - 1].startWave) throw new Error('PROJECT GSS0 波次敌人数计划必须严格递增');
  }
  return Object.freeze(schedule);
}

export const DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE = waveEnemyCountScheduleSetting();

export const DESIGNER_BALANCE = Object.freeze({
  playerBaseSpeed: numberSetting('playerBaseSpeed', 5, 1, 12),
  snakeVisualScale: numberSetting('snakeVisualScale', 0.775, 0.25, 2),
  playerSegmentSpacing: numberSetting('playerSegmentSpacing', 0.45, 0.1, 1.5),
  enemySegmentSpacing: numberSetting('enemySegmentSpacing', 0.42, 0.1, 1.5),
  playerMaxHealth: numberSetting('playerMaxHealth', 30, 0, 100),
  playerHealthRegenPerSecond: numberSetting('playerHealthRegenPerSecond', 1, 0, 1),
  playerEnemyBodyCollisionDamage: numberSetting('playerEnemyBodyCollisionDamage', 10, 0, 10_000),
  playerWallCollisionDamage: numberSetting('playerWallCollisionDamage', 5, 0, 10_000),
  playerCollisionDamage: numberSetting('playerCollisionDamage', 1, 0, 1_000, true),
  enemyCollisionDamage: numberSetting('enemyCollisionDamage', 1, 0, 1_000, true),
  xpRequirementBase: numberSetting('xpRequirementBase', 5, 1, 100, true),
  xpRequirementPerLevel: numberSetting('xpRequirementPerLevel', 2, 0, 20, true),
  experienceCompressionBase: numberSetting('experienceCompressionBase', 5, 2, 10, true),
  maxModuleLevel: numberSetting('maxModuleLevel', 5, 1, 20, true),
  initialModuleSlots: numberSetting('initialModuleSlots', 5, 1, 20, true),
  moduleSlotUnlockLevel1: numberSetting('moduleSlotUnlockLevel1', 8, 1, 100, true),
  moduleSlotUnlockLevel2: numberSetting('moduleSlotUnlockLevel2', 12, 1, 100, true),
  moduleSlotUnlockLevel3: numberSetting('moduleSlotUnlockLevel3', 18, 1, 100, true),
  moduleSlotUnlockLevel4: numberSetting('moduleSlotUnlockLevel4', 25, 1, 100, true),
  playerTurnRate: numberSetting('playerTurnRate', 4.2, 0.5, 12),
  enemyBaseSpeed: numberSetting('enemyBaseSpeed', 4, 0.5, 12),
  enemySpeedPerMinute: numberSetting('enemySpeedPerMinute', 0.01, 0, 0.2),
  enemySpeedMaxMultiplier: numberSetting('enemySpeedMaxMultiplier', 1.12, 1, 3),
  enemyTurnRateMin: numberSetting('enemyTurnRateMin', 2.05, 0.1, 10),
  enemyTurnRateMax: numberSetting('enemyTurnRateMax', 2.75, 0.1, 12),
  enemyPressureWaveInterval: numberSetting('enemyPressureWaveInterval', 5, 0, 50, true),
  enemyPressureEnemyCountMultiplier: numberSetting('enemyPressureEnemyCountMultiplier', 2, 1, 10, true),
  enemyPressureThreatMultiplier: numberSetting('enemyPressureThreatMultiplier', 2, 1, 10),
  enemyExpectedDpsInterval: numberSetting('enemyExpectedDpsInterval', 6, 0.1, 60),
  enemyThreatTimeCoefficient: numberSetting('enemyThreatTimeCoefficient', 6, 0, 120),
  enemyThreatGrowthPerWave: numberSetting('enemyThreatGrowthPerWave', 0.02, 0, 1),
  enemyHealthWeightVariation: numberSetting('enemyHealthWeightVariation', 0.25, 0, 1),
  enemyThinkIntervalMin: numberSetting('enemyThinkIntervalMin', 0.22, 0.05, 5),
  enemyThinkIntervalMax: numberSetting('enemyThinkIntervalMax', 0.55, 0.05, 5),
  enemyFoodSearchLimit: numberSetting('enemyFoodSearchLimit', 8, 1, 32, true),
  enemyWallAvoidanceDistance: numberSetting('enemyWallAvoidanceDistance', 1.35, 0.5, 6),
  enemyScoutUnlockSeconds: numberSetting('enemyScoutUnlockSeconds', 0, 0, 3_600),
  enemyScoutSpawnWeight: numberSetting('enemyScoutSpawnWeight', 10, 0, 20),
  enemyScoutHealthWeight: numberSetting('enemyScoutHealthWeight', 1, 0.01, 20),
  enemyScoutSpeedMultiplier: numberSetting('enemyScoutSpeedMultiplier', 1, 0.1, 3),
  enemyScoutTurnMultiplier: numberSetting('enemyScoutTurnMultiplier', 1, 0.1, 3),
  enemyScoutFoodRange: numberSetting('enemyScoutFoodRange', 6, 0, 30),
  enemyForagerUnlockSeconds: numberSetting('enemyForagerUnlockSeconds', 0, 0, 3_600),
  enemyForagerSpawnWeight: numberSetting('enemyForagerSpawnWeight', 5, 0, 20),
  enemyForagerHealthWeight: numberSetting('enemyForagerHealthWeight', 2, 0.01, 20),
  enemyForagerSpeedMultiplier: numberSetting('enemyForagerSpeedMultiplier', 0.75, 0.1, 3),
  enemyForagerTurnMultiplier: numberSetting('enemyForagerTurnMultiplier', 1, 0.1, 3),
  enemyCourierUnlockSeconds: numberSetting('enemyCourierUnlockSeconds', 120, 0, 3_600),
  enemyCourierSpawnWeight: numberSetting('enemyCourierSpawnWeight', 2.5, 0, 20),
  enemyCourierHealthWeight: numberSetting('enemyCourierHealthWeight', 4, 0.01, 20),
  enemyCourierSpeedMultiplier: numberSetting('enemyCourierSpeedMultiplier', 0.6, 0.1, 3),
  enemyCourierTurnMultiplier: numberSetting('enemyCourierTurnMultiplier', 1, 0.1, 3),
  enemyCourierFoodClusterRadius: numberSetting('enemyCourierFoodClusterRadius', 2.5, 0.5, 10),
  enemyChargerUnlockSeconds: numberSetting('enemyChargerUnlockSeconds', 90, 0, 3_600),
  enemyChargerSpawnWeight: numberSetting('enemyChargerSpawnWeight', 2.5, 0, 20),
  enemyChargerHealthWeight: numberSetting('enemyChargerHealthWeight', 2, 0.01, 20),
  enemyChargerSpeedMultiplier: numberSetting('enemyChargerSpeedMultiplier', 1.5, 0.1, 3),
  enemyChargerTurnMultiplier: numberSetting('enemyChargerTurnMultiplier', 1.5, 0.1, 3),
  enemyChargerTrackingWobble: numberSetting('enemyChargerTrackingWobble', 0.16, 0, 0.6),
  enemyCutterUnlockSeconds: numberSetting('enemyCutterUnlockSeconds', 180, 0, 3_600),
  enemyCutterSpawnWeight: numberSetting('enemyCutterSpawnWeight', 1.25, 0, 20),
  enemyCutterHealthWeight: numberSetting('enemyCutterHealthWeight', 2, 0.01, 20),
  enemyCutterSpeedMultiplier: numberSetting('enemyCutterSpeedMultiplier', 2, 0.1, 3),
  enemyCutterTurnMultiplier: numberSetting('enemyCutterTurnMultiplier', 2, 0.1, 3),
  enemyCutterLeadDistance: numberSetting('enemyCutterLeadDistance', 3.2, 0.5, 12),
  enemyCutterLateralDistance: numberSetting('enemyCutterLateralDistance', 2.4, 0.5, 12),
  enemyCoilerUnlockSeconds: numberSetting('enemyCoilerUnlockSeconds', 300, 0, 3_600),
  enemyCoilerSpawnWeight: numberSetting('enemyCoilerSpawnWeight', 1.25, 0, 20),
  enemyCoilerHealthWeight: numberSetting('enemyCoilerHealthWeight', 6, 0.01, 20),
  enemyCoilerSpeedMultiplier: numberSetting('enemyCoilerSpeedMultiplier', 0.75, 0.1, 3),
  enemyCoilerTurnMultiplier: numberSetting('enemyCoilerTurnMultiplier', 1.5, 0.1, 3),
  enemyCoilerOrbitRadius: numberSetting('enemyCoilerOrbitRadius', 2.7, 0.5, 10),
  enemyCoilerRadialCorrection: numberSetting('enemyCoilerRadialCorrection', 0.9, 0, 2),
  enemyWardenUnlockSeconds: numberSetting('enemyWardenUnlockSeconds', 420, 0, 3_600),
  enemyWardenSpawnWeight: numberSetting('enemyWardenSpawnWeight', 1.25, 0, 20),
  enemyWardenHealthWeight: numberSetting('enemyWardenHealthWeight', 8, 0.01, 20),
  enemyWardenSpeedMultiplier: numberSetting('enemyWardenSpeedMultiplier', 0.6, 0.1, 3),
  enemyWardenTurnMultiplier: numberSetting('enemyWardenTurnMultiplier', 0.6, 0.1, 3),
  enemyWardenEscortDistance: numberSetting('enemyWardenEscortDistance', 2, 0.5, 10),
  enemyWardenKnockbackMultiplier: numberSetting('enemyWardenKnockbackMultiplier', 2, 1, 4),
  waveInterval: numberSetting('waveInterval', 6, 0.5, 120),
  foodsPerPlayerPerWave: numberSetting('foodsPerPlayerPerWave', 2, 0, 20, true),
  enemySpawnWarning: numberSetting('enemySpawnWarning', 1.5, 0, 10),
  projectileSpeedScale: numberSetting('projectileSpeedScale', 3, 0.1, 10),
  projectileSizeScale: numberSetting('projectileSizeScale', 2, 0.1, 10),
  poisonTickInterval: numberSetting('poisonTickInterval', 3, 0.05, 30),
  activeSkillBaseCooldown: numberSetting('activeSkillBaseCooldown', 3, 0.05, 30),
  moduleRepulseRangePerLevelPixels: numberSetting('moduleRepulseRangePerLevelPixels', 110, 1, 1_000),
  moduleArmorCooldownRatePerLevel: numberSetting('moduleArmorCooldownRatePerLevel', 0.18, 0, 5),
  moduleStabilizerSlowReductionPerLevel: numberSetting('moduleStabilizerSlowReductionPerLevel', 0.25, 0, 1),
  moduleStabilizerLockReductionPerLevel: numberSetting('moduleStabilizerLockReductionPerLevel', 0.2, 0, 1),
  moduleMagnetPickupRangePerLevel: numberSetting('moduleMagnetPickupRangePerLevel', 0.55, 0, 20),
  moduleHasteTurnRatePerLevel: numberSetting('moduleHasteTurnRatePerLevel', 0.2, 0, 5),
  moduleChronosSlowPerLevel: numberSetting('moduleChronosSlowPerLevel', 0.08, 0, 1),
  moduleTractorRangePerLevel: numberSetting('moduleTractorRangePerLevel', 3.5, 0, 30),
  moduleTractorPullSpeedPerLevel: numberSetting('moduleTractorPullSpeedPerLevel', 1.8, 0, 30),
  moduleFortuneExpectedDropsPerLevel: numberSetting('moduleFortuneExpectedDropsPerLevel', 0.18, 0, 10),
  moduleGuidanceProjectileSpeedPerLevel: numberSetting('moduleGuidanceProjectileSpeedPerLevel', 0.12, 0, 5),
  moduleGuidanceHomingPerLevel: numberSetting('moduleGuidanceHomingPerLevel', 0.35, 0, 20),
  moduleFeastDuration: numberSetting('moduleFeastDuration', 2.5, 0.05, 30),
  moduleFeastSpeedPerLevel: numberSetting('moduleFeastSpeedPerLevel', 0.12, 0, 5),
  moduleSalvageExpectedDropsPerLevel: numberSetting('moduleSalvageExpectedDropsPerLevel', 0.14, 0, 10),
  moduleAmplifierCooldownRatePerLevel: numberSetting('moduleAmplifierCooldownRatePerLevel', 0.1, 0, 5),
  moduleBufferCollisionReductionPerLevel: numberSetting('moduleBufferCollisionReductionPerLevel', 0.2, 0, 1),
  moduleDecoyAvoidanceReductionPerLevel: numberSetting('moduleDecoyAvoidanceReductionPerLevel', 0.12, 0, 1),
  moduleDecoyMaxAvoidanceReduction: numberSetting('moduleDecoyMaxAvoidanceReduction', 0.55, 0, 1),
  moduleEmergencyDurationPerLevel: numberSetting('moduleEmergencyDurationPerLevel', 0.37, 0, 30),
  moduleEmergencyMaxDuration: numberSetting('moduleEmergencyMaxDuration', 0.9, 0, 30),
  moduleCollectorPickupRadiusPerLevel: numberSetting('moduleCollectorPickupRadiusPerLevel', 0.09, 0, 10),
  moduleBeaconEnemyCountPerLevel: numberSetting('moduleBeaconEnemyCountPerLevel', 0.15, 0, 5),
  moduleMomentumKnockbackPerLevel: numberSetting('moduleMomentumKnockbackPerLevel', 1, 0, 10),
  moduleProgressorSpeedPerLevel: numberSetting('moduleProgressorSpeedPerLevel', 0.2, 0, 5),
  moduleCacheKillsPerTrigger: numberSetting('moduleCacheKillsPerTrigger', 5, 1, 100, true),
  moduleThornsProjectileCount: numberSetting('moduleThornsProjectileCount', 6, 1, 100, true),
  moduleFrostSlowPerHit: numberSetting('moduleFrostSlowPerHit', 0.2, 0, 1),
  moduleFrostMinimumSpeedMultiplier: numberSetting('moduleFrostMinimumSpeedMultiplier', 0.05, 0.01, 1),
  moduleBladeBaseSizePixels: numberSetting('moduleBladeBaseSizePixels', 10, 1, 100),
  moduleBladeOrbitSpeed: numberSetting('moduleBladeOrbitSpeed', 2.28, 0, 20),
  modulePulseRadiusCells: numberSetting('modulePulseRadiusCells', 6, 0.1, 30),
  moduleClusterBlastRadiusCells: numberSetting('moduleClusterBlastRadiusCells', 5, 0.1, 30),
  moduleShieldMaxCharges: numberSetting('moduleShieldMaxCharges', 5, 1, 20, true),
  moduleBonusXpChancePerLevel: numberSetting('moduleBonusXpChancePerLevel', 0.1, 0, 1),
  moduleHeadCollisionDamagePerLevel: numberSetting('moduleHeadCollisionDamagePerLevel', 2, 0, 100, true),
  moduleMaxHealthPerLevel: numberSetting('moduleMaxHealthPerLevel', 6, 0, 100),
  moduleHealthRegenPerLevel: numberSetting('moduleHealthRegenPerLevel', 0.5, 0, 20),
  moduleDamageReductionPerLevel: numberSetting('moduleDamageReductionPerLevel', 0.1, 0, 1),
  moduleFoodReplicationChancePerLevel: numberSetting('moduleFoodReplicationChancePerLevel', 0.06, 0, 1),
  moduleFoodHealPerLevel: numberSetting('moduleFoodHealPerLevel', 1, 0, 100),
  moduleMissingHealthSpeedStep: numberSetting('moduleMissingHealthSpeedStep', 0.03, 0.01, 1),
  moduleMissingHealthSpeedPerStepPerLevel: numberSetting('moduleMissingHealthSpeedPerStepPerLevel', 0.01, 0, 1),
  moduleMissingHealthHeadDamageStep: numberSetting('moduleMissingHealthHeadDamageStep', 0.3, 0.01, 1),
  moduleMissingHealthHeadDamagePerStepPerLevel: numberSetting('moduleMissingHealthHeadDamagePerStepPerLevel', 1, 0, 100, true),
  moduleHealingReceivedPerLevel: numberSetting('moduleHealingReceivedPerLevel', 0.2, 0, 5),
  moduleEnemyWallDamagePerLevel: numberSetting('moduleEnemyWallDamagePerLevel', 1, 0, 10),
  moduleEnemyWallKnockbackPerLevel: numberSetting('moduleEnemyWallKnockbackPerLevel', 1, 0, 10),
  moduleTailGuardSegmentsPerLevel: numberSetting('moduleTailGuardSegmentsPerLevel', 2, 0, 20, true),
  moduleDeathBurstProjectilesPerLevel: numberSetting('moduleDeathBurstProjectilesPerLevel', 2, 0, 20, true),
  moduleCrisisHealthThreshold: numberSetting('moduleCrisisHealthThreshold', 0.5, 0, 1),
  moduleCrisisRegenPerLevel: numberSetting('moduleCrisisRegenPerLevel', 1, 0, 20),
  arenaBaseArea: numberSetting('arenaBaseArea', 345.6, 64, 4_096),
  arenaAreaPerLevel: numberSetting('arenaAreaPerLevel', 0.03, 0, 0.5),
  arenaResizeRate: numberSetting('arenaResizeRate', 2.4, 0.1, 10),
  upgradeInvulnerabilityDuration: numberSetting('upgradeInvulnerabilityDuration', 0.5, 0, 10),
  respawnLocatorConvergeDuration: numberSetting('respawnLocatorConvergeDuration', 1, 0.1, 10),
  respawnLocatorFadeDuration: numberSetting('respawnLocatorFadeDuration', 3, 0.1, 20),
  multiplayerGhostSpeed: numberSetting('multiplayerGhostSpeed', 0.3, 0.05, 3),
  multiplayerGhostPleaInterval: numberSetting('multiplayerGhostPleaInterval', 0.65, 0.1, 5),
  multiplayerGhostPleaDuration: numberSetting('multiplayerGhostPleaDuration', 0.9, 0.1, 3),
  multiplayerGhostOpacity: numberSetting('multiplayerGhostOpacity', 0.36, 0.05, 0.9),
  multiplayerGhostPulseStrength: numberSetting('multiplayerGhostPulseStrength', 0.12, 0, 0.4),
  multiplayerGhostPulseRate: numberSetting('multiplayerGhostPulseRate', 1.1, 0.1, 5),
  multiplayerReviveContactRange: numberSetting('multiplayerReviveContactRange', 0.46, 0.1, 1.5),
  multiplayerReviveHealthRatio: numberSetting('multiplayerReviveHealthRatio', 0.5, 0.01, 1),
  multiplayerReviveInvulnerabilityDuration: numberSetting('multiplayerReviveInvulnerabilityDuration', 2, 0, 10),
  playerDamageEffectDuration: numberSetting('playerDamageEffectDuration', 0.65, 0.1, 5),
  playerDamageFlashStrength: numberSetting('playerDamageFlashStrength', 0.55, 0, 2),
  playerDamageShakeStrength: numberSetting('playerDamageShakeStrength', 9, 0, 30),
  playerDamageParticleCount: numberSetting('playerDamageParticleCount', 26, 0, 200, true),
  playerDamageParticleSpeed: numberSetting('playerDamageParticleSpeed', 190, 0, 1_000),
  enemyDamageNumberDuration: numberSetting('enemyDamageNumberDuration', 0.82, 0.1, 3),
  foodBirthDuration: numberSetting('foodBirthDuration', 0.36, 0.05, 2),
  maxRenderFps: numberSetting('maxRenderFps', 60, 30, 240, true),
  maxRenderDpr: numberSetting('maxRenderDpr', 1.25, 1, 2),
  networkPlayerStateHz: numberSetting('networkPlayerStateHz', 20, 5, 60, true),
  networkCollisionClaimCooldownMs: numberSetting('networkCollisionClaimCooldownMs', 500, 100, 2_000, true),
  networkInterpolationMinMs: numberSetting('networkInterpolationMinMs', 90, 40, 300, true),
  networkInterpolationMaxMs: numberSetting('networkInterpolationMaxMs', 120, 40, 400, true),
  networkCollisionHistoryMs: numberSetting('networkCollisionHistoryMs', 800, 200, 3_000, true),
  networkHeadCollisionValidationTolerance: numberSetting('networkHeadCollisionValidationTolerance', 0.65, 0.1, 3),
  networkHeadCollisionContactAllowance: numberSetting('networkHeadCollisionContactAllowance', 0.12, 0, 1),
  networkHeadCollisionEventGraceMs: numberSetting('networkHeadCollisionEventGraceMs', 120, 0, 500, true),
  networkHeadCollisionSeparationRate: numberSetting('networkHeadCollisionSeparationRate', 4, 0.1, 20),
  networkHeadCollisionRemoteImpulse: numberSetting('networkHeadCollisionRemoteImpulse', 0.22, 0, 1),
  networkHeadCollisionRemoteImpulseDuration: numberSetting('networkHeadCollisionRemoteImpulseDuration', 0.24, 0.05, 1),
  enemyDeathHeadParticles: numberSetting('enemyDeathHeadParticles', 28, 1, 100, true),
  enemyDeathBodyParticles: numberSetting('enemyDeathBodyParticles', 7, 1, 40, true),
  enemyDeathHeadParticleSpeed: numberSetting('enemyDeathHeadParticleSpeed', 185, 10, 500),
  enemyDeathBodyParticleSpeed: numberSetting('enemyDeathBodyParticleSpeed', 105, 10, 400),
  enemyBodyReconnectDuration: numberSetting('enemyBodyReconnectDuration', 0.28, 0.05, 2),
  enemyHeadReformDuration: numberSetting('enemyHeadReformDuration', 0.42, 0.05, 2),
  experienceCompressionDuration: numberSetting('experienceCompressionDuration', 0.42, 0.05, 3),
  experienceCompressionCascadeDelay: numberSetting('experienceCompressionCascadeDelay', 0.18, 0, 2),
  experienceCompressionGrayParticles: numberSetting('experienceCompressionGrayParticles', 24, 1, 100, true),
  experienceCompressionGoldParticles: numberSetting('experienceCompressionGoldParticles', 42, 1, 160, true),
  experienceCompressionGrayShake: numberSetting('experienceCompressionGrayShake', 1.8, 0, 12),
  experienceCompressionGoldShake: numberSetting('experienceCompressionGoldShake', 5.2, 0, 16),
  profileSaveDelaySeconds: numberSetting('profileSaveDelaySeconds', 30, 1, 300),
});

export function moduleCooldownPercent(moduleId: string): number {
  const candidate = source?.moduleCooldownPercentages?.[moduleId];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    throw new Error(`PROJECT GSS0 机体 ${moduleId} 缺少冷却百分比`);
  }
  return Math.max(0, Math.min(1_000, candidate));
}

export function moduleCooldownSeconds(moduleId: string): number {
  return DESIGNER_BALANCE.activeSkillBaseCooldown * moduleCooldownPercent(moduleId) / 100;
}

export function formatCooldownSeconds(seconds: number): string {
  return `${Number(seconds.toFixed(2))}秒`;
}

export function moduleDesignState(moduleId: string): ModuleDesignState {
  const state = source?.moduleStates?.[moduleId];
  return state === 'tune' || state === 'rework' || state === 'disabled' ? state : 'normal';
}

export function moduleIsUpgradeEnabled(moduleId: string): boolean {
  return moduleDesignState(moduleId) !== 'disabled';
}
