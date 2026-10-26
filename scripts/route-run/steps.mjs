// Route-run link steps (J13 R4a seam, docs/route-runs/PLAN.md "Seams"): a table from a link's kind to the step the
// harness takes at it. Each step is a Node-side async call `step(ctx, link)`:
//   ctx  { host, client, pads, clock, limit, driver, log }: both pages (`client` null at --players 1), the pads
//        (`pads.host` / `pads.client`: `{ set(btn, v), axis(i, v) }` on that page), the host clock (game seconds), the
//        step's limit (s, null: none) and the in-page driver (`driver.hold(s)`, `driver.place(point)`, ...);
//   link the planner's link step (`{ index, kind, from, to, at, past, action, limit_s, hold_s, holdFrom }`).
// It returns `{ outcome: 'walked' | 'stub' | <a dead-stop class>, stub?: { link, kind, hold_s, why } }`.
// R4a: every kind is a stub (BRIEF A1 for the co-op kinds; a solo off-nav kind with no step yet is stubbed the same way
// and listed). R5 owns this file next (ladder, drop, window, hatch, duct, rappel on the pad), then R9 (real co-op moves).
// The driver walks `walk` and `door` links itself; only the other actions come here.
import { COOP_KINDS } from '../level-validate.mjs';

/** Why a stub was taken, as the report prints it. */
export const STUB_WHY_COOP = 'co-op move stubbed (A1)';
export const STUB_WHY_SOLO = 'no link step for this kind yet (R5)';

/**
 * The stub (BRIEF "Co-op links"): the robots stand at the link's near side (the driver walked them to its `at` point),
 * crouched in the live guard field, for the link's hold; then they are placed on its far side (`past`). Logged by link
 * with its hold, never counted as walked.
 */
export async function stub(ctx, link) {
  const hold = typeof link.hold_s === 'number' && link.hold_s > 0 ? link.hold_s : 0;
  await ctx.driver.hold(hold);
  await ctx.driver.place(link.past ?? link.at);
  return { outcome: 'stub', stub: { link: link.index, kind: link.kind, hold_s: hold, why: COOP_KINDS.has(link.kind) ? STUB_WHY_COOP : STUB_WHY_SOLO } };
}

/** Kind -> step. A kind not listed falls back to `stub`. */
export const STEPS = {
  ladder: stub,
  drop: stub,
  window: stub,
  hatch: stub,
  duct: stub,
  rappel: stub,
  ledge: stub,
  pipe: stub,
  wall_jump: stub,
  split_jump: stub,
};

/** The step for a link step (the co-op kinds and every unknown kind: `stub`). */
export function stepFor(link) {
  if (COOP_KINDS.has(link.kind)) return stub;
  return STEPS[link.kind] ?? stub;
}
