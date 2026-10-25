# light-realism L0 fold - build report

Builder: Opus 5.5 (Night Shift | Sector Ops Build), 2026-10-25 ~21:00-22:00. Branch `feature/light-realism-l0` from
5a201b56d (L0 check PASS). Task: fold Michael's datasheet pick into the reference test, credit it, answer the L0
checker's lead notes 1 and 2.

## Michael's pick (2026-10-25 ~21:00)
"Yes, numbers only (Recommended)": the RAB ALEDS3T 6 m car-park light's 5 ground readings at 0 / 3 / 6 / 9 / 12 m
(32.1, 53.9, 47.7, 25.4, 11.2 lx). Recorded verbatim in `BRIEF.md` "Michael picked"; A13's undo marked taken. No IES
or datasheet file is in the repo (a test walks `src`, `public`, `scripts`, `docs`, `tests` for `.ies` / `.ldt`).

## 1. Reference folded (`scripts/light-realism/calibrate.ts`, `measure/calibration.md`)
- `REFERENCE` = RAB Lighting ALEDS3T 80 W 5000 K Type III, 10,742 lm, 6 m, 0.8 m arm, method candela; comment names
  the product, the source URL (`https://www.rablighting.com/downloads/ies/aleds3t-80w-5k-dlf2207109-4a.ies`, product
  page `https://www.rablighting.com/product/ALEDS3T`) and "numbers only, file not committed".
- Result: fitted intensity 2.246 (0.209 per 1,000 lm), **RMS level error 0.318**, worst point 0.454 at 9 m (pass line
  0.03 / 0.05). Verdict stays **chosen, not measured**, now with a measured fit error instead of "no data".
- Why it misses: shape, not curve. The real fitting throws forward (brightest 3-6 m out, 11 lx at 12 m); the engine's
  downward-cone column is brightest under the pole and at the night floor by 9-12 m. For L1: closer spacing, longer
  reach or a cone tipped toward the bays (written in PLAN L1).
- Fix found on the way: the free fit (fixed-point iteration) stopped at a worse point than A2 itself on real data
  (RMS 0.517 > 0.318). Now a slope search (0.05-1.0, 0.005 grid + golden section) with the intensity solved per slope,
  plus an `edge` flag; on this fitting the slope runs to the flat end (RMS 0.070): no slope fits. The synthetic
  recovery test still finds the A2 slope exactly.
- calibration.md: the one-line result, the real-side 5-point table, the fit numbers, the read, section 4 "still
  pending" (the GPU before-run is still open).

## 2. Credit
`docs/art-credits.md` "Reference data (not in the repo, not shipped)": one row (source URL, terms: RAB website terms
bar commercial use / copying, so only 5 derived numbers are used, file not committed; what: the five readings; used
by `calibrate.ts` and calibration.md). Note: `docs/art-credits.md` is outside the job's claims block; the task named it.

## 3. Checker note 1 (lamps sum in level, curve reads log lux): fixed in L0's files
- `src/world/lux.ts`: `LAMP_LUX_BASE` (0.244, the reference floor; a test ties it to `calibrate.ts` `FLOOR_LEVEL`),
  `lampLux(dLevel)` (one lamp's lux alone over that floor, less the floor), `sumLux(base, lamps)` (the non-lamp part on
  the curve plus every lamp's lux), and `bandCheck(levels, band, lux?)` (checks the given lux per cell).
- `scripts/light-realism/luxGrid.ts`: per cell, each baked lamp read alone with `LightField.lampAt`, the non-lamp part
  = level minus the lamps (or rebuilt from zone + bounce + moon where the level is clamped at 1); the `lux` grids,
  stats and the band check now read `sumLux`. Level grids (what the picture and meter show) unchanged.
- Numbers: two S1 columns lighting one point read 10.5 lx (was ~41 on the curve); the mid-point of two columns 6 m
  apart 6.85 lx (was ~18.8). One lamp alone reads as before.
- Engine left alone (outside the claims): the exact engine change that would make the picture add in lux is written
  in PLAN L1 (`LightField.levelInto` `:261-298`, shader loops `bakedLamps.ts:1023` / `:1660`, GLSL curve in
  `LAMP_MATH_GLSL`), not taken. Logged as **BRIEF A14** with its undo.
- The committed S1 "before" measure (`measure/campusOps-s1.json`, SVGs) predates this; the car park is ~1 lx with
  barely any overlap, so its verdicts stand; L1's "after" measure uses the new reading.

## 4. Checker note 2 (interior bands > 178 lx)
Recorded in PLAN L1 as "Open before the L2 briefs": with levels alone a saturated band passes only at level 1
everywhere; with lamps added in lux it passes where the mean reaches 178 lx. Choice (a) keep that, or (b) a lower
curve floor (bands.md 3b level 0.92-1.0). Not needed for L1's car park (14 lx is inside the curve).

## Tests
- `npx tsc --noEmit -p .`: clean (after one null-narrowing fix in `tests/lux.test.ts`, the WIP's "one tsc fix left";
  rerun by the lead 2026-10-25 ~22:10).
- `npx vitest run tests/lux.test.ts`: 17 / 17 passed (12 old, 5 new: the RAB reference and no IES file in the repo; the
  reference floor tie; one lamp alone; two overlapping lamps read their real sum; bandCheck on the given lux).
- Measure re-run with the lux sum (`scripts/light-realism` campusOps, under the CPU gate; output kept out of the repo in
  `C:/NightShift/scratch/light-realism/l0-fold-measure/`): car park (park) mean 0.98 lx, min 0.37 lx, FAIL mean + min
  against 14 / 3; levels unchanged (0.277 plane, 0.282 / 52% dark at y 1.0, the CONFORMANCE L3 numbers). Only the
  delivery yard passes its band (20 lx, mean 29.5); gatehouse, c1, forecourt, lane, bins, bikes, smoke fail: L1's job
  (the "before" picture).
- No e2e (no game change).

## Commits
33117b0cc credit and pick; 1509244b6 fold WIP (reference, lux sum, PLAN L1 notes); f44d458a1 tsc fix; then this report.

## Open
- GPU "before" shots: laptop request `20261025T092215-night-shift-sector-o-8e20a7a7-af43` still pending.
- Note 2 decision before the L2 briefs.
- Next: L1 (S1 car park) and `SIGNOFF.md` for Michael; its "L1:" anchors line reads "the anchors are chosen, not
  measured" with RMS 0.318.
