# wheel-ui slice 1 - check (fresh checker, 2026-10-20, on d8c69347)

## Verdict: PASS
Inputs: BRIEF, SLICE1, `git diff 1805f43d..d8c69347 -- src tests scripts`, the 4 GPU shots, the job lead's GPU log facts.

- Size: 420 -> 518 px (1920x1080) and 490 px (2170x1000): "slightly bigger" met. At both sizes the ring top (~285 / ~255 px) is far below the compass, the hint sits left with a wide gap, nothing touches the objective block or the minimap. Phone fit is unit-tested only (~250 px at 844x390), no shot.
- Look: a real radial ring (annular SVG segments, gaps, centre disc with name + kind), not boxes. Highlight lifts and lights, current gun / gadget carry an inner bar, each slot has icon + count (guns icon + tag + loaded/reserve). Vision slot shows the mode plus an NV / TH / EM row (selected underlined). Original art, our palette and font.
- FPS banner: bottom-left corner, covers nothing at either size; hint stays above its band.
- G181: `selectionWheel.ts`, `gameState.ts` and input untouched; the diff is view-only. e2e-gadgets / pad / menus PASS on d8c69347.

## Frame time with the wheel open (58 -> 51 fps, 17.2 -> 19.6 ms)
Not attributable to the new code on inspection; treat as unconfirmed (one sample each, before always run first).
- Per frame while open and unchanged, `update()` only compares fields and an Int32Array, then returns: no DOM writes, no style writes, no layout reads. `layout()` (3 rects + 5 custom props) runs only on open, window resize, hint change or a `.hud-top` resize; `.hud-top` children change size only on text changes (compass is fixed width, yaw is a transform), so the ResizeObserver does not fire per frame.
- Glyph HTML and counts are written only on change; `build()` only when the slot count changes. Old code rebuilt every tile's innerHTML on any change, so the new path does less JS.
- The only new render cost is static: a larger overlay area and one `filter: drop-shadow` on the highlighted segment, rasterised once per change, then composited.

## Polish (non-blocking)
1. Re-sample the perf: alternate before / after 3x each, same spot, 10 s each; if after is still >1.5 ms worse, the first lever is `src/styles.css` `.sw-seg.hl`: drop `filter: drop-shadow(...)` (the lit `.sw-edge` already marks it). Done looks like: the wheel-open frame time within 1 ms of master.
2. A phone landscape shot (844x390) to confirm the ~250 px fit under the compass, since Michael tests on the phone.
3. Vision slot shows the mode twice (sub tag "NV" and the NV/TH/EM row); the sub tag could go.
