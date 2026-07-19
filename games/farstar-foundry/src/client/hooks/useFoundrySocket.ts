import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveGameSocketPath } from '@yuo-platform/client-sdk';
import type {
  ActionResult,
  ClientToServerEvents,
  CreateRoomPayload,
  FactoryCommand,
  FactorySnapshot,
  FactorySync,
  RoomSummary,
  RoomView,
  ServerToClientEvents,
} from '../../shared/protocol';

type FoundrySocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type FactoryCommandInput = FactoryCommand extends infer Command
  ? Command extends { requestId: string }
    ? Omit<Command, 'requestId'>
    : never
  : never;

interface FoundrySocketState {
  connected: boolean;
  rooms: RoomSummary[];
  room: RoomView | null;
  factory: FactorySnapshot | null;
  error: string | null;
}

export function useFoundrySocket(accountId: string) {
  const socketRef = useRef<FoundrySocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const [state, setState] = useState<FoundrySocketState>({
    connected: false,
    rooms: [],
    room: null,
    factory: null,
    error: null,
  });

  useEffect(() => {
    const socket: FoundrySocket = io({
      path: resolveGameSocketPath(),
      transports: ['websocket', 'polling'],
      reconnectionDelay: 700,
      reconnectionDelayMax: 5_000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState((current) => ({ ...current, connected: true, error: null }));
      requestLobby(socket, setState);
      const roomCode = roomCodeRef.current ?? new URLSearchParams(window.location.search).get('room');
      if (!roomCode) return;
      socket.emit('room:join', { code: roomCode }, (result) => {
        if (result.ok && result.data) applyRoom(result.data);
        else setState((current) => ({ ...current, error: result.error ?? '无法恢复协作房间' }));
      });
    });
    socket.on('disconnect', () => setState((current) => ({ ...current, connected: false })));
    socket.on('connect_error', () => setState((current) => ({ ...current, connected: false, error: '无法连接工厂服务器，正在重试' })));
    socket.on('server:error', (error) => setState((current) => ({ ...current, error })));
    socket.on('lobby:rooms', (rooms) => setState((current) => ({ ...current, rooms })));
    socket.on('room:state', (room) => {
      if (roomCodeRef.current && room.code !== roomCodeRef.current) return;
      setState((current) => ({ ...current, room, factory: room.factory ?? current.factory }));
    });
    socket.on('room:activity', (entry) => {
      setState((current) => {
        if (!current.room || current.room.activity.some((item) => item.id === entry.id)) return current;
        return { ...current, room: { ...current.room, activity: [...current.room.activity, entry].slice(-40) } };
      });
    });
    socket.on('room:chat', (message) => {
      setState((current) => {
        if (!current.room || current.room.messages.some((item) => item.id === message.id)) return current;
        return { ...current, room: { ...current.room, messages: [...current.room.messages, message].slice(-30) } };
      });
    });
    socket.on('factory:snapshot', (snapshot) => {
      setState((current) => ({ ...current, factory: newerSnapshot(current.factory, snapshot) }));
    });
    socket.on('factory:sync', (sync) => {
      setState((current) => ({ ...current, factory: mergeSync(current.factory, sync) }));
    });

    function applyRoom(room: RoomView): void {
      roomCodeRef.current = room.code;
      setRoomUrl(room.code);
      setState((current) => ({ ...current, room, factory: room.factory, error: null }));
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accountId]);

  const createRoom = useCallback((payload: CreateRoomPayload) => emitWithData<RoomView>(
    socketRef.current,
    (socket, ack) => socket.emit('room:create', payload, ack),
    (room) => {
      roomCodeRef.current = room.code;
      setRoomUrl(room.code);
      setState((current) => ({ ...current, room, factory: room.factory, error: null }));
    },
  ), []);

  const joinRoom = useCallback((code: string, password = '') => emitWithData<RoomView>(
    socketRef.current,
    (socket, ack) => socket.emit('room:join', { code, password }, ack),
    (room) => {
      roomCodeRef.current = room.code;
      setRoomUrl(room.code);
      setState((current) => ({ ...current, room, factory: room.factory, error: null }));
    },
  ), []);

  const startRoom = useCallback(() => emitWithData<RoomView>(
    socketRef.current,
    (socket, ack) => socket.emit('room:start', ack),
    (room) => setState((current) => ({ ...current, room, factory: room.factory, error: null })),
  ), []);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    socket?.emit('room:leave', () => requestLobby(socket, setState));
    roomCodeRef.current = null;
    setRoomUrl(null);
    setState((current) => ({ ...current, room: null, factory: null, error: null }));
  }, []);

  const runCommand = useCallback((input: FactoryCommandInput) => new Promise<ActionResult<{ sequence: number }>>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    const command = { ...input, requestId: createRequestId() } as FactoryCommand;
    emitWithTimeout((ack) => socket.emit('factory:command', command, ack), resolve);
  }), []);

  const sendChat = useCallback((text: string) => new Promise<ActionResult>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    emitWithTimeout((ack) => socket.emit('room:chat', text, ack), resolve);
  }), []);

  const clearError = useCallback(() => setState((current) => ({ ...current, error: null })), []);

  return {
    ...state,
    createRoom,
    joinRoom,
    startRoom,
    leaveRoom,
    runCommand,
    sendChat,
    clearError,
  };
}

function emitWithData<T>(
  socket: FoundrySocket | null,
  emitter: (socket: FoundrySocket, ack: (result: ActionResult<T>) => void) => void,
  onSuccess: (data: T) => void,
): Promise<ActionResult<T>> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, error: '服务器尚未连接' });
      return;
    }
    emitWithTimeout<T>((ack) => emitter(socket, ack), (result) => {
      if (result.ok && result.data) onSuccess(result.data);
      resolve(result);
    });
  });
}

function emitWithTimeout<T>(
  emitter: (ack: (result: ActionResult<T>) => void) => void,
  resolve: (result: ActionResult<T>) => void,
): void {
  let settled = false;
  const timeout = window.setTimeout(() => {
    settled = true;
    resolve({ ok: false, error: '服务器响应超时' });
  }, 7_000);
  emitter((result) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    resolve(result);
  });
}

function requestLobby(socket: FoundrySocket, setState: React.Dispatch<React.SetStateAction<FoundrySocketState>>): void {
  socket.emit('lobby:list', (result) => {
    if (result.ok && result.data) setState((current) => ({ ...current, rooms: result.data! }));
  });
}

function newerSnapshot(current: FactorySnapshot | null, incoming: FactorySnapshot): FactorySnapshot {
  return !current || incoming.sequence >= current.sequence ? incoming : current;
}

function mergeSync(current: FactorySnapshot | null, sync: FactorySync): FactorySnapshot | null {
  if (!current || sync.sequence < current.sequence) return current;
  return {
    ...current,
    sequence: sync.sequence,
    serverTime: sync.serverTime,
    simulatedAt: sync.simulatedAt,
    resources: sync.resources,
    rates: sync.rates,
    manualJobs: sync.manualJobs,
    power: { supply: sync.power[0], demand: sync.power[1], satisfaction: sync.power[2] },
    totalRuntimeSeconds: sync.totalRuntimeSeconds,
  };
}

function setRoomUrl(code: string | null): void {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID().replaceAll('-', '') ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
