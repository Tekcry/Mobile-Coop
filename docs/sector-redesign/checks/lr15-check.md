# LR15 check - 8 door slots per lamp, exact torch drawing

Fresh Opus checker, 2026-10-23. Branch `feature/sector-redesign-lampx`, head 46a5c021 (code 243cb45c), diff
`93546cd6..HEAD` (7 files, src/world only). Spec: `shadow-audit.md` 2 (:76) and 3b (:101).

## Verdict: PASS

No blocking items. Toggle off is unchanged; field and picture share the 8-door list and the torch term; the shader layout
is consistent and adds no sampler.

## 1. Toggle off = 93546cd6
- Door lists: `lampDoorSlots(false)` = 4 (`lightField.ts:35`), `lampDoorLists(..., slots = DOORS_PER_LAMP)` (`:88`) has
  the old stride and loop. `LightField.doorSlots` 4 (`:131`), the per-lamp loop at `:325` reads 4 as before.
- Data texture: `doorBase = door2Base + 0` when slots = 4 (`bakedLamps.ts:191-192`), so the texel layout and values are
  as before. The doors 5-8 write at `:217` runs 0 times.
- Shaders: the new code is under `#ifdef LAMP_DOORS8` / `#ifdef LAMP_TORCH`. Both defines are false off
  (`bakedLamps.ts:758,760`). Babylon only emits true defines, so the effect key is unchanged. The volume mix gets
  `defines: null` off (`:576`). The `lampTorch` UBO entry (`:793`) and its `uniform` line are declared but unread: the
  UBO grows by 192 bytes with no pixel change.
- Light rig: `torchDraw` is null off (`bakedLamps.ts:173`, needs `accurate`). `setTorchDraw` also gates on the rig's own
  `accurate` (`lightRig.ts:123`). With `torchBuf` null, the draw block (`:426`) and `followTorches` (`:454`) are skipped,
  so every unshadowed flashlight still goes to the Babylon pool (`:443-448`).
- "Non-PBR lit materials no longer get unshadowed torches" applies with the toggle on only, since `torchBuf` is null
  otherwise. In-match lit non-PBR materials (grep `new StandardMaterial`, unlit ones excluded): fences
  (`levelBuilder.ts:445`), ropes (`ropes.ts:26`), the rope line (`ropeLine.ts:24`) and bullet decals (`vfx.ts:77`).
  Characters (`figure.ts:256`), weapons (`weaponMesh.ts:48`), doors, props (`partLibrary.ts:84`), the level and glass are
  all PBR and get the plugin (`bakedLamps.ts:266`). The cheap path (`?gfx=min`) builds no baked lamps
  (`world.ts:252`), so its torches stay Babylon lights. Gameplay is not affected (the meter does not read materials).

## 2. Parity with the toggle on
- Doors: field and picture build their lists from the one function with the same slots and the same doorway-seen filter
  (`lightField.ts:168`, `bakedLamps.ts:172`). Both the field loop (`:325`) and the shader (t6, then t8) test up to 8.
- Torch term: `nsTorches` (`shadowAccuracy.ts:168`) = `(1 - d / radius) * cos^2`, cut at `cosOuter`, times
  `min(1, (cut - d) / 0.2)`. That equals `lampTerm(..., SPOT_EXP = 2)` x `torchCut`, which equals the field's per-torch
  term in `dynamicInto` (`lightField.ts:389`). The gain follows the baked-lamp convention: `LIGHT_GAIN` x N.L x albedo in
  the picture, `LAMP_LEVEL_GAIN` in the field. It is added to `nsDynD` after the darkness curve, as Babylon's lights were
  (`bakedLamps.ts:1067`). Babylon's PBR diffuse x `directIntensity` PI equals the drawn term, so brightness is unchanged
  on PI-intensity materials.
