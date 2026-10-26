# Level validator: training, perfect-run and engine checks, graph sets
kind: patch
- Level validator, training maps (`scripts/level-checks/training.mjs`): a new `meta.taught_by` names the section where
  the last co-op kit move is taught on its own (an error when missing or not one of `meta.sections` on a training map,
  and on any other mode). Up to and including that section each section is one guided route: an error for a side route
  (2+ routes), for a `split:` tag, for no teach element, and for a teach element some entry-to-exit path avoids.
- Teach elements: a link field `teach: "<move>"` or a space tag `teach:<move>` (free text from the map's teach list, so
  moves with no link kind, such as the jam relay or the console loop, count).
- Routes are counted on the section's own spaces and links (no spine link), entry to exit, never entering a space
  twice; links between the same two spaces in the same direction are one step, and a split's legs are one route. So a
  drop back beside a boost, or an objective loop that returns to its space, is still one route. Exported as
  `sectionRoutes(graph, section)` -> `{ count, paths }` (count stops at 10; a merged split is `split:<id>` in `paths`)
  for the route-run harness.
- After `taught_by`, a section with 2+ routes needs a guarded encounter space (a side route only when training against
  enemies), and then the campaign route rules run on it: three approaches of two kinds with shadow, high and loud, and
  routes that cross. A section whose only second way is a split needs neither.
- `npm run validate:levels` (`scripts/level-graphs.mjs`) runs the level validator over every committed graph set in
  `docs/level-validator/graph-sets.json` (the example, campus S1-S5 and Marlow Yard) and exits 1 when a set's error or
  warning count differs from the manifest; `--write` rewrites each saved run and the counts. `tests/levelGraphs.test.ts`
  pins the same counts and checks each saved run says them. Pinned today: campus 139 errors and 200 warnings, Marlow
  Yard (with `--require-measured`) 37 errors and 83 warnings. Adds the `level-measure` script line.
- Level validator (tooling, no game change): every map graph is checked for a perfect run. Each objective and the
  run's end (exfil on a campaign map, the last section's exit on Sector Ops and Marlow Yard) must be reachable without
  a link marked `requires_kill` (an error on every mode) and without a loud link (an error on campaign and Sector Ops,
  information on Marlow Yard). `requires_kill` must be true or false, and a `mark` on a space or link is an error on
  campaign and Sector Ops and an information count on Marlow Yard.
- New test: no mission forces a kill. Every Sector Ops objective is a hack, grab or download, and every Marlow Yard
  objective step is completed by a player action (a zone, a scanner pair, a switch or a door), never by a guard's death.
- Validator output on the worked example and the campus graphs is unchanged.
- Level validator, engine facts (`scripts/level-checks/engine.mjs`): a space more than `rules.nav_floor_depth_m`
  (scale sheet section 8, 1.5 m) below storey 0 that is an encounter space or has guards prints a WARN: the guards'
  nav grid does not reach that deep (level-design 12.1). The row is read only when such a space exists below storey 0;
  a missing row prints one WARN and the check is skipped. Ropes still go both ways (a `team_rope` down from an upper
  storey inside the `rope_span` band is fine) and the validator has no human-ladder row of its own: a `human_ladder`
  lip is judged by the co-op lip band (`sizes.coop_lip`) as before.
- Level validator, throw gaps (`scripts/level-validate.mjs`, the `team_throw` check): a throw marked as an approved
  long throw is judged against the scale sheet's "Long throw (named spots only)" row (`sizes.throw_long`, gap at most
  4.9 m at the listed spots) instead of the 2.7 m throw gap row. Every other throw keeps the 2.7 m row.
- New optional link field `exception` (only `"long_throw"`, only on a `team_throw`; an error on any other value or
  kind): documented in `docs/level-validator/graph-schema.md`.
- Docs: `docs/level-validator/graph-schema.md` gains `meta.taught_by`, `teach`, `requires_kill`, `mark` and
  `exception`, the training, perfect-run and engine checks, the graph sets, and corrects the coverage, solo-twin and
  measured-value lines; `docs/level-design.md` names `taught_by`, the live measured exit gate and the new rule-index
  rows; `docs/systems/testing-tools.md` documents `--require-measured`, `npm run validate:levels` and
  `npm run level-measure`.
- The Marlow Yard level graph (`docs/marlow-final/graph/ctcourse.json`, as built at 4.103) is on the training profile,
  with `taught_by` A7 and eight teach elements from the course spec. It is measured with `level-measure --write`; its
  validator run with `--require-measured` is saved beside it as `run.txt`, with a `REPORT.md` that maps each error to
  the re-plan slice that fixes it.
- The five campus graphs carry their measured positions and the values `level-measure` stored from the built campus. A
  new test, `tests/levelMeasureCampus.test.ts`, re-measures the campus in CI and fails when a stored value has moved or
  the stored geometry hash is stale; the saved validator run and report are in `docs/level-validator/campus-run/`.
- Splits: a split leg may start with a co-op link from the fork (both partners stand at the fork for the boost, then
  go on alone). At most one leg; the other still needs a solo entry from the same fork; the co-op link's time counts
  for its leg and an INFO line names it. Two co-op entries, or a bolted link walked the wrong way, keep the error.
