# validator-port - brief

Owner: Marlow Build. Status: current.

Job J12 of the signed-off folded plan (`docs/orchestrator/FOLDED-PLAN.md` section 4 on origin/feature/menu; ROADMAP
Now row 14). Lead: Night Shift | Marlow Build. Branch `feature/validator-port` in
`C:/NightShift/Mobile-Coop-validator-port`, cut from origin/master 2148ec96 (4.103.0). Plan: `PLAN.md`; live state:
`STATE.md` (the one live validator STATE, Marlow conformance V11).

## The ask
One level validator on master that can pass a map at greybox exit, built by porting the three stale validator branches
onto master's mode-profile validator (#407) instead of merging them. Covers FOLDED-PLAN breaks 24 and 25 and
conformance rows M H6, H7, V1, V2, V4, V6, V10, V11, V12 and T H4 (`docs/conformance-marlow/CONFORMANCE.md`,
`docs/conformance-test-runner/CONFORMANCE.md:65`); the validator half of M V7 and V8 (their map half stays in J14).

In scope:
1. V6 measurement on master: `src/world/levelMeasure.ts`, `scripts/level-measure.mjs`, `--require-measured`
   (`feature/level-validator-v6` 8f551e18, 20 commits, no PR). Shadow share is INFO, never ERR (G329, V1). Under
   `--require-measured` every declared split leg and every campaign way back with no measured time is an ERR (V2).
2. The mission-validator re-cut (`feature/mission-validator` 0c62a921) onto the ported validator, jointly with
   Campaign Build: ghost, no-kill and marker checks (VISION 4 rules 3-5).
3. The Marlow Yard graph (`feature/level-validator-v7` 97873079 `docs/marlow-final/graph/ctcourse.json`) on the
   `training` profile, run output saved with the map docs (H6). The training profile follows Q29 and Q24 (below).
4. Engine-fact WARNs from the scale sheet, no constants in the script (V10); metrics-gen rejects unknown flags (V12).
5. The validator in CI: `npm run validate:levels` plus a vitest pinning the counts of every committed graph set (V6).
6. One live STATE (V11): `docs/validator-port/STATE.md`.

