/**
 * Round 13 (2026-10-16): he really likes "Alert, faster (strings)": more versions of it (with brass and drums, with drums),
 * slower copies for the menu (96 and 84 BPM), and "Alert, under fire" (132 BPM) with urgency, like being shot at.
 * Round 12 (2026-10-16): he likes Past/Present/Future in general but it is too quick and upbeat for stealth: a slow (80 and
 * 70 BPM), dark, minor, epic version: a heavy plucked pulse, the figure low in the violas, a darker melody, a big peak.
 * Round 11 (2026-10-16): pieces in the style of Brandon Roberts' "Past/Present/Future" (Andor season 2): a soft pulse,
 * a minimalist repeating figure that grows, D Dorian with a hopeful G major, long-note melody, a long build. Style only.
 * Round 10 (2026-10-16): he likes the Zimmer menu's orchestra but it strays from Hook A; wants it darker, more
 * suitable for stealth, still epic: Hook A back on D, a darker progression with the Phrygian E-flat, everything low.
 * Round 9 (2026-10-16): "add more influence from Hans Zimmer again": Zimmer pieces (swells, mid-register sixteenth
 * patterns, the broad i-VI-III-VII progression, a rising semitone, warm horns and soft drums as their own layers).
 * Round 8 (2026-10-16): "too much happening sometimes; the D is really loud and aggressive; not sure about the slower
 * ones": softer D everywhere, and lighter variations at 92-120 BPM (fewer layers, the hook following the chords).
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
    id: 'underfire',
    name: 'Alert, under fire',
    about: 'Built on Alert faster, at 132 BPM, to get your heart pumping: a pounding drum pattern, stabbing off-beat hits from strings and short horns, violins climbing a semitone at a time, a grating tremolo rub high up, a fast ticking line, and the driving sixteenths rising a semitone every fourth bar, under the same hook and melody.',
    use: 'mission',
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
      { id: 'hornStabs', name: 'Off-beat stabs, short horns', kind: 'brass' },
      { id: 'brass', name: 'Low brass swells', kind: 'brass' },
      { id: 'drums', name: 'Pounding drums, timpani, swells', kind: 'perc' },
    ],
    presets: {
      'Under fire': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.45, melody: 0.85, hornStabs: 0.6, brass: 0.5, drums: 0.8 },
      Alert: { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.55, trem: 0.5, stabs: 0.6, lowSus: 0.45, melody: 0.9, drums: 0.6 },
      Evasion: { hookBass: 0.7, hookCello: 0.85, drive: 0.5, trem: 0.4, ticks: 0.4, lowSus: 0.4, drums: 0.4 },
      'Strings only': { hookBass: 0.8, hookCello: 1, hookHigh: 0.85, drive: 0.6, rise: 0.7, trem: 0.6, stabs: 0.75, ticks: 0.5, lowSus: 0.45, melody: 0.85 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, rise: 1, trem: 1, stabs: 1, ticks: 1, lowSus: 1, melody: 1, hornStabs: 1, brass: 1, drums: 1 },
    },
  },
  {
    id: 'afheavy',
    name: 'Alert faster, with brass and drums',
    about: 'Alert faster as you like it, plus low brass swells on each chord and big drums (low drum on the 3 + 3 + 2 accents, timpani on the chord changes, cymbal swells into each section).',
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
      { id: 'brass', name: 'Low brass swells', kind: 'brass' },
      { id: 'drums', name: 'Big drums, timpani, swells', kind: 'perc' },
    ],
    presets: {
      Alert: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1, brass: 0.55, drums: 0.65 },
      Evasion: { hookBass: 0.7, hookCello: 0.9, drive: 0.45, lowSus: 0.45, trem: 0.55, drums: 0.4 },
      'Strings only': { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1, brass: 1, drums: 1 },
    },
  },
  {
    id: 'afdrums',
    name: 'Alert faster, with drums only',
    about: 'Alert faster with just the drums added (no brass): the strings you like, with a pulse underneath.',
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
      { id: 'drums', name: 'Big drums, timpani, swells', kind: 'perc' },
    ],
    presets: {
      Alert: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1, drums: 0.65 },
      Evasion: { hookBass: 0.7, hookCello: 0.9, drive: 0.45, lowSus: 0.45, trem: 0.55, drums: 0.4 },
      'Strings only': { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1 },
    },
  },
  {
    id: 'ppfslowmission',
    name: 'Mission score, Past/Present/Future slow and dark',
    about: 'The slow, dark Past/Present/Future material as the in-game loop at 80 BPM, with the state buttons: Calm is the plucked pulse and the low figure; Alert brings the hook, the melody, the brass and the drums.',
    use: 'mission',
    bpm: 80,
    bars: 32,
    layers: [
      S('pulse', 'Low plucked pulse (two beats a bar)'),
      S('fig', 'Repeating figure, violas (low)'),
      S('figHigh', 'Repeating figure, violins an octave up'),
      S('pizz', 'Hook A, pizzicato (on D)'),
      S('hook', 'Hook A, cellos (on D)'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo'),
      S('melody', 'Melody: cellos and violas, then violins'),
      { id: 'brass', name: 'Low horns and trombones', kind: 'brass' },
      { id: 'drums', name: 'Timpani, low drums, cymbal swells', kind: 'perc' },
    ],
    presets: {
      Calm: { pulse: 0.4, fig: 0.3, trem: 0.15 },
      Cautious: { pulse: 0.55, fig: 0.5, pizz: 0.45, swell: 0.4, trem: 0.35 },
      Alert: { pulse: 0.7, fig: 0.75, figHigh: 0.6, hook: 0.85, swell: 0.8, trem: 0.5, melody: 0.9, brass: 0.55, drums: 0.6 },
      Evasion: { pulse: 0.6, fig: 0.65, hook: 0.7, swell: 0.6, trem: 0.45, drums: 0.35 },
      'Strings only': { pulse: 0.7, fig: 0.75, figHigh: 0.6, hook: 0.85, swell: 0.8, trem: 0.5, melody: 0.9 },
      'Everything on': { pulse: 1, fig: 1, figHigh: 1, pizz: 1, hook: 1, swell: 1, trem: 1, melody: 1, brass: 1, drums: 1 },
    },
  },
  {
    id: 'ppfmission',
    name: 'Mission score, Past/Present/Future style',
    about: 'In the style of Brandon Roberts\' Andor score (115 BPM): a soft low pulse in 3 + 3 + 2, a repeating string figure that grows a note at a time, Hook A on D underneath, low swells, a long-note melody that lifts over a hopeful G major chord, horns and drums for Alert.',
    use: 'mission',
    bpm: 115,
    bars: 32,
    layers: [
      S('pulse', 'Low pulse in eighths (soft)'),
      S('arp', 'Repeating figure, violas'),
      S('arpHigh', 'Repeating figure, violins an octave up'),
      S('pizz', 'Hook A, pizzicato (on D)'),
      S('hook', 'Hook A, cellos (on D)'),
      S('swell', 'Low string swells'),
      S('melody', 'Long-note melody on violins'),
      { id: 'brass', name: 'Horn swells, low trombones', kind: 'brass' },
      { id: 'drums', name: 'Timpani and low drums', kind: 'perc' },
    ],
    presets: {
      Calm: { pulse: 0.3, arp: 0.25, pizz: 0.35 },
      Cautious: { pulse: 0.5, arp: 0.5, hook: 0.6, swell: 0.45 },
      Alert: { pulse: 0.75, arp: 0.8, arpHigh: 0.7, hook: 0.85, swell: 0.8, melody: 0.9, brass: 0.55, drums: 0.6 },
      Evasion: { pulse: 0.65, arp: 0.7, hook: 0.75, swell: 0.6, drums: 0.4 },
      'Strings only': { pulse: 0.75, arp: 0.8, arpHigh: 0.7, hook: 0.85, swell: 0.8, melody: 0.9 },
      'Everything on': { pulse: 1, arp: 1, arpHigh: 1, pizz: 1, hook: 1, swell: 1, melody: 1, brass: 1, drums: 1 },
    },
  },
  {
    id: 'zdarkmission',
    name: 'Mission score, Zimmer dark',
    about: 'The dark Zimmer menu material as the in-game loop at 96 BPM: Hook A on D, the darker progression, low swells and tremolo, the melody low. The state buttons fade between layer mixes.',
    use: 'mission',
    bpm: 96,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato (on D)'),
      S('hook', 'Hook A, cellos (on D)'),
      S('bass', 'Basses on the strong notes'),
      S('ost', 'Low sixteenth pattern, violas'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo, distant violins'),
      S('melody', 'Melody on cellos and violas'),
      { id: 'horns', name: 'Low horns and trombones', kind: 'brass' },
      { id: 'pulse', name: 'Soft low drums', kind: 'perc' },
    ],
    presets: {
      Calm: { pizz: 0.45, swell: 0.3, trem: 0.12 },
      Cautious: { hook: 0.65, bass: 0.4, swell: 0.5, trem: 0.35, ost: 0.25, pulse: 0.25 },
      Alert: { hook: 0.9, bass: 0.7, ost: 0.8, swell: 0.85, trem: 0.55, melody: 0.9, horns: 0.6, pulse: 0.6 },
      Evasion: { hook: 0.8, bass: 0.6, ost: 0.65, swell: 0.65, trem: 0.45, pulse: 0.4 },
      'Strings only': { hook: 0.9, bass: 0.7, ost: 0.8, swell: 0.85, trem: 0.55, melody: 0.9 },
      'Everything on': { pizz: 1, hook: 1, bass: 1, ost: 1, swell: 1, trem: 1, melody: 1, horns: 1, pulse: 1 },
    },
  },
  {
    id: 'zbuild',
    name: 'Mission score, Zimmer',
    about: 'More Hans Zimmer: long low-string swells that breathe in from nothing, a soft sixteenth-note pattern in the violas (not on the low D), the hook following a broad D minor, B-flat, F, C progression, warm horn swells and a soft drum heartbeat. Mute horns or drums if you want strings only.',
    use: 'mission',
    bpm: 92,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato'),
      S('hook', 'Hook A, cellos (following the chords)'),
      S('ost', 'Sixteenth pattern, violas'),
      S('swell', 'Low string swells'),
      S('high', 'High violins, held'),
      S('melody', 'Melody, cellos and violins in octaves'),
      { id: 'horns', name: 'Warm horn swells', kind: 'brass' },
      { id: 'pulse', name: 'Soft drum heartbeat and swells', kind: 'perc' },
    ],
    presets: {
      Calm: { pizz: 0.45, swell: 0.35, high: 0.12 },
      Cautious: { hook: 0.65, ost: 0.3, swell: 0.55, high: 0.25, pulse: 0.25 },
      Alert: { hook: 0.9, ost: 0.85, swell: 0.9, high: 0.7, melody: 0.9, horns: 0.6, pulse: 0.6 },
      Evasion: { hook: 0.8, ost: 0.7, swell: 0.7, high: 0.4, pulse: 0.45 },
      'Strings only': { hook: 0.9, ost: 0.85, swell: 0.9, high: 0.7, melody: 0.9 },
      'Everything on': { pizz: 1, hook: 1, ost: 1, swell: 1, high: 1, melody: 1, horns: 1, pulse: 1 },
    },
  },
  {
    id: 'zdrive',
    name: 'Alert, Zimmer drive',
    about: 'A Dark Knight-style Alert at 120 BPM: a relentless sixteenth-note pattern on cellos and violas in the middle register that rises a semitone every fourth bar, the hook on top, big string swells, horns and low drums on the accents.',
    use: 'mission',
    bpm: 120,
    bars: 32,
    layers: [
      S('ost', 'Sixteenth pattern, cellos and violas'),
      S('hook', 'Hook A, violas and cellos'),
      S('swell', 'Big string swells'),
      S('high', 'High violins, tremolo'),
      S('melody', 'Melody, violins and cellos in octaves'),
      { id: 'horns', name: 'Horns and trombones, swells', kind: 'brass' },
      { id: 'drums', name: 'Low drums and timpani', kind: 'perc' },
    ],
    presets: {
      Alert: { ost: 0.9, hook: 0.85, swell: 0.85, high: 0.6, melody: 0.9, horns: 0.6, drums: 0.6 },
      Evasion: { ost: 0.75, hook: 0.6, swell: 0.6, high: 0.4, drums: 0.4 },
      'Strings only': { ost: 0.9, hook: 0.85, swell: 0.85, high: 0.6, melody: 0.9 },
      'Everything on': { ost: 1, hook: 1, swell: 1, high: 1, melody: 1, horns: 1, drums: 1 },
    },
  },
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
      Alert: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.45, lowSus: 0.55, chords: 0.9, trem: 0.7, melody: 1 },
      Evasion: { hookBass: 0.7, hookCello: 0.9, drive: 0.4, lowSus: 0.5, trem: 0.55 },
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
      Alert: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1 },
      Evasion: { hookBass: 0.7, hookCello: 0.9, drive: 0.45, lowSus: 0.45, trem: 0.55 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'lighter',
    name: 'Mission score, lighter',
    about: 'Less going on: the hook on cellos only (no basses doubling it), the chord roots held quietly instead of a constant low D, soft high chords, an answer on violas, the melody on violins alone.',
    use: 'mission',
    bpm: 92,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato'),
      S('hook', 'Hook A, cellos'),
      S('answer', 'Violas doubling the walk-up'),
      S('roots', 'Low chord roots (quiet)'),
      S('soft', 'Soft high chords'),
      S('trem', 'High tremolo'),
      S('melody', 'Melody on violins'),
    ],
    presets: {
      Calm: { pizz: 0.5, roots: 0.3 },
      Cautious: { hook: 0.65, roots: 0.45, soft: 0.3, trem: 0.2 },
      Alert: { hook: 1, answer: 0.8, roots: 0.7, soft: 0.8, trem: 0.5, melody: 0.9 },
      Evasion: { hook: 0.85, answer: 0.6, roots: 0.6, trem: 0.4 },
      'Everything on': { pizz: 1, hook: 1, answer: 1, roots: 1, soft: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'moving',
    name: 'Mission score, moving',
    about: 'The hook follows the chords (D, B-flat, G, A) instead of sitting on D, so the music travels. Cellos with a light bass, soft chords, the melody on cellos and violas.',
    use: 'mission',
    bpm: 96,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato (following the chords)'),
      S('hook', 'Hook A, cellos (following the chords)'),
      S('bass', 'Basses, light, on the strong notes'),
      S('soft', 'Soft high chords'),
      S('trem', 'High tremolo'),
      S('melody', 'Melody on cellos and violas'),
    ],
    presets: {
      Calm: { pizz: 0.5, soft: 0.15 },
      Cautious: { hook: 0.65, bass: 0.35, soft: 0.35 },
      Alert: { hook: 1, bass: 0.7, soft: 0.8, trem: 0.6, melody: 1 },
      Evasion: { hook: 0.85, bass: 0.6, soft: 0.4, trem: 0.45 },
      'Everything on': { pizz: 1, hook: 1, bass: 1, soft: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'alertlight',
    name: 'Alert, lighter',
    about: 'A faster Alert (120 BPM) with less weight: the hook on cellos and violas, short chord stabs, the melody, no driving sixteenths and no low D.',
    use: 'mission',
    bpm: 120,
    bars: 32,
    layers: [S('hook', 'Hook A, cellos'), S('hookHigh', 'Hook A, violas an octave up'), S('stabs', 'Short chord stabs'), S('soft', 'Soft high chords'), S('melody', 'Melody on violins')],
    presets: {
      Alert: { hook: 1, hookHigh: 0.8, stabs: 0.7, soft: 0.6, melody: 1 },
      Evasion: { hook: 0.85, hookHigh: 0.5, stabs: 0.5 },
      'Everything on': { hook: 1, hookHigh: 1, stabs: 1, soft: 1, melody: 1 },
    },
  },
  {
    id: 'afmenu96',
    name: 'Menu theme, from Alert faster (96 BPM)',
    about: 'Alert faster, the piece you like, slowed to 96 BPM for the main menu: the same hook, drive, chords, tremolo and melody.',
    use: 'menu',
    bpm: 96,
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
      Full: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'afmenu84',
    name: 'Menu theme, from Alert faster (84 BPM)',
    about: 'Alert faster, the piece you like, slowed to 84 BPM for the main menu: the same hook, drive, chords, tremolo and melody.',
    use: 'menu',
    bpm: 84,
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
      Full: { hookBass: 0.8, hookCello: 1, hookHigh: 0.9, drive: 0.5, lowSus: 0.5, chords: 0.85, trem: 0.7, melody: 1 },
      'Everything on': { hookBass: 1, hookCello: 1, hookHigh: 1, drive: 1, lowSus: 1, chords: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'ppfslow80',
    name: 'Menu theme, Past/Present/Future slow and dark (80 BPM)',
    about: 'The Past/Present/Future idea made slow, dark and epic: a heavy plucked pulse, the repeating figure low in the violas growing every 8 bars, Hook A on D, a darker minor progression (D minor, B-flat, G minor, A), the melody rising from cellos to violins with low horns, a big peak, then back down.',
    use: 'menu',
    bpm: 80,
    bars: 32,
    layers: [
      S('pulse', 'Low plucked pulse (two beats a bar)'),
      S('fig', 'Repeating figure, violas (low)'),
      S('figHigh', 'Repeating figure, violins an octave up'),
      S('hook', 'Hook A, cellos (on D)'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo'),
      S('melody', 'Melody: cellos and violas, then violins'),
      { id: 'brass', name: 'Low horns and trombones', kind: 'brass' },
      { id: 'drums', name: 'Timpani, low drums, cymbal swells', kind: 'perc' },
    ],
    presets: {
      Full: { pulse: 1, fig: 1, figHigh: 1, hook: 1, swell: 1, trem: 1, melody: 1, brass: 0.8, drums: 0.7 },
      'Strings only': { pulse: 1, fig: 1, figHigh: 1, hook: 1, swell: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'ppfslow70',
    name: 'Menu theme, Past/Present/Future slow and dark (70 BPM)',
    about: 'The same piece slower still, for comparison.',
    use: 'menu',
    bpm: 70,
    bars: 32,
    layers: [
      S('pulse', 'Low plucked pulse (two beats a bar)'),
      S('fig', 'Repeating figure, violas (low)'),
      S('figHigh', 'Repeating figure, violins an octave up'),
      S('hook', 'Hook A, cellos (on D)'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo'),
      S('melody', 'Melody: cellos and violas, then violins'),
      { id: 'brass', name: 'Low horns and trombones', kind: 'brass' },
      { id: 'drums', name: 'Timpani, low drums, cymbal swells', kind: 'perc' },
    ],
    presets: {
      Full: { pulse: 1, fig: 1, figHigh: 1, hook: 1, swell: 1, trem: 1, melody: 1, brass: 0.8, drums: 0.7 },
      'Strings only': { pulse: 1, fig: 1, figHigh: 1, hook: 1, swell: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'ppfmenu',
    name: 'Menu theme, Past/Present/Future style',
    about: 'In the style of Brandon Roberts\' Andor score (115 BPM): it starts with only a soft pulse and a repeating string figure, Hook A arrives on D, the figure grows a note at a time, a long-note melody lifts over the hopeful G major chord, and horns and drums carry it to an epic peak before it drops back to the pulse.',
    use: 'menu',
    bpm: 115,
    bars: 40,
    layers: [
      S('pulse', 'Low pulse in eighths (soft)'),
      S('arp', 'Repeating figure, violas'),
      S('arpHigh', 'Repeating figure, violins an octave up'),
      S('hook', 'Hook A, cellos (on D)'),
      S('swell', 'Low string swells'),
      S('melody', 'Long-note melody on violins'),
      { id: 'brass', name: 'Horn swells, low trombones', kind: 'brass' },
      { id: 'drums', name: 'Timpani and low drums', kind: 'perc' },
    ],
    presets: {
      Full: { pulse: 1, arp: 1, arpHigh: 1, hook: 1, swell: 1, melody: 1, brass: 0.8, drums: 0.7 },
      'Strings only': { pulse: 1, arp: 1, arpHigh: 1, hook: 1, swell: 1, melody: 1 },
    },
  },
  {
    id: 'zdark',
    name: 'Menu theme, Zimmer dark',
    about: 'The Zimmer menu, darker and closer to Hook A: the hook stays on D as you like it, the harmony turns darker (D minor, B-flat, then an E-flat chord rubbing against the D), everything sits low (no bright violin climax), low cello tremolo, the melody on cellos, violas and low horns, soft low drums, and a huge but dark final chord.',
    use: 'menu',
    bpm: 96,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato (on D)'),
      S('hook', 'Hook A, cellos and basses (on D)'),
      S('ost', 'Low sixteenth pattern, violas'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo, distant violins'),
      S('melody', 'Melody on cellos and violas'),
      { id: 'horns', name: 'Low horns and trombones', kind: 'brass' },
      { id: 'pulse', name: 'Soft low drums', kind: 'perc' },
    ],
    presets: {
      Full: { pizz: 1, hook: 1, ost: 1, swell: 1, trem: 1, melody: 1, horns: 0.8, pulse: 0.7 },
      'Strings only': { pizz: 1, hook: 1, ost: 1, swell: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'zdarker',
    name: 'Menu theme, Zimmer darker and stealthier',
    about: 'The same, more held back: no violins at all, the hook plucked most of the way and bowed only for the big section, the melody on violas then low cellos and horns, a smaller ending.',
    use: 'menu',
    bpm: 96,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato (on D)'),
      S('hook', 'Hook A, cellos and basses (on D)'),
      S('ost', 'Low sixteenth pattern, violas'),
      S('swell', 'Low string swells'),
      S('trem', 'Low cello tremolo'),
      S('melody', 'Melody on violas, then cellos'),
      { id: 'horns', name: 'Low horns', kind: 'brass' },
      { id: 'pulse', name: 'Heartbeat drum', kind: 'perc' },
    ],
    presets: {
      Full: { pizz: 1, hook: 1, ost: 1, swell: 1, trem: 1, melody: 1, horns: 0.8, pulse: 0.7 },
      'Strings only': { pizz: 1, hook: 1, ost: 1, swell: 1, trem: 1, melody: 1 },
    },
  },
  {
    id: 'zmenu',
    name: 'Menu theme, Zimmer',
    about: 'A slow-burn menu at 96 BPM: one cello note swelling out of silence, the hook plucked, then bowed over the broad progression, the melody on cellos and horns, then violins in octaves over everything, ending on a huge chord that dies away.',
    use: 'menu',
    bpm: 96,
    bars: 32,
    layers: [
      S('pizz', 'Hook A, pizzicato'),
      S('hook', 'Hook A, cellos (following the chords)'),
      S('ost', 'Sixteenth pattern, violas'),
      S('swell', 'Low string swells'),
      S('high', 'High violins'),
      S('melody', 'Melody on cellos, then violins in octaves'),
      { id: 'horns', name: 'Warm horns (melody and swells)', kind: 'brass' },
      { id: 'pulse', name: 'Soft drums and cymbal swells', kind: 'perc' },
    ],
    presets: {
      Full: { pizz: 1, hook: 1, ost: 1, swell: 1, high: 1, melody: 1, horns: 0.8, pulse: 0.7 },
      'Strings only': { pizz: 1, hook: 1, ost: 1, swell: 1, high: 1, melody: 1 },
    },
  },
  {
    id: 'menuflow',
    name: 'Menu theme, at game speed',
    about: 'The menu at 96 BPM with little going on: the hook plucked, then bowed and following the chords, the melody on violins with violas a third below, soft chord swells. No big climax.',
    use: 'menu',
    bpm: 96,
    bars: 32,
    layers: [S('pizz', 'Hook A, pizzicato'), S('hook', 'Hook A, cellos (following the chords)'), S('soft', 'Soft chord swells'), S('melody', 'Melody on violins'), S('harmony', 'Violas a third below')],
    presets: { Full: { pizz: 1, hook: 1, soft: 1, melody: 1, harmony: 1 } },
  },
  {
    id: 'menugrand',
    name: 'Menu theme, grand (slower)',
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
    name: 'Menu theme, brooding (slower)',
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
  F: { root: n('F1'), tones: [n('C3'), n('F3'), n('A3'), n('C4'), n('F4'), n('A4')] },
  C: { root: n('C2'), tones: [n('C3'), n('E3'), n('G3'), n('C4'), n('E4'), n('G4')] },
  Eb: { root: n('Eb2'), tones: [n('Eb3'), n('G3'), n('Bb3'), n('Eb4'), n('G4'), n('Bb4')] },
  G: { root: n('G1'), tones: [n('D3'), n('G3'), n('B3'), n('D4'), n('G4'), n('B4')] },
};
type ChordName = keyof typeof CH;
const PROG: ChordName[] = ['Dm', 'Bb', 'Gm', 'A'];
/** The broad minor progression of epic film scores (i, VI, III, VII), two bars each in the Zimmer pieces. */
const EPIC: ChordName[] = ['Dm', 'Bb', 'F', 'C'];
/** Round 10's darker progression over the D pedal: i, VI, the Phrygian flat-II (E-flat against D), i. Hook A stays on D. */
const DARK: ChordName[] = ['Dm', 'Bb', 'Eb', 'Dm'];
/** Round 11 (in the style of Andor's "Past/Present/Future"): D Dorian, the major IV (G) giving the dark-but-hopeful lift. */
const DORIAN: ChordName[] = ['Dm', 'G', 'F', 'C'];

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
/**
 * Hook A from bar `from` to `to` on one instrument, `tr` semitones from written (a number, or per bar so the hook can
 * follow the chords), with a per-bar level. The first note leads only gently (round 8: "the D is really loud").
 */
