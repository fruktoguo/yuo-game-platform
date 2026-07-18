import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  CLAIMABLE_MIN_X,
  CLAIMABLE_MIN_Y,
  CLAIMABLE_WORLD_HEIGHT,
  CLAIMABLE_WORLD_WIDTH,
  SECTOR_COLUMNS,
  SECTOR_ROWS,
  SECTOR_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../shared/constants';
import { transformCells, transformPattern, type CustomPatternData, type PatternId } from '../../shared/patterns';
import { PING_LABELS, type CursorPayload, type PingKind, type PlacementAction } from '../../shared/protocol';
import { sectorIndexAt } from '../../shared/sectors';
import { WorldModel, type VisualCellChange } from './WorldModel';

export type ToolMode = 'stamp' | 'erase' | 'pan';

export interface LifeCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusAt: (x: number, y: number) => void;
}

interface LifeCanvasProps {
  model: WorldModel;
  tool: ToolMode;
  patternId: PatternId;
  customPattern?: CustomPatternData;
  rotation: number;
  flipped: boolean;
  brushSize: number;
  sectorOwners: readonly number[];
  fullyOccupiedSectorOwners: readonly number[];
  selfOwnerId: number;
  selfColor: string;
  signalKind: PingKind | null;
  onPlace: (action: PlacementAction) => void;
  onCursor: (cursor: CursorPayload) => void;
  onSignalTarget: (x: number, y: number) => void;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface CellEffect {
  index: number;
  ownerId: number;
  born: boolean;
  startedAt: number;
}

interface PinchState {
  distance: number;
  zoom: number;
  worldX: number;
  worldY: number;
}

const SIGNAL_COLORS: Record<PingKind, string> = {
  look: '#75a9ff',
  help: '#f2c55c',
  celebrate: '#ff8ea1',
};

const EMPTY_ACTIONS: LifeCanvasHandle = {
  zoomIn: () => undefined,
  zoomOut: () => undefined,
  resetView: () => undefined,
  focusAt: () => undefined,
};

export const LifeCanvas = forwardRef<LifeCanvasHandle, LifeCanvasProps>(function LifeCanvas(props, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef(props);
  const actionsRef = useRef<LifeCanvasHandle>(EMPTY_ACTIONS);
  propsRef.current = props;

  useImperativeHandle(forwardedRef, () => ({
    zoomIn: () => actionsRef.current.zoomIn(),
    zoomOut: () => actionsRef.current.zoomOut(),
    resetView: () => actionsRef.current.resetView(),
    focusAt: (x, y) => actionsRef.current.focusAt(x, y),
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const texture = document.createElement('canvas');
    texture.width = WORLD_WIDTH;
    texture.height = WORLD_HEIGHT;
    const textureContext = texture.getContext('2d');
    if (!textureContext) return;
    const selfHighlightTexture = document.createElement('canvas');
    const selfHighlightContext = selfHighlightTexture.getContext('2d');
    if (!selfHighlightContext) return;
    const pixels = textureContext.createImageData(WORLD_WIDTH, WORLD_HEIGHT);
    const camera: Camera = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: 2, targetX: WORLD_WIDTH / 2, targetY: WORLD_HEIGHT / 2, targetZoom: 2 };
    const pointers = new Map<number, PointerPosition>();
    const effects: CellEffect[] = [];
    let hover: { x: number; y: number } | null = null;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let animationFrame = 0;
    let lastFrameAt = performance.now();
    let initialized = false;
    let panningPointer: number | null = null;
    let drawingPointer: number | null = null;
    let previousPointer: PointerPosition | null = null;
    let previousDrawCell = '';
    let lastPlaceAt = 0;
    let pinch: PinchState | null = null;
    let spacePressed = false;
    let selfHighlightDirty = true;
    let highlightedOwnerId = -1;
    let highlightedColor = '';

    const updateTextureCell = (index: number) => {
      const ownerId = props.model.owners[index];
      const offset = index * 4;
      if (ownerId === 0) {
        pixels.data[offset] = 0;
        pixels.data[offset + 1] = 0;
        pixels.data[offset + 2] = 0;
        pixels.data[offset + 3] = 0;
        return;
      }
      const [red, green, blue] = hexToRgb(props.model.colorFor(ownerId));
      pixels.data[offset] = red;
      pixels.data[offset + 1] = green;
      pixels.data[offset + 2] = blue;
      pixels.data[offset + 3] = 255;
    };

    const rebuildTexture = () => {
      for (let index = 0; index < props.model.owners.length; index += 1) updateTextureCell(index);
      textureContext.putImageData(pixels, 0, 0);
    };

    const onModelUpdate = (update: { full: boolean; changes: VisualCellChange[] }) => {
      if (update.full) {
        rebuildTexture();
        selfHighlightDirty = true;
        effects.length = 0;
        return;
      }
      const now = performance.now();
      const stride = Math.max(1, Math.ceil(update.changes.length / 900));
      update.changes.forEach((change, index) => {
        updateTextureCell(change.index);
        if (index % stride !== 0 || change.ownerId === change.previousOwnerId) return;
        effects.push({
          index: change.index,
          ownerId: change.ownerId || change.previousOwnerId,
          born: change.ownerId !== 0,
          startedAt: now,
        });
      });
      selfHighlightDirty = true;
      if (effects.length > 1_600) effects.splice(0, effects.length - 1_600);
      textureContext.putImageData(pixels, 0, 0);
    };

    rebuildTexture();
    const unsubscribe = props.model.subscribe(onModelUpdate);

    const resetView = () => {
      const fit = Math.max(0.4, Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.9);
      camera.targetX = WORLD_WIDTH / 2;
      camera.targetY = WORLD_HEIGHT / 2;
      camera.targetZoom = fit;
      if (!initialized) {
        camera.x = camera.targetX;
        camera.y = camera.targetY;
        camera.zoom = camera.targetZoom;
        initialized = true;
      }
    };

    const zoomAt = (screenX: number, screenY: number, factor: number) => {
      const nextZoom = clamp(camera.targetZoom * factor, minimumZoom(width, height), 36);
      const worldX = camera.targetX + (screenX - width / 2) / camera.targetZoom;
      const worldY = camera.targetY + (screenY - height / 2) / camera.targetZoom;
      camera.targetX = worldX - (screenX - width / 2) / nextZoom;
      camera.targetY = worldY - (screenY - height / 2) / nextZoom;
      camera.targetZoom = nextZoom;
      clampCameraTarget(camera, width, height);
    };

    actionsRef.current = {
      zoomIn: () => zoomAt(width / 2, height / 2, 1.35),
      zoomOut: () => zoomAt(width / 2, height / 2, 1 / 1.35),
      resetView,
      focusAt: (x, y) => {
        camera.targetX = clamp(x + 0.5, 0, WORLD_WIDTH);
        camera.targetY = clamp(y + 0.5, 0, WORLD_HEIGHT);
        camera.targetZoom = Math.max(camera.targetZoom, 7);
        clampCameraTarget(camera, width, height);
      },
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      camera.targetZoom = Math.max(camera.targetZoom, minimumZoom(width, height));
      clampCameraTarget(camera, width, height);
      if (!initialized) resetView();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const render = (now: number) => {
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1_000));
      lastFrameAt = now;
      const smoothing = 1 - Math.exp(-deltaSeconds * 14);
      camera.x += (camera.targetX - camera.x) * smoothing;
      camera.y += (camera.targetY - camera.y) * smoothing;
      camera.zoom += (camera.targetZoom - camera.zoom) * smoothing;
      clampCamera(camera, width, height);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = '#071012';
      context.fillRect(0, 0, width, height);
      const current = propsRef.current;
      if (highlightedOwnerId !== current.selfOwnerId || highlightedColor !== current.selfColor) {
        highlightedOwnerId = current.selfOwnerId;
        highlightedColor = current.selfColor;
        selfHighlightDirty = true;
      }
      if (selfHighlightDirty) {
        rebuildSelfHighlight(selfHighlightTexture, selfHighlightContext, current.model, current.selfOwnerId, current.selfColor);
        selfHighlightDirty = false;
      }
      drawWorld(context, texture, selfHighlightTexture, camera, width, height, current.model, current.sectorOwners, current.fullyOccupiedSectorOwners);
      drawCellEffects(context, effects, now, camera, width, height, propsRef.current.model);
      drawMapEvents(context, propsRef.current.model, now, camera, width, height);
      drawRemoteCursors(context, propsRef.current.model, now, camera, width, height);
      if (hover) drawLocalPreview(context, hover, camera, width, height, propsRef.current, now);
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);

    const pointerPosition = (event: MouseEvent): PointerPosition => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const cellAt = (position: PointerPosition) => {
      const worldX = camera.x + (position.x - width / 2) / camera.zoom;
      const worldY = camera.y + (position.y - height / 2) / camera.zoom;
      if (worldX < 0 || worldX >= WORLD_WIDTH || worldY < 0 || worldY >= WORLD_HEIGHT) return null;
      return { x: Math.floor(worldX), y: Math.floor(worldY) };
    };

    const emitCursor = (cell: { x: number; y: number }) => {
      const current = propsRef.current;
      current.onCursor({
        x: cell.x,
        y: cell.y,
        mode: current.tool,
        patternId: current.customPattern ? 'cell' : current.patternId,
        rotation: current.rotation,
        flipped: current.flipped,
        brushSize: current.brushSize,
      });
    };

    const placeAt = (cell: { x: number; y: number }, force = false) => {
      const current = propsRef.current;
      const key = `${cell.x}:${cell.y}`;
      const now = performance.now();
      if (!force && (key === previousDrawCell || now - lastPlaceAt < 95)) return;
      previousDrawCell = key;
      lastPlaceAt = now;
      current.onPlace({
        mode: current.tool === 'erase' ? 'erase' : 'stamp',
        x: cell.x,
        y: cell.y,
        patternId: current.patternId,
        customPattern: current.tool === 'stamp' ? current.customPattern : undefined,
        rotation: current.rotation,
        flipped: current.flipped,
        brushSize: current.brushSize,
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const position = pointerPosition(event);
      pointers.set(event.pointerId, position);
      hover = cellAt(position);

      if (pointers.size === 2) {
        const [first, second] = [...pointers.values()];
        const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        pinch = {
          distance: Math.max(1, distance(first, second)),
          zoom: camera.targetZoom,
          worldX: camera.targetX + (midpoint.x - width / 2) / camera.targetZoom,
          worldY: camera.targetY + (midpoint.y - height / 2) / camera.targetZoom,
        };
        panningPointer = null;
        drawingPointer = null;
        return;
      }

      const current = propsRef.current;
      const shouldPan = event.button === 1 || event.button === 2 || spacePressed || (current.tool === 'pan' && !current.signalKind);
      if (shouldPan) {
        panningPointer = event.pointerId;
        previousPointer = position;
        canvas.classList.add('is-panning');
        return;
      }

      if (event.button !== 0) return;
      if (!hover) return;
      if (current.signalKind) {
        current.onSignalTarget(hover.x, hover.y);
        return;
      }
      drawingPointer = event.pointerId;
      previousDrawCell = '';
      placeAt(hover, true);
    };

    const onPointerMove = (event: PointerEvent) => {
      const position = pointerPosition(event);
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, position);
      hover = cellAt(position);
      if (hover) emitCursor(hover);

      if (pointers.size >= 2 && pinch) {
        const [first, second] = [...pointers.values()];
        const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        const nextZoom = clamp(pinch.zoom * distance(first, second) / pinch.distance, minimumZoom(width, height), 36);
        camera.targetZoom = nextZoom;
        camera.targetX = pinch.worldX - (midpoint.x - width / 2) / nextZoom;
        camera.targetY = pinch.worldY - (midpoint.y - height / 2) / nextZoom;
        clampCameraTarget(camera, width, height);
        camera.x = camera.targetX;
        camera.y = camera.targetY;
        camera.zoom = camera.targetZoom;
        return;
      }

      if (panningPointer === event.pointerId && previousPointer) {
        const deltaX = position.x - previousPointer.x;
        const deltaY = position.y - previousPointer.y;
        camera.targetX -= deltaX / camera.targetZoom;
        camera.targetY -= deltaY / camera.targetZoom;
        clampCameraTarget(camera, width, height);
        camera.x = camera.targetX;
        camera.y = camera.targetY;
        previousPointer = position;
        return;
      }

      if (hover && drawingPointer === event.pointerId && (propsRef.current.tool === 'erase' || (!propsRef.current.customPattern && propsRef.current.patternId === 'cell'))) {
        placeAt(hover);
      }
    };

    const releasePointer = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (panningPointer === event.pointerId) {
        panningPointer = null;
        previousPointer = null;
        canvas.classList.remove('is-panning');
      }
      if (drawingPointer === event.pointerId) drawingPointer = null;
      if (pointers.size < 2) pinch = null;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const position = pointerPosition(event);
      zoomAt(position.x, position.y, Math.exp(-event.deltaY * 0.0012));
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onPointerLeave = () => {
      if (pointers.size === 0) hover = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isEditableTarget(event.target)) {
        spacePressed = true;
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spacePressed = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      actionsRef.current = EMPTY_ACTIONS;
      unsubscribe();
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', releasePointer);
      canvas.removeEventListener('pointercancel', releasePointer);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [props.model]);

  return <canvas ref={canvasRef} className={`life-canvas ${props.signalKind ? 'is-targeting' : ''}`} aria-label="共享生命世界" />;
});

function drawWorld(
  context: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  selfHighlightTexture: HTMLCanvasElement,
  camera: Camera,
  width: number,
  height: number,
  model: WorldModel,
  sectorOwners: readonly number[],
  fullyOccupiedSectorOwners: readonly number[],
): void {
  const worldSizeX = WORLD_WIDTH * camera.zoom;
  const worldSizeY = WORLD_HEIGHT * camera.zoom;
  const originX = -camera.x * camera.zoom + width / 2;
  const originY = -camera.y * camera.zoom + height / 2;

  context.fillStyle = '#465052';
  context.fillRect(originX, originY, worldSizeX, worldSizeY);
  context.fillStyle = '#0a1719';
  context.fillRect(originX + CLAIMABLE_MIN_X * camera.zoom, originY + CLAIMABLE_MIN_Y * camera.zoom, CLAIMABLE_WORLD_WIDTH * camera.zoom, CLAIMABLE_WORLD_HEIGHT * camera.zoom);
  for (let sector = 0; sector < sectorOwners.length; sector += 1) {
    const fullOwnerId = fullyOccupiedSectorOwners[sector] ?? 0;
    const ownerId = fullOwnerId || sectorOwners[sector] || 0;
    if (ownerId === 0) continue;
    const sectorX = originX + (CLAIMABLE_MIN_X + sector % SECTOR_COLUMNS * SECTOR_SIZE) * camera.zoom;
    const sectorY = originY + (CLAIMABLE_MIN_Y + Math.floor(sector / SECTOR_COLUMNS) * SECTOR_SIZE) * camera.zoom;
    context.globalAlpha = fullOwnerId ? 0.2 : 0.075;
    context.fillStyle = model.colorFor(ownerId);
    context.fillRect(
      sectorX,
      sectorY,
      SECTOR_SIZE * camera.zoom,
      SECTOR_SIZE * camera.zoom,
    );
    if (fullOwnerId) {
      context.globalAlpha = 0.9;
      context.strokeStyle = model.colorFor(fullOwnerId);
      context.lineWidth = 2;
      context.strokeRect(sectorX + 1, sectorY + 1, SECTOR_SIZE * camera.zoom - 2, SECTOR_SIZE * camera.zoom - 2);
    }
    context.globalAlpha = 1;
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(texture, originX, originY, worldSizeX, worldSizeY);
  context.drawImage(selfHighlightTexture, originX, originY, worldSizeX, worldSizeY);
  drawSectorGrid(context, originX, originY, camera.zoom);
  if (camera.zoom >= 9) drawCellGrid(context, originX, originY, camera.zoom);
  context.strokeStyle = 'rgba(200, 228, 221, 0.38)';
  context.lineWidth = 1.5;
  context.strokeRect(originX + 0.5, originY + 0.5, worldSizeX - 1, worldSizeY - 1);
}

function drawSectorGrid(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number): void {
  const sectorWidth = SECTOR_SIZE * zoom;
  const sectorHeight = SECTOR_SIZE * zoom;
  const claimableOriginX = originX + CLAIMABLE_MIN_X * zoom;
  const claimableOriginY = originY + CLAIMABLE_MIN_Y * zoom;
  context.strokeStyle = 'rgba(170, 204, 197, 0.14)';
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 0; column <= SECTOR_COLUMNS; column += 1) {
    context.moveTo(Math.round(claimableOriginX + column * sectorWidth) + 0.5, claimableOriginY);
    context.lineTo(Math.round(claimableOriginX + column * sectorWidth) + 0.5, claimableOriginY + CLAIMABLE_WORLD_HEIGHT * zoom);
  }
  for (let row = 0; row <= SECTOR_ROWS; row += 1) {
    context.moveTo(claimableOriginX, Math.round(claimableOriginY + row * sectorHeight) + 0.5);
    context.lineTo(claimableOriginX + CLAIMABLE_WORLD_WIDTH * zoom, Math.round(claimableOriginY + row * sectorHeight) + 0.5);
  }
  context.stroke();
}

function drawCellGrid(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number): void {
  context.strokeStyle = 'rgba(167, 201, 193, 0.055)';
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x <= WORLD_WIDTH; x += 1) {
    const screenX = Math.round(originX + x * zoom) + 0.5;
    context.moveTo(screenX, originY);
    context.lineTo(screenX, originY + WORLD_HEIGHT * zoom);
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 1) {
    const screenY = Math.round(originY + y * zoom) + 0.5;
    context.moveTo(originX, screenY);
    context.lineTo(originX + WORLD_WIDTH * zoom, screenY);
  }
  context.stroke();
}

function drawCellEffects(
  context: CanvasRenderingContext2D,
  effects: CellEffect[],
  now: number,
  camera: Camera,
  width: number,
  height: number,
  model: WorldModel,
): void {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    const progress = (now - effect.startedAt) / 420;
    if (progress >= 1) {
      effects.splice(index, 1);
      continue;
    }
    const cellX = effect.index % WORLD_WIDTH;
    const cellY = Math.floor(effect.index / WORLD_WIDTH);
    const point = worldToScreen(cellX + 0.5, cellY + 0.5, camera, width, height);
    const eased = 1 - Math.pow(1 - progress, 3);
    const size = camera.zoom * (effect.born ? 0.45 + eased * 1.05 : 1 + progress * 1.2);
    context.globalAlpha = effect.born ? (1 - progress) * 0.7 : (1 - progress) * 0.55;
    context.fillStyle = model.colorFor(effect.ownerId);
    context.fillRect(point.x - size / 2, point.y - size / 2, size, size);
  }
  context.globalAlpha = 1;
}

function drawMapEvents(context: CanvasRenderingContext2D, model: WorldModel, _now: number, camera: Camera, width: number, height: number): void {
  const wallNow = Date.now();
  for (const event of model.getMapEvents(wallNow)) {
    if (event.x === undefined || event.y === undefined) continue;
    const age = wallNow - event.at;
    const progress = clamp(age / 3_200, 0, 1);
    const point = worldToScreen(event.x + 0.5, event.y + 0.5, camera, width, height);
    const radius = 12 + progress * 38;
    const color = event.ownerId ? model.colorFor(event.ownerId) : '#f2c55c';
    context.globalAlpha = (1 - progress) * 0.8;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.stroke();
    if (event.type === 'ping') drawPingLabel(context, event.text, color, point, age, width, height);
  }
  context.globalAlpha = 1;
}

function drawPingLabel(
  context: CanvasRenderingContext2D,
  text: string,
  color: string,
  point: PointerPosition,
  age: number,
  width: number,
  height: number,
): void {
  const fadeIn = clamp(age / 140, 0, 1);
  const fadeOut = 1 - clamp((age - 3_600) / 1_200, 0, 1);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0) return;

