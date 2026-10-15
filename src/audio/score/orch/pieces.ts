/**
 * The Night Shift score, round 15 (Michael, 2026-10-16): "Alert, under fire" is the Alert theme and "Menu theme, Grand,
 * dialled back" is the menu; everything else was removed. Built around those two:
 * - three sneaking loops (Heartbeat, Ticking, Breath) for Calm and Cautious, almost silent in Calm, made from Under
 *   fire's ingredients (the D / E-flat rub, ticking, slow climbing semitones, a heartbeat, a sub bass) with Hook A only
 *   in fragments, so the theme is not worn out;
 * - the "spotted" hit that leads into Under fire's downbeat;
 * - two alternatives of the menu.
 * The test page runs a sneaking loop and Under fire with the music director, so the states fade into each other.
 * Original music for this project; recorded instruments are CC0 VSCO 2 CE.
 */
import { RATE, secs, stereo, type Stereo } from '../../music/render/canvas';
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
  /** What it is for: the Alert theme, the menu, a sneaking loop (Calm and Cautious), or a one-shot (the spotted hit). */
  use: 'alert' | 'menu' | 'stealth' | 'shot';
  bpm: number;
  bars: number;
  layers: LayerMeta[];
  /** Named layer mixes (layer id -> gain; missing = 0). The first is the default. */
  presets: Record<string, Record<string, number>>;
  /** Loudness of everything on (gated, dB); quieter for menus and sneaking. Default: the render command's target. */
  target?: number;
}

const S = (id: string, name: string): LayerMeta => ({ id, name, kind: 'strings' });

const STEALTH_ABOUT = 'Plays under the game while you sneak. Calm is almost silent; Cautious adds tension. Hook A only appears in fragments, so the theme stays fresh for Alert.';

