# LR15 build - 8 door slots per lamp, exact torch drawing

Opus engine builder, branch `feature/sector-redesign-lampx` (cut from #232 head 93546cd6), 2026-10-23. Builds the two
shader proposals of `shadow-audit.md` (section 2 "8 doors per lamp", section 3b "draw the torch slots in LampPlugin").
Both ride the LR13 shadow-accuracy toggle (`shadowAccuracyOn()`, `src/world/shadowAccuracy.ts`), default off. No
`src/net`, `PROTOCOL_VERSION` or save change; no `src/voxel` file touched.

## Toggle off = today
- Door lists: 4 slots, the same data texture layout (`doorBase = capBase + MAX_CAPSULES * 2`), the same texel values.
- Shaders: the new code sits under `#ifdef LAMP_DOORS8` / `#ifdef LAMP_TORCH`, both false off; the material defines
  string (and so the effect) is the same. One new UBO entry (`lampTorch`, 12 vec4) and its `uniform` line are declared
  but unread: the layout grows, no pixel changes.
- Light rig: `setTorchDraw` keeps `torchBuf` null off, so the flashlights go to the Babylon pools as before.

## 1. 8 door slots per lamp (audit section 2)
- `src/world/lightField.ts:33` `DOORS_PER_LAMP_ACCURATE = 8`; `:35` `lampDoorSlots(on)` (4 / 8);
  `:88` `lampDoorLists(..., seen, slots)` (stride = slots; the doorway-seen filter as before).
- `LightField` (meter, guard perception): `:131` `doorSlots`, `:325` the per-lamp door loop reads 8 with the toggle on.
- `src/world/bakedLamps.ts`: `:108` `doorSlots`, the one list built with it (`lampDoorLists(..., this.doorSlots)`);
  `:191` with 8 slots one texel per lamp sits between the capsules and the doors (`door2Base + lamp`: doors 5-8,
  ids + 1), `doorBase` moves past it; `:216` the write. Shaders: `:509` (volume mix, `defines` on the `EffectWrapper`,
  `:576`) and `:1000` (per-lamp loop) test t8 when t6's 4th slot is used; `:758` `LAMP_DOORS8`. `writeDoors` (volume
  re-mix) walks 8 slots. `LAMP_TEXELS` stays 8 (t7 is LR14's character shadow slot).
- Field and picture read the one list, so parity holds; the leak past the 4th door is gone for lamps that see up to 8
  doors (campusOps' worst lamp under LR13 sees 23 in reach, fewer in view: a 9th+ seen door still leaks, both sides).

## 2. Exact torch drawing (audit section 3b)
- `src/world/shadowAccuracy.ts:98` `TORCH_DRAW_SLOTS` 4 (x 12 floats: position + cut, axis + cos, colour x intensity x
  `LIGHT_GAIN` + radius); `:119` `torchCut` (1 inside the reach, a 0.2 m ramp to 0 at it); `:130` `torchDrawTerm`
  = `lampMath.lampTerm` over the torch's radius (the field's own per-torch term: linear `1 - d / 13` x cos^2 cut at the
  outer angle) x `torchCut(d, reach)`; `:141` `writeTorchDraw`; `:168` `TORCH_DRAW_GLSL` (`nsTorches`, the same x N.L).
- `bakedLamps.ts:111` `torchDraw` (toggle on, per-lamp loop, not the editor's standard look); `:760` `LAMP_TORCH`;
  `:793` the `lampTorch` UBO entry, `:854` bound per sub-mesh; `:885` the GLSL; `:1067` added to `nsDynD`, after the
  darkness curve as Babylon's lights were.
- `src/world/lightRig.ts:122` `setTorchDraw`; `:425` at each pick the flashlights left without a shadow map take the
  draw slots instead of the Babylon pool (shadowed ones keep their maps and Babylon spots, range = radius as before);
  `:452` `followTorches` moves them every frame between picks (allocation-free). `src/world/world.ts:268` wiring.
- Result: an unshadowed torch whose beam lands on a wall draws the meter's light up to the wall (the old draw was
  `1 - d / reach`, 0.12-0.24 of the meter on the wall), with the cut 0.4 m past the farthest edge ray's hit.
- Not fixed (by design of a spherical cut): a sliver under 1 m behind the wall inside the reach sphere is still lit on
  screen (as with today's range), and the "edge ray escapes past a corner" case (reach 13 m, lights through the wall
  the other rays hit) is unchanged for an unshadowed torch; only a shadow map fixes those (`torchShadowPass` gives the
  maps to cut beams first). Character capsule shadows are not applied to drawn torches (Babylon's unshadowed ones had
  none either). Lit materials the plugin is not on (non-PBR; not checked which, if any, the game has) no longer get the
  unshadowed torches.

## Tests
- `tests/shadowAccuracy.test.ts` 14 (7 before): "8 door slots per lamp (LR15)" (slots 4 / 8; the list holds the 8
  nearest seen doors, a 9th is dropped; 5-8 shut doors in a row: off, exactly n - 4 points leak; on, none; opened, both
  modes equal) and "exact torch drawing (LR15)" (walls at 2 / 3 / 4 m: the drawn term = `lampTerm` = the field's
  `dynamicAt` / (gain x intensity) to 1e-9 up to the wall; past the wall dark in the meter and past the reach in the
  picture; on the wall the old draw was < 0.3 of the meter, the new = 1; slot packing).
- Green: `lightField`, `lights`, `lampFalloff`, `coopTorches`, `lampPluginClone`, `lampPluginGap` (60 + 2 files);
  `npx tsc --noEmit` clean; eslint clean on the changed files. No bakedLamps unit test exists (Babylon); no e2e run.

## GPU checks needed (Test Runner, 4189, `?falloff=photo` for on)
1. A shut-door row of 5-8 doors on one lamp (a corridor of office doors under one panel): toggle on, every closed
   leaf stops the light behind it, on screen and on the meter; toggle off, doors 5+ leak as today.
2. A guard's torch on Wren at 2-4 m beside a wall (a 1-shadow-slot preset, micro detail on, so the torch is
   unshadowed when a second torch holds the map): the beam on Wren and on the wall matches the meter's reading;
   no dimming towards the wall.
3. Two torches facing a wall (micro detail on: 1 shadow slot): the shadowed one and the drawn one look alike at the
   same distance; nothing lit behind the wall beyond a hand's width.
4. Toggle on / off in one session (Settings > Gameplay > Lamp falloff, next match): off is pixel-identical to the
   93546cd6 build (shader compile log: no `LAMP_DOORS8` / `LAMP_TORCH` defines off); on compiles without errors
   (WebGL texture units unchanged: no new sampler).
