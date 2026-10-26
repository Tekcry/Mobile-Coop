# laptop-queue-10 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, after S7)
- Location: C:/NightShift/Mobile-Coop-laptop-queue-10b, branch feature/laptop-queue-10b (draft PR #570, base
  feature/laptop-queue-8b 2fbfbd303 = PR #552, still open); node_modules is a junction (never delete). Guard before
  every write: `cd /c/NightShift/Mobile-Coop-laptop-queue-10b && test "$(git rev-parse --abbrev-ref HEAD)" =
  feature/laptop-queue-10b && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-laptop-queue-10b"`.
  The plan branch feature/laptop-queue-10 holds only BRIEF / PLAN (d52d7b45a); all code is on 10b.
- Read: BRIEF.md (Michael ~14:00 "prioritise getting the fixes done and out"; A1-A13), PLAN.md ("Env knobs", "Size and
  PRs", "Overlap"), the Done list below (every slice's deviations).
- Built, all Opus, in order: S1 hung cut + attempt folders (F10, F31), S2 desktop parts / time cap + fail fast and the
  desktop no-result hand-off (F14, F11), S3 desktop train soon + CPU reading (F9, F24), S4 stacked last (F22), S5
  quarantine keys (F26), S6 moved requests (F15), S6b fix / front before an aged alone (F39), S6c a parked run stops
  (F40), S7 docs (RULES "Machines" 318 lines, testing-tools 720), fragment `changes/feature-laptop-queue-10.md`, STATE.
- Tracker ids: the attempt-folder fix is F31 (the BRIEF / PLAN call it F27; tracker F27 is another item: never close
  it from here).
- Knobs (all default on; 0 = the old behaviour): PLAN "Env knobs" table; documented in testing-tools "Laptop queue" and
  "Flakes and quarantine".
- Tests: laptop-queue 269 + autoTrain 71 + e2eQuarantine 5 = 345 pass at S6c; S7 is docs only.
- Open: A12 train 118 folder check is laptop-only (Test Runner); the 15:17 / 15:32 freeze finding (S6c): the freeze
  must move running request files too, or F40's cut never fires.
- Live checks after release (PLAN "Tests and verify"): a hung run logs "hung" within 17 min; a desktop failure posts
  "laptop rerun queued" mid-run; a stacked request waits behind a master-based one; flake-budget entries carry keys.
- Overlap: laptop-queue-9 owns auto-train / merge-train / watchdog / tests/autoTrain.test.ts (not touched); J20 PR-B2
  shares the lib import line, state defaults and one updateBudget line (PLAN "Overlap"). RULES "Machines" and
  testing-tools are also claimed by laptop-queue-9, map-ready and route-runs-2: whichever merges second re-checks
  `wc -l` (318 / 720).
Next: (1) one Opus checker on the S7 head (queue code: PLAN "Order and builders"), one fix round; (2) once #552 is on
master, `git rebase --onto origin/master 2fbfbd303`, force-push once, retarget #570 to master, PR body ends with the
"Repeat guards" list below and `Job-done: laptop-queue-10`, mark ready.

## Done
- 2026-10-26: worktree and branch made and pushed; BRIEF, PLAN, STATE written (planner, Opus).
- 2026-10-26: plan check 1 (Opus): FIX, fixed in place: base re-based to laptop-queue-8b 2fbfbd303 (rebase --onto,
  line refs), S2 keeps keptPlan in desktopTooLong, S2 adds the desktop incomplete hand-off (F11 widened), F27 tracker
  id clash noted, RULES / testing-tools overlaps recorded. Size ~790.
- 2026-10-26: S1 (Opus builder, branch feature/laptop-queue-10b, on laptop-queue-8b 2fbfbd303): hung cut (F10) and per-
  attempt run folders (tracker F31; the BRIEF / PLAN call it F27). lib suiteEvents, idleLimitMs, idleStep,
  unfinishedParts, hungTrainDesc (optional prefix: the desktop's "desktop: ", so auto-train desktopFailSuites still
  reads a desktop hung train), attemptDir, cutShort `hung`; service SUITE_TIMEOUT_S / SUITE_IDLE_MS (start log),
  attemptEvents (+ force read for the verdict), newestLog, runRequest / runTrain attempt folders and hung watch, cutEnd
  'hung'. Tests: new describe "hung runs and attempt folders (laptop-queue-10 S1)", 7 cases; laptop-queue 237 +
  autoTrain 71 = 308 pass (301 at 2fbfbd303 was both files). typecheck:fast clean.
- S1: train 118 folder check is laptop-only, left for Test Runner (A12).
- 2026-10-26: S2 (Opus builder, feature/laptop-queue-10b): desktop cap by parts and time (F14) and desktop hand-off
  (F11). lib desktopWallS (no time = median of times.json, 60 s when empty, never NaN), desktopTooLong(r, times, maxS,
  parts = keptPlan rest), failFast. service LQ_DESKTOP_FAIL_FAST, partsOf (run-e2e --list memo), quarantineNow, desktop
  filter / order over partsOf, runRequest queueRerun / handOff: fail fast in the watch while run-e2e runs, cutEnd
  'handed-off', the desktop 'hung' hand-off (failed + unfinished parts; not under the knob), the desktop incomplete
  hand-off (the parts it ran, kept suites excluded). Tests: describe "desktop wall by parts and fail fast (laptop-queue-10
  S2)", 3 cases + the desktopTooLong case updated; laptop-queue 240 + autoTrain 71 = 311 pass; typecheck:fast clean.
  +176 / -25 counted lines (lib 30/7, service 106/15, tests 40/3).
- 2026-10-26: S3 (Opus builder, feature/laptop-queue-10b): desktop train-soon hold (F9) and CPU reading (F24). lib
  fitsBeforeTrain `jobs` (desktop 1, laptop none), backgroundCpuMs 4th token (name / `e2e`, countE2e; returns e2eMs, top
  3 subtracted names), cpuNote. service LQ_DESKTOP_TRAIN_SOON, LQ_CPU_COUNT_E2E, trainSoonNow (split from
  pendingTrains), pass headsOnce memo shared with desktopTrains, desktop next read when a pr request and a free port
  remain (a GitHub error never holds), the train-soon filter on both workers, BG_CPU_PS names (`e2e` under
  \ms-playwright\), cpuGated { gated, total, top, elapsedMs, cores }, lazyCpu per pass with .taken(), cpuNote on the
  desktop train / queue lines and "<id>: desktop start on <port>, <cpuNote>". Tests: describe "desktop train soon and
  CPU reading (laptop-queue-10 S3)", 5 cases + 2 backgroundCpuMs asserts updated for the new fields; laptop-queue 245 +
  autoTrain 71 = 316 pass; typecheck:fast clean; BG_CPU_PS run once by hand (parses). +139 / -34 (lib 34/9, service
  60/22, tests 45/3).
- 2026-10-26: S4 (Opus builder, feature/laptop-queue-10b, 82e57981e): stacked PRs last (F22). lib prBoard `base` /
  `stacked` (base not master; missing = master-based); pick order.stacked: the green, starvation and arrival tiers run
  over the master-based requests while any is open, else the stacked (no wait bound for stacked); desktop smallest sorts
  stacked last; fix and front tiers unchanged. service LQ_STACKED_LAST, prBoardNow reads baseRefName (same gh call),
  order built when STACKED_LAST too, "order:" line adds "stacked <k> (last)". Tests: describe "pick: master-based before
  stacked (laptop-queue-10 S4)", 8 cases + the prBoard shape assert gains base / stacked; laptop-queue 253 + autoTrain
  71 = 324 pass; typecheck:fast clean. +113 / -17 (lib 18/7, service 12/7, tests 83/3).
- 2026-10-26: S5 (Opus builder, feature/laptop-queue-10b, b2b49b62d): a quarantine forgives only its own failure (F26).
  lib quarantineKeys (unique non-empty flake keys of the exact suite since the last start), quarantineForgives (keys:
  only those; keyless or keys []: while now < keylessUntil; no entry: false). service LQ_QUARANTINE_KEYS,
  LQ_KEYLESS_QUARANTINE_H (48), state.keylessSeen, updateBudget fills `keys` on auto entries (and clears that suite's
  keylessSeen), checkQuarantine before rerunFlakes in runTrain and runRequest: a counted KNOWN FLAKY failure turns
  flaky false, logs "<s>: quarantined for ..., this failure is "<key>": counts", gets the solo rerun and fails the
  verdict. Deviation: a run-e2e KNOWN FLAKY with no live entry in the service's lists (the head's own quarantine file)
  counts as keyless (48 h window), not at once. Tests: describe "quarantine keys (laptop-queue-10 S5)", 4 cases;
  laptop-queue 257 + autoTrain 71 + e2eQuarantine 5 = 333 pass; typecheck:fast clean. +122 / -3 (lib 25/0, service
  40/2, tests 57/1).