export const PIECES: readonly PieceMeta[] = [
  {
    id: 'underfire',
    name: 'Alert, under fire',
    about: 'The Alert theme (kept): 132 BPM, the hook and melody over pounding drums, off-beat stabs, climbing violins, a high tremolo rub, ticking and a rising drive. "Under fire + bass" adds a bass line and a deep sub bass.',
    use: 'alert',
    bpm: 132,
    bars: 40,
    layers: [
      S('hookBass', 'Hook A, basses'),
      S('hookCello', 'Hook A, cellos'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('drive', 'Driving sixteenths (rising every 4th bar)'),
      S('rise', 'Violins climbing a semitone at a time'),
      S('trem', 'Tremolo rub, high (D against E-flat)'),
      S('stabs', 'Off-beat stabs, strings'),
      S('ticks', 'Fast ticking, high violins'),
      S('lowSus', 'Low held D'),
      S('melody', 'Melody on violins and cellos'),
      S('bass', 'Bass line: basses and cellos on the chord roots'),
      S('sub', 'Deep sub bass (hybrid, under the orchestra)'),
      { id: 'hornStabs', name: 'Off-beat stabs, short horns', kind: 'brass' },
      { id: 'brass', name: 'Low brass swells', kind: 'brass' },
      { id: 'drums', name: 'Pounding drums, timpani, swells', kind: 'perc' },
    ],
    presets: {
      'Under fire': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.45, melody: 0.85, hornStabs: 0.6, brass: 0.5, drums: 0.8 },
      'Under fire + bass': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.3, melody: 0.85, bass: 0.75, sub: 0.6, hornStabs: 0.6, brass: 0.5, drums: 0.8 },
      Evasion: { hookBass: 0.7, hookCello: 0.85, drive: 0.5, trem: 0.4, ticks: 0.4, lowSus: 0.4, drums: 0.4 },
      'Strings only': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.45, melody: 0.85 },
    },
  },
  {
    id: 'spotted',
    name: 'Spotted (the hit into Alert)',
    about: 'The instant hit when a guard spots you, with a two-beat run-in that lands on Under fire\'s first downbeat.',
    use: 'shot',
    bpm: 132,
    bars: 1,
    layers: [{ id: 'all', name: 'Spotted hit', kind: 'brass' }],
    presets: { Hit: { all: 1 } },
    target: -15,
  },
  {
    id: 'heartbeat',
    name: 'Sneaking: Heartbeat',
    about: `${STEALTH_ABOUT} A slow heartbeat on a big drum, a deep sub, the high D / E-flat rub far away; Cautious adds soft ticking, a gentle eighth-note pulse on D, violas climbing a semitone every 2 bars and a low held D.`,
    use: 'stealth',
    bpm: 88,
    bars: 32,
    target: -22,
    layers: [
      S('sub', 'Deep sub (D)'),
      { id: 'heart', name: 'Heartbeat drum', kind: 'perc' },
      S('rub', 'High rub, far away (D against E-flat)'),
      S('frag', 'Hook A fragment, plucked (every 4 bars)'),
      S('tick', 'Soft ticking, high violins'),
      S('drive', 'Gentle pulse on D, cellos'),
      S('climb', 'Violas climbing a semitone every 2 bars'),
      S('low', 'Low held D'),
    ],
    presets: {
      Calm: { sub: 0.5, heart: 0.45, rub: 0.3, frag: 0.35 },
      Cautious: { sub: 0.6, heart: 0.65, rub: 0.5, frag: 0.55, tick: 0.5, drive: 0.5, climb: 0.55, low: 0.45 },
      'Everything on': { sub: 1, heart: 1, rub: 1, frag: 1, tick: 1, drive: 1, climb: 1, low: 1 },
    },
  },
  {
    id: 'ticking',
    name: 'Sneaking: Ticking',
    about: `${STEALTH_ABOUT} A quiet clock-like tick on high violins and a deep sub, the rub only now and then; Cautious doubles the ticking, adds a plucked heartbeat, Hook A plucked quietly (in two 8-bar spells only) and the climbing violas.`,
    use: 'stealth',
    bpm: 88,
    bars: 32,
    target: -22,
    layers: [
      S('clock', 'Ticking clock (quarter notes)'),
      S('sub', 'Deep sub (D)'),
      S('rub', 'High rub, now and then'),
      S('tick8', 'Ticking doubled (eighths)'),
      S('pulse', 'Plucked heartbeat, basses and cellos'),
      S('pizz', 'Hook A, plucked (two spells)'),
      S('climb', 'Violas climbing a semitone every 2 bars'),
    ],
    presets: {
      Calm: { clock: 0.35, sub: 0.45, rub: 0.25 },
      Cautious: { clock: 0.5, tick8: 0.45, sub: 0.55, rub: 0.45, pulse: 0.5, pizz: 0.55, climb: 0.5 },
      'Everything on': { clock: 1, sub: 1, rub: 1, tick8: 1, pulse: 1, pizz: 1, climb: 1 },
    },
  },
  {
    id: 'breath',
    name: 'Sneaking: Breath',
    about: `${STEALTH_ABOUT} The slowest (66 BPM, half Under fire's tempo): long low string swells that breathe in and out, the rub, a deep sub; Cautious adds the heartbeat drum, Hook A plucked slowly and the climbing violas.`,
    use: 'stealth',
    bpm: 66,
    bars: 24,
    target: -22,
    layers: [
      S('swell', 'Low string swells (breathing)'),
      S('rub', 'High rub, far away'),
      S('sub', 'Deep sub'),
      { id: 'heart', name: 'Heartbeat drum', kind: 'perc' },
      S('pizz', 'Hook A, plucked (slow)'),
      S('climb', 'Violas climbing a semitone every 2 bars'),
    ],
    presets: {
      Calm: { swell: 0.4, rub: 0.3, sub: 0.4 },
      Cautious: { swell: 0.6, rub: 0.45, sub: 0.5, heart: 0.55, pizz: 0.55, climb: 0.5 },
      'Everything on': { swell: 1, rub: 1, sub: 1, heart: 1, pizz: 1, climb: 1 },
    },
  },
  {
    id: 'grandsoft',
    name: 'Menu theme, Grand, dialled back',
    about: 'The menu theme (kept): 90 BPM, the hook alone, then the melody on cellos, then violins and the whole section, a long final chord. Starts on the softer mix; "Full" is the original balance.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -21,
    layers: [
      S('hookLow', 'Hook A, cellos and basses'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('lowSus', 'Low held D'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('celloMel', 'Melody on cellos'),
      S('violinMel', 'Melody on violins'),
    ],
    presets: {
      Softer: { hookLow: 0.9, hookHigh: 0.5, lowSus: 0.6, chords: 0.65, trem: 0.45, celloMel: 0.9, violinMel: 0.8 },
      Full: { hookLow: 1, hookHigh: 1, lowSus: 1, chords: 1, trem: 1, celloMel: 1, violinMel: 1 },
    },
  },
  {
    id: 'grandnight',
    name: 'Menu alternative: Grand, night opening',
    about: 'The same menu, but it opens in the dark: four bars of a heartbeat, a deep sub and the far-away rub (the sneaking sound) before the hook comes in.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -21,
    layers: [
      { id: 'night', name: 'Night opening (heartbeat, sub, rub)', kind: 'perc' },
      S('hookLow', 'Hook A, cellos and basses'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('lowSus', 'Low held D'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('celloMel', 'Melody on cellos'),
      S('violinMel', 'Melody on violins'),
    ],
    presets: {
      Softer: { night: 1, hookLow: 0.9, hookHigh: 0.5, lowSus: 0.6, chords: 0.65, trem: 0.45, celloMel: 0.9, violinMel: 0.8 },
      Full: { night: 1, hookLow: 1, hookHigh: 1, lowSus: 1, chords: 1, trem: 1, celloMel: 1, violinMel: 1 },
    },
  },
  {
    id: 'grandhorns',
    name: 'Menu alternative: Grand with soft horns and drums',
    about: 'The same menu with the Zimmer warmth you liked: soft horns doubling the melody and swelling under the chords, and a soft drum heartbeat with cymbal swells in the second half.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -21,
    layers: [
      S('hookLow', 'Hook A, cellos and basses'),
      S('hookHigh', 'Hook A, violas an octave up'),
      S('lowSus', 'Low held D'),
      S('chords', 'Held chords'),
      S('trem', 'High tremolo'),
      S('celloMel', 'Melody on cellos'),
      S('violinMel', 'Melody on violins'),
      { id: 'horns', name: 'Soft horns', kind: 'brass' },
      { id: 'pulse', name: 'Soft drums and swells', kind: 'perc' },
    ],
    presets: {
      Softer: { hookLow: 0.9, hookHigh: 0.5, lowSus: 0.6, chords: 0.65, trem: 0.45, celloMel: 0.9, violinMel: 0.8, horns: 0.7, pulse: 0.6 },
      Full: { hookLow: 1, hookHigh: 1, lowSus: 1, chords: 1, trem: 1, celloMel: 1, violinMel: 1, horns: 1, pulse: 1 },
    },
  },
];

export interface Piece {
  meta: PieceMeta;
  layers: Record<string, Stereo>;
}

/** Seconds of tail after a one-shot (the spotted hit rings out). */
export const SHOT_TAIL = 3.5;

class Score {
  readonly layers: Record<string, Stereo> = {};
  readonly beat: number;

  constructor(
    readonly bank: Bank,
    readonly meta: PieceMeta,
  ) {
    this.beat = 60 / meta.bpm;
    const n = secs(meta.bars * 4 * this.beat + (meta.use === 'shot' ? SHOT_TAIL : 0));
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

/** Hook A from bar `from` to `to` on one instrument, `tr` semitones from written, with a per-bar level; the first note leads gently. */
function hookLine(s: Score, layer: string, inst: string, tr: number, from: number, to: number, vel: (b: number) => number, onlyStrong = false, lead = 0.9): void {
  for (let b = from; b < to; b++) {
    for (let i = 0; i < 8; i++) {
      const name = HOOK_A[(b % 2) * 8 + i];
      if (!name) continue;
      if (onlyStrong && !(i === 0 || i === 3)) continue;
      const len = HOOK_A[(b % 2) * 8 + i + 1] === null && i < 7 ? 1 : 0.5;
      note(s.L(layer), s.bank, inst, n(name) + tr, s.t(b, i / 2), s.d(len) * 0.9, { vel: vel(b) * (i === 0 ? lead : 0.8), release: 0.12 });
    }
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

/** A sine sub bass with a little second harmonic (so small speakers hint at it), soft attack, written straight onto the canvas. */
function subBass(c: Stereo, t: number, dur: number, m: number, gain: number, attack = 0.06): void {
  const f = 440 * Math.pow(2, (m - 69) / 12);
  const n0 = Math.round(t * RATE);
  const len = Math.round((dur + 0.3) * RATE);
  const att = Math.max(1, Math.round(attack * RATE));
  const rel = Math.round(0.3 * RATE);
  const N = c.l.length;
  for (let i = 0; i < len; i++) {
    const env = Math.min(1, i / att) * (i > len - rel ? (len - i) / rel : 1);
    const ph = (2 * Math.PI * f * i) / RATE;
    const v = (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * env * gain;
    const j = (n0 + i) % N;
    c.l[j]! += v;
    c.r[j]! += v;
  }
}

function brassSwells(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[PROG[Math.floor(b / 2) % 4]!];
    note(s.L(layer), s.bank, 'hornSus', c.tones[0]!, s.t(b), s.d(8), { vel, attack: s.d(2), release: 1.2 });
    note(s.L(layer), s.bank, 'hornSus', c.tones[2]!, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(2), release: 1.2 });
    note(s.L(layer), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(2), release: 1.2 });
  }
}

// ------------------------------------------------------------------ the Alert theme: under fire (unchanged)

function underFire(s: Score): void {
  const N = s.meta.bars;
  const chordAt = (b: number): ChordName => PROG[Math.floor(b / 2) % 4]!;
  hookLine(s, 'hookBass', 'bassSpic', -12, 0, N, () => 0.9);
  hookLine(s, 'hookCello', 'celloSpic', 0, 0, N, () => 0.95);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 0, N, () => 0.85);
  // driving sixteenths: the last two beats of every 4th bar rise a semitone (the screw tightening)
  const acc = [0, 3, 6, 8, 11, 14];
  for (let b = 0; b < N; b++) {
    for (let i = 0; i < 16; i++) {
      const up = b % 4 === 3 && i >= 8 ? 1 : 0;
      const v = 0.62 * (acc.includes(i) ? 1 : 0.6);
      note(s.L('drive'), s.bank, 'celloSpic', D + 12 + up, s.t(b, i / 4), s.d(0.25), { vel: v, release: 0.06 });
      note(s.L('drive'), s.bank, 'violaSpic', D + 24 + up, s.t(b, i / 4), s.d(0.25), { vel: v * 0.9, release: 0.06 });
    }
  }
  // violins climbing a semitone per bar over 4 bars, repeated eighths (A4 -> C5), restarting each 4 bars
  for (let b = 0; b < N; b++) {
    const m = n('A4') + (b % 4);
    for (let i = 0; i < 8; i++) note(s.L('rise'), s.bank, 'violinSpic', m, s.t(b, i / 2), s.d(0.4), { vel: 0.5 + 0.06 * (b % 4) + (i % 2 ? 0 : 0.08), release: 0.08 });
  }
  // a grating tremolo rub: D5 against E-flat5, swelling over 4 bars; violas on A4
  for (let b = 0; b < N; b += 4) {
    for (const [inst, m, v] of [['violinTrem', n('D5'), 0.6], ['violinTrem', n('Eb5'), 0.5], ['violaTrem', n('A4'), 0.5]] as const) {
      note(s.L('trem'), s.bank, inst, m, s.t(b), s.d(16), { vel: v, attack: s.d(12), release: 0.4 });
    }
  }
  // off-beat stabs (the "shots"): on the "and" of 2 and the last sixteenth of 4, strings and short horns
  for (let b = 0; b < N; b++) {
    const c = CH[chordAt(b)];
    for (const [beat, v] of [[1.5, 1], [3.75, 0.85]] as const) {
      for (const m of [c.tones[2]!, c.tones[3]!]) note(s.L('stabs'), s.bank, m < n('C4') ? 'violaSpic' : 'violinSpic', m, s.t(b, beat), s.d(0.2), { vel: v, release: 0.06 });
      note(s.L('stabs'), s.bank, 'celloSpic', c.tones[1]!, s.t(b, beat), s.d(0.2), { vel: v * 0.9, release: 0.06 });
      for (const m of [c.tones[1]!, c.tones[3]!]) note(s.L('hornStabs'), s.bank, 'hornStac', m, s.t(b, beat), s.d(0.25), { vel: v, release: 0.08 });
    }
  }
  // fast ticking: high violins, soft sixteenths on A5
  for (let b = 0; b < N; b++) for (let i = 0; i < 16; i++) note(s.L('ticks'), s.bank, 'violinSpic', n('A5'), s.t(b, i / 4), s.d(0.2), { vel: i % 4 === 0 ? 0.8 : 0.55, release: 0.05 });
  lowD(s, 'lowSus', 0, N, 4, 0.5);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.85, 12);
    motif(s, 'melody', 'violinSus', at, 0.75);
    motif(s, 'melody', 'celloSus', at, 0.75, -12);
  }
  brassSwells(s, 'brass', 0, N, 0.4);
  // pounding drums: a heart-rate pattern on the big drum, timpani on the chord changes, bass drum every 2 bars, swells
  const P = s.L('drums');
  for (let b = 0; b < N; b++) {
    for (const [i, which, v] of [[0, 1, 1], [3, 0, 0.7], [6, 0, 0.75], [8, 1, 0.9], [11, 0, 0.7], [14, 2, 0.6]] as const) hit(P, s.bank, 'giantStick', which, s.t(b, i / 4), 0.75 * v);
    hit(P, s.bank, 'giant', 1, s.t(b), 0.7);
    hit(P, s.bank, 'giant', 1, s.t(b, 2), 0.55);
    if (b % 2 === 0) {
      timp(P, s.bank, CH[chordAt(b)].root + 12, s.t(b), 0.75);
      hit(P, s.bank, 'bdrum', 1, s.t(b), 0.6);
    }
  }
  for (let b = 8; b <= N; b += 8) swellInto(P, s.bank, 'cym', 1, s.t(b % N), 0.6);
  // a driving bass line on the chord roots (basses and cellos, eighths) and a deep sub bass under it
  for (let b = 0; b < N; b++) {
    const r = CH[chordAt(b)].root;
    for (const [i, v] of [[0, 1], [1, 0.6], [3, 0.85], [4, 0.6], [6, 0.9], [7, 0.6]] as const) {
      note(s.L('bass'), s.bank, 'bassSpic', r, s.t(b, i / 2), s.d(0.45), { vel: 0.8 * v, release: 0.08 });
      note(s.L('bass'), s.bank, 'celloSpic', r + 12, s.t(b, i / 2), s.d(0.45), { vel: 0.65 * v, release: 0.08 });
    }
    if (b % 2 === 0) subBass(s.L('sub'), s.t(b), s.d(8), r - 12, 0.5);
  }
}

// ------------------------------------------------------------------ the spotted hit

function spotted(s: Score): void {
  const A = s.L('all');
  // the hit: low brass and short horns on a D / E-flat cluster, strings ripping into a tremolo rub, drums, cymbal
  for (const m of [D, D + 12]) note(A, s.bank, 'tbnSus', m, 0, s.d(1.2), { vel: 1, loud: true, attack: 0.02, release: 0.9 });
  note(A, s.bank, 'tubaSus', D, 0, s.d(1.2), { vel: 1, loud: true, attack: 0.02, release: 0.9 });
  for (const m of [n('D4'), n('Eb4'), n('A4')]) note(A, s.bank, 'hornStac', m, 0, s.d(0.4), { vel: 1, release: 0.15 });
  for (const m of [n('D5'), n('Eb5')]) note(A, s.bank, 'violinTrem', m, 0, s.d(1.6), { vel: 0.9, attack: 0.01, release: 0.6 });
  note(A, s.bank, 'celloSpic', n('D3'), 0, s.d(0.3), { vel: 1, release: 0.1 });
  note(A, s.bank, 'bassSpic', D, 0, s.d(0.3), { vel: 1, release: 0.1 });
  timp(A, s.bank, D + 12, 0, 1);
  hit(A, s.bank, 'giant', 1, 0, 1);
  hit(A, s.bank, 'bdrum', 2, 0, 0.9);
  hit(A, s.bank, 'cym', 0, 0, 0.6);
  subBass(A, 0, 1.2, D - 12, 0.6, 0.005);
  // the run-in: a drum roll crescendo and violins climbing in sixteenths, landing on the Alert downbeat (beat 2)
  for (let k = 2; k < 8; k++) {
    const t = s.d(k / 4);
    hit(A, s.bank, 'giantStick', k % 2 ? 0 : 1, t, 0.35 + 0.1 * (k - 2));
    note(A, s.bank, 'violinSpic', n('A4') + (k - 2), t, s.d(0.2), { vel: 0.5 + 0.08 * (k - 2), release: 0.06 });
  }
  timp(A, s.bank, D + 12, s.d(0.5), 0.6, true);
}

// ------------------------------------------------------------------ sneaking loops

/** Bars that rest (silence in the sparse layers): the 8th of every 8. */
const resting = (b: number): boolean => b % 8 === 7;

/** The far-away rub: violin tremolo on D5 against E-flat5, a long swell in and out every `every` bars. */
function rub(s: Score, layer: string, from: number, to: number, every: number, vel: number): void {
  for (let b = from; b < to; b += every) {
    const dur = s.d(4 * Math.min(every, 8));
    for (const [m, v] of [[n('D5'), 1], [n('Eb5'), 0.8]] as const) note(s.L(layer), s.bank, 'violinTrem', m, s.t(b), dur, { vel: vel * v, attack: dur * 0.6, release: dur * 0.35 });
  }
}

/** A heartbeat on the big drum (lub on 1, dub just after), soft. */
function heartbeat(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b++) {
    if (resting(b)) continue;
    hit(s.L(layer), s.bank, 'giant', 4, s.t(b), vel);
    hit(s.L(layer), s.bank, 'giant', 4, s.t(b, 0.5), vel * 0.6);
  }
}

/** Violas climbing a semitone every 2 bars from A3 over 8 bars, tremolo, swelling. */
function climb(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const m = n('A3') + Math.floor(((b - from) % 8) / 2);
    note(s.L(layer), s.bank, 'violaTrem', m, s.t(b), s.d(8), { vel: vel * (0.8 + 0.07 * ((b - from) % 8) / 2), attack: s.d(5), release: 0.5 });
  }
}

