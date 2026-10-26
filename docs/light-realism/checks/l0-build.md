# light-realism L0 - build report

Builder: Opus 5.5 (Night Shift | Sector Ops Build), 2026-10-25. Branch `feature/light-realism-l0` (cut from master
a3058759d; job docs d1f76ba67). Built to PLAN L0 (`PLAN.md:132-179`). Commits: bced72b2a (curve, band check, reference
test), 6a0f51947 (tools), 8e20a7a77 (S1 measure), then this report and STATE.

## Verdict on the done line (`PLAN.md:176-179`)
- `node scripts/light-realism/lux-grid.mjs --map campusOps --section 1` prints per-space mean level and lux, point
  minimum, U0, band and pass / fail. Car park at the meter's height (y 1.0): mean **0.282**, 52% dark, 0% lit, the
  CONFORMANCE L3 numbers exactly (`--space park` alone gives the same). Met.
- calibration.md: the reference test with verdict **"chosen, not measured"** (A13: no maker's web page with a
  candela table or iso-lux diagram found without a download), pinned by `tests/lux.test.ts`. The real-side 5-point
  table and RMS error do not exist without real data; the engine-side 5-point table is there and pinned. Met under
  A13's fallback, not as "measured".
- Shots: queued, not run (desktop has no GPU work). Laptop request below.

## Changes per file
- `src/world/lux.ts` (new, 109): `LUX_ANCHORS` (1 lx = 0.28, 10 lx = 0.60), `LUX_SLOPE` / `LUX_OFFSET`, `luxToLevel`,
  `levelToLux` (clamped 0..1; ends `LUX_FLOOR` 0.13 lx, `LUX_CEIL` 178 lx), `bandCheck(levels, band)` (mean of the
  cells' lux against the band floor and 2.5x ceiling, point minimum, U0; a band above 178 lx is `saturated`: met only
  where every cell reads level 1). Pure, no imports.
- `tests/lux.test.ts` (new, 12 tests): anchors on `LIGHT.shadow` / `LIGHT.lit`; round trip; night floors 0.104 ->
  0.28 lx, 0.14 -> 0.37 lx, 0.244 -> 0.77 lx, 0.30 -> 1.15 lx, and `moonLight(campusOps.theme)` = 0.104; clamps;
  `bandCheck` pass, each fail rule, saturated band; reference test: engine profile against calibration.md's table
  (0.005) and a pinned fixture, the verdict line in calibration.md, synthetic recovery (fit and free fit exact), a
  mismatched fitting fails, a wrong mounting height throws; grep: nothing in `src/game`, `src/ai`, `src/vfx`,
  `src/player`, `src/voxel` or `src/world/lightField.ts` imports `lux`.
- `scripts/light-realism/calibrate.ts` (new, ~200): the reference test. `REFERENCE` (null), `engineShape` /
  `engineLevel` / `engineProfile` (one lamp at y 6.0 on a 0.8 m arm, S1 cone 1.15 rad spot exp 2, reach 12 x 1.6,
  `photoTerm` x `LAMP_LEVEL_GAIN` x intensity over the 0.244 night floor), `fitReference` (closed-form least squares
  on level, A2 curve fixed; per-point level and lux errors, RMS, worst point, verdict), `freeFit`, `runCalibration`.
- `scripts/light-realism/luxGrid.ts` (new, ~320, replaces `s1Grid.ts`): maps `campusOps` and `warehouse` (lazy
  loaders; add a line per map); spaces from the spaces file, `--section` / `--space` filters; crop = the spaces + 20 m;
  bakes only the lamps that reach a space; samples `LightField.levelAt` at floor + plane and floor + 1.0; per space
  level and lux grids, stats, `bandCheck`; `heatSvg` (1 m = 10 px, scale bar, north arrow, verdict).
- `scripts/light-realism/lux-grid.mjs` (new, ~140, replaces `s1-grid.mjs`): CLI, CPU wait kept (`--cpu-max`), compact
  JSON (one grid row per line), SVGs, a per-space table, `--ascii`, `--calibrate` (prints the reference test).
- `scripts/light-realism/shots.mjs` (from `s1-shots.mjs`): map / section / label options; spaces, meter points,
  views and the park point from the spaces file; grids per space at plane and meter height; `meterSplits` (meter vs
  field over 0.02, for J11); per view `targets` (bible L5 card targets, advisory on ground pixels); `--video <s>`
  (Epic fly-through along the views, Playwright `recordVideo`, `flythrough-<preset>.webm`); dry-run self-checks for
  projection, stats, fly-through poses, target check and the 43 x 25 park grid. The hand copy of the column list is
  gone (PLAN L1 asked for that later; nothing used it).
- `docs/light-realism/spaces/campusOps.json` (new): the 11 S1 spaces (S1_ROOMS) with type, category, plane, band
  (from `research/bands.md`; `verify` where it says "to verify"), verge and plant roof with no band and their reason;
  `shots` for section 1 (12 meter points: the 10 old ones + forecourt and barrier lane; 5 views: the 4 old ones +
  forecourt).
- `docs/light-realism/measure/campusOps-s1.json` (1,563 lines) + `campusOps-s1/<space>.svg` (11): the S1 "before"
  measure; replaces `measure/s1-grid.json` (3,276 lines).
- `docs/light-realism/measure/calibration.md` (new): curve, why log, night floors, the reference test method, engine
  table, verdict, the search, undo, GPU request.

