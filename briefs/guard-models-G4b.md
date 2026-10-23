status: done feature/gm-g4b 94a91629

# Brief: guard-models G4b - the guard budget check (pure JS, unit tests only) (Player Build)

Lead: Night Shift | Player Build, 2026-10-23 ~21:35. No Blender, no GPU, no src/ game change.

## Base and branch
`origin/feature/guard-models` (fetch it; at least 0c55a103). New branch `feature/gm-g4b`; push there only.

## Read
docs/guard-models/PLAN.md sections 3 (G4, G9 `guardAssets.test.ts`), 5 (budgets), docs/guard-models/SPEC.md (budgets,
pieces, bones), scripts/operators/data/guards.json, src/operators/guards/guardKit.ts (limits already encoded:
reuse them, do not duplicate numbers), scripts/operators/README.md "operators:check", the existing check scripts in
scripts/operators/ (how Wren's `operators:check` reads `*.report.json` / GLBs), scripts/operators/guardBakePlan.mjs (job
outputs: `lods/guard-<base>-lod{0,1,2}.glb`, `lods/guard-<base>.report.json`).

## Files (only these)
- `src/operators/guards/guardBudget.ts` (new, pure): `checkGuardReport(report, kit): string[]` - from a bake report
  JSON (define its shape in this file, matching what bake_lods.py guard mode should write: per LOD visible-tris per kind
  worst case, buffer tris, head tris, bones, influences, texture sizes and formats, per-piece tris, KTX2 only) return
  problems against section 5 and the kit's piece caps.
- `scripts/operators/check-guards.mjs` (new CLI): reads `<dir>/lods/guard-*.report.json` (default the GB out dir),
  prints problems, exit 1 on any; `--json`.
- `tests/guardBudget.test.ts` (new): a passing synthetic report per base; one broken copy per rule gives its problem.
- `tests/guardAssets.test.ts` (new): reads bundled GLBs under `src/operators/assets/guards/` if present (counts tris per
  LOD, bones, attribute presence `_PIECE` / `_TINT`, KTX2 textures only); `it.skip` with a clear message while the
  folder is absent (G4 has not baked yet).
- `docs/guard-models/reports/G4b-REPORT.md` (incl. the report JSON shape, so G4's bake_lods.py writes it).

## Run
tsc, eslint on the TS files, `npx vitest run tests/guardBudget.test.ts tests/guardAssets.test.ts tests/guardKit.test.ts`.

## Done when
Tests pass (guardAssets skipped with its message), diff only the files above, report written, commit trailer
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `status: done feature/gm-g4b <sha>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-23 ~21:50): done, feature/gm-g4b 94a91629
Files (only the brief's 5, 770 lines added, base 7488d74d):
- `src/operators/guards/guardBudget.ts` (pure): report shape `GuardBakeReport` / `GuardLodReport` / `GuardTextureReport`,
  `checkGuardReport(report, kit): string[]`, plus `guardReportFiles`, `guardLodFile`, `pieceLod0Cap`.
  `GUARD_LIMITS` imported from guardKit.ts (unedited). Section-5 budgets with no kit constant added once here, each citing
  PLAN.md section 5: `GUARD_INFLUENCES` 4/4/2, `GUARD_DRAWS` 1, `GUARD_ATLAS` sizes, `GUARD_ATTRIBUTES` `_PIECE` / `_TINT`.
  Per piece / head / hair cap / body also its own guards.json budget; the tighter cap wins; caps are hard (no tolerance).
- `scripts/operators/check-guards.mjs`: `[dir] [--kit file] [--json]`, default dir `DEFAULT_OUT` from guard-bake.mjs,
  reads `<dir>/lods/guard-*.report.json`; TS via Node 22 type stripping + `ts-resolve.mjs` (same as check.mjs).
  Exit 0 within budget, 1 any problem (unreadable JSON counts), 2 nothing to check / bad argument.
- `tests/guardBudget.test.ts`: clean synthetic report per base + shield pass; 48 broken-copy rules each give their
  problem; malformed input gives problems, never throws.
- `tests/guardAssets.test.ts`: a GLB reader self-test on a synthetic GLB always runs; the bundled-GLB checks are
  `it.skip` with a message while `src/operators/assets/guards/` is absent.
- `docs/guard-models/reports/G4b-REPORT.md`: includes the report JSON shape for G4's bake_lods.py.
Tests: tsc clean; eslint clean on the 3 TS files (the .mjs is under eslint's ignore pattern). vitest guardBudget +
guardAssets + guardKit: 66 passed, 1 skipped. CLI: missing dir 2, empty lods 2, clean report 0, 46k LOD0 buffer tris +
PNG albedo 1 (2 problems), --json 1 (JSON printed), unknown option 2.
Deviations: `pieceLimit` in guardKit.ts is not exported, so `pieceLod0Cap` repeats its mapping (numbers from
`GUARD_LIMITS.pieceLod0`); the CLI prints a missing expected report (partial bake) as a note, not a problem
(guardAssets requires the full set once GLBs are bundled); no package.json script added (not in the file list).
