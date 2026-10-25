status: claimed Night Shift | Cloud Builder 3 2026-10-25T23:01:24+11:00
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
