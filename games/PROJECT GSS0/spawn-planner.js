(function attachSpawnPlanner(root) {
  "use strict";

  const PATH_CACHE_LIMIT = 16;
  const pathCache = new Map();

  function choose(options) {
    const paths = serpentinePaths(options.minimum, options.maximum);
    const gridWidth = Math.max(1, options.maximum - options.minimum + 1);
    const visibleLength = Math.max(0, Math.min(options.bodySegmentCount, gridWidth * gridWidth - 2));
    const windowLength = visibleLength + 2;
    const candidatesByHead = new Map();
    const playerPaths = options.players.map((player) => ({
      col: player.col,
      row: player.row,
      directionCol: Math.cos(player.angle),
      directionRow: Math.sin(player.angle)
    }));

    for (const path of paths) {
      let occupiedCount = 0;
      let forwardPathCount = 0;
      for (let index = 0; index < windowLength; index += 1) {
        if (options.occupiedCells.has(pointCode(path[index]))) occupiedCount += 1;
        if (isInPlayerForwardPath(path[index], playerPaths, options.forwardPathHalfWidth)) forwardPathCount += 1;
      }

      for (let index = visibleLength; index < path.length - 1; index += 1) {
        if (occupiedCount === 0 && forwardPathCount === 0) {
          const head = path[index];
          if (nearestPlayerDistance(head, options.players) >= options.safetyDistance) {
            const headCode = pointCode(head);
            const candidates = candidatesByHead.get(headCode) ?? [];
            candidates.push({ path, index });
            candidatesByHead.set(headCode, candidates);
          }
        }

        if (index >= path.length - 2) continue;
        const leaving = path[index - visibleLength];
        const entering = path[index + 2];
        if (options.occupiedCells.has(pointCode(leaving))) occupiedCount -= 1;
        if (options.occupiedCells.has(pointCode(entering))) occupiedCount += 1;
        if (isInPlayerForwardPath(leaving, playerPaths, options.forwardPathHalfWidth)) forwardPathCount -= 1;
        if (isInPlayerForwardPath(entering, playerPaths, options.forwardPathHalfWidth)) forwardPathCount += 1;
      }
    }

    const candidateLocations = [...candidatesByHead.values()];
    if (candidateLocations.length === 0) return null;
    const routes = candidateLocations[randomIndex(candidateLocations.length, options.random)];
    const selected = routes[randomIndex(routes.length, options.random)];
    return materializeCandidate(selected, visibleLength);
  }

  function serpentinePaths(minimum, maximum) {
    const key = `${minimum},${maximum}`;
    const cached = pathCache.get(key);
    if (cached) return cached;
    const base = [];
    for (let row = minimum; row <= maximum; row += 1) {
      for (let step = minimum; step <= maximum; step += 1) {
        base.push({ col: (row - minimum) % 2 === 0 ? step : minimum + maximum - step, row });
      }
    }
    const transforms = [
      (cell) => ({ col: cell.col, row: cell.row }),
      (cell) => ({ col: minimum + maximum - cell.col, row: cell.row }),
      (cell) => ({ col: cell.col, row: minimum + maximum - cell.row }),
      (cell) => ({ col: cell.row, row: cell.col }),
      (cell) => ({ col: minimum + maximum - cell.row, row: cell.col }),
      (cell) => ({ col: cell.row, row: minimum + maximum - cell.col })
    ];
    const paths = [];
    for (const transform of transforms) {
      const path = base.map(transform);
      paths.push(path, [...path].reverse());
    }
    if (pathCache.size >= PATH_CACHE_LIMIT) {
      pathCache.clear();
    }
    pathCache.set(key, paths);
    return paths;
  }

  function nearestPlayerDistance(point, players) {
    if (players.length === 0) return Infinity;
    let nearest = Infinity;
    for (const player of players) nearest = Math.min(nearest, Math.hypot(point.col - player.col, point.row - player.row));
    return nearest;
  }

  function isInPlayerForwardPath(point, paths, halfWidth) {
    if (halfWidth <= 0) return false;
    for (const path of paths) {
      const offsetCol = point.col - path.col;
      const offsetRow = point.row - path.row;
      const forwardDistance = offsetCol * path.directionCol + offsetRow * path.directionRow;
      if (forwardDistance <= 0) continue;
      const lateralDistance = Math.abs(offsetCol * path.directionRow - offsetRow * path.directionCol);
      if (lateralDistance <= halfWidth) return true;
    }
    return false;
  }

  function randomIndex(length, random) {
    return Math.min(length - 1, Math.floor(Math.max(0, random()) * length));
  }

  function materializeCandidate(candidate, visibleLength) {
    const head = candidate.path[candidate.index];
    const next = candidate.path[candidate.index + 1];
    const body = [];
    for (let offset = 1; offset <= visibleLength; offset += 1) {
      const point = candidate.path[candidate.index - offset];
      body.push({ col: point.col, row: point.row });
    }
    return { head: { ...head }, body, next: { ...next } };
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

  function pointCode(point) {
    return (Math.round(point.row) & 0xffff) << 16 | (Math.round(point.col) & 0xffff);
  }

  root.GSS0SpawnPlanner = Object.freeze({ choose, spaceSpawnBody });
})(globalThis);
