# Marlow Yard (`ctcourse`) - spec (CT prototype B1, 2026-10-18; built state updated by course-ready and marlow-bunker, 2026-10-20)

> **Superseded (marlow-final, 2026-10-23).** Marlow Yard was rebuilt as Vellan & Rook's rehearsal centre: eight
> mock-up sets (A1-A8) joined by holding rooms L1-L7 under an instructor gallery, ending at the cash dock. The build
> contract is `docs/marlow-final/SPEC.md`; who builds what is `docs/marlow-final/PLAN.md`; the map is
> `src/world/maps/ctcourse.ts` (the merge) with `src/world/maps/ctcourseSets/` (the facility and one file per set). The
> bunker bays below (stations S1-S8, airlocks A1-A7, `bayX`, `ctcourseBunker.ts`, `ctcourseVariety.ts`) are retired
> (slice 0d); this file is kept as history.

Prototype greybox under G117: every number is a starting value (G10). The level standard review (G157, `docs/level-design.md`) comes later; this spec follows the map-spec template only where it applies (id, setting, flow, footprints, gates, tests). Map rules are the bunker's (G117 / training D41): linear, no station skippable, anti-stuck resets (G80: the course framework restarts a bay when both are down or one goes out; the thrown / hung partner always gets a way back, built in B4 / B5).

- **Id / name / setting:** `ctcourse`, Marlow Yard. The training floor of a Cold War signals bunker (marlow-bunker, below): a 170 m cut-and-cover gallery refitted as a two-operator assessment course, eight test cells under concrete ceilings, a plywood kill-house mock-up at station 5. Cool white fittings, dark between their pools (`lightLevel` 0.3, all fill: no moon underground). Not listed; course mode only.
- **Fiction (marlow-bunker, from the approved audit):** the test cells are divided by blast bulkheads; the airlocks are decontamination locks, an instructor booth and a plant room in the sealed pockets beside each; the pair comes down by the lift lobby (west) and leaves by the goods lift (east). S1 induction hall and sentry post, S2 / S7 climbing halls, S3 security cell, S4 perimeter laser gate, S5 kill-house mock-up inside a high hall, S6 vault vestibule (the two-person rule), S8 extraction lobby. In-game text says "wall", not "fence".
- **Purpose:** the co-op training course of CT (G179 / G180): 8 stations in CT's order, one lesson each, every station splits the pair and reunites them through an airlock. Target 3-4 min for a practised pair, 9-16 casual.
- **Players:** 2 (`COURSE_MAX = 2`). Both start at x 2, z 6 / 8, facing +x. Solo is the dev flag only (`?course=solo`, dev builds).

## Plan (x east, z north, floor y 0)
Yard 14 m wide (z 0-14), 170 m long. Bay `i` (0-7) spans `x = 22 i .. 22 i + 16`; airlock `A(i+1)` (6 x 6, z 4-10) spans `22 i + 16 .. 22 i + 22`. Perimeter and airlock walls 7.5 m (marlow-bunker; were 6 m fences: above the 4.5 m leg-up reach, so nothing is climbed over). Ceilings (slab undersides, 0.4 m slabs): low cells 4.5 (S1, S3, S6, S8), the laser cell 5.5 (S4), high halls 7.5 (S2, S5, S7); the airlocks have a 3.2 m inner lid. Each obstacle wall stands at bay x + 9, full width (stations 2, 3, 5, 6: one 1.2 m door; 4: a gap; 7: solid; 8: an open doorway). The exit zone is 4 x 8 m at the last bay's end.

