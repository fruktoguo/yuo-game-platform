import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/passwords';

describe('平台密码凭据', () => {
  it('使用带随机盐的 scrypt 哈希并正确校验', async () => {
    const first = await hashPassword('足够安全的测试密码-2026');
    const second = await hashPassword('足够安全的测试密码-2026');
    expect(first).not.toBe(second);
    expect(await verifyPassword('足够安全的测试密码-2026', first)).toBe(true);
    expect(await verifyPassword('错误密码', first)).toBe(false);
  });
});
