# LR16 batch 1 - fix round (checker A blocking items 1-3, checker B polish 4)

Branch `feature/sector-redesign-lr16int`, base da773613. Opus fix-round builder, 2026-10-23. Status: DONE.

## 1. Torch cone parity (picture feathers exactly like the meter)
- `src/world/bakedLamps.ts:722-752`: `SPOT_FALLOFF_CALL` / `SPOT_FALLOFF_SWAP` / `SPOT_FALLOFF_GLSL`. The lamp plugin
  regex-swaps Babylon's PBR spot-cone calls `computeDirectionalLightFalloff[_Standard](light*.vLightDirection.xyz,
  preInfo.L, ...)` for `nsSpotFalloff[_Standard]`, which run `nsLampCone` (`LAMP_MATH_GLSL`, generated from
  `SPOT_FEATHER` / `LAMP_FEATHER`: no constant typed twice) with the light's own cut (`vLightDirection.w` = cos outer)
  and exponent (`vLightData.w`). Two call sites in `lightFragment` (plain lights: the shadow-mapped torches and the
  non-clustered pool) and one in `pbrClusteredLightingFunctions` (the clustered pool). Babylon's glTF / physical / IES
  cone models are left alone (not used by the rig). Wired at `:1144-1149` (PBR only).
- Standard materials (editor light view only; it has no flashlights): `spotFeatherStd` (`:753-760`, used at `:1000`)
  scales a plain spot's colour by `nsLampCone / cos^exp` in the `CUSTOM_LIGHT` hook.
- `src/world/lightRig.ts:540-549`: `place` sets the exponent from `SPOT_EXP` / `LAMP_EXP` (were literals 2 / 1).
- Result (every PBR torch path: shadow-mapped, `nsTorches`, plain pool, clustered pool): the picture's cone factor
  = the meter's `lampCone`. Worst meter vs picture difference over the beam and the feather band (0..1.05 x outer,
  401 samples, Babylon's `_cosHalfAngle` from `place`'s angle): < 1e-6 (was 0.89 at the cut: cos^2 0.34 against 0).
  `SPOT_FEATHER` stays 0.65 (soft edges).
- Residuals (not cone): Babylon's diffuse BRDF and N.L on the picture side as before; the volume and standard
  paths' clustered spot (editor only, no torches) keep Babylon's cut. Torch specular is black (`LightRig.make`).
- Test: `tests/lampTorchCone.test.ts` (new): the swap hits each Babylon 9.29 call site exactly once with Babylon's own
  injection semantics (no `undefined` from `$n`), leaves glTF alone, and the spot through the swap = `lampCone`.
- Not checked: shader compile on a GPU (no e2e this round). The GLSL only calls functions defined before it
  (`pbrDirectLightingFalloffFunctions` precedes `CUSTOM_FRAGMENT_DEFINITIONS` in `pbr.fragment`; `nsLampCone` is
  under `BAKED_LAMPS`, with a fallback to Babylon's own function). First GPU run: e2e-lightbake / e2e-desktop.

## 2. LR16-3: door / prop casters in the slot cone fit
- `src/world/charShadows.ts:357-368`: `gather` keeps `slot.k` = the characters (what `covers` and `fittedSpheres` read),
  then `addDynamic` (`:383-434`) lists the leaves and props and writes their spheres into `slot.sp` after the
  characters; `fitCone` fits all `n` of them (cone, near and far planes). No characters: no fit (as before).
- Every open leaf in reach adds its sphere (the leaf mesh is one thin-instanced mesh: listed once). A prop adds its
  node + `PROP_REACH` (0.9 m) when a part is drawn. Capped at `MAX_SPHERES` (256). Allocation-free: a held 4-float
  scratch (`doorSp`), indexed loops.
- `src/world/charShadowSet.ts:430-441`: `doorSphere` (hinge line at mid height, radius hyp(width, height / 2)): holds the
  leaf at any swing; the reach test now uses it too (was the doorway centre with (w + h) / 2, which missed a leaf
  swung past 90 degrees).
- Tests: `tests/charShadowSet.test.ts:348-390`: the sphere holds the leaf at every swing; a leaf nearer the lamp than
  the guard is outside the guard-only fit and inside (near plane in front of it) with its sphere; allocation-free.
- Residual: a fit wider than `CHAR_SHADOW.maxHalf` is capped (`partial`), so a leaf far off the guards' side can still
  clip; a door / crate shadow still appears only while a character is in the lamp's reach (polish, unchanged).

## 3. `contribution()` photometric; campusS2 boost point
- `src/world/lights.ts:83-106`: `contribution` = gain x intensity x `lightTerm`; `lightTerm` = `photoTerm` over the
  reach for a fixed lamp, `lampTerm` (linear) for a flashlight, as the bake and the meter.
- `src/world/lightField.ts:371`: the field's unbaked lights (`dynamicInto`) read the same `lightTerm` (checker A
  polish: one root for `contribution`, `quickLevel` and the no-bake field). With a bake only the flashlights take
  this path, and they keep `lampTerm`: no in-game meter or guard change.
- Callers (grep): `editor/lightPreview.quickLevel` (the editor's quick light: now the bake's formula), tests
  campusS1:670, campusS2:518, campusS4:568, editor/lamps:61, lights:92-93. No gameplay caller; nothing where the
  picture differs from the meter.
- Tests: `campusS2.test.ts:515` passes (checker B measured 0.188 with this term, < 0.28).
  `tests/editor/lightPreview.test.ts:129-146`: quick light expects `photoTerm` for lamps, `lampTerm` for a torch, field
  = their sum. `tests/lights.test.ts:96-107`: the crouch-under-a-pool lamp is 0.45 m authored (reach 0.72 m) so a
  crouched head (0.81 m below) is out of the photometric pool (the linear term had hidden it at 0.96 m).

## 4. Docs polish (checker B 4)
- `docs/systems/coop.md:24,34`: `start.lf` / `hostLampFalloff` described as removed (LR16a), 38 kept until the train.
- `TESTING.md:49`: the Lamp falloff row is now the one-model check plus the soft torch edge.
- `scripts/lamp-audit.mjs` not touched (other agent's file).

## Checks
- `npx tsc --noEmit`: clean.
- vitest `--maxWorkers=2`, 97 files (every light / lamp / shadow / torch / campus / perception / vision / ctcourse /
  warehouse / dark / fill / night / ghost / sector / enemy / ai / net / rejoin / settings / crate / jammer / moveState
  file, editor lamps / lightPreview / night): the red list is exactly the known 15: ctcourseLight 4,
  warehouseS1Light 4, warehouseS2Light 3, warehouseS3Light 4 (LR16g). campusS2 green.
- `tests/__snapshots__/visionIsolation.test.ts.snap` line endings restored after the run.
- No e2e (brief).
