export interface GSS0PlayerDashState {
  energy: number;
  dashing: boolean;
  dashElapsed: number;
}

export interface GSS0PlayerDashTuning {
  maximumEnergy: number;
  recoveryPerSecond: number;
  costPerSecond: number;
  minimumDuration: number;
  startEnergy: number;
  speedMultiplier: number;
}

export interface GSS0PlayerDashApi {
  advance(
    state: GSS0PlayerDashState,
    held: boolean,
    duration: number,
    tuning: GSS0PlayerDashTuning,
  ): number;
}

declare global {
  var GSS0PlayerDash: GSS0PlayerDashApi;
}
