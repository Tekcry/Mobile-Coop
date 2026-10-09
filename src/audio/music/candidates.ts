/**
 * Stage V1 (round 2): three candidate figures (direction v2 Section 5) and the three takes the motif picker plays for
 * each, in the noir-electronic language of the score:
 * - **spy** (96 BPM): cool spy-lounge jazz with an N64-style sampler grain: brushes, walking bass, vibes, muted horn.
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
export type Take = 'spy' | 'sneak' | 'break' | 'noir';
export const TAKES: readonly Take[] = ['spy', 'sneak', 'break', 'noir'];
/** What the Play button runs back to back (fits the 60 s WAV); the others have their own buttons. */
export const PLAY_ALL: readonly Take[] = ['spy', 'noir'];
export const TAKE_BPM: Record<Take, number> = { spy: 96, sneak: 84, break: 168, noir: 70 };

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
  // round 4: Michael did not like D-H; the one thing he likes is A's tritone (the Ab over D). Five variations on A.
  {
    id: 'D',
    name: 'Wire, held',
    notes: 'D Eb Ab G F',
    about: "A's creep and tritone, but the Ab arrives off the beat and is held, so it hangs over the D for longer.",
    statement: [m(0, 0, 3), m(3, 1, 2), m(5, 6, 5), m(10, 5, 2), m(12, 3, 4)],
    resolved: [m(0, 0, 3), m(3, 1, 2), m(5, 7, 5), m(10, 5, 2), m(12, 0, 4)],
  },
  {
    id: 'E',
    name: 'Wire, sunk',
    notes: 'D D Eb, low Ab G A',
    about: "A's exact rhythm, but the tritone drops below the D instead of above, and it climbs out to a low A.",
    statement: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, -6, 2), m(10, -7, 1), m(11, -5, 5)],
    resolved: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, -4, 2), m(10, -7, 1), m(11, 0, 5)],
  },
  {
    id: 'F',
    name: 'Wire, slow',
    notes: 'D Eb Ab G F',
    about: 'A at half the pace: a long D, a short Eb, the tritone landing late in bar 1 and sliding down across the bar line.',
    statement: [m(0, 0, 4), m(4, 1, 3), m(7, 6, 4), m(11, 5, 1), m(12, 3, 4)],
    resolved: [m(0, 0, 4), m(4, 1, 3), m(7, 7, 4), m(11, 5, 1), m(12, 0, 4)],
  },
  {
    id: 'G',
    name: 'Wire, short',
    notes: 'D D Eb Ab F D',
    about: 'A with the slide cut short: from the tritone straight down to F and home to D. Closes the loop, good for repeating.',
    statement: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, 6, 2), m(10, 3, 1), m(11, 0, 5)],
    resolved: [m(0, 0, 2), m(3, 0, 1), m(4, 1, 3), m(8, 7, 2), m(10, 3, 1), m(11, 0, 5)],
  },
  {
    id: 'H',
    name: 'Wire, twice',
    notes: 'D Eb Ab, D Eb Ab F',
    about: 'The tritone reached twice: a short try in bar 1 that stops on the Ab, then again, falling to F.',
    statement: [m(0, 0, 2), m(2, 1, 1), m(3, 6, 3), m(8, 0, 1), m(9, 1, 1), m(10, 6, 2), m(12, 3, 4)],
    resolved: [m(0, 0, 2), m(2, 1, 1), m(3, 6, 3), m(8, 0, 1), m(9, 1, 1), m(10, 7, 2), m(12, 0, 4)],
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
/** Lounge swing: the off-beat eighth lands at 64 % of the beat (close to a triplet). */
const LOUNGE_SWING = 0.64;
/** The reese is rendered at 73.5 Hz; this puts it on D2. */
const REESE_D = D2 / 73.5;
/** Downtempo swing: the off-beat eighth lands at 57 % of the beat. */
const SWING = 0.57;

function emitter(sink: Sink): Emit {
  return (e) => sink({ k: 'play', ...e } as MusicEvent);
}

/** Seconds a take lasts (its last note's tail included), at its own tempo times `tempo` (the lab's tempo control). */
export function takeLength(take: Take, tempo = 1): number {
  const bar = (60 / (TAKE_BPM[take] * tempo)) * 4;
  if (take === 'sneak') return 5 * bar + 2;
  if (take === 'spy') return 8 * bar + 2;
  if (take === 'break') return 9 * bar + 2;
  return 8 * bar + 2;
}

/** Play one take of a candidate from time t. Returns the time it ends. */
export function playTake(sink: Sink, c: Candidate, take: Take, t: number, tempo = 1): number {
  const emit = emitter(sink);
  const bpm = TAKE_BPM[take] * tempo;
  if (take === 'spy') spyTake(emit, c, t, bpm);
  else if (take === 'sneak') sneakTake(emit, c, t, bpm);
  else if (take === 'break') breakTake(emit, c, t, bpm);
  else noirTake(emit, c, t, bpm);
  const end = t + takeLength(take, tempo);
  for (const layer of LAYERS) sink({ k: 'stop', layer, t: end - 1.5, fade: 1 });
  return end;
}

/** The `PLAY_ALL` takes back to back (the 60 s WAV and the "Play" button). Returns the end time. */
export function playAllTakes(sink: Sink, c: Candidate, t: number, tempo = 1): number {
  let at = t;
  for (const take of PLAY_ALL) at = playTake(sink, c, take, at, tempo) - 0.6;
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

/** Spy-lounge bars: vibes voicing (semitones from D4) and a walking bass in quarters (semitones from D2). */
const SPY_BARS: { v: readonly number[]; walk: readonly [number, number, number, number] }[] = [
  { v: [-1, 3, 7], walk: [0, 3, 7, 3] }, // Dm(maj7): the spy chord
  { v: [-1, 3, 7], walk: [0, -1, -2, -3] }, // Dm(maj7), the bass sinking by semitones
  { v: [-4, 0, 3, 7], walk: [-4, 0, 3, 0] }, // Bbmaj7
  { v: [-7, -4, -1, 2], walk: [-5, -1, 2, 1] }, // A7(b9), Eb leading home
  { v: [-1, 3, 7], walk: [0, 3, 7, 5] }, // Dm(maj7)
  { v: [-3, 0, 3, 7], walk: [0, -1, -3, -5] }, // Dm6
  { v: [-7, -4, 0, 2], walk: [2, -2, -4, -2] }, // Em7(b5)
  { v: [-7, -4, -1, 2], walk: [-5, -1, 2, 1] }, // A7(b9)
];

/** Lounge swing on 16th steps: the off-beat eighth is pushed late. */
function lounge(bt: number, s: number, s16: number): number {
  return bt + s * s16 + (s % 4 === 2 ? (LOUNGE_SWING - 0.5) * 4 * s16 : 0);
}

/**
 * Spy, 96 BPM: cool spy-lounge jazz in the feel of a late-90s console pause menu, with an N64-style sampler grain on
 * the band. Brushes and a skipping ride, a walking upright bass, soft vibes comping on Dm(maj7) | Dm(maj7) | Bbmaj7 |
 * A7(b9) | Dm(maj7) | Dm6 | Em7(b5) | A7(b9). The figure on a muted horn (bars 1-2), echoed on vibes (3-4), again on
 * the horn (5-6), resolved (7-8). Written for this project; no melody or vamp from any existing theme.
 */
function spyTake(emit: Emit, c: Candidate, t: number, bpm: number): void {
  const s16 = 60 / bpm / 4;
  const e8 = s16 * 2;
  const bar = s16 * 16;
  emit({ id: 'static', t, stem: 'TEX', gain: 0.1, rate: 1, pan: 0, prio: PRIO.bed, layer: 'crackle', fadeIn: 1 });
  for (let b = 0; b < 8; b++) {
    const bt = t + b * bar;
    const ch = SPY_BARS[b]!;
    // brushes: a swish on 2 and 4, a soft kick on 1, a skipping ride (ding, ding-a ding, ding-a)
    for (const s of [4, 12]) emit({ id: 'brushSwish', t: lounge(bt, s, s16), stem: 'PULSE', gain: 0.22, rate: 1, pan: s === 4 ? -0.2 : 0.2, prio: PRIO.drum, reverb: 'room', send: 0.3 });
    emit({ id: 'kickRound', t: bt, stem: 'PULSE', gain: 0.25, rate: 1, pan: 0, prio: PRIO.drum });
    for (const s of [0, 4, 6, 8, 12, 14]) {
      emit({ id: 'hatC', t: lounge(bt, s, s16), stem: 'PULSE', gain: s % 4 === 2 ? 0.06 : 0.09, rate: 0.7, pan: 0.3, prio: PRIO.drum, reverb: 'room', send: 0.2 });
    }
    if (b === 3 || b === 7) emit({ id: 'rim', t: lounge(bt, 14, s16), stem: 'PULSE', gain: 0.12, rate: 0.9, pan: -0.2, prio: PRIO.drum });
    // the walking bass, one note per beat
    for (let q = 0; q < 4; q++) {
      emit({ id: 'uprightN64', t: bt + q * 4 * s16, stem: 'BASS', gain: q === 0 ? 0.6 : 0.5, rate: semis(ch.walk[q]!), pan: 0, prio: PRIO.bass, dur: 4 * s16 * 0.95, fadeOut: 0.06, reverb: 'room', send: 0.15 });
    }
    // vibes comping: the chord on the swung "and" of 2, and a lighter one on 4 in odd bars
    const comp = (s: number, g: number): void => {
      for (const v of ch.v) {
        emit({ id: 'vibesN64', t: lounge(bt, s, s16), stem: 'HARM', gain: g, rate: semis(v), pan: v * 0.04, prio: PRIO.harm, dur: 1.1, fadeOut: 0.3, reverb: 'hall', send: 0.4 });
      }
    };
    comp(6, 0.16);
    if (b % 2 === 1) comp(12, 0.1);
  }
  const swingFig = (notes: readonly MotifNote[], at: number, id: string, gain: number, held: boolean, send: number): void => {
    for (const n of notes) {
      emit({
        id,
        t: at + n.step * e8 + (n.step % 2 === 1 ? (LOUNGE_SWING - 0.5) * 2 * e8 : 0),
        stem: 'MOTIF',
        gain,
        rate: semis(n.semis),
        pan: 0,
        prio: PRIO.motif,
        reverb: 'hall',
        send,
        ...(held ? { dur: n.len * e8 * 0.95, fadeOut: 0.3 } : {}),
      });
    }
  };
  swingFig(c.statement, t, 'hornN64', 0.45, true, 0.45);
  swingFig(c.statement, t + 2 * bar, 'vibesN64', 0.32, false, 0.5);
  swingFig(c.statement, t + 4 * bar, 'hornN64', 0.45, true, 0.45);
  swingFig(c.resolved, t + 6 * bar, 'hornN64', 0.45, true, 0.5);
}

/**
 * Sneak, 84 BPM: a dusty swung beat with line crackle and a low string pad. Bar 0 is beat and a bass pedal; bars 1-2
 * the figure on upright bass (a far, soft bell touches its first note); bars 3-4 the figure on a muted horn while the bass
 * holds D.
 */
function sneakTake(emit: Emit, c: Candidate, t: number, bpm: number): void {
  const s16 = 60 / bpm / 4;
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
function breakTake(emit: Emit, c: Candidate, t: number, bpm: number): void {
  const s16 = 60 / bpm / 4;
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
function noirTake(emit: Emit, c: Candidate, t: number, bpm: number): void {
  const s16 = 60 / bpm / 4;
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
export const TAKE_SOUNDS = ['brushSwish', 'uprightN64', 'vibesN64', 'hornN64', 'static', 'strings', 'kickRound', 'snare', 'ghost', 'hatC', 'relay0', 'upright', 'darkbell', 'horn', 'kickTight', 'click1', 'reese', 'stab', 'plate', 'boom', 'rainbed', 'sub', 'rim', 'swell'];
