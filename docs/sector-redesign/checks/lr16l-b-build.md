# LR16-L Part B build - Low / phone robustness (picture only)

Builder: Opus 5.5, 2026-10-23. Branch `feature/sector-redesign-lr16l-b`, base lr16int `82f9e1bb`. Brief:
`docs/sector-redesign/briefs/LR16-L.md` (on `feature/sector-redesign-polish`), Part B only. Part A (the bake) is another
agent's; `src/voxel/**` untouched.

## Changes
- B1 (`31336336`) highp samplers for depth and HDR colour:
  - `src/vfx/taau.ts:30-33` textureSampler, historySampler, depthSampler.
  - `src/vfx/postStack.ts:46-47, 52` (volumetric / height fog) textureSampler, depthSampler.
  - `src/vfx/cinematicPost.ts:11-12, 25, 30` textureSampler, glowSampler, exposureSampler.
  - `src/vfx/paniniPass.ts:8` textureSampler.
  - `src/vfx/nightBloom.ts:12, 37` `src` of the bright pass and the auto-gain measure (both read the HDR scene; found by
    the brief's grep of `src/vfx`).
- B2 (`849e998f`) `src/world/bakedLamps.ts:904` `LAMP_GLSL` now starts with `precision highp int;` (doc comment
  `:898-903`); `:624-625` the same after `precision highp sampler3D;` in `MIX_GLSL`.
- B3 (`fe55b4e7`) `src/world/surfaceAtlas.ts:213-216` `float e = min(texel, 1.0 / 512.0) * 4.0;` with the why comment.
  Low (256 px tiles) now gets Medium / High's slope step; Medium / High (512) and Ultra / Epic (1024) compute the same
  value as before.
- B4 tests: new `tests/glslPrecision.test.ts` (3 tests): every `uniform ... sampler2D` in `taauFragmentShader` (3),
  `volumetricFragmentShader` (2), `cinematicFragmentShader` (3), `paniniFragmentShader` (1) is highp, and nightBloom's
  BRIGHT / MEASURE `src` (read from the source file, those shaders are not in the ShadersStore); `LAMP_GLSL` starts with
  `precision highp int;`, `MIX_GLSL` contains it; `surfaceNormalPixelShader` contains `min(texel, 1.0 / 512.0)`.

## Tests
Single files, `--maxWorkers=2`, slot lock 1, CPU 68% at start: `tests/glslPrecision.test.ts` 3 / 3,
`tests/bounceGrid.test.ts` 11 / 11 (LR16-1 `LAMP_GLSL` contains `NS_GRID2_GLSL` still holds), `tests/lampFalloff.test.ts`
12 / 12 (`LAMP_GLSL` / `MIX_GLSL` contain `LAMP_MATH_GLSL`), `tests/surfaces3.test.ts` 4 / 4, `tests/goggleFrame.test.ts`
6 / 6. Total 36 / 36.

`npx tsc --noEmit` clean; `npx eslint` on the changed files clean. No e2e, no GPU (owed below).

## Light parity / desktop
- No value the meter or guards read changes: the meter and guards read the bake and the field (CPU); B1 / B2 are
  precision qualifiers only, B3 is the surface detail atlas only (`nsS` untouched).
- Desktop Medium+: samplers and ints were already fp32 / 32-bit on desktop GPUs (ANGLE D3D11), and B3 computes the
  identical `e` for 512 / 1024 px tiles. Desktop Low changes only in B3 (half the bump of before = Medium's).

## Perf at Low
fp32 instead of fp16 for the texture reads of TAAU / fog / cinematic / panini on Apple GPUs (negligible); B2 none at
runtime; B3 changes the one-time atlas draw only.

## Assumptions
1. `src/vfx/rtReflections.ts` (B1 lists `:24-25, 221-222`) is owned by another builder this round: not edited. Its
   owner, or a follow-up, should make those samplers highp too (Reflections are off at Low, so the phone does not run it).
2. nightBloom's BRIGHT and MEASURE `src` were made highp (they read the HDR scene, which the brief's grep rule covers);
   REDUCE / EASE / BLUR read derived 0-1 buffers and were left as they are ("no other change").
3. `cinematicPost` keeps `precision mediump float` (the brief asks for sampler qualifiers only).
4. The comment lines added above the samplers (`taau.ts:30`, `postStack.ts:46`, `cinematicPost.ts:11`) are GLSL
   comments, no code change.

## GPU check owed (laptop queue, `E2E_GPU=1`, port 4189, heavy.lock)
1. `e2e-desktop:3`: every material and post pass compiles at every preset after B1 / B2 (a global `precision highp int;`
   inside CUSTOM_FRAGMENT_DEFINITIONS and in the volume mix), texture-unit count unchanged.
2. `e2e-darkness`: display targets must not move (no light value change on desktop).
3. Sheet `scripts/sector-lights-shots.mjs` `GFX=low SUFFIX=-low` before / after this branch: walls under grazing lamp
   light show less speckle at Low (B3); Medium sheet identical.
4. Michael on the iPad (Chrome, Low): with Part A merged, Marlow A3 corridor walls smooth, no blotches; TAAU edges
   steady in motion (B1).