  context.font = '600 11px Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif';
  const maxTextWidth = Math.max(80, Math.min(300, width - 36));
  const fittedText = fitCanvasText(context, text, maxTextWidth);
  const bubbleWidth = context.measureText(fittedText).width + 20;
  const bubbleHeight = 27;
  const rise = 8 + clamp(age / 4_800, 0, 1) * 14;
  const bubbleX = clamp(point.x - bubbleWidth / 2, 8, Math.max(8, width - bubbleWidth - 8));
  const aboveY = point.y - bubbleHeight - 18 - rise;
  const bubbleY = aboveY >= 8
    ? aboveY
    : clamp(point.y + 18, 8, Math.max(8, height - bubbleHeight - 8));
  const connectorY = bubbleY > point.y ? bubbleY : bubbleY + bubbleHeight;

  context.globalAlpha = alpha * 0.72;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(point.x, point.y);
  context.lineTo(clamp(point.x, bubbleX + 8, bubbleX + bubbleWidth - 8), connectorY);
  context.stroke();

  context.globalAlpha = alpha * 0.96;
  context.fillStyle = 'rgba(6, 15, 17, 0.94)';
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 5);
  context.fill();
  context.stroke();
  context.fillStyle = '#f2faf7';
  context.globalAlpha = alpha;
  context.fillText(fittedText, bubbleX + 10, bubbleY + 18);
}

