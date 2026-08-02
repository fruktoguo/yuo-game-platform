import type { GSS0ModuleCatalogEntry, GSS0ModuleId } from './module-catalog.js';

export interface GSS0ProgressionSegment {
  module?: GSS0ModuleId | null;
  moduleLevel?: number;
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
  readonly effects: Record<string, (...args: number[]) => number>;
  moduleLevelsFromSegments(segments: readonly GSS0ProgressionSegment[]): Record<string, number>;
  moduleSlotCapacity(playerLevel: number): number;
  activeCooldownSeconds(moduleId: GSS0ModuleId, level?: number, cooldownRateBonus?: number): number;
  rollLinearRewards(amount: number, random?: () => number): number;
  levelUpHealAmount(maximumHealth: number, moduleLevel: number, firstAcquisition?: boolean): number;
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
