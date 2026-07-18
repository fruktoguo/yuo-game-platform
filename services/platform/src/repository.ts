import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  AccountStatus,
  AccountView,
  GamePrincipal,
  WalletCommand,
  WalletEntryType,
  WalletEntryView,
  WalletView,
} from '@yuo-platform/contracts';
import { PostgresDatabase } from '@yuo-platform/persistence';

interface AccountRow {
  id: string;
  username: string;
  display_name: string;
  status: AccountStatus;
  created_at: Date;
  password_hash?: string;
}

interface SessionRow extends AccountRow {
  expires_at: Date;
}

interface WalletEntryRow {
  id: string;
  account_id: string;
  game_id: string | null;
  amount: string;
  entry_type: WalletEntryType;
  reason_code: string;
  reference_id: string;
  balance_after: string;
  created_at: Date;
}

export class PlatformRepository {
  constructor(private readonly database: PostgresDatabase) {}

  async createLocalAccount(input: { username: string; usernameKey: string; displayName: string; passwordHash: string }): Promise<AccountView> {
    return this.database.transaction(async (client) => {
      const id = randomUUID();
      const result = await client.query<AccountRow>(`
        INSERT INTO platform_accounts (id, username, username_key, display_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, display_name, status, created_at
      `, [id, input.username, input.usernameKey, input.displayName]);
      await client.query('INSERT INTO platform_credentials (account_id, password_hash) VALUES ($1, $2)', [id, input.passwordHash]);
      await client.query(`
        INSERT INTO platform_identity_links (provider, provider_subject, account_id, username_snapshot)
        VALUES ('local', $1, $2, $3)
      `, [input.usernameKey, id, input.username]);
      await client.query('INSERT INTO platform_wallets (account_id) VALUES ($1)', [id]);
      return toAccountView(result.rows[0]);
    });
  }

  async findLocalCredential(usernameKey: string): Promise<{ account: AccountView; passwordHash: string } | null> {
    const result = await this.database.query<AccountRow & { password_hash: string }>(`
      SELECT a.id, a.username, a.display_name, a.status, a.created_at, c.password_hash
      FROM platform_accounts a
      JOIN platform_credentials c ON c.account_id = a.id
      WHERE a.username_key = $1
    `, [usernameKey]);
    const row = result.rows[0];
    return row ? { account: toAccountView(row), passwordHash: row.password_hash } : null;
  }

  async createSession(accountId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.database.query(`
      INSERT INTO platform_sessions (token_hash, account_id, expires_at)
      VALUES ($1, $2, $3)
    `, [tokenHash, accountId, expiresAt]);
  }