function hookLine(s: Score, layer: string, inst: string, tr: number | ((b: number) => number), from: number, to: number, vel: (b: number) => number, onlyStrong = false, lead = 0.9): void {
  for (let b = from; b < to; b++) {
    const shift = typeof tr === 'number' ? tr : tr(b);
    for (let i = 0; i < 8; i++) {
      const name = HOOK_A[(b % 2) * 8 + i];
      if (!name) continue;
      if (onlyStrong && !(i === 0 || i === 3)) continue;
      const len = HOOK_A[(b % 2) * 8 + i + 1] === null && i < 7 ? 1 : 0.5;
      note(s.L(layer), s.bank, inst, n(name) + shift, s.t(b, i / 2), s.d(len) * 0.9, { vel: vel(b) * (i === 0 ? lead : 0.8), release: 0.12 });
    }
  }
}

/** Semitones that move the hook from D onto a chord's root, kept within -5..+6 so it stays in the cellos' range. */
function toRoot(c: ChordName): number {
  const d = (((CH[c].root - D) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
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

/** The chord roots, held low and quietly (instead of a constant D). */
function roots(s: Score, layer: string, from: number, to: number, barsPer: number, vel: number): void {
  for (let b = from; b < to; b += barsPer) {
    const r = CH[PROG[Math.floor((b - from) / barsPer) % 4]!].root + 12;
    const dur = s.d(4 * barsPer);
    note(s.L(layer), s.bank, 'celloSus', r, s.t(b), dur, { vel, attack: s.d(2), release: 1 });
    note(s.L(layer), s.bank, 'bassSus', r, s.t(b), dur, { vel: vel * 0.8, attack: s.d(2), release: 1 });
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
  drive(s, 'drive', 'celloSpic', D + 12, 0, N, 0.55);
  drive(s, 'drive', 'violaSpic', D + 24, 0, N, 0.5);
  lowD(s, 'lowSus', 0, N, 8, 0.45);
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
  drive(s, 'drive', 'celloSpic', D + 12, 0, N, 0.6);
  drive(s, 'drive', 'violaSpic', D + 24, 0, N, 0.55);
  lowD(s, 'lowSus', 0, N, 4, 0.55);
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


function lighter(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, () => 0.65, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', 0, 0, N, () => 0.8, false, 0.85);
  // violas double only the walk-up (the second bar's last four notes), an octave up
  for (let b = 1; b < N; b += 2) {
    for (let i = 4; i < 8; i++) note(s.L('answer'), s.bank, 'violaSpic', n(HOOK_A[8 + i]!) + 12, s.t(b, i / 2), s.d(0.45), { vel: 0.6 + 0.05 * (i - 4), release: 0.12 });
  }
  roots(s, 'roots', 0, N, 2, 0.45);
  softChords(s, 'soft', 0, N, 2, 0.5, s.d(3));
  trem(s, 'trem', 0, N, 8, 0.4);
  for (const at of [8, 24]) motif(s, 'melody', 'violinSus', at, 0.75, 12);
}

function moving(s: Score): void {
  const N = s.meta.bars;
  const tr = (b: number): number => toRoot(PROG[Math.floor(b / 2) % 4]!);
  hookLine(s, 'pizz', 'celloPizz', tr, 0, N, () => 0.65, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', tr, 0, N, () => 0.8, false, 0.85);
  hookLine(s, 'bass', 'bassSpic', (b) => tr(b) - 12, 0, N, () => 0.55, true, 0.85);
  softChords(s, 'soft', 0, N, 2, 0.5, s.d(2));
  trem(s, 'trem', 0, N, 8, 0.4);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'celloSus', at, 0.75);
    motif(s, 'melody', 'violaSus', at, 0.65);
  }
}

function alertLight(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'hook', 'celloSpic', 0, 0, N, () => 0.85, false, 0.85);
  hookLine(s, 'hookHigh', 'violaSpic', 12, 0, N, () => 0.75, false, 0.85);
  // a short chord on beat 1 and the "and" of 2 of every bar, on the progression
  for (let b = 0; b < N; b++) {
    const c = CH[PROG[Math.floor(b / 2) % 4]!];
    for (const beat of [0, 1.5]) for (const m of c.tones.slice(1, 4)) note(s.L('stabs'), s.bank, m < n('C4') ? 'violaSpic' : 'celloSpic', m, s.t(b, beat), s.d(0.3), { vel: beat === 0 ? 0.7 : 0.55, release: 0.1 });
  }
  softChords(s, 'soft', 0, N, 2, 0.55, 0.3);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.85, 12);
    motif(s, 'melody', 'violinSus', at, 0.75);
  }
}

function menuFlow(s: Score): void {
  const N = s.meta.bars;
  const tr = (b: number): number => toRoot(PROG[Math.floor(b / 2) % 4]!);
  hookLine(s, 'pizz', 'celloPizz', 0, 0, 8, (b) => 0.5 + b * 0.02, false, 0.85);
  hookLine(s, 'pizz', 'celloPizz', tr, 8, N, () => 0.45, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', tr, 8, N, (b) => (b < 16 ? 0.6 : 0.72), false, 0.85);
  softChords(s, 'soft', 8, N, 2, 0.5, s.d(4));
  motif(s, 'melody', 'violinSus', 8, 0.7, 12);
  motif(s, 'melody', 'violinSus', 24, 0.8, 12);
  // violas a third below the melody (a chord tone under each note)
  let beat = 0;
  for (const [m, len] of MOTIF) {
    for (const at of [8, 24]) {
      const c = CH[PROG[Math.floor((at + Math.floor(beat / 4)) / 2) % 4]!];
      const top = n(m);
      let low = top - 3;
      while (low > top - 6 && !c.tones.some((t) => (t - low) % 12 === 0)) low--;
      note(s.L('harmony'), s.bank, 'violaSus', low, s.t(at, beat), s.d(len) * 0.97, { vel: at === 8 ? 0.6 : 0.7, attack: len >= 8 ? s.d(3) : 0.2, release: 0.8 });
    }
    beat += len;
  }
}


// ------------------------------------------------------------------ round 9: more Hans Zimmer

const epicAt = (b: number, from = 0): ChordName => EPIC[Math.floor((b - from) / 2) % 4]!;

/** Low strings on the chord root, breathing in from nothing over most of the chord (the Zimmer swell). */
function swells(s: Score, layer: string, from: number, to: number, vel: number, shape = 0.75): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[epicAt(b, from)];
    const dur = s.d(8);
    const o = { vel, attack: dur * shape, release: 1.4 };
    note(s.L(layer), s.bank, 'bassSus', c.root + 12, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'celloSus', c.root + 12, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'celloSus', c.tones[2]!, s.t(b), dur, { ...o, vel: vel * 0.75 });
  }
}

