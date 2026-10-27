# guard-ai mill-hunt: H2 report (the hunt board)
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5, 2026-10-27. Branch `feature/guard-ai-mill-hunt-h2` (from `feature/guard-ai-mill-hunt` be6ac30a1).
Files: `src/ai/millHunt.ts` (new), `tests/millHunt.test.ts` (new). The hunt types are imported from
`src/game/sectors.ts` (lead commit be6ac30a1), unchanged. No runtime caller yet (H3 wires it), so it ships dark.

## API (`src/ai/millHunt.ts`)
- `HUNT` (:19): the constants below.
- `HuntMember` (:49): `alive`, `taken`, `pos {x, y, z}`, `level: AlertLevel`, `slotIdx`, `pairSlot`, all readonly. An
  `Enemy` fits it structurally (getters `alive` / `level`, field `taken`, `pos: Vector3`, `slotIdx`, `pairSlot`).
- `HuntOut<M>` (:61): `out(m, x, z, face, speed)`; `face` is NaN while he walks.
- Unit states (:63-72): `H_SPREAD`, `H_REGROUP`, `H_MOVE`, `H_CLEAR`, `H_HOLD`, `H_LOOP`, `H_CHECK` (H4), `HUNT_STATES`.
- `new HuntBoard<M>(def, out, startX, startZ, cap = 24)` (:87, :180): built EMPTY. Phase 0's targets are each line's
  phase room stop nearest (startX, startZ) (the mill: W1 5.5, 5.25). Everything is allocated here (typed arrays, one
  `ms` array); nothing after.
- `admit(m): boolean` (:548): every guard who joins (the spawn after the dark, a late spawn, a rejoin after a fight).
  False when he is down / taken / `alert` or the board is full.
