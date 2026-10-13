# Step T9a - voxel art layer: Upper and Plant levels (Block D)

Model: implementer opus, checker opus. Deps: T8c. Visual only: gameplay reads the blockout (CLAUDE.md hard rule).

## Read
- DECISIONS.md D14, D23 (light and dark showcase); BAYS.md "Real purpose" and colour of B1-B6
- docs/systems/graphics-quality.md: grep `Voxel art`, `programs.ts`, `fine: true` (the art layer rules)
- src/voxel/levelVoxels.ts (grep `VoxelArt`, `piece`, `extra`), src/voxel/programs.ts (every program's header),
  src/world/mapDef.ts (grep `art`); tests/voxelFit.test.ts (how a map is fit-tested)
- Originality: never open another map's art file (`src/world/maps/*Art.ts`); learn from programs.ts and the interface.

## Task (decisions)
1. `src/world/maps/bunkerArt.ts` (`MapDef.art` on the bunker): `piece()` picks a material program by the piece's
   colour / role (keep a colour table in bunker.ts so art and build agree): BlockWall for block partitions, Concrete for
   the bunker shell (form lines, chipped arrises), Steel for galleries, rails, gensets, catwalks (worn edges, rust),
   Hazard on drop pads, airlock thresholds and gate devices, Floor for slabs (saw cuts, stains), Planks for the kill
   house only (T9b), Grime / Rust paint programs on the plant.
2. `extra()` visual-only shapes for B1-B6: cable trays and conduit along walls, the B3 fan blades and hub, B4 valve wheels
   and pipework, genset details in B5, B6 desks, monitors and racks' fronts; `fine: true` for props and machines.
3. Rule (the fit test enforces it): nothing carves or protrudes where gameplay reads a surface (cover faces, lips, floors,
   anchors). Add the bunker to tests/voxelFit.test.ts (parity and fit within +-3 cm).
4. Light and dark showcase (D23): each bay's dark pockets stay dark (no emissive dressing in them); emissive only on real
   sources (exit signs, monitors, status LEDs, the B9 map table).

## Checks
`timeout 900 npm run check` (voxelFit includes the bunker); `node scripts/run-e2e.mjs e2e-bunker smoke`. GPU: PC-PASS
row 4 re-shot for B1-B6 at Epic with `E2E_GPU=1` (for Michael's eyes).

## Commit
"training T9a: voxel art layer for the Upper and Plant bays". Docs: LOG, STATE, CHANGELOG, PC-PASS.
