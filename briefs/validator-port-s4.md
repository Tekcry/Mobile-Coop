status: claimed Night Shift | Cloud Builder 3 2026-10-25T23:17:48+11:00
# J12 validator-port, slice S4 (Opus-grade brief): training.mjs - taught_by, teach, sectionRoutes, side routes

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged: `scripts/level-graph-lib.mjs` and the profile files next to it). New branch: `feature/validator-port-s4`.
  Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S4** (search `**S4 (Opus).**`, ~line
  233) - build it word for word, every listed test case - plus section 8 ("What J13 route-runs needs", ~:441; the
  exported `sectionRoutes(graph, section)` shape is a contract with another job: keep its name and return shape) and
  the BRIEF entries it cites (`docs/validator-port/BRIEF.md` A8, A9, A23, A26).
- Only files to edit: the `training.mjs` profile check file (S0's profile folder), its test file (new
  `tests/levelTraining.test.ts`, or new cases in `tests/levelProfiles.test.ts` if S0 put training cases there), and a
  changelog fragment `changes/feature-validator-port-s4.md` (kind: patch). S4 adds NO export to
  `scripts/level-validate.mjs` (it imports `checkEncounters` as the PLAN says). Other slices edit the validator and other
  profile files in parallel: stay out of them.
- Graphs for the Done checks (temp copies, never committed): v7 Marlow
  `git show origin/feature/level-validator-v7:docs/marlow-final/graph/ctcourse.json` (set `mode: "training"`,
  `taught_by: "A7"`), and J14's graph `git show 2ede492b4:docs/marlow-replan/graph.json` (its own `taught_by: "A6"`).
  The expected per-section route counts are in the PLAN's Done line (A26's hand count): report each actual count.
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/levelTraining.test.ts
  tests/levelProfiles.test.ts tests/levelValidate.test.ts`; `npx tsc --noEmit -p .` if feasible; the validator on
  campus S1-S5 + example graphs: counts unchanged (they are not `training` mode).
- Done: the S4 "Done" line in the PLAN holds.
- Report: append what changed, tests with counts, the route counts per section for both graphs, deviations; set
  `status: done feature/validator-port-s4 <sha>`.
