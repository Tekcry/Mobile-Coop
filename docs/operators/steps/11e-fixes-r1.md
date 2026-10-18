# Steps 11d + 11e - fix list, round 1 (checker, 2026-10-18)

Checker verdict: FAIL on the items below. Everything else in the 11d / 11e diff (0de3293..HEAD) passes: Wren is the
body for solo, the local co-op player and the partner; guards keep their bodies; capsule, speeds, noise and camera
unchanged; traversal at `GAMEPLAY_HEIGHT` with a visual-only lift (G139); hit volumes follow Wren; no new net bandwidth
(no protocol / MoveState change); src/net only behind the dynamic import; Babylon only through core/babylon.ts; no
Math.hypot in src; hero lazy and close-up only; GLBs runtime-cached, never precached (44 entries, 15.1 MB); KTX2
decoder local; `npm run check` passes.

## 0. e2e-offline fails, in the full run and solo: Wren does not load offline
- Full `npm run e2e` (4191) and a solo rerun (`run-e2e.mjs e2e-offline --jobs=1`): every functional check passes, the
  suite fails on console errors: `[operators] Wren failed to load TypeError: Failed to fetch` and (solo) three
  `BJS - Failed to load KTX2 texture data: TypeError: Failed to fetch`. Not on the known-flaky list; e2e-offline passed
  before step 11e. In the full run e2e-desktop:2 also failed once on the same warning ("21:9: no console errors"; ok
  solo).
- Cause to confirm: the GLBs are only runtime-cached (`vite.config.ts` runtimeCaching, A98 / A100) when they are fetched
  through a controlling service worker and the fetch completes. The first online visit fetches Wren before the worker
  controls the page (or the page goes offline / reloads before the chain LOD2 -> LOD0 -> LOD1 -> hero completes), so
  offline the play LODs are missing and the player has no visible body. That contradicts the claim "offline play after
  one online start" (vite.config.ts comment, CHANGELOG "then cached for offline play", A104's "a real offline player
  has the worker from an earlier online visit"). The KTX2 warnings look like loads cut off by the suite's
  reload / goto (blob textures revoked mid-load).
- Done looks like: after one online start that reaches the main menu with the worker in control, Wren's play LODs
  (at least LOD2; the hero may stay on-demand) are in the cache - e.g. the page warms the `operators` cache with the
  game LODs once `navigator.serviceWorker.controller` is set, or LOD2 (2.5 MB) is precached; a load abandoned by page
  unload / scene dispose is not reported as an error; e2e-offline asserts the offline match's player has Wren loaded
  (`player.figure.loaded`, LOD2 bit) and passes solo and in the full run with its console-error filter unchanged.
  Record an A-decision; fix the cache claims if the behaviour differs.

## 1. The light-meter samples do not follow Wren's body (G129 / ops D11; A99, CHANGELOG and docs say they do)
- Where: `src/game/gameState.ts:997` `const h = 1.75 * (1 - 0.35 * crouchBlend)` (local player) and `:1023`
  `r.crouched ? 1.75 * 0.65 : 1.75` (remote partners): off the wall the light is still sampled for a 1.75 m body
  (chest 1.05 m, head 1.66 m) while Wren's hit volumes, the guards' LOS points (`aimPoint` / `headPoint`) and the body
  drawn are 1.68 m. Only the on-wall path (`rig.posedHead`) follows her. The exposure points in
  `src/game/tactics.ts:38-42` (head 1.62, chest 1.3, hips 0.95, knees 0.5) are fixed to the 1.75 m body too.
- Michael (ops D11 / G129): "Each operator's skeleton, hit volumes and light sample heights match their real size, so
  shots and light hit the body you see." CHANGELOG.md:10, docs/systems/world-and-characters.md:93 and ops A99
  (docs/operators/DECISIONS.md:1186) claim this is done.
