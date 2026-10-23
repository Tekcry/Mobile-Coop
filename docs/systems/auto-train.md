# Auto train (rolling merge train)
Purpose: master gets every ready PR without a human step. Michael 2026-10-23 ~19:10, "Yes, fully automatic": a script
builds and releases to master on CI + laptop green, no 3-PR wait; the orchestrator handles conflicts and failures.
Pacing (Michael, the time-saving pace): the next train is built once the last release is 60 min old, or earlier when
the laptop queue is idle.

Script: `scripts/auto-train.mjs` (pure helpers tested in `tests/autoTrain.test.ts`). It drives
`scripts/merge-train.mjs` (G183 version step, `docs/systems/deploy.md`) through its CLI only.

## Running it
- `node scripts/auto-train.mjs tick [--dry-run] [--worktree <dir>] [--min-interval <min>] [--max-per-day <n>]`.
  One tick does at most one thing and is safe to repeat. Exit 0 (outcome in the status file), 1 on an error.
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
  (extra keys: `pr`, `members`, `leftOut`, `candidates`, `released`, `rebuildFailed`, `dryRun`). A `--dry-run` tick
  uses `auto-train.dryrun.lock`, `runs/auto-train.dryrun.log` and `auto-train-status.dryrun.json` and never touches
  the real three.
- The train lock is shared: `merge-train build / release / single` (not `--dry-run`) take the same
  `auto-train.lock` (same format and staleness; `AUTO_TRAIN_LOCK` overrides the path), so a hand run in the train
  worktree and a tick never overlap: a held lock stops merge-train with exit 1. A tick hands its lock text to the
  merge-train it calls (`AUTO_TRAIN_LOCK_TEXT`), which then runs under it.

## State machine (one tick)
| Situation | State | Action |
| --- | --- | --- |
| Open train PR (head `train/<n>`), `auto-train/vitest` failure on its head | failed | none |
| CI `check` failed on the head | failed | none |
| `laptop-e2e` failure or error on the head | failed | none (the orchestrator decides which member leaves) |
| Open train with no `"<version>: version at merge, train <n> (G183)"` commit (its build died before it) | error | none ("train <n> has no version commit: rebuild"); it is never released |
| `check` success and `laptop-e2e` success | releasing | `merge-train release <n> <version> "<title>" --head <tested head> --no-fallback` (`--resume` when commits follow the version commit); release STOPs unless `origin/train/<n>` is still that head, merges with `gh pr merge --match-head-commit <head>`, and never takes the old-style path; exit 0 -> released, then the no-train path in the same tick; exit 3 (master moved) -> `build` the same members with the next version on the same `<n>` and retitle the PR; a failed rebuild is recorded (`rebuildFailed: { head, master }`, reason "rebuild failed for <head>") and later ticks skip the release (state failed) until the train head or master changes; exit 2 -> failed; head moved (the `--head` STOP) -> pending |
| No `laptop-e2e` status 3 h after the head was pushed | stale | none (orchestrator alert) |
| `check` success but no `laptop-e2e` status 10 min after it turned green (check run `completedAt` / status `updated_at`; `AUTO_TRAIN_LAPTOP_MISSING_MIN`) | laptop-missing | none (status `waitingMin`; orchestrator chases the laptop queue) |
| Anything else (CI or laptop pending / missing) | pending | wait |
| No open train, no `train-ready` PR with a green `check` | idle | none |
| Candidates, but the last release is under `--min-interval` min old and the laptop queue is not idle (or `--max-per-day` reached) | waiting | none |
| Candidates, paced to go | building / built | `merge-train build <n+1> <version> "<title>" <branches...>`; exit 2 -> failed (and an `auto-train/vitest` failure status on the head); exit 3 -> failed (every member left out); exit 4 (vitest not run: the heavy-lock wait timed out; the train is pushed and CI's `check` runs the unit tests) -> pending, the next tick goes on |
| Any command error, or no version for the open train | error | none |

- The `build` vitest step (under the heavy lock) is load-tolerant: when the full run fails and every failure is a `Test timed out in` or at most 3 test files failed, only those files rerun once with `npx vitest run --no-file-parallelism <files>`; a pass there is ok ("passed on isolated rerun: <files>"), a fail reports the rerun's tail. More than 3 failed files that are not all timeouts fail at once, no rerun.
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
- Left out on a conflict: listed in the status `leftOut`, and the PR gets one comment per head
  (`<!-- auto-train:left-out:<sha> -->`) asking the lead to fix the conflict; its label stays, so it joins the next
  train once it merges cleanly.
- The pacing laptop queue: `origin/laptop-queue` read through the GitHub tree API. Busy while any `*.json` sits under a
  `pending/` folder (or is named `pending*`) or any `running*` file or `running/` folder exists; idle otherwise. No
  such branch: the interval alone paces.

## What the orchestrator does
- `failed`: drop the culprit (remove its `train-ready` label, close the train PR; the next tick builds a new train
  from the rest), or push a fix to `train/<n>` (the next green tick releases with `--resume`).
- `stale`: chase the laptop queue (the train needs a `laptop-e2e` status).
- `error`: read the log; a dirty train worktree or a merge-train usage change are the usual causes.
- Throttle with `--max-per-day` / `--min-interval` in the task's `-TickArgs`.

## What the laptop queue service provides
- A full `npm run e2e` (Test Runner's train slot) on the head of every open `train/<n>` PR, newest head only.
- A commit status on that sha, context `laptop-e2e`: `pending` when queued or started (description "queued" /
  "12/39"), then `success` or `failure` (or `error` when the run itself broke), description "<passed>/<total>" plus the
  failing suites on a failure. A rerun posts a new status on the same sha; the newest one counts.
- Optional, for pacing: `origin/laptop-queue` with one JSON file per pending request under `pending/` and a `running*`
  marker while a run is going; removed or moved out of `pending/` when done.

## Rules it keeps
- Never forces anything (merge-train's own `build` force-pushes only `train/<n>`), never touches dev or master
  directly (merge-train's `release` merges the PR, tags and moves dev), never removes labels or closes PRs.
- Every gh or git write goes through one `act()` (and merge-train calls through `mergeTrain()`); both only print under
  `--dry-run`.

## Known limits (later polish)
- Assembler bump reuse: auto-train works out minor / patch from the fragments itself (`releaseKind`) instead of reusing
  scripts/changelog-assemble.mjs, so the two rules can drift.
- `gh pr view --json commits` returns at most 250 commits: a train PR with more loses its oldest subjects (members and
  the version commit search work on what is returned).
- Wire candidates of a deleted member branch: `planWire` skips a member whose `origin/<b>` no longer exists, so its
  wire change does not count toward the `PROTOCOL_VERSION` bump.
