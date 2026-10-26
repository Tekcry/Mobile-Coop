# laptop-queue-10 - brief
Owner: Test Runner. Status: current.

Lead: Night Shift | Test Runner. Started: 2026-10-26 ~14:30. Base: origin/feature/laptop-queue-8 e714c6e38 (slices A-G,
in check; it merges after #507), master 99fbd37fd. Branch feature/laptop-queue-10, worktree
C:/NightShift/Mobile-Coop-laptop-queue-10. Plan: `PLAN.md`.

## Michael said
- 2026-10-26 ~14:00 (chat, to the Orchestrator): "can you prioritise getting the fixes done and out to prevent repeat
  issues."

## Michael picked
- none.

## Orchestrator calls (not Michael)
Rows of the tracker `docs/orchestrator/FIXES.md` (origin/feature/menu), handed to this job 2026-10-26 ~14:20:
- F9 (train 101 waited 17 min): the "no new claims" hold works on the laptop since 4.105.1; the desktop still waits
  for auto-train's build marker only.
- F10 (#317 hung 4192 for 65 min): kill a queue run when no suite finishes in ~15 min (`LQ_SUITE_IDLE_MIN`).
- F11 (#445 held 4191 for 45 min): a desktop failure queues the laptop rerun at once.
- F14 (reopened 14:10; #447 held 4191 64 min; Campaign tallow-prg1 "7 suites" = ~17 parts, ~60 min on 4191 from
  13:22): the desktop overflow caps runs by expected time from times.json (~15 min at one job), not suite count.
- F15 (Mixamo lost its place): renaming a request to an earlier id is a move, not a withdrawal.
- F22 (14:10; 7 stacked requests, ~51 suites ahead of trainable PRs): master-based PRs rank ahead of stacked ones.
- F24 (14:10; desktop starts at 13:41 / 13:49 / 13:56 with CPU reported 100%): log the CPU reading at each start and
  check the 80% gate.
- F26 (coordinator, ~14:40): a quarantine entry forgives ANY failure in its suite; e2e-pad was really broken from train
  112 and rode 6 trains hidden. Entries carry the failing key; another key fails the run as normal.
- F27 (coordinator, ~14:40): a train rerun writes into the same runs/train-<n>-<sha8>/ folder; train 118's first-run
  logs (the netmove flake) were lost. Each attempt gets its own folder.

## Goal
The queue stops repeating these incidents: no run hangs a slot, no desktop failure holds a slot, no long run lands on
the desktop, the desktop leaves room for a due train, trainable PRs go before stacked ones, a moved request keeps its
run, a quarantine hides only its own flake, and every run attempt keeps its logs.

## Limits
- Out of scope: auto-train.mjs, merge-train.mjs, watchdog.mjs, tests/autoTrain.test.ts (laptop-queue-9), run-e2e.mjs
  (no change: the queue reads its existing lines), the game. No wire or save change. Docs: testing-tools.md net <= 0 at
  its 720 budget; RULES "Machines" rewritten in place, 318 lines kept.
- Rules that hold: G302 (Opus builds queue code), G306 / G304 (desktop CPU target), G319 (triage per failure).

## Assumptions (each with its undo)
- A1 (F9): the desktop reads the open train heads, the train-ready PRs and the next-train ETA (laptop's `readyNow` /
  `nextTrainNow`, lib `nextTrain`) only in a pass where it has pr work it could start; `desktopTrains` reuses that read
  (no second gh read). Under the hold only runs that fit start, fitted at `E2E_JOBS=1` (lib `fitsBeforeTrain` gains a
  `jobs` option; the laptop keeps `r.jobs ?? 2`). The build marker stays as the backstop. `LQ_DESKTOP_TRAIN_SOON` (1).
  Undo: 0 (the marker only).
- A2 (F9): candidates come from the `train-ready` label, as on the laptop. If laptop-queue-9 (F16) drops the label
  wait in auto-train, the laptop and the desktop follow it together in that job, not here. Undo: none needed.
- A3 (F10): run-e2e's own suite timeout at the queue is 900 s (`E2E_SUITE_TIMEOUT`, service `e2e`), so a 15 min bound
  would race a legal 15 min suite. The cut fires after max(`LQ_SUITE_IDLE_MIN` (15) min, 900 s + 2 min) = 17 min at the
  defaults with no suite event. An event is a suite result line (lib `finishedSuites`) or a streamed start header
  ("=== s ===") in any log of the run's attempt folder (so heads cut before laptop-queue-8's streamed result line count
  too, and flake reruns count). Armed once the suites start; prepare keeps sh's 1 h timeout; alone steps are not
  watched. Undo: `LQ_SUITE_IDLE_MIN=0` (off).
- A4 (F10): a hung pr / full run on the laptop posts failure "no suite finished in 17 min (hung), run stopped" (plus a
  PR comment with the log tail), result `hung`, done claim pushed; the command tree dies through the existing `cut`
  (`taskkill /T /F`) and `freePort`. A hung run on the desktop takes the F11 hand-off (pending + laptop rerun of the
  unfinished suites): a desktop verdict is never final. A hung train (both workers) posts laptop-e2e failure "<k>/<n>
  pass, <s> s; hung 17 min; FAIL: <unfinished>" through `trainVerdict`, so auto-train's `failSuites` reruns them (a list
  over 140 chars is cut and read as untrusted, as today). Undo: as A3.
- A5 (F11): desktop only, kind pr, not a train or laptop rerun. At the first non-report FAIL result line of a suite that
  is not quarantined (any key), the run pushes `laptopRerunRequest(r, failed + unfinished)`, is cut 'handed-off' and
  posts `desktopFailDesc(failed, median cpu)` pending on its contexts (affected-e2e too), result `laptop-rerun`, no PR
  comment. Unfinished = the run's parts (A6 expansion) without a result line. Passed suites are not rerun (as today's
  hand-off). Needs the streamed result line (heads since laptop-queue-8 C); older heads hand off at the end as today.
  A failed push: the run goes on as today. `LQ_DESKTOP_FAIL_FAST` (1). Undo: 0.
