import {
  ARENA_AREA_PER_LEVEL,
  ARENA_BASE_SIZE,
  ARENA_RESIZE_RATE,
  BOUNCE_LOCK_TIME,
  BOUNCE_SLOW_TIME,
  CANONICAL_CELL_SIZE,
  DISCONNECT_GRACE_MS,
  ENEMY_BASE_SPEED,
  ENEMY_BODY_RECONNECT_DURATION,
  ENEMY_HEAD_REFORM_DURATION,
  ENEMY_COLORS,
  ENEMY_DAMAGE_NUMBER_DURATION,
  ENEMY_FOOD_SEARCH_LIMIT,
  ENEMY_SPAWN_FORWARD_PATH_HALF_WIDTH,
  ENEMY_SPAWN_SAFETY_DISTANCE,
  ENEMY_WALL_AVOIDANCE_DISTANCE,
  ENEMY_SPAWN_WARNING_TIME,
  ENEMY_SPEED_MAX_MULTIPLIER,
  ENEMY_SPEED_PER_MINUTE,
  ENEMY_THINK_INTERVAL_MAX,
  ENEMY_THINK_INTERVAL_MIN,
  ENEMY_TURN_RATE_MAX,
  ENEMY_TURN_RATE_MIN,
  FOOD_COLORS,
  FOOD_WALL_MARGIN,
  FOODS_PER_PLAYER_PER_WAVE,
  GRID_SIZE,
  GROWTH_NODE_DELAY,
  GROWTH_PULSE_DURATION,
  experienceRequiredForLevel,
  KNOCKBACK_DECAY,
  KNOCKBACK_INITIAL_SPEED,
  LEVEL_UP_TRANSITION_DURATION,
  MAX_PLAYERS,
  MODULE_BLADE_ORBIT_SPEED,
  MULTIPLAYER_GHOST_SPEED,
  MULTIPLAYER_REVIVE_CONTACT_RANGE,
  MULTIPLAYER_REVIVE_HEALTH_RATIO,
  MULTIPLAYER_REVIVE_INVULNERABILITY_DURATION,
  NETWORK_COLLISION_CLAIM_COOLDOWN_MS,
  NETWORK_COLLISION_HISTORY_MS,
  NETWORK_HEAD_COLLISION_CONTACT_ALLOWANCE,
  NETWORK_HEAD_COLLISION_EVENT_GRACE_MS,
  NETWORK_HEAD_COLLISION_VALIDATION_TOLERANCE,
  PLAYER_BASE_SPEED,
  PLAYER_COLLISION_DAMAGE,
  PLAYER_COLORS,
  PLAYER_ENEMY_BODY_COLLISION_DAMAGE,
  PLAYER_HEALTH_REGEN_PER_SECOND,
  PLAYER_MAX_HEALTH,
  PLAYER_TURN_RATE,
  PLAYER_WALL_COLLISION_DAMAGE,
  ENEMY_COLLISION_DAMAGE,
  POISON_TICK_INTERVAL,
  PROJECTILE_SIZE_SCALE,
  PROJECTILE_SPEED_SCALE,
  RESPAWN_DELAY_MS,
  SNAKE_BODY_SIZE_SCALE,
  SNAKE_SEGMENT_SPACING,
  UPGRADE_INVULNERABILITY_DURATION,
  WAVE_BASE_INTERVAL,
} from '../shared/constants';
import { DESIGNER_BALANCE } from '../shared/designerConfig';
import { ENEMY_ARCHETYPES, ENEMY_ARCHETYPE_BY_ID, type EnemyArchetypeDefinition } from '../shared/enemyArchetypes';
import { isModuleId, MODULE_BY_ID, UPGRADE_MODULES, type ModuleId } from '../shared/modules';
import { MODULE_PROGRESSION } from '../shared/moduleProgression';
import type { PlayerMovementState } from '../shared/playerStateCodec';
import { chooseSerpentineSpawn } from '../shared/spawnPlanner';
import { enemyWaveDirector } from '../shared/waveDirector';
import type {
  ArenaEvent,
  EnemyArchetypeId,
  GridPoint,
  LeaderboardEntry,
  PendingSpawnView,
  PlayerCollisionClaim,
  PlayerHeadCollisionEvent,
  RosterPlayer,
  UltraEffect,
  UltraEffectAnchor,
  UltraEnemyView,
  UltraFeedbackKind,
  UltraFoodDelta,
  UltraFoodView,
  UltraHazardView,
  UltraPlayerView,
  UltraProjectileEvent,
  UltraProjectileState,
  UltraProjectileView,
  UltraSegment,
  UltraSnapshot,
  UltraWorldObjectDelta,
  UpgradeOffer,
} from '../shared/protocol';

const TAU = Math.PI * 2;
const ENEMY_HEAD_RADIUS_CELLS = 0.28 * SNAKE_BODY_SIZE_SCALE;
const SNAKE_BODY_CONTACT_RANGE = 0.42 * SNAKE_BODY_SIZE_SCALE;
const ENEMY_BODY_CONTACT_RANGE = 0.46 * SNAKE_BODY_SIZE_SCALE;
const PLAYER_SELF_COLLISION_RANGE = 0.5 * SNAKE_BODY_SIZE_SCALE;
const ENEMY_SELF_COLLISION_RANGE = 0.48 * SNAKE_BODY_SIZE_SCALE;
const TARGET_REQUIRED_MODULES = new Set<ModuleId>([
  'frost', 'prism', 'tesla', 'laser', 'missile', 'venom',
  'rail', 'ricochet', 'cluster', 'fan', 'gravity', 'needle', 'mortar', 'sweep',
  'sniper', 'flak', 'fork', 'anchor', 'flare', 'scatter', 'lance', 'execute',
  'crossfire', 'phasebolt',
]);
const ENEMY_PLAYER_BODY_AVOIDANCE = new Set<EnemyArchetypeId>(['courier', 'charger', 'cutter', 'coiler', 'warden']);
const PERSONAL_SOUND_KINDS = new Set<Extract<UltraEffect, { type: 'sound' }>['kind']>([
  'ui', 'start', 'pause', 'resume', 'level', 'levelCharge', 'select',
]);

interface PlayerEntity extends UltraPlayerView {
  accountId: string;
  playerId: string;
  autopilot: boolean;
  disconnectedAt: number | null;
  speed: number;
  slow: number;
  knockbackX: number;
  knockbackY: number;
  foodBoost: number;
  thornsCooldown: number;
  bloomCooldown: number;
  cacheKills: number;
  lastInputSequence: number;
  movementHistory: PlayerMovementSample[];
  recentPicks: ModuleId[];
  growthQueue: Array<{ color: string; special: boolean; spawnTailFood: boolean }>;
  upgradePending: boolean;
  upgradeRevealTimer: number;
  upgradeOffer: UpgradeOffer | null;
  sawCooldown: number;
}

interface EnemySegment extends GridPoint {
  reconnectElapsed: number;
  reconnectGap: number;
}

interface EnemyEntity extends UltraEnemyView {
  segments: EnemySegment[];
  birthLength: number;
  speed: number;
  turnRate: number;
  desiredAngle: number;
  targetFoodId: number | null;
  think: number;
  wobble: number;
  slow: number;
  knockbackX: number;
  knockbackY: number;
  poisonTimer: number;
  poisonColor: string | null;
  poisonOwnerEntityId: number | null;
  sawCooldownsByPlayer: Map<number, number>;
  collisionCooldown: number;
  projectileMinCol: number;
  projectileMaxCol: number;
  projectileMinRow: number;
  projectileMaxRow: number;
  dead: boolean;
}

interface PlayerMovementSample extends GridPoint {
  at: number;
  sequence: number;
  angle: number;
}

interface EnemyBodyBucketEntry {
  owner: EnemyEntity;
  segment: EnemySegment;
}

interface EnemyBodyBucket {
  entries: EnemyBodyBucketEntry[];
  count: number;
}

interface FoodEntity extends UltraFoodView {
  pullTimer: number;
  networkMoving: boolean;
}

interface PendingSpawn extends PendingSpawnView {
  totalLength: number;
  nextCell: GridPoint;
}

interface FoodInteractionProfile {
  player: PlayerEntity;
  tractor: number;
  tractorRange: number;
  tractorSpeed: number;
  headRange: number;
  bodyRange: number;
}

interface FoodPullCandidate {
  food: FoodEntity;
  profile: FoodInteractionProfile;
  distanceSquared: number;
}

interface FoodCollectionCandidate {
  food: FoodEntity;
  player: PlayerEntity;
  collector: GridPoint;
  distance: number;
}

interface EnemyTargetSelection {
  enemy: EnemyEntity;
  node: GridPoint;
  segmentIndex: number;
  distanceSquared: number;
}

interface TargetRef {
  id: number;
  segmentIndex: number;
}

interface ProjectileEntity extends UltraProjectileView {
  ownerEntityId: number;
  speed: number;
  life: number;
  pierce: number;
  bounces: number;
  blastRadius: number;
  slow: number;
  poison: number;
  permanentSlow: number;
  homing: number;
  target: TargetRef | null;
  hitNodes: Set<GridPoint>;
}

interface HazardEntity extends UltraHazardView {
  ownerEntityId: number;
  life: number;
  arm: number;
}

interface ShotOptions {
  speed?: number;
  color?: string;
  size?: number;
  pierce?: number;
  bounces?: number;
  blastRadius?: number;
  slow?: number;
  poison?: number;
  permanentSlow?: number;
  homing?: number;
  angleOffset?: number;
  blastRadiusCells?: number;
}

export interface RunResult {
  accountId: string;
  entityId: number;
  name: string;
  score: number;
  level: number;
  survivalTime: number;
  kills: number;
  botKills: number;
  pvpKills: number;
}

export interface UltraWorldCallbacks {
  onEffects?: (effects: UltraEffect[]) => void;
  onFoods?: (delta: UltraFoodDelta) => void;
  onWorldObjects?: (delta: UltraWorldObjectDelta) => void;
  onProjectiles?: (events: UltraProjectileEvent[]) => void;
  onUpgrade?: (entityId: number, offer: UpgradeOffer | null) => void;
  onRunEnded?: (result: RunResult) => void;
  onEvent?: (event: ArenaEvent) => void;
  onPlayerHeadCollision?: (event: PlayerHeadCollisionEvent) => void;
}

export interface UltraWorldOptions {
  random?: () => number;
  callbacks?: UltraWorldCallbacks;
}

export class UltraWorld {
  private readonly playersByAccount = new Map<string, PlayerEntity>();
  private readonly playersByEntity = new Map<number, PlayerEntity>();
  private readonly randomSource: () => number;
  private readonly callbacks: UltraWorldCallbacks;
  private foods: FoodEntity[] = [];
  private enemies: EnemyEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private hazards: HazardEntity[] = [];
  private pendingSpawns: PendingSpawn[] = [];
  private pendingEffects: UltraEffect[] = [];
  private pendingProjectileEvents: UltraProjectileEvent[] = [];
  private readonly foodsById = new Map<number, FoodEntity>();
  private readonly foodIndexesById = new Map<number, number>();
  private readonly pendingFoodUpserts = new Map<number, FoodEntity>();
  private readonly pendingFoodRemovals = new Set<number>();
  private readonly pendingHazardUpserts = new Map<number, HazardEntity>();
  private readonly pendingHazardRemovals = new Set<number>();
  private readonly pendingSpawnUpserts = new Map<number, PendingSpawn>();
  private readonly pendingSpawnRemovals = new Set<number>();
  private readonly networkMovingFoods: FoodEntity[] = [];
  private readonly networkHazards: UltraHazardView[] = [];
  private readonly networkPendingSpawns: PendingSpawnView[] = [];
  private readonly networkMovedFoods = new Set<FoodEntity>();
  private readonly foodSpatialBuckets = new Map<number, FoodEntity[]>();
  private readonly foodSpatialBucketPool: FoodEntity[][] = [];
  private pulledFoods = new Set<FoodEntity>();
  private nextPulledFoods = new Set<FoodEntity>();
  private spawnOccupiedCells: Set<string> | null = null;
  private readonly projectileTargetsById = new Map<number, EnemyEntity>();
  private readonly enemyBodyBuckets = new Map<number, EnemyBodyBucket>();
  private readonly enemyBodyBucketPool: EnemyBodyBucket[] = [];
  private readonly enemyFoodVisitStamps = new Map<number, number>();
  private readonly enemyMovementStart: GridPoint = { col: 0, row: 0 };
  private readonly enemyMovementEnd: GridPoint = { col: 0, row: 0 };
  private readonly projectileMovementStart: GridPoint = { col: 0, row: 0 };
  private readonly projectileMovementEnd: GridPoint = { col: 0, row: 0 };
  private readonly recentPlayerHeadCollisionPairs = new Map<string, { eventId: string; at: number }>();
  private readonly recentPlayerHeadCollisionEvents = new Map<string, number>();
  private readonly stepAlivePlayers: PlayerEntity[] = [];
  private readonly stepPresentPlayers: PlayerEntity[] = [];
  private readonly stepLivingPlayers: PlayerEntity[] = [];
  private readonly stepMovingPlayers: PlayerEntity[] = [];
  private readonly stepActivePlayers: PlayerEntity[] = [];
  private readonly stepCollisionPlayers: PlayerEntity[] = [];
  private readonly networkPlayers: PlayerEntity[] = [];
  private readonly networkProjectiles: UltraProjectileView[] = [];
  private readonly foodInteractionProfiles: FoodInteractionProfile[] = [];
  private readonly tractorFoodProfiles: FoodInteractionProfile[] = [];
  private readonly automaticFoodProfiles: FoodInteractionProfile[] = [];
  private readonly foodPullCandidates = new Map<number, FoodPullCandidate>();
  private readonly foodPullCandidatePool: FoodPullCandidate[] = [];
  private readonly foodCollectionCandidates = new Map<number, FoodCollectionCandidate>();
  private readonly foodCollectionCandidatePool: FoodCollectionCandidate[] = [];
  private readonly orderedFoodCollectionCandidates: FoodCollectionCandidate[] = [];
  private networkSnapshotCache: UltraSnapshot | null = null;
  private enemyWallDamageMultiplier = 1;
  private enemyWallKnockbackMultiplier = 1;
  private enemyFoodVisitToken = 0;
  private tick = 0;
  private gameTime = 0;
  private waveTimer = 0;
  private waveCount = 0;
  private arenaSize = ARENA_BASE_SIZE;
  private nextEntityId = 1;
  private nextEnemyId = 1;
  private nextFoodId = 1;
  private nextProjectileId = 1;
  private nextHazardId = 1;
  private nextEffectId = 1;
  private foodRevision = 0;
  private foodResetPending = false;
  private worldObjectRevision = 0;
  private worldObjectResetPending = false;
  private foodSpatialDirty = true;
  private staleFoodSpatialEntries = 0;
  private now = Date.now();

  constructor(options: UltraWorldOptions = {}) {
    this.randomSource = options.random ?? Math.random;
    this.callbacks = options.callbacks ?? {};
  }

  connectPlayer(accountId: string, name: string, now = Date.now(), playerId = name): RosterPlayer | null {
    const existing = this.playersByAccount.get(accountId);
    if (existing) {
      existing.connected = true;
      existing.disconnectedAt = null;
      existing.paused = false;
      existing.name = normalizeName(name);
      existing.playerId = normalizePlayerId(playerId);
      existing.lastInputSequence = -1;
      existing.movementHistory.length = 0;
      this.clearPlayerHeadCollisionRecords(existing.entityId);
      this.recordPlayerMovement(existing, now);
      return toRosterPlayer(existing);
    }
    if (this.playersByAccount.size >= MAX_PLAYERS) return null;
    const player = this.createPlayer(accountId, name, playerId);
    this.playersByAccount.set(accountId, player);
    this.playersByEntity.set(player.entityId, player);
    this.emitEvent('join', `${player.name} 接入行动区域`, now, player.entityId);
    return toRosterPlayer(player);
  }

  disconnectPlayer(accountId: string, now = Date.now()): void {
    const player = this.playersByAccount.get(accountId);
    if (!player) return;
    player.connected = false;
    player.disconnectedAt = now;
    player.paused = true;
    player.knockbackX = 0;
    player.knockbackY = 0;
  }

