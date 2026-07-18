import { decodeWorldPatch, decodeWorldSnapshot, type CellPatch } from '../../shared/binary';
import { playerColorForOwner } from '../../shared/colors';
import { NEUTRAL_OWNER_ID, WORLD_CELL_COUNT, WORLD_HEIGHT, WORLD_WIDTH } from '../../shared/constants';
import type { CursorView, PlayerColorView, WorldEvent } from '../../shared/protocol';

export interface VisualCellChange extends CellPatch {
  previousOwnerId: number;
}

export interface WorldModelUpdate {
  full: boolean;
  tick: number;
  changes: VisualCellChange[];
}

type WorldListener = (update: WorldModelUpdate) => void;

export class WorldModel {
  owners: Uint16Array<ArrayBufferLike> = new Uint16Array(WORLD_CELL_COUNT);
  ages: Uint8Array<ArrayBufferLike> = new Uint8Array(WORLD_CELL_COUNT);
  tick = 0;
  readonly width = WORLD_WIDTH;
  readonly height = WORLD_HEIGHT;
  private readonly listeners = new Set<WorldListener>();
  private readonly playerColors = new Map<number, string>();
  private readonly cursors = new Map<number, CursorView>();
  private readonly mapEvents: WorldEvent[] = [];

  subscribe(listener: WorldListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  applySnapshot(value: unknown): void {
    const snapshot = decodeWorldSnapshot(toArrayBuffer(value));
    if (snapshot.width !== WORLD_WIDTH || snapshot.height !== WORLD_HEIGHT) throw new Error('服务器世界尺寸与客户端不一致');
    this.owners = snapshot.owners;
    this.ages = snapshot.ages;
    this.tick = snapshot.tick;
    this.notify({ full: true, tick: this.tick, changes: [] });
  }

  applyPatch(value: unknown): 'applied' | 'gap' {
    const patch = decodeWorldPatch(toArrayBuffer(value));
    if (patch.tick < this.tick || patch.tick > this.tick + 1) return 'gap';
    const changes: VisualCellChange[] = [];
    for (const change of patch.changes) {
      if (change.index < 0 || change.index >= this.owners.length) continue;
      const previousOwnerId = this.owners[change.index];
      this.owners[change.index] = change.ownerId;
      this.ages[change.index] = change.age;
      changes.push({ ...change, previousOwnerId });
    }
    this.tick = Math.max(this.tick, patch.tick);
    this.notify({ full: false, tick: this.tick, changes });
    return 'applied';
  }

  colorFor(ownerId: number): string {
    if (ownerId === 0) return '#000000';
    if (ownerId === NEUTRAL_OWNER_ID) return '#a8b4ad';
    return this.playerColors.get(ownerId) ?? playerColorForOwner(ownerId);
  }

  setPlayerColors(colors: readonly PlayerColorView[]): void {
    const next = new Map(colors.map((entry) => [entry.ownerId, entry.color]));
    if (mapsEqual(this.playerColors, next)) return;
    this.playerColors.clear();
    for (const [ownerId, color] of next) this.playerColors.set(ownerId, color);
    this.notify({ full: true, tick: this.tick, changes: [] });
  }

  setPlayerColor(ownerId: number, color: string): void {
    if (this.playerColors.get(ownerId) === color) return;
    this.playerColors.set(ownerId, color);
    this.notify({ full: true, tick: this.tick, changes: [] });
  }

  replaceCursors(cursors: CursorView[]): void {
    this.cursors.clear();
    for (const cursor of cursors) this.cursors.set(cursor.ownerId, cursor);
  }

  setCursor(cursor: CursorView): void {
    this.cursors.set(cursor.ownerId, cursor);
  }

  removeCursor(ownerId: number): void {
    this.cursors.delete(ownerId);
  }

  getCursors(): readonly CursorView[] {
    return [...this.cursors.values()];
  }

  addMapEvent(event: WorldEvent): void {
    if (event.x === undefined || event.y === undefined) return;
    this.mapEvents.push(event);
    if (this.mapEvents.length > 30) this.mapEvents.splice(0, this.mapEvents.length - 30);
  }

  getMapEvents(now = Date.now()): readonly WorldEvent[] {
    while (this.mapEvents.length > 0 && now - this.mapEvents[0].at > 5_000) this.mapEvents.shift();
    return this.mapEvents;
  }

  private notify(update: WorldModelUpdate): void {
    for (const listener of this.listeners) listener(update);
  }
}

function mapsEqual(first: ReadonlyMap<number, string>, second: ReadonlyMap<number, string>): boolean {
  if (first.size !== second.size) return false;
  for (const [ownerId, color] of first) if (second.get(ownerId) !== color) return false;
  return true;
}

export function toArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  }
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as { data: unknown }).data)) {
    return Uint8Array.from((value as { data: number[] }).data).buffer;
  }
  throw new Error('收到无法识别的二进制数据');
}