/** A deep sub on D, re-swelled every 8 bars. */
function subD(s: Score, layer: string, from: number, to: number, gain: number): void {
  for (let b = from; b < to; b += 8) subBass(s.L(layer), s.t(b), s.d(32), D - 12, gain, s.d(8));
}

function heartbeatLoop(s: Score): void {
  const N = s.meta.bars;
  subD(s, 'sub', 0, N, 0.2);
  heartbeat(s, 'heart', 0, N, 0.5);
  rub(s, 'rub', 0, N, 8, 0.35);
  // Hook A's opening (D . D3 D) plucked once every 4 bars
  for (let b = 1; b < N; b += 4) {
    for (const [i, m, v] of [[0, D, 1], [2, D + 12, 0.8], [3, D, 0.85]] as const) note(s.L('frag'), s.bank, 'celloPizz', m, s.t(b, i / 2), s.d(1), { vel: 0.55 * v, release: 0.3 });
    note(s.L('frag'), s.bank, 'bassPizz', D - 12, s.t(b), s.d(1), { vel: 0.45, release: 0.3 });
  }
  for (let b = 0; b < N; b++) for (let i = 0; i < 8; i++) note(s.L('tick'), s.bank, 'violinSpic', n('A5'), s.t(b, i / 2), s.d(0.2), { vel: i % 2 ? 0.42 : 0.55, release: 0.05 });
  for (let b = 0; b < N; b++) {
    if (resting(b)) continue;
    for (const [i, v] of [[0, 1], [3, 0.8], [6, 0.8]] as const) note(s.L('drive'), s.bank, 'celloSpic', D + 12, s.t(b, i / 2), s.d(0.45), { vel: 0.5 * v, release: 0.1 });
  }
  climb(s, 'climb', 0, N, 0.6);
  lowD(s, 'low', 0, N, 8, 0.35);
}

