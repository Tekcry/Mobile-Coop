# Menu notes - slice 4c (M3: the goggle flickers in full darkness first, then the main menu)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. No e2e or GPU run here (the job lead runs them): every visual
result is "pending PC run".

Michael (M3): "Goggles should flicker in full darkness first, then main menu".

## What changed
- **The press no longer pops the title.** It enters a press sequence (`ts-seq`): the prompt, the NIGHT SHIFT wordmark,
  the slash and the version fade out over 0.35 s (CSS opacity on `.ts-card` and `.version`), and the title's gradient
  goes clear at once (the stage is black then). The title stays on top as a clear layer and takes every input, so the main
  menu stays `hidden`: no list, legend, tagline or version.
- **The stage strikes as before.** `screenContext` reads a title with `ts-seq` as `main`, so the director runs the
  slice 4a ignite on T1 unchanged: 2.4 s flicker, 0.6 s goggle alone, 1.8 s light rise (`IGNITE_S` = 4.8 s).
- **The menu fades in as the lights come up** (decision, see below): over the last 0.6 s of the rise (`MENU_IN_S`) the
  main menu is unhidden under the title and its opacity eases 0 to 1, ending as the lights reach full. When the director
  reports done (`titleLeftS` 0, T2 has opened), the title pops: the main menu takes input with Sector Ops focused. The
  brightness calibration (first run, not under automation) follows, as before.
- **A3 skip.** A second press (any key, click, pad button) during the sequence calls `MenuState.skipTitle()` (the
  director jumps to `igniteT = IGNITE_S`, so the next frame is lit, flicker done, T2) and shows the menu at once.
- **The dismissing press is not the skip.** One press can reach the title several ways (the keydown listener, the action
  edge through FocusNav's confirm, a button click that bubbles to the screen); a press within 250 ms of the one that
  started the sequence (`SKIP_GUARD_MS`) is ignored. The skip pops the title inside `ScreenManager.update`, before the
  frame's edges are consumed, so the skip press never reaches the main menu (FocusNav focus is class-based; Space is
  `preventDefault`ed, no native click).
- **Music unchanged:** it still starts on the press (slice 1 / 4a). Nothing in the audio path changed.
- **Launch only, as before:** the sequence exists only when the title is shown (once per launch; not after a match, not
  under automation without `?title=1`, not with `?autostart`). Those paths construct no title, so no sequence.
- **Never stranded:** the sequence's own clock ends it at `IGNITE_S + 2 s` even if the stage never reports done (the
  stage's `debugPause` holds that clock so GPU stills are not cut short); a wall-clock guard past the same length ends it
  if the frames themselves stop for a second; every stage call in the sequence is in a try/catch that falls through to
  showing the menu. Reduced motion: the director is lit at once, so the title pops on the next frame and the menu fades in
  over 0.3 s.
- After the fade the main menu keeps `animation: none` inline until it is next covered (then cleared), so the usual
  `screen-in` slide does not replay over the fade.

## Decisions
- **Menu fades in during the last 0.6 s of the light rise, not after it.** It reads as one movement (the light comes up
  on Wren and the menu with it), and the menu is fully in exactly as the lights are, so input opens with nothing still
  moving. Change `MENU_IN_S` in `src/ui/titleSequence.ts` (0 = right after the lights).
- Skip guard 250 ms; wordmark fade 0.35 s; fallback +2 s.

## Files
- New: `src/ui/titleSequence.ts` (pure: `TitleSequence`, `MENU_IN_S`, `SKIP_GUARD_MS`, `FALLBACK_S`, `TITLE_OUT_S`),
  `tests/titleSequence.test.ts` (5 tests: reveal window then finish; the dismissing press is not a skip, a later one is;
  the fallback; a paused stage holds it; an already-lit stage finishes at once).
- `src/ui/screens/titleScreen.ts`: `TitleSeqHooks`, the press sequence, skip, fallback guard, `seqPhase` debug getter.
- `src/main.ts`: `screenContext` (`ts-seq` reads as main), the title's hooks (`titleLeftS`, `debugPause`, `skipTitle`) and
  `revealMenu` (unhide under the title with an opacity fade, or at once).
- `src/world/menuShots.ts`: `Director.titleLeftS`, `Director.skipTitle()`.
- `src/world/menuScene.ts`: `MenuState.titleLeftS`, `MenuState.skipTitle()`.
- `src/styles.css`: `.title-screen.ts-seq` (clear background; card and version fade out).
- `tests/menuShots.test.ts`: one test (the countdown and the skip to the lit T2; a skip with no title does nothing).
- `scripts/e2e-menus.mjs` (the `?title=1` block only): after Space, the title stays on top in `seq`, the main menu
  hidden, the card faded; then waits for the main menu on top (not right after the press) with the lights up and T2.
  #18's condition wait untouched.
