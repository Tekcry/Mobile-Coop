status: open
# J12 validator-port, slice S6 (Opus-grade brief): perfect.mjs + no-forced-kill test

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged; `perfectPaths` as fixed by S0 is in the lib). New branch: `feature/validator-port-s6`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S6** (search `**S6 (Opus).**`, ~line
  225) - build it word for word - and the BRIEF entries it cites (`docs/validator-port/BRIEF.md` A10, A11). Game rule
  behind it: a perfect rating is always possible and no mission forces a kill (VISION hard rules 3 and 4).
- Only files to edit: the `perfect.mjs` profile check file (S0's profile folder), new `tests/noForcedKill.test.ts`, the
  test cases for `perfect.mjs` (new `tests/levelPerfect.test.ts`, or new cases in `tests/levelProfiles.test.ts` if S0
  put perfect cases there), and `changes/feature-validator-port-s6.md` (kind: patch). Do not change `perfectPaths`
  in the lib unless a test proves it wrong (then log it as a deviation). Other slices edit the validator and other
  profile files in parallel: stay out of them.
- `tests/noForcedKill.test.ts` reads game code (`src/game/sectors.ts`, the course defs): trace each Marlow
  `CourseObjective.done` flag's setter and list them in the test, as the PLAN says. No game code edits.
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/noForcedKill.test.ts` plus your
  perfect test file and `tests/levelProfiles.test.ts tests/levelValidate.test.ts`; `npx tsc --noEmit -p .` if
  feasible; the validator on campus S1-S5 + example graphs: counts unchanged.
- Done: the S6 "Done" line in the PLAN holds, every fixture case listed there present.
- Report: append what changed, tests with counts, the flag setters you traced, deviations; set
  `status: done feature/validator-port-s6 <sha>`.
