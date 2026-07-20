import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Server, Socket } from 'socket.io';
import { IntervalGate } from '@yuo-platform/realtime';
import { decodePlayerMovementState } from '../shared/playerStateCodec';
import {
  MAX_CHAT_HISTORY,
  MAX_CHAT_LENGTH,
  MAX_EVENT_HISTORY,
  PROFILE_SAVE_DELAY_MS,
  SIMULATION_HZ,
  SNAPSHOT_HZ,
} from '../shared/constants';
import type {
  ActionResult,
  ArenaEvent,
  ArenaJoinData,
  ChatMessage,
  ClientToServerEvents,
  FoodClaimPayload,
  FoodClaimResult,
  InterServerEvents,
  InputPayload,
  PlayerCollisionClaim,
  PlayerHeadCollisionEvent,
  ServerToClientEvents,
  SocketData,
  UltraEffect,
  UltraFoodDelta,
  UltraProjectileEvent,
  UpgradeOffer,
} from '../shared/protocol';
import type { ModuleId } from '../shared/modules';
import { encodeUltraSnapshot, SNAPSHOT_PROTOCOL_VERSION } from '../shared/snapshotCodec';
import { SnakeProfileStore } from './ProfileStore';
import { UltraWorld, type RunResult } from './UltraWorld';

type UltraServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type UltraSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const SNAPSHOT_TICK_INTERVAL = Math.max(1, Math.round(SIMULATION_HZ / SNAPSHOT_HZ));
const MAX_FOOD_CLAIMS_PER_BATCH = 32;
const RESYNC_MIN_INTERVAL_MS = 500;

export class ArenaHub {
  private readonly socketsByAccount = new Map<string, string>();
  private readonly socketsByEntity = new Map<number, string>();
  private readonly chatGate = new IntervalGate(900);
  private readonly foodClaimGate = new IntervalGate(8);
  private readonly resyncGate = new IntervalGate(RESYNC_MIN_INTERVAL_MS);
  private readonly messages: ChatMessage[] = [];
  private readonly events: ArenaEvent[] = [];
  private simulationTimer: NodeJS.Timeout | null = null;
  private persistenceTimer: NodeJS.Timeout | null = null;
  private lastStepAt = performance.now();
  private ticksSinceSnapshot = 0;
  private dirty = false;

  private constructor(
    private readonly io: UltraServer,
    private readonly world: UltraWorld,
    private readonly profiles: SnakeProfileStore,
  ) {
    this.io.on('connection', (socket) => this.register(socket));
  }

  static async create(io: UltraServer, dataPath: string): Promise<ArenaHub> {
    const profiles = await SnakeProfileStore.open(dataPath);
    let publishEvent: (event: ArenaEvent) => void = () => undefined;
    let publishEffects: (effects: UltraEffect[]) => void = () => undefined;
    let publishFoods: (delta: UltraFoodDelta) => void = () => undefined;
    let publishProjectiles: (events: UltraProjectileEvent[]) => void = () => undefined;
    let publishPlayerHeadCollision: (event: PlayerHeadCollisionEvent) => void = () => undefined;
    let finishRun: (result: RunResult) => void = () => undefined;
    let publishUpgrade: (entityId: number, offer: UpgradeOffer | null) => void = () => undefined;
    const world = new UltraWorld({
      callbacks: {
        onEffects: (effects) => publishEffects(effects),
        onFoods: (delta) => publishFoods(delta),
        onProjectiles: (events) => publishProjectiles(events),
        onPlayerHeadCollision: (event) => publishPlayerHeadCollision(event),
        onEvent: (event) => publishEvent(event),
        onRunEnded: (result) => finishRun(result),
        onUpgrade: (entityId, offer) => publishUpgrade(entityId, offer),
      },
    });
    const hub = new ArenaHub(io, world, profiles);
    publishEvent = (event) => hub.publishEvent(event);
    publishEffects = (effects) => hub.publishEffects(effects);
    publishFoods = (delta) => hub.publishFoods(delta);
    publishProjectiles = (events) => hub.publishProjectiles(events);
    publishPlayerHeadCollision = (event) => hub.publishPlayerHeadCollision(event);
    finishRun = (result) => hub.finishRun(result);
    publishUpgrade = (entityId, offer) => hub.sendUpgrade(entityId, offer);
    return hub;
  }

