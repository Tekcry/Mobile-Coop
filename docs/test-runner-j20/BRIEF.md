# test-runner-j20: brief

Lead: Night Shift | Test Runner. Started: 2026-10-25. Base: master 2148ec969. Planner: Opus 5.5 (plans and briefs only).
Job: FOLDED-PLAN J20 (`origin/feature/menu:docs/orchestrator/FOLDED-PLAN.md` section 4): "Test Runner batch: wire files
run the co-op suites, legacy suites report only, campus suite map, quarantined timeouts fail, flake file, owners,
quarantine test, perf with budget; checks for no-timer, alive at start, import boundary, replay". Rows: CONFORMANCE
(`docs/conformance-test-runner/CONFORMANCE.md`) T1 T4 T5 T8 T10-T14, H5 H7-H9. Depends on J1 (doc-only fixes).

## Michael said
- 2026-10-25 ~16:50, native multiple choice, free text (ROADMAP Decided, "Folded plan, the other 30"), Q31 load time:
  "to be reviewed. currently when starting maps the level slowly builds while in game at the start, requires work to
  ensure map is fully loaded."

## Michael picked
- 2026-10-25 ~16:50 Q27: "Should a light-meter-vs-picture mismatch hold a release?" -> picked: "Yes, every release
  (Recommended)" (FOLDED-PLAN row 27: "Yes, checked on every release (3-5 min more); other picture flags advisory for now").
- 2026-10-25 ~16:50 Q30: "A test failing the same check again and again?" -> picked: "Becomes blocking (Recommended)"
  (FOLDED-PLAN row 30: "A second quarantine in 14 days makes it blocking with a fix job").
- 2026-10-25 ~17:00: folded plan signed off: "Sign off, start (Recommended)".

## Goal
A PR is gated by exactly the suites the rules name (wire files pull the co-op group, campus files the campus suite,
legacy and audio suites report only), a hang is never hidden by a quarantine, the flake file tells the truth and a
suite that keeps needing quarantine becomes blocking with a fix job for its owner. Every release also proves the light
meter matches the picture (Q27). Four hard rules get a check: no route timer (H5), every spawned guard alive (H8),
gameplay never imports graphics settings (H9), patrols and detections replay the same (H7).

