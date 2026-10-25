status: open
# J12 validator-port, slice S5 (Sonnet): graph-sets manifest + level-graphs runner

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged). New branch: `feature/validator-port-s5`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S5** (search `**S5 (Sonnet).**`,
  ~line 274) - build it word for word.
- Only files to edit (new unless noted): `graph-sets.json` (where the PLAN puts it; if it names no folder, put it in
  `docs/design/` next to `metrics.json` and say so), `scripts/level-graphs.mjs`, `tests/levelGraphs.test.ts`,
  `package.json` (only the two `scripts` lines `"level-measure": "node scripts/level-measure.mjs"` and
  `"validate:levels": "node scripts/level-graphs.mjs"`; never the version), the `run` files the manifest points at
  (written by `--write`), and a changelog fragment `changes/feature-validator-port-s5.md` (kind: patch).
  `scripts/level-measure.mjs` comes from another slice; do not create it.
- Sets: the example graph and campus S1-S5 (files in order, merged with `mergeGraphs` from the lib). No Marlow Yard set
  (a later slice adds it).
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/levelGraphs.test.ts`,
  `node scripts/level-graphs.mjs` (exit 0), `node scripts/level-graphs.mjs --write` then `git diff --stat` clean on a
  second run.
- Done: the S5 "Done" line in the PLAN holds (green against the counts at this base).
- Report: append what changed, tests with counts, deviations; set `status: done feature/validator-port-s5 <sha>`.
