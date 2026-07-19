import '../../designer-config.js';

export type ModuleDesignState = 'normal' | 'tune' | 'rework' | 'disabled';

interface DesignerConfigSource {
  schemaVersion?: unknown;
  balance?: Record<string, unknown>;
  moduleStates?: Record<string, unknown>;
}

const source = (globalThis as typeof globalThis & { GSS0_DESIGNER_CONFIG?: DesignerConfigSource }).GSS0_DESIGNER_CONFIG;

function numberSetting(key: string, fallback: number, minimum: number, maximum: number, integer = false): number {
  const candidate = source?.balance?.[key];
  if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return fallback;
  const clamped = Math.max(minimum, Math.min(maximum, candidate));
  return integer ? Math.round(clamped) : clamped;
}

export const DESIGNER_BALANCE = Object.freeze({
  playerBaseSpeed: numberSetting('playerBaseSpeed', 5, 1, 12),
  playerTurnRate: numberSetting('playerTurnRate', 4.2, 0.5, 12),
  enemyBaseSpeed: numberSetting('enemyBaseSpeed', 4, 0.5, 12),
  enemyTurnRateMin: numberSetting('enemyTurnRateMin', 2.05, 0.1, 10),
  enemyTurnRateMax: numberSetting('enemyTurnRateMax', 2.75, 0.1, 12),
  enemyBaseHealth: numberSetting('enemyBaseHealth', 1, 1, 100, true),
  enemyHealthPerLevelMin: numberSetting('enemyHealthPerLevelMin', 1, 0, 20),
  enemyHealthPerLevelMax: numberSetting('enemyHealthPerLevelMax', 2, 0, 30),
  waveInterval: numberSetting('waveInterval', 6, 0.5, 120),
  foodsPerPlayerPerWave: numberSetting('foodsPerPlayerPerWave', 2, 0, 20, true),
  enemiesPerPlayerPerWave: numberSetting('enemiesPerPlayerPerWave', 1, 0, 12, true),
  enemySpawnWarning: numberSetting('enemySpawnWarning', 1.5, 0, 10),
  projectileSpeedScale: numberSetting('projectileSpeedScale', 3, 0.1, 10),
  headAttackInterval: numberSetting('headAttackInterval', 1.9, 0.05, 30),
  headTargetRange: numberSetting('headTargetRange', 560, 50, 2_000),
  moduleTargetRange: numberSetting('moduleTargetRange', 620, 50, 2_000),
});

export function moduleDesignState(moduleId: string): ModuleDesignState {
  const state = source?.moduleStates?.[moduleId];
  return state === 'tune' || state === 'rework' || state === 'disabled' ? state : 'normal';
}

export function moduleIsUpgradeEnabled(moduleId: string): boolean {
  return moduleDesignState(moduleId) !== 'disabled';
}
