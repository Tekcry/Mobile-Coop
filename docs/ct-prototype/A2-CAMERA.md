# A2.1 - Cleanup and camera core (CT core feel job)

Branch `feature/ct-prototype`, nothing committed. Michael's rulings: "Camera doesn't automatically adjust/move at all in CT, it's manually controlled." Camera: "Rewrite core". Round: "Cleanup + camera". Every number is a starting value (G10).

## Built

**Cleanup**
- Auto recentre deleted: `Player.recentre()` and `lookIdleT` (src/player/player.ts), `MOVEMENT.recentreDelay / recentreRate` (and the matching `ENEMY_MOTION`, `ENEMY_CALM_MOTION` ranges). `settings.gameplay.autoRecentre` is now read by nothing (inert).
- Aim assist deleted: `src/weapons/aimAssist.ts`, `GameState.applyAimAssist` / `assistScale` / `prevAds` and the call in `frameUpdate`. `settings.gamepad.aimAssist` is now read by nothing (inert).
- `PlayerController.stepAssist` is the STEP-UP helper (maxStep 0.42 on stairs and kerbs), not aim assist. Deleting it would break stairs (e2e-move step / stair checks pass with it). Kept, rewritten allocation-free: preallocated vectors, ray result and query, `raycastToRef`. This fixes the hot-path allocation the review flagged.
- Camera look-ahead, follow springs (`camFollow`), pace boom, dash boom / FOV, cover boom, handheld drift, impact bob, ADS zoom: all removed from `ShoulderCamera`. `MOVEMENT.camFollow / camShoulder / camAds` removed (moved to `CAMERA`).
- Player no longer sets `cam.cover / steady / pace`; those fields are gone.

