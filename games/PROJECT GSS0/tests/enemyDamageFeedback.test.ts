import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const protocolSource = readFileSync(new URL('../src/shared/protocol.ts', import.meta.url), 'utf8');

describe('敌人伤害数字反馈', () => {
  it('本地仅为玩家造成的伤害显示强调数字，并统一全部浮动文字字号', () => {
    expect(gameSource).toContain('const causedByPlayer = options.rewardSelf !== false;');
    expect(gameSource).toContain('life: ENEMY_DAMAGE_NUMBER_DURATION');
    expect(gameSource).toContain('damageNumber: true');
    expect(gameSource).toContain('const COMBAT_TEXT_FONT_SIZE = designerNumber("combatTextFontSize", 38, 8, 96, true);');
    expect(gameSource).toContain('ctx.font = `900 ${COMBAT_TEXT_FONT_SIZE}px Bahnschrift, Arial Narrow, sans-serif`;');
    expect(gameSource).not.toContain('effect.damageNumber ? 38');
    expect(gameSource).toContain('effect.damageNumber ? 10');
  });

  it('联机服务端仅向伤害归属玩家发送数字', () => {
    expect(serverSource).toContain('if (owner) {');
    expect(serverSource).toContain('ENEMY_DAMAGE_NUMBER_DURATION, owner.entityId, true, true');
    expect(protocolSource).toContain('damageNumber?: boolean');
  });

  it('伤害数字只显示命中关节实际扣除值，不包含未传播的溢出伤害', () => {
    const localDamageSource = gameSource.slice(
      gameSource.indexOf('function damageEnemy('),
      gameSource.indexOf('function killEnemy('),
    );
    const serverDamageSource = serverSource.slice(
      serverSource.indexOf('private damageTarget('),
      serverSource.indexOf('private killEnemy('),
    );

    expect(localDamageSource).toContain('y: impactY + (destroysHead ? 18 : -12)');
    expect(serverDamageSource).toContain('point.row + (destroysHead ? 0.35 : -0.35)');
    expect(localDamageSource).toContain('const damageResult = enemyVitalityApi.damage(hitJoint, safeAmount);');
    expect(serverDamageSource).toContain('const damageResult = ENEMY_VITALITY.damage(hitJoint, safeAmount);');
    expect(localDamageSource).toContain('text: `-${damageResult.applied}`');
    expect(serverDamageSource).toContain('`-${damageResult.applied}`');
    expect(localDamageSource).not.toContain('text: `-${safeAmount}`');
    expect(serverDamageSource).not.toContain('`-${safeAmount}`');
    expect(localDamageSource.indexOf('if (destroysHead) killEnemy')).toBeLessThan(localDamageSource.indexOf('text: `-${damageResult.applied}`'));
    expect(serverDamageSource.indexOf('if (destroysHead) this.killEnemy')).toBeLessThan(serverDamageSource.indexOf('this.textEffect('));
  });

  it('轰击障碍弹受击后在本地与联机权威中都保持固定弹体半径', () => {
    const localDamageSource = gameSource.slice(
      gameSource.indexOf('function damageEnemy('),
      gameSource.indexOf('function killEnemy('),
    );
    const serverDamageSource = serverSource.slice(
      serverSource.indexOf('private damageTarget('),
      serverSource.indexOf('private killEnemy('),
    );

    expect(localDamageSource).toContain('hitJoint.radius = isBombardierProjectile(enemy)');
    expect(localDamageSource).toContain('ENEMY_BEHAVIOR_TUNING.bombardierProjectileRadiusCells * arena.cellSize');
    expect(serverDamageSource).toContain('hitJoint.radius = isBombardierProjectile(target)');
    expect(serverDamageSource).toContain('ENEMY_ACTIVE_BEHAVIOR_TUNING.bombardierProjectileRadiusCells');
  });
});