## Limits
- Out of scope: Q31 load time (Sector Ops' work, J21 / S V11: "map fully loaded before play"); T14's allocation fix
  (Player Build for controller casts, Sector Ops for campus colliders, J21); T9 option work beyond Q30; T11 code (a note
  only); H1-H4, H6, H10 (other jobs); the visual-gate's other flags (stay advisory, Q27).
- Rules that hold: REQUIRED / LEGACY / AUDIO / GPU lists and the train list are Michael's (process audit 2026-10-19);
  Q27 authorises adding the light parity check to the train run only. Perf budgets are Michael-only (no budget value
  changes; T14 only enforces the existing ones). Flake rule owner: `docs/systems/testing-tools.md` "Flakes and
  quarantine". VISION 4 hard rules 6, 8, 9, 10 (G334, G143, G289 / G190, G327).
- Areas touched: test tooling only; no player-facing change, no walk item (unwalked counts unchanged).

## Answers (M) and assumptions (A)
- M1 (Q30): a second auto quarantine within 14 days of the suite's last auto quarantine start makes it blocking: no new
  quarantine entry, an owner fix job is flagged.
- M2 (Q27): the light-meter-vs-picture check holds every release (train run); other picture flags advisory.
- A1 (T4): "report only" for an affected request = the LEGACY and AUDIO suites the selection reaches still run, after
  the gate suites, and print REPORT ONLY (they never fail `affected-e2e`); GPU suites stay out of affected requests as
  master already does (`affectedGateSuites`, `scripts/e2e-affected.mjs:29-32`; the doc says "GPU suites never").
  Undo: drop the `report` list from `affectedRequest` (S3a) and the suites go back to being dropped.
- A2 (T4, coordinator item a): `laptopRerunRequest` filters through `affectedGateSuites` only for affected requests
  (requester `affected-e2e`); a lead's named request that lists a legacy suite keeps it. An affected request run on
  master code from before S3a (no `report` field) marks LEGACY / AUDIO / GPU results report-only at parse time. Undo:
  remove the filter call in `laptopRerunRequest` and the `markReport` call in service.mjs.
- A3 (T8): a quarantined suite's failure prints KNOWN FLAKY only when the suite exited with code 1 (an assert); a
  timeout (124), a signal kill (null) or any other code fails the run. Undo: revert `classify` in
  `scripts/e2e-verdict.mjs` to "every failure of a quarantined suite is KNOWN FLAKY".
- A4 (Q30): "blocking" = the suite is back under the normal rule (a failure counts unless a solo rerun on the same sha
  passes; `testing-tools.md` "Flakes and quarantine"), not "no rerun". The fix job is flagged by an
  `alerts/<ts>-<worker>-fixjob-<suite>.json` push to the `laptop-queue` branch (the orchestrator reads `alerts/`), a
  BLOCKING row in `flake-budget.md` and a line in the PR comment; once per suite per 14 days. Undo: in lib
  `autoQuarantine`, drop the `REPEAT_DAYS` branch (every over-budget run quarantines again, as before).
- A5 (T1): `wirePaths` / `touchesWire` move from `scripts/merge-train.mjs:325-339` into `scripts/e2e-affected.mjs`
  (pure) and merge-train re-exports them unchanged, so `tests/mergeTrain.test.ts` and auto-train keep working. Undo:
  move them back.
- A6 (T12): owners for the 15 required suites without one, by the `docs/RULES.md` area table: smoke, e2e-offline,
  e2e-feedback -> Test Runner; e2e-menus, e2e-studio, e2e-tuner-phone, e2e-stealth, e2e-combat, e2e-clip, e2e-wall,
  e2e-gadgets -> Player Build; e2e-levels, e2e-desktop -> Sector Ops Build; e2e-ct, e2e-park -> Marlow Build. Undo:
  edit `scripts/e2e-quarantine.json` owners (no code reads more than the name).
- A7 (Q27): the check is `e2e-darkness` (Warehouse, Epic, 42 s in `scripts/e2e-times.json:15`) appended to the train
  list on GPU workers. Its successor (per-map parity cards, J11 / visual-gate parity count) replaces it when Sector Ops
  Build says so: one constant (`TRAIN_PARITY` in lib.mjs). Before switch-on, e2e-darkness runs 3 times on master via
  the queue; if it is red there, S7 lands with the constant empty and Sector Ops gets the fix request (the hold
  needs a green check, not a red train). Undo: set `TRAIN_PARITY = []`.
- A8 (T14): perf requests = alone steps that run `node scripts/perf.mjs`; lib `perfStep` appends `--budget` unless the
  step already has it or says `--no-budget` (an explicit measure-only run, logged). Undo: drop the `perfStep` call.
- A9 (H7): the replay test runs the pure layer (`PatrolWalker`, `sightRate` / `stepMeter`) twice with `Math.random`
  poisoned; the full-guard replay waits on Guard AI: `Math.random` at `src/ai/enemy.ts:389,2336` (think cadence),
  `src/ai/enemyManager.ts:650,661` (radio delays) and `src/ai/reconDrone.ts:34` is allowlisted by count and an
  `it.todo` names the fix request. Undo: delete the test file.
- A10 (H8): campus S2-S5 load through `__sector.loadSection(i)` (a TS-private method, callable from the page) in
  e2e-sectorops part 6; Marlow asserts at each set's start in `scripts/e2e-ctcourse.mjs`. Tests only; no source hook.
  Undo: delete the added blocks.
- A11 (coordinator item b): the `docs/backlog.md` "Flaky e2e suites" camera-bounds entry is rewritten (level U, U-Z4V,
  the operator falls through the floor, head y -33 to -35; known legacy failure, report only once T4 lands). Undo: git
  revert of that hunk.

## Owners touched (tests or data reads only, unless named)
- Guard AI Build: H7 reads `src/ai` only; the `Math.random` fixes are Guard AI's (fix request filed from S6b; the test
  lands allowlisted).
- Sector Ops Build: H5 reads sector data (`src/game/sectors.ts`, `src/game/sectorStage.ts`, `src/world/maps/campus*`,
  `warehouseSectors.ts`); H8 edits its suite `scripts/e2e-sectorops.mjs` part 6 (tests only); Q27 coordination (owns
  lighting and the visual gate); T12 owner names.
- Marlow Build: H8 edits `scripts/e2e-ctcourse.mjs` (tests only); T12 owner names.
- Player Build: T12 owner names; T14 allocations (theirs, J21).
- Orchestrator: `scripts/merge-train.mjs` re-export (A5, no behaviour change); fix-job alerts land in `alerts/`.
- Campaign Build: `origin/feature/mission-engine-flg-gb6` also edits `scripts/e2e-affected.mjs` DIRECT rows and
  `scripts/run-e2e.mjs` PARTS (claims overlap, plan "Risks").

## Questions for Michael (one click each, asked by day)
- None. Q27 / Q30 / Q31 are answered; nothing here loosens a Michael-only rule.

## Sign-off needed
no