**Camera core** (`src/player/shoulderCamera.ts` `update()`, `src/config/camera.ts`)
- Rigid follow: pivot XZ = the character's interpolated position exactly; no spring, lag, look-ahead, drift or swing. Camera = pivot + fixed offset along the view. It moves only by right stick / mouse.
- Only the feet HEIGHT is low-passed (`CAMERA.stairRate` 14/s) so stair steps do not shake the view (review risk). This is the one filter left; set it huge to make it fully rigid.
- Pivot = head height from the shared capsule (`MOVEMENT.standHeight` 1.75 / `crouchHeight` 1.15, G38), tied to `crouchBlend` directly (no spring).
- Shoulder swap only while aiming (`Player.fixedUpdate`, G17).
- No zoom while aiming (G29): `adsZoom` is 1; `playerWeapons.applyAimCamera()` sets the zoom only for weapons with a scope part (marksman scope unchanged).
- Kept: sphere casts head -> pivot -> shoulder -> camera, low-space probes, near plane, door peek eye and FOV mul, wall attach presets, wall peek (lean is the wall job's), trauma shake, `addLook`, `kick`, `snap`, body fade, class API.
- Default pitch at spawn -0.3 rad (`CAMERA.startPitch`), the measured ~17 deg down.

**Aim timings (G103)**
- `DRAW_TIME_SIDEARM` 0.6, `DRAW_TIME_PRIMARY` 0.75, `HOLSTER_TIME` 0.55 (was 0.3 / 0.4 / 0.4).
- `CARRY.raiseTime` 0.8 (x weapon weight: pistol 0.56, rifle 0.8, trigger live at 85 % of the raise, about 0.5 / 0.68 s), `lowerTime` 0.55 flat (was 0.16 / 0.3, weight scaled).
- Aim camera blend: linear in over `adsInTime` = 0.9 x the weapon draw time (0.54 s pistol, 0.675 s rifle, camera leads the gun), exponential fast-out `adsOutRate` 7 (half way in 0.1 s, 95 % in 0.43 s).

## Numbers and sources

| Value | Used | Source |
|---|---|---|
| Explore boom | 1.8 m | ct-measure-camera 1.2 (1.8 +- 0.25) |
| Explore lateral | 0.15 m to the shoulder side | 1.2 (0.1-0.2) |
| Pivot / look-at | head height 1.75 m (capsule), crouch 1.15 | 1.2 (head top on frame centre), G38 |
| Camera height | pitch-driven: 1.75 + 1.8 sin(17 deg) = 2.28 m | 1.2 (~2.3 m) |
| Default pitch | -0.3 rad (17 deg) | 1.2 |
| Aim boom / lateral | 0.4 m / 0.16 m | 2.2 (0.4 +- 0.1, 0.16 +- 0.05) |
| Aim eye height | pivot drops 0.08 m | 2.2 says eye height to head top; the 0.08 is MY STARTING VALUE |
| Aim FOV | unchanged | 2.2 (0 to -10 %), G29 |
| Aim in / out | 0.54-0.675 s linear / half in 0.1 s | 2.3 (0.6 / 0.75 in, 0.5-0.6 out fast-out), G103 |
| Shoulder swap | spring 13/s (about 0.4 s), +0.45 m pull-back at mid-point | 3 (0.40 pistol / 0.43 rifle, ~0.85 m at mid-swap vs 0.4 rest) |
| Wall camera | unchanged (`ATTACH_FRAMING.wall`) | later job |

Starting values not from footage: `aimEyeDrop` 0.08, `stairRate` 14, the camera = 0.9 x draw time, `lowerTime` 0.55 / `HOLSTER_TIME` 0.55 (mid of 0.5-0.6). Not done (weapon side): the weapon does not yet cross the chest during the swap (wire has no aim side, review section 3 item 7 / section 7), explore side after a swap stays on the swapped side.

## Files
Edited: `src/player/shoulderCamera.ts`, `src/config/camera.ts`, `src/config/movement.ts`, `src/player/player.ts`, `src/player/playerController.ts`, `src/game/gameState.ts`, `src/weapons/{drawState,weaponCarry,playerWeapons}.ts`, `src/ui/debugOverlay.ts` (camera tuning rows). Deleted: `src/weapons/aimAssist.ts`. New: `tests/cameraRigid.test.ts`. `framing()` signature is now `framing(ads, crouch)` (the dash arg is gone).

## Leftovers for the menu job (src/ui/screens/settingsScreen.ts, not edited)
- Row "Aim assist" (line ~132, `gamepad.aimAssist`) does nothing now.
- Row "Camera recentres behind you while moving" (line ~188, `gameplay.autoRecentre`) does nothing now.
- Both settings keys still exist in `core/settings.ts` (and their tests) so saves and the screen compile; remove the rows, then the keys and the `AimAssistLevel` type.
- Also still unused or off: `sprintHold` row (review).

## Tests changed
- Unit: removed the aim-assist block in `weapons.test.ts`; `motion.test.ts` ENEMY pin without the cam / recentre keys; `tactical.test.ts` framing test rewritten to CT numbers, raise tests to 0.55-0.85 s (the trigger time) and the lower; new `cameraRigid.test.ts` (offset to the character constant to 1e-6 while accelerating, running, stopping dead; 1.8 m and 2.3 m height; aim 0.6 s and no FOV change; fast-out).
- E2E scripts (timing and framing only): `e2e-anim` camera block (rigid lag <= 20 ms, swap needs aim, 0.45-0.8 s aim blend, draw / raise / lower windows), `e2e-camera-bounds` (yard reference = new framing), `e2e-pad`, `e2e-mouse`, `e2e-wall`, `e2e-takedown`, `e2e-gadgets` (flash test stands at z -2.2: at -4 the rigid camera sits behind a one-sided wall, the same camera-behind-wall issue the old shoulder offset hid), `e2e-ct` (waits for the longer draw, default pitch -0.3 in its teleport so world prompts stay on screen).

## Checks
- `npm run lint`: 0 errors (41 pre-existing warnings). `npx vitest run`: 130 files, 1462 tests pass (one earlier run timed out 13 voxel tests under load; clean on rerun). `npm run build`: ok.
- E2E, port 4193, one at a time: pass: smoke, e2e-move, e2e-netmove, e2e-pad (solo, after fixes; earlier failures were my timing changes), e2e-mouse, e2e-anim, e2e-wall, e2e-takedown, e2e-gadgets, e2e-combat, e2e-weapon-audio, e2e-weapons-carry, e2e-tactics, e2e-enemies, e2e-bunker, e2e-modes, e2e-course.
- Fail, all pre-existing (confirmed by running a `git archive HEAD` copy of the branch before my change): e2e-camera-bounds "level U crouched walk" (camera "below the floor", the player is below the level); e2e-stealth (page.evaluate TypeError in the camera orbit check); e2e-traverse (sprint-removed asserts); e2e-stealth-ai ("sprinting into a door bashes it"); e2e-ct "sprint held: a fast descent" (sprint removed in M1); e2e-clear ("Warehouse default for Mission / Hunter" menu text). e2e-coop: known open "client strike denied" (known flaky list).
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows modified in git status: line endings only (empty diff).

## What Michael should try (`?autostart=warehouse&mode=sandbox` or any map)
1. Walk, run, stop, stand: the camera never moves except with the right stick / mouse. No lag, no settle, no swing, nothing recentres. Head at screen centre, legs partly out of frame at the default view.
2. Hold aim: the camera slides in over the firing shoulder in about 0.6 s with no zoom; the pistol comes up after the camera. Release: it snaps most of the way back in 0.1 s. Marksman scope still zooms.
3. While aiming, tap shoulder swap (R3 / bound key): about 0.4 s arc back through a pulled-back point. Not aiming, it does nothing.
4. Walk up stairs: the view should stay steady (only height is smoothed). Tune `CAMERA.stairRate` in the debug overlay Camera table (also `aimEyeDrop`, `adsInTime`, `swapRate`, `swapArc`, boom and shoulder).
5. Check: back against a wall / low ceiling still pulls the camera in (casts are unchanged); a wall directly behind you with the camera behind it can show through, only the one-sided-face limitation already in the casts.
