status: building (desktop Opus, ~22:05); base = lr16int 961ca660 (LR16-1 72ad3d4a + LR16-5 flicker merged)

Lead decisions (~21:30): (1) ctcourse lamp data MAY be re-levelled, except the files Marlow #257 edits (ctcourseSets/a2CarriageShed.ts, a4GoodsShed.ts, a6PumpHouse.ts, a8Strongroom.ts, src/game/ctDevices.ts, courseMode.ts): their lamps are re-baselined in tests only and listed for Marlow Build. (2) LR16-4-board: replacing the S2 reception switch with the board is accepted (assumed A, undo = restore the switch beside it); it runs after LR16g (both edit campusS2.ts). (3) S3 white fog stays a GPU-sheet item.

# LR16g - brightness re-level on the one light model (Opus)

Planner: Opus 5.5, 2026-10-23 (refresh after LR16dx, LR16e, LR16t merged at lr16int 6eb6a863 and LR16-1 checked).
Plans only; the builder writes the code. Read `docs/systems/agent-preamble.md` first.

## Goal (Michael)
~18:08 "Must be realistic depiction of light."; ~18:12 "focus on only the one new system"; ~18:15 "like a showcase no
matter where you look" (CT: "clear pools, clear dark", `checks/lr16-0-ct-audit.md` row 6). For Michael (STATE):
"Realistic dimmer (S2 atrium 0.28 vs 0.48)". Done = every map-light test describes the new model (direct + penumbra +
bounce), pools read lit, the dark between them stays dark, guards' caps hold, meter = picture.

## Base and branch
- Base: `feature/sector-redesign-lr16int` @ `961ca660` = 6eb6a863 (LR16dx ca764323, LR16e 15b3c686, LR16t) + the LR16-1
  merge (`LAMP_VERSION` 4 there, `src/voxel/lampJobs.ts:13-14`). New branch `feature/sector-redesign-lr16g`.
- Measure only on that base: the LR16-1 fix round (face-blocked bounce bits) moves every level near a wall.
- Slot lock `C:/NightShift/scratch/sr-slot-{1..4}.lock` for each vitest run, `--maxWorkers=2`. No e2e, GPU or
  `npm run check`.

## Inputs now known (read the named sections only)
| Input | What it gives LR16g |
| --- | --- |
| LR16e penumbra (`checks/lr16e-build.md` "Tests", `lr16e-check.md` "Merge hazards") | Soft edges near occluders; map-light reds unchanged (15). Not a lever. |
| LR16t torch atlas (`checks/lr16t-build.md`) | Torches only (render + `enemy.ts:176` `fieldLight`); fixed-lamp levels unchanged. Not a lever. |
| LR16-1 bounce (`checks/lr16-1-build.md` "map-light failures", "Open items" 1-2; `lr16-1-check.md` "Gameplay effect", polish 6) | Reds 15 -> 13 (S1 and S3 "lit enough" now pass). warehouseOps S1: 10 stealth route / takedown spots newly over CAP 0.55 (e.g. R1[15] 0.55 -> 0.69); pocket "behind the skip" 0.375 -> 0.394; takedown 8 0.224 -> 0.283; 70 / 825 dark floor points (1 m sweep) over 0.30, max lift 0.23, mostly pool rims; pockets stay dark. Main cause: the omni receiver lifts the floor beside a pool (check polish 6). |
| LR16dx (`checks/lr16dx-build.md` "Fix round", `lr16dx-check.md` "Cage south end", polish 3) | 3 accepted cage spots under READ 0.4 (lamp 71): S2 R2[8] (-18.75, 13.5, 4) 0.38, R2[13] (-23.45, 11.4, 4) 0.31, rack top W0N 0.31. S3 pocket "the east bay by the plant room" (21, 1.5) 0.40 -> 0.54 (DARK 0.3) from lamp 87's needed move. S2 ladder foot R2N 0.43 (KEY 0.45). S3 R3[6] (9.6, 10.4) 0.78, packing end 0.83. The 11 warehouse reds (S1 4, S2 3, S3 4). |
| S2 atrium (`checks/lr-tex3d-fix.md:20-40`) | Floor (-16, 0.05, -15): Classic 0.478; photometric 0.281 = lamps 0.140 + ambient 0.141 (before bounce). |
| "S3 hall-lit white fog" (STATE, LR15 laptop: campus S3 hall lit, white fog in both modes, volumetric / bloom) | Picture-only (`src/vfx/postStack.ts`, `volLights.ts`, bloom). Not an LR16g lever: GPU sheet item 6 records it; a fix is a separate render slice. |

