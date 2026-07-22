import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ENEMY_ARCHETYPE_IDS } from '../src/shared/protocol';

const codexSource = readFileSync(new URL('../enemy-codex.js', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

runInThisContext(codexSource);

const codex = (globalThis as typeof globalThis & {
  GSS0EnemyCodex: {
    entries: Array<{ id: string; name: string; role: string; description: string; traits: string[] }>;
    byId: Record<string, unknown>;
    resolveParameters(enemyId: string, balance: Record<string, number>): Array<{ label: string; value: string }>;
    drawPreview(canvas: unknown, enemyId: string): boolean;
  };
}).GSS0EnemyCodex;

describe('敌人图鉴', () => {
  it('七种敌人资料与联机运行时原型保持一致', () => {
    expect(codex.entries.map((entry) => entry.id)).toEqual(ENEMY_ARCHETYPE_IDS);
    expect(codex.entries.every((entry) => entry.name && entry.role && entry.description && entry.traits.length === 3)).toBe(true);
    expect(Object.keys(codex.byId)).toEqual(ENEMY_ARCHETYPE_IDS);
    expect(typeof codex.resolveParameters).toBe('function');
    expect(typeof codex.drawPreview).toBe('function');
  });

  it('从实时设计配置解析公共参数与敌人专属参数', () => {
    const balance = {
      enemyBodyAvoidanceRange: 3.2,
      enemyWardenUnlockSeconds: 240,
      enemyWardenSpawnWeight: 1,
      enemyWardenHealthWeight: 8,
      enemyWardenSpeedMultiplier: 0.6,
      enemyWardenTurnMultiplier: 0.9,
      enemyWardenFoodRange: 6,
      enemyWardenKnockbackMultiplier: 2
    };
    expect(codex.resolveParameters('warden', balance)).toEqual([
      { label: '首次出现', value: '4:00' },
      { label: '刷新权重', value: '1' },
      { label: '生命权重', value: '8' },
      { label: '速度倍率', value: '0.6×' },
      { label: '转向倍率', value: '0.9×' },
      { label: '敌群避障', value: '3.2格' },
      { label: '抢球范围', value: '6格' },
      { label: '头撞击退', value: '2×' }
    ]);
  });

  it('主菜单入口、图鉴弹层和关闭流程完整接入', () => {
    expect(indexHtml).toContain('id="enemy-codex-button"');
    expect(indexHtml).toContain('id="enemy-codex-screen"');
    expect(indexHtml).toContain('id="enemy-codex-list"');
    expect(indexHtml).toContain('src="enemy-codex.js?v=112"');
    expect(gameSource).toContain('function renderEnemyCodex()');
    expect(gameSource).toContain('ui.enemyCodexButton.addEventListener("click", openEnemyCodex);');
    expect(gameSource).toContain('ui.enemyCodexCloseButton.addEventListener("click", closeEnemyCodex);');
    expect(styles).toContain('.enemy-codex-card');
    expect(styles).toContain('.enemy-codex-parameters');
    expect(gameSource).toContain('window.GSS0EnemyCodex.resolveParameters(entry.id, DESIGNER_BALANCE)');
    expect(styles).toContain('grid-template-columns: minmax(300px, 0.86fr) minmax(300px, 1fr);');
  });

  it('设计控制台复用敌人资料与身体预览，并把专属参数放入第三页', () => {
    expect(editorHtml).toContain('src="enemy-codex.js?v=112"');
    expect(editorHtml).toContain('enemyCodex.entries.map((entry) =>');
    expect(editorHtml).toContain('enemyCodex.drawPreview(canvas, entry.id);');
    expect(editorHtml).toContain('ui.enemiesView.hidden = tab.dataset.view !== "enemies";');
    expect(editorHtml).toContain('ENEMY_PARAMETER_GROUPS.has(definition.group)');
  });
});
