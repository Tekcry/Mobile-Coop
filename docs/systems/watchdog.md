# Watchdog (deterministic alerts and opt-in fixes)
Code, not the orchestrator, watches the pipeline (process audit 2026-10-24 findings 8, 9, 12, 13; Michael approved
~21:50, "Watchdog + release path"). The orchestrator's cron reads only `C:/NightShift/scratch/watch-status.json`.
Script `scripts/watchdog.mjs` (pure helpers tested in `tests/watchdog.test.ts`; patterns from `scripts/auto-train.mjs`).

## Running it
- `node scripts/watchdog.mjs tick [--dry-run] [--fix <list>] [--checks <list>] [--require-affected | --no-require-affected] [--self-update | --no-self-update]`.
- Alerts only by default. `--fix` (comma list of `locks, orphans, prs, labels, release, cloud`) turns on those checks'
  fixes only, one at a time. `--checks` limits the checks run (default all nine).
- `--dry-run`: nothing is pushed, labelled, commented, killed, broken or self-updated; fixes print `[dry-run] would ...`.
  It still runs `git fetch origin`. Own status / log / lock (`*.dryrun.*`); the state file is read, never written.
- Install (Windows PowerShell on the desktop, once the watchdog is on master and `C:/NightShift/Mobile-Coop` is pulled):
  `powershell -NoProfile -ExecutionPolicy Bypass -File C:\NightShift\Mobile-Coop\scripts\watchdog-task.ps1`. It creates
  the dedicated checkout `C:/NightShift/Mobile-Coop-watchdog-live` (detached origin/master, no agent works there) when
  missing and registers "NightShift watchdog" every 2 min from it (hidden, current user, while logged on, IgnoreNew,
  20-min limit). Re-run with `-Fix "locks"`, then `-Fix "locks,labels"` etc. to enable fixes; `-Minutes`, `-Unregister`.
- Self-update: at each tick start in the live checkout (or `--self-update`), when clean and no fix is mid-way (the
  `action` marker in the state, ignored after 15 min), it moves to a detached origin/master; new code runs next tick.
- Files (`WATCHDOG_SCRATCH` moves them): `watch-status.json`, `watch-state.json` (first-seen times, label heads, Pages
  cache, the mid-action marker), `runs/watchdog.log`, `runs/watchdog-task.out`, `watchdog.lock` (touch lock, 10 min).
  Optional `watch-owners.json`: `{ "<branch or prefix>": "<session title>" }` overrides owner names.
- Env: `WATCHDOG_REPO`, `WATCHDOG_LOCKS` (default heavy.lock, heavy2.lock), `WATCHDOG_PAGES_URL`,
  `WATCHDOG_AUTOTRAIN_STATUS`, `WATCHDOG_AUTOTRAIN_DIR` (else from `scratch/auto-train-task.vbs`),
  `WATCHDOG_LQ_DESKTOP_DIR`, `WATCHDOG_LIVE_DIR`, `WATCHDOG_REQUIRE_AFFECTED=0` (opt out of the affected-e2e rule).
- Exit 0 (also when the lock is held), 1 on a usage error or crash. A check that throws becomes a `check-error` alert.

## Status file
`{ "time", "fix": ["locks"], "alerts": [{ "id": "<kind>:<subject>", "severity", "kind", "subject", "detail", "since",
"action" }], "held": [{ "id", "severity", "detail", "since", "graceMin" }], "checks": { "pages": "error: ..." }, "ms" }`
- `severity`: high (act now), warn (act this run), info. `since` carries across ticks by id. `held`: still in grace.
- `action`: `alert only (...)`, `alert only (--fix <check> would: ...)`, `fixed: ...`, `skipped: ...` (its target
  changed since it was read), `fix failed: ...`, or `[dry-run] would ...`.

