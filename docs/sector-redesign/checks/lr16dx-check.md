# LR16dx checker (Sonnet 5.5): warehouse lamp moves, fix round

Diff `c7a26ca7..52ee8276` (lr16int + lr16dw + lr16dx). Verdict: **FIX** (2 blocking items, both are dw moves the dx round left in place).

## Run

- `npx tsc --noEmit`: clean.
- `lampAudit` (incl. 6 new tests) and `warehouseLamps`: pass. Wider sweep (warehouse*, lamp*, light*, sector*, smoothWorldLight, navClosure, losParity): only `ctcourseLight` (4, fails on base c7a26ca7 too, other map) and `lightField` allocation test (load flake, passes solo on base).
- S1/S2/S3 light: 11 failing tests, same 11 as the base, BUT the failing items inside them are not "the same except 3 cage spots" (see item 2). I ran the base c7a26ca7 in a scratch worktree and diffed every failing line.
- Audit rerun on head (`--map=warehouse,warehouseOps --no-views`): warehouse 0 flags, warehouseOps 1 (44, decided). Matches the build report.
- Audit of the BASE lamp positions with the dx rules (to see which dw moves are still needed): flagged and needing a move: warehouse 0, 11; ops 33, 52, 62, 80, 87, 120, 121 (+ signs 34, 75, 132 dim, 44, 122, 123, 125 none). NOT flagged any more: ops 18, 19, 20(21), 32, 48, 93, 103, 115, 118, 124 (dead fittings, or the face is a low unit). Those moves were made under the old 2D rule and dx did not re-validate them.

## Blocking

