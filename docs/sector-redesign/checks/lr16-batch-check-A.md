# LR16 batch 1 - checker A

Branch `feature/sector-redesign-lr16int` @ c7a26ca7 (= -lr16 LR16a + LR16b, -lr16f LR16f + LR16-7 + LR16-3, -lr16v
LR16-6, -lr16d campus moves), diffed against `feature/sector-redesign-lampx` 1c22b913. Fresh Opus checker A (did not
read checker B).

## Verdict: FIX (3 blocking items)

## Checks run
- `npx tsc --noEmit`: clean.
- vitest, 67 related files (`--maxWorkers=2`: every light / lamp / shadow / net / rejoin / settings / crate / jammer /
  moveState / sector / vision / ghost / campus / graphics / dark / fill / rooms / polish / detail file, plus
  `editor/lightPreview`, `editor/night`): **16 failed | 881 passed | 4 skipped**.
  - The accepted 15 are there exactly: ctcourseLight 4, warehouseS1Light 4, warehouseS2Light 3, warehouseS3Light 4.
  - One more: `campusS2` (item 3).
- No e2e (brief).

## Blocking

1. **LR16b - torch cone parity break (meter feathered, picture hard).** `lampCone` now feathers spots
   (`src/world/lampMath.ts:80-89`, `SPOT_FEATHER` 0.65), so the meter and guards (`LightField.dynamicInto` ->
   `lampTerm`, `src/world/lightField.ts:371`) and `nsTorches` (`src/world/shadowAccuracy.ts:167`) get a soft torch edge.
   But two torch paths are still Babylon `SpotLight`s with the old hard cut (`src/world/lightRig.ts:539-542`: angle =
   outer, exponent 2; standard falloff = `pow(cos, 2)` up to the cut):
   - every torch that holds a rig shadow map. These are the torches nearest the player, because `torchShadowPass`
     ranks flashlights first;
   - every flashlight on the volume and standard paths, where `torchDraw` is null (`src/world/bakedLamps.ts:175`).

   In the feather band (0.20-0.34 rad, about 65% of the beam's area) the picture shows full cos^2 while the meter reads
   down to 0 at the edge. A player at a guard's beam edge looks lit, but the guard perceives less. The LR16b build
   report left this open (open item 1).

   Fix (pick one):
   - feather the Babylon spot path, either with a cone override in the lamp plugin or by drawing shadowed torches
     through `nsTorches` with their map;
   - or, until then, make the feather lamp-only: `SPOT_FEATHER` 0. Fixed lamps keep `LAMP_FEATHER`.

2. **LR16-3 - door and prop shadows are clipped by the character-fitted frustum.** `addDynamic` runs after `fitCone`
   (`src/world/charShadows.ts:357-364`), so the slot's cone, near plane and far plane still frame only the
   characters. `nsCharShadow` returns 1 outside that frustum (`:118-120`) and runs on every surface the lamp lights,
   floors and walls included (`bakedLamps.ts:1045-1048`). Results:
   - an open leaf's or crate's shadow on the floor is cut at the cone edge and slides with the guard who set the fit;
   - a leaf nearer the lamp than the nearest character falls before the near plane and casts nothing.

   Fix: add the listed door / prop bounding spheres to the fit (fit only, not to `sp` / `covers`). A cone that holds
   the caster holds its whole shadow within reach. Picture-only is per spec ("render-only first, as LR14").

3. **A 16th red unit test: `tests/campusS2.test.ts:515-520`** ("the boost point (-10.6, -8) is dark"): 0.619 against
   < 0.28 (above the lit line 0.6).
   - Passes on lampx 1c22b913 and on lr16d 5811ed95, which has no LR16a. Fails on lr16 fe23ef4c. So LR16a caused it,
     and the LR16a report's list of 22 missed it (campusS2 was not run there).
   - The test sums `contribution()` (`src/world/lights.ts:85`): the linear `lampTerm` over the new 1.6x reach. That
     mixes Classic and Realistic and is no longer the one light model.
   - Fix: assert with the field or `photoTerm` and check the real level at the boost point. If it is lit, list it for
     LR16g with the other 15.

## Checked, no block
- **LR16a, one lamp path.**
  - No live reference left to `lampFalloffMode`, `setLampFalloff`, `matchLampFalloff`, `photoLamps`, `LAMP_PHOTO`,
    `shadowAccuracyOn`, `setShadowAccuracy`, `lampMathGlsl`, `hostLampFalloff`, `E2E_FALLOFF` or `lampDoorSlots` in
    src, scripts or tests. One optional-chained leftover is under polish.
  - The GLSL is generated from `PHOTO_NUM`, `PHOTO_NEAR2`, `LAMP_FEATHER` and `SPOT_FEATHER`. The TS `lampCone` /
    `photoFalloff`, the field's hand copy (`lightField.ts:287-300`) and `nsLampCone` / `nsLampFalloff` agree term for
    term, including the `<=` cut and the smoothstep.
  - The volume mix and the lamp loop both embed `LAMP_MATH_GLSL`, and `nsLampRaw` still sums before character shadows.
- **Settings.** `sanitizeSettings` is a whitelist parse, so a stored `lampFalloff` is dropped and the rest of the
  gameplay block is kept. Tested, including an IndexedDB round trip. No save-shape change.
- **Co-op wire.**
  - `start.lf` is removed. An old message with `lf` still parses and the field is dropped.
  - A rejoin record with `lf` still loads and the field is dropped.
  - `PROTOCOL_VERSION` stays 38 by orchestrator decision (see train note 1).
- **LR16b slots.**
  - `LAMP_GRID_SLOTS` 24 in 6 texels a column, laid out by `lampGridBase`. Every reader moved: field `:252`, lamp
    loop and volume mix `bakedLamps.ts:485-491` / `:984-990`, tests. No script reads the old `cols * 2` stride.
  - The loop breaks at the first empty slot and fetches one texel every 4 slots. No dropped light up to 24, and
    `lampBake` warns past 24.
  - `lampGridLossless` and the per-map slot tests pass.
- **Samplers.** LR16f, LR16-7 and LR16-3 add no sampler. Low and Medium gain the one atlas sampler, under Epic's
  count.
- **PCSS cost.**
  - Fetches for each slotted lamp's pixels inside its slot frustum: High 4 / 12, Ultra 6 / 18, Epic 8 / 24 (blocker
    search only / in or near a shadow; was 4).
  - Low / Medium: 2 / 6, plus one caster pass every 2nd frame.
  - The kernel is a const array: no jitter, no per-frame allocation.
  - GPU timing is pending (see the GPU list).
