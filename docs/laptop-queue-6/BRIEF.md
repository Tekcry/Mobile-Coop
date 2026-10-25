# laptop-queue-6 - brief
Owner: Test Runner. Status: current.

## Orchestrator said
- 21:57 audit: "The laptop's 3-min train gap (LQ_TRAIN_GAP_MIN) ends before the release finishes its deploy wait, so
  the next train kills the PR runs it let start (Player ffb7f02a twice): tie the gap to auto-train's releasing state."
- 23:05 audit: "Train starts killed 3 PR runs this window (13.6 slot-min)".

## Problem
The laptop holds new claims (lib `trainSoon`, lib.mjs:705) only while a train is building, for `RELEASE_HOLD_MS` after
an open train's laptop-e2e success, and for `LQ_TRAIN_GAP_MIN` (3) min after a train PR merges. But `merge-train
release` merges, then waits for the Pages deploy (~4.5-5.5 min), and only then does the same auto-train tick build the
next train. So the next train head appears 6.6-9.2 min after the merge (5 releases below), and the laptop claims PR runs
in the 3.5-6 min between the gap's end and that head; the train then cuts them (lib `cutShort`).

Evidence (`C:/NightShift/scratch/laptop-queue/log.txt`, UTC; local = UTC+11; merge / deploy times from GitHub):

| Train | Prev merge | Deploy done | Gap ended | Run claimed (id) | Train seen, run cut | Lost |
| --- | --- | --- | --- | --- | --- | --- |
| 102 | 101: 10:13:42 | 10:19:08 | 10:16:42 | 10:25:11 player-b-ffb7f02a-ddde (coop-real-c1c) | 10:26:55 | 1.7 min |
| 103 | 102: 10:40:34 | 10:46:04 | 10:43:34 | 10:46:02 player-b-ffb7f02a-ddde | 10:47:35 | 1.6 min |
| 104 | 103: 11:00:24 | 11:05:30 | 11:03:24 | 11:04:05 player-b-fc6d52c7-03bc (coop-real-c2b) | 11:09:35 | 5.5 min |
| 105 | 104: 11:24:22 | 11:28:43 | 11:27:22 | 11:24:05 affected-e2e-10dc0a9e-090b (before the merge) | 11:30:58 | 6.9 min |
| 105 | | | | 11:27:40 player-b-fc6d52c7-03bc | 11:31:03 | 3.4 min |
| 106 | 105: 11:43:07 | 11:48:37 | 11:46:07 | 11:47:00 guard-ai-a78d7093-04fe (rules-pr1) | 11:50:20 | 3.3 min |

Total 22.4 slot-min in 5 trains (the 23:05 window's 13.6 = the last three rows). Each cut run is queued again, so its
whole wall is redone. In every row a green train-ready PR not in any train was waiting when the run was claimed
(train 102: #455 labelled 10:23:55; 105: #438 labelled 11:23:59, 6 s before the 11:24:05 claim; 106: #464 11:44:37),
so the next train was predictable. Train 102 shows the second gap: a candidate that turns ready long after a release
(no gap at all then) gets its train ~3 min later (10:23:55 label, 10:26:54 head).

None of the cut runs could have finished in time: coop-real suites have no times.json entry, 10dc0a9e and rules-pr1
were ~10-11 min of suites. Short runs did fit in the same windows (3889cfce 3 suites 12 s, marlow rating 85 s).
Prep overhead (claim to done minus suite wall) measured 74-111 s on 5 runs.

## Assumed decisions
- A1. Predict the next train's arrival (ETA) instead of a fixed gap: ETA = max(merge + 6.5 min, first time the
  candidate was seen ready + 3 min); during an open train's releasing state ETA = laptop success + 2 min + 6.5 min.
  Undo: set `LQ_TRAIN_GAP_MIN=3 LQ_TRAIN_LATE_MIN=0 LQ_TRAIN_READY_LAG_MIN=0` (the old 3-min gap, no late window).
- A2. Measure from the merge time, not from the deploy run: one fewer GitHub call per pass, and the build lag after the
  deploy still has to be guessed. Undo: read the newest `deploy.yml` workflow_dispatch run and anchor ETA on its end.
- A3. While the hold is on, a pr request still starts when it fits: 120 s prep + 1.2 x its expected wall (times.json,
  lib `expectedWallS`) ends before ETA. Unknown suites, full and alone runs never fit. Undo: `LQ_FIT_PREP_S=99999`.
- A4. The hold ends at ETA + 5 min (`LQ_TRAIN_LATE_MIN`) even with candidates waiting (auto-train paced, at its daily
  cap or holding on a red check): at most 11.5 min of idle slots per release, 8 min per newly ready PR. Undo: env.
- A5. The cut side is unchanged (lib `cutShort`, 80% progress rule): prevention removes all 6 cases; a grace for a
  near-done run would delay every train and none of the 6 was near done. Undo: n/a.
- A6. `LQ_RELEASE_HOLD_MIN` / `RELEASE_HOLD_MS` retire (the releasing ETA replaces them). Undo: revert the PR.
- A7. Candidates that merged with the last train (still labelled until the release tail closes them) no longer count:
  a head already in `origin/master` is excluded. Undo: drop the master test in `readyHeads`'s inTrain.
- A8. A candidate labelled seconds before a claim may still be missed (105: 6 s); not chased. Undo: n/a.
- A9. Cost, replayed on the 5 trains: the 6 cut runs are held (22.4 slot-min saved); 3 runs that happened to finish
  before a late train are held too (eab8c758 10:43:49, ffb7f02a 11:04:02, 97c6338f 11:46:14; ~11.6 slot-min of
  idle slots, the work runs after the train). Net ~11 slot-min saved per 5 trains plus no repeat runs.
