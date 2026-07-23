import { AtomicGzipJsonStore } from '@yuo-platform/persistence';
import { PROFILE_STORE_VERSION } from '../shared/constants';
import type { UltraProfileView } from '../shared/protocol';
import type { RunSummaryPayload } from '../shared/roomProtocol';

interface StoredProfile extends UltraProfileView {
  accountId: string;
  updatedAt: number;
}

interface LegacyStoredProfile {
  accountId: string;
  bestScore: number;
  bestLength: number;
  totalKills: number;
  gamesPlayed: number;
  totalFood: number;
  updatedAt: number;
}

type StoredProfileState =
  | { version: 1; profiles: LegacyStoredProfile[] }
  | { version: typeof PROFILE_STORE_VERSION; profiles: StoredProfile[] };

export interface ProfileUpdate {
  profile: UltraProfileView;
  brokeScoreRecord: boolean;
  brokeLevelRecord: boolean;
  brokeSurvivalRecord: boolean;
}

export interface ProfileRunResult extends RunSummaryPayload {
  accountId: string;
  entityId: number;
  name: string;
}

const EMPTY_PROFILE: UltraProfileView = {
  bestScore: 0,
  bestLevel: 0,
  bestSurvivalTime: 0,
  totalKills: 0,
  totalBotKills: 0,
  totalPvpKills: 0,
  gamesPlayed: 0,
};

export class SnakeProfileStore {
  private readonly store: AtomicGzipJsonStore<StoredProfileState>;
  private readonly profiles = new Map<string, StoredProfile>();

  private constructor(path: string) {
    this.store = new AtomicGzipJsonStore(path, { validate: isStoredProfileState });
  }

  static async open(path: string): Promise<SnakeProfileStore> {
    const profileStore = new SnakeProfileStore(path);
    const stored = await profileStore.store.load();
    if (stored?.version === 1) {
      for (const legacy of stored.profiles) {
        profileStore.profiles.set(legacy.accountId, {
          accountId: legacy.accountId,
          bestScore: legacy.bestScore,
          bestLevel: 0,
          bestSurvivalTime: 0,
          totalKills: legacy.totalKills,
          totalBotKills: legacy.totalKills,
          totalPvpKills: 0,
          gamesPlayed: legacy.gamesPlayed,
          updatedAt: legacy.updatedAt,
        });
      }
    } else {
      for (const profile of stored?.profiles ?? []) profileStore.profiles.set(profile.accountId, profile);
    }
    return profileStore;
  }

  get(accountId: string): UltraProfileView {
    const profile = this.profiles.get(accountId);
    return profile ? toView(profile) : { ...EMPTY_PROFILE };
  }

  recordRun(result: ProfileRunResult, now = Date.now()): ProfileUpdate {
    const previous = this.profiles.get(result.accountId);
    const current: StoredProfile = {
      accountId: result.accountId,
      bestScore: Math.max(previous?.bestScore ?? 0, result.score),
      bestLevel: Math.max(previous?.bestLevel ?? 0, result.level),
      bestSurvivalTime: Math.max(previous?.bestSurvivalTime ?? 0, result.survivalTime),
      totalKills: safeAdd(previous?.totalKills ?? 0, result.kills),
      totalBotKills: safeAdd(previous?.totalBotKills ?? 0, result.botKills),
      totalPvpKills: safeAdd(previous?.totalPvpKills ?? 0, result.pvpKills),
      gamesPlayed: safeAdd(previous?.gamesPlayed ?? 0, 1),
      updatedAt: now,
    };
    this.profiles.set(result.accountId, current);
    return {
      profile: toView(current),
      brokeScoreRecord: result.score > (previous?.bestScore ?? 0),
      brokeLevelRecord: result.level > (previous?.bestLevel ?? 0),
      brokeSurvivalRecord: result.survivalTime > (previous?.bestSurvivalTime ?? 0),
    };
  }

  save(): Promise<void> {
    return this.store.save({ version: PROFILE_STORE_VERSION, profiles: [...this.profiles.values()].map((profile) => ({ ...profile })) });
  }
}

function toView(profile: StoredProfile): UltraProfileView {
  return {
    bestScore: profile.bestScore,
    bestLevel: profile.bestLevel,
    bestSurvivalTime: profile.bestSurvivalTime,
    totalKills: profile.totalKills,
    totalBotKills: profile.totalBotKills,
    totalPvpKills: profile.totalPvpKills,
    gamesPlayed: profile.gamesPlayed,
  };
}

function safeAdd(left: number, right: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, left + right);
}

function isStoredProfileState(value: unknown): value is StoredProfileState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredProfileState>;
  if (!Array.isArray(candidate.profiles)) return false;
  if (candidate.version === 1) return candidate.profiles.every(isLegacyProfile);
  return candidate.version === PROFILE_STORE_VERSION && candidate.profiles.every(isStoredProfile);
}

function isLegacyProfile(value: unknown): value is LegacyStoredProfile {
  if (!isProfileIdentity(value)) return false;
  const candidate = value as Partial<LegacyStoredProfile>;
  return isNonNegativeSafeInteger(candidate.bestScore)
    && isNonNegativeSafeInteger(candidate.bestLength)
    && isNonNegativeSafeInteger(candidate.totalKills)
    && isNonNegativeSafeInteger(candidate.gamesPlayed)
    && isNonNegativeSafeInteger(candidate.totalFood)
    && isNonNegativeSafeInteger(candidate.updatedAt);
}

function isStoredProfile(value: unknown): value is StoredProfile {
  if (!isProfileIdentity(value)) return false;
  const candidate = value as Partial<StoredProfile>;
  return isNonNegativeSafeInteger(candidate.bestScore)
    && isNonNegativeSafeInteger(candidate.bestLevel)
    && isFiniteNonNegative(candidate.bestSurvivalTime)
    && isNonNegativeSafeInteger(candidate.totalKills)
    && isNonNegativeSafeInteger(candidate.totalBotKills)
    && isNonNegativeSafeInteger(candidate.totalPvpKills)
    && isNonNegativeSafeInteger(candidate.gamesPlayed)
    && isNonNegativeSafeInteger(candidate.updatedAt);
}

function isProfileIdentity(value: unknown): value is { accountId: string } {
  if (!value || typeof value !== 'object') return false;
  const accountId = (value as { accountId?: unknown }).accountId;
  return typeof accountId === 'string' && accountId.length > 0 && accountId.length <= 128;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isFiniteNonNegative(value: unknown): value is number {
  return Number.isFinite(value) && (value as number) >= 0;
}
