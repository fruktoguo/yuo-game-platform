import type { GameEvent } from '../../shared/protocol';

export class GameAudio {
  private context: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async unlock(): Promise<void> {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }

  play(event: GameEvent): void {
    if (!this.enabled) return;
    void this.unlock().then(() => {
      if (!this.context) return;
      if (event.type === 'collision') this.click(190 + (event.intensity ?? 0.4) * 130, 0.045, 0.12 * (event.intensity ?? 0.4));
      if (event.type === 'cushion') this.click(115, 0.035, 0.06 * (event.intensity ?? 0.3));
      if (event.type === 'shot') this.click(145, 0.07, 0.13);
      if (event.type === 'pocket') this.pocket();
      if (event.type === 'win') this.win();
    }).catch(() => undefined);
  }

  close(): void {
    void this.context?.close();
    this.context = null;
  }

  private click(frequency: number, duration: number, volume: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.58), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private pocket(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * 0.24), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (data.length * 0.18));
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now);
    this.click(88, 0.18, 0.1);
  }

  private win(): void {
    if (!this.context) return;
    [261.6, 329.6, 392, 523.2].forEach((frequency, index) => {
      window.setTimeout(() => this.click(frequency, 0.28, 0.09), index * 110);
    });
  }
}
