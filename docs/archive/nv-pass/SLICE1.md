# Night vision pass - slice 1 report (implementer, 2026-10-20)

Realistic modern green-phosphor night vision (A1). Code and unit tests only; no build, no e2e, no GPU run (desktop
heavy.lock held). Nothing committed.

## What was built
1. **Bodies no longer glow.** In `LampPlugin` (render path only) the non-voxel surfaces' flat ambient-grid fill is
   scaled under night vision by `bodyFillScale(k, normal.y)`: x`BODY_FILL.nv` (0.35) facing up, down to x0.175 facing
   down (hemisphere wrap 0.5), eased in with the goggles (k = `visionAmount(visionGain)`, passed in `lampDark.z`). The
   probe's diffuse irradiance on those surfaces takes the same scale. Lamp light on a body is untouched (a body under a
   lamp stays lit). Off, the factor is exactly 1. The ambient grid, light field, light bake and `LIGHT_GAIN` are not
   touched; `visionIsolation` passes unchanged.
2. **Gain and tube.** The lighting's NV gain is lower and flatter: `VISION_GAIN` 8 -> 6, and under the goggles the
   darkness curve's floor eases up to `VISION_FLOOR` 1.0 (`visionDark`, applied to the `lampDarkP` uniform in `bind`;
   no shader change to the curve). Effect (CPU model of the Epic chain, 50% card): deep dark (level 0.02) about 3x
   brighter than before, level 0.12 about the same, 0.27 / 0.4 no longer clipped (0.91 / 0.97 -> about 0.6 / 0.87),
   lit near white. Tube: drive gamma 1.7 -> 1.3, white clip from 0.85, green phosphor, dim green floor, grain stronger
   in the dark (and tinted with the phosphor). The eyepiece / lens ring are untouched (slice 2); the settings vignette
   (0.35) stays, so no extra vignette was added.
3. **Bloom.** The NV bright pass detects a half-float source and compresses it first (`bloomInput` = l / (1 + l)),
   threshold 0.8 on that (linear 4), knee 0.1; an 8-bit source (`?gfx=min`, no half-float support) keeps the old
   threshold 0.85 on raw luma (`ldrThreshold`). Strength 1.4 -> 0.6 (the glow is now 0..1 per tap). Lit walls and
   bodies (linear about 2 under the new gain) no longer glow; fixtures do: `NV_BULB` 2.5 -> 8 so a fixture is clearly
   past the threshold (electro keeps its old x2.5 through `ELECTRO_BULB`). The ABC veil is unchanged. The default
   pipeline bloom goes to weight 0 while NV is on and back to 0.35 when off (`PostStack.setNightVision`, no pipeline
   rebuild; it follows `post.nightVision`, also in photo mode so shots that set the post directly get it). Stale 8-bit
   comments fixed (nightVision.ts `BLOOM`, `brightShare`; nightBloom.ts header).
4. **`?gfx=min`.** No baked lamps -> no lighting gain: the tube lifts its input by `NV_TONE.postLift` 2 (uniform
   `nvLift`, set in `renderVision` from `world.lamps`). Unit-tested: NV output luma >= input luma for 0..0.9.

## Constants, old -> new
| Constant | File | Old | New |
| --- | --- | --- | --- |
| `VISION_GAIN` | `src/world/darkCurve.ts` | 8 | 6 |
| `VISION_FLOOR` (new) | `src/world/darkCurve.ts` | (curve floor 0.3 under NV) | 1.0 (eased with the gain) |
| `BODY_FILL` (new) | `src/world/darkCurve.ts` | (fill x1) | `{ nv: 0.35, wrap: 0.5 }` |
| `VISION_TARGETS` 0.12 | `darkCurve.ts`, mirrored in `scripts/e2e-darkness.mjs` | 0.25-0.45 | 0.20-0.45 (estimate) |
| `VISION_TARGETS` 0.7 | same | 0.90-1 | 0.70-1 (estimate) |
| `NV_TONE.gamma` | `src/vfx/nightVision.ts` | 1.7 | 1.3 |
| `NV_TONE.tint` | same | [0.54, 0.64, 0.49] | [0.35, 0.85, 0.30] |
| `NV_TONE.black` | same | [0.016, 0.022, 0.016] | [0.014, 0.04, 0.014] |
| `NV_TONE.white` | same | [0.96, 1.0, 0.92] | [0.86, 1.0, 0.80] |
| `NV_TONE.whiteFrom` | same | 0.65 | 0.85 |
| `NV_TONE.postLift` (new) | same | - | 2 (no baked lamps only) |
| `BLOOM.bright.threshold` | same | 0.85 on raw HDR luma | 0.8 on compressed luma (half float) |
| `BLOOM.bright.ldrThreshold` (new) | same | - | 0.85 (8-bit source) |
| `BLOOM.bright.strength` | same | 1.4 | 0.6 |
| `SENSOR_GRAIN.night` | `src/vfx/visionLook.ts` | 0.035 | 0.06 |
| `SENSOR_GRAIN.litNight` | same | 1 | 0.4 |
| `NV_BULB` | `src/world/lightRig.ts` | 2.5 | 8 (electro stays 2.5 via `ELECTRO_BULB`) |
| default bloom weight under NV | `src/vfx/postStack.ts` (`BLOOM_WEIGHT` 0.35) | 0.35 | 0 while NV on |
| e2e-darkness NV gain | `scripts/e2e-darkness.mjs` | literal 8 | `w.lamps.visionGainMax` (= `VISION_GAIN`) |

## Files
- `src/world/darkCurve.ts`: `VISION_GAIN`, `VISION_FLOOR`, `visionAmount`, `visionDark`, `BODY_FILL`, `bodyFillScale`,
  GLSL `nsBodyFill`, `VISION_TARGETS`.
