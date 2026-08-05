import { describe, expect, it } from 'vitest';
import { UltraWorld } from '../src/server/UltraWorld';
import { PLAYER_BASE_SPEED, SNAKE_SEGMENT_SPACING } from '../src/shared/constants';
import type { PlayerBodyPathState } from '../src/shared/playerBodyPath';
import type { UltraSegment } from '../src/shared/protocol';

interface InternalPlayer {
  col: number;
  row: number;
  angle: number;
  desiredAngle: number;
  bodyPath: PlayerBodyPathState;
  segments: UltraSegment[];
}

describe('联机权威玩家历史轨迹', () => {
  it('服务器移动在直角转向后让身体逐节经过相同拐点', () => {
    const world = new UltraWorld({ random: () => 0.5 });
    world.connectPlayer('account-a', '玩家甲', 0, 'player-a');
    expect(world.spawn('account-a', 0)).toBe(true);
    const players = Reflect.get(world, 'playersByAccount') as Map<string, InternalPlayer>;
    const player = players.get('account-a')!;
    const movePlayer = Reflect.get(world, 'movePlayer') as (owner: InternalPlayer, delta: number) => void;
    const startCol = player.col;
    const startRow = player.row;
    const stepDuration = SNAKE_SEGMENT_SPACING / PLAYER_BASE_SPEED;

    player.angle = 0;
    player.desiredAngle = 0;
    movePlayer.call(world, player, stepDuration);
    player.angle = Math.PI / 2;
    player.desiredAngle = Math.PI / 2;
    movePlayer.call(world, player, stepDuration);
    movePlayer.call(world, player, stepDuration);

    expect(player.col).toBeCloseTo(startCol + SNAKE_SEGMENT_SPACING, 8);
    expect(player.row).toBeCloseTo(startRow + SNAKE_SEGMENT_SPACING * 2, 8);
    expect(player.segments[0].col).toBeCloseTo(startCol + SNAKE_SEGMENT_SPACING, 8);
    expect(player.segments[0].row).toBeCloseTo(startRow + SNAKE_SEGMENT_SPACING, 8);
    expect(player.segments[1].col).toBeCloseTo(startCol + SNAKE_SEGMENT_SPACING, 8);
    expect(player.segments[1].row).toBeCloseTo(startRow, 8);
  });
});
