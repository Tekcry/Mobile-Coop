# LR16t check A - rendering path correctness (Opus, 2026-10-23)

Branch `feature/sector-redesign-lr16t` @ 7e4c8b8e, base f8008542. Scope: `torchShadows.ts`, `torchShadowSet.ts`,
`shadowAccuracy.ts` (`TORCH_DRAW_GLSL` both branches), `bakedLamps.ts` (define, sampler, uniforms, bind), `lightRig.ts`
(`setTorchShadows`, stable slots), `world.ts` wiring; `src/ai` change read for the occluder wiring only.

Runs: `npx tsc --noEmit` clean. `npx vitest run torchShadowSet torchOcclusion shadowAccuracy lampTorchCone lightField
charShadowSet --maxWorkers=2`: 6 files, 72 / 72 pass.

## Verdict: FIX (one item)

## Blocking

1. **A stale torch map reads "lit" outside its own frustum: the leading edge of a turning guard's beam goes through
   walls on every frame the map does not refresh.**
   `src/world/torchShadowSet.ts:230` (`if (abs(uv.x) >= 1.0 || abs(uv.y) >= 1.0) return 1.0;`) together with
   `src/world/torchShadows.ts:262` (`torchRefreshEvery`: non-nearest slots render every 2nd frame, x the governor's
   `shadowEvery`, which is 2 under load, so every 4th frame; the nearest one every `shadowEvery`).
   The torch uniforms (`lampTorch`: position, axis) are written every frame (`LightRig.followTorches`), but the tile and
   its view-projection snapshot (`lampTsM`) only change when the map renders. The frustum is the cone + `fovPad` 0.06 rad
   (0.03 rad per side). Guards turn at `turnRate` 7.85 rad/s (`src/config/movement.ts:217`), about 0.13 rad per frame at
   60 fps.
   Failure: 3-4 guards searching with torches. One that is not nearest the camera turns toward a wall with a room
   behind it. On the frames its map is not refreshed, the leading ~0.10 rad of its beam (the feather band, 0.24-0.34 rad
   off the axis) projects outside the old frustum, `nsTorchShadow` returns 1.0, and the beam lights the room behind the
   wall. The meter (field ray) says dark, so this is a parity break. Under the governor (3 frames stale, about 0.39 rad)
   the whole leading half of the beam is unshadowed. It shows as rim light flickering through walls while guards scan,
   which is Michael's complaint. Deviation 6 already says "a torch never shows through a wall", and this path breaks it.
   Fix (either; the second is better):
   - in `nsTorchShadow`, a valid map (`P.w` 1) returns 0.0 outside its frustum. In steady state no point in the cone
     lands there: the cone fits inside the square frustum + pad, and the normal offset (at most ~0.07 m at 13 m) stays
     inside the 0.03 rad pad (~0.39 m at 13 m). Only a stale map hits it, and a dark sliver for a frame is better than
     light through a wall. Update the GLSL test (`tests/torchShadowSet.test.ts` asserts the strings);
   - and/or in `TorchShadows.frame`, keep the torch pose the tile was rendered from (position + axis, written in
     `copy`). When the current pose has turned more than ~`fovPad / 2`, or moved more than a few cm, force this frame's
     render (`slot.map.resetRefreshCounter()`) instead of waiting for the slot's interval.

## Checked, correct

- GLSL (WebGL2 / ANGLE): `nsTorchShadow` has the same structure as the GPU-proven `nsCharShadow` (const `TS_DISK[16]`,
  constant loop bounds with uniform-driven `break`, `texelFetch` only, so no gradient ops in divergent flow; uniform
  arrays indexed by an int argument, legal in ES 3.00). `td[k]` dynamic component index is the existing `t6[c]`
  pattern. No name clashes with `CS_DISK` / `nsCharShadow`. Everything is under `#ifdef LAMP_TSHADOW`, inside
  `LAMP_TORCH`, after `LAMP_GLSL` (`lampTexel`, `nsDoorBlocks`, `lampMore`). `#else` matches the old path apart from the
  stride (`TV` = 4) and the unused `gn` argument. `vNormalW` is already used unguarded in the plugin (lines 949, 1040).
