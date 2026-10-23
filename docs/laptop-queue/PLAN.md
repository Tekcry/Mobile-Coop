# laptop-queue - plan

One slice (S1, Sonnet build from this spec), one fresh Opus checker, one live overlap on the laptop, one PR.
Decisions: BRIEF A1-A6. Files the build owns (nothing else changes):
- `scripts/laptop-queue/lib.mjs` - pure logic only (no fs, no child_process, no network): every function below marked PURE.
- `scripts/laptop-queue/service.mjs` - the loop (fs, git, gh, child processes).
- `scripts/laptop-queue/request.mjs` - the desktop-side request CLI.
- `scripts/laptop-queue/serve.mjs` - serve dist/ on E2E_PORT, run one node script against it, stop (port of
  `C:/NightShift/scratch/work/serve-run.mjs`, 20 lines, copied in below).
- `scripts/laptop-queue/install-task.ps1` - registers the scheduled task.
- `tests/laptop-queue.test.ts` (or `.test.mjs` if the vitest config picks that up; check `vitest.config.*` include) -
  Vitest for lib.mjs.
- `docs/systems/testing-tools.md` - a new section "Laptop queue" (how to request, statuses, flakes).
- `changes/feature-laptop-queue.md` - fragment, `kind: patch` (tooling only).

## Facts the build relies on (verified 2026-10-23 on master 4f6db420)
- `node scripts/run-e2e.mjs --list` prints the full run's job list (REQUIRED with parts expanded, e.g.
  `e2e-ctcourse:2`), one per line, then exits 0. `node scripts/run-e2e.mjs <suite> <suite:N> ...` runs exactly those
  (named suites expand parts). It prints per suite `=== <s> (ok|FAIL|REPORT ONLY ..., <n>s) ===` followed by the
  suite's log, a `times (...)` block with lines `  <s> ok|FAIL|FAIL (KNOWN FLAKY) <n>s`, `wall <n>s, ...`, and ends with
  `all e2e suites passed` (exit 0) or `<k> suite(s) failed: a, b` (exit 1). A named run never writes
  `scripts/e2e-times.json` (only a no-argument full run with no failure does).
- Env: `E2E_PORT`, `E2E_JOBS`, `E2E_GPU=1`, `E2E_SUITE_TIMEOUT` (s). Needs `npm run build` first (dist/).
- Slot worktrees exist and are detached clones of the same repo: 4189 `C:/NightShift/Mobile-Coop-testrun-4189`,
  4192 `C:/NightShift/Mobile-Coop-testrun-4192` (4191 `C:/NightShift/Mobile-Coop-testrun` is the manual slot; the
  service never uses it). Locks: `C:/NightShift/heavy-<slot>.lock`, created with exclusive create ('wx'), content one
  line "<who> | <label> <sha> | <ISO time>", deleted only while it still holds that line.
- The manual runner `scripts/laptop-runner.ps1` (repo copy is old; the live one is `C:/NightShift/scratch/laptop-runner.ps1`)
  does per run: `git fetch -q origin; git checkout -q -- .; git clean -fdq; git checkout -q --detach <sha>`, then
  `npm ci` only when package-lock.json differs from the last install beyond its `"version"` lines, then the steps.
- `gh` is authenticated on the laptop for Tekcry/Mobile-Coop (`gh api repos/Tekcry/Mobile-Coop/...` works).

## Request format (A1)
Branch `laptop-queue` (orphan; created by request.mjs on first use), files `requests/<id>.json`:
```json
{ "id": "20261023T191500-guard-ai-d7a3b887", "sha": "d7a3b887<full 40 hex>", "branch": "feature/x", "pr": 240,
  "kind": "pr", "suites": ["e2e-guard-carry", "e2e-stealth-ai"], "requester": "Night Shift | Guard AI Build",
  "jobs": 1, "set": "guard-carry", "note": "free text" }
```
- `kind`: `"pr"` (suites, status context `laptop-e2e/<set>`; `set` defaults to the suites joined by `+`, cut to 40
  chars), `"full"` (the full list on one sha, non-train; context `laptop-e2e/full`), `"alone"` (measurement: `steps`
  instead of `suites`: array of shell command strings run in the slot worktree after the build with `E2E_PORT` set; a
  step may start `serve ` meaning `node scripts/laptop-queue/serve.mjs <rest>`; optional `env` object; status context
  `laptop-e2e/alone-<set>`, success = every step exit 0; the logs are the result). Trains are NOT requests (below).
