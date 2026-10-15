import { bars, chordBass, harmonyBelow, voicing, type Chord, type Note } from './theory';
import type { SketchDef } from './themes';

/**
 * Pure arrangement for the V4 audition sketches (docs/music/score-design.md Section 4): every layer of the menu theme,
 * the mission loops (Calm + Cautious, Alert + Evasion), the stinger and the theme-alone demos, as timed note events.
 * No Web Audio here; `render.ts` turns events into buffers. Times and lengths are in beats (4 per bar).
 */

export type Hit = 'kick' | 'snare' | 'ghost' | 'hat' | 'ohat' | 'rim' | 'shaker' | 'brush' | 'taiko' | 'metal' | 'plate' | 'crash';
export type Voice =
  | Hit
  | 'pizz'
  | 'heart'
  | 'darkBass'
  | 'reese'
  | 'str'
  | 'strTrem'
  | 'strSpicc'
  | 'strHi'
  | 'harm'
  | 'brass'
  | 'horn'
  | 'mutedHorn'
  | 'farHorn'
  | 'melody'
  | 'air'
  | 'rumble'
  | 'crackle'
  | 'riser'
  | 'swell'
  | 'boom'
  | 'rhodes'
  | 'guitar'
  | 'guitarMute'
  | 'pizzSoft'
  | 'guitarSoft'
  | 'guitarMuteSoft'
  | 'subBass';

export const HITS: readonly Hit[] = ['kick', 'snare', 'ghost', 'hat', 'ohat', 'rim', 'shaker', 'brush', 'taiko', 'metal', 'plate', 'crash'];

/**
 * One event. `n` is MIDI (0 for unpitched). `p` is a per-voice parameter: hits = playback rate (pitch); horn = section
 * size; strings and brass = attack time (s); air = filter centre (Hz).
 */
export interface Ev {
  at: number;
  dur: number;
  v: Voice;
  n: number;
  vel: number;
  pan: number;
  p: number;
}

export type MusicState = 'calm' | 'caution' | 'alert' | 'evade';
export type Group = 'menu' | 'low' | 'alert' | 'shot';

export interface Fx {
  /** Send levels to the small room, the hall and the long far space. */
  room: number;
  hall: number;
  far: number;
  /** Dub echo: time in beats, feedback, wet level. */
  delay?: { beats: number; fb: number; wet: number };
  lp?: number;
  hp?: number;
  /** Soft-clip drive on the layer bus (1 = clean). */
  drive?: number;
}

export interface LayerDef {
  id: string;
  name: string;
  group: Group;
  bpm: number;
  /** Loop length in bars (one-shots: the length before the tail). */
  bars: number;
  mono: boolean;
  rate: number;
  /** Target loudness of the stem at 100 %: gated RMS in dBFS (silence is not counted). */
  level: number;
  fx: Fx;
  /** Gain per music state (menu and one-shots ignore it). */
  mix: Record<MusicState, number>;
  events: Ev[];
}

export interface Plan {
  id: string;
  name: string;
  group: Group;
  bpm: number;
  bars: number;
  layers: LayerDef[];
  /** One line for the test page. */
  blurb?: string;
}

export interface Mission {
  low: Plan;
  alert: Plan;
  stinger: LayerDef;
  stingerShort: LayerDef;
}

export class Seq {
  readonly ev: Ev[] = [];

  add(at: number, dur: number, v: Voice, n: number, vel: number, pan = 0, p = 1): void {
    if (vel <= 0) return;
    this.ev.push({ at, dur, v, n, vel: Math.min(1.25, vel), pan, p });
  }
}

const ALL: Record<MusicState, number> = { calm: 1, caution: 1, alert: 1, evade: 1 };

export function layer(
  id: string,
  name: string,
  group: Group,
  bpm: number,
  nBars: number,
  s: Seq,
  level: number,
  fx: Fx,
  opts: { mono?: boolean; rate?: number; mix?: Record<MusicState, number> } = {},
): LayerDef {
  return {
    id,
    name,
    group,
    bpm,
    bars: nBars,
    mono: opts.mono ?? false,
    rate: opts.rate ?? 32000,
    level,
    fx,
    mix: opts.mix ?? ALL,
    events: s.ev.slice().sort((a, b) => a.at - b.at),
  };
}

// ---------------------------------------------------------------- helpers

/** Beat position of sixteenth `slot` in `bar`, with the off sixteenths pushed late by `swing` (fraction of a 16th). */
export function s16(bar: number, slot: number, swing: number): number {
  return bar * 4 + slot * 0.25 + (slot % 2 === 1 ? swing * 0.25 : 0);
}

const VEL: Record<string, number> = { X: 1, x: 0.75, o: 0.5, g: 0.22 };

/** "X..o..x..." -> velocities per sixteenth. */
export function pattern(src: string): number[] {
  const out: number[] = [];
  for (const c of src) out.push(VEL[c] ?? 0);
  return out;
}

export function drums(s: Seq, bar: number, v: Hit, pat: string, vel: number, swing: number, p = 1, pan = 0, from = 0, to = 16, shift = 0): void {
  const k = pattern(pat);
  for (let i = from; i < Math.min(to, k.length); i++) if (k[i]! > 0) s.add(s16(bar, i, swing) + shift, 0, v, 0, k[i]! * vel, pan, p);
}

/** Three taiko players a few milliseconds apart. */
export function taiko(s: Seq, at: number, vel: number, p = 1): void {
  s.add(at, 0, 'taiko', 0, vel, -0.35, p * 0.97);
  s.add(at + 0.012, 0, 'taiko', 0, vel * 0.9, 0, p * 0.91);
  s.add(at + 0.024, 0, 'taiko', 0, vel * 0.8, 0.35, p * 1.04);
}

/** A melody fragment. Longer notes play slightly louder. */
function play(s: Seq, notes: readonly Note[], at: number, v: Voice, vel: number, tr = 0, p = 1, legato = 0.92, pan = 0): void {
  let t = 0;
  for (const note of notes) {
    if (note.n !== null) s.add(at + t, note.d * legato, v, note.n + tr, vel * (0.86 + 0.14 * Math.min(note.d, 2) / 2), pan, p);
    t += note.d;
  }
}

