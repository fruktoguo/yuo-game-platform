import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AccountView, GamePulseView, SessionView } from '@yuo-platform/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlatformApp } from '../src/app';
import type { AuthService } from '../src/auth';
import type { PlatformConfig } from '../src/config';
import { PresenceTracker } from '../src/presence';
import type { GameStats, PlatformRepository } from '../src/repository';

const GAME_ID = 'life-commons';
const GUEST_GAME_ID = 'alien-factory';
const SERVICE_TOKEN = 'test-life-service-token';

let server: Server | null = null;
let baseUrl = '';
let now = 1_000_000;
let stats: Map<string, GameStats>;
let repository: PlatformRepository;
let session: SessionView;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = null;
});

beforeEach(async () => {
  now = 1_000_000;
  stats = new Map();
  const account: AccountView = {
    id: '0f5ec0af-a9cc-4f18-a20d-c1f8bd0c6960',
    username: 'tester',
    displayName: '测试玩家',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  session = { account, expiresAt: new Date(Date.now() + 60_000).toISOString() };
  repository = {
    createLaunchTicket: vi.fn(async () => undefined),
    incrementLaunchCount: vi.fn(async (gameId: string) => {
      const current = stats.get(gameId) ?? { launchCount: 0, playSeconds: 0 };
      stats.set(gameId, { ...current, launchCount: current.launchCount + 1 });
    }),
    addPlaySeconds: vi.fn(async (gameId: string, seconds: number) => {
      const current = stats.get(gameId) ?? { launchCount: 0, playSeconds: 0 };
      stats.set(gameId, { ...current, playSeconds: current.playSeconds + seconds });
    }),
    listGameStats: vi.fn(async () => stats),
  } as unknown as PlatformRepository;
  const auth = { resolve: vi.fn(async () => session) } as unknown as AuthService;
  const app = createPlatformApp(platformConfig(), repository, auth, null, new PresenceTracker(() => now));
  server = createServer(app);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

function reportPresence(token: string | null, body: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}/internal/v1/presence/report`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function pulse(): Promise<GamePulseView[]> {
  const response = await fetch(`${baseUrl}/api/v1/games/pulse`);
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.ok).toBe(true);
  return result.data;
}

const PLAYER_A = { accountId: '11111111-1111-4111-8111-111111111111', username: 'alice', displayName: '爱丽丝' };
const PLAYER_B = { accountId: '22222222-2222-4222-8222-222222222222', username: 'bob', displayName: '鲍勃' };

describe('在线上报与 pulse 接口', () => {
  it('缺少服务令牌时拒绝上报', async () => {
    const response = await reportPresence(null, { players: [] });
    expect(response.status).toBe(401);
  });

  it('服务令牌错误时拒绝上报', async () => {
    const response = await reportPresence('wrong-token', { players: [PLAYER_A] });
    expect(response.status).toBe(401);
  });

  it('正确上报后 pulse 反映在在线人数与玩家列表', async () => {
    const report = await reportPresence(SERVICE_TOKEN, { players: [PLAYER_A, PLAYER_B] });
    expect(report.status).toBe(204);

    const games = await pulse();
    const game = games.find((entry) => entry.gameId === GAME_ID);
    expect(game).toBeDefined();
    expect(game!.onlineNow).toBe(2);
    expect(game!.onlinePlayers).toEqual([PLAYER_A, PLAYER_B]);
    expect(game!.hotness).toBe(50);
  });

  it('重复上报按上次在线人数累计时长并写入统计', async () => {
    await reportPresence(SERVICE_TOKEN, { players: [PLAYER_A, PLAYER_B] });
    now += 30_000;
    const second = await reportPresence(SERVICE_TOKEN, { players: [PLAYER_A] });
    expect(second.status).toBe(204);
    expect(repository.addPlaySeconds).toHaveBeenCalledWith(GAME_ID, 60);

    const game = (await pulse()).find((entry) => entry.gameId === GAME_ID)!;
    expect(game.onlineNow).toBe(1);
    expect(game.playSeconds).toBe(60);
    expect(game.hotness).toBe(2 + 25);
  });

  it('按 accountId 去重上报玩家', async () => {
    const report = await reportPresence(SERVICE_TOKEN, { players: [PLAYER_A, PLAYER_A, PLAYER_B] });
    expect(report.status).toBe(204);
    const game = (await pulse()).find((entry) => entry.gameId === GAME_ID)!;
    expect(game.onlineNow).toBe(2);
  });

  it('非法上报体返回 400', async () => {
    expect((await reportPresence(SERVICE_TOKEN, {})).status).toBe(400);
    expect((await reportPresence(SERVICE_TOKEN, { players: 'not-an-array' })).status).toBe(400);
    expect((await reportPresence(SERVICE_TOKEN, { players: [{ accountId: 'not-a-uuid', username: 'alice', displayName: '爱丽丝' }] })).status).toBe(400);
  });

  it('启动游戏后 pulse 的启动次数与热度增加', async () => {
    const launch = await fetch(`${baseUrl}/api/v1/games/${GAME_ID}/launch`, {
      method: 'POST',
      headers: { cookie: `yuo_platform_session=test-session-token` },
    });
    expect(launch.status).toBe(200);
    expect(repository.incrementLaunchCount).toHaveBeenCalledWith(GAME_ID);

    const game = (await pulse()).find((entry) => entry.gameId === GAME_ID)!;
    expect(game.launchCount).toBe(1);
    expect(game.hotness).toBe(10);
  });

  it('未登录时不能启动游戏', async () => {
    const launch = await fetch(`${baseUrl}/api/v1/games/${GAME_ID}/launch`, { method: 'POST' });
    expect(launch.status).toBe(401);
    expect(repository.incrementLaunchCount).not.toHaveBeenCalled();
  });

  it('未登录时可以启动游客单机游戏并立即计入在线', async () => {
    const launch = await fetch(`${baseUrl}/api/v1/games/${GUEST_GAME_ID}/launch`, { method: 'POST' });
    expect(launch.status).toBe(200);
    const result = await launch.json();
    expect(result.ok).toBe(true);
    const launchUrl = new URL(result.data.launchUrl);
    expect(launchUrl.searchParams.get('presence_token')).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(repository.createLaunchTicket).not.toHaveBeenCalled();
    expect(repository.incrementLaunchCount).toHaveBeenCalledWith(GUEST_GAME_ID);

    const game = (await pulse()).find((entry) => entry.gameId === GUEST_GAME_ID)!;
    expect(game.onlineNow).toBe(1);
    expect(game.onlinePlayers).toEqual([]);
  });

  it('匿名心跳累计游玩时长，失效票据会建立新会话', async () => {
    const start = await fetch(`${baseUrl}/api/v1/games/${GUEST_GAME_ID}/presence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(start.status).toBe(200);
    const started = await start.json();
    const token = started.data.token as string;
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(repository.incrementLaunchCount).toHaveBeenCalledWith(GUEST_GAME_ID);

    now += 30_000;
    const heartbeat = await fetch(`${baseUrl}/api/v1/games/${GUEST_GAME_ID}/presence`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    expect(heartbeat.status).toBe(200);
    expect(repository.addPlaySeconds).toHaveBeenCalledWith(GUEST_GAME_ID, 30);
  });
});

