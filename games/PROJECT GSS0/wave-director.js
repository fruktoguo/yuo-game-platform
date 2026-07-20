(() => {
  "use strict";

  function finiteNumber(value, fallback, minimum = -Infinity, maximum = Infinity) {
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) return fallback;
    return Math.max(minimum, Math.min(maximum, candidate));
  }

  function positiveInteger(value, fallback, maximum = 100000) {
    return Math.round(finiteNumber(value, fallback, 1, maximum));
  }

  function normalizeSchedule(value) {
    const entries = Array.isArray(value) ? value : [];
    const normalized = entries
      .map((entry) => ({
        startWave: positiveInteger(entry?.startWave, 1),
        enemyCount: positiveInteger(entry?.enemyCount, 1, 100)
      }))
      .sort((left, right) => left.startWave - right.startWave);
    if (normalized.length === 0) normalized.push({ startWave: 1, enemyCount: 1 });
    if (normalized[0].startWave !== 1) normalized.unshift({ startWave: 1, enemyCount: normalized[0].enemyCount });
    return Object.freeze(normalized.filter((entry, index) => index === 0 || entry.startWave !== normalized[index - 1].startWave));
  }

  function create(options = {}) {
    const schedule = normalizeSchedule(options.schedule);
    const pressureWaveInterval = Math.round(finiteNumber(options.pressureWaveInterval, 5, 0, 1000));
    const pressureEnemyCountMultiplier = positiveInteger(options.pressureEnemyCountMultiplier, 2, 100);
    const pressureThreatMultiplier = finiteNumber(options.pressureThreatMultiplier, 2, 1, 100);
    const expectedDpsInterval = finiteNumber(options.expectedDpsInterval, 6, 0.01, 1000);
    const threatTimeCoefficient = finiteNumber(options.threatTimeCoefficient, 9, 0, 1000);
    const threatGrowthPerWave = finiteNumber(options.threatGrowthPerWave, 0.02, 0, 10);
    const foodExperiencePerWave = Math.round(finiteNumber(options.foodExperiencePerWave, 2, 0, 1000));
    const xpRequirementBase = positiveInteger(options.xpRequirementBase, 5, 100000);
    const xpRequirementPerLevel = Math.round(finiteNumber(options.xpRequirementPerLevel, 2, 0, 100000));
    const healthWeightVariation = finiteNumber(options.healthWeightVariation, 0.25, 0, 1);
    const experienceBeforeWaveCache = [0, 0];
    let cachedThroughWave = 0;
    let cachedExperience = 0;

    function baseEnemyCount(waveNumber) {
      const wave = positiveInteger(waveNumber, 1);
      let count = schedule[0].enemyCount;
      for (let index = 1; index < schedule.length; index += 1) {
        if (wave < schedule[index].startWave) break;
        count = schedule[index].enemyCount;
      }
      return count;
    }

    function isPressureWave(waveNumber) {
      const wave = positiveInteger(waveNumber, 1);
      return pressureWaveInterval > 0 && wave % pressureWaveInterval === 0;
    }

    function enemyCountForWave(waveNumber) {
      return baseEnemyCount(waveNumber) * (isPressureWave(waveNumber) ? pressureEnemyCountMultiplier : 1);
    }

    function experienceFromWave(waveNumber) {
      return enemyCountForWave(waveNumber) + foodExperiencePerWave;
    }

    function experienceBeforeWave(waveNumber) {
      const wave = positiveInteger(waveNumber, 1);
      while (cachedThroughWave < wave - 1) {
        cachedThroughWave += 1;
        cachedExperience += experienceFromWave(cachedThroughWave);
        experienceBeforeWaveCache[cachedThroughWave + 1] = cachedExperience;
      }
      return experienceBeforeWaveCache[wave] ?? cachedExperience;
    }

    function expectedLevelForExperience(experience) {
      let remaining = Math.max(0, Math.floor(finiteNumber(experience, 0)));
      let level = 0;
      while (remaining >= xpRequirementBase + level * xpRequirementPerLevel) {
        remaining -= xpRequirementBase + level * xpRequirementPerLevel;
        level += 1;
      }
      return level;
    }

    function plan(waveNumber) {
      const wave = positiveInteger(waveNumber, 1);
      const pressure = isPressureWave(wave);
      const expectedExperience = experienceBeforeWave(wave);
      const expectedLevel = expectedLevelForExperience(expectedExperience);
      const expectedDps = (expectedLevel + 1) / expectedDpsInterval;
      const growthMultiplier = 1 + threatGrowthPerWave * (wave - 1);
      const totalThreat = expectedDps
        * threatTimeCoefficient
        * growthMultiplier
        * (pressure ? pressureThreatMultiplier : 1);
      return Object.freeze({
        wave,
        pressure,
        baseEnemyCount: baseEnemyCount(wave),
        enemyCount: enemyCountForWave(wave),
        expectedExperience,
        expectedLevel,
        expectedDps,
        growthMultiplier,
        totalThreat
      });
    }

    function allocateHealth(baseWeights, totalThreat, random = Math.random) {
      const weights = Array.from(baseWeights || [], (weight) => finiteNumber(weight, 1, 0.000001, 100000));
      if (weights.length === 0) {
        return Object.freeze({ health: Object.freeze([]), actualWeights: Object.freeze([]), idealHealth: Object.freeze([]), targetTotalHealth: 0, actualTotalHealth: 0, difference: 0 });
      }
      const actualWeights = weights.map((weight) => {
        const roll = finiteNumber(random(), 0.5, 0, 0.999999999);
        return weight * (1 - healthWeightVariation + roll * healthWeightVariation * 2);
      });
      const weightTotal = actualWeights.reduce((sum, weight) => sum + weight, 0);
      const targetTotalHealth = Math.max(0, finiteNumber(totalThreat, 0));
      const idealHealth = actualWeights.map((weight) => targetTotalHealth * weight / weightTotal);
      const health = idealHealth.map((ideal) => {
        if (ideal < 1) return 1;
        const floor = Math.floor(ideal);
        return floor + Number(finiteNumber(random(), 1, 0, 1) < ideal - floor);
      });
      const actualTotalHealth = health.reduce((sum, value) => sum + value, 0);
      return Object.freeze({
        health: Object.freeze(health),
        actualWeights: Object.freeze(actualWeights),
        idealHealth: Object.freeze(idealHealth),
        targetTotalHealth,
        actualTotalHealth,
        difference: actualTotalHealth - targetTotalHealth
      });
    }

    return Object.freeze({
      schedule,
      baseEnemyCount,
      isPressureWave,
      enemyCountForWave,
      experienceFromWave,
      experienceBeforeWave,
      expectedLevelForExperience,
      plan,
      allocateHealth
    });
  }

  globalThis.GSS0WaveDirector = Object.freeze({ create });
})();
