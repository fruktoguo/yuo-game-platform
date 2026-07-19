import type { AccountView, IdentityProviderProfile } from '@yuo-platform/contracts';
import type { PostgresDatabase } from '@yuo-platform/persistence';
import { describe, expect, it, vi } from 'vitest';
import { PlatformRepository } from '../src/repository';

const profile: IdentityProviderProfile = {
  provider: 'sample-platform',
  subject: '42',
  username: 'shared-name',
  displayName: '外部玩家',
};

describe('外部身份账号映射', () => {
  it('按 provider 和 subject 返回已有账号并刷新用户名快照', async () => {
    const account = accountRow('existing-account', 'original-name');
    const query = vi.fn(async (sql: string, _parameters: unknown[] = []) => {
      if (sql.includes('FROM platform_identity_links')) return { rows: [account] };
      return { rows: [] };
    });
    const repository = repositoryWithTransaction(query);

    const result = await repository.findOrCreateExternalAccount(profile);

    expect(result).toEqual(accountView(account));
    expect(query.mock.calls.some(([sql]) => String(sql).includes('UPDATE platform_identity_links'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO platform_accounts'))).toBe(false);
  });

  it('用户名冲突时创建带稳定后缀的新账号，不合并同名账号', async () => {
    const inserted = accountRow('new-external-account', 'shared-name_a1a2a3a4');
    let accountInsertCount = 0;
    const query = vi.fn(async (sql: string, _parameters: unknown[] = []) => {
      if (sql.includes('FROM platform_identity_links')) return { rows: [] };
      if (sql.includes('INSERT INTO platform_accounts')) {
        accountInsertCount += 1;
        return { rows: accountInsertCount === 1 ? [] : [inserted] };
      }
      return { rows: [] };
    });
    const repository = repositoryWithTransaction(query);

    const result = await repository.findOrCreateExternalAccount(profile);

    expect(result).toEqual(accountView(inserted));
    const accountInserts = query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO platform_accounts'));
    expect(accountInserts).toHaveLength(2);
    expect(accountInserts[0]?.[1]?.[1]).toBe('shared-name');
    expect(accountInserts[1]?.[1]?.[1]).toMatch(/^shared-name_[0-9a-f]{8}$/u);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO platform_identity_links'))).toBe(true);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO platform_wallets'))).toBe(true);
  });
});

function repositoryWithTransaction(query: ReturnType<typeof vi.fn>): PlatformRepository {
  const database = {
    transaction: async <T>(operation: (client: { query: typeof query }) => Promise<T>): Promise<T> => operation({ query }),
  } as unknown as PostgresDatabase;
  return new PlatformRepository(database);
}

function accountRow(id: string, username: string) {
  return {
    id,
    username,
    display_name: '外部玩家',
    status: 'active' as const,
    created_at: new Date('2026-07-19T00:00:00.000Z'),
  };
}

function accountView(row: ReturnType<typeof accountRow>): AccountView {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}
