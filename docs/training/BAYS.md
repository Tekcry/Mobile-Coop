# Fallow training bunker - bays (v2)

The course, bay by bay: the build contract for the map sessions (PLAN.md, steps T5d-T5g and later). Read with SPEC.md
(rules, exceptions, "Course rules" R1-R8) and FEATURES.md (which verb is taught where). Every number marked (TUNE) is a
proposal the build session checks against the code with grep and adjusts inside the stated window; every other number is
a constant or a dimension.

**v2 (T5c, 2026-10-14).** Redesigned after Michael's walk 1 (WALK-NOTES.md, D40-D49) under SPEC R1-R8. Same nine bays,
same drills and story (D47); new compact, linear layouts in which every element is unavoidable and both players run
one shared course unless the drill's story needs a split. v1 is kept as `BAYS-v1.md` (history only). Later step files
(T6-T10) cite v1 line ranges: find the same section here by its heading.

## 0. Conventions

**Frames.** World: x east, z north, y up, metres; yaw 0 faces +z. Each bay has a local frame: origin at its south-west
corner on its own floor; local (x, z, y). World = local + the offset below. Sketches are top-down, north up; the tables
give the numbers.

**Levels.** The course descends into the hill: Upper (y 16), Plant (y 6), Deep (y 0). Nothing is below y -1.5: the
lowest pieces are the B2 trench floor (y 14), the B2 drop pit (y 15.5) and the B5 cable trench floor (y 4.5), all above
the nav sampler's y -2 (SPEC engine Q1). Nothing is built under another bay in plan: nav columns stack only inside a bay
(B3 shaft, B7 house, B9 well, B2 / B4 galleries).

### 0.1 World offsets (v2)
| Id | Name | Offset (x, z) | Floor y | Size x by z | Clear height | Footprint v2 / v1 (m2) |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Muster (kit room) | 0, 60 | 16 | 20 x 14.4 (L-shaped) | 3.2 | 216 / 576 (38%) |
| A1 | Airlock 1 | 1, 54 | 16 | 6 x 6 | 3.0 | - |
| B2 | The Lanes (movement) | 7, 49.5 | 16 | 52 x 9 | 9.0 | 468 / 1728 (27%) |
| A2 | Airlock 2 | 59, 50 | 16 | 6 x 6 | 3.0 | - |
| B3 | The Intake (CT shaft) | 65, 46 | 6 | 14 x 14 | 26 (shaft to y 32) | 196 / 324 (60%; v1 CR outside the shaft not counted) |
| A3 | Airlock 3 | 69, 40 | 6 | 6 x 6 | 3.0 | - |
| B4 | The Cistern (co-op climbing) | 66, 14 | 6 | 12 x 26 | 9 (gallery 4.4) | 312 / 1368 (23%) |
| A4 | Airlock 4 (medkit) | 70, 8 | 10.4 (A32) | 6 x 6 | 3.0 | - |
| B5 | Standby Plant (light and sound) | 48, -16 | 6 | 30 x 24 | 9 | 720 / 1536 (47%) |
| A5 | Airlock 5 | 42, -7 | 6 | 6 x 6 | 3.0 | - |
| B6 | Mock Site (corners and security) | 12, -17 | 6 | 30 x 24 | 4.6 (office / CR / stair volume 6.4; CR mezzanine 3.6) | 720 / 1344 (54%) |
| S6 | Stair 6 (quiet connector) | 19, -33 | 6 to 0 | 3 x 16 | enclosed | - |
| A6 | Airlock 6 (medkit) | 17.5, -39 | 0 | 6 x 6 | 3.0 | - |
| B7 | The House (guards and takedowns) | 6, -69 | 0 | 30 x 30 | 10 | 900 / 1760 (51%) |
| A7 | Airlock 7 | 36, -57 | 0 | 6 x 6 | 3.0 | - |
| B8 | The Range (weapons and gadgets) | 42, -62 | 0 | 60 x 16 | 8 (catwalk 4.0) | 960 / 1984 (48%) |
| A8 | Airlock 8 (medkit) | 102, -57 | 0 | 6 x 6 | 3.0 | - |
| B9 | The Plot (finale) | 108, -66 | 0 | 32 x 38 (well 32 x 31, lobby 8 x 7) | 14 (balconies 4.5, 9.0) | 1048 / 2288 (46%) |
| L9 | Exit lift | 120, -28 | 0 | 8 x 6 | shaft to the surface | - |
Contacts (each door in the shared wall): B1 dark store south wall / A1 north (x 3.4..4.6); A1 east / B2 2A west (z 55.4..56.6);
B2 2G east / A2 west (z 52.4..53.6); A2 east / B3 G1 (z 52.4..53.6, y 16); B3 plant passage / A3 north (x 71.4..72.6);
A3 south / B4 C1 north (x 71.4..72.6); B4 outlet platform / A4 north (x 72.4..73.6, y 10.4); A4 south / B5 entry landing
(y 10.4); B5 west / A5 east (z -4.6..-3.4); A5 west / B6 reception east (z -4.6..-3.4); B6 server room south / S6 top
(x 20..21.2); S6 foot / A6 north; A6 south / B7 north (x 19.9..21.1); B7 east / A7 west (z -54.6..-53.4); A7 east / B8
west; B8 east / A8 west; A8 east / B9 west (z -54.6..-53.4); B9 lobby north / L9. Every bay box is at least 1 m from every
other bay's box except at these contacts (walls 0.45 stand outside the box, A27).

**Whole course, top-down** (1 char about 8 m):
```
 z 70 | [B1]                                 Upper y16
      |  A1=[ B2 one lane, 52 m ]=A2=[B3]     (B3 shaft drops to y6)
 z 40 |                               A3
      |                              [B4]     Plant y6
 z 10 |                               A4      (y10.4)
      |      [ B6 ]=A5=[ B5 ]                 Plant y6
 z-20 |       S6
      |       A6                              Deep y0
 z-50 |    [ B7 ]=A7=[ B8 range 60 m ]=A8=[ B9 ]  L9 north of B9
      +------------------------------------------------- x 0 .. 140
```

### 0.2 Course rules applied (SPEC R1-R8; one rule set for every bay)
- **The line (R1).** Each bay is a chain of rooms. A room's exit door, gallery or opening is reachable only from that
  room, and only through the room's element. No corridor or side door joins two rooms out of order. In guarded bays
  (B5-B9) a guarded room may hold the E4 routes (two plus a loop) side by side inside it; they rejoin before the room's
  one exit (level-design 3.3). Doors on the line are plain doors unless a split needs a gate.
- **Unavoidable elements (R2).** Every obstacle spans its room wall to wall (or the walls funnel to it). Edges:
  every gallery, landing, platform and deck edge is closed except at the element's own move point. Where a drop from
  the edge would land onward of the element (or skip one), the edge is a glass screen 2.4 high, `noLedge` (above the
  mantle reach 1.8, no lip to hang on, A51); a 1.1 glass balustrade (vaultable: <= 1.25) is used only where the drop
  lands back on the element's start, and on B8's catwalk (a vantage, A43). Net and catcher edges are mesh screens 2.4
  high, `noLedge`, never a fence anchor.
  A fall from an element lands on the element's start floor, or on a catcher (net, pit, rope foot) whose only exit is
  a ladder or steps back to the element's start.
- **Boost reach (A51).** A co-op boost reaches lips up to 4.5 (`TEAM.boostMax`), so geometry, not the drill tick,
  stops a boost from skipping an element. Every lip a boost could use to skip one stands more than 4.5 over the floor
  the pair stands on (a sunk floor counts), or carries a flush 2.4 `noLedge` screen (the screen lifts the lip by 2.4),
  or is a ladder head inside a safety cage (the only way to the lip is the ladder). Co-op lips stay in their 4.3-4.5
  window only where the boost is the drill (B4 W1 and OP) or a route (B9's north-west gap). The spots geometry cannot
  close (a wall-jump lip, 2.7-3.8, is always inside boost reach: B3 WJ1 / WJ2; B4 W2, where a boost reaches what the
  human ladder reaches) are a question for Michael in REVIEW-NOTES.md; the drill tick (D30) holds them until he decides.
- **Every multi-part drill element is retryable (A61).** A player who leaves an element with one of its objectives
  still open can always go back and do it: either a return route leads to the element's start (a return ladder or
  walkway ending in a one-way return turnstile, A61: a full-height, single-occupancy rotor in a cage, 2.4 high with a
  `noLedge` top, that turns only in the return direction and admits one body per turn, so it is never a way on and a
  partner cannot tailgate forward through it while the returning player passes; no return gate is a hinged door), or the element is built so one verb cannot spoil another (a grille that only unscrews, a louvre that only
  kicks and springs shut, a practice pane that re-glazes). When every breakable lamp a bay's "Shoot out a lamp"
  objective can use is out and a player still owes it, one re-lamps 30 s (TUNE) later (B2 L2-G1..3, B5 HB1-HB6 and CG1..3,
  B7 L7-F1..3 / L7-P, B8 L8-G1..4, B9 L9-P1..4 / L9-L1..2). A guard that an open objective needs is relieved when he is
  down (A62): 30 s (TUNE) later a fresh role-player takes his post and route, entering out of both players' sight through the bay's relief door: a staff door in an outer wall of the guard's room, locked to players for good (no interact, no anchor, no gap, never on the room graph); the relief spawns behind it, outside the bay's nav, and walks in only while neither player can see the door (each guarded bay's guard sheet names its door, T5e-T5g)
  (B5-B9; marking rounds). No drill is ever lost for good.
- **Together (R3).** B1-B4 and every movement verb are one shared course: both players run every element in the same
  order. Splits (each listed in its bay with its reason): B4 sluice hold (one holds while the other passes), B5 breaker,
  B6 operator / runner, B8 overwatch, B9 keys. Each split rejoins at once (the next door or the airlock).
- **Partners block each other (D49, A50).** Wherever both walk one line the clear width is at least 1.8 m (two bodies
  pass). Single-file elements (ladders, pipes, the bar, ropes, the zipline, ledges, narrow landings, ducts, the split
  slot, windows) are taken one at a time whatever their length (the B2 pipe 5 m and ledge chain, the B3 bar 11.5 m and
  G4 6 m x 1.4, the B6 supply duct 6 m): the second player waits at a marked waiting spot (at least 2 x 2 m, beside the
  start, clear of the fall zone) until the first has stepped off the far end, which has room to step aside (2 x 2 m).
  An element is doubled or given a passing bay only where waiting would block a drill or a guard timing; none in v2
  needs one. The B3 twin ducts are the pit's two discharge outlets (the plant's own layout), not a passing rule. Each
  bay's element table says "one at a time" or "side by side" per element.
- **Compact (R4).** Drill rooms typically 8-14 m across, ceilings 3-6 m unless the drill is vertical; footprints in 0.1.
  Exceptions say why: smaller where the drill fits (B1's lift lobby and briefing room 6 x 6, its gear run 2.4 wide by
  design; B2 stations from 5 m long); larger where the drill needs it (the B3 shaft 14 m square and 26 m tall, vertical
  by design; the B8 range 50 m long because the sniper target is at 50 m; guarded halls hold two routes and a loop, E4).
- **Objectives on screen (R5, A47).** Every drill has one explicit objective line (the "Objective" column of each bay's
  objective table): T5d-T5g and T7a use it as the drill's name (`DrillDef.name`) on the objective list, in the
  airlock refusal and in LANTERN's step text. "Each" = ticked per player (both columns); "either" = one tick from
  either player; a role (P1 / P2) = that player. Lines marked "not a drill until X" are built and shown greyed (no
  tick) until X lands (D30).
- **Automatic airlocks (R6).** See 0.4.
- **Look (R7).** See 0.5.
- **Everything else stays (R8).** Drills, story, gates where a split needs one, the B9 ghost plan, guard jobs and the
  light-plan logic are v1's, moved into the new rooms.
- **Proof.** R1: the room graph test (A42, extended): nodes are the rooms in 0.1 and each bay's room table, links are
  doors, openings and element passages (ladder, pipe, rope, zipline, duct, window, drop); a return turnstile (A61) is a directed link in the return direction only (the test models it as single-occupancy: no forward traversal, even while it turns for a partner), and the test asserts that no entry -> exit path uses one; with the course's gates as
  built, the only path from a bay's entry to its exit passes every element's trigger box in the order of the objective
  table. R2: per element, the same graph with that element's link removed has no path from entry to exit (the
  "Unavoidable elements" table names each test). The layered NavGrid flood (A42) proves no floor joins two rooms except
  through their links.

### 0.3 Roles, drills, failure
**Roles (DECISIONS C3).** P1 = host, P2 = client. Lead and second swap at every airlock (B1 lead P1, B2 lead P2, ...).
In shared courses (B1-B3) the lead goes first on each single-file element. Team moves and splits name their roles.

**Drills (D30).** Every verb a bay teaches is a mandatory drill, ticked per player on the objective list (R5). The
bay's exit airlock refuses until every objective is done by the players it names ("Waiting: Moth - Shimmy the beam
ledge"). Guidance is a full tutorial (D18): each drill's text step and a marker on its device or move (markers can be
hidden, D19).

**Failure (DECISIONS D4, D11).** Guards are Cresset role-players with marking rounds: real AI, real damage, takedowns
knock out. A downed player is revived (2.5 s). Both down: the bay restarts at its entry airlock with the bay's squad
respawned. No fall damage exists (`LANDING`): a fall costs time and noise; R2's catchers bring the player back to the
element's start.

### 0.4 Airlock (every A1-A8, automatic: R6, D46, T5b)
Real reason: the 1950s bunker's gas-tight decontamination airlocks, two interlocked blast doors per zone change; Cresset
rewired each interlock to a floor presence pad ("nobody goes on alone"). Interior 6 x 6 x 3.0 (`AIRLOCK_SIZE`); doors
1.2 x 2.1 steel; a vision panel in the far door (the glimpse of the next bay, level-design 3.8).
- **Pad.** A 4 x 4 marked floor area inset 1 m from every wall (`AIRLOCK_PAD_INSET`), its border an LED floor strip:
  white idle, amber with one player on it, green with both. The 1 m ring round it keeps the doorways clear
  (`AIRLOCK_DOORWAY_CLEAR`).
- **Rule.** One player on the pad: "Waiting for partner" to both. Both on it (feet inside, |y - floor| < 1.0, neither
  downed) and the bay's objectives done: the near door shuts and locks for good, a 4 s cycle (`AIRLOCK_CYCLE`, amber
  door lamps, a hiss), the far door unlocks and opens by itself (A46), the checkpoint is set. A started cycle does not
  abort when a player steps off (A44). Refusals: "Revive first", "Waiting for partner", then the open objectives. No
  button anywhere.
- **Fit-out.** Brushed steel wall panels, an LED door frame lamp over each door (red locked / amber cycling / green
  open), the pad border, one 4000 K bulkhead (emergency circuit, no switch), a bench outside the pad, a wall medkit in
  A4, A6, A8 (bible 7). No guard route enters an airlock.

### 0.5 Look (R7, D40) - the same kit in every bay
- **Shell.** The 1950s concrete (walls, vaults, shaft linings) stays dark and unlit except by the fit-out's lamps.
- **Glass.** Toughened glass partitions, balustrades and observation windows: see-through collision (A26 method:
  invisible collision box behind a visual-only steel frame), full height where they separate rooms, 1.1 where they are
  balustrades. Glass is opaque to bullets, sight probes and the light field (A26): no guard post in v2 watches through
  glass, and T6 keeps each lamp's light in its own room, so the eye and the meter agree (light parity). Glass is used
  for observation and sightlines, never as a way round an element (it is never climbable: no fence anchor, `noLedge`).
- **Steel and panels.** Brushed steel thresholds, rails and equipment cabinets; clean white wall panels to 2.4 in the
  training rooms (the concrete shows above).
- **LED.** Strips along floor edges, under gallery lips and round door frames. A lit strip that adds light is a lamp in
  the light registry (T6), so parity holds; an accent strip that adds no light stays below the meter's dark band (0.28).
  Each bay's light plan lists its strips.

---
## B1 - Muster (kit room)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's guardroom and decontamination suite at the foot of the entrance lift; Cresset's kit room and briefing room. |
| Size, shape | 20 x 14.4, L-shaped, 3.2 clear: five small rooms in a chain (216 m2, 38% of v1). Warm and small after the lift. |
| Verticality | None (one floor). |
| Colour | 2700 K pendants in the kit room; 4000 K LED in the briefing room and the gear run; the store dark. |
| New mechanics | Holster / draw, stances, speed gears, instant stop, quick 180, light meter, night vision, pings, elbow strike on a pad. |
| Guards | None. |
| Lead / second | P1 / P2. Shared course (R3): every objective is "each". |

Rooms (local; the line runs LL -> KR -> BR -> GR -> DS -> A1):
| Room | Box (x0..x1, z0..z1) | Contents | Exit (the only one) |
| --- | --- | --- | --- |
| Lift lobby LL | 0..6, 8.4..14.4 | Insertion: spawns (2, 11.4) and (4, 11.4) facing east; the surface lift (closed: the way in). | Door to KR, x 6, z 10.8..12.0 |
| Kit room KR | 6..14, 8.4..14.4 | Two operator lockers on the north wall (glass fronts, name plates), bench 0.45 (x 8..12, z 12.6..13.0), weapon rack (south wall, x 10..13), padded strike post (`TrainingDummy`, at (12.5, 10)). Rubber floor (quiet). | Door to BR, x 14, z 10.8..12.0 |
| Briefing room BR | 14..20, 8.4..14.4 | Map table 0.9 (x 15.5..18.5, z 11..13), wall screen on the east wall (aim target). South wall: a glass partition onto the gear run (observation: the run is seen before it is run). | Door to GR in the south wall, x 18.2..19.4 |
| Gear run GR | 0..20, 6..8.4 | 2.4 wide, 20 m straight, run east to west; LED floor marks every 3 m (x 18, 15, 12, 9, 6, 3: "1".."6"), the stop line at x 2.0, the turn mark at x 1.0. | Door to DS in the south wall at the west end, x 0.6..1.8 (only reachable past every mark) |
| Dark store DS | 0..8, 0..6 | Shelving 2.0 along the east and west walls (named: decontamination suit racks); chequer plate floor (loud); bulkhead off at start, switch inside the door (x 2.2, z 5.7). | Door to A1 in the south wall, x 3.4..4.6 |

