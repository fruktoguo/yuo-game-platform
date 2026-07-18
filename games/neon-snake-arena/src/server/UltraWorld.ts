import {
  ATTACK_INTERVAL_SCALE,
  BOUNCE_LOCK_TIME,
  BOUNCE_SLOW_TIME,
  CANONICAL_CELL_SIZE,
  DISCONNECT_GRACE_MS,
  ENEMY_COLORS,
  ENEMY_SPAWN_WARNING_TIME,
  ENEMY_SPEED_SCALE,
  FOOD_COLORS,
  FOOD_WALL_MARGIN,
  GRID_SIZE,
  GROWTH_NODE_DELAY,
  GROWTH_PULSE_DURATION,
  KNOCKBACK_DECAY,
  KNOCKBACK_INITIAL_SPEED,
  MAX_PLAYERS,
  PLAYER_COLORS,
  PROJECTILE_SPEED_SCALE,
  RESPAWN_DELAY_MS,
  SEGMENT_BIRTH_DURATION,
  WAVE_BASE_INTERVAL,
} from '../shared/constants';
import { isModuleId, MODULE_BY_ID, MODULES, type ModuleId } from '../shared/modules';
import type {
  ArenaEvent,
  GridPoint,
  InputPayload,
  LeaderboardEntry,
  PendingSpawnView,
  RosterPlayer,
  UltraEffect,
  UltraEnemyView,
  UltraFoodView,
  UltraHazardView,
  UltraPlayerView,
  UltraProjectileView,
  UltraSegment,
  UltraSnapshot,
  UpgradeOffer,
} from '../shared/protocol';

const TAU = Math.PI * 2;
const PROJECTILE_MIN = -0.5;
const PROJECTILE_MAX = GRID_SIZE - 0.5;

interface PlayerEntity extends UltraPlayerView {
  accountId: string;
  disconnectedAt: number | null;
  speed: number;
  slow: number;
  knockbackX: number;
  knockbackY: number;
  foodBoost: number;
  thornsCooldown: number;
  ramCooldown: number;
  bloomCooldown: number;
  cacheKills: number;
  headFireTimer: number;
  lastInputSequence: number;
  recentPicks: ModuleId[];
  growthQueue: Array<{ color: string; special: boolean }>;
  upgradePending: boolean;
  upgradeRevealTimer: number;
  upgradeOffer: UpgradeOffer | null;
  bladeCooldown: number;
  sawCooldown: number;
  poisonTicks: number;
  poisonTimer: number;
  poisonColor: string | null;
  poisonOwnerEntityId: number | null;
}

interface EnemyEntity extends UltraEnemyView {
  birthLength: number;
  speed: number;
  desiredAngle: number;
  targetFoodId: number | null;
  think: number;
  wobble: number;
  slow: number;
  knockbackX: number;
  knockbackY: number;
  poisonTicks: number;
  poisonTimer: number;
  poisonColor: string | null;
  poisonOwnerEntityId: number | null;
  bladeCooldown: number;
  sawCooldown: number;
  collisionCooldown: number;
  dead: boolean;
}

interface FoodEntity extends UltraFoodView {
  pullTimer: number;
}

interface PendingSpawn extends PendingSpawnView {
  totalLength: number;
  nextCell: GridPoint;
}

type TargetKind = 'enemy' | 'player';

interface TargetRef {
  kind: TargetKind;
  id: number;
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
  homing: number;
  target: TargetRef | null;
  hitIds: string[];
}

interface HazardEntity extends UltraHazardView {
  ownerEntityId: number;
  life: number;
  arm: number;
}

interface ShotOptions {
  speed?: number;
  life?: number;
  color?: string;
  size?: number;
  pierce?: number;
  bounces?: number;
  blastRadius?: number;
  slow?: number;
  poison?: number;
  homing?: number;
  angleOffset?: number;
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
  onUpgrade?: (entityId: number, offer: UpgradeOffer | null) => void;
  onRunEnded?: (result: RunResult) => void;
  onEvent?: (event: ArenaEvent) => void;
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
  private tick = 0;
  private gameTime = 0;
  private waveTimer = 0;
  private waveCount = 0;
  private nextEntityId = 1;
  private nextEnemyId = 1;
  private nextFoodId = 1;
  private nextProjectileId = 1;
  private nextHazardId = 1;
  private nextEffectId = 1;
  private now = Date.now();

  constructor(options: UltraWorldOptions = {}) {
    this.randomSource = options.random ?? Math.random;
    this.callbacks = options.callbacks ?? {};
  }

  connectPlayer(accountId: string, name: string, now = Date.now()): RosterPlayer | null {
    const existing = this.playersByAccount.get(accountId);
    if (existing) {
      existing.connected = true;
      existing.disconnectedAt = null;
      existing.paused = false;
      existing.name = normalizeName(name);
      return toRosterPlayer(existing);
    }
    if (this.playersByAccount.size >= MAX_PLAYERS) return null;
    const player = this.createPlayer(accountId, name);
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
  }

  spawn(accountId: string, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.connected || player.alive || (player.respawnAt !== null && player.respawnAt > now)) return false;
    if (this.alivePlayers().length === 0) this.resetSharedWorld();
    const spawn = this.findPlayerSpawn();
    this.resetPlayerRun(player, spawn);
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
    this.effectSound('start', player.entityId);
    this.now = now;
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

  applyInput(accountId: string, payload: InputPayload): boolean {
    const player = this.playersByAccount.get(accountId);
    if (!player?.alive || player.paused || player.choosingUpgrade || !payload || typeof payload !== 'object') return false;
    if (!Number.isSafeInteger(payload.sequence) || payload.sequence <= player.lastInputSequence) return false;
    if (!Number.isFinite(payload.desiredAngle) || Math.abs(payload.desiredAngle) > Math.PI * 8) return false;
    player.lastInputSequence = payload.sequence;
    player.desiredAngle = normalizeAngle(payload.desiredAngle);
    return true;
  }

  chooseUpgrade(accountId: string, moduleId: ModuleId, now = Date.now()): boolean {
    const player = this.playersByAccount.get(accountId);
    const offer = player?.upgradeOffer;
    if (!player?.alive || !player.choosingUpgrade || !offer || !isModuleId(moduleId) || !offer.options.includes(moduleId)) return false;
    this.applyUpgrade(player, moduleId, now);
    return true;
  }

  step(deltaSeconds: number, now = Date.now()): void {
    const delta = clamp(deltaSeconds, 0, 0.05);
    this.tick = (this.tick + 1) >>> 0;
    this.now = now;
    this.removeExpiredPlayers(now);
    const alive = this.alivePlayers();
    if (alive.length === 0) {
      this.flushEffects();
      return;
    }

    let active = alive.filter((player) => !player.paused && !player.choosingUpgrade);
    if (active.length === 0) {
      this.flushEffects();
      return;
    }

    this.gameTime += delta;
    for (const player of active) {
      player.survivalTime += delta;
      player.score += delta * (3 + player.level * 0.35);
      this.updatePlayerGrowth(player, delta, now);
      this.updatePlayerTimers(player, delta);
    }
    active = alive.filter((player) => player.alive && !player.paused && !player.choosingUpgrade);
    if (active.length === 0) {
      this.flushEffects();
      return;
    }

    this.updateEnemySpawnWarnings(delta);
    this.updateSpawns(delta);
    for (const player of active) this.movePlayer(player, delta);
    this.updateFood(delta);
    for (const player of active) {
      this.updateHeadWeapon(player, delta);
      this.updateModules(player, delta);
    }
    this.updateTargetStatuses(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updateHazards(delta);
    this.checkCollisions(now);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && isProjectileInside(projectile));
    this.hazards = this.hazards.filter((hazard) => hazard.life > 0);
    this.flushEffects();
  }

