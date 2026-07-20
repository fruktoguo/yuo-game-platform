import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

describe('界面设置', () => {
  it('使用正式游戏名并在左上品牌卡显示当前版本', () => {
    expect(indexHtml).toContain('<title>代号：几何贪吃蛇</title>');
    expect(indexHtml).toContain('<h1 id="game-title"><span>代号：几何贪吃蛇</span></h1>');
    expect(indexHtml).toContain('<span class="brand-version" aria-label="游戏版本 V47">V47</span>');
    expect(styles).toContain('.brand-version');
  });

  it('新存档默认使用 150% 字体并允许调整到 200%', () => {
    expect(gameSource).toContain('loadSetting("ultra-snake-font-scale", 1.5, 0.5, 2)');
    expect(gameSource).toContain('fontScale = clamp(value, 0.5, 2)');
    expect(indexHtml).toContain('id="font-output" for="font-slider">150%</output>');
    expect(indexHtml).toContain('id="font-slider" type="range" min="50" max="200" step="10" value="150"');
  });

  it('玩家铭牌的全部几何尺寸跟随字体比例', () => {
    expect(gameSource).toContain('const labelScale = fontScale;');
    expect(gameSource).toContain('const textPadding = 14 * labelScale;');
    expect(gameSource).toContain('const maxWidth = clamp(arena.cellSize * 5.2, 112, 172) * labelScale;');
    expect(gameSource).toContain('ctx.lineWidth = (target.isSelf ? 1.4 : 1) * labelScale;');
  });

  it('八个右上角按钮使用零延迟自定义提示', () => {
    const settingButtonIds = [
      'lobby-button',
      'font-button',
      'sound-button',
      'motion-button',
      'background-pause-button',
      'automatic-mode-button',
      'description-button',
      'pause-button'
    ];

    for (const id of settingButtonIds) {
      const buttonTag = indexHtml.match(new RegExp(`<button id="${id}"[^>]*>`))?.[0];
      expect(buttonTag).toBeDefined();
      expect(buttonTag).not.toContain(' title=');
    }
    expect(indexHtml.match(/class="setting-control" data-tooltip=/g)).toHaveLength(settingButtonIds.length);
    expect(gameSource).toContain('control.dataset.tooltip = tooltipLabel;');
    expect(styles).toContain('.setting-control[data-tooltip]:not(.is-open):hover::after');
    const tooltipRule = styles.match(/\.setting-control\[data-tooltip\]::after\s*\{([^}]*)\}/)?.[1];
    expect(tooltipRule).toBeDefined();
    expect(tooltipRule).not.toContain('transition');
  });
});
