status: done feature/validator-port-s9 b6464dd958d116867e8ed180c3a7679f7020c967
# J12 validator-port, slice S9 (Sonnet, strict Opus brief): Marlow Yard graph on `training`, measured, run saved

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3). S4, S6, S7b, S5 checker PASS and
merged into PR C; PR B2 (S2 measure CLI) merged on master.

- Base: `feature/validator-port-c2` at `17871b9fe6eafd04c28136583a4e0498e48e44dc` (= PR C fede9015e merged with PR B2
  57c0a00a0: S0, S3, S4, S5, S6, S7b, S1 `levelMeasure.ts`, S2 `scripts/level-measure.mjs`). New branch:
  `feature/validator-port-s9` cut from it. Push every sub-step. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/validator-port-s9`.
- Fetch the sources first: `git fetch origin feature/level-validator-v7 feature/marlow-replan` (v7 head 97873079,
  J14 head 332541464).
- Read first: `docs/systems/agent-preamble.md` (origin/master, "Cloud sessions"); the PLAN
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` row S9 (:113) and its detail (`**S9 (Sonnet).**`,
  :293-297), section 4 "V7 97873079 ... goes to S9" (:328); BRIEF (same branch, `docs/validator-port/BRIEF.md`) A8, A15,
  A16, A23, A26. The teach sources: `docs/marlow-final/SPEC.md` on your branch (set headings :371, :402, :443, :487,
  :535, :581, :632; route summary table :754-765).

## Only files to create (nothing else changes)
1. `docs/marlow-final/graph/ctcourse.json` (new)
2. `docs/marlow-final/graph/run.txt` (new)
3. `docs/marlow-final/graph/REPORT.md` (new)
4. `changes/feature-validator-port-s9.md` (new, `kind: patch`; one or two bullets: the Marlow Yard graph is on master
   on the training profile, measured, with its saved run and report; no game change)