/** Semitones that move the hook from the key note onto a chord's bass (within -5..+6). */
export function shiftTo(sk: SketchDef, c: Chord): number {
  return chordBass(sk.tonic, c, sk.tonic - 5) - sk.tonic;
}

/** One bar of the hook (`half` 0 = the riff, 1 = the walk-up), shifted onto a chord. */
export function hook(s: Seq, sk: SketchDef, bar: number, half: 0 | 1, v: Voice, vel: number, shift: number, swing8: number): void {
  for (let i = 0; i < 8; i++) {
    const n = sk.hook[half * 8 + i];
    if (n === null || n === undefined) continue;
    let gap = (8 - i) * 0.5;
    for (let j = i + 1; j < 8; j++) {
      if (sk.hook[half * 8 + j] !== null) {
        gap = (j - i) * 0.5;
        break;
      }
    }
    const at = bar * 4 + i * 0.5 + (i % 2 === 1 ? swing8 * 0.5 : 0);
    const acc = i === 0 ? 1 : n > sk.tonic + 6 ? 0.8 : 0.7;
    const walk = half === 1 && i >= 4 ? 0.85 + 0.07 * (i - 4) : 1;
    s.add(at, Math.min(gap * 0.9, 1.4), v, n + shift, vel * acc * walk);
  }
}

/** The theme split into its eight bars. */
function themeBars(sk: SketchDef): Note[][] {
  return bars(sk.theme);
}

function tb(T: Note[][], i: number): Note[] {
  return T[i] ?? [];
}

// ---------------------------------------------------------------- drum patterns

interface Kit {
  /** Half-time break for Cautious (and the menu's soft section). */
  halfK: string;
  halfS: string;
  halfG: string;
  halfH: string;
  /** Full break (Alert, the menu's full sections). */
  fullK: string;
  fullS: string;
  fullG: string;
  fullH: string;
  fullO: string;
  /** Taiko rhythm under theme bars. */
  taiko: number[];
  /** Brass stab rhythm (sixteenths) on the hook's accents. */
  stab: number[];
  /** Low-string ostinato per beat: semitones above the chord bass. */
  ost: number[];
}

export const KIT_A: Kit = {
  halfK: 'X..o......x.....',
  halfS: '........X.......',
  halfG: '.....g.......g.g',
  halfH: 'x.o.x.o.x.o.x.oo',
  fullK: 'X..x..x...X..o..',
  fullS: '....X.......X...',
  fullG: '.......g.g....g.',
  fullH: 'xoxoxoxoxoxoxoxo',
  fullO: '..............x.',
  taiko: [0, 6, 12],
  stab: [0, 6, 12],
  ost: [0, 12, 7, 12],
};

const KIT_B: Kit = {
  halfK: 'X......x..o.....',
  halfS: '........X.......',
  halfG: '...g.g.....g.g.g',
  halfH: 'o...o...o...o...',
  fullK: 'X......X..X.....',
  fullS: '....X.......X...',
  fullG: '..g...g.g..g..g.',
  fullH: 'x.x.x.x.x.x.x.x.',
  fullO: '......x.........',
  taiko: [0, 3, 10],
  stab: [0, 3, 4, 10],
  ost: [0, 0, 1, 0],
};

const kitOf = (sk: SketchDef): Kit => (sk.feel === 'noir' ? KIT_B : KIT_A);
export const swing8Of = (sk: SketchDef, alert = false): number => (sk.feel === 'noir' ? 0.18 : 0.06) * (alert ? 0.5 : 1);

/** A full-break bar with the fill / beat-repeat plan: fill on every 4th bar, beat-repeat on bar 6 of each 8. */
export function fullBar(s: Seq, sk: SketchDef, bar: number, swing: number, vel: number, local: number): void {
  const k = kitOf(sk);
  const noir = sk.feel === 'noir';
  const fill = local % 4 === 3;
  const repeat = local % 8 === 5;
  const end = fill ? 12 : 16;
  if (repeat) {
    // beat-repeat: beat 1 played twice (the copy slightly sharper), then the bar's second half
    for (const shift of [0, 1]) {
      const p = shift ? 1.06 : 1;
      drums(s, bar, 'kick', k.fullK, vel, swing, p, 0, 0, 4, shift);
      drums(s, bar, 'ghost', k.fullG, vel, swing, p, -0.1, 0, 4, shift);
      drums(s, bar, noir ? 'shaker' : 'hat', k.fullH, vel * 0.5, swing, p, 0.2, 0, 4, shift);
    }
    drums(s, bar, 'kick', k.fullK, vel, swing, 1, 0, 8, end);
    drums(s, bar, 'snare', k.fullS, vel, swing, 1, 0, 8, end);
    drums(s, bar, 'ghost', k.fullG, vel, swing, 1, -0.1, 8, end);
    drums(s, bar, noir ? 'shaker' : 'hat', k.fullH, vel * 0.5, swing, 1, 0.2, 8, end);
  } else {
    drums(s, bar, 'kick', k.fullK, vel, swing, 1, 0, 0, end);
    drums(s, bar, 'snare', k.fullS, vel, swing, 1, 0, 0, end);
    drums(s, bar, 'ghost', k.fullG, vel, swing, 1, -0.1, 0, end);
    drums(s, bar, noir ? 'shaker' : 'hat', k.fullH, vel * (noir ? 0.7 : 0.5), swing, 1, 0.2, 0, end);
    if (local % 2 === 1 && !fill) drums(s, bar, 'ohat', k.fullO, vel * 0.45, swing, 1, 0.25);
  }
  if (noir) drums(s, bar, 'plate', '......o.......o.', vel * 0.5, swing, 1.7, -0.3);
  if (fill) {
    // written fill: a snare build and a pushed kick
    for (let i = 12; i < 16; i++) s.add(s16(bar, i, swing), 0, 'snare', 0, vel * (0.45 + 0.15 * (i - 12)), 0, 1 + 0.02 * (i - 12));
    s.add(s16(bar, 14, swing), 0, 'kick', 0, vel * 0.8);
    if (local % 8 === 7) {
      // bigger fill: low drums under the build
      s.add(s16(bar, 8, swing), 0, 'taiko', 0, vel * 0.55, -0.3, 1.5);
      s.add(s16(bar, 10, swing), 0, 'taiko', 0, vel * 0.6, 0.3, 1.3);
    }
  }
}

