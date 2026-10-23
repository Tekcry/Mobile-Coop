# LR16dx: warehouse lamp moves, fix round (Opus)

Base: e8cc0eef (lr16int c7a26ca7 + lr16dw 0cdee9f1). Michael: lamps paint hard arcs on nearby walls; "light positioning
needs to be improved"; "Must be realistic depiction of light". Status: IN PROGRESS (tests and full audit rerun pending).

## Audit rule fixes (`src/world/lampAudit.ts`, `scripts/lamp-audit.mjs`)

- **Reach**: a face beyond the lamp's reach (`LightDef.radius`, the authored radius x 1.6) is never lit by it, so the flag
  reads `min(WALL_NEAR, reach)`. A dead fitting (intensity 0, reach 0: drawn dark, never lit, no circuit) is never
  flagged (was: ops 81, 116, and the dead fittings LR16dw moved).
- **Signs / emissive wall fittings** (`isEmissive`: a wall fitting in exit-sign green, which the script marks, or one
  reaching <= `SIGN_REACH` 1.2 m): never moved off their wall or door. When the glow reaches a face, the proposal is `dim`:
  the reach (and authored radius) that stops `DIM_MARGIN` 0.05 m short of it.
- **No two proposals on one spot** (`auditAll`, `crowds`): lamps are audited in table order; a target keeps `SPACING`
  1.0 m in plan from every other lamp (one moved earlier: at its target) and `FIT_GAP` 0.3 m between the fittings' bodies
  (`foot` = fixture sx / sz, so two 1.2 m strips cannot overlap).
- **Only as far as needed, never past the centre line**: after a failed push, the smallest 0.05 m step toward the
  room's centre line that clears (was: straight to the centre line); a step past the line is refused; when the centre
  line lies behind the lamp (the flagged face is a low unit or a wall top, not the wall across the room) the row is
  `none`, re-site by hand (was: the lamp moved toward the face, ops 20 -> z -13.4).
- **3D face distance** (`faceDrop`): a face a tilted scan ray meets below the lamp counts at its top edge
  (`hyp(plan distance, drop to the solid's top)`); a full-height wall is unchanged. The near radius is 3D: a cabinet
  1.65 m under a panel is not a wall 0.8 m away (that reading blocked ops 120 / 123 / 122 / 125 and flagged ops 20 / 71).
- Unit tests (`tests/lampAudit.test.ts`, 6 new): sign dim and no push; reach and dead fitting; low unit vs full-height
  face; two lamps off opposite walls of a 3.35 m room keep SPACING; strip bodies crowd; smallest step and never past
  the centre line.

## Moves (this round)

| Map | Id | Where | Before | After | Why |
|---|---|---|---|---|---|
| warehouse | 11 | warehouse.ts:35 `LAMP_MOVED_Z` | z 10.09 (LR16dw) | z 3.8 | the (9, 3) strip hung 0.82 m off the crane girder's face (z 2.17, y 4.8-5.2); z 3.8 clears it and the (10, 5) pillar by 1.1 m and keeps 5.2 m to the lit (9, 9) strip (10.09 was 1.09 m from it) |
| warehouseOps | 20 | warehouseS1.ts plantDeck | [3, -14.6] | [4.2, -15.15] | joins its row (18, 19, 21 at z -15.15); x 3 on that row sits 0.48 m over the plant unit's corner (x 0-3, top 5.1): 4.2 is 1.29 m off it; the audit's z -13.4 put it over the void 0.25 m off the corridor wall's top |
| warehouseOps | 34 | warehouseS1.ts charging | [-10.2, -6.24] | [-8, -6.24] | the bay sign hung 0.16 m off the parked forklift's back (top 2.2); slid along its z -6 wall, between the forklift and the charger (1.6 m clear) |
| warehouseOps | 71 | warehouseS2.ts cage | [-22.2, 13.4] | [-22.2, 14.8] | it overlapped aisle A1's strip at (-21.4, 13.5) (0.8 m apart, bodies crossing); the audit's x -21.7 push would put it 0.3 m off that strip; z 14.8 is down the cage middle, 1.4 m from the other cage strip |
| warehouseOps | 75 | warehouseS2.ts storage | [-4.45, 6.08] (LR16dw) | [-4.45, -5.2], radius 0.6 -> 0.3 | the charger indicator back on its wall over the charger; its glow (reach 0.96) reached the z -6 wall 0.65 m off: reach 0.48 now |
| warehouseOps | 132 | warehouseS3.ts deck sign | [22.15, 14.05] (LR16dw) | [22.7, 14.05], radius 0.6 -> 0.3 | the stair-head exit sign back centred over the stair (x 22.1-23.3); the duct at x 23.35 is 0.65 m off: reach 0.48 now |
| warehouseOps | 120-125 | warehouseS3.ts prodOffice | 120 / 123 both (17.6, 16.33), 121 (20.4, 15.85), 122 (23.2, 15.4), 124 (20.4, 16.33), 125 (23.2, 17.1) | a regular 3 x 2 grid: x 17.85 / 20.4 / 22.95, z 15.7 / 16.95 (same order, radius, intensity) | the room is x 16.15-24.0, z 14.65-18.0; every panel 1.05 m off the walls, 2.55 m and 1.25 m apart, no shared spot |

`tests/warehouseLamps.test.ts` "regular grid": `LR16D_MOVED` reads 20 and 71 at their grid cells; the production office
is a regular grid again, so its entries are gone.

## `none` rows (LR16c) decided

- 34: hand slide along its wall (above).
- 44 (mess panel): stays. The mess is 1.7 m deep (z -10.65 to -8.95): no spot is 1 m off both long walls; the centred
  panel (0.85 m each side) is the realistic one. The one documented flag.
- 81 (hall strip, (23.2, -2.6)) and 116 (parts store panel, (14, 12.8)): dead fittings (intensity 0), drawn dark and
  never lit: no light reaches a wall; they stay on their grids (the audit no longer flags them).
- 122, 125: re-gridded with the production office (above).