  spawn(accountId: string, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected || player.alive || (player.respawnAt !== null && player.respawnAt > now)) return false;
    if (this.alivePlayers().length === 0) this.resetSharedWorld();
    const spawn = this.findPlayerSpawn();
    this.resetPlayerRun(player, spawn);
    this.recordPlayerMovement(player, now);
    this.now = now;
    this.effectSound('start', player.entityId);
    return true;
  }

  restart(accountId: string, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected || !player.alive) return false;
    this.callbacks.onRunEnded?.(this.createRunResult(player));
    player.alive = false;
    player.segments = [];
    player.growth = null;
    player.growthQueue = [];
    player.upgradeOffer = null;
    if (this.alivePlayers().length === 0) this.resetSharedWorld();
    this.resetPlayerRun(player, this.findPlayerSpawn());
    this.recordPlayerMovement(player, now);
    this.effectSound('start', player.entityId);
    this.now = now;
    return true;
  }

  leaveRun(accountId: string, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected || !player.alive) return false;
    const result = this.createRunResult(player);
    player.alive = false;
    player.ghost = false;
    player.paused = false;
    player.choosingUpgrade = false;
    player.upgradeOffer = null;
    player.segments = [];
    player.growth = null;
    player.growthQueue = [];
    player.respawnAt = null;
    player.autopilot = false;
    this.callbacks.onRunEnded?.(result);
    if (this.alivePlayers().length === 0) this.resetSharedWorld();
    this.now = now;
    return true;
  }

  setAutopilot(accountId: string, enabled: boolean): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected) return false;
    player.autopilot = enabled;
    if (enabled && player.choosingUpgrade && player.upgradeOffer) {
      const automaticOptions = this.chooseUpgradeOptions(player, true);
      const options = automaticOptions.length > 0 ? automaticOptions : player.upgradeOffer.options;
      this.applyUpgrade(player, options[Math.floor(this.random() * options.length)], this.now);
    }
    return true;
  }

  setPaused(accountId: string, paused: boolean): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.alive || player.choosingUpgrade) return false;
    player.paused = paused;
    if (paused) {
      player.desiredAngle = player.angle;
      player.knockbackX = 0;
      player.knockbackY = 0;
    }
    return true;
  }

  applyInput(accountId: string, payload: PlayerMovementState, now = this.now): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.alive || player.autopilot || player.paused || player.choosingUpgrade || !payload || typeof payload !== 'object') return false;
    if (!Number.isSafeInteger(payload.sequence) || payload.sequence <= player.lastInputSequence) return false;
    const values = [
      payload.col,
      payload.row,
      payload.angle,
      payload.desiredAngle,
      payload.speed,
      payload.knockbackX,
      payload.knockbackY,
      payload.collisionCooldown,
      payload.slow,
    ];
    if (values.some((value) => !Number.isFinite(value))) return false;
    if (Math.abs(payload.angle) > Math.PI * 8 || Math.abs(payload.desiredAngle) > Math.PI * 8) return false;
    if (payload.speed < 0 || payload.speed > 40 || Math.abs(payload.knockbackX) > 40 || Math.abs(payload.knockbackY) > 40) return false;
    if (payload.collisionCooldown < 0 || payload.collisionCooldown > 10 || payload.slow < 0 || payload.slow > 10) return false;
    if (payload.segments.length !== player.segments.length) return false;
    const minimum = this.arenaMinimum() - 4;
    const maximum = this.arenaMaximum() + 4;
    if (payload.col < minimum || payload.col > maximum || payload.row < minimum || payload.row > maximum) return false;
    for (const segment of payload.segments) {
      if (
        !Number.isFinite(segment.col)
        || !Number.isFinite(segment.row)
        || !Number.isFinite(segment.angle)
        || segment.col < minimum
        || segment.col > maximum
        || segment.row < minimum
        || segment.row > maximum
        || Math.abs(segment.angle) > Math.PI * 8
      ) return false;
    }
    player.lastInputSequence = payload.sequence;
    player.col = payload.col;
    player.row = payload.row;
    player.angle = normalizeAngle(payload.angle);
    player.desiredAngle = normalizeAngle(payload.desiredAngle);
    player.speed = player.ghost ? MULTIPLAYER_GHOST_SPEED : payload.speed;
    player.knockbackX = player.ghost ? 0 : payload.knockbackX;
    player.knockbackY = player.ghost ? 0 : payload.knockbackY;
    player.collisionCooldown = player.ghost ? 0 : payload.collisionCooldown;
    player.slow = player.ghost ? 0 : payload.slow;
    for (let index = 0; index < player.segments.length; index += 1) {
      const source = payload.segments[index];
      const segment = player.segments[index];
      segment.col = source.col;
      segment.row = source.row;
      segment.angle = normalizeAngle(source.angle);
    }
    this.recordPlayerMovement(player, now);
    return true;
  }

  applyCollisionClaim(accountId: string, claim: PlayerCollisionClaim, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.alive || player.ghost || player.autopilot || !claim || typeof claim !== 'object') return false;
    if (claim.kind === 'wall') {
      if (!Number.isFinite(claim.normalCol) || !Number.isFinite(claim.normalRow)) return false;
      const nearWall = (
        (claim.normalCol > 0 && player.col <= this.arenaMinimum() + 1.5)
        || (claim.normalCol < 0 && player.col >= this.arenaMaximum() - 1.5)
        || (claim.normalRow > 0 && player.row <= this.arenaMinimum() + 1.5)
        || (claim.normalRow < 0 && player.row >= this.arenaMaximum() - 1.5)
      );
      if (!nearWall) return false;
      this.triggerCollisionEcho(player);
      this.damagePlayer(player, PLAYER_WALL_COLLISION_DAMAGE, now, '撞上墙壁');
      return true;
    }
    if (!Number.isSafeInteger(claim.targetId) || claim.targetId <= 0) return false;
    if (claim.kind === 'player-head') return this.applyPlayerHeadCollisionClaim(player, claim, now);
    if (claim.kind === 'mine') {
      const hazard = this.hazards.find((item) => item.id === claim.targetId && item.ownerEntityId === player.entityId && item.kind === 'mine');
      if (!hazard || hazard.life <= 0 || hazard.arm > 0 || distanceSquared(player, hazard) > 9) return false;
      this.triggerMine(hazard, player, false);
      return true;
    }
    const enemy = this.enemies.find((item) => item.id === claim.targetId && !item.dead);
    if (!enemy) return false;
    if (claim.kind === 'enemy-head' || claim.kind === 'enemy-protected') {
      const nearPlayer = distanceSquared(player, enemy) <= 9 || bodyConnectionContact(enemy, player, 3) !== null;
      if (!Number.isFinite(claim.normalCol) || !Number.isFinite(claim.normalRow) || !nearPlayer) return false;
      if (claim.kind === 'enemy-head') {
        this.applyPlayerCollisionAttack(player, enemy, enemy, -1, true);
      }
      if (!enemy.dead) this.bounceEntity(enemy, -claim.normalCol, -claim.normalRow, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_PROGRESSION.effects.momentumKnockbackBonus(this.moduleCount(player, 'momentum')));
      return true;
    }
    if (claim.kind === 'enemy-body') {
      const segment = enemy.segments[claim.segmentIndex];
      if (!segment || distanceSquared(player, segment) > 9) return false;
      const defended = this.consumeDefense(player);
      this.applyPlayerCollisionAttack(player, enemy, segment, claim.segmentIndex, false);
      if (!defended) this.damagePlayer(player, PLAYER_ENEMY_BODY_COLLISION_DAMAGE, now, '被敌蛇重创');
      return true;
    }
    if (claim.kind !== 'enemy-hit-body') return false;
    const bodySegment = player.segments[claim.segmentIndex];
    if (!bodySegment) return false;
    const previousSegment = claim.segmentIndex > 0 ? player.segments[claim.segmentIndex - 1] : player;
    const collisionPoint = closestPointOnGridSegment(enemy, previousSegment, bodySegment);
    if (distanceSquared(enemy, collisionPoint) > 9) return false;
    const thorns = this.moduleCount(player, 'thorns');
    const thornsReady = thorns > 0 && player.thornsCooldown <= 0;
    this.killEnemy(enemy, player);
    if (thornsReady) {
      this.triggerBodyIntercept(player, collisionPoint, enemy);
      player.thornsCooldown = this.activeModuleCooldown(player, 'thorns', thorns);
    }
    return true;
  }

  private applyPlayerHeadCollisionClaim(
    source: PlayerEntity,
    claim: Extract<PlayerCollisionClaim, { kind: 'player-head' }>,
    now: number,
  ): boolean {
    const target = this.playersByEntity.get(claim.targetId);
    if (
      !target?.alive
      || target.ghost
      || target === source
      || this.isPlayerProtected(source)
      || this.isPlayerProtected(target)
      || !Number.isSafeInteger(claim.sequence)
      || claim.sequence < 0
    ) return false;
    const eventId = `${source.entityId}:${claim.sequence}`;
    this.prunePlayerHeadCollisionRecords(now);
    if (this.recentPlayerHeadCollisionEvents.has(eventId)) return true;
    const pairKey = source.entityId < target.entityId
      ? `${source.entityId}:${target.entityId}`
      : `${target.entityId}:${source.entityId}`;
    const recentPair = this.recentPlayerHeadCollisionPairs.get(pairKey);
    if (recentPair && now - recentPair.at < NETWORK_COLLISION_CLAIM_COOLDOWN_MS) {
      this.recentPlayerHeadCollisionEvents.set(eventId, now);
      return true;
    }
    const validated = this.validatePlayerHeadCollision(source, target, claim, now);
    if (!validated) return false;
    const event: PlayerHeadCollisionEvent = {
      id: eventId,
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      sequence: claim.sequence,
      observedAt: claim.observedAt,
      serverTime: now,
      sourceCol: claim.sourceCol,
      sourceRow: claim.sourceRow,
      targetCol: claim.targetCol,
      targetRow: claim.targetRow,
      normalCol: validated.normalCol,
      normalRow: validated.normalRow,
    };
    this.recentPlayerHeadCollisionPairs.set(pairKey, { eventId, at: now });
    this.recentPlayerHeadCollisionEvents.set(eventId, now);
    if (target.autopilot) {
      this.bounceEntity(target, -event.normalCol, -event.normalRow, PLAYER_COLORS[target.colorIndex], SNAKE_SEGMENT_SPACING, 1, true);
    }
    this.callbacks.onPlayerHeadCollision?.(event);
    return true;
  }

  private validatePlayerHeadCollision(
    source: PlayerEntity,
    target: PlayerEntity,
    claim: Extract<PlayerCollisionClaim, { kind: 'player-head' }>,
    now: number,
  ): { normalCol: number; normalRow: number } | null {
    const values = [
      claim.observedAt,
      claim.sourceCol,
      claim.sourceRow,
      claim.targetCol,
      claim.targetRow,
      claim.normalCol,
      claim.normalRow,
    ];
    if (values.some((value) => !Number.isFinite(value))) return null;
    if (
      claim.observedAt < now - NETWORK_COLLISION_HISTORY_MS
      || claim.observedAt > now + NETWORK_HEAD_COLLISION_EVENT_GRACE_MS
    ) return null;
    const sourceSample = source.movementHistory.find((sample) => sample.sequence === claim.sequence);
    if (!sourceSample) return null;
    let targetSample: PlayerMovementSample | null = null;
    let targetSampleAge = Number.POSITIVE_INFINITY;
    for (const sample of target.movementHistory) {
      const age = Math.abs(sample.at - claim.observedAt);
      if (age >= targetSampleAge) continue;
      targetSample = sample;
      targetSampleAge = age;
    }
    if (!targetSample) return null;
    const sourceError = Math.hypot(sourceSample.col - claim.sourceCol, sourceSample.row - claim.sourceRow);
    const targetTolerance = NETWORK_HEAD_COLLISION_VALIDATION_TOLERANCE + target.speed * targetSampleAge / 1000;
    const targetError = Math.hypot(targetSample.col - claim.targetCol, targetSample.row - claim.targetRow);
    if (sourceError > NETWORK_HEAD_COLLISION_VALIDATION_TOLERANCE || targetError > targetTolerance) return null;
    const relativeCol = claim.sourceCol - claim.targetCol;
    const relativeRow = claim.sourceRow - claim.targetRow;
    const contactDistance = Math.hypot(relativeCol, relativeRow);
    if (contactDistance > this.playerHeadRadiusCells() * 2 + NETWORK_HEAD_COLLISION_CONTACT_ALLOWANCE) return null;
    if (contactDistance >= 0.001) {
      return { normalCol: relativeCol / contactDistance, normalRow: relativeRow / contactDistance };
    }
    const normalLength = Math.hypot(claim.normalCol, claim.normalRow);
    if (normalLength < 0.001) return null;
    return { normalCol: claim.normalCol / normalLength, normalRow: claim.normalRow / normalLength };
  }

  private recordPlayerMovement(player: PlayerEntity, at: number): void {
    if (!Number.isFinite(at)) return;
    player.movementHistory.push({
      at,
      sequence: player.lastInputSequence,
      col: player.col,
      row: player.row,
      angle: player.angle,
    });
    const cutoff = at - NETWORK_COLLISION_HISTORY_MS;
    let removeCount = 0;
    while (removeCount < player.movementHistory.length - 1 && player.movementHistory[removeCount].at < cutoff) removeCount += 1;
    if (removeCount > 0) player.movementHistory.splice(0, removeCount);
  }

  private prunePlayerHeadCollisionRecords(now: number): void {
    for (const [key, collision] of this.recentPlayerHeadCollisionPairs) {
      if (now - collision.at > NETWORK_COLLISION_CLAIM_COOLDOWN_MS * 4) this.recentPlayerHeadCollisionPairs.delete(key);
    }
    const eventRetention = Math.max(NETWORK_COLLISION_HISTORY_MS, NETWORK_COLLISION_CLAIM_COOLDOWN_MS * 8);
    for (const [id, at] of this.recentPlayerHeadCollisionEvents) {
      if (now - at > eventRetention) this.recentPlayerHeadCollisionEvents.delete(id);
    }
  }

  private publishAuthoritativePlayerHeadCollision(
    source: PlayerEntity,
    target: PlayerEntity,
    normal: GridPoint,
    now: number,
  ): void {
    this.prunePlayerHeadCollisionRecords(now);
    const pairKey = source.entityId < target.entityId
      ? `${source.entityId}:${target.entityId}`
      : `${target.entityId}:${source.entityId}`;
    const recentPair = this.recentPlayerHeadCollisionPairs.get(pairKey);
    if (recentPair && now - recentPair.at < NETWORK_COLLISION_CLAIM_COOLDOWN_MS) return;
    const normalLength = Math.hypot(normal.col, normal.row);
    if (normalLength < 0.001) return;
    const eventId = `server:${this.tick}:${source.entityId}:${target.entityId}`;
    const event: PlayerHeadCollisionEvent = {
      id: eventId,
      sourceEntityId: source.entityId,
      targetEntityId: target.entityId,
      sequence: this.tick,
      observedAt: now,
      serverTime: now,
      sourceCol: source.col,
      sourceRow: source.row,
      targetCol: target.col,
      targetRow: target.row,
      normalCol: normal.col / normalLength,
      normalRow: normal.row / normalLength,
    };
    this.recentPlayerHeadCollisionPairs.set(pairKey, { eventId, at: now });
    this.recentPlayerHeadCollisionEvents.set(eventId, now);
    this.callbacks.onPlayerHeadCollision?.(event);
  }

  claimFoods(accountId: string, foodIds: readonly number[]): number[] {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected || !player.alive || player.ghost || player.paused || player.choosingUpgrade || player.upgradePending) return [];
    const claimedFoodIds: number[] = [];
    const latencyAllowance = Math.min(1.25, Math.max(0.35, player.speed * 0.12));
    this.ensureFoodIndexes();
    for (const foodId of foodIds) {
      if (player.upgradePending) break;
      const foodIndex = this.foodIndexesById.get(foodId);
      if (foodIndex === undefined) continue;
      const food = this.foods[foodIndex];
      const contact = this.findFoodCollector(player, food, latencyAllowance);
      if (!contact) continue;
      this.collectFood(player, foodIndex, contact.collector);
      claimedFoodIds.push(foodId);
    }
    return claimedFoodIds;
  }

  chooseUpgrade(accountId: string, moduleId: ModuleId, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    const offer = player?.upgradeOffer;
    if (!player?.alive || player.ghost || !player.choosingUpgrade || !offer || !isModuleId(moduleId) || !offer.options.includes(moduleId)) return false;
    this.applyUpgrade(player, moduleId, now);
    return true;
  }

  step(deltaSeconds: number, now = Date.now()): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    this.spawnOccupiedCells = null;
    this.tick = (this.tick + 1) >>> 0;
    this.now = now;
    this.removeExpiredPlayers(now);
    this.respawnAutopilotPlayers(now);
    const alive = this.stepAlivePlayers;
    const present = this.stepPresentPlayers;
    const living = this.stepLivingPlayers;
    const moving = this.stepMovingPlayers;
    const active = this.stepActivePlayers;
    alive.length = 0;
    present.length = 0;
    living.length = 0;
    moving.length = 0;
    active.length = 0;
    for (const player of this.playersByEntity.values()) {
      if (!player.alive) continue;
      alive.push(player);
      if (!player.connected) continue;
      present.push(player);
      if (!player.ghost) living.push(player);
      if (!player.paused && !player.choosingUpgrade) {
        moving.push(player);
        if (!player.ghost) active.push(player);
      }
    }
    this.updateArenaSize(delta, present);
    if (alive.length === 0) {
      this.flushOutputs();
      return;
    }

    if (this.endRunsWhenAllPresentPlayersAreGhosts(now, present)) {
      this.flushOutputs();
      return;
    }

    if (moving.length === 0) {
      this.flushOutputs();
      return;
    }

    const worldDelta = delta;
    this.gameTime += worldDelta;
    for (const player of moving) player.survivalTime += worldDelta;
    for (const player of active) {
      player.score += worldDelta * (3 + player.level * 0.35);
      this.updatePlayerGrowth(player, worldDelta, delta, now);
      this.updatePlayerTimers(player, worldDelta);
    }
    active.length = 0;
    living.length = 0;
    for (const player of present) {
      if (player.ghost) continue;
      living.push(player);
      if (!player.paused && !player.choosingUpgrade) active.push(player);
    }
    if (this.endRunsWhenAllPresentPlayersAreGhosts(now, present)) {
      this.flushOutputs();
      return;
    }

    for (const player of moving) {
      if (!player.autopilot || player.collisionCooldown > 0) continue;
      player.desiredAngle = player.ghost ? this.ghostAutopilotAngle(player, living) : this.autopilotAngle(player, present);
    }
    for (const player of moving) this.movePlayer(player, worldDelta);
    for (const player of moving) this.recordPlayerMovement(player, now);
    if (this.reviveGhostPlayers(now, present)) {
      living.length = 0;
      active.length = 0;
      for (const player of present) {
        if (player.ghost) continue;
        living.push(player);
        if (!player.paused && !player.choosingUpgrade) active.push(player);
      }
    }
    if (active.length === 0) {
      this.flushOutputs();
      return;
    }

    this.updateEnemySpawnWarnings(worldDelta);
    this.updateSpawns(worldDelta, living, active);
    const wallbreaker = this.maximumModuleCount('wallbreaker', living);
    this.enemyWallDamageMultiplier = 1 + MODULE_PROGRESSION.effects.enemyWallDamageBonus(wallbreaker);
    this.enemyWallKnockbackMultiplier = 1 + MODULE_PROGRESSION.effects.enemyWallKnockbackBonus(wallbreaker);
    this.updateFood(worldDelta, active);
    for (const player of active) {
      this.updateModules(player, worldDelta);
    }
    this.updateTargetStatuses(worldDelta);
    this.ensureFoodSpatialBuckets();
    this.updateEnemies(worldDelta, active, living);
    this.spawnOccupiedCells = null;
    this.updateProjectiles(worldDelta);
    this.updateHazards(worldDelta);
    this.checkCollisions(now, active, living);
    if (this.endRunsWhenAllPresentPlayersAreGhosts(now, present)) {
      this.flushOutputs();
      return;
    }
    retainInPlace(this.enemies, (enemy) => !enemy.dead);
    retainInPlace(this.projectiles, (projectile) => {
      const alive = projectile.life > 0 && this.isProjectileInside(projectile);
      if (!alive) {
        this.pendingProjectileEvents.push({ type: 'destroy', id: projectile.id, col: projectile.col, row: projectile.row });
      }
      return alive;
    });
    retainInPlace(this.hazards, (hazard) => {
      if (hazard.life > 0) return true;
      this.pendingHazardUpserts.delete(hazard.id);
      this.pendingHazardRemovals.add(hazard.id);
      return false;
    });
    this.flushOutputs();
  }

  getSnapshot(now = Date.now(), includeProjectiles = true): UltraSnapshot {
    return {
      tick: this.tick,
      serverTime: now,
      gameTime: this.gameTime,
      waveCount: this.waveCount,
      waveTimer: Math.max(0, this.waveTimer / this.waveCountdownRate()),
      threatLevel: this.threatLevel(),
      arenaSize: this.arenaSize,
      worldObjectRevision: this.worldObjectRevision,
      worldObjectsComplete: true,
      players: [...this.playersByEntity.values()].map(toPlayerView),
      enemies: this.enemies.map(toEnemyView),
      foods: this.foods.map(({ pullTimer: _pullTimer, ...food }) => ({ ...food })),
      projectiles: includeProjectiles ? this.projectiles.map(toProjectileView) : [],
      hazards: this.hazards.map(toHazardView),
      pendingSpawns: this.pendingSpawns.map(toPendingSpawnView),
    };
  }

  getNetworkSnapshot(now = Date.now()): UltraSnapshot {
    // Encoding is synchronous, so the broadcaster can safely borrow live entity arrays without cloning them.
    this.networkPlayers.length = 0;
    for (const player of this.playersByEntity.values()) this.networkPlayers.push(player);
    this.networkMovingFoods.length = 0;
    for (const food of this.pulledFoods) {
      if (this.foodsById.get(food.id) === food) this.networkMovingFoods.push(food);
    }
    for (const food of this.networkMovedFoods) {
      if (!food.isPulled && this.foodsById.get(food.id) === food) this.networkMovingFoods.push(food);
      food.networkMoving = false;
    }
    this.networkMovedFoods.clear();
    const snapshot = this.networkSnapshotCache ??= {
      tick: 0,
      serverTime: 0,
      gameTime: 0,
      waveCount: 0,
      waveTimer: 0,
      threatLevel: 0,
      arenaSize: ARENA_BASE_SIZE,
      worldObjectRevision: 0,
      worldObjectsComplete: false,
      players: this.networkPlayers,
      enemies: this.enemies,
      foods: this.networkMovingFoods,
      projectiles: this.networkProjectiles,
      hazards: this.networkHazards,
      pendingSpawns: this.networkPendingSpawns,
    };
    snapshot.tick = this.tick;
    snapshot.serverTime = now;
    snapshot.gameTime = this.gameTime;
    snapshot.waveCount = this.waveCount;
    snapshot.waveTimer = Math.max(0, this.waveTimer / this.waveCountdownRate());
    snapshot.threatLevel = this.threatLevel();
    snapshot.arenaSize = this.arenaSize;
    snapshot.worldObjectRevision = this.worldObjectRevision;
    snapshot.worldObjectsComplete = false;
    snapshot.enemies = this.enemies;
    snapshot.foods = this.networkMovingFoods;
    snapshot.hazards = this.networkHazards;
    snapshot.pendingSpawns = this.networkPendingSpawns;
    return snapshot;
  }

  getProjectileStates(): UltraProjectileState[] {
    return this.projectiles.map(toProjectileState);
  }

  getRoster(): RosterPlayer[] {
    return [...this.playersByEntity.values()].map(toRosterPlayer);
  }

  getLeaderboard(): LeaderboardEntry[] {
    return [...this.playersByEntity.values()]
      .filter((player) => player.alive)
      .sort((left, right) => right.score - left.score || right.kills - left.kills || right.level - left.level)
      .slice(0, 12)
      .map((player) => ({
        entityId: player.entityId,
        name: player.name,
        playerId: player.playerId,
        colorIndex: player.colorIndex,
        score: Math.floor(player.score),
        kills: player.kills,
        level: player.level,
        length: player.segments.length + 1,
      }));
  }

  get onlineCount(): number {
    let count = 0;
    for (const player of this.playersByEntity.values()) if (player.connected) count += 1;
    return count;
  }

  get aliveCount(): number {
    let count = 0;
    for (const player of this.playersByEntity.values()) if (player.alive && !player.ghost && player.connected) count += 1;
    return count;
  }

  get enemyCount(): number {
    return this.enemies.length;
  }

  get currentTick(): number {
    return this.tick;
  }

  getFoodRevision(): number {
    return this.foodRevision;
  }

  private createPlayer(accountId: string, name: string, playerId: string): PlayerEntity {
    const entityId = this.allocatePlayerId();
    return {
      entityId,
      accountId,
      playerId: normalizePlayerId(playerId),
      autopilot: false,
      name: normalizeName(name),
      colorIndex: this.choosePlayerColor(),
      connected: true,
      disconnectedAt: null,
      alive: false,
      ghost: false,
      paused: false,
      choosingUpgrade: false,
      col: GRID_SIZE / 2,
      row: GRID_SIZE / 2,
      angle: 0,
      desiredAngle: 0,
      speed: PLAYER_BASE_SPEED,
      invulnerable: 0,
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      shieldCharges: 0,
      slow: 0,
      collisionCooldown: 0,
      knockbackX: 0,
      knockbackY: 0,
      foodBoost: 0,
      thornsCooldown: 0,
      bloomCooldown: 0,
      cacheKills: 0,
      lastInputSequence: -1,
      movementHistory: [],
      score: 0,
      kills: 0,
      botKills: 0,
      pvpKills: 0,
      survivalTime: 0,
      level: 0,
      xp: 0,
      xpNeeded: experienceRequiredForLevel(0),
      respawnAt: null,
      segments: [],
      recentPicks: [],
      growth: null,
      growthQueue: [],
      upgradePending: false,
      upgradeRevealTimer: 0,
      upgradeOffer: null,
      sawCooldown: 0,
    };
  }

  private resetPlayerRun(player: PlayerEntity, spawn: GridPoint): void {
    player.alive = true;
    player.ghost = false;
    player.paused = false;
    player.choosingUpgrade = false;
    player.col = spawn.col;
    player.row = spawn.row;
    player.angle = 0;
    player.desiredAngle = 0;
    player.speed = PLAYER_BASE_SPEED;
    player.invulnerable = 0;
    player.health = PLAYER_MAX_HEALTH;
    player.maxHealth = PLAYER_MAX_HEALTH;
    player.shieldCharges = 0;
    player.slow = 0;
    player.collisionCooldown = 0;
    player.knockbackX = 0;
    player.knockbackY = 0;
    player.foodBoost = 0;
    player.thornsCooldown = 0;
    player.bloomCooldown = 0;
    player.cacheKills = 0;
    player.lastInputSequence = -1;
    player.movementHistory.length = 0;
    this.clearPlayerHeadCollisionRecords(player.entityId);
    player.score = 0;
    player.kills = 0;
    player.botKills = 0;
    player.pvpKills = 0;
    player.survivalTime = 0;
    player.level = 0;
    player.xp = 0;
    player.xpNeeded = experienceRequiredForLevel(0);
    player.respawnAt = null;
    player.segments = [];
    player.recentPicks = [];
    player.growth = null;
    player.growthQueue = [];
    player.upgradePending = false;
    player.upgradeRevealTimer = 0;
    player.upgradeOffer = null;
    player.sawCooldown = 0;
  }

  private resetSharedWorld(): void {
    this.gameTime = 0;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.arenaSize = ARENA_BASE_SIZE;
    this.nextEnemyId = 1;
    this.resetFoodState();
    this.enemies = [];
    for (const projectile of this.projectiles) {
      this.pendingProjectileEvents.push({ type: 'destroy', id: projectile.id, col: projectile.col, row: projectile.row });
    }
    this.projectiles = [];
    this.resetWorldObjectState();
    this.pendingEffects = [];
    this.recentPlayerHeadCollisionPairs.clear();
    this.recentPlayerHeadCollisionEvents.clear();
  }

  private clearPlayerHeadCollisionRecords(entityId: number): void {
    const prefix = `${entityId}:`;
    const suffix = `:${entityId}`;
    for (const key of this.recentPlayerHeadCollisionPairs.keys()) {
      if (key.startsWith(prefix) || key.endsWith(suffix)) this.recentPlayerHeadCollisionPairs.delete(key);
    }
    for (const id of this.recentPlayerHeadCollisionEvents.keys()) {
      if (id.startsWith(prefix)) this.recentPlayerHeadCollisionEvents.delete(id);
    }
  }

  private alivePlayers(): PlayerEntity[] {
    return [...this.playersByEntity.values()].filter((player) => player.alive);
  }

  private presentPlayers(): PlayerEntity[] {
    return this.alivePlayers().filter((player) => player.connected);
  }

  private livingPlayers(): PlayerEntity[] {
    return this.presentPlayers().filter((player) => !player.ghost);
  }

  private activePlayers(): PlayerEntity[] {
    return this.livingPlayers().filter((player) => !player.paused && !player.choosingUpgrade);
  }

  private updateArenaSize(delta: number, presentPlayers = this.presentPlayers()): void {
    const totalLevel = presentPlayers.reduce((total, player) => total + Math.max(0, player.level), 0);
    const target = ARENA_BASE_SIZE * Math.sqrt(1 + totalLevel * ARENA_AREA_PER_LEVEL);
    const amount = 1 - Math.exp(-ARENA_RESIZE_RATE * delta);
    const previousSize = this.arenaSize;
    this.arenaSize += (target - this.arenaSize) * amount;
    if (Math.abs(target - this.arenaSize) < 0.0001) this.arenaSize = target;
    if (this.arenaSize >= previousSize) return;
    const minimum = this.arenaMinimum();
    const maximum = this.arenaMaximum();
    let movedFood = false;
    for (const food of this.foods) {
      const col = clamp(food.col, minimum, maximum);
      const row = clamp(food.row, minimum, maximum);
      if (col !== food.col || row !== food.row) {
        food.networkMoving = true;
        this.networkMovedFoods.add(food);
        movedFood = true;
      }
      food.col = col;
      food.row = row;
    }
    if (movedFood) this.foodSpatialDirty = true;
    for (const hazard of this.hazards) {
      hazard.col = clamp(hazard.col, minimum, maximum);
      hazard.row = clamp(hazard.row, minimum, maximum);
    }
  }

  private arenaMinimum(): number {
    return (GRID_SIZE - this.arenaSize) / 2;
  }

  private arenaMaximum(): number {
    return this.arenaMinimum() + this.arenaSize - 1;
  }

  private arenaIntegerBounds(margin = 0): { minimum: number; maximum: number } {
    return {
      minimum: Math.ceil(this.arenaMinimum() + margin),
      maximum: Math.floor(this.arenaMaximum() - margin),
    };
  }

  private projectileMinimum(): number {
    return this.arenaMinimum() - 0.5;
  }

  private projectileMaximum(): number {
    return this.arenaMaximum() + 0.5;
  }

  private isProjectileInside(projectile: ProjectileEntity): boolean {
    return projectile.col >= this.projectileMinimum()
      && projectile.col <= this.projectileMaximum()
      && projectile.row >= this.projectileMinimum()
      && projectile.row <= this.projectileMaximum();
  }

  private threatLevel(): number {
    return Math.floor(this.gameTime / 60);
  }

  private playerBaseSpeed(player: PlayerEntity): number {
    const feast = player.foodBoost > 0 ? MODULE_PROGRESSION.effects.feastSpeedBonus(this.moduleCount(player, 'feast')) : 0;
    const bonus = MODULE_PROGRESSION.effects.progressorSpeedBonus(this.moduleCount(player, 'progressor'))
      + MODULE_PROGRESSION.effects.missingHealthSpeedBonus(this.moduleCount(player, 'adrenaline'), this.missingHealthFraction(player))
      + feast;
    return PLAYER_BASE_SPEED * (1 + bonus);
  }

  private missingHealthFraction(player: PlayerEntity): number {
    if (player.maxHealth <= 0) return 0;
    return clamp(1 - player.health / player.maxHealth, 0, 1);
  }

  private playerHeadDamage(player: PlayerEntity, hitEnemyHead = false): number {
    return PLAYER_COLLISION_DAMAGE
      + this.moduleCount(player, 'ram')
      + MODULE_PROGRESSION.effects.missingHealthHeadDamageBonus(this.moduleCount(player, 'berserk'), this.missingHealthFraction(player))
      + (hitEnemyHead ? MODULE_PROGRESSION.effects.headCollisionDamageBonus(this.moduleCount(player, 'headstrike')) : 0);
  }

  private playerHealthRegenRate(player: PlayerEntity): number {
    const healthFraction = player.maxHealth > 0 ? clamp(player.health / player.maxHealth, 0, 1) : 0;
    return PLAYER_HEALTH_REGEN_PER_SECOND
      + MODULE_PROGRESSION.effects.healthRegenBonus(this.moduleCount(player, 'renewal'))
      + MODULE_PROGRESSION.effects.crisisRegen(this.moduleCount(player, 'crisis'), healthFraction);
  }

  private moduleCount(player: PlayerEntity, id: ModuleId): number {
    let count = 0;
    for (const segment of player.segments) {
      if (segment.module === id) count += Math.max(1, segment.moduleLevel || 1);
    }
    return Math.min(MODULE_PROGRESSION.maxModuleLevel, count);
  }

  private playerSegmentSpacing(player: PlayerEntity): number {
    return SNAKE_SEGMENT_SPACING * (1 + MODULE_PROGRESSION.effects.segmentSpacingBonus(this.moduleCount(player, 'linkage')));
  }

  private autopilotAngle(player: PlayerEntity, presentPlayers = this.presentPlayers()): number {
    let vectorCol = 0;
    let vectorRow = 0;
    let nearestFood: FoodEntity | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const food of this.foods) {
      const distance = distanceSquared(player, food);
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearestFood = food;
    }

    let target: GridPoint = nearestFood ?? { col: (this.arenaMinimum() + this.arenaMaximum()) / 2, row: (this.arenaMinimum() + this.arenaMaximum()) / 2 };
    let targetDistance = nearestDistance;
    let hasHigherPriorityTarget = false;
    const headStrikeDamage = this.playerHeadDamage(player, true);
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.segments.length >= headStrikeDamage) continue;
      const distance = distanceSquared(player, enemy);
      if (distance >= targetDistance) continue;
      target = enemy;
      targetDistance = distance;
      hasHigherPriorityTarget = true;
    }
    if (!hasHigherPriorityTarget) {
      let nearestGhost: PlayerEntity | null = null;
      let nearestGhostDistance = Number.POSITIVE_INFINITY;
      for (const other of presentPlayers) {
        if (other === player || !other.ghost) continue;
        const distance = distanceSquared(player, other);
        if (distance >= nearestGhostDistance) continue;
        nearestGhost = other;
        nearestGhostDistance = distance;
      }
      if (nearestGhost) target = nearestGhost;
    }
    const targetCol = target.col - player.col;
    const targetRow = target.row - player.row;
    const targetLength = Math.hypot(targetCol, targetRow) || 1;
    vectorCol += targetCol / targetLength;
    vectorRow += targetRow / targetLength;

    const wallMargin = 3.2;
    if (player.col < this.arenaMinimum() + wallMargin) vectorCol += (this.arenaMinimum() + wallMargin - player.col) * 1.4;
    if (player.col > this.arenaMaximum() + 1 - wallMargin) vectorCol -= (player.col - (this.arenaMaximum() + 1 - wallMargin)) * 1.4;
    if (player.row < this.arenaMinimum() + wallMargin) vectorRow += (this.arenaMinimum() + wallMargin - player.row) * 1.4;
    if (player.row > this.arenaMaximum() + 1 - wallMargin) vectorRow -= (player.row - (this.arenaMaximum() + 1 - wallMargin)) * 1.4;

    const repel = (node: GridPoint, strength: number, range: number): void => {
      const awayCol = player.col - node.col;
      const awayRow = player.row - node.row;
      const squared = awayCol * awayCol + awayRow * awayRow;
      if (squared <= 0.001 || squared >= range * range) return;
      const factor = strength / squared;
      vectorCol += awayCol * factor;
      vectorRow += awayRow * factor;
    };

    for (let index = 3; index < player.segments.length; index += 1) repel(player.segments[index], 1.4, 2.4);
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      for (const segment of enemy.segments) repel(segment, 2.4, 2.8);
    }
    for (const other of presentPlayers) {
      if (other === player || other.ghost || other.paused || other.choosingUpgrade) continue;
      repel(other, 3.2, 3.5);
      for (const segment of other.segments) repel(segment, 2.8, 3);
    }

    return Math.hypot(vectorCol, vectorRow) > 0.001 ? Math.atan2(vectorRow, vectorCol) : player.angle;
  }

  private ghostAutopilotAngle(player: PlayerEntity, livingPlayers: readonly PlayerEntity[]): number {
    const rescuer = this.nearestPlayer(player, livingPlayers);
    return rescuer ? Math.atan2(rescuer.row - player.row, rescuer.col - player.col) : player.angle;
  }

  private activeModuleCooldown(player: PlayerEntity, moduleId: ModuleId, moduleLevel = this.moduleCount(player, moduleId), extraCooldownRateBonus = 0): number {
    return MODULE_PROGRESSION.activeCooldownSeconds(
      moduleId,
      Math.max(1, moduleLevel || 1),
      MODULE_PROGRESSION.effects.amplifierCooldownRateBonus(this.moduleCount(player, 'amplifier')) + extraCooldownRateBonus,
    );
  }

  private movePlayer(player: PlayerEntity, delta: number): void {
    if (player.ghost) {
      player.angle = rotateToward(player.angle, player.desiredAngle, PLAYER_TURN_RATE * delta);
      player.speed = MULTIPLAYER_GHOST_SPEED;
      player.slow = 0;
      player.collisionCooldown = 0;
      player.knockbackX = 0;
      player.knockbackY = 0;
      player.col = clamp(player.col + Math.cos(player.angle) * player.speed * delta, this.arenaMinimum(), this.arenaMaximum());
      player.row = clamp(player.row + Math.sin(player.angle) * player.speed * delta, this.arenaMinimum(), this.arenaMaximum());
      followContinuousSegments(player.col, player.row, player.segments, this.playerSegmentSpacing(player));
      return;
    }
    if (player.collisionCooldown > 0) player.desiredAngle = player.angle;
    else player.angle = rotateToward(player.angle, player.desiredAngle, PLAYER_TURN_RATE * (1 + MODULE_PROGRESSION.effects.hasteTurnRateBonus(this.moduleCount(player, 'haste'))) * delta);
    const slowMultiplier = player.slow > 0 ? 0.48 : 1;
    player.speed = this.playerBaseSpeed(player) * slowMultiplier;
    player.col += (Math.cos(player.angle) * player.speed + player.knockbackX) * delta;
    player.row += (Math.sin(player.angle) * player.speed + player.knockbackY) * delta;
    this.applyKnockbackDecay(player, delta);
    followContinuousSegments(player.col, player.row, player.segments, this.playerSegmentSpacing(player));
  }

  private updatePlayerTimers(player: PlayerEntity, delta: number): void {
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    const regenRate = this.playerHealthRegenRate(player);
    if (regenRate >= 0) {
      this.healPlayer(player, regenRate * delta);
    } else {
      this.drainPlayerHealth(player, -regenRate * delta, this.now, '生命代偿失衡');
    }
    player.slow = Math.max(0, player.slow - delta);
    player.collisionCooldown = Math.max(0, player.collisionCooldown - delta);
    player.foodBoost = Math.max(0, player.foodBoost - delta);
    player.thornsCooldown = Math.max(0, player.thornsCooldown - delta);
    player.bloomCooldown = Math.max(0, player.bloomCooldown - delta);
  }

  private updatePlayerGrowth(player: PlayerEntity, delta: number, realDelta: number, now: number): void {
    if (player.upgradePending && player.upgradeRevealTimer > 0) {
      player.upgradeRevealTimer -= realDelta;
      if (player.upgradeRevealTimer <= 0) this.offerUpgrade(player, now);
      return;
    }
    if (!player.growth && player.growthQueue.length > 0) {
      player.growth = { ...player.growthQueue.shift()!, elapsed: 0, nodeCount: player.segments.length + 1 };
    }
    if (!player.growth) return;
    player.growth.elapsed += delta;
    const totalDuration = (player.growth.nodeCount - 1) * GROWTH_NODE_DELAY + GROWTH_PULSE_DURATION;
    if (player.growth.elapsed < totalDuration) return;
    const completed = player.growth;
    const tail = player.segments.at(-1) ?? player;
    player.segments.push(makeSegment(tail.col, tail.row, { neutral: true, experienceTier: 0 }, this.randomSource));
    this.compressExperienceSegments(player);
    this.burst(tail.col, tail.row, completed.color, completed.special ? 28 : 22, completed.special ? 175 : 145, player.entityId);
    this.burst(tail.col, tail.row, '#eef5ff', completed.special ? 18 : 12, completed.special ? 135 : 105, player.entityId);
    this.ring(tail.col, tail.row, completed.color, 0.46, 3, 0.78, player.entityId);
    this.ring(tail.col, tail.row, '#ffffff', 0.28, 2, 0.46, player.entityId);
    if (completed.spawnTailFood) this.spawnFoodBehindTail(player);
    this.feedback(completed.special ? 'growth-special' : 'growth', player.entityId);
    player.growth = null;
    if (player.growthQueue.length > 0) {
      player.growth = { ...player.growthQueue.shift()!, elapsed: 0, nodeCount: player.segments.length + 1 };
    } else if (player.upgradePending) {
      this.startLevelUpTransition(player);
    }
  }

  private spawnFoodBehindTail(player: PlayerEntity): void {
    const tail = player.segments.at(-1) ?? player;
    const previous = player.segments.at(-2) ?? player;
    const angle = Math.atan2(tail.row - previous.row, tail.col - previous.col);
    this.spawnFood({ col: tail.col + Math.cos(angle) * 1.2, row: tail.row + Math.sin(angle) * 1.2 }, true);
    this.ring(tail.col, tail.row, MODULE_BY_ID.replicator.color, 0.48, 3, 0.9, player.entityId);
  }

  private compressExperienceSegments(player: PlayerEntity, animate = true): number {
    let cascade = 0;
    for (let tier = 0; tier < MODULE_PROGRESSION.experienceTiers.length - 1; tier += 1) {
      while (true) {
        const indexes = MODULE_PROGRESSION.findCompressionIndexes(player.segments, tier);
        if (indexes.length === 0) break;
        const sources = indexes.map((index) => player.segments[index]);
        const insertionIndex = indexes[0];
        for (let index = indexes.length - 1; index >= 0; index -= 1) player.segments.splice(indexes[index], 1);
        const target = sources[0] ?? (player.segments.at(-1) ?? player);
        const compressed = makeSegment(target.col, target.row, {
          neutral: true,
          experienceTier: tier + 1,
          birthAge: animate ? 0 : null,
        }, this.randomSource);
        player.segments.splice(Math.min(insertionIndex, player.segments.length), 0, compressed);
        if (animate) {
          this.pendingEffects.push({
            id: this.effectId(),
            type: 'experienceCompress',
            sources: sources.map((segment) => ({ col: segment.col, row: segment.row })),
            target: { col: compressed.col, row: compressed.row },
            fromTier: tier,
            toTier: tier + 1,
            delay: cascade * DESIGNER_BALANCE.experienceCompressionCascadeDelay,
            ownerEntityId: player.entityId,
          });
        }
        cascade += 1;
      }
    }
    return cascade;
  }

  private settlePendingExperienceGrowth(player: PlayerEntity): void {
    const pendingGrowth = player.growth ? [player.growth, ...player.growthQueue] : [...player.growthQueue];
    player.growth = null;
    player.growthQueue.length = 0;
    for (const growth of pendingGrowth) {
      const tail = player.segments.at(-1) ?? player;
      player.segments.push(makeSegment(tail.col, tail.row, {
        neutral: true,
        experienceTier: 0,
      }, this.randomSource));
      if (growth.spawnTailFood) this.spawnFoodBehindTail(player);
    }
    this.compressExperienceSegments(player, false);
    for (const segment of player.segments) {
      if (segment.neutral) segment.birthAge = null;
    }
    retainInPlace(this.pendingEffects, (effect) => (
      effect.type !== 'experienceCompress' || effect.ownerEntityId !== player.entityId
    ));
    this.pendingEffects.push({
      id: this.effectId(),
      type: 'experienceSettle',
      ownerEntityId: player.entityId,
    });
  }

  private startLevelUpTransition(player: PlayerEntity): void {
    player.upgradeRevealTimer = LEVEL_UP_TRANSITION_DURATION;
    player.invulnerable = Math.max(player.invulnerable, LEVEL_UP_TRANSITION_DURATION + 0.08);
    this.burst(player.col, player.row, '#f3c600', 54, 245, player.entityId);
    this.burst(player.col, player.row, '#08c7dc', 34, 190, player.entityId);
    this.ring(player.col, player.row, '#f3c600', LEVEL_UP_TRANSITION_DURATION, 8, 3.8, player.entityId);
    this.ring(player.col, player.row, '#ffffff', 0.68, 5, 2.5, player.entityId);
    this.textEffect(player.col, player.row - 0.8, 'LEVEL UP', '#f3c600', LEVEL_UP_TRANSITION_DURATION, player.entityId);
    this.feedback('level', player.entityId);
    this.pendingEffects.push({ id: this.effectId(), type: 'flash', color: '#f3c600', strength: 0.18, audienceEntityId: player.entityId });
    this.effectSound('levelCharge', player.entityId);
  }

  private offerUpgrade(player: PlayerEntity, now: number): void {
    if (player.choosingUpgrade || !player.upgradePending) return;
    const offer: UpgradeOffer = {
      level: player.level + 1,
      expiresAt: 0,
      options: this.chooseUpgradeOptions(player, player.autopilot),
    };
    if (offer.options.length === 0) {
      this.completeLevelWithoutModule(player);
      return;
    }
    player.choosingUpgrade = true;
    player.upgradeOffer = offer;
    player.upgradeRevealTimer = 0;
    this.effectSound('level', player.entityId);
    if (player.autopilot) {
      this.applyUpgrade(player, offer.options[Math.floor(this.random() * offer.options.length)], now);
      return;
    }
    this.callbacks.onUpgrade?.(player.entityId, offer);
  }

  private chooseUpgradeOptions(player: PlayerEntity, automatic = player.autopilot): ModuleId[] {
    const chooseIds = automatic
      ? MODULE_PROGRESSION.chooseAutomaticUpgradeIds
      : MODULE_PROGRESSION.chooseUpgradeIds;
    return chooseIds(UPGRADE_MODULES, player.segments, player.level + 1, () => this.random(), 3);
  }

  private completeLevelWithoutModule(player: PlayerEntity): void {
    player.segments = player.segments.filter((segment) => !segment.neutral);
    player.level += 1;
    player.xp = 0;
    player.xpNeeded = experienceRequiredForLevel(player.level);
    player.score += 250 * player.level;
    player.choosingUpgrade = false;
    player.upgradePending = false;
    player.upgradeOffer = null;
    player.upgradeRevealTimer = 0;
    this.callbacks.onUpgrade?.(player.entityId, null);
    player.invulnerable = Math.max(player.invulnerable, UPGRADE_INVULNERABILITY_DURATION);
    this.effectSound('select', player.entityId);
  }

  private refreshActiveModuleCooldown(player: PlayerEntity, moduleId: ModuleId, segment: UltraSegment): void {
    const definition = MODULE_BY_ID[moduleId];
    if (!definition?.activeCooldown) return;
    segment.timer = 0;
    if (moduleId === 'phase') {
      segment.ready = true;
      segment.cooldown = 0;
    } else if (moduleId === 'thorns') {
      player.thornsCooldown = 0;
    } else if (moduleId === 'bloom') {
      player.bloomCooldown = 0;
    } else if (moduleId === 'saw') {
      for (const enemy of this.enemies) enemy.sawCooldownsByPlayer.delete(player.entityId);
    }
  }

  private applyUpgrade(player: PlayerEntity, moduleId: ModuleId, _now: number): void {
    const existing = player.segments.find((segment) => segment.module === moduleId) ?? null;
    const previousMaximumHealth = player.maxHealth;
    const consumedExperience = player.segments.filter((segment) => segment.neutral);
    player.segments = player.segments.filter((segment) => !segment.neutral);
    player.level += 1;
    player.xp = 0;
    player.xpNeeded = experienceRequiredForLevel(player.level);
    const definition = MODULE_BY_ID[moduleId];
    let upgradedSegment = existing;
    if (upgradedSegment) {
      upgradedSegment.moduleLevel = Math.min(
        MODULE_PROGRESSION.maxModuleLevel,
        Math.max(1, upgradedSegment.moduleLevel || 1) + 1,
      );
    } else {
      const tail = player.segments.at(-1) ?? player;
      const initialTimer = definition.activeCooldown ? 0 : this.randomBetween(0.2, 0.8);
      upgradedSegment = makeSegment(tail.col, tail.row, { module: moduleId, moduleLevel: 1, timer: initialTimer }, this.randomSource);
      player.segments.push(upgradedSegment);
    }
    this.refreshActiveModuleCooldown(player, moduleId, upgradedSegment);
    this.syncPlayerMaximumHealth(player, previousMaximumHealth);
    this.syncTailGuardSegments(player);
    player.recentPicks.push(moduleId);
    if (player.recentPicks.length > 6) player.recentPicks.shift();
    player.score += 250 * player.level;
    player.choosingUpgrade = false;
    player.upgradePending = false;
    player.upgradeOffer = null;
    this.callbacks.onUpgrade?.(player.entityId, null);
    player.invulnerable = Math.max(player.invulnerable, UPGRADE_INVULNERABILITY_DURATION);
    this.effectSound('select', player.entityId);
    for (const segment of consumedExperience) this.beam('beam', segment, upgradedSegment, definition.color, 0.34, player.entityId);
    this.burst(upgradedSegment.col, upgradedSegment.row, definition.color, existing ? 30 : 22, existing ? 165 : 130, player.entityId);
    this.ring(upgradedSegment.col, upgradedSegment.row, definition.color, 0.7, 12, existing ? 72 : 57, player.entityId, 'pixels');
  }

  private syncPlayerMaximumHealth(player: PlayerEntity, previousMaximum: number): void {
    const nextMaximum = PLAYER_MAX_HEALTH + MODULE_PROGRESSION.effects.maxHealthBonus(this.moduleCount(player, 'vitality'));
    const increase = nextMaximum - previousMaximum;
    player.maxHealth = nextMaximum;
    player.health = increase > 0
      ? Math.min(nextMaximum, player.health + increase)
      : Math.min(player.health, nextMaximum);
  }

  private syncTailGuardSegments(player: PlayerEntity): void {
    const targetCount = MODULE_PROGRESSION.effects.tailGuardSegmentCount(this.moduleCount(player, 'tailguard'));
    player.segments = player.segments.filter((segment) => !segment.tailGuard);
    for (let index = 0; index < targetCount; index += 1) {
      const tail = player.segments.at(-1) ?? player;
      player.segments.push(makeSegment(tail.col, tail.row, { tailGuard: true, birthAge: 0 }, this.randomSource));
    }
  }

  private collectFood(player: PlayerEntity, foodIndex: number, collector: GridPoint): void {
    const food = this.removeFoodAt(foodIndex);
    if (!food) return;
    const bonusExperience = this.random() < MODULE_PROGRESSION.effects.bonusXpChance(this.moduleCount(player, 'insight')) ? 1 : 0;
    player.xp += 1 + bonusExperience;
    player.score += food.special ? 35 : 20;
    player.growthQueue.push({
      color: food.color,
      special: food.special,
      spawnTailFood: this.random() < MODULE_PROGRESSION.effects.foodReplicationChance(this.moduleCount(player, 'replicator')),
    });
    const completesLevel = player.xp >= player.xpNeeded;
    if (completesLevel) {
      player.upgradePending = true;
      this.settlePendingExperienceGrowth(player);
    } else if (!player.growth) {
      player.growth = { ...player.growthQueue.shift()!, elapsed: 0, nodeCount: player.segments.length + 1 };
    }
    if (this.moduleCount(player, 'feast') > 0) player.foodBoost = MODULE_PROGRESSION.effects.feastDuration();
    const emergency = this.moduleCount(player, 'emergency');
    if (emergency > 0) {
      player.invulnerable = Math.max(player.invulnerable, MODULE_PROGRESSION.effects.emergencyDuration(emergency));
      this.ring(collector.col, collector.row, MODULE_BY_ID.emergency.color, 0.38, 7, 0.72, player.entityId);
    }
    this.healPlayer(player, MODULE_PROGRESSION.effects.foodHeal(this.moduleCount(player, 'medkit')), MODULE_BY_ID.medkit.color, true);
    this.burst(collector.col, collector.row, food.color, food.special ? 34 : 28, food.special ? 210 : 180, player.entityId);
    this.ring(collector.col, collector.row, food.color, 0.58, 5, 1.5, player.entityId);
    this.ring(collector.col, collector.row, '#ffffff', 0.32, 4, 0.82, player.entityId);
    this.textEffect(collector.col, collector.row, `+${1 + bonusExperience}`, food.color, 0.72, player.entityId);
    this.effectSound('eat', player.entityId, player.xp);
    this.feedback(food.special ? 'food-special' : 'food', player.entityId);
    if (completesLevel) this.startLevelUpTransition(player);
  }

  private updateFood(delta: number, activePlayers: PlayerEntity[]): void {
    const profiles = this.foodInteractionProfiles;
    const tractorProfiles = this.tractorFoodProfiles;
    const collectorProfiles = this.automaticFoodProfiles;
    tractorProfiles.length = 0;
    collectorProfiles.length = 0;
    let profileCount = 0;
    for (const player of activePlayers) {
      const tractor = this.moduleCount(player, 'tractor');
      let profile = profiles[profileCount];
      if (!profile) {
        profile = { player, tractor: 0, tractorRange: 0, tractorSpeed: 0, headRange: 0, bodyRange: 0 };
        profiles.push(profile);
      }
      profile.player = player;
      profile.tractor = tractor;
      profile.tractorRange = MODULE_PROGRESSION.effects.tractorRangeCells(tractor);
      profile.tractorSpeed = MODULE_PROGRESSION.effects.tractorPullSpeed(tractor);
      profile.headRange = this.playerHeadRadiusCells() + 0.13 + MODULE_PROGRESSION.effects.magnetPickupRangeCells(this.moduleCount(player, 'magnet'));
      profile.bodyRange = SNAKE_BODY_CONTACT_RANGE + MODULE_PROGRESSION.effects.collectorPickupRadiusCells(this.moduleCount(player, 'collector'));
      if (tractor > 0) tractorProfiles.push(profile);
      if (player.autopilot) collectorProfiles.push(profile);
      profileCount += 1;
    }

    const pullers = this.foodPullCandidates;
    if (tractorProfiles.length > 0) {
      this.ensureFoodSpatialBuckets();
      for (const profile of tractorProfiles) {
        const rangeSquared = profile.tractorRange * profile.tractorRange;
        this.forEachNearbyFood(profile.player, profile.tractorRange, (food) => {
          const distance = distanceSquared(profile.player, food);
          const current = pullers.get(food.id);
          if (distance <= 0.000001 || distance > rangeSquared || (current && current.distanceSquared <= distance)) return;
          if (current) {
            current.food = food;
            current.profile = profile;
            current.distanceSquared = distance;
          } else {
            const candidate = this.foodPullCandidatePool.pop() ?? { food, profile, distanceSquared: distance };
            candidate.food = food;
            candidate.profile = profile;
            candidate.distanceSquared = distance;
            pullers.set(food.id, candidate);
          }
        });
      }
    }

    this.nextPulledFoods.clear();
    for (const puller of pullers.values()) {
      const { food, profile, distanceSquared: pullDistanceSquared } = puller;
      const pullDistance = Math.sqrt(pullDistanceSquared);
      const step = Math.min(pullDistance, profile.tractorSpeed * delta);
      food.col += (profile.player.col - food.col) / pullDistance * step;
      food.row += (profile.player.row - food.row) / pullDistance * step;
      food.isPulled = true;
      this.nextPulledFoods.add(food);
      this.foodSpatialDirty = true;
    }
    for (const candidate of pullers.values()) this.foodPullCandidatePool.push(candidate);
    pullers.clear();
    for (const food of this.pulledFoods) {
      if (this.nextPulledFoods.has(food) || this.foodsById.get(food.id) !== food) continue;
      food.isPulled = false;
      this.queueFoodUpsert(food);
    }
    const previousPulledFoods = this.pulledFoods;
    this.pulledFoods = this.nextPulledFoods;
    this.nextPulledFoods = previousPulledFoods;

    if (collectorProfiles.length === 0) return;
    this.ensureFoodSpatialBuckets();
    const winners = this.foodCollectionCandidates;
    const considerCollector = (profile: FoodInteractionProfile, collector: GridPoint, range: number): void => {
      const rangeSquared = range * range;
      this.forEachNearbyFood(collector, range, (food) => {
        const distance = distanceSquared(collector, food);
        const current = winners.get(food.id);
        if (distance > rangeSquared || (current && current.distance <= distance)) return;
        if (current) {
          current.food = food;
          current.player = profile.player;
          current.collector = collector;
          current.distance = distance;
        } else {
          const candidate = this.foodCollectionCandidatePool.pop() ?? { food, player: profile.player, collector, distance };
          candidate.food = food;
          candidate.player = profile.player;
          candidate.collector = collector;
          candidate.distance = distance;
          winners.set(food.id, candidate);
        }
      });
    };
    for (const profile of collectorProfiles) {
      if (profile.player.upgradePending) continue;
      considerCollector(profile, profile.player, profile.headRange);
      for (const segment of profile.player.segments) considerCollector(profile, segment, profile.bodyRange);
    }

    const orderedWinners = this.orderedFoodCollectionCandidates;
    orderedWinners.length = 0;
    for (const candidate of winners.values()) orderedWinners.push(candidate);
    orderedWinners.sort((left, right) =>
      (this.foodIndexesById.get(right.food.id) ?? -1) - (this.foodIndexesById.get(left.food.id) ?? -1));
    for (const candidate of orderedWinners) {
      const index = this.foodIndexesById.get(candidate.food.id);
      if (index === undefined) continue;
      let winner: { player: PlayerEntity; collector: GridPoint; distance: number } | null = candidate;
      if (winner.player.upgradePending) {
        winner = null;
        for (const profile of collectorProfiles) {
          if (profile.player.upgradePending) continue;
          const contact = this.findFoodCollectorWithin(profile.player, candidate.food, profile.headRange, profile.bodyRange);
          if (contact && (!winner || contact.distance < winner.distance)) winner = { player: profile.player, ...contact };
        }
      }
      if (winner) this.collectFood(winner.player, index, winner.collector);
    }
    orderedWinners.length = 0;
    for (const candidate of winners.values()) this.foodCollectionCandidatePool.push(candidate);
    winners.clear();
  }

  private findFoodCollector(player: PlayerEntity, food: FoodEntity, extraRange = 0): { collector: GridPoint; distance: number } | null {
    const headRange = this.playerHeadRadiusCells() + 0.13 + MODULE_PROGRESSION.effects.magnetPickupRangeCells(this.moduleCount(player, 'magnet')) + extraRange;
    const bodyRange = SNAKE_BODY_CONTACT_RANGE + MODULE_PROGRESSION.effects.collectorPickupRadiusCells(this.moduleCount(player, 'collector')) + extraRange;
    return this.findFoodCollectorWithin(player, food, headRange, bodyRange);
  }

  private findFoodCollectorWithin(player: PlayerEntity, food: FoodEntity, headRange: number, bodyRange: number): { collector: GridPoint; distance: number } | null {
    const headDistance = distanceSquared(player, food);
    let nearest = headDistance <= headRange * headRange ? { collector: player as GridPoint, distance: headDistance } : null;
    const bodyRangeSquared = bodyRange * bodyRange;
    for (const segment of player.segments) {
      const distance = distanceSquared(segment, food);
      if (distance <= bodyRangeSquared && (!nearest || distance < nearest.distance)) nearest = { collector: segment, distance };
    }
    return nearest;
  }

  private waveCountdownRate(_players?: readonly PlayerEntity[]): number {
    return 1;
  }

  private chooseEnemyArchetype(): EnemyArchetypeDefinition | null {
    const available = ENEMY_ARCHETYPES.filter((entry) => (
      entry.unlockSeconds <= this.gameTime
      && entry.spawnWeight > 0
    ));
    if (available.length === 0) return null;
    const totalWeight = available.reduce((sum, entry) => sum + entry.spawnWeight, 0);
    let roll = this.random() * totalWeight;
    for (const entry of available) {
      roll -= entry.spawnWeight;
      if (roll <= 0) return entry;
    }
    return available[available.length - 1];
  }

  private queueWaveEnemies(playerCount: number, occupied: Set<number>, players: readonly PlayerEntity[]): void {
    const plan = enemyWaveDirector.plan(this.waveCount + 1);
    const countMultiplier = players.reduce(
      (multiplier, player) => multiplier * MODULE_PROGRESSION.effects.beaconEnemyCountMultiplier(this.moduleCount(player, 'beacon')),
      1,
    );
    const archetypes: EnemyArchetypeDefinition[] = [];
    for (let index = 0; index < Math.ceil(plan.enemyCount * playerCount * countMultiplier); index += 1) {
      const archetype = this.chooseEnemyArchetype();
      if (!archetype) break;
      archetypes.push(archetype);
    }
    const allocation = enemyWaveDirector.allocateHealth(
      archetypes.map((archetype) => archetype.healthWeight),
      plan.totalThreat * playerCount * countMultiplier,
      () => this.random(),
    );
    for (let index = 0; index < archetypes.length; index += 1) {
      if (!this.queueEnemySpawn(archetypes[index], allocation.health[index], occupied)) break;
    }
  }

  private updateSpawns(delta: number, players = this.livingPlayers(), activePlayers = this.activePlayers()): void {
    this.waveTimer -= delta * this.waveCountdownRate(activePlayers);
    if (this.waveTimer > 0) return;
    const playerCount = players.length;
    const foodCells = this.freeCells(FOOD_WALL_MARGIN);
    const occupied = this.occupiedCellCodes();
    for (const player of players) {
      this.spawnWaveFoods(FOODS_PER_PLAYER_PER_WAVE, foodCells, occupied);
    }
    this.queueWaveEnemies(playerCount, occupied, activePlayers);
    this.waveCount += 1;
    this.waveTimer = WAVE_BASE_INTERVAL;
  }

  private spawnFood(preferred?: GridPoint, special = false, occupied?: Set<string>): boolean {
    const occupiedCells = occupied ?? this.spawnOccupiedCellKeys();
    const cell = this.findFreeCell(preferred ?? null, FOOD_WALL_MARGIN, occupiedCells);
    if (!cell) return false;
    this.materializeFood(cell, special);
    occupiedCells.add(cellKey(cell));
    return true;
  }

  private spawnWaveFoods(count: number, cells = this.freeCells(FOOD_WALL_MARGIN), occupiedCodes?: Set<number>): void {
    for (let index = 0; index < count && cells.length > 0; index += 1) {
      const selectedIndex = Math.floor(this.random() * cells.length);
      const [cell] = cells.splice(selectedIndex, 1);
      this.materializeFood(cell, false);
      occupiedCodes?.add(cellCode(cell));
    }
  }

  private materializeFood(cell: GridPoint, special: boolean): void {
    const color = FOOD_COLORS[Math.floor(this.random() * FOOD_COLORS.length)];
    const food: FoodEntity = {
      id: this.allocateFoodId(),
      col: cell.col,
      row: cell.row,
      color,
      phase: this.randomBetween(0, TAU),
      pullTimer: this.randomBetween(0.4, 1),
      special,
      isPulled: false,
      networkMoving: false,
    };
    this.addFood(food);
  }

  private addFood(food: FoodEntity): void {
    const index = this.foods.length;
    this.foods.push(food);
    this.foodsById.set(food.id, food);
    this.foodIndexesById.set(food.id, index);
    this.pendingFoodRemovals.delete(food.id);
    this.pendingFoodUpserts.set(food.id, food);
    if (food.isPulled) this.pulledFoods.add(food);
    this.foodSpatialDirty = true;
  }

  private removeFoodAt(index: number): FoodEntity | null {
    if (index < 0 || index >= this.foods.length) return null;
    const lastIndex = this.foods.length - 1;
    const removed = this.foods[index];
    const last = this.foods[lastIndex];
    this.foods.pop();
    if (index !== lastIndex) {
      this.foods[index] = last;
      this.foodIndexesById.set(last.id, index);
    }
    this.foodsById.delete(removed.id);
    this.foodIndexesById.delete(removed.id);
    this.enemyFoodVisitStamps.delete(removed.id);
    this.pulledFoods.delete(removed);
    this.nextPulledFoods.delete(removed);
    this.networkMovedFoods.delete(removed);
    this.staleFoodSpatialEntries += 1;
    if (this.staleFoodSpatialEntries > Math.max(64, this.foods.length / 4)) this.foodSpatialDirty = true;
    if (!this.pendingFoodUpserts.delete(removed.id)) this.pendingFoodRemovals.add(removed.id);
    return removed;
  }

  private ensureFoodIndexes(): void {
    if (this.foodsById.size === this.foods.length && this.foodIndexesById.size === this.foods.length) return;
    this.foodsById.clear();
    this.foodIndexesById.clear();
    for (let index = 0; index < this.foods.length; index += 1) {
      const food = this.foods[index];
      this.foodsById.set(food.id, food);
      this.foodIndexesById.set(food.id, index);
    }
  }

  private resetFoodSpatialBuckets(): void {
    for (const bucket of this.foodSpatialBuckets.values()) {
      bucket.length = 0;
      this.foodSpatialBucketPool.push(bucket);
    }
    this.foodSpatialBuckets.clear();
  }

  private rebuildFoodSpatialBuckets(): void {
    this.resetFoodSpatialBuckets();
    for (const food of this.foods) {
      const code = spatialBucketCode(food.col, food.row);
      let bucket = this.foodSpatialBuckets.get(code);
      if (!bucket) {
        bucket = this.foodSpatialBucketPool.pop() ?? [];
        this.foodSpatialBuckets.set(code, bucket);
      }
      bucket.push(food);
    }
    this.foodSpatialDirty = false;
    this.staleFoodSpatialEntries = 0;
  }

  private ensureFoodSpatialBuckets(): void {
    if (this.foodSpatialDirty) this.rebuildFoodSpatialBuckets();
  }

  private forEachNearbyFood(origin: GridPoint, range: number, visit: (food: FoodEntity) => void): void {
    const minimumCol = Math.floor(origin.col - range);
    const maximumCol = Math.floor(origin.col + range);
    const minimumRow = Math.floor(origin.row - range);
    const maximumRow = Math.floor(origin.row + range);
    for (let col = minimumCol; col <= maximumCol; col += 1) {
      for (let row = minimumRow; row <= maximumRow; row += 1) {
        const bucket = this.foodSpatialBuckets.get(spatialBucketCode(col, row));
        if (!bucket) continue;
        for (const food of bucket) if (this.foodsById.get(food.id) === food) visit(food);
      }
    }
  }

  private nearestFoods(origin: GridPoint, limit: number): FoodEntity[] {
    if (limit <= 0 || this.foods.length === 0) return [];
    this.ensureFoodSpatialBuckets();
    const candidates: Array<{ food: FoodEntity; distance: number }> = [];
    const centerCol = Math.floor(origin.col);
    const centerRow = Math.floor(origin.row);
    const maximumRadius = Math.ceil(this.arenaSize) + 2;
    const considerBucket = (col: number, row: number): void => {
      const bucket = this.foodSpatialBuckets.get(spatialBucketCode(col, row));
      if (!bucket) return;
      for (const food of bucket) {
        if (this.foodsById.get(food.id) !== food) continue;
        const candidate = { food, distance: distanceSquared(origin, food) };
        let insertAt = candidates.length;
        while (insertAt > 0 && candidate.distance < candidates[insertAt - 1].distance) insertAt -= 1;
        if (insertAt >= limit) continue;
        candidates.splice(insertAt, 0, candidate);
        if (candidates.length > limit) candidates.pop();
      }
    };

    for (let radius = 0; radius <= maximumRadius; radius += 1) {
      if (radius === 0) considerBucket(centerCol, centerRow);
      else {
        const minimumCol = centerCol - radius;
        const maximumCol = centerCol + radius;
        const minimumRow = centerRow - radius;
        const maximumRow = centerRow + radius;
        for (let col = minimumCol; col <= maximumCol; col += 1) {
          considerBucket(col, minimumRow);
          considerBucket(col, maximumRow);
        }
        for (let row = minimumRow + 1; row < maximumRow; row += 1) {
          considerBucket(minimumCol, row);
          considerBucket(maximumCol, row);
        }
      }
      if (candidates.length < limit) continue;
      const minimumOutsideDistance = Math.min(
        origin.col - (centerCol - radius),
        centerCol + radius + 1 - origin.col,
        origin.row - (centerRow - radius),
        centerRow + radius + 1 - origin.row,
      );
      if (candidates[candidates.length - 1].distance <= minimumOutsideDistance * minimumOutsideDistance) break;
    }
    return candidates.map((candidate) => candidate.food);
  }

  private enemyFoodContact(enemy: EnemyEntity): { food: FoodEntity; index: number; collector: GridPoint } | null {
    this.ensureFoodSpatialBuckets();
    const contactRangeSquared = 0.4 * 0.4;
    let selectedIndex = -1;
    let selectedFood: FoodEntity | null = null;
    let selectedCollector: GridPoint = enemy;
    const visitToken = this.nextEnemyFoodVisitToken();
    for (let nodeIndex = -1; nodeIndex < enemy.segments.length; nodeIndex += 1) {
      const node: GridPoint = nodeIndex < 0 ? enemy : enemy.segments[nodeIndex];
      const minimumCol = Math.floor(node.col - 0.4);
      const maximumCol = Math.floor(node.col + 0.4);
      const minimumRow = Math.floor(node.row - 0.4);
      const maximumRow = Math.floor(node.row + 0.4);
      for (let col = minimumCol; col <= maximumCol; col += 1) {
        for (let row = minimumRow; row <= maximumRow; row += 1) {
          const bucket = this.foodSpatialBuckets.get(spatialBucketCode(col, row));
          if (!bucket) continue;
          for (const food of bucket) {
            if (this.enemyFoodVisitStamps.get(food.id) === visitToken || this.foodsById.get(food.id) !== food) continue;
            this.enemyFoodVisitStamps.set(food.id, visitToken);
            const index = this.foodIndexesById.get(food.id);
            if (index === undefined || index <= selectedIndex || distanceSquared(node, food) > contactRangeSquared) continue;
            selectedIndex = index;
            selectedFood = food;
            selectedCollector = node;
          }
        }
      }
    }
    if (!selectedFood) return null;
    return { food: selectedFood, index: selectedIndex, collector: selectedCollector };
  }

  private nextEnemyFoodVisitToken(): number {
    this.enemyFoodVisitToken = this.enemyFoodVisitToken >= 2_147_483_647 ? 1 : this.enemyFoodVisitToken + 1;
    if (this.enemyFoodVisitToken === 1) this.enemyFoodVisitStamps.clear();
    return this.enemyFoodVisitToken;
  }

  private addHazard(hazard: HazardEntity): void {
    this.hazards.push(hazard);
    this.pendingHazardRemovals.delete(hazard.id);
    this.pendingHazardUpserts.set(hazard.id, hazard);
  }

  private addPendingSpawn(spawn: PendingSpawn): void {
    this.pendingSpawns.push(spawn);
    this.pendingSpawnRemovals.delete(spawn.id);
    this.pendingSpawnUpserts.set(spawn.id, spawn);
  }

  private resetWorldObjectState(): void {
    this.hazards.length = 0;
    this.pendingSpawns.length = 0;
    this.pendingHazardUpserts.clear();
    this.pendingHazardRemovals.clear();
    this.pendingSpawnUpserts.clear();
    this.pendingSpawnRemovals.clear();
    this.networkHazards.length = 0;
    this.networkPendingSpawns.length = 0;
    this.worldObjectResetPending = true;
  }

  private queueFoodUpsert(food: FoodEntity): void {
    this.pendingFoodRemovals.delete(food.id);
    this.pendingFoodUpserts.set(food.id, food);
  }

  private resetFoodState(): void {
    this.foods = [];
    this.foodsById.clear();
    this.foodIndexesById.clear();
    this.enemyFoodVisitStamps.clear();
    this.pendingFoodUpserts.clear();
    this.pendingFoodRemovals.clear();
    this.networkMovingFoods.length = 0;
    this.networkMovedFoods.clear();
    this.pulledFoods.clear();
    this.nextPulledFoods.clear();
    this.resetFoodSpatialBuckets();
    this.foodSpatialDirty = true;
    this.staleFoodSpatialEntries = 0;
    this.spawnOccupiedCells = null;
    this.foodResetPending = true;
  }

  private updateEnemySpawnWarnings(delta: number): void {
    for (let index = this.pendingSpawns.length - 1; index >= 0; index -= 1) {
      const spawn = this.pendingSpawns[index];
      spawn.timer -= delta;
      if (spawn.timer > 0) continue;
      this.pendingSpawns.splice(index, 1);
      this.pendingSpawnUpserts.delete(spawn.id);
      this.pendingSpawnRemovals.add(spawn.id);
      this.materializeEnemySpawn(spawn);
    }
  }

  private queueEnemySpawn(archetype: EnemyArchetypeDefinition, assignedHealth: number, occupied = this.occupiedCellCodes()): boolean {
    const totalLength = Math.max(1, Math.round(assignedHealth));
    const placement = this.chooseEnemySpawn(totalLength - 1, occupied);
    if (!placement) return false;
    const direction = { col: placement.next.col - placement.head.col, row: placement.next.row - placement.head.row };
    if (direction.col === 0 && direction.row === 0) direction.col = placement.head.col < this.arenaMaximum() ? 1 : -1;
    const color = ENEMY_COLORS[(this.nextEnemyId - 1) % ENEMY_COLORS.length];
    this.addPendingSpawn({
      id: this.nextEnemyId++,
      archetype: archetype.id,
      color,
      angle: Math.atan2(direction.row, direction.col),
      totalLength,
      headCell: placement.head,
      bodyCells: Array.from({ length: totalLength - 1 }, (_, index) => ({ ...placement.body[Math.min(index, placement.body.length - 1)] })),
      nextCell: placement.next,
      timer: ENEMY_SPAWN_WARNING_TIME,
      maxTimer: ENEMY_SPAWN_WARNING_TIME,
    });
    occupied.add(cellCode(placement.head));
    for (const cell of placement.body) occupied.add(cellCode(cell));
    this.effectSound('enemyWarning');
    return true;
  }

  private materializeEnemySpawn(spawn: PendingSpawn): void {
    const archetype = ENEMY_ARCHETYPE_BY_ID[spawn.archetype];
    this.enemies.push({
      id: spawn.id,
      archetype: spawn.archetype,
      behaviorState: 'roam',
      behaviorPhase: 0,
      col: spawn.headCell.col,
      row: spawn.headCell.row,
      angle: spawn.angle,
      desiredAngle: spawn.angle,
      birthLength: spawn.totalLength,
      speed: ENEMY_BASE_SPEED * archetype.speedMultiplier,
      turnRate: this.randomBetween(ENEMY_TURN_RATE_MIN, ENEMY_TURN_RATE_MAX) * archetype.turnMultiplier,
      color: spawn.color,
      segments: spawn.bodyCells.map((cell) => ({ ...cell, reconnectElapsed: 0, reconnectGap: 0 })),
      captured: 0,
      targetFoodId: null,
      think: this.randomBetween(0.1, 0.5),
      wobble: this.randomBetween(0, TAU),
      slow: 0,
      permanentSlow: 0,
      knockbackX: 0,
      knockbackY: 0,
      poisonStacks: 0,
      poisonTimer: 0,
      poisonColor: null,
      poisonOwnerEntityId: null,
      sawCooldownsByPlayer: new Map(),
      collisionCooldown: 0,
      projectileMinCol: spawn.headCell.col,
      projectileMaxCol: spawn.headCell.col,
      projectileMinRow: spawn.headCell.row,
      projectileMaxRow: spawn.headCell.row,
      dead: false,
    });
    this.burst(spawn.headCell.col, spawn.headCell.row, spawn.color, 22, 145);
    this.ring(spawn.headCell.col, spawn.headCell.row, spawn.color, 0.58, 5, 1.25);
    this.effectSound('enemySpawn');
  }

  private chooseEnemySpawn(bodySegmentCount: number, occupied = this.occupiedCellCodes()): { head: GridPoint; body: GridPoint[]; next: GridPoint } | null {
    const bounds = this.arenaIntegerBounds();
    const players = this.livingPlayers();
    return chooseSerpentineSpawn({
      minimum: bounds.minimum,
      maximum: bounds.maximum,
      bodySegmentCount,
      safetyDistance: ENEMY_SPAWN_SAFETY_DISTANCE,
      forwardPathHalfWidth: ENEMY_SPAWN_FORWARD_PATH_HALF_WIDTH,
      occupiedCells: occupied,
      players,
      random: () => this.random(),
    });
  }

  private occupiedCellKeys(): Set<string> {
    const occupied = new Set<string>();
    for (const player of this.livingPlayers()) {
      occupied.add(cellKey(player));
      for (const segment of player.segments) occupied.add(cellKey(segment));
    }
    for (const food of this.foods) occupied.add(cellKey(food));
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      occupied.add(cellKey(enemy));
      for (const segment of enemy.segments) occupied.add(cellKey(segment));
    }
    for (const spawn of this.pendingSpawns) {
      for (const cell of [spawn.headCell, ...spawn.bodyCells]) occupied.add(cellKey(cell));
    }
    return occupied;
  }

  private spawnOccupiedCellKeys(): Set<string> {
    return this.spawnOccupiedCells ??= this.occupiedCellKeys();
  }

  private occupiedCellCodes(): Set<number> {
    const occupied = new Set<number>();
    for (const player of this.livingPlayers()) {
      occupied.add(cellCode(player));
      for (const segment of player.segments) occupied.add(cellCode(segment));
    }
    for (const food of this.foods) occupied.add(cellCode(food));
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      occupied.add(cellCode(enemy));
      for (const segment of enemy.segments) occupied.add(cellCode(segment));
    }
    for (const spawn of this.pendingSpawns) {
      occupied.add(cellCode(spawn.headCell));
      for (const cell of spawn.bodyCells) occupied.add(cellCode(cell));
    }
    return occupied;
  }

  private freeCells(wallMargin = 0, occupied = this.occupiedCellKeys()): GridPoint[] {
    const cells: GridPoint[] = [];
    const margin = clamp(Math.ceil(wallMargin), 0, Math.floor((this.arenaSize - 1) / 2));
    const bounds = this.arenaIntegerBounds(margin);
    for (let row = bounds.minimum; row <= bounds.maximum; row += 1) {
      for (let col = bounds.minimum; col <= bounds.maximum; col += 1) {
        if (!occupied.has(cellKey({ col, row }))) cells.push({ col, row });
      }
    }
    return cells;
  }

  private findFreeCell(preferred: GridPoint | null, wallMargin = 0, occupied = this.spawnOccupiedCellKeys()): GridPoint | null {
    const margin = clamp(Math.ceil(wallMargin), 0, Math.floor((this.arenaSize - 1) / 2));
    const bounds = this.arenaIntegerBounds(margin);
    if (preferred) {
      const centerCol = clamp(Math.round(preferred.col), bounds.minimum, bounds.maximum);
      const centerRow = clamp(Math.round(preferred.row), bounds.minimum, bounds.maximum);
      const maximumRadius = Math.max(
        centerCol - bounds.minimum,
        bounds.maximum - centerCol,
        centerRow - bounds.minimum,
        bounds.maximum - centerRow,
      );
      let selected: GridPoint | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      const intervalDistance = (value: number, minimum: number, maximum: number): number =>
        value < minimum ? minimum - value : value > maximum ? value - maximum : 0;
      for (let radius = 0; radius <= maximumRadius; radius += 1) {
        const minimumCol = Math.max(bounds.minimum, centerCol - radius);
        const maximumCol = Math.min(bounds.maximum, centerCol + radius);
        const minimumRow = Math.max(bounds.minimum, centerRow - radius);
        const maximumRow = Math.min(bounds.maximum, centerRow + radius);
        for (let row = minimumRow; row <= maximumRow; row += 1) {
          for (let col = minimumCol; col <= maximumCol; col += 1) {
            if (Math.max(Math.abs(col - centerCol), Math.abs(row - centerRow)) !== radius) continue;
            const point = { col, row };
            if (occupied.has(cellKey(point))) continue;
            const distance = manhattan(point, preferred);
            if (distance < bestDistance || (distance === bestDistance && selected && (row < selected.row || (row === selected.row && col < selected.col)))) {
              bestDistance = distance;
              selected = point;
            }
          }
        }
        if (selected) {
          let minimumFutureDistance = Number.POSITIVE_INFINITY;
          const leftMaximum = centerCol - radius - 1;
          if (leftMaximum >= bounds.minimum) {
            minimumFutureDistance = Math.min(minimumFutureDistance,
              intervalDistance(preferred.col, bounds.minimum, leftMaximum)
              + intervalDistance(preferred.row, bounds.minimum, bounds.maximum));
          }
          const rightMinimum = centerCol + radius + 1;
          if (rightMinimum <= bounds.maximum) {
            minimumFutureDistance = Math.min(minimumFutureDistance,
              intervalDistance(preferred.col, rightMinimum, bounds.maximum)
              + intervalDistance(preferred.row, bounds.minimum, bounds.maximum));
          }
          const topMaximum = centerRow - radius - 1;
          if (topMaximum >= bounds.minimum) {
            minimumFutureDistance = Math.min(minimumFutureDistance,
              intervalDistance(preferred.row, bounds.minimum, topMaximum)
              + intervalDistance(preferred.col, bounds.minimum, bounds.maximum));
          }
          const bottomMinimum = centerRow + radius + 1;
          if (bottomMinimum <= bounds.maximum) {
            minimumFutureDistance = Math.min(minimumFutureDistance,
              intervalDistance(preferred.row, bottomMinimum, bounds.maximum)
              + intervalDistance(preferred.col, bounds.minimum, bounds.maximum));
          }
          if (bestDistance <= minimumFutureDistance) return selected;
        }
      }
      return selected ?? (margin > 0 ? null : preferred);
    }

    let freeCount = 0;
    for (let row = bounds.minimum; row <= bounds.maximum; row += 1) {
      for (let col = bounds.minimum; col <= bounds.maximum; col += 1) {
        const point = { col, row };
        if (occupied.has(cellKey(point))) continue;
        freeCount += 1;
      }
    }
    if (freeCount === 0) return null;
    let targetIndex = Math.floor(this.random() * freeCount);
    for (let row = bounds.minimum; row <= bounds.maximum; row += 1) {
      for (let col = bounds.minimum; col <= bounds.maximum; col += 1) {
        const point = { col, row };
        if (occupied.has(cellKey(point))) continue;
        if (targetIndex === 0) return point;
        targetIndex -= 1;
      }
    }
    return null;
  }

  private findPlayerSpawn(): GridPoint {
    const center = { col: Math.floor(GRID_SIZE / 2), row: Math.floor(GRID_SIZE / 2) };
    const alive = this.livingPlayers();
    if (alive.length === 0) return this.findFreeCell(center, 2) ?? center;

    const occupied = this.occupiedCellKeys();
    const candidates: Array<GridPoint & { clearance: number }> = [];
    const occupiedNodes: GridPoint[] = [
      ...alive.flatMap((player) => [player, ...player.segments]),
      ...this.enemies.filter((enemy) => !enemy.dead).flatMap((enemy) => [enemy, ...enemy.segments]),
    ];
    const bounds = this.arenaIntegerBounds(2);
    for (let row = bounds.minimum; row <= bounds.maximum; row += 1) {
      for (let col = bounds.minimum; col <= bounds.maximum; col += 1) {
        const point = { col, row };
        if (occupied.has(cellKey(point))) continue;
        const clearance = occupiedNodes.length > 0
          ? Math.min(...occupiedNodes.map((node) => Math.hypot(node.col - col, node.row - row)))
          : this.arenaSize;
        candidates.push({ ...point, clearance });
      }
    }
    candidates.sort((left, right) => right.clearance - left.clearance || manhattan(left, center) - manhattan(right, center));
    return candidates[0] ?? this.findFreeCell(center, 2) ?? center;
  }

  private triggerCollisionEcho(player: PlayerEntity): void {
    const echoes = this.moduleCount(player, 'echo');
    if (echoes <= 0) return;
    for (let index = 0; index < echoes; index += 1) {
      this.createProjectile(player, player, this.randomBetween(0, TAU), { color: MODULE_BY_ID.echo.color, speed: 330, size: 3.4 });
    }
    this.effectSound('shoot', player.entityId);
  }

  private applyPlayerCollisionAttack(
    player: PlayerEntity,
    enemy: EnemyEntity,
    point: GridPoint,
    segmentIndex: number,
    hitHead: boolean,
  ): void {
    if (enemy.dead) return;
    this.triggerCollisionEcho(player);
    this.damageTarget(
      player,
      enemy,
      this.playerHeadDamage(player, hitHead),
      point,
      PLAYER_COLORS[player.colorIndex],
      segmentIndex,
    );
  }

  private bladeHitSegmentIndex(target: EnemyEntity, blade: GridPoint, radius: number): number | null {
    if (distanceSquared(blade, target) < (radius + ENEMY_HEAD_RADIUS_CELLS) ** 2) return -1;
    const segmentRadiusSquared = (radius + this.enemySegmentRadiusCells()) ** 2;
    let nearestIndex: number | null = null;
    let nearestDistance = segmentRadiusSquared;
    for (let index = 0; index < target.segments.length; index += 1) {
      const distance = distanceSquared(blade, target.segments[index]);
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearestIndex = index;
    }
    return nearestIndex;
  }

  private updateModules(player: PlayerEntity, delta: number): void {
    for (const segment of player.segments) {
      if (!segment.module) continue;
      segment.timer -= delta;
      segment.orbit += delta * (segment.module === 'blade' ? MODULE_BLADE_ORBIT_SPEED : 3.8);

      if (segment.module === 'shield') {
        const maximumCharges = MODULE_PROGRESSION.effects.shieldMaximumCharges();
        const cooldown = this.activeModuleCooldown(
          player,
          'shield',
          segment.moduleLevel,
          MODULE_PROGRESSION.effects.armorCooldownRateBonus(this.moduleCount(player, 'armor')),
        );
        if (player.shieldCharges < maximumCharges) {
          if (segment.timer <= 0) {
            player.shieldCharges = Math.min(maximumCharges, player.shieldCharges + 1);
            segment.timer = cooldown;
            this.ring(segment.col, segment.row, MODULE_BY_ID.shield.color, 0.5, 10, 1, player.entityId);
            this.effectSound('shield', player.entityId);
          }
        } else segment.timer = cooldown;
        continue;
      }

      if (segment.module === 'phase') {
        if (!segment.ready) {
          segment.cooldown -= delta;
          if (segment.cooldown <= 0) {
            segment.ready = true;
            this.ring(segment.col, segment.row, MODULE_BY_ID[segment.module].color, 0.5, 10, 55, player.entityId, 'pixels');
          }
        }
        continue;
      }

      if (segment.module === 'blade') {
        const bladeCount = MODULE_PROGRESSION.effects.bladeCount(segment.moduleLevel);
        const bladeRadius = this.pixelsToCells(MODULE_PROGRESSION.effects.bladeBaseSizePixels() * PROJECTILE_SIZE_SCALE);
        for (let bladeIndex = 0; bladeIndex < bladeCount; bladeIndex += 1) {
          const angle = segment.orbit + bladeIndex * TAU / bladeCount;
          const blade = { col: segment.col + Math.cos(angle) * 2.9, row: segment.row + Math.sin(angle) * 2.9 };
          for (const target of this.enemies) {
            if (target.dead) continue;
            const hitSegmentIndex = this.bladeHitSegmentIndex(target, blade, bladeRadius);
            if (hitSegmentIndex !== null) this.damageTarget(player, target, 1, blade, MODULE_BY_ID.blade.color, hitSegmentIndex);
          }
        }
        continue;
      }

      if (segment.module === 'saw') {
        for (const target of this.enemies) {
          if (
            target.dead
            || (target.sawCooldownsByPlayer.get(player.entityId) ?? 0) > 0
            || !this.pointHitsTarget(segment, 0.82, target)
          ) continue;
          target.sawCooldownsByPlayer.set(player.entityId, this.activeModuleCooldown(player, 'saw', segment.moduleLevel));
          this.damageTarget(player, target, 1, segment, MODULE_BY_ID.saw.color);
          this.ring(segment.col, segment.row, MODULE_BY_ID.saw.color, 0.3, 5, 0.82, player.entityId);
          this.playSkillSound(player, 'saw');
        }
        continue;
      }

      if (segment.module === 'regen' && segment.timer <= 0) {
        const distance = this.pixelsToCells(this.randomBetween(85, 130));
        const angle = this.randomBetween(0, TAU);
        const point = { col: segment.col + Math.cos(angle) * distance, row: segment.row + Math.sin(angle) * distance };
        this.spawnFood(point, true);
        this.playSkillSound(player, 'regen');
        this.ring(point.col, point.row, MODULE_BY_ID.regen.color, 0.9, 8, 53, player.entityId, 'pixels');
        segment.timer = this.activeModuleCooldown(player, 'regen', segment.moduleLevel);
        continue;
      }

      if (segment.module === 'nursery' && segment.timer <= 0) {
        const tail = player.segments.at(-1) ?? player;
        this.spawnFood(tail, true);
        this.playSkillSound(player, 'regen');
        this.ring(tail.col, tail.row, MODULE_BY_ID.nursery.color, 0.75, 6, 0.9, player.entityId);
        segment.timer = this.activeModuleCooldown(player, 'nursery', segment.moduleLevel);
        continue;
      }

      if (segment.timer > 0) continue;
      const target = this.nearestTarget(player, segment, Number.POSITIVE_INFINITY);
      if (TARGET_REQUIRED_MODULES.has(segment.module) && !target) {
        segment.timer = 0;
        continue;
      }
      switch (segment.module) {
        case 'spark':
          this.createProjectile(player, segment, this.randomBetween(0, TAU), { color: MODULE_BY_ID.spark.color, speed: 390, size: 4.5 });
          this.playSkillSound(player, 'spark');
          segment.timer = this.activeModuleCooldown(player, 'spark', segment.moduleLevel);
          break;
        case 'frost':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.frost.color, speed: 310, size: 5, permanentSlow: MODULE_PROGRESSION.effects.frostSlowPerHit() })) this.playSkillSound(player, 'frost');
          segment.timer = this.activeModuleCooldown(player, 'frost', segment.moduleLevel);
          break;
        case 'prism':
          if (target) {
            for (const offset of [-0.17, 0, 0.17]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.prism.color, speed: 330, angleOffset: offset });
            this.playSkillSound(player, 'prism');
          }
          segment.timer = this.activeModuleCooldown(player, 'prism', segment.moduleLevel);
          break;
        case 'nova':
          {
            const targetRef = target ? this.targetRef(target) : null;
            for (let index = 0; index < 8; index += 1) {
              const angle = index * TAU / 8 + segment.orbit * 0.15;
              this.createProjectile(player, segment, angle, { speed: 250, color: MODULE_BY_ID.nova.color, size: 4.4 }, targetRef);
            }
            this.playSkillSound(player, 'nova');
            this.ring(segment.col, segment.row, MODULE_BY_ID.nova.color, 0.45, 8, 53, player.entityId, 'pixels');
            segment.timer = this.activeModuleCooldown(player, 'nova', segment.moduleLevel);
            break;
          }
        case 'tesla':
          if (target) {
            this.fireTesla(player, segment, target);
            this.playSkillSound(player, 'tesla');
          }
          segment.timer = this.activeModuleCooldown(player, 'tesla', segment.moduleLevel);
          break;
        case 'laser':
          if (target) {
            this.damageTarget(player, target.enemy, 1, target.node, MODULE_BY_ID.laser.color);
            this.beam('beam', segment, target.node, MODULE_BY_ID.laser.color, 0.2, player.entityId);
            this.playSkillSound(player, 'laser');
          }
          segment.timer = this.activeModuleCooldown(player, 'laser', segment.moduleLevel);
          break;
        case 'missile':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.missile.color, speed: 230, size: 6, homing: 4.2 })) this.playSkillSound(player, 'missile');
          segment.timer = this.activeModuleCooldown(player, 'missile', segment.moduleLevel);
          break;
        case 'mine':
          this.addHazard({ id: this.allocateHazardId(), ownerEntityId: player.entityId, kind: 'mine', col: segment.col, row: segment.row, life: Number.POSITIVE_INFINITY, arm: 0.55, radius: this.pixelsToCells(62), color: MODULE_BY_ID.mine.color, phase: this.randomBetween(0, TAU) });
          this.playSkillSound(player, 'mine');
          segment.timer = this.activeModuleCooldown(player, 'mine', segment.moduleLevel);
          break;
        case 'pulse':
          this.firePulse(player, segment);
          this.playSkillSound(player, 'pulse');
          segment.timer = this.activeModuleCooldown(player, 'pulse', segment.moduleLevel);
          break;
        case 'venom':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.venom.color, speed: 285, size: 5.5, poison: 1 })) this.playSkillSound(player, 'venom');
          segment.timer = this.activeModuleCooldown(player, 'venom', segment.moduleLevel);
          break;
        case 'rail':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.rail.color, speed: 520, size: 4.8, pierce: -1 })) this.playSkillSound(player, 'rail');
          segment.timer = this.activeModuleCooldown(player, 'rail', segment.moduleLevel);
          break;
        case 'ricochet':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.ricochet.color, speed: 340, size: 5.2, bounces: -1 })) this.playSkillSound(player, 'ricochet');
          segment.timer = this.activeModuleCooldown(player, 'ricochet', segment.moduleLevel);
          break;
        case 'cluster':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.cluster.color, speed: 245, size: 7, homing: 3.6, blastRadiusCells: MODULE_PROGRESSION.effects.clusterBlastRadiusCells() })) this.playSkillSound(player, 'cluster');
          segment.timer = this.activeModuleCooldown(player, 'cluster', segment.moduleLevel);
          break;
        case 'fan':
          if (target) {
            for (const offset of [-0.34, -0.17, 0, 0.17, 0.34]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fan.color, speed: 300, size: 4.6, angleOffset: offset });
            this.playSkillSound(player, 'fan');
          }
          segment.timer = this.activeModuleCooldown(player, 'fan', segment.moduleLevel);
          break;
        case 'gravity':
          if (target) {
            const point = { col: segment.col, row: segment.row };
            this.addHazard({ id: this.allocateHazardId(), ownerEntityId: player.entityId, kind: 'gravity', ...point, life: 6, arm: 0, radius: this.pixelsToCells(95), color: MODULE_BY_ID.gravity.color, phase: this.randomBetween(0, TAU) });
            this.playSkillSound(player, 'gravity');
          }
          segment.timer = this.activeModuleCooldown(player, 'gravity', segment.moduleLevel);
          break;
        case 'needle':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.needle.color, speed: 560, size: 3.8, pierce: 1 })) this.playSkillSound(player, 'needle');
          segment.timer = this.activeModuleCooldown(player, 'needle', segment.moduleLevel);
          break;
        case 'mortar':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.mortar.color, speed: 205, size: 8, homing: 3.2, blastRadius: 92 })) this.playSkillSound(player, 'mortar');
          segment.timer = this.activeModuleCooldown(player, 'mortar', segment.moduleLevel);
          break;
        case 'sweep':
          if (target && this.fireSweepBeam(player, segment, target)) this.playSkillSound(player, 'sweep');
          segment.timer = this.activeModuleCooldown(player, 'sweep', segment.moduleLevel);
          break;
        case 'sniper':
          if (target) {
            this.damageTarget(player, target.enemy, 2, target.node, MODULE_BY_ID.sniper.color);
            this.beam('beam', segment, target.node, MODULE_BY_ID.sniper.color, 0.28, player.entityId);
            this.playSkillSound(player, 'sniper');
          }
          segment.timer = this.activeModuleCooldown(player, 'sniper', segment.moduleLevel);
          break;
        case 'flak':
          if (target && this.fireFlakBurst(player, target)) this.playSkillSound(player, 'flak');
          segment.timer = this.activeModuleCooldown(player, 'flak', segment.moduleLevel);
          break;
        case 'fork':
          if (target) {
            this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: -0.24, homing: 2.5 });
            this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: 0.24, homing: 2.5 });
            this.playSkillSound(player, 'fork');
          }
          segment.timer = this.activeModuleCooldown(player, 'fork', segment.moduleLevel);
          break;
        case 'anchor':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.anchor.color, speed: 180, size: 8.5, homing: 2, slow: 4.2 })) this.playSkillSound(player, 'anchor');
          segment.timer = this.activeModuleCooldown(player, 'anchor', segment.moduleLevel);
          break;
        case 'flare':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.flare.color, speed: 270, size: 5.8, poison: 4 })) this.playSkillSound(player, 'flare');
          segment.timer = this.activeModuleCooldown(player, 'flare', segment.moduleLevel);
          break;
        case 'scatter':
          if (target) {
            for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.scatter.color, speed: 305, size: 4.2, angleOffset: offset });
            this.playSkillSound(player, 'scatter');
          }
          segment.timer = this.activeModuleCooldown(player, 'scatter', segment.moduleLevel);
          break;
        case 'lance':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.lance.color, speed: 590, size: 7, pierce: 5 })) this.playSkillSound(player, 'lance');
          segment.timer = this.activeModuleCooldown(player, 'lance', segment.moduleLevel);
          break;
        case 'execute': {
          const executionTarget = this.nearestTarget(player, segment, Number.POSITIVE_INFINITY, (enemy) => enemy.segments.length === 0);
          if (!executionTarget) {
            segment.timer = 0;
            break;
          }
          this.damageTarget(player, executionTarget.enemy, 1, executionTarget.node, MODULE_BY_ID.execute.color, -1);
          this.beam('beam', segment, executionTarget.node, MODULE_BY_ID.execute.color, 0.2, player.entityId);
          this.playSkillSound(player, 'execute');
          segment.timer = this.activeModuleCooldown(player, 'execute', segment.moduleLevel);
          break;
        }
        case 'crossfire':
          if (target) {
            this.fireCrossfire(player, segment, target);
            this.playSkillSound(player, 'crossfire');
          }
          segment.timer = this.activeModuleCooldown(player, 'crossfire', segment.moduleLevel);
          break;
        case 'phasebolt':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.phasebolt.color, speed: 320, size: 6, bounces: -1, homing: 1.6 })) this.playSkillSound(player, 'phasebolt');
          segment.timer = this.activeModuleCooldown(player, 'phasebolt', segment.moduleLevel);
          break;
        default:
          break;
      }
    }

    const repulse = this.moduleCount(player, 'repulse');
    if (repulse > 0) {
      const range = this.pixelsToCells(MODULE_PROGRESSION.effects.repulseRangePixels(repulse));
      for (const target of this.enemies) {
        if (!target.dead && Math.sqrt(distanceSquared(player, target)) < range) target.desiredAngle = Math.atan2(target.row - player.row, target.col - player.col);
      }
    }
  }

  private playSkillSound(player: PlayerEntity, moduleId: ModuleId | 'saw'): void {
    const sounds: Partial<Record<ModuleId | 'saw', Extract<UltraEffect, { type: 'sound' }>['kind']>> = {
      frost: 'frost', tesla: 'electric', nova: 'nova', laser: 'laser', mine: 'mine', pulse: 'pulse', regen: 'regen',
    };
    this.effectSound(sounds[moduleId] ?? 'skill', player.entityId);
  }

  private spawnShot(player: PlayerEntity, origin: GridPoint, target: EnemyTargetSelection | null, options: ShotOptions = {}): boolean {
    if (!target || !this.isTargetAlive(target.enemy)) return false;
    const angle = Math.atan2(target.node.row - origin.row, target.node.col - origin.col) + (options.angleOffset ?? 0);
    this.createProjectile(player, origin, angle, options, this.targetRef(target));
    return true;
  }

  private createProjectile(player: PlayerEntity, origin: GridPoint, angle: number, options: ShotOptions, target: TargetRef | null = null): void {
    const guidance = this.moduleCount(player, 'guidance');
    const guidanceMultiplier = 1 + MODULE_PROGRESSION.effects.guidanceProjectileSpeedBonus(guidance);
    const speed = this.pixelsToCells((options.speed ?? 300) * guidanceMultiplier * PROJECTILE_SPEED_SCALE);
    const projectile: ProjectileEntity = {
      id: this.allocateProjectileId(),
      ownerEntityId: player.entityId,
      col: origin.col,
      row: origin.row,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      life: Number.POSITIVE_INFINITY,
      color: options.color ?? '#dffcff',
      size: (options.size ?? 4) * PROJECTILE_SIZE_SCALE,
      pierce: options.pierce ?? 0,
      bounces: options.bounces ?? 0,
      blastRadius: options.blastRadiusCells ?? (options.blastRadius ? this.pixelsToCells(options.blastRadius) : 0),
      slow: options.slow ?? 0,
      poison: options.poison ?? 0,
      permanentSlow: options.permanentSlow ?? 0,
      homing: (options.homing ?? 0) + MODULE_PROGRESSION.effects.guidanceHomingBonus(guidance),
      target: options.homing || guidance ? target : null,
      hitNodes: new Set(),
    };
    this.projectiles.push(projectile);
    this.pendingProjectileEvents.push({ type: 'spawn', projectile: toProjectileState(projectile) });
  }

  private fireTesla(player: PlayerEntity, origin: GridPoint, first: EnemyTargetSelection): void {
    const hit: EnemyEntity[] = [];
    let current: EnemyTargetSelection | null = first;
    let from = origin;
    for (let jump = 0; jump < 3 && current; jump += 1) {
      hit.push(current.enemy);
      this.damageTarget(player, current.enemy, 1, current.node, MODULE_BY_ID.tesla.color);
      this.beam('lightning', from, current.node, MODULE_BY_ID.tesla.color, 0.24, player.entityId);
      from = current.node;
      let next: EnemyTargetSelection | null = null;
      let best = this.pixelsToCells(155) ** 2;
      for (const target of this.enemies) {
        if (target.dead || hit.includes(target)) continue;
        const candidate = this.nearestJointOnTarget(from, target);
        if (candidate.distanceSquared >= best) continue;
        best = candidate.distanceSquared;
        next = candidate;
      }
      current = next;
    }
  }

  private circularTargetHitIndexes(origin: GridPoint, radius: number, target: EnemyEntity): number[] {
    const hits: number[] = [];
    if (distanceSquared(origin, target) < (radius + ENEMY_HEAD_RADIUS_CELLS) ** 2) hits.push(-1);
    const segmentRadiusSquared = (radius + this.enemySegmentRadiusCells()) ** 2;
    for (let index = 0; index < target.segments.length; index += 1) {
      if (distanceSquared(origin, target.segments[index]) < segmentRadiusSquared) hits.push(index);
    }
    return hits;
  }

  private lineTargetHitIndexes(origin: GridPoint, directionCol: number, directionRow: number, range: number, halfWidth: number, target: EnemyEntity): number[] {
    const hits: number[] = [];
    for (let index = -1; index < target.segments.length; index += 1) {
      const node = index < 0 ? target : target.segments[index];
      const relativeCol = node.col - origin.col;
      const relativeRow = node.row - origin.row;
      const projection = relativeCol * directionCol + relativeRow * directionRow;
      if (projection < 0 || projection > range) continue;
      const perpendicular = Math.abs(relativeCol * directionRow - relativeRow * directionCol);
      const nodeRadius = index < 0 ? ENEMY_HEAD_RADIUS_CELLS : this.enemySegmentRadiusCells();
      if (perpendicular <= halfWidth + nodeRadius) hits.push(index);
    }
    return hits;
  }

  private damageTargetParts(owner: PlayerEntity, target: EnemyEntity, hitIndexes: number[], point: GridPoint, color: string): void {
    const bodyIndexes = [...new Set(hitIndexes.filter((index) => index >= 0))].sort((left, right) => right - left);
    const hitsHead = hitIndexes.includes(-1);
    for (const index of bodyIndexes) {
      if (target.dead || index >= target.segments.length) continue;
      this.damageTarget(owner, target, 1, target.segments[index], color, index);
    }
    if (!target.dead && hitsHead) this.damageTarget(owner, target, 1, point, color, -1);
  }

  private firePulse(player: PlayerEntity, origin: GridPoint): void {
    const radius = MODULE_PROGRESSION.effects.pulseRadiusCells();
    this.ring(origin.col, origin.row, MODULE_BY_ID.pulse.color, 0.55, 16, radius, player.entityId);
    for (const target of this.enemies) {
      if (target.dead) continue;
      const hits = this.circularTargetHitIndexes(origin, radius, target);
      if (hits.length > 0) this.damageTargetParts(player, target, hits, origin, MODULE_BY_ID.pulse.color);
    }
  }

  private fireSweepBeam(player: PlayerEntity, origin: GridPoint, target: EnemyTargetSelection): boolean {
    const angle = Math.atan2(target.node.row - origin.row, target.node.col - origin.col);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const range = this.arenaSize * 1.15;
    const end = { col: origin.col + directionX * range, row: origin.row + directionY * range };
    let hits = 0;
    for (const hostile of this.enemies) {
      if (hostile.dead) continue;
      const hitIndexes = this.lineTargetHitIndexes(origin, directionX, directionY, range, this.pixelsToCells(26), hostile);
      if (hitIndexes.length === 0) continue;
      this.damageTargetParts(player, hostile, hitIndexes, hostile, MODULE_BY_ID.sweep.color);
      hits += hitIndexes.length;
    }
    this.beam('beam', origin, end, MODULE_BY_ID.sweep.color, 0.24, player.entityId);
    return hits > 0;
  }

  private fireFlakBurst(player: PlayerEntity, target: EnemyTargetSelection): boolean {
    const radius = this.pixelsToCells(84);
    let hits = 0;
    this.ring(target.node.col, target.node.row, MODULE_BY_ID.flak.color, 0.5, 8, radius, player.entityId);
    this.burst(target.node.col, target.node.row, MODULE_BY_ID.flak.color, 18, 155, player.entityId);
    for (const hostile of this.enemies) {
      if (hostile.dead) continue;
      const hitIndexes = this.circularTargetHitIndexes(target.node, radius, hostile);
      if (hitIndexes.length === 0) continue;
      this.damageTargetParts(player, hostile, hitIndexes, target.node, MODULE_BY_ID.flak.color);
      hits += hitIndexes.length;
    }
    return hits > 0;
  }

  private fireCrossfire(player: PlayerEntity, origin: GridPoint, target: EnemyTargetSelection): void {
    const baseAngle = Math.atan2(target.node.row - origin.row, target.node.col - origin.col);
    const targetRef = this.targetRef(target);
    for (let index = 0; index < 4; index += 1) this.createProjectile(player, origin, baseAngle + index * Math.PI / 2, { speed: 285, color: MODULE_BY_ID.crossfire.color, size: 6.2, pierce: 1 }, targetRef);
    this.ring(origin.col, origin.row, MODULE_BY_ID.crossfire.color, 0.4, 5, 1, player.entityId);
  }

  private updateTargetStatuses(delta: number): void {
    for (const target of this.enemies) {
      for (const [playerId, cooldown] of target.sawCooldownsByPlayer) {
        const next = cooldown - delta;
        if (next > 0) target.sawCooldownsByPlayer.set(playerId, next);
        else target.sawCooldownsByPlayer.delete(playerId);
      }
      if (target.slow > 0) target.slow -= delta;
      if (target.poisonStacks <= 0) continue;
      target.poisonTimer -= delta;
      if (target.poisonTimer > 0) continue;
      target.poisonTimer = POISON_TICK_INTERVAL;
      const owner = target.poisonOwnerEntityId === null ? null : this.playersByEntity.get(target.poisonOwnerEntityId) ?? null;
      for (let stack = 0; stack < target.poisonStacks && !target.dead && target.segments.length > 0; stack += 1) {
        const hitSegmentIndex = Math.floor(this.random() * target.segments.length);
        this.damageTarget(owner, target, 1, target.segments[hitSegmentIndex], target.poisonColor ?? MODULE_BY_ID.venom.color, hitSegmentIndex);
      }
    }
  }

  private nearestPlayer(origin: GridPoint, players: readonly PlayerEntity[]): PlayerEntity | null {
    let nearest: PlayerEntity | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const player of players) {
      const distance = distanceSquared(origin, player);
      if (distance >= bestDistance) continue;
      bestDistance = distance;
      nearest = player;
    }
    return nearest;
  }

  private densestFood(origin: GridPoint, candidates: readonly FoodEntity[], radius: number): FoodEntity | null {
    if (candidates.length === 0) return null;
    const radiusSquared = radius * radius;
    let selected = candidates[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      let cluster = 0;
      for (const other of candidates) if (distanceSquared(candidate, other) <= radiusSquared) cluster += 1;
      const score = cluster * 4 - distanceSquared(candidate, origin) * 0.02;
      if (score <= bestScore) continue;
      bestScore = score;
      selected = candidate;
    }
    return selected;
  }

  private chooseEnemyIntent(enemy: EnemyEntity): void {
    enemy.wobble += this.randomBetween(-1.2, 1.2);
    if (enemy.archetype === 'charger') {
      enemy.targetFoodId = null;
      enemy.behaviorState = 'roam';
      return;
    }
    if (enemy.archetype === 'cutter') {
      enemy.targetFoodId = null;
      enemy.behaviorState = 'intercept';
      return;
    }
    const candidates = this.nearestFoods(enemy, ENEMY_FOOD_SEARCH_LIMIT);
    switch (enemy.archetype) {
      case 'scout': {
        const target = candidates[0];
        enemy.targetFoodId = target && distanceSquared(enemy, target) <= DESIGNER_BALANCE.enemyScoutFoodRange ** 2 ? target.id : null;
        enemy.behaviorState = enemy.targetFoodId === null ? 'roam' : 'forage';
        break;
      }
      case 'courier': {
        const target = this.densestFood(enemy, candidates, DESIGNER_BALANCE.enemyCourierFoodClusterRadius);
        enemy.targetFoodId = target?.id ?? null;
        enemy.behaviorState = target ? 'forage' : 'roam';
        break;
      }
      case 'coiler': {
        const target = this.densestFood(enemy, candidates, DESIGNER_BALANCE.enemyCoilerOrbitRadius);
        enemy.targetFoodId = target?.id ?? null;
        enemy.behaviorState = target ? 'orbit' : 'roam';
        break;
      }
      case 'warden':
        enemy.targetFoodId = candidates[0]?.id ?? null;
        enemy.behaviorState = 'escort';
        break;
      default:
        enemy.targetFoodId = candidates.length > 0
          ? candidates[Math.floor(Math.pow(this.random(), 1.8) * candidates.length)].id
          : null;
        enemy.behaviorState = enemy.targetFoodId === null ? 'roam' : 'forage';
        break;
    }
  }

  private steerEnemy(enemy: EnemyEntity, players: readonly PlayerEntity[]): void {
    const targetFood = enemy.targetFoodId === null ? null : this.foodsById.get(enemy.targetFoodId) ?? null;
    if (enemy.archetype === 'charger') {
      const target = this.nearestPlayer(enemy, players);
      if (target) {
        const ideal = Math.atan2(target.row - enemy.row, target.col - enemy.col);
        const sway = (
          Math.sin(this.gameTime * 1.7 + enemy.wobble) * 0.72
          + Math.sin(this.gameTime * 0.47 + enemy.id) * 0.28
        ) * DESIGNER_BALANCE.enemyChargerTrackingWobble;
        enemy.desiredAngle = ideal + sway;
      }
      enemy.behaviorPhase = 0;
      return;
    }
    if (enemy.behaviorState === 'intercept') {
      const target = this.nearestPlayer(enemy, players);
      if (!target) return;
      const side = Math.sin(enemy.wobble) >= 0 ? 1 : -1;
      const targetCol = target.col
        + Math.cos(target.angle) * DESIGNER_BALANCE.enemyCutterLeadDistance
        + Math.cos(target.angle + side * Math.PI / 2) * DESIGNER_BALANCE.enemyCutterLateralDistance;
      const targetRow = target.row
        + Math.sin(target.angle) * DESIGNER_BALANCE.enemyCutterLeadDistance
        + Math.sin(target.angle + side * Math.PI / 2) * DESIGNER_BALANCE.enemyCutterLateralDistance;
      enemy.desiredAngle = Math.atan2(targetRow - enemy.row, targetCol - enemy.col);
      enemy.behaviorPhase = 0.5 + side * 0.5;
      return;
    }
    if (enemy.behaviorState === 'orbit' && targetFood) {
      const radialAngle = Math.atan2(targetFood.row - enemy.row, targetFood.col - enemy.col);
      const distance = Math.sqrt(distanceSquared(enemy, targetFood));
      const orbitDirection = enemy.id % 2 === 0 ? 1 : -1;
      const tangent = radialAngle + orbitDirection * Math.PI / 2;
      const radialError = (distance - DESIGNER_BALANCE.enemyCoilerOrbitRadius) / DESIGNER_BALANCE.enemyCoilerOrbitRadius;
      const correctionTarget = radialError >= 0 ? radialAngle : radialAngle + Math.PI;
      const correction = clamp(Math.abs(radialError) * DESIGNER_BALANCE.enemyCoilerRadialCorrection, 0, 0.88);
      enemy.desiredAngle = tangent + angleDifference(tangent, correctionTarget) * correction;
      enemy.behaviorPhase = (this.gameTime * 0.25 + enemy.id * 0.17) % 1;
      return;
    }
    if (enemy.behaviorState === 'escort') {
      let carrier: EnemyEntity | null = null;
      for (const candidate of this.enemies) {
        if (candidate === enemy || candidate.dead || candidate.captured <= 0) continue;
        if (!carrier || candidate.captured > carrier.captured) carrier = candidate;
      }
      if (carrier) {
        const side = enemy.id % 2 === 0 ? 1 : -1;
        const angle = carrier.angle + side * Math.PI / 2;
        const targetCol = carrier.col + Math.cos(angle) * DESIGNER_BALANCE.enemyWardenEscortDistance;
        const targetRow = carrier.row + Math.sin(angle) * DESIGNER_BALANCE.enemyWardenEscortDistance;
        enemy.desiredAngle = Math.atan2(targetRow - enemy.row, targetCol - enemy.col);
        enemy.behaviorPhase = clamp(carrier.captured / 8, 0, 1);
        return;
      }
    }
    if (targetFood) {
      const ideal = Math.atan2(targetFood.row - enemy.row, targetFood.col - enemy.col);
      const error = Math.sin(this.gameTime * 1.7 + enemy.wobble) * 0.42 + Math.sin(this.gameTime * 0.47 + enemy.id) * 0.2;
      enemy.desiredAngle = ideal + error;
      enemy.behaviorPhase = 0;
      return;
    }
    enemy.targetFoodId = null;
    enemy.behaviorState = 'roam';
    enemy.behaviorPhase = 0;
    enemy.desiredAngle += Math.sin(this.gameTime + enemy.wobble) * 0.05;
  }

  private steerEnemyAwayFromWalls(enemy: EnemyEntity): void {
    const lookaheadDistance = Math.max(ENEMY_WALL_AVOIDANCE_DISTANCE, enemy.speed * ENEMY_THINK_INTERVAL_MAX);
    const projectedCol = enemy.col + Math.cos(enemy.angle) * lookaheadDistance;
    const projectedRow = enemy.row + Math.sin(enemy.angle) * lookaheadDistance;
    const safeMinimum = this.arenaMinimum() + ENEMY_WALL_AVOIDANCE_DISTANCE;
    const safeMaximum = this.arenaMaximum() - ENEMY_WALL_AVOIDANCE_DISTANCE;
    let escapeCol = 0;
    let escapeRow = 0;
    if (projectedCol < safeMinimum) escapeCol += safeMinimum - projectedCol;
    if (projectedCol > safeMaximum) escapeCol -= projectedCol - safeMaximum;
    if (projectedRow < safeMinimum) escapeRow += safeMinimum - projectedRow;
    if (projectedRow > safeMaximum) escapeRow -= projectedRow - safeMaximum;
    if (Math.hypot(escapeCol, escapeRow) > 0.001) enemy.desiredAngle = Math.atan2(escapeRow, escapeCol);
  }

  private updateEnemies(delta: number, activePlayers: PlayerEntity[], presentPlayers: PlayerEntity[]): void {
    const chronosMultiplier = 1 - MODULE_PROGRESSION.effects.chronosSlowReduction(this.maximumModuleCount('chronos', presentPlayers));
    const timeSpeedMultiplier = Math.min(ENEMY_SPEED_MAX_MULTIPLIER, 1 + this.gameTime / 60 * ENEMY_SPEED_PER_MINUTE);
    const collisionPlayers = this.stepCollisionPlayers;
    collisionPlayers.length = 0;
    for (const player of presentPlayers) if (player.autopilot || player.paused || player.choosingUpgrade) collisionPlayers.push(player);
    this.ensureFoodIndexes();
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.collisionCooldown = Math.max(0, enemy.collisionCooldown - delta);
      if (enemy.collisionCooldown <= 0) {
        enemy.think -= delta;
        if (enemy.think <= 0) {
          enemy.think = this.randomBetween(ENEMY_THINK_INTERVAL_MIN, ENEMY_THINK_INTERVAL_MAX);
          this.chooseEnemyIntent(enemy);
        }
        this.steerEnemy(enemy, presentPlayers);
        const avoidance = ENEMY_PLAYER_BODY_AVOIDANCE.has(enemy.archetype)
          ? this.playerBodyAvoidance(enemy, presentPlayers)
          : null;
        if (avoidance) {
          const priorityStrength = enemy.archetype === 'courier' || enemy.archetype === 'charger'
            ? avoidance.priorityStrength
            : avoidance.strength;
          enemy.desiredAngle += angleDifference(enemy.desiredAngle, avoidance.angle) * priorityStrength;
        }
        this.steerEnemyAwayFromWalls(enemy);
        enemy.angle = rotateToward(enemy.angle, enemy.desiredAngle, delta * enemy.turnRate);
      }
      const speed = enemy.speed * timeSpeedMultiplier * chronosMultiplier * (enemy.slow > 0 ? 0.55 : 1) * (1 - enemy.permanentSlow);
      const previousPosition = this.enemyMovementStart;
      previousPosition.col = enemy.col;
      previousPosition.row = enemy.row;
      const nextCol = enemy.col + (Math.cos(enemy.angle) * speed + enemy.knockbackX) * delta;
      const nextRow = enemy.row + (Math.sin(enemy.angle) * speed + enemy.knockbackY) * delta;
      const nextPosition = this.enemyMovementEnd;
      nextPosition.col = nextCol;
      nextPosition.row = nextRow;
      const playerCollision = this.findPlayerCollision(enemy, previousPosition, nextPosition, collisionPlayers);
      if (playerCollision) {
        enemy.col = previousPosition.col + (nextCol - previousPosition.col) * playerCollision.progress;
        enemy.row = previousPosition.row + (nextRow - previousPosition.row) * playerCollision.progress;
        if (playerCollision.kind === 'protected') {
          this.bounceEntity(
            enemy,
            enemy.col - playerCollision.point.col,
            enemy.row - playerCollision.point.row,
            PLAYER_COLORS[playerCollision.player.colorIndex],
            SNAKE_SEGMENT_SPACING,
          );
        } else if (playerCollision.kind === 'body') {
          const thorns = this.moduleCount(playerCollision.player, 'thorns');
          const thornsReady = thorns > 0 && playerCollision.player.thornsCooldown <= 0;
          this.killEnemy(enemy, playerCollision.player);
          if (thornsReady) {
            this.triggerBodyIntercept(playerCollision.player, playerCollision.point, enemy);
            playerCollision.player.thornsCooldown = this.activeModuleCooldown(playerCollision.player, 'thorns', thorns);
          }
        } else {
          const normal = collisionNormal(playerCollision.player, enemy);
          this.applyPlayerCollisionAttack(playerCollision.player, enemy, enemy, -1, true);
          const knockbackMultiplier = enemy.archetype === 'warden' ? DESIGNER_BALANCE.enemyWardenKnockbackMultiplier : 1;
          this.bounceEntity(playerCollision.player, normal.col, normal.row, '#dffcff', SNAKE_SEGMENT_SPACING, knockbackMultiplier, true);
          if (!enemy.dead) this.bounceEntity(enemy, -normal.col, -normal.row, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_PROGRESSION.effects.momentumKnockbackBonus(this.moduleCount(playerCollision.player, 'momentum')));
        }
        continue;
      }
      const wallNormal = wallBounceNormal(nextCol, nextRow, this.arenaMinimum(), this.arenaMaximum());
      if (wallNormal) {
        enemy.col = clamp(nextCol, this.arenaMinimum(), this.arenaMaximum());
        enemy.row = clamp(nextRow, this.arenaMinimum(), this.arenaMaximum());
        this.damageTarget(null, enemy, ENEMY_COLLISION_DAMAGE * this.enemyWallDamageMultiplier, enemy, '#f3c600', -1);
        if (!enemy.dead) this.bounceEntity(enemy, wallNormal.col, wallNormal.row, enemy.color, SNAKE_SEGMENT_SPACING, this.enemyWallKnockbackMultiplier);
        continue;
      }
      enemy.col = nextCol;
      enemy.row = nextRow;
      this.applyKnockbackDecay(enemy, delta);
      followEnemySegments(enemy, delta, SNAKE_SEGMENT_SPACING);
      if (enemy.collisionCooldown <= 0) {
        const ownBodyHit = findSelfCollision(enemy, ENEMY_SELF_COLLISION_RANGE);
        if (ownBodyHit) {
          this.bounceEntity(enemy, enemy.col - ownBodyHit.col, enemy.row - ownBodyHit.row, enemy.color, SNAKE_SEGMENT_SPACING);
          continue;
        }
      }
      const foodContact = this.enemyFoodContact(enemy);
      if (foodContact) {
        this.removeFoodAt(foodContact.index);
        enemy.captured += 1;
        enemy.targetFoodId = null;
        this.burst(foodContact.collector.col, foodContact.collector.row, enemy.color, 5, 55);
        this.textEffect(foodContact.collector.col, foodContact.collector.row - 0.4, `×${enemy.captured}`, enemy.color, 0.55);
      }
    }
    this.resolveEnemyCollisions();
  }

  private findPlayerCollision(enemy: EnemyEntity, start: GridPoint, end: GridPoint, presentPlayers: PlayerEntity[]):
    | { kind: 'head'; player: PlayerEntity; progress: number }
    | { kind: 'body'; player: PlayerEntity; point: GridPoint; progress: number }
    | { kind: 'protected'; player: PlayerEntity; point: GridPoint; progress: number }
    | null {
    let nearest:
      | { kind: 'head'; player: PlayerEntity; progress: number }
      | { kind: 'body'; player: PlayerEntity; point: GridPoint; progress: number }
      | { kind: 'protected'; player: PlayerEntity; point: GridPoint; progress: number }
      | null = null;
    for (const player of presentPlayers) {
      const protectedPlayer = this.isPlayerProtected(player);
      if ((protectedPlayer || player.collisionCooldown <= 0) && enemy.collisionCooldown <= 0) {
        const headProgress = sweptContactProgress(start, end, player, this.playerHeadRadiusCells() + ENEMY_HEAD_RADIUS_CELLS);
        if (headProgress !== null && (!nearest || headProgress < nearest.progress)) {
          nearest = protectedPlayer
            ? { kind: 'protected', player, point: player, progress: headProgress }
            : { kind: 'head', player, progress: headProgress };
        }
      }
      for (let segmentIndex = 0; segmentIndex < player.segments.length; segmentIndex += 1) {
        if (protectedPlayer && enemy.collisionCooldown > 0) continue;
        const segment = player.segments[segmentIndex];
        const previousSegment = segmentIndex > 0 ? player.segments[segmentIndex - 1] : player;
        const progress = sweptCapsuleContactProgress(start, end, previousSegment, segment, ENEMY_BODY_CONTACT_RANGE);
        if (progress === null || (nearest && nearest.progress <= progress)) continue;
        const collisionPosition = {
          col: start.col + (end.col - start.col) * progress,
          row: start.row + (end.row - start.row) * progress,
        };
        const point = closestPointOnGridSegment(collisionPosition, previousSegment, segment);
        nearest = protectedPlayer
          ? { kind: 'protected', player, point, progress }
          : { kind: 'body', player, point, progress };
      }
    }
    return nearest;
  }

  private resolveEnemyCollisions(): void {
    const headRangeSquared = (ENEMY_HEAD_RADIUS_CELLS * 2) ** 2;
    for (let firstIndex = 0; firstIndex < this.enemies.length; firstIndex += 1) {
      const first = this.enemies[firstIndex];
      if (first.dead || first.collisionCooldown > 0) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < this.enemies.length; secondIndex += 1) {
        const second = this.enemies[secondIndex];
        if (second.dead || second.collisionCooldown > 0) continue;
        if (distanceSquared(first, second) >= headRangeSquared) continue;
        const normal = collisionNormal(first, second);
        this.damageTarget(null, first, ENEMY_COLLISION_DAMAGE, first, second.color, -1);
        this.damageTarget(null, second, ENEMY_COLLISION_DAMAGE, second, first.color, -1);
        if (!first.dead) this.bounceEntity(first, normal.col, normal.row, first.color, SNAKE_SEGMENT_SPACING);
        if (!second.dead) this.bounceEntity(second, -normal.col, -normal.row, second.color, SNAKE_SEGMENT_SPACING);
        break;
      }
    }

    for (const bucket of this.enemyBodyBuckets.values()) {
      bucket.count = 0;
      this.enemyBodyBucketPool.push(bucket);
    }
    this.enemyBodyBuckets.clear();
    const bodyBuckets = this.enemyBodyBuckets;
    for (const owner of this.enemies) {
      if (owner.dead) continue;
      for (const segment of owner.segments) {
        const key = spatialBucketCode(segment.col, segment.row);
        let bucket = bodyBuckets.get(key);
        if (!bucket) {
          bucket = this.enemyBodyBucketPool.pop() ?? { entries: [], count: 0 };
          bucket.count = 0;
          bodyBuckets.set(key, bucket);
        }
        let entry = bucket.entries[bucket.count];
        if (entry) {
          entry.owner = owner;
          entry.segment = segment;
        } else {
          entry = { owner, segment };
          bucket.entries.push(entry);
        }
        bucket.count += 1;
      }
    }
    const bodyRangeSquared = ENEMY_BODY_CONTACT_RANGE ** 2;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.collisionCooldown > 0) continue;
      let bodyHit: EnemyBodyBucketEntry | null = null;
      const minimumCol = Math.floor(enemy.col - ENEMY_BODY_CONTACT_RANGE);
      const maximumCol = Math.floor(enemy.col + ENEMY_BODY_CONTACT_RANGE);
      const minimumRow = Math.floor(enemy.row - ENEMY_BODY_CONTACT_RANGE);
      const maximumRow = Math.floor(enemy.row + ENEMY_BODY_CONTACT_RANGE);
      for (let col = minimumCol; col <= maximumCol && !bodyHit; col += 1) {
        for (let row = minimumRow; row <= maximumRow && !bodyHit; row += 1) {
          const bucket = bodyBuckets.get(spatialBucketCode(col, row));
          if (!bucket) continue;
          for (let index = 0; index < bucket.count; index += 1) {
            const entry = bucket.entries[index];
            if (
              entry.owner === enemy
              || entry.owner.dead
              || !entry.owner.segments.includes(entry.segment)
              || distanceSquared(enemy, entry.segment) >= bodyRangeSquared
            ) continue;
            bodyHit = entry;
            break;
          }
        }
      }
      if (!bodyHit) continue;
      const ownerSegmentIndex = bodyHit.owner.segments.indexOf(bodyHit.segment);
      if (ownerSegmentIndex < 0) continue;
      const normalCol = enemy.col - bodyHit.segment.col;
      const normalRow = enemy.row - bodyHit.segment.row;
      this.damageTarget(null, bodyHit.owner, ENEMY_COLLISION_DAMAGE, bodyHit.segment, enemy.color, ownerSegmentIndex);
      this.damageTarget(null, enemy, ENEMY_COLLISION_DAMAGE, enemy, bodyHit.owner.color, -1);
      if (!enemy.dead) this.bounceEntity(enemy, normalCol, normalRow, enemy.color, SNAKE_SEGMENT_SPACING);
    }
  }

  private playerBodyAvoidance(enemy: EnemyEntity, presentPlayers: PlayerEntity[]): { angle: number; strength: number; priorityStrength: number } | null {
    let combinedX = 0;
    let combinedY = 0;
    let combinedWeight = 0;
    let rawCombinedWeight = 0;
    const forwardX = Math.cos(enemy.desiredAngle);
    const forwardY = Math.sin(enemy.desiredAngle);
    const probeCol = enemy.col + forwardX * 0.7;
    const probeRow = enemy.row + forwardY * 0.7;
    for (const player of presentPlayers) {
      let awayX = 0;
      let awayY = 0;
      let totalWeight = 0;
      for (const segment of player.segments) {
        const toBodyX = segment.col - probeCol;
        const toBodyY = segment.row - probeRow;
        const distance = Math.hypot(toBodyX, toBodyY);
        if (distance <= 0.001 || distance >= 3.2) continue;
        const ahead = (toBodyX * forwardX + toBodyY * forwardY) / distance;
        if (ahead < -0.35) continue;
        const proximity = 1 - distance / 3.2;
        const weight = proximity * proximity * (0.7 + Math.max(0, ahead) * 1.15);
        awayX -= toBodyX / distance * weight;
        awayY -= toBodyY / distance * weight;
        totalWeight += weight;
      }
      if (totalWeight < 0.02) continue;
      const decoyMultiplier = 1 - MODULE_PROGRESSION.effects.decoyAvoidanceReduction(this.moduleCount(player, 'decoy'));
      combinedX += awayX * decoyMultiplier;
      combinedY += awayY * decoyMultiplier;
      combinedWeight += totalWeight * decoyMultiplier;
      rawCombinedWeight += totalWeight;
    }
    if (combinedWeight < 0.02) return null;
    return {
      angle: Math.atan2(combinedY, combinedX),
      strength: clamp(combinedWeight * 1.85, 0.28, 0.96),
      priorityStrength: clamp(combinedWeight / Math.max(0.001, rawCombinedWeight), 0, 1),
    };
  }

  private updateProjectiles(delta: number): void {
    this.refreshProjectileHitBounds();
    const targetsById = this.projectileTargetsById;
    targetsById.clear();
    for (const target of this.enemies) if (!target.dead) targetsById.set(target.id, target);
    for (const projectile of this.projectiles) {
      projectile.life -= delta;
      let endedByImpact = false;
      const owner = this.playersByEntity.get(projectile.ownerEntityId);
      if (!owner || owner.ghost) {
        projectile.life = 0;
        continue;
      }
      const target = projectile.target ? targetsById.get(projectile.target.id) ?? null : null;
      const targetNode = target && projectile.target ? this.resolveTargetNode(target, projectile.target.segmentIndex) : null;
      if (projectile.homing && target && targetNode && this.isTargetAlive(target)) {
        const currentAngle = Math.atan2(projectile.vy, projectile.vx);
        const targetAngle = Math.atan2(targetNode.row - projectile.row, targetNode.col - projectile.col);
        const angle = rotateToward(currentAngle, targetAngle, projectile.homing * delta);
        projectile.vx = Math.cos(angle) * projectile.speed;
        projectile.vy = Math.sin(angle) * projectile.speed;
      }
      const start = this.projectileMovementStart;
      start.col = projectile.col;
      start.row = projectile.row;
      projectile.col += projectile.vx * delta;
      projectile.row += projectile.vy * delta;
      const projectileMinimum = this.projectileMinimum();
      const projectileMaximum = this.projectileMaximum();
      const hitHorizontal = projectile.col < projectileMinimum || projectile.col > projectileMaximum;
      const hitVertical = projectile.row < projectileMinimum || projectile.row > projectileMaximum;
      if (hitHorizontal || hitVertical) {
        if (projectile.bounces !== 0) {
          projectile.col = clamp(projectile.col, projectileMinimum, projectileMaximum);
          projectile.row = clamp(projectile.row, projectileMinimum, projectileMaximum);
          if (hitHorizontal) projectile.vx *= -1;
          if (hitVertical) projectile.vy *= -1;
          if (projectile.bounces > 0) projectile.bounces -= 1;
          this.pendingProjectileEvents.push({ type: 'update', projectile: toProjectileState(projectile) });
        } else projectile.life = 0;
      }
      const end = this.projectileMovementEnd;
      end.col = projectile.col;
      end.row = projectile.row;
      const radius = this.pixelsToCells(projectile.size);
      let contacts: Array<{ hostile: EnemyEntity; node: GridPoint; progress: number; head: boolean; order: number }> | null = null;
      for (let order = 0; order < this.enemies.length; order += 1) {
        const hostile = this.enemies[order];
        if (hostile.dead) continue;
        for (const contact of this.sweptTargetContacts(start, end, radius, hostile)) {
          if (!projectile.hitNodes.has(contact.node)) (contacts ??= []).push({ hostile, ...contact, order });
        }
      }
      if (contacts) {
        contacts.sort((left, right) => left.progress - right.progress || left.order - right.order);
        for (const { hostile, node, progress, head } of contacts) {
          if (hostile.dead || projectile.hitNodes.has(node)) continue;
          const hitPoint = {
            col: start.col + (end.col - start.col) * progress,
            row: start.row + (end.row - start.row) * progress,
          };
          if (projectile.blastRadius > 0) {
            projectile.col = hitPoint.col;
            projectile.row = hitPoint.row;
            this.explodeProjectile(owner, projectile);
            projectile.life = 0;
            endedByImpact = true;
            break;
          }
          const segmentIndex = head ? -1 : hostile.segments.indexOf(node as EnemySegment);
          if (!head && segmentIndex < 0) continue;
          projectile.hitNodes.add(node);
          this.damageTarget(owner, hostile, 1, hitPoint, projectile.color, segmentIndex);
          if (!hostile.dead && projectile.slow) hostile.slow = Math.max(hostile.slow, projectile.slow);
          if (!hostile.dead && projectile.permanentSlow) hostile.permanentSlow = Math.min(MODULE_PROGRESSION.effects.frostMaximumSlow(), hostile.permanentSlow + projectile.permanentSlow);
          if (!hostile.dead && projectile.poison) {
            hostile.poisonStacks += projectile.poison;
            if (hostile.poisonTimer <= 0) hostile.poisonTimer = POISON_TICK_INTERVAL;
            hostile.poisonColor = projectile.color;
            hostile.poisonOwnerEntityId = owner.entityId;
          }
          if (projectile.pierce > 0) projectile.pierce -= 1;
          else if (projectile.pierce === 0) {
            projectile.col = hitPoint.col;
            projectile.row = hitPoint.row;
            projectile.life = 0;
            endedByImpact = true;
            break;
          }
        }
      }
      if (projectile.life <= 0 && !endedByImpact) this.expireProjectile(owner, projectile);
    }
  }

  private expireProjectile(owner: PlayerEntity, projectile: ProjectileEntity): void {
    const col = clamp(projectile.col, this.projectileMinimum(), this.projectileMaximum());
    const row = clamp(projectile.row, this.projectileMinimum(), this.projectileMaximum());
    this.ring(col, row, projectile.color, 0.26, Math.max(2, projectile.size * 0.65), Math.max(9, projectile.size * 2.4), owner.entityId, 'pixels');
    this.burst(col, row, projectile.color, 4, 55, owner.entityId);
  }

  private explodeProjectile(owner: PlayerEntity, projectile: ProjectileEntity): void {
    this.ring(projectile.col, projectile.row, projectile.color, 0.52, 7, projectile.blastRadius, owner.entityId);
    this.burst(projectile.col, projectile.row, projectile.color, 20, 165, owner.entityId);
    this.feedback('blast', owner.entityId);
    for (const hostile of this.enemies) {
      if (hostile.dead) continue;
      const hitIndexes = this.circularTargetHitIndexes(projectile, projectile.blastRadius, hostile);
      if (hitIndexes.length > 0) this.damageTargetParts(owner, hostile, hitIndexes, projectile, projectile.color);
    }
  }

  private updateHazards(delta: number): void {
    for (const hazard of this.hazards) {
      hazard.life -= delta;
      const owner = this.playersByEntity.get(hazard.ownerEntityId);
      if (!owner || owner.ghost) {
        hazard.life = 0;
        continue;
      }
      if (hazard.kind === 'gravity') {
        for (const hostile of this.enemies) {
          if (hostile.dead) continue;
          const dx = hazard.col - hostile.col;
          const dy = hazard.row - hostile.row;
          const distance = Math.hypot(dx, dy);
          if (distance <= 0.001 || distance >= hazard.radius) continue;
          const pull = 0.5 * (1 - distance / hazard.radius) * delta;
          hostile.col += dx / distance * pull;
          hostile.row += dy / distance * pull;
          hostile.slow = Math.max(hostile.slow, 0.2);
          followEnemySegments(hostile, 0, SNAKE_SEGMENT_SPACING);
        }
        continue;
      }
      hazard.arm -= delta;
      if (hazard.arm > 0) continue;
      let trigger: EnemyEntity | null = null;
      for (const hostile of this.enemies) {
        if (!hostile.dead && Math.hypot(hostile.col - hazard.col, hostile.row - hazard.row) < hazard.radius) {
          trigger = hostile;
          break;
        }
      }
      const ownerTriggered = owner.autopilot && owner.alive && !owner.ghost && Math.hypot(owner.col - hazard.col, owner.row - hazard.row) < this.playerHeadRadiusCells() + this.pixelsToCells(6);
      if (!trigger && !ownerTriggered) continue;
      this.triggerMine(hazard, owner, ownerTriggered);
    }
  }

  private triggerMine(hazard: HazardEntity, owner: PlayerEntity, bounceOwner: boolean): void {
    this.ring(hazard.col, hazard.row, hazard.color, 0.5, 10, hazard.radius, owner.entityId);
    this.burst(hazard.col, hazard.row, hazard.color, 18, 150, owner.entityId);
    this.feedback('blast', owner.entityId);
    for (const hostile of this.enemies) {
      if (hostile.dead) continue;
      const hitIndexes = this.circularTargetHitIndexes(hazard, hazard.radius, hostile);
      if (hitIndexes.length > 0) this.damageTargetParts(owner, hostile, hitIndexes, hazard, hazard.color);
    }
    if (bounceOwner) this.bounceEntity(owner, owner.col - hazard.col, owner.row - hazard.row, hazard.color, SNAKE_SEGMENT_SPACING);
    hazard.life = 0;
    this.effectSound('mine', owner.entityId);
  }

  private endRunsWhenAllPresentPlayersAreGhosts(now: number, presentPlayers: readonly PlayerEntity[]): boolean {
    if (presentPlayers.length === 0 || presentPlayers.some((player) => !player.ghost)) return false;
    for (const player of presentPlayers) this.eliminatePlayer(player, null, now, '所有玩家均已进入幽灵状态');
    return true;
  }

  private reviveGhostPlayers(now: number, presentPlayers: readonly PlayerEntity[]): boolean {
    let revived = false;
    for (const ghost of presentPlayers) {
      if (!ghost.ghost) continue;
      for (const rescuer of presentPlayers) {
        if (rescuer === ghost || rescuer.ghost || !this.playersTouch(rescuer, ghost)) continue;
        ghost.ghost = false;
        ghost.health = ghost.maxHealth * MULTIPLAYER_REVIVE_HEALTH_RATIO;
        ghost.invulnerable = MULTIPLAYER_REVIVE_INVULNERABILITY_DURATION;
        ghost.speed = this.playerBaseSpeed(ghost);
        ghost.slow = 0;
        ghost.collisionCooldown = 0;
        ghost.knockbackX = 0;
        ghost.knockbackY = 0;
        this.emitEvent('record', `${rescuer.name} 复活了 ${ghost.name}`, now, rescuer.entityId);
        revived = true;
        break;
      }
    }
    return revived;
  }

  private playersTouch(first: PlayerEntity, second: PlayerEntity): boolean {
    const rangeSquared = MULTIPLAYER_REVIVE_CONTACT_RANGE * MULTIPLAYER_REVIVE_CONTACT_RANGE;
    for (let firstIndex = -1; firstIndex < first.segments.length; firstIndex += 1) {
      const firstNode: GridPoint = firstIndex < 0 ? first : first.segments[firstIndex];
      for (let secondIndex = -1; secondIndex < second.segments.length; secondIndex += 1) {
        const secondNode: GridPoint = secondIndex < 0 ? second : second.segments[secondIndex];
        if (distanceSquared(firstNode, secondNode) < rangeSquared) return true;
      }
    }
    return false;
  }

  private checkCollisions(now: number, players = this.activePlayers(), presentPlayers = this.livingPlayers()): void {
    players = players.filter((player) => player.autopilot);
    for (const player of players) {
      if (!player.alive) continue;
      const wall = wallBounceNormal(player.col, player.row, this.arenaMinimum(), this.arenaMaximum());
      if (wall) {
        player.col = clamp(player.col, this.arenaMinimum(), this.arenaMaximum());
        player.row = clamp(player.row, this.arenaMinimum(), this.arenaMaximum());
        this.triggerCollisionEcho(player);
        this.damagePlayer(player, PLAYER_WALL_COLLISION_DAMAGE, now, '撞上墙壁');
        if (player.alive) this.bounceEntity(player, wall.col, wall.row, '#b8f53f', SNAKE_SEGMENT_SPACING);
        continue;
      }
      if (player.collisionCooldown <= 0) {
        const ownBody = findSelfCollision(player, PLAYER_SELF_COLLISION_RANGE);
        if (ownBody) {
          this.bounceEntity(player, player.col - ownBody.col, player.row - ownBody.row, '#f4ffdc', SNAKE_SEGMENT_SPACING, 1, true);
          continue;
        }
      }
      if (player.invulnerable <= 0 && player.collisionCooldown <= 0) {
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const segmentIndex = enemy.segments.findIndex((segment) => Math.hypot(player.col - segment.col, player.row - segment.row) < SNAKE_BODY_CONTACT_RANGE);
          if (segmentIndex < 0) continue;
          const body = enemy.segments[segmentIndex];
          const defended = this.consumeDefense(player);
          this.applyPlayerCollisionAttack(player, enemy, body, segmentIndex, false);
          if (!defended) this.damagePlayer(player, PLAYER_ENEMY_BODY_COLLISION_DAMAGE, now, '被敌蛇重创');
          if (player.alive) this.bounceEntity(player, player.col - body.col, player.row - body.row, enemy.color, SNAKE_SEGMENT_SPACING, 1, true);
          break;
        }
      }
      if (!player.alive) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || Math.hypot(player.col - enemy.col, player.row - enemy.row) >= this.playerHeadRadiusCells() + ENEMY_HEAD_RADIUS_CELLS || player.collisionCooldown > 0 || enemy.collisionCooldown > 0) continue;
        const normal = collisionNormal(player, enemy);
        this.applyPlayerCollisionAttack(player, enemy, enemy, -1, true);
        const knockbackMultiplier = enemy.archetype === 'warden' ? DESIGNER_BALANCE.enemyWardenKnockbackMultiplier : 1;
        this.bounceEntity(player, normal.col, normal.row, '#dffcff', SNAKE_SEGMENT_SPACING, knockbackMultiplier, true);
        if (!enemy.dead) this.bounceEntity(enemy, -normal.col, -normal.row, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_PROGRESSION.effects.momentumKnockbackBonus(this.moduleCount(player, 'momentum')));
      }
    }

    for (const attacker of players) {
      if (!attacker.alive || attacker.collisionCooldown > 0) continue;
      for (const defender of presentPlayers) {
        if (attacker === defender || !this.isPlayerProtected(defender)) continue;
        const contact = this.protectedPlayerContact(attacker, defender);
        if (!contact) continue;
        this.bounceEntity(
          attacker,
          attacker.col - contact.col,
          attacker.row - contact.row,
          PLAYER_COLORS[defender.colorIndex],
          SNAKE_SEGMENT_SPACING,
          1,
          true,
        );
        break;
      }
    }

    for (let leftIndex = 0; leftIndex < players.length; leftIndex += 1) {
      const left = players[leftIndex];
      if (!left.alive || this.isPlayerProtected(left)) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < players.length; rightIndex += 1) {
        const right = players[rightIndex];
        if (!right.alive || this.isPlayerProtected(right)) continue;
        this.checkPlayerBodyHit(left, right);
        if (left.alive && right.alive) this.checkPlayerBodyHit(right, left);
        if (!left.alive || !right.alive || left.collisionCooldown > 0 || right.collisionCooldown > 0 || Math.hypot(left.col - right.col, left.row - right.row) >= this.playerHeadRadiusCells() * 2) continue;
        const normal = collisionNormal(left, right);
        this.bounceEntity(left, normal.col, normal.row, PLAYER_COLORS[left.colorIndex], SNAKE_SEGMENT_SPACING, 1, true);
        if (right.alive) this.bounceEntity(right, -normal.col, -normal.row, PLAYER_COLORS[right.colorIndex], SNAKE_SEGMENT_SPACING, 1, true);
        this.publishAuthoritativePlayerHeadCollision(left, right, normal, now);
      }
    }

    for (const attacker of players) {
      if (!attacker.alive || attacker.collisionCooldown > 0) continue;
      for (const defender of presentPlayers) {
        if (defender.autopilot || attacker === defender || !defender.alive || this.isPlayerProtected(defender)) continue;
        this.checkPlayerBodyHit(attacker, defender);
        if (!attacker.alive || Math.hypot(attacker.col - defender.col, attacker.row - defender.row) >= this.playerHeadRadiusCells() * 2) continue;
        const normal = collisionNormal(attacker, defender);
        this.bounceEntity(attacker, normal.col, normal.row, PLAYER_COLORS[attacker.colorIndex], SNAKE_SEGMENT_SPACING, 1, true);
        this.publishAuthoritativePlayerHeadCollision(attacker, defender, normal, now);
        break;
      }
    }
  }

  private isPlayerProtected(player: PlayerEntity): boolean {
    return player.paused || player.choosingUpgrade || player.invulnerable > 0;
  }

  private protectedPlayerContact(attacker: PlayerEntity, defender: PlayerEntity): GridPoint | null {
    const headRange = this.playerHeadRadiusCells() * 2;
    if (distanceSquared(attacker, defender) < headRange * headRange) return defender;
    return bodyConnectionContact(attacker, defender, SNAKE_BODY_CONTACT_RANGE)?.point ?? null;
  }

  private checkPlayerBodyHit(attacker: PlayerEntity, defender: PlayerEntity): void {
    if (
      attacker.invulnerable > 0
      || defender.invulnerable > 0
      || attacker.paused
      || defender.paused
      || attacker.choosingUpgrade
      || defender.choosingUpgrade
      || attacker.collisionCooldown > 0
    ) return;
    if (distanceSquared(attacker, defender) < (this.playerHeadRadiusCells() * 2) ** 2) return;
    const contact = bodyConnectionContact(attacker, defender, SNAKE_BODY_CONTACT_RANGE);
    if (!contact) return;
    this.bounceEntity(attacker, attacker.col - contact.point.col, attacker.row - contact.point.row, PLAYER_COLORS[defender.colorIndex], SNAKE_SEGMENT_SPACING, 1, true);
  }

  private consumeDefense(player: PlayerEntity): boolean {
    const defense = player.segments.find((segment) => segment.module === 'phase' && segment.ready);
    if (!defense?.module) return false;
    defense.ready = false;
    defense.cooldown = this.activeModuleCooldown(
      player,
      defense.module,
      defense.moduleLevel,
      MODULE_PROGRESSION.effects.armorCooldownRateBonus(this.moduleCount(player, 'armor')),
    );
    player.invulnerable = defense.module === 'phase' ? 1.55 : 1.05;
    this.effectSound('shield', player.entityId);
    this.ring(player.col, player.row, MODULE_BY_ID[defense.module].color, 0.7, 18, 76, player.entityId, 'pixels');
    this.burst(player.col, player.row, MODULE_BY_ID[defense.module].color, 18, 130, player.entityId);
    return true;
  }

  private consumeShieldCharge(player: PlayerEntity): boolean {
    if (player.shieldCharges <= 0) return false;
    player.shieldCharges -= 1;
    this.effectSound('shield', player.entityId);
    this.ring(player.col, player.row, MODULE_BY_ID.shield.color, 0.7, 18, 76, player.entityId, 'pixels');
    this.burst(player.col, player.row, MODULE_BY_ID.shield.color, 18, 130, player.entityId);
    return true;
  }

  private healPlayer(player: PlayerEntity, amount: number, color = MODULE_BY_ID.recovery.color, present = false): number {
    if (!player.alive || player.ghost || amount <= 0 || player.health >= player.maxHealth) return 0;
    const amplified = amount * (1 + MODULE_PROGRESSION.effects.healingReceivedBonus(this.moduleCount(player, 'recovery')));
    const applied = Math.min(amplified, player.maxHealth - player.health);
    player.health += applied;
    if (present && applied > 0) {
      this.pendingEffects.push({
        id: this.effectId(),
        type: 'playerHeal',
        playerEntityId: player.entityId,
        col: player.col,
        row: player.row,
        amount: applied,
        health: player.health,
        maxHealth: player.maxHealth,
        color,
      });
    }
    return applied;
  }

  private damagePlayer(player: PlayerEntity, amount: number, now: number, reason: string): boolean {
    if (!player.alive || player.ghost || player.invulnerable > 0) return false;
    if (this.consumeShieldCharge(player)) return false;
    const damage = Math.max(0, amount) * (1 - MODULE_PROGRESSION.effects.damageReduction(this.moduleCount(player, 'plating')));
    if (damage <= 0) return false;
    player.health = Math.max(0, player.health - damage);
    const health = player.health;
    this.pendingEffects.push({
      id: this.effectId(),
      type: 'playerHurt',
      playerEntityId: player.entityId,
      col: player.col,
      row: player.row,
      amount: damage,
      health,
      maxHealth: player.maxHealth,
    });
    if (health <= 0) this.enterGhostState(player, now, reason);
    return true;
  }

  private drainPlayerHealth(player: PlayerEntity, amount: number, now: number, reason: string): boolean {
    if (!player.alive || player.ghost || amount <= 0) return false;
    player.health = Math.max(0, player.health - amount);
    if (player.health <= 0) this.enterGhostState(player, now, reason);
    return true;
  }

  private enterGhostState(player: PlayerEntity, now: number, reason: string): void {
    if (!player.alive || player.ghost) return;
    player.health = 0;
    player.ghost = true;
    player.invulnerable = 0;
    player.speed = MULTIPLAYER_GHOST_SPEED;
    player.slow = 0;
    player.collisionCooldown = 0;
    player.knockbackX = 0;
    player.knockbackY = 0;
    player.foodBoost = 0;
    player.desiredAngle = player.angle;
    this.clearPlayerHeadCollisionRecords(player.entityId);
    this.emitEvent('record', `${player.name} ${reason}，正在等待救援`, now, player.entityId);
  }

  private damageTarget(owner: PlayerEntity | null, target: EnemyEntity, amount: number, point: GridPoint, color: string, hitSegmentIndex?: number): void {
    if (!this.isTargetAlive(target)) return;
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;
    const beforeCount = target.segments.length;
    const resolvedHitIndex = Number.isInteger(hitSegmentIndex)
      ? clamp(hitSegmentIndex!, -1, Math.max(-1, beforeCount - 1))
      : nearestEnemySegmentIndex(target, point);
    const hitsHead = resolvedHitIndex < 0;
    const oldHead = { col: target.col, row: target.row };
    const span = enemyDamageSpan(beforeCount, resolvedHitIndex, safeAmount);
    const removed = target.segments.splice(span.start, span.count);
    const destroysHead = safeAmount > beforeCount;
    const promotedHead = hitsHead && !destroysHead ? removed.at(-1) ?? null : null;
    const reconnectIndex = span.start < target.segments.length ? span.start : -1;
    if (promotedHead) {
      const tangentCol = oldHead.col - promotedHead.col;
      const tangentRow = oldHead.row - promotedHead.row;
      target.col = promotedHead.col;
      target.row = promotedHead.row;
      if (Math.hypot(tangentCol, tangentRow) > 0.001) target.angle = Math.atan2(tangentRow, tangentCol);
      this.pendingEffects.push({
        id: this.effectId(),
        type: 'enemyHeadHit',
        enemyId: target.id,
        beforeCount,
        count: removed.length,
        oldHead,
        newHead: { col: target.col, row: target.row },
        color,
        duration: ENEMY_HEAD_REFORM_DURATION,
      });
    } else if (removed.length > 0 && !destroysHead) {
      beginEnemyReconnect(target, reconnectIndex, SNAKE_SEGMENT_SPACING);
      this.pendingEffects.push({
        id: this.effectId(),
        type: 'enemyBodyHit',
        enemyId: target.id,
        beforeCount,
        start: span.start,
        count: removed.length,
        reconnectIndex,
      });
    }
    const destroyedNodes: GridPoint[] = promotedHead
      ? [oldHead, ...removed.slice(0, -1)]
      : removed;
    for (const segment of destroyedNodes) {
      this.burst(segment.col, segment.row, color, 7, 95, owner?.entityId);
      if (owner) {
        const salvageDrops = MODULE_PROGRESSION.rollLinearRewards(
          MODULE_PROGRESSION.effects.salvageExpectedDrops(this.moduleCount(owner, 'salvage')),
          () => this.random(),
        );
        for (let index = 0; index < salvageDrops; index += 1) {
          this.spawnFood({ col: segment.col + this.randomBetween(-0.3, 0.3), row: segment.row + this.randomBetween(-0.3, 0.3) }, true);
        }
      }
    }
    this.ring(point.col, point.row, color, 0.34, 3, 0.48, owner?.entityId);
    if (owner) {
      this.effectSound('hit', owner.entityId);
      this.feedback('hit', owner.entityId);
    }
    if (destroysHead) this.killEnemy(target, owner);
    if (owner) {
      this.textEffect(point.col, point.row + (destroysHead ? 0.35 : -0.35), `-${safeAmount}`, color, ENEMY_DAMAGE_NUMBER_DURATION, owner.entityId, true, true);
    }
  }

  private killEnemy(enemy: EnemyEntity, owner: PlayerEntity | null): void {
    if (enemy.dead) return;
    enemy.dead = true;
    for (const player of this.playersByEntity.values()) {
      if (!player.alive || player.ghost) continue;
      const deathBurstLevel = this.moduleCount(player, 'deathburst');
      if (deathBurstLevel <= 0) continue;
      const origin = player.segments.find((segment) => segment.module === 'deathburst') ?? player;
      const target = this.nearestTarget(player, origin, Number.POSITIVE_INFINITY);
      const targetRef = target ? this.targetRef(target) : null;
      const shotCount = MODULE_PROGRESSION.effects.deathBurstProjectileCount(deathBurstLevel);
      const startAngle = this.randomBetween(0, TAU);
      for (let index = 0; index < shotCount; index += 1) {
        this.createProjectile(player, origin, startAngle + index * TAU / shotCount, { speed: 315, color: MODULE_BY_ID.deathburst.color, size: 4.2 }, targetRef);
      }
      if (shotCount > 0) this.effectSound('shoot', player.entityId);
    }
    const dropOccupied = this.spawnOccupiedCellKeys();
    if (owner) {
      owner.kills += 1;
      owner.botKills += 1;
      owner.score += 100 + enemy.captured * 25;
      const cache = this.moduleCount(owner, 'cache');
      if (cache > 0) {
        owner.cacheKills += 1;
        const cacheThreshold = MODULE_PROGRESSION.effects.cacheKillsPerTrigger();
        if (owner.cacheKills >= cacheThreshold) {
          owner.cacheKills -= cacheThreshold;
          for (let index = 0; index < cache; index += 1) this.spawnFood(enemy, true, dropOccupied);
          this.ring(enemy.col, enemy.row, MODULE_BY_ID.cache.color, 0.65, 8, 1, owner.entityId);
        }
      }
      const bloom = this.moduleCount(owner, 'bloom');
      if (bloom > 0 && owner.bloomCooldown <= 0) {
        this.spawnFood(enemy, true, dropOccupied);
        owner.bloomCooldown = this.activeModuleCooldown(owner, 'bloom', bloom);
      }
      const fortune = this.moduleCount(owner, 'fortune');
      const fortuneDrops = MODULE_PROGRESSION.rollLinearRewards(
        MODULE_PROGRESSION.effects.fortuneExpectedDrops(fortune),
        () => this.random(),
      );
      enemy.captured += fortuneDrops;
      this.emitEvent('bot-kill', `${owner.name} 击破了一条敌蛇`, this.now, owner.entityId);
    }
    for (let index = 0; index < enemy.captured; index += 1) {
      const angle = index * 2.4 + this.randomBetween(-0.25, 0.25);
      const distance = this.pixelsToCells(22 + Math.sqrt(index + 1) * 12);
      this.spawnFood({ col: enemy.col + Math.cos(angle) * distance, row: enemy.row + Math.sin(angle) * distance }, true, dropOccupied);
    }
    enemy.captured = 0;
    this.pendingEffects.push({
      id: this.effectId(),
      type: 'snakeDeath',
      enemyId: enemy.id,
      head: { col: enemy.col, row: enemy.row },
      segments: enemy.segments.map((segment) => ({ col: segment.col, row: segment.row })),
      color: enemy.color,
      ownerEntityId: owner?.entityId,
    });
    this.spawnFood(enemy, false, dropOccupied);
  }

  private triggerBodyIntercept(player: PlayerEntity, point: GridPoint, defeatedAt: GridPoint): void {
    const shotCount = MODULE_PROGRESSION.effects.thornsProjectileCount();
    const startAngle = this.randomBetween(0, TAU);
    const target = this.nearestTarget(player, point, Number.POSITIVE_INFINITY);
    const targetRef = target ? this.targetRef(target) : null;
    for (let index = 0; index < shotCount; index += 1) {
      this.createProjectile(player, point, startAngle + index * TAU / shotCount, { speed: 280, color: MODULE_BY_ID.thorns.color, size: 4.2 }, targetRef);
    }
    this.spawnFood(defeatedAt, true);
    this.burst(point.col, point.row, MODULE_BY_ID.thorns.color, 18, 145, player.entityId);
    this.ring(point.col, point.row, MODULE_BY_ID.thorns.color, 0.55, 8, 1.4, player.entityId);
    this.playSkillSound(player, 'thorns');
  }

  private nearestJointOnTarget(origin: GridPoint, enemy: EnemyEntity): EnemyTargetSelection {
    let node: GridPoint = enemy;
    let segmentIndex = -1;
    let best = distanceSquared(origin, enemy);
    for (let index = 0; index < enemy.segments.length; index += 1) {
      const candidate = enemy.segments[index];
      const distance = distanceSquared(origin, candidate);
      if (distance >= best) continue;
      best = distance;
      node = candidate;
      segmentIndex = index;
    }
    return { enemy, node, segmentIndex, distanceSquared: best };
  }

  private nearestTarget(_owner: PlayerEntity, origin: GridPoint, maximumDistance: number, predicate?: (enemy: EnemyEntity) => boolean): EnemyTargetSelection | null {
    let nearest: EnemyTargetSelection | null = null;
    let best = maximumDistance * maximumDistance;
    for (const target of this.enemies) {
      if (target.dead || (predicate && !predicate(target))) continue;
      const candidate = this.nearestJointOnTarget(origin, target);
      if (candidate.distanceSquared >= best) continue;
      best = candidate.distanceSquared;
      nearest = candidate;
    }
    return nearest;
  }

  private pointHitsTarget(point: GridPoint, radius: number, target: EnemyEntity): boolean {
    if (distanceSquared(point, target) < (radius + ENEMY_HEAD_RADIUS_CELLS) ** 2) return true;
    return target.segments.some((segment) => distanceSquared(point, segment) < (radius + this.enemySegmentRadiusCells()) ** 2);
  }

  private refreshProjectileHitBounds(): void {
    for (const target of this.enemies) {
      if (target.dead) continue;
      let minCol = target.col;
      let maxCol = target.col;
      let minRow = target.row;
      let maxRow = target.row;
      for (const segment of target.segments) {
        minCol = Math.min(minCol, segment.col);
        maxCol = Math.max(maxCol, segment.col);
        minRow = Math.min(minRow, segment.row);
        maxRow = Math.max(maxRow, segment.row);
      }
      target.projectileMinCol = minCol;
      target.projectileMaxCol = maxCol;
      target.projectileMinRow = minRow;
      target.projectileMaxRow = maxRow;
    }
  }

  private sweptTargetContacts(start: GridPoint, end: GridPoint, radius: number, target: EnemyEntity): Array<{ node: GridPoint; progress: number; head: boolean }> {
    const padding = radius + ENEMY_HEAD_RADIUS_CELLS;
    if (
      Math.max(start.col, end.col) < target.projectileMinCol - padding
      || Math.min(start.col, end.col) > target.projectileMaxCol + padding
      || Math.max(start.row, end.row) < target.projectileMinRow - padding
      || Math.min(start.row, end.row) > target.projectileMaxRow + padding
    ) return [];
    const contacts: Array<{ node: GridPoint; progress: number; head: boolean }> = [];
    const headProgress = sweptContactProgress(start, end, target, radius + ENEMY_HEAD_RADIUS_CELLS);
    if (headProgress !== null) contacts.push({ node: target, progress: headProgress, head: true });
    const segmentRadius = radius + this.enemySegmentRadiusCells();
    for (const segment of target.segments) {
      const progress = sweptContactProgress(start, end, segment, segmentRadius);
      if (progress !== null) contacts.push({ node: segment, progress, head: false });
    }
    return contacts;
  }

  private isTargetAlive(target: EnemyEntity): boolean {
    return !target.dead;
  }

  private resolveTargetNode(target: EnemyEntity, segmentIndex: number): GridPoint {
    return segmentIndex >= 0 ? target.segments[segmentIndex] ?? target : target;
  }

  private targetRef(target: EnemyTargetSelection): TargetRef {
    return { id: target.enemy.id, segmentIndex: target.segmentIndex };
  }

  private pixelsToCells(value: number): number {
    return value / CANONICAL_CELL_SIZE;
  }

  private playerHeadRadiusCells(): number {
    return 18 / CANONICAL_CELL_SIZE * SNAKE_BODY_SIZE_SCALE;
  }

  private enemySegmentRadiusCells(): number {
    return this.pixelsToCells(9) * SNAKE_BODY_SIZE_SCALE;
  }

  private allocateProjectileId(): number {
    const id = this.nextProjectileId;
    this.nextProjectileId = this.nextProjectileId >= 65_535 ? 1 : this.nextProjectileId + 1;
    return id;
  }

  private allocateHazardId(): number {
    const id = this.nextHazardId;
    this.nextHazardId = this.nextHazardId >= 65_535 ? 1 : this.nextHazardId + 1;
    return id;
  }

  private applyKnockbackDecay(entity: { knockbackX: number; knockbackY: number }, delta: number): void {
    const damping = Math.exp(-KNOCKBACK_DECAY * delta);
    entity.knockbackX *= damping;
    entity.knockbackY *= damping;
    if (Math.hypot(entity.knockbackX, entity.knockbackY) < 0.04) {
      entity.knockbackX = 0;
      entity.knockbackY = 0;
    }
  }

  private respawnAutopilotPlayers(now: number): void {
    for (const player of this.playersByEntity.values()) {
      if (!player.connected || !player.autopilot || player.alive || player.respawnAt === null || player.respawnAt > now) continue;
      this.spawn(player.accountId, now);
    }
  }

  private removeExpiredPlayers(now: number): void {
    for (const player of this.playersByEntity.values()) {
      if (player.connected || player.disconnectedAt === null || now - player.disconnectedAt < DISCONNECT_GRACE_MS) continue;
      if (player.alive) this.eliminatePlayer(player, null, now, '离开行动区域');
      this.playersByEntity.delete(player.entityId);
      this.playersByAccount.delete(player.accountId);
      this.emitEvent('leave', `${player.name} 离开行动区域`, now, player.entityId);
    }
    if (this.playersByEntity.size === 0 && (this.gameTime > 0 || this.foods.length > 0 || this.enemies.length > 0 || this.pendingSpawns.length > 0)) {
      this.resetSharedWorld();
    }
  }

  private eliminatePlayer(victim: PlayerEntity, killer: PlayerEntity | null, now: number, reason: string): void {
    if (!victim.alive) return;
    const result = this.createRunResult(victim);
    const dropOccupied = this.spawnOccupiedCellKeys();
    if (killer && killer !== victim && killer.alive) {
      killer.kills += 1;
      killer.pvpKills += 1;
      killer.score += 300 + victim.level * 80;
      const cache = this.moduleCount(killer, 'cache');
      if (cache > 0) {
        killer.cacheKills += 1;
        const cacheThreshold = MODULE_PROGRESSION.effects.cacheKillsPerTrigger();
        if (killer.cacheKills >= cacheThreshold) {
          killer.cacheKills -= cacheThreshold;
          for (let index = 0; index < cache; index += 1) this.spawnFood(victim, true, dropOccupied);
          this.ring(victim.col, victim.row, MODULE_BY_ID.cache.color, 0.65, 8, 1, killer.entityId);
        }
      }
      const bloom = this.moduleCount(killer, 'bloom');
      if (bloom > 0 && killer.bloomCooldown <= 0) {
        this.spawnFood(victim, true, dropOccupied);
        killer.bloomCooldown = this.activeModuleCooldown(killer, 'bloom', bloom);
      }
      this.emitEvent('pvp-kill', `${killer.name} 截停了 ${victim.name}`, now, killer.entityId);
    } else {
      this.emitEvent('pvp-kill', `${victim.name} ${reason}`, now, victim.entityId);
    }
    let dropCount = Math.min(12, victim.segments.length);
    if (killer) {
      const fortune = this.moduleCount(killer, 'fortune');
      dropCount += MODULE_PROGRESSION.rollLinearRewards(
        MODULE_PROGRESSION.effects.fortuneExpectedDrops(fortune),
        () => this.random(),
      );
    }
    for (let index = 0; index < dropCount; index += 1) {
      const angle = index * 2.4 + this.randomBetween(-0.25, 0.25);
      const distance = 0.65 + Math.sqrt(index + 1) * 0.35;
      this.spawnFood({ col: victim.col + Math.cos(angle) * distance, row: victim.row + Math.sin(angle) * distance }, true, dropOccupied);
    }
    victim.alive = false;
    victim.ghost = false;
    victim.paused = false;
    victim.choosingUpgrade = false;
    victim.upgradeOffer = null;
    victim.segments = [];
    victim.growth = null;
    victim.growthQueue = [];
    victim.respawnAt = victim.connected ? now + RESPAWN_DELAY_MS : null;
    this.callbacks.onRunEnded?.(result);
    if (this.alivePlayers().length === 0) this.resetSharedWorld();
    this.burst(victim.col, victim.row, '#b8f53f', 28, 170, victim.entityId);
    this.effectSound('death', victim.entityId);
    this.pendingEffects.push({ id: this.effectId(), type: 'flash', color: '#ff4f70', strength: 0.5, audienceEntityId: victim.entityId });
  }

  private createRunResult(player: PlayerEntity): RunResult {
    return {
      accountId: player.accountId,
      entityId: player.entityId,
      name: player.name,
      score: Math.floor(player.score),
      level: player.level,
      survivalTime: player.survivalTime,
      kills: player.kills,
      botKills: player.botKills,
      pvpKills: player.pvpKills,
    };
  }

  private bounceEntity(entity: PlayerEntity | EnemyEntity, normalX: number, normalY: number, color: string, spacing: number, extraImpulseMultiplier = 1, mitigatePlayerCollision = false): void {
    let length = Math.hypot(normalX, normalY);
    if (length < 0.001) {
      normalX = -Math.cos(entity.angle);
      normalY = -Math.sin(entity.angle);
      length = 1;
    }
    const nx = normalX / length;
    const ny = normalY / length;
    const velocityX = Math.cos(entity.angle);
    const velocityY = Math.sin(entity.angle);
    const approach = velocityX * nx + velocityY * ny;
    let bounceX = approach < 0 ? velocityX - 2 * approach * nx : nx;
    let bounceY = approach < 0 ? velocityY - 2 * approach * ny : ny;
    bounceX += nx * 0.5;
    bounceY += ny * 0.5;
    const bounceAngle = Math.atan2(bounceY, bounceX);
    const isPlayer = 'accountId' in entity;
    const collisionReduction = isPlayer && mitigatePlayerCollision
      ? MODULE_PROGRESSION.effects.bufferCollisionReduction(this.moduleCount(entity, 'buffer'))
      : 0;
    const impulseMultiplier = (1 - collisionReduction) * extraImpulseMultiplier;
    if (impulseMultiplier > 0.001) {
      entity.knockbackX = nx * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
      entity.knockbackY = ny * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
      entity.angle = bounceAngle;
      entity.desiredAngle = bounceAngle;
    } else {
      entity.knockbackX = 0;
      entity.knockbackY = 0;
    }
    const stabilization = isPlayer ? this.moduleCount(entity, 'stabilizer') : 0;
    entity.slow = Math.max(entity.slow, BOUNCE_SLOW_TIME * (1 - MODULE_PROGRESSION.effects.stabilizerSlowReduction(stabilization)) * (1 - collisionReduction));
    entity.collisionCooldown = Math.max(0.06, BOUNCE_LOCK_TIME * (1 - MODULE_PROGRESSION.effects.stabilizerLockReduction(stabilization)) * (1 - collisionReduction));
    if (isPlayer) followContinuousSegments(entity.col, entity.row, entity.segments, this.playerSegmentSpacing(entity));
    else followEnemySegments(entity, 0, spacing);
    const anchor: UltraEffectAnchor = isPlayer
      ? { anchorKind: 'player', anchorId: entity.entityId }
      : { anchorKind: 'enemy', anchorId: entity.id };
    this.burst(entity.col, entity.row, color, 13, 135, undefined, anchor);
    this.ring(entity.col, entity.row, color, 0.38, 5, 0.85, undefined, 'cells', anchor);
    if (isPlayer) this.feedback('bounce', entity.entityId);
    this.effectSound('bounce');
  }

  private maximumModuleCount(id: ModuleId, players: PlayerEntity[]): number {
    return players.reduce((maximum, player) => Math.max(maximum, this.moduleCount(player, id)), 0);
  }

  private burst(
    col: number,
    row: number,
    color: string,
    count: number,
    speed: number,
    audienceEntityId?: number,
    anchor?: UltraEffectAnchor,
  ): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'burst', col, row, color, count, speed, audienceEntityId, ...anchor });
  }

  private ring(
    col: number,
    row: number,
    color: string,
    life: number,
    radius: number,
    endRadius: number,
    audienceEntityId?: number,
    endRadiusUnit: 'pixels' | 'cells' = 'cells',
    anchor?: UltraEffectAnchor,
  ): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'ring', col, row, color, life, radius, endRadius, endRadiusUnit, audienceEntityId, ...anchor });
  }

  private feedback(kind: UltraFeedbackKind, audienceEntityId: number): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'feedback', kind, audienceEntityId });
  }

  private beam(type: 'beam' | 'lightning', from: GridPoint, to: GridPoint, color: string, life: number, audienceEntityId?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type, col: from.col, row: from.row, col2: to.col, row2: to.row, color, life, audienceEntityId });
  }

  private textEffect(
    col: number,
    row: number,
    text: string,
    color: string,
    life: number,
    audienceEntityId?: number,
    emphasis = false,
    damageNumber = false,
  ): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'text', col, row, text, color, life, audienceEntityId, emphasis, damageNumber });
  }

  private effectSound(kind: Extract<UltraEffect, { type: 'sound' }>['kind'], audienceEntityId?: number, detail?: number): void {
    const personal = PERSONAL_SOUND_KINDS.has(kind);
    this.pendingEffects.push({
      id: this.effectId(),
      type: 'sound',
      kind,
      detail,
      sourceEntityId: personal ? undefined : audienceEntityId,
      audienceEntityId: personal ? audienceEntityId : undefined,
    });
  }

  private flushEffects(): void {
    if (this.pendingEffects.length === 0) return;
    for (const effect of this.pendingEffects) effect.serverTime = this.now;
    this.callbacks.onEffects?.(this.pendingEffects);
    this.pendingEffects.length = 0;
  }

  private flushProjectileEvents(): void {
    if (this.pendingProjectileEvents.length === 0) return;
    this.callbacks.onProjectiles?.(this.pendingProjectileEvents);
    this.pendingProjectileEvents.length = 0;
  }

  private flushFoodChanges(): void {
    if (!this.foodResetPending && this.pendingFoodUpserts.size === 0 && this.pendingFoodRemovals.size === 0) return;
    this.foodRevision = this.foodRevision >= 0xffff_ffff ? 1 : this.foodRevision + 1;
    this.callbacks.onFoods?.({
      revision: this.foodRevision,
      reset: this.foodResetPending,
      upserts: [...this.pendingFoodUpserts.values()].map(toFoodView),
      removedIds: [...this.pendingFoodRemovals],
    });
    this.foodResetPending = false;
    this.pendingFoodUpserts.clear();
    this.pendingFoodRemovals.clear();
  }

  private flushWorldObjectChanges(): void {
    if (
      !this.worldObjectResetPending
      && this.pendingHazardUpserts.size === 0
      && this.pendingHazardRemovals.size === 0
      && this.pendingSpawnUpserts.size === 0
      && this.pendingSpawnRemovals.size === 0
    ) return;
    this.worldObjectRevision = this.worldObjectRevision >= 0xffff_ffff ? 1 : this.worldObjectRevision + 1;
    this.callbacks.onWorldObjects?.({
      revision: this.worldObjectRevision,
      reset: this.worldObjectResetPending,
      hazardUpserts: [...this.pendingHazardUpserts.values()].map(toHazardView),
      hazardRemovedIds: [...this.pendingHazardRemovals],
      spawnUpserts: [...this.pendingSpawnUpserts.values()].map(toPendingSpawnView),
      spawnRemovedIds: [...this.pendingSpawnRemovals],
    });
    this.worldObjectResetPending = false;
    this.pendingHazardUpserts.clear();
    this.pendingHazardRemovals.clear();
    this.pendingSpawnUpserts.clear();
    this.pendingSpawnRemovals.clear();
  }

  private flushOutputs(): void {
    this.flushFoodChanges();
    this.flushWorldObjectChanges();
    this.flushProjectileEvents();
    this.flushEffects();
  }

  private emitEvent(type: ArenaEvent['type'], text: string, at: number, entityId?: number): void {
    this.callbacks.onEvent?.({ id: this.effectId(), type, text, at, entityId });
  }

  private effectId(): string {
    const id = this.nextEffectId++;
    if (this.nextEffectId > Number.MAX_SAFE_INTEGER - 1) this.nextEffectId = 1;
    return `${this.tick.toString(36)}-${id.toString(36)}`;
  }

  private allocatePlayerId(): number {
    for (let attempt = 0; attempt < 65_535; attempt += 1) {
      const id = this.nextEntityId;
      this.nextEntityId = this.nextEntityId >= 65_535 ? 1 : this.nextEntityId + 1;
      if (!this.playersByEntity.has(id)) return id;
    }
    throw new Error('玩家实体编号已耗尽');
  }

  private allocateFoodId(): number {
    const id = this.nextFoodId;
    this.nextFoodId = this.nextFoodId >= 65_535 ? 1 : this.nextFoodId + 1;
    return id;
  }

  private choosePlayerColor(): number {
    const usage = Array.from({ length: PLAYER_COLORS.length }, () => 0);
    for (const player of this.playersByEntity.values()) usage[player.colorIndex] += 1;
    const minimum = Math.min(...usage);
    const choices = usage.map((count, index) => ({ count, index })).filter((entry) => entry.count === minimum);
    return choices[Math.floor(this.random() * choices.length)].index;
  }

  private random(): number {
    return clamp(this.randomSource(), 0, 0.999999999999);
  }

  private randomBetween(minimum: number, maximum: number): number {
    return minimum + this.random() * (maximum - minimum);
  }
}

