# light-realism L0 - check

Checker: fresh Opus 5.5 (for Night Shift | Sector Ops Build), 2026-10-25. Checked head 2253553bd on
`feature/light-realism-l0` against its base a3058759d (merge-base with origin/master), PLAN L0 (`PLAN.md:248-295`),
BRIEF A2 / A3 / A4 / A13 and the build report `checks/l0-build.md`. No strict L0 brief exists under `briefs/`.

## Verdict: PASS

## What was checked
- Claims: every changed file is inside the job's claims block (`src/world/lux.ts`, `tests/lux.test.ts`,
  `scripts/light-realism/**`, `docs/light-realism/**`). No engine file touched (`lampBake.ts`, `lightField.ts`,
  `lampMath.ts`, `darkCurve.ts` unchanged), no map file, no flag, no wire or save path.
- Intent: the curve is BRIEF A2 exactly (1 lx = `LIGHT.shadow` 0.28, 10 lx = `LIGHT.lit` 0.60, tests tie the anchors
  to `LIGHT`); bands come from `research/bands.md` with "to verify" carried as `verify`; S1 car park is P11a 14 / 3 lx
  (A5); planes follow A3. The reference test takes A13's fallback honestly: `REFERENCE` is null, verdict
  "chosen, not measured" in `calibration.md`, the test pins the verdict line and the engine-side 5-point table. Not a
  fail (pending datasheet question to Michael).
- Correctness: `luxToLevel` / `levelToLux` clamp and round-trip; `bandCheck` averages lux (the standards' average,
  not level), checks floor, 2.5x ceiling, point minimum and U0. `calibrate.ts` uses `photoTerm` with point - light
  offsets (d - arm, -6, 0) and the S1 column's cone and reach; the closed-form one-parameter fit and the synthetic
  recovery test are right. The free-fit deviation (one anchor held) is correct and documented.
- Measure: committed `measure/campusOps-s1.json` park meter row (y 1.0) reads mean 0.282, 52% dark, 0% lit, the
  CONFORMANCE L3 numbers (PLAN L0 done line). My rerun of `lux-grid.mjs --space park` was held by the tool's own
  `--cpu-max` gate (desktop at 94-100% CPU for 6 min) and not forced; `--calibrate` reran and matches calibration.md.
- Rules: `lux.ts` is pure with no imports; nothing in `src/` imports it (grep test covers `src/game`, `ai`, `vfx`,
  `player`, `voxel`, `world/lightField.ts`); no gameplay reads graphics state; no hot path touched. Scripts are
  read-only on `src/`; the shots pusher only writes `shots/light-realism-*` via git plumbing (temp index).
- Checks run: `npm run typecheck:fast` clean; `npx vitest run tests/lux.test.ts --maxWorkers=2` 12 / 12 passed;
  `scripts/light-realism/luxGrid.ts` (outside tsconfig's include) type-checked standalone under strict +
  `noUncheckedIndexedAccess` + `verbatimModuleSyntax`: clean. No e2e (no game change, PLAN L0).

## Fix list
None.

## Open (not fixes)
1. GPU "before" shots (PLAN L0 gate): laptop request `20261025T092215-night-shift-sector-o-8e20a7a7-af43` at
   8e20a7a77 has no `laptop-e2e/light-realism-l0` status yet and `shots/light-realism-s1` does not exist on origin.
   The lead fills `calibration.md` section 4 when it lands; meter-field splits go to J11.
2. Datasheet for the reference test (A13 undo): Michael's question, as briefed.

## Lead notes (for L1 / L2, not L0 fixes)
1. Linear sum under a log label: lamps add linearly in level, the curve reads that sum as log lux, so overlapping
   pools compound. Two S1 columns each reading ~5.6 lx alone (`calibration.md` engine table, 0 m) sum to level
   0.796, which the curve reads as ~41 lx against ~12 lx real. The one-column reference test cannot see this. L1 tuning
   to P11a 14 lx could pass with fewer or dimmer columns than a real P11a site; worth one line on SIGNOFF.md, or a
   second reference point (the mid-point between two columns) when the datasheet arrives. A2 is BRIEF-level, so this
   is the lead's call, not a builder fix.
2. Interiors saturate: `LUX_CEIL` is 178 lx, so every band above it (gatehouse 320, offices 320, security 320) passes
   only where every cell reads level 1.0 (`src/world/lux.ts` `bandCheck`, `tests/lux.test.ts:92-99`). This is faithful
   to the curve but makes L2 interior passes all-or-nothing; decide before the L2 briefs whether interiors are judged
   at "level 1 everywhere" or a lower anchor-derived floor (bands.md 3b already lists them at level 0.92-1.0).

## Polish
1. `scripts/light-realism/luxGrid.ts:121` crop margin `R = 20` is fixed for the S1 reach (19.2 m); a lamp with a
   longer reach outside the crop is dropped by `touches` (`:133`). Derive R from the longest fixed-lamp reach in the
   map before L2 / L3-W run other sections and the warehouse.
2. `tests/lux.test.ts:170` walks only the PLAN's directory list; since nothing in `src/` should import `lux.ts` until
   J12's validator, walking all of `src/` (with an allow-list for the validator later) is stricter at no cost.
3. Lux means are dominated by hot cells next to low lamps (bollards, dock lamp), as the build report says: L2-S1
   should read point minimum and U0 with the mean.
4. Worktree `node_modules` junction was repointed locally to `Mobile-Coop-coop-real/node_modules` (build report
   deviation 6): machine note for the lead, nothing committed.
