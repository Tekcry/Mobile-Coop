status: done feature/validator-port-s7b ebb58a1132b316fcd4cb07fa140e342be12de438
# J12 validator-port, slice S7b (Sonnet): engine.mjs nav-floor WARN + long-throw exception

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged). New branch: `feature/validator-port-s7b`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S7b** (search `**S7b (Sonnet).**`,
  ~line 259) - build it word for word - and the BRIEF entries it cites (`docs/validator-port/BRIEF.md` A12, A27).
  S0's lib is `scripts/level-graph-lib.mjs`; the profile checks live in the files S0 created next to it (find
  `engine.mjs` or the profile folder S0 set up; follow S0's pattern, `collector.num` for metrics keys).
- Only files to edit: the `engine.mjs` profile check file, `scripts/level-validate.mjs` (only the `team_throw` case of
  `checkDimensions`), the test files for those two (`tests/levelProfiles.test.ts` and / or `tests/levelValidate.test.ts`,
  only new cases), and a changelog fragment `changes/feature-validator-port-s7b.md` (kind: patch) that also documents
  the new link field `exception` (graph schema; ~80 lines of plain-English docs inside the fragment are fine).
- Not yours: `docs/design/metrics.json` and the scale sheet (S7a adds `sizes.throw_long` on another branch). Your
  tests use a metrics FIXTURE holding `sizes.throw_long = { max: 4.9, spots: ["tallowWharf:w2-pawn-loft>w2-reading-room",
  "tallowWharf:w2-arcade-roof>w3-roof"] }` and `rules.nav_floor_depth_m`.
- No rope direction check, no human-ladder check, no test imports `TEAM.ladderGrab` (A12, seam with the co-op kit job).
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/levelProfiles.test.ts
  tests/levelValidate.test.ts`; `npx tsc --noEmit -p .` if feasible. Also run
  `node scripts/level-validate.mjs` on the v7 Marlow graph (`git show origin/feature/level-validator-v7:docs/marlow-final/graph/ctcourse.json`
  saved to a temp file) and the campus graphs: counts unchanged except the PLAN's intended changes (list them).
- Done: the S7b "Done" line in the PLAN holds, every listed test case present and green.
- Report: append what changed, tests with counts, deviations; set `status: done feature/validator-port-s7b <sha>`.

## Report (Night Shift | Cloud Builder 3, 2026-10-25 ~23:10)
Branch `feature/validator-port-s7b` @ ebb58a113 (one commit on base dae93b996). `git diff --stat dae93b996`: 4 files,
+237 / -4.
- `scripts/level-checks/engine.mjs` (stub replaced): `checkEngine` WARNs a space with `storey < -nav_floor_depth_m`
  that is `type: encounter` or has guards (any `guards` count > 0), reading `rules.nav_floor_depth_m` through
  `collector.num` (missing: one WARN "the nav floor check skipped"). The key is asked only when a space is below storey
  0 AND an encounter or guarded, so maps with nothing underground (all of today's) get no missing-key WARN on the base
  metrics (S7a adds the row). No rope direction check, no human-ladder check, no `TEAM.ladderGrab` read (A12).
- `scripts/level-validate.mjs` `team_throw` case only (:253-277): A27 as the PLAN words it - `exception:
  "long_throw"` at a listed `meta.map:from>to` spot passes up to `sizes.throw_long.max` with an INFO naming the
  approval, ERR above; unlisted spot ERR "not an approved long-throw spot"; another value ERR; no field the 2.7 m row;
  `sizes.throw_long` missing (or not `{ max, spots }`): one WARN and the 2.7 m fallback.
- `tests/levelProfiles.test.ts`: 11 new cases in two describes ("validator-port S7b: engine facts (A12)", 4; "... the
  long-throw exception (A27)", 7), metrics FIXTURE = base metrics + `rules.nav_floor_depth_m` 1.5 + `sizes.throw_long`
  { max 4.9, the two Tallow spots }. Covers: encounter at -2 WARN, guarded at -1.6 WARN, plain at -2 no WARN (also
  guards 0 and exactly -1.5 no WARN); missing key one WARN; `team_rope` from storey 4.5 down to 0 (lc 4.5 in the
  2.2-6 band) no ERR; no validator module reads ladderGrab and no level test imports `src/config/movement`; pawn loft
  4.9 with field passes + INFO (arcade roof too); plank spot 4.9 with field ERR; listed spot 4.9 no field ERR (2.7 m);
  listed 5.0 with field ERR; same ids on `campusOps` ERR; other value ERR; field on a door ERR; missing / malformed
  `throw_long` one WARN + fallback.
- `changes/feature-validator-port-s7b.md` (kind: patch) with the `exception` field's graph-schema docs for D-C.

Tests: `npx vitest run tests/levelProfiles.test.ts tests/levelValidate.test.ts` 120 passed (2 files; 11 new);
`tests/changesFragments.test.ts` 1 passed; `npx tsc --noEmit -p .` clean; eslint on the test clean (the .mjs files are
eslint-ignored by the repo config).

CLI runs, base code (dae93b996) vs S7b, each with the base metrics and with S7a's metrics.json (has both new rows):
- v7 ctcourse (origin/feature/level-validator-v7): 44 errors, 81 warnings in all four runs; output identical (sorted
  diff empty). Its three `human_ladder` links (a1-apron>a1-walltop, a2-west>a2-staging, a6-floor>a6-gallery, lc 4.4)
  get only the `sizes.coop_lip` band (inside 4.3-4.5: no line). Lowest storey 0: no nav-floor WARN.
- Campus S1-S5 (docs/sector-redesign/graph): 127 errors, 174 warnings in all four runs; identical. Lowest storey 0.
- Master's Tallow graph (docs/missions/prototypes/campaign-map/graph.json) with S7a metrics: no throw-gap lines (it has
  no `exception` field yet; both throws are inside 2.7 m as drawn).
So: counts unchanged on every graph; the PLAN's intended changes show only in the unit cases (no current graph is
underground or carries the field).

Deviations:
1. File names follow this cloud brief, not PLAN's slice table: tests in `tests/levelProfiles.test.ts` (not a new
   `tests/levelEngine.test.ts`), fragment `changes/feature-validator-port-s7b.md` (not `docs/validator-port/fragments/S7.md`).
2. "The field on another kind: ERR" lives in `engine.mjs` (`checkEngine`), not in `checkDimensions`, because this brief
   lets S7b touch only the `team_throw` case there. `validate` runs both, so the CLI reports it; `checkDimensions` on
   its own does not. Undo: move the 3-line loop into `checkDimensions` before its link switch.
3. The nav-floor key is asked lazily (see above) so the S0 "modules start empty" case and every `warns: []` case pass on
   the base metrics before S7a merges.
Pending PC run: none needed beyond CI `check` (scripts + unit tests only; affected-e2e passes as unit-only).
