import { DESIGNER_BALANCE } from './designerConfig';
import { ENEMY_ARCHETYPE_IDS, type EnemyArchetypeId } from './protocol';

export interface EnemyArchetypeDefinition {
  id: EnemyArchetypeId;
  unlockSeconds: number;
  spawnWeight: number;
  threatCost: number;
  healthMin: number;
  healthMax: number;
  healthGrowthMax: number;
  speedMultiplier: number;
  turnMultiplier: number;
}

function definition(
  id: EnemyArchetypeId,
  values: Omit<EnemyArchetypeDefinition, 'id'>,
): EnemyArchetypeDefinition {
  return Object.freeze({ id, ...values });
}

export const ENEMY_ARCHETYPES: readonly EnemyArchetypeDefinition[] = Object.freeze([
  definition('scout', {
    unlockSeconds: DESIGNER_BALANCE.enemyScoutUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyScoutSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyScoutThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyScoutHealthMin, DESIGNER_BALANCE.enemyScoutHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyScoutHealthMin, DESIGNER_BALANCE.enemyScoutHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyScoutHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyScoutSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyScoutTurnMultiplier,
  }),
  definition('forager', {
    unlockSeconds: DESIGNER_BALANCE.enemyForagerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyForagerSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyForagerThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyForagerHealthMin, DESIGNER_BALANCE.enemyForagerHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyForagerHealthMin, DESIGNER_BALANCE.enemyForagerHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyForagerHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyForagerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyForagerTurnMultiplier,
  }),
  definition('courier', {
    unlockSeconds: DESIGNER_BALANCE.enemyCourierUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCourierSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyCourierThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyCourierHealthMin, DESIGNER_BALANCE.enemyCourierHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyCourierHealthMin, DESIGNER_BALANCE.enemyCourierHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyCourierHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyCourierSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCourierTurnMultiplier,
  }),
  definition('charger', {
    unlockSeconds: DESIGNER_BALANCE.enemyChargerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyChargerSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyChargerThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyChargerHealthMin, DESIGNER_BALANCE.enemyChargerHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyChargerHealthMin, DESIGNER_BALANCE.enemyChargerHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyChargerHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyChargerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyChargerTurnMultiplier,
  }),
  definition('cutter', {
    unlockSeconds: DESIGNER_BALANCE.enemyCutterUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCutterSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyCutterThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyCutterHealthMin, DESIGNER_BALANCE.enemyCutterHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyCutterHealthMin, DESIGNER_BALANCE.enemyCutterHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyCutterHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyCutterSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCutterTurnMultiplier,
  }),
  definition('coiler', {
    unlockSeconds: DESIGNER_BALANCE.enemyCoilerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCoilerSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyCoilerThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyCoilerHealthMin, DESIGNER_BALANCE.enemyCoilerHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyCoilerHealthMin, DESIGNER_BALANCE.enemyCoilerHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyCoilerHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyCoilerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCoilerTurnMultiplier,
  }),
  definition('warden', {
    unlockSeconds: DESIGNER_BALANCE.enemyWardenUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyWardenSpawnWeight,
    threatCost: DESIGNER_BALANCE.enemyWardenThreatCost,
    healthMin: Math.min(DESIGNER_BALANCE.enemyWardenHealthMin, DESIGNER_BALANCE.enemyWardenHealthMax),
    healthMax: Math.max(DESIGNER_BALANCE.enemyWardenHealthMin, DESIGNER_BALANCE.enemyWardenHealthMax),
    healthGrowthMax: DESIGNER_BALANCE.enemyWardenHealthGrowthMax,
    speedMultiplier: DESIGNER_BALANCE.enemyWardenSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyWardenTurnMultiplier,
  }),
]);

export const ENEMY_ARCHETYPE_BY_ID = Object.freeze(Object.fromEntries(
  ENEMY_ARCHETYPES.map((entry) => [entry.id, entry]),
) as Record<EnemyArchetypeId, EnemyArchetypeDefinition>);

if (ENEMY_ARCHETYPES.length !== ENEMY_ARCHETYPE_IDS.length) {
  throw new Error('PROJECT GSS0 敌人类型配置不完整');
}
