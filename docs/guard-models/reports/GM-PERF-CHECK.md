# GM-PERF check (fresh Opus checker, feature/gm-perf a64fb335)

**Verdict: PASS.** No blockers. Safe to merge into feature/guard-models and flip `guardModels` on (flags.ts `=== '1'` -> `!== '0'`), on the measured gate (408ab154, 24 guards, sectorops + campusops: ON within +0.5 ms frame p95 of OFF).

Scope: `git diff origin/feature/guard-models...origin/feature/gm-perf`, 7 commits (408ab154 F1 / F2 / T1, the S13 WIP commits 1574178b..2acadf6c, a64fb335 docs). There is no master-merge noise in this range. Files: guardFigure.ts, guardShield.ts, guardGearMerge.ts (new), gearParts.ts, enemy.ts / enemyPuppet.ts (type only), smoothBody.ts (`extras`), guard-cap.mjs, 2 test files.

## Checks run
- `npx tsc --noEmit -p .`: clean.
- vitest (the files that import the changed modules, plus the gear / helmet / gun / lamp neighbours): guardActiveMeshes, guardFigure, guardBody, guardShieldShare, smoothBody, smoothBodyMerge, guardFigureWarm, coopTorches (8 files, 70 tests), then gearWiring, guardHelmetDrop, coopGuardCarry, enemyGunMerge, guardLampCasters, guardLod (6 files, 42 tests). All pass.
- eslint on the changed src and test files: clean. `node --check scripts/guard-cap.mjs`: ok.
- No e2e, no GPU, no `npm run check` (as briefed).

## What was verified (against Babylon 9.29.0 source in node_modules)
- **F2 lazy pose: no stale pose.** `Skeleton.prepare` runs `_computeTransformMatrices` (which fires `onBeforeComputeObservable`) only when the skeleton is dirty. It is reached from `scene._activeMesh` (camera pass) and from `ObjectRenderer` (`scene._prepareSkeleton`, line 769) for every shadow, lamp and torch map. `GuardFigure.update` runs in `onBeforeRenderObservable` (GuardBody.frame). That is before both the active-mesh evaluation and the custom render targets in `scene.render`, so the pose reads this frame's rig.
  - A guard drawn only in a shadow pass is still posed.
  - A pending pose that was not drawn stays dirty and is solved from the current rig on the first frame it is drawn.
  - Ragdoll: `loose` passes the half-rate gate every frame, and its meshes are `alwaysSelectAsActiveMesh`, so it poses every frame through `poseWorld` (`this.loose` is set in the same `update`).
  - Carried bodies have their own rig and figure, so they follow the same path.
  - The enforcer GLB shield shares the LOD skeleton, so drawing it also triggers the pose.
  - The S11 frozen skip is unchanged. Nothing in gameplay or e2e reads figure bones: hitboxes and the muzzle use the rig, and `gearShown` reads flags or `isVisible`.
- **F1 frozen materials: no stale shading.**
  - `GuardFigurePlugin` has no per-mesh uniforms, and tint, flash and heat are gvis vertex bytes.
  - Every run-time define change on these materials is frozen-aware: `World.refreshMaterials` and `LightRig.fitMaterial` unfreeze and refreeze, and so does `BakedLamps.attach`, which runs a frame after the add.
  - The helmet drop gets its own effect, which `isCachedMaterialInvalid` catches. The test shows a night-vision style uniform still binds once per pass.
  - Lights bind once per material per pass on a frozen PBR (pbrBaseMaterial.pure.js:1749). That is correct here: there is no `requireLightSorting`, and the only include masks hide a light from every mesh (`charShadows`, `torchShadows`). It is the same rule the S1 skin material already runs on.