function drawRemoteCursors(context: CanvasRenderingContext2D, model: WorldModel, _now: number, camera: Camera, width: number, height: number): void {
  const wallNow = Date.now();
  for (const cursor of model.getCursors()) {
    const age = wallNow - cursor.updatedAt;
    if (age > 5_000) continue;
    const alpha = age > 3_000 ? 1 - (age - 3_000) / 2_000 : 1;
    const point = worldToScreen(cursor.x + 0.5, cursor.y + 0.5, camera, width, height);
    context.globalAlpha = alpha;
    drawCursorMark(context, point.x, point.y, cursor.color);
    if (cursor.mode === 'stamp') drawPatternOutline(context, cursor.x, cursor.y, cursor.patternId, cursor.rotation, cursor.flipped, camera, width, height, cursor.color, 0.45 * alpha);
    if (cursor.mode === 'erase') drawEraseOutline(context, cursor.x, cursor.y, cursor.brushSize, camera, width, height, cursor.color, 0.45 * alpha);
    context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const labelWidth = context.measureText(cursor.name).width + 12;
    const labelX = clamp(point.x + 10, 4, width - labelWidth - 4);
    const labelY = clamp(point.y - 25, 4, height - 22);
    context.fillStyle = 'rgba(5, 12, 14, 0.88)';
    context.beginPath();
    context.roundRect(labelX, labelY, labelWidth, 20, 4);
    context.fill();
    context.fillStyle = cursor.color;
    context.fillText(cursor.name, labelX + 6, labelY + 14);
  }
  context.globalAlpha = 1;
}

