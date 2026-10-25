status: done feature/validator-port-s7a e5a930811
# J12 validator-port, slice S7a (Sonnet): scale sheet rows + metrics-gen strict args

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3).

- Base: origin/master (9ad370a90 or newer). New branch: `feature/validator-port-s7a`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show 10b613dd3:docs/validator-port/PLAN.md` slice **S7a** (lines 197-216) - build it word for word - and the
  BRIEF entries it cites: `git show 10b613dd3:docs/validator-port/BRIEF.md` (A12, A13, A24, A25, A27, "Michael picked").
- Only files to edit: `scripts/metrics-gen.mjs`, `docs/design/scale-sheet.md` (section 3 relay row 56 rewording + new
  "Long throw (named spots only)" row after "Throw gap"; section 8 `nav_floor_depth_m` row; six `mission_*` rows copied
  from `git show 0c62a921:docs/design/scale-sheet.md`), `docs/design/metrics.json` (regenerated with
  `node scripts/metrics-gen.mjs`), `tests/metricsGen.test.ts`, and a changelog fragment
  `changes/feature-validator-port-s7a.md` (kind: patch). Do NOT touch sheet row 57 (rope) or any co-op move band rows
  (coop-kit owns them), and add no `ladder_grab_m` row and no `kit` block.
- Long throw numbers (do not change): gap at most 4.9 m (the 5.8 m throw crosses it); spots
  `tallowWharf:w2-pawn-loft>w2-reading-room` and `tallowWharf:w2-arcade-roof>w3-roof`; `sizes.throw_long` =
  `{ max: 4.9, spots: [...] }`. Relay lip: band stays 4.3 - 4.6 (Michael picked "Keep 4.6 m (Recommended)"); 6.5 m is
  stated as the physical ceiling only; `sizes.hang_lip` stays [4.3, 4.6].
- Tests to run (unit only, no e2e, no GPU, no npm run check): `npx vitest run tests/metricsGen.test.ts`,
  `node scripts/metrics-gen.mjs --check` (must report no drift after regeneration), `npx tsc --noEmit -p .` if feasible.
- Done: the S7a "Done" line in the PLAN holds: `--help` / `--chek` exit 2 with metrics.json untouched; the new keys;
  the relay pin (`sizes.hang_lip[1]` <= `TEAM.relayMax` + `HANG.drop`, both imported from code); a `validate()` case
  (master `scripts/level-validate.mjs`) on a one-link fixture: `team_hang` lip 4.6 passes, 4.7 ERRs;
  `sizes.throw_long` parses to max 4.9 with the two spots. Plain English, hyphens not em dashes in docs.
- Report: append what changed, tests with counts, deviations; set `status: done feature/validator-port-s7a <sha>`.

## Report (Night Shift | Cloud Builder 4, 2026-10-25)
Branch `feature/validator-port-s7a` from origin/master d6a04cee3 (contains 9ad370a90). Commits 93639eaa2 (script, sheet,
metrics.json), e5a930811 (tests, fragment).
- `scripts/metrics-gen.mjs`: any argument but `--check` prints `usage: node scripts/metrics-gen.mjs [--check]` to stderr
  and exits 2 before reading or writing anything (A13). New `SIZE_RULES` row `throw_long` (row "Long throw (named spots
  only)"): `max` from "at most N m gap", `spots` = every code-style `<map>:<from>><to>` in the cell; `pick` now gets the
  cell text as a second argument. No number or spot in the script.
- `docs/design/scale-sheet.md`: section 3 Relay lip row reworded (band 4.3 - 4.6 kept, Michael's "Keep 4.6 m
  (Recommended)" cited; 4.6 + `HANG.drop` 1.9 = 6.5 m stated as the physical ceiling only; teamMoves pointer now :64).
  New "Long throw (named spots only)" row after "Throw gap" (4.9 m gap, 5.8 m throw, the two Tallow spots, Michael ~20:45
  "Mix of both"). Section 8: `nav_floor_depth_m` 1.5 (navBuild.ts:32-34, LD 12.1) after `safe_drop_m`, then the MV rows.
  Row 57 (rope) and the co-op move band rows untouched; no `ladder_grab_m`, no `kit` block.
- `docs/design/metrics.json` regenerated: `sizes.throw_long` = `{ max: 4.9, spots: [2] }`, `sizes.hang_lip` still
  [4.3, 4.6]; the new `rules` keys. `node scripts/metrics-gen.mjs --check`: no drift.
- `tests/metricsGen.test.ts` +4 cases: `--help` / `--chek` exit 2 with metrics.json byte-identical; new keys (and no
  `ladder_grab_m` / `kit`) plus a bad long-throw cell throwing; relay pin (`hang_lip[1]` <= `TEAM.relayMax` +
  `HANG.drop`, imported from `src/config/movement` and `src/world/anchors`); master `validate()` on a one-link campaign
  fixture: no relay-reach ERR at 4.6, exactly the relay-reach ERR at 4.7 (the fixture's unrelated section / way-back
  findings are filtered out, by design of a one-link graph).
- `changes/feature-validator-port-s7a.md` (kind: patch).
Tests: `npx vitest run tests/metricsGen.test.ts` 9/9; also levelValidate, routeRunPlan, routeRunProgress,
changesFragments 138/138 (they read metrics.json); `npx tsc --noEmit -p .` exit 0; eslint on the test clean;
`node scripts/doc-lint.mjs` 0 errors.
Deviations: the brief says "six `mission_*` rows"; 0c62a921 has four `mission_*` rows plus `sector_parallel_min` and
`sector_syncs_min` (the six rows MV added to section 8). All six copied verbatim. Undo: drop the two `sector_*` rows and
regenerate. Pending PC run: none named (no e2e or GPU leg in this slice); affected-e2e on the PR as usual.
