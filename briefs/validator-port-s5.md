status: done feature/validator-port-s5 3a590aa615e122db2fb655997bbad8926e485f29
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

## Report (Night Shift | Cloud Builder 2, 2026-10-25)
Two commits on dae93b996, head 3a590aa6.
- `docs/level-validator/graph-sets.json` (new; the folder the PLAN names, lines 23 / 111 / 120-121, not docs/design/): sets
  `example` (example.graph.json, `run: null` per BRIEF A15, counts only) and `campus` (campusOps-S1..S5 in order); each has
  name, files, flags [], errors, warns, run. Pinned: example 0 / 0, campus 127 errors / 174 warnings.
- `scripts/level-graphs.mjs` (new): uses `validate`, `mergeGraphs`, `DEFAULT_METRICS` from level-validate.mjs; one line per
  set; exit 1 on a count differing from the manifest, 2 on bad usage / unreadable file; `--write` rewrites each run file and
  the manifest counts; flag support `--require-measured` only. `--write` serialises the manifest as 2-space JSON.
- `docs/level-validator/campus-run/run.txt` rewritten by `--write`: was stale at 149 / 173, now 127 / 174, byte-identical to
  `node scripts/level-validate.mjs campusOps-S{1..5}.json`. REPORT.md in that folder still cites 149 / 173 (left: S10).
- `tests/levelGraphs.test.ts` (new, 10): manifest sets and files exist; per set counts equal the manifest and the saved
  run's last line; campus runner text equals the CLI output and the saved file; 3 runner tests on a temp root (match 0,
  mismatch 1 then `--write` fixes it, bad argument / flag / graph 2).
- `package.json`: only the `level-measure` and `validate:levels` script lines; version untouched; no level-measure.mjs.
- `changes/feature-validator-port-s5.md` (kind: patch) as this brief says (the PLAN table names
  `docs/validator-port/fragments/S5.md`).
- Checks: levelGraphs 10/10; changesFragments 1/1; `node scripts/level-graphs.mjs` exit 0; `--write` then a second run,
  `git diff --stat` clean; typecheck:fast clean. PLAN S5 "Done" line holds.
