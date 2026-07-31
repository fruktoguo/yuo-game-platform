import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');

describe('纯单机模式入口', () => {
  it('主菜单按钮会锁定本地模式、断开联机并启动原版单机流程', () => {
    expect(indexHtml).toContain('id="local-mode-button"');
    expect(gameSource).toContain('localModeButton: document.querySelector("#local-mode-button")');
    expect(gameSource).toContain('localModeForced = true;');
    expect(gameSource).toContain('network.enabled = false;');
    expect(gameSource).toContain('socket?.disconnect?.();');
    expect(gameSource).toContain('ui.localModeButton.addEventListener("click", startPureLocalGame);');
    expect(gameSource).toContain('startGame();');
  });
});
