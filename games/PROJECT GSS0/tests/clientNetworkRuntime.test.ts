import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/shared/modules';
import type { UltraSnapshot } from '../src/shared/protocol';
import { encodeUltraSnapshot } from '../src/shared/snapshotCodec';

runInThisContext(readFileSync(new URL('../network-codec.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-projectiles.js', import.meta.url), 'utf8'));

const clientGlobals = globalThis as typeof globalThis & {
  GSS0NetworkCodec: { decode: (payload: ArrayBuffer, modules: typeof MODULES) => UltraSnapshot };
  GSS0ProjectileRuntime: { create: (gridSize: number) => ClientProjectileRuntime };
};

interface ClientProjectileRuntime {
  items: Array<Record<string, number | string | null>>;
  reset(states: unknown[]): void;
  applyEvents(events: unknown[]): void;
  update(delta: number, targetById: (id: number) => { col: number; row: number } | null, arena: { left: number; top: number; cellSize: number }): void;
}

describe('客户端网络模块', () => {
  it('独立解码器与服务端 V2 快照格式一致', () => {
    const snapshot: UltraSnapshot = {
      tick: 7, serverTime: 700, gameTime: 3, waveCount: 2, waveTimer: 4, threatLevel: 1,
      players: [{
        entityId: 1, name: '玩家甲', colorIndex: 0, connected: true, alive: true, paused: false, choosingUpgrade: false,
        col: 4.25, row: 5.5, angle: 0.4, desiredAngle: 0.5, invulnerable: 0, collisionCooldown: 0,
        score: 12, kills: 1, botKills: 1, pvpKills: 0, survivalTime: 3, level: 1, xp: 2, xpNeeded: 6, respawnAt: null,
        segments: [
          { col: 3.7, row: 5.5, angle: 0, module: 'shield', neutral: false, timer: 5, ready: false, cooldown: 7.5, orbit: 2, birthAge: null },
          { col: 3.2, row: 5.5, angle: 0, module: 'blade', neutral: false, timer: 0, ready: true, cooldown: 0, orbit: 1.25, birthAge: null },
        ],
        growth: null,
      }],
      enemies: [{ id: 2, col: 8, row: 9, angle: 1, color: '#ff5c62', captured: 0, segments: [{ col: 7.5, row: 9 }] }],
      foods: [], projectiles: [], hazards: [], pendingSpawns: [],
    };

    const decoded = clientGlobals.GSS0NetworkCodec.decode(encodeUltraSnapshot(snapshot), MODULES);
    expect(decoded).toMatchObject({ tick: 7, players: [{ name: '玩家甲', col: 4.25, segments: [{ module: 'shield', cooldown: 7.5 }] }] });
    expect(decoded.players[0].segments[0]).toMatchObject({ angle: 0, timer: 0, orbit: 0 });
    expect(decoded.players[0].segments[1]).toMatchObject({ module: 'blade', angle: 0, timer: 0 });
    expect(decoded.players[0].segments[1].orbit).toBeCloseTo(1.25, 3);
  });

  it('本地推进直线、追踪和反弹，并接受可靠生命周期更新', () => {
    const runtime = clientGlobals.GSS0ProjectileRuntime.create(24);
    const state = { id: 1, col: 2, row: 2, vx: 4, vy: 0, color: '#ff9f43', size: 4, homing: 4, targetId: 9, bounces: 0 };
    runtime.reset([state]);
    runtime.update(0.05, () => ({ col: 2, row: 8 }), { left: 10, top: 20, cellSize: 30 });

    expect(runtime.items[0].col).toBeGreaterThan(2);
    expect(runtime.items[0].row).toBeGreaterThan(2);
    expect(runtime.items[0].x).toBeCloseTo(10 + (Number(runtime.items[0].col) + 0.5) * 30, 5);

    runtime.applyEvents([{ type: 'update', projectile: { ...state, col: 10, row: 10, targetId: null } }]);
    expect(runtime.items[0]).toMatchObject({ col: 10, row: 10, targetId: null });
    runtime.applyEvents([{ type: 'update', projectile: { ...state, col: 23.49, row: 12, vx: 4, homing: 0, targetId: null, bounces: 1 } }]);
    runtime.update(0.05, () => null, { left: 10, top: 20, cellSize: 30 });
    expect(runtime.items[0]).toMatchObject({ bounces: 0, targetId: null });
    expect(runtime.items[0].vxCells).toBeLessThan(0);
    runtime.applyEvents([{ type: 'destroy', id: 1, col: 10, row: 10 }]);
    expect(runtime.items).toHaveLength(0);
  });
});
