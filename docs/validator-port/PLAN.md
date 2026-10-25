# validator-port - plan

Owner: Marlow Build. Status: current.

Job J12; scope, Michael's words and assumptions A1-A26: `BRIEF.md`. Refs read 2026-10-25: origin/master 2148ec96;
`feature/level-validator-v6` 8f551e18 (V6), `feature/level-validator-v7` 97873079 (V7), `feature/mission-validator`
0c62a921 (MV, = mission-validator-dims); Campaign Build's `feature/mission-framework` d93ae66e (`docs/missions/PLAN.md`
"Validator detail (VAL)"). Line counts below are counted lines, as pr-size counts them (section 1): code and
tests; `docs/**` (graph JSON included) is not counted.

## 1. Shape

```
scripts/level-validate.mjs        CLI + core checks (structure, dimensions, reach, spine, encounters, redundancy, coop,
                                  pacing); validate() runs core + the modules below; --require-measured
scripts/level-graph-lib.mjs       NEW: collector, index, arcs / adjacency / reachable / edgeDisjointPaths, linkTime
                                  (reads measured.path_m), tags, PROFILES (one row per mode)
scripts/level-checks/measured.mjs NEW: checkMeasured (V6d port, V1 INFO shadow, V2 presence gate)
scripts/level-checks/training.mjs NEW: taught_by / teach, one route before taught_by, late side routes (Q24, Q29)
scripts/level-checks/perfect.mjs  NEW: ghost and no-kill paths, requires_kill, mark (VISION 4 rules 3-5)
scripts/level-checks/engine.mjs   NEW: engine-fact WARNs (V10), rope up-only
scripts/mission-validate.mjs      NEW: checkMission (MV re-cut, joint with Campaign Build)
scripts/level-graphs.mjs          NEW: npm run validate:levels over docs/level-validator/graph-sets.json
src/world/levelMeasure.ts         NEW: V6 measurement core (+ way back, + resolvePoints for J13)
scripts/level-measure.mjs         NEW: V6 measure CLI (--write / --check / --doors / --map / --points)
```

Five PRs, each under ~1.5k counted lines, each with one Opus checker (FOLDED-PLAN J12 gate). Counts follow
`scripts/pr-size.mjs`: added + deleted lines per file (`:87`), so a moved line counts twice (once out, once in);
`docs/**` (graph JSON included), `*.md` and `changes/**` are not counted (`:17`), nor `tests/fixtures/**/*.json`
(`:29`); `package.json` and every `tests/*.ts` are.

