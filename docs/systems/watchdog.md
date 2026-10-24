# Watchdog (deterministic alerts and opt-in fixes)
Purpose: code, not the orchestrator, watches the pipeline. Process audit 2026-10-24 findings 8 (the orchestrator is a
single point of failure doing code's job), 9 (release path gaps), 12 (wasted laptop runs) and 13 (script wrappers
instead of broad permissions); Michael approved ~21:50 ("Watchdog + release path"). The orchestrator's cron reads only
`C:/NightShift/scratch/watch-status.json`.

Script: `scripts/watchdog.mjs` (pure helpers tested in `tests/watchdog.test.ts`; gh / git / fs / process I/O at the
edges). Patterns copied from `scripts/auto-train.mjs` (tick, status, touch lock, self-update).

## Running it
- `node scripts/watchdog.mjs tick [--dry-run] [--fix <list>] [--checks <list>] [--require-affected | --no-require-affected] [--self-update | --no-self-update]`.
- Alerts only by default. `--fix` takes a comma list of `locks, orphans, prs, labels, release, cloud` and turns on the
  fixes of those checks only, so the orchestrator can enable them one at a time. `pages`, `autotrain` and `laptop` have
  no fixes. `--checks` limits the checks run (default all nine).
- `--dry-run`: nothing is pushed, labelled, commented, closed, killed, broken or self-updated; each fix that would run is
  printed `[dry-run] would ...`. It still runs `git fetch origin` (local refs only). Status / log / lock:
  `watch-status.dryrun.json`, `runs/watchdog.dryrun.log`, `watchdog.dryrun.lock`; the state file is read, never written.
- Scheduled task: `scripts/watchdog-task.ps1` registers "NightShift watchdog" every 2 min (hidden through wscript,
  current user, only while logged on, `MultipleInstances IgnoreNew`, 20-min limit), from the dedicated checkout
  `C:/NightShift/Mobile-Coop-watchdog-live` (a detached worktree of origin/master, created by the installer when
  missing; no agent ever works there). `-Fix "locks,labels"` adds fixes, `-Minutes` changes the period, `-Unregister`
  removes it. Install (Windows PowerShell on the desktop, once the watchdog is on master):
  `git -C C:/NightShift/Mobile-Coop fetch -q origin; git -C C:/NightShift/Mobile-Coop worktree add --detach C:/NightShift/Mobile-Coop-watchdog-live origin/master; powershell -NoProfile -ExecutionPolicy Bypass -File C:\NightShift\Mobile-Coop-watchdog-live\scripts\watchdog-task.ps1`
  (re-run the last part with `-Fix "locks"` etc. to enable fixes one at a time).
- Self-update: at the start of each tick, when the script runs from the live checkout (or `--self-update`), the
  checkout is clean and no fix is mid-way (the `action` marker in the state, ignored after 15 min), it fetches and moves
  to a detached origin/master (`selfUpdatePlan`). The new code takes effect next tick.
- Files (`WATCHDOG_SCRATCH` moves them): status `watch-status.json`, state `watch-state.json` (alert first-seen times,
  shown ids, label heads, the Pages cache, the mid-action marker), log `runs/watchdog.log` (new / cleared alerts, fixes,
  one summary line per tick), task output `runs/watchdog-task.out`, lock `watchdog.lock` (touch lock, stale after
  10 min). Optional `watch-owners.json`: `{ "<branch or prefix>": "<session title>" }` overrides owner names.
- Env: `WATCHDOG_REPO` (Tekcry/Mobile-Coop), `WATCHDOG_LOCKS` (comma list, default heavy.lock, heavy2.lock),
  `WATCHDOG_PAGES_URL`, `WATCHDOG_AUTOTRAIN_STATUS`, `WATCHDOG_AUTOTRAIN_DIR` (else read from
  `scratch/auto-train-task.vbs`), `WATCHDOG_LQ_DESKTOP_DIR`, `WATCHDOG_LIVE_DIR`, `WATCHDOG_REQUIRE_AFFECTED` (`1` / `0`:
  overrides the affected-e2e default, below).
- Exit 0 (also when another tick holds the lock), 1 on a usage error or a crash outside the checks. A check that
  throws becomes a `check-error` alert; the other checks still run.

## Status file
```json
{ "time": "<iso>", "fix": ["locks"], "alerts": [{ "id": "pr-conflict:#317 feature/coop4", "severity": "high",
  "kind": "pr-conflict", "subject": "#317 feature/coop4", "detail": "...", "since": "<first seen iso>",
  "action": "alert only (tell ...)" }], "held": [{ "id", "severity", "detail", "since", "graceMin" }],
  "checks": { "locks": "ok", "pages": "error: ..." }, "ms": 21000 }
```
- `severity`: high (act now), warn (act this run), info. `since` is carried across ticks by id (`kind:subject`); a
  cleared alert starts over. `held`: alerts still inside their grace (shown once it passes).
- `action`: `alert only (...)`, `alert only (--fix <check> would: ...)`, `fix: ...`, `fixed: ...`, `skipped: ...`
  (what it acts on changed since it was read), `fix failed: ...`, or `[dry-run] would ...`.