/** A sixteenth-note pattern on chord tones in the middle register (3 + 3 + 2 accents); `rise` lifts the last two beats of every 4th bar a semitone. */
function ostinato(s: Score, layer: string, insts: string[], from: number, to: number, vel: (b: number) => number, low: number, rise = false): void {
  const acc = [0, 3, 6, 8, 11, 14];
  for (let b = from; b < to; b++) {
    const c = CH[epicAt(b, from)];
    const tones = c.tones.filter((t) => t >= low && t < low + 12).sort((x, y) => x - y);
    const a = tones[0] ?? c.tones[2]!;
    const pat = [a, tones[1] ?? a + 7, tones[2] ?? a + 12, tones[1] ?? a + 7];
    for (let i = 0; i < 16; i++) {
      const up = rise && b % 4 === 3 && i >= 8 ? 1 : 0;
      for (const inst of insts) {
        note(s.L(layer), s.bank, inst, pat[i % 4]! + up + (inst === 'celloSpic' ? -12 : 0), s.t(b, i / 4), s.d(0.25), { vel: vel(b) * (acc.includes(i) ? 1 : 0.62), release: 0.07 });
      }
    }
  }
}

/** High violins holding the top of each chord, entering softly. */
function highHold(s: Score, layer: string, inst: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[epicAt(b, from)];
    note(s.L(layer), s.bank, inst, c.tones[5]! + 12, s.t(b), s.d(8), { vel, attack: s.d(3), release: 1 });
    note(s.L(layer), s.bank, inst, c.tones[4]! + 12, s.t(b), s.d(8), { vel: vel * 0.85, attack: s.d(3), release: 1 });
  }
}

