import type { OnlinePlayerView } from '@yuo-platform/contracts';
import { describe, expect, it } from 'vitest';
import { computeHotness, PRESENCE_TTL_MS, PresenceTracker } from '../src/presence';
import type { GameStats } from '../src/repository';

function player(accountId: string, username = `user-${accountId.slice(0, 4)}`): OnlinePlayerView {
  return { accountId, username, displayName: `玩家 ${username}` };
}

function trackerAt(start: number) {
  let now = start;
  return {
    tracker: new PresenceTracker(() => now),
    advance(ms: number) {
      now += ms;
    },
  };
}

describe('PresenceTracker', () => {
  it('首次上报返回 0 秒并可查询在线玩家', () => {
    const { tracker } = trackerAt(1_000_000);
    const players = [player('11111111-1111-4111-8111-111111111111')];
    expect(tracker.report('life-commons', players)).toBe(0);
    expect(tracker.onlinePlayers('life-commons')).toEqual(players);
  });

  it('按上报间隔乘以上次在线人数累计时长', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.report('life-commons', [player('11111111-1111-4111-8111-111111111111'), player('22222222-2222-4222-8222-222222222222')]);
    advance(30_000);
    expect(tracker.report('life-commons', [])).toBe(60);
    advance(30_000);
    expect(tracker.report('life-commons', [])).toBe(0);
  });

  it('上报间隔超过 120 秒时按上限截断', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.report('life-commons', [
      player('11111111-1111-4111-8111-111111111111'),
      player('22222222-2222-4222-8222-222222222222'),
      player('33333333-3333-4333-8333-333333333333'),
    ]);
    advance(300_000);
    expect(tracker.report('life-commons', [])).toBe(120 * 3);
  });

  it('超过 TTL 未刷新的游戏视为无人在线', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.report('life-commons', [player('11111111-1111-4111-8111-111111111111')]);
    advance(PRESENCE_TTL_MS);
    expect(tracker.onlinePlayers('life-commons')).toHaveLength(1);
    advance(1);
    expect(tracker.onlinePlayers('life-commons')).toEqual([]);
  });

  it('新上报整体替换旧快照', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.report('life-commons', [player('11111111-1111-4111-8111-111111111111')]);
    advance(10_000);
    const next = [player('22222222-2222-4222-8222-222222222222')];
    tracker.report('life-commons', next);
    expect(tracker.onlinePlayers('life-commons')).toEqual(next);
  });

  it('不同游戏的快照相互独立', () => {
    const { tracker } = trackerAt(1_000_000);
    tracker.report('life-commons', [player('11111111-1111-4111-8111-111111111111')]);
    expect(tracker.onlinePlayers('billiards-arena')).toEqual([]);
  });

  it('匿名单机心跳计入在线人数但不暴露玩家身份', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.startGuest('alien-factory', 'guest-token-a');
    expect(tracker.onlineCount('alien-factory')).toBe(1);
    expect(tracker.onlinePlayers('alien-factory')).toEqual([]);

    advance(30_000);
    expect(tracker.heartbeatGuest('alien-factory', 'guest-token-a')).toMatchObject({ playSeconds: 30 });
  });

  it('匿名票据过期后自动移出在线统计', () => {
    const { tracker, advance } = trackerAt(1_000_000);
    tracker.startGuest('alien-factory', 'guest-token-a');
    advance(PRESENCE_TTL_MS + 1);
    expect(tracker.onlineCount('alien-factory')).toBe(0);
    expect(tracker.heartbeatGuest('alien-factory', 'guest-token-a')).toBeNull();
  });
});

describe('computeHotness', () => {
  it('按启动次数、累计分钟和在线人数加权求和', () => {
    const stats: GameStats = { launchCount: 5, playSeconds: 180 };
    expect(computeHotness(stats, 2)).toBe(5 * 10 + 3 * 2 + 2 * 25);
  });

  it('累计时长不足一分钟的部分不计分', () => {
    const stats: GameStats = { launchCount: 0, playSeconds: 119 };
    expect(computeHotness(stats, 0)).toBe(2);
  });

  it('无统计数据时只计算在线人数', () => {
    expect(computeHotness(undefined, 3)).toBe(75);
    expect(computeHotness(undefined, 0)).toBe(0);
  });
});