Objectives (in order; R5):
| # | Objective | Who | Where (trigger) | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Open your locker | each | KR locker (per player) | pickup: kitted |
| 2 | Crouch, then stand up | each | anywhere in KR | stance |
| 3 | Elbow-strike the pad | each | KR strike post | strike (loco 10) |
| 4 | Aim at the briefing screen to draw your weapon | each | BR, facing the screen | draw (loco 09) |
| 5 | Stop aiming to holster | each | BR | holster |
| 6 | Run the gear run: gears 1 to 6 on the marks | each | GR marks x 18..3 | gear 1-6 |
| 7 | Stop dead on the line | each | GR stop line x 2 | stop hold |
| 8 | Quick 180 on the turn mark | each | GR x 1 | quick 180 (not a drill until loco 22) |
| 9 | Stand in the dark and watch your light meter drop | each | DS, light off | meter dark |
| 10 | Switch the store light for your partner | each | DS switch | switch |
| 11 | Night vision on in the dark store | each | DS | night vision |
| 12 | Ping the airlock door | each | DS / A1 door | ping |
| 13 | Both on the airlock pad | both | A1 pad | airlock (R6) |

Co-op split: none. "Lights for each other" (9, 10) is done together in DS (one inside in the dark, the other at the
switch, then swap). Gate: A1. Lock behind: A1's near door.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L1-1..3 | Pendants 2700 K | K1 | KR door (LL side) | Kit room lit pool (meter "lit"). |
| L1-4, 5 | LED panels 4000 K | K2 | BR door | |
| L1-6..8 | LED linear 4000 K over GR | K3 | LL | The run is lit. |
| L1-7S | Bulkhead | K4 | Inside the DS door | Off at start: the dark pocket. |
| L1-M | GR floor marks (LED accent) | equipment | none | Accent below dark 0.28 (they add no light). |
| L1-9 | Bulkhead over the A1 door (breakable) | K4 | Inside the DS door (with L1-7S) | Off at start with the store. |
| L1-10 | Exit sign over the A1 door | none (maintained emergency) | none | Glow below dark 0.28. |
Lit chokepoint: the A1 door (L1-9), as v1: darkened by K4 or by shooting L1-9 (breakable); a guard-free bay needs no
avoid route. It teaches the chokepoint rule (level-design 3) before the guarded bays.

Sketch:
```
 z14.4 +--------+---------+-------+
       | LL     | KR      | BR    |
       | spawns |lockers  |screen |
       |       ->  post  ->  table|
 z8.4  +--------+---------+-glass-+  (BR's glass south wall)
       |<== GR gear run: marks 6 5 4 3 2 1 <==  door from BR (x 19)
 z6    +-DS door-+----------------+
       | DS dark |
       | store   |
 z0    +--[A1]---+
       x0       x8       x14     x20
```

R1-R8 check:
| Rule | How B1 meets it |
| --- | --- |
| R1 | Five rooms in a chain, one door each; the DS door is at GR's west end, so the run passes every mark. |
| R2 | The drills are verbs, not obstacles; each room's door is the only way on, and the airlock refuses until every objective is ticked. |
| R3 | Every objective "each"; no split. |
| R4 | Rooms 6-8 m (GR 20 m: the gear run needs the length); 38% of v1. |
| R5 | 13 explicit objectives above. |
| R6 | A1 (0.4). |
| R7 | Glass locker fronts, the BR glass partition, LED panels and floor marks; DS stays dark concrete. |
| R8 | Same drills and story as v1; v1's corridor became the run itself. |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| KR (lockers, post) | LL's only exit is KR's door | room graph: remove LL-KR door, A1 unreachable |
| BR (screen) | KR's only exit is BR's door | remove KR-BR door, A1 unreachable |
| GR marks | BR's exit enters GR at x 19; DS's door is at x 1.2 | path BR -> DS crosses every mark's box in order (x 18 .. 1) |
| DS (dark, switch) | GR's only exit; A1 opens only from DS | remove GR-DS door, A1 unreachable |

---

## B2 - The Lanes (movement)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's cable hall, where the trunk cables entered and were distributed, stripped out; Cresset partitioned it into one obstacle lane of glass-fronted stations. |
| Size, shape | 52 x 9, seven stations in a straight line west to east (468 m2, 27% of v1); 9.0 clear; sunk floors: the 2B pit catcher to -1.0, the trench to -2.0, the portal sump to -1.0, the 2D drop pit to -0.5. |
| Verticality | Galleries at 4.0, the pipe at 6.5, the beam ledge L1 and the portal sill at 5.0, the deck at 4.5. |
| Colour | 5000 K LED high bays over each station; LED strips under every lip. |
| New mechanics | Every ground and climbing verb, all in one lane for both players (D43): step, vault, mantle, momentum carry, ladder, horizontal pipe, lower into a hang, hang-drop, manual jump, forward roll, drainpipe, shimmy, outside corner, gap jump, climb up, landing bands, open and glazed windows, stop and quick 180. |
| Guards | None. |
| Lead / second | P2 / P1. One shared course (R3, D42, D43): every objective is "each"; the lead takes each single-file element first. |

