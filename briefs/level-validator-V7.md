status: done feature/level-validator-v7 97873079

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

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/level-validator-v7` @ 97873079 (one commit on 4ccb6aea). Files: `docs/marlow-final/graph/ctcourse.json`,
`docs/level-validator/marlow-run/REPORT.md` only.
- Graph AS BUILT: 55 spaces (8 encounter, 7 holding-room checkpoints L1-L7, start a1-lounge, exfil a8-dock), 85 links
  (7 spine, 7 coop_boost, 3 human_ladder, 1 team_rope, 4 pair_gate, 6 drop, 25 opening, 18 door, 15 double_door,
  5 open_stair, 1 fire_stair), 3 splits (a4, a7, a8 via `split:` tags). `area` on every space, `vantage.at` on 7 of 8
  encounters, link `at` where 2+ openings; every coordinate cites its code line.
- Validator: no schema / parse error; 49 ERR, 81 WARN, 8 INFO (pending V6), exit 1. Measure pending
  (`scripts/level-measure.mjs` not on 4ccb6aea). `npx vitest run tests/levelValidate.test.ts` 86/86.
- Worst three: (1) A2 neck has no high approach (two watchers on the staging deck = the high route; X2b closures killed
  SPEC's secret route, routes never cross); (2) A8 office single approach, one-way 1.2 m stair, five high beats in a
  row, SPEC's N2 drop takedown has no drop line; (3) 7 of 8 encounters miss the 0.4-0.6 shadow band (lit by default,
  SPEC 7 P4) and 6 of 8 vantages see < 70% (estimates). Also: A1 wall top co-op-only (revive), A7 split legs 16.5 vs
  36.9 s by hand, A3 / A4 co-op moves have no graph kind. Verdicts: A1 / A2 / A4 / A7 / A8 patch, A3 / A5 / A6 OK, no
  re-plan.
- Deviations (each in REPORT "Modelling choices", reversible): holding rooms as spaces (all 8 M3 redundancy ERRs run
  through the airlock door; interior counts given by hand); service corridors / plant room not spaces (closed void,
  facility.ts:694-698); encounter typing per campus rule V5f-3 (camera-only spaces and A3 office 2 = connector; A1 no
  encounter); schema gaps: partner throw as `coop_boost` without `level_change`, hang-down as `drop`, synced-hack doors
  as `pair_gate`; heights from collision (10 m hall roof); A4 leg a `time_s` at run pace 3.0 m/s; the generator script
  was a scratch file, not committed. The builder could not write REPORT.md itself; I wrote it from its text.
