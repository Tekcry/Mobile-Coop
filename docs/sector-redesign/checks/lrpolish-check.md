# lrpolish check - LR13 / LR14 / LR15 polish batch

Checker: fresh Opus. Branch `feature/sector-redesign-lrpolish`, head 56a6dbf9, base e60730c4. Diff read in full
(`git diff e60730c4..HEAD`), build report `lrpolish-build.md`.

## Verdict: PASS

No blocking items.

## Checks

1. Classic (toggle off) unchanged. Toggle-off code paths touched: only the LR14 character-shadow fixes
   (`charShadows.ts:19`, `:128` / `:194`, `:336`, `:367`) and the rejoin record. `LAMP_GLSL` / `MIX_GLSL` only gain
   `export` (`bakedLamps.ts:450`, `:663`). `torchDrawTerm` swaps `Math.sqrt(..)` for `hyp3` (`shadowAccuracy.ts:138`),
   identical (`core/mathx.ts:9`). The torch scale sits under `LAMP_TORCH`, which needs `torchDraw` and a PBR material
   (`bakedLamps.ts:762`). Gameplay: the meter and perception read none of the changed code (`covers` is only called from
   the capsule writer, `bakedLamps.ts:412`).
2. Capsule rule. `fittedSpheres` (`charShadowSet.ts:288`) uses the same skip test as `fitCone` (`d <= r + sphereMargin`,
   `charShadowSet.ts:232`), so `spReady` is exactly the set the cone was fitted around. `gather` runs every frame before
   the render and the map's `onAfterUnbind` copy (`charShadows.ts:327`) reads `slot.sp` / `slot.k` from the same frame's
   gather, so the snapshot matches the map in the tile. `covers` (`charShadows.ts:367`) now returns false unless the
   capsule midpoint is inside a fitted sphere: lamp inside the body (lr14 4), past `MAX_SPHERES` (5) and newly in reach
   since the copy (6) all keep the capsule. The rule only ever adds capsules relative to LR14, so no new "neither" case;
   a "both" case needs a fitted character whose capsule midpoint lies outside every one of its own spheres + 0.3 m
   (laptop check below). Buffers are per slot, made once in `makeSlot` (`charShadows.ts:220`); the shared `spheres`
   field is gone; alloc test `charShadowSet.test.ts:184` (<= 16 bytes / 2000 calls).
3. `copy()` direct bind (`charShadows.ts:336`) is Babylon 9.29's `applyEffectWrapper` minus
   `onApplyObservable.notifyObservers({})` (node_modules `effectRenderer.pure.js:64`). The skipped observers are
   `setFloat2("scale", 1, 1)` (feeds only `vUV`; `COPY_GLSL` reads `gl_FragCoord`, `charShadows.ts:72`) and `bind()`,
   which does nothing here (`useAsPostProcess` false, no custom code processing registered for `charShadowCopy`).
   Ready check kept (`w.effect.isReady()`); save / restore states kept. Context restore: the wrapper re-prepares its
   effect and the renderer rebuilds its buffers on their own observers; ours (`charShadows.ts:194`) marks every slot
   not ready, `kReady` 0, `params.w` 0 (the shader then returns lit, `CHAR_SHADOW_GLSL` `P.w < 0.5`) and clears
   `lampSlot`, so capsules return until the next copy. Observer removed in `disposeSlots`. Babylon in `src` only via
   `core/babylon.ts` (the test's direct `NullEngine` import follows the existing tests' pattern).
4. `NO_MESH_LAYER` 0x20000000 (`charShadows.ts:19`): grep of `src` for `layerMask` / `LayerMask` / `0x2000000` finds
   only `PROXY_LAYER` 0x10000000 (`world.ts:108`, `:440`) and this light's `includeOnlyWithLayerMask`
   (`charShadows.ts:205`). Babylon's default mesh and camera masks are 0x0FFFFFFF, so no mesh carries the bit.
5. Rejoin `lf`: `RejoinRecord.lf?` (`rejoin.ts:29`), parsed only as 'linear' / 'photometric' (`rejoin.ts:68`), stored
   in `sessionStorage` (`KEY` `ns-rejoin`). Set from the running match's `s.lampFalloff` (`coopUi.ts:196`), written by
   `record()` (`coopUi.ts:185`). Used only in the host "Resume hosting" branch (`coopUi.ts:811`, inside
   `role === 'host' && resume`), after `adopt` set the default (`coopUi.ts:837`), so a record without `lf` keeps the
   host setting. A client's record is never read for `lf`; the client still takes `start.lf` from the wire. No protocol
   or save change: `PROTOCOL_VERSION` 38 (`protocol.ts:20`), `start` parse unchanged (`protocol.ts:727`).
6. Torch scale `vLightingIntensity.x / PI` (`bakedLamps.ts:1068`): `vLightingIntensity` is in the PBR UBO and
   declarations; the define is PBR-only and toggle-on only (`bakedLamps.ts:762`). PI-intensity materials get x1
   (unchanged), directIntensity 1 gets 1 / PI, as Babylon's lights did.
7. Tests (slot 1 lock): `tsc --noEmit` clean. Vitest shadowAccuracy, charShadowSet, lampFalloff, rejoin, sectorStep3,
   lightField, lights, coopTorches, lampPluginClone, lampPluginGap: 10 files, 96 tests, all pass. The new tests assert
   real behaviour (GLSL `.replace` guard, rejoin round trip and junk, rig drawn count 2 / 0, fitted-sphere rule and
   allocation). No e2e (as briefed).

## Blocking
None.

## Polish (not blocking)
1. After a resumed match, `session.hostLampFalloff` stays pinned to the record's `lf` (`coopUi.ts:813`) for every later
   match in that room, so a host who changes the setting between matches is ignored until they leave the room. Peers
   still agree. Fix: after the first `startMatch`, set it back to the `adopt` default (or clear the override once used).
2. A character that enters a far slot's reach between refreshes, standing within about 0.3 m of a fitted caster's
   sphere (two guards shoulder to shoulder), has its capsule midpoint held by the neighbour's sphere and loses its
   shadow for one refresh gap. Fix if seen: match spheres per character (an id per sphere) rather than by position.
3. Casters past `MAX_SPHERES` and a caster with the lamp inside its sphere are still in `slot.list`, so they may draw
   into the map and now also keep a capsule (a partial double shadow). Very dense crowds or a lamp within ~0.5 m of a
   body only.
4. `copy()` relies on the skipped `onApplyObservable` doing nothing for this wrapper (`scale` unused, `bind()` a
   no-op). A one-line note there, or a test that `COPY_GLSL` has no `vUV`, would keep a later edit honest.
5. No test drives `CharShadows.covers` itself (only the pure helpers); a NullEngine test of `covers` with a fake slot
   would pin the integration.
6. `shadowAccuracy.test.ts:308` leaves `setShadowAccuracy(false)` behind; reset it in a `finally` or `afterEach`.

## Laptop checks (GPU, port 4189)
- A guard under a picked lamp: silhouette shadow, no extra capsule (the capsule midpoint inside the body mesh's bounding
  sphere + 0.3 m). Also a dead body lying down and a crouched guard (skinned bounds vs the posed capsule).
- A guard within ~0.5 m of a lamp keeps a capsule shadow.
- `WEBGL_lose_context` lose / restore: no dark cone, capsules until the next copy, then silhouettes return.
- `?falloff=photo`: a torch through the levelBuilder glass reads as before (no PI jump); Wren / weapons unchanged.
- e2e-coop / e2e-netmove: "Resume hosting" after a Realistic match resumes Realistic; a record from before this branch
  resumes on the host's setting.
