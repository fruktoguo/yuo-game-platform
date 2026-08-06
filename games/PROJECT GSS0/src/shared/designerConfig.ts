import '../../designer-config.js';

export type ModuleDesignState = 'normal' | 'tune' | 'rework' | 'disabled';

interface DesignerConfigSource {
  schemaVersion?: unknown;
  balance?: Record<string, unknown>;
  waveSpawnSchedule?: unknown;
  moduleCooldownPercentages?: Record<string, unknown>;
  moduleNames?: Record<string, unknown>;
  moduleInitialUpgrades?: Record<string, unknown>;
  moduleStates?: Record<string, unknown>;
}

const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG?: DesignerConfigSource }).GSS0_DESIGNER_CONFIG;
if (source?.schemaVersion !== 52) throw new Error('PROJECT GSS0 设计配置版本无效，需要 schemaVersion 52');

function numberSetting(key: string, fallback: number, minimum: number, maximum: number, integer = false): number {
  const candidate = source?.balance?.[key];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return fallback;
  const clamped = Math.max(minimum, Math.min(maximum, candidate));
  return integer ? Math.round(clamped) : clamped;
}

export interface WaveSpawnTier {
  startWave: number;
  foodCount: number;
  enemyCount: number;
}

function waveSpawnScheduleSetting(): readonly WaveSpawnTier[] {
  if (!Array.isArray(source?.waveSpawnSchedule) || source.waveSpawnSchedule.length === 0) {
    throw new Error('PROJECT GSS0 缺少波次投放计划');
  }
  const schedule = source.waveSpawnSchedule.map((entry, index) => {
    const candidate = entry as { startWave?: unknown; foodCount?: unknown; enemyCount?: unknown };
    const startWave = Math.max(1, Math.round(Number(candidate?.startWave)));
    const foodCount = Math.max(0, Math.round(Number(candidate?.foodCount)));
    const enemyCount = Math.max(1, Math.round(Number(candidate?.enemyCount)));
    if (!Number.isFinite(startWave) || !Number.isFinite(foodCount) || !Number.isFinite(enemyCount)) throw new Error(`PROJECT GSS0 第 ${index + 1} 段波次计划无效`);
    return Object.freeze({ startWave, foodCount, enemyCount });
  });
  if (schedule[0].startWave !== 1) throw new Error('PROJECT GSS0 波次投放计划必须从第 1 波开始');
  for (let index = 1; index < schedule.length; index += 1) {
    if (schedule[index].startWave <= schedule[index - 1].startWave) throw new Error('PROJECT GSS0 波次投放计划必须严格递增');
  }
  return Object.freeze(schedule);
}

export const DESIGNER_WAVE_SPAWN_SCHEDULE = waveSpawnScheduleSetting();

