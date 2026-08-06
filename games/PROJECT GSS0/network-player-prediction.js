(function attachPlayerPrediction(root) {
  "use strict";

  const TAU = Math.PI * 2;
  const bodyPathApi = root.GSS0PlayerBodyPath;
  const dashApi = root.GSS0PlayerDash;
  if (!bodyPathApi) throw new Error("PROJECT GSS0 玩家历史轨迹未加载");
  if (!dashApi) throw new Error("PROJECT GSS0 玩家能量与突进运行时未加载");

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
    const knockbackStopSpeed = Math.max(0, Number(options.knockbackStopSpeed) || 0.04);
    const segmentSpacingOption = options.segmentSpacing;
    const dashTuning = options.dashTuning || {
      maximumEnergy: 100,
      recoveryPerSecond: 10,
      costPerSecond: 30,
      minimumDuration: 1,
      startEnergy: 30,
      speedMultiplier: 2
    };
    const bodyPath = bodyPathApi.create();
    const state = {
      initialized: false,
      ghost: false,
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
      energy: Math.max(0, Number(dashTuning.maximumEnergy) || 0),
      dashing: false,
      dashHeld: false,
      dashElapsed: 0,
      segments: []
    };

    function clear() {
      state.initialized = false;
      state.dashing = false;
      state.dashHeld = false;
      state.dashElapsed = 0;
      state.energy = Math.max(0, Number(dashTuning.maximumEnergy) || 0);
      state.segments.length = 0;
      bodyPath.points.length = 0;
      bodyPath.initialized = false;
      bodyPath.lastAdvance = null;
    }

    function segmentSpacing() {
      return Math.max(0.05, Number(
        typeof segmentSpacingOption === "function" ? segmentSpacingOption() : segmentSpacingOption
      ) || 0.58);
    }

    function copyAuthoritative(authoritative) {
      state.initialized = true;
      state.ghost = Boolean(authoritative.ghost);
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
      state.energy = Math.max(0, Number(authoritative.energy) || 0);
      state.dashing = Boolean(authoritative.dashing);
      state.dashElapsed = state.dashing ? Math.max(0, Number(authoritative.dashElapsed) || 0) : 0;
      state.dashHeld = Boolean(authoritative.dashHeld);
      const authoritativeSegments = authoritative.segments || [];
      for (let index = 0; index < authoritativeSegments.length; index += 1) {
        const source = authoritativeSegments[index];
        const segment = state.segments[index] || (state.segments[index] = { col: 0, row: 0, angle: 0 });
        segment.col = source.col;
        segment.row = source.row;
        segment.angle = Number(source.angle) || 0;
      }
      state.segments.length = authoritativeSegments.length;
      bodyPathApi.reconcile(bodyPath, state, state.segments, segmentSpacing());
    }

    function syncAuthoritative(authoritative) {
      if (!state.initialized || state.ghost !== Boolean(authoritative.ghost)) {
        copyAuthoritative(authoritative);
        return;
      }
      state.foodBoost = Math.max(state.foodBoost, Math.max(0, Number(authoritative.foodBoost) || 0));
      state.invulnerable = Math.max(state.invulnerable, Math.max(0, Number(authoritative.invulnerable) || 0));
      state.energy = Math.max(0, Number(authoritative.energy) || 0);
      state.dashing = Boolean(authoritative.dashing);
      state.dashElapsed = state.dashing ? Math.max(0, Number(authoritative.dashElapsed) || 0) : 0;
      const authoritativeSegments = authoritative.segments || [];
      while (state.segments.length < authoritativeSegments.length) {
        const source = authoritativeSegments[state.segments.length];
        state.segments.push({ col: source.col, row: source.row, angle: Number(source.angle) || 0 });
      }
      if (state.segments.length > authoritativeSegments.length) state.segments.length = authoritativeSegments.length;
      bodyPathApi.resample(bodyPath, state, state.segments, segmentSpacing());
    }

    function adoptLocal(local) {
      const foodBoost = state.foodBoost;
      copyAuthoritative(local);
      state.foodBoost = Math.max(foodBoost, Math.max(0, Number(local.foodBoost) || 0));
    }

    function followSegments() {
      bodyPathApi.advance(bodyPath, state, state.segments, segmentSpacing());
    }

    function correctHead(col, row) {
      if (!state.initialized) return;
      state.col = Number.isFinite(col) ? col : state.col;
      state.row = Number.isFinite(row) ? row : state.row;
      bodyPathApi.correct(bodyPath, state, state.segments, segmentSpacing());
    }

    function simulate(duration, desiredAngle, turnRate, speed, dashHeld = false) {
      const delta = Math.max(0, Math.min(0.1, Number(duration) || 0));
      if (!state.initialized || delta <= 0) return;
      state.dashHeld = Boolean(dashHeld) && !state.ghost;
      const dashMultiplier = state.ghost ? 1 : dashApi.advance(state, state.dashHeld, delta, dashTuning);
      state.speed = Math.max(0, Number(speed) || 0) * dashMultiplier;
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
      if (Math.hypot(state.knockbackX, state.knockbackY) < knockbackStopSpeed) {
        state.knockbackX = 0;
        state.knockbackY = 0;
      }
      followSegments();
    }

    function reconcile(authoritative) {
      syncAuthoritative(authoritative);
    }

    function setDashHeld(held) {
      state.dashHeld = Boolean(held) && !state.ghost;
      if (state.initialized && !state.ghost) dashApi.advance(state, state.dashHeld, 0, dashTuning);
    }

    function update(duration, desiredAngle, turnRate, speed, dashHeld = false) {
      simulate(duration, desiredAngle, turnRate, speed, dashHeld);
    }

    return Object.freeze({ state, clear, reconcile, syncAuthoritative, adoptLocal, correctHead, setDashHeld, update });
  }

  root.GSS0PlayerPrediction = Object.freeze({ create });
})(globalThis);
