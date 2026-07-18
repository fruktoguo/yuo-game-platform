import type { GameManifest } from '@yuo-platform/contracts';

export interface RegisteredGame {
  manifest: GameManifest;
  launchUrl: string;
  serviceToken: string;
}

export interface PlatformConfig {
  host: string;
  port: number;
  publicBaseUrl: string;
  databaseUrl: string;
  sessionCookieName: string;
  sessionTtlSeconds: number;
  secureCookies: boolean;
  games: RegisteredGame[];
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): PlatformConfig {
  const port = parsePort(environment.PORT, 3100);
  const publicBaseUrl = environment.PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;
  return {
    host: environment.HOST ?? '0.0.0.0',
    port,
    publicBaseUrl,
    databaseUrl: environment.DATABASE_URL ?? 'postgres://game_platform:game_platform@127.0.0.1:54329/game_platform',
    sessionCookieName: environment.SESSION_COOKIE_NAME ?? 'yuo_platform_session',
    sessionTtlSeconds: parseInteger(environment.SESSION_TTL_SECONDS, 7 * 24 * 60 * 60, 300, 30 * 24 * 60 * 60),
    secureCookies: environment.COOKIE_SECURE === 'true' || (environment.COOKIE_SECURE !== 'false' && publicBaseUrl.startsWith('https://')),
    games: [
      {
        manifest: {
          id: 'life-commons',
          slug: 'life-commons',
          name: '生命战争',
          shortDescription: '争夺区域、封锁领地，在共享康威世界中率先获胜',
          coverUrl: '/life-commons-cover.png',
          launchMode: 'navigate',
          status: 'online',
          capabilities: { realtime: true, persistentState: true, wallet: 'none' },
          sortOrder: 10,
        },
        launchUrl: environment.LIFE_LAUNCH_URL ?? 'http://127.0.0.1:3101',
        serviceToken: environment.LIFE_SERVICE_TOKEN ?? 'dev-life-service-token-change-before-production-2026',
      },
      {
        manifest: {
          id: 'billiards-arena',
          slug: 'billiards-arena',
          name: 'Breakline 台球',
          shortDescription: '标准八球规则下的实时双人 3D 对局',
          coverUrl: '/billiards-cover.png',
          launchMode: 'navigate',
          status: 'online',
          capabilities: { realtime: true, persistentState: false, wallet: 'none' },
          sortOrder: 20,
        },
        launchUrl: environment.BILLIARDS_LAUNCH_URL ?? 'http://127.0.0.1:3102',
        serviceToken: environment.BILLIARDS_SERVICE_TOKEN ?? 'dev-billiards-service-token-change-before-production-2026',
      },
      {
        manifest: {
          id: 'neon-snake-arena',
          slug: 'neon-snake-arena',
          name: '炫彩贪吃蛇',
          shortDescription: '原版肉鸽 PvE 与多人 PvP 同场展开的 Ultra 生存行动',
          coverUrl: '/neon-snake-cover.png',
          launchMode: 'navigate',
          status: 'online',
          capabilities: { realtime: true, persistentState: true, wallet: 'none' },
          sortOrder: 30,
        },
        launchUrl: environment.SNAKE_LAUNCH_URL ?? 'http://127.0.0.1:3103',
        serviceToken: environment.SNAKE_SERVICE_TOKEN ?? 'dev-snake-service-token-change-before-production-2026',
      },
    ],
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  return parseInteger(value, fallback, 1, 65_535);
}

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
