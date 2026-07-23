import { GRID_SIZE } from './constants';
import { MODULES, type ModuleId } from './modules';
import { ENEMY_ARCHETYPE_IDS, ENEMY_BEHAVIOR_STATES } from './protocol';
import type {
  GrowthView,
  PendingSpawnView,
  UltraEnemyView,
  UltraFoodView,
  UltraHazardView,
  UltraPlayerView,
  UltraProjectileView,
  UltraSegment,
  UltraSnapshot,
} from './protocol';

const MAGIC = 0x5553_4e50;
export const SNAPSHOT_PROTOCOL_VERSION = 17;
const COORDINATE_SCALE = 65_535;
const COORDINATE_PADDING = 2;
const VELOCITY_SCALE = 64;
const SIZE_SCALE = 256;
const ANGLE_SCALE = 65_535 / (Math.PI * 2);
const MODULE_INDEX = new Map<ModuleId, number>(MODULES.map((module, index) => [module.id, index + 1]));
const ENEMY_ARCHETYPE_INDEX = new Map(ENEMY_ARCHETYPE_IDS.map((id, index) => [id, index]));
const ENEMY_BEHAVIOR_INDEX = new Map(ENEMY_BEHAVIOR_STATES.map((id, index) => [id, index]));
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const encodedStrings = new Map<string, Uint8Array>();
const encodedColors = new Map<string, number>();
// Volatile packets are never queued behind a blocked transport; the ring keeps
// recent writable sends on distinct backing stores without per-snapshot copies.
const WRITER_POOL_SIZE = 32;
const writerPool: BinaryWriter[] = [];
let nextWriterIndex = 0;

export function encodeUltraSnapshot(snapshot: UltraSnapshot): Uint8Array {
  const writerIndex = nextWriterIndex;
  nextWriterIndex = (nextWriterIndex + 1) % WRITER_POOL_SIZE;
  const writer = writerPool[writerIndex] ??= new BinaryWriter();
  writer.reset();
  writer.u32(MAGIC);
  writer.u8(SNAPSHOT_PROTOCOL_VERSION);
  writer.u32(snapshot.tick);
  writer.f64(snapshot.serverTime);
  writer.f32(snapshot.gameTime);
  writer.u16(snapshot.waveCount);
  writer.f32(snapshot.waveTimer);
  writer.u16(snapshot.threatLevel);
  writer.f32(snapshot.arenaSize);
  writer.u32(snapshot.worldObjectRevision);
  writer.u8(snapshot.worldObjectsComplete ? 1 : 0);
  writer.u8(snapshot.players.length);
  writer.u16(snapshot.enemies.length);
  writer.u16(snapshot.foods.length);
  writer.u16(snapshot.projectiles.length);
  writer.u16(snapshot.hazards.length);
  writer.u16(snapshot.pendingSpawns.length);
  for (const player of snapshot.players) writePlayer(writer, player, snapshot.arenaSize);
  for (const enemy of snapshot.enemies) writeEnemy(writer, enemy, snapshot.arenaSize);
  for (const food of snapshot.foods) writeFood(writer, food, snapshot.arenaSize);
  for (const projectile of snapshot.projectiles) writeProjectile(writer, projectile, snapshot.arenaSize);
  for (const hazard of snapshot.hazards) writeHazard(writer, hazard, snapshot.arenaSize);
  for (const spawn of snapshot.pendingSpawns) writeSpawn(writer, spawn, snapshot.arenaSize);
  return writer.finish();
}

