(function attachSpawnPlanner(root) {
  "use strict";

  const PATH_CACHE_LIMIT = 16;
  const pathCache = new Map();
  const distanceCache = new Map();

  function choose(options) {
    const paths = serpentinePaths(options.minimum, options.maximum);
    const gridWidth = Math.max(1, options.maximum - options.minimum + 1);
    const visibleLength = Math.max(0, Math.min(options.bodySegmentCount, gridWidth * gridWidth - 2));
    const windowLength = visibleLength + 2;
    const candidates = [];
    let maximumHeadDistance = -Infinity;
    let safestDistanceAtMaximumHead = -Infinity;
    const windowDistances = cachedWindowDistances(paths, windowLength, options);

    for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
      const path = paths[pathIndex];
      const nearestWindowDistances = windowDistances[pathIndex];
      let occupiedCount = 0;
      for (let index = 0; index < windowLength; index += 1) {
        if (options.occupiedCells.has(pointCode(path[index]))) occupiedCount += 1;
      }

      for (let index = visibleLength; index < path.length - 1; index += 1) {
        if (occupiedCount === 0) {
          const head = path[index];
          const headDistance = nearestPointDistance(head, options.players, options.fallbackDistance);
          if (headDistance >= options.minimumHeadDistance) {
            const nearestPlayerDistance = nearestWindowDistances[index];
            if (headDistance > maximumHeadDistance) {
              maximumHeadDistance = headDistance;
              safestDistanceAtMaximumHead = nearestPlayerDistance;
              retainNearMaximum(candidates, maximumHeadDistance);
            } else if (headDistance === maximumHeadDistance && nearestPlayerDistance > safestDistanceAtMaximumHead) {
              safestDistanceAtMaximumHead = nearestPlayerDistance;
            }
            if (maximumHeadDistance - headDistance < 0.001) {
              candidates.push({ path, index, headDistance, nearestPlayerDistance });
            }
          }
        }

        if (index >= path.length - 2) continue;
        if (options.occupiedCells.has(pointCode(path[index - visibleLength]))) occupiedCount -= 1;
        if (options.occupiedCells.has(pointCode(path[index + 2]))) occupiedCount += 1;
      }
    }

    const safest = candidates
      .filter((candidate) => Math.abs(candidate.headDistance - maximumHeadDistance) < 0.001
        && Math.abs(candidate.nearestPlayerDistance - safestDistanceAtMaximumHead) < 0.001)
      .sort((left, right) => right.headDistance - left.headDistance || right.nearestPlayerDistance - left.nearestPlayerDistance);
    if (safest.length === 0) return null;
    const selected = safest[Math.floor(options.random() * safest.length)];
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
      distanceCache.clear();
    }
    pathCache.set(key, paths);
    return paths;
  }

  function cachedWindowDistances(paths, windowLength, options) {
    const playerKey = options.players.map((player) => `${player.col},${player.row}`).join(';');
    const key = `${options.minimum},${options.maximum}|${windowLength}|${options.fallbackDistance}|${playerKey}`;
    const cached = distanceCache.get(key);
    if (cached) return cached;
    const distances = paths.map((path) => windowPlayerDistances(path, windowLength, options.players, options.fallbackDistance));
    if (distanceCache.size >= PATH_CACHE_LIMIT) distanceCache.clear();
    distanceCache.set(key, distances);
    return distances;
  }

  function windowPlayerDistances(path, windowLength, players, fallbackDistance) {
    const result = new Float64Array(path.length);
    result.fill(players.length > 0 ? Infinity : fallbackDistance);
    if (players.length === 0) return result;
    const distances = new Float64Array(path.length);
    const deque = new Int32Array(path.length);
    for (const player of players) {
      let head = 0;
      let tail = 0;
      for (let index = 0; index < path.length; index += 1) {
        const point = path[index];
        const distance = Math.hypot(point.col - player.col, point.row - player.row);
        distances[index] = distance;
        while (tail > head && distances[deque[tail - 1]] >= distance) tail -= 1;
        deque[tail] = index;
        tail += 1;
        const minimumIndex = index - windowLength + 1;
        while (tail > head && deque[head] < minimumIndex) head += 1;
        if (index < windowLength - 1) continue;
        const candidateIndex = index - 1;
        result[candidateIndex] = Math.min(result[candidateIndex], distances[deque[head]]);
      }
    }
    return result;
  }

  function nearestPointDistance(point, players, fallbackDistance) {
    if (players.length === 0) return fallbackDistance;
    let nearest = Infinity;
    for (const player of players) nearest = Math.min(nearest, Math.hypot(point.col - player.col, point.row - player.row));
    return nearest;
  }

  function retainNearMaximum(candidates, maximum) {
    let writeIndex = 0;
    for (const candidate of candidates) {
      if (maximum - candidate.headDistance >= 0.001) continue;
      candidates[writeIndex] = candidate;
      writeIndex += 1;
    }
    candidates.length = writeIndex;
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

  function pointCode(point) {
    return (Math.round(point.row) & 0xffff) << 16 | (Math.round(point.col) & 0xffff);
  }

  root.GSS0SpawnPlanner = Object.freeze({ choose });
})(globalThis);
