export interface SlidingWindowLimiterOptions {
  windowMs: number;
  maximum: number;
  idleTtlMs?: number;
}

interface WindowState {
  timestamps: number[];
  lastSeenAt: number;
}

export class SlidingWindowRateLimiter {
  private readonly states = new Map<string, WindowState>();

  constructor(private readonly options: SlidingWindowLimiterOptions) {
    if (options.windowMs < 1 || options.maximum < 1) throw new Error('限流参数必须为正数');
  }

  consume(key: string, now = Date.now()): boolean {
    const state = this.states.get(key) ?? { timestamps: [], lastSeenAt: now };
    while (state.timestamps.length > 0 && state.timestamps[0] <= now - this.options.windowMs) state.timestamps.shift();
    state.lastSeenAt = now;
    this.states.set(key, state);
    if (state.timestamps.length >= this.options.maximum) return false;
    state.timestamps.push(now);
    return true;
  }

  clear(key: string): void {
    this.states.delete(key);
  }

  sweep(now = Date.now()): void {
    const ttl = this.options.idleTtlMs ?? Math.max(this.options.windowMs * 2, 60_000);
    for (const [key, state] of this.states) {
      if (now - state.lastSeenAt > ttl) this.states.delete(key);
    }
  }

  get size(): number {
    return this.states.size;
  }
}

export class IntervalGate {
  private readonly lastActions = new Map<string, number>();

  constructor(private readonly intervalMs: number) {
    if (intervalMs < 0) throw new Error('间隔不能为负数');
  }

  allow(key: string, now = Date.now()): boolean {
    const previous = this.lastActions.get(key) ?? Number.NEGATIVE_INFINITY;
    if (now - previous < this.intervalMs) return false;
    this.lastActions.set(key, now);
    return true;
  }

  clear(key: string): void {
    this.lastActions.delete(key);
  }
}
