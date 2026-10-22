// A8 the Strongroom: the set's e2e steps for e2e-ctcourse (part 4). STUB (marlow-final slice 0d): the set is not built yet, so the
// walk is the runner's stub walk (the step line on both pages, in at A8-entry, on to A8-mid, the same lit level on both
// pages there). The set slice replaces `walk` with its co-op route on two pages (SPEC 9 and the set doc's e2e rows);
// the runner then moves both onto the exit holding room's pad.
// The runner's finale (a revive in the cash dock, the both-in exit zone) runs after this walk.
export const SET = 'a8Strongroom';

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  await t.stubWalk(n);
}
