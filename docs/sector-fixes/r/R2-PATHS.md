# R2-PATHS - true 2-player team doors (stopped, folded into the sector redesign)

Item (3) of sector-fixes-r2. Michael (2026-10-23 ~00:45): "true 2-player pathways that cannot be used solo, but doesnt
break solo play" (M2; replaces A2 "extras" for the doors). Stopped by the job lead before any code: Michael folded it
into a full sector redesign. No src, test or e2e change on this branch; it only fast-forwarded to
origin/feature/sector-fixes-r2 (the nav closure and the bolt span cap).

## The problem
Each bolt side is a core area a player alone reaches by the solo routes: S1 the mess (corridor door x 1.9-3.1, hatch h2
from the void, solo route 3, the CCTV operator's kettle stop (2.6, -9.9)); S2 the VNA aisle A2 (solo route 3, the tour
guard's loop); S3 the fire-exit lobby (the extraction box 21.4..23.7 x -8.5..-5.9, the fire door (16, -6.85), the lobby
roof hatch (22.5, -7.2), the tour guard clocks it). So a solo player gets to the bolt side, unbolts, and from then on
has the door as a shortcut. The solo ways round cannot be closed.

## Engine facts found (numbers)
- Climb-up onto a lip needs a standing body's room over the top: a ray from top + 0.1 to top + 1.8 (`climbRoom`,
  `MOVEMENT.standHeight` 1.75) 0.45 m + `HANG.out` inside the lip. A 4.4 lip needs clear air to about 6.2.
- Roof undersides: S1 halls 5.8 (roof plate top 6.0); S2 / S3 hall sheets collide at 6.03 (S2's strips z -6..-1.2,
  0..4.8, 6..10.8, 12..16.8 are visual only, no collision). So any 4.3-4.5 co-op top under a roof needs a hood
  (R1's sill, R3's platforms: underside 6.3) or an S2 visual-only strip.
- Mantle works on `noLedge` boxes up to 1.8 m; `noLedge` only stops grabs (jump-grab 2.7, wall jump 3.8, in-air
  `FALL_GRAB` 1.5-2.35 under the lip within 0.7 m). Fences are climbable alone (`FENCE`, flip over the top).
- Throw: lands 3.2 m past the thrower, apex 1.7 m: it cannot clear anything a solo cannot mantle.
- Low rooms: S1 mess ceiling 2.8 (void floor above, catwalk opening y 3.0-4.6 at x 8 right over the mess door, the
  catwalk y 3.0 at z -10.15..-8.95 is solo route 3); S3 plant room ceiling 3.6, plant roof 3.8 (solo by ladder 21.0,
  -2.0); S3 lobby ceiling 3.0, roof 3.2. S2's R1S rack round the through-bay has a solo 4.0 top (reachable from R1N by
  a running jump over the 3 m cross aisle), so no 4.4 element fits near it.
- `tests/sectorBolt.test.ts` (r2-bolt) asserts exactly three Warehouse bolts: a design adding bolts updates it.

## Designs weighed
1. **Pocket per door** (the previous session's plan): a sealed pocket P holding the bolt, entered by a leg-up onto a 4.4
   lip from the near side, the partner through the team door from P, out to the core room by a second door bolted from
   P (one-way). Works on paper, but no site fits as drawn: S1 (mess 2.8 high, catwalk overhead), S3 (plant / lobby 3.0-3.8
   high, the plant roof solo 0.6 m under any 4.4 lip), S2 (solo 4.0 rack tops beside the through-bay). Each would need
   the door moved, a hood through the roof and a second bolt; the climb-ups are unproven until the e2e runs.
2. **Pair bolt (what I would have built)**: the bolt opens only while the partner stands at the door on the near side
   (pushing it home: a drop bar that binds on a sagged leaf; real reason for 16.0). Alone it never opens, from either
   side; co-op it is exactly "one player on each side"; solo play is unchanged (no solo route or guard route uses a team
   door). No geometry, no new bolts, unit-testable.
   - Pure (`src/game/sectors.ts`, additive): `BOLT_PAIR_DEPTH` 1.5 m (partner 0..1.5 m out on the near side),
     along-plane cap `boltHalfSpan(b)` (r2-bolt's), height within `BOLT_PAIR_RISE` 1.0 m of the user (so the S1 catwalk
     over the mess door does not count); `partnerAtDoor(b, x, z)`; `SectorBolts.usePair(sec, k, user, mates)` returning
     ok / reach / partner / shut; `use` left as is.
   - Mode (`sectorMode.unbolt`): mates = the other alive player refs; on "partner" a feed line for the local user ("The
     bar binds - your partner has to push the door from the other side"); the item stays live.
   - Near-side partner spots: S1 workshop (8.8, 0, -10.0); S2 inside the through-bay (-18.5, 0, 0.6); S3 plant room
     (23.2, 0, -4.6).
   - Tests: a new `tests/sectorBoltPair.test.ts` (alone refused, partner on the bolt side / another floor / off the span
     refused, near side accepted, once only) and a data test that no solo route leg at floor height passes within 0.6 m
     of a team door. e2e part 2: the far side alone is offered Unbolt but refused, the door stays locked, the section
     still completes with it bolted (extraction for S3); co-op `teamDoor`: client unbolt refused with the host on the
     bolt side, accepted with the host moved to the near side.
   - Undo: drop the `usePair` call (back to `use`).

## Open for the redesign
- Pick 1 (an on-the-spot team move, needs geometry and a proven climb-up) or 2 (rule only) per team door, or put the team
  doors where a high pocket fits (an S2 visual-only roof strip or a hood).
- The client gets no feed line when the host refuses its use (no host-to-client feed message).