- **LR16d.**
  - All 26 moves match the audit table exactly. Ids, groups, cones and call order are unchanged.
  - Every moved lamp stays in its room. For the S5 gallery I checked against the L1 void x -47..-41, z 18..29: the
    west arm -50..-47 gets -48.7, the east arm -41..-38 gets -39.2, the north arm z 29..32 gets 30.7. The hall
    (-50..-38) gets -48.7 / -39.3.
  - S3 view lamp, S4 yard and deck, S5 garden, path and roof lamps all slide away from their wall into the same space.
- **LR16-6.**
  - No flip remnants in src or scripts, and the post shader dropped its `flip` uniform.
  - `closedDoorCrossing` and `consider` are allocation-free (reused `out`), and `remotePlayers()` returns a held array.
  - The ghosts are render-only.

## Train notes (not blocking here)
1. The train must bump `PROTOCOL_VERSION` past master's 40 and update the tests that assert it: crateWire, jammer,
   jammerFixes, moveState, net x5, rejoin, sectorLampSync, sectorStep3. Until then a lampx build and an LR16 build
   both say 38 and would connect, running Classic against photometric.
2. GPU (laptop, `E2E_GPU=1`):
   - frame p95 on Sector Ops and campus S2, whose densest columns now loop 16-17 lamps (was capped at 8);
   - PCSS at Epic, plus Low and Medium with 2+ guards under a lamp;
   - max samplers at Low and Medium (`e2e-lightbake` only reads Epic);
   - `LAMP_CSHADOW` compiling on ANGLE (const `vec2[16]`).

## Polish
- `scripts/lamp-audit.mjs:33-34`: stale `setLampFalloff?.('photometric')` and its comment.
- `src/world/world.ts:266`: comment still says "shadow-accuracy fixes on".
- `scripts/e2e-lightbake.mjs:151`: comment says Low "keep the capsules" (stale since LR16-7).
- `src/world/lightField.ts:379` repeats the `e < 1.5` feather pick that `coneFeather` owns. Use one helper or one
  constant.
- Unbaked fixed lamps (`LightField.dynamicInto` without a bake, `contribution()`, editor `quickLevel`) still use the
  linear `lampTerm` over the 1.6x reach. This is the editor and fallback only, but it is the root of item 3.
- `tests/lightField.test.ts` boxing budget 64 -> 72 B a query: boxed doubles, not objects, growing with lamps per
  column. A hot-path pass could keep the per-lamp values in fields.
- LR16-3:
  - the leaf mesh is thin-instanced, so a slot that lists it draws every door instance in the map;
  - a door or crate shadow appears only while a character is in reach of a slotted lamp (it pops on and off with
    guards).
- LR16-6: a co-op client draws no thermal ghost of the host (`remotePlayers` is `NO_REMOTES` on clients); the host
  sees the client's.
- `bakedLamps.ts:1001`: the lamp loop's early-out uses `ca < t2.w` while `nsLampCone` uses `<=`. Harmless (k is 0
  there).
