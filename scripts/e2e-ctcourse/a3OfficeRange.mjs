// A3 the Office Range: the set's e2e steps for e2e-ctcourse (part 2). STUB (marlow-final slice 0d): the set is not built yet, so the
// walk is the runner's stub walk (the step line on both pages, in at A3-entry, on to A3-mid, the same lit level on both
// pages there). The set slice replaces `walk` with its co-op route on two pages (SPEC 9 and the set doc's e2e rows);
// the runner then moves both onto the exit holding room's pad.
// To re-add from the old bunker run (git 5920cce5, scripts/e2e-ctcourse.mjs `station3`): the camera's send-back, the
// jam handoff (5 s cap, reboot refusal), the cue on both pages, a jammed lamp's flicker.
export const SET = 'a3OfficeRange';

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  await t.stubWalk(n);
}
