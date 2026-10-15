/**
 * Round 6 (Michael, 2026-10-15): "I like Hans Zimmer, orchestral, epic"; closest: The Dark Knight and Interstellar.
 * Three original pieces for real recorded orchestra (CC0 VSCO 2 CE), each growing from quiet to huge, so both ends
 * of the score (Calm and Alert) can be judged. Written for this project in that style; no melody, ostinato or chord
 * sequence from any film score. Four stems per piece: strings, brass, organ, percussion.
 */
import { secs, stereo, type Stereo } from '../../music/render/canvas';
import type { Bank } from './bank';
import { hit, note, swellInto, timp } from './play';
import { midi } from '../theory';

export type StemId = 'strings' | 'brass' | 'organ' | 'perc';
export const STEMS: readonly StemId[] = ['strings', 'brass', 'organ', 'perc'];

export interface PieceMeta {
  id: string;
  name: string;
  about: string;
  bpm: number;
  bars: number;
}

export const PIECES: readonly PieceMeta[] = [
  {
    id: 'pursuit',
    name: 'Pursuit',
    about:
      'The Dark Knight side: a relentless low-string ostinato that never lets go, a four-note horn motif (D, A, B-flat, A), huge low brass hits, timpani and big drums.',
    bpm: 120,
    bars: 40,
  },
  {
    id: 'longnight',
    name: 'Long Night',
    about:
      'The Interstellar side: a repeating pipe-organ pattern that grows, low strings underneath, a slow long-note melody on violins and then horns, swelling to a full organ and orchestra.',
    bpm: 84,
    bars: 32,
  },
  {
    id: 'nightshift',
    name: 'Night Shift',
    about:
      'Both, built on your Hook A: the hook becomes the low-string ostinato, with organ chords, the horn motif from Pursuit and the big hits on top.',
    bpm: 92,
    bars: 32,
  },
];

export interface Piece {
  meta: PieceMeta;
  stems: Record<StemId, Stereo>;
}

class Score {
  readonly stems: Record<StemId, Stereo>;
  readonly beat: number;

  constructor(
    readonly bank: Bank,
    readonly meta: PieceMeta,
  ) {
    this.beat = 60 / meta.bpm;
    const n = secs(meta.bars * 4 * this.beat);
    this.stems = { strings: stereo(n), brass: stereo(n), organ: stereo(n), perc: stereo(n) };
  }

  /** Seconds at bar `b`, beat `beat` (0-based). */
  t(b: number, beat = 0): number {
    return (b * 4 + beat) * this.beat;
  }

  /** Length in seconds of `beats` beats. */
  d(beats: number): number {
    return beats * this.beat;
  }
}

const n = midi;
const D = n('D2');

/** Chords as notes (sounding). */
const CH = {
  Dm: { root: n('D2'), tones: [n('D3'), n('F3'), n('A3'), n('D4'), n('F4'), n('A4')] },
  Bb: { root: n('Bb1'), tones: [n('D3'), n('F3'), n('Bb3'), n('D4'), n('F4'), n('Bb4')] },
  Gm: { root: n('G1'), tones: [n('D3'), n('G3'), n('Bb3'), n('D4'), n('G4'), n('Bb4')] },
  A: { root: n('A1'), tones: [n('C#3'), n('E3'), n('A3'), n('C#4'), n('E4'), n('A4')] },
  F: { root: n('F1'), tones: [n('C3'), n('F3'), n('A3'), n('C4'), n('F4'), n('A4')] },
  C: { root: n('C2'), tones: [n('C3'), n('E3'), n('G3'), n('C4'), n('E4'), n('G4')] },
};
type ChordName = keyof typeof CH;

/** The horn motif shared by Pursuit and Night Shift: 8 bars, as [note, beats]. */
const MOTIF: [string, number][] = [
  ['D4', 4],
  ['A4', 4],
  ['Bb4', 8],
  ['A4', 4],
  ['G4', 2],
  ['F4', 2],
  ['E4', 4],
  ['A3', 4],
];

