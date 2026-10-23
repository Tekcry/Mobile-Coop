# Shadow accuracy audit (Michael ~14:45)

Opus shadow-accuracy auditor, branch `feature/sector-redesign-shadow` (off `feature/sector-redesign-lightrev` 7c403385),
2026-10-23. Read the code and measured in node with the real bakes (`scripts/shadow-audit/`, `PROBE_PHOTO=1` for LR13); no
GPU probe was needed (every picture number below comes from the shader code and Babylon's shader source, not a capture).
Line numbers are this branch's. The lead folds this into `light-measure.md` / the PROPOSAL.

**Parity tolerance found in code.** Unit: the field against the brute-force / GLSL formula to 1e-6
(`tests/lightField.test.ts:208`, `tests/lampFalloff.test.ts:77`). GPU (`scripts/e2e-darkness.mjs:54-58`): a probe point's
level within 0.03 of its target and steady within 0.03 over +-0.2 m, which deliberately keeps probes off shadow edges (no
edge parity test exists), then `DARK_TARGETS` bands (`darkCurve.ts:86`). Below, "tolerance" = 0.03 level, and a band flip
(`LIGHT` 0.28 / 0.6) is the failure a player feels.

Summary: (1) PASS, one fill FAIL fixed; (2) PASS for parity, FAIL for shut doors leaking past the 4-door cap (partly fixed);
(3) FAIL, three fixes built, one shader fix proposed. All fixes are behind the LR13 toggle (`world/shadowAccuracy.ts`,
default off). None needs `src/net`, `PROTOCOL_VERSION` or Michael.

## 1. Static shadow edges: meter / guards against the pixel - PASS (fill edge FAIL, fixed)

- Same point, same number. The meter (`gameState.ts:1533` `bodyLevel`) and guard perception (`enemy.ts:1610`, reading the
  player's `PlayerRef.light`, the meter's own value) read `LightField.visAt`: trilinear between 0.2 m cell centres,
  clamped to the lamp's box (`lightField.ts:324`, `:341`). The shader reads the same R8 bytes with a BILINEAR 3D sampler,
  clamped to the same cell centres (`bakedLamps.ts:894`), the same lamp column lists, the same door test. GPU filtering
  weights are 8-bit: error <= 1/256 of a cell's step, <= 0.004 level per lamp. **PASS** (0.004 < 0.03).
- Where the pixel taps. A surface taps the atlas one cell (0.2 m) off itself along its normal (`bakedLamps.ts:893`), so
  the drawn edge on a floor or wall sits where the field's edge is 0.2 m off that surface; a body's visible side
  (capsule radius 0.22, `gameState.ts:3385`) taps 0.42 m off the axis the meter samples. Over every open 0.5 m point at
  chest height (static level only): warehouseOps 1814 of 7799 points have some visible side of the body in a different
  band from the meter (939 of the 1590 edge points); campusOps 7958 / 76583; ctcourse 787 / 9507. This is a body being
  wider than a point, not a parity break: the meter is the body's chest / head, the picture shows its whole width. LR13:
  warehouseOps 1921 flips (edges are softer but more numerous). Polish option, not built (a gameplay retune): meter =
  the brighter of a small ring of chest samples (what the player sees lit), or tap bodies at their surface without the
  0.2 m offset (characters are not in the occupancy).
- Accuracy against real geometry (meter and picture agree, both off). Synthetic: a bulb at 4 m, 1 m from a 3 m wall.
  The bake's conservative occupancy (shapes grown half a cell, cells taken by their centres, `lampBake.ts:120`) makes the
  wall about 0.15-0.2 m bigger: at chest height the shadow ends 1.35 m past the geometric line (4.71 against 3.36), on the
  floor 1.5 m; 10-90% width 0.16-0.32 m (one cell + trilinear) whatever the distance. The shift is large only when a
  lamp sits just above an occluder's top (here 1 m); more darkness, never a leak. Polish item 4.
- LR13's bigger atlas: `LAMP_CELL` is a constant 0.2 (`lampBake.ts:15`); only the boxes grow. Synthetic edge numbers are
  identical in both modes (box 300 000 -> 768 000 cells). Atlas: warehouseOps 11.3 -> 30.1 MB, ctcourse 8.3 -> 14.3 MB,
  **campusOps 48.1 -> 134.2 MB** (an R8 3D texture; bake 27 s -> 118 s in node): flag for the LR13 perf step.
- **Ambient fill edge: FAIL, fixed.** The field takes the nearest 1 m fill cell (`lightField.ts:242` else-branch,
  `ambientGrid.ts` "nearest"); the shader's `lampAmb` texture is BILINEAR (`bakedLamps.ts:200`, tapped at `:782`), so at a
  zone edge the picture ramps over 1 m and the meter steps. |nearest - trilinear| over open points at 1.0 / 1.6 m:
  campusOps max **0.098**, 970 of 665 681 points over 0.03; warehouseOps / warehouse max 0.045 (14 / 10 points);
  ctcourse 0. Fix: with the toggle on the field reads the fill trilinearly (`lightField.ts:242`), exactly what the texture
  gives; test `tests/shadowAccuracy.test.ts` "the ambient fill".

## 2. Moving occluders - doors PASS (live, both sides); shut doors leak past the 4-door cap: FAIL, partly fixed

- Nothing re-bakes in the game; doors are a live cut in both paths. Leaves are not light shapes (`Doors` meshes, not
  `LevelBuilder` boxes), so the bake sees an open doorway; a closed leaf (`open <= DOOR_SHUT` 0.05, `lightField.ts:28`)
  cuts a lamp by one segment test, in the field per query (`lightField.ts` `doorBlocksOne`, reads `Doors.list` live) and in
  the shader from a per-frame shut flag (`bakedLamps.ts:320` `writeDoors`). Flashlights: the field tests every door
  (`dynamicInto`), the shadow maps draw the leaf, the meter's ray hits the closed door's STATIC body. A door peek crack
  keeps `open` 0 (shut in all three); a stick-held door is shut below 15% (`doors.ts` `drive`), open above in all three.
  Open: light through it is counted in the meter and drawn. **Parity PASS.**
- Nothing else moves: shutters are static boxes (`warehouseS1.ts:212-216`), roller doors are dressing, crates are static,
  breakable glass / grates are never light shapes (light passes in all three), bodies occlude in neither.
- Small accuracy notes (both sides agree): an open leaf casts no lamp shadow; a normal swing passes light from open 0.05
  (drawn 0.6-7.6 deg, under 0.04 s), not the 15% of G41.
- **Shut doors leaking: FAIL.** Each lamp tests only its 4 nearest doors (`DOORS_PER_LAMP`, `lightField.ts:30`; a GPU
  texel, `bakedLamps.ts` t6). A 5th closed door in reach whose doorway the lamp sees passes its light, in the meter and on
  screen alike. Measured (points 0.3-3 m behind each dropped leaf whose segment crosses it):

  | Map | Lamps over the cap (linear / LR13) | Leak points > 0.03 | Max leak | After fix: > 0.03 / max |
  | --- | --- | --- | --- | --- |
  | campusOps | 15 / 51 (max 12 / 23 doors in reach) | 73 / 25 | 0.108 / 0.039 | 33 / 25, 0.075 / 0.039 |
  | warehouseOps | 3 / 30 | 0 / 18 | 0.018 / 0.051 | 0 / 18, 0.018 / 0.051 |
  | ctcourse | 3 / 12 | 0 / 0 | 0 | 0 |
  | warehouse | 0 / 0 | 0 | 0 | 0 |

  Fix built (toggle): each lamp's list leaves out doors whose doorway it cannot see in its bake (`doorSeen`,
  `bakeVisSampler`, `lightField.ts`; the shader uses the same list, `bakedLamps.ts:145`). It halves the linear leaks on
  campusOps; under LR13 the remaining leaks are lamps that really see 5+ doors (2 on warehouseOps, 14 on campusOps).
  Proposed (not built, a shader layout change in `bakedLamps.ts` + `lightField.ts`, outside the owned files): 8 doors
  per lamp (a second door texel, `LAMP_TEXELS` 7 -> 8, `DOORS_PER_LAMP` 8), needed if LR13 is adopted.

