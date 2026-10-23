# Slice 2 build report - S2 HQ atrium and offices (builder: Sonnet 5.5, 2026-10-23)

Branch `feature/sector-redesign` (head 95097957, master merged at f942df04). Nothing committed, no build, no e2e. Assumptions are
numbered L1.. for the lead to renumber (A69+).

## Result
Done: S2 is built in full as a greybox in `campusOps` (G, L1, L2, roof, the atrium void, two fire stairs, the feature stair, 12 guards,
3 cameras, 2 alarm panels, the BMS hack, C2 as a glazed bridge on L1). tsc, eslint and the vitest list pass. The e2e part is written and
`node --check` clean but NOT run.

## Files
New: `src/world/maps/campusS2.ts` (geometry, lamps, switches, rooms, hide spots, nav seeds, the stair flights, CR2), `tests/campusS2.test.ts`
(39 tests), this report.
Edited: `src/world/maps/campusSectors.ts` (S2 section, `S2_GUARDS`, `CAMPUS_POSTS['s2#11']`, 3 cameras, 2 alarms with an optional `y`, S3
stub start now the C2 checkpoint), `src/world/maps/campusOps.ts` (S2 shell and the ground C2 stub room replaced by `buildCampusS2`; rooms,
switches, hide spots, pickups, nav seeds merged; alarms carry `y`), `scripts/e2e-sectorops.mjs` (part 6), `changes/feature-sector-redesign.md`
(one line). Outside the owned list: `tests/campusS1.test.ts` (five asserts filtered to section 1 because the map now carries S2's cameras,
alarms, hide spots and guards; no S1 behaviour changed).

## Values the SPEC left open
- Floors G 0, L1 4.4, L2 8.4, roof 12.3. Slabs: L1 0.4 thick (bottom 4.0, so the ledge cutter sees flush neighbours of the CR2 piece), L2 0.2,
  roof 0.3; G partitions 0..4.0, L1 4.4..8.2, L2 8.4..12.0; outer walls 0.3 per storey, partitions 0.2. Roof parapet 1.1; roof-light rim 0.9
  (top 13.2), its lid a visual box with no collision; roof plant room x -20..-12, z 0..4.5, 2.6 high, door south.
- Rooms G: post room x -44..-30, z -30..-20 (SW core inside; door E at z -27 to the foyer, door N at x -36 to the mail room); mail / goods
  x -44..-30, z -20..-12 (door E z -16, goods door W (-44, -16) locked, unbreachable); lift lobby z -12..-4 (door E z -8; shaft block x -44..-41, dummy
  doors on its east face every floor); NW store z -4..6 (door E z 1); foyer x -30..-8, z -30..-23 (C1 far door at x -20, turnstile barrier at z -23,
  1.1 high, gates at x -24 / -20 / -16); hall and dark cafe x -30..-8, z -23..6 (+ NE lobby x -8..4, z -4..6); east plant room x -8..4, z -30..-4 (one door
  from the foyer at z -26).
- Rooms L1: SW lobby and west / north open plan; meeting rooms with glass fronts MR1 x -44..-36, z -20..-14 (opening z -17), MR2 x -44..-34, z 2..6 (opening
  x -39), MR3 x -26..-16, z 2..6 (opening x -21); south band z -30..-22.5: kitchen x -28.5..-21 (door W at z -26), print room x -21..-13 (door N x -17), meeting 4
  x -13..-7.5 (door N x -10); east wing behind the wall x -7.5 (doors z -21 and z -3): SE meeting room (door x -4.5), the bridge landing lobby x -2..4, z -16..-12
  (doorways W z -14 and N x 1), the comms room x -2..4, z -9..-4 (door W z -6.5), the facilities office x -7.5..-0.2, z 0..6 (door S x -4, glass x -7.2..-5), the
  NE core. L2: executive suite NW (doors z -4 x -33, x -30 z 1), board room NE, two offices S, the same wing wall.
- Fire stairs (dogleg, 2.6 x 5.6 clear): near landing 1.2 deep (every floor and the roof), half landing 0.8 (at 2.2 / 6.4 / 10.35), flights 3.6 long, rise
  2.2 / 2.0 / 1.95 per flight (slope <= 0.61, 31 degrees). SW: near end north, door in the east wall at z -23 (every floor + roof); NE: near end south, door in
  the south wall at x 1.5. Bulkhead roofs at 14.9. Feature stair x -19.2..-16.8, z -20..-11.9, 24 risers, up to the L1 south strip (balustrade opens there).
- CR2: lip x -10, z -11..-5 (6 m), normal -x, over the cafe's east end; boost at (-10.6, 0, -8); top = the L1 east strip x -10..-7.5; the piece x -10..-6 keeps
  its ledge, the rest of the slab and balustrade is noLedge; balustrade 1.1 with a 6.6 m gap (z -11.3..-4.7); planter trough x -9.3..-8.7 (0.5 back from the nose).
