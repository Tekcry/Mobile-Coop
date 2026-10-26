# Guard render: plan

Step-1 analysis on master d140e097 (4.66.0). File:line refs are on that commit. Numbers: `docs/guard-cap/RESULTS.md`
on `origin/feature/guard-cap` d610c609 (4.64.0, laptop RTX 4090, Epic 1920x1080, uncapped, Sector Ops unless named).

## 1. What a guard is (why ~55 active meshes)
- A guard is a `CharacterRig` built by `buildEnemyRig` (`src/ai/enemyRig.ts:12-26`; bodies `src/ai/body.ts:12`;
  co-op puppets reuse it). The rig is ~29 joint `TransformNode`s (`src/player/characterRig.ts:1175-1240`) and, in
  the default smooth style, ~50 rigid body parts from `buildParts` (`characterRig.ts:1366-1600`, 89 `part()` call
  sites, look-gated), each an `InstancedMesh` of a shared part-library shape (`src/world/partLibrary.ts:186-193`)
  parented to a joint, plus the gun (baked mesh once loaded, its parts disabled: `src/weapons/weaponModel.ts:196`) and
  goggle glow instances when the look has goggles (`src/player/goggleGlow.ts:41`). ~50 + gun + glows = the ~55.
- No Babylon skeleton, no morphs, no CPU skinning on the default path: voxels are off by default
  (`src/core/flags.ts:105`, `?voxels=1`), so `VoxelBody` (the merged, rigidly skinned body,
  `src/voxel/voxelBody.ts:175-262`) is not built (`characterRig.ts:1247-1249`, `src/game/gameState.ts:805`).
- Per part per frame, in `scene.render()`: `isReady`, `computeWorldMatrix` (its joint moved), bounding-info update,
  LOD pick (the part bases carry a low LOD at 16 m: `partLibrary.ts:166`, so every instance runs `getLOD`), frustum
  test; then, per pass it is drawn in (main/TAA, G-buffer, sun cascades, lamp / flashlight shadows), its world matrix
  and three instanced buffers (`color`, `pattern`, `color2`: `partLibrary.ts:107-112`) are copied into the batch's
  instance buffer and uploaded. One frozen material for all parts (`partLibrary.ts:96`), so draws batch across guards
  (draws +1.6 a guard), but the per-instance JS stays. Evaluation alone is 14.3 ms at 24 guards with none on screen
  (away cell): ~10.8 us per part, paid whether seen or not.
- The sim `anim` bucket (0.17 ms a guard) is `EnemyManager.frameUpdate` -> `Enemy.frame` (`src/ai/enemy.ts:1762-1818`)
  -> `CharacterRig.animate` (`characterRig.ts:1640-1682`): the clip graph, foot planner, two-bone IK for arms and
  legs, clavicles, fingers, keyed legs, the guard tuner window (`src/anim/tuneGuardRig.ts:183`), then a forced head
  matrix (`enemy.ts:1815`). It runs every render frame for every guard; the only LOD is "beyond 22 m x the Detail
  scale, every other frame" (`characterRig.ts:368-372, 1644-1653`). The budget is 0.075 ms per character
  (`docs/systems/performance.md:17`; 0.055-0.067 measured at 3.5.0), so it has grown ~2.5x.
- The opt-in voxel path has its own costs: the hidden parts use `isVisible = false` (`voxelBody.ts:258`), which still
  pays `isReady` + `computeWorldMatrix` every frame; the merged meshes use `alwaysSelectAsActiveMesh`
  (`voxelBody.ts:244`), so they are never culled; one `onBeforeRenderObservable` per guard (`voxelBody.ts:260`).

## 2. Constraints every slice keeps
- Gameplay reads collision and perception only. Perception's eye comes from the sim (`enemy.ts:492-494`: pos +
  crouch); no `src/ai` code reads rig parts. The one gameplay input taken from the pose is the head hit volume:
  `enemy.ts:1815-1816` copies the rig's head node into `this.head`, and `hitboxes.sync(pos, head)` uses it
  (`enemy.ts:1758`). Today's anim LOD (camera distance x the Detail setting) already makes that head lag a frame for
  far guards: a latent graphics-to-gameplay leak (open question 2). Render-only slices (S1, S2, S6, S7) never touch
  it; anim slices (S4, S5) keep it exact or move it off the rig first (S3).
