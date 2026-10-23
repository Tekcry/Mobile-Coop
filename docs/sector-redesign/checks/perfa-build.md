# perfa build report (campus art CPU per frame) - builder Opus 5.5

Branch `feature/sector-redesign-perfa` (off -artpol 1d34c348). Status: DONE (built, unit-tested, pushed). Not run: e2e, GPU perf (laptop GPU rerun below).
Scope: `src/world/campusArt/*` and tests only. Gameplay, collision, cover, nav and the light bake are unchanged (`campusArtGameplay` 5 sections pass; boxes / cover written exactly as before; the new `indoor` flag is render-only).

## Measure first (probe: `tests/campusArtPerfProbe.test.ts`, `PERFA_PROBE=1` prints)
The real dressed campus (`buildCampus(b, { dress: true })`, 1852 placements, 1699 indoor) through `CampusArtRender.fromModels` on a NullEngine.
"Views": art meshes a camera at each section's start would draw (enabled and in the frustum; 2.8 m behind, 1.9 m up, fov 1.0, maxZ 220), over 8 headings; "start" = the start yaw.

| | before | after |
| --- | --- | --- |
| art meshes total (= draws per pass) | 162 | 138 |
| per section S1 / S2 / S3 / S4 / S5 | 39 / 39 / 29 / 25 / 30 | 31 / 33 / 27 / 19 / 28 |
| shadow-caster meshes (`addCaster`) | 17 | 12 |
| S1 start view (yaw 0) | 160 | 85 |
| S1 view mean / max (8 headings) | 58.6 / 160 | 35.5 / 85 |
| S2 start, mean / max | 117, 83.5 / 117 | 94, 70.6 / 94 |
| S3 start, mean / max | 50, 77.1 / 108 | 49, 66.6 / 89 |
| S4 start, mean / max | 34, 71.6 / 127 | 28, 60.5 / 103 |
| S5 start, mean / max | 43, 64.5 / 125 | 41, 52.9 / 99 |

Top contributors before: the S1 start looks north over the whole campus and every other building's interior art (one merged mesh per section and material, no occlusion culling) was in the frustum: 160 of 162 art meshes. S1's own 39: 14 car caster draws (2 colours x 7 materials, thin-instanced per piece), 16 merged statics, 6 emissives (sign plates, bollards, screens, exit signs), 3 alpha. Statics were already merged per (section, material), frozen, not pickable, not always-active; no art mesh but the box-hidden skins casts, and `LightRig.fillCasters` already skips casters under 0.3 m.

## Changes
- `catalogue.ts:457` `artDrawKey`: one rule for renderer and `artCounts` (`catalogue.ts:471`): merged 'm|mat' statics, 'e|mat' emissives, 'c|mat' the box-hidden skins' opaque parts; thin-instanced only the alpha meshes (per piece, so transparent sort is unchanged) and an emissive caster.
- `campusArtRender.ts:279` `bake`: emissives baked per (section, material) with per-vertex colours (same `vColor` multiply as the thin-instance colour; circuit dimming repaints the vertex buffer, `repaint` `:386`, allocation-free); car / van opaque parts baked per (section, material) as casters (`:301`). S1 casters 14 -> 9 (7 merged + 2 glass), emissives 6 -> 3.
- `campusArtRender.ts:39` `ART_FAR = 60` far cull (`farCull` `:419`, `farCullAt` `:428`): a draw whose placements are ALL indoor (`:243`, `:281`) is disabled while the camera's plan distance to its bounds is over 60 m (back on under 58 m; re-evaluated per 1 m of camera movement; allocation-free). Outdoor art and casters (the box-hidden skins: their box is hidden) are never culled.
- `dresser.ts:195` `markIndoor` (called from `write()`, `:188`): sets `ArtPlacement.indoor` (`catalogue.ts:121`) for placements in an indoor-tagged room (`isOutdoor` false, not 'none').
- Measured and dropped: splitting every draw into indoor / outdoor keys (more culled far, but +5 draws total and S3 / S5 start views went up 50 -> 56, 43 -> 52). Measured: `ART_FAR` 50 gives S1 start 63 (S2 interior culls at 53 m); kept 60 to keep the adjacent S2 building's interior on from the S1 start.
- Tests: `tests/campusArtRender.test.ts` (new names, `colorOf` for merged emissive colours, new far-cull test with hysteresis and an alloc check), new `tests/campusArtPerfProbe.test.ts` (per section at most 40 draws).

## Checks
- `npx tsc --noEmit -p .` clean.
- vitest: campusArtRender (4), campusArtPerfProbe, campusArtKit, campusDressRules, campusArtGameplay, campusS1-S5Dress: all pass.

## What the GPU perf rerun must check (laptop, Epic)
- CPU med / p95 and draws at the campusOps S1 start (was med 8.3-11.0, p95 12.0-13.4, 401 draws) and S5-worst (442 draws). Expected: S1 start draws down by about (160 - 85) art meshes x passes.
- Visual, no change expected: (1) screens, lamps, bollards, sign plates and exit signs keep their colour and dim with a cut circuit (S1 gatehouse breaker, any S2 / S3 circuit); (2) cars and the S5 van still cast shadows; (3) walking out of a building, no indoor art pops at windows or open doors 58-60 m away (if it does: raise `ART_FAR`); (4) art shading unchanged (merged emissives use vertex colours instead of instance colours).
