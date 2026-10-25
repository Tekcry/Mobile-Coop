status: claimed Night Shift | Cloud Builder 1 2026-10-25T23:19:13+11:00
# J12 validator-port, slice S8 (Opus-grade brief): mission-validate re-cut onto the lib

Lead: Night Shift | Marlow Build (joint with Campaign Build, which reads the schema before the checker). Plan passed
(Opus plan check 3, PASS on 10b613dd3).

- Base: `dae93b996661f38cb45518bc293fd8bbc133d42e` (origin/feature/validator-port = PR A head with S0's lib split
  merged; S0 already carried a `scripts/mission-validate.mjs` into the base: start from what is there and finish the
  re-cut). New branch: `feature/validator-port-s8`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/validator-port:docs/validator-port/PLAN.md` slice **S8** (search `**S8 (Opus, joint).**`,
  ~line 283) - build it word for word - and the BRIEF entries it cites (`docs/validator-port/BRIEF.md` A19, A20, L3).
  Source: MV `git show 0c62a921:scripts/mission-validate.mjs` (539 lines), `git show 0c62a921:tests/missionValidate.test.ts`,
  `mission-schema.md` and `example.mission.json` from 0c62a921 (find their paths with `git show --stat 0c62a921` /
  `git ls-tree -r 0c62a921`).
- Only files to edit: `scripts/mission-validate.mjs`, `tests/missionValidate.test.ts`, `mission-schema.md` and
  `example.mission.json` (MV's paths), and `changes/feature-validator-port-s8.md` (kind: patch). Import shared helpers
  from `scripts/level-graph-lib.mjs`, never from `level-validate.mjs`; ghost / pacifist runs call the lib's
  `perfectPaths` (no duplicate path code). Other slices edit the validator and profile files in parallel: stay out.
- The `mission_*` metrics rows come from another slice (S7a, not in your base). Your tests use a metrics fixture with
  those keys, values copied from `git show 0c62a921:docs/design/metrics.json`; do not edit `docs/design/metrics.json`.
- Rules to apply (from the PLAN): drop `oneChance` / `window` from `RULE_KINDS` (A19); a mission node on a `training`
  map stays an ERR (L3); a direct ERR for a `rules` node on a `training` map citing Q5 ("all are retries in marlow
  yard, as its a training exercise").
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/missionValidate.test.ts
  tests/levelProfiles.test.ts tests/levelValidate.test.ts`; `npx tsc --noEmit -p .` if feasible;
  `node scripts/level-validate.mjs` on the example map + mission (as the PLAN's Done line says): 0 / 0.
- Done: the S8 "Done" line in the PLAN holds.
- Report: append what changed, tests with counts, the final kind lists (for Campaign Build), deviations; set
  `status: done feature/validator-port-s8 <sha>`.