  getSnapshot(now = Date.now()): UltraSnapshot {
    return {
      tick: this.tick,
      serverTime: now,
      gameTime: this.gameTime,
      waveCount: this.waveCount,
      waveTimer: Math.max(0, this.waveTimer / this.waveCountdownRate()),
      threatLevel: this.threatLevel(),
      players: [...this.playersByEntity.values()].map(toPlayerView),
      enemies: this.enemies.map(toEnemyView),
      foods: this.foods.map(({ pullTimer: _pullTimer, ...food }) => ({ ...food })),
      projectiles: this.projectiles.map(toProjectileView),
      hazards: this.hazards.map(toHazardView),
      pendingSpawns: this.pendingSpawns.map(toPendingSpawnView),
    };
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
        colorIndex: player.colorIndex,
        score: Math.floor(player.score),
        kills: player.kills,
        level: player.level,
        length: player.segments.length + 1,
      }));
  }

  get onlineCount(): number {
    return [...this.playersByEntity.values()].filter((player) => player.connected).length;
  }

  get aliveCount(): number {
    return this.alivePlayers().length;
  }

  get enemyCount(): number {
    return this.enemies.length;
  }

  get currentTick(): number {
    return this.tick;
  }

  private createPlayer(accountId: string, name: string): PlayerEntity {
    const entityId = this.allocatePlayerId();
    return {
      entityId,
      accountId,
      name: normalizeName(name),
      colorIndex: this.choosePlayerColor(),
      connected: true,
      disconnectedAt: null,
      alive: false,
      paused: false,
      choosingUpgrade: false,
      col: GRID_SIZE / 2,
      row: GRID_SIZE / 2,
      angle: 0,
      desiredAngle: 0,
      speed: 5,
      invulnerable: 0,
      slow: 0,
      collisionCooldown: 0,
      knockbackX: 0,
      knockbackY: 0,
      foodBoost: 0,
      thornsCooldown: 0,
      ramCooldown: 0,
      bloomCooldown: 0,
      cacheKills: 0,
      headFireTimer: 1.9 * ATTACK_INTERVAL_SCALE,
      lastInputSequence: -1,
      score: 0,
      kills: 0,
      botKills: 0,
      pvpKills: 0,
      survivalTime: 0,
      level: 0,
      xp: 0,
      xpNeeded: 5,
      respawnAt: null,
      segments: [],
      recentPicks: [],
      growth: null,
      growthQueue: [],
      upgradePending: false,
      upgradeRevealTimer: 0,
      upgradeOffer: null,
      bladeCooldown: 0,
      sawCooldown: 0,
      poisonTicks: 0,
      poisonTimer: 0,
      poisonColor: null,
      poisonOwnerEntityId: null,
    };
  }

  private resetPlayerRun(player: PlayerEntity, spawn: GridPoint): void {
    player.alive = true;
    player.paused = false;
    player.choosingUpgrade = false;
    player.col = spawn.col;
    player.row = spawn.row;
    player.angle = 0;
    player.desiredAngle = 0;
    player.speed = 5;
    player.invulnerable = 0;
    player.slow = 0;
    player.collisionCooldown = 0;
    player.knockbackX = 0;
    player.knockbackY = 0;
    player.foodBoost = 0;
    player.thornsCooldown = 0;
    player.ramCooldown = 0;
    player.bloomCooldown = 0;
    player.cacheKills = 0;
    player.headFireTimer = 1.9 * ATTACK_INTERVAL_SCALE;
    player.lastInputSequence = -1;
    player.score = 0;
    player.kills = 0;
    player.botKills = 0;
    player.pvpKills = 0;
    player.survivalTime = 0;
    player.level = 0;
    player.xp = 0;
    player.xpNeeded = 5;
    player.respawnAt = null;
    player.segments = [];
    player.recentPicks = [];
    player.growth = null;
    player.growthQueue = [];
    player.upgradePending = false;
    player.upgradeRevealTimer = 0;
    player.upgradeOffer = null;
    player.bladeCooldown = 0;
    player.sawCooldown = 0;
    player.poisonTicks = 0;
    player.poisonTimer = 0;
    player.poisonColor = null;
    player.poisonOwnerEntityId = null;
  }

  private resetSharedWorld(): void {
    this.gameTime = 0;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.nextEnemyId = 1;
    this.foods = [];
    this.enemies = [];
    this.projectiles = [];
    this.hazards = [];
    this.pendingSpawns = [];
    this.pendingEffects = [];
  }

  private alivePlayers(): PlayerEntity[] {
    return [...this.playersByEntity.values()].filter((player) => player.alive);
  }

  private activePlayers(): PlayerEntity[] {
    return this.alivePlayers().filter((player) => !player.paused && !player.choosingUpgrade);
  }

  private threatLevel(): number {
    return this.alivePlayers().reduce((maximum, player) => Math.max(maximum, player.level), 0);
  }

  private playerBaseSpeed(player: PlayerEntity): number {
    const hasteMultiplier = 1 + this.moduleCount(player, 'haste') * 0.045;
    const progress = player.xpNeeded > 0 ? clamp(player.xp / player.xpNeeded, 0, 1) : 0;
    const progressMultiplier = 1 + this.moduleCount(player, 'progressor') * progress * 0.08;
    const hostileChronos = this.activePlayers().reduce((maximum, other) => (
      other === player ? maximum : Math.max(maximum, this.moduleCount(other, 'chronos'))
    ), 0);
    return 5 * (1 + player.level * 0.1) * hasteMultiplier * progressMultiplier * Math.pow(0.92, hostileChronos);
  }

  private moduleCount(player: PlayerEntity, id: ModuleId): number {
    let count = 0;
    for (const segment of player.segments) if (segment.module === id) count += 1;
    return count;
  }

  private outputRateMultiplier(player: PlayerEntity): number {
    return Math.pow(0.86, this.moduleCount(player, 'amplifier'));
  }

  private movePlayer(player: PlayerEntity, delta: number): void {
    if (player.collisionCooldown > 0) player.desiredAngle = player.angle;
    else player.angle = rotateToward(player.angle, player.desiredAngle, (4.2 + this.moduleCount(player, 'haste') * 0.18) * delta);
    const slowMultiplier = player.slow > 0 ? 0.48 : 1;
    const feastMultiplier = player.foodBoost > 0 ? 1 + this.moduleCount(player, 'feast') * 0.12 : 1;
    player.speed = this.playerBaseSpeed(player) * slowMultiplier * feastMultiplier;
    player.col += (Math.cos(player.angle) * player.speed + player.knockbackX) * delta;
    player.row += (Math.sin(player.angle) * player.speed + player.knockbackY) * delta;
    this.applyKnockbackDecay(player, delta);
    followContinuousSegments(player.col, player.row, player.segments, 0.58);
  }

  private updatePlayerTimers(player: PlayerEntity, delta: number): void {
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.slow = Math.max(0, player.slow - delta);
    player.collisionCooldown = Math.max(0, player.collisionCooldown - delta);
    player.foodBoost = Math.max(0, player.foodBoost - delta);
    player.thornsCooldown = Math.max(0, player.thornsCooldown - delta);
    player.ramCooldown = Math.max(0, player.ramCooldown - delta);
    player.bloomCooldown = Math.max(0, player.bloomCooldown - delta);
    for (const segment of player.segments) {
      if (segment.birthAge !== null) {
        segment.birthAge += delta;
        if (segment.birthAge >= SEGMENT_BIRTH_DURATION) segment.birthAge = null;
      }
    }
  }

  private updatePlayerGrowth(player: PlayerEntity, delta: number, now: number): void {
    if (player.upgradePending && player.upgradeRevealTimer > 0) {
      player.upgradeRevealTimer -= delta;
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
    player.segments.push(makeSegment(tail.col, tail.row, { neutral: true, birthAge: 0 }, this.randomSource));
    this.burst(tail.col, tail.row, completed.color, completed.special ? 28 : 22, completed.special ? 175 : 145, player.entityId);
    this.burst(tail.col, tail.row, '#eef5ff', completed.special ? 18 : 12, completed.special ? 135 : 105, player.entityId);
    this.ring(tail.col, tail.row, completed.color, 0.46, 3, 0.78, player.entityId);
    this.ring(tail.col, tail.row, '#ffffff', 0.28, 2, 0.46, player.entityId);
    this.shake(completed.special ? 2.5 : 1.5, player.entityId);
    player.growth = null;
    if (player.growthQueue.length > 0) {
      player.growth = { ...player.growthQueue.shift()!, elapsed: 0, nodeCount: player.segments.length + 1 };
    } else if (player.upgradePending) {
      player.upgradeRevealTimer = SEGMENT_BIRTH_DURATION;
      player.invulnerable = Math.max(player.invulnerable, SEGMENT_BIRTH_DURATION + 0.08);
    }
  }

  private offerUpgrade(player: PlayerEntity, now: number): void {
    if (player.choosingUpgrade || !player.upgradePending) return;
    const offer: UpgradeOffer = {
      level: player.level + 1,
      expiresAt: 0,
      options: this.chooseUpgradeOptions(player),
    };
    player.choosingUpgrade = true;
    player.upgradeOffer = offer;
    player.upgradeRevealTimer = 0;
    this.effectSound('level', player.entityId);
    this.callbacks.onUpgrade?.(player.entityId, offer);
  }

  private chooseUpgradeOptions(player: PlayerEntity): ModuleId[] {
    const fresh = MODULES.filter((module) => !player.recentPicks.includes(module.id));
    const output = fresh.filter((module) => module.category === '输出');
    const utility = fresh.filter((module) => module.category !== '输出');
    const choices: ModuleId[] = [];
    const take = (pool: readonly (typeof MODULES)[number][]) => {
      const candidates = pool.filter((module) => !choices.includes(module.id));
      if (candidates.length > 0) choices.push(candidates[Math.floor(this.random() * candidates.length)].id);
    };
    take(output.length > 0 ? output : MODULES.filter((module) => module.category === '输出'));
    take(utility.length > 0 ? utility : MODULES.filter((module) => module.category !== '输出'));
    while (choices.length < 3) take(fresh.length > 0 ? fresh : MODULES);
    for (let index = choices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(this.random() * (index + 1));
      [choices[index], choices[swap]] = [choices[swap], choices[index]];
    }
    return choices;
  }

  private applyUpgrade(player: PlayerEntity, moduleId: ModuleId, _now: number): void {
    const required = player.xpNeeded;
    let removed = 0;
    player.segments = player.segments.filter((segment) => {
      if (segment.neutral && removed < required) {
        removed += 1;
        return false;
      }
      return true;
    });
    player.level += 1;
    player.xp = 0;
    player.xpNeeded = player.level + 5;
    const tail = player.segments.at(-1) ?? player;
    const definition = MODULE_BY_ID[moduleId];
    const initialTimer = this.randomBetween(0.2, 0.8) * (definition.category === '输出' ? ATTACK_INTERVAL_SCALE : 1);
    player.segments.push(makeSegment(tail.col, tail.row, { module: moduleId, timer: initialTimer }, this.randomSource));
    player.recentPicks.push(moduleId);
    if (player.recentPicks.length > 6) player.recentPicks.shift();
    player.score += 250 * player.level;
    player.choosingUpgrade = false;
    player.upgradePending = false;
    player.upgradeOffer = null;
    this.callbacks.onUpgrade?.(player.entityId, null);
    player.invulnerable = Math.min(player.invulnerable, 0.5);
    this.effectSound('select', player.entityId);
    this.burst(tail.col, tail.row, definition.color, 22, 130, player.entityId);
    this.ring(tail.col, tail.row, definition.color, 0.7, 12, 57, player.entityId, 'pixels');
  }

  private collectFood(player: PlayerEntity, foodIndex: number, collector: GridPoint): void {
    const [food] = this.foods.splice(foodIndex, 1);
    if (!food) return;
    player.xp += 1;
    player.score += food.special ? 35 : 20;
    player.growthQueue.push({ color: food.color, special: food.special });
    if (!player.growth) player.growth = { ...player.growthQueue.shift()!, elapsed: 0, nodeCount: player.segments.length + 1 };
    if (player.xp >= player.xpNeeded) player.upgradePending = true;
    if (this.moduleCount(player, 'feast') > 0) player.foodBoost = 2.5;
    const emergency = this.moduleCount(player, 'emergency');
    if (emergency > 0) {
      player.invulnerable = Math.max(player.invulnerable, Math.min(0.9, 0.25 + emergency * 0.12));
      this.ring(collector.col, collector.row, MODULE_BY_ID.emergency.color, 0.38, 7, 0.72, player.entityId);
    }
    this.burst(collector.col, collector.row, food.color, food.special ? 34 : 28, food.special ? 210 : 180, player.entityId);
    this.ring(collector.col, collector.row, food.color, 0.58, 5, 1.5, player.entityId);
    this.ring(collector.col, collector.row, '#ffffff', 0.32, 4, 0.82, player.entityId);
    this.textEffect(collector.col, collector.row, '+1', food.color, 0.72, player.entityId);
    this.effectSound('eat', player.entityId, player.segments.filter((segment) => segment.neutral).length + player.growthQueue.length + (player.growth ? 1 : 0));
    this.shake(food.special ? 4 : 2.8, player.entityId);
  }

  private updateFood(delta: number): void {
    for (const food of this.foods) {
      food.isPulled = false;
      let puller: { player: PlayerEntity; distance: number; tractor: number } | null = null;
      for (const player of this.activePlayers()) {
        const tractor = this.moduleCount(player, 'tractor');
        if (tractor <= 0) continue;
        const distance = Math.hypot(player.col - food.col, player.row - food.row);
        const range = 3.5 + Math.max(0, tractor - 1) * 1.1;
        if (distance <= 0.001 || distance > range || (puller && puller.distance <= distance)) continue;
        puller = { player, distance, tractor };
      }
      if (puller) {
        const speed = 1.8 + Math.max(0, puller.tractor - 1) * 0.45;
        const step = Math.min(puller.distance, speed * delta);
        food.col += (puller.player.col - food.col) / puller.distance * step;
        food.row += (puller.player.row - food.row) / puller.distance * step;
        food.isPulled = true;
      }
    }

    for (let index = this.foods.length - 1; index >= 0; index -= 1) {
      const food = this.foods[index];
      let winner: { player: PlayerEntity; collector: GridPoint; distance: number } | null = null;
      for (const player of this.activePlayers()) {
        if (player.upgradePending) continue;
        const headDistance = Math.hypot(player.col - food.col, player.row - food.row);
        const headRange = this.playerHeadRadiusCells() + 0.13 + this.moduleCount(player, 'magnet') * 0.55;
        if (headDistance <= headRange && (!winner || headDistance < winner.distance)) winner = { player, collector: player, distance: headDistance };
        const bodyRange = 0.42 + this.moduleCount(player, 'collector') * 0.09;
        for (const segment of player.segments) {
          const distance = Math.hypot(segment.col - food.col, segment.row - food.row);
          if (distance <= bodyRange && (!winner || distance < winner.distance)) winner = { player, collector: segment, distance };
        }
      }
      if (winner) this.collectFood(winner.player, index, winner.collector);
    }
  }

  private fieldPopulationCount(): number {
    return this.foods.length + this.enemies.filter((enemy) => !enemy.dead).length;
  }

  private waveCountdownRate(): number {
    const players = this.activePlayers();
    let best = 1;
    for (const player of players) {
      best = Math.max(best, (1 + player.level * 0.1) * (1 + this.moduleCount(player, 'beacon') * 0.07));
    }
    const overflow = Math.max(0, this.fieldPopulationCount() - 10);
    return best / (1 + overflow * 0.1);
  }

  private updateSpawns(delta: number): void {
    this.waveTimer -= delta * this.waveCountdownRate();
    if (this.waveTimer > 0) return;
    this.spawnFood();
    this.spawnFood();
    this.queueEnemySpawn();
    this.waveCount += 1;
    this.waveTimer = WAVE_BASE_INTERVAL;
  }

  private spawnFood(preferred?: GridPoint, special = false): boolean {
    const cell = this.findFreeCell(preferred ?? null, FOOD_WALL_MARGIN);
    if (!cell) return false;
    const color = FOOD_COLORS[Math.floor(this.random() * FOOD_COLORS.length)];
    this.foods.push({
      id: this.allocateFoodId(),
      col: cell.col,
      row: cell.row,
      color,
      phase: this.randomBetween(0, TAU),
      pullTimer: this.randomBetween(0.4, 1),
      special,
      isPulled: false,
    });
    this.burst(cell.col, cell.row, color, special ? 10 : 7, 62);
    this.ring(cell.col, cell.row, color, 0.42, 3, 0.42);
    this.effectSound('foodSpawn');
    return true;
  }

  private updateEnemySpawnWarnings(delta: number): void {
    for (let index = this.pendingSpawns.length - 1; index >= 0; index -= 1) {
      const spawn = this.pendingSpawns[index];
      spawn.timer -= delta;
      if (spawn.timer > 0) continue;
      this.pendingSpawns.splice(index, 1);
      this.materializeEnemySpawn(spawn);
    }
  }

  private queueEnemySpawn(): boolean {
    const level = this.threatLevel();
    const totalLength = Math.max(1, Math.round(level * this.randomBetween(1, 2)) + 1);
    const playerCount = this.activePlayers().length;
    const multiplayerScale = playerCount <= 1 ? 1 : Math.max(0.35, 1 / Math.sqrt(playerCount));
    const placement = this.chooseEnemySpawn(totalLength - 1, this.maximumPlayerBaseSpeed() * 2 * multiplayerScale);
    if (!placement) return false;
    const color = ENEMY_COLORS[(this.nextEnemyId - 1) % ENEMY_COLORS.length];
    this.pendingSpawns.push({
      id: this.nextEnemyId++,
      color,
      totalLength,
      headCell: placement.head,
      bodyCells: Array.from({ length: totalLength - 1 }, (_, index) => ({ ...placement.body[Math.min(index, placement.body.length - 1)] })),
      nextCell: placement.next,
      timer: ENEMY_SPAWN_WARNING_TIME,
      maxTimer: ENEMY_SPAWN_WARNING_TIME,
    });
    this.effectSound('enemyWarning');
    return true;
  }

  private materializeEnemySpawn(spawn: PendingSpawn): void {
    const direction = { col: spawn.nextCell.col - spawn.headCell.col, row: spawn.nextCell.row - spawn.headCell.row };
    if (direction.col === 0 && direction.row === 0) direction.col = spawn.headCell.col < GRID_SIZE - 1 ? 1 : -1;
    const angle = Math.atan2(direction.row, direction.col);
    this.enemies.push({
      id: spawn.id,
      col: spawn.headCell.col,
      row: spawn.headCell.row,
      angle,
      desiredAngle: angle,
      birthLength: spawn.totalLength,
      speed: 5 * (1 + spawn.totalLength * 0.1) * ENEMY_SPEED_SCALE,
      color: spawn.color,
      segments: spawn.bodyCells.map((cell) => ({ ...cell })),
      captured: 0,
      targetFoodId: null,
      think: this.randomBetween(0.1, 0.5),
      wobble: this.randomBetween(0, TAU),
      slow: 0,
      knockbackX: 0,
      knockbackY: 0,
      poisonTicks: 0,
      poisonTimer: 0,
      poisonColor: null,
      poisonOwnerEntityId: null,
      bladeCooldown: 0,
      sawCooldown: 0,
      collisionCooldown: 0,
      dead: false,
    });
    this.burst(spawn.headCell.col, spawn.headCell.row, spawn.color, 22, 145);
    this.ring(spawn.headCell.col, spawn.headCell.row, spawn.color, 0.58, 5, 1.25);
    this.effectSound('enemySpawn');
    this.shake(4);
  }

  private maximumPlayerBaseSpeed(): number {
    return this.activePlayers().reduce((maximum, player) => Math.max(maximum, this.playerBaseSpeed(player)), 5);
  }

  private chooseEnemySpawn(bodySegmentCount: number, minimumHeadDistance: number): { head: GridPoint; body: GridPoint[]; next: GridPoint } | null {
    const occupied = this.occupiedCellKeys();
    const visibleLength = Math.min(bodySegmentCount, GRID_SIZE * GRID_SIZE - 2);
    const candidates: Array<{ head: GridPoint; body: GridPoint[]; next: GridPoint; headDistance: number; nearestPlayerDistance: number }> = [];
    const players = this.alivePlayers();
    for (const path of buildSerpentinePaths()) {
      for (let index = visibleLength; index < path.length - 1; index += 1) {
        const head = path[index];
        const body: GridPoint[] = [];
        let conflicts = occupied.has(cellKey(head)) ? 1 : 0;
        for (let offset = 1; offset <= visibleLength; offset += 1) {
          const cell = path[index - offset];
          body.push(cell);
          if (occupied.has(cellKey(cell))) conflicts += 1;
        }
        const next = path[index + 1];
        if (occupied.has(cellKey(next))) conflicts += 1;
        if (conflicts > 0) continue;
        const headDistance = players.length > 0 ? Math.min(...players.map((player) => Math.hypot(head.col - player.col, head.row - player.row))) : GRID_SIZE;
        if (headDistance < minimumHeadDistance) continue;
        const spawnCells = [head, ...body, next];
        const nearestPlayerDistance = players.length > 0
          ? Math.min(...players.flatMap((player) => spawnCells.map((cell) => Math.hypot(cell.col - player.col, cell.row - player.row))))
          : GRID_SIZE;
        candidates.push({ head, body, next, headDistance, nearestPlayerDistance });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((left, right) => right.headDistance - left.headDistance || right.nearestPlayerDistance - left.nearestPlayerDistance);
    const farthest = candidates.filter((candidate) => Math.abs(candidate.headDistance - candidates[0].headDistance) < 0.001);
    const safestDistance = farthest[0].nearestPlayerDistance;
    const safest = farthest.filter((candidate) => Math.abs(candidate.nearestPlayerDistance - safestDistance) < 0.001);
    return safest[Math.floor(this.random() * safest.length)];
  }

  private occupiedCellKeys(): Set<string> {
    const occupied = new Set<string>();
    for (const player of this.alivePlayers()) {
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

  private findFreeCell(preferred: GridPoint | null, wallMargin = 0): GridPoint | null {
    const occupied = this.occupiedCellKeys();
    const cells: GridPoint[] = [];
    const margin = clamp(Math.ceil(wallMargin), 0, Math.floor((GRID_SIZE - 1) / 2));
    for (let row = margin; row < GRID_SIZE - margin; row += 1) {
      for (let col = margin; col < GRID_SIZE - margin; col += 1) {
        if (!occupied.has(cellKey({ col, row }))) cells.push({ col, row });
      }
    }
    if (cells.length === 0) return margin > 0 ? null : preferred;
    if (!preferred) return cells[Math.floor(this.random() * cells.length)];
    cells.sort((left, right) => manhattan(left, preferred) - manhattan(right, preferred));
    return cells[0];
  }

  private findPlayerSpawn(): GridPoint {
    const center = { col: Math.floor(GRID_SIZE / 2), row: Math.floor(GRID_SIZE / 2) };
    const alive = this.alivePlayers();
    if (alive.length === 0) return this.findFreeCell(center, 2) ?? center;

    const occupied = this.occupiedCellKeys();
    const candidates: Array<GridPoint & { clearance: number }> = [];
    const occupiedNodes: GridPoint[] = [
      ...alive.flatMap((player) => [player, ...player.segments]),
      ...this.enemies.filter((enemy) => !enemy.dead).flatMap((enemy) => [enemy, ...enemy.segments]),
    ];
    for (let row = 2; row < GRID_SIZE - 2; row += 1) {
      for (let col = 2; col < GRID_SIZE - 2; col += 1) {
        const point = { col, row };
        if (occupied.has(cellKey(point))) continue;
        const clearance = occupiedNodes.length > 0
          ? Math.min(...occupiedNodes.map((node) => Math.hypot(node.col - col, node.row - row)))
          : GRID_SIZE;
        candidates.push({ ...point, clearance });
      }
    }
    candidates.sort((left, right) => right.clearance - left.clearance || manhattan(left, center) - manhattan(right, center));
    return candidates[0] ?? this.findFreeCell(center, 2) ?? center;
  }

  private updateHeadWeapon(player: PlayerEntity, delta: number): void {
    player.headFireTimer -= delta;
    if (player.headFireTimer > 0) return;
    const target = this.nearestTarget(player, player, this.pixelsToCells(560));
    if (target) {
      const fired = this.spawnShot(player, player, target, { color: '#dffcff', speed: 360, size: 3.7 });
      const echoes = this.moduleCount(player, 'echo');
      for (let index = 0; index < echoes; index += 1) {
        const direction = index % 2 ? 1 : -1;
        const tier = Math.floor(index / 2) + 1;
        this.spawnShot(player, player, target, { color: MODULE_BY_ID.echo.color, speed: 330, size: 3.4, angleOffset: direction * tier * 0.13 });
      }
      if (fired) this.effectSound('shoot', player.entityId);
    }
    player.headFireTimer = 1.9 * this.outputRateMultiplier(player) * ATTACK_INTERVAL_SCALE;
  }

  private updateModules(player: PlayerEntity, delta: number): void {
    const rate = this.outputRateMultiplier(player) * ATTACK_INTERVAL_SCALE;
    for (const segment of player.segments) {
      if (!segment.module) continue;
      segment.timer -= delta;
      segment.orbit += delta * 3.8;

      if (segment.module === 'shield' || segment.module === 'phase') {
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
        const blade = {
          col: segment.col + Math.cos(segment.orbit) * 2.9,
          row: segment.row + Math.sin(segment.orbit) * 2.9,
        };
        for (const target of this.hostileTargets(player)) {
          if (target.bladeCooldown > 0 || !this.pointHitsTarget(blade, this.pixelsToCells(10), target)) continue;
          target.bladeCooldown = 0.48 * ATTACK_INTERVAL_SCALE;
          this.damageTarget(player, target, 1, blade, MODULE_BY_ID.blade.color);
        }
        continue;
      }

      if (segment.module === 'saw') {
        for (const target of this.hostileTargets(player)) {
          if (target.sawCooldown > 0 || !this.pointHitsTarget(segment, 0.82, target)) continue;
          target.sawCooldown = 1.4;
          this.damageTarget(player, target, 1, target, MODULE_BY_ID.saw.color);
          this.ring(segment.col, segment.row, MODULE_BY_ID.saw.color, 0.3, 5, 0.82, player.entityId);
          this.playSkillSound(player, 'saw');
        }
        continue;
      }

      if (segment.module === 'regen' && segment.timer <= 0) {
        const distance = this.pixelsToCells(this.randomBetween(85, 130));
        const point = { col: player.col + Math.cos(player.angle) * distance, row: player.row + Math.sin(player.angle) * distance };
        this.spawnFood(point, true);
        this.playSkillSound(player, 'regen');
        this.ring(point.col, point.row, MODULE_BY_ID.regen.color, 0.9, 8, 53, player.entityId, 'pixels');
        segment.timer = 17;
        continue;
      }

      if (segment.module === 'nursery' && segment.timer <= 0) {
        const tail = player.segments.at(-1) ?? player;
        this.spawnFood(tail, true);
        this.playSkillSound(player, 'regen');
        this.ring(tail.col, tail.row, MODULE_BY_ID.nursery.color, 0.75, 6, 0.9, player.entityId);
        segment.timer = 24;
        continue;
      }

      if (segment.timer > 0) continue;
      const target = this.nearestTarget(player, segment, this.pixelsToCells(620));
      switch (segment.module) {
        case 'spark':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.spark.color, speed: 390, size: 4.5 })) this.playSkillSound(player, 'spark');
          segment.timer = 2.7 * rate;
          break;
        case 'frost':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.frost.color, speed: 310, size: 5, slow: 2.6 })) this.playSkillSound(player, 'frost');
          segment.timer = 3.5 * rate;
          break;
        case 'prism':
          if (target) {
            for (const offset of [-0.17, 0, 0.17]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.prism.color, speed: 330, angleOffset: offset });
            this.playSkillSound(player, 'prism');
          }
          segment.timer = 7.05 * rate;
          break;
        case 'nova':
          for (let index = 0; index < 8; index += 1) {
            const angle = index * TAU / 8 + segment.orbit * 0.15;
            this.createProjectile(player, segment, angle, { speed: 250, life: 1.35, color: MODULE_BY_ID.nova.color, size: 4.4 });
          }
          this.playSkillSound(player, 'nova');
          this.ring(segment.col, segment.row, MODULE_BY_ID.nova.color, 0.45, 8, 53, player.entityId, 'pixels');
          segment.timer = 9.25 * rate;
          break;
        case 'tesla':
          if (target) {
            this.fireTesla(player, segment, target);
            this.playSkillSound(player, 'tesla');
          }
          segment.timer = 6.75 * rate;
          break;
        case 'laser':
          if (target) {
            this.damageTarget(player, target, 1, target, MODULE_BY_ID.laser.color);
            this.beam('beam', segment, target, MODULE_BY_ID.laser.color, 0.2, player.entityId);
            this.playSkillSound(player, 'laser');
          }
          segment.timer = 5.1 * rate;
          break;
        case 'missile':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.missile.color, speed: 230, size: 6, homing: 4.2, life: 3.4 })) this.playSkillSound(player, 'missile');
          segment.timer = 5.3 * rate;
          break;
        case 'mine':
          this.hazards.push({ id: this.allocateHazardId(), ownerEntityId: player.entityId, kind: 'mine', col: segment.col, row: segment.row, life: Number.POSITIVE_INFINITY, arm: 0.55, radius: this.pixelsToCells(62), color: MODULE_BY_ID.mine.color, phase: this.randomBetween(0, TAU) });
          this.playSkillSound(player, 'mine');
          segment.timer = 11.4 * rate;
          break;
        case 'pulse':
          this.firePulse(player, segment);
          this.playSkillSound(player, 'pulse');
          segment.timer = 8.1 * rate;
          break;
        case 'venom':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.venom.color, speed: 285, size: 5.5, poison: 2 })) this.playSkillSound(player, 'venom');
          segment.timer = 5.5 * rate;
          break;
        case 'rail':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.rail.color, speed: 520, size: 4.8, pierce: 3, life: 2.8 })) this.playSkillSound(player, 'rail');
          segment.timer = 7 * rate;
          break;
        case 'ricochet':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.ricochet.color, speed: 340, size: 5.2, pierce: 2, bounces: 2, life: 7 })) this.playSkillSound(player, 'ricochet');
          segment.timer = 7.25 * rate;
          break;
        case 'cluster':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.cluster.color, speed: 245, size: 7, homing: 3.6, blastRadius: 72, life: 4 })) this.playSkillSound(player, 'cluster');
          segment.timer = 8 * rate;
          break;
        case 'fan':
          if (target) {
            for (const offset of [-0.34, -0.17, 0, 0.17, 0.34]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fan.color, speed: 300, size: 4.6, angleOffset: offset, life: 1.15 });
            this.playSkillSound(player, 'fan');
          }
          segment.timer = 7.5 * rate;
          break;
        case 'gravity':
          if (target) {
            const point = { col: target.col, row: target.row };
            this.hazards.push({ id: this.allocateHazardId(), ownerEntityId: player.entityId, kind: 'gravity', ...point, life: 6, arm: 0, radius: this.pixelsToCells(95), color: MODULE_BY_ID.gravity.color, phase: this.randomBetween(0, TAU) });
            for (const hostile of this.hostileTargets(player)) {
              if (distanceSquared(point, hostile) < this.pixelsToCells(95) ** 2) this.damageTarget(player, hostile, 1, hostile, MODULE_BY_ID.gravity.color);
            }
            this.playSkillSound(player, 'gravity');
          }
          segment.timer = 10 * rate;
          break;
        case 'needle':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.needle.color, speed: 560, size: 3.8, pierce: 1, life: 2.4 })) this.playSkillSound(player, 'needle');
          segment.timer = 4.4 * rate;
          break;
        case 'mortar':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.mortar.color, speed: 205, size: 8, homing: 3.2, blastRadius: 92, life: 4.4 })) this.playSkillSound(player, 'mortar');
          segment.timer = 8.5 * rate;
          break;
        case 'sweep':
          if (target && this.fireSweepBeam(player, segment, target)) this.playSkillSound(player, 'sweep');
          segment.timer = 7.2 * rate;
          break;
        case 'sniper':
          if (target) {
            this.damageTarget(player, target, 2, target, MODULE_BY_ID.sniper.color);
            this.beam('beam', segment, target, MODULE_BY_ID.sniper.color, 0.28, player.entityId);
            this.playSkillSound(player, 'sniper');
          }
          segment.timer = 9 * rate;
          break;
        case 'flak':
          if (target && this.fireFlakBurst(player, target)) this.playSkillSound(player, 'flak');
          segment.timer = 7.6 * rate;
          break;
        case 'fork':
          if (target) {
            this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: -0.24, homing: 2.5, life: 3 });
            this.spawnShot(player, segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: 0.24, homing: 2.5, life: 3 });
            this.playSkillSound(player, 'fork');
          }
          segment.timer = 6.6 * rate;
          break;
        case 'anchor':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.anchor.color, speed: 180, size: 8.5, homing: 2, slow: 4.2, life: 4 })) this.playSkillSound(player, 'anchor');
          segment.timer = 7.4 * rate;
          break;
        case 'flare':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.flare.color, speed: 270, size: 5.8, poison: 4, life: 3 })) this.playSkillSound(player, 'flare');
          segment.timer = 7 * rate;
          break;
        case 'scatter':
          if (target) {
            for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) this.spawnShot(player, segment, target, { color: MODULE_BY_ID.scatter.color, speed: 305, size: 4.2, angleOffset: offset, life: 1.05 });
            this.playSkillSound(player, 'scatter');
          }
          segment.timer = 9.5 * rate;
          break;
        case 'lance':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.lance.color, speed: 590, size: 7, pierce: 5, life: 3 })) this.playSkillSound(player, 'lance');
          segment.timer = 9 * rate;
          break;
        case 'execute':
          if (target) {
            const damage = target.segments.length + 1 <= 3 ? 2 : 1;
            this.damageTarget(player, target, damage, target, MODULE_BY_ID.execute.color);
            this.beam('beam', segment, target, MODULE_BY_ID.execute.color, 0.2, player.entityId);
            this.playSkillSound(player, 'execute');
          }
          segment.timer = 8 * rate;
          break;
        case 'crossfire':
          if (target) {
            this.fireCrossfire(player, segment, target);
            this.playSkillSound(player, 'crossfire');
          }
          segment.timer = 10 * rate;
          break;
        case 'phasebolt':
          if (this.spawnShot(player, segment, target, { color: MODULE_BY_ID.phasebolt.color, speed: 320, size: 6, bounces: 4, homing: 1.6, life: 8 })) this.playSkillSound(player, 'phasebolt');
          segment.timer = 8 * rate;
          break;
        default:
          break;
      }
    }

    const repulse = this.moduleCount(player, 'repulse');
    if (repulse > 0) {
      const range = this.pixelsToCells(90 + repulse * 20);
      for (const target of this.hostileTargets(player)) {
        if (Math.sqrt(distanceSquared(player, target)) < range) target.desiredAngle = Math.atan2(target.row - player.row, target.col - player.col);
      }
    }
  }

  private playSkillSound(player: PlayerEntity, moduleId: ModuleId | 'saw'): void {
    const sounds: Partial<Record<ModuleId | 'saw', Extract<UltraEffect, { type: 'sound' }>['kind']>> = {
      frost: 'frost', tesla: 'electric', nova: 'nova', laser: 'laser', mine: 'mine', pulse: 'pulse', regen: 'regen',
    };
    this.effectSound(sounds[moduleId] ?? 'skill', player.entityId);
  }

  private spawnShot(player: PlayerEntity, origin: GridPoint, target: EnemyEntity | PlayerEntity | null, options: ShotOptions = {}): boolean {
    if (!target || !this.isTargetAlive(target)) return false;
    const angle = Math.atan2(target.row - origin.row, target.col - origin.col) + (options.angleOffset ?? 0);
    this.createProjectile(player, origin, angle, options, this.targetRef(target));
    return true;
  }

  private createProjectile(player: PlayerEntity, origin: GridPoint, angle: number, options: ShotOptions, target: TargetRef | null = null): void {
    const guidance = this.moduleCount(player, 'guidance');
    const guidanceMultiplier = 1 + guidance * 0.12;
    const speed = this.pixelsToCells((options.speed ?? 300) * guidanceMultiplier * PROJECTILE_SPEED_SCALE);
    this.projectiles.push({
      id: this.allocateProjectileId(),
      ownerEntityId: player.entityId,
      col: origin.col,
      row: origin.row,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      life: (options.life ?? 2.1) * guidanceMultiplier,
      color: options.color ?? '#dffcff',
      size: options.size ?? 4,
      pierce: options.pierce ?? 0,
      bounces: options.bounces ?? 0,
      blastRadius: options.blastRadius ? this.pixelsToCells(options.blastRadius) : 0,
      slow: options.slow ?? 0,
      poison: options.poison ?? 0,
      homing: (options.homing ?? 0) + guidance * 0.35,
      target: options.homing || guidance ? target : null,
      hitIds: [],
    });
  }

  private fireTesla(player: PlayerEntity, origin: GridPoint, first: EnemyEntity | PlayerEntity): void {
    const hit: Array<EnemyEntity | PlayerEntity> = [];
    let current: EnemyEntity | PlayerEntity | null = first;
    let from = origin;
    for (let jump = 0; jump < 3 && current; jump += 1) {
      hit.push(current);
      this.damageTarget(player, current, 1, current, MODULE_BY_ID.tesla.color);
      this.beam('lightning', from, current, MODULE_BY_ID.tesla.color, 0.24, player.entityId);
      from = current;
      let next: EnemyEntity | PlayerEntity | null = null;
      let best = this.pixelsToCells(155) ** 2;
      for (const target of this.hostileTargets(player)) {
        if (hit.includes(target)) continue;
        const distance = distanceSquared(from, target);
        if (distance < best) {
          best = distance;
          next = target;
        }
      }
      current = next;
    }
  }

  private firePulse(player: PlayerEntity, origin: GridPoint): void {
    const radius = this.pixelsToCells(105);
    this.ring(origin.col, origin.row, MODULE_BY_ID.pulse.color, 0.55, 16, radius, player.entityId);
    for (const target of this.hostileTargets(player)) if (distanceSquared(origin, target) < radius * radius) this.damageTarget(player, target, 1, target, MODULE_BY_ID.pulse.color);
  }

  private fireSweepBeam(player: PlayerEntity, origin: GridPoint, target: EnemyEntity | PlayerEntity): boolean {
    const angle = Math.atan2(target.row - origin.row, target.col - origin.col);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const range = GRID_SIZE * 1.15;
    const end = { col: origin.col + directionX * range, row: origin.row + directionY * range };
    let hits = 0;
    for (const hostile of this.hostileTargets(player)) {
      const relativeX = hostile.col - origin.col;
      const relativeY = hostile.row - origin.row;
      const projection = relativeX * directionX + relativeY * directionY;
      const perpendicular = Math.abs(relativeX * directionY - relativeY * directionX);
      if (projection < 0 || projection > range || perpendicular > this.pixelsToCells(26) + 0.28) continue;
      this.damageTarget(player, hostile, 1, hostile, MODULE_BY_ID.sweep.color);
      hits += 1;
    }
    this.beam('beam', origin, end, MODULE_BY_ID.sweep.color, 0.24, player.entityId);
    return hits > 0;
  }

  private fireFlakBurst(player: PlayerEntity, target: EnemyEntity | PlayerEntity): boolean {
    const radius = this.pixelsToCells(84);
    let hits = 0;
    this.ring(target.col, target.row, MODULE_BY_ID.flak.color, 0.5, 8, radius, player.entityId);
    this.burst(target.col, target.row, MODULE_BY_ID.flak.color, 18, 155, player.entityId);
    for (const hostile of this.hostileTargets(player)) {
      if (distanceSquared(target, hostile) > radius * radius) continue;
      this.damageTarget(player, hostile, 1, hostile, MODULE_BY_ID.flak.color);
      hits += 1;
    }
    return hits > 0;
  }

  private fireCrossfire(player: PlayerEntity, origin: GridPoint, target: EnemyEntity | PlayerEntity): void {
    const baseAngle = Math.atan2(target.row - origin.row, target.col - origin.col);
    for (let index = 0; index < 4; index += 1) this.createProjectile(player, origin, baseAngle + index * Math.PI / 2, { speed: 285, life: 1.7, color: MODULE_BY_ID.crossfire.color, size: 6.2, pierce: 1 });
    this.ring(origin.col, origin.row, MODULE_BY_ID.crossfire.color, 0.4, 5, 1, player.entityId);
  }

  private updateTargetStatuses(delta: number): void {
    for (const target of [...this.enemies, ...this.activePlayers()]) {
      target.bladeCooldown = Math.max(0, target.bladeCooldown - delta);
      target.sawCooldown = Math.max(0, target.sawCooldown - delta);
      if (target.slow > 0) target.slow -= delta;
      if (target.poisonTicks <= 0) continue;
      target.poisonTimer -= delta;
      if (target.poisonTimer > 0) continue;
      target.poisonTimer = 1.15 * ATTACK_INTERVAL_SCALE;
      target.poisonTicks -= 1;
      const owner = target.poisonOwnerEntityId === null ? null : this.playersByEntity.get(target.poisonOwnerEntityId) ?? null;
      if (owner) this.damageTarget(owner, target, 1, target, target.poisonColor ?? MODULE_BY_ID.venom.color);
    }
  }

  private updateEnemies(delta: number): void {
    const chronosMultiplier = Math.pow(0.92, this.maximumModuleCount('chronos'));
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.collisionCooldown = Math.max(0, enemy.collisionCooldown - delta);
      if (enemy.collisionCooldown <= 0) {
        enemy.think -= delta;
        if (enemy.think <= 0) {
          enemy.think = this.randomBetween(0.24, 0.62);
          const candidates = this.foods
            .map((food) => ({ food, distance: distanceSquared(food, enemy) }))
            .sort((left, right) => left.distance - right.distance)
            .slice(0, Math.min(6, this.foods.length));
          enemy.targetFoodId = candidates.length > 0 ? candidates[Math.floor(Math.pow(this.random(), 1.8) * candidates.length)].food.id : null;
          enemy.wobble += this.randomBetween(-1.2, 1.2);
        }
        const targetFood = enemy.targetFoodId === null ? null : this.foods.find((food) => food.id === enemy.targetFoodId) ?? null;
        if (targetFood) {
          const ideal = Math.atan2(targetFood.row - enemy.row, targetFood.col - enemy.col);
          const error = Math.sin(this.gameTime * 1.7 + enemy.wobble) * 0.42 + Math.sin(this.gameTime * 0.47 + enemy.id) * 0.2;
          enemy.desiredAngle = ideal + error;
        } else {
          enemy.targetFoodId = null;
          enemy.desiredAngle += Math.sin(this.gameTime + enemy.wobble) * 0.05;
        }
        const wallDistance = 1.35;
        if (enemy.col < wallDistance || enemy.col > GRID_SIZE - 1 - wallDistance || enemy.row < wallDistance || enemy.row > GRID_SIZE - 1 - wallDistance) {
          enemy.desiredAngle = Math.atan2((GRID_SIZE - 1) / 2 - enemy.row, (GRID_SIZE - 1) / 2 - enemy.col) + Math.sin(enemy.wobble) * 0.18;
        }
        const avoidance = this.playerBodyAvoidance(enemy);
        if (avoidance) enemy.desiredAngle += angleDifference(enemy.desiredAngle, avoidance.angle) * avoidance.strength;
        enemy.angle = rotateToward(enemy.angle, enemy.desiredAngle, delta * this.randomBetween(2.05, 2.75));
      }
      const speed = enemy.speed * chronosMultiplier * (enemy.slow > 0 ? 0.55 : 1);
      const nextCol = enemy.col + (Math.cos(enemy.angle) * speed + enemy.knockbackX) * delta;
      const nextRow = enemy.row + (Math.sin(enemy.angle) * speed + enemy.knockbackY) * delta;
      const wallNormal = wallBounceNormal(nextCol, nextRow);
      if (wallNormal) {
        enemy.col = clamp(nextCol, 0, GRID_SIZE - 1);
        enemy.row = clamp(nextRow, 0, GRID_SIZE - 1);
        this.bounceEntity(enemy, wallNormal.col, wallNormal.row, enemy.color, 0.54);
        continue;
      }
      enemy.col = nextCol;
      enemy.row = nextRow;
      this.applyKnockbackDecay(enemy, delta);
      followContinuousSegments(enemy.col, enemy.row, enemy.segments, 0.54);
      if (enemy.collisionCooldown <= 0) {
        const ownBodyHit = findSelfCollision(enemy, 0.48);
        if (ownBodyHit) {
          this.bounceEntity(enemy, enemy.col - ownBodyHit.col, enemy.row - ownBodyHit.row, enemy.color, 0.54);
          continue;
        }
      }
      for (let index = this.foods.length - 1; index >= 0; index -= 1) {
        const food = this.foods[index];
        const collector = Math.hypot(enemy.col - food.col, enemy.row - food.row) <= 0.4
          ? enemy
          : enemy.segments.find((segment) => Math.hypot(segment.col - food.col, segment.row - food.row) <= 0.4);
        if (!collector) continue;
        this.foods.splice(index, 1);
        enemy.captured += 1;
        enemy.targetFoodId = null;
        this.burst(collector.col, collector.row, enemy.color, 5, 55);
        this.textEffect(collector.col, collector.row - 0.4, `×${enemy.captured}`, enemy.color, 0.55);
        break;
      }
      if (enemy.collisionCooldown <= 0) {
        for (const player of this.activePlayers()) {
          const bodyHit = player.segments.find((segment) => Math.hypot(enemy.col - segment.col, enemy.row - segment.row) < 0.46);
          if (!bodyHit) continue;
          const thorns = this.moduleCount(player, 'thorns');
          const thornsReady = thorns > 0 && player.thornsCooldown <= 0;
          this.killEnemy(enemy, player);
          if (thornsReady) {
            this.triggerBodyIntercept(player, bodyHit, enemy, thorns);
            player.thornsCooldown = 6 * Math.pow(0.85, thorns - 1);
          }
          break;
        }
      }
    }
  }

  private playerBodyAvoidance(enemy: EnemyEntity): { angle: number; strength: number } | null {
    let combinedX = 0;
    let combinedY = 0;
    let combinedWeight = 0;
    const forwardX = Math.cos(enemy.desiredAngle);
    const forwardY = Math.sin(enemy.desiredAngle);
    const probe = { col: enemy.col + forwardX * 0.7, row: enemy.row + forwardY * 0.7 };
    for (const player of this.activePlayers()) {
      let awayX = 0;
      let awayY = 0;
      let totalWeight = 0;
      for (const segment of player.segments) {
        const toBodyX = segment.col - probe.col;
        const toBodyY = segment.row - probe.row;
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
      const decoyMultiplier = Math.max(0.45, 1 - this.moduleCount(player, 'decoy') * 0.12);
      combinedX += awayX * decoyMultiplier;
      combinedY += awayY * decoyMultiplier;
      combinedWeight += totalWeight * decoyMultiplier;
    }
    if (combinedWeight < 0.02) return null;
    return { angle: Math.atan2(combinedY, combinedX), strength: clamp(combinedWeight * 1.85, 0.28, 0.96) };
  }

  private updateProjectiles(delta: number): void {
    for (const projectile of this.projectiles) {
      projectile.life -= delta;
      const owner = this.playersByEntity.get(projectile.ownerEntityId);
      if (!owner) {
        projectile.life = 0;
        continue;
      }
      const target = projectile.target ? this.resolveTarget(projectile.target) : null;
      if (projectile.homing && target && this.isTargetAlive(target)) {
        const currentAngle = Math.atan2(projectile.vy, projectile.vx);
        const targetAngle = Math.atan2(target.row - projectile.row, target.col - projectile.col);
        const angle = rotateToward(currentAngle, targetAngle, projectile.homing * delta);
        projectile.vx = Math.cos(angle) * projectile.speed;
        projectile.vy = Math.sin(angle) * projectile.speed;
      }
      projectile.col += projectile.vx * delta;
      projectile.row += projectile.vy * delta;
      const hitHorizontal = projectile.col < PROJECTILE_MIN || projectile.col > PROJECTILE_MAX;
      const hitVertical = projectile.row < PROJECTILE_MIN || projectile.row > PROJECTILE_MAX;
      if (hitHorizontal || hitVertical) {
        if (projectile.bounces > 0) {
          projectile.col = clamp(projectile.col, PROJECTILE_MIN, PROJECTILE_MAX);
          projectile.row = clamp(projectile.row, PROJECTILE_MIN, PROJECTILE_MAX);
          if (hitHorizontal) projectile.vx *= -1;
          if (hitVertical) projectile.vy *= -1;
          projectile.bounces -= 1;
          projectile.target = null;
        } else projectile.life = 0;
      }
      for (const hostile of this.hostileTargets(owner)) {
        if (projectile.life <= 0) break;
        const key = targetKey(hostile);
        if (projectile.hitIds.includes(key) || !this.pointHitsTarget(projectile, this.pixelsToCells(projectile.size), hostile)) continue;
        if (projectile.blastRadius > 0) {
          this.explodeProjectile(owner, projectile);
          projectile.life = 0;
          break;
        }
        this.damageTarget(owner, hostile, 1, projectile, projectile.color);
        projectile.hitIds.push(key);
        if (projectile.slow) hostile.slow = Math.max(hostile.slow, projectile.slow);
        if (projectile.poison) {
          hostile.poisonTicks += projectile.poison;
          hostile.poisonTimer = 0.7 * ATTACK_INTERVAL_SCALE;
          hostile.poisonColor = projectile.color;
          hostile.poisonOwnerEntityId = owner.entityId;
        }
        if (projectile.pierce > 0) projectile.pierce -= 1;
        else projectile.life = 0;
      }
    }
  }

  private explodeProjectile(owner: PlayerEntity, projectile: ProjectileEntity): void {
    this.ring(projectile.col, projectile.row, projectile.color, 0.52, 7, projectile.blastRadius, owner.entityId);
    this.burst(projectile.col, projectile.row, projectile.color, 20, 165, owner.entityId);
    this.shake(5, owner.entityId);
    for (const hostile of this.hostileTargets(owner)) if (this.pointHitsTarget(projectile, projectile.blastRadius, hostile)) this.damageTarget(owner, hostile, 1, hostile, projectile.color);
  }

  private updateHazards(delta: number): void {
    for (const hazard of this.hazards) {
      hazard.life -= delta;
      hazard.phase += delta * 4;
      const owner = this.playersByEntity.get(hazard.ownerEntityId);
      if (!owner) {
        hazard.life = 0;
        continue;
      }
      if (hazard.kind === 'gravity') {
        for (const hostile of this.hostileTargets(owner)) {
          const dx = hazard.col - hostile.col;
          const dy = hazard.row - hostile.row;
          const distance = Math.hypot(dx, dy);
          if (distance <= 0.001 || distance >= hazard.radius) continue;
          const pull = 0.5 * (1 - distance / hazard.radius) * delta;
          hostile.col += dx / distance * pull;
          hostile.row += dy / distance * pull;
          hostile.slow = Math.max(hostile.slow, 0.2);
          followContinuousSegments(hostile.col, hostile.row, hostile.segments, 'accountId' in hostile ? 0.58 : 0.54);
        }
        continue;
      }
      hazard.arm -= delta;
      if (hazard.arm > 0) continue;
      const trigger = this.hostileTargets(owner).find((hostile) => Math.hypot(hostile.col - hazard.col, hostile.row - hazard.row) < hazard.radius);
      const ownerTriggered = owner.alive && Math.hypot(owner.col - hazard.col, owner.row - hazard.row) < this.playerHeadRadiusCells() + this.pixelsToCells(6);
      if (!trigger && !ownerTriggered) continue;
      this.ring(hazard.col, hazard.row, hazard.color, 0.5, 10, hazard.radius, owner.entityId);
      this.burst(hazard.col, hazard.row, hazard.color, 18, 150, owner.entityId);
      this.shake(5, owner.entityId);
      for (const hostile of this.hostileTargets(owner)) {
        if (distanceSquared(hazard, hostile) < hazard.radius * hazard.radius) {
          this.damageTarget(owner, hostile, 1, hostile, hazard.color);
          if ('accountId' in hostile) this.bounceEntity(hostile, hostile.col - hazard.col, hostile.row - hazard.row, hazard.color, 0.58);
        }
      }
      if (ownerTriggered) this.bounceEntity(owner, owner.col - hazard.col, owner.row - hazard.row, hazard.color, 0.58);
      hazard.life = 0;
      this.effectSound('mine', owner.entityId);
    }
  }

  private checkCollisions(now: number): void {
    const players = this.activePlayers();
    for (const player of players) {
      if (!player.alive) continue;
      const wall = wallBounceNormal(player.col, player.row);
      if (wall) {
        player.col = clamp(player.col, 0, GRID_SIZE - 1);
        player.row = clamp(player.row, 0, GRID_SIZE - 1);
        this.bounceEntity(player, wall.col, wall.row, '#b8f53f', 0.58);
        continue;
      }
      if (player.collisionCooldown <= 0) {
        const ownBody = findSelfCollision(player, 0.5);
        if (ownBody) {
          this.bounceEntity(player, player.col - ownBody.col, player.row - ownBody.row, '#f4ffdc', 0.58);
          continue;
        }
      }
      if (player.invulnerable <= 0) {
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          const body = enemy.segments.find((segment) => Math.hypot(player.col - segment.col, player.row - segment.row) < 0.42);
          if (!body) continue;
          if (this.consumeDefense(player)) this.damageTarget(player, enemy, 1, body, '#ffffff');
          else this.eliminatePlayer(player, null, now, '被敌蛇截停');
          break;
        }
      }
      if (!player.alive) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || Math.hypot(player.col - enemy.col, player.row - enemy.row) >= this.playerHeadRadiusCells() + 0.28 || player.collisionCooldown > 0 || enemy.collisionCooldown > 0) continue;
        const normal = collisionNormal(player, enemy);
        const ram = this.moduleCount(player, 'ram');
        if (ram > 0 && player.ramCooldown <= 0) {
          this.damageTarget(player, enemy, 1, enemy, MODULE_BY_ID.ram.color);
          player.ramCooldown = 5 * Math.pow(0.86, ram - 1);
          this.ring(player.col, player.row, MODULE_BY_ID.ram.color, 0.42, 6, 1, player.entityId);
          this.playSkillSound(player, 'ram');
        }
        this.bounceEntity(player, normal.col, normal.row, '#dffcff', 0.58);
        if (!enemy.dead) this.bounceEntity(enemy, -normal.col, -normal.row, enemy.color, 0.54);
      }
    }

    for (let leftIndex = 0; leftIndex < players.length; leftIndex += 1) {
      const left = players[leftIndex];
      if (!left.alive) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < players.length; rightIndex += 1) {
        const right = players[rightIndex];
        if (!right.alive) continue;
        this.checkPlayerBodyHit(left, right, now);
        if (left.alive && right.alive) this.checkPlayerBodyHit(right, left, now);
        if (!left.alive || !right.alive || left.collisionCooldown > 0 || right.collisionCooldown > 0 || Math.hypot(left.col - right.col, left.row - right.row) >= this.playerHeadRadiusCells() * 2) continue;
        const normal = collisionNormal(left, right);
        this.applyRamCollision(left, right);
        this.applyRamCollision(right, left);
        this.bounceEntity(left, normal.col, normal.row, PLAYER_COLORS[left.colorIndex], 0.58);
        if (right.alive) this.bounceEntity(right, -normal.col, -normal.row, PLAYER_COLORS[right.colorIndex], 0.58);
      }
    }
  }

  private checkPlayerBodyHit(attacker: PlayerEntity, defender: PlayerEntity, now: number): void {
    if (attacker.invulnerable > 0 || attacker.collisionCooldown > 0) return;
    const body = defender.segments.find((segment) => Math.hypot(attacker.col - segment.col, attacker.row - segment.row) < 0.42);
    if (!body) return;
    if (this.consumeDefense(attacker)) {
      this.damageTarget(attacker, defender, 1, body, '#ffffff');
      return;
    }
    const thorns = this.moduleCount(defender, 'thorns');
    const thornsReady = thorns > 0 && defender.thornsCooldown <= 0;
    this.eliminatePlayer(attacker, defender, now, '撞上了对手身体');
    if (thornsReady) {
      this.triggerBodyIntercept(defender, body, attacker, thorns);
      defender.thornsCooldown = 6 * Math.pow(0.85, thorns - 1);
    }
  }

  private applyRamCollision(attacker: PlayerEntity, target: PlayerEntity): void {
    const ram = this.moduleCount(attacker, 'ram');
    if (ram <= 0 || attacker.ramCooldown > 0 || !target.alive) return;
    this.damageTarget(attacker, target, 1, target, MODULE_BY_ID.ram.color);
    attacker.ramCooldown = 5 * Math.pow(0.86, ram - 1);
    this.ring(attacker.col, attacker.row, MODULE_BY_ID.ram.color, 0.42, 6, 1, attacker.entityId);
    this.playSkillSound(attacker, 'ram');
  }

  private consumeDefense(player: PlayerEntity): boolean {
    const defense = player.segments.find((segment) => (segment.module === 'shield' || segment.module === 'phase') && segment.ready);
    if (!defense?.module) return false;
    defense.ready = false;
    defense.cooldown = (defense.module === 'shield' ? 18 : 22) * Math.pow(0.82, this.moduleCount(player, 'armor'));
    player.invulnerable = defense.module === 'phase' ? 1.55 : 1.05;
    this.effectSound('shield', player.entityId);
    this.ring(player.col, player.row, MODULE_BY_ID[defense.module].color, 0.7, 18, 76, player.entityId, 'pixels');
    this.burst(player.col, player.row, MODULE_BY_ID[defense.module].color, 18, 130, player.entityId);
    return true;
  }

  private damageTarget(owner: PlayerEntity, target: EnemyEntity | PlayerEntity, amount: number, point: GridPoint, color: string): void {
    if (!this.isTargetAlive(target) || ('accountId' in target && (target.invulnerable > 0 || target.paused || target.choosingUpgrade))) return;
    let applied = 0;
    let destroysHead = false;
    for (let index = 0; index < amount; index += 1) {
      applied += 1;
      if (target.segments.length === 0) {
        destroysHead = true;
        break;
      }
      const removed = target.segments.pop()!;
      this.burst(removed.col, removed.row, color, 7, 95, owner.entityId);
      const salvageChance = Math.min(0.72, this.moduleCount(owner, 'salvage') * 0.14);
      if (salvageChance > 0 && this.random() < salvageChance) this.spawnFood({ col: removed.col + this.randomBetween(-0.3, 0.3), row: removed.row + this.randomBetween(-0.3, 0.3) }, true);
    }
    this.textEffect(point.col, point.row - 0.35, `-${applied}`, color, 0.48, owner.entityId);
    this.effectSound('hit', owner.entityId);
    this.shake(2.2, owner.entityId);
    if (!destroysHead) return;
    if ('accountId' in target) {
      if (this.consumeDefense(target)) return;
      this.eliminatePlayer(target, owner, this.now, '被火力击破');
    } else this.killEnemy(target, owner);
  }

  private killEnemy(enemy: EnemyEntity, owner: PlayerEntity | null): void {
    if (enemy.dead) return;
    enemy.dead = true;
    if (owner) {
      owner.kills += 1;
      owner.botKills += 1;
      owner.score += 100 + enemy.captured * 25;
      const cache = this.moduleCount(owner, 'cache');
      if (cache > 0) {
        owner.cacheKills += 1;
        if (owner.cacheKills >= Math.max(2, 6 - cache)) {
          owner.cacheKills = 0;
          this.spawnFood(enemy, true);
          this.ring(enemy.col, enemy.row, MODULE_BY_ID.cache.color, 0.65, 8, 1, owner.entityId);
        }
      }
      const bloom = this.moduleCount(owner, 'bloom');
      if (bloom > 0 && owner.bloomCooldown <= 0) {
        this.spawnFood(enemy, true);
        owner.bloomCooldown = 30 * Math.pow(0.88, bloom - 1);
      }
      let dropCount = enemy.captured;
      const fortune = this.moduleCount(owner, 'fortune');
      if (this.random() < Math.min(0.85, fortune * 0.18)) dropCount += 1 + Math.floor(fortune / 3);
      for (let index = 0; index < dropCount; index += 1) {
        const angle = index * 2.4 + this.randomBetween(-0.25, 0.25);
        const distance = this.pixelsToCells(22 + Math.sqrt(index + 1) * 12);
        this.spawnFood({ col: enemy.col + Math.cos(angle) * distance, row: enemy.row + Math.sin(angle) * distance }, true);
      }
      this.emitEvent('bot-kill', `${owner.name} 击破了一条敌蛇`, this.now, owner.entityId);
      this.effectSound('kill', owner.entityId);
    }
    enemy.captured = 0;
    this.burst(enemy.col, enemy.row, enemy.color, 24, 175, owner?.entityId);
    this.ring(enemy.col, enemy.row, enemy.color, 0.72, 12, 88, owner?.entityId, 'pixels');
    this.textEffect(enemy.col, enemy.row - 0.65, '击破', '#ffffff', 0.9, owner?.entityId);
    this.shake(7, owner?.entityId);
  }

  private triggerBodyIntercept(player: PlayerEntity, point: GridPoint, defeatedAt: GridPoint, stacks: number): void {
    const shotCount = 6 + Math.min(10, Math.max(0, stacks - 1) * 2);
    const startAngle = this.randomBetween(0, TAU);
    for (let index = 0; index < shotCount; index += 1) this.createProjectile(player, point, startAngle + index * TAU / shotCount, { speed: 280, life: 1.25, color: MODULE_BY_ID.thorns.color, size: 4.2 });
    this.spawnFood(defeatedAt, true);
    this.burst(point.col, point.row, MODULE_BY_ID.thorns.color, 18, 145, player.entityId);
    this.ring(point.col, point.row, MODULE_BY_ID.thorns.color, 0.55, 8, 1.4, player.entityId);
    this.playSkillSound(player, 'thorns');
  }

  private hostileTargets(owner: PlayerEntity): Array<EnemyEntity | PlayerEntity> {
    return [
      ...this.enemies.filter((enemy) => !enemy.dead),
      ...this.activePlayers().filter((player) => player !== owner),
    ];
  }

  private nearestTarget(owner: PlayerEntity, origin: GridPoint, maximumDistance: number): EnemyEntity | PlayerEntity | null {
    let nearest: EnemyEntity | PlayerEntity | null = null;
    let best = maximumDistance * maximumDistance;
    for (const target of this.hostileTargets(owner)) {
      const distance = distanceSquared(origin, target);
      if (distance < best) {
        best = distance;
        nearest = target;
      }
    }
    return nearest;
  }

  private pointHitsTarget(point: GridPoint, radius: number, target: EnemyEntity | PlayerEntity): boolean {
    const headRadius = 'accountId' in target ? this.playerHeadRadiusCells() : 0.28;
    if (distanceSquared(point, target) < (radius + headRadius) ** 2) return true;
    return target.segments.some((segment) => distanceSquared(point, segment) < (radius + this.pixelsToCells(9)) ** 2);
  }

  private isTargetAlive(target: EnemyEntity | PlayerEntity): boolean {
    return 'accountId' in target ? target.alive : !target.dead;
  }

  private targetRef(target: EnemyEntity | PlayerEntity): TargetRef {
    return 'accountId' in target ? { kind: 'player', id: target.entityId } : { kind: 'enemy', id: target.id };
  }

  private resolveTarget(ref: TargetRef): EnemyEntity | PlayerEntity | null {
    return ref.kind === 'player'
      ? this.playersByEntity.get(ref.id) ?? null
      : this.enemies.find((enemy) => enemy.id === ref.id) ?? null;
  }

  private pixelsToCells(value: number): number {
    return value / CANONICAL_CELL_SIZE;
  }

  private playerHeadRadiusCells(): number {
    return 18 / CANONICAL_CELL_SIZE;
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
    if (killer && killer !== victim && killer.alive) {
      killer.kills += 1;
      killer.pvpKills += 1;
      killer.score += 300 + victim.level * 80;
      const cache = this.moduleCount(killer, 'cache');
      if (cache > 0) {
        killer.cacheKills += 1;
        if (killer.cacheKills >= Math.max(2, 6 - cache)) {
          killer.cacheKills = 0;
          this.spawnFood(victim, true);
          this.ring(victim.col, victim.row, MODULE_BY_ID.cache.color, 0.65, 8, 1, killer.entityId);
        }
      }
      const bloom = this.moduleCount(killer, 'bloom');
      if (bloom > 0 && killer.bloomCooldown <= 0) {
        this.spawnFood(victim, true);
        killer.bloomCooldown = 30 * Math.pow(0.88, bloom - 1);
      }
      this.emitEvent('pvp-kill', `${killer.name} 截停了 ${victim.name}`, now, killer.entityId);
    } else {
      this.emitEvent('pvp-kill', `${victim.name} ${reason}`, now, victim.entityId);
    }
    let dropCount = Math.min(12, victim.segments.length);
    if (killer) {
      const fortune = this.moduleCount(killer, 'fortune');
      if (this.random() < Math.min(0.85, fortune * 0.18)) dropCount += 1 + Math.floor(fortune / 3);
    }
    for (let index = 0; index < dropCount; index += 1) {
      const angle = index * 2.4 + this.randomBetween(-0.25, 0.25);
      const distance = 0.65 + Math.sqrt(index + 1) * 0.35;
      this.spawnFood({ col: victim.col + Math.cos(angle) * distance, row: victim.row + Math.sin(angle) * distance }, true);
    }
    this.burst(victim.col, victim.row, '#b8f53f', 28, 170, victim.entityId);
    this.effectSound('death', victim.entityId);
    this.shake(16, victim.entityId);
    this.pendingEffects.push({ id: this.effectId(), type: 'flash', color: '#ff4f70', strength: 0.5, audienceEntityId: victim.entityId });
    victim.alive = false;
    victim.paused = false;
    victim.choosingUpgrade = false;
    victim.upgradeOffer = null;
    victim.segments = [];
    victim.growth = null;
    victim.growthQueue = [];
    victim.respawnAt = victim.connected ? now + RESPAWN_DELAY_MS : null;
    this.callbacks.onRunEnded?.(result);
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

  private bounceEntity(entity: PlayerEntity | EnemyEntity, normalX: number, normalY: number, color: string, spacing: number): void {
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
    const impulseMultiplier = isPlayer
      ? Math.pow(0.82, this.moduleCount(entity, 'buffer'))
      : 1 + this.maximumModuleCount('momentum') * 0.18;
    entity.knockbackX = nx * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
    entity.knockbackY = ny * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
    entity.angle = bounceAngle;
    entity.desiredAngle = bounceAngle;
    const stabilization = isPlayer ? this.moduleCount(entity, 'stabilizer') : 0;
    entity.slow = Math.max(entity.slow, BOUNCE_SLOW_TIME * Math.pow(0.75, stabilization));
    entity.collisionCooldown = BOUNCE_LOCK_TIME * Math.pow(0.8, stabilization);
    followContinuousSegments(entity.col, entity.row, entity.segments, spacing);
    this.burst(entity.col, entity.row, color, 13, 135);
    this.ring(entity.col, entity.row, color, 0.38, 5, 0.85);
    this.shake(4.5);
    this.effectSound('bounce');
  }

  private maximumModuleCount(id: ModuleId): number {
    return this.activePlayers().reduce((maximum, player) => Math.max(maximum, this.moduleCount(player, id)), 0);
  }

  private burst(col: number, row: number, color: string, count: number, speed: number, audienceEntityId?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'burst', col, row, color, count, speed, audienceEntityId });
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
  ): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'ring', col, row, color, life, radius, endRadius, endRadiusUnit, audienceEntityId });
  }

  private shake(strength: number, audienceEntityId?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'shake', strength, audienceEntityId });
  }

  private beam(type: 'beam' | 'lightning', from: GridPoint, to: GridPoint, color: string, life: number, audienceEntityId?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type, col: from.col, row: from.row, col2: to.col, row2: to.row, color, life, audienceEntityId });
  }

  private textEffect(col: number, row: number, text: string, color: string, life: number, audienceEntityId?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'text', col, row, text, color, life, audienceEntityId });
  }

  private effectSound(kind: Extract<UltraEffect, { type: 'sound' }>['kind'], audienceEntityId?: number, detail?: number): void {
    this.pendingEffects.push({ id: this.effectId(), type: 'sound', kind, detail, audienceEntityId });
  }

  private flushEffects(): void {
    if (this.pendingEffects.length === 0) return;
    this.callbacks.onEffects?.(this.pendingEffects.splice(0));
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
    neutral: options.neutral ?? false,
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
    if ('angle' in segment) (segment as UltraSegment).angle = Math.atan2(dy, dx);
    if (distance > spacing) {
      segment.col = previous.col - dx / distance * spacing;
      segment.row = previous.row - dy / distance * spacing;
    }
    previous = segment;
  }
}

