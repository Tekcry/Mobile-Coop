status: open
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
