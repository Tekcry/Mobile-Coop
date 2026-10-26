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
