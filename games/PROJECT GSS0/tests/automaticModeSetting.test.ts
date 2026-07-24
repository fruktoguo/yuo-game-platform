import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';
import type { UpgradeOffer } from '../src/shared/protocol';

const gameSource = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../src/server/UltraWorld.ts', import.meta.url), 'utf8');
const protocolSource = readFileSync(new URL('../src/shared/protocol.ts', import.meta.url), 'utf8');
const roomProtocolSource = readFileSync(new URL('../src/shared/roomProtocol.ts', import.meta.url), 'utf8');
const roomHubSource = readFileSync(new URL('../src/server/RoomHub.ts', import.meta.url), 'utf8');
const p2pBootstrapSource = readFileSync(new URL('../src/client/p2p/bootstrap.ts', import.meta.url), 'utf8');

interface AutomaticModeTestPlayer {
  autopilot: boolean;
  autoSelectModules: boolean;
  autoRestart: boolean;
  col: number;
  row: number;
  angle: number;
  choosingUpgrade: boolean;
  upgradePending: boolean;
  upgradeOffer: UpgradeOffer | null;
  level: number;
}

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

  it('右上角开关与 A 键热切换自动移动，并独立控制选机和重开', () => {
    expect(indexHtml).toContain('id="automatic-mode-toggle"');
    expect(indexHtml).toContain('id="automatic-module-selection-toggle" type="checkbox"');
    expect(indexHtml).toContain('id="automatic-restart-toggle" type="checkbox"');
    expect(indexHtml).toContain('<kbd class="setting-shortcut">A</kbd>');
    expect(gameSource).toContain('loadSetting("gss0-automatic-mode", 0, 0, 1)');
    expect(gameSource).toContain('loadSetting("gss0-automatic-module-selection", 0, 0, 1)');
    expect(gameSource).toContain('loadSetting("gss0-automatic-restart", 0, 0, 1)');
    expect(gameSource).toContain('event.code === "KeyA" && !event.altKey && !event.ctrlKey && !event.metaKey');
    expect(gameSource).toContain('setAutomaticMode(!automaticModeEnabled);');
    expect(gameSource).toContain('automaticModeControl.addEventListener("mouseenter"');
    expect(gameSource).toContain('automaticModeControl.addEventListener("mouseleave"');
    expect(gameSource).not.toContain('KeyA: Math.PI');
    expect(gameSource).not.toContain('keys.has("KeyA")');
    expect(gameSource).toContain('player.desiredAngle = testAutopilotAngle();');
    expect(gameSource).toContain('function scheduleAutomaticUpgrade()');
    expect(gameSource).toContain('MODULE_PROGRESSION.chooseAutomaticUpgradeIds');
    expect(gameSource).toContain('if (automaticModeEnabled && automaticRestartEnabled) startGame();');
    expect(gameSource).toContain('emitNetworkAction("ultra:autopilot", automaticModePreferences())');
    expect(gameSource).toContain('autoRestart: network.enabled ? false : automaticRestartEnabled');
    expect(gameSource).toContain('maybeAutomaticallyVoteNetworkRestart();');
    expect(gameSource).toContain('networkPlayerPredictionRuntime.adoptLocal(player);');
    expect(serverSource).toContain('if (enabled && autoSelectModules && player.choosingUpgrade && player.upgradeOffer)');
    expect(serverSource).toContain('player.autopilot && player.autoSelectModules');
    expect(serverSource).toContain('MODULE_PROGRESSION.chooseAutomaticUpgradeIds');
    expect(protocolSource).toContain('export interface AutopilotPreferences');
    expect(roomProtocolSource).toContain("'room:ready'");
    expect(roomProtocolSource).toContain("'room:restart-vote'");
    expect(protocolSource).toContain('autoRestart: boolean;');
    expect(gameSource).toContain('let damage = playerHeadDamage(hitHead);');
    expect(serverSource).toContain('let damage = this.playerHeadDamage(player, hitHead);');
    expect(gameSource).not.toContain('repel(enemy, 3.2, 3.5);');
    expect(serverSource).not.toContain('repel(enemy, 3.2, 3.5);');
  });

  it('自动模式不再绕过独立的后台暂停设置', () => {
    expect(gameSource).toContain('if (backgroundPauseEnabled && state === "running") setPaused(true);');
    expect(gameSource).toContain('if (document.hidden && backgroundPauseEnabled && state === "running") setPaused(true);');
  });

  it('联机自动战斗关闭自动选择后等待玩家，重新开启后立即完成选择', () => {
    const deliveredOffers: Array<UpgradeOffer | null> = [];
    const world = new UltraWorld({
      random: () => 0.5,
      callbacks: { onUpgrade: (_entityId, offer) => deliveredOffers.push(offer) },
    });
    world.connectPlayer('account-a', '玩家甲', 0, 'player-a');
    expect(world.spawn('account-a', 0)).toBe(true);
    expect(world.setAutopilot('account-a', true, false, false)).toBe(true);

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, AutomaticModeTestPlayer>).get('account-a')!;
    expect(player.autoSelectModules).toBe(false);
    expect(player.autoRestart).toBe(false);
    player.upgradePending = true;
    const offerUpgrade = Reflect.get(world, 'offerUpgrade') as (owner: AutomaticModeTestPlayer, now: number) => void;
    offerUpgrade.call(world, player, 0);

    expect(player.choosingUpgrade).toBe(true);
    expect(player.upgradeOffer).not.toBeNull();
    expect(player.level).toBe(0);
    expect(deliveredOffers.at(-1)).not.toBeNull();

    expect(world.setAutopilot('account-a', true, true, false)).toBe(true);
    expect(player.autoSelectModules).toBe(true);
    expect(player.choosingUpgrade).toBe(false);
    expect(player.upgradeOffer).toBeNull();
    expect(player.level).toBe(1);
    expect(deliveredOffers.at(-1)).toBeNull();
  });

  it('单机与多人自动模式先比较球和敌头距离，并共用撞头死区与前置距离', () => {
    const stepSource = serverSource.slice(
      serverSource.indexOf('step(deltaSeconds:'),
      serverSource.indexOf('getSnapshot('),
    );
    const autopilotSource = serverSource.slice(
      serverSource.indexOf('private autopilotAngle('),
      serverSource.indexOf('private ghostAutopilotAngle('),
    );

    expect(stepSource).toContain('this.autopilotAngle(player, present)');
    expect(autopilotSource.indexOf('let nearestFood')).toBeLessThan(autopilotSource.indexOf('const headTarget = this.automaticHeadTarget'));
    expect(gameSource).toContain('automaticHeadTarget(nearestDistance)');
    expect(serverSource).toContain('this.automaticHeadTarget(player, presentPlayers, nearestDistance)');
    expect(gameSource).toContain('automaticHeadApproachIsAllowed(enemy)');
    expect(gameSource).toContain('SNAKE_SEGMENT_SPACING * AUTOMATIC_HEAD_LEAD_DISTANCE_SEGMENTS');
    expect(serverSource).toContain('this.automaticHeadApproachIsAllowed(player, enemy)');
    expect(serverSource).toContain('SNAKE_SEGMENT_SPACING * AUTOMATIC_HEAD_LEAD_DISTANCE_SEGMENTS');
    expect(autopilotSource.indexOf('for (const other of presentPlayers)')).toBeLessThan(autopilotSource.indexOf('const targetCol = target.col - player.col;'));
    expect(autopilotSource).toContain('if (other === player || !other.ghost) continue;');
    expect(autopilotSource).toContain('if (other === player || other.ghost) continue;');
    expect(autopilotSource).toContain('AUTOMATIC_TEAMMATE_AVOIDANCE_STRENGTH');
    expect(autopilotSource).toContain('AUTOMATIC_SHARP_TURN_THRESHOLD');
  });

  it('最近球不比敌头远时优先吃球，只有敌头更近时才撞头', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-a', '玩家甲', 0, 'player-a');
    expect(world.spawn('account-a', 0)).toBe(true);
    const player = (Reflect.get(world, 'playersByAccount') as Map<string, AutomaticModeTestPlayer>).get('account-a')!;
    player.col = 11.5;
    player.row = 11.5;
    player.angle = 0;

    const spawnFood = Reflect.get(world, 'spawnFood') as (point: { col: number; row: number }, special: boolean) => void;
    spawnFood.call(world, { col: 11.5, row: 14.5 }, false);
    const foods = Reflect.get(world, 'foods') as Array<{ col: number; row: number }>;
    const food = foods.at(-1)!;
    const enemies = Reflect.get(world, 'enemies') as Array<{ dead: boolean; segments: unknown[]; col: number; row: number; angle: number }>;
    enemies.push({ dead: false, segments: [], col: 11.5, row: 8.5, angle: Math.PI / 2 });
    const autopilotAngle = Reflect.get(world, 'autopilotAngle') as (owner: AutomaticModeTestPlayer, players: AutomaticModeTestPlayer[]) => number;

    const equalDistanceAngle = autopilotAngle.call(world, player, [player]);
    expect(Math.sin(equalDistanceAngle)).toBeGreaterThan(0.9);

    food.row = 16.5;
    const closerEnemyAngle = autopilotAngle.call(world, player, [player]);
    expect(Math.sin(closerEnemyAngle)).toBeLessThan(-0.9);
  });

  it('联机结算按当前房间成员投票，普通成员离场后房间继续并更新票数', () => {
    expect(roomProtocolSource).toContain('restartVotePeerIds: string[];');
    expect(roomHubSource).toContain('room.restartVotes.add(peerId);');
    expect(roomHubSource).toContain('room.restartVotes.size !== room.members.size');
    expect(roomHubSource).toContain('room.matchId = randomUUID();');
    expect(roomHubSource).toContain('room.members.delete(peerId);');
    expect(roomHubSource).toContain('room.restartVotes.delete(peerId);');
    expect(roomHubSource).toContain('if (!this.restartRoomIfVoteComplete(room)) this.publishRoom(room);');
    expect(roomHubSource).not.toContain('联机房间已解散，所有玩家已返回主菜单。');
    expect(p2pBootstrapSource).toContain("return this.socketRequest<RoomView>('room:restart-vote');");
    expect(p2pBootstrapSource).toContain('if (previousRoomId) this.ignoreRoom(previousRoomId);');
    expect(p2pBootstrapSource).toContain("this.appEvents.emit('room-closed', notice);");
    expect(gameSource).toContain('`投票重开 ${restartVotes.length}/${room.members.length}`');
    expect(gameSource).toContain('`${names}离开了游戏，房间继续运行`');
    expect(gameSource).toContain('"你已离开游戏，其他玩家可以继续行动。"');
    expect(gameSource).toContain('ui.gameOverMenuButton.textContent = "离开游戏";');
    expect(gameSource).toContain('client.on("room-closed", (notice) => handleP2PRoomClosed(notice));');
  });
});
