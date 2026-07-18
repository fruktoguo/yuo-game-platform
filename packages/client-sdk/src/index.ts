import { useEffect, useState } from 'react';
import type {
  AccountView,
  ApiResult,
  AuthProviderDescriptor,
  GameManifest,
  GamePrincipal,
  LaunchGameResponse,
  LoginRequest,
  RegisterRequest,
  SessionView,
  WalletView,
} from '@yuo-platform/contracts';

export class PlatformApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'PlatformApiError';
  }
}

export class PlatformApiClient {
  constructor(private readonly baseUrl = '') {}

  getSession(): Promise<SessionView | null> {
    return this.request('/api/v1/session', { allowUnauthorized: true });
  }

  getProviders(): Promise<AuthProviderDescriptor[]> {
    return this.request('/api/v1/auth/providers');
  }

  register(request: RegisterRequest): Promise<SessionView> {
    return this.request('/api/v1/auth/register', { method: 'POST', body: request });
  }

  login(request: LoginRequest): Promise<SessionView> {
    return this.request('/api/v1/auth/login', { method: 'POST', body: request });
  }

  logout(): Promise<null> {
    return this.request('/api/v1/auth/logout', { method: 'POST' });
  }

  getGames(): Promise<GameManifest[]> {
    return this.request('/api/v1/games');
  }

  getWallet(): Promise<WalletView> {
    return this.request('/api/v1/wallet');
  }

  launchGame(gameId: string): Promise<LaunchGameResponse> {
    return this.request(`/api/v1/games/${encodeURIComponent(gameId)}/launch`, { method: 'POST' });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(new URL(path, this.baseUrl || window.location.origin), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (response.status === 401 && options.allowUnauthorized) return null as T;
    const result = await response.json() as ApiResult<T>;
    if (!response.ok || !result.ok) {
      throw new PlatformApiError(
        result.ok ? 'REQUEST_FAILED' : result.error.code,
        result.ok ? `请求失败：${response.status}` : result.error.message,
        response.status,
      );
    }
    return result.data;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  allowUnauthorized?: boolean;
}

export type GameSessionState =
  | { status: 'loading'; principal: null; error: null }
  | { status: 'ready'; principal: GamePrincipal; error: null }
  | { status: 'error'; principal: null; error: string };

let gameBootstrapPromise: Promise<GamePrincipal> | null = null;

export function useGamePlatformSession(): GameSessionState {
  const [state, setState] = useState<GameSessionState>({ status: 'loading', principal: null, error: null });
  useEffect(() => {
    let cancelled = false;
    gameBootstrapPromise ??= bootstrapGameSession();
    void gameBootstrapPromise.then((principal) => {
      if (!cancelled) setState({ status: 'ready', principal, error: null });
    }).catch((error) => {
      if (!cancelled) setState({ status: 'error', principal: null, error: error instanceof Error ? error.message : '无法建立游戏会话' });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}

export async function bootstrapGameSession(): Promise<GamePrincipal> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('launch_code');
  const response = await fetch(resolveGameEndpoint('api/platform/session'), {
    method: code ? 'POST' : 'GET',
    credentials: 'include',
    headers: code ? { 'content-type': 'application/json' } : undefined,
    body: code ? JSON.stringify({ code }) : undefined,
  });
  const result = await response.json() as ApiResult<GamePrincipal>;
  if (!response.ok || !result.ok) throw new PlatformApiError(result.ok ? 'GAME_SESSION_FAILED' : result.error.code, result.ok ? '无法建立游戏会话' : result.error.message, response.status);
  if (code) {
    url.searchParams.delete('launch_code');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return result.data;
}

export function resolveGameEndpoint(relativePath: string, currentUrl = window.location.href): URL {
  const normalizedPath = relativePath.replace(/^\/+/, '');
  return new URL(normalizedPath, new URL('.', currentUrl));
}

export function resolveGameSocketPath(currentUrl = window.location.href): string {
  return resolveGameEndpoint('socket.io', currentUrl).pathname;
}

export type { AccountView, GameManifest, GamePrincipal, SessionView, WalletView };
