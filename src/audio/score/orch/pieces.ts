/**
 * Round 7 (Michael, 2026-10-15): he loves round 6's "Night Shift" (Hook A as the low-string ostinato) with the brass,
 * organ and percussion muted - strings only - and hated the other two pieces. Everything here is strings built on Hook A,
 * rendered as many separate layers (one file each) so they can be mixed live:
 * - a mission loop with Calm / Cautious / Alert / Evasion presets (vertical layers, one tempo),
 * - a faster Alert variation,
 * - two menu themes (grand, brooding),
 * - round 6's piece itself, split into fine layers (strings-only preset = his pick).
 * Original music for this project; recorded instruments are CC0 VSCO 2 CE.
 */
import { secs, stereo, type Stereo } from '../../music/render/canvas';
import type { Bank } from './bank';
import { hit, note, swellInto, timp } from './play';
import { midi } from '../theory';

export type Kind = 'strings' | 'brass' | 'organ' | 'perc';

export interface LayerMeta {
  id: string;
  name: string;
  kind: Kind;
}

export interface PieceMeta {
  id: string;
  name: string;
  about: string;
  /** What it is for: the in-game score, the menu, or the round 6 reference. */
  use: 'mission' | 'menu' | 'reference';
  bpm: number;
  bars: number;
  layers: LayerMeta[];
  /** Named layer mixes (layer id -> gain; missing = 0). The first is the default. */
  presets: Record<string, Record<string, number>>;
}

const S = (id: string, name: string): LayerMeta => ({ id, name, kind: 'strings' });

