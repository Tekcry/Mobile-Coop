# Campus perf fix: the guard render freeze (2026-10-23, Opus, branch feature/sector-redesign-perf off #226 8521bcbf)

Goal: campusOps inside the desktop budget (CPU p95 < 12 ms) with 20 / 24 guards. Target S5-worst at 24 guards
<= ~11 ms CPU p95.

## The verdict this answers (laptop, campus art 5504e2e3, Epic, 24 guards)
| View | CPU p95 24 guards | CPU p95 0 guards | GPU p95 24 |
| --- | --- | --- | --- |
| S4-worst | 12.4 | 6.7 | 8.27 |
| S5-worst | 15.6 | 7.4 | 9.42 |
| S3-worst | 14.5 | 7.0 | 8.75 |
guard-cap campus 24 facing: CPU p95 17.8 patrol / 19.7 alert, draws 541 / 589. The raw files
(`scratch/work/campusart-5504e2e3/views.json`, `guard-cap/RESULTS.md`) are not on this machine; numbers are from the
brief. Overage = the guards, ~0.28-0.34 ms CPU each.

## Cause (where a guard's CPU goes)
Sources: guard-render's laptop guard-cap runs in the repo (`docs/guard-render/run-s6-on`, `run-s4-on` in 7f4bb197) and a
NullEngine micro-benchmark on this branch (24 grunts, merged body, rifle, 4 shadow passes; desktop under load, so only
the ratios count; the probe file was not committed).
1. The AI is not it. Sim per 60 Hz step per guard (Sector Ops, laptop): AI manager 0.004 ms, perceive 0.001 ms,
   rays ~0.2 per guard per step. The whole brain is < 2 % of a guard's cost.
2. Off screen costs almost as much as on screen. Sector Ops 24 guards, laptop: frame CPU per added guard `patrol/away`
   (all culled from the main pass) 0.229 ms vs `patrol/facing` (12 in sight) 0.246 ms. In `away`, render() CPU
   +0.19 ms per guard and active-mesh evaluation +0.12 ms per guard (3.3 ms at 24 vs 0.4 at 0): a culled guard is still
   evaluated and drawn into the shadow maps.
