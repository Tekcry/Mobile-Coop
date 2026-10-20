/**
 * (coop-fix) The hidden-page tick: a co-op match keeps its fixed-step sim (and so its net sends) running while the page
 * is hidden (another window over it, minimised, another tab), where the browser stops requestAnimationFrame. A small
 * worker posts ticks; each tick asks this decision how far to step. Pure, Babylon-free.
 */

/** Ticks a second the worker posts. */
export const BG_TICK_HZ = 30;
/** The most one tick steps (s): a long gap (a throttled worker, a suspended machine) is dropped, as rAF's 0.1 s cap. */
export const BG_TICK_MAX_S = 0.1;
/** An external driver (`stepHeadless`: the e2e pumps, tools) called within this time (ms) owns the sim: no tick steps. */
export const BG_EXTERNAL_HOLD_MS = 1000;

export interface BgTickInput {
  /** `setBackgroundTicks(true)`: a co-op session is live. */
  enabled: boolean;
  /** `document.hidden`. */
  hidden: boolean;
  /** The loop's manual mode (tools / tests: the sim advances only through `stepHeadless`). */
  manual: boolean;
  /** Milliseconds since the last `stepHeadless` call (Infinity: never). */
  sinceExternalMs: number;
  /** Milliseconds since the loop last took time (a rAF frame or a tick). */
  elapsedMs: number;
}

/**
 * Seconds of real time this tick feeds the loop: 0 when the page is visible (rAF runs it), outside co-op, in manual
 * mode or while an external driver steps the sim; else the elapsed time, capped at `BG_TICK_MAX_S`.
 */
export function bgStepSeconds(i: BgTickInput): number {
  if (!i.enabled || !i.hidden || i.manual || i.sinceExternalMs < BG_EXTERNAL_HOLD_MS) return 0;
  if (!(i.elapsedMs > 0)) return 0;
  return Math.min(i.elapsedMs / 1000, BG_TICK_MAX_S);
}
