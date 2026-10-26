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
