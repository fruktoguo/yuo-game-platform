import { AtomicGzipJsonStore } from '@yuo-platform/persistence';
import type { HallOfFameEntry, SeasonChallenge } from '../shared/protocol';

export interface StoredPlayer {
  ownerId: number;
  accountId: string;
  name: string;
  color: string;
  connected: boolean;
  energy: number;
  score: number;
  births: number;
  population: number;
  peakPopulation: number;
  sectors: number;
  fullyOccupiedSectors?: number;
  lastSeenAt: number;
}

interface LegacyStoredPlayer extends Omit<StoredPlayer, 'accountId'> {
  clientId: string;
}

interface StoredWorldStateBase {
  width: number;
  height: number;
  tick: number;
  nextOwnerId: number;
  ownersBase64: string;
  agesBase64: string;
  season: {
    id: number;
    startedAt: number;
    challenge: SeasonChallenge;
  };
  sectorOwners: number[];
  hallOfFame: HallOfFameEntry[];
}

export type StoredWorldState = StoredWorldStateBase & (
  | { version: 1 | 2; players: LegacyStoredPlayer[] }
  | { version: 3 | 4; players: StoredPlayer[] }
);

export class WorldStore {
  private readonly store: AtomicGzipJsonStore<StoredWorldState>;

  constructor(path: string) {
    this.store = new AtomicGzipJsonStore(path, { validate: isStoredWorldState });
  }

  async load(): Promise<StoredWorldState | null> {
    return this.store.load();
  }

  save(state: StoredWorldState): Promise<void> {
    return this.store.save(state);
  }
}

function isStoredWorldState(value: unknown): value is StoredWorldState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredWorldState>;
  return (candidate.version === 1 || candidate.version === 2 || candidate.version === 3 || candidate.version === 4)
    && Number.isInteger(candidate.width)
    && Number.isInteger(candidate.height)
    && Number.isInteger(candidate.tick)
    && typeof candidate.ownersBase64 === 'string'
    && typeof candidate.agesBase64 === 'string'
    && Array.isArray(candidate.players)
    && Boolean(candidate.season && typeof candidate.season === 'object')
    && Array.isArray(candidate.sectorOwners)
    && Array.isArray(candidate.hallOfFame);
}