No script, test, manifest (`docs/level-validator/graph-sets.json` is I-C's), schema doc or other graph changes.

## Steps
1. Take v7's graph whole: `mkdir -p docs/marlow-final/graph && git show
   97873079:docs/marlow-final/graph/ctcourse.json > docs/marlow-final/graph/ctcourse.json`. Keep its compact layout
   (one space or link per line); every edit below changes only the members named.
2. `meta`: `"mode":"campaign"` becomes `"mode":"training"`; add `"taught_by":"A7"` after `"sections"` (A7 Data Hall is
   the last set that teaches a move on its own: SPEC :632 and the route summary, where A8 is "Graduation"; A8 of BRIEF).
   No `requires_kill` and no `mark` anywhere (PLAN S9: none as built).
3. Teach elements, exactly these eight (A8: a link field `teach` or a space tag `teach:<move>`). Find each link by
   `from`, `to` and `kind` (each matches exactly one link). Append to that link's or space's `note` one sentence:
   ` Teach (validator-port S9): <move>, SPEC.md:<line> ("<set heading words>").`
   | Section | Element | Value | SPEC line |
   | --- | --- | --- | --- |
   | A1 | link `a1-apron -> a1-walltop` `coop_boost` | `"teach":"leg-up"` | :371 (teach: the handshake; E1 leg-up :379) |
   | A2 | space `a2-neck` tag | `"teach:light-isolation"` | :402 (timed light isolation; E7a crosses the neck) |
   | A3 | space `a3-corridor` tag | `"teach:jam-relay"` | :443 (the timed jam relay) |
   | A4 | space `a4-secroom` tag | `"teach:camera-loop"` | :487 (the security room's camera loop) |
   | A5 | link `a5-apron -> a5-inner` `coop_boost` | `"teach":"partner-throw"` | :535 (partner throw with release) |
   | A6 | link `a6-bridge -> a6-cage` `drop` | `"teach":"hang-down"` | :581 (the hang-down, through the gland plate) |
   | A6 | link `a6-floor -> a6-gallery` `team_rope` | `"teach":"rope"` | :581 (the rope once, untimed) |
   | A7 | link `a7-pod -> a7-hold-l7` `pair_gate` | `"teach":"synced-hack"` | :632 (split paths and a synced hack) |
   Tags go at the end of the space's `tags` array. A4's dual takedown is optional (SPEC P10 :976): no element. A8 needs
   none (after `taught_by`).
4. Check before measuring (plain node, no build). The lead ran these on the same edits:
   - `node scripts/level-validate.mjs docs/marlow-final/graph/ctcourse.json` last line exactly
     `25 error(s), 73 warning(s).`; no "no teach element" line; exactly five "is avoided by an entry-to-exit path"
     lines (A1 leg-up, A2 light-isolation, A5 partner-throw, A6 rope, A6 hang-down); `split 'a4'` and `split 'a7'` ERRs
     up to taught_by; side-route ERRs in A1-A5.
   - `node scripts/level-validate.mjs --require-measured docs/marlow-final/graph/ctcourse.json`: `36 error(s), 73
     warning(s).`
   - Route counts (A26): `node --input-type=module -e "import fs from 'node:fs'; import { sectionRoutes } from
     './scripts/level-checks/training.mjs'; const g = JSON.parse(fs.readFileSync('docs/marlow-final/graph/ctcourse.json',
     'utf8')); console.log(g.meta.sections.map((s) => s + ' ' + sectionRoutes(g, s).count).join(', '))"` prints
     `A1 2, A2 2, A3 3, A4 3, A5 2, A6 1, A7 1, A8 1`.
   Any other result: stop, report what differs, `status: blocked <one line>`.
   Commit: `validator-port S9: Marlow Yard graph (v7 97873079) on the training profile, taught_by A7, teach elements`.
5. Measure (headless node through Vite's SSR loader: no browser, no GPU; `npm ci` first if `node_modules` is missing).
   - `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json` (print only). Keep the stderr timing lines
     (build, runtime nav, light bake) and any `ERR` line (for example a space under 20 floor cells).
   - `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --write`, then the same command again: the
     second run must leave the file byte-identical (`git diff --quiet docs/marlow-final/graph/ctcourse.json` after
     committing the first).
   - `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --check`: report its exit code and its
     failing lines (target misses are expected: the course is as built, A16).
   Commit: `validator-port S9: ctcourse measured (level-measure --write)`.
   If the measure step cannot run in this container (an environment error, not a graph finding): do not hand-write
   any `measured` value; write the error in the report, mark the measure "pending PC run", save the plain run in step 6
   and still finish. A graph finding (an ERR from the tool) is not a reason to stop.
6. Validator runs after the measure:
   - `node scripts/level-validate.mjs docs/marlow-final/graph/ctcourse.json` (counts for the report);
   - `node scripts/level-validate.mjs --require-measured docs/marlow-final/graph/ctcourse.json >
     docs/marlow-final/graph/run.txt` (the saved run: the CLI's exact stdout, nothing added; its last line is the
     counts line, as `scripts/level-graphs.mjs` writes runs). Exit 1 is expected (errors).
7. `docs/marlow-final/graph/REPORT.md`: v7's report rebased
   (`git show 97873079:docs/level-validator/marlow-run/REPORT.md`; that file stays on the v7 branch, do not port it).
   - Line 1 `# Marlow Yard (ctcourse) - training validator run (validator-port S9)`, line 3 `Owner: Marlow Build.
     Status: current.` Plain English, hyphens not em dashes, lines under 120 characters.
   - What the graph is: v7's as-built graph (55 spaces, 85 links, 4.103), moved here with `mode: training`,
     `taught_by: A7` and the eight teach elements (the table from step 3); J14's re-plan will rewrite it (A16).
   - Commands and results: the three measure runs (times, `--check` exit), both validator runs (counts), route counts.
   - Training result (A8, A9, A23, A26): per section the route count and every training ERR.
   - Every ERR of the `--require-measured` run, grouped by rule as v7's "ERR / WARN / INFO counts by rule" table, each
     group with a column "Fixed by (J14)": the J14 slice that changes that set or graph, from
     `git show origin/feature/marlow-replan:docs/marlow-replan/PLAN.md` "Slices and PRs" (:238-460: the set slice for
     that bay, G1 graph as built, F1, KS1-KS5, R1) with its line, or "none: graph modelling" or "validator reading:
     lead" when no J14 row fits. Do not invent J14 work.
   - Measured table: per encounter space `shadow_pct` (INFO, G329), `sees_pct` against `vantage_min_frac`,
     `los_break_s` against `los_break_max_s`; splits `a4`, `a7`, `a8` legs and reach (numbers from the graph).
   - Keep v7's "Modelling choices" 1-8 (rebased wording; item 9 "not run" becomes the measure result) and its stand-in
     kinds note (the graph keeps v7's kinds as built; J14 swaps to the A25 kinds).
8. Fragment (file 4). Commit: `validator-port S9: saved run, REPORT, changelog fragment`.

## Checks (unit only: no e2e, no GPU, no npm run check)
- `npx vitest run tests/levelTraining.test.ts tests/levelGraphs.test.ts tests/changesFragments.test.ts` all green
  (levelGraphs is untouched: Marlow Yard joins the manifest in I-C).
- `node scripts/doc-lint.mjs`: 0 errors (warnings in your files listed in the report).
- Pending PC run: the lead reruns `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --check` on the
  desktop (drift between this container's bake and the desktop's, if any).

## Done
The four files committed on `feature/validator-port-s9`, step 4's numbers held, measured (or measure "pending PC run"
with the reason), run.txt is the exact CLI output.

## Report (append below, then set line 1)
What changed (files, commits), the step 4 numbers, measure times and `--check` result, both validator counts (these go
to I-C), route counts, the ERR-to-J14 mapping summary, tests with counts, deviations. Then
`status: done feature/validator-port-s9 <sha>`.

### Report (Night Shift | Cloud Builder 2, 2026-10-25)
**Done.** Branch `feature/validator-port-s9`, head b6464dd95, cut from 17871b9fe. The four files only:
`docs/marlow-final/graph/ctcourse.json`, `run.txt`, `REPORT.md`, `changes/feature-validator-port-s9.md` (`kind: patch`).
- Commits: 077d5d135 (graph, training, taught_by A7, eight teach elements), be052d836 (measured, `--write`), 1cebc372a
  (saved run and fragment), b6464dd95 (REPORT). Deviation: the brief's third commit was split in two because the
  builder agent's tool refused to write REPORT.md; the lead session wrote it from the agent's text, with no other change.
- Step 4 held exactly: 25 error(s), 73 warning(s); `--require-measured` 36 / 73; no "no teach element" line; exactly
  five "is avoided by an entry-to-exit path" lines (A1 leg-up, A2 light-isolation, A5 partner-throw, A6 rope, A6
  hang-down); `split 'a4'` and `split 'a7'` ERRs and the A1-A5 side-route ERRs present. Routes:
  `A1 2, A2 2, A3 3, A4 3, A5 2, A6 1, A7 1, A8 1`.
- Measure (cloud container, 4 CPUs shared): print only, `--write`, `--write` again each about 40 s (build about 30 ms,
  nav about 360 ms, bake 38-40 s); the second `--write` left the file byte-identical. `meta.measured.geom`
  `v83j27-1jwh0b5`. The measure printed 2 ERR (graph findings): `a1-walltop` has no walkable floor cell within 1 m of
  4.4 (a co-op-only wall top); `a1-cabin` only 10 floor cells.
- `--check`: exit 1, 13 failure lines, all target misses or the 2 ERR above: shadow a2-neck 0.00, a4-secroom 0.00,
  a4-dock 0.31, a8-office 0.02; sees a2-neck 0.22, a4-secroom 0.00, a5-inner 0.50, a6-floor 0.59, a7-hall 0.10,
  a8-hall 0.64; split a8 reach 16.54 s above 15 s. No LOS-break miss, no drift.
- Validator counts for I-C: plain `34 error(s), 83 warning(s).`; `--require-measured` (saved as `run.txt`, the CLI's
  exact stdout, re-checked byte for byte) `37 error(s), 83 warning(s).`, 23 INFO (16 light band, 7 guard band).
- ERR to J14 (REPORT.md table): 12 of 37 are training checks (routes A1-A5, teach avoided A1 / A2 / A5 / A6 x2, split
  before taught_by a4 / a7), each mapped to its set slice (G-A1A7 :426 ... G-A8 :432); measured sees misses to the set
  slice then G1 :440; a4-secroom size and a1-cabin dead end "none: graph modelling"; the 3 "no measured leg" split lines
  (a7 legs, a8 leg a: co-op links are not on the nav grid) "validator reading: lead". J14's planned `graph.json` run
  through the same validator gives 4 ERR (A8 office approaches), none of these 37.
- Tests: `npx vitest run tests/levelTraining.test.ts tests/levelGraphs.test.ts tests/changesFragments.test.ts`
  25 of 27 pass. The 2 failures are in `levelGraphs` on the campus set ("the saved run is the level-validate CLI text
  for the set", "exits 1 on a count that differs ..."); they fail the same on the untouched base 17871b9fe (the
  campus `run.txt` and the runner test lack the validator's new "pending V6" INFO lines), so they are not S9's;
  S10's re-saved campus run should clear the first. `node scripts/doc-lint.mjs`: 0 errors, 26 warnings, none in S9 files.
- Pending PC run: `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --check` on the desktop for
  bake drift (expected: the same 13 lines). `a4-secroom`'s measured 0 sight (vantage from L3's glass slot, a point in
  the previous section) is worth a look before trusting it.
