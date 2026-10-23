# LR16b build - soft light edges + lamp slot overflow

Michael 2026-10-23 ~18:08 ("the edge of lights should diffuse against walls/floors/etc unless something directly cuts
off the light ray, depending on how far away it is. Must be realistic depiction of light"), ~18:20 (guard torches "also
need to be diffused and not so sharp"). Spec: `lr16-plan.md` (wall-arc diagnosis, LR16b row, light parity) and
`lr16a-build.md` open item 2. Branch `feature/sector-redesign-lr16`, base 59c8bfdd.
Commits: 749e8de7 (soft edges), 8088b526 (slots), 4290d300 (tests), then this file.

## Part 1 - soft edges
- Feathered cone: `src/world/lampMath.ts:80` `lampCone` is 0 at and outside the cut, then a smoothstep over
  `coneFeather(exp) x (1 - cos cut)` (`:31`), times cos^exp. A feather in angle, so the soft band on a wall widens
  with the wall's distance from the lamp (tested: worst change per mm falls at 0.4 / 1 / 2 m).
  - `LAMP_FEATHER = 0.4` (`:28`): fixed lamps ramp from 87.3 to 64.6 degrees off straight down. Floor under a 3 m
    lamp keeps >= 0.94 of its light out to 6 m horizontal; past that the window already makes it small.
  - `SPOT_FEATHER = 0.65` (`:29`): the ramp's inner end lands on the torch's authored inner angle (`TORCH` outer 0.34,
    inner 0.2 rad). No new uniform: the feather comes from the exponent (lamp 1 / spot 2), which the lamp data and the
    torch slots already carry.
- Smooth near term: `photoFalloff` (`:65`) = `(ref^2 + near^2) / (d^2 + near^2)` x window (`PHOTO_NUM` `:72`). Choice:
  numerator `ref^2 + near^2`, not the plan's `ref^2`, so a lamp still reads its intensity at `ref` (3 m) and map levels
  move as little as possible (with `ref^2` alone every lamp would read 10% dimmer at 3 m). Change vs LR16a: 0.5 m 8.0 (was 9), 1 m 5.0 (was 9),
  2 m 2.0 (was 2.25), 3 m 1.0, 5 m 0.38 (was 0.36).
- Grazing / N.L roll-off: not added. The picture already multiplies by N.L; the arch was the step x the 9x plateau, both
  gone. The meter stays omni (no N.L), as before.
- `photoTerm` (`:93`): the TS reference of falloff x cone; `LightField.lampInto` writes it out by hand
  (`src/world/lightField.ts:277-300`, allocation-free, no returned double).
- GLSL: `LAMP_MATH_GLSL` (`lampMath.ts:151`) is generated from `PHOTO_NUM`, `PHOTO_NEAR2`, `LAMP_FEATHER`,
  `SPOT_FEATHER`; `nsLampCone` is the same smoothstep. The lamp loop and volume mix already embed it. `bakedLamps.ts`
  needed no cone uniform change.
- Guard torches: `TORCH_DRAW_GLSL` now calls `nsLampCone(ca, tb.w, 2.0)` (`src/world/shadowAccuracy.ts:167`; it sits
  after `LAMP_GLSL` in the material). The meter's torch term (`lampTerm` -> `lampCone`) is feathered the same way.

## Part 2 - slot overflow
Measured lamps in reach per 2 m column (photometric reach): warehouseOps 17 (393 columns over 8), campusOps 16 (526),
bunker 11 (101), ctcourse 9 (13), warehouse 8, others <= 3.
- Choice: more slots. `LAMP_GRID_SLOTS = 24` in 6 RGBA texels a column (`src/voxel/lampBake.ts:388`,
  `lampGridBase` `:392`). Rejected: a per-column residual (approximates light per lamp, breaks the exact meter =
  picture sum), and shrinking reach by a threshold (the photometric term is still 0.05+ near the window, so a cut would
  drop visible light and change levels). Cost: the loops stop at the first empty slot, so a column costs what it lists;
  grid memory 16 B a texel (campusOps 5688 columns x 6 = 546 KB, was 182 KB).
- `lampGrid` returns `worst`; `BakedLamps` warns when a column passes 24 (`src/world/bakedLamps.ts:189`). Shaders:
  `bakedLamps.ts:485-491` (volume mix) and `:984-990` (material loop) fetch a texel every 4 slots. Field:
  `lightField.ts:252`. Meter and picture read the one list.

## Tests (all PASS)
- `npx tsc --noEmit`: clean.
- `tests/lampFalloff.test.ts`: new describe "(LR16b) soft light edges" - cone smoothstep values and bounded slope
  (four cut / exponent pairs), falloff bounded slope from d = 0, wall-arc probe (walls 0.4 / 1 / 2 m: worst per mm
  under a tenth of the LR16a step, softer with distance), GLSL `nsLampCone` / `nsLampFalloff` evaluated vs TS +
  constants string-equal + torch GLSL uses `nsLampCone`, meter = GLSL formula x vis at 200 seeded points (feather band
  sampled). Near-term test rewritten.
- `tests/lightField.test.ts`: brute force uses the feathered cone and smooth near term, with float32 lamp data (as the
  field and shaders hold it); boxing budget unchanged (passes at 72 B).
- `tests/lights.test.ts`: cone known values moved out of / into the feather band. `tests/lampBake.test.ts`,
  `tests/lampGridLossless.test.ts`: grid read via `lampGridBase`.
- Also PASS: shadowAccuracy, editor/lightPreview, editor/night, volLights, lampAtlasFit, smoothWorldLight,
  levelFillParity, darkCurve.

### The 22 LR16a map-light failures: 22 -> 15
Now PASS (7): `lampGridLossless` x3 (all 4 maps pass); "no 2 m column has more lamps in reach than the shaders list"
in `ctcourseLight`, `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light`.
Still FAIL (15, level tuning: LR16d / LR16g): ctcourseLight 4 (must-see spots, dark between pools, airlock lamps, tuned
levels within 0.08), warehouseS1Light 4, warehouseS2Light 3, warehouseS3Light 4 (lit-enough route points, stealth
maxima, dark pockets, pockets +0.05). Count per file is LR16a's minus the slot test; no baseline rerun on 59c8bfdd.

## GPU checklist (laptop, pending)
1. Workshop wall-arc shot (the 4.78 `michael-4.78-wall-arcs.png` view): the arch should read as a soft gradient below
   lamp height; still bright right beside a lamp 0.5 m off a wall (real inverse square; LR16d moves those lamps).
2. Torch beam edge: a guard torch on a wall and floor at 2 m and 6 m - no hard ring; the hot core inside the inner
   angle. The shadow-mapped torch (rig slot, Babylon SpotLight) still has Babylon's hard cut - see open item 1.
3. Meter vs picture: parity probe at seeded points on warehouseOps and campusOps columns with 9-17 lamps (was lost past
   8); frame time p95 on campus S2 / Sector Ops (lamp loop now runs up to 17 lamps in the densest columns).

## Open items
1. The torch with a shadow map is a Babylon SpotLight (`lightRig.ts:541`, outside this slice): hard cone cut, and the
   meter's feathered torch term differs from it near the beam edge. Fix: a custom spot cone in that path, or draw it
   through `nsTorches` with the shadow map applied.
2. Levels moved slightly (near term, feather): LR16g re-level should run after this.
3. A future map with a column past 24 lamps logs a warning and drops the farthest; the map tests' slot assertions
   catch it.
