status: done feature/validator-port-s8 fa4abab62c2aa264731d3edcf58f86bc1115e93e
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

## Report (Night Shift | Cloud Builder 1, 2026-10-25)
Branch `feature/validator-port-s8` from dae93b99, one commit fa4abab6 (5 files: the four MV files and the fragment).

**What changed**
- `scripts/mission-validate.mjs`: MV 0c62a921's 539 lines replace S0's stub, re-cut onto the lib: imports `adjOf`,
  `arcsOf`, `collector`, `fmt`, `reachable`, `soloArcsOf` from `level-graph-lib.mjs` and `perfectPaths` from
  `level-checks/perfect.mjs` (nothing from `level-validate.mjs`; MV's own `arcsOf` / `adjOf` / `reach` / `fmt` are gone).
  `checkMission(graph, metrics, opts = {})` (length 2, as levelProfiles pins). Two-player walks use `arcsOf`; solo walks
  use `soloArcsOf` (so `vent_unlock` follows A25: kept, bolted arc from its `to` end) plus the pair gates a `pair_door`
  sync with `solo` lets through. Ghost / pacifist runs call `perfectPaths` with the primary (non-optional) objectives'
  spaces, the extraction as `exfil`, `keep` = no `loud` link / no `requires_kill` link (PLAN S8 "the mission's primary
  objectives"; MV checked optional ones too). `RULE_KINDS` drops `oneChance` and `window` (A19), with the window
  `seconds` check and the oneChance INFO. A training map: a mission node stays an ERR (L3); a non-empty `rules` node is
  one direct ERR `rules: a training map carries no strict rules (Q5: "all are retries in marlow yard, as its a training
  exercise")`, which replaces the generic "rules: given without a mission node" there.
- `tests/missionValidate.test.ts` (MV's 540 lines re-cut): `METRICS` = `docs/design/metrics.json` plus the six rows
  copied from 0c62a921 (`mission_steps` [3, 6], `mission_step_min` [2, 5], `mission_total_min` [10, 30],
  `mission_rules_max` 2, `sector_parallel_min` 2, `sector_syncs_min` 2) until S7a lands; the CLI case writes that
  fixture to a temp file and passes `--metrics`; new cases: the Q5 ERR (a training graph with `rules` and no mission:
  exactly one ERR; with a mission: M1 + Q5), `window` / `oneChance` rejected as kinds, optional objectives out of the
  ghost run; the Sector Ops fixture tags the strongroom `unavoidable` (S0's sector `needsUnavoidable` WARN, not a
  mission check).
- `docs/level-validator/mission-schema.md` (MV's, kind list fixed: no `oneChance` / `window`, no `seconds` row; the Q5
  ERR; ghost / pacifist over primary objectives via `perfectPaths`; L3 note; the lib and S7a pointers).
  `docs/level-validator/example.mission.json`: MV's unchanged (its rules are ghost + noKills).
- `changes/feature-validator-port-s8.md` (kind: patch).

**Tests** `npx vitest run tests/missionValidate.test.ts tests/levelProfiles.test.ts tests/levelValidate.test.ts`:
**151 / 151** (missionValidate 42, levelProfiles 19, levelValidate 90); `npx tsc --noEmit -p .` clean; eslint clean on
the test (`.mjs` scripts are eslint-ignored); changesFragments 1 / 1.
CLI: `node scripts/level-validate.mjs docs/level-validator/example.mission.json --metrics <sheet + the six rows>`:
**0 error(s), 0 warning(s)** (MV's 0 / 0). With the base sheet (no S7a rows) it prints 4 WARNs `metrics:
rules.mission_* is missing`, gone once S7a merges. The map-only example: 0 / 0. The five live campus graphs: the mission
checks add nothing (pinned).

**Final kind lists (for Campaign Build, A20)**
- STEP_KINDS: reach, interact, intel, exploit, interrogate, carry, plant, sync, extract
- RULE_KINDS: ghost, noKills, noAlarms, noBodies, namedTarget, noGadgets, plantNotTake
- SYNC_KINDS: power_cut, camera_loop, code_source, code_sink, pair_door
- REWARDS (optional objectives): gadget, syringe, medkit; teams a / b / all; rule scopes mission / a / b

**Deviations**
- Ghost / pacifist over primary objectives only (the PLAN's wording; MV ran every objective). Undo: `targets` from
  every objective in the runs block.
- The Sector Ops test fixture gains an `unavoidable` tag (S0's profile; no checker change).
- No `level-validate.mjs` or lib edit was needed.
