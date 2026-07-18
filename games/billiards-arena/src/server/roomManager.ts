import { randomBytes, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { IntervalGate } from '@yuo-platform/realtime';
import type {
  ActionResult,
  ChatMessage,
  ClientToServerEvents,
  GameEvent,
  InterServerEvents,
  JoinRoomPayload,
  RoomSummary,
  RoomView,
  ServerToClientEvents,
  ShotPayload,
  SocketData,
} from '../shared/protocol';
import { GameEngine } from './gameEngine';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface PlayerRecord {
  id: string;
  name: string;
  seat: 0 | 1;
  socketId: string | null;
  connected: boolean;
  ready: boolean;
}

interface RoomRecord {
  code: string;
  createdAt: number;
  hostId: string;
  players: PlayerRecord[];
  spectators: Map<string, { accountId: string; name: string }>;
  messages: ChatMessage[];
  phase: RoomView['phase'];
  engine: GameEngine | null;
  cleanupTimer: NodeJS.Timeout | null;
  disconnectTimers: Map<string, NodeJS.Timeout>;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PLAYER_RECONNECT_MS = 90_000;
const EMPTY_ROOM_TTL_MS = 10 * 60_000;
const MAX_ROOMS = 100;

export class RoomManager {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly chatGate = new IntervalGate(600);

  constructor(private readonly io: GameServer) {}

  register(socket: GameSocket): void {
    socket.on('lobby:list', (ack) => ack({ ok: true, data: this.listRooms() }));
    socket.on('room:create', (ack) => this.createRoom(socket, ack));
    socket.on('room:join', (payload, ack) => this.joinRoom(socket, payload, ack));
    socket.on('room:leave', (ack) => {
      this.leaveRoom(socket, true);
      ack?.({ ok: true });
    });
    socket.on('room:ready', (ready, ack) => this.setReady(socket, ready, ack));
    socket.on('room:chat', (text, ack) => this.sendChat(socket, text, ack));
    socket.on('game:place-cue', (position, ack) => this.withPlayerEngine(socket, ack, (engine, playerId) => engine.placeCue(playerId, position?.x, position?.z)));
    socket.on('game:call-pocket', (pocket, ack) => this.withPlayerEngine(socket, ack, (engine, playerId) => engine.callPocket(playerId, pocket)));
    socket.on('game:shoot', (shot, ack) => this.shoot(socket, shot, ack));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  dispose(): void {
    for (const room of this.rooms.values()) {
      room.engine?.dispose();
      if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
      for (const timer of room.disconnectTimers.values()) clearTimeout(timer);
    }
    this.rooms.clear();
  }

  private createRoom(socket: GameSocket, ack: (result: ActionResult<RoomView>) => void): void {
    const principal = socket.data.platformPrincipal;
    if (!principal) return ack({ ok: false, error: '游戏账号会话无效' });
    if (this.rooms.size >= MAX_ROOMS) {
      ack({ ok: false, error: '当前房间较多，请稍后再试' });
      return;
    }
    this.leaveRoom(socket, true);

    const code = this.createRoomCode();
    const player: PlayerRecord = {
      id: principal.accountId,
      name: normalizeName(principal.displayName),
      seat: 0,
      socketId: socket.id,
      connected: true,
      ready: false,
    };
    const room: RoomRecord = {
      code,
      createdAt: Date.now(),
      hostId: player.id,
      players: [player],
      spectators: new Map(),
      messages: [],
      phase: 'waiting',
      engine: null,
      cleanupTimer: null,
      disconnectTimers: new Map(),
    };
    this.rooms.set(code, room);
    this.attachSocket(socket, room, principal.accountId, 'player');
    this.pushSystemMessage(room, `${player.name} 创建了房间`);
    ack({ ok: true, data: this.toRoomView(room) });
    this.emitRoom(room);
    this.emitLobby();
  }

  private joinRoom(socket: GameSocket, payload: JoinRoomPayload, ack: (result: ActionResult<RoomView>) => void): void {
    const principal = socket.data.platformPrincipal;
    if (!principal) return ack({ ok: false, error: '游戏账号会话无效' });
    const code = String(payload.code ?? '').trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      ack({ ok: false, error: '房间不存在或已经关闭' });
      return;
    }
    this.leaveRoom(socket, true);
    this.cancelCleanup(room);

    const existingPlayer = room.players.find((player) => player.id === principal.accountId);
    if (existingPlayer) {
      const timer = room.disconnectTimers.get(existingPlayer.id);
      if (timer) clearTimeout(timer);
      room.disconnectTimers.delete(existingPlayer.id);
      if (existingPlayer.socketId && existingPlayer.socketId !== socket.id) {
        this.io.sockets.sockets.get(existingPlayer.socketId)?.disconnect(true);
      }
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      existingPlayer.name = normalizeName(principal.displayName);
      this.attachSocket(socket, room, existingPlayer.id, 'player');
      this.pushSystemMessage(room, `${existingPlayer.name} 已重新连接`);
      ack({ ok: true, data: this.toRoomView(room) });
      this.emitRoom(room);
      this.emitLobby();
      return;
    }

    const shouldSpectate = Boolean(payload.spectate) || room.players.length >= 2 || room.phase !== 'waiting';
    if (shouldSpectate) {
      room.spectators.set(socket.id, { accountId: principal.accountId, name: normalizeName(principal.displayName) });
      this.attachSocket(socket, room, principal.accountId, 'spectator');
      this.pushSystemMessage(room, `${normalizeName(principal.displayName)} 开始观战`);
      ack({ ok: true, data: this.toRoomView(room) });
      this.emitRoom(room);
      this.emitLobby();
      return;
    }

    const player: PlayerRecord = {
      id: principal.accountId,
      name: normalizeName(principal.displayName),
      seat: 1,
      socketId: socket.id,
      connected: true,
      ready: false,
    };
    room.players.push(player);
    this.attachSocket(socket, room, player.id, 'player');
    this.pushSystemMessage(room, `${player.name} 加入了房间`);
    ack({ ok: true, data: this.toRoomView(room) });
    this.emitRoom(room);
    this.emitLobby();
  }

  private attachSocket(socket: GameSocket, room: RoomRecord, accountId: string, role: 'player' | 'spectator'): void {
    socket.join(room.code);
    socket.data.accountId = accountId;
    socket.data.roomCode = room.code;
    socket.data.role = role;
  }

  private setReady(socket: GameSocket, ready: boolean, ack?: (result: ActionResult) => void): void {
    const room = this.getSocketRoom(socket);
    const player = room?.players.find((candidate) => candidate.id === socket.data.accountId);
    if (!room || !player || socket.data.role !== 'player') {
      ack?.({ ok: false, error: '只有房间玩家可以准备' });
      return;
    }
    if (room.phase === 'playing') {
      ack?.({ ok: false, error: '比赛进行中不能修改准备状态' });
      return;
    }
    player.ready = Boolean(ready);
    ack?.({ ok: true });
    this.emitRoom(room);

    if (room.players.length === 2 && room.players.every((candidate) => candidate.ready && candidate.connected)) {
      this.startGame(room);
    }
  }

  private startGame(room: RoomRecord): void {
    if (room.phase === 'playing' || room.players.length !== 2) return;
    room.engine?.dispose();
    room.phase = 'playing';
    room.players.forEach((player) => {
      player.ready = false;
    });
    const players: [string, string] = [room.players[0].id, room.players[1].id];
    const breakerIndex = Math.random() > 0.5 ? 1 : 0;
    room.engine = new GameEngine(players, breakerIndex, {
      onSnapshot: (snapshot, reliable) => {
        if (reliable) this.io.to(room.code).emit('game:snapshot', snapshot);
        else this.io.to(room.code).volatile.emit('game:snapshot', snapshot);
      },
      onEvent: (event) => this.emitGameEvent(room, event),
      onStateChange: () => this.emitRoom(room),
      onFinished: () => {
        room.phase = 'finished';
        this.emitRoom(room);
        this.emitLobby();
      },
    });
    const breaker = room.players[breakerIndex];
    this.pushSystemMessage(room, `比赛开始，${breaker.name} 获得开球权`);
    this.emitRoom(room);
    this.io.to(room.code).emit('game:snapshot', room.engine.getSnapshot());
    this.emitLobby();
  }

  private shoot(socket: GameSocket, shot: ShotPayload, ack?: (result: ActionResult) => void): void {
    this.withPlayerEngine(socket, ack, (engine, playerId) => {
      if (!shot || typeof shot !== 'object') return '击球参数无效';
      return engine.shoot(playerId, shot);
    });
  }

  private withPlayerEngine(
    socket: GameSocket,
    ack: ((result: ActionResult) => void) | undefined,
    action: (engine: GameEngine, playerId: string) => string | null,
  ): void {
    const room = this.getSocketRoom(socket);
    const playerId = socket.data.accountId;
    if (!room?.engine || !playerId || socket.data.role !== 'player') {
      ack?.({ ok: false, error: '当前不在进行中的玩家席位' });
      return;
    }
    const error = action(room.engine, playerId);
    ack?.(error ? { ok: false, error } : { ok: true });
  }

  private sendChat(socket: GameSocket, rawText: string, ack?: (result: ActionResult) => void): void {
    const room = this.getSocketRoom(socket);
    if (!room || !socket.data.accountId) {
      ack?.({ ok: false, error: '请先加入房间' });
      return;
    }
    const now = Date.now();
    if (!this.chatGate.allow(socket.id, now)) {
      ack?.({ ok: false, error: '消息发送得太快了' });
      return;
    }
    const text = String(rawText ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
    if (!text) {
      ack?.({ ok: false, error: '消息不能为空' });
      return;
    }
    const player = room.players.find((candidate) => candidate.id === socket.data.accountId);
    const spectator = room.spectators.get(socket.id);
    const message: ChatMessage = {
      id: randomUUID(),
      senderId: socket.data.accountId,
      senderName: player?.name ?? spectator?.name ?? '观众',
      text,
      sentAt: now,
    };
    room.messages.push(message);
    room.messages = room.messages.slice(-40);
    this.io.to(room.code).emit('room:chat', message);
    ack?.({ ok: true });
  }

  private handleDisconnect(socket: GameSocket): void {
    const room = this.getSocketRoom(socket);
    if (!room) return;
    this.chatGate.clear(socket.id);

    if (socket.data.role === 'spectator') {
      room.spectators.delete(socket.id);
      this.emitRoom(room);
      this.emitLobby();
      this.scheduleCleanupIfEmpty(room);
      return;
    }

    const player = room.players.find((candidate) => candidate.id === socket.data.accountId);
    if (!player || player.socketId !== socket.id) return;
    player.connected = false;
    player.socketId = null;
    player.ready = false;
    this.pushSystemMessage(room, `${player.name} 连接中断，保留席位 90 秒`);
    this.emitRoom(room);
    this.emitLobby();

    const existingTimer = room.disconnectTimers.get(player.id);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      room.disconnectTimers.delete(player.id);
      if (player.connected) return;
      if (room.phase === 'playing' && room.engine) {
        room.engine.forfeit(player.id, `${player.name} 超时未重连，对手获胜`);
      } else if (room.phase === 'waiting') {
        this.removeWaitingPlayer(room, player.id);
      }
      this.scheduleCleanupIfEmpty(room);
    }, PLAYER_RECONNECT_MS);
    room.disconnectTimers.set(player.id, timer);
    this.scheduleCleanupIfEmpty(room);
  }

  private leaveRoom(socket: GameSocket, explicit: boolean): void {
    const room = this.getSocketRoom(socket);
    if (!room) return;
    const accountId = socket.data.accountId;
    const role = socket.data.role;
    socket.leave(room.code);
    socket.data.roomCode = undefined;
    socket.data.role = undefined;

    if (role === 'spectator') {
      room.spectators.delete(socket.id);
    } else if (accountId) {
      const player = room.players.find((candidate) => candidate.id === accountId);
      if (player?.socketId === socket.id) {
        if (room.phase === 'playing' && explicit) room.engine?.forfeit(player.id, `${player.name} 离开了比赛，对手获胜`);
        if (room.phase === 'waiting') this.removeWaitingPlayer(room, player.id);
        else {
          player.connected = false;
          player.socketId = null;
        }
      }
    }
    this.emitRoom(room);
    this.emitLobby();
    this.scheduleCleanupIfEmpty(room);
  }

  private removeWaitingPlayer(room: RoomRecord, playerId: string): void {
    const timer = room.disconnectTimers.get(playerId);
    if (timer) clearTimeout(timer);
    room.disconnectTimers.delete(playerId);
    room.players = room.players.filter((player) => player.id !== playerId);
    room.players.forEach((player, index) => {
      player.seat = index as 0 | 1;
      player.ready = false;
    });
    if (room.hostId === playerId && room.players[0]) room.hostId = room.players[0].id;
  }

  private getSocketRoom(socket: GameSocket): RoomRecord | null {
    return socket.data.roomCode ? this.rooms.get(socket.data.roomCode) ?? null : null;
  }

  private toRoomView(room: RoomRecord): RoomView {
    return {
      code: room.code,
      createdAt: room.createdAt,
      hostId: room.hostId,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        connected: player.connected,
        ready: player.ready,
        group: room.engine?.getGroup(player.id) ?? null,
        remaining: room.engine?.getRemaining(player.id) ?? 7,
      })),
      spectators: room.spectators.size,
      phase: room.phase,
      game: room.engine?.getSnapshot() ?? null,
      messages: room.messages,
    };
  }

  private listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => room.players.length > 0)
      .sort((left, right) => {
        if (left.phase === 'waiting' && right.phase !== 'waiting') return -1;
        if (left.phase !== 'waiting' && right.phase === 'waiting') return 1;
        return right.createdAt - left.createdAt;
      })
      .slice(0, 60)
      .map((room) => ({
        code: room.code,
        hostName: room.players.find((player) => player.id === room.hostId)?.name ?? room.players[0]?.name ?? '未知玩家',
        playerCount: room.players.length,
        spectators: room.spectators.size,
        phase: room.phase,
        createdAt: room.createdAt,
      }));
  }

  private emitRoom(room: RoomRecord): void {
    this.io.to(room.code).emit('room:state', this.toRoomView(room));
  }

  private emitLobby(): void {
    this.io.emit('lobby:rooms', this.listRooms());
  }

  private emitGameEvent(room: RoomRecord, event: GameEvent): void {
    this.io.to(room.code).emit('game:event', event);
    if (event.message) this.pushSystemMessage(room, event.message);
  }

  private pushSystemMessage(room: RoomRecord, text: string): void {
    const message: ChatMessage = {
      id: randomUUID(),
      senderId: null,
      senderName: '裁判',
      text,
      sentAt: Date.now(),
      system: true,
    };
    room.messages.push(message);
    room.messages = room.messages.slice(-40);
    this.io.to(room.code).emit('room:chat', message);
  }

  private scheduleCleanupIfEmpty(room: RoomRecord): void {
    const hasConnectedPlayers = room.players.some((player) => player.connected);
    if (hasConnectedPlayers || room.spectators.size > 0 || room.cleanupTimer) return;
    room.cleanupTimer = setTimeout(() => {
      const stillEmpty = !room.players.some((player) => player.connected) && room.spectators.size === 0;
      if (!stillEmpty) return;
      room.engine?.dispose();
      for (const timer of room.disconnectTimers.values()) clearTimeout(timer);
      this.rooms.delete(room.code);
      this.emitLobby();
    }, EMPTY_ROOM_TTL_MS);
  }

  private cancelCleanup(room: RoomRecord): void {
    if (!room.cleanupTimer) return;
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  private createRoomCode(): string {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const bytes = randomBytes(6);
      let code = '';
      for (let index = 0; index < 6; index += 1) code += ROOM_ALPHABET[bytes[index] % ROOM_ALPHABET.length];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('无法生成唯一房间号');
  }
}

function normalizeName(value: unknown): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 16);
}
