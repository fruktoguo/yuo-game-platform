import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const protocolSource = readFileSync(new URL('../src/shared/protocol.ts', import.meta.url), 'utf8');

describe('敌人伤害数字反馈', () => {
  it('本地仅为玩家造成的伤害显示强调数字', () => {
    expect(gameSource).toContain('const causedByPlayer = options.rewardSelf !== false;');
    expect(gameSource).toContain('life: ENEMY_DAMAGE_NUMBER_DURATION');
    expect(gameSource).toContain('damageNumber: true');
    expect(gameSource).toContain('effect.damageNumber ? 38');
    expect(gameSource).toContain('effect.damageNumber ? 10');
  });

  it('联机服务端仅向伤害归属玩家发送数字', () => {
    expect(serverSource).toContain('if (owner) {');
    expect(serverSource).toContain('ENEMY_DAMAGE_NUMBER_DURATION, owner.entityId, true, true');
    expect(protocolSource).toContain('damageNumber?: boolean');
  });

  it('直接摧毁敌蛇时在击破反馈之后显示伤害数字', () => {
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
    expect(localDamageSource.indexOf('if (destroysHead) killEnemy')).toBeLessThan(localDamageSource.indexOf('text: `-${appliedDamage}`'));
    expect(serverDamageSource.indexOf('if (destroysHead) this.killEnemy')).toBeLessThan(serverDamageSource.indexOf('this.textEffect('));
  });
});