function motif(s: Score, at: number, inst: string, vel: number, tr = 0, attack = 0.12): void {
  let beat = 0;
  for (const [name, len] of MOTIF) {
    note(s.stems.brass, s.bank, inst, n(name) + tr, s.t(at, beat), s.d(len) * 0.97, { vel, attack: len >= 8 ? s.d(3) : attack, release: 0.6 });
    beat += len;
  }
}

/** A huge low-brass hit (trombones and tuba on root, fifth and octave), with a timpani and bass-drum strike. */
function braam(s: Score, at: number, root: number, vel: number, beats = 6): void {
  for (const m of [root, root + 7, root + 12]) note(s.stems.brass, s.bank, 'tbnSus', m, at, s.d(beats), { vel, loud: true, attack: 0.04, release: 1.6 });
  note(s.stems.brass, s.bank, 'tubaSus', root, at, s.d(beats), { vel, loud: true, attack: 0.05, release: 1.6 });
  for (const m of [root + 12, root + 19]) note(s.stems.brass, s.bank, 'hornSus', m, at, s.d(beats), { vel: vel * 0.85, loud: true, attack: 0.05, release: 1.4 });
  timp(s.stems.perc, s.bank, root + 12, at, vel);
  hit(s.stems.perc, s.bank, 'bdrum', 1, at, vel * 0.9);
}

/** Sustained string chord: basses on the root, cellos and violas in the middle, violins on top when `full`. */
function strings(s: Score, at: number, beats: number, c: ChordName, vel: number, full: boolean, attack = 0.4): void {
  const ch = CH[c];
  const dur = s.d(beats);
  note(s.stems.strings, s.bank, 'bassSus', ch.root + 12, at, dur, { vel, attack, release: 0.8 });
  note(s.stems.strings, s.bank, 'celloSus', ch.root + 12, at, dur, { vel, attack, release: 0.8 });
  note(s.stems.strings, s.bank, 'celloSus', ch.tones[1]!, at, dur, { vel: vel * 0.8, attack, release: 0.8 });
  note(s.stems.strings, s.bank, 'violaSus', ch.tones[2]!, at, dur, { vel: vel * 0.8, attack, release: 0.8 });
  if (full) {
    note(s.stems.strings, s.bank, 'violinSus', ch.tones[3]!, at, dur, { vel: vel * 0.8, attack, release: 0.9 });
    note(s.stems.strings, s.bank, 'violinSus', ch.tones[5]!, at, dur, { vel: vel * 0.75, attack, release: 0.9 });
  }
}

// ------------------------------------------------------------------ Pursuit (The Dark Knight side)

