import type { ActionResult, ArenaJoinData, UltraProfileView } from '../../shared/protocol';
import {
  P2P_PROTOCOL_VERSION,
  type LobbyHelloData,
  type P2PSignal,
  type P2PSignalEnvelope,
  type RoomConfig,
  type RoomCreatePayload,
  type RoomJoinData,
  type RoomJoinPayload,
  type RoomSummary,
  type RoomView,
  type RoomChatMessage,
  type RoomClosedNotice,
  type RunSummaryPayload,
} from '../../shared/roomProtocol';

type Listener<T = unknown> = (payload: T) => void;
type SocketCallback = (...args: any[]) => void;

interface LobbySocketLike {
  connected: boolean;
  id?: string;
  on(event: string, callback: SocketCallback): this;
  off(event: string, callback?: SocketCallback): this;
  emit(event: string, ...args: any[]): this;
  disconnect(): this;
}

interface P2PClientOptions {
  ioFactory: (options: Record<string, unknown>) => LobbySocketLike;
  socketPath: string;
}

interface HostPeerIdentity {
  peerId: string;
  name: string;
  playerId: string;
  profile: UltraProfileView;
}

type WorkerDispatch =
  | { type: 'response'; requestId: number; result: ActionResult<unknown> }
  | { type: 'event'; targetPeerId: string | null; event: string; payload: unknown; reliable: boolean }
  | { type: 'binary'; targetPeerId: string | null; event: 'ultra:snapshot'; payload: ArrayBuffer; reliable: boolean };

type WireMessage =
  | { type: 'hello'; protocolVersion: number; matchId: string; identity: HostPeerIdentity }
  | { type: 'welcome'; protocolVersion: number; matchId: string; result: ActionResult<ArenaJoinData> }
  | { type: 'request'; requestId: number; event: string; args: unknown[] }
  | { type: 'response'; requestId: number; result: ActionResult<unknown> }
  | { type: 'event'; event: string; payload: unknown };

const BINARY_SNAPSHOT = 1;
const BINARY_PLAYER_STATE = 2;
const MAX_VOLATILE_BUFFERED_BYTES = 256 * 1024;
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(event, listeners);
    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listener: Listener<T>): void {
    const listeners = this.listeners.get(event);
    listeners?.delete(listener as Listener);
    if (listeners?.size === 0) this.listeners.delete(event);
  }

  emit(event: string, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }

  clear(): void {
    this.listeners.clear();
  }
}

class GameTransport {
  readonly volatile = {
    emit: (event: string, ...args: unknown[]) => this.client.emitGame(event, args, false),
  };

  constructor(private readonly client: P2PClient) {}

  get connected(): boolean {
    return this.client.gameReady;
  }

  on(event: string, listener: Listener): this {
    this.client.gameEvents.on(event, listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.client.gameEvents.off(event, listener);
    return this;
  }

  emit(event: string, ...args: unknown[]): this {
    this.client.emitGame(event, args, true);
    return this;
  }
}

class HostController {
  private readonly worker = new Worker(new URL('./host.worker.ts', import.meta.url), { type: 'module', name: 'gss0-p2p-host' });
  private readonly pending = new Map<number, (result: ActionResult<unknown>) => void>();
  private requestId = 0;

  constructor(private readonly dispatch: (targetPeerId: string | null, event: string, payload: unknown, reliable: boolean) => void) {
    this.worker.onmessage = (event: MessageEvent<WorkerDispatch>) => this.receive(event.data);
  }

  join(peer: HostPeerIdentity): Promise<ActionResult<ArenaJoinData>> {
    const requestId = ++this.requestId;
    return new Promise((resolve) => {
      this.pending.set(requestId, (result) => resolve(result as ActionResult<ArenaJoinData>));
      this.worker.postMessage({ type: 'join', requestId, peer });
    });
  }

  request(peerId: string, event: string, args: unknown[]): Promise<ActionResult<unknown>> {
    const requestId = ++this.requestId;
    return new Promise((resolve) => {
      this.pending.set(requestId, resolve);
      this.worker.postMessage({ type: 'request', requestId, peerId, event, args });
    });
  }

  input(peerId: string, payload: Uint8Array): void {
    const copied = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    this.worker.postMessage({ type: 'input', peerId, payload: copied }, [copied]);
  }

  disconnect(peerId: string): void {
    this.worker.postMessage({ type: 'disconnect', peerId });
  }

