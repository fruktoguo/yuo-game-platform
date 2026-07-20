import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/shared/modules';
import type { UltraSnapshot } from '../src/shared/protocol';
import { decodePlayerMovementState } from '../src/shared/playerStateCodec';
import { encodeUltraSnapshot } from '../src/shared/snapshotCodec';

runInThisContext(readFileSync(new URL('../network-codec.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-player-prediction.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-player-state-codec.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-player-collisions.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-food-claims.js', import.meta.url), 'utf8'));
runInThisContext(readFileSync(new URL('../network-projectiles.js', import.meta.url), 'utf8'));

const clientGlobals = globalThis as typeof globalThis & {
  GSS0NetworkCodec: { decode: (payload: ArrayBuffer | ArrayBufferView, modules: typeof MODULES, target?: UltraSnapshot) => UltraSnapshot };
  GSS0PlayerPrediction: { create: (options?: Record<string, number>) => ClientPlayerPredictionRuntime };
  GSS0PlayerStateCodec: { encode: (sequence: number, player: Record<string, unknown>) => Uint8Array };
  GSS0PlayerCollisions: { detect: (...args: unknown[]) => Record<string, unknown> | null };
  GSS0FoodClaimRuntime: { create: (options?: { maximumBatchSize?: number; retryAfterMs?: number }) => ClientFoodClaimRuntime };
  GSS0ProjectileRuntime: { create: (gridSize: number) => ClientProjectileRuntime };
};

interface ClientFoodClaimRuntime {
  clear(): void;
  detect(
    player: { col: number; row: number; segments: Array<{ col: number; row: number }> },
    foods: Array<{ id: number; col: number; row: number }>,
    headRange: number,
    bodyRange: number,
    now: number,
  ): number[];
  reconcile(authoritativeFoods: Array<number | { id: number }>, now: number): void;
  resolve(requestedFoodIds: number[], claimedFoodIds: number[]): void;
  shouldHide(foodId: number): boolean;
}

interface ClientPlayerPredictionRuntime {
  state: {
    initialized: boolean;
    col: number;
    row: number;
    angle: number;
    segments: Array<{ col: number; row: number }>;
  };
  clear(): void;
  reconcile(authoritative: UltraSnapshot['players'][number]): void;
  syncAuthoritative(authoritative: UltraSnapshot['players'][number]): void;
  update(duration: number, desiredAngle: number, turnRate: number, speed: number): void;
}

interface ClientProjectileRuntime {
  items: Array<Record<string, number | string | null>>;
  reset(states: unknown[]): void;
  applyEvents(events: unknown[]): void;
  update(delta: number, targetById: (id: number) => { col: number; row: number } | null, arena: { left: number; top: number; cellSize: number; worldMin?: number; worldMax?: number }): void;
}

