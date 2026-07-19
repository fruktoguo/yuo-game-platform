import { randomBytes, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { IntervalGate, SlidingWindowRateLimiter } from '@yuo-platform/realtime';
import {
  PRODUCTION_LINE_BY_ID,
  RAW_RESOURCE_IDS,
  SPECIALIZATION_BY_ID,
  TECHNOLOGY_BY_ID,
  type ProductionLineId,
  type TechnologyId,
} from '../shared/catalog';
import type {
  ActionResult,
  ActivityEntry,
  ChatMessage,
  ClientToServerEvents,
  CreateRoomPayload,
  FactoryCommand,
  InterServerEvents,
  JoinRoomPayload,
  RoomSummary,
  RoomView,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import {
  advanceFactoryTo,
  createFactoryState,
  executeFactoryCommand,
  getContributionScore,
  getContributorSpecialization,
  toFactorySnapshot,
  toFactorySync,
} from './FactoryEngine';
import { hashRoomPassword, verifyRoomPassword } from './passwords';
import { RoomStore, type StoredFoundryState, type StoredRoom } from './RoomStore';

type FoundryServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type FoundrySocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface RuntimeRoom extends StoredRoom {
  connections: Map<string, string>;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LOBBY_CHANNEL = '__farstar_lobby__';
const TICK_INTERVAL_MS = 500;
const SYNC_INTERVAL_MS = 2_000;
const SAVE_INTERVAL_MS = 30_000;
const MAX_ROOMS = 120;
const MAX_HOSTED_ROOMS = 3;

export class RoomManager {
  private readonly rooms = new Map<string, RuntimeRoom>();
  private readonly actionLimiter = new SlidingWindowRateLimiter({ windowMs: 1_000, maximum: 8 });
  private readonly roomMutationLimiter = new SlidingWindowRateLimiter({ windowMs: 60_000, maximum: 8 });
  private readonly passwordLimiter = new SlidingWindowRateLimiter({ windowMs: 10_000, maximum: 5 });
  private readonly chatGate = new IntervalGate(700);
  private readonly processedRequests = new Map<string, Map<string, ActionResult<{ sequence: number }>>>();
  private readonly tickTimer: NodeJS.Timeout;
  private readonly saveTimer: NodeJS.Timeout;
  private dirty = false;
  private saving: Promise<void> | null = null;
  private lastSyncAt = Date.now();

  constructor(
    private readonly io: FoundryServer,
    private readonly store: RoomStore,
    stored: StoredFoundryState | null,
  ) {
    for (const room of stored?.rooms ?? []) {
      this.rooms.set(room.code, { ...room, connections: new Map() });
    }
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.saveTimer = setInterval(() => {
      void this.flushIfDirty().catch((error) => console.error('远星工造房间定时保存失败', error));
    }, SAVE_INTERVAL_MS);
    this.tickTimer.unref();
    this.saveTimer.unref();
  }

  register(socket: FoundrySocket): void {
    const principal = socket.data.platformPrincipal;
    if (!principal) {
      socket.disconnect(true);
      return;
    }
    socket.data.accountId = principal.accountId;
    void socket.join(LOBBY_CHANNEL);

    socket.on('lobby:list', (ack) => ack({ ok: true, data: this.listRooms() }));
    socket.on('room:create', (payload, ack) => {
      void this.createRoom(socket, payload).then(ack).catch((error) => this.handleUnexpectedError(socket, ack, error));
    });
    socket.on('room:join', (payload, ack) => {
      void this.joinRoom(socket, payload).then(ack).catch((error) => this.handleUnexpectedError(socket, ack, error));
    });
    socket.on('room:leave', (ack) => {
      this.leaveRoom(socket);
      ack?.({ ok: true });
    });
    socket.on('room:start', (ack) => ack(this.startRoom(socket)));
    socket.on('room:chat', (text, ack) => this.sendChat(socket, text, ack));
    socket.on('factory:command', (command, ack) => ack(this.runFactoryCommand(socket, command)));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  getHealth(): { rooms: number; running: number; online: number } {
    let running = 0;
    let online = 0;
    for (const room of this.rooms.values()) {
      if (room.phase === 'running') running += 1;
      online += room.connections.size;
    }
    return { rooms: this.rooms.size, running, online };
  }

  async dispose(): Promise<void> {
    clearInterval(this.tickTimer);
    clearInterval(this.saveTimer);
    await this.flush(true);
    this.rooms.clear();
  }

  private async createRoom(socket: FoundrySocket, payload: CreateRoomPayload): Promise<ActionResult<RoomView>> {
    const principal = socket.data.platformPrincipal;
    if (!principal) return { ok: false, error: '游戏账号会话无效' };
    if (!this.roomMutationLimiter.consume(`create:${principal.accountId}`)) return { ok: false, error: '创建房间过于频繁' };
    this.reclaimCompletedRoomIfNeeded();
    if (this.rooms.size >= MAX_ROOMS) return { ok: false, error: '当前协作房间已达到上限' };
    const hostedRooms = [...this.rooms.values()].filter((room) => room.hostId === principal.accountId && room.phase !== 'completed').length;
    if (hostedRooms >= MAX_HOSTED_ROOMS) return { ok: false, error: '每个账号最多保留三个未完成房间' };

    const name = normalizeRoomName(payload?.name);
    if (!name) return { ok: false, error: '工厂名称需要 2 至 24 个字符' };
    const maxPlayers = Number(payload?.maxPlayers);
    if (maxPlayers !== 2 && maxPlayers !== 4 && maxPlayers !== 6) return { ok: false, error: '协作人数设置无效' };
    const password = typeof payload?.password === 'string' ? payload.password : '';
    const passwordLength = Array.from(password).length;
    if (passwordLength > 0 && (passwordLength < 4 || passwordLength > 64)) return { ok: false, error: '房间密码需要 4 至 64 个字符' };
    const passwordHash = password ? await hashRoomPassword(password) : null;

    this.leaveRoom(socket);
    const now = Date.now();
    const room: RuntimeRoom = {
      code: this.createRoomCode(),
      name,
      hostId: principal.accountId,
      passwordHash,
      maxPlayers,
      phase: 'waiting',
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      members: [{
        accountId: principal.accountId,
        name: normalizeMemberName(principal.displayName),
        joinedAt: now,
        lastSeenAt: now,
      }],
      factory: null,
      activity: [],
      messages: [],
      connections: new Map(),
    };
    this.rooms.set(room.code, room);
    this.attachSocket(socket, room);
    this.pushActivity(room, principal.accountId, principal.displayName, `创建了协作房间「${name}」`, 'system');
    this.markDirty();
    this.emitRoomState(room);
    this.emitLobby();
    return { ok: true, data: this.toRoomView(room) };
  }

  private async joinRoom(socket: FoundrySocket, payload: JoinRoomPayload): Promise<ActionResult<RoomView>> {
    const principal = socket.data.platformPrincipal;
    if (!principal) return { ok: false, error: '游戏账号会话无效' };
    if (!this.roomMutationLimiter.consume(`join:${principal.accountId}`)) return { ok: false, error: '加入房间过于频繁' };
    const code = normalizeRoomCode(payload?.code);
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: '房间不存在' };
    let member = room.members.find((candidate) => candidate.accountId === principal.accountId);
    if (!member) {
      if (room.phase === 'completed') return { ok: false, error: '本轮协作已经结束' };
      if (room.members.length >= room.maxPlayers) return { ok: false, error: '房间协作席位已满' };
      if (room.passwordHash) {
        if (!this.passwordLimiter.consume(`password:${principal.accountId}:${room.code}`)) return { ok: false, error: '密码尝试过于频繁，请稍后再试' };
        const valid = await verifyRoomPassword(typeof payload?.password === 'string' ? payload.password : '', room.passwordHash);
        if (!valid) return { ok: false, error: '房间密码错误' };
      }
      const now = Date.now();
      member = {
        accountId: principal.accountId,
        name: normalizeMemberName(principal.displayName),
        joinedAt: now,
        lastSeenAt: now,
      };
      room.members.push(member);
      this.pushActivity(room, member.accountId, member.name, '加入了协作组', 'system');
    }

    this.leaveRoom(socket);
    const previousSocketId = room.connections.get(principal.accountId);
    if (previousSocketId && previousSocketId !== socket.id) this.io.sockets.sockets.get(previousSocketId)?.disconnect(true);
    member.name = normalizeMemberName(principal.displayName);
    member.lastSeenAt = Date.now();
    this.attachSocket(socket, room);

    if (room.factory && room.phase === 'running') {
      const previousMission = room.factory.missionStage;
      const advance = advanceFactoryTo(room.factory);
      if (advance.changed || advance.simulatedSeconds > 0) this.markDirty();
      if (room.factory.missionStage !== previousMission) this.pushMilestone(room);
    }
    room.updatedAt = Date.now();
    this.markDirty();
    this.emitRoomState(room);
    this.emitLobby();
    return { ok: true, data: this.toRoomView(room) };
  }

  private startRoom(socket: FoundrySocket): ActionResult<RoomView> {
    const room = this.getSocketRoom(socket);
    const accountId = socket.data.accountId;
    if (!room || !accountId) return { ok: false, error: '请先进入房间' };
    if (room.hostId !== accountId) return { ok: false, error: '只有房主可以启动本轮协作' };
    if (room.phase !== 'waiting') return { ok: false, error: '房间已经启动' };
    const now = Date.now();
    room.phase = 'running';
    room.startedAt = now;
    room.updatedAt = now;
    room.factory = createFactoryState(now);
    const member = room.members.find((candidate) => candidate.accountId === accountId);
    this.pushActivity(room, accountId, member?.name ?? '房主', '启动了轨道火箭工业任务', 'system');
    this.markDirty();
    this.emitRoomState(room);
    this.emitFactorySnapshot(room);
    this.emitLobby();
    return { ok: true, data: this.toRoomView(room) };
  }

  private runFactoryCommand(socket: FoundrySocket, rawCommand: FactoryCommand): ActionResult<{ sequence: number }> {
    const room = this.getSocketRoom(socket);
    const accountId = socket.data.accountId;
    if (!room?.factory || room.phase !== 'running' || !accountId) return { ok: false, error: '当前没有进行中的协作任务' };
    if (!room.members.some((member) => member.accountId === accountId)) return { ok: false, error: '你不是该房间成员' };
    const command = validateFactoryCommand(rawCommand);
    if (!command) return { ok: false, error: '工厂指令无效' };
    const cacheKey = `${room.code}:${accountId}`;
    const accountCache = this.processedRequests.get(cacheKey) ?? new Map();
    this.processedRequests.set(cacheKey, accountCache);
    const cached = accountCache.get(command.requestId);
    if (cached) return cached;
    if (!this.actionLimiter.consume(cacheKey)) return { ok: false, error: '操作过于频繁' };
    const missionBefore = room.factory.missionStage;
    advanceFactoryTo(room.factory);
    const execution = executeFactoryCommand(room.factory, command, accountId);
    if (!execution.ok) return { ok: false, error: execution.error ?? '工厂指令执行失败' };

    const member = room.members.find((candidate) => candidate.accountId === accountId);
    if (execution.message && execution.kind) {
      this.pushActivity(room, accountId, member?.name ?? '协作者', execution.message, execution.kind);
    }
    if (room.factory.missionStage !== missionBefore && room.factory.phase === 'running') this.pushMilestone(room);
    if (room.factory.phase === 'completed') {
      room.phase = 'completed';
      this.emitLobby();
    }
    room.updatedAt = Date.now();
    this.markDirty();

    if (command.type === 'assignSpecialization') {
      this.emitRoomState(room);
    } else if (command.type === 'gather' && room.factory.missionStage === missionBefore) {
      this.io.to(room.code).emit('factory:sync', toFactorySync(room.factory));
    } else {
      this.emitFactorySnapshot(room);
    }
    const result: ActionResult<{ sequence: number }> = { ok: true, data: { sequence: room.factory.sequence } };
    accountCache.set(command.requestId, result);
    while (accountCache.size > 64) accountCache.delete(accountCache.keys().next().value as string);
    return result;
  }

  private sendChat(socket: FoundrySocket, rawText: string, ack?: (result: ActionResult) => void): void {
    const room = this.getSocketRoom(socket);
    const accountId = socket.data.accountId;
    const member = room?.members.find((candidate) => candidate.accountId === accountId);
    if (!room || !accountId || !member) {
      ack?.({ ok: false, error: '请先进入协作房间' });
      return;
    }
    if (!this.chatGate.allow(socket.id)) {
      ack?.({ ok: false, error: '消息发送得太快了' });
      return;
    }
    const text = normalizeChatText(rawText);
    if (!text) {
      ack?.({ ok: false, error: '消息不能为空' });
      return;
    }
    const message: ChatMessage = {
      id: randomUUID(),
      senderId: accountId,
      senderName: member.name,
      text,
      sentAt: Date.now(),
    };
    room.messages.push(message);
    room.messages = room.messages.slice(-30);
    room.updatedAt = message.sentAt;
    this.markDirty();
    this.io.to(room.code).emit('room:chat', message);
    ack?.({ ok: true });
  }

  private tick(): void {
    const now = Date.now();
    const shouldSync = now - this.lastSyncAt >= SYNC_INTERVAL_MS;
    for (const room of this.rooms.values()) {
      if (room.phase !== 'running' || !room.factory || room.connections.size === 0) continue;
      const result = advanceFactoryTo(room.factory, now);
      if (result.simulatedSeconds <= 0) continue;
      room.updatedAt = now;
      this.markDirty();
      if (result.missionChanged) {
        this.pushMilestone(room);
        this.emitFactorySnapshot(room);
      } else if (result.completedManualJobs > 0 || shouldSync) {
        this.io.to(room.code).volatile.emit('factory:sync', toFactorySync(room.factory, now));
      }
    }
    if (shouldSync) this.lastSyncAt = now;
    this.actionLimiter.sweep(now);
    this.roomMutationLimiter.sweep(now);
    this.passwordLimiter.sweep(now);
  }

  private handleDisconnect(socket: FoundrySocket): void {
    const room = this.getSocketRoom(socket);
    const accountId = socket.data.accountId;
    this.chatGate.clear(socket.id);
    if (!room || !accountId || room.connections.get(accountId) !== socket.id) return;
    room.connections.delete(accountId);
    const member = room.members.find((candidate) => candidate.accountId === accountId);
    if (member) member.lastSeenAt = Date.now();
    room.updatedAt = Date.now();
    this.markDirty();
    this.emitRoomState(room);
    this.emitLobby();
  }

  private leaveRoom(socket: FoundrySocket): void {
    const room = this.getSocketRoom(socket);
    const accountId = socket.data.accountId;
    if (room && accountId && room.connections.get(accountId) === socket.id) {
      room.connections.delete(accountId);
      const member = room.members.find((candidate) => candidate.accountId === accountId);
      if (member) member.lastSeenAt = Date.now();
      room.updatedAt = Date.now();
      this.markDirty();
      this.emitRoomState(room);
      this.emitLobby();
    }
    if (room) void socket.leave(room.code);
    socket.data.roomCode = undefined;
    if (socket.connected) void socket.join(LOBBY_CHANNEL);
  }

  private attachSocket(socket: FoundrySocket, room: RuntimeRoom): void {
    const accountId = socket.data.accountId;
    if (!accountId) return;
    void socket.leave(LOBBY_CHANNEL);
    void socket.join(room.code);
    socket.data.roomCode = room.code;
    room.connections.set(accountId, socket.id);
  }

  private getSocketRoom(socket: FoundrySocket): RuntimeRoom | null {
    return socket.data.roomCode ? this.rooms.get(socket.data.roomCode) ?? null : null;
  }

  private toRoomView(room: RuntimeRoom): RoomView {
    return {
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      hasPassword: room.passwordHash !== null,
      maxPlayers: room.maxPlayers,
      phase: room.phase,
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      members: room.members.map((member) => ({
        ...member,
        connected: room.connections.has(member.accountId),
        contribution: room.factory ? getContributionScore(room.factory, member.accountId) : 0,
        specialization: room.factory ? getContributorSpecialization(room.factory, member.accountId) : null,
      })),
      factory: room.factory ? toFactorySnapshot(room.factory) : null,
      activity: room.activity,
      messages: room.messages,
    };
  }

  private listRooms(): RoomSummary[] {
    return [...this.rooms.values()]
      .sort((left, right) => {
        if (left.phase === 'waiting' && right.phase !== 'waiting') return -1;
        if (left.phase !== 'waiting' && right.phase === 'waiting') return 1;
        return right.updatedAt - left.updatedAt;
      })
      .slice(0, 60)
      .map((room) => ({
        code: room.code,
        name: room.name,
        hostName: room.members.find((member) => member.accountId === room.hostId)?.name ?? '未知房主',
        hasPassword: room.passwordHash !== null,
        maxPlayers: room.maxPlayers,
        memberCount: room.members.length,
        onlineCount: room.connections.size,
        phase: room.phase,
        missionStage: room.factory?.missionStage ?? 0,
        createdAt: room.createdAt,
      }));
  }

  private emitRoomState(room: RuntimeRoom): void {
    this.io.to(room.code).emit('room:state', this.toRoomView(room));
  }

  private emitFactorySnapshot(room: RuntimeRoom): void {
    if (room.factory) this.io.to(room.code).emit('factory:snapshot', toFactorySnapshot(room.factory));
  }

  private emitLobby(): void {
    this.io.to(LOBBY_CHANNEL).emit('lobby:rooms', this.listRooms());
  }

  private pushActivity(
    room: RuntimeRoom,
    actorId: string | null,
    actorName: string,
    text: string,
    kind: ActivityEntry['kind'],
  ): void {
    const entry: ActivityEntry = {
      id: randomUUID(),
      actorId,
      actorName: normalizeMemberName(actorName),
      text,
      createdAt: Date.now(),
      kind,
    };
    room.activity.push(entry);
    room.activity = room.activity.slice(-40);
    this.io.to(room.code).emit('room:activity', entry);
  }

  private pushMilestone(room: RuntimeRoom): void {
    if (!room.factory) return;
    const title = toFactorySnapshot(room.factory).mission.title;
    this.pushActivity(room, null, '任务系统', `阶段推进：${title}`, 'milestone');
  }

  private markDirty(): void {
    this.dirty = true;
  }

  private reclaimCompletedRoomIfNeeded(): void {
    if (this.rooms.size < MAX_ROOMS) return;
    const candidate = [...this.rooms.values()]
      .filter((room) => room.phase === 'completed' && room.connections.size === 0)
      .sort((left, right) => left.updatedAt - right.updatedAt)[0];
    if (!candidate) return;
    this.rooms.delete(candidate.code);
    for (const key of this.processedRequests.keys()) {
      if (key.startsWith(`${candidate.code}:`)) this.processedRequests.delete(key);
    }
    this.markDirty();
  }

  private async flushIfDirty(): Promise<void> {
    if (this.dirty) await this.flush(false);
  }

  private async flush(force: boolean): Promise<void> {
    if (!force && !this.dirty) return;
    if (this.saving) await this.saving;
    this.dirty = false;
    const rooms = [...this.rooms.values()].map(({ connections: _connections, ...room }) => room);
    this.saving = this.store.save(rooms).finally(() => {
      this.saving = null;
    });
    await this.saving;
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

  private handleUnexpectedError<T>(
    socket: FoundrySocket,
    ack: (result: ActionResult<T>) => void,
    error: unknown,
  ): void {
    console.error('远星工造房间操作失败', error);
    if (socket.connected) ack({ ok: false, error: '房间服务暂时不可用' });
  }
}

function validateFactoryCommand(value: unknown): FactoryCommand | null {
  if (!value || typeof value !== 'object') return null;
  const command = value as Partial<FactoryCommand> & Record<string, unknown>;
  if (typeof command.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(command.requestId)) return null;
  switch (command.type) {
    case 'gather':
      return RAW_RESOURCE_IDS.includes(command.resourceId as typeof RAW_RESOURCE_IDS[number]) ? command as FactoryCommand : null;
    case 'build':
      return typeof command.lineId === 'string'
        && Object.hasOwn(PRODUCTION_LINE_BY_ID, command.lineId)
        && (command.amount === undefined || command.amount === 1 || command.amount === 5 || command.amount === 10)
        ? command as FactoryCommand
        : null;
    case 'dismantle':
      return typeof command.lineId === 'string' && Object.hasOwn(PRODUCTION_LINE_BY_ID, command.lineId)
        ? command as FactoryCommand
        : null;
    case 'setActive':
      return typeof command.lineId === 'string'
        && Object.hasOwn(PRODUCTION_LINE_BY_ID, command.lineId)
        && Number.isInteger(command.active)
        ? command as FactoryCommand
        : null;
    case 'setPriority':
      return typeof command.lineId === 'string'
        && Object.hasOwn(PRODUCTION_LINE_BY_ID, command.lineId)
        && (command.priority === 0 || command.priority === 1 || command.priority === 2)
        ? command as FactoryCommand
        : null;
    case 'research':
      return typeof command.technologyId === 'string' && Object.hasOwn(TECHNOLOGY_BY_ID, command.technologyId)
        ? command as FactoryCommand
        : null;
    case 'assignSpecialization':
      return typeof command.specializationId === 'string' && Object.hasOwn(SPECIALIZATION_BY_ID, command.specializationId)
        ? command as FactoryCommand
        : null;
    case 'launch':
      return command as FactoryCommand;
    default:
      return null;
  }
}

function normalizeRoomCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeRoomName(value: unknown): string {
  const cleaned = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const characters = Array.from(cleaned);
  return characters.length >= 2 && characters.length <= 24 ? cleaned : '';
}

function normalizeMemberName(value: unknown): string {
  return Array.from(String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 20).join('') || '协作者';
}

function normalizeChatText(value: unknown): string {
  return Array.from(String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 180).join('');
}
