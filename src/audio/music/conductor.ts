/**
 * The conductor decides what plays when. It is pure: it turns a state, a seed and the clock into `MusicEvent`s for a
 * sink (the Web Audio engine, or a recorder in tests). The same seed and the same calls give the same events.
 *
 * M1 plays a rough calm (near-silent air, drone, sparse found-sound ticks) and a rough combat (a programmed 168 BPM
 * break, a reese bass, a motif diminution on a pipe). M2 adds suspicious and searching, transitions and stingers.
 */
import { MOTIF_RESOLVED, MOTIF_STATEMENT, type MotifNote } from './motif';
import { semis, D2 } from './library';
import { Rng } from './rng';
import { StepScheduler } from './scheduler';
import { PRIO } from './voices';
import type { ReverbName } from './library';

export type Stem = 'AIR' | 'TEX' | 'HARM' | 'MOTIF' | 'BASS' | 'PULSE' | 'METAL' | 'BREAK' | 'GLITCH';
export const STEMS: readonly Stem[] = ['AIR', 'TEX', 'HARM', 'MOTIF', 'BASS', 'PULSE', 'METAL', 'BREAK', 'GLITCH'];

export type MusicState = 'calm' | 'combat';

export interface PlayEvent {
  k: 'play';
  id: string;
  /** Start time (s, audio clock). */
  t: number;
  stem: Stem;
  gain: number;
  /** playbackRate. */
  rate: number;
  pan: number;
  prio: number;
  /** Reverb send level (0 = dry) into `reverb`. */
  reverb?: ReverbName;
  send?: number;
  /** Dub delay send level. */
  delay?: number;
  /** Cut the sound this many seconds after `t` (a note length); loops need it or a layer stop. */
  dur?: number;
  /** A named sustained layer: a new play on the same layer replaces the old one; a `stop` event ends it. */
  layer?: string;
  fadeIn?: number;
  fadeOut?: number;
}

export interface StopEvent {
  k: 'stop';
  layer: string;
  t: number;
  fade: number;
}

export type MusicEvent = PlayEvent | StopEvent;
export type Sink = (e: MusicEvent) => void;

export interface Palette {
  variants(base: string): string[];
}

export const COMBAT_BPM = 168;
export const CALM_TEX = ['glass', 'click', 'rail', 'chain', 'plate', 'relay', 'hatC'] as const;

/** The reese's pitch per 2-bar span (semitones from D): D, Eb, Ab, C. */
const REESE_SPANS = [0, 1, 6, -2];
/** Reese rhythm inside a bar: start step and length in steps. */
const REESE_RHYTHM: [number, number][] = [[0, 6], [6, 4], [10, 6]];

const KICK_VARIANTS: number[][] = [[0, 7, 10], [0, 6, 10], [0, 7, 9], [0, 8, 10, 13]];
const GHOST_POOL = [2, 6, 9, 11, 14, 15];

export class Conductor {
  state: MusicState | null = null;
  /** Tempo nudge (BPM) for the lab. */
  bpmNudge = 0;
  readonly sched = new StepScheduler(COMBAT_BPM);
  private patterns: Rng;
  private calm: Rng;
  private nextTex = 0;
  private lastMotif = -1e9;
  private calmSince = 0;
  private kick = KICK_VARIANTS[0]!;
  private ghost = [9, 15];

  constructor(
    seed: number,
    private pal: Palette,
    private sink: Sink,
  ) {
    this.patterns = new Rng(seed).fork('patterns');
    this.calm = new Rng(seed).fork('calm');
  }

  setSeed(seed: number): void {
    this.patterns = new Rng(seed).fork('patterns');
    this.calm = new Rng(seed).fork('calm');
    this.mutate();
  }