function pursuit(s: Score): void {
  const accents = [0, 3, 6, 8, 11, 14];
  const dyn = (b: number): number => (b < 8 ? 0.38 + b * 0.03 : b < 16 ? 0.62 : b < 36 ? 0.85 : 0.9);
  // the ostinato: sixteenths in 3 + 3 + 2 accents on D; every 4th bar the last two beats rise to E-flat
  for (let b = 0; b < 37; b++) {
    for (let i = 0; i < 16; i++) {
      const root = b % 4 === 3 && i >= 8 ? D + 1 : D;
      const acc = accents.includes(i);
      const v = dyn(b) * (acc ? 1 : 0.62);
      const t = s.t(b, i / 4);
      note(s.stems.strings, s.bank, 'celloSpic', root + 12, t, s.d(0.25), { vel: v, release: 0.08 });
      if (acc || b >= 16) note(s.stems.strings, s.bank, 'bassSpic', root, t, s.d(0.25), { vel: v * 0.9, release: 0.08 });
      if (b >= 16 && acc) note(s.stems.strings, s.bank, 'celloSpic', root + 24, t, s.d(0.25), { vel: v * 0.8, release: 0.08 });
    }
  }
  // low drone underneath, swelling in
  note(s.stems.strings, s.bank, 'bassSus', D, s.t(0), s.d(32), { vel: 0.45, attack: s.d(16), release: 1 });
  // harmony from bar 8: D minor, B-flat, G minor, A (4 bars each), over the D pedal
  const prog: ChordName[] = ['Dm', 'Bb', 'Gm', 'A'];
  for (let b = 8; b < 36; b += 4) strings(s, s.t(b), 16, prog[((b - 8) / 4) % 4]!, b < 16 ? 0.45 : 0.7, b >= 16, b < 16 ? s.d(6) : 0.3);
  // violins tremolo high and quiet, then loud
  for (let b = 8; b < 16; b += 4) for (const m of ['A4', 'D5']) note(s.stems.strings, s.bank, 'violinTrem', n(m), s.t(b), s.d(16), { vel: 0.45, attack: s.d(12), release: 0.8 });
  for (let b = 24; b < 36; b += 4) for (const m of ['D5', 'A5']) note(s.stems.strings, s.bank, 'violinTrem', n(m), s.t(b), s.d(16), { vel: 0.75, attack: 0.3, release: 0.8 });
  // the horn motif: alone and soft, then with trombones an octave down, then full
  motif(s, 8, 'hornSus', 0.5);
  motif(s, 16, 'hornSus', 0.8);
  motif(s, 16, 'tbnSus', 0.7, -12);
  motif(s, 24, 'hornSus', 0.95);
  motif(s, 24, 'tbnSus', 0.9, -12);
  // braams every two bars from bar 16, on the chord's root
  const rootOf = (b: number): number => CH[prog[Math.floor((b - 8) / 4) % 4]!].root;
  for (let b = 16; b < 32; b += 2) braam(s, s.t(b), rootOf(b), b < 24 ? 0.75 : 0.9, 5);
  // drums: big drum on the ostinato's accents from bar 16, timpani building
  for (let b = 16; b < 36; b++) {
    for (const i of [0, 6, 11]) hit(s.stems.perc, s.bank, 'giant', 2, s.t(b, i / 4), i === 0 ? 0.8 : 0.55);
    if (b >= 24) for (const i of [3, 8, 14]) timp(s.stems.perc, s.bank, D + 12, s.t(b, i / 4), 0.55);
  }
  timp(s.stems.perc, s.bank, D + 12, s.t(14), 0.6, true);
  timp(s.stems.perc, s.bank, D + 12, s.t(34), 0.8, true);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(16), 0.7);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(24), 0.8);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(36), 0.9);
  hit(s.stems.perc, s.bank, 'gong', 0, s.t(24), 0.6);
  // the final hit on bar 36: everything on D, ringing out into the quiet start
  braam(s, s.t(36), D, 1, 8);
  strings(s, s.t(36), 8, 'Dm', 0.9, true, 0.05);
  hit(s.stems.perc, s.bank, 'gong', 0, s.t(36), 0.9);
  hit(s.stems.perc, s.bank, 'giant', 1, s.t(36), 1);
}

// ------------------------------------------------------------------ Long Night (the Interstellar side)