Out of scope (owner): the route-run pass rule and harness (J13, Q7); the lux band check (J10 fills scale sheet 9,
then plugs into the measured checks, M V5); Marlow Yard map fixes and its re-plan (J14); the campus v2 graphs and the
Sector Ops player-count WARN (J17, M V9); Tallow Wharf's graph fixes (J8); the old warehouse map (frozen, Q26).
Later validator checks, not J12 (owner Marlow Build; the orchestrator puts them on the ROADMAP as a later validator
job): the rule-index rows #443 marks "check later" (master `docs/level-design.md:706-744`): 3.1 room for two, 3.10
exit run time, 6.2 minute targets, 11.11 teamwork counts, 16.2.7 two staircases per multi-storey building; the 15
two-player tests are e2e and playtest (map jobs). A training WARN for a set over `SET_GUARDS_MAX` 3 (Q11) is also
later: the cap is enforced in code (`src/world/maps/ctcourseSets/types.ts:191`, `:465`), and a graph check needs a new
scale-sheet row (Michael's approval).

## Michael said (verbatim, binding)
- 2026-10-24 ~22:45 (G292): "Marlow is a training course and may have different rules to standard mission, ie its
  heavily guided and must teach the players the basics of coop gameplay. All campaign missions are strictly coop and
  cannot be completed solo, must have forced coop traversal to proceed [...]. Marlow should be very linear, 1 route
  (until later sections where it teaches multiple objectives/split paths for players to help each other)".
- 2026-10-24 ~22:00 (G289 (3)): "I would prefer having as many guards as realistically possible to make it
  challenging."
- G363 (2026-10-25): "After every move taught" (Marlow's later sections come after every co-op kit move is taught).
- 2026-10-25 ~16:40, folded plan Q5: "all are retries in marlow yard, as its a training exercise."
- 2026-10-25 ~16:40, Q6: "coop lobby. Marlow Yard is mission 1, which is training"; asked if Tallow becomes Mission 2:
  "Tallow stays Mission 1".
- 2026-10-25 ~16:50, Q11: "Only the logical amount required to test the specific movement/game mechanic required.
  Doesn't necessarily always need a guard."
- 2026-10-25 ~16:50, Q24: "Close all side routes, force all sections. Only keep a side route when training against
  enemies later in the training, same design rules as a campaign mission area".
- 2026-10-25 ~16:50, Q25: "Wherever they slot into the training yard logically".
- 2026-10-25 ~16:50, Q29: "marlow yard in particular is an isolated training level which forces training of each
  individual coop move and coop gameplay, and does not need the same checks".

## Michael picked (option text, native multiple choice)
- 2026-10-24 ~22:00 (G289 (2)): "Yes, require it" (a measured validator pass at greybox exit).
- 2026-10-25 ~09:05 (G329): "Real-world levels" (the 40-60% shadow share yields to the real-world light band).
- 2026-10-25 ~09:05 (G330): "Bot route-runs + your walk".
- 2026-10-25 ~16:40, Q2: "Never" ("every light works; darkness only from cover, cut circuits and shot lamps").
- 2026-10-25 ~16:40, Q3: "Australian standards (Recommended)".
- 2026-10-25 ~16:40, Q7: "Never stuck (Recommended)" ("Pass = it never gets stuck; the times it was seen go on your walk
  card"). J13's rule; this job supplies the positions it walks (PLAN section 8).
- 2026-10-25 ~16:50, Q26: "Freeze it" (no more work on `warehouseOps`).
- 2026-10-25 ~18:05 (ROADMAP Decided, mission sign-off pages), co-op kit: "Deadweight,Drop Catch,Chimney Pair,Swing
  Pass"; Plank Bridge: "Add it" (all five join the kit; graph kinds A25).
- 2026-10-25 ~20:20 (via the orchestrator), relay lip band (A24): "Keep 4.6 m (Recommended)" (the sheet's top stays
  4.6 m; the 6.5 m derivation is written into the row as the physical ceiling only).
- 2026-10-25 ~20:45 (via the orchestrator and Campaign Build; `docs/tallow-fixes/BRIEF.md` M2 on
  origin/feature/mission-engine 6df8f334f), Tallow Wharf's forced throws: "Mix of both" (plank bridges and a longer
  throw, 5.8 m over 4.9 m gaps, at spots Campaign Build picks; A27).

## Recorded decisions this job follows
G2 (campaign two players), G57 (human ladder 4.5 m, decided, not built: code 4.1), G127 (no mission forces a kill),
G146 (perfect = no kills, no alarms, every primary objective), G285 (b) (every number from the metrics generated from
the scale sheet, none in the script) and (d) (declared targets measured in greybox, a miss fails), G290 / G339 (no
markers in the campaign and Sector Ops; Marlow keeps its guidance marks), G334 (soft windows only outside Marlow).
Authority order: `CLAUDE.md` on origin/master; Michael's answers above win over FOLDED-PLAN where they differ.

## Assumed decisions (logged; each says how to undo it)
- **A1 Port, not merge.** V6, V7 and mission-validator are re-applied by hand onto master's mode-profile validator,
  new files taken whole from their branch tips and fixed for master's APIs (PLAN section 4). The stale branches stay
  on origin, unmerged; STATE marks them superseded once the port lands. Undo: merge the branch by hand (it conflicts
  in level-design.md, graph-schema.md, level-validate.mjs and levelValidate.test.ts).
- **A2 Check modules.** Shared graph helpers move from `scripts/level-validate.mjs` to `scripts/level-graph-lib.mjs`;
  new checks live in `scripts/level-checks/{measured,training,perfect,engine}.mjs`, so slices run in parallel without
  sharing a file. `level-validate.mjs` stays the CLI and keeps every current export (tests unchanged). Undo: move the
  modules back inline (pure move).
- **A3 One profile table.** A `PROFILES` object in the lib (per mode: route rules, coverage, solo-twin severity, gate
  reach, no softlock, alive ceiling, drills, marks, ghost-path severity) replaces the scattered `meta.mode` tests.
  Undo: inline the tests.
- **A4 Shadow share is INFO everywhere (V1, G329).** A measured `shadow_pct` outside 0.4-0.6 and its drift from the
  declared value print INFO. Measured vantage, LOS break, split legs and reach keep ERR on a miss (G285 (d)). Undo:
  one severity in `measured.mjs`.
- **A5 The presence gate (V2).** Under `--require-measured`: ERR an encounter space with no `measured` (as V6); ERR a
  declared split with no `meta.measured.splits.<id>` holding `a_s`, `b_s` and `reach_s`; ERR a measured leg over
  `split_max_s` or legs apart by more than `split_parity_pct`; ERR a campaign co-op link with no measured way back
  (`meta.measured.ways_back`). A `null` reach or way back (only moves the nav grid does not model) is a WARN to justify
  in the design doc, and the declared time is then checked as today (ERR over `reach_max_s`). Undo: make null an ERR
  (lead answer L2).
- **A6 Measured times feed the time checks.** Split legs, partner reach and gate reach use a link's `measured.path_m` /
  speed when present, else `time_s`, else `length` / speed (V6 used `measured.time_s` and re-timed for reach; same
  numbers). Undo: drop the measured branch in `linkTime`.
- **A7 Training profile, Q29.** On `training` maps the co-op coverage check (half of the encounter spaces, every
  section) does not run and a solo twin is INFO (WARN today). Already off on master and kept off: route counts, routes
  cross, two routes per section, gate reach, no softlock, forced gate. Still run: structure, dimensions, reach from
  start, spine, dead ends, vantage, LOS break, splits with overwatch / assist / partner reach, pacing, `drill_s`, guard
  bands as INFO (a set may have no guard, Q11). Undo: the training row of `PROFILES`.
- **A8 Training checks, Q24 + G292 + G363 (validator half of V8).** New `meta.taught_by`: the section in which the last
  co-op kit move is taught on its own (ERR missing on a `training` map). New `teach`: a link field `teach: "<move>"` or
  a space tag `teach:<move>`, free text from the map's teach list, so moves with no link kind (jam relay, console loop,
  synced takedown, V7) count. In every section up to and including `taught_by`: ERR 2+ routes (a side route; routes
  counted on the section's interior as A26 says, split legs merged as A23 says), ERR a `split:` tag, ERR no `teach`
  element, ERR a `teach` element
  that some entry-to-exit path avoids (the section is not forced). Undo: WARN instead of ERR, or drop the module from
  `validate()`.
- **A9 Late Marlow sections, Q24.** After `taught_by`, a section with 2+ routes (counted as A26 says) must hold a
  guarded encounter space (a side route only "when training against enemies"), else ERR; such a section runs the
  campaign route rules on itself (three approaches of two kinds with shadow / high / loud on its guarded spaces, routes
  cross, two routes) as ERR ("same design rules as a campaign mission area"). Its "two routes" is the A26 count (2+),
  not `checkRedundancy`'s entry-to-exit link-disjoint count, which the section's single airlock doors would hold at 1.
  Splits are allowed there (G292). Undo: WARN, or only routes cross (lead answer L1).
- **A23 A split's two legs are one route (lead decision 2026-10-25, plan-check fix round 1).** Before A8 / A9 count a
  section's routes (A26), every space tagged `split:<id>:a` or `split:<id>:b` is merged into one node per split `<id>`,
  so a declared split is one route, not a side route. A late section whose only second way is a split needs no guard and
  gets no campaign route rules (G292: "until later sections where it teaches multiple objectives/split paths"; Q11:
  "Doesn't necessarily always need a guard"); a split plus a real side route counts 2 routes and A9 applies. Before
  `taught_by` the split is still an ERR by its tag (A8). Undo: count the legs as two routes (drop the merge in
  `training.mjs`).
- **A10 Perfect-run and marker checks on every map (VISION 4 rules 3-5).** New link field `requires_kill` (bool). The
  ghost path (no `loud` link, no `requires_kill` link) from `start` to every `objective` space and on to `exfil` (Sector
  Ops, which needs no exfil: to the last section's `exit`): ERR when missing on `campaign` and `sector`, INFO on
  `training` (lead decision 2026-10-25, plan-check fix round 1: Q5 "all are retries"; Q29 "does not need the same
  checks"; and Q24 forces every section onto one route, so a forced section through a `loud` link could not be fixed).
  The no-kill path (no `requires_kill` link) stays ERR in every mode, `training` included (VISION 4 rule 4, G127).
  `mark` on a space or link: ERR on `campaign` and `sector`, INFO count on `training`. A mission graph runs the same
  paths over the mission's primary objectives (mission-validate reuses the helper). Undo: the ghost row of `PROFILES`
  back to ERR, or drop `perfect.mjs` from `validate()`.
- **A11 Ghost = no loud link.** G146's "no alarms" has no graph field; the loud route (force, LD 3.2) is the nearest
  fact. Undo: a `raises_alarm` link field read instead of `route: loud`.
- **A12 Engine facts from the sheet (V10).** One new scale-sheet section 8 row: `nav_floor_depth_m` 1.5 (written as a
  positive depth, since the sheet parser reads a leading `-` as a range). WARN a space below storey -1.5 m that is an
  encounter space or has guards (off the guards' nav grid, LD 12.1). Mission-validator's hand-kept `kit` block in
  metrics.json is dropped: master's `checkDimensions` already reads the kit bands from sheet section 3. Approval: the
  sheet changes only with Michael's approval (`docs/design/scale-sheet.md:2`); this row and MV's `mission_*` rows (S7a)
  are the signed-off folded plan's J12 row ("engine-fact WARNs", "mission-validator re-cut"; FOLDED-PLAN line 172,
  V10), which he approved. The relay number (A24) is not covered by it. Seam with J24 coop-kit (lead decisions
  2026-10-25, plan-check fix round 2, adopting coop-kit's side; PLAN section 7):
  - Rope links go both ways (G293 "rope brace / descent"; coop-kit A1 builds the rappel and rewrites sheet row 57 to
    "climb up or rappel down"). J12 has no up-only rope check: a `team_rope` whose `to` storey is below its `from` is
    valid, and master's `rope_span` band check (`checkDimensions`, both ways) stays as it is. MV's VAL-DIMS rope ERR is
    not carried.
  - No human-ladder row of J12's own. A `human_ladder` lip is judged by master's `checkDimensions` against the sheet's
    "Co-op lip" row (`sizes.coop_lip` 4.3 - 4.5, sheet section 3), whose top is `TEAM.boostMax` 4.5
    (`src/config/movement.ts:459`): the one band coop-kit keeps (its A2: the shoulder stand reaches a grip at most
    `TEAM.boostMax` over the base's floor; its B1 deletes `TEAM.ladderGrab`, which nothing on master reads, and closes
    LD open item 1). No J12 row, check or test reads `TEAM.ladderGrab`.
  Undo: delete the row and the module (the rope and ladder lines: restore the up-only ERR and a `ladder_grab_m` row,
  against G293 and coop-kit A2).
- **A24 Relay lip ceiling derived, number left to Michael (#443 hand-over, lead decision 2026-10-25, plan-check fix
  round 1).** #443 (merged in 4.103.3) left the sheet's Relay lip row (`docs/design/scale-sheet.md:56`, `sizes.hang_lip`
  4.3 - 4.6, read by `scripts/metrics-gen.mjs:109`) for J12 to derive. `TEAM.relayMax` 4.6
  (`src/config/movement.ts:476`) caps the hanger's root over the climber's floor (`src/game/teamMoves.ts:64`); a ledge
  hanger's root is `HANG.drop` 1.9 under the lip (`src/world/anchors.ts:219`, `hangPoint` `:640`, at the 1.75 m gameplay
  height of `src/player/attach.ts:299`, so no scaling). Derived lip ceiling = 4.6 + 1.9 = 6.5 m. S7a writes this
  derivation into the row and pins it with a test (the band's top never above `relayMax` + `HANG.drop`); the band's
  number stays 4.6: Michael picked "Keep 4.6 m (Recommended)" (~20:20, "Michael picked" above).
  `checkDimensions` keeps ERRing a `team_hang` lip above 4.6 (`scripts/level-validate.mjs:461-467`). Undo:
  drop the derivation text and the pin test.
- **A13 metrics-gen flags (V12).** Any argument other than `--check` (including `--help`) prints the usage and exits 2,
  writing nothing, as level-validate does. Undo: one `if`.
- **A14 Validator in CI (V6).** `docs/level-validator/graph-sets.json` lists every committed graph set (files, flags,
  expected error and warning counts, saved run path): the worked example, the campus S1-S5, Marlow Yard, and, when
  they reach master, the mission example (PR D) and Tallow Wharf (#372). `npm run validate:levels`
  (`scripts/level-graphs.mjs`) runs them and exits 1 when a count differs; `--write` rewrites the saved runs and counts.
  `tests/levelGraphs.test.ts` pins the same counts, so CI runs it through `npm test` (no workflow change). The frozen
  `warehouseOps` has no graph and is not listed (Q26). Undo: delete the manifest, script and test.
- **A15 Saved runs live with each map.** Campus: `docs/level-validator/campus-run/run.txt` (its current home). Marlow
  Yard: `docs/marlow-final/graph/run.txt` and `REPORT.md` (the map folder; LD 13's folder line is J1's fix). The
  examples keep counts only. Undo: move the paths in the manifest.
- **A16 Marlow graph as built.** v7's `ctcourse.json` (55 spaces, 85 links, `area` and `at` on all) moves onto master
  with `mode: training`, `taught_by` and `teach` elements as built (SPEC per-set "teach" lines), and is measured with
  `level-measure --write`. Its ERRs are J14's map fixes. J14 re-plans Marlow Yard (M13), so this graph is "as built
  4.103" and will be rewritten. Undo: drop the set from the manifest.
- **A17 Campus graphs carry V6's positions.** V6e-1's `area`, `vantage.at` and link `at` are re-applied to master's v1
  campus graphs (unchanged on master since V6's base) and re-measured on master (the light bake changed since V6, so
  the `geom` hashes change). The measure tool then runs on a second map and the campus drift test has data. J17's v2
  graphs replace these files and must carry `area`. Undo: revert the five graph files and drop the drift test.
- **A18 `levelMeasure.ts` stays in `src/world/`** (as V6; J13 imports it). The game never imports it, so no flag. It
  triggers the `src/world/` affected-e2e group on PR B by itself; that group must be green. Undo: move it to
  `tests/helpers/` and repoint the CLI.
- **A19 Mission re-cut contents.** Taken from 0c62a921: `mission-validate.mjs`, `mission-schema.md`,
  `example.mission.json`, `missionValidate.test.ts`, the mission-node merge, the `mission_*` sheet rows. Dropped: its
  training-profile and kit changes (superseded by A7-A9, A12). `RULE_KINDS` loses `oneChance` and `window` (G334; J7
  drops them from the engine). A mission node on a `training` map stays ERR (Marlow keeps its course objectives) until
  J22 settles how Marlow Yard joins the campaign list (Q6). A `rules` node on a `training` map is an ERR whatever J22
  decides, because of Q5 ("all are retries in marlow yard"): strict rules have no place there. Today that only follows
  from MV's mission checks (`mission-validate.mjs:156-157` no mission on training, `:247-248` no rules without a
  mission); S8 adds a direct ERR citing Q5 and pins it with a test. Undo: restore the kinds; lead answer L3.
- **A20 Seam with Campaign Build.** Marlow Build builds the re-cut and owns `level-validate.mjs`, the lib, the check
  modules and `mission-validate.mjs` code; Campaign Build owns the mission contract (`mission-schema.md` fields and the
  step / rule / sync kind lists, which mirror its engine types) and reviews PR D. Interface: `checkMission(graph,
  metrics)` called from `validate()` on the merged `mission`, `objectives`, `rules` and `syncs` nodes. When the engine
  is on master, Campaign adds a vitest pinning the kind lists to its types. Undo: hand `mission-validate.mjs` to
  Campaign Build.
- **A21 V7 / V8 split.** FOLDED-PLAN lists V7 and V8 under J14. Their validator half (A7-A9) is built here, as the
  lead's J12 brief says; J14 writes `taught_by` / `teach` into the re-planned graph and fixes the map. Undo: move S4 to
  J14.
- **A22 Standard text.** level-design.md changes with Michael's recorded answers (authority 1). #443 (merged in
  4.103.3) already wrote Q24 into the training profile (master `docs/level-design.md:39-60`) and the 3.2 / 11.2
  Training lines, so J12 is left with: 11.9's coverage sentence tagged [Campaign] [SectorOps] (Q29) and its graph-kind
  list gaining the A25 kinds (ROADMAP Decided ~18:05, Q25); one training-profile sentence naming `taught_by`; 14 (3)
  item (1) and the 15 measured line live with their commands; rule-index rows for the new checks. Cited as ROADMAP
  Decided 2026-10-25 ~16:50 Q24 / Q29 until J2 gives them G numbers. No other rule changes. Undo: revert the docs
  slices.

- **A25 Six new co-op link kinds (lead decision 2026-10-25, plan-check fix round 1).** `LINK_KINDS` and `COOP_KINDS`
  gain `vent_unlock` (Q25) and the five moves Michael added to the kit (ROADMAP Decided ~18:05: "Deadweight,Drop Catch,
  Chimney Pair,Swing Pass", Plank Bridge "Add it"): `plank_bridge`, `deadweight`, `chimney_pair`, `swing_pass`,
  `drop_catch`. J14's re-plan graph (origin/feature/marlow-replan `docs/marlow-replan/graph.json`) draws them today as
  stand-ins with a `move` field (plank_bridge as `pair_gate`, deadweight as `shutter`, chimney_pair as `team_rope`,
  swing_pass as `team_throw`, drop_catch as `drop`) and the vent unlock as a `bolted` door, which `COOP_KINDS` misses
  (its `validate-run.txt`: "section A3 has no co-op link"). Per kind: each takes the needed fields of its stand-in
  (`vent_unlock` those of `door`); `plank_bridge`, `deadweight` and `vent_unlock` stay open both ways once passed (as
  `pair_gate` / `shutter`); `vent_unlock` is the door the crawler opens from its `to` side (the vent is its own `duct`
  link), so a solo arc runs only from its `to` end, as a `bolted` link; `drop_catch` is one-way by default (as `drop`);
  `chimney_pair` climbs both ways; `swing_pass` is one-way only when the graph says so (as `team_throw`). Bands (lead
  decision 2026-10-25, plan-check fix round 2, adopting coop-kit's side): J12 adds no band number for the five moves.
  Each coop-kit part 2 PR carries its own scale-sheet section 3 band row and its level-design 11.9 graph kind as doc
  lines, which Marlow Build reviews (coop-kit PLAN :256-258, its A12; Michael approves sheet rows). Until a kind's row
  exists, `checkDimensions` prints one INFO per kind used ("<kind>: no size band yet; the scale-sheet row comes with the
  move's coop-kit PR") and checks nothing more (`vent_unlock` gets the door rows). When a row lands, Marlow Build adds
  its `metrics-gen` key and `checkDimensions` case as a follow-up validator change (Marlow Build's later validator job,
  not J12). J12's docs name the kinds where the validator needs them: graph-schema "Link kinds" lists all six (D-A); LD
  11.9 gains only `vent_unlock` (Q25), and the five move kinds enter 11.9 with their coop-kit PRs. A kind does not
  imply `teach` (A8); the map still writes it. Undo: drop the six names from the sets (J14 keeps its stand-ins).
- **A26 What counts as a side route (lead decision 2026-10-25, plan-check fix round 2; Q24).** A8 and A9 count a
  section's routes on its interior. They do not count link-disjoint paths from entry to exit: every Marlow section ends
  in a holding room behind one airlock door, so that count is 1 in every section of both Marlow graphs (v7 REPORT
  `docs/level-validator/marlow-run/REPORT.md:51-52`) and Q24's check would pass everything. The count:
  1. Take the section's spaces and the links with both ends in it (no `spine` link).
  2. Merge each split's leg spaces into one node (A23).
  3. Each link is a step `from` -> `to`, and also `to` -> `from` unless it is one-way (`isOneWay`). Steps between the
     same two spaces in the same direction count once: links between the same two spaces are one doorway, whatever
     their route labels or kinds (two `opening`s, or a boost and a human ladder up the same wall). A step inside one
     merged split node is dropped.
  4. Routes = the distinct paths from the section's `entry` space to its `exit` space that never enter a space twice.
     A section has a side route when routes >= 2. The count stops at 10 ("10+").
  - So a drop back beside a boost up, or a one-way door back to the foot of a climb, is not a second route: using it
    means entering a space again. A loop that leaves the route and comes back to the same space (an objective detour) is
    one route. The entry and exit doors do not cap the count, because the paths need not be link-disjoint.
  - Checked by hand on both Marlow graphs (script run 2026-10-25, the J12 lead's scratch). v7 `ctcourse.json`
    (97873079): A1 2 (the door to the yard, or over the wall top), A2 2 (the neck, or the staging), A3 3 (the corridor,
    or through the offices), A4 3 once split `a4` is merged (aisle 2, straight to the dock, or the mezzanine), A5 2
    (inner to trench direct, or through the switchroom), A6 1 (its four floor-to-gallery links are one step; the
    objective loop floor > gallery > bridge > cage > floor comes back to the floor), A7 1, A8 1 (split `a8` holds the
    hall, the gallery and the office). J14's re-plan `docs/marlow-replan/graph.json` (origin/feature/marlow-replan
    2ede492b4): A1-A7 1 each (A1's boost and relay up the wall are one step, and its drops and one-way yard door lead
    back into spaces already entered; A3's duct and door are one step; A7's split is one node); A8 2 (from `a8-hall`
    into split `a8` straight in, or boosted up to `a8-gallery-west` first), so A8 Strongroom keeps its side route and A9
    applies to it.
  - Campaign and Sector Ops maps keep `checkRedundancy`'s entry-to-exit count (M3) unchanged. J13 counts routes the
    same way by importing S4's function (PLAN section 8).
  - Undo: count entry-to-exit link-disjoint paths again (`edgeDisjointPaths`, master `scripts/level-validate.mjs:175`).
- **A27 Long-throw exception at named Tallow spots (lead decision 2026-10-25 ~20:50, after Michael's ~20:45 "Mix of
  both").** The sheet's throw-gap row caps a `team_throw` gap at 2.7 m (`scale-sheet.md` "Throw gap", master
  `scripts/level-validate.mjs` `team_throw` case: ERR above `sizes.throw_gap_max`). Michael's ~20:45 pick puts a longer
  throw (5.8 m over a 4.9 m gap) at spots Campaign Build picks. The mechanism, per link and never per map:
  - A link field `exception: "long_throw"` on a `team_throw` names the approved exception. Any other `exception` value,
    or the field on another kind, is an ERR.
  - The allowlist and the number live in one new scale-sheet section 3 row, "Long throw (named spots only)": gap at most
    4.9 m (Michael's gap; the row's text also records the 5.8 m throw that crosses it), at the spots it lists as
    `<map>:<from>><to>`, citing Michael's ~20:45 "Mix of both". `metrics-gen` reads it into `sizes.throw_long` =
    `{ max, spots }` with `max` 4.9 (no number or spot in the script, V10).
  - The spots: the allowlist would stay empty until Campaign Build names them, but they are already recorded. Source:
    Campaign Build's lead picks, relayed by the orchestrator, `docs/tallow-fixes/BRIEF.md` M2 (:58-63) on
    origin/feature/mission-engine 6df8f334f; ids from Tallow's graph, master
    `docs/missions/prototypes/campaign-map/graph.json` links 28 and 33 (both `team_throw` today):
    `tallowWharf:w2-pawn-loft>w2-reading-room` (C4 pawn loft to reading room) and `tallowWharf:w2-arcade-roof>w3-roof`
    (C5 arcade roof to the W3 roof). C4 pie loft to clock loft (`w2-pie-loft>w2-clock-loft`) uses the plank bridge and
    gets no exception. A later spot joins the row only when Campaign Build names it (a sheet change, Michael's
    approval).
  - A `team_throw` with `exception: "long_throw"` whose `meta.map:from>to` is a listed spot passes a gap up to the row's
    max (INFO naming the approval) and ERRs above it; at an unlisted spot it ERRs ("not an approved long-throw spot").
    Every link without the field keeps the 2.7 m ERR, listed spots included (the field states the intent).
  - The approval for the row is Michael's ~20:45 pick (the sheet changes only with his approval, `scale-sheet.md:2`).
    The cap is his gap, 4.9 m, not the 5.8 m throw (plan-check fix round 2 corrected an earlier 5.8 m cap): a 5.8 m gap
    would leave the runner no landing margin, and the 2.7 m row's own rule (the throw less a 0.5 m margin) would give
    5.3 m; both pass gaps wider than the one he approved.
  - Undo: delete the row, the `exception` field and its case (every throw back to the 2.7 m ERR).
- **A28 A split leg may start with a co-op link from the fork (lead ruling 2026-10-26, S11; Campaign Build's Tallow
  `tgc-leads`).** Both partners are at the fork for the boost, then separate. At most one leg may start that way; the
  other leg needs a solo entry from the same fork; the co-op link's time counts for its leg and an INFO line names it.
  Not a loosening of `docs/level-design.md` 11.3 (the legs are still walked alone after the fork). Campaign's Tallow
  `tgc-leads` is ruled yes. Undo: drop the fork exception in `checkCoop`'s split block (`scripts/level-validate.mjs`) and
  let the `no solo link leads into` ERR stand.

## Lead answers (Marlow Build, 2026-10-25 ~19:00)
None of these loosens a Michael-only rule; each settles a reading of his words.
- **L1 (A9): full campaign route rules.** Michael's words are "same design rules as a campaign mission area", so a late
  Marlow section that keeps a side route runs the full campaign route rules (rule of three, routes cross, two routes).
- **L2 (A5): WARN stays.** A `null` measured reach or way back means a move the nav grid does not model, not a measured
  miss: a WARN that the design doc must justify, with the declared time still checked (ERR over `reach_max_s`). A
  measured miss stays an ERR (LD 15).
- **L3 (A19): ERR stays.** A mission node on a training map stays an ERR until J22 decides how Marlow Yard sits in the
  campaign list (Q6).