  /** Switch state at time t (the sink gets the stops and starts at t). */
  setState(s: MusicState, t: number): void {
    if (s === this.state) return;
    const was = this.state;
    this.state = s;
    if (was === 'combat') this.sched.stop();
    if (s === 'calm') {
      this.sink({ k: 'stop', layer: 'bass', t, fade: 1.2 });
      this.calmSince = t;
      this.nextTex = t + this.calm.range(2, 5);
      this.emit({ id: 'air', t, stem: 'AIR', gain: 0.8, rate: 1, pan: 0, prio: PRIO.bed, layer: 'air', fadeIn: was ? 2.5 : 4 });
      this.emit({ id: 'drone', t, stem: 'AIR', gain: 0.6, rate: 1, pan: 0, prio: PRIO.bed, layer: 'drone', fadeIn: was ? 3 : 6 });
    } else {
      this.sink({ k: 'stop', layer: 'air', t, fade: 0.4 });
      this.sink({ k: 'stop', layer: 'drone', t, fade: 0.4 });
      this.mutate();
      this.sched.start(t, COMBAT_BPM + this.bpmNudge);
    }
  }

  /** Back to no state (the next setState starts clean). */
  reset(): void {
    this.state = null;
    this.sched.stop();
  }

  /** Nudge the tempo for what is not yet scheduled. */
  setBpmNudge(n: number): void {
    this.bpmNudge = n;
    if (this.state === 'combat') this.sched.setTempo(COMBAT_BPM + n);
  }

  /** Schedule everything due before `horizon`. */
  advance(now: number, horizon: number): void {
    if (this.state === 'calm') this.advanceCalm(now, horizon);
    else if (this.state === 'combat') this.sched.advance(now, horizon, (step, t, dur) => this.combatStep(step, t, dur));
  }

  /** The motif, for the lab's ear test: statement on the bell, then the bass, then a pipe. */
  playMotif(t: number, form: 'all' | 'bell' | 'bass' | 'pipe' | 'resolved' = 'all', bpm = 84): number {
    const eighth = 60 / bpm / 2;
    const bar2 = 16 * eighth;
    const plan: { inst: 'bell' | 'bass' | 'pipe'; notes: readonly MotifNote[]; at: number }[] = [];
    if (form === 'all') {
      plan.push({ inst: 'bell', notes: MOTIF_STATEMENT, at: 0 }, { inst: 'bass', notes: MOTIF_STATEMENT, at: bar2 + 1 }, { inst: 'pipe', notes: MOTIF_STATEMENT, at: 2 * bar2 + 2 });
    } else if (form === 'resolved') {
      plan.push({ inst: 'bell', notes: MOTIF_STATEMENT, at: 0 }, { inst: 'bell', notes: MOTIF_RESOLVED, at: bar2 + 1 });
    } else {
      plan.push({ inst: form, notes: MOTIF_STATEMENT, at: 0 });
    }
    let end = t;
    for (const p of plan) {
      for (const n of p.notes) {
        const nt = t + p.at + n.step * eighth;
        const e = this.motifNote(p.inst, n, nt, eighth);
        if (e > end) end = e;
      }
    }
    return end;
  }

  // ------------------------------------------------------------ internals

  private emit(e: Omit<PlayEvent, 'k'>): void {
    this.sink({ k: 'play', ...e });
  }

  private motifNote(inst: 'bell' | 'bass' | 'pipe', n: MotifNote, t: number, eighth: number): number {
    const len = n.len * eighth;
    if (inst === 'bell') {
      this.emit({ id: 'motifbell', t, stem: 'MOTIF', gain: 0.9, rate: semis(n.semis), pan: 0.1, prio: PRIO.motif, reverb: 'street', send: 0.5, delay: 0.3 });
      return t + 3;
    }
    if (inst === 'bass') {
      this.emit({ id: 'bassmetal', t, stem: 'MOTIF', gain: 1, rate: semis(n.semis), pan: 0, prio: PRIO.motif, dur: Math.max(len, 0.4), fadeOut: 0.25 });
      return t + Math.max(len, 0.4) + 0.3;
    }
    this.emit({ id: 'pipe', t, stem: 'MOTIF', gain: 0.8, rate: semis(n.semis), pan: -0.1, prio: PRIO.motif, reverb: 'room', send: 0.35 });
    return t + 1.8;
  }