function makeSegment(col: number, row: number, options: Partial<UltraSegment>, random: () => number): UltraSegment {
  return {
    col,
    row,
    angle: 0,
    module: options.module ?? null,
    moduleLevel: options.moduleLevel ?? (options.module ? 1 : 0),
    neutral: options.neutral ?? false,
    tailGuard: options.tailGuard ?? false,
    experienceTier: options.experienceTier ?? 0,
    timer: options.timer ?? 0,
    ready: options.ready ?? true,
    cooldown: options.cooldown ?? 0,
    orbit: options.orbit ?? random() * TAU,
    birthAge: options.birthAge ?? null,
  };
}

function followContinuousSegments(headCol: number, headRow: number, segments: GridPoint[], spacing: number): void {
  let previous = { col: headCol, row: headRow };
  for (const segment of segments) {
    const dx = previous.col - segment.col;
    const dy = previous.row - segment.row;
    const distance = Math.hypot(dx, dy) || 1;
    if ('angle' in segment) (segment as GridPoint & { angle: number }).angle = Math.atan2(dy, dx);
    if (distance > spacing) {
      segment.col = previous.col - dx / distance * spacing;
      segment.row = previous.row - dy / distance * spacing;
    }
    previous = segment;
  }
}

function nearestEnemySegmentIndex(enemy: EnemyEntity, point: GridPoint): number {
  let nearestIndex = -1;
  let nearestDistance = distanceSquared(enemy, point);
  for (let index = 0; index < enemy.segments.length; index += 1) {
    const distance = distanceSquared(enemy.segments[index], point);
    if (distance >= nearestDistance) continue;
    nearestDistance = distance;
    nearestIndex = index;
  }
  return nearestIndex;
}