/** Warm horn chords swelling over each chord. */
function hornSwells(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[epicAt(b, from)];
    for (const m of [c.tones[0]!, c.tones[1]!, c.tones[2]!]) note(s.L(layer), s.bank, 'hornSus', m, s.t(b), s.d(8), { vel, attack: s.d(5), release: 1.2 });
  }
}

const hookTo = (from: number) => (b: number): number => toRoot(epicAt(b, from));

function zbuild(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'pizz', 'celloPizz', hookTo(0), 0, N, () => 0.7, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', hookTo(0), 0, N, () => 0.85, false, 0.85);
  ostinato(s, 'ost', ['violaSpic'], 0, N, () => 0.55, n('D4'));
  swells(s, 'swell', 0, N, 0.6);
  highHold(s, 'high', 'violinSus', 0, N, 0.45);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.75, 12);
    motif(s, 'melody', 'celloSus', at, 0.75, -12);
  }
  hornSwells(s, 'horns', 0, N, 0.35);
  motif(s, 'horns', 'hornSus', 24, 0.45);
  const P = s.L('pulse');
  for (let b = 0; b < N; b++) {
    hit(P, s.bank, 'giant', 4, s.t(b), 0.5);
    hit(P, s.bank, 'giant', 4, s.t(b, 0.5), 0.3);
    if (b % 2 === 0) timp(P, s.bank, CH[epicAt(b)].root + 12, s.t(b), 0.4);
  }
  for (const b of [8, 16, 24]) swellInto(P, s.bank, 'cym', 1, s.t(b), 0.45);
}

