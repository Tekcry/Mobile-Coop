# Campus fog triage (Michael, 4.95.0, ~19:02: "Campus lights look very foggy, can't see through them")

**Cause:** the volumetric pass (`src/vfx/volLights.ts` `volBeam`) gives 76 of Saltmarsh Park's 134 fixed lights the
torch beam on Medium, High, Ultra and Epic (Volumetrics on): they are cone `spot`s drawn as glowing boxes with no LED
fitting model, so the vol-cone-fix rule (LED fittings only) never caught them; since LR16a (4.88.0) each beam marches
the 1.6x photometric reach (up to 14 m) through its whole cone (half angles 50-69 deg) at gain 1.6, and 6-12 of them
overlap in every campus room.

Rendering only: the light meter and the guards read `LightField`, never this pass (light parity holds before and after).

## Evidence (code, master d91d0e00)
- `src/vfx/volLights.ts:29-30` (`volBeam`): a light beams when it is a torch or `!!l.cone && !l.fixture?.model`.
  Campus `lamp()` helpers make every coned fitting a `spot` with a plain fixture box (`campusS2.ts:200-215`, `kind: o.cone ?
  'spot' : 'lamp'`, `fixture: { sx, sy, sz, oy }`, no `model`); the same holds in S1, S3, S4 and S5.
- `volLights.ts:42` beam march = `min(reach ?? radius, VOL_BEAM_MAX 14)`; `:48` the beam keeps its own cone (not the
  lamp's 0.88); `:56` gain `VOL_BEAM_GAIN` 1.6. A lamp-rule light marches at most 3.2 m (and half its radius, and its
  height) inside cos 0.88 at gain 1.
- `src/world/lights.ts:184`: every fixed light's radius is `lampReach` = radius x 1.6 (LR16a, `315a2805`, shipped in
  4.88.0 #291/#300 when the Classic path was removed). Before 4.88.0 the same campus beams marched 5-12 m; now 8-14 m,
  and the shader's falloff `(1 - l / r)^2` (`postStack.ts:114`) is higher at every distance: the atrium balcony
  downlights (R 5 -> 8 m, cone 1.2 rad) carry roughly 2-3x the haze they had before 4.88.0.
- `postStack.ts:120, 141`: the in-scatter is summed per light and added (`acc * scatter`, 0.05) over the picture, in HDR
  before bloom and tone mapping: overlapping cones stack into a pale veil you look through.
- Node scan of the built maps (`LevelBuilder` + `writeVolLight`, a throwaway test; numbers = intensity x march^2 x
  (1 - cosOuter), a rough scatter volume):

  | map | fixed lights | cone | LED model | beams | beam volume | lamp-rule volume |
  | --- | --- | --- | --- | --- | --- | --- |
  | campusOps | 134 | 76 | 0 | **76** | **5894** | 35 |
  | ctcourse (Marlow Yard) | 149 | 12 | 0 | 12 | 1540 | 58 |
  | warehouseOps | 134 | 41 | 134 | 0 | 0 | 35 |
  | warehouse (base) | 18 | 3 | 0 | 3 | 124 | 16 |

  Campus beams by room: S1 car park and lane 15 (R 19.2, march 14, cos 0.41), S1 canopy / delivery 5, S2 balcony
  downlights 12 (march 8, cos 0.36, at 7.9 and 11.9 m over the atrium void), S3 hall 11 (march 14, cos 0.41: the old
  "S3 hall-lit white fog"), S3 burn-in / dock 5, S4 cold halls / lobby / UPS 18 (march 7-8), S5 ten (march 9.6).
- Presets (`src/core/quality.ts` `GRAPHICS_PRESETS`): Low has `volumetrics: false` (no beams, the height fog only);
  Medium and High scatter the 6 nearest lights, Ultra 8, Epic 12, 16 march steps on Epic (8 below); the governor
  halves the count under load. Michael was on Epic: the worst case (12 overlapping beams).
- Not the cause: the height fog (`gameState.ts:606` density 0.007 on dark maps, `postStack.ts:437` falloff 0.55 from
  y 0, every preset): campus has no floor below y 0, so at eye height it is ~0.3% per metre, under 10% across the
  atrium. Bloom (`BLOOM_WEIGHT` 0.35, Medium+) only widens what the beams already put on screen. Night-vision bloom runs
  only with the goggles on. The scene's linear fog (`world.ts:119-122`, 40-140 m on campus) only matters outdoors.

## Shots (GPU, laptop queue)
Request `20261024T081256-night-shift-sector-o-28cbd98b-d737` on `28cbd98b` (master d91d0e00 + the shot script's A/B
switches only), branch `shots/fog-d91d0e00`: views s1-f (forecourt canopy), s2-b (atrium up), s2-d (L1 open plan),
s3-a (S3 hall), s3-c (burn-in racks), s5-a (stair hall) at Epic (as is, `VOL=off`, `VOLFIX=1` = the fix's rule in the
page, `BLOOM=off`), High (as is, `VOL=off`), Medium, Low; `PROBE=1` lists the pass's lights per view.
Findings: (pending the laptop run)

## Old PR #152 (sector-look, open, conflicting)
Its diagnosis (a coned fixed light took the torch shaft) is this bug's, and its fix was merged in narrower form by #156
(vol-cone-fix, 4.61.0): LED-model fittings only, because the general rule ("every non-torch hazes like a lamp") also
took the beams off the base Warehouse's facade floods. Campus was built after with plain-box coned fittings, so it fell
outside the narrow rule. #152's general rule is what campus needs, but #152 itself is stale (pre-voxel-retire line
numbers, 4.58 shots, a script switch since merged): close it as superseded by #156 and this fix.

## Fix (built on this branch)
Render-only, campus-only: a per-map switch, so Marlow Yard (12 set floods) and the base Warehouse keep their beams.
- `src/world/mapDef.ts` `MapTheme.lampBeams?: boolean` (default true); `campusOps.ts` theme `lampBeams: false`.
- `src/vfx/volLights.ts` `volBeam(l, lampBeams = true)` / `writeVolLight(..., lampBeams = true)`: with false only torches
  beam; every fixed light takes the lamp rule (march <= 3.2 m, cone >= cos 0.88, gain 1). Allocation-free (a boolean).
- `src/vfx/postStack.ts` `PostStackOptions.lampBeams`, passed per light in `frame`; `src/game/gameState.ts` passes
  `world.map.theme.lampBeams ?? true`. No shader change, no new texture or uniform (16-texture cap untouched).
- Test `tests/volLights.test.ts`: every campus fixed light writes march <= 3.2, cos >= `VOL_LAMP_COS`, gain 1 with the
  theme's switch (and > 50 of them would beam without it); a torch still beams; Marlow and the base Warehouse keep the
  default and Marlow still has beams.
- Docs: `docs/systems/lighting.md` (Volumetric beams), `graphics-quality.md` (post stack); fragment
  `changes/feature-sector-redesign-fog.md`.
- Toward "Lighting everywhere" ("Must be realistic depiction of light"; lighting.md "a beam is not seen in clean
  air"): campus lights now show where they land plus a faint haze under the shade, as the warehouse strips since 4.61.
- After shots must show: the six views with no pale veil (s2-b and s3-a above all), lit floors and walls unchanged,
  each fitting with a short faint haze under it, the same as `now-*-epic-volfix`; meters per view equal to the before
  run (`*-counts*.txt`), since the field is untouched.
- Open: Marlow Yard's 12 coned floods still beam (1540 by the scan); on a "clean air" reading they should haze too,
  which is a look change for Marlow Build to judge (one theme line). Torch beams soft edges stay in LR16 scope.
