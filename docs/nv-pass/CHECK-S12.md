# Night vision pass - check, slices 1-2 (fresh checker, 2026-10-20)

Commit checked: 75c37d42 (code) on feature/nv-pass, HEAD d4b9edb4. Read: CLAUDE.md (current goal, hard rules), BRIEF,
PLAN, SURVEY, STATE, SLICE1, SLICE2, G69 / G99 / G100 / G101 / G169 / G181, the diff `cf73f8b5..HEAD -- src tests
scripts`, the six sheets and the single shots (plus pixel statistics of all 108 single shots, measured headless in a
canvas, no GPU).

## Verdict: FIX

The code holds up. Light parity is clean, bodies no longer glow, the tube is clearly green, and the frame is wide.
There are four blockers:
1. **The "before" sheets do not show master.** The comparison has to be redone before anything goes to Michael.
2. **e2e-darkness fails on the GPU.** The target is stale. Decision below.
3. **The dark is not readable at both ends.** A fully unlit area is a flat murk, and an Epic moonlit wall whites out.
   Both need a frame-level auto-gain.
4. **`?gfx=min` night vision is darker than off in 2 of the 9 views.**

## Checks (desktop, heavy.lock taken 17:04 as "nv-pass checker", released at the end; software GL)

| Run | Result | Time |
| --- | --- | --- |
| `npm run check` (lint, tests, build) | PASS: lint 0 errors (41 warnings, all existing `no-console` in scripts); 179 files, 1972 tests passed, 2 skipped; build ok | 122 s |
| `visionIsolation.test.ts` | PASS, unchanged. Vitest rewrote its `.snap` with LF line endings again; `git diff --ignore-cr-at-eol` is empty, so there is nothing to commit | (in check) |
| e2e `smoke` | PASS | 30 s |
| e2e `e2e-mouse` | PASS | 122 s |
| e2e `e2e-desktop` | PASS on a solo rerun (`E2E_SUITE_TIMEOUT=900`, 95 asserts ok). Two earlier runs failed: in the 2-job run the suite was KILLED at the default 600 s cap with every assert ok so far (the suite takes about 553-663 s solo, testing-tools.md); the first solo rerun failed after 49 s with "the result is saved as a performance note without a tap" (the benchmark save; the same assert passed in the 2-job run; nothing in the diff touches feedback, UI or the benchmark). Benchmark-save flake: worth a line in backlog "Flaky e2e suites" | 663 s |
| e2e `e2e-stealth-ai` (vision-detect: light parity) | PASS | 134 s |
| Total e2e (port 4191) | all 4 suites PASS; 1446 s in all (734 s 2-job run + 49 s + 663 s solo reruns of e2e-desktop) | |
| e2e-darkness (GPU, from STATE, not rerun) | FAIL: "epic night vision: level 0.12 shows 13.5% (target 20-45%)"; level 0.7 under NV 89.4% passes | - |

The logic suites ran on software GL, so they support no visual claims.

## Finding 0: the before / after sheets are not a before / after

All 54 off / night pairs in `sheet-before-*` and `sheet-s12-*` are statistically identical. The centre-box mean luma,
the mean rgb and the 8-bin histogram match to within 0.1-1.5 luma in every view and every preset. For example,
yard-s1-bay night epic is mean 84.0 and rgb (44,100,39) in both sets.

The "before" set also already has the slice 1-2 look:
- **The new frame.** yard-s5-backroom-night-before-epic shows the screen-shaped rounded frame with its rim 5 px inside
  the edge. That is `GOGGLE_FRAME.rimAt` 0.008 x 640 px.
- **Flat edges.** The edge band and the inner band have equal luma: edgeL 22.7 vs inL 22.4 at s1-bay. Master's lens
  (`le = (uv-0.5)*(1.8,1)` at the 2:1 viewport, outside r 0.5 x0.51, eyepiece x0.06) would put the side edges at about
  3% of the centre.
