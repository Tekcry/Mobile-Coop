# A5 goggles (prototype, 2026-10-18)

Prototype only: every number is a starting value (G10). GPU look checks are **pending PC run**.

## Built
1. **Mode cycle (G99, G100).** `VISION_CYCLE` = off -> thermal -> electro -> night -> off (CT order). Instant cut: the 0.2 s flip, `VISION.flip`, `shown` lag, `flipCentre` and the housing band feed are gone (`VisionState.shown` / `night` are now the chosen mode). D-pad up (pad) and N (KBM) are unchanged bindings. `CinematicPost.setFlip` stays in the shader but is never called.
2. **Look (G101, G102).** In `src/vfx/visionLook.ts` + the `vk` branch of `cinematicPost.ts` (same post shader, render only):
   - Thermal: CT ramp from `ct-measure-walls-doors-combat-vision.md` (indigo 33,9,63 -> deep blue -> blue rim -> cyan-blue -> teal -> green -> yellow-green -> yellow -> red core), 9 stops in `THERMAL.stops`. Input luma goes through `heatOf` = smoothstep(`coldTo` 0.5, `hotTo` 1.0); everything colder is flat indigo plus a 5 % trace of geometry (`world`). Blur 0.0018 -> 0.0025 H. No distance fade.
   - Grain (G101): thermal strong on warm areas only (`thermalGrainAmp`: 0.26 peak-to-peak at heat >= 0.4, 4 % on the cold background; CT std 17-23/255); electro none (0); night 0.035 (about 1 %, CT std 2.5-3/255), flat across luma.
   - Electro: flat navy (16,36,61 -> 12,29,52), devices white blob (glow white), no grain.
   - Door silhouette: `src/vfx/doorGhosts.ts` (new). In thermal, for each live guard within 14 m (`THERMAL.doorRange`), a dim blob (emissive grey 0.62, lands low blue on the ramp) is drawn in rendering group 1 (over the leaf) only if the camera-to-guard floor line crosses a closed door leaf AND two static rays (camera to just before the door, just past the door to the guard) are clear. Walls still hide guards. Render only: reads guard and door state, writes nothing back.
   - Glass (G45): the game has no glass geometry, so nothing to suppress; the ghost rule above is "door and nothing else", so a future glass pane would also block the ghost.
3. **Partner beacon (G135).** `goggleGlow.ts` `BEACON` (blue 0.12,0.3,1 / red 1,0.1,0.08; brighter variants with a mode on). `CharacterRig.setBeacon(1|2)` repaints the glow points. Remote avatars: `RemoteAvatar` calls `setBeacon(info.host ? 1 : 2)` from `PlayerInfo.host` (host = player 1 blue, joiner = player 2 red): **no wire change, protocol stays 15**. Local rig: `gameState` sets 1 (solo / host) or 2 (client, `opts.net.role === 'client'`). Glow is an unlit sphere, not a light; guards never read it.
4. **Brow / eyes (G73): stubbed.** The rig's tri-lens goggle is a fixed mount at the eyes with always-on glow (idle dim, brighter with a mode); there is no brow transform. Wren carries the brow / eyes pose.

## Files
`src/game/vision.ts`, `src/vfx/visionLook.ts`, `src/vfx/cinematicPost.ts`, `src/vfx/doorGhosts.ts` (new), `src/player/goggleGlow.ts`, `src/player/characterRig.ts`, `src/net/remoteAvatar.ts`, `src/game/gameState.ts`.

## Tests changed
- `tests/vision.test.ts`: new order, instant cut, CT ramp, grain G101 (flip tests removed).
- `tests/visionIsolation.test.ts`: dropped flip timing.
- `scripts/e2e-pad.mjs`, `scripts/e2e-mouse.mjs`, `scripts/e2e-stealth-ai.mjs` (vision scenario): new order, no flip waits. `scripts/e2e-darkness.mjs`: reads `night` before switching off.

## Results
`npm run lint` clean (errors 0), `npx tsc --noEmit` clean, `npx vitest run` 132 files / 1454 tests pass, `npm run build` ok. e2e (port 4193, solo): smoke ok, e2e-pad ok (goggles step passes), e2e-coop ok, e2e-stealth-ai ok, e2e-darkness ok (one earlier failure was mine: the script read `vision.night` after `set('off')`, now no flip delays it; fixed, passes). e2e-mouse not run (script edited the same way; not in the requested set).

## Try it
- `?autostart=warehouse&mode=sandbox` (any map with guards and doors): press N or D-pad up. Order thermal, electro, night, off, instant. Thermal: indigo room, guards climb to yellow / red with grain on them. Stand a guard behind a closed door within 14 m: dim blue blob.
- Two tabs `?net=local&autostart=bunker&mode=course`: host lamp reads blue, joiner red, on the remote avatar and on your own rig seen from behind.
- Tune: `THERMAL.coldTo` / `doorGhost` / `stops`, `SENSOR_GRAIN.thermal` / `night` in `src/vfx/visionLook.ts`. The luma thresholds assume the post input luma of lit scenes under 0.5; a bright lamp-lit wall may show as blue until tuned on the GPU (pending PC run).
