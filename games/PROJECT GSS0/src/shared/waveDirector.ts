import '../../wave-director.js';
import {
  ENEMY_EXPECTED_DPS_INTERVAL,
  ENEMY_HEALTH_WEIGHT_VARIATION,
  ENEMY_PRESSURE_THREAT_MULTIPLIER,
  ENEMY_PRESSURE_WAVE_INTERVAL,
  ENEMY_SPEED_GROWTH_PER_WAVE,
  ENEMY_SPEED_MAX_MULTIPLIER,
  ENEMY_THREAT_GROWTH_PER_WAVE,
  ENEMY_THREAT_LEVEL_OFFSET,
  ENEMY_THREAT_TIME_COEFFICIENT,
  XP_REQUIREMENT_PER_TARGET_LEVEL,
} from './constants';
import { DESIGNER_WAVE_SPAWN_SCHEDULE } from './designerConfig';

export interface EnemyWavePlan {
  wave: number;
  pressure: boolean;
  foodCount: number;
  enemyCount: number;
  expectedExperience: number;
  expectedLevel: number;
  expectedDps: number;
  growthMultiplier: number;
  speedMultiplier: number;
  totalThreat: number;
}

export interface EnemyHealthAllocation {
  health: readonly number[];
  actualWeights: readonly number[];
  idealHealth: readonly number[];
  targetTotalHealth: number;
  actualTotalHealth: number;
  difference: number;
}

export interface EnemyWaveDirector {
  readonly schedule: readonly { startWave: number; foodCount: number; enemyCount: number }[];
  isPressureWave(waveNumber: number): boolean;
  foodCountForWave(waveNumber: number): number;
  enemyCountForWave(waveNumber: number): number;
  speedMultiplier(waveNumber: number): number;
  experienceFromWave(waveNumber: number): number;
  experienceBeforeWave(waveNumber: number): number;
  expectedLevelForExperience(experience: number): number;
  plan(waveNumber: number): EnemyWavePlan;
  allocateHealth(baseWeights: readonly number[], totalThreat: number, random?: () => number): EnemyHealthAllocation;
}

interface EnemyWaveDirectorApi {
  create(options: Record<string, unknown>): EnemyWaveDirector;
}

const api = (globalThis as typeof globalThis & { GSS0WaveDirector?: EnemyWaveDirectorApi }).GSS0WaveDirector;
if (!api) throw new Error('PROJECT GSS0 波次导演未加载');

export const enemyWaveDirector = api.create({
  schedule: DESIGNER_WAVE_SPAWN_SCHEDULE,
  pressureWaveInterval: ENEMY_PRESSURE_WAVE_INTERVAL,
  pressureThreatMultiplier: ENEMY_PRESSURE_THREAT_MULTIPLIER,
  expectedDpsInterval: ENEMY_EXPECTED_DPS_INTERVAL,
  threatLevelOffset: ENEMY_THREAT_LEVEL_OFFSET,
  threatTimeCoefficient: ENEMY_THREAT_TIME_COEFFICIENT,
  threatGrowthPerWave: ENEMY_THREAT_GROWTH_PER_WAVE,
  speedGrowthPerWave: ENEMY_SPEED_GROWTH_PER_WAVE,
  speedMaxMultiplier: ENEMY_SPEED_MAX_MULTIPLIER,
  xpRequirementPerTargetLevel: XP_REQUIREMENT_PER_TARGET_LEVEL,
  healthWeightVariation: ENEMY_HEALTH_WEIGHT_VARIATION,
});