function zdrive(s: Score): void {
  const N = s.meta.bars;
  ostinato(s, 'ost', ['celloSpic', 'violaSpic'], 0, N, () => 0.7, n('D4'), true);
  hookLine(s, 'hook', 'violaSpic', (b) => hookTo(0)(b) + 12, 0, N, () => 0.75, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', hookTo(0), 0, N, () => 0.7, false, 0.85);
  swells(s, 'swell', 0, N, 0.75, 0.5);
  for (let b = 0; b < N; b += 4) {
    const c = CH[epicAt(b)];
    note(s.L('high'), s.bank, 'violinTrem', c.tones[5]! + 12, s.t(b), s.d(16), { vel: 0.6, attack: s.d(8), release: 0.8 });
    note(s.L('high'), s.bank, 'violinTrem', c.tones[4]! + 12, s.t(b), s.d(16), { vel: 0.5, attack: s.d(8), release: 0.8 });
  }
  for (const at of [8, 24]) {
    motif(s, 'melody', 'violinSus', at, 0.85, 12);
    motif(s, 'melody', 'celloSus', at, 0.85, -12);
  }
  for (let b = 0; b < N; b += 2) {
    const c = CH[epicAt(b)];
    for (const m of [c.tones[0]!, c.tones[2]!]) note(s.L('horns'), s.bank, 'hornSus', m, s.t(b), s.d(8), { vel: 0.5, attack: s.d(3), release: 1.2 });
    note(s.L('horns'), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: 0.45, attack: s.d(3), release: 1.2 });
  }
  const P = s.L('drums');
  for (let b = 0; b < N; b++) {
    for (const i of [0, 6, 11]) hit(P, s.bank, 'giant', i === 0 ? 1 : 2, s.t(b, i / 4), i === 0 ? 0.65 : 0.45);
    if (b % 2 === 0) timp(P, s.bank, CH[epicAt(b)].root + 12, s.t(b), 0.6);
  }
  for (const b of [8, 16, 24]) swellInto(P, s.bank, 'cym', 1, s.t(b), 0.6);
  timp(P, s.bank, D + 12, s.t(30), 0.65, true);
}

function zmenu(s: Score): void {
  // one cello note out of silence (bars 0-3), a high violin far above it
  note(s.L('swell'), s.bank, 'celloSus', n('A2'), s.t(0), s.d(16), { vel: 0.6, attack: s.d(12), release: 1.5 });
  note(s.L('high'), s.bank, 'violinSus', n('A5'), s.t(1), s.d(12), { vel: 0.3, attack: s.d(8), release: 1.5 });
  hookLine(s, 'pizz', 'celloPizz', hookTo(4), 4, 12, () => 0.65, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', hookTo(4), 12, 28, (b) => (b < 20 ? 0.75 : 0.88), false, 0.85);
  swells(s, 'swell', 4, 28, 0.55);
  ostinato(s, 'ost', ['violaSpic'], 12, 28, (b) => (b < 20 ? 0.4 : 0.6), n('D4'));
  highHold(s, 'high', 'violinSus', 20, 28, 0.55);
  motif(s, 'melody', 'celloSus', 12, 0.7, -12);
  motif(s, 'melody', 'violinSus', 20, 0.85, 12);
  motif(s, 'melody', 'violinSus', 20, 0.75);
  motif(s, 'horns', 'hornSus', 12, 0.42);
  hornSwells(s, 'horns', 20, 28, 0.42);
  // the final chord: everything on D minor, ringing out into the quiet start
  const end = s.t(28);
  for (const [inst, m, v] of [
    ['bassSus', D, 0.8],
    ['celloSus', D, 0.8],
    ['celloSus', n('A2'), 0.7],
    ['violaSus', n('F3'), 0.7],
    ['violinSus', n('D4'), 0.7],
    ['violinSus', n('A4'), 0.65],
    ['violinSus', n('D5'), 0.6],
  ] as const) note(s.L('swell'), s.bank, inst, m, end, s.d(10), { vel: v, attack: 0.3, release: 3 });
  for (const m of [n('D3'), n('A3'), n('F4')]) note(s.L('horns'), s.bank, 'hornSus', m, end, s.d(10), { vel: 0.45, attack: 0.3, release: 3 });
  const P = s.L('pulse');
  for (let b = 20; b < 28; b++) {
    hit(P, s.bank, 'giant', 4, s.t(b), 0.5);
    hit(P, s.bank, 'giant', 4, s.t(b, 2.5), 0.35);
  }
  swellInto(P, s.bank, 'cym', 1, s.t(20), 0.5);
  swellInto(P, s.bank, 'cym', 1, s.t(28), 0.6);
  hit(P, s.bank, 'gong', 1, end, 0.5);
}


// ------------------------------------------------------------------ round 10: darker, closer to Hook A

const darkAt = (b: number, from = 0): ChordName => DARK[Math.floor((b - from) / 2) % 4]!;

/** Low swells over the dark progression: basses and cellos on the root, violas on the third, low. */
function darkSwells(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[darkAt(b, from)];
    const dur = s.d(8);
    const o = { vel, attack: dur * 0.7, release: 1.5 };
    note(s.L(layer), s.bank, 'bassSus', c.root + 12, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'celloSus', c.root + 12, s.t(b), dur, o);
    note(s.L(layer), s.bank, 'violaSus', c.tones[1]!, s.t(b), dur, { ...o, vel: vel * 0.7 });
  }
}

/** A low sixteenth pattern on the violas over the dark chords (3 + 3 + 2 accents). */
function darkOst(s: Score, layer: string, from: number, to: number, vel: (b: number) => number): void {
  const acc = [0, 3, 6, 8, 11, 14];
  for (let b = from; b < to; b++) {
    const c = CH[darkAt(b, from)];
    const pat = [c.tones[0]!, c.tones[1]!, c.tones[2]!, c.tones[1]!];
    for (let i = 0; i < 16; i++) note(s.L(layer), s.bank, 'violaSpic', pat[i % 4]!, s.t(b, i / 4), s.d(0.25), { vel: vel(b) * (acc.includes(i) ? 1 : 0.6), release: 0.07 });
  }
}

