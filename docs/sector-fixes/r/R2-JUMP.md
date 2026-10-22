# R2 jump - solo top-landing check (sector-fixes-r2 jump)

Status (2026-10-23): STOPPED, folded into the sector redesign (job lead). The helper (`soloTopLandingReach`,
`soloTopLandingThreats`) and its unit tests are green and reusable; the map change below is done and green in Vitest
(e2e not run).

Question: can one player run-jump from R2S's top (4.0) onto R3S's top (4.4) across the 3.0 m A3 gap (R3S's west face
is `noLedge`, so no grab; the risk is the capsule stepping up onto the top)? Answer: yes, by about 0.10 m (a conservative
bound, unprobed in the game). Fixed by widening A3 to 3.7 m.

## The model (`tests/helpers/soloJumpReach.ts`, `soloTopLandingReach`)
- Constants read from the tables: `LEAP.vy` 5.6, `GRAVITY` 18, top gear 4.0 m/s (`GEARS.stand`, carry 1.0, cap 5.0; air
  control 0.05 holds the pace), `MOVEMENT.maxStep` 0.42, `MOVEMENT.radius` 0.3.
- A jump from `from` lands on a top at `to` when the capsule meets the far face with the feet still at or over
  `to - maxStep` (the controller steps up the rest). Reach = pace x the last time the feet are at or over that height,
  plus a radius past the take-off edge and a radius to the far face.
- 4.0 -> 4.4: threshold 3.98, t = 0.626 s, travel 2.50 m, reach **3.10 m**. 4.0 -> 4.5: 3.05 m (raising R3 to the band's
  top does not fix it). 4.4 -> 4.4 (R3N <-> R3S, 3.0 m across the lane in z): 3.36 m, so R3N reached alone would also
  give R3S.
- Conservative: the take-off at the very edge is granted (a press within 0.75 m of it is a drop, `TraversalController.probe`,
  unless the stick points along the edge in the press frame: then a leap with the run's velocity), and an air-borne
  step-up is granted. The running hop (speed > 3.5) needs the far floor within 0.35 of the feet; 0.4 is outside it.
- Mantle on landing short: only from a grounded spot; the A3 floor is 4.4 under the top (over the 1.8 mantle): none.

## The fix (`src/world/maps/warehouseS2.ts`)
- `S2_R3_WEST = -9.8`: both R3 blocks' west face moves from x -10.5 to -9.8 (R3S and R3N: R2N -> R3N is the same 3.0 m
  gap). A3 is 3.7 m; the reach 3.10; margin **0.60 m** (the brief's 0.5). The row is 1.6 m deep (was 2.3: the rope's 1.0
  minimum holds). The east face (C1b's lip at x -8.2, the gangway, the picker's leg, the landing C2) is unchanged.
- Kept: C1b (the leg-up spot, the lip, the climb-up stand, the walk off the west edge to A3), the nav seeds (-9.35 is on
  the narrower top), every guard path (A3 only gets wider; the driver walks x -11.6). The section 2 light test passes.

## Tests
- `tests/soloJumpReach.test.ts` (new): the reach against the tables written out, the 3.10 / 3.05 numbers, the
  never-reaches case, monotonic in the far top's height, and `soloTopLandingThreats` on built boxes (3.0 m lands, 3.7
  clears with 0.5, a wall stops it, a `noLedge` top over the mantle and a low top are no take-off).
- Every co-op-only top the section tests check with the grab helper now also gets the top-landing check with 0.5 m to
  spare: S1 the plant-door sill (yard side), S2 R3S, R3N and the landing (C2), S3 the valve and the drive platforms. Before
  the fix only R3S / R3N failed (R2S at 3.01 m against 3.10 + 0.5).
- e2e (`scripts/e2e-sectorops.mjs` part 2, not run here): "S2 R2S to R3S top" and "S2 R2N to R3N top", a top-gear run off
  R2's top with the press 0.8 m before the edge and the edge take-off (stick along the edge in the press frame) at 0.3,
  0.15, 0.02 m: never stands on R3 nor holds a grip.

## Polish list (not fixed)
- S3 crane drive platform: the drive motor box and the hanger rods clip into each other on the platform (visual only).
