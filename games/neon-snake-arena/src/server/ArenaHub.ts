import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { IntervalGate } from '@yuo-platform/realtime';
import {
  MAX_CHAT_HISTORY,
  MAX_CHAT_LENGTH,
  MAX_EVENT_HISTORY,
  SIMULATION_HZ,
  SNAPSHOT_HZ,
} from '../shared/constants';
import type {
  ActionResult,
  ArenaEvent,
  ArenaJoinData,
  ChatMessage,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  UltraEffect,
  UpgradeOffer,
} from '../shared/protocol';
import type { ModuleId } from '../shared/modules';
import { encodeUltraSnapshot } from '../shared/snapshotCodec';
import { SnakeProfileStore } from './ProfileStore';
import { UltraWorld, type RunResult } from './UltraWorld';

type UltraServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type UltraSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export class ArenaHub {
  private readonly socketsByAccount = new Map<string, string>();
  private readonly socketsByEntity = new Map<number, string>();
  private readonly inputGate = new IntervalGate(24);
  private readonly chatGate = new IntervalGate(900);
  private readonly messages: ChatMessage[] = [];
  private readonly events: ArenaEvent[] = [];
  private simulationTimer: NodeJS.Timeout | null = null;
  private persistenceTimer: NodeJS.Timeout | null = null;
  private lastStepAt = Date.now();
  private lastSnapshotAt = 0;
  private lastMetaAt = 0;
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
    let finishRun: (result: RunResult) => void = () => undefined;
    let publishUpgrade: (entityId: number, offer: UpgradeOffer | null) => void = () => undefined;
    const world = new UltraWorld({
      callbacks: {
        onEffects: (effects) => publishEffects(effects),
        onEvent: (event) => publishEvent(event),
        onRunEnded: (result) => finishRun(result),
        onUpgrade: (entityId, offer) => publishUpgrade(entityId, offer),
      },
    });
    const hub = new ArenaHub(io, world, profiles);
    publishEvent = (event) => hub.publishEvent(event);
    publishEffects = (effects) => hub.io.emit('ultra:effects', effects);
    finishRun = (result) => hub.finishRun(result);
    publishUpgrade = (entityId, offer) => hub.sendUpgrade(entityId, offer);
    return hub;
  }

  start(): void {
    if (this.simulationTimer) return;
    this.lastStepAt = Date.now();
    this.lastSnapshotAt = this.lastStepAt - 1_000 / SNAPSHOT_HZ;
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
    socket.on('ultra:spawn', (ack) => this.handleSpawn(socket, ack));
    socket.on('ultra:restart', (ack) => this.handleRestart(socket, ack));
    socket.on('ultra:pause', (paused, ack) => this.handlePause(socket, paused, ack));
    socket.on('ultra:input', (payload) => this.handleInput(socket, payload));
    socket.on('ultra:upgrade', (moduleId, ack) => this.handleUpgrade(socket, moduleId, ack));
    socket.on('ultra:chat', (text, ack) => this.handleChat(socket, text, ack));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private handleJoin(socket: UltraSocket, ack: (result: ActionResult<ArenaJoinData>) => void): void {
    if (typeof ack !== 'function') return;
    if (socket.data.joinedArena) return ack({ ok: false, error: '当前连接已经加入行动区域' });
    const principal = socket.data.platformPrincipal;
    if (!principal || principal.gameId !== 'neon-snake-arena') return ack({ ok: false, error: '游戏账号会话无效' });
    const player = this.world.connectPlayer(principal.accountId, principal.displayName);
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
    ack({
      ok: true,
      data: {
        selfEntityId: player.entityId,
        profile: this.profiles.get(principal.accountId),
        snapshot: this.world.getSnapshot(),
        roster: this.world.getRoster(),
        leaderboard: this.world.getLeaderboard(),
        messages: this.messages.slice(-MAX_CHAT_HISTORY),
        events: this.events.slice(-MAX_EVENT_HISTORY),
      },
    });
    this.broadcastMeta();
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

  private handlePause(socket: UltraSocket, paused: boolean, ack: (result: ActionResult) => void): void {
    if (typeof ack !== 'function') return;
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId) return ack({ ok: false, error: '请先接入行动区域' });
    if (typeof paused !== 'boolean' || !this.world.setPaused(accountId, paused)) return ack({ ok: false, error: '当前无法切换暂停状态' });
    ack({ ok: true });
    this.broadcastMeta();
  }

  private handleInput(socket: UltraSocket, payload: Parameters<UltraWorld['applyInput']>[1]): void {
    const accountId = this.getJoinedAccountId(socket);
    if (!accountId || !this.inputGate.allow(socket.id)) return;
    this.world.applyInput(accountId, payload);
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
    this.inputGate.clear(socket.id);
    this.chatGate.clear(socket.id);
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
    const delta = (now - this.lastStepAt) / 1_000;
    this.lastStepAt = now;
    this.world.step(delta, now);
    const snapshotInterval = 1_000 / SNAPSHOT_HZ;
    if (this.socketsByAccount.size > 0 && now - this.lastSnapshotAt >= snapshotInterval) {
      this.lastSnapshotAt += Math.floor((now - this.lastSnapshotAt) / snapshotInterval) * snapshotInterval;
      this.io.emit('ultra:snapshot', encodeUltraSnapshot(this.world.getSnapshot(now)));
    }
    if (now - this.lastMetaAt >= 500) {
      this.lastMetaAt = now;
      this.broadcastMeta();
    }
  }

  private broadcastMeta(): void {
    this.io.emit('ultra:roster', this.world.getRoster());
    this.io.emit('ultra:leaderboard', this.world.getLeaderboard());
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
    }, 3_000);
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
