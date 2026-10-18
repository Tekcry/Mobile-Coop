# Operator runtime - design (step 11d; wired into the game in 11e)

Wren replaces the player body for both players: the local player and the co-op partner (D31 / G123, no dev switch).
- Guards keep their bodies (G68). Gameplay is unchanged (G38).
- Desktop only (D29).
- The CharacterRig stays the pose authority. The operator is a render-side skin over it.

## Modules (`src/operators/runtime/`)

| File | Babylon? | What |
| --- | --- | --- |
| `manifest.ts` | no | LOD names and indices, `OperatorManifest` (URL per LOD), `manifestFromUrls`, `validateManifest`, `sameOrigin`, `validateModel` (joints, identity container, 4 influences, a `-glow` lens material) |
| `lodPick.ts` | no | `bandLod` / `pickLod` (distance bands with hysteresis, hero for close-up cameras, fallback to what is loaded), `CloseCameras` / `CLOSE_CAMERAS` |
| `goggle.ts` | no | `GoggleState` (stowed and dim / in use and full, G73), `partitionGoggle`, `goggleRange` |
| `pose.ts` | no | `poserSetup` (shared per file), `OperatorPoser.solve` (the rig to the operator skeleton, flat typed arrays, no allocation) |
| `figure.ts` | yes | `OperatorLibrary` (per Scene, shared GPU assets), `OperatorFigure` (one body), `loadModel`, `readRig`, `RigLike` |
| `assets.ts` | no (Vite glob) | `wrenManifest()`: the GLBs under `src/operators/assets/<id>/` as same-origin build URLs |

- Tests:
  - `tests/operatorsRuntime.test.ts`: the pure modules, plus the real built files when `build/` exists.
  - `tests/operatorsRuntimeFigure.test.ts`: NullEngine, two Wren bodies on real CharacterRigs.
  - Fixture: `tests/helpers/operatorFixture.ts`.
- One existing file changed: `src/operators/lab/glb.ts` reads an optional `_GOGGLE` vertex attribute.

### Public API (what 11e calls)

```ts
const lib = new OperatorLibrary(scene);                    // one per Scene; disposed with the scene
const fig = new OperatorFigure(lib, rig, wrenManifest(), 'player'); // right after `new CharacterRig`, before its first pose
fig.onMeshes = (ms) => ms.forEach((m) => world.addShadowCaster(m));
void fig.loadGameLods();                                   // LOD2 first (2.5 MB), then LOD0 and LOD1
// per frame, after the rig's update:
fig.setVision(vision.shown, dt);                           // remote body: 'off'
fig.update(scene.activeCamera);                            // picks the LOD, poses it (no allocation)
fig.setHeadVisible(v); fig.setEnabled(v); fig.resetGoggle(); fig.dispose();
// menu / photo mode:
CLOSE_CAMERAS.add(camera.uniqueId); void fig.load(LOD_HERO); /* on close */ CLOSE_CAMERAS.remove(camera.uniqueId);
```

## Asset manifest
- The files are step 10's names: `<id>-hero.glb`, `<id>-lod0.glb`, `<id>-lod1.glb`, `<id>-lod2.glb`.
  - Each is one skinned GLB with KTX2 textures embedded (`KHR_texture_basisu`, required), tangents, `_RIGID`, and 4
    influences.
- `manifestFromUrls` matches files by base name in any folder.
- LOD0-2 are required. The hero is optional: LOD0 stands in until it loads.
- Any URL that would leave the page's origin is refused, by `validateManifest` and again in `loadModel`.
- `validateModel` runs on every loaded file. A failed file throws, and the body keeps the LODs it has.

## LOD and hero choice (`lodPick.ts`)
- Bands follow SPEC 6.4 (desktop, D29): LOD0 under 8 m, LOD1 8-25 m, LOD2 beyond.
  - Each edge has 10 % hysteresis: 8.8 / 7.2 m and 27.5 / 22.5 m.
