import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { MAX_CHAT_HISTORY, MAX_CHAT_LENGTH, PROFILE_SAVE_DELAY_MS } from '../shared/constants';
import type { ActionResult } from '../shared/protocol';
import {
  ROOM_MAX_PLAYERS,
  ROOM_MIN_PLAYERS,
  type LobbyClientToServerEvents,
  type LobbyHelloData,
  type LobbyInterServerEvents,
  type LobbyServerToClientEvents,
  type LobbySocketData,
  type P2PSignal,
  type RoomConfig,
  type RoomCreatePayload,
  type RoomJoinData,
  type RoomJoinPayload,
  type RoomChatMessage,
  type RoomMemberView,
  type RoomSummary,
  type RoomView,
  type RunSummaryPayload,
} from '../shared/roomProtocol';
import { SnakeProfileStore } from './ProfileStore';

type LobbyServer = Server<LobbyClientToServerEvents, LobbyServerToClientEvents, LobbyInterServerEvents, LobbySocketData>;
type LobbySocket = Socket<LobbyClientToServerEvents, LobbyServerToClientEvents, LobbyInterServerEvents, LobbySocketData>;

interface RoomMember extends RoomMemberView {
  socketId: string;
}

interface RoomRecord {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  status: 'waiting' | 'playing';
  matchId: string | null;
  hostPeerId: string;
  config: RoomConfig;
  members: Map<string, RoomMember>;
  createdAt: number;
  messages: RoomChatMessage[];
}

const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const DEFAULT_ROOM_CONFIG: RoomConfig = {
  modeId: 'standard',
  difficulty: 1,
  maxPlayers: ROOM_MAX_PLAYERS,
  allowJoinInProgress: true,
};

export class RoomHub {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly socketsByPeer = new Map<string, string>();
  private readonly peersByAccount = new Map<string, string>();
  private persistenceTimer: NodeJS.Timeout | null = null;
  private dirtyProfiles = false;
  private readonly lastChatAtByPeer = new Map<string, number>();

  private constructor(
    private readonly io: LobbyServer,
    private readonly profiles: SnakeProfileStore,
  ) {
    this.io.on('connection', (socket) => this.register(socket));
  }

  static async create(io: LobbyServer, dataPath: string): Promise<RoomHub> {
    return new RoomHub(io, await SnakeProfileStore.open(dataPath));
  }

  async stop(): Promise<void> {
    if (this.persistenceTimer) clearTimeout(this.persistenceTimer);
    this.persistenceTimer = null;
    this.dirtyProfiles = false;
    await this.profiles.save();
  }

  getHealth() {
    let playing = 0;
    let members = 0;
    for (const room of this.rooms.values()) {
      if (room.status === 'playing') playing += 1;
      members += room.members.size;
    }
    return { rooms: this.rooms.size, playing, members, lobbyPeers: this.socketsByPeer.size };
  }