## S1 "before" (desktop CPU, 90 s bake of 34 lamps over the section crop)
| Space | Plane | Mean level | Mean lx | Min lx | Band (avg / min lx) | Result | Meter y 1.0 mean (dark / lit) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| park | 0.1 | 0.277 | 1.03 | 0.37 | 14 / 3 (P11a) | FAIL mean, min | 0.282 (52% / 0%) |
| lane | 0.1 | 0.260 | 0.88 | 0.37 | 3.5 / 0.7 (v) | FAIL mean, min | 0.267 (75% / 1%) |
| gatehouse | 0.8 | 0.934 | 138 | 9.8 | 320 (v, saturated) | FAIL mean | 0.935 (0% / 100%) |
| verge | 0.1 | 0.239 | 0.76 | 0.37 | none (outside the site) | - | 0.242 (96% / 1%) |
| bins | 0.1 | 0.247 | 0.83 | 0.37 | 1.75 / 0.3 (v) | FAIL mean | 0.260 (76% / 0%) |
| bikes | 0.1 | 0.441 | 34.3 | 0.40 | 3.5 / 0.7 (v) | FAIL max, min | 0.217 (92% / 0%) |
| smoke | 0.1 | 0.177 | 0.52 | 0.37 | 3.5 / 0.7 (v) | FAIL mean, min | 0.169 (100% / 0%) |
| dyard | 0.1 | 0.527 | 42.2 | 0.37 | 20 (v) | PASS | 0.439 (46% / 27%) |
| forecourt | 0.1 | 0.495 | 42.2 | 0.37 | 7 / 2 (v) | FAIL max, min | 0.373 (59% / 14%) |
| plantroof | 4.5 | 0.239 | 0.75 | 0.44 | none (roof) | - | 0.250 (99% / 0%) |
| c1 | 0.1 | 0.325 | 2.66 | 0.76 | 100 (v) | FAIL mean | 0.328 (5% / 5%) |

Read for L1 / L2: the car park is about 1 lx (SIGNOFF "before" line holds). The forecourt, bike shelter and yard
means are lifted by hot cells at the foot of 0.85 m bollards and the dock lamp (lux averages are dominated by the
brightest cells, as a lux meter's are), while most of their floor is under 1 lx: L2-S1 should judge them by point
minimum and U0, not the mean alone. Interior bands above 178 lx (gatehouse 320) are saturated on the curve.

## Tests
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/lux.test.ts --maxWorkers=2` (sr-slot-1 lock): 1 file, 12 passed.
- `node scripts/light-realism/shots.mjs --dry-run --map campusOps --section 1 --label before --video 90 --push
  shots/light-realism-s1`: self-checks ok (11 spaces, 2,278 grid points, 12 meter points, 5 views; push dry).
- `node scripts/light-realism/lux-grid.mjs --calibrate`: prints the engine table and the verdict.
- No e2e (no game change, PLAN L0).

## GPU (laptop queue, alone slot)
Queued, not waited for: request `20261025T092215-night-shift-sector-o-8e20a7a7-af43`, sha
8e20a7a77eb73620f4120deb1ec3102749b5ba42, set `light-realism-l0`, step
`serve scripts/light-realism/shots.mjs --map campusOps --section 1 --label before --presets low,epic --video 30 --push shots/light-realism-s1`.
Result: the `laptop-e2e/light-realism-l0` status on that sha and `before-campusOps-s1-<time>/` on
`shots/light-realism-s1` (`shots.json`: `splits` = meter-field splits over 0.02, which go to J11; per view `targets`).
The commits after 8e20a7a77 are docs only.

## Deviations
1. Reference test: no real fitting. Searched maker and product pages (Thorlux Juno / Brisa, LEDVANCE ECO AREA, an
   ACA REXON IES viewer page, Cooper / RAB / Signify reports, NSW council plans): candela and iso-lux data sit only
   in IES / LDT files and PDFs. A13 fallback taken; `REFERENCE` is a data slot. PLAN-CHECK's polish item stands: the
   lead may ask Michael by day to allow one datasheet download.
2. Free fit: PLAN asked for "two anchors + intensity". One fitting cannot fix both anchors and the intensity (when the
   shape matches, every anchor pair with a matching intensity fits equally); the 1 lx anchor is held at 0.28 and the
   10 lx anchor + intensity are solved (written in calibration.md and calibrate.ts).
3. Real side adds the night floor's 0.77 lx to the fitting's lux before the curve, so both sides include moon and
   sky (the engine side is floor + lamp).
4. `luxGrid.ts` loads `campusOps` and `warehouse` only (the job's maps), not every map id: other maps' modules read
   browser-only flags at import; a map is one loader line.
5. SVGs are committed for S1 (11 files, ~200 KB): they are the "before" heat maps L1's sign-off points at.
6. Machine: the worktree's `node_modules` junction pointed at `C:/NightShift/Mobile-Coop/node_modules`, which is empty;
   repointed (local, untracked) to `Mobile-Coop-coop-real/node_modules` (same lockfile but the version line). One
   early `npx esbuild` fetched esbuild into the npm cache before the junction fix.

## Open for the checker / L1
- Fill `REFERENCE` if Michael allows a datasheet; rerun `tests/lux.test.ts` and `--calibrate`; update calibration.md
  and SIGNOFF.md's "L1:" line.
- The GPU result (splits, L5 targets) into calibration.md section 4 when the laptop request finishes.
