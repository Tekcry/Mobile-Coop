# wheel-ui slice 1 - implementer report (2026-10-20)

## What changed
- Size: `fitWheel` (`src/ui/hud/wheelLayout.ts`, pure) gives the diameter `130 + 0.36 x height` px, centred in the
  safe-area box, shrunk so it stays clear of the measured `.hud-top` bottom (compass, area label, objective), the box
  edges and the hint box, with a margin of max(8 px, 2 % of height). Measured on open, on window resize and when the
  hint text changes (no per-frame DOM reads).
  - 1920 x 1080: 518 px (before: 420 px ring with 84 x 64 tiles, about 430 px across, plus the vision stack above it).
  - 2170 x 1000 (2.17:1): 490 px. 844 x 390 phone landscape: about 250 px (top band limited; before a 273 px ring with
    fixed-size tiles that reached into the top HUD). Portrait / narrow: the hint moves under the ring, the wheel shrinks.
- Look: SVG ring of annular segments (menu palette, `--hl` green, Barlow Condensed), the highlighted one lit, lifted
  (scale 1.045) with an outer accent edge, the current gun / gadget / active vision with an inner accent bar, empty ones
  dimmed. Each item: inline SVG icon + count (`x3`, `loaded/reserve`; guns also a 3-letter tag). The vision slot shows
  its mode (the carousel's mode while highlighted, else the selected one) and an NV / TH / EM row: carousel mode filled,
  selected mode underlined. The item name and kind moved from right of the ring into the centre disc. All sizes inside
  scale with `--sw-d`. No new assets.
- Hint box: left of the ring at fixed width min(24ch, box - 16 px), font clamp(11 px, 1.45 vh, 18 px).
- FPS banner: from the top centre to flush in the bottom left corner (`.debug-overlay.compact`); the weapon panel is
  bottom right in play, menu legends sit above it. Settings text updated.
- Per frame: change detection now compares fields and an Int32Array of counts (no key string built each frame); glyph
  HTML rewritten only when an item's glyph changes. `selectionWheel.ts` untouched.
- `scripts/archive/wheel-shots.mjs`: port / exited-server / served-index guard from nv-shots; Marlow Yard, FPS banner on, wheel
  held open with the flashbang highlighted; `<dir>/wheel-<suffix>-<w>x<h>.png` at 1920x1080 and 2170x1000. Not run.

## Files
src/ui/hud/gadgetWheel.ts, src/ui/hud/wheelLayout.ts (new), src/styles.css (wheel block, banner), src/ui/debugOverlay.ts
(comment), src/ui/screens/settingsScreen.ts (banner text), scripts/archive/wheel-shots.mjs (new), scripts/e2e-gadgets.mjs,
tests/wheelLayout.test.ts (new), docs/systems/gadgets.md, CHANGELOG.md.

## Tests
- New `tests/wheelLayout.test.ts` (5): 1080p size, 2.17:1 and phone fit, narrow hint-below, top band shrink, sector path.
- e2e-gadgets: new assert that the open ring fits the window, sits under `.hud-top`, clears the hint, one segment per
  item. e2e-pad / e2e-menus: no change needed (`.selection-wheel`, `.sw-tile`, `.sw-label-name` kept).

## Results
- `tsc --noEmit` clean; eslint clean on touched files; vitest wheelLayout + selectionWheel 13/13.
- Skipped: `npm run check` and e2e (smoke, e2e-gadgets, e2e-pad, e2e-menus): heavy.lock held by Course Ready Build
  (movement priority). GPU before / after shots: job lead.

## Assumed (undo)
- A1 label in the centre disc instead of right of the ring (move `.sw-label` out of `.sw-ring`).
- A2 FPS banner bottom left (revert `.debug-overlay.compact`).

## What Michael should try
Hold LB / Tab on a phone in landscape and on the desktop: the wheel fits under the compass, the hint at its left;
sweep the stick, A / E on the vision slot steps NV / TH / EM; Settings > Show FPS overlay: banner bottom left.