- 2026-10-26: S6 (Opus builder, feature/laptop-queue-10b, 697104f97): a renamed request is a move (F15; live: PR #548's
  affected-e2e posted "withdrawn by the requester (not run)" when fronted by rename at 04:13Z). lib movedRequests (match
  = lib dupKey plus queueRequester, so also env / jobs / pr / rerun flags; one-to-one, earliest candidate first). service
  LQ_MOVED, prevIds, movedTo, applyMoves after the parse loop (candidates = out + otherActive new since the last
  listing, no extra git show), the missing / closeWithdrawn step moved after it; a running pair claims the new id
  ('blocked' = withdrawn as before), drops it from the listing, heartbeats it (taken maps back to the run); a tracked
  open pair posts no withdrawn status. runRequest finally: done for both ids (state.done[new].movedFrom); a give-back
  marks the old id done 'moved' and releases the new one (alone steps / due / front place follow); keepFinished writes
  the new file. Tests: describe "moved requests (laptop-queue-10 S6)", 4 cases; 337 pass (laptop-queue 261 + autoTrain
  71 + e2eQuarantine 5); typecheck:fast clean. +136 / -22 (lib 20/0, service 78/21 incl. ~12 moved, tests 38/1).
- 2026-10-26: S6b (Opus builder, feature/laptop-queue-10b; tracker F39, added by the orchestrator 15:45 from the 15:33
  time audit): fix and front before an aged alone. lib isFrontTier (pr / full: order.fix or isFront; never alone, spare,
  train rerun), pick queue.frontBeforeAlone: an aged or preempted alone no longer holds a free slot from a fix / front
  request (fixes first, then by place); the alone still waits for both slots; trains and train reruns stay first.
  service LQ_FRONT_BEFORE_ALONE (1), queue.frontBeforeAlone, the laptop alone hold also keeps the fix / front tier
  (built like queue.order) besides train reruns, its log line says so. Tests: describe "fix and front before an aged
  alone (laptop-queue-10 S6b, F39)", 3 cases (the audit replay with the knob on / off); 340 pass (laptop-queue 264 +
  autoTrain 71 + e2eQuarantine 5); typecheck:fast clean. +57 / -5 (lib 16/0, service 9/4, tests 32/1).
