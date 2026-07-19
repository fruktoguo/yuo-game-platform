import { describe, expect, it, vi } from 'vitest';
import { ArenaHub } from '../src/server/ArenaHub';
import { SIMULATION_HZ, SNAPSHOT_HZ } from '../src/shared/constants';
import type { ActionResult, FoodClaimPayload, FoodClaimResult, UltraEffect, UltraProjectileEvent } from '../src/shared/protocol';

describe('ArenaHub 联机投递', () => {
  it('合法转向输入立即进入权威世界，不额外等待下一次模拟刷新', () => {
    const applyInput = vi.fn(() => true);
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'world', { applyInput });
    const socket = {
      id: 'socket-a',
      data: { joinedArena: true, platformPrincipal: { accountId: 'account-a' } },
    };
    const handleInput = Reflect.get(hub, 'handleInput') as (socket: unknown, payload: { sequence: number; desiredAngle: number }) => void;

    handleInput.call(hub, socket, { sequence: 7, desiredAngle: 1.25 });

    expect(applyInput).toHaveBeenCalledWith('account-a', { sequence: 7, desiredAngle: 1.25 });
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
    const shared: UltraEffect = { id: 'shared', type: 'shake', strength: 2 };
    const personal: UltraEffect = { id: 'personal', type: 'sound', kind: 'hit', audienceEntityId: 7 };
    const offline: UltraEffect = { id: 'offline', type: 'sound', kind: 'hit', audienceEntityId: 9 };
    const publishEffects = Reflect.get(hub, 'publishEffects') as (effects: UltraEffect[]) => void;

    publishEffects.call(hub, [shared, personal, offline]);

    expect(reliableEmit).toHaveBeenCalledWith('ultra:effects', [shared]);
    expect(personalEmit).toHaveBeenCalledWith('ultra:effects', [personal]);
    expect(personalEmit).toHaveBeenCalledTimes(1);
    expect(globalEmit).not.toHaveBeenCalled();

    const projectileEvents: UltraProjectileEvent[] = [{
      type: 'spawn',
      projectile: { id: 4, col: 2, row: 3, vx: 5, vy: 0, color: '#ff9f43', size: 4, homing: 0, targetId: null, bounces: 0 },
    }];
    const publishProjectiles = Reflect.get(hub, 'publishProjectiles') as (events: UltraProjectileEvent[]) => void;
    publishProjectiles.call(hub, projectileEvents);
    expect(reliableEmit).toHaveBeenCalledWith('ultra:projectiles', projectileEvents);
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
