# course-ready S2 - checker report (commit a6e982c7)

Fresh checker, read only. Ran: `npx vitest run tests/ctcourseLight.test.ts tests/ctcourse.test.ts` (33 passed, 1 skipped;
bake 2.4 s, 29 lamps), the same with `CTLIGHT_PRINT=1`, and `npx tsc --noEmit` (clean). No build, e2e or shots run.

## Verdict: FIX (docs only, one round)
The lamps, the test and the shots script pass. WALKTHROUGH.md has wrong instructions that would mislead the playtest.

### Evidence for what passes
1. Lamps (`src/world/maps/ctcourse.ts`)
   - Only lamp lines changed (diff 5f283190..a6e982c7: the `lamp` helper gains y / intensity, L252; station 5 mast L258-259;
     airlock lamps L262; S2 wall top L307; S5 back room L335-337; S7 wall top L359). No geometry, gate, device or text change.
   - All in free air: airlocks (x0+19, 4.6, 7) under 6 m walls, no roof; S2 (31.9, 6.6, 5.0) beyond the 30.5-31.5 wall,
     above its 4.4 top; S7 (141, 6.6, 7) over the 4.4 wall; S5 mast (100.5, 6.8, 7) above the 4.0-4.4 roof slab; back room
     lamps at y 3.4 under the slab (bottom 4.0), x 102.2 / 102.6 between the grid wall (100.5) and A5 (104).
   - Bake box: lo / hi from `canonicalBounds` (shapes + 1 m, whole metres): top 7.0; highest lamp 6.8 + 0.2 = 7.0 (test L216).
   - Per-column cap: the test's column count copies `lampGrid` (`src/voxel/lampBake.ts:318-345`) and stays <= `LAMP_GRID_SLOTS` 8.
   - Doors per lamp (`DOORS_PER_LAMP` 4, `src/world/lightField.ts:29,36-56`): airlock lamps 2 doors (near / far), S2 top 1
     (A2-near at d 8.5 > 7 + 1.2), S7 top 0, back room 1-2. The S5 mast has 5 candidates (grid, S5 door, A5 near, A5 far,
     A4 far at 13.75): A4 far is dropped, but it had 5 at y 5 too (pre-existing) and field and shader read the same list,
     so parity holds. Polish item below.
2. Test (`tests/ctcourseLight.test.ts`)
   - Builds the field as World does: `canonicalLightSet(b.boxes, b.cylinders, 'ctcourse', dressingOn(ctcourse))` equals
     `LevelBuilder.build` L566 (detail boxes are filtered in `canonicalLightShapes`, `src/voxel/lightShapes.ts:21`); ambient,
     sky, moon dir and grid as `bakeLevelLight` (`src/world/lightBake.ts:75-92`); `bakeLamps` / `bakeMoon` are the worker
     bakers; `new LightField(bake, reg, doors)` as `World.create` (`src/world/world.ts:204`). No copied formula.
   - Must-see points present: airlocks centre / pad / corner / far door shut (L83-88), S2 leg-up square (30, 3.5), wall top,
     far drop, bolt (L93-101), S5 leg-up (96, 3.5), plates, hatch, roof lip, hack panel, hanging head, medkit, back room
     (L104-117), S7 leg-up (140, 3.5), rope holder / strip, stair (L120-125), panels (L80-81), exit (L126-128). All pass.
   - Dark: the new lamps add <= 0.02 at every yard corner (L148-158); airlock lamps add exactly 0 outside with doors shut
     (L160-166).
   - S3 camera: clamping to `LIGHT.lit` is sound. The camera rate is `sightRate` -> `lightFactor` -> `visibilityFromLight`
     (`src/security/securitySystem.ts:87-88`, `src/security/camera.ts:63`, `src/ai/perception.ts:92-95,149`), which
     saturates at `LIGHT.lit` (`src/world/lights.ts:255-257`). Below 0.6 the test still demands <= 0.005.
3. `scripts/shots-ctcourse.mjs`: `launch` / `openPage` exist (`scripts/e2e-lib.mjs:84,96`), headless unless `E2E_HEADED`
   (L36-37), fake pointer lock (L89); server `windowsHide`, `--host 127.0.0.1`, `--strictPort`, `E2E_PORT`; killed on
   success, on `fail` and on `exit`; 900 s overall kill. Hooks exist: `__app` (`src/main.ts:78`), `current`
   (`src/core/app.ts:311`), `photoFreeze` / `photoCamera` (`src/game/gameState.ts:1636-1642`), `lightLevel` (L267),
   `team.end` (`src/game/teamController.ts:1027`), `controller.teleport` (`src/player/playerController.ts:316`),
   `world.lightField`, `world.lamps`, `?gfx=epic` (`src/core/flags.ts:94`). Would run.