function drawLocalPreview(
  context: CanvasRenderingContext2D,
  hover: { x: number; y: number },
  camera: Camera,
  width: number,
  height: number,
  props: LifeCanvasProps,
  now: number,
): void {
  if (props.signalKind) {
    drawSignalTarget(context, hover.x, hover.y, props.signalKind, camera, width, height, now);
    return;
  }
  if (props.tool === 'pan') {
    const point = worldToScreen(hover.x + 0.5, hover.y + 0.5, camera, width, height);
    drawCursorMark(context, point.x, point.y, '#f2c55c');
    return;
  }
  if (props.tool === 'erase') {
    drawEraseOutline(context, hover.x, hover.y, props.brushSize, camera, width, height, '#ff6d6a', 0.8);
    return;
  }
  const sourceCells = props.customPattern?.cells;
  const transformedCells = sourceCells
    ? transformCells(sourceCells, props.rotation, props.flipped)
    : transformPattern(props.patternId, props.rotation, props.flipped);
  const valid = transformedCells.every((cell) => {
    const x = hover.x + cell.x;
    const y = hover.y + cell.y;
    if (!isWorldCoordinate(x, y)) return false;
    const sector = sectorIndexAt(x, y);
    const fullOwnerId = sector === null ? 0 : props.fullyOccupiedSectorOwners[sector] ?? 0;
    return fullOwnerId === 0 || fullOwnerId === props.selfOwnerId;
  });
  drawCellsOutline(context, hover.x, hover.y, transformedCells, camera, width, height, valid ? props.selfColor : '#ff6d6a', 0.82);
}