function buildSerpentinePaths(): GridPoint[][] {
  const base: GridPoint[] = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let step = 0; step < GRID_SIZE; step += 1) base.push({ col: row % 2 === 0 ? step : GRID_SIZE - 1 - step, row });
  }
  const transforms = [
    (cell: GridPoint) => ({ col: cell.col, row: cell.row }),
    (cell: GridPoint) => ({ col: GRID_SIZE - 1 - cell.col, row: cell.row }),
    (cell: GridPoint) => ({ col: cell.col, row: GRID_SIZE - 1 - cell.row }),
    (cell: GridPoint) => ({ col: cell.row, row: cell.col }),
    (cell: GridPoint) => ({ col: GRID_SIZE - 1 - cell.row, row: cell.col }),
    (cell: GridPoint) => ({ col: cell.row, row: GRID_SIZE - 1 - cell.col }),
  ];
  const paths: GridPoint[][] = [];
  for (const transform of transforms) {
    const path = base.map(transform);
    paths.push(path, [...path].reverse());
  }
  return paths;
}

function toRosterPlayer(player: PlayerEntity): RosterPlayer {
  return {
    entityId: player.entityId,
    name: player.name,
    colorIndex: player.colorIndex,
    connected: player.connected,
    alive: player.alive,
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
    paused: player.paused,
    choosingUpgrade: player.choosingUpgrade,
    col: player.col,
    row: player.row,
    angle: player.angle,
    desiredAngle: player.desiredAngle,
    invulnerable: player.invulnerable,
    collisionCooldown: player.collisionCooldown,
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
  return { id: enemy.id, col: enemy.col, row: enemy.row, angle: enemy.angle, color: enemy.color, captured: enemy.captured, segments: enemy.segments.map((segment) => ({ ...segment })) };
}

function toProjectileView(projectile: ProjectileEntity): UltraProjectileView {
  return { id: projectile.id, col: projectile.col, row: projectile.row, vx: projectile.vx, vy: projectile.vy, color: projectile.color, size: projectile.size };
}

function toHazardView(hazard: HazardEntity): UltraHazardView {
  return { id: hazard.id, kind: hazard.kind, col: hazard.col, row: hazard.row, radius: hazard.radius, color: hazard.color, phase: hazard.phase };
}

function toPendingSpawnView(spawn: PendingSpawn): PendingSpawnView {
  return { id: spawn.id, color: spawn.color, headCell: { ...spawn.headCell }, bodyCells: spawn.bodyCells.map((cell) => ({ ...cell })), timer: spawn.timer, maxTimer: spawn.maxTimer };
}

function cellKey(point: GridPoint): string {
  return `${clamp(Math.round(point.col), 0, GRID_SIZE - 1)},${clamp(Math.round(point.row), 0, GRID_SIZE - 1)}`;
}

function manhattan(left: GridPoint, right: GridPoint): number {
  return Math.abs(left.col - right.col) + Math.abs(left.row - right.row);
}

function distanceSquared(left: GridPoint, right: GridPoint): number {
  const col = left.col - right.col;
  const row = left.row - right.row;
  return col * col + row * row;
}

function targetKey(target: EnemyEntity | PlayerEntity): string {
  return 'accountId' in target ? `p:${target.entityId}` : `e:${target.id}`;
}

function wallBounceNormal(col: number, row: number): GridPoint | null {
  let normalCol = 0;
  let normalRow = 0;
  if (col < 0) normalCol += 1;
  else if (col > GRID_SIZE - 1) normalCol -= 1;
  if (row < 0) normalRow += 1;
  else if (row > GRID_SIZE - 1) normalRow -= 1;
  return normalCol || normalRow ? { col: normalCol, row: normalRow } : null;
}

function findSelfCollision(entity: { col: number; row: number; segments: GridPoint[] }, threshold: number): GridPoint | null {
  for (let index = 2; index < entity.segments.length; index += 1) {
    const segment = entity.segments[index];
    if (Math.hypot(entity.col - segment.col, entity.row - segment.row) < threshold) return segment;
  }
  return null;
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

function normalizeAngle(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function rotateToward(current: number, target: number, maximumStep: number): number {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + clamp(difference, -maximumStep, maximumStep);
}

function isProjectileInside(projectile: ProjectileEntity): boolean {
  return projectile.col >= PROJECTILE_MIN && projectile.col <= PROJECTILE_MAX && projectile.row >= PROJECTILE_MIN && projectile.row <= PROJECTILE_MAX;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