/** Low cello tremolo swelling on D (and A), with violins far away and quiet when `violins`. */
function darkTrem(s: Score, layer: string, from: number, to: number, vel: number, violins: boolean): void {
  for (let b = from; b < to; b += 8) {
    const dur = s.d(Math.min(8, to - b) * 4);
    note(s.L(layer), s.bank, 'celloTrem', n('D3'), s.t(b), dur, { vel, attack: dur * 0.6, release: 1 });
    note(s.L(layer), s.bank, 'celloTrem', n('A3'), s.t(b), dur, { vel: vel * 0.8, attack: dur * 0.6, release: 1 });
    if (violins) note(s.L(layer), s.bank, 'violinTrem', n('A4'), s.t(b), dur, { vel: vel * 0.55, attack: dur * 0.7, release: 1 });
  }
}

/** Low brass swelling on the root and fifth: trombones and a horn, soft attack (dark weight, not a blast). */
function lowBrass(s: Score, layer: string, from: number, to: number, vel: number, trombones = true): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[darkAt(b, from)];
    note(s.L(layer), s.bank, 'hornSus', c.tones[0]!, s.t(b), s.d(8), { vel, attack: s.d(4), release: 1.4 });
    if (trombones) note(s.L(layer), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(4), release: 1.4 });
  }
}

function zdarkMenu(s: Score, stealth: boolean): void {
  // one low D swelling out of silence (bars 0-3)
  note(s.L('swell'), s.bank, 'celloSus', D, s.t(0), s.d(16), { vel: 0.6, attack: s.d(12), release: 1.5 });
  note(s.L('swell'), s.bank, 'bassSus', D, s.t(0), s.d(16), { vel: 0.5, attack: s.d(12), release: 1.5 });
  // Hook A on D, unchanged: plucked, then bowed
  hookLine(s, 'pizz', 'celloPizz', 0, 4, stealth ? 28 : 20, (b) => (b < 12 ? 0.62 : 0.5), false, 0.85);
  hookLine(s, 'pizz', 'bassPizz', -12, 4, stealth ? 28 : 20, () => 0.5, true, 0.85);
  const bowFrom = stealth ? 20 : 12;
  hookLine(s, 'hook', 'celloSpic', 0, bowFrom, 28, (b) => (b < 20 ? 0.7 : 0.85), false, 0.85);
  hookLine(s, 'hook', 'bassSpic', -12, bowFrom, 28, (b) => (b < 20 ? 0.5 : 0.7), true, 0.85);
  darkSwells(s, 'swell', 4, 28, stealth ? 0.5 : 0.58);
  darkOst(s, 'ost', 12, 28, (b) => (b < 20 ? 0.35 : stealth ? 0.45 : 0.55));
  darkTrem(s, 'trem', 12, 28, stealth ? 0.6 : 0.65, !stealth);
  if (stealth) {
    motif(s, 'melody', 'violaSus', 12, 0.5);
    motif(s, 'melody', 'celloSus', 20, 0.6, -12);
    motif(s, 'horns', 'hornSus', 20, 0.32, -12);
  } else {
    motif(s, 'melody', 'celloSus', 12, 0.58, -12);
    motif(s, 'melody', 'celloSus', 20, 0.7, -12);
    motif(s, 'melody', 'violaSus', 20, 0.6);
    motif(s, 'horns', 'hornSus', 20, 0.35, -12);
    lowBrass(s, 'horns', 20, 28, 0.3);
  }
  // the final chord: low and dark, ringing out into the quiet start
  const end = s.t(28);
  const big = stealth ? 0.6 : 0.8;
  for (const [inst, m, v] of [
    ['bassSus', D, big],
    ['celloSus', D, big],
    ['celloSus', n('A2'), big * 0.85],
    ['violaSus', n('D3'), big * 0.8],
    ['violaSus', n('F3'), big * 0.75],
  ] as const) note(s.L('swell'), s.bank, inst, m, end, s.d(10), { vel: v, attack: 0.25, release: 3 });
  for (const m of [n('D3'), n('A3')]) note(s.L('horns'), s.bank, 'hornSus', m, end, s.d(10), { vel: stealth ? 0.35 : 0.45, attack: 0.25, release: 3 });
  if (!stealth) note(s.L('horns'), s.bank, 'tbnSus', D, end, s.d(10), { vel: 0.45, attack: 0.25, release: 3 });
  // drums: a low heartbeat in the big section, timpani on the chord changes, swells, a gong on the final chord
  const P = s.L('pulse');
  for (let b = stealth ? 20 : 12; b < 28; b++) {
    hit(P, s.bank, 'giant', 4, s.t(b), b < 20 ? 0.4 : 0.5);
    hit(P, s.bank, 'giant', 4, s.t(b, 0.5), b < 20 ? 0.25 : 0.32);
  }
  if (!stealth) for (let b = 20; b < 28; b += 2) timp(P, s.bank, CH[darkAt(b, 4)].root + 12, s.t(b), 0.45);
  swellInto(P, s.bank, 'cym', 1, s.t(20), stealth ? 0.35 : 0.45);
  swellInto(P, s.bank, 'cym', 1, s.t(28), stealth ? 0.4 : 0.55);
  hit(P, s.bank, 'gong', 1, end, stealth ? 0.35 : 0.5);
}

function zdarkMission(s: Score): void {
  const N = s.meta.bars;
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, () => 0.65, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', 0, 0, N, () => 0.85, false, 0.85);
  hookLine(s, 'bass', 'bassSpic', -12, 0, N, () => 0.6, true, 0.85);
  darkOst(s, 'ost', 0, N, () => 0.5);
  darkSwells(s, 'swell', 0, N, 0.58);
  darkTrem(s, 'trem', 0, N, 0.65, true);
  for (const at of [8, 24]) {
    motif(s, 'melody', 'celloSus', at, 0.65, -12);
    motif(s, 'melody', 'violaSus', at, 0.55);
  }
  lowBrass(s, 'horns', 0, N, 0.3);
  motif(s, 'horns', 'hornSus', 24, 0.33, -12);
  const P = s.L('pulse');
  for (let b = 0; b < N; b++) {
    hit(P, s.bank, 'giant', 4, s.t(b), 0.45);
    hit(P, s.bank, 'giant', 4, s.t(b, 0.5), 0.28);
    if (b % 2 === 0) timp(P, s.bank, CH[darkAt(b)].root + 12, s.t(b), 0.4);
  }
  for (const b of [8, 24]) swellInto(P, s.bank, 'cym', 1, s.t(b), 0.4);
}


// ------------------------------------------------------------------ round 11: in the style of "Past/Present/Future"

const dorAt = (b: number): ChordName => DORIAN[Math.floor(b / 2) % 4]!;

/** The repeating figure's notes per chord (one octave, from D4 or C4), and its eighth-note order. */
const FIGURE: Record<string, number[]> = {
  Dm: [n('D4'), n('F4'), n('A4'), n('C5')],
  G: [n('D4'), n('G4'), n('B4'), n('D5')],
  F: [n('C4'), n('F4'), n('A4'), n('C5')],
  C: [n('C4'), n('E4'), n('G4'), n('C5')],
};
/** The figure grows a note at a time: each stage adds a step to the eighth-note order. */
const FIG_ORDER = [
  [0, 1, 2, 1, 0, 1, 2, 1],
  [0, 1, 2, 1, 0, 1, 2, 3],
  [0, 1, 2, 3, 0, 1, 2, 3],
  [0, 2, 1, 3, 0, 2, 1, 3],
];

function figure(s: Score, layer: string, inst: string, from: number, to: number, tr: number, vel: (b: number) => number, stageOf: (b: number) => number): void {
  for (let b = from; b < to; b++) {
    const tones = FIGURE[dorAt(b)]!;
    const order = FIG_ORDER[Math.min(FIG_ORDER.length - 1, stageOf(b))]!;
    for (let i = 0; i < 8; i++) note(s.L(layer), s.bank, inst, tones[order[i]!]! + tr, s.t(b, i / 2), s.d(0.45), { vel: vel(b) * (i % 4 === 0 ? 1 : 0.75), release: 0.1 });
  }
}