- Lamps (y absolute): atrium pendants `s2-atrium` 50 at (-22 / -18 / -14, 9.0, -17), r 12, 0.9 (south half only: the cafe stays dark); `s2-l1-bal` 51 and
  `s2-l2-bal` 52, six downlights each at (-22, -2.8), (-14, -2.8), (-27.2, -12), (-8.8, -12), (-22, -21.2), (-14, -21.2), y 7.9 / 11.9, r 5, 0.8; reception 53
  (-20, 3.9, -26.5); kitchen 54 (-25, 7.9, -26); facilities 55 (-4, 7.9, 3); corridor night lamps at 0.25: L1 56 (-3, 7.9, -1.5), L2 57 (-35, 11.9, -9), G 58
  (-28, 3.9, -14). Ambient 0.14 over the building, 0.30 in both cores and the bridge. Dark by reason: open plan, meeting rooms, print room, comms, cores, roof, plant room.
- Switches: reception panel (-8.4, 0, -28.5) on 50; L1 balcony (-38.8, 4.4, -24.6) and (2.4, 4.4, -0.6); L2 balcony the same at 8.4; kitchen (-27.7, 4.4, -24.4); L1
  corridor (-5.6, 4.4, -0.5) (lure #7).
- Guards (kind, slot, yaw, route, waits, cycle): #1 officer (-20, -24.9) N post. #2 grunt (-24, -24.8) <-> (-29, -8.5), waits 4 / 4, 42.4 s. #3 officer L1
  (-24.5, -2.7) <-> (-11.5, -2.7), 4 / 4, 35.8 s. #4 grunt L2 (-11.5, -21.3) <-> (-24.5, -21.3), 4 / 4, 34.3 s (starts at the opposite end). #5 grunt / #6 officer
  L1: one 4 x 3 m master-clock loop in the kitchen, period 34, leave [8, 17, 25, 34], rows z -27.5 / -26.5, facing 0 / PI. #7 officer L1 (-6.5, 2.9) <-> (-2.5, 4.2),
  waits 28 / 6, 43 s. #8 grunt L1 loop (-4, -1.5), (1, -6.5), (-4, -12), waits 3 / 7 / 3, 38.3 s. #9 officer L2 (-37.5, -23.5) <-> (-33.5, -8.5), 5 / 5, 43.2 s. #10 grunt
  L2 sweep (-35, -7) <-> (-33, -7), 12 / 12, faces -1 / +1, 28 s, dormant. #11 officer L1 post (1, -14) facing west (K2). #12 grunt post (-42.5, -16) facing east, dormant.
  Squads: reception 0 (#1, #2, #12), east wing 1 (#7, #8, #11), L1 balcony and kitchen 2 (#3, #5, #6), L2 3 (#4, #9, #10).
- Cameras: cam-turnstile (-29.7, -24.2) y 3.2 facing 90, aim 7, range 8; cam-lift (-31, -4.4) y 3.0 facing 250, aim 7, range 8; cam-bridge (3.7, -13) on
  level l1 (4.4), y 3.0 facing 270, aim 6, range 9. Alarm panels (-8.3, -24.4) and (3.7, -15.3, y 4.4).
- Objective hack (3 s) at the BMS terminal (-6.5, 4.4, 4.3) on the desk (the user stands on its south side, 1.4 m). C2: box x 4..10, z -16..-12, floorY 4.4, near door
  (4, -14), far door (10, -14), checkpoint (7, 4.4, -14, yaw PI / 2). Reinforce: (-40, -16.5) (the goods door) and (-36, -7) (the L2 lift lobby, see L4). Routes: stealth (SW
  stair, north open plan, east wing door, facilities), high (SW bulkhead, roof, NE bulkhead), loud (turnstile gate, feature stair, east wing south door).
- K2: `CAMPUS_POSTS['s2#11'] = { leash: 5, guards: 'c2-door' }` (`SquadSlot` has no `post` field, grep `post?:` in rooms.ts finds none). The card door's cell is 3 m behind
  him, inside the leash circle (the test asserts the leash edge is at least 1 m off it).

## Assumptions (L-numbered)
- L1 CR2 is on the void's EAST edge (x -10, z -11..-5, normal -x), not a north edge: the shared `CoopLip` shape holds a lip of constant x. The L1 slab is 0.4 thick for the
  same reason (the ledge cutter tests the face 0.3 below the lip: a 0.2 slab left slivers of ledge along the seams of the flush neighbours).
- L2 `campusS1.ts` is not edited: `CAMPUS_COOP_LIPS` (a `readonly` array there) gets CR2 pushed at the load of `campusS2.ts` (`(CAMPUS_COOP_LIPS as CoopLip[]).push`), and
  `S2_COOP_LIPS` is exported too. `tests/campusS1.test.ts` loops the shared list, so CR2 also runs the S1 CR checks on the whole map (they pass).
- L3 The goods door is in the WEST wall (locked, unbreachable): the HQ south face is the solid S1 pavilion (z -34..-30), so S1's dock door cannot lead in. It opens on S1's fenced
  west side, no way out.
- L4 `reinforce` has no `y`: the L2 lift lobby point (-36, -7) spawns on the lowest surface there, the G lift lobby (the L2 lobby is stacked over it); guards climb the SW stair.
- L5 C2 is built here as the SPEC says (L1, x 4..10, a floor slab at 4.4, walls 3.0, roof, a card door in the east wall); the ground stub room is gone from `campusOps.ts`. S3's
  stub shell still has its west door at ground level, so the bridge ends at S3's solid L1 wall until slice 3 builds the L1 door; the stub S3 starts at the new checkpoint (y 4.4).
  The stub nav seed (7, 0, -14) is replaced by (7, 4.4, -14) (it would have flooded the open ground outside).
- L6 Guard #9 clocks the SW fire door and the lift lobby only: the NE door is 45 m away, a 120 m round trip; the SPEC's "both fire doors in 44 s" cannot be walked. The L2 lift
  lobby is stacked over the G one (SW) and #10 sweeps it, so #9 and #10 overlap.
- L7 The kitchen is in the SW part of the south band (door onto the SW lobby), not over the foyer: guards spawn only 7 m (plan) from every player, and the C1 checkpoint is 4.5 m from
  the foyer's north half, so a kitchen over the foyer could not spawn at load. The pair #5-#6 walk one master-clock loop (no refill trip): they fail M8 isolation in time and are the
  recorded exception, as the S1 car-park pair.
- L8 The facilities glass is on the office's south wall (onto the wing corridor), not its west wall: with the glass on the west wall the L1 north ring saw 8 awake guards (A64).
  SPEC "#7 through the facilities glass from the SW stair door" does not hold; #7 is seen from the wing corridor.
- L9 An east wing wall (x -7.5, doors z -21 and z -3) holds the bridge landing, comms room, facilities office, SE meeting room and the NE stair, so the north and the void do not see
  them: the A64 sight breaker. The north open plan has two small glass-fronted meeting rooms and desks, no corridor lamp.
- L10 Glass fronts are fence panels 2.4 high with the top band open (SPEC / EW6 fallback); fences stop movement and are climbable (`fence` verb).
- L11 Fire stairs are doglegs (2.6 x 5.6 clear); each core has a door at every floor and the roof (the doors stack in plan: `Doors.pushOpen` and `nearest` read plan only). Emergency
  pools at the landings are not built: ambient 0.30 covers them (a lamp per landing would add 8 registry lights).
- L12 The atrium roof light: a 0.9 rim (noLedge) round the void on the roof, the lid a visual box with no collision. A player vaulting the rim falls 13 m (the void is open).
- L13 The pendants hang over the south half of the void only (and 9.6 m from the CR2 boost point), so the cafe is dark with the pendants on; the boost point reads under the shadow line.
- L14 The feature stair is built with `LevelBuilder.stairs` (steps do not collide, the ramp is pitched): it generates no ledge, which satisfies "noLedge". It is 6.9 m from the gap.
- L15 `kp-fac` is not built (EW5): the facilities door is a plain door. The code beat is cut.
- L16 The test's nav is built from the pieces like S1's (`analyticNav`) plus the stair ramps from `S2_FLIGHTS` (the pitched ramp pieces are skipped by the helpers). The real grid
  (Havok raycasts) was not run; the tests assume a ramp top is walkable (slope <= 0.61 per metre, 0.31 m per 0.5 m cell).
- L17 `CAMPUS_ALARMS` entries gain an optional `y` (alarm-brg is on L1). `S2_ROOMS` carry `minY` / `maxY` per floor (the HUD room lookup reads them).
- L18 cam-bridge's mount is (3.7, -13) inside the landing, 0.15 off the east wall face, above the card door's side.
- L19 The `tests/campusS1.test.ts` filters (cameras section 0, alarms section 0, hide spots z < -32, parapets z < -32, stubs from index 2) are the only S1-test edits.

## A64 (guard render budget)
Test: a 2 m grid over every walkable cell of G, L1, L2, roof, stairs and the bridge (the analytic nav, about 1,500 points); a guard is in view when any point of its post or route
(1 m steps) has a clear eye-height line (1.55 m) to the point within 40 m. Worst: 5 awake guards at (-8.25, 4.4, -4.25), the L1 east ring strip by the wing's north door, sees
#1, #2, #3, #4 and #7. Histogram of points by guards in view: 0: 455, 1: 175, 2: 352, 3: 169, 4: 4, 5: 11. Even with #10 and #12 awake the worst is 5. First run (before the
fixes): 8 at the L1 north ring (-26.25, 4.4, -2.25) seeing #1-#8; the fixes were the east wing wall (L9), the kitchen's door onto the SW lobby (L7) and the facilities glass moved
to the corridor (L8). Nothing silenced.

## M8 isolation (longest isolated run at the takedown spot, s)
#1 11.8, #2 7.3, #3 7.5, #4 7.3, #5 / #6 0 (the pair: recorded exception), #7 9.3, #8 10.3, #9 8.5, #10 9.5, #11 and #12 180 (nobody sees the spot). Guards on other floors are not
counted (`CHECK_FLOOR` 2 m), as the S1 check.

## Checks run (desktop, nothing heavier; no build, no e2e)
- `npx tsc --noEmit -p .`: pass (no output).
- `npx vitest run tests/campusS1.test.ts tests/campusS2.test.ts tests/soloJumpReach.test.ts tests/sectors.test.ts tests/voxelFit.test.ts`: 5 files, 122 tests pass. Also
  `tests/rooms`, `detailPass`, `laserPanels`, `lampBake`, `missions`, `lights`, `nightExposure`, `volLights`, `warehouseCoopS1-3`, `kestrelMap`, `editor/night`: 13 files, 147 pass.
- `npx eslint` on `campusS2.ts`, `campusSectors.ts`, `campusOps.ts`, `tests/campusS2.test.ts`, `tests/campusS1.test.ts`: clean. `node --check scripts/e2e-sectorops.mjs`: ok.
- Map numbers (node, pure builder): the campus now has 579 boxes (S2 alone 444, mostly the non-colliding stair steps), 123 cylinders, 51 lights (S2 21), 41 doors (S2 32), 14 fences (S2 7);
  `campusOps.build` 8 ms. Nav columns per surface: at most 5 walkable surfaces in any column (an 8-layer raster counts them).

## What the unit test covers (PLAN "Common" list for S2)
12 guards with kinds and weapons, all armed humans (`checkSectorGuards`), roles / zones / reasons / squads, the #5-#6 pair, #11 posted, floors per guard, every cycle 25-45 s (posts
#1 #11 #12), the pair loop fit, slots >= 7 m from the start, slots / route points / takedown spots / reinforce points / spawns / switches / alarms on the nav grid on their floor, every
guard route leg and every route leg of the three routes has a path (stairs walked), the floors connect (SW stair to L1 / L2 / roof, NE stair, the bridge, the cafe, the lip's top alone),
cameras 8-12 with reasons and `validateSecurity`, the SPEC core boxes and flights (rise, slope, doors on four floors, bulkhead roofs), the feature stair 6 m from the gap, the atrium
void open with the rim, CR2 (`soloJumpThreats` + `soloTopLandingThreats` with 0.5 m, headroom to 6.2 and to the L2 underside, rules 2, 3, 6, the ledge generator's lip on the gap and no stray
ledge, the boost point dark), the lighting circuits / switches / zones / dark pockets, the rooms (no overlap), the M8 check, K2 (post data, leash edge, the cone as a nav blocker: no path from
the C1 far door to the C2 door, a path without it), the dormant rule and A64.

## e2e part 6 (written, not run)
The first run now also: (a) section 2 loads with 12 guards (3 G, 6 L1, 3 L2) and exactly the three S2 cameras live (the existing S1 camera assert reads five cameras, two live); the
doors of C2 are locked; every leg of the three S2 routes has a path on the real grid; (b) the stealth route walked point by point (teleports: C1 far door, post room, SW stair, L1 north
open plan, facilities office), the 3 s hack opens C2's card door; (d) the guards run again, the reception panel's `onUse` cuts s2-atrium (3 pendants off) and #1 walks to it (within 20 s,
6 m closer). The probe run adds four CR2 probes from the cafe floor, a cafe table (y 0.75), the feature stair (y 2.8) and off the hall's east wall (wall jump): the L1 slab nose is never held
nor stood on (`probe` takes a start height). Unsure until run: the guards' reaction time to the panel (20 s), the probe run-up geometry, the hack button hold at the BMS desk.
Skipped: the co-op leg-up + human ladder at CR2 (part 6 has no co-op helper); the balustrade probe (a solo on the balustrade is already on L1).

## Findings for the lead
- Spawn gating is by plan distance (`SPAWN_MIN_DIST` 7, y ignored): anything stacked over C1's checkpoint (-20, -32) within 7 m cannot spawn at load. S2 layouts must keep guard slots
  clear of that disc on every floor.
- `Doors.nearest` and `pushOpen` read plan only: stacked fire-stair doors (same x, z on four floors) open together when a guard pushes one.
- `ConnectorDef.floorY` works for C2; the stub S3 section and its shell still assume a ground-level connector (L5).