- `tick(dt)` (:936): the 0.2 s board tick; writes every on-board member's goal through `out`.
- `setTarget(x, z, y)` (:814): for H4 (contact call, body found, fight's end).
- Read-only views for tests / H3 / H4: the typed arrays (`uState`, `uFrom`, `uTo`, `uWant`, `rank`, `tgt`, `tgtGen`,
  `done`, `mFrom`, `mTo`, ...), `unitOf(m)`, `member(i)`, `ranked(l, k)`, `lineUnits(l)`, `roomLoad`, `roomSpace`,
  `gapFree`, `canStep`, `aimMask`, `lineHeading`, `lineDist`, `stopDist`, `stateName`, `allCleared`.

## Rules (file:line in `src/ai/millHunt.ts`)
- Build (:180): stops numbered over all lines in walking order; rooms numbered in the order the line enters them, so a
  line's rooms are consecutive and ordered along it; `arc` = line distance; `hUp` / `hDn` = the line's heading each way.
- Admission (:548): line by nearest `floorY`, nearest stop (ties: lower index), a solo unit in `clear` at that stop;
  pairs by the map's pair data (either member naming the other, `pairOf` :1140) when the partner is on the board as a
  standing solo on the same line (`tryPair` :671), else retried every tick (:943-948); then the start spread on his
  room (`spreadRoom` :614). A rejoin is the same call: the board keeps his index, so his partner link survives.
- Start spread (FIX 2) (:614-667): while a room holds more than `roomCap` (units already spreading out of it not
  counted, `stayLoad` :449), its lowest-ranked solo (else lowest-ranked unit, `lowestIn` :623) goes one room on away
  from the target (in the target room: towards the line's longer end, `awayDir` :637). A room on the way without space
  first sends its own lowest-ranked unit one room on, recursively (`spreadUnit` :651). The spreading unit walks stop by
  stop; steps inside its room are free; it enters the next room only when that room has space (`spreadStep` :1112), so
  the cap holds by positions while the room it leaves empties. Results: 12 set G3 -> aisle; 16 set G8 + G9 -> craneEast,
  then G10 -> craneWest (as PLAN).
- Regroup (A6) (:671): the member nearer the target walks stop by stop to his partner's stop (`regroupStep` :1122);
  the partner holds his aims. It starts only when every room on the walker's way (meeting room included) takes one
  more; those rooms are then kept for him in `roomLoad` (:431), so he never waits and never deadlocks a room. If they do
  not have space, both go on as solos and the pair retries each tick.
- Order (A4, FIX 1) (:769-835): a stop is `done` when a unit finishes a full aim cycle at it while it is in its line's
  target room (`onCycleDone` :1020). The phase steps when every line with a live unit has its target room all done and
  `phaseMin` has run, or at `phaseMax` (`orderStep` :781); the new target = the new phase room's stop nearest the
  previous target (`stepPhase` :787); the last row holds. `setTarget` (:814) as PLAN; a room no row names (the landing)
  gives phase 0. No player position is read anywhere.
- Rank (FIX 2, check 2 item 1) (`rankLine` :500): per line, class 0 = a unit that has reached the target and loops the
  target room, class 1 = every other unit in the target room, class 2 = the rest; within a class nearer along the line
  first; ties the lower unit index. A unit's place is `uTo` (the stop it stands at or walks to; a regroup: the meeting
  stop). Recomputed every tick into kept buffers (insertion sort).
- Step (A6) (`canStep` :487): `gapFree` (:469) counts only higher-ranked units (any member's from / to stop within
  `gap` of the new stop blocks); on entering a new room `roomSpace` (:464): `roomLoad` (guards standing in its box, or
  walking to a stop in it, or a regroup walker whose way crosses it) + this unit's size <= `roomCap`.
- States (`decide` :1028, `stepOrHold` :1054): `move` = one leg towards the target, then `clear` (aims at `aimHold`);
  a unit that may not step goes to `hold` (aims again at `holdAim`) and asks again every tick; at the target (or once it
  reached it in this target room) `loop` (`loopNext` :1083): the room's stops in line order, turning at the room's ends,
  every stop cleared on the way back too (check 2 fold-in 6), never into a higher rank's gap or onto a stop another unit
  holds. `spread` and `regroup` above. `check`: H4 only; the hook points are `advanceUnit` :982 and `decide` :1045, and
  `lowestIn` already skips a checking unit.
- Aims (A8, A9, fold-in 9) (`aimMask` :843, `startCycle` :864): outside the target room only aims within `aimSide` of
  the line towards the target (none: the nearest one); in the target room those plus the first aim outside (at most one
  look back a stop). Pair: the leader (lower slot, spot `pt`) the even ones of that list, the partner (`pt2`) the odd
  ones (none: the first). Each aim = the calm turn onto it (`sweepTurnTime` from the board's last yaw) + the hold
  (`advanceAims` :903). Legs face along the line (face NaN, the body follows the walk).
- Tick (:936): drop members down / taken / `alert` (`drop` :734: the partner goes on as a solo with the leader's spot;
  a regroup ends where it is); arrivals (a member is in when within `arrive` of his spot) and aims; the order; rank; pair
  retries; decisions per line in rank order (higher ranks first, so lower ranks see their new stops); goals out (`emit`
  :1133).

## Constants (`HUNT`, :19)
| name | value | why |
| --- | --- | --- |
| pace | 0.45 | A3 |
| aimHold | 1.5 | A8 |
| holdAim | 2.5 | A9 |
| gap | 6 | A6 |
| roomCap | 2 | A6, Michael "not bunch up into groups bigger than 2" |
| phaseMax | 120 | A4 |
| phaseMin | 60 | check 2 fold-in 2: about what a pair takes to walk into a 2-3 stop room and clear it (a ~3.5 m leg is ~8 s at 0.45 m/s plus the turn; 2-3 aims at 1.5 s plus turns ~6-9 s a stop). The six rows reach the last no sooner than 5 min, no later than 10 min. Prototype value (A16). |
| checkLook / checkPan | 4 / 0.7 | A10 (H4; unused in H2) |
| arrive | 0.5 | PLAN |
| aimSide | 1.75 | A9 (100 deg) |

## Tests (`tests/millHunt.test.ts`, 21 tests, all pass)
- Test def `TEST_HUNT` (:46): two lines shaped like the mill. Ground: 14 stops through `THORNBECK_SPACES`' six boxes;
  gallery: 10 stops through the six gallery rooms at `DECK_Y`; the PLAN's six phase rows. Aims per stop: two forward,
  one side, one back (the side aim is hall-facing on the gallery). Guard sets `SET_12` / `SET_16`: `THORNBECK_GUARDS`'
  start spots and pairs (G3 in the start bay, G4 in the aisle, G5 in the sack bay, G8 + G9 + G10 at the stair head,
  G15 + G16).
- Sim (`HuntWorld` :180, `runHunt` :260, `endState` :395): a function of (HuntDef, guard set, opts): built empty,
  admitted in spawn order at t = 0, `late` joiners, `rejoin` (level `alert` off, `searching` + `admit` on). Straight legs
  at the goal's pace, the calm turn rate (60 deg/s). Checked every 0.2 s step: the cap by member positions from t = 0
  (a room an admission put over may only fall and is at 2 within 15 s); line distance to target never grows outside
  spread / regroup / loop / a target step; no unit holds while its wanted stop is free of higher-ranked units and its
  room has space (checked right after the tick, on the positions the board decided on); move-leg reversals per member;
  at the end every live unit in its final room or within `gap` + 4.5 m of the unit ranked ahead, every member of those
  facing within 100 deg of the line towards its line's end.
- Unit tests: order (phase 0 targets, phaseMin step, phaseMax step, the last row holds, `setTarget`); rank (in-room
  above outside even when farther, the looper first, check 2 item 1); step (gap only higher ranks, the cap counts guards
  walking in, pair vs solo); admission (12 set spread and regroup, 16 set cascade, late joiner, down / taken partner,
  fight rejoin re-pairs); aims (side filter, one look back).
- No allocation: `bytesPerCall` (as `tests/aiSeeded.test.ts`) over 2000 ticks a round of 16 guards (walks, clears,
  holds, loops, phase steps) with the sim's integration: 0 B per tick (bound < 16).

## Sim results (test def, 15 min, no trigger)
| | 12 | 16 |
| --- | --- | --- |
| start over the cap (positions) | startBay 3 | startBay 3, stairHead 3 |
| back to 2 | startBay 1.0 s | startBay 1.0 s, stairHead 10.4 s |
| phase steps (s) | 60, 127.6, 187.6, 247.6, 308.2 | 60, 127.6, 187.6, 247.6, 307.6 |
| cap / growth / deadlock fails | 0 | 0 |
| most reversals of one member | 1 | 1 |
| end state fails | 0 | 0 |
| longest single hold (s) | 623 | 893 |
| with a late G3 (20 s) and a G8 fight (100-160 s) | all checks pass | all checks pass |
| two runs | identical | identical |

End state (rank order): 12 ground lobby loop (1), office hold (2), sackBay (1), millBay (2); gallery eastEnd loop (1),
eastWest (2), craneWest (1), landing (2). 16 ground lobby (1), office (1), sackBay (2), millBay (1), aisle (2); gallery
eastEnd (1), eastWest (1), craneEast (2), craneWest (1), stairHead (2), landing (2).

## Counted lines (excluding docs)
`src/ai/millHunt.ts` 1142 (901 without comments and blanks), `tests/millHunt.test.ts` 784 (689): 1926, against the
PLAN's ~850. The extra: typed-array state for allocation-free ticks (~150 lines of fields and allocation), the spread
cascade, the regroup room reservation and the sim's checks. PR 1 (H1 + H2) lands near 2.3k; the lead decides whether to
split.

## Notes for the checkers
- Check 2 item 1 (a lower rank blocking the top rank): met by rank classes (`rankLine` :500) and `gapFree` counting only
  higher ranks (:469). Test "check 2 item 1" (pair in millBay, pair in the aisle, target moved into millBay): the inside
  pair keeps rank 0, reaches the new target within 30 s, the outside pair holds on the full room (`uWant` = the room's
  stop). The sims' no-deadlock check reads "wanted stop free of higher ranks and its room has space" every step: 0
  fails. A cap hold by a lower-ranked unit cannot form a cycle: rooms between a unit and its target hold only nearer
  (higher-ranked) units, except spread / regroup walkers, which have their rooms kept or wait only for rooms being
  emptied by a cascade that ends at a room with space.
- Check 2 item 2 (spread on an empty build): the board is built empty and every join goes through `admit`, which
  spreads that room at once (:603-605); the sims start empty and admit in spawn order; a late joiner (G3 at 20 s) and a
  fight rejoin (G8 100-160 s; G11 in the unit test) pass every check. A fighter (`level === 'alert'`) is dropped from
  the board on the next tick (his partner goes solo) and must be admitted again by H3 / H4 at the fight's end.
- The board reads its own members' positions (arrival, the room cap's "standing in it"), never a player's.
- No stuck timeout: a member who never reaches his spot (a nav failure in the game) keeps his unit standing; lower ranks
  queue behind it. H3 should watch this in the manager run (goTo replans once a second).
- The facing check of the end state applies to units outside their final room; a looper in the final room may be on its
  one look back.
- Check 2 fold-in 1 (a hall-facing aim on each gallery hold stop) is H1's data: the test def has one (the side aim), but
  the sim does not assert it; the lead should add it to the real-map sim.
- 16 guards saturate the gallery: six units on ten stops, so the landing pair (G11 + G12) holds on the landing for the
  whole run (correctly, on the gap to the stair head pair). That is the "cordon" risk of the PLAN; name it on the walk
  card.
- `runHunt` / `endState` / `HuntWorld` / `TEST_HUNT` / `SET_12` / `SET_16` are exported from the test file. Importing
  them into another test file also registers this file's tests there; when the lead adds the THORNBECK_HUNT sims, move
  the helper to `tests/helpers/` (H2 was limited to two files).

## Real-map sims
Lead finishing step for PR 1 (Opus 5.5, 2026-10-27). The sim helpers moved to `tests/helpers/millHuntSim.ts` (no
assertion change; `runHunt` gained an `onStep` hook, `:239`, `:357`). `tests/millHuntThornbeck.test.ts` runs the same
checks on `THORNBECK_HUNT` with the scene's guard lists: `THORNBECK_GUARDS` (12) and `THORNBECK_GUARDS_16`, each guard
at his slot's x / y / z with his `pair`, admitted in list order on an empty board (the scene's spawn: `spawnBeat` ->
`SectorMode.sceneSpawn` -> `fill`, `placeSlot` sets `slotIdx` / `pairSlot`). Straight legs as H2's sim (the helper has
no nav grid; H1's tests check the walks between adjacent stops on it). Added: plan check 2 fold-in 1, as data (every
gallery stop's usable aim set, both ways, in and outside the target room, holds a hall-facing aim) and as behaviour
(every gallery hold of 30 s or more had a member facing the hall).