- Distance is measured from the active camera to `rig.root` with `hyp3`.
- Choice is per body, against the active camera. One camera renders a frame in this game.
- Hero only when the active camera is in `CLOSE_CAMERAS` (D21: the main menu and photo mode; later close shots add
  themselves). The gameplay shoulder camera always gets LOD0-2.
- Fallback: the nearest loaded game level, preferring more detail; then the hero; else nothing shown (-1).
- Render side only: gameplay never reads the LOD (CLAUDE.md).

## Loading, bundling and sharing

### Files in the build
- Step 11e copies the four Wren GLBs from `build/operators/wren/export/<lod>/` (git-ignored build output) to
  `src/operators/assets/wren/` and commits them.
- `assets.ts` imports them with `import.meta.glob('../assets/*/*.glb', { query: '?url', import: 'default', eager:
  true })`.
  - Vite emits them hashed into `dist/assets/`, under the Pages base.
  - The game fetches them from its own origin only. There is no CDN and no runtime network outside the app.
- The KTX2 transcoder is the bundled `@babylonjs/ktx2decoder` (D27, A79), through `lab/ktx2.ts`. It runs on the main
  thread, with no worker and no script URL, and refuses to run if a URL would leave the origin.

### Offline (PWA)
- The workbox precache does not match `.glb`, and hero and LOD0 are over its 16 MB per-file limit.
- 11e adds runtime caching for `assets/*.glb` (CacheFirst, cache `operators`). The first online start caches the files
  as the menu and the match load them; after that, play is offline.
- Precaching all 81 MB at install was rejected: a slow first install for files the menu fetches anyway.

### Sizes (from `build/operators/wren/export`; MB = 10^6 bytes)

| File | Disk / download | GPU (BC7, mips) | Used by |
| --- | --- | --- | --- |
| `wren-hero.glb` | 55.5 MB | 96 MB | menu, photo mode |
| `wren-lod0.glb` | 18.4 MB | 32 MB | gameplay < 8 m |
| `wren-lod1.glb` | 5.1 MB | 8 MB | 8-25 m |
| `wren-lod2.glb` | 2.5 MB | 4 MB | > 25 m, first frame |
| **Total** | **81.4 MB** | 140 MB if all are loaded in one scene | |

- The game build grows by 81.4 MB. Today's largest files are babylon.js 3.0 MB, the menu music 2.7 MB and Havok 2.1 MB.
- GitHub warns on files over 50 MB, and the hero is 55.5 MB (the hard limit is 100 MB).
  - Plain git works, so it is the plan for 11e ("Wren in the game first").
  - LFS is not recommended: every Pages build would pull 81 MB against the LFS bandwidth quota.
  - A smaller hero (UASTC RDO or ETC1S for the cloth set) is a later asset-run cleanup.

### Expected load time (download estimates are arithmetic; the transcode needs the GPU PC run in 11e)

| Path | Hero | LOD0 + LOD1 + LOD2 |
| --- | --- | --- |
| 50 Mbit/s first visit | about 9 s | about 4 s (LOD2 alone 0.4 s) |
| 100 Mbit/s first visit | about 4.5 s | about 2 s |
| Service-worker cache / local | under 0.3 s read | under 0.2 s |

- Parsing: all four files parse in about 0.1 s (Vitest, `operatorsRuntime.test.ts`, the built files).
- KTX2 transcode to BC7 (main thread): not measured yet. Estimate 0.5-1.5 s for the hero (3 x 4K + 6 x 2K) and
  0.2-0.5 s for LOD0.
- The first frame never waits for the big files:
  - The menu shows LOD0 (or LOD2) and swaps to the hero when it is ready.
  - A match shows LOD2 within about 0.5 s, then LOD0.
  - `loadGameLods` loads LOD2 first.

### Sharing (co-op: both bodies are Wren)
- `loadModel(url)` fetches and parses each file once per page (CPU cache; `forgetModels()` drops it).
- `OperatorLibrary` (one per Scene) builds each LOD's geometry, bone order and materials once:
  - The bone order is the file's joints, parents first.
  - The skin indices are remapped into the geometry once.
  - The menu and the match are separate scenes, so each builds its own GPU copy.
