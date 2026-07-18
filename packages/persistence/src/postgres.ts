import pg, { type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';

const { Pool } = pg;

export interface DatabaseMigration {
  id: string;
  sql: string;
}

export class PostgresDatabase {
  readonly pool: pg.Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    this.pool.on('error', (error) => console.error('PostgreSQL 连接池异常', error));
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, [...values]);
  }

  async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrate(migrations: readonly DatabaseMigration[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS platform_schema_migrations (
          id text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await client.query(`SELECT pg_advisory_lock(hashtext('yuo-game-platform-migrations'))`);
      try {
        const applied = await client.query<{ id: string }>('SELECT id FROM platform_schema_migrations');
        const appliedIds = new Set(applied.rows.map((row) => row.id));
        for (const migration of migrations) {
          if (appliedIds.has(migration.id)) continue;
          await client.query('BEGIN');
          try {
            await client.query(migration.sql);
            await client.query('INSERT INTO platform_schema_migrations (id) VALUES ($1)', [migration.id]);
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }
      } finally {
        await client.query(`SELECT pg_advisory_unlock(hashtext('yuo-game-platform-migrations'))`);
      }
    } finally {
      client.release();
    }
  }

  close(): Promise<void> {
    return this.pool.end();
  }
}

export function postgresConfigFromEnv(environment: NodeJS.ProcessEnv = process.env): PoolConfig {
  return {
    connectionString: environment.DATABASE_URL ?? 'postgres://game_platform:game_platform@127.0.0.1:54329/game_platform',
    max: parseInteger(environment.DATABASE_POOL_SIZE, 12, 2, 50),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: environment.DATABASE_APPLICATION_NAME ?? 'yuo-game-platform',
  };
}

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
