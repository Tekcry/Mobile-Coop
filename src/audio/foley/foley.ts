/**
 * Plays the movement foley: the CC0 sprite (`src/assets/sfx/foley.mp3`, bundled, decoded once when audio starts)
 * through plans from `FoleyPlanner`. Until the sprite is decoded (or if it fails) the calls return false and the
 * caller falls back to the synthesised steps (`Sfx.footstep`).
 *
 * Cosmetic only: nothing in gameplay reads it (guards hear the noise model).
 */
import type { Surface } from '../../world/surfaces';
import type { AudioEngine } from '../audioEngine';
import { Rng } from '../music/rng';
import index from '../../assets/sfx/foley.json';
import spriteUrl from '../../assets/sfx/foley.mp3?url';
import { alignShift, type FoleyIndex } from './sprite';
import { FoleyPlanner, newPlan, type FoleyLanding, type FoleyMove, type FoleyPlan, type Gait } from './steps';

const INDEX = index as unknown as FoleyIndex;

export interface FoleyStats {
  loaded: boolean;
  failed: boolean;
  steps: number;
  landings: number;
  moves: number;
  /** Layers started in all. */
  layers: number;
  /** Decoder shift found at load (s). */
  shift: number;
  decodeMs: number;
}

export class Foley {
  private buf: AudioBuffer | null = null;
  private shift = 0;
  private planner = new FoleyPlanner(INDEX, new Rng((Date.now() ^ 0x5eed) >>> 0));
  private plan = newPlan();
  readonly stats: FoleyStats = { loaded: false, failed: false, steps: 0, landings: 0, moves: 0, layers: 0, shift: 0, decodeMs: 0 };

  constructor(private a: AudioEngine) {
    a.whenReady(() => void this.load());
  }

  get ready(): boolean {
    return this.buf !== null && this.a.running;
  }

  private async load(): Promise<void> {
    const ctx = this.a.ctx;
    if (!ctx || this.buf) return;
    const t0 = performance.now();
    try {
      const data = await (await fetch(spriteUrl)).arrayBuffer();
      const buf = await ctx.decodeAudioData(data);
      this.shift = alignShift(buf.getChannelData(0), buf.sampleRate, INDEX);
      this.buf = buf;
      this.stats.loaded = true;
      this.stats.shift = this.shift;
      this.stats.decodeMs = Math.round(performance.now() - t0);
    } catch {
      this.stats.failed = true;
    }
  }

  /** A foot plant. Returns false when the sprite is not ready (play the synth step instead). */
  step(surface: Surface, gait: Gait, speed: number, side: number, scale = 1): boolean {
    if (!this.ready || !this.a.allow(side < 0 ? 'foley-l' : 'foley-r', 0.09)) return this.ready;
    this.play(this.planner.step(this.plan, surface, gait, speed, side, scale));
    this.stats.steps++;
    return true;
  }

  landing(surface: Surface, kind: FoleyLanding): boolean {
    if (!this.ready || !this.a.allow('foley-land', 0.15)) return this.ready;
    this.play(this.planner.landing(this.plan, surface, kind));
    this.stats.landings++;
    return true;
  }

  move(surface: Surface, kind: FoleyMove, dur: number): boolean {
    if (!this.ready || !this.a.allow('foley-move', 0.2)) return this.ready;
    this.play(this.planner.move(this.plan, surface, kind, dur));
    this.stats.moves++;
    return true;
  }

  private play(plan: FoleyPlan): void {
    const ctx = this.a.ctx;
    const buf = this.buf;
    if (!ctx || !buf) return;
    const now = ctx.currentTime + 0.005;
    for (let i = 0; i < plan.n; i++) {
      const L = plan.layers[i]!;
      const take = INDEX.banks[L.bank][L.take];
      if (!take || L.dur <= 0) continue;
      const t = now + L.at;
      const out = this.a.out('sfx', L.gain, L.pan, L.at + L.dur + 0.05);
      if (!out) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = L.rate;
      // envelope: optional fade in, a short fade out at the end so a cut never clicks
      const env = ctx.createGain();
      const fade = Math.min(0.025, L.dur * 0.3);
      env.gain.setValueAtTime(L.fadeIn > 0 ? 0 : 1, t);
      if (L.fadeIn > 0) env.gain.linearRampToValueAtTime(1, t + L.fadeIn);
      env.gain.setValueAtTime(1, t + L.dur - fade);
      env.gain.linearRampToValueAtTime(0, t + L.dur);
      if (L.lowpass > 0) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = L.lowpass;
        f.Q.value = 0.5;
        src.connect(f).connect(env).connect(out);
      } else src.connect(env).connect(out);
      src.start(t, Math.max(0, take[0] + this.shift + L.offset));
      src.stop(t + L.dur + 0.01);
      this.stats.layers++;
    }
  }
}
