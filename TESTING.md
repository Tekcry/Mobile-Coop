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
