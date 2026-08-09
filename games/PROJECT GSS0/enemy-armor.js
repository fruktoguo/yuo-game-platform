(() => {
  "use strict";

  const normalizedTuningCache = new WeakMap();

  function nonNegativeInteger(value, fallback = 0) {
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) return fallback;
    return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(candidate)));
  }

  function positiveNumber(value, fallback) {
    const candidate = Number(value);
    return Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
  }

  function normalizeTuning(tuning = {}) {
    if (tuning && typeof tuning === "object") {
      const cached = normalizedTuningCache.get(tuning);
      if (cached) return cached;
    }
    const normalized = {
      headCoreRadius: positiveNumber(tuning.headCoreRadius, 0.41),
      bodyCoreRadius: positiveNumber(tuning.bodyCoreRadius, 0.205),
      layerThickness: positiveNumber(tuning.layerThickness, 0.05425),
      baseSpacing: positiveNumber(tuning.baseSpacing, 0.45),
      spacingScale: Math.max(0, Number.isFinite(Number(tuning.spacingScale)) ? Number(tuning.spacingScale) : 1),
      spacingResponse: Math.max(0, Number.isFinite(Number(tuning.spacingResponse)) ? Number(tuning.spacingResponse) : 12),
      maxPlates: Math.max(1, Math.min(64, nonNegativeInteger(tuning.maxPlates, 8)))
    };
    if (tuning && typeof tuning === "object") normalizedTuningCache.set(tuning, normalized);
    return normalized;
  }

  function layers(maxHealth, currentHealth = maxHealth) {
    const maximum = Math.max(1, nonNegativeInteger(maxHealth, 1));
    const current = Math.min(maximum, nonNegativeInteger(currentHealth));
    const result = [];
    let remainingMaximum = maximum;
    let remainingCurrent = current;
    let capacity = 1;
    let index = 0;

    while (remainingMaximum > 0) {
      const layerCapacity = index === 0 ? 1 : Math.min(capacity, remainingMaximum);
      const health = Math.min(layerCapacity, remainingCurrent);
      result.push({
        index,
        kind: index === 0 ? "core" : "armor",
        capacity: layerCapacity,
        health,
        fill: layerCapacity > 0 ? health / layerCapacity : 0,
        remainder: index > 0 && layerCapacity < capacity
      });
      remainingMaximum -= layerCapacity;
      remainingCurrent -= health;
      if (index > 0) capacity = Math.min(Number.MAX_SAFE_INTEGER, capacity * 2);
      index += 1;
    }
    return result;
  }

  function activeLayerCount(currentHealth, maxHealth) {
    const maximum = Math.max(1, nonNegativeInteger(maxHealth, 1));
    let remainingMaximum = maximum;
    let remainingCurrent = Math.min(maximum, nonNegativeInteger(currentHealth));
    if (remainingCurrent <= 0) return 0;
    let count = 0;
    let capacity = 1;
    let index = 0;
    while (remainingMaximum > 0 && remainingCurrent > 0) {
      const layerCapacity = index === 0 ? 1 : Math.min(capacity, remainingMaximum);
      if (Math.min(layerCapacity, remainingCurrent) > 0) count += 1;
      remainingMaximum -= layerCapacity;
      remainingCurrent -= layerCapacity;
      if (index > 0) capacity = Math.min(Number.MAX_SAFE_INTEGER, capacity * 2);
      index += 1;
    }
    return count;
  }

  function radiusForLayer(layerIndex, isHead, tuning) {
    const normalized = normalizeTuning(tuning);
    const coreRadius = isHead ? normalized.headCoreRadius : normalized.bodyCoreRadius;
    return coreRadius + Math.max(0, nonNegativeInteger(layerIndex)) * normalized.layerThickness;
  }

  function radius(currentHealth, maxHealth, isHead, tuning) {
    const count = activeLayerCount(currentHealth, maxHealth);
    if (count === 0) return 0;
    return radiusForLayer(count - 1, isHead, tuning);
  }

  function spacing(previousJoint, previousIsHead, joint, tuning) {
    const normalized = normalizeTuning(tuning);
    const previousCore = previousIsHead ? normalized.headCoreRadius : normalized.bodyCoreRadius;
    const previousRadius = radius(previousJoint?.health, previousJoint?.maxHealth, previousIsHead, normalized) || previousCore;
    const jointRadius = radius(joint?.health, joint?.maxHealth, false, normalized) || normalized.bodyCoreRadius;
    const armorGrowth = Math.max(0, previousRadius - previousCore) + Math.max(0, jointRadius - normalized.bodyCoreRadius);
    return normalized.baseSpacing + armorGrowth * normalized.spacingScale;
  }

  function smoothSpacing(currentSpacing, targetSpacing, deltaSeconds, response) {
    const target = positiveNumber(targetSpacing, 0.45);
    const current = positiveNumber(currentSpacing, target);
    const delta = Math.max(0, Number(deltaSeconds) || 0);
    const speed = Math.max(0, Number(response) || 0);
    if (delta <= 0 || speed <= 0) return current;
    const next = target + (current - target) * Math.exp(-speed * delta);
    return Math.abs(next - target) < 0.0001 ? target : next;
  }

  function plates(capacity, health, maxPlates = 8) {
    const maximum = Math.max(1, nonNegativeInteger(capacity, 1));
    const current = Math.min(maximum, nonNegativeInteger(health));
    const count = Math.max(1, Math.min(maximum, Math.max(1, nonNegativeInteger(maxPlates, 8))));
    const baseCapacity = Math.floor(maximum / count);
    let capacityRemainder = maximum % count;
    let healthRemainder = current;
    const result = [];
    for (let index = 0; index < count; index += 1) {
      const plateCapacity = baseCapacity + (capacityRemainder > 0 ? 1 : 0);
      capacityRemainder -= capacityRemainder > 0 ? 1 : 0;
      const plateHealth = Math.min(plateCapacity, healthRemainder);
      healthRemainder -= plateHealth;
      result.push({
        index,
        capacity: plateCapacity,
        health: plateHealth,
        fill: plateCapacity > 0 ? plateHealth / plateCapacity : 0
      });
    }
    return result;
  }

  function damageTransitions(maxHealth, beforeHealth, afterHealth) {
    const before = layers(maxHealth, beforeHealth);
    const after = layers(maxHealth, afterHealth);
    const result = [];
    for (let index = before.length - 1; index >= 1; index -= 1) {
      if (before[index].health === after[index].health) continue;
      result.push({
        index,
        capacity: before[index].capacity,
        before: before[index].health,
        after: after[index].health,
        destroyed: before[index].health > 0 && after[index].health === 0
      });
    }
    return result;
  }

  globalThis.GSS0EnemyArmor = Object.freeze({
    activeLayerCount,
    damageTransitions,
    layers,
    normalizeTuning,
    plates,
    radius,
    radiusForLayer,
    smoothSpacing,
    spacing
  });
})();
