# LR16-POLISH2 parts A + B - checker report

Checker: fresh Sonnet. Both branches merged onto `6e53e036` in a temporary worktree (clean merge, disjoint files): pol2-a `b38a7452`, pol2-b `01dec4a6`. Source not edited.

## Verdicts
- **Part A: PASS**
- **Part B: PASS**

## Part A
- Map: `ov(p0)` now runs after the top box only; `nl(p0)` after both. `LevelBuilder.mark(from)` marks every piece since `from`, so the top is overhead + noLedge, the side panel (x 0, z -8.65..-6.0 span, 0.06 thick) is noLedge only. Probe on the merged tree confirms: panel `overhead` unset, `noLedge` true; top `overhead` true, `noLedge` true. Collision and ledges unchanged (ledge generation does not read `overhead`).
- Nav re-derived: `navBuild.ts:67` skips only `overhead` pieces, so the side panel is now a blocker (hx 0.03, z -8.65..-6.0, y 0..2.4). The cage fence on the same line (`fences`: hx 0.05, z -8.65..-4.0, height 2.4) already blocks the identical footprint, so no cell changes. Own probe (`runtimeNav`, `warehouseOps`, branch vs the same level with the panel forced overhead = base): walk `b1384565c1e0`, height `79aa825c2d16`, surf `4582c4dd3c9e`, 8666 walkable, identical; matches the builder's hashes. Down-cast buckets never filtered `overhead`, so heights are unchanged too. Side effects of the flag elsewhere are art-only (`campusArt/finishes.ts`, campus maps), none for warehouse.
- Test: the four stale S1 plantDeck keys deleted; `hit` set + stale-key assertion in place. The assertion would fail on a future stale key (the set is filled only in the matched branch of `cell()`).
- Held items untouched (lr16w-batch 2: new cover / sight wall is a GPU-sheet question, as the brief says).

## Part B
- Anchors: all seven added (`int mx/my/mz`, `int g`, `vec4 wa/wb`, `float sv`) and they match `bakedLamps.ts`. My mutation: `wb.w * vb.w` -> `wb.w * vb.z` in the GLSL makes `bounceGrid` fail on the `float sv` anchor.
- `reachMask` extracted with the same statements; `nsGrid2` calls it; the existing parity test passes unchanged.
- `bounceReachMask`: the BFS is independent (own edge table `EDGES` built from corner arithmetic, a plain stack search; no import of the shader helper's logic). Edge/bit mapping matches the shader's `mx/my/mz` layout (x edge = corners with x 0, y edge = corners with y 0, z edge in `ea` only). 4096 x 8 x 2 = 65536 cases asserted; the junk bits are on the positions no axis reads. 143 ms. My mutation: `(c >> 1) & mx` -> `& my` in `reachMask` fails it ("closed 6 h 1 ... got 254").
- `lampDataUpload`: pendant step (SwaySet on the registry, `swayImpulse`, `tickSway`, `writeSway`, `frame`) asserts changed texels, all >= `y0 * w * 4`, one sub upload, no whole upload. Slot step: `charShadows` stub cast, `buf[lo + 28]` 0 -> 1, in the dynamic rows, one sub upload. Mutation `slot + 1` -> `slot` fails it.
- Deviation (`writeSway()` before `frame()`): correct. `World.frame` (`world.ts:544-550`) calls `lamps.writeSway()` first, then character shadows, then `lamps.frame()`; `frame()` only folds `swayDirty` into the upload and never writes t0. Without the call the test would see no t0 change. Setting `c.fixture` after the bake keeps the bake unchanged.

## Results (merged tree)
- `npx tsc --noEmit` clean. eslint on the six touched files clean.
- vitest `--maxWorkers=2`: warehouseLamps, sectors, warehouseCoopS3, warehouseS3Light, lampAudit: 86 passed, 1 skipped. bounceGrid, bounceReachMask, lampDataUpload, lampSway: 29 passed. lampFalloff: 12 passed.

## Polish (none blocks)
1. The pendant step only checks t0 x against `c.x + c.swx`. Mutation: commenting out `buf[o + 2] = z` in `writeSway` leaves `lampDataUpload` green. Add `toBeCloseTo` for y (`c.y + c.swy`) and z (`c.z + c.swz`) in the sway step.
2. The slot step's guard `expect(buf[aLo + 28]).toBe(0)` is what fails first under the mutation above (it reads -1 at the start); fine, but the slot assertion proper is only reached when the baseline holds. No change needed.
3. Lamp a is assumed to be order index 0 (`aLo`); true today (index 2 = lamp c is already proven by the t0 assertion). A one-line comment would pin it.
