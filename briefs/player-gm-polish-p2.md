status: done feature/gm-polish-p2 c6d011871

# Brief: gm-polish P2 - gfx=min guard warm misses the helmet drop LOD (Player Build, 2026-10-25 ~09:05)

Base: origin/feature/gm-polish 7945363b. New branch: feature/gm-polish-p2 (from that sha). Unit tests only.

## Why
Checker (scratch report, polish 2): at `?gfx=min` the menu guard warm (`warmGuardFiles` / `guardWarmUrls` in
src/operators/guards/guardAssets.ts) fetches the 3 LOD2 base files + the shield LOD1, but the helmet drop needs
`average` LOD1 (src/operators/guards/guardHelmet.ts ~:53). Offline at gfx=min the dropped helmet stays a box.

## Only files to edit
- src/operators/guards/guardAssets.ts (`guardWarmUrls`): at gfx=min also warm the file the helmet drop loads
  (read guardHelmet.ts to get the exact URL helper; reuse it, do not hardcode).
- tests/guardWarmMenu.test.ts: the gfx=min case expects that file too (count 5), full gfx unchanged (10; check the
  helmet file is already among them, else add it there too and say so).
- scripts/e2e-offline.mjs only if it hardcodes the min count (do not run it).

## Run
`npm run typecheck:fast`; `npx vitest run tests/guardWarmMenu.test.ts tests/guardAssets.test.ts tests/guardAssetsOffline.test.ts`.

## Done
Branch pushed, report below (what changed, tests with counts), `status: done feature/gm-polish-p2 <sha>`.
Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Hyphens, not em dashes.

## Report (Night Shift | Cloud Builder 1, 2026-10-24T22:45Z)
Branch feature/gm-polish-p2, 1 commit on 7945363b (c6d011871).
- guardAssets.ts: new `helmetManifestOf(assetOf)` (the helmet drop's base lookup, Babylon-free: average, else lean,
  real files holding helmet_std); `guardWarmUrls` appends `helmetManifestOf(guardAsset)?.urls[LOD_1]` when not already
  in the list. Full gfx: unchanged, 10 (guard-average-lod1.glb was already among them; the test now asserts it). gfx=min:
  5 (3 LOD2, shield LOD1, guard-average-lod1.glb).
- tests/guardWarmMenu.test.ts: min case expects 5 with the helmet file, full case checks the helmet file is in the 10.
- scripts/e2e-offline.mjs: does not hardcode the min count; untouched.
- Tests: typecheck:fast clean; guardWarmMenu, guardAssets, guardAssetsOffline + guardHelmetDrop, 50 tests pass; the 6
  other files that mock guardAssets (guardBody, guardLampCasters, guardFigureWarm, guardFrozenPose, guardShieldShare,
  guardActiveMeshes) + helmetDrops, 36 pass; eslint clean.
- Deviation: src/ai/guardHelmet.ts edited (not in the list). The lookup lived there; guardAssets.ts cannot import it
  (Babylon, and a cycle). A first try moved `helmetManifest` wholesale and broke guardHelmetDrop.test.ts (it mocks
  `guardAsset` on the module, which an in-module call bypasses), so guardHelmet.ts keeps `helmetManifest()` as
  `helmetManifestOf(guardAsset)` through its import. No behaviour change there.
