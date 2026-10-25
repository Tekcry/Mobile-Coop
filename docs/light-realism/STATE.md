# light-realism - STATE

## Resume block (2026-10-25 ~20:30, L0 built)
- Job: FOLDED-PLAN J10. Lead: Night Shift | Sector Ops Build. Job branch `feature/light-realism`; L0 on
  `feature/light-realism-l0` (worktree `C:/NightShift/Mobile-Coop-light-realism-l0`, cut from master a3058759d).
  Never merge master in.
- Phase: plan PASS (`PLAN-CHECK.md`, 7bbdfaf58). L0 built and pushed; not yet checked. L1 not started.
- Read: `BRIEF.md` (A1-A13; A13 `BRIEF.md:100-106`), `PLAN.md` (L0 `:132-179`, L1 `:181-215`), `research/bands.md`,
  `SIGNOFF.md`, L0 report `checks/l0-build.md`.
- L0 code: `src/world/lux.ts` (curve, `bandCheck`), `tests/lux.test.ts` (12 tests, green),
  `scripts/light-realism/calibrate.ts` (reference test), `luxGrid.ts` + `lux-grid.mjs` (per-space lux, any job map),
  `shots.mjs` (GPU, `--video`), `docs/light-realism/spaces/campusOps.json` (S1 rows + shot plan).
- Done line: `lux-grid.mjs --map campusOps --section 1` reproduces the car park's 0.282 at y 1.0 (52% dark, 0% lit);
  S1 before: car park 1.03 lx at the ground against P11a 14 lx (`measure/campusOps-s1.json`, SVGs in
  `measure/campusOps-s1/`; table in `checks/l0-build.md`).
- Reference test: verdict "chosen, not measured" (A13; no maker's web page with candela / iso-lux data found without
  a download). `REFERENCE` in `calibrate.ts` is the data slot; `measure/calibration.md` section 3 has the search and
  the undo. SIGNOFF.md's "L1:" line takes "the anchors are chosen, not measured" unless Michael allows a datasheet.
- GPU "before" run queued, not waited for: laptop request `20261025T092215-night-shift-sector-o-8e20a7a7-af43` at
  8e20a7a77 (set `light-realism-l0`), results to `shots/light-realism-s1`; when it lands, write its splits and L5
  targets into `measure/calibration.md` section 4 (a meter-field split over 0.02 goes to J11).
- Deviations (`checks/l0-build.md` "Deviations"): free fit holds the 1 lx anchor (both anchors are not solvable from
  one fitting); real side adds the 0.77 lx night floor; `luxGrid.ts` loads campusOps and warehouse only.
- For L1: column profile at intensity 0.9 is 5.6 lx under the lamp (`calibration.md` engine table); forecourt, bike
  shelter and yard means are lifted by bollard / dock-lamp hot cells, judge them by point minimum and U0 (L2-S1).
- Machine note: this worktree's `node_modules` junction now points at `Mobile-Coop-coop-real/node_modules` (the master
  folder's is empty).
- Files owned elsewhere: `docs/sector-redesign/SPEC.md` (PR #433 first); `src/world/maps/campusV2/*` (J17);
  warehouseOps files (frozen, A1); ctcourse sets (Marlow Build).

Next: fresh Opus checker on L0 (`feature/light-realism-l0` head, `checks/l0-build.md`), then L1 + SIGNOFF.md to Michael.

## Done
- 2026-10-25 ~09:08: S1 probe scripts (`scripts/light-realism/s1-grid.mjs`, `s1Grid.ts`, `s1-shots.mjs`), commit
  bd8b843e; grid output 4879884e.
- 2026-10-25 evening: BRIEF, research/bands.md, PLAN, STATE rewritten (J10 planner); S1 cause isolated with a scratch
  probe (no repo change).
- 2026-10-25 late evening: plan check 1 (FIX, 4 items) answered: PLAN revision 1 (claims block and order, L0
  reference test, done lines, J20 and warehouseOps notes), BRIEF A13, SIGNOFF.md.
- 2026-10-25 ~20:30: L0 built on `feature/light-realism-l0` (bced72b2a, 6a0f51947, 8e20a7a77 + report): curve, band
  check, reference test ("chosen, not measured"), lux-grid, shots, S1 before measure; GPU before run queued.

## History
- The 09:08 save's planner output (BRIEF, PLAN, research, S1 write-up) was lost (CONFORMANCE L14); rewritten here.
