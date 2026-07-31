import '../../wave-director.js';
import {
  ENEMY_EXPECTED_DPS_INTERVAL,
  ENEMY_HEALTH_WEIGHT_VARIATION,
  ENEMY_PRESSURE_COUNT_MULTIPLIER,
  ENEMY_PRESSURE_THREAT_MULTIPLIER,
  ENEMY_PRESSURE_WAVE_INTERVAL,
  ENEMY_SPEED_GROWTH_PER_WAVE,
  ENEMY_SPEED_MAX_MULTIPLIER,
  ENEMY_THREAT_GROWTH_PER_WAVE,
  ENEMY_THREAT_TIME_COEFFICIENT,
  FOODS_PER_PLAYER_PER_WAVE,
  XP_REQUIREMENT_BASE,
  XP_REQUIREMENT_PER_LEVEL,
} from './constants';
import { DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE } from './designerConfig';

export interface EnemyWavePlan {
  wave: number;
  pressure: boolean;
  baseEnemyCount: number;
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
  readonly schedule: readonly { startWave: number; enemyCount: number }[];
  baseEnemyCount(waveNumber: number): number;
  isPressureWave(waveNumber: number): boolean;
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
  schedule: DESIGNER_WAVE_ENEMY_COUNT_SCHEDULE,
  pressureWaveInterval: ENEMY_PRESSURE_WAVE_INTERVAL,
  pressureEnemyCountMultiplier: ENEMY_PRESSURE_COUNT_MULTIPLIER,
  pressureThreatMultiplier: ENEMY_PRESSURE_THREAT_MULTIPLIER,
  expectedDpsInterval: ENEMY_EXPECTED_DPS_INTERVAL,
  threatTimeCoefficient: ENEMY_THREAT_TIME_COEFFICIENT,
  threatGrowthPerWave: ENEMY_THREAT_GROWTH_PER_WAVE,
  speedGrowthPerWave: ENEMY_SPEED_GROWTH_PER_WAVE,
  speedMaxMultiplier: ENEMY_SPEED_MAX_MULTIPLIER,
  foodExperiencePerWave: FOODS_PER_PLAYER_PER_WAVE,
  xpRequirementBase: XP_REQUIREMENT_BASE,
  xpRequirementPerLevel: XP_REQUIREMENT_PER_LEVEL,
  healthWeightVariation: ENEMY_HEALTH_WEIGHT_VARIATION,
});
