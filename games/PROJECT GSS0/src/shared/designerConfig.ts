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
if (source?.schemaVersion !== 8) throw new Error('PROJECT GSS0 设计配置版本无效，需要 schemaVersion 8');

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
    const enemyCount = Math.max(1, Math.min(100, Math.round(Number(candidate?.enemyCount))));
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
  playerSpeedPerLevel: numberSetting('playerSpeedPerLevel', 0, 0, 0.5),
  xpRequirementBase: numberSetting('xpRequirementBase', 5, 1, 100, true),
  xpRequirementPerLevel: numberSetting('xpRequirementPerLevel', 2, 0, 20, true),
  experienceCompressionBase: numberSetting('experienceCompressionBase', 5, 2, 10, true),
  initialModuleSlots: numberSetting('initialModuleSlots', 5, 1, 20, true),
  moduleSlotUnlockLevel1: numberSetting('moduleSlotUnlockLevel1', 8, 1, 100, true),
  moduleSlotUnlockLevel2: numberSetting('moduleSlotUnlockLevel2', 12, 1, 100, true),
  moduleSlotUnlockLevel3: numberSetting('moduleSlotUnlockLevel3', 18, 1, 100, true),
  moduleSlotUnlockLevel4: numberSetting('moduleSlotUnlockLevel4', 25, 1, 100, true),
  newModuleOfferChance: numberSetting('newModuleOfferChance', 0.5, 0, 1),
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
  enemyThreatTimeCoefficient: numberSetting('enemyThreatTimeCoefficient', 9, 0, 120),
  enemyThreatGrowthPerWave: numberSetting('enemyThreatGrowthPerWave', 0.02, 0, 1),
  enemyHealthWeightVariation: numberSetting('enemyHealthWeightVariation', 0.25, 0, 1),
  enemyThinkIntervalMin: numberSetting('enemyThinkIntervalMin', 0.22, 0.05, 5),
  enemyThinkIntervalMax: numberSetting('enemyThinkIntervalMax', 0.55, 0.05, 5),
  enemyFoodSearchLimit: numberSetting('enemyFoodSearchLimit', 8, 1, 32, true),
  enemyScoutUnlockSeconds: numberSetting('enemyScoutUnlockSeconds', 0, 0, 3_600),
  enemyScoutSpawnWeight: numberSetting('enemyScoutSpawnWeight', 5, 0, 20),
  enemyScoutHealthWeight: numberSetting('enemyScoutHealthWeight', 1, 0.01, 20),
  enemyScoutSpeedMultiplier: numberSetting('enemyScoutSpeedMultiplier', 1.08, 0.1, 3),
  enemyScoutTurnMultiplier: numberSetting('enemyScoutTurnMultiplier', 1.15, 0.1, 3),
  enemyScoutFoodInterest: numberSetting('enemyScoutFoodInterest', 0.3, 0, 1),
  enemyForagerUnlockSeconds: numberSetting('enemyForagerUnlockSeconds', 0, 0, 3_600),
  enemyForagerSpawnWeight: numberSetting('enemyForagerSpawnWeight', 4, 0, 20),
  enemyForagerHealthWeight: numberSetting('enemyForagerHealthWeight', 1.65, 0.01, 20),
  enemyForagerSpeedMultiplier: numberSetting('enemyForagerSpeedMultiplier', 0.92, 0.1, 3),
  enemyForagerTurnMultiplier: numberSetting('enemyForagerTurnMultiplier', 1, 0.1, 3),
  enemyCourierUnlockSeconds: numberSetting('enemyCourierUnlockSeconds', 120, 0, 3_600),
  enemyCourierSpawnWeight: numberSetting('enemyCourierSpawnWeight', 2, 0, 20),
  enemyCourierHealthWeight: numberSetting('enemyCourierHealthWeight', 2, 0.01, 20),
  enemyCourierSpeedMultiplier: numberSetting('enemyCourierSpeedMultiplier', 1.12, 0.1, 3),
  enemyCourierTurnMultiplier: numberSetting('enemyCourierTurnMultiplier', 1.08, 0.1, 3),
  enemyCourierCarryThreshold: numberSetting('enemyCourierCarryThreshold', 3, 1, 100, true),
  enemyCourierFleeStrength: numberSetting('enemyCourierFleeStrength', 0.9, 0, 1),
  enemyCourierFoodClusterRadius: numberSetting('enemyCourierFoodClusterRadius', 2.5, 0.5, 10),
  enemyChargerUnlockSeconds: numberSetting('enemyChargerUnlockSeconds', 90, 0, 3_600),
  enemyChargerSpawnWeight: numberSetting('enemyChargerSpawnWeight', 1.8, 0, 20),
  enemyChargerHealthWeight: numberSetting('enemyChargerHealthWeight', 2.2, 0.01, 20),
  enemyChargerSpeedMultiplier: numberSetting('enemyChargerSpeedMultiplier', 0.78, 0.1, 3),
  enemyChargerTurnMultiplier: numberSetting('enemyChargerTurnMultiplier', 0.72, 0.1, 3),
  enemyChargerCooldown: numberSetting('enemyChargerCooldown', 2.8, 0.1, 20),
  enemyChargerDetectionRange: numberSetting('enemyChargerDetectionRange', 9, 1, 30),
  enemyChargerTelegraphDuration: numberSetting('enemyChargerTelegraphDuration', 0.7, 0.1, 5),
  enemyChargerChargeDuration: numberSetting('enemyChargerChargeDuration', 1.1, 0.1, 5),
  enemyChargerChargeSpeedMultiplier: numberSetting('enemyChargerChargeSpeedMultiplier', 1.85, 1, 5),
  enemyCutterUnlockSeconds: numberSetting('enemyCutterUnlockSeconds', 180, 0, 3_600),
  enemyCutterSpawnWeight: numberSetting('enemyCutterSpawnWeight', 1.4, 0, 20),
  enemyCutterHealthWeight: numberSetting('enemyCutterHealthWeight', 3.6, 0.01, 20),
  enemyCutterSpeedMultiplier: numberSetting('enemyCutterSpeedMultiplier', 1, 0.1, 3),
  enemyCutterTurnMultiplier: numberSetting('enemyCutterTurnMultiplier', 0.72, 0.1, 3),
  enemyCutterLeadDistance: numberSetting('enemyCutterLeadDistance', 3.2, 0.5, 12),
  enemyCutterLateralDistance: numberSetting('enemyCutterLateralDistance', 2.4, 0.5, 12),
  enemyCoilerUnlockSeconds: numberSetting('enemyCoilerUnlockSeconds', 300, 0, 3_600),
  enemyCoilerSpawnWeight: numberSetting('enemyCoilerSpawnWeight', 1.05, 0, 20),
  enemyCoilerHealthWeight: numberSetting('enemyCoilerHealthWeight', 4, 0.01, 20),
  enemyCoilerSpeedMultiplier: numberSetting('enemyCoilerSpeedMultiplier', 0.78, 0.1, 3),
  enemyCoilerTurnMultiplier: numberSetting('enemyCoilerTurnMultiplier', 1.18, 0.1, 3),
  enemyCoilerOrbitRadius: numberSetting('enemyCoilerOrbitRadius', 2.7, 0.5, 10),
  enemyCoilerRadialCorrection: numberSetting('enemyCoilerRadialCorrection', 0.9, 0, 2),
  enemyWardenUnlockSeconds: numberSetting('enemyWardenUnlockSeconds', 420, 0, 3_600),
  enemyWardenSpawnWeight: numberSetting('enemyWardenSpawnWeight', 0.45, 0, 20),
  enemyWardenHealthWeight: numberSetting('enemyWardenHealthWeight', 6.2, 0.01, 20),
  enemyWardenSpeedMultiplier: numberSetting('enemyWardenSpeedMultiplier', 0.72, 0.1, 3),
  enemyWardenTurnMultiplier: numberSetting('enemyWardenTurnMultiplier', 0.68, 0.1, 3),
  enemyWardenEscortDistance: numberSetting('enemyWardenEscortDistance', 2, 0.5, 10),
  enemyWardenKnockbackMultiplier: numberSetting('enemyWardenKnockbackMultiplier', 1.5, 1, 4),
  waveInterval: numberSetting('waveInterval', 6, 0.5, 120),
  foodsPerPlayerPerWave: numberSetting('foodsPerPlayerPerWave', 2, 0, 20, true),
  enemySpawnWarning: numberSetting('enemySpawnWarning', 1.5, 0, 10),
  projectileSpeedScale: numberSetting('projectileSpeedScale', 3, 0.1, 10),
  projectileSizeScale: numberSetting('projectileSizeScale', 2, 0.1, 10),
  headAttackInterval: numberSetting('headAttackInterval', 3, 0.05, 30),
  poisonInitialTickDelay: numberSetting('poisonInitialTickDelay', 1.4, 0.05, 30),
  poisonTickInterval: numberSetting('poisonTickInterval', 2.3, 0.05, 30),
  activeSkillBaseCooldown: numberSetting('activeSkillBaseCooldown', 3, 0.05, 30),
  moduleRepulseRangePerLevelPixels: numberSetting('moduleRepulseRangePerLevelPixels', 110, 1, 1_000),
  moduleArmorCooldownRatePerLevel: numberSetting('moduleArmorCooldownRatePerLevel', 0.18, 0, 5),
  moduleStabilizerSlowReductionPerLevel: numberSetting('moduleStabilizerSlowReductionPerLevel', 0.25, 0, 1),
  moduleStabilizerLockReductionPerLevel: numberSetting('moduleStabilizerLockReductionPerLevel', 0.2, 0, 1),
  moduleMagnetPickupRangePerLevel: numberSetting('moduleMagnetPickupRangePerLevel', 0.55, 0, 20),
  moduleHasteSpeedPerLevel: numberSetting('moduleHasteSpeedPerLevel', 0.045, 0, 2),
  moduleHasteTurnRatePerLevel: numberSetting('moduleHasteTurnRatePerLevel', 0.18, 0, 10),
  moduleChronosSlowPerLevel: numberSetting('moduleChronosSlowPerLevel', 0.08, 0, 1),
  moduleTractorRangePerLevel: numberSetting('moduleTractorRangePerLevel', 3.5, 0, 30),
  moduleTractorPullSpeedPerLevel: numberSetting('moduleTractorPullSpeedPerLevel', 1.8, 0, 30),
  moduleFortuneExpectedDropsPerLevel: numberSetting('moduleFortuneExpectedDropsPerLevel', 0.18, 0, 10),
  moduleGuidanceProjectileSpeedPerLevel: numberSetting('moduleGuidanceProjectileSpeedPerLevel', 0.12, 0, 5),
  moduleGuidanceHomingPerLevel: numberSetting('moduleGuidanceHomingPerLevel', 0.35, 0, 20),
  moduleFeastDuration: numberSetting('moduleFeastDuration', 2.5, 0.05, 30),
  moduleFeastSpeedPerLevel: numberSetting('moduleFeastSpeedPerLevel', 0.12, 0, 5),
  moduleSalvageExpectedDropsPerLevel: numberSetting('moduleSalvageExpectedDropsPerLevel', 0.14, 0, 10),
  moduleAmplifierCooldownRatePerLevel: numberSetting('moduleAmplifierCooldownRatePerLevel', 0.14, 0, 5),
  moduleBufferKnockbackReductionPerLevel: numberSetting('moduleBufferKnockbackReductionPerLevel', 0.18, 0, 1),
  moduleDecoyAvoidanceReductionPerLevel: numberSetting('moduleDecoyAvoidanceReductionPerLevel', 0.12, 0, 1),
  moduleDecoyMaxAvoidanceReduction: numberSetting('moduleDecoyMaxAvoidanceReduction', 0.55, 0, 1),
  moduleEmergencyDurationPerLevel: numberSetting('moduleEmergencyDurationPerLevel', 0.37, 0, 30),
  moduleEmergencyMaxDuration: numberSetting('moduleEmergencyMaxDuration', 0.9, 0, 30),
  moduleCollectorPickupRadiusPerLevel: numberSetting('moduleCollectorPickupRadiusPerLevel', 0.09, 0, 10),
  moduleBeaconWaveRatePerLevel: numberSetting('moduleBeaconWaveRatePerLevel', 0.07, 0, 5),
  moduleMomentumKnockbackPerLevel: numberSetting('moduleMomentumKnockbackPerLevel', 0.18, 0, 5),
  moduleProgressorMaxSpeedPerLevel: numberSetting('moduleProgressorMaxSpeedPerLevel', 0.08, 0, 5),
  moduleCacheKillsPerTrigger: numberSetting('moduleCacheKillsPerTrigger', 5, 1, 100, true),
  moduleThornsProjectileCount: numberSetting('moduleThornsProjectileCount', 6, 1, 100, true),
  moduleEffectReductionMaximum: numberSetting('moduleEffectReductionMaximum', 0.9, 0, 0.99),
  arenaAreaPerLevel: numberSetting('arenaAreaPerLevel', 0.05, 0, 0.5),
  arenaResizeRate: numberSetting('arenaResizeRate', 2.4, 0.1, 10),
  upgradeInvulnerabilityDuration: numberSetting('upgradeInvulnerabilityDuration', 0.5, 0, 10),
  respawnLocatorConvergeDuration: numberSetting('respawnLocatorConvergeDuration', 1, 0.1, 10),
  respawnLocatorFadeDuration: numberSetting('respawnLocatorFadeDuration', 3, 0.1, 20),
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
