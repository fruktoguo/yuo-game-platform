import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMY_VITALITY } from '../src/shared/enemyVitality';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('敌人异质关节生命', () => {
  it('长度在 1 到总生命之间均匀抽取，并允许单头重甲与全身一血', () => {
    expect(ENEMY_VITALITY.chooseJointCount(8, () => 0)).toBe(1);
    expect(ENEMY_VITALITY.chooseJointCount(8, () => 0.999999)).toBe(8);

    const heavyHead = ENEMY_VITALITY.allocateForJointCount(8, 1, () => 0.5);
    expect(heavyHead.joints).toEqual([{ health: 8, maxHealth: 8 }]);

    const longSnake = ENEMY_VITALITY.allocateForJointCount(8, 8, () => 0.5);
    expect(longSnake.joints).toHaveLength(8);
    expect(longSnake.joints.every((joint) => joint.health === 1 && joint.maxHealth === 1)).toBe(true);
  });

  it('每节先获得 1 点，再逐点随机分配剩余生命且总和严格守恒', () => {
    const allocation = ENEMY_VITALITY.allocateForJointCount(
      13,
      5,
      sequence([0, 0.2, 0.4, 0.6, 0.8]),
    );

    expect(allocation.joints.map((joint) => joint.health)).toEqual([3, 3, 3, 2, 2]);
    expect(allocation.joints.reduce((sum, joint) => sum + joint.health, 0)).toBe(13);
    expect(allocation.joints.every((joint) => joint.health === joint.maxHealth)).toBe(true);
  });

  it('工兵至少以两节和两点总生命出生，尾节转移前后生命严格守恒', () => {
    const minimum = ENEMY_VITALITY.allocateWithMinimumJointCount(1, 2, () => 0);
    expect(minimum).toEqual({
      totalHealth: 2,
      jointCount: 2,
      joints: [{ health: 1, maxHealth: 1 }, { health: 1, maxHealth: 1 }],
    });
    expect(ENEMY_VITALITY.chooseJointCountAtLeast(8, 2, () => 0)).toBe(2);
    expect(ENEMY_VITALITY.chooseJointCountAtLeast(8, 2, () => 0.999999)).toBe(8);

    const engineer = {
      health: 5,
      maxHealth: 8,
      segments: [
        { health: 3, maxHealth: 4 },
        { health: 7, maxHealth: 9, marker: '真实尾节' },
      ],
    };
    const transfer = ENEMY_VITALITY.detachTail(engineer);
    expect(transfer).not.toBeNull();
    if (!transfer) throw new Error('工兵尾节转移失败');
    expect(transfer.joint).toMatchObject({ health: 7, maxHealth: 9, marker: '真实尾节' });
    expect(engineer.segments).toHaveLength(1);
    expect(transfer.currentAfter).toBe(8);
    expect(transfer.currentAfter + transfer.currentTransferred).toBe(transfer.currentBefore);
    expect(transfer.maximumAfter + transfer.maximumTransferred).toBe(transfer.maximumBefore);
  });

  it('伤害只修改命中的关节，溢出不会传播到相邻关节', () => {
    const joints = ENEMY_VITALITY.allocateForJointCount(4, 2, sequence([0, 1])).joints;
    expect(joints.map((joint) => joint.health)).toEqual([2, 2]);

    const result = ENEMY_VITALITY.damage(joints[0], 9);
    expect(result).toEqual({ before: 2, after: 0, applied: 2, destroyed: true });
    expect(joints.map((joint) => joint.health)).toEqual([0, 2]);

    ENEMY_VITALITY.damage(joints[1], 1);
    expect(joints.map((joint) => joint.health)).toEqual([0, 1]);
  });

  it('本地、服务端和调试验收入口统一接入共享生命核心', () => {
    expect(indexHtml).toContain('<script src="enemy-vitality.js?v=157"></script>');
    expect(gameSource).toContain('enemyVitalityApi.allocate(assignedHealth, Math.random)');
    expect(gameSource).toContain('enemyVitalityApi.allocateForJointCount(showcaseHealth, 1, Math.random)');
    expect(gameSource).toContain('ENEMY_ARMOR_SHOWCASE_HEALTHS');
    expect(gameSource).toContain('enemyVitalityApi.allocateWithMinimumJointCount(showcaseHealth ?? assignedHealth, 2, Math.random)');
    expect(serverSource).toContain("archetype.id === 'engineer'");
    expect(serverSource).toContain('ENEMY_VITALITY.allocateWithMinimumJointCount(assignedHealth, 2, () => this.random())');
    expect(serverSource).toContain('ENEMY_VITALITY.allocate(assignedHealth, () => this.random())');
    expect(gameSource).toContain('const damageResult = enemyVitalityApi.damage(hitJoint, safeAmount);');
    expect(serverSource).toContain('const damageResult = ENEMY_VITALITY.damage(hitJoint, safeAmount);');
    expect(gameSource).toContain('get("debug-joint-health") === "1"');
    expect(gameSource).toContain('function drawEnemyJointHealth(enemy, pieceScale)');
  });
});