function enemyDamageSpan(segmentCount: number, hitSegmentIndex: number, amount: number): { start: number; count: number } {
  const count = Math.min(segmentCount, amount);
  if (count <= 0) return { start: 0, count: 0 };
  if (hitSegmentIndex < 0) return { start: 0, count };
  const hit = clamp(Math.round(hitSegmentIndex), 0, segmentCount - 1);
  const before = Math.min(hit, Math.floor((count - 1) / 2));
  return { start: Math.min(hit - before, segmentCount - count), count };
}

function beginEnemyReconnect(enemy: EnemyEntity, index: number, spacing: number): void {
  if (index < 0 || index >= enemy.segments.length) return;
  const previous = index === 0 ? enemy : enemy.segments[index - 1];
  const segment = enemy.segments[index];
  const gap = Math.hypot(previous.col - segment.col, previous.row - segment.row);
  if (gap <= spacing) return;
  segment.reconnectElapsed = 0;
  segment.reconnectGap = gap;
}

function followEnemySegments(enemy: EnemyEntity, delta: number, spacing: number): void {
  let previous: GridPoint = enemy;
  for (const segment of enemy.segments) {
    let allowedDistance = spacing;
    if (segment.reconnectGap > spacing) {
      segment.reconnectElapsed = Math.min(ENEMY_BODY_RECONNECT_DURATION, segment.reconnectElapsed + delta);
      const progress = ENEMY_BODY_RECONNECT_DURATION <= 0
        ? 1
        : clamp(segment.reconnectElapsed / ENEMY_BODY_RECONNECT_DURATION, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      allowedDistance += (segment.reconnectGap - spacing) * (1 - eased);
      if (progress >= 1) {
        segment.reconnectElapsed = 0;
        segment.reconnectGap = 0;
      }
    }
    const dx = previous.col - segment.col;
    const dy = previous.row - segment.row;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > allowedDistance) {
      segment.col = previous.col - dx / distance * allowedDistance;
      segment.row = previous.row - dy / distance * allowedDistance;
    }
    previous = segment;
  }
}

