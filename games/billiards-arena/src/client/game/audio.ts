import type { GameEvent } from '../../shared/protocol';

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.12;
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(compressor).connect(this.context.destination);
      this.noiseBuffer = createNoiseBuffer(this.context, 0.5);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  play(event: GameEvent): void {
    if (!this.enabled) return;
    void this.unlock().then(() => {
      if (!this.context) return;
      if (event.type === 'collision') this.collision(event.intensity ?? 0.4);
      if (event.type === 'cushion') this.cushion(event.intensity ?? 0.3);
      if (event.type === 'shot') this.shot(event.intensity ?? 0.5);
      if (event.type === 'pocket') this.pocket();
      if (event.type === 'win') this.win();
    }).catch(() => undefined);
  }

  close(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, frequency * 0.62), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private noise(duration: number, volume: number, frequency: number): void {
    if (!this.context || !this.master || !this.noiseBuffer) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  private collision(intensity: number): void {
    const strength = Math.min(1, Math.max(0.08, intensity));
    this.tone(720 + strength * 260, 0.028, 0.065 + strength * 0.1, 'triangle');
    this.tone(310 + strength * 130, 0.042, 0.035 + strength * 0.055);
  }

  private cushion(intensity: number): void {
    const strength = Math.min(1, Math.max(0.05, intensity));
    this.noise(0.048, 0.035 + strength * 0.06, 280);
    this.tone(92 + strength * 28, 0.055, 0.035 + strength * 0.04, 'triangle');
  }

  private shot(intensity: number): void {
    const strength = Math.min(1, Math.max(0.05, intensity));
    this.tone(980, 0.018, 0.06 + strength * 0.05, 'triangle');
    this.tone(132, 0.065, 0.065 + strength * 0.08);
    this.noise(0.032, 0.035 + strength * 0.04, 1_150);
  }

  private pocket(): void {
    if (!this.context || !this.master || !this.noiseBuffer) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.3);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + 0.3);
    this.tone(82, 0.22, 0.09);
  }

  private win(): void {
    if (!this.context) return;
    [261.6, 329.6, 392, 523.2].forEach((frequency, index) => {
      window.setTimeout(() => this.tone(frequency, 0.28, 0.09, 'triangle'), index * 110);
    });
  }
}

function createNoiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}
