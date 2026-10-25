# Night vision pass - survey (2026-10-20, master 4.14.0, read-only)

## The NV path today
- On / off: `src/game/vision.ts` (`VisionState`, `toggle` l.76, `select` l.84, flip 0.28 s on on / off only).
  `gameState.renderVision` (l.2087-2113) each frame: `post.setNightVision`, `nightGain.set`, `nightBloom.k`,
  `world.lamps.visionGain = 1 + (VISION_GAIN-1)*night` (l.2097), lens glow, goggle emissive, `lightRig.setVisionBoost`.
- Gain inside the lighting: `src/world/darkCurve.ts` `VISION_GAIN = 8` (l.42), `DARK_DESKTOP {centre .37, steep 12,
  floor .3, top 1.55}` (l.39); applied in `LampPlugin` (`src/world/bakedLamps.ts` l.729 `nsR`, l.872-877). In NV a dark
  pixel goes from x0.3-0.4 to about x12.4; lit about x8. `VISION_TARGETS` (l.56).
- Fixtures: `LightRig.setVisionBoost` (`src/world/lightRig.ts` l.420-440), bulbs x`NV_BULB` 2.5.
- Auto-gain: `src/vfx/nightAutoGain.ts` (glare lamps, veil, `gainKeep` 0.75); constants `src/vfx/nightVision.ts` l.56-72.
- Bloom: `src/vfx/nightBloom.ts`, `BLOOM` (nightVision.ts l.42-53): threshold 0.85 on the HDR (half float) scene,
  strength 1.4. Comments at nightVision.ts l.45 / l.98 still assume an 8-bit scene (stale).
- Tube: `src/vfx/cinematicPost.ts` l.44-62, `NV_TONE` (nightVision.ts l.20-39): gamma 1.7, pale tint [.54,.64,.49],
  white clip from drive 0.65, grain `SENSOR_GRAIN.night` 0.035 equal lit and dark (visionLook.ts l.67-88).
- Presets: the NV shader is the same everywhere. `?gfx=min` has no post stack and no baked lamps (no `visionGain`), so NV
  there is an unboosted remap and reads dark. Medium and up stack the default pipeline bloom (postStack l.357-363) on the
  NV bloom. All non-min presets tone map (PBR Neutral, exposure 1.08) before the tube.

## Why bodies are very bright
Characters (non-voxel PBR: operator figure, parts, weapons) take the ambient grid as a flat, directionless fill
(bakedLamps.ts l.800-802, l.869-870) with no sky occlusion or AO, while voxel walls take the sky fill scaled by sky
visibility (voxelPlugin.ts l.76-79). Under NV both get x12, so the body becomes a bright uniform silhouette that clips white
at drive 0.65 and halos through the bloom. No emissive, IR, rim or thermal boost reaches bodies in NV (pattern / heat
overlays are thermal and electro only). Fix in the `LampPlugin` render path only; never touch `ambientGrid` data,
`lightField` or `LIGHT_GAIN` (gameplay, light parity).

## Goggle outline (shader only)
`cinematicPost.ts`: lens ring l.95-102 (all modes; `le = (uv-0.5)*(min(aspect,1.8),1)`, outside r 0.455-0.5 the image
drops to about 0.51x, rim at r 0.468), eyepiece vignette l.59-60 (NV) and l.91-92 (thermal / electro):
`mix(0.06,1,smoothstep(0.8,0.52,r))`. At 16:9 the circle is 56% of the width; full brightness covers about 44% of the
screen; the edges sit at x0.06. Plus the settings vignette 0.35 (l.116). `hud.setVision` is only the NV label.

## Vision modes and the wheel
- `VISION_WHEEL` night, thermal, electro (vision.ts l.17; duplicated as `WHEEL_VISION` selectionWheel.ts l.14).
- Pure wheel model `src/game/selectionWheel.ts`: `update()` sets the mode from the cursor length on segment 0
  (`VISION_STEPS` [0.58, 0.8], l.117-120); `begin()` resets to night (l.83-88). DOM `src/ui/hud/gadgetWheel.ts`
  (stack tiles l.49-53, flags l.120-124). Logic `src/game/gadgetSystem.ts` (LB / Tab hold 0.15 s opens, release picks,
  l.177-188, l.244-256). A is not read in the wheel. With a gun drawn pad A arrives as `reload`, not `interact`
  (`gamepadSource.ts` l.135-149); `contextMenuStep` runs before `gadgets.fixedUpdate` (gameState l.1490-1497).
- Tests that assume length picking: `tests/selectionWheel.test.ts` l.34-52, `e2e-pad` l.236-250, `e2e-gadgets`
  l.111-127; hint text gameState l.2640.

## Light parity
NV is view-only: `visionGain` lives only in `BakedLamps`; `tests/visionIsolation.test.ts` and `e2e-stealth-ai`
vision-detect enforce it.

## Tests and tools
- Unit: `tests/nightVision.test.ts` (encodes the pale look: R/G > 0.75, B/G > 0.7, the 25-45% band), `darkCurve.test.ts`,
  `vision.test.ts` (night grain < 0.05, equal lit and dark), `selectionWheel.test.ts`, `visionIsolation.test.ts`.
- GPU: `scripts/e2e-darkness.mjs` (Warehouse grey cards, NV targets); `scripts/shots-ctcourse.mjs` (Marlow Yard, 17
  cameras; `E2E_GPU=1 E2E_PORT=4189 node scripts/shots-ctcourse.mjs <dir> <suffix>`, gfx in its query);
  `scripts/shot.mjs`. NV for a shot: `g.vision.set('night')`, about 10 frames, then `photoFreeze(true)`. Warehouse
  section 1: `autostart=warehouseOps&mode=sector&sectorGuards=4`, rooms `S1_ROOMS` (`src/world/maps/warehouseS1.ts` l.31-44).

## Stale docs to fix in this job
`docs/systems/lighting.md` l.85-116 (flip 0.2 s, eyepiece ellipse, goggleGlow.ts, G100 cycle);
`docs/systems/graphics-quality.md` l.86-100 (grain and soften numbers); nightVision.ts 8-bit comments.
