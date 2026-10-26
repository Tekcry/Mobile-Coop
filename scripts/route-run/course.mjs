// Route-run course hooks (J13 R4a seam, docs/route-runs/PLAN.md "Seams"): what the harness does in course mode
// (Marlow Yard) beyond walking. Node side; the driver calls both on every run, any mode.
//   onPoll(ctx, run)            after every driver chunk (a restart or retry watcher reads the page here)
//   onLockedDoor(ctx, run, step) at a door on the path that is locked: true when the hook opened it (drill stubs), false
//                               when it could not (the driver then logs a `locked` dead stop)
// `ctx` is the steps context (steps.mjs); `run` the run log being written (its `drills`, `restarts`, `detections`).
// R4a: no-ops, so a locked course door is a `locked` stop. R4c owns this file next: the drill gates (BRIEF "Marlow Yard
// drill gates", A13) and the restart watcher (BRIEF "Restarts and retries", A14).

/** Nothing to watch in R4a. */
export async function onPoll(_ctx, _run) {}

/** R4a never opens a locked door: the driver logs the `locked` stop. */
export async function onLockedDoor(_ctx, _run, _step) {
  return false;
}

/** (seam SR3) After a wait ended by a course interrupt: `{ resume, place: { leader, follower } | null }`, or null (no
 *  action queued: the driver takes the same step again). R4a queues none. */
export async function onRestart(_ctx, _run, _steps, _i) {
  return null;
}

/** (seam SR5) A selftest run's `course` block against its log: the problems ([] = pass). R4a checks none. */
export function checkCourseExpect(_block, _log) {
  return [];
}