  close(): void {
    this.worker.postMessage({ type: 'stop' });
    this.worker.terminate();
    for (const resolve of this.pending.values()) resolve({ ok: false, error: '房主世界已经停止' });
    this.pending.clear();
  }

  private receive(message: WorkerDispatch): void {
    if (message.type === 'response') {
      const resolve = this.pending.get(message.requestId);
      if (!resolve) return;
      this.pending.delete(message.requestId);
      resolve(message.result);
      return;
    }
    this.dispatch(message.targetPeerId, message.event, message.payload, message.reliable);
  }
}

class PeerLink {
  readonly connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  ready = false;
  private reliableChannel: RTCDataChannel | null = null;
  private stateChannel: RTCDataChannel | null = null;
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];
  private opened = false;

  constructor(
    readonly peerId: string,
    private readonly offerer: boolean,
    private readonly sendSignal: (peerId: string, signal: P2PSignal) => void,
    private readonly onOpen: (link: PeerLink) => void,
    private readonly onWire: (link: PeerLink, message: WireMessage) => void,
    private readonly onBinary: (link: PeerLink, kind: number, payload: Uint8Array) => void,
    private readonly onClosed: (link: PeerLink) => void,
  ) {
    this.connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.toJSON();
      this.sendSignal(this.peerId, {
        kind: 'candidate',
        candidate: {
          candidate: candidate.candidate ?? '',
          sdpMid: candidate.sdpMid ?? null,
          sdpMLineIndex: candidate.sdpMLineIndex ?? null,
          usernameFragment: candidate.usernameFragment ?? null,
        },
      });
    };
    this.connection.onconnectionstatechange = () => {
      if (this.connection.connectionState === 'failed' || this.connection.connectionState === 'closed') this.onClosed(this);
    };
    if (offerer) {
      this.attachChannel(this.connection.createDataChannel('reliable', { ordered: true }));
      this.attachChannel(this.connection.createDataChannel('state', { ordered: false, maxRetransmits: 0 }));
    } else {
      this.connection.ondatachannel = (event) => this.attachChannel(event.channel);
    }
  }

  async createOffer(): Promise<void> {
    if (!this.offerer) return;
    await this.connection.setLocalDescription(await this.connection.createOffer());
    const description = this.connection.localDescription;
    if (description?.type === 'offer' && description.sdp) this.sendSignal(this.peerId, { kind: 'description', description: { type: 'offer', sdp: description.sdp } });
  }

  async acceptDescription(description: { type: 'offer' | 'answer'; sdp: string }): Promise<void> {
    await this.connection.setRemoteDescription(description);
    await this.flushCandidates();
    if (description.type !== 'offer') return;
    await this.connection.setLocalDescription(await this.connection.createAnswer());
    const local = this.connection.localDescription;
    if (local?.type === 'answer' && local.sdp) this.sendSignal(this.peerId, { kind: 'description', description: { type: 'answer', sdp: local.sdp } });
  }

  async addCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.connection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    await this.connection.addIceCandidate(candidate);
  }

  sendWire(message: WireMessage): boolean {
    if (this.reliableChannel?.readyState !== 'open') return false;
    this.reliableChannel.send(JSON.stringify(message));
    return true;
  }

  sendBinary(kind: number, payload: Uint8Array, reliable: boolean): boolean {
    const channel = reliable ? this.reliableChannel : this.stateChannel;
    if (channel?.readyState !== 'open') return false;
    if (!reliable && channel.bufferedAmount > MAX_VOLATILE_BUFFERED_BYTES) return false;
    channel.send(binaryFrame(kind, payload));
    return true;
  }

  close(): void {
    this.ready = false;
    this.reliableChannel?.close();
    this.stateChannel?.close();
    this.connection.close();
  }

  private attachChannel(channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer';
    if (channel.label === 'reliable') this.reliableChannel = channel;
    else if (channel.label === 'state') this.stateChannel = channel;
    else {
      channel.close();
      return;
    }
    channel.onopen = () => this.checkOpen();
    channel.onclose = () => {
      if (this.opened) this.onClosed(this);
    };
    channel.onmessage = (event) => this.receiveData(event.data);
  }

  private checkOpen(): void {
    if (this.opened || this.reliableChannel?.readyState !== 'open' || this.stateChannel?.readyState !== 'open') return;
    this.opened = true;
    this.onOpen(this);
  }

  private receiveData(data: string | ArrayBuffer | Blob): void {
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data) as WireMessage;
        if (message && typeof message.type === 'string') this.onWire(this, message);
      } catch {
        // Malformed peer messages never affect the active room.
      }
      return;
    }
    if (!(data instanceof ArrayBuffer)) return;
    const bytes = new Uint8Array(data);
    if (bytes.byteLength < 2) return;
    this.onBinary(this, bytes[0], bytes.subarray(1));
  }

  private async flushCandidates(): Promise<void> {
    const candidates = this.pendingCandidates.splice(0);
    for (const candidate of candidates) await this.connection.addIceCandidate(candidate);
  }
}