- `src/world/bakedLamps.ts`: `bind` passes the NV amount and the lifted curve; PBR path scales the non-voxel fill and
  irradiance; `visionGainMax`, `darkNow` scratch.
- `src/vfx/nightVision.ts`: tube constants, `postLift`, `nvDrive(l, veil, lift)`, `bloomInput` (+ GLSL), bloom table.
- `src/vfx/nightBloom.ts`: bright pass compresses a half-float source (`bright` is a vec4 now).
- `src/vfx/cinematicPost.ts`: `nvLift` uniform, `nightVision` getter, `setNightLift`, phosphor-tinted grain.
- `src/vfx/postStack.ts`: `setNightVision` (default bloom weight 0 under NV).
- `src/vfx/visionLook.ts`: night grain.
- `src/world/lightRig.ts`: `NV_BULB`, `ELECTRO_BULB`.
- `src/game/gameState.ts` (`renderVision` and the photo branch of `frameUpdate`): lift, stack bloom, electro bulb share.
- `scripts/e2e-darkness.mjs`: NV gain from the game, NV targets mirrored.
- Tests: `tests/nightVision.test.ts`, `tests/darkCurve.test.ts`, `tests/vision.test.ts`.

## Tests changed
- `nightVision.test.ts`: the "pale grey-green" ratios became green-phosphor asserts (G > 2x R and B, green floor,
  pale green-white highlights); dark-room probe input 0.74 -> 0.6 (the new gain's estimate); new: soft gamma / visible
  dark steps / late clip, the `?gfx=min` lift (never darker than off), GLSL mirrors tint and floor; new HDR bloom
  block (compression monotone and < 1, lit wall at linear 2 does not glow, a fixture at 7 does, 8-bit threshold).
- `darkCurve.test.ts`: NV lit target >= 0.7 (was 0.9) and above the dark target; the 5x check is now >= (0.2 = 5 x
  0.04); new: `visionDark` (off = identity, floor lift, monotone, deep dark gains more than lit, not flat) and
  `bodyFillScale` (1 off, cap, hemisphere order, monotone in k, GLSL mirror).
- `vision.test.ts`: night grain 0.05-0.08 at black, under half at full drive, monotone (was < 0.05 and equal).
- `visionIsolation.test.ts`: unchanged, passes. (Vitest rewrote its snapshot file with LF endings; byte-identical to
  HEAD, git shows it as modified only through the line-ending setting - nothing to commit there.)

## Results
- `npx vitest run tests/nightVision.test.ts tests/darkCurve.test.ts tests/vision.test.ts tests/visionIsolation.test.ts
  tests/lampBake.test.ts tests/goggleColour.test.ts`: 6 files, 50 tests passed.
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the changed `src` and `tests` files: clean (the script is lint-ignored).
- Not run (lock held): `npm run check`, build, any e2e, GPU.

## What the GPU check should look at
1. Bodies (Wren, guards, weapons) in a dark interior next to a wall: same brightness as the wall, shaped (top lit more
   than underside), not a white silhouette; a body under a lamp still clearly lit. If still bright: lower
   `BODY_FILL.nv`; if bodies now vanish: raise it.
2. Overall NV brightness: dark interiors readable with grey steps (no flat murk, no crush to black); mid areas no
   longer clipping. Too dark: `VISION_GAIN` 6 -> 7 or `VISION_FLOOR` up; too flat: `NV_TONE.gamma` up toward 1.4.
3. Bloom: fixtures glow, lit walls and bodies do not halo; with a lamp close in view the room sinks (ABC). No glow on
   fixtures: lower `BLOOM.bright.threshold` (0.8 -> 0.75) or raise `NV_BULB`. On Medium / Epic, check the default
   bloom returns when NV goes off (lamps in normal view should still bloom).
4. Colour: clearly green, highlights pale green-white, black a dim green, not grey.
5. Grain: visible scintillation in the dark, nearly clean in lit areas; not dirty.
6. `?gfx=min`: NV not darker than off.
7. `scripts/e2e-darkness.mjs` (Epic) NV rows: the targets are estimates; set `VISION_TARGETS` (and the script's `NV`
   copy) from the measured values.
8. Electro: fixtures unchanged (x2.5).

## Risks
- G101 ("grain as in CT"): night grain at black goes from 0.035 to 0.06 peak to peak (std about 1.7%; the old test
  cited CT std about 1%). The lead asked for 0.06-0.08; I took the low end.
- The NV targets are CPU-model estimates; the e2e-darkness card is itself a non-voxel surface, so its NV reading now
  includes the body-fill cap (lower when the card is fill-lit, unchanged when lamp-lit).
- The body cap also applies to props and any other non-voxel PBR surface with the fill (crates, parts): they dim under
  NV like the bodies. The irradiance scale may slightly dull metal-ish characters' diffuse in NV (specular untouched).
- `NV_BULB` x8 makes fixtures very hot in NV; tonemap clips them anyway, but the NV bloom around them grows (strength
  is lower to compensate).
- The NV bloom's half-float detection reads the first post process's input texture type; a GPU without half-float
  render falls back to the 8-bit threshold (old behaviour).
- Cheap test path / `?baked=0` on higher presets also has no baked lamps, so it gets the post lift too (intended).

## Toggling night vision for a shot (page JS)
```js
const g = window.__app.current;
g.photoFreeze(false);
g.vision.set('night');            // 'off' to compare
// wait ~10 frames, then
g.photoFreeze(true);
```
For the darkness probe style (no vision state): `g.world.lamps.visionGain = g.world.lamps.visionGainMax;
g.post.setNightVision(1);` (and `1` / `0` to undo); in photo mode the default bloom follows `post.nightVision`.
