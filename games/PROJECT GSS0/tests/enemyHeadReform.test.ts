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
    expect(gameSource).toContain('headSprite.size * (0.16 + pulse * 0.035)');
    expect(gameSource).not.toContain('headSprite.size * (0.42 + pulse * 0.34)');
    const presentation = gameSource.match(/function playEnemyHeadReformPresentation[\s\S]*?\n  \}\n\n  function damageEnemy/u)?.[0];
    expect(presentation).toContain('endRadius: radius * 1.65');
    expect(presentation).not.toContain('ENEMY_DEATH_HEAD_PARTICLES');
    expect(presentation).not.toContain('type: "beam"');
    expect(gameSource).toContain('operation.promoteHead');
    expect(gameSource).toContain('pendingEnemyHeadReforms');
  });

  it('旋刃弹复用普通子弹的统一断首规则', () => {
    expect(gameSource).not.toContain('function bladeHitSegmentIndex');
    expect(serverSource).not.toContain('private bladeHitSegmentIndex');
    expect(gameSource).toContain('damageEnemy(enemy, 1, node.x, node.y, projectile.color, { hitSegmentIndex });');
    expect(serverSource).toContain('this.damageTarget(owner, hostile, 1, hitPoint, projectile.color, segmentIndex);');
    expect(moduleCatalogSource).toContain('发射1枚永久环绕玩家蛇头的旋刃弹');
  });
});