  private register(socket: LobbySocket): void {
    const principal = socket.data.platformPrincipal;
    if (!principal || principal.gameId !== 'neon-snake-arena') {
      socket.disconnect(true);
      return;
    }
    const previousPeerId = this.peersByAccount.get(principal.accountId);
    if (previousPeerId) {
      const previousSocketId = this.socketsByPeer.get(previousPeerId);
      const previous = previousSocketId ? this.io.sockets.sockets.get(previousSocketId) : null;
      previous?.disconnect(true);
    }
    const peerId = randomUUID();
    socket.data.peerId = peerId;
    this.socketsByPeer.set(peerId, socket.id);
    this.peersByAccount.set(principal.accountId, peerId);

    socket.on('lobby:hello', (ack) => this.handleHello(socket, ack));
    socket.on('lobby:list', (ack) => this.handleList(ack));
    socket.on('room:create', (payload, ack) => this.handleCreate(socket, payload, ack));
    socket.on('room:join', (payload, ack) => this.handleJoin(socket, payload, ack));
    socket.on('room:leave', (ack) => this.handleLeave(socket, ack));
    socket.on('room:ready', (ready, ack) => this.handleReady(socket, ready, ack));
    socket.on('room:config', (config, ack) => this.handleConfig(socket, config, ack));
    socket.on('room:start', (ack) => this.handleStart(socket, ack));
    socket.on('room:end-match', (ack) => this.handleEndMatch(socket, ack));
    socket.on('p2p:signal', (targetPeerId, signal, ack) => this.handleSignal(socket, targetPeerId, signal, ack));
    socket.on('profile:record-run', (summary, ack) => this.handleRecordRun(socket, summary, ack));
    socket.on('room:chat', (text, ack) => this.handleChat(socket, text, ack));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleHello(socket: LobbySocket, ack: (result: ActionResult<LobbyHelloData>) => void): void {
    if (typeof ack !== 'function') return;
    const identity = this.identity(socket);
    if (!identity) return ack({ ok: false, error: '游戏账号会话无效' });
    const room = socket.data.roomId ? this.rooms.get(socket.data.roomId) : null;
    ack({
      ok: true,
      data: {
        peerId: identity.peerId,
        profile: this.profiles.get(identity.accountId),
        rooms: this.roomSummaries(),
        room: room ? this.roomView(room) : null,
      },
    });
  }

  private handleList(ack: (result: ActionResult<RoomSummary[]>) => void): void {
    if (typeof ack === 'function') ack({ ok: true, data: this.roomSummaries() });
  }

  private handleCreate(socket: LobbySocket, payload: RoomCreatePayload, ack: (result: ActionResult<RoomJoinData>) => void): void {
    if (typeof ack !== 'function') return;
    const identity = this.identity(socket);
    if (!identity) return ack({ ok: false, error: '游戏账号会话无效' });
    this.leaveCurrentRoom(socket, '房主建立了新的房间');
    const room: RoomRecord = {
      id: randomUUID(),
      code: this.allocateRoomCode(),
      name: normalizeRoomName(payload?.name, `${identity.displayName}的房间`),
      isPrivate: Boolean(payload?.isPrivate),
      status: 'waiting',
      matchId: null,
      hostPeerId: identity.peerId,
      config: normalizeRoomConfig(payload?.config),
      members: new Map(),
      createdAt: Date.now(),
      messages: [],
    };
    room.members.set(identity.peerId, {
      peerId: identity.peerId,
      name: identity.displayName,
      playerId: identity.username,
      isHost: true,
      ready: true,
      socketId: socket.id,
    });
    this.rooms.set(room.id, room);
    socket.data.roomId = room.id;
    void socket.join(roomChannel(room.id));
    const view = this.roomView(room);
    ack({ ok: true, data: { peerId: identity.peerId, profile: this.profiles.get(identity.accountId), room: view } });
    this.io.to(roomChannel(room.id)).emit('room:updated', view);
    this.broadcastRooms();
  }

  private handleJoin(socket: LobbySocket, payload: RoomJoinPayload, ack: (result: ActionResult<RoomJoinData>) => void): void {
    if (typeof ack !== 'function') return;
    const identity = this.identity(socket);
    if (!identity) return ack({ ok: false, error: '游戏账号会话无效' });
    const normalizedCode = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
    const room = (typeof payload?.roomId === 'string' ? this.rooms.get(payload.roomId) : null)
      ?? [...this.rooms.values()].find((candidate) => candidate.code === normalizedCode);
    if (!room) return ack({ ok: false, error: '房间不存在或已经关闭' });
    if (room.members.size >= room.config.maxPlayers) return ack({ ok: false, error: '房间人数已满' });
    if (room.status === 'playing' && !room.config.allowJoinInProgress) return ack({ ok: false, error: '该房间不允许中途加入' });
    this.leaveCurrentRoom(socket, '玩家加入了其他房间');
    room.members.set(identity.peerId, {
      peerId: identity.peerId,
      name: identity.displayName,
      playerId: identity.username,
      isHost: false,
      ready: room.status === 'playing',
      socketId: socket.id,
    });
    socket.data.roomId = room.id;
    void socket.join(roomChannel(room.id));
    const view = this.roomView(room);
    ack({ ok: true, data: { peerId: identity.peerId, profile: this.profiles.get(identity.accountId), room: view } });
    this.io.to(roomChannel(room.id)).emit('room:updated', view);
    if (room.status === 'playing') socket.emit('room:started', view);
    this.broadcastRooms();
  }

  private handleLeave(socket: LobbySocket, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    this.leaveCurrentRoom(socket, '房主离开，房间已关闭');
    ack({ ok: true });
  }

  private handleReady(socket: LobbySocket, ready: boolean, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    const peerId = socket.data.peerId;
    const member = peerId ? room?.members.get(peerId) : null;
    if (!room || !member || room.status !== 'waiting' || typeof ready !== 'boolean') return ack({ ok: false, error: '当前无法切换准备状态' });
    member.ready = member.isHost || ready;
    this.publishRoom(room);
    ack({ ok: true });
  }

  private handleConfig(socket: LobbySocket, config: Partial<RoomConfig>, ack: (result: ActionResult<RoomView>) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    if (!room || socket.data.peerId !== room.hostPeerId || room.status !== 'waiting') return ack({ ok: false, error: '只有等待中的房主可以修改设置' });
    const next = normalizeRoomConfig({ ...room.config, ...config });
    if (next.maxPlayers < room.members.size) return ack({ ok: false, error: '人数上限不能低于当前成员数' });
    room.config = next;
    const view = this.roomView(room);
    this.io.to(roomChannel(room.id)).emit('room:updated', view);
    this.broadcastRooms();
    ack({ ok: true, data: view });
  }

  private handleStart(socket: LobbySocket, ack: (result: ActionResult<RoomView>) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    if (!room || socket.data.peerId !== room.hostPeerId || room.status !== 'waiting') return ack({ ok: false, error: '只有等待中的房主可以开始行动' });
    if ([...room.members.values()].some((member) => !member.isHost && !member.ready)) return ack({ ok: false, error: '仍有玩家尚未准备' });
    room.status = 'playing';
    room.matchId = randomUUID();
    const view = this.roomView(room);
    this.io.to(roomChannel(room.id)).emit('room:started', view);
    this.io.to(roomChannel(room.id)).emit('room:updated', view);
    this.broadcastRooms();
    ack({ ok: true, data: view });
  }

  private handleEndMatch(socket: LobbySocket, ack: (result: ActionResult<RoomView>) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    if (!room || socket.data.peerId !== room.hostPeerId || room.status !== 'playing') return ack({ ok: false, error: '只有房主可以结束当前行动' });
    room.status = 'waiting';
    room.matchId = null;
    for (const member of room.members.values()) member.ready = member.isHost;
    const view = this.roomView(room);
    this.io.to(roomChannel(room.id)).emit('room:updated', view);
    this.broadcastRooms();
    ack({ ok: true, data: view });
  }

  private handleSignal(socket: LobbySocket, targetPeerId: string, signal: P2PSignal, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    const sourcePeerId = socket.data.peerId;
    if (
      !room
      || !sourcePeerId
      || !room.members.has(sourcePeerId)
      || !room.members.has(targetPeerId)
      || (sourcePeerId !== room.hostPeerId && targetPeerId !== room.hostPeerId)
      || !validSignal(signal)
    ) return ack({ ok: false, error: 'P2P 信令无效' });
    const targetSocketId = this.socketsByPeer.get(targetPeerId);
    if (!targetSocketId) return ack({ ok: false, error: '目标玩家已经离线' });
    this.io.to(targetSocketId).emit('p2p:signal', { fromPeerId: sourcePeerId, signal });
    ack({ ok: true });
  }

  private handleRecordRun(socket: LobbySocket, summary: RunSummaryPayload, ack: (result: ActionResult<ReturnType<SnakeProfileStore['get']>>) => void): void {
    if (typeof ack !== 'function') return;
    const identity = this.identity(socket);
    const normalized = normalizeRunSummary(summary);
    if (!identity || !normalized) return ack({ ok: false, error: '行动结算数据无效' });
    const update = this.profiles.recordRun({
      accountId: identity.accountId,
      entityId: 0,
      name: identity.displayName,
      ...normalized,
    });
    this.dirtyProfiles = true;
    this.schedulePersistence();
    socket.emit('profile:updated', update.profile);
    ack({ ok: true, data: update.profile });
  }

  private handleChat(socket: LobbySocket, text: string, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const room = this.currentRoom(socket);
    const peerId = socket.data.peerId;
    const member = peerId ? room?.members.get(peerId) : null;
    if (!room || !peerId || !member) return ack({ ok: false, error: '请先加入房间' });
    const now = Date.now();
    const lastAt = this.lastChatAtByPeer.get(peerId) ?? 0;
    if (now - lastAt < 900) return ack({ ok: false, error: '发言过快，请稍后再试' });
    const normalized = typeof text === 'string' ? text.trim().replace(/\s+/gu, ' ') : '';
    if (!normalized || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(normalized)) return ack({ ok: false, error: '消息内容无效' });
    if (Array.from(normalized).length > MAX_CHAT_LENGTH) return ack({ ok: false, error: `消息不能超过 ${MAX_CHAT_LENGTH} 个字符` });
    const message: RoomChatMessage = { id: randomUUID(), senderPeerId: peerId, senderName: member.name, text: normalized, sentAt: now };
    this.lastChatAtByPeer.set(peerId, now);
    room.messages.push(message);
    if (room.messages.length > MAX_CHAT_HISTORY) room.messages.splice(0, room.messages.length - MAX_CHAT_HISTORY);
    this.io.to(roomChannel(room.id)).emit('room:chat', message);
    ack({ ok: true });
  }

  private handleDisconnect(socket: LobbySocket): void {
    const identity = this.identity(socket);
    this.leaveCurrentRoom(socket, '房主连接中断，房间已关闭');
    if (!identity) return;
    if (this.socketsByPeer.get(identity.peerId) === socket.id) this.socketsByPeer.delete(identity.peerId);
    if (this.peersByAccount.get(identity.accountId) === identity.peerId) this.peersByAccount.delete(identity.accountId);
    this.lastChatAtByPeer.delete(identity.peerId);
    this.broadcastRooms();
  }

  private leaveCurrentRoom(socket: LobbySocket, hostReason: string): void {
    const room = this.currentRoom(socket);
    const peerId = socket.data.peerId;
    socket.data.roomId = undefined;
    if (!room || !peerId) return;
    if (room.hostPeerId === peerId) {
      const notice = { roomId: room.id, reason: hostReason };
      for (const member of room.members.values()) {
        const memberSocket = this.io.sockets.sockets.get(member.socketId);
        if (memberSocket) {
          if (member.peerId !== peerId) memberSocket.emit('room:closed', notice);
          memberSocket.data.roomId = undefined;
          void memberSocket.leave(roomChannel(room.id));
        }
      }
      this.rooms.delete(room.id);
    } else {
      void socket.leave(roomChannel(room.id));
      room.members.delete(peerId);
      this.publishRoom(room);
    }
    this.broadcastRooms();
  }

  private currentRoom(socket: LobbySocket): RoomRecord | null {
    return socket.data.roomId ? this.rooms.get(socket.data.roomId) ?? null : null;
  }

  private identity(socket: LobbySocket): { peerId: string; accountId: string; displayName: string; username: string } | null {
    const principal = socket.data.platformPrincipal;
    const peerId = socket.data.peerId;
    if (!principal || !peerId) return null;
    return { peerId, accountId: principal.accountId, displayName: principal.displayName, username: principal.username };
  }

  private publishRoom(room: RoomRecord): void {
    this.io.to(roomChannel(room.id)).emit('room:updated', this.roomView(room));
    this.broadcastRooms();
  }

  private broadcastRooms(): void {
    this.io.emit('lobby:rooms', this.roomSummaries());
  }

  private roomSummaries(): RoomSummary[] {
    return [...this.rooms.values()]
      .filter((room) => !room.isPrivate)
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((room) => ({
        id: room.id,
        code: room.code,
        name: room.name,
        hostName: room.members.get(room.hostPeerId)?.name ?? '未知房主',
        isPrivate: room.isPrivate,
        status: room.status,
        modeId: room.config.modeId,
        difficulty: room.config.difficulty,
        memberCount: room.members.size,
        maxPlayers: room.config.maxPlayers,
        allowJoinInProgress: room.config.allowJoinInProgress,
      }));
  }

  private roomView(room: RoomRecord): RoomView {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      isPrivate: room.isPrivate,
      status: room.status,
      matchId: room.matchId,
      hostPeerId: room.hostPeerId,
      config: { ...room.config },
      members: [...room.members.values()].map(({ socketId: _socketId, ...member }) => ({ ...member })),
      chatHistory: room.messages.slice(-MAX_CHAT_HISTORY),
    };
  }

