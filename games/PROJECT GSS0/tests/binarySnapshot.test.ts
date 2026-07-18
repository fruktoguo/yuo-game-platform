import { describe, expect, it } from 'vitest';
import type { UltraSnapshot } from '../src/shared/protocol';
import { decodeUltraSnapshot, encodeUltraSnapshot } from '../src/shared/snapshotCodec';

describe('Ultra 二进制快照', () => {
  it('版本化二进制格式完整往返 Ultra 世界并拒绝截断数据', () => {
    const snapshot = snapshotAt(42, 8.25);
    snapshot.players[0].name = '联机玩家甲';
    snapshot.players[0].segments[0].module = 'spark';
    snapshot.players[0].segments[0].neutral = false;
    snapshot.players[0].segments[0].birthAge = 0.12;
    snapshot.players[0].growth = { color: '#b8f53f', special: true, elapsed: 0.18, nodeCount: 3 };
    snapshot.foods.push({ id: 9, col: 2.5, row: 3.5, color: '#36dcff', phase: 1.2, special: true, isPulled: true });
    snapshot.projectiles.push({ id: 7, col: 4, row: 5, vx: 6, vy: -7, color: '#ff9f43', size: 4.5 });
    snapshot.hazards.push({ id: 3, kind: 'gravity', col: 9, row: 10, radius: 2.5, color: '#a56cff', phase: 0.7 });
    snapshot.pendingSpawns.push({ id: 5, color: '#ff5c62', headCell: { col: 20, row: 2 }, bodyCells: [{ col: 19, row: 2 }], timer: 1.1, maxTimer: 1.5 });

    const encoded = encodeUltraSnapshot(snapshot);
    const decoded = decodeUltraSnapshot(encoded);
    expect(encoded.byteLength).toBeLessThan(Buffer.byteLength(JSON.stringify(snapshot)));
    expect(decoded).toMatchObject({ tick: 42, waveCount: 1, players: [{ name: '联机玩家甲' }] });
    expect(decoded.players[0].segments[0]).toMatchObject({ module: 'spark', neutral: false });
    expect(decoded.players[0].segments[0].birthAge).toBeCloseTo(0.12, 5);
    expect(decoded.players[0].growth?.elapsed).toBeCloseTo(0.18, 5);
    expect(decoded.foods[0]).toMatchObject({ id: 9, color: '#36dcff', special: true, isPulled: true });
    expect(decoded.hazards[0]).toMatchObject({ id: 3, kind: 'gravity', color: '#a56cff' });
    expect(decoded.pendingSpawns[0].timer).toBeCloseTo(1.1, 5);
    expect(() => decodeUltraSnapshot(encoded.slice(0, 12))).toThrow('Ultra 快照数据不完整');
  });
});

function snapshotAt(tick: number, col: number): UltraSnapshot {
  return {
    tick,
    serverTime: tick * 100,
    gameTime: tick,
    waveCount: 1,
    waveTimer: 5,
    threatLevel: 0,
    players: [{
      entityId: 1, name: '玩家甲', colorIndex: 0, connected: true, alive: true, paused: false, choosingUpgrade: false,
      col, row: 5, angle: 0, desiredAngle: 0, invulnerable: 0, collisionCooldown: 0,
      score: 0, kills: 0, botKills: 0, pvpKills: 0, survivalTime: 1, level: 0, xp: 0, xpNeeded: 5,
      respawnAt: null,
      segments: [{ col: col - 1, row: 5, angle: 0, module: null, neutral: true, timer: 0, ready: true, cooldown: 0, orbit: 0, birthAge: null }],
      growth: null,
    }],
    enemies: [{ id: 1, col: col + 2, row: 6, angle: 0, color: '#ff5c62', captured: 0, segments: [{ col: col + 1, row: 6 }] }],
    foods: [], projectiles: [], hazards: [], pendingSpawns: [],
  };
}
