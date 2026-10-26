/**
 * (mixamo-retarget Toggle, Michael 2026-10-26 00:25: "allow toggle between hand made, cmu, and mixamo") The Animation
 * source: one global look choice for Wren's clips, resolved once per change (settings load and change, the URL, the Anim
 * Studio's switch), never per frame. Pure: no DOM, no Babylon.
 * - `hand`: the hand-made clips (the CMU mocap locomotion off, the Mixamo captures off).
 * - `cmu`: the CMU mocap locomotion on, the Mixamo captures off: today's game (the default; tests/animSource.test.ts pins
 *   it byte-identical to the switch as it was).
 * - `mixamo`: the CMU set as `cmu`, with the Mixamo captures `MIXAMO_ON` lets play on top (`mixamo.ts`); a move with no
 *   Mixamo clip, or its row off, keeps the `cmu` clip.
 * Overrides for one page: `?anim=hand|cmu|mixamo` (the source), then `?mocap=0/1` and `?mixamo=0/1` (each half on its
 * own), then the tuner's "Mocap locomotion" box (the mocap half). A look choice only: gameplay reads none of it (timing,
 * reach and the wire are unchanged); a co-op partner drawn here uses this machine's source.
 */
import { applyMocapSwitch } from './mocap';
import { MIXAMO, setMixamo } from './mixamo';

export type AnimSource = 'hand' | 'cmu' | 'mixamo';
/** The sources in menu order. */
export const ANIM_SOURCES: readonly AnimSource[] = ['hand', 'cmu', 'mixamo'];
/** The default: today's game (the CMU mocap locomotion on, no Mixamo). */
export const ANIM_SOURCE_DEFAULT: AnimSource = 'cmu';
/** The menu / Now playing word per source. */
export const ANIM_SOURCE_LABEL: Readonly<Record<AnimSource, string>> = { hand: 'Hand-made', cmu: 'CMU', mixamo: 'Mixamo' };

/** A URL / stored value as a source (null: not one). */
export function parseAnimSource(v: unknown): AnimSource | null {
  return v === 'hand' || v === 'cmu' || v === 'mixamo' ? v : null;
}

/** What a page asks for: the setting, then the page's overrides (null: none). */
export interface AnimSourceWant {
  /** The stored setting (Options > Gameplay > Animation source, or the Anim Studio's switch). */
  setting: AnimSource;
  /** `?anim=` */
  url?: AnimSource | null;
  /** `?mocap=0/1` */
  mocapUrl?: boolean | null;
  /** The tuner's "Mocap locomotion" box (this page only). */
  mocapTuner?: boolean | null;
  /** `?mixamo=0/1` */
  mixamoUrl?: boolean | null;
}

/** The resolved state (the same object always; rewritten by `applyAnimSource`). */
export const ANIM_SOURCE: { source: AnimSource; mocap: boolean; mixamo: boolean } = { source: ANIM_SOURCE_DEFAULT, mocap: true, mixamo: false };

/** Resolve a want into the two switches (pure; `out` is written and returned). */
export function resolveAnimSource(w: AnimSourceWant, out: { source: AnimSource; mocap: boolean; mixamo: boolean }): typeof out {
  const source = w.url ?? w.setting;
  out.source = source;
  out.mocap = w.mocapUrl ?? w.mocapTuner ?? source !== 'hand';
  out.mixamo = w.mixamoUrl ?? source === 'mixamo';
  return out;
}

/** Resolve and apply (settings load and change, the Studio switch; never per frame). Returns the resolved state. */
export function applyAnimSource(w: AnimSourceWant): typeof ANIM_SOURCE {
  const r = resolveAnimSource(w, ANIM_SOURCE);
  // the mocap half through its own switch (it applies only on a change); the Mixamo half rebuilds its table on a change
  applyMocapSwitch(null, r.mocap);
  if (r.mixamo !== MIXAMO.on) setMixamo(r.mixamo);
  return r;
}

/** The source alone, no overrides (the Anim Studio's switch, tests). */
export function setAnimSource(s: AnimSource): typeof ANIM_SOURCE {
  return applyAnimSource({ setting: s });
}
