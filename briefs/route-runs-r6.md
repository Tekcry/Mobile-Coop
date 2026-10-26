status: open
# J13 route-runs, slice R6 (Sonnet, strict brief): the points table from J12's resolver

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3). PLAN R6 waits on J12's one point resolver: it is on
master today (`resolvePoints` exported from `src/world/levelMeasure.ts:348`, and `node scripts/level-measure.mjs
<graphs> --points <out.json>`, `scripts/level-measure.mjs:21`, `:541-546`), so R6 can be built. It adds the check that
a points table belongs to the graph it plans, and one way to make the table, in its own file; the CLI call site is a
seam request for the lead (R4b owns `route-run.mjs` now).
Builder: Sonnet. Home: **cloud** (pure checks, vitest only).

- Base: `origin/master` @ `29f03b6c004bf8dae66eea9c434160b6b1db061c` (R1-R4a merged).
- New branch: `feature/route-runs-r6`. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/route-runs-r6`. `git add <files>` only, never `-A`.

## Read first
- `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions"), `git show origin/master:CLAUDE.md`.
- On `origin/feature/route-runs-2`: `docs/route-runs/PLAN.md` slice **R6** (`:233-248`), R1's points input (`:59-75`),
  the Dependencies row "V6 positions on master" (`:304`), order (`:317-320`), Tests (`:322-327`).
- On the base: `src/world/levelMeasure.ts:184-228` (`PointSpace`, `PointLink`, `PointsResult`: `{ spaces, links, geom,
  errors }`) and `:342-366` (`resolvePoints`); `scripts/level-measure.mjs:1-45` (usage, `--points`), `:470-546` (one
  map per `--points`, the Vite SSR loader, the write); `scripts/route-run/plan.mjs:1-20` and `:85-100` (how R1 reads
  `points.spaces` / `points.links` by merged index); `scripts/route-run.mjs:45`, `:63`, `:313-330` (`--points` today:
  a plain `readJson`); `scripts/level-validate.mjs` / `scripts/level-graph-lib.mjs` (`mergeGraphs`, import it as
  `route-run.mjs:22` does); `tests/fixtures/route-run/campusOps-S1.graph.json` and `campusOps-S1.points.json` (a
  matching pair, geom `y3jl5g-atld8s`).

## What to build (`scripts/route-run/points.mjs`, new)
1. `checkPoints(table, graphs)` (pure; `graphs` the parsed graph files in CLI order) -> `{ problems: string[], notes:
   string[] }`. Merge with `mergeGraphs` (the same call R1 makes). Problems (each one plain sentence naming the fix):
   - not a table (`spaces` / `links` missing or not arrays): "the points file is not a level-measure --points table".
   - `geom`: the merged graph's `meta.measured.geom` set and different from `table.geom`: "the points table was made on
     another build of the map (geom <t>, the graph says <g>): run level-measure --points again". Graph has no
     measured geom: a note "the graph is not measured: the points table's geom was not checked", not a problem.
   - link count differs: "the points table has <n> links, the merged graph <m>: same files, same order?".
   - any merged index whose `from`, `to` or `kind` differs from `table.links[i]`: one problem per index, naming both
     ("link 7: table s1-lane -> s1-gatehouse (window), graph s1-verge -> s1-gatehouse (window)"), at most the first 5
     plus "and <k> more".
   - Notes only: a graph space with `area` missing from `table.spaces`, a table space with no `centre`, a link with
     `at: null` (R1 makes runs through those `unplannable` with the reason; R6 just says it up front), each
     `table.errors` line.
2. `loadPoints({ graphs, files, src, run })` -> the table, or throws an `Error` whose message lists the problems (the
   harness refuses the run: exit 2 with that message). `src` a path: read the JSON. `src === 'auto'`: make the table
   with `node scripts/level-measure.mjs <files...> --points <tmp file>` (`execFileSync`, `windowsHide`, cwd the repo
   root, timeout 15 min, the temp file under `os.tmpdir()`), through the injectable `run(cmd, args)` (default
   `execFileSync`) so the test needs no Vite; then read it. Either way `checkPoints` runs; notes are returned on
   `table.notes` (an array the CLI can print).
3. No fallbacks. PLAN's fallbacks (J12's lower exports, then approximate points marked `approx`) apply only if J12
   shipped no resolver; it shipped `resolvePoints`, so leave them out and say so in a header comment.

## Seam request (for the lead; do not make it)
`scripts/route-run.mjs:316` on master (R4b's file now; on `feature/route-runs-r4b` the same line): replace
`let points = o.points ? readJson(o.points) : null;` with a `loadPoints({ graphs, files: o.graphs, src: o.points })`
call once `graphs` are read (a selftest fixture keeps its own table, unchecked), print `points.notes`, and add `auto` to
the `--points` usage text. Write it in the report as a diff sketch.

## Only files to edit
`scripts/route-run/points.mjs` (new), `tests/routeRunPoints.test.ts` (new; inside PLAN's `tests/routeRun*.test.ts`
claim), `changes/feature-route-runs-r6.md` (new, `kind: patch`: tooling and tests).

## Forbidden
- Everything under `src/` (read `levelMeasure.ts`, never edit it); `scripts/level-measure.mjs`,
  `scripts/level-validate.mjs`, `scripts/level-graph-lib.mjs` (J12's).
- `scripts/route-run.mjs` and every other `scripts/route-run/*.mjs`; other slices' tests and fixtures (read the campus
  pair, never edit it; make changed copies inside your test).
- `scripts/e2e-*.mjs`, `scripts/run-e2e.mjs`, `scripts/laptop-queue/**`, `docs/**`.

## Unit tests (`tests/routeRunPoints.test.ts`, no browser, no Vite)
- The campus pair (`campusOps-S1.graph.json` + `.points.json`) passes with no problems.
- A copy with `geom` changed -> the geom problem; the graph's `meta.measured` removed -> the "not measured" note, no
  problem.
- A copy with two links swapped -> problems naming both indices; a link dropped -> the count problem.
- Not a table -> the plain problem; a link `at: null` and a space missing -> notes only.
- `loadPoints` with a path (temp file), with `auto` and a fake `run` that writes the campus table to the given
  `--points` path (assert the command line: `scripts/level-measure.mjs`, the files in order, `--points`), and with a
  stale table -> throws, message lists the problems.

## Checks
- Cloud-safe: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/routeRunPoints.test.ts tests/routeRunPlan.test.ts
  tests/routeRunCli.test.ts`. No e2e, no GPU, no `npm run check`.
- Pending PC run (laptop queue, `E2E_GPU=1`, alone; the lead requests once the seam is in):
  - `node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S1.json --points <tmp>/s1.points.json`
    then `serve scripts/route-run.mjs http://127.0.0.1:4189/ --graph docs/sector-redesign/graph/campusOps-S1.json
    --points <tmp>/s1.points.json --section S1 --players 2` (or `--points auto`), `--set route-run-s1-graph`; done
    when the report names graph spaces and links (not code routes).
  - The same with a hand-edited stale table: refused with the plain message, no browser opened.

## Done
PLAN R6's line (`:247-248`): campus S1 runs from its graph (PC run), the report names graph spaces and links, and a
table with a stale `geom` or two links swapped is refused with a plain message (unit tests here; the CLI refusal once
the seam is in).

## Size
About 450 counted lines: `points.mjs` ~200, test ~250. PLAN estimate 250 + the test. Under ~1.5k.

## Report
Append at the end of this file: what changed, tests with counts, the seam diff sketch, deviations, the pending PC
runs. Then `status: done feature/route-runs-r6 <sha>`, or `status: blocked <reason>`. Commit trailer:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
