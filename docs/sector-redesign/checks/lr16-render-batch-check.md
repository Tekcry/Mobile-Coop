# LR16 render batch check - lr16pol-b, lr16pol-e, lr16l-b

Checker: Opus 5.5 (fresh), 2026-10-24. Read only. Checked on a temporary detached worktree at the octopus merge of all
three onto the current lr16int head, i.e. what will ship.

| Branch | Head | Base | Verdict |
| --- | --- | --- | --- |
| `feature/sector-redesign-lr16pol-b` (LR16-POLISH part B) | `71b0ed6d` | lr16int `82f9e1bb` | **PASS** |
| `feature/sector-redesign-lr16pol-e` (LR16-POLISH part E) | `a434dbb7` | lr16int `82f9e1bb` | **PASS** |
| `feature/sector-redesign-lr16l-b` (LR16-L part B) | `7ed21ed6` | lr16int `82f9e1bb` | **PASS** |

Merge: lr16int is now `85b7ff10` (LR16-W, LR16-L A, pol-a merged since the base). `git merge --no-ff` of all three at
once: **clean, no conflicts** (local merge `744af092`, not pushed). pol-b and pol-e share `torchShadows.ts`: disjoint
hunks (B: header, import, `frame`, `gather`; E: `registryHasTorch`, `hasTorch`, constructor, head of `configure`).

No must-fix items.

## Runs (merged tree)
- `npx tsc --noEmit`: clean.
- `npm run lint`: **0 errors**, 42 warnings (all pre-existing `no-console` in scripts / docs). The base's
  `tests/torchOcclusion.test.ts:166` error both build reports mention is fixed on lr16int (`bef5ca5f`).
- vitest `--maxWorkers=2`, slot lock `sr-slot-1`, CPU 63% at start: torchShadowSet, levelLitMaterial, torchOcclusion,
  shadowAccuracy, lampTorchCone, coopTorches, lightField, lampPluginClone, lampPluginGap, lightRigFlicker, charShadows,
  torchShadowsBright, lampFlicker, lights, charShadowSet, sectorLampSync, glslPrecision, bounceGrid, lampFalloff,
  darkCurve: **20 files, 182 / 182 passed** (16.4 s).
- Not run (rules): e2e, build, full vitest.

## Part B (lr16pol-b) against the brief
- **Holder-only drop (lr16t A 5)**: `torchShadowSet.ts` `torchHolderScore` / `pickTorchHolder`. Deviation from the
  brief's "nearest the torch" rule, justified in the report and better: the score is the plan distance to the holder's
  feet recovered by inverting `placeTorch` (checked: `fx = lx - s*ahead - c*side`, `fz = lz - c*ahead + s*side` is the
  exact inverse of `torches.ts:47-49`; `TORCH.ahead / side` are unscaled, only y takes `scale`). Still gated by
  `holdsTorch` (r + 0.3). `gather` then drops every character caster under the holder's root node. Verified the root is
  per character: `CharacterRig.root` has no parent (`characterRig.ts:1273`), the merged body is parented to it
  (`smoothBody.ts:241`), gun via `weaponPivot`, helmet / armour via head / torso nodes; no code parents rig roots under a
  shared node (only `figure.ts:453`, which parents a figure under its own rig). So a second guard or the player beside
  him casts again. Allocation-free (`rootNode` walks parents, compaction in place).
- **Governor rule (lr16t recheck 1)**: `torchPoseStale` split into `torchPoseMoved` / `torchPoseTurned` (stale stays
  their OR, used unchanged by the off-screen branch `torchShadows.ts:279`); `torchForceRender(valid, moved, turned,
  every)` forces new / invalid / moved always, turned only at governor 1. At governor 1 identical to LR16t (tested).
  The off-frustum-reads-0 shader rule is untouched, so a late refresh shows a dark rim, never light through a wall.
