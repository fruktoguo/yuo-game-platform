import '../../designer-config.js';

export type ModuleDesignState = 'normal' | 'tune' | 'rework' | 'disabled';

interface DesignerConfigSource {
  schemaVersion?: unknown;
  balance?: Record<string, unknown>;
  moduleCooldownPercentages?: Record<string, unknown>;
  moduleStates?: Record<string, unknown>;
}

const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG?: DesignerConfigSource }).GSS0_DESIGNER_CONFIG;
if (source?.schemaVersion !== 5) throw new Error('PROJECT GSS0 设计配置版本无效，需要 schemaVersion 5');

function numberSetting(key: string, fallback: number, minimum: number, maximum: number, integer = false): number {
  const candidate = source?.balance?.[key];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return fallback;
  const clamped = Math.max(minimum, Math.min(maximum, candidate));
  return integer ? Math.round(clamped) : clamped;
}

export const DESIGNER_BALANCE = Object.freeze({
  playerBaseSpeed: numberSetting('playerBaseSpeed', 5, 1, 12),
  playerSpeedPerLevel: numberSetting('playerSpeedPerLevel', 0, 0, 0.5),
  playerTurnRate: numberSetting('playerTurnRate', 4.2, 0.5, 12),
  enemyBaseSpeed: numberSetting('enemyBaseSpeed', 4, 0.5, 12),
  enemySpeedPerMinute: numberSetting('enemySpeedPerMinute', 0.01, 0, 0.2),
  enemySpeedMaxMultiplier: numberSetting('enemySpeedMaxMultiplier', 1.12, 1, 3),
  enemyTurnRateMin: numberSetting('enemyTurnRateMin', 2.05, 0.1, 10),
  enemyTurnRateMax: numberSetting('enemyTurnRateMax', 2.75, 0.1, 12),
  enemyHealthGrowthIntervalSeconds: numberSetting('enemyHealthGrowthIntervalSeconds', 180, 15, 1_800),
  enemyThreatBudgetBase: numberSetting('enemyThreatBudgetBase', 1.5, 0.1, 50),
  enemyThreatBudgetPerMinute: numberSetting('enemyThreatBudgetPerMinute', 0.36, 0, 10),
  enemyThreatBudgetLateStartMinute: numberSetting('enemyThreatBudgetLateStartMinute', 5, 0, 60),
  enemyThreatBudgetLatePerMinute: numberSetting('enemyThreatBudgetLatePerMinute', 0.14, 0, 10),
  enemyMaxSpawnsPerPlayerPerWave: numberSetting('enemyMaxSpawnsPerPlayerPerWave', 6, 1, 30, true),
  enemyConcurrentCapPerPlayer: numberSetting('enemyConcurrentCapPerPlayer', 18, 1, 100, true),
  enemySurgeEveryWaves: numberSetting('enemySurgeEveryWaves', 5, 0, 50, true),
  enemySurgeBudgetMultiplier: numberSetting('enemySurgeBudgetMultiplier', 1.55, 1, 5),
  enemySurgeRecoveryIntervalMultiplier: numberSetting('enemySurgeRecoveryIntervalMultiplier', 1.4, 1, 5),
  enemyThinkIntervalMin: numberSetting('enemyThinkIntervalMin', 0.22, 0.05, 5),
  enemyThinkIntervalMax: numberSetting('enemyThinkIntervalMax', 0.55, 0.05, 5),
  enemyFoodSearchLimit: numberSetting('enemyFoodSearchLimit', 8, 1, 32, true),
  enemyScoutUnlockSeconds: numberSetting('enemyScoutUnlockSeconds', 0, 0, 3_600),
  enemyScoutSpawnWeight: numberSetting('enemyScoutSpawnWeight', 5, 0, 20),
  enemyScoutThreatCost: numberSetting('enemyScoutThreatCost', 1, 0.1, 20),
  enemyScoutHealthMin: numberSetting('enemyScoutHealthMin', 1, 1, 30, true),
  enemyScoutHealthMax: numberSetting('enemyScoutHealthMax', 2, 1, 30, true),
  enemyScoutHealthGrowthMax: numberSetting('enemyScoutHealthGrowthMax', 0, 0, 20, true),
  enemyScoutSpeedMultiplier: numberSetting('enemyScoutSpeedMultiplier', 1.08, 0.1, 3),
  enemyScoutTurnMultiplier: numberSetting('enemyScoutTurnMultiplier', 1.15, 0.1, 3),
  enemyScoutFoodInterest: numberSetting('enemyScoutFoodInterest', 0.3, 0, 1),
  enemyForagerUnlockSeconds: numberSetting('enemyForagerUnlockSeconds', 0, 0, 3_600),
  enemyForagerSpawnWeight: numberSetting('enemyForagerSpawnWeight', 4, 0, 20),
  enemyForagerThreatCost: numberSetting('enemyForagerThreatCost', 1.3, 0.1, 20),
  enemyForagerHealthMin: numberSetting('enemyForagerHealthMin', 2, 1, 30, true),
  enemyForagerHealthMax: numberSetting('enemyForagerHealthMax', 3, 1, 30, true),
  enemyForagerHealthGrowthMax: numberSetting('enemyForagerHealthGrowthMax', 0, 0, 20, true),
  enemyForagerSpeedMultiplier: numberSetting('enemyForagerSpeedMultiplier', 0.92, 0.1, 3),
  enemyForagerTurnMultiplier: numberSetting('enemyForagerTurnMultiplier', 1, 0.1, 3),
  enemyCourierUnlockSeconds: numberSetting('enemyCourierUnlockSeconds', 120, 0, 3_600),
  enemyCourierSpawnWeight: numberSetting('enemyCourierSpawnWeight', 2, 0, 20),
  enemyCourierThreatCost: numberSetting('enemyCourierThreatCost', 1.7, 0.1, 20),
  enemyCourierHealthMin: numberSetting('enemyCourierHealthMin', 2, 1, 30, true),
  enemyCourierHealthMax: numberSetting('enemyCourierHealthMax', 3, 1, 30, true),
  enemyCourierHealthGrowthMax: numberSetting('enemyCourierHealthGrowthMax', 1, 0, 20, true),
  enemyCourierSpeedMultiplier: numberSetting('enemyCourierSpeedMultiplier', 1.12, 0.1, 3),
  enemyCourierTurnMultiplier: numberSetting('enemyCourierTurnMultiplier', 1.08, 0.1, 3),
  enemyCourierCarryThreshold: numberSetting('enemyCourierCarryThreshold', 3, 1, 100, true),
  enemyCourierFleeStrength: numberSetting('enemyCourierFleeStrength', 0.9, 0, 1),
  enemyCourierFoodClusterRadius: numberSetting('enemyCourierFoodClusterRadius', 2.5, 0.5, 10),
  enemyChargerUnlockSeconds: numberSetting('enemyChargerUnlockSeconds', 90, 0, 3_600),
  enemyChargerSpawnWeight: numberSetting('enemyChargerSpawnWeight', 1.8, 0, 20),
  enemyChargerThreatCost: numberSetting('enemyChargerThreatCost', 1.6, 0.1, 20),
  enemyChargerHealthMin: numberSetting('enemyChargerHealthMin', 2, 1, 30, true),
  enemyChargerHealthMax: numberSetting('enemyChargerHealthMax', 3, 1, 30, true),
  enemyChargerHealthGrowthMax: numberSetting('enemyChargerHealthGrowthMax', 1, 0, 20, true),
  enemyChargerSpeedMultiplier: numberSetting('enemyChargerSpeedMultiplier', 0.78, 0.1, 3),
  enemyChargerTurnMultiplier: numberSetting('enemyChargerTurnMultiplier', 0.72, 0.1, 3),
  enemyChargerCooldown: numberSetting('enemyChargerCooldown', 2.8, 0.1, 20),
  enemyChargerDetectionRange: numberSetting('enemyChargerDetectionRange', 9, 1, 30),
  enemyChargerTelegraphDuration: numberSetting('enemyChargerTelegraphDuration', 0.7, 0.1, 5),
  enemyChargerChargeDuration: numberSetting('enemyChargerChargeDuration', 1.1, 0.1, 5),
  enemyChargerChargeSpeedMultiplier: numberSetting('enemyChargerChargeSpeedMultiplier', 1.85, 1, 5),
  enemyCutterUnlockSeconds: numberSetting('enemyCutterUnlockSeconds', 180, 0, 3_600),
  enemyCutterSpawnWeight: numberSetting('enemyCutterSpawnWeight', 1.4, 0, 20),
  enemyCutterThreatCost: numberSetting('enemyCutterThreatCost', 2.4, 0.1, 20),
  enemyCutterHealthMin: numberSetting('enemyCutterHealthMin', 4, 1, 30, true),
  enemyCutterHealthMax: numberSetting('enemyCutterHealthMax', 5, 1, 30, true),
  enemyCutterHealthGrowthMax: numberSetting('enemyCutterHealthGrowthMax', 1, 0, 20, true),
  enemyCutterSpeedMultiplier: numberSetting('enemyCutterSpeedMultiplier', 1, 0.1, 3),
  enemyCutterTurnMultiplier: numberSetting('enemyCutterTurnMultiplier', 0.72, 0.1, 3),
  enemyCutterLeadDistance: numberSetting('enemyCutterLeadDistance', 3.2, 0.5, 12),
  enemyCutterLateralDistance: numberSetting('enemyCutterLateralDistance', 2.4, 0.5, 12),
  enemyCoilerUnlockSeconds: numberSetting('enemyCoilerUnlockSeconds', 300, 0, 3_600),
  enemyCoilerSpawnWeight: numberSetting('enemyCoilerSpawnWeight', 1.05, 0, 20),
  enemyCoilerThreatCost: numberSetting('enemyCoilerThreatCost', 2.8, 0.1, 20),
  enemyCoilerHealthMin: numberSetting('enemyCoilerHealthMin', 4, 1, 30, true),
  enemyCoilerHealthMax: numberSetting('enemyCoilerHealthMax', 6, 1, 30, true),
  enemyCoilerHealthGrowthMax: numberSetting('enemyCoilerHealthGrowthMax', 1, 0, 20, true),
  enemyCoilerSpeedMultiplier: numberSetting('enemyCoilerSpeedMultiplier', 0.78, 0.1, 3),
  enemyCoilerTurnMultiplier: numberSetting('enemyCoilerTurnMultiplier', 1.18, 0.1, 3),
  enemyCoilerOrbitRadius: numberSetting('enemyCoilerOrbitRadius', 2.7, 0.5, 10),
  enemyCoilerRadialCorrection: numberSetting('enemyCoilerRadialCorrection', 0.9, 0, 2),
  enemyWardenUnlockSeconds: numberSetting('enemyWardenUnlockSeconds', 420, 0, 3_600),
  enemyWardenSpawnWeight: numberSetting('enemyWardenSpawnWeight', 0.45, 0, 20),
  enemyWardenThreatCost: numberSetting('enemyWardenThreatCost', 4.2, 0.1, 20),
  enemyWardenHealthMin: numberSetting('enemyWardenHealthMin', 7, 1, 30, true),
  enemyWardenHealthMax: numberSetting('enemyWardenHealthMax', 8, 1, 30, true),
  enemyWardenHealthGrowthMax: numberSetting('enemyWardenHealthGrowthMax', 2, 0, 20, true),
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