- **The new tint.** G/R is about 2.3. The new tint gives 0.85 / 0.35 = 2.4; master's [0.54, 0.64, 0.49] gives 1.2.

`Mobile-Coop-nv-pass-before/dist` itself is master: its bundle has `smoothstep(0.455` and no `goggleEdge`. So the
before run was served another build.

The likely cause: `nv-shots.mjs` only checks that `fetch(URL)` answers. Its own `vite preview --strictPort` exits
silently when 4189 is already taken, and whatever server holds the port answers instead. `nv-gpu.sh` also accepts a
failed after-build as long as an old `dist/index.html` exists.

The s12 set matches HEAD's constants (frame, tint), so it is used below as "slices 1-2". The master baseline is known
only from the code and SURVEY.

## Goal items

**(1) Readable at night: mostly yes; fails at both extremes.**
- **Readable.** Lit and partly lit interiors read well under NV, with geometry, doors and floor edges visible and no
  crushed blacks (under 1% of the centre box below luma 8):
  - yard-s1-bay: mean 84/255
  - yard-s3-camera: 71
  - yard-s5-backroom: 59
  - yard-s7-stair: 68
  - wh-corridor: 71
  - wh-goods-in: 49
  - wh-workshop: 23, dim but the brick wall, crates, guard and door read
- **Murk.** yard-look night (all presets) is a flat dark-green murk: mean 14/255, 98% of pixels below 32. The left wall
  and the rail show; the right wall and the floor do not, so the route is not readable. The off view is pure black.
- **White-out.** wh-yard night Epic: the moonlit wall clips to a pale green-white (mean 196, 67% of pixels above 224)
  and its detail is gone. Medium shows the same view fine (mean 68), because Medium has no moonlit wall in the off view
  either.
- **Cause.** The auto-gain is lamp-driven only (`NightAutoGain`): nothing pulls a bright frame down or lifts a black
  one. That is the realistic-tube behaviour the brief asks for, so fix 2 adds it.

**(2) Bodies not bright: met.**
- yard-s5-backroom Epic, NV: body 24 vs the wall beside it 42 (0.57). Vision off: body 11 vs wall 22 (0.50). The body
  keeps its off-view relation to the room instead of glowing.
- wh-goods-in, wh-workshop and yard-s7-stair: guards and Wren read as dark, shaped figures. wh-corridor: the guard
  under the lamp stays lit.
- The cap is not too strong: the figures are not lost, they read as silhouettes against brighter walls.

**(3) Realistic green tube: met, apart from the auto-gain in (1).**
- Clearly green, about rgb (44,100,39) in mid areas. Highlights go pale green-white (wh-goods-in crate tops,
  yard-s3-camera floor pool). The floor is a dim green, not black.
- Bloom sits on the fixtures only (yard-s3-camera lamp disc, wh-corridor tube, exit sign). Lit walls and bodies do not
  halo.
- **The "neutral probe at 0.7" question is a misread.** `e2e-darkness.mjs` prints `off.rgb` only, so (121,127,125) and
  (0,1,1) are the vision-off pixels. The NV tint is landing.
- **Grain.** `SENSOR_GRAIN.night` 0.06 peak to peak is a std of about 1.7% at black and about 0.7% lit (`litNight`
  0.4). That is near G101's "as in CT" (about 1%) on a typical frame and reads as soft scintillation. Not blocking
  (polish).

**(4) Frame not claustrophobic, still a goggle: met.**
- The clear area covers about 89% of the screen (master: a circle 56% of the width with x0.06 sides). The darkening is
  confined to the rounded corners: measured corner luma 3.7-6.6 vs inner 21-31, about 0.17-0.25 with the settings
  vignette stacked.
- A faint rim follows the corners. It still reads as a goggle in lit rooms (yard-s1-bay, wh-corridor). In dark views
  the rim is barely visible.

