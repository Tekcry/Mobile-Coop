# Slice A - playtest 2 fixes (2026-10-19)

Scope: `PLAYTEST-2.md` slice A. Built by a Sonnet implementer (cut off at the 11:45 clear), finished by the CT Core session.

| Note (Michael) | Change | Where |
| --- | --- | --- |
| D-pad up / down should be walk speed; speed 2 the slowest | D-pad up / down already set the speed (`speedUp` / `speedDown`). Five speeds re-spaced from the old speed 2: standing 0.75 / 1.4 / 2.1 / 3.0 / 4.2, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s. The stick reaches the D-pad speed from 0.9 of its travel (`GEARS.fullPush`). Silent bands kept: standing 1-2, crouched 1-3 (`NOISE_QUIET` crouch 1.9, stand 1.65: headroom for the stride swell). | `src/config/movement.ts`, `src/player/speedGears.ts` |
| ADS 70 % less sensitive | `adsMultiplier` 0.3 (pad and mouse); a saved old default (0.55 / 0.6) moves to 0.3, custom values kept. | `src/core/settings.ts` |
| Corner peek backwards | The wall camera's shoulder side is read in the camera's frame (the free camera faces the wall, so the body's left is the camera's right). | `src/game/gameState.ts` |
| Shoulder defaults right when aiming; follow camera stays right | The wall's open side now becomes the shoulder, so leaving the wall or aiming off it keeps that side. An aim swap already carried back within a session (measured; unit test for both); the last swap is now saved as `gameplay.defaultShoulder`, so the next mission starts on it (that reset was the real bug). | `src/player/shoulderCamera.ts`, `src/player/player.ts`, `src/game/gameState.ts`, `tests/cameraRigid.test.ts` |
| Shoulder swap while aiming flicks up | The sight raise is carried down with the hand swap's tuck (`sightPos`), so the gun no longer jumps high at the swap mid-point (excursion +13 cm -> +4 cm); camera swap arc 0.45 -> 0.3 m (`src/config/camera.ts`). | `src/anim/animGraph.ts` |
| Back to wall snaps from too far and slides | Entry reach 0.9 -> 0.5 m; settle 0.14-0.24 s (was 0.2-0.45). | `src/player/wallController.ts` |
| Footsteps too loud vs the noise meter | Own footstep volume follows the emitted noise radius: 0.07 silent to 0.42 loudest run (was a flat 1). | `src/player/movement.ts` (`stepVolume`), `src/audio/gameAudio.ts` |
| Bobbing while walking | **Not fixed.** The camera is rigid (camera y constant while walking, measured); the chest bobs about 10 cm peak to peak at speed 3 from `pelvisDrop` in the rig's leg geometry. A pelvis low-pass had no effect and was removed. Moved to slice B+C (legs). | - |

All values are starting values (G10).

## Tests
- Unit: `stepVolume.test.ts` (new), `cameraRigid.test.ts` (shoulder carry), `speedGears`, `analogGear`, `wallController`, `animAudit` updated.
- e2e: `e2e-move` (new speeds), `e2e-wall` (no entry from 0.7 m, entry within 0.5 m), `e2e-pad` (stick 50 / 80 / 100 % = speeds 2 / 4 / 5). The corner-takedown loops in wall and pad skip a guard spawn the level moved more than 0.5 m (appeared with the shorter reach; root cause not found).
- 2026-10-19 13:15-13:35, port 4193, one at a time: `npm run check` green (0 lint errors, 1747 unit tests, build); smoke, e2e-move, e2e-wall, e2e-pad, e2e-foley pass. e2e-ctcourse: stations 1-6 pass (station 2 legUp, which hangs on master bd59f32, passes here), then the 600 s suite cap stops it at station 7 (a timeout, no failed assert).

## Not verified
- The peek direction is not visible to unit tests; try them on /ct/: back to a wall, shuffle left and right
  to each edge (the camera should swing to the side you move to).
- Remotes still see the weapon in the right hand on the left shoulder (no aim side on the wire; stub from F1a).
