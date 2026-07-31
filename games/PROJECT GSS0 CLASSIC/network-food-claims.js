(function attachFoodClaimRuntime(root) {
  "use strict";

  function create(options = {}) {
    const maximumBatchSize = Math.max(1, Math.floor(options.maximumBatchSize || 32));
    const retryAfterMs = Math.max(100, Number(options.retryAfterMs) || 750);
    const pending = new Map();
    const confirmed = new Set();
    const present = new Set();
    const accepted = new Set();
    const foodBuckets = new Map();
    const foodBucketPool = [];
    const bucketCodesById = new Map();
    const trackedFoodsById = new Map();
    const detectionScratch = [];
    const emptyDetection = Object.freeze([]);

    function bucketCode(col, row) {
      return (Math.floor(col) + 32768) * 65536 + Math.floor(row) + 32768;
    }

    function resetFoodBuckets() {
      for (const bucket of foodBuckets.values()) {
        bucket.length = 0;
        foodBucketPool.push(bucket);
      }
      foodBuckets.clear();
      bucketCodesById.clear();
      trackedFoodsById.clear();
    }

    function removeFromBucket(id) {
      const code = bucketCodesById.get(id);
      if (code === undefined) return;
      const bucket = foodBuckets.get(code);
      if (bucket) {
        const index = bucket.findIndex((food) => food.id === id);
        if (index >= 0) {
          const last = bucket.pop();
          if (index < bucket.length) bucket[index] = last;
        }
        if (bucket.length === 0) {
          foodBuckets.delete(code);
          foodBucketPool.push(bucket);
        }
      }
      bucketCodesById.delete(id);
      trackedFoodsById.delete(id);
    }

    function trackFood(food) {
      if (!Number.isSafeInteger(food?.id) || !Number.isFinite(food.col) || !Number.isFinite(food.row)) return;
      const code = bucketCode(food.col, food.row);
      const previousCode = bucketCodesById.get(food.id);
      if (previousCode === code) {
        if (trackedFoodsById.get(food.id) === food) return;
        const bucket = foodBuckets.get(code);
        const index = bucket?.findIndex((item) => item.id === food.id) ?? -1;
        if (bucket && index >= 0) bucket[index] = food;
        trackedFoodsById.set(food.id, food);
        return;
      }
      removeFromBucket(food.id);
      let bucket = foodBuckets.get(code);
      if (!bucket) {
        bucket = foodBucketPool.pop() || [];
        foodBuckets.set(code, bucket);
      }
      bucket.push(food);
      bucketCodesById.set(food.id, code);
      trackedFoodsById.set(food.id, food);
    }

    function untrackFood(id) {
      if (!Number.isSafeInteger(id)) return;
      present.delete(id);
      pending.delete(id);
      confirmed.delete(id);
      removeFromBucket(id);
    }

    function forEachNearbyFood(point, range, visit) {
      if (!point || typeof visit !== "function" || foodBuckets.size === 0) return;
      const safeRange = Math.max(0, Number(range) || 0);
      const minimumCol = Math.floor(point.col - safeRange);
      const maximumCol = Math.floor(point.col + safeRange);
      const minimumRow = Math.floor(point.row - safeRange);
      const maximumRow = Math.floor(point.row + safeRange);
      for (let col = minimumCol; col <= maximumCol; col += 1) {
        for (let row = minimumRow; row <= maximumRow; row += 1) {
          const bucket = foodBuckets.get(bucketCode(col, row));
          if (!bucket) continue;
          for (const food of bucket) visit(food);
        }
      }
    }

    function rebuildFoodBuckets(authoritativeFoods) {
      resetFoodBuckets();
      present.clear();
      for (const item of authoritativeFoods) {
        const id = typeof item === "number" ? item : item?.id;
        if (!Number.isSafeInteger(id)) continue;
        present.add(id);
        if (typeof item === "number" || !Number.isFinite(item.col) || !Number.isFinite(item.row)) continue;
        trackFood(item);
      }
    }

    function applyDelta(upserts, removedIds, reset, now) {
      if (reset) {
        resetFoodBuckets();
        present.clear();
        pending.clear();
        confirmed.clear();
        accepted.clear();
      }
      for (const id of removedIds || []) {
        if (!Number.isSafeInteger(id)) continue;
        present.delete(id);
        pending.delete(id);
        confirmed.delete(id);
        removeFromBucket(id);
      }
      for (const food of upserts || []) {
        if (!Number.isSafeInteger(food?.id)) continue;
        present.add(food.id);
        trackFood(food);
      }
      for (const id of confirmed) if (!present.has(id)) confirmed.delete(id);
      for (const [id, sentAt] of pending) {
        if (!present.has(id) || now - sentAt >= retryAfterMs) pending.delete(id);
      }
    }

    function reconcile(authoritativeFoods, now) {
      rebuildFoodBuckets(authoritativeFoods);
      for (const id of confirmed) if (!present.has(id)) confirmed.delete(id);
      for (const [id, sentAt] of pending) {
        if (!present.has(id) || now - sentAt >= retryAfterMs) pending.delete(id);
      }
    }

    function collectContacts(point, range, claims, now) {
      const rangeSquared = range * range;
      const minimumCol = Math.floor(point.col - range);
      const maximumCol = Math.floor(point.col + range);
      const minimumRow = Math.floor(point.row - range);
      const maximumRow = Math.floor(point.row + range);
      for (let col = minimumCol; col <= maximumCol; col += 1) {
        for (let row = minimumRow; row <= maximumRow; row += 1) {
          const bucket = foodBuckets.get(bucketCode(col, row));
          if (!bucket) continue;
          for (const food of bucket) {
            if (pending.has(food.id) || confirmed.has(food.id)) continue;
            const deltaCol = point.col - food.col;
            const deltaRow = point.row - food.row;
            if (deltaCol * deltaCol + deltaRow * deltaRow > rangeSquared) continue;
            pending.set(food.id, now);
            claims.push(food.id);
            if (claims.length >= maximumBatchSize) return true;
          }
        }
      }
      return false;
    }

    function detect(player, headRange, bodyRange, now) {
      if (!player || foodBuckets.size === 0) return emptyDetection;
      for (const [id, sentAt] of pending) if (now - sentAt >= retryAfterMs) pending.delete(id);
      const claims = detectionScratch;
      claims.length = 0;
      const segments = Array.isArray(player.segments) ? player.segments : [];
      const safeHeadRange = Math.max(0, Number(headRange) || 0);
      const safeBodyRange = Math.max(0, Number(bodyRange) || 0);
      if (collectContacts(player, safeHeadRange, claims, now)) return claims.slice();
      for (const segment of segments) if (collectContacts(segment, safeBodyRange, claims, now)) break;
      return claims.length > 0 ? claims.slice() : emptyDetection;
    }

    function resolve(requestedFoodIds, claimedFoodIds) {
      accepted.clear();
      for (const id of claimedFoodIds) accepted.add(id);
      for (const id of requestedFoodIds) {
        pending.delete(id);
        if (accepted.has(id)) confirmed.add(id);
      }
    }

    function shouldHide(foodId) {
      return pending.has(foodId) || confirmed.has(foodId);
    }

    function clear() {
      pending.clear();
      confirmed.clear();
      present.clear();
      accepted.clear();
      resetFoodBuckets();
    }

    return Object.freeze({ applyDelta, clear, detect, forEachNearbyFood, reconcile, resolve, shouldHide, trackFood, untrackFood });
  }

  root.GSS0FoodClaimRuntime = Object.freeze({ create });
})(globalThis);
