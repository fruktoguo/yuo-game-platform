import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

describe('界面设置', () => {
  it('使用正式游戏名并在左上品牌卡显示当前版本', () => {
    expect(indexHtml).toContain('<title>代号：几何贪吃蛇</title>');
    expect(indexHtml).toContain('<h1 id="game-title"><span>代号：几何贪吃蛇</span></h1>');
    expect(indexHtml).toContain('<span class="brand-version" aria-label="游戏版本 V57">V57</span>');
    expect(styles).toContain('.brand-version');
    const brandTitleRule = styles.match(/\.brand-lockup strong\s*\{([^}]*)\}/)?.[1];
    const brandVersionRule = styles.match(/\.brand-version\s*\{([^}]*)\}/)?.[1];
    expect(brandTitleRule).toContain('overflow: visible;');
    expect(brandTitleRule).toContain('line-height: 1.15;');
    expect(brandTitleRule).toContain('transform: translateY(calc(2px * var(--font-scale)));');
    expect(brandVersionRule).toContain('transform: translateY(calc(2px * var(--font-scale)));');
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

  it('机体卡片区分实际冷却与被动效果', () => {
    expect(gameSource).toContain('module.activeCooldown ? `冷却 · ${module.cooldown}` : module.cooldown');
    expect(gameSource).not.toContain('`随头部·${formatCooldownSeconds(HEAD_ATTACK_INTERVAL)}`');
  });

  it('升级卡展示机体等级变化且机体架显示槽位占用', () => {
    expect(indexHtml).toContain('src="module-progression.js?v=57"');
    expect(gameSource).toContain('MODULE_PROGRESSION.moduleUpgradePreview');
    expect(gameSource).toContain('progression.levelLabel');
    expect(gameSource).toContain('ui.rack.dataset.capacity');
    expect(styles).toContain('.card-progression');
    expect(styles).toContain('content: "槽位 " attr(data-capacity);');
  });

  it('联机入口从一名玩家起始终显示共享世界界面', () => {
    expect(gameSource).toContain('ui.shell.classList.toggle("is-multiplayer", network.enabled);');
    expect(gameSource).toContain('if (network.enabled) drawPlayerIdLabel(player, pieceScale);');
    expect(gameSource).not.toContain('connected.length > 1');
    expect(gameSource).not.toContain('network.multiplayer');
    expect(indexHtml).toContain('进入多人模式即加入联机共享世界');
  });

  it('七个右上角按钮使用零延迟自定义提示', () => {
    const settingButtonIds = [
      'lobby-button',
      'font-button',
      'sound-button',
      'motion-button',
      'background-pause-button',
      'automatic-mode-button',
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
    expect(indexHtml).not.toContain('id="description-button"');
    expect(indexHtml).not.toContain('id="description-toggle"');
    expect(indexHtml).toContain('src="module-catalog.js?v=57"');
    expect(gameSource).toContain('const MODULE_CATALOG = globalThis.GSS0ModuleCatalog;');
    expect(gameSource).not.toContain('SHORT_MODULE_DESCRIPTIONS');
    expect(gameSource).not.toContain('gss0-detailed-descriptions');
  });
});