| | 12 | 16 |
| --- | --- | --- |
| start over the cap (positions) | startBay 3 | startBay 3, stairHead 3 |
| back to 2 | startBay 1.0 s | startBay 1.0 s, stairHead 10.6 s |
| start spread | G3 -> aisle | G3 -> aisle; G8 + G9 -> craneEast, G10 -> craneWest |
| phase steps (s) | 60, 125.0, 187.0, 247.0, 307.6 | 60, 125.0, 187.0, 247.0, 320.4 |
| cap / growth / deadlock fails | 0 | 0 |
| most reversals of one member | 1 | 1 |
| end state fails | 0 | 0 |
| gallery holds facing the hall | all | all |
| longest single hold (s) | 866 (landing pair) | 882 (landing pair) |
| late G1 (12 s) + G3 (20 s), fights G8 100-160 s + G5 200-260 s | all checks pass | all checks pass |
| two runs | identical | identical |

End state (rank order): 12 ground lobby loop (1), sackBay hold (2), millBay (1), aisle (2); gallery eastEnd loop (1),
eastWest (2), craneWest (1), landing (2). 16 ground lobby (1), sackBay (1), millBay (2), aisle (1), startBay (2);
gallery eastEnd (1), eastWest (1), craneEast (2), craneWest (1), stairHead (2), landing (2).

