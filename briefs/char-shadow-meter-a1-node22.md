status: open
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
