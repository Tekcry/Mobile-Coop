# Night vision pass - slice 2 report (implementer, 2026-10-20)

The goggle outline, wide and thin (Michael: "expand the goggle outline to be less intrusive and show more of the
screen, it feels claustrophobic"). Built on slice 1 in the working tree. Code and unit tests only; no build, no e2e, no
GPU (desktop heavy.lock held). Nothing committed.

## What was built
- One goggle frame for night, thermal and electro: a rounded rectangle the shape of the screen (signed distance in
  screen heights, so the dark band is equally wide at the sides and at the top at any aspect). Full brightness until
  0.06 screen heights inside the frame line, a soft smoothstep falloff to a floor of 0.3 at 0.1 outside it: the edge
  midpoints dim only to about 0.78, only the very corners reach 0.3. A thin, faint rim (0.004 wide, 0.008 inside the
  line, tint about half the old one) traces the frame; it shows mostly round the corners.
- Replaces F1b's round lens ring (all modes) and the two per-mode eyepiece vignettes (NV, thermal / electro). The frame
  now fades in with the night-vision blend (`gk = vk > 0.5 ? 1 : nv`); before, the lens ring showed at full strength
  for any `nv > 0`.
- The settings vignette (0.35) is unchanged.
- Constants in one table, `GOGGLE_FRAME` in `src/vfx/visionLook.ts`; pure `goggleEdge`, `goggleShade`, `goggleRim`,
  `goggleFrame`; GLSL mirror `GOGGLE_GLSL` built from the same table (the `VISION_GLSL` pattern). The rim's smoothstep
  is written with ordered edges (`1 - smoothstep(0, w, x)`), as GLSL leaves reversed edges undefined.

## Constants, old -> new
| Item | Old | New (`GOGGLE_FRAME`) |
| --- | --- | --- |
| Shape | circle, `le = (uv-0.5)*(min(aspect,1.8),1)` | rounded rect the shape of the screen, `radius` 0.32 screen heights, frame line on the screen edge (`over` 0) |
| Clear area (factor > 0.9) at 16:9 | about 44% (circle 56% of the width) | 88.9% (4:3 86.7%, 21:9 90.5%) |
| Falloff | eyepiece `smoothstep(0.8, 0.52, r)` plus lens `smoothstep(0.455, 0.5, r)` | `fadeIn` 0.06 (inside) to `fadeOut` -0.1 (outside the line), smoothstep |
| Floor | 0.06 eyepiece x 0.51 lens | `floor` 0.3 (corners only); edge midpoints 0.78 |
| Rim | at r 0.468, width 0.012, tint (0.05, 0.09, 0.08) | `rimAt` 0.008, `rimWidth` 0.004, `rimTint` (0.03, 0.05, 0.045) |
| Fade with the NV blend | lens no, eyepiece yes | the whole frame, yes |

## Files
- `src/vfx/visionLook.ts`: `GOGGLE_FRAME`, `goggleEdge`, `goggleShade`, `goggleRim`, `goggleFrame`, `GOGGLE_GLSL`.
- `src/vfx/cinematicPost.ts`: injects `GOGGLE_GLSL`; the NV and thermal / electro eyepiece lines and the lens block go,
  one frame block replaces them.
- `tests/goggleFrame.test.ts` (new).

## Tests
- New `tests/goggleFrame.test.ts`: clear share > 0.9 at 16:9 >= 0.8 (and < 0.97: still a frame), 4:3 and 21:9 >= 0.8;
  centre 1; corners 0.25-0.5; edge midpoints > 0.6; portrait screen sane; band equally wide at side and top; monotone
  centre to corner; `fadeIn` / `fadeOut` / `floor` limits; thin, faint rim; GLSL mirrors every constant; the cinematic
  source uses `GOGGLE_GLSL` / `goggleShade` and no longer has the old lens (`0.455`) or eyepiece (`smoothstep(0.8, 0.52`).
- grep of `scripts/` and `tests/` for asserts on the old lens or eyepiece: none (the "lens" hits are the goggle model's
  lens glow, unrelated). Nothing else changed.

## Results
- `npx vitest run tests/goggleFrame.test.ts tests/nightVision.test.ts tests/vision.test.ts tests/darkCurve.test.ts
  tests/visionIsolation.test.ts`: 5 files, 40 tests passed.
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the 3 changed files: clean.
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified (line endings only, rewritten by vitest): left
  for the lead to reset.
- Not run (lock held): `npm run check`, build, any e2e, GPU.

## What the GPU sheet should show
1. NV, thermal and electro: almost the whole screen clear; a soft darkening only in a thin band at the edges, deepest
   in the rounded corners (about 30%, plus the settings vignette); no tunnel, no hard circle.
2. A faint thin line following the rounded corners (barely visible along the straight edges). Too faint: raise
   `rimTint`; too strong or busy: lower it or `rimWidth`.
3. Still reads as a goggle. Too subtle: raise `radius` (0.38 -> about 85% clear) or `fadeIn` (0.08); too heavy: lower
   `radius` or move `fadeOut` out (-0.12).
4. Flipping the goggles: the frame fades in with the night-vision blend, no pop of a ring.

## Risks
- The settings vignette (0.35, unchanged) stacks on the frame: the corner pixel ends near 0.3 x 0.65 = 0.2 with it on.
- Ultrawide (21:9) and 4:3 follow the screen's shape; untested on GPU. Portrait (phone min-settings launch) works by
  clamping the radius.
- Identity: the frame is much quieter than the old lens; if Michael wants more "goggle", the corner radius and rim
  are the knobs.
- The cinematic shader source test reads `cinematicPost.ts` as text (importing it pulls in Babylon); a reformat of the
  shader line `goggleShade(ge)` would need the test updated.
