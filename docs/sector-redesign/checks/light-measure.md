# Light measurement - walk 4.72 S1 / M5 (raw numbers)

Lighting reviewer (Opus), branch `feature/sector-redesign-lightrev`, 2026-10-23 ~14:30. Read-only measurement in node:
each map built with `LevelBuilder`, baked with the pure bakers exactly as `tests/warehouseS1Light.test.ts` does
(`canonicalLightSet`, `bakeLamps`, `bakeMoon`, `buildAmbientGrid`, `LightField`), so every "level" below is what the
light meter and the guards read. The picture uses the same formula (`lampMath.ts` -> `LAMP_MATH_GLSL`) x `LIGHT_GAIN`
1.6 / `LAMP_LEVEL_GAIN` 1.2 x N.L x albedo, then the darkness curve (`DARK_DESKTOP`) on the level without N.L. No GPU
run was made (the probe's numbers are the field's; the picture is derived through `darkCurve`); the GPU check is in the
proposal's test plan. Probe: `scripts/light-measure/` (`PROBE_TREE`, `PROBE_S1`, `PROBE_M5`, `PROBE_PHOTO`).
Analysis and the proposal: `docs/archive/lighting-review/PROPOSAL.md` "Walk 4.72 S1".

Note on names: Michael's "S1 Sector Ops ... goods in" is map `warehouseOps` section 1 (the Goods-in Bay, x -24..-8,
z -18..-8.8; lamps `S1_LAMPS` in `src/world/maps/warehouseS1.ts:73`), not `campusOps` (Saltmarsh Park has no goods-in
in its S1; its goods-in dock is S3). `campusOps` is measured in the all-maps scan below.

## 1. Every map: fitting height against reach (linear falloff, the authored radius)
`h` = the fitting's height over the first collision top below it; `fF` = the linear falloff `1 - h / r` on the floor
straight under the fitting; "chest" = `1.2 x intensity x falloff` 1.2 m over that floor from the fitting alone (cone
factor 1 straight down). Fixed lamps that are lit (intensity > 0, radius > 0).

| Map | Lamps | Median h (m) | Median radius | Median r / h | Median intensity | Floor under it gets 0 | Floor under it < 0.25 | Median fF | Median chest level, own fitting | Chest < 0.28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warehouse | 18 | 5.03 | 8 | 1.59 | 1.0 | 0 | 0 | 0.371 | 0.626 | 0 |
| warehouseOps (Sector Ops) | 100 | 3.4 | 5.3 | 1.245 | 0.626 | **31** | **58** | 0.197 | 0.285 | **48** |
| campusOps (Saltmarsh Park) | 133 | 3.5 | 5 | 1.765 | 0.8 | 0 | 14 | 0.433 | 0.595 | 3 |
| seclab | 3 | 3.4 | 7 | 2.06 | 1.0 | 0 | 0 | 0.514 | 0.823 | 0 |
| ctcourse (master, Marlow Yard 4.72) | 31 | 4.35 | 9 | 2.3 | 0.9 | 0 | 1 | 0.564 | 0.694 | 1 |
| ctcourse (marlow-final-s10 @6b211fb7) | 149 | 3.0 | 4.5 | 1.25 | 0.9 | **22** | **87** | 0.2 | 0.605 | 22 |
| courselab | 3 | 2.8 | 8 | 2.86 | 1.0 | 0 | 0 | 0.65 | 0.96 | 0 |

(proving, kestrel: no fixed lamps.)

## 2. Sector Ops S1 Goods-in Bay (`warehouseOps`)
Fittings (`warehouseS1.ts:73`, model strip, y 5.58 = 5.8 roof - 0.22, 45 degree beam `HALL`, circuit 30, switch at
(-23.85, -12)): [x, z, radius, intensity] = [-22, -15.4, 7.02, 0.7], [-18, -15.4, 6.78, 0.7], [-14, -15.4, 5.51, 0.852],
[-10, -15.4, 5.05, 1.022], [-22, -11.6, 5.4, 0.7], [-18, -11.6, 4.8, 0.7], [-14, -11.6, 5.55, 1.345], [-10, -11.6, 8.8, 0.579].
Five of eight have a radius under, or within 0.6 m of, their 5.58 m height. Standby fill: the shed's `ambientZone` 0.12
(`warehouse.ts:444`). 144 points, a 1 m grid x -23.5..-8.5, z -17.5..-9.5.

