# Operator runtime - survey (step 11d, after the master 4.0.0 merge)

Read-only map of the code Wren's runtime plugs into. Paths under `src/`. Line numbers as of commit 0de3293.

## Player body today
- Built once per match: `Player` constructor, `player/player.ts:122`:
  `new CharacterRig(scene, avatarFactory(...,'player-part'), look, 1.75, 'player')`.
  - `GameState` makes the `Player` (`game/gameState.ts:336`, `GameState.create` :644).
  - Respawn does not rebuild it (`gameState.ts:1252-1274`: teleport plus `vision.reset()`).
- Dispose chain: `gameState.ts:865` -> `Player.dispose` (`player.ts:422`) -> `CharacterRig.dispose`
  (`player/characterRig.ts:1883-1892`). That removes the rig from `DEBUG_RIGS` / `LIVE_RIGS`, then disposes the voxel
  body, parts, glows and root.
- Rig joints (`characterRig.ts:598-634`):
  - Built by `n()` as TransformNodes named `${name}-${nm}`.
  - Every node starts at identity rotation. The root uses `rotation.y` (its `rotationQuaternion` is null).
  - Fields: root, body, hips (`pelvis`), spine, torso (`chest`), neck, headNode, shoulderL/R, elbowL/R, wristL/R,
    hipL/R, kneeL/R, ankleL/R, plus sockets hand, aim, back, hipHolster.
  - Only the pelvis translates (`:1479`, `:1503`, `:1516`, `:1818`).
  - The body rotates (tumble, `:1357`).
- What is drawn:
  - `rig.renderMeshes` (`:664`) gives the voxel body (`voxel/voxelBody.ts`; built at `:655` while `setVoxelBodies` is on;
    `gameState.ts:652`, `world/menuScene.ts:240`) or else the instanced parts.
  - The parts stay alive: `backGear` and `thighOuter` are measured from them (`:641-651`).
- Camera fade: `ShoulderCamera.applyBodyFade` (`player/shoulderCamera.ts:435-447`), called every frame from
  `player.ts:397`.
  - It hides the head under a 0.32 m boom (`rig.setHeadVisible`, `:669-674`) and the whole rig under 0.2 m
    (`rig.root.setEnabled`).
- Goggle glow today:
  - `player/goggleGlow.ts`: instanced unlit spheres, `GLOW_IDLE` / `GLOW_VISION`. Not a light.
  - The rig sets it with `setLensGlow(on)` (`:1018`). `gameState.ts:1695` calls it every frame with
    `vision.mode !== 'off'`.
  - Vision state lives in `game/vision.ts`. `shown` changes at the middle of the flip; `mode` is the button.
- Thermal and flash:
  - `setHeat` / `setFlash` (`:1840-1864`) write the voxel or part instance buffers.
  - Thermal paints every rig in `LIVE_RIGS` (`gameState.ts:1718`).

## Co-op bodies
- The remote body uses the same factory: `net/remoteAvatar.ts:102`, rig named `remote-<id>`.
  - Shadow casters are added at `:104`. It starts disabled (`:107`) and is enabled on the first sample (`:151`).
- Host: `net/coopHost.ts:250-254` creates it and `:273-280` / `:1084` dispose it.
- Client: `net/coopClient.ts:177-199` creates and drops it.
- Remote vision is not sent, so the partner's goggle stays idle (`gameState.ts:1694`).
- Single player imports `src/net` only through the dynamic `import('./net/coopUi')` (`main.ts:129`).

## Cameras (hero candidates, D21)
- Main menu: `world/menuScene.ts:143` (`ArcRotateCamera 'menuCam'`).
  - The preview rig is built in `setAvatar` (`:232-249`).
  - Framing radii are 5.4 / 3.5 / 2.9 m (`:289-318`), with DOF on the operator. Hero.
- Photo mode: `ui/screens/photoMode.ts`.
  - In game it takes `player.cam.camera` (`gameState.ts:1314`). In the menu it uses a `FreeCamera 'photoCam'` (`:72`).
  - It is free fly, so it can reach the body. Hero.
- Gameplay: `ShoulderCamera` (`player/shoulderCamera.ts:152`), a 2.2 m boom (1.5 m when aiming). LOD0.
- There are no intro, kill or spectator cameras.

## Shadows
- Bodies register their meshes with `world.addShadowCaster` (`world/world.ts:438-453`).
- That feeds the sun CSM and the lamp pool:
  - `world.ts:318` skips bounding radius < 0.3.
  - `lightRig.ts:342` tests the bbox against lamp reach.
  - Skinned meshes therefore use `alwaysSelectAsActiveMesh` and keep their bind-pose bounds (as the voxel body does,
    `voxelBody.ts:244`).
- Bias is set per generator only: sun 0.002 / 0.02, lamps 0.0006 / 0.012, menu 0.0008 / 0.01.

## Gameplay isolation (swapping the visible body cannot change gameplay)
- Light meter: `lightField.bodyLevel` (`world/lightField.ts:162`).
  - Called from `gameState.ts:990-1022`.
  - It samples points from the feet, the crouch blend and `rig.posedHead()`.
  - The occluder ray hits `G.STATIC` only (`:1098`).
- Guard perception: `ai/enemy.ts:810-895` reads `PlayerRef` (feet, speed, crouched, light, aim / head points).
  - Its line-of-sight ray hits `G.STATIC` only (`ai/perception.ts:70`).
- Hit volumes: `game/playerTarget.ts:47-119` uses Havok capsules from `proportions('average')`, synced to the rig's
  joint nodes. The remote ones are at `net/remotePlayer.ts:62`.
- Exposure HUD: `tactics.ts` rays use joints and `G.STATIC` only.
- The game never calls `scene.pick`. Rig parts and the voxel body are not pickable.
- Mesh-dependent but cosmetic only: shadow casters, camera fade, heat / flash tint, lens colour, `backGear`.
  - The operator meshes are not pickable and are not physics bodies, so none of this reaches gameplay.

## Bundling after the merge
- `vite.config.ts`:
  - `base` comes from `VITE_BASE` (GitHub Pages).
  - `assetsInlineLimit: 0`.
  - Binary assets are imported with `?url` and fetched: foley, weapon audio, music through `import.meta.glob(..., {
    query: '?url' })`, and the Havok wasm.
- PWA precache: `globPatterns` cover js / css / html / wasm / png / svg / json plus the MP3 sets.
  - `maximumFileSizeToCacheInBytes` is 16 MB.
  - There is no runtime caching.
  - `.glb` and `.ktx2` are not matched.
- `core/babylon.ts`:
  - Exports Skeleton, Bone, Mesh, VertexData, PBRMaterial, Texture, KhronosTextureContainer2, TransformNode and
    Matrix / Quaternion / Vector3.
  - It blanks the KTX2 CDN decoder URL (`:29`).
  - It does not export GlowLayer, NullEngine or SceneLoader.
- The Lab's KTX2 setup (`operators/lab/ktx2.ts`) bundles `@babylonjs/ktx2decoder` and its wasm through `?url` and runs
  on the main thread.
- `core/mathx.ts` has `hyp2` / `hyp3`. Vitest runs Babylon on a NullEngine (`tests/rig.test.ts:190`).
