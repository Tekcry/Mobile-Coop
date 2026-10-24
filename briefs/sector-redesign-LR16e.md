status: done feature/sector-redesign-lr16e 603a36c3

Lead note (Sector Ops Build ~20:20): a fix round is landing on lr16int (torch SpotLight feather, char-shadow cone fit, lights.contribution). Build from c7a26ca7 as written; the lead merges. Do not edit src/world/lightRig.ts torch code, src/world/charShadows.ts or src/world/lights.ts. Desktop-free: unit tests only, vitest --maxWorkers=2.

# LR16e - contact-hardening penumbra for the baked lamps (Opus)

Planner: Opus 5.5, 2026-10-23. Plans only; the builder writes the code.

## Goal (Michael's words)
~18:08: "the edge of lights should diffuse against walls/floors/etc unless something directly cuts off the light ray,
depending on how far away it is. Must be realistic depiction of light." ROADMAP Decided "Lighting everywhere": "a
hard edge only where an occluder cuts the ray, softer the farther the occluder is from the surface (contact-hardening
penumbra); meter and guard perception follow the picture (light parity)."

Done means: a lamp shadow is sharp where the occluder touches the receiver and widens with the receiver-occluder gap,
on screen and in the meter alike; no 0.2 m stair on the open floor away from contact.

## Base and branch
- Base: `feature/sector-redesign-lr16int` @ c7a26ca7 (LR16a, b, f, v, d campus; checker B PASS). New branch:
  `feature/sector-redesign-lr16e`. File:line below are at fe23ef4c; `src/voxel/*`, `lightField.ts`, `bakedLamps.ts` are
  unchanged on c7a26ca7.
- Read first: `lr16-plan.md` (diagnosis 4, LR16e row, "Perf / VRAM", "Light parity"), `lr16b-build.md`,
  `docs/systems/agent-preamble.md`.
- Cloud build: `npx tsc --noEmit`, `npx vitest run <files> --maxWorkers=2`. No e2e, GPU, or `npm run check`.
- Runs in parallel with LR16t and LR16-1. Overlap with LR16-1: `src/voxel/lampBake.ts` (LR16-1 adds one call after
  `bakeOne`) and `src/voxel/lampJobs.ts:13` `LAMP_VERSION` (this slice sets 2, LR16-1 sets 3; the merge keeps 3).

## Today (file:line at fe23ef4c)
- `src/voxel/lampBake.ts:15` `LAMP_CELL = 0.2`; `:144` `bakeOne`; `:176` `clear()` marches each fixture sample;
  `:203-232` per cell `vis = seen / ns x 255`; `:234-249` solid cells take the brightest air neighbour. Bulbs and
  panels have ns = 1 (`lampSamples` `:72`, one point per 0.5 m of the long side, max 6): visibility is binary per
  cell, so every shadow edge is the same 0.2 m trilinear ramp with grid stairs, whatever the distance (diagnosis 4).
- The atlas is ONE byte per cell: `bakedLamps.ts:185` `RawTexture3D(..., TEXTUREFORMAT_R, UNSIGNED_BYTE)`; campus
  Realistic ~205-224 MB. The field reads the same bytes: `lightField.ts:316` `visInto` (trilinear).

## Decision: the penumbra is baked into the visibility byte (bake-time PCSS)
The plan's "pack occluder distance in the spare channel" has no spare channel to use: the atlas is R8. Options weighed:
| Option | VRAM | Samplers | Shader / field cost | Parity |
|---|---|---|---|---|
| RG8 atlas (vis + occluder distance), runtime PCSS | +100% (~205 -> ~410 MB) | 0 | 8-16 3D taps per lamp per pixel; field x8 | fixed kernel needed both sides |
| Separate half-res distance texture | +12.5% | +1 (16 cap) | as above | as above |
| Distance tiles packed inside the same R8 atlas | +12.5% | 0 | as above + an offset lane | as above |
| **Bake-time PCSS: the occluder distance used in the worker, the filtered visibility stored** | **0** | **0** | **0** | **automatic (same bytes)** |
Baked lamps and the level are static (doors are an analytic test, characters are LR14 / LR16f), so nothing a runtime
PCSS would add moves. Pre-filtering in the bake gives the same penumbra at zero runtime cost and keeps the meter equal
to the picture by construction. The shader and the field change no formula; this slice proves parity with tests.

## Files (only these)
- `src/voxel/lampBake.ts`: `clear()` returns the hit distance; per-lamp penumbra pass (below) between the visibility
  loop (`:203-232`) and the solid-cell pass (`:234`); constants exported.
- `src/voxel/lampJobs.ts:13`: `LAMP_VERSION` 1 -> 2 (old caches are never read).
- Tests: `tests/lampBake.test.ts`, `tests/lightField.test.ts` (parity additions only), `tests/lampFalloff.test.ts`
  (unchanged, must pass).

