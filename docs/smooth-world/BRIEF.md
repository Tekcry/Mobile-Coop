# Smooth world - brief

Job lead: Night Shift | Character Build (laptop). Branch `feature/smooth-world`, folder
`C:/NightShift/Mobile-Coop-smooth-world`, cut from master 4.19.1 (b125599e) on 2026-10-20.

## The ask (Michael, 2026-10-20, through the orchestrator)
"there still looks to be voxel graphics in the map which is no longer the goal"

He chose **"Turn voxels off by default"**. This replaces G68's "voxels only as the way the world is drawn".

## Goal
The world, characters, weapons and the menu draw smooth by default: the blockout's boxes and cylinders in PBR
materials with the bundled CC0 surface atlas, no voxel meshes. `?voxels=1` keeps the old voxel look for comparison.
Light parity holds: what the player sees, the light meter and guard perception agree, and the gameplay light bake
(light meter, perception) is identical with voxels on or off.

## Scope
1. `flags.voxels` defaults off (`src/core/flags.ts`); `?voxels=1` turns it on.
2. Voxel null: `World.create` draws the blockout's pieces in PBR with the surface atlas (walls, floors, props).
   Characters, weapons and props smooth (`setCharacterVoxels` / `setVoxelWeapons` / `setVoxelProps` null).
3. Light: the gameplay bake (`bakeLevelLight`) is already built without voxels. The rendered baked lamps
   (`BakedLamps`) must also draw on the smooth path so the picture matches the bake. Prove parity: a Vitest unit test
   comparing light samples with voxels on vs off at a few points, plus the e2e light / stealth suites.
4. `?gfx=min` (tests) keeps its fast path (standard materials, no baked lamps).
5. Menu scene: `flags.voxels` gates it too; the hero stays smooth.
6. Perf: draw calls and frame time no worse; numbers noted (software GL is not a perf claim; real numbers are the
   desktop's GPU run).

## Limits
- Laptop: headless only, no GPU or visual checks (GPU before / after shots go to the desktop), `E2E_PORT=4191`,
  one heavy job at a time under `C:/NightShift/heavy.lock` (the runner session has priority).
- Gameplay never reads graphics state (hard rule): no gameplay change from the flag.
- No refining (current goal): make the smooth path the real look, no art polish.
- The voxel code stays (behind `?voxels=1`); no deletion in this job.
- No em dashes.

## Assumed decisions (logged, job carries on)
- A1. Voxel code is kept behind `?voxels=1`, not deleted. Undo: a later cleanup job deletes `src/voxel` render parts.
- A2. The sky-bake fill (dark under roofs) on voxel surfaces has no smooth-path twin; the smooth path relies on the
  ambient grid through `LampPlugin` (as characters and props already do). Undo: add a sky-visibility fill to
  `SurfacePlugin`.
- A3. Voxel-only extras (bullet chips into the voxel, voxel GI, ray-traced reflections against the brickmap) are off
  on the smooth path; RT reflections fall back to SSR. Undo: `?voxels=1`.
- A4. The DECISIONS / bible entry ("smooth world by default; voxels only behind `?voxels=1`", replacing G68's voxel
  clause) is drafted in STATE for the orchestrator to number at the merge.
