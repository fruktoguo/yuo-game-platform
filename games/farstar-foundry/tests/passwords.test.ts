import { describe, expect, it } from 'vitest';
import { hashRoomPassword, verifyRoomPassword } from '../src/server/passwords';

describe('远星工造房间密码', () => {
  it('使用独立随机盐保存并以常量时间比较派生密钥', async () => {
    const first = await hashRoomPassword('协作房间-2026');
    const second = await hashRoomPassword('协作房间-2026');
    expect(first).not.toBe(second);
    expect(await verifyRoomPassword('协作房间-2026', first)).toBe(true);
    expect(await verifyRoomPassword('错误密码', first)).toBe(false);
  });
});
