import { createDecipheriv, createHash } from 'node:crypto';
import type { AuthProviderDescriptor, IdentityProviderProfile } from '@yuo-platform/contracts';
import type { ExternalAuthConfig } from './config';

const NEW_API_HANDOFF_AAD = 'new-api-node-studio:v1';
const HANDOFF_NONCE_BYTES = 12;
const HANDOFF_TAG_BYTES = 16;
const CLOCK_SKEW_SECONDS = 60;

export interface ExternalIdentityHandoff {
  profile: IdentityProviderProfile;
  fingerprint: string;
  expiresAt: Date;
}

export interface ExternalIdentityAdapter {
  readonly descriptor: AuthProviderDescriptor;
  readonly entryUrl: string;
  readonly callbackPath: string;
  readonly callbackOrigins: readonly string[];
  consumeHandoff(payload: string): Promise<ExternalIdentityHandoff>;
}

export class ExternalIdentityError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'ExternalIdentityError';
  }
}

export class HandoffReplayGuard {
  private readonly consumed = new Map<string, number>();

  claim(handoff: ExternalIdentityHandoff, now = Date.now()): boolean {
    this.prune(now);
    if (this.consumed.has(handoff.fingerprint)) return false;
    this.consumed.set(handoff.fingerprint, handoff.expiresAt.getTime());
    return true;
  }

  release(fingerprint: string): void {
    this.consumed.delete(fingerprint);
  }

  private prune(now: number): void {
    for (const [fingerprint, expiresAt] of this.consumed) {
      if (expiresAt <= now) this.consumed.delete(fingerprint);
    }
  }
}

export function createExternalIdentityAdapter(config: ExternalAuthConfig | null): ExternalIdentityAdapter | null {
  if (!config) return null;
  switch (config.implementation) {
    case 'newapi-node-studio-v1':
      return new NewApiNodeStudioV1Adapter(config);
  }
}

class NewApiNodeStudioV1Adapter implements ExternalIdentityAdapter {
  readonly descriptor: AuthProviderDescriptor;
  readonly entryUrl: string;
  readonly callbackPath: string;
  readonly callbackOrigins: readonly string[];

  constructor(private readonly config: ExternalAuthConfig) {
    this.entryUrl = config.entryUrl;
    this.callbackPath = `/api/v1/auth/external/${config.providerId}/handoff`;
    this.callbackOrigins = Array.from(new Set([
      new URL(config.entryUrl).origin,
      new URL(config.issuerUrl).origin,
    ]));
    this.descriptor = {
      id: config.providerId,
      name: config.providerName,
      mode: 'redirect',
      enabled: true,
      authorizationUrl: `/api/v1/auth/external/${config.providerId}`,
    };
  }

  async consumeHandoff(token: string): Promise<ExternalIdentityHandoff> {
    const payload = this.decrypt(token);
    const now = Math.floor(Date.now() / 1_000);
    if (payload.expiresAt <= now) {
      throw new ExternalIdentityError('EXTERNAL_HANDOFF_EXPIRED', '外部登录凭据已过期，请重新发起登录', 400);
    }
    if (
      payload.issuedAt > now + CLOCK_SKEW_SECONDS
      || payload.expiresAt <= payload.issuedAt
      || payload.expiresAt - payload.issuedAt > this.config.handoffMaxTtlSeconds
    ) {
      throw invalidHandoff();
    }
    let payloadIssuer: string;
    try {
      payloadIssuer = normalizeBaseUrl(payload.apiBaseUrl);
    } catch {
      throw invalidHandoff();
    }
    if (payloadIssuer !== normalizeBaseUrl(this.config.issuerUrl)) {
      throw new ExternalIdentityError('EXTERNAL_ISSUER_REJECTED', '外部登录签发方与当前配置不匹配', 400);
    }

    const remoteProfile = await this.validateRemoteAccount(payload);
    return {
      profile: {
        provider: this.config.providerId,
        subject: payload.subject,
        username: remoteProfile.username,
        displayName: remoteProfile.displayName,
      },
      fingerprint: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(payload.expiresAt * 1_000),
    };
  }

