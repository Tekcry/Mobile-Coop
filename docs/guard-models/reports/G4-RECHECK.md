# G4 re-check: fix round (B1 guard-<base>.json, P2-P4)

Checker: fresh Opus, 2026-10-24. Branch `feature/gm-g4`, fix a3386bbb on top of the check 86b01273. Read: the agent
preamble, G4-CHECK.md, the G4-REPORT "Fix round" section, `git diff 86b01273..a3386bbb`, and the runtime side
(`src/operators/guards/guardAssets.ts`, `gearMask.ts` `validateGuardManifest`, `tests/guardAssets.test.ts:302-321`).

## Verdict: PASS (no blockers)

## B1: closed
- **Shape.** `guardLodReport.mjs:14-24` `guardFileData(layout)` = `{ pieces, tintSlots: layout.tintSlots.length,
  refHeight }`. This is exactly `GuardFileData` (`guardAssets.ts:18-22`). It also matches the loader's malformed test
  (`:66`: array / number / number) and what `tests/guardAssets.test.ts:308-312` reads. The report `manifest` (`:102`)
  now spreads the same object, so the manifest, the JSON and the layout cannot drift apart.
- **Written for every base.** `guard-lods.mjs:91-93` deletes the stale file before Blender. `:120` writes it after the
  report, whenever `--base` is set, so every base lods job gets one and the shield job gets none. The path
  `out/lods/guard-<b>.json` is the same one the check reads (`guard-check.mjs:117`).
- **Job outputs.** `guardBakePlan.mjs:329` adds `lods/guard-${b.id}.json` to the base lods jobs only. A test checks
  both the base and the shield case (`guardBakePlan.test.ts:131-132`).
- **SHIPPABLE.** `guardBakePlan.mjs:472` is `/\.(glb|ktx2|png)$|\.report\.json$|^lods\/guard-[a-z]+\.json$/`.
  - `shippableFiles` hands it forward-slash paths relative to `--out` (`guard-bake.mjs:190`), so the anchor matches.
  - `.layout.json` and `.bake.json` have a second dot, so they never match. Neither does `shield_riot`.
  - Tests cover it: `guardBakePlan.test.ts:489-491` and `guardLods.test.ts` (the new file-data case).
- **Check rule.** `guard-check.mjs:48-60` `checkFileData` runs for every base (`:93`). A missing file fails ("missing").
  So does a wrong type ("malformed"), a value that differs from the layout, a value that differs from the report
  manifest, and anything the runtime's own `validateGuardManifest` refuses. `gearMask.ts` has no imports, and it is
  now in the check hash (`:382`).
  - Tests: the clean base passes with the file and fails with only the "missing" problem without it.
  - A second test hits malformed, wrong refHeight, manifest mismatch and a foreign body piece.
  - The loader case runs G7's real `resolveGuardAsset` on the JSON for all three bases: no problems, `standIn` false.

## P3: landed, correct
- `guard-check.mjs:77-85`: once a piece has LOD0 triangles, it must have some at LOD1 and LOD2. The only pass is a hair
  cap whose kit `tris[lod]` is 0.
- In `guards.json`, only hair caps have a 0 entry: LOD2 for the five meshed caps, and `bald` all zeros. `bald` and the
  shield are not pieces (`guardAtlas.mjs:45, 51`), so nothing else is exempt by mistake.
- A cap at LOD1 with 0 triangles is still flagged. The test checks this together with radio at LOD1 and glasses at
  LOD2, and expects exactly 3 problems.

## P4: landed, correct
- `guard_lod_util.py:242-250`: three islands are protected in both passes. They are the island with the most
  triangles overall, plus the island with the most triangles on each side of x = 0 (ties go to the larger box). The
  target loop skips protected islands, so the last-resort pass keeps both members of a pair.
- I traced the two new self-test cases by hand, and both hold: the pair is kept and the 2 cm bit is dropped. I could
  not run them here, because the system Python has no numpy and Blender is not allowed in this check.
- The only other change is the `bake_guard.py` docstring. `decimate_piece` already accepts staying over target
  (`over` is only logged), so no caller breaks.

## New breaks: none
- The lods job hash changes (`guardLodReport.mjs` and `guard_lod_util.py` are in `LODS_FILES`). Expected result: the
  next bake reruns every lods job, and the new output makes old outputs count as stale anyway.

## Runs (one at a time)
- `tests/guardLods.test.ts`: 20 passed.
- `tests/guardBakePlan.test.ts`: 38 passed.
- `tests/guardBudget.test.ts`: 55 passed.
- `tests/guardAssets.test.ts`: 4 passed, 3 skipped (no bundled files yet).
- `tests/guardAssetsReport.test.ts`: 1 passed, 1 skipped.
- `npx tsc --noEmit -p .`: clean.
- The diff has no new test files.

## Polish
- R1. `guard-check.mjs:118`: `JSON.parse` on a corrupt `guard-<b>.json` throws, so the check crashes instead of
  reporting "malformed". The bake writes the file itself, so the risk is low. A try/catch that passes `{}` would give
  the named problem.
- R2. `guard_lod_util.py:245-248`: the per-side protection also applies in the 20 mm tiny pass. A centred garment
  therefore keeps the largest island on its minority side, even when that island is a sub-20 mm stitch: a few
  triangles. To change it, only protect a side's island when its diagonal is at least `min_diag`, or note it.
- R3. Run the `guard_lod_util.py` self-test under Blender's Python on the laptop bake, since this check did not run it.
- P1, P5, P6, P7 from G4-CHECK are still open.
