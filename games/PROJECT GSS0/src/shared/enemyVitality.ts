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

export interface EnemyTailDetachResult<TJoint extends EnemyJointVitality = EnemyJointVitality> {
  joint: TJoint;
  currentBefore: number;
  currentAfter: number;
  maximumBefore: number;
  maximumAfter: number;
  currentTransferred: number;
  maximumTransferred: number;
}

export interface EnemyVitalityTarget extends EnemyJointVitality {
  segments?: readonly EnemyJointVitality[];
}

interface EnemyVitalityApi {
  allocate(totalHealth: number, random?: () => number): EnemyVitalityAllocation;
  allocateForJointCount(totalHealth: number, jointCount: number, random?: () => number): EnemyVitalityAllocation;
  allocateWithMinimumJointCount(totalHealth: number, minimumJointCount: number, random?: () => number): EnemyVitalityAllocation;
  chooseJointCount(totalHealth: number, random?: () => number): number;
  chooseJointCountAtLeast(totalHealth: number, minimumJointCount: number, random?: () => number): number;
  currentTotal(enemy: EnemyVitalityTarget): number;
  damage(joint: EnemyJointVitality, amount: number): EnemyVitalityDamageResult;
  detachTail<TJoint extends EnemyJointVitality>(enemy: EnemyVitalityTarget & { segments: TJoint[] }): EnemyTailDetachResult<TJoint> | null;
  maximumTotal(enemy: EnemyVitalityTarget): number;
}

const api = (globalThis as typeof globalThis & { GSS0EnemyVitality?: EnemyVitalityApi }).GSS0EnemyVitality;
if (!api) throw new Error('PROJECT GSS0 敌人关节生命运行时未加载');

export const ENEMY_VITALITY = api;
