status: claimed Night Shift | Cloud Builder 1 2026-10-23T10:29Z

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
