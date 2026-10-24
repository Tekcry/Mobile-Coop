# Auto train (rolling merge train)
Purpose: master gets every ready PR without a human step. Michael 2026-10-23 ~19:10, "Yes, fully automatic": a script
builds and releases to master on CI + laptop green, no 3-PR wait; the orchestrator handles conflicts and failures.
Pacing (Michael, the time-saving pace): the next train is built once the last release is 60 min old, or earlier when
the laptop queue is idle.

Script: `scripts/auto-train.mjs` (pure helpers tested in `tests/autoTrain.test.ts`). It drives
`scripts/merge-train.mjs` (G183 version step, `docs/systems/deploy.md`) through its CLI only.

## Running it
- `node scripts/auto-train.mjs tick [--dry-run] [--once] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>]`.
  One step does at most one thing and is safe to repeat.
- Fast poll (audit 2: green trains waited ~11 min for the next 5-min run): a tick whose step ends waiting
  (`pending`, `laptop-rerun`, `holding`) keeps its tick lock and runs the step again every `AUTO_TRAIN_FAST_POLL_S`
  (60) s while the next poll starts within `AUTO_TRAIN_FAST_POLL_MAX_MIN` (4) min of the tick's start, so it ends
  before the next 5-min task run. Any state change stops it at once (the step already acted: release, build, failed,
  ...); the status is written after every poll. `--once` and `--dry-run` never poll (`fastPollPlan`). The lock's
  heartbeat touches it every minute, so the 30-min staleness never fires on a polling tick; the task's
  `MultipleInstances IgnoreNew` (and the lock) skip a 5-min start that lands while a long tick (a release or build)
  still runs. A hand `merge-train` run during a polling tick STOPs on the held train lock: retry after it. Exit 0 (outcome in the status file), 1 on an error.
- `--worktree`: where merge-train runs (it checks out `train/<n>` and commits there); default
  `C:/NightShift/Mobile-Coop-train`. It must be clean, and nothing else may run merge-train in it while the task is on.
- `--min-interval` (default 60) and `--max-per-day` (default 0 = off) pace builds, not releases: a green train always
  releases.
- `--dry-run`: reads GitHub only (gh, `git ls-remote`, no fetch) and prints each write as `[dry-run] would run: ...`;
  it still writes the log and the status (with `"dryRun": true`).
- Scheduled task: `scripts/auto-train-task.ps1` registers "NightShift auto-train" every 5 min (hidden window through
  wscript, current user, only while logged on); `-Unregister` removes it. Register it from a checkout that does not
  change branch (`-RepoDir`), never from the train worktree.
- Files (`AUTO_TRAIN_SCRATCH` moves them): lock `C:/NightShift/scratch/auto-train.lock` (created `wx`; a running tick
  touches it every minute; untouched for 30 min = stale and replaced; a held lock skips the tick), log
  `C:/NightShift/scratch/runs/auto-train.log` (merge-train output included), status
  `C:/NightShift/scratch/auto-train-status.json`: one JSON line `{ state, train, version, head, reason, time, ... }`
  (extra keys: `pr`, `members`, `leftOut`, `candidates`, `checkWait`, `released`, `rebuildFailed`, `rerun`, `rerunRequestFailed`,
  `dryRun`; `rerun` is carried into every status of the same train head, error ticks included, and so is
  `rerunRequestFailed` on error ticks), build marker
  `C:/NightShift/scratch/auto-train-building.json` (`{ train, version, pid, at }`, written just before
  `merge-train build`, deleted by merge-train as soon as the version commit is pushed (`AUTO_TRAIN_BUILD_MARKER`), and
  again in a finally, also on errors; the laptop queue reads it). A `--dry-run` tick uses `auto-train.dryrun.lock`, `runs/auto-train.dryrun.log`,
  `auto-train-status.dryrun.json` and `auto-train-building.dryrun.json` and never touches the real four.
- The train lock is shared: `merge-train build / release / single` (not `--dry-run`) take the same
  `auto-train.lock` (same format and staleness; `AUTO_TRAIN_LOCK` overrides the path), so a hand run in the train
  worktree and a tick never overlap: a held lock stops merge-train with exit 1. A tick hands its lock text to the
  merge-train it calls (`AUTO_TRAIN_LOCK_TEXT`), which then runs under it.