/** A half-time bar with fills and a beat-repeat; `drop` silences the last two beats (a dropout before a phrase). */
export function halfBar(s: Seq, sk: SketchDef, bar: number, swing: number, vel: number, local: number, drop = false): void {
  const k = kitOf(sk);
  const noir = sk.feel === 'noir';
  const fill = local % 4 === 3;
  const end = drop ? 8 : fill ? 12 : 16;
  if (local % 8 === 5) {
    // beat-repeat: the kick and the first ghost of beat 1 again on beat 3, snare moved to beat 4
    drums(s, bar, 'kick', k.halfK, vel, swing, 1, 0, 0, 8);
    s.add(s16(bar, 8, swing), 0, 'kick', 0, vel * 0.85, 0, 1.05);
    s.add(s16(bar, 12, swing), 0, 'snare', 0, vel * 0.9);
  } else {
    drums(s, bar, 'kick', k.halfK, vel, swing, 1, 0, 0, end);
    drums(s, bar, 'snare', k.halfS, vel, swing, 1, 0, 0, end);
  }
  drums(s, bar, 'ghost', k.halfG, vel, swing, 1, -0.1, 0, end);
  drums(s, bar, noir ? 'brush' : 'hat', k.halfH, vel * (noir ? 0.8 : 0.45), swing, 1, 0.2, 0, end);
  if (noir) drums(s, bar, 'shaker', '..o...o...o...o.', vel * 0.35, swing, 1, 0.3, 0, end);
  if (fill && !drop) {
    for (let i = 12; i < 16; i++) s.add(s16(bar, i, swing), 0, i % 2 ? 'ghost' : 'snare', 0, vel * (0.3 + 0.12 * (i - 12)), 0, 1);
  }
}

/** A stutter: `count` slices of a hit, rising in pitch and level (a glitch edit into a downbeat). */
export function stutter(s: Seq, at: number, len: number, count: number, v: Hit, vel: number, rise = 0.5): void {
  const step = len / count;
  for (let i = 0; i < count; i++) {
    const f = i / Math.max(1, count - 1);
    s.add(at + i * step, step * 0.8, v, 0, vel * (0.5 + 0.5 * f), (i % 2 ? 0.3 : -0.3), 1 + rise * f);
  }
}

/** A snare roll from `at` to `to`: sixteenths, then thirty-seconds in the last beat, crescendo. */
export function roll(s: Seq, at: number, to: number, v0: number, v1: number): void {
  let t = at;
  while (t < to - 1e-6) {
    const step = to - t <= 1 + 1e-6 ? 0.125 : 0.25;
    const f = (t - at) / Math.max(0.001, to - at);
    s.add(t, 0, f < 0.5 ? 'ghost' : 'snare', 0, v0 + (v1 - v0) * f, (Math.round(t * 8) % 2 ? 0.15 : -0.15));
    t += step;
  }
}

export function impact(s: Seq, at: number, vel: number): void {
  s.add(at, 0, 'crash', 0, vel * 0.7, 0.2);
  s.add(at, 6, 'boom', 0, vel);
}

// ---------------------------------------------------------------- menu