**(5) Every preset: Epic and Medium yes; min no.**
- Medium matches Epic, apart from the wh-yard whiteout, which Epic only has.
- `?gfx=min`, centre-box mean, off -> NV:

  | View | Off | NV |
  | --- | --- | --- |
  | yard-s1-bay | 40.3 | **37.6** |
  | yard-s3-camera | 34.0 | 35.4 |
  | yard-s5-backroom | 45.8 | **40.9** |
  | yard-s7-stair | 22.6 | 27.8 |
  | yard-look | 1.2 | 8.7 |
  | wh-yard | 40.1 | 48.3 |
  | wh-goods-in | 39.0 | 45.3 |
  | wh-corridor | 49.6 | 50.4 |
  | wh-workshop | 29.0 | 35.5 |

- NV is darker than off in 2 of 9 views and barely brighter in the rest. On min, NV is not yet a vision aid.

**(6) Light parity: met.**
- Every change is in the render path:
  - `LampPlugin` bind uniforms and shader (`nsBodyFill`, `visionDark` on `lampDarkP`)
  - `lightRig.paintBulbs` (bulb colours only)
  - cinematic and bloom shaders
  - `PostStack` bloom weight
  - `renderVision`
- `ambientGrid`, `lightField`, the bake, `LIGHT_GAIN`, the meter and perception are untouched. `visionIsolation`
  passes unchanged, and e2e-stealth-ai is in the table above.
- Hot path: `visionDark` writes the `darkNow` scratch, so there is no allocation per bind.

## e2e-darkness decision: the target is stale; the cap stays

- **Why the card dropped.** The grey card is a non-voxel PBR surface, so under NV it now takes the body-fill cap. A
  vertical card gets 0.35 x (0.5 + 0.5 x 0.5) = 0.26 of its flat fill. That cap is what fixed the glowing bodies, and
  the sheets show it is the right strength: bodies keep their vision-off relation to the walls (0.57 vs 0.50 above).
- **What the card measures now.** Under NV, the card stands for how a body or prop in deep fill renders, not for the
  voxel walls. 13.5% at level 0.12 matches what the sheets show for figures in dark rooms: a readable dark-green
  silhouette.
- **Exempting the card is wrong too.** Without the cap, the flat-filled card would read near clip, which is the old
  glowing-body number.
- **New target.** NV level 0.12: min 0.10, max 0.45. The darkCurve 5x invariant becomes 2.5x.
- **Wall readability.** The walls' readability in the dark is judged on the sheets, and fix 2 targets it.
- **After fix 2.** The frame auto-gain will move this reading. Re-measure after the fix round's GPU run and set min to
  the measured value minus 0.03, never below 0.10. Level 0.7 (89.4% within 0.70-1) stays.

## Fix list (one round), ranked by impact

1. **Re-shoot master "before" and make the shot script prove what it serves.**
   - Files: `scripts/nv-shots.mjs`, `docs/nv-pass/nv-gpu.sh`.
   - nv-shots, before polling: exit 2 if anything already listens on PORT.
   - nv-shots, after polling: exit 2 if `server.exitCode !== null`. Fetch `/` and compare its `assets/index-*.js` name
     with the local `dist/index.html`; exit 2 on a mismatch.
   - nv-gpu.sh: fail on the build's exit status, not on `dist/index.html` existing. Delete the old
     `sheet-before-*` / `*-before-*` before the before run.
   - Done looks like: `sheet-before-epic` yard-s5-backroom night shows master's round lens (sides near black) and the
     pale grey-green tint. Before vs s12 stats differ in every NV view. Only then do the sheets go to Michael.
