import { describe, expect, it, vi } from 'vitest';
import { RoomHub } from '../src/server/RoomHub';

function createRoomHarness(memberIds: string[], restartVotePeerIds: string[]) {
  const room = {
    id: 'room-a',
    code: 'ABC234',
    name: '测试房间',
    isPrivate: false,
    status: 'playing',
    matchId: 'match-a',
    hostPeerId: 'host',
    config: { modeId: 'standard', difficulty: 1, maxPlayers: 12, allowJoinInProgress: true },
    members: new Map(memberIds.map((peerId) => [peerId, {
      peerId,
      name: peerId,
      playerId: peerId,
      isHost: peerId === 'host',
      ready: true,
      socketId: `socket-${peerId}`,
    }])),
    restartVotes: new Set(restartVotePeerIds),
    createdAt: 1,
    messages: [],
  };
  const roomEvents: Array<{ event: string; payload: unknown }> = [];
  const lobbyEvents: Array<{ event: string; payload: unknown }> = [];
  const io = {
    to: () => ({
      emit: (event: string, payload: unknown) => roomEvents.push({ event, payload }),
    }),
    emit: (event: string, payload: unknown) => lobbyEvents.push({ event, payload }),
  };
  const hub = Object.create(RoomHub.prototype) as RoomHub;
  Reflect.set(hub, 'io', io);
  Reflect.set(hub, 'rooms', new Map([[room.id, room]]));
  const socket = {
    data: { peerId: 'leaver', roomId: room.id },
    leave: vi.fn(() => Promise.resolve()),
  };
  const leaveCurrentRoom = Reflect.get(hub, 'leaveCurrentRoom') as (socket: unknown, hostReason: string) => void;
  leaveCurrentRoom.call(hub, socket, '房主离开，房间已关闭');
  return { room, roomEvents, lobbyEvents, socket };
}

describe('联机成员离场', () => {
  it('普通成员中途离场只更新当前房间，不会关闭其他玩家的对局', () => {
    const { room, roomEvents, lobbyEvents, socket } = createRoomHarness(['host', 'stayer', 'leaver'], ['host']);

    expect(room.members.has('leaver')).toBe(false);
    expect(room.members.size).toBe(2);
    expect(room.matchId).toBe('match-a');
    expect(room.restartVotes).toEqual(new Set(['host']));
    expect(socket.data.roomId).toBeUndefined();
    expect(socket.leave).toHaveBeenCalledWith('gss0-room:room-a');
    expect(roomEvents.map(({ event }) => event)).toEqual(['room:updated']);
    expect(roomEvents[0].payload).toMatchObject({
      members: [{ peerId: 'host' }, { peerId: 'stayer' }],
      restartVotePeerIds: ['host'],
    });
    expect(lobbyEvents.map(({ event }) => event)).toEqual(['lobby:rooms']);
  });

  it('未投票成员离场后若剩余玩家已全票同意，会立即同步重开', () => {
    const { room, roomEvents } = createRoomHarness(['host', 'leaver'], ['host']);

    expect(room.members.size).toBe(1);
    expect(room.restartVotes.size).toBe(0);
    expect(room.matchId).not.toBe('match-a');
    expect(roomEvents.map(({ event }) => event)).toEqual(['room:started', 'room:updated']);
  });
});
