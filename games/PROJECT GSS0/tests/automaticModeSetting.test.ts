import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');

describe('自动模式设置', () => {
  it('主菜单四格按单人、多人、机体图鉴、敌人图鉴排列', () => {
    const actions = indexHtml.match(/<div class="start-actions">([\s\S]*?)<\/div>/u)?.[1] ?? '';
    const ids = ['local-mode-button', 'multiplayer-mode-button', 'codex-button', 'enemy-codex-button'];
    for (let index = 1; index < ids.length; index += 1) {
      expect(actions.indexOf(ids[index - 1])).toBeLessThan(actions.indexOf(ids[index]));
    }
    expect(actions).not.toContain('changelog-button');
    expect(indexHtml).toContain('class="start-secondary-actions"');
    expect(indexHtml).toContain('id="changelog-button"');
    expect(indexHtml).not.toContain('id="auto-test-button"');
  });

  it('右上角开关持久化，并热切换自动移动、升级和重开', () => {
    expect(indexHtml).toContain('id="automatic-mode-toggle"');
    expect(gameSource).toContain('loadSetting("gss0-automatic-mode", 0, 0, 1)');
    expect(gameSource).toContain('player.desiredAngle = testAutopilotAngle();');
    expect(gameSource).toContain('function scheduleAutomaticUpgrade()');
    expect(gameSource).toContain('MODULE_PROGRESSION.chooseAutomaticUpgradeIds');
    expect(gameSource).toContain('if (automaticModeEnabled) startGame();');
    expect(gameSource).toContain('emitNetworkAction("ultra:autopilot", automaticModeEnabled)');
    expect(gameSource).toContain('networkPlayerPredictionRuntime.adoptLocal(player);');
    expect(serverSource).toContain('if (enabled && player.choosingUpgrade && player.upgradeOffer)');
    expect(serverSource).toContain('MODULE_PROGRESSION.chooseAutomaticUpgradeIds');
    expect(gameSource).toContain('const damage = playerHeadDamage(hitHead);');
    expect(serverSource).toContain('this.playerHeadDamage(player, hitHead),');
    expect(gameSource).not.toContain('repel(enemy, 3.2, 3.5);');
    expect(serverSource).not.toContain('repel(enemy, 3.2, 3.5);');
  });

  it('自动模式不再绕过独立的后台暂停设置', () => {
    expect(gameSource).toContain('if (backgroundPauseEnabled && state === "running") setPaused(true);');
    expect(gameSource).toContain('if (document.hidden && backgroundPauseEnabled && state === "running") setPaused(true);');
  });

  it('多人自动模式把救援插入高优先目标与吃球之间', () => {
    const stepSource = serverSource.slice(
      serverSource.indexOf('step(deltaSeconds:'),
      serverSource.indexOf('getSnapshot('),
    );
    const autopilotSource = serverSource.slice(
      serverSource.indexOf('private autopilotAngle('),
      serverSource.indexOf('private ghostAutopilotAngle('),
    );

    expect(stepSource).toContain('this.autopilotAngle(player, present)');
    expect(autopilotSource.indexOf('for (const enemy of this.enemies)')).toBeLessThan(autopilotSource.indexOf('if (!hasHigherPriorityTarget)'));
    expect(autopilotSource.indexOf('if (!hasHigherPriorityTarget)')).toBeLessThan(autopilotSource.indexOf('const targetCol = target.col - player.col;'));
    expect(autopilotSource).toContain('if (other === player || !other.ghost) continue;');
    expect(autopilotSource).toContain('if (other === player || other.ghost || other.paused || other.choosingUpgrade) continue;');
  });
});