class P2PClient {
  readonly appEvents = new EventBus();
  readonly gameEvents = new EventBus();
  readonly transport = new GameTransport(this);
  rooms: RoomSummary[] = [];
  room: RoomView | null = null;
  peerId: string | null = null;
  profile: UltraProfileView | null = null;
  gameReady = false;
  private readonly socket: LobbySocketLike;
  private readonly links = new Map<string, PeerLink>();
  private readonly pendingSignals = new Map<string, P2PSignal[]>();
  private readonly ignoredRoomIds = new Set<string>();
  private readonly pendingRemoteRequests = new Map<number, (result: ActionResult<unknown>) => void>();
  private hostController: HostController | null = null;
  private activeMatchId: string | null = null;
  private startingMatchId: string | null = null;
  private matchStartGeneration = 0;
  private stopping = false;
  private remoteRequestId = 0;
  private gameActivatedMatchId: string | null = null;

  private constructor(options: P2PClientOptions) {
    this.socket = options.ioFactory({ path: options.socketPath, transports: ['websocket', 'polling'], timeout: 8_000 });
    this.bindLobbySocket();
  }

  static async connect(options: P2PClientOptions): Promise<P2PClient> {
    const client = new P2PClient(options);
    await client.waitForSocket();
    const result = await client.socketRequest<LobbyHelloData>('lobby:hello');
    if (!result.ok || !result.data) throw new Error(result.error || 'P2P 大厅会话无效');
    client.peerId = result.data.peerId;
    client.profile = result.data.profile;
    client.rooms = result.data.rooms;
    client.room = result.data.room;
    client.appEvents.emit('rooms', client.rooms);
    if (client.room) client.appEvents.emit('room', client.room);
    if (client.room?.status === 'playing') {
      window.setTimeout(() => {
        if (client.room?.status === 'playing') void client.beginMatch(client.room);
      }, 0);
    }
    return client;
  }

  get isHost(): boolean {
    return Boolean(this.room && this.peerId && this.room.hostPeerId === this.peerId);
  }

  on<T = unknown>(event: string, listener: Listener<T>): () => void {
    return this.appEvents.on(event, listener);
  }

  async createRoom(payload: RoomCreatePayload): Promise<ActionResult<RoomJoinData>> {
    const previousRoomId = this.room?.id;
    this.ignoreCurrentRoom();
    const result = await this.socketRequest<RoomJoinData>('room:create', payload);
    if (result.ok && result.data) this.adoptRoom(result.data);
    else if (previousRoomId) this.ignoredRoomIds.delete(previousRoomId);
    return result;
  }

  async joinRoom(payload: RoomJoinPayload): Promise<ActionResult<RoomJoinData>> {
    const previousRoomId = this.room?.id;
    this.ignoreCurrentRoom();
    const result = await this.socketRequest<RoomJoinData>('room:join', payload);
    if (result.ok && result.data) this.adoptRoom(result.data);
    else if (previousRoomId) this.ignoredRoomIds.delete(previousRoomId);
    return result;
  }

  async leaveRoom(): Promise<ActionResult<unknown>> {
    const previousRoomId = this.room?.id;
    if (previousRoomId) this.ignoreRoom(previousRoomId);
    const result = await this.socketRequest('room:leave');
    if (result.ok) {
      this.stopGame();
      this.room = null;
      this.appEvents.emit('room', null);
    } else if (previousRoomId) this.ignoredRoomIds.delete(previousRoomId);
    return result;
  }

  setReady(ready: boolean): Promise<ActionResult<unknown>> {
    return this.socketRequest('room:ready', ready);
  }

  updateConfig(config: Partial<RoomConfig>): Promise<ActionResult<RoomView>> {
    return this.socketRequest<RoomView>('room:config', config);
  }

  startRoom(): Promise<ActionResult<RoomView>> {
    return this.socketRequest<RoomView>('room:start');
  }

