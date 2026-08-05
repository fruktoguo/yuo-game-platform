(function attachPlayerBodyPath(root) {
  "use strict";

  const POSITION_EPSILON = 1e-9;
  const COLLINEAR_EPSILON = 1e-10;

  function finiteNumber(value, fallback = 0) {
    const candidate = Number(value);
    return Number.isFinite(candidate) ? candidate : fallback;
  }

  function safeSpacing(value) {
    return Math.max(0.000001, finiteNumber(value, 0.58));
  }

  function create() {
    return {
      points: [],
      heading: 0,
      initialized: false,
      lastAdvance: null
    };
  }

  function appendPoint(path, col, row) {
    const safeCol = finiteNumber(col);
    const safeRow = finiteNumber(row);
    const points = path.points;
    const latest = points.at(-1);
    if (!latest) {
      points.push({ col: safeCol, row: safeRow, distance: 0 });
      return false;
    }

    const deltaCol = safeCol - latest.col;
    const deltaRow = safeRow - latest.row;
    const distance = Math.hypot(deltaCol, deltaRow);
    if (distance <= POSITION_EPSILON) {
      latest.col = safeCol;
      latest.row = safeRow;
      return false;
    }

    path.heading = Math.atan2(deltaRow, deltaCol);
    const previous = points.at(-2);
    if (previous) {
      const previousCol = latest.col - previous.col;
      const previousRow = latest.row - previous.row;
      const previousLength = Math.hypot(previousCol, previousRow);
      const cross = previousCol * deltaRow - previousRow * deltaCol;
      const dot = previousCol * deltaCol + previousRow * deltaRow;
      if (
        previousLength > POSITION_EPSILON
        && dot > 0
        && Math.abs(cross) <= COLLINEAR_EPSILON * previousLength * distance
      ) {
        latest.col = safeCol;
        latest.row = safeRow;
        latest.distance = previous.distance + Math.hypot(safeCol - previous.col, safeRow - previous.row);
        return true;
      }
    }

    points.push({ col: safeCol, row: safeRow, distance: latest.distance + distance });
    return true;
  }

  function ensureCoverage(path, requiredDistance) {
    const points = path.points;
    if (points.length === 0) return;
    const latest = points.at(-1);
    const oldest = points[0];
    const available = latest.distance - oldest.distance;
    const missing = Math.max(0, requiredDistance - available);
    if (missing <= POSITION_EPSILON) return;

    const next = points[1];
    let directionCol = next ? next.col - oldest.col : Math.cos(path.heading);
    let directionRow = next ? next.row - oldest.row : Math.sin(path.heading);
    const directionLength = Math.hypot(directionCol, directionRow);
    if (directionLength <= POSITION_EPSILON) {
      directionCol = Math.cos(path.heading);
      directionRow = Math.sin(path.heading);
    } else {
      directionCol /= directionLength;
      directionRow /= directionLength;
    }
    points.unshift({
      col: oldest.col - directionCol * missing,
      row: oldest.row - directionRow * missing,
      distance: oldest.distance - missing
    });
  }

  function prune(path, requiredDistance) {
    const points = path.points;
    if (points.length <= 2) return;
    const tailDistance = points.at(-1).distance - requiredDistance;
    let removeCount = 0;
    while (removeCount < points.length - 2 && points[removeCount + 1].distance < tailDistance) {
      removeCount += 1;
    }
    if (removeCount > 0) points.splice(0, removeCount);
  }

  function sample(path, head, segments, spacingValue) {
    const spacing = safeSpacing(spacingValue);
    const points = path.points;
    if (!path.initialized || points.length === 0) reset(path, head, segments, spacing);
    const requiredDistance = spacing * segments.length;
    ensureCoverage(path, requiredDistance + spacing);

    const headDistance = points.at(-1).distance;
    let cursor = points.length - 1;
    let previousCol = finiteNumber(head?.col, points.at(-1).col);
    let previousRow = finiteNumber(head?.row, points.at(-1).row);
    for (let index = 0; index < segments.length; index += 1) {
      const targetDistance = headDistance - spacing * (index + 1);
      while (cursor > 0 && points[cursor - 1].distance > targetDistance) cursor -= 1;
      const newer = points[cursor];
      const older = points[Math.max(0, cursor - 1)];
      const span = newer.distance - older.distance;
      const amount = span > POSITION_EPSILON
        ? Math.max(0, Math.min(1, (targetDistance - older.distance) / span))
        : 0;
      const segment = segments[index];
      segment.col = older.col + (newer.col - older.col) * amount;
      segment.row = older.row + (newer.row - older.row) * amount;
      if ("angle" in segment) segment.angle = Math.atan2(previousRow - segment.row, previousCol - segment.col);
      previousCol = segment.col;
      previousRow = segment.row;
    }
    return segments;
  }

  function reset(path, head, segments = [], spacingValue = 0.58) {
    const spacing = safeSpacing(spacingValue);
    const points = path.points;
    points.length = 0;
    path.heading = finiteNumber(head?.angle);
    path.initialized = true;
    path.lastAdvance = null;

    const nodes = [head, ...(segments || [])].reverse();
    for (const node of nodes) {
      if (!Number.isFinite(node?.col) || !Number.isFinite(node?.row)) continue;
      appendPoint(path, node.col, node.row);
    }
    if (points.length === 0) appendPoint(path, finiteNumber(head?.col), finiteNumber(head?.row));
    const latest = points.at(-1);
    if (
      Math.hypot(finiteNumber(head?.col, latest.col) - latest.col, finiteNumber(head?.row, latest.row) - latest.row)
      > POSITION_EPSILON
    ) appendPoint(path, head.col, head.row);
    ensureCoverage(path, spacing * ((segments?.length || 0) + 1));
    return sample(path, head, segments || [], spacing);
  }

  function advance(path, head, segments, spacingValue) {
    const spacing = safeSpacing(spacingValue);
    if (!path?.initialized || path.points.length === 0) {
      reset(path, head, segments, spacing);
      return segments;
    }
    prune(path, spacing * (segments.length + 2));
    const latest = path.points.at(-1);
    path.lastAdvance = {
      pointCount: path.points.length,
      latest: { col: latest.col, row: latest.row, distance: latest.distance }
    };
    const moved = appendPoint(path, head.col, head.row);
    if (!moved) path.lastAdvance = null;
    return sample(path, head, segments, spacing);
  }

  function correct(path, head, segments, spacingValue) {
    const spacing = safeSpacing(spacingValue);
    if (!path?.initialized || path.points.length === 0) return reset(path, head, segments, spacing);
    const lastAdvance = path.lastAdvance;
    if (lastAdvance) {
      path.points.length = lastAdvance.pointCount;
      Object.assign(path.points.at(-1), lastAdvance.latest);
    }
    path.lastAdvance = null;
    appendPoint(path, head.col, head.row);
    return sample(path, head, segments, spacing);
  }

  function resample(path, head, segments, spacingValue) {
    const spacing = safeSpacing(spacingValue);
    if (!path?.initialized || path.points.length === 0) return reset(path, head, segments, spacing);
    const latest = path.points.at(-1);
    if (Math.hypot(head.col - latest.col, head.row - latest.row) > POSITION_EPSILON) {
      return correct(path, head, segments, spacing);
    }
    return sample(path, head, segments, spacing);
  }

  function reconcile(path, head, segments, spacingValue) {
    return reset(path, head, segments, spacingValue);
  }

  root.GSS0PlayerBodyPath = Object.freeze({ advance, correct, create, reconcile, resample, reset });
})(globalThis);
