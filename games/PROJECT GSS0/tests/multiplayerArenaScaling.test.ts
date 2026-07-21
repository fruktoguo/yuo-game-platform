import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../balance-editor.html', import.meta.url), 'utf8');

describe('多人场地等级缩放', () => {
  it('按所有在场玩家总等级计算场地面积', () => {
    expect(serverSource).toContain('const totalLevel = presentPlayers.reduce((total, player) => total + Math.max(0, player.level), 0);');
    expect(serverSource).toContain('1 + totalLevel * ARENA_AREA_PER_LEVEL');
    expect(serverSource).not.toContain('const highestLevel = presentPlayers.reduce');
    expect(editorSource).toContain('多人按所有在场玩家总等级增加的场地面积倍率');
  });
});
