status: blocked waiting for LR16dx (warehouse moves), LR16e and LR16-1 merged into feature/sector-redesign-lr16int (the lead sets the base sha and reopens)

# LR16g - brightness re-level on the one light model (Opus)

Planner: Opus 5.5, 2026-10-23. Plans only; the builder writes the code.

## Goal (Michael's words)
- ~18:08: "Approve updating lighting throughout maps ... Must be realistic depiction of light."
- ~18:12: "Disable returning to original lighting system, focus on only the one new system".
- ~18:15: "emphasis the light/shadow system like chaos theory did, like a showcase no matter where you look"
  (CT: "clear pools, clear dark", `lr16-0-ct-audit.md` row 6).

Done means: every map's light tests describe the new model (no Classic-tuned number left), the S2 atrium pool reads
~0.45-0.5 again, pools read lit and the dark between them stays dark, `npm run check` can go green.

## Base and branch
- Base: `feature/sector-redesign-lr16int` @ `<sha set by the lead>` (c7a26ca7 + LR16dx warehouse moves, LR16e,
  LR16-1 merged).
  New branch: `feature/sector-redesign-lr16g`.
- Read first: `lr16a-build.md` "Open items" 1, `lr16b-build.md` "The 22 LR16a map-light failures: 22 -> 15",
  the LR16d / LR16e / LR16-1 build reports, `docs/sector-redesign/checks/lr-tex3d-fix.md:20-40` (the atrium numbers),
  `docs/systems/agent-preamble.md`.
- Cloud build: `npx tsc --noEmit`, `npx vitest run <files> --maxWorkers=2`. No e2e, GPU, or `npm run check`.

## Stale helper first: `lights.contribution()`
`src/world/lights.ts:85-89` `contribution(l, x, y, z)` still returns `LAMP_LEVEL_GAIN x intensity x lampTerm(...)`
(the LINEAR flashlight falloff) over `l.radius` for every light, so for fixed lamps it is neither the game's formula
nor its reach. `tests/campusS2.test.ts:515-518` (the boost point) reads 0.619 with it against the game's photometric
0.188. Fix: fixed lights (kind not `flashlight`) use the field's photometric term (`lampMath.photoTerm`, the reference
`LightField.lampInto` writes out, over `l.reach ?? l.radius`, as `bakedLights` packs it, `lightBake.ts:19`);
flashlights keep `lampTerm` over `l.radius`. Still no visibility (say so in the doc comment). Callers at c7a26ca7 (none
is gameplay; confirm on the base with `git grep -n "contribution(" -- src tests`):
`src/editor/lightPreview.ts:193` (dev editor), `tests/campusS1.test.ts:670`, `tests/campusS2.test.ts:518`,
`tests/campusS4.test.ts:568`, `tests/editor/lamps.test.ts:61`, `tests/lights.test.ts:92-93`. Each test's expectation
is then retuned under the A / B rule below (the S2 boost point is class A or B by its own purpose line). With this
the known reds are 16 at c7a26ca7 (the 15 below + `campusS2.test.ts` boost point).

## The failing tests (15 at fe23ef4c, 16 with the boost point; recount on the base first)
The warehouse lamp moves (`feature/sector-redesign-lr16dx`, LR16d for warehouseOps, fix round running) will add more
`warehouseS1Light` / `S2Light` / `S3Light` level failures: they are in scope here, under the same A / B / C rule (a
moved lamp's new spot is LR16d's; only its intensity is yours).
| File | Failing (at fe23ef4c) | What they assert |
|---|---|---|
| `tests/ctcourseLight.test.ts` | 4: `:163` must-see spots lit, `:172` dark between pools, `:184` airlock lamps stay inside, `:259` tuned levels within 0.08 (`ctcourseLight.tuned.json`) | Marlow Yard course tuning (`docs/marlow-bunker/LIGHT.md`) |
| `tests/warehouseS1Light.test.ts` | 4 of `:166` lit enough, `:175` stealth maxima, `:185` lamps took points up, `:203` dark pockets, `:212` pockets +0.05 | warehouseOps S1 light pass |
| `tests/warehouseS2Light.test.ts` | 3 of `:184-218` (same families) | S2 |
| `tests/warehouseS3Light.test.ts` | 4 of `:150-184` (same families) | S3 |
Plus `tests/campusS2.test.ts` and `tests/lampLevel.test.ts` must stay green (atrium lure / levels).

## Method (in this order; stop at the first lever that fixes a test honestly)
1. Measure: run each file with its print switch (`CTLIGHT_PRINT=1`, `WH1LIGHT_PRINT=<file>` and the S2 / S3 ones)
   and record every failing point: Classic tuning value, now, the band (`LIGHT.shadow` 0.28 / `LIGHT.lit` 0.6,
   `src/world/lights.ts`), and the cause (direct falloff, feather, penumbra, bounce, lamp moved by LR16d).
