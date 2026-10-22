// A6 the Pump House: the set's e2e steps for e2e-ctcourse (part 3). STUB (marlow-final slice 0d): the set is not built yet, so the
// walk is the runner's stub walk (the step line on both pages, in at A6-entry, on to A6-mid, the same lit level on both
// pages there). The set slice replaces `walk` with its co-op route on two pages (SPEC 9 and the set doc's e2e rows);
// the runner then moves both onto the exit holding room's pad.
// To re-add from the old bunker run (git 5920cce5, `hangDown`, `station7`): the hang-down through the plate to the
// panel and the pull back up; the two-person rope.
export const SET = 'a6PumpHouse';

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  await t.stubWalk(n);
}
