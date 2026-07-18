import { createHmac, timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import type {
  ApiResult,
  ExchangeGameSessionRequest,
  ExchangeGameSessionResponse,
  GamePrincipal,
  WalletCommand,
  WalletEntryView,
} from '@yuo-platform/contracts';

interface GameSessionClaims extends GamePrincipal {
  version: 1;
  issuedAt: number;
  expiresAt: number;
}

export interface PlatformServiceClientOptions {
  platformInternalUrl: string;
  gameId: string;
  serviceToken: string;
  timeoutMs?: number;
}

export class PlatformServiceClient {
  constructor(private readonly options: PlatformServiceClientOptions) {}

  exchangeLaunchCode(code: string): Promise<ExchangeGameSessionResponse> {
    return this.request('/internal/v1/game-sessions/exchange', {
      gameId: this.options.gameId,
      code,
    } satisfies ExchangeGameSessionRequest);
  }

  createWalletEntry(command: WalletCommand): Promise<WalletEntryView> {
    return this.request('/internal/v1/wallet/entries', command);
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(new URL(path, this.options.platformInternalUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.serviceToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 5_000),
    });
    const result = await response.json() as ApiResult<T>;
    if (!response.ok || !result.ok) {
      throw new PlatformServiceError(
        result.ok ? 'PLATFORM_REQUEST_FAILED' : result.error.code,
        result.ok ? `平台请求失败：${response.status}` : result.error.message,
        response.status,
      );
    }
    return result.data;
  }
}

export class PlatformServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'PlatformServiceError';
  }
}

export interface GameAuthBridgeOptions extends PlatformServiceClientOptions {
  sessionSecret: string;
  cookieName: string;
  secureCookies?: boolean;
  sessionTtlSeconds?: number;
}

export interface PlatformSocketData {
  platformPrincipal?: GamePrincipal;
}

interface SocketLike {
  data: PlatformSocketData;
  handshake: { headers: { cookie?: string } };
}

export class GameAuthBridge {
  readonly serviceClient: PlatformServiceClient;
  private readonly sessionTtlSeconds: number;

  constructor(private readonly options: GameAuthBridgeOptions) {
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(options.gameId)) throw new Error('gameId 格式无效');
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(options.cookieName)) throw new Error('Cookie 名称格式无效');
    if (Buffer.byteLength(options.sessionSecret) < 32) throw new Error('游戏会话密钥不能少于 32 字节');
    this.sessionTtlSeconds = options.sessionTtlSeconds ?? 12 * 60 * 60;
    this.serviceClient = new PlatformServiceClient(options);
  }

  createRouter(): Router {
    const router = express.Router();
    router.use(express.json({ limit: '4kb' }));
    router.get('/api/platform/session', (request, response) => {
      const principal = this.principalFromRequest(request);
      if (!principal) return sendError(response, 401, 'GAME_SESSION_REQUIRED', '请从游戏大厅进入');
      return response.json({ ok: true, data: principal } satisfies ApiResult<GamePrincipal>);
    });
    router.post('/api/platform/session', async (request, response) => {
      const code = typeof request.body?.code === 'string' ? request.body.code : '';
      if (!/^[a-zA-Z0-9_-]{32,180}$/.test(code)) return sendError(response, 400, 'INVALID_LAUNCH_CODE', '启动凭据无效');
      try {
        const exchanged = await this.serviceClient.exchangeLaunchCode(code);
        if (exchanged.principal.gameId !== this.options.gameId) return sendError(response, 403, 'GAME_AUDIENCE_MISMATCH', '启动凭据不属于当前游戏');
        const token = createGameSessionToken(exchanged.principal, this.options.sessionSecret, this.sessionTtlSeconds);
        response.cookie(this.options.cookieName, token, {
          httpOnly: true,
          secure: this.options.secureCookies ?? process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: this.sessionTtlSeconds * 1_000,
        });
        return response.json({ ok: true, data: exchanged.principal } satisfies ApiResult<GamePrincipal>);
      } catch (error) {
        if (error instanceof PlatformServiceError) return sendError(response, error.status, error.code, error.message);
        console.error('游戏启动凭据兑换失败', error);
        return sendError(response, 503, 'PLATFORM_UNAVAILABLE', '账号平台暂时不可用');
      }
    });
    router.post('/api/platform/logout', (_request, response) => {
      response.clearCookie(this.options.cookieName, { path: '/' });
      response.json({ ok: true, data: null } satisfies ApiResult<null>);
    });
    return router;
  }

  socketMiddleware(): (socket: SocketLike, next: (error?: Error) => void) => void {
    return (socket, next) => {
      const token = parseCookieHeader(socket.handshake.headers.cookie ?? '')[this.options.cookieName];
      const principal = token ? verifyGameSessionToken(token, this.options.sessionSecret, this.options.gameId) : null;
      if (!principal) return next(new Error('请从游戏大厅进入'));
      socket.data.platformPrincipal = principal;
      next();
    };
  }

  requireRequest = (request: Request, response: Response, next: NextFunction): void => {
    const principal = this.principalFromRequest(request);
    if (!principal) {
      sendError(response, 401, 'GAME_SESSION_REQUIRED', '游戏会话已失效');
      return;
    }
    response.locals.platformPrincipal = principal;
    next();
  };

  principalFromRequest(request: Request): GamePrincipal | null {
    const token = parseCookieHeader(request.headers.cookie ?? '')[this.options.cookieName];
    return token ? verifyGameSessionToken(token, this.options.sessionSecret, this.options.gameId) : null;
  }
}

export function createGameSessionToken(principal: GamePrincipal, secret: string, ttlSeconds: number, now = Date.now()): string {
  const claims: GameSessionClaims = {
    ...principal,
    version: 1,
    issuedAt: Math.floor(now / 1_000),
    expiresAt: Math.floor(now / 1_000) + ttlSeconds,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyGameSessionToken(token: string, secret: string, expectedGameId: string, now = Date.now()): GamePrincipal | null {
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<GameSessionClaims>;
    if (claims.version !== 1 || claims.gameId !== expectedGameId || !isText(claims.accountId) || !isText(claims.username) || !isText(claims.displayName)) return null;
    if (!Number.isInteger(claims.expiresAt) || claims.expiresAt! <= Math.floor(now / 1_000)) return null;
    return {
      accountId: claims.accountId,
      username: claims.username,
      displayName: claims.displayName,
      gameId: claims.gameId,
    };
  } catch {
    return null;
  }
}

export function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function sendError(response: Response, status: number, code: string, message: string): Response {
  return response.status(status).json({ ok: false, error: { code, message } } satisfies ApiResult<never>);
}