function platformConfig(): PlatformConfig {
  return {
    host: '127.0.0.1',
    port: 3100,
    publicBaseUrl: 'http://127.0.0.1:3100',
    databaseUrl: 'postgres://unused',
    sessionCookieName: 'yuo_platform_session',
    sessionTtlSeconds: 3_600,
    secureCookies: false,
    auth: {
      localEnabled: false,
      external: null,
    },
    games: [
      {
        manifest: {
          id: GAME_ID,
          slug: GAME_ID,
          name: '生命战争',
          shortDescription: '测试游戏',
          coverUrl: '/cover.png',
          launchMode: 'navigate',
          access: 'account',
          status: 'online',
          capabilities: { realtime: true, persistentState: true, wallet: 'none' },
          tags: ['strategy'],
          sortOrder: 10,
        },
        launchUrl: 'http://127.0.0.1:3101',
        serviceToken: SERVICE_TOKEN,
      },
      {
        manifest: {
          id: GUEST_GAME_ID,
          slug: GUEST_GAME_ID,
          name: '异星工厂',
          shortDescription: '测试单机游戏',
          coverUrl: '/alien-factory-cover.png',
          launchMode: 'navigate',
          access: 'guest',
          status: 'online',
          capabilities: { realtime: false, persistentState: true, wallet: 'none' },
          tags: ['single-player'],
          sortOrder: 20,
        },
        launchUrl: 'http://127.0.0.1:5178',
        serviceToken: null,
        staticClientDirectory: 'games/factory-idle/dist/client',
      },
    ],
  };
}