  private decrypt(token: string): NormalizedHandoffPayload {
    if (!token || token.length > 256 * 1_024 || token !== token.trim()) throw invalidHandoff();
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') throw invalidHandoff();
    try {
      const nonce = decodeBase64Url(parts[1]);
      const sealed = decodeBase64Url(parts[2]);
      if (nonce.length !== HANDOFF_NONCE_BYTES || sealed.length <= HANDOFF_TAG_BYTES) throw invalidHandoff();
      const ciphertext = sealed.subarray(0, sealed.length - HANDOFF_TAG_BYTES);
      const tag = sealed.subarray(sealed.length - HANDOFF_TAG_BYTES);
      const key = createHash('sha256').update(this.config.handoffSecret.trim()).digest();
      const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: HANDOFF_TAG_BYTES });
      decipher.setAAD(Buffer.from(NEW_API_HANDOFF_AAD));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return normalizePayload(JSON.parse(plaintext.toString('utf8')));
    } catch (error) {
      if (error instanceof ExternalIdentityError) throw error;
      throw invalidHandoff();
    }
  }

  private async validateRemoteAccount(payload: NormalizedHandoffPayload): Promise<{ username: string; displayName: string }> {
    let response: globalThis.Response;
    try {
      response = await fetch(`${normalizeBaseUrl(this.config.issuerUrl)}/api/user/self`, {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${payload.accessToken}`,
          'New-Api-User': payload.subject,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(this.config.validationTimeoutMs),
      });
    } catch {
      throw new ExternalIdentityError('EXTERNAL_PROVIDER_UNAVAILABLE', '外部账号服务暂时不可用', 502);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ExternalIdentityError('EXTERNAL_ACCOUNT_REJECTED', '外部账号登录状态已失效', 401);
    }
    if (!response.ok) {
      throw new ExternalIdentityError('EXTERNAL_PROVIDER_UNAVAILABLE', `外部账号服务返回 HTTP ${response.status}`, 502);
    }

    const body = await response.json().catch(() => null);
    const data = isRecord(body) && isRecord(body.data) ? body.data : null;
    if (!data) {
      throw new ExternalIdentityError('EXTERNAL_ACCOUNT_REJECTED', '外部账号校验结果无效', 401);
    }
    const responseSubject = optionalSubject(data.id);
    if (!responseSubject || responseSubject !== payload.subject) {
      throw new ExternalIdentityError('EXTERNAL_ACCOUNT_MISMATCH', '外部账号校验结果不匹配', 401);
    }
    const responseUsername = typeof data.username === 'string' ? data.username.trim() : '';
    const responseDisplayName = typeof data.display_name === 'string' ? data.display_name.trim() : '';
    const username = responseUsername || payload.username;
    return { username, displayName: responseDisplayName || username };
  }
}

interface NormalizedHandoffPayload {
  issuedAt: number;
  expiresAt: number;
  apiBaseUrl: string;
  subject: string;
  username: string;
  accessToken: string;
}

function normalizePayload(value: unknown): NormalizedHandoffPayload {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.user)) throw invalidHandoff();
  const issuedAt = safeInteger(value.issued_at);
  const expiresAt = safeInteger(value.expires_at);
  const apiBaseUrl = text(value.api_base_url, 2_048);
  const subject = requiredSubject(value.user.id);
  const username = text(value.user.username, 128);
  const accessToken = credentialText(value.user.access_token, 8_192);
  return { issuedAt, expiresAt, apiBaseUrl, subject, username, accessToken };
}

function decodeBase64Url(value: string): Buffer {
  if (!value || value.length % 4 === 1 || !/^[a-zA-Z0-9_-]+$/u.test(value)) throw invalidHandoff();
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.toString('base64url') !== value) throw invalidHandoff();
  return decoded;
}

function safeInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) throw invalidHandoff();
  return value as number;
}

function text(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string') throw invalidHandoff();
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > maximumLength || /[\u0000-\u001f\u007f]/u.test(normalized)) throw invalidHandoff();
  return normalized;
}

function credentialText(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string') throw invalidHandoff();
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength || /[\u0000-\u001f\u007f]/u.test(normalized)) throw invalidHandoff();
  return normalized;
}

function requiredSubject(value: unknown): string {
  const subject = optionalSubject(value);
  if (!subject) throw invalidHandoff();
  return subject;
}

function optionalSubject(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9][0-9]{0,63}$/u.test(value)) return value;
  return null;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/u, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function invalidHandoff(): ExternalIdentityError {
  return new ExternalIdentityError('EXTERNAL_HANDOFF_INVALID', '外部登录凭据无效', 400);
}
