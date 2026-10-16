import { midi, phrase, type Chord, type Note } from './theory';

/**
 * The two V4 audition sketches. Each has one main theme (8 bars), one bass hook (2 bars of eighths), the theme's
 * chords (one per bar) and its tempos. Written for this project (docs/music/score-design.md Section 2).
 */
export interface SketchDef {
  id: 'A' | 'B';
  name: string;
  /** One line for the test page. */
  blurb: string;
  /** cinematic: straighter drums, taiko, brass-forward. noir: swung brushed drums, metal percussion, reese bass. */
  feel: 'cinematic' | 'noir';
  /** Key note in octave 2 (the bass register). */
  tonic: number;
  theme: Note[];
  /** Plain-text notes for the page. */
  themeText: string;
  /** 16 eighths (2 bars), absolute MIDI; null = rest. */
  hook: (number | null)[];
  hookText: string;
  /** One chord per theme bar. */
  chords: Chord[];
  menuBpm: number;
  lowBpm: number;
  alertBpm: number;
  /** Sixteenth swing: how far the off sixteenths are pushed late, as a fraction of a sixteenth. */
  swing: number;
  /** Semitones the menu's final statement is lifted. */
  lift: number;
  /** Octave shift of the Calm fragments played on the bass. */
  fragOct: number;
}

const n = (s: string): number | null => (s === '-' ? null : midi(s));

const THEME_A = 'D4:1.5 F4:1.5 A4:1 | Ab4:1.5 G4:0.5 F4:1 E4:1 | D4:1.5 F4:1.5 Bb4:1 | A4:3 -:1 | ' +
  'D5:1.5 C5:1.5 Bb4:1 | A4:1.5 G4:0.5 F4:1 E4:1 | F4:1.5 E4:1.5 C#4:1 | D4:3 -:1';

const THEME_B = 'C4:0.75 C4:0.25 Eb4:1 Db4:0.5 C4:0.5 G3:1 | Ab3:1.5 Bb3:0.5 C4:2 | ' +
  'C4:0.75 C4:0.25 Eb4:1 F4:0.5 Gb4:0.5 F4:1 | Eb4:1.5 Db4:0.5 C4:2 | G4:1.5 Ab4:0.5 G4:1 Eb4:1 | ' +
  'F4:1.5 Gb4:0.5 F4:1 Db4:1 | Eb4:0.75 Eb4:0.25 Db4:1 C4:0.5 Bb3:0.5 B3:1 | C4:3 -:1';

const MINOR = [0, 3, 7];
const MAJOR = [0, 4, 7];

export const SKETCH_A: SketchDef = {
  id: 'A',
  name: 'Long Shadow',
  blurb: 'Cinematic and heroic. D minor; a rising "DAAH - DAAH - dah" cell and a slide down through the tritone.',
  feel: 'cinematic',
  tonic: midi('D2'),
  theme: phrase(THEME_A),
  themeText: THEME_A,
  hook: ['D2', '-', 'D3', 'D2', '-', 'C3', '-', 'A2', 'D2', '-', 'D3', 'D2', 'F2', 'G2', 'Ab2', 'A2'].map(n),
  hookText: 'D2 - D3 D2 - C3 - A2 | D2 - D3 D2 F2 G2 Ab2 A2',
  chords: [
    { root: 0, tones: MINOR }, // Dm
    { root: 0, tones: [0, 3, 6, 10] }, // Dm7b5
    { root: 8, tones: MAJOR, bass: 0 }, // Bb/D
    { root: 7, tones: MAJOR }, // A
    { root: 8, tones: MAJOR }, // Bb
    { root: 10, tones: MAJOR }, // C
    { root: 7, tones: [0, 4, 7, 10] }, // A7
    { root: 0, tones: MINOR }, // Dm
  ],
  menuBpm: 80,
  lowBpm: 92,
  alertBpm: 138,
  swing: 0.12,
  lift: 3,
  fragOct: -24,
};

export const SKETCH_B: SketchDef = {
  id: 'B',
  name: 'Cold Wire',
  blurb: 'Noir and coiled. C minor with a Phrygian flat second; a snapped "da-DUM" cell climbing to the tritone.',
  feel: 'noir',
  tonic: midi('C2'),
  theme: phrase(THEME_B),
  themeText: THEME_B,
  hook: ['C2', 'C2', 'Eb2', '-', 'C2', 'Db2', '-', 'C2', 'C2', 'C2', 'Eb2', '-', 'Gb2', 'F2', 'Eb2', 'Db2'].map(n),
  hookText: 'C2 C2 Eb2 - C2 Db2 - C2 | C2 C2 Eb2 - Gb2 F2 Eb2 Db2',
  chords: [
    { root: 0, tones: MINOR }, // Cm
    { root: 8, tones: MAJOR }, // Ab
    { root: 0, tones: [0, 3, 6, 10] }, // Cm7b5
    { root: 1, tones: MAJOR, bass: 0 }, // Db/C
    { root: 8, tones: [0, 4, 7, 11] }, // Abmaj7
    { root: 1, tones: MAJOR }, // Db
    { root: 7, tones: [0, 4, 10, 13] }, // G7 altered (G B F Ab)
    { root: 0, tones: MINOR }, // Cm
  ],
  menuBpm: 74,
  lowBpm: 84,
  alertBpm: 126,
  swing: 0.22,
  lift: 3,
  fragOct: -12,
};

export const SKETCHES: readonly SketchDef[] = [SKETCH_A, SKETCH_B];
