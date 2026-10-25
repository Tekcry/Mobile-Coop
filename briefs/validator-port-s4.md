status: done feature/validator-port-s4 215ef98d3e17e39c086e77eec8bd59c119792f9a
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

## Report (Night Shift | Cloud Builder 3, 2026-10-25 ~23:35)
Branch `feature/validator-port-s4` @ 215ef98d3 (one commit on dae93b996). 3 files, +461 / -5. No export added to
`scripts/level-validate.mjs`.
- `scripts/level-checks/training.mjs` (stub replaced): `checkTraining` per A8 / A9 / A23 / A26; exported
  `sectionRoutes(graph, section)` -> `{ count, paths }` (A26: interior spaces and non-spine links, split legs merged into
  one node named `split:<id>` in `paths`, same-direction steps between two nodes once, steps inside a merged split
  dropped, simple paths entry -> exit by depth-first walk, count capped at `MAX_ROUTES` 10, no single entry / exit: 0);
  exported `campaignRouteRules(graph, section)` = core `checkEncounters` on a one-section `mode: "campaign"` subgraph,
  keeping only the approach-count, approach-kinds, "no <kind> approach" and "routes never cross" lines (imported from
  level-validate.mjs: function import cycle, safe). The choke test runs on the unmerged interior graph: a teach space is
  blocked, a teach link is removed (a parallel link between the same spaces still passes, so a teach on one of them is
  avoidable: J14's own note says the same). Teach elements on the entry or exit space pass trivially.
- `tests/levelTraining.test.ts` (new): 16 cases - one per A26 shape (two openings + boost + human ladder: 1; boost up
  + drop back: 1, J14 A1 shape: 1; v7 A2 airlock loop: 2 + ERR before taught_by; v7 A6 objective loop: 1; J14 A8 shape
  after taught_by: 2, ERR without a guard, route rules with one), the 10 cap, spine / other sections ignored; A23 (split
  only, no guard: no ERR; split + side route, no guard: ERR; guarded: rules run; split before taught_by ERR once);
  taught_by (missing, not in sections, on another mode); teach (none, link field, bad type); the choke test (parallel
  link, loop space); the kept core lines (a fixture breaking each prints exactly those five lines; a passing one none;
  under A9 in a late section); `validate()` wiring.
- `changes/feature-validator-port-s4.md` (kind: patch), plain-English docs of `taught_by`, `teach` and the count.

Tests: `npx vitest run tests/levelTraining.test.ts tests/levelProfiles.test.ts tests/levelValidate.test.ts` 125 passed
(16 new + 109 existing); `tests/changesFragments.test.ts` 1 passed; `npx tsc --noEmit -p .` clean; eslint clean.

Route counts per section (A26's hand count matched exactly):
- v7 ctcourse (origin/feature/level-validator-v7, temp copy, `mode: training`, `taught_by: "A7"`): A1 2, A2 2, A3 3,
  A4 3 (split `a4` merged), A5 2, A6 1, A7 1, A8 1. Errors: side-route ERRs in A1-A5, `split:` ERRs for `a4` and `a7`,
  plus "no teach element" in A1-A7 (v7 has no teach tags) = 14 new errors (13 -> 27 in the CLI run). No side-route
  ERR in A6, A7, A8.
- J14 (2ede492b4, its own `taught_by: "A6"`): A1-A7 1 each, A8 2 (straight into split `a8`, or boosted up to
  `a8-gallery-west` first). No side-route, split or teach ERR in A1-A7. A9 runs on A8 and prints 4 ERRs (0 -> 4 in the
  CLI run), all on `a8-office` (a guarded encounter space, guards { 2: 1 }, inside split `a8`): its only interior way in
  is the `a8-gallery -> a8-office` door (high), so "1 approaches (need 3+)", "approaches use 1 route kind(s)", "no
  shadow approach", "no loud approach". A real graph finding for J14 (or a question whether A9's rule of three covers
  every guarded encounter space in a late section, as the core rule does, or only the main one).
- Campus S1-S5: 127 errors, 174 warnings before and after (identical output); example graph: 0 / 0 before and after.

Deviations: none from the PLAN text. File names follow the PLAN's table except the fragment (`changes/...` per this
brief, not `docs/validator-port/fragments/S4.md`). `campaignRouteRules` and `MAX_ROUTES` are extra exports of
training.mjs (for the test that pins the kept core lines). Pending PC run: none beyond CI `check` (scripts + unit tests).
