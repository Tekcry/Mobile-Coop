/**
 * Stage V1 (round 2): three candidate figures (direction v2 Section 5) and the three takes the motif picker plays for
 * each, in the noir-electronic language of the score:
 * - **sneak** (84 BPM): a dusty, swung downtempo beat; the figure on upright bass, then on a muted horn.
 * - **break** (168 BPM): a chopped breakbeat; the figure on the reese bass, answered by chopped string stabs.
 * - **noir** (70 BPM, the menu's opening 8 bars): rain, low strings, the figure on bass, horn and stabs, a reversed swell.
 *
 * Pure: it turns a candidate and a start time into `MusicEvent`s for a sink, so the lab, the offline WAV export and the
 * tests hear the same thing. Every figure here was written for this project from the rules in direction v2 5.1. Steps
 * and lengths are eighth notes over two bars of 4/4; pitches are semitones from D in each instrument's own octave.
 */
import type { MusicEvent, PlayEvent, Sink } from './conductor';
import { D2, semis } from './library';
import type { MotifNote } from './motif';
import { PRIO } from './voices';

export type CandidateId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type Take = 'sneak' | 'break' | 'noir';
export const TAKES: readonly Take[] = ['sneak', 'break', 'noir'];
export const TAKE_BPM: Record<Take, number> = { sneak: 84, break: 168, noir: 70 };

export interface Candidate {
  id: CandidateId;
  name: string;
  /** Pitch names of the statement, for the lab. */
  notes: string;
  /** One line on its character, for the lab. */
  about: string;
  statement: readonly MotifNote[];
  /** The tension note(s) changed so it lands home on D (success results, objective stinger). */
  resolved: readonly MotifNote[];
}

const m = (step: number, s: number, len: number): MotifNote => ({ step, semis: s, len });

export const CANDIDATES: readonly Candidate[] = [
  {
    id: 'A',
    name: 'Wire',
    notes: 'D D Eb Ab G F',
    about: 'A semitone creep up, a jump to the tritone, then a slow slide down to F, left hanging.',
    statement: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, 6, 2), m(10, 5, 1), m(11, 3, 5)],
    resolved: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, 7, 2), m(10, 5, 1), m(11, 0, 5)],
  },
  {
    id: 'B',
    name: 'Dead Drop',
    notes: 'D D F Eb C D',
    about: 'A low, swung bass riff that circles D: up to F, a flat second on the way down, home. The most groove-led.',
    statement: [m(0, 0, 1), m(2, 0, 1), m(3, 3, 2), m(5, 1, 3), m(10, -2, 2), m(12, 0, 4)],
    resolved: [m(0, 0, 1), m(2, 0, 1), m(3, 3, 2), m(5, 2, 3), m(10, -2, 2), m(12, 0, 4)],
  },
  {
    id: 'C',
    name: 'Long Night',
    notes: 'A Ab G F D',
    about: 'A slow chromatic fall from A through the tritone to D. Sparse; the space between notes does the work.',
    statement: [m(0, 7, 3), m(3, 6, 3), m(6, 5, 3), m(9, 3, 1), m(12, 0, 4)],
    resolved: [m(0, 7, 3), m(3, 7, 3), m(6, 5, 3), m(9, 3, 1), m(12, 0, 4)],
  },
  // round 3 (Michael likes the tritone in A): five figures built around it
  {
    id: 'D',
    name: 'Wire Drop',
    notes: 'D D F Ab G F',
    about: "B's low swung pick-ups, then A's climb to the tritone and slide down to F. A and B blended.",
    statement: [m(0, 0, 1), m(2, 0, 1), m(3, 3, 2), m(5, 6, 3), m(10, 5, 1), m(11, 3, 5)],
    resolved: [m(0, 0, 1), m(2, 0, 1), m(3, 3, 2), m(5, 7, 3), m(10, 5, 1), m(11, 0, 5)],
  },
  {
    id: 'E',
    name: 'Lights Out',
    notes: 'D Ab G A',
    about: 'Four notes: a fall of a tritone straight away, a sigh down to G, and up to an open A. The most spacious.',
    statement: [m(0, 0, 3), m(3, -6, 3), m(6, -7, 2), m(8, -5, 8)],
    resolved: [m(0, 0, 3), m(3, -4, 3), m(6, -7, 2), m(8, 0, 8)],
  },
  {
    id: 'F',
    name: 'Crossed Line',
    notes: 'A Eb D F Eb D',
    about: 'Opens on the tritone itself (A down to Eb), then circles D through the flat second. Uneasy from the first note.',
    statement: [m(0, 7, 2), m(3, 1, 3), m(6, 0, 2), m(9, 3, 1), m(10, 1, 2), m(12, 0, 4)],
    resolved: [m(0, 7, 2), m(3, 2, 3), m(6, 0, 2), m(9, 3, 1), m(10, 2, 2), m(12, 0, 4)],
  },
  {
    id: 'G',
    name: 'Two Shadows',
    notes: 'D Ab F B A D',
    about: 'Two tritones in a row: up D to Ab, then down F to B, settling on A and home. The most restless.',
    statement: [m(0, 0, 1), m(1, 6, 3), m(4, 3, 2), m(6, -3, 2), m(8, -5, 4), m(12, 0, 4)],
    resolved: [m(0, 0, 1), m(1, 7, 3), m(4, 3, 2), m(6, -4, 2), m(8, -5, 4), m(12, 0, 4)],
  },
  {
    id: 'H',
    name: 'Pacing',
    notes: 'F Ab G Ab D',
    about: 'Paces back and forth on the tritone (Ab, G, Ab) before dropping home to D. Hypnotic, ostinato-like.',
    statement: [m(0, 3, 2), m(2, 6, 1), m(3, 5, 3), m(6, 6, 2), m(8, 0, 8)],
    resolved: [m(0, 3, 2), m(2, 7, 1), m(3, 5, 3), m(6, 7, 2), m(8, 0, 8)],
  },
];