function drawSignalTarget(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: PingKind,
  camera: Camera,
  width: number,
  height: number,
  now: number,
): void {
  const point = worldToScreen(x + 0.5, y + 0.5, camera, width, height);
  const color = SIGNAL_COLORS[kind];
  const pulse = (Math.sin(now / 180) + 1) / 2;
  context.globalAlpha = 0.65 + pulse * 0.25;
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(point.x, point.y, 10 + pulse * 5, 0, Math.PI * 2);
  context.stroke();
  drawCursorMark(context, point.x, point.y, color);

  context.font = '600 10px Inter, "Noto Sans SC", "Microsoft YaHei", sans-serif';
  const label = PING_LABELS[kind];
  const labelWidth = context.measureText(label).width + 14;
  const labelX = clamp(point.x + 12, 6, Math.max(6, width - labelWidth - 6));
  const labelY = clamp(point.y - 30, 6, Math.max(6, height - 23));
  context.globalAlpha = 0.92;
  context.fillStyle = 'rgba(6, 15, 17, 0.9)';
  context.beginPath();
  context.roundRect(labelX, labelY, labelWidth, 22, 4);
  context.fill();
  context.strokeStyle = color;
  context.stroke();
  context.fillStyle = '#f2faf7';
  context.fillText(label, labelX + 7, labelY + 15);
  context.globalAlpha = 1;
}

function drawPatternOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  patternId: PatternId,
  rotation: number,
  flipped: boolean,
  camera: Camera,
  width: number,
  height: number,
  color: string,
  alpha: number,
): void {
  drawCellsOutline(context, x, y, transformPattern(patternId, rotation, flipped), camera, width, height, color, alpha);
}

function drawCellsOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  cells: readonly { x: number; y: number }[],
  camera: Camera,
  width: number,
  height: number,
  color: string,
  alpha: number,
): void {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.strokeStyle = '#f7fffc';
  context.lineWidth = 1;
  for (const cell of cells) {
    const cellX = x + cell.x;
    const cellY = y + cell.y;
    if (!isWorldCoordinate(cellX, cellY)) continue;
    const point = worldToScreen(cellX, cellY, camera, width, height);
    const size = Math.max(2, camera.zoom);
    context.fillRect(point.x, point.y, size, size);
    if (camera.zoom >= 5) context.strokeRect(point.x + 0.5, point.y + 0.5, size - 1, size - 1);
  }
  context.globalAlpha = 1;
}

function drawEraseOutline(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  brushSize: number,
  camera: Camera,
  width: number,
  height: number,
  color: string,
  alpha: number,
): void {
  const radius = brushSize - 1;
  context.globalAlpha = alpha;
  context.fillStyle = color;
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const cellX = x + offsetX;
      const cellY = y + offsetY;
      if (!isWorldCoordinate(cellX, cellY)) continue;
      const point = worldToScreen(cellX, cellY, camera, width, height);
      context.fillRect(point.x, point.y, Math.max(2, camera.zoom), Math.max(2, camera.zoom));
    }
  }
  context.globalAlpha = 1;
}

