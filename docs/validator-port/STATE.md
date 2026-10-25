# validator-port - state

Owner: Marlow Build. Status: current.

## Resume (2026-10-25, plan-check fix round 1 done; read this block first)
- Job J12 (FOLDED-PLAN section 4 and row J12 line 172, origin/feature/menu; ROADMAP Now row 14). Lead: Night Shift |
  Marlow Build. The one live level-validator STATE (conformance V11); archived record:
  `docs/archive/level-validator/STATE.md`.
- Branch `feature/validator-port`, worktree `C:/NightShift/Mobile-Coop-validator-port`, cut from origin/master
  2148ec96; master is now 94e72b1c (4.103.3, #443 merged). Holds only `docs/validator-port/{BRIEF,PLAN,STATE}.md`.
- Gate: a fresh Opus plan checker on BRIEF + PLAN. Round 1 (FIX on cd0a5f68, report
  `C:/NightShift/scratch/marlow/j12-plan-check.md`) is answered: fixes 1-5 and polish P1-P9 (Done below).
- Lead decisions applied in round 1 (not to reopen): J13's `resolvePoints` shape, links by merged index
  (`PLAN.md:303-313`, S1 `PLAN.md:114`, S2 `PLAN.md:129`); split legs = one route A23 `BRIEF.md:119`; ghost path INFO
  on training, no-kill ERR everywhere A10 `BRIEF.md:125`; relay lip derived after #443 A24 `BRIEF.md:146`; PR sizes as
  pr-size counts them `PLAN.md:28-51`; six new co-op kinds A25 `BRIEF.md:203`.
- Relay lip band ANSWERED (~20:20): "Keep 4.6 m (Recommended)" (`BRIEF.md:68`). S7a writes the 6.5 m derivation as the
  physical ceiling only; the row's top and `metrics.json` stay 4.6 (`PLAN.md:138`).
- PRs (`PLAN.md:33-39`): A gate core (S0, S3) ~1,390; B measure core (S1) ~1,050; B2 measure CLI + sheet rows (S2,
  S7a) ~740; C training, perfect run, CI, graphs (S4, S6, S5, S7b, S9, S10) ~1,350; D mission re-cut (S8) ~1,060.
  Fallbacks `PLAN.md:49-51`. Order: A and B, then B2, then C, then D (`Job-done` on D).
- Sources being ported (read only, never merged; carry-over table `PLAN.md:215`):
  - V6 `origin/feature/level-validator-v6` 8f551e18: `src/world/levelMeasure.ts` (589), `scripts/level-measure.mjs`
    (438), `scripts/level-validate.mjs:977-1075` (`checkMeasured`), tests, campus graph positions.
  - V7 `origin/feature/level-validator-v7` 97873079: `docs/marlow-final/graph/ctcourse.json`, marlow-run `REPORT.md`.
  - MV `origin/feature/mission-validator` 0c62a921: `scripts/mission-validate.mjs`, its test, schema, example, rows.
  - J14 stand-ins for the A25 kinds: origin/feature/marlow-replan `docs/marlow-replan/graph.json` (`move` fields).
- Master code the slices change (94e72b1c; unchanged since 2148ec96 unless noted):
  - `scripts/level-validate.mjs:29-55` kind sets, `:59-61` modes, `:225-227` `soloArcsOf`, `:239-243` `linkTime`,
    `:459-475` kit bands, `:883-899` coverage, `:913` solo twin, `:1161-1185` `validate`, `:1190-1211` `parseArgs`.
  - `scripts/metrics-gen.mjs:109` relay key, `:211-227` flags (V12); `docs/design/scale-sheet.md:56` relay row
    (#443), `:141-167` section 8.
  - `docs/level-design.md` (moved by #443): training profile `:39-60`, 11.9 `:306-313`, 14 greybox exit `:537-541`,
    15 measured line `:548-550`, rule index `:697-745`.
- Wave 1 (`PLAN.md:243`), each in `Mobile-Coop-validator-port-<slice>` on `feature/validator-port-<slice>`:
  S0 Opus (`PLAN.md:90`), S1 Opus (`PLAN.md:114`), S2 Sonnet (`PLAN.md:129`), S7a Sonnet (`PLAN.md:138`; cloud ok).
- Running agents: none. J13 (route-runs-2 `docs/route-runs/PLAN.md:204`) keeps `resolvePoints` as the interface.

Next: fresh plan checker on d24920f6c (BRIEF + PLAN head; later commits touch STATE only).

## Done
- 2026-10-25 fix round 1 (plan check FIX on cd0a5f68): 1 J13 `resolvePoints` + `--points`, no link id (9202d10f);
  2 split legs = one route, A23, S4 cases (e478e008); 3 relay lip A24 in S7a (c0bfacc5); 4 ghost INFO on training
  (c12a9dcb); A25 new kinds (04c07a84); 5 PR recount, five PRs, fallbacks (cc969b5d); P1-P7, P9 (6b90717d,
  c395ec6c, d24920f6); P8 this STATE.
- 2026-10-25: lead answers L1-L3 in BRIEF (cd0a5f68).
- 2026-10-25: BRIEF.md (0ecde9a9) and PLAN.md (ad9b40f8) written by the Opus planner; STATE.md (this file).

## History
- The validator's earlier record (V0-V5, #346, V6 on its branch): `docs/archive/level-validator/STATE.md`. Its V6
  "running" lines (v6 8f551e18 `docs/level-validator/STATE.md:8-10`) are stale: the branch holds V6e-2 and four fix
  commits, all carried by this plan.
