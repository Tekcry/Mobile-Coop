Status: checked (fresh Opus 5.5 checker, 2026-10-24). Brief `briefs/LR16-P.md`; build report `checks/lr16p-build.md`
on the branch.

# LR16-P check: F1-F3 (lamp perf, render / GLSL)

Branch `feature/sector-redesign-lr16p` @ 3306bdf5 on base 2798e57d (lr16pol-cf). Read only, detached worktree.

## Verdict: PASS

No must-fix. All three items do what the brief asks; the one deviation (F2 far plane) is correct.

## F1 - dynamic rows only (`src/world/bakedLamps.ts`)

- Every per-frame write sits at or after `lampBase`: `writeCapsules` (capsules at `capBase`, ids t5 `lo + 20..23`, slot
  t7 `lo + 28`), `writeDoors` (shut flag at `doorBase`), `writeFlicker` (t1), `writeSway` (t0 xyz), `update()` (t1, but
  it does a whole upload anyway). The static part is the grid and the load-time lamp texels; `door2Base` texels are
  written only in the constructor. `buf` is private; no other module writes it. No stale row.
- `uploadRows` (`:473`) sends `updateTextureData(t, dynView, 0, dynY0, width, dynRows)`. Babylon 9.29
  `ThinEngine.updateTextureData(texture, imageData, xOffset, yOffset, width, height, faceIndex = 0, lod = 0, mips = false)`
  -> `_unpackFlipY(texture.invertY)` (false: the RawTexture was made with invertY false), `texSubImage2D(TEXTURE_2D, 0,
  x, y, w, h, RGBA, FLOAT, view)`. `dynView = buf.subarray(y0 * w * 4)` is exactly `rows * w * 4` floats, row pitch
  `w * 16` bytes = the texture width, so no UNPACK_ROW_LENGTH / alignment issue. Format / type match the RGBA32F
  texture. No side-effect import needed.
- Whole upload kept: constructor (via `update()`), `update()` on a registry change, the volume path (`frame` `:436`,
  `writeDoors` `:534`), the new `onContextRestoredObservable` observer (removed in `dispose`), and the fallback when the
  engine has no `updateTextureData` or no internal texture.
- No per-frame allocation: `dynView` made once; `uploadRows` only reads fields and calls the engine.

## F2 - picture-only shadow reach (`charShadowSet.ts`, `charShadows.ts`, `bakedLamps.ts`)

- Picture only: `spheres` is read only by `charShadows.ts` (picker, `gather`, `addDynamic`, `copy`, `covers`) and by
  `bakedLamps.writeSway` (xyz). The light field, meter and guards never read `spheres` or `lightReach`. Registry
  `intensity` is never written at runtime, so the load-time reach stays right. `photoFalloff` is monotonic, so the
  bisection is valid; the on-axis level is the upper bound for any direction.
- No light through a wall: static geometry is in the baked visibility, shut doors are the shut flag, both unchanged.
  The slot map only adds shadow. A character between the shadow reach and the light reach is not gathered, `covers`
  is false (`spheresHold` over the fitted spheres), and `writeCapsules` still lists him within t0.w + 0.5: he keeps a
  capsule. An open leaf or prop past the shadow reach is not drawn, which is what every lamp without a slot does today.
  The worst visible change is a silhouette turning into a capsule at level < 0.04.
- Far plane at `lightReach + 0.5` (the deviation): correct. `nsCharShadow` has no z > 1 guard, so a receiver past a
  shorter far plane would find the cleared map (1.0) `< z`, count it as a blocker and drop to the 0.15 floor across the
  lamp's tail inside the cone. Keeping the far plane at the light reach is the same span as before F2 (no depth
  precision loss) and costs no draws; the CPU saving (casters) and the GPU saving (narrower cone fit) still follow the
  shadow reach.

## F3 - `NS_GRID2_GLSL` without local arrays

- Equivalent, statement by statement: fetch order k = x + 2y + 4z; `va + vb == vec4(0.0)` equals `lit <= 0` (G is UNORM,
  >= 0); `ea` / `eb` the same int conversion; `eh` the pre-crossing h by selects; `open` from `ea | eb`; the blend
  weights in the same multiply order (x * y) * z, unreached x 0 (exact), sums + 0 (exact); `vh` the post-crossing h.
- Flood: masks `mx` (corners 0, 2, 4, 6 bit 1), `my` (0, 1, 4, 5 bit 2), `mz` (0-3 bit 4) map the 12 edges correctly; the
  growth stays within 8 bits. Exhaustive scratch check (not committed): all 4096 edge configurations x 8 start corners,
  with and without junk axis bits on the upper corners: old Gauss-Seidel loop = new mask flood = BFS component in
  65536 / 65536 cases; worst case needs exactly 7 growing passes (the Hamiltonian-path cube), within the loop's 7.
- ES 3.00: `ivec4 & int`, `ivec4 | ivec4`, `equal` / `notEqual` on ivec4, `ivec4(bvec4)`, `vec4(bvec4)`, vector `==`,
  ternary on ivec4 / vec4, int shifts are all valid. `LAMP_GLSL` states `precision highp int` before `${NS_GRID2_GLSL}`
  (`bakedLamps.ts:994`, `:1018`), so the 16-bit wall words are safe.
- JS mirror (`tests/helpers/bounceRead.ts`): a faithful copy (trunc = floor on non-negatives, same masks, same sums).
  The parity test (mirror vs `BounceGrid.sampleInto`) is still meaningful: the mirror follows the new GLSL and the
  anchor lines tie the two; the guard against local arrays is in.

## Other

- No wire / `PROTOCOL_VERSION` / save change (diff: three `src/world` files, three tests, the build report). Babylon
  imports in `src/` go through `src/core/babylon.ts`; the tests' `NullEngine` import follows the existing test pattern.

## Runs (this checker)

- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors (42 existing warnings).
- Vitest `--maxWorkers=2`, slot lock sr-slot-1: lampDataUpload, charShadowReach, bounceGrid, lampBake, lampBounce,
  lightField, lampFalloff, charShadowSet, charShadows, glslPrecision, torchShadowSet, lampFlicker, lampSway,
  lampPluginGap: 14 files, 164 tests pass (102 s).
- No e2e, build or perf run (per the job).

## Polish (not blocking)

1. `tests/bounceGrid.test.ts:213-226`: the anchor lines skip the mask and blend statements. Add
   `int mx = xa.x | (xa.z << 2) | (xb.x << 4) | (xb.z << 6);`, the `my` / `mz` lines, the `int g = c | ...` line and the
   `vec4 wa = ...` / `float sv = ...` lines, so a GLSL-only edit there fails the parity test.
2. Commit the exhaustive flood check as a unit test (helper's mask flood vs a BFS component over 4096 edge sets x 8
   start corners; ~65 k cases, milliseconds).
3. `tests/lampDataUpload.test.ts`: the per-frame write assertion covers capsules, a door and flicker, not a pendant's
   `writeSway` t0 or the t7 slot id; add a sway step.
4. `writeCapsules` (`bakedLamps.ts:655-661`): with F2 more characters fall to capsules on a slotted lamp, and a lamp
   lists the first `CAPS_PER_LAMP` in capsule order, not the nearest; a tail character (level < 0.04) can take a
   capsule place from one inside the shadow reach the map does not hold yet (1-2 frames after he enters). Watch the
   GPU sheet; ranking by distance is the fix if it shows.
