# LR16d (warehouse part): lamp moves

Input: `lr16-lamp-audit.md`, "Flagged lamps (LR16d input)", the `warehouse` and `warehouseOps` rows. Bunker and embassy rows skipped (parked maps). Lamp ids, groups, switch wiring unchanged (only the x / z in the table or call changed; no lit-lamp list holds a position).

## Moved (row -> file:line, before -> after)

| Map | Id | File:line | Before | After |
|---|---|---|---|---|
| warehouse | 0 | warehouse.ts:415 | x 21.45 | x 20.6 |
| warehouse | 11 | warehouse.ts:437 (+ `LAMP_MOVED_Z` at :35) | strip (9, 3) | z 10.09 (grid cell and circuit unchanged) |
| warehouseOps | 18 | warehouseS1.ts:75 plantDeck | [-5, -14.6] | [-5, -15.15] |
| warehouseOps | 19 | warehouseS1.ts:75 | [-1, -14.6] | [-1, -15.15] |
| warehouseOps | 21 | warehouseS1.ts:75 | [7, -14.6] | [7, -15.15] |
| warehouseOps | 32 | warehouseS1.ts:81 lobby | [-15.5, -7.4] | [-15.15, -7.4] |
| warehouseOps | 33 | warehouseS1.ts:81 | [-13.5, -7.4] | [-13.85, -7.4] |
| warehouseOps | 48 | warehouseS1.ts:89 void | [7.3, -12.3] | [6.65, -12.3] |
| warehouseOps | 52 | warehouseS1.ts:89 | [7.3, -10] | [6.65, -10] |
| warehouseOps | 62 | warehouseS2.ts:139 northA | [-12, 6.9] | [-12, 7.63] |
| warehouseOps | 75 | warehouseS2.ts:144 storage exit sign | [-4.45, -5.2] | [-4.45, 6.08] (centre line, as the row says; see flags) |
| warehouseOps | 80 | warehouseS3.ts:129 hall | [18, -2.6] | [18.26, -2.6] |
| warehouseOps | 87 | warehouseS3.ts:129 | [23.2, 3.4] | [22.15, 3.4] |
| warehouseOps | 93 | warehouseS3.ts:129 | [23.2, 9.4] | [22.15, 9.4] |
| warehouseOps | 103 | warehouseS3.ts:130 deck | [22.75, 13.2] | [22.15, 13.2] |
| warehouseOps | 115 | warehouseS3.ts:135 partsStore | [10, 12.8] | [10, 12] |
| warehouseOps | 118 | warehouseS3.ts:135 | [22, 12.8] | [22, 13.05] |
| warehouseOps | 120 | warehouseS3.ts:137 prodOffice | [17.6, 15.4] | [17.6, 16.33] |
| warehouseOps | 121 | warehouseS3.ts:137 | [20.4, 15.4] | [20.4, 15.85] |
| warehouseOps | 123 | warehouseS3.ts:137 | [17.6, 17.1] | [17.6, 16.33] |
| warehouseOps | 124 | warehouseS3.ts:137 | [20.4, 17.1] | [20.4, 16.33] |
| warehouseOps | 132 | warehouseS3.ts:143 deck exit bulkhead | [22.7, 14.05] | [22.15, 14.05] |

22 moves (2 warehouse, 20 warehouseOps). Y unchanged everywhere.

## Left unmoved

- `none` rows (no clearing move): warehouseOps 34 (bulkhead, hand move), 44, 81, 116, 122, 125.
- Blocked by the shader slot cap, row applied then reverted: warehouseOps 20 (plantDeck, centre move to z -13.4) and 71 (cage strip, push to x -21.7). Each pulls a 9th lamp into one 2 m column ((6..8, -10..-8) and (-18..-16, 8..10); `LAMP_GRID_SLOTS` is 8), which fails `no 2 m column has more lamps in reach than the shaders list` in the S1, S2, S3 light tests and `lampGridLossless`. Passing with both reverted. They need another move (or a fixture change) from the lead.

## Flags for review (applied as the rows say)

- warehouse 11: the strip lands at z 10.09, 1.09 m from the lit strip at (9, 9) (2.6 m long boxes overlap along z).
- warehouseOps 75: an exit sign (bulkhead, yaw PI/2) moved 11.28 m off its wall to mid-room (row's centre move). Likely wrong for a wall sign; revert to [-4.45, -5.2] if so.
- warehouseOps 120 and 123 both land on (17.6, 16.33): two panels on one spot.

## Audit rerun

`node scripts/lamp-audit.mjs --json --no-views --map=warehouse,warehouseOps` (the .md was not rewritten): warehouse 0 flags (was 2); warehouseOps 8 flags (was 28): 20, 34, 44, 71, 81, 116, 122, 125 (the six `none` rows plus 20 and 71 above).

## Tests

- `npx tsc --noEmit`: clean.
- Passing: tests/warehouse* (except the light levels below), lampBake, lampAtlasFit, lampFalloff, lampGridLossless, lightField, volLights, rooms, sectors, sectorSlice0, sectorStep3, lampAudit, securityRoom, smoothWorldLight, detailPass, navClosure, losParity.
- Changed: `tests/warehouseLamps.test.ts` "regular grid": reads each moved ceiling fitting at its original grid cell (`LR16D_MOVED`), so the grid check still guards the layout.
- Light-level failures, recorded not retuned. These tests were GREEN at the base commit f80e11fc in a clean worktree (run here), so the moves caused them:
  - S1 "reads lit enough": R2[6] and R2[10] (7.4, -14.6, 3.3) 0.36 < 0.4; R2[16], R3[21] (-14.5, -9.6) 0.37 < 0.4; void catwalk opening 0.22 < 0.45.
  - S1 "not lit to a guard": R1[19], R2[17], R3[22] (-14.5, -7.4) 0.62 > 0.55; connector C2 checkpoint 0.61 > 0.55.
  - S2 "reads lit enough": R2[4] (-14.65, 6.3) 0.17 < 0.4; A3 middle 0.33 < 0.4; ladder foot R2N 0.14 < 0.45; east gangway middle 0.32 < 0.4.
  - S2 "not lit to a guard": R1[0], R2[0], R3[0] (-14.5, -7.2) 0.61 > 0.55.
  - S3 "reads lit enough": the clerk 0.52 < 0.55.
  - S3 "not lit to a guard": R1[10], R1[16] (17, 13.8, 3.3) 0.61 > 0.55.
