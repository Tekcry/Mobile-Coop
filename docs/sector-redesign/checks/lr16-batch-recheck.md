# LR16 batch 1 - fix-round recheck

Branch `feature/sector-redesign-lr16int` @ f8008542. Fix diff `da773613..f8008542` against checker A's 3 blocking items
(`lr16-batch-check-A.md`) and the fix report (`lr16-batch-fix.md`). Fresh Opus re-checker, 2026-10-23.

## Verdict: PASS

## Checks run
- `npx tsc --noEmit`: clean.
- vitest `--maxWorkers=2`, 30 files (lampTorchCone, charShadowSet, lights, lightField, editor/lightPreview, editor/lamps,
  lampFalloff, coopTorches, campusS1-S5, perception, ctcourseLight, warehouseS1/S2/S3Light, shadowAccuracy, lampBake,
  lampLevel, lampPluginClone, lampPluginGap, volLights, smoothWorldLight, enemyLightsOut, lampGridLossless, vision,
  visionIsolation, nightVision): **15 failed | 429 passed | 4 skipped**. The red list is exactly the known 15:
  ctcourseLight 4, warehouseS1Light 4, warehouseS2Light 3, warehouseS3Light 4. campusS2 green.
- `tests/__snapshots__/visionIsolation.test.ts.snap` line endings restored after the run. No e2e, no src edits.

## Item 1 - torch cone parity: resolved
- The swap regex (`bakedLamps.ts:733`) matches Babylon 9.29's real call sites: `lightFragment` lines 76 (`_Standard`)
  and 83 (default), and the one call in `pbrClusteredLightingFunctions`. glTF, physical and IES calls stay Babylon's.
  Babylon's regex injection (`materialPluginManager`, forced `g`, `$n` substitution, trailing `\n` inside the argument
  list) is what the test emulates. The `\n` lands inside the call's argument list, which is valid GLSL.
- Uniforms: `vLightDirection.w` = `_cosHalfAngle`, `vLightData.w` = `exponent`, for both the plain spot
  (`spotLight.pure.js:369-376`) and the clustered data texture (`clusteredLightContainer.pure.js:402-407`).
  `place` sets angle = 2 acos(cosOuter) and exponent = `SPOT_EXP`. So the cut and exponent are the meter's, and the
  `e < 1.5` feather pick in `nsLampCone` now chooses `SPOT_FEATHER` for torches.
- Physical falloff: `nsSpotFalloff` skips the swap under `USEPHYSICALLIGHTFALLOFF`. `LightRig.fitMaterial` calls
  `gameLightFalloff` on every lit material, and level, voxel, prop and door materials set the flag false, so game PBR
  takes the swapped path.
- Paths covered in game:
  - shadow-mapped torches and the plain pool: the `lightFragment` swap;
  - the clustered pool: the clustered swap;
  - the unshadowed torches: `nsTorches`, already `nsLampCone`;
  - co-op client torches: the same `kind: 'flashlight'` LightDefs through the same rig. coopTorches is green.
- The plugin attaches only to `PBRMaterial` in game (`attach`). Volume and standard are editor-only (`world.ts:263`
  passes `volume` null and no `standard`; the volume field says "the game never makes one").
- GLSL by reading:
  - `pbrDirectLightingFalloffFunctions` (`pbr.fragment` :112) comes before `CUSTOM_FRAGMENT_DEFINITIONS` (:122) and
    is not guarded, so the `#else` fallbacks resolve.
  - `nsLampCone` is in `LAMP_GLSL` under the same `BAKED_LAMPS` guard, and the appended functions follow it.
  - `pbrClusteredLightingFunctions` (:133) comes after the definitions.
  - The std hook (`spotFeatherStd`) sits after `vec4 diffuse{X}`, scales only `.rgb` (`.a` is the range), and
    `vPositionW` is an unconditional varying in `default.fragment`.
- Other SpotLights: the char-shadow slot lights have intensity 0 and a no-mesh layer mask. The menu scene and the
  editor quick lamp have no game plugin path.
- `tests/lampTorchCone.test.ts` is legitimate. It runs against Babylon's own shader strings, and a JS port of the
  generated `nsLampCone` is checked against `lampCone`.

## Item 2 - door and prop spheres in the cone fit: resolved
- `gather` sets `slot.k` from the characters only, and `addDynamic` appends door and prop spheres after them in
  `slot.sp`. `fitCone` takes all `n` spheres, so the cone, near plane and far plane frame the casters.
- `covers` and `fittedSpheres` read `slot.k` and `spReady` (characters only), so the door and prop spheres are fit-only.
- `slot.list` is cleared before `gather` (`charShadows.ts:317`), so the new early `if (!k) return false` leaves no
  stale list.
- `doorSphere`: centre on the hinge line at mid height, radius hyp(w, h/2). It holds the leaf at any swing.
- Allocation-free: a held `doorSp` Float32Array, `sp.set(ds, off)` and indexed loops. The capacity is bounded by
  `MAX_SPHERES`. Render-only; nothing gameplay reads it.

## Item 3 - photometric `contribution()`: resolved
- `lightTerm`:
  - fixed lamp: `photoTerm` over `radius` (already `lampReach`), the bake's formula and reach. The bake's
    `l.reach ?? l.radius` is `radius` for fixed lamps, since `reach` is set only for flashlights;
  - flashlight: the same `lampTerm` call as before, argument for argument, so flashlight levels are unchanged.
  - Pure and allocation-free.
- With a bake there is no gameplay change:
  - `bakedLights` bakes every non-flashlight, and `LightField` marks each baked id, so `dynamicInto` sees only
    flashlights. Their term is unchanged, so the meter and guard perception are the same for fixed lamps and
    flashlights.
  - There is no gameplay `contribution()` caller in src; the only one is `editor/lightPreview.quickLevel`.
- When the game has no bake: `World.create` always awaits `bakeLevelLight`, and `bake.lamps` is null only when the map
  has no fixed lamps. Then `dynamicInto` has no fixed lamp to read. No-bake fields remain only in the editor quick
  light and tests, so this is not a gameplay regression.
- The changed tests are legitimate:
  - `lightPreview`: the expectations follow the intended formula change (lamp `photoTerm`, torch `lampTerm`), and a
    torch case is added.
  - `lights` (crouch under a pool): the test's own scenario ("standing head in, crouched head out") needs the
    crouched head outside the reach. Photometric saturates both at radius 0.6 (reach 0.96 m), so the lamp is 0.45
    (reach 0.72 m); the assertions are unchanged.
  - campusS2 is unchanged and now sums the photometric term. Unoccluded plus ambient is an upper bound on the real
    baked level, so the point is dark.

## Non-blocking (polish)
- LR16-3 fit: the axis is the mean of all spheres. An open leaf on the far side can push the fit past
  `CHAR_SHADOW.maxHalf` (`partial`). Characters then outside the capped cone fall back to capsules. `covers` stays
  honest, so there is no wrong shadow, but the character shadow quality drops. A later pass could refit
  characters-only when the joint fit is partial.
- A door sphere that holds the lamp (a lamp close over a doorway) is skipped by `fitCone`, so that leaf can still
  clip, as before the fix.
- Unbaked non-cone pool lamps with a shadow map use `SHADOW_LAMP_CONE` (0.8 pi), which differs from the meter's
  `LAMP_CONE_COS`. This applies in the editor and unbaked only, and predates the fix.
- GPU compile is still to be confirmed on the first e2e-lightbake / e2e-desktop run (not run here, per the brief).