/** The menu theme: one 32-bar loop (Section 4: intro, solo statement, full statement, bridge, lifted final statement). */
export function menuPlan(sk: SketchDef): Plan {
  const T = themeBars(sk);
  const C = sk.chords;
  const tn = sk.tonic;
  const noir = sk.feel === 'noir';
  const sw = sk.swing;
  const sw8 = swing8Of(sk);
  const kit = kitOf(sk);
  const bpm = sk.menuBpm;
  const N = 32;
  const tex = new Seq();
  const dr = new Seq();
  const bs = new Seq();
  const st = new Seq();
  const br = new Seq();
  const ld = new Seq();

  const bridge = [C[0]!, C[0]!, C[4]!, C[6]!];
  const chordAt = (b: number): Chord =>
    b < 4 ? C[b < 2 ? 0 : 1]! : b < 12 ? C[b - 4]! : b < 20 ? C[b - 12]! : b < 24 ? bridge[b - 20]! : C[b - 24]!;
  const trAt = (b: number): number => (b >= 24 ? sk.lift : 0);
  const darkBass: Voice = noir ? 'reese' : 'darkBass';

  // texture: cold air, low rumble, far metal, swells into each section, booms on the big entries
  tex.add(0, 18, 'air', 0, 1, 0, 6500);
  tex.add(16, N * 4 - 16, 'air', 0, 0.45, 0, 8000);
  tex.add(0, N * 4, 'rumble', 0, 0.7);
  if (noir) tex.add(0, N * 4, 'crackle', 0, 0.6);
  tex.add(2.5, 0, 'metal', 0, 0.55, -0.4, 0.6);
  tex.add(8 + 1.5, 0, 'plate', 0, 0.35, 0.5, 0.5);
  if (!noir) {
    tex.add(0, 14, 'harm', tn + 72, 0.5, 0.3, 3);
    tex.add(4, 12, 'harm', tn + 79, 0.35, -0.3, 3);
  }
  tex.add(16 - 4, 4, 'swell', 0, 0.6);
  tex.add(48 - 8, 8, 'swell', 0, 1);
  tex.add(88, 8, 'riser', 0, 0.8);
  tex.add(96 - 4, 4, 'swell', 0, 0.9);
  tex.add(48, 6, 'boom', 0, 0.9);
  tex.add(96, 6, 'boom', 0, 1);

  // drums
  dr.add(3 * 4 + 3, 0, 'taiko', 0, 0.35, 0, 0.9);
  for (let b = 4; b < 12; b++) {
    drums(dr, b, 'kick', 'X.......x.......', 0.55, sw);
    drums(dr, b, noir ? 'brush' : 'ghost', '........X.......', noir ? 0.7 : 1.6, sw);
    drums(dr, b, noir ? 'brush' : 'hat', 'o.g.o.g.o.g.o.g.', 0.5, sw, 1, 0.2);
    if (b === 11) roll(dr, b * 4 + 3, b * 4 + 4, 0.15, 0.45);
  }
  for (const [from, lifted] of [[12, false], [24, true]] as const) {
    if (lifted) dr.add(from * 4, 0, 'crash', 0, 0.8, -0.2);
    else dr.add(from * 4, 0, 'crash', 0, 0.7, 0.2);
    for (let b = from; b < from + 8; b++) {
      if (b === N - 1) {
        dr.add(b * 4, 0, 'kick', 0, 1);
        taiko(dr, b * 4, 1);
        dr.add(b * 4, 0, 'crash', 0, 0.8);
        continue;
      }
      fullBar(dr, sk, b, sw, 0.85, b - from);
      const tb0 = b - from;
      if (tb0 % 2 === 0 || lifted) for (const sl of kit.taiko) taiko(dr, s16(b, sl, sw), sl === 0 ? 0.85 : 0.6);
    }
  }
  for (let b = 20; b < 24; b++) {
    drums(dr, b, 'kick', 'X.......X.......', 0.85, sw);
    drums(dr, b, noir ? 'shaker' : 'hat', 'x.o.x.o.x.o.x.o.', 0.5, sw, 1, 0.2);
    taiko(dr, b * 4, 0.7);
  }
  roll(dr, 23 * 4, 24 * 4, 0.2, 0.95);

  // bass: heartbeat intro, the hook following the chords, the hook itself in the bridge
  for (let b = 0; b < 4; b++) {
    for (const beat of [0, 2]) {
      bs.add(b * 4 + beat, 0.4, 'heart', tn, 0.8);
      bs.add(b * 4 + beat + 0.5, 0.4, 'heart', tn, 0.45);
    }
  }
  for (let b = 4; b < N; b++) {
    const c = chordAt(b);
    const tr = trAt(b);
    const full = b >= 12;
    const sec = b < 12 ? b - 4 : b < 20 ? b - 12 : b < 24 ? -1 : b - 24;
    const voices: Voice[] = full ? ['pizz', darkBass] : ['pizz'];
    for (const v of voices) {
      const vel = v === 'pizz' ? (full ? 0.85 : 0.75) : 0.45;
      if (b === N - 1) {
        bs.add(b * 4, 4, v, chordBass(tn + tr, c, tn - 5 + tr), vel);
      } else if (sec === -1) {
        hook(bs, sk, b, (b % 2) as 0 | 1, v, vel, 0, sw8);
      } else if (sec === 7) {
        hook(bs, sk, b, 1, v, vel, tr, sw8);
      } else {
        hook(bs, sk, b, 0, v, vel, shiftTo(sk, c) + tr, sw8);
      }
    }
  }

  // strings
  for (const n of voicing(tn, C[0]!, tn - 12, tn + 17, 4)) st.add(0, 16.5, 'str', n, 0.35, 0, 3);
  for (let b = 4; b < N; b++) {
    const c = chordAt(b);
    const tr = trAt(b);
    if (b >= 20 && b < 24) continue;
    const big = b >= 12;
    for (const n of voicing(tn + tr, c, tn - 12 + tr, tn + (big ? 24 : 17) + tr, big ? 5 : 4)) {
      st.add(b * 4, b === N - 1 ? 4 : 4.1, 'str', n, big ? 0.5 : 0.38, 0, big ? 0.25 : 0.6);
    }
  }
  play(st, T.flat(), 12 * 4, 'strHi', 0.42, 12);
  play(st, T.flat(), 24 * 4, 'strHi', 0.5, 12 + sk.lift);
  for (let b = 20; b < 24; b += 2) for (const iv of [12, 13, 18]) st.add(b * 4, 8, 'strTrem', tn + iv, 0.4 + (b - 20) * 0.1, 0, 5);
  for (let b = 20; b < N - 1; b++) {
    const r = b < 24 ? tn + 12 : chordBass(tn + trAt(b), chordAt(b), tn + 7 + trAt(b));
    for (let i = 0; i < 8; i++) st.add(b * 4 + i * 0.5, 0.25, 'strSpicc', r + (i % 2 ? 12 : 0), i % 2 ? 0.35 : 0.5, i % 2 ? 0.25 : -0.25);
  }

  // brass: trombones on the theme an octave down, tuba roots, the bridge stabs answering the hook, the final chord
  for (const [from, tr, vel] of [[12, 0, 0.55], [24, sk.lift, 0.72]] as const) {
    play(br, T.flat().slice(0, -1), from * 4, 'brass', vel, tr - 12, 0.05);
    for (let b = from; b < from + 7; b++) br.add(b * 4, 3.6, 'brass', chordBass(tn + tr, chordAt(b), tn - 7 + tr), vel * 0.8, 0, 0.06);
  }
  for (let b = 20; b < 24; b++) {
    const c = chordAt(b);
    const vs = voicing(tn, c, tn, tn + 22, 5);
    if (b % 2 === 0) for (const n of vs) br.add(b * 4, 0.45, 'brass', n, 0.65, 0, 0.012);
    else for (const sl of kit.stab) for (const n of vs) br.add(s16(b, sl, sw), 0.4, 'brass', n, sl === 0 ? 0.75 : 0.6, 0, 0.012);
  }
  for (const n of voicing(tn + sk.lift, C[7]!, tn - 12 + sk.lift, tn + 22 + sk.lift, 6)) br.add((N - 1) * 4, 3.8, 'brass', n, 0.75, 0, 0.08);

  // lead: solo horn, then the horn section, then the lifted statement
  play(ld, T.flat(), 4 * 4, 'horn', 0.6, 0, 1);
  play(ld, T.flat(), 12 * 4, 'horn', 0.78, 0, 3);
  play(ld, T.flat(), 24 * 4, 'horn', 0.88, sk.lift, 3);

  const id = `menu-${sk.id}`;
  return {
    id,
    name: `Menu ${sk.id} - ${sk.name}`,
    group: 'menu',
    bpm,
    bars: N,
    layers: [
      layer(`${id}-tex`, 'Texture and builds', 'menu', bpm, N, tex, -34, { room: 0, hall: 0.25, far: 0.6 }),
      layer(`${id}-drums`, 'Drums and taiko', 'menu', bpm, N, dr, -25, { room: 0.35, hall: 0.12, far: 0, drive: 1.6, lp: 9000 }),
      layer(`${id}-bass`, 'Bass and hook', 'menu', bpm, N, bs, -26, { room: 0.2, hall: 0.1, far: 0, lp: 2200 }, { rate: 24000 }),
      layer(`${id}-str`, 'Strings', 'menu', bpm, N, st, -25, { room: 0.1, hall: 0.45, far: 0.1 }),
      layer(`${id}-brass`, 'Low brass', 'menu', bpm, N, br, -24, { room: 0.1, hall: 0.45, far: 0.05 }, { rate: 24000 }),
      layer(`${id}-lead`, 'Horns (theme)', 'menu', bpm, N, ld, -23, { room: 0.1, hall: 0.5, far: 0.1 }, { rate: 24000 }),
    ],
  };
}

