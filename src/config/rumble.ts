/**
 * Rumble table (locomotion step 17, D5.12; pure, local only: nothing here is sent, D8). Every gamepad rumble goes
 * through `playRumble`: an event of the local player maps to one entry, scaled by `gameplay.rumble` (0..1). Remote
 * players' events never rumble.
 */

export interface RumbleEntry {
  /** Low-frequency motor 0..1. */
  strong: number;
  /** High-frequency motor 0..1. */
  weak: number;
  /** Duration (ms). */
  ms: number;
}

export const RUMBLE = {
  landSoft: { strong: 0.15, weak: 0.25, ms: 60 },
  landRoll: { strong: 0.35, weak: 0.45, ms: 110 },
  landHeavy: { strong: 0.8, weak: 0.8, ms: 200 },
  takedownDone: { strong: 0.6, weak: 0.4, ms: 150 },
  elbowHit: { strong: 0.5, weak: 0.3, ms: 90 },
  shotSuppressed: { strong: 0.12, weak: 0.2, ms: 45 },
  shotLoud: { strong: 0.4, weak: 0.55, ms: 80 },
  /** Gear 6 (sprint) or carrying a body: per foot plant. */
  footfallHeavy: { strong: 0.06, weak: 0.1, ms: 35 },
  /** (moved from the call sites, values unchanged) */
  kill: { strong: 0.5, weak: 0.8, ms: 120 },
  hurt: { strong: 0.6, weak: 0.3, ms: 90 },
  explosion: { strong: 1, weak: 1, ms: 220 },
  /** The settings "Test vibration" button (values unchanged from the old direct call). */
  test: { strong: 0.8, weak: 0.5, ms: 300 },
} as const satisfies Record<string, RumbleEntry>;

export type RumbleKind = keyof typeof RUMBLE;
export const RUMBLE_KINDS = Object.keys(RUMBLE) as RumbleKind[];

export type RumbleSink = (strong: number, weak: number, ms: number) => void;

/** Play `kind` on `sink` when the event is the local player's (`local`), scaled by `scale` (0..1). True if played. */
export function playRumble(sink: RumbleSink, kind: RumbleKind, local: boolean, scale: number): boolean {
  if (!local) return false;
  const k = Math.max(0, Math.min(1, Number.isFinite(scale) ? scale : 1));
  if (k <= 0) return false;
  const e = RUMBLE[kind];
  sink(e.strong * k, e.weak * k, e.ms);
  return true;
}

/** The landing band (`LandingKind`) to its entry ('none' = no rumble). */
export function landingRumble(kind: string): RumbleKind | null {
  return kind === 'soft' ? 'landSoft' : kind === 'roll' ? 'landRoll' : kind === 'heavy' ? 'landHeavy' : null;
}
