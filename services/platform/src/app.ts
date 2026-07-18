import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import type {
  ApiResult,
  AuthProviderDescriptor,
  ExchangeGameSessionRequest,
  ExchangeGameSessionResponse,
  GameManifest,
  LaunchGameResponse,
  LoginRequest,
  PlatformDiscovery,
  RegisterRequest,
  SessionView,
  WalletCommand,
} from '@yuo-platform/contracts';
import { SlidingWindowRateLimiter } from '@yuo-platform/realtime';
import { AuthError, AuthService, hashToken } from './auth';
import type { PlatformConfig, RegisteredGame } from './config';
import { PlatformRepository, RepositoryError } from './repository';

interface RequestContext {
  session: SessionView;
  rawSessionToken: string;
}

export function createPlatformApp(config: PlatformConfig, repository: PlatformRepository, auth: AuthService) {
  const app = express();
  const authLimiter = new SlidingWindowRateLimiter({ windowMs: 60_000, maximum: 12, idleTtlMs: 10 * 60_000 });
  const launchLimiter = new SlidingWindowRateLimiter({ windowMs: 10_000, maximum: 12 });

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', async (_request, response) => {
    response.json({ ok: true, service: 'yuo-game-platform', now: Date.now() });
  });

  app.get('/.well-known/game-platform', (_request, response) => {
    const discovery: PlatformDiscovery = {
      issuer: config.publicBaseUrl,
      apiVersion: 'v1',
      providers: providerDescriptors(),
      endpoints: {
        session: '/api/v1/session',
        games: '/api/v1/games',
        wallet: '/api/v1/wallet',
        externalAuthorization: '/api/v1/auth/external/{provider}',
      },
    };
    sendSuccess(response, discovery);
  });

  app.get('/api/v1/auth/providers', (_request, response) => sendSuccess(response, providerDescriptors()));

  app.post('/api/v1/auth/register', requireSameOrigin, async (request, response) => {
    if (!authLimiter.consume(`register:${request.ip}`)) return sendError(response, 429, 'RATE_LIMITED', '注册尝试过于频繁');
    try {
      const created = await auth.register(request.body as RegisterRequest);
      setSessionCookie(response, config, created.token);
      return sendSuccess(response, created.session, 201);
    } catch (error) {
      return handleExpectedError(response, error);
    }
  });

  app.post('/api/v1/auth/login', requireSameOrigin, async (request, response) => {
    const username = typeof request.body?.username === 'string' ? request.body.username.toLocaleLowerCase('und') : '';
    if (!authLimiter.consume(`login:${request.ip}:${username}`)) return sendError(response, 429, 'RATE_LIMITED', '登录尝试过于频繁');
    try {
      const loggedIn = await auth.login(request.body as LoginRequest);
      setSessionCookie(response, config, loggedIn.token);
      return sendSuccess(response, loggedIn.session);
    } catch (error) {
      return handleExpectedError(response, error);
    }
  });

  app.post('/api/v1/auth/logout', requireSameOrigin, async (request, response) => {
    const token = readCookie(request, config.sessionCookieName);
    await auth.logout(token);
    response.clearCookie(config.sessionCookieName, { path: '/' });
    return sendSuccess(response, null);
  });

  app.get('/api/v1/session', async (request, response) => {
    const session = await auth.resolve(readCookie(request, config.sessionCookieName));
    if (!session) return sendError(response, 401, 'SESSION_REQUIRED', '请先登录');
    return sendSuccess(response, session);
  });

  app.get('/api/v1/games', (_request, response) => {
    const games = config.games.map((game) => game.manifest).sort((left, right) => left.sortOrder - right.sortOrder);
    return sendSuccess(response, games);
  });

  app.post('/api/v1/games/:gameId/launch', requireSameOrigin, async (request, response) => {
    const context = await requireSession(request, response, config, auth);
    if (!context) return;
    if (!launchLimiter.consume(`launch:${context.session.account.id}`)) return sendError(response, 429, 'RATE_LIMITED', '启动游戏过于频繁');
    const game = config.games.find((candidate) => candidate.manifest.id === request.params.gameId);
    if (!game || game.manifest.status !== 'online') return sendError(response, 404, 'GAME_UNAVAILABLE', '游戏当前不可用');
    const code = randomBytes(36).toString('base64url');
    const expiresAt = new Date(Date.now() + 60_000);
    await repository.createLaunchTicket(context.session.account.id, game.manifest.id, hashToken(code), expiresAt);
    const launchUrl = new URL(game.launchUrl);
    launchUrl.searchParams.set('launch_code', code);
    launchUrl.searchParams.set('lobby_url', config.publicBaseUrl);
    return sendSuccess(response, {
      gameId: game.manifest.id,
      launchUrl: launchUrl.toString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies LaunchGameResponse);
  });

  app.get('/api/v1/wallet', async (request, response) => {
    const context = await requireSession(request, response, config, auth);
    if (!context) return;
    try {
      return sendSuccess(response, await repository.getWallet(context.session.account.id));
    } catch (error) {
      return handleExpectedError(response, error);
    }
  });

  app.post('/internal/v1/game-sessions/exchange', async (request, response) => {
    const game = authenticateGameService(request, config.games);
    if (!game) return sendError(response, 401, 'SERVICE_AUTH_REQUIRED', '游戏服务认证失败');
    const body = request.body as Partial<ExchangeGameSessionRequest>;
    if (body.gameId !== game.manifest.id || typeof body.code !== 'string') return sendError(response, 400, 'INVALID_EXCHANGE_REQUEST', '启动凭据参数无效');
    const principal = await repository.consumeLaunchTicket(hashToken(body.code), body.gameId);
    if (!principal) return sendError(response, 401, 'INVALID_LAUNCH_CODE', '启动凭据无效或已使用');
    return sendSuccess(response, {
      principal,
      expiresAt: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
    } satisfies ExchangeGameSessionResponse);
  });

  app.post('/internal/v1/wallet/entries', async (request, response) => {
    const game = authenticateGameService(request, config.games);
    if (!game) return sendError(response, 401, 'SERVICE_AUTH_REQUIRED', '游戏服务认证失败');
    const command = request.body as Partial<WalletCommand>;
    const validation = validateWalletCommand(command);
    if (!validation.ok) return sendError(response, 400, 'INVALID_WALLET_COMMAND', validation.message);
    try {
      return sendSuccess(response, await repository.createWalletEntry(game.manifest.id, validation.command), 201);
    } catch (error) {
      return handleExpectedError(response, error);
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const moduleDirectory = dirname(fileURLToPath(import.meta.url));
    const lobbyDirectory = resolve(moduleDirectory, '../../../../apps/lobby/dist');
    app.use('/assets', express.static(join(lobbyDirectory, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(lobbyDirectory, { index: false, maxAge: '1h' }));
    app.get('/{*path}', (request, response, next) => {
      if (request.path.startsWith('/api/') || request.path.startsWith('/internal/') || request.path === '/health') return next();
      response.setHeader('Cache-Control', 'no-cache');
      return response.sendFile(join(lobbyDirectory, 'index.html'));
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: unknown) => {
    console.error('平台请求处理失败', error);
    sendError(response, 500, 'INTERNAL_ERROR', '服务暂时不可用');
  });

  return app;
}

function providerDescriptors(): AuthProviderDescriptor[] {
  return [
    { id: 'local', name: '平台账号', mode: 'credentials', enabled: true },
    { id: 'dst-platform', name: 'DST 新平台', mode: 'redirect', enabled: false },
  ];
}

async function requireSession(request: Request, response: Response, config: PlatformConfig, auth: AuthService): Promise<RequestContext | null> {
  const rawSessionToken = readCookie(request, config.sessionCookieName);
  const session = await auth.resolve(rawSessionToken);
  if (!session || !rawSessionToken) {
    sendError(response, 401, 'SESSION_REQUIRED', '请先登录');
    return null;
  }
  return { session, rawSessionToken };
}

function authenticateGameService(request: Request, games: RegisteredGame[]): RegisteredGame | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  for (const game of games) {
    if (constantTimeTextEqual(token, game.serviceToken)) return game;
  }
  return null;
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function validateWalletCommand(value: Partial<WalletCommand>): { ok: true; command: WalletCommand } | { ok: false; message: string } {
  if (!value || typeof value !== 'object') return { ok: false, message: '命令格式无效' };
  if (typeof value.accountId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.accountId)) return { ok: false, message: '账号标识无效' };
  const amount = value.amount;
  if (!Number.isSafeInteger(amount) || amount === undefined || amount === 0 || Math.abs(amount) > 1_000_000) return { ok: false, message: '积分数量无效' };
  if (value.type !== 'grant' && value.type !== 'spend' && value.type !== 'refund') return { ok: false, message: '流水类型无效' };
  if (value.type === 'spend' && value.amount! > 0) return { ok: false, message: '消费必须为负数' };
  if (value.type !== 'spend' && value.amount! < 0) return { ok: false, message: '发放或退款必须为正数' };
  if (!validCommandText(value.reasonCode, 64) || !validCommandText(value.referenceId, 128) || !validCommandText(value.idempotencyKey, 128)) return { ok: false, message: '流水标识无效' };
  return { ok: true, command: value as WalletCommand };
}

function validCommandText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= maximum && /^[a-zA-Z0-9:._-]+$/.test(value);
}

function requireSameOrigin(request: Request, response: Response, next: () => void): void {
  const origin = request.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host !== request.headers.host) {
      sendError(response, 403, 'ORIGIN_REJECTED', '请求来源无效');
      return;
    }
    next();
  } catch {
    sendError(response, 403, 'ORIGIN_REJECTED', '请求来源无效');
  }
}

function setSessionCookie(response: Response, config: PlatformConfig, token: string): void {
  response.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlSeconds * 1_000,
  });
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function handleExpectedError(response: Response, error: unknown): Response {
  if (error instanceof AuthError) return sendError(response, error.status, error.code, error.message);
  if (error instanceof RepositoryError) {
    if (error.code === 'WALLET_NOT_FOUND') return sendError(response, 404, error.code, error.message);
    if (error.code === 'INSUFFICIENT_POINTS' || error.code === 'IDEMPOTENCY_CONFLICT') {
      return sendError(response, 409, error.code, error.message);
    }
  }
  throw error;
}

function sendSuccess<T>(response: Response, data: T, status = 200): Response {
  return response.status(status).json({ ok: true, data } satisfies ApiResult<T>);
}

function sendError(response: Response, status: number, code: string, message: string): Response {
  return response.status(status).json({ ok: false, error: { code, message } } satisfies ApiResult<never>);
}