- Known limits (as the builder notes, not new): the field tests closed doors for torches (`lightField.ts:392`), but the
  drawn torch has no door test, only the reach cut (Babylon's unshadowed torch had none either). A 9th+ seen door still
  leaks on both sides alike.

## 3. Shader layout
- `fid` is lamp index + 1 in data order (`bakedLamps.ts:479,969`). t8 = `capBase + MAX_CAPSULES*2 + fid - 1`, which
  equals `door2Base + i` as written at `:217`. `lampGridO.w = capBase` in both the mix (`:605`) and the material UBO
  (`:841`). The capsule writes stay within `capBase .. +32` (`MAX_CAPSULES` 16 x 2). The door texels start after the
  `n` second door texels, and `lampMore.x = doorBase` (`:611,805`). Both loops (mix `:509`, per-lamp `:1000`) read t8
  only when t6's 4th slot is used (the lists are nearest-first and contiguous).
- `LAMP_TEXELS` stays 8 (t7 = LR14 character shadow slot, `:1022`). The extra door texel is outside the lamp block.
- No new sampler, so the texture count is unchanged (LR14 max 12 of 16).
- UBO: `lampTorch` is a vec4[12]. std140 has no padding for a vec4 array, and the 48-float `updateFloatArray`
  (`:854`) matches the same pattern as LR14's `lampCsM`. The total plugin UBO is well under 16 KB. No new uniform block.
- WebGL2: `texelFetch` is already required. `nsTorches` uses a constant loop with uniform indexing by loop index,
  `continue`, and no name clash (`grep nsTorches`: one definition, one call). `normalW`, `vPositionW` and
  `surfaceAlbedo` exist at the injection point, and `LAMP_TORCH` excludes standard materials and the volume path.
  In the mix shader, the inner `int c` is in its own for-scope before `vec3 c` (`:530`): legal GLSL.

## 4. Rules
- `writeTorchDraw` and `followTorches` do not allocate. The pick reuses `this.dist` as `taken` and `torchIds` is an
  Int32Array.
- There is no `Math.hypot`. `torchDrawTerm` uses `Math.sqrt`, but it is test/reference only, not a hot path.
- No `src/net`, `PROTOCOL_VERSION` or save file is in the diff. No new Babylon import.

## 5. Checks run (slot 1)
- `npx tsc --noEmit`: clean.
- Vitest: shadowAccuracy 14/14, lightField 15/15, lights 10/10, lampFalloff 9/9, coopTorches 12/12,
  lampPluginClone 1/1, lampPluginGap 1/1. No e2e.
- The tests are meaningful for the CPU side. They cover the off leak count (`n - 4`) and the on cut, open-door equality
  between modes, the drawn term = `lampTerm` = field / (gain x intensity) to 1e-9, the reach cut and the slot packing.
  Not covered: the texel placement in `BakedLamps` (Babylon) and the rig routing (`drawnTorches` is untested).

## Polish list
1. Toggle on: fences, ropes, the rope line and decals lose unshadowed torch light. Fix: keep a Babylon light for them,
   or move those materials to PBR.
2. Drawn torches have no specular highlight (Babylon PBR spots gave one on weapons, metal and wet surfaces).
3. The drawn torch ignores `vLightingIntensity`. This is correct for the PI-intensity materials, but the
   `levelBuilder.ts:400` glass does not set `directIntensity`, so it gets the torch PI times brighter than before.
4. The drawn torch has no closed-door test, while the field has one (pre-existing). The beam rays usually stop at a leaf.
5. Add a rig test (`drawnTorches` count with 1 shadow slot and 3 torches) and a `BakedLamps` data layout test if a
   headless engine allows.
6. `torchDrawTerm`: `hyp3` for style.

## GPU checks for the laptop (Test Runner, `?falloff=photo` for on)
1. The builder's 4 checks (`lr15-build.md`): a shut-door row of 5-8, a torch on Wren by a wall, a shadowed vs a drawn
   torch alike, and an on/off compile log without errors.
2. A drawn torch must follow its guard smoothly on frozen level materials. This confirms that `bindForSubMesh` updates
   `lampTorch` every frame. If the beam sticks or lags, the frozen-material bind is skipping the plugin.
3. Toggle on, a drawn torch on Wren and on a weapon: the brightness matches the floor beside them, with no PI x jump.
4. Toggle on, a torch on a fence or rope: an expected loss of light (polish 1). Confirm it is acceptable.
5. Shader compile log with the toggle on: `LAMP_DOORS8` and `LAMP_TORCH` compile, the texture units are unchanged, and
   there are no UBO size warnings.