export function candidate(id: CandidateId): Candidate {
  return CANDIDATES.find((c) => c.id === id)!;
}

/** The broken form (failure results): the last note never comes; the one before it is held. */
export function broken(notes: readonly MotifNote[]): MotifNote[] {
  const out = notes.slice(0, -1).map((n) => ({ ...n }));
  const last = out[out.length - 1]!;
  last.len = 16 - last.step;
  return out;
}

// ------------------------------------------------------------------ takes

type Emit = (e: Omit<PlayEvent, 'k'>) => void;

const LAYERS = ['pad', 'bed', 'crackle', 'm0', 'm1', 'm2', 'msub'];
/** The reese is rendered at 73.5 Hz; this puts it on D2. */
const REESE_D = D2 / 73.5;
/** Downtempo swing: the off-beat eighth lands at 57 % of the beat. */
const SWING = 0.57;

function emitter(sink: Sink): Emit {
  return (e) => sink({ k: 'play', ...e } as MusicEvent);
}

/** Seconds a take lasts (its last note's tail included), at its own tempo. */
export function takeLength(take: Take): number {
  const bar = (60 / TAKE_BPM[take]) * 4;
  if (take === 'sneak') return 5 * bar + 2;
  if (take === 'break') return 9 * bar + 2;
  return 8 * bar + 2;
}

/** Play one take of a candidate from time t. Returns the time it ends. */
export function playTake(sink: Sink, c: Candidate, take: Take, t: number): number {
  const emit = emitter(sink);
  if (take === 'sneak') sneakTake(emit, c, t);
  else if (take === 'break') breakTake(emit, c, t);
  else noirTake(emit, c, t);
  const end = t + takeLength(take);
  for (const layer of LAYERS) sink({ k: 'stop', layer, t: end - 1.5, fade: 1 });
  return end;
}

/** All three takes back to back (the 60 s WAV and the "Play" button). Returns the end time. */
export function playAllTakes(sink: Sink, c: Candidate, t: number): number {
  let at = t;
  for (const take of TAKES) at = playTake(sink, c, take, at) - 0.6;
  return at + 0.6;
}

/** Time of a 16th step with swing on the off-beat eighths. */
function swung(bt: number, s: number, s16: number): number {
  return bt + s * s16 + (s % 4 === 2 ? (SWING - 0.5) * 4 * s16 : 0);
}

interface FigureOpts {
  id: string;
  gain: number;
  stem: PlayEvent['stem'];
  /** Held notes (`dur`) for the horn; single hits for the rest. */
  held: boolean;
  send?: number;
  pan?: number;
}

