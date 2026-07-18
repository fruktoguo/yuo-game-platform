import { describe, expect, it } from 'vitest';
import { createGameSessionToken, parseCookieHeader, verifyGameSessionToken } from '../src';

const secret = 'test-game-session-secret-at-least-thirty-two-bytes';
const principal = {
  accountId: '5ac52a86-cdc4-49c3-b27e-e1c35aa04bc8',
  username: 'tester',
  displayName: '测试玩家',
  gameId: 'life-commons',
};

describe('游戏平台游戏会话', () => {
  it('签发限定游戏和有效期的会话', () => {
    const token = createGameSessionToken(principal, secret, 60, 1_000_000);
    expect(verifyGameSessionToken(token, secret, 'life-commons', 1_030_000)).toEqual(principal);
    expect(verifyGameSessionToken(token, secret, 'billiards-arena', 1_030_000)).toBeNull();
    expect(verifyGameSessionToken(token, secret, 'life-commons', 1_061_000)).toBeNull();
  });

  it('拒绝被修改的会话签名', () => {
    const token = createGameSessionToken(principal, secret, 60);
    expect(verifyGameSessionToken(`${token}x`, secret, 'life-commons')).toBeNull();
  });

  it('解析标准 Cookie 头', () => {
    expect(parseCookieHeader('theme=dark; game_session=abc%2Edef')).toEqual({ theme: 'dark', game_session: 'abc.def' });
  });
});