  private allocateRoomCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = '';
      for (let index = 0; index < 6; index += 1) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
      if (![...this.rooms.values()].some((room) => room.code === code)) return code;
    }
    return randomUUID().replace(/-/gu, '').slice(0, 6).toUpperCase();
  }

  private schedulePersistence(): void {
    if (this.persistenceTimer) return;
    this.persistenceTimer = setTimeout(() => {
      this.persistenceTimer = null;
      if (!this.dirtyProfiles) return;
      this.dirtyProfiles = false;
      void this.profiles.save().catch((error) => {
        this.dirtyProfiles = true;
        console.error('贪吃蛇战绩保存失败', error);
        this.schedulePersistence();
      });
    }, PROFILE_SAVE_DELAY_MS);
    this.persistenceTimer.unref();
  }
}

function roomChannel(roomId: string): string {
  return `gss0-room:${roomId}`;
}

function normalizeRoomName(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
  return Array.from(normalized || fallback).slice(0, 24).join('');
}

function normalizeRoomConfig(value: Partial<RoomConfig> | undefined): RoomConfig {
  return {
    modeId: value?.modeId === 'standard' ? 'standard' : DEFAULT_ROOM_CONFIG.modeId,
    difficulty: clampInteger(value?.difficulty, 1, 5, DEFAULT_ROOM_CONFIG.difficulty),
    maxPlayers: clampInteger(value?.maxPlayers, ROOM_MIN_PLAYERS, ROOM_MAX_PLAYERS, DEFAULT_ROOM_CONFIG.maxPlayers),
    allowJoinInProgress: typeof value?.allowJoinInProgress === 'boolean' ? value.allowJoinInProgress : DEFAULT_ROOM_CONFIG.allowJoinInProgress,
  };
}

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.round(value as number))) : fallback;
}

