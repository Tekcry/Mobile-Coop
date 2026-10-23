# laptop-queue - state

## Now (2026-10-24, laptop-queue batch, local commits, not pushed)
- 2026-10-24 (Michael 07:13 "All three", after 87 old hand-made `NightShift-chain-*` one-shots fired again at 2026-10-23
  23:59 and held heavy-4189 / heavy-4192 for hours): hand-made chains are RETIRED; runs go through the queue
  (`request.mjs`). Permanent tasks: `NightShift-laptop-queue` (`install-task.ps1`), `NightShift-desktop-queue`
  (`install-task.ps1 -Worker desktop`), `NightShift auto-train` (`scripts/auto-train-task.ps1`, master). The only way to
  schedule an ad-hoc run: `scripts/laptop-queue/one-shot-task.ps1 -Name NightShift-run-<what> -Command "..."` (expires
  after `-ExpireMinutes` 240, then Windows deletes it; `-WhatIf` prints only).
  Task guard in `service.mjs` (both workers): at start and every `LQ_TASK_GUARD_MIN` (10) min, disables stale tasks
  (lib `staleTasks`: enabled `NightShift-*` not allowlisted, or any enabled task whose action mentions
  `C:\NightShift\scratch` / `laptop-runner.ps1`; allowlist + `LQ_TASK_ALLOW`), never stops / kills / deletes, and pushes
  `alerts/<ts>-tasks.json` to the `laptop-queue` branch. Dry run 07:19: the 87 chain tasks were already gone; it would
  disable 18 enabled tasks, 17 `ns-chain-1022*` + `ns-cpu-burner` (scratch actions), at the next service start.
- `pendingTrains()` skips a train head with an `auto-train/*` status in failure / error (lib `trainBuildFailed`),
  logged once per head (train 37 held both slots 18 min after vitest had failed).
- Trains are claimed (`claims/<train-sha>.json`) by both workers; the desktop takes a train head when the laptop has
  pushed no claim / done for `LQ_LAPTOP_SILENT_MIN` (10) min, the laptop service claims trains itself and the head is
  over 2 min old (lib `workerActivity`, `desktopTrainGate`); sharded on 4191+4192, E2E_JOBS 1, lock / dir / CPU gates kept.
  Rollout: the laptop service must run this code first (until it pushes a "claim train", the desktop takes no trains).
- `takeLock` logs a manual-lock wait once per holder and the wait length when it takes the lock.
- Not done here: auto-train "laptop missing" flag; `scripts/auto-train.mjs` is on master only (merge not allowed in this batch).

## Earlier (2026-10-23 ~22:05, Test Runner)
- Laptop service restarted on e1398df4 at ~21:57 (Michael approved; Stop-ScheduledTask leaves the node child alive,
  so a restart needs the node pid killed too). "done claim(s) pushed: 11": desktop lane unblocked.