export const PIECES: readonly PieceMeta[] = [
  {
    id: 'mission',
    name: 'Mission score (strings)',
    about: 'The in-game loop at 92 BPM. Every layer plays all the time; the state buttons fade between layer mixes over one bar, as the game would.',
    use: 'mission',
    bpm: 92,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato (plucked)'),
      S('hookBass', 'Hook A, basses (short bows)'),
      S('hookCello', 'Hook A, cellos (short bows)'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('drive', 'Driving sixteenths on D'),
      S('lowSus', 'Low held D (basses, cellos)'),
      S('chords', 'Held chords (cellos, violas, violins)'),
      S('trem', 'High tremolo (violins, violas)'),
      S('melody', 'Horn-motif melody on violins'),
    ],
    presets: {
      Calm: { pizz: 0.5, lowSus: 0.35, trem: 0.12 },
      Cautious: { hookCello: 0.65, hookBass: 0.55, lowSus: 0.5, chords: 0.3, trem: 0.35 },
      Alert: { hookBass: 1, hookCello: 1, hookHigh: 0.9, drive: 0.85, lowSus: 0.9, chords: 0.9, trem: 0.8, melody: 1 },
      Evasion: { hookBass: 0.9, hookCello: 0.9, drive: 0.7, lowSus: 0.8, trem: 0.6 },
      'Everything on': { pizz: 1, hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'alertfast',
    name: 'Alert, faster (strings)',
    about: 'An Alert variation at 120 BPM: the hook pushed faster over driving sixteenths, held chords and the melody. Its own loop, entered after the spotted hit.',
    use: 'mission',
    bpm: 120,
    bars: 32,
    layers: [
      S('hookBass', 'Hook A, basses'),
      S('hookCello', 'Hook A, cellos'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('drive', 'Driving sixteenths on D'),
      S('lowSus', 'Low held D'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('melody', 'Melody on violins and cellos'),
    ],
    presets: {
      Alert: { hookBass: 1, hookCello: 1, hookHigh: 0.9, drive: 0.9, lowSus: 0.8, chords: 0.85, trem: 0.8, melody: 1 },
      Evasion: { hookBass: 0.9, hookCello: 0.9, drive: 0.8, lowSus: 0.7, trem: 0.6 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'menugrand',
    name: 'Menu theme, grand',
    about: 'A full statement for the main menu at 84 BPM: the hook alone, then the melody on cellos, then violins and the whole section, a climax and a long final chord.',
    use: 'menu',
    bpm: 84,
    bars: 32,
    layers: [
      S('hookLow', 'Hook A, cellos and basses'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('lowSus', 'Low held D'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('celloMel', 'Melody on cellos'),
      S('violinMel', 'Melody on violins'),
    ],
    presets: { Full: { hookLow: 1, hookHigh: 1, lowSus: 1, chords: 1, trem: 1, celloMel: 1, violinMel: 1 } },
  },
  {
    id: 'menubrood',
    name: 'Menu theme, brooding',
    about: 'A darker, quieter menu at 76 BPM: the hook plucked, a low held D, the melody on cellos, tremolo swells and soft chords. No big climax.',
    use: 'menu',
    bpm: 76,
    bars: 32,
    layers: [S('pizz', 'Hook A, pizzicato'), S('lowSus', 'Low held D'), S('chords', 'Soft held chords'), S('trem', 'Tremolo swells'), S('celloMel', 'Melody on cellos')],
    presets: { Full: { pizz: 1, lowSus: 1, chords: 1, trem: 1, celloMel: 1 } },
  },
  {
    id: 'nightshift',
    name: 'Round 6 "Night Shift", in layers',
    about: 'The piece you liked, split into its parts. The first preset is your pick (strings only); "Everything" adds back the brass, organ and drums.',
    use: 'reference',
    bpm: 92,
    bars: 32,
    layers: [
      S('hookCello', 'Hook A, cellos'),
      S('hookBass', 'Hook A, basses'),
      S('hookHigh', 'Hook A, cellos an octave up'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('melody', 'Melody on violins'),
      { id: 'brass', name: 'Brass', kind: 'brass' },
      { id: 'organ', name: 'Organ', kind: 'organ' },
      { id: 'perc', name: 'Percussion', kind: 'perc' },
    ],
    presets: {
      'Strings only (your pick)': { hookCello: 1, hookBass: 1, hookHigh: 1, chords: 1, trem: 1, melody: 1 },
      Everything: { hookCello: 1, hookBass: 1, hookHigh: 1, chords: 1, trem: 1, melody: 1, brass: 1, organ: 1, perc: 1 },
    },
  },
];

export interface Piece {
  meta: PieceMeta;
  layers: Record<string, Stereo>;
}

class Score {
  readonly layers: Record<string, Stereo> = {};
  readonly beat: number;

  constructor(
    readonly bank: Bank,
    readonly meta: PieceMeta,
  ) {
    this.beat = 60 / meta.bpm;
    const n = secs(meta.bars * 4 * this.beat);
    for (const l of meta.layers) this.layers[l.id] = stereo(n);
  }

  L(id: string): Stereo {
    const c = this.layers[id];
    if (!c) throw new Error(`${this.meta.id}: no layer ${id}`);
    return c;
  }

  t(b: number, beat = 0): number {
    return (b * 4 + beat) * this.beat;
  }

  d(beats: number): number {
    return beats * this.beat;
  }
}

const n = midi;
const D = n('D2');

const CH = {
  Dm: { root: n('D2'), tones: [n('D3'), n('F3'), n('A3'), n('D4'), n('F4'), n('A4')] },
  Bb: { root: n('Bb1'), tones: [n('D3'), n('F3'), n('Bb3'), n('D4'), n('F4'), n('Bb4')] },
  Gm: { root: n('G1'), tones: [n('D3'), n('G3'), n('Bb3'), n('D4'), n('G4'), n('Bb4')] },
  A: { root: n('A1'), tones: [n('C#3'), n('E3'), n('A3'), n('C#4'), n('E4'), n('A4')] },
};
type ChordName = keyof typeof CH;
const PROG: ChordName[] = ['Dm', 'Bb', 'Gm', 'A'];

/** Hook A, eighth by eighth (two bars). */
const HOOK_A = ['D2', null, 'D3', 'D2', null, 'C3', null, 'A2', 'D2', null, 'D3', 'D2', 'F2', 'G2', 'Ab2', 'A2'];

/** The motif (8 bars) as [note, beats]. */
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

/** Hook A from bar `from` to `to` on one instrument, `tr` semitones from written, with a per-bar level. */
function hookLine(s: Score, layer: string, inst: string, tr: number, from: number, to: number, vel: (b: number) => number, onlyStrong = false): void {
  for (let b = from; b < to; b++) {
    for (let i = 0; i < 8; i++) {
      const name = HOOK_A[(b % 2) * 8 + i];
      if (!name) continue;
      if (onlyStrong && !(i === 0 || i === 3)) continue;
      const len = HOOK_A[(b % 2) * 8 + i + 1] === null && i < 7 ? 1 : 0.5;
      note(s.L(layer), s.bank, inst, n(name) + tr, s.t(b, i / 2), s.d(len) * 0.9, { vel: vel(b) * (i === 0 ? 1 : 0.78), release: 0.12 });
    }
  }
}

/** Sixteenths on one note with 3 + 3 + 2 accents. */
function drive(s: Score, layer: string, inst: string, m: number, from: number, to: number, vel: number): void {
  const acc = [0, 3, 6, 8, 11, 14];
  for (let b = from; b < to; b++) {
    for (let i = 0; i < 16; i++) note(s.L(layer), s.bank, inst, m, s.t(b, i / 4), s.d(0.25), { vel: vel * (acc.includes(i) ? 1 : 0.6), release: 0.07 });
  }
}

/** The motif on one instrument from bar `at`. */
function motif(s: Score, layer: string, inst: string, at: number, vel: number, tr = 0): void {
  let beat = 0;
  for (const [m, len] of MOTIF) {
    note(s.L(layer), s.bank, inst, n(m) + tr, s.t(at, beat), s.d(len) * 0.97, { vel, attack: len >= 8 ? s.d(3) : 0.15, release: 0.7 });
    beat += len;
  }
}

/** Held chords over the progression, `barsPer` bars each. */
function chords(s: Score, layer: string, from: number, to: number, barsPer: number, vel: number, attack: number, withBass: boolean): void {
  for (let b = from; b < to; b += barsPer) {
    const c = CH[PROG[Math.floor((b - from) / barsPer) % 4]!];
    const dur = s.d(4 * barsPer);
    const o = { vel, attack, release: 0.9 };
    if (withBass) note(s.L(layer), s.bank, 'bassSus', c.root + 12, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'celloSus', c.tones[1]!, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'violaSus', c.tones[2]!, s.t(b), dur, { ...o, vel: vel * 0.9 });
    note(s.L(layer), s.bank, 'violinSus', c.tones[3]!, s.t(b), dur, { ...o, vel: vel * 0.85 });
    note(s.L(layer), s.bank, 'violinSus', c.tones[5]!, s.t(b), dur, { ...o, vel: vel * 0.8 });
  }
}

/** A low held D on basses and cellos, re-bowed every `every` bars with a swell. */
function lowD(s: Score, layer: string, from: number, to: number, every: number, vel: number): void {
  for (let b = from; b < to; b += every) {
    const dur = s.d(4 * every);
    for (const [inst, m] of [['bassSus', D], ['celloSus', D], ['celloSus', D + 7]] as const) {
      note(s.L(layer), s.bank, inst, m, s.t(b), dur, { vel: inst === 'celloSus' && m !== D ? vel * 0.7 : vel, attack: s.d(4), release: 1 });
    }
  }
}

/** High tremolo swells every `every` bars. */
function trem(s: Score, layer: string, from: number, to: number, every: number, vel: number, swell = true): void {
  for (let b = from; b < to; b += every) {
    const dur = s.d(4 * every);
    const attack = swell ? dur * 0.6 : 0.3;
    note(s.L(layer), s.bank, 'violinTrem', n('A4'), s.t(b), dur, { vel, attack, release: 0.9 });
    note(s.L(layer), s.bank, 'violinTrem', n('D5'), s.t(b), dur, { vel: vel * 0.9, attack, release: 0.9 });
    note(s.L(layer), s.bank, 'violaTrem', n('F4'), s.t(b), dur, { vel: vel * 0.8, attack, release: 0.9 });
  }
}

// ------------------------------------------------------------------ pieces

function mission(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, () => 0.7);
  hookLine(s, 'pizz', 'bassPizz', -12, 0, N, () => 0.65, true);
  hookLine(s, 'hookBass', 'bassSpic', -12, 0, N, () => 0.8);
  hookLine(s, 'hookCello', 'celloSpic', 0, 0, N, () => 0.85);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 0, N, () => 0.75);
  drive(s, 'drive', 'celloSpic', D + 12, 0, N, 0.7);
  drive(s, 'drive', 'violaSpic', D + 24, 0, N, 0.6);
  lowD(s, 'lowSus', 0, N, 8, 0.6);
  chords(s, 'chords', 0, N, 2, 0.6, 0.6, false);
  trem(s, 'trem', 0, N, 8, 0.55);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.8, 12);
    motif(s, 'melody', 'violinSus', at, 0.7);
  }
}

function alertFast(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'hookBass', 'bassSpic', -12, 0, N, () => 0.9);
  hookLine(s, 'hookCello', 'celloSpic', 0, 0, N, () => 0.95);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 0, N, () => 0.85);
  drive(s, 'drive', 'celloSpic', D + 12, 0, N, 0.8);
  drive(s, 'drive', 'violaSpic', D + 24, 0, N, 0.7);
  lowD(s, 'lowSus', 0, N, 4, 0.75);
  chords(s, 'chords', 0, N, 2, 0.8, 0.12, false);
  trem(s, 'trem', 0, N, 4, 0.7, false);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.9, 12);
    motif(s, 'melody', 'violinSus', at, 0.8);
    motif(s, 'melody', 'celloSus', at, 0.8, -12);
  }
}

function menuGrand(s: Score): void {
  const N = s.meta.bars;
  const dyn = (b: number): number => (b < 8 ? 0.45 + b * 0.03 : b < 16 ? 0.68 : b < 24 ? 0.82 : 0.92);
  hookLine(s, 'hookLow', 'celloSpic', 0, 0, N - 2, dyn);
  hookLine(s, 'hookLow', 'bassSpic', -12, 0, N - 2, dyn);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 16, N - 2, dyn);
  lowD(s, 'lowSus', 0, 16, 8, 0.5);
  chords(s, 'chords', 16, N - 2, 2, 0.75, 0.4, true);
  // the final chord, ringing into the quiet start
  for (const m of [...CH.Dm.tones, D]) note(s.L('chords'), s.bank, m < n('C3') ? 'bassSus' : m < n('C4') ? 'celloSus' : 'violinSus', m, s.t(N - 2), s.d(8), { vel: 0.85, attack: 0.1, release: 2.5 });
  trem(s, 'trem', 8, 24, 8, 0.45);
  trem(s, 'trem', 24, N - 2, 6, 0.7, false);
  motif(s, 'celloMel', 'celloSus', 8, 0.75, -12);
  motif(s, 'celloMel', 'celloSus', 24, 0.85, -12);
  motif(s, 'violinMel', 'violinSus', 16, 0.75);
  motif(s, 'violinMel', 'violinSus', 24, 0.9, 12);
  motif(s, 'violinMel', 'violaSus', 24, 0.8);
}

