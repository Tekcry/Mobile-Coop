# laptop-queue - state

## Now (2026-10-24, laptop-queue batch, local commits, not pushed)
- 2026-10-25 ~04:40: laptop-queue-4 (feature/laptop-queue-4, worktree C:/NightShift/Mobile-Coop-laptop-queue-4, stacked on
  feature/laptop-queue-3 = PR #366 head f3eaceed; PR #374), Orchestrator waste audit (gap 00:20-04:10), three fixes:
  - request.mjs fills `branch` and `pr` by default (171 open requests had branch ""): lib `pickBranch` (lib.mjs, above
    requestProblem): the ref; '' for a sha on master; the checkout branch when the sha is its HEAD; else the one remote
    work branch whose tip is the sha, then the one containing it; `pr` from `gh pr list --head <branch>` (checker FIX:
    master / stacked-parent shas took the requester's branch and PR). Used by failure comments, job.ref and dupKey. Carries master's scripts/pr-size.mjs + glob-match.mjs (identical) for CI.
  - Dead-pid heavy.lock at the desktop gate (4191 blocked 21:57 to 01:20+): lib `slotLockDecision` (lib.mjs:118; reuses
    heavy-lock.mjs `parseLock`): break only when the pid is dead on this host and two reads match; no pid / other host /
    live pid / changed text = hold. service.mjs `breakIfStale` (:653; rename to `staleName`, copy back when a fresh taker
    raced; --dry-run only logs), `slotLockHeld` (:678; holder logged once per change), used by both desktop gate calls
    (:1352 train, :1368 requests) and in takeLock's wait (:633). Tests: tests/laptop-queue.test.ts:368.
  - "CI running": auto-train.mjs `ciLabel` (:233; ciState, but 'running' while `checkWaitReason` sees CI working, own
    laptop-e2e / auto-train / checker statuses ignored), used for train.ci (:902) and the candidate log (:926).
    Tests: tests/autoTrain.test.ts:126.
- 2026-10-24 ~23:40: laptop-queue-3 (feature/laptop-queue-3, worktree C:/NightShift/Mobile-Coop-laptop-queue-3, stacked on
  feature/affected-flake f89751fd), Orchestrator waste audit, five fixes (pushed):
  - Release gap hold: lib `trainSoon` releasing case (lib.mjs:541), `releasingTrain` (:504), `readyOrPending` (:522),
    `RELEASE_HOLD_MS` 10 min (:515). service.mjs `pendingTrains` reads each open train's laptop-e2e `updated_at`
    (:524) and sets `soon` after the status reads (:528); `trainSoonNow` (:480), `readyOrPendingCandidates` (:472,
    train-ready PRs with check success or running, minus heads an open train contains). Logged once per change by the
    existing `soon` hold (train reruns still start). Env `LQ_RELEASE_HOLD_MIN`.
  - Desktop failures to the laptop: runRequest (service.mjs:1060) posts pending `desktopFailDesc` (lib.mjs:825) and pushes
    `laptopRerunRequest` (lib.mjs:841; same sha / set / pr / requester, failed suites, `laptopRerun: true`; no set: the
    old suites joined by "+", so it posts on the same context) through `pushFile`; `finish` `handedOff` (:763) posts
    pending, no comment. CPU sampled every 5 s watch tick (now in-process `os.cpus()` deltas, see the CPU gate fix
    below). Desktop filter skips `laptopRerun`. lib `dupKey` / `superseded` / `requestProblem` know `laptopRerun`.
  - auto-train: `fastPollPlan` `late` -> `FAST_POLL_LATE_S` 30 (auto-train.mjs:497, :530), `pendingSince` (:502),
    `laptopLate` (:513, "expect ~N s" in the pending status, else `LAPTOP_EXPECT_MIN` 10); openTrain `laptopSince`
    (:726), step `laptopLate` (:894), main loop (:983). runTrain restamps its pending status with
    "expect ~N s" (service.mjs:876, lib `expectedWallS` :206) once the shards are known.
  - Desktop CPU gates leave out background work (waste audit 22:34-23:36: 4192 started nothing for ~62 min with 5
    requests waiting, a BelowNormal Blender bake held the 50% gate): service.mjs `cpuGated` (:1153) = `os.cpus()` total
    over the call minus two `Get-Process` snapshots 1 s apart of processes below Normal base priority (`BG_CPU_PS`
    :1139; ~2-3 s under load; the per-process WMI perf class took ~18 s, rejected); `lazyCpu` (:1163) feeds both gates
    (:1309 train, :1325 requests). lib `cpuTotalPct` (lib.mjs:111), `backgroundCpuMs` (:135), `gatedCpu` (:159);
    `desktopGate` (:89) reason shows both: "cpu 62% >= 50% (Normal+ priority; total 95%)". Unreadable processes (other
    users / protected) stay counted. The run's CPU samples (desktopFailDesc, "; desktop cpu>90%") stay whole-machine
    load, now in-process `os.cpus()` deltas every 5 s tick (service.mjs:934), no PowerShell per tick (cpuLoadAsync gone).
  - merge-train "cannot lock ref" (release 23:30:50, another worktree fetched at once): new scripts/fetch-retry.mjs
    (`FETCH_LOCK_RE` :7, `shouldRetryFetch` :13, `fetchBackoffMs` :16 2-5 s, `fetchWithRetry` :30 up to 5 tries,
    `fetchOrigin` :47 skips missing optional branches). merge-train.mjs fetches only: mergeAndTag master (:636; the
    merge commit and closeMembers' member heads are in master), build master + train/* + members (:772; --keep reads
    train/<n>, --on checks all origin/train/*), release master + train/* (:904; a stacked base is a train head), single
    master + the branch (:975). auto-train.mjs self-update master only, with the retry (:597).
  - Checker fix: a superseded laptop rerun posts error "superseded by <id>" on its own context, closing the desktop's
    "desktop FAIL ..., laptop rerun queued" pending (lib `supersedeStatuses` lib.mjs:913, service.mjs:1198).
  - Pick order (orchestrator: newest-first let Guard AI's #360 / #363 jump its #317, unclaimed 70 min): lib `pick`
    (lib.mjs:183) runs a requester's highest `priority` then OLDEST open request (superseded() still retires stale
    ones first); cross-requester order by arrival unchanged; laptop reruns keep their place by id time. `priority`
    (integer, default 0) checked in `requestProblem` (lib.mjs:50); `request.mjs --priority N` (request.mjs:82).
    Tests: tests/laptop-queue.test.ts "pick oldest first per requester" (:54).
  - Not merged with master (project rule: conflicts go to the train build). origin/master conflicts in
    scripts/merge-train.mjs (mergeAndTag: master's releaseTail replaces the tag / dev pushes; keep releaseTail, use
    `fetchOrigin(exec, ['master', 'dev'])` since releaseTail reads origin/dev; also give master's new `repair` and
    release (already-merged path) fetches 'dev'), tests/autoTrain.test.ts (keep both import lists) and
    tests/mergeTrain.test.ts (keep both new describe blocks).
  Rollout: update the laptop service (C:/NightShift/Mobile-Coop-laptop-queue-svc) before or together with the desktop
  worker. An older laptop's `dupKey` has no laptopRerun element, so a rerun with all suites failed and a set (always
  the case for affected requests) dedupes against the still-active desktop original and never runs.
  Tests: tests/laptop-queue.test.ts (gate cpu :336, supersedeStatuses :1026), tests/mergeTrain.test.ts (fetch-retry
  :552), tests/autoTrain.test.ts.
- 2026-10-24 ~19:20: feature/laptop-queue-2 (worktree C:/NightShift/Mobile-Coop-laptop-queue-2, from #329 head 80d6087e),
  Orchestrator audit (b)-(d): ALONE_AGE_MIN 30; an aged alone request stops pr claims under the train hold too, only
  while the holding train can clear (lib holdClears); desktop CPU gates 80/80; install-task.ps1 trigger 1 min (re-run it
  on the laptop and the desktop after the merge). b9ac3b72 + checker FIX 976863da. PR opens after #329 lands.
  Polish: a task-started powershell may flash a console when the trigger fires while a manual service holds the pid.
- 2026-10-24 ~18:30 (Orchestrator audit: withdrawn aab8f4f0 held 4191 16:55-18:02, aabc5a31 held 4192 to 17:55,
  train 56 waited 11 min): e48a735d - lib `cutShort`; runRequest kills the command tree (sh `ctl`, `cut`) when the
  request file left the branch on two listings in a row (error status, done) or, for a plain pr request in its suites,
  when a train head is pending (claim released, queued again). `request.mjs --pin` / `pin: true`: never superseded.
  #252 merged at e9363533 only: the 11 later audit commits (f0b9ea20..61171362) had no PR; they ride in the new PR
  with this fix. Opus checker FIX (2): a request whose id is not its file name is now a bad request (the withdrawal check matches by
  name); no preemption beside a full / alone / train-rerun run here (lib cutShort `others`; the train needs both slots).
  Fixed in one round; PR #329, train-ready on CI green.
- 2026-10-24 (Orchestrator audit 2026-10-23 20:30-23:35Z, ~56 + ~10 min of train time lost): duplicates (lib
  `dupKey` / `duplicates`, `LQ_DUP_WINDOW_MIN` 60) are marked done unrun; pr / full / alone runs not yet in their
  suites or steps yield to a pending train (lib `yieldTo`); train reruns (`request.mjs --train-rerun`, lib `pick`,
  `contextName`, `rerunPassed`) run right after trains and post `laptop-e2e` success on a pass; the desktop starts
  nothing while auto-train's build marker is fresh (lib `buildMarker`, `LQ_BUILD_MARKER_MAX_MIN` 30). Detail:
  `docs/systems/testing-tools.md` "Laptop queue". The audit's a8ff2d45 pair was a pr (e2e-enemies, set
  gm-enemies-off, 19 s) and an alone guard bake (8 steps, set guard-bake-all, 3294 s): two different runs, so neither
  supersede nor the duplicate rule joins them; the bake started its steps at 21:14:45, before the train head appeared
  (21:21), so yield would not have stopped it either. Interface for auto-train: `--train-rerun`, the build marker file.
  Rollout: the laptop service must run this before auto-train sends `--train-rerun` (an older service runs it as a
  plain pr request). Checker FIX (same day): a train rerun with a set posts `laptop-e2e/<set>` (auto-train's
  `laptop-e2e/train<n>-rerun`), `rerun-<suites>` only without a set; duplicates match set, jobs and pr too and only a
  success (never a failure) in the window; the desktop's build-marker path follows `AUTO_TRAIN_SCRATCH`; state.done
  entries over 7 days old are pruned on save.
- 2026-10-24 (Michael 07:13 "All three", after 87 old hand-made `NightShift-chain-*` one-shots fired again at 2026-10-23
  23:59 and held heavy-4189 / heavy-4192 for hours): hand-made chains are RETIRED; runs go through the queue
  (`request.mjs`). Permanent tasks: `NightShift-laptop-queue` (`install-task.ps1`), `NightShift-desktop-queue`
  (`install-task.ps1 -Worker desktop`), `NightShift auto-train` (`scripts/auto-train-task.ps1`, master). The only way to
  schedule an ad-hoc run: `scripts/laptop-queue/one-shot-task.ps1 -Name NightShift-run-<what> -Command "..."` (expires
  after `-ExpireMinutes` 240, then Windows deletes it; `-WhatIf` prints only).
  Task guard in `service.mjs` (both workers): at start and every `LQ_TASK_GUARD_MIN` (10) min, disables stale tasks
  (lib `staleTasks`: enabled `NightShift-*` not allowlisted, or any enabled task whose action mentions
  `C:\NightShift\scratch` / `laptop-runner.ps1`; allowlist + `LQ_TASK_ALLOW`), never stops / kills / deletes, and pushes
  `alerts/<ts>-<worker>-tasks.json` to the `laptop-queue` branch. Dry run 07:19: the 87 chain tasks were already gone; it would
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
