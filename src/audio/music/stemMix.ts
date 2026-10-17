/**
 * Threat to stem gains (music direction v3 Section 5). Pure: the sketch picker uses it now, the game adapter later.
 * A track is three stacked stems: calm always plays, caution adds on top, alert adds on top of both. Nothing switches
 * songs; the stems stay in sync and only their gains move.
 */
export type StemGains = readonly [calm: number, caution: number, alert: number];

export type ThreatState = 'calm' | 'caution' | 'alert' | 'evasion';

/** Each state's stem gains. Evasion keeps caution and a thinned alert layer (-8 dB): still hunted, less dense. */
export const STATE_GAINS: Record<ThreatState, StemGains> = {
  calm: [1, 0, 0],
  caution: [1, 1, 0],
  alert: [1, 1, 1],
  evasion: [1, 1, 0.4],
};

/** Crossfade times (s): threat rises fast, falls slowly (back to calm takes a while). */
export const FADE_UP = 0.8;
export const FADE_DOWN = 5;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A continuous threat (0 = calm, 1 = full alert) to gains: caution fades in over 0.15-0.45, alert over 0.55-0.9.
 * Equal-power curves, so a half-faded stem sits at -3 dB rather than -6.
 */
export function threatGains(x: number): StemGains {
  const k = smooth(0.15, 0.45, x);
  const a = smooth(0.55, 0.9, x);
  return [1, Math.sin((k * Math.PI) / 2), Math.sin((a * Math.PI) / 2)];
}

/** The fade time for a move between two gain sets: up if any stem rises, else down. */
export function fadeTime(from: StemGains, to: StemGains): number {
  for (let i = 0; i < 3; i++) if (to[i]! > from[i]! + 1e-3) return FADE_UP;
  return FADE_DOWN;
}

/** The loop region of a padded stem file (see the render CLI): [pad, pad + loop). */
export function loopRegion(pad: number, loop: number): { start: number; end: number } {
  return { start: pad, end: pad + loop };
}
