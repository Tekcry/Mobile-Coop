# A1 Node 22 fix: sourcesInto over the 72 B budget on CI (char-shadow-meter, J16)
Owner: Sector Ops Build. Builder: Night Shift | Cloud Builder 2 (Opus, cloud), 2026-10-25. Base: 97ca3ad28
(`feature/char-shadow-meter-a1`, PR #459). Brief: `cloud-queue:briefs/char-shadow-meter-a1-node22.md`.

## Result
`tests/lightField.test.ts` "allocation-free with a contract" passes on Node 22.22.0 (CI's major) and Node 24.22.1:
sourcesInto 90.4 -> 0.0-16.4 B a query on Node 22, 67.2 -> 0.0 on Node 24. Fixed in code; BOXED_BUDGET and the test
are unchanged. Behaviour is identical (same doubles, read from slots instead of arguments; `sourcesInto lists the
set...` passes unchanged).

## Cause
Not an object: V8 boxing doubles (16 B HeapNumbers) at calls Turbofan does not inline, and Node 22 inlines fewer of
them here.
- Reproduced on Node 22.22.0: sourcesInto 90.4 (CI read 90.4 / 90.8); Node 24.22.1: 58.8-67.2.
- `--trace-turbo-inlining` in the vitest worker (Node 22): the measured loop inlines `sourcesInto` and `columnInto`,
  then runs out of cumulative inlining budget: `moonInto` (268 B of bytecode), `dynTermInto` (199), `inLampSet`,
  `pushRes` stay calls, and `lampInto` is never inlinable ("Cannot consider ... reason: 5"). With `sourcesInto`
  inlined, x and z are raw float64 (read from the test's Float64Array), so each out-of-line `moonInto(x, y, z)`,
  `lampInto(i, x, y, z)`, `dynTermInto(i, x, y, z, ...)` call boxed them; inside `lampInto`, `visInto` passed seven
  Float64Array reads (vis offset, box, counts) and `doorBlocksOne` six doubles to calls that can also stay out of line.
- Bisect by stubbing (scratch copy, Node 22): no moon 42.8, no column 48.8, no dynamic lights 74.0. The costs move
  with the budget (removing one callee lets another inline), the signature of boundary boxing, not of one allocation.
- 97ca3ad28's `pushLv` slot changed nothing on CI because `pushRes` never took a double; the boxes were the point and
  grid arguments.
- A standalone harness (esbuild bundle, same scene and loop) read 74.8 on Node 22 and 82.4 on Node 24: over budget on
  both Nodes in a different context, so the old shape was budget-sensitive everywhere.

## Fix (`src/world/lightField.ts`)
No double crosses a call in the `sourcesInto` subtree, inlined or not:
- `pt` (Float64Array 3): the query point, written once by the call that takes it (`sourcesInto`, `sourceAt`,
  `levelInto`, `lampAt`, `visAt`, `moonAt`); `moonInto()`, `columnInto()`, `lampInto(i)`, `visInto(i)`,
  `triInto(v, g, k)`, `dynTermInto(i, occluded)` read it.
- `triInto(v, g, k)` reads its grid (vis offset, origin, counts, cell) from a Float64Array: the lamp rows (`LS` 16 ->
  17, the cell at 16, the grid from `LG` = 9) and `moonG` / `ambG`, built once from the bake.
- `seg` (Float64Array 6): the segment `doorBlocksOne(i)` tests; `lampInto` and `dynTermInto` write it,
  `segBlocked()` walks the doors; public `doorBlocks(ax..bz)` keeps its signature and writes `seg`.
- Side effect: totalAt 58.4 -> 16.4, bodyLevel 113.2 -> 32.8, levelAt 64.4 -> 16.0, sourceAt 23.2 -> 0.0 on both Nodes.

## Readings ("bytes per" lines, `tests/lightField.test.ts tests/charOccluders.test.ts --maxWorkers=2`)
Before (97ca3ad28), Node 22.22.0 (1 failed, 35 passed):
- transmitQ 0.0, transmitInto 0.0, capsuleTransmit 0.0, control 224.0
- levelAt 64.4, bodyLevel 126.8 (limit 184.8), control 288.4
- totalAt 58.8 (none 57.6), bodyLevel 114.0 (none 112.8), sourcesInto 90.4, sourceAt 23.2; control 282.8

Before, Node 24.22.1 (36 passed):
- transmitQ 0.0, transmitInto 0.0, capsuleTransmit 0.0, control 240.0
- levelAt 56.8, bodyLevel 112.0 (limit 169.6), control 296.8
- totalAt 66.8 (none 64.8), bodyLevel 128.4 (none 126.8), sourcesInto 67.2, sourceAt 25.6; control 306.8

After, Node 22.22.0 (36 passed):
- transmitQ 0.0, transmitInto 0.0, capsuleTransmit 0.0, control 224.0
- levelAt 16.0, bodyLevel 61.6 (limit 88.0), control 240.0
- totalAt 16.4 (none 16.4), bodyLevel 32.8 (none 32.8), sourcesInto 0.0, sourceAt 0.0; control 240.4
- (another run: sourcesInto 16.4, bodyLevel 33.2; the alloc test alone: sourcesInto 16.4)

After, Node 24.22.1 (36 passed):
- transmitQ 0.0, transmitInto 0.0, capsuleTransmit 0.0, control 240.0
- levelAt 16.0, bodyLevel 32.8 (limit 88.0), control 256.0
- totalAt 16.4 (none 16.4), bodyLevel 32.8 (none 32.8), sourcesInto 0.0, sourceAt 0.0; control 256.4

## Residual (outside this brief's files)
- Node 22's 16.4 is `lights.lightTerm` (in `dynTermInto`) left out of line when the loop inlines `dynTermInto`: its
  returned double is boxed. Stubbing that call reads 0.0.
- With inlining off (`--execArgv=--no-turbo-inlining`, both Nodes): sourcesInto 140.0 -> 105.2. Stubbing `lightTerm`
  reads 32.0, so 73 B is the `lightTerm` chain (`lights.ts` / `lampMath.ts` return doubles across their own calls).
  A slot-based `lightTerm` would remove it; the same call sits in `dynamicInto` (totalAt). Not needed for the budget.

## Checks
- `npx tsc --noEmit -p .`: clean. `npx eslint src/world/lightField.ts`: clean.
- `tests/lightField.test.ts tests/charOccluders.test.ts --maxWorkers=2`: 36 / 36 on Node 22 and Node 24.
- Extra (Node 22): shadowAccuracy, torchOcclusion, torchShadowSet, lampFalloff, lampSway, lampFlicker, perception,
  coopTorches, sectionBake, bounceGrid, glass: 159 / 159.
- No e2e or GPU check applies (pure gameplay code, no rendering change).
