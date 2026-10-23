# LR14 check - character silhouette shadows from lamps
Fresh Opus checker, 2026-10-23. Branch `feature/sector-redesign-charshadow` @ 83b22daa. Reviewed the LR14 first-parent
commits 8785e548, cafde1ff, d38e3f58, c0db73ca, 03fd0386, 83b22daa (the `-lightrev` merge 6adf41f9 = LR13, not checked).
Read only; no e2e, no GPU.

## Verdict: PASS
Nothing broken found by reading. The feature is still unverified on a GPU (the build says so): the laptop run list in
`lr14-build.md` is the real first check of the shader compile, the atlas copy and the console.

## Checks
1. Hard rules
   - Babylon only through `src/core/babylon.ts` (`charShadows.ts:12`). No new side-effect import needed: the shadow
     generator component and engine render targets are already used by `LightRig` and `LampVolume`. `npx tsc --noEmit`
     is clean.
   - Gameplay reads no graphics state. `charShadows` / `charShadowSet` / `video.charShadows` are used only by `world.ts`
     (render), `bakedLamps.ts` (render), `quality.ts`, `qualityManager.ts`, `settings.ts` and `settingsScreen.ts`. The
     meter, perception and AI are untouched. `nsLampRaw` (the darkness curve input) adds up before N.L and before the
     `LAMP_CSHADOW` block (`bakedLamps.ts` ~958-966).
   - No per-frame allocation in LR14 code: `LampSlotPicker.update`, `fitCone`, `coneCovers`, `CharShadows.frame` /
     `gather` / `covers`, `writeCapsules` and `World.frame` use typed arrays and render lists refilled in place. All
     distances use `hyp3`; there is no `Math.hypot`. The picker + fit heap-bound test is real (`bytesPerCall` <= 16 B).
     Babylon's own `applyEffectWrapper` allocates one `{}` per copy (see polish).
2. WebGL
   - 16-texture cap, per shader stage, by reading:
     - Level material (smooth): about 14 today, so 15 with the atlas.
     - Operator figures, fragment stage: albedo, ORM and normal, plus reflection, BRDF, CSM 1, cluster 2, 2 flashlight
       shadows and lamp 4. That is about 15 with the atlas.
     - Voxel path: micro detail is excluded (`world.ts:569`). Without micro detail it is 13 + 2 + 1 = 16, at the limit.
     - The LR14 slot spots reach no mesh, so they add no sampler.
     - Note for the laptop run: the e2e probe counts `effect._samplerList`, which also holds the vertex-stage
       `boneSampler` and `morphTargets`. The hero-LOD player mesh (skinned, grip morphs) can read 17 there with both
       flashlight shadows live, even though its fragment stage is 15. Babylon binds units up to MAX_COMBINED (32), so
       that is not an overflow. If `e2e-lightbake`'s `cs.max <= 16` trips on that mesh, fix the probe (leave out the
       vertex-stage samplers). Do not cut the feature.
   - Atlas copy and sampling math check out:
     - Viewport tile (x/size, y/size, 0.5, 0.5) and `gl_FragCoord - csOrg` agree. Both use GL bottom-left origins.
     - Babylon's spot metric `(clip.z + n)/(n + f)` is linear in view depth with slope `1/(f - n)`, so `bias / (hi - lo)`
       is right. The reverse-depth sign is handled.
     - `step(z, stored)` gives "lit". The 2x2 PCF taps are clamped inside the tile.
     - The shadow map is NEAREST (FILTER_NONE): it is complete for `texelFetch` on float, and the atlas is NEAREST.
     - `lampSlot` is set only once `ready === lamp` (after a copy), and `lampCsP.w` gates a slot that has never been
       copied, so no stale tile is read.
   - Unload: `World.dispose` calls `charShadows.dispose`. That removes the observers and disposes the generators
     (their maps), the lights, the wrapper, the renderer, the atlas and the RT. Disposing the internal texture twice is
     safe (`references === 0`). A quality change rebuilds through `disposeSlots`, and `refreshMaterials` re-reads
     `LAMP_CSHADOW`.
   - Context restore: it survives. The RT wrapper is rebuilt by Babylon (`_rebuildRenderTargetWrappers` swaps the GL
     handles into the same InternalTexture, so the `BaseTexture` stays valid). `EffectRenderer` / `EffectWrapper` rebuild
     their own buffers and effects, and the generators rebuild their maps. One transient remains: see polish 1.