3. Why: per guard per frame
   - the rig animates (`Enemy.frame` -> `CharacterRig.animate`, every frame here; S4's off-screen anim tier is on
     master, not on this branch): bench 59 us; laptop `ai.anim` 1.295 ms / 24 = 54 us before S4;
   - the active-mesh evaluation recomputes the world matrix and bounds of the merged body and of the gun's 18 part
     instances (each under the hand chain the anim just moved), culled or not: bench ~80 us;
   - every shadow map with him in its list (the moon's cascades, lamp / flashlight spots) prepares his skeleton
     (`SmoothBody.pose`: ~50 node world matrices) and draws him; shadow lists are never frustum-culled: bench ~75 us at
     4 passes with no GL cost; on the GPU each skinned draw adds its submission (campus 541 draws at 24 vs Sector Ops 239:
     the outdoor guards cast into the moon cascades).
4. Why campus: at the worst views almost every guard is in the frustum, just behind walls. Frustum test at the A99
   worst views (camera at the player's eye, 86 deg, the section's guards at their spawns): S5 0 of 24 outside the
   frustum, S4 5 of 20, S3 4-5 of 16. Babylon has no occlusion culling, so all of them pay the full on-screen cost
   (main pass, gBuffer / TAA, shadows) although the A99 sight test sees only 6 / 7 / 6.

## Fix: the guard render freeze (render only)
A guard whose body and shadows cannot reach the screen is disabled (rig root) for that camera pass, and thawed as soon
as either can. Disabled meshes skip the active-mesh evaluation, the skeleton prepare and every shadow draw.
- Pure rules, `src/game/sectorGuardFreeze.ts`:
  - `FREEZE` (:21): body sphere radius = height / 2 + 1.3 m (the merged body's rest box pads 1 m sideways, hands, gun);
    moon shadow extruded down to 9 m below the feet; never frozen within 2 m + radius of the camera.
  - `guardFrustum` (:109): DRAW when a shadowing spot / point light in range has its reach sphere in view (his shadow can
    be anywhere in it), or the lights are unknown (more than 16 shadow lights, two suns); else bits: body sphere in the
    frustum, moon shadow capsule (`sunShadowLength`, :94) in the frustum. 0 = frozen.
  - `occlusionPoints` (:146): the points the camera must not see: 0.15 m over the head, the chest, the chest 1.2 m either
    side across the view (`FREEZE_SIDE`: a guard about to step out of a corner is drawn first), and where the moon
    shadow of his middle and head falls on his floor.
- Scene side, `src/game/sectorGuardFreezeView.ts`: `step` (:65) runs on `onBeforeActiveMeshesEvaluationObservable`, so
  it uses this frame's camera frustum (no pop when the view turns) and shadow maps of the same pass see the same state.
  Frustum part every evaluation; occlusion by camera rays (`occluded3`, :136) to every sample point against
  `G.STATIC` (walls, floors, closed door leaves; glass, frosted glass and fences never hide a guard): a hidden verdict
  is re-tested every `RETEST` = 4 evaluations (staggered by guard), at once after a camera cut (> 0.75 m in one
  evaluation, or another active camera: a remote view); a guard found visible stays drawn `HOLD` = 24 evaluations. Only
  guards it disabled are ever re-enabled (a script that hides a rig keeps it hidden); a frozen guard that dies, is
  taken or despawns is thawed at the next evaluation; `dispose` thaws all. Dogs (their humanoid rig is hidden by the
  enemy) are never touched. `readLights` (:165) reads the scene's lights each frame (no cache to go stale).
  Allocation-free per frame (typed arrays, two kept vectors, module-level helpers).
- Wiring: `src/game/modes/sectorMode.ts:226` (start: `new SectorGuardFreeze(g.scene, em, ray)`, ray =
  `g.ballistics.hitDistance(a, b, G.STATIC)`), dispose thaws, `debug()` gives `guardFreeze` (frozen now),
  `guardFreezeOccluded`, `guardFreezeRays` (:1018-1020). Flag `src/core/flags.ts:63/130` `guardFreeze`
  (`?guardfreeze=0` off). Applies to every Sector Ops map (campusOps and warehouseOps), host / solo; a co-op client's
  guard puppets are not touched.
- Hard rules: gameplay reads none of it (brains, perception, torches, hit volumes and the light field use the sim
  position; guard-render S4's grep of every `.rig.` reader); the rig keeps animating, so a thawed guard shows his current
  pose; light parity unchanged (guards' shadows are not read by the light meter or perception). No `src/ai`, `src/net`,
  PROTOCOL or save change. Nothing in `scripts/` changed.

Known visual edges (render only, all short):
- A guard who steps out from behind a wall more than 1.2 m sideways within one re-test period (4 frames, ~33 ms at
  120 fps) is drawn up to that late; a door that opens on a hidden guard shows him up to 4 frames late.
- A lamp shadow-slot list is refilled every 0.25 s from mesh bounds; a frozen guard's bounds are stale, so a guard who
  walks into a lamp's range while frozen and is then thawed casts that lamp's shadow from the next pick (<= 0.25 s), as
  any moving guard already does between picks.
- Shadow maps refreshed every Nth frame by the governor: a thawed guard's shadow appears at that map's next refresh.

## Expected savings (estimate; not measured on a GPU)
Frozen guards at the worst views (`guardFrustum` + `occlusionPoints` rays against the undressed greybox, glass left
out; camera at the player's eye; spawns, and every route point in brackets):
| View | Guards | Frozen at spawns | Route points frozen |
| --- | --- | --- | --- |
| S3 (50.25, 0, -12.75) f259 | 16 | 13 (8 by occlusion) | 76 % |
| S4 (26.75, 4.4, 30.75) f270 | 20 | 16 (10) | 81 % |
| S5 (-50.25, 3.0, 62.25) f158 | 24 | 16 (16) | 64 % |
(The same with the 2.8 m boom: S3 16, S4 16, S5 17.)

Per frozen guard: before ~0.34 ms (S5: (15.6 - 7.4) / 24; all 24 are in the frustum, so all pay full cost); left after
the freeze: anim ~0.054 (every frame on this branch) + sim ~0.005 + candidate scan ~0.005 + rays (~6 per hidden guard
per 4 frames, ~3-5 us each) ~0.006 = ~0.07 ms. Saving ~0.27 ms per frozen guard. The bench agrees in ratio: 24 off-screen
guards 254 -> 137 us each, the rest being the anim the bench runs every frame.
- S5-worst 24 guards: 16 frozen x 0.27 = -4.3 ms -> ~11.3 ms p95 (17 frozen: ~11.0).
- S3-worst: 13 x ~0.24 (7.5 / 24 + residual) = -3.1 -> ~11.4 ms; S4-worst: 16 x ~0.17 = -2.7 -> ~9.7 ms.
- With guard-render S4 (master 4.75, anim tiers: a frozen guard counts as off screen, anim every 4th frame) merged
  in: another ~-0.04 ms per frozen guard: S5 ~10.6, S3 ~10.9.
- guard-cap campus 24 `facing` (all 24 spread in front of the camera, open ground): little change, the frustum and
  rays see them all; `away` should drop to near the 0-guard base.

## Proposals for guard-ai / guard-render (not done here)
1. guard-render S4 (`src/ai/animTier.ts`): a FROZEN tier. A disabled rig root already reads as off screen (anim every
   4th frame); while `bodyRig.root.isEnabled(false)` is false, skip the solve entirely (carry dt, capped at ~0.1 s for
   the thaw solve). ~-0.05 ms per frozen guard on top of the freeze. Isolated: `Enemy.frame` passes the tier's
   `solveDt`; the rule reads the root flag only.
2. `src/ai/enemyRig.ts:22`: the guard's gun is 18 instanced parts (each evaluated, bounded and instanced per pass,
   ~70 us per visible guard in the bench: 6.2 -> 4.0 ms at 24 facing with the gun parts off). Give guards the baked
   weapon mesh (`new WeaponModel(..., { mesh: true, caster })`, as the player's weapons) or merge the parts into the
   smooth body. Look change (baked texture vs ENEMY_GUN colours): needs the look owner's OK. Helps the facing cells.
3. `src/ai/enemy.ts:393` a dog's hidden humanoid rig still animates every frame (`frame` -> `rig.animate`): skip it for
   dogs.

## Laptop rerun (Test Runner; `npm run build` on the branch head first; 4189, the GPU slot alone)
The views (the same harness that wrote `views.json`; perf.mjs has no view option), 24 guards, Epic, A/B by URL flag:
S3 (50.25, 0, -12.75) facing 259, S4 (26.75, 4.4, 30.75) facing 270, S5 (-50.25, 3.0, 62.25) facing 158; once as is,
once with `&guardfreeze=0`; log `window.__sector.debug().guardFreeze`, `guardFreezeOccluded`, `guardFreezeRays`.

perf.mjs on campus (the MAP / MODE env select it; the "Warehouse" name and `map: 'warehouse'` in its output are
hard-coded labels in `scripts/perf.mjs`, which is why the last run printed "warehouse"; check the URL in the log):
```
E2E_GPU=1 E2E_PORT=4189 MAP=campusOps MODE=sector node scripts/perf.mjs --desktop --json
E2E_GPU=1 E2E_PORT=4189 MAP=campusOps MODE=sector EXTRA=guardfreeze=0 node scripts/perf.mjs --desktop --json
```
guard-cap campus 24 (its `campus` alias is `autostart=campusOps&mode=sector&sectorGuards=0`; compare with the 17.8 /
19.7 baseline, the script takes no extra URL flag):
```
E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=campus --counts=0,24 --cells=patrol,away,alert --out=docs/sector-redesign/perf-freeze
```
Pass: S5-worst CPU p95 <= ~11-12 ms at 24, S3 / S4 under 12; `away` near the 0-guard base; GPU unchanged or lower.

## Checks run (desktop, single files under sr-slot locks)
- `npx tsc --noEmit -p .`: clean. eslint on the changed files: clean.
- New: `tests/sectorGuardFreeze.test.ts` 11/11 (frustum, capsule, shadow length, lamp / overflow, bits, points),
  `tests/sectorGuardFreezeView.test.ts` 4/4 (NullEngine: freeze / thaw on turn, death, others' hidden rig kept, lamp in
  view, occlusion with a fake wall, re-test period, camera cut).
- Kept green: s6CloseOn 3, sectorDesk 18, sectorGuardTags 20, sectorItemScope 5, sectorKeypad 19, sectorStageActions
  19, sectorRestart 8, smoothBody 4, sectors 27. Campus data untouched (campusS* not rerun).
- Not run (as ordered): e2e, perf.mjs, guard-cap. e2e that should cover it: sectorops, smoke, stealth-ai.

## Fix round (2026-10-23, Opus; answers `campus-perf-check.md` FAIL)
Shape: the checker's option (b), generalised. The freeze's occlusion ray steps past a `G.STATIC` hit the camera sees
through and casts on; every gameplay ray (guard sight, shots, light field, meter) keeps `G.STATIC` whole and never
calls it. When unsure the point counts as seen (more than `SEE_THROUGH_SKIPS` = 6 see-through hits in a row, or a
step past the target), so the error is a guard drawn needlessly, never one missing.
- `seeThroughRay` (`src/game/sectorGuardFreezeView.ts:61`): one closure made at start, allocation-free per call; casts
  through the new render-only `Ballistics.cast` (`src/weapons/ballistics.ts:94`, the shared result, nothing resolved);
  a see-through hit restarts the cast 0.05 m past it. Wired at `src/game/modes/sectorMode.ts:229-235` with
  `see = doors.seeThrough || breakables.seeThrough || inSheet`.
1. Door peek (blocking 1): `Doors.seeThrough(body)` (`src/world/doors.ts:333`) and the pure `leafSeeThrough`
   (`:410`): a leaf whose body is up and is cracked, drawn ajar (`ajar > 0`, also the easing crack and a stick drive
   under `driveShut`) or swung (`open > 0`) is see-through. The body, `open`, the light field and guard sight are
   unchanged (A25 holds). A guard frozen behind the shut door is drawn by his next re-test after the crack (<=
   `RETEST` = 4 evaluations, about the crack's first frames of its 0.6 s ease).
2. See-through panes (blocking 2): unbroken breakable glass, `Breakables.seeThrough` (`src/world/breakables.ts:128`,
   a set of the glass bodies filled at build `:117`, emptied when a pane breaks `:147` and on dispose `:170`; grates
   stay opaque). Roof sheets: they live in the level's one static container body, so the hit is told by its point,
   `inSheet` (`src/world/roofSheets.ts:30`, the sheet's collision box + 0.05 m); `SheetPiece` now carries the box's
   `y0` / `y1` (`src/world/levelBuilder.ts:522`) and `BuiltLevel.sheets` exposes them (`:131`, `:757`).
3. Unload / restart release (polish 4): a frozen guard is dropped (and re-enabled if his root still exists) when his
   root is disposed or he is no longer in the manager's list (`sectorGuardFreezeView.ts:134`; `Enemy.dispose` keeps
   `alive`). `indexOf` over <= 24 guards per frozen guard per evaluation, no allocation.
4. Ray budget on a camera cut (polish 3): at most `TESTS_PER_EVAL` = 8 guards get an occlusion test per evaluation
   (`sectorGuardFreezeView.ts:38, :165`); a guard waiting for his test is drawn meanwhile. A cut now costs <= 8 x 6 =
   48 rays per evaluation (plus a recast per see-through hit) instead of up to 144 at once; 24 hidden guards are all
   re-tested within 3 evaluations. Normal staggered re-tests (24 / 4 = 6 a frame) never hit the cap.
5. Report correction: the rig is animated every frame while frozen (`Enemy.frame` -> `CharacterRig.animate`, nothing
   in the freeze skips it; checker answer 1). Nothing in this report or the change claims "rig not animated"; that
   wording was in the brief. Freezing saves the active-mesh evaluation, the skeleton prepare and the shadow / main
   draws only; the ~0.054 ms per guard anim stays in "left after the freeze" above.
Estimates, honest: the spawn / route counts above were made with glass left out of the occluders and no doors modelled,
so the see-through rule does not lower them for panes; door leaves (shut in the count's greybox) can only free fewer
guards than counted wherever a door stands cracked / ajar / swinging, and a peek now draws the room behind it (as it
must). Expect the S3 / S4 / S5 numbers above as an upper bound on the saving; each see-through hit adds one cast
(~3-5 us). Still not measured on a GPU (the laptop rerun above stands).
Not done (polish, not asked): 1 (memo reset on frustum re-entry), 2 (knee point), 5 (moon shadow off a roof edge),
6 (forced-neck NullEngine test).

Tests (desktop, single files under sr-slot-1): `npx tsc --noEmit -p .` clean; eslint on the changed files clean.
New `tests/sectorGuardFreezeSeeThrough.test.ts` 6/6: leaf rule + `Doors.seeThrough`; `inSheet`; Havok rays (real
`Ballistics.cast`, NullEngine): shut door occludes, cracked door / unbroken pane / roof sheet pass, solid wall
occludes, gameplay `hitDistance` still stops on the pane and the cracked leaf; Havok freeze: guard behind a shut door
frozen, cracked -> drawn within `RETEST`; release on list removal and on dispose; cut budget <= 8 x 6 rays.
Kept green: sectorGuardFreeze 11, sectorGuardFreezeView 4, sectors 27, sectorRestart 8, sectorGuardTags 20, smoothBody
4, smoothBodyMerge 3, doors 9, doorPeek 15, doorPeekParity 1, doorOpen 4, warehouseLamps 12. No breakables test file
exists. No e2e (as ordered).