function tickingLoop(s: Score): void {
  const N = s.meta.bars;
  for (let b = 0; b < N; b++) for (let i = 0; i < 4; i++) note(s.L('clock'), s.bank, 'violinSpic', n('A5'), s.t(b, i), s.d(0.25), { vel: i === 0 ? 0.58 : 0.48, release: 0.06 });
  for (let b = 0; b < N; b++) for (let i = 1; i < 8; i += 2) note(s.L('tick8'), s.bank, 'violinSpic', n('E5'), s.t(b, i / 2), s.d(0.2), { vel: 0.45, release: 0.05 });
  subD(s, 'sub', 0, N, 0.2);
  rub(s, 'rub', 4, N, 16, 0.3);
  for (let b = 0; b < N; b++) {
    if (resting(b)) continue;
    for (const [beat, v] of [[0, 1], [0.5, 0.65]] as const) {
      note(s.L('pulse'), s.bank, 'bassPizz', D - 12, s.t(b, beat), s.d(1), { vel: 0.5 * v, release: 0.3 });
      note(s.L('pulse'), s.bank, 'celloPizz', D, s.t(b, beat), s.d(1), { vel: 0.4 * v, release: 0.3 });
    }
  }
  hookLine(s, 'pizz', 'celloPizz', 0, 8, 16, () => 0.5, false, 0.85);
  hookLine(s, 'pizz', 'celloPizz', 0, 24, 32, () => 0.5, false, 0.85);
  climb(s, 'climb', 0, N, 0.6);
}

