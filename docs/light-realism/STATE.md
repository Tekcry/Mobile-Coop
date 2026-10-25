# light-realism - STATE

## Resume block (2026-10-25 evening)
- Job: FOLDED-PLAN J10 (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md` s3 rows 20-21, s4 J10). Lead: Night
  Shift | Sector Ops Build. Branch `feature/light-realism`, worktree `C:/NightShift/Mobile-Coop-light-realism`; branch
  base is older master (6c3f4a87): never merge master in; slice branches `feature/light-realism-<slice>` cut from
  origin/master.
- Read: `BRIEF.md` (Michael's words, picks, A1-A12), `PLAN.md` (slices L0-L5, claims, checks), `research/bands.md`
  (band table, lux curve `level = 0.28 + 0.32 x log10(lux)`).
- Phase: plan written, waiting on the fresh Opus plan checker (RULES Intake 4). No code yet.
- The S1 cause (PLAN section 0): column lamps sit on their own pole tops (`src/world/maps/campusS1.ts:232-233`,
  `:236-237`, lane `:222-223`); the half-cell grown pole (`src/voxel/lampBake.ts:163`) reaches the light point and the
  march stops only 0.25 m short (`lampBake.ts:25`, loop `:263-275`), so the pole hides its lamp within ~6.7 m of its
  foot; exempted by `tests/lampBoxAlign.test.ts:206-208`. Probe (scratch, master src): a 0.8 m arm offset lifts the
  lamps' mean at y 1.0 0.033 -> 0.196, field mean 0.282 -> 0.499. Second gap: no column over the two south bay rows
  (cars z -73.75 / -69.25, `campusS1.ts:137`).
- Questions for Michael: none now; the S1 decision pack (L1) carries two picks (anchors A2, category A5) and the
  approval of the band table + S1 light map (Q3).
- Files owned elsewhere: `docs/sector-redesign/SPEC.md` lighting rules (PR #433, J1, rewrites first);
  `src/world/maps/campusV2/*` (J17); warehouseOps files (frozen, A1); ctcourse sets (Marlow Build).
- GPU: only through the laptop queue alone slot (`request.mjs ... --alone --step "serve scripts/light-realism/..."`).
- Existing measure: `docs/light-realism/measure/s1-grid.json` (3,276 lines; L0 replaces it with the compact format).

Next: start the fresh Opus plan checker on BRIEF + PLAN at this head; on PASS brief L0 (Opus) on `feature/light-realism-l0`.

## Done
- 2026-10-25 ~09:08: S1 probe scripts (`scripts/light-realism/s1-grid.mjs`, `s1Grid.ts`, `s1-shots.mjs`), commit
  bd8b843e; grid output 4879884e.
- 2026-10-25 evening: BRIEF, research/bands.md, PLAN, STATE rewritten (J10 planner); S1 cause isolated with a scratch
  probe (no repo change).

## History
- The 09:08 save's planner output (BRIEF, PLAN, research, S1 write-up) was lost (CONFORMANCE L14); rewritten here.