- Depth metric: clip z before the divide, so (z + min) / (min + max) is linear with slope 1 / (max - min); blocker depth
  and penumbra follow from it; `sx` = P00 (the first row of the VP's 3 x 3); reverse depth via `lampTsI.w`. All match
  `charShadows.copy` and Babylon's spot projection (`angle` = full fov = `torchShadowFov`).
- Far plane at radius + 0.5 (deviation 1): right. A receiver in range never lands past the cleared texel.
- Slots and tiles: atlas tile k = draw slot k = `LightRig.torchSlotIds[k]`. Stable slots (`torchKeep`) never blank a kept
  tile. On a torch change in a slot, `params.w` goes to 0 (dark, never a leak) until that slot's own render copies. Off
  / destroyed: idle, door vec4 zeroed. `writeTorchDraw(null)` also zeroes the door vec4.
- Door test: `nsTorchDoors` runs `nsDoorBlocks` on the lamp data's door texels (`lampMore.x` + (id - 1) x 2). It uses
  the same `w.doors.list` order as `BakedLamps.doors`, the same `DOOR_SHUT` and the same plane / segment test as
  `LightField.doorBlocksOne`. `writeDoors` (per frame, in `lamps.frame()`) runs before `torchShadows.frame()`, so the
  shut flag and the pick agree on the frame a door shuts. Shut doors past the 4 picked still cut through the depth map:
  the thin-instanced leaf mesh is a caster, and `thinInstanceRefreshBoundingInfo` keeps its bounds over all leaves.
- Samplers: with the atlas on, the rig's shadow pool is capped at 0, so the spot shadow samplers go: net -1 on Medium+,
  +1 on Low. Micro voxel shader: the LR14 measurement (10-23, after `LAMP_SKY` 10-21) was 15 + 1 spot = 16; now 15 +
  `lampTsAtlas` = 16. This still needs the GPU check (`e2e-lightbake`, `?voxels=1`), as the build report lists. UBO
  grows by 25 vec4 (about 130 vec4 total, well under 16 KB).
- Fallback: `supported()` false means `on` false, so `LAMP_TSHADOW` is off, `tsOn` is false and the old pool + reach
  cut stay. Baked lamps need WebGL2 anyway (`texelFetch`, `sampler3D`), so WebGL1 never reaches this path. Volume mode
  and the editor's standard lamps have `torchDraw` null, so no `TorchShadows` is built.
- Context restore: `invalidate` gives dark (w 0) until each map copies again. "Nothing to cast" slots come back to w 2
  on the next `frame`. Same pattern as `CharShadows`.
- Hot path: `frame`, `gather`, `pickTorchDoors`, `copy` and the rig's keep loops allocate nothing (closures are made
  once in `makeSlot`; `stats()` is not called per frame). `hyp3` is used, no `Math.hypot`. Babylon is imported only via
  `core/babylon`; `torchShadowSet.ts` is Babylon-free. No gameplay path reads the atlas.
- Cost: casters are culled per frame for each in-view slot (O(casters), early distance out, two trig calls), tens of µs
  for 4 slots. Depth passes are the real cost (unmeasured, see GPU list).
- Parity of the soft edge: the `LAMP_TSHADOW` term is `(1 - d / r) x nsLampCone(ca, cosOuter, 2.0)` = `lampTerm` =
  `torchDrawTerm(.., false)`. The open-beam field test passes (< 1e-6 at 200 points), and `nsLampCone` = `lampCone`
  (`lampTorchCone` / `lampFalloff`, < 1e-6). The picture's beam rim is the meter's feathered cone.
- Co-op joiner: `TorchShadows` reads only the registry (mirrored by `TorchMirror`) and `doors.list`. No wire change.
- `enemy.ts` fallback: `bodyOccluder` is a class field initializer, so it is set before the ctx literal in the
  constructor body. `fieldLight` passes it.

## Polish (not blocking)

1. Out-of-view skip (`torchShadows.ts:243-248`) keeps the old map with `w` 1. If the torch moved while out of view and
   the camera flicks onto it, the first frame (planes lag one frame) projects the new beam through the old matrix. That
   gives either a leak or wrong shadows for one frame. Item 1's pose check covers it; otherwise set `w` 0 on a skip
   when the pose changed.
2. On a slot id change with an unchanged interval, the map waits for its next scheduled render (dark for up to
   `every - 1` frames, more under the governor). Call `slot.map.resetRefreshCounter()` when `slot.id` changes, so the
   tile is valid the same frame.
3. Back-face-only depth with level geometry: a contact band about `bias` + 1-2 texels wide (3-5 cm) on surfaces
   touching a wall's far face (the floor behind a wall base) can read lit. This is GPU list item 10; look at a wall base
   on the shadow side at 5-10 m.
4. A torch head within 0.15 m (`near`) of thin geometry (a leaf, a thin proxy box) clips it from the map. The torch
   sits 0.35 m ahead of the feet, so a guard pressed into a door or thin panel can light through it. The shut-door
   analytic test covers doors; only thin non-door panels are exposed.
5. `holdsTorch` drops any character whose sphere (+ 0.3 m) holds the torch, not only the holder. Another guard or the
   player within ~1.3 m of the torch casts nothing into that beam. This is picture only; the field ignores bodies.
6. `TorchShadows` is built on every baked-lamp map, including bright maps with no torch slots (`addTorchSlots` only
   adds them on dark maps): 4 generators, 4 targets, the atlas, and +1 sampler on every lit shader for nothing. Skip it
   when the registry has no flashlight.
7. Standard-material receivers (`materials.ts` flat materials, etc.) get no torch light at all while the atlas is on.
   Before, they got the 2 Babylon shadow-mapped torches. This is minor, but it should be noted in the header.
8. Thin non-door panels and the 2-sided normal offset (`normalize(vNormalW)`, not flipped on back faces) behave as in
   `CharShadows`. Nothing to do unless the GPU check shows it.
