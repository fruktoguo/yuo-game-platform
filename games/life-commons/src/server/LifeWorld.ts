import { randomUUID } from 'node:crypto';
import type { CellPatch } from '../shared/binary';
import { encodeWorldPatch, encodeWorldSnapshot } from '../shared/binary';
import { normalizePlayerColor, playerColorForOwner } from '../shared/colors';
import {
  ACTIVE_TICK_RATE,
  BASE_ENERGY_REGEN_PER_SECOND,
  CLAIMABLE_MAX_X,
  CLAIMABLE_MAX_Y,
  CLAIMABLE_MIN_X,
  CLAIMABLE_MIN_Y,
  FINALE_START_SECTORS,
  GENESIS_DURATION_MS,
  IDLE_TICK_RATE,
  MAX_ERASER_SIZE,
  MAX_ENERGY,
  MAX_PLAYER_OWNER_ID,
  NEUTRAL_OWNER_ID,
  SECTOR_COLUMNS,
  SECTOR_COUNT,
  SECTOR_FULL_OCCUPANCY_CELLS,
  SECTOR_OCCUPIED_MIN_CELLS,
  SECTOR_ROWS,
  SECTOR_SIZE,
  SECTOR_VICTORY_COUNT,
  WORLD_CELL_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../shared/constants';
import {
  customPatternCost,
  isPatternId,
  isValidCustomPatternData,
  PATTERNS,
  transformCells,
  transformPattern,
  type CellOffset,
  type PatternId,
} from '../shared/patterns';
import type {
  HallOfFameEntry,
  PlacementAction,
  PlacementResult,
  SeasonChallenge,
  SeasonPhase,
  WorldEvent,
  WorldMeta,
  WorldPlayerView,
} from '../shared/protocol';
import { sectorIndexAt, sectorOrigin } from '../shared/sectors';
import { evolveGeneration } from './lifeRules';
import { type StoredPlayer, type StoredWorldState, type WorldStore } from './WorldStore';

const PLAYER_RETENTION_MS = 6 * 60 * 60_000;

interface WorldCallbacks {
  onPatch: (patch: ArrayBuffer) => void;
  onSnapshot: (snapshot: ArrayBuffer) => void;
  onEvent: (event: WorldEvent) => void;
}

const emptyCallbacks: WorldCallbacks = {
  onPatch: () => undefined,
  onSnapshot: () => undefined,
  onEvent: () => undefined,
};

export class LifeWorld {
  private owners = new Uint16Array(WORLD_CELL_COUNT);
  private ages = new Uint8Array(WORLD_CELL_COUNT);
  private nextOwners = new Uint16Array(WORLD_CELL_COUNT);
  private nextAges = new Uint8Array(WORLD_CELL_COUNT);
  private readonly populations = new Uint32Array(65_536);
  private readonly births = new Uint32Array(65_536);
  private readonly elders = new Uint32Array(65_536);
  private readonly players = new Map<number, StoredPlayer>();
  private readonly accountToOwner = new Map<string, number>();
  private readonly sectorCellCounts = Array.from({ length: SECTOR_COUNT }, () => new Map<number, number>());
  private sectorOwners = new Uint16Array(SECTOR_COUNT);
  private fullyOccupiedSectorOwners = new Uint16Array(SECTOR_COUNT);
  private readonly lastScoredSectorOwners = new Uint16Array(SECTOR_COUNT);
  private readonly lastScoredFullyOccupiedSectorOwners = new Uint16Array(SECTOR_COUNT);
  private hallOfFame: HallOfFameEntry[] = [];
  private callbacks = emptyCallbacks;
  private season: StoredWorldState['season'];
  private tick = 0;
  private nextOwnerId = 1;
  private onlineCount = 0;
  private totalPopulation = 0;
  private running = false;
  private tickTimer: NodeJS.Timeout | null = null;
  private persistTimer: NodeJS.Timeout | null = null;
  private manualFlushTimer: NodeJS.Timeout | null = null;
  private readonly pendingManualChanges = new Map<number, CellPatch>();
  private lastStepAt = Date.now();
  private lastSectorScoreAt = Date.now();

  constructor(private readonly store: Pick<WorldStore, 'save'>, storedState: StoredWorldState | null) {
    const now = Date.now();
    this.season = createSeason(1, now);
    if (storedState) this.restore(storedState);
    else this.seedNeutralLife(1);
    this.recountPopulation();
    this.refreshSectorControl();
    this.lastScoredSectorOwners.set(this.sectorOwners);
    this.lastScoredFullyOccupiedSectorOwners.set(this.fullyOccupiedSectorOwners);
    if (this.shouldFinishSeason()) this.finishSeason(now, false);
  }

  setCallbacks(callbacks: WorldCallbacks): void {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastStepAt = Date.now();
    this.scheduleNextTick();
    this.persistTimer = setInterval(() => {
      void this.persist().catch((error) => console.error('世界持久化失败', error));
    }, 20_000);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.tickTimer) clearTimeout(this.tickTimer);
    if (this.persistTimer) clearInterval(this.persistTimer);
    if (this.manualFlushTimer) clearTimeout(this.manualFlushTimer);
    this.tickTimer = null;
    this.persistTimer = null;
    this.manualFlushTimer = null;
    this.flushManualChanges();
    await this.persist();
  }

  setOnlineCount(count: number): void {
    this.onlineCount = Math.max(0, count);
  }

  connectPlayer(accountId: string, requestedName: string): { player: WorldPlayerView; isNew: boolean } {
    const now = Date.now();
    const existingOwner = this.accountToOwner.get(accountId);
    if (existingOwner !== undefined) {
      const player = this.players.get(existingOwner)!;
      player.energy = Math.min(MAX_ENERGY, player.energy + (now - player.lastSeenAt) / 1000 * BASE_ENERGY_REGEN_PER_SECOND);
      player.name = this.createUniqueName(requestedName, existingOwner);
      player.connected = true;
      player.lastSeenAt = now;
      return { player: toPlayerView(player), isNew: false };
    }

    const ownerId = this.allocateOwnerId();
    const player: StoredPlayer = {
      ownerId,
      accountId,
      name: this.createUniqueName(requestedName),
      color: playerColorForOwner(ownerId),
      connected: true,
      energy: MAX_ENERGY,
      score: 0,
      births: 0,
      population: 0,
      peakPopulation: 0,
      sectors: 0,
      fullyOccupiedSectors: 0,
      lastSeenAt: now,
    };
    this.players.set(ownerId, player);
    this.accountToOwner.set(accountId, ownerId);
    return { player: toPlayerView(player), isNew: true };
  }

  disconnectPlayer(ownerId: number): void {
    const player = this.players.get(ownerId);
    if (!player) return;
    player.connected = false;
    player.lastSeenAt = Date.now();
  }

  getPlayer(ownerId: number): WorldPlayerView | null {
    const player = this.players.get(ownerId);
    return player ? toPlayerView(player) : null;
  }

  setPlayerColor(ownerId: number, value: unknown): { ok: true; player: WorldPlayerView } | { ok: false; error: string } {
    const player = this.players.get(ownerId);
    if (!player?.connected) return { ok: false, error: '玩家不在线' };
    const color = normalizePlayerColor(value);
    if (!color) return { ok: false, error: '颜色过暗或格式无效，请选择更明亮的颜色' };
    player.color = color;
    return { ok: true, player: toPlayerView(player) };
  }

  getSnapshot(): ArrayBuffer {
    return encodeWorldSnapshot(WORLD_WIDTH, WORLD_HEIGHT, this.tick, this.owners, this.ages);
  }

  getMeta(now = Date.now()): WorldMeta {
    const leaderboard = [...this.players.values()]
      .filter((player) => player.connected || player.score > 0 || player.population > 0)
      .sort((left, right) => right.score - left.score || right.births - left.births)
      .slice(0, 16)
      .map(toPlayerView);
    const occupiedSectors = this.sectorOwners.reduce((total, ownerId) => total + Number(ownerId !== 0), 0);
    const leadingSectors = [...this.players.values()].reduce((maximum, player) => Math.max(maximum, player.sectors), 0);
    return {
      tick: this.tick,
      tickRate: this.onlineCount > 0 ? ACTIVE_TICK_RATE : IDLE_TICK_RATE,
      online: this.onlineCount,
      population: this.totalPopulation,
      season: {
        id: this.season.id,
        startedAt: this.season.startedAt,
        occupiedSectors,
        claimableSectors: SECTOR_COUNT,
        victoryAtSectors: SECTOR_VICTORY_COUNT,
        leadingSectors,
        phase: this.getSeasonPhase(now),
        challenge: { ...this.season.challenge },
      },
      leaderboard,
      sectorOwners: [...this.sectorOwners],
      fullyOccupiedSectorOwners: [...this.fullyOccupiedSectorOwners],
      playerColors: [...this.players.values()]
        .filter((player) => player.connected || player.population > 0)
        .map((player) => ({ ownerId: player.ownerId, color: player.color })),
      hallOfFame: this.hallOfFame.slice(0, 15),
    };
  }

  place(ownerId: number, action: PlacementAction): { ok: true; result: PlacementResult } | { ok: false; error: string } {
    const player = this.players.get(ownerId);
    if (!player?.connected) return { ok: false, error: '玩家不在线' };
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y) || action.x < 0 || action.x >= WORLD_WIDTH || action.y < 0 || action.y >= WORLD_HEIGHT) {
      return { ok: false, error: '坐标无效' };
    }
    if (action.mode === 'stamp') return this.stamp(player, action);
    if (action.mode === 'erase') return this.erase(player, action);
    return { ok: false, error: '操作类型无效' };
  }

  stepOnce(now = Date.now()): void {
    this.flushManualChanges();
    if (this.shouldFinishSeason()) {
      this.finishSeason(now, true);
      this.lastStepAt = now;
      return;
    }

    const elapsedSeconds = Math.max(0, (now - this.lastStepAt) / 1000);
    this.lastStepAt = now;
    this.regenerateEnergy(elapsedSeconds, now);

    const result = evolveGeneration(this.owners, this.ages, WORLD_WIDTH, WORLD_HEIGHT, {
      nextOwners: this.nextOwners,
      nextAges: this.nextAges,
      populations: this.populations,
      births: this.births,
      elders: this.elders,
    });
    [this.owners, this.nextOwners] = [this.nextOwners, this.owners];
    [this.ages, this.nextAges] = [this.nextAges, this.ages];
    this.tick = (this.tick + 1) >>> 0;
    this.totalPopulation = result.totalPopulation;
    this.updatePlayerScores();
    this.updateChallenge();
    this.refreshSectorControl();
    if (now - this.lastSectorScoreAt >= 5_000) {
      this.lastSectorScoreAt = now;
      this.scoreSectors(now);
    }
    if (this.shouldFinishSeason()) {
      this.finishSeason(now, true);
      return;
    }
    this.callbacks.onPatch(encodeWorldPatch(this.tick, result.changes));
  }

  async persist(): Promise<void> {
    await this.store.save(this.toStoredState());
  }

  private stamp(player: StoredPlayer, action: PlacementAction): { ok: true; result: PlacementResult } | { ok: false; error: string } {
    const customPattern = action.customPattern;
    if (customPattern !== undefined && !isValidCustomPatternData(customPattern)) return { ok: false, error: '自定义图案无效' };
    if (customPattern === undefined && !isPatternId(action.patternId)) return { ok: false, error: '图案无效' };
    const pattern = customPattern ?? PATTERNS[action.patternId];
    const patternName = pattern.name.trim();
    const cost = customPattern ? customPatternCost(customPattern.cells.length) : PATTERNS[action.patternId].cost;
    const cells = customPattern
      ? transformCells(customPattern.cells, action.rotation, Boolean(action.flipped))
      : transformPattern(action.patternId, action.rotation, Boolean(action.flipped));
    if (!isPatternInsideWorld(action.x, action.y, cells)) return { ok: false, error: '图案超出世界边界' };
    if (player.energy + 0.000_1 < cost) return { ok: false, error: '能量不足' };
    for (const cell of cells) {
      const sector = sectorIndexAt(action.x + cell.x, action.y + cell.y);
      const fullOwnerId = sector === null ? 0 : this.fullyOccupiedSectorOwners[sector];
      if (fullOwnerId !== 0 && fullOwnerId !== player.ownerId) return { ok: false, error: '图案触及其他玩家完全占据的区域' };
    }
    const indices = new Set<number>();
    for (const cell of cells) {
      const x = action.x + cell.x;
      const y = action.y + cell.y;
      const index = y * WORLD_WIDTH + x;
      if (this.owners[index] === 0) indices.add(index);
    }
    if (indices.size === 0) return { ok: false, error: '目标区域没有可放置的空格' };

    player.energy -= cost;
    player.population += indices.size;
    player.peakPopulation = Math.max(player.peakPopulation, player.population);
    this.totalPopulation += indices.size;
    for (const index of indices) {
      this.owners[index] = player.ownerId;
      this.ages[index] = 1;
      this.queueManualChange({ index, ownerId: player.ownerId, age: 1 });
    }
    this.updateManualSectorControl(indices, 0, player.ownerId);
    if (customPattern || action.patternId !== 'cell' || indices.size >= 5) {
      this.callbacks.onEvent(createEvent('stamp', `${player.name} 投放了${patternName}`, player.ownerId, action.x, action.y));
    }
    return { ok: true, result: { changed: indices.size, cost, energy: player.energy } };
  }

  private erase(player: StoredPlayer, action: PlacementAction): { ok: true; result: PlacementResult } | { ok: false; error: string } {
    if (!Number.isInteger(action.brushSize) || action.brushSize < 1 || action.brushSize > MAX_ERASER_SIZE) return { ok: false, error: '橡皮擦尺寸无效' };
    const radius = action.brushSize - 1;
    const targets: number[] = [];
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const x = action.x + offsetX;
        const y = action.y + offsetY;
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) continue;
        const index = y * WORLD_WIDTH + x;
        if (this.owners[index] === player.ownerId) targets.push(index);
      }
    }
    if (targets.length === 0) return { ok: false, error: '只能清除自己的细胞' };

    player.energy = Math.min(MAX_ENERGY, player.energy + targets.length);
    for (const index of targets) {
      this.owners[index] = 0;
      this.ages[index] = 0;
      this.totalPopulation = Math.max(0, this.totalPopulation - 1);
      player.population = Math.max(0, player.population - 1);
      this.queueManualChange({ index, ownerId: 0, age: 0 });
    }
    this.updateManualSectorControl(targets, player.ownerId, 0);
    return { ok: true, result: { changed: targets.length, cost: 0, energy: player.energy } };
  }

  private queueManualChange(change: CellPatch): void {
    this.pendingManualChanges.set(change.index, change);
    if (this.manualFlushTimer) return;
    this.manualFlushTimer = setTimeout(() => {
      this.manualFlushTimer = null;
      this.flushManualChanges();
    }, 40);
  }

  private flushManualChanges(): void {
    if (this.manualFlushTimer) clearTimeout(this.manualFlushTimer);
    this.manualFlushTimer = null;
    if (this.pendingManualChanges.size === 0) return;
    this.callbacks.onPatch(encodeWorldPatch(this.tick, [...this.pendingManualChanges.values()]));
    this.pendingManualChanges.clear();
  }

  private updatePlayerScores(): void {
    for (const player of this.players.values()) {
      player.population = this.populations[player.ownerId];
      player.peakPopulation = Math.max(player.peakPopulation, player.population);
      const births = this.births[player.ownerId];
      player.births += births;
      player.score += births * 2 + player.population * 0.02;
    }
  }

  private updateChallenge(): void {
    const challenge = this.season.challenge;
    if (challenge.completed) return;
    if (challenge.type === 'births') {
      let births = 0;
      for (const player of this.players.values()) births += this.births[player.ownerId];
      challenge.progress += births;
    } else if (challenge.type === 'elders') {
      let elders = 0;
      for (const player of this.players.values()) elders += this.elders[player.ownerId];
      challenge.progress += elders;
    } else {
      challenge.progress = Math.max(challenge.progress, this.totalPopulation);
    }
    if (challenge.progress < challenge.target) return;
    challenge.progress = challenge.target;
    challenge.completed = true;
    for (const player of this.players.values()) {
      if (!player.connected) continue;
      player.score += 100;
      player.energy = Math.min(MAX_ENERGY, player.energy + 40);
    }
    this.callbacks.onEvent(createEvent('challenge', `全服完成公共目标：${challenge.title}`));
  }

  private refreshSectorControl(): void {
    for (const counts of this.sectorCellCounts) counts.clear();
    for (let y = CLAIMABLE_MIN_Y; y <= CLAIMABLE_MAX_Y; y += 1) {
      const sectorRow = Math.floor((y - CLAIMABLE_MIN_Y) / SECTOR_SIZE);
      for (let x = CLAIMABLE_MIN_X; x <= CLAIMABLE_MAX_X; x += 1) {
        const ownerId = this.owners[y * WORLD_WIDTH + x];
        if (ownerId === 0 || ownerId === NEUTRAL_OWNER_ID) continue;
        const sector = sectorRow * SECTOR_COLUMNS + Math.floor((x - CLAIMABLE_MIN_X) / SECTOR_SIZE);
        const sectorCounts = this.sectorCellCounts[sector];
        sectorCounts.set(ownerId, (sectorCounts.get(ownerId) ?? 0) + 1);
      }
    }

    for (const player of this.players.values()) {
      player.sectors = 0;
      player.fullyOccupiedSectors = 0;
    }
    this.sectorOwners.fill(0);
    this.fullyOccupiedSectorOwners.fill(0);
    this.recalculateSectorControl(Array.from({ length: SECTOR_COUNT }, (_, sector) => sector));
  }

  private updateManualSectorControl(indices: Iterable<number>, previousOwnerId: number, nextOwnerId: number): void {
    const affectedSectors = new Set<number>();
    for (const index of indices) {
      const sector = sectorIndexAt(index % WORLD_WIDTH, Math.floor(index / WORLD_WIDTH));
      if (sector === null) continue;
      const counts = this.sectorCellCounts[sector];
      if (previousOwnerId !== 0 && previousOwnerId !== NEUTRAL_OWNER_ID) {
        const count = (counts.get(previousOwnerId) ?? 0) - 1;
        if (count > 0) counts.set(previousOwnerId, count);
        else counts.delete(previousOwnerId);
      }
      if (nextOwnerId !== 0 && nextOwnerId !== NEUTRAL_OWNER_ID) counts.set(nextOwnerId, (counts.get(nextOwnerId) ?? 0) + 1);
      affectedSectors.add(sector);
    }
    this.recalculateSectorControl(affectedSectors);
  }

  private recalculateSectorControl(sectors: Iterable<number>): void {
    for (const sector of sectors) {
      const previousOwnerId = this.sectorOwners[sector];
      const previousFullOwnerId = this.fullyOccupiedSectorOwners[sector];
      const previousPlayer = this.players.get(previousOwnerId);
      if (previousPlayer) previousPlayer.sectors = Math.max(0, previousPlayer.sectors - 1);
      const previousFullPlayer = this.players.get(previousFullOwnerId);
      if (previousFullPlayer) previousFullPlayer.fullyOccupiedSectors = Math.max(0, (previousFullPlayer.fullyOccupiedSectors ?? 0) - 1);
      let winner = 0;
      let winnerCount = 0;
      for (const [ownerId, count] of this.sectorCellCounts[sector]) {
        if (count > winnerCount || (count === winnerCount && ownerId < winner)) {
          winner = ownerId;
          winnerCount = count;
        }
      }
      const player = this.players.get(winner);
      this.sectorOwners[sector] = 0;
      this.fullyOccupiedSectorOwners[sector] = 0;
      if (player && winnerCount >= SECTOR_OCCUPIED_MIN_CELLS) {
        this.sectorOwners[sector] = winner;
        player.sectors += 1;
        if (winnerCount >= SECTOR_FULL_OCCUPANCY_CELLS) {
          this.fullyOccupiedSectorOwners[sector] = winner;
          player.fullyOccupiedSectors = (player.fullyOccupiedSectors ?? 0) + 1;
        }
      }
    }
  }

  private scoreSectors(_now: number): void {
    for (const player of this.players.values()) player.score += player.sectors * 5;
    for (let sector = 0; sector < SECTOR_COUNT; sector += 1) {
      const ownerId = this.sectorOwners[sector];
      const fullOwnerId = this.fullyOccupiedSectorOwners[sector];
      const origin = sectorOrigin(sector);
      if (fullOwnerId !== 0 && fullOwnerId !== this.lastScoredFullyOccupiedSectorOwners[sector]) {
        const player = this.players.get(fullOwnerId);
        if (player) this.callbacks.onEvent(createEvent('sector', `${player.name} 完全占据了区域 ${sector + 1}`, fullOwnerId, origin.x, origin.y));
      } else if (ownerId !== 0 && this.lastScoredSectorOwners[sector] !== 0 && ownerId !== this.lastScoredSectorOwners[sector]) {
        const player = this.players.get(ownerId);
        if (player) this.callbacks.onEvent(createEvent('sector', `${player.name} 占据了区域 ${sector + 1}`, ownerId, origin.x, origin.y));
      }
    }
    this.lastScoredSectorOwners.set(this.sectorOwners);
    this.lastScoredFullyOccupiedSectorOwners.set(this.fullyOccupiedSectorOwners);
  }

  private regenerateEnergy(elapsedSeconds: number, now: number): void {
    for (const player of this.players.values()) {
      if (!player.connected) continue;
      player.energy = Math.min(MAX_ENERGY, player.energy + elapsedSeconds * BASE_ENERGY_REGEN_PER_SECOND);
      player.lastSeenAt = now;
    }
  }

  private getSeasonPhase(now: number): SeasonPhase {
    if (now - this.season.startedAt < GENESIS_DURATION_MS) return 'genesis';
    if ([...this.players.values()].some((player) => player.sectors >= FINALE_START_SECTORS)) return 'finale';
    return 'evolution';
  }

  private shouldFinishSeason(): boolean {
    return this.findVictoryOwnerId() !== null;
  }

  private finishSeason(now: number, emit: boolean): void {
    const victoryOwnerId = this.findVictoryOwnerId();
    const winners = [...this.players.values()]
      .filter((player) => player.score > 0 || player.ownerId === victoryOwnerId)
      .sort((left, right) => Number(right.ownerId === victoryOwnerId) - Number(left.ownerId === victoryOwnerId)
        || right.sectors - left.sectors || right.score - left.score)
      .slice(0, 3);
    const entries = winners.map((player, index): HallOfFameEntry => ({
      seasonId: this.season.id,
      rank: index + 1,
      name: player.name,
      color: player.color,
      score: Math.round(player.score),
      births: player.births,
      peakPopulation: player.peakPopulation,
    }));
    this.hallOfFame = [...entries, ...this.hallOfFame].slice(0, 15);
    if (emit) {
      const winnerText = entries[0] ? `，${entries[0].name} 率先占据 ${SECTOR_VICTORY_COUNT} 个区域` : '';
      this.callbacks.onEvent(createEvent('season', `第 ${this.season.id} 赛季结束${winnerText}`));
    }

    for (const [ownerId, player] of this.players) {
      const expired = !player.connected && now - player.lastSeenAt > PLAYER_RETENTION_MS;
      if (expired) {
        this.players.delete(ownerId);
        this.accountToOwner.delete(player.accountId);
        continue;
      }
      player.score = 0;
      player.births = 0;
      player.population = 0;
      player.peakPopulation = 0;
      player.sectors = 0;
      player.fullyOccupiedSectors = 0;
      player.energy = MAX_ENERGY;
    }

    this.owners.fill(0);
    this.ages.fill(0);
    this.sectorOwners.fill(0);
    this.fullyOccupiedSectorOwners.fill(0);
    this.lastScoredSectorOwners.fill(0);
    this.lastScoredFullyOccupiedSectorOwners.fill(0);
    this.totalPopulation = 0;
    this.season = createSeason(this.season.id + 1, now);
    this.seedNeutralLife(this.season.id);
    this.recountPopulation();
    this.refreshSectorControl();
    if (emit) this.callbacks.onSnapshot(this.getSnapshot());
  }

  private seedNeutralLife(seed: number): void {
    let randomState = (seed * 2_654_435_761) >>> 0;
    const random = () => {
      randomState = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
      return randomState / 0x1_0000_0000;
    };
    const seedPatterns: PatternId[] = ['glider', 'rPentomino', 'acorn'];
    for (let placement = 0; placement < 18; placement += 1) {
      const patternId = seedPatterns[placement % seedPatterns.length];
      const centerX = CLAIMABLE_MIN_X + 4 + Math.floor(random() * (CLAIMABLE_MAX_X - CLAIMABLE_MIN_X - 7));
      const centerY = CLAIMABLE_MIN_Y + 4 + Math.floor(random() * (CLAIMABLE_MAX_Y - CLAIMABLE_MIN_Y - 7));
      const cells = transformPattern(patternId, Math.floor(random() * 4), random() > 0.5);
      for (const cell of cells) {
        const x = centerX + cell.x;
        const y = centerY + cell.y;
        const index = y * WORLD_WIDTH + x;
        this.owners[index] = NEUTRAL_OWNER_ID;
        this.ages[index] = 1;
      }
    }
  }

  private recountPopulation(): void {
    this.populations.fill(0);
    this.totalPopulation = 0;
    for (const ownerId of this.owners) {
      if (ownerId === 0) continue;
      this.totalPopulation += 1;
      this.populations[ownerId] += 1;
    }
    for (const player of this.players.values()) {
      player.population = this.populations[player.ownerId];
      player.peakPopulation = Math.max(player.peakPopulation, player.population);
    }
  }

  private scheduleNextTick(): void {
    if (!this.running) return;
    const tickRate = this.onlineCount > 0 ? ACTIVE_TICK_RATE : IDLE_TICK_RATE;
    this.tickTimer = setTimeout(() => {
      this.stepOnce(Date.now());
      this.scheduleNextTick();
    }, 1000 / tickRate);
  }

  private allocateOwnerId(): number {
    for (let attempt = 0; attempt < MAX_PLAYER_OWNER_ID; attempt += 1) {
      const candidate = this.nextOwnerId;
      this.nextOwnerId = this.nextOwnerId >= MAX_PLAYER_OWNER_ID ? 1 : this.nextOwnerId + 1;
      if (!this.players.has(candidate)) return candidate;
    }
    throw new Error('玩家编号已耗尽');
  }

  private findVictoryOwnerId(): number | null {
    const winner = [...this.players.values()]
      .filter((player) => player.sectors >= SECTOR_VICTORY_COUNT)
      .sort((left, right) => right.sectors - left.sectors
        || (right.fullyOccupiedSectors ?? 0) - (left.fullyOccupiedSectors ?? 0)
        || right.score - left.score
        || left.ownerId - right.ownerId)[0];
    return winner?.ownerId ?? null;
  }

  private createUniqueName(requestedName: string, exceptOwnerId?: number): string {
    const base = requestedName.trim().slice(0, 16);
    const occupied = new Set([...this.players.values()].filter((player) => player.connected && player.ownerId !== exceptOwnerId).map((player) => player.name.toLocaleLowerCase('zh-CN')));
    if (!occupied.has(base.toLocaleLowerCase('zh-CN'))) return base;
    for (let suffix = 2; suffix < 100; suffix += 1) {
      const marker = `·${suffix}`;
      const candidate = `${base.slice(0, Math.max(1, 16 - marker.length))}${marker}`;
      if (!occupied.has(candidate.toLocaleLowerCase('zh-CN'))) return candidate;
    }
    return `${base.slice(0, 10)}·${randomUUID().slice(0, 4)}`;
  }

  private restore(state: StoredWorldState): void {
    const isCurrentSize = state.width === WORLD_WIDTH && state.height === WORLD_HEIGHT;
    const isLegacySize = state.width === 256 && state.height === 256;
    if (!isCurrentSize && !isLegacySize) throw new Error('世界存档尺寸与当前配置不一致');
    const ownerBytes = Buffer.from(state.ownersBase64, 'base64');
    const ageBytes = Buffer.from(state.agesBase64, 'base64');
    const storedCellCount = state.width * state.height;
    if (ownerBytes.byteLength !== storedCellCount * Uint16Array.BYTES_PER_ELEMENT || ageBytes.byteLength !== storedCellCount) throw new Error('世界存档数组尺寸无效');
    if (isCurrentSize) {
      new Uint8Array(this.owners.buffer).set(ownerBytes);
      this.ages.set(ageBytes);
    } else {
      const legacyOwners = new Uint16Array(storedCellCount);
      new Uint8Array(legacyOwners.buffer).set(ownerBytes);
      for (let y = 0; y < state.height; y += 1) {
        const sourceOffset = y * state.width;
        const targetOffset = (y + CLAIMABLE_MIN_Y) * WORLD_WIDTH + CLAIMABLE_MIN_X;
        this.owners.set(legacyOwners.subarray(sourceOffset, sourceOffset + state.width), targetOffset);
        this.ages.set(ageBytes.subarray(sourceOffset, sourceOffset + state.width), targetOffset);
      }
    }
    this.tick = state.tick >>> 0;
    this.nextOwnerId = state.nextOwnerId;
    this.season = {
      id: state.season.id,
      startedAt: state.season.startedAt,
      challenge: { ...state.season.challenge },
    };
    this.sectorOwners.fill(0);
    this.sectorOwners.set((state.sectorOwners ?? []).slice(0, SECTOR_COUNT));
    this.hallOfFame = state.hallOfFame.slice(0, 15);
    for (const storedPlayer of state.players) {
      const accountId = 'accountId' in storedPlayer ? storedPlayer.accountId : `legacy:${storedPlayer.clientId}`;
      const player: StoredPlayer = {
        ...storedPlayer,
        accountId,
        connected: false,
        energy: state.version === 1 ? MAX_ENERGY : Math.min(MAX_ENERGY, storedPlayer.energy),
        fullyOccupiedSectors: storedPlayer.fullyOccupiedSectors ?? 0,
      };
      this.players.set(player.ownerId, player);
      this.accountToOwner.set(player.accountId, player.ownerId);
    }
  }

  private toStoredState(): StoredWorldState {
    return {
      version: 4,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      tick: this.tick,
      nextOwnerId: this.nextOwnerId,
      ownersBase64: Buffer.from(this.owners.buffer, this.owners.byteOffset, this.owners.byteLength).toString('base64'),
      agesBase64: Buffer.from(this.ages.buffer, this.ages.byteOffset, this.ages.byteLength).toString('base64'),
      players: [...this.players.values()].map((player) => ({ ...player, connected: false })),
      season: {
        id: this.season.id,
        startedAt: this.season.startedAt,
        challenge: { ...this.season.challenge },
      },
      sectorOwners: [...this.sectorOwners],
      hallOfFame: this.hallOfFame,
    };
  }
}

