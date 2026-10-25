# Auto train (rolling merge train)
Purpose: master gets every ready PR without a human step. Michael 2026-10-23 ~19:10, "Yes, fully automatic": a script
builds and releases to master on CI + laptop green, no 3-PR wait; the orchestrator handles conflicts and the failures
auto-drop cannot place (a laptop failure drops its member and rebuilds at once, Michael 2026-10-24).
Pacing (Michael, the time-saving pace): the next train is built once the last release is 60 min old, or earlier when
the laptop queue is idle.

Script: `scripts/auto-train.mjs` (pure helpers tested in `tests/autoTrain.test.ts`). It drives
`scripts/merge-train.mjs` (G183 version step, `docs/systems/deploy.md`) through its CLI only.

## Running it
- `node scripts/auto-train.mjs tick [--dry-run] [--once] [--no-autodrop] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>]`.
  One step does at most one thing and is safe to repeat.
- The scheduled task starts a tick every minute (G286). Fast poll (`fastPollPlan`; written for the old 5-min tick): a
  tick whose step ends waiting (`pending`, `laptop-rerun`, `holding`) keeps its tick lock and runs the step again every
  `AUTO_TRAIN_FAST_POLL_S` (60) s while the next poll starts within `AUTO_TRAIN_FAST_POLL_MAX_MIN` (4) min of the
  tick's start. Any state change stops it at once (the step already acted: release, build, failed, ...); the status is
  written after every poll. `--once` and `--dry-run` never poll. Once the open train's laptop-e2e pending status is
  older than its expected wall (the laptop's "expect ~N s" in it, else 10 min; `laptopLate`) it polls every
  `AUTO_TRAIN_FAST_POLL_LATE_S` (30) s instead. While a tick polls, the 1-minute starts are skipped (the task's
  `MultipleInstances IgnoreNew` and the held lock), so with 1-minute ticks the 60 s poll changes nothing and only the
  30 s late poll is faster than a new tick. The lock's heartbeat touches it every minute, so the 30-min staleness never
  fires on a polling tick. A hand `merge-train` run during a polling tick STOPs on the held train lock: retry after it.
  Exit 0 (outcome in the status file), 1 on an error.
- `--worktree`: where merge-train runs (it checks out `train/<n>` and commits there); default
  `C:/NightShift/Mobile-Coop-train`. It must be clean, and nothing else may run merge-train in it while the task is on.
- `--min-interval` (default 60) and `--max-per-day` (default 0 = off) pace builds, not releases: a green train always
  releases.
- `--no-autodrop`: a failed laptop run stays state `failed` for the orchestrator (the behaviour before auto-drop).
- `--dry-run`: reads GitHub only (gh, `git ls-remote`, no fetch) and prints each write as `[dry-run] would run: ...`;
  it still writes the log and the status (with `"dryRun": true`).
- Scheduled task: `scripts/auto-train-task.ps1` registers "NightShift auto-train" every minute (`-Minutes`, default 1;
  hidden window through wscript, current user, only while logged on); `-Unregister` removes it. Register it from a checkout that does not
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
| `laptop-e2e` failure from the desktop worker (description starts `desktop:`, with a `FAIL: a,b` list), no rerun recorded for this head | laptop-rerun | `node scripts/laptop-queue/request.mjs --sha <head> --suites "a b" --pr <train PR> --set train<n>-rerun --requester auto-train --train-rerun` (runs right after trains); the request is recorded in the status (`rerun: { head, id, suites, set, at }`) so the head never requests twice. It runs right after trains on the laptop, and a pass also posts `laptop-e2e` success. A failed request (non-zero exit or no id printed) is logged (`rerunRequestFailed: { head, exit, why, count }`, kept on error ticks) and retried next tick, never fatal |
| Desktop failure, no rerun recorded, the request failed 6 times on this head (`RERUN_REQUEST_MAX`) | rerun-request-failed | none (orchestrator alert; a new head starts again) |
| Desktop failure, `laptop-e2e/train<n>-rerun` success on the same head, CI `check` success, vitest not failed | releasing | the normal release path below (decide -> `merge-train release`), logged "released on the laptop rerun of <suites>" (Orchestrator: "treat a laptop pass as releasable"); with CI still pending: laptop-rerun, wait |
| Desktop failure with a rerun recorded for this head, no rerun verdict yet | laptop-rerun | wait (a pass also posts `laptop-e2e` success and the train releases as a plain green train) |
| Desktop failure, `laptop-e2e/train<n>-rerun` failure | the next train's state (built, holding, ...) | auto-drop (below) with the rerun's own `FAIL:` list; a rerun failure with no `FAIL:` list (service error, a slot gave no result, build failed) or `--no-autodrop`: failed, none |
| Desktop failure, rerun recorded, no `laptop-e2e/train<n>-rerun` success or failure `AUTO_TRAIN_RERUN_STALE_MIN` (60) min after the request (`rerun.at`) | rerun-stale | none (the reason names the request id; orchestrator chases the laptop queue) |
| `laptop-e2e` failure or error from the laptop itself (no `desktop:` prefix) | the next train's state (built, holding, ...) | auto-drop (below); failed, none, when it cannot pick a member (no failing suite in the description or a failure comment, a member diff unreadable, only docs members, the guards below) or under `--no-autodrop` (the orchestrator decides which member leaves) |
| A desktop failure whose suites cannot be parsed (no `FAIL:` part, a list cut at 140 chars, no result) | failed | none (no laptop rerun was possible, so no auto-drop; the orchestrator decides) |
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
- Release path (audit 2026-10-24 finding 9): `build` assembles the CHANGELOG and makes the version commit on git
  objects before anything is pushed (a bad fragment, an empty train or nothing new -> exit 1, no push, no PR), pushes
  `train/<n>` once (the version commit) and opens the PR after it. The version, kind and title come from the members
  actually merged: a left-out member never names the release, and a minor left out of a train of patches makes it a
  patch (`version: <v> (<kind>) (asked <planned>)` in the output; the version commit, PR title and heading carry it).
  The heading names the PR number GitHub will give (newest issue + 1); if another PR takes it, the heading is rewritten
  and pushed once more. `release` merges with `--body "merge-train: Pages deploy is dispatched after dev moves"`, then
  runs the idempotent tail (tag if missing, dev if behind, member PRs, one deploy dispatch, `PREVIEW:` line;
  `docs/systems/deploy.md`); `release` of an already merged train and `merge-train repair` run only that tail.
  Known gap: on a rebuild (exit 3) auto-train retitles the PR with its planned version and title after `build`.
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
- Auto-drop (Michael 2026-10-24 ~21:00, "Auto-drop on failure"; a failed train used to wait 10-30 min for the
  orchestrator): the failing suites come from the `laptop-e2e` (or rerun) description's `FAIL:` list, else from the
  newest laptop-queue failure comment on the head (`**<suite>**` / `Failing assert:` lines, which also give the assert).
  Each member's changed files are `git diff --name-only origin/master...<PR head>` (the compare API when the head is
  not local), mapped to suites with the `--affected` folder map (`DIRECT_COVERS` in `scripts/e2e-affected.mjs`,
  `suiteSetFor`; the narrow map, so fewer over-drops than the `--quick` map; suite parts like `e2e-ctcourse:4` count as
  their suite). `pickDrops`: (1) every member whose suites include a failing suite; else (2) the member with the most
  `src/` files under any folder that maps to a failing suite (`coverFolders`: any `QUICK_COVERS` row naming it, `src/`
  for a CORE suite); else, or on a tie there, (3) the newest-labelled member (label
  time from the PR's events; higher PR number on a tie). Never `feature/menu`, never a docs-only member in (2)-(3); a
  one-member train drops that member. Guards (orchestrator check, fix round): no drop (state failed, reason says why)
  when more than 3 suites failed (`AUTODROP_MAX_SUITES`, parts as their suite: master or the machine), when tier 1 would
  take every code member of a train with 2+ of them, or when a failing suite was also failed by the last auto-dropped
  train (`lastDrop: { train, failing, at }` in the status, carried on every status until a release or a newer drop: a
  repeat points at master or a flake, not a member). Tier 1 can over-drop: a member whose change only reaches a
  failing suite's folders leaves with the culprit. With the `--quick` map the train 41 replay dropped #254 (S23) beside
  the culprits #270 and #264 (its `src/ai` change maps to `e2e-levels` there); `DIRECT_COVERS` drops only #270 and #264
  (trains 45 and 54 replay the same: #294, #308). The orchestrator re-adds `train-ready` to an innocent member. Each dropped PR loses `train-ready` and gets one comment per train and head
  (`<!-- auto-train:dropped:train<n>:<sha> -->`: train, failing suite, assert); the train PR is closed with a comment
  (`gh pr close --comment`; the branch stays); then the no-train path runs in the same tick without pacing and without
  the dropped branches. Log: one `DROPPED #<pr> <branch> from train <n>: <suite> (tier k)` line each; status: the next
  train's fields plus `dropped: [{ pr, branch, suite }]`, `closedTrain: { train, pr, head, failing }`, `dropReason`.
- The pacing laptop queue: `origin/laptop-queue` read through the GitHub tree API. Busy while any `*.json` sits under a
  `pending/` folder (or is named `pending*`) or any `running*` file or `running/` folder exists; idle otherwise. No
  such branch: the interval alone paces.

## What the orchestrator does
- `failed`: drop the culprit (remove its `train-ready` label, close the train PR; the next tick builds a new train
  from the rest), or push a fix to `train/<n>` (the next green tick releases with `--resume`). A laptop failure is
  dropped automatically (auto-drop); `failed` is left for CI / build-time vitest failures, a failure auto-drop could
  not place (its reason says why), and every failure under `--no-autodrop`. A wrong drop: re-add `train-ready` to the
  member (the next train takes it again).
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
- A train rerun request (`request.mjs ... --train-rerun`) runs right after trains; a full pass posts `laptop-e2e`
  success "laptop rerun passed: ..." on the sha (plus `laptop-e2e/<set>`), a fail only `laptop-e2e/<set>`
  (`laptop-e2e/train<n>-rerun` here). The desktop worker
  prefixes its own `laptop-e2e` descriptions with `desktop: ` (`scripts/laptop-queue/service.mjs`; the failed suites
  follow `FAIL:` as in `lib.mjs describe`).
- Optional, for pacing: `origin/laptop-queue` with one JSON file per pending request under `pending/` and a `running*`
  marker while a run is going; removed or moved out of `pending/` when done.
- `visual-gate` (the laptop's picture gate after a green train, `docs/laptop-queue/visual-gate.md`) is never read: a flag never holds a release (visual-gate BRIEF A1).

## Rules it keeps
- Never forces anything (merge-train's own `build` force-pushes only `train/<n>`), never touches dev or master
  directly (merge-train's `release` merges the PR, tags and moves dev); the only PR it closes is a train whose laptop
  run failed (auto-drop), and the only label it removes is `train-ready`, from a member left out on a conflict or
  dropped from a failed train.
- Every gh or git write goes through one `act()` (and merge-train calls through `mergeTrain()`); both only print under
  `--dry-run`.

## Known limits (later polish)
- Assembler bump reuse: auto-train works out minor / patch from the fragments itself (`releaseKind`) instead of reusing
  scripts/changelog-assemble.mjs, so the two rules can drift.
- `gh pr view --json commits` returns at most 250 commits: a train PR with more loses its oldest subjects (members and
  the version commit search work on what is returned).
- Wire candidates of a deleted member branch: `planWire` skips a member whose `origin/<b>` no longer exists, so its
  wire change does not count toward the `PROTOCOL_VERSION` bump.
