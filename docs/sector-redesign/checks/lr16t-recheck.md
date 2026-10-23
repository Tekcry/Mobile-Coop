# LR16t recheck - fix round (Opus, 2026-10-23)

Branch `feature/sector-redesign-lr16t` @ 5700dff5. Fix-round diff e3760a3c..5700dff5. Review only, no code edited.

Runs: `npx tsc --noEmit` clean. `npx vitest run torchShadowSet torchOcclusion shadowAccuracy lampTorchCone
--maxWorkers=2`: 4 files, 33 / 33 pass (lock `sr-slot-4`, released).

## Verdict: PASS

## A1 (stale torch map lit outside its frustum) - closed
- Off-frustum on a valid map reads 0: `src/world/torchShadowSet.ts:264`. Not ready stays 0 (`:257`). The GLSL test
  asserts the new string and the absence of the old one (`tests/torchShadowSet.test.ts:234-235`).
- Pose rule: `poseTurn` 0.02 rad / `poseMove` 0.05 m (`torchShadowSet.ts:57-58`), `torchPoseStale` `:220` (unit axes
  from `placeTorch` / `makeCone`, so float32 rounding never trips it). `torchShadows.ts:276` forces
  `resetRefreshCounter()` for an in-view slot whose tile is not a valid map or whose torch left the tile's pose. The
  pose is written from the light's own position / direction at copy time (`:333-335`), which `frame` set from the same
  registry values (`:236-237`).
- Same-frame order holds: guard torches are placed in the fixed step (`EnemyManager.updateTorches`), then
  `frameUpdate` -> `player.frameUpdate` -> `world.frame` (rig `followTorches` uniforms, then `torchShadows.frame`),
  then `scene.render` (`src/core/loop.ts:196-216`). In `scene.render` the shadow maps render (their `_shouldRender`
  honours the reset: `objectRenderer.shouldRender` returns true on `_currentRefreshId === -1`) and `copy` runs in
  `onAfterUnbind`, before the main pass binds the lamp uniforms. `scene.shadowsEnabled` / `renderTargetsEnabled`
  are never toggled in `src`; no `customRenderTargets` render lit materials before the maps. The governor and the
  nearest-slot interval only set `refreshRate`; the forced reset bypasses both.
- Out-of-view stale slot goes to w 0 (`torchShadows.ts:250-253`); on its first in-view frame `params !== 1` and the
  0 -> n `refreshRate` change both re-render it the same frame. Torch change in a slot: w 0 then forced render the
  same frame (polish A2 closed).
- Remaining w 1 with an old pose: only (a) within the thresholds by design (rotation 0.02 rad keeps the new cone in
  the old frustum; same apex, so in-frustum occlusion is exact; translation < 5 cm), or (b) `copy` skipping on a
  not-ready copy effect, which only happens before any copy (w is already 0). `scene.isReady` /
  `isReadyForRendering` (which fires `onAfterUnbind` without a render) never touches shadow-generator maps.
  Co-op client: `TorchMirror` places torches after `world.frame` (`gameState.ts:2371` vs `:2358`), so map and uniforms
  are both one frame behind the registry but agree with each other. No leak path found.
- Opposite failure (beam dark many frames): none in normal play. Dark only for one frame when the lagged camera
  planes say "out of view" while the torch moves, or while the copy shader compiles at start. "Nothing to cast" (w 2)
  -> casters appear gives w 0 then a forced render and copy in the same frame, so no dark frame.

## B1 (e2e part 3 asserted the shadow pool) - closed
`scripts/e2e-desktop.mjs:581-589` reads `world.torchShadows.on` (`world.ts:128`, getter `torchShadows.ts:105`),
`lightRig.shadowSlots` (`lightRig.ts:150`), `lightRig.drawnTorches` (`:126`), `enemyMgr.torchesOn`
(`enemyManager.ts:848`) and `torchShadows.copies` (`torchShadows.ts:89`), all through `window.__app.current`, the
handle the suite already uses (`enemyMgr.enemies` alert just above). Only 4 flashlights exist (`FLASHLIGHTS`, guards
only), and the rig's nearest list holds 64, so `drawn === min(4, on)` holds once the 240 frames pass the pick
interval. Not run (GPU list).

## Allocation and cost
- No per-frame allocation added: `torchPoseStale` / `writeTorchPose` are pure (allocation test in
  `torchShadowSet.test.ts`), `pose` is made once per slot.
- Cost: torches move only on fixed steps. A guard turning (0.13 rad / step) or walking faster than 3 m/s re-renders
  every step; a 1.4 m/s walk every 2nd-3rd step. 4 searching guards in view: up to 4 slot renders per frame (vs 2.5 /
  frame with the old intervals, ~1.25 under the governor, and 2 Babylon torch maps before LR16t). 256-512 px tiles,
  cone-culled casters: likely tens to ~200 extra draw calls, not clearly over budget. Measure in GPU list item 3.

## Polish (not blocking)
1. `torchShadows.ts:276`: forced renders ignore the governor (`shadowEvery`), so under load 4 moving torches still
   render 4 maps a frame. Rotation alone keeps in-frustum occlusion exact (same apex) and the off-frustum rim now reads
   0, so under the governor the turn test could be relaxed (or forced renders capped, nearest first) and only
   translation forced. Decide after the GPU timing.
2. `torchShadowSet.ts:264` + the normal offset (0.02 + 0.004 d): within ~0.77 m of the torch the offset angle exceeds
   the 0.03 rad pad, so the outermost rim of the beam there now reads 0 (was 1) in steady state. The cone term is
   ~0 at the rim (smoothstep feather), so it should be invisible; the test checks the margin only at the radius.
3. e2e part 3 `copies > 0` needs a torch's lit sphere in view with casters during the 240 frames (same view
   dependency as the old assertion). If it ever flakes, log `torchShadows.stats()` in the message.
