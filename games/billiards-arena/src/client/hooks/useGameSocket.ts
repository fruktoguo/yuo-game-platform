import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveGameSocketPath } from '@yuo-platform/client-sdk';
import type {
  ActionResult,
  ClientToServerEvents,
  GameEvent,
  GameSnapshot,
  RoomSummary,
  RoomView,
  ServerToClientEvents,
  ShotPayload,
} from '../../shared/protocol';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface GameSocketState {
  connected: boolean;
  room: RoomView | null;
  snapshot: GameSnapshot | null;
  rooms: RoomSummary[];
  events: GameEvent[];
  error: string | null;
}

export function useGameSocket(accountId: string) {
  const socketRef = useRef<GameSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const [state, setState] = useState<GameSocketState>({
    connected: false,
    room: null,
    snapshot: null,
    rooms: [],
    events: [],
    error: null,
  });

  useEffect(() => {
    const socket: GameSocket = io({
      autoConnect: true,
      path: resolveGameSocketPath(),
      transports: ['websocket', 'polling'],
      reconnectionDelay: 600,
      reconnectionDelayMax: 4_000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState((current) => ({ ...current, connected: true, error: null }));
      socket.emit('lobby:list', (result) => {
        if (result.ok && result.data) setState((current) => ({ ...current, rooms: result.data! }));
      });
      const roomCode = roomCodeRef.current;
      if (roomCode) {
        socket.emit('room:join', { code: roomCode }, (result) => {
          if (result.ok && result.data) applyRoom(result.data!);
        });
      }
    });
    socket.on('disconnect', () => setState((current) => ({ ...current, connected: false })));
    socket.on('connect_error', () => setState((current) => ({ ...current, connected: false, error: '无法连接游戏服务器，正在重试' })));
    socket.on('lobby:rooms', (rooms) => setState((current) => ({ ...current, rooms })));
    socket.on('room:state', (room) => {
      if (roomCodeRef.current && room.code !== roomCodeRef.current) return;
      setState((current) => ({ ...current, room, snapshot: room.game ?? current.snapshot }));
    });
    socket.on('room:chat', (message) => {
      setState((current) => {
        if (!current.room || current.room.messages.some((item) => item.id === message.id)) return current;
        return {
          ...current,
          room: { ...current.room, messages: [...current.room.messages, message].slice(-40) },
        };
      });
    });
    socket.on('game:snapshot', (snapshot) => setState((current) => ({ ...current, snapshot })));
    socket.on('game:event', (event) => setState((current) => ({ ...current, events: [...current.events, event].slice(-50) })));
    socket.on('server:error', (error) => setState((current) => ({ ...current, error })));

    function applyRoom(room: RoomView): void {
      roomCodeRef.current = room.code;
      setState((current) => ({ ...current, room, snapshot: room.game, error: null }));
      const url = new URL(window.location.href);
      url.searchParams.set('room', room.code);
      window.history.replaceState(null, '', url);
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accountId]);

  const createRoom = useCallback(() => new Promise<ActionResult<RoomView>>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    socket.emit('room:create', (result) => {
      if (result.ok && result.data) {
        roomCodeRef.current = result.data.code;
        setState((current) => ({ ...current, room: result.data!, snapshot: result.data!.game, error: null }));
        updateRoomUrl(result.data.code);
      }
      resolve(result);
    });
  }), []);

  const joinRoom = useCallback((code: string, spectate = false) => new Promise<ActionResult<RoomView>>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    socket.emit('room:join', { code, spectate }, (result) => {
      if (result.ok && result.data) {
        roomCodeRef.current = result.data.code;
        setState((current) => ({ ...current, room: result.data!, snapshot: result.data!.game, error: null }));
        updateRoomUrl(result.data.code);
      }
      resolve(result);
    });
  }), []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    roomCodeRef.current = null;
    setState((current) => ({ ...current, room: null, snapshot: null, events: [] }));
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url);
  }, []);

  const setReady = useCallback((ready: boolean) => emitSimple(socketRef.current, 'room:ready', ready), []);
  const sendChat = useCallback((text: string) => emitSimple(socketRef.current, 'room:chat', text), []);
  const placeCue = useCallback((position: { x: number; z: number }) => emitSimple(socketRef.current, 'game:place-cue', position), []);
  const callPocket = useCallback((pocket: number) => emitSimple(socketRef.current, 'game:call-pocket', pocket), []);
  const shoot = useCallback((shot: ShotPayload) => emitSimple(socketRef.current, 'game:shoot', shot), []);
  const clearError = useCallback(() => setState((current) => ({ ...current, error: null })), []);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    sendChat,
    placeCue,
    callPocket,
    shoot,
    clearError,
  };
}

function emitSimple<EventName extends 'room:ready' | 'room:chat' | 'game:place-cue' | 'game:call-pocket' | 'game:shoot'>(
  socket: GameSocket | null,
  event: EventName,
  payload: Parameters<ClientToServerEvents[EventName]>[0],
): Promise<ActionResult> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    const timeout = window.setTimeout(() => resolve({ ok: false, error: '服务器响应超时' }), 6_000);
    const callback = (result: ActionResult) => {
      window.clearTimeout(timeout);
      resolve(result);
    };
    // Socket.IO 的事件重载无法从联合事件名推导不同载荷，这里由泛型约束保证配对。
    (socket.emit as (name: EventName, value: typeof payload, ack: typeof callback) => GameSocket)(event, payload, callback);
  });
}

function updateRoomUrl(code: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  window.history.replaceState(null, '', url);
}