- **Fences / ropes / rope line / decals (lr15-check 1, lr16t A 7)**: new `src/world/levelLitMaterial.ts`.
  `levelIsPbr` keys off the level's own `markLampLevel`-ed `PBRMaterial`, which exists only when `build` had an atlas,
  so it follows `opts.atlas` exactly. `levelPbrMaterial` copies `levelBuilder.ts:575-585` (metallic 0, roughness 1,
  range falloff, `directIntensity` PI, env 0.6, `realTimeFiltering`); `toLinearSpace()` is pow 2.2, the same as the
  level's `lin`. Order is safe: fences are built at `levelBuilder.ts:687` after the level material (`:575`); `Vfx` is
  made in `GameState`'s constructor after `World.create`; `Ropes` and `RopeLine` are lazy. The standard / `?gfx=min`
  path keeps `StandardMaterial` (and its `specularColor` black). Fences are `DOUBLESIDE` planes, so both faces have
  correct normals for the lamp plugin's N.L. No `markLampLevel` (body fill cap as props), as the brief says.
- **Header**: `torchShadows.ts:16-20` names the receivers that still get no torch light.
- **A 6** moved to part E as the brief allowed; the report's reason holds (alone in `torchShadows.ts` it would hand the
  baked pools 2 spot maps: +1 sampler, not -1).

## Part E (lr16pol-e) against the brief
- **A5 `paintFlicker`**: on a `flickerVersion`-only move writes only `reg.flickering`'s texels (`bulbTexel`, the same
  rule as before), copies to the fitting face (`fitOf` / `fitK`) and pendant (`swayOf`), re-uploads only the meshes
  that hold one. Lookup tables are built at load in the constructor before `buildFittings` / `buildSway` fill them.
  Indexed loops, `fitDirty.fill(0)` on a preallocated array: no allocation. `version` and night-vision changes still
  take the full `paintBulbs`; LR16-5b's pendant path kept.
- **A6 + B1 comments**: `lights.ts` `tickFlicker`, `coopClient.ts` `simTime`: comment only (diff checked; no code in
  `src/net` moved).
- **lrpolish 4 / 5**: `copy()` comment names what is skipped; `COPY_GLSL` exported; `charShadows.test.ts` asserts no
  `vUV` and drives `covers` with a fake slot.
- **lr16t A 6 (from B)**: `registryHasTorch` (load-time loop); `TorchShadows.configure` forces tile 0 without a
  flashlight, so no generators / targets / atlas and `on` false; `LightRig.configure` gives 0 spot casters when baked
  and no torch. Safe: `bakedLights` bakes every non-flashlight (`lightBake.ts:17`), so on such a map the shadow pool
  had nothing to hold; registry lights are only added at load (`levelBuilder.ts:531`, `torches.ts:38`); the co-op
  client builds the same slots. `lightRig.ts` -> `torchShadows.ts` import adds no cycle.

## LR16-L part B against the brief (lines 125-141, Acceptance)
- **B1**: highp on `taau` (3), `postStack` volumetric (2), `cinematicPost` (3), `paniniPass` (1), and nightBloom's
  BRIGHT / MEASURE `src` (read the HDR scene). Not done: `rtReflections.ts:24-25, 221-222`, which the brief lists; the
  builder skipped it as another builder's file this round (pol-a, now merged). Reflections are off at Low, so the
  phone never runs it: polish 1, not a block.
- **B2**: `precision highp int;` first line of `LAMP_GLSL` (`bakedLamps.ts:904`, injected at global scope inside
  `CUSTOM_FRAGMENT_DEFINITIONS`, `:1190`) and in `MIX_GLSL` after `precision highp sampler3D;` (`:624-625`). A global
  precision statement there is legal GLSL ES 1.00 / 3.00; the plugin is GLSL-only (`isCompatible`).
  `bounceGrid` / `lampFalloff` containment tests still pass.
- **B3**: `surfaceAtlas.ts:216` `min(texel, 1.0 / 512.0) * 4.0` with the comment: Low = Medium, 512 / 1024 px tiles
  unchanged.
