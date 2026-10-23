# G5 report: GuardFigure runtime

Slice G5 of guard-models (PLAN section 3 "G5"), branch `feature/gm-g5`, on feature/guard-models 6b5c4319. Not wired
into enemies (G7).

## What was built
- `src/operators/guards/gearMask.ts` (pure, no Babylon): the guard manifest shape (`GuardManifest`: id, base, urls with
  no hero, `pieces` in `_PIECE` order, `tintSlots`, `refHeight`), `validateGuardManifest`, the contract id lists
  (bases, head variants, hair caps, outfits, headwear, eyewear, gameplay gear, small kit; `shield_riot` is not a
  piece, `bald` has no mesh), `guardStandInManifest(base, wrenUrls)` (Wren's LOD files, one piece = the base id, one
  tint slot); the mask: `gearMask(pieceIds, vertexPiece, vertexTint, visible, tints, out, flash)` fills `gvis` in
  place, writes only changed bytes and returns whether any changed (no allocation); `pieceMask`, `fillGvis`,
  `visibleAlpha`; `groupByPiece` (load time) and `visibleIndices` (no allocation) for the index buffer.
- `src/operators/runtime/guardFigurePlugin.ts`: material plugin on the base's operator PBR, GLSL only (as
  `SmoothBodyPlugin`), define `GUARDFIG` only for a mesh with `gvis`: albedo x tint (sRGB bytes to linear) where the
  albedo atlas alpha (the tint mask) is set; flash towards `flashColors`' warm white; `gl_Position *= step(a)` for a
  hidden piece. No new samplers (reads the albedo sample PBR already takes).