export function decodeUltraSnapshot(payload: ArrayBuffer | ArrayBufferView): UltraSnapshot {
  const bytes = payload instanceof ArrayBuffer
    ? new Uint8Array(payload)
    : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  const reader = new BinaryReader(bytes);
  if (reader.u32() !== MAGIC || reader.u8() !== SNAPSHOT_PROTOCOL_VERSION) throw new Error('Ultra 快照格式无效');
  const snapshot: UltraSnapshot = {
    tick: reader.u32(),
    serverTime: reader.f64(),
    gameTime: reader.f32(),
    waveCount: reader.u16(),
    waveTimer: reader.f32(),
    threatLevel: reader.u16(),
    arenaSize: reader.f32(),
    worldObjectRevision: reader.u32(),
    worldObjectsComplete: Boolean(reader.u8() & 1),
    players: [],
    enemies: [],
    foods: [],
    projectiles: [],
    hazards: [],
    pendingSpawns: [],
  };
  const playerCount = reader.u8();
  const enemyCount = reader.u16();
  const foodCount = reader.u16();
  const projectileCount = reader.u16();
  const hazardCount = reader.u16();
  const spawnCount = reader.u16();
  for (let index = 0; index < playerCount; index += 1) snapshot.players.push(readPlayer(reader, snapshot.arenaSize));
  for (let index = 0; index < enemyCount; index += 1) snapshot.enemies.push(readEnemy(reader, snapshot.arenaSize));
  for (let index = 0; index < foodCount; index += 1) snapshot.foods.push(readFood(reader, snapshot.arenaSize));
  for (let index = 0; index < projectileCount; index += 1) snapshot.projectiles.push(readProjectile(reader, snapshot.arenaSize));
  for (let index = 0; index < hazardCount; index += 1) snapshot.hazards.push(readHazard(reader, snapshot.arenaSize));
  for (let index = 0; index < spawnCount; index += 1) snapshot.pendingSpawns.push(readSpawn(reader, snapshot.arenaSize));
  reader.assertComplete();
  return snapshot;
}

function writePlayer(writer: BinaryWriter, player: UltraPlayerView, arenaSize: number): void {
  writer.u16(player.entityId);
  writer.string(player.name);
  writer.u8(player.colorIndex);
  writer.u8(Number(player.connected) | Number(player.alive) << 1 | Number(player.paused) << 2 | Number(player.choosingUpgrade) << 3 | Number(player.ghost) << 4);
  writeCoordinate(writer, player.col, arenaSize); writeCoordinate(writer, player.row, arenaSize); writeAngle(writer, player.angle); writeAngle(writer, player.desiredAngle);
  writer.u32(player.lastInputSequence + 1); writer.f32(player.speed); writer.f32(player.slow); writer.f32(player.foodBoost); writer.f32(player.knockbackX); writer.f32(player.knockbackY);
  writer.f32(player.invulnerable); writer.f32(player.collisionCooldown); writer.f32(player.health); writer.f32(player.maxHealth); writer.u8(player.shieldCharges);
  writer.f32(player.score); writer.u16(player.kills); writer.u16(player.botKills); writer.u16(player.pvpKills);
  writer.f32(player.survivalTime); writer.u16(player.level); writer.u16(player.xp); writer.u16(player.xpNeeded);
  writer.f64(player.respawnAt ?? -1);
  writer.u16(player.segments.length);
  for (const segment of player.segments) writeSegment(writer, segment, arenaSize);
  writer.u8(player.growth ? 1 : 0);
  if (player.growth) writeGrowth(writer, player.growth);
}

function readPlayer(reader: BinaryReader, arenaSize: number): UltraPlayerView {
  const entityId = reader.u16();
  const name = reader.string();
  const colorIndex = reader.u8();
  const flags = reader.u8();
  const player: UltraPlayerView = {
    entityId,
    name,
    colorIndex,
    connected: Boolean(flags & 1),
    alive: Boolean(flags & 2),
    ghost: Boolean(flags & 16),
    paused: Boolean(flags & 4),
    choosingUpgrade: Boolean(flags & 8),
    col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize), angle: readAngle(reader), desiredAngle: readAngle(reader),
    lastInputSequence: reader.u32() - 1, speed: reader.f32(), slow: reader.f32(), foodBoost: reader.f32(), knockbackX: reader.f32(), knockbackY: reader.f32(),
    invulnerable: reader.f32(), collisionCooldown: reader.f32(), health: reader.f32(), maxHealth: reader.f32(), shieldCharges: reader.u8(),
    score: reader.f32(), kills: reader.u16(), botKills: reader.u16(), pvpKills: reader.u16(),
    survivalTime: reader.f32(), level: reader.u16(), xp: reader.u16(), xpNeeded: reader.u16(),
    respawnAt: null,
    segments: [],
    growth: null,
  };
  const respawnAt = reader.f64();
  player.respawnAt = respawnAt < 0 ? null : respawnAt;
  const segmentCount = reader.u16();
  for (let index = 0; index < segmentCount; index += 1) player.segments.push(readSegment(reader, arenaSize));
  if (reader.u8()) player.growth = readGrowth(reader);
  return player;
}

