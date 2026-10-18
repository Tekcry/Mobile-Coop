/**
 * ON5 floor finishes and footstep loudness (pure, Babylon-free; tests/editor/climb.test.ts). A finish sounds as one of
 * the game's own floor surfaces (src/world/surfaces.ts `SURFACE_NOISE`, the multiplier `GameState` applies to every
 * footstep), and the distances are the game's own footstep radius (src/player/movement.ts `noiseRadius`) at its own
 * jog and sprint speeds (src/config/movement.ts `MOVEMENT`). No second formula: the card says what the game does.
 */
import { MOVEMENT } from '../config/movement';
import { noiseRadius } from '../player/movement';
import { SURFACE_NOISE } from '../world/surfaces';
import { FINISHES, finishOf } from './climbCatalogue';
import type { Finish } from './climbCatalogue';
import { fmt } from './geometry';

export interface Loudness {
  finish: Finish;
  /** The surface's footstep multiplier (concrete 1). */
  mult: number;
  /** quiet, normal, louder, loud. */
  word: string;
  /** Heard this far away (m) jogging and sprinting; a walk is silent on every floor (NOISE_QUIET). */
  jog: number;
  sprint: number;
  walk: number;
}

/** The loudness word for a multiplier: under 0.8 quiet, under 1.1 normal, under 1.35 louder, else loud. */
export const loudWord = (mult: number): string => (mult < 0.8 ? 'quiet' : mult < 1.1 ? 'normal' : mult < 1.35 ? 'louder' : 'loud');

/** A finish's footsteps in the game, or null for no finish (the map's default floor). */
export function loudness(finishId: string | undefined): Loudness | null {
  const f = finishOf(finishId);
  if (!f) return null;
  const mult = SURFACE_NOISE[f.surface];
  const r2 = (v: number): number => Math.round(v * 10) / 10;
  return {
    finish: f,
    mult,
    word: loudWord(mult),
    walk: r2(noiseRadius(MOVEMENT.walkSpeed, false, false) * mult),
    jog: r2(noiseRadius(MOVEMENT.jogSpeed, false, false) * mult),
    sprint: r2(noiseRadius(MOVEMENT.sprintSpeed, false, true) * mult),
  };
}

/** "Steel grating: loud, heard at 4.8 m jogging, 12.6 m sprinting (walking is silent)" or "No floor finish". */
export function loudWords(finishId: string | undefined): string {
  const l = loudness(finishId);
  if (!l) return 'No floor finish (the map default: concrete)';
  const walk = l.walk > 0 ? `${fmt(l.walk)} m walking, ` : '';
  return `${l.finish.name}: ${l.word}, heard at ${walk}${fmt(l.jog)} m jogging, ${fmt(l.sprint)} m sprinting${l.walk > 0 ? '' : ' (walking is silent)'}`;
}

/** The finish view's legend: every finish with its tint and loudness word, in catalogue order. */
export function finishLegend(): { id: string; name: string; tint: string; word: string }[] {
  return FINISHES.map((f) => ({ id: f.id, name: f.name, tint: f.tint, word: loudWord(SURFACE_NOISE[f.surface]) }));
}

/** The next finish for a D-pad step (none, then the catalogue order, wrapping). */
export function stepFinish(current: string | undefined, dir: 1 | -1): string {
  const ids = ['', ...FINISHES.map((f) => f.id)];
  const cur = finishOf(current)?.id ?? '';
  const i = ids.indexOf(cur);
  return ids[(i + dir + ids.length) % ids.length]!;
}
