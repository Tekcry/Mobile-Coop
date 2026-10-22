// A4 the Goods Shed: the set's e2e steps for e2e-ctcourse (part 2). STUB (marlow-final slice 0d): the set is not built yet, so the
// walk is the runner's stub walk (the step line on both pages, in at A4-entry, on to A4-mid, the same lit level on both
// pages there). The set slice replaces `walk` with its co-op route on two pages (SPEC 9 and the set doc's e2e rows);
// the runner then moves both onto the exit holding room's pad.
// To re-add from the old bunker run (git 5920cce5, `securityRoom`): the console refuses while the officer is up; with him
// down the cameras' feed is LOOPED on both pages (`cams[i].mode === 'looped'`, N3, the job lead's 5920cce5 fix; a jam
// still reads 'off'), the cue hides, LANTERN's line reaches the client, a third press is refused.
export const SET = 'a4GoodsShed';

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  await t.stubWalk(n);
}
