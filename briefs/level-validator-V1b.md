status: open

# level-validator V1b: the 16 missing metrics keys + V1 checker should-fixes (Marlow Build, job level-validator)

Lead: Night Shift | Marlow Build (desktop). Node + Vitest only: no src/ change, no e2e, no GPU, no npm run check.

## Base and branch
- Base: `origin/feature/level-validator` 7c54018c or later (V1 merged, checker PASS).
- New branch: `feature/level-validator-v1b`. Edit ONLY: `docs/design/scale-sheet.md` (section 8 "Validator numbers"
  and the section 7 room table only if a key belongs there), `scripts/metrics-gen.mjs`, `tests/metricsGen.test.ts`,
  `docs/design/metrics.json` (regenerated, never hand-edited), `scripts/level-validate.mjs`,
  `tests/levelValidate.test.ts`, `docs/level-validator/graph-schema.md` (one sentence, item 5). Another agent owns
  `docs/sector-redesign/graph/*` and `docs/level-validator/campus-run/*`: do not touch them.

## Read
`docs/level-validator/V1-check.md` (the checker report: must-fix 1, should-fix 1-5), `docs/level-validator/PLAN.md`
M1-M4 block (M2: every number comes from the sheet via metrics.json, nothing hardcoded), the V1 report at the end of
`briefs/level-validator-v1.md` on cloud-queue (the key list with values), `scripts/metrics-gen.mjs:78-109` and `:179`.

## Build
1. Must-fix 1: add the 16 keys the validator reads that metrics.json lacks, as rows in scale-sheet.md (section 8, or
   the existing size tables) and parsed by metrics-gen.mjs, so the generated JSON carries them under the EXACT names
   and groups the validator reads (11 are read as `sizes.*`; check each read site in level-validate.mjs; section 8
   rows land in `rules.*` today: make the generator put each key where the validator looks, or change the read site,
   never both). Values from the V1 report (`ceiling_min` 2.4, `door_h_min` 2.0, `door_h_max` 2.2, `roller_door_w`
   3.0, `duct_w` 1.2, `duct_h` 1.5, `tunnel_h` 2.1, `wall_jump_max_up` 3.8, `coop_lip` [4.3, 4.5], `split_jump_w`
   [1.2, 1.95], `split_jump_h` 3.6, `dead_end_max_m` 15, `guards_early` [3, 6], `guards_late` [6, 10], `guards_max`
   10, `safe_drop_m` 4.5 (NOT 3.5: should-fix 1, src/player/movement.ts:168 `LANDING.heavy` 4.5, stays a WARN)), each
   row citing its source (sheet, level-design section, or src file:line). Regenerate metrics.json with the generator;
   the metricsGen test (JSON matches the sheet) must still pass. After this, the example graph run should have 0
   missing-key WARNs.
2. Should-fix 1: fix the comment at level-validate.mjs:465-466 (src has a landing height: 4.5, no fall damage).
3. Should-fix 2: level-validate.mjs:494-500 no-softlock: a co-op target that also has a solo route from ANY space
   reachable solo (not only from `start`, so a mandatory pair_gate does not flag later targets) is not a softlock.
   Add the checker's probe case as a test.
4. Should-fix 3: level-validate.mjs:384 step band: the sheet allows curbs up to 0.40, so the forbidden band starts
   above 0.40 (read both ends from metrics, not literals).
5. Should-fix 4: add a fail case (and a pass case where missing) for each: roller door, duct, tunnel, stairs, double
   door, opening, door height, wall-jump, co-op lip, split-jump, drop; objective cannot reach exfil; duplicate id;
   assist / overwatch naming no split; legs never rejoin; a CLI run with two files (spawn node on two temp files).
6. Should-fix 5: one sentence in graph-schema.md: partner reach is measured to the nearest space of the other leg.

## Tests to run
`npx vitest run tests/levelValidate.test.ts tests/metricsGen.test.ts`; `node scripts/metrics-gen.mjs --check` (or
the generator's check mode); `node scripts/level-validate.mjs docs/level-validator/example.graph.json` (expect 0
errors, 0 missing-key WARNs). Report counts.

## Done
Push `feature/level-validator-v1b`, write a short report below (what changed, test counts, deviations), set
`status: done feature/level-validator-v1b <sha>`. Commit trailer: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>.
