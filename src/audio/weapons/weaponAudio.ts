/**
 * Plays the weapon sounds: the CC0 sprite (`src/assets/sfx/weapons.mp3`, bundled, decoded once when audio starts)
 * through plans from `WeaponPlanner`. Until the sprite is decoded (or if it fails) the calls return false and the caller
 * falls back to the synthesised sounds (`Sfx.gunshot`, `Sfx.reload`, `Sfx.dryFire`).
 *
 * The player's own shots choke each other: a new shot fades the last one's ring out after a few ms, so automatic fire
 * stays a clean rattle and only the last round rings out. Reload layers are kept so a swap can cut them.
 *
 * Cosmetic only: nothing in gameplay reads it (guards hear the noise model).
 */
import type { Surface } from '../../world/surfaces';
import type { AudioEngine } from '../audioEngine';
import { Rng } from '../music/rng';
import index from '../../assets/sfx/weapons.json';
import spriteUrl from '../../assets/sfx/weapons.mp3?url';
import { alignShift, type WeaponIndex } from './sprite';
import { gunOf, newWeaponPlan, WeaponPlanner, type WeaponPlan } from './guns';

const INDEX = index as unknown as WeaponIndex;

/** The choke: how long the last shot keeps going under the new one, and its fade (s). */
const CHOKE_HOLD = 0.03;
const CHOKE_FADE = 0.07;
/** Brass leaves the port and lands this long after the shot (s, range): about a metre's fall. */
const CASE_FALL: readonly [number, number] = [0.42, 0.6];
/** Most reload layers kept for a cut. */
const MAX_RELOAD = 12;

export interface WeaponAudioStats {
  loaded: boolean;
  failed: boolean;
  shots: number;
  suppressed: number;
  remote: number;
  /** (coop-walk-fixes P7) Remote shots played suppressed (a partner's suppressed round). */
  remoteSd: number;
  reloads: number;
  casings: number;
  dry: number;
  layers: number;
  shift: number;
  decodeMs: number;
}

export class WeaponAudio {
  private buf: AudioBuffer | null = null;
  private shift = 0;
  private rng = new Rng((Date.now() ^ 0x6a11) >>> 0);
  private planner = new WeaponPlanner(INDEX, this.rng);
  private plan: WeaponPlan = newWeaponPlan();
  /** The player's last shot (its envelope), for the choke. */
  private lastShot: GainNode | null = null;
  private readonly reloadSrcs: AudioBufferSourceNode[] = [];
  readonly stats: WeaponAudioStats = { loaded: false, failed: false, shots: 0, suppressed: 0, remote: 0, remoteSd: 0, reloads: 0, casings: 0, dry: 0, layers: 0, shift: 0, decodeMs: 0 };
  /** (map-ready S3) `whenLoaded`'s one promise, settled by `load` (true decoded, false failed). */
  private settleLoaded: (ok: boolean) => void = () => {};
  private readonly loaded = new Promise<boolean>((resolve) => (this.settleLoaded = resolve));

  constructor(private a: AudioEngine) {
    a.whenReady(() => void this.load());
  }

  get ready(): boolean {
    return this.buf !== null && this.a.running;
  }

