/**
 * Stage V1: three candidate main motifs (direction v2 Section 5) and the three takes the motif picker plays for each:
 * on a bell (72 BPM, the Caution pulse), as the Alert brass hook over a simple beat (168 BPM) and as the menu theme's
 * opening 8 bars (80 BPM). Pure: it turns a candidate and a start time into `MusicEvent`s for a sink, so the lab, the
 * offline WAV export and the tests hear the same thing.
 *
 * Every motif here was written for this project from the rules in direction v2 5.1. Steps and lengths are eighth notes
 * over two bars of 4/4; pitches are semitones from D4 (the bell and brass octave).
 */
import type { MusicEvent, PlayEvent, Sink, Stem } from './conductor';
import { semis } from './library';
import type { MotifNote } from './motif';
import { PRIO } from './voices';

export type CandidateId = 'A' | 'B' | 'C';
export type Take = 'bell' | 'hook' | 'menu';
export const TAKES: readonly Take[] = ['bell', 'hook', 'menu'];
export const TAKE_BPM: Record<Take, number> = { bell: 72, hook: 168, menu: 80 };

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
    name: 'Lights Out',
    notes: 'D F E Bb A',
    about: 'The M0 motif, F now held across the beat. Falls a tritone: the light going out.',
    statement: [m(0, 0, 3), m(3, 3, 2), m(5, 2, 1), m(6, -4, 7), m(14, -5, 2)],
    resolved: [m(0, 0, 3), m(3, 3, 2), m(5, 2, 1), m(6, -2, 7), m(14, 0, 2)],
  },
  {
    id: 'B',
    name: 'Searchlight',
    notes: 'D D A Ab F E D',
    about: 'Two quick pick-ups, a leap to A that slips down to the tritone, then a falling line home. The most hook-like.',
    statement: [m(0, 0, 1), m(1, 0, 2), m(3, 7, 3), m(6, 6, 1), m(7, 3, 3), m(10, 2, 2), m(12, 0, 4)],
    resolved: [m(0, 0, 1), m(1, 0, 2), m(3, 7, 3), m(6, 5, 1), m(7, 3, 3), m(10, 2, 2), m(12, 0, 4)],
  },
  {
    id: 'C',
    name: 'Undertow',
    notes: 'D Eb D A C Bb A',
    about: 'A semitone rub on D, a drop to the low A and a sigh back down to it. Low, dark, ostinato-friendly.',
    statement: [m(0, 0, 2), m(2, 1, 1), m(3, 0, 3), m(6, -5, 3), m(9, -2, 1), m(10, -4, 2), m(12, -5, 4)],
    resolved: [m(0, 0, 2), m(2, 2, 1), m(3, 0, 3), m(6, -5, 3), m(9, -2, 1), m(10, -4, 2), m(12, 0, 4)],
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

const LAYERS = ['strLo', 'strHi', 'm0', 'm1', 'm2', 'msub', 'mbed'];

function emitter(sink: Sink): Emit {
  return (e) => sink({ k: 'play', ...e } as MusicEvent);
}

/** Seconds a take lasts (its last note's tail included), at its own tempo. */
export function takeLength(take: Take): number {
  const bar = (60 / TAKE_BPM[take]) * 4;
  if (take === 'bell') return 4 * bar + 2.5;
  if (take === 'hook') return 9 * bar + 2;
  return 8 * bar + 3;
}

/** Play one take of a candidate from time t. Returns the time it ends. */
export function playTake(sink: Sink, c: Candidate, take: Take, t: number): number {
  const emit = emitter(sink);
  if (take === 'bell') bellTake(emit, c, t);
  else if (take === 'hook') hookTake(emit, c, t);
  else menuTake(emit, c, t);
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

/** On a bell at the Caution pulse: the statement, then the resolved form, far back in the hall. */
function bellTake(emit: Emit, c: Candidate, t: number): void {
  const e8 = 60 / TAKE_BPM.bell / 2;
  const phrase = (notes: readonly MotifNote[], at: number, gain: number): void => {
    for (const n of notes) {
      emit({ id: 'bellFM', t: at + n.step * e8, stem: 'MOTIF', gain, rate: semis(n.semis), pan: 0.15, prio: PRIO.motif, reverb: 'hall', send: 0.55, delay: 0.25 });
    }
  };
  // a low drone so the bell has a floor
  emit({ id: 'drone', t, stem: 'AIR', gain: 0.35, rate: 1, pan: 0, prio: PRIO.bed, layer: 'mbed', fadeIn: 1.5 });
  phrase(c.statement, t, 0.75);
  phrase(c.resolved, t + 16 * e8, 0.6);
}

/**
 * The Alert hook at 168: one bar of beat and bass, then the hook on brass (bars 1-2), answered by metal hits in its
 * rhythm (3-4), the hook again (5-6) and once more with a snare build (7-8), landing on a final hit.
 */
function hookTake(emit: Emit, c: Candidate, t: number): void {
  const s16 = 60 / TAKE_BPM.hook / 4;
  const e8 = s16 * 2;
  const bar = s16 * 16;
  const BASS = [0, 0, 0, 0, 0, 0, 3, -2];
  for (let b = 0; b < 9; b++) {
    const bt = t + b * bar;
    for (let s = 0; s < 16; s++) {
      const st = bt + s * s16;
      if (s % 4 === 0) emit({ id: 'kickBig', t: st, stem: 'BREAK', gain: 0.9, rate: 1, pan: 0, prio: PRIO.drum });
      if (s === 4 || s === 12) emit({ id: 'snareGated', t: st, stem: 'BREAK', gain: 0.7, rate: 1, pan: 0, prio: PRIO.drum, reverb: 'room', send: 0.15 });
      if (s % 2 === 1) emit({ id: 'hatC', t: st, stem: 'BREAK', gain: s % 4 === 3 ? 0.2 : 0.12, rate: 1, pan: 0.2, prio: PRIO.drum });
      // the found-sound layer: syncopated clicks and a glass tick against the straight pulse
      if (s === 3 || s === 10) emit({ id: 'click1', t: st, stem: 'METAL', gain: 0.35, rate: 1, pan: -0.3, prio: PRIO.metal });
      if (s === 7) emit({ id: 'glass', t: st, stem: 'METAL', gain: 0.25, rate: 1, pan: 0.35, prio: PRIO.metal });
      if (s % 2 === 0) emit({ id: 'midbass', t: st, stem: 'BASS', gain: 0.7, rate: semis(BASS[s / 2]!), pan: 0, prio: PRIO.bass, dur: e8 * 0.85, fadeOut: 0.02 });
    }
    // a snare build through bar 8
    if (b === 8) {
      for (let s = 8; s < 16; s++) emit({ id: 'snareGated', t: bt + s * s16, stem: 'GLITCH', gain: 0.25 + (s - 8) * 0.07, rate: 1 + (s - 8) * 0.02, pan: 0, prio: PRIO.drum });
    }
  }
  // low string fifths under the hook (D3, A3)
  emit({ id: 'strings', t: t + bar, stem: 'HARM', gain: 0.3, rate: 1, pan: -0.4, prio: PRIO.harm, layer: 'strLo', fadeIn: 0.4 });
  emit({ id: 'strings', t: t + bar, stem: 'HARM', gain: 0.25, rate: semis(7), pan: 0.4, prio: PRIO.harm, layer: 'strHi', fadeIn: 0.4 });
  const hook = (at: number): void => {
    for (const n of c.statement) {
      emit({ id: 'brass', t: at + n.step * e8, stem: 'MOTIF', gain: 0.85, rate: semis(n.semis), pan: 0, prio: PRIO.motif, dur: n.len * e8 * 0.92, fadeOut: 0.06, reverb: 'room', send: 0.2 });
    }
  };
  const answer = (at: number): void => {
    for (const n of c.statement) {
      emit({ id: 'pipe', t: at + n.step * e8, stem: 'METAL', gain: 0.7, rate: semis(n.semis), pan: -0.15, prio: PRIO.metal, reverb: 'room', send: 0.3 });
      emit({ id: 'plate', t: at + n.step * e8, stem: 'METAL', gain: 0.3, rate: 1, pan: 0.25, prio: PRIO.metal });
    }
  };
  hook(t + bar);
  answer(t + 3 * bar);
  hook(t + 5 * bar);
  hook(t + 7 * bar);
  // the landing
  const end = t + 9 * bar;
  emit({ id: 'kickBig', t: end, stem: 'BREAK', gain: 1, rate: 1, pan: 0, prio: PRIO.stinger });
  emit({ id: 'timp', t: end, stem: 'PULSE', gain: 0.9, rate: 1, pan: 0, prio: PRIO.stinger });
  emit({ id: 'plate', t: end, stem: 'METAL', gain: 0.6, rate: 1, pan: 0, prio: PRIO.stinger, reverb: 'room', send: 0.4 });
  emit({ id: 'brass', t: end, stem: 'MOTIF', gain: 0.8, rate: 1, pan: 0, prio: PRIO.stinger, dur: 0.6, fadeOut: 0.3 });
}

/** Menu chords per bar (semitones from D3 for three string voices) and the sub root (from D2). */
const MENU_CHORDS: { v: [number, number, number]; root: number }[] = [
  { v: [0, 3, 7], root: 0 }, // Dm
  { v: [0, 3, 7], root: 0 },
  { v: [-4, 0, 3], root: -4 }, // Bb
  { v: [-4, 0, 3], root: -4 },
  { v: [-7, -4, 0], root: -7 }, // Gm
  { v: [-7, -4, 0], root: -7 },
  { v: [-5, -1, 2], root: -5 }, // A
  { v: [0, 3, 7], root: 0 }, // Dm
];

/**
 * The menu theme's opening 8 bars at 80: the motif full on a brass swell over strings and timpani (bars 1-2), answered
 * on vibes (3-4), stated again with the strings doubling an octave down (5-6), then resolved home (7-8).
 */
function menuTake(emit: Emit, c: Candidate, t: number): void {
  const e8 = 60 / TAKE_BPM.menu / 2;
  const bar = e8 * 8;
  emit({ id: 'rainbed', t, stem: 'AIR', gain: 0.25, rate: 1, pan: 0, prio: PRIO.bed, layer: 'mbed', fadeIn: 2 });
  for (let b = 0; b < 8; b++) {
    const ch = MENU_CHORDS[b]!;
    const bt = t + b * bar;
    const was = MENU_CHORDS[b - 1];
    if (!was || was.root !== ch.root || was.v[1] !== ch.v[1]) {
      for (let v = 0; v < 3; v++) {
        emit({ id: 'strings', t: bt, stem: 'HARM', gain: 0.32, rate: semis(ch.v[v]!), pan: (v - 1) * 0.45, prio: PRIO.harm, layer: `m${v}`, fadeIn: b === 0 ? 1.2 : 0.5, reverb: 'hall', send: 0.4 });
      }
      emit({ id: 'sub', t: bt, stem: 'BASS', gain: 0.55, rate: semis(ch.root), pan: 0, prio: PRIO.bass, layer: 'msub', fadeIn: 0.3 });
    }
    // the relay undercurrent on the off-beat eighths
    for (let e = 1; e < 8; e += 2) emit({ id: 'relay0', t: bt + e * e8, stem: 'TEX', gain: 0.12, rate: 1, pan: 0.4, prio: PRIO.tex });
  }
  for (const [b, r] of [[0, 0], [4, -7], [6, -5], [7, 0]] as const) {
    emit({ id: 'timp', t: t + b * bar, stem: 'PULSE', gain: 0.7, rate: semis(r), pan: 0, prio: PRIO.drum, reverb: 'hall', send: 0.3 });
  }
  const line = (notes: readonly MotifNote[], at: number, id: string, gain: number, oct: number, stem: Stem, held: boolean): void => {
    for (const n of notes) {
      emit({
        id,
        t: at + n.step * e8,
        stem,
        gain,
        rate: semis(n.semis + 12 * oct),
        pan: 0,
        prio: PRIO.motif,
        reverb: 'hall',
        send: 0.45,
        ...(held ? { dur: n.len * e8 * 0.95, fadeOut: 0.25 } : {}),
      });
    }
  };
  line(c.statement, t, 'brassSwell', 0.75, 0, 'MOTIF', true);
  line(c.statement, t + 2 * bar, 'vibes', 0.7, 1, 'MOTIF', false);
  line(c.statement, t + 4 * bar, 'brassSwell', 0.75, 0, 'MOTIF', true);
  line(c.statement, t + 4 * bar, 'strings', 0.3, 0, 'HARM', true);
  line(c.resolved, t + 6 * bar, 'brassSwell', 0.8, 0, 'MOTIF', true);
}

/** Every sound id the takes use (for tests). */
export const TAKE_SOUNDS = ['bellFM', 'drone', 'kickBig', 'snareGated', 'hatC', 'click1', 'glass', 'midbass', 'strings', 'brass', 'pipe', 'plate', 'timp', 'rainbed', 'sub', 'relay0', 'brassSwell', 'vibes'];