3. Hysteresis and lamp set
   - The picker logic matches the plan: dark lamps are released at once, the 0.5 s hold scores -1, the 0.75 margin
     applies, keep +1 m, and slots stay stable.
   - The tests are real: a sway between two equal lamps gives <= 2 changes, the margin and hold cases work both ways,
     out-of-reach lamps are dropped, refresh rates scale, the cone covers and partial fits are tested, and there is the
     allocation bound.
   - `vitest charShadowSet settings graphics lampPluginClone lampPluginGap`: 41 tests pass.
4. Stride 7 -> 8
   - Every reader is updated: `capBase` / `doorBase` / `lampLit` / `update` / `writeCapsules`. The fixed texels
     (t6 doors at +24, t7 at +28) are correct.
   - Both GLSL loops (`MIX_GLSL` and the plugin loop) use `${LAMP_TEXELS}`.
   - The only reader outside `bakedLamps.ts` is `e2e-desktop.mjs:523`, now `L.lampTexels`. Its old literal 6 was a
     stale bug, now fixed.
   - Grep over `src`, `scripts` and `tests` finds no other data-texture reader.
   - The `LAMP_PHOTO` merge is clean: both defines are in the plugin ctor (`bakedLamps.ts:683`), and `lampMathGlsl` is
     untouched.
5. Presets and setting
   - Presets: High 2x512, Ultra 3x1024, Epic 4x1024. Off / Low / Medium are 0 (capsules). `?gfx=min` forces off.
   - `video.charShadows` defaults to 'auto' and is sanitized with `pick`, so old saves read 'auto' and junk is dropped.
     There is no save bump and no shape break; it is tested.
   - It is in `QualityManager.keyOf`, so a change reconfigures. The UI row is in Graphics.
   - On below High gives High's set (`charShadowSpec`), which matches the docs.
6. Parity notes: honest. The meter and perception are unchanged. The capsules were render-only before. The new casters
   (partner, bodies, weapons, poses) and self-shadow on screen are listed as new gaps, not hidden.

## Blocking
None.

## Polish list (not blocking)
1. Context restore: the restored atlas is blank (0) while `slot.ready` stays set. Until the copy effect recompiles and
   copies again, mapped lamps read every point in their frustum as shadowed (0.15), a brief dark cone. Fix: on
   `engine.onContextRestoredObservable`, set every `slot.ready = -1` and `params[s*4+3] = 0` (`charShadows.ts`
   `makeSlot` / `configure`).
2. `NO_MESH_LAYER` (`charShadows.ts:18`) equals `PROXY_LAYER` (`world.ts:108`, 0x10000000). The LR14 spots therefore
   "affect" the shadow-proxy meshes. This is harmless today (the proxies are never drawn by a camera), but use a
   distinct bit (e.g. 0x20000000).
3. `copy()` (`charShadows.ts:306`) goes through Babylon's `applyEffectWrapper`, which notifies with a new `{}` per call,
   so one small object per slot render. To avoid it, bind with `engine.enableEffect(w.drawWrapper)` and
   `r.bindBuffers(w.effect)` directly.
4. A caster whose bounding sphere (+0.3 m) contains the lamp is skipped by `fitCone` (`charShadowSet.ts:235`), yet a
   non-partial fit's `covers()` still drops its capsule. Such a caster can lose its shadow. This is rare (a lamp within
   about 0.5 m of a body).
5. `MAX_SPHERES` 256 (`charShadows.ts:20`): casters past 256 in reach are listed but not fitted, and `covers()` drops
   their capsule. Reachable only with very dense crowds under one lamp.
6. Between refreshes of a far slot (every 2nd frame), a character newly in reach has its capsule dropped by a
   non-partial `covers()` while it is not yet in the copied map: a one-frame missing shadow.
7. The plan's fallback "`BAKED_SHADOWS` 2 -> 1 if the smooth default reads 17" is only described, not coded. Per
   check 2 it should not be needed. Keep it in mind if the laptop measures a real fragment overflow.