- `sha` must be a full 40-hex sha (request.mjs resolves short shas and branch names with `git rev-parse` after a fetch).
- request.mjs CLI: `node scripts/laptop-queue/request.mjs --sha <ref> [--pr N] [--set name] [--jobs N]
  [--requester "<title>"] (--suites "a b c" | --full | --alone --step "<cmd>" [--step ...] [--env K=V ...]) [--note ".."]`.
  It writes the JSON with git plumbing on top of `origin/laptop-queue` (`git hash-object -w`, `git mktree` / 
  `git read-tree` into a temp index via `GIT_INDEX_FILE`, `git commit-tree`, `git push origin <commit>:refs/heads/laptop-queue`),
  never touching the working tree or HEAD; on a rejected push it fetches and retries up to 5 times. Prints the id.

## The service (service.mjs)
Run: `node scripts/laptop-queue/service.mjs [--once] [--dry-run]` from a dedicated worktree
`C:/NightShift/Mobile-Coop-laptop-queue-svc` (detached at origin/master; the service fast-forwards its own checkout only
when idle and restarts itself; until the PR merges it runs from feature/laptop-queue). State dir
`C:/NightShift/scratch/laptop-queue/` (env `LQ_STATE` overrides): `service.pid` (single-instance lock: exit 0 at once
when it names a live node process), `state.json` ({done: {id: {...result}}, trains: {sha: result}, flakes: [...]}),
`times.json` (suite -> seconds, refreshed from every parsed run), `log.txt` (one line per event), `runs/<id>/` (logs).

Loop every 30 s (`--once`: one pass, then exit after its runs finish):
1. `git fetch -q origin` in the service checkout; list `origin/laptop-queue:requests/*.json` (`git ls-tree`, `git show`);
   skip ids in state.done or bad JSON (logged once).
2. Trains: `git ls-remote origin "refs/heads/train/*"`; for each head sha with no `laptop-e2e` status
   (`gh api repos/Tekcry/Mobile-Coop/commits/<sha>/statuses --jq ...`) and not in state.trains: a pending train.
3. PICK (PURE `pick(queue, now, slots)`): a pending train wins and needs BOTH slots idle: while one is busy the free one
   takes NO new work (preemption, BRIEF goal 3). Else an `alone` request waiting > 45 min (A5), needing both slots
   idle. Else the oldest `pr` / `full` request, on any free slot. Else an `alone` request, both slots idle. Order
   within a class: by id (ids start with a sortable UTC time).
4. A train: post `pending` `laptop-e2e` ("sharded 4189+4192"), build the sha in both slot worktrees in parallel,
   SHARD (PURE `shard(list, times, 2)`: longest first into the lighter bin; unknown suites weigh the median) the
   `run-e2e.mjs --list` output, run each bin with `run-e2e.mjs <bin...>` at `E2E_JOBS=3` (A4; env `LQ_TRAIN_JOBS`),
   `E2E_GPU=1`, `E2E_PORT=<slot>`, `E2E_SUITE_TIMEOUT=900`, at once. Merge both results (PURE `parseRun(text)` ->
   {suites: [{s, ok, flaky, sec}], wall, passed}).
5. Flakes (BRIEF goal 7): every failed non-KNOWN-FLAKY suite reruns ONCE alone (`E2E_JOBS=1`) on the same sha and slot;
   pass -> counted as pass, recorded in state.flakes {suite, sha, ref, date} and in the status description
   ("flake: e2e-x"); a suite already in state.flakes for any sha within 24 h is not rerun again (fails stand).
6. Result: commit status on the sha: `success` / `failure`, description PURE `describe(result)` =
   `"<pass>/<n> pass, <wall> s"` + `"; flake: a,b"` + `"; FAIL: a,b"`, cut to 140 chars; `target_url` none.
   On failure: a comment on the PR (train: `gh pr list --head train/<n> --json number`; pr requests: `pr` field;
   none -> skip) with, per failed suite, the failing assert (first line matching /not ok|Error:|timed out|FAIL/ in its
   section), the log path on the laptop and the LAST 40 lines of its log section (Michael ~19:25; PURE `suiteSection` +
   `failureExcerpt(section)` -> {assert, tail40}). Then state.done / state.trains updated, times.json merged.
