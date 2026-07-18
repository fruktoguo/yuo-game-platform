import type { UltraSoundKind } from '../../shared/protocol';

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export class UltraAudio {
  private context: AudioContext | null = null;
  private nextEatToneAt = 0;
  private readonly lastSoundAt: Partial<Record<UltraSoundKind, number>> = {};
  private volume = loadSetting('ultra-snake-volume', 0.5, 0, 1);

  ensure(): void {
    if (!this.context) {
      const AudioConstructor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (AudioConstructor) this.context = new AudioConstructor();
    }
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  setVolume(value: number): void {
    this.volume = clamp(value, 0, 1);
    saveSetting('ultra-snake-volume', this.volume);
  }

  getVolume(): number {
    return this.volume;
  }

  play(kind: UltraSoundKind, detail = 0): void {
    const context = this.context;
    if (!context || this.volume <= 0) return;
    if (context.state === 'suspended') void context.resume();
    if (kind === 'eat') {
      this.playEatScaleTone(Math.max(1, detail));
      return;
    }
    const cooldowns: Partial<Record<UltraSoundKind, number>> = { shoot: 45, skill: 65, frost: 70, electric: 75, hit: 48, foodSpawn: 70, bounce: 90, ui: 70 };
    const wallTime = performance.now();
    const cooldown = cooldowns[kind] ?? 0;
    if (cooldown && wallTime - (this.lastSoundAt[kind] ?? 0) < cooldown) return;
    this.lastSoundAt[kind] = wallTime;

    const settings: Partial<Record<UltraSoundKind, [number, number, number, OscillatorType, number, number?]>> = {
      ui: [620, 760, 0.055, 'sine', 0.018],
      start: [220, 440, 0.12, 'triangle', 0.05, 660],
      pause: [360, 210, 0.09, 'sine', 0.024],
      resume: [260, 540, 0.1, 'triangle', 0.026],
      foodSpawn: [310, 760, 0.1, 'sine', 0.024, 980],
      enemyWarning: [620, 190, 0.24, 'square', 0.026, 105],
      enemySpawn: [115, 430, 0.2, 'sawtooth', 0.04, 620],
      bounce: [135, 310, 0.16, 'square', 0.04, 72],
      shoot: [980, 430, 0.055, 'square', 0.012],
      skill: [420, 820, 0.1, 'triangle', 0.024],
      frost: [920, 1260, 0.13, 'sine', 0.022, 1510],
      electric: [110, 930, 0.11, 'square', 0.026],
      nova: [190, 680, 0.18, 'sawtooth', 0.03, 1020],
      laser: [1380, 360, 0.12, 'sawtooth', 0.021],
      mine: [170, 95, 0.14, 'square', 0.026],
      pulse: [310, 90, 0.2, 'sine', 0.034],
      regen: [410, 760, 0.24, 'sine', 0.028, 980],
      hit: [150, 90, 0.08, 'square', 0.025],
      kill: [180, 560, 0.18, 'sawtooth', 0.045, 840],
      level: [330, 880, 0.3, 'triangle', 0.06, 1320],
      select: [480, 760, 0.13, 'sine', 0.042],
      shield: [760, 240, 0.2, 'sine', 0.05, 1040],
      death: [170, 45, 0.48, 'sawtooth', 0.065, 75],
    };
    const setting = settings[kind];
    if (!setting) return;
    const [from, to, duration, type, baseVolume, accent] = setting;
    const now = context.currentTime;
    const volume = baseVolume * (this.volume / 0.5);
    createTone(context, from, to, duration, type, volume, now);
    if (accent) createTone(context, accent, Math.max(20, accent * 0.84), duration * 0.88, type === 'square' ? 'triangle' : 'sine', volume * 0.45, now + duration * 0.12);
  }

  private playEatScaleTone(stage: number): void {
    const context = this.context;
    if (!context) return;
    const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];
    const frequency = 523.25 * Math.pow(2, scale[clamp(Math.round(stage) - 1, 0, scale.length - 1)] / 12);
    const now = Math.max(context.currentTime, this.nextEatToneAt);
    const duration = 0.24;
    const volume = 0.052 * (this.volume / 0.5);
    this.nextEatToneAt = now + 0.055;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);

    const sparkle = context.createOscillator();
    const sparkleGain = context.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(frequency * 2, now + 0.012);
    sparkleGain.gain.setValueAtTime(volume * 0.28, now + 0.012);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.72);
    sparkle.connect(sparkleGain).connect(context.destination);
    sparkle.start(now + 0.012);
    sparkle.stop(now + duration * 0.72);
  }
}

function createTone(context: AudioContext, from: number, to: number, duration: number, type: OscillatorType, volume: number, start: number, attack = 0): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  gain.gain.setValueAtTime(attack > 0 ? 0.0001 : volume, start);
  if (attack > 0) gain.gain.exponentialRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function loadSetting(key: string, fallback: number, minimum: number, maximum: number): number {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    const value = Number(stored);
    return Number.isFinite(value) ? clamp(value, minimum, maximum) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // 浏览器禁用存储时，音量仍在当前会话内生效。
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
