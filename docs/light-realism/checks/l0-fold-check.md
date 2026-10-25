# light-realism L0 fold - check

Checker: fresh Opus 5.5, 2026-10-25 ~22:15. Checked head 3e78d0df2 on `feature/light-realism-l0` (fold commits
33117b0cc..3e78d0df2 on top of 5a201b56d, the L0 check PASS) against Michael's pick (ROADMAP Decided 2026-10-25 ~20:50,
"Yes, numbers only (Recommended)"), G329 (real-world lux bands), the L0 checker's lead notes 1 and 2
(`checks/l0-check.md`), BRIEF and PLAN, and the build report `checks/l0-fold-build.md`.

## Verdict: PASS

## What was checked
1. Michael's pick. `scripts/light-realism/calibrate.ts:58-68` `REFERENCE.lux` = 32.1, 53.9, 47.7, 25.4, 11.2 at
   0 / 3 / 6 / 9 / 12 m, 6 m mount; `measure/calibration.md` section 3 table carries the same five; the test pins both
   (`tests/lux.test.ts:145-169`, plus the real-side table rows). No `.ies` / `.ldt` / `.pdf` in the diff or anywhere in
   `git ls-files`; the test walks `src`, `public`, `scripts`, `docs`, `tests` for them. `docs/art-credits.md:46` is in
   the "Reference data (not in the repo, not shipped)" table: source URL and product page, the maker's terms (no
   commercial use or copying of the file, so numbers only, file not committed), the five numbers and where they are
   used. BRIEF "Michael picked" and A13's undo record it.
2. Note 1 (lamps add in lux). `src/world/lux.ts:54-70`: `lampLux(d) = L(0.244 + d) - L(0.244)` (one lamp alone over
   the reference floor, so it reads exactly as before), `sumLux(base, lamps) = L(base) + sum lampLux`; allocation-free.
   `LAMP_LUX_BASE` equals `FLOOR_LEVEL` exactly (0.104 + 0.14 = 0.244 in doubles; test `toBe`). `bandCheck` takes the
   optional lux array, length-checked, means and minimum on it; level mean unchanged. `scripts/light-realism/luxGrid.ts`
   `luxAt`: each baked lamp via `LightField.lampAt` (the same `lampInto` that `levelInto` sums, doors and visibility
   applied), base = level minus lamps, or rebuilt from zone + bounce + moon where the level is clamped at 1 (matches
   `levelInto`'s parts, `lightField.ts:261-299`). Level grids (plane and meter) still come from `field.levelAt`
   unchanged. Only `src/world/lux.ts` changed under `src/`; nothing in `src/` imports it (grep: none; the test keeps
   guarding); no gameplay, engine, map, flag, save or wire file changed, so parity is untouched. BRIEF A14 logged with
   its undo (`bandCheck` without `lux`, or the PLAN L1 engine change, which needs its own decision).
3. Fit change. `freeFit` (`calibrate.ts:152-194`): for each slope b the best intensity is the closed-form least squares
   (linear in k), the floor's lux read on the trial curve; a 0.005 grid over 0.05-1.0 then 80 golden-section steps on
   the best grid point's neighbours; `k` left set for the final b. Sound: a global grid cannot wander like the old
   fixed point, and the residual is smooth in b. `edge` flags a best slope at a range end (RAB: 10 lx = 0.330, RMS 0.070,
   edge true, as calibration.md says). Synthetic recovery test (`tests/lux.test.ts:171-183`) still recovers intensity 1.3
   and the A2 slope to 6 places.
4. Note 2 recorded in PLAN L1 as "Open before the L2 briefs" with choices (a) 178 lx mean on the lux sum or (b) a lower
   curve floor; not needed for L1's car park.
5. Tests (CPU gate: 85% at 22:13 after 9 min at 99-100%): `npx vitest run tests/lux.test.ts --maxWorkers=2` 17 / 17
   passed; `npx tsc --noEmit -p .` clean; `luxGrid.ts` (outside tsconfig) type-checked standalone under strict +
   `noUncheckedIndexedAccess` + `verbatimModuleSyntax`: clean (the only error is `src/pwa/pwa.ts`'s
   `virtual:pwa-register`, a Vite virtual module, unrelated). No e2e, no measure run (as briefed).

## Fix list
None.

## Polish
1. `luxGrid.ts` `luxAt` sums every baked lamp, `levelInto` only the cell's `LAMP_GRID_SLOTS` (24) grid slots; past 24
   overlapping lamps the base would go negative and is clamped to 0. Harmless at S1; a one-line note in the comment.
2. Where the level is clamped at 1 the rebuilt base reads `reg.zoneAt` unsmoothed, not the trilinear ambient grid
   `levelAt` uses (the comment says so); tiny difference, only in saturated cells.
3. `lampLux` caps one lamp at ~177 lx (the curve's top over the 0.244 floor): very close to a bright source a single
   lamp under-reads. Worth a line in calibration.md section 5 before L2 interiors (ties to note 2).
4. BRIEF "Michael picked" and the build report give the pick as ~21:00; ROADMAP Decided records ~20:50.
5. The L0 check's polish items 1-2 (`luxGrid.ts` crop margin `R = 20`, the import grep walking only listed dirs) are
   still open; carry them to L2.
