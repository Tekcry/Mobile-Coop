# guard-ai mill-hunt H1: report
Owner: Guard AI Build. Status: current.

Slice H1 of `PLAN.md` (the hunt's map data). Branch `feature/guard-ai-mill-hunt-h1` (from `feature/guard-ai-mill-hunt`
be6ac30a1), code commit 068cf7cb5. Files: `src/world/maps/thornbeckMill.ts` (`THORNBECK_HUNT`, one line on
`THORNBECK_SECTORS[0].hunt`), `tests/thornbeckMill.test.ts` (one new `describe`). Types in `sectors.ts` untouched.

## Stops per room
| Line | Room | Stops |
| --- | --- | --- |
| ground (y 0) | startBay | 3 |
| | aisle | 3 |
| | millBay | 3 |
| | sackBay | 3 |
| | office | 3 |
| | lobby | 2 |
| | total | 17 |
| gallery (y `DECK_Y`) | landing | 2 |
| | stairHead | 2 |
| | craneWest | 1 |
| | craneEast | 1 |
| | eastWest | 2 |
| | eastEnd | 2 |
| | total | 10 |

Phases exactly as the PLAN: `startBay/stairHead`, `aisle/craneWest`, `millBay/craneEast`, `sackBay/eastWest`,
`office/eastEnd`, `lobby/eastEnd`.

## How the spots were derived
- Free floor read from the map's own boxes (`buildPath`, `buildGallery`, `buildMachinery`): the bins, sack walls, low
  sacks (Sa, Sb1, Sb2, Sd1-Sd3), M1, the desk, the office and lobby walls, the gallery rail (z 15), the crane bar, GS1-GS3,
  the hatch rails. A spot sits in the open floor with margin; the gallery band is z 15.6 - 16.8 (rail to wall, less the
  stacks).
- Each stop is two spots 1.1 - 1.3 m apart (the test band is 1.0 - 1.5); adjacent stops 2.6 - 4.0 m apart (band 2.5 - 4.5).
  The ground line runs west to east: north of W1, east of W1, aisle (3), round M1 (south, east, north), the sack bay in an
  arc to the office west door, office west door / south of the desk / north door, lobby, ladder foot. The gallery runs from
  the hoist door east to the hatch.
- Aims are yaws from the stop's centre to a named target (a corner, a cover back, a doorway, a hide spot), computed once
  with a scratch script and written as literals (2 decimals), sorted ascending. Every stop has an aim within 100 degrees of
  the line towards each neighbour (checked once by a scratch test, not committed), so H2's "outside the target room use only
  aims on the target's side" always has one.
- Hide spots (all six aimed at, each from a stop within 8 m): Sa from start bay stop 3 (5.6 m); Sb2 from aisle stop 3;
  the bin-row niche from mill bay stops 2 and 3; the desk spot from office stops 1 and 2; GS2 from craneEast and both
  eastWest stops; GS1 from both landing stops.
- Fold-in 1: G1 (7.5, 8.9) and G2 (8.3, 7.9) have the line's first two stops (north of W1, east of W1) nearest. Their aims
  are north, north-west, north-east and east, none within 40 degrees of any point of the run (start2, start, Sa). The Sa aim
  comes from the third stop, which G1 + G2 do not start at.
- Fold-in (check 2, 1): every gallery stop has a south aim (cos(yaw) < -0.7); the stair head also aims at the stairwell,
  the landing at the hoist door, the last gallery stop at the hatch (yaw 2.07), the lobby at L1 and at the office north door.

## Tests (`tests/thornbeckMill.test.ts`, "the hunt data", 10 tests; the PLAN's H1 list)
1. Section carries `THORNBECK_HUNT`: two lines, floors, room ids, 14 - 18 ground and 8 - 12 gallery stops, room boxes.
2. `pt` / `pt2` 0.5 m clear (the file's `clearance`, floor `y`) and inside their room box, on the line's floor.
3. `pt2` 1.0 - 1.5 m from `pt`.
4. Adjacent stops 2.5 - 4.5 m; every `pt` / `pt2` on a walkable cell of the runtime nav grid within 0.6 m of the floor; a
   path exists between adjacent `pt`s and `pt2`s.
5. 2 - 4 finite aims.
6. A room's stops consecutive (one run per room, runs in room order), every room has a stop.
7. The phase rows are the PLAN's, each names a room of each line in line order, and never step back along a line.
8. Every hide spot aimed at (within 35 degrees of the bearing, from `pt` or `pt2`) from a stop of its storey within 8 m.
9. Final rooms: lobby aims at L1 and the door in, eastEnd at the hatch; stair head at the stairwell, landing at the hoist
   door; every gallery stop has a hall-facing aim.
10. Fold-in 1 as above.

Results (Windows, worktree): `npm run typecheck:fast` clean; `npx vitest run tests/thornbeckMill.test.ts` 43 passed
(33 before + 10 new, one fold-in 1 aim first failed at 0.67 rad from the run and was turned from -0.75 to -0.6); also
passing: `pianoNet`, `pianoScene`, `lightningOpenings`, `pianoIntro`, `prebakeMaps`, `sceneStorm`, `thornbeckBlackout`,
`thornbeckMillLight` (173 passed, 3 expected fail, all 9 files). No e2e, no `dev`, no full `check`.

## Counted lines (code, docs excluded)
`thornbeckMill.ts` +100 / -1 (about 60 of them comments and the doc block); `thornbeckMill.test.ts` +197. Total ~297
changed lines against the PLAN's ~350.

## Not met, or choices to know
- Ground has 17 stops, the PLAN says about 14. The aisle (9.4 m long) needs 3 for the 4.5 m limit, and the mill bay needs 3
  to go round M1 (the west corridor beside M1 is 1.5 m wide: a pair cannot stand abreast there).
- The aisle's room box is `[9.4, 0, 20, 5.2]` (the space plus its corner notch, `THORNBECK_NOOKS[0]`). The mill bay's
  bin-row niche (x 18.8 - 20, z 6.6 - 8) lies outside every box: a box is a rectangle and the niche touches the aisle's
  box and the mill bay's only at corners. It is aimed at (mill bay stops 2 and 3), never stood in. The stair-foot nook is
  outside the start bay box too (nothing walks there: the gate is bolted).
- Gallery pairs sit abreast across the band (z 16.7 / 15.6 and similar); at the two stops by GS2 / GS3 they stand
  diagonally (1.3 m) so both clear the stacks. `pt` is the north (wall-side) spot on the gallery, the west spot where a
  ground pair stands in a row, so "leader takes the left-hand aims" holds only in the loose sense the PLAN gives it.
- `pt` in the start bay's first stop is the west spot (4.6, 8.4) and G1 starts east of it: H2's admission may send him to
  `pt2` or the second stop, both aim away from the run.
- The e2e "no detection at the start" with the flag on is H3's to run; the data aims only north and east at the first two
  stops, with W1 between them and the players for most of it.