// ---------------------------------------------------------------- mission

const CALM_MIX = (caution: number): Record<MusicState, number> => ({ calm: 1, caution, alert: 0, evade: 0 });
const CAUTION_MIX: Record<MusicState, number> = { calm: 0, caution: 1, alert: 0, evade: 0 };
const ALERT_MIX = (evade: number): Record<MusicState, number> => ({ calm: 0, caution: 0, alert: 1, evade });

/** Calm + Cautious: one 32-bar loop at the low tempo. Cautious is Calm plus four layers. */
export function lowPlan(sk: SketchDef): Plan {
  const T = themeBars(sk);
  const C = sk.chords;
  const tn = sk.tonic;
  const noir = sk.feel === 'noir';
  const sw = sk.swing;
  const sw8 = swing8Of(sk);
  const bpm = sk.lowBpm;
  const N = 32;
  const chordAt = (b: number): Chord => C[Math.floor(b / 4) % 8]!;

  // ---- Calm
  const pulse = new Seq();
  for (let b = 0; b < N; b++) {
    if (b % 8 === 7) continue; // a silent bar in every eight
    const r = chordBass(tn, chordAt(b), tn - 5);
    const beats = b % 8 === 3 ? [0] : [0, 2];
    for (const beat of beats) {
      pulse.add(b * 4 + beat, 0.45, 'heart', r, beat === 0 ? 0.9 : 0.7);
      pulse.add(b * 4 + beat + 0.5, 0.45, 'heart', r, beat === 0 ? 0.5 : 0.38);
    }
  }

  const pad = new Seq();
  for (let q = 0; q < 8; q++) {
    const c = C[q]!;
    for (const n of voicing(tn, c, tn - 12, tn + 17, 4)) pad.add(q * 16, 17, 'str', n, n < tn ? 0.5 : 0.4, 0, 2.5);
  }

  const tex = new Seq();
  tex.add(0, 64.5, 'air', 0, 1, 0, 6500);
  tex.add(64, 64.5, 'air', 0, 1, 0, 8200);
  tex.add(0, N * 4, 'rumble', 0, 0.8);
  if (noir) tex.add(0, N * 4, 'crackle', 0, 0.8);
  tex.add(3 * 4 + 2.5, 0, 'metal', 0, 0.7, -0.5, 0.55);
  tex.add(13 * 4 + 3, 0, 'plate', 0, 0.45, 0.6, 0.45);
  tex.add(22 * 4 + 1.5, 0, 'metal', 0, 0.6, 0.4, 0.5);
  tex.add(29 * 4 + 3.5, 0, 'plate', 0, 0.4, -0.6, 0.5);
  if (!noir) {
    tex.add(6 * 4, 8, 'harm', tn + 72, 0.5, 0.4, 2.5);
    tex.add(17 * 4, 8, 'harm', tn + 79, 0.4, -0.4, 2.5);
    tex.add(26 * 4, 8, 'harm', tn + 72, 0.45, 0.2, 2.5);
  }

  const perc = new Seq();
  const PERC: [number, number, Hit, number][][] = [
    [[6, 0.5, 'rim', 1]],
    [],
    [[10, 0.45, 'rim', 1], [14, 0.6, 'taiko', 1.6]],
    [[6, 0.45, 'rim', 1], [7, 0.25, 'rim', 1.05]],
    [],
    [[11, 0.45, 'rim', 1]],
    [[6, 0.45, 'rim', 1], [12, 0.35, noir ? 'brush' : 'shaker', 1]],
    [],
  ];
  for (let b = 0; b < N; b++) {
    const block = Math.floor(b / 8);
    for (const [slot, vel, v, p] of PERC[b % 8]!) {
      const sl = b % 8 === 2 && v === 'taiko' && block % 2 === 1 ? 12 : slot;
      perc.add(s16(b, sl, sw), 0, v, 0, vel, v === 'rim' ? 0.35 : -0.2, p);
    }
    if (block === 2 && b % 8 === 4) perc.add(s16(b, 3, sw), 0, 'rim', 0, 0.4, 0.35);
    if (noir && b % 2 === 0) perc.add(s16(b, 4, sw), 0, 'brush', 0, 0.35, -0.3);
  }

  const frag = new Seq();
  const fo = sk.fragOct;
  if (sk.id === 'A') {
    play(frag, tb(T, 0), 8 * 4, 'pizz', 0.85, fo);
    play(frag, tb(T, 1), 18 * 4, 'farHorn', 0.8, -12);
    play(frag, tb(T, 2), 26 * 4, 'pizz', 0.85, fo);
    play(frag, tb(T, 3), 27 * 4, 'pizz', 0.75, fo);
  } else {
    play(frag, tb(T, 0), 8 * 4, 'pizz', 0.85, fo);
    play(frag, tb(T, 2), 18 * 4, 'farHorn', 0.8, -12);
    play(frag, tb(T, 1), 26 * 4, 'pizz', 0.85, fo);
  }

  // ---- Cautious
  const brk = new Seq();
  for (let b = 0; b < N; b++) {
    halfBar(brk, sk, b, sw, 0.85, b, b === 15);
    if (b === N - 1) stutter(brk, b * 4 + 3, 1, 8, 'snare', 0.55, 0.5);
  }

  const hk = new Seq();
  for (let b = 0; b < N; b++) {
    const c = chordAt(b);
    const sh = shiftTo(sk, c);
    const fullHook = Math.floor(b / 8) % 2 === 1;
    if (b % 2 === 0) hook(hk, sk, b, 0, 'pizz', 0.85, sh, sw8);
    else if (fullHook) hook(hk, sk, b, 1, 'pizz', 0.85, sh, sw8);
    else hk.add(b * 4, 1.5, 'pizz', tn + sh, 0.7);
  }

  const tens = new Seq();
  const ostSlots = noir ? [0, 3, 6, 8, 11, 14] : [0, 2, 4, 6, 8, 10, 12, 14];
  for (let b = 0; b < N; b++) {
    const local = b % 8;
    const r = chordBass(tn, chordAt(b), tn + 7);
    if (local !== 7) {
      for (const sl of ostSlots) tens.add(s16(b, sl, sw), 0.4, 'strSpicc', r, sl % 4 === 0 ? 0.6 : 0.42, sl % 8 === 0 ? -0.2 : 0.2);
    }
    if (local === 6) for (const iv of [12, 13, 18]) tens.add(b * 4, 8, 'strTrem', tn + iv, 0.5, iv === 13 ? 0.3 : -0.2, 5.5);
    if (local === 7) {
      tens.add(b * 4, 4, 'riser', 0, 0.5);
      tens.add(b * 4 + 2, 2, 'swell', 0, 0.5);
    }
  }

  const lead = new Seq();
  play(lead, [...tb(T, 0), ...tb(T, 1)], 4 * 4, 'mutedHorn', 0.75, -12);
  play(lead, [...tb(T, 2), ...tb(T, 3)], 12 * 4, 'mutedHorn', 0.75, -12);
  play(lead, tb(T, 0), 20 * 4, 'mutedHorn', 0.8, -12);
  play(lead, tb(T, sk.id === 'A' ? 1 : 2), 28 * 4, 'mutedHorn', 0.75, -12);

  const id = `low-${sk.id}`;
  const L = (lid: string, name: string, s: Seq, level: number, fx: Fx, o: { mono?: boolean; rate?: number; mix: Record<MusicState, number> }): LayerDef =>
    layer(`${id}-${lid}`, name, 'low', bpm, N, s, level, fx, o);
  return {
    id,
    name: `Mission ${sk.id} - Calm and Cautious`,
    group: 'low',
    bpm,
    bars: N,
    layers: [
      L('pulse', 'Calm: heartbeat pulse', pulse, -36, { room: 0.15, hall: 0, far: 0.1, lp: 900 }, { mono: true, rate: 16000, mix: CALM_MIX(0.8) }),
      L('pad', 'Calm: low strings', pad, -38, { room: 0, hall: 0.35, far: 0.2, lp: 700 }, { rate: 24000, mix: CALM_MIX(0.8) }),
      L('tex', 'Calm: cold texture', tex, -44, { room: 0, hall: 0.1, far: 0.7 }, { mix: CALM_MIX(0.7) }),
      L('perc', 'Calm: sparse percussion', perc, -42, { room: 0.3, hall: 0, far: 0.45, lp: 3200 }, { rate: 24000, mix: CALM_MIX(0.5) }),
      L('frag', 'Calm: theme fragments', frag, -35, { room: 0.1, hall: 0.2, far: 0.35, lp: 1500 }, { rate: 24000, mix: CALM_MIX(0.6) }),
      L('break', 'Cautious: half-time break', brk, -31, { room: 0.35, hall: 0, far: 0.08, drive: 1.8, lp: 7000, hp: 35 }, { mix: CAUTION_MIX }),
      L('hook', 'Cautious: bass hook', hk, -31, { room: 0.2, hall: 0, far: 0.05, lp: 1400 }, { mono: true, rate: 24000, mix: CAUTION_MIX }),
      L('tens', 'Cautious: tension strings', tens, -33, { room: 0.15, hall: 0.3, far: 0.15, lp: 2600 }, { rate: 24000, mix: CAUTION_MIX }),
      L('lead', 'Cautious: theme fragments (horn)', lead, -32, { room: 0.1, hall: 0.3, far: 0.2, lp: 1600, delay: { beats: 0.75, fb: 0.35, wet: 0.25 } }, { rate: 24000, mix: CAUTION_MIX }),
    ],
  };
}