- Each body gets its own TransformNodes, Skeleton and glow material per LOD it loaded.
  - Its meshes share the library's Geometry (`geometry.applyToMesh`) and its cloth / kit / hardware materials.
  - Proven in the NullEngine test: same Geometry and material, different skeleton and glow.
- VRAM:
  - Two Wren bodies in a match: 44 MB (LOD0-2 shared).
  - The menu: 96 MB (hero) plus 32 MB (LOD0 stand-in).

## Skeleton link and the per-frame path
- Per LOD, a body has one TransformNode per skin joint, parented like the joints, under a root under `rig.root`.
  Position and yaw therefore come from the rig.
- Every bone is `linkTransformNode`'d to its node, so Babylon's GPU skinning (4 influences) follows the nodes.
- `OperatorPoser.solve(rigLocal)` is the Lab's retarget (`lab/retarget.ts`) on flat `Float64Array`s:
  - The rig's local TRS (19 joints, `readRig`, no allocation) go in. FK gives root-space rotations, and each operator
    joint takes its driver's rotation times the A-pose hang (D13: the arms are swung down to the rig's hanging rest).
  - Positions come from FK over Wren's own bind offsets, so her proportions hold.
  - A mapped joint adds its rig joint's local translation delta, rotated into root space. That covers the pelvis drop,
    crouch and climb, and a body tumble is not counted twice (the Lab adds world deltas, which is only right while the
    body does not move).
  - The output is local TRS per joint, copied into the nodes with `set()`.
- It matches the Lab's `poseSkeleton` to 1e-9 on a posed rig with a pelvis drop (test).
- Only the shown LOD is posed; the hidden LODs' meshes are disabled. Their skeleton cost is to be confirmed in the 11e
  GPU profile.
- Rest: the figure reads the rig's rest translations when it is built, so 11e builds it right after `new CharacterRig`.
- `hyp3` only, never `Math.hypot`. No closures, iterators or temporaries in `update` / `solve`.

## Materials
- Lab settings (steps 10-11):
  - PBR, with ORM as occlusion R / roughness G / metal B, a tangent normal map (tangents from the file), and
    double-sided two-sided lighting.
  - `directIntensity` is pi, as the game's parts.
  - Environment intensity is 1 for metals and 0.25 for the rest.
- KTX2 textures go through the bundled transcoder, flipped in the texture matrix (`vScale -1, vOffset 1`: A79,
  measured 0.09 / 255 against the reference decode).
- Glow (the lens):
  - The file's `-glow` material, cloned per body.
  - Emissive is the file's factor (0.3, 0.85, 0.16; Wren green, D13) times the goggle level.
  - It is emissive only, never a light. What the player sees, the light meter and guard perception still agree
    (light parity).
  - The Lab's spill PointLight is not carried into the game.
- Shadows: every body mesh has `receiveShadows`, and 11e registers it as a caster through `onMeshes`.
  - Meshes are `alwaysSelectAsActiveMesh` (skinned bounds) and not pickable.

## Goggle states (G73, D19 / D20)
- `GoggleState.update(shown, dt)`:
  - `VisionState.shown === 'off'` means stowed on the brow with a dim glow (0.3 of the asset's).
  - Any vision mode means in use over the eyes with the full glow.
  - The pose changes when the picture does (the middle of the flip). The glow eases over 0.15 s.
  - A remote body gets `'off'` (vision is not sent), so it stays stowed and dim.
- Geometry: each primitive's triangles are ordered [stowed][body][in use] at load (`partitionGoggle`).
  - Stowed draws [0, stowed + body). In use draws [stowed, stowed + body + in use).
  - The swap moves the sub-mesh's `indexStart` / `indexCount`: no upload, no extra draw.
- **Today's assets carry only the in-use goggle** (head_kit builds `stowM` and the stowed band, then hides them from
  export).
  - With no `_GOGGLE` attribute both poses draw the whole mesh. The goggle shows over the eyes in both states and
    only the glow follows G73.
  - Tested on the built files.