Data changes (`src/world/maps/thornbeckMill.ts`, `THORNBECK_HUNT`); no board rule change:
- `:279` craneWest stop x 14.1 -> 13.6 (aims unchanged: cardinal). G8 + G9 start at x 12.5 in craneWest, but G8 was
  1.94 m from both the stair head's east stop (10.9) and craneWest's (14.1); the tie went to the lower index, so the
  pair was admitted to the stair head (G10's room) and walked into it: 3 by positions for 1.4-7.2 s (12 set), 5 at
  1.4 s and over for the rest of the run (16 set). Now craneWest's stop is nearest by 0.4 m (G8) / 0.5 m (G9).
- `:242` aisle east stop x 18.4 -> 17.9, two aims re-aimed from the new centre (the Sb2 hide spot -0.05 -> 0.19, M1's
  north-west corner 0.92 -> 0.99). 16 set: the aisle solo (G3) queues at the aisle's east stop behind the millBay pair,
  and the start bay pair may not join a solo in the aisle (cap 2), so it held at the start bay's south stop 10.9 m
  behind him, past the end state's `gap` + 4.5 m (10.5). Now 10.4 m. Stop spacing stays in band (aisle 2.55 m to the
  middle stop, 3.9 m to the mill bay); `tests/thornbeckMill.test.ts` passes unchanged.

