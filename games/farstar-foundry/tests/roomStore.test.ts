import { describe, expect, it } from 'vitest';
import { createFactoryState } from '../src/server/FactoryEngine';
import { isStoredFoundryState, type StoredFoundryState } from '../src/server/RoomStore';

describe('远星工造房间存档', () => {
  it('接受结构完整的等待房间与运行房间', () => {
    const waiting = stateWithRoom();
    expect(isStoredFoundryState(waiting)).toBe(true);
    const running = stateWithRoom();
    running.rooms[0].phase = 'running';
    running.rooms[0].startedAt = 1_100;
    running.rooms[0].factory = createFactoryState(1_100);
    expect(isStoredFoundryState(running)).toBe(true);
  });

  it('兼容尚未保存手动采集作业字段的旧房间', () => {
    const legacy = stateWithRoom();
    legacy.rooms[0].phase = 'running';
    legacy.rooms[0].startedAt = 1_100;
    legacy.rooms[0].factory = createFactoryState(1_100);
    delete (legacy.rooms[0].factory as Partial<typeof legacy.rooms[0]['factory']> & { manualJobs?: unknown }).manualJobs;
    expect(isStoredFoundryState(legacy)).toBe(true);
  });

  it('拒绝非法席位数和缺少房主的损坏存档', () => {
    const invalidCapacity = stateWithRoom();
    invalidCapacity.rooms[0].maxPlayers = 99;
    expect(isStoredFoundryState(invalidCapacity)).toBe(false);
    const missingHost = stateWithRoom();
    missingHost.rooms[0].members = [];
    expect(isStoredFoundryState(missingHost)).toBe(false);
  });
});

function stateWithRoom(): StoredFoundryState {
  return {
    version: 1,
    savedAt: 2_000,
    rooms: [{
      code: 'ABCD23',
      name: '测试工造站',
      hostId: 'account-a',
      passwordHash: null,
      maxPlayers: 4,
      phase: 'waiting',
      createdAt: 1_000,
      updatedAt: 1_000,
      startedAt: null,
      members: [{ accountId: 'account-a', name: '测试员', joinedAt: 1_000, lastSeenAt: 1_000 }],
      factory: null,
      activity: [],
      messages: [],
    }],
  };
}
