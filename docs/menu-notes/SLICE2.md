# Menu notes - slice 2 (notes 2 and 4)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. No e2e or GPU run in this slice (the desktop `heavy.lock` was
held by another job): every visual result is "pending PC run".

## Michael's notes
- 2: "Preload shaders and the hero before showing it (it is jumpy while loading); a Night Shift load screen is fine."
- 4: "Check the menu model is really the full hero quality."

## Note 4 findings (which LOD the close-ups draw)
- **Desktop presets draw the hero in the close-ups once it has loaded. Nothing drops it.**
  - `pickLod` (`src/operators/runtime/lodPick.ts`) returns `LOD_HERO` for a registered close-up camera as soon as the
    hero is loaded, at any distance. The distance bands (8 / 25 m) apply only to cameras that are not close-up cameras.
  - The menu camera is put in `CLOSE_CAMERAS` in the `MenuState` constructor and removed only in `exit()`. Photo mode
    over the menu uses its own stand-in FreeCamera, so it never removes the menu camera.
  - The quality preset, the `detail` tier and the governor do not reach the operator LODs. `figure.ts` / `playerFigure.ts`
    never read quality. The governor changes render scale only. The hero textures load at their file size with no
    preset cap: cloth 4096, kit / hardware 2048 (slice 6 probe).
  - `HERO_CLOSE_UPS = true`, and `wren-hero.glb` (57 MB) is in the build.
- **What Michael saw was the load order, not a lower LOD.** `loadMenuLods` puts LOD2 on screen first, then LOD0, and the
  hero arrives last (55 MB) while the menu is already showing. So the close-ups swap LOD2 -> LOD0 -> hero on screen.
  The load screen (note 2) now covers this. The first frame after the reveal draws the hero.
- If the hero ever fails to load, LOD0 stays on screen (as before) and the load screen stops waiting for it.
- `?gfx=min` (software-GL tests) still gets LOD2 (A102).
- **Debug read-back**:
  - `window.__app.current.heroLod`: the LOD drawn now ('hero' / 'lod0' / 'lod1' / 'lod2' / 'none').
  - `heroLodWanted`: what the close-ups should draw ('hero' on desktop presets, 'lod2' under `?gfx=min`).
  - `bootGate`: '' while waiting, then 'ready', 'timeout: <step>, ...' or 'error: <message>'.
- No fix to the LOD pick was needed. One refactor: `OperatorFigure.closeUpLod` (a getter) now holds the rule that
  `loadCloseUp` used inline, so the gate and the read-back use the same rule.