function drawCursorMark(context: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x - 8, y);
  context.lineTo(x + 8, y);
  context.moveTo(x, y - 8);
  context.lineTo(x, y + 8);
  context.stroke();
  context.fillStyle = color;
  context.fillRect(x - 2, y - 2, 4, 4);
}

function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  const characters = Array.from(text);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (context.measureText(`${characters.slice(0, middle).join('')}…`).width <= maxWidth) low = middle;
    else high = middle - 1;
  }
  return `${characters.slice(0, low).join('')}…`;
}

function worldToScreen(x: number, y: number, camera: Camera, width: number, height: number): PointerPosition {
  return {
    x: width / 2 + (x - camera.x) * camera.zoom,
    y: height / 2 + (y - camera.y) * camera.zoom,
  };
}

function minimumZoom(width: number, height: number): number {
  return Math.max(0.3, Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT) * 0.72);
}

function clampCameraTarget(camera: Camera, width: number, height: number): void {
  camera.targetX = clampCameraAxis(camera.targetX, width, WORLD_WIDTH, camera.targetZoom);
  camera.targetY = clampCameraAxis(camera.targetY, height, WORLD_HEIGHT, camera.targetZoom);
}

function clampCamera(camera: Camera, width: number, height: number): void {
  camera.x = clampCameraAxis(camera.x, width, WORLD_WIDTH, camera.zoom);
  camera.y = clampCameraAxis(camera.y, height, WORLD_HEIGHT, camera.zoom);
}

