# laptop-queue-9: brief
Owner: Test Runner. Status: current.

Lead: Night Shift | Test Runner (FIXES owner of F12, F16, F18-F20, F23; the orchestrator started the job). Started:
2026-10-26 ~14:30. Base: master 99fbd37fd (train 118).

## Michael said
- 2026-10-26 ~14:00, chat (to the orchestrator): "can you prioritise getting the fixes done and out to prevent repeat
  issues."

## Michael picked
- none

## Goal
The tooling fixes F12, F16, F18, F19, F20 and F23 of the orchestrator's tracker (`docs/orchestrator/FIXES.md` on
origin/feature/menu) ship in one PR, so trains stop losing minutes to error ticks, missed candidates, the deploy wait
and the pacing switch-off, and the watchdog reads re-filed request ids correctly.

| Fix | Evidence (FIXES) | What changes |
| --- | --- | --- |
| F12 | train 102 7 min late; HTTP 499 error tick 2026-10-26 13:50 | "nothing new to release" is idle, not error; read-only gh / git calls retry once after ~5 s |
| F16 | #460 missed train 103 | auto-train also takes open unlabelled PRs that meet the train-ready rule on their head |
| F18 | ~6 min lost per train | release no longer waits for the Pages deploy; later ticks check `/preview/` and run `merge-train repair` |
| F19 | pacing OFF since 2026-10-25 15:35 | pacing counts only laptop claims; then `--min-interval 60` is restored |
| F20 | re-filed `T000011` ids read as midnight | the watchdog ages a request by the commit that added it |
| F23 | #521 missed train 119 by 27 s | the candidates are re-read at build start, right before `merge-train build` |

## Limits
- Out of scope: `scripts/laptop-queue/**` and `tests/laptop-queue.test.ts` (laptop-queue-8 / #507 own them); the
  laptop service's train-gap knob (A13); retries inside merge-train's own gh calls; any game code.
- Rules that hold: G83 (master only through trains), G183 (versions), G286 (auto-train, auto-drop), G325 (commits after
  the label), G344 (one home per rule, doc budgets), the train-ready rule in `docs/RULES.md` "Getting to master".
- Areas touched and their unwalked count: none (tooling only, no walk item, no flag).

## Answers (M) and assumptions (A)
- A1 (F12): merge-train `build` exits 6 (new code) when the version commit has nothing new to release; auto-train
  records state `idle` with `nothingNew: { heads, master }` and skips the build while the candidate heads and master are
  unchanged. Undo: drop the exit-6 branch in auto-train `build` (exit 6 then reads as error again).
- A2 (F12): the retry covers read-only calls only (`read`, `api`, `apiRaw`, the laptop-queue GraphQL read); `act()`
  writes never retry (a duplicate comment or label is worse than an error tick). Undo: `AUTO_TRAIN_GH_RETRY_S=0`.
- A3 (F12): retried = any non-zero exit except a definite HTTP 4xx other than 499 (a 404 is already "null"; 401 / 422
  do not heal in 5 s). Undo: widen or narrow `ghRetryable`.
- A4 (F16): labelled PRs stay candidates on a green `check` as today (G325 stays enforced by the watchdog's `--fix prs`
  and the orchestrator); unlabelled PRs need the full rule on their current head (so G325 holds for them by
  construction) and must not have lost `train-ready` since that head was pushed (a drop, a left-out, a watchdog unlabel
  or a human hold all stay out until a new head). Undo: `AUTO_TRAIN_UNLABELLED=0`.
- A5 (F16): auto-train adds `train-ready` to an unlabelled PR it puts in a build, so auto-drop, left-out, the
  watchdog's G325 check and the laptop queue's train-ready reads all see one label. Undo: remove the add in
  `labelTaken` (auto-train.mjs).
- A6 (F18): the release tick passes `MERGE_TRAIN_DEPLOY_WAIT_MIN=0`; from the next tick auto-train fetches
  `/preview/version.json` each tick while `deployWatch` is open; still stale 20 min after the release it runs
  `merge-train repair` once (it re-dispatches the deploy when stale); stale 20 min after that it closes the watch and
  leaves the watchdog's `pages-behind` alert to the orchestrator. Undo: `AUTO_TRAIN_DEPLOY_WAIT_MIN=20` (old blocking
  wait) and `AUTO_TRAIN_DEPLOY_REPAIR_MIN=0` (no repair).
- A7 (F18): the deploy check runs on every tick, not only idle ones: back-to-back trains leave no idle tick (audit
  2026-10-25, self-update). Undo: gate `deployStep` on `d.state === 'idle'`.
- A8 (F19): an unclaimed queued request still counts busy (the laptop takes every kind); only open claims are filtered
  to `worker === 'laptop'`. Undo: drop the worker filter in `laptopQueueState`.
- A9 (F19): `--min-interval` goes back to 60, the code default and Michael's pace ("60 min old, or earlier when the
  laptop queue is idle", `docs/systems/auto-train.md`); the task ran on the default until the orchestrator re-registered
  it with `--min-interval 0` at 2026-10-25 15:35 (feature/menu 5d18ebc0b, "restore the default"). Undo: re-register with
  `-TickArgs "--min-interval 0"`.
- A10 (F20): a request's queued age = now minus the newest commit on origin/laptop-queue that added
  `requests/<id>.json` (one `git log` per watchdog run, last 7 days), else its id time. auto-train's own 12-h queued
  cutoff (`requestIdTime`) still reads the id: a re-filed id can leave pacing's busy count early; logged, not fixed here.
  Undo: pass no `addedAt` map to `laptopAlerts`.
- A11 (F23): build re-reads the candidates after `nextN()` and after `plan()`; if the set changed it re-plans once
  more, then starts `merge-train build`. An unlabelled PR whose checker and affected-e2e are green and whose `check` is
  still running holds the build like a labelled one (up to `AUTO_TRAIN_CHECK_WAIT_MIN`, 3 min). Undo:
  `AUTO_TRAIN_REREAD=0` (one read, as today).
- A12: one PR for all six fixes (~0.9k changed lines, under the cap); F20 is built by Sonnet from a strict brief with an
  Opus checker; F12/F16/F18/F19/F23 by Opus.
- A13: the laptop service's `LQ_TRAIN_GAP_MIN` (6.5) assumed release's ~5-min deploy wait; after F18 trains build
  sooner, so the laptop may hold PR runs ~5 min longer than needed. The Test Runner retunes it (env, no code) after this
  ships. Undo: nothing to undo here.

## Questions for Michael (one click each, asked by day)
- none (tooling fixes under the existing rules; no Michael-only rule is loosened).

## Sign-off needed
no
