(function installNetworkCodec(root) {
  "use strict";

  const MAGIC = 0x55534e50;
  const VERSION = 6;
  const GRID_SIZE = 24;
  const COORDINATE_PADDING = 2;
  const TAU = Math.PI * 2;
  const ENEMY_ARCHETYPE_IDS = ["scout", "forager", "courier", "charger", "cutter", "coiler", "warden"];
  const ENEMY_BEHAVIOR_STATES = ["roam", "forage", "flee", "telegraph", "charge", "intercept", "orbit", "escort"];
  const textDecoder = new TextDecoder("utf-8", { fatal: true });
  const colorCache = new Map();
  let reusableReader = null;

  class Reader {
    reset(bytes) {
      this.bytes = bytes;
      this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.offset = 0;
      this.arenaSize = GRID_SIZE;
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

  function itemAt(items, index) {
    return items[index] || (items[index] = {});
  }

  function readSegment(reader, modules, result) {
    result ||= {};
    const moduleIndex = reader.u8();
    const flags = reader.u8();
    const definition = moduleIndex ? modules[moduleIndex - 1] : null;
    result.module = typeof definition === "string" ? definition : definition?.id || null;
    result.neutral = Boolean(flags & 1);
    result.ready = Boolean(flags & 2);
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.angle = 0;
    result.timer = 0;
    result.orbit = flags & 4 ? reader.angle() : 0;
    result.cooldown = flags & 8 ? reader.f32() : 0;
    result.birthAge = null;
    return result;
  }

  function readPlayer(reader, modules, result) {
    result ||= {};
    result.entityId = reader.u16();
    result.name = reader.string();
    result.colorIndex = reader.u8();
    const flags = reader.u8();
    result.connected = Boolean(flags & 1);
    result.alive = Boolean(flags & 2);
    result.paused = Boolean(flags & 4);
    result.choosingUpgrade = Boolean(flags & 8);
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.angle = reader.angle();
    result.desiredAngle = reader.angle();
    result.lastInputSequence = reader.u32() - 1;
    result.speed = reader.f32();
    result.slow = reader.f32();
    result.foodBoost = reader.f32();
    result.knockbackX = reader.f32();
    result.knockbackY = reader.f32();
    result.invulnerable = reader.f32();
    result.collisionCooldown = reader.f32();
    result.score = reader.f32();
    result.kills = reader.u16();
    result.botKills = reader.u16();
    result.pvpKills = reader.u16();
    result.survivalTime = reader.f32();
    result.level = reader.u16();
    result.xp = reader.u16();
    result.xpNeeded = reader.u16();
    const respawnAt = reader.f64();
    result.respawnAt = respawnAt < 0 ? null : respawnAt;
    const segments = result.segments || (result.segments = []);
    const segmentCount = reader.u16();
    for (let index = 0; index < segmentCount; index += 1) readSegment(reader, modules, itemAt(segments, index));
    segments.length = segmentCount;
    if (reader.u8()) {
      const growth = result.growth || (result.growth = {});
      growth.color = reader.color();
      growth.special = Boolean(reader.u8());
      growth.elapsed = reader.f32();
      growth.nodeCount = reader.u16();
    } else result.growth = null;
    return result;
  }

  function readEnemy(reader, result) {
    result ||= {};
    result.id = reader.u16();
    result.archetype = ENEMY_ARCHETYPE_IDS[reader.u8()];
    result.behaviorState = ENEMY_BEHAVIOR_STATES[reader.u8()];
    result.behaviorPhase = reader.u8() / 255;
    if (!result.archetype || !result.behaviorState) throw new Error("快照包含未知敌人类型或行为");
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.angle = reader.angle();
    result.color = reader.color();
    result.captured = reader.u16();
    const segments = result.segments || (result.segments = []);
    const count = reader.u16();
    for (let index = 0; index < count; index += 1) {
      const segment = itemAt(segments, index);
      segment.col = reader.coordinate();
      segment.row = reader.coordinate();
    }
    segments.length = count;
    return result;
  }

  function readFood(reader, result) {
    result ||= {};
    result.id = reader.u16();
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.color = reader.color();
    result.phase = result.id * 2.399963229728653 % TAU;
    const flags = reader.u8();
    result.special = Boolean(flags & 1);
    result.isPulled = Boolean(flags & 2);
    return result;
  }

  function readProjectile(reader, result) {
    result ||= {};
    result.id = reader.u16();
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.vx = reader.velocity();
    result.vy = reader.velocity();
    result.color = reader.color();
    result.size = reader.u16() / 256;
    return result;
  }

  function readHazard(reader, result) {
    result ||= {};
    result.id = reader.u16();
    result.ownerEntityId = reader.u16();
    result.kind = reader.u8() === 0 ? "mine" : "gravity";
    result.col = reader.coordinate();
    result.row = reader.coordinate();
    result.radius = reader.u16() / 256;
    result.color = reader.color();
    result.phase = result.id * 2.399963229728653 % TAU;
    result.arm = reader.f32();
    return result;
  }

  function readSpawn(reader, result) {
    result ||= {};
    result.id = reader.u16();
    result.archetype = ENEMY_ARCHETYPE_IDS[reader.u8()];
    if (!result.archetype) throw new Error("快照包含未知敌人出生类型");
    result.color = reader.color();
    const headCell = result.headCell || (result.headCell = {});
    headCell.col = reader.coordinate();
    headCell.row = reader.coordinate();
    const bodyCells = result.bodyCells || (result.bodyCells = []);
    const count = reader.u16();
    for (let index = 0; index < count; index += 1) {
      const cell = itemAt(bodyCells, index);
      cell.col = reader.coordinate();
      cell.row = reader.coordinate();
    }
    bodyCells.length = count;
    result.timer = reader.f32();
    result.maxTimer = reader.f32();
    return result;
  }

  function decode(payload, modules, target) {
    const bytes = payload instanceof ArrayBuffer
      ? new Uint8Array(payload)
      : ArrayBuffer.isView(payload)
        ? new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
        : new Uint8Array(payload);
    const reader = reusableReader ||= new Reader();
    reader.reset(bytes);
    if (reader.u32() !== MAGIC || reader.u8() !== VERSION) throw new Error("快照格式无效");
    const snapshot = target || {};
    snapshot.tick = reader.u32();
    snapshot.serverTime = reader.f64();
    snapshot.gameTime = reader.f32();
    snapshot.waveCount = reader.u16();
    snapshot.waveTimer = reader.f32();
    snapshot.threatLevel = reader.u16();
    snapshot.arenaSize = reader.f32();
    reader.arenaSize = snapshot.arenaSize;
    const playerCount = reader.u8();
    const enemyCount = reader.u16();
    const foodCount = reader.u16();
    const projectileCount = reader.u16();
    const hazardCount = reader.u16();
    const spawnCount = reader.u16();
    const players = snapshot.players || (snapshot.players = []);
    const enemies = snapshot.enemies || (snapshot.enemies = []);
    const foods = snapshot.foods || (snapshot.foods = []);
    const projectiles = snapshot.projectiles || (snapshot.projectiles = []);
    const hazards = snapshot.hazards || (snapshot.hazards = []);
    const pendingSpawns = snapshot.pendingSpawns || (snapshot.pendingSpawns = []);
    for (let index = 0; index < playerCount; index += 1) readPlayer(reader, modules, itemAt(players, index));
    for (let index = 0; index < enemyCount; index += 1) readEnemy(reader, itemAt(enemies, index));
    for (let index = 0; index < foodCount; index += 1) readFood(reader, itemAt(foods, index));
    for (let index = 0; index < projectileCount; index += 1) readProjectile(reader, itemAt(projectiles, index));
    for (let index = 0; index < hazardCount; index += 1) readHazard(reader, itemAt(hazards, index));
    for (let index = 0; index < spawnCount; index += 1) readSpawn(reader, itemAt(pendingSpawns, index));
    players.length = playerCount;
    enemies.length = enemyCount;
    foods.length = foodCount;
    projectiles.length = projectileCount;
    hazards.length = hazardCount;
    pendingSpawns.length = spawnCount;
    reader.complete();
    return snapshot;
  }

  root.GSS0NetworkCodec = Object.freeze({ version: VERSION, decode });
})(globalThis);
