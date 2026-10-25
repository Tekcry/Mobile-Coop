# ghost-fix - diagnosis (2026-10-20, code read only; GPU strips pending: `scripts/archive/ghost-strip.mjs`)

Michael: "The graphics have also had ghosting too, set to epic preset" ... "I think it was when aiming/holstering".

## Verdict
Epic is the only preset that runs Babylon's `TAARenderingPipeline` (Epic: `aa: 'taa'`, render scale 1, upscaler off;
Low-Ultra presets run the custom TAAU instead). It is built with no history clamp and no reprojection, and while the
player aims the game marks the camera as "not moved" every frame, so TAA blends 92% unreprojected, unclamped history
over a moving view. That is a full-screen ghost exactly while aiming, and trails on the arms and weapon on every draw
/ holster.

## Ranked causes

### 1. Aiming hides camera motion from TAA (the main ghost)
- `src/game/gameState.ts:2667-2673` `updateCinematic`: while `player.ads`, `cam.getDirection(...)` is read for the depth
  of field focus. It runs in `frameUpdate` (`gameState.ts:2032`), before `scene.render()` (`src/core/loop.ts:144-145`).
- Babylon: `Camera.getDirection` -> `getWorldMatrix` -> `getViewMatrix()` (`camera.pure.js:660-667, 1124`) recomputes
  the view and syncs the cache. Then `scene.render` -> `camera.update()` sets `_hasMoved = false` and its own
  `getViewMatrix()` sees a synced cache, so `hasMoved` stays false (`camera.pure.js:549-555, 670-681`).
- `ThinTAAPostProcess.bind` uses factor 1 (history reset) only when `camera.hasMoved` (`thinTAAPostProcess.js:197`).
  With `hasMoved` false the blend stays 0.08 while the camera pulls in to the shoulder, pans with the aim, sways, and
  swaps shoulders: the old frames stay on screen for ~25 frames (0.92^25 = 0.12).
- The same trap was already hit and fixed once for night vision (`src/vfx/nightAutoGain.ts:9-11`, 2026-10-09: it now
  reads the camera from `onBeforeCameraRenderObservable`). The DOF focus read was missed (it dates from 3.0).
- Not aiming: no read, `hasMoved` is honest, TAA is skipped on every moving frame, no ghost. That is why it shows "when
  aiming".

### 2. Babylon TAA at Epic has no clamp and no reprojection (trails on the moving arms / weapon)
- `src/vfx/postStack.ts:303-307`: `samples = 8`, `factor = 0.08`; `clampHistory` and `reprojectHistory` keep their
  defaults (false). Shader `Shaders/taa.fragment.js`: without `TAA_CLAMP_HISTORY` the result is a plain
  `mix(history, current, 0.08)` at the same pixel. Any mesh that moves while the camera is still (or "still", cause 1)
  leaves a fading copy of every pose: the arms and gun on a draw, the gun teleporting hand -> back slot on a holster
  (`weaponModel.ts:260 / 314 / 425` re-parent the node between `rig.weaponPivot`, `rig.torso`, `rig.weaponSocket`).
- No velocity buffer is involved at Epic: TAA does not reproject, the G-buffer (`postStack.ts:284-290`) only feeds
  depth, motion blur is off on every preset (`core/quality.ts:53-57`). So skinned / bone-attached velocities are not
  the cause, and enabling them alone would fix nothing.
- The custom TAAU (`src/vfx/taau.ts`, Low-Ultra with the menu's preset display settings) clamps history to the
  4-neighbourhood and reprojects by depth every frame, independent of `hasMoved`: at most a faint edge trail there.
  High in Michael's menu = TAAU 0.85 (`quality.ts:67`); `?gfx=high` with default settings = FXAA (no temporal pass),
  a clean control for the strips.

### 3. Why it shows now (4.10.0-4.13.0)
- CT prototype G2 (`src/weapons/drawState.ts`): holster 0.55 s -> 0.15 s, rifle draw 0.4 -> 0.3 s, carry lower 0.55 ->
  0.3 s (`weaponCarry.ts`), the long-gun draw raising with its travel (`DRAW_RAISE`): the gun covers the same distance
  in a third of the time, so each frame's displacement is 2-4x larger and the unclamped copies separate into visible
  ghosts instead of a soft smear.
- G3 camera (`src/player/shoulderCamera.ts`, +101 lines): shoulder offsets, peek slide and aim framing move the
  camera more while aiming - all invisible to TAA (cause 1).
- Not causes: no ADS FOV zoom (G29, `shoulderCamera.ts:438-440`; zoom 1 except a marksman scope - a scope zoom would
  also not set `hasMoved`, which only tracks the view matrix); the goggle emissive (not in the draw / holster path);
  volumetric haze, SSAO2, SSR and the night bloom keep no history of their own (no ping-pong outside TAA / TAAU).

## Smallest fix (all outside CT Core's folders)
1. `src/game/gameState.ts:2670-2672`: stop reading camera matrices before render. Take the aim direction from the
   camera's own fields (`camera.rotation` x = -pitch, y = yaw: `fx = sin(ry)cos(rx), fy = -sin(rx), fz = cos(ry)cos(rx)`,
   origin `camera.position`; no parent) or move the focus ray into a `scene.onBeforeCameraRenderObservable` handler as
   `nightAutoGain` does. One edit, allocation-free.
2. `src/vfx/postStack.ts:304-307`: `taa.clampHistory = true` (3x3 min / max clamp, no extra pass). Kills the trails of
   moving meshes against a still camera and caps any missed `hasMoved`. Optionally `factor` 0.08 -> 0.1.
3. Guard against the next stray read (optional, `postStack.ts`): keep last frame's view-projection; in
   `onBeforeCameraRenderObservable` compare it with the camera's and, when it changed but `hasMoved` is false, reset
   the TAA history for that frame (e.g. toggle `isEnabled`, which calls `_reset`). Or reprojection: `reprojectHistory`
   needs the PrePass renderer (velocity on skinned meshes, previous bone matrices), which collides with the
   G-buffer that SSAO2 / SSR force - not a patch-sized change; skip.
4. Unit test (Babylon-free if possible) or an e2e assert: after a frame with `ads` and a camera turn,
   `camera.hasMoved` is true (the script below prints it per frame).

No change needed in `src/player`, `src/anim`, `src/ui`. (`src/ui/screens/photoMode.ts:136` reads `getDirection` on the
photo camera while the game is frozen: harmless.)

## Evidence script
`scripts/archive/ghost-strip.mjs` (written, not run: the desktop lock belonged to another job, no node_modules in this folder).
`E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/archive/ghost-strip.mjs docs/ghost-fix/shots before epic` (and `... before
high` as the FXAA control). It boots `?autostart=proving&mode=sandbox&gfx=<preset>`, stops the render loop and steps
frame by frame (sim, frame update, render: `GameLoop.frame` order), reads the canvas back after each render (no HUD in
it), and writes per-frame PNGs plus one contact sheet per strip: `draw` (aim from holstered, camera still), `aimpan`
(aim held, camera turning 0.012 rad a frame), `holster`. It prints the pipeline (`taa` samples / factor / clamp /
reproject / disableOnCameraMove, TAAU scale, motion blur, G-buffer, PrePass) and per frame `M` (camera.hasMoved) /
`m` (the camera really moved): before the fix expect `-m` on aimed frames (cause 1); after it `Mm`.