| PR | Branch (integration) | Slices | Counted lines | Opens when |
| --- | --- | --- | --- | --- |
| A gate core | `feature/validator-port` | S0, S3, D-A | ~1,390 (S0 ~930, S3 ~460) | S0, S3 checker PASS |
| B measure core | `feature/validator-port-measure` (from origin/master) | S1, D-B | ~1,050 | S1 checker PASS |
| B2 measure CLI, sheet rows | `feature/validator-port-measure-cli` (from B's head; merges S7a's branch) | S2, S7a, D-B2 | ~740 (S2 ~630, S7a ~110) | B merged on master |
| C training, perfect run, CI, graphs | `feature/validator-port-train` (from A's head after S0; merges A's, B's and B2's branches) | S4, S6, S5, S7b, S9, S10, D-C, I-C | ~1,400 (S4 ~530, S6 ~330, S5 ~270, S7b ~170, S10 ~100, S9 0) | A, B and B2 merged on master (so C's diff is its own) |
| D mission re-cut | `feature/validator-port-mission` (from A's head; merges C's branch) | S8, D-D, I-D | ~1,060 | C merged on master |

S0's ~930: the helper move (master `scripts/level-validate.mjs:27-72` and `:79-256`, ~220 lines) counts ~440 alone;
then PROFILES and the twelve mode tests ~90, wiring, flag, merge and `linkTime` ~60, the A25 kinds ~40, five stubs
~45, `levelProfiles` ~200, inline `levelValidate` fixture edits ~40, re-exports ~20. PR B grew past the cap with
`resolvePoints` (S1 ~1,050: V6's 589 + 220 test lines, way back ~100, resolver ~120, master API fixes ~20) and
`--points` (S2 ~630: V6's 438, `ways_back` and `--points` ~60, CLI test ~130), so the measure CLI is its own PR (B2),
and the small S7a rides it. Branch merges between these integration branches are feature-branch merges; none merges
master.

Fallbacks, each named before it is needed: PR A over 1.5k -> S3 becomes its own PR right after A (it needs only S0).
PR C over 1.5k -> S6 becomes its own PR right after A (it needs only S0); C and D then merge its branch. PR D over
1.5k -> the `missionValidate` test cases for the kind lists move to a follow-up PR with Campaign's kind-list pin (A20).

## 2. Slices

Each slice runs in its own worktree `C:/NightShift/Mobile-Coop-validator-port-<slice>` on
`feature/validator-port-<slice>`, cut from the integration branch named in its row; the lead merges it back. "Owns"
lists every file the slice may touch; no two slices running at once own the same file.

| Slice | What | Owns (claims) | Lines | Model | Depends on | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| S0 | Lib split, PROFILES (Q29 row), module wiring, `--require-measured` flag, mission-node merge, `linkTime` measured, A25 kinds | `scripts/level-graph-lib.mjs`, `scripts/level-validate.mjs`, `scripts/level-checks/{measured,training,perfect,engine}.mjs` (stubs), `scripts/mission-validate.mjs` (stub), `tests/levelProfiles.test.ts`, `tests/levelValidate.test.ts`, `docs/level-validator/example.graph.json` | ~930 | Opus | - | `levelValidate`, `levelProfiles` |
| S1 | Port `levelMeasure.ts` to master; add way-back measure and J13's `resolvePoints` | `src/world/levelMeasure.ts`, `tests/levelMeasure.test.ts` | ~1,050 | Opus | - | `levelMeasure` |
| S2 | Port `level-measure.mjs` CLI; write `ways_back`; `--points` | `scripts/level-measure.mjs`, `tests/levelMeasureCli.test.ts` | ~630 | Sonnet | S1's exported API (V6's + `resolvePoints`) | `levelMeasureCli` |
| S7a | V12 + sheet rows: metrics-gen rejects unknown flags; rows `nav_floor_depth_m`, `ladder_grab_m`, MV's six `mission_*` rows; relay lip derivation (A24) | `scripts/metrics-gen.mjs`, `tests/metricsGen.test.ts`, `docs/design/scale-sheet.md`, `docs/design/metrics.json` | ~110 | Sonnet | #443 (merged 4.103.3) | `metricsGen` |
| S3 | `checkMeasured` port with V1 and V2 | `scripts/level-checks/measured.mjs`, `tests/levelMeasured.test.ts`, `docs/validator-port/fragments/S3.md` | ~460 | Opus | S0 | `levelMeasured` |
| S6 | Ghost / no-kill paths, `requires_kill`, `mark`; T H4 static test | `scripts/level-checks/perfect.mjs`, `tests/levelPerfect.test.ts`, `tests/noForcedKill.test.ts`, `docs/validator-port/fragments/S6.md` | ~330 | Opus | S0 | `levelPerfect`, `noForcedKill` |
| S4 | Training checks (A8, A9, A23, A26) | `scripts/level-checks/training.mjs`, `tests/levelTraining.test.ts`, `docs/validator-port/fragments/S4.md` | ~530 | Opus | S0 | `levelTraining` |
| S7b | Engine-fact WARNs, rope up-only | `scripts/level-checks/engine.mjs`, `tests/levelEngine.test.ts`, `docs/validator-port/fragments/S7.md` | ~170 | Sonnet | S0, S7a | `levelEngine` |
| S5 | `validate:levels`, graph-set manifest, count pins | `scripts/level-graphs.mjs`, `docs/level-validator/graph-sets.json`, `package.json`, `tests/levelGraphs.test.ts`, `docs/validator-port/fragments/S5.md` | ~270 | Sonnet | S0 | `levelGraphs` |
| S8 | Mission-validator re-cut (joint, Campaign reviews) | `scripts/mission-validate.mjs`, `tests/missionValidate.test.ts`, `docs/level-validator/mission-schema.md`, `docs/level-validator/example.mission.json` | ~1,060 | Opus | S0, S6 (helper, via C), S7a (rows, via B2) | `missionValidate` |
| S9 | Marlow Yard graph on `training`, measured, run saved | `docs/marlow-final/graph/ctcourse.json`, `docs/marlow-final/graph/run.txt`, `docs/marlow-final/graph/REPORT.md` | 0 (docs) | Sonnet | S0, S4, S1+S2 | validator + measure runs |
| S10 | Campus graphs: V6e-1 positions, re-measure, drift test, campus run | `docs/sector-redesign/graph/campusOps-S{1..5}.json`, `docs/level-validator/campus-run/{run.txt,V6-REPORT.md,V6-areas.md}`, `tests/levelMeasureCampus.test.ts` | ~100 | Sonnet | S1+S2, S3 | `levelMeasureCampus` |
| D-A | Docs for PR A | `docs/level-validator/graph-schema.md`, `docs/level-design.md`, `docs/level-validator/example.graph.json` (V6 fields), `changes/feature-validator-port.md` | docs | Sonnet | S0, S3 | doc lint |
| D-B | Docs for PR B | `changes/feature-validator-port-measure.md` | docs | Sonnet | S1 | doc lint |
| D-B2 | Docs for PR B2 | `docs/systems/testing-tools.md` (the measure CLI, `--points`), `changes/feature-validator-port-measure-cli.md` | docs | Sonnet | S2, S7a | doc lint |
| D-C | Docs for PR C (folds the S4, S5, S6, S7 fragments: `taught_by`, `teach`, `requires_kill`, `mark`) | `graph-schema.md`, `level-design.md`, `testing-tools.md`, `changes/feature-validator-port-train.md` | docs | Sonnet | PR C slices, D-A, D-B2 | doc lint |
| D-D | Docs for PR D | `graph-schema.md` (mission pointer), `changes/feature-validator-port-mission.md` | docs | Sonnet | S8, D-C if running | doc lint |
| I-C | Integration chore: rerun every set with `--write`, commit the pinned counts | `docs/level-validator/graph-sets.json`, saved run files | docs | Haiku | all of PR C | `levelGraphs` |
| I-D | Integration chore: add the mission example set to the manifest, rerun every set with `--write` (mission checks change the counts) | `docs/level-validator/graph-sets.json`, saved run files | docs | Haiku | S8, C's branch merged in | `levelGraphs` |

The docs slices are one at a time on `graph-schema.md`, `level-design.md` and `testing-tools.md`, in the order D-A,
D-B2, D-C, D-D, each from the previous one's head (D-A and D-B / D-B2 touch different files, so they may overlap). Code
slices write their schema text into `docs/validator-port/fragments/<slice>.md`; the docs slice folds it. D-A also writes
the A25 kinds into graph-schema "Link kinds" and the level-design 11.9 graph-kind list (master
`docs/level-design.md:306-313`; its "a `bolted` door (unlocked from the far side after a vent or a throw)" becomes
`vent_unlock` for the vent, `bolted` staying for the throw), cited to ROADMAP Decided ~18:05 and Q25.

## 3. Slice detail ("done looks like")

**S0 (Opus).** Move the shared helpers of `level-validate.mjs` (`collector`, `index`, `arcsOf`, `adjacency`, `adjOf`,
`reachable`, `edgeDisjointPaths`, `soloArcsOf`, `linkTime`, `enters` / `leaves` / `otherEnd`, `isOneWay`, `hasTag`,
`fmt`, `linkName`, the kind sets, `SPLIT_TAG`, `OVERWATCH_TAG`) to `scripts/level-graph-lib.mjs`; `level-validate.mjs`
imports and re-exports every name it exports today (tests unchanged). Add `PROFILES` (campaign / sector / training) and
read it in place of each `meta.mode` test (master `scripts/level-validate.mjs:59-61`, `:66`, `:291-293`, `:313-316`,
`:561-562`, `:663`, `:750`, `:807`, `:849`, `:860`, `:870`, `:913`); the training row turns co-op coverage off, solo
twins to INFO (A7, Q29; master `:883-899`, `:913`) and the ghost path to INFO (A10). The six new kinds of A25 join the
kind sets (master `:29-55`: `LINK_KINDS`, `COOP_KINDS`, `TWO_WAY_GATES`, `ONE_WAY_KINDS`, the `NEEDS_*` sets as their
stand-ins), `soloArcsOf` (`:225-227`) treats `vent_unlock` as a `bolted` link, and `checkDimensions` (its kit cases,
`:459-475`) prints one INFO per new kind used ("no size band yet: move not built"; `vent_unlock` reads the door rows).
`linkTime` reads `measured.path_m` / speed first (A6). `mergeGraphs` concatenates `objectives`, `rules`, `syncs` (`sync`
read as `syncs`) and keeps `mission` / `tracks` (MV `scripts/level-validate.mjs` mergeGraphs, 0c62a921).
`validate(graph, { metrics, metricsPath, requireMeasured })` runs core, then `checkMeasured`, `checkTraining`,
`checkPerfect`, `checkEngine` (stubs returning empty reports, signatures fixed here: `(graph, metrics, opts)`), then
`checkMission` (stub). `perfect.mjs` stub also exports `perfectPaths(graph, { start, targets, exfil, keep })` (S8 calls
it). `parseArgs` accepts `--require-measured` (V6 lines, master `:1190-1211`). Pre-adapt the existing fixtures to the
BRIEF's new schema so wave-2 checks do not break them: training fixtures get `meta.taught_by` and one `teach` element on
their one route (A8); check every fixture and `example.graph.json` keeps a non-loud path from `start` to each objective
and `exfil` (A10). `tests/levelProfiles.test.ts`: the PROFILES table per mode, the Q29 coverage skip, solo twin INFO on
training, the flag parse, the mission-node merge, and the A25 kinds (each counts as co-op coverage; `vent_unlock` solo
only from its `to` end; `drop_catch` one-way unless `one_way: false`; the INFO band line; on a campaign fixture, a
section whose only co-op link is a `vent_unlock` behind a `duct` (J14's A3 shape) passes "section has no co-op link").
Done: `levelValidate` and `levelProfiles` green, campus and example counts unchanged except training coverage.

**S1 (Opus).** Take `src/world/levelMeasure.ts` and `tests/levelMeasure.test.ts` whole from v6 8f551e18 (they carry the
V6 fix commits 0410023e, 2ab1fe18, c9e520ed). Re-verify against master's changed `src/ai/navGrid.ts` (`findPath` gained
`partial`), `src/world/lightField.ts` and `src/world/lightBake.ts` (section bakes) since V6's base 25a36202; tsc clean.
Add: (1) way back per campaign co-op link: the solo nav-path time from the link's `to` cells to its `from` cells at
`reach_speed_mps`, `null` + `why` when no nav path (a drop or ladder off the nav), into
`meta.measured.ways_back[]` as `{ from, to, kind, back_s, path_m }` (A5); (2) `resolvePoints(graph, nav, opts)` for
J13 in the shape of section 8, built on V6's `cellsIn` (`:420`) and `edgePoint` (`:481`), and used by `measureGraph`
for its own door points (one code path); V6's `MEASURE_DEF` and `MEASURE_TOOL` stay exported; (3) `OFF_NAV_KINDS`
(v6 `:49`) brought up to master's kinds and the six new ones of A25: `team_throw`, `team_hang`, `team_pull`,
`plank_bridge`, `chimney_pair`, `swing_pass`, `drop_catch` are off the nav grid (`null` + `why`); `shutter`,
`deadweight`, `vent_unlock` are doorways measured as doors. Hot-path rules do not apply (offline tool), but `hyp2` /
`hyp3`, no `Math.hypot`. Done: `levelMeasure` green with new cases for way back (timed and null) and for
`resolvePoints` (a declared `at`, a one-gap edge point, a two-gap edge giving `null`, link entries keyed by merged
index, `geom` equal to `measureGraph`'s).

**S2 (Sonnet).** Take `scripts/level-measure.mjs` whole from v6 8f551e18 (V6c + fix 0410023e `--check` tolerances);
write `meta.measured.ways_back` with `--write`; add `--points <out.json>` (writes `resolvePoints`' result for the
merged graphs, section 8; touches no graph file; combines with `--check`, not with `--write`); export its pure parts
(`parseArgs`, the JSON text patcher) for `tests/levelMeasureCli.test.ts` (unknown option exit 2, `--doors` values,
`--points` with and without a path, a patch that leaves the rest of the file byte-identical). No `package.json` edit
(S5 owns it): run it as `node scripts/level-measure.mjs`. Done: the CLI test green;
`node scripts/level-measure.mjs docs/level-validator/example.graph.json --map proving` exits 0, and with
`--points <tmp>.json` writes one entry per space and per merged link.

**S7a (Sonnet).** `scripts/metrics-gen.mjs:211-227`: any argument other than `--check` prints the usage and exits 2,
nothing written (A13). Scale sheet section 8 gains `nav_floor_depth_m` 1.5 (source: the nav sampler casts down to y -2,
`src/ai/navBuild.ts:32-34`; LD 12.1) and `ladder_grab_m` 4.1 (`TEAM.ladderGrab`, `src/config/movement.ts:464`; G57 4.5 not
built); the six `mission_*` rows copied from MV 0c62a921 `docs/design/scale-sheet.md`. Relay lip (A24, after #443,
merged in 4.103.3): the section 3 row (`scale-sheet.md:56`) states the derived ceiling, `TEAM.relayMax` 4.6
(`src/config/movement.ts:476`, `src/game/teamMoves.ts:64`) + `HANG.drop` 1.9 (`src/world/anchors.ts:219`) = 6.5 m,
and keeps the band's number 4.3 - 4.6 until Michael answers (STATE open question); on his yes the row becomes
4.3 - 6.5 and `metrics.json` is regenerated in the same change. The new rows' approval is the folded plan's J12 row
(A12); the relay number is not. Regenerate `metrics.json`. No `kit` block (A12). S7a rides PR B2; PRs C and D get its
rows by merging B2's branch (C) and C's branch (D). Done:
`metricsGen` green with a `--help` / `--chek` case (exit 2, file untouched), the new keys, and a relay pin
(`sizes.hang_lip[1]` <= `TEAM.relayMax` + `HANG.drop`, both imported from the code); in the same test file a case runs
`validate()` (master `scripts/level-validate.mjs`; S0 keeps its signature) on a one-link fixture with the
band from `metrics.json`: a `team_hang` lip at the band's top passes, 0.1 m above it ERRs (true for either answer).

**S3 (Opus).** `measured.mjs` = V6's `checkMeasured` (v6 8f551e18 `scripts/level-validate.mjs:977-1075`) with: shadow
share and its drift INFO (A4, V1); the presence gate of A5 (V2): encounter spaces, splits (`a_s`, `b_s`, `reach_s`;
legs against `split_max_s` and `split_parity_pct`), campaign way backs (`meta.measured.ways_back`, one per co-op link),
`null` WARN plus the declared check; drift tolerances stay tooling constants (as V6; not level numbers). Port V6's
`checkMeasured` cases from v6 `tests/levelValidate.test.ts` into `tests/levelMeasured.test.ts` and add V1 / V2 cases.
Done: green; campus graphs as on master print "pending V6" INFO only (no `measured` yet).

**S6 (Opus).** `perfect.mjs` per A10 / A11, with `perfectPaths` as fixed by S0; `requires_kill` must be a bool (ERR),
`mark` any value. `tests/noForcedKill.test.ts` (T H4): every `SectorObjective.kind` across `MAPS`' sector defs is
non-lethal (`hack`, `grab`, `download`, `src/game/sectors.ts:20`) and no Marlow `CourseObjective.done` flag is set
only by a guard's death (trace each flag's setter; list them in the test). Done: both green; example and campus counts
unchanged (they have non-loud paths); a campaign fixture with a loud-only objective ERRs, the same graph on `training`
prints INFO; a `requires_kill`-only objective ERRs on every mode, `training` included; a `mark` on a campaign fixture
ERRs, on a training fixture is an INFO count.

**S4 (Opus).** `training.mjs` per A8 / A9: `meta.taught_by` (ERR missing or not in `meta.sections` on `training`; ERR
present on another mode), `teach` (link string field or `teach:<move>` space tag), the route count of A26 as an exported
`sectionRoutes(graph, section)` returning `{ count, paths }` (paths as space-id lists, split legs merged per A23, count
capped at 10; ~60 lines, a depth-first walk over the section's steps, not `edgeDisjointPaths`), the choke test (every
entry-to-exit path passes the element: remove it and the exit is unreachable), `split:` tags before `taught_by`, late
side routes with the campaign route rules. How S4 runs those rules, not copying them: it imports `checkEncounters` from
`scripts/level-validate.mjs` (a function-declaration import cycle with `validate()` is safe in ESM: neither module
calls the other at load) and runs it on a one-section subgraph (`meta` with `mode: "campaign"` and `sections: [sec]`,
the section's spaces, its interior links), keeping only the route-rule lines (the approach count, the approach kinds,
"no <kind> approach", "routes never cross"); the "two routes" rule is `sectionRoutes` >= 2 (A9), not
`checkRedundancy`. S4 adds no export to `level-validate.mjs`; a test runs the subgraph call on a fixture that breaks
each kept rule, so a reworded core message fails S4's test instead of passing silently. Test cases, one per A26 shape:
two `opening`s and a boost plus a human ladder between the same two spaces: 1 route; a boost up and a drop back
between two spaces, and J14's A1 shape (boost up, drop on into the yard, one-way door from the yard back to the
apron): 1 route; single entry and exit airlock doors around a two-way loop inside (v7 A2 shape): 2 routes, ERR before
`taught_by`; a loop off one space that comes back to it (v7 A6 objective loop): 1 route; J14's A8 shape after
`taught_by`: 2 routes, ERR without a guarded encounter space, the campaign route rules with one. Cases for A23: a late
section whose only second way is a split, no guard: no ERR; a late section with a split plus a real side route and no
guard: ERR; the same with a guarded encounter space: the campaign route rules run. Done: green; the v7 ctcourse graph
run in a temp copy with `mode: training` and `taught_by: "A7"` shows side-route ERRs in A1 (2 routes), A2 (2), A3
(3), A4 (3, split `a4` merged), A5 (2) and the `split:` ERRs for splits `a4` and `a7`; A6, A7 and A8 count 1 route
each and get no side-route ERR (A6's four floor-to-gallery links are one step and its objective loop returns to the
floor; A7's and A8's splits are one node each). J14's graph (origin/feature/marlow-replan 2ede492b4, its own
`taught_by: "A6"`) in a temp copy: no side-route ERR in A1-A7, A8 counted 2 routes so A9 runs on it. Both expectations
are A26's hand count.

**S7b (Sonnet).** `engine.mjs` per A12, reading `rules.nav_floor_depth_m` and `rules.ladder_grab_m` through
`collector.num` (a missing key: one WARN, check skipped). Done: green; v7 ctcourse's three `human_ladder` links are
judged against 4.1.

**S5 (Sonnet).** `graph-sets.json`: `[{ "name", "files": [...], "flags": [...], "errors", "warns", "run": "<path>" }]`
for the example, campus S1-S5 (files in order), Marlow Yard. `scripts/level-graphs.mjs`: imports `validate` and
`mergeGraphs`, prints one line per set, exit 1 on a count differing from the manifest, `--write` rewrites each `run`
file (the CLI's exact text) and the counts. `package.json`: `"level-measure": "node scripts/level-measure.mjs"`,
`"validate:levels": "node scripts/level-graphs.mjs"`. `tests/levelGraphs.test.ts`: per set, counts equal the manifest
and the saved run's last line says the same counts. Done: green against the counts at its base (I-C rewrites them at
the end of PR C).

**S8 (Opus, joint).** Re-cut MV 0c62a921's `scripts/mission-validate.mjs` (539 lines) onto the lib (import from
`level-graph-lib.mjs`, not `level-validate.mjs`); ghost / pacifist runs call `perfectPaths` with the mission's primary
objectives (no duplicate path code); drop `oneChance` / `window` from `RULE_KINDS` (A19); keep a mission node on a
`training` map an ERR (L3); add a direct ERR for a `rules` node on a `training` map citing Q5 (A19), whatever J22
decides. It uses the `mission_*` rows from S7a (in D's branch through C's, which merged B2's).
`tests/missionValidate.test.ts` (540 lines) re-cut the same way, plus the Q5 case (a training graph with `rules` and no
mission: one Q5 ERR); `mission-schema.md` and `example.mission.json` from MV with the kind list fixed. Campaign Build
reads the schema and kind lists before the checker (A20). Done: green; `node scripts/level-validate.mjs` on the example
map + mission gives MV's 0 / 0.

**S9 (Sonnet).** v7's `ctcourse.json` onto master at `docs/marlow-final/graph/` with `mode: "training"`,
`meta.taught_by` and `teach` elements from SPEC per-set "teach" lines as built (A16; each cites its SPEC line in
`note`), `requires_kill` none. Run `node scripts/level-measure.mjs docs/marlow-final/graph/ctcourse.json --write`, then
the validator with and without `--require-measured`; save `run.txt`; `REPORT.md` = v7's REPORT rebased: the training
result, each ERR mapped to the J14 row that fixes it (M H6). Done: files committed; counts handed to I-C.

**S10 (Sonnet).** Re-apply V6e-1's `area`, `vantage.at` and link `at` to master's five campus graphs (diff
25a36202..8f551e18 on those files, positions only; drop V6's stored `measured`); run
`node scripts/level-measure.mjs docs/sector-redesign/graph/campusOps-S{1..5}.json --write` on master; take
`tests/levelMeasureCampus.test.ts` and `campus-run/V6-areas.md` from v6; rerun the validator, save `run.txt`;
refresh `V6-REPORT.md` (header: shadow share is INFO per G329; Sector Ops L13). Done: drift test green (~3 min,
600 s timeouts, as V6); counts handed to I-C.

## 4. Carrying V6's 20 commits over (A1)

No merge, cherry-pick or rebase of the stale branches. New files are taken whole with
`git show origin/feature/level-validator-v6:<path> > <path>` and then fixed for master; changed files are re-applied by
hand onto master's version.

| V6 commit | What | Goes to |
| --- | --- | --- |
| ed695881, 2a7c10a3 | WIP saves | nothing (superseded by their finished commits) |
| 3271ab1d | V6a schema additions (`area`, `vantage.at`, link `at`, `measured`) | D-A (graph-schema "Schema additions"), D-A example graph |
| fbf18eb7 | V6d `checkMeasured`, `--require-measured` | S3 (check), S0 (flag, `validate` option, `linkTime`) |
| 9dda0917 | V6b measurement core | S1 |
| 44ad33e5 | V6c CLI, greybox exit text | S2 (CLI), S5 (`package.json`), D-B2 (testing-tools), D-A (LD 14 / 15) |
| a1bc1e57 | V6e-1 campus areas, vantage points, link openings | S10 |
| 425c4e20 | V6e-2 campus run, drift test, V6 report | S10 |
| 0410023e | fix: target ERRs on encounters only, reach re-times `path_m`, untimed drop / ladder, `--check` tolerances | S3, S0 (`linkTime`), S1, S2 |
| 2ab1fe18 | fix: guard band docs, tolerances, bake time, drop / ladder null | guard band text already on master (#346); rest S1, S2 |
| c9e520ed | fix: a drop / ladder timed only through its own nav link kind | S1 |
| 8f551e18 | campus re-measure, report counts, changelog | S10 (re-measured on master), D-A / D-B / D-B2 fragments |
| 9f6f75de, 4d662953, 2ad8c1e5, ed619326, f71c5bdc, 220596bc | merges | nothing |
| ca040c57, 4ccb6aea | stale STATE lines | nothing (this STATE replaces them, V11) |

V7 97873079 (the graph and its REPORT) goes to S9. MV's commits: `mission-validate.mjs`, schema, example, tests to S8;
mission-node merge to S0; `mark` and `requires_kill` to S6; `mission_*` rows to S7a; its training profile and VAL-DIMS
`kit` block are dropped (A12, A19).

## 5. Waves (full burn)

- **Wave 1, now (4 agents):** S0 (Opus, from `feature/validator-port`); S1 (Opus, from origin/master, into
  `feature/validator-port-measure`); S2 (Sonnet, from S1's slice branch once S1 has pushed its first sub-step, the
  whole-file take of V6's `levelMeasure.ts`; it codes `--points` against the `resolvePoints` signature fixed in
  section 8 and merges S1's branch again before its last test run; into `feature/validator-port-measure-cli` once that
  is cut from B's head); S7a (Sonnet, from origin/master on its own branch; into the B2 branch).
- **Wave 2, when S0 is merged into `feature/validator-port` (6 agents):** S3 (Opus) into A. The lead cuts
  `feature/validator-port-train` and `feature/validator-port-mission` from A's head; S4, S6 (Opus) and S7b, S5 (Sonnet)
  go into C's branch, S8 (Opus) into D's. S7b merges once B2's branch (S7a) is merged into C's; S8 merges once C's
  branch (S6's `perfectPaths`) is merged into D's.
- **Wave 3, when B's and B2's branches hold S1, S2 and are merged into C's:** S9 (also needs S4), S10 (also S3, via
  A's branch) (Sonnet).
- **Docs:** D-A after S3; D-B after S1; D-B2 after S2 + S7a; D-C after wave 3; D-D after S8; I-C last on C; I-D last
  on D.
- Opus briefs wave 2 while wave 1 runs (plans and briefs only). Builders that are tsc / vitest only may go to cloud
  builders (`cloud-queue`): S7a, S7b, S5 qualify; S1, S2, S9, S10 need the build and light bake (desktop).

## 6. Checks and gates

- **Every slice:** `npm run typecheck:fast` and `npx vitest run <its test files>` plus `tests/levelValidate.test.ts`
  for any slice that changes what `validate()` reports. Never a full `npm run check`. A wave-2 slice that breaks an
  existing `levelValidate` case stops and reports it; S0's Opus fixes the fixture on `feature/validator-port`.
- **e2e:** none needed for PRs A, B2, C, D (scripts, tests and docs). PR B adds `src/world/levelMeasure.ts`, so its head
  runs the `src/world/` affected-e2e group by itself (e2e-lightbake, e2e-guard-carry, e2e-levels, e2e-anchors,
  e2e-ctcourse); it must be green. No code in the game imports the file.
- **Validator evidence on each PR:** `npm run validate:levels` exits 0 (PR C onward);
  `node scripts/level-validate.mjs --require-measured docs/sector-redesign/graph/campusOps-S{1..5}.json` runs and its
  ERRs are only target misses of the as-built campus (PR C).
- **Checker gate:** one fresh Opus checker per PR on its head (J12 gate), posting the `checker` status. It checks intent
  against BRIEF (no Michael-only rule loosened; Q24 / Q29 applied as A7-A9 say), the claims, the counts, the carried
  V6 commits (section 4), and reruns the slice tests. PR D: the Opus checker plus Campaign Build's read of the mission
  schema and kind lists (A20). At most one fix round per slice (Opus).
- **Finish:** PR body with the changelog fragment; the last PR (D, which opens after C merges) carries
  `Job-done: validator-port`.

## 7. Seams

- **Campaign Build (J7, J8, J22, J23):** the mission contract (A20); `oneChance` / `window` leave the engine in J7;
  Tallow's graph joins `graph-sets.json` when #372 merges (its 6 structure ERRs on master go away with PR D); J23's
  greybox exit uses `level-measure --write` + `--require-measured` + the way backs (A5).
- **Sector Ops (J10, J17):** J10 fills scale sheet 9 (lux bands); its band check plugs into `measured.mjs` and
  `levelMeasure.ts` (a measured lux per space) as a later slice, M V5. J17's v2 campus graphs replace S10's files: they
  carry `area` (and `at` where a shared edge has 2+ gaps) and update `graph-sets.json` counts.
- **Marlow J14:** the Marlow Yard re-plan rewrites `ctcourse.json` with its own `taught_by` / `teach` and fixes the map
  until the training profile passes; S9's REPORT maps each ERR to a J14 row. Q24 / Q29 checks are built here (A21).
  Once PR A is on master, J14's graph swaps its stand-in kinds and `move` fields for the A25 kinds and its A3 `bolted`
  door for a `vent_unlock` (its "section A3 has no co-op link" ERR then clears).
- **Level standard #443** (`feature/level-standard-g157`, merged in 4.103.3): it rewrote the LD training profile
  (master `docs/level-design.md:39-60`), the 3.2 / 11.2 Training lines (`:95-97`, `:275-277`) and the rule index
  (`:697-745`), which D-A / D-C also touch. Both are cut after it (it is on master), and A22 is trimmed to what #443
  left. Its relay row hand-over is A24 (S7a); its "check later" rows are BRIEF Out of scope.
- **Orchestrator J1 / J2:** J1 fixes LD 13's Marlow folder line; J2 gives Q24 / Q29 G numbers. D-A / D-C touch LD
  11.9 (its tag and graph kinds), 14 (3) item (1), the 15 measured line and the rule index only.

## 8. What J13 route-runs needs from this port

- **Positions on every route space and link.** V6 needs `area` only on encounter and split-leg spaces; a route-run
  walks every declared route, so it needs `area` on every space a route passes and a link `at` (or a single-gap shared
  edge between the two areas). Marlow Yard (S9: all 55 spaces and 85 links already have them) and the campus (S10: all
  101 spaces have `area`; `at` pinned where an edge has 2+ gaps) meet this. Tallow's graph has `area` on every space
  (Campaign's CMG row).
- **One point resolver both tools use** (J13's row, route-runs-2 `docs/route-runs/PLAN.md:204`; J12 ships both
  forms). S1 exports `resolvePoints(graph, nav, opts)` from `src/world/levelMeasure.ts`; S2 adds
  `node scripts/level-measure.mjs <graphs...> --points <out.json>`, which writes the same result. Shape: per space
  `{ id, section, storey, floorY, boxes, centre, cells }`; per merged link index `{ from, to, kind, route, at, atFrom,
  gaps, measured }`; plus `geom`. `at` is the declared link `at` (`atFrom: "declared"`), else the shared-edge point
  V6's `edgePoint(nav, a, b, ya, yb, ca, cb)` finds when the two `area`s share one gap (`atFrom: "edge"`, v6
  `levelMeasure.ts:481`), else `null` (`atFrom: "none"`; `gaps` says 0 or 2+). `measureGraph` takes its door points
  from the same code, so the robots and the measured times use the same points. J13's R6 calls `resolvePoints` through
  Vite's SSR loader (the `level-measure.mjs` pattern).
- **Links keyed by merged index, no `id`.** A link is named by its index in `mergeGraphs(...).links` (J13 already keys
  them so). No link `id` field is added.
- **V6 fields on every profile** (J13 item (1)): the schema accepts `area`, `vantage.at`, link `at`, `measured` and
  `meta.measured.geom` on `campaign`, `sector` and `training` alike; D-A states it in graph-schema "Schema additions"
  and S0 keeps no mode test on them.
- **Expected times:** each link's `measured.time_s` / `path_m` and `meta.measured.geom` (refuse a stale graph before a
  run).
- **Graph helpers:** `scripts/level-validate.mjs` keeps exporting `mergeGraphs`, `COOP_KINDS`, `LINK_KINDS`, `isOneWay`
  (J13 item (2); S0 re-exports them from the lib), so the harness never copies graph code.
- **Side routes counted one way (A26).** J13 counts a training section's routes as J12 does (J13 BRIEF :56 "as J12
  counts them"; its PLAN :72 "2+ routes"): it imports `sectionRoutes(graph, section)` from
  `scripts/level-checks/training.mjs` (S4) and has no count of its own, so a late section the validator calls a side
  route section is the one the harness covers. J12 does not edit route-runs files; the lead tells J13.

## 9. Risks

- Master's light bake changed since V6 (section bakes, canonical bake): campus numbers move; S10 re-measures, nothing
  is copied.
- The campus drift test takes ~3 min; it keeps V6's 600 s timeouts. If CI time becomes a problem, the lead moves it
  behind an env switch and the laptop runs it (question for the Test Runner, not assumed).
- PR A (~1,390) and PR C (~1,400) sit nearest the 1.5k cap: named fallbacks in section 1. PR B is already split (B2).
- Marlow Yard's graph will fail the training profile hard (side routes in A1-A5, A26; splits before
  `taught_by`; A8 pacing); that is the intent (H6) and J14's work list, not a validator bug.
