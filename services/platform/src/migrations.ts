import type { DatabaseMigration } from '@yuo-platform/persistence';

export const PLATFORM_MIGRATIONS: readonly DatabaseMigration[] = [
  {
    id: '001_identity_wallet_and_launch',
    sql: `
      CREATE TABLE platform_accounts (
        id uuid PRIMARY KEY,
        username text NOT NULL,
        username_key text NOT NULL UNIQUE,
        display_name text NOT NULL,
        status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE platform_credentials (
        account_id uuid PRIMARY KEY REFERENCES platform_accounts(id) ON DELETE CASCADE,
        password_hash text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE platform_identity_links (
        provider text NOT NULL,
        provider_subject text NOT NULL,
        account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        username_snapshot text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (provider, provider_subject),
        UNIQUE (provider, account_id)
      );

      CREATE TABLE platform_sessions (
        token_hash text PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX platform_sessions_account_idx ON platform_sessions(account_id);
      CREATE INDEX platform_sessions_expiry_idx ON platform_sessions(expires_at);

      CREATE TABLE platform_wallets (
        account_id uuid PRIMARY KEY REFERENCES platform_accounts(id) ON DELETE CASCADE,
        balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
        version bigint NOT NULL DEFAULT 0
      );

      CREATE TABLE platform_wallet_entries (
        id uuid PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        game_id text,
        amount bigint NOT NULL CHECK (amount <> 0),
        entry_type text NOT NULL CHECK (entry_type IN ('grant', 'spend', 'refund', 'adjustment')),
        reason_code text NOT NULL,
        reference_id text NOT NULL,
        idempotency_key text NOT NULL,
        balance_after bigint NOT NULL CHECK (balance_after >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (game_id, idempotency_key)
      );
      CREATE INDEX platform_wallet_entries_account_idx ON platform_wallet_entries(account_id, created_at DESC);

      CREATE TABLE platform_launch_tickets (
        code_hash text PRIMARY KEY,
        account_id uuid NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
        game_id text NOT NULL,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX platform_launch_tickets_expiry_idx ON platform_launch_tickets(expires_at);
    `,
  },
] as const;
