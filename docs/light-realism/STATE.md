# light-realism - STATE

## Resume block (2026-10-25 ~22:00, L0 checked PASS + datasheet fold)
- Job: FOLDED-PLAN J10. Lead: Night Shift | Sector Ops Build. Job branch `feature/light-realism`; L0 on
  `feature/light-realism-l0` (worktree `C:/NightShift/Mobile-Coop-light-realism-l0`, cut from master a3058759d).
  Never merge master in.
- Phase: plan PASS (`PLAN-CHECK.md`). L0 built, checked PASS (`checks/l0-check.md`, 5a201b56d), then folded
  (`checks/l0-fold-build.md`). L1 not started.
- Read: `BRIEF.md` (A1-A14), `PLAN.md` (L0, L1 with its new bullets: lamps add in lux, reference shape, note 2),
  `research/bands.md`, `SIGNOFF.md`, `measure/calibration.md` (sections 3 and 5).
- Michael picked 2026-10-25 ~21:00 "Yes, numbers only (Recommended)": RAB ALEDS3T 6 m readings 32.1 / 53.9 / 47.7 /
  25.4 / 11.2 lx at 0-12 m in `calibrate.ts` `REFERENCE`; credited in `docs/art-credits.md`; no IES file in the repo
  (test). Fit missed on lamp shape: RMS level error 0.318, verdict stays "chosen, not measured".
- Lamps add in lux in the measure (A14; `lux.ts` `sumLux`, `luxGrid.ts`): two overlapping S1 columns read 10.5 lx,
  not ~41. Engine still adds levels; the engine change is written in PLAN L1, not taken.
- Open before the L2 briefs: interior bands over 178 lx (PLAN L1 "Open before the L2 briefs", note 2).
- GPU "before" run still pending: laptop request `20261025T092215-night-shift-sector-o-8e20a7a7-af43` at 8e20a7a77
  (set `light-realism-l0`), results to `shots/light-realism-s1`; fill `measure/calibration.md` section 4 (a
  meter-field split over 0.02 goes to J11).
- For L1: S1 "before" car park ~1 lx vs P11a 14 lx (`measure/campusOps-s1.json`, made before A14; re-measure with
  the new reading); one column at intensity 0.9 gives 5.6 lx under itself; the engine column throws too short versus
  the real fitting, so plan spacing / reach / cone tilt; judge forecourt, bikes and yard by point minimum and U0.
- Machine note: this worktree's `node_modules` junction points at `Mobile-Coop-coop-real/node_modules`.
- Files owned elsewhere: `docs/sector-redesign/SPEC.md` (PR #433 first); `src/world/maps/campusV2/*` (J17);
  warehouseOps files (frozen, A1); ctcourse sets (Marlow Build).

Next: L1 (S1 car park light point, south row, tune to P11a on the lux-sum reading) and SIGNOFF.md for Michael.

## Done
- 2026-10-25 ~09:08: S1 probe scripts (`scripts/light-realism/s1-grid.mjs`, `s1Grid.ts`, `s1-shots.mjs`), commit
  bd8b843e; grid output 4879884e.
- 2026-10-25 evening: BRIEF, research/bands.md, PLAN, STATE rewritten (J10 planner); S1 cause isolated with a scratch
  probe (no repo change).
- 2026-10-25 late evening: plan check 1 (FIX, 4 items) answered: PLAN revision 1 (claims block and order, L0
  reference test, done lines, J20 and warehouseOps notes), BRIEF A13, SIGNOFF.md.
- 2026-10-25 ~20:30: L0 built on `feature/light-realism-l0` (bced72b2a, 6a0f51947, 8e20a7a77 + report): curve, band
  check, reference test ("chosen, not measured"), lux-grid, shots, S1 before measure; GPU before run queued.
- 2026-10-25 ~21:30: L0 checked PASS (5a201b56d); fold: RAB reference (Michael's pick), credit, lamps add in lux
  (A14), note 2 recorded (`checks/l0-fold-build.md`).

## History
- The 09:08 save's planner output (BRIEF, PLAN, research, S1 write-up) was lost (CONFORMANCE L14); rewritten here.