function toRosterPlayer(player: PlayerEntity): RosterPlayer {
  return {
    entityId: player.entityId,
    name: player.name,
    playerId: player.playerId,
    colorIndex: player.colorIndex,
    connected: player.connected,
    alive: player.alive,
    ghost: player.ghost,
    paused: player.paused,
    choosingUpgrade: player.choosingUpgrade,
    score: Math.floor(player.score),
    kills: player.kills,
    level: player.level,
    length: player.segments.length + (player.alive ? 1 : 0),
    respawnAt: player.respawnAt,
  };
}

function toPlayerView(player: PlayerEntity): UltraPlayerView {
  return {
    entityId: player.entityId,
    name: player.name,
    colorIndex: player.colorIndex,
    connected: player.connected,
    alive: player.alive,
    ghost: player.ghost,
    paused: player.paused,
    choosingUpgrade: player.choosingUpgrade,
    col: player.col,
    row: player.row,
    angle: player.angle,
    desiredAngle: player.desiredAngle,
    lastInputSequence: player.lastInputSequence,
    speed: player.speed,
    slow: player.slow,
    foodBoost: player.foodBoost,
    knockbackX: player.knockbackX,
    knockbackY: player.knockbackY,
    invulnerable: player.invulnerable,
    collisionCooldown: player.collisionCooldown,
    health: player.health,
    maxHealth: player.maxHealth,
    shieldCharges: player.shieldCharges,
    score: Math.floor(player.score),
    kills: player.kills,
    botKills: player.botKills,
    pvpKills: player.pvpKills,
    survivalTime: player.survivalTime,
    level: player.level,
    xp: player.xp,
    xpNeeded: player.xpNeeded,
    respawnAt: player.respawnAt,
    segments: player.segments.map((segment) => ({ ...segment })),
    growth: player.growth ? { ...player.growth } : null,
  };
}

