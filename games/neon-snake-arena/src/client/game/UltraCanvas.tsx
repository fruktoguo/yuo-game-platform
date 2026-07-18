import { useEffect, useRef } from 'react';
import { GRID_SIZE, GROWTH_NODE_DELAY, GROWTH_PULSE_DURATION, PLAYER_COLORS, SEGMENT_BIRTH_DURATION } from '../../shared/constants';
import { MODULE_BY_ID, type ModuleDefinition, type ModuleId } from '../../shared/modules';
import type {
  GridPoint,
  UltraEffect,
  UltraEnemyView,
  UltraFoodView,
  UltraHazardView,
  UltraPlayerView,
  UltraProjectileView,
  UltraSnapshot,
} from '../../shared/protocol';
import type { EffectQueue } from './EffectQueue';
import type { SnapshotBuffer } from './SnapshotBuffer';
import type { UltraAudio } from './UltraAudio';

interface UltraCanvasProps {
  snapshots: SnapshotBuffer;
  effects: EffectQueue;
  selfEntityId: number | null;
  audio: UltraAudio;
  onDirection: (angle: number) => void;
  active: boolean;
}

interface ArenaBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  cellSize: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type VisualEffect = Exclude<UltraEffect, { type: 'sound' | 'burst' | 'flash' | 'shake' }> & { remaining: number; maxLife: number };

const TAU = Math.PI * 2;