- `scripts/e2e-pad.mjs`: one separate block (own launch with `?title=1`): pad A starts the sequence (title on top, no
  menu, not a skip); a second A 0.4 s later skips to the lit main menu with Sector Ops focused and nothing opened.
- `scripts/menu-boot-shots.mjs`: the strike section (below).
- e2e-mouse, e2e-desktop, smoke, e2e-score, e2e-offline: no title assumptions (they run without `?title=1`); unchanged.
  The old `menu-shots.mjs` / `menu-shots3.mjs` call `continue()` then wait for `.main-menu:not([hidden]) .ms-item.focused`
  (default 30 s), which now resolves after the sequence: unchanged.
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified (line endings only, as before): not mine.

## Results
- `npx vitest run tests/titleSequence.test.ts tests/menuShots.test.ts tests/menuGate.test.ts`: 38 passed.
- `npm run check`: pass. Lint 0 errors / 41 warnings (the existing script `no-console`), 162 files, 1806 passed /
  1 skipped, build ok.
- Not run: e2e (logic) and GPU.

## Logic e2e for the job lead
`smoke e2e-menus e2e-pad e2e-score e2e-mouse e2e-desktop`

## GPU command (desktop, `C:/NightShift/heavy.lock` held, port 4189 free)
```
cd /c/NightShift/Mobile-Coop-menu-notes
npm run build
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1 &
E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high node scripts/menu-boot-shots.mjs docs/menu-notes/shots
```
New / changed stills in `docs/menu-notes/shots/` (the boot, prompt and dark-title shots as in slice 4a):
- `s4-press.png`: 150 ms after the press, the prompt and wordmark part-way through their fade (logs the card opacity);
  fails if the sequence did not start or any menu UI shows;
- `s4-flicker-1..4.png` (0.24 / 0.66 / 0.86 / 1.7 s), `s4-flicker-done.png` (2.8 s), `s4-lights-rising.png` (3.9 s),
  each frozen with `debugPause`: fails if any menu item, legend, tagline or version is visible, the menu has opacity, or
  the wordmark still shows;
- `s4-menu-in.png`: the main menu fading in under the title as the lights finish (taken at once, not paused; logs the
  menu opacity and the light level);
- `s4-menu-first.png`: the first full main-menu frame (fails unless the menu is on top, opacity 1, lights 1, T2).
Then stop the preview, free 4189, release the lock.

## What Michael should try
1. Cold launch, wait for the prompt, press any key / button: NIGHT SHIFT and the prompt fade out, the screen stays black
   with nothing on it, the goggle flickers on, holds, the light rises on her face and the menu fades in with it.
2. Mash keys during the black: nothing happens on the menu. One more press after the first skips straight to the lit
   menu (Sector Ops focused, nothing opened).
3. The music starts on that first press (or was already playing on the title).
4. Play a match and quit: no title, no flicker, the menu as before.

## Fix round (checker)
- **Enter leaked into the main menu after a mouse start** (the click gave the prompt DOM focus; Enter then clicked it
  natively inside keydown, the skip popped the title outside `ScreenManager.update`, and the same Enter's confirm edge
  opened Sector Ops). Fixed in `titleScreen.ts` only: clicks (on the prompt and on the screen) no longer act in their DOM
  event, they queue and `update()` continues inside `ScreenManager.update`, before the frame's edges are consumed; the
  prompt's `mousedown` is `preventDefault`ed (no DOM focus from the mouse) and `startSeq()` blurs anything focused inside
  the title. Pad, Space, other keys and click skips go through the same queue: unchanged.
- The wall-clock stall threshold is now 2.5 s (`STALL_MS` in `titleSequence.ts`) for software-GL frames under load.
- `scripts/e2e-menus.mjs`: one small block after the `?title=1` block (own launch): click the prompt, Enter 0.4 s later ->
  main menu on top, `screens.depth === 1`, Sector Ops focused, lights done. (Not unit-testable: DOM focus and events.)
  The job lead's line 100 edit (`mm.n >= 6`) is kept.
- Results: the two Vitest files 28 passed; `npm run check` pass (lint 0 errors / 41 warnings, 162 files, 1806 passed /
  1 skipped, build ok). No e2e or GPU run.

## Open / polish
- If the fade-in should come strictly after the lights, set `MENU_IN_S` to 0 (the menu then fades over 0.3 s after T2
  opens, with input live during that fade).
