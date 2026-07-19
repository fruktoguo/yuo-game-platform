import { createHash, randomBytes } from 'node:crypto';
import type { AccountView, IdentityProviderProfile, LoginRequest, RegisterRequest, SessionView } from '@yuo-platform/contracts';
import { PlatformRepository, isUniqueViolation } from './repository';
import { hashPassword, verifyPassword } from './passwords';

const DUMMY_PASSWORD_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export class AuthService {
  constructor(
    private readonly repository: PlatformRepository,
    private readonly sessionTtlSeconds: number,
  ) {}

  async register(request: RegisterRequest): Promise<{ session: SessionView; token: string }> {
    const input = validateRegistration(request);
    const passwordHash = await hashPassword(input.password);
    let account: AccountView;
    try {
      account = await this.repository.createLocalAccount({
        username: input.username,
        usernameKey: input.usernameKey,
        displayName: input.displayName,
        passwordHash,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AuthError('USERNAME_TAKEN', '用户名已被使用', 409);
      throw error;
    }
    return this.createSession(account);
  }

  async login(request: LoginRequest): Promise<{ session: SessionView; token: string }> {
    const usernameKey = normalizeUsernameKey(request?.username);
    const password = typeof request?.password === 'string' ? request.password : '';
    if (!usernameKey || password.length < 1 || password.length > 128) throw invalidCredentials();
    const credential = await this.repository.findLocalCredential(usernameKey);
    const matches = await verifyPassword(password, credential?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!credential || !matches || credential.account.status !== 'active') throw invalidCredentials();
    return this.createSession(credential.account);
  }

  async loginExternal(profile: IdentityProviderProfile): Promise<{ session: SessionView; token: string }> {
    const normalized = validateExternalProfile(profile);
    const account = await this.repository.findOrCreateExternalAccount(normalized);
    if (account.status !== 'active') throw new AuthError('ACCOUNT_SUSPENDED', '平台账号已停用', 403);
    return this.createSession(account);
  }

  async resolve(token: string | undefined): Promise<SessionView | null> {
    if (!token || token.length > 256) return null;
    const resolved = await this.repository.resolveSession(hashToken(token));
    return resolved ? { account: resolved.account, expiresAt: resolved.expiresAt.toISOString() } : null;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.repository.revokeSession(hashToken(token));
  }

  private async createSession(account: AccountView): Promise<{ session: SessionView; token: string }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionTtlSeconds * 1_000);
    await this.repository.createSession(account.id, hashToken(token), expiresAt);
    return { session: { account, expiresAt: expiresAt.toISOString() }, token };
  }
}

export class AuthError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function validateRegistration(request: RegisterRequest): { username: string; usernameKey: string; displayName: string; password: string } {
  const username = typeof request?.username === 'string' ? request.username.normalize('NFKC').trim() : '';
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey || !/^[\p{L}\p{N}_-]{3,24}$/u.test(username)) {
    throw new AuthError('INVALID_USERNAME', '用户名需为 3 至 24 个字母、数字、下划线或连字符', 400);
  }
  const password = typeof request?.password === 'string' ? request.password : '';
  if (password.length < 10 || password.length > 128) throw new AuthError('INVALID_PASSWORD', '密码长度需为 10 至 128 个字符', 400);
  const displayName = typeof request?.displayName === 'string' && request.displayName.trim()
    ? request.displayName.normalize('NFKC').trim()
    : username;
  const displayLength = Array.from(displayName).length;
  if (displayLength < 2 || displayLength > 24 || /[\u0000-\u001f\u007f]/u.test(displayName)) {
    throw new AuthError('INVALID_DISPLAY_NAME', '显示名称需为 2 至 24 个有效字符', 400);
  }
  return { username, usernameKey, displayName, password };
}

function normalizeUsernameKey(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').trim().toLocaleLowerCase('und') : '';
}

function invalidCredentials(): AuthError {
  return new AuthError('INVALID_CREDENTIALS', '用户名或密码错误', 401);
}

function validateExternalProfile(profile: IdentityProviderProfile): IdentityProviderProfile {
  const provider = typeof profile?.provider === 'string' ? profile.provider.trim() : '';
  if (provider === 'local' || !/^[a-z][a-z0-9-]{1,31}$/u.test(provider)) {
    throw new AuthError('INVALID_EXTERNAL_PROFILE', '外部身份提供者无效', 400);
  }
  const subject = typeof profile?.subject === 'string' ? profile.subject.trim() : '';
  if (!subject || subject.length > 256 || /[\u0000-\u001f\u007f]/u.test(subject)) {
    throw new AuthError('INVALID_EXTERNAL_PROFILE', '外部身份标识无效', 400);
  }
  const username = typeof profile?.username === 'string' ? profile.username.normalize('NFKC').trim() : '';
  if (!username || username.length > 128 || /[\u0000-\u001f\u007f]/u.test(username)) {
    throw new AuthError('INVALID_EXTERNAL_PROFILE', '外部账号名称无效', 400);
  }
  const requestedDisplayName = typeof profile?.displayName === 'string'
    ? profile.displayName.normalize('NFKC').trim()
    : '';
  const displayName = Array.from(requestedDisplayName || username).slice(0, 24).join('');
  if (!displayName || /[\u0000-\u001f\u007f]/u.test(displayName)) {
    throw new AuthError('INVALID_EXTERNAL_PROFILE', '外部账号显示名称无效', 400);
  }
  return { provider, subject, username, displayName };
}
