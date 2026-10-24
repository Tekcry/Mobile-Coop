# PERF report: guard figure render CPU (feature/gm-perf)

Toward the G8 gate (figures ON within +0.5 ms frame CPU p95 of OFF at 24 guards; g8c on 0fd85e2b: +1.1 to +2.5 ms).
Read-only profile (g8c data): active meshes and active-mesh evaluation equal ON and OFF; the gap is render() CPU
(+0.7-1.0 ms, +0.3 ms even with no guard on screen), with GC spikes in p95. Render-only; gameplay reads none of it; no
per-frame allocation added.

## STATE correction (for the lead; STATE.md not edited)

The G8 table's "Poser solve per guard ... `ai.anim` ON - OFF ... PASS" line was never a poser measurement. `ai.anim` is
`EnemyManager.frameUpdate` timed inside `loop.stepHeadless` (scripts/guard-cap.mjs `pageSim`), and `stepHeadless`
(src/core/loop.ts:75) never calls `scene.render()`. The figure's poser solve ran in `GuardBody.frame`, a
`scene.onBeforeRenderObservable` observer (guardBody.ts `register`), so it was in no sim bucket at all: `ai.anim` ON - OFF
measured the rig's own solve (identical ON and OFF). The line should read NOT MEASURED until T1's `render.figure`
reports it.

## What was built

**F1: frozen guard materials.** `buildGuardLod` (src/operators/runtime/guardFigure.ts ~:128-136) freezes each base LOD's
operator PBR after `new GuardFigurePlugin(p)`; the enforcer shield's materials are frozen in `sharedOf`
(src/ai/guardShield.ts ~:64-71); the dropped helmet already draws with the base's LOD material (`asset.materials[0]`,
guardHelmet.ts:58), so it is frozen by the same line. `operatorMaterial` (figure.ts) is unchanged: Wren's figure changes
its glow's emissive uniform at run time, and a frozen PBR skips its own uniform uploads.
- Why it costs: an unfrozen PBR re-runs its whole define preparation (every plugin's `prepareDefines`: the lamps' ~14
  defines, the guard plugin; the light defines) for every guard mesh in every pass, every frame (Babylon's
  `_isReadyForSubMesh` only short-circuits within one render id), and re-binds every texture uniform and every light
  per mesh instead of once per material per pass. Frozen, each submesh is checked until its first ready frame
  (`drawWrapper._wasPreviouslyReady`), then never again. The S1 body's skin material is frozen for this reason
  (partLibrary.ts:107-110), so OFF never paid it.
- Run-time changes still work: nothing in the figure changes a define at run time (`GUARDFIG` follows the mesh's gvis
  buffer, fixed per mesh; tint, flash and thermal heat are gvis vertex bytes, so they need no material work). The game's
  define changes all go through unfreeze / mark / freeze: `World.refreshMaterials` (shadow, torch / character-shadow and
  post stack changes; iterates `scene.materials`, guard materials included), `LightRig.fitMaterial` (new lights or the
  physical falloff), `BakedLamps.attach` (the lamp plugin on a new material). Babylon's `freeze()` / `unfreeze()` call
  `markDirty()`, which clears every submesh's ready state, so the next frame re-prepares. Night vision is a lamp-plugin
  uniform (`lampDark`, bindForSubMesh), bound once per pass on a frozen material, as on the level material.
- Same caveat as S1: a frozen material binds lights once per material per pass, so all guards must share a light set;
  `fitMaterial` gives every lit material all the rig's lights (`maxSimultaneousLights >= materialLights`), so they do.

**F2: lazy, visible-only pose.** `GuardFigure.update` (guardFigure.ts ~:633-677) keeps the LOD pick, the culling mode
(loose / ragdoll) and S11's half-rate gate (`guardPosesNow`, `posedAt`), but instead of posing it sets the LOD's
`pending` flag and marks the skeleton. The joint read and solve moved to `posePending` (~:679-690), registered at load (~:504) on
each LOD skeleton's `onBeforeComputeObservable` (one closure per guard LOD, as smoothBody.ts:161 / :325-328 do for S1).
Babylon computes a skeleton only from `scene._prepareSkeleton`, i.e. when a mesh on it is active in the camera pass or
drawn into a shadow / lamp / torch map (`ObjectRenderer`), and only when dirty. So a guard off screen and in no shadow
list costs the LOD pick only: no rig read, no poser solve, no bone compose, no upload. A pending pose left over runs from
the rig as it is when the guard is next drawn. S11's frozen skip (GuardBody.frame: no `update` while `skip` or the rig
root is disabled) is unchanged. The ragdoll path's meshes are always active, so it still poses every frame. The shield
shares the figure's skeleton, so an enforcer whose shield is drawn still poses. Master's `thawPose`
(enemy.ts:3752-3757) calls `figure.update` during the camera evaluation: the pose now reads the thawed rig if the
skeleton is computed after it, else on the next frame (before: posed then but uploaded next frame, the same).

**T1: guard-cap render.figure and the active-mesh tally** (scripts/guard-cap.mjs; Test Runner asked us to own it until
guard-models merges).
- `render.figure` per frame of the counted sample (`pageRender`, counted only; the clean timing sample stays unwrapped):
  `GuardBody.prototype.frame` (heat, flash, LOD pick, pose request; on pre-F2 builds also the pose) +
  `GuardFigure.prototype.posePending` (the pose, in the skeleton compute), with the poses per frame. Beside it
  `render.s1` = `SmoothBody.frame` (static, the per-render mark) + `SmoothBody.prototype.pose`, timed in both modes
  (under figures the S1 bodies are disabled: frame only). A missing method is listed in `figure.timed` (e.g.
  `MISSING GuardFigure.posePending` on an older build), never an error.