function menuBrood(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, (b) => (b < 8 ? 0.55 : 0.68));
  hookLine(s, 'pizz', 'bassPizz', -12, 0, N, () => 0.6, true);
  lowD(s, 'lowSus', 0, N, 8, 0.5);
  chords(s, 'chords', 16, N, 4, 0.45, 2.5, false);
  trem(s, 'trem', 0, N, 8, 0.4);
  motif(s, 'celloMel', 'celloSus', 8, 0.6, -12);
  motif(s, 'celloMel', 'celloSus', 24, 0.7, -12);
}

/** Round 6 "Night Shift", unchanged, with its strings split into layers. */
function nightShiftRef(s: Score): void {
  const dyn = (b: number): number => (b < 8 ? 0.42 + b * 0.03 : b < 16 ? 0.65 : b < 30 ? 0.88 : 0.7);
  hookLine(s, 'hookCello', 'celloSpic', 0, 0, 31, dyn);
  hookLine(s, 'hookBass', 'bassSpic', -12, 0, 8, dyn, true);
  hookLine(s, 'hookBass', 'bassSpic', -12, 8, 31, dyn);
  hookLine(s, 'hookHigh', 'celloSpic', 12, 16, 31, (b) => dyn(b) * 0.75);
  const strings = (at: number, beats: number, c: ChordName, vel: number, attack: number): void => {
    const ch = CH[c];
    const dur = s.d(beats);
    note(s.L('chords'), s.bank, 'bassSus', ch.root + 12, at, dur, { vel, attack, release: 0.8 });
    note(s.L('chords'), s.bank, 'celloSus', ch.root + 12, at, dur, { vel, attack, release: 0.8 });
    note(s.L('chords'), s.bank, 'celloSus', ch.tones[1]!, at, dur, { vel: vel * 0.8, attack, release: 0.8 });
    note(s.L('chords'), s.bank, 'violaSus', ch.tones[2]!, at, dur, { vel: vel * 0.8, attack, release: 0.8 });
    note(s.L('chords'), s.bank, 'violinSus', ch.tones[3]!, at, dur, { vel: vel * 0.8, attack, release: 0.9 });
    note(s.L('chords'), s.bank, 'violinSus', ch.tones[5]!, at, dur, { vel: vel * 0.75, attack, release: 0.9 });
  };
  for (let b = 16; b < 30; b += 2) strings(s.t(b), 8, PROG[((b - 16) / 2) % 4]!, 0.7, 0.2);
  strings(s.t(30), 6, 'Dm', 0.85, 0.05);
  for (let b = 8; b < 16; b += 4) note(s.L('trem'), s.bank, 'violinTrem', n('D5'), s.t(b), s.d(16), { vel: 0.4, attack: s.d(10), release: 0.8 });
  motif(s, 'melody', 'violinSus', 24, 0.8, 12);
  // brass, organ and percussion as in round 6
  const B = s.L('brass');
  const brassMotif = (at: number, inst: string, vel: number, tr = 0): void => {
    let beat = 0;
    for (const [m, len] of MOTIF) {
      note(B, s.bank, inst, n(m) + tr, s.t(at, beat), s.d(len) * 0.97, { vel, attack: len >= 8 ? s.d(3) : 0.12, release: 0.6 });
      beat += len;
    }
  };
  brassMotif(8, 'hornSus', 0.5);
  brassMotif(16, 'hornSus', 0.85);
  brassMotif(16, 'tbnSus', 0.75, -12);
  brassMotif(24, 'hornSus', 0.95);
  brassMotif(24, 'tbnSus', 0.9, -12);
  const braam = (at: number, root: number, vel: number, beats: number): void => {
    for (const m of [root, root + 7, root + 12]) note(B, s.bank, 'tbnSus', m, at, s.d(beats), { vel, loud: true, attack: 0.04, release: 1.6 });
    note(B, s.bank, 'tubaSus', root, at, s.d(beats), { vel, loud: true, attack: 0.05, release: 1.6 });
    for (const m of [root + 12, root + 19]) note(B, s.bank, 'hornSus', m, at, s.d(beats), { vel: vel * 0.85, loud: true, attack: 0.05, release: 1.4 });
    timp(s.L('perc'), s.bank, root + 12, at, vel);
    hit(s.L('perc'), s.bank, 'bdrum', 1, at, vel * 0.9);
  };
  for (let b = 16; b < 30; b += 2) braam(s.t(b), CH[PROG[((b - 16) / 2) % 4]!].root, b < 24 ? 0.75 : 0.9, 4);
  braam(s.t(30), D, 1, 6);
  const O = s.L('organ');
  for (const m of [n('D3'), n('A3'), n('D4'), n('F4')]) note(O, s.bank, 'organQuiet', m, s.t(0), s.d(32), { vel: 0.6, attack: s.d(8), release: 1.5 });
  for (let b = 8; b < 16; b += 2) for (const m of CH[PROG[((b - 8) / 2) % 4]!].tones.slice(1, 5)) note(O, s.bank, 'organQuiet', m, s.t(b), s.d(8), { vel: 0.65, attack: 0.5, release: 1 });
  for (let b = 16; b < 30; b += 2) {
    const c = CH[PROG[((b - 16) / 2) % 4]!];
    for (const m of c.tones.slice(1, 6)) note(O, s.bank, 'organLoud', m, s.t(b), s.d(8), { vel: 0.75, attack: 0.15, release: 1.2 });
    note(O, s.bank, 'organLoud', c.root, s.t(b), s.d(8), { vel: 0.8, attack: 0.15, release: 1.2 });
  }
  const P = s.L('perc');
  for (let b = 8; b < 30; b++) timp(P, s.bank, D + 12, s.t(b), b < 16 ? 0.5 : 0.7);
  for (let b = 16; b < 30; b++) for (const beat of [0, 1.5, 3]) hit(P, s.bank, 'giant', 2, s.t(b, beat), beat === 0 ? 0.75 : 0.5);
  swellInto(P, s.bank, 'cym', 1, s.t(16), 0.7);
  swellInto(P, s.bank, 'cym', 1, s.t(24), 0.8);
  hit(P, s.bank, 'gong', 0, s.t(24), 0.6);
  hit(P, s.bank, 'gong', 0, s.t(30), 0.85);
  timp(P, s.bank, D + 12, s.t(14), 0.6, true);
}

export function renderPiece(bank: Bank, meta: PieceMeta): Piece {
  const s = new Score(bank, meta);
  if (meta.id === 'mission') mission(s);
  else if (meta.id === 'alertfast') alertFast(s);
  else if (meta.id === 'menugrand') menuGrand(s);
  else if (meta.id === 'menubrood') menuBrood(s);
  else nightShiftRef(s);
  return { meta, layers: s.layers };
}