- **S13 merged gear: same look, same per-stage visibility.**
  - Armour: 4 parts on 3 joints become ONE mesh, skinned with bind = identity on the S1 body skeleton (`body.nodes` index = bone), parented to the rig root like the body.
  - Show / hide per alarm stage still goes through `isVisible` on the returned mesh. The low-LOD mesh is `isBlocked` (master mesh), so hiding the high mesh hides both, in the camera pass (scene `_evaluateActiveMeshes`) and in shadow passes (objectRenderer.js:752).
  - The helmet is not merged and still hides on knock-off. The shield is never hidden by stage (dispose only), and its merged instance keeps parent = root, like the old `sh`.
  - Per-guard colour, pattern and `color2` are in the cache key and the vertex data.
  - Culling uses the body's rest box plus margins of 1 m, 0.3 m and 1 m on the x, y and z axes, so the plates fit. A ragdoll frees the gear through `extras`. The rig root's dispose frees the merged meshes, and the shared geometry stays with its source.
  - With figures ON, the placeholders are never built (`showGear` returns at `gb`), so S13 only acts on the flag-off and figure-not-loaded path.
- **Co-op puppets:** `EnemyPuppet` uses the same `buildArmourParts` / `buildShieldPart` and the same `isVisible` loop, so puppets look the same as host guards. `gearShown` reads `armourParts[0].isVisible`, which is now the merged mesh. The e2e-coop gear asserts (e2e-coop.mjs:372, :423, :477) read `gearShown` only. `rig.setEnabled(false)` on a puppet still hides the gear, because it hangs under the rig root.
- **Hot path:** the per-frame code added is `update` (one flag and a `markAsDirty`) and `posePending` (no allocation). The one closure per guard LOD is made at load. All the allocation in guardGearMerge.ts (`map`, key strings, `new Mesh`, the `own` closure) runs at gear build time only. No `Math.hypot`.
- **Gameplay never reads graphics:** confirmed. Gear flags stay gameplay state, and the shot origin is `eye()` plus yaw (enemy.ts:3315-3322).

## Blockers
None.

## Polish list (not blocking)
1. guardGearMerge.ts:180-187: `mergeStaticParts` derives the shield's root-local matrix as world x inverse(root world) in float32. For a guard far from the origin, the `toFixed(4)` key can differ between enforcers and build an extra source, and the geometry is off by about 10 µm. Fix: compose the local chain instead (`visor` local x `sh` local, `sh` local), as `mergeRigGear` does.
2. gearParts.ts:61 / guardGearMerge.ts:110-171: the armour merge runs the first time a guard needs armour, which is mid-play at alarm stage 2 (`GEAR_BY_STAGE`). Many guards gaining armour at once means one frame of merges (key strings, `mergeParts`, 2 meshes each, and a first ready check on the frozen skin material). Fix if a hitch shows: prewarm one merge per build at section load.
3. guardGearMerge.ts:73 / :140: `SOURCES` keeps every (build, colour) source until the part library's skin material is disposed (hidden or disabled meshes stay in `scene.meshes`). It is bounded by the number of distinct builds, so this is fine for now. Note it if section restarts ever rebuild the part library per restart.
4. guardGearMerge.ts:101 / :152: the merged gear takes `receiveShadows` from the part base, as before (it is the base's value), while the S1 body hard-sets true. This is not a change, but the armour may receive shadows differently from the body it sits on. Check it in the visual pass.
5. guardFigure.ts:136: frozen guard materials bind lights once per material per pass. A future per-mesh light list (`includedOnlyMeshes`, `requireLightSorting`) would silently mis-light every guard but the first drawn. Add a line to docs/systems/lighting.md beside the S1 note.
6. enemy.ts:3757 (`thawPose`): when the skeleton was already prepared in this render id, the thawed pose shows a frame late. This is the same as before F2 (the PERF report says so). P2 from S11-CHECK (killed while frozen) is still open.
7. Docs: the a64fb335 subject ("guard guns ... as one mesh each") names perfg's gun merge, but the commit is docs only, and the S13 code sits in WIP commits 4af29b49 and 355c216d. Use a clear squash subject at the merge. The STATE.md "Poser solve ... PASS" line should read NOT MEASURED (PERF-REPORT "STATE correction"). The changelog fragment line is still owed by the lead.
8. S13 itself (armour merge, shield merge) has no GPU number yet: the 408ab154 gate run predates it. It only touches the flag-off and fallback path, so it does not gate the flip. The `perf.mjs` geared-section A/B in PERF-REPORT still applies.
