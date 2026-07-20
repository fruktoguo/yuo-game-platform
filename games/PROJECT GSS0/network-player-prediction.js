(function attachPlayerPrediction(root) {
  "use strict";

  const TAU = Math.PI * 2;

  function normalizeAngle(value) {
    return (value % TAU + TAU) % TAU;
  }

  function angleDelta(from, to) {
    return (to - from + Math.PI * 3) % TAU - Math.PI;
  }

  function rotateToward(from, to, amount) {
    const delta = angleDelta(from, to);
    return normalizeAngle(from + Math.sign(delta) * Math.min(Math.abs(delta), amount));
  }

  function create(options = {}) {
    const knockbackDecay = Math.max(0, Number(options.knockbackDecay) || 8);
    const segmentSpacing = Math.max(0.05, Number(options.segmentSpacing) || 0.58);
    const state = {
      initialized: false,
      col: 0,
      row: 0,
      angle: 0,
      desiredAngle: 0,
      speed: 0,
      knockbackX: 0,
      knockbackY: 0,
      collisionCooldown: 0,
      slow: 0,
      foodBoost: 0,
      invulnerable: 0,
      segments: []
    };

    function clear() {
      state.initialized = false;
      state.segments.length = 0;
    }

    function copyAuthoritative(authoritative) {
      state.initialized = true;
      state.col = authoritative.col;
      state.row = authoritative.row;
      state.angle = authoritative.angle;
      state.desiredAngle = authoritative.desiredAngle;
      state.speed = Math.max(0, Number(authoritative.speed) || 0);
      state.knockbackX = Number(authoritative.knockbackX) || 0;
      state.knockbackY = Number(authoritative.knockbackY) || 0;
      state.collisionCooldown = Math.max(0, Number(authoritative.collisionCooldown) || 0);
      state.slow = Math.max(0, Number(authoritative.slow) || 0);
      state.foodBoost = Math.max(0, Number(authoritative.foodBoost) || 0);
      state.invulnerable = Math.max(0, Number(authoritative.invulnerable) || 0);
      const authoritativeSegments = authoritative.segments || [];
      for (let index = 0; index < authoritativeSegments.length; index += 1) {
        const source = authoritativeSegments[index];
        const segment = state.segments[index] || (state.segments[index] = { col: 0, row: 0, angle: 0 });
        segment.col = source.col;
        segment.row = source.row;
        segment.angle = Number(source.angle) || 0;
      }
      state.segments.length = authoritativeSegments.length;
    }

    function syncAuthoritative(authoritative) {
      if (!state.initialized) {
        copyAuthoritative(authoritative);
        return;
      }
      state.foodBoost = Math.max(state.foodBoost, Math.max(0, Number(authoritative.foodBoost) || 0));
      state.invulnerable = Math.max(state.invulnerable, Math.max(0, Number(authoritative.invulnerable) || 0));
      const authoritativeSegments = authoritative.segments || [];
      while (state.segments.length < authoritativeSegments.length) {
        const source = authoritativeSegments[state.segments.length];
        state.segments.push({ col: source.col, row: source.row, angle: Number(source.angle) || 0 });
      }
      if (state.segments.length > authoritativeSegments.length) state.segments.length = authoritativeSegments.length;
    }

    function adoptLocal(local) {
      const foodBoost = state.foodBoost;
      copyAuthoritative(local);
      state.foodBoost = Math.max(foodBoost, Math.max(0, Number(local.foodBoost) || 0));
    }

    function followSegments() {
      let previousCol = state.col;
      let previousRow = state.row;
      for (const segment of state.segments) {
        const dx = previousCol - segment.col;
        const dy = previousRow - segment.row;
        const distance = Math.hypot(dx, dy) || 1;
        segment.angle = Math.atan2(dy, dx);
        if (distance > segmentSpacing) {
          segment.col = previousCol - dx / distance * segmentSpacing;
          segment.row = previousRow - dy / distance * segmentSpacing;
        }
        previousCol = segment.col;
        previousRow = segment.row;
      }
    }

    function simulate(duration, desiredAngle, turnRate, speed) {
      const delta = Math.max(0, Math.min(0.1, Number(duration) || 0));
      if (!state.initialized || delta <= 0) return;
      state.speed = Math.max(0, Number(speed) || 0);
      state.desiredAngle = normalizeAngle(desiredAngle);
      state.collisionCooldown = Math.max(0, state.collisionCooldown - delta);
      state.slow = Math.max(0, state.slow - delta);
      state.foodBoost = Math.max(0, state.foodBoost - delta);
      state.invulnerable = Math.max(0, state.invulnerable - delta);
      if (state.collisionCooldown > 0) state.desiredAngle = state.angle;
      else state.angle = rotateToward(state.angle, state.desiredAngle, Math.max(0, turnRate) * delta);
      state.col += (Math.cos(state.angle) * state.speed + state.knockbackX) * delta;
      state.row += (Math.sin(state.angle) * state.speed + state.knockbackY) * delta;
      const damping = Math.exp(-knockbackDecay * delta);
      state.knockbackX *= damping;
      state.knockbackY *= damping;
      if (Math.hypot(state.knockbackX, state.knockbackY) < 0.04) {
        state.knockbackX = 0;
        state.knockbackY = 0;
      }
      followSegments();
    }

    function reconcile(authoritative) {
      syncAuthoritative(authoritative);
    }

    function update(duration, desiredAngle, turnRate, speed) {
      simulate(duration, desiredAngle, turnRate, speed);
    }

    return Object.freeze({ state, clear, reconcile, syncAuthoritative, adoptLocal, update });
  }

  root.GSS0PlayerPrediction = Object.freeze({ create });
})(globalThis);
