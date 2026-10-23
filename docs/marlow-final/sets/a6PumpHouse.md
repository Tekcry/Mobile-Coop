# A6 - Set 6, the Pump House (set doc)

Status: SET DOC (PLAN.md slice 6 step 1), written 2026-10-23 by the A5-A8 set-doc agent, before any geometry.
Set id `a6PumpHouse`; file `src/world/maps/ctcourseSets/a6PumpHouse.ts`; plans `plans/a6PumpHouse-ground.svg`,
`plans/a6PumpHouse-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A6 sheet, route summary), 10, 12, 13, 14 (N4), 15,
18 (A6 rows); LIGHTING-PLAN section 3 (A6) and `MARLOW_CIRCUITS` / `MARLOW_POCKETS`; GREYBOX-HELPERS.md (with "Changes
from the tests" and the job lead's corrections of 2026-10-23); ENGINE-ANSWERS.md (Q2 lure, Q6 revive, Q8 cage, Q12 hold
noise); `docs/level-design.md` section 13. Coordinates: x east, z north, metres, floor y 0, yaw radians with 0 = +z.
Decisions and contradictions: section 13 (`A6-D<n>` / `A6-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 6, the Pump House. Pump floor (y 0) plus the motor gallery and the bridge (deck y 4.4). A tidal-barrier pumping station: three vertical pumps in a row, the old sump bay inside the entry, the motor gallery along the north wall with the rescue davit, the bridge over the drive bay, the drive cage under the bridge, the attendant's desk and the staff stair at the lit east end. Set box x 40-64, z 54-72 (24 x 18 m), 9 m to the hall roof |
| New mechanic | Teaches the hang-down (N4 3 s hold on the drive panel). Uses the two-person rope once, untimed (P10). Combines the leg-up and patrol timing |
| Entry vantage | Crouched behind the sump bay's 1.2 m guard kerb at (51.0, 56.6): the attendant's whole loop (desk, gauge board, pump 3) within one cycle, the cage and its south door, the gland plate's yellow lifting-point sign on the bridge's south fascia, the outfall door's red interlock lamp. Dark (`a6-sump`, the sump high-bay is tagged out) and below the kerb |
| Routes | Up, shadow (taught): "I boost you at the dark west end, you drop the rescue line, I climb." Up, high-skill: "You hang on the open edge and I climb you (ledge relay)." Up, risky: "The staff stair at the lit east end while he stands at pump 3." Then the only way to the drive: "Crouch on the bridge, I lower you through the gland plate, you hold the isolate key while he is at his desk." Fallback: "If you drop, finish the hold from the cage floor, press the exit release on the cabinet's back and walk out of the cage door." Out: "Down the staff stair and through the outfall door while he is at pump 3." |
| Loop | Round the cage (its south side under the pump row, its north side under the bridge, 3.4 m of open floor) and round the three pumps; the pump floor's dark west third joins both |
| Stepping stones | Kerb vantage (51.0, 56.6) -> the kerb's west opening (48.8, 58) -> pump 3's plinth (46, 61, low cover, the `a6-pump3` pocket) -> the dark west end (43.05, 69.1): 12 m in two hops, each in the tagged-out dark. On the gallery: the open span (dark), then the edge screens to the bridge. Out: stair foot (63.7, 71.2) -> desk (low cover, 4 m) -> pump 1's plinth (4 m) -> L6 door (2.5 m) |
| Guards | `a6-attendant` (section 2). One guard: no overlap. Isolation moment: pump 3 (dark, alone, facing the gauge on its east face) |
| Lights | Pump floor high-bays 60 (switch by the outfall door), gallery strip 61 (switch at the stair head on the gallery), desk lamp 62 (switch on the desk), cage work light 63 (the drive panel's own circuit), sump high-bay and west gallery fittings 69 (tagged out, dead). Chokepoint (the east end between the stair foot and the outfall door): darkened by 60 off (but then the cage is the one lit box) or the jammer (one high-bay at a time); avoided by timing (his pump 3 stop) |
| Surfaces | Wet concrete pump floor (quiet); gallery and bridge chequer plate (`metal`, loud: a walk on the bridge is louder than the hang); the sump bay's plated cover (`metal`, loud above crouched gears 1-3) |
| Toys | The gallery switch (lure), the desk lamp switch, the floor switch, the high-bays (jam, shoot), the cage's exit release, the gland plate, the davit box and line, the outfall door's interlock |
| Hide spots | The sump bay behind the kerb (`a6-sump`); behind pump 3's plinth (`a6-pump3`); the dark west end under the gallery's open span; the gallery deck behind the edge screens; inside the cage (solid walls, see A6-C2). A body on the pump floor is on his loop (he passes every pump and the cage's south side); a body in the dark west end is out of it |
| Traversal elements | Motor gallery open loading edge x 40.8-45.3 (co-op lip 4.4, `coopDeck`, rope); the bridge and the gland plate (`hangPlate`); the staff stair (27 risers). Section 1.3 |
| Exit | Pinch point: the outfall door (the facility's L6 near door at x 64, z 61.1-62.9), a `flag` gate on `a6-drive` with the red / green interlock lamp beside it. Checkpoint: L6 (x 64-70, z 59-65). L6's glass slot shows A7's entry lobby and its two glazed doors |
| Tension | 3 |

### 1.1 Dimensions (6 m grid: x 40, 46, 52, 58, 64; z 54, 60, 66, 72)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 40-64, 54-72 | 9.0 to the hall roof | Box-edge walls are `facility.ts`'s (L5 door z 54, x 52.1-53.9; L6 door x 64, z 61.1-62.9; gallery glazing above 4.5 m on the south wall, the north strip's step-out over A6) |
| Sump bay | 48.2-57.8, 54.2-58.0 | floor 0 (plated) | The old sump, filled and plated over. Guard kerb along z 58 (x 49.4-56.6, 0.3 thick, 1.2 tall) with 1.2 m openings at both ends |
| Pumps 1, 2, 3 | centres (60, 61), (56, 61), (46, 61) | plinth 1.2; column to 4.0 | `pumpUnit`: plinth 2.4 x 2.4 (low cover), pump column 0.64 x 0.64, motor envelope 1.2 x 1.2 to 4.0, `noLedge`. Pump 3 at x 46 (SPEC x 45, A6-D3) |
| Gauge board | (58.0, 1.2, 62.4) on a stand between pumps 1 and 2 | 1.5 | The duty pumps' common gauge panel (the attendant's G stop) |
| Motor gallery | 40.3-56.0, 69.6-71.775 | deck 4.4 | `coopDeck`, solid block, `noLedge`. Open loading edge x 40.8-45.3 (drop chain dressing, P13); 1.2 m edge screens on x 45.3-49.0 and 54.0-56.0; the bridge joins at x 49-54 (A6-D4) |
| Davit box and rescue line | box (43.15, 4.4, 71.2); rope spot (43.15, 4.4, 70.2) | box 0.6 | `davitBox` prop on the gallery's back wall; the rope's anchor plate on the open span |
| Staff stair | 56.0-63.7, 70.575-71.775 | 0 -> 4.4 | `coopDeck` stair, 27 risers of 0.163, run 0.285, rising west (foot at x 63.7 by the desk, head at x 56.0). Handrails both sides |
| Bridge, south part | slab 49.0-54.0, 61.6-66.6 | 4.0-4.4 | `hangPlate` slab (overhang 0.4), `noLedge`, `overhead`. Gland plate opening 0.55 m centred (51.5, 64.9) |
| Bridge, north part | slab 49.0-54.0, 66.6-69.6 | 4.0-4.4 | Hand slab, `noLedge`, `overhead`; open floor under it (headroom 4.0) |
| Bridge handrails | x 49.0 and x 54.0 from z 61.6 to 69.6; z 61.6 from x 49 to 54 | 1.1 | `kit.handrail` (invisible collide box: never a lip, stops sight) |
| Drive cage | 49.4-53.6, 62.0-66.2 | walls to the slab's underside (4.0) | `hangPlate` cage, 4.2 x 4.2, solid wall boxes dressed as louvred sheet-steel panels with a 1.2 m kick band (A6-C2). Door (`a6-cage`) on the south face, x 50.9-52.1 at z 62, locked |
| Drive cabinet | 51.1-51.9, 63.8-64.4 | 1.6 | `driveCabinet`. Panel `sw-a6-panel` (51.5, 1.2, 64.42) facing north (toward the plate), hold 3 s, `holdNoise` 6. Exit release `sw-a6-exit` (51.5, 1.1, 63.78) on the cabinet's back, facing the door |
| Attendant's desk | 60.6-62.4, 65.6-66.4 | 0.75 | Desk with the log and the desk lamp (62). His post D at (61.5, 67.1) |
| Interlock lamp | (63.7, 2.3, 64.0) beside the outfall door | - | Device emissive, red until `a6-drive`, then green |

Doors and spacing: L5 door (53, 54) -> cage door (51.5, 62): 8.1 m; cage door -> L6 door (64, 62): 12.5 m. Every pair
over 5 m. The cage door is a locked staff door with an egress release inside only.

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Gallery open edge x 40.8-45.3 (`a6-gallery-lip`) | 4.4 | `coopDeck` manual ledge | Yes | The only lip in the band in A6 |
| Gallery screened edge, deck ends | 4.4 / 5.6 | `coopDeck` (`noLedge`, screens) | No | - |
| Bridge slab edges (south end and both sides) | 4.4 | `hangPlate` / hand slab, `noLedge`; handrails | No | No unplanned lip; the handrails stop sight to a crouched holder |
| Pump columns / motors | 4.0 | prop, `noLedge` | No | In the 3.8-4.5 band: `noLedge` required |
| Pump plinths | 1.2 | prop | No | Low cover; solo-standable tops (keep-clear below) |
| Desk, gauge board, kerb | 0.75 / 1.5 / 1.2 | hand boxes | No | - |

Keep-clear (`GREY_KEEP_CLEAR` 4.7 m) round the open edge x 40.8-45.3, z 69.6 on the floor side: pump 3's plinth
(nearest corner (47.2, 62.2)) is 7.6 m away; nothing else stands over 0.3 m in x 36-50, z 64.9-69.6.

### 1.3 Greybox helper calls

```ts
coopDeck({ id: 'a6-gallery', at: { x: 48.15, z: 69.6 }, facing: '+z', span: 15.7, depth: 2.175, lip: 4.4,
  open: [-7.35, -2.85], screen: 1.2, stair: 'end', stairW: 1.2, rope: -5.0 });
// deck x 40.3-56.0, z 69.6-71.775; lip a6-gallery-lip x 40.8-45.3 -> COOP_LIPS; legUp spot (43.05, 0, 69.1);
// rope spot (43.15, 4.4, 70.2), runner (43.15, 0, 69.0); stair x 56.0-63.7, z 70.575-71.775, 27 risers;
// then split the east edge screen to leave x 49.0-54.0 open for the bridge (A6-D4).

hangPlate({ id: 'a6', at: { x: 51.5, z: 64.1 }, facing: '-z', deck: 4.4, slab: 0.4, cage: [4.2, 4.2], overhang: 0.4,
  hole: 0.55, hold: 3 });
// facing -z: the holder faces south, u = -z. Slab x 49.0-54.0, z 61.6-66.6 with the plate at (51.5, 64.9);
// holder spot (51.5, 4.4, 65.6); cage x 49.4-53.6, z 62.0-66.2, door `a6-cage` on the south face;
// devices `sw-a6-panel` (hold 3) and `sw-a6-exit`; gates `g-a6-exit` (egress, door a6-cage) and
// `g-a6-panel` (pickup, flag renamed from `a6-done` to SPEC's `a6-drive`, A6-D5). Set panel.holdNoise = 6.
```

Hand data beside them: the bridge's north slab and handrails; the L6 near door gate `{ kind: 'flag', id: 'g-a6-outfall',
flag: 'a6-drive', doorId: <facility's L6 near door id> }`.

## 2. Guard sheets

### `a6-attendant`

| Field | Content |
| --- | --- |
| Guard | `a6-attendant`, kind `grunt`, A6 squad, slot (61.5, 67.1) (D), yaw pi |
| Job | The pump attendant on watch: logs the duty pumps at the desk, reads the gauge board between pumps 1 and 2, then walks to the far standby pump (pump 3) to read its gauge |
| Route | `route: [[61.5, 67.1], [60.0, 67.0], [58.0, 63.1], [54.2, 62.9], [54.2, 61.2], [48.2, 61.0], [54.2, 61.2], [54.2, 62.9], [60.0, 67.0]]` (W (60.0, 67.0) is a pass point round the desk's west end: the straight legs clip the desk for a 0.3 m body), `waits: [4, 0.1, 3, 0.1, 0.1, 4, 0.1, 0.1, 0.1]` (0.1 s pass-through stops as built: a wait of 0 freezes `PatrolWalker`), `faces: [pi, NaN, pi, NaN, NaN, -pi/2, NaN, NaN, NaN]`. D = the desk (facing south over the log), G = the gauge board (facing south), the gap between pump 2's plinth and the cage's south-east corner (1.2 m), P3 = pump 3's east face (facing west, its gauge). Walk 33.7 m at the patrol pace (0.99 m/s) + 11 s of stops: loop 42.35 s on the walker as built (0.45 m arrival radius; plain sum 45.6 s) (A6-C1) |
| Timeline (t = leaving D) | 0-5.4 D -> G. 5.4-8.4 G stop, facing south. 8.4-19.9 through the gap and west along z 61.2 past the cage door (t 14-17) to P3. 19.9-23.9 P3 stop facing west. 23.9-31.7 back east past the cage door (t 26-29) and north through the gap. 31.7-40.2 north-east to D. 40.2-44.3 D stop facing south |
| What he sees | At D: south over pumps 1-2 and the outfall door; the stair foot is behind him. At G: south to the sump kerb (the kerb hides crouched players). At P3: west into the dark west third; the gallery's open span is 57 deg off his facing, 9.6 m (periphery). Walking along z 61.2 he passes the cage door at 0.9 m (the cage walls are solid: he sees nothing inside) |
| Gaps | t 31-12: he is east of the cage (desk, gauge board), the west end and the cage are out of his focus. t 14-30: he is west (pump 3), the east end and the outfall door are behind him |
| Isolation moment | P3 (48.2, 61.0), t 19.9-23.9: alone, in the `a6-pump3` dark pocket, facing the gauge, unwatched. A takedown from behind pump 3's plinth (north side) |
| Covered by / covers | One guard: none |
| Lures | Gallery switch 61 off (`a6-sw-gallery` at the stair head on the gallery, y 4.4): he walks to the floor under the press point, about (56.5, 70.0), at the gallery's front by the stair (A6-C6), looks 4 s, gives up within 20 s. Use: pulls him off the cage's south side when a dropped B must walk out of the cage. Floor switch 60 off (by the outfall door): he walks to the door. Desk lamp 62 off: he walks to the desk. The drive panel's buzzer: a heard noise within 6 m (`holdNoise`): within about 2.6 m he goes suspicious and looks, farther he turns (SPEC N4, ENGINE-ANSWERS Q12; client holds now pulse to the host) |
| Search | After a sighting: round the cage and the pumps (search ring 11 m). Nearest hide spots: behind pump 3, the sump bay, the dark west end |
| Body | A body on the pump floor anywhere between the pumps and the cage is on his loop; in the sump bay or the dark west end it is off it |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A6 the Pump House | 3 | The hang-down onto a hold device (N4) | The leg-up and the two-person rope (once, untimed); patrol timing | The pump running down and the interlock lamp turning green | "Hold still, he's coming back": one partner upside down in a cage, the other holding him and watching the walk |
| L6 | 1 | - | - | A lobby; through the glass, A7's two glazed doors and the fire plan | Breathe; the split is next |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Hang-down | Taught (C8): head-first through the 0.55 m plate, reach the panel at depth 2.5 |
| Hold device (N4) | Taught: the 3 s isolate key, buzzing to 6 m |
| Two-person rope | Used once, untimed (C7, P10): the rescue line from the davit box |
| Leg-up | Combined (C7) |
| Ledge relay | Optional second tool on the same lip |
| Lip hang / shimmy | Optional along the open span |
| Takedown from behind, carry and hide a body | Optional (P3, the dark west end) |
| Light switch / lights-out lure | Toy (61 to the gallery front, 60 to the outfall door, 62 to the desk) |
| Held jammer on a lamp | Optional (one high-bay at a time for the exit) |
| Egress release | Tested only in the fallback (the cage's exit release) |
| Doors | L5 / L6 slide doors; the cage door (egress) |
| Partner throw, paired hack, console, dual takedown | Not used here |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: plant ladders are dressing behind locked plant doors (SPEC 8) |
| Revive | Tested in slice 9 on the gallery (deck 2.175 m deep, room beside a downed player) and on the bridge (5 m wide) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The 4.4 m gallery with no stair at the dark end | Leg-up + rope / leg-up + ledge relay / the staff stair at the lit east end (timed on P3) |
| The drive panel inside a closed cage | Hang-down through the plate / drop into the cage and press from the floor (fallback) / nothing else: the panel is out of reach from outside (helper-proved) |
| The buzzer during the hold | Hold while he is at the desk or the gauge board (over 6 m) / lure him to the gallery front with 61 / take him at P3 first |
| The attendant on his loop | Time his east stops (t 31-12) / take him at P3 / lure him with 61, 60 or 62 / the kerb and pump plinths as cover |
| Getting out past the lit east end | His P3 stop (timing) / jam the high-bay over the desk / take him first / 60 off (then he walks to the outfall door: bad) |
| A dropped hanger in the cage | Finish the hold from the floor / exit release on the cabinet's back / leave by the cage door while 61 lures him north |
| Loud floors (chequer plate, the sump plate) | Silent crouched gears / the quiet pump floor / the hang instead of walking the bridge |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Gallery lip | 4.4 | `COOP_BAND` 4.3-4.5 | Yes |
| Leg-up mark | (43.05, 69.1), 0.5 m off the deck face | `LEGUP_STANDOFF` 0.5 for a deck | Yes |
| Rope | 4.4 m drop | `TEAM.ropeMin` / `ropeMax` 2.2-6.0 | Yes |
| Rope climb | 4.4 m at `ropeUp` 1.0 m/s + top 0.9 s = 5.3 s | Untimed | Yes |
| Plate | 0.55 m | Under 2 x `MOVEMENT.radius` (no body through) | Yes (helper throws otherwise) |
| Hang reach | Panel 0.48 m from the hang point at depth 2.5 | `hangReaches` at `hangDepthMax` 2.5 | Yes (helper-proved) |
| Panel and exit release from outside the cage | 2.08 m or more from any body outside | `INTERACT_REACH` 1.8 | Yes (helper throws otherwise) |
| Panel from the deck | dy 3.2 | `INTERACT_DY` 1.5 | Yes |
| Hold window | 3 s hold + 0.8 s lowering + 0.9 s pull-up = 4.7 s | His east stops: over 6 m from the panel for t 35-12 (21 s) | Yes |
| Buzzer reach | `holdNoise` 6 m; panel to D 10.4 m, to G 6.6 m, to P3 4.8 m, to the gap 3.0 m | Heard only in the west half of his loop | Yes (A6-D6) |
| Bridge / cage | Bridge 5.0 m, cage 4.2 m, overhang 0.4 | `hangPlate` (a 3 m bridge throws) | Yes (correction) |
| Holder hidden from the floor | Crouched head (5.4) behind the 1.1 m handrail / the slab from D and G | Sight lines from D and G checked by hand (A6-C5) | Yes (the light / sight test confirms) |
| Exit window | Stair head -> foot 7.7 m + foot -> L6 door 9.4 m at 1.7-2.1 m/s = 9-10 s | His P3 leg, t 14-30 | Yes |
| Cycle / stops | 42.35 s on the walker (plain sum 45.6 s); 4 / 3 / 4 s | LD 4.3: 25-45 s; 3-6 s | Yes (A6-C1) |
| Pump-2 gap | 1.2 m (x 53.6-54.8) | Nav agent 0.64 m | Yes |
| Under the bridge | Headroom 4.0, 3.4 m deep | Nav headroom 1.7 | Yes |
| Stair | 27 x 0.163, run 0.285, 1.2 wide | Scale sheet; handrails both sides | Yes |
| Doors | L5 / L6 1.8 m (facility); cage door 1.2 x 2.1 | Doors; 5 m apart | Yes |
| Pockets vs gallery glazing | `a6-sump` against the south wall (z 54.3) | SPEC 5: no dark pocket within 4 m of a gallery wall | No: kept by the SPEC A6 sheet (A6-C3) |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y) | Switch / reason | Cut by | Lure |
| --- | --- | --- | --- | --- | --- | --- |
| 60 | `a6-floor` | switch | 3 high-bays (y 8.4, radius 11, intensity 1.1; at radius 10 / 1.0 the desk and stair foot read 0.58, floor pool about 7 m): (61.0, 57.5), (61.0, 63.0), (61.0, 68.5): the east third only | `a6-sw-floor` (63.7, 60.4), by the outfall door | switch, jam, shot | attendant (to the outfall door) |
| 61 | `a6-gallery` | switch | a pendant over the bridge (51.5, 7.0, 67.6), radius 5, intensity 0.9, in place of the (50.5, 71.7) bulkhead (with wall bulkheads only the holder's spot read 0.17; a larger wall radius lights the rope spot), and 2 bulkheads on the north wall over the gallery (53.5, 71.4), (59.5, 71.4) (y 6.6, 0.35 m off the wall face, radius 6.5, intensity 0.9) | `a6-sw-gallery` (56.4, 5.6, 71.7), on the wall face at the stair head on the gallery (A6-C6) | switch, jam, shot | attendant (to the gallery front by the stair) |
| 62 | `a6-desk` | switch | 1 desk lamp (61.5, 1.0, 66.0), radius 2 | `a6-sw-desk` (61.0, 66.0), on the desk | switch, jam, shot | attendant (to the desk) |
| 63 | `a6-cage` | device | 1 work light inside the cage at the door end (51.5, 3.4, 62.9), radius 3.0, intensity 1.3 (at (51.5, 3.0, 64.1) the cage read 0.50, and a larger radius there reaches the holder's spot through the plate; the solid cage walls keep it in) | None: the drive panel's own circuit | jam, shot | none |
| 69 | `a6-sump` | dead | Sump high-bay (51.0, 8.4, 56.0) and the west gallery bulkheads (42.5, 6.6, 71.7), (46.5, 6.6, 71.7), all intensity 0, not in `course.groups` | None: tagged out for repair (lock-off tag on the board) | - | - |

- Zones: set `ambientZone` x 40-64, z 54-72 at 0.14 (`minY` -1, `maxY` 8.9); gallery and bridge zone x 40.3-63.7,
  z 61.6-71.775, `minY` 3.9, 0.14 (upper level, SPEC 7).
- Dark pockets (<= 0.22 crouched): `a6-sump` x 48.3-53.5, z 54.3-57.8 (the tagged-out sump high-bay; the kerb's east
  half reads mid from the east high-bays, A6-C4), `a6-pump3` x 44.5-49.5, z 58.5-63.0 (the far pump under the tagged-out
  bay), `a6-westfloor` x 40.3-46, z 66-69.6 (the leg-up spot), `a6-west` x 40.3-46, z 69.6-71.7, y 4.4 (the gallery's
  west fittings are tagged out). The three floor boxes differ from `MARLOW_POCKETS` (A6-C4).
- Light-test spots: the desk and stair foot (62.5, 69.5) >= 0.60; the gauge board spot (58, 63.1) >= 0.40; the L6 door
  approach (63, 62) >= 0.40; the kerb vantage (51.0, 56.6) crouched <= 0.22; P3 (48.2, 61.0) <= 0.22; the leg-up spot
  (43.05, 69.1) <= 0.22; the rope spot (43.15, 70.2, y 4.4) <= 0.22; the holder spot (51.5, 65.6, y 4.4) >= 0.40 with
  61 on and <= 0.24 with 61 off; inside the cage (51.5, 63.2) >= 0.60 (63). With 60 off the east end <= 0.24.
- Parity: the hall coves above the set on 60; the gallery handrail LED line on 61; the interlock lamp and the panel's
  status lamp are device emissives. The gallery glazing lamps over the south wall stop short of the glass
  (`spillsPast` false) so `a6-sump` stays dark (A6-C3). Restart restores 60-63 and re-locks the outfall door.
- No timed window in A6 (the hold is N4's 3 s, shown on the prompt).

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'b', zone: { box: [40.3, 61.6, 63.7, 71.775], y0: 3.9 } }]`: the first player onto
the motor gallery or the bridge takes B (the hanger); the other is A (the holder). Until then the lead (P2, even set)
sees A.

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a6-up` | Get both of you onto the motor gallery at the dark west end. (60) | Boost your partner up, then climb the rescue line. (50) | Drop the rescue line from the davit box for your partner. (57) | `{ flag: 'a6-gal' }` (both on the gallery or the bridge) | - |
| `a6-hang` | Lower one of you through the gland plate to the drive panel. (60) | Hold your partner over the drive cabinet. Watch the attendant. (62) | Hold the isolate key on the drive panel while he is away. (57) | `{ flag: 'a6-drive' }` | - |
| `a6-lock` | The interlock is green. Out by the outfall door. (48) | - | - | Last line (L6 cycles) | - |

- Pass zone: `a6-gal` (both, not `any`), box x 40.3-63.7, z 61.6-71.775, `floorY` 4.4.
- Radio: enter "The drive panel is inside the cage. The gland plate is your way in. Mind the attendant." (87); then
  "The key buzzes while it is held. Lower him when the attendant is at his desk." (77, A6-D7); on `a6-drive` "Pump is
  running down. Interlock is green." (41).

## 9. Co-op routes and timing (SPEC section 10: A6 target 2:00, min 1:10, max 3:15; cumulative 11:55)

### Route 1 (taught): leg-up, rope, hang-down

| # | Who | Action | Target | Running in A6 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L5's door into the sump bay; crouch at the kerb (51.0, 56.6) | 0:05 | 0:05 |
| 2 | Both | Watch the attendant round once; find the plate's sign and the red interlock lamp | 0:40 | 0:45 |
| 3 | Both | When he leaves P3 for the desk (t 24-31): out of the kerb's west opening, by pump 3's plinth, to the leg-up mark (43.05, 69.1), 12 m | 0:08 | 0:53 |
| 4 | A, B | Leg-up: B onto the open span (claims B) | 0:04 | 0:57 |
| 5 | B, A | B takes the rescue line from the davit box and holds it at the rope spot; A climbs 4.4 m (5.3 s); `a6-up` ticks | 0:08 | 1:05 |
| 6 | Both | Crouch east along the gallery behind the screens and onto the bridge (12 m, chequer plate: silent at crouched gears 1-3) | 0:08 | 1:13 |
| 7 | Both | Wait on the bridge (hidden by the slab and handrails) for him to pass the cage and head for the desk (t 35) | 0:15 | 1:28 |
| 8 | A, B | A crouches at the holder spot (51.5, 65.6) and lowers B head-first; B holds the isolate key 3 s (buzzer, 10 m from him); A pulls B up; `a6-drive`: interlock green, the outfall door unlocks | 0:06 | 1:34 |
| 9 | Both | Along the gallery to the stair head (5 m); wait for him to leave the desk side for P3 (t 12) | 0:10 | 1:44 |
| 10 | Both | Down the staff stair (7.7 m), past the desk and pump 1 to the L6 door (9.4 m) while he is at P3; both onto the pad | 0:12 | 1:56 |
| 11 | Both | First-run slack | 0:04 | 2:00 |

Sum 2:00 (target). Min about 1:10 (no full watch, the relay instead of the rope, the hang on arrival, the exit at once
on his P3 leg). Max 3:15 (B dropped by a mistimed buzz: the fallback route, or a seen holder and a re-hide).

### Route 2 (ledge relay instead of the rope)

As route 1, but at step 5 B hangs on the open span and A climbs him (relay: hanger 4.4 m over the climber, within 1.6
m). About 5 s faster; no davit box.

### Route 3 (risky up): the staff stair

Both from the kerb along the south wall to the stair foot (63.7, 71.2) while he is at P3 (t 20-24) and up the lit stair
(7.7 m at 1.7 m/s, 4.5 s); B claims on the first step over y 3.9. Faster but lit and 4.5 m behind the desk: missed by
a few seconds, he is back at the desk facing south (the stair is behind him) at t 40.

### Fallback: the dropped hanger

If A lets go (or B is let go), B drops into the cage, finishes the hold from the floor (the panel is in reach from the
cage floor), presses the exit release on the cabinet's back (egress) and leaves by the cage's south door. A on the
gallery switches 61 off at the stair head: the attendant walks to the gallery front by the stair (56.5, 70.0), so B
leaves the cage door and goes east along z 60 under the pump row to the outfall door; A comes down the stair after him.

Way back for a lone or downed player (C7, C8): the staff stair from the gallery; a dropped hanger leaves by the cage
door; revive on the gallery and the bridge from deck level (slice 9).

## 10. Self-critique (the 10 weakest points and the fix)

1. B in the cage is invisible from outside (`hangPlate`'s solid walls): the "seen hanging" danger SPEC describes is not
   there; the tension is the buzzer and the holder. Fix: the 6 m buzzer and the walk past the cage door carry it; if it
   feels safe, a 0.6 m louvre slot in the cage's south wall (a light and sight gap at 1.6-2.2 m) shows B's legs.
2. The attendant's cycle is 42 s (planned 44), not SPEC's 32 s (A6-C1): long waits on the bridge. Fix: drop the gauge-board stop
   (about 41 s) if it drags.
3. The holder is hidden from the floor by the handrails and the slab, so the holder's "watch him" job has no risk. Fix:
   keep it (the holder's job is the timing call); P8 records it.
4. The sump pocket sits against the south wall's gallery glazing (A6-C3). Fix: the gallery lamps stop short of the
   glass; the light test samples the vantage.
5. The staff stair route skips the leg-up and rope. Fix: it is lit and timed and lands B behind the desk; the
   objective line and LANTERN name the west end.
6. The exit past the desk needs a second wait (step 9). Fix: it is the set's release beat; jam the desk-side high-bay
   if it drags.
7. The 61 lure lands him near the bridge (the gallery front by the stair), which is a strange place to look. Fix: it
   is only for the fallback; if it reads wrong, add a two-way switch at the stair foot (then he comes to the desk).
8. The coopDeck screen needs a hand split for the bridge (A6-D4), a helper gap. Fix: a `gaps` option for `coopDeck`
   (0g); until then the builder replaces the one east screen box.
9. The rope is used once with no threat (P10). Fix: as SPEC; P10's fallback moves the rope to A8's gallery.
10. The drop chain on the open span is dressing only (P13): a player expects a rail. Fix: the striped mark and the
    drop chain read as a loading edge; P13 lists it.

## 11. e2e route (`scripts/e2e-ctcourse/a6PumpHouse.mjs`, part `:3`, two pages)

Pages: host (P1) and client (P2). Pass 1: the client is B (the hanger: it proves the client's hold reaches the host's
attendant through the hold pulse); pass 2 swaps: the host is B for the fallback.

1. Start at L5's far door after A5 (or "Start at" A6); HUD `a6-up` on both pages (A6 even: client sees A until the
   claim).
2. Both to the leg-up mark (43.05, 69.1) while the attendant is east of x 55 (read on the host).
3. Host braces, client takes the leg-up onto the open span: client on y 4.4; the claim shows the client as B on both.
4. Client holds the rope at the rope spot; host climbs: both on the gallery; `a6-gal` set; `a6-up` ticks.
5. Both to the bridge (teleport legs allowed inside the gallery zone); host at the holder spot (51.5, 65.6).
6. Hold-noise check: with the attendant at the gauge board's gap (54.2, 62.9) (3.0 m), client starts the hold and
   releases at 1 s: the attendant turns suspicious (pulse heard on the host). Wait for him to reach D.
7. Host lowers the client; client holds `c-sw-a6-panel` 3 s: `a6-drive` set; `a6-hang` ticks; the L6 near door
   unlocked; the attendant calm (over 6 m).
8. Host pulls up; both down the stair and to the L6 door while he is west of x 50; both onto the pad; L6 cycles.
9. Pass 2 (restart A6): host is B; host is lowered and let go: host lands in the cage, presses the panel 3 s from the
   floor (`a6-drive`), presses `c-sw-a6-exit`: the cage door unlocks; the client cannot press either device from
   outside the cage (assert no flag from a client press at the cage's outside face).
10. Unit cases (`tests/ctcourse/a6PumpHouse.test.ts`): the gallery lip in `COOP_LIPS`, `soloJumpThreats` empty, the
    cage devices out of reach from outside, the pump columns `noLedge`.

Shot vantages: the kerb (51.0, 56.6) looking north at the cage and the bridge; the holder spot (51.5, 65.6, y 4.4)
looking down through the plate; the stair head (56.0, 71.2, y 4.4) looking south over the pump floor.

## 12. Playtest checklist (Michael, desktop)

- From the kerb, can you read the attendant's loop, the plate's sign and the interlock lamp within one cycle?
- Does the leg-up and rescue line at the dark west end feel natural, and is it clearly safer than the staff stair?
- Is the hang-down readable: does the holder know when to lower, and does the buzzer make the timing matter?
- Does it feel tense enough with B hidden inside the cage, or should B be visible through a slot?
- If B drops, is the way out of the cage found (the exit release on the cabinet's back)?
- Is the exit past the desk fair (one wait for pump 3), or a dead wait?
- Can one player reach the drive alone (through the cage, from the floor, from the bridge)?
- LD 13: any detection you could not understand; did it feel like a real pumping station?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A6-D1 | Bridge 5 m (x 49-54) over a 4.2 m cage with `overhang: 0.4` | Correction (job lead, helper tests): a 3 m bridge holds at most a 2.6 m cage, so the helper throws; the default 0.6 overhang makes a 5.4 m slab | - |
| A6-D2 | The cage's exit release is on the drive cabinet's back (no push-bar door) | Correction (helper tests): a release by the door was pressed through the mesh from outside, a solo way past the hang-down | - |
| A6-D3 | Pump 3 at x 46 (SPEC x 45) | Shortens the attendant's walk (A6-C1); 1 m shift allowed by SPEC 9 | x 45 (cycle about 46 s) |
| A6-D4 | The gallery's east edge screen is split by hand to leave x 49-54 open for the bridge | `coopDeck` has one opening (the lip); the bridge needs a second, lip-free junction. Helper request to 0g: a `gaps` option | - |
| A6-D5 | Panel gate flag `a6-drive` (SPEC) instead of the helper's `a6-done` | SPEC's name in the objective and the outfall gate | Use `a6-done` everywhere |
| A6-D6 | `holdNoise` 6 m on the drive panel | Correction (job lead): the client hold pulse has landed, so the buzzer may reach guards; 6 m makes it heard on the west half of the loop only | 0 (silent, as N4 first shipped) |
| A6-D7 | Extra LANTERN line on the buzzer timing | The buzzer rule is new to the player | Drop the line |
| A6-D8 | Gallery depth 2.175 (to the north wall's face), not 2.4 | The stair runs against the deck's back; with 2.4 it would sit 0.225 m inside the facility wall | - |
| A6-D9 | Attendant kind `grunt` | SPEC rule 9 | - |
| A6-C1 | SPEC: cycle 32 s with a 4 s stop at each of four gauges; the walk alone is about 41 m (41 s) at 0.99 m/s | Three stops (the desk, a gauge board between pumps 1 and 2, pump 3) and pump 3 at x 46: 44.3 s planned, 42.35 s as built, inside LD 25-45 | Drop the gauge-board stop (about 41 s) |
| A6-C2 | SPEC: the drive cage is "mesh 2.4 m with solid kick panels"; `hangPlate` builds it from solid collide boxes to the slab, and A7's mesh cage (`b.fence`) passes sight: the same look would behave two ways (LD 2.5) | The A6 cage is dressed as louvred sheet-steel panels (a VFD enclosure), not welded mesh | A sight slot (see self-critique 1) |
| A6-C3 | SPEC A6: the sump bay inside the L5 door is a dark mixed zone; SPEC 5: no planned dark pocket within 4 m of a gallery wall, and the north strip steps out to z 54 over A6's south wall | Kept dark (the A6 sheet is the specific rule); the gallery lamps there stop short of the glass and the light test samples the vantage | Move the vantage pocket north of z 58 (behind pump 2) |
| A6-C4 | `MARLOW_POCKETS` `a6-sump` [40.3, 54.3, 46, 60] is the south-west corner, not SPEC's sump bay (x 48-58, z 54-58); `a6-pump3` [40.5, 56, 44, 60] misses pump 3 | Pockets here: `a6-sump` [48.3, 54.3, 53.5, 57.8], `a6-pump3` [44.5, 58.5, 49.5, 63], `a6-westfloor` [40.3, 66, 46, 69.6]; the lighting agent's table needs them (shared file: reported to the job lead) | Follow the table and move the vantage |
| A6-C5 | SPEC: "If B is seen hanging"; B cannot be seen inside the solid cage, and the crouched holder is hidden by the handrails and the slab | The danger is the buzzer (A6-D6) and the walk past the cage door | Sight slot in the cage (self-critique 1) |
| A6-C6 | SPEC: the gallery switch "draws him to the stair foot"; `MARLOW_CIRCUITS` puts the switch at (62.6, 70.6) "at the stair head", but the helper's stair rises west, so its head is at x 56 | Switch at the real stair head (56.4, 71.7, y 4.4); the lure walks him to the floor under it (56.5, 70.0), not the stair foot | A two-way switch at the stair foot too |
| A6-C7 | SPEC calls the outfall door a set door "on the east wall (x 64, z 59-65)"; that span is L6's whole west wall and its near door is the facility's 1.8 m sliding door | The outfall door is the L6 near door with a `flag` gate on `a6-drive` and the interlock lamp beside it (the same pattern as A5's L5 gate) | A set door 1 m inside the box (the "outfall door") and L6's door always open |
| A6-C8 | SPEC: the attendant "passes the cage side-on"; the cage door faces south onto his path | He passes the door at 0.9 m twice per cycle: the fallback exit must wait for his east leg | - |

Register additions / changes (SPEC 18, A6): A6-6 amended: "Drive cage (louvred sheet-steel panels, kick band), exit
release on the cabinet's back; no push-bar door". A6-7 amended: "Drive panel (hold 3 s, buzzer heard to 6 m)". A6-12
Gauge board between pumps 1 and 2 (the duty pumps' common panel). A6-13 Bridge handrails (1.1 m, both sides and the
south end). A6-14 Attendant's desk with the log and the desk lamp.
