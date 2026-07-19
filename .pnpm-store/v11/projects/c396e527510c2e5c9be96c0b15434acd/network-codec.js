(function installNetworkCodec(root) {
  const MAGIC = 0x55534e50;
  const VERSION = 3;
  const GRID_SIZE = 24;
  const COORDINATE_PADDING = 2;
  const TAU = Math.PI * 2;
  const textDecoder = new TextDecoder("utf-8", { fatal: true });
  const colorCache = new Map();

  class Reader {
    constructor(bytes) {
      this.bytes = bytes;
      this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.offset = 0;
    }

    ensure(length) { if (this.offset + length > this.bytes.byteLength) throw new Error("快照数据不完整"); }
    u8() { this.ensure(1); const value = this.view.getUint8(this.offset); this.offset += 1; return value; }
    u16() { this.ensure(2); const value = this.view.getUint16(this.offset, true); this.offset += 2; return value; }
    i16() { this.ensure(2); const value = this.view.getInt16(this.offset, true); this.offset += 2; return value; }
    u32() { this.ensure(4); const value = this.view.getUint32(this.offset, true); this.offset += 4; return value; }
    f32() { this.ensure(4); const value = this.view.getFloat32(this.offset, true); this.offset += 4; return value; }
    f64() { this.ensure(8); const value = this.view.getFloat64(this.offset, true); this.offset += 8; return value; }
    string() { const length = this.u8(); this.ensure(length); const value = textDecoder.decode(this.bytes.subarray(this.offset, this.offset + length)); this.offset += length; return value; }
    coordinate() {
      const minimum = (GRID_SIZE - this.arenaSize) / 2 - COORDINATE_PADDING;
      return minimum + this.u16() / 65535 * (this.arenaSize + COORDINATE_PADDING * 2);
    }
    angle() { return this.u16() / (65535 / TAU); }
    velocity() { return this.i16() / 64; }
    color() {
      const value = this.u32();
      let color = colorCache.get(value);
      if (!color) {
        color = `#${value.toString(16).padStart(6, "0")}`;
        if (colorCache.size < 128) colorCache.set(value, color);
      }
      return color;
    }
    complete() { if (this.offset !== this.bytes.byteLength) throw new Error("快照包含多余数据"); }
  }

  function readSegment(reader, modules) {
    const moduleIndex = reader.u8();
    const flags = reader.u8();
    const definition = moduleIndex ? modules[moduleIndex - 1] : null;
    const result = {
      module: typeof definition === "string" ? definition : definition?.id || null,
      neutral: Boolean(flags & 1),
      ready: Boolean(flags & 2),
      col: reader.coordinate(),
      row: reader.coordinate(),
      angle: 0,
      timer: 0,
      cooldown: 0,
      orbit: flags & 4 ? reader.angle() : 0,
      birthAge: null,
    };
    result.cooldown = flags & 8 ? reader.f32() : 0;
    return result;
  }

  function readPlayer(reader, modules) {
    const entityId = reader.u16();
    const name = reader.string();
    const colorIndex = reader.u8();
    const flags = reader.u8();
    const result = {
      entityId, name, colorIndex,
      connected: Boolean(flags & 1), alive: Boolean(flags & 2), paused: Boolean(flags & 4), choosingUpgrade: Boolean(flags & 8),
      col: reader.coordinate(), row: reader.coordinate(), angle: reader.angle(), desiredAngle: reader.angle(),
      invulnerable: reader.f32(), collisionCooldown: reader.f32(), score: reader.f32(), kills: reader.u16(), botKills: reader.u16(), pvpKills: reader.u16(),
      survivalTime: reader.f32(), level: reader.u16(), xp: reader.u16(), xpNeeded: reader.u16(), respawnAt: null, segments: [], growth: null,
    };
    const respawnAt = reader.f64();
    result.respawnAt = respawnAt < 0 ? null : respawnAt;
    const segmentCount = reader.u16();
    for (let index = 0; index < segmentCount; index += 1) result.segments.push(readSegment(reader, modules));
    if (reader.u8()) result.growth = { color: reader.color(), special: Boolean(reader.u8()), elapsed: reader.f32(), nodeCount: reader.u16() };
    return result;
  }

  function readEnemy(reader) {
    const result = { id: reader.u16(), col: reader.coordinate(), row: reader.coordinate(), angle: reader.angle(), color: reader.color(), captured: reader.u16(), segments: [] };
    const count = reader.u16();
    for (let index = 0; index < count; index += 1) result.segments.push({ col: reader.coordinate(), row: reader.coordinate() });
    return result;
  }

  function readFood(reader) {
    const id = reader.u16();
    const result = { id, col: reader.coordinate(), row: reader.coordinate(), color: reader.color(), phase: id * 2.399963229728653 % TAU, special: false, isPulled: false };
    const flags = reader.u8();
    result.special = Boolean(flags & 1);
    result.isPulled = Boolean(flags & 2);
    return result;
  }

  function readProjectile(reader) {
    return { id: reader.u16(), col: reader.coordinate(), row: reader.coordinate(), vx: reader.velocity(), vy: reader.velocity(), color: reader.color(), size: reader.u16() / 256 };
  }

  function readHazard(reader) {
    const id = reader.u16();
    const kind = reader.u8() === 0 ? "mine" : "gravity";
    return { id, kind, col: reader.coordinate(), row: reader.coordinate(), radius: reader.u16() / 256, color: reader.color(), phase: id * 2.399963229728653 % TAU };
  }

  function readSpawn(reader) {
    const id = reader.u16();
    const color = reader.color();
    const headCell = { col: reader.coordinate(), row: reader.coordinate() };
    const bodyCells = [];
    const count = reader.u16();
    for (let index = 0; index < count; index += 1) bodyCells.push({ col: reader.coordinate(), row: reader.coordinate() });
    return { id, color, headCell, bodyCells, timer: reader.f32(), maxTimer: reader.f32() };
  }

  function decode(payload, modules) {
    const bytes = payload instanceof ArrayBuffer
      ? new Uint8Array(payload)
      : ArrayBuffer.isView(payload)
        ? new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
        : new Uint8Array(payload);
    const reader = new Reader(bytes);
    if (reader.u32() !== MAGIC || reader.u8() !== VERSION) throw new Error("快照格式无效");
    const snapshot = {
      tick: reader.u32(), serverTime: reader.f64(), gameTime: reader.f32(), waveCount: reader.u16(), waveTimer: reader.f32(), threatLevel: reader.u16(), arenaSize: reader.f32(),
      players: [], enemies: [], foods: [], projectiles: [], hazards: [], pendingSpawns: [],
    };
    reader.arenaSize = snapshot.arenaSize;
    const counts = [reader.u8(), reader.u16(), reader.u16(), reader.u16(), reader.u16(), reader.u16()];
    for (let index = 0; index < counts[0]; index += 1) snapshot.players.push(readPlayer(reader, modules));
    for (let index = 0; index < counts[1]; index += 1) snapshot.enemies.push(readEnemy(reader));
    for (let index = 0; index < counts[2]; index += 1) snapshot.foods.push(readFood(reader));
    for (let index = 0; index < counts[3]; index += 1) snapshot.projectiles.push(readProjectile(reader));
    for (let index = 0; index < counts[4]; index += 1) snapshot.hazards.push(readHazard(reader));
    for (let index = 0; index < counts[5]; index += 1) snapshot.pendingSpawns.push(readSpawn(reader));
    reader.complete();
    return snapshot;
  }

  root.GSS0NetworkCodec = Object.freeze({ decode });
})(globalThis);