function longNight(s: Score): void {
  const prog: ChordName[] = ['Dm', 'Bb', 'F', 'C'];
  // organ: a repeating eighth-note pattern over two-bar chords, quiet manual first, full organ from bar 16
  for (let b = 0; b < 32; b++) {
    const c = CH[prog[Math.floor(b / 2) % 4]!];
    const t3 = c.tones;
    const pat = b % 2 === 0 ? [t3[3]!, t3[5]!, t3[4]!, t3[5]!, t3[3]! + 12, t3[5]!, t3[4]!, t3[5]!] : [t3[3]!, t3[5]!, t3[4]!, t3[5]!, t3[5]! + 7, t3[5]!, t3[4]!, t3[5]!];
    const loud = b >= 16 && b < 30;
    const v = b < 8 ? 0.5 + b * 0.03 : b < 16 ? 0.72 : b < 30 ? 0.85 : 0.6;
    pat.forEach((m, i) => note(s.stems.organ, s.bank, loud ? 'organLoud' : 'organQuiet', m, s.t(b, i / 2), s.d(0.5), { vel: v, release: 0.25 }));
    if (b % 2 === 0 && b >= 8) {
      note(s.stems.organ, s.bank, 'organLoud', c.root, s.t(b), s.d(8), { vel: b < 16 ? 0.5 : 0.8, attack: 0.3, release: 1.2 });
      if (b >= 16) note(s.stems.organ, s.bank, 'organLoud', c.root + 12, s.t(b), s.d(8), { vel: 0.7, attack: 0.3, release: 1.2 });
    }
  }
  // low strings under the organ from bar 8, full strings from bar 16
  for (let b = 8; b < 32; b += 2) strings(s, s.t(b), 8, prog[(b / 2) % 4]!, b < 16 ? 0.5 : b < 30 ? 0.8 : 0.55, b >= 16, b < 16 ? s.d(4) : 0.6);
  // the melody: long notes on violins from bar 16, horns joining an octave down from bar 24
  const MEL: [string, number][] = [
    ['A4', 4], ['D5', 4], ['F5', 6], ['D5', 2], ['C5', 4], ['A4', 4], ['G4', 4], ['E4', 2], ['F4', 1], ['G4', 1],
    ['A4', 8], ['Bb4', 4], ['D5', 4], ['C5', 2], ['A4', 2], ['F5', 4], ['E5', 8],
  ];
  let beat = 0;
  for (const [m, len] of MEL) {
    const t = s.t(16, beat);
    note(s.stems.strings, s.bank, 'violinSus', n(m) + 12, t, s.d(len) * 0.98, { vel: 0.8, attack: 0.25, release: 0.8 });
    note(s.stems.strings, s.bank, 'violinSus', n(m), t, s.d(len) * 0.98, { vel: 0.7, attack: 0.25, release: 0.8 });
    if (beat >= 32) note(s.stems.brass, s.bank, 'hornSus', n(m) - 12, t, s.d(len) * 0.98, { vel: 0.85, attack: 0.15, release: 0.8 });
    beat += len;
  }
  // low brass from bar 24, timpani on the chord changes, cymbal swells, a heartbeat drum in the climax
  for (let b = 24; b < 30; b += 2) {
    const c = CH[prog[(b / 2) % 4]!];
    note(s.stems.brass, s.bank, 'tbnSus', c.root + 24, s.t(b), s.d(8), { vel: 0.75, attack: 0.4, release: 1 });
    note(s.stems.brass, s.bank, 'tubaSus', c.root + 12, s.t(b), s.d(8), { vel: 0.75, attack: 0.4, release: 1 });
  }
  for (let b = 16; b < 30; b += 2) timp(s.stems.perc, s.bank, CH[prog[(b / 2) % 4]!].root + 24 - 12, s.t(b), b < 24 ? 0.55 : 0.8);
  for (let b = 24; b < 30; b++) for (const beat2 of [0, 1.5]) hit(s.stems.perc, s.bank, 'giant', 1, s.t(b, beat2), beat2 === 0 ? 0.6 : 0.4);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(16), 0.6);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(24), 0.75);
  timp(s.stems.perc, s.bank, D + 12, s.t(22), 0.6, true);
}

// ------------------------------------------------------------------ Night Shift (both, on Hook A)

const HOOK_A = ['D2', null, 'D3', 'D2', null, 'C3', null, 'A2', 'D2', null, 'D3', 'D2', 'F2', 'G2', 'Ab2', 'A2'];

