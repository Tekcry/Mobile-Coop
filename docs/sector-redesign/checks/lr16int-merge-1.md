# lr16int merge 1 - LR16-1 (one-bounce fill + fix round) into lr16int

Integrator: Opus 5.5, 2026-10-23. `feature/sector-redesign-lr16int` @ 6eb6a863 (LR16dx + LR16e + LR16t in) + merge of
`origin/feature/sector-redesign-lr16-1` @ 666b2a17 (cut from c7a26ca7). LR16-5 (flicker) not merged (it follows
separately).

## Conflicts and how they were resolved (both sides kept)
| File | Conflict | Resolution |
| --- | --- | --- |
| `src/voxel/lampBake.ts` | `bakeLamps` loop: LR16e's `pen` + `bakeOne(..., sb, pen)` vs LR16-1's bounce arrays and `t0` / `t1` timing | `const pen` before the loop, LR16-1's bounce arrays, `bakeOne(L, li, bx, occShapes, sb, pen)` inside `t0` / `t1`; `penumbra = true` parameter kept. The bounce reads the penumbra-filtered `vis` (the pass runs inside `bakeOne`), as lr16e-check "Merge hazards" says. |
| `src/voxel/lampJobs.ts` | `LAMP_VERSION` 2 (LR16e) vs 4 (LR16-1) + LR16-1's `cacheOk` | `LAMP_VERSION = 5`, `cacheOk` kept whole (bounce boxes / data / wall bits). See below. |
| `src/world/bakedLamps.ts` | imports (LR16t `TorchShadowLink`, `TORCH_VEC4` vs LR16-1 `bounceGrid` / `lampBounce`); the fragment uniform line (LR16t `lampTorch[... * TORCH_VEC4]`, `lampTsM` / `lampTsP` / `lampTsI` vs LR16-1 `lampBounceC`) | all imports kept; the fragment line is LR16t's with `uniform vec4 lampBounceC;` after `lampFillC` (matches the UBO list, which auto-merged with both). |
| `src/world/lightField.ts` | the `lampMath` import (lr16int dropped `lampTerm` for `lights.lightTerm`; LR16-1 added `BounceGrid`) | `BounceGrid` import + lr16int's `lampMath` import without `lampTerm` (no use left). |
| `tests/lightField.test.ts` | both appended a test at the same spot | both kept: "(LR16e) field equals trilinear of the baked bytes in a penumbra band" then "(LR16-1) level adds the bounce read as the picture reads it". |

Auto-merged without conflict: `src/world/world.ts` (bounce into the bake extras), `tests/lampFalloff.test.ts`,
`tests/lampGridLossless.test.ts`, the new LR16-1 files. Reviewed `bakedLamps.ts` hunks: UBO list has `lampBounceC` and
LR16t's torch uniforms; the bind sets `lampBounceC`; `NS_GRID2_GLSL`, `uploadBounce`, the RGBA8 fill texture and the two
`nsBounce` adds are LR16-1's unchanged.

## LAMP_VERSION = 5 (not the lead's 4)
The lead's rule is "one number past both". Both are now 2 (LR16e) and 4 (LR16-1's fix round bumped 3 -> 4 itself),
so past both is 5. At 4, a machine that ran LR16-1 alone after d795e27c holds `lamps:...:v4:...` entries with the
bounce and wall bits but no penumbra; `cacheOk` accepts them (the penumbra lives in the `vis` bytes, no field marks
it), so a merged build would load a bake without the penumbra - the hazard lr16e-check names for v3. Only the key can
reject them; 5 does. Cache coverage after the merge:
- penumbra: `LAMP_VERSION` 5 in the key (`lightBake.ts:88`);
- bounce + wall bits: `cacheOk` (`lampJobs.ts`) needs `bounce.boxes` / `data` / `bits` with the right lengths, and the
  version.
No test or script asserts `LAMP_VERSION` (grep `src`, `tests`, `scripts`).

## Samplers
`LampPlugin.getSamplers` = 9 (`lampVis`, `lampData`, `lampVolA`, `lampVolB`, `lampMoon`, `lampAmb`, `lampSky`,
`lampCsAtlas`, `lampTsAtlas`), the same 9 as lr16int: LR16-1 adds none (the bounce and its wall bits ride `lampAmb`,
now RGBA8). Per-shader worst case stays LR16t's count: 16 on the micro voxel shader (15 + `lampTsAtlas`), <= 16 on
every other tier. Pending PC run: `scripts/e2e-lightbake.mjs` sampler read (and the `nsGrid2` compile on ANGLE).

## Checks (unit only; slot-1 lock; no e2e, GPU, build or `npm run check`)
- `npx tsc --noEmit -p .`: clean.
- vitest `--maxWorkers=2`: lampBounce, bounceGrid, lightField, lampFalloff, lampGridLossless, levelFillParity,
  perception, torchOcclusion, charShadowSet, shadowAccuracy, lampPluginClone, lampPluginGap: **12 files, 132 / 132
  pass** (129 s). `tests/lampPenumbra*.test.ts` matches nothing (LR16e's tests live in `lampBake.test.ts`).
- Extra: lampBake (LR16e penumbra + bake-time), torchShadowSet, lampTorchCone: 3 files, 33 / 33 pass.
- Map-light + campus: ctcourseLight, warehouseS1Light, S2, S3, campusS1-S5: **13 failed | 223 passed | 4 skipped**.
  lr16int was 15, LR16-1 13: the merge has LR16-1's 13, the same tests, none new. campusS1-S5 green.

### Map-light reds (13; LR16g re-levels, not tuned here)
- ctcourseLight (4): marlow-bunker tuned levels within 0.08; every must-see spot lit enough; airlock lamps stay in
  their airlock / wall-top lamps light no ground; the dark between the pools stays.
- warehouseS1Light (3): stealth maxima per class; dark pockets stay dark; pockets +0.05.
- warehouseS2Light (3): route / objective / decision points lit enough; stealth maxima per class; pockets +0.05.
- warehouseS3Light (3): stealth maxima per class; dark pockets stay dark; pockets +0.05.

## Risks / open
1. GPU not run: `nsGrid2` (8 `texelFetch` + flood) beside LR16t's torch PCSS in one fragment shader; sampler read,
   compile on ANGLE D3D11 and frame time pending the laptop GPU list (lr16-1-build, lr16t-build).
2. Bake time: LR16e's penumbra pass + LR16-1's bounce (+~20%) both per lamp; worker scratch as lr16e-check polish 1.
3. LR16-5 (flicker) edits `bakedLamps.ts` / `lightField.ts`: its merge lands on this resolution (the uniform line now
   holds both LR16t's and LR16-1's uniforms).
