/**
 * The Night Shift score, round 15 (Michael, 2026-10-16): "Alert, under fire" is the Alert theme and "Menu theme, Grand,
 * dialled back" is the menu; everything else was removed. Built around those two:
 * - the sneaking loop (Heartbeat; round 16: Calm is near silence, Cautious the heartbeat and the broken hook), made from
 *   Under fire's ingredients (the D / E-flat rub, ticking, slow climbing semitones, a heartbeat, a sub bass) with Hook A only
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
  /** Reverb send override (the kind's default otherwise); lower = drier and more upfront. */
  wet?: number;
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
/** A drier strings layer (less reverb), for the hook in Alert: closer, with more punch. */
const Dry = (id: string, name: string): LayerMeta => ({ id, name, kind: 'strings', wet: 0.14 });

export const PIECES: readonly PieceMeta[] = [
  {
    id: 'underfire',
    name: 'Alert, under fire',
    about: 'The Alert theme (kept): 132 BPM, the hook and melody over pounding drums, off-beat stabs, climbing violins, a high tremolo rub, ticking and a rising drive. Round 18: "hook forward" brings Hook A to the front with punch (drier hook, a short tuba and short horns doubling it, a sub hit under each note, the parts on the same notes turned down). The earlier mixes are still there.',
    use: 'alert',
    bpm: 132,
    bars: 40,
    layers: [
      Dry('hookBass', 'Hook A, basses'),
      Dry('hookCello', 'Hook A, cellos'),
      Dry('hookHigh', 'Hook A, violas an octave up'),
      { id: 'hookTuba', name: 'Hook A, short tuba (punch)', kind: 'brass', wet: 0.14 },
      { id: 'hookHorns', name: 'Hook A, short horns an octave up', kind: 'brass', wet: 0.18 },
      { id: 'hookSub', name: 'Sub hit under each hook note', kind: 'perc', wet: 0 },
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
      'Alert: hook forward': { hookBass: 1.1, hookCello: 1.3, hookHigh: 0.9, hookTuba: 1.6, hookHorns: 0.5, hookSub: 0.6, drive: 0.35, rise: 0.55, trem: 0.45, stabs: 0.6, ticks: 0.35, lowSus: 0.3, melody: 0.85, bass: 0.4, hornStabs: 0.5, brass: 0.4, drums: 0.8 },
      'Alert: hook forward, no tuba': { hookBass: 1.2, hookCello: 1.35, hookHigh: 0.9, hookHorns: 0.4, hookSub: 0.7, drive: 0.35, rise: 0.55, trem: 0.45, stabs: 0.6, ticks: 0.35, lowSus: 0.3, melody: 0.85, bass: 0.45, hornStabs: 0.5, brass: 0.4, drums: 0.8 },
      'Under fire': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.45, melody: 0.85, hornStabs: 0.6, brass: 0.5, drums: 0.8 },
      'Under fire + bass': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.3, melody: 0.85, bass: 0.75, sub: 0.6, hornStabs: 0.6, brass: 0.5, drums: 0.8 },
      Evasion: { hookBass: 0.8, hookCello: 0.95, hookSub: 0.3, drive: 0.4, trem: 0.4, ticks: 0.35, lowSus: 0.35, drums: 0.4 },
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
    id: 'brokenpluck',
    name: 'Broken hook: plucked',
    about: 'The broken hook as the thread from Calm to Alert (88 BPM). The opening of Hook A (D . D3 D) plucked on cellos and basses. Calm: the broken hook softly every 4 bars over a quiet low bed (no rub, no heartbeat). Cautious: it comes every 2 bars, the walk-up appears, the heartbeat and a faint rub join. Alert: the full hook in Under fire.',
    use: 'stealth',
    bpm: 88,
    bars: 32,
    target: -22,
    layers: [
      S('bed', 'Quiet low bed (held D, deep sub)'),
      S('frag', 'Broken hook, every 4 bars'),
      S('frag2', 'Broken hook, in between (every 2 bars together)'),
      S('walk', 'Walk-up into the next bar (every 8 bars)'),
      { id: 'heart', name: 'Heartbeat drum', kind: 'perc' },
      S('rub', 'Faint high rub'),
    ],
    presets: {
      Calm: { bed: 0.4, frag: 0.55 },
      Cautious: { bed: 0.5, frag: 0.65, frag2: 0.6, walk: 0.55, heart: 0.45, rub: 0.22 },
      'Calm, near silence': { bed: 0.3, frag: 0.4 },
      'Everything on': { bed: 1, frag: 1, frag2: 1, walk: 1, heart: 1, rub: 1 },
    },
  },
  {
    id: 'brokenbow',
    name: 'Broken hook: bowed',
    about: 'The broken hook as the thread from Calm to Alert (88 BPM). The opening of Hook A played with short, soft bows on cellos and basses: darker and smoother. Calm: the broken hook softly every 4 bars over a quiet low bed (no rub, no heartbeat). Cautious: it comes every 2 bars, the walk-up appears, the heartbeat and a faint rub join. Alert: the full hook in Under fire.',
    use: 'stealth',
    bpm: 88,
    bars: 32,
    target: -22,
    layers: [
      S('bed', 'Quiet low bed (held D, deep sub)'),
      S('frag', 'Broken hook, every 4 bars'),
      S('frag2', 'Broken hook, in between (every 2 bars together)'),
      S('walk', 'Walk-up into the next bar (every 8 bars)'),
      { id: 'heart', name: 'Heartbeat drum', kind: 'perc' },
      S('rub', 'Faint high rub'),
    ],
    presets: {
      Calm: { bed: 0.4, frag: 0.55 },
      Cautious: { bed: 0.5, frag: 0.65, frag2: 0.6, walk: 0.55, heart: 0.45, rub: 0.22 },
      'Calm, near silence': { bed: 0.3, frag: 0.4 },
      'Everything on': { bed: 1, frag: 1, frag2: 1, walk: 1, heart: 1, rub: 1 },
    },
  },
  {
    id: 'brokentimp',
    name: 'Broken hook: timpani',
    about: 'The broken hook as the thread from Calm to Alert (88 BPM). The opening of Hook A on tuned timpani with a plucked high D: cinematic and percussive. Calm: the broken hook softly every 4 bars over a quiet low bed (no rub, no heartbeat). Cautious: it comes every 2 bars, the walk-up appears, the heartbeat and a faint rub join. Alert: the full hook in Under fire.',
    use: 'stealth',
    bpm: 88,
    bars: 32,
    target: -22,
    layers: [
      S('bed', 'Quiet low bed (held D, deep sub)'),
      S('frag', 'Broken hook, every 4 bars'),
      S('frag2', 'Broken hook, in between (every 2 bars together)'),
      S('walk', 'Walk-up into the next bar (every 8 bars)'),
      { id: 'heart', name: 'Heartbeat drum', kind: 'perc' },
      S('rub', 'Faint high rub'),
    ],
    presets: {
      Calm: { bed: 0.4, frag: 0.55 },
      Cautious: { bed: 0.5, frag: 0.65, frag2: 0.6, walk: 0.55, heart: 0.45, rub: 0.22 },
      'Calm, near silence': { bed: 0.3, frag: 0.4 },
      'Everything on': { bed: 1, frag: 1, frag2: 1, walk: 1, heart: 1, rub: 1 },
    },
  },
  {
    id: 'heartbeat',
    name: 'Sneaking: Heartbeat',
    about: 'Round 16: Calm is near silence (a deep sub and the far-away D / E-flat rub, no heartbeat). Cautious is the heartbeat with the broken Hook A (the opening three notes plucked every 4 bars). "Cautious, more tension" adds soft ticking, a gentle pulse on D, climbing violas and a low D.',
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
      Calm: { sub: 0.4, rub: 0.22 },
      Cautious: { sub: 0.5, heart: 0.45, rub: 0.3, frag: 0.35 },
      'Calm, near silence': { sub: 0.35, rub: 0.12 },
      'Cautious, more tension': { sub: 0.6, heart: 0.65, rub: 0.5, frag: 0.55, tick: 0.5, drive: 0.5, climb: 0.55, low: 0.45 },
      'Everything on': { sub: 1, heart: 1, rub: 1, frag: 1, tick: 1, drive: 1, climb: 1, low: 1 },
    },
  },
  {
    id: 'shadows',
    name: 'Sneaking: Shadows (cinematic)',
    about: 'Slow and vast, like the quiet before a big film scene (72 BPM). Calm: low strings breathing on a held D, soft chords shifting underneath (D minor, B-flat, G minor, A), a high string shimmer, a horn calling far away, a deep sub. Cautious adds a soft pulse rubbing D against E-flat, a timpani heartbeat, the broken Hook A and strings slowly rising.',
    use: 'stealth',
    bpm: 72,
    bars: 24,
    target: -22,
    layers: [
      S('pedal', 'Low strings breathing on D'),
      S('harmony', 'Soft shifting chords (cellos, violas)'),
      S('shimmer', 'High string shimmer'),
      { id: 'farHorn', name: 'Horn calling far away', kind: 'brass' },
      S('sub', 'Deep sub'),
      S('pulse', 'Soft pulse, D against E-flat (violas)'),
      { id: 'heart', name: 'Timpani heartbeat', kind: 'perc' },
      S('frag', 'Hook A fragment, plucked'),
      S('rise', 'Strings slowly rising'),
    ],
    presets: {
      Calm: { pedal: 0.4, harmony: 0.25, sub: 0.3 },
      Cautious: { pedal: 0.55, harmony: 0.45, shimmer: 0.3, farHorn: 0.35, sub: 0.45, pulse: 0.5, heart: 0.5, frag: 0.45, rise: 0.45 },
      'Calm, near silence': { pedal: 0.4, shimmer: 0.15, sub: 0.35 },
      'Everything on': { pedal: 1, harmony: 1, shimmer: 1, farHorn: 1, sub: 1, pulse: 1, heart: 1, frag: 1, rise: 1 },
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
    id: 'menupiano',
    name: 'Menu alternative: piano and strings',
    about: 'Less epic, still the same catchy theme: Hook A on piano, a plucked low D, soft string chords, the melody on violins. No cellos in front.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -23,
    layers: [
      S('hook', 'Hook A'),
      S('bass', 'Plucked low D'),
      S('pad', 'Soft chords'),
      S('melody', 'Melody (first time)'),
      S('melody2', 'Melody (violins)'),
    ],
    presets: { Full: { hook: 1, bass: 1, pad: 1, melody: 1, melody2: 1 } },
  },
  {
    id: 'menuharp',
    name: 'Menu alternative: harp, clarinet and strings',
    about: 'Less epic: Hook A on harp, the melody first on clarinet and then on violins, soft string chords. No cellos in front.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -23,
    layers: [
      S('hook', 'Hook A'),
      S('bass', 'Plucked low D'),
      S('pad', 'Soft chords'),
      S('melody', 'Melody (first time)'),
      S('melody2', 'Melody (violins)'),
    ],
    presets: { Full: { hook: 1, bass: 1, pad: 1, melody: 1, melody2: 1 } },
  },
  {
    id: 'menuviola',
    name: 'Menu alternative: violas and horn',
    about: 'Closest to Grand without the cello sound: Hook A on violas (short bows) over plucked basses, the melody on a warm horn and then violins, held chords on violas and violins.',
    use: 'menu',
    bpm: 90,
    bars: 32,
    target: -23,
    layers: [
      S('hook', 'Hook A'),
      S('bass', 'Plucked low D'),
      S('pad', 'Soft chords'),
      S('melody', 'Melody (first time)'),
      S('melody2', 'Melody (violins)'),
    ],
    presets: { Full: { hook: 1, bass: 1, pad: 1, melody: 1, melody2: 1 } },
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
/** Extra canvas for a linear render: longer than any note tail plus the reverb's pre-roll, so it ends in silence. */
export const LINEAR_TAIL = 14;
/** The clean opening's length in bars (covers every wrapped tail at the loop start). */
export const HEAD_BARS = 4;

class Score {
  readonly layers: Record<string, Stereo> = {};
  readonly beat: number;

  constructor(
    readonly bank: Bank,
    readonly meta: PieceMeta,
    linear = false,
  ) {
    this.beat = 60 / meta.bpm;
    // linear: a long canvas so nothing wraps (the clean opening, heard the first time a loop starts)
    const n = secs(meta.bars * 4 * this.beat + (meta.use === 'shot' ? SHOT_TAIL : linear ? LINEAR_TAIL : 0));
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

/** Soft held chords on violas and violins only (no basses, no low D), long swells. */
function softChords(s: Score, layer: string, from: number, to: number, barsPer: number, vel: number, attack: number): void {
  for (let b = from; b < to; b += barsPer) {
    const c = CH[PROG[Math.floor((b - from) / barsPer) % 4]!];
    const dur = s.d(4 * barsPer);
    note(s.L(layer), s.bank, 'violaSus', c.tones[2]!, s.t(b), dur, { vel, attack, release: 1 });
    note(s.L(layer), s.bank, 'violinSus', c.tones[3]!, s.t(b), dur, { vel: vel * 0.9, attack, release: 1 });
    note(s.L(layer), s.bank, 'violinSus', c.tones[4]!, s.t(b), dur, { vel: vel * 0.85, attack, release: 1 });
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
  // round 18: punch for the hook - a short tuba on the hook's notes, short horns an octave up, a sub hit under each note
  hookLine(s, 'hookTuba', 'tubaSus', 0, 0, N, () => 0.9);
  hookLine(s, 'hookHorns', 'hornStac', 12, 0, N, () => 0.8);
  for (let b = 0; b < N; b++) {
    for (let i = 0; i < 8; i++) {
      const name = HOOK_A[(b % 2) * 8 + i];
      if (!name) continue;
      subBass(s.L('hookSub'), s.t(b, i / 2), 0.16, n(name) - 12, i === 0 ? 0.25 : 0.18, 0.004);
    }
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

/**
 * Render a piece. A loop is circular: its start holds the ringing-out tail of its own last bar, so it joins seamlessly.
 * With `linear`, nothing wraps: the start is clean, as when the piece begins from silence (the player's first pass).
 */

// ------------------------------------------------------------------ round 17: cinematic sneaking sets

/** Hook A's opening (D . D3 D) plucked, with the bass on the first note, every `every` bars from `from`. */
function hookFragment(s: Score, layer: string, from: number, to: number, every: number, vel: number): void {
  for (let b = from; b < to; b += every) {
    for (const [i, m, v] of [[0, D, 1], [2, D + 12, 0.8], [3, D, 0.85]] as const) note(s.L(layer), s.bank, 'celloPizz', m, s.t(b, i / 2), s.d(1), { vel: vel * v, release: 0.3 });
    note(s.L(layer), s.bank, 'bassPizz', D - 12, s.t(b), s.d(1), { vel: vel * 0.85, release: 0.3 });
  }
}

function shadowsLoop(s: Score): void {
  const N = s.meta.bars;
  // low strings breathing on D: long swells in and out every 8 bars
  for (let b = 0; b < N; b += 8) {
    const dur = s.d(32);
    for (const [inst, m, v] of [['bassSus', D, 1], ['celloSus', D, 1], ['celloSus', D + 7, 0.6]] as const) {
      note(s.L('pedal'), s.bank, inst, m, s.t(b), dur, { vel: 0.5 * v, attack: dur * 0.55, release: dur * 0.4 });
    }
  }
  // soft chords shifting over the D every 4 bars
  const ch: ChordName[] = ['Dm', 'Bb', 'Gm', 'A', 'Bb', 'Dm'];
  for (let k = 0; k < N / 4; k++) {
    const c = CH[ch[k % ch.length]!];
    const dur = s.d(16);
    note(s.L('harmony'), s.bank, 'celloSus', c.tones[1]!, s.t(k * 4), dur, { vel: 0.4, attack: dur * 0.5, release: dur * 0.4 });
    note(s.L('harmony'), s.bank, 'violaSus', c.tones[2]!, s.t(k * 4), dur, { vel: 0.35, attack: dur * 0.5, release: dur * 0.4 });
  }
  // a high shimmer: violins in tremolo on A5 and D6, swelling far above
  for (let b = 2; b < N; b += 8) {
    const dur = s.d(24);
    for (const [m, v] of [[n('A5'), 1], [n('D6'), 0.8]] as const) note(s.L('shimmer'), s.bank, 'violinTrem', m, s.t(b), dur, { vel: 0.3 * v, attack: dur * 0.5, release: dur * 0.45 });
  }
  // a horn calling far away: D then A, slow swells, every 12 bars
  for (const b of [4, 16]) {
    note(s.L('farHorn'), s.bank, 'hornSus', n('D3'), s.t(b), s.d(8), { vel: 0.35, attack: s.d(4), release: s.d(3) });
    note(s.L('farHorn'), s.bank, 'hornSus', n('A3'), s.t(b + 2), s.d(10), { vel: 0.32, attack: s.d(4), release: s.d(4) });
  }
  for (let b = 0; b < N; b += 8) subBass(s.L('sub'), s.t(b), s.d(32), D - 12, 0.2, s.d(8));
  // Cautious: a soft pulse rubbing D against E-flat (violas, eighths), a timpani heartbeat, the broken hook, strings rising
  for (let b = 0; b < N; b++) {
    if (b % 8 === 7) continue;
    const m = b % 2 === 0 ? n('D4') : n('Eb4');
    for (let i = 0; i < 8; i++) note(s.L('pulse'), s.bank, 'violaSpic', m, s.t(b, i / 2), s.d(0.45), { vel: i % 4 === 0 ? 0.65 : 0.5, release: 0.1 });
    timp(s.L('heart'), s.bank, n('D3'), s.t(b), 0.6);
    timp(s.L('heart'), s.bank, n('D3'), s.t(b, 0.5), 0.42);
  }
  hookFragment(s, 'frag', 1, N, 4, 0.55);
  for (let b = 0; b < N; b += 2) {
    const m = n('A3') + Math.floor((b % 8) / 2);
    note(s.L('rise'), s.bank, 'violaTrem', m, s.t(b), s.d(8), { vel: 0.5, attack: s.d(6), release: 0.6 });
    note(s.L('rise'), s.bank, 'celloTrem', m - 12, s.t(b), s.d(8), { vel: 0.45, attack: s.d(6), release: 0.6 });
  }
}



// ------------------------------------------------------------------ round 18: the broken hook sets, lighter menus

type BrokenKind = 'pluck' | 'bow' | 'timp';

/** Hook A's opening (D . D3 D) on one of three sounds, at bar `b`. */
function broken(s: Score, layer: string, b: number, kind: BrokenKind, vel: number): void {
  const notes: [number, number, number][] = [
    [0, D, 1],
    [2, D + 12, 0.8],
    [3, D, 0.85],
  ];
  for (const [i, m, v] of notes) {
    const t = s.t(b, i / 2);
    if (kind === 'pluck') note(s.L(layer), s.bank, 'celloPizz', m, t, s.d(1), { vel: vel * v, release: 0.3 });
    else if (kind === 'bow') note(s.L(layer), s.bank, 'celloSpic', m, t, s.d(0.7), { vel: vel * v * 1.15, release: 0.15 });
    else if (m === D) timp(s.L(layer), s.bank, m, t, vel * v);
    else note(s.L(layer), s.bank, 'celloPizz', m, t, s.d(1), { vel: vel * v, release: 0.3 });
  }
  if (kind === 'bow') note(s.L(layer), s.bank, 'bassSpic', D - 12, s.t(b), s.d(0.7), { vel: vel * 0.7, release: 0.15 });
  else note(s.L(layer), s.bank, 'bassPizz', D - 12, s.t(b), s.d(1), { vel: vel * 0.8, release: 0.3 });
}

/** The walk-up (F G A-flat A) in the last two beats of a bar, leading into D. */
function walkUp(s: Score, layer: string, b: number, kind: BrokenKind, vel: number): void {
  ['F2', 'G2', 'Ab2', 'A2'].forEach((m, k) => {
    const t = s.t(b, 2 + k / 2);
    const v = vel * (0.8 + 0.07 * k);
    if (kind === 'bow') note(s.L(layer), s.bank, 'celloSpic', n(m), t, s.d(0.45), { vel: v * 0.85, release: 0.12 });
    else note(s.L(layer), s.bank, 'celloPizz', n(m), t, s.d(0.6), { vel: v, release: 0.25 });
  });
}

function brokenSet(s: Score, kind: BrokenKind): void {
  const N = s.meta.bars;
  // a quiet low bed: a held D on basses and cellos breathing every 8 bars, and the deep sub
  for (let b = 0; b < N; b += 8) {
    const dur = s.d(32);
    note(s.L('bed'), s.bank, 'bassSus', D, s.t(b), dur, { vel: 0.35, attack: dur * 0.5, release: dur * 0.4 });
    note(s.L('bed'), s.bank, 'celloSus', D, s.t(b), dur, { vel: 0.3, attack: dur * 0.5, release: dur * 0.4 });
    subBass(s.L('bed'), s.t(b), dur, D - 12, 0.15, dur * 0.4);
  }
  for (let b = 1; b < N; b += 4) broken(s, 'frag', b, kind, 0.6);
  for (let b = 3; b < N; b += 4) if (b % 8 !== 7) broken(s, 'frag2', b, kind, 0.55);
  for (let b = 7; b < N; b += 8) walkUp(s, 'walk', b, kind, 0.55);
  heartbeat(s, 'heart', 0, N, 0.45);
  rub(s, 'rub', 0, N, 8, 0.3);
}

/** A lighter menu on Grand's shape: the hook from the start, chords from bar 8, the melody at 8 (first voice), then violins at 16 and 24. */
function menuLight(s: Score, hook: { inst: string; tr: number }, first: { inst: string; tr: number; vel?: number }): void {
  const N = s.meta.bars;
  const dyn = (b: number): number => (b < 8 ? 0.45 + b * 0.025 : b < 16 ? 0.62 : b < 24 ? 0.7 : 0.78);
  hookLine(s, 'hook', hook.inst, hook.tr, 0, N - 2, dyn, false, 0.85);
  for (let b = 0; b < N - 2; b++) {
    note(s.L('bass'), s.bank, 'bassPizz', D - 12, s.t(b), s.d(1.5), { vel: 0.5, release: 0.4 });
    if (b % 2 === 1) note(s.L('bass'), s.bank, 'bassPizz', D - 12, s.t(b, 1.5), s.d(1), { vel: 0.35, release: 0.3 });
  }
  softChords(s, 'pad', 8, N - 2, 2, 0.45, s.d(2));
  motif(s, 'melody', first.inst, 8, first.vel ?? 0.6, first.tr);
  motif(s, 'melody2', 'violinSus', 16, 0.6);
  motif(s, 'melody2', 'violinSus', 24, 0.7, 12);
  motif(s, 'melody', first.inst, 24, (first.vel ?? 0.6) * 0.9, first.tr);
  // a soft final chord ringing into the start
  for (const [inst, m] of [['violaSus', n('F3')], ['violinSus', n('A3')], ['violinSus', n('D4')], ['violinSus', n('F4')]] as const) {
    note(s.L('pad'), s.bank, inst, m, s.t(N - 2), s.d(8), { vel: 0.5, attack: 0.3, release: 2.5 });
  }
  note(s.L('bass'), s.bank, 'bassPizz', D - 12, s.t(N - 2), s.d(2), { vel: 0.55, release: 1 });
}

export function renderPiece(bank: Bank, meta: PieceMeta, linear = false): Piece {
  const s = new Score(bank, meta, linear);
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
    case 'brokenpluck':
      brokenSet(s, 'pluck');
      break;
    case 'brokenbow':
      brokenSet(s, 'bow');
      break;
    case 'brokentimp':
      brokenSet(s, 'timp');
      break;
    case 'menupiano':
      menuLight(s, { inst: 'piano', tr: 12 }, { inst: 'violinSus', tr: 0 });
      break;
    case 'menuharp':
      menuLight(s, { inst: 'harp', tr: 12 }, { inst: 'clarinet', tr: 0, vel: 0.42 });
      break;
    case 'menuviola':
      menuLight(s, { inst: 'violaSpic', tr: 12 }, { inst: 'hornSus', tr: 0, vel: 0.45 });
      break;
    case 'shadows':
      shadowsLoop(s);
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
  if (linear) {
    // anything placed before time 0 (a swell leading into the first downbeat) wrapped to the far end of the long
    // canvas; clear that end so it cannot reverb back into the clean opening (real tails end well before it)
    const from = secs(meta.bars * 4 * s.beat + LINEAR_TAIL / 2);
    for (const c of Object.values(s.layers)) {
      c.l.fill(0, from);
      c.r.fill(0, from);
    }
  }
  return { meta, layers: s.layers };
}