  start(): void {
    if (this.simulationTimer) return;
    this.lastStepAt = performance.now();
    this.ticksSinceSnapshot = SNAPSHOT_TICK_INTERVAL - 1;
    this.simulationTimer = setInterval(() => this.tick(), 1_000 / SIMULATION_HZ);
  }

  async stop(): Promise<void> {
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.persistenceTimer) clearTimeout(this.persistenceTimer);
    this.simulationTimer = null;
    this.persistenceTimer = null;
    this.dirty = false;
    await this.profiles.save();
  }

  getHealth(): { tick: number; online: number; alive: number; enemies: number } {
    return { tick: this.world.currentTick, online: this.world.onlineCount, alive: this.world.aliveCount, enemies: this.world.enemyCount };
  }

  private register(socket: UltraSocket): void {
    socket.on('ultra:join', (ack) => this.handleJoin(socket, ack));
    socket.on('ultra:resync', () => this.handleResync(socket));
    socket.on('ultra:spawn', (ack) => this.handleSpawn(socket, ack));
    socket.on('ultra:restart', (ack) => this.handleRestart(socket, ack));
    socket.on('ultra:leave-run', (ack) => this.handleLeaveRun(socket, ack));
    socket.on('ultra:autopilot', (enabled, ack) => this.handleAutopilot(socket, enabled, ack));
    socket.on('ultra:pause', (paused, ack) => this.handlePause(socket, paused, ack));
    socket.on('ultra:input', (payload) => this.handleInput(socket, payload));
    socket.on('ultra:collision', (claim, ack) => this.handleCollision(socket, claim, ack));
    socket.on('ultra:claim-food', (payload, ack) => this.handleFoodClaim(socket, payload, ack));
    socket.on('ultra:upgrade', (moduleId, ack) => this.handleUpgrade(socket, moduleId, ack));
    socket.on('ultra:chat', (text, ack) => this.handleChat(socket, text, ack));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleJoin(socket: UltraSocket, ack: (result: ActionResult<ArenaJoinData>) => void): void {
    if (typeof ack !== 'function') return;
    if (socket.data.joinedArena) return ack({ ok: false, error: '当前连接已经加入行动区域' });
    const principal = socket.data.platformPrincipal;
    if (!principal || principal.gameId !== 'neon-snake-arena') return ack({ ok: false, error: '游戏账号会话无效' });
    const player = this.world.connectPlayer(principal.accountId, principal.displayName, Date.now(), principal.username);
    if (!player) return ack({ ok: false, error: '行动区域人数已满，请稍后再试' });

    const previousSocketId = this.socketsByAccount.get(principal.accountId);
    socket.data.arenaEntityId = player.entityId;
    socket.data.joinedArena = true;
    this.socketsByAccount.set(principal.accountId, socket.id);
    this.socketsByEntity.set(player.entityId, socket.id);
    if (previousSocketId && previousSocketId !== socket.id) {
      const previous = this.io.sockets.sockets.get(previousSocketId);
      if (previous) {
        previous.data.joinedArena = false;
        previous.disconnect(true);
      }
    }
    const snapshot = this.world.getSnapshot(Date.now(), false);
    ack({
      ok: true,
      data: {
        selfEntityId: player.entityId,
        snapshotProtocolVersion: SNAPSHOT_PROTOCOL_VERSION,
        foodRevision: this.world.getFoodRevision(),
        profile: this.profiles.get(principal.accountId),
        snapshot,
        projectiles: this.world.getProjectileStates(),
        roster: this.world.getRoster(),
        leaderboard: this.world.getLeaderboard(),
        messages: this.messages.slice(-MAX_CHAT_HISTORY),
        events: this.events.slice(-MAX_EVENT_HISTORY),
      },
    });
    socket.emit('ultra:snapshot', encodeUltraSnapshot(snapshot).slice());
    this.broadcastMeta();
  }

  private handleResync(socket: UltraSocket): void {
    if (!this.getJoinedAccountId(socket) || !this.resyncGate.allow(socket.id, Date.now())) return;
    const snapshot = this.world.getSnapshot(Date.now(), false);
    socket.emit('ultra:snapshot', encodeUltraSnapshot(snapshot).slice());
  }

  private handleSpawn(socket: UltraSocket, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.world.spawn(accountId)) return ack({ ok: false, error: '当前无法开始行动，请稍候' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleRestart(socket: UltraSocket, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.world.restart(accountId)) return ack({ ok: false, error: '当前无法重新开始行动' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleLeaveRun(socket: UltraSocket, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.world.leaveRun(accountId)) return ack({ ok: false, error: '当前没有进行中的行动' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleAutopilot(socket: UltraSocket, enabled: boolean, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (typeof enabled !== 'boolean') return ack({ ok: false, error: '当前无法切换自动驾驶' });
    if (!this.world.setAutopilot(accountId, enabled)) return ack({ ok: false, error: '当前无法切换自动驾驶' });
    ack({ ok: true });
  }

  private handlePause(socket: UltraSocket, paused: boolean, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (typeof paused !== 'boolean') return ack({ ok: false, error: '当前无法切换暂停状态' });
    if (!this.world.setPaused(accountId, paused)) return ack({ ok: false, error: '当前无法切换暂停状态' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleInput(socket: UltraSocket, payload: InputPayload): void {
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId || !payload || typeof payload !== 'object') return;
    try {
      this.world.applyInput(accountId, decodePlayerMovementState(payload), Date.now());
    } catch {
      // Invalid volatile movement packets are discarded without affecting the room.
    }
  }

  private handleCollision(socket: UltraSocket, claim: PlayerCollisionClaim, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.world.applyCollisionClaim(accountId, claim)) return ack({ ok: false, error: '碰撞事件无效' });
    ack({ ok: true });
  }

  private handleFoodClaim(
    socket: UltraSocket,
    payload: FoodClaimPayload,
    ack: (result: ActionResult<FoodClaimResult>) => void,
  ): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.foodClaimGate.allow(socket.id, Date.now())) return ack({ ok: false, error: '吃球确认过快' });
    if (
      !payload
      || typeof payload !== 'object'
      || !Array.isArray(payload.foodIds)
      || payload.foodIds.length === 0
      || payload.foodIds.length > MAX_FOOD_CLAIMS_PER_BATCH
      || payload.foodIds.some((foodId) => !Number.isSafeInteger(foodId) || foodId <= 0 || foodId > 65_535)
    ) return ack({ ok: false, error: '吃球确认无效' });
    const claimedFoodIds = this.world.claimFoods(accountId, [...new Set(payload.foodIds)]);
    ack({ ok: true, data: { claimedFoodIds } });
  }

  private handleUpgrade(socket: UltraSocket, moduleId: ModuleId, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (!this.world.chooseUpgrade(accountId, moduleId)) return ack({ ok: false, error: '该模块不在当前选项中' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleChat(socket: UltraSocket, text: string, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    if (!this.getJoinedAccountId(socket)) return ack({ ok: false, error: '请先接入行动区域' });
    const now = Date.now();
    if (!this.chatGate.allow(socket.id, now)) return ack({ ok: false, error: '发言过快，请稍后再试' });
    const normalized = typeof text === 'string' ? text.trim().replace(/\s+/gu, ' ') : '';
    if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized)) return ack({ ok: false, error: '消息内容无效' });
    if (Array.from(normalized).length > MAX_CHAT_LENGTH) return ack({ ok: false, error: `消息不能超过 ${MAX_CHAT_LENGTH} 个字符` });
    const player = this.world.getRoster().find((candidate) => candidate.entityId === socket.data.arenaEntityId);
    if (!player) return ack({ ok: false, error: '玩家状态不存在' });
    const message: ChatMessage = { id: randomUUID(), senderEntityId: player.entityId, senderName: player.name, text: normalized, sentAt: now };
    pushLimited(this.messages, message, MAX_CHAT_HISTORY);
    this.io.emit('ultra:chat', message);
    ack({ ok: true });
  }

  private handleDisconnect(socket: UltraSocket): void {
    this.chatGate.clear(socket.id);
    this.foodClaimGate.clear(socket.id);
    this.resyncGate.clear(socket.id);
    const principal = socket.data.platformPrincipal;
    const entityId = socket.data.arenaEntityId;
    if (!socket.data.joinedArena || !principal || this.socketsByAccount.get(principal.accountId) !== socket.id) return;
    this.socketsByAccount.delete(principal.accountId);
    if (entityId !== undefined) this.socketsByEntity.delete(entityId);
    this.world.disconnectPlayer(principal.accountId);
    this.broadcastMeta();
  }

  private tick(): void {
    const now = Date.now();
    const monotonicNow = performance.now();
    const delta = (monotonicNow - this.lastStepAt) / 1_000;
    this.lastStepAt = monotonicNow;
    this.world.step(delta, now);
    this.ticksSinceSnapshot += 1;
    if (this.socketsByAccount.size > 0 && this.ticksSinceSnapshot >= SNAPSHOT_TICK_INTERVAL) {
      this.ticksSinceSnapshot = 0;
      this.io.volatile.emit('ultra:snapshot', encodeUltraSnapshot(this.world.getNetworkSnapshot(now)));
    }
  }

  private broadcastMeta(): void {
    this.io.emit('ultra:roster', this.world.getRoster());
  }

  private publishEffects(effects: UltraEffect[]): void {
    let shared: UltraEffect[] | null = null;
    const targeted = new Map<number, UltraEffect[]>();
    for (const effect of effects) {
      if (effect.audienceEntityId === undefined) {
        (shared ??= []).push(effect);
        continue;
      }
      const audience = targeted.get(effect.audienceEntityId);
      if (audience) audience.push(effect);
      else targeted.set(effect.audienceEntityId, [effect]);
    }
    if (shared) this.io.emit('ultra:effects', shared);
    for (const [entityId, items] of targeted) {
      const socketId = this.socketsByEntity.get(entityId);
      if (socketId) this.io.sockets.sockets.get(socketId)?.emit('ultra:effects', items);
    }
  }

  private publishProjectiles(events: UltraProjectileEvent[]): void {
    if (events.length > 0 && this.socketsByAccount.size > 0) this.io.emit('ultra:projectiles', events);
  }

  private publishFoods(delta: UltraFoodDelta): void {
    if (this.socketsByAccount.size > 0) this.io.emit('ultra:foods', delta);
  }

  private publishPlayerHeadCollision(event: PlayerHeadCollisionEvent): void {
    if (this.socketsByAccount.size > 0) this.io.emit('ultra:player-head-collision', event);
  }

  private sendUpgrade(entityId: number, offer: UpgradeOffer | null): void {
    const socketId = this.socketsByEntity.get(entityId);
    if (socketId) this.io.sockets.sockets.get(socketId)?.emit('ultra:upgrade', offer);
  }

  private publishEvent(event: ArenaEvent): void {
    pushLimited(this.events, event, MAX_EVENT_HISTORY);
    this.io.emit('ultra:event', event);
  }

  private finishRun(result: RunResult): void {
    const update = this.profiles.recordRun(result);
    this.dirty = true;
    this.schedulePersistence();
    const socketId = this.socketsByAccount.get(result.accountId);
    if (socketId) this.io.sockets.sockets.get(socketId)?.emit('ultra:profile', update.profile);
    if (update.brokeScoreRecord || update.brokeLevelRecord || update.brokeSurvivalRecord) {
      this.publishEvent({ id: randomUUID(), type: 'record', text: `${result.name} 刷新个人纪录：${result.score} 分 / LV.${result.level}`, at: Date.now(), entityId: result.entityId });
    }
  }

  private schedulePersistence(): void {
    if (this.persistenceTimer) return;
    this.persistenceTimer = setTimeout(() => {
      this.persistenceTimer = null;
      if (!this.dirty) return;
      this.dirty = false;
      void this.profiles.save().catch((error) => {
        this.dirty = true;
        console.error('贪吃蛇战绩保存失败', error);
        this.schedulePersistence();
      });
    }, PROFILE_SAVE_DELAY_MS);
    this.persistenceTimer.unref();
  }

  private getJoinedAccountId(socket: UltraSocket): string | null {
    const principal = socket.data.platformPrincipal;
    return socket.data.joinedArena && principal ? principal.accountId : null;
  }
}

function pushLimited<T>(target: T[], item: T, maximum: number): void {
  target.push(item);
  if (target.length > maximum) target.splice(0, target.length - maximum);
}
