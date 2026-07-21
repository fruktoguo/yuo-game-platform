import { describe, expect, it, vi } from 'vitest';
import { ArenaHub } from '../src/server/ArenaHub';
import { UltraWorld } from '../src/server/UltraWorld';
import { SIMULATION_HZ, SNAPSHOT_HZ } from '../src/shared/constants';
import { encodePlayerMovementState } from '../src/shared/playerStateCodec';
import type { ActionResult, FoodClaimPayload, FoodClaimResult, PlayerHeadCollisionEvent, UltraEffect, UltraFoodDelta, UltraProjectileEvent } from '../src/shared/protocol';

describe('ArenaHub 联机投递', () => {
  it('keeps combat sound cooldown sources separate while personal sounds stay private', () => {
    const delivered: UltraEffect[][] = [];
    const world = new UltraWorld({ callbacks: { onEffects: (effects) => delivered.push([...effects]) } });
    const effectSound = Reflect.get(world, 'effectSound') as (kind: 'skill' | 'start' | 'enemySpawn', entityId?: number) => void;
    const flushOutputs = Reflect.get(world, 'flushOutputs') as () => void;

    effectSound.call(world, 'skill', 7);
    effectSound.call(world, 'start', 7);
    effectSound.call(world, 'enemySpawn');
    flushOutputs.call(world);

    expect(delivered.flat()).toEqual([
      expect.objectContaining({ type: 'sound', kind: 'skill', sourceEntityId: 7, audienceEntityId: undefined }),
      expect.objectContaining({ type: 'sound', kind: 'start', sourceEntityId: undefined, audienceEntityId: 7 }),
      expect.objectContaining({ type: 'sound', kind: 'enemySpawn', sourceEntityId: undefined, audienceEntityId: undefined }),
    ]);
  });

  it('packages enemy death presentation into one attributed event', () => {
    const delivered: UltraEffect[][] = [];
    const world = new UltraWorld({ callbacks: { onEffects: (effects) => delivered.push([...effects]) } });
    world.connectPlayer('account-a', 'Player A', 100, 'player-a');
    expect(world.spawn('account-a', 100)).toBe(true);
    const flushOutputs = Reflect.get(world, 'flushOutputs') as () => void;
    flushOutputs.call(world);
    delivered.length = 0;

    const player = (Reflect.get(world, 'playersByAccount') as Map<string, { entityId: number }>).get('account-a');
    expect(player).toBeDefined();
    const enemy = { id: 99, col: 4, row: 5, angle: 0, color: '#ff4f70', captured: 0, segments: [{ col: 3.5, row: 5 }], dead: false };
    const killEnemy = Reflect.get(world, 'killEnemy') as (enemy: unknown, owner: unknown) => void;
    killEnemy.call(world, enemy, player);
    flushOutputs.call(world);

    const effects = delivered.flat();
    expect(effects).toEqual([
      expect.objectContaining({ type: 'snakeDeath', enemyId: 99, ownerEntityId: player?.entityId }),
    ]);
  });

  it('合法转向输入立即进入权威世界，不额外等待下一次模拟刷新', () => {
    const applyInput = vi.fn(() => true);
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'world', { applyInput });
    const socket = {
      id: 'socket-a',
      data: { joinedArena: true, platformPrincipal: { accountId: 'account-a' } },
    };
    const handleInput = Reflect.get(hub, 'handleInput') as (socket: unknown, payload: Uint8Array) => void;

    handleInput.call(hub, socket, encodePlayerMovementState({
      sequence: 7,
      col: 4,
      row: 5,
      angle: 1,
      desiredAngle: 1.25,
      speed: 5,
      knockbackX: 0,
      knockbackY: 0,
      collisionCooldown: 0,
      slow: 0,
      segments: [],
    }));

    expect(applyInput).toHaveBeenCalledWith(
      'account-a',
      expect.objectContaining({ sequence: 7, col: 4, row: 5, desiredAngle: 1.25 }),
      expect.any(Number),
    );
  });

  it('快照保持易失低延迟，战斗反馈与投射物生命周期使用可靠通道', () => {
    expect(SIMULATION_HZ % SNAPSHOT_HZ).toBe(0);
    const globalEmit = vi.fn();
    const reliableEmit = vi.fn();
    const personalEmit = vi.fn();
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'io', {
      emit: reliableEmit,
      volatile: { emit: globalEmit },
      sockets: { sockets: new Map([['socket-a', { emit: personalEmit }]]) },
    });
    Reflect.set(hub, 'socketsByEntity', new Map([[7, 'socket-a']]));
    Reflect.set(hub, 'socketsByAccount', new Map([['account-a', 'socket-a']]));
    const sharedVisual: UltraEffect = { id: 'shared-visual', type: 'burst', col: 1, row: 2, color: '#ffffff', count: 4, speed: 80 };
    const sharedState: UltraEffect = { id: 'shared-state', type: 'snakeDeath', enemyId: 3, head: { col: 1, row: 2 }, segments: [], color: '#ffffff' };
    const personal: UltraEffect = { id: 'personal', type: 'feedback', kind: 'hit', audienceEntityId: 7 };
    const offline: UltraEffect = { id: 'offline', type: 'feedback', kind: 'hit', audienceEntityId: 9 };
    const publishEffects = Reflect.get(hub, 'publishEffects') as (effects: UltraEffect[]) => void;

    publishEffects.call(hub, [sharedVisual, sharedState, personal, offline]);

    expect(reliableEmit).toHaveBeenCalledWith('ultra:effects', [sharedState]);
    expect(personalEmit).toHaveBeenCalledWith('ultra:effects', [personal]);
    expect(personalEmit).toHaveBeenCalledTimes(1);
    expect(globalEmit).toHaveBeenCalledWith('ultra:effects', [sharedVisual]);

    const foodDelta: UltraFoodDelta = {
      revision: 3,
      reset: false,
      upserts: [{ id: 5, col: 4, row: 6, color: '#b8f53f', phase: 0, special: false, isPulled: false }],
      removedIds: [2],
    };
    const publishFoods = Reflect.get(hub, 'publishFoods') as (delta: UltraFoodDelta) => void;
    publishFoods.call(hub, foodDelta);
    expect(reliableEmit).toHaveBeenCalledWith('ultra:foods', foodDelta);

    const projectileEvents: UltraProjectileEvent[] = [{
      type: 'spawn',
      projectile: { id: 4, col: 2, row: 3, vx: 5, vy: 0, color: '#ff9f43', size: 4, homing: 0, targetId: null, targetSegmentIndex: -1, bounces: 0 },
    }];
    const publishProjectiles = Reflect.get(hub, 'publishProjectiles') as (events: UltraProjectileEvent[]) => void;
    publishProjectiles.call(hub, projectileEvents);
    expect(reliableEmit).toHaveBeenCalledWith('ultra:projectiles', projectileEvents);

    const playerCollision: PlayerHeadCollisionEvent = {
      id: '1:8', sourceEntityId: 1, targetEntityId: 2, sequence: 8,
      observedAt: 100, serverTime: 120, sourceCol: 5, sourceRow: 5,
      targetCol: 5.9, targetRow: 5, normalCol: -1, normalRow: 0,
    };
    const publishPlayerHeadCollision = Reflect.get(hub, 'publishPlayerHeadCollision') as (event: PlayerHeadCollisionEvent) => void;
    publishPlayerHeadCollision.call(hub, playerCollision);
    expect(reliableEmit).toHaveBeenCalledWith('ultra:player-head-collision', playerCollision);
  });

  it('玩家名单只在状态事件发生时可靠广播，不依赖周期性易失刷新', () => {
    const reliableEmit = vi.fn();
    const volatileEmit = vi.fn();
    const roster = [{ entityId: 1 }];
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'io', { emit: reliableEmit, volatile: { emit: volatileEmit } });
    Reflect.set(hub, 'world', { getRoster: () => roster });
    const broadcastMeta = Reflect.get(hub, 'broadcastMeta') as () => void;

    broadcastMeta.call(hub);

    expect(reliableEmit).toHaveBeenCalledWith('ultra:roster', roster);
    expect(volatileEmit).not.toHaveBeenCalled();
  });

  it('批量吃球请求先去重，再交给权威世界确认', () => {
    const claimFoods = vi.fn(() => [2]);
    const allow = vi.fn(() => true);
    const ack = vi.fn<(result: ActionResult<FoodClaimResult>) => void>();
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'world', { claimFoods });
    Reflect.set(hub, 'foodClaimGate', { allow });
    const socket = {
      id: 'socket-a',
      data: { joinedArena: true, platformPrincipal: { accountId: 'account-a' } },
    };
    const handleFoodClaim = Reflect.get(hub, 'handleFoodClaim') as (
      socket: unknown,
      payload: FoodClaimPayload,
      callback: (result: ActionResult<FoodClaimResult>) => void,
    ) => void;

    handleFoodClaim.call(hub, socket, { foodIds: [2, 2, 3] }, ack);

    expect(allow).toHaveBeenCalledOnce();
    expect(claimFoods).toHaveBeenCalledWith('account-a', [2, 3]);
    expect(ack).toHaveBeenCalledWith({ ok: true, data: { claimedFoodIds: [2] } });
  });
});
