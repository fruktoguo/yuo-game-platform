(function attachEnemyBehavior(root) {
  "use strict";

  const TAU = Math.PI * 2;
  const EPSILON = 1e-7;
  const FOOD_COLLECTORS = new Set(["forager", "courier", "charger", "cutter", "coiler", "warden"]);

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function randomBetween(minimum, maximum, random = Math.random) {
    const low = Math.min(finite(minimum), finite(maximum));
    const high = Math.max(finite(minimum), finite(maximum));
    return low + Math.max(0, Math.min(1, finite(random(), 0.5))) * (high - low);
  }

  function randomAngle(random = Math.random) {
    return randomBetween(0, TAU, random);
  }

  function sampleCircleTarget(
    originCol,
    originRow,
    centerCol,
    centerRow,
    radius,
    minimumDistance,
    random = Math.random,
    attempts = 12
  ) {
    const safeOriginCol = finite(originCol);
    const safeOriginRow = finite(originRow);
    const safeCenterCol = finite(centerCol);
    const safeCenterRow = finite(centerRow);
    const safeRadius = Math.max(0, finite(radius));
    const minimumDistanceSquared = Math.max(0, finite(minimumDistance)) ** 2;
    const sampleCount = Math.max(1, Math.round(finite(attempts, 12)));
    let selected = { col: safeCenterCol, row: safeCenterRow };
    let selectedDistanceSquared = -1;
    for (let index = 0; index < sampleCount; index += 1) {
      const angle = randomAngle(random);
      const distance = Math.sqrt(Math.max(0, Math.min(1, finite(random(), 0.5)))) * safeRadius;
      const candidate = {
        col: safeCenterCol + Math.cos(angle) * distance,
        row: safeCenterRow + Math.sin(angle) * distance
      };
      const deltaCol = candidate.col - safeOriginCol;
      const deltaRow = candidate.row - safeOriginRow;
      const distanceSquared = deltaCol * deltaCol + deltaRow * deltaRow;
      if (distanceSquared >= minimumDistanceSquared) return candidate;
      if (distanceSquared > selectedDistanceSquared) {
        selected = candidate;
        selectedDistanceSquared = distanceSquared;
      }
    }
    return selected;
  }

  function interceptAngle(
    pursuerCol,
    pursuerRow,
    targetCol,
    targetRow,
    targetVelocityCol,
    targetVelocityRow,
    pursuerSpeed,
    maximumTime
  ) {
    const relativeCol = finite(targetCol) - finite(pursuerCol);
    const relativeRow = finite(targetRow) - finite(pursuerRow);
    const velocityCol = finite(targetVelocityCol);
    const velocityRow = finite(targetVelocityRow);
    const speed = Math.max(EPSILON, finite(pursuerSpeed));
    const timeLimit = Math.max(0, finite(maximumTime));
    const a = velocityCol * velocityCol + velocityRow * velocityRow - speed * speed;
    const b = 2 * (relativeCol * velocityCol + relativeRow * velocityRow);
    const c = relativeCol * relativeCol + relativeRow * relativeRow;
    let interceptTime = Number.POSITIVE_INFINITY;
    if (Math.abs(a) <= EPSILON) {
      if (Math.abs(b) > EPSILON) {
        const candidate = -c / b;
        if (candidate > EPSILON) interceptTime = candidate;
      }
    } else {
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const root = Math.sqrt(discriminant);
        const first = (-b - root) / (2 * a);
        const second = (-b + root) / (2 * a);
        if (first > EPSILON) interceptTime = first;
        if (second > EPSILON) interceptTime = Math.min(interceptTime, second);
      }
    }
    if (!Number.isFinite(interceptTime) || interceptTime > timeLimit) {
      return Math.atan2(relativeRow, relativeCol);
    }
    return Math.atan2(
      relativeRow + velocityRow * interceptTime,
      relativeCol + velocityCol * interceptTime
    );
  }

  function canCollectFood(archetype) {
    return FOOD_COLLECTORS.has(archetype);
  }

  function usesIndependentCourse(archetype) {
    return archetype === "liner" || archetype === "headhunter";
  }

  root.GSS0EnemyBehavior = Object.freeze({
    randomBetween,
    randomAngle,
    sampleCircleTarget,
    interceptAngle,
    canCollectFood,
    usesIndependentCourse
  });
})(globalThis);
