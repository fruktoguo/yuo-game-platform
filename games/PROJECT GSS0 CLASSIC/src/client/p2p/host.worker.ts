import {
  MAX_EVENT_HISTORY,
  SIMULATION_HZ,
  SNAPSHOT_HZ,
} from '../../shared/constants';
import { decodePlayerMovementState, PLAYER_STATE_PROTOCOL_VERSION } from '../../shared/playerStateCodec';
import type {
  ActionResult,
  ArenaEvent,
  ArenaJoinData,
  AutopilotPreferences,
  FoodClaimPayload,
  PlayerCollisionClaim,
  UltraEffect,
  UltraProfileView,
} from '../../shared/protocol';
import { encodeUltraSnapshot, SNAPSHOT_PROTOCOL_VERSION } from '../../shared/snapshotCodec';
import type { ModuleId } from '../../shared/modules';
import { UltraWorld, type RunResult } from '../../server/UltraWorld';
import type { HitClaim, SkillSpawn, WorldCommit } from '../../shared/roomProtocol';

interface HostPeerIdentity {
  peerId: string;
  name: string;
  playerId: string;
  profile: UltraProfileView;
}

type HostRequestEvent =
  | 'ultra:resync'
  | 'ultra:spawn'
  | 'ultra:restart'
  | 'ultra:leave-run'
  | 'ultra:autopilot'
  | 'ultra:pause'
  | 'ultra:collision'
  | 'ultra:claim-food'
  | 'ultra:upgrade'
  | 'ultra:hit-claim';

type MainToWorkerMessage =
  | { type: 'join'; requestId: number; peer: HostPeerIdentity }
  | { type: 'request'; requestId: number; peerId: string; event: HostRequestEvent; args: unknown[] }
  | { type: 'input'; peerId: string; payload: ArrayBuffer }
  | { type: 'disconnect'; peerId: string }
  | { type: 'stop' };

type WorkerToMainMessage =
  | { type: 'response'; requestId: number; result: ActionResult<unknown> }
  | { type: 'event'; targetPeerId: string | null; event: string; payload: unknown; reliable: boolean }
  | { type: 'binary'; targetPeerId: string | null; event: 'ultra:snapshot'; payload: ArrayBuffer; reliable: boolean };

const SNAPSHOT_TICK_INTERVAL = Math.max(1, Math.round(SIMULATION_HZ / SNAPSHOT_HZ));
const COALESCED_SOUND_KINDS = new Set(['shoot', 'skill', 'frost', 'electric', 'hit', 'foodSpawn', 'bounce']);
const peers = new Map<string, HostPeerIdentity>();
const peersByEntity = new Map<number, string>();
const acceptedHitCommits = new Map<string, WorldCommit>();
const events: ArenaEvent[] = [];
let lastStepAt = performance.now();
let ticksSinceSnapshot = SNAPSHOT_TICK_INTERVAL - 1;
let simulationTimer: ReturnType<typeof setInterval> | null = null;

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<MainToWorkerMessage>) => void) | null;
  postMessage(message: WorkerToMainMessage, transfer?: Transferable[]): void;
  close(): void;
};

const world = new UltraWorld({
  callbacks: {
    onEffects: publishEffects,
    onFoods: (delta) => dispatch(null, 'ultra:foods', delta, true),
    onWorldObjects: (delta) => dispatch(null, 'ultra:world-objects', delta, true),
    onProjectiles: (projectileEvents) => dispatch(null, 'ultra:projectiles', projectileEvents, true),
    onPlayerHeadCollision: (event) => dispatch(null, 'ultra:player-head-collision', event, true),
    onSkillSpawn: publishSkillSpawn,
    onEvent: (event) => {
      pushLimited(events, event, MAX_EVENT_HISTORY);
      dispatch(null, 'ultra:event', event, true);
    },
    onRunEnded: publishRunEnded,
    onUpgrade: (entityId, offer) => {
      const peerId = peersByEntity.get(entityId);
      if (peerId) dispatch(peerId, 'ultra:upgrade', offer, true);
    },
  },
  clientAuthoritativeSkills: true,
});

startSimulation();

workerScope.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'stop') {
    stopSimulation();
    workerScope.close();
    return;
  }
  if (message.type === 'disconnect') {
    disconnectPeer(message.peerId);
    return;
  }
  if (message.type === 'input') {
    applyInput(message.peerId, message.payload);
    return;
  }
  if (message.type === 'join') {
    respond(message.requestId, joinPeer(message.peer));
    return;
  }
  void handleRequest(message).then((result) => respond(message.requestId, result));
};

function startSimulation(): void {
  if (simulationTimer) return;
  lastStepAt = performance.now();
  simulationTimer = setInterval(tick, 1_000 / SIMULATION_HZ);
}

function stopSimulation(): void {
  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = null;
}