4. No em dashes in any changed file.

## Fix list (ranked)
1. WALKTHROUGH.md L58-59, station 3: wrong rule. The pass zone needs both players inside at the same time
   (`src/game/ctDevices.ts:474-487`, `inside >= 2`), not "both have been".
   Done looks like: L58 Player 2: "Walk into the blind spot (the pale blue-grey square) and stay. Then jam the camera from
   there while your partner walks in." L59: "With both of you in the blind spot together the door unlocks. **Holster (X)
   first**, then open it (A / E)."
2. WALKTHROUGH.md L62, station 5 hatch: "A late hack costs 10 HP." is false. The hack panel is a plain lever gate
   (`ctcourse.ts:178`, `kind: 'lever'`); only station 6's scanners cost health (`src/game/scanners.ts:16-20`).
   Done looks like: the sentence removed (L62 ends "then hack the panel while hanging (A / E).").
3. WALKTHROUGH.md L3: a direct link (the brief says no direct links).
   Done looks like: "Site: the /preview/ build (master)." with no URL.
4. WALKTHROUGH.md L17: the label is "Bay 2 (S2)" (`src/net/coopUi.ts:465`: `Bay n (bays[n-1])`, bay ids `S1`-`S8`,
   `ctcourse.ts:191`), and bay N lists once bay N-1 is finished (`src/save/courseRecord.ts:75`).
   Done looks like: "Optional **Start at** row: **Bay 1** on a fresh save; **Bay N (SN)** lists once bay N-1 is finished."
5. WALKTHROUGH.md L26: /preview/ is built without a preview id (`.github/workflows/deploy.yml` sets `VITE_PREVIEW_ID`
   only for /ct/ and /kestrel/; `src/ui/screens/mainMenu.ts:23-24`), so the label reads `v4.10.0 PREVIEW · <commit>`.
   Done looks like: "`v4.10.0 PREVIEW · <commit>` (`v<version>`, `PREVIEW` on a preview build, then the short commit hash)".

Checked and correct: title "Press ... to start"; main menu **Co-op** (`src/main.ts:308`, Offline counter L309); **Host a
room** / **Join with code** (`coopUi.ts:168-169`); "Room XXXXX", 5 characters, A-Z / Enter / Join (L206-216, L292);
Mode **Campaign**, Map **Marlow Yard** (L254, L272-276; session default `course`, `src/net/session.ts:46`); Ready / Not
ready, Start mission blocked text (L496-506); Room full / No host found (L583, L628); Quit to menu > Quit
(`pauseScreen.ts:76-81`). Controls table matches `keyBindings.ts:46-63` and `padBinds.ts:39-60` (LT knockout /
secondary fire = jammer, Z on keys). Laser 15 HP (`jammer.ts:121`), plates within 1 s (`config/course.ts:22`), scanners
1.5 s / 10 HP / floor 1 / no cost alone (`scanners.ts:5-20`), revive 30 s twice (`reviveClock.ts:8-10`), "Unbolt",
"Bolted from the other side", "Partner: press the other plate now", "PARTNER DOWN", "BACK IN" all match.

## Polish (not blocking)
- The test reads every non-airlock spot with all doors open; a few (S2 far side, S5 back room) are met with doors shut.
  The values have large margins, but reading each spot in its played door state would be truer.
- The yard has no dark (< 0.28) between pools: corners read 0.42-0.63 (pre-existing yard lamps, radius 13). The test's
  corner bound is `LIGHT.lit + 0.05`, so it guards "no new light" only. CT's dark between pools is a visual-pass question
  for Michael.
- S5 mast: 5 doors in reach for 4 slots (A4 far dropped; pre-existing, negligible light there).
- S7 return stair top step 0.36 (already on LIGHT.md's polish list).
- shots-ctcourse.mjs: the server poll loop does not wait after a non-ok response; the meter / field compare uses a 1.7 m
  sample, not the controller's own height (no wall or crouch rows today, so no false FAIL expected).