- `src/operators/runtime/guardFigure.ts`:
  - `GuardLibrary` (per scene, `guardLibrary(scene)`): loads a (base, LOD) once through Wren's parse cache
    (`loadModel`), builds static `GpuBuffer`s per primitive (position, normal, uv, tangent, bone indices, weights)
    shared by every guard of the base in the scene, the material (`operatorMaterial` + plugin), the poser setup, the
    finger rig and the root-local rest box (bind pose + S1's margins `[1, 0.3, 1, 1, 0.3, 1]`). Owns and disposes the
    shared buffers and materials with the scene. Rebuilds every live guard's index buffer after a WebGL context restore.
  - `GuardFigure` (per guard, over a `RigLike` / CharacterRig): LOD0/1/2 by `pickLod` (Wren's 8 / 25 m and 10 %
    hysteresis), `loadGameLods` loads LOD2 first; no hero, no goggle. Per LOD its own skeleton, per primitive its own
    `Mesh` wrapping the shared buffers (`takeBufferOwnership: false`) plus its own `gvis` (RGBA8 normalised,
    updatable) and its own index buffer of the visible pieces. `setPieces` / `setTints` / `setFlash` rewrite only on a
    real change (same set or table: no-op); a LOD not shown catches up when it is shown. `setHeat` as Wren (overlay),
    `setEnabled`, `setHeadVisible` (no-op), `onMeshes` (shadow casters; only the shown LOD is enabled), `mesh` (the
    shown mesh, for `GuardAnimTier` in G7), `dispose` (own meshes, skeletons, gvis and index buffers only).
  - Culling: `setBoundingInfo(rest box)` per mesh and submesh, `alwaysSelectAsActiveMesh` false. Any rig joint
    (root excluded: a carried body re-parents the root, which keeps the local chain) with a parent other than at
    build -> `loose`: meshes always active and the world-matrix path; back on its parent -> box culling and the
    retarget again.
  - Posing: local path = `readRig` -> fingers (as Wren) -> `OperatorPoser.solve` -> `Matrix.ComposeToRef` into each
    bone's local matrix. World path: per slot a rest offset `off = restAbs(skeleton space) x scale x inverse(rig
    joint rest, rig-root space)` measured at build; per frame `abs = off x rigJointWorld x inverse(skelRootWorld)`,
    bone local = abs x inverse(parent abs). Both allocation-free (module scratch vectors / matrices).
- `src/operators/runtime/figure.ts` (Wren's file), the only change: the PBR material settings inside
  `buildLodAsset`'s `materials.map` moved verbatim into a new exported `operatorMaterial(scene, m, label)`; the map
  now calls it and keeps the `-glow` branch; `GlbMaterial` added to the type import. Same properties, same order, so
  Wren's behaviour is unchanged (her tests below pass).
- `src/core/babylon.ts`: untouched (no side-effect import was missing; `updateDynamicIndexBuffer` is not used).

## Decisions I assumed
1. Hidden pieces also leave the guard's index buffer (PLAN said: collapse by `position x a` in the plugin only). The
   shadow generators and the G-buffer renderer (`postStack.ts` enables it for SSAO / SSR and the fog / TAAU depth)
   draw with their own shaders and run no material plugins, so a plugin-only collapse would leave a hidden helmet in
   the shadows and the G-buffer (light parity, BRIEF limits). The visible pieces' triangles (pieces grouped at load,
   `groupByPiece`) go into a per-guard index buffer, recreated on a gear change only (a new `createIndexBuffer`, the
   old one released). The plugin still collapses `a = 0` in the main pass, and `gvis` is exactly as specified.
   Cost: per guard the visible indices only (16-bit under 65,536 vertices): ~120 KB LOD0 at 20 k shown tris + ~42 KB
   LOD1 + ~17 KB LOD2 beside `gvis` ~150 KB, so ~330 KB per guard, ~8 MB at 24 (PLAN section 6 said 3.6 MB). Gain:
   hidden heads, caps and gear cost no vertex work and are not counted triangles (PLAN 6 assumed the whole buffer).
   The shared static index data stays on the CPU (per (base, LOD) groups); no GPU index buffer is shared.
   Undo: draw the shared grouped indices and rely on the plugin alone (one function), if G8 finds the shadows fine.
2. Flash in `gvis.a`: `a = 255 - round(k x 254)` while visible (1 at the full flash, never 0), 0 = hidden. The
   tint (rgb) only acts where the atlas mask is set, so a flash in rgb would not reach untinted texels.
3. Tint mask = the albedo atlas's alpha channel (1 = tinted). G4 must bake it there (opaque material, alpha free).
   Tints are sRGB bytes per slot (`setTints([r, g, b, ...])`), linearised in the shader.
4. Bones are written directly (no linked TransformNodes as in Wren's figure): no 33 to 70 extra scene nodes per LOD
   per guard. The stand-in test proves the bones land where Wren's linked nodes land (< 1e-4 m, a walk pose).
5. World-path offsets come from the rig's rest pose at build (the figure must be built before the rig's first pose,
   as Wren's). A ragdoll starting from a posed body can jump by the bone-length difference between rig and file
   (cm on Wren's file; ~0 on G1's bases, which are rigged on the game joints). Scale (A2) is fixed at construction.
6. The library owns the static GPU buffers for the scene's life (Wren's library keeps its sources the same way)
   instead of S7's per-user reference counts; meshes wrap them without ownership.
7. Default visible set = the body piece (the base id); G7 sets the spawn set. Ids not in a file are ignored.
8. `_PIECE` / `_TINT` reading: `src/operators/lab/glb.ts` is not mine; the runtime reads optional `piece` / `tint`
   (`Uint8Array`) on each parsed `GlbMesh` (`GuardGlbMesh`), all zero when absent (the stand-in). G4 / G7 add two
   lines to `parseGlb` beside `_GOGGLE` to fill them. Validated against the manifest at load.
9. Kind strings: G5 uses none (kinds are G0 / G6). The contract id lists in gearMask.ts duplicate gm-common; G0's
   `guardKit.ts` is the source of truth, dedupe at G7.

## Tests
- `tests/gearMask.test.ts`: 8 tests (visibility exact per piece, tint per slot, no-op when unchanged, a gear toggle
  changes only that piece's alpha bytes, a tint change only its slot's, flash alpha, out-of-range slot, grouping and
  visible ranges 16 / 32-bit, manifest checks and the stand-in).
- `tests/guardFigure.test.ts` (NullEngine): 8 tests. Shared static buffers per (base, LOD) across 2 guards, own gvis,
  index buffer and skeleton, shared material with the plugin; a gear toggle rewrites exactly the helmet's gvis bytes
  and swaps the index buffer (old released, count 6 -> 9), same set = no-op, tint, a hidden LOD catching up, a
  context restore; S1 box set (not always active), box survives the index swap, a re-parented arm flips to always
  active and the world path, continuity with the retarget < 1e-4 m, the moved arm's joints ride their rig joints
  < 1e-4 m, back on the rig -> box again; flash / heat / enable do not throw and do what they say; dispose frees the
  guard's gvis and index buffers (references 0) and leaves the shared buffers and the other guard; the plugin's code is
  in the PBR effect with `GUARDFIG` for a gvis mesh and off for another; bad manifest and hero refused; the stand-in on
  Wren's real `wren-lod2.glb`: every vertex visible, all indices, bones within 1e-4 m of Wren's own figure's posed
  nodes after a walk.
- Wren unchanged: `animRig`, `animSkeletonClip`, `animSkeletonRig`, `mocapSwitch`, `operatorsRuntimeFigure`,
  `operatorsRuntime`: 63 passed, 1 skipped (the existing `skipIf` on missing files).
- Totals: 8 files, 79 passed, 1 skipped. `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint` on the six files
  clean.

## Open items
- GPU: the plugin's GLSL is only checked as injected text (NullEngine compiles nothing). First real compile at G7 /
  G8 (PLAN risk: warm the variant on the loading screen). WebGPU: the plugin is GLSL-only (as `SmoothBodyPlugin`), so
  no tint or flash there; hiding still works (index buffer).
- No dev page: none is in G5's file list; `guardStandInManifest(base, wrenManifest().urls)` with `guardLibrary(scene)`
  and `new GuardFigure(...)` is all a page needs.
- Stand-in look: Wren's file has both goggle states and grip morphs; the stand-in draws every vertex (both goggles)
  and leaves the morphs at 0. Cosmetic, gone with G4's files.
- G7 wiring notes: call `update(camera)` per frame after the rig animates; `onMeshes` -> `world.addShadowCaster`;
  `GuardAnimTier` gets `figure.mesh` (the shown mesh, it changes with the LOD); `scale = def.height /
  manifest.refHeight`; gear sync -> `setPieces`, faction / variant colours -> `setTints`; hit flash -> `setFlash`.
- Context restore: the shared static buffers are rebuilt once per geometry using them (Babylon gives no handle), the
  same small leak S7 documents.
- Finger bones: `fingerRig` finds Wren's finger joint names; G1's ten finger bones must use the same naming for the
  hands to close on the gun.

## Fix round (checker FAIL, one round)
Against G6's contract on feature/guard-models (`applyGear` / `GuardPieces`, G6-REPORT). Supersedes decisions 2 and 7
and the `setHeat` / `setPieces` lines above where they differ.
- B1 (fixed) The body piece is always shown. `pieceMask` forces every base id (`isGuardBase`: `average` / `lean` /
  `broad`) on, so `setPieces` (and its default, now an empty list) and the pure `gearMask` keep the body's vertices at
  a > 0 and its triangles in the index buffer whatever the list holds. G6's `applyGear` never lists the base and G0's
  kit always counts the body. `validateGuardManifest` now also refuses a manifest without its base piece or with
  another base's piece.
- B2 (fixed) G6's reused output shape, taken directly: `setPieces(ids: readonly string[], count = ids.length)`
  (`figure.setPieces(p.ids, p.count)`), `gearMask(pieceIds, vertexPiece, vertexTint, visible, count, tints, out,
  flash?, heat?)` and `pieceMask(pieces, visible, count, out)`: index loops, no iterator, no Set; entries past `count`
  are stale and ignored (count is clamped to the array). The figure's `pieces` Set getter is gone: `pieceShown(id)`.
- R1 (done) Thermal heat folded into `gvis.a` like the flash, so a guard stays ONE draw per mesh in every vision mode
  (Wren's `renderOverlay` costs one more draw per mesh: 24 more at 24 guards). Encoding below. The plugin decodes it in
  the vertex shader and blends `finalColor` towards white by the heat after image processing (where Wren's overlay
  lands), in the same draw. `setHeat` / `setFlash` rewrite gvis only on a level change (shown LOD now, the others when
  shown). Wren's figure untouched.
- P1 (done) A load finishing after the scene is disposed builds nothing (`scene.isDisposed` checked in the library's
  `then`, which rejects "scene disposed"); `GuardFigure.load` treats that as abandoned (resolves) when the figure or
  scene is gone. Wren's library unchanged.
- P2 (done) `validateGuardModel` refuses more than one primitive unless the manifest is a stand-in
  (`STAND_IN_PREFIX` = `guard-standin-`, Wren's multi-primitive files).
- Also: the guard material sets `albedoTexture.hasAlpha = false` and `useAlphaFromAlbedoTexture = false` (the atlas
  alpha is the tint mask, never transparency).

Tests (all pass): `tests/gearMask.test.ts` 10 (new: B1 body with a G6 list without the base and with an empty list, B2
stale ids past count and count clamping, flash / heat nibbles and the thermal 1/16 steps decoding within half a level,
manifest body-piece and `eyes` refusals); `tests/guardFigure.test.ts` 13 (new: B1 G6-style list without the base: body
alphas 255 and body indices in the index buffer, read from `createIndexBuffer`; B2 stale `helmet_std` past `count`
hidden and its vertices absent from the uploaded indices, a different stale tail is a no-op; R1 heat as level 13 in
alpha, one gvis upload, no overlay, a later LOD catches up, and a draw count over `scene.render()`: heat on draws the
same as off while a forced overlay adds one; P1 scene disposed mid-load; P2 two primitives refused, stand-in allowed;
the plugin's heat code in the PBR effect); `tests/operatorsRuntimeFigure.test.ts` 3 (Wren's figure, unchanged).
`npx tsc --noEmit -p .` clean; eslint on the five changed files clean.

## For SPEC section 8
- Tint mask = the albedo atlas's alpha channel (1 = tinted); G4 bakes it there.
- `gvis` rgb is the tint as sRGB-encoded bytes (the plugin linearises with `toLinearSpace`): G7 converts SPEC's linear
  target / neutral colours with `toGammaSpace` before writing them with `setTints`.
- The albedo is never `hasAlpha` (the guard material forces `hasAlpha = false`, `useAlphaFromAlbedoTexture = false`).
- Eyes have no piece of their own: they belong to each head piece (or the body); an `eyes` piece is not a contract id, so
  `validateGuardManifest` refuses it.
- The body piece (the base id: skin, neck, wrists) is always shown; G6's list never names it.
- `setPieces(ids, count)` takes G6's `GuardPieces` directly; ids past `count` are stale.
- `GuardFigure.update()` should be gated by the guard-ai S4 anim tier at G7 (not every guard every frame).
- `figure.mesh` changes on a LOD switch: G7's `GuardAnimTier` re-reads it, never caches it.
- Heat and flash in `gvis.a`: hidden = 0; visible a = 255 - (heat level x 16 + flash level), levels 0..15
  (`fxLevel(k) = round(clamp(k) x 15)`), clamped to a >= 1 (full heat with full flash); 255 = cold, no flash. Flash
  blends the albedo to warm white (1, 0.92, 0.85); heat blends the final colour to white. Flash is now in 1/15 steps
  (was 1/254).
