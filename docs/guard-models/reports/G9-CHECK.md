# G9 check (fresh Sonnet checker)

Branch feature/gm-g9, head 9438fd17 (base 416915c1). Read-only review of tests, e2e and docs. No e2e, no Blender.

## Verdict: PASS

## Run
- Vitest, single files: guardKit 14, gearMask 11, guardFigure 14, guardVariant 30, guardLook 13 passed; guardAssets 4 passed, 3 skipped (GLBs absent). Total 86 passed, 3 skipped, matches the report.
- `npx tsc --noEmit -p .` exit 0. `node --check scripts/e2e-coop.mjs` exit 0.

## Checks
- PLAN G9 test list: all six files exist and test what they claim (shared buffers, gear and head toggles, culling box, ragdoll path, flash / heat, dispose in guardFigure; budgets in guardKit; mask in gearMask; wire in guardLook; bundled files in guardAssets).
- No assert loosened or deleted: the diff of tests and the script has no removed `expect` / `assert` lines. The only `-` lines are the guardKit import (extended) and the two `'net=local'` params (now `NET`, identical when the flag is off).
- guardAssets.test.ts: the real checks sit under `describe.skipIf(present.length === 0)`; the per-base loops iterate `present` (empty), so nothing reads a file. The synthetic-reader tests always run. KTX2 header offsets (width 20, height 24, levels 40) are right. Budget table equals PLAN section 5 and is asserted against `GUARD_LIMITS`. Head 4000 + 500 at LOD0 only is a fair reading (eyes sit inside the head piece; PLAN lists them separately as 2 x 250); LOD1 / LOD2 get no extra.
- e2e-coop gating: `NET` is `'net=local'` unless `E2E_GUARDMODELS=1`, so the default run is unchanged. Seed asserts need no flag (`Enemy.look` is set and packed whatever the flag). Piece asserts run only when `gbody.shownPieces()` is non-null. Property names used all exist (`Enemy.look`, `gbody`, `GuardBody.shownPieces`, `EnemyPuppet.look` / `shownPieces` / private `al`, `AL_HELMET` 32, `AL_ARMOUR` 64, `Enemy.helmet` / `armour`). A host / client look mismatch fails the by-id seed compare (and the sorted piece compare when gated), polled 10 s; the helmet check reads both the wire bit and the host field.
- Docs checked against the code: coop.md layout, `lookSeed` (FNV-1a, murmur finaliser, stride 79), key shapes and `AL_MAX` 65535; world-and-characters file names, flag, `guards` cache in vite.config.ts and test names all exist; performance.md matches PLAN sections 5 and 6 (`scripts/guard-cap.mjs` exists); art-credits MPFB2 rows; TESTING.md item. Changelog fragment follows changes/README.md (title, `kind: minor`, bullets). No reference-game names in the diff.

## Blocking
None.

## Polish list
1. tests/guardAssets.test.ts (BUDGET.albedoW / normalW and the `t.height <= maxW / 2` check): LOD2 reads "512 / 256" as width with height half the width (512x256 / 256x128). PLAN's 0.8 MB at LOD2 fits square textures (512x512 albedo + 2 x 256x256 = about 0.39 MB, twice the 0.2 MB scale the LOD0 and LOD1 rows use) better than 512x256 (about 0.2 MB, so 0.39 MB with the same x2). If G4 bakes LOD2 square, the first real run fails on height. Cheap fix when G4 lands: allow height <= width at LOD2 (or take the numbers from G4's SPEC). The report already warns of a first round of fixes.
2. docs/systems/coop.md layout line says "level 0-1"; the level is bits 0-1 (values 0-3, `level & 3`).
3. docs/systems/performance.md "visible-piece index buffer (~180 KB)" is a worst-case estimate (20,000 + 7,000 + 2,800 tris x 3 x 2 B) not in PLAN; say "up to".
4. e2e-coop restart assert `re.some(look === was.look)` can pass by chance when several guards of that kind exist (1 in 128 each); it is an extra guard, not a false failure. The compare list `hostList` is a one-time snapshot: a gear change on the host inside the 10 s poll would never converge (pre-alert, unlikely).
5. Never run on a laptop: asserts 1-3 in e2e-coop and the three skipped guardAssets tests (the report says so).