function tick(): void {
  const tickStartedAt = performance.now();
  const delta = Math.min(0.05, Math.max(0, (tickStartedAt - lastStepAt) / 1_000));
  lastStepAt = tickStartedAt;
  world.step(delta, Date.now());
  ticksSinceSnapshot += 1;
  if (peers.size === 0 || ticksSinceSnapshot < SNAPSHOT_TICK_INTERVAL) return;
  ticksSinceSnapshot = 0;
  publishSnapshot(null, false);
}

function joinPeer(peer: HostPeerIdentity): ActionResult<ArenaJoinData> {
  if (!validPeer(peer)) return { ok: false, error: 'P2P 玩家资料无效' };
  const player = world.connectPlayer(peer.peerId, peer.name, Date.now(), peer.playerId);
  if (!player) return { ok: false, error: '房间人数已满' };
  peers.set(peer.peerId, peer);
  peersByEntity.set(player.entityId, peer.peerId);
  const snapshot = world.getSnapshot(Date.now(), false);
  const data: ArenaJoinData = {
    selfEntityId: player.entityId,
    snapshotProtocolVersion: SNAPSHOT_PROTOCOL_VERSION,
    playerStateProtocolVersion: PLAYER_STATE_PROTOCOL_VERSION,
    foodRevision: world.getFoodRevision(),
    profile: peer.profile,
    snapshot,
    projectiles: world.getProjectileStates(),
    roster: world.getRoster(),
    leaderboard: world.getLeaderboard(),
    messages: [],
    events: events.slice(-MAX_EVENT_HISTORY),
  };
  broadcastRoster();
  return { ok: true, data };
}

function disconnectPeer(peerId: string): void {
  if (!peers.delete(peerId)) return;
  world.disconnectPlayer(peerId);
  for (const [entityId, candidatePeerId] of peersByEntity) {
    if (candidatePeerId === peerId) peersByEntity.delete(entityId);
  }
  broadcastRoster();
}

function applyInput(peerId: string, payload: ArrayBuffer): void {
  if (!peers.has(peerId)) return;
  try {
    world.applyInput(peerId, decodePlayerMovementState(payload), Date.now());
  } catch {
    // Volatile state packets are discarded when incomplete or stale.
  }
}

async function handleRequest(message: Extract<MainToWorkerMessage, { type: 'request' }>): Promise<ActionResult<unknown>> {
  if (!peers.has(message.peerId)) return { ok: false, error: 'P2P 玩家尚未加入共享世界' };
  switch (message.event) {
    case 'ultra:resync':
      publishSnapshot(message.peerId, true);
      return { ok: true };
    case 'ultra:spawn': {
      const ok = world.spawn(message.peerId);
      if (ok) broadcastRoster();
      return ok ? { ok: true } : { ok: false, error: '当前无法开始行动' };
    }
    case 'ultra:restart': {
      const ok = world.restart(message.peerId);
      if (ok) broadcastRoster();
      return ok ? { ok: true } : { ok: false, error: '当前无法重新开始行动' };
    }
    case 'ultra:leave-run': {
      const ok = world.leaveRun(message.peerId);
      if (ok) broadcastRoster();
      return ok ? { ok: true } : { ok: false, error: '当前没有进行中的行动' };
    }
    case 'ultra:autopilot': {
      const preferences = message.args[0] as AutopilotPreferences;
      if (!preferences || typeof preferences.enabled !== 'boolean' || typeof preferences.autoSelectModules !== 'boolean' || typeof preferences.autoRestart !== 'boolean') {
        return { ok: false, error: '自动战斗设置无效' };
      }
      return world.setAutopilot(message.peerId, preferences.enabled, preferences.autoSelectModules, preferences.autoRestart)
        ? { ok: true }
        : { ok: false, error: '当前无法切换自动战斗' };
    }
    case 'ultra:pause': {
      const paused = message.args[0];
      if (typeof paused !== 'boolean') return { ok: false, error: '暂停状态无效' };
      const ok = world.setPaused(message.peerId, paused);
      if (ok) broadcastRoster();
      return ok ? { ok: true } : { ok: false, error: '当前无法切换暂停状态' };
    }
    case 'ultra:collision':
      return world.applyCollisionClaim(message.peerId, message.args[0] as PlayerCollisionClaim)
        ? { ok: true }
        : { ok: false, error: '碰撞事件无效' };
    case 'ultra:claim-food': {
      const payload = message.args[0] as FoodClaimPayload;
      if (!payload || !Array.isArray(payload.foodIds) || payload.foodIds.length === 0 || payload.foodIds.length > 32) {
        return { ok: false, error: '吃球确认无效' };
      }
      return { ok: true, data: { claimedFoodIds: world.claimFoods(message.peerId, [...new Set(payload.foodIds)]) } };
    }
    case 'ultra:upgrade': {
      const moduleId = message.args[0] as ModuleId;
      const ok = world.chooseUpgrade(message.peerId, moduleId);
      if (ok) broadcastRoster();
      return ok ? { ok: true } : { ok: false, error: '该机体不在当前选项中' };
    }
    case 'ultra:hit-claim': {
      const claim = message.args[0] as HitClaim;
      return applyHitClaim(message.peerId, claim);
    }
  }
}