function validSignal(signal: unknown): signal is P2PSignal {
  if (!signal || typeof signal !== 'object') return false;
  const candidate = signal as Partial<P2PSignal>;
  if (candidate.kind === 'description') {
    const description = candidate.description;
    return Boolean(description && (description.type === 'offer' || description.type === 'answer') && typeof description.sdp === 'string' && description.sdp.length <= 32_768);
  }
  if (candidate.kind !== 'candidate') return false;
  const ice = candidate.candidate;
  return Boolean(ice && typeof ice.candidate === 'string' && ice.candidate.length <= 4_096);
}

function normalizeRunSummary(value: RunSummaryPayload): RunSummaryPayload | null {
  if (!value || typeof value !== 'object') return null;
  const score = safeInteger(value.score);
  const level = safeInteger(value.level);
  const survivalTime = Number(value.survivalTime);
  const kills = safeInteger(value.kills);
  const botKills = safeInteger(value.botKills);
  const pvpKills = safeInteger(value.pvpKills);
  if ([score, level, kills, botKills, pvpKills].some((item) => item === null) || !Number.isFinite(survivalTime) || survivalTime < 0) return null;
  return { score: score!, level: level!, survivalTime, kills: kills!, botKills: botKills!, pvpKills: pvpKills! };
}

function safeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
}