  voteRestart(): Promise<ActionResult<RoomView>> {
    return this.socketRequest<RoomView>('room:restart-vote');
  }

  endMatch(): Promise<ActionResult<RoomView>> {
    return this.socketRequest<RoomView>('room:end-match');
  }

  sendChat(text: string): Promise<ActionResult> {
    return this.socketRequest('room:chat', text);
  }

  close(): void {
    this.stopGame();
    this.socket.disconnect();
    this.appEvents.clear();
    this.gameEvents.clear();
  }

  emitGame(event: string, originalArgs: unknown[], reliable: boolean): void {
    const args = [...originalArgs];
    const callback = typeof args.at(-1) === 'function' ? args.pop() as (result: ActionResult<unknown>) => void : null;
    if (!this.gameReady || !this.peerId) {
      callback?.({ ok: false, error: 'P2P 游戏连接尚未就绪' });
      return;
    }
    if (event === 'ultra:input') {
      const payload = toUint8Array(args[0]);
      if (payload) this.sendPlayerState(payload, reliable);
      return;
    }
    this.requestHost(event, args).then((result) => callback?.(result));
  }

  private bindLobbySocket(): void {
    this.socket.on('lobby:rooms', (rooms: RoomSummary[]) => {
      this.rooms = Array.isArray(rooms) ? rooms : [];
      this.appEvents.emit('rooms', this.rooms);
    });
    this.socket.on('room:updated', (room: RoomView) => {
      if (this.ignoredRoomIds.has(room.id) || (this.room && this.room.id !== room.id)) return;
      this.room = room;
      this.appEvents.emit('room', room);
      if (room.status === 'playing') {
        void this.beginMatch(room);
      } else if (this.activeMatchId) {
        this.stopGame();
      }
    });
    this.socket.on('room:started', (room: RoomView) => {
      if (this.ignoredRoomIds.has(room.id) || (this.room && this.room.id !== room.id)) return;
      this.room = room;
      this.appEvents.emit('room', room);
      void this.beginMatch(room);
    });
    this.socket.on('room:closed', (notice: RoomClosedNotice) => {
      if (!this.room || notice?.roomId !== this.room.id) return;
      this.ignoreRoom(notice.roomId);
      this.stopGame();
      this.room = null;
      this.appEvents.emit('room', null);
      this.appEvents.emit('room-closed', notice);
    });
    this.socket.on('p2p:signal', (envelope: P2PSignalEnvelope) => void this.receiveSignal(envelope));
    this.socket.on('profile:updated', (profile: UltraProfileView) => {
      this.profile = profile;
      this.gameEvents.emit('ultra:profile', profile);
    });
    this.socket.on('room:chat', (message: RoomChatMessage) => this.appEvents.emit('chat', message));
    this.socket.on('disconnect', () => this.appEvents.emit('status', { kind: 'connecting', text: 'P2P 大厅连接中断' }));
    this.socket.on('connect', () => this.appEvents.emit('status', { kind: 'online', text: 'P2P 大厅已连接' }));
    this.socket.on('connect_error', () => this.appEvents.emit('status', { kind: 'error', text: '无法连接 P2P 大厅' }));
  }

