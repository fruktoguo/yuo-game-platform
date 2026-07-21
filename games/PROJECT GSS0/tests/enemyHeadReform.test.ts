import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const protocolSource = readFileSync(new URL('../src/shared/protocol.ts', import.meta.url), 'utf8');
const moduleCatalogSource = readFileSync(new URL('../module-catalog.js', import.meta.url), 'utf8');

describe('敌蛇断首与新头接替', () => {
  it('本地与服务端都将头部伤害投影到新的蛇头位置', () => {
    expect(gameSource).toContain('const promotedHead = hitsHead && !destroysHead');
    expect(gameSource).toContain('setEnemyHeadFromPromotion(enemy, promotedHead, oldHead);');
    expect(serverSource).toContain("type: 'enemyHeadHit'");
    expect(serverSource).toContain('target.col = promotedHead.col;');
    expect(protocolSource).toContain("type: 'enemyHeadHit'");
  });

  it('头部碎裂与身体变形动画通过可靠事件在联机端重放', () => {
    expect(gameSource).toContain('function playEnemyHeadReformPresentation');
    expect(gameSource).toContain('enemy.headReform = { startedAt: performance.now(), duration: safeDuration };');
    expect(gameSource).toContain('operation.promoteHead');
    expect(gameSource).toContain('pendingEnemyHeadReforms');
  });

  it('旋刃命中蛇头也遵循统一断首规则', () => {
    expect(gameSource).toMatch(/function bladeHitSegmentIndex[\s\S]*?return -1;/u);
    expect(serverSource).toMatch(/private bladeHitSegmentIndex[\s\S]*?return -1;/u);
    expect(moduleCatalogSource).toContain('命中蛇头会触发断首与新头接替');
  });
});
