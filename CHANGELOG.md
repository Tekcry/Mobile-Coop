# Changelog

## 0.2.0 - Phase 2: Input and menus
- Action map with touch, gamepad (standard mapping) and keyboard/mouse sources feeding one `InputState`.
- Touch: floating left stick (push past rim to sprint), right-side look, fire-and-look button, ADS, reload,
  jump, crouch/roll, swap, grenade, interact, shoulder swap, pause. Size, opacity and per-control position
  configurable; drag-to-edit layout editor that also works by controller (grab, move, resize).
- Gamepad: radial dead zones, trigger dead zone, response curves, invert-Y, per-axis and ADS sensitivity,
  aim-assist level setting, vibration with test button. Hot-plug, iOS first-press detection, connect toasts.
- Automatic input-mode switching (touch / controller / keyboard), Xbox and PlayStation glyph prompts.
- Shared spatial focus-navigation system; screen stack; main menu, settings (Touch, Controller, Video,
  Audio, Gameplay tabs), pause menu, confirm dialog, toasts. Bumpers switch tabs.
- Settings stored in IndexedDB, sanitised/clamped on load.
- Controls test bed showing live action state.
- Headless e2e suites: controller-only menu walkthrough and touch multi-touch test (`npm run e2e`).

## 0.1.0 - Phase 1: Scaffold
- Vite 7 + TypeScript 6 (strict) + Babylon.js 9 + Havok physics with locally bundled WASM.
- Fixed-timestep game loop with manual physics stepping.
- PWA: manifest (fullscreen, landscape), procedurally generated icons, Workbox precache of the full build incl. WASM.
- Rotate-to-landscape overlay, fullscreen/orientation-lock helper, browser gesture suppression, safe-area CSS vars.
- Debug overlay (F3 / 3-finger tap / `?debug=1`): FPS, frame-time graph, sim/physics ms, draw calls, resolution.
- GitHub Actions workflow: lint, test, build with repo base path, deploy to Pages.
- Headless mobile-emulated smoke test script.