export const DESIGNER_BALANCE = Object.freeze({
  playerBaseSpeed: numberSetting('playerBaseSpeed', 5, 1, 12),
  snakeBodySizeScale: numberSetting('snakeBodySizeScale', 0.775, 0.25, 2),
  snakeSegmentSpacing: numberSetting('snakeSegmentSpacing', 0.45, 0.1, 1.5),
  enemyArmorHeadCoreRadiusCells: numberSetting('enemyArmorHeadCoreRadiusCells', 0.53, 0.1, 1.5),
  enemyArmorBodyCoreRadiusCells: numberSetting('enemyArmorBodyCoreRadiusCells', 0.265, 0.05, 1),
  enemyArmorLayerThicknessCells: numberSetting('enemyArmorLayerThicknessCells', 0.055, 0.005, 0.25),
  enemyArmorMaxPlatesPerLayer: numberSetting('enemyArmorMaxPlatesPerLayer', 8, 1, 32, true),
  enemyArmorSpacingScale: numberSetting('enemyArmorSpacingScale', 1, 0, 3),
  enemyArmorSpacingResponse: numberSetting('enemyArmorSpacingResponse', 12, 0.1, 60),
  enemyArmorBreakCascadeInterval: numberSetting('enemyArmorBreakCascadeInterval', 0.055, 0, 0.3),
  playerMaxHealth: numberSetting('playerMaxHealth', 30, 0, 100),
  playerHealthRegenPerSecond: numberSetting('playerHealthRegenPerSecond', 1, 0, 1),
  playerEnemyBodyCollisionDamage: numberSetting('playerEnemyBodyCollisionDamage', 10, 0, 10_000),
  playerWallCollisionDamage: numberSetting('playerWallCollisionDamage', 10, 0, 10_000),
  playerOtherBodyCollisionDamage: numberSetting('playerOtherBodyCollisionDamage', 10, 0, 10_000),
  playerKnockbackRearBlockedAngleDegrees: numberSetting('playerKnockbackRearBlockedAngleDegrees', 60, 0, 180),
  playerKnockbackRearCorrectionAngleDegrees: numberSetting('playerKnockbackRearCorrectionAngleDegrees', 150, 90, 180),
  playerEnergyMaximum: numberSetting('playerEnergyMaximum', 100, 0, 10_000),
  playerEnergyRecoveryPerSecond: numberSetting('playerEnergyRecoveryPerSecond', 10, 0, 10_000),
  playerDashEnergyCostPerSecond: numberSetting('playerDashEnergyCostPerSecond', 30, 0, 10_000),
  playerDashMinimumDuration: numberSetting('playerDashMinimumDuration', 1, 0, 60),
  playerDashStartEnergy: numberSetting('playerDashStartEnergy', 30, 0, 10_000),
  playerDashSpeedMultiplier: numberSetting('playerDashSpeedMultiplier', 2, 0, 20),
  playerDashCollisionDamage: numberSetting('playerDashCollisionDamage', 2, 0, 1_000, true),
  playerBodyInterceptDamage: numberSetting('playerBodyInterceptDamage', 1, 0, 1_000, true),
  enemyCollisionDamage: numberSetting('enemyCollisionDamage', 1, 0, 1_000, true),
  xpRequirementPerTargetLevel: numberSetting('xpRequirementPerTargetLevel', 5, 1, 1_000, true),
  maxModuleLevel: numberSetting('maxModuleLevel', 5, 1, 20, true),
  initialModuleSlots: numberSetting('initialModuleSlots', 5, 1, 20, true),
  moduleSlotUnlockLevel1: numberSetting('moduleSlotUnlockLevel1', 8, 1, 100, true),
  moduleSlotUnlockLevel2: numberSetting('moduleSlotUnlockLevel2', 12, 1, 100, true),
  moduleSlotUnlockLevel3: numberSetting('moduleSlotUnlockLevel3', 18, 1, 100, true),
  moduleSlotUnlockLevel4: numberSetting('moduleSlotUnlockLevel4', 25, 1, 100, true),
  moduleSlotGrowthIntervalAfterFullUnlock: numberSetting('moduleSlotGrowthIntervalAfterFullUnlock', 10, 1, 100, true),
  playerTurnRate: numberSetting('playerTurnRate', 4.2, 0.5, 12),
  automaticHeadHuntRange: numberSetting('automaticHeadHuntRange', 8, 0, 30),
  automaticHeadApproachHalfAngleDegrees: numberSetting('automaticHeadApproachHalfAngleDegrees', 120, 0, 180),
  automaticHeadLeadDistanceSegments: numberSetting('automaticHeadLeadDistanceSegments', 1.5, 0, 10),
  automaticSharpTurnThresholdDegrees: numberSetting('automaticSharpTurnThresholdDegrees', 70, 0, 180),
  automaticSelfAvoidanceStrength: numberSetting('automaticSelfAvoidanceStrength', 3.2, 0, 20),
  automaticSelfAvoidanceRange: numberSetting('automaticSelfAvoidanceRange', 3.2, 0, 10),
  automaticTeammateAvoidanceStrength: numberSetting('automaticTeammateAvoidanceStrength', 3.4, 0, 20),
  automaticTeammateAvoidanceRange: numberSetting('automaticTeammateAvoidanceRange', 3.5, 0, 10),
  enemyBaseSpeed: numberSetting('enemyBaseSpeed', 4, 0.5, 12),
  enemySpeedPerWave: numberSetting('enemySpeedPerWave', 0.01, 0, 0.1),
  enemySpeedMaxMultiplier: numberSetting('enemySpeedMaxMultiplier', 1.12, 1, 3),
  enemyTurnRate: numberSetting('enemyTurnRate', 2.4, 0.1, 12),
  enemyPressureWaveInterval: numberSetting('enemyPressureWaveInterval', 5, 0, 50, true),
  enemyPressureThreatMultiplier: numberSetting('enemyPressureThreatMultiplier', 2, 1, 10),
  enemyExpectedDpsInterval: numberSetting('enemyExpectedDpsInterval', 6, 0.1, 60),
  enemyThreatLevelOffset: numberSetting('enemyThreatLevelOffset', 3, 0, 100),
  enemyThreatTimeCoefficient: numberSetting('enemyThreatTimeCoefficient', 6, 0, 120),
  enemyThreatGrowthPerWave: numberSetting('enemyThreatGrowthPerWave', 0.02, 0, 1),
  enemyHealthWeightVariation: numberSetting('enemyHealthWeightVariation', 0.25, 0, 1),
  enemyThinkIntervalMin: numberSetting('enemyThinkIntervalMin', 0.22, 0.05, 5),
  enemyThinkIntervalMax: numberSetting('enemyThinkIntervalMax', 0.55, 0.05, 5),
  enemyFoodSearchLimit: numberSetting('enemyFoodSearchLimit', 8, 1, 32, true),
  enemyWallAvoidanceDistance: numberSetting('enemyWallAvoidanceDistance', 1.35, 0.5, 6),
  enemyBodyAvoidanceRange: numberSetting('enemyBodyAvoidanceRange', 3.2, 0.5, 10),
  enemySpawnSafetyDistance: numberSetting('enemySpawnSafetyDistance', 5, 0, 30),
  enemySpawnForwardPathHalfWidth: numberSetting('enemySpawnForwardPathHalfWidth', 1.5, 0, 10),
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
  enemyChargerUnlockSeconds: numberSetting('enemyChargerUnlockSeconds', 60, 0, 3_600),
  enemyChargerSpawnWeight: numberSetting('enemyChargerSpawnWeight', 3, 0, 20),
  enemyChargerHealthWeight: numberSetting('enemyChargerHealthWeight', 1, 0.01, 20),
  enemyChargerSpeedMultiplier: numberSetting('enemyChargerSpeedMultiplier', 1.5, 0.1, 3),
  enemyChargerTurnMultiplier: numberSetting('enemyChargerTurnMultiplier', 0.5, 0.1, 3),
  enemyChargerTrackingWobble: numberSetting('enemyChargerTrackingWobble', 0.16, 0, 0.6),
  enemyCutterUnlockSeconds: numberSetting('enemyCutterUnlockSeconds', 120, 0, 3_600),
  enemyCutterSpawnWeight: numberSetting('enemyCutterSpawnWeight', 1.5, 0, 20),
  enemyCutterHealthWeight: numberSetting('enemyCutterHealthWeight', 2, 0.01, 20),
  enemyCutterSpeedMultiplier: numberSetting('enemyCutterSpeedMultiplier', 1.8, 0.1, 3),
  enemyCutterTurnMultiplier: numberSetting('enemyCutterTurnMultiplier', 1.8, 0.1, 3),
  enemyCutterLeadDistance: numberSetting('enemyCutterLeadDistance', 3.2, 0.5, 12),
  enemyCutterLateralDistance: numberSetting('enemyCutterLateralDistance', 2.4, 0.5, 12),
  enemyCoilerUnlockSeconds: numberSetting('enemyCoilerUnlockSeconds', 180, 0, 3_600),
  enemyCoilerSpawnWeight: numberSetting('enemyCoilerSpawnWeight', 2, 0, 20),
  enemyCoilerHealthWeight: numberSetting('enemyCoilerHealthWeight', 2, 0.01, 20),
  enemyCoilerSpeedMultiplier: numberSetting('enemyCoilerSpeedMultiplier', 1.5, 0.1, 3),
  enemyCoilerTurnMultiplier: numberSetting('enemyCoilerTurnMultiplier', 2, 0.1, 3),
  enemyCoilerFoodRange: numberSetting('enemyCoilerFoodRange', 6, 0, 30),
  enemyWardenUnlockSeconds: numberSetting('enemyWardenUnlockSeconds', 240, 0, 3_600),
  enemyWardenSpawnWeight: numberSetting('enemyWardenSpawnWeight', 1, 0, 20),
  enemyWardenHealthWeight: numberSetting('enemyWardenHealthWeight', 8, 0.01, 20),
  enemyWardenSpeedMultiplier: numberSetting('enemyWardenSpeedMultiplier', 0.6, 0.1, 3),
  enemyWardenTurnMultiplier: numberSetting('enemyWardenTurnMultiplier', 0.9, 0.1, 3),
  enemyWardenFoodRange: numberSetting('enemyWardenFoodRange', 6, 0, 30),
  enemyWardenKnockbackMultiplier: numberSetting('enemyWardenKnockbackMultiplier', 2, 1, 4),
  waveInterval: numberSetting('waveInterval', 6, 0.5, 120),
  foodSpawnSafetyDistance: numberSetting('foodSpawnSafetyDistance', 0.8, 0, 5),
  spawnPlacementAttempts: numberSetting('spawnPlacementAttempts', 96, 1, 1_000, true),
  enemySpawnWarning: numberSetting('enemySpawnWarning', 1.5, 0, 10),
  enemySpawnActivationDuration: numberSetting('enemySpawnActivationDuration', 0.38, 0.05, 3),
  enemySpawnActivationParticleCount: numberSetting('enemySpawnActivationParticleCount', 5, 0, 30, true),
  enemySpawnActivationParticleSpeed: numberSetting('enemySpawnActivationParticleSpeed', 90, 0, 500),
  enemySpawnActivationRadiusCells: numberSetting('enemySpawnActivationRadiusCells', 0.52, 0, 3),
  projectileSpeedScale: numberSetting('projectileSpeedScale', 3, 0.1, 10),
  projectileSizeScale: numberSetting('projectileSizeScale', 2, 0.1, 10),
  frostSlowPerStack: numberSetting('frostSlowPerStack', 0.2, 0, 1),
  frostMinimumSpeedRatio: numberSetting('frostMinimumSpeedRatio', 0.1, 0, 1),
  burnTickInterval: numberSetting('burnTickInterval', 0.3, 0.05, 10),
  burnDamagePerTick: numberSetting('burnDamagePerTick', 1, 0, 1000, true),
  corrosionTickInterval: numberSetting('corrosionTickInterval', 3, 0.05, 30),
  corrosionDamagePerTick: numberSetting('corrosionDamagePerTick', 1, 0, 1000, true),
  burnHealthFraction: numberSetting('burnHealthFraction', 0.5, 0, 1),
  enemyStatusParticleDensity: numberSetting('enemyStatusParticleDensity', 3, 1, 8, true),
  enemyStatusParticleSizeScale: numberSetting('enemyStatusParticleSizeScale', 1.6, 0.5, 4),
  enemyStatusParticleGlowScale: numberSetting('enemyStatusParticleGlowScale', 1.8, 0.5, 4),
  activeSkillBaseCooldown: numberSetting('activeSkillBaseCooldown', 3, 0.05, 30),
  moduleAttackSizePerLevel: numberSetting('moduleAttackSizePerLevel', 0.1, 0, 1),
  moduleCorrosionFieldDurationPerLevel: numberSetting('moduleCorrosionFieldDurationPerLevel', 2, 0.1, 10),
  moduleCorrosionFieldMaxDuration: numberSetting('moduleCorrosionFieldMaxDuration', 10, 0.1, 10),
  moduleStatusStrikeStacksPerLevel: numberSetting('moduleStatusStrikeStacksPerLevel', 1, 0, 10, true),
  moduleStatusEffectBonusPerLevel: numberSetting('moduleStatusEffectBonusPerLevel', 0.1, 0, 2),
  moduleMineBlastRadiusCells: numberSetting('moduleMineBlastRadiusCells', 2, 0.1, 30),
  moduleMineKickDistanceCells: numberSetting('moduleMineKickDistanceCells', 1.25, 0.1, 10),
  moduleMineVisualRadiusPixels: numberSetting('moduleMineVisualRadiusPixels', 15, 1, 60),
  moduleCollisionDoubleChancePerLevel: numberSetting('moduleCollisionDoubleChancePerLevel', 0.2, 0, 1),
  moduleProjectileDoubleChancePerLevel: numberSetting('moduleProjectileDoubleChancePerLevel', 0.12, 0, 1),
  moduleProjectileBouncesPerLevel: numberSetting('moduleProjectileBouncesPerLevel', 1, 0, 20, true),
  moduleIncendiaryProjectileSpeed: numberSetting('moduleIncendiaryProjectileSpeed', 230, 1, 1_000),
  moduleIncendiaryProjectileSize: numberSetting('moduleIncendiaryProjectileSize', 7, 1, 30),
  moduleIncendiaryHoming: numberSetting('moduleIncendiaryHoming', 5, 0, 20),
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
  moduleLinkageSpacingPerLevel: numberSetting('moduleLinkageSpacingPerLevel', 0.2, 0, 5),
  moduleCacheKillsPerTrigger: numberSetting('moduleCacheKillsPerTrigger', 5, 1, 100, true),
  moduleThornsProjectileCount: numberSetting('moduleThornsProjectileCount', 6, 1, 100, true),
  moduleEchoProjectilesPerLevel: numberSetting('moduleEchoProjectilesPerLevel', 2, 0, 100, true),
  moduleBarrageProjectileCount: numberSetting('moduleBarrageProjectileCount', 16, 1, 100, true),
  moduleBladeBaseSizePixels: numberSetting('moduleBladeBaseSizePixels', 10, 1, 100),
  moduleBladeOrbitRadiusCells: numberSetting('moduleBladeOrbitRadiusCells', 2, 0.5, 10),
  moduleBladeOrbitSpeed: numberSetting('moduleBladeOrbitSpeed', 0.6, 0, 20),
  moduleBladeOrbitConvergeSpeedCellsPerSecond: numberSetting('moduleBladeOrbitConvergeSpeedCellsPerSecond', 8, 0, 30),
  modulePulseRadiusCells: numberSetting('modulePulseRadiusCells', 6, 0.1, 30),
  moduleClusterBlastRadiusCells: numberSetting('moduleClusterBlastRadiusCells', 5, 0.1, 30),
  moduleShieldMaxCharges: numberSetting('moduleShieldMaxCharges', 5, 1, 20, true),
  moduleBonusXpChancePerLevel: numberSetting('moduleBonusXpChancePerLevel', 0.1, 0, 1),
  moduleHeadCollisionDamagePerLevel: numberSetting('moduleHeadCollisionDamagePerLevel', 2, 0, 100, true),
  moduleMaxHealthPerLevel: numberSetting('moduleMaxHealthPerLevel', 3, 0, 100),
  moduleHealthRegenPerLevel: numberSetting('moduleHealthRegenPerLevel', 0.5, 0, 20),
  moduleDamageReductionPerLevel: numberSetting('moduleDamageReductionPerLevel', 0.1, 0, 1),
  moduleFoodReplicationChancePerLevel: numberSetting('moduleFoodReplicationChancePerLevel', 0.06, 0, 1),
  moduleFoodHealPerLevel: numberSetting('moduleFoodHealPerLevel', 0.25, 0, 100),
  moduleLevelUpHealFractionPerLevel: numberSetting('moduleLevelUpHealFractionPerLevel', 0.1, 0, 1),
  moduleMissingHealthSpeedStep: numberSetting('moduleMissingHealthSpeedStep', 0.03, 0.01, 1),
  moduleMissingHealthSpeedPerStepPerLevel: numberSetting('moduleMissingHealthSpeedPerStepPerLevel', 0.01, 0, 1),
  moduleMissingHealthHeadDamageStep: numberSetting('moduleMissingHealthHeadDamageStep', 0.3, 0.01, 1),
  moduleMissingHealthHeadDamagePerStepPerLevel: numberSetting('moduleMissingHealthHeadDamagePerStepPerLevel', 1, 0, 100, true),
  moduleHealingReceivedPerLevel: numberSetting('moduleHealingReceivedPerLevel', 0.1, 0, 5),
  moduleEnemyWallDamagePerLevel: numberSetting('moduleEnemyWallDamagePerLevel', 0.5, 0, 10),
  moduleEnemyWallKnockbackPerLevel: numberSetting('moduleEnemyWallKnockbackPerLevel', 0.5, 0, 10),
  moduleTailGuardSegmentsPerLevel: numberSetting('moduleTailGuardSegmentsPerLevel', 2, 0, 20, true),
  moduleDeathBurstProjectilesPerLevel: numberSetting('moduleDeathBurstProjectilesPerLevel', 3, 0, 20, true),
  moduleCrisisHealthThreshold: numberSetting('moduleCrisisHealthThreshold', 0.5, 0, 1),
  moduleCrisisRegenPerLevel: numberSetting('moduleCrisisRegenPerLevel', 1, 0, 20),
  arenaBaseArea: numberSetting('arenaBaseArea', 452.4, 64, 4_096),
  arenaAreaPerLevel: numberSetting('arenaAreaPerLevel', 0.03, 0, 0.5),
  arenaResizeRate: numberSetting('arenaResizeRate', 2.4, 0.1, 10),
  cameraFollowZoomMin: numberSetting('cameraFollowZoomMin', 0.75, 0.25, 5),
  cameraFollowZoomDefault: numberSetting('cameraFollowZoomDefault', 1.25, 0.25, 5),
  cameraFollowZoomMax: numberSetting('cameraFollowZoomMax', 2.5, 0.25, 5),
  cameraPseudo3DStrengthMax: numberSetting('cameraPseudo3DStrengthMax', 1.5, 0.25, 1.5),
  cameraPseudo3DPitchForeshortening: numberSetting('cameraPseudo3DPitchForeshortening', 0.075, 0, 0.24),
  cameraPseudo3DYawShear: numberSetting('cameraPseudo3DYawShear', 0.018, 0, 0.08),
  cameraPseudo3DRollDegrees: numberSetting('cameraPseudo3DRollDegrees', 0.65, 0, 2),
  cameraPseudo3DVerticalAimInfluence: numberSetting('cameraPseudo3DVerticalAimInfluence', 0.16, 0, 0.5),
  cameraPseudo3DResponse: numberSetting('cameraPseudo3DResponse', 4.5, 0.1, 30),
  arenaPlatformDepthPixels: numberSetting('arenaPlatformDepthPixels', 16, 0, 40),
  arenaPlatformSideOpacity: numberSetting('arenaPlatformSideOpacity', 0.9, 0, 1),
  cameraFollowRenderOverscanPixels: numberSetting('cameraFollowRenderOverscanPixels', 120, 0, 600, true),
  cameraFollowFoodIndicatorLimit: numberSetting('cameraFollowFoodIndicatorLimit', 6, 0, 100, true),
  cameraFollowEnemyIndicatorLimit: numberSetting('cameraFollowEnemyIndicatorLimit', 8, 0, 100, true),
  entityShadowOpacity: numberSetting('entityShadowOpacity', 0.58, 0, 1),
  entityShadowOffsetPixels: numberSetting('entityShadowOffsetPixels', 14, 0, 40),
  entityShadowDirectionDegrees: numberSetting('entityShadowDirectionDegrees', 56, -180, 180),
  entityShadowWidthScale: numberSetting('entityShadowWidthScale', 1.04, 0.25, 4),
  entityShadowHeightScale: numberSetting('entityShadowHeightScale', 0.94, 0.1, 2),
  entityShadowHeightStretch: numberSetting('entityShadowHeightStretch', 0.08, 0, 1.5),
  entityShadowBlurPixels: numberSetting('entityShadowBlurPixels', 4, 0, 24),
  entityContactShadowOpacity: numberSetting('entityContactShadowOpacity', 0.34, 0, 1),
  entityContactShadowScale: numberSetting('entityContactShadowScale', 0.82, 0.1, 1.5),
  foodShadowHeight: numberSetting('foodShadowHeight', 1.2, 0, 4),
  projectileShadowHeight: numberSetting('projectileShadowHeight', 1.9, 0, 6),
  upgradeInvulnerabilityDuration: numberSetting('upgradeInvulnerabilityDuration', 0.5, 0, 10),
  respawnLocatorConvergeDuration: numberSetting('respawnLocatorConvergeDuration', 1, 0.1, 10),
  respawnLocatorFadeDuration: numberSetting('respawnLocatorFadeDuration', 3, 0.1, 20),
  multiplayerGhostSpeed: numberSetting('multiplayerGhostSpeed', 0.6, 0.05, 3),
  multiplayerGhostPleaInterval: numberSetting('multiplayerGhostPleaInterval', 0.65, 0.1, 5),
  multiplayerGhostPleaDuration: numberSetting('multiplayerGhostPleaDuration', 0.9, 0.1, 3),
  multiplayerGhostOpacity: numberSetting('multiplayerGhostOpacity', 0.36, 0.05, 0.9),
  multiplayerGhostPulseStrength: numberSetting('multiplayerGhostPulseStrength', 0.12, 0, 0.4),
  multiplayerGhostPulseRate: numberSetting('multiplayerGhostPulseRate', 1.1, 0.1, 5),
  multiplayerReviveContactRange: numberSetting('multiplayerReviveContactRange', 0.46, 0.1, 1.5),
  multiplayerReviveHealth: numberSetting('multiplayerReviveHealth', 1, 0.1, 100),
  multiplayerReviveInvulnerabilityDuration: numberSetting('multiplayerReviveInvulnerabilityDuration', 2, 0, 10),
  playerDamageEffectDuration: numberSetting('playerDamageEffectDuration', 0.65, 0.1, 5),
  playerDamageFlashStrength: numberSetting('playerDamageFlashStrength', 0.55, 0, 2),
  playerDamageShakeStrength: numberSetting('playerDamageShakeStrength', 9, 0, 30),
  playerDamageParticleCount: numberSetting('playerDamageParticleCount', 26, 0, 200, true),
  playerDamageParticleSpeed: numberSetting('playerDamageParticleSpeed', 190, 0, 1_000),
  enemyDamageNumberDuration: numberSetting('enemyDamageNumberDuration', 0.82, 0.1, 3),
  combatTextFontSize: numberSetting('combatTextFontSize', 38, 8, 96, true),
  foodBirthDuration: numberSetting('foodBirthDuration', 0.36, 0.05, 2),
  maxRenderFps: numberSetting('maxRenderFps', 240, 30, 240, true),
  maxRenderDpr: numberSetting('maxRenderDpr', 2, 1, 2),
  hudUpdateHz: numberSetting('hudUpdateHz', 15, 1, 60, true),
  networkPlayerStateHz: numberSetting('networkPlayerStateHz', 20, 5, 60, true),
  networkManualPredictionMs: numberSetting('networkManualPredictionMs', 400, 50, 1_000, true),
  networkRemoteCorrectionThresholdCells: numberSetting('networkRemoteCorrectionThresholdCells', 0.75, 0.1, 10),
  networkRemoteCorrectionSpeedCellsPerSecond: numberSetting('networkRemoteCorrectionSpeedCellsPerSecond', 18, 1, 100),
  networkRemoteCorrectionMinMs: numberSetting('networkRemoteCorrectionMinMs', 120, 0, 1_000, true),
  networkRemoteCorrectionMaxMs: numberSetting('networkRemoteCorrectionMaxMs', 450, 50, 2_000, true),
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
  profileSaveDelaySeconds: numberSetting('profileSaveDelaySeconds', 30, 1, 300),
});

export function moduleCooldownPercent(moduleId: string): number {
  const candidate = source?.moduleCooldownPercentages?.[moduleId];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
    throw new Error(`PROJECT GSS0 机体 ${moduleId} 缺少冷却百分比`);
  }
  return Math.max(0, Math.min(2_000, candidate));
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
