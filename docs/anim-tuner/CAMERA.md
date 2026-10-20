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

## Pass 2 (2026-10-21)
Michael: "Can you also include a free view camera so I can view the animation from from any direction freely also?",
then his panel items (speed per state, freeze, full pad coverage, slider edit mode, a streamlined pad map), the barrel
marker bug ("ticking barrel marker turned half the screen grey"), smooth state changes, import, wider ranges, bypass,
slow motion in normal play and slider search.

### Free view (tools row: "free view", "demo", "hide HUD")
- **Orbit**: the view circles the player at a set distance: right stick / mouse orbit and tilt, LT / RT or the mouse
  wheel zoom (0.6-12 m), D-pad up / down (or Space / C) the height of the circled point. The player still moves with the
  left stick or WASD in the frozen game camera's frame, so in fixed world directions however the view circles, and keeps
  animating.
- **Fly**: a detached view: left stick / WASD move along the view, right stick / mouse look, LB / RB (or C / Space)
  down / up. The player stands and plays its state: idle, or the **demo** loop (walk, jog, run, crouch walk, aim strafe)
  walks a 2 m circle by a synthesised stick at the loop's speed (`demoInput`, the speed curve's stick magnitude).
- The game keeps running; the follow camera keeps computing the game view every frame (`ShoulderCamera.gamePos`), and the
  free view only places the rendered camera after it, so gameplay (aim ray, crosshair, ping, jammer pick) never reads it
  and turning it off gives the game view back exactly (position, rotation, FOV, follow state). The body fade is off while
  it runs (the whole body shows). The view moves in real seconds (slow motion and the freeze do not slow it).
- While it runs the free view owns the pad (the panel folds); View hands the pad back to the panel, B turns it off.
  None of the pad reaches the game except the left stick moving the player in orbit. On the keyboard the game gets
  only the orbit's WASD move.
- Code: `src/player/freeView.ts` (pure: orbit maths, the time-scale clamp, the demo loop; `tests/freeView.test.ts`),
  `GameState.freeInput` / `freeFrame`, `ShoulderCamera.free`. Hide HUD: `body.tune-hide-hud` in `src/styles.css`.

### Time
- **Game speed** slider (0.1-1x): the loop's `timeScale` (the fixed 1/60 s step stays; only the time fed to it shrinks).
  Slow motion in normal play and in the free view. Local only, never on the wire. Back to 1 on panel close and on a
  level load (`GameState` resets the loop).
- **Freeze**: when View hands the pad back to the tuner and "freeze on View" is ticked (default), time scale 0: the sim
  stops, rendering, the camera tuning and the free view go on, and a slider moved on the frozen frame shows at once
  (dt 0 applies the eased values at once). View to the game resumes. **Pause** / **Resume** freezes by hand; **Step**
  runs one 1/60 s sim step (`GameLoop.stepHeadless`) on a frozen game.
- In a co-op session the game speed, Pause, Step and the freeze are off, with a note (the local sim drives the session).

### Speed section (gameplay)
`src/player/speedTune.ts`, registered from its own file through the registry (after Camera). Multipliers (x1 default)
per state group, followed from the body group: **spd.stand** / **spd.crouch** (creep, sneak, walk, jog, run: the speed
curve's points `GEARS.stand` / `GEARS.crouch`, interpolated between them), **spd.aim** (the aimed glide's forward,
strafe and back weights: `MOVEMENT.adsSpeed`, `strafeMult`, `backMult`), **spd.wall** (`WALL.slideStand` /
`slideCrouch`), **spd.climb** (ladder, pipe up / along, ledge shimmy, duct crawl: `ATTACH.*.speed`). Each row shows
today's value. Read by the local player's own `PlayerController` (the free-movement speed target), the game's `WallCore`
and the local traversal's `AttachMachine`, with no allocation; the bypass reads x1. The section's note says it: these
are gameplay values on this machine only; tests and e2e use the defaults until the values are folded into them, and
in co-op the host clamps a tuned speed (the partner sees rubber-banding).

### The rest
- **Smooth state changes**: Body and Gun ease to a new group's values over `tau` 0.1 s (Camera 0.125 s) through the
  registry's `tuneSectionEase`; identity stays bit-exact.
- **Import** (tools and the Y menu): loads an `anim-tune-<date>.json` (file picker), see STATE.md.
- **Wide ranges (x2)** (tools and the Y menu): every slider's range doubled around its default, registry-wide.
- **Typed values**: each row's value is a number field (type, Enter); a pad edit focuses it so a keyboard can type too.
- **Bypass**: R3 held (pad) or Backquote held (keyboard) while the panel is open: every section reads identity (the
  untuned animation, camera and speed); releasing returns to the tune. No save change.
- **Search**: a text box filters the rows of every section by label or id (keyboard and mouse; the pad skips it).
- **Barrel marker**: no scene meshes any more (the grey half screen was the line and ball meshes in the render). The
  muzzle point and the point 12 m out along the bore are projected through the rendered camera (its position, Euler
  yaw / pitch and vertical FOV, never Babylon's view matrices, which must not be read before the render: the TAA ghost
  rule) onto a 2D canvas over the game canvas (`pointer-events: none`); hidden with no weapon or the muzzle behind the
  camera, the far end clipped to the near plane.