/** A soft low pulse in eighths on D with 3 + 3 + 2 accents (kept gentle: round 8 found the D aggressive). */
function softPulse(s: Score, layer: string, from: number, to: number, vel: (b: number) => number): void {
  for (let b = from; b < to; b++) {
    for (let i = 0; i < 8; i++) {
      const acc = i === 0 || i === 3 || i === 6;
      note(s.L(layer), s.bank, 'celloSpic', n('D3'), s.t(b, i / 2), s.d(0.45), { vel: vel(b) * (acc ? 0.9 : 0.55), release: 0.1 });
      if (acc) note(s.L(layer), s.bank, 'bassSpic', D, s.t(b, i / 2), s.d(0.45), { vel: vel(b) * 0.6, release: 0.1 });
    }
  }
}

/** A long-note melody (original), 8 bars per phrase, lifting over the G major chord. */
const PPF_MEL: [string, number][][] = [
  [['A4', 8], ['B4', 6], ['A4', 2], ['C5', 4], ['A4', 4], ['G4', 6], ['E4', 2]],
  [['A4', 4], ['D5', 4], ['D5', 6], ['B4', 2], ['C5', 4], ['F5', 4], ['E5', 8]],
];

function longMelody(s: Score, layer: string, at: number, phrase: number, vel: number, tr = 0): void {
  let beat = 0;
  for (const [m, len] of PPF_MEL[phrase]!) {
    note(s.L(layer), s.bank, 'violinSus', n(m) + tr, s.t(at, beat), s.d(len) * 0.98, { vel, attack: len >= 6 ? s.d(1.5) : 0.25, release: 0.9 });
    beat += len;
  }
}

function dorSwells(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[dorAt(b)];
    const dur = s.d(8);
    note(s.L(layer), s.bank, 'bassSus', c.root + 12, s.t(b), dur, { vel, attack: dur * 0.6, release: 1.3 });
    note(s.L(layer), s.bank, 'celloSus', c.root + 12, s.t(b), dur, { vel, attack: dur * 0.6, release: 1.3 });
    note(s.L(layer), s.bank, 'violaSus', c.tones[1]!, s.t(b), dur, { vel: vel * 0.7, attack: dur * 0.6, release: 1.3 });
  }
}

function dorBrass(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[dorAt(b)];
    for (const m of [c.tones[1]!, c.tones[2]!]) note(s.L(layer), s.bank, 'hornSus', m, s.t(b), s.d(8), { vel, attack: s.d(3), release: 1.2 });
    note(s.L(layer), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: vel * 0.85, attack: s.d(3), release: 1.2 });
  }
}

function dorDrums(s: Score, layer: string, from: number, to: number, vel: number, big: boolean): void {
  const P = s.L(layer);
  for (let b = from; b < to; b++) {
    if (b % 2 === 0) timp(P, s.bank, CH[dorAt(b)].root + 12, s.t(b), vel);
    if (big) for (const i of [0, 3, 6]) hit(P, s.bank, 'giant', i === 0 ? 1 : 4, s.t(b, i / 2), vel * (i === 0 ? 0.9 : 0.6));
  }
}

function ppfMenu(s: Score): void {
  const N = s.meta.bars;
  const dyn = (b: number): number => (b < 8 ? 0.45 : b < 16 ? 0.55 : b < 24 ? 0.65 : b < 36 ? 0.8 : 0.45);
  softPulse(s, 'pulse', 0, N, (b) => dyn(b) * 0.85);
  figure(s, 'arp', 'violaSpic', 0, N, 0, dyn, (b) => (b < 8 ? 0 : b < 16 ? 1 : b < 24 ? 2 : b < 36 ? 3 : 0));
  figure(s, 'arpHigh', 'violinSpic', 24, 36, 12, (b) => dyn(b) * 0.85, () => 3);
  hookLine(s, 'hook', 'celloSpic', 0, 8, 36, (b) => (b < 16 ? 0.62 : b < 24 ? 0.72 : 0.85), false, 0.85);
  dorSwells(s, 'swell', 8, 36, 0.6);
  longMelody(s, 'melody', 16, 0, 0.75);
  longMelody(s, 'melody', 24, 1, 0.85);
  longMelody(s, 'melody', 24, 1, 0.75, -12);
  dorBrass(s, 'brass', 24, 36, 0.4);
  dorDrums(s, 'drums', 16, 36, 0.55, false);
  dorDrums(s, 'drums', 24, 36, 0.5, true);
  for (const b of [16, 24, 32]) swellInto(s.L('drums'), s.bank, 'cym', 1, s.t(b), 0.45);
}

function ppfMission(s: Score): void {
  const N = s.meta.bars;
  softPulse(s, 'pulse', 0, N, () => 0.6);
  figure(s, 'arp', 'violaSpic', 0, N, 0, () => 0.6, (b) => Math.floor(b / 8));
  figure(s, 'arpHigh', 'violinSpic', 0, N, 12, () => 0.55, (b) => Math.min(3, Math.floor(b / 8) + 1));
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, () => 0.62, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', 0, 0, N, () => 0.8, false, 0.85);
  dorSwells(s, 'swell', 0, N, 0.6);
  longMelody(s, 'melody', 8, 0, 0.8);
  longMelody(s, 'melody', 24, 1, 0.85);
  dorBrass(s, 'brass', 0, N, 0.38);
  dorDrums(s, 'drums', 0, N, 0.5, true);
  for (const b of [8, 24]) swellInto(s.L('drums'), s.bank, 'cym', 1, s.t(b), 0.4);
}


// ------------------------------------------------------------------ round 12: Past/Present/Future, slow and dark

/** The darker minor progression for the slow version, two bars each. */
const SLOW: ChordName[] = ['Dm', 'Bb', 'Gm', 'A'];
const slowAt = (b: number): ChordName => SLOW[Math.floor(b / 2) % 4]!;

/** The figure low in the violas: chord tones from D3 up. */
const LOW_FIGURE: Record<string, number[]> = {
  Dm: [n('D3'), n('F3'), n('A3'), n('D4')],
  Bb: [n('D3'), n('F3'), n('Bb3'), n('D4')],
  Gm: [n('D3'), n('G3'), n('Bb3'), n('D4')],
  A: [n('C#3'), n('E3'), n('A3'), n('C#4')],
};

function slowFigure(s: Score, layer: string, inst: string, from: number, to: number, tr: number, vel: (b: number) => number, stageOf: (b: number) => number): void {
  for (let b = from; b < to; b++) {
    const tones = LOW_FIGURE[slowAt(b)]!;
    const order = FIG_ORDER[Math.min(FIG_ORDER.length - 1, stageOf(b))]!;
    for (let i = 0; i < 8; i++) note(s.L(layer), s.bank, inst, tones[order[i]!]! + tr, s.t(b, i / 2), s.d(0.48), { vel: vel(b) * (i % 4 === 0 ? 1 : 0.72), release: 0.15 });
  }
}

/** A heavy, soft plucked pulse: basses and cellos on beat 1 and the "and" of 2, on the chord root. */
function slowPulse(s: Score, layer: string, from: number, to: number, vel: (b: number) => number): void {
  for (let b = from; b < to; b++) {
    const r = CH[slowAt(b)].root + 12;
    for (const [beat, v] of [[0, 1], [1.5, 0.7]] as const) {
      note(s.L(layer), s.bank, 'bassPizz', r - 12, s.t(b, beat), s.d(1), { vel: vel(b) * v, release: 0.3 });
      note(s.L(layer), s.bank, 'celloPizz', r, s.t(b, beat), s.d(1), { vel: vel(b) * v * 0.8, release: 0.3 });
    }
  }
}

/** The new long-note melody, made minor and epic: phrase 0 low and searching, phrase 1 rising to the peak. */
const SLOW_MEL: [string, number][][] = [
  [['A4', 8], ['Bb4', 6], ['A4', 2], ['G4', 4], ['Bb4', 4], ['A4', 8]],
  [['D5', 8], ['F5', 6], ['D5', 2], ['D5', 4], ['Bb4', 4], ['C#5', 8]],
];

function slowMelody(s: Score, layer: string, inst: string, at: number, phrase: number, vel: number, tr = 0): void {
  let beat = 0;
  for (const [m, len] of SLOW_MEL[phrase]!) {
    note(s.L(layer), s.bank, inst, n(m) + tr, s.t(at, beat), s.d(len) * 0.98, { vel, attack: len >= 6 ? s.d(1.5) : 0.3, release: 1 });
    beat += len;
  }
}