function writeSegment(writer: BinaryWriter, segment: UltraSegment, arenaSize: number): void {
  const moduleIndex = segment.module ? MODULE_INDEX.get(segment.module) : 0;
  if (segment.module && !moduleIndex) throw new Error(`无法编码未知模块：${segment.module}`);
  const hasCooldown = (segment.module === 'shield' || segment.module === 'phase') && !segment.ready;
  writer.u8(moduleIndex ?? 0);
  writer.u8(Number(segment.neutral) | Number(segment.ready) << 1 | Number(hasCooldown) << 3 | Number(segment.tailGuard) << 4);
  writer.u16(Math.max(0, Math.min(65_535, Math.round(segment.moduleLevel))));
  writer.u8(Math.max(0, Math.min(2, Math.round(segment.experienceTier))));
  writeCoordinate(writer, segment.col, arenaSize); writeCoordinate(writer, segment.row, arenaSize);
  if (hasCooldown) writer.f32(segment.cooldown);
}

function readSegment(reader: BinaryReader, arenaSize: number): UltraSegment {
  const moduleIndex = reader.u8();
  const flags = reader.u8();
  const module = moduleIndex === 0 ? null : MODULES[moduleIndex - 1]?.id;
  if (moduleIndex !== 0 && !module) throw new Error('Ultra 快照包含未知模块');
  const segment: UltraSegment = {
    module,
    moduleLevel: reader.u16(),
    neutral: Boolean(flags & 1),
    tailGuard: Boolean(flags & 16),
    experienceTier: reader.u8(),
    ready: Boolean(flags & 2),
    col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize), angle: 0,
    timer: 0, cooldown: 0, orbit: 0,
    birthAge: null,
  };
  segment.cooldown = flags & 8 ? reader.f32() : 0;
  return segment;
}

function writeGrowth(writer: BinaryWriter, growth: GrowthView): void {
  writer.color(growth.color);
  writer.u8(Number(growth.special) | Number(growth.spawnTailFood) << 1);
  writer.f32(growth.elapsed);
  writer.u16(growth.nodeCount);
}

function readGrowth(reader: BinaryReader): GrowthView {
  const color = reader.color();
  const flags = reader.u8();
  return { color, special: Boolean(flags & 1), spawnTailFood: Boolean(flags & 2), elapsed: reader.f32(), nodeCount: reader.u16() };
}

function writeEnemy(writer: BinaryWriter, enemy: UltraEnemyView, arenaSize: number): void {
  const archetypeIndex = ENEMY_ARCHETYPE_INDEX.get(enemy.archetype);
  const behaviorIndex = ENEMY_BEHAVIOR_INDEX.get(enemy.behaviorState);
  if (archetypeIndex === undefined || behaviorIndex === undefined) throw new Error('无法编码未知敌人类型或行为');
  writer.u16(enemy.id); writer.u8(archetypeIndex); writer.u8(behaviorIndex); writer.u8(clampInteger(Math.round(enemy.behaviorPhase * 255), 0, 255));
  writeCoordinate(writer, enemy.col, arenaSize); writeCoordinate(writer, enemy.row, arenaSize); writeAngle(writer, enemy.angle);
  writer.color(enemy.color); writer.u16(enemy.captured); writer.u32(enemy.frostStacks); writer.u32(enemy.corrosionStacks); writer.u32(enemy.burnStacks); writer.u16(enemy.segments.length);
  for (const segment of enemy.segments) { writeCoordinate(writer, segment.col, arenaSize); writeCoordinate(writer, segment.row, arenaSize); }
}

function readEnemy(reader: BinaryReader, arenaSize: number): UltraEnemyView {
  const id = reader.u16();
  const archetype = ENEMY_ARCHETYPE_IDS[reader.u8()];
  const behaviorState = ENEMY_BEHAVIOR_STATES[reader.u8()];
  const behaviorPhase = reader.u8() / 255;
  if (!archetype || !behaviorState) throw new Error('Ultra 快照包含未知敌人类型或行为');
  const enemy: UltraEnemyView = {
    id, archetype, behaviorState, behaviorPhase,
    col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize), angle: readAngle(reader),
    color: reader.color(), captured: reader.u16(), frostStacks: reader.u32(), corrosionStacks: reader.u32(), burnStacks: reader.u32(), segments: [],
  };
  const count = reader.u16();
  for (let index = 0; index < count; index += 1) enemy.segments.push({ col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize) });
  return enemy;
}

