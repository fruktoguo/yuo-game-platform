import { describe, expect, it, vi } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';

interface InternalPlayer {
  alive: boolean;
  ghost: boolean;
  paused: boolean;
  speed: number;
  col: number;
  row: number;
}

function playerFor(world: UltraWorld, accountId: string): InternalPlayer {
  const players = Reflect.get(world, 'playersByAccount') as Map<string, InternalPlayer>;
  const player = players.get(accountId);
  if (!player) throw new Error(`Missing test player: ${accountId}`);
  return player;
}

function enterGhostState(world: UltraWorld, player: InternalPlayer, now = 100): void {
  const enterGhost = Reflect.get(world, 'enterGhostState') as (player: InternalPlayer, now: number, reason: string) => void;
  enterGhost.call(world, player, now, '测试失去生命');
}

describe('多人幽灵生命周期', () => {
  it('幽灵使用翻倍后的移动速度', () => {
    const world = new UltraWorld();
    world.connectPlayer('account-a', 'Player A', 100, 'player-a');
    expect(world.spawn('account-a', 100)).toBe(true);
    const player = playerFor(world, 'account-a');

    enterGhostState(world, player);

    expect(player.ghost).toBe(true);
    expect(player.speed).toBe(0.6);
  });

  it('单人多人模式进入幽灵后立即结束本轮', () => {
    const onRunEnded = vi.fn();
    const world = new UltraWorld({ callbacks: { onRunEnded } });
    world.connectPlayer('account-a', 'Player A', 100, 'player-a');
    expect(world.spawn('account-a', 100)).toBe(true);
    const player = playerFor(world, 'account-a');
    enterGhostState(world, player);
    player.paused = true;

    world.step(1 / 30, 200);

    expect(player.alive).toBe(false);
    expect(player.ghost).toBe(false);
    expect(onRunEnded).toHaveBeenCalledTimes(1);
  });

  it('自动玩家优先救援幽灵，但无遮挡敌头仍覆盖救援目标', () => {
    const world = new UltraWorld();
    world.connectPlayer('account-a', 'Player A', 100, 'player-a');
    world.connectPlayer('account-b', 'Player B', 100, 'player-b');
    expect(world.spawn('account-a', 100)).toBe(true);
    expect(world.spawn('account-b', 100)).toBe(true);
    const player = playerFor(world, 'account-a');
    const ghost = playerFor(world, 'account-b');
    player.col = 11.5;
    player.row = 11.5;
    ghost.col = 11.5;
    ghost.row = 15.5;
    ghost.ghost = true;

    const spawnFood = Reflect.get(world, 'spawnFood') as (point: { col: number; row: number }, special: boolean) => void;
    spawnFood.call(world, { col: 7.5, row: 11.5 }, false);
    const autopilotAngle = Reflect.get(world, 'autopilotAngle') as (player: InternalPlayer, players: InternalPlayer[]) => number;

    const rescueAngle = autopilotAngle.call(world, player, [player, ghost]);
    expect(Math.sin(rescueAngle)).toBeGreaterThan(0.9);

    const enemies = Reflect.get(world, 'enemies') as Array<{ dead: boolean; segments: unknown[]; col: number; row: number; angle: number }>;
    enemies.push({ dead: false, segments: [], col: 11.5, row: 9.5, angle: -Math.PI / 2 });
    const attackAngle = autopilotAngle.call(world, player, [player, ghost]);
    expect(Math.sin(attackAngle)).toBeLessThan(-0.9);
  });
});
