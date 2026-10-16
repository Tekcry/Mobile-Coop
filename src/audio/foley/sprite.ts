/**
 * The foley sprite: every movement take (CC0 recordings, `docs/audio-credits.md`) cut, levelled and laid end to end in
 * one MP3 (`src/assets/sfx/foley.mp3`) with an index of where each take starts (`foley.json`). Pure.
 *
 * MP3 encoders and decoders add a short delay at the start, and browsers differ in how much they trim. The render
 * records `mark`, the time of the first sample above `MARK_LEVEL` in the WAV it encoded; at load the same search on the
 * decoded buffer gives the decoder's shift, applied to every take.
 *
 * Gear is plain fabric only: the operator carries nothing loose (Michael, 2026-10-16: no buckle, belt or leather takes,
 * nothing that jingles).
 */

/** Bank ids (the render's `foley-sources.json` keys; `bootHeel` / `bootToe` are the split boot takes). */
export type FoleyBank =
  | 'concrete'
  | 'carpet'
  | 'board'
  | 'gravel'
  | 'bootHeel'
  | 'bootToe'
  | 'ring'
  | 'plate'
  | 'tin'
  | 'thump'
  | 'thumpHeavy'
  | 'hand'
  | 'cloth';

export const FOLEY_BANKS: readonly FoleyBank[] = ['concrete', 'carpet', 'board', 'gravel', 'bootHeel', 'bootToe', 'ring', 'plate', 'tin', 'thump', 'thumpHeavy', 'hand', 'cloth'];

/** A take in the sprite: start and length (s). */
export type Take = readonly [start: number, dur: number];

export interface FoleyIndex {
  /** Sample rate of the rendered WAV. */
  rate: number;
  /** Time (s) of the first sample above `MARK_LEVEL` in the rendered WAV. */
  mark: number;
  /** Total length (s). */
  length: number;
  banks: Record<FoleyBank, Take[]>;
}

/** The alignment mark's threshold (the sprite's first take peaks at 0.9). */
export const MARK_LEVEL = 0.2;

/** Time (s) of the first sample whose magnitude reaches `level`, or -1. */
export function firstAbove(samples: ArrayLike<number>, rate: number, level = MARK_LEVEL): number {
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!;
    if (v >= level || v <= -level) return i / rate;
  }
  return -1;
}

/** The decoder's shift (s) to add to every take start: decoded mark minus rendered mark, kept to a sane range. */
export function alignShift(decoded: ArrayLike<number>, rate: number, index: FoleyIndex): number {
  const t = firstAbove(decoded, rate);
  if (t < 0) return 0;
  return Math.max(-0.05, Math.min(0.1, t - index.mark));
}

/** Every bank the step recipes use is present and non-empty. */
export function missingBanks(index: FoleyIndex): FoleyBank[] {
  return FOLEY_BANKS.filter((b) => !index.banks[b]?.length);
}