function slowSwells(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[slowAt(b)];
    const dur = s.d(8);
    note(s.L(layer), s.bank, 'bassSus', c.root + 12, s.t(b), dur, { vel, attack: dur * 0.65, release: 1.5 });
    note(s.L(layer), s.bank, 'celloSus', c.root + 12, s.t(b), dur, { vel, attack: dur * 0.65, release: 1.5 });
    note(s.L(layer), s.bank, 'violaSus', c.tones[1]!, s.t(b), dur, { vel: vel * 0.7, attack: dur * 0.65, release: 1.5 });
  }
}

function slowBrass(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[slowAt(b)];
    note(s.L(layer), s.bank, 'hornSus', c.tones[0]!, s.t(b), s.d(8), { vel, attack: s.d(3), release: 1.4 });
    note(s.L(layer), s.bank, 'hornSus', c.tones[2]!, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(3), release: 1.4 });
    note(s.L(layer), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(3), release: 1.4 });
  }
}

function slowDrums(s: Score, layer: string, from: number, to: number, vel: number, heartbeat: boolean): void {
  const P = s.L(layer);
  for (let b = from; b < to; b++) {
    if (b % 2 === 0) timp(P, s.bank, CH[slowAt(b)].root + 12, s.t(b), vel);
    if (heartbeat) {
      hit(P, s.bank, 'giant', 1, s.t(b), vel * 0.8);
      hit(P, s.bank, 'giant', 4, s.t(b, 1.5), vel * 0.5);
    }
  }
}

function ppfSlowMenu(s: Score): void {
  const dyn = (b: number): number => (b < 8 ? 0.45 : b < 16 ? 0.55 : b < 24 ? 0.65 : b < 30 ? 0.82 : 0.55);
  slowPulse(s, 'pulse', 0, 32, (b) => dyn(b) * 0.9);
  slowFigure(s, 'fig', 'violaSpic', 0, 32, 0, dyn, (b) => (b < 8 ? 0 : b < 16 ? 1 : b < 24 ? 2 : b < 30 ? 3 : 0));
  slowFigure(s, 'figHigh', 'violinSpic', 24, 30, 12, (b) => dyn(b) * 0.8, () => 3);
  hookLine(s, 'hook', 'celloSpic', 0, 8, 30, (b) => (b < 16 ? 0.7 : b < 24 ? 0.8 : 0.9), false, 0.85);
  slowSwells(s, 'swell', 0, 32, 0.55);
  darkTrem(s, 'trem', 8, 30, 0.85, false);
  slowMelody(s, 'melody', 'celloSus', 16, 0, 0.55, -12);
  slowMelody(s, 'melody', 'violaSus', 16, 0, 0.42);
  slowMelody(s, 'melody', 'violinSus', 24, 1, 0.68);
  slowMelody(s, 'melody', 'celloSus', 24, 1, 0.55, -12);
  slowMelody(s, 'brass', 'hornSus', 24, 1, 0.35, -12);
  slowBrass(s, 'brass', 24, 30, 0.32);
  slowDrums(s, 'drums', 16, 30, 0.5, false);
  slowDrums(s, 'drums', 24, 30, 0.5, true);
  for (const b of [16, 24]) swellInto(s.L('drums'), s.bank, 'cym', 1, s.t(b), 0.45);
  hit(s.L('drums'), s.bank, 'gong', 1, s.t(24), 0.4);
}

function ppfSlowMission(s: Score): void {
  const N = s.meta.bars;
  slowPulse(s, 'pulse', 0, N, () => 0.6);
  slowFigure(s, 'fig', 'violaSpic', 0, N, 0, () => 0.6, (b) => Math.floor(b / 8));
  slowFigure(s, 'figHigh', 'violinSpic', 0, N, 12, () => 0.5, (b) => Math.min(3, Math.floor(b / 8) + 1));
  hookLine(s, 'pizz', 'celloPizz', 0, 0, N, () => 0.6, false, 0.85);
  hookLine(s, 'hook', 'celloSpic', 0, 0, N, () => 0.88, false, 0.85);
  slowSwells(s, 'swell', 0, N, 0.58);
  darkTrem(s, 'trem', 0, N, 0.85, false);
  slowMelody(s, 'melody', 'celloSus', 8, 0, 0.55, -12);
  slowMelody(s, 'melody', 'violaSus', 8, 0, 0.42);
  slowMelody(s, 'melody', 'violinSus', 24, 1, 0.65);
  slowMelody(s, 'melody', 'celloSus', 24, 1, 0.52, -12);
  slowBrass(s, 'brass', 0, N, 0.3);
  slowDrums(s, 'drums', 0, N, 0.45, true);
  for (const b of [8, 24]) swellInto(s.L('drums'), s.bank, 'cym', 1, s.t(b), 0.4);
}


// ------------------------------------------------------------------ round 13: more Alert faster; under fire

/** Big drums for the Alert-faster family: low drum on the 3 + 3 + 2 sixteenth accents, timpani on chord changes, swells. */
function afDrums(s: Score, layer: string, from: number, to: number, vel: number): void {
  const P = s.L(layer);
  for (let b = from; b < to; b++) {
    for (const i of [0, 6, 11]) hit(P, s.bank, 'giant', i === 0 ? 1 : 2, s.t(b, i / 4), vel * (i === 0 ? 1 : 0.7));
    if (b % 2 === 0) timp(P, s.bank, CH[PROG[Math.floor(b / 2) % 4]!].root + 12, s.t(b), vel * 0.9);
  }
  for (let b = from + 8; b < to; b += 8) swellInto(P, s.bank, 'cym', 1, s.t(b), vel * 0.8);
}

function afBrass(s: Score, layer: string, from: number, to: number, vel: number): void {
  for (let b = from; b < to; b += 2) {
    const c = CH[PROG[Math.floor(b / 2) % 4]!];
    note(s.L(layer), s.bank, 'hornSus', c.tones[0]!, s.t(b), s.d(8), { vel, attack: s.d(2), release: 1.2 });
    note(s.L(layer), s.bank, 'hornSus', c.tones[2]!, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(2), release: 1.2 });
    note(s.L(layer), s.bank, 'tbnSus', c.root + 12, s.t(b), s.d(8), { vel: vel * 0.9, attack: s.d(2), release: 1.2 });
  }
}

function afHeavy(s: Score, brass: boolean): void {
  alertFast(s);
  if (brass) afBrass(s, 'brass', 0, s.meta.bars, 0.4);
  afDrums(s, 'drums', 0, s.meta.bars, 0.85);
}

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
  afBrass(s, 'brass', 0, N, 0.4);
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
}

export function renderPiece(bank: Bank, meta: PieceMeta): Piece {
  const s = new Score(bank, meta);
  if (meta.id === 'mission') mission(s);
  else if (meta.id === 'alertfast') alertFast(s);
  else if (meta.id === 'lighter') lighter(s);
  else if (meta.id === 'zbuild') zbuild(s);
  else if (meta.id === 'underfire') underFire(s);
  else if (meta.id === 'afheavy') afHeavy(s, true);
  else if (meta.id === 'afdrums') afHeavy(s, false);
  else if (meta.id === 'afmenu96' || meta.id === 'afmenu84') alertFast(s);
  else if (meta.id === 'ppfslow80' || meta.id === 'ppfslow70') ppfSlowMenu(s);
  else if (meta.id === 'ppfslowmission') ppfSlowMission(s);
  else if (meta.id === 'ppfmenu') ppfMenu(s);
  else if (meta.id === 'ppfmission') ppfMission(s);
  else if (meta.id === 'zdark') zdarkMenu(s, false);
  else if (meta.id === 'zdarker') zdarkMenu(s, true);
  else if (meta.id === 'zdarkmission') zdarkMission(s);
  else if (meta.id === 'zdrive') zdrive(s);
  else if (meta.id === 'zmenu') zmenu(s);
  else if (meta.id === 'moving') moving(s);
  else if (meta.id === 'alertlight') alertLight(s);
  else if (meta.id === 'menuflow') menuFlow(s);
  else if (meta.id === 'menugrand') menuGrand(s);
  else if (meta.id === 'menubrood') menuBrood(s);
  else nightShiftRef(s);
  return { meta, layers: s.layers };
}