/** Alert + Evasion: one 48-bar loop at 1.5 times the low tempo, started from its top after each stinger. */
export function alertPlan(sk: SketchDef): Plan {
  const T = themeBars(sk);
  const C = sk.chords;
  const tn = sk.tonic;
  const noir = sk.feel === 'noir';
  const kit = kitOf(sk);
  const sw = sk.swing * 0.5;
  const sw8 = swing8Of(sk, true);
  const bpm = sk.alertBpm;
  const N = 48;
  const darkBass: Voice = noir ? 'reese' : 'darkBass';
  const BREAK = [C[0]!, C[0]!, C[1]!, C[1]!, C[0]!, C[0]!, C[6]!, C[6]!];
  const sectionOf = (b: number): number => Math.floor(b / 8);
  const isTheme = (b: number): boolean => [1, 3, 5].includes(sectionOf(b));
  const chordAt = (b: number): Chord => {
    const sec = sectionOf(b);
    const i = b % 8;
    if (sec === 4) return BREAK[i]!;
    if (isTheme(b)) return C[i]!;
    return i < 6 ? C[0]! : i === 6 ? C[4]! : C[6]!;
  };

  // drums
  const dr = new Seq();
  for (let b = 0; b < N; b++) {
    const sec = sectionOf(b);
    const i = b % 8;
    if (sec === 4) {
      drums(dr, b, 'kick', 'X.........x.....', 0.85, sw);
      drums(dr, b, noir ? 'shaker' : 'hat', 'o.g.o.g.o.g.o.g.', 0.6, sw, 1, 0.2);
      dr.add(b * 4, 0, 'taiko', 0, 0.55, -0.2, 0.9);
      dr.add(b * 4 + 0.5, 0, 'taiko', 0, 0.35, 0.2, 0.9);
      if (i >= 4 && i < 6) drums(dr, b, 'snare', '........X.......', 0.85, sw);
      if (i === 6) for (let k = 0; k < 8; k++) dr.add(b * 4 + k * 0.5, 0, 'snare', 0, 0.3 + 0.06 * k);
      if (i === 7) roll(dr, b * 4, b * 4 + 4, 0.35, 1);
      continue;
    }
    fullBar(dr, sk, b, sw, 0.95, i);
    if (isTheme(b)) {
      if (i % 2 === 0 || sec === 3) for (const sl of kit.taiko) taiko(dr, s16(b, sl, sw), sl === 0 ? 0.9 : 0.65);
    } else if (i % 2 === 0) taiko(dr, b * 4, 0.7);
  }
  for (const b of [0, 8, 24, 40]) impact(dr, b * 4, 1);
  dr.add(16 * 4, 0, 'crash', 0, 0.6, -0.2);

  // bass hook
  const hk = new Seq();
  for (let b = 0; b < N; b++) {
    const sec = sectionOf(b);
    const i = b % 8;
    const c = chordAt(b);
    const sh = shiftTo(sk, c);
    for (const v of ['pizz', darkBass] as Voice[]) {
      const vel = v === 'pizz' ? 0.9 : 0.6;
      if (sec === 4) {
        if (i < 4) {
          if (v !== 'pizz') for (let k = 0; k < 8; k++) hk.add(b * 4 + k * 0.5, 0.4, v, tn + sh, k % 2 ? 0.45 : 0.6);
        } else if (i < 6) hook(hk, sk, b, 0, v, vel * 0.9, sh, sw8);
        else hook(hk, sk, b, (i - 6) as 0 | 1, v, vel, sh, sw8);
      } else if (isTheme(b)) {
        hook(hk, sk, b, i === 7 ? 1 : 0, v, vel, i === 7 ? 0 : sh, sw8);
      } else if (i >= 6) {
        hook(hk, sk, b, (i - 6) as 0 | 1, v, vel, sh, sw8);
      } else {
        hook(hk, sk, b, (b % 2) as 0 | 1, v, vel, 0, sw8);
      }
    }
  }

  // brass
  const br = new Seq();
  const stabAt = (b: number, vel: number): void => {
    const vs = voicing(tn, chordAt(b), tn, tn + 22, 5);
    for (const sl of kit.stab) for (const n of vs) br.add(s16(b, sl, sw), 0.45, 'brass', n, sl === 0 ? vel : vel * 0.8, 0, 0.012);
  };
  for (let b = 0; b < N; b++) {
    const sec = sectionOf(b);
    const i = b % 8;
    if (sec === 0) {
      if (i === 7) for (const n of voicing(tn, chordAt(b), tn, tn + 22, 5)) br.add(b * 4, 4, 'brass', n, 0.75, 0, 3.2);
      else if (i % 2 === 0) stabAt(b, 0.8);
      else for (const n of voicing(tn, chordAt(b), tn, tn + 22, 5)) br.add(b * 4, 0.45, 'brass', n, 0.7, 0, 0.012);
    } else if (sec === 1) {
      for (const n of voicing(tn, chordAt(b), tn - 2, tn + 19, 4)) br.add(b * 4, 3.9, 'brass', n, 0.45, 0, 0.3);
    } else if (sec === 2) {
      if (i % 2 === 1) stabAt(b, 0.85);
      if (i === 7) for (const n of voicing(tn, chordAt(b), tn, tn + 22, 5)) br.add(b * 4 + 2, 2, 'brass', n, 0.8, 0, 1.6);
    } else if (sec === 4) {
      if (i % 2 === 0 && i < 6) {
        const cl = i === 4 ? [0, 6, 13] : [0, 1, 6];
        for (const iv of cl) br.add(b * 4, 8, 'brass', tn + 12 + iv, 0.55 + i * 0.03, 0, 5);
      }
      if (i === 6) for (const n of voicing(tn, chordAt(b), tn, tn + 22, 5)) br.add(b * 4, 8, 'brass', n, 0.85, 0, 4.5);
    }
  }
  for (const [from, harm] of [[24, false], [40, true]] as const) {
    play(br, T.flat(), from * 4, 'brass', 0.82, -12, 0.04);
    for (let b = from; b < from + 8; b++) br.add(b * 4, 3.8, 'brass', chordBass(tn, chordAt(b), tn - 7), 0.6, 0, 0.05);
    if (harm) {
      let t = 0;
      for (const note of T.flat()) {
        const bar = from + Math.floor(t / 4);
        if (note.n !== null) br.add(from * 4 + t, note.d * 0.92, 'brass', harmonyBelow(tn, chordAt(bar), note.n) - 12, 0.62, 0, 0.04);
        t += note.d;
      }
    }
  }

  // strings
  const st = new Seq();
  for (let b = 0; b < N; b++) {
    const sec = sectionOf(b);
    const i = b % 8;
    if (sec === 4) {
      if (i % 4 === 0) {
        for (const iv of [36, 37, 42]) st.add(b * 4, 16, 'strTrem', tn + iv, 0.35, iv === 37 ? 0.4 : -0.3, 6);
        for (const iv of [12, 13]) st.add(b * 4, 16, 'strTrem', tn + iv, 0.45, 0, 4);
      }
      continue;
    }
    const r = chordBass(tn, chordAt(b), tn + 7);
    for (let k = 0; k < 16; k++) {
      const iv = kit.ost[k % 4]!;
      st.add(s16(b, k, sw), 0.22, 'strSpicc', r + iv, k % 4 === 0 ? 0.62 : 0.42, k % 2 ? 0.3 : -0.3);
    }
    if (sec === 1) for (const n of voicing(tn, chordAt(b), tn + 26, tn + 41, 3)) st.add(b * 4, 4.1, 'strHi', n, 0.25, 0, 0.5);
  }
  play(st, T.flat(), 24 * 4, 'strHi', 0.55, 12);
  play(st, T.flat(), 40 * 4, 'strHi', 0.5, 12);

  // lead: the theme on the horn section
  const ld = new Seq();
  play(ld, T.flat(), 8 * 4, 'horn', 0.78, 0, 3);
  play(ld, T.flat(), 24 * 4, 'horn', 0.92, 0, 3);
  play(ld, T.flat(), 40 * 4, 'horn', 0.85, 0, 3);

  // effects: risers, reverse swells into each section, glitch edits, the tritone alarm in the breakdown
  const fx = new Seq();
  for (const b of [6, 22, 38, 46]) fx.add(b * 4, 8, 'riser', 0, 0.8);
  for (const b of [8, 16, 24, 32, 40, 48]) fx.add(b * 4 - 2, 2, 'swell', 0, 0.7);
  for (let b = 0; b < N; b++) {
    const i = b % 8;
    if (sectionOf(b) === 4) {
      for (const beat of [0, 1, 2, 3]) {
        fx.add(b * 4 + beat, 0, 'metal', 0, 0.42, beat % 2 ? 0.5 : -0.5, beat % 2 ? 1.4142 : 1);
      }
      continue;
    }
    if (i === 7) stutter(fx, b * 4 + 3, 1, noir ? 12 : 8, 'snare', 0.5, 0.6);
    if (noir && i === 3) stutter(fx, b * 4 + 3.5, 0.5, 6, 'plate', 0.4, 0.8);
    if (noir && i % 2 === 1) fx.add(b * 4 + 1.5, 0, 'metal', 0, 0.3, 0.6, 2.1);
  }

  const id = `alert-${sk.id}`;
  const L = (lid: string, name: string, s: Seq, level: number, f: Fx, o: { mono?: boolean; rate?: number; mix: Record<MusicState, number> }): LayerDef =>
    layer(`${id}-${lid}`, name, 'alert', bpm, N, s, level, f, o);
  return {
    id,
    name: `Mission ${sk.id} - Alert and Evasion`,
    group: 'alert',
    bpm,
    bars: N,
    layers: [
      L('drums', 'Alert: drums and taiko', dr, -22, { room: 0.35, hall: 0.1, far: 0, drive: 2.2, lp: 10000, hp: 30 }, { mix: ALERT_MIX(0.8) }),
      L('hook', 'Alert: bass hook', hk, -23, { room: 0.15, hall: 0, far: 0, drive: 1.5, lp: 2500 }, { mono: true, rate: 24000, mix: ALERT_MIX(0.9) }),
      L('str', 'Alert: strings', st, -25, { room: 0.1, hall: 0.35, far: 0.05 }, { mix: ALERT_MIX(0.8) }),
      L('brass', 'Alert: low brass', br, -23, { room: 0.1, hall: 0.4, far: 0.05 }, { rate: 24000, mix: ALERT_MIX(0) }),
      L('lead', 'Alert: horns (theme)', ld, -24, { room: 0.1, hall: 0.45, far: 0.05 }, { rate: 24000, mix: ALERT_MIX(0) }),
      L('fx', 'Alert: risers and glitch', fx, -28, { room: 0.2, hall: 0.3, far: 0.2, drive: 1.3 }, { mix: ALERT_MIX(0.7) }),
    ],
  };
}

