status: done feature/validator-port-dc e2a4e63f154b4a7aa63154f77ef4ce18fe4c6835
# J12 validator-port, docs slice D-C (Sonnet, strict Opus brief): docs for PR C (training, perfect run, engine, sets)

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3). S4, S5, S6, S7b checker PASS
(batch check) and merged into PR C. S9 and S10 run in parallel with you on their own branches: you do not touch their
files and do not describe their results (the lead merges all three into PR C).

- Base: cut the new branch `feature/validator-port-dc` from `feature/validator-port-c2` at
  `17871b9fe6eafd04c28136583a4e0498e48e44dc` (= PR C fede9015e + PR B2 57c0a00a0, so it holds D-B2's testing-tools
  text). Then, first commit, merge D-A (graph-schema and level-design text you build on; it is on master but not on
  PR C): `git merge --no-ff origin/feature/validator-port-da -m "Merge origin/feature/validator-port-da (D-A docs) into
  feature/validator-port-dc"` (a049af8f1; the lead checked it is clean: after it, `graph-schema.md` and
  `level-design.md` equal origin/master's). If it is not clean: `status: blocked D-A merge conflicts: <files>`.
  Push every sub-step. Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/validator-port-dc`.
- Read first: `docs/systems/agent-preamble.md` (origin/master, "Cloud sessions"); the PLAN
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` row D-C (:118), the paragraph under the table
  (:123-131), section 7 "Level standard #443" and "Orchestrator J1 / J2" (:403-407); BRIEF (same branch) A7, A8, A9,
  A10, A11, A12, A14, A22, A23, A26, A27. The code you describe (read it; the doc must match it line by line):
  `scripts/level-checks/training.mjs` (`checkTraining`, `sectionRoutes`), `perfect.mjs` (`checkPerfect`,
  `perfectPaths`), `engine.mjs` (`checkEngine`), `measured.mjs` (`checkMeasured`), the `PROFILES` table in
  `scripts/level-graph-lib.mjs` (:53-83), the `team_throw` case of `checkDimensions` in `scripts/level-validate.mjs`,
  `scripts/level-graphs.mjs`, `docs/level-validator/graph-sets.json`.
- The text to fold: the slice fragments on your branch, `changes/feature-validator-port-s4.md`, `-s5.md`, `-s6.md`,
  `-s7b.md` (S7b's carries the full `exception` field text for graph-schema).

## Only files to edit
1. `docs/level-validator/graph-schema.md`
2. `docs/level-design.md` (only the lines named below)
3. `docs/systems/testing-tools.md` (only the validator bullet and the "Measure CLI" section)
4. `changes/feature-validator-port-train.md` (new) and `git rm` of `changes/feature-validator-port-s4.md`, `-s5.md`,
   `-s6.md`, `-s7b.md` (one fragment per PR, `changes/README.md`). Do not touch `changes/feature-validator-port-b2.md`
   or `-da.md` (already released; they drop out when PR C merges).

Style: plain English, hyphens not em or en dashes, lines under 120 characters, one home per rule (graph-schema owns
fields and severities; level-design owns rules; numbers live in the scale sheet, named by metrics key), doc headers
(`Owner: ... Status: ...`) unchanged. Do not add a backticked path to a file that is not on your branch (doc lint's link
check fails): name S9's Marlow graph and S10's campus drift test in words only, if at all. Do not append anything after
graph-schema's last section ("Campus conventions"): D-D adds a section there on PR D.

## 1. graph-schema.md
- `meta` table: a `taught_by` row (string; training: the section where the last co-op kit move is taught on its own;
  ERR missing or not in `meta.sections` on a `training` map, ERR present on any other mode).
- Mode profiles table (match `PROFILES`): Co-op coverage on `training` becomes `- (G392)` (drop "the code still checks
  it"); Solo twins on `training` becomes INFO (A7); add rows for the training checks (campaign / sector: ERR when
  `taught_by` is present; training: as below), the no-kill path (ERR in every mode), the ghost path (ERR, ERR, INFO),
  `mark` (ERR, ERR, INFO count) and the nav floor WARN (every mode).
- `spaces[]`: a `mark` row. Tags table: `teach:<move>` (space; free text from the map's teach list; counts for the
  space's section only).
- `links[]`: rows for `teach` (string), `requires_kill` (bool; any other value ERR), `mark`, and `exception` (S7b's
  fragment text, shortened to the table plus one paragraph; the `team_throw` row in "Link kinds" gains the long-throw
  exception in one clause: `sizes.throw_long`, scale sheet section 3 "Long throw (named spots only)", Michael's ~20:45
  "Mix of both").
- "How the checks read the graph", new bullets in the list (no blank line splitting the list; fix the existing blank
  line before "Measured values" the same way):
  - **Training (checkTraining, `training` only).** A8 / A9 / A23 / A26 as the code does them: `taught_by`, teach
    elements, the route count on the section interior (`sectionRoutes`: no spine links, split legs merged into one
    node, same-direction steps between two spaces once, simple paths entry to exit, count stops at 10), up to and
    including `taught_by` ERR 2+ routes / a `split:` tag / no teach element / a teach element some entry-to-exit path
    avoids; after it, a section with 2+ routes needs a guarded encounter space and then runs the campaign route rules on
    itself. Plus two known limits (batch checker): a teach on a link between two sections counts for neither section
    (interior only); the late-section route rules run on a one-section subgraph without the links that enter the
    section, so an entry space whose only interior link leads into a guarded encounter space is not counted as an
    approach there (the full-graph core rule would count it; not hit on today's graphs).
  - **Perfect run (checkPerfect).** S6's fragment as schema text: the no-kill path (no `requires_kill` link) and the
    ghost path (also no `loud` link, A11) from `start` to every `objective` and on to the run's end (exfil on campaign,
    the last section's exit on Sector Ops and training), severities per profile; `mark` per profile. Plus one known
    limit (batch checker): each objective's reach from start and its way on to the end are checked separately, not as
    one tour, so two objectives in separate one-way branches both pass (two players can split).
  - **Engine facts (checkEngine).** S7b's nav-floor WARN: a space more than `rules.nav_floor_depth_m` below storey 0
    that is an encounter space or has guards (level-design 12.1); a missing key prints one WARN and skips the check.
- Fix the stale lines (Opus checker of PR #479, polish 1-3; check each against the code before writing):
  - Co-op coverage bullet: replace "until the validator is changed it still reports there" with the truth (not checked
    on `training`, G392). Solo twins bullet: "WARN on Sector Ops ... and on `training`" becomes WARN on Sector Ops,
    INFO on `training` (A7). Rewrap both bullets under 120 characters.
  - "Measured values" intro: a `null` prints a WARN only for a split's `reach_s` and a way back's `back_s` (a `null`
    space value or link `time_s` prints nothing); "every other measured miss is an ERR" must not contradict the drift
    WARN / INFO rows below it.
  - Measured table: add the ERRs the code has and the table lacks: `ways_back` that is not a list, a `ways_back`
    entry that is not an object, and (under `--require-measured`) a way back with no `back_s` on a link that is not a
    two-way gate.
  - "(it reaches master with validator-port PR B2)" (two places: "Estimating the targets" and "Schema additions"):
    the measure CLI is live (`scripts/level-measure.mjs`; `npm run level-measure`).
- Intro list: one line that the committed graph sets are listed in `docs/level-validator/graph-sets.json` and run by
  `npm run validate:levels` (testing-tools has the detail).
- "Rule coverage" table: rows for taught by / teach, perfect run (`requires_kill`, `route: loud`), markers (`mark`) and
  the long throw (`exception`, `width`).

## 2. level-design.md (A22: only these; no other rule changes)
- Training profile, the "One linear route" bullet (:45-49): one sentence naming the graph field: the last section that
  teaches a kit move on its own is the graph's `meta.taught_by` (graph-schema), which the validator uses for the
  forced-section and side-route checks (G363, G388).
- 14, phase 3 "Greybox exit gate" item (1) (:547-549): the measured validator pass is live: `node
  scripts/level-measure.mjs <graph files> --write`, then `node scripts/level-validate.mjs --require-measured <graph
  files>` with 0 errors (graph-schema "Schema additions"); keep G289 (2) "Yes, require it"; drop "V6, open", the
  archive V6-PLAN pointer and "until V6 lands ...".
- 15, the greybox-measurements line (:559-561): drop "(V6, not live yet: ...)"; say what is measured now (vantage view,
  LOS break, partner reach and split legs; shadow share as information, G329) by `scripts/level-measure.mjs` and
  checked under `--require-measured` (14); the light band (5.5) is measured when the lux band check lands (light-realism
  J10; BRIEF "Out of scope"). The rule (a measured miss fails the map) stays.
- Rule index (:708-755): the intro sentence names `scripts/level-checks/` beside `scripts/level-validate.mjs`; update
  rows 3.1, 3.4, 5.5, 11.3, 11.6 (+ `checkMeasured`; drop "V6 ... not live"), 6.4 (+ `checkPerfect` (`mark`: ERR, INFO
  on Training)), 7.3 (+ `checkPerfect` (ghost and no-kill paths)), 11.9 (+ `sizes.throw_long`; `team_throw`
  `exception`), 14 (`level-measure --write` + `level-validate --require-measured`, route-runs); add a "Training profile:
  one route, forced sections" row (Training; `checkTraining`; owner level validator) and a "12.1 Nav floor" row (All;
  `nav_floor_depth_m`; `checkEngine`; level validator). Same column layout as the table.

## 3. testing-tools.md
- The `node scripts/level-validate.mjs` bullet (:499-517): usage gains `[--require-measured]`; the stale "(V6, later)
  will write `measured` values" becomes what is live (`level-measure` writes them, `--require-measured` is the presence
  gate); one sentence that the training, perfect-run, measured and engine checks live in `scripts/level-checks/` and
  their severities in graph-schema; solo twins INFO on training.
- A new bullet after it: `npm run validate:levels` (`scripts/level-graphs.mjs`, validator-port S5): runs every set in
  `docs/level-validator/graph-sets.json`, exits 1 when a count differs, `--write` rewrites each saved run and the counts,
  `tests/levelGraphs.test.ts` pins the same counts (CI through `npm test`).
- "Measure CLI" section (:523-557): "It is not in `package.json` yet (validator-port S5 owns that)" becomes `npm run
  level-measure -- <graph.json> ...` also works. Nothing else in that section.

## 4. changes/feature-validator-port-train.md
Line 1 `# Level validator: training, perfect-run and engine checks, graph sets`, line 2 `kind: patch`; then the bullets
of the four slice fragments (S4, S5, S6, S7b) as they are, except S7b's long "Graph schema, new optional link field"
block, which becomes one short bullet (the field is now documented in graph-schema); then one bullet for these docs.
`git rm` the four slice fragments.

## Checks (unit only: no e2e, no GPU, no npm run check)
- `node scripts/doc-lint.mjs`: 0 errors; no new warning in your three docs (list any you could not avoid).
- `npx vitest run tests/docLint.test.ts tests/changesFragments.test.ts tests/levelValidate.test.ts
  tests/levelProfiles.test.ts tests/levelGraphs.test.ts`: all green.
- `node scripts/level-validate.mjs docs/level-validator/example.graph.json`: `0 error(s), 0 warning(s).` (unchanged).
- `git diff --stat origin/feature/validator-port-c2...HEAD` shows only the D-A merge's files and the files above; no
  em or en dash in your added lines (`git diff origin/feature/validator-port-c2...HEAD -- docs changes |
  LC_ALL=C.UTF-8 grep -nP '^\+.*[\x{2013}\x{2014}]'` prints nothing).

## Done
Every field, rule and severity PR C added is in graph-schema once and matches the code; the stale V6 / coverage /
solo-twin lines are gone; level-design changed only where listed; one PR C fragment.

## Report (append below, then set line 1)
What changed (per file, with line ranges), commits, checks with counts, any code-vs-doc mismatch you found (do not fix
code), deviations. Then `status: done feature/validator-port-dc <sha>`.

### Report (Night Shift | Cloud Builder 3, 2026-10-25)
Branch `feature/validator-port-dc` from 17871b9fe, head e2a4e63f1. Commits: b081a7ab7 (D-A merge, clean), 2ae02a2be
(graph-schema), 8ff181b86 (level-design), 1aa55dc15 (testing-tools), e2a4e63f1 (fragment).

What changed:
- `graph-schema.md`: intro "Graph sets" bullet (graph-sets.json, `npm run validate:levels`); `meta.taught_by` row;
  mode profiles: Co-op coverage `- (G392)`, solo twins on training INFO (A7), new rows training checks, no-kill path
  (ERR/ERR/ERR), ghost path (ERR/ERR/INFO), markers (ERR each/ERR each/INFO count), nav floor WARN in every mode;
  `spaces[]` `mark` row, tag `teach:<move>`; `links[]` rows `teach`, `requires_kill`, `mark`, `exception`, plus a
  long-throw paragraph and the `team_throw` long-throw clause (`sizes.throw_long`, sheet section 3); "How the checks
  read the graph": Training, Perfect run and Engine facts bullets with their known limits; Encounter bullet notes a
  late training section runs the route rules on itself; stale lines fixed (co-op coverage, solo twins, the Measured
  values intro: `null` WARNs only for a split `reach_s` and a way back `back_s`; two Measured rows for `ways_back`
  shape and a missing `back_s` under `--require-measured`; both "(it reaches master with PR B2)"); Rule coverage rows.
- `level-design.md`: "One linear route" names `meta.taught_by` (G363, G388); section 14 phase 3 item (1) gives the
  live `level-measure --write` then `level-validate --require-measured` commands (V6-open lines gone, G289 (2) kept);
  section 15 greybox-measurements line names what is measured now (shadow share info only, light band waits on J10);
  rule index intro names `scripts/level-checks/`, rows 3.1, 3.4, 5.5, 11.3, 11.6, 6.4, 7.3, 11.9, 14 updated, new
  rows "Training profile: one route, forced sections" (first) and "12.1 Nav floor" (before 14).
- `testing-tools.md`: validator bullet (`[--require-measured]`, solo twins INFO on training, `level-measure` writes
  `measured`, `--require-measured` is the presence gate, checks in `scripts/level-checks/`); new
  `npm run validate:levels` bullet; Measure CLI notes `npm run level-measure -- <graph.json> ...`. 711 / 720 lines.
- `changes/feature-validator-port-train.md` (new, `kind: patch`): S4, S5, S6, S7b bullets as written (S7b's
  `exception` block cut to one bullet) plus one docs bullet; s4 / s5 / s6 / s7b fragments `git rm`-ed.

Checks:
- `node scripts/doc-lint.mjs`: 0 errors, 26 warnings, the same 26 as before the edits (testing-tools' "ports" owners
  warning moved from :618 to :626); none new in the three docs.
- `npx vitest run tests/docLint.test.ts tests/changesFragments.test.ts tests/levelValidate.test.ts
  tests/levelProfiles.test.ts tests/levelGraphs.test.ts`: 155 passed, 2 FAILED, both in `tests/levelGraphs.test.ts`
  ("set campus > the saved run is the level-validate CLI text for the set"; "level-graphs runner > exits 1 on a count
  that differs, and --write fixes the manifest and writes the run"). Pre-existing: Cloud Builder 3 reran the file on a
  clean checkout of base 17871b9fe and the same 2 fail (8 pass). Cause: the validator at base prints "pending V6 (no
  measured values)" INFO lines that the saved `docs/level-validator/campus-run/run.txt` and the runner test's
  hard-coded '\n0 error(s), 0 warning(s).\n' do not have (counts 127 / 174 and example 0 / 0 still match). The fix is
  code / test / run.txt, outside this slice's files: likely `npm run validate:levels -- --write` plus the runner-test
  expectation, on S10 (campus) or the PR C integration. LEAD: please route it.
- `node scripts/level-validate.mjs docs/level-validator/example.graph.json`: `0 error(s), 0 warning(s).`
- `git diff --stat origin/feature/validator-port-c2...HEAD`: only the D-A merge's files and this slice's files plus
  the four removed fragments; the dash grep prints nothing.

Code-vs-doc notes (code not touched): `training.mjs` skips the choke test for a teach element on the entry or exit
space (doc says so); a null split `a_s` / `b_s` or way back under `--require-measured` counts as missing (ERR) while a
null `reach_s` only WARNs (doc says so).

Deviations: one clause added to graph-schema's Encounter bullet (old "`training` skips these" was no longer exact);
the non-`team_throw` `exception` ERR lives in `checkEngine`, so it is in the Engine bullet and the links row; S5's
fragment bullet kept verbatim though "the tool lands in another slice" is slightly stale; S9 / S10 not named.