function publishSkillSpawn(spawn: SkillSpawn): void {
  dispatch(spawn.ownerPeerId, 'ultra:skill-spawn', spawn, true);
}

function applyHitClaim(peerId: string, claim: HitClaim): ActionResult<WorldCommit> {
  if (!claim || claim.ownerPeerId !== peerId) return { ok: false, error: '命中归属无效' };
  const previous = acceptedHitCommits.get(claim.hitId);
  if (previous) {
    dispatch(null, 'ultra:world-commit', previous, true);
    return { ok: true, data: previous };
  }
  const commit = world.applyClientHitClaim(peerId, claim, Date.now());
  if (!commit) return { ok: false, error: '命中目标已经失效' };
  acceptedHitCommits.set(claim.hitId, commit);
  while (acceptedHitCommits.size > 4096) acceptedHitCommits.delete(acceptedHitCommits.keys().next().value!);
  dispatch(null, 'ultra:world-commit', commit, true);
  return { ok: true, data: commit };
}

function publishSnapshot(targetPeerId: string | null, reliable: boolean): void {
  const payload = encodeUltraSnapshot(targetPeerId ? world.getSnapshot(Date.now(), false) : world.getNetworkSnapshot(Date.now()));
  const copy = new Uint8Array(payload.byteLength);
  copy.set(payload);
  const transferred = copy.buffer;
  const message: WorkerToMainMessage = { type: 'binary', targetPeerId, event: 'ultra:snapshot', payload: transferred, reliable };
  workerScope.postMessage(message, [transferred]);
}

function publishEffects(items: UltraEffect[]): void {
  let sharedReliable: UltraEffect[] | null = null;
  let sharedVolatile: UltraEffect[] | null = null;
  const targeted = new Map<number, UltraEffect[]>();
  const sharedSoundKeys = new Set<string>();
  let sharedBounceSoundQueued = false;
  for (const effect of items) {
    if (effect.audienceEntityId !== undefined) {
      const existing = targeted.get(effect.audienceEntityId);
      if (existing) existing.push(effect);
      else targeted.set(effect.audienceEntityId, [effect]);
      continue;
    }
    if (effect.type === 'sound' && COALESCED_SOUND_KINDS.has(effect.kind)) {
      const key = `${effect.kind}:${effect.sourceEntityId ?? 0}`;
      if (sharedSoundKeys.has(key)) continue;
      sharedSoundKeys.add(key);
    }
    if (isDroppableSharedEffect(effect)) {
      if (effect.type === 'sound' && effect.kind === 'bounce') {
        if (sharedBounceSoundQueued) continue;
        sharedBounceSoundQueued = true;
      }
      (sharedVolatile ??= []).push(effect);
    } else {
      (sharedReliable ??= []).push(effect);
    }
  }
  if (sharedReliable) dispatch(null, 'ultra:effects', sharedReliable, true);
  if (sharedVolatile) dispatch(null, 'ultra:effects', sharedVolatile, false);
  for (const [entityId, effects] of targeted) {
    const peerId = peersByEntity.get(entityId);
    if (peerId) dispatch(peerId, 'ultra:effects', effects, true);
  }
}

function publishRunEnded(result: RunResult): void {
  dispatch(result.accountId, 'p2p:run-ended', {
    score: Math.max(0, Math.floor(result.score)),
    level: Math.max(0, Math.floor(result.level)),
    survivalTime: Math.max(0, result.survivalTime),
    kills: Math.max(0, Math.floor(result.kills)),
    botKills: Math.max(0, Math.floor(result.botKills)),
    pvpKills: Math.max(0, Math.floor(result.pvpKills)),
  }, true);
}

function broadcastRoster(): void {
  dispatch(null, 'ultra:roster', world.getRoster(), true);
}

function dispatch(targetPeerId: string | null, event: string, payload: unknown, reliable: boolean): void {
  workerScope.postMessage({ type: 'event', targetPeerId, event, payload, reliable });
}

function respond(requestId: number, result: ActionResult<unknown>): void {
  workerScope.postMessage({ type: 'response', requestId, result });
}

function validPeer(peer: HostPeerIdentity): boolean {
  return Boolean(
    peer
    && typeof peer.peerId === 'string'
    && peer.peerId.length > 0
    && peer.peerId.length <= 64
    && typeof peer.name === 'string'
    && typeof peer.playerId === 'string'
    && peer.profile
  );
}

function isDroppableSharedEffect(effect: UltraEffect): boolean {
  return effect.type === 'burst'
    || effect.type === 'ring'
    || effect.type === 'beam'
    || effect.type === 'lightning'
    || effect.type === 'text'
    || (effect.type === 'sound' && effect.kind === 'bounce');
}

function pushLimited<T>(target: T[], value: T, maximum: number): void {
  target.push(value);
  if (target.length > maximum) target.splice(0, target.length - maximum);
}
