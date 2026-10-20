# tuner-camera - camera sliders in the animation tuner

Michael (2026-10-21): "Can you include camera adjustments to the animation sliders too, so I can fine tune camera
locations too."

## What was built
- A **Camera (state)** section in the tuner (F3 > Anim, Pause > Animation tuner): a group picker per camera state that
  follows the current state while "follow" is on, sliders, per-slider / group / all reset, the same save, export, change
  log and pad control as Body and Gun (it is the third section of the section registry, `src/anim/tuneRegistry.ts`;
  API in `STATE.md`, "Section registry (for other jobs)").
- Under each camera slider a grey "today: ..." line: the value the game uses now in that state, read from
  `src/config/camera.ts` (`CAM_TODAY` in `src/anim/tune.ts`).
- Every slider is an offset (+0) or a multiplier (x1) on an existing value: at default the camera is the same to the
  bit (every use is `x + 0`, `x * 1` or `x / 1`, all exact in floating point; `max(0, castPad + 0)` is `castPad`).
- Hot path: `ShoulderCamera.update` calls `tuneCamStep` once per frame (selects the group, eases the preallocated
  `TUNE_CAM_CUR` toward its values at `CAM_EASE` 8 1/s, so a state change glides instead of popping; no allocation) and
  reads `TUNE_CAM_CUR` fields. At identity everywhere `TUNE_CAM_CUR` never moves.

## Groups and how they are picked (`selectCamGroup`, `src/anim/tune.ts`)
In order, the first that matches:
1. The camera's attach preset: `wall` -> **cam.wall**, or **cam.peek** while the wall peek (`ShoulderCamera.wallPeek`) is
   above 0; `duct` -> **cam.vent**; any other preset (hang, ladder, pipe, pipeH, pipeLegs, inverted, zipline, split,
   rappel, fence) -> **cam.climb**.
2. The body group (`TUNE_STATE.body`): `hold` -> **cam.hold**; `crawl` / `vent` -> **cam.vent**; `ladder` / `pipe` /
   `ledge` / `hang` -> **cam.climb**.
3. Aiming (`adsTarget` > 0): **cam.aimPistol** when the gun group is a pistol, else **cam.aimRifle**.
4. Crouched (`crouch` > 0.5): **cam.exploreCrouch**.
5. A weapon in hand (a gun group): **cam.lowReady**.
6. Else **cam.explore**.

## Sliders (code in `src/player/shoulderCamera.ts`, values in `src/config/camera.ts`)
| Slider | Kind, range | Changes (file:line) | Today |
| --- | --- | --- | --- |
| distance behind `camBoomAdd` | + m, -2..3 | `fr.boom` after the framing and the attach preset (shoulderCamera.ts:336); the peek's boom (:401). Before `minBoom`, the low space, the door pass and the casts | explore 1.8 tight / 2.8 open (camera.ts:13, :20), crouched open 2.2 (:21), aim 0.4 (:14), wall 2.0 (:200), peek 1.4 (:224), hang / ladder / pipe 3.5 / 2.0 / 2.8 (:177-181), duct 0.45 (:186) |
| height `camHeightAdd` | + m, -1..1.5 | `CAMERA.height`, the shoulder point over the pivot (shoulderCamera.ts:414) | 0 (camera.ts:56) |
| shoulder side offset `camSideAdd` | + m, -0.6..0.8 | `fr.shoulder` (:337; mirrors with the shoulder swap), the peek's open-side offset (:413) | explore 0.15 (camera.ts:40), aim 0.30 (:41), wall 0.15, peek 0.55, climb 0.05, duct 0 |
| look-at height `camPivotAdd` | + m, -1..1 | `fr.pivot` (:338) | stand 1.68, open 1.43 (camera.ts:46, :25), crouched 1.08 (:47), aim 1.52 (:50), wall 1.45, hang / ladder / pipe 1.1 / 1.5 / 1.5, duct 0.65 |
| FOV `camFovAdd` | + deg, -40..30 | `baseFovDeg` (shoulderCamera.ts:454) | 86 (camera.ts:131; the `video.fovH` setting) |
| aim zoom `camZoomMul` (aim groups) | x, 0.3..1.3 | `adsZoom` (:453) | x1, no zoom (G29) |
| transition blend time `camBlendMul` (not hold) | x, 0.2..4 | every camera blend in that state: aim in (:287), aim out (:290), open / tight (:322), the attach preset blend (:333), the peek in / out (:352) | aim in 0.6 s (camera.ts:62; the weapon sets it), off a wall 0.35 (:66); aim out 7 1/s (:63, shown on low ready); space 6 / 4 1/s (:29-30, shown on explore); preset blends 0.25-0.4 s; peek 0.35 / 0.3 s |
| follow damping `camFollowMul` | x, 0.1..4 | `stairRate`, the feet height low-pass (:341) | 14 1/s (camera.ts:73); XZ is rigid (G159), so there is no other follow lag |
| boom pull-in / ease-out rate `camBoomRateMul` | x, 0.1..4 | `boomIn` / `boomOut` (:434) | 16 / 4 1/s (camera.ts:93-94) |
| collision pull-in margin `camPadAdd` | + m, -0.04..0.4 | `castPad` (:431; never below 0) | 0.04 (camera.ts:85) |