- 2026-10-26: S6c (Opus builder, feature/laptop-queue-10b; tracker F40): a parked run stops. lib stoppedRuns (running,
  { listed, parked, moved, misses }: parked = in parked/ and gone from requests/, at once; withdrawn = gone two listings
  in a row, as before; a moved run is read under its new id; entries with no id, e.g. trains, skipped), cutShort
  'parked' after 'withdrawn'. service LQ_PARKED_CUT (1), parkedIds, listRequests reads parked/ only while a request runs
  and replaces the missing loop with stoppedRuns (both workers), cutEnd 'parked': the withdrawal's error status
  ("withdrawn by the requester (parked), run stopped"), claim released, not done (runs again when moved back). Finding:
  the 15:17 / 15:32 freezes never moved a running file (#518's 013d and #520's 6642 stayed in requests/ while running;
  6642 was parked after it yielded), so the existing two-listing withdrawn cut never saw them: the freeze must move
  running files too. Tests: describe "parked and withdrawn runs stop (laptop-queue-10 S6c, F40)", 5 cases; 345 pass
  (laptop-queue 269 + autoTrain 71 + e2eQuarantine 5); typecheck:fast clean. +94 / -13 (lib 25/2, service 28/10, tests 41/1).
- 2026-10-26: S7 (Opus builder, feature/laptop-queue-10b): docs, fragment, STATE. RULES "Machines" rewritten in place
  (318 lines kept): the laptop pick order (fixes and front branches, then an aged alone, then master-based PRs, then
  stacked; F39, F22), the desktop rerun at the first failed suite or no result (F11), the due-train hold (F9), the e2e
  browsers count in the CPU gate (F24); paid for by dropping "installed backlog gate 0", lib `gatedCpu` and the CPU
  mode knob from RULES (both stay in testing-tools) and "Both locks" for the lock names. testing-tools "Laptop queue"
  and "Flakes and quarantine" (720 lines, net 0): order (stacked tier, F39), yield (parked F40, hung F10), train soon
  (desktop at one job F9), statuses (attempt folders F31), desktop (parts F14, CPU F24, fail fast F11), claims (moved
  F15), keys (F26); lines freed: the archive pointer, dated history notes ("2026-10-24", "4.101.1", audit notes), the
  build-marker detail, the Scheduled tasks parenthetical, the stale "Commits cut before this change" sentence, the
  "Flakes ... below" pointer, and the 4191 / heavy.lock restatement (its doc-lint owners warning is gone). Fragment
  `changes/feature-laptop-queue-10.md` (kind patch, plain English). `docs/laptop-queue/STATE.md` dated entry on top.
  Not done: `docs/stale-terms.json` (old wording not added; not claimed).

