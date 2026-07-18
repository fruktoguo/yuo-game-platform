import { describe, expect, it } from 'vitest';
import { IntervalGate, SlidingWindowRateLimiter } from '../src';

describe('共享实时限流', () => {
  it('滑动窗口只接受限定次数并在窗口后恢复', () => {
    const limiter = new SlidingWindowRateLimiter({ windowMs: 1_000, maximum: 2 });
    expect(limiter.consume('player', 0)).toBe(true);
    expect(limiter.consume('player', 100)).toBe(true);
    expect(limiter.consume('player', 200)).toBe(false);
    expect(limiter.consume('player', 1_001)).toBe(true);
  });

  it('固定间隔按身份彼此隔离', () => {
    const gate = new IntervalGate(500);
    expect(gate.allow('a', 100)).toBe(true);
    expect(gate.allow('a', 599)).toBe(false);
    expect(gate.allow('b', 200)).toBe(true);
    expect(gate.allow('a', 600)).toBe(true);
  });
});