function clampCameraAxis(value: number, viewportSize: number, worldSize: number, zoom: number): number {
  const visibleHalf = viewportSize / (2 * zoom);
  if (visibleHalf >= worldSize / 2) return worldSize / 2;
  return clamp(value, visibleHalf, worldSize - visibleHalf);
}

function isWorldCoordinate(x: number, y: number): boolean {
  return x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function distance(first: PointerPosition, second: PointerPosition): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function hexToRgb(value: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/iu.test(value) ? value.slice(1) : 'a8b4ad';
  return [Number.parseInt(normalized.slice(0, 2), 16), Number.parseInt(normalized.slice(2, 4), 16), Number.parseInt(normalized.slice(4, 6), 16)];
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}

function rebuildSelfHighlight(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, model: WorldModel, ownerId: number, color: string): void {
  const scale = 4;
  const width = WORLD_WIDTH * scale;
  const height = WORLD_HEIGHT * scale;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, width, height);
  if (ownerId <= 0) return;
  context.globalAlpha = 0.72;
  context.strokeStyle = color;
  context.fillStyle = 'rgba(255, 255, 255, 0.2)';
  context.lineWidth = 0.8;
  for (let index = 0; index < model.owners.length; index += 1) {
    if (model.owners[index] !== ownerId) continue;
    const x = index % WORLD_WIDTH;
    const y = Math.floor(index / WORLD_WIDTH);
    const left = x * scale;
    const top = y * scale;
    context.fillRect(left + 1, top + 1, scale - 2, scale - 2);
    context.strokeRect(left + 0.5, top + 0.5, scale - 1, scale - 1);
  }
  context.globalAlpha = 1;
  context.fillStyle = '#f5fffc';
  for (let index = 0; index < model.owners.length; index += 1) {
    if (model.owners[index] !== ownerId) continue;
    const x = index % WORLD_WIDTH;
    const y = Math.floor(index / WORLD_WIDTH);
    const left = x * scale;
    const top = y * scale;
    if (x === 0 || model.owners[index - 1] !== ownerId) context.fillRect(left, top, 1, scale);
    if (x === WORLD_WIDTH - 1 || model.owners[index + 1] !== ownerId) context.fillRect(left + scale - 1, top, 1, scale);
    if (y === 0 || model.owners[index - WORLD_WIDTH] !== ownerId) context.fillRect(left, top, scale, 1);
    if (y === WORLD_HEIGHT - 1 || model.owners[index + WORLD_WIDTH] !== ownerId) context.fillRect(left, top + scale - 1, scale, 1);
  }
}
