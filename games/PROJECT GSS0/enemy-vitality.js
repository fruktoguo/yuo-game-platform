(() => {
  "use strict";

  function positiveInteger(value, fallback = 1) {
    const candidate = Number(value);
    if (!Number.isFinite(candidate)) return fallback;
    return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.round(candidate)));
  }

  function randomUnit(random) {
    const candidate = Number(typeof random === "function" ? random() : Math.random());
    if (!Number.isFinite(candidate)) return 0.5;
    return Math.max(0, Math.min(0.9999999999999999, candidate));
  }

  function chooseJointCount(totalHealth, random = Math.random) {
    const total = positiveInteger(totalHealth);
    return 1 + Math.floor(randomUnit(random) * total);
  }

  function allocateForJointCount(totalHealth, jointCount, random = Math.random) {
    const total = positiveInteger(totalHealth);
    const count = Math.min(total, positiveInteger(jointCount));
    const joints = Array.from({ length: count }, () => ({ health: 1, maxHealth: 1 }));
    for (let remaining = total - count; remaining > 0; remaining -= 1) {
      const joint = joints[Math.floor(randomUnit(random) * count)];
      joint.health += 1;
      joint.maxHealth += 1;
    }
    return { totalHealth: total, jointCount: count, joints };
  }

  function allocate(totalHealth, random = Math.random) {
    const total = positiveInteger(totalHealth);
    return allocateForJointCount(total, chooseJointCount(total, random), random);
  }

  function damage(joint, amount) {
    if (!joint || typeof joint !== "object") return { before: 0, after: 0, applied: 0, destroyed: false };
    const before = Math.max(0, Math.floor(Number(joint.health) || 0));
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    const after = Math.max(0, before - requested);
    joint.health = after;
    return {
      before,
      after,
      applied: before - after,
      destroyed: before > 0 && after === 0
    };
  }

  function currentTotal(enemy) {
    if (!enemy || typeof enemy !== "object") return 0;
    let total = Math.max(0, Math.floor(Number(enemy.health) || 0));
    for (const segment of enemy.segments || []) total += Math.max(0, Math.floor(Number(segment?.health) || 0));
    return total;
  }

  function maximumTotal(enemy) {
    if (!enemy || typeof enemy !== "object") return 0;
    let total = Math.max(0, Math.floor(Number(enemy.maxHealth) || 0));
    for (const segment of enemy.segments || []) total += Math.max(0, Math.floor(Number(segment?.maxHealth) || 0));
    return total;
  }

  globalThis.GSS0EnemyVitality = Object.freeze({
    allocate,
    allocateForJointCount,
    chooseJointCount,
    currentTotal,
    damage,
    maximumTotal
  });
})();
