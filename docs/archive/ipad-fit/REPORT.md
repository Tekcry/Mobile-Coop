# ipad-fit report

Branch feature/ipad-fit, base origin/feature/ctcore-batch-23 58368e10. UI only.

## What
1. Version label: `.version` (main menu / title) now `right: calc(28px + var(--sar))`, `bottom: calc(26px + var(--sab))`; the base rules add the same margins. `--vh` follows `1dvh` (`@supports`), so the menu frame (`.screens`, boot frame) is the visible height, not the Safari large viewport that pushed the label below the edge. `.ms-scroll` max-height uses `--page-h` (100dvh / 100%) instead of `100vh`.
2. Dark strip: html/body use `100dvh` (100% fallback); the screens frame fills the visible viewport through `--vh`. Insets are 0 on desktop and dvh = vh there: unchanged. Not verifiable on a real iPad here (cause inferred from 100vh vs visible viewport).
3. GPU banner: `isWindowsPlatform(ua, platform)` and `runningOnWindows()` in src/core/display.ts; app.ts toast returns early when not Windows; the settings GPU note keeps "This is the integrated GPU." and shows the Windows Settings sentence only on Windows.
4. `.ps-room`: wraps (`white-space: normal; overflow-wrap: anywhere`), own block in the free column right of the list (x 476, width 280), so it never touches the help box (which sits under the list). Same 1280x720 frame at every window size, so 1024x768 / 1180x820 / 1366x1024 / 1280x720 share the layout.

## Decisions
- A1 Windows detection by UA / platform string. Undo: drop the `runningOnWindows()` checks (app.ts, settingsScreen.ts).
- A2 No touch controls or other tablet work.
- Room line placed beside the list (not above it): the list already runs close to the help box at 570, so stacking above or below pushed one into the other.

## Files
src/styles.css, src/core/display.ts, src/core/app.ts (one-line gate, per the brief), src/ui/screens/settingsScreen.ts, tests/displayPlatform.test.ts, scripts/e2e-menus.mjs (version label inside viewport; room line inside viewport and clear of the help box), docs/ipad-fit/*, changes/feature-ipad-fit.md, TESTING.md.

## Tests
- tests/displayPlatform.test.ts 2 pass; tests/display.test.ts 9 pass; tsc clean; eslint clean on touched files.
- e2e-menus pass (73 s), e2e-desktop pass (3 shards), desktop lane heavy.lock, port 4191, E2E_GPU=1, E2E_JOBS=1.

## Open
- Needs a check on a real iPad (bottom strip, label, pause room line in a co-op room).

## Changelog line
iPad display fit: version label on screen, no dark bottom strip, GPU banner Windows only, pause room line wraps.
