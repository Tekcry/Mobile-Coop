# laptop-queue-10 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26, planner)
- Location: C:/NightShift/Mobile-Coop-laptop-queue-10, branch feature/laptop-queue-10 (upstream origin), cut from
  origin/feature/laptop-queue-8 e714c6e38; node_modules is a junction to C:/NightShift/Mobile-Coop-laptop-queue-8.
  Guard before every write: `cd /c/NightShift/Mobile-Coop-laptop-queue-10 && test "$(git rev-parse --abbrev-ref HEAD)"
  = feature/laptop-queue-10 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-laptop-queue-10"`.
- Read: BRIEF.md (Michael ~14:00 "prioritise getting the fixes done and out"; A1-A13), PLAN.md (S1-S7, knobs, tests,
  overlap), then agent-preamble and session-method from origin/master.
- Scope: tracker rows F9, F10, F11, F14, F15, F22, F24 (Orchestrator) and F26, F27 (coordinator ~14:40).
- Slices, all Opus, in order on this branch (shared lib, service, tests): S1 hung runs + attempt folders (F10, F27);
  S2 desktop parts / time cap + fail fast (F14, F11); S3 desktop train soon + CPU reading (F9, F24); S4 stacked last
  (F22); S5 quarantine keys (F26); S6 moved requests (F15); S7 docs, fragment, STATE. Then one Opus checker.
- Size: ~775 counted lines (code + tests), one PR, draft until laptop-queue-8 is on master, then rebase and force-push
  once.
- Findings at planning: F24's cause is likely lib gatedCpu subtracting the queue's own Playwright chromium (8 of them at
  Idle priority 4 on the laptop during a run, 14:45); F27: sh appends logs (no truncation in code), so S1 checks train
  118's folder on the laptop; F14: expectedWallS is NaN for any suite with no time, so desktopTooLong took it.
- Overlap: laptop-queue-9 owns auto-train / merge-train / watchdog / tests/autoTrain.test.ts (not touched here); J20
  PR-B2 (feature/test-runner-j20-prb2) shares the import lines, state defaults and one updateBudget line (PLAN
  "Overlap").
- Verify per slice: `npm run typecheck:fast`, `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts`.
Next: (1) `git fetch -q origin && git rebase --onto origin/feature/laptop-queue-8b e714c6e38`, force-push (PLAN
"Start"; line refs re-based to 2fbfbd303 in the PLAN header); (2) ask the Orchestrator for the tracker number of the
attempt-folder fix (BRIEF F27 note); (3) brief the S1 Opus builder from PLAN "S1".

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
