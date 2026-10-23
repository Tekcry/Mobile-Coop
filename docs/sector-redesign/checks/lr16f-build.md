# LR16f build - character shadow softness (contact hardening)

Branch `feature/sector-redesign-lr16f` off `feature/sector-redesign-lampx` 1c22b913. Spec: `lr16-plan.md` LR16f row and
"Perf / VRAM". Michael ~18:08: light edges diffuse "depending on how far away it is", realistic.

## Changes
- `src/world/charShadows.ts:80-142` `CHAR_SHADOW_GLSL`: the 2 x 2 bilinear PCF is replaced by PCSS-style
  contact hardening. Same normal offset, metric and bias as before (the contact rule is unchanged).
  1. Blocker search: first `taps / 2` points of the fixed Poisson kernel, radius = the widest penumbra the lamp could
     give here (blockers at the slot's near plane), in texels. No blocker: lit, after the search taps only.
  2. Mean blocker depth -> metres (metric slope 1 / (far - near)); penumbra radius = `lightRadius x (dr - db) / db`,
     capped at `maxPenumbra`; texels = penumbra x `0.5 T sx / dr` (`sx` = |first row of the view-projection| =
     1 / tan(half angle)), clamped to [1, 24].
  3. Filter: first `taps` points of the kernel, nearest `texelFetch`, averaged; `mix(floor, 1, lit)` as before.
- `src/world/charShadows.ts:216-217` `configure`: `info[1]` (`lampCsI.y`, the unused "tiles per row" lane - the shader
  hard-codes the 2 x 2 layout) now carries the preset's tap count. No uniform, define or `bakedLamps.ts` change.
- `src/world/charShadowSet.ts:71-77` new constants: `lightRadius` 0.12 m, `maxPenumbra` 0.3 m, `minTexels` 1,
  `maxTexels` 24. `:80-91` `CHAR_SHADOW_TAPS`, `CHAR_SHADOW_KERNEL` (16), `charShadowTaps(lamps, tile)`. `:93-135`
  `CHAR_SHADOW_DISK`: 16-point Poisson disc by Mitchell's best candidate from a fixed seed, built once at load (every
  prefix well spread). `:137-149` `charPenumbra`, `charFilterTexels` (the GLSL's formula, for tests).
  Note: the brief named `charShadows.ts` only; the pure parts went into its pure half `charShadowSet.ts` (no other
  LR16 slice touches it) so they test without Babylon.

Picture only: nothing here reaches the light field, the meter or guards (LR14 rule unchanged).

## Taps per preset (per pixel, per lamp with a slot, inside that slot's frustum)
| Shadow tier | Filter taps | Search taps | Fetches, no blocker found | Fetches, in/near a shadow | Before |
|---|---|---|---|---|---|
| Low / Medium | capsules (no maps) | - | 0 | 0 | 0 |
| High (2 lamps, 512) / override On | 8 | 4 | 4 | 12 | 4 |
| Ultra (3 lamps, 1024) | 12 | 6 | 6 | 18 | 4 |
| Epic (4 lamps, 1024) | 16 | 8 | 8 | 24 | 4 |

No per-frame allocation (the tap count is set at `configure`; the kernel is a GLSL const array).

## Expected GPU cost
Only pixels lit by one of the 2-4 slotted lamps and inside its fitted cone run the test, and most of those exit after
the search taps (no blocker). Fetches are R16F/R32F nearest from one atlas, mostly cache-local (radius <= 24 texels).
Estimate: High ~ +0.1-0.2 ms, Epic ~ +0.3-0.5 ms at 1080p on the laptop GPU when a character's shadow fills much of
the screen; near zero otherwise. To be measured.

## Tests
`tests/charShadowSet.test.ts` new block "LR16f": kernel in the unit disc, every prefix (4/6/8/12/16) spread (min
spacing > 1.4 / sqrt(n), centroid < 0.35), the GLSL embeds those exact taps and has no time / random input; penumbra
0 at contact, monotonic in the receiver-blocker gap, capped; texel width monotonic, floor at contact, cap; preset tap
gating 0/0/0/8/12/16 and the override; pure math allocation-free. `npx tsc --noEmit` clean; vitest
`charShadowSet`, `lampPluginClone`, `lampPluginGap` 18/18 pass.

## GPU check (laptop, `E2E_GPU=1`, pending)
- Shader compiles on ANGLE D3D11 (the const `vec2[16]` array and the uniform-bounded loops with `break`).
- Character at 1 m and 4 m from a lamp: feet contact sharp, head/shoulder shadow soft (wider at 4 m); no shimmer while
  standing still or walking; no tile seam or atlas bleed at the map edge (taps clamp to the tile).
- Banding: High's 8 taps give 9 levels in a wide penumbra; check it reads as soft, not stepped.
- Acne / peter-panning at the feet unchanged vs before.
- e2e `char-shadow` suite; perf budget on High and Epic with 2+ characters near lamps.

## Open
- `lightRadius` 0.12 m is one value for every fixture; per-lamp fixture size would need a lamp texel lane (LR16e area).