export function UltraCanvas({ snapshots, effects, selfEntityId, audio, onDirection, active }: UltraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selfEntityIdRef = useRef(selfEntityId);
  const audioRef = useRef(audio);
  const directionRef = useRef(onDirection);
  const activeRef = useRef(active);
  selfEntityIdRef.current = selfEntityId;
  audioRef.current = audio;
  directionRef.current = onDirection;
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const keys = new Set<string>();
    const pointer = { active: false, x: 0, y: 0, touchId: null as number | null };
    const particles: Particle[] = [];
    const visualEffects: VisualEffect[] = [];
    let width = 1;
    let height = 1;
    let dpr = 1;
    let arena = createArenaBounds(320, 420);
    let frameId = 0;
    let previousAt = performance.now();
    let shake = 0;
    let flash = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(420, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      arena = createArenaBounds(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const frame = (now: number) => {
      const delta = clamp((now - previousAt) / 1_000, 0, 0.033);
      previousAt = now;
      const snapshot = snapshots.sample(now);
      const self = snapshot?.players.find((player) => player.entityId === selfEntityIdRef.current) ?? null;
      ingestEffects(effects.drain(), arena, selfEntityIdRef.current, particles, visualEffects, audioRef.current, (amount) => { shake = Math.max(shake, amount); }, (amount) => { flash = Math.max(flash, amount); });
      updateLocalEffects(delta, particles, visualEffects);
      shake = Math.max(0, shake - delta * 28);
      flash = Math.max(0, flash - delta * 2.5);
      if (snapshot) {
        updateDirection(keys, pointer, canvas, arena, self, directionRef.current, activeRef.current);
        render(context, width, height, arena, snapshot, self, particles, visualEffects, now / 1_000, shake, flash);
      } else {
        context.fillStyle = '#07090a';
        context.fillRect(0, 0, width, height);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (event.pointerType === 'touch') {
        const indicator = document.querySelector<HTMLElement>('#touch-indicator');
        if (indicator) {
          indicator.style.left = `${event.clientX}px`;
          indicator.style.top = `${event.clientY}px`;
        }
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!activeRef.current) return;
      pointer.active = true;
      pointer.touchId = event.pointerId;
      updatePointer(event);
      canvas.setPointerCapture?.(event.pointerId);
      if (event.pointerType === 'touch') document.querySelector('#touch-indicator')?.classList.add('is-visible');
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!activeRef.current) return;
      if (event.pointerType === 'mouse') pointer.active = true;
      if (event.pointerType === 'touch' && pointer.touchId !== event.pointerId) return;
      updatePointer(event);
    };
    const endPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && pointer.touchId === event.pointerId) {
        pointer.active = false;
        pointer.touchId = null;
        document.querySelector('#touch-indicator')?.classList.remove('is-visible');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      keys.add(event.code);
      const taps: Record<string, number> = {
        ArrowLeft: Math.PI, KeyA: Math.PI, ArrowRight: 0, KeyD: 0,
        ArrowUp: -Math.PI / 2, KeyW: -Math.PI / 2, ArrowDown: Math.PI / 2, KeyS: Math.PI / 2,
      };
      if (activeRef.current && taps[event.code] !== undefined) {
        pointer.active = false;
        directionRef.current(taps[event.code]);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onBlur = () => keys.clear();
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [effects, snapshots]);

  return <canvas ref={canvasRef} id="game" aria-label="PROJECT GSS0 联机游戏画布" />;
}

function createArenaBounds(width: number, height: number): ArenaBounds {
  const topHud = document.querySelector('.hud-top')?.getBoundingClientRect();
  const bottomHud = document.querySelector('.hud-bottom')?.getBoundingClientRect();
  const safeTop = Math.max(12, (topHud?.bottom ?? 70) + 10);
  const safeBottom = Math.min(height - 12, (bottomHud?.top ?? height - 80) - 18);
  const availableHeight = Math.max(225, safeBottom - safeTop);
  const arenaSize = Math.max(225, Math.min(width - 32, availableHeight));
  const left = (width - arenaSize) / 2;
  const top = safeTop + (availableHeight - arenaSize) / 2;
  return { left, top, right: left + arenaSize, bottom: top + arenaSize, width: arenaSize, height: arenaSize, cellSize: arenaSize / GRID_SIZE };
}

function updateDirection(
  keys: Set<string>,
  pointer: { active: boolean; x: number; y: number },
  canvas: HTMLCanvasElement,
  arena: ArenaBounds,
  self: UltraPlayerView | null,
  onDirection: (angle: number) => void,
  active: boolean,
): void {
  if (!active || !self?.alive || self.choosingUpgrade || self.collisionCooldown > 0) return;
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (dx || dy) return onDirection(Math.atan2(dy, dx));
  if (!pointer.active) return;
  const rect = canvas.getBoundingClientRect();
  const selfPoint = cellCenter(self, arena);
  const pointerX = pointer.x * (rect.width ? widthRatio(rect.width, canvas.clientWidth) : 1);
  const pointerY = pointer.y * (rect.height ? widthRatio(rect.height, canvas.clientHeight) : 1);
  const aimX = pointerX - selfPoint.x;
  const aimY = pointerY - selfPoint.y;
  if (aimX * aimX + aimY * aimY > 16) onDirection(Math.atan2(aimY, aimX));
}

function widthRatio(value: number, reference: number): number {
  return reference > 0 ? reference / value : 1;
}

function render(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena: ArenaBounds,
  snapshot: UltraSnapshot,
  self: UltraPlayerView | null,
  particles: Particle[],
  effects: VisualEffect[],
  time: number,
  shake: number,
  flash: number,
): void {
  drawBackground(context, width, height, arena);
  context.save();
  context.beginPath();
  context.rect(arena.left, arena.top, arena.width, arena.height);
  context.clip();
  if (shake > 0) context.translate(random(-shake, shake), random(-shake, shake));
  drawFood(context, arena, snapshot.foods, snapshot.players, time);
  drawSpawnWarnings(context, arena, snapshot.pendingSpawns, time);
  drawHazards(context, arena, snapshot.hazards, time);
  for (const enemy of snapshot.enemies) drawEnemy(context, arena, enemy);
  const players = [...snapshot.players].sort((left, right) => Number(left.entityId === self?.entityId) - Number(right.entityId === self?.entityId));
  for (const player of players) if (player.alive) drawPlayer(context, arena, player, player.entityId === self?.entityId, time);
  drawProjectiles(context, arena, snapshot.projectiles);
  drawEffects(context, arena, particles, effects);
  context.restore();
  drawOffscreenIndicators(context, arena, snapshot, time);
  if (flash > 0) {
    context.fillStyle = `rgba(255, 79, 112, ${flash * 0.24})`;
    context.fillRect(0, 0, width, height);
  }
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number, arena: ArenaBounds): void {
  context.fillStyle = '#07090a';
  context.fillRect(0, 0, width, height);
  context.save();
  context.globalAlpha = 0.36;
  context.fillStyle = '#14191c';
  context.beginPath();
  context.moveTo(0, height * 0.18);
  context.lineTo(width * 0.28, 0);
  context.lineTo(width * 0.44, 0);
  context.lineTo(0, height * 0.34);
  context.closePath();
  context.fill();
  context.fillStyle = '#202529';
  context.beginPath();
  context.moveTo(width, height * 0.7);
  context.lineTo(width * 0.72, height);
  context.lineTo(width * 0.58, height);
  context.lineTo(width, height * 0.56);
  context.closePath();
  context.fill();
  context.restore();

  const gradient = context.createLinearGradient(arena.left, arena.top, arena.right, arena.bottom);
  gradient.addColorStop(0, '#171b1e');
  gradient.addColorStop(0.52, '#0d1113');
  gradient.addColorStop(1, '#14181b');
  context.fillStyle = gradient;
  context.fillRect(arena.left, arena.top, arena.width, arena.height);
  context.save();
  context.beginPath();
  context.rect(arena.left, arena.top, arena.width, arena.height);
  context.clip();
  for (let index = 0; index <= GRID_SIZE; index += 1) {
    const x = arena.left + index * arena.cellSize;
    const y = arena.top + index * arena.cellSize;
    const major = index % 6 === 0;
    context.beginPath();
    context.moveTo(x, arena.top);
    context.lineTo(x, arena.bottom);
    context.moveTo(arena.left, y);
    context.lineTo(arena.right, y);
    context.lineWidth = major ? 1.35 : 0.7;
    context.strokeStyle = major ? 'rgba(231, 235, 235, 0.18)' : 'rgba(198, 205, 207, 0.065)';
    context.stroke();
  }
  context.fillStyle = 'rgba(243, 198, 0, 0.055)';
  for (let index = -GRID_SIZE; index < GRID_SIZE * 2; index += 3) {
    context.save();
    context.translate(arena.left + index * arena.cellSize, arena.top);
    context.rotate(Math.PI / 4);
    context.fillRect(0, -arena.cellSize * 0.08, arena.width * 1.45, arena.cellSize * 0.08);
    context.restore();
  }
  context.fillStyle = 'rgba(235, 238, 238, 0.35)';
  context.font = `700 ${Math.max(7, arena.cellSize * 0.23)}px Bahnschrift, Arial Narrow, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  for (let index = 0; index < GRID_SIZE; index += 4) {
    const label = String(index + 1).padStart(2, '0');
    context.fillText(label, arena.left + index * arena.cellSize + 3, arena.top + 3);
    context.save();
    context.translate(arena.left + 3, arena.top + index * arena.cellSize + arena.cellSize - 3);
    context.rotate(-Math.PI / 2);
    context.fillText(label, 0, 0);
    context.restore();
  }
  context.fillStyle = 'rgba(0, 0, 0, 0.22)';
  context.fillRect(arena.left, arena.top, arena.width, arena.cellSize * 0.18);
  context.fillRect(arena.left, arena.bottom - arena.cellSize * 0.18, arena.width, arena.cellSize * 0.18);
  context.restore();

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.65)';
  context.shadowBlur = 8;
  context.strokeStyle = 'rgba(239, 242, 242, 0.6)';
  context.lineWidth = 1;
  context.strokeRect(arena.left + 0.5, arena.top + 0.5, arena.width - 1, arena.height - 1);
  context.shadowBlur = 0;
  context.strokeStyle = '#f3c600';
  context.lineWidth = 3;
  const mark = Math.max(16, arena.cellSize * 0.8);
  context.beginPath();
  context.moveTo(arena.left, arena.top + mark); context.lineTo(arena.left, arena.top); context.lineTo(arena.left + mark, arena.top);
  context.moveTo(arena.right - mark, arena.top); context.lineTo(arena.right, arena.top); context.lineTo(arena.right, arena.top + mark * 0.45);
  context.moveTo(arena.left, arena.bottom - mark * 0.45); context.lineTo(arena.left, arena.bottom); context.lineTo(arena.left + mark, arena.bottom);
  context.moveTo(arena.right - mark, arena.bottom); context.lineTo(arena.right, arena.bottom); context.lineTo(arena.right, arena.bottom - mark);
  context.stroke();
  context.fillStyle = '#f3c600'; context.fillRect(arena.left, arena.top, mark * 0.58, 4);
  context.fillStyle = '#08c7dc'; context.fillRect(arena.right - mark * 0.45, arena.bottom - 4, mark * 0.45, 4);
  context.fillStyle = 'rgba(239, 242, 242, 0.82)'; context.fillRect(arena.left, arena.bottom - 3, arena.width, 3);
  context.fillStyle = '#f3c600'; context.fillRect(arena.left, arena.bottom - 3, arena.width * 0.28, 3);
  context.fillStyle = '#08c7dc'; context.fillRect(arena.right - arena.width * 0.16, arena.bottom - 3, arena.width * 0.16, 3);
  context.restore();
}

function drawFood(context: CanvasRenderingContext2D, arena: ArenaBounds, foods: UltraFoodView[], players: UltraPlayerView[], time: number): void {
  for (const food of foods) {
    const point = cellCenter(food, arena);
    const radius = arena.cellSize * 0.13;
    const pulse = 1 + Math.sin(time * 5 + food.phase) * 0.08;
    context.save();
    if (food.isPulled) {
      const tractor = nearestTractor(food, players);
      if (tractor) {
        const target = cellCenter(tractor, arena);
        context.globalAlpha = 0.45 + Math.sin(time * 12 + food.phase) * 0.12;
        context.strokeStyle = MODULE_BY_ID.tractor.color;
        context.lineWidth = Math.max(1, arena.cellSize * 0.045);
        context.setLineDash([arena.cellSize * 0.2, arena.cellSize * 0.12]);
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(target.x, target.y);
        context.stroke();
        context.setLineDash([]);
      }
    }
    context.globalAlpha = 1;
    context.translate(point.x, point.y);
    context.scale(pulse, pulse);
    context.rotate(Math.PI / 4 + Math.sin(time * 1.6 + food.phase) * 0.08);
    context.shadowColor = food.color;
    context.shadowBlur = 12;
    context.fillStyle = '#111518';
    context.strokeStyle = food.color;
    context.lineWidth = Math.max(1, radius * 0.34);
    const outer = radius * 1.52;
    context.fillRect(-outer, -outer, outer * 2, outer * 2);
    context.strokeRect(-outer, -outer, outer * 2, outer * 2);
    context.rotate(-Math.PI / 4);
    context.fillStyle = food.color;
    context.beginPath();
    context.arc(0, 0, radius * 0.82, 0, TAU);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#f4f6f5';
    context.fillRect(-radius * 0.18, -radius * 0.62, radius * 0.36, radius * 1.24);
    context.fillRect(-radius * 0.62, -radius * 0.18, radius * 1.24, radius * 0.36);
    context.restore();
  }
}

function drawSpawnWarnings(context: CanvasRenderingContext2D, arena: ArenaBounds, spawns: UltraSnapshot['pendingSpawns'], time: number): void {
  for (const spawn of spawns) {
    const progress = 1 - clamp(spawn.timer / spawn.maxTimer, 0, 1);
    const blink = 0.48 + Math.abs(Math.sin(time * 12)) * 0.52;
    const head = cellCenter(spawn.headCell, arena);
    const body = spawn.bodyCells.map((cell) => cellCenter(cell, arena));
    const size = arena.cellSize * 0.28;
    context.save();
    context.globalAlpha = 0.3 + blink * 0.48;
    context.strokeStyle = '#ff3d5d';
    context.lineCap = 'round';
    context.setLineDash([arena.cellSize * 0.12, arena.cellSize * 0.13]);
    context.lineWidth = Math.max(1, arena.cellSize * 0.045);
    context.beginPath();
    context.moveTo(head.x, head.y);
    for (const point of body) context.lineTo(point.x, point.y);
    context.stroke();
    context.setLineDash([]);
    for (const point of body) {
      const bodySize = size * 0.52;
      context.globalAlpha = 0.24 + blink * 0.3;
      context.beginPath();
      context.moveTo(point.x - bodySize, point.y - bodySize); context.lineTo(point.x + bodySize, point.y + bodySize);
      context.moveTo(point.x + bodySize, point.y - bodySize); context.lineTo(point.x - bodySize, point.y + bodySize);
      context.stroke();
    }
    const radius = arena.cellSize * (0.68 - progress * 0.28);
    context.globalAlpha = 0.28 + blink * 0.52;
    context.fillStyle = 'rgba(255, 61, 93, 0.12)';
    context.shadowColor = '#ff3d5d';
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(head.x, head.y, radius, 0, TAU);
    context.fill();
    context.stroke();
    context.globalAlpha = 0.65 + blink * 0.35;
    context.lineWidth = Math.max(2, arena.cellSize * 0.09);
    context.beginPath();
    context.moveTo(head.x - size, head.y - size); context.lineTo(head.x + size, head.y + size);
    context.moveTo(head.x + size, head.y - size); context.lineTo(head.x - size, head.y + size);
    context.stroke();
    context.restore();
  }
}

function drawEnemy(context: CanvasRenderingContext2D, arena: ArenaBounds, enemy: UltraEnemyView): void {
  const head = cellCenter(enemy, arena);
  const segments = enemy.segments.map((segment) => cellCenter(segment, arena));
  const pieceScale = clamp(arena.cellSize / 34, 0.55, 1);
  let previous = head;
  for (const segment of segments) {
    drawLink(context, previous, segment, 'rgba(4, 6, 7, 0.92)', 11 * pieceScale);
    drawLink(context, previous, segment, enemy.color, 2.2 * pieceScale, 0.72);
    previous = segment;
  }
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const source = enemy.segments[index];
    context.save();
    context.translate(segment.x, segment.y);
    context.scale(pieceScale, pieceScale);
    context.rotate(source && index > 0 ? Math.atan2(enemy.segments[index - 1].row - source.row, enemy.segments[index - 1].col - source.col) : enemy.angle);
    context.shadowColor = 'rgba(0,0,0,0.8)';
    context.shadowBlur = 6;
    context.fillStyle = '#171b1e';
    context.strokeStyle = enemy.color;
    context.lineWidth = 1.8;
    context.beginPath();
    context.moveTo(10, 0); context.lineTo(4, 9); context.lineTo(-8, 7); context.lineTo(-11, 0);
    context.lineTo(-8, -7); context.lineTo(4, -9); context.closePath();
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = enemy.color;
    context.globalAlpha = 0.72;
    context.fillRect(-7, -2, 11, 4);
    context.fillStyle = '#e9eceb';
    context.globalAlpha = 0.88;
    context.fillRect(4, -5, 2, 3);
    context.fillRect(4, 2, 2, 3);
    context.restore();
  }
  drawEnemyHead(context, head, enemy.angle, pieceScale, enemy.color);
  if (enemy.captured > 0) drawCaptureLabel(context, head.x, head.y - 25 * pieceScale, pieceScale, enemy.color, `● ${enemy.captured}`);
}

function drawPlayer(context: CanvasRenderingContext2D, arena: ArenaBounds, player: UltraPlayerView, self: boolean, gameTime: number): void {
  context.save();
  if (player.paused || player.choosingUpgrade) context.globalAlpha = 0.28 + Math.abs(Math.sin(gameTime * 12)) * 0.48;
  const head = cellCenter(player, arena);
  const pieceScale = clamp(arena.cellSize / 34, 0.55, 1);
  let previous = head;
  for (const segment of player.segments) {
    const point = cellCenter(segment, arena);
    const color = segment.module ? MODULE_BY_ID[segment.module].color : segment.neutral ? 'rgba(222, 226, 226, 0.8)' : 'rgba(116, 124, 127, 0.72)';
    drawLink(context, previous, point, 'rgba(5, 7, 8, 0.9)', (segment.module ? 10 : 9) * pieceScale, 0.82);
    drawLink(context, previous, point, color, 2.1 * pieceScale, 0.78);
    previous = point;
  }
  for (let index = player.segments.length - 1; index >= 0; index -= 1) {
    const segment = player.segments[index];
    const point = cellCenter(segment, arena);
    const pulse = growthPulse(player, index + 1);
    const visualScale = segmentBirthScale(segment.birthAge) * (1 + pulse * 0.46);
    context.save();
    context.translate(point.x, point.y);
    context.scale(pieceScale * visualScale, pieceScale * visualScale);
    context.rotate(segment.angle);
    if (pulse > 0 && player.growth) {
      context.shadowColor = player.growth.color;
      context.shadowBlur = 12 + pulse * 10;
    }
    if (segment.module) drawModuleSegment(context, segment.module, segment.ready, segment.cooldown, player);
    else if (segment.neutral) drawNeutralSegment(context);
    context.restore();
    if (segment.module === 'blade') drawBlade(context, arena, point, segment.orbit, pieceScale);
  }
  const accent = self ? '#f3c600' : PLAYER_COLORS[player.colorIndex % PLAYER_COLORS.length];
  drawPlayerHead(context, head, player.angle, pieceScale, accent, player.invulnerable > 0, gameTime, growthPulse(player, 0), player.growth?.color);
  if (!self) drawPlayerLabel(context, arena, head, player.name, accent, pieceScale);
  context.restore();
}

function drawEnemyHead(context: CanvasRenderingContext2D, point: { x: number; y: number }, angle: number, scale: number, color: string): void {
  context.save();
  context.translate(point.x, point.y);
  context.scale(scale, scale);
  context.rotate(angle);
  context.shadowColor = color;
  context.shadowBlur = 14;
  context.fillStyle = '#101416';
  context.strokeStyle = '#eff1f0';
  context.lineWidth = 1.7;
  context.beginPath();
  context.moveTo(18, 0); context.lineTo(8, 12); context.lineTo(-7, 11); context.lineTo(-15, 5);
  context.lineTo(-12, 0); context.lineTo(-15, -5); context.lineTo(-7, -11); context.lineTo(8, -12); context.closePath();
  context.fill(); context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.beginPath(); context.moveTo(18, 0); context.lineTo(7, 6); context.lineTo(7, -6); context.closePath(); context.fill();
  context.fillStyle = '#f3c600'; context.fillRect(-11, -8, 3, 16);
  context.fillStyle = '#f7f8f7'; context.fillRect(2, -7, 5, 3); context.fillRect(2, 4, 5, 3);
  context.fillStyle = '#080a0b'; context.fillRect(4, -7, 2, 3); context.fillRect(4, 4, 2, 3);
  context.restore();
}

function drawPlayerHead(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  angle: number,
  scale: number,
  accent: string,
  invulnerable: boolean,
  time: number,
  growth = 0,
  growthColor?: string,
): void {
  context.save();
  context.translate(point.x, point.y);
  context.scale(scale * (1 + growth * 0.44), scale * (1 + growth * 0.44));
  context.rotate(angle);
  if (invulnerable) context.globalAlpha = 0.6 + Math.sin(time * 28) * 0.25;
  context.shadowColor = growth > 0 && growthColor ? growthColor : accent;
  context.shadowBlur = 14 + growth * 9;
  context.fillStyle = '#e7e9e8';
  context.strokeStyle = '#090b0c';
  context.lineWidth = 1.8;
  context.beginPath();
  context.moveTo(19, 0); context.lineTo(9, 13); context.lineTo(-7, 12); context.lineTo(-16, 6);
  context.lineTo(-12, 0); context.lineTo(-16, -6); context.lineTo(-7, -12); context.lineTo(9, -13); context.closePath();
  context.fill(); context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#15191b';
  context.beginPath(); context.moveTo(18, 0); context.lineTo(7, 7); context.lineTo(1, 5); context.lineTo(1, -5); context.lineTo(7, -7); context.closePath(); context.fill();
  context.fillStyle = accent; context.fillRect(-12, -9, 4, 18);
  context.fillStyle = '#08c7dc'; context.fillRect(4, -6, 7, 3); context.fillRect(4, 3, 7, 3);
  context.fillStyle = 'rgba(255,255,255,0.85)'; context.fillRect(-5, -10, 8, 2);
  context.restore();
}

function drawModuleSegment(context: CanvasRenderingContext2D, moduleId: ModuleId, ready: boolean, cooldown: number, player: UltraPlayerView): void {
  const module = MODULE_BY_ID[moduleId];
  context.shadowColor = module.color;
  context.shadowBlur = 10;
  context.fillStyle = '#151a1d';
  context.strokeStyle = module.color;
  context.lineWidth = 1.8;
  context.beginPath();
  context.moveTo(11, 0); context.lineTo(5, 10); context.lineTo(-8, 8); context.lineTo(-11, 0);
  context.lineTo(-8, -8); context.lineTo(5, -10); context.closePath();
  context.fill(); context.stroke();
  context.shadowBlur = 4;
  drawModuleShape(context, module, 8.6);
  if (module.shape === 'ring') { context.strokeStyle = module.color; context.lineWidth = 2.4; context.stroke(); }
  else { context.fillStyle = module.color; context.fill(); }
  if ((moduleId === 'shield' || moduleId === 'phase') && !ready) {
    const armor = player.segments.filter((segment) => segment.module === 'armor').length;
    const total = (moduleId === 'shield' ? 18 : 22) * Math.pow(0.82, armor);
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255,255,255,0.65)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, 14.5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - clamp(cooldown / total, 0, 1)));
    context.stroke();
  }
}

function drawNeutralSegment(context: CanvasRenderingContext2D): void {
  context.fillStyle = 'rgba(184, 190, 191, 0.74)';
  context.strokeStyle = 'rgba(246, 247, 246, 0.9)';
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(10, 0); context.lineTo(4, 8); context.lineTo(-8, 7); context.lineTo(-10, 0);
  context.lineTo(-8, -7); context.lineTo(4, -8); context.closePath();
  context.fill(); context.stroke();
  context.fillStyle = 'rgba(32, 37, 39, 0.76)';
  context.fillRect(-5, -1.5, 10, 3);
}

function drawModuleShape(context: CanvasRenderingContext2D, module: ModuleDefinition, size: number): void {
  context.beginPath();
  if (module.shape === 'circle' || module.shape === 'ring') context.arc(0, 0, size * (module.shape === 'circle' ? 0.58 : 0.55), 0, TAU);
  else if (module.shape === 'triangle') { context.moveTo(size * 0.7, 0); context.lineTo(-size * 0.5, size * 0.58); context.lineTo(-size * 0.5, -size * 0.58); context.closePath(); }
  else if (module.shape === 'diamond') { context.moveTo(size * 0.68, 0); context.lineTo(0, size * 0.68); context.lineTo(-size * 0.68, 0); context.lineTo(0, -size * 0.68); context.closePath(); }
  else if (module.shape === 'capsule') context.roundRect(-size * 0.72, -size * 0.38, size * 1.44, size * 0.76, size * 0.35);
  else if (module.shape === 'star') {
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? size * 0.72 : size * 0.31;
      const angle = index * Math.PI / 5 - Math.PI / 2;
      if (index === 0) context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); else context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    context.closePath();
  } else if (module.shape === 'hex') {
    for (let index = 0; index < 6; index += 1) {
      const angle = index * TAU / 6;
      if (index === 0) context.moveTo(Math.cos(angle) * size * 0.67, Math.sin(angle) * size * 0.67); else context.lineTo(Math.cos(angle) * size * 0.67, Math.sin(angle) * size * 0.67);
    }
    context.closePath();
  } else context.rect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
}

function drawBlade(context: CanvasRenderingContext2D, arena: ArenaBounds, segment: { x: number; y: number }, orbit: number, scale: number): void {
  const radius = arena.cellSize * 0.58 * 5;
  context.save();
  context.translate(segment.x + Math.cos(orbit) * radius, segment.y + Math.sin(orbit) * radius);
  context.scale(scale, scale);
  context.rotate(orbit * 2);
  context.shadowColor = MODULE_BY_ID.blade.color;
  context.shadowBlur = 12;
  context.fillStyle = MODULE_BY_ID.blade.color;
  context.beginPath(); context.moveTo(10, 0); context.lineTo(-6, 4); context.lineTo(-2, 0); context.lineTo(-6, -4); context.closePath(); context.fill();
  context.restore();
}

function drawPlayerLabel(context: CanvasRenderingContext2D, arena: ArenaBounds, head: { x: number; y: number }, name: string, color: string, scale: number): void {
  context.save();
  context.font = `800 ${Math.max(9, 10 * scale)}px Bahnschrift, Arial Narrow, sans-serif`;
  context.textAlign = 'center';
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(5,7,8,0.9)';
  const halfWidth = context.measureText(name).width / 2 + 3;
  const x = clamp(head.x, arena.left + halfWidth, arena.right - halfWidth);
  const preferredY = head.y - 25 * scale;
  const y = preferredY < arena.top + 12 ? head.y + 30 * scale : Math.min(preferredY, arena.bottom - 8);
  context.strokeText(name, x, y);
  context.fillStyle = color;
  context.fillText(name, x, y);
  context.restore();
}

function drawCaptureLabel(context: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string, text: string): void {
  context.save(); context.translate(x, y); context.scale(scale, scale);
  context.fillStyle = 'rgba(8, 10, 11, 0.94)'; context.strokeStyle = color; context.lineWidth = 1;
  context.fillRect(-13, -8, 26, 16); context.strokeRect(-13, -8, 26, 16);
  context.fillStyle = '#f4f6f5'; context.font = '800 9px Bahnschrift, Arial Narrow, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 0, 0); context.restore();
}

function drawHazards(context: CanvasRenderingContext2D, arena: ArenaBounds, hazards: UltraHazardView[], time: number): void {
  for (const hazard of hazards) {
    const point = cellCenter(hazard, arena);
    const pulse = 1 + Math.sin(time * 8 + hazard.phase) * 0.12;
    context.save(); context.translate(point.x, point.y);
    if (hazard.kind === 'gravity') {
      context.globalAlpha = 0.24 + Math.sin(time * 5 + hazard.phase) * 0.08;
      context.fillStyle = hazard.color; context.strokeStyle = hazard.color; context.lineWidth = 2;
      polygonPath(context, 0, 0, hazard.radius * arena.cellSize * pulse, 12, hazard.phase * 0.08); context.fill(); context.stroke();
      context.globalAlpha = 0.9; context.shadowColor = hazard.color; context.shadowBlur = 14; context.fillStyle = '#080a0b';
      polygonPath(context, 0, 0, 14 * pulse, 8, Math.PI / 8); context.fill(); context.strokeStyle = '#f3c600'; context.lineWidth = 1.5; context.stroke();
    } else {
      context.scale(pulse, pulse); context.rotate(hazard.phase); context.shadowColor = hazard.color; context.shadowBlur = 10;
      context.fillStyle = '#171b1e'; context.strokeStyle = hazard.color; context.lineWidth = 2; polygonPath(context, 0, 0, 11, 4, Math.PI / 4); context.fill(); context.stroke();
      context.shadowBlur = 0; context.rotate(-hazard.phase); context.fillStyle = '#f3c600'; context.fillRect(-6, -1.5, 12, 3); context.fillRect(-1.5, -6, 3, 12);
    }
    context.restore();
  }
}

function drawProjectiles(context: CanvasRenderingContext2D, arena: ArenaBounds, projectiles: UltraProjectileView[]): void {
  for (const projectile of projectiles) {
    const point = cellCenter(projectile, arena);
    const velocity = Math.hypot(projectile.vx, projectile.vy) || 1;
    const dx = projectile.vx / velocity;
    const dy = projectile.vy / velocity;
    const trail = Math.min(30, 8 + projectile.size * 3.2);
    context.save();
    context.strokeStyle = 'rgba(5, 7, 8, 0.82)'; context.lineWidth = Math.max(2, projectile.size * 1.25);
    context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x - dx * trail, point.y - dy * trail); context.stroke();
    context.strokeStyle = projectile.color; context.globalAlpha = 0.84; context.lineWidth = Math.max(1, projectile.size * 0.48);
    context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x - dx * trail, point.y - dy * trail); context.stroke();
    context.globalAlpha = 1; context.fillStyle = projectile.color; context.shadowColor = projectile.color; context.shadowBlur = 9;
    polygonPath(context, point.x, point.y, projectile.size * 1.15, 4, Math.atan2(projectile.vy, projectile.vx)); context.fill(); context.restore();
  }
}

function drawOffscreenIndicators(context: CanvasRenderingContext2D, arena: ArenaBounds, snapshot: UltraSnapshot, time: number): void {
  const inset = 13;
  const left = arena.left + inset;
  const right = arena.right - inset;
  const top = arena.top + inset;
  const bottom = arena.bottom - inset;
  const centerX = arena.left + arena.width / 2;
  const centerY = arena.top + arena.height / 2;

  const marker = (point: GridPoint, color: string, kind: 'food' | 'enemy' | 'warning') => {
    const screen = cellCenter(point, arena);
    if (screen.x >= left && screen.x <= right && screen.y >= top && screen.y <= bottom) return;
    const dx = screen.x - centerX;
    const dy = screen.y - centerY;
    const edgeScale = Math.min(
      Math.abs(dx) > 0.001 ? (arena.width / 2 - inset) / Math.abs(dx) : Number.POSITIVE_INFINITY,
      Math.abs(dy) > 0.001 ? (arena.height / 2 - inset) / Math.abs(dy) : Number.POSITIVE_INFINITY,
    );
    const x = centerX + dx * edgeScale;
    const y = centerY + dy * edgeScale;
    context.save();
    context.translate(x, y);
    context.shadowColor = color;
    context.shadowBlur = 8;
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 2;
    if (kind === 'warning') {
      const size = 6 + Math.abs(Math.sin(time * 10)) * 2;
      context.beginPath(); context.moveTo(-size, -size); context.lineTo(size, size); context.moveTo(size, -size); context.lineTo(-size, size); context.stroke();
    } else if (kind === 'enemy') {
      context.rotate(Math.PI / 4);
      context.fillRect(-4, -4, 8, 8);
    } else {
      context.beginPath(); context.arc(0, 0, 3.5, 0, TAU); context.fill();
    }
    context.restore();
  };

  context.save();
  context.beginPath();
  context.rect(arena.left, arena.top, arena.width, arena.height);
  context.clip();
  for (const food of snapshot.foods) marker(food, food.color, 'food');
  for (const enemy of snapshot.enemies) marker(enemy, enemy.color, 'enemy');
  for (const spawn of snapshot.pendingSpawns) marker(spawn.headCell, '#ff3d5d', 'warning');
  context.restore();
}

function ingestEffects(
  incoming: UltraEffect[],
  arena: ArenaBounds,
  selfEntityId: number | null,
  particles: Particle[],
  visualEffects: VisualEffect[],
  audio: UltraAudio,
  shake: (amount: number) => void,
  flash: (amount: number) => void,
): void {
  for (const effect of incoming) {
    if (effect.type === 'sound') {
      if (effect.audienceEntityId === undefined || effect.audienceEntityId === selfEntityId) audio.play(effect.kind, effect.detail);
      continue;
    }
    if (effect.type === 'flash') {
      if (effect.audienceEntityId === undefined || effect.audienceEntityId === selfEntityId) flash(effect.strength);
      continue;
    }
    if (effect.type === 'shake') {
      if (effect.audienceEntityId === undefined || effect.audienceEntityId === selfEntityId) shake(effect.strength);
      continue;
    }
    if (effect.type === 'burst') {
      const origin = cellCenter(effect, arena);
      for (let index = 0; index < effect.count; index += 1) {
        const angle = random(0, TAU);
        const velocity = random(effect.speed * 0.25, effect.speed);
        const life = random(0.25, 0.75);
        particles.push({ x: origin.x, y: origin.y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life, maxLife: life, color: effect.color, size: random(1.4, 3.6) });
      }
      continue;
    }
    visualEffects.push({ ...effect, remaining: effect.life, maxLife: effect.life });
  }
  if (particles.length > 700) particles.splice(0, particles.length - 700);
  if (visualEffects.length > 240) visualEffects.splice(0, visualEffects.length - 240);
}

function updateLocalEffects(delta: number, particles: Particle[], effects: VisualEffect[]): void {
  for (const particle of particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.pow(0.04, delta);
    particle.vy *= Math.pow(0.04, delta);
  }
  for (let index = particles.length - 1; index >= 0; index -= 1) if (particles[index].life <= 0) particles.splice(index, 1);
  for (const effect of effects) effect.remaining -= delta;
  for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].remaining <= 0) effects.splice(index, 1);
}

function drawEffects(context: CanvasRenderingContext2D, arena: ArenaBounds, particles: Particle[], effects: VisualEffect[]): void {
  for (const particle of particles) {
    context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.fillStyle = particle.color;
    context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  context.globalAlpha = 1;
  for (const effect of effects) {
    const from = cellCenter(effect, arena);
    const progress = 1 - effect.remaining / effect.maxLife;
    const alpha = clamp(effect.remaining / effect.maxLife, 0, 1);
    context.save(); context.globalAlpha = alpha;
    if (effect.type === 'ring') {
      const endRadius = effect.endRadiusUnit === 'cells' ? effect.endRadius * arena.cellSize : effect.endRadius;
      const radius = effect.radius + (endRadius - effect.radius) * progress;
      context.strokeStyle = effect.color; context.lineWidth = 3 * (1 - progress) + 0.5; polygonPath(context, from.x, from.y, radius, 8, Math.PI / 8 + progress * 0.12); context.stroke();
    } else if (effect.type === 'beam' || effect.type === 'lightning') {
      const to = cellCenter({ col: effect.col2, row: effect.row2 }, arena);
      context.strokeStyle = effect.color; context.shadowColor = effect.color; context.shadowBlur = effect.type === 'beam' ? 12 : 8; context.lineWidth = effect.type === 'beam' ? 4 * alpha : 2;
      context.beginPath(); context.moveTo(from.x, from.y);
      if (effect.type === 'lightning') {
        for (let index = 1; index < 6; index += 1) {
          const ratio = index / 6;
          context.lineTo(from.x + (to.x - from.x) * ratio + random(-6, 6), from.y + (to.y - from.y) * ratio + random(-6, 6));
        }
      }
      context.lineTo(to.x, to.y); context.stroke();
    } else if (effect.type === 'text') {
      context.fillStyle = effect.color; context.font = '900 11px Bahnschrift, Arial Narrow, sans-serif'; context.textAlign = 'center'; context.fillText(effect.text, from.x, from.y - progress * 24);
    }
    context.restore();
  }
}

function polygonPath(context: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation: number): void {
  context.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * TAU / sides;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(pointX, pointY); else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

function drawLink(context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, color: string, width: number, alpha = 1): void {
  context.save(); context.globalAlpha = alpha; context.lineCap = 'round'; context.lineWidth = width; context.strokeStyle = color;
  context.beginPath(); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y); context.stroke(); context.restore();
}

function cellCenter(point: GridPoint, arena: ArenaBounds): { x: number; y: number } {
  return { x: arena.left + (point.col + 0.5) * arena.cellSize, y: arena.top + (point.row + 0.5) * arena.cellSize };
}

function nearestTractor(food: GridPoint, players: UltraPlayerView[]): UltraPlayerView | null {
  let nearest: UltraPlayerView | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const player of players) {
    if (!player.alive || !player.segments.some((segment) => segment.module === 'tractor')) continue;
    const distance = (player.col - food.col) ** 2 + (player.row - food.row) ** 2;
    if (distance < best) { best = distance; nearest = player; }
  }
  return nearest;
}

function growthPulse(player: UltraPlayerView, nodeIndex: number): number {
  if (!player.growth) return 0;
  const local = player.growth.elapsed - nodeIndex * GROWTH_NODE_DELAY;
  if (local < 0 || local >= GROWTH_PULSE_DURATION) return 0;
  const attack = 0.052;
  if (local < attack) return 1 - Math.pow(1 - local / attack, 3);
  return Math.pow(1 - (local - attack) / (GROWTH_PULSE_DURATION - attack), 2);
}

function segmentBirthScale(age: number | null): number {
  if (age === null) return 1;
  const progress = clamp(age / SEGMENT_BIRTH_DURATION, 0, 1);
  if (progress < 0.62) return 0.18 + (1 - Math.pow(1 - progress / 0.62, 3)) * 1.04;
  return 1.22 - (progress - 0.62) / 0.38 * 0.22;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}

function random(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