describe('客户端网络模块', () => {
  it('独立解码器与服务端 V5 动态场地快照格式一致', () => {
    const snapshot: UltraSnapshot = {
      tick: 7, serverTime: 700, gameTime: 3, waveCount: 2, waveTimer: 4, threatLevel: 1, arenaSize: 24,
      players: [{
        entityId: 1, name: '玩家甲', colorIndex: 0, connected: true, alive: true, paused: false, choosingUpgrade: false,
        col: 4.25, row: 5.5, angle: 0.4, desiredAngle: 0.5, lastInputSequence: 7, speed: 5, slow: 0, foodBoost: 0, knockbackX: 0.5, knockbackY: -0.25, invulnerable: 0, collisionCooldown: 0,
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
    expect(decoded).toMatchObject({ tick: 7, players: [{ name: '玩家甲' }] });
    expect(decoded.players[0]).toMatchObject({ lastInputSequence: 7, speed: 5, knockbackX: 0.5, knockbackY: -0.25 });
    expect(decoded.players[0].col).toBeCloseTo(4.25, 3);
    expect(decoded.players[0].segments).toHaveLength(2);
    expect(decoded.players[0].segments[0]).toMatchObject({ module: 'shield', cooldown: 7.5 });
    expect(decoded.players[0].segments[0]).toMatchObject({ angle: 0, timer: 0, orbit: 0 });
    expect(decoded.players[0].segments[1]).toMatchObject({ module: 'blade', angle: 0, timer: 0 });
    expect(decoded.players[0].segments[1].orbit).toBeCloseTo(1.25, 3);
  });

  it('可循环复用快照、实体和蛇身对象，避免长局持续制造垃圾', () => {
    const first = snapshotAt(11, 4.25);
    const target = clientGlobals.GSS0NetworkCodec.decode(encodeUltraSnapshot(first), MODULES);
    const player = target.players[0];
    const segment = player.segments[0];
    const next = snapshotAt(12, 8.75);
    next.players[0].segments[0].col = 8.1;

    const decoded = clientGlobals.GSS0NetworkCodec.decode(encodeUltraSnapshot(next), MODULES, target);

    expect(decoded).toBe(target);
    expect(decoded.players[0]).toBe(player);
    expect(decoded.players[0].segments[0]).toBe(segment);
    expect(decoded.players[0].col).toBeCloseTo(8.75, 3);
    expect(decoded.players[0].segments[0].col).toBeCloseTo(8.1, 3);
  });

  it('本地权威移动立即推进蛇头和身体，后续服务器快照不会拉回位置', () => {
    const runtime = clientGlobals.GSS0PlayerPrediction.create();
    const authoritative = snapshotAt(20, 5).players[0];
    authoritative.angle = 0;
    authoritative.desiredAngle = 0;
    authoritative.segments.push({ ...authoritative.segments[0], col: 3.8 });

    runtime.reconcile(authoritative);
    runtime.update(0.05, Math.PI / 2, 4.2, 5);

    expect(runtime.state.angle).toBeGreaterThan(0);
    expect(runtime.state.col).toBeGreaterThan(authoritative.col);
    expect(runtime.state.row).toBeGreaterThan(authoritative.row);
    expect(runtime.state.segments[0].col).toBeGreaterThan(authoritative.segments[0].col);

    const predictedCol = runtime.state.col;
    const predictedRow = runtime.state.row;
    runtime.syncAuthoritative({ ...authoritative, col: 2, row: 2 });
    expect(runtime.state.col).toBe(predictedCol);
    expect(runtime.state.row).toBe(predictedRow);
  });

  it('完整蛇身状态使用紧凑二进制包往返，碰撞只按客户端可见距离触发', () => {
    const player = snapshotAt(9, 5).players[0];
    const decoded = decodePlayerMovementState(clientGlobals.GSS0PlayerStateCodec.encode(10, player as unknown as Record<string, unknown>));
    expect(decoded).toMatchObject({ sequence: 10, col: 5, row: 5, angle: 0.4 });
    expect(decoded.segments).toHaveLength(1);

    const options = { worldMin: 0, worldMax: 23, selfRange: 0.5, bodyRange: 0.42, playerHeadRange: 1.05, enemyHeadRange: 0.81 };
    const far = clientGlobals.GSS0PlayerCollisions.detect(player, [{ id: 2, col: 5.9, row: 5, angle: Math.PI, segments: [], dead: false }], [player], options);
    const touching = clientGlobals.GSS0PlayerCollisions.detect(player, [{ id: 2, col: 5.7, row: 5, angle: Math.PI, segments: [], dead: false }], [player], options);
    expect(far).toBeNull();
    expect(touching).toMatchObject({ kind: 'enemy-head', targetId: 2 });
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

    runtime.applyEvents([{ type: 'spawn', projectile: { ...state, id: 2, col: -2, row: 4, vx: 0, vy: 0, homing: 0, targetId: null } }]);
    runtime.update(0, () => null, { left: 10, top: 20, cellSize: 18, worldMin: -5, worldMax: 28 });
    expect(runtime.items[0].x).toBeCloseTo(10 + (-2 + 5 + 0.5) * 18, 5);
  });

  it('按空间邻域检查蛇头和全部身体，批量上报接触到的一群球并避免重复发送', () => {
    const runtime = clientGlobals.GSS0FoodClaimRuntime.create({ maximumBatchSize: 32, retryAfterMs: 750 });
    const player = { col: 5, row: 5, segments: [{ col: 4.4, row: 5 }, { col: 3.8, row: 5 }] };
    const foods = [
      { id: 1, col: 5.4, row: 5 },
      { id: 2, col: 3.8, row: 5.35 },
      { id: 3, col: 10, row: 10 },
    ];

    expect(runtime.detect(player, foods, 0.7, 0.42, 100)).toEqual([1, 2]);
    expect(runtime.detect(player, foods, 0.7, 0.42, 110)).toEqual([]);
    expect(runtime.shouldHide(1)).toBe(true);
    expect(runtime.shouldHide(2)).toBe(true);

    runtime.resolve([1, 2], [1]);
    expect(runtime.shouldHide(1)).toBe(true);
    expect(runtime.shouldHide(2)).toBe(false);
    runtime.reconcile([2, 3], 120);
    expect(runtime.shouldHide(1)).toBe(false);
    expect(runtime.detect(player, foods.slice(1), 0.7, 0.42, 130)).toEqual([2]);
    runtime.reconcile([{ id: 2 }, { id: 3 }], 140);
    expect(runtime.shouldHide(2)).toBe(true);
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
      col, row: 5, angle: 0.4, desiredAngle: 0.5, lastInputSequence: tick, speed: 5, slow: 0, foodBoost: 0, knockbackX: 0, knockbackY: 0, invulnerable: 0, collisionCooldown: 0,
      score: 0, kills: 0, botKills: 0, pvpKills: 0, survivalTime: 1, level: 0, xp: 0, xpNeeded: 5,
      respawnAt: null,
      segments: [{ col: col - 0.6, row: 5, angle: 0, module: null, neutral: true, timer: 0, ready: true, cooldown: 0, orbit: 0, birthAge: null }],
      growth: null,
    }],
    enemies: [], foods: [], projectiles: [], hazards: [], pendingSpawns: [],
  };
}
