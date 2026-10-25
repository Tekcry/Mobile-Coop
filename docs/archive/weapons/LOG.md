# Weapons job - log

- 2026-10-19 00:20 (Sydney): set up `feature/weapons` from master (9295c65, PR #5 in; PR #6 still open, A1). Blender
  5.2.2 on this laptop matches the pipeline pin. node_modules linked from the operators worktree (same lockfile).
- 00:30-01:00: the pipeline (`scripts/weapons/`: wlib.py, build_weapon.py, build.mjs; KTX2 through the operators'
  repack) and the rifle (rifle.py): 11.5 k tris, 2K baked set, GLB 6.9 MB; renders in `renders/`. The proxy parts and
  hand points in weapons.json follow the mesh (support hand on the launcher's grip sleeve). Runtime: weaponMesh.ts loads
  the GLB per scene, WeaponModel `{ mesh: true }` for the player, the partner and the menu (A6, A7).
- 00:45: in-game GPU screenshots (Michael: "You are on the laptop also") showed Wren's hands 16 cm off the rig's wrists
  for every gun (pre-existing since 11e): her bind pose bends the elbow about 35 degrees and the poser straightened only
  the upper arm. Fixed in pose.ts and the Lab retarget (the forearm chain hangs by its own direction); wrists now within
  7 mm. Tests updated.
- 00:50: Michael widened the scope: fingers that hold the gun, a believable aiming stance (DECISIONS). Grip morph
  targets from the hero's finger rig (`scripts/operators/py/grip_morphs.py`) in progress; the pistol and the knife built
  by a subagent on the same pipeline.
- 01:00-01:35: pistol (9.7 k tris, 1K) and knife (1.8 k, 512) by a subagent on the same pipeline; finger grips as morph
  targets from the hero rig on all four Wren files (A8) with a sparse-target GLB reader and the figure's blend; hand
  holds solved from her hand frame (A9); shoulder protraction (A10); pistol reach (A11); the pistol in her built holster
  frame (A12); the rifle hung from her back plate's receiver bar by a stud (A13); staging on Proving (Michael).
  `npm run check` green (1580 tests).
- 01:40-02:00: independent check (fresh agent): PASS on scale, realism, holds and carry; one blocker, the grip morph
  managers leaked on figure dispose (menu preview rebuilds, a partner leaving): fixed (fix round 1). The pistol holster
  renders now show the A12 frame. The weapon GLBs get their own service-worker cache (they would have evicted Wren's
  LODs from hers). Docs: CHANGELOG, TESTING, combat / world-and-characters / testing-tools, progress.
