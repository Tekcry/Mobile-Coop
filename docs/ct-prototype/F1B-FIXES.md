# F1b - menus, grab, strike, doors, goggles, course panels (CT prototype fix slice)

Branch `feature/ct-prototype`, nothing committed. Prototype (G4): every number is a starting value (G10). Protocol stays 16 (no wire change). Arms / hands / shoulders / `solveArm` / `AIM_POCKET` / `weaponPivot` untouched.

## Note ids

| id | verdict | what |
|---|---|---|
| course-2 | fixed | One optional panel at the start of each of the 8 stations (`sw-p1..8`, text in `PANEL_TEXT`); reading shows the text (banner, to the client through the course `ref`), no drill, no gate. Station 1 has no drill: the airlock pad is its step. Cause of "P1 couldn't read": the old drill text said `{Y:traverse}` but Y is jump since A3, so a pad host jumped; the read path itself (`press(cid, p)`, host = P1) was fine. |
| door-1 | fixed | Door and grab menu (`.hud-doormenu`) now top right, left of the minimap (history: the minimap is removed, G339; `right: sar + min(140px, 30vh) + 22px`, `top: sat + 14px`). |
| grab-1 / grab-2 | fixed | Grab menu keeps the operator walking (gear <= 2, existing `GRAB.maxGear`) with the guard in front. Menu pick moves on D-pad up / down (speed actions: also wheel and = / -); stick / arrow taps navigate only while standing still (`menuNavDir`). A picks. B (crouch / back) or Y always lets go (no way to get stuck). Door menu also accepts D-pad up / down. |
| grab-4 | partly | Holding a guard: X draws the sidearm over his shoulder, RT fires (existing hostage-shield code); passed through only while aiming (`GRAB_PASS`). Not run in a real pad session, only through the e2e grab flow. |
| strike-1 | fixed | Press with no guard in reach starts nothing (`StrikeController.fixedUpdate` / queued repeat check `pickTarget`). Reach 1.3 m, cone 140 deg (70 deg either side), contact slack +0.3 m for a guard who steps away (`STRIKE.contactSlack`), any side of the guard. |
| strike-2 / 3 | fixed | `anticipation` 0.1 -> 0.06, `hitAt` 0.12 -> 0.08, `recover` 1.4 -> 0.6 s (free 0.68 s after the press), `whiffRecover` 0.5 -> 0.3. |
| wall-2 | fixed | `WALL.slideStand` 0.35 -> 0.525, `slideCrouch` 0.3 -> 0.45 m/s (gear scale unchanged). |
| wall-3 | fixed (numbers) | Peek camera pivot swing 0.4 -> 0.75 m past the body, view turn 12 -> 18 deg; head offset unchanged at 0.35 m (what guards see). |
| door-2 | fixed (solo / host) | Stealth open is stick driven: in the peek, push opens by `driveStep` (`DRIVE_RATE` 0.2 swing / s at full push, dead zone 0.15, max 0.7), release holds the leaf (`Doors.drive`, `DoorState.held`), pull back lowers it to the crack, then the usual back-hold closes. Under `DOOR.driveShut` 0.15 it stays a crack (body, light, sight shut, G41); over it the door is a real opening (body gone) held with no swing. Interact still opens fully. **Stub:** the wire has no angle, so a co-op client keeps push-to-open and sees a held host door as open. |
| door-4 | fixed (needs a play check) | `StealthSystems.noticeOpenDoors` (4 Hz): a calm guard within 9 m, facing a door the player opened (open past 0.15) with a clear static ray, hears it at the door (`Enemy.hear`: suspicion, goes to look) and the door joins the doors guards shut after a calm patrol (G41, `DOOR_GUARD_CLOSE`). Player opens tracked from `Doors.onSound` (quiet, bash, drive). |
| gog-1 | partly | Flip now plays on turn on / off only (`VisionState.flipT`, `flipCentre`, 0.28 s; housing band covers at once and sweeps down on, up off); a switch between modes has none. Faint round lens outline: picture 30 % dimmer outside a circle (r 0.455-0.5 of screen height) plus a thin rim, while thermal / electro / night is on. GPU look pending PC run. |
| gog-3 | partly | Cannot verify on software GL. Likely causes addressed: ghost brightness 0.62 -> 0.72 (lands cyan-blue, not near-indigo), blob 0.65 x 1.85 x 0.5, the two sight rays now stop 0.2 m (was 0.12) either side of the leaf so an oblique door body does not suppress the blob. Pending PC run. |
| gog-4 | partly | Electro: live devices (bright pixels) get coarse noise, drifting scan lines and a stuttering dropout (cinematicPost, electro branch). Night vision review is not done. Pending PC run (GLSL compiles in e2e). |
| gog-2, menu-1, menu-3, turn follow | not | Out of this slice. |

## Files
Edited: `src/world/maps/ctcourse.ts`, `src/game/course/courseDef.ts` (`isPanelId`), `src/game/modes/courseMode.ts`, `src/styles.css`, `src/game/gameState.ts`, `src/game/grabMenu.ts` (`GRAB_PASS`, `menuNavDir`), `src/game/elbowStrike.ts`, `src/game/strikeController.ts`, `src/player/wallController.ts`, `src/config/camera.ts`, `src/world/doors.ts`, `src/game/stealthSystems.ts`, `src/game/vision.ts`, `src/vfx/cinematicPost.ts`, `src/vfx/doorGhosts.ts`, `src/vfx/visionLook.ts`.
Tests: new `tests/grabMenuNav.test.ts`; extended `ctcourse`, `doors`, `vision`; updated `elbowStrike`, `wallController`; scripts `e2e-ctcourse` (station 1: client reads the optional panel, nobody gated), `e2e-takedown` (contact timing), `e2e-pad` (no-guard press starts no strike), `e2e-wall` (shuffle 0.525, camera 0.6-0.8 m).

## Results
- `npm run check`: lint 0 errors, 147 files / 1639 tests pass, build ok.
- E2E (port 4193, one at a time, software GL): smoke, e2e-ctcourse (505 s), e2e-wall, e2e-darkness, e2e-takedown, e2e-netmove, e2e-pad all ok. First e2e-takedown / e2e-pad runs failed two assertions that encoded the old strike (contact after 0.12 s; a no-guard press starts a strike): updated, rerun green.
- Not run: e2e-coop, e2e-stealth-ai, e2e-mouse (they drive the door menu with arrow keys, which still navigate while standing still). GPU looks (flip, lens, ghost, electro fuzz) pending PC run.

## What Michael should try
1. `?net=local&autostart=ctcourse&mode=course`: each station has a panel at its start; walk past without reading, the airlock works.
2. Warehouse (`?autostart=warehouse&mode=clear`): door menu and Held menu sit top right. Grab a guard from behind, walk about, D-pad up / down to pick, X to aim the pistol, B to let go.
3. Walk up to a guard and press RT / LT: strike lands in about 0.08 s, free in 0.7 s; with nobody near, nothing swings.
4. Wall: shuffle is 50 % faster; peek the corner, the camera should show the other side. Tune `WALL_CAMERA.peek` in `src/config/camera.ts`.
5. Door menu > Stealth open: push the stick forward slowly, release to hold, pull back to close; walk a guard past an open one.
6. Goggles: D-pad left plays the flip, the wheel switching mode does not; check the lens ring, door ghost in thermal, electro fuzz on devices.
