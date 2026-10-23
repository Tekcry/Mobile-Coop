Status: built (Opus 5.5 builder, 2026-10-24). Brief: `briefs/LR16-P.md` (origin/feature/sector-redesign-polish).
Branch `feature/sector-redesign-lr16p`, base lr16pol-cf 2798e57d. Commits: F1 4ec09ab2, F2 f48780fb, F3 79d2e9b9.

# LR16-P build: F1, F2, F3 (lamp perf)

## Built

| Item | Files | What |
| --- | --- | --- |
| F1 | `src/world/bakedLamps.ts` | Pure `lampDataLayout` (the constructor's layout, unchanged) and `lampDataRows(lampBase, w, h)` = `{ y0: floor(lampBase / w), rows: h - y0 }`. `frame()` sends `engine.updateTextureData(internal, buf.subarray(y0 * w * 4), 0, y0, w, h - y0)` (view made once in the constructor); a whole `data.update(buf)` stays in the constructor, `update()` (registry change), the volume path and a new `onContextRestoredObservable` observer (removed in `dispose`). Falls back to a whole upload if the engine has no `updateTextureData`. Counters `fullUploads` / `rowUploads`. campusOps: 432 x 83, 560 KB a frame -> 4 rows, 27 KB. |
| F2 | `src/world/charShadowSet.ts`, `charShadows.ts`, `bakedLamps.ts` | `charShadowReach(intensity, reach, minLevel = CHAR_SHADOW.minLevel 0.04)`: bisection on `LAMP_LEVEL_GAIN x intensity x photoFalloff(d, reach)`, 0 when the peak is under the cut. `BakedLamps.spheres` w = it (load time, registry intensity); the picker limit, `gather`, `addDynamic` follow it; the picker now skips a lamp whose shadow reach is 0. campusOps: plan area per slot x 0.66 (mean over 133 lamps with a reach; brief estimated 0.55). |
| F3 | `src/world/bakedLamps.ts` `NS_GRID2_GLSL`, `tests/helpers/bounceRead.ts` | No local arrays: corners in `va` / `vb` (vec4) and `ea` / `eb` (ivec4), `eh` and the `v[h]` fallback by selects, the reach set an 8-bit mask grown along the 12 cube edges (Jacobi passes, <= 7, early out), the blend over all 8 corners with unreached weights x 0 in corner order. Same reach set as the old per-corner loop (connected component of h), same sums (+0 and x0 exact). |

## Deviation from the brief (F2 far plane)

The brief has the slot's far plane follow the shadow reach. Not done: a receiver the lamp lights past the far plane
gets a metric z > 1, reads the cleared map (1.0) as a blocker in `nsCharShadow` and drops to the 0.15 floor - the
lamp's whole tail inside the cone would go dark. The far plane stays at the light's reach + 0.5 through a new optional
`CharShadowLamps.lightReach` (`BakedLamps.lightReach` = t0.w). The frustum width (the cone fit, the GPU saving) and the
caster lists (the CPU saving) still follow the shadow reach; the far plane costs nothing in draws.

## Parity

- F1: same texels, same GLSL; the test proves every per-frame write (capsules, door shut flag, flicker colour) lands at
  or after `y0 * w * 4`, and the dynamic view is `buf` itself (same buffer, offset `y0 * w * 16`). A restored context
  re-sends the whole buffer (Babylon's own `_bufferView` rebuild also holds the live `buf`).
- F2: picture only. The field never reads `spheres` (grep: only `charShadows.ts` and `bakedLamps.writeSway` xyz).
  `writeCapsules` keeps t0.w + 0.5; a character between the shadow reach and the light's reach is not in the map and
  `covers` is false for him, so he keeps his capsule (tested through the real `gather` + `covers`). `lightField`,
  `lampFalloff` unchanged and green.
- F3: `tests/bounceGrid.test.ts` parity (the JS mirror vs `BounceGrid.sampleInto`, 600 points x 4 rooms, 9 digits)
  green: 139 lit points, 687 beside a wall. The JS mirror (`helpers/bounceRead.ts`) was rewritten statement for
  statement to the new GLSL, and the test's GLSL text lines were updated to the new statements (the old ones named the
  arrays); the parity assertion itself is unchanged. New guard: no `float|int|bool|vecN name[` declaration. Scratch probe
  (not committed): headless Chromium (ANGLE, SwiftShader) compiled the old and new function in one shader and read both
  back over 12 random grids (wall chance 0 / 0.25 / 0.7, random crossing codes, points inside, on edges, past the grid,
  on centres and halves): 49152 points, 0 differing bits.

## Tests

tsc clean; `npm run lint` 0 errors (42 existing warnings). Vitest, single run `--maxWorkers=2` under a slot lock:
14 files, 164 tests pass: lampDataUpload (new, 3), charShadowReach (new, 7), bounceGrid (11), lampBake, lampBounce,
lightField, lampFalloff, charShadowSet, charShadows, glslPrecision, torchShadowSet, lampFlicker, lampSway, lampPluginGap.
No e2e, build or perf run (per the job's rules).

## Laptop perf request (Test Runner; GPU 4189 alone; campusOps view harness as in the brief)

Per cell: 3 samples; CPU p95 / median, GPU p95, page URL, render size, all-pass draws (`engine._drawCalls`), slot casters
(`world.charShadows.stats()` casters, `world.torchShadows.stats()`). Views: campusOps start and S5-worst
(-50.25, 3.0, 62.25) facing 158 with 24 guards; Epic (`--desktop`) and Medium (`--preset=medium`).

| Run | sha | URL | Splits out |
| --- | --- | --- | --- |
| A1 | 1c22b9136cfc768490e228b617217c17f57cb934 | default (Classic) | LR15 / lrpolish / lampx under Classic |
| A2 | 1c22b913... | `&falloff=photo` (`EXTRA=falloff=photo`) | A1 -> A2 = the photometric model + accuracy fixes (G1, C1) |
| C' | 2798e57df4afebf468a1814ea7ad96f77efd7118 (lr16pol-cf, this build's base) | default | the before for D |
| D | 79d2e9b9 (this branch: F1 + F2 + F3) | default | C' -> D = the three fixes |

Command shape (cmd, slot worktree after its build, f8008542's `perf.mjs` for A1 / A2 as the triage did):
`set MAP=campusOps&& set MODE=sector&& node scripts/perf.mjs http://127.0.0.1:4189/ --desktop --json` (Epic start), the
same with `--preset=medium`, and the S5-worst view per the harness. Expected C' -> D: CPU p95 Epic S5 -0.3-0.8 ms
(F1 -0.1-0.3 every tier, F2 -0.2-0.5), Medium -0.2-0.4; GPU -0.1-0.4 (F3 -0.1-0.25 every tier, F2 narrower frustums).
Also look at the GPU sheet for F2: a guard in a lamp's faint tail (level < 0.04) now shows a capsule shadow, not his
silhouette.

## Risks

- F2 look: in a lamp's tail the guard's shadow is a capsule; and with more characters on capsules, a lamp still lists
  at most 4 capsules (`CAPS_PER_LAMP`, first 4 in capsule order), so in a crowded tail some faint shadows may drop.
  Both at level < 0.04. Lower `minLevel` (0.02: area x ~0.8) if the sheet shows it.
- F3: proven equal on ANGLE / SwiftShader; NVIDIA / D3D11 compile of `ivec4 & int`, `equal(ivec4, ivec4)` and
  `bvec4 -> vec4` is standard GLSL ES 3.00, but only the GPU sheet confirms the saving (the brief's N1 local-memory spill).
- F1: relies on `ThinEngine.updateTextureData` (no side-effect import; Babylon 9.29). WebGPU has it too; the fallback
  is the old whole upload.
- No changelog fragment written (the job lead's fragment covers the branch).