  async resolveSession(tokenHash: string): Promise<{ account: AccountView; expiresAt: Date } | null> {
    const result = await this.database.query<SessionRow>(`
      SELECT a.id, a.username, a.display_name, a.status, a.created_at, s.expires_at
      FROM platform_sessions s
      JOIN platform_accounts a ON a.id = s.account_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND a.status = 'active'
    `, [tokenHash]);
    const row = result.rows[0];
    return row ? { account: toAccountView(row), expiresAt: row.expires_at } : null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.database.query('DELETE FROM platform_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async deleteExpiredRecords(): Promise<void> {
    await this.database.query('DELETE FROM platform_sessions WHERE expires_at <= now()');
    await this.database.query('DELETE FROM platform_launch_tickets WHERE expires_at <= now() OR consumed_at IS NOT NULL');
  }

  async createLaunchTicket(accountId: string, gameId: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.database.query(`
      INSERT INTO platform_launch_tickets (code_hash, account_id, game_id, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [codeHash, accountId, gameId, expiresAt]);
  }

  async consumeLaunchTicket(codeHash: string, gameId: string): Promise<GamePrincipal | null> {
    return this.database.transaction(async (client) => {
      const result = await client.query<AccountRow>(`
        UPDATE platform_launch_tickets t
        SET consumed_at = now()
        FROM platform_accounts a
        WHERE t.code_hash = $1
          AND t.game_id = $2
          AND t.account_id = a.id
          AND t.consumed_at IS NULL
          AND t.expires_at > now()
          AND a.status = 'active'
        RETURNING a.id, a.username, a.display_name, a.status, a.created_at
      `, [codeHash, gameId]);
      const row = result.rows[0];
      return row ? { accountId: row.id, username: row.username, displayName: row.display_name, gameId } : null;
    });
  }

  async getWallet(accountId: string, entryLimit = 20): Promise<WalletView> {
    const wallet = await this.database.query<{ balance: string; version: string }>(
      'SELECT balance, version FROM platform_wallets WHERE account_id = $1',
      [accountId],
    );
    if (!wallet.rows[0]) throw new RepositoryError('WALLET_NOT_FOUND', '积分账户不存在');
    const entries = await this.database.query<WalletEntryRow>(`
      SELECT id, account_id, game_id, amount, entry_type, reason_code, reference_id, balance_after, created_at
      FROM platform_wallet_entries
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [accountId, entryLimit]);
    return {
      currency: 'POINT',
      balance: toSafeInteger(wallet.rows[0].balance),
      version: toSafeInteger(wallet.rows[0].version),
      entries: entries.rows.map(toWalletEntry),
    };
  }

  async createWalletEntry(gameId: string, command: WalletCommand): Promise<WalletEntryView> {
    return this.database.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${gameId}:${command.idempotencyKey}`]);
      const existing = await client.query<WalletEntryRow>(`
        SELECT id, account_id, game_id, amount, entry_type, reason_code, reference_id, balance_after, created_at
        FROM platform_wallet_entries
        WHERE game_id = $1 AND idempotency_key = $2
      `, [gameId, command.idempotencyKey]);
      if (existing.rows[0]) {
        if (!matchesWalletCommand(existing.rows[0], command)) {
          throw new RepositoryError('IDEMPOTENCY_CONFLICT', '幂等键已用于不同的积分命令');
        }
        return toWalletEntry(existing.rows[0]);
      }

      const wallet = await client.query<{ balance: string }>(
        'SELECT balance FROM platform_wallets WHERE account_id = $1 FOR UPDATE',
        [command.accountId],
      );
      if (!wallet.rows[0]) throw new RepositoryError('WALLET_NOT_FOUND', '积分账户不存在');
      const balance = toSafeInteger(wallet.rows[0].balance);
      const nextBalance = balance + command.amount;
      if (nextBalance < 0) throw new RepositoryError('INSUFFICIENT_POINTS', '通用积分不足');
      const id = randomUUID();
      await client.query(`
        UPDATE platform_wallets SET balance = $2, version = version + 1 WHERE account_id = $1
      `, [command.accountId, nextBalance]);
      const inserted = await client.query<WalletEntryRow>(`
        INSERT INTO platform_wallet_entries (
          id, account_id, game_id, amount, entry_type, reason_code,
          reference_id, idempotency_key, balance_after
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, account_id, game_id, amount, entry_type, reason_code, reference_id, balance_after, created_at
      `, [
        id,
        command.accountId,
        gameId,
        command.amount,
        command.type,
        command.reasonCode,
        command.referenceId,
        command.idempotencyKey,
        nextBalance,
      ]);
      return toWalletEntry(inserted.rows[0]);
    });
  }
}

export class RepositoryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

function toAccountView(row: AccountRow): AccountView {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

function toWalletEntry(row: WalletEntryRow): WalletEntryView {
  return {
    id: row.id,
    gameId: row.game_id,
    amount: toSafeInteger(row.amount),
    type: row.entry_type,
    reasonCode: row.reason_code,
    referenceId: row.reference_id,
    balanceAfter: toSafeInteger(row.balance_after),
    createdAt: row.created_at.toISOString(),
  };
}

function matchesWalletCommand(row: WalletEntryRow, command: WalletCommand): boolean {
  return row.account_id === command.accountId
    && toSafeInteger(row.amount) === command.amount
    && row.entry_type === command.type
    && row.reason_code === command.reasonCode
    && row.reference_id === command.referenceId;
}

function toSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new RepositoryError('NUMERIC_OVERFLOW', '积分数值超出安全范围');
  return parsed;
}
