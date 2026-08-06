import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { ENEMY_ARCHETYPES } from '../src/shared/enemyArchetypes';
import { ENEMY_ARCHETYPE_IDS } from '../src/shared/protocol';

const codexSource = readFileSync(new URL('../enemy-codex.js', import.meta.url), 'utf8');
const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
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
  it('十二种敌人资料与本地、联机运行时原型保持一致', () => {
    const localArchetypeIds = [...gameSource.matchAll(/enemyArchetype\("([^"]+)"/g)]
      .map((match) => match[1]);
    expect(codex.entries.map((entry) => entry.id)).toEqual(ENEMY_ARCHETYPE_IDS);
    expect(localArchetypeIds).toEqual(ENEMY_ARCHETYPE_IDS);
    expect(ENEMY_ARCHETYPES.map((entry) => entry.id)).toEqual(ENEMY_ARCHETYPE_IDS);
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

  it('只为实际执行玩家身体避障的敌人显示共享避障参数', () => {
    const avoidanceIds = new Set(['courier', 'cutter', 'coiler', 'warden']);
    const balance = { enemyBodyAvoidanceRange: 3.2 };

    for (const entry of codex.entries) {
      const hasAvoidanceParameter = codex.resolveParameters(entry.id, balance)
        .some((parameter) => parameter.label === '敌群避障');
      expect(hasAvoidanceParameter, entry.id).toBe(avoidanceIds.has(entry.id));
    }
    expect(gameSource).toContain('const ENEMY_PLAYER_BODY_AVOIDANCE = new Set(["courier", "cutter", "coiler", "warden"]);');
    expect(serverSource).toContain("const ENEMY_PLAYER_BODY_AVOIDANCE = new Set<EnemyArchetypeId>(['courier', 'cutter', 'coiler', 'warden']);");
  });

  it('行为持续时间保留小数精度，不与解锁时间混用', () => {
    const parameters = codex.resolveParameters('headhunter', {
      enemyHeadHunterUnlockSeconds: 60,
      enemyHeadHunterSpawnWeight: 3,
      enemyHeadHunterHealthWeight: 1,
      enemyHeadHunterSpeedMultiplier: 1.8,
      enemyHeadHunterTurnMultiplier: 3,
      enemyHeadHunterAimDuration: 0.55,
      enemyHeadHunterLockDuration: 0.22,
      enemyHeadHunterAimSpeedMultiplier: 0.35,
      enemyHeadHunterLockSpeedMultiplier: 0
    });

    expect(parameters).toContainEqual({ label: '首次出现', value: '1:00' });
    expect(parameters).toContainEqual({ label: '瞄准时长', value: '0.55秒' });
    expect(parameters).toContainEqual({ label: '锁定时长', value: '0.22秒' });
  });

  it('轰击体资料区分本体参数、障碍弹与分离式预警', () => {
    const parameters = codex.resolveParameters('bombardier', {
      enemyBombardierUnlockSeconds: 180,
      enemyBombardierSpawnWeight: 1.25,
      enemyBombardierHealthWeight: 3,
      enemyBombardierSpeedMultiplier: 0.7,
      enemyBombardierTurnMultiplier: 0.85,
      enemyBombardierFireInterval: 5.5,
      enemyBombardierAimDuration: 1.1,
      enemyBombardierLockDuration: 0.45,
      enemyBombardierProjectileSpeed: 5.2,
      enemyBombardierProjectileRadiusCells: 0.34,
      enemyBombardierProjectileSpawnGapCells: 0.15,
      enemyBombardierWarningLengthCells: 3.2,
      enemyBombardierWarningWidthCells: 0.09,
      enemyBombardierWarningGapCells: 0.35,
      enemyBombardierWarningPulseRate: 3.2,
    });

    expect(parameters).toContainEqual({ label: '首次出现', value: '3:00' });
    expect(parameters).toContainEqual({ label: '障碍弹速度', value: '5.2格/秒' });
    expect(parameters).toContainEqual({ label: '预警分离', value: '0.35格' });
    expect(parameters.some((parameter) => parameter.label === '敌群避障')).toBe(false);
  });

  it('主菜单入口、图鉴弹层和关闭流程完整接入', () => {
    expect(indexHtml).toContain('id="enemy-codex-button"');
    expect(indexHtml).toContain('id="enemy-codex-screen"');
    expect(indexHtml).toContain('id="enemy-codex-list"');
    expect(indexHtml).toContain('src="enemy-codex.js?v=154"');
    expect(gameSource).toContain('function renderEnemyCodex()');
    expect(gameSource).toContain('ui.enemyCodexButton.addEventListener("click", openEnemyCodex);');
    expect(gameSource).toContain('ui.enemyCodexCloseButton.addEventListener("click", closeEnemyCodex);');
    expect(styles).toContain('.enemy-codex-card');
    expect(styles).toContain('.enemy-codex-parameters');
    expect(gameSource).toContain('window.GSS0EnemyCodex.resolveParameters(entry.id, DESIGNER_BALANCE)');
    expect(indexHtml).toContain('<span>连接式实心箭头表示敌人本体将沿该方向冲撞</span>');
    expect(indexHtml).toContain('<span>分离式空心箭头与圆弹符号表示轰击弹道</span>');
    expect(styles).toContain('grid-template-columns: minmax(300px, 0.86fr) minmax(300px, 1fr);');
  });

  it('设计控制台复用敌人资料与身体预览，并把专属参数放入第三页', () => {
    expect(editorHtml).toContain('src="enemy-codex.js?v=154"');
    expect(editorHtml).toContain('enemyCodex.entries.map((entry) =>');
    expect(editorHtml).toContain('enemyCodex.drawPreview(canvas, entry.id);');
    expect(editorHtml).toContain('ui.enemiesView.hidden = tab.dataset.view !== "enemies";');
    expect(editorHtml).toContain('ENEMY_PARAMETER_GROUPS.has(definition.group)');
  });
});