## The known reds (recount on the base first; values are the latest reported)
Classes: READ 0.4 / KEY 0.45 minima, CAP 0.55 stealth maximum, WORK 0.8 objective maximum, DARK 0.3 pockets
(`tests/warehouseS1Light.test.ts:74-91`, same in S2 / S3); `LIGHT.shadow` 0.28 / `LIGHT.lit` 0.6 (`src/world/lights.ts`).
| File (print switch) | Failing at 6eb6a863 -> after LR16-1 | Known values |
| --- | --- | --- |
| `tests/ctcourseLight.test.ts` (`CTLIGHT_PRINT=1`) | 4 -> 4: `:163` must-see lit, `:172` dark between pools, `:184` airlock lamps inside, `:259` tuned within 0.08 (`ctcourseLight.tuned.json`) | none reported: measure |
| `tests/warehouseS1Light.test.ts` (`WH1LIGHT_PRINT=<file>`) | 4 -> 3: `:175` stealth maxima, `:203` pockets dark, `:212` pockets +0.05 (`:166` now passes) | R1[15] 0.69 and 9 more over CAP; behind the skip 0.394 |
| `tests/warehouseS2Light.test.ts` (`WH2LIGHT_PRINT=<file>`) | 3 -> 3: `:184` lit enough, `:193` stealth maxima, `:218` pockets +0.05 | R2[8] 0.38, R2[13] 0.31, W0N 0.31, R2N ladder foot 0.43 |
| `tests/warehouseS3Light.test.ts` (`WH3LIGHT_PRINT=<file>`) | 4 -> 3: `:159` stealth maxima, `:175` pockets dark, `:184` pockets +0.05 (`:150` now passes) | east bay pocket 0.54; R3[6] 0.78; packing end 0.83 |
Must stay green: `tests/campusS2.test.ts`, `tests/lampLevel.test.ts`, `tests/lights.test.ts`.
`lights.contribution()` is already photometric on the base (500ed63e, `src/world/lights.ts:83-93`): no work there.

## Method
1. Measure: each print run on the base; per failing point record now, without bounce (`LightField.bounceAt` at the
   point, subtract), the class limit, and the cause (direct, penumbra, bounce, LR16dx move).
2. Classify each failing assert:
   - **A**, intent holds, only Classic's number moved: re-baseline (regenerate `ctcourseLight.tuned.json` from the
     print run; edit an expected number with the comment `LR16g: <old> -> <new>`). Never widen a limit.
   - **B**, intent broke (a must-see under its minimum, a pocket over DARK, a stealth spot over CAP, light out of a
     shut airlock): fix with the levers below. Never weaken a B test.
   - **C**, model gap (no lamp value fixes it without breaking another point; the omni-receiver floor lift beside a
     pool): no fix; list it for the lead.
3. S2 atrium: `src/world/maps/campusS2.ts:565` (`PENDANTS` `:189`, `i: 0.9`, y 9.0). Set
   `i = 0.9 x (0.47 - ambient - bounce) / lampsNow` at (-16, 0.05, -15), measured on the base, rounded to 0.05
   (a 9 m pendant is a high-bay fitting). Check the cafe (north half of the void) stays under 0.28.

