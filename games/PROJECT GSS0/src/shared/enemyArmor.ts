import '../../enemy-armor.js';

export interface EnemyArmorJoint {
  health: number;
  maxHealth: number;
}

export interface EnemyArmorTuning {
  headCoreRadius: number;
  bodyCoreRadius: number;
  layerThickness: number;
  baseSpacing: number;
  spacingScale: number;
  spacingResponse: number;
}

export interface EnemyArmorLayer {
  index: number;
  kind: 'core' | 'armor';
  capacity: number;
  health: number;
  fill: number;
  remainder: boolean;
}

export interface EnemyArmorPlate {
  index: number;
  capacity: number;
  health: number;
  fill: number;
}

export interface EnemyArmorDamageTransition {
  index: number;
  capacity: number;
  before: number;
  after: number;
  destroyed: boolean;
}

interface EnemyArmorApi {
  activeLayerCount(currentHealth: number, maxHealth: number): number;
  damageTransitions(maxHealth: number, beforeHealth: number, afterHealth: number): EnemyArmorDamageTransition[];
  layers(maxHealth: number, currentHealth?: number): EnemyArmorLayer[];
  normalizeTuning(tuning?: Partial<EnemyArmorTuning>): EnemyArmorTuning;
  plates(capacity: number, health: number, maxPlates?: number): EnemyArmorPlate[];
  radius(currentHealth: number, maxHealth: number, isHead: boolean, tuning: EnemyArmorTuning): number;
  radiusForLayer(layerIndex: number, isHead: boolean, tuning: EnemyArmorTuning): number;
  smoothSpacing(currentSpacing: number, targetSpacing: number, deltaSeconds: number, response: number): number;
  spacing(previousJoint: EnemyArmorJoint, previousIsHead: boolean, joint: EnemyArmorJoint, tuning: EnemyArmorTuning): number;
}

const api = (globalThis as typeof globalThis & { GSS0EnemyArmor?: EnemyArmorApi }).GSS0EnemyArmor;
if (!api) throw new Error('PROJECT GSS0 敌人指数装甲运行时未加载');

export const ENEMY_ARMOR = api;