function toEnemyView(enemy: EnemyEntity): UltraEnemyView {
  return {
    id: enemy.id,
    archetype: enemy.archetype,
    behaviorState: enemy.behaviorState,
    behaviorPhase: enemy.behaviorPhase,
    col: enemy.col,
    row: enemy.row,
    angle: enemy.angle,
    color: enemy.color,
    captured: enemy.captured,
    permanentSlow: enemy.permanentSlow,
    poisonStacks: enemy.poisonStacks,
    segments: enemy.segments.map((segment) => ({ col: segment.col, row: segment.row })),
  };
}

function toProjectileView(projectile: ProjectileEntity): UltraProjectileView {
  return { id: projectile.id, col: projectile.col, row: projectile.row, vx: projectile.vx, vy: projectile.vy, color: projectile.color, size: projectile.size };
}

function toProjectileState(projectile: ProjectileEntity): UltraProjectileState {
  return {
    ...toProjectileView(projectile),
    homing: projectile.homing,
    targetId: projectile.target?.id ?? null,
    targetSegmentIndex: projectile.target?.segmentIndex ?? -1,
    bounces: projectile.bounces,
  };
}

function toHazardView(hazard: HazardEntity): UltraHazardView {
  return { id: hazard.id, ownerEntityId: hazard.ownerEntityId, kind: hazard.kind, col: hazard.col, row: hazard.row, radius: hazard.radius, color: hazard.color, phase: hazard.phase, arm: hazard.arm };
}

