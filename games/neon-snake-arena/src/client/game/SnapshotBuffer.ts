import type {
  GridPoint,
  UltraEnemyView,
  UltraPlayerView,
  UltraProjectileView,
  UltraSnapshot,
} from '../../shared/protocol';

const INTERPOLATION_DELAY_MS = 110;
const MAX_FRAMES = 12;

interface BufferedFrame {
  snapshot: UltraSnapshot;
  receivedAt: number;
}

export class SnapshotBuffer {
  private frames: BufferedFrame[] = [];

  push(snapshot: UltraSnapshot, receivedAt = performance.now()): boolean {
    const previous = this.frames.at(-1);
    if (previous && !isNewerTick(previous.snapshot.tick, snapshot.tick)) return false;
    this.frames.push({ snapshot, receivedAt });
    if (this.frames.length > MAX_FRAMES) this.frames.splice(0, this.frames.length - MAX_FRAMES);
    return true;
  }

  sample(now = performance.now()): UltraSnapshot | null {
    const latest = this.frames.at(-1);
    if (!latest || this.frames.length === 1) return latest?.snapshot ?? null;
    const renderAt = now - INTERPOLATION_DELAY_MS;
    let from = this.frames[0];
    let to = this.frames[1];
    for (let index = 1; index < this.frames.length; index += 1) {
      from = this.frames[index - 1];
      to = this.frames[index];
      if (to.receivedAt >= renderAt) break;
    }
    const alpha = clamp((renderAt - from.receivedAt) / Math.max(1, to.receivedAt - from.receivedAt), 0, 1);
    return interpolateSnapshot(from.snapshot, to.snapshot, alpha);
  }

  getLatest(): UltraSnapshot | null {
    return this.frames.at(-1)?.snapshot ?? null;
  }

  clear(): void {
    this.frames = [];
  }
}

function interpolateSnapshot(from: UltraSnapshot, to: UltraSnapshot, alpha: number): UltraSnapshot {
  const previousPlayers = new Map(from.players.map((player) => [player.entityId, player]));
  const previousEnemies = new Map(from.enemies.map((enemy) => [enemy.id, enemy]));
  const previousProjectiles = new Map(from.projectiles.map((projectile) => [projectile.id, projectile]));
  const previousFoods = new Map(from.foods.map((food) => [food.id, food]));
  return {
    ...to,
    gameTime: lerp(from.gameTime, to.gameTime, alpha),
    waveTimer: lerp(from.waveTimer, to.waveTimer, alpha),
    players: to.players.map((player) => interpolatePlayer(previousPlayers.get(player.entityId), player, alpha)),
    enemies: to.enemies.map((enemy) => interpolateEnemy(previousEnemies.get(enemy.id), enemy, alpha)),
    projectiles: to.projectiles.map((projectile) => interpolateProjectile(previousProjectiles.get(projectile.id), projectile, alpha)),
    foods: to.foods.map((food) => ({ ...food, ...interpolatePoint(previousFoods.get(food.id), food, alpha) })),
  };
}

function interpolatePlayer(from: UltraPlayerView | undefined, to: UltraPlayerView, alpha: number): UltraPlayerView {
  if (!from || !from.alive || !to.alive) return to;
  return {
    ...to,
    ...interpolatePoint(from, to, alpha),
    angle: interpolateAngle(from.angle, to.angle, alpha),
    segments: to.segments.map((segment, index) => {
      const previous = from.segments[Math.min(from.segments.length - 1, index)];
      return previous ? { ...segment, ...interpolatePoint(previous, segment, alpha), angle: interpolateAngle(previous.angle, segment.angle, alpha) } : segment;
    }),
  };
}

function interpolateEnemy(from: UltraEnemyView | undefined, to: UltraEnemyView, alpha: number): UltraEnemyView {
  if (!from) return to;
  return {
    ...to,
    ...interpolatePoint(from, to, alpha),
    angle: interpolateAngle(from.angle, to.angle, alpha),
    segments: to.segments.map((segment, index) => interpolatePoint(from.segments[Math.min(from.segments.length - 1, index)] ?? segment, segment, alpha)),
  };
}

function interpolateProjectile(from: UltraProjectileView | undefined, to: UltraProjectileView, alpha: number): UltraProjectileView {
  return from ? { ...to, ...interpolatePoint(from, to, alpha) } : to;
}

function interpolatePoint(from: GridPoint | undefined, to: GridPoint, alpha: number): GridPoint {
  return from ? { col: lerp(from.col, to.col, alpha), row: lerp(from.row, to.row, alpha) } : { col: to.col, row: to.row };
}

function interpolateAngle(from: number, to: number, alpha: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * alpha;
}

function isNewerTick(previous: number, next: number): boolean {
  const difference = (next - previous) >>> 0;
  return difference > 0 && difference < 0x8000_0000;
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