## Algorithm (worker, per lamp box, allocation per lamp only, never per cell)
Constants (export as `PENUMBRA`):
```
PENUMBRA = {
  bulb: 0.08,          // m, smallest fixture (a bare bulb / small downlight)
  maxWidth: 0.6,       // m, widest penumbra written (3 cells)
  minWidth: 0.1,       // m, half a cell: smooths grid stairs at contact, keeps contact sharp
  search: 3,           // cells, blocker search radius (= maxWidth / LAMP_CELL)
  nearOcc: 0.25,       // m, = NEAR_LIGHT: smallest occluder-to-light distance used
}
fixture size s = max(bulb, ns > 1 ? min(sx, sz) : max(sx, sz))   // sx, sz: LAMP_STRIDE lanes 8, 9
```
Why these: the penumbra of an area light is `s x (receiver - occluder) / (occluder - light)`. A 0.3 m panel 3 m up
with a crate edge 0.5 m off the floor gives 0.3 x 0.5 / 2.5 = 0.06 m (sharp, below a cell: `minWidth`); a 1.5 m
shelf gives 0.3 x 1.5 / 1.5 = 0.3 m (soft). Strips already sample along their long axis (ns > 1), so only their short
side (`min`) widens the filter, or the long axis would be blurred twice. 0.6 m cap = 3 cells keeps the filter cheap.

Pass 1 (existing loop, extended): `clear()` returns the march distance `t` of the first occupied cell (or -1 clear).
Per air cell keep `dro` = mean `t` over its blocked samples (receiver-to-occluder distance, Float32 scratch, -1 when
no sample was blocked) and `vis0` (today's value).

Pass 2 (new, edge band only):
1. Edge mask: an air cell whose 6 neighbours (air) do not all have the same `vis0`, dilated by `search` cells
   (separable max over x, y, z on a byte mask). Cells outside the band keep `vis0` (fully lit or fully hidden).
2. Blocker mean (separable box sums of `dro` and of its count over radius `search`, blocked cells only): `dB`.
   No blocker in range: keep `vis0`.
3. `dRL` = distance cell centre to lamp; `dOL = max(dRL - dB, nearOcc)`;
   `w = clamp(s x dB / dOL, minWidth, maxWidth)` (m); radius in cells `r = w / LAMP_CELL / 2`.
4. Filter `vis0` over radius `r` with a tent (fractional last tap), separable x, y, z, each pass using the receiver's
   own `r` (the standard per-pixel-width approximation); occupied cells weigh 0 (a wall never darkens the air beside
   it); normalise by the weights.
5. Write `vis = round(filtered)`; then the existing solid-cell pass.
Deterministic (no random, fixed order); no change outside the band, so a fully lit or fully hidden cell keeps its byte.

Cost: the band is ~10-20% of cells; ~6 passes x 7 taps there. Expect bake time +5-15% (campus 118 s -> under 136 s;
ctcourse in the unit test). Report node bake times before / after for ctcourse and warehouseOps in the build report.

## Acceptance
- Contact sharp, distance soft: a crate on the floor under a lamp gives a 10-90% floor edge width <= 0.25 m at its
  foot; a slab 1.5 m over the floor gives >= 0.4 m (one lamp, s = 0.3).
- Width grows monotonically with the occluder height (0.3 / 0.8 / 1.5 m).
- Open floor far from any edge: bytes unchanged (255 / 0); no light through a 0.2 m wall: cells behind a wall from a
  lamp 2 m in front stay 0 at 0.3 m and further behind it.
- The field and the GLSL read the new bytes: the LR16b test "meter = GLSL formula x vis at 200 seeded points" passes
  on a fixture bake that contains penumbra cells (sample the band on purpose).
- `LAMP_VERSION` 2. `npx tsc --noEmit` clean; listed tests + `lampAtlasFit`, `lampGridLossless`, `shadowAccuracy`
  pass. The 15 map-light failures listed in `lr16b-build.md` may move; report the count, do not edit those tests
  (LR16g).

## Unit tests by name (`tests/lampBake.test.ts`, new describe "(LR16e) penumbra")
- "contact shadow stays sharp (edge width <= 0.25 m at a crate's foot)"
- "a raised occluder's shadow is soft (>= 0.4 m at 1.5 m)"
- "penumbra width grows with the receiver-occluder gap"
- "fully lit and fully hidden cells keep their bytes"
- "no light through a wall"
- "strips: soft across, the long axis not blurred twice"
- "deterministic: same input, same bytes"
- "bake time within 1.2x of the LR16b bake on the fixture"
`tests/lightField.test.ts`: "(LR16e) field equals trilinear of the baked bytes in a penumbra band" (brute force).

## Laptop GPU checklist (lead, after done)
1. Crate / rack contact shadow under a lamp (Workshop, S1 goods-in, warehouseOps rack aisle): sharp at the base, soft
   further out; no 0.2 m stairs on open floor.
2. Doorway shadow on the floor from a lamp in the next room: soft with distance.
3. Parity probe: meter vs shader readback at seeded points in shadow bands (warehouseOps, campusOps).
4. Bake time and atlas MB per map (first load after `LAMP_VERSION` bump re-bakes): campus, warehouseOps, ctcourse.

## Do NOT touch
`src/world/bakedLamps.ts`, `src/world/lightField.ts` (no formula change), `src/world/lampMath.ts`, the atlas format,
`src/world/charShadows*.ts`, `src/world/shadowAccuracy.ts`, map data, the map-light tests.

## Model
Opus. Estimate ~1 window; ~250-350 lines incl. tests.


Reopened 2026-10-23 ~20:05 (orchestrator): Cloud Builder 1 stopped at the account swap with this claimed. Resume from the head of its feature branch on origin if it is ahead of the brief base (WIP), else start from the base.

## Report (lead, 2026-10-24)
Built on the desktop by Sector Ops Build after the cloud claim went stale; released in #291 (4.88.0, on master).