function toFoodView(food: FoodEntity): UltraFoodView {
  return {
    id: food.id,
    col: food.col,
    row: food.row,
    color: food.color,
    phase: food.phase,
    special: food.special,
    isPulled: food.isPulled,
  };
}

function toPendingSpawnView(spawn: PendingSpawn): PendingSpawnView {
  return { id: spawn.id, archetype: spawn.archetype, color: spawn.color, angle: spawn.angle, headCell: { ...spawn.headCell }, bodyCells: spawn.bodyCells.map((cell) => ({ ...cell })), timer: spawn.timer, maxTimer: spawn.maxTimer };
}

function cellKey(point: GridPoint): string {
  return `${Math.round(point.col)},${Math.round(point.row)}`;
}

function cellCode(point: GridPoint): number {
  return (Math.round(point.row) & 0xffff) << 16 | (Math.round(point.col) & 0xffff);
}

function manhattan(left: GridPoint, right: GridPoint): number {
  return Math.abs(left.col - right.col) + Math.abs(left.row - right.row);
}

function distanceSquared(left: GridPoint, right: GridPoint): number {
  const col = left.col - right.col;
  const row = left.row - right.row;
  return col * col + row * row;
}

function spatialBucketCode(col: number, row: number): number {
  return (Math.floor(col) + 32_768) * 65_536 + Math.floor(row) + 32_768;
}

