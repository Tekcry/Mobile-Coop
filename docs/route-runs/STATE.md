# route-runs - STATE
Owner: Marlow Build. Status: current.

## Resume (2026-10-25 ~20:30)
- Job: FOLDED-PLAN J13 (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md:173`; ROADMAP Now row 14, G330, Q7
  "Never stuck"); lead Night Shift | Marlow Build. Branch `feature/route-runs-2` in
  `C:/NightShift/Mobile-Coop-route-runs-2`, cut from master 2148ec969 (stale `feature/route-runs`: do not use).
- Stage: plan-check fix round 1 done on the check of 32b709dc (`C:/NightShift/scratch/marlow/j13-plan-check.md`, FIX,
  6 items + polish). BRIEF / PLAN content head 6bf1f95cb; nothing built yet.
- Fix items, where they landed:
  1. Marlow drill gates and restarts: `BRIEF.md:104-123`, A13 / A14 `BRIEF.md:197-206`, M9 line `BRIEF.md:129-133`;
     new slice R4c `PLAN.md:179-196` (course.mjs, selftest-course fixture covers both).
  2. Late side routes (after `meta.taught_by`, J12 BRIEF A9): `BRIEF.md:51-63`, First users `BRIEF.md:137-141`; R1
     `PLAN.md:60-88` (training fixture with a late section); R8 Marlow baseline vs J14 gate run `PLAN.md:233-250`.
  3. Stuck tolerances out of level-design: A4 `BRIEF.md:172-180`, A1 not in LD until Q1 `BRIEF.md:162-164`; R8 writes
     only Q7's sentence into LD 14 (2) / 15 and the rest into testing-tools "Route-runs" `PLAN.md:233-250`.
  4. R8 order after #443, #436, J12 D-A / D-C, J20 PR-A / PR-B / #445, doc-level: `PLAN.md:32-43`.
  5. No shared files between parallel slices: R4a seams `PLAN.md:144-153`; ownership order `PLAN.md:293-296`.
  6. J12 interface = `resolvePoints(graph, nav, opts)` / `level-measure.mjs --points`, links keyed by merged index (no
     link `id`): Dependencies row 1 `PLAN.md:280`, R6 `PLAN.md:210-224`.
  Polish: campus fixture refresh after J12 S10 (`PLAN.md:80`); guards-alive check A15 (`BRIEF.md:207-209`); 3-4 player
  Sector Ops guards (`BRIEF.md:147-148`); why R1-R5 start before J12 (`PLAN.md:287-292`); sectorops cited by part name.
- Master facts used (94e72b1cd): LD Training profile `docs/level-design.md:39-60` (#443: one route, late side routes on
  campaign route rules, all failures retries, drills retry in place); LD 14 (2) `:539-541`, LD 15 route-run line `:551`;
  course hooks `src/game/modes/courseMode.ts:204` (`restarts`), `:483` (`verb`), `:593-596` (`spotFail`), `:1039`
  (locks), `:1078` (`debug`); `src/game/course/courseState.ts:501` (`tick`), `:796` (`nextDrill`).
- J14 Marlow re-plan (approved 19:16): origin/feature/marlow-replan `docs/marlow-replan/REPLAN.md:7`, `:13`, `:26`;
  its `graph.json` has no `meta.taught_by` yet (J14 adds it, J12 PLAN section 7). Note: J14 `BRIEF.md:47` (A2, A8
  plays a detection out) is older than `REPLAN.md:26` (A8: guards react, then retry in place); this plan follows REPLAN.
- J12: origin/feature/validator-port `docs/validator-port/PLAN.md:89-97` (S1), `:124-130` (S4), `:232-247` (section
  8, being fixed by another agent to promise `resolvePoints`); `BRIEF.md:96-106` (A8 / A9). Do not edit those files.
- Open question for Michael: BRIEF Q1 (co-op moves stubbed vs real), `BRIEF.md:211-216`; default A1. No new question.
- Next: fresh plan checker on 6bf1f95cb (BRIEF + PLAN; later commits touch STATE only).

## Done
- 2026-10-25 ~19:45-20:30 Fix round 1 (Opus planner): finished the dead agent's BRIEF edit (late sections "after"
  `taught_by`, not "at or after"; drill hold from `teach` time, not `drill_s`; A13-A15 added); BRIEF 318f3fa6b,
  6bf1f95cb; PLAN 34b99125b (R4c, seams, R8 order and LD scope, resolvePoints, dependencies, risks).
- 2026-10-25 ~19:10 Fix round 1 started; lead's item 6 decision: keep `resolvePoints` (J12 S1/S2), merged index.
- 2026-10-25 ~17:30-18:00 Opus planner: read RULES, VISION, agent preamble, G330 / G289 / G272 / G48, ROADMAP Decided,
  FOLDED-PLAN, conformance rows, level-design 14-15, graph schema (master and V6), e2e and AI code; wrote BRIEF
  (251d064cd) and PLAN (9b48a1132 + claims note); rewrote this STATE.
