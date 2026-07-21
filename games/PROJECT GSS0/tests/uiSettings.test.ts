import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

describe('界面设置', () => {
  it('使用正式游戏名并在左上品牌卡显示当前版本', () => {
    expect(indexHtml).toContain('<title>代号：几何贪吃蛇</title>');
    expect(indexHtml).toContain('<h1 id="game-title"><span>代号：几何贪吃蛇</span></h1>');
    expect(indexHtml).toContain('<span class="brand-version" aria-label="游戏版本 V73">V73</span>');
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
    expect(indexHtml).toContain('src="module-progression.js?v=73"');
    expect(gameSource).toContain('MODULE_PROGRESSION.moduleUpgradePreview');
    expect(gameSource).toContain('progression.levelLabel');
    expect(gameSource).toContain('ui.rack.dataset.capacity');
    expect(gameSource).toContain('MODULE_PROGRESSION.moduleCurrentEffect');
    expect(gameSource).toContain('slot.className = "rack-slot rack-slot-empty";');
    expect(gameSource).toContain('item.dataset.tooltip =');
    expect(styles).toContain('.card-progression');
    expect(styles).toContain('content: "槽位 " attr(data-capacity);');
    expect(styles).toContain('flex-flow: row nowrap;');
    expect(styles).toContain('.rack-module:hover::after');
    expect(styles).toMatch(/\.upgrade-screen\s*\{\s*z-index: 8;/u);
    const desktopUpgradeRule = styles.match(/@media \(min-width: 1200px\)\s*\{[\s\S]*?\.upgrade-screen\s*\{([^}]*)\}/u)?.[1];
    expect(desktopUpgradeRule).toContain('padding-inline: calc(clamp(340px, 22vw, 428px) + 38px);');
    expect(desktopUpgradeRule).not.toContain('padding-right');
    expect(styles.match(/\.module-rack\s*\{([^}]*)\}/u)?.[1]).toContain('pointer-events: auto;');
  });

  it('生命参数范围与球生成动画保持设计控制台和运行时一致', () => {
    expect(indexHtml).toContain('id="module-rack"');
    expect(gameSource).toContain('const FOOD_BIRTH_DURATION = designerNumber("foodBirthDuration"');
    expect(gameSource).toContain('const birthScale =');
    expect(gameSource).toContain('food.birthAge = 0;');
    expect(indexHtml).toContain('初始拥有 20 点耐久，每秒恢复 0.5 点');
    expect(indexHtml).toContain('id="shield-fill" class="shield-fill" data-charges="0"');
    expect(styles).toContain('.shield-fill.is-active');
    expect(styles).toContain('.health-group.is-heal');
  });

  it('联机入口从一名玩家起始终显示共享世界界面', () => {
    expect(gameSource).toContain('ui.shell.classList.toggle("is-multiplayer", network.enabled);');
    expect(gameSource).toContain('if (network.enabled) drawPlayerIdLabel(player, pieceScale);');
    expect(gameSource).not.toContain('connected.length > 1');
    expect(gameSource).not.toContain('network.multiplayer');
    expect(styles).not.toMatch(/#game-shell\.is-multiplayer\s+\.module-rack\s*\{[^}]*display:\s*none;/u);
    expect(styles).toMatch(/#game-shell\.is-multiplayer:not\(\.is-menu\)\s+\.multiplayer-scoreboard\s*\{\s*display:\s*block;/u);
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
    expect(indexHtml).toContain('src="module-catalog.js?v=73"');
    expect(gameSource).toContain('const MODULE_CATALOG = globalThis.GSS0ModuleCatalog;');
    expect(gameSource).not.toContain('SHORT_MODULE_DESCRIPTIONS');
    expect(gameSource).not.toContain('gss0-detailed-descriptions');
  });

  it('机体图鉴隐藏禁用机体并支持按类型筛选', () => {
    expect(indexHtml).toContain('id="codex-category-filter"');
    expect(indexHtml).toContain('data-category="进攻"');
    expect(indexHtml).toContain('data-category="生存"');
    expect(indexHtml).toContain('data-category="辅助"');
    expect(indexHtml).toContain('data-category="发育"');
    expect(indexHtml).toContain('id="codex-count"');
    expect(gameSource).toContain('const CODEX_MODULES = MODULES.filter((module) => MODULE_DESIGN_STATES[module.id] !== "disabled");');
    expect(gameSource).toContain('module.category === moduleCodexCategory');
    expect(gameSource).toContain('CODEX_ARCHIVE_NUMBERS.get(module.id)');
    expect(styles).toContain('.codex-category-filter');
    expect(styles).toContain('.codex-empty');
  });
});