function writeFood(writer: BinaryWriter, food: UltraFoodView, arenaSize: number): void {
  writer.u16(food.id); writeCoordinate(writer, food.col, arenaSize); writeCoordinate(writer, food.row, arenaSize); writer.color(food.color);
  writer.u8(Number(food.special) | Number(food.isPulled) << 1);
}

function readFood(reader: BinaryReader, arenaSize: number): UltraFoodView {
  const id = reader.u16();
  const col = readCoordinate(reader, arenaSize);
  const row = readCoordinate(reader, arenaSize);
  const color = reader.color();
  const flags = reader.u8();
  return { id, col, row, color, phase: visualPhase(id), special: Boolean(flags & 1), isPulled: Boolean(flags & 2) };
}

function writeProjectile(writer: BinaryWriter, projectile: UltraProjectileView, arenaSize: number): void {
  writer.u16(projectile.id); writer.u16(projectile.ownerEntityId); writer.u8(projectile.kind === 'blade' ? 1 : 0);
  writeCoordinate(writer, projectile.col, arenaSize); writeCoordinate(writer, projectile.row, arenaSize);
  writeVelocity(writer, projectile.vx); writeVelocity(writer, projectile.vy); writer.color(projectile.color); writer.u16(Math.round(projectile.size * SIZE_SCALE));
}

function readProjectile(reader: BinaryReader, arenaSize: number): UltraProjectileView {
  return {
    id: reader.u16(), ownerEntityId: reader.u16(), kind: reader.u8() === 1 ? 'blade' : 'shot',
    col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize), vx: readVelocity(reader), vy: readVelocity(reader),
    color: reader.color(), size: reader.u16() / SIZE_SCALE,
  };
}

function writeHazard(writer: BinaryWriter, hazard: UltraHazardView, arenaSize: number): void {
  writer.u16(hazard.id); writer.u16(hazard.ownerEntityId); writer.u8(hazard.kind === 'mine' ? 0 : 1);
  writeCoordinate(writer, hazard.col, arenaSize); writeCoordinate(writer, hazard.row, arenaSize); writer.u16(Math.round(hazard.radius * SIZE_SCALE)); writer.color(hazard.color); writer.f32(hazard.arm);
}

function readHazard(reader: BinaryReader, arenaSize: number): UltraHazardView {
  const id = reader.u16();
  const ownerEntityId = reader.u16();
  const kind = reader.u8() === 0 ? 'mine' : 'gravity';
  return { id, ownerEntityId, kind, col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize), radius: reader.u16() / SIZE_SCALE, color: reader.color(), phase: visualPhase(id), arm: reader.f32() };
}

function writeSpawn(writer: BinaryWriter, spawn: PendingSpawnView, arenaSize: number): void {
  const archetypeIndex = ENEMY_ARCHETYPE_INDEX.get(spawn.archetype);
  if (archetypeIndex === undefined) throw new Error('无法编码未知敌人出生类型');
  writer.u16(spawn.id); writer.u8(archetypeIndex); writer.color(spawn.color); writeAngle(writer, spawn.angle);
  writeCoordinate(writer, spawn.headCell.col, arenaSize); writeCoordinate(writer, spawn.headCell.row, arenaSize);
  writer.u16(spawn.bodyCells.length);
  for (const cell of spawn.bodyCells) { writeCoordinate(writer, cell.col, arenaSize); writeCoordinate(writer, cell.row, arenaSize); }
  writer.f32(spawn.timer); writer.f32(spawn.maxTimer);
}

function readSpawn(reader: BinaryReader, arenaSize: number): PendingSpawnView {
  const id = reader.u16();
  const archetype = ENEMY_ARCHETYPE_IDS[reader.u8()];
  if (!archetype) throw new Error('Ultra 快照包含未知敌人出生类型');
  const color = reader.color();
  const angle = readAngle(reader);
  const headCell = { col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize) };
  const bodyCells: PendingSpawnView['bodyCells'] = [];
  const count = reader.u16();
  for (let index = 0; index < count; index += 1) bodyCells.push({ col: readCoordinate(reader, arenaSize), row: readCoordinate(reader, arenaSize) });
  return { id, archetype, color, angle, headCell, bodyCells, timer: reader.f32(), maxTimer: reader.f32() };
}

class BinaryWriter {
  private bytes = new Uint8Array(16_384);
  private view = new DataView(this.bytes.buffer);
  private offset = 0;

  reset(): void { this.offset = 0; }