| Quantity | Today (linear) | Prototype `?falloff=photo` |
| --- | --- | --- |
| Floor level (y 0.1): min / median / max | 0.122 / **0.186** / 0.456 | 0.122 / **0.431** / 0.792 |
| Floor points under the shadow line 0.28 | **108 / 144** | 22 / 144 |
| Floor points lit (>= 0.6) | 0 / 144 | 19 / 144 |
| Body level (standing, the meter): min / median / max | 0.122 / 0.436 / 0.734 | 0.26 / 0.721 / 1.0 |
| Bodies under 0.28 / lit >= 0.6 | 19 / 7 | 1 / 100 |
| Fittings in reach at chest height: min / median / max | 1 / 2 / 5 | 1 / 6 / 9 (column cap 8) |
| warehouseOps lamp bake (node, one thread) | 5.9 s, 11.3 MB visibility | 16.5 s, 30.1 MB visibility |

Without visibility (open floor, the formula alone, at chest height, every fixed lamp of the map): linear median 0.257
(85 / 144 under 0.28, none lit); inverse square referenced at 3 m and windowed at 2 x radius median 0.746 (3 under,
97 lit).

Real fittings at the same eight positions (1.2 m LED high-bay battens, 12 000 lm each, the same 45 degree optic, a
cos^2 beam, inverse square, no inter-reflection; horizontal illuminance at chest height): min **213 lux**, median
**488 lux**, max **781 lux**. A real warehouse task area is 100-200 lux (300-500 for picking), an office 300-500 lux.
Under the game's linear model the same fittings leave 75% of the bay's floor at the standby fill.

What the floor looks like (the darkness curve `DARK_DESKTOP` {centre 0.37, steep 12, floor 0.3, top 1.55},
`darkCurve.ts:39`; linear light before the tone map and sRGB):

| Level | 0.12 | 0.20 | 0.28 | 0.33 | 0.37 | 0.40 | 0.45 | 0.60 | 0.80 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rendered | 0.036 | 0.060 | 0.096 | 0.182 | 0.342 | 0.479 | 0.648 | 0.928 | 1.24 |

