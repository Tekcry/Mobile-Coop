/** Pure note helpers for the V4 score (no Web Audio). Middle C is C4 = MIDI 60. */

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "D4", "Ab3", "C#4", "Bb2" -> MIDI number. */
export function midi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + PC[m[1]!]! + acc;
}

export function freq(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12);
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function noteName(n: number): string {
  return `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

/** One melody note: MIDI number (null = rest) and length in beats. */
export interface Note {
  n: number | null;
  d: number;
}

/** "D4:1.5 F4:1.5 A4:1 | -:1" -> notes. Bar lines ("|") are ignored; "-" is a rest. */
export function phrase(src: string): Note[] {
  const out: Note[] = [];
  for (const tok of src.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [name, len] = tok.split(':');
    const d = Number(len);
    if (!name || !Number.isFinite(d) || d <= 0) throw new Error(`bad note token: ${tok}`);
    out.push({ n: name === '-' ? null : midi(name), d });
  }
  return out;
}

/** Split a melody into bars of `beats` beats (notes never cross a bar line in these themes). */
export function bars(notes: readonly Note[], beats = 4): Note[][] {
  const out: Note[][] = [[]];
  let t = 0;
  for (const note of notes) {
    out[out.length - 1]!.push(note);
    t += note.d;
    if (t >= beats - 1e-9) {
      if (Math.abs(t - beats) > 1e-6) throw new Error('note crosses a bar line');
      t = 0;
      out.push([]);
    }
  }
  if (out[out.length - 1]!.length === 0) out.pop();
  return out;
}

/** A chord: root and bass as semitones above the key note, tones as semitones above the root. */
export interface Chord {
  root: number;
  tones: number[];
  /** Bass note when it differs from the root (slash chords), semitones above the key note. */
  bass?: number;
}

/** Fold a pitch class (semitones above the key note) into the octave starting at `lo` (absolute MIDI). */
export function fold(tonic: number, semis: number, lo: number): number {
  let n = tonic + (((semis % 12) + 12) % 12);
  while (n < lo) n += 12;
  while (n >= lo + 12) n -= 12;
  return n;
}

/** Bass note of a chord, in the octave starting at `lo`. */
export function chordBass(tonic: number, c: Chord, lo: number): number {
  return fold(tonic, c.bass ?? c.root, lo);
}

/**
 * Voice a chord between `lo` and `hi` (absolute MIDI): the bass first, then the chord tones stacked upwards in open
 * position (each tone placed above the previous), wrapping round the tones until `hi` is reached or `max` notes are used.
 */
export function voicing(tonic: number, c: Chord, lo: number, hi: number, max = 5): number[] {
  const out = [chordBass(tonic, c, lo)];
  let last = out[0]!;
  let i = c.bass !== undefined && c.bass !== c.root ? 0 : 1;
  let guard = 0;
  while (out.length < max && guard++ < 24) {
    const pc = c.root + c.tones[i % c.tones.length]!;
    let n = fold(tonic, pc, last + 3);
    if (n - last < 3) n += 12;
    if (n > hi) break;
    out.push(n);
    last = n;
    i++;
  }
  return out;
}

/** Chord tones (absolute pitch classes 0-11 relative to C) of a chord in a key. */
export function chordPcs(tonic: number, c: Chord): number[] {
  return c.tones.map((t) => (((tonic + c.root + t) % 12) + 12) % 12);
}

/** The highest chord tone at least 3 semitones below `n` (a harmony line under a melody). */
export function harmonyBelow(tonic: number, c: Chord, n: number): number {
  const pcs = chordPcs(tonic, c);
  for (let m = n - 3; m > n - 15; m--) if (pcs.includes(((m % 12) + 12) % 12)) return m;
  return n - 12;
}