## Checks
| Check | Alert (kind, severity) | Fix (`--fix`) |
| --- | --- | --- |
| locks | `lock-dead-pid` high: a heavy lock names a pid not running on this host; `lock-stale` warn: no pid, 60+ min, no node process; `lock-old` info (live pid) / warn (no pid), 240+ min | `locks`: break a dead-pid lock of a known writer (heavy-lock.mjs, the laptop-queue service, a touch lock): re-read, rename aside, verify, delete. Pid-less locks never |
| orphans | `orphan` warn: a node e2e runner (`run-e2e.mjs`, `e2e-*.mjs`, its `vite preview`) whose parent is gone or reused, 30+ min; `orphan` info: tail.exe / grep.exe (MSYS tools read a dead parent for life: never killed) | `orphans`: `taskkill /PID <pid> /T /F` only for a Night Shift e2e runner 120+ min old that no heavy lock names, same start time and command line |
| prs | `pr-conflict` high: a `train-ready` PR is CONFLICTING (owner named); `pr-label-red` warn: CI `check`, `checker` or `affected-e2e` red on the current head; `pr-commit-after-label` warn: the head moved from the labelled head (first seen labelled, else the newest commit pushed at or before the label event, else by commit time), not docs-only, and no `checker` success on the new head | `prs`: remove `train-ready` and comment once per head (`<!-- watchdog:unlabel:<sha> -->`). Conflicts stay alert only |
| labels | `pr-label-ready`: an unlabelled PR meets the label convention; warn after `check` has been green 30 min, info at once with the fix on; `pr-affected-unavailable` warn: ready but no `affected-e2e` status; `pr-affected-waived` info: the `no-affected-e2e` label is on; `pr-label-no-affected` info: a `train-ready` head without `affected-e2e` (when required) | `labels`: add `train-ready` (head re-read before and after; removed again if it moved), record that head as the labelled head, comment once per head |
| release | `release-dev-lag` warn (5-min grace); `release-dev-diverged` high; `release-tag-missing` warn (5 min): no `v<master version>`; `release-member-open` warn (10 min): an open non-train PR whose head is in master (alert only: close it by hand) | `release`: fast-forward `dev` to master (refs re-read); push the tag at the oldest first-parent commit carrying master's version (the train merge). Never closes a PR |
| pages | `pages-behind` high: `/preview/` serves another version 15+ min after the release commit; `pages-unreadable` warn (15 min) | none |
| autotrain | `autotrain-stale` high (status 10+ min old or missing), `autotrain-failed` high, `autotrain-error` warn (5-min grace), `autotrain-<rerun-stale / rerun-request-failed / stale / laptop-missing>` warn, `autotrain-behind` warn (60 min): its checkout is not origin/master | none |
| laptop | `lq-claim-stuck` high: an open claim 90+ min; `lq-claim-silent` warn: no sign of life 15+ min; `lq-request-old` warn: unclaimed 60+ min; `lq-request-stale` warn: its branch moved past the sha in non-doc / non-test files (`pin` exempt) | none |
| cloud | `cloud-claim-stale` warn: a brief claimed 90+ min ago whose "New branch:" has no commit since | `cloud`: line 1 back to `status: open` with a dated note, one contents-API commit on `cloud-queue` (status line re-read) |

Claim sign of life: the newest of the claim's `at`, its `beat`, the worker's newest `laptop-queue` push and (desktop)
its service log / run files. Owners: `watch-owners.json`, else the newest laptop-queue request naming the branch or PR
(not auto `affected-e2e` ones), else a cloud brief's `Lead:`, else `job <branch>`. Pages version: the
`v<version> PREVIEW · <sha>` menu label in the bundle of `/preview/index.html`'s module script.

## The label convention (checker verdict status)
With `--fix labels`, a PR gets `train-ready` only when all hold on its current head (the rollup is read from the head
commit itself, `headRef.target`, and counts only while that is `headRefOid`):
- CI `check` success;
- commit status `checker` = success, posted by the lead's fresh checker on PASS:
  `gh api repos/{owner}/{repo}/statuses/<sha> -f state=success -f context=checker -f description="<who> PASS"`
  (a FIX verdict may post `state=failure`);
- `affected-e2e` = success. Required by default: without it the PR is not labelled (`pr-affected-unavailable`; until
  #356 posts it on every head). Opt out with `--no-require-affected` / `WATCHDOG_REQUIRE_AFFECTED=0`, or per PR with the
  `no-affected-e2e` label (the label reason and comment then say "affected-e2e waived", plus a `pr-affected-waived` alert);
- not a draft, not CONFLICTING, not a `train/<n>` head.
With `--fix prs` the label comes off when a required check turns red on the head, or when commits land after it that
touch more than docs, `*.md`, `changes/` fragments or CHANGELOG and the new head has no `checker` success.

## Rules it keeps
Never forces, merges, closes PRs, deletes branches or touches master; kills only Night Shift command lines by pid,
breaks only dead-pid locks of known writers, labels only on a checker verdict status. Every fix re-reads its target
first, is idempotent, and goes through `runFix`, which only prints under `--dry-run`.