- Active-mesh tally (camera pass, every 4th counted frame): total; guard-owned (mesh under a guard's `rig.root`); by
  name class: body (`-smooth`, `-smooth-lod`), lod (figure `-lodN-i`), gear (`enemy-armour`, `enemy-accent`), gun
  (`wpn-*` part instances), helmet, shield, other; medians, per guard alive, and the top "other" names. Answers whether
  guns are ~13 instanced parts each (weaponModel.ts:138-163: one instance per `def.model` part plus two receiver
  details; guards build `WeaponModel` without `mesh: true`, enemyRig.ts:33).
- Outputs: `render.figure` / `render.s1` / `activeTally` in guard-cap.json, CSV columns (`render.figure_mean_ms`,
  `_p95_ms`, `.frame_mean_ms`, `.pose_mean_ms`, `_poses_per_frame`, `render.s1_*`, `active_<class>`,
  `active_gun_per_guard`, `active_guard_per_guard`), a per-cell table "Guard render CPU and active meshes" in RESULTS.md,
  and the cell log line.

## Expected savings (estimates; the laptop A/B decides)

- F1: 24 guards x one shown LOD mesh, main pass: the per-mesh define preparation and full uniform / light binding of a
  PBR with the lamp plugin is tens of microseconds and allocates (define strings, light arrays). Order of -0.3 to
  -0.6 ms render() CPU at 24 facing / alert, and fewer GC spikes in p95. Nothing in the away cell (no guard drawn).
- F2: the figure pose (rig read + retarget + fingers at LOD0 + 19-33 bone composes) is the main per-guard CPU that S1 did
  not have (S1 poses ~16 bones by one matrix multiply each). Guards behind the camera that no cascade, lamp or torch map
  draws now cost nothing: the away cell's +0.3 ms floor should mostly go, unless the moon cascades still hold them
  (cascade lists are Test Runner's S9). Facing cells: guards in view still pose, so little change there.
- Together: plausibly most of the patrol gap (+1.1 / +1.4 ms); alert cells (+1.7 / +2.5) carry more (torch shadow
  passes: each drawn guard's skeleton is already computed once per frame, so extra passes add draws, not poses). If a
  gap stays, `render.figure` vs `render.s1` and the tally say whether it is per-guard pose CPU or mesh count.

## Tests (one at a time)

- tests/guardFigure.test.ts 25 pass (+4 new, "(perf) frozen guard materials, lazy visible-only pose"):
  - F1: base LOD materials frozen; 3 figures on a NullEngine rendered 5 frames after the first ready frame:
    `GuardFigurePlugin.prototype.prepareDefines` 0 calls, while the guards are active and drawn; the same scene
    unfrozen calls it at least 15 times in 5 frames (the cost the spy sees), refrozen 0 again.
  - F1: on the frozen material thermal heat rewrites gvis with no recompile and no extra draw; a night-vision style
    plugin uniform (stand-in for `LampPlugin`'s gain, attached the `BakedLamps.attach` way) binds its new value on the
    next frame; a define flip is not seen while frozen, and applies through the `refreshMaterials` cycle (unfreeze,
    mark all dirty, frames, freeze), after which prepareDefines is 0 again.
  - F1: the shield source freezes its materials; the helmet drop uses the base material.
  - F2: a figure behind the camera (no shadow lists in the test scene) poses 0 times in 10 rendered frames; one in view
    poses once a frame; one at 40 m (LOD2) poses on alternate frames after its switch frame; the culled one, moved into
    view, poses on its first drawn frame.
  - Existing pose checks now prepare the shown skeleton after `update` (helper `posed`), as a render that draws the
    guard does.
- tests/guardBody.test.ts 16, guardFigureWarm 7, guardLod 3, guardLampCasters 4, guardAssets 34, operatorsRuntime 18
  (+1 skipped), guardShieldShare 2, guardHelmetDrop 3: all pass.
- `npx tsc --noEmit -p .` clean; `node --check scripts/guard-cap.mjs` ok; eslint on guardFigure.ts, guardShield.ts,
  guardFigure.test.ts clean (guard-cap.mjs is eslint-ignored). No e2e, no GPU, no full vitest.

## Laptop A/B (Test Runner, GPU slot alone, heavy.lock)

At this branch's head, `npm run build`, port 4189 freed before and after:

```
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=1 --out=C:/NightShift/scratch/gm-perf/on
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=0 --out=C:/NightShift/scratch/gm-perf/off
```

Read, per cell at 24 (against g8c, origin/shots/g8c-0fd85e2b): frame CPU p95 ON - OFF (gate +0.5); render() CPU ON -
OFF; `render.figure` (ON) vs `render.s1` (OFF) mean / p95 and poses per frame (away: expect near 0 poses unless the
cascades hold the guards); the tally's guard-owned meshes per guard ON vs OFF and `active_gun_per_guard` (confirms or
refutes ~13 gun parts per guard). If ON still misses with `render.figure` small, the gap is outside the figure code
(bone upload, mesh count, shadow passes): next lever from the tally.

## Files

- src/operators/runtime/guardFigure.ts (F1 freeze; F2 `pending`, skeleton observer, `posePending`)
- src/ai/guardShield.ts (F1 shield materials frozen)
- scripts/guard-cap.mjs (T1)
- tests/guardFigure.test.ts (4 new tests, `posed` helper)

Open: no changelog fragment line (the lead owns `changes/feature-guard-models.md`); STATE.md's Poser line (above).
