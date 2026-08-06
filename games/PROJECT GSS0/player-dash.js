(function attachPlayerDash(root) {
  "use strict";

  const EPSILON = 1e-7;

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function normalizeTuning(tuning = {}) {
    return {
      maximumEnergy: Math.max(0, finite(tuning.maximumEnergy, 100)),
      recoveryPerSecond: Math.max(0, finite(tuning.recoveryPerSecond, 10)),
      costPerSecond: Math.max(0, finite(tuning.costPerSecond, 30)),
      minimumDuration: Math.max(0, finite(tuning.minimumDuration, 1)),
      startEnergy: Math.max(0, finite(tuning.startEnergy, 30)),
      speedMultiplier: Math.max(0, finite(tuning.speedMultiplier, 2))
    };
  }

  function normalizeState(state, tuning) {
    state.energy = Math.max(0, Math.min(tuning.maximumEnergy, finite(state.energy, tuning.maximumEnergy)));
    state.dashing = Boolean(state.dashing);
    state.dashElapsed = state.dashing ? Math.max(0, finite(state.dashElapsed)) : 0;
  }

  function settleInstantTransition(state, held, tuning) {
    if (
      state.dashing
      && state.dashElapsed + EPSILON >= tuning.minimumDuration
      && (!held || state.energy <= EPSILON)
    ) {
      state.dashing = false;
      state.dashElapsed = 0;
    }
    if (!state.dashing && held && state.energy + EPSILON >= tuning.startEnergy) {
      state.dashing = true;
      state.dashElapsed = 0;
    }
  }

  function advance(state, held, duration, sourceTuning) {
    const tuning = normalizeTuning(sourceTuning);
    const totalDuration = Math.max(0, finite(duration));
    const wantsDash = Boolean(held);
    normalizeState(state, tuning);
    settleInstantTransition(state, wantsDash, tuning);

    let remaining = totalDuration;
    let dashDuration = 0;
    let guard = 0;
    while (remaining > EPSILON && guard < 16) {
      guard += 1;
      if (!state.dashing) {
        if (state.energy >= tuning.maximumEnergy - EPSILON || tuning.recoveryPerSecond <= EPSILON) {
          state.energy = Math.min(tuning.maximumEnergy, state.energy + tuning.recoveryPerSecond * remaining);
          remaining = 0;
          break;
        }
        const energyTarget = wantsDash
          ? Math.min(tuning.maximumEnergy, tuning.startEnergy)
          : tuning.maximumEnergy;
        const timeToTarget = Math.max(0, (energyTarget - state.energy) / tuning.recoveryPerSecond);
        const recoveryDuration = Math.min(remaining, timeToTarget > EPSILON ? timeToTarget : remaining);
        state.energy = Math.min(tuning.maximumEnergy, state.energy + tuning.recoveryPerSecond * recoveryDuration);
        remaining -= recoveryDuration;
        settleInstantTransition(state, wantsDash, tuning);
        if (!state.dashing && recoveryDuration <= EPSILON) {
          state.energy = Math.min(tuning.maximumEnergy, state.energy + tuning.recoveryPerSecond * remaining);
          remaining = 0;
        }
        continue;
      }

      let activeDuration = remaining;
      if (state.dashElapsed + EPSILON < tuning.minimumDuration) {
        activeDuration = Math.min(activeDuration, tuning.minimumDuration - state.dashElapsed);
      } else if (tuning.costPerSecond > EPSILON && state.energy > EPSILON) {
        activeDuration = Math.min(activeDuration, state.energy / tuning.costPerSecond);
      }
      if (activeDuration <= EPSILON) {
        settleInstantTransition(state, wantsDash, tuning);
        if (state.dashing) {
          activeDuration = remaining;
        } else continue;
      }
      state.dashElapsed += activeDuration;
      state.energy = Math.max(0, state.energy - tuning.costPerSecond * activeDuration);
      dashDuration += activeDuration;
      remaining -= activeDuration;
      settleInstantTransition(state, wantsDash, tuning);
    }

    if (remaining > EPSILON) {
      if (state.dashing) {
        state.dashElapsed += remaining;
        state.energy = Math.max(0, state.energy - tuning.costPerSecond * remaining);
        dashDuration += remaining;
      } else {
        state.energy = Math.min(tuning.maximumEnergy, state.energy + tuning.recoveryPerSecond * remaining);
      }
    }
    if (state.energy < EPSILON) state.energy = 0;
    if (tuning.maximumEnergy - state.energy < EPSILON) state.energy = tuning.maximumEnergy;
    settleInstantTransition(state, wantsDash, tuning);

    const dashRatio = totalDuration > EPSILON ? Math.max(0, Math.min(1, dashDuration / totalDuration)) : Number(state.dashing);
    return 1 + (tuning.speedMultiplier - 1) * dashRatio;
  }

  root.GSS0PlayerDash = Object.freeze({ advance });
})(globalThis);
