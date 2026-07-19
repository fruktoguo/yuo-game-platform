import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AccountView, IdentityProviderProfile, SessionView } from '@yuo-platform/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlatformApp } from '../src/app';
import type { AuthService } from '../src/auth';
import type { PlatformConfig } from '../src/config';
import type { ExternalIdentityAdapter } from '../src/externalIdentity';
import type { PlatformRepository } from '../src/repository';

let server: Server | null = null;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = null;
});

describe('外部身份 HTTP 路由', () => {
  it('发布动态 provider、跳转登录并通过 handoff 建立 Cookie 会话', async () => {
    const profile: IdentityProviderProfile = {
      provider: 'sample-platform',
      subject: '42',
      username: 'external-user',
      displayName: '外部玩家',
    };
    const account: AccountView = {
      id: '0f5ec0af-a9cc-4f18-a20d-c1f8bd0c6960',
      username: 'external-user',
      displayName: '外部玩家',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const session: SessionView = { account, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    const loginExternal = vi.fn(async () => ({ session, token: 'platform-session-token' }));
    const adapter: ExternalIdentityAdapter = {
      descriptor: {
        id: 'sample-platform',
        name: '示例账号平台',
        mode: 'redirect',
        enabled: true,
        authorizationUrl: '/api/v1/auth/external/sample-platform',
      },
      entryUrl: 'https://identity.example.com/game-handoff',
      callbackPath: '/api/v1/auth/external/sample-platform/handoff',
      callbackOrigins: ['https://identity.example.com'],
      consumeHandoff: vi.fn(async () => ({
        profile,
        fingerprint: 'handoff-fingerprint',
        expiresAt: new Date(Date.now() + 60_000),
      })),
    };
    const config = platformConfig();
    const app = createPlatformApp(
      config,
      {} as PlatformRepository,
      { loginExternal } as unknown as AuthService,
      adapter,
    );
    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const providers = await fetch(`${baseUrl}/api/v1/auth/providers`).then((response) => response.json());
    expect(providers.data).toEqual([
      { id: 'local', name: '平台账号', mode: 'credentials', enabled: false },
      adapter.descriptor,
    ]);

    const authorization = await fetch(`${baseUrl}/api/v1/auth/external/sample-platform`, { redirect: 'manual' });
    expect(authorization.status).toBe(302);
    expect(authorization.headers.get('location')).toBe(adapter.entryUrl);

    const untrustedCallback = await fetch(`${baseUrl}${adapter.callbackPath}`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ payload: 'encrypted-handoff' }),
    });
    expect(untrustedCallback.status).toBe(403);

    const callback = await fetch(`${baseUrl}${adapter.callbackPath}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://identity.example.com',
      },
      body: new URLSearchParams({ payload: 'encrypted-handoff' }),
    });
    expect(callback.status).toBe(303);
    expect(callback.headers.get('location')).toBe('/');
    expect(callback.headers.get('set-cookie')).toContain('yuo_platform_session=platform-session-token');
    expect(callback.headers.get('set-cookie')).toContain('HttpOnly');
    expect(loginExternal).toHaveBeenCalledWith(profile);

    const replay = await fetch(`${baseUrl}${adapter.callbackPath}`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://identity.example.com',
      },
      body: new URLSearchParams({ payload: 'encrypted-handoff' }),
    });
    expect(replay.status).toBe(409);
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
    games: [],
  };
}
