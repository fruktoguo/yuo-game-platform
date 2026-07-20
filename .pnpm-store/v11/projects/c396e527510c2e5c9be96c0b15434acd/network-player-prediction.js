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
    const correctionRate = Math.max(0.1, Number(options.correctionRate) || 14);
    const snapDistance = Math.max(0.1, Number(options.snapDistance) || 1.5);
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
      segments: []
    };
    const correction = { col: 0, row: 0, angle: 0 };

    function clear() {
      state.initialized = false;
      state.segments.length = 0;
      correction.col = 0;
      correction.row = 0;
      correction.angle = 0;
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
      const authoritativeSegments = authoritative.segments || [];
      for (let index = 0; index < authoritativeSegments.length; index += 1) {
        const source = authoritativeSegments[index];
        const segment = state.segments[index] || (state.segments[index] = { col: 0, row: 0 });
        segment.col = source.col;
        segment.row = source.row;
      }
      state.segments.length = authoritativeSegments.length;
    }

    function followSegments() {
      let previousCol = state.col;
      let previousRow = state.row;
      for (const segment of state.segments) {
        const dx = previousCol - segment.col;
        const dy = previousRow - segment.row;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance > segmentSpacing) {
          segment.col = previousCol - dx / distance * segmentSpacing;
          segment.row = previousRow - dy / distance * segmentSpacing;
        }
        previousCol = segment.col;
        previousRow = segment.row;
      }
    }

    function simulate(duration, desiredAngle, turnRate) {
      const delta = Math.max(0, Math.min(0.1, Number(duration) || 0));
      if (!state.initialized || delta <= 0) return;
      state.desiredAngle = normalizeAngle(desiredAngle);
      state.collisionCooldown = Math.max(0, state.collisionCooldown - delta);
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

    function reconcile(authoritative, pendingInputs, unsentDuration, desiredAngle, turnRate) {
      const hadPrediction = state.initialized;
      const oldDisplayCol = state.col + correction.col;
      const oldDisplayRow = state.row + correction.row;
      const oldDisplayAngle = normalizeAngle(state.angle + correction.angle);
      copyAuthoritative(authoritative);
      for (const input of pendingInputs || []) simulate(input.duration, input.desiredAngle, turnRate);
      simulate(unsentDuration, desiredAngle, turnRate);
      if (!hadPrediction) {
        correction.col = 0;
        correction.row = 0;
        correction.angle = 0;
        return;
      }
      const offsetCol = oldDisplayCol - state.col;
      const offsetRow = oldDisplayRow - state.row;
      if (Math.hypot(offsetCol, offsetRow) <= snapDistance) {
        correction.col = offsetCol;
        correction.row = offsetRow;
      } else {
        correction.col = 0;
        correction.row = 0;
      }
      const offsetAngle = angleDelta(state.angle, oldDisplayAngle);
      correction.angle = Math.abs(offsetAngle) <= Math.PI / 2 ? offsetAngle : 0;
    }

    function update(duration, desiredAngle, turnRate) {
      simulate(duration, desiredAngle, turnRate);
      const damping = Math.exp(-correctionRate * Math.max(0, Number(duration) || 0));
      correction.col *= damping;
      correction.row *= damping;
      correction.angle *= damping;
      if (Math.hypot(correction.col, correction.row) < 0.001) {
        correction.col = 0;
        correction.row = 0;
      }
      if (Math.abs(correction.angle) < 0.001) correction.angle = 0;
    }

    return Object.freeze({ state, correction, clear, reconcile, update });
  }

  root.GSS0PlayerPrediction = Object.freeze({ create });
})(globalThis);
