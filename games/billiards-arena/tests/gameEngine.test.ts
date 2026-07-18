import { describe, expect, it, vi } from 'vitest';
import { TABLE } from '../src/shared/geometry';
import { GameEngine } from '../src/server/gameEngine';

describe('服务器权威球局', () => {
  it('开局只允许开球方在开球线后合法放置母球', () => {
    const onSnapshot = vi.fn();
    const engine = new GameEngine(['player-a', 'player-b'], 0, {
      onSnapshot,
      onEvent: vi.fn(),
      onStateChange: vi.fn(),
      onFinished: vi.fn(),
    });

    expect(engine.placeCue('player-b', TABLE.headStringX - 0.2, 0)).toBe('当前不能放置母球');
    expect(engine.placeCue('player-a', TABLE.headStringX + 0.1, 0)).toBe('开球时母球必须放在开球线后方');
    expect(engine.placeCue('player-a', TABLE.headStringX - 0.2, 0)).toBeNull();
    expect(engine.getSnapshot().phase).toBe('aiming');
    expect(onSnapshot).toHaveBeenCalled();
    engine.dispose();
  });

  it('拒绝非当前球手击球并限制无效参数', () => {
    const engine = new GameEngine(['player-a', 'player-b'], 0, {
      onSnapshot: vi.fn(),
      onEvent: vi.fn(),
      onStateChange: vi.fn(),
      onFinished: vi.fn(),
    });
    engine.placeCue('player-a', TABLE.headStringX - 0.2, 0);
    expect(engine.shoot('player-b', { angle: 0, power: 0.5, spinX: 0, spinY: 0 })).toBe('还未轮到你击球');
    expect(engine.shoot('player-a', { angle: Number.NaN, power: 0.5, spinX: 0, spinY: 0 })).toBe('击球参数无效');
    engine.dispose();
  });
});
