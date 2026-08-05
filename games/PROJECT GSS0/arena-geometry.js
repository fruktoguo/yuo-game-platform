(function attachArenaGeometry(root) {
  "use strict";

  const TAU = Math.PI * 2;

  function finiteNumber(value, fallback = 0) {
    const candidate = Number(value);
    return Number.isFinite(candidate) ? candidate : fallback;
  }

  function randomUnit(random) {
    return Math.max(0, Math.min(0.999999999999, finiteNumber(random?.(), 0.5)));
  }

  function diameterFromArea(area) {
    return Math.sqrt(Math.max(0, finiteNumber(area)) * 4 / Math.PI);
  }

  function centerForGrid(gridSize) {
    return (finiteNumber(gridSize, 1) - 1) * 0.5;
  }

  function playableRadius(diameter, margin = 0) {
    return Math.max(0, (finiteNumber(diameter, 1) - 1) * 0.5 - Math.max(0, finiteNumber(margin)));
  }

  function boundaryRadius(diameter, margin = 0) {
    return Math.max(0, finiteNumber(diameter, 1) * 0.5 - Math.max(0, finiteNumber(margin)));
  }

  function distanceFromCenter(col, row, centerCol, centerRow) {
    return Math.hypot(finiteNumber(col) - finiteNumber(centerCol), finiteNumber(row) - finiteNumber(centerRow));
  }

  function containsPoint(col, row, centerCol, centerRow, radius) {
    const safeRadius = Math.max(0, finiteNumber(radius));
    const deltaCol = finiteNumber(col) - finiteNumber(centerCol);
    const deltaRow = finiteNumber(row) - finiteNumber(centerRow);
    return deltaCol * deltaCol + deltaRow * deltaRow <= safeRadius * safeRadius + 1e-10;
  }

  function constrainPoint(col, row, centerCol, centerRow, radius) {
    const safeCenterCol = finiteNumber(centerCol);
    const safeCenterRow = finiteNumber(centerRow);
    const safeCol = finiteNumber(col, safeCenterCol);
    const safeRow = finiteNumber(row, safeCenterRow);
    const safeRadius = Math.max(0, finiteNumber(radius));
    const deltaCol = safeCol - safeCenterCol;
    const deltaRow = safeRow - safeCenterRow;
    const distance = Math.hypot(deltaCol, deltaRow);
    if (distance <= safeRadius || distance <= 1e-12) {
      return { col: safeCol, row: safeRow, normalCol: 0, normalRow: 0, collided: false };
    }
    const outwardCol = deltaCol / distance;
    const outwardRow = deltaRow / distance;
    return {
      col: safeCenterCol + outwardCol * safeRadius,
      row: safeCenterRow + outwardRow * safeRadius,
      normalCol: -outwardCol,
      normalRow: -outwardRow,
      collided: true
    };
  }

  function wallNormal(col, row, centerCol, centerRow, radius) {
    const constrained = constrainPoint(col, row, centerCol, centerRow, radius);
    return constrained.collided
      ? { col: constrained.normalCol, row: constrained.normalRow }
      : null;
  }

  function distanceToBoundary(col, row, centerCol, centerRow, radius) {
    return Math.max(0, finiteNumber(radius) - distanceFromCenter(col, row, centerCol, centerRow));
  }

  function sampleUniformPoint(centerCol, centerRow, radius, random = Math.random) {
    const angle = randomUnit(random) * TAU;
    const distance = Math.sqrt(randomUnit(random)) * Math.max(0, finiteNumber(radius));
    return {
      col: finiteNumber(centerCol) + Math.cos(angle) * distance,
      row: finiteNumber(centerRow) + Math.sin(angle) * distance
    };
  }

  function reflectVector(col, row, normalCol, normalRow) {
    const length = Math.hypot(normalCol, normalRow);
    if (length <= 1e-12) return { col: -finiteNumber(col), row: -finiteNumber(row) };
    const unitCol = normalCol / length;
    const unitRow = normalRow / length;
    const approach = finiteNumber(col) * unitCol + finiteNumber(row) * unitRow;
    if (approach >= 0) return { col: finiteNumber(col), row: finiteNumber(row) };
    return {
      col: finiteNumber(col) - 2 * approach * unitCol,
      row: finiteNumber(row) - 2 * approach * unitRow
    };
  }

  function clearanceSquared(point, occupiedPoints) {
    let clearance = Number.POSITIVE_INFINITY;
    for (const occupied of occupiedPoints || []) {
      if (!Number.isFinite(occupied?.col) || !Number.isFinite(occupied?.row)) continue;
      const deltaCol = point.col - occupied.col;
      const deltaRow = point.row - occupied.row;
      clearance = Math.min(clearance, deltaCol * deltaCol + deltaRow * deltaRow);
    }
    return clearance;
  }

  function chooseSpawnPoint(options = {}) {
    const centerCol = finiteNumber(options.centerCol);
    const centerRow = finiteNumber(options.centerRow);
    const radius = Math.max(0, finiteNumber(options.radius));
    const safetyDistance = Math.max(0, finiteNumber(options.safetyDistance));
    const safetySquared = safetyDistance * safetyDistance;
    const attempts = Math.max(1, Math.round(finiteNumber(options.attempts, 96)));
    const random = typeof options.random === "function" ? options.random : Math.random;
    const preferred = Number.isFinite(options.preferred?.col) && Number.isFinite(options.preferred?.row)
      ? constrainPoint(options.preferred.col, options.preferred.row, centerCol, centerRow, radius)
      : null;
    let best = null;
    let bestClearance = -1;
    let bestPreferredDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < attempts; index += 1) {
      let candidate;
      if (preferred && index === 0) {
        candidate = { col: preferred.col, row: preferred.row };
      } else if (preferred && index < Math.ceil(attempts * 0.75)) {
        const ring = Math.max(1, Math.ceil(index / 8));
        const distance = safetyDistance > 0
          ? safetyDistance * ring * (0.82 + randomUnit(random) * 0.36)
          : radius * Math.sqrt(randomUnit(random));
        const angle = randomUnit(random) * TAU;
        const constrained = constrainPoint(
          preferred.col + Math.cos(angle) * distance,
          preferred.row + Math.sin(angle) * distance,
          centerCol,
          centerRow,
          radius
        );
        candidate = { col: constrained.col, row: constrained.row };
      } else {
        candidate = sampleUniformPoint(centerCol, centerRow, radius, random);
      }

      const clearance = clearanceSquared(candidate, options.occupiedPoints);
      const preferredDistance = preferred
        ? (candidate.col - preferred.col) ** 2 + (candidate.row - preferred.row) ** 2
        : 0;
      if (clearance > bestClearance + 1e-10 || (Math.abs(clearance - bestClearance) <= 1e-10 && preferredDistance < bestPreferredDistance)) {
        best = candidate;
        bestClearance = clearance;
        bestPreferredDistance = preferredDistance;
      }
      if (clearance + 1e-10 >= safetySquared) return candidate;
    }

    return best || { col: centerCol, row: centerRow };
  }

  root.GSS0ArenaGeometry = Object.freeze({
    boundaryRadius,
    centerForGrid,
    chooseSpawnPoint,
    constrainPoint,
    containsPoint,
    diameterFromArea,
    distanceFromCenter,
    distanceToBoundary,
    playableRadius,
    reflectVector,
    sampleUniformPoint,
    wallNormal
  });
})(globalThis);
