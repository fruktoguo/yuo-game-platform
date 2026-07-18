export const PLATFORM_API_VERSION = 'v1' as const;

export type AccountStatus = 'active' | 'suspended';
export type IdentityProviderId = 'local' | 'dst-platform' | (string & {});

export interface AccountView {
  id: string;
  username: string;
  displayName: string;
  status: AccountStatus;
  createdAt: string;
}

export interface SessionView {
  account: AccountView;
  expiresAt: string;
}

export interface AuthProviderDescriptor {
  id: IdentityProviderId;
  name: string;
  mode: 'credentials' | 'redirect';
  enabled: boolean;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface IdentityProviderProfile {
  provider: IdentityProviderId;
  subject: string;
  username: string;
  displayName: string;
}

export interface IdentityProvider {
  readonly descriptor: AuthProviderDescriptor;
  register?(request: RegisterRequest): Promise<IdentityProviderProfile>;
  authenticate?(request: LoginRequest): Promise<IdentityProviderProfile | null>;
  resolveAuthorizationCode?(code: string, redirectUri: string): Promise<IdentityProviderProfile>;
}

export type GameStatus = 'online' | 'maintenance' | 'coming-soon';
export type GameLaunchMode = 'navigate' | 'embedded';

export interface GameCapabilities {
  realtime: boolean;
  persistentState: boolean;
  wallet: 'none' | 'earn' | 'spend' | 'full';
}

export interface GameManifest {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  coverUrl: string;
  launchMode: GameLaunchMode;
  status: GameStatus;
  capabilities: GameCapabilities;
  sortOrder: number;
}

export interface LaunchGameResponse {
  gameId: string;
  launchUrl: string;
  expiresAt: string;
}

export interface GamePrincipal {
  accountId: string;
  username: string;
  displayName: string;
  gameId: string;
}

export interface ExchangeGameSessionRequest {
  gameId: string;
  code: string;
}

export interface ExchangeGameSessionResponse {
  principal: GamePrincipal;
  expiresAt: string;
}

export type WalletEntryType = 'grant' | 'spend' | 'refund' | 'adjustment';

export interface WalletEntryView {
  id: string;
  gameId: string | null;
  amount: number;
  type: WalletEntryType;
  reasonCode: string;
  referenceId: string;
  balanceAfter: number;
  createdAt: string;
}

export interface WalletView {
  currency: 'POINT';
  balance: number;
  version: number;
  entries: WalletEntryView[];
}

export interface WalletCommand {
  accountId: string;
  amount: number;
  type: WalletEntryType;
  reasonCode: string;
  referenceId: string;
  idempotencyKey: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface PlatformDiscovery {
  issuer: string;
  apiVersion: typeof PLATFORM_API_VERSION;
  providers: AuthProviderDescriptor[];
  endpoints: {
    session: string;
    games: string;
    wallet: string;
    externalAuthorization: string;
  };
}

export function isApiSuccess<T>(result: ApiResult<T>): result is { ok: true; data: T } {
  return result.ok;
}
