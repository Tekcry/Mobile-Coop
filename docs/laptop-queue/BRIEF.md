# laptop-queue - brief

**Ask** (orchestrator 2026-10-23 ~19:10, Michael approved, ROADMAP Decided "Pipeline speed-ups"; audit
`docs/orchestrator/BOTTLENECKS.md` row 2 and row 4): a script service on the laptop replaces the hand-written chain
scripts and the verdicts sent by message. The audit measured ~127 min/day lost to pickup, relay and void chains (43
chain scripts on 10-23, 5+ void) and 20-30 min/day of trains slowed by the second slot (616-908 s vs 408-514 s).

**Goal**
1. Requests are JSON files on the `laptop-queue` branch: {sha, branch, pr, suites | "full", kind, requester}.
   Order: trains, then PR suites, then alone-measurements. Alone-measurements (perf, guard-cap) run right after each
   release and in idle gaps, and are never starved.
2. Runner: one Windows scheduled task (headless, Normal priority, survives swaps and bridge drops), one detached
   worktree per slot, `E2E_GPU=1`, `npm ci` only when `package-lock.json` changed beyond its version lines.
3. Trains preempt: an `origin/train/<n>` head with no `laptop-e2e` status stops new work on both slots, then runs alone.
4. The train's full run is SHARDED across 4189 + 4192 by suite weights (times refreshed from real runs); the gain
   against one slot at JOBS=5 is measured.
5. Results are GitHub commit statuses on the tested sha: `laptop-e2e` for train full runs (the orchestrator's
   auto-train releases on CI `check` + `laptop-e2e` success), `laptop-e2e/<set>` for other runs; description
   "N/N pass, <s> s". A failure adds a PR comment (suite, failing assert, log path). No message per verdict.
6. Suite choice: `run-e2e.mjs --affected origin/master --list` (feature/e2e-affected) when it lands; until then the
   request lists its suites.
7. Flakes: one solo rerun on the same sha; a pass there = flake, logged for its owner, not rerun again.

**Limits**: headless (no window, no focus); never `E2E_HEADED`; one heavy run per slot (the existing
`C:/NightShift/heavy-<slot>.lock` files, so manual runs and the service never collide); laptop CPU under ~80% with
Guard AI Build on the same machine; posting statuses and comments only on Tekcry/Mobile-Coop.

**Assumed decisions** (undo: change and say so in STATE)
- A1: the queue is a branch `laptop-queue` with `requests/<id>.json` (no PR, never merged), pushed with git plumbing
  by `scripts/laptop-queue/request.mjs` (no checkout, retry on a rejected push). Chosen over a gh-polled source: works
  for branches with no PR and for measurements, and the desktop sessions already push.
- A2: the service is Node (`scripts/laptop-queue/service.mjs`), not PowerShell, so the pure parts have Vitest tests.
  `scripts/laptop-runner.ps1` stays for manual runs during the overlap.
- A3: the service's state (claimed / done ids, times, flakes) lives in `C:/NightShift/scratch/laptop-queue/`, not in
  git; GitHub statuses are the shared record.
- A4: shard = 2 bins by longest-first greedy on the weights; each slot runs its bin at `E2E_JOBS=3` (6 browsers
  total; tuned after the measurement).
- A5: alone-measurements get both slots; one waiting over 45 min goes ahead of PR suites (never ahead of a train).
- A6: the scheduled task starts every 5 min and exits at once when a live service holds the pid lock.