1. `src/world/maps/warehouseS3.ts:135` partsStore: 115 moved to (10, 12) and 118 to (22, 13.05). Neither is flagged under the final rules (115's "wall" is a low shelving row, now read in 3D; 118 is dead). Effects:
   - Panel 115 (0.6 m) is centred 0.145 m inside the deck slab's south edge (slab z 11.855), so 0.155 m of it hangs past the ceiling over the open hall: a fitting over a void. Mount test passes only because it tests the centre.
   - The row of four panels is now z 12 / 12.8 / 12.8 / 13.05 (was 12.8 x4): not a row. `tests/warehouseLamps.test.ts` hides this (`LR16D_MOVED` reads them at the old cells).
   - Light: with the moves, S3 gains new failures: R1[6] (12.4, 10.8) 0.58 > 0.55 (new), R3[6] (9.6, 10.4) 0.78 -> 0.94 > 0.55, packing end 0.83 -> 0.87 > 0.8. Reverting 115 and 118 to z 12.8 (experiment, then restored) removes all three.
   - Fix: 115 back to [10, 12.8], 118 back to [22, 12.8]; drop both from `LR16D_MOVED` (`tests/warehouseLamps.test.ts:119-120`).

2. `src/world/maps/warehouseS2.ts:139` northA: 62 moved (-12, 6.9) -> (-12, 7.63) for a 0.47 m "wall" that is a 0.05 x 0.05 m post (box c -12, 5.45, 6.40, s 0.05 x 0.9 x 0.05; the only solid within 0.5 m). A 5 cm post paints no arc, but the 0.73 m move:
   - Darkens the S2 route: R2[4] (-14.65, 6.3) 0.19 < 0.4 (was passing), ladder foot R2N (cross aisle) 0.43 -> 0.17 (needs 0.45), cross aisle middle 0.33 and A2 middle 0.36 (new fails), east gangway middle 0.35 -> 0.28, takedown 6 0.37 -> 0.34. Reverting 62 alone removes R2[4], cross aisle middle, A2 middle and restores the ladder foot to 0.43 (experiment, restored).
   - Breaks the cross-aisle row: (-21.4, 6.9) vs (-12, 7.63).
   - The build report says S2 differs "only round the cage (71)". It does not: this is dw's move, carried unchanged.
   - Fix: 62 back to [-12, 6.9]; and make the audit ignore thin solids (see polish 1) so it stops flagging it. A ladder foot at 0.17 is a dark spot where the spec wants light, not a level for LR16g.

## Cage south end (the 3 spots the builder names): acceptable for LR16g

Lamp 71 (-22.2, 13.4 -> 14.4, dx): R2[8] (-18.75, 13.5, 4) 0.38, R2[13] (-23.45, 11.4, 4) 0.31, rack top W0N 0.31, all under 0.4. These are rack-top route points, not ladder feet or doors, and the fix is needed (71 and the A1 strip 63 overlapped at 0.1 m in z). No hiding spot is lit. Leave for LR16g (a small intensity lift on 71 clears them).

## Checks 1 to 3 (what held)

- Every moved lamp is in the code at the stated spot (22 dw rows + 7 dx rows read against the diff). All ceiling fittings are under a ceiling at the centre (warehouseLamps mount test passes) except 115 (item 1). No fixture box overlaps a solid other than its own ceiling slab (scripted overlap scan on all moved lamps). Spacing: nearest lit-lamp pairs 1.2 m (63/71, strips overlap in x but are 0.81 m apart in z), 1.25 m (prodOffice rows), 1.3 m (lobby), all clear. Production office 3 x 2 grid is fully regular and inside its slab; the x margins are 1.7 m (west) / 1.0 m (east), not the stated 1.05 both sides (polish).
- Audit rules: reach (`min(WALL_NEAR, reach)`, `LightDef.radius` is already authored x 1.6), dead fittings, sign dim, SPACING / FIT_GAP, smallest step, `mid > 0` guard (when the centre line is behind the lamp the plain push stays allowed because `after < limit` still rejects any new near wall; the `none` branch for `mid <= 0` is correct), 3D `faceDrop` (a face's nearest point is its top edge, matching the spherical near radius). I found no counterexample that hides a real arc: every rule that drops a flag either needs the face beyond reach / beyond 1.2 m in 3D, or leaves a visible `none` / `dim` row. The mess (44) is the one remaining lit double-wall arc; decided as a 1.7 m room, fine.
- Gameplay: no route or stealth break from dx. Dark pockets: S1 and S2 pocket tests unchanged vs base (S2 has none failing). S3: see polish 3.

## Polish

1. Audit: ignore solids thinner than ~0.15 m in plan (posts, pipes, rails) in `nearestWall`; today a 5 cm post counts as a wall (item 2) and the 24-ray scan will keep proposing moves for poles.
2. Audit `crowds`: `foot` ignores `fixture.yaw`; a strip or bulkhead at yaw PI/2 swaps its footprint. Not hit today (strips are yaw 0).
3. S3 pocket "the east bay by the plant room" (21, 1.5): 0.404 on base, 0.545 now (limit 0.3). Cause is lamp 87's move (22.15, 3.4), checked by reverting it (0.408). The move is needed (23.2 was 0.29 m off a face), so LR16g should cut 87's intensity or radius; the pocket test already failed on base.
4. S3 hall columns: 80 at x 18.26 vs 86 / 92 at 18 (0.26 m jog); dead 81 stays at 23.2 while 87 / 93 / 103 sit at 22.15. The row z -2.6 ends 1.05 m off its column. Move dead 81 to 22.15.
5. Warehouse 11 at z 3.8: the unlit strips (0, 3) and (18, 3) of the same row stay at z 3, a 0.8 m jog in the roof grid. Move them to z 3.8 too (they sit 0.8 m off the girder as well).
6. Warehouse 0 (door lamp): now 1.2 m off the gatehouse face with no mount (it was 0.35 m, also unmounted). Better: re-site as a wall fitting on the gatehouse and dim it.
7. Plant deck x spacing 4 / 5.2 / 2.8 (lamp 20 at 4.2) and void panels x -5.3 / -1.1 / 3.1 / 6.65 (4.2, 4.2, 3.55): rows aligned, columns uneven. Dead lamps 18 / 19 / 32 / 48 / 93 / 103 moves in dw were not needed; harmless.
8. `scripts/lamp-audit.mjs` marks 44 decided; also record that the dw moves 115 / 118 / 62 should be reverted (this check).
