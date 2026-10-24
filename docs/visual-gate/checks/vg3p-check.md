# VG3p viewpoints polish check

Verdict: PASS

Checked `feature/visual-gate-vg3p` @ 5472f686 (base d9d347e8) against `briefs/visual-gate-vg3-polish.md`, `vg3-check.md` polish list, PLAN section 2 / 3. Sonnet checker.

## Must-fix
None.

## What was verified
- Sizes: `npx vitest run tests/visualGateViewpoints.test.ts tests/visualGateHarness.test.ts --maxWorkers=2`: 36 passed. `npm run typecheck:fast`: clean.
  Independent scan of all 47 regions (44 view regions + 3 rig leaks) through the test's own `projected()` helper at 960 x 540: 3 outside >= 60 x 60 in frame: so-s1-goods-in.floor 220 x 43 (named SMALL, test requires >= 40; min width 27), and the so-door / cp-door leak quads (604 x 587, y -47 = top off frame; the test checks size only).
  Every other view region is >= 60 x 60, inside the frame, not behind the camera; walls also keep >= 60 px min width (test).
- Test enforces: the new test against `git show d9d347e8:scripts/visual-gate/viewpoints.mjs` (temp swap, restored with `git checkout --`, tree clean): 2 fail ("drops upper..." and the size test, first hit m-a1-lounge.upper y -41). Same scan on the old data: 53 regions, 27 bad (25 view regions + the two rig leaks), so the test would catch every item on the vg3-check polish list. New data: 0 view regions bad except the SMALL one.
- Dropped regions carry no rule: dropped uppers m-a5-kiosk, cp-s1-b, cp-s1-f, so-s2-aisle and floors so-s1-girder, so-s1-workshop, so-s3-hall. Their views' rules are `whole.*` only (m-a5), `{}` (cp-s1-b, cp-s1-f, so-s2-aisle, so-s3-hall), `upper.*` on so-s1-girder (upper kept), `wall.arc` on so-s1-workshop (wall kept). `known` null on all. Metrics lists updated (no `upper: ['haze']` / `floor: []` left on a dropped region).
- F-target regions still present: F1 so-s1-goods-in.upper + so-s1-girder.upper; F2 so-s1-goods-in.floor; F4 so-s1-workshop.wall; F5 so-door / cp-door leak; F5b so-corner leak; F6 `whole` on all 9 m-* (parity unchanged); F7 m-a3-lobby.wall; F8 cp-s2-b.upper, cp-s2-d.upper, cp-s3-a.upper. Rules keys unchanged vs d9d347e8.
- Refs read at origin/master 833db92e (no change under `src/world/maps` since the builder's 46a7cf85):
  - `ctcourseSets/facility.ts:159` `{ axis: 'x', at: 20, ..., kind: 'gal' }` (the wall m-f-gallery faces); `:293` `band(b, w, y0, y1, gaps)` (solid band under the gallery); `:313` `band(b, w, GAL_TOP, HALL_H, [])` (band over the glazing).
  - `campusS3.ts:396` `bx(b, qx0, qx1, 0, 3.0, qz0, qz1, WALL_DARK ...)` (the board screen; :397 blank). Only remaining `:397` is in vg3-build.md D1 (:103, said so at :194): cosmetic.
  - `warehouseS1.ts:268` `wallZ(8, -13.8, -8.8, ...)` east wall, `:269` its lintel, `:275` void east wall box (y 2.8 - 4.8): the so-s1-girder.upper quad x 8.15, z -13.6 to -11, 2.2 - 4.6 lands on exactly these. `:245` compartment wall z -8.8, `:344` catwalk box y 2.8 - 3.0.
  - Skin helper lines a3OfficeRange.ts:387 / :379 / :396, a4GoodsShed.ts:505 / :495, a6PumpHouse.ts:407 / :398, a7DataHall.ts:462 / :454 (the `side` branch matching each wall's facing); warehouse.ts:222 (door head box), :481 (fence end post); campusS2.ts:374, campusS4.ts:356, campusS5.ts:481 / :482.
- Diff touches only viewpoints.mjs, the viewpoints test, vg3-build.md (no gate / harness / metrics / src).

## Open items decided
1. so-door / cp-door leak quad y -47 (top off frame): leave. `maskFromPolygon` clips off-screen points to the raster (metrics.mjs:50), the in-frame part is 587 px tall and the 2.4 m top is the brief's rig rule (door top + 0.3). Test already pins size and not-behind.
2. so-s1-workshop F4 wall crossing the catwalk (warehouseS1.ts:344, y 2.8 - 3.0, z -10.15 to -8.95, x 8.15 - 23.1, between camera and wall): reshape, do not leave. The deck's edges are long hard straight edges, and `arc` counts ridge runs >= 12 px (metrics.mjs:351), so the deck adds a constant ridge baseline to both bad and fixed builds and eats into the margin (arcRatio 1.5, arcAbs 0.01). Geometry from cam (10.5, 1.7, -16): the deck hides wall y ~2.8 - 3.27 (underside 3.03, top at its near edge 3.27). Stopping at 2.7 (lead's number) clears the deck by only ~0.1 m; use **0.3 - 2.6**: quad `[[18.2, 0.3, -8.95], [14.2, 0.3, -8.95], [14.2, 2.6, -8.95], [18.2, 2.6, -8.95]]` projects 261 x 201 px, min width 191, x 56 - 317, y 314 - 514 (checked with the test's helpers), still unoccluded and above any floor clutter at 0.3. Alternative 3.3 - 4.8 (above the deck) if P5 shows the hard arcs sit high on the wall; P5 / VG8 should confirm arcs show in the chosen band on the bad build before thresholds are set. Update the viewpoints.mjs comment and add nothing to the test (size test covers it).

## Held polish (not blocking)
- vg3-build.md :103 (D1) still cites `campusS3.ts:397`; :194 explains. Fix on the next docs touch.
- so-s1-goods-in.floor min width 27 px (bbox 220 x 43): F2 nearBlack is stats only, fine; VG8 may want a wider bay floor if its noise (VG7) is high.
- Thin occluders on unchanged regions listed in O6 (m-a6-kerb.wall 37% cage posts / rails, m-a3-lobby.wall 6% notice boards, wh-flood-workshop.upper 4% fence rail): accept; they are constant between builds.
- Sizes assume the photo camera keeps `CAMERA.fov` 86 at 16:9 (test reads `CAMERA.fov`).
