import { describe, expect, it } from 'vitest';
import type { UltraSnapshot } from '../src/shared/protocol';
import { decodeUltraSnapshot, encodeUltraSnapshot } from '../src/shared/snapshotCodec';

describe('Ultra 二进制快照', () => {
  it('版本化二进制格式恢复客户端所需状态并拒绝截断数据', () => {
    const snapshot = snapshotAt(42, 8.25);
    snapshot.players[0].name = '联机玩家甲';
    snapshot.players[0].segments[0].module = 'spark';
    snapshot.players[0].segments[0].neutral = false;
    snapshot.players[0].segments[0].birthAge = 0.12;
    snapshot.players[0].segments.push({ ...snapshot.players[0].segments[0], col: 7.5, module: 'blade', orbit: 1.25 });
    snapshot.players[0].growth = { color: '#b8f53f', special: true, elapsed: 0.18, nodeCount: 3 };
    snapshot.foods.push({ id: 9, col: 2.5, row: 3.5, color: '#36dcff', phase: 1.2, special: true, isPulled: true });
    snapshot.projectiles.push({ id: 7, col: 4, row: 5, vx: 6, vy: -7, color: '#ff9f43', size: 4.5 });
    snapshot.hazards.push({ id: 3, ownerEntityId: 1, kind: 'gravity', col: 9, row: 10, radius: 2.5, color: '#a56cff', phase: 0.7, arm: 0 });
    snapshot.pendingSpawns.push({ id: 5, archetype: 'charger', color: '#ff5c62', headCell: { col: 20, row: 2 }, bodyCells: [{ col: 19, row: 2 }], timer: 1.1, maxTimer: 1.5 });

    const encoded = encodeUltraSnapshot(snapshot);
    const later = encodeUltraSnapshot(snapshotAt(43, 9.5));
    const decoded = decodeUltraSnapshot(encoded);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.byteLength).toBeLessThan(Buffer.byteLength(JSON.stringify(snapshot)));
    expect(decoded).toMatchObject({ tick: 42, waveCount: 1, players: [{ name: '联机玩家甲' }] });
    expect(decoded.players[0]).toMatchObject({ lastInputSequence: 3, speed: 5, knockbackX: 0, knockbackY: 0 });
    expect(decoded.players[0].segments[0]).toMatchObject({ module: 'spark', neutral: false });
    expect(decoded.players[0].segments[0].birthAge).toBeNull();
    expect(decoded.players[0].segments[1].orbit).toBeCloseTo(1.25, 3);
    expect(decoded.players[0].growth?.elapsed).toBeCloseTo(0.18, 5);
    expect(decoded.foods[0]).toMatchObject({ id: 9, color: '#36dcff', special: true, isPulled: true });
    expect(decoded.hazards[0]).toMatchObject({ id: 3, ownerEntityId: 1, kind: 'gravity', color: '#a56cff', arm: 0 });
    expect(decoded.pendingSpawns[0].timer).toBeCloseTo(1.1, 5);
    const decodedLater = decodeUltraSnapshot(later);
    expect(decodedLater).toMatchObject({ tick: 43 });
    expect(decodedLater.players[0].col).toBeCloseTo(9.5, 3);
    expect(() => decodeUltraSnapshot(encoded.slice(0, 12))).toThrow('Ultra 快照数据不完整');
  });

  it('高对象数量下仍保持紧凑包体', () => {
    const crowded = snapshotAt(99, 12);
    const seedPlayer = crowded.players[0];
    const seedSegment = seedPlayer.segments[0];
    crowded.players = Array.from({ length: 12 }, (_, playerIndex) => ({
      ...seedPlayer,
      entityId: playerIndex + 1,
      name: `玩家${playerIndex + 1}`,
      col: 8 + playerIndex % 8,
      segments: Array.from({ length: 40 }, (_, segmentIndex) => ({
        ...seedSegment,
        col: 8 + playerIndex % 8 - segmentIndex * 0.12,
        row: 5 + Math.sin(segmentIndex * 0.2),
        angle: segmentIndex * 0.11,
      })),
    }));
    crowded.enemies = Array.from({ length: 40 }, (_, enemyIndex) => ({
      id: enemyIndex + 1,
      archetype: enemyIndex % 2 === 0 ? 'scout' : 'forager',
      behaviorState: 'forage',
      behaviorPhase: 0,
      col: 4 + enemyIndex % 16,
      row: 2 + enemyIndex % 18,
      angle: enemyIndex * 0.13,
      color: '#ff5c62',
      captured: enemyIndex,
      segments: Array.from({ length: 20 }, (_, segmentIndex) => ({
        col: 4 + enemyIndex % 16 - segmentIndex * 0.12,
        row: 2 + enemyIndex % 18,
      })),
    }));
    crowded.foods = Array.from({ length: 200 }, (_, index) => ({
      id: index + 1,
      col: index % 24,
      row: Math.floor(index / 24) % 24,
      color: '#36dcff',
      phase: index * 0.17,
      special: index % 7 === 0,
      isPulled: index % 5 === 0,
    }));
    crowded.projectiles = Array.from({ length: 300 }, (_, index) => ({
      id: index + 1,
      col: index % 24,
      row: Math.floor(index / 24) % 24,
      vx: (index % 31) - 15,
      vy: 15 - index % 29,
      color: '#ff9f43',
      size: 4.5,
    }));

    const encoded = encodeUltraSnapshot(crowded);
    const decoded = decodeUltraSnapshot(encoded);

    expect(encoded.byteLength).toBeLessThan(22_000);
    expect(decoded.players).toHaveLength(12);
    expect(decoded.enemies).toHaveLength(40);
    expect(decoded.foods).toHaveLength(200);
    expect(decoded.projectiles).toHaveLength(300);
  });

  it('V6 坐标随动态场地归一化，可覆盖向四边扩张出的负坐标', () => {
    const snapshot = snapshotAt(100, -3.25);
    snapshot.arenaSize = 24 * Math.sqrt(2);
    snapshot.players[0].row = 26.75;
    snapshot.players[0].segments[0].col = -3.8;

    const decoded = decodeUltraSnapshot(encodeUltraSnapshot(snapshot));

    expect(decoded.arenaSize).toBeCloseTo(24 * Math.sqrt(2), 5);
    expect(decoded.players[0].col).toBeCloseTo(-3.25, 3);
    expect(decoded.players[0].row).toBeCloseTo(26.75, 3);
    expect(decoded.players[0].segments[0].col).toBeCloseTo(-3.8, 3);
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
    arenaSize: 24,
    players: [{
      entityId: 1, name: '玩家甲', colorIndex: 0, connected: true, alive: true, paused: false, choosingUpgrade: false,
      col, row: 5, angle: 0, desiredAngle: 0, lastInputSequence: 3, speed: 5, slow: 0, foodBoost: 0, knockbackX: 0, knockbackY: 0, invulnerable: 0, collisionCooldown: 0,
      score: 0, kills: 0, botKills: 0, pvpKills: 0, survivalTime: 1, level: 0, xp: 0, xpNeeded: 5,
      respawnAt: null,
      segments: [{ col: col - 1, row: 5, angle: 0, module: null, neutral: true, timer: 0, ready: true, cooldown: 0, orbit: 0, birthAge: null }],
      growth: null,
    }],
    enemies: [{ id: 1, archetype: 'forager', behaviorState: 'forage', behaviorPhase: 0, col: col + 2, row: 6, angle: 0, color: '#ff5c62', captured: 0, segments: [{ col: col + 1, row: 6 }] }],
    foods: [], projectiles: [], hazards: [], pendingSpawns: [],
  };
}
