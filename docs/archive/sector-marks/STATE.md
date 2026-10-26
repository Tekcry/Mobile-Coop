# sector-marks - state

Owner: Night Shift | Sector Ops Build. Status: current.

## Resume (2026-10-25, plan done, nothing built)
- Job: FOLDED-PLAN J5 (Sector Ops half) + J6's Sector Ops line. Branch `feature/sector-marks`, worktree
  `C:/NightShift/Mobile-Coop-sector-marks`, base origin/master 2148ec96.
- Docs: `BRIEF.md` (Michael's words, A1-A8), `PLAN.md` (one PR, one slice), `briefs/B1.md` (strict Sonnet brief).
- Not started: plan checker (fresh Opus: intent vs Michael's words, gates, claims), then the B1 builder.
- The fix, in short:
  - Beacon: `src/game/interactables.ts:134-137` default branch; switch `drawsExitBeacon(mode)`; builders at
    `src/game/gameState.ts:728` and `src/net/coopClient.ts:247` (one src/net line, no wire change).
  - Lines: `src/world/maps/campusSectors.ts:315` S1, `:406` S3; `campusS4Data.ts:180`; `campusS5Data.ts:169`.
  - Test: `tests/campusObjectivePlace.test.ts` (campusOps only; warehouseOps skipped, it fails on
    `warehouseSectors.ts:30`, `:157`; Marlow never loaded).
  - hyp2: `src/world/maps/campusS4Dress.ts:176`; S4 hero log compared before / after.
  - e2e: one assertion after `scripts/e2e-sectorops.mjs:91`.
- Gates: two Opus checkers (src/net); affected-e2e = smoke, e2e-gadgets, e2e-tactics, e2e-takedown, e2e-park,
  e2e-coop, e2e-netmove, e2e-ctcourse, e2e-levels, e2e-anchors, e2e-sectorops. No GPU run.
- Not ours: Marlow's lines (Marlow Build, own branch); objective popup / menu list (J3b); compass blip of the exit (J3).
- For Michael's next look (no question needed): warehouseOps keeps two objective lines without a place (frozen, A6).
- PR body: `Job-done: sector-marks`, fragment `changes/feature-sector-marks.md`.

Next: start a fresh Opus plan checker on BRIEF + PLAN; on PASS, start the B1 Sonnet builder from `briefs/B1.md`.

## Done
- 2026-10-25: BRIEF, PLAN, B1 brief, this STATE.