function nightShift(s: Score): void {
  const dyn = (b: number): number => (b < 8 ? 0.42 + b * 0.03 : b < 16 ? 0.65 : b < 30 ? 0.88 : 0.7);
  // Hook A as the low-string ostinato: cellos on the riff, basses an octave below on the strong notes
  for (let b = 0; b < 31; b++) {
    for (let i = 0; i < 8; i++) {
      const name = HOOK_A[(b % 2) * 8 + i];
      if (!name) continue;
      const m = n(name);
      const t = s.t(b, i / 2);
      const v = dyn(b) * (i === 0 ? 1 : 0.75);
      note(s.stems.strings, s.bank, 'celloSpic', m, t, s.d(0.5), { vel: v, release: 0.1 });
      if (i === 0 || b >= 8) note(s.stems.strings, s.bank, 'bassSpic', m - 12, t, s.d(0.5), { vel: v * 0.9, release: 0.1 });
      if (b >= 16) note(s.stems.strings, s.bank, 'celloSpic', m + 12, t, s.d(0.5), { vel: v * 0.75, release: 0.1 });
    }
  }
  // organ: a quiet held chord, then full organ chords over the progression
  const prog: ChordName[] = ['Dm', 'Bb', 'Gm', 'A'];
  for (const m of [n('D3'), n('A3'), n('D4'), n('F4')]) note(s.stems.organ, s.bank, 'organQuiet', m, s.t(0), s.d(32), { vel: 0.6, attack: s.d(8), release: 1.5 });
  for (let b = 8; b < 16; b += 2) for (const m of CH[prog[((b - 8) / 2) % 4]!].tones.slice(1, 5)) note(s.stems.organ, s.bank, 'organQuiet', m, s.t(b), s.d(8), { vel: 0.65, attack: 0.5, release: 1 });
  for (let b = 16; b < 30; b += 2) {
    const c = CH[prog[((b - 16) / 2) % 4]!];
    for (const m of c.tones.slice(1, 6)) note(s.stems.organ, s.bank, 'organLoud', m, s.t(b), s.d(8), { vel: 0.75, attack: 0.15, release: 1.2 });
    note(s.stems.organ, s.bank, 'organLoud', c.root, s.t(b), s.d(8), { vel: 0.8, attack: 0.15, release: 1.2 });
  }
  // strings sustain and tremolo
  for (let b = 16; b < 30; b += 2) strings(s, s.t(b), 8, prog[((b - 16) / 2) % 4]!, 0.7, true, 0.2);
  for (let b = 8; b < 16; b += 4) note(s.stems.strings, s.bank, 'violinTrem', n('D5'), s.t(b), s.d(16), { vel: 0.4, attack: s.d(10), release: 0.8 });
  // the horn motif, then with trombones, then in octaves with violins
  motif(s, 8, 'hornSus', 0.5);
  motif(s, 16, 'hornSus', 0.85);
  motif(s, 16, 'tbnSus', 0.75, -12);
  let beat = 0;
  for (const [m, len] of MOTIF) {
    note(s.stems.strings, s.bank, 'violinSus', n(m) + 12, s.t(24, beat), s.d(len) * 0.97, { vel: 0.8, attack: 0.15, release: 0.8 });
    beat += len;
  }
  motif(s, 24, 'hornSus', 0.95);
  motif(s, 24, 'tbnSus', 0.9, -12);
  // hits: timpani on the hook's downbeats, braams every 2 bars from 16, big drum, swells
  for (let b = 8; b < 30; b++) timp(s.stems.perc, s.bank, D + 12, s.t(b), b < 16 ? 0.5 : 0.7);
  for (let b = 16; b < 30; b += 2) braam(s, s.t(b), CH[prog[((b - 16) / 2) % 4]!].root, b < 24 ? 0.75 : 0.9, 4);
  for (let b = 16; b < 30; b++) for (const beat2 of [0, 1.5, 3]) hit(s.stems.perc, s.bank, 'giant', 2, s.t(b, beat2), beat2 === 0 ? 0.75 : 0.5);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(16), 0.7);
  swellInto(s.stems.perc, s.bank, 'cym', 1, s.t(24), 0.8);
  hit(s.stems.perc, s.bank, 'gong', 0, s.t(24), 0.6);
  timp(s.stems.perc, s.bank, D + 12, s.t(14), 0.6, true);
  // the final hit on bar 30, ringing into the quiet start
  braam(s, s.t(30), D, 1, 6);
  strings(s, s.t(30), 6, 'Dm', 0.85, true, 0.05);
  hit(s.stems.perc, s.bank, 'gong', 0, s.t(30), 0.85);
}

export function renderPiece(bank: Bank, meta: PieceMeta): Piece {
  const s = new Score(bank, meta);
  if (meta.id === 'pursuit') pursuit(s);
  else if (meta.id === 'longnight') longNight(s);
  else nightShift(s);
  return { meta, stems: s.stems };
}
