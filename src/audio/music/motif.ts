/**
 * The Night Shift motif (direction Section 4): five notes over two bars, written for this project.
 * Steps are eighth notes; pitches are semitones from D (D = 0). Lengths are in eighths.
 */
export interface MotifNote {
  step: number;
  /** Semitones above D at the instrument's own octave. */
  semis: number;
  len: number;
}

/** Statement: D F E Bb A - up a minor third, down a semitone, down a tritone, down a semitone. */
export const MOTIF_STATEMENT: readonly MotifNote[] = [
  { step: 0, semis: 0, len: 3 },
  { step: 3, semis: 3, len: 1 },
  { step: 4, semis: 2, len: 2 },
  { step: 6, semis: -4, len: 7 },
  { step: 14, semis: -5, len: 2 },
];

/** The last three notes (E Bb A): the cell. */
export const MOTIF_CELL: readonly MotifNote[] = MOTIF_STATEMENT.slice(2).map((n) => ({ ...n, step: n.step - 4 }));

/** Resolved: D F E C D - the tritone becomes a third and lands home. */
export const MOTIF_RESOLVED: readonly MotifNote[] = [
  { step: 0, semis: 0, len: 3 },
  { step: 3, semis: 3, len: 1 },
  { step: 4, semis: 2, len: 2 },
  { step: 6, semis: -2, len: 7 },
  { step: 14, semis: 0, len: 2 },
];

/** Inversion: D B C F# G (the third goes down, the tritone rises). */
export const MOTIF_INVERSION: readonly MotifNote[] = MOTIF_STATEMENT.map((n) => ({ ...n, semis: n.semis === 0 ? 0 : -n.semis }));

/** Semitone offsets as pitch names (for the lab and the docs). */
export const MOTIF_NAMES = 'D F E Bb A';

/** Playback-rate ratio for a motif note on an instrument rendered at D (root = D in some octave). */
export const motifRate = (semis: number, octave = 0): number => Math.pow(2, (semis + 12 * octave) / 12);
