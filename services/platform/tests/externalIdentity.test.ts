import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ExternalAuthConfig } from '../src/config';
import {
  createExternalIdentityAdapter,
  ExternalIdentityError,
  HandoffReplayGuard,
} from '../src/externalIdentity';

const secret = 'test-external-handoff-secret-32-bytes';
let server: Server;
let issuerUrl: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url !== '/api/user/self') {
      response.writeHead(404).end();
      return;
    }
    if (request.headers.authorization === 'Bearer rejected-access-token') {
      response.writeHead(401, { 'content-type': 'application/json' }).end('{}');
      return;
    }
    if (request.headers.authorization === 'Bearer malformed-profile-token') {
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ success: false }));
      return;
    }
    if (request.headers.authorization !== 'Bearer dashboard-access-token' || request.headers['new-api-user'] !== '42') {
      response.writeHead(403, { 'content-type': 'application/json' }).end('{}');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data: { id: 42, username: 'newapi-user', display_name: '外部玩家' } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  issuerUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('NewAPI Node Studio v1 兼容适配器', () => {
  it('校验交接包和远端账号，只输出平台身份资料', async () => {
    const adapter = createExternalIdentityAdapter(config());
    expect(adapter).not.toBeNull();
    const handoff = await adapter!.consumeHandoff(encryptHandoff(payload()));
    expect(handoff.profile).toEqual({
      provider: 'sample-platform',
      subject: '42',
      username: 'newapi-user',
      displayName: '外部玩家',
    });
    expect(JSON.stringify(handoff)).not.toContain('dashboard-access-token');
    expect(JSON.stringify(handoff)).not.toContain('sk-image-secret');
  });

  it('拒绝过期、错误签发方和远端已失效账号', async () => {
    const adapter = createExternalIdentityAdapter(config())!;
    const now = Math.floor(Date.now() / 1_000);
    await expect(adapter.consumeHandoff(encryptHandoff(payload({ issued_at: now - 120, expires_at: now - 1 }))))
      .rejects.toMatchObject({ code: 'EXTERNAL_HANDOFF_EXPIRED' });
    await expect(adapter.consumeHandoff(encryptHandoff(payload({ api_base_url: 'https://other.example.com' }))))
      .rejects.toMatchObject({ code: 'EXTERNAL_ISSUER_REJECTED' });
    await expect(adapter.consumeHandoff(encryptHandoff(payload({
      user: { id: 42, username: 'newapi-user', access_token: 'rejected-access-token' },
    }))))
      .rejects.toMatchObject({ code: 'EXTERNAL_ACCOUNT_REJECTED' });
    await expect(adapter.consumeHandoff(encryptHandoff(payload({
      user: { id: 42, username: 'newapi-user', access_token: 'malformed-profile-token' },
    }))))
      .rejects.toMatchObject({ code: 'EXTERNAL_ACCOUNT_REJECTED' });
  });

  it('拒绝被篡改的密文并限制同进程重复消费', async () => {
    const adapter = createExternalIdentityAdapter(config())!;
    const token = encryptHandoff(payload());
    await expect(adapter.consumeHandoff(`${token}x`)).rejects.toBeInstanceOf(ExternalIdentityError);
    await expect(adapter.consumeHandoff(` ${token}`)).rejects.toBeInstanceOf(ExternalIdentityError);
    const handoff = await adapter.consumeHandoff(token);
    const guard = new HandoffReplayGuard();
    expect(guard.claim(handoff)).toBe(true);
    expect(guard.claim(handoff)).toBe(false);
    guard.release(handoff.fingerprint);
    expect(guard.claim(handoff)).toBe(true);
  });
});

function config(): ExternalAuthConfig {
  return {
    implementation: 'newapi-node-studio-v1',
    providerId: 'sample-platform',
    providerName: '示例账号平台',
    entryUrl: `${issuerUrl}/game-handoff`,
    issuerUrl,
    handoffSecret: secret,
    handoffMaxTtlSeconds: 300,
    validationTimeoutMs: 2_000,
  };
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1_000);
  return {
    version: 1,
    issued_at: now,
    expires_at: now + 120,
    api_base_url: issuerUrl,
    user: { id: 42, username: 'newapi-user', access_token: 'dashboard-access-token' },
    api_keys: [{ id: 7, name: 'Image', api_key: 'sk-image-secret' }],
    ...overrides,
  };
}

function encryptHandoff(value: Record<string, unknown>): string {
  const nonce = randomBytes(12);
  const key = createHash('sha256').update(secret).digest();
  const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(Buffer.from('new-api-node-studio:v1'));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const sealed = Buffer.concat([ciphertext, cipher.getAuthTag()]);
  return `v1.${nonce.toString('base64url')}.${sealed.toString('base64url')}`;
}