  u8(value: number): void { this.ensure(1); this.view.setUint8(this.offset, value); this.offset += 1; }
  u16(value: number): void { this.ensure(2); this.view.setUint16(this.offset, value, true); this.offset += 2; }
  i16(value: number): void { this.ensure(2); this.view.setInt16(this.offset, value, true); this.offset += 2; }
  u32(value: number): void { this.ensure(4); this.view.setUint32(this.offset, value >>> 0, true); this.offset += 4; }
  f32(value: number): void { this.ensure(4); this.view.setFloat32(this.offset, value, true); this.offset += 4; }
  f64(value: number): void { this.ensure(8); this.view.setFloat64(this.offset, value, true); this.offset += 8; }

  string(value: string): void {
    let encoded = encodedStrings.get(value);
    if (!encoded) {
      encoded = textEncoder.encode(value);
      if (encodedStrings.size < 64) encodedStrings.set(value, encoded);
    }
    if (encoded.length > 255) throw new Error('Ultra 快照字符串过长');
    this.u8(encoded.length);
    this.ensure(encoded.length);
    this.bytes.set(encoded, this.offset);
    this.offset += encoded.length;
  }

  color(value: string): void {
    if (!/^#[0-9a-f]{6}$/iu.test(value)) throw new Error(`Ultra 快照颜色格式无效：${value}`);
    let encoded = encodedColors.get(value);
    if (encoded === undefined) {
      encoded = Number.parseInt(value.slice(1), 16);
      if (encodedColors.size < 128) encodedColors.set(value, encoded);
    }
    this.u32(encoded);
  }

  finish(): Uint8Array {
    return this.bytes.subarray(0, this.offset);
  }

  private ensure(length: number): void {
    if (this.offset + length <= this.bytes.length) return;
    const next = new Uint8Array(Math.max(this.bytes.length * 2, this.offset + length));
    next.set(this.bytes);
    this.bytes = next;
    this.view = new DataView(next.buffer);
  }
}

class BinaryReader {
  private readonly view: DataView;
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(): number { this.ensure(1); const value = this.view.getUint8(this.offset); this.offset += 1; return value; }
  u16(): number { this.ensure(2); const value = this.view.getUint16(this.offset, true); this.offset += 2; return value; }
  i16(): number { this.ensure(2); const value = this.view.getInt16(this.offset, true); this.offset += 2; return value; }
  u32(): number { this.ensure(4); const value = this.view.getUint32(this.offset, true); this.offset += 4; return value; }
  f32(): number { this.ensure(4); const value = this.view.getFloat32(this.offset, true); this.offset += 4; return value; }
  f64(): number { this.ensure(8); const value = this.view.getFloat64(this.offset, true); this.offset += 8; return value; }

  string(): string {
    const length = this.u8();
    this.ensure(length);
    const value = textDecoder.decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  color(): string {
    return `#${this.u32().toString(16).padStart(6, '0')}`;
  }

  assertComplete(): void {
    if (this.offset !== this.bytes.byteLength) throw new Error('Ultra 快照包含多余数据');
  }

  private ensure(length: number): void {
    if (this.offset + length > this.bytes.byteLength) throw new Error('Ultra 快照数据不完整');
  }
}

function writeCoordinate(writer: BinaryWriter, value: number, arenaSize: number): void {
  const minimum = (GRID_SIZE - arenaSize) / 2 - COORDINATE_PADDING;
  const span = arenaSize + COORDINATE_PADDING * 2;
  writer.u16(clampInteger(Math.round((value - minimum) / span * COORDINATE_SCALE), 0, 65_535));
}

function readCoordinate(reader: BinaryReader, arenaSize: number): number {
  const minimum = (GRID_SIZE - arenaSize) / 2 - COORDINATE_PADDING;
  return minimum + reader.u16() / COORDINATE_SCALE * (arenaSize + COORDINATE_PADDING * 2);
}

function writeAngle(writer: BinaryWriter, value: number): void {
  const normalized = ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  writer.u16(Math.round(normalized * ANGLE_SCALE));
}

function readAngle(reader: BinaryReader): number {
  return reader.u16() / ANGLE_SCALE;
}

function writeVelocity(writer: BinaryWriter, value: number): void {
  writer.i16(clampInteger(Math.round(value * VELOCITY_SCALE), -32_768, 32_767));
}

function readVelocity(reader: BinaryReader): number {
  return reader.i16() / VELOCITY_SCALE;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function visualPhase(id: number): number {
  return id * 2.399_963_229_728_653 % (Math.PI * 2);
}