## 3. Unshadowed lights - FAIL (three fixes built, one proposed)

Flashlights are the only real lights with baked lamps: `FLASHLIGHTS` 4 slots (`torches.ts:15`), the rig holds
`BAKED_POOL` 4, of which `BAKED_SHADOWS` 2 have shadow maps, 1 with micro detail (`lightRig.ts:28-37`, Textures above
Low). So with 2-4 torches on, 1-3 draw without a shadow map. The meter tests every torch with a Havok ray (`gameState.ts:1620`).

- **3a. Figures and weapons take Babylon's inverse square: FAIL, fixed.** Level, voxel, prop and door materials set
  `usePhysicalLightFalloff = false`; the operator figures (`figure.ts:256`, Wren for both players) and weapons
  (`weaponMesh.ts:48`) keep Babylon's default: 1 / d^2 with no range at all (so the beam-reach cut never applies) and a
  Gaussian cone (`pbrDirectLightingFalloffFunctions` `_Physical`), while the field is `1 - d / 13` x cos^2 (the studio
  stage already works around it, `studioStage.ts:153`). The player's body under a guard's torch, picture / meter, on
  axis: 1.08 at 1 m, **0.30 at 2 m, 0.14 at 3 m, 0.09 at 4 m, 0.05 at 6 m**; 0.2 rad off axis 0.23 at 1 m, 0.06 at 2 m. A
  player the meter calls lit by a torch at 4 m looks almost unlit. Fix: with the toggle the light rig sets the game's PBR
  materials to the standard falloff (`gameLightFalloff`, `lightRig.ts` `fitMaterial`), so a torch lights a body exactly as
  it lights the floor. The menu scene keeps its look (its own scene).
