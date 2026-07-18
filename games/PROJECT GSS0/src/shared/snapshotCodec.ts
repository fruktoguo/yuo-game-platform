import { MODULES, type ModuleId } from './modules';
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
const VERSION = 1;
const MODULE_INDEX = new Map<ModuleId, number>(MODULES.map((module, index) => [module.id, index + 1]));
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export function encodeUltraSnapshot(snapshot: UltraSnapshot): ArrayBuffer {
  const writer = new BinaryWriter();
  writer.u32(MAGIC);
  writer.u8(VERSION);
  writer.u32(snapshot.tick);
  writer.f64(snapshot.serverTime);
  writer.f32(snapshot.gameTime);
  writer.u16(snapshot.waveCount);
  writer.f32(snapshot.waveTimer);
  writer.u16(snapshot.threatLevel);
  writer.u8(snapshot.players.length);
  writer.u16(snapshot.enemies.length);
  writer.u16(snapshot.foods.length);
  writer.u16(snapshot.projectiles.length);
  writer.u16(snapshot.hazards.length);
  writer.u16(snapshot.pendingSpawns.length);
  for (const player of snapshot.players) writePlayer(writer, player);
  for (const enemy of snapshot.enemies) writeEnemy(writer, enemy);
  for (const food of snapshot.foods) writeFood(writer, food);
  for (const projectile of snapshot.projectiles) writeProjectile(writer, projectile);
  for (const hazard of snapshot.hazards) writeHazard(writer, hazard);
  for (const spawn of snapshot.pendingSpawns) writeSpawn(writer, spawn);
  return writer.finish();
}

export function decodeUltraSnapshot(payload: ArrayBuffer | ArrayBufferView): UltraSnapshot {
  const bytes = payload instanceof ArrayBuffer
    ? new Uint8Array(payload)
    : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  const reader = new BinaryReader(bytes);
  if (reader.u32() !== MAGIC || reader.u8() !== VERSION) throw new Error('Ultra 快照格式无效');
  const snapshot: UltraSnapshot = {
    tick: reader.u32(),
    serverTime: reader.f64(),
    gameTime: reader.f32(),
    waveCount: reader.u16(),
    waveTimer: reader.f32(),
    threatLevel: reader.u16(),
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
  for (let index = 0; index < playerCount; index += 1) snapshot.players.push(readPlayer(reader));
  for (let index = 0; index < enemyCount; index += 1) snapshot.enemies.push(readEnemy(reader));
  for (let index = 0; index < foodCount; index += 1) snapshot.foods.push(readFood(reader));
  for (let index = 0; index < projectileCount; index += 1) snapshot.projectiles.push(readProjectile(reader));
  for (let index = 0; index < hazardCount; index += 1) snapshot.hazards.push(readHazard(reader));
  for (let index = 0; index < spawnCount; index += 1) snapshot.pendingSpawns.push(readSpawn(reader));
  reader.assertComplete();
  return snapshot;
}

function writePlayer(writer: BinaryWriter, player: UltraPlayerView): void {
  writer.u16(player.entityId);
  writer.string(player.name);
  writer.u8(player.colorIndex);
  writer.u8(Number(player.connected) | Number(player.alive) << 1 | Number(player.paused) << 2 | Number(player.choosingUpgrade) << 3);
  writer.f32(player.col); writer.f32(player.row); writer.f32(player.angle); writer.f32(player.desiredAngle);
  writer.f32(player.invulnerable); writer.f32(player.collisionCooldown);
  writer.f32(player.score); writer.u16(player.kills); writer.u16(player.botKills); writer.u16(player.pvpKills);
  writer.f32(player.survivalTime); writer.u16(player.level); writer.u16(player.xp); writer.u16(player.xpNeeded);
  writer.f64(player.respawnAt ?? -1);
  writer.u16(player.segments.length);
  for (const segment of player.segments) writeSegment(writer, segment);
  writer.u8(player.growth ? 1 : 0);
  if (player.growth) writeGrowth(writer, player.growth);
}

function readPlayer(reader: BinaryReader): UltraPlayerView {
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
    paused: Boolean(flags & 4),
    choosingUpgrade: Boolean(flags & 8),
    col: reader.f32(), row: reader.f32(), angle: reader.f32(), desiredAngle: reader.f32(),
    invulnerable: reader.f32(), collisionCooldown: reader.f32(),
    score: reader.f32(), kills: reader.u16(), botKills: reader.u16(), pvpKills: reader.u16(),
    survivalTime: reader.f32(), level: reader.u16(), xp: reader.u16(), xpNeeded: reader.u16(),
    respawnAt: null,
    segments: [],
    growth: null,
  };
  const respawnAt = reader.f64();
  player.respawnAt = respawnAt < 0 ? null : respawnAt;
  const segmentCount = reader.u16();
  for (let index = 0; index < segmentCount; index += 1) player.segments.push(readSegment(reader));
  if (reader.u8()) player.growth = readGrowth(reader);
  return player;
}

