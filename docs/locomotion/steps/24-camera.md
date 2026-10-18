# Step 24 - CT camera and collision solver (D5.13, D2 camera limits)

Model: implementer opus; checker opus. Depends on: 21. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 24: CT camera: capsule spring follow, landing dip, wall pull-in, auto shoulder swap, FOV by gear"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D2 (camera), D5.13, D8 (camera local only), D9.
- docs/design-bible.md 5.3 "Camera" block (`grep -n 'Collision solver' docs/design-bible.md`, read +-25 lines).
- src/player/shoulderCamera.ts:48-130 (springs), :171-198 (casts, swap), :222-232 (impact), :248-374 (update),
  :385-398 (fade); src/player/cameraBounds.ts:11-63; src/config/camera.ts:1-110.
- src/player/player.ts:178 (swap button), :264 (cam.update), :305 (rp.landing).
- src/player/playerController.ts:501 (stepAssist), :535-538 (landT); src/config/movement.ts:204-212 (landing bands).
- scripts/e2e-camera-bounds.mjs (header comment only).

## Numbers
- Follow: camFollow 16, footY 14 (shoulderCamera.ts:279-298); look-ahead gain 0.14 s, clamp 0.3 m (:292-294).
- Wall pull-in boomIn 40 / boomOut 7, castRadius 0.12 (config/camera.ts:32-41); low space lowIn 10 / lowOut 2.5.
- Dash framing boom +0.3, FOV +4 deg (:256,329,373); base FOV 75 (camera.ts:68); ADS FOV x0.75.
- D2: vertical oscillation <= 0.5 cm in steady movement (flat, stairs, slopes); landing: one damped dip, no rebound.
- Landing bands: < 0.6 m none, < 2.5 soft, <= 4.5 roll, else heavy (movement.ts:204-212).

## Task
1. Follow the smoothed capsule only (never head or pelvis). On stairs filter `sFootY` so stepAssist steps give
   <= 0.5 cm vertical oscillation at steady speed (measure at every gear on stairs and slopes).
2. Landing dip: replace `sBob` / `impact()` with one critically damped landing dip driven from the landing band:
   soft 1.0 cm, roll 2.0 cm, heavy 3.0 cm (ASSUMED, next free A-number; alternative: scale with fall height),
   zeta >= 1, no rebound above rest. Explosions and hits use trauma shake (rotation) only.
3. Look-ahead kept (0.14 s, 0.3 m); verify it never adds vertical motion.
4. Wall pull-in: capped rate so it never pops (max boom change per frame set in config, measured in e2e-camera-bounds);
   holds a usable view in 1.2 m corridors and ducts.
5. Auto shoulder swap at corners: when the shoulder side is blocked within 0.6 m and the far side is open for 1.5 m,
   swap after 0.25 s held, with hysteresis; a manual swap overrides for 3 s. Never swaps while aiming.
   Exception (D9): at a back-to-wall edge the shoulder is the open side, set with the weapon switch (step 12b);
   the auto swap and the manual override never fight it there, and mid-wall aim keeps the normal shoulder.
6. FOV by gear and stance: small, monotonic, e.g. G1 -2 deg ... G6 +4 deg (dash value kept), crouch -1 deg; Hor+
   rules kept; same on every device (fairness, bible 5.3).
7. Back-to-wall peek swing (step 12), the open-side lean shoulder (12b) and door peek keep their presets; attach
   presets unchanged. Unit test: the swap decision returns the open side at edgeL / edgeR, normal side mid-wall.
8. Geometry fade of blockers between camera and operator keeps working.
9. All numbers go to config/camera.ts with comments (step 32 freezes camera distances).
10. Pure parts (dip curve, swap decision, FOV map) Babylon-free with unit tests.

## D8
- Camera is local only: unit test proves no camera field in PlayerState / protocol; remotes unaffected.
- No rig change, so no anim cost; sim cost still within the trend gate (sim p95 <= 3.31 ms on this VM).

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-camera-bounds e2e-move e2e-ct e2e-desktop`.
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): camera vertical oscillation and landing dip metrics pass; nothing regresses.
- PC-PASS: `E2E_GPU=1 node scripts/shot.mjs` set at a corner, a 1.2 m duct, after a 3 m drop; anim-sheet `ots`
  for walk / sprint / stairs, and back-to-wall lean at a left and a right edge: "no camera bob, one dip, no pop,
  shoulder on the open side" (PROVISIONAL in the cloud).
