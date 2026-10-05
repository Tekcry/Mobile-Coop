import type { AudioEngine } from './audioEngine';

/** Minor-key chord loop (semitones from A2). */
const CHORDS = [
  [0, 3, 7, 10],
  [-4, 0, 3, 7],
  [-2, 2, 5, 9],
  [-7, -3, 0, 5],
];
const A2 = 110;
const st = (n: number): number => A2 * Math.pow(2, n / 12);

/**
 * Procedural music: a pad bed (menus and calm moments) plus a combat layer (bass pulse + hats)
 * whose level follows `intensity`. Scheduled ahead with a lookahead timer.
 */
export class Music {
  private padBus: GainNode | null = null;
  private combatBus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBar = 0;
  private bar = 0;
  private bpm = 96;
  intensity = 0;
  private out: GainNode | null = null;

  constructor(private a: AudioEngine) {}

  start(): void {
    if (this.timer) return;
    this.a.whenReady(() => {
      const ctx = this.a.ctx!;
      // persistent bus node (music bus via engine.out with very long duration)
      this.out = this.a.out('music', 1, 0, Infinity);
      if (!this.out) return;
      this.padBus = ctx.createGain();
      this.padBus.gain.value = 0.35;
      this.combatBus = ctx.createGain();
      this.combatBus.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      this.padBus.connect(lp).connect(this.out);
      this.combatBus.connect(this.out);
      this.nextBar = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 200);
    });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
    const ctx = this.a.ctx;
    if (!ctx || !this.combatBus || !this.padBus) return;
    this.combatBus.gain.setTargetAtTime(this.intensity * 0.5, ctx.currentTime, 1.5);
    this.padBus.gain.setTargetAtTime(0.35 - this.intensity * 0.15, ctx.currentTime, 1.5);
  }

  private schedule(): void {
    const ctx = this.a.ctx;
    if (!ctx || ctx.state !== 'running' || !this.padBus || !this.combatBus) return;
    const barLen = (60 / this.bpm) * 4;
    while (this.nextBar < ctx.currentTime + 1.0) {
      const chord = CHORDS[this.bar % CHORDS.length]!;
      this.pad(this.nextBar, barLen, chord);
      if (this.intensity > 0.05) this.combat(this.nextBar, barLen, chord[0]!);
      this.nextBar += barLen;
      this.bar++;
    }
  }

  private pad(t: number, len: number, chord: number[]): void {
    const ctx = this.a.ctx!;
    for (const n of chord) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = st(n + 12);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.03, t + len * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len * 1.05);
        o.connect(g).connect(this.padBus!);
        o.start(t);
        o.stop(t + len * 1.1);
      }
    }
  }

  private combat(t: number, len: number, root: number): void {
    const ctx = this.a.ctx!;
    const beat = len / 4;
    for (let i = 0; i < 8; i++) {
      const tt = t + (i * beat) / 2;
      // bass pulse on eighths
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = st(root - 12 + (i === 6 ? 7 : 0));
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.12, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + beat * 0.45);
      o.connect(f).connect(g).connect(this.combatBus!);
      o.start(tt);
      o.stop(tt + beat * 0.5);
      // hats
      const n = this.a.noise();
      if (!n) continue;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7000;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(0.0001, tt);
      hg.gain.exponentialRampToValueAtTime(i % 2 ? 0.05 : 0.025, tt + 0.003);
      hg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      n.connect(hp).connect(hg).connect(this.combatBus!);
      n.start(tt);
      n.stop(tt + 0.06);
      // kick on beats
      if (i % 2 === 0) {
        const k = ctx.createOscillator();
        k.type = 'sine';
        k.frequency.setValueAtTime(120, tt);
        k.frequency.exponentialRampToValueAtTime(40, tt + 0.15);
        const kg = ctx.createGain();
        kg.gain.setValueAtTime(0.25, tt);
        kg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.2);
        k.connect(kg).connect(this.combatBus!);
        k.start(tt);
        k.stop(tt + 0.22);
      }
    }
  }
}