Repeat guards (the lead copies this list into the PR body): one line per fix, the unit test in
tests/laptop-queue.test.ts (describe > case) that fails if the problem comes back.
- F9: "desktop train soon and CPU reading (laptop-queue-10 S3)" > "fitsBeforeTrain jobs: the desktop fits at one job,
  over r.jobs; the laptop passes none" and "holdKeeps with the desktop fit: a due train drops a run that does not fit;
  no train keeps it".
- F10: "hung runs and attempt folders (laptop-queue-10 S1)" > "idleStep moves the clock on a new event and is hung at
  the limit", "cutShort: hung stops at any stage, after withdrawn and superseded, before a pending train" and
  "hungTrainDesc names the failed and unfinished parts as FAIL, cut to 140".
- F11: "desktop wall by parts and fail fast (laptop-queue-10 S2)" > "failFast: the first counted failure hands off the
  failed and unfinished parts" (the no-result hand-off is service code with no unit case).
- F14: "desktop wall by parts and fail fast (laptop-queue-10 S2)" > "tallow-prg1 replay: 7 suites as 17 parts are over
  15 min on the desktop (NaN took them before)".
- F15: "moved requests (laptop-queue-10 S6)" > "the Mixamo replay: a running request re-filed under an early id, suites
  in another order, is a move".
- F22: "pick: master-based before stacked (laptop-queue-10 S4)" > "the 14:00 replay: 7 stacked requests (51 suites)
  older than 2 master green PRs; both master PRs go first".
- F24: "desktop train soon and CPU reading (laptop-queue-10 S3)" > "gatedCpu replay (A9): 8 Idle Playwright chromium
  count as load, a BelowNormal Blender is still subtracted".
- F26: "quarantine keys (laptop-queue-10 S5)" > "e2e-pad replay (trains 112-118): the keyless entry forgives for 48 h
  after first seen; keys of another failure do not forgive".
- F31: "hung runs and attempt folders (laptop-queue-10 S1)" > "attemptDir gives each attempt its own folder".
- F39: "fix and front before an aged alone (laptop-queue-10 S6b, F39)" > "the 15:00 audit replay: a fronted fix pr
  request beats an alone request aged 45 min; knob 0 = the alone".
- F40: "parked and withdrawn runs stop (laptop-queue-10 S6c, F40)" > "parked: the freeze moved its file to parked/ ->
  cut at the first listing".