function figure(emit: Emit, notes: readonly MotifNote[], at: number, e8: number, o: FigureOpts): void {
  for (const n of notes) {
    emit({
      id: o.id,
      t: at + n.step * e8,
      stem: o.stem,
      gain: o.gain,
      rate: semis(n.semis),
      pan: o.pan ?? 0,
      prio: PRIO.motif,
      reverb: 'hall',
      send: o.send ?? 0.3,
      ...(o.held ? { dur: n.len * e8 * 0.95, fadeOut: 0.35 } : {}),
    });
  }
}

/**
 * Sneak, 84 BPM: a dusty swung beat with line crackle and a low string pad. Bar 0 is beat and a bass pedal; bars 1-2
 * the figure on upright bass (a far, soft bell touches its first note); bars 3-4 the figure on a muted horn while the bass
 * holds D.
 */
function sneakTake(emit: Emit, c: Candidate, t: number): void {
  const s16 = 60 / TAKE_BPM.sneak / 4;
  const e8 = s16 * 2;
  const bar = s16 * 16;
  emit({ id: 'static', t, stem: 'TEX', gain: 0.25, rate: 1, pan: 0, prio: PRIO.bed, layer: 'crackle', fadeIn: 0.5 });
  emit({ id: 'strings', t, stem: 'HARM', gain: 0.12, rate: 1, pan: 0, prio: PRIO.harm, layer: 'pad', fadeIn: 2, reverb: 'hall', send: 0.4 });
  for (let b = 0; b < 5; b++) {
    const bt = t + b * bar;
    for (let s = 0; s < 16; s++) {
      const st = swung(bt, s, s16);
      if (s === 0 || s === 10) emit({ id: 'kickRound', t: st, stem: 'PULSE', gain: 0.8, rate: 1, pan: 0, prio: PRIO.drum });
      if (s === 4 || s === 12) emit({ id: 'snare', t: st, stem: 'PULSE', gain: 0.45, rate: 0.82, pan: 0, prio: PRIO.drum, reverb: 'room', send: 0.35 });
      if (s === 7 || s === 15) emit({ id: 'ghost', t: st, stem: 'PULSE', gain: 0.18, rate: 0.85, pan: 0.1, prio: PRIO.drum });
      if (s % 2 === 0 && s !== 0) emit({ id: 'hatC', t: st, stem: 'PULSE', gain: s % 4 === 2 ? 0.07 : 0.1, rate: 0.8, pan: 0.25, prio: PRIO.drum });
      if (s === 14 && b % 2 === 1) emit({ id: 'relay0', t: st, stem: 'TEX', gain: 0.2, rate: 1, pan: -0.4, prio: PRIO.tex, reverb: 'room', send: 0.4 });
    }
    // the bass pedal where the figure is not on the bass
    if (b === 0 || b >= 3) emit({ id: 'upright', t: bt, stem: 'BASS', gain: 0.55, rate: 1, pan: 0, prio: PRIO.bass });
  }
  figure(emit, c.statement, t + bar, e8, { id: 'upright', gain: 0.65, stem: 'BASS', held: false, send: 0.15 });
  emit({ id: 'darkbell', t: t + bar, stem: 'MOTIF', gain: 0.18, rate: semis(c.statement[0]!.semis), pan: 0.4, prio: PRIO.motif, reverb: 'hall', send: 0.9 });
  figure(emit, c.statement, t + 3 * bar, e8, { id: 'horn', gain: 0.45, stem: 'MOTIF', held: true, send: 0.45 });
}

const KICKS: readonly (readonly number[])[] = [
  [0, 10],
  [0, 7, 10],
  [0, 10, 13],
  [0, 6, 10],
];

/**
 * Break, 168 BPM: a chopped break (the half-time bar 4 lets it breathe), the reese bass on the figure (bars 1-2, 5-6),
 * answered by chopped string stabs with metal (3-4, 7-8), a stuttered fill into a final hit.
 */
