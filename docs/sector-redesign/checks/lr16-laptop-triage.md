Status: triaged and fixed (Opus triage agent, 2026-10-24). Laptop GPU run (E2E_GPU=1, ANGLE D3D11) on
feature/sector-redesign-lr16int @ e7cec732: FAIL e2e-desktop:3, e2e-darkness, e2e-lightbake (all three also on solo
reruns). Fix branch `feature/sector-redesign-lr16fix` off e7cec732.

# LR16 laptop triage: one D3D11 shader compile failure

## Cause (all three suites)

`nsGrid2` (LR16-1 bounce read, `src/world/bakedLamps.ts:845` `NS_GRID2_GLSL`, in `LAMP_GLSL` and called from the
plugin's `level()` code under `LAMP_FILL`) does not compile to a D3D11 pixel shader. Its reach flood

    for (int k = 0; k < 8; k++) {
      if ((k & 1) == 0 && (e[k] & 1) == 0 && c[k] != c[k + 1]) { ... }   // also k + 2, k + 4

relies on `&&` short-circuiting to keep `c[k + 1]`, `c[k + 2]`, `c[k + 4]` inside `bool c[8]`. ANGLE's HLSL keeps the
`&&` (HLSL evaluates both sides), so when fxc unrolls the loop it indexes `c[8..11]`:

    (226,81-100): error X3504: literal loop terminated early due to out of bounds array access
    (212,26-35): error X3696: infinite loop detected - loop never exits

(HLSL lines of the translated shader; the console shows only ANGLE's
`GL_INVALID_OPERATION ... Context11::triggerDrawCallProgramRecompilation:1039 ... Error compiling dynamic pixel executable`.)
Every PBR material with the lamp plugin and `LAMP_FILL` (the level, props, characters, the darkness card) fails its
draw, and ANGLE retries the fxc compile on every draw call.

Evidence (one diagnostic probe on this desktop's GPU, approved by the lead, heavy.lock held, port 4189, headless):
- Full game, e7cec732 build, `?autostart=warehouse&mode=clear&gfx=epic`: Chrome's log shows the two errors above for
  every lamp-plugin program (same columns 26-35 / 81-100, HLSL line numbers per material), 830 failed compiles in 9 min
  (each with default, skip-optimization and skip-validation flags); the page's frames stalled and the probe ran out its
  9 min timeout - the same stall as desktop:3's hang.
- Minimal shader, no game: the e7cec732 `NS_GRID2_GLSL` alone in a WebGL2 fragment shader reproduces exactly
  `X3504` at (226,81-100) and `X3696` at (212,26-35), draw error 0x502, nothing drawn. LR16-P F3's `NS_GRID2_GLSL`
  (79d2e9b9, no local arrays) in the same shader: draw error 0, pixel written.

Not the cause: LR16-L B1 / B2 (sampler and int precision are dropped by the HLSL translation), polish B / E, LR16-L A,
LR16-W, LR16g. Not a stale expectation: lightbake and darkness have no LAMP_VERSION / box / hash numbers to re-baseline
(lightbake compares presets with each other; darkness targets are the bible's L5 targets). History: LR16-1 (24b21b16)
and LR16t were never run on a GPU before this run (lr16-1-build, lr16int-merge-1: "nsGrid2 compile on ANGLE pending").

## Per suite

| Suite | Assert (file:line) | Cause | Class | Confidence |
| --- | --- | --- | --- | --- |
| e2e-lightbake | `gfx=epic: no console errors` (`scripts/e2e-lightbake.mjs:120-121`): 3 x `Error compiling dynamic pixel executable` | nsGrid2 fxc failure (X3504 / X3696) | (b) regression, LR16-1 | high |
| e2e-darkness | `epic: level 0.12 shows 9.6% (target 0-4%)` (`scripts/e2e-darkness.mjs:185`); every probe ~9.6% (rgb 9,27,47) | the card and the level fail their draws: the screen shows the background at every level | (b) same cause | high |
| e2e-desktop:3 | no assert: killed at 900 s after "every material shader within 16 textures"; hangs in `frames(e.page, 240)` after the guards' alert (`scripts/e2e-desktop.mjs:568`) | every draw of a failing program re-runs fxc (seconds a frame): 240 frames outlast the suite limit | (b) same cause | medium-high (same stall reproduced in the probe; not run on the voxel path here) |

Open: e2e-lightbake's `gfx=epic&voxels=1` config logged no error on the laptop although its props carry the same
`LAMP_FILL` code; not explained (not probed: the voxel path was not run here). The rerun shows whether desktop:3 is clean.

## Fix (feature/sector-redesign-lr16fix)

- Cherry-pick of LR16-P F3 79d2e9b9 (`-x`): `nsGrid2` without local arrays (corners in vec4 / ivec4, the reach set an
  8-bit mask grown along the cube's 12 edges), the JS mirror `tests/helpers/bounceRead.ts`, the parity test and the
  guard against local arrays (`tests/bounceGrid.test.ts`). Applied cleanly on e7cec732. Same values (F3's report: 49152
  points bit-identical on ANGLE / SwiftShader); the bounceGrid parity test (mirror vs `BounceGrid.sampleInto`) is green
  on this base.
- No script changed: nothing to re-baseline, no assert loosened.

Checks: `npx tsc --noEmit` clean; eslint on the changed files 0 errors; vitest (slot lock, `--maxWorkers=2`):
bounceGrid, glslPrecision, lampPluginGap, lampLevel, lampFalloff, lampTorchCone, levelLitMaterial, torchShadowSet,
lampPluginClone - 9 files, 46 tests pass. No e2e, no build of the fix branch, no further GPU probe (orchestrator rule:
no desktop GPU probes while a train runs).

Note for the lead: the probe took heavy.lock at 18:21:52Z right after the `laptop-queue | train 41` lock was released;
the orchestrator says it likely cost train 41 its lightbake verdict.

## Rerun (laptop, E2E_GPU=1, the fix sha)

`node scripts/run-e2e.mjs e2e-lightbake e2e-darkness e2e-desktop:3` (then coop / netmove as before if wanted).
Expect: lightbake with no console errors at gfx=epic; darkness probes spread by level (0.12 <= 4%, 0.70 >= 45%); desktop:3
past the alert block. If darkness still misses a target with the shaders drawing, that is a light value question
(LR16-L A / LR16-W moves), not this cause - report the four measured rows.