## Note 2: what changed (the load screen)
- **The boot screen stays up until the menu stage is ready.** It is the existing NIGHT / SHIFT ghost with the progress
  line and status, in the existing font. `MenuState.prepare()` checks the gate every frame (pure rules in
  `src/world/menuGate.ts`), in order:
  1. "Loading Wren…" until the close-up LOD is loaded (or has failed) and the menu's LOD chain has settled (LOD2, LOD0,
     the LOD1 parse, the offline cache, the hero). Nothing heavy is parsed after the reveal.
  2. "Loading weapons…" until both menu weapons' Blender meshes are in. `WeaponModel.meshPending` is new. A weapon with
     no mesh in the bundle, or a failed load, does not hold the gate (`loadWeaponMesh` has a new optional `failed`
     callback).
  3. "Preparing shaders…" until:
     - the close-up LOD is the one drawn;
     - every enabled, visible mesh `isReady(true)` with the lights of the shot on screen. The first void shot (T1 under
       the title, T2 otherwise) shares one light rig with every void shot, so later shots need no new compiles;
     - no texture is pending (`scene.getWaitingItemsCount()`, which covers the hero's KTX2 textures);
     - every post process is ready.
  4. 5 warm-up frames rendered behind the boot screen, then 'Ready'. The boot screen fades out over 0.6 s (was 0.3 s)
     into the title.
- **Stall timeout, not a fixed cap** (fix round). `loadModel` counts the operator file bytes as they stream in, through
  `r.body.getReader()` into `operatorBytes.received`. It does not trust Content-Length.
  - The gate keeps waiting while bytes keep arriving or the step changes.
  - It gives up after 12 s with no progress, or at a hard cap of 120 s.
  - While Wren loads, the status line shows the megabytes received this load, e.g. "Loading Wren… 34 MB".
  - Under webdriver it uses a 12 s cap only, which always reads as "cap of 12 s".
  - `?bootCap=<s>` (5-600) overrides the cap. `menu-boot-shots.mjs` passes `bootCap=60`, so the GPU shots at gfx high
    are not cut at 12 s.
  - After any expiry the menu shows anyway. The reason goes to `console.warn` (`console.info` under automation, where
    the suites count warnings) and to `bootGate`.
  - The rules live in `menuGate.ts`: `runGate`, `gateLimits`, `GATE_LIMITS`, `GATE_LIMITS_AUTOMATION`.
- **Never stranded** (fix round). `runGate` catches anything a check or the status report throws and resolves
  'error: <message>'. `prepare` never rejects. `goToMenu` also has a `.catch` before the reveal, as a second guard.
  The reveal (boot screen off, input on) runs first, before the log and the music, still behind the generation and
  current-state check.
- **No input while it is up** (SPEC 7.1):
  - `App.bootHold` stops screen updates.
  - `TitleScreen.arm()` drops a key pressed during the load, so it cannot skip the title unseen.
  - Auto graphics calibration waits for the reveal (`menuStage` is now a getter: true once revealed), so loading hitches
    are not measured.
- **Returning to the menu after a match uses the same gate.** The status starts at 10 % with "Loading Wren…", because
  the hero's parsed file is dropped for the match and read again. A match load still owns the boot screen: `startGame`
  bumps a generation counter, so a stale menu gate never reveals over a loading match. The match's "Loading map…" text
  and the `?autostart` boot order are unchanged. SPEC 7.1's between-matches mission text does not exist yet; nothing in
  it changed.
- **Title music** starts at the reveal, as the title appears:
  - `goToMenu` only decodes the theme (`Music.preloadMenu`) and fades any mission music out;
  - `app.music.menu()` runs at the reveal;
  - a key pressed during the load unlocks audio, so the theme starts at the reveal.

## Files
- New:
  - `src/world/menuGate.ts`: pure gate rules;
  - `tests/menuGate.test.ts`: 10 tests (gate order, a throwing check resolves 'error', the bytes keep it waiting past
    40 s and then the 12 s stall, the 120 s cap, the automation cap and `?bootCap`);
  - `scripts/menu-boot-shots.mjs`: GPU load-screen and reveal capture;
  - this file.
- Changed:
  - `src/main.ts`: the gate in `goToMenu`, the generation counter, the music at the reveal;
  - `src/world/menuScene.ts`: `prepare`, `drawReady`, `tick`, the `heroLod` / `heroLodWanted` / `bootGate` hooks,
    `menuStage` as a getter, and chain / failure tracking in `setAvatar`;
  - `src/operators/runtime/figure.ts`: `closeUpLod`, and the streamed byte count (`operatorBytes`, `readCounted`);
  - `src/operators/runtime/playerFigure.ts`: `loadMenuLods` returns its chain promise;
  - `src/weapons/weaponModel.ts`: `meshPending`;
  - `src/weapons/weaponMesh.ts`: the optional `failed` callback;
  - `src/core/app.ts`: `bootHold`;
  - `src/ui/screens/titleScreen.ts`: `arm()`;
  - `src/audio/music/music.ts`, `src/audio/score/game/gameMusic.ts`: `preloadMenu`;
  - `src/styles.css`: the 0.6 s fade;
  - `scripts/e2e-menus.mjs`: after boot it logs the gate reason, then asserts:
    - the gate is 'ready', or a 12 s automation cap expiry ("cap of 12 s"). Under `?gfx=min` on SwiftShader I could not
      measure whether the shaders finish in 12 s (no e2e run here), so a cap expiry is logged, not failed. An error, a
      stall or a stranded hold fails;
    - `heroLod === heroLodWanted`;
    - no input hold.

    #18's condition wait is untouched;
  - `scripts/menu-shots6.mjs`: its log line prints the LOD drawn;
  - `scripts/menu-boot-shots.mjs`: `bootCap=60`, one shot per status line (not per megabyte).
- Not touched: CT Core's and Sector Ops' files.
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified (line endings only, as in slices 3 and 6). It is
  not mine: leave it out of the commit.

## Tests and results
- After the fix round:
  - `npx vitest run tests/menuGate.test.ts tests/operatorsRuntimeFigure.test.ts tests/menuShots.test.ts tests/menuPoses.test.ts`:
    31 passed.
  - `npm run check`: passed.
    - Lint: 0 errors, 41 warnings, all the existing `no-console` warnings in scripts.
    - Tests: 157 files, 1759 passed, 1 skipped.
    - Build: passed.
- Not run (job lead's runner): the logic e2e. The menu boot now waits for the gate, so run:
  `smoke e2e-menus e2e-mouse e2e-pad e2e-desktop e2e-score e2e-feedback e2e-offline e2e-progression`.
  - `e2e-score`: the theme starts at the reveal.
  - `e2e-offline` / `e2e-progression` / `e2e-feedback`: they wait for `#boot.done`.
  - Under `?gfx=min` the gate waits for LOD2, the weapons and the SwiftShader compiles, so boot is a few seconds later
    than before. It is capped at 12 s, and the suites wait 60 s. Check the "load screen gate:" line in the e2e-menus
    log: if it reads a cap expiry there, the 12 s cap is too short for software GL.

## GPU commands (job lead, desktop, when `C:/NightShift/heavy.lock` is free)
Take the lock and free port 4189. Then:
```
cd /c/NightShift/Mobile-Coop-menu-notes
npm run build
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1 &
```
1. **Load screen, the first frame after it (no LOD pop) and a hero close-up with the read-back.** All at the high preset,
   written to `docs/menu-notes/shots/s2-*.png`:
   ```
   E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high node scripts/menu-boot-shots.mjs docs/menu-notes/shots
   ```
   It saves:
   - `s2-load-<status>.png`, one per status line;
   - `s2-reveal.png` and `s2-title-after-fade.png`;
   - `s2-closeup-H1.png`.

   It prints:
   - the status lines with their times;
   - the reveal time and the gate result;
   - the LOD drawn / wanted on every frame for 4 s after the reveal. It must read only `hero/hero`.

   It exits 1 if:
   - the gate did not report 'ready';
   - the title is not on top;
   - any frame after the reveal is not the hero;
   - the H1 close-up is not the hero.

   Repeat at `SHOT_GFX=auto` if you want the default path.
2. Optional, the slice 3 sheets with the read-back in the log ("drawn hero"):
   ```
   E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high SHOT_PREFIX=s3 node scripts/menu-shots6.mjs docs/menu-notes/shots T2,H1,H2,H3,H4,H5,H6,W1,W2
   ```
3. Stop the preview server, free port 4189 and release the lock.

## What Michael should try
- A cold launch: the NIGHT / SHIFT screen stays up with "Loading Wren…", "Loading weapons…", "Preparing shaders…",
  then fades into the title. The title close-up should be sharp from the first frame and never swap models. The music
  starts as the title appears (or on your first key if the browser blocks autoplay).
- Press keys during the load screen: the title must still be there after it.
- Quit a match to the menu: the same screen shows briefly, then the menu.
- In the main menu close-ups, Wren is always the full hero model.

## Open / polish
- A slow first download (GitHub Pages, about 80 MB for the hero and the play LODs) now waits while bytes arrive, up to
  120 s. Past that, or after a 12 s stall, the menu shows with the lower LOD and swaps when the hero lands.
- The loadout / lobby stage (shadows on) compiles its shaders on the first visit, not behind the load screen (not in
  the note).
- Leaving the co-op lobby rebuilds the menu, so the load screen shows again there too.
