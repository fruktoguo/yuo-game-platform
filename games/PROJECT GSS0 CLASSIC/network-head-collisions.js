(function attachNetworkHeadCollisions(root) {
  "use strict";

  function normalized(col, row) {
    const length = Math.hypot(col, row);
    if (!Number.isFinite(length) || length < 0.001) return null;
    return { col: col / length, row: row / length };
  }

  function create(options = {}) {
    const cooldownMs = Math.max(1, Number(options.cooldownMs) || 500);
    const eventGraceValue = Number(options.eventGraceMs);
    const eventGraceMs = Math.max(0, Number.isFinite(eventGraceValue) ? eventGraceValue : 120);
    const impulseDistance = Math.max(0, Number(options.impulseDistance) || 0);
    const impulseDurationMs = Math.max(1, (Number(options.impulseDuration) || 0.24) * 1000);
    const recentPairs = new Map();
    const seenEvents = new Map();
    const remoteImpulses = new Map();
    const pendingEvents = [];

    function pairKey(leftEntityId, rightEntityId) {
      return leftEntityId < rightEntityId
        ? `${leftEntityId}:${rightEntityId}`
        : `${rightEntityId}:${leftEntityId}`;
    }

    function eventId(sourceEntityId, sequence) {
      return `${sourceEntityId}:${sequence}`;
    }

    function prune(now) {
      for (const [key, at] of recentPairs) if (now - at > cooldownMs * 4) recentPairs.delete(key);
      const eventRetention = Math.max(cooldownMs * 8, eventGraceMs + 1000);
      for (const [id, at] of seenEvents) if (now - at > eventRetention) seenEvents.delete(id);
      for (const [entityId, impulse] of remoteImpulses) {
        if (now - impulse.startedAt >= impulseDurationMs) remoteImpulses.delete(entityId);
      }
    }

    function isPairCooling(leftEntityId, rightEntityId, now) {
      const at = recentPairs.get(pairKey(leftEntityId, rightEntityId));
      return Number.isFinite(at) && now - at < cooldownMs;
    }

    function markPair(leftEntityId, rightEntityId, now) {
      recentPairs.set(pairKey(leftEntityId, rightEntityId), now);
    }

    function startRemoteImpulse(entityId, normalCol, normalRow, now) {
      const normal = normalized(normalCol, normalRow);
      if (!Number.isSafeInteger(entityId) || entityId <= 0 || !normal || impulseDistance <= 0) return;
      remoteImpulses.set(entityId, {
        normalCol: normal.col,
        normalRow: normal.row,
        startedAt: now
      });
    }

    function markLocal(sourceEntityId, targetEntityId, sequence, normalCol, normalRow, now) {
      const id = eventId(sourceEntityId, sequence);
      seenEvents.set(id, now);
      markPair(sourceEntityId, targetEntityId, now);
      startRemoteImpulse(targetEntityId, -normalCol, -normalRow, now);
      prune(now);
      return id;
    }

    function receive(event, now) {
      if (
        !event
        || typeof event !== "object"
        || typeof event.id !== "string"
        || !Number.isSafeInteger(event.sourceEntityId)
        || !Number.isSafeInteger(event.targetEntityId)
        || event.sourceEntityId <= 0
        || event.targetEntityId <= 0
        || event.sourceEntityId === event.targetEntityId
        || !normalized(event.normalCol, event.normalRow)
      ) return false;
      if (seenEvents.has(event.id)) return false;
      seenEvents.set(event.id, now);
      pendingEvents.push({ event, receivedAt: now });
      if (pendingEvents.length > 128) pendingEvents.splice(0, pendingEvents.length - 128);
      prune(now);
      return true;
    }

    function takeReady(now, isVisuallyReady) {
      const ready = [];
      let writeIndex = 0;
      for (const pending of pendingEvents) {
        const release = now - pending.receivedAt >= eventGraceMs || isVisuallyReady(pending.event);
        if (release) ready.push(pending.event);
        else {
          pendingEvents[writeIndex] = pending;
          writeIndex += 1;
        }
      }
      pendingEvents.length = writeIndex;
      prune(now);
      return ready;
    }

    function apply(event, selfEntityId, now) {
      if (isPairCooling(event.sourceEntityId, event.targetEntityId, now)) return false;
      markPair(event.sourceEntityId, event.targetEntityId, now);
      if (event.sourceEntityId !== selfEntityId) {
        startRemoteImpulse(event.sourceEntityId, event.normalCol, event.normalRow, now);
      }
      if (event.targetEntityId !== selfEntityId) {
        startRemoteImpulse(event.targetEntityId, -event.normalCol, -event.normalRow, now);
      }
      return true;
    }

    function offsetFor(entityId, now) {
      const impulse = remoteImpulses.get(entityId);
      if (!impulse) return null;
      const progress = (now - impulse.startedAt) / impulseDurationMs;
      if (progress >= 1) {
        remoteImpulses.delete(entityId);
        return null;
      }
      const distance = impulseDistance * Math.sin(Math.PI * Math.max(0, progress));
      return {
        col: impulse.normalCol * distance,
        row: impulse.normalRow * distance
      };
    }

    function clear() {
      recentPairs.clear();
      seenEvents.clear();
      remoteImpulses.clear();
      pendingEvents.length = 0;
    }

    return Object.freeze({
      apply,
      clear,
      eventId,
      isPairCooling,
      markLocal,
      offsetFor,
      receive,
      takeReady
    });
  }

  root.GSS0NetworkHeadCollisions = Object.freeze({ create });
})(globalThis);
