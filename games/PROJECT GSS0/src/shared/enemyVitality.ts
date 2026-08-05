import '../../enemy-vitality.js';

export interface EnemyJointVitality {
  health: number;
  maxHealth: number;
}

export interface EnemyVitalityAllocation {
  totalHealth: number;
  jointCount: number;
  joints: EnemyJointVitality[];
}

export interface EnemyVitalityDamageResult {
  before: number;
  after: number;
  applied: number;
  destroyed: boolean;
}

export interface EnemyVitalityTarget extends EnemyJointVitality {
  segments?: readonly EnemyJointVitality[];
}

interface EnemyVitalityApi {
  allocate(totalHealth: number, random?: () => number): EnemyVitalityAllocation;
  allocateForJointCount(totalHealth: number, jointCount: number, random?: () => number): EnemyVitalityAllocation;
  chooseJointCount(totalHealth: number, random?: () => number): number;
  currentTotal(enemy: EnemyVitalityTarget): number;
  damage(joint: EnemyJointVitality, amount: number): EnemyVitalityDamageResult;
  maximumTotal(enemy: EnemyVitalityTarget): number;
}

const api = (globalThis as typeof globalThis & { GSS0EnemyVitality?: EnemyVitalityApi }).GSS0EnemyVitality;
if (!api) throw new Error('PROJECT GSS0 敌人关节生命运行时未加载');

export const ENEMY_VITALITY = api;