  private waitForSocket(): Promise<void> {
    if (this.socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.socket.off('connect', connected);
        this.socket.off('connect_error', failed);
        reject(new Error('连接 P2P 大厅超时'));
      }, 8_000);
      const connected = () => {
        window.clearTimeout(timeout);
        this.socket.off('connect_error', failed);
        resolve();
      };
      const failed = () => {
        window.clearTimeout(timeout);
        this.socket.off('connect', connected);
        reject(new Error('无法连接 P2P 大厅'));
      };
      this.socket.on('connect', connected);
      this.socket.on('connect_error', failed);
    });
  }

  private socketRequest<T = unknown>(event: string, ...args: unknown[]): Promise<ActionResult<T>> {
    return new Promise((resolve) => {
      if (!this.socket.connected) return resolve({ ok: false, error: 'P2P 大厅连接尚未就绪' });
      this.socket.emit(event, ...args, (result: ActionResult<T>) => resolve(result));
    });
  }

  private adoptRoom(data: RoomJoinData): void {
    if (this.room && this.room.id !== data.room.id) this.stopGame();
    this.ignoredRoomIds.delete(data.room.id);
    this.peerId = data.peerId;
    this.profile = data.profile;
    this.room = data.room;
    this.appEvents.emit('room', data.room);
    if (data.room.status === 'playing') void this.beginMatch(data.room);
  }

  private async beginMatch(room: RoomView): Promise<void> {
    if (!room.matchId || !this.peerId) return;
    if (this.activeMatchId === room.matchId && this.gameReady) {
      if (this.isHost) this.syncHostLinks(room);
      return;
    }
    if (this.activeMatchId && this.activeMatchId !== room.matchId) this.stopGame();
    if (this.startingMatchId === room.matchId) return;
    const matchId = room.matchId;
    const generation = this.matchStartGeneration;
    this.startingMatchId = matchId;
    this.activeMatchId = matchId;
    try {
      if (this.isHost) {
        if (!this.hostController) {
          this.hostController = new HostController((target, event, payload, reliable) => (
            this.dispatchFromHost(target, event, payload, reliable)
          ));
        }
        if (this.gameActivatedMatchId !== room.matchId) {
          const identity = this.selfIdentity(room);
          if (!identity) return this.failGame('无法读取房主身份');
          const result = await this.hostController.join(identity);
          if (
            generation !== this.matchStartGeneration
            || this.activeMatchId !== matchId
            || this.room?.matchId !== matchId
            || this.room.status !== 'playing'
          ) return;
          if (!result.ok || !result.data) return this.failGame(result.error || '房主世界初始化失败');
          this.activateGame(matchId, result.data);
        }
        if (generation !== this.matchStartGeneration || this.activeMatchId !== matchId || this.room?.matchId !== matchId) return;
        this.syncHostLinks(room);
        return;
      }
      this.appEvents.emit('status', { kind: 'connecting', text: '正在连接房主' });
    } catch (error) {
      if (generation === this.matchStartGeneration && this.activeMatchId === matchId) {
        this.failGame(error instanceof Error ? error.message : 'P2P match initialization failed');
      }
    } finally {
      if (this.startingMatchId === matchId && this.matchStartGeneration === generation) this.startingMatchId = null;
    }
  }

  private syncHostLinks(room: RoomView): void {
    if (!this.isHost || !this.peerId) return;
    const members = new Set(room.members.map((member) => member.peerId));
    for (const [peerId, link] of this.links) {
      if (members.has(peerId)) continue;
      link.close();
      this.links.delete(peerId);
      this.hostController?.disconnect(peerId);
    }
    for (const member of room.members) {
      if (member.peerId === this.peerId || this.links.has(member.peerId)) continue;
      const link = this.createLink(member.peerId, true);
      this.links.set(member.peerId, link);
      void link.createOffer().catch(() => this.closeLink(member.peerId));
    }
  }

  private createLink(peerId: string, offerer: boolean): PeerLink {
    return new PeerLink(
      peerId,
      offerer,
      (targetPeerId, signal) => this.sendSignal(targetPeerId, signal),
      (link) => this.linkOpened(link),
      (link, message) => void this.receiveWire(link, message),
      (link, kind, payload) => this.receiveBinary(link, kind, payload),
      (link) => this.linkClosed(link),
    );
  }

  private sendSignal(targetPeerId: string, signal: P2PSignal): void {
    void this.socketRequest('p2p:signal', targetPeerId, signal).then((result) => {
      if (!result.ok) this.appEvents.emit('status', { kind: 'error', text: result.error || 'P2P 信令发送失败' });
    });
  }

  private async receiveSignal(envelope: P2PSignalEnvelope): Promise<void> {
    if (!this.room || !this.peerId || !this.room.members.some((member) => member.peerId === envelope.fromPeerId)) return;
    let link = this.links.get(envelope.fromPeerId);
    if (envelope.signal.kind === 'description' && envelope.signal.description.type === 'offer') {
      if (this.isHost || envelope.fromPeerId !== this.room.hostPeerId) return;
      if (!link) {
        link = this.createLink(envelope.fromPeerId, false);
        this.links.set(envelope.fromPeerId, link);
      }
      await link.acceptDescription(envelope.signal.description);
      await this.flushPendingSignals(envelope.fromPeerId, link);
      return;
    }
    if (!link) {
      const queued = this.pendingSignals.get(envelope.fromPeerId) ?? [];
      queued.push(envelope.signal);
      this.pendingSignals.set(envelope.fromPeerId, queued);
      return;
    }
    if (envelope.signal.kind === 'description') await link.acceptDescription(envelope.signal.description);
    else await link.addCandidate(envelope.signal.candidate);
  }

  private async flushPendingSignals(peerId: string, link: PeerLink): Promise<void> {
    const signals = this.pendingSignals.get(peerId) ?? [];
    this.pendingSignals.delete(peerId);
    for (const signal of signals) {
      if (signal.kind === 'description') await link.acceptDescription(signal.description);
      else await link.addCandidate(signal.candidate);
    }
  }

  private linkOpened(link: PeerLink): void {
    if (this.isHost) return;
    const room = this.room;
    if (!room?.matchId || link.peerId !== room.hostPeerId) return;
    const identity = this.selfIdentity(room);
    if (!identity) return this.failGame('无法读取玩家身份');
    link.sendWire({ type: 'hello', protocolVersion: P2P_PROTOCOL_VERSION, matchId: room.matchId, identity });
  }

  private async receiveWire(link: PeerLink, message: WireMessage): Promise<void> {
    if (message.type === 'hello') {
      if (!this.isHost || !this.room?.matchId || message.matchId !== this.room.matchId || message.protocolVersion !== P2P_PROTOCOL_VERSION || message.identity.peerId !== link.peerId) {
        link.sendWire({ type: 'welcome', protocolVersion: P2P_PROTOCOL_VERSION, matchId: this.room?.matchId ?? '', result: { ok: false, error: 'P2P 协议或房间身份不一致' } });
        link.close();
        return;
      }
      const member = this.room.members.find((candidate) => candidate.peerId === link.peerId);
      if (!member || !this.hostController) return;
      const identity: HostPeerIdentity = { ...message.identity, name: member.name, playerId: member.playerId };
      const result = await this.hostController.join(identity);
      link.ready = Boolean(result.ok);
      link.sendWire({ type: 'welcome', protocolVersion: P2P_PROTOCOL_VERSION, matchId: message.matchId, result });
      return;
    }
    if (message.type === 'welcome') {
      if (this.isHost || message.protocolVersion !== P2P_PROTOCOL_VERSION || message.matchId !== this.activeMatchId || !message.result.ok || !message.result.data) {
        if (!message.result.ok) this.failGame(message.result.error || '房主拒绝了 P2P 加入');
        return;
      }
      link.ready = true;
      this.activateGame(message.matchId, message.result.data);
      return;
    }
    if (message.type === 'request') {
      if (!this.isHost || !link.ready || !this.hostController) return;
      const result = await this.hostController.request(link.peerId, message.event, message.args);
      link.sendWire({ type: 'response', requestId: message.requestId, result });
      return;
    }
    if (message.type === 'response') {
      const resolve = this.pendingRemoteRequests.get(message.requestId);
      if (!resolve) return;
      this.pendingRemoteRequests.delete(message.requestId);
      resolve(message.result);
      return;
    }
    if (message.type === 'event' && !this.isHost && link.peerId === this.room?.hostPeerId) this.receiveGameEvent(message.event, message.payload);
  }

  private receiveBinary(link: PeerLink, kind: number, payload: Uint8Array): void {
    if (kind === BINARY_PLAYER_STATE && this.isHost && link.ready) {
      this.hostController?.input(link.peerId, payload);
      return;
    }
    if (kind === BINARY_SNAPSHOT && !this.isHost && link.peerId === this.room?.hostPeerId) {
      this.receiveGameEvent('ultra:snapshot', payload);
    }
  }

  private linkClosed(link: PeerLink): void {
    if (this.links.get(link.peerId) !== link) return;
    this.links.delete(link.peerId);
    if (this.stopping) return;
    if (this.isHost) {
      this.hostController?.disconnect(link.peerId);
    } else if (link.peerId === this.room?.hostPeerId && this.activeMatchId) {
      this.failGame('与房主的 P2P 连接已经中断');
    }
  }

  private closeLink(peerId: string): void {
    const link = this.links.get(peerId);
    if (!link) return;
    this.links.delete(peerId);
    link.close();
    this.hostController?.disconnect(peerId);
  }

  private dispatchFromHost(targetPeerId: string | null, event: string, payload: unknown, reliable: boolean): void {
    if (!this.peerId) return;
    if (targetPeerId === null || targetPeerId === this.peerId) this.receiveGameEvent(event, payload);
    for (const [peerId, link] of this.links) {
      if (!link.ready || (targetPeerId !== null && targetPeerId !== peerId)) continue;
      if (event === 'ultra:snapshot' && payload instanceof ArrayBuffer) link.sendBinary(BINARY_SNAPSHOT, new Uint8Array(payload), reliable);
      else link.sendWire({ type: 'event', event, payload });
    }
  }

  private receiveGameEvent(event: string, payload: unknown): void {
    if (event === 'p2p:run-ended') {
      const summary = payload as RunSummaryPayload;
      void this.socketRequest<UltraProfileView>('profile:record-run', summary).then((result) => {
        if (result.ok && result.data) {
          this.profile = result.data;
          this.gameEvents.emit('ultra:profile', result.data);
        }
      });
      return;
    }
    this.gameEvents.emit(event, payload);
  }

  private sendPlayerState(payload: Uint8Array, reliable: boolean): void {
    if (!this.peerId) return;
    if (this.isHost) {
      this.hostController?.input(this.peerId, payload);
      return;
    }
    const link = this.room ? this.links.get(this.room.hostPeerId) : null;
    link?.sendBinary(BINARY_PLAYER_STATE, payload, reliable);
  }

  private requestHost(event: string, args: unknown[]): Promise<ActionResult<unknown>> {
    if (!this.peerId) return Promise.resolve({ ok: false, error: 'P2P 身份尚未就绪' });
    if (this.isHost) return this.hostController?.request(this.peerId, event, args) ?? Promise.resolve({ ok: false, error: '房主世界尚未就绪' });
    const link = this.room ? this.links.get(this.room.hostPeerId) : null;
    if (!link?.ready) return Promise.resolve({ ok: false, error: '尚未连接房主' });
    const requestId = ++this.remoteRequestId;
    return new Promise((resolve) => {
      this.pendingRemoteRequests.set(requestId, resolve);
      if (!link.sendWire({ type: 'request', requestId, event, args })) {
        this.pendingRemoteRequests.delete(requestId);
        resolve({ ok: false, error: 'P2P 可靠通道不可用' });
      }
    });
  }

  private activateGame(matchId: string, joinData: ArenaJoinData): void {
    if (this.gameActivatedMatchId === matchId) return;
    this.gameActivatedMatchId = matchId;
    this.gameReady = true;
    this.appEvents.emit('status', { kind: 'online', text: this.isHost ? '房主 P2P 世界已启动' : 'P2P 已连接房主' });
    this.appEvents.emit('game-ready', { transport: this.transport, joinData, room: this.room });
  }

  private failGame(message: string): void {
    this.appEvents.emit('status', { kind: 'error', text: message });
    this.appEvents.emit('game-error', message);
  }

  private selfIdentity(room: RoomView): HostPeerIdentity | null {
    const peerId = this.peerId;
    const member = peerId ? room.members.find((candidate) => candidate.peerId === peerId) : null;
    if (!peerId || !member || !this.profile) return null;
    return { peerId, name: member.name, playerId: member.playerId, profile: this.profile };
  }

  private ignoreCurrentRoom(): void {
    if (!this.room) return;
    this.ignoreRoom(this.room.id);
  }

  private ignoreRoom(roomId: string): void {
    this.ignoredRoomIds.add(roomId);
    while (this.ignoredRoomIds.size > 16) this.ignoredRoomIds.delete(this.ignoredRoomIds.values().next().value!);
  }

  private stopGame(): void {
    this.stopping = true;
    this.matchStartGeneration += 1;
    this.gameReady = false;
    this.activeMatchId = null;
    this.gameActivatedMatchId = null;
    this.startingMatchId = null;
    for (const link of this.links.values()) link.close();
    this.links.clear();
    this.pendingSignals.clear();
    for (const resolve of this.pendingRemoteRequests.values()) resolve({ ok: false, error: 'P2P 对局已经结束' });
    this.pendingRemoteRequests.clear();
    this.hostController?.close();
    this.hostController = null;
    this.stopping = false;
  }
}

function binaryFrame(kind: number, payload: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(payload.byteLength + 1);
  frame[0] = kind;
  frame.set(payload, 1);
  return frame.buffer;
}

function toUint8Array(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return null;
}

const runtime = Object.freeze({
  createClient: (options: P2PClientOptions) => P2PClient.connect(options),
});

Object.assign(globalThis, { GSS0P2P: runtime });
globalThis.dispatchEvent(new Event('gss0:p2p-ready'));

declare global {
  var GSS0P2P: typeof runtime | undefined;
}