/** The stinger: an instant hit, then a two-beat roll into the Alert downbeat. `short` = the hit only, for repeats. */
export function stinger(sk: SketchDef, short: boolean): LayerDef {
  const s = new Seq();
  const tn = sk.tonic;
  taiko(s, 0, 1, 0.9);
  s.add(0, 0, 'kick', 0, 1);
  s.add(0, 6, 'boom', 0, 1);
  s.add(0, 0, 'crash', 0, 0.75);
  s.add(0, 0, 'metal', 0, 0.8, 0.3, 0.7);
  for (const iv of [0, 7, 12, 13, 18]) s.add(0, short ? 1 : 1.6, 'brass', tn + iv, 1, 0, 0.01);
  for (const iv of [36, 37, 42]) s.add(0, short ? 1 : 1.6, 'strTrem', tn + iv, 0.7, iv === 37 ? 0.4 : -0.4, 0.02);
  if (!short) {
    roll(s, 0.5, 2, 0.25, 0.95);
    s.add(0.5, 1.5, 'swell', 0, 0.8);
  }
  return layer(`stinger-${sk.id}${short ? '-short' : ''}`, short ? 'Stinger (repeat)' : 'Stinger', 'shot', sk.alertBpm, 1, s, short ? -21 : -17, {
    room: 0.3,
    hall: 0.45,
    far: 0.1,
    drive: 1.4,
  });
}