- **3b. Unshadowed torch whose beam a wall cuts: FAIL, partly fixed.** It is drawn with `range = reach` (`lightRig.ts:496`),
  the longest of 5 rays + 0.4 m (`torches.ts:67-92`). Two errors: (i) Babylon's falloff becomes `1 - d / reach`, so the beam
  dims towards the wall it lands on: picture / meter at 0.5 D 0.63-0.76, on the wall **0.12-0.24** (wall at 1.5-8 m) - a
  player standing in the beam by that wall reads lit, looks dark; (ii) when any edge ray escapes past a corner, reach is
  the full 13 m and the beam lights through the wall the other rays hit, on screen only (the meter is dark). Fix built
  (toggle): shadow maps go first to flashlights whose beam is cut (`torchShadowPass`, `lightRig.ts:397`), so with one
  shadow slot the cut torch is the shadowed one and an uncut one draws exactly at its full range. Still wrong when more cut
  torches are on than shadow slots. Proposed (not built: a shader change, GPU check only): draw the 4 torch slots in
  `LampPlugin` with `lampMath` (exact falloff and cos^2 cone, as the field) times a per-torch cut at its beam length, and
  take them out of the Babylon pools. The suggested "bake visibility tap" does not apply: the atlas is per fixed lamp, a
  torch moves.
- **3c. Bodies lit through walls for the guards: FAIL, fixed.** Body light (`enemyManager.ts:2151`) and the witnessed
  kill (`:951`) call `totalAt` without an occluder, so a torch behind a wall lights a body for body-finding while the
  picture (shadowed, or reach-cut) shows it dark. Fix (toggle): one static ray per torch (`rayOccluder`, as the player's
  `lightOccluder`).
- 3d. Capsules (`MAX_CAPSULES` 16, 4 per lamp, `bakedLamps.ts:55-56`): character shadows exist only in the picture (the
  field has no character occluders). A dropped capsule makes picture and meter agree, so the cap is not the risk; the
  shadow itself is: a body in a guard's capsule shadow shows down to 0.15 of that lamp's direct light (`bakedLamps.ts:644`)
  while the meter is unchanged (the darkness curve ignores it). Lists are the first 4 in reach, not the nearest; dead
  bodies and the co-op partner cast none (`gameState.ts:829`). Polish: skip capsule shadows on character materials.

## Fixes made (all behind `shadowAccuracyOn()`, default off; on with `?falloff=photo`)
- `src/world/shadowAccuracy.ts` (new, pure): the switch (`setShadowAccuracy` override), `gameLightFalloff`,
  `torchShadowPass`, `rayOccluder`.
- `src/world/lightField.ts`: trilinear fill; `bakeVisSampler`, `doorSeen`, `lampDoorLists(..., seen)`.
- `src/world/bakedLamps.ts`: the same door list. `src/world/lightRig.ts`: figure / weapon falloff, shadow pass order.
- `src/ai/enemyManager.ts`: `bodyOccluder` on the two body-light samples (a Guard AI file: 3 lines, may need a merge look).
- Test `tests/shadowAccuracy.test.ts` (7); unchanged and green: `lightField`, `lights`, `lampFalloff`, `coopTorches`; tsc clean.
- Default unchanged: every path reads the switch once and does today's thing when off.

## For the lead
- Wiring: the LR13 settings toggle already drives this (it follows `lampFalloffMode()`). To split it, call
  `setShadowAccuracy(on)` at boot before the map builds (`main.ts`, next to `setLampFalloff`). Co-op peers must run the
  same mode (as LR13); no wire change.
- GPU check when adopted (Test Runner, 4189): a guard's torch on Wren at 2-4 m against the floor beside her; a guard facing
  a wall with two torches on (micro detail on).

## Polish list (not built)
4. Penumbra and contact: panels and bulbs bake from one sample point (`lampBake.ts` `lampSamples`), strips along their
   length only, so edges are one cell wide (0.16-0.32 m) at any distance; a real fitting's penumbra grows with distance
   behind the occluder x fitting size / distance to it. Sample panels over their area (2x2 or 3x3: bake time x4-9) and
   shrink the conservative grow at high-leverage tops (lamp under ~1.5 m above an occluder). No contact shadows for
   static geometry beyond the bake; character capsules widen with distance (`bakedLamps.ts:642-644`).
5. One-bounce fill: none today (the fill is the zone's flat ambient, on or off alike). A baked per-lamp bounce term that
   switches with its lamp (PROPOSAL 7.5) keeps "a cut circuit is dark" and needs its own parity test.
