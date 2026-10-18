# Step 14 - vision (Block C)

Thermal and electro vision as post passes (local only, never detection); night vision stays the lighting gain; the
vision button cycles off -> night -> thermal -> electro -> off (bible 5.5). Deps: 02. Model: implementer opus; (all subagents opus from step 06, Michael 2026-10-13)
checker opus. No network change (D8: vision is never sent).
Assumes Block A step 02 (sonar removed: `VisionMode = 'off' | 'night'`, the button cycles off / night). Line numbers
verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- docs/design-bible.md 449-457 (5.5), 534 (cameras visible in electro); RULES.md (gameplay never reads graphics state)
- src/game/vision.ts (all, 116 lines; after step 02 it is night only)
- src/game/gameState.ts: grep `renderVision` (~1698-1730), `pressed('vision')` (~1680-1690), `VISION_GAIN`
- src/vfx/cinematicPost.ts 1-60 (uniform setup, phone floor :39), 81-160 (`setNightVision` :156), 195-245
  (PostProcess creation :200-202: the uniform list)
- src/vfx/nightVision.ts 1-120 (NV_TONE, `nvColor`, `luma709`, NV_GLSL :116); src/vfx/postStack.ts (phone grade pass)
- src/vfx/silhouettes.ts 1-40; src/player/characterRig.ts grep `setLensGlow`
- src/world: grep `camera` / `laser` / `panel` emissive materials (security cameras, lasers, alarm panels, lamps)

## Task
1. VisionMode = 'off' | 'night' | 'thermal' | 'electro'; one button cycles in that order. Every switch uses the
   existing goggle flip (`VISION.flip`), the image changing at the middle. Pure, unit-tested.
2. Night: unchanged (lighting gain, auto-gain, bloom, `lightRig.setVisionBoost`).
3. Thermal: a mode in the CinematicPost shader (new uniform `vk`: 0 off / night, 1 thermal, 2 electro) mapping scene
   luminance to a cold blue-grey ramp, softened; warm bodies (player, team-mates, guards, dogs, fresh bodies fading
   over 60 s) bright through a render-only `heat` flag that tints their rig materials' emissive while thermal is on.
   No see-through walls (ASSUMED, logged). Lamps read warm.
4. Electro: desaturated dark-green grade; electrical devices (lamps, security cameras, lasers, alarm panels, keypads,
   breakers, powered doors) glow via a render-only `electro` emissive boost on their materials; people stay dim.
5. The phone grade pass carries the same `vk` branch (no extra pass); desktop and phone use one shader path each.
   Budget: no new render target; the phone look's cost goes on the Phone check list.
6. Flags are set from gameState's render frame only (`renderVision`). Nothing in src/ai, src/game perception,
   src/net or the light meter reads `vision.mode`, `heat` or `electro`.
7. Vision is never sent (D8), so remote avatars always show the lens glow off. The local tri-lens glows in any mode
   (`setLensGlow`).
8. Touch: the vision toggle cycles the same four modes (D1 basic scheme). Pad SELECT and the KBM vision key unchanged.
9. Settings: none. HUD: a small mode label for 1.5 s after each switch.

## Tests
- tests/vision.test.ts: the cycle order, flip timing, mode at mid-flip, reset to off on respawn.
- tests/visionIsolation.test.ts: perception result for a fixed scene is identical in all four modes (drive the pure
  perception function with the same inputs while `VisionState` cycles); `wirePlayerState` key set and the parsed
  `pstate` / `snap` fields contain no vision field (snapshot of the key list).
- e2e-pad: SELECT x3 reaches electro, x4 back to off; `post.vk` matches. e2e-mouse: the KBM vision key does the same.
- e2e-touch: the vision button cycles (stays green). e2e-darkness: night vision checks still pass.
- e2e-stealth: a guard's detection time is the same with thermal on as off (same scripted approach, +-1 frame).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-darkness e2e-stealth
  e2e-phonelamps e2e-coop`
- Grep proofs: `grep -rn "vision\|thermal\|electro" src/net` empty; `grep -rn "vision\.mode\|\.heat\b" src/ai` empty;
  `grep -n "'thermal'" src/game/vision.ts`.
- PC-PASS (with command and limit): thermal and electro look on desktop and phone look
  (`E2E_GPU=1 node scripts/shot.mjs ...`), phone frame budget with each mode on (`node scripts/perf.mjs --budget`),
  pending PC run. Never claim them from software GL.

## Commit
"locomotion 14: thermal and electro vision post passes, local only"
Then LOG, STATE, AUDIT (V02, V03), CHANGELOG, TESTING (Phone check: each vision mode), docs/systems/gadgets.md,
lighting.md, graphics-quality.md.