So the bay's median floor (0.186) renders at about 0.056 (near black) and its median body (0.436) at about 0.61. The
pools read; the floor and walls between them do not ("goods in seems brighter but the lights just dont light up
everything").

Per point (every second x column; levels; lux = the real-fitting estimate):

| x | z | lamps in reach (linear) | floor linear | body linear | floor photo | body photo | real lux (12 klm battens, chest) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| -23.5 | -17.5 | 1 | 0.216 | 0.314 | 0.263 | 0.344 | 213 |
| -23.5 | -16.5 | 1 | 0.247 | 0.381 | 0.217 | 0.43 | 290 |
| -23.5 | -15.5 | 1 | 0.196 | 0.412 | 0.238 | 0.476 | 422 |
| -23.5 | -14.5 | 1 | 0.198 | 0.415 | 0.296 | 0.584 | 454 |
| -23.5 | -13.5 | 2 | 0.225 | 0.414 | 0.376 | 0.604 | 458 |
| -23.5 | -12.5 | 2 | 0.178 | 0.395 | 0.366 | 0.63 | 454 |
| -23.5 | -11.5 | 2 | 0.122 | 0.294 | 0.122 | 0.547 | 422 |
| -23.5 | -10.5 | 2 | 0.122 | 0.322 | 0.122 | 0.561 | 290 |
| -23.5 | -9.5 | 2 | 0.122 | 0.195 | 0.122 | 0.318 | 213 |
| -21.5 | -17.5 | 2 | 0.239 | 0.36 | 0.357 | 0.435 | 355 |
| -21.5 | -16.5 | 2 | 0.298 | 0.528 | 0.429 | 0.632 | 482 |
| -21.5 | -15.5 | 2 | 0.326 | 0.581 | 0.481 | 0.793 | 653 |
| -21.5 | -14.5 | 2 | 0.298 | 0.591 | 0.512 | 0.831 | 757 |
| -21.5 | -13.5 | 3 | 0.249 | 0.493 | 0.531 | 0.74 | 764 |
| -21.5 | -12.5 | 3 | 0.196 | 0.472 | 0.539 | 0.852 | 757 |
| -21.5 | -11.5 | 2 | 0.143 | 0.451 | 0.531 | 0.884 | 653 |
| -21.5 | -10.5 | 2 | 0.122 | 0.391 | 0.352 | 0.781 | 482 |
| -21.5 | -9.5 | 2 | 0.122 | 0.228 | 0.252 | 0.367 | 355 |
| -19.5 | -17.5 | 3 | 0.304 | 0.434 | 0.421 | 0.498 | 364 |
| -19.5 | -16.5 | 2 | 0.318 | 0.544 | 0.427 | 0.634 | 488 |
| -19.5 | -15.5 | 2 | 0.347 | 0.596 | 0.453 | 0.706 | 643 |
| -19.5 | -14.5 | 2 | 0.122 | 0.411 | 0.122 | 0.551 | 771 |
| -19.5 | -13.5 | 2 | 0.122 | 0.507 | 0.289 | 0.908 | 781 |
| -19.5 | -12.5 | 3 | 0.185 | 0.472 | 0.56 | 0.941 | 771 |
| -19.5 | -11.5 | 2 | 0.122 | 0.305 | 0.553 | 0.781 | 643 |
| -19.5 | -10.5 | 3 | 0.122 | 0.35 | 0.347 | 0.791 | 488 |
| -19.5 | -9.5 | 2 | 0.122 | 0.155 | 0.253 | 0.426 | 364 |
| -17.5 | -17.5 | 2 | 0.269 | 0.338 | 0.433 | 0.422 | 355 |
| -17.5 | -16.5 | 1 | 0.26 | 0.431 | 0.449 | 0.633 | 482 |
| -17.5 | -15.5 | 2 | 0.278 | 0.484 | 0.477 | 0.773 | 731 |
| -17.5 | -14.5 | 1 | 0.122 | 0.315 | 0.122 | 0.508 | 757 |
| -17.5 | -13.5 | 1 | 0.122 | 0.408 | 0.252 | 0.698 | 764 |
| -17.5 | -12.5 | 2 | 0.175 | 0.414 | 0.626 | 0.937 | 757 |
| -17.5 | -11.5 | 3 | 0.124 | 0.436 | 0.581 | 0.994 | 731 |
| -17.5 | -10.5 | 3 | 0.122 | 0.376 | 0.422 | 0.884 | 482 |
| -17.5 | -9.5 | 2 | 0.122 | 0.16 | 0.303 | 0.411 | 355 |
| -15.5 | -17.5 | 2 | 0.158 | 0.344 | 0.352 | 0.518 | 364 |
| -15.5 | -16.5 | 2 | 0.187 | 0.459 | 0.448 | 0.673 | 488 |
| -15.5 | -15.5 | 2 | 0.199 | 0.513 | 0.526 | 0.751 | 643 |
| -15.5 | -14.5 | 2 | 0.187 | 0.548 | 0.52 | 1 | 771 |
| -15.5 | -13.5 | 3 | 0.163 | 0.561 | 0.55 | 1 | 781 |
| -15.5 | -12.5 | 2 | 0.122 | 0.469 | 0.559 | 1 | 771 |
| -15.5 | -11.5 | 3 | 0.122 | 0.513 | 0.599 | 1 | 643 |
| -15.5 | -10.5 | 3 | 0.142 | 0.506 | 0.624 | 0.986 | 488 |
| -15.5 | -9.5 | 3 | 0.122 | 0.289 | 0.358 | 0.616 | 364 |
| -13.5 | -17.5 | 1 | 0.122 | 0.264 | 0.334 | 0.424 | 355 |
| -13.5 | -16.5 | 1 | 0.122 | 0.353 | 0.44 | 0.565 | 482 |
| -13.5 | -15.5 | 2 | 0.123 | 0.398 | 0.554 | 0.956 | 731 |
| -13.5 | -14.5 | 3 | 0.122 | 0.482 | 0.605 | 1 | 757 |
| -13.5 | -13.5 | 3 | 0.226 | 0.546 | 0.663 | 0.977 | 764 |
| -13.5 | -12.5 | 4 | 0.245 | 0.734 | 0.682 | 1 | 757 |
| -13.5 | -11.5 | 3 | 0.264 | 0.721 | 0.671 | 1 | 731 |
| -13.5 | -10.5 | 3 | 0.242 | 0.666 | 0.552 | 1 | 482 |
| -13.5 | -9.5 | 4 | 0.221 | 0.359 | 0.436 | 0.6 | 355 |
| -11.5 | -17.5 | 1 | 0.122 | 0.217 | 0.325 | 0.554 | 364 |
| -11.5 | -16.5 | 3 | 0.176 | 0.342 | 0.448 | 0.739 | 488 |
| -11.5 | -15.5 | 4 | 0.122 | 0.402 | 0.431 | 0.833 | 643 |
| -11.5 | -14.5 | 4 | 0.122 | 0.362 | 0.332 | 0.768 | 771 |
| -11.5 | -13.5 | 3 | 0.122 | 0.122 | 0.122 | 0.316 | 781 |
| -11.5 | -12.5 | 3 | 0.34 | 0.573 | 0.476 | 1 | 771 |
| -11.5 | -11.5 | 3 | 0.35 | 0.616 | 0.576 | 0.846 | 643 |
| -11.5 | -10.5 | 3 | 0.335 | 0.553 | 0.472 | 0.772 | 488 |
| -11.5 | -9.5 | 2 | 0.299 | 0.419 | 0.394 | 0.572 | 364 |
| -9.5 | -17.5 | 2 | 0.122 | 0.222 | 0.287 | 0.462 | 257 |
| -9.5 | -16.5 | 2 | 0.208 | 0.323 | 0.606 | 0.631 | 360 |
| -9.5 | -15.5 | 3 | 0.392 | 0.501 | 0.667 | 0.818 | 597 |
| -9.5 | -14.5 | 3 | 0.28 | 0.535 | 0.477 | 0.819 | 555 |
| -9.5 | -13.5 | 4 | 0.33 | 0.521 | 0.457 | 0.748 | 557 |
| -9.5 | -12.5 | 3 | 0.367 | 0.487 | 0.581 | 0.692 | 555 |
| -9.5 | -11.5 | 3 | 0.38 | 0.495 | 0.496 | 0.608 | 597 |
| -9.5 | -10.5 | 3 | 0.362 | 0.458 | 0.366 | 0.45 | 360 |
| -9.5 | -9.5 | 2 | 0.32 | 0.383 | 0.307 | 0.353 | 257 |

## 3. Marlow M5: the lamp over the station 2 door (`ctcourse`, master = the 4.72 build)
The fitting: `S2_TOP_LAMP` {intensity 0.5, radius 7.6} (`ctcourse.ts:83`), placed by `flush(x0 + CT_OBST + 0.9, 7.5, ...)`
(`ctcourse.ts:534`) at (31.9, 7.35, 5.0): a recessed STRIP 1.6 m along x (x 31.1-32.7). The station 2 wall is 1 m thick
at x 30.5-31.5 and 4.4 m high, its bolted door at z 6.4-7.6 (`crossWall`, `ctcourse.ts:513`). Seen from the first room
the strip hangs over the wall top and the door. Bake samples: 3 points along the strip (x 31.37, 31.9, 32.43), all
2.95 m over the wall top, none inside it.

Its own light (`field.lampAt`) and the total level per point (z 5; "body" = the brighter of 1.02 m and 1.6 m):

| x | Room | Its light, floor (linear / photo) | Its light, body (linear / photo) | Total floor (linear / photo) | Total body (linear / photo) |
| --- | --- | --- | --- | --- | --- |
| 24 | first | 0 / 0.005 | 0 / 0.011 | 0.83 / 0.567 | 0.852 / 0.695 |
| 26 | first | 0 / 0.020 | 0 / 0.035 | 0.895 / 0.641 | 0.951 / 0.877 |
| 28 | first | 0 / 0.018 | 0.043 / 0.064 | 0.83 / 0.58 | 0.893 / 0.75 |
| 29 | first | 0 / 0 | 0.048 / 0.033 | 0.765 / 0.51 | 0.81 / 0.605 |
| 30 | first (the wall's shadow) | 0 / 0 | 0 / 0 | 0.693 / 0.462 | 0.689 / 0.486 |
| 32 | second | 0.018 / 0.078 | 0.097 / 0.147 | 0.817 / 0.615 | 0.903 / 0.774 |
| 33 | second | 0.021 / 0.075 | 0.135 / 0.139 | 0.878 / 0.66 | 1.0 / 0.881 |
| 34 | second | 0.004 / 0.066 | 0.11 / 0.119 | 0.894 / 0.682 | 1.0 / 0.948 |
| 36 | second | 0 / 0.041 | 0.035 / 0.069 | 0.857 / 0.627 | 0.925 / 0.812 |

On the wall top under it (31, 4.5, 5): 0.347 linear, 0.572 photo. Geometry: from 7.35 m the 4.4 m wall shadows the
first room's floor for about 3.9 m back from the wall (to x ~28); past that the floor is in the fitting's view, but
the distance there (8.3 m) is past its 7.6 m radius, so nothing arrives. Under it, on the second room's floor, linear
gives 0.02 at most: it lights only the wall top (its course-ready S2 job: "the wall top, the drop and the bolt").
Station 2's floors are lit by its two pendants (x 26 and 34.5, intensity 0.9, radius 13), so the room is not dark; the
fitting itself looks dead below the wall top. Photometric: 0.02-0.08 on the floors around it (it is a weak fitting at
7.35 m), and the pendants drop (floor 0.83-0.9 -> 0.56-0.68) because their 13 m radius was a linear reach (radius 13
at 5 m gives 0.62 linear; inverse square from 3 m gives 0.36 at 5 m).

marlow-final's W5 (A2 "locked-door lamp", `docs/marlow-final/PLAN.md` slice 10) is the Marlow lead's data fix; the
marlow-final course has the same short-reach pattern overall (table 1: 22 of 149 fittings put nothing on the floor
under them).

## 4. Fittings straddling a wall (plan footprint across a wall line), all maps
A scan for thin collision boxes through a lit fitting's footprint at its height found none with its centre inside a
wall. (The bake's conservative occupancy grows walls by 0.1 m and stops its march 0.25 m short of each sample point,
`lampBake.ts:24`, so a centre inside a wall would light neither side.) The hits are wall bulkheads standing 0.3 m off
their wall (by design, `lampMount.ts`) and fittings beside beams. Panels sample one point (`lampSamples`,
`lampBake.ts:71`: points along the longer side only, one per 0.5 m, at most 6), so a 0.6 m panel over a wall line
would light only the side its centre is on; no current map has one.

## 5. Bounce and fill
There is no inter-reflection. The only fill is the ambient grid (the theme's `lightLevel` outside, `ambientZone`s
inside: 0.12 in the Sector Ops shed, 0.14 standby in the marlow-final sets), the same in a zone whether its lamps are
on or off. On the smooth default the level's own boxes render their fill from the sky-visibility bake (`LAMP_SKY`,
`bakedLamps.ts:936-941`), not the gameplay grid; characters and props use the grid. Walls and ceilings get lamp light
only through N.L of the direct term; the lamp hemisphere is cut at 87 degrees from straight down (`LAMP_CONE`,
`lampMath.ts:11`), so a ceiling never sees its own fittings.

## Shadow accuracy audit (Michael ~14:45)

Opus shadow-accuracy auditor, branch `feature/sector-redesign-shadow` (off `feature/sector-redesign-lightrev` 7c403385),
2026-10-23. Read the code and measured in node with the real bakes (`scripts/shadow-audit/`, `PROBE_PHOTO=1` for LR13); no
GPU probe was needed (every picture number below comes from the shader code and Babylon's shader source, not a capture).
Line numbers are this branch's. The lead folds this into `light-measure.md` / the PROPOSAL.

**Parity tolerance found in code.** Unit: the field against the brute-force / GLSL formula to 1e-6
(`tests/lightField.test.ts:208`, `tests/lampFalloff.test.ts:77`). GPU (`scripts/e2e-darkness.mjs:54-58`): a probe point's
level within 0.03 of its target and steady within 0.03 over +-0.2 m, which deliberately keeps probes off shadow edges (no
edge parity test exists), then `DARK_TARGETS` bands (`darkCurve.ts:86`). Below, "tolerance" = 0.03 level, and a band flip
(`LIGHT` 0.28 / 0.6) is the failure a player feels.

Summary: (1) PASS, one fill FAIL fixed; (2) PASS for parity, FAIL for shut doors leaking past the 4-door cap (partly fixed);
(3) FAIL, three fixes built, one shader fix proposed. All fixes are behind the LR13 toggle (`world/shadowAccuracy.ts`,
default off). None needs `src/net`, `PROTOCOL_VERSION` or Michael.

### 1. Static shadow edges: meter / guards against the pixel - PASS (fill edge FAIL, fixed)

- Same point, same number. The meter (`gameState.ts:1533` `bodyLevel`) and guard perception (`enemy.ts:1610`, reading the
  player's `PlayerRef.light`, the meter's own value) read `LightField.visAt`: trilinear between 0.2 m cell centres,
  clamped to the lamp's box (`lightField.ts:324`, `:341`). The shader reads the same R8 bytes with a BILINEAR 3D sampler,
  clamped to the same cell centres (`bakedLamps.ts:894`), the same lamp column lists, the same door test. GPU filtering
  weights are 8-bit: error <= 1/256 of a cell's step, <= 0.004 level per lamp. **PASS** (0.004 < 0.03).
- Where the pixel taps. A surface taps the atlas one cell (0.2 m) off itself along its normal (`bakedLamps.ts:893`), so
  the drawn edge on a floor or wall sits where the field's edge is 0.2 m off that surface; a body's visible side
  (capsule radius 0.22, `gameState.ts:3385`) taps 0.42 m off the axis the meter samples. Over every open 0.5 m point at
  chest height (static level only): warehouseOps 1814 of 7799 points have some visible side of the body in a different
  band from the meter (939 of the 1590 edge points); campusOps 7958 / 76583; ctcourse 787 / 9507. This is a body being
  wider than a point, not a parity break: the meter is the body's chest / head, the picture shows its whole width. LR13:
  warehouseOps 1921 flips (edges are softer but more numerous). Polish option, not built (a gameplay retune): meter =
  the brighter of a small ring of chest samples (what the player sees lit), or tap bodies at their surface without the
  0.2 m offset (characters are not in the occupancy).
- Accuracy against real geometry (meter and picture agree, both off). Synthetic: a bulb at 4 m, 1 m from a 3 m wall.
  The bake's conservative occupancy (shapes grown half a cell, cells taken by their centres, `lampBake.ts:120`) makes the
  wall about 0.15-0.2 m bigger: at chest height the shadow ends 1.35 m past the geometric line (4.71 against 3.36), on the
  floor 1.5 m; 10-90% width 0.16-0.32 m (one cell + trilinear) whatever the distance. The shift is large only when a
  lamp sits just above an occluder's top (here 1 m); more darkness, never a leak. Polish item 4.
- LR13's bigger atlas: `LAMP_CELL` is a constant 0.2 (`lampBake.ts:15`); only the boxes grow. Synthetic edge numbers are
  identical in both modes (box 300 000 -> 768 000 cells). Atlas: warehouseOps 11.3 -> 30.1 MB, ctcourse 8.3 -> 14.3 MB,
  **campusOps 48.1 -> 134.2 MB** (an R8 3D texture; bake 27 s -> 118 s in node): flag for the LR13 perf step.
- **Ambient fill edge: FAIL, fixed.** The field takes the nearest 1 m fill cell (`lightField.ts:242` else-branch,
  `ambientGrid.ts` "nearest"); the shader's `lampAmb` texture is BILINEAR (`bakedLamps.ts:200`, tapped at `:782`), so at a
  zone edge the picture ramps over 1 m and the meter steps. |nearest - trilinear| over open points at 1.0 / 1.6 m:
  campusOps max **0.098**, 970 of 665 681 points over 0.03; warehouseOps / warehouse max 0.045 (14 / 10 points);
  ctcourse 0. Fix: with the toggle on the field reads the fill trilinearly (`lightField.ts:242`), exactly what the texture
  gives; test `tests/shadowAccuracy.test.ts` "the ambient fill".

### 2. Moving occluders - doors PASS (live, both sides); shut doors leak past the 4-door cap: FAIL, partly fixed

- Nothing re-bakes in the game; doors are a live cut in both paths. Leaves are not light shapes (`Doors` meshes, not
  `LevelBuilder` boxes), so the bake sees an open doorway; a closed leaf (`open <= DOOR_SHUT` 0.05, `lightField.ts:28`)
  cuts a lamp by one segment test, in the field per query (`lightField.ts` `doorBlocksOne`, reads `Doors.list` live) and in
  the shader from a per-frame shut flag (`bakedLamps.ts:320` `writeDoors`). Flashlights: the field tests every door
  (`dynamicInto`), the shadow maps draw the leaf, the meter's ray hits the closed door's STATIC body. A door peek crack
  keeps `open` 0 (shut in all three); a stick-held door is shut below 15% (`doors.ts` `drive`), open above in all three.
  Open: light through it is counted in the meter and drawn. **Parity PASS.**
- Nothing else moves: shutters are static boxes (`warehouseS1.ts:212-216`), roller doors are dressing, crates are static,
  breakable glass / grates are never light shapes (light passes in all three), bodies occlude in neither.
- Small accuracy notes (both sides agree): an open leaf casts no lamp shadow; a normal swing passes light from open 0.05
  (drawn 0.6-7.6 deg, under 0.04 s), not the 15% of G41.
- **Shut doors leaking: FAIL.** Each lamp tests only its 4 nearest doors (`DOORS_PER_LAMP`, `lightField.ts:30`; a GPU
  texel, `bakedLamps.ts` t6). A 5th closed door in reach whose doorway the lamp sees passes its light, in the meter and on
  screen alike. Measured (points 0.3-3 m behind each dropped leaf whose segment crosses it):

  | Map | Lamps over the cap (linear / LR13) | Leak points > 0.03 | Max leak | After fix: > 0.03 / max |
  | --- | --- | --- | --- | --- |
  | campusOps | 15 / 51 (max 12 / 23 doors in reach) | 73 / 25 | 0.108 / 0.039 | 33 / 25, 0.075 / 0.039 |
  | warehouseOps | 3 / 30 | 0 / 18 | 0.018 / 0.051 | 0 / 18, 0.018 / 0.051 |
  | ctcourse | 3 / 12 | 0 / 0 | 0 | 0 |
  | warehouse | 0 / 0 | 0 | 0 | 0 |

  Fix built (toggle): each lamp's list leaves out doors whose doorway it cannot see in its bake (`doorSeen`,
  `bakeVisSampler`, `lightField.ts`; the shader uses the same list, `bakedLamps.ts:145`). It halves the linear leaks on
  campusOps; under LR13 the remaining leaks are lamps that really see 5+ doors (2 on warehouseOps, 14 on campusOps).
  Proposed (not built, a shader layout change in `bakedLamps.ts` + `lightField.ts`, outside the owned files): 8 doors
  per lamp (a second door texel, `LAMP_TEXELS` 7 -> 8, `DOORS_PER_LAMP` 8), needed if LR13 is adopted.

### 3. Unshadowed lights - FAIL (three fixes built, one proposed)

Flashlights are the only real lights with baked lamps: `FLASHLIGHTS` 4 slots (`torches.ts:15`), the rig holds
`BAKED_POOL` 4, of which `BAKED_SHADOWS` 2 have shadow maps, 1 with micro detail (`lightRig.ts:28-37`, Textures above
Low). So with 2-4 torches on, 1-3 draw without a shadow map. The meter tests every torch with a Havok ray (`gameState.ts:1620`).

- **3a. Figures and weapons take Babylon's inverse square: FAIL, fixed.** Level, voxel, prop and door materials set
  `usePhysicalLightFalloff = false`; the operator figures (`figure.ts:256`, Wren for both players) and weapons
  (`weaponMesh.ts:48`) keep Babylon's default: 1 / d^2 with no range at all (so the beam-reach cut never applies) and a
  Gaussian cone (`pbrDirectLightingFalloffFunctions` `_Physical`), while the field is `1 - d / 13` x cos^2 (the studio
  stage already works around it, `studioStage.ts:153`). The player's body under a guard's torch, picture / meter, on
  axis: 1.08 at 1 m, **0.30 at 2 m, 0.14 at 3 m, 0.09 at 4 m, 0.05 at 6 m**; 0.2 rad off axis 0.23 at 1 m, 0.06 at 2 m. A
  player the meter calls lit by a torch at 4 m looks almost unlit. Fix: with the toggle the light rig sets the game's PBR
  materials to the standard falloff (`gameLightFalloff`, `lightRig.ts` `fitMaterial`), so a torch lights a body exactly as
  it lights the floor. The menu scene keeps its look (its own scene).
- **3b. Unshadowed torch whose beam a wall cuts: FAIL, partly fixed.** It is drawn with `range = reach` (`lightRig.ts:496`),
  the longest of 5 rays + 0.4 m (`torches.ts:67-92`). Two errors: (i) Babylon's falloff becomes `1 - d / reach`, so the beam
  dims towards the wall it lands on: picture / meter at 0.5 D 0.63-0.76, on the wall **0.12-0.24** (wall at 1.5-8 m) - a
  player standing in the beam by that wall reads lit, looks dark; (ii) when any edge ray escapes past a corner, reach is
  the full 13 m and the beam lights through the wall the other rays hit, on screen only (the meter is dark). Fix built
  (toggle): shadow maps go first to flashlights whose beam is cut (`torchShadowPass`, `lightRig.ts:397`), so with one
  shadow slot the cut torch is the shadowed one and an uncut one draws exactly at its full range. Still wrong when more cut
  torches are on than shadow slots. Proposed (not built: a shader change, GPU check only): draw the 4 torch slots in
  `LampPlugin` with `lampMath` (exact falloff and cos^2 cone, as the field) times a per-torch cut at its beam length, and
  take them out of the Babylon pools. The suggested "bake visibility tap" does not apply: the atlas is per fixed lamp, a
  torch moves.
- **3c. Bodies lit through walls for the guards: FAIL, fixed.** Body light (`enemyManager.ts:2151`) and the witnessed
  kill (`:951`) call `totalAt` without an occluder, so a torch behind a wall lights a body for body-finding while the
  picture (shadowed, or reach-cut) shows it dark. Fix (toggle): one static ray per torch (`rayOccluder`, as the player's
  `lightOccluder`).
- 3d. Capsules (`MAX_CAPSULES` 16, 4 per lamp, `bakedLamps.ts:55-56`): character shadows exist only in the picture (the
  field has no character occluders). A dropped capsule makes picture and meter agree, so the cap is not the risk; the
  shadow itself is: a body in a guard's capsule shadow shows down to 0.15 of that lamp's direct light (`bakedLamps.ts:644`)
  while the meter is unchanged (the darkness curve ignores it). Lists are the first 4 in reach, not the nearest; dead
  bodies and the co-op partner cast none (`gameState.ts:829`). Polish: skip capsule shadows on character materials.

### Fixes made (all behind `shadowAccuracyOn()`, default off; on with `?falloff=photo`)
- `src/world/shadowAccuracy.ts` (new, pure): the switch (`setShadowAccuracy` override), `gameLightFalloff`,
  `torchShadowPass`, `rayOccluder`.
- `src/world/lightField.ts`: trilinear fill; `bakeVisSampler`, `doorSeen`, `lampDoorLists(..., seen)`.
- `src/world/bakedLamps.ts`: the same door list. `src/world/lightRig.ts`: figure / weapon falloff, shadow pass order.
- `src/ai/enemyManager.ts`: `bodyOccluder` on the two body-light samples (a Guard AI file: 3 lines, may need a merge look).
- Test `tests/shadowAccuracy.test.ts` (7); unchanged and green: `lightField`, `lights`, `lampFalloff`, `coopTorches`; tsc clean.
- Default unchanged: every path reads the switch once and does today's thing when off.

### For the lead
- Wiring: the LR13 settings toggle already drives this (it follows `lampFalloffMode()`). To split it, call
  `setShadowAccuracy(on)` at boot before the map builds (`main.ts`, next to `setLampFalloff`). Co-op peers must run the
  same mode (as LR13); no wire change.
- GPU check when adopted (Test Runner, 4189): a guard's torch on Wren at 2-4 m against the floor beside her; a guard facing
  a wall with two torches on (micro detail on).

### Polish list (not built)
4. Penumbra and contact: panels and bulbs bake from one sample point (`lampBake.ts` `lampSamples`), strips along their
   length only, so edges are one cell wide (0.16-0.32 m) at any distance; a real fitting's penumbra grows with distance
   behind the occluder x fitting size / distance to it. Sample panels over their area (2x2 or 3x3: bake time x4-9) and
   shrink the conservative grow at high-leverage tops (lamp under ~1.5 m above an occluder). No contact shadows for
   static geometry beyond the bake; character capsules widen with distance (`bakedLamps.ts:642-644`).
5. One-bounce fill: none today (the fill is the zone's flat ambient, on or off alike). A baked per-lamp bounce term that
   switches with its lamp (PROPOSAL 7.5) keeps "a cut circuit is dark" and needs its own parity test.

**Integrated (lightrev, after LR13).** Merged into `feature/sector-redesign-lightrev`; `GameState.create` sets
`setShadowAccuracy(matchShadowAccuracy(mode))` with the resolved LR13 mode (host's `start.lf` in co-op, `?falloff=photo`,
the setting), next to `setLampFalloff`, before the map builds: on exactly in Realistic, never mid-match. No wire change.
`src/ai/enemyManager.ts` (Guard AI owner to review): one occluder built at construction, passed to the two body-light
`totalAt` calls; nothing allocates per tick.