## Checks
| Check | Alert (kind, severity) | Fix (`--fix`) |
| --- | --- | --- |
| locks | `lock-dead-pid` high: heavy.lock / heavy2.lock names a pid not running on this host; `lock-stale` warn: no pid, 60+ min old, no node process at all; `lock-old` info: live pid, 240+ min; `lock-old` warn: no pid, 240+ min by file time (alert only) | `locks`: break a dead-pid lock only when a known writer wrote it (heavy-lock.mjs, the laptop-queue service, a touch lock); re-read, rename aside, verify, delete (the heavy-lock break pattern). A pid-less lock is never broken |
| orphans | `orphan` warn: a node e2e runner (`scripts/run-e2e.mjs`, `scripts/e2e-*.mjs`, the runner's `vite preview`) whose parent pid is gone or reused, 30+ min old; `orphan` info: tail.exe / grep.exe the same (MSYS tools in a Git Bash pipeline show a dead parent for their whole life, so a live `tail -f` looks orphaned: never killed) | `orphans`: `taskkill /PID <pid> /T /F` only for a node e2e runner 120+ min old whose command line matches Night Shift (`NightShift`, `Mobile-Coop`, its scripts, `vite preview --port 41xx`), whose pid and parent pid no heavy lock names, and that still has the same start time and command line |
| prs | `pr-conflict` high: a `train-ready` PR is CONFLICTING (owner named); `pr-commit-after-label` warn: the head moved from the labelled head (first seen labelled, else the newest commit pushed at or before the label event: push time = its earliest check suite, else a newer commit's, else its commit time; else by commit time), the commits since touch more than docs / `*.md` / fragments, and no `checker` success on the new head | `prs`: remove `train-ready` and comment once per head (`<!-- watchdog:unlabel:<sha> -->`). Conflicts stay alert only |
| labels | `pr-label-ready`: an unlabelled PR meets the label convention (below); warn after `check` has been green 30 min, info at once when the fix is on | `labels`: add `train-ready` (head and label re-read first; the head re-read after labelling, and the label removed again if it moved), record that head as the labelled head, and comment once per head |
| release | `release-dev-lag` warn (5-min grace): dev behind master; `release-dev-diverged` high: dev not an ancestor; `release-tag-missing` warn (5 min): no `v<master version>` tag; `release-member-open` warn (10 min): an open non-train PR whose head is in master | `release`: `git push origin <master>:refs/heads/dev` (fast-forward only, refs re-read), `git push origin <release commit>:refs/tags/v<version>` (the oldest first-parent commit carrying master's version: the train merge), `gh pr close <n>` with a comment (re-checked open, same head, in master) |
| pages | `pages-behind` high: `/preview/` serves another version 15+ min after master's release commit; `pages-unreadable` warn (15 min) | none |
| autotrain | `autotrain-stale` high (status 10+ min old or missing), `autotrain-failed` high, `autotrain-error` warn (5-min grace: transient gh timeouts), `autotrain-<rerun-stale / rerun-request-failed / stale / laptop-missing>` warn, `autotrain-behind` warn (60-min grace): its checkout (from `auto-train-task.vbs`) is not origin/master | none |
| laptop | `lq-claim-stuck` high: an open claim 90+ min old; `lq-claim-silent` warn: no sign of life for 15+ min; `lq-request-old` warn: unclaimed 60+ min; `lq-request-stale` warn: its branch (or PR head) moved past the sha in non-doc / non-test files (queue-audit rule; `pin` exempt) | none (the queue's owner withdraws) |
| cloud | `cloud-claim-stale` warn: a brief `status: claimed ...` 90+ min ago whose "New branch:" has no commit since the claim | `cloud`: rewrite line 1 to `status: open` with a dated note, one commit on `cloud-queue` through the contents API (the status line re-read first) |

- Claim sign of life: the newest of the claim's `at`, a `beat` field when the laptop-queue service writes one (not
  yet: a per-claim heartbeat would make this exact), the worker's newest push on `laptop-queue` (`... (laptop)` /
  `(desktop)` subjects) and, for the desktop worker, its service log / run files' mtimes. A long laptop run with no other
  push can show `lq-claim-silent` before it finishes.
- Owners (conflict and label alerts): `watch-owners.json`, else the newest laptop-queue request naming the branch or PR
  (its requester; the service's auto `affected-e2e` requests are skipped), else a cloud brief's `Lead:` for its "New branch:", else `job <branch>`.
- Pages version: the main menu label baked into the preview bundle (`v<version> PREVIEW · <sha>`,
  `src/ui/screens/mainMenu.ts` from `__APP_VERSION__` / `__BUILD_SHA__` in `vite.config.ts`), read from the module
  script of `/preview/index.html` (cache-busted); the bundle is fetched again only when the script name changes.

## The label convention (checker verdict status)
A PR gets `train-ready` from the watchdog (with `--fix labels`) only when all hold on its current head (checks and
statuses are read from `headRefOid` only: a lagging commit list counts as `check` missing):
- CI `check` success;
- a commit status `checker` = success. The lead's fresh checker posts it on PASS:
  `gh api repos/{owner}/{repo}/statuses/<sha> -f state=success -f context=checker -f description="<who> PASS"`
  (a FIX verdict may post `-f state=failure ... description="<who> FIX: <one line>"`);
- `affected-e2e` = success when present; required (missing blocks) by default once the laptop service posts it on every
  PR head (PR #356, detected from `scripts/laptop-queue/lib.mjs` in the watchdog's checkout), except on PRs labelled
  `no-affected-e2e`; `--require-affected` / `--no-require-affected` or `WATCHDOG_REQUIRE_AFFECTED=1` / `0` override;
- not a draft, not CONFLICTING, not a `train/<n>` head.
A commit after the label removes the label (with `--fix prs`) unless the new head also has `checker` success or the
commits since the labelled head touch only docs, `*.md`, `changes/` fragments or CHANGELOG.

## Rules it keeps
- Never forces, never merges, never deletes a branch, never touches master; it closes only PRs whose head is in master,
  kills only Night Shift command lines by pid, breaks only dead-pid locks of known writers, labels only on a checker
  verdict status. Every fix re-reads its target right before acting and is idempotent (repeat ticks do nothing more).
- Every write goes through `runFix`, which only prints under `--dry-run`.