- **B4**: `tests/glslPrecision.test.ts` (3 cases) passes.

## Cross-checks
1. **Light parity**: rendering only. No file under `src/ai`, `src/player`, `lightField.ts`, the meter or the bake
   changed; `lights.ts` and `coopClient.ts` are comment-only. Nothing in gameplay reads the new state (`hasTorch`,
   holder pick, governor force, material class, sampler precision, normal step).
2. **Hot paths**: `gather`, `frame`'s force rule and `paintFlicker` are allocation-free; the new pure helpers use
   `hyp2`; no `Math.hypot`, `for...of`, closures or temporaries added in per-frame code (`levelIsPbr` /
   `levelPbrMaterial` / `registryHasTorch` run at load or on a config change).
3. **Babylon**: every import through `src/core/babylon.ts` (`levelLitMaterial.ts:10`, `ropeLine.ts`, `vfx.ts`,
   `ropes.ts`). No new side-effect import needed: `PBRMaterial` is already used by the level, and the new materials use
   no feature the level's does not (albedo texture + alpha test on the fence; `alphaCutOff` 0.4 as the standard one).
   Standard / `?gfx=min` path still `StandardMaterial` on all four.
   **Texture units per preset** (the `e2e-desktop:3` / `e2e-lightbake` <= 16 concern), reasoned in code:
   - The level PBR material is unchanged by this batch on a dark map at every preset.
   - Fence PBR = level - `surfDetail` - `surfNormal` - `lampSky` (no `LAMP_LEVEL`) + `albedoTexture` = level - 2.
     Rope, rope line, decal = level - 3. Same lamp-plugin defines otherwise (`LAMP_CSHADOW`, `LAMP_TORCH`,
     `LAMP_TSHADOW`, `LAMP_FILL`, `LAMP_MOON`), same rig shadow count. If the level compiles at a preset, these do.
   - Bright map (no torch slot): before, atlas on (`LAMP_TSHADOW` +1) and rig casters 0; now atlas off and casters 0:
     **-1 sampler** in every lit PBR shader at every preset with a torch tile (all non-minimal).
   - Dark map at a tier where the atlas is unsupported: rig keeps min(casters, 2) as before (unchanged).
   - LR16-L B adds qualifiers only, no sampler.
4. **Wire / save**: no `PROTOCOL_VERSION`, protocol, snapshot or save change.

## Polish list (not blocking)
1. `src/vfx/rtReflections.ts:24-25, 221-222`: make `textureSampler`, `depthSampler`, `sceneSampler` `uniform highp
   sampler2D` (LR16-L B1 named them; pol-a, their owner, is merged now) and add the shader to `glslPrecision.test.ts`.
2. `lightRig.ts` `paintFlicker` detects a flicker-list change by length only (pol-e report risk 1). Fine while
   `setFlicker` runs at load only; a runtime caller should bump a list version instead.
3. Look shot expectation (pol-b acceptance 4): on the PBR path the old standard fence / rope / decal took no baked lamp
   at all (`BakedLamps.attach` skips standard materials when not `standard`) and was lit by the hemisphere and the rig
   pool. Now they take the lamp, fill, bounce and torch terms like props. So "the same fence under a baked lamp looks
   as before" will not hold literally: judge it against the floor beside it, not the old fence.
4. Holder pick relies on every torch being placed by `placeTorch` (true: `enemy.ts`, `torchMirror.ts`). Worth a
   one-line note at `placeTorch` that `torchHolderScore` inverts it.

## Laptop requests (merged sha, unchanged from the reports)
`e2e-desktop:3` (warehouse dark: atlas on, `copies > 0`), `e2e-lightbake` (every shader <= 16 textures), `e2e-darkness`
(display targets must not move); look shots: torch on a fence / rope / decal, a guard a step in front of a torch holder
casts, a bright map's `torchShadows.on` false and `lightRig.shadowSlots` 0; LR16-L Low sheet (B3 speckle).