2. Classify each failing assertion:
   - **A - the intent holds, the number was Classic's.** A must-see spot still in its band, a dark pocket still under
     0.28, a pool still lit, only the exact tuned number moved. Fix: re-baseline the test (regenerate
     `ctcourseLight.tuned.json` from the print run; widen nothing else). The test's purpose line stays.
   - **B - the intent broke.** A must-see spot fell under its band, a dark pocket rose over 0.28, light leaves an
     airlock with the doors shut, a stealth maximum is passed. Fix in map lamp data only: that lamp's intensity `i`
     (never its position: LR16d owns positions, never its radius unless the test is about reach), within 0.5x-2.5x of
     today's value; log each change (map file:line, old -> new, which point it fixes). Never weaken a B test.
   - **C - a real model gap** (e.g. a lamp that cannot reach its point without lighting a pocket). Do not fix; list it
     for the lead (LR16d move or Michael).
3. The S2 atrium (`src/world/maps/campusS2.ts:565`, `PENDANTS` `:189`, `i: 0.9` at y 9.0): target the field level at
   (-16, 0.05, -15) = 0.45-0.5 (lr-tex3d-fix: Classic 0.478; LR16a 0.281 = lamps 0.140 + ambient 0.141). Set
   `i = 0.9 x (0.47 - ambient - bounce) / lampsNow` measured on the base, rounded to 0.05. Reason: a 9 m atrium pendant
   is a high-bay fitting with more output; the photometric model is right to dim a low-output fitting at 9 m. Check
   the lure / lightsOut tests in `campusS2.test.ts` and the dark cafe (north half) stays under 0.28.
4. Global constants: leave `PHOTO` (`lampMath.ts:59`), `LAMP_LEVEL_GAIN` and `LIGHT_GAIN` alone. Changing `PHOTO.ref`
   rescales every lamp on every map and breaks the dark between pools; `LIGHT_GAIN` is picture-only and needs the GPU
   darkness targets (`scripts/e2e-darkness.mjs`), which a cloud run cannot check. If more than half of the B cases share
   one cause that a global constant would fix, stop and write it up for the lead instead.

## Files (only these)
- `src/world/lights.ts` (`contribution` only), `tests/lights.test.ts`, `tests/editor/lamps.test.ts`,
  `tests/campusS1.test.ts`, `tests/campusS4.test.ts` (their `contribution` expectations only).
- Map lamp data: `src/world/maps/campusS2.ts` (pendants), `src/world/maps/ctcourse*.ts`, `src/world/maps/warehouseS1.ts`,
  `warehouseS2.ts`, `warehouseS3.ts`: lamp `i` values only.
- Tests: `tests/ctcourseLight.test.ts`, `tests/ctcourseLight.tuned.json`, `tests/warehouseS1Light.test.ts`,
  `tests/warehouseS2Light.test.ts`, `tests/warehouseS3Light.test.ts`, `tests/lampLevel.test.ts` (only the expected
  numbers of class A asserts, each with a comment "LR16g: Classic x -> photometric y").
- Report: `docs/sector-redesign/checks/lr16g-build.md` (the measure table, A / B / C per assert, every data change).

## Acceptance
- All five map-light files, `campusS2.test.ts`, `lampLevel.test.ts`, `lightField.test.ts`, `lampFalloff.test.ts`,
  `lampGridLossless.test.ts` pass; `npx tsc --noEmit` clean.
- S2 atrium floor (-16, 0.05, -15) field level 0.45-0.5; cafe (north half of the void) under 0.28.
- No B assert weakened (the checker diffs every test edit against the A list).
- No lamp position changed; no intensity outside 0.5x-2.5x.

## Unit tests by name
The existing names above stay; add to `tests/lights.test.ts`: "(LR16g) contribution: a fixed lamp equals the field's
photometric term without visibility; a flashlight keeps the linear term". Add to `tests/campusS2.test.ts`: "(LR16g) the atrium pool reads 0.45-0.5 between the
pendants, the cafe stays dark".

## Laptop GPU checklist (lead, after done)
1. S2 atrium from the foyer and from L1: a pool on the floor, cafe dark; meter on the pool ~0.45-0.5.
2. Marlow Yard stations 1-5: must-see spots readable, dark between pools (course tuning shots in `docs/marlow-bunker/LIGHT.md`).
3. warehouseOps S1-S3 route points: readable but not lit to a guard; dark pockets dark.
4. Darkness targets: `E2E_GPU=1 node scripts/run-e2e.mjs e2e-darkness` (if it fails, `LIGHT_GAIN` / `DARK_DESKTOP` is a
   separate lead call).
5. LR16-2 framing audit re-run (`npm run lamp-audit` on the merged branch): "no pool" / "no dark" counts vs
   `lr16-lamp-audit.md`.

## Do NOT touch
`src/world/lampMath.ts`, `src/world/lightField.ts`, `src/world/bakedLamps.ts`, `src/voxel/*`, lamp positions /
radii / cones, `src/world/darkCurve.ts`, any test outside the list.

## Model
Opus (judging A vs B is the work; the edits are small). Estimate ~0.5-0.75 window.
