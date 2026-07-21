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
  });

  it('联机服务端仅向伤害归属玩家发送数字', () => {
    expect(serverSource).toContain('if (owner) {');
    expect(serverSource).toContain('ENEMY_DAMAGE_NUMBER_DURATION, owner.entityId, true, true');
    expect(protocolSource).toContain('damageNumber?: boolean');
  });
});
