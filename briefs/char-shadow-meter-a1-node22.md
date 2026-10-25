status: done feature/char-shadow-meter-a1 df64c0fa458cf04203bc11c3bcf7bda693f0aa5f
# char-shadow-meter A1 fix (cloud, Node 22): sourcesInto reads 90 B a query on CI against the 72 B budget

Lead: Night Shift | Sector Ops Build. PR #459 (J16 A1, dark). Opus. Small, urgent: it blocks #459's CI `test`.

- Branch: work directly on `feature/char-shadow-meter-a1` from its head 97ca3ad28 (the PR branch; push to it, never to
  master or the job branch). Guard: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/char-shadow-meter-a1`.
- The failure: `tests/lightField.test.ts` "allocation-free with a contract" (`expect(src).toBeLessThanOrEqual(BOXED_BUDGET)`,
  ~:780, BOXED_BUDGET 72). CI (GitHub, **Node 22**, setup-node `node-version: 22`) reads `sourcesInto 90.8` (caf75f9dd)
  and `90.4` (97ca3ad28); the desktop (Node 24.22) reads 58.8-67.2. Every other reading matches between the two
  (totalAt 58.4 / 57.2, bodyLevel 113, sourceAt 23.2). 97ca3ad28 moved the pushed level from the `res` number field to
  a `Float64Array(1)` slot `pushLv`: no change on CI, so that was not the cause.
- Do:
  1. Run under Node 22 exactly as CI: `npx -y node@22 node_modules/vitest/vitest.mjs run tests/lightField.test.ts -t
     "allocation-free" --silent=false` (or nvm / a Node 22 binary on the box). Confirm ~90 B.
  2. Find what allocates in `LightField.sourcesInto` (src/world/lightField.ts ~:257-290) and its callees
     (`moonInto`, `columnInto`, `inLampSet`, `pushRes`, `dynTermInto`) on Node 22: e.g. `--trace-deopt`,
     `--trace-turbo-inlining`, or bisect by stubbing a callee in a scratch copy. Write what you found.
  3. Fix it in the code (no allocation even un-inlined: typed-array slots, Smi returns, no closures; house style:
     `hyp2` / `hyp3`, see the `res` / `pushLv` comments). Keep behaviour identical (the `sourcesInto lists the set...`
     test, :660-710, must pass unchanged). Both Node 22 and Node 24 must read <= 72.
  4. Only if the 90 B is proven to be V8 boxing doubles on Node 22 (not an object: heap snapshot or the trace shows
     HeapNumbers) and no code shape avoids it: judge `src` against this run's own readings as the bodyLevel limit does
     (`2 x level + slack` style, with a comment giving both Node readings), and say so plainly in the report. Never
     just raise BOXED_BUDGET.
- Tests: `npx tsc --noEmit -p .`; `npx vitest run tests/lightField.test.ts tests/charOccluders.test.ts --maxWorkers=2`
  under Node 22 and the default Node. Report every "bytes per query" line from both.
- Commit path-limited (src/world/lightField.ts, tests/lightField.test.ts only), push. Report
  `docs/char-shadow-meter/checks/a1-node22-fix.md` (cause, fix, both Node readings); then
  `status: done feature/char-shadow-meter-a1 <sha>` here.

## Report
Cloud Builder 2, 2026-10-25. Head df64c0fa4 on `feature/char-shadow-meter-a1` (from 97ca3ad28, unmoved). Full write-up:
`docs/char-shadow-meter/checks/a1-node22-fix.md`.
- Cause: V8 boxing doubles (16 B HeapNumbers), not an object. `--trace-turbo-inlining` (Node 22.22.0, vitest worker):
  the measured loop inlines `sourcesInto` + `columnInto`, then the cumulative budget runs out; `moonInto`,
  `dynTermInto`, `inLampSet`, `pushRes` stay calls and `lampInto` is never inlinable. x and z (raw float64 once
  `sourcesInto` is inlined) were boxed at each out-of-line call, plus `lampInto`'s grid arguments to `triInto` and its
  segment to `doorBlocksOne`. Stub bisect: no moon 42.8, no column 48.8, no dynamic 74.0 (budget-coupled). A
  standalone harness read 74.8 (Node 22) and 82.4 (Node 24): the old shape was budget-sensitive on both.
- Fix (`src/world/lightField.ts` only; test and BOXED_BUDGET unchanged): the query point (`pt`), the door segment
  (`seg`) and the trilinear grids (lamp rows `LS` 17 with the cell, `moonG` / `ambG`) live in typed-array slots; the
  private steps take no double. Behaviour identical.
- Readings, sourcesInto: Node 22 90.4 -> 0.0-16.4; Node 24 (24.22.1 via npx) 67.2 -> 0.0. Also totalAt 58.8 -> 16.4,
  bodyLevel 114.0 -> 32.8, levelAt 64.4 -> 16.0, sourceAt 23.2 -> 0.0 (both Nodes). Node 22's 16.4 residual is
  `lights.lightTerm`'s returned double when left out of line (stub reads 0.0); lights.ts is outside this brief.
- Tests: tsc clean; eslint clean; `lightField` + `charOccluders` 36/36 on Node 22 and Node 24 (before: 1 failed on
  Node 22); extra LightField consumers (11 files) 159/159 on Node 22.
