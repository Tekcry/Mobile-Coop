# Validator graph sets
kind: patch

- `npm run validate:levels` (`scripts/level-graphs.mjs`) runs the level validator over every committed graph set in
  `docs/level-validator/graph-sets.json` (the example and campus S1-S5) and exits 1 when a set's error or warning count
  differs from the manifest; `--write` rewrites each saved run and the counts. `tests/levelGraphs.test.ts` pins the
  same counts and checks each saved run says them. The campus saved run is refreshed to today's 127 errors and 174
  warnings. Adds the `level-measure` script line (the tool lands in another slice).