## Visual only
- The collision stays: the sphere casts (head -> pivot -> shoulder point -> camera) run on the tuned framing, so the
  camera never goes through a wall whatever the sliders say; the boom is still `min(spring, cast)`.
- Perception, noise and the light meter never read the camera (unchanged). Light parity is untouched.
- The aim ray starts at the camera (`ShoulderCamera.aimRay`, now `gamePos`, the tuned game view) along `forward`
  (yaw / pitch, which the sliders never change). A tuned distance, height or side offset therefore moves the shot's
  start point with the view, parallel to the old ray: shots still go where the crosshair is (the screen centre), the
  hit point moves by at most the offset (under 1 m sideways at the slider limits), and the FOV and zoom sliders change
  nothing about where shots go. The crosshair's on-target check, the ping and the jammer pick read the same `gamePos`.

## Assumed decisions (undo)
- C1: one "today" line per slider, text only (undo: drop `notes` from `CAM_SECTION` in `src/anim/tune.ts`).
- C2: the camera values ease in at 8 1/s on a state change or a slider move, not instantly (the body tuner pops; a
  popping camera is hard to judge). Undo: `CAM_EASE` very large.
- C3: the transition blend time scales every blend running in the state, not only the state's own (one slider per
  group). Undo: per-blend sliders.
- C4: follow damping is the vertical rate only (XZ follow is rigid by G159, no value to scale); the boom spring got its
  own slider.
- C5: crouched while armed is `cam.exploreCrouch` (low ready is standing only); the hold uses the explore camera, so it
  has no blend slider. The door peek and the door pass keep their own framing (no group).
- C6: the group names carry a `cam.` prefix (the body section already has `lowReady` and `hold`).

## Free view (WIP, second pass)
Wired but switched off in this head: `src/player/freeView.ts` (pure, tested in `tests/freeView.test.ts`),
`ShoulderCamera.free` / `gamePos`, `GameState.freeInput` / `freeFrame`, the panel's hidden controls
(`FREE_VIEW_UI = false` in `src/ui/animTunePanel.ts`) and `TunePadCtl` mode `free`. Not reachable until the second pass.

## Files
- `src/anim/tuneRegistry.ts` (new): the section registry; edit, log, export, save.
- `src/anim/tune.ts`: Body, Gun and Camera registered; camera groups, sliders, today values, `selectCamGroup`,
  `tuneCamStep`.
- `src/player/shoulderCamera.ts`: the tuned values, `gamePos`.
- `src/game/gameState.ts`, `src/game/ctDevices.ts`, `src/game/gadgetSystem.ts`: gameplay reads `gamePos`.
- `src/ui/animTunePanel.ts`: sections from the registry, "today" lines.
- Tests: `tests/animTuneCamera.test.ts`; `scripts/e2e-menus.mjs` (a camera slider pulls the camera in, reset puts it back).
