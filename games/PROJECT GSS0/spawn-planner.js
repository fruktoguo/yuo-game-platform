(function attachSpawnPlanner(root) {
  "use strict";

  const geometry = root.GSS0ArenaGeometry;
  if (!geometry) throw new Error("PROJECT GSS0 圆形场地几何未加载");

  const TAU = Math.PI * 2;

  function finiteNumber(value, fallback = 0) {
    const candidate = Number(value);
    return Number.isFinite(candidate) ? candidate : fallback;
  }

  function randomUnit(random) {
    return Math.max(0, Math.min(0.999999999999, finiteNumber(random(), 0.5)));
  }

  function advance(point, direction, distance, options) {
    let directionCol = direction.col;
    let directionRow = direction.row;
    let nextCol = point.col + directionCol * distance;
    let nextRow = point.row + directionRow * distance;
    const wall = geometry.wallNormal(nextCol, nextRow, options.centerCol, options.centerRow, options.radius);
    if (wall) {
      const reflected = geometry.reflectVector(directionCol, directionRow, wall.col, wall.row);
      const reflectedLength = Math.hypot(reflected.col, reflected.row) || 1;
      directionCol = reflected.col / reflectedLength;
      directionRow = reflected.row / reflectedLength;
      nextCol = point.col + directionCol * distance;
      nextRow = point.row + directionRow * distance;
    }
    const constrained = geometry.constrainPoint(nextCol, nextRow, options.centerCol, options.centerRow, options.radius);
    return {
      point: { col: constrained.col, row: constrained.row },
      direction: { col: directionCol, row: directionRow }
    };
  }

  function createCandidate(options) {
    const head = geometry.sampleUniformPoint(options.centerCol, options.centerRow, options.radius, options.random);
    const angle = randomUnit(options.random) * TAU;
    const initialDirection = { col: Math.cos(angle), row: Math.sin(angle) };
    const forward = advance(head, initialDirection, 1, options);
    let bodyDirection = { col: -forward.direction.col, row: -forward.direction.row };
    let previous = head;
    const body = [];
    for (let index = 0; index < options.bodySegmentCount; index += 1) {
      const advanced = advance(previous, bodyDirection, 1, options);
      body.push(advanced.point);
      previous = advanced.point;
      bodyDirection = advanced.direction;
    }
    return { head, body, next: forward.point };
  }

  function pointClearance(point, points) {
    let clearance = Number.POSITIVE_INFINITY;
    for (const other of points) clearance = Math.min(clearance, Math.hypot(point.col - other.col, point.row - other.row));
    return clearance;
  }

  function isInPlayerForwardPath(point, players, halfWidth) {
    if (halfWidth <= 0) return false;
    for (const player of players) {
      const directionCol = Math.cos(player.angle);
      const directionRow = Math.sin(player.angle);
      const offsetCol = point.col - player.col;
      const offsetRow = point.row - player.row;
      const forwardDistance = offsetCol * directionCol + offsetRow * directionRow;
      if (forwardDistance <= 0) continue;
      const lateralDistance = Math.abs(offsetCol * directionRow - offsetRow * directionCol);
      if (lateralDistance <= halfWidth) return true;
    }
    return false;
  }

  function candidateScore(candidate, options) {
    const path = [candidate.head, ...candidate.body, candidate.next];
    let minimumClearance = Number.POSITIVE_INFINITY;
    for (const point of path) {
      minimumClearance = Math.min(minimumClearance, pointClearance(point, options.occupiedPoints));
      if (isInPlayerForwardPath(point, options.players, options.forwardPathHalfWidth)) minimumClearance = -1;
    }
    const playerClearance = pointClearance(candidate.head, options.players);
    const safe = minimumClearance + 1e-10 >= options.occupancyDistance
      && playerClearance + 1e-10 >= options.safetyDistance
      && minimumClearance >= 0;
    return {
      safe,
      score: Math.min(minimumClearance, playerClearance - options.safetyDistance + options.occupancyDistance)
    };
  }

  function choose(options = {}) {
    const normalized = {
      centerCol: finiteNumber(options.centerCol),
      centerRow: finiteNumber(options.centerRow),
      radius: Math.max(0, finiteNumber(options.radius)),
      bodySegmentCount: Math.max(0, Math.floor(finiteNumber(options.bodySegmentCount))),
      safetyDistance: Math.max(0, finiteNumber(options.safetyDistance)),
      occupancyDistance: Math.max(0, finiteNumber(options.occupancyDistance, 0.5)),
      forwardPathHalfWidth: Math.max(0, finiteNumber(options.forwardPathHalfWidth)),
      occupiedPoints: Array.isArray(options.occupiedPoints) ? options.occupiedPoints : [],
      players: Array.isArray(options.players) ? options.players : [],
      attempts: Math.max(1, Math.round(finiteNumber(options.attempts, 96))),
      random: typeof options.random === "function" ? options.random : Math.random
    };
    let best = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let attempt = 0; attempt < normalized.attempts; attempt += 1) {
      const candidate = createCandidate(normalized);
      const result = candidateScore(candidate, normalized);
      if (result.safe) return candidate;
      if (result.score > bestScore) {
        best = candidate;
        bestScore = result.score;
      }
    }
    return best;
  }

  function spaceSpawnBody(head, bodyPath, spacing, segmentCount = bodyPath.length) {
    if (bodyPath.length === 0) return [];
    const count = Math.max(0, Math.floor(segmentCount));
    const allowedDistance = Math.max(0, Number(spacing) || 0);
    const body = [];
    let previous = { col: head.col, row: head.row };
    for (let index = 0; index < count; index += 1) {
      const target = bodyPath[Math.min(index, bodyPath.length - 1)];
      const deltaCol = previous.col - target.col;
      const deltaRow = previous.row - target.row;
      const distance = Math.hypot(deltaCol, deltaRow);
      const point = distance > allowedDistance && distance > 0
        ? {
            col: previous.col - deltaCol / distance * allowedDistance,
            row: previous.row - deltaRow / distance * allowedDistance
          }
        : { col: target.col, row: target.row };
      body.push(point);
      previous = point;
    }
    return body;
  }

  root.GSS0SpawnPlanner = Object.freeze({ choose, spaceSpawnBody });
})(globalThis);
