import type { GameManifest } from '@yuo-platform/contracts';

export interface RegisteredGame {
  manifest: GameManifest;
  launchUrl: string;
  serviceToken: string;
}

export type ExternalAuthImplementation = 'newapi-node-studio-v1';

export interface ExternalAuthConfig {
  implementation: ExternalAuthImplementation;
  providerId: string;
  providerName: string;
  entryUrl: string;
  issuerUrl: string;
  handoffSecret: string;
  handoffMaxTtlSeconds: number;
  validationTimeoutMs: number;
}

export interface PlatformAuthConfig {
  localEnabled: boolean;
  external: ExternalAuthConfig | null;
}

export interface PlatformConfig {
  host: string;
  port: number;
  publicBaseUrl: string;
  databaseUrl: string;
  sessionCookieName: string;
  sessionTtlSeconds: number;
  secureCookies: boolean;
  auth: PlatformAuthConfig;
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
    auth: loadAuthConfig(environment),
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
          name: '代号：几何贪吃蛇',
          shortDescription: '鸽鸽的联机肉鸽贪吃蛇！',
          coverUrl: '/neon-snake-cover.png',
          launchMode: 'navigate',
          status: 'online',
          capabilities: { realtime: true, persistentState: true, wallet: 'none' },
          sortOrder: 30,
        },
        launchUrl: environment.SNAKE_LAUNCH_URL ?? 'http://127.0.0.1:3103',
        serviceToken: environment.SNAKE_SERVICE_TOKEN ?? 'dev-snake-service-token-change-before-production-2026',
      },
      {
        manifest: {
          id: 'farstar-foundry',
          slug: 'farstar-foundry',
          name: '远星工造',
          shortDescription: '开设密码房间，与伙伴共同经营持续运转的文字自动化工厂',
          coverUrl: '/farstar-foundry-cover.png?v=2',
          launchMode: 'navigate',
          status: 'online',
          capabilities: { realtime: true, persistentState: true, wallet: 'none' },
          sortOrder: 40,
        },
        launchUrl: environment.FOUNDRY_LAUNCH_URL ?? 'http://127.0.0.1:3104',
        serviceToken: environment.FOUNDRY_SERVICE_TOKEN ?? 'dev-foundry-service-token-change-before-production-2026',
      },
    ],
  };
}

function loadAuthConfig(environment: NodeJS.ProcessEnv): PlatformAuthConfig {
  const localEnabled = parseBoolean(environment.AUTH_LOCAL_ENABLED, true);
  const implementation = environment.AUTH_EXTERNAL_IMPLEMENTATION?.trim() || 'disabled';
  if (implementation === 'disabled') {
    if (!localEnabled) throw new Error('至少需要启用一种身份认证实现');
    return { localEnabled, external: null };
  }
  if (implementation !== 'newapi-node-studio-v1') {
    throw new Error(`不支持的外部身份实现：${implementation}`);
  }

  const providerId = required(environment.AUTH_EXTERNAL_PROVIDER_ID, 'AUTH_EXTERNAL_PROVIDER_ID');
  if (providerId === 'local' || !/^[a-z][a-z0-9-]{1,31}$/.test(providerId)) {
    throw new Error('AUTH_EXTERNAL_PROVIDER_ID 必须是 2 至 32 位小写字母、数字或连字符，且不能为 local');
  }
  const providerName = required(environment.AUTH_EXTERNAL_PROVIDER_NAME, 'AUTH_EXTERNAL_PROVIDER_NAME');
  if (Array.from(providerName).length > 48 || /[\u0000-\u001f\u007f]/u.test(providerName)) {
    throw new Error('AUTH_EXTERNAL_PROVIDER_NAME 格式无效');
  }
  const handoffSecret = required(environment.AUTH_EXTERNAL_HANDOFF_SECRET, 'AUTH_EXTERNAL_HANDOFF_SECRET');
  if (Buffer.byteLength(handoffSecret) < 32) {
    throw new Error('AUTH_EXTERNAL_HANDOFF_SECRET 不能少于 32 字节');
  }

  const external: ExternalAuthConfig = {
    implementation,
    providerId,
    providerName,
    entryUrl: externalUrl(required(environment.AUTH_EXTERNAL_ENTRY_URL, 'AUTH_EXTERNAL_ENTRY_URL'), 'AUTH_EXTERNAL_ENTRY_URL'),
    issuerUrl: issuerUrl(required(environment.AUTH_EXTERNAL_ISSUER_URL, 'AUTH_EXTERNAL_ISSUER_URL')),
    handoffSecret,
    handoffMaxTtlSeconds: parseInteger(environment.AUTH_EXTERNAL_HANDOFF_MAX_TTL_SECONDS, 300, 30, 15 * 60),
    validationTimeoutMs: parseInteger(environment.AUTH_EXTERNAL_VALIDATION_TIMEOUT_MS, 5_000, 500, 30_000),
  };
  return { localEnabled, external };
}

function parsePort(value: string | undefined, fallback: number): number {
  return parseInteger(value, fallback, 1, 65_535);
}

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`布尔环境变量只能是 true 或 false，收到：${value}`);
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) throw new Error(`启用外部身份认证时必须设置 ${name}`);
  return normalized;
}

function externalUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} 必须是有效的绝对 URL`);
  }
  if (url.username || url.password) throw new Error(`${name} 不能包含 URL 凭据`);
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error(`${name} 必须使用 HTTPS，只有回环地址允许 HTTP`);
  }
  url.hash = '';
  return url.toString().replace(/\/$/u, '');
}

function issuerUrl(value: string): string {
  const normalized = externalUrl(value, 'AUTH_EXTERNAL_ISSUER_URL');
  const url = new URL(normalized);
  if (url.search) throw new Error('AUTH_EXTERNAL_ISSUER_URL 不能包含查询参数');
  return normalized;
}