function writeSegment(writer: BinaryWriter, segment: UltraSegment): void {
  const moduleIndex = segment.module ? MODULE_INDEX.get(segment.module) : 0;
  if (segment.module && !moduleIndex) throw new Error(`无法编码未知模块：${segment.module}`);
  writer.u8(moduleIndex ?? 0);
  writer.u8(Number(segment.neutral) | Number(segment.ready) << 1 | Number(segment.birthAge !== null) << 2);
  writer.f32(segment.col); writer.f32(segment.row); writer.f32(segment.angle);
  writer.f32(segment.timer); writer.f32(segment.cooldown); writer.f32(segment.orbit);
  if (segment.birthAge !== null) writer.f32(segment.birthAge);
}

function readSegment(reader: BinaryReader): UltraSegment {
  const moduleIndex = reader.u8();
  const flags = reader.u8();
  const module = moduleIndex === 0 ? null : MODULES[moduleIndex - 1]?.id;
  if (moduleIndex !== 0 && !module) throw new Error('Ultra 快照包含未知模块');
  return {
    module,
    neutral: Boolean(flags & 1),
    ready: Boolean(flags & 2),
    col: reader.f32(), row: reader.f32(), angle: reader.f32(),
    timer: reader.f32(), cooldown: reader.f32(), orbit: reader.f32(),
    birthAge: flags & 4 ? reader.f32() : null,
  };
}

function writeGrowth(writer: BinaryWriter, growth: GrowthView): void {
  writer.color(growth.color);
  writer.u8(Number(growth.special));
  writer.f32(growth.elapsed);
  writer.u16(growth.nodeCount);
}

function readGrowth(reader: BinaryReader): GrowthView {
  return { color: reader.color(), special: Boolean(reader.u8()), elapsed: reader.f32(), nodeCount: reader.u16() };
}

function writeEnemy(writer: BinaryWriter, enemy: UltraEnemyView): void {
  writer.u16(enemy.id); writer.f32(enemy.col); writer.f32(enemy.row); writer.f32(enemy.angle);
  writer.color(enemy.color); writer.u16(enemy.captured); writer.u16(enemy.segments.length);
  for (const segment of enemy.segments) { writer.f32(segment.col); writer.f32(segment.row); }
}

function readEnemy(reader: BinaryReader): UltraEnemyView {
  const enemy: UltraEnemyView = {
    id: reader.u16(), col: reader.f32(), row: reader.f32(), angle: reader.f32(),
    color: reader.color(), captured: reader.u16(), segments: [],
  };
  const count = reader.u16();
  for (let index = 0; index < count; index += 1) enemy.segments.push({ col: reader.f32(), row: reader.f32() });
  return enemy;
}

function writeFood(writer: BinaryWriter, food: UltraFoodView): void {
  writer.u16(food.id); writer.f32(food.col); writer.f32(food.row); writer.color(food.color); writer.f32(food.phase);
  writer.u8(Number(food.special) | Number(food.isPulled) << 1);
}

