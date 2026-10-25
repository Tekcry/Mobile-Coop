# validator-port - state

Owner: Marlow Build. Status: current.

## Resume (2026-10-25 ~21:45, plan-check fix round 2 done; read this block first)
- Job J12 (FOLDED-PLAN section 4, row J12 line 172, origin/feature/menu; ROADMAP Now row 14). Lead: Night Shift |
  Marlow Build. The one live level-validator STATE (conformance V11); archive: `docs/archive/level-validator/STATE.md`.
- Branch `feature/validator-port`, worktree `C:/NightShift/Mobile-Coop-validator-port`, cut from origin/master
  2148ec96; master is now 4e5e9959 (4.103.5), no change to J12's files since 94e72b1c. Holds only
  `docs/validator-port/{BRIEF,PLAN,STATE}.md`.
- Gate: a fresh Opus plan checker on BRIEF + PLAN. Round 1 (FIX on cd0a5f68) and round 2 (FIX on c4ed19163, report
  `C:/NightShift/scratch/marlow/j12-plan-check-2.md`) are answered: fixes 1-4, A27 check, P1-P9 (Done below).
- Lead decisions (not to reopen): `resolvePoints` shape `PLAN.md:448`; split legs = one route A23 `BRIEF.md:124`;
  ghost INFO on training A10 `BRIEF.md:131`; relay "Keep 4.6 m" A24 `BRIEF.md:161`, `BRIEF.md:68`; PR sizes
  `PLAN.md:28-52`; new kinds A25 `BRIEF.md:218`; side routes on the section interior A26 `BRIEF.md:238`, S4
  `PLAN.md:233`; J24 seam (coop-kit's side on rope, ladder, bands) A12 `BRIEF.md:142`, `PLAN.md:383-401`.
- Round 2 results: claims block `PLAN.md:54-93`, overlaps and order `PLAN.md:408-439` (claims-check: 27 overlaps,
  42 plans); `mergeGraphs` moves into the lib, re-exported (S0 `PLAN.md:135`, section 8 `PLAN.md:464`).
- A27 long throw `BRIEF.md:266-292`: per-link `exception: "long_throw"`, cap = Michael's 4.9 m gap (`BRIEF.md:273`,
  why `:288`; an earlier 5.8 m cap was dropped); the two spots kept, sourced to Campaign Build's tallow-fixes M2 on
  origin/feature/mission-engine 6df8f334f (`BRIEF.md:276`). S7a row `PLAN.md:202`, S7b case `PLAN.md:264`.
- PRs (`PLAN.md:33-39`): A (S0, S3) ~1,430; B (S1) ~1,200; B2 (S2, S7a) ~830; C (S4, S6, S5, S7b, S9, S10) ~1,410;
  D (S8) ~1,060. Fallbacks `PLAN.md:50-52`. Order A and B, then B2, then C, then D (`Job-done` on D).
- Sources (read only, never merged; carry-over `PLAN.md:306`): V6 origin/feature/level-validator-v6 8f551e18
  (`levelMeasure.ts` 589, `level-measure.mjs` 438, `checkMeasured` `scripts/level-validate.mjs:977-1073`); V7
  97873079 (`docs/marlow-final/graph/ctcourse.json`, REPORT); MV origin/feature/mission-validator 0c62a921; J14
  stand-ins origin/feature/marlow-replan `docs/marlow-replan/graph.json`.
- Master code the slices change (unchanged since 2148ec96 unless noted): `scripts/level-validate.mjs:29-55` kind
  sets, `:225-227` `soloArcsOf`, `:239-243` `linkTime`, `:252-273` `mergeGraphs`, `:459-475` kit bands, `:659`
  `checkEncounters`, `:1161-1185` `validate`, `:1190-1211` `parseArgs`; `scripts/metrics-gen.mjs:109-111`,
  `:211-227`; `docs/design/scale-sheet.md:56-58` (relay, rope, throw gap); `docs/level-design.md:39-60`, `:306-313`
  (11.9), `:537-541`, `:548-550`, `:697-745`.
- Wave 1 (`PLAN.md:334`), each in `Mobile-Coop-validator-port-<slice>` on `feature/validator-port-<slice>`: S0 Opus
  (`PLAN.md:135`), S1 Opus (`PLAN.md:163`), S2 Sonnet (`PLAN.md:181`), S7a Sonnet (`PLAN.md:197`; cloud ok).
- Lead messages owed (not sent by planners): Player Build, confirm the J24 seam (`PLAN.md:400`); J13 lead, the A26
  count via `sectionRoutes` (`PLAN.md:468`) and drop the stale `spaceCells` / `linkPoint` / `linkPath` names
  (`PLAN.md:472`); Campaign Build, A27 cap is 4.9 m, Tallow sets `exception` and 4.9 m `width` (`PLAN.md:373`).
- Running agents: none.

- Plan check 3 PASS on 10b613dd3 (C:/NightShift/scratch/marlow/j12-plan-check-3.md). Wave 1 running (~22:00): S0 Opus in
  C:/NightShift/Mobile-Coop-validator-port-s0 (feature/validator-port-s0), S1 Opus in
  C:/NightShift/Mobile-Coop-validator-port-measure (feature/validator-port-measure), S2 Sonnet from S1 first push, S7a on
  cloud-queue `briefs/validator-port-s7a.md` (feature/validator-port-s7a). Player Build told the J24 seam.
- Lead polish left (one docs commit here): check-3 P1-P6; Campaign Build ~21:30: Tallow C5 link becomes 32 after J8 D0
  deletes link 30 (match is map:from>to, so only the BRIEF / PLAN "link 33" wording goes stale); both spots
  `exception: "long_throw"`, gap 4.9 m; pie link 29 stays a plain throw.
Next: S0 done -> merge into feature/validator-port (PR A), brief wave 2 (S3, S4, S6, S7b, S5, S8); S1 first push -> S2.

## Done
- 2026-10-25 fix round 2 (plan check 2 FIX on c4ed19163, report `C:/NightShift/scratch/marlow/j12-plan-check-2.md`):
  Michael's relay pick in BRIEF (197d6ae0); 1 side routes A26, S4 cases, J13 line (3b04793c); 2 claims block and
  section 7 overlaps with order (c39686fe, 0953c9d8, count 7a405738); 3 J24 seam: rope both ways, no `ladder_grab_m`,
  band rows with coop-kit PRs (cd3b26a5, S0 INFO text and agreement line 5b108b9b); 4 `mergeGraphs` into the lib,
  PR A ~1,430 (4d411464); A27 long-throw exception (ce9c2cc8), cap set to Michael's 4.9 m gap, spots sourced
  (ff723887); P1, P2 (in 0953c9d8 / 3b04793c), P3-P9 (10b613dd); this STATE.
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
