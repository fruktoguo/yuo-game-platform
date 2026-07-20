import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

runInThisContext(readFileSync(new URL('../lobby-navigation.js', import.meta.url), 'utf8'));

const navigation = (globalThis as typeof globalThis & {
  GSS0LobbyNavigation: {
    resolveLobbyUrl(options: { currentHref: string; referrer?: string }): string;
  };
}).GSS0LobbyNavigation;

describe('返回大厅导航', () => {
  it('优先返回实际来源大厅，不受过期配置地址影响', () => {
    expect(navigation.resolveLobbyUrl({
      currentHref: 'https://game.dstopology.com/snake/?launch_code=ticket&lobby_url=https%3A%2F%2Fold.example.com%2F',
      referrer: 'https://game.dstopology.com/',
    })).toBe('https://game.dstopology.com/');
  });

  it.each([
    'https://game.dstopology.com/snake',
    'https://game.dstopology.com/snake/',
    'https://game.dstopology.com/snake/index.html',
    'https://game.dstopology.com/snake/?launch_code=again&lobby_url=https%3A%2F%2Fgame.dstopology.com%2Fsnake%2F',
  ])('拒绝指回游戏或递归启动的大厅地址：%s', (lobbyUrl) => {
    const current = new URL('https://game.dstopology.com/snake/');
    current.searchParams.set('lobby_url', lobbyUrl);
    expect(navigation.resolveLobbyUrl({ currentHref: current.toString() }))
      .toBe('https://game.dstopology.com/');
  });

  it('保留合法的跨域大厅地址并移除页面片段', () => {
    const current = new URL('https://snake.example.com/play/index.html');
    current.searchParams.set('lobby_url', 'https://lobby.example.com/games?tab=recent#snake');
    expect(navigation.resolveLobbyUrl({ currentHref: current.toString() }))
      .toBe('https://lobby.example.com/games?tab=recent');
  });

  it('本地开发和直接打开文件时都回到本地大厅', () => {
    expect(navigation.resolveLobbyUrl({ currentHref: 'http://127.0.0.1:5176/index.html' }))
      .toBe('http://127.0.0.1:3100/');
    expect(navigation.resolveLobbyUrl({ currentHref: 'file:///D:/games/PROJECT%20GSS0/index.html' }))
      .toBe('http://127.0.0.1:3100/');
  });
});
