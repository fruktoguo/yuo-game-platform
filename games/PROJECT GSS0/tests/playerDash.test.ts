import { describe, expect, it } from 'vitest';
import { PLAYER_DASH } from '../src/shared/playerDash';

const TUNING = Object.freeze({
  maximumEnergy: 100,
  recoveryPerSecond: 10,
  costPerSecond: 30,
  minimumDuration: 1,
  startEnergy: 30,
  speedMultiplier: 2,
});

function dashState(energy: number) {
  return { energy, dashing: false, dashElapsed: 0 };
}

describe('玩家能量与突进', () => {
  it('只在拥有至少 30 点能量时启动', () => {
    const belowThreshold = dashState(29);
    expect(PLAYER_DASH.advance(belowThreshold, true, 0, TUNING)).toBe(1);
    expect(belowThreshold.dashing).toBe(false);

    const ready = dashState(30);
    expect(PLAYER_DASH.advance(ready, true, 0, TUNING)).toBe(2);
    expect(ready.dashing).toBe(true);
  });

  it('提前松开仍完成一秒最低持续时间，结束后才恢复能量', () => {
    const state = dashState(100);
    PLAYER_DASH.advance(state, true, 0, TUNING);

    expect(PLAYER_DASH.advance(state, false, 0.4, TUNING)).toBe(2);
    expect(state).toMatchObject({ energy: 88, dashing: true, dashElapsed: 0.4 });
    expect(PLAYER_DASH.advance(state, false, 0.6, TUNING)).toBeCloseTo(2, 8);
    expect(state).toMatchObject({ energy: 70, dashing: false, dashElapsed: 0 });

    expect(PLAYER_DASH.advance(state, false, 0.5, TUNING)).toBe(1);
    expect(state.energy).toBe(75);
  });

  it('满能量可完整突进约 3.33 秒且突进期间不恢复', () => {
    const state = dashState(100);
    const fullDuration = 100 / TUNING.costPerSecond;

    expect(PLAYER_DASH.advance(state, true, fullDuration, TUNING)).toBeCloseTo(2, 8);
    expect(state.energy).toBe(0);
    expect(state.dashing).toBe(false);
    expect(state.dashElapsed).toBe(0);
  });
});
