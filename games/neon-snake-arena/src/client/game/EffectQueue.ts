import type { UltraEffect } from '../../shared/protocol';

export class EffectQueue {
  private effects: UltraEffect[] = [];

  push(effects: UltraEffect[]): void {
    this.effects.push(...effects);
    if (this.effects.length > 512) this.effects.splice(0, this.effects.length - 512);
  }

  drain(): UltraEffect[] {
    return this.effects.splice(0);
  }

  clear(): void {
    this.effects = [];
  }
}
