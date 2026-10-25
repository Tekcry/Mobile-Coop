# Menu notes - slice 1 (notes 1, 3, 7)

Implementer report, 2026-10-19.

## Note 1: music on the title screen

Found:
- `app.music.menu()` runs in `goToMenu`, but `GameMusic.menu()` waited for the AudioContext to exist
  (`audio.whenReady`) and only then started fetching and decoding the menu theme (2.9 MB of mp3, head plus loop).
- The context was created on the first key / click (and on an input-mode change). So with a keyboard or mouse the
  title press both unlocked audio and dismissed the title, and the theme arrived a second or two later on the main
  menu: nothing was ever heard on the title screen.
- With a pad, the input-mode event only called `ensure()` (creates the context, no `resume()`), and a pad button is
  not a user gesture in Chromium, so the context stayed suspended until the first key or click.

Changed:
- `GameMusic.menu()` starts decoding the menu theme at once (OfflineAudioContext, no gesture needed) and asks the
  context to run at once (`audio.unlock()`). Where the browser allows autoplay (Chrome's media-engagement rule, the e2e
  autoplay flag) the theme plays on the title with no input. Otherwise the first key, click or pad button (the title
  press or any earlier input) starts it, and the decoded theme is already waiting, so it begins at that press.
- `AudioEngine.unlock()`: ensure plus `resume()`. The gesture listeners and the input-mode event use it.
- `AudioEngine.pollPad()`, called each frame from `App` only while the context is not running: a pressed pad button
  calls `unlock()` (works in browsers that count a pad press as activation; costs nothing once running).
- No double start: `menu()` keeps its `menuV` guard and is called once per `goToMenu`; dismissing the title does not
  call it again. Score assets unchanged (the existing bundled score, no new files).
- Known limit: a browser with no autoplay allowance and a pad-only player hears the music from the first key or click
  (Chromium does not let a pad press start audio). Without autoplay a console warning "AudioContext was not allowed
  to start" can show once at boot in a normal browser (not under e2e, which launches with the autoplay flag).

## Note 3 (A1): no way back to the title

- `MainMenuScreen.onBackToTitle` removed; `onBack()` returns true and does nothing.
- The main menu legend shows only Select (no Back item).
- `main.ts` no longer wires it; the title still shows once per launch.

## Note 7 (A2): one Controls place

- Pause menu "Controls" item removed (and its `ControlsScreen` import); Pause > Settings now describes "Controls,
  gameplay, graphics, audio and accessibility."
- Settings has a single Controls tab, first, with Remap controls, hold / toggle, controller and mouse sensitivities.
  No other tab duplicates the keyboard panel (the "Settings > Mouse & Keyboard" line in `docs/systems/ui.md` is
  stale: that tab does not exist). The main menu has no Controls entry.
- `docs/systems/ui.md` lines 31-35 still describe the old places (Settings > Accessibility, Mouse & Keyboard, Gameplay
  hold / toggle); left for the End docs step.

## Files

- `src/audio/audioEngine.ts` - `unlock()`, `pollPad()`
- `src/audio/score/game/gameMusic.ts` - menu theme preload, unlock at `menu()`
- `src/core/app.ts` - mode event uses `unlock()`; per-frame `pollPad()` while not running
- `src/main.ts` - Back-to-title wiring removed
- `src/ui/screens/mainMenu.ts` - Back no-op, legend without Back
- `src/ui/screens/pauseScreen.ts` - Controls item removed
- `scripts/e2e-menus.mjs` - root menu: no Back legend item and Esc stays; pause items list without `controls`
  (two small blocks; #18's slider hold untouched)

e2e-pad, e2e-mouse and e2e-desktop already reach remap through Settings > Controls: no change needed.

## Results

- Vitest: score, music, ui, settings files pass (45 tests).
- `npm run check`: pass (lint 0 errors, 156 files / 1747 tests, build ok).
- e2e not run here (heavy.lock held elsewhere). To run: smoke, e2e-menus, e2e-score, e2e-mouse, e2e-desktop, e2e-pad.
- Working tree also shows `tests/zzMenuProbe.test.ts` (untracked) and `tests/__snapshots__/visionIsolation.test.ts.snap`
  (modified): not from this slice (the parallel implementer's or a line-ending touch); the job lead decides.

## What Michael should try

1. Launch the game fresh. On the "press any key" screen: if the music is not already playing, press any key, click or
   press a pad button; the theme should start on the title, before you reach the main menu, and carry on into the menu
   without restarting.
2. On the main menu press B / Esc / Backspace: nothing happens, and the bottom legend shows only Select.
3. Pause in a mission: no Controls item. Settings > Controls (first tab) has Remap controls, hold / toggle and the
   sensitivities.
