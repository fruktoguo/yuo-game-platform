import type { OnlinePlayerView } from '@yuo-platform/contracts';
import type { GameStats } from './repository';

export const PRESENCE_TTL_MS = 90_000;
export const GUEST_HEARTBEAT_INTERVAL_SECONDS = 30;

/** 热度权重:启动次数 / 每分钟累计在线时长 / 当前在线人数 */
export const HOTNESS_WEIGHTS = { launch: 10, playMinute: 2, online: 25 } as const;

/** 单次上报最多累计的时长间隔,防止游戏长时间中断后补报造成时长膨胀 */
const MAX_REPORT_GAP_MS = 120_000;

interface PresenceEntry {
  players: OnlinePlayerView[];
  reportedAt: number;
}

export interface GuestPresenceUpdate {
  playSeconds: number;
  expiresAt: number;
}

/**
 * 各游戏在线玩家的内存快照。游戏服周期性全量上报,
 * 超过 PRESENCE_TTL_MS 未刷新的游戏视为无人在线(快照模型自愈)。
 */
export class PresenceTracker {
  private readonly entries = new Map<string, PresenceEntry>();
  private readonly guestEntries = new Map<string, Map<string, number>>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /**
   * 刷新某游戏的在线快照。
   * 返回应按"上一次上报时的在线人数"累计的在线时长秒数(间隔超出上限会被截断)。
   */
  report(gameId: string, players: OnlinePlayerView[]): number {
    const now = this.now();
    const existing = this.entries.get(gameId);
    this.entries.set(gameId, { players, reportedAt: now });
    if (!existing) return 0;
    const elapsedSeconds = Math.min(Math.max(0, (now - existing.reportedAt) / 1000), MAX_REPORT_GAP_MS / 1000);
    return Math.floor(elapsedSeconds * existing.players.length);
  }

  onlinePlayers(gameId: string): OnlinePlayerView[] {
    const entry = this.entries.get(gameId);
    if (!entry || this.now() - entry.reportedAt > PRESENCE_TTL_MS) return [];
    return entry.players;
  }

  startGuest(gameId: string, token: string): GuestPresenceUpdate {
    const now = this.now();
    const entries = this.activeGuestEntries(gameId, now);
    entries.set(token, now);
    this.guestEntries.set(gameId, entries);
    return { playSeconds: 0, expiresAt: now + PRESENCE_TTL_MS };
  }

  heartbeatGuest(gameId: string, token: string): GuestPresenceUpdate | null {
    const now = this.now();
    const entries = this.activeGuestEntries(gameId, now);
    const reportedAt = entries.get(token);
    if (reportedAt === undefined) return null;
    const elapsedSeconds = Math.min(
      Math.max(0, (now - reportedAt) / 1000),
      MAX_REPORT_GAP_MS / 1000,
    );
    entries.set(token, now);
    return { playSeconds: Math.floor(elapsedSeconds), expiresAt: now + PRESENCE_TTL_MS };
  }

  onlineCount(gameId: string): number {
    const namedPlayers = this.onlinePlayers(gameId).length;
    return namedPlayers + this.activeGuestEntries(gameId, this.now()).size;
  }

  private activeGuestEntries(gameId: string, now: number): Map<string, number> {
    const entries = this.guestEntries.get(gameId) ?? new Map<string, number>();
    for (const [token, reportedAt] of entries) {
      if (now - reportedAt > PRESENCE_TTL_MS) entries.delete(token);
    }
    if (entries.size > 0) this.guestEntries.set(gameId, entries);
    else this.guestEntries.delete(gameId);
    return entries;
  }
}

export function computeHotness(stats: GameStats | undefined, onlineNow: number): number {
  const launchCount = stats?.launchCount ?? 0;
  const playSeconds = stats?.playSeconds ?? 0;
  return launchCount * HOTNESS_WEIGHTS.launch
    + Math.floor(playSeconds / 60) * HOTNESS_WEIGHTS.playMinute
    + onlineNow * HOTNESS_WEIGHTS.online;
}