- Done looks like: the off-wall light sample height (local and every remote) comes from the body's height (the
  player's / partner's rig height or the operator's height data - never LOD, presets or figure meshes), through a pure
  helper with a unit test (1.68 m standing and crouched vs 1.75 m); `exposurePoints` takes the same height (scaled by
  height / 1.75) with a test; the on-wall posed path unchanged; host and client compute the partner's sample the same
  way (no new bandwidth). Re-run e2e-darkness, e2e-stealth-ai, e2e-tactics, e2e-enemies, e2e-netmove, e2e-security
  (they read light / perception) plus `npm run check`. Record an A-decision; the CHANGELOG / docs claims are then true.

## 2. e2e-desktop's Wren head-fade / goggle check asserts nothing (loosened by the A106 edit)
- Where: `scripts/e2e-desktop.mjs:403` `headHidden = g.player.figure.headVisible === g.player.cam.headVisible` compares
  two flags that are both true in that state (no fade is driven), and `:434` accepts `lensChanged === null` (no guard
  wears goggle lenses, so the lens branch is skipped). The old check drove the player's lens glow and head hide and
  verified the result; the new one passes on nothing.
- Done looks like: the suite drives Wren directly - `g.player.figure.setHeadVisible(false)` then reads the current
  LOD's head joint scaling (0) and restores it (1); `setVision` with a mode on vs 'off' changes the glow material's
  emissive (higher with a mode on) - and asserts both. Keep the guard voxel lens check only where a lensed body exists
  and say so in the message. Re-run e2e-desktop (all parts) solo.

## 3. perf.mjs and anim-sheet.mjs measure / draw on even when Wren never loaded
- Where: `scripts/perf.mjs:73` and `scripts/anim-sheet.mjs:64` ignore `waitOperator`'s -1 (timeout), so a perf budget
  "pass" or a contact sheet can come from a page with no Wren drawn.
- Done looks like: both exit non-zero with a clear message when `waitOperator` returns -1 (perf prints it in the budget
  report). No GPU re-run needed for this item alone.

## Checker's run (HEAD 566f3d8)
- `npm run check`: exit 0 - lint 0 errors / 41 warnings; Vitest 136 files, 1562 tests passed; build ok; precache 44
  entries (15468 KiB).
- Full `E2E_PORT=4191 npm run e2e`: 10 suite(s) failed: e2e-desktop:1, e2e-desktop:2, e2e-mouse, e2e-offline,
  e2e-anchors, e2e-course, e2e-music, e2e-camera-bounds, e2e-kestrel, e2e-weapon-audio; KNOWN FLAKY: e2e-netmove,
  e2e-coop, e2e-pad, e2e-foley, e2e-bunker.
- Solo reruns (`--jobs=1`): ok - e2e-mouse, e2e-course, e2e-desktop:1, e2e-anchors, e2e-desktop:2, e2e-weapon-audio,
  e2e-music; FAIL - e2e-offline (item 0). e2e-kestrel, e2e-camera-bounds: pre-existing master failures.

## Notes (not failures; cleanup per G124 / D33 unless the orchestrator decides otherwise)
- The player rig still instances its old part meshes (disabled, not shadow casters) to measure `backGear` /
  `thighOuter` for the weapon carry (LOG open 4); the step text says "never for players". Not drawn.
- The slung rifle stands off Wren's back (mockups/wren/ingame/solo-crouch.png, anim-walk.png every frame): the same
  part-body carry offsets (LOG open 4).
- `src/operators/lab/ktx2.ts` header still says "Dev-only: the game never imports this file" (figure.ts does);
  `@babylonjs/ktx2decoder` is still a devDependency (LOG 11d cleanup).
- docs/operators/DECISIONS.md: A80's text sits above the "# Operators run - decisions" title (pre-existing).
- The hero stays in VRAM for the rest of a match after photo mode (LOG open 6).
- Shots leave from the rig's muzzle, so Wren's shots start ~4 cm lower than the 1.75 m body's (G129 sizes; note only).
- e2e-clip's wall / sprint / crouch-run scenarios count 0 frames (no weapon in hand): pre-existing.
- Goggle over the eyes in both states: accepted (D33 / G124).