7. pr / full requests run on one slot (`full` = the list, `E2E_JOBS` = request.jobs or 3; `pr` = suites, jobs or 2).
   Same status / comment / flake rules with their context.
8. Each run: take the slot lock (wait while held by someone else - manual runs keep working), `git fetch`, clean,
   detach at sha (abort -> `error` status "sha not found"), npm ci rule (PURE `lockChanged(oldText, newText)` ignoring
   lines matching /"version":/), `npm run build` (fail -> `failure` "build failed"), the run, release the lock, free
   the port (kill a listener left on it).
9. Never more than one train at a time; trains never overlap a manual full run on 4189 (the lock does that).
10. All child processes `windowsHide: true`; no console windows; the service never runs `npm run dev` / preview.

## The task (install-task.ps1)
`schtasks /create /f /sc minute /mo 5 /tn NightShift-laptop-queue /tr "powershell -NoProfile -ExecutionPolicy Bypass
-WindowStyle Hidden -Command cd C:\NightShift\Mobile-Coop-laptop-queue-svc; node scripts/laptop-queue/service.mjs"`
(the pid lock makes the 5-min starts no-ops while it runs). `-Remove` deletes it. Does not need admin.

## Tests (lib.mjs, Vitest)
pick (train preempts and waits for both slots; aged alone beats pr; fresh alone waits; pr oldest first), shard (two
bins within one longest suite of each other; unknown suites at the median; deterministic), parseRun (ok / FAIL / KNOWN
FLAKY / REPORT ONLY lines, wall, the failure summary line), describe (format, 140 cap), lockChanged (version-only diff
= false, a dependency change = true), context name (`laptop-e2e/<set>` sanitising to [a-z0-9+._-], 40 chars).

## Checks for the build
`npx tsc --noEmit -p .` (if the test is .ts), `npx eslint scripts/laptop-queue tests/laptop-queue.*`,
`npx vitest run tests/laptop-queue`, `node scripts/laptop-queue/service.mjs --once --dry-run` (dry run: lists what it
would pick and the shard bins, posts nothing, runs nothing). Never a full `npm run check`, never an e2e run.

## Supersede and newest first (2026-10-23)
`superseded(requests, isAncestor)` (lib.mjs): an open pr / full request is dead when the same requester has a newer
request of the same kind with the same non-empty `set`, or with the same or a descendant sha whose suites cover all of
the older one's (`:part` suffix ignored; full always covers). Two different non-empty sets never supersede (a flag
off / on pair), nor does a request with no requester (or "unknown"). `alone` is never superseded. Each pass, before `pick`, both workers
mark such requests done in one batched claims push (state `superseded`, no run, no status); `isAncestor` is
`git merge-base --is-ancestor`, memoized per pass, any error = false. A lost push retries next pass; open claims never
reach the list. The desktop does it too, once the branch has claims. `pick` still puts trains, aged alone, non-alone,
alone in that order, but among non-alone requests it takes the requester with the oldest open request and runs that
requester's NEWEST one.

## Desktop overflow lane (LQ_WORKER=desktop)
pr requests only, no trains, no alone, `E2E_GPU=1 E2E_JOBS=1`. Two slots, each gated on its own at the start of a pass:
4191 (`heavy.lock`) needs backlog > 3 and CPU < 60 %; 4192 (`heavy2.lock`, dir `Mobile-Coop-testrun-4192`, must exist)
needs backlog > 3 and CPU < 50 % (CLAUDE.md heavy2 rule). A gated slot waits with a logged reason (`desktopSlotGate`).
At most one desktop start per pass (30 s), so CPU is re-read before the second slot starts.

## After the build (job lead)
Fresh Opus checker; then live overlap: run one pr request and the next train through the service beside the manual
queue; measure the sharded train wall vs one slot JOBS=5 (316 s / 559 s at 3 recorded); then PR, message the
orchestrator (train-ready), and tell the leads the request command.