  private advanceCalm(now: number, horizon: number): void {
    if (this.nextTex < now - 1) this.nextTex = now + this.calm.range(2, 6);
    while (this.nextTex < horizon) {
      const t = Math.max(this.nextTex, now);
      const r = this.calm;
      // the motif: at most once per 90 s, never in the first 60 s, far back in the hall
      if (t - this.calmSince > 60 && t - this.lastMotif > 90 && r.chance(0.1)) {
        this.lastMotif = t;
        const eighth = 60 / 84 / 2;
        for (const n of MOTIF_STATEMENT) {
          this.emit({ id: 'motifbell', t: t + n.step * eighth, stem: 'MOTIF', gain: 0.35, rate: semis(n.semis), pan: r.range(-0.5, 0.5), prio: PRIO.motif, reverb: 'hall', send: 1, delay: 0.2 });
        }
      } else {
        const base = r.pick(CALM_TEX);
        const vars = this.pal.variants(base);
        const id = vars.length ? r.pick(vars) : base;
        const pitched = id === 'rail' || id === 'plate';
        this.emit({
          id,
          t,
          stem: 'TEX',
          gain: r.range(0.35, 0.8),
          rate: pitched ? semis(Math.round(r.range(-3, 3))) : r.range(0.85, 1.2),
          pan: r.range(-0.6, 0.6),
          prio: PRIO.tex,
          reverb: 'hall',
          send: r.range(0.5, 1),
        });
      }
      this.nextTex = t + r.range(4, 12);
    }
  }

  private mutate(): void {
    const r = this.patterns;
    this.kick = r.pick(KICK_VARIANTS);
    const g = GHOST_POOL.slice();
    this.ghost = [];
    for (let i = 0; i < 2; i++) this.ghost.push(g.splice(r.int(g.length), 1)[0]!);
  }

  private combatStep(step: number, t: number, dur: number): void {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const phrase = bar % 8;
    if (s === 0 && bar > 0 && phrase === 0) this.mutate();
    const fill = phrase === 7 && s >= 12;
    // the break: kick, snare, ghosts, hats
    if (this.kick.includes(s)) this.emit({ id: 'kickTight', t, stem: 'BREAK', gain: 0.95, rate: 1, pan: 0, prio: PRIO.drum });
    if ((s === 4 || s === 12) && !(fill && s === 12)) this.emit({ id: 'snare', t, stem: 'BREAK', gain: 0.8, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'room', send: 0.12 });
    if (fill) this.emit({ id: 'snare', t, stem: 'GLITCH', gain: 0.45 + (s - 12) * 0.12, rate: 1 + (s - 12) * 0.07, pan: 0, prio: PRIO.drum });
    if (this.ghost.includes(s) && !fill) this.emit({ id: 'ghost', t, stem: 'BREAK', gain: 0.22, rate: this.patterns.range(0.95, 1.1), pan: 0.15, prio: PRIO.drum });
    if (s % 2 === 0) {
      const open = s === 14;
      this.emit({ id: open ? 'hatO' : 'hatC', t, stem: 'BREAK', gain: open ? 0.22 : s % 4 === 0 ? 0.26 : 0.16, rate: 1, pan: s % 4 === 0 ? -0.2 : 0.2, prio: PRIO.drum });
    }
    // the reese: the pitch changes every two bars (D, Eb, Ab, C), gated on a 3-note rhythm
    const span = Math.floor(bar / 2) % REESE_SPANS.length;
    for (const [at, n] of REESE_RHYTHM) {
      if (s !== at) continue;
      const anticipate = at === 10 && bar % 2 === 1;
      const pitch = REESE_SPANS[(span + (anticipate ? 1 : 0)) % REESE_SPANS.length]!;
      this.emit({ id: 'reese', t, stem: 'BASS', gain: 0.9, rate: semis(pitch) * (D2 / 73.5), pan: 0, prio: PRIO.bass, layer: 'bass', dur: n * dur, fadeIn: 0.004, fadeOut: 0.03 });
    }
    // the motif in sixteenths (diminution) on a pipe, once per 8 bars
    if (phrase === 3) {
      for (const n of MOTIF_STATEMENT) {
        if (n.step === s) this.emit({ id: 'pipe', t, stem: 'MOTIF', gain: 0.6, rate: semis(n.semis), pan: -0.15, prio: PRIO.motif, reverb: 'room', send: 0.25 });
      }
    }
    // a machine accent on the phrase downbeat
    if (phrase === 0 && s === 0) this.emit({ id: 'thump', t, stem: 'METAL', gain: 0.8, rate: 1, pan: 0, prio: PRIO.metal });
  }
}
