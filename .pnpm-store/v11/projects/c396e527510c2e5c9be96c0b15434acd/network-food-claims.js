(function attachFoodClaimRuntime(root) {
  "use strict";

  function create(options = {}) {
    const maximumBatchSize = Math.max(1, Math.floor(options.maximumBatchSize || 32));
    const retryAfterMs = Math.max(100, Number(options.retryAfterMs) || 750);
    const pending = new Map();
    const confirmed = new Set();
    const present = new Set();
    const accepted = new Set();
    const bodyBuckets = new Map();
    const bodyBucketPool = [];

    function bucketCode(col, row) {
      return (Math.floor(col) + 32768) * 65536 + Math.floor(row) + 32768;
    }

    function resetBodyBuckets() {
      for (const bucket of bodyBuckets.values()) {
        bucket.length = 0;
        bodyBucketPool.push(bucket);
      }
      bodyBuckets.clear();
    }

    function reconcile(authoritativeFoods, now) {
      present.clear();
      for (const item of authoritativeFoods) {
        const id = typeof item === "number" ? item : item?.id;
        if (Number.isSafeInteger(id)) present.add(id);
      }
      for (const id of confirmed) if (!present.has(id)) confirmed.delete(id);
      for (const [id, sentAt] of pending) {
        if (!present.has(id) || now - sentAt >= retryAfterMs) pending.delete(id);
      }
    }

    function detect(player, foods, headRange, bodyRange, now) {
      if (!player || !Array.isArray(foods) || foods.length === 0) {
        resetBodyBuckets();
        return [];
      }
      const claims = [];
      const segments = Array.isArray(player.segments) ? player.segments : [];
      const safeHeadRange = Math.max(0, Number(headRange) || 0);
      const safeBodyRange = Math.max(0, Number(bodyRange) || 0);
      const headRangeSquared = safeHeadRange * safeHeadRange;
      const bodyRangeSquared = safeBodyRange * safeBodyRange;
      resetBodyBuckets();
      for (const segment of segments) {
        const key = bucketCode(segment.col, segment.row);
        let bucket = bodyBuckets.get(key);
        if (bucket) bucket.push(segment);
        else {
          bucket = bodyBucketPool.pop() || [];
          bucket.push(segment);
          bodyBuckets.set(key, bucket);
        }
      }

      for (const food of foods) {
        if (claims.length >= maximumBatchSize) break;
        if (!Number.isSafeInteger(food?.id) || pending.has(food.id) || confirmed.has(food.id)) continue;
        const headCol = player.col - food.col;
        const headRow = player.row - food.row;
        let contact = headCol * headCol + headRow * headRow <= headRangeSquared;
        if (!contact) {
          const minimumCol = Math.floor(food.col - safeBodyRange);
          const maximumCol = Math.floor(food.col + safeBodyRange);
          const minimumRow = Math.floor(food.row - safeBodyRange);
          const maximumRow = Math.floor(food.row + safeBodyRange);
          for (let colIndex = minimumCol; colIndex <= maximumCol && !contact; colIndex += 1) {
            for (let rowIndex = minimumRow; rowIndex <= maximumRow && !contact; rowIndex += 1) {
              const bucket = bodyBuckets.get(bucketCode(colIndex, rowIndex));
              if (!bucket) continue;
              for (const segment of bucket) {
                const col = segment.col - food.col;
                const row = segment.row - food.row;
                if (col * col + row * row > bodyRangeSquared) continue;
                contact = true;
                break;
              }
            }
          }
        }
        if (!contact) continue;
        pending.set(food.id, now);
        claims.push(food.id);
      }
      return claims;
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
      resetBodyBuckets();
    }

    return Object.freeze({ clear, detect, reconcile, resolve, shouldHide });
  }

  root.GSS0FoodClaimRuntime = Object.freeze({ create });
})(globalThis);