  /** (map-ready S3) Settles when the sprite is decoded (true) or failed (false). */
  whenLoaded(): Promise<boolean> {
    return this.loaded;
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
      this.settleLoaded(true);
    } catch {
      this.stats.failed = true;
      this.settleLoaded(false);
    }
  }

  /**
   * The player's shot, with its brass on `surface` and the pump or bolt after it. Returns false when the sprite is not
   * ready (play the synth shot instead).
   */
  shot(gunId: string, suppressed: boolean, surface: Surface): boolean {
    if (!this.ready) return false;
    const ctx = this.a.ctx!;
    // the choke: the last shot's ring makes way for this one
    const prev = this.lastShot;
    if (prev) {
      const t = ctx.currentTime + CHOKE_HOLD;
      prev.gain.cancelScheduledValues(t);
      prev.gain.setValueAtTime(prev.gain.value, t);
      prev.gain.linearRampToValueAtTime(0, t + CHOKE_FADE);
    }
    this.lastShot = this.play(this.planner.shot(this.plan, gunId, suppressed), null);
    this.stats.shots++;
    if (suppressed) this.stats.suppressed++;
    const g = gunOf(gunId);
    if (g.action !== 'none') this.play(this.planner.action(this.plan, gunId, surface), null);
    else if (g.casing !== 'none') this.casing(g.casing, surface, this.rng.range(CASE_FALL[0], CASE_FALL[1]));
    return true;
  }

  /** Brass landing `at` s from now (exposed for the lab). */
  casing(kind: 'pistol' | 'rifle' | 'shell', surface: Surface, at = 0): void {
    if (!this.ready || !this.a.allow('case', 0.045)) return;
    this.play(this.planner.casing(this.plan, kind, surface, at), null);
    this.stats.casings++;
  }

  /** A guard's or teammate's shot at `dist` m (`level` and `pan` from `AudioEngine.spatial`). */
  remoteShot(gunId: string, dist: number, level: number, pan: number, suppressed = false): boolean {
    if (!this.ready) return false;
    if (!this.a.allow(`wshot-${gunId}`, 0.04)) return true;
    this.play(this.planner.shot(this.plan, gunId, suppressed, Math.max(0.5, dist), level, pan), null);
    this.stats.remote++;
    if (suppressed) this.stats.remoteSd++;
    return true;
  }

  /** The player's reload over `seconds` (`empty`: the long one with the slide or charging handle). */
  reload(gunId: string, seconds: number, empty: boolean, rounds: number): boolean {
    if (!this.ready) return false;
    this.cancelReload();
    this.play(this.planner.reload(this.plan, gunId, seconds, empty, rounds), this.reloadSrcs);
    this.stats.reloads++;
    return true;
  }

  /** A swap or a death cuts what is left of the reload. */
  cancelReload(): void {
    const ctx = this.a.ctx;
    for (let i = 0; i < this.reloadSrcs.length; i++) {
      try {
        this.reloadSrcs[i]!.stop(ctx ? ctx.currentTime + 0.01 : 0);
      } catch {
        // already ended
      }
    }
    this.reloadSrcs.length = 0;
  }

  dry(): boolean {
    if (!this.ready) return false;
    if (!this.a.allow('wdry', 0.1)) return true;
    this.play(this.planner.dry(this.plan), null);
    this.stats.dry++;
    return true;
  }

  /** Play a plan; returns the first layer's envelope (the shot, for the choke). `keep` collects the sources. */
  private play(plan: WeaponPlan, keep: AudioBufferSourceNode[] | null): GainNode | null {
    const ctx = this.a.ctx;
    const buf = this.buf;
    if (!ctx || !buf) return null;
    const now = ctx.currentTime + 0.005;
    let first: GainNode | null = null;
    for (let i = 0; i < plan.n; i++) {
      const L = plan.layers[i]!;
      const take = INDEX.banks[L.bank][L.take];
      if (!take) continue;
      const dur = (L.dur > 0 ? Math.min(L.dur * L.rate, take[1]) : take[1]) / L.rate;
      const t = now + L.at;
      const out = this.a.out('sfx', L.gain, L.pan, L.at + dur + 0.05);
      if (!out) break;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = L.rate;
      const env = ctx.createGain();
      env.gain.setValueAtTime(1, t);
      env.gain.setValueAtTime(1, t + Math.max(0, dur - 0.015));
      env.gain.linearRampToValueAtTime(0, t + dur);
      if (L.lowpass > 0) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = L.lowpass;
        f.Q.value = 0.5;
        src.connect(f).connect(env).connect(out);
      } else src.connect(env).connect(out);
      src.start(t, Math.max(0, take[0] + this.shift));
      src.stop(t + dur + 0.01);
      if (keep && keep.length < MAX_RELOAD) keep.push(src);
      if (!first) first = env;
      this.stats.layers++;
    }
    return first;
  }
}
