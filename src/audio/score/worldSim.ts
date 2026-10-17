import type { ScorePlayer } from './player';

/**
 * Fake gameplay sounds for the music test page, so the mix can be judged by ear: footsteps built the same way as the
 * game's (`src/audio/sfx.ts` footstep, at the game's levels), a distant guard murmur (formant-filtered buzz, no words)
 * and a noise cue (a bottle clatter). Voices and cues can duck the music.
 */

export type Surface = 'concrete' | 'metal' | 'gravel';
export type Gait = 'off' | 'crouch' | 'walk' | 'run';

export class WorldSim {
  surface: Surface = 'concrete';
  duckVoices = true;
  duckSteps = false;
  sfxGain = 1;
  private gait: Gait = 'off';
  private stepTimer = 0;
  private chatterTimer = 0;
  private noise: AudioBuffer;
  private room: ConvolverNode;
  private side = 1;

  constructor(private readonly p: ScorePlayer) {
    const ctx = p.ctx;
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a small concrete corridor for the voice
    const len = Math.round(ctx.sampleRate * 1.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.22));
    }
    this.room = ctx.createConvolver();
    this.room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.room.connect(wet).connect(p.sfxBus);
  }

  get walking(): Gait {
    return this.gait;
  }

  setGait(g: Gait): void {
    this.gait = g;
    clearTimeout(this.stepTimer);
    if (g === 'off') return;
    const interval = g === 'run' ? 0.33 : g === 'walk' ? 0.52 : 0.72;
    const step = (): void => {
      this.footstep(g === 'crouch' ? 0.5 : g === 'run' ? 1.25 : 1);
      this.stepTimer = window.setTimeout(step, interval * 1000 * (0.95 + Math.random() * 0.1));
    };
    step();
  }

  setChatter(on: boolean): void {
    clearTimeout(this.chatterTimer);
    if (!on) return;
    const next = (): void => {
      this.guardVoice();
      this.chatterTimer = window.setTimeout(next, 5000 + Math.random() * 4000);
    };
    next();
  }

  stop(): void {
    this.setGait('off');
    this.setChatter(false);
  }

  private burst(gain: number, pan: number, type: BiquadFilterType, f: number, q: number, decay: number): void {
    const ctx = this.p.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.sfxGain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.002 + decay);
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    s.connect(flt).connect(g).connect(pn).connect(this.p.sfxBus);
    s.start(t, Math.random() * 0.8);
    s.stop(t + decay + 0.05);
  }

  private tone(gain: number, pan: number, f0: number, f1: number, decay: number): void {
    const ctx = this.p.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.sfxGain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    o.connect(g).connect(pn).connect(this.p.sfxBus);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  /** The game's footstep (same filters and levels as `Sfx.footstep`). */
  footstep(gain = 1): void {
    const r = Math.random();
    this.side = -this.side;
    const pan = this.side * 0.08;
    switch (this.surface) {
      case 'metal':
        this.burst(0.09 * gain, pan, 'bandpass', 1500 + r * 400, 3, 0.07);
        this.tone(0.03 * gain, pan, 620 + r * 60, 500, 0.12);
        break;
      case 'gravel':
        this.burst(0.1 * gain, pan, 'highpass', 1800 + r * 900, 0.7, 0.09);
        break;
      default:
        this.burst(0.08 * gain, pan, 'lowpass', 500 + r * 200, 1, 0.06);
    }
    if (this.duckSteps) this.p.duck(2, 0.08, 0.25);
  }

  /**
   * A distant guard muttering a line: a buzzing glottal source with a falling pitch contour through three moving
   * formants, syllable by syllable, muffled and placed in a corridor. About 1.5-2.5 s.
   */
  guardVoice(): void {
    const ctx = this.p.ctx;
    const t0 = ctx.currentTime + 0.02;
    const syll = 6 + Math.floor(Math.random() * 6);
    const dur = syll * 0.17 + 0.2;
    const base = 100 + Math.random() * 30;
    const pan = Math.random() * 1.2 - 0.6;
    const src = ctx.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(base * 1.15, t0);
    src.frequency.linearRampToValueAtTime(base * 1.25, t0 + dur * 0.3);
    src.frequency.linearRampToValueAtTime(base * 0.85, t0 + dur);
    const env = ctx.createGain();
    env.gain.value = 0;
    const out = ctx.createGain();
    out.gain.value = 0.55 * this.sfxGain;
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 2600;
    const pn = ctx.createStereoPanner();
    pn.pan.value = pan;
    const VOWELS: [number, number, number][] = [
      [730, 1090, 2440],
      [530, 1840, 2480],
      [300, 870, 2240],
      [570, 840, 2410],
      [440, 1020, 2240],
      [660, 1720, 2410],
    ];
    const formants = [0, 1, 2].map((k) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = k === 0 ? 6 : 9;
      const g = ctx.createGain();
      g.gain.value = k === 0 ? 1 : k === 1 ? 0.6 : 0.25;
      src.connect(f).connect(g).connect(env);
      return f;
    });
    for (let s = 0; s < syll; s++) {
      const ts = t0 + 0.1 + s * 0.17 + (Math.random() - 0.5) * 0.03;
      const v = VOWELS[Math.floor(Math.random() * VOWELS.length)]!;
      formants.forEach((f, k) => f.frequency.setTargetAtTime(v[k]!, ts, 0.02));
      const peak = 0.6 + Math.random() * 0.4;
      env.gain.setTargetAtTime(peak, ts, 0.015);
      env.gain.setTargetAtTime(0.05, ts + 0.1, 0.025);
    }
    env.gain.setTargetAtTime(0, t0 + dur, 0.04);
    env.connect(muffle).connect(out).connect(pn);
    pn.connect(this.p.sfxBus);
    pn.connect(this.room);
    src.start(t0);
    src.stop(t0 + dur + 0.3);
    if (this.duckVoices) this.p.duck(6, dur, 0.5);
  }

  /** A bottle knocked over: a few glassy pings and a scrape, off to one side. */
  noiseCue(): void {
    const pan = Math.random() > 0.5 ? 0.5 : -0.5;
    this.burst(0.25, pan, 'bandpass', 3200, 1.2, 0.08);
    this.tone(0.07, pan, 2900, 2700, 0.25);
    window.setTimeout(() => this.tone(0.05, pan, 3500, 3300, 0.2), 90);
    window.setTimeout(() => this.burst(0.12, pan, 'bandpass', 2400, 2, 0.12), 180);
    window.setTimeout(() => this.tone(0.035, pan, 2600, 2500, 0.18), 260);
    if (this.duckVoices) this.p.duck(4, 0.4, 0.5);
  }
}
