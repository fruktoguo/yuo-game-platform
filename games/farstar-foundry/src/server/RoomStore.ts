import { AtomicGzipJsonStore } from '@yuo-platform/persistence';
import type { ActivityEntry, ChatMessage, RoomPhase } from '../shared/protocol';
import { isFactoryState, migrateFactoryState, type FactoryState } from './FactoryEngine';

export interface StoredRoomMember {
  accountId: string;
  name: string;
  joinedAt: number;
  lastSeenAt: number;
}

export interface StoredRoom {
  code: string;
  name: string;
  hostId: string;
  passwordHash: string | null;
  maxPlayers: number;
  phase: RoomPhase;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  members: StoredRoomMember[];
  factory: FactoryState | null;
  activity: ActivityEntry[];
  messages: ChatMessage[];
}

export interface StoredFoundryState {
  version: 1;
  savedAt: number;
  rooms: StoredRoom[];
}

export class RoomStore {
  private readonly store: AtomicGzipJsonStore<StoredFoundryState>;

  constructor(path: string) {
    this.store = new AtomicGzipJsonStore(path, { validate: isStoredFoundryState });
  }

  async load(): Promise<StoredFoundryState | null> {
    const state = await this.store.load();
    if (!state) return null;
    return {
      ...state,
      rooms: state.rooms.map((room) => ({
        ...room,
        factory: room.factory ? migrateFactoryState(room.factory) : null,
      })),
    };
  }

  save(rooms: StoredRoom[], now = Date.now()): Promise<void> {
    return this.store.save({ version: 1, savedAt: now, rooms });
  }
}

export function isStoredFoundryState(value: unknown): value is StoredFoundryState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredFoundryState>;
  return candidate.version === 1
    && isTimestamp(candidate.savedAt)
    && Array.isArray(candidate.rooms)
    && candidate.rooms.every(isStoredRoom);
}

function isStoredRoom(value: unknown): value is StoredRoom {
  if (!value || typeof value !== 'object') return false;
  const room = value as Partial<StoredRoom>;
  return typeof room.code === 'string'
    && /^[A-Z2-9]{6}$/.test(room.code)
    && typeof room.name === 'string'
    && typeof room.hostId === 'string'
    && (room.passwordHash === null || typeof room.passwordHash === 'string')
    && (room.maxPlayers === 2 || room.maxPlayers === 4 || room.maxPlayers === 6)
    && (room.phase === 'waiting' || room.phase === 'running' || room.phase === 'completed')
    && isTimestamp(room.createdAt)
    && isTimestamp(room.updatedAt)
    && (room.startedAt === null || isTimestamp(room.startedAt))
    && Array.isArray(room.members)
    && room.members.every(isStoredMember)
    && (room.factory === null || isFactoryState(room.factory))
    && Array.isArray(room.activity)
    && Array.isArray(room.messages)
    && room.members.some((member) => member.accountId === room.hostId)
    && (room.phase === 'waiting' ? room.factory === null : room.factory !== null);
}

function isStoredMember(value: unknown): value is StoredRoomMember {
  if (!value || typeof value !== 'object') return false;
  const member = value as Partial<StoredRoomMember>;
  return typeof member.accountId === 'string'
    && typeof member.name === 'string'
    && isTimestamp(member.joinedAt)
    && isTimestamp(member.lastSeenAt);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