## Levers, in this order (stop at the first that fixes a B honestly)
1. **Per-lamp intensity in map data** (`i` / `intensity`; 0.5x-2.5x of today's): `src/world/maps/campusS2.ts:565`;
   `warehouseS1.ts:66-92`, `warehouseS2.ts:137-145`, `warehouseS3.ts:129-143` (rows `[x, z, radius, intensity]`);
   `ctcourse.ts:79-84` (`LAMP_LOW`, `LAMP_S4`, `S5_ROOF_LAMP`, `AIRLOCK_LAMP`, `S2_TOP_LAMP`, `S7_TOP_LAMP`), `:87`
   `S3_LAMPS`, `:189` `S3_ROOM_LAMP`. Named first moves: lamp 71 (`warehouseS2.ts:143`, first lamp, 0.653) up for
   R2[8] / R2[13] / W0N; lamp 87 (`warehouseS3.ts:129`, `[22.15, 3.4, 4.5, 0.7]`) down for the east bay pocket.
   Radius (reach = radius x `PHOTO.reach` 1.6) only when the assert is about reach (airlock, a pocket at the rim).
   Never a position (LR16d / dx own them).
2. **`BOUNCE.albedo`** (`src/voxel/lampBounce.ts` `BOUNCE`, `:30-46` at LR16-1, 0.35): only if more than half of the
   "too bright" B cases are mostly bounce (step 1's split). Range 0.25-0.45. Any `BOUNCE` change bumps `LAMP_VERSION`
   (`src/voxel/lampJobs.ts`, 4 -> 5; the cache key does not hash `BOUNCE`) and must keep `tests/lampBounce.test.ts`
   green (wall >= 0.2 x pool, ceiling > 0.04).
3. **`PHOTO.ref`** (`src/world/lampMath.ts:59`, 3) and `LAMP_LEVEL_GAIN` (`:41`, 1.2): no change. They rescale every
   lamp on every map (dark between pools, every CAP). If more than half of all B cases share one direction and one
   cause such a constant would fix, stop and write it up for the lead.
4. **`LIGHT_GAIN`** (`src/world/lampMath.ts:35`, 1.6, picture only; screen = `LIGHT_GAIN / LAMP_LEVEL_GAIN` x level):
   no change in this build. It is a lead call after GPU sheet items 1 and 5 (meter vs picture) and needs
   `e2e-darkness` on the laptop.

## Files (only these)
- Map lamp `i` / radius only: `src/world/maps/campusS2.ts`, `warehouseS1.ts`, `warehouseS2.ts`, `warehouseS3.ts`,
  `ctcourse.ts` (ctcourse: lead confirms with Marlow Build first; until then ctcourse fixes are A only).
- `src/voxel/lampBounce.ts` (`BOUNCE` values only) + `src/voxel/lampJobs.ts` (`LAMP_VERSION` only), lever 2 only.
- Tests (expected numbers of A asserts only): the four map-light files, `tests/ctcourseLight.tuned.json`,
  `tests/lampLevel.test.ts`, `tests/campusS2.test.ts` (+ the new test below).
- Report: `docs/sector-redesign/checks/lr16g-build.md` (measure table, A / B / C per assert, every data change as
  file:line old -> new and the point it fixes, the S1 sweep count).

## Acceptance
1. `npx tsc --noEmit` clean.
2. Every map-light test green, or a C entry in the report (point, value, limit, cause, proposed owner). No B weakened
   (the checker diffs every test edit against the A list).
3. Stealth pockets: every `POCKETS` point in warehouseS1-3Light under DARK 0.3 and the "+0.05" tests green; ctcourse
   "dark between the pools" green; S2 cafe under 0.28.
4. Guard cap: every route / takedown spot at or under CAP 0.55 (objectives WORK 0.8), including LR16-1's 10 S1 spots.
   Rerun LR16-1's 1 m S1 floor sweep (`bodyLevel` at 1.7 m, scratch, not committed): count of points over 0.30 that are
   under it without bounce, reported against 70 / 825; none inside a pocket.
5. Readable: READ / KEY minima hold (S2 R2[8], R2[13], W0N, R2N ladder foot 0.45).
6. S2 atrium floor (-16, 0.05, -15) 0.45-0.5.
7. Meter = picture: no field or shader code changed; the parity tests below green.
8. No lamp position changed; intensities within 0.5x-2.5x; any `BOUNCE` change has the `LAMP_VERSION` bump.

## Tests to run (on the base first, then at the end)
- Levels: `npx vitest run tests/ctcourseLight.test.ts tests/warehouseS1Light.test.ts tests/warehouseS2Light.test.ts
  tests/warehouseS3Light.test.ts tests/campusS2.test.ts tests/lampLevel.test.ts tests/lights.test.ts --maxWorkers=2`
- Parity and data: `tests/lightField.test.ts tests/lampFalloff.test.ts tests/lampGridLossless.test.ts
  tests/levelFillParity.test.ts tests/bounceGrid.test.ts tests/lampBounce.test.ts tests/smoothWorldLight.test.ts
  tests/warehouseLamps.test.ts tests/lampAudit.test.ts tests/warehouseCoopS1.test.ts tests/warehouseCoopS2.test.ts
  tests/warehouseCoopS3.test.ts`; `tests/lampBake.test.ts` if `BOUNCE` changed; `tests/campusS1.test.ts`
  `tests/campusS4.test.ts` if campus data beyond S2 changed.
- New: `tests/campusS2.test.ts` "(LR16g) the atrium pool reads 0.45-0.5 between the pendants, the cafe stays dark".

## Laptop GPU sheet (lead, after done; Test Runner, `E2E_GPU=1`)
1. S2 atrium from the foyer and from L1: a pool on the floor, cafe dark; meter on the pool ~0.45-0.5.
2. Marlow Yard stations 1-5: must-see spots readable, dark between pools (`docs/marlow-bunker/LIGHT.md` shots).
3. warehouseOps S1-S3: route points readable, not lit to a guard; pockets dark; S2 cage south end; S3 east bay.
4. `node scripts/run-e2e.mjs e2e-darkness` (a fail is the `LIGHT_GAIN` / `DARK_DESKTOP` lead call, lever 4).
5. Meter vs picture probe on a pool rim and a wall beside a pool (bounce), campus S1 and warehouseOps Goods-in Bay.
6. Campus S3 hall lit: white fog still there or not (record only; render slice if it stays).
7. `npm run lamp-audit` on the merged branch: "no pool" / "no dark" counts vs `checks/lr16-lamp-audit.md`.
8. First load re-bakes (`LAMP_VERSION` 4, or 5 with a `BOUNCE` change): bake time and atlas MB per map.

## Out of scope
- Perf cuts from `checks/lr16-perf-triage.md` ("Insurance": `CHAR_SHADOW_EVERY` 2 -> 3 at `charShadowSet.ts:102`,
  skip the unchanged `lampTorch` upload at `bakedLamps.ts:913`): only if the train measures campus S5-worst CPU p95
  >= 12 ms, and then as the lead's own slice.
- `src/world/lightField.ts`, `bakedLamps.ts`, `lampMath.ts` code, `darkCurve.ts`, `src/voxel/*` beyond the two
  constants above, lamp positions, cones, the bounce receiver model (polish 6 is C), LR16-1 / LR16e / LR16t polish.

## Model
Opus (A vs B judgement is the work). ~0.5-0.75 window.
