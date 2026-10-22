// A5 the Substation: the set's e2e steps for e2e-ctcourse (part 3). STUB (marlow-final slice 0d): the set is not built yet, so the
// walk is the runner's stub walk (the step line on both pages, in at A5-entry, on to A5-mid, the same lit level on both
// pages there). The set slice replaces `walk` with its co-op route on two pages (SPEC 9 and the set doc's e2e rows);
// the runner then moves both onto the exit holding room's pad.
// To re-add from the old bunker run (git 5920cce5, `laserTest`, `throwOver`): a beam touch raises the alarm, no damage;
// the panel jam cuts the band on both pages; the partner throw over the beams and the far-side release.
export const SET = 'a5Substation';

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  await t.stubWalk(n);
}