| # | CT drill | Footprint / height | Built now (gate) |
| --- | --- | --- | --- |
| 1 | Read the panel; (PR 3) the training guard | open bay, one optional panel on the north wall (x 3.5); a passive training guard on his post at x 10.5, z 3.2 by the south wall, facing +x (his back to the start) | no gate: both onto the A1 pad; the guard is optional (grab him from behind, hold A: INTERROGATE) |
| 2 | Leg-up over a wall | wall 4.4 m, 1 m thick (ledge band, G57); leg-up square at bay +8, z 3.5 | bolt `g-s2`: the boosted player unbolts S2-door from the far side (side test at the door plane x 31); then opens it for the partner |
| 3 | Jam a camera | bulkhead to the 4.5 m ceiling (was a 3.2 m wall), camera over the door; blind-spot pocket (blue-grey) in front of it; (sector-fixes S) a security room off the far lobby (x0 + 7.6-13.6, z 8-14; door in the x0 + 13.6 cross wall, z 9.2-10.4) with a passive duty guard (`s3-sec-guard`) at the monitors | flag `g-s3`: both in the pocket (one jams the camera with the pistol's held LT / Z); optional pickup `g-s3-cams`: with the guard down (knocked out or killed) the console `sw-s3-console` sets `cams-off-s3` and `cam-s3` is off until the bay restarts (an alternative to the second jam, which works unchanged; not in Sector Ops) |
| 4 | Partner throw over a laser | wall to the 5.5 m ceiling with a 6 m gap (z 4-10, header from 4.6 m) closed by a 3-beam laser band; red release on the north wall (bay +12) | pickup `g-s4`: thrown player presses the release, the band goes off; jamming its power panel (`panel-s4`, high on the far side's south wall, jammed diagonally through the gap from the near side's north half, sector-fixes P) stays the alternative |
| 5 | Leg-up + ledge relay, hang-down hack | roofed annex x +9..+16, walls 4.0, roof top 4.4, grid wall at +12.5, wall medkit; leg-up square at bay +8, z 3.5; 0.55 m roof hatch over the back room (x +14.125..+14.675, z 1.0..1.55), hack panel under it (x +14.4, z 0.4, 1.2 m up) | pair `g-s5` (roof plates, 1 s window) opens S5-door; lever `g-s5-grid` (hack panel, reached hanging through the hatch) opens the grid; then off the roof, through S5-door and the grid to A5 |
| 6 | Paired scanners | bulkhead to the 4.5 m ceiling (was 3.2 m), scanners 13 m apart on the two long walls | flag `g-s6`: both hacks finish within the sync window |
| 7 | Two-person rope | solid wall 4.4 m, 1 m thick, full width, no door; leg-up square at bay +8, z 3.5; holder strip on top; far-side return stair (1.1 m rises, z 0.4-1.6) | none: leg-up one, the one on top drops the rope, the partner climbs |
| 8 | Last wall, both extract | bulkhead to the 4.5 m ceiling (was 3.5 m) with an open doorway, lit exit zone (x 165.5-169.5, z 3-11), wall medkit before the wall | none: both in the exit zone ends the course |

## Rules and rulings used
- **The training guard (PR 3, Michael 2026-10-20 08:40: "Add one in Marlow Yard").** Station 1 spawns one guard (`GUARD_SLOT` `s1-guard`, a `grunt`, `passive`: sees and hears nothing, stands his post until he is taken) at x 10.5, z 3.2, facing +x, so the players come up behind him from the start. He has information (`SquadSlot.info`, `src/ai/guardInfo.ts`): grabbed, hold A lists INTERROGATE, and he says two lines as subtitle: "Easy! There is a medkit on the north wall of the annex." / "And one on the north side, before the last wall. That is all I know." (true: the wall medkits of station 5 and station 8). Asked once, he gives no menu again; the hold ends only by knockout or kill. A bay restart respawns him fresh; the next bay's start removes him. Optional: no gate, drill or e2e route depends on him.
- The course ends only when BOTH players stand in the exit zone and the drills are done (G138); a downed player refuses it ("Revive first"). The dev solo flag lets one player end it.
- No bay has drills: the HUD step line shows the bay's objective (`CourseDef.objectives`, one per bay); LANTERN speaks a line at each bay start and when each station gate opens (radio keyed by gate id; a flag gate's line on its flag).
- Text names pad and keyboard both (A / E, Co-op RB / F, LT / Z, Y / Space, X / RMB, LB / Tab). Radio and objectives are <= 90 characters, panels <= 120.
- A lone roof-plate press shows "Partner: press the other plate now". The bolt's "Unbolt" item goes off once unbolted (the door menu shows) and comes back on a bay restart.
- A bay restart brings an alive partner back to the checkpoint too (as Sector Ops).
- Wall medkit stations (G180) at the annex (station 5) and before the last wall; they heal by difficulty: Normal / Rookie full, Hard (Realistic) 50% of max, Expert (Perfectionist) 25%; single use (existing station code).
- Return paths: the station 7 stair; a player dropped into the station 5 back room can press the hack panel from the floor.
- Panels are the interactable labels plus the bay's radio lines (text only, no voice). Names and text are original.

