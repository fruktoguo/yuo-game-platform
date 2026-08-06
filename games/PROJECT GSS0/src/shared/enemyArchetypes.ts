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
  definition('liner', {
    unlockSeconds: DESIGNER_BALANCE.enemyLinerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyLinerSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyLinerHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyLinerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyLinerTurnMultiplier,
  }),
  definition('skitter', {
    unlockSeconds: DESIGNER_BALANCE.enemySkitterUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemySkitterSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemySkitterHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemySkitterSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemySkitterTurnMultiplier,
  }),
  definition('headhunter', {
    unlockSeconds: DESIGNER_BALANCE.enemyHeadHunterUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyHeadHunterSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyHeadHunterHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyHeadHunterSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyHeadHunterTurnMultiplier,
  }),
  definition('engineer', {
    unlockSeconds: DESIGNER_BALANCE.enemyEngineerUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyEngineerSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyEngineerHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyEngineerSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyEngineerTurnMultiplier,
  }),
  definition('bombardier', {
    unlockSeconds: DESIGNER_BALANCE.enemyBombardierUnlockSeconds,
    spawnWeight: DESIGNER_BALANCE.enemyBombardierSpawnWeight,
    healthWeight: DESIGNER_BALANCE.enemyBombardierHealthWeight,
    speedMultiplier: DESIGNER_BALANCE.enemyBombardierSpeedMultiplier,
    turnMultiplier: DESIGNER_BALANCE.enemyBombardierTurnMultiplier,
  }),
]);

if (ENEMY_ARCHETYPES.length !== ENEMY_ARCHETYPE_IDS.length) {
  throw new Error('PROJECT GSS0 敌人类型配置不完整');
}
