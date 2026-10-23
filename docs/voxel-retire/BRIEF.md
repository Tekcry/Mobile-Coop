# voxel-retire - brief

Chore job, branch `feature/voxel-retire`, folder `C:/NightShift/Mobile-Coop-voxel-retire`, cut from master f5912402.

## The ask (Michael's words)
- 2026-10-23 ~15:05, native multiple choice, after #226 failed the voxel fit test on three campus props:
  "nothing should be voxel"; chose "Retire it" (ROADMAP "Decided", commit 617adcbd "orchestrator: voxel look
  retired (Michael)").
- The orchestrator's scope line: remove the `?voxels=1` render path, voxel characters / weapons and their tests,
  keeping the lamp / sky / light bakes in `src/voxel` (light grids, not drawn). DECISIONS at the merge (replaces
  G68's voxel clause and smooth-world's comparison flag).
- Earlier (2026-10-21 ~22:40, G223): "there still looks to be voxel graphics in the map which is no longer the goal";
  voxels then went off by default behind `?voxels=1`. This job removes that flag and everything only it reached.

## Goal
Nothing in the game can draw voxels any more. The smooth default path (PBR level, baked lamps, smooth sky fill,
smooth characters / merged guard bodies, baked weapon meshes) is unchanged pixel for pixel. The canonical light
bake (lamp, moon, sky visibility, ambient grid) and its hashes are byte-identical.

## Limits
- Removal only: no new feature, no refactor beyond what the removal needs, no renames of kept modules.
- Never touch `src/net`, `PROTOCOL_VERSION` or the save shape (settings fields stay as they are; see A3).
- The canonical light bake must not change: `SHAPE_STRIDE`, `packShapes` layout (slot 11 `prog` stays packed),
  `lightShapes.ts`, `lampBake.ts`, `skyBake.ts`, `lampVolume.ts`, `lampJobs.ts` stay untouched.
- Gameplay reads nothing it read before differently (hard rule: gameplay never reads graphics state).
- Prototype-first rules (CLAUDE.md "Current goal"): one fix round at most.

## Assumed decisions (logged, job carries on)
- A1. Keep `src/voxel/` as the light-bake folder (no rename to `src/light/`): fewer touched importers. Undo: a later
  rename chore.
- A2. `CharacterRig.voxel` keeps its name: it now holds only the merged smooth guard body (`SmoothBody`, guard-render
  S1), which `ai/enemy.ts`, `ai/animTierView.ts`, `tests/smoothBody.test.ts` and `tests/operatorsRuntimeFigure.test.ts`
  read. Only its type narrows to `SmoothBody | null`. Undo: rename to `body` in a later chore.
- A3. Settings shape unchanged: `GraphicsFeatures.reflections` keeps `'rt'`, `rtRes` and `gi` stay, and the Settings
  screen keeps "Ray traced", "Ray-traced reflections rate" and "Global illumination". `RtReflections` is deleted
  (it traced only the voxel brickmap), so "Ray traced" is always the screen-space fallback, as on today's smooth
  default; GI already did nothing without voxels. Undo / follow-up: hide those three controls (no migration needed:
  stored values still parse).
- A4. The frame governor's ladder is unchanged: `Adaptive.voxelLod` (level 6) stays in `core/governor.ts` and its test;
  nothing reads it after this job. `SPIKE_EVENT.lod` stays in `core/spikes.ts`. Undo / follow-up: drop or reuse step 6.
- A5. `lightRig.ts` keeps its optional `micro` option (`MICRO_SHADOWS`); `World.applyQuality` stops passing it.
  `Ballistics.onWorldHit` and `Vfx.chips` stay (generic hooks, no longer assigned). `skyBake.ts` keeps its GI bake
  code (unused by the game; its test stays). Undo / follow-up: a dead-code sweep.
- A6. The smooth sky bake keeps its grid exactly: the 0.05 m / brick 8 / chunk 128 / 1.5-voxel thickness numbers and
  `SKY_CELL` 0.5 move into `world/levelFill.ts` as named constants, so the sky visibility cells are identical.
- A7. Map art layers go: `world/maps/warehouseArt.ts`, `voxel/programs.ts` and `MapDef.art` are deleted (only the
  voxel renderer drew them). `shapes.ts` `rasterise` loses its program branch (no light shape ever carries a program)
  and `coarseShapes` (only voxel levels of detail used it).
- A8. Tests that only proved voxel facts are deleted (`voxelFit`, `losParity`, `levelFillParity`); tests that mix kept
  and removed code keep their kept blocks (`voxel.test.ts` -> `shapes.test.ts`, `voxelArt.test.ts` ->
  `skyBake.test.ts`). `tests/voxelFit.test.ts` is also deleted by #226; whichever lands second merges cleanly.
- A9. Stale `voxel:*` entries in IndexedDB `kv` (the old chunk cache) are left; not a save-schema change, no
  migration. Undo: a one-line cleanup later if anyone cares.
- A10. Backlog item 5 ("Ghost copy of the operator on Epic", `voxelBody.ts`) closes with this job (its code is gone).
