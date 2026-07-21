import type { GSS0ModuleCatalogEntry, GSS0ModuleId } from './module-catalog.js';

export interface GSS0ProgressionSegment {
  module?: GSS0ModuleId | null;
  moduleLevel?: number;
  neutral?: boolean;
  experienceTier?: number;
}

export interface GSS0UpgradePreview {
  readonly kind: 'new' | 'upgrade';
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly levelLabel: string;
  readonly lines: readonly { readonly label: string; readonly text: string }[];
}

export interface GSS0ModuleCurrentEffect {
  readonly level: number;
  readonly levelLabel: string;
  readonly lines: readonly { readonly label: string; readonly text: string }[];
}

export interface GSS0ModuleProgressionApi {
  readonly maxModuleLevel: number;
  readonly compressionBase: number;
  readonly slotUnlockLevels: readonly number[];
  readonly experienceTiers: readonly { readonly tier: number; readonly value: number; readonly color: string; readonly accent: string; readonly name: string }[];
  readonly effects: Record<string, (...args: number[]) => number>;
  moduleLevel(segment: GSS0ProgressionSegment): number;
  moduleLevelsFromSegments(segments: readonly GSS0ProgressionSegment[]): Record<string, number>;
  moduleSlotCapacity(playerLevel: number): number;
  baseCooldownSeconds(moduleId: GSS0ModuleId): number;
  activeCooldownSeconds(moduleId: GSS0ModuleId, level?: number, cooldownRateBonus?: number): number;
  experienceTier(tier: number): { readonly tier: number; readonly value: number; readonly color: string; readonly accent: string; readonly name: string };
  experienceValue(tier: number): number;
  findCompressionIndexes(segments: readonly GSS0ProgressionSegment[], tier: number): number[];
  rollLinearRewards(amount: number, random?: () => number): number;
  moduleCurrentEffect(moduleId: GSS0ModuleId, level?: number): GSS0ModuleCurrentEffect;
  moduleUpgradePreview(moduleId: GSS0ModuleId, currentLevel?: number): GSS0UpgradePreview;
  chooseUpgradeIds(
    availableModules: readonly GSS0ModuleCatalogEntry[],
    segments: readonly GSS0ProgressionSegment[],
    playerLevel: number,
    random?: () => number,
    count?: number
  ): GSS0ModuleId[];
  chooseAutomaticUpgradeIds(
    availableModules: readonly GSS0ModuleCatalogEntry[],
    segments: readonly GSS0ProgressionSegment[],
    playerLevel: number,
    random?: () => number,
    count?: number
  ): GSS0ModuleId[];
}

declare global {
  var GSS0ModuleProgression: GSS0ModuleProgressionApi;
}