2. **A frame-level auto-gain (automatic brightness control) in the tube.**
   - Files: `src/vfx/nightBloom.ts` (or a small new `src/vfx/nightExposure.ts`), `src/vfx/nightVision.ts` (constants,
     pure `nvExposure`, GLSL), `src/vfx/cinematicPost.ts`, `tests/nightVision.test.ts`.
   - Measure: from the bright pass's 1/4-scale source, reduce to a 1x1 mean of the compressed luma (`bloomInput` on
     half float, raw on 8-bit). Ease it over time into a 1x1 target (alpha blend, k = 1 - exp(-dt / 0.5 s)). GPU only,
     no readback.
   - Apply: in the cinematic NV branch, scale the input before `nvDrive` by `clamp(target / mean, 0.6, 2.5)`. Pick the
     target so a typical lit room keeps today's drive (start: mean drive about 0.3, display luma about 22%). The lamp
     glare veil stays on top. Render only (light parity).
   - min: on min it runs on the 8-bit source and can replace `postLift`.
   - Done looks like:
     - Epic wh-yard NV: fewer than 20% of pixels above luma 224, with the wall texture visible.
     - yard-look NV: centre mean at least 30/255, with the right wall, rail and floor edge visible.
     - yard-s1-bay, s3-camera, s5, s7 and wh-corridor NV means within +-15% of today's.
     - Unit tests cover the clamp, the ease and the GLSL mirror; `visionIsolation` is unchanged.
3. **e2e-darkness target (per the decision above).**
   - Files: `scripts/e2e-darkness.mjs` (`NV` level 0.12 min 0.2 -> 0.10), `src/world/darkCurve.ts` (`VISION_TARGETS`
     mirror and a comment that the card is a non-voxel surface, capped like a body under NV), `tests/darkCurve.test.ts`
     (`VISION_TARGETS[0].min >= DARK_TARGETS[0].max * 2.5`).
   - In the script's probe line, print `on.rgb` next to the off rgb.
   - Re-set min from the post-fix-2 GPU reading (measured - 0.03, at least 0.10).
   - Done looks like: e2e-darkness passes on the GPU.
4. **`?gfx=min`: night vision never darker than off.**
   - If fix 2 does not already cover min: `NV_TONE.postLift` 2 -> 3 in `src/vfx/nightVision.ts`. The unit test checks
     NV luma >= the graded off luma, including the frame and black floor.
   - `scripts/nv-shots.mjs` prints each view's centre mean off -> NV and flags NV < off.
   - Done looks like: all 9 min views have NV centre mean >= off (today yard-s1-bay 37.6 < 40.3 and yard-s5-backroom
     40.9 < 45.8), and min NV in a lit room is at least 70% of Medium's mean (today yard-s1-bay 37.6 vs 84.9).

## Polish (non-blocking)
- **Grain.** 0.06 at black (std about 1.7%) is a little above G101's about 1%. Drop to 0.05 if Michael finds it dirty.
- **Settings vignette.** It stacks on the frame (corners about 0.17-0.25 in the sheets). Either skip the settings
  vignette while a goggle mode is on (the frame replaces it) or leave it.
- **Goggle identity.** It is subtle in dark scenes (the rim is barely visible). Knobs if Michael wants more goggle:
  `GOGGLE_FRAME.radius` 0.32 -> 0.38 and `rimTint` x1.5.
- **Thermal and electro.** The frame is on no sheet. Add one thermal and one electro row to `nv-shots.mjs`.
- **Shot artefact.** Photo-mode letterbox bars show in some wh-* rows (wh-yard night Epic, wh-goods-in night, wh-corridor
  night Medium) and not in their pairs. Zero the bars or wait for them in `nv-shots.mjs` so the pairs match.
- **Guards could pop more.** Bodies read darker than walls under NV (0.57). If Michael wants guards to stand out more:
  `BODY_FILL.nv` 0.35 -> 0.45.
- **The `.snap` file.** `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified after every vitest run (LF
  line endings only); `git checkout` it before committing, or add a `.gitattributes` eol rule.
- **Stale docs.** `docs/systems/lighting.md` and `graphics-quality.md` NV numbers (SURVEY "Stale docs"); planned for
  the job end.