## Element register (level-design 16.9; marlow-bunker rows: the 29 lamps and every new object)
Positions: bay origin x0 = 22 (n - 1), z north, y up. "No light change" = under the bake's 5 cm (`CANON_MIN_THICK`) or collide=false and thin; every dressing piece is collide=false (no ledge, no step, no nav surface).

| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| C1-C8 | Cell ceilings, 0.4 m slabs (underside 4.5 S1 / S3 / S6 / S8, 5.5 S4, 7.5 S2 / S5 / S7) | The gallery's cut-and-cover roof; the climbing halls and the kill-house hall are the tall bays | Seals the course (no sky); light shade; the high halls keep 3.1 m over the 4.4 m tops, S4 the throw's arc | 16.5.1 |
| P1 | Perimeter and airlock walls 6 -> 7.5 m | Retaining walls of the gallery, up to the highest roof | No climb over (boost 4.5 m) | 16.3.5 |
| AL1-AL7 | Airlock inner lids, 3.2 m, with 45 deg haunches at z 4.3 / 9.7 | A decontamination lock is a small sealed room: low lid, chamfered for washdown | Keeps the airlock lamp in its lock (doors shut); camera stays tight | 16.5.1 |
| B3, B6, B8 | S3 / S6 / S8 obstacle walls to the ceiling (were 3.2 / 3.2 / 3.5 m) | Blast bulkheads between test cells, each with its door (S8 an open doorway) | No wall top to jump onto (settles the 3.2 m vs 3.8 m wall-jump); light behind them unchanged | 16.3.5 |
| B4 | S4 wall to the 5.5 m ceiling, a header from 4.6 m over the 6 m gap | The perimeter laser gate's frame: an opening only the beams close | The throw's arc (apex 1.7 m over the line) passes under the header; the gap stays the route | 16.3.1 |
| D1 | Ceiling ribs 0.3 m deep across the span (x0 + 2 / 6.5 / 10.5 / 14.5; none within 2 m of a ceiling lamp) | Downstand beams carrying the slab over the 14 m span | None (in the bake, over every lamp's height or 2 m off it) | 16.4.1 |
| D2 | 1 m chamfered haunches at the ceiling / long-wall joints (pitched, collide=false) | Cast-in haunches of a cut-and-cover box | None (pitched: never a ledge) | 16.4.1 |
| D3 | Two LED strips along each cell ceiling (z 3.5 / 10.5) | Emergency guidance lighting | None (paint, no light: not a lamp) | 16.8.1 |
| D4 | Panel seams every 2 m on the long walls | Precast wall panel joints | None (no light change) | 16.4.1 |
| D5 | Colour band per cell at 1.2 m (brick, violet, rust, red, tan, indigo, magenta, white; no yellow, green or blue-grey) | Cell wayfinding paint | Which cell you are in at a glance (no light change) | 16.6.4 |
| D6 | Steel door frames and a pale status lamp over every course door (airlocks, S2 / S3 / S5 / S6 doors, the S5 grid, the S8 doorway) | Lock and bulkhead door frames with door-state lamps | Finds the doors (no light change; not a light) | 16.3.1 |
| D7 | Entry lift doors on the west wall (2.4 m wide, closed) | The lift lobby the pair comes down by | Start reads as an arrival (visual) | 16.2.1 |
| D8 | Goods lift doors on the east wall (3.6 m wide, closed) | The goods lift the pair leaves by | The exit zone reads as the way out (visual) | 16.2.1 |
| D9 | Pendant rods (0.04 m, two per pendant) | Hangers for the high halls' and S3's pendant fittings | None (no light change) | 16.8.1 |
| D10 | Bulkhead cages (thin bars round each airlock fitting) | Vandal guard on a lock's lamp | None (no light change) | 16.8.1 |
| M1 | S2 / S5 / S7: yellow band on the wall face under the lip over the leg-up square | The leg-up spot's mark carried up the wall (the same element as the floor square) | Where to boost (no light change) | 2.5 |
| M2 | Removed (marlow-jammer; Michael 2026-10-21: the camera's red view overlay shows its area, no painted floor lines). Was: S3's two red floor lines on the camera's sweep edges | - | - | 8 |
| M3 | S4: emitter plates with three red beam heads on the gap's wall ends | The laser band's emitters and receivers | Where the beams run (no light change) | 16.3.1 |
| M3b | S4: the laser power panel (`S4_PANEL`, a small wall box with a status LED) on the far side's south wall at bay x + 12, 4 m up (sector-fixes P) | The band's power supply | Jammed (pistol, from about bay x + 5.5, z 10.5) it cuts the band; electro shows it (no light change) | 16.3.1 |
| M4 | S5: the roof hatch's cover, open flat beside it (0.04 m, collide=false) | A roof hatch has a cover (16.3.2) | None: the hatch, the holder's square and the hang-down are unchanged | 16.3.2 |
| M5 | S6: white "pair" line painted from scanner A to scanner B | The vault vestibule's two-person rule | The scanners are a pair (no light change) | 8 |
| M6 | S7: the rope's anchor plate in the holder strip (0.03 m, collide=false) | Where the training rope is fixed | Where the holder stands (no light change) | 16.4.1 |
| L1-L8 | Bay lamp A (x0 + 4, z 7), each cell: flush strip `{1.6, 0.06, 0.2}` at ceiling - 0.15 (S1 / S3 / S6 / S8: 4.35, 0.9, r 13; S4: 5.35, 0.85, r 13, faintly red), pendant on rods at 5 (S2 / S5 / S7: 0.9, r 13) | The cell's working light, on the training floor's circuit | The cell's west pool | 16.8.1 |
| L9-L16 | Bay lamp B (x0 + 12.5, z 7), each cell: as L1-L8; S5's is a flush strip at 7.35 (0.9, r 13) over the kill-house roof | As L1-L8 | The cell's east pool; S5 the roof (plates, relay lip, hatch) | 16.8.1 |
| L17-L23 | Airlock lamp (x0 + 19, 3.05, z 7), caged bulkhead `{0.3, 0.2, 0.3}`, 0.35, r 7 | A decontamination lock's utility lamp | The pad and both doors readable; stays in its lock with the doors shut | 16.8.1 |
| L24 | S2 wall-top lamp (x0 + 9.9, 7.35, z 5), flush strip, 0.5, r 7.6 | A high hall's ceiling fitting over the climbing wall | The wall top, the drop and the bolt | 16.8.1 |
| L25 | S3 lamp (x0 + 6, 3.0, z 7), pendant on rods from the 4.5 m ceiling, 0.9, r 7 | The security cell's task light over the camera approach | The approach and the blind spot (unchanged) | 16.8.1 |
| L26-L28 | S5 kill-house lamps, flush panels `{0.6, 0.05, 0.6}` at 3.85 under the roof slab, 0.8: front room (x0 + 11, z 7, r 8), back room over the hack panel (x0 + 14.2, z 3, r 8), over the medkit (x0 + 14.6, z 11.5, r 6) | The mock-up's ceiling panels | The rooms, the hack panel, the medkit | 16.8.1 |
| L29 | S7 wall-top lamp (x0 + 9, 7.35, z 7), flush strip, 0.7, r 5 | A high hall's ceiling fitting over the rope wall | The holder on the wall top; no ground | 16.8.1 |

Lamp colour (render only): cool white `[0.85, 0.92, 1]` (was the sodium default); S4 `[1, 0.82, 0.8]`. Light values before and after: `docs/archive/marlow-bunker/LIGHT.md`.

### marlow-variety rows (the marlow-bunker polish list)
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| V1 | S1 sentry desk with a screen and a log book (x 10.3-12.1, z 0.9-1.7, collide=false) | The induction hall's sentry post, behind the guard on duty | None (no collision: no vault or mantle; the grab area x 2-10.5, z 2.5-5 stays clear) | 16.4.1 |
| V2 | Blast-door frame round the entry lift (west wall, black, white chevrons) | The lift lobby's armoured opening | Start reads as an arrival (no light change) | 16.3.1 |
| V3 | Moved into the security room (sector-fixes S, A8): see SR2. Was: S3 monitor wall (south wall, x0 + 1.4-6.6, six screens) | - | - | 16.4.1 |
| V4 | Plant-room faces in the south pockets (louvre, steel door, trunking), every cell end but S5's east end | Each lock's plant room (air handling for decontamination) | None: the pocket stays sealed void (no light change) | 16.3.4 |
| V5 | Instructor booth faces in the A3 and A4 north pockets (one-way glass, no opening) | Instructors watch the camera drill (S3) and the laser drill (S4) | None (no opening, no lamp, no light change) | 16.3.1 |
| V6 | S5 plywood skin on the kill-house front face and grid wall, painted window outlines | A kill-house mock-up is plywood on a frame; its windows are painted | Reads as a mock-up (no light change; the leg-up band stays on top) | 16.4.1 |
| V7 | S6 pilaster-and-lintel frames round both scanners (0.3 m proud, collide=false) | The vault vestibule's scanner surrounds | Finds the scanners (in the bake: levels unchanged, test) | 16.4.1 |
| V8 | S6 server racks x 4 on the west wall, z 8-10.5 (2 m, solid, no lip) | The vestibule's comms racks | Too tall to vault or mantle, no lip; levels unchanged (test) | 16.4.1 |
| V9 | S7 return stair painted as training blocks (risers, sides, white nosings) | Concrete training blocks | The stair reads as steps (surface unchanged) | 16.2.6 |
| V10 | S8 exit coffer: two 0.3 m beams at z 4 / 10 between the last two ribs, a faint green LED ring | The extraction lobby's lit lift bay | Marks the exit over the green square (lamp unchanged) | 8 |
| V11 | S4 hazard frame round the red release (white with red marks) | A safety release is framed | Finds the release (no light change) | 8 |
| V12 | Hazard stripes on every course door frame (black, white diagonals) | Doors in a training bunker are hazard-marked | Finds the doors (no light change) | 16.3.1 |

### sector-fixes S rows (the security room, `docs/archive/sector-fixes/s/PLAN.md`)
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| SR1 | S3 security room, x0 + 7.6-13.6, z 8-14 (5.7 x 5.7 m inside) under the 4.5 m slab: new west and south walls (0.3 m, to the ceiling, `noLedge`); a 1.2 m door (z 9.2-10.4, lintel 2.1 m, steel frame, a plain unlocked door) in the far lobby's cross wall x0 + 13.6; camera space `tight` | The blast cell's guarded security room, off the secure side behind the camera | Optional co-op beat for whoever crossed first: the door is behind the camera, out of frame at every sweep angle; nothing new to climb | 16.6.2 |
| SR2 | Monitor wall (V3 moved here) on the room's west wall, face x0 + 7.75, z 9-13, y 1.0-2.7, six screens (render only); desk under it, x0 + 8.05-8.65, z 9.9-12.1, top 0.73, collide=false; the console on it at x0 + 8.55, z 11.6, y 0.9, facing +x (course device `sw-s3-console`, reach 1.4) | The duty officer's camera monitors and desk | The console switches `cam-s3` off once the guard is down; no vault or mantle on the desk, no nav change | 16.4.1 |
| SR3 | L30: room ceiling panel, flush `PANEL` at (x0 + 10.6, 4.35, z 11), 0.8, r 6, cool white, on the cell's circuit (electric, destructible) | The security room's ceiling fitting | Lights the guard at the monitors and the console; the far lobby's tuned levels hold within 0.08 with the door shut (test) | 16.8.1 |
| SR4 | The duty guard (`s3-sec-guard`, grunt, passive: sees and hears nothing) at x0 + 9.25, z 10.75 (a nav cell centre), facing -x (the monitors, his back to the door); INTERROGATE: "All right! The desk console switches the hallway camera off." Bay 3's squad: respawned on a bay restart, removed at bay 4 | The duty officer watching the cameras | While he is up the console refuses ("Take him out first."); taken out = knocked out or killed (a held guard is still up) | 16.8.2 / 4.1 |

## Tests
`tests/ctcourse.test.ts` (map validates, exit both-in rule, bolt side and item, pair hint, radio per gate, text limits, leg-up squares; marlow-bunker: every ceiling and lid, only the planned lips under the ceilings, the S4 header over the throw), `tests/ctcourseLight.test.ts` (the light pass; marlow-bunker: no moon, the 0.30 fill, every tuned level within 0.08), `tests/medkit.test.ts` (by difficulty), `scripts/e2e-ctcourse.mjs` (two pages walk all stations; the exit refuses with one player; sector-fixes S: the S3 security console refuses with the guard up, then switches the camera off on both pages), `tests/securityRoom.test.ts` (the console rules).