function breathLoop(s: Score): void {
  const N = s.meta.bars;
  // long breaths: D, B-flat, D, G minor, D, A (four bars each)
  const roots: ChordName[] = ['Dm', 'Bb', 'Dm', 'Gm', 'Dm', 'A'];
  for (let k = 0; k < roots.length; k++) {
    const c = CH[roots[k]!];
    const at = s.t(k * 4);
    const dur = s.d(16);
    note(s.L('swell'), s.bank, 'bassSus', c.root + 12, at, dur, { vel: 0.45, attack: dur * 0.55, release: dur * 0.4 });
    note(s.L('swell'), s.bank, 'celloSus', c.root + 12, at, dur, { vel: 0.45, attack: dur * 0.55, release: dur * 0.4 });
    note(s.L('swell'), s.bank, 'violaSus', c.tones[1]!, at, dur, { vel: 0.32, attack: dur * 0.6, release: dur * 0.4 });
    subBass(s.L('sub'), at, dur, c.root, 0.18, dur * 0.5);
  }
  rub(s, 'rub', 0, N, 8, 0.35);
  heartbeat(s, 'heart', 0, N, 0.5);
  hookLine(s, 'pizz', 'celloPizz', 0, 4, 12, () => 0.5, false, 0.85);
  hookLine(s, 'pizz', 'celloPizz', 0, 16, 24, () => 0.5, false, 0.85);
  climb(s, 'climb', 0, N, 0.6);
}

