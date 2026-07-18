import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { IntervalGate, SlidingWindowRateLimiter } from '@yuo-platform/realtime';
import {
  MAX_CHAT_HISTORY,
  MAX_CHAT_LENGTH,
  MAX_ERASER_SIZE,
  MAX_EVENT_HISTORY,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../shared/constants';
import { isPatternId, isValidCustomPatternData } from '../shared/patterns';
import {
  PING_LABELS,
  type ActionResult,
  type ChatMessage,
  type ClientToServerEvents,
  type CursorPayload,
  type CursorView,
  type InterServerEvents,
  type JoinData,
  type PingPayload,
  type PlacementAction,
  type PlacementResult,
  type ServerToClientEvents,
  type SocketData,
  type WorldEvent,
  type WorldPlayerView,
} from '../shared/protocol';
import { LifeWorld } from './LifeWorld';

type LifeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type LifeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const MAX_ONLINE_PLAYERS = 80;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export class WorldHub {
  private readonly connectedOwners = new Map<number, string>();
  private readonly cursors = new Map<number, CursorView>();
  private readonly placeLimiter = new SlidingWindowRateLimiter({ windowMs: 1_000, maximum: 10 });
  private readonly cursorGate = new IntervalGate(80);
  private readonly chatGate = new IntervalGate(900);
  private readonly pingGate = new IntervalGate(1_500);
  private readonly colorGate = new IntervalGate(500);
  private readonly messages: ChatMessage[] = [];
  private readonly events: WorldEvent[] = [];
  private readonly metaTimer: NodeJS.Timeout;

  constructor(private readonly io: LifeServer, private readonly world: LifeWorld) {
    world.setCallbacks({
      onPatch: (patch) => this.io.emit('world:patch', patch),
      onSnapshot: (snapshot) => this.io.emit('world:snapshot', snapshot),
      onEvent: (event) => this.publishEvent(event),
    });
    this.io.on('connection', (socket) => this.register(socket));
    this.metaTimer = setInterval(() => this.broadcastMeta(), 500);
  }

  dispose(): void {
    clearInterval(this.metaTimer);
  }

  private register(socket: LifeSocket): void {
    socket.on('world:join', (ack) => this.handleJoin(socket, ack));
    socket.on('world:resync', (ack) => {
      if (!socket.data.joined) return ack({ ok: false, error: '请先加入世界' });
      ack({ ok: true, data: this.world.getSnapshot() });
    });
    socket.on('world:place', (payload, ack) => this.handlePlace(socket, payload, ack));
    socket.on('world:set-color', (color, ack) => this.handleSetColor(socket, color, ack));
    socket.on('world:cursor', (payload) => this.handleCursor(socket, payload));
    socket.on('world:chat', (text, ack) => this.handleChat(socket, text, ack));
    socket.on('world:ping', (payload, ack) => this.handlePing(socket, payload, ack));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleJoin(socket: LifeSocket, ack: (result: ActionResult<JoinData>) => void): void {
    if (socket.data.joined) return ack({ ok: false, error: '当前连接已经加入世界' });
    const principal = socket.data.platformPrincipal;
    if (!principal || principal.gameId !== 'life-commons') return ack({ ok: false, error: '游戏账号会话无效' });

    const existingOwner = this.findOwnerByAccountId(principal.accountId);
    if (existingOwner === undefined && this.connectedOwners.size >= MAX_ONLINE_PLAYERS) {
      return ack({ ok: false, error: '当前世界人数已满，请稍后再试' });
    }

    let connected;
    try {
      connected = this.world.connectPlayer(principal.accountId, principal.displayName);
    } catch (error) {
      console.error('玩家加入失败', error);
      return ack({ ok: false, error: '暂时无法加入世界' });
    }

    const previousSocketId = this.connectedOwners.get(connected.player.ownerId);
    socket.data.accountId = principal.accountId;
    socket.data.ownerId = connected.player.ownerId;
    socket.data.joined = true;
    this.connectedOwners.set(connected.player.ownerId, socket.id);
    this.world.setOnlineCount(this.connectedOwners.size);

    if (previousSocketId && previousSocketId !== socket.id) {
      this.io.sockets.sockets.get(previousSocketId)?.disconnect(true);
    }

    ack({
      ok: true,
      data: {
        player: connected.player,
        snapshot: this.world.getSnapshot(),
        meta: this.world.getMeta(),
        messages: this.messages.slice(-MAX_CHAT_HISTORY),
        events: this.events.slice(-MAX_EVENT_HISTORY),
        cursors: [...this.cursors.values()].filter((cursor) => cursor.ownerId !== connected.player.ownerId),
      },
    });
    this.publishEvent(createEvent('join', `${connected.player.name} 进入了公共世界`, connected.player.ownerId));
  }

  private handlePlace(
    socket: LifeSocket,
    payload: PlacementAction,
    ack?: (result: ActionResult<PlacementResult>) => void,
  ): void {
    const ownerId = socket.data.ownerId;
    if (!socket.data.joined || ownerId === undefined) return respond(socket, ack, { ok: false, error: '请先加入世界' });
    if (!isValidPlacement(payload)) return respond(socket, ack, { ok: false, error: '放置参数无效' });
    if (!this.placeLimiter.consume(socket.id)) return respond(socket, ack, { ok: false, error: '操作过快，请稍后再试' });

    const result = this.world.place(ownerId, payload);
    if (!result.ok) return respond(socket, ack, result);
    socket.emit('world:self', this.world.getPlayer(ownerId)!);
    respond(socket, ack, { ok: true, data: result.result });
  }

  private handleCursor(socket: LifeSocket, payload: CursorPayload): void {
    const ownerId = socket.data.ownerId;
    if (!socket.data.joined || ownerId === undefined || !isValidCursor(payload)) return;
    const now = Date.now();
    if (!this.cursorGate.allow(socket.id, now)) return;
    const player = this.world.getPlayer(ownerId);
    if (!player) return;
    const cursor: CursorView = {
      ownerId,
      name: player.name,
      color: player.color,
      x: Math.round(payload.x),
      y: Math.round(payload.y),
      mode: payload.mode,
      patternId: payload.patternId,
      rotation: payload.rotation,
      flipped: payload.flipped,
      brushSize: payload.brushSize,
      updatedAt: now,
    };
    this.cursors.set(ownerId, cursor);
    socket.broadcast.emit('world:cursor', cursor);
  }

  private handleSetColor(socket: LifeSocket, color: string, ack?: (result: ActionResult<WorldPlayerView>) => void): void {
    const ownerId = socket.data.ownerId;
    if (!socket.data.joined || ownerId === undefined) return respond(socket, ack, { ok: false, error: '请先加入世界' });
    const now = Date.now();
    if (!this.colorGate.allow(socket.id, now)) return respond(socket, ack, { ok: false, error: '颜色修改过快，请稍后再试' });
    const result = this.world.setPlayerColor(ownerId, color);
    if (!result.ok) return respond(socket, ack, result);
    const cursor = this.cursors.get(ownerId);
    if (cursor) {
      cursor.color = result.player.color;
      cursor.updatedAt = now;
      this.io.emit('world:cursor', cursor);
    }
    socket.emit('world:self', result.player);
    respond(socket, ack, { ok: true, data: result.player });
  }

  private handleChat(socket: LifeSocket, text: string, ack?: (result: ActionResult) => void): void {
    const ownerId = socket.data.ownerId;
    if (!socket.data.joined || ownerId === undefined) return respond(socket, ack, { ok: false, error: '请先加入世界' });
    const now = Date.now();
    if (!this.chatGate.allow(socket.id, now)) return respond(socket, ack, { ok: false, error: '发言过快，请稍后再试' });
    const normalized = typeof text === 'string' ? text.trim().replace(/\s+/gu, ' ') : '';
    if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized)) return respond(socket, ack, { ok: false, error: '消息内容无效' });
    if (Array.from(normalized).length > MAX_CHAT_LENGTH) return respond(socket, ack, { ok: false, error: `消息不能超过 ${MAX_CHAT_LENGTH} 个字符` });
    const player = this.world.getPlayer(ownerId);
    if (!player) return respond(socket, ack, { ok: false, error: '玩家状态不存在' });

    const message: ChatMessage = {
      id: randomUUID(),
      ownerId,
      senderName: player.name,
      color: player.color,
      text: normalized,
      sentAt: now,
    };
    pushLimited(this.messages, message, MAX_CHAT_HISTORY);
    this.io.emit('world:chat', message);
    respond(socket, ack, { ok: true });
  }

  private handlePing(socket: LifeSocket, payload: PingPayload, ack?: (result: ActionResult) => void): void {
    const ownerId = socket.data.ownerId;
    if (!socket.data.joined || ownerId === undefined) return respond(socket, ack, { ok: false, error: '请先加入世界' });
    if (!isValidPing(payload)) return respond(socket, ack, { ok: false, error: '标记参数无效' });
    const now = Date.now();
    if (!this.pingGate.allow(socket.id, now)) return respond(socket, ack, { ok: false, error: '标记过快，请稍后再试' });
    const player = this.world.getPlayer(ownerId);
    if (!player) return respond(socket, ack, { ok: false, error: '玩家状态不存在' });
    this.publishEvent(createEvent('ping', `${player.name}：${PING_LABELS[payload.kind]}`, ownerId, payload.x, payload.y));
    respond(socket, ack, { ok: true });
  }

  private handleDisconnect(socket: LifeSocket): void {
    this.placeLimiter.clear(socket.id);
    this.cursorGate.clear(socket.id);
    this.chatGate.clear(socket.id);
    this.pingGate.clear(socket.id);
    this.colorGate.clear(socket.id);
    const ownerId = socket.data.ownerId;
    if (ownerId === undefined || this.connectedOwners.get(ownerId) !== socket.id) return;
    this.connectedOwners.delete(ownerId);
    this.cursors.delete(ownerId);
    this.world.disconnectPlayer(ownerId);
    this.world.setOnlineCount(this.connectedOwners.size);
    this.io.emit('world:cursor-remove', ownerId);
    const player = this.world.getPlayer(ownerId);
    if (player) this.publishEvent(createEvent('leave', `${player.name} 离开了公共世界`, ownerId));
  }

  private broadcastMeta(): void {
    this.io.emit('world:meta', this.world.getMeta());
    for (const [ownerId, socketId] of this.connectedOwners) {
      const socket = this.io.sockets.sockets.get(socketId);
      const player = this.world.getPlayer(ownerId);
      if (socket && player) socket.emit('world:self', player);
    }
  }

  private publishEvent(event: WorldEvent): void {
    pushLimited(this.events, event, MAX_EVENT_HISTORY);
    this.io.emit('world:event', event);
  }

  private findOwnerByAccountId(accountId: string): number | undefined {
    for (const [ownerId, socketId] of this.connectedOwners) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket?.data.accountId === accountId) return ownerId;
    }
    return undefined;
  }
}

