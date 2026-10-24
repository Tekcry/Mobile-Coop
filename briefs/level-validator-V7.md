status: open

# level-validator V7: Marlow Yard (ctcourse) connectivity graph + first validator run (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Data + docs only: no src/ change, no e2e, no GPU, no npm run check.
Why: `docs/level-design.md` section 15 "Acceptance tests every map has": the map's connectivity graph passes the
validator. Marlow Yard (map `ctcourse`, the co-op training level) has no graph yet; the campus has five.

## Base and branch
- Base: `origin/feature/level-validator-v6` 4ccb6aea or later (schema with `area` / `vantage.at` / link `at`).
- New branch: `feature/level-validator-v7`. Create ONLY: `docs/marlow-final/graph/ctcourse.json`,
  `docs/level-validator/marlow-run/REPORT.md`. Touch nothing else (other agents own the campus graphs, scripts, tests).

## Read
`docs/systems/agent-preamble.md`; `docs/level-validator/graph-schema.md` (whole) and
`docs/level-validator/example.graph.json`; one campus graph as a worked example
(`docs/sector-redesign/graph/campusOps-S1.json`); `docs/level-design.md` sections 3, 4, 11 and 15 (grep headings);
Marlow's design: `docs/marlow-final/SPEC.md` (sections 7, 9 and the per-set sheets; grep, it is 1.2k lines) and the
built map: `src/world/maps/ctcourse.ts`, `src/world/maps/ctcourseSets/facility.ts`, `types.ts` and the eight set
files `a1Gate.ts` .. `a8Strongroom.ts`.

## Build
1. `docs/marlow-final/graph/ctcourse.json`, AS BUILT (from the code, not the SPEC where they differ; note each
   difference): `meta.map` `ctcourse`, mode campaign, players [2]; one space per walkable room / set zone (the
   facility lounge, holding rooms L1-L7, service corridors, each set A1-A8 split into its encounter spaces, entry
   vantages, co-op lips / leg-up spots); links with the right `kind` (door, sliding door, `coop_boost`, `human_ladder`,
   `team_rope`, `drop`, `ladder`, `duct`, ...) and declared `time_s` / `length`; checkpoints; splits where the two
   players take different legs; `area` (RoomDef id or `[minX, minZ, maxX, maxZ]` boxes) on every encounter and
   split-leg space, `vantage.at` where the code gives the vantage point, link `at` where a pair has 2+ openings.
   Every coordinate cites its code line in the space's `note`. Guards per set from the set files (count, posts).
2. `node scripts/level-validate.mjs docs/marlow-final/graph/ctcourse.json`: fix only graph data errors (wrong ids,
   missing fields). Real design findings stay: list them.
3. `docs/level-validator/marlow-run/REPORT.md`: the validator output (ERR / WARN / INFO counts and lines), each
   finding with its set, code line and a one-line suggested fix, and a "graph vs SPEC" difference list. Verdict per
   set: OK / patch / re-plan. No changes to the map.
4. If `scripts/level-measure.mjs` exists on your base, also run it on the graph WITHOUT `--write` and paste its table
   into the report (else write "measure pending").

## Tests and done
- The validator runs on the graph with no schema / parse errors (design ERRs are allowed and reported).
- `npx vitest run tests/levelValidate.test.ts --maxWorkers=2` still passes.
- Push the branch, report at the end of this brief (space / link / split counts, ERR / WARN totals, the worst three
  findings, deviations), `status: done`.