function readFood(reader: BinaryReader): UltraFoodView {
  const id = reader.u16();
  const col = reader.f32();
  const row = reader.f32();
  const color = reader.color();
  const phase = reader.f32();
  const flags = reader.u8();
  return { id, col, row, color, phase, special: Boolean(flags & 1), isPulled: Boolean(flags & 2) };
}

function writeProjectile(writer: BinaryWriter, projectile: UltraProjectileView): void {
  writer.u16(projectile.id); writer.f32(projectile.col); writer.f32(projectile.row);
  writer.f32(projectile.vx); writer.f32(projectile.vy); writer.color(projectile.color); writer.f32(projectile.size);
}

function readProjectile(reader: BinaryReader): UltraProjectileView {
  return {
    id: reader.u16(), col: reader.f32(), row: reader.f32(), vx: reader.f32(), vy: reader.f32(),
    color: reader.color(), size: reader.f32(),
  };
}

function writeHazard(writer: BinaryWriter, hazard: UltraHazardView): void {
  writer.u16(hazard.id); writer.u8(hazard.kind === 'mine' ? 0 : 1);
  writer.f32(hazard.col); writer.f32(hazard.row); writer.f32(hazard.radius); writer.color(hazard.color); writer.f32(hazard.phase);
}

function readHazard(reader: BinaryReader): UltraHazardView {
  const id = reader.u16();
  const kind = reader.u8() === 0 ? 'mine' : 'gravity';
  return { id, kind, col: reader.f32(), row: reader.f32(), radius: reader.f32(), color: reader.color(), phase: reader.f32() };
}

function writeSpawn(writer: BinaryWriter, spawn: PendingSpawnView): void {
  writer.u16(spawn.id); writer.color(spawn.color);
  writer.f32(spawn.headCell.col); writer.f32(spawn.headCell.row);
  writer.u16(spawn.bodyCells.length);
  for (const cell of spawn.bodyCells) { writer.f32(cell.col); writer.f32(cell.row); }
  writer.f32(spawn.timer); writer.f32(spawn.maxTimer);
}

function readSpawn(reader: BinaryReader): PendingSpawnView {
  const id = reader.u16();
  const color = reader.color();
  const headCell = { col: reader.f32(), row: reader.f32() };
  const bodyCells: PendingSpawnView['bodyCells'] = [];
  const count = reader.u16();
  for (let index = 0; index < count; index += 1) bodyCells.push({ col: reader.f32(), row: reader.f32() });
  return { id, color, headCell, bodyCells, timer: reader.f32(), maxTimer: reader.f32() };
}

class BinaryWriter {
  private bytes = new Uint8Array(16_384);
  private view = new DataView(this.bytes.buffer);
  private offset = 0;

  u8(value: number): void { this.ensure(1); this.view.setUint8(this.offset, value); this.offset += 1; }
  u16(value: number): void { this.ensure(2); this.view.setUint16(this.offset, value, true); this.offset += 2; }
  u32(value: number): void { this.ensure(4); this.view.setUint32(this.offset, value >>> 0, true); this.offset += 4; }
  f32(value: number): void { this.ensure(4); this.view.setFloat32(this.offset, value, true); this.offset += 4; }
  f64(value: number): void { this.ensure(8); this.view.setFloat64(this.offset, value, true); this.offset += 8; }

  string(value: string): void {
    const encoded = textEncoder.encode(value);
    if (encoded.length > 255) throw new Error('Ultra 快照字符串过长');
    this.u8(encoded.length);
    this.ensure(encoded.length);
    this.bytes.set(encoded, this.offset);
    this.offset += encoded.length;
  }

  color(value: string): void {
    if (!/^#[0-9a-f]{6}$/iu.test(value)) throw new Error(`Ultra 快照颜色格式无效：${value}`);
    this.u32(Number.parseInt(value.slice(1), 16));
  }

  finish(): ArrayBuffer {
    return this.bytes.buffer.slice(0, this.offset);
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