function breakTake(emit: Emit, c: Candidate, t: number): void {
  const s16 = 60 / TAKE_BPM.break / 4;
  const e8 = s16 * 2;
  const bar = s16 * 16;
  for (let b = 0; b < 9; b++) {
    const bt = t + b * bar;
    const half = b === 4;
    const kick = KICKS[b % KICKS.length]!;
    for (let s = 0; s < 16; s++) {
      const st = bt + s * s16;
      const fill = b === 8 && s >= 12;
      if (half) {
        if (s === 0) emit({ id: 'kickTight', t: st, stem: 'BREAK', gain: 0.9, rate: 1, pan: 0, prio: PRIO.drum });
        if (s === 8) emit({ id: 'snare', t: st, stem: 'BREAK', gain: 0.75, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'room', send: 0.2 });
      } else {
        if (kick.includes(s)) emit({ id: 'kickTight', t: st, stem: 'BREAK', gain: 0.9, rate: 1, pan: 0, prio: PRIO.drum });
        if ((s === 4 || s === 12) && !fill) emit({ id: 'snare', t: st, stem: 'BREAK', gain: 0.75, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'room', send: 0.12 });
        if ((s === 9 || s === 14) && !fill) emit({ id: 'ghost', t: st, stem: 'BREAK', gain: 0.2, rate: 1.05, pan: 0.15, prio: PRIO.drum });
      }
      if (s % 2 === 0 && !fill) emit({ id: 'hatC', t: st, stem: 'BREAK', gain: s % 4 === 0 ? 0.16 : 0.1, rate: 1, pan: 0.2, prio: PRIO.drum });
      // the stutter: one snare slice repeated and pitched up
      if (fill) emit({ id: 'snare', t: st, stem: 'GLITCH', gain: 0.4 + (s - 12) * 0.1, rate: 1 + (s - 12) * 0.08, pan: 0, prio: PRIO.drum });
      if (s === 3 && b % 2 === 1) emit({ id: 'click1', t: st, stem: 'METAL', gain: 0.3, rate: 1, pan: -0.3, prio: PRIO.metal });
    }
    // reese pedal under the bars where the stabs answer
    if (b === 0 || b === 3 || b === 4 || b === 7 || b === 8) {
      emit({ id: 'reese', t: bt, stem: 'BASS', gain: 0.75, rate: REESE_D, pan: 0, prio: PRIO.bass, dur: bar * 0.9, fadeOut: 0.05 });
    }
  }
  const reese = (at: number): void => {
    for (const n of c.statement) {
      emit({ id: 'reese', t: at + n.step * e8, stem: 'BASS', gain: 0.85, rate: semis(n.semis) * REESE_D, pan: 0, prio: PRIO.bass, dur: n.len * e8 * 0.9, fadeOut: 0.03 });
    }
  };
  const stabs = (at: number): void => {
    figure(emit, c.statement, at, e8, { id: 'stab', gain: 0.4, stem: 'MOTIF', held: false, send: 0.25 });
    for (const n of c.statement) emit({ id: 'plate', t: at + n.step * e8, stem: 'METAL', gain: 0.18, rate: 1, pan: 0.3, prio: PRIO.metal });
  };
  reese(t + bar);
  stabs(t + 3 * bar);
  reese(t + 5 * bar);
  stabs(t + 7 * bar);
  const end = t + 9 * bar;
  emit({ id: 'kickTight', t: end, stem: 'BREAK', gain: 1, rate: 1, pan: 0, prio: PRIO.stinger });
  emit({ id: 'boom', t: end, stem: 'METAL', gain: 0.7, rate: 1, pan: 0, prio: PRIO.stinger });
  emit({ id: 'stab', t: end, stem: 'MOTIF', gain: 0.6, rate: 1, pan: 0, prio: PRIO.stinger, reverb: 'hall', send: 0.4 });
}

/** Noir chords per bar (semitones from D3 for three string voices) and the sub root (from D2). */
const NOIR_CHORDS: { v: [number, number, number]; root: number }[] = [
  { v: [0, 3, 7], root: 0 }, // Dm
  { v: [0, 3, 7], root: 0 },
  { v: [-4, 0, 5], root: -4 }, // Bb with D and G: open and uneasy
  { v: [-4, 0, 5], root: -4 },
  { v: [-7, -4, 1], root: -7 }, // Gm with the Eb rub
  { v: [-7, -4, 1], root: -7 },
  { v: [-5, -2, 1], root: -5 }, // A7b9 shell
  { v: [0, 3, 7], root: 0 }, // Dm
];