export function missionPlans(sk: SketchDef): Mission {
  return { low: lowPlan(sk), alert: alertPlan(sk), stinger: stinger(sk, false), stingerShort: stinger(sk, true) };
}

/** The theme alone on a plain tone, twice, for the "is it hummable" test. */
export function melodyShot(sk: SketchDef): LayerDef {
  const s = new Seq();
  play(s, sk.theme, 0, 'melody', 0.85, 0, 1, 0.9);
  play(s, sk.theme, 32, 'melody', 0.85, 0, 1, 0.9);
  return layer(`melody-${sk.id}`, `Theme ${sk.id} alone`, 'shot', sk.lowBpm, 16, s, -20, { room: 0.25, hall: 0.15, far: 0 }, { rate: 32000 });
}

/** The bass hook alone, four times. */
export function hookShot(sk: SketchDef): LayerDef {
  const s = new Seq();
  for (let b = 0; b < 8; b++) hook(s, sk, b, (b % 2) as 0 | 1, 'pizz', 0.9, 0, swing8Of(sk));
  return layer(`hook-${sk.id}`, `Hook ${sk.id} alone`, 'shot', sk.lowBpm, 8, s, -20, { room: 0.25, hall: 0.05, far: 0, lp: 2000 }, { rate: 24000 });
}