// ------------------------------------------------------------------ the menu (kept) and its alternatives

function menuGrand(s: Score, hookFrom = 0): void {
  const N = s.meta.bars;
  const dyn = (b: number): number => (b < 8 ? 0.45 + b * 0.03 : b < 16 ? 0.68 : b < 24 ? 0.82 : 0.92);
  hookLine(s, 'hookLow', 'celloSpic', 0, hookFrom, N - 2, dyn);
  hookLine(s, 'hookLow', 'bassSpic', -12, hookFrom, N - 2, dyn);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 16, N - 2, dyn);
  lowD(s, 'lowSus', hookFrom, 16, 8, 0.5);
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

function grandNight(s: Score): void {
  menuGrand(s, 4);
  subD(s, 'night', 0, 8, 0.35);
  heartbeat(s, 'night', 0, 6, 0.5);
  rub(s, 'night', 0, 8, 8, 0.35);
}

function grandHorns(s: Score): void {
  menuGrand(s);
  motif(s, 'horns', 'hornSus', 8, 0.3, -12);
  brassSwells(s, 'horns', 16, 30, 0.3);
  motif(s, 'horns', 'hornSus', 24, 0.35, -12);
  const P = s.L('pulse');
  for (let b = 16; b < 30; b++) hit(P, s.bank, 'giant', 4, s.t(b), b < 24 ? 0.35 : 0.45);
  swellInto(P, s.bank, 'cym', 1, s.t(16), 0.4);
  swellInto(P, s.bank, 'cym', 1, s.t(24), 0.5);
  hit(P, s.bank, 'gong', 1, s.t(30), 0.4);
}

export function renderPiece(bank: Bank, meta: PieceMeta): Piece {
  const s = new Score(bank, meta);
  switch (meta.id) {
    case 'underfire':
      underFire(s);
      break;
    case 'spotted':
      spotted(s);
      break;
    case 'heartbeat':
      heartbeatLoop(s);
      break;
    case 'ticking':
      tickingLoop(s);
      break;
    case 'breath':
      breathLoop(s);
      break;
    case 'grandnight':
      grandNight(s);
      break;
    case 'grandhorns':
      grandHorns(s);
      break;
    default:
      menuGrand(s);
  }
  return { meta, layers: s.layers };
}