### Assumed decisions (pass 2; undo)
- P1. Orbit moves the player in the frozen game camera's frame (fixed world directions). Undo: rotate `FREE_IN.lx/ly` by
  the orbit yaw minus the game yaw in `GameState.freeInput`.
- P2. Speed is its own registry section with groups per stance (not rows in Body); zipline, rappel, fence and the sprint
  are not in it. Undo: drop `src/player/speedTune.ts` and its three call sites.
- P3. The freeze comes on only when View hands the pad back to the tuner (not on opening the panel); View to the free
  view keeps a freeze (orbit a frozen pose); only an automatic freeze ends on View to the game. Undo: `onPadToggled`.
- P4. Pad map changes against the brief: D-pad left / right also move the focus outside edit (as up / down); while
  editing LT is the fine modifier, so LT / RT switch state only outside edit; B outside edit closes the menu or does
  nothing; R3 is the bypass in the tuner and free modes only (in the game R3 is the zoom binding); the sections stay
  stacked and LB / RB jump between them (no tabs), so the mouse layout is unchanged.
- P5. Reset all by pad takes A twice (the mouse button keeps its confirm dialog, which a pad cannot answer).
- P6. Import by pad opens the file picker, but a browser may refuse it (a pad press is not a user gesture): use the
  mouse or touch then.
- P7. Co-op: the time controls are off with a note, not hidden.
- P8. The game speed slider (0.1-1x) replaces the 1 / 0.5 / 0.25 / 0.1 picker; the overlay's 1x button stays.
- P9. Import replaces every value (defaults first), it does not merge.
- P10. (Changed in the fix round.) Saves and imports clamp to the active range: a value set with "wide ranges" on
  comes back clamped to the normal range after a reload with it off.
- P11. The panel closes the free view, the freeze, slow motion, hide HUD and the bypass.

### Fix round (CHECK-CAMERA.md)
- B1: the sticky-cam remote view (`GadgetSystem.frameUpdate`) and photo mode write `ShoulderCamera.gamePos` after they
  place the camera, so the flash white-out, the jammer pick and the crosshair's on-target read the same point as before
  the branch. No other code moves the game camera outside `ShoulderCamera.update` (no death cam or cutscene camera).
- B2: the panel reads co-op live (`refreshCoop`) in `show`, every `frame` (folded too), `onPadToggled`, `setTimeScale`,
  `setFrozen` and `stepFrame`, so freeze, step and game speed never apply in a co-op session.
- Wide ranges: a multiplier's wide minimum never drops below a floor (0.05, or its own minimum when that is lower but
  above 0; 0 only when its own range allows 0), so no wide slider goes negative. Loads and imports clamp to the active
  range (P10), so a bad saved value cannot survive a reload.
- A pad disconnect (or no pad poll for 0.25 s) clears the free view's stick input.
- Import and load skip the `__proto__` / `constructor` / `prototype` keys; the pending store has no prototype.
- Polish: the free view off releases the demo's aim and crouch plainly (a later aim-strafe or crouch-walk demo works
  again); the Speed note says the co-op host clamps a tuned speed; the e2e marker check counts marker meshes by name.
- Tests: `tests/animTunePass2.test.ts` (the multiplier floor, the load / import clamp, the unsafe keys, source checks for
  the `gamePos` writers and the live co-op reads).

## Files
- Pass 2: `src/player/freeView.ts`, `src/player/speedTune.ts` (new); `src/anim/tuneRegistry.ts` (ease, flags, import, wide
  ranges), `src/anim/tune.ts`, `src/ui/animTunePanel.ts`, `src/ui/animTunePad.ts`, `src/core/loop.ts` (`realDt`),
  `src/core/app.ts` (co-op check), `src/ui/debugOverlay.ts`, `src/game/gameState.ts`, `src/player/player.ts`,
  `src/player/playerController.ts`, `src/player/wallController.ts`, `src/player/attach.ts`, `src/styles.css`; tests
  `tests/animTunePass2.test.ts`, `tests/freeView.test.ts`, `tests/animTunePad.test.ts`; `scripts/e2e-menus.mjs`.
- `src/anim/tuneRegistry.ts` (new): the section registry; edit, log, export, save.
- `src/anim/tune.ts`: Body, Gun and Camera registered; camera groups, sliders, today values, `selectCamGroup`,
  `tuneCamStep`.
- `src/player/shoulderCamera.ts`: the tuned values, `gamePos`.
- `src/game/gameState.ts`, `src/game/ctDevices.ts`, `src/game/gadgetSystem.ts`: gameplay reads `gamePos`.
- `src/ui/animTunePanel.ts`: sections from the registry, "today" lines.
- Tests: `tests/animTuneCamera.test.ts`; `scripts/e2e-menus.mjs` (a camera slider pulls the camera in, reset puts it back).
