# Step T9b - voxel art layer: Deep level, airlocks, finish of the look (Block D)

Model: implementer opus, checker opus. Deps: T9a. Visual only.

## Read
- BAYS.md "Real purpose" and colour of B7-B9 and the airlock sheet; src/world/maps/bunkerArt.ts (T9a)
- src/voxel/programs.ts (headers); tests/voxelFit.test.ts (the bunker entry from T9a)

## Task (decisions)
1. `bunkerArt.ts` for B7-B9, S6, A1-A8, L9: sprayed concrete for the cavern (Concrete with heavy form texture), Planks and
   BlockWall for the kill house, Steel for the range catwalk, barricades and B9 balconies and bridge, Hazard on the
   range firing line and the lift threshold.
2. `extra()` for B7-B9 and the airlocks: the house's office clutter, the water main's brackets and valve, sandbag shapes,
   range target stands and flags, the plot table's printed map surface (emissive back-light already a lamp), cabin desks,
   the airlocks' decontamination showers, door status lamps and "Bay N" signage; Cresset signage boards per bay.
3. The fit and the dark-pocket rules as T9a. The whole map passes voxelFit and the lip test (no new lip).
4. Phone: none (D24).

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker smoke`; the perf trend (`MAP=bunker MODE=course
PERF_POINT=B9`) with the art layer; PC-PASS rows 2 and 4 with `E2E_GPU=1` (budgets must still pass on this PC).

## Commit
"training T9b: voxel art layer for the Deep bays and the airlocks". Docs: LOG, STATE, CHANGELOG, PC-PASS.