## State machine (one tick)
| Situation | State | Action |
| --- | --- | --- |
| Open train PR (head `train/<n>`), `auto-train/vitest` failure on its head (older trains only: build no longer runs vitest) | failed | none |
| CI `check` failed on the head | failed | none |
| `laptop-e2e` failure from the desktop worker (description starts `desktop:`, with a `FAIL: a,b` list), no rerun recorded for this head | laptop-rerun | `node scripts/laptop-queue/request.mjs --sha <head> --suites "a b" --pr <train PR> --set train<n>-rerun --requester auto-train --train-rerun` (runs right after trains); the request is recorded in the status (`rerun: { head, id, suites, set, at }`) so the head never requests twice. On master's `request.mjs` (before laptop-queue PR #252) `--train-rerun` is silently ignored: the request is a plain pr request with set `train<n>-rerun` (normal pr order, either worker may run it), it exits 0, and a pass posts only `laptop-e2e/train<n>-rerun`, never `laptop-e2e`; with PR #252 it runs right after trains on the laptop and a pass also posts `laptop-e2e` success. A failed request (non-zero exit or no id printed) is logged (`rerunRequestFailed: { head, exit, why, count }`, kept on error ticks) and retried next tick, never fatal |
| Desktop failure, no rerun recorded, the request failed 6 times on this head (`RERUN_REQUEST_MAX`) | rerun-request-failed | none (orchestrator alert; a new head starts again) |
| Desktop failure, `laptop-e2e/train<n>-rerun` success on the same head, CI `check` success, vitest not failed | releasing | the normal release path below (decide -> `merge-train release`), logged "released on the laptop rerun of <suites>" (Orchestrator: "treat a laptop pass as releasable"); this is how a pass releases on master's `request.mjs`; with CI still pending: laptop-rerun, wait |
| Desktop failure with a rerun recorded for this head, no rerun verdict yet | laptop-rerun | wait (with PR #252 the pass also posts `laptop-e2e` success and the train releases as a plain green train) |
| Desktop failure, `laptop-e2e/train<n>-rerun` failure | failed | none |
| Desktop failure, rerun recorded, no `laptop-e2e/train<n>-rerun` success or failure `AUTO_TRAIN_RERUN_STALE_MIN` (60) min after the request (`rerun.at`) | rerun-stale | none (the reason names the request id; orchestrator chases the laptop queue) |
| `laptop-e2e` failure or error from the laptop itself (no `desktop:` prefix), or a desktop failure whose suites cannot be parsed (no `FAIL:` part, a list cut at 140 chars) | failed | none (the orchestrator decides which member leaves) |
| Open train with no `"<version>: version at merge, train <n> (G183)"` commit (its build died before it) | error | none ("train <n> has no version commit: rebuild"); it is never released |
| `check` success and `laptop-e2e` success | releasing | `merge-train release <n> <version> "<title>" --head <tested head> --no-fallback` (`--resume` when commits follow the version commit); release STOPs unless `origin/train/<n>` is still that head, merges with `gh pr merge --match-head-commit <head>`, and never takes the old-style path; exit 0 -> released, then the no-train path in the same tick; exit 3 (master moved) -> `build` the same members with the next version on the same `<n>` and retitle the PR; a failed rebuild is recorded (`rebuildFailed: { head, master }`, reason "rebuild failed for <head>") and later ticks skip the release (state failed) until the train head or master changes; exit 2 -> failed; head moved (the `--head` STOP) -> pending |
| No `laptop-e2e` status 3 h after the head was pushed | stale | none (orchestrator alert) |
| `check` success but no `laptop-e2e` status 10 min after it turned green (check run `completedAt` / status `updated_at`; `AUTO_TRAIN_LAPTOP_MISSING_MIN`) | laptop-missing | none (status `waitingMin`; orchestrator chases the laptop queue) |
| Anything else (CI or laptop pending / missing) | pending | wait (fast poll) |
| No open train, no `train-ready` PR with a green `check` | idle | none |
| Candidates, but the last release is under `--min-interval` min old and the laptop queue is not idle (or `--max-per-day` reached) | waiting | none |
| Candidates, paced to go, and a `train-ready` PR whose `check` is not green yet while its CI still runs (`check` queued / in progress, any other check run or status pending, or `check` missing while lint / test / build-check all passed), for under `AUTO_TRAIN_CHECK_WAIT_MIN` (3) min since that head was first seen waiting (`checkWait: { <head>: <ISO> }` in the status, carried across ticks and error ticks) | holding | none (audit 2: PR #299 missed train 47, its `check` was missing 43 s before it went green); a PR whose CI failed or has no CI activity never holds; after the wait the build goes on without it |
| Candidates, paced to go | building / built | (the candidates are read again right before the build, so the member list is fresh; build marker written) `merge-train build <n+1> <version> "<title>" <branches...>`; a member left out on a conflict loses `train-ready` and gets a comment; exit 3 -> failed (every member left out); any other non-zero exit -> error |
| Any command error, or no version for the open train | error | none |

- `merge-train build` ends with the push of the version commit (the train head): no local vitest and no `heavy.lock`
  wait (audit 2026-10-24: train 58 lost ~8 min to it and the desktop queue sat idle 9.5 min on train 59). CI's `test`
  job runs the full vitest on that head and release waits for green CI, so a unit-test failure still blocks the merge.
  The build marker is deleted right after that push, so the desktop queue claims the head at once.
- Version of an open train: its newest `"<version>: version at merge, train <n> (G183)"` commit, else its PR title
  `"<version>: Train <n>: <title>"`, else a CHANGELOG heading that names `Train <n>`.
- Candidates: open PRs to master labelled `train-ready` (the tick creates the label when missing) whose `check` passed
  on their current head, plus `feature/menu` when it is ahead of master in docs only (`*.md`, `docs/**`); feature/menu
  only rides along, it never starts a train by itself.
- Stacked PRs: a candidate whose head is contained in another candidate's head is not passed to `build` (the tip
  carries it); its fragment still counts for the version and the title.
- Version: master's `package.json` bumped minor when any member's `changes/<branch>.md` says `kind: minor`, has no
  kind line, or is missing; patch when all say `kind: patch`. Title: the fragments' `# ` titles (else the PR titles)
  joined with "; ", whole titles up to ~200 chars then "; +k more".
- `<n>`: the highest `train/<k>` branch on origin or "train <k>" in a PR title / head, plus one.
- Left out on a conflict: listed in the status `leftOut`; the PR loses its `train-ready` label
  (`gh pr edit <pr> --remove-label train-ready`, logged; a failed removal is logged, not fatal), so it stops being a
  candidate and no longer causes repeat empty builds (audit 2026-10-24), and it gets one comment per head
  (`<!-- auto-train:left-out:<sha> -->`) saying the label was removed: the lead fixes the conflict and re-adds
  `train-ready`. Under `--dry-run` both are printed only.
- The pacing laptop queue: `origin/laptop-queue` read through the GitHub tree API. Busy while any `*.json` sits under a
  `pending/` folder (or is named `pending*`) or any `running*` file or `running/` folder exists; idle otherwise. No
  such branch: the interval alone paces.

## What the orchestrator does
- `failed`: drop the culprit (remove its `train-ready` label, close the train PR; the next tick builds a new train
  from the rest), or push a fix to `train/<n>` (the next green tick releases with `--resume`).
- `laptop-rerun`: nothing (audit 2026-10-24: a desktop failure used to wait ~36 min for the orchestrator).
- `rerun-stale`: find the named request on the laptop-queue branch (claimed? done? duplicate?) and chase the queue.
- `rerun-request-failed`: `request.mjs` failed 6 times for this head (`rerunRequestFailed.why`): fix it and queue the
  rerun by hand, or decide the train.
- `stale`: chase the laptop queue (the train needs a `laptop-e2e` status).
- `error`: read the log; a dirty train worktree or a merge-train usage change are the usual causes.
- Throttle with `--max-per-day` / `--min-interval` in the task's `-TickArgs`.

## What the laptop queue service provides
- A full `npm run e2e` (Test Runner's train slot) on the head of every open `train/<n>` PR, newest head only.
- A commit status on that sha, context `laptop-e2e`: `pending` when queued or started (description "queued" /
  "12/39"), then `success` or `failure` (or `error` when the run itself broke), description "<passed>/<total>" plus the
  failing suites on a failure. A rerun posts a new status on the same sha; the newest one counts.
- A train rerun request (`request.mjs ... --train-rerun`, laptop-queue PR #252) runs right after trains; a full pass
  posts `laptop-e2e` success "laptop rerun passed: ..." on the sha (plus `laptop-e2e/<set>`), a fail only `laptop-e2e/<set>`
  (`laptop-e2e/train<n>-rerun` here). Master's `request.mjs` drops `--train-rerun`: the plain pr request posts only
  `laptop-e2e/<set>`, which auto-train also releases on. The desktop worker
  prefixes its own `laptop-e2e` descriptions with `desktop: ` (`scripts/laptop-queue/service.mjs`; the failed suites
  follow `FAIL:` as in `lib.mjs describe`).
- Optional, for pacing: `origin/laptop-queue` with one JSON file per pending request under `pending/` and a `running*`
  marker while a run is going; removed or moved out of `pending/` when done.

## Rules it keeps
- Never forces anything (merge-train's own `build` force-pushes only `train/<n>`), never touches dev or master
  directly (merge-train's `release` merges the PR, tags and moves dev), never closes PRs; the only label it removes is
  `train-ready` from a member left out on a conflict.
- Every gh or git write goes through one `act()` (and merge-train calls through `mergeTrain()`); both only print under
  `--dry-run`.

## Known limits (later polish)
- Assembler bump reuse: auto-train works out minor / patch from the fragments itself (`releaseKind`) instead of reusing
  scripts/changelog-assemble.mjs, so the two rules can drift.
- `gh pr view --json commits` returns at most 250 commits: a train PR with more loses its oldest subjects (members and
  the version commit search work on what is returned).
- Wire candidates of a deleted member branch: `planWire` skips a member whose `origin/<b>` no longer exists, so its
  wire change does not count toward the `PROTOCOL_VERSION` bump.
