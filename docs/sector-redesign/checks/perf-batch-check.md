# #226 campus perf batch check (2026-10-23, fresh Opus checker)

Reviewed `git diff 1d34c348..057403f5` (perfg) and `git diff 1d34c348..3f87166e` (perfa) in full.

## Verdict: PASS

No blocking items. Both fixes are render only; nothing broken or unplayable.

## What was checked
- Gameplay never reads graphics state: perfg's FROZEN tier reads the rig root's enabled flag only to skip
  `CharacterRig.animate`; guard shots start from the sim's eye (`Enemy.shoot`), hit volumes sync from `pos` / `head`
  (sim `guardHead`), so a frozen guard's skipped pose changes no perception, aim or hit. perfa's `indoor` flag and far
  cull only toggle art meshes; boxes, cover, nav and the light bake are untouched (`campusArtGameplay` passes).
- Per-frame allocation: `animFrozenStep` is allocation-free; `farCull` / `farCullAt` / `repaint` use preallocated typed
  arrays. `mergeGun` allocates (strings, arrays) at guard build only.
- Gun merge: one `InstancedMesh` parented to `gun.node`, so hand / holster / travel / `setVisible` / drop follow as
  before; `WeaponModel.dispose` disposes the node and its child instance (shadow-caster lists unhook on its dispose);
  shared sources go with `lib.skinMaterial`. Colours read back from the part instances; the source key covers part
  shape, placement, colours and world scale. Nothing re-enables the parts later (`WeaponModel` only disables them).
  Skipped for voxel / baked-mesh guns and with `?guardmerge=0`.
- perfa emissive merge: `bakeParts` writes vertices part-major then instance order, the same order as the `Paint`
  `vstart` table, so per-vertex colours land on the right instance; circuit dimming repaints the colour buffer on a
  registry change. Box-hidden skins still cast (merged, `addCaster`); alpha meshes stay per piece (sort unchanged).
- Co-op: both are local render paths, no wire / `MoveState` change; the client runs the same render code.

## Tests (desktop, sr-slot-2)
- perfg: `tsc --noEmit` clean; vitest animFrozen, enemyGunMerge, sectorGuardFreeze, sectorGuardFreezeView,
  sectorGuardFreezeSeeThrough, smoothBody, smoothBodyMerge, guardHeadParity, enemyManagerDespawn: 9 files, 210 pass.
- perfa: `tsc --noEmit` clean; vitest campusArtRender, campusArtPerfProbe, campusArtKit, campusDressRules,
  campusArtGameplay, campusArtLight, campusS1-S5Dress: 11 files, 161 pass.
- Not run (as ordered): e2e, GPU perf. The laptop rerun in `perfg-build.md` / `perfa-build.md` decides the budget.

## Polish list (not blocking)
1. Thaw pose: a guard thawed in the freeze evaluation that runs after his `Enemy.frame` draws his pre-freeze limb pose
   for one frame (before perfg the rig kept solving, so it was current). Fix if seen: on thaw, force one
   `rig.animate` with the carry, or run the thaw before the enemy frame.
2. Indoor far cull: a building's interior art (screens, lamps' emissive glow) can pop on / off through windows at
   58-60 m from the draw's bounds. Look at it in the laptop rerun; raise `ART_FAR` if noticed.
3. Merged skin casters are now one mesh per (section, material) with section-wide bounds: they can enter more spot
   lights' caster lists than the per-piece meshes did (GPU shadow draws). Watch shadow draws in the rerun.
4. `animFrozen.ts` folds into master's `animTier.ts` at the master merge (merge note in `perfg-build.md`).
