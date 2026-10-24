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

## S13: active meshes per guard (PLAN2 S13)

**Cause of the +15-19 found: the guard gun as 18 instanced parts, already fixed by perfg.** g8 (cf5a2bf8) and g8c
(0fd85e2b) predate master's perfg (057403f5, "merged guard gun"), which this branch got with the master merge 8809aab9.
In those builds a grunt's rifle drew as its 18 part instances (`weaponModel.ts:138-163`: 16 `def.model` parts + 2
receiver details): body 1 + gun 18 = 19, exactly campusops patrol/facing's slope ((668 - 212) / 24 = 19.0); sectorops
15.25 (some parts frustum-culled). ON equals OFF because the gun is the same in both paths. Since perfg the gun is one
instance of a merged source per gun type (`enemyGunMerge.ts`), so 408ab154 (the A/B now running) already carries it.

**Count at this head** (tests/guardActiveMeshes.test.ts: a host `Enemy` built and framed as the game does on a
NullEngine, stubbed hitboxes, camera on him; every mesh in the camera pass's active list):

| Guard | Before (as measured, pre-perfg) | 408ab154 | S13 |
| --- | --- | --- | --- |
| Flag off, grunt, no gear (guard-cap's spawn) | 19: body 1, gun parts 18 | 2: body, gun | 2 |
| Flag off, grunt, helmet + armour | 24: + helmet 1, armour 4 | 7 | **4**: body, gun, helmet, armour 1 |
| Flag off, enforcer, helmet + armour | 26: + shield 1, visor 1 | 9 | **5**: shield 1 |
| Flag on, grunt (gear = figure pieces) | 19: figure LOD 1, gun parts 18 | 2: figure LOD, gun | 2 |

Per class, parts path -> merged: rifle 18 -> 1, pistolSd 7 -> 1 (perfg); S1 armour 4 -> 1, S1 shield + visor 2 -> 1
(S13); helmet 1 (unchanged). No torch, light proxy, holster, magazine, pouch, knife or glow mesh exists on a guard:
torches are pooled lights, holsters set `thighGear` only, grenade pouches and the knife are Wren's, glows are Wren's
goggle. Under the figure, helmet / vest / plate / pouches / holster are pieces of the one LOD mesh.

**Built (render only).**
- `src/ai/guardGearMerge.ts` (new): `mergeRigGear` turns the S1 armour (2 chest plates, 2 shoulder caps on 3 joints) into
  ONE mesh skinned rigidly on the merged body's own skeleton (bone per joint from `SmoothBody.nodes`, bind = identity
  as the body's parts), low LOD tracked, culled with the body's rest box; geometry built once per (library, parts,
  joints) and shared by every matching guard (Babylon geometry sharing), each guard's mesh its own (his skeleton).
  Nothing new per frame: the body's per-render bone pose already computes those bones; no observer, no skeleton.
  `mergeStaticParts` turns the enforcer's S1 shield + visor into one instance of a shared merged source.
- Both use `partSkinMat` (frozen; the same `make()` settings plus the smooth plugin), as the merged body and gun do;
  per-vertex colour / pattern / `color2` / `ppos` / `pnrm` are the instance values. The gear parts had no heat or
  flash and still have none. Off (`?guardmerge=0`), no merged body (stand-in rigs, flag-off tests) or a part off the
  body's joints: the parts stay, as before.
- `src/ai/gearParts.ts`: `buildArmourParts` returns `[merged]` (the caller's `isVisible` loop hides / shows it; host
  `Enemy` and co-op `EnemyPuppet` unchanged but the field type `AbstractMesh[]`), the merged hi + low LOD in the shadow
  list as the body's; `buildShieldPart` returns the merged instance.
- `src/player/smoothBody.ts`: `extras` (meshes skinned on the body with its rest box): a ragdoll's re-parent frees them
  with the body (`alwaysSelectAsActiveMesh`), so a dead guard's armour is never culled by a stale box.
- `scripts/guard-cap.mjs` tally: a mesh named `*-gun` (perfg's merged gun) counts as `gun` (on 408ab154 it reads as
  `other`: there `active_gun_per_guard` 0 and `other` ~1 a guard mean "merged", not "missing").
- Gameplay untouched: a guard's shot origin is `Enemy.muzzle` = `eye()` + sim yaw offsets (enemy.ts:3315-3322), never
  the gun mesh; gear flags (`helmet` / `armour`) stay the gameplay state, the meshes only show them. Wren's guns
  (`WeaponModel` with the baked mesh) untouched: `weaponModel.ts` not changed.

**Expected saving.** The big one (perfg's gun, ~17 fewer active meshes per on-screen guard, ~400 at 24 facing, both
paths) is in 408ab154: at ~1.5-2.5 us per active instance (world matrix, frustum test, activation, instance buffer
fill, again per shadow pass that draws it) about -0.6 to -1.0 ms of active-mesh evaluation at 24 guards vs g8c. S13
proper adds -3 per armoured guard and -1 per S1 enforcer on the flag-off path only (~-0.1 to -0.2 ms with a fully
geared section of 24); 0 with the figures (already 2 a guard).

**Tests (one at a time).** tests/guardActiveMeshes.test.ts 5 new: flag-off grunt with gun + helmet + armour = 4 (body,
gun, helmet, armour), gear off = 2, enforcer = 5; flag-on = 2 (figure LOD, gun); the parts paths (rifle 18, pistolSd 7,
armour 4, shield 2); parity: merged armour (skinned at the joints' world matrices), shield and both guns' world bounds
equal their parts' union within 1 mm, full and low LOD, on a moved and turned rig; shared geometry between two guards,
own skeletons, no new observer / skeleton / mesh / geometry over 5 frames, a ragdoll re-parent frees the armour with
the body, the rig's dispose takes it and the other guard keeps the geometry. Unchanged and passing: guardFigure 21,
guardBody 16, guardAssets 34, enemyGunMerge 3, smoothBody 4, smoothBodyMerge 3, gearWiring 21, coopTorches 12,
coopGuardCarry 8, guardShieldShare 2, guardHelmetDrop 3, animGear 9, weapons 15. `npx tsc --noEmit -p .` clean; eslint
on the changed files clean. No e2e, no GPU, no full vitest.

**Laptop A/B.** (1) The 408ab154 cap run against g8c answers the gun: per-guard active meshes ON and OFF should drop
from 15-19 to ~2 (`active_guard_per_guard`; on 408ab154 the merged gun is in `other`). (2) S13's armour needs geared
guards, which guard-cap's spawn never gives: real section guards with gear, flag off, before / after at this head and
408ab154: `MAP=warehouseOps MODE=sector EXTRA=guardmodels=0 node scripts/perf.mjs --desktop --json` (E2E_GPU=1,
port 4189), reading active meshes and render() CPU. Files: src/ai/guardGearMerge.ts (new), src/ai/gearParts.ts,
src/ai/enemy.ts, src/net/enemyPuppet.ts (type only), src/player/smoothBody.ts, scripts/guard-cap.mjs,
tests/guardActiveMeshes.test.ts (new).