- A6 (F14): the desktop expands a request into the parts run-e2e runs (`node scripts/run-e2e.mjs --list <suites>` in
  the service checkout: run-e2e's PARTS is the one home; memo per sorted suite list; a call error falls back to lib
  `suiteParts` over times). New lib `desktopWallS(parts, times, jobs)`: a part or suite with no time weighs the median
  of every time in times.json (60 s when none, run-e2e's own default), never NaN. `desktopTooLong` and the desktop's
  smallest-first order use it; lib `expectedWallS` / `fitsBeforeTrain` and the laptop stay as they are. Undo:
  `LQ_DESKTOP_MAX_MIN=0` (no cap).
- A7 (F15): lib `movedRequests(gone, candidates)` pairs a vanished request with a request file that is new since the
  last listing (any claim state) and has the same sha, kind, set, `queueRequester` and sorted suites; one-to-one, the
  earliest new id first. A running pair is not withdrawn: the worker claims the new id at once (heartbeats refresh it),
  runs on under the old id (same context), and pushes done for both ids at the end (state.done for both). An open
  tracked pair (affected, laptop rerun) posts no "withdrawn" status. No `place` push (the earlier id is the earlier
  place). Undo: `LQ_MOVED=0`.
- A8 (F22): the PR board (one `gh pr list` per `LQ_PR_BOARD_S`, both workers) adds `baseRefName`; stacked = base is not
  `master`. A request whose PR is not on the board (pr null, spare, a gh error) is master-based. Pick order: trains,
  train reruns, aged alone, fixes, front, then master-based (green smallest first, then arrival), then stacked (the same
  two rules among them). No wait bound for stacked (Orchestrator: they cannot train before their base merges). The
  desktop sorts stacked after master-based in its smallest-first order too. `LQ_STACKED_LAST` (1). Undo: 0.
- A9 (F24): finding (laptop ALIENWARE-X16, 2026-10-26 ~14:45, during a run): 8 Playwright chromium processes run at
  Idle priority (4); Chromium lowers its own renderers. lib `gatedCpu` subtracts every process below Normal, so the
  queue's own e2e browsers count as background and the gate reads far under the real load. Fix: the gate's PowerShell
  read marks processes under `ms-playwright` and they are never subtracted (they are e2e load); a BelowNormal Blender
  still is. Each desktop start and each CPU refusal logs "cpu <gated>% gated / <total>% total (<mode>)" plus the top 3
  subtracted processes when total - gated >= 20. `lazyCpu` is built per pass and read in the same pass as the start
  (checked: no cache across passes). Undo: `LQ_CPU_COUNT_E2E=0` (subtract them again).
- A10 (F26): a quarantine entry may carry `keys` (assertKey texts, as state.flakes records them). Auto-quarantine fills
  them from the flakes of that suite since its last quarantine start (the ones that tripped the budget). A KNOWN FLAKY
  failure whose key (assertKey of its failing line, lib `failureExcerpt` over its section) is not in the entry's keys is
  not flaky: it gets the solo rerun and fails the run as any failure. Undo: `LQ_QUARANTINE_KEYS=0`.
- A11 (F26, the planner's choice of the two options: short expiry, since a warning alone keeps e2e-pad hidden): an entry without keys (the committed e2e-pad entry today) forgives any failure for
  `LQ_KEYLESS_QUARANTINE_H` (48) h after a worker first sees it (state.keylessSeen), logged once, then its failures
  count. An owner who wants it kept adds `keys` to `scripts/e2e-quarantine.json`. Undo: 0 = keyless entries forgive
  until their own expiry (today).
- A12 (F27): each run attempt writes its own folder: runs/<id>, then runs/<id>-2, -3 (lib `attemptDir`), for trains
  and requests (a preempted or yielded request's next attempt too). Finding: `sh` appends (flag 'a'), so no code path
  truncates a shard log; but sectionOf and the kept / idle readers read whole files, so the first section found may be
  an older attempt's. The slice C builder checks train 118's folder on the laptop and logs what it holds. Undo: none.
- A13: one PR, all Opus builders in order (shared files). Drafted on top of laptop-queue-8; after laptop-queue-8
  merges, `git rebase origin/master` and force-push once (pr-size then counts only this job). Undo: none.

## Questions for Michael
- none.

## Sign-off needed
no.