function createSeason(id: number, now: number): StoredWorldState['season'] {
  return {
    id,
    startedAt: now,
    challenge: createChallenge(id),
  };
}

function createChallenge(seasonId: number): SeasonChallenge {
  const type = (['births', 'elders', 'population'] as const)[seasonId % 3];
  if (type === 'births') return { type, title: '共同孕育 8,000 个新生细胞', target: 8_000, progress: 0, completed: false };
  if (type === 'elders') return { type, title: '培育 600 个长寿细胞', target: 600, progress: 0, completed: false };
  return { type, title: '让全服人口达到 2,500', target: 2_500, progress: 0, completed: false };
}

function createEvent(type: WorldEvent['type'], text: string, ownerId?: number, x?: number, y?: number): WorldEvent {
  return { id: randomUUID(), type, text, at: Date.now(), ownerId, x, y };
}

function toPlayerView(player: StoredPlayer): WorldPlayerView {
  return {
    ownerId: player.ownerId,
    name: player.name,
    color: player.color,
    connected: player.connected,
    energy: Math.round(player.energy * 10) / 10,
    score: Math.round(player.score),
    births: player.births,
    population: player.population,
    peakPopulation: player.peakPopulation,
    sectors: player.sectors,
    fullyOccupiedSectors: player.fullyOccupiedSectors ?? 0,
  };
}

function isPatternInsideWorld(originX: number, originY: number, cells: readonly CellOffset[]): boolean {
  return cells.every((cell) => {
    const x = originX + cell.x;
    const y = originY + cell.y;
    return x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT;
  });
}