For the checkers and the walk card:
- The 16-set end-state margin is 0.1 m (10.4 of 10.5): a solo in a long room ahead of a pair spaces the queue by
  roughly a room, not by `gap`. It is the cap rule working; a later stop move in the aisle or the start bay should
  re-run this file.
- The landing pair (G11 + G12) holds the landing for the whole run in both sets (the stair head pair / solo ahead
  within `gap`): the PLAN's "cordon" risk, now on the real data for 12 as well as 16. It faces the hall (fold-in 1).
- The sim's legs are straight; a real walk through a door (sack bay -> office west door, office -> lobby) may cross
  another room's box for a moment. H3's e2e "no room above 2 over 60 s" checks the real paths.

Verify: `npm run typecheck:fast` clean; `npx vitest run tests/millHunt.test.ts tests/millHuntThornbeck.test.ts
tests/thornbeckMill.test.ts`: 73 passed (21 + 9 + 43). With the map data before the fixes, 6 of the 9 new tests fail.

## Fix round (check A)
Builder: Opus 5.5, 2026-10-27, on `feature/guard-ai-mill-hunt` (from decef4d1f). Lines are `src/ai/millHunt.ts` unless
named. Commits fd6123807 (sim check), 91200c9b3 (board), 1f336c38c (hand-off, freed indices).

- **FIX 1, groups of at most 2.** `HUNT.apart` 4 m (:53, the reason beside it: a paired takedown is not watched from
  3 m; 4 not 3 because `pt2` stands about 1 m off `pt`). `loopNext` (:1209) refuses a stop that `crowds` (:1231): the
  looper's members plus other units' members (any rank) whose stop (at or walking to) is within 4 m make more than 2, or
  the one guard there already has another within 4 m. All loop steps blocked: it holds and clears where it is. Two
  solos may still stand 4 m apart (a group of 2). The lead's wording (any other unit within 4 m) was tried: the same sim
  results, but it also blocks solo next to solo and the rejoin unit test then needs a 170 s re-time, so the group rule
  was kept. Side effect fixed in `onCycleDone` (:1141): the looper could no longer reach the target room's stop nearest
  a unit waiting next door, so phases 0-2 ran to `phaseMax`; a full cycle outside the target room now also clears the
  target room's stops within 4 m (outside it a unit's aims face the target). Phases step at `phaseMin` again.
  Tests: "the looper never steps into a group above 2 ..." (`tests/millHunt.test.ts:227`), "two solos may stand near each
  other ..." (:251). No test re-timed; no assertion loosened.
- **Other states.** The sims now check positions every step (below): spread, regroup, move, hold and admission show no
  group of 3 in the no-trigger runs, 12 and 16, test and real data, with late joiners and rejoins. Not closed, for H4:
  after a `setTarget` jump a unit that ranks first in the new target room can walk (move) up to a unit holding just
  across the room edge. Scratch probe, every stop as a jump target every 70 s, 3 runs each: 3 / 4 / 1 / 4 such episodes
  (test 12 / test 16 / real 12 / real 16). Blocking the move lets a lower rank stop the top rank (fails "check 2 item 1",
  `tests/millHunt.test.ts:152`, and the no-deadlock check); a one-stop step back by the lower unit was tried and was
  mostly blocked by the queue behind it (16 guards fill the gallery). H4 should decide with `setTarget`.
- **Sim check** (`tests/helpers/millHuntSim.ts`): `CLUSTER` 3 m (:235); `clusterCheck` (:335) every step, by positions:
  no guard has 2 or more others of his line within 3 m; a group with a guard admitted within `SPREAD_WIN` 15 s (:233,
  the cap check's window: the start spread, a late joiner, a rejoin) is skipped. Report field `maxNear` (0 when no group of 3). Before the fix
  it failed 8 sim tests (e.g. real 12: G8 + G9 + G10 at 21.4 s, G1 + G2 + G3 at 15.2 s).
- **Polish 1** (:640): a second solo admitted to a stop takes its free partner spot (`pt2`); a solo's next leg puts him
  back on `pt`. Test "a second solo admitted to a taken stop ..." (:406). Left: in the real 16 set G15 + G16 pair at the
  stair head stop where G10 already stands: G15 shares G10's `pt` for 0.2-8.0 s while G10 spreads out (three guards,
  two spots; inside the start window). No other shared goal in any sim.