function isValidPlacement(payload: PlacementAction): boolean {
  return Boolean(payload)
    && typeof payload === 'object'
    && (payload.mode === 'stamp' || payload.mode === 'erase')
    && Number.isInteger(payload.x) && payload.x >= 0 && payload.x < WORLD_WIDTH
    && Number.isInteger(payload.y) && payload.y >= 0 && payload.y < WORLD_HEIGHT
    && isPatternId(payload.patternId)
    && Number.isInteger(payload.rotation) && payload.rotation >= 0 && payload.rotation <= 3
    && typeof payload.flipped === 'boolean'
    && Number.isInteger(payload.brushSize) && payload.brushSize >= 1 && payload.brushSize <= MAX_ERASER_SIZE
    && (payload.customPattern === undefined || (payload.mode === 'stamp' && isValidCustomPatternData(payload.customPattern)));
}

function isValidCursor(payload: CursorPayload): boolean {
  return Boolean(payload)
    && typeof payload === 'object'
    && Number.isFinite(payload.x) && payload.x >= 0 && payload.x < WORLD_WIDTH
    && Number.isFinite(payload.y) && payload.y >= 0 && payload.y < WORLD_HEIGHT
    && (payload.mode === 'stamp' || payload.mode === 'erase' || payload.mode === 'pan')
    && isPatternId(payload.patternId)
    && Number.isInteger(payload.rotation) && payload.rotation >= 0 && payload.rotation <= 3
    && typeof payload.flipped === 'boolean'
    && Number.isInteger(payload.brushSize) && payload.brushSize >= 1 && payload.brushSize <= MAX_ERASER_SIZE;
}

function isValidPing(payload: PingPayload): boolean {
  return Boolean(payload)
    && typeof payload === 'object'
    && Number.isInteger(payload.x) && payload.x >= 0 && payload.x < WORLD_WIDTH
    && Number.isInteger(payload.y) && payload.y >= 0 && payload.y < WORLD_HEIGHT
    && (payload.kind === 'look' || payload.kind === 'help' || payload.kind === 'celebrate');
}

function respond<T>(
  socket: LifeSocket,
  ack: ((result: ActionResult<T>) => void) | undefined,
  result: ActionResult<T>,
): void {
  if (ack) ack(result);
  else if (!result.ok && result.error) socket.emit('server:error', result.error);
}

function pushLimited<T>(target: T[], item: T, maximum: number): void {
  target.push(item);
  if (target.length > maximum) target.splice(0, target.length - maximum);
}

function createEvent(type: WorldEvent['type'], text: string, ownerId?: number, x?: number, y?: number): WorldEvent {
  return { id: randomUUID(), type, text, at: Date.now(), ownerId, x, y };
}
