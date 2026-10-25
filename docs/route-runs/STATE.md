# route-runs - STATE
Owner: Marlow Build. Status: current.

## Resume (2026-10-25 ~21:00)
- Job: FOLDED-PLAN J13 (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md:173`; ROADMAP Now row 14, G330, Q7
  "Never stuck"); lead Night Shift | Marlow Build. Branch `feature/route-runs-2` in
  `C:/NightShift/Mobile-Coop-route-runs-2`, cut from master 2148ec969 (stale `feature/route-runs`: do not use).
- Stage: plan-check fix round 2 done on check 2 of 6bf1f95cb (`C:/NightShift/scratch/marlow/j13-plan-check-2.md`, FIX,
  1 item + polish P1-P9). BRIEF / PLAN content head 6fab6ef0f; nothing built yet. Check 1 items all held (check 2).
- Fix 1 (Q7: detections never fail a run), where it landed:
  - Restarts by cause: seen = detection (`restart: set | retry`), never a stop; second seen from one space = set's
    spotted / retry rule off + robots placed past the link, a push past, walk card "seen again at <place>, robot pushed
    past". Timer = `restart: timer`, not a detection; second on one step = drill stubs (`why: timer`), M9 "not made at
    sneak pace". Other (no guard, camera or timer) = the only `restart-loop` dead stop. BRIEF Scope "Restarts and
    retries" `BRIEF.md:117-138`, Dead stops `:77-82`, walk-card `:141-143`, M9 `:144-149`, A5 `:198-201`, A14 `:223-232`.
  - R2 pass rule and JSON (`restarts[]`, `drills[].why`, `pushedPast`, `notAtSneakPace`) and done line (push past and
    two timer retries give `pass`; two `other` give `fail`) `PLAN.md:89-121`; R4c causes and done line
    `PLAN.md:192-219`; Risks `PLAN.md:354-358`.
- Polish done: P1 R8 reruns claims-check when cut, no fixed wait list (`PLAN.md:32-39`, R8 `:257-259`); P2 R6 guard also
  compares each merged index's from / to / kind (`PLAN.md:237-241`); P5 A4 `DRIFT_S` "comes with J12 S2"
  (`BRIEF.md:190-197`); P6 bay index from `CourseDef.bays` by id (`BRIEF.md:113-116`, R4a `PLAN.md:142-145`); P7
  campaign strict-rule restarts out of scope, J23's (BRIEF Limits `:160-164`, R4c `PLAN.md:209-211`); P8 `steps.mjs`
  seam is Node-side `step(ctx, link)` with both pages (`PLAN.md:154-158`); P9 A13 10 s fallback covers a `teach` space
  tag (`BRIEF.md:218-222`). Skipped by the lead: P3 (J12's file), P4 (J14's graph fields).
- Master facts used (94e72b1cd): course hooks `src/game/modes/courseMode.ts:204` (`restarts`), `:285` (`courseBay`),
  `:483` (`verb`), `:593-596` (`spotFail`), `:1039` (locks), `:1078` (`debug`); `src/game/course/courseState.ts:501`
  (`tick`), `:796` (`nextDrill`); `src/game/course/courseDef.ts:162` (`BayDef`), `:231` (`CourseDef.bays`). Master's
  course has no timed retries; J14's REPLAN "If it goes wrong" column has them (A2 blackout, A4 loop, A8 timed step).
- J14 re-plan: origin/feature/marlow-replan `docs/marlow-replan/REPLAN.md`; J12: origin/feature/validator-port
  `docs/validator-port/PLAN.md` section 8. Do not edit those files.
- Open question for Michael: BRIEF Q1 (co-op moves stubbed vs real); default A1. No new question.
- Next: fresh plan checker on 6fab6ef0f (BRIEF + PLAN; later commits touch STATE only).

## Done
- 2026-10-25 ~20:40-21:00 Fix round 2 (Opus planner): BRIEF Q7 fix 4fac34ba8, PLAN Q7 fix 73c8fb67e, polish
  0e34bee0e, rewrap 6fab6ef0f.
- 2026-10-25 ~19:45-20:30 Fix round 1 (Opus planner): finished the dead agent's BRIEF edit (late sections "after"
  `taught_by`, not "at or after"; drill hold from `teach` time, not `drill_s`; A13-A15 added); BRIEF 318f3fa6b,
  6bf1f95cb; PLAN 34b99125b (R4c, seams, R8 order and LD scope, resolvePoints, dependencies, risks).
- 2026-10-25 ~19:10 Fix round 1 started; lead's item 6 decision: keep `resolvePoints` (J12 S1/S2), merged index.
- 2026-10-25 ~17:30-18:00 Opus planner: read RULES, VISION, agent preamble, G330 / G289 / G272 / G48, ROADMAP Decided,
  FOLDED-PLAN, conformance rows, level-design 14-15, graph schema (master and V6), e2e and AI code; wrote BRIEF
  (251d064cd) and PLAN (9b48a1132 + claims note); rewrote this STATE.