- **Polish 4** (:956): `uBack`: the one look back is used once per stop visit; later hold cycles there leave it out
  (cleared by the next leg). Test "a unit holding in the target room has its one look back once ..." (:456).
- **H3: a woken guard re-pairs** (`admit` :596, :599; `free` :810): a dead or taken member off the board frees his
  index and his partner's link on the next tick, so a woken guard (a new object) pairs again by the map's pair data; if
  he is admitted before that tick, he takes over the old object's index by `slotIdx`. Test "a woken guard ..." (:351).
- **H3: freed indices** (`tick` :1030): a guard is still admitted after 30 kill / revive cycles (half with a slot index
  the board never saw). Test "a dead or taken member frees his board index ..." (:383). A fighter (`alert`, alive) keeps
  his index for his rejoin.
- **H3: stuck watch** (`HUNT.stuckT` 8 s, `stuckGain` 0.1 m, :60; `watch` :1053; `mSkip` :175): a member whose best
  distance to his spot does not shrink by 0.1 m for 8 s gives the spot up: he counts as arrived, his goal is where he
  stands, his unit clears the stop from there (marking it done in the target room) and steps on; the next leg resets it.
  Why 8: `goTo` replans once a second; a walkable leg gains 0.45 m a second; shorter than one hold cycle. Test "a member
  who gets no nearer his spot for stuckT ..." (:419). Never fires in the sims (0 skips). H3: still watch for it in the
  manager run (a skip shows as `mSkip[i]` 1).
- **H3: goal hand-off without allocation**: `gx` / `gz` / `gface` / `gspeed` (:159), written by `emit` (:1293) every
  tick for every on-board member. H3 reads after `tick`: for each guard, `i = board.memberIndex(guard)` (cache it at
  `admit`; it is stable until he is dead / taken and off the board), and if `board.mOn[i]`, goal (`gx[i]`, `gz[i]`),
  face `gface[i]` (NaN while walking), pace `gspeed[i]`. The `out` callback is now optional (pass `null`); the sims read
  the arrays (`HuntWorld.handoff`, millHuntSim :196). The allocation test now includes the hand-off: 0 B per tick.

Notes for H4 (check A polish 5): the board has no entry point for a glimpse or a sound yet (add e.g. `cue(m, x, z)`
beside the `H_CHECK` hooks in `advanceUnit` / `decide`), and a check needs a goal off the stop spots (`emit` sends
`spotX` / `spotZ` or, since this round, the member's own position when `mSkip`; `roomLoad` counts `mTo` stops).
Note for H3: a guard who never reaches his spot no longer holds the phase until `phaseMax`: the stuck watch moves his
unit on after 8 s; watch for skips in the e2e (each one is a stop the nav could not reach).

| (test def / real `THORNBECK_HUNT`, 15 min, no trigger) | 12 | 16 |
| --- | --- | --- |
| start over the cap | startBay 3 / startBay 3 | startBay 3, stairHead 3 / the same |
| cap / growth / deadlock / 3-within-3 m fails | 0 / 0 | 0 / 0 |
| groups of 3 within 3 m after the window (`maxNear`) | none / none | none / none |
| phase steps (s) | 60, 120, 180, 240, 300.6 / the same | 60, 120, 180, 240, 300.0 / 60, 120, 180, 240, 313.4 |
| most reversals of one member | 1 / 1 | 1 / 1 |
| end state fails | 0 / 0 | 0 / 0 |
| longest single hold (s) | 641 / 668 | 893 / 882 |
| stuck skips | 0 / 0 | 0 / 0 |
| late joiners + fight rejoins | all checks pass | all checks pass |
| two runs | identical | identical |

Verify: `npm run typecheck:fast` exit 0; `npx vitest run tests/millHunt.test.ts tests/millHuntThornbeck.test.ts
tests/thornbeckMill.test.ts`: 80 passed (28 + 9 + 43); eslint on the three changed files clean. Not run: `npm run dev`,
e2e, full `npm run check`.