Stations (local; the line runs west to east; every station spans z 0..9 unless named):
| # | Station / element | Box or position | Real reason | Verb | Blocks by | One at a time / side by side | Check |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2A-1 | Plinth 0.5 x 1.0 deep, wall to wall | x 2..3 | Old cable-drum stand | step | spans z 0..9 | side by side | <= 0.65 |
| 2A-2 | Steel rail 1.1 high, 0.3 thick, wall to wall | x 5..5.3 | Course obstacle | vault | spans | side by side | <= 1.25, thin |
| 2A-3 | Block wall 1.7 high, 2 deep, wall to wall; 2.2 m after the rail (sprint vault into mantle: momentum chain 1) | x 7.5..9.5 | Course obstacle | mantle, drop 1.7 | spans; ceiling 9 | side by side | <= 1.8 |
| 2B-1 | Fixed ladder on G1's west face | x 14, z 4..5; floor x 11..14 is the foot | Old cable-gallery access | ladder | G1 is a solid 4.0 block wall to wall; its west edge a flush 2.4 `noLedge` glass screen except the 1 m ladder head, and the ladder caged from 2.0 to the head (no boost onto G1, A51) | one at a time (wait on x 11..14 floor) | ladder 4.0 |
| 2B-2 | Gallery G1, top 4.0 | x 14..16 | Old cable gallery | - | - | waiting spot 2 x 9 | - |
| 2B-3 | Cable-support pipe, y 6.5, across the gallery gap (pit) | x 15.5..20.5, z 4.5 | Trunk-cable support left when the gallery was cut out | horizontal pipe, hand over hand | the pit x 16..20 (floor -1.0, 2B-4, closed by G1 and G2 faces) is the only way across | one at a time | hang height = pipe - 1.9 = 4.6, over G1 / G2 tops 4.0 |
| 2B-4 | Pit catcher, floor -1.0 (G1 and G2 faces 5.0 above it: out of boost reach, A51) | x 16..20 | The cut-out gallery's floor | - | a fall from the pipe lands here; its only exit is a caged plant ladder up G1's east face (x 16, z 1) back to G1 | - | R2 catcher |
| 2B-5 | Gallery G2, top 4.0, east edge open over 2C on the 1.5 m hang point z 3.5..5 only; flush 2.4 `noLedge` glass screens elsewhere (a drop there would skip the hang); a return ladder RL2 from 2C's floor up G2's east face (x 22, z 8.5) through a one-way return turnstile at its head (A61, 0.2: turns towards G2 only, one body per turn, so no one on G2 passes down it to 2C; retry the hang) | x 20..22 | Old cable gallery | lower into a hang; hang-drop (feet drop 2.1, soft) | G2's east face is the only way down into 2C | one at a time at the hang point; G2 2 x 9 to wait | `LANDING` soft 0.6-2.5 |
| 2C-1 | Sprint strip and cable trench 1.2 wide, 2.0 deep, wall to wall; near side: fixed step irons back up; far edge `noLedge` | strip x 22..27, trench x 27..28.2 | Original cable trench, covers lifted | manual jump; forward roll after it (strip x 28.2..31) | spans; a fall in climbs back out only on the near side | side by side | `LEAP` apex 0.8 |
| 2C-2 | Cast-iron downpipe on the east wall, run and jump to it from the strip (momentum chain 2) | x 33.6, z 0.8 | Gallery gutter drain | jump to the pipe, drainpipe up to L1 | the east wall (x 34) is full height with no door; the pipe is its only climb | one at a time | `pipeLip` within 0.8 up, 1.0 across |
| 2C-3 | Beam ledge L1, 0.25 deep, y 5.0 (over 2C's floor 0: above boost reach 4.5, A51), on the east wall's west face, z 1..3.5, and a stub z 4.5..5.0 past the column | x 33.75 | The hall's crane-rail beam | shimmy | hang only (`canClimbUp` false); a fall lands on 2C's floor = the pipe's start | one at a time | `canHang` |
| 2C-4 | Square column 1 x 1 on the east wall at z 3.5..4.5; L1 wraps its south, west and north faces | x 32.75..33.75 | Structural column (grid line) | two outside corners | as L1 | one at a time | - |
| 2C-5 | Gap 2.2 from L1's stub end (z 5.0) to L2: the sill of the cable portal, an opening in the east wall z 7.2..9.0, y 5.0..7.1 (the sill 0.45 deep through the wall, level with L1 so the gap stays 2.2; a 0.5 step down inside onto the deck) | x 33.75..34.2 | Old cable portal through the bay wall | gap jump, climb up onto the deck | the portal's sill is the only way through the east wall; under the portal a sump x 31.5..34, z 5.6..9, 1.0 deep (floor -1.0, step irons on its west side) puts the sill 6.0 over the floor below it and more than 1.5 m from any floor round it: out of boost reach (A51); a fall lands in the sump or on 2C's floor, both the pipe's start | one at a time | `findJumpTarget` <= 2.5; sill depth >= 0.38 |
| 2D-1 | Deck P, top 4.5, 4 deep, wall to wall; glass balustrade except its east edge over the pads | x 34..38 | The old cable portal landing | - | the deck's east edge is its only way down | waiting spot 4 x 9 | - |
| 2D-2 | Pads: S top 2.5 (x 38..41, z 0..3, drop 2.0), R top 1.3 (x 38..41, z 3..6, drop 3.2); pit floor -0.5 elsewhere (drop 5.0); a plant ladder from the pit up the deck's east face (x 38, z 8) to repeat a drop | x 38..46 | Course landing pads | landing bands soft, roll, heavy | the pit is the only way on (its exit is 2E's window wall) | side by side (pads 3 wide) | soft < 2.5, roll <= 4.5, heavy > 4.5 |
| 2E-1 | Full-height cross wall with an open window (z 1..2.2) and two glazed windows (z 3.6..4.8 and z 6.2..7.4), sills 0.9 above the pit floor | x 46..46.45 | The cable hall's inspection windows | window vault (quiet) vs breaking glass (loud): each player breaks a pane; the glazed windows are practice frames that re-glaze (a fresh sugar-glass pane 10 s (TUNE) after a break with no player within 2 m, A54, A61), so a pane is always there to break | the wall has no door | side by side (three openings) | window anchor reach |
| 2F-1 | Floor marks "stop on the line", "turn"; the A2 door in the east wall | x 47..52 (floor 0, a 0.5 step down from the window sill side) | - | stop hold, quick 180 | - | side by side | - |
Note 2C-3..5: L1 runs north along the east wall from the pipe head, wraps the column (two outside corners), ends in a
0.5 m stub; the wall between the stub (z 5.0) and the portal (z 7.2) is smooth (no lip, no LED strip); the jump is along
the wall, 2.2 from the stub's last grip to the sill's nearest grip (as v1's stub and L2, A27). T5d fits the column and
the portal within +-1 m to keep the gap 2.0-2.5.

Objectives (in order; all "each"; R5):
| # | Objective | Element | Verb / tick |
| --- | --- | --- | --- |
| 1 | Step up onto the plinth | 2A-1 | step |
| 2 | Vault the rail | 2A-2 | vault |
| 3 | Mantle the block wall | 2A-3 | mantle |
| 4 | Sprint, vault the rail and carry into the mantle | 2A-2/3 | momentum carry (loco 26; moves work without it until then) |
| 4a | Shoot out a gallery lamp (restored from v1, D47) | L2-G1..3, from the 2A floor | lamp shot (each; one re-lamps under 0.2) |
| 5 | Ladder up to the gallery | 2B-1 | ladder |
| 6 | Cross the gap hand over hand on the pipe | 2B-3 | pipe |
| 7 | Lower into a hang from the far gallery | 2B-5 | hang |
| 8 | Hang-drop to the floor | 2B-5 | hang-drop, land:soft |
| 9 | Sprint and jump the trench | 2C-1 | jump |
| 10 | Forward roll on the strip | 2C-1 | roll |
| 11 | Run, jump to the downpipe and climb it | 2C-2 | drainpipe (momentum chain 2) |
| 12 | Shimmy along the beam ledge | 2C-3 | shimmy |
| 13 | Round the column: two outside corners | 2C-4 | corner |
| 14 | Jump the gap to the portal sill | 2C-5 | gap jump |
| 15 | Climb up onto the deck | 2C-5 | climb up |
| 16 | Drop to the high pad: soft landing | 2D-2 | land:soft |
| 17 | Drop to the low pad: roll landing | 2D-2 | land:roll |
| 18 | Drop to the pit floor: heavy landing (hear it) | 2D-2 | land:heavy |
| 19 | Vault through the open window (quiet) | 2E-1 | window vault |
| 20 | Break through a glazed window (loud) | 2E-1 | window break |
| 21 | Stop dead on the line | 2F-1 | stop hold |
| 22 | Quick 180 on the turn mark | 2F-1 | quick 180 (not a drill until loco 22) |
| 23 | Both on the airlock pad | A2 | airlock |
Objectives 16-18 need two climbs back up the pit ladder (from a pad, hang-drop or step down to the pit); the order of
the three drops is free. Objectives 19 and 20 need a climb back through: the window wall is crossed twice (vault one
way, climb back through the open window, break a pane) - LANTERN: "Once quiet, once loud."

Co-op split and gate: none (D42, D43): v1's two lanes, the walkway and the x 24 lever doors are gone. The glass faces
of each station let the waiting player watch and ping the one on the element. Lock behind: A2.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L2-1..7 | LED high bays 5000 K, one per station 2A-2F | N1 (2A-2B), N2 (2C), N3 (2D-2F) | At each station's entry | The lane is a lit work area. |
| L2-G1..3 | Gallery bulkheads over G1, G2, the deck (breakable) | G | 2A entry | Breakable: objective 4a (each); one re-lamps under 0.2 (A61). |
| L2-S | LED strips under G1, G2, L1 and the deck lip | equipment | none | Accent below dark 0.28: they mark the lips. |
| L2-E | Exit sign over A2 | none | none | |
Sound: stations concrete; galleries and deck steel grating (loud); the pit rubber matting.

Sketch (plan, heights in brackets):
```
 z9 +------2A-------+---2B----------+----2C--------------+--2D----+-2E-+--2F--+
    | step vault MANTLE |lad G1(4)|pit|G2(4)| strip TRENCH strip |col|portal|deck(4.5) pads | W  | stop  |
    | A1 ->           |   ~~~pipe 6.5~~~ | hang  roll   [pipe]L1=|  =>| S2.5 R1.3 pit | W  | 180 [A2]
 z0 +---------------+---------------+--------------------+--------+----+------+
    x0              x11  x14 x16 x20 x22          x31   x34     x38     x46  x52
```

R1-R8 check:
| Rule | How B2 meets it |
| --- | --- |
| R1 | Seven stations in one line; each station's only exit is through its element (G1 / pipe / G2 drop / trench / downpipe-ledge-portal / deck drop / window wall). |
| R2 | Every element spans z 0..9 wall to wall; G1 and G2 have flush 2.4 `noLedge` glass screens except at their move points (the caged ladder head, the pipe ends, the hang point); no lip a boost could skip by is within 4.5 (G1 screened and caged, the pit floor -1.0, L1 at 5.0 over 2C's floor 0 so no boost skips the downpipe, the portal sill 5.0 over the sump -1.0, A51); RL2's head is a one-way return turnstile (A61, no tailgating past the hang); falls land on the element's start floor (2A, 2B foot, 2C) or a catcher with a ladder back (2B pit, 2D pit). |
| R3 | One lane, every element for both; ladder and downpipe both, one after the other (D43). |
| R4 | Stations 5-12 m long, 9 wide; 27% of v1. Clear height 9 for the pipe and deck. |
| R5 | 24 explicit objectives. |
| R6 | A2 (0.4). |
| R7 | Each station's north wall is a glass observation window onto the next station; LED strips under every lip; the hall shell above 6.6 dark concrete. |
| R8 | Every v1 verb kept, the momentum chains kept (vault-mantle, jump-pipe). |

Unavoidable elements:
| Element | How it blocks | Nav test (room graph, link removed -> A2 unreachable) |
| --- | --- | --- |
| Plinth, rail, block wall | Span 2A wall to wall; ceiling 9 | 2A floor split into three cells by the pieces; remove the mantle link: 2B unreachable |
| Ladder 2B-1 | G1 is a solid 4.0 wall to wall, screened 2.4; the ladder caged (no boost onto G1) | remove ladder link: G1 unreachable |
| Pipe 2B-3 | Pit between G1 and G2; pit exit only back to G1 | remove pipe link: G2 unreachable |
| G2 hang-drop | G2's only way down is its east edge into 2C; RL2's head turnstile turns towards G2 only | remove drop link: 2C unreachable |
| Trench 2C-1 | Spans; far edge `noLedge`, step irons only on the near side | remove jump link: strip east unreachable |
| Downpipe, L1, column, portal sill | East wall full height, no door; L1 at 5.0 over 2C's floor 0 and the portal sill at 5.0, 6.0 over the sump below it (no boost onto either) | remove any of pipe / L1 / gap links: the deck unreachable |
| Deck drop | Deck's only way on is its east edge into the pit | remove drop link: the pit unreachable |
| Window wall | No door; three windows | remove the window links: 2F unreachable |

---
## B3 - The Intake (CT shaft)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's main air intake shaft from the hilltop down to the plant level's fan chamber: maintenance landings, concrete cable-riser casings, the hoist beam and an inspection davit (for lowering fan parts), the fan control room cantilevered in the shaft's south-east corner, and the spoil ropeway cable left from construction, re-tensioned by Cresset as a training zipline. Catch nets under the move points (working-at-height practice). |
| Size, shape | 14 x 14 square (196 m2, 60% of v1), 26 m from the chamber floor to the headframe grille. One line that spirals up from G1 to G4, crosses to G5, then comes down in two rope stages, a zipline and the fan pit. |
| Verticality | The tallest space in the course: up by split and wall jumps, across by bar, down by rope, zipline and fence. |
| Colour | 2000 K sodium bulkheads (amber) on the landings; LED strips under each landing lip; the chamber floor dark until CR's floods. |
| New mechanics | Split jump (into, jump up out of it), wall jump (straight and inside corner), horizontal pipe legs up, inverted and the flip drop, rappel (speeds, kick out, sideways, unhook, kick through a window), zipline, fence (climb, shimmy, rattle, flip over), duct crawl, grille unscrew vs kick. |
| Guards | None. |
| Lead / second | P1 / P2. One shared course (R3): every move for both, one at a time on each single-file element (the lead first). v1's split (rappel for one, zipline for the other) and its fan-isolation split are gone: both rappel, both zipline, both pass the control room (A52). |

Elements (local; heights are floor or lip y above the chamber floor; in line order):
| # | Id | Element (real reason) | Where | Verb | Blocks by | One at a time / side by side | Check |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | G1 | Entry landing, 2.8 deep: west arm x 0..2.8, z 4..14; north arm x 0..8, z 11.2..14 (the maintenance gallery; it ends at the casing's east end, screened) | y 10 | entry from A2 (west wall, z 6.4..7.6) | glass screens 2.4 on every inner edge (0.2); the slot is its only way up | side by side | - |
| 2 | RC | Concrete cable-riser casing 1.2 deep, x 3..8, z 11.2..12.4, standing 1.6 off the north wall, 4.6 tall above G1 (inside A30's split window; out of boost reach, A51) | G1 north arm | split jump in the slot (z 12.4..14); jump up out of the split onto the casing top (14.6) | the slot is the only way off G1; its floor is G1 (a fall returns to the start) | one at a time (the second waits on the west arm) | gap 1.6 (1.2-1.95), faces >= 3.6, casing top 4.6 above the split floor (3.95-4.75) |
| 3 | G2 | Grated bridge x 8..11, z 11.2..12.4 (0.6 below the casing top) to the east gallery x 11..14, z 8..12.4 | y 14 | - | flush 2.4 `noLedge` glass screens on every open edge (a drop would land on G1 or the chamber, onward or off the line; no boost lip from G1); its only way up is WJ1 | waiting spot 3 x 4 | - |
| 4 | WJ1 | G3's south face (the headframe ring beam), lip 3.4 above G2 | G2 north end, lip at z 12.4 | wall jump (straight) | G3 is solid; a fall lands on G2 | one at a time | 2.7-3.8 (`WALL_JUMP`) |
| 5 | G3 | Hoist landing x 10..14, z 12.4..14 | y 17.4 | - | flush 2.4 `noLedge` glass screens on its open edges; its only way up is WJ2 | waiting spot 4 x 2 | - |
| 6 | WJ2 | Inside corner of the north wall and a riser pier (x 9..10, z 12.4..14) whose top is G4's east end, lip 3.2 above G3 | G3 west end | corner kick (inside corner) | a fall lands on G3 | one at a time | 2.7-3.8; corner reach 1.4 |
| 7 | G4 | Ring-beam landing x 4..10, z 12.6..14 (1.4 deep, same-direction single file) | y 20.6 | - | flush 2.4 `noLedge` glass screens on its open edge; its only way on is the bar | the second waits at the east end | - |
| 8 | PH | Damper-shaft operating bar from above G4's west end (4.5, 13.3) south-west to above G5 (2.5, 2), 11.5 m | y 23.1 (2.5 over G4 / G5) | hands, legs up, inverted, flip drop onto G5 | the void between G4 and G5; a fall lands on catch net NT1 | one at a time | `PIPE` times |
| 9 | NT1 | Catch net under PH, x 1.2..6, z 4..12.6, mesh edge screens 2.4; a net ladder up to G4's west end; a one-way return turnstile (0.2, A61: turns towards NT1 only, one body per turn) built as a door across W5 at z 9.8 (x 0..1.2; a locked door until T7a), past which W5 opens down to NT1 at x 1.2, z 9.8..10.9 | y 19.0 | - | catcher: its only exit is the ladder back to G4 (the turnstile never lets anyone from NT1 onto W5 or G5) | - | `LANDING` soft (2.2 feet drop) |
| 10 | G5 | Hoist deck x 0..4, z 0..4, and its hoist stub HS x 4..5.4, z 0..0.8 (the top of the hoist pier HP, a concrete pier x 3.4..5.4, z 0..0.8 against the south wall, rising from NR's floor); on G5's north edge the return walkway W5 (x 0..1.2, z 4..11; screened 2.4 on its east side z 4..9.8 and its north end, the shaft wall on its west) steps down 1.6 to NT1 through a one-way return turnstile (the door across W5 at z 9.8, then the opening at x 1.2, z 9.8..10.9), so a player who reached G5 with a bar objective open goes back by the net ladder to G4 (A61) | y 20.6 | - | flush 2.4 `noLedge` glass screens except W5, NR's return turnstile (east edge, z 2.8..3.8) and the rope point (HS's north edge, x 4..5.4, z 0.8); the rope point stands over NR, not ML, so stepping off lands in NR (back to G5); its only way on is RP1 | waiting spot 4 x 4 | - |
| 11 | RP1 | Hoist rope from the hoist beam on HP's north face (`RappelPoint` top x 4.8, z 0.8, y 20.6, normal +z; 7.0 m, so the rope end is at ML's floor height, y 13.6). Hooked from HS facing north (a player at x 4.8, z 0.4 is 0.4 from the top and behind the face: the engine's hook needs the feet within 0.2 past the face and within 0.9 of the top, `world/anchors.ts` `nearestInReach` rappel). The body hangs 0.5 off the face (z 1.3; a kick swings it out to z 2.5) over NR; the player moves sideways east along the face to x 6.3 (the `RAPPEL.lateralMax` 1.5 limit) and unhooks onto ML | G5's hoist stub | rappel: change speed, kick out, move sideways; unhook over ML | ML is reached only from the rope by moving sideways and unhooking: unhook works only with the feet within 2.0 of the rope end (y 13.6..15.6, ML's band); a straight descent bottoms out at x 4.8 and drops 4.8 into NR, a step off HS or any fall lands in NR (back to G5: the rope column x 3..5.95, z 0..3.8 is closed north (x 4..5.95) and east by full-height glass to y 23.0, T5e; x 3..4 lies under G5's deck); the feet never go below ML's floor, so no swing bottoms out on RF; the one way from RP1 into RF is an unhook at lateralMax over ML's hatch (x 6..6.8, z 1.5..2.9), which drops into RF, whose ladder returns to ML | one at a time | `RAPPEL` speeds; `unhookHeight` 2.0; `lateralMax` 1.5 (beam x 4.8 + 1.5 = x 6.3, 0.3 onto ML) |
| 11a | NR | Rope net (catcher) x 3..6, z 0..3.8 (it runs 1 m under G5's deck, so a west swing that bottoms out lands in it), round HP's foot; a ladder on a backing plate at G5's east edge (x 4.4, z 3.3, 11.8 m; north of RP1's kick volume z <= 2.85, T5e) to a one-way return turnstile in G5's east screen (z 2.8..3.8, towards G5 only); NR runs to z 3.8, closed west by glass at x 3 to G5 - 0.3, north by glass to y 23.0 for x 4..5.95 and to G5 - 0.3 for x 3..4, and east by the NR / RF partition at x 6 (RF 4.5 up to ML 13.6) with the rope column's screen (x 5.6..5.95) above it to y 23.0 | y 8.8 (ML's west edge, a full-height screen with a one-way gate towards NR, is 4.8 above it: out of boost, 4.5, and wall-jump, 3.8, reach, A51) | - | catcher for the rope point and RP1: its only exit is the ladder to G5 | - | `LANDING`: a rope bottom-out (4.8) or a drop from ML is the heavy band (no damage, ~0.7 s recovery: `playerController.ts` landT = min(0.7, 0.15 + (v - 3) * 0.08), floored at `LANDING.heavyRecovery` 0.6; at gravity 18 a free fall of 4.5 m or more lands at >= 12.7 m/s, so 0.7); a step off HS (11.8) the same |
| 12 | ML | Mid landing x 6..8.1, z 0..3.75 (north screen z 3.65..3.75, T5e fix 1) | y 13.6 | - | flush 2.4 `noLedge` glass screens on its north edge and its east edge over the well (x 8.1, z 0..2.2); its west edge (x 6, z 0..3.75) carries a full-height glass screen x 5.6..5.95 to y 23.0 (`noLedge`; the rope body passes it: the rope path is kinematic, `attachController.ts` `path`) with a one-way return gate (z 1.8..3.0, towards NR only, A61) for the RP1 retry: NR's ladder returns to G5; the bridge DB (x 8.1..9, z 2.2..3.75) leads to the davit head; its only way on is RP1 (sideways and unhook), its only way down RP2 | waiting spot 2 x 2 (x 6.1..8.1, z 0..2: the second unhooks into it and waits there while the lead is on RP2) | - |
| 13 | RP2 | Inspection davit rope on CR's west wall face (`RappelPoint` top x 9, z 1.8, y 13.6, normal -x; 9.1 m to RF's floor, y 4.5; z 1.8 so the body's lateral range z 0.3..3.3 keeps its centre off the south wall's face, 0.225, and its capsule, 0.3, off the well's north screen at z 3.65: no unhook or bottom-out leaves it overlapping a screen whose far side is the fan pit, T5e fix 1, test 'rope catchers'). The davit head DH is the top of CR's west wall, raised as a pier x 9..9.8, z 0..3.75 to y 13.6 and reached from ML by DB; a player on DH at x 9.3, z 1.8 facing west is 0.3 from the top and behind the face (the hook rule, row 11). The body hangs 0.5 off the face (x 8.5) in the well x 8.1..9, z 0..2.2 between ML and CR. DH carries flush 2.4 `noLedge` glass screens on its east edge (over CR's roof), its north edge and its west edge z 0..1.3 (open at the davit point z 1.3..2.2 and to DB z 2.2..3.75), so DH leads nowhere but the rope | ML, DB, DH | rappel and kick through the CR window (CR's west wall x 9, z 1.05..2.55, y 9.5..11.0, centre z 1.8 under the top) | CR is the only way on: the engine offers the kick only for a window in the rope's own wall beside the body (`attachController.ts` `windowBeside`: its face parallel, the body 0..1.4 off it, within 0.9 sideways, the sill near the hands) and lands the body 0.9 inside the window's centre (x 9.225 in CR's west wall x 9..9.45, so x 10.125, CR's floor: `attachController.ts` `kickThrough`); a miss lands on RF. The window (sill 5.0 above RF, out of mantle and boost reach) opens only to the rope kick-through: a sprung pane hinged at its head (like the louvres, A53) that swings in for a body on the rope and springs shut behind; from RF it is a closed, unbreakable glazed frame with a `noLedge` sill, so no mantle, boost or shot enters CR from RF (retry: RF's ladder to ML, then RP2 again) | one at a time | `ropeWindow`; window sill 2.0 above CR's floor (2.0-3.5) |
| 14 | RF | Rope foot catcher x 6..9, z 0..3.75 (under ML and the well), mesh screens 2.4 (the north one at z 3.65..3.75, rising to ML + 2.4, closes the pit side); a plant ladder facing the hatch pier (x 6.4, z 1.9, facing south; west of RP2's kick volume x >= 6.95, T5e) up to a floor hatch in ML (x 6..6.8, z 1.5..2.9) that opens from below only (a flush sprung lid, walkable from above) | y 4.5 (T5e: CR's window sill 5.0 over it, out of boost reach) | - | catcher for RP2 and the davit point: its only exit is the ladder to ML; it is entered only from the well, or from RP1 at lateralMax through ML's hatch (an unhook over the hatch drops into RF; NR's mesh screens it from NR, the hatch lid never opens from ML), so the ladder serves RP2's retry only and bypasses nothing | - | - |
| 15 | CR | Fan control room x 9..14, z 0..5 (glazed north wall over the chamber); the fan isolator (switch) | y 7.5 | stop the fan | its only door (north) opens onto ZD | side by side | - |
| 16 | ZD | Zip deck x 9..14, z 5..8 | y 7.5 | - | flush 2.4 `noLedge` glass screens except the launch point; its only way on is ZP | waiting spot 5 x 3 | - |
| 17 | ZP | Spoil ropeway cable from inside ZD's west launch gap (x 9, z 6.4..8) at (9.6, 6.8, y 9.4: 1.9 over ZD) to above the west platform WP (1.5, 8.5, end y 4.5; the body hangs 1.9 under it) | across the chamber, north of the fan pit | zipline, launched at the end onto WP | the only way to WP; a fall lands on catch net NT2 | one at a time | `ZIP_SPEED` 6 |
| 18 | NT2 | Catch net under ZP, x 4..9.5, z 6.6..9.4, mesh edge screens 2.4 north, south and east and 2.0 on the west (the hanging body's feet clear the west screen by 0.1, A72); its ladder up to ZD's west face | y 2.0 | - | catcher: its only exit is the ladder to ZD | - | - |
| 19 | WP | West platform x 0..3, z 7..10 | y 2.6 | drop to the chamber floor (soft) | - | side by side | soft |
| 20 | FP | Fan pit x 6..12, z 2.6..6.5 inside a chain-link fan guard 2.4 high on its north side only (z 6.5, x 6..12, `fence`); its east side (x 12) is the CR substructure's solid west face (a fence there would stand against solid concrete, so v2 drops it) and its south side (z 2.6) is PP's solid north wall. Outside the guard the chamber floor is only the ring x 0..14, z 6.5..14: x 12..14, z 0..6.5 and x 9..14, z 0..2.6 are the CR substructure, solid concrete from the chamber floor to CR / ZD's floor (y 7.5) with smooth faces (no lip under 7.5, out of boost reach), so no floor leads round the fence to the pit's east side, PP's east end or A3; the fence is `anchorLock`ed on `fan-off` (A31) | floor | fence climb, shimmy, rattle above gear 3, flip over | the chamber floor ring (x 0..14, z 6.5..14) has no other exit; the fence top is a fence anchor, not a ledge (no boost lip); the fence climbs from both sides, so a player with a fence objective open climbs back out and repeats (A61) | side by side (6 m of fence) | `FENCE` |
| 21 | DU-1, DU-2 | Twin fan discharge ducts, each 1.2 wide x 1.0 high, 4.0 long, from the pit's west wall (x 6) west to the plant passage PP (z 3.0..4.2 and z 4.8..6.0); each has an inner grille at the pit end (hinged, quick-release screws: unscrew only, a kick does nothing; it swings shut and re-latches when its duct is empty) and an outer louvre at the passage end (a sprung flap: kick only, it springs shut behind; neither is a breakable, A53, A61); the ducts crawl both ways | floor | duct crawl; inner grille unscrew (hold, quiet); outer louvre kick (tap, loud) | the ducts are the pit's only exits | one player per duct (no passing needed) | engine duct anchor (SPEC E6) |
| 22 | PP | Plant passage x 0..2, z 2.6..6.5 (walled from the floor ring) and x 0..9, z 0..2.6, roofed at 3.0; A3 door on z 0 at x 6.4..7.6. Its north wall (z 2.6, x 2..9) is solid full height to its roof, and x 2..6, z 2.6..6.5 is solid apart from the two ducts; its east end (x 9) is the CR substructure's west face | floor | - | - | side by side | - |

Objectives (in order; all "each" unless named; R5):
| # | Objective | Element | Verb / tick |
| --- | --- | --- | --- |
| 1 | Split jump in the riser slot | RC | split |
| 2 | Jump up out of the split onto the casing | RC | split jump-up |
| 3 | Wall jump up to the hoist landing | WJ1 | wallJump |
| 4 | Corner-kick up the inside corner | WJ2 | wallJump corner |
| 5 | Hang from the damper bar | PH | pipe |
| 6 | Legs up on the bar | PH | pipe legs up |
| 7 | Go inverted on the bar | PH | pipe inverted |
| 8 | Flip drop onto the hoist deck | PH | flip drop |
| 9 | Rappel the hoist rope: change speed, kick out, move sideways | RP1 | rappel (speeds, kick, sideways) |
| 10 | Unhook at the mid landing | RP1 | unhook |
| 11 | Rappel the davit rope and kick through the control-room window | RP2 | rope window |
| 12 | Stop the fan at the isolator | CR | either: switch `fan-off` |
| 13 | Ride the zipline to the west platform | ZP | zipline |
| 14 | Climb the fan guard | FP | fence |
| 15 | Shimmy along the fan guard | FP | fence shimmy |
| 16 | Rattle the fan guard: climb it at gear 4 or more | FP | fence rattle |
| 17 | Flip over the fan guard into the pit | FP | fence flip |
| 18 | Crawl your discharge duct | DU | duct |
| 19 | Unscrew the inner grille (quiet) | DU | grille unscrew |
| 20 | Kick out the outer louvre (loud) | DU | grille kick |
| 21 | Both on the airlock pad | A3 | airlock |

Co-op split and gate: none (R3). The fence stays locked ("Fan running") until either player stops the fan in CR (12):
both pass CR on the line, so this is a gate on the line, not a split. Lock behind: A3. Waiting: the second starts each
single-file element when the first has stepped off its far end; the waiting spots are in the table.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L3-1..5 | Sodium bulkheads on G1, G2, G3, G4, G5 | I1 | A2 side of G1 | Breakable. |
| L3-6 | Hoist lamp over RP1 | I1 | A2 side | |
| L3-7, 8 | Floods on the chamber walls | I2 | In CR | Off at start: the chamber is dark until a player lights it (or leaves it dark: night vision). |
| L3-9 | CR LED panel | own | CR door | Lights the isolator. |
| L3-S | LED strips under every landing lip and on the net rails | equipment | none | Accent below dark 0.28. |
| L3-E1..3 | Emergency bulkheads at G1, CR and PP | none (maintained) | none | |
Sound: landings and ZD steel grating (loud); the fan's running noise (an ambient bed in Phase 2: masking placeholder);
the ducts sheet steel (loud on a kick).

Sketch (plan; heights in brackets; landings stack inside the shaft):
```
 z14 +==G1 north arm (10)==[slot]RC(14.6)====+pier+--G3(17.4)--+   G4 (20.6) runs x4..10 on the north wall
     |G1  |      NT1 net (19) under PH bar   |WJ2 |    WJ1      |
     |west|      PH bar (23.1) runs z13->2   |   G2 east (14)   |
     |(10)|  WP(2.6)  <~~~~ ZP ~~~~ ZD(7.5)  |                  |
 A2->|    |   NT2 net (2.0)                  |                  |
     |    |  [DU-1/2]=FP fan pit= fence(N)   |  CR (7.5) window |
     | PP | NR(8.8) HP RP1> ML(13.6)|RP2 DH    |  isolator        |
     |    |   (RF 4.5 under ML and the well) |                  |
 z0  +G5(20.6)--PP plant passage--[A3]-------+------------------+
     x0  x2.8                      x9        x11              x14
```

R1-R8 check:
| Rule | How B3 meets it |
| --- | --- |
| R1 | One line: G1 -> slot -> G2 -> WJ1 -> G3 -> WJ2 -> G4 -> bar -> G5 -> HS -> RP1 (sideways, unhook) -> ML -> DB -> DH -> RP2 (window kick) -> CR -> ZD -> ZP -> WP -> floor ring -> fence -> pit -> ducts -> PP -> A3. Every landing has one way on. Return turnstiles (W5 G5 -> NT1, NR -> G5) and RF's below-only hatch to ML are one-way links back, never a way on (0.2); ML's west edge is a full-height glass screen (x 5.6..5.95, to y 23.0) whose one-way gate (towards NR only, A61) is a way back, never up (NR's floor is 4.8 below ML). |
| R2 | Every landing edge a flush 2.4 `noLedge` glass screen except its move point (drops land further on, 0.2); the casing 4.6 and G2's screens keep G1 out of boost reach; falls land on the element's start landing (slot, WJ1, WJ2) or a catcher with a ladder back (NT1, NR, RF, NT2); the rope point (HS) and RP1's top (x 4.8) stand over NR, not ML, so a step off HS or a straight descent (bottom-out at y 13.6) lands in NR (ladder back to G5); ML is reached only by moving sideways on the rope to x 6.3 (`lateralMax` 1.5) and unhooking in its band (feet 13.6..15.6, rope end at ML's floor, so no swing bottoms out on RF); an unhook at `lateralMax` over ML's hatch drops into RF (the graph edge G5 -> RF by rope 1, a fall onward, never a bypass); ML's west edge is a full-height screen to y 23.0 with a one-way gate towards NR (NR is 4.8 below ML, out of boost 4.5 and wall-jump 3.8 reach); RF is entered only from the well (RP2) or through ML's hatch from RP1, and its ladder ends in a below-only hatch on ML (RP2 retry, no bypass); RP2 hangs on CR's own west wall (the only window the engine's kick offers) and the window opens only to the rope kick (RF side closed). The CR substructure fills the chamber outside the fan guard (no way round the fence). Retry (A61): ML -> NR -> G5 and W5 G5 -> NT1 -> G4, each ending in a one-way return turnstile (no tailgating), RF -> ML by the hatch, the fence both ways, self-closing grilles and louvres. WJ1 / WJ2 lips are inside boost reach (REVIEW-NOTES question). |
| R3 | Every element for both, one after the other; no split. |
| R4 | 14 x 14 (60% of v1); vertical by design. |
| R5 | 21 explicit objectives. |
| R6 | A3 (0.4). |
| R7 | Flush 2.4 glass screens on every landing edge, CR glazed over the chamber, LED lip strips; the concrete shaft lining dark. |
| R8 | Every v1 verb kept; v1's lead / second split replaced by both doing both (rope and zipline). |

Unavoidable elements:
| Element | How it blocks | Nav test (room graph, link removed -> A3 unreachable) |
| --- | --- | --- |
| RC slot | G1's only way up | remove split link: G2 unreachable |
| WJ1, WJ2 | Solid landing faces; G2 / G3 screened 2.4 | remove either wall-jump link: G4 unreachable |
| PH bar | Void G4 -> G5; NT1 returns to G4 | remove bar link: G5 unreachable |
| RP1 | G5's only way on; the rope point (HS) stands over NR (a step off or straight descent lands in NR, ladder back to G5); ML only by sideways (x 6.3 at `lateralMax`) and unhook (band 13.6..15.6, the rope end at ML's floor); W5's and NR's turnstiles turn towards NT1 / G5 only | remove rope link: ML unreachable (G5's edge drop reaches NR only, and NR's only exit is G5) |
| RP2 + window | ML's only way down (DB -> DH -> the rope on CR's west wall); RF returns to ML by its below-only hatch; the window opens only from the rope | remove window link: CR unreachable |
| CR isolator | Fence locked until `fan-off` | with `fan-off` unset: the pit unreachable |
| ZP | ZD's only way on; NT2 returns to ZD | remove zip link: WP and the floor ring unreachable |
| Fence | The floor ring's only exit | remove fence link: the pit unreachable |
| Ducts + grilles | The pit's only exits | remove both duct links (or keep both grilles shut): PP unreachable |

---

## B4 - The Cistern (co-op climbing)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's fire-water and domestic reservoir: three drained concrete cells with 4.4 m walls, a valve gallery along the top, a sluice gate in a cell wall, inspection doors bolted from the downstream side, a ladder from the valve gallery into the last cell. Cresset padlocks the C1 and C2 ladders for the team-climb drill. |
| Size, shape | 12 x 26 (312 m2, 23% of v1): cells C1 (z 18..26), C2 (z 9..17), C3 (z 0..8), each 9 wide (x 0..9); walls W1 (z 17..18, 4.4) and W2 (z 8..9, 4.25 where the human ladder stands, A35), walkable tops; valve gallery VG along the east (x 9..12) at 4.4. |
| Verticality | Every cell wall is a co-op lip (level-design 11.3: 4.3-4.5, out of solo reach; W2 4.25, A35). |
| Colour | 4200 K LED; wet concrete; glass screens along the gallery and the Phase 5 bay. |
| New mechanics | Brace, boost, human ladder; one lifts, the other opens the way; a timed hold (sluice). Phase 5 placeholders: split-jump boost, back-to-back climb, pull-up, rappel anchor. |
| Guards | None. |
| Lead / second | P2 / P1. Team moves as a pair (R3). |

Elements (local; in line order):
| # | Element | Where | Verb | Blocks by | One at a time / side by side | Check |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | C1 entry cell, 9 x 8; A3 door in its north wall (x 5.4..6.6); padlocked C1 ladder (visual) | z 18..26 | - | - | side by side | - |
| 2 | W1, 1 m thick, 4.4, wall to wall; where its top meets VG (x 9, z 17..18) a flush 2.4 `noLedge` glass screen (W1 never joins VG) | z 17..18 | brace (P1), boost (P2 boosted onto W1), drop into C2 | the only way from C1 is over W1 (co-op lip) or through its door (bolted from C2) | pair | 4.4 (4.3-4.5) |
| 3 | W1 inspection door 1.2 x 2.1, bolted from the C2 side | x 4..5.2 | draw the bolt (P2, from C2); P1 walks through | one-side gate (`bolt`) | one at a time | - |
| 4 | C2 cell, 9 x 8; padlocked C2 ladder (visual) | z 9..17 | - | - | side by side | - |
| 5 | W2, 1 m thick, 4.25 at the human-ladder spot (x 1..4), 4.4 elsewhere; its top meets VG at a rail gate (x 9, z 8..9); its south edge (z 8, x 0..9) a flush 2.4 `noLedge` glass screen (no drop into C3) | z 8..9 | human ladder: P2 holds, P1 climbs to the lip and up | co-op lip | pair | `TEAM.ladderGrab` + 0.2 = 4.3 >= 4.25 (A35) |
| 6 | Sluice 1.5 x 2.1 under W2 (x 6..7.5); handwheel on VG at (10, 8.5) | W2 | P1 holds the handwheel (timed hold: the gate rises while held, drops 6 s (TUNE) after release); P2 passes under | the sluice is C2's only exit for the player left in C2 | one at a time | hold gate (A11) |
| 7 | VG valve gallery x 9..12, z 3..26 at 4.4, solid; its cell-side edge a flush 2.4 `noLedge` glass screen (lip 6.8 over the cells: out of boost reach, A51) except W2's rail gate (z 8..9) and the C3 ladder head (z 5.4..6.6); a glass partition at its south end (z 3) to the outlet platform | east | - | VG cannot be climbed from a cell; it joins only W2's gate and the C3 ladder | - | A33 |
| 8 | C3 ladder from VG down into C3 (unlocked) | x 8.6 (on VG's face, x 9), z 6 | P1 climbs down | - | one at a time | - |
| 9 | C3 cell line floor x 3..9, z 2..8 | z 0..8 | - | - | side by side | - |
| 10 | Outlet platform OP x 3..9, z 0..2 at 4.4 (the reservoir outlet); its hooked ladder `anchorLock`ed until the top player presses "Lower ladder" (A33) | C3 south | boost onto OP (now form of the pull-up), lower the ladder, the partner climbs | co-op lip (its north and east edges); glass to VG; A4's door on OP's south wall | pair | 4.4 |
| 11 | Phase 5 bay x 0..3, z 0..6.5 behind a glass screen with a locked glass door (x 3, z 4..5.2; not on the line): overflow channel x 0..1.6, z 3.5..6.45 (one 6.2 wall at x 1.6..2.0; ends 1.5 m short of W2, so no solo route reaches a co-op lip: A35's rule; A35's own figure, local z 8.5, is v1's), float-valve shaft not built until T7a (SHAFT_ELEMENTS 'B4-P5'), sump x 0..3, z 0..3 (4 m deep, floor y 2) | C3 west | split-jump boost, back-to-back, rappel anchor (Phase 5) | not drills until Phase 5 (D30); the SW session that switches one on puts it on the line (opens the glass door, closes the line past it) | - | - |

Objectives (in order; R5):
| # | Objective | Who | Element | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Brace against the wall for your partner | P1 | W1 | brace |
| 2 | Take the boost onto the wall | P2 | W1 | boost (boosted) |
| 3 | Drop into the next cell and draw the door bolt | P2 | W1 door | bolt gate |
| 4 | Hold steady as a human ladder | P2 | W2 | human ladder (holder) |
| 5 | Climb your partner up the wall | P1 | W2 | human ladder (climber) |
| 6 | Hold the sluice open from the gallery | P1 | handwheel | hold |
| 7 | Pass under the sluice | P2 | sluice | gate passed |
| 8 | Climb down into the last cell | P1 | C3 ladder | ladder |
| 9 | Boost onto the outlet platform | either (one braces, one is boosted) | OP | boost |
| 10 | Lower the outlet ladder for your partner | either (the top player) | OP | switch `outlet-ladder` |
| 11 | Climb the outlet ladder | either (the other) | OP ladder | ladder |
| 12 | Both on the airlock pad | both | A4 | airlock |
| - | Split-jump boost; back-to-back climb; partner holds the rope (Phase 5) | - | P5 bay | not drills until Phase 5 lands |

Co-op split and gate: the sluice (6, 7) is a split by design (R3: "one holds while the other passes"), listed in 0.2;
the players see each other through the gallery glass the whole time and rejoin in C3 within about 10 s. Every other
step is a pair move. Lock behind: A4. Softlock check (SPEC E3): C1 and C2 have no way up alone; a disconnect ends the
session (bible C2); both down restarts the bay at A3.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L4-1, 2 | Gallery bulkheads | V1 | VG north end | Breakable. |
| L4-C1, C2, C3 | One LED cage light per cell | C1, C2, C3 | Inside each cell by its door / ladder | |
| L4-S | LED strips on the wall tops (the co-op lips) and OP's edge | equipment | none | Accent below dark 0.28: they mark the lips. |
| L4-E | Exit sign over A4 | none | none | |
Sound: cell floors wet concrete; wall tops and VG steel chequer plate (loud).

Sketch:
```
 z26 +----[A3]---------+---+
     |  C1 (entry)     | V |
 z18 |===W1 4.4 [door]=| G |
     |  C2             |   |
 z9  |===W2 4.25 [sluice]=gate handwheel
     |P5 bay |  C3     |lad|
 z0  +-------+[OP 4.4][A4]-+
     x0     x3        x9  x12
```

R1-R8 check:
| Rule | How B4 meets it |
| --- | --- |
| R1 | C1 -> W1 -> C2 -> W2 / sluice -> C3 -> OP -> A4; VG joins only W2's gate and the C3 ladder (W1's end screened from VG, so a player on W1 cannot reach VG and the C3 ladder past the bolt door, the human ladder and the sluice). |
| R2 | W1 and W2 span wall to wall at co-op lip height; W1's end screened from VG and W2's south edge screened (2.4 `noLedge`), so W1 leads only into C2 and W2 only to VG's gate; VG's cell side screened (lip 6.8, no boost); a fall from a wall top lands in a cell already on the line (C1 = the start, C2 = the next cell, which the bolt door joins back). |
| R3 | Pair moves; the one split (sluice hold) is listed with its reason. |
| R4 | Cells 9 x 8 (23% of v1). |
| R5 | 12 explicit objectives (plus the greyed Phase 5 line). |
| R6 | A4 (0.4). |
| R7 | Glass screens along VG, at W1's end and on W2's south edge, glass partitions round the Phase 5 bay, LED lip strips; the cells bare wet concrete. |
| R8 | Every v1 team move kept; Phase 5 elements built off the line. |

Unavoidable elements:
| Element | How it blocks | Nav test (room graph, link removed -> A4 unreachable) |
| --- | --- | --- |
| W1 boost + bolt door | C1's only exits: the boost lip and the door bolted from C2; W1's top joins only C2 (screen to VG) | remove the boost link: C2 unreachable (door stays bolted); remove the W1-C2 drop link: VG unreachable from W1 |
| W2 human ladder | C2's only way up | remove the ladder link: VG unreachable |
| Sluice hold | C2's only floor exit for the second player; W2's south screen stops the climber dropping into C3 | with the hold gate never held: C3 unreachable from C2's floor; no W2-top -> C3 link exists |
| C3 ladder | VG's only way down (VG screened from the cells and from W1) | remove the ladder link: C3 unreachable from VG |
| OP boost + lowered ladder | OP is a co-op lip; its ladder is locked until lowered | remove the boost link: OP unreachable |

---
## B5 - Standby Plant (light and sound)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's standby power plant: three diesel generator sets, the switch room with the mains breaker, the fuel day-tank bay, a cable trench under grating covers, a cable gallery along the north wall. Cresset runs it live (it powers the course) with role-player duty electricians. |
| Size, shape | 30 x 24, 9 clear (720 m2, 47% of v1): one guarded hall (it holds two routes and a loop, E4) with the switch room and fuel bay inside it. |
| Verticality | Entry landing 4.4 (A32) and its stair; genset roofs 3.0 (wall jump, high route); cable gallery 3.5 (ladder); the cable trench -1.5 (secret). |
| Colour | 4000 K LED high bays; red-white emergency bulkheads; the amber PIR flood at the fuel bay. |
| New mechanics | First guards. Switches and circuits, shooting lamps, the mains breaker, maintained emergency lights, a PIR light, guards' flashlights in the dark, loud and quiet floors, thermal vision (hot gensets), EMP, noisemaker; the whistle and masking (Phase 2 placeholders). |
| Guards | 2 (B5-G1, B5-G2). |
| Lead / second | P1 (breaker) / P2 (crosser). |

Layout (local):
| Element | Box / position | Real reason | Gameplay |
| --- | --- | --- | --- |
| Entry landing EL | x 22..30, z 21..24 at 4.4; a 2.4 glass screen (`noLedge`) on its south edge but for the stair head (R2: no drop past the stair); its own stair (24 risers) down south along x 26.4..28 to z 14.3; a full-height mesh screen on its west end (A36) | A4 door; plant-room access stair | vantage: dark, sees both guards within one cycle; joins nothing but its stair |
| Switch room SR | x 24..30, z 6..12; glazed west wall (glass partition), rubber floor; door on the west wall z 6.6..7.8 (onto the aisle) | Breaker and circuit switches | mains breaker MB (hold 2 s), switches L1-L3 |
| Gensets GEN-1, 2, 3 | x 5..9, 12..16, 19..23; z 9..11.5; 3.0 high | Standby sets | full cover; roofs are planned lips (wall jump) |
| Cable trench grating | z 12.8..14, x 1.4..25.6 (clear of the stair foot) | Trench covers | loud fast route |
| Cable trench (secret) | under the grating, 1.5 deep x 1.2 wide, lift-out panels at x 25 and x 2 (a plant ladder in each) | The trench itself | crouch duct (16.7.3) |
| Cable gallery CG | y 3.5, x 2..16, z 22.5..24; ladder at its east end x 15.3; its west end a hang-only lip (`GAL-W`, A38) | Cable trays | high route, hang-drop at x 2 |
| Main aisle | z 4..7 | Plant aisle | lit crossing |
| Fuel bay FB | x 24..30, z 0..6, door in its west wall z 1.4..2.6; day tank 4 x 2 x 2.4 | Fuel | cover; PIR flood |
| Monitoring desk | x 1..4, z 1..3.5, facing east | The duty desk | B5-G2's post |
| A5 door | west wall, z 11.4..12.6 | Plant-room fire door on a mag lock | the gate |

Routes to A5 (E4; all start at the stair foot (27.2, 14) and rejoin at the A5 door):
- Shadow: west along the dark strip north of the grating (z 15.2..22, under the gallery), down the west wall (dark) to A5.
  Loop: round GEN-1 (two dark gaps).
- High: the gallery ladder (x 15.3), west along CG, hang-drop at x 2 (soft); or wall jump onto the genset roofs and
  cross them (3 m gaps: drop and wall jump).
- Loud: the grating or the main aisle at speed.
- Secret: the cable trench from the x 25 panel to the x 2 panel.

Objectives (R5; order free inside the hall, the breaker last):
| # | Objective | Who | Where | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Thermal vision: find the hot gensets | each | from EL | thermal (loco 14) |
| 2 | Switch a light circuit off | each | SR switches L1-L3 or the CG switch at the gallery ladder foot | switch |
| 3 | Shoot out a lamp | each | any breakable lamp (HB, CG) | lamp shot |
| 4 | EMP a lamp | each | any lamp | EMP |
| 5 | Lure a guard with a noisemaker | each | anywhere a guard hears it | noisemaker heard |
| 6 | Take down a guard from behind | each (one guard each) | G1's isolation spot; G2 at the desk | takedown:behind |
| 7 | Pull the mains breaker | P1 | SR, MB | hold 2 s: `B5-mains` off |
| 8 | Reach the fire door while the mains are off | P2 | A5 door | mag lock gate |
| 9 | Both on the airlock pad | both | A5 | airlock |
| - | Throw a bottle to lure a guard (each, Phase 6); whistle (each, Phase 2); PIR flood (S3) | - | - | not drills until they land |

Co-op split and gate (listed in 0.2): A5's fire door is held by a mag lock that releases when the mains fail (fail-safe
fire doors, real). The breaker (P1) pulls MB in SR (hold 2 s): L1-L3 and the gallery lamps go off, emergency bulkheads
stay on, A5 unlocks while the mains are off. Final form (Phase 1 fuse box): B5-G2 leaves the desk to reset the breaker,
walking east along the aisle to SR (about 22 m, 25 s): the crosser (P2) reaches A5 unseen while the breaker leaves SR
west along the aisle's dark north side before G2 arrives. Now form: MB is a switch on the L1-L3 group plus the course
gate; `lightsOut` sends the nearest calm guard to investigate. If G2 resets MB, A5 relocks (unless both are inside).
They rejoin at A5 (the airlock). Lock behind: A5.

Guard sheets:
| Field | B5-G1 duty electrician (grunt) | B5-G2 desk operator (grunt) |
| --- | --- | --- |
| Job | Rounds of the running sets, reading gauges | Watches the switchboard monitor; resets faults |
| Route | (13, 7) wait 3 face W (along the aisle, covers G2) -> (18, 7) wait 2 face N (GEN-2 / GEN-3 gauges) -> (18, 12.8) wait 3 face E (behind the sets) -> (11, 12.8) wait 2 face W -> (11, 7) (down the gap between GEN-1 and GEN-2, 1 m clear of GEN-2) -> loop; 25.6 m at 0.9 m/s = 28 s + 10 s = 38 s | Post at (2.5, 2.2) seated facing E (yaw 90); glances N towards A5 every 10 s |
| Gaps | Facing E behind the sets (t 17-20 s): the aisle west of GEN-2 is unwatched by G1 | Each glance N lasts about 2 s; between glances the A5 door is in his peripheral field only |
| Isolation | (18, 12.8) between GEN-2 and GEN-3, dark (light < 0.28), unseen by G2 (GEN-1 and GEN-2 block), t 17-20 s | None while seated; on a breaker reset he walks alone to SR (dark aisle) |
| Covered by / covers | Covers G2 from (13, 7) facing W | Covers the aisle and A5 |
| Lures | Shot HB5 / HB6 (L3): investigates between the sets; a noisemaker on GEN-1 | MB pulled (final: walks to SR); a lamp shot near the desk |
| Search | Behind the gensets; hide spots: trench panels, the fuel bay, the dark under the gallery | The desk area; hide: the west recess under the gallery hang-drop |
| Relief door (A62) | `B5-relief`: the hall's south wall x 12.4..13.6 (both guards) | `B5-relief` |
| Flashlight | Yes (`torchWanted`: investigating where the level is below 0.35) | Yes when sent into the dark |

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| HB1, HB2 | LED high bays 4000 K over the aisle west | L1 | SR | Breakable (objective 3). |
| HB3, HB4 | LED high bays over the aisle east | L2 | SR | Breakable (objective 3). |
| HB5, HB6 | LED high bays over the gensets and grating | L3 | SR | Breakable; one re-lamps if both players' lamp shots cannot otherwise be done (0.2, A61). |
| CG1..3 | Gallery battens | L4 (mains) | Gallery ladder foot | Breakable (objective 3); one re-lamps under the same rule as HB5 / HB6 (0.2, A61). |
| EM1 | Emergency bulkhead over A5 | none: maintained, battery (stays on with MB off) | none | Breakable. |
| EM2, EM3 | Emergency bulkheads at the SR and FB doors | none | none | |
| PIR1 | PIR flood over the FB door | own | sensor | Now: a normal lamp, off. |
| DL | Desk lamp | own | at the desk | Lights G2's face (readable). |
| L5-S | LED nosings on the EL stair, LED strip along SR's glass front | equipment | none | Accent below dark 0.28. |
MB kills L1-L4. Lit chokepoints: (1) the A5 door under EM1: darkened by shooting EM1, EMP, pistol secondary (V3);
avoided by the gallery hang-drop and G2's glance gaps. (2) The aisle crossing between GEN-1 and GEN-2 (HB2): darkened
by L1, MB or a shot; avoided by the trench or the genset roofs.
Sound (Phase 2 placeholders): running gensets mask footsteps within about 6 m (TUNE in Phase 2); grating loud; SR rubber
quiet; the fuel bay concrete. Hide spots: two trench panels, behind the day tank, the recess under the gallery west end.

Sketch:
```
 z24 +=CG gallery (3.5)=========[lad]+mesh+-EL (4.4)-[A4]-+
     |  dark strip (shadow route)                 stair   |
 z15 |===grating (loud) / trench below=====================|
 A5  |   [GEN-1]    [GEN-2]  G1  [GEN-3]  |  SR (rubber)   |
 z12 |                                    |  MB L1 L2 L3  |
     |==== main aisle (lit) ==============+---------------|
     | [desk G2]                          |  FB  PIR       |
 z0  +--------------------------------------------------- -+
     x0                                  x24             x30
```

R1-R8 check:
| Rule | How B5 meets it |
| --- | --- |
| R1 | EL -> stair -> the hall -> A5; EL joins nothing but its stair (A36); the hall's routes rejoin at A5's door, the one exit. |
| R2 | The mag-locked A5 door is the bay's gate: the exit opens only with the mains off (MB) and the objectives done. |
| R3 | One split (breaker / crosser), listed with its reason; rejoin at A5. |
| R4 | 30 x 24 (47%): a guarded hall holding two routes and a loop. |
| R5 | 9 explicit objectives. |
| R6 | A5 (0.4). |
| R7 | SR's glass front, EL's 2.4 glass screen, LED nosings; the plant hall bare concrete and dark between lamps. |
| R8 | Guards, jobs, routes, gaps, lures and the breaker gate kept; distances rescaled (cycle 38 s). |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| EL stair | EL's only way down (mesh screen to CG) | room graph: remove the stair link, the hall unreachable |
| Mains gate (MB + A5 mag lock) | A5's door locked while `B5-mains` is on | with the mains on: A5 unreachable (layered NavGrid flood, A42) |

---

## B6 - Mock Site (corners and security)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's former communications centre, refitted by Cresset as a mock secure facility: reception, the office's air-handling plant, records, a corridor of offices, an open office with a glass control room above it, lockers, and a mantrap into a mock server room. |
| Size, shape | 30 x 24 (720 m2, 54% of v1), one storey (4.6 to the slab; the office 6.4 under the control room mezzanine at 3.6); the supply duct in the ceiling void 3.4-4.4. |
| Verticality | The control room (3.6) over the office, reached by an enclosed stair behind a card door; the supply duct in the ceiling void. |
| Colour | 6500 K LED, clean blue-white; blue rack LEDs in the server room. |
| New mechanics | Back-to-wall slide, corner peek, lean-out aim, SWAT turn, door peek, optic cable, electro vision; duct crawl and the ceiling vent drop; CCTV (fixed and sweep), security desk and operator, alarm panel (loop, beams off), plant fault trip, card readers, keycards, clone, mantrap, iris, beams (high, low), PIR, lockpick, hacking, the egress button. |
| Guards | 3 (B6-GD, B6-GR, B6-GM). |
| Lead / second | P2 (operator) / P1 (runner). |

Rooms (local; the shared line runs RC -> AH -> duct -> RE -> CO, then the split, rejoining in SV):
| Room | Box | Contents | Exit(s) |
| --- | --- | --- | --- |
| Reception RC | x 24..30, z 8..24 | Counter 1.1 (low cover); CAM1; A5 door on the east wall (z 12.4..13.6); the inner (visitors') door to CO locked (out of hours: nobody's card) | Door to AH in the south wall (x 26..27.2) |
| Air-handling room AH | x 24..30, z 0..8 | The office's air-handling unit (fed from B5's plant); a caged plant ladder (16.2.1; no boost to the duct mouth, A51) up to the supply duct's mouth at 3.4 | The duct |
| Supply duct | x 18..24, z 5.4..6.6 in the ceiling void (1.2 x 1.0, engine duct anchors, SPEC E6), 6 m west from AH | The office air supply | Ceiling grille over the records desk (x 18..19.2): vent drop into RE |
| Records RE | x 12..24, z 0..12 | Records PC (`hack`: `intel:exitCode`, `unlock:RD3` 20 s (TUNE)); CRAC unit (fault: "Trip cooling"); exit (REX) button inside the door (A37) | Door to CO, north wall x 17..18.2 (reader RD1 outside) |
| Corridor CO | x 2..24, z 12..14 (2.0 clear: wider than a split gap), then the L-leg x 2..4, z 4..12 (2.0 clear); x 0..2 solid (a cable riser) | Doors: LK (x 6..7.2, north), OF (x 13..14.2 and x 20..21.2, north), RE (south), the locked RC inner door (east end); beam pair B6-BH (1.4) and B6-BL (0.35) at z 9 and 7.8 in the L-leg; PIR1 at the L-turn | The L-leg's south end: RD3 into MT |
| Locker room LK | x 2..10, z 14..24 | Lockers (hide spots); locker 7 (`wafer`) holds card A (level 2) | CO only |
| Open office OF | x 10..24, z 14..24 (6.4 clear) | Desk pods with 1.5 glass partitions (low cover, see-through), the manager's glazed office (x 10..14, z 20..24, `pin` lock), the whiteboard with the exit code (seen on CAM4) | CO only (the CR stair is reached from CO through RD2, not from OF) |
| Control room CR | mezzanine x 14..24, z 19..24 at 3.6; glazed south front | Security desk SD (feeds CAM1-4), alarm panel PN (loop / cameras off / beams off), the desk console (feeds view). Enclosed stair x 10..12 (2.0 clear), z 14.3..20 behind reader RD2 (level 2, CO's north wall x 10.4..11.6), up to an enclosed landing x 10..14, z 20..24 at 3.6 over the manager's office (x 10..14, z 20..24, ceiling 3.3), with the door into CR at x 14 (z 21..22.2) | The stair |
| Mantrap MT | x 2..6, z 0..4 | Outer door RD3 (level 3) at the L-leg's south end; inner door RD4 (level 4) + iris IR1 (enrolled: B6-GM) on its east wall | SV |
| Server room SV | x 4..12, z 4..12 and x 6..12, z 0..4 | Rack rows (full cover), blue rack LEDs; the egress button by RD4; exit door to S6 in the south wall (x 8..9.2): keypad, code = `exitCode` | S6 |

Devices (S0 kinds; counts within SN60-SN65):
| Id | Kind | At (local x, z, y) | Facing / sweep | Reason |
| --- | --- | --- | --- | --- |
| CAM1 | camera fixed | 29.5, 13, 2.8 | 270 (over the counter at the inner door) | Covers reception |
| CAM2 | camera sweep | 23.5, 13.6, 2.8 | 225..315 | Corridor tour |
| CAM3 | camera fixed | 3, 11.6, 2.8 | 180 (S down the L-leg at RD3) | Covers the mantrap approach |
| CAM4 | camera sweep | 19, 18.8, 3.4 | 135..225 | Office floor (shows the whiteboard) |
| SD | desk | 19, 23, y 3.6 | 180 | Operator post; feeds CAM1-4 |
| PN | panel | 23.7, 23.3, y 4.9 | 270 | Controls CAM1-4, B6-BH, B6-BL |
| FLT | fault (CRAC) | 22, 3, 1.2 | 0 | Responder: B6-GM |
| RD1..4 | readers | RE door, CR stair, MT outer, MT inner | - | Levels 1, 2, 3, 4; building A |
| IR1 | iris | 5.8, 3.2, 1.6 (RD4 at 5.75, 0.8) | - | Enrolled B6-GM |
| B6-BH, B6-BL | beams | a (2.2, 1.4, 9) b (3.8, 1.4, 9); a (2.2, 0.35, 7.8) b (3.8, 0.35, 7.8) | - | The L-leg trap before the mantrap |
| PIR1 | PIR | 3, 12.8, 3.2 | lamp L6-P | The L-turn |
Cards: A (level 2, locker 7), B (level 3, held by B6-GR), M (level 4, held by B6-GM). Now forms as A37 (card pickups
set every level up to the card's; the egress button and the RE exit button release their readers for good).

Objectives (R5):
| # | Objective | Who | Where | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Climb to the supply duct and crawl it | each | AH, duct | ladder, duct |
| 2 | Drop through the ceiling grille into records | each | RE grille | vent drop (+ roll) |
| 3 | Press the exit button to open the records door | either | RE | switch (REX) |
| 4 | Back to the wall: slide along the corridor wall | each | CO | wall (loco 11) |
| 5 | Peek round the corner | each | CO L-turn / office doorways | peek (loco 12) |
| 6 | Lean out and aim from the corner | each | CO | lean (loco 12) |
| 7 | SWAT turn across a doorway | each | CO office doors | SWAT turn (loco 12) |
| 8 | Peek a door open a crack | each | LK or OF door | door peek (loco 13) |
| 9 | Electro vision: trace a card reader's wiring | each | RD1 / RD2 | electro (loco 14) |
| 10 | Look under a door with the optic cable | each | LK or RE door | optic (not a drill until V1) |
| 11 | Trip the cooling fault to send a guard | either | RE CRAC | fault (now: noisemaker lure counts; S1B) |
| 12 | Pick locker 7 for card A | P2 | LK | pick (now: open; V2) |
| 13 | Swipe card A at the control-room stair | P2 | RD2 | reader |
| 14 | Take down the desk operator, or lure him off the desk | P2 | CR | takedown or lure |
| 15 | Loop the cameras at the alarm panel | P2 | PN | hold 6 s (now: the course switch; S1B) |
| 16 | Turn the beams off at the alarm panel | P2 | PN | hold 2 s (beams: S3; now part of 15) |
| 17 | Read the exit code on the office camera feed | P2 | SD console | intel `exitCode` (now: the lit sign seen from CR) |
| 18 | Take card B from the rounds officer | P1 | B6-GR | takedown (clone while grabbing: S2) |
| 19 | Grab the mantrap guard and walk him down the corridor | P1 | B6-GM | grab walk |
| 20 | Open the mantrap: card B, card M, his eye at the iris | P1 | RD3, RD4, IR1 | readers (S2; now: card switches) |
| 21 | Knock him out in the server room | P1 | SV | grab knock-out |
| 22 | Press the egress button for your partner | P1 | SV | egress |
| 23 | Enter the exit code at the keypad | either | SV keypad | keypad (now: numbered switches) |
| 24 | Both on the airlock pad | both | A6 (after S6) | airlock |
| - | Hack the records PC (exit code and RD3) | P1 | RE PC | not a drill until V2 (alternate) |

Sequence: both drop into RE and do the corner drills along CO together (1-11). Split (listed in 0.2): the operator
(P2) goes LK -> RD2 -> CR (12-17) and pings the runner past B6-GR on the feeds; the runner (P1) takes B6-GR's card,
then grabs B6-GM at the L-turn and walks him down the L-leg (beams off by the operator) through the mantrap (18-22).
The operator comes down, through the mantrap on the egress; they rejoin in SV at the keypad (23) -> S6 -> A6.
Co-op split and gate: the exit code is only on CAM4's feed (operator) or in the records PC (hack, V2); the egress is only
on the secure side (runner). Lock behind: S6's top door (`bolt` opened from the B6 side; relocking after both pass is
T7a's gate kind, A37).

Guard sheets:
| Field | B6-GD desk operator (grunt) | B6-GR rounds officer (grunt, card B) | B6-GM mantrap post (officer, card M, enrolled) |
| --- | --- | --- | --- |
| Job | Watches the feeds | Rounds of the corridor and office | Holds the secure corridor; checks the locker room |
| Route | Seat (19, 23, y 3.6) facing S | (22.5, 13) wait 3 face W -> (17.6, 13) wait 2 face S (records door) -> through the west office door to (13.6, 17) wait 3 face N (office) -> (20.6, 17) wait 2 face E -> out the east office door -> loop; 25.8 m = 29 s + 10 = 39 s | Post (3, 12.8) at the L-turn facing E along CO; every 30 s walks to the LK door (6.6, 13.6) wait 4 face N and back: 7.2 m = 8 s + 4 = 12 s of a 42 s cycle |
| Gaps | Watches the office through the glass; the corridor only on the feeds | At (13.6, 17) facing N the corridor is clear for 3 s; at (20.6, 17) facing E the office west half is clear | Walking to the LK door his back is to the L-leg |
| Isolation | Alone in CR all cycle (dark mezzanine behind the monitors) | (17.6, 13) facing S: CAM2 sweeps away (TUNE: phase the sweep), CR cannot see the corridor, B6-GM's view blocked by the LK door reveal (TUNE); dark when S1's downlight C4 is off | At the LK door facing N, t 34-38 s, unseen by CAM3 (it faces S) |
| Covered by / covers | Covers the office (eyes) and the corridor (CAM1, CAM2 feeds) | Covered by CAM2 most of his loop | Covers CO west and the L-turn; covered by CAM3 |
| Lures | CRAC trip (he dispatches B6-GM; he stays); a noise in CR's stair | A shot lamp in the office; a noisemaker in LK | CRAC trip (responder); the panel's "beams off" when manned (dispatch) |
| Search | CR and the stair | Office pods; hide: LK lockers | Records; hide: the server room rack ends |
| Relief door (A62) | `B6-relief-cr`: CR's north wall x 18.4..19.6 at 3.6 | `B6-relief-of`: the office's north wall x 21.4..22.6 (under CR) | `B6-relief-co`: CO's west end (x 2, z 12.4..13.6) |

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L6-C1..5 | LED downlights 6500 K along CO | S1 | RE door (CO side) | Breakable. C4 over (17.6, 13). |
| L6-O1..4 | Office LED panels | S2 | Office doors (two) | |
| L6-R1, 2 | Records LED panels | S3 | Records door | |
| L6-K1, 2 | Locker battens | S4 | Locker door | Off at start. |
| L6-V1, 2 | Server room battens; blue rack LEDs | S5; equipment | Server door; none | Rack LEDs below dark 0.28. |
| L6-A | AH bulkhead | own | AH door | |
| L6-P | PIR downlight at the L-turn | own | PIR1 | |
| L6-M | CR monitor glow + desk lamp | equipment; own | none; desk | Lights B6-GD's face. |
| L6-S | LED strip along CR's glass front and the pod partitions | equipment | none | Accent below dark 0.28. |
| L6-E1..3 | Exit signs | none | none | |
Lit chokepoints: (1) CO past CAM2 (S1): darkened by S1, shots, EMP; avoided through the office behind the partitions
(two doors: the loop). (2) The L-leg and mantrap door (CAM3, PIR1): darkened by shots, pistol secondary on CAM3 (V3),
the panel; the beams need the panel or crouch / step. (3) Reception (CAM1): passed in the dark AH route.
Sound: CO and RC vinyl (quiet); office carpet (quiet); server room raised floor (hollow: loud); CR vinyl; the duct
sheet steel (loud at speed).

Sketch:
```
 z24 +--LK lockers--+mgr+==== CR (3.6) SD PN ====+-----------+
     | locker 7     |   | stair  office below     |           |
 z14 |====CO=[LK]=====[OF]=========[OF]===CAM2=[locked]RC CAM1 [A5]
     |L|                  [RE door]                | counter   |
     |-|  (wall)  | RE records: PC CRAC grille<=duct=| AH plant |
     |B|  SV      |                                 | ladder   |
     [MT]RD3/RD4  | servers                          |          |
 z0  +-----[S6 exit keypad]-----+-----------------+-----------+
     x0 x2  x6    x12                            x24        x30
```

R1-R8 check:
| Rule | How B6 meets it |
| --- | --- |
| R1 | Shared: RC -> AH -> duct -> RE -> CO (RC's inner door locked). Operator: CO -> LK -> CO -> OF -> CO -> RD2 -> stair -> CR -> back. Runner: CO -> L-leg -> MT -> SV. Rejoin in SV. No door skips a room: RE opens only from inside (REX), MT only through its readers, SV only through MT. |
| R2 | The duct is AH's only exit; the mantrap and keypad gate the exit; the beams span the 2.0 m L-leg (S3: crouch under the high beam, step over the low one, or the panel). |
| R3 | One split (operator / runner), listed with its reason; corners, duct and vent drop for both. |
| R4 | Rooms 4-14 m; 54% of v1. |
| R5 | 24 explicit objectives (two greyed until V1 / V2). |
| R6 | A6 after S6 (0.4). |
| R7 | CR's glass front, the manager's glazed office, glass pod partitions, LED strips; the shell above the panels dark. |
| R8 | Guards, devices, cards, the mantrap and the code kept; the duct and vent drop moved onto the shared line (both). |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| Supply duct + vent drop | AH's only exit (RC inner door locked) | room graph: remove the duct link, RE unreachable |
| RD1 (REX) | RE's only exit to CO opens from inside | with RE's door locked: CO unreachable |
| L-leg beams | Span the L-leg (S3) | e2e: crossing with the beams on rings the panel (S3) |
| Mantrap RD3 / RD4 / IR1 | The only way into SV | with card-3 / card-4 unset: SV unreachable |
| Egress button | MT's outer door releases for the operator only from SV | without `egress`: SV unreachable for the second player |
| Exit keypad | SV's only exit | with `exit-code` unset: S6 unreachable |

---

## S6 and A6 - quiet connector
An enclosed concrete stair (the bunker's original main stair between the plant and deep levels): 33 risers of 0.182,
going 0.28, one half landing 3.0 m (stairs.ts: as deep as the stair is wide), top landing z -19.76..-17 with S6's top
door (bolted from the B6 side) across it at z -18.3; 3.0 wide with handrails both sides (16.2.4); x 19..22, z -33..-17 (world); no
guard; one bulkhead (4000 K) and an LED handrail strip (accent). At the foot, A6 (medkit). A6's vision panel shows the
kill house's lit windows across the dark cavern (the glimpse). R1: the stair is the only link from SV to A6; R6: A6 is
B6's exit airlock (objective 24).

---
## B7 - The House (guards and takedowns)
| Field | Content |
| --- | --- |
| Real purpose | The rock cavern left from excavating the bunker (sprayed concrete), where Cresset built a two-storey "kill house" (a mock office, glass-fronted inside) for close-quarters drills; a 300 mm water main and the cavern's lighting truss cross it overhead. |
| Size, shape | Cavern 30 x 30, 10 high, dark (900 m2, 51% of v1); the house x 8..22, z 8..20 (14 x 12), ground 0, first floor 3.2, flat roof 6.4 with a 0.9 parapet (T5, kept in T5g: the ledge pull's height) and a roof hatch; a single-storey annex (kitchen) on the south side x 12..18, z 5..8, roof 3.2 (T5g: z 5..8 puts the water main over its south edge). |
| Verticality | Roof, first floor, annex roof, the water main at 4.9, a sprayed-concrete bench on the west cavern wall at 3.0. |
| Colour | 3000 K: warm house windows in a dark cavern; cold LED floods on the cavern walls. |
| New mechanics | Every takedown kind (behind, front, side, corner, over a low obstacle, drop from a pipe, ledge pull, window, inverted from the pipe), tap / hold, elbow strike, grab (walk, sidearm, human shield, knock out, shove), interrogation, carry, drag, hide, bodies found, radio check, dual takedown and Sync, an officer's buff, a heavy (frontal = lethal only), doors (quiet, fast, bash). |
| Guards | 6 (B7-P1, B7-P2, B7-W, B7-R, B7-O, B7-H). |
| Lead / second | P1 / P2. No split (R3): both work the cavern together; the takedown kinds keep their FEATURES roles. |

Elements:
| Id | Element (real reason) | Position (local) | Use |
| --- | --- | --- | --- |
| WM | Water main 300 mm on brackets (the supply to the deep level) | z 5, x 1..29, y 4.9 (T5, kept in T5g: a standing grab from the bench and the annex roof; over the annex roof's south edge, A40) | horizontal pipe: hang, legs up, inverted; drop takedown on B7-W at (4, 5); inverted takedown over the annex roof's south edge |
| WB | Sprayed-concrete bench on the west cavern wall (rock-bolting platform) | x 0..1.5, z 4..24, top 3.0 | lip: hang and shimmy; a fixed plant ladder at z 24 |
| AX | Annex roof (kitchen) | x 12..18, z 5..8, 3.2 | wall jump up (2.7-3.8); the manager's first-floor window above it (sill 4.1) = window takedown |
| PR | Roof parapet; a roof downpipe on the south face (x 20.5, floor to 7.3, A40) | roof edge, 6.4 + 0.9 | hang below it on the south face at (19, 8): ledge pull on B7-R |
| SB | Sandbag walls 1.0 (range leftovers, Cresset's cover props) | x 24..27, z 10..20 | low cover; takedown over a low obstacle |
| KH doors | Front (north, (15, 20)), back (through the annex, (15, 5)), side (east, (22, 17), the lobby; T5g) | - | open quiet / fast / bash; peek |
| Windows | Ground floor: two glazed (north), two open (west); first floor: the manager's (south, over the annex, open), two fixed | - | vault in; window takedown |
| Glass | Inside the house: glass office partitions (kill-house observation walls) | - | sightlines through the house for the players (opaque to guards' sight probes, A26) |
| Hides | Lobby lockers (2), three dark recesses in the cavern wall (west z 27, north-east, south-east), a builder's skip (x 2..5, z 25..28) | - | hide bodies |
| Exit | Secure store door on the cavern's east wall (z 14.4..15.6) with a keypad: A7's near door (A41) | - | the gate (code from B7-O) |

Objectives (R5; order free inside the cavern, the store door last):
| # | Objective | Who | Where | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Open a door quietly, open one fast, bash one | each | KH doors | door quiet / fast / bash |
| 2 | Take down a guard from behind | each | any | takedown:behind |
| 3 | Front or side takedown on a calm guard | either | any | takedown:front / side |
| 4 | Corner takedown from the wall | either | the house's corners | takedown:corner |
| 5 | Takedown over the sandbags | either | SB | takedown:obstacle |
| 6 | Drop on the west rounds guard from the water main | P2 | WM over (4, 5) | takedown:drop |
| 7 | Inverted takedown from the water main | either | WM over the annex roof's south edge | takedown:inverted |
| 8 | Ledge pull the roof watch off the parapet | P1 | PR (19, 8) | takedown:ledge |
| 9 | Window takedown on the officer | P1 | the manager's window | takedown:window |
| 10 | Elbow-strike a guard | either | any | strike |
| 11 | Grab a guard: walk him, draw, hold him as a shield, then knock him out or shove him | either | any | grab (walk, sidearm, shield, knock-out / shove) |
| 12 | Question the officer for the store code | P1 | B7-O | interrogate (V3; now: his desk drawer "Store key") |
| 13 | Carry a body to a hiding place | each | lockers, recesses, skip | carry, hide |
| 14 | Drag a body | each | any | drag (not a drill until loco 27; carry meanwhile) |
| 15 | Dual takedown on the talking pair | both | the pair | dual takedown (Sync when Phase 5 lands) |
| 16 | Open the store door with the code | either | store keypad | flag `store-key` |
| 16a | Shoot out a lamp (restored from v1, D47) | each | L7-F1..3 or L7-P | lamp shot |
| 17 | Both on the airlock pad | both | A7 | airlock |
| - | Whistle to draw a guard (Phase 2) | each | any | not a drill until Phase 2 lands |

Guard sheets:
| Field | B7-P1 / B7-P2 talking pair (grunts) | B7-W west rounds (runner) | B7-R roof watch (grunt) | B7-O officer (officer; knows the code) | B7-H lobby post (heavy) |
| --- | --- | --- | --- | --- | --- |
| Job | Smoke break at the front door, talking | Checks the cavern's west side and the water-main valve | Roof watch over the cavern | Exercise officer in the manager's office | Holds the lobby |
| Route | Static at (13, 22) and (15.5, 22) facing each other, 20 s talk, then together to (13, 26) wait 5 face N and back: 8 m = 9 s + 5 s; cycle 34 s (TUNE: 25-45) | (4, 5) wait 3 face E (valve under WM) -> (4, 14) wait 3 face N -> (7, 14) wait 2 face E -> (7, 5) wait 3 face S -> loop; 24 m at the runner's 1.3 m/s = 19 s + 11 s = 30 s | Roof: (10, 9.5) wait 4 face S -> (19, 9) wait 3 face S (the parapet) -> (19, 14) wait 3 face E -> (10, 14) wait 2 face W -> loop; 27.5 m = 31 s + 12 s = 43 s | Desk (11, 12, y 3.2) wait 14 face N -> window (15, 8.6) wait 6 face S -> back; 10.5 m = 12 s + 20 s = 32 s | Post (15, 18) facing N (the front door); glance every 10 s |
| Gaps | During the 20 s talk both face each other: the north approach is in their peripheral fields only | At (7, 5) facing S the house's west wall is unwatched | Facing E at (19, 14): the west half of the roof edge is unwatched | At the desk facing N: the window behind him | His back is to the back door and the annex |
| Isolation | The walk to (13, 26): together, out of the house's sight, dark | (4, 5) under WM, dark, unseen (the house's west wall blocks the pair), t 0-3 s | (19, 9) at the parapet, dark, t 14-17 s | At the window, t 18-24 s: alone, lit by his desk lamp only from behind | None (a heavy post); taken from behind, by the back door, or avoided |
| Covered by / covers | Cover each other; B7-H covers their backs through the front door | Covered by B7-R when B7-R faces S at (10, 9.5) | Covers B7-W and the annex roof (facing S); covered by nobody | Buffs every guard within his officer radius | Covers the pair through the front door |
| Lures | A noisemaker by the skip pulls one of the pair (the other follows after 3 s); a shot porch lamp | The lamp under WM (L7-W) pulls him to (4, 5) = under the drop spot | A noise on the annex roof | A knock at his door | Noise at the back door |
| Search | The skip, the north-east recess | The west recesses | The roof hatch | The first floor | The ground floor |

Relief door (A62): `B7-relief`, the cavern's south wall at x 21 (all B7 guards).

Sequence (intended; other orders work): from A6's dark vantage the pair reads all six. Together they go high (WB bench
or the AX wall jump): the lead takes B7-R with a ledge pull from the parapet's south face (via the roof downpipe);
the second drops on B7-W from WM and they hide him before the radio check. Both take the pair with a dual takedown
from the dark north side. The lead takes B7-O through the window from AX (or grabs and questions him for the code);
B7-H is taken from behind through the back door or avoided. The code opens the store door -> A7. Bodies: B7-W's loop
finds a body left on the west side; radio check on.
Co-op split: none (v1's "lead upstairs, second holds the cavern" was a choice, not a story need; R3). Lock behind: A7.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L7-F1..3 | LED floods 4000 K on the cavern walls, aimed at the house | K1 | A6 exit | F3 lights the store door. Breakable. |
| L7-W | Bulkhead on a WM bracket column | K1 | A6 exit | The lure lamp. |
| L7-G1..3 | House ground floor LED panels | KH-G | Lobby | Lit windows. |
| L7-U1..2 | First floor panels | KH-1 | Stair top | |
| L7-O | Desk lamp in the manager's office | own | Desk | Back-lights B7-O at the window. |
| L7-P | Porch lamp over the front door | KH-G | Lobby | Breakable; the pair's light. |
| L7-S | LED strips along the house's glass partitions | equipment | none | Accent below dark 0.28. |
| L7-E | Exit sign over the store door | none | none | |
Lit chokepoints: (1) the front door (L7-P): darkened by KH-G, shooting L7-P, EMP; avoided by the back door or a window.
(2) The store door (L7-F3): darkened by K1 (at A6, behind the team), shooting, EMP; a dark approach along the east wall
behind SB. (3) The roof hatch (L7-U2 below): darkened by KH-1 or a shot.
Sound: cavern floor gravel spoil (loud); house floors vinyl (quiet) and the stair timber (louder).

Sketch:
```
 z30 +---------[A6]-----------------+
     |lad skip   pair (13-15.5,22)  |NE rec
 z24 |WB    +----[front door]---+   |
     |bench |  lobby (H)        | SB|
     |(3.0) |  HOUSE 14x12      | SB [store door] -> A7
     |      |  1st: office O    | SB|
 z8  |      +-[annex roof 3.2]--+   |
 z5  |==W======water main 4.9=======|
 z0  +------------------------------+
     x0     x8                 x22  x30
```

R1-R8 check:
| Rule | How B7 meets it |
| --- | --- |
| R1 | A6 -> cavern -> store door -> A7; the cavern is one guarded room holding the routes (floor, bench, roofs, house) that rejoin at the store door. |
| R2 | The store door (code) is the only exit; every takedown objective is ticked at a spot on a guard's loop with a lure that sends him there. |
| R3 | No split; takedown roles kept (FEATURES 5). |
| R4 | 30 x 30 (51%): a guarded cavern round a two-storey house. |
| R5 | 18 explicit objectives (plus the greyed Phase 2 whistle line). |
| R6 | A7 (0.4). |
| R7 | The house's glass partitions and LED strips inside; the cavern rock and sprayed concrete dark. |
| R8 | Six guards, jobs, gaps, isolation spots and lures kept; coordinates rescaled (cycles 30-43 s). |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| Store door + keypad | The cavern's only exit; A7's near door (A41) | with `store-key` unset: A7 unreachable (layered NavGrid flood) |

---

## B8 - The Range (weapons, gadgets, enemy attacks)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's former workshop and vehicle bay, a long vaulted hall, now the indoor range: a firing line, six lanes to 50 m, a shoot-house of barricades, the glazed range control tower and the old crane gantry as a catwalk. |
| Size, shape | 60 x 16, 8 high (960 m2, 48% of v1): 60 m long because the sniper target is at 50 m. Lanes z 0..12; the dark walk z 12..16 under the catwalk. |
| Verticality | Catwalk and tower (4.0) over the dark walk. |
| Colour | 5600 K LED high bays over the lanes; floods in the shoot-house. |
| New mechanics | Weapons (pistol, SMG, rifle, shotgun, sniper), ADS, no hip fire, reload, swap, suppressed vs loud, penetration, headshots, barrels; every gadget; pistol secondary and shock round (V3); throwables (Phase 6); ring airfoil (backlog); enemy attacks: guards shooting, a grenade, a flanker, suppression, a sniper laser, a shield. |
| Guards | 3 (B8-S sniper, B8-E enforcer, B8-F grunt flanker), alerted when "live fire" starts. |
| Lead / second | P2 (catwalk overwatch) / P1 (floor). |

Elements (local):
| Id | Element | Position | Use |
| --- | --- | --- | --- |
| FL | Firing line benches behind a glass screen with firing ports; a glass door in the screen (x 4, z 9.9..11.1) onto the lanes; the screen is a 1.0 kick panel and a head screen 1.6..3.0 with the firing slot between (P1's way to SH) | x 2..4, z 1..11 | weapon drills (both side by side) |
| KL | Kit lockers (the course kit loadout) | x 0..2, z 10..12 | take each weapon class |
| TG | Training dummies on lane stands at 10, 25, 50 m (x 14, 29, 54; lanes 4-5 at 45 m, x 49: the scaffold, T5g) | lanes 1-6 (2 m each) | hits, headshots, reload under time |
| PW | Penetration wall: plywood 0.05 beside block 0.2 | lane 2 at 15 m (x 19) | penetration vs none |
| BR | Two explosive barrels | lane 5 at 30 m (x 34) | frag / shot |
| LG | Lamp gantry with breakable lamps and a fixed camera CAM-R | lane 6 at 20 m (x 24) | shoot lamps; EMP; pistol secondary (V3) |
| SH | Shoot-house barricades: low 1.0 and high 2.0 | x 30..54, z 0..12 | the floor advance; low cover |
| RT | Range control tower cabin, y 4.0, glazed | x 2..8, z 12..16 | sniper drill; circuit switches |
| LD | Fixed ladder to RT (gantry access) | (3, 12) | the lead's way up |
| CW | Catwalk on the crane gantry, y 4.0, glass balustrade 1.1 on its south edge (overwatch over it) | x 8..50, z 13..16 (T5g: ends at CS's head) | overwatch |
| SP | Sniper's scaffold 3.0 at the far end | x 54..57, z 7..10 | B8-S post |
| CS | Catwalk stair at the east end, rising west from its foot (x 58) to the catwalk's end (x 50), caged to 7.0 (its west wall closes the dark walk under the catwalk), its foot door in the cage's south wall (x 58.3..59.5, z 12) bolted from below (T5g: a 4.0 rise needs the 8 m run) | x 50..60, z 12..16 | the gate back to the floor |

Objectives (R5):
| # | Objective | Who | Where | Verb / tick |
| --- | --- | --- | --- | --- |
| 1 | Take your kit from the lockers | each | KL | kit |
| 2 | Aim to draw and fire the pistol (no hip fire) | each | FL, 10 m | draw, pistol hit |
| 3 | Hit the 25 m dummies with the SMG and the rifle | each | FL | SMG hit, rifle hit |
| 4 | Hit the 10 m dummy with the shotgun | each | FL | shotgun hit |
| 5 | Reload, then swap weapons | each | FL | reload, swap |
| 6 | Land a headshot | each | dummies | headshot |
| 7 | Fire suppressed, then loud: watch the noise ring | each | FL | quiet shot, loud shot |
| 8 | Shoot through the plywood wall | each | PW | penetration |
| 9 | Blow the barrels with a shot or a frag | either | BR | barrel |
| 10 | Throw a frag grenade | each | lanes | frag |
| 11 | Gas the dummy group | each | lanes | gas |
| 12 | Throw a flashbang | each | lanes | flashbang |
| 13 | EMP the lamp gantry or its camera | each | LG | EMP |
| 14 | Throw a noisemaker onto a barricade | each | SH | noisemaker |
| 15 | Stick a sticky cam on the shoot-house corner | either | SH | sticky cam |
| 16 | Set a proximity mine at the shoot-house gate | either | SH | mine |
| 17 | Shoot out a gantry lamp | each | LG | lamp shot |
| 18 | Climb to the tower and hit the 50 m dummy with the sniper rifle | P2 | RT | sniper hit |
| 19 | Live fire: cover your partner from the catwalk | P2 | CW | live fire started (B8-S taken or the far end reached) |
| 20 | Advance through the shoot-house to the far end | P1 | SH | reach the far end |
| 21 | Throw the cease-fire switch and unbolt the catwalk stair | P1 | CS foot | switch, bolt gate |
| 22 | Both on the airlock pad | both | A8 | airlock |
| - | Pistol secondary on a lamp and CAM-R (each); shock round on a dummy (each; B8-E: placed) (V3); throw a bottle (each, Phase 6); ring airfoil (each, backlog) | - | - | not drills until they land |

Sequence: weapons and gadget drills on the firing line (both, side by side, 1-17); the lead climbs to RT for the
sniper (18). Then "live fire": the three role-players at the far end are alerted. Split (listed in 0.2): the lead
covers from the catwalk (B8-S first, laser and glint warn); the floor player advances through SH against B8-E (shield:
flank, shock, or a grab is refused frontally) and B8-F (flanks a player who holds cover over 4 s; one grenade at a
time; suppression), throws the cease-fire switch and unbolts CS (20, 21); the lead comes down; rejoin at A8.
Co-op split and gate: CS is bolted from below (A41). The catwalk is a vantage, not an obstacle: a drop from it lands on
the range floor (the floor player's line) and skips nothing the objective list does not still ask for (A43, A60).
Lock behind: A8 (medkit).

Guard sheets (combat role-players; calm at their posts until the live-fire trigger):
| Field | B8-S sniper | B8-E enforcer (shield) | B8-F grunt flanker |
| --- | --- | --- | --- |
| Job | Overwatch the lanes from the scaffold | Holds the shoot-house gate | Patrols the barricades, flanks |
| Post / route | SP (55.5, 8.5, y 3.0), facing W; relocates 5-22 m (archetype) after shots | (52, 6) facing W | (44, 2) wait 4 face W -> (44, 10) wait 4 face W -> loop; 16 m = 18 s + 8 = 26 s |
| Counters | Shot from RT / CW, gas, EMP his platform lamp, flank along the dark walk | Flank, shock (V3), frag, takedown from behind | Takedown, shock, any weapon |
| Isolation | Before live fire: at SP alone (the stealth option: take all three before live fire) | (52, 6) alone, dark if R3 is off | (44, 10), t 9-13 s |

Relief door (A62): `B8-relief`, the south wall at x 45 (all B8 guards).

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L8-R1..5 | LED high bays 5600 K over the lanes | R1 | RT | |
| L8-F1, F2 | Firing line downlights | R2 | RT | |
| L8-H1..3 | Shoot-house floods | R3 | RT and the far end | Breakable. |
| L8-G1..4 | Lamp gantry lamps (targets) | R4 | none (targets) | Breakable; respawn on bay restart, and one re-lamps if a player still owes a lamp shot with all four out (0.2, A61). |
| L8-C | Catwalk LED battens | R5 | RT | |
| L8-S | Sniper platform lamp | R3 | far end | |
| L8-T | LED strip along the FL glass screen and CW's balustrade | equipment | none | Accent below dark 0.28. |
| L8-E | Exit sign over A8 | none | none | |
Lit chokepoint: the shoot-house gate (L8-H): darkened by R3 (RT or the far end), shots, EMP; avoided along the dark walk
(z 12..16, under the catwalk).
Sound: workshop concrete; catwalk grating (loud); the tower vinyl.

Sketch:
```
 z16 +RT[LD]====== catwalk CW (4.0, x 8..50), dark walk below =====[CS stair x 50..58, cage]+
 z12 |KL|----------- lane stands 10 / 25 / 50 m ---------------  |    |
 A7  |FL| lanes 1-6  PW  LG+CAM-R  BR   SH barricades   E  [SP] |    [A8]
 z0  +--+--------------------------------------------------------+----+
     x0 x4          x19 x24      x34 x30......................x54 x58 x60
```

R1-R8 check:
| Rule | How B8 meets it |
| --- | --- |
| R1 | A7 -> firing line -> lanes / SH -> far end -> A8; the lead's line RT -> CW -> CS -> far end; both rejoin at A8. |
| R2 | The shoot-house spans the lane width; the dark walk is its parallel route (two routes, E4); CS's foot door is bolted from below. |
| R3 | One split (overwatch / floor), listed with its reason; every weapon and gadget drill side by side. |
| R4 | 60 x 16 (48%): the 50 m sniper lane sets the length; 16 m wide. |
| R5 | 22 explicit objectives (plus greyed V3 / Phase 6 / backlog lines). |
| R6 | A8 (0.4). |
| R7 | Glass firing-line screen with ports, glazed tower, glass catwalk balustrade, LED strips; the vaulted shell dark above the high bays. |
| R8 | Every v1 drill, guard and the live-fire sequence kept. |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| A8 door at the far end | The range's only exit is past SH or the dark walk at the far end | room graph: A8 joins only the far end |
| CS bolt | The catwalk's stair door opens from below | with the bolt shut: the floor unreachable from CW by the stair (the RT ladder stays, A43) |

---
## B9 - The Plot (finale)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's operations room, where the regional plot was tracked: a two-storey-deep well with the plotting floor and map table at the bottom, glass cabins on balconies at 4.5 and 9.0, the controller's bridge across the north end at 9.0, the pneumatic message-tube system, and the exit lift to the surface. Final exercise: recover the case, turn both keys, extract. |
| Size, shape | 32 x 38, 14 high (1048 m2, 46% of v1): the well x 0..32, z 0..31 (plot floor x 6..26, z 6..28; the dark ring under B-1 round it); balcony B-1 (4.5) 6 m deep on the west, south and east (a 2.5 walkway in front of 3.5 cabins); B-2 (9.0) 5 m deep west and east; the bridge z 28..31 at 9.0; enclosed stairs in the SW and SE corners (x 0..8 / 24..32, z 0..4: 0 -> 4.5 -> 9.0; T5g: 8 m for two 4.7 runs and their landings); the lift lobby x 12..20, z 31..38. |
| Verticality | Three floors; rappel from the bridge, zipline from B-2 east to the lift lobby. |
| Colour | Mixed: 3000 K pendants over the floor, 4000 K balconies, the back-lit map table (cyan), 6500 K lift lobby, red alarm beacons; LED strips along every balcony's glass front. |
| New mechanics | Everything together; split and converge (two keys), Sync (two-key lift), clutch save, downed / revive / drag a downed partner / medkit on a mate (Phase 5), alarm panel and reinforcements, a dog (smell in the dark), a sniper, an enforcer, a heavy, an officer on a manned desk, team results. |
| Guards | 7 (B9-1 heavy, B9-2 handler + B9-D dog, B9-3 sniper, B9-4 enforcer, B9-5 rounds, B9-O controller). |
| Lead / second | P1 / P2 (each takes one key; the case is the lead's). |

Objectives (course framework, `ObjectiveChain` style; R5):
| # | Objective | Who | Where | Notes |
| --- | --- | --- | --- | --- |
| 1a | Find key A in the west cabin | P1 | B-1 west cabin (x 0..3.5, z 14..20, y 4.5), the desk drawer (`wafer`, V2; now: open) | parallel with 1b (split and converge, C15) |
| 1b | Find key B in the east cabin | P2 | B-1 east cabin (x 28.5..32, z 8..14, y 4.5), a locker (`pin`, V2; now: open) | |
| 2 | Recover the case from the controller's cabin | either (the lead carries it) | B-2 east cabin (x 29..32, z 20..26, y 9.0) | an item, no speed cap |
| 2a | Shoot out a lamp (restored from v1, D47) | each | L9-P1..4 or L9-L1..2 | lamp shot |
| 3 | Turn both lift keys together | both | lobby key switches K-A (13.5, 36) and K-B (18.5, 36), 5 m apart | within 1.0 s (TUNE): Sync (C12; now: two switches at once) |
| 4 | Ride the lift out | both | L9 | team results |
| - | Clutch save; drag a downed partner; medkit on a mate (Phase 5) | - | - | not drills until Phase 5 lands |
The rappel from the bridge and the zipline to the lobby are routes here (both players already did both in B3).

Routes (each objective has at least two; all rejoin in the lobby):
- Floor (shadow): the dark ring under B-1 (4.5 clear), between plotting stands, round the map table (low cover,
  glowing: avoid its light).
- High: the stairs or a boost to B-1 (one balustrade gap at the north-west, x 5..6, z 26..28, where the balcony edge is a planned co-op
  lip, 4.5 over the floor, over a pier), along the cabins, up to B-2, the bridge; rappel from the bridge front (11, 28) to the floor's
  north end; the zipline from B-2 east (27.5, 22) to the lift lobby's mezzanine rail, launched onto the lobby floor.
- Loud: straight across the plot floor.
- Secret: the pneumatic tube duct (1.5 x 1.2) from the key A cabin's tube station down inside the west wall and along
  the north wall to an inspection door in the lobby's west wall (12, 34).
- Loop: round the map table; round the B-1 south cabins (two doors each).

Ghost plan (D32, D33; unchanged in logic). B9 can be ghosted (Ghost tier: never seen, nobody touched), but only with
careful planning:
- Overlapping coverage: every crossing on every route is watched by at least two of B9-1, B9-2 / B9-D, B9-3, B9-4, B9-5,
  CAM-P1 and the controller's feeds. Each crossing opens for 3-5 s (TUNE) once per watcher cycle, and only when two
  cycles line up; T7b tunes the routes so each gap exists and lasts at least 3 s.
- Sync moment 1 (the plot floor): the west ring under B-2 west is in the sniper's view and CAM-P1's sweep. It opens
  only while the sniper looks east. One player on B-1 east throws a noisemaker onto the floor's east side on the Sync
  count (Phase 5; until then the players count it themselves with pings) (the sniper and the handler turn to it, B9-1
  glances); the other crosses the west ring in that window. The dog investigates the noise and must not find either.
- Sync moment 2 (the lift lobby): the lobby is lit (P3), on CAM-P2 and held by B9-4. The P3 switch is inside the tube
  duct's inspection door; the zipline lands in the lobby from B-2 east. One player switches P3 off from the duct door on
  the count while the other lands from the zipline in the same second; with P3 out the enforcer's view of the landing
  is dark and the controller sees only a dark feed (no video-loss event). Either alone fails.
- Then the keys (pair gate, within 1.0 s). Silent tier: knock-outs without an alarm; Loud: an alarm.

Devices: CAM-P1 sweep over the floor (under the bridge at (16, 27.8), y 6.0, 135..225); CAM-P2 fixed on the lobby
((16, 31.3), y 3.0, facing N); manned desk on the bridge (B9-O: feeds CAM-P1, CAM-P2); a high beam across the lobby
threshold (z 31, y 1.4); PIR on B-2 west; alarm panel (`MapLayout.alarms`) on B-1's south wall ((16, 0.3) wall mount, y 4.5; A76);
reinforcement point: the staff tunnel door at the floor's south-east ((32, 5), north of the SE stair, `MapLayout.reinforce`, A41); wall medkit
on the floor's north-west.

Guard sheets:
| Field | B9-1 heavy | B9-2 handler + B9-D dog | B9-3 sniper | B9-4 enforcer | B9-5 rounds | B9-O controller (officer) |
| --- | --- | --- | --- | --- | --- | --- |
| Job | Guards the map table | Dog patrol of the floor | Overwatch from B-2 west | Holds the lift lobby | Balcony rounds on B-1 | Runs the exercise from the bridge desk |
| Route | Post (21, 17) beside the map table facing W (the entrance); glances N every 10 s | (10, 10) wait 3 face E -> (20, 10) wait 3 face N -> (20, 14) wait 3 face W -> (10, 14) wait 2 face W -> loop; 28 m at 0.9 m/s (the dog heels) = 31 s + 11 s = 42 s | Post (2.5, 20, y 9.0) facing E over the floor; relocates along B-2 west (5-22 m) after shots | Post (16, 32.5) facing S | Back-and-forth on B-1: (4.75, 12, y 4.5) wait 3 face E -> (4.75, 4.75) wait 3 face E -> (12, 4.75) wait 3 face N -> back the same way; 29 m = 32 s + 12 s = 44 s | Seat on the bridge (16, 29.5, y 9.0) facing S; feeds |
| Isolation | None (post); from behind via the dark ring | The handler at (20, 14) facing W, t 26-29 s (the dog smells a player within its range in the dark) | Alone on B-2 west at all times (the clutch-save target) | None; flank or shock | (12, 4.75) facing N, alone, dark | Alone on the bridge: grab from behind, interrogate (flavour) |
| Covers | The floor centre | The floor | The floor and B-1 east | The lobby | B-1 west and south | Through the feeds |
| Lures | Noise at the stair doors | A noisemaker in the dark ring (the dog investigates first) | EMP or pistol secondary on his lamp; a flashbang from below | Noise at the tube duct door | A shot cabin lamp | CAM trouble (video loss dispatches a guard; he stays) |

Relief doors (A62): `B9-relief`, the ring's east wall at z 18; `B9-relief-lobby`, the lobby's east wall at z 35.5.

Sequence (one of many): the team splits from the A8 vantage (west, floor level, dark ring). Lead: SW stair or the boost
gap to B-1 west -> key A -> up to B-2 west (the sniper: take him, or crouch past behind him) -> along the bridge (grab
B9-O from behind) -> B-2 east, the case -> zipline to the lobby. Second: floor ring east -> SE stair to B-1 east -> key B
-> back down -> the lobby (B9-4: flank, shock, or lights out on P3) -> the beam (crouch under). Both at the keys: Sync
(3-2-1) -> the lift -> results. Failure: a downed partner is revived in place (drag and medkit on a mate: Phase 5); both
down restarts the bay at A8. An alarm brings reinforcements through the staff tunnel; the panel can be disabled (hold).
Co-op split and gate (listed in 0.2): two keys in opposite cabins, turned together; rejoin in the lobby. The lift door
carries the key A, key B and case flags and the K-A / K-B pair gate (A41). Lock behind: the lift (end).

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L9-P1..4 | Pendants 3000 K over the plot floor | P1 | Lighting board in the key A cabin | Breakable. |
| L9-B1..6 | Balcony LED downlights 4000 K | P2 | Lighting board; each stair door | |
| L9-C1..5 | Cabin desk lamps | own each | In each cabin | |
| L9-T | Map table back-light (cyan) | equipment | none (EMP-able, shootable panel) | Lights the floor centre: avoid it. |
| L9-L1..2 | Lift lobby LED downlights 6500 K | P3 | Inside the tube duct's inspection door | Breakable. |
| L9-S | Sniper's balcony lamp | P2 | Lighting board | The sniper's lure. |
| L9-G | LED strips along each balcony's glass front and the bridge | equipment | none | Accent below dark 0.28. |
| L9-A1..4 | Red alarm beacons | alarm | on with the alarm | |
| L9-E | Exit sign over the lift | none | none | |
Lit chokepoints: (1) the lift lobby (P3, CAM-P2, B9-4): darkened by the P3 switch, shots, EMP, pistol secondary on CAM-P2
and the lamps; avoided by the tube duct or the zipline from above. (2) The stair doors on B-1 (P2): darkened at the
lighting board or by shots; avoided by the boost gap or the rappel. (3) The plot floor centre (L9-T): avoided by the
dark ring.
Sound: plot floor lino (quiet); balconies steel grating (loud); stairs concrete; cabins carpet.

Sketch (plan; heights in brackets):
```
 z44         [ L9 lift ]
 z38    +---lobby K-A K-B---+   CAM-P2, beam z31
 z31 +==bridge (9.0) desk O===============+
     |B-2|                          |B-2 east (9.0) case cabin
     |W  |   plot floor (0)         |
     |(9)|   [ map table ] H        | B-1 east cabin: key B (4.5)
     |key A cabin (4.5) dog loop    |
 A8->|  dark ring under B-1         |
     |SW stair                 SE stair
 z0  +====B-1 south (4.5) panel=====+ staff tunnel (reinforce)
     x0  x6                    x26  x32
```

R1-R8 check:
| Rule | How B9 meets it |
| --- | --- |
| R1 | A8 -> the well -> the lobby -> L9; inside the well the routes run in parallel and rejoin in the lobby; the lift door needs both keys, the case and the pair gate. |
| R2 | The lift door is the only exit (four gates ANDed, A41); the keys and the case are in cabins reached only by the balconies. |
| R3 | One split (the two keys), listed with its reason; rejoin in the lobby. |
| R4 | 46% of v1; the well holds three floors and two routes per objective. |
| R5 | 6 explicit objectives (the finale is the combination). |
| R6 | The lift is the end: both inside, the keys turned (no airlock; A24 / A41). |
| R7 | Glass cabins and balcony fronts, LED strips, the back-lit map table; the well's concrete dark. |
| R8 | The ghost plan, guards, devices and the two sync moments kept; coordinates rescaled (cycles 42-44 s). |

Unavoidable elements:
| Element | How it blocks | Nav test |
| --- | --- | --- |
| Lift door (keys, case, pair gate) | The bay's only exit | with any of the four gates unset: L9 unreachable |
| Key cabins | Reached only from B-1 (stairs, boost gap, tube duct) | room graph: each cabin joins only its balcony |

---

## 10. Element register (level-design 16.9)
Every route element. Airlocks, lamps and devices are in their bay tables above with their reasons. v2 glass, steel and
LED fit-out (R7) is one row per bay kind: E-ALL-1..3.
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| E-ALL-1 | Glass partitions, balustrades, observation windows | Cresset's fit-out: supervisors watch every station | Sightlines; flush 2.4 `noLedge` screens close every edge except a move point (1.1 balustrades only where a drop returns to the element's start, and B8's catwalk) | 16.3.1, 16.5.3 |
| E-ALL-2 | LED strips (lips, doors, pads) | Cresset's fit-out: training safety marking | Mark lips and pads; accent below dark 0.28 unless a registered lamp | 16.8.1 |
| E-ALL-3 | Airlock presence pad | Cresset's interlock rewired to a floor pad | R6 gate | 16.3.5 |
| E-B1-1 | Operator lockers (glass fronts) | Personal kit storage in the guardroom | Kit start | 16.4.1 |
| E-B1-2 | Dark store shelving | The decontamination suit store | Light meter, night vision | 16.4.1 |
| E-B1-3 | Gear run floor marks | Cresset's marked drill lane in the guardroom corridor | Gears, stop, quick 180 | 16.4.1 (training props, named) |
| E-B2-1 | Plinth, rail, block wall | Cresset's course obstacles on old cable-drum plinths | Step, vault, mantle | 16.4.1 (training props, named) |
| E-B2-2 | Galleries G1, G2, the deck | The old cable galleries and the cable portal landing | Ladder, pipe, hang, drops | 16.2.6 |
| E-B2-3 | Cable-support pipe across the cut gallery | Trunk-cable support left when the gallery was cut out | Horizontal pipe | 16.0 |
| E-B2-4 | Cast-iron downpipe | Gallery gutter drain (the hall had a leaking roof slab) | Drainpipe | 2.5 (every one of that kind climbable) |
| E-B2-5 | Beam ledge L1, column, portal sill | The crane-rail beam, a structural column, the cable portal through the bay wall | Shimmy, corners, gap jump, climb up | 16.1.3 |
| E-B2-6 | Pit catchers and plant ladders | The cut-out gallery floor; the old drum pit | R2 return to the element's start | 16.2.1 (plant) |
| E-B2-7 | Cable trench with step irons | Original trench, covers lifted | Manual jump | 16.7.1 |
| E-B2-8 | Drop pads | Course landing pads | Landing bands | 16.4.1 |
| E-B2-9 | Window wall | The cable hall's inspection windows | Window vault vs break | 16.3.5 |
| E-B3-1 | Riser casing | Concrete casing of the shaft's cable risers | Split gap | 16.0 |
| E-B3-2 | Ring beam and riser pier | The headframe's ring beam; a riser pier | Wall jump, corner kick | 16.1.3 |
| E-B3-3 | Damper bar | The shaft damper's operating bar | Pipe legs up, inverted, flip drop | 16.0 |
| E-B3-4 | Hoist beam, inspection davit | Lifting points for fan parts | Rappel points (two stages) | 16.0 |
| E-B3-5 | Fan control room + window | The fan's local control room over the chamber | Rope window, isolator | 16.3.1 |
| E-B3-6 | Spoil ropeway cable | Construction-era spoil ropeway, re-tensioned by Cresset | Zipline | 16.0 |
| E-B3-7 | Fan guard fence | Mesh guard round the fan pit | Fence | 16.4.1 |
| E-B3-8 | Twin discharge ducts, grilles, louvres | The fan's twin discharge legs into the plant passage | Duct crawl, unscrew / kick | 16.3.4, 16.7.1 (SPEC E6) |
| E-B3-9 | Catch nets and net ladders; rope foot | Working-at-height nets; the davit's landing | R2 catchers | 16.2.1 |
| E-B3-10 | Davit bridge DB and davit head DH | Access from the mid landing to the inspection davit | RP2's only way on | 16.0 |
| E-B3-11 | Floor hatch ML / RF (opens from below only) | Plant access hatch to the rope foot | RP2 retry (RF -> ML), never a way on | 16.2.1 (plant) |
| E-B3-12 | Return turnstiles W5, NR, ML gate | Cresset's training retry gates (A61) | One-way returns to an element's start | 16.3.5 |
| E-B4-1 | Cell walls 4.4 / 4.25 | Reservoir cell walls | Co-op lips (boost, human ladder) | 11.3 (A35) |
| E-B4-2 | Inspection door, bolted downstream | Cell access for cleaning | One-side gate | 16.3.5 |
| E-B4-3 | Sluice gate + handwheel | Cell isolation sluice | Timed hold | 16.3.1 |
| E-B4-4 | Valve gallery + C3 ladder (C1, C2 ladders padlocked) | Reservoir valve gallery; Cresset's drill padlocks | Circulation; the drill | 16.2.1 |
| E-B4-5 | Overflow channel, float shaft, sump (Phase 5 bay), outlet platform | Reservoir overflow, float valve, sump and outlet | Team-move drills | 16.7.1 |
| E-B5-1 | Gensets | Standby diesel sets | Cover; roofs: high route | 16.4.1 |
| E-B5-2 | Cable trench + gratings | Power cable trench | Loud floor; secret route | 16.7.1, 16.7.3 |
| E-B5-3 | Cable gallery + ladder | Cable trays along the wall | High route | 16.2.1 (plant) |
| E-B5-4 | Mains breaker | Main incomer breaker | Lights out; mag lock gate | 16.8.1 |
| E-B5-5 | A5 mag-locked fire door | Fail-safe fire door on a mag lock | Gate | 16.3.5 |
| E-B5-6 | Day tank, fuel bay | Generator fuel | Cover, PIR | 16.4.1 |
| E-B5-7 | Entry landing and stair | Plant-room access stair | Vantage; the bay's way in | 16.2.4 |
| E-B6-1 | Counter, glass pod partitions, desks | Reception and office furniture | Low cover | 16.4.4 |
| E-B6-2 | Air-handling room, plant ladder, supply duct + records grille | The office's air supply from the plant | Duct crawl, vent drop (SPEC E6) | 16.3.4, 16.2.1 |
| E-B6-3 | Enclosed stair to CR behind RD2 | Control room access on a card | Circulation, card gate | 16.2.1 |
| E-B6-4 | Mantrap, iris, egress button | Secure-zone entry; request-to-exit inside | Security gate | 16.3.5 |
| E-B6-5 | Lockers, records PC, CRAC, keypad, REX button | Staff lockers, records, cooling, server PIN, records exit | Lockpick, hack, fault, code | 16.3.1 |
| E-S6-1 | Stair 6 | The bunker's main stair to the deep level | Quiet connector | 16.2.4 |
| E-B7-1 | Kill house (glass partitions inside) | Cresset's training building | Takedown spaces | 16.0 |
| E-B7-2 | Water main | Supply to the deep level | Pipe, drop and inverted takedowns | 16.0 |
| E-B7-3 | Rock-bolting bench + plant ladder | Cavern rock-bolting platform | Lip, shimmy | 16.2.1 |
| E-B7-4 | Annex roof, parapet, roof hatch, roof downpipe | Kitchen annex; roof edge; roof access; rainwater | Wall jump, ledge pull, window takedown | 16.2.5 (hatch), 16.5.3 |
| E-B7-5 | Sandbags, skip, recesses | Range leftovers; spoil skip; excavation niches | Cover, hides | 16.4.1 |
| E-B7-6 | Secure store door + keypad | Cresset's ammunition store | Gate | 16.3.5 |
| E-B8-1 | Benches, glass screen, stands, dummies, barrels, lamp gantry | Range equipment | Weapon drills | 16.4.1 |
| E-B8-2 | Barricades | Shoot-house props | Cover | 16.4.4 |
| E-B8-3 | Catwalk (crane gantry), tower, ladder, stair | Workshop crane gantry; range control | Overwatch, gate | 16.2.1 |
| E-B8-4 | Sniper scaffold | Target-change scaffold at the 50 m line | Sniper post | 16.4.1 |
| E-B9-1 | Balconies, cabins, bridge, stairs | Operations room design | High route | 16.2.4 |
| E-B9-2 | Map table, plotting stands | Plotting floor equipment | Low cover, light source | 16.4.4 |
| E-B9-3 | Pneumatic tube duct + inspection door | Message-tube system | Secret route | 16.7.1 |
| E-B9-4 | Rope point on the bridge rail, zipline cable | Cresset's exercise rigging (fixed eye bolts, a cable to the lobby rail) | Rappel, zipline | 16.0 (training rig) |
| E-B9-5 | Key switches, lift | Two-person rule key switches on the surface lift | Sync gate, extract | 16.3.5 |

## 11. Beat chart
| Space | Tension 1-5 | Taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| B1 Muster | 1 | Stances, gears, meter, holster, elbow | - | A1 | Kit up, settle in |
| A1 | 1 | The automatic airlock | - | - | First regroup |
| B2 Lanes | 2 | Ground and climbing verbs, one lane | Momentum chains | A2 | Follow my lead, then yours |
| A2 | 1 | - | - | - | - |
| B3 Intake | 3 | Split, wall jump, bar, two ropes, zipline, fence, ducts | Climbing | A3 | Vertigo, then a quiet crawl |
| A3 | 1 | - | - | - | - |
| B4 Cistern | 2 | Team moves | Climbing + team | A4 (medkit) | Puzzle-like teamwork |
| A4 | 1 | - | - | - | - |
| B5 Standby Plant | 3 | Light, sound, first guards | Movement + light | A5 | First real stealth |
| A5 | 1 | - | - | - | - |
| B6 Mock Site | 4 | Corners, duct, security, tools | Light + guards + tools | S6 stair | Heist |
| S6 / A6 | 1 | - | - | glimpse of the house | Breathe |
| B7 House | 4 | Takedowns, bodies, interrogation | Everything stealth | A7 | Predator |
| A7 | 1 | - | - | - | - |
| B8 Range | 4 | Weapons, gadgets, combat | Loud play | A8 (medkit) | Noise and release |
| A8 | 1 | - | - | - | - |
| B9 Plot | 5 | Sync, split and converge, revive | Everything | The lift | Finale |
Tension rises overall (1, 2, 3, 2, 3, 4, 4, 4, 5) with a release (an airlock) after every bay. First run 45-60 minutes
(D34). The smaller rooms shorten walking; B2 and B3 lengthen a little (both players run every element, one at a time).

## 12. Tool / problem matrix
| Problem | Tools (at least three each) |
| --- | --- |
| Lit post (B5-G2, B9-4) | Darkness route, circuit switch, shoot the lamp, EMP, pistol secondary (V3), lure, takedown from behind |
| Talking pair (B7-P1/P2) | Dual takedown / Sync, noisemaker lure, gas, avoid by the back door |
| Patrol over a crossing (B5-G1, B6-GR) | Timing gaps, lights out, the trench, high route, takedown at the isolation spot |
| Locked route (every gate) | Partner action, card / clone / iris, lockpick, hack, code from a feed or interrogation |
| Loud floor (grating, chequer plate, gravel) | Silent gears, the parallel quiet floor, masking (Phase 2), hang-drop instead of a jump |
| Camera (B6, B9) | Darkness, sweep timing, loop / off at the panel, shoot, EMP, pistol secondary, take the operator |
| Beam (B6, B9) | Crouch under (high), step over (low), panel beams off |
| Mantrap / iris (B6) | Grab the enrolled guard, card clone, the egress button from inside |
| Heavy (B7-H, B9-1) | From behind, avoid, shocker, gas |
| Shield (B8-E, B9-4) | Flank, shocker, frag, takedown from behind |
| Sniper (B8-S, B9-3) | Counter-snipe, EMP or shoot his lamp, approach unseen from behind, flashbang |
| Dog (B9-D) | Gas, noisemaker, takedown, keep moving (smell rate), avoid its loop |
| Alarm (B9 panel) | Take the runner, disable the panel (hold), hide and wait out the search |

## 13. Metrics check (constants re-confirmed by grep on 2026-10-13; the build re-greps)
| Element | Value | Window | Source |
| --- | --- | --- | --- |
| B2 step / vault / mantle | 0.5 / 1.1 / 1.7 | 0.65 / 1.25 / 1.8 | `pickTraversal` (player/movement.ts) |
| B2 G2 hang-drop | feet drop 2.1 | soft 0.6-2.5 | `LANDING` movement.ts:204 |
| B2 drop pads | 2.0 / 3.2 / 5.0 | soft < 2.5, roll <= 4.5, heavy > 4.5 | `LANDING` |
| B2 gap jump | 2.2 | <= 2.5 | `findJumpTarget` |
| B2 portal sill depth | 0.45 | >= 0.38 to climb up | `LEDGE.climbDepth` anchors.ts:194 |
| B2 gallery lips 4.0, 4.5 | reached by ladder / downpipe | lips >= 1.9 | `LEDGE.minDrop` anchors.ts:190 |
| B2 trench | 1.2 wide, 2.0 deep | jump apex 0.8; far edge `noLedge` | `LEAP` |
| B3 split gap | 1.6 wide, 4.6 m faces | 1.2-1.95, >= 3.6 | `SPLIT` movement.ts:255 |
| B3 wall jumps | 3.4 (WJ1), 3.2 (WJ2 corner) | 2.7-3.8 | `WALL_JUMP` movement.ts:283 |
| B3 ropes | RP1 7.0 m, RP2 9.1 m | unhook at 2.0 | `RAPPEL.unhookHeight` |
| B3 RP1 sideways | beam x 4.8 -> body x 6.3 on ML (edge x 6.0) | 1.5 | `RAPPEL.lateralMax` |
| B3 rope hooks | HS / DH: feet behind the face, 0.4 / 0.3 from the top | 0.9 reach, 0.2 past the face | `RAPPEL_REACH`, `nearestInReach` |
| B3 fence | 2.4 | `FENCE.reach` 0.85 to grab | movement.ts:345 |
| B3 nets | NT1 (19.0): feet drop 2.2 from the bar; NT2 (2.0): feet drop 1.8-4.1 along the cable; NR (8.8): 4.8 from RP1's bottom-out or ML's west gate | soft < 2.5 (NT2's east end in the roll band; NR in the heavy band, > 4.5: ~0.7 s recovery: `playerController.ts` landT = min(0.7, 0.15 + (v - 3) * 0.08), floored at `LANDING.heavyRecovery` 0.6; at gravity 18 a free fall of 4.5 m or more lands at >= 12.7 m/s, so 0.7; no damage on any) | `LANDING` |
| B4, B9 co-op lips | 4.4, 4.5; W2 4.25 | 4.3-4.5 (W2: A35) | level-design 11.3; movement.ts:286, 393 |
| B5 genset roofs | 3.0 | wall jump 2.7-3.8 | `WALL_JUMP` |
| B6, B9 beams | 1.4 high, 0.35 low, 1.2 apart | SN40, SN41, SN43 | S0 section 5 |
| B6 PIR | 3.2 mount | SN50 6 m range | S0 |
| B7 annex roof | 3.2 | wall jump | `WALL_JUMP` |
| B7 water main | 4.6 | drop takedown 1.2-5 m below | `game/takedown.ts` drop |
| Ducts | 1.5 x 1.2 (B5 trench, B9 tube); engine duct anchors 1.2 x 1.0 (B3, B6) | crouch duct 1.5 x 1.2 (F32) | 16.7.3, SPEC E6 |
| Airlock pad | 4 x 4, inset 1.0 | `AIRLOCK_PAD_INSET` 1.0, `AIRLOCK_SIZE` 6 | config/course.ts |
| Passing width | >= 1.8 where both walk one line | two body capsules (D49, A50) | net/partnerBlocker.ts |
| Guard cycles | 26-44 s (B8-F 26, B7-W 30, B7-O 32, B7-P 34, B5-G1 38, B6-GR 39, B9 42-44) | 25-45 s | level-design 4.3 |
| Squads alive | at most 7 at once (B9) | `MAX_ALIVE` 12, `SQUAD_CAP` 9 | enemyManager.ts:25, infiltrationMode.ts:14 |

## 14. Self-critique (the weakest points, with fixes)
| # | Weak point | Fix |
| --- | --- | --- |
| 1 | B2 and B3 run every element one at a time: the second player waits on every single-file element | Waiting spots face the element through glass (watch and ping); the lead swaps at each airlock; T9 times both bays (target 5 min each) |
| 2 | B2's drops and window wall need a climb back (three drops, two window crossings) | The pit ladder and the open window are the way back; LANTERN names it ("Once quiet, once loud") |
| 3 | B3's rappel needs two stages so unhook and the window kick are both on the line | The davit stage is short (6 m); RF and the nets return a miss to the stage's start |
| 4 | A boost (lips to 4.5) can replace a ladder or a platform climb at a move point | Geometry holds it (0.2, A51): lips that could be skipped by a boost are over 4.5, screened 2.4 or caged; the wall-jump lips and B4 W2 cannot be closed and are a question for Michael (REVIEW-NOTES); the drill tick backs them |
| 5 | B4's padlocked ladders are a training rule, not architecture | Accepted under SPEC E7: the padlocks are visible and tagged |
| 6 | B5's breaker gate leans on Phase 1's guard reset, not built | Now form uses `lightsOut`; the mag lock gate works either way |
| 7 | B6 is dense: three guards, nine devices, a duct and the split | Every device has a now form; the duct start is shared and short; the split halves each player's load |
| 8 | B7's takedown kinds depend on guards walking into their spots | Each spot is on a guard's loop with a lure; the e2e places guards at the spots |
| 9 | B8's live fire may end in a firefight the players lose | Role-players aim like Rookie; the ghost option (take all three before live fire) exists |
| 10 | Coordinates are proposals; fitting B2's portal gap and B3's stacked landings is tight | The build session fits them within +-1 m inside the windows (13) and re-runs the metrics check; changes go in LOG.md |

## 15. Playtest checklist (Michael's PC sessions and the e2e)
- Can either player skip any element (walk round, over, past, through glass, by a boost) in B1-B4? (R1, R2)
- Did a fall ever put a player past the element it fell from? (R2)
- Did both players run every movement element? (R3)
- Did a partner ever block the other on a line with no way round? (D49)
- Is the objective list on both screens from spawn, every line explicit, every tick right? (R5)
- Did every airlock wait for both on the pad, then seal, cycle and open with no button? (R6)
- Do the rooms look like an expensive modern fit-out in a dark 1950s shell? (R7)
- Can a first-time pair read every patrol from each guarded bay's vantage within one cycle?
- Is any route strictly best in B5-B9? Is there a detection the players cannot escape?
- Did any split leave one player idle for more than 60 s?
- Did a remote pose ever look wrong (the partner's view) in any bay?
- Total time 45-60 minutes for a first run (D34)?
