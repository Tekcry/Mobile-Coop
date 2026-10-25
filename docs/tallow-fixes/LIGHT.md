# Tallow Wharf: light plan (J8 LP)
Owner: Campaign Build. Status: current.

Slice LP of J8 tallow-fixes (`docs/missions/slices/J8-J9-PLAN.md` section 6 row LP and "LP light plan and briefs").
Binding: Michael's Q2 "Never" (every light works; darkness only from cover, cut circuits and shot lamps), Q3
"Australian standards", M1 (~20:45, "Yes, night lights only": closed rooms are lit by their night fittings only), G329,
G367, G368; VISION hard rules 1-2; master `docs/level-design.md` 5.1, 5.2, 5.5, 5.6, 13 "Light plan", 15 (darkest real
spot). Bands are light-realism's draft table (`origin/feature/light-realism:docs/light-realism/research/bands.md`
section 3, every value "to verify"; A2): J8 lights to them now and LM / GBM re-measure from the bake once Michael has
approved the table (a data re-tune if it differs). Frame: world metres, x east, z north, y up; a point's `y` is the
floor (feet) height. Map files: `feature/mission-engine` e37987544.

## 1. Rules every section follows
1. **Every fitting is on.** No lamp is built `on: false` (W3 lamp 81 today, `tallowWharfW3.ts:276`, becomes a `lamp()`
   call). No fitting is dead. A closed room (M1) has no working fitting at all: it has only what a real site leaves on at
   night (an exit or emergency bulkhead, a stair light, a desk lamp left on, a shop's window night light).
2. **Night floor.** Tallow's theme stays as it is (it already equals the campus: `ambient` 0.3, `lightLevel` 0.3,
   `sunIntensity` 0.16, so the moon gives 0.104 in the open). G0 adds one map-wide ambient zone at the standby fill
   **0.14** (0.37 lx), as `campusS1.ts:318`. LP adds no other zone: every level above the floor comes from a fitting, so
   a cut circuit drops its area to 0.14 indoors (dark) or 0.24 in moonlit open ground (dark, under the meter's 0.28).
3. **Levels.** A target below is the standing-body level the meter and the guards read: the ambient plus, at the
   brighter of chest (floor + `CHEST_Y` 1.02) and head (floor + `HEAD_Y` 1.615), the sum of `contribution(l, x, y, z)`
   (`src/world/lights.ts`: `LAMP_LEVEL_GAIN` x intensity x `photoTerm` over the lamp's reach, cone included) over the
   built lamps of the groups the row names, capped at 1, visibility 1 (the estimate does not see walls). Each section
   test has it as a local helper `levelAt(lamps, ambient, x, floorY, z)` over `b.lights.lights`. For a lamp without a
   cone this is exactly `bodyEstimate` (`src/world/lighting/levels.ts`). A cone lamp (a flood, rule 7) is read through
   its cone (axis, `cosOuter`, `SPOT_EXP` 2), as the bake and the meter read it; `bodyEstimate` takes every lamp as a
   downward lamp, so it is wrong for a flood (W3's yard centre reads 0.340 through `bodyEstimate`, 0.783 through the
   cone) and no test uses it for a group with a flood. Every "Estimate" value below is this helper's (fix round 1:
   recomputed with a JS replica of `contribution` and `lampMath.ts`, which reproduces the checker's numbers), rounded to
   0.01; every target keeps at least 0.02 margin. Lux by the light-realism curve: `lux = 10 ^ ((level - 0.28) / 0.32)` (0.28 = 1 lx, the meter's dark line; 0.60 = 10
   lx, its lit line; 0.79 = 40 lx; 0.92 = 100 lx; 1.0 = 178 lx and up). Ambient in the estimate: 0.14 indoors, 0.244 in
   moonlit open ground. The bake (occlusion included) is the authority: LM measures it with `lux-grid.mjs`.
4. **Bands used** (draft table): public activity area 7 lx (0.55), point min 2 lx (0.38); pathway 0.85-3.5 lx
   (0.26-0.45); service lane 1.75 lx (0.36), point min 0.3 (reads as the floor); yard / loading apron 20-50 lx
   (0.70-0.82); corridor 40 lx (0.79); stair 80 lx (0.89); staffed store 100 lx (0.92); indoor market hall / dock 150 lx
   (0.98); office and security room 320 lx at the task plane (1.0). Closed (M1): no band; the night fitting reads lit
   within about 1.5 m and the room reads dark beyond it. Unfitted (roofs, the gallery deck, ducts, the gantry, the canal
   ledge): no fitting, the night floor plus moon and spill.
5. **Switches** (5.1, G157 7). A room circuit's switch is on the wall within 1.5 m (plan) of the nearest jamb of a door
   or opening of the space it lights, on that door's floor, facing into the space. An open-air circuit's switch is a
   labelled switch box at its supply point on a real element (a stall row's end post, a gate post, the lodge wall); the
   table names the point. A desk, table or hanging lamp switches at the lamp itself (within 1.0 m plan of it; its flex is
   its visible link). An unswitchable lamp carries its reason in the table: photocell, maintained emergency or exit
   circuit (battery-backed, AS/NZS 2293), clockwork gas jet, aviation obstruction lamp, a vessel's own lamps.
6. **Visible links** (5.6, G157 7). Every switched room or open-air circuit has a conduit run from its switch to each
   of its fittings: a visual-only box line (`collide = false`, 0.05 x 0.05, colour `#4f5459`, axis-aligned legs) from
   the switch's wall point (switch x / z, floor + 1.2) straight up to the run height `yRun`, then along x, then along z,
   to a point within 0.3 m of the fitting (the lamp's own `y` or `yRun`, whichever is lower, then a drop). Each section
   file exports its runs as `W<n>_CONDUITS: readonly { group: number; pts: readonly [number, number, number][] }[]` and
   builds them with a local `conduit(b, pts)` helper. Lamp-switched groups have no run.
7. **Lamp call.** Every fitting is the kit's `lamp(b, x, y, z, { r, i, group, colour?, cone?, destructible?, electric? })`
   (`tallowWharfKit.ts:152`; `on: true` always). `kind` follows the cone (a cone = a flood). Colours: `WARM` [1, 0.82,
   0.55] for market, loft and office lamps; the kit's white for halls, stairs and stores; the aviation lamp red [1, 0.1,
   0.1]; the launch's masthead white; exit lights green-white [0.8, 1, 0.85]. A desk or table lamp stands on a built
   desk (fix rounds 2-3): a visual-only box (`collide = false`, so no nav cell or light row changes), top 0.75 over its
   floor, with these plan extents [x0, z0, x1, z1]. Each is at least 1.2 m from every door gap's face across the gap's
   width (master level-design 16.3.3, 16.4.2) and at least a body radius (0.3 m) from every guard post and guard route
   leg; each brief exports its list as `W<n>_DESKS` and tests both rules:
   - W1 the warden's tally desk [2.0, 50.1, 3.2, 50.7] (floor 4.5), under lamp 63;
   - W2 the clerk's supper shelf against the pie back stair's east wall [57.95, 67.1, 58.35, 68.3] (lamp 72's table
     lamp; south of the stair-top door's band z 68.4-69.6, 1.7 m from the clerk at (60, 66.8)); the rota desk against
     the fire-stair core's north wall [50.6, 63.8, 51.8, 64.6] (lamp 73; 1.0 m from the runner's mark); Teale's table
     beside him [51.9, 74.4, 52.5, 75.6] (lamp 74; off the stage door's band x 50.6-51.8, 0.6 m from Teale, 0.4 m from
     the keeper's z 76 leg); the reader's table in front of him [46.4, 76.9, 47.6, 77.5] (lamp 75; 0.7 m from the
     reader at (47, 78.2), 0.9 m from the keeper's z 76 leg, 0.4 m from his x 46 leg). All floor 4.5;
   - W3 the clerks' desks [109.4, 57.9, 110.6, 58.5] and [115.4, 57.9, 116.6, 58.5] (lamps 82, 83; 0.5 m north of their
     clerks at z 57.4, 1.9 m from the porter's z 56 leg), the copying desk [89.4, 55.9, 90.6, 56.5] (lamp 85's desk lamp;
     0.5 m from the clerk at (90, 55.4)), the partners' desk [116.4, 76.2, 117.6, 76.8] (lamp 87; 2.05 m from the office
     door's face). All floor 0;
   - W4 none (no desk or table lamp).
8. **Groups.** W1 60-67 (unchanged), W2 70-79 (adds 77, 78, 79), W3 80-90 (unchanged), W4 91-98 (adds 98). The kit's
   `GROUPS` constant (`tallowWharfKit.ts:49-54`) is documentation nothing reads; its W1 / W2 / W4 maxima become 67 / 79
   / 98 when G0 or a later kit edit next touches the file (open question for the lead). Each section test's group range
   follows this table.
9. **Darkness only from real causes.** Every dark pocket a route uses is named below with its cause: cover (a wall,
   stall back, press, stack, cart), a real gap between fittings, a cut circuit or a shot lamp. No row relies on a light
   left off.

## 2. W1 night market (G1)
### Spaces
| Space | Type, band | Tonight | Fittings (group) | Darkness from | Cut or shot opens |
| --- | --- | --- | --- | --- | --- |
| w1-canal-steps | pathway 0.85-3.5 lx | landing steps | canal lamp (65, photocell) | the top step under the stall rows' shadow (real gap, reads 0.26) | shooting 65 darkens the landing |
| w1-tea-stall | public activity; counter brighter | trading | paraffin lamp over the counter (64, turned down at the lamp) | the nook between the urn crates and the canal rail (cover, 0.25) | turning 64 down or shooting it darkens the stall |
| w1-market | public activity 7 lx avg (0.55), 2 lx min; stall fronts brighter | trading | row S and row N stall strings (60, 61, row-end boxes); fish hall facade brackets (62); the clock dial (66) | **the stall-back aisle** z 23.15-32.85 (cover: both back walls 2.4 m high shade every string lamp; reads 0.25); the west strip by the gallery x 6-9 (real gap: 0.26-0.27 at z 15-18; east of x 9 the row S lamps reach it) | cutting 61 (row N box) or shooting the x 30 row N lamp darkens the 4 m from the aisle's east end to the fish hall side door (reads 0.38 lit) |
| w1-gallery | unfitted (open deck) | - | none | moon only (0.24) | - |
| w1-warden-office | closed (M1; fix round 1, LP pick 13: the warden is out on his rounds, his tally book on the desk) | shut | the desk lamp left on over the tally desk (63, a socket circuit switched by the gallery door) | the room beyond the desk pool (0.14): the inspection hatch, the fish hall's vantage; the NW corner behind the ledger press (cover) | cutting 63 at the door darkens the desk pool |
| w1-fish-hall | indoor market hall 150 lx (0.98) | trading | 8 pendants in two rows (62, by the arch) | the ice store and the fish-box stacks (cover); behind the ice benches (crouched) | cutting 62 by the arch darkens the hall and the clock end (a lure: the watchman comes to the switch); shooting the two back-row pendants at x 19 and 26 (z 54.5) darkens the shutter bay |
| w1-service-passage | corridor 40 lx (0.79), in use while the hall trades | the barrow passage, an escape route | 5 maintained bulkheads on the centre line + the vestibule bulkhead (67): maintained luminaires (AS/NZS 2293) give the corridor's normal light while the supply is on (fix round 1, LP pick 17: LP's wall bulkheads gave about 1.3 lx) | the west dead end x 6-7 past the last fitting (0.39-0.57) | shooting a bulkhead |

### Lamps
| Group | Lamp (x, y, z) | Fitting, owner | r | i | Flags | Switch |
| --- | --- | --- | --- | --- | --- | --- |
| 60 | (15.5, 3.0, 18.5), (20, 3.0, 18.5), (25.5, 3.0, 18.5), (31, 3.0, 18.5) (fix round 1: 0.5 m further over the lane and east, i 0.45 -> 0.6; fix round 2: the west lamp 15.5, keeping the west strip 0.02 under the dark line) | row S stall string lamps, the stallholders | 8 | 0.6 | warm | box at the row's west end post (11.5, 0, 20.5), yaw -PI/2 (existing); run `yRun` 3.0 along the string's wire (2.6 left the run 0.4 m under the lamps) |
| 61 | (13.5, 3.0, 37), (19, 3.0, 37), (24.5, 3.0, 37), (30, 3.0, 37) | row N stall strings | 8 | 0.45 | warm | box (11.5, 0, 35.5), yaw -PI/2 (existing); `yRun` 3.0 |
| 62 | (11, 5.4, 47.5), (19, 5.4, 47.5), (26, 5.4, 47.5), (33, 5.4, 47.5), (11, 5.4, 54.5), (19, 5.4, 54.5), (26, 5.4, 54.5), (33, 5.4, 54.5) (fix round 1: the west pair at x 11, was 12) | fish hall pendants, the market company | 8 | 1.5 | white | (24.4, 0, 44.6), yaw 0, inside the arch's east jamb (existing); `yRun` 5.7 |
| 62 | (18, 3.6, 43.7), (26, 3.6, 43.7) | facade bracket lamps flanking the arch, same circuit | 6 | 0.5 | warm | as above (the run goes out through the facade at y 3.6) |
| 63 | (2.6, 5.7, 50.4) | the desk lamp left on over the tally desk (the office is closed, M1; fix round 1: the pendant is gone, the lamp 0.75 m over the desk top lights a standing body) | 3.5 | 0.5 | warm | (5.2, 4.5, 46.6), yaw 0, by the gallery door (existing): the socket circuit; its run is a floor duct (G1 step 2) |
| 64 | (16, 2.4, 12) | paraffin lamp over the counter, the tea man | 6 | 0.3 | warm, `electric: false` | at the lamp: (16, 0, 12.6), yaw 0 (moved from (13, 0, 12.9): the wick knob) |
| 65 | (7, 3.5, 6.4) | canal-side lamp post, the canal company | 6 | 0.3 | white | none: photocell |
| 66 | (22, 7.5, 43.6) | the fish hall clock dial lamp | 6 | 0.6 | `destructible: false, electric: false` | none: the clock's gas jet, behind the dial glass out of reach |
| 67 | (10, 2.85, 60), (16, 2.85, 60), (22, 2.85, 60), (28, 2.85, 60), (34, 2.85, 60) (fix round 1: on the centre line under the 3.0 roof, was four at (x, 2.6, 61.6) at i 0.5) | passage bulkheads, maintained luminaires (AS/NZS 2293: lit with the supply on, battery-backed when it fails) | 5 | 1.0 | white | none: maintained circuit |
| 67 | (38, 2.6, 60) | vestibule bulkhead (existing) | 5 | 0.35 | white | none |

W1 lamp count: 4 + 4 + 10 + 1 + 1 + 1 + 1 + 6 = **28** (groups 60-67: `[4, 4, 10, 1, 1, 1, 1, 6]`).

The row S and N strings hang from no built canopy: the conduit's 3.0 leg is their wire. Its row-end posts are a
dressing item for the lead (fix round 1 report, polish left).

### Check points (G1's test; level by the section-1 rule 3 helper with the named groups)
| Point (x, floor, z) | Groups | Ambient | Target | Estimate |
| --- | --- | --- | --- | --- |
| market S lane between lamps (17, 0, 17.5) | 60 | 0.244 | >= 0.55 | 1.0 |
| market S lane far edge (17, 0, 14.5) | 60 | 0.244 | >= 0.38 | 0.45 |
| west strip by the gallery (8, 0, 18), the shadow route | 60, 61 | 0.244 | <= 0.28 | 0.26 (0.257) |
| market N lane (17, 0, 40) | 61, 62 | 0.244 | >= 0.55 | 0.69 |
| clock end, the three coats (22, 0, 42.5) | 61, 62 | 0.244 | >= 0.60 | 0.80 |
| stall-back aisle (22, 0, 28) | 60, 61 (the estimate does not see the backs; the bake is darker) | 0.244 | <= 0.28 | 0.25 |
| side-door approach (34, 0, 40) | 61, 62 | 0.244 | <= 0.45 | 0.38 |
| canal start (7, 0, 10) | 65 | 0.244 | 0.26-0.45 | 0.34 |
| tea counter (16, 0, 11) | 64 | 0.244 | >= 0.60 | 1.0 |
| hall centre (22, 0, 51), hall west bay (9.5, 0, 46), shutter bay (22, 0, 57) | 62 | 0.14 | >= 0.79 | 1.0 / 0.97 / 0.82 |
| office desk pool (2.5, 4.5, 50.6) | 63 | 0.14 | >= 0.60 | 1.0 |
| office at the inspection hatch (7.4, 4.5, 53.0), the hall vantage | 63 | 0.14 | <= 0.28 | 0.14 |
| passage at the shutter (22, 0, 59) | 67 | 0.14 | >= 0.79 (corridor band) | 1.0 |
| passage between fittings by the hall wall (25, 0, 58.5) | 67 | 0.14 | >= 0.60 (the escape route stays in the lit band) | 0.80 |

The S lane's west end (12.5, 0, 15) reads 0.35, under the public band's 2 lx point minimum (0.38): it is the edge of the
dark west strip by design (the shadow route's way in), not a check row.

### Darkest real spot, W1
The stall-back aisle at (22, 0, 28) (0.25 with groups 60 and 61: cover from both back walls, moon only), on the shadow
route.

## 3. W2 arcade lofts (G2)
### Spaces
| Space | Type, band | Tonight | Fittings (group) | Darkness from | Cut or shot opens |
| --- | --- | --- | --- | --- | --- |
| w2-arcade | corridor 40 lx (a covered public way at night, shops shut) | public way | 7 pendants in two staggered rows (70, west arch) | the west end and NW bay by the arch and the pier (real gap and the pier's cover, 0.14-0.19: the checkpoint and the C3 boost spot read dark); the north bay under the walkway slab (0.25 at the boost spot, 0.62 mid-bay) | cutting 70 at the west arch (a lure for the beadle) or shooting pendants |
| w2-walkway | corridor 40 lx (the loft tenants' balcony, in use) | in use | 4 facade bracket lamps (79, by the pawn stair door) | the bays between brackets (real gaps, 0.60) | cutting 79 at its switch (where the boost lands) or shooting brackets; lit choke with two ways to darken (5.2) |
| w2-pie-shop | closed (M1) | shut | the window night light (71, time-switch box by the arcade door) | the shop behind the window light (0.14-0.17) | shooting 71 |
| w2-pie-loft | office 320 at the clerk's table | worked (the night clerk's supper) | 2 pendants + table lamp (72, by the back stair head) | the loft's east end by the party wall (0.57) | cutting 72 at the stair head |
| w2-pawn-loft | office 320 at the rota desk; store floor 40 lx | worked (the rota desk lit, Fenn waits) | 2 pendants + desk lamp (73, by the loft door) | - (fully lit; the throw spot reads lit, unseen: every reading-room guard faces a shut door or wall) | cutting 73 at the loft door |
| w2-reading-room | office 320 at the tables; room 160 | worked (keeper, reader, Teale, the minder) | 3 pendants (77, by the bridge doorway), Teale's and the reader's table lamps (74, 75) | the NE corner behind the new book stacks (cover, 0.45) | cutting 77 (the table lamps stay: pools on the two tables; a standing body beside them reads 0.14-0.24, dark) |
| public stair (stair hall + landing) | stair 80 lx | in use (Pell's men) | landing and flight lamps (76, two-way: foot and landing) | - | cutting 76 at either end |
| pawn fire stair, pie back stair, both A5 bridges | stair / escape route 80 lx | maintained | bulkheads (78) | - | shooting |
| w2-clock-loft | closed (M1, the mender is out) | shut | the exit light over the east bridge doorway (78) | the whole loft beyond the sign (0.14) | shooting the sign |
| w2-lane-window (and the tank room) | closed (M1, unlet) | shut | the exit light over its walkway door; the tank room's bulkhead (78) | the loft (0.14-0.18); the darkest real spot of W2 | shooting |
| w2-arcade-roof | unfitted (roof) | - | none | moon (0.24) | - |
| lightwell, stages | unfitted (open air) | - | none | the pawn stage reads 0.24: the thrown partner lands in the dark | - |

### Lamps
| Group | Lamp (x, y, z) | Fitting, owner | r | i | Flags | Switch |
| --- | --- | --- | --- | --- | --- | --- |
| 70 | (47.5, 4.2, 51), (55.5, 4.2, 51), (63.5, 4.2, 51), (71.5, 4.2, 51), (51.5, 4.2, 56.5), (59.5, 4.2, 56.5), (67.5, 4.2, 56.5) | arcade pendants on rods from the glazed roof, the arcade company | 7 | 0.85 | white | (40.4, 0, 57.8), yaw PI/2, on the west wall beside the arch (moved from (41, 0, 57.4)); `yRun` 7.3 |
| 71 | (58.8, 2.4, 62.5) | the pie shop's window night light, the pie man | 4 | 0.3 | warm | time-switch box (62.4, 0, 62.4), yaw 0, inside the arcade door (moved from (64.6, 0, 64)); `yRun` 2.6 |
| 72 | (59, 7.0, 65.5), (63.5, 7.0, 65.5) | pie loft pendants | 7 | 0.9 | warm | (58.4, 4.5, 68.8), yaw PI/2, by the back stair top door (existing); `yRun` 7.2 |
| 72 | (58.15, 5.4, 67.8) (fix round 3: was (58.8, 5.4, 68.0), over no table clear of the stair-top door) | the clerk's table lamp on his supper shelf (by the notebook) | 3 | 0.35 | warm | same circuit |
| 73 | (47.5, 7.6, 65.7), (52, 7.6, 65.7) | pawn loft pendants, the pawnbroker | 7 | 0.9 | warm | (46.1, 4.5, 64.0), yaw 0, by the loft door (45, 4.5, 63.65) (moved from (50.2, 4.5, 62.6)); `yRun` 7.8 |
| 73 | (51.2, 5.6, 64.4) | the rota desk lamp (`W2_ROTA_DESK`, now (51.2, 4.5, 64.4)) | 4 | 0.35 | warm | same circuit |
| 74 | (52.2, 5.4, 75.0) (fix round 3: was (51, 5.4, 74.6), its table across the stage door's approach) | Teale's table lamp, the library | 4 | 0.35 | warm | at the lamp: (52.6, 4.5, 74.6), yaw -PI/2 (0.57 m from it; moved from (51.8, 4.5, 74.3)) |
| 75 | (47.0, 5.4, 77.2) (fix round 3: was (47, 5.4, 78.6), its table on the reader's post and the keeper's z 79 leg) | the reader's table lamp | 4 | 0.35 | warm | at the lamp: (47.9, 4.5, 77.2), yaw -PI/2 (0.9 m from it; moved from (47.8, 4.5, 78.8)) |
| 76 | (55, 7.2, 72), (55, 6.4, 66) | public stair landing and flight lamps | 6 | 0.8 | white | (55.4, 4.5, 72.4), yaw -PI/2, on the landing (existing) and (55.7, 0, 62.4), yaw 0, at the stair foot (new, two-way); `yRun` 7.4 |
| 77 (new) | (47, 7.2, 76.75), (52, 7.2, 76.75), (57, 7.2, 76.75) | reading room pendants, the library | 7 | 0.9 | warm | (45.8, 4.5, 73.85), yaw 0, by the west bridge doorway; `yRun` 7.4 |
| 78 (new) | (45, 7.6, 62.8) pawn stair top landing; (53, 3.0, 63.3) and (49.5, 4.6, 63.3) pawn stair foot and flight; (57, 7.6, 69.3) pie back stair head; (44.75, 6.4, 70.5) west bridge; (69.25, 6.4, 71.75) east bridge; (72.2, 7.7, 64.9) tank room | maintained escape bulkheads, the landlord | 4 (bridges and tank 3) | 0.5 (bridges and tank 0.3) | white | none: maintained circuit |
| 78 | (69.25, 6.8, 73.9) clock loft exit light over the bridge doorway; (72, 6.8, 62.4) lane-window loft exit light over its walkway door | exit lights (maintained) | 3 | 0.15 | exit colour | none |
| 79 (new) | (49, 7.4, 61.75), (56.5, 7.4, 61.75), (65, 7.4, 61.75), (70, 7.4, 61.75) | walkway bracket lamps on the loft facade, the landlord | 6 | 1.3 | warm | (46.1, 4.5, 61.75), yaw PI, beside the walkway door (45, 4.5, 62); `yRun` 7.6 |

W2 lamp count: 7 + 1 + 3 + 3 + 1 + 1 + 2 + 3 + 9 + 4 = **34**. The old W2 lamps at (60, 2.6, 63.2) (71), (61, 7.0, 66) (72),
(51, 5.4, 74.6) (74, moved to (52.2, 5.4, 75.0)), (47, 5.4, 78.6) (75, moved to (47.0, 5.4, 77.2)) and (55, 7.2, 72) (76, kept) are replaced or kept as listed.

### Check points (G2's test)
| Point | Groups | Ambient | Target | Estimate |
| --- | --- | --- | --- | --- |
| arcade mid (56, 0, 54) | 70 | 0.14 | >= 0.79 | 0.84 |
| arcade entry / checkpoint (42, 0, 55) | 70 | 0.14 | <= 0.28 | 0.19 |
| C3 boost spot (46, 0, 58.5) | 70 | 0.14 | <= 0.45 | 0.25 |
| walkway mid (60, 4.5, 60.5) | 79 | 0.244 | >= 0.60 | 0.72 |
| pie loft (61, 4.5, 66) | 72 | 0.14 | >= 0.79 | 1.0 |
| pie shop back (64, 0, 68) | 71 | 0.14 | <= 0.28 | 0.14 |
| pawn loft (48, 4.5, 66) | 73 | 0.14 | >= 0.79 | 1.0 |
| Teale (51, 4.5, 75.4), reading W (45, 4.5, 77), reading E (59, 4.5, 77) | 74, 75, 77 | 0.14 | >= 0.79 | 1.0 |
| clock loft mid (65, 4.5, 77) | 78 | 0.14 | <= 0.28 | 0.14 |
| lane-window loft mid (69, 4.5, 63) | 78 | 0.14 | <= 0.28 | 0.18 |
| pawn stage (51.2, 4.5, 73.0) | none | 0.244 | <= 0.28 | 0.24 |

### Darkest real spot, W2
The lane-window loft at (69, 4.5, 63) (0.18), on both W2 routes (walkway -> lane-window loft -> the tank-room ladder).

## 4. W3 counting house (G3)
One light plan serves both missions (one map, one bake): the house is lit as for its staffed night (TKL). In TGC the
house is empty and its lamps are the ones the night staff left on: a BEAT line J7's BEAT owner needs ("the clerks
went home and left the lamps burning"), sent with this plan (fix round 1 report).

### Spaces
| Space | Type, band | Tonight | Fittings (group) | Darkness from | Cut or shot opens |
| --- | --- | --- | --- | --- | --- |
| w3-east-yard | yard 20-50 lx (watched yard) | watched | the yard flood under the lodge's eaves, the gate lamp, the fire escape head lamp on its post (80, switched in the lodge) | **the wall line** z 50-52 west of the gate (the flood is aimed west-south-west from the lodge's south end, away from it; 0.25): the approach to the latched sash (the last metre at the sash, (108.8, 0, 51), reads 0.40 in the gate lamp's pool: mid, not dark); the yard's west corners beyond the flood's throw (0.37); under the fire escape's half landing (cover) | cutting 80 in the lodge (by the porter) darkens the yard and the fire escape; shooting the flood or the head lamp |
| w3-lodge | security room 320 lx | the porter dozes in his chair | lodge lamp (81, by the yard door) | - | cutting 81 |
| w3-east-wing | office 320 at the desks; hall 160 | worked (two clerks, the porter's rounds) | 6 hall pendants (84), two desk lamps (82, 83) | the press recesses on the west wall (cover) | cutting 84 at the front-hall opening (the desk lamps stay: two pools) |
| front hall | corridor 40 lx | in use (the messenger, the watchman) | 2 pendants (84) | - | cutting 84 |
| w3-west-wing | office 320 at the desk; hall 160 | worked (the clerk, the stacks porter) | 6 pendants on long drops + the copying-desk lamp (85, by the double doors); the lantern moonlight (86) | the light well under the gallery ring (0.54, moonlight only); the aisles between the new shelf ranges (cover) | cutting 85 at the double doors |
| w3-passage | corridor at its night setting: the bank is shut, the maintained bulkhead is its fitting | shut (TKL: the porter's lantern after the bell) | the caged bulkhead (88, hardened: `destructible: false`, unswitched) | the chute end, 4 m past the bulkhead (real gap, 0.24): the C7 boost spot | a hardened lit choke (G333): the route round it is the west door straight to the chute spot (1.1 m), never crossing the lit centre |
| w3-strongroom | closed (vault) | shut | a vault night fitting (88) | the vault beyond it (0.29) | shooting |
| w3-east-post, w3-west-post | lit from the halls | - | none of their own | the alcove beyond the hall's last pendant (real gap) | - |
| w3-partners-office | closed (M1) | shut | the desk lamp left on (87, by the door) | the corners (0.14) | cutting 87 at the door |
| bulkhead stair core | stair 80 lx | maintained | foot, half-landing and top bulkheads (88) | - | shooting |
| w3-coal-yard | service lane 1.75 lx (not worked) | - | photocell lamp over the cart gate (89) | the coal bays and the yard away from the gate (0.25) | shooting 89; the wicket is on the gate's dark side |
| w3-cartway | service lane | - | photocell lamp at the lane mouth (89) | - | shooting |
| w3-roof | unfitted (roof) | - | the turret clock dial (90) | moon (0.24) | - |
| w3-chute | duct | - | none | - | - |

### Lamps
| Group | Lamp (x, y, z) | Fitting, owner | r | i | Flags | Switch |
| --- | --- | --- | --- | --- | --- | --- |
| 80 | (112, 3.0, 51.6) | gate lamp over the keypad door, Gaunt & Lisle | 4 | 0.5 | white | (115.9, 0, 51.4), yaw PI, in the lodge by its inner door (moved from (115, 0, 51.4)); `yRun` 3.0, out through the lodge walls to the gate lamp, the flood and the head lamp |
| 80 (new) | (113.7, 2.9, 46.0), cone `makeCone(-1, -0.4, -0.5, 1.0)` (fix round 1, LP pick 18: was (113.7, 5.5, 46), 2.2 m over the lodge roof) | yard flood on a bracket under the lodge's eaves, on its west wall (wall top 3.0, roof 3.0-3.3), aimed west-south-west across the yard | 14 | 2.5 | white | same box |
| 80 (new) | (109.0, 10.0, 52.15) (fix round 1: was (108.65, 10.0, 51.9), in the air over the head landing) | fire escape head lamp on the bracket arm of an iron lamp post on the roof parapet's west end (x 109.3, top 9.5) | 5 | 0.5 | white | same box (the run climbs the wing's yard face, is chased through the parapet's end and climbs the post) |
| 81 | (117, 2.6, 48) | lodge lamp (now a `lamp()` call, on) | 5 | 0.6 | warm | (114.4, 0, 49.0), yaw PI/2, by the lodge yard door (moved from (118.6, 0, 46)); `yRun` 2.8 |
| 82 | (110, 1.2, 58) | clerk's desk lamp | 4 | 0.35 | green-shaded warm | at the lamp (110.6, 0, 57.4) (existing) |
| 83 | (116, 1.2, 58) | clerk's desk lamp | 4 | 0.35 | warm | at the lamp (116.6, 0, 57.4) (existing) |
| 84 | (101, 2.9, 68), (107.5, 2.9, 68) (existing); (113.8, 3.0, 55.3), (109.2, 3.0, 59), (109.2, 3.0, 66), (117.6, 3.0, 59), (117.6, 3.0, 66), (113.8, 3.0, 71.7) (new) | front hall and east clerks' hall pendants | 7 (the two existing 8) | 0.8 | white | (106.4, 0, 65.9), yaw PI/2 (facing into the east wing), in the east wing beside the front-hall opening (moved from (100.6, 0, 64.6)); `yRun` 3.1 |
| 85 | (90, 1.2, 56) (existing desk lamp, r 4, i 0.35); (85, 3.8, 55.5), (93, 3.8, 55.5), (85, 3.8, 70.5), (93, 3.8, 70.5), (83.6, 3.8, 63), (94.4, 3.8, 63) (new) | copying desk lamp; west hall pendants on long drops from the roof slab | 8 | 0.9 | warm desk, white pendants | (95.6, 0, 66.4), yaw -PI/2, by the double doors (moved from (90.6, 0, 55.4)); `yRun` 7.9 |
| 86 | (89, 7.8, 63) | moonlight through the lantern | 8 | 0.4 | moon colour, `destructible: false, electric: false` (existing) | none: daylight / moonlight, not a fitting |
| 87 | (117, 1.2, 76.5) | partners' desk lamp left on | 3.5 | 0.5 | warm | (115.8, 0, 74.6), yaw 0, by the office door (existing); a lamp-socket circuit, no run needed |
| 88 | (101, 2.7, 53.75) | passage caged bulkhead | 5 | 0.5 | `destructible: false` (existing) | none: maintained, vandal cage |
| 88 (new) | (101, 3.0, 62.5) vault light; (113.2, 2.9, 68.6) core foot; (113.8, 6.8, 59.4) core half landing; (113.2, 10.3, 68.6) core top | maintained bulkheads | 4 | 0.25 (vault), 0.5 (core) | white | none |
| 89 | (90, 3.6, 38.6), (90, 2.6, 34.6) | coal yard and cartway lamps | 6 | 0.2, 0.15 | white | none: photocell |
| 90 | (101, 11, 66) | turret clock dial | 6 | 0.5 | `destructible: false, electric: false` (existing) | none: the clock's gas jet |

W3 lamp count: 3 + 1 + 1 + 1 + 8 + 7 + 1 + 1 + 5 + 2 + 1 = **31**.

### Check points (G3's test)
| Point | Groups | Ambient | Target | Estimate |
| --- | --- | --- | --- | --- |
| yard centre (107, 0, 45) | 80 (the flood through its cone) | 0.244 | >= 0.70 | 0.78 |
| yard wall line (106.6, 0, 51.1) | 80 (the flood through its cone) | 0.244 | <= 0.30 | 0.25 |
| east wing W strip (109, 0, 62.5), E strip (117.5, 0, 62.5) | 82, 83, 84 | 0.14 | >= 0.65 | 0.74 / 0.69 |
| west wing NW (83, 0, 72) | 85, 86 | 0.14 | >= 0.65 | 0.74 |
| passage centre (101, 0, 53.75) | 88 | 0.14 | >= 0.79 | 1.0 |
| chute boost spot (97.1, 0, 53.2) | 88 | 0.14 | <= 0.28 | 0.24 |
| coal yard centre (90, 0, 46) | 89 | 0.244 | <= 0.30 | 0.25 |
| roof corner bay (84, 8.4, 66) | none | 0.244 | <= 0.28 | 0.24 |

### Darkest real spot, W3
The passage's chute end at (97.1, 0, 53.2) (0.24, the bulkhead's real gap), on both W3 routes (C7).

### The crane's red lamp seen from the W3 roof (O20)
The coal-yard drop guard (x 82-100 at z 52, top 10.6) and the masses at z 34-38 hide the crane lamp at its build height
(88, 12, 5) from every W3 roof spot a route uses. G4 raises the crane's jib head and its aviation lamp to **(88, 14, 5)**
(the jib box to y 13.6-13.9); then the line from a standing eye (90, 10.0, 66) on the roof beside the lantern (TKL's
lantern drop) clears the drop guard by 0.32 m, passes the masses through the cartway notch (x 89.0 at z 36, where
nothing stands above 3.3) and the lantern upstand (top 9.4) above it. G3's test checks this line against every collide
box using the planned point [88, 14, 5]; G4's test pins the lamp there.

## 5. W4 wharf sheds (G4)
### Spaces
| Space | Type, band | Tonight | Fittings (group) | Darkness from | Cut or shot opens |
| --- | --- | --- | --- | --- | --- |
| w4-back-lane | service lane 1.75 lx, min 0.3 | - | 4 lane lamps (95, photocell) | the long gaps between them (real gaps): the cartway mouth and checkpoint (0.24 lane, about 0.45 under the cartway lamp 89), the clerestory boost spot (0.24) | shooting |
| w4-shed-three | staffed store 100 lx (0.92) on the working floor | works through the night (the tea barge) | 4 pendants (91, by the fire door); the loading-door flood (92) faces the jetty | **the stack alley** x 84-86 between the new tea-chest stacks and the party wall (cover: the stacks shade the pendants; 0.47 estimate, darker in the bake); the side bays behind the stacks | cutting 91 at its switch (a lure into the alley) or shooting pendants |
| w4-shed-two | closed (M1, empty) | shut | exit lamp at the canal door (96) | the aisle (0.14); the darkest real spot of W4 | shooting is not possible (vandal cage) |
| w4-shed-yard | yard 20-50 lx (watched yard) | watched | the gate flood and two crane floods under the gantry (93, gate-box switch); quay lamps (94, photocell) | the cart line's north side (cover) and the yard's west corners beyond the floods' throw (0.25-0.33) | cutting 93 at the gate box (the yard watchman's loop passes it) or shooting floods |
| w4-canal-ledge | unfitted (water level) | - | none | moon and spill (0.28-0.34) | - |
| w4-jetty | yard / apron at the loading door | the barge lands | loading-door flood (92, inside the door), the gangway lamp (94, photocell), the crane's red lamp (97) | the jetty's ends beyond the flood (0.25) | cutting 92 inside shed three or shooting it; shooting the gangway lamp. Lit choke with two ways to darken (5.2) |
| w4-gantry | unfitted (crane walkway) | - | none (the floods hang under its deck, aimed down); the look-out bay of clear glass in the north screen x 50-54 (fix round 1, LP pick 15) | moon (0.24) | - |
| w4-boat | the launch's own lamps | moored | masthead light (98, the launch's battery) | - | shooting |

### Lamps
| Group | Lamp (x, y, z) | Fitting, owner | r | i | Flags | Switch |
| --- | --- | --- | --- | --- | --- | --- |
| 91 | (75, 5.4, 13.5), (75, 5.4, 21.5), (80.5, 5.4, 13.5), (80.5, 5.4, 21.5) | shed three pendants over the working floor, the wharf company | 8 | 1.5 | white | (85.4, 0, 20.4), yaw -PI/2, by the fire door (existing); `yRun` 6.4 |
| 92 | (79, 4.0, 9.6), cone `makeCone(0, -1, -0.6, 1.1)` | loading-door flood over the jetty (existing) | 12 | 1.3 | white | (81.2, 0, 10.6), yaw 0, inside the loading door (existing); `yRun` 4.2 |
| 93 | (66, 6.0, 27.2), cone `makeCone(0, -1, -0.7, 1.2)` (existing) | yard flood at the lane gate | 16 | 1.4 | white | gate box (63.4, 0, 27.6), yaw PI (existing); `yRun` 6.2 to the gate flood, then along the yard wall top and up the crane's west leg to the crane floods |
| 93 (new) | (53, 9.6, 17), (65, 9.6, 17), cone `makeCone(0, -1, 0, 1.0)` | crane work floods under the gantry deck | 16 | 3.5 | white | same box |
| 94 | (50, 4.0, 6.6), (64, 4.0, 6.6) (existing, i 0.6 -> 0.4); (88, 4.0, 9.7) (new: the gangway lamp) | quay lamps | 7 | 0.4 | white | none: photocell |
| 95 | (66, 4.0, 30.4) (existing, i 0.6 -> 0.3); (48, 5.0, 33.6), (104, 5.0, 33.6), (117, 5.0, 33.6) (new) | lane lamps on wall brackets, the council | 7 | 0.3 | white | none: photocell |
| 96 | (93, 2.4, 10.6) | shed two exit lamp at the canal door (existing) | 4 | 0.4 | `destructible: false` | none: maintained, vandal cage |
| 97 | **(88, 14, 5)** (moved from (88, 12, 5)) | crane aviation obstruction lamp on the jib head | 6 | 0.6 | red, `destructible: false, electric: false` | none: aviation lamp, its own supply |
| 98 (new) | (90, 3.0, 3) | the launch's masthead light, the boatman | 3 | 0.15 | white, `destructible: true, electric: true` | none: the launch's own battery (O6) |

W4 lamp count: 4 + 1 + 3 + 3 + 4 + 1 + 1 + 1 = **18**.

### Check points (G4's test)
| Point | Groups | Ambient | Target | Estimate |
| --- | --- | --- | --- | --- |
| shed three floor (78, 0, 18), west (73, 0, 17) | 91 | 0.14 | >= 0.79 | 1.0 / 0.84 |
| candle chest (75.5, 0, 14) | 91 | 0.14 | >= 0.79 | 1.0 |
| shed two mid (93, 0, 19) | 96 | 0.14 | <= 0.28 | 0.14 |
| shed yard centre (58, 0, 17) | 93, 94 | 0.244 | >= 0.70 | 0.76 |
| jetty at the loading door (79, 0, 8) | 92, 94, 97 | 0.244 | >= 0.70 | 1.0 |
| canal ledge (68, -4.4, 4.5) | 92, 94 | 0.244 | <= 0.35 | 0.28 |
| back lane at the cartway / checkpoint (90, 0, 32) | 95 | 0.244 | <= 0.30 | 0.24 |
| clerestory boost spot (79, 0, 29.2) | 95 | 0.244 | <= 0.30 | 0.24 |
| gantry vantage (58, 10, 17) | none (the floods face down) | 0.244 | <= 0.28 | 0.24 |

### Darkest real spot, W4 (and the map's, for the goggle-colour test, level-design 15)
Shed two's aisle at (93, 0, 19) (0.14, the night floor; 18 m long, so the ~20 m goggle test fits its diagonal), on TKL's
route. TGC's darkest on its route is the canal ledge at (68, -4.4, 4.5) (0.28). This replaces SPEC A10 (the ledge
alone): the ledge is moonlit and gets the quay lamps' spill.

## 6. Shadow routes per encounter after the re-light (risk 14: the PR G1 checker blocks a section that loses its last
real gap)
| Encounter | Cover-based shadow route kept | Or the cut / shot that opens it |
| --- | --- | --- |
| W1 market | canal steps -> the west strip by the gallery -> the stall-back aisle (both back walls) -> its east end -> the fish hall side door | the last 4 m to the side door read 0.38: cut 61 or shoot the x 30 row N lamp |
| W1 fish hall | the side door -> the east wall behind the fish-box stacks -> the ice benches (crouched) | the shutter bay is lit: cut 62 at the arch or shoot the two back-row pendants at x 19 and 26 |
| W2 arcade | the west arch -> the NW bay (dark) -> the pier (C3) | the north bay mid reads 0.62: cut 70 at the arch for the east lip |
| W2 reading room | the throw lands on the dark stage; the stage door -> Teale (the room is lit) | cut 77 by the bridge doorway (the table lamps keep pools); the bridge is the quiet way out |
| W3 east yard | the dark wall line under and beside the fire escape -> the latched sash (its last metre reads 0.40 in the gate lamp's pool) | cut 80 in the lodge (or shoot the gate lamp) for the sash; cut 80 or shoot the flood for the yard floor |
| W3 east wing | the press recesses on the west wall | cut 84 at the front-hall opening |
| W3 west wing | the lantern drop onto the gallery (0.42), down into the light well (0.54), the shelf aisles | cut 85 at the double doors |
| W4 shed three | the sash stack -> the stack alley x 84-86 behind the new tea-chest stacks | cut 91 by the fire door |
| W4 shed yard | the cart line's north side; the west corners | cut 93 at the gate box or shoot the crane floods |

## 7. Answers to SPEC open items
- **O4** (the light re-base): this file. The graph notes are D1's, the SPEC's lighting line P1's.
- **O5** (TKL's twist cue "the lodge lamp coming on"): the lodge lamp is on all night (the porter dozes under it, Q2).
  The twist cue is the tell-tale bell and the porter coming out of the lodge door. A BEAT line for J7 (BEAT owner).
- **O6** (the launch's own lamps): one masthead light, group 98, on the launch's battery (no shore switch).
- **O20** (the crane lamp from the W3 roof): section 4.
- **A10** (the darkest real spot): section 5.

## 8. LP picks for the lead (light)
1. **No per-space ambient zones** on top of G0's map-wide 0.14 floor: every level comes from a fitting, so a cut reads
   dark everywhere.
2. **Desk and table lamps switch at the lamp** (rule 5); the tests exempt them from the by-the-door distance.
3. **Walkway lit** (corridor 40 lx, group 79): the plan's provisional map types it a corridor in use; the SPEC's
   "unfitted" is superseded. Two ways to darken (switch, shot), so the C3 choke meets 5.2.
4. **W3 passage typed "corridor at its night setting"** (the maintained bulkhead only), so the chute end keeps its real
   gap and the passage stays a hardened choke with a route round it.
5. **The crane lamp is raised to 14 m** (G4) instead of lowering the coal-yard drop guard.
6. **Shed two is the map's darkest real spot** for the goggle test (replaces A10's canal ledge).
7. **W2 medkit in the pawn fire stair's top landing** (the landlord's first-aid box), not "the beadle's office" (no such
   room is built); W3's on the bulkhead stair's top landing (the porters' roof access), not the lodge (the porter is in
   it); W4's on the lane wall by the shed doors (no shed office is built). Briefs G2-G4 give the points.

Fix round 1 adds three light picks, numbered with the LP report's list (`scratch/campaign/tallow-lp-report.md`):
13. **The W1 warden's office is closed (M1):** the warden is out on his rounds; only his desk lamp is left on. The
    pendant goes, so the inspection hatch reads dark and is the fish hall's vantage (route 1's own way in).
17. **The W1 service passage is lit to the corridor band** by its maintained bulkheads (5 on the centre line, i 1.0),
    not LP's 1.3 lx: no guard works it and no route relies on its dark.
18. **The W3 yard flood hangs under the lodge's eaves** (2.9 m on the lodge's west wall, aimed west-south-west, r 14,
    i 2.5), not 2.2 m over the lodge roof; the head lamp stands on a post on the parapet's end.