function retainInPlace<T>(items: T[], predicate: (item: T) => boolean): T[] {
  let writeIndex = 0;
  for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
    const item = items[readIndex];
    if (!predicate(item)) continue;
    items[writeIndex] = item;
    writeIndex += 1;
  }
  items.length = writeIndex;
  return items;
}

function sweptContactProgress(start: GridPoint, end: GridPoint, point: GridPoint, radius: number): number | null {
  const pathCol = end.col - start.col;
  const pathRow = end.row - start.row;
  const pathLengthSquared = pathCol * pathCol + pathRow * pathRow;
  const progress = pathLengthSquared > 0.000001
    ? clamp(((point.col - start.col) * pathCol + (point.row - start.row) * pathRow) / pathLengthSquared, 0, 1)
    : 0;
  const closestCol = start.col + pathCol * progress;
  const closestRow = start.row + pathRow * progress;
  return (point.col - closestCol) ** 2 + (point.row - closestRow) ** 2 < radius * radius ? progress : null;
}

function closestPointOnGridSegment(point: GridPoint, start: GridPoint, end: GridPoint): GridPoint {
  const deltaCol = end.col - start.col;
  const deltaRow = end.row - start.row;
  const lengthSquared = deltaCol * deltaCol + deltaRow * deltaRow;
  const progress = lengthSquared > 0.000001
    ? clamp(((point.col - start.col) * deltaCol + (point.row - start.row) * deltaRow) / lengthSquared, 0, 1)
    : 0;
  return {
    col: start.col + deltaCol * progress,
    row: start.row + deltaRow * progress,
  };
}

function sweptCapsuleContactProgress(start: GridPoint, end: GridPoint, capsuleStart: GridPoint, capsuleEnd: GridPoint, radius: number): number | null {
  const pathCol = end.col - start.col;
  const pathRow = end.row - start.row;
  const capsuleCol = capsuleEnd.col - capsuleStart.col;
  const capsuleRow = capsuleEnd.row - capsuleStart.row;
  const offsetCol = start.col - capsuleStart.col;
  const offsetRow = start.row - capsuleStart.row;
  const pathLengthSquared = pathCol * pathCol + pathRow * pathRow;
  const capsuleLengthSquared = capsuleCol * capsuleCol + capsuleRow * capsuleRow;
  const pathCapsuleDot = pathCol * capsuleCol + pathRow * capsuleRow;
  const pathOffsetDot = pathCol * offsetCol + pathRow * offsetRow;
  const capsuleOffsetDot = capsuleCol * offsetCol + capsuleRow * offsetRow;
  let pathProgress = 0;
  let capsuleProgress = 0;

  if (pathLengthSquared <= 0.000001) {
    capsuleProgress = capsuleLengthSquared > 0.000001
      ? clamp(capsuleOffsetDot / capsuleLengthSquared, 0, 1)
      : 0;
  } else if (capsuleLengthSquared <= 0.000001) {
    pathProgress = clamp(-pathOffsetDot / pathLengthSquared, 0, 1);
  } else {
    const denominator = pathLengthSquared * capsuleLengthSquared - pathCapsuleDot * pathCapsuleDot;
    pathProgress = denominator > 0.000001
      ? clamp((pathCapsuleDot * capsuleOffsetDot - pathOffsetDot * capsuleLengthSquared) / denominator, 0, 1)
      : 0;
    capsuleProgress = (pathCapsuleDot * pathProgress + capsuleOffsetDot) / capsuleLengthSquared;
    if (capsuleProgress < 0) {
      capsuleProgress = 0;
      pathProgress = clamp(-pathOffsetDot / pathLengthSquared, 0, 1);
    } else if (capsuleProgress > 1) {
      capsuleProgress = 1;
      pathProgress = clamp((pathCapsuleDot - pathOffsetDot) / pathLengthSquared, 0, 1);
    }
  }

  const pathContactCol = start.col + pathCol * pathProgress;
  const pathContactRow = start.row + pathRow * pathProgress;
  const capsuleContactCol = capsuleStart.col + capsuleCol * capsuleProgress;
  const capsuleContactRow = capsuleStart.row + capsuleRow * capsuleProgress;
  return (pathContactCol - capsuleContactCol) ** 2 + (pathContactRow - capsuleContactRow) ** 2 < radius * radius
    ? pathProgress
    : null;
}

function bodyConnectionContact(
  point: GridPoint,
  snake: { col: number; row: number; segments: GridPoint[] },
  range: number,
  firstSegmentIndex = 0,
): { point: GridPoint; segment: GridPoint; segmentIndex: number } | null {
  const rangeSquared = range * range;
  for (let index = firstSegmentIndex; index < snake.segments.length; index += 1) {
    const segment = snake.segments[index];
    const previous = index > 0 ? snake.segments[index - 1] : snake;
    const contactPoint = closestPointOnGridSegment(point, previous, segment);
    if (distanceSquared(point, contactPoint) < rangeSquared) {
      return { point: contactPoint, segment, segmentIndex: index };
    }
  }
  return null;
}

function wallBounceNormal(col: number, row: number, minimum: number, maximum: number): GridPoint | null {
  let normalCol = 0;
  let normalRow = 0;
  if (col < minimum) normalCol += 1;
  else if (col > maximum) normalCol -= 1;
  if (row < minimum) normalRow += 1;
  else if (row > maximum) normalRow -= 1;
  return normalCol || normalRow ? { col: normalCol, row: normalRow } : null;
}

function findSelfCollision(entity: { col: number; row: number; segments: GridPoint[] }, threshold: number): GridPoint | null {
  return bodyConnectionContact(entity, entity, threshold, 2)?.point ?? null;
}

function collisionNormal(left: { col: number; row: number; angle: number }, right: { col: number; row: number; angle: number }): GridPoint {
  let col = left.col - right.col;
  let row = left.row - right.row;
  if (Math.hypot(col, row) < 0.001) {
    col = Math.cos(left.angle) - Math.cos(right.angle);
    row = Math.sin(left.angle) - Math.sin(right.angle);
  }
  if (Math.hypot(col, row) < 0.001) {
    col = -Math.cos(left.angle);
    row = -Math.sin(left.angle);
  }
  return { col, row };
}

function angleDifference(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function normalizeName(value: string): string {
  return Array.from(value.trim()).slice(0, 24).join('') || '未命名玩家';
}

function normalizePlayerId(value: string): string {
  return Array.from(value.trim()).slice(0, 32).join('') || 'unknown';
}

function normalizeAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function rotateToward(current: number, target: number, maximumStep: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + clamp(difference, -maximumStep, maximumStep);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