### Asset follow-up for the orchestrator (G73)
In `scripts/operators` (head_kit, export, bake_lods), for every LOD (hero, LOD0-2):
1. Export the stowed goggle set beside the in-use set:
   - the goggle parts `housing`, `lens` and `cup`, transformed by their `stowM`;
   - plus `band_s`, `band_s_cable` and `band_s_st` (today `hide_render`).
2. Add a per-vertex float attribute `_GOGGLE`: 0 everything else; 1 the in-use set (`housing`, `lens`, `cup`, `band`,
   `band_cable`, `band_st`); 2 the stowed set. It goes through `export_gltf.py` and `bake_lods.py` like `_RIGID`.
3. Keep both sets out of the LOD1 / LOD2 voxel shell (separate rigid pieces like A77). Skin both rigidly to the head
   (part 501, D28).
   - The stowed copy of the housing, lens and cup can reuse the in-use UV islands (same rigid shape). The stowed band
     needs its own islands in the kit atlas.
4. operators:check:
   - `_GOGGLE` is present with classes 1 and 2 in every LOD file.
   - The stowed housing is a rigid copy of the in-use one (Horn fit <= 1 mm).
   - The triangle budgets include both sets.

The runtime needs no change for this: `glb.ts` already reads `_GOGGLE`.

## Disposal
- `OperatorFigure.dispose()` frees its meshes (shared geometry stays), skeletons, nodes and glow materials.
- `OperatorLibrary` frees the shared sources, materials and textures when its Scene is disposed.
- `forgetModels()` frees the parsed files.

## 11e integration map (CharacterRig itself stays unedited in this run)
1. `player/player.ts:122` makes the figure after the rig.
   - Hide the rig's own body: its parts stay for `backGear` and the anchors, made invisible. Avoid building the voxel
     body for that rig (for example, turn `setVoxelBodies` off around the constructor and back on after).
   - Shadows go through `onMeshes`.
   - Dispose the figure in `Player.dispose`.
2. Per frame, in `Player.frameUpdate` after the rig and the body fade:
   - `fig.setVision(vision.shown, dt)` and `fig.update(scene.activeCamera)`.
   - `applyBodyFade`'s head hide also calls `fig.setHeadVisible`. The whole-body hide works already: the figure sits
     under `rig.root`.
   - `vision.reset()` on respawn pairs with `fig.resetGoggle()`.
   - `setLensGlow` and the trilens glows are not used for Wren.
3. `net/remoteAvatar.ts:102`: the same, with `setVision('off', dt)`. Both players are Wren.
4. `world/menuScene.ts:232-249`:
   - The preview rig gets a figure; `CLOSE_CAMERAS.add(menuCam.uniqueId)`; `load(LOD_HERO)`.
   - Dispose with the menu.
5. `ui/screens/photoMode.ts`: add / remove its camera on open / close and `load(LOD_HERO)` on open.
6. Thermal `setHeat` / `setFlash` paint the voxel or part buffers today.
   - For a Wren body, use per-mesh `renderOverlay` / `overlayColor` / `overlayAlpha` (per body; the materials are
     shared).
7. `vite.config.ts`: add the workbox `runtimeCaching` for `assets/*.glb`.
8. GPU checks (`E2E_GPU=1`, port 4189) belong to 11e:
   - the look in game against the Lab;
   - the shadow normalBias per LOD (LOG step 10: the LOD1 / LOD2 shells lose cast shadows and patch under a grazing
     light);
   - the KTX2 transcode time;
   - frame time with two bodies at LOD0 against `docs/systems/performance.md`;
   - the menu with the hero.

## Risks
- The hero download (55.5 MB) on a slow first visit. The menu shows LOD0 first; a smaller hero is a cleanup item.
- The KTX2 transcode on the main thread can hitch the menu. Measure it in 11e. A worker would need the decoder script
  URL (bundled, same origin) and is a cleanup item.
- The rig's rest must be read before its first pose: build the figure right after the rig.
