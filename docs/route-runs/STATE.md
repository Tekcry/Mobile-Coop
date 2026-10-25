# route-runs - STATE
Owner: Marlow Build. Status: current.

## Resume (2026-10-25 ~18:00)
- Job: FOLDED-PLAN J13 (ROADMAP Now row 14, G330, Q7 "Never stuck"); lead Night Shift | Marlow Build. Branch
  `feature/route-runs-2` in `C:/NightShift/Mobile-Coop-route-runs-2`, cut from master 2148ec969; replaces the stale
  `feature/route-runs` (4-line STATE only, do not use).
- Plan stage: BRIEF and PLAN written and pushed; the plan checker has not run.
- Read first: `docs/route-runs/BRIEF.md` (scope, A1-A12, Q1), `docs/route-runs/PLAN.md` (claims, R1-R9, G1, the J12
  interface table under "Dependencies").
- Pass rule (Q7): a map passes when no run has a dead stop and none is unplannable; detections go on the walk card only.
  Stuck = under 0.5 m of progress in 8 s of game time (BRIEF A4).
- Open question for Michael: BRIEF Q1 (co-op moves stubbed vs real). Default A1 (stubs, listed); R1-R8 build either way.
- Dependencies: J12 validator port (another Opus planner, `feature/validator-port`, `docs/validator-port/`, not pushed
  at 18:00) must give V6 fields on master plus one point resolver (PLAN "Dependencies" row 1); Guard AI G1 cause
  record (conformance G C5) for R7; map leads add `area` to every space a route passes (BRIEF A8).
- Can start now (no J12): R1 planner, R2 report, R3 progress / stuck (in parallel), then R4a harness, then R4b pair and
  R5 link steps. After J12: R6, R8 gate runs. After G1: R7.
- Claims overlap: `docs/systems/testing-tools.md` with `feature/test-runner-j20` (R8 waits for J20).
- Sources: G330 / G272 / G289 (2) in master `docs/DECISIONS.md`; ROADMAP Decided ~09:05, ~16:40, ~16:50
  (origin/feature/menu `docs/ROADMAP.md`); FOLDED-PLAN J12 / J13 / J17 / J23 rows (origin/feature/menu
  `docs/orchestrator/FOLDED-PLAN.md:172-185`); master `docs/conformance-marlow/CONFORMANCE.md` H8 (:38), M9 (:52), V3
  (:65); `docs/conformance-guard-ai/parts/C-perception.md:14` (C5); `docs/level-design.md` 14 (:484-488), 15 (:497).
- Reuse found: `e2e-ctcourse` pair helpers (`scripts/e2e-ctcourse.mjs:111-178`, leg-up at :157), `e2e-sectorops` part 6
  campus walk and connector cycle (`scripts/e2e-sectorops.mjs:1948`), `SectorRoute` lists (`src/game/sectors.ts:73`),
  `loop.stepHeadless` (`src/core/loop.ts:75`), V6 resolver internals (`origin/feature/level-validator-v6:
  src/world/levelMeasure.ts` `edgePoint` :481, `pathLength` :522), alone steps via `scripts/laptop-queue/serve.mjs`.
- Next: lead starts the J13 plan checker (fresh Opus, `docs/templates/plan-check.md`) on the pushed head; on PASS, brief
  R1, R2 and R3 builders in parallel and send PLAN "G1" to Guard AI.

## Done
- 2026-10-25 ~17:30-18:00 Opus planner: read RULES, VISION, agent preamble, G330 / G289 / G272 / G48, ROADMAP Decided,
  FOLDED-PLAN, conformance rows, level-design 14-15, graph schema (master and V6), e2e and AI code; wrote BRIEF
  (251d064cd) and PLAN (9b48a1132 + claims note); rewrote this STATE.
