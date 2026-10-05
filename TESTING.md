# Manual device test checklist

Run on your phone (and MFi controller where noted). Tick each item. Use `?debug=1` to show the FPS overlay,
or tap with three fingers.

## Phase 1 - Scaffold
- [ ] Open the GitHub Pages URL in Safari (iOS) / Chrome (Android). Boot bar fills, physics boxes fall and settle.
- [ ] Portrait: "Rotate your device" overlay shows. Landscape: it hides.
- [ ] Three-finger tap toggles the debug overlay. FPS reads 58-60 with mostly green bars.
- [ ] Add to Home Screen. Launch from the icon: icon is the orange crosshair, app opens fullscreen with no browser bars.
- [ ] Airplane mode, close and relaunch the installed app: it still boots and runs (offline precache).
- [ ] Pinch and double-tap do not zoom the page. Long-press shows no context menu.

## Phase 2 - Input and menus
Touch:
- [ ] Main menu: tap Settings; tabs switch by tap; sliders drag; toggles and choices change; the round back button (top right) closes it.
- [ ] Controls test: left thumb anywhere on the left 40% spawns the stick; readout `move` follows. Push past the rim forward shows `sprint`.
- [ ] Right thumb drag on the right side changes `look yaw/pitch` while the left thumb moves (true multi-touch).
- [ ] Hold Fire and drag: `fire` held and look changes at the same time.
- [ ] Every button shows in `held` when pressed. Pause button opens the pause menu; Quit returns to menu.
- [ ] Settings > Touch > Edit button layout: drag controls, Larger/Smaller, Reset all, Done. Layout persists after app restart.
- [ ] Opacity and Size sliders change the in-game buttons.

MFi / Bluetooth controller:
- [ ] Pair controller, open app, press any button: "Controller connected" toast appears, yellow focus ring appears, prompts show A/B (or ✕/○ for DualShock/DualSense).
- [ ] D-pad and left stick move focus in the main menu; A opens Settings; LB/RB switch tabs; left/right adjust sliders and choices; B backs out to the main menu with focus restored.
- [ ] Settings > Touch > Edit button layout with the controller: A grabs a control, d-pad moves it, LB/RB resize, A drops, B exits.
- [ ] Controls test: touch controls hidden while using the controller; sticks and every button appear in the readout; Start opens pause; B resumes; Quit flow works by controller only.
- [ ] Settings > Controller > Test vibration rumbles (where the browser supports it; iOS Safari currently does not).
- [ ] Turn the controller off: "Controller disconnected" toast; touching the screen shows the touch controls again.
- [ ] Touch the screen while a controller is connected: touch controls reappear; press a controller button: they hide.