- Open-PR train gate (Orchestrator ~22:00): `pendingTrains()` (scripts/laptop-queue/service.mjs ~201) runs only a
  train/<n> head that is the head of an OPEN train PR and is the version commit (subject check, checker FIX
  1c1f8451); a failed PR list skips trains that pass. Fixes the rerun of
  closed train 35 aeadaec1 and the double run of a pre-version head (ce40dc06 then aeadaec1). Pushed after #252 entered
  train 36, so it rides the next train (PR #252 head moves past the train 36 member sha).

## Earlier (2026-10-23 ~21:00, PR #252 + desktop worker)
Desktop overflow lane (Michael ~20:45 via Orchestrator): `LQ_WORKER=desktop` (a49cee57, fix round a1fc57ac + 6a658738
after an Opus checker FIX: done sync every pass, claim refresh at lock / drop when taken over, release on give-up, desktop
waits for claims and heavy.lock, 140-char status), 032b8969 self-update before a pass. Claims `claims/<id>.json` on
the laptop-queue branch. Start commands sent to the Orchestrator (~20:58): svc worktree + testrun-4191 worktree +
`install-task.ps1 -Worker desktop -Follow origin/feature/laptop-queue`. Open: the live laptop service (old code)
updates only when idle; until then the desktop waits ("no claims yet"). Check the laptop log for "done claim(s) pushed".

## Earlier (2026-10-23 ~20:10, LIVE OVERLAP DONE -> PR)
First sharded train through the service: train 32 25c712c9, 43/43 PASS, status `laptop-e2e` success posted by the
service. Shards 4189 / 4192 at JOBS=3 each (bins 22 / 21 suites, weight 1391 s each): wall 564 s / 560 s, vs 666 s
for train 31 on one slot at JOBS=3 (~15% faster). Total 873 s incl. a 309 s alone rerun of the flake e2e-ctcourse:4
("timed out waiting for A8: N2 is at the grille stop (route index 2)", passed alone 300 s; owner fixes the test).
Requests worked end to end (status, flake rerun, done record, lock waits behind manual chain locks). Next: PR
(train-ready) + tell the leads the request command (below). Open idea, not in this PR: compare sharded 3+3 against
one slot at JOBS=5 on the same train.

## Earlier (2026-10-23 ~19:30, LIVE OVERLAP)
Fix round face1711 (Opus): shard completeness gate, stale own `pending` re-picked, own stale locks cleared, task via
Register-ScheduledTask (no time limit, battery ok, Normal). 20/20 vitest. LIVE since ~19:19: task
NightShift-laptop-queue (every 5 min, LQ_FOLLOW=origin/feature/laptop-queue) runs service.mjs from the svc worktree
C:/NightShift/Mobile-Coop-laptop-queue-svc (detached face1711); state / log C:/NightShift/scratch/laptop-queue/.
Requests pushed so far (origin/laptop-queue): Guard AI d82f9b6f ctcourse:2+:4 (running 4189), Marlow 91b587f2 train32-entry
(#237), Marlow 1bde5328 ctcourse:2 flake rerun. Next: watch their statuses / comments; the next train/<n> goes through
the service sharded (measure wall vs 666 s at JOBS=3 one slot); then PR (train-ready) + tell the leads:
`node scripts/laptop-queue/request.mjs --sha <ref> --suites "a b" [--pr N] [--set name] --requester "<title>"`.

## Earlier (2026-10-23 ~19:55 draft)
S1 built (Sonnet) ad0196cc: lib / service / request / serve / install-task, 16 vitest, tsc clean, dry runs ok (train 31
bins 895 / 894 s). Follow-up in progress: failure comments carry assert + log path + last ~40 lines (Michael ~19:25).
Builder deviations to check: old train heads skipped (ancestor of master or > 24 h, LQ_TRAIN_MAX_AGE_H); weights seeded
from scripts/e2e-times.json; aged alone blocks new pr work until both slots idle; "known flaky" in the description;
self-update via LQ_FOLLOW (set origin/feature/laptop-queue until merged); crash mid-train after `pending` is not
re-run (needs a fix: treat a stale own `pending` as not done); eslint ignores scripts/**/*.mjs (config).
Worktree node_modules is a junction to Mobile-Coop-testrun-4189/node_modules (gitignored).

## Next
1. S1 build lands (lib / service / request / serve / install-task, tests, testing-tools section, fragment).
2. Fresh Opus checker on S1 (one fix round at most).
3. Live overlap: svc worktree C:/NightShift/Mobile-Coop-laptop-queue-svc, one pr request + the next train through the
   service beside the manual chains; sharded train wall vs one slot (JOBS=5 316 s, JOBS=3 559 s).
4. PR (train-ready), message the orchestrator, tell the leads the request command.

## Open
- feature/e2e-affected (`run-e2e.mjs --affected origin/master --list`) not on master yet: requests list suites.

## Done
- 2026-10-23: supersede (`superseded()` in lib.mjs, applied each pass in service.mjs before pick, one batched done push) and newest-first per requester in `pick`; vitest cases added.
- 2026-10-23 ~19:15: job started (orchestrator, Michael approved ~19:10).
- 2026-10-23: desktop lane has a second slot 4192 (heavy2.lock, CPU < 50 %, dir must exist), per-slot gate `desktopSlotGate`, one desktop start per pass; vitest cases added.

## Resume prompt
```
Night Shift | Test Runner, laptop-queue job: read docs/laptop-queue/BRIEF.md, PLAN.md and this STATE on
origin/feature/laptop-queue (worktree C:/NightShift/Mobile-Coop-laptop-queue). Do "Next" in order. The manual queue
(docs/flake-fix/STATE.md newest SAVE) keeps priority until the service is live.
```
