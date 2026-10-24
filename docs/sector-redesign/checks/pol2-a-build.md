# LR16-POLISH2 part A build report

Branch `feature/sector-redesign-pol2-a`, base `6e53e036`. Files: `src/world/maps/warehouseS3.ts`, `tests/warehouseLamps.test.ts`.

## Items
- lr16w-batch polish 1: S3 stores secure store. Order is now top box, `ov(p0)`, side panel box, `nl(p0)`. Only the 3.0 x 0.85 top is `overhead`; the 2.4 m side panel (x 0) is a wall on the fence line and no longer skipped by `navBuild`. Both stay `noLedge`. Comment extended as briefed.
- lr16w-batch polish 3: deleted the four stale `S1 plantDeck ceiling *,-15.15` keys from `LR16D_MOVED`. Added a `hit` set recorded in `cell()` and an assertion that every `LR16D_MOVED` key was used. No other unused key found (the four S3 hall keys are all hit).

## Nav probe (the brief's acceptance 2)
Probe (not committed): `warehouseOps` built, `runtimeNav` grid (`navGridFromLevel` with the analytic down-cast, map nav layers, player spawn seed, nav seeds), base vs branch.
- Base: 96 x 88, 8666 walkable cells, walk b1384565c1e0f7d64117d50cbfde21940500daab, surf 4582c4dd3c9e34b66a688268f588f3142c81e9aa, height 79aa825c2d1602cedcdfaae8293208bf8fd2ecc2, 16 links.
- Branch: identical on every field. No nav change; the map change is kept. No laptop run needed.

## Checks
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (42 pre-existing warnings); eslint on both files clean.
- vitest (single run, `--maxWorkers=2`, slot lock): `warehouseLamps`, `sectors`, `warehouseCoopS3`, `warehouseS3Light`, `lampAudit`: 5 files, 86 passed, 1 skipped (87).
