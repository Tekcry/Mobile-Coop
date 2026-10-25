# validator-port - state

Owner: Marlow Build. Status: current.

## Resume (2026-10-25, plan written; read this block first)
- Job J12 (FOLDED-PLAN section 4, origin/feature/menu; ROADMAP Now row 14). Lead: Night Shift | Marlow Build. The one
  live level-validator STATE (conformance V11); the archived record is `docs/archive/level-validator/STATE.md`.
- Branch `feature/validator-port`, worktree `C:/NightShift/Mobile-Coop-validator-port`, cut from origin/master 2148ec96.
  Holds only `docs/validator-port/{BRIEF,PLAN,STATE}.md`. No code yet.
- Gate before building: the plan checker reads BRIEF + PLAN (ROADMAP row 14 gate "plan checker").
- Open questions for the lead (none blocks wave 1): L1 Q24 late-section rules `BRIEF.md:165`, L2 null measured reach
  `BRIEF.md:167`, L3 mission node on a training map `BRIEF.md:169`.
- Sources being ported (read only, never merged; PLAN section 4 at `PLAN.md:164`):
  - V6 `origin/feature/level-validator-v6` 8f551e18: `src/world/levelMeasure.ts`, `scripts/level-measure.mjs`,
    `scripts/level-validate.mjs:977-1075` (`checkMeasured`), tests, campus graph positions.
  - V7 `origin/feature/level-validator-v7` 97873079: `docs/marlow-final/graph/ctcourse.json`,
    `docs/level-validator/marlow-run/REPORT.md`.
  - MV `origin/feature/mission-validator` 0c62a921: `scripts/mission-validate.mjs`, `tests/missionValidate.test.ts`,
    `docs/level-validator/mission-schema.md`, `example.mission.json`, `mission_*` sheet rows.
- Master code the slices change (2148ec96):
  - `scripts/level-validate.mjs:59-61` modes / route rules, `:239-243` `linkTime`, `:587` `gateReach`, `:883-899`
    co-op coverage, `:913` solo-twin severity, `:1161-1185` `validate`, `:1190-1211` `parseArgs`.
  - `scripts/metrics-gen.mjs:221-227` (any flag but `--check` falls through to the write: V12).
  - `docs/design/scale-sheet.md:141-167` section 8 (new rows: S7a).
  - `docs/level-design.md:271-278` 11.9 coverage [All] (Q29), `:37-50` training profile (Q24), `:483-487` 14 greybox
    exit, `:494-496` 15 measured line, `:629-670` rule index (docs slices D-A, D-C).
- Slices and claims: `PLAN.md:39` (table), detail `PLAN.md:69`. PRs A-D: `PLAN.md:11`.
- Wave 1 (`PLAN.md:192`), parallel, each in `C:/NightShift/Mobile-Coop-validator-port-<slice>` on
  `feature/validator-port-<slice>`:
  - S0 Opus, from `feature/validator-port` (`PLAN.md:71`).
  - S1 Opus, from origin/master into `feature/validator-port-measure` (`PLAN.md:89`).
  - S2 Sonnet, same base as S1 (`PLAN.md:99`).
  - S7a Sonnet, from origin/master (`PLAN.md:105`; cloud builder eligible).
- Running agents: none. Stale branches v6 / v7 / mission-validator: superseded once PRs A-D land (mark here then).

Next: plan checker on BRIEF + PLAN head; on PASS write the S0, S1, S2, S7a briefs from `PLAN.md:71-110` and launch
wave 1.

## Done
- 2026-10-25 WIP fix round 1 (plan check on cd0a5f68, FIX): items 1-5 and P1-P9 all left; reading sources done.
- 2026-10-25: BRIEF.md (0ecde9a9) and PLAN.md (ad9b40f8) written by the Opus planner; STATE.md (this file).

## History
- The validator's earlier record (V0-V5, #346, V6 on its branch): `docs/archive/level-validator/STATE.md`. Its V6
  "running" lines (v6 8f551e18 `docs/level-validator/STATE.md:8-10`) are stale: the branch holds V6e-2 and four fix
  commits, all carried by this plan.
