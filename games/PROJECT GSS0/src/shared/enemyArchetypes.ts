import { DESIGNER_BALANCE } from './designerConfig';
import { ENEMY_ARCHETYPE_IDS, type EnemyArchetypeId } from './protocol';

export interface EnemyArchetypeDefinition {
  id: EnemyArchetypeId;
  unlockSeconds: number;
  spawnWeight: number;
  healthWeight: number;
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
    healthWeight: DESIGNER_BALANCE.enemyScoutHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyScoutSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyScoutTurnMultiplier,
  }),
  definition('forager', {
    unlockSeconds: DESIGNER_BALANCE.enemyForagerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyForagerSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyForagerHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyForagerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyForagerTurnMultiplier,
  }),
  definition('courier', {
    unlockSeconds: DESIGNER_BALANCE.enemyCourierUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCourierSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyCourierHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyCourierSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCourierTurnMultiplier,
  }),
  definition('charger', {
    unlockSeconds: DESIGNER_BALANCE.enemyChargerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyChargerSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyChargerHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyChargerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyChargerTurnMultiplier,
  }),
  definition('cutter', {
    unlockSeconds: DESIGNER_BALANCE.enemyCutterUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCutterSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyCutterHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyCutterSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCutterTurnMultiplier,
  }),
  definition('coiler', {
    unlockSeconds: DESIGNER_BALANCE.enemyCoilerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyCoilerSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyCoilerHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyCoilerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyCoilerTurnMultiplier,
  }),
  definition('warden', {
    unlockSeconds: DESIGNER_BALANCE.enemyWardenUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyWardenSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyWardenHealthWeight,
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