- Light parity: no slice changes the light field, the light meter or perception's light reads. A merged guard shades
  the same in every pass (same material family; per-vertex colour / pattern / surface = the instance values), so a
  guard lit by a lamp or flashlight looks exactly as lit as before. Impostors are rejected for this reason.
- Hot paths do not allocate; Babylon only through `src/core/babylon.ts` (any new side-effect import goes there).

## 3. Slices (in order: cheapest-and-biggest first)
Expected ms are at 24 patrol/facing, Sector Ops, frame CPU unless named; the derivation is given.

### S0. Measure kit and fresh baseline (0 ms; needed by all)
- Bring `scripts/guard-cap.mjs` onto this branch (`git checkout origin/feature/guard-cap -- scripts/guard-cap.mjs`,
  or after guard-cap merges). Re-run the baseline at this branch's base so 4.66.0 is the reference, not 4.64.0.
- Files: `scripts/guard-cap.mjs` (guard-cap job / orchestrator).

### S1. One merged, rigidly skinned mesh per guard (-28 to -32 ms CPU; GPU -5 to -15 ms, unproven)
- The smooth twin of `VoxelBody`: per guard, the parts' own geometry (instance transforms baked in joint space,
  instance colour / pattern / color2 as vertex data) merged into one mesh plus its low-LOD twin (the part bases'
  16 m LOD), skinned rigidly to one bone per joint (the `VoxelBody.pose` pattern, `voxelBody.ts:265-268`, no
  allocation), GPU skinning (Babylon's default `computeBonesUsingShaders`, bone texture), on the frozen `partSkinMat`
  (`partLibrary.ts:100-103`; its voxel plugin stays off without a `vox` attribute, `voxelBodyPlugin.ts:22-24`).
  Geometry shared per (look, build), as `jointQuads` caches it.
- The parts stay for what reads them but `setEnabled(false)` (skips evaluation), not `isVisible = false`.
- A fixed root-local bounding box (stand / crouch / lean margins) instead of `alwaysSelectAsActiveMesh`, so camera and
  cascade culling work (a ragdolled body falls back to always-active or a refreshed box).
- Flash, thermal heat, lens glow, head hide: per-vertex colour writes through a part -> vertex map
  (`VoxelBody.setPartColor` / `setFlash` already do this).
- Shadow casters = the merged meshes (`enemyRig.ts:18` already uses `rig.renderMeshes`).
- Derivation: evaluation 17.4 - 0.6 = 16.8 ms for ~1320 parts; ~72 meshes after (3 a guard) ~0.9 ms: -15.9. The rest
  of render() grew 21.9 ms (~16.6 us per part instance over its passes); merged: 24 guards x ~5 draws x ~25 us + 24
  bone-texture uploads ~ 3.7 ms: -18. Sum ~-34, less a margin for skinning setup: -28 to -32. Away cell: -25 or more
  (off-screen guards culled outright). GPU: triangles unchanged, but ~50 dynamic instance-buffer uploads per pass go.
- Files: new `src/player/smoothBody.ts` (Babylon) + `src/player/smoothBodyMerge.ts` (pure merge, Vitest), or a
  shared rigid-skin base factored out of `src/voxel/voxelBody.ts`; `src/player/characterRig.ts` (constructor
  1247-1249 build switch, `renderMeshes` 1255, `setHeadVisible` 1262-1267, `setLensGlow` 1626-1633, `setFlash`
  3887-3900, heat `pattern.w`); `src/world/partLibrary.ts` (expose the base and low-LOD geometry);
  `src/ai/enemyRig.ts`, `src/ai/body.ts` (opt in: guards first; the player keeps the operator figure, dummies / VIP
  later).
- Owners: CT Core (characterRig.ts, smoothBody*, voxelBody.ts); Guard AI Build (enemyRig.ts, body.ts: one option
  each); World owner for partLibrary.ts (to confirm).

### S2. Voxel-path culling fixes (0 ms by default; ~-15 ms at `?voxels=1`)
- `voxelBody.ts:258` `isVisible = false` -> `setEnabled(false)`; `:244` always-active -> the S1 box; `:260` one shared
  observer. Fold into S1 if S1 factors out the shared base. Files: `src/voxel/voxelBody.ts` (CT Core).

### S3. Head hit volume off the render pose (0 ms; unlocks S4)
- Either the head from the sim (pos, crouch, cover lean / peek: a pure function in `src/ai`), or keep the rig head
  with anim tiers fixed in code (never scaled by the Detail setting) and a staleness cap (<= 3 frames).
- Files: `src/ai/enemy.ts` 1757-1759, 1814-1816 and `src/ai/hitboxes.ts` (Guard AI Build); `characterRig.ts`
  368-372 if the Detail scale leaves the anim LOD (CT Core).

### S4. Anim tiers: off-screen and far (-1 to -2 ms facing; ~-3 ms away)
- Off-screen (the S1 mesh not drawn last frame, for every local view) solves every 4th frame, far every 2nd, near
  every frame; elapsed dt carried as `lodDt` does now (`characterRig.ts:1644-1657`). The weapon glide keeps running.
- Derivation: 4.24 ms at 24; away: ~3/4 of it goes; facing: only the far share (the cells' spread decides).
- Files: `src/player/characterRig.ts` 1640-1657 (CT Core); `src/ai/enemy.ts` 1762-1818 passes the hint (Guard AI).
- Co-op: the host resolves hits; a guard on the partner's screen only is off-screen on the host, so S3 lands first,
  or the host keeps full rate for guards near any player.

### S5. Animation per guard back to budget (-2.3 ms)
- Profile `animateFrame` (fingers, clavicles, keyed legs, the guard tuner window when nothing is live, foot planner)
  to 0.075 ms per character with the pose unchanged (golden pose tests). (0.17 - 0.075) x 24 = 2.3 ms.
- Files: `src/player/characterRig.ts`, `src/anim/tuneGuardRig.ts`, `src/anim/fingers.ts`, `src/anim/animGraph.ts`,
  `src/anim/footPlanner.ts` (CT Core).

### S6. Guards in the sun cascades only near the camera (-0.5 to -1 ms CPU; -1 to -2 ms GPU)
- After S1 a guard is one caster; keep it out of the far cascades / beyond a distance.
- Files: `src/world/world.ts` 471-485 (`addShadowCaster`, `sunMoving`; World owner); `src/ai/enemyRig.ts` (Guard AI).
- Parity: guard shadows are not in the light field or the meter; confirm the meter never samples shadow maps.

### S7. Merged LOD tuning (~0 CPU; -1 to -3 ms GPU)
- The merged low LOD at the part library's distance (16 m x the Detail scale); a coarser third level only if GPU
  still misses. Impostors rejected (lighting parity, animation).
- Files: `src/player/smoothBody.ts`, `src/world/partLibrary.ts`.

### Rejected or not the cost
- AI / perception LOD (AI 0.02-0.06 ms a guard). Draw submission (+1.6 draws a guard). Flashlight shadows (flat
  pool). Per-guard materials (one frozen material). `setFlash` allocations (only on change, `characterRig.ts:3888`).
  Thin instances: a fallback only if S1 fails (removes evaluation, but no per-guard culling).

## 4. Prediction
Sector Ops 24 patrol/facing: frame CPU 57.1 -> ~25-29 after S1 -> ~21-25 after S4 + S5 (fewer catch-up sim steps at
the higher frame rate help too). 60 Hz at 24 facing likely needs one more look after S1's run (the sim's non-anim
per-guard frame share; the 0-guard base of 2-10 ms by cell). Re-plan after S1's numbers.

## 5. How each slice is measured
On the laptop GPU, alone (nothing else using the GPU), after `npm ci` + `npm run build`:

    E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse --counts=0,12,16,24 --cells=patrol,away,alert --out=docs/guard-render/run-<slice>

Same cells as d610c609 (Epic, 1920x1080, grunt, warm 5 s, sample 10 s, uncapped). Compare render() CPU, evaluation
ms, active meshes, GPU ms, `ai.anim` and frame CPU against S0's baseline. Plus a look check: the same guard and view,
screenshots before / after in the slice's PR (thermal and night vision too), and `npm run check` + the e2e tiers.