/**
 * Noir, 70 BPM (the menu's opening 8 bars): rain, crackle and low strings, a slow pulse. The figure on upright bass
 * (bars 1-2), then the muted horn (3-4); a reversed string swell rises into bar 5, where stabs take the figure over the
 * bass; the horn brings the resolved form home (7-8) with a far, soft bell.
 */
function noirTake(emit: Emit, c: Candidate, t: number): void {
  const s16 = 60 / TAKE_BPM.noir / 4;
  const e8 = s16 * 2;
  const bar = s16 * 16;
  emit({ id: 'rainbed', t, stem: 'AIR', gain: 0.22, rate: 1, pan: 0, prio: PRIO.bed, layer: 'bed', fadeIn: 2 });
  emit({ id: 'static', t, stem: 'TEX', gain: 0.18, rate: 1, pan: 0, prio: PRIO.bed, layer: 'crackle', fadeIn: 2 });
  for (let b = 0; b < 8; b++) {
    const ch = NOIR_CHORDS[b]!;
    const bt = t + b * bar;
    const was = NOIR_CHORDS[b - 1];
    if (!was || was.root !== ch.root || was.v[2] !== ch.v[2]) {
      for (let v = 0; v < 3; v++) {
        emit({ id: 'strings', t: bt, stem: 'HARM', gain: 0.16, rate: semis(ch.v[v]!), pan: (v - 1) * 0.45, prio: PRIO.harm, layer: `m${v}`, fadeIn: b === 0 ? 2 : 0.8, reverb: 'hall', send: 0.5 });
      }
      emit({ id: 'sub', t: bt, stem: 'BASS', gain: 0.4, rate: semis(ch.root), pan: 0, prio: PRIO.bass, layer: 'msub', fadeIn: 0.5 });
    }
    // a slow pulse: soft kick on 1, a rim on 3, a dragged ghost
    emit({ id: 'kickRound', t: bt, stem: 'PULSE', gain: 0.4, rate: 1, pan: 0, prio: PRIO.drum });
    emit({ id: 'rim', t: swung(bt, 8, s16), stem: 'PULSE', gain: 0.12, rate: 0.9, pan: -0.2, prio: PRIO.drum, reverb: 'hall', send: 0.4 });
    emit({ id: 'ghost', t: swung(bt, 14, s16), stem: 'PULSE', gain: 0.12, rate: 0.8, pan: 0.2, prio: PRIO.drum });
  }
  emit({ id: 'boom', t, stem: 'METAL', gain: 0.25, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'hall', send: 0.5 });
  figure(emit, c.statement, t, e8, { id: 'upright', gain: 0.6, stem: 'BASS', held: false, send: 0.2 });
  figure(emit, c.statement, t + 2 * bar, e8, { id: 'horn', gain: 0.45, stem: 'MOTIF', held: true, send: 0.5 });
  // the swell ends exactly on bar 5's downbeat
  emit({ id: 'swell', t: t + 4 * bar - 1.6, stem: 'GLITCH', gain: 0.22, rate: 1, pan: 0, prio: PRIO.harm, reverb: 'hall', send: 0.3 });
  emit({ id: 'boom', t: t + 4 * bar, stem: 'METAL', gain: 0.28, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'hall', send: 0.5 });
  figure(emit, c.statement, t + 4 * bar, e8, { id: 'stab', gain: 0.25, stem: 'MOTIF', held: false, send: 0.5, pan: 0.15 });
  figure(emit, c.statement, t + 4 * bar, e8, { id: 'upright', gain: 0.5, stem: 'BASS', held: false, send: 0.15 });
  figure(emit, c.resolved, t + 6 * bar, e8, { id: 'horn', gain: 0.45, stem: 'MOTIF', held: true, send: 0.55 });
  emit({ id: 'darkbell', t: t + 7 * bar + 8 * e8, stem: 'MOTIF', gain: 0.1, rate: 1, pan: 0.4, prio: PRIO.motif, reverb: 'hall', send: 0.9 });
}

/** Every sound id the takes use (for tests). */
export const TAKE_SOUNDS = ['static', 'strings', 'kickRound', 'snare', 'ghost', 'hatC', 'relay0', 'upright', 'darkbell', 'horn', 'kickTight', 'click1', 'reese', 'stab', 'plate', 'boom', 'rainbed', 'sub', 'rim', 'swell'];
