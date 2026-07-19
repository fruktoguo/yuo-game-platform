import { describe, expect, it, vi } from 'vitest';
import { ArenaHub } from '../src/server/ArenaHub';
import { SIMULATION_HZ, SNAPSHOT_HZ } from '../src/shared/constants';
import type { UltraEffect, UltraProjectileEvent } from '../src/shared/protocol';

describe('ArenaHub 联机投递', () => {
  it('快照使用模拟帧的整数节拍，特效仅通过对应的易失通道发送', () => {
    expect(SIMULATION_HZ % SNAPSHOT_HZ).toBe(0);
    const globalEmit = vi.fn();
    const reliableEmit = vi.fn();
    const personalEmit = vi.fn();
    const hub = Object.create(ArenaHub.prototype) as ArenaHub;
    Reflect.set(hub, 'io', {
      emit: reliableEmit,
      volatile: { emit: globalEmit },
      sockets: { sockets: new Map([['socket-a', { volatile: { emit: personalEmit } }]]) },
    });
    Reflect.set(hub, 'socketsByEntity', new Map([[7, 'socket-a']]));
    Reflect.set(hub, 'socketsByAccount', new Map([['account-a', 'socket-a']]));
    const shared: UltraEffect = { id: 'shared', type: 'shake', strength: 2 };
    const personal: UltraEffect = { id: 'personal', type: 'sound', kind: 'hit', audienceEntityId: 7 };
    const offline: UltraEffect = { id: 'offline', type: 'sound', kind: 'hit', audienceEntityId: 9 };
    const publishEffects = Reflect.get(hub, 'publishEffects') as (effects: UltraEffect[]) => void;

    publishEffects.call(hub, [shared, personal, offline]);

    expect(globalEmit).toHaveBeenCalledWith('ultra:effects', [shared]);
    expect(personalEmit).toHaveBeenCalledWith('ultra:effects', [personal]);
    expect(personalEmit).toHaveBeenCalledTimes(1);

    const projectileEvents: UltraProjectileEvent[] = [{
      type: 'spawn',
      projectile: { id: 4, col: 2, row: 3, vx: 5, vy: 0, color: '#ff9f43', size: 4, homing: 0, targetId: null, bounces: 0 },
    }];
    const publishProjectiles = Reflect.get(hub, 'publishProjectiles') as (events: UltraProjectileEvent[]) => void;
    publishProjectiles.call(hub, projectileEvents);
    expect(reliableEmit).toHaveBeenCalledWith('ultra:projectiles', projectileEvents);
  });
});
