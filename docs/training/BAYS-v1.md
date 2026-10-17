# Fallow training bunker - bays

> **Superseded (T5c, 2026-10-14).** This is BAYS v1, kept for history. BAYS.md (v2) is the build contract: same nine
> bays, drills and story, new layouts under SPEC "Course rules" R1-R8. Line ranges in T6-T10 step files point here;
> find the same section in v2 by its heading.

The course, bay by bay: the build contract for the map sessions (PLAN.md). Read with SPEC.md (rules, exceptions) and
FEATURES.md (which verb is taught where). Every number marked (TUNE) is a proposal the build session checks against the
code with grep and adjusts inside the stated window; every other number is a constant or a dimension.

## 0. Conventions

**Frames.** World: x east, z north, y up, metres; yaw 0 faces +z. Each bay has a local frame: origin at its south-west
corner on its own floor; local (x, z, y). World = local + the offset below. Sketches are top-down, north up, about 2 m a
character; they show order and adjacency, the tables give the numbers.

**Levels.** The course descends into the hill: Upper (y 16), Plant (y 6), Deep (y 0). Nothing is below y -1.5 except
the B5 cable trench floor (y 4.5) and the B2 drop pit (y 15.5), both above the nav sampler's y -2 (SPEC engine Q1).
Nothing is built under another bay in plan: nav columns stack only inside a bay (shaft, kill house, atrium).

| Id | Name | Offset (x, z) | Floor y | Size x by z | Clear height |
| --- | --- | --- | --- | --- | --- |
| B1 | Muster (kit room) | 0, 72 | 16 | 24 x 24 | 3.2 |
| A1 | Airlock 1 | 24, 81 | 16 | 6 x 6 | 3.0 |
| B2 | The Lanes (movement) | 30, 66 | 16 | 48 x 36 | 12 |
| A2 | Airlock 2 | 78, 81 | 16 | 6 x 6 | 3.0 |
| B3 | The Intake (CT shaft) | 84, 74 | 6 | 18 x 18 | 24 (shaft to y 30) |
| A3 | Airlock 3 | 90, 68 | 6 | 6 x 6 | 3.0 |
| B4 | The Cistern (co-op climbing) | 82, 30 | 6 | 36 x 38 | 9 |
| A4 | Airlock 4 (medkit) | 97, 24 | 6 | 6 x 6 | 3.0 |
| B5 | Standby Plant (light and sound) | 70, -8 | 6 | 48 x 32 | 9 |
| A5 | Airlock 5 | 64, 5 | 6 | 6 x 6 | 3.0 |
| B6 | Mock Site (corners and security) | 22, -8 | 6 | 42 x 32 | 7 (mezzanine 3.6) |
| S6 | Stair 6 (quiet connector) | 6, -10 | 6 to 0 | 16 x 3 | enclosed |
| A6 | Airlock 6 (medkit) | 0, -10 | 0 | 6 x 6 | 3.0 |
| B7 | The House (guards and takedowns) | 0, -50 | 0 | 44 x 40 | 10 |
| A7 | Airlock 7 | 44, -33 | 0 | 6 x 6 | 3.0 |
| B8 | The Range (weapons and gadgets) | 50, -46 | 0 | 62 x 32 | 8 (catwalk 4.0) |
| A8 | Airlock 8 (medkit) | 112, -33 | 0 | 6 x 6 | 3.0 |
| B9 | The Plot (finale) | 118, -56 | 0 | 44 x 52 | 14 (balconies 4.5, 9.0) |
| L9 | Exit lift | 136, -4 | 0 | 8 x 6 | shaft to the surface |

**Whole course, top-down** (1 char about 8 m):
```
 z 100 |    [B1]==A1==[  B2 Lanes   ]==A2==[B3]        Upper y16 (B3 shaft drops to y6)
       |                                     ||A3
 z 50  |                                   [ B4 ]       Plant y6
       |                                     ||A4
 z 0   |        S6==[ B6 Mock Site ]==A5==[ B5  ]       Plant y6
       |       A6
 z -30 |   [ B7 House ]==A7==[ B8 Range  ]==A8==[B9]    Deep y0, L9 lift north of B9
       +-------------------------------------------------- x 0 .. 162
```

**Roles (DECISIONS C3).** P1 = host, P2 = client. Each bay names a lead and a second; they swap at every airlock (B1
lead P1, B2 lead P2, B3 lead P1, ...). Where a bay splits verbs, the other player gets them later (FEATURES.md "who").

**Drills (D30).** Every verb a bay teaches is a mandatory drill, ticked per player on the HUD checklist (both players'
columns). The bay's exit airlock refuses to cycle until every drill is done by the players it names ("Waiting: P2 -
ledge shimmy"). Guidance is a full tutorial (D18): each drill's text step and a marker on its device or move (markers
can be hidden, D19).

**Failure (DECISIONS D4, D11).** Guards are Cresset role-players with marking rounds: real AI, real damage, takedowns
knock out. A downed player is revived (existing revive, 2.5 s). Both down: the bay restarts at its entry airlock with
the bay's squad respawned (course framework, PLAN T1). No fall damage exists (`LANDING`, player/movement.ts:204): a fall
costs time and noise only, so every bay with a fall line has a plant ladder back up.

**Airlock (every A1-A8).** Real reason: the 1950s bunker's gas-tight decontamination airlocks, two interlocked blast
doors per zone change; Cresset rewired each interlock to want both trainees' badges inside ("nobody goes on alone").
6 x 6 x 3.0; doors 1.2 x 2.1 steel, swinging into the chamber; a vision panel in the far door (the glimpse of the next
bay, level-design 3.8); a red / amber / green lamp over each door; a "Cycle" button; a bench; a wall medkit in A4, A6,
A8 (bible 7: every second space). Rule (course framework): both players inside (host test: both `PlayerRef` feet inside
the room, |y - floor| < 1.0, neither downed) shows "Cycle" to both; either presses; the near door shuts and locks for good;
4 s cycle (TUNE) with the amber lamp and a hiss; the far door unlocks and opens; the checkpoint is set. Refusals: "Wait
for your partner" (one inside), "Revive first" (a player downed). Lighting: one 4000 K bulkhead (on) and the door lamps;
no switch (emergency circuit). No guard route ever enters an airlock (its doors are locked to guards).

---

## B1 - Muster (kit room)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's guardroom and decontamination suite at the foot of the entrance lift; Cresset's kit room and briefing room. |
| Size, shape | 24 x 24, low concrete rooms off one corridor, 3.2 clear. Warm and small after the lift: the course starts close. |
| Verticality | None (one floor). |
| Colour | 2700 K tungsten pendants; the corridor 3000 K bulkheads. |
| New mechanics | Holster / draw, stances, speed gears, instant stop, quick 180, light meter, night vision, pings, elbow strike on a pad. |
| Guards | None. |
| Lead / second | P1 / P2. |

Rooms (local):
| Room | Box (x0..x1, z0..z1) | Contents |
| --- | --- | --- |
| Lift lobby | 0..6, 8..16 | Insertion: spawns (2, 12) and (4, 12) facing east; the surface lift (closed: the way in). |
| Kit room | 6..18, 14..24 | Two operator lockers on the north wall (name plates from the lobby's operators), bench 0.45 high (x 9..15, z 18..18.5), weapon rack (east wall), padded strike post (elbow strike target, a `TrainingDummy`, SPEC engine Q4). Rubber floor (quiet). |
| Briefing room | 6..18, 0..10 | Map table 0.9 high (x 9..15, z 3..7), screen on the south wall; glass wall to the corridor. |
| Dark store | 18..24, 14..24 | Shelving 2.0 high along the walls; chequer plate floor (loud); its bulkhead off at start, switch inside its door. |
| Corridor ("gear run") | 6..24, 10.8..13.2 | 2.4 wide, 18 m straight, floor marks every 3 m; the A1 door on the east wall at z 11.4..12.6. |

Sequence (both players unless named): open own locker ("Open locker", a switch per player: course framework marks that
player kitted) -> aim at the briefing screen to draw, release to holster (step 09) -> elbow strike the pad (step 10) ->
the gear run: LANTERN asks for gears 1-6, a stop on a mark, a quick 180 at the end (step 22), crouch run back -> the
store: lead stands inside in the dark, second switches the store light on and off from the door; the lead watches the
meter jump; then swap -> night vision on in the dark store -> each sends a ping at the A1 door -> both into A1.

Co-op split: "lights for each other" (above). Gate: A1 (both inside). Lock behind: A1's near door.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L1-1..4 | Pendants 2700 K | K1 | Corridor side of the kit room door | Kit room lit pool (meter "lit"). |
| L1-5, 6 | Troffers 3000 K | K2 | Briefing door | |
| L1-7 | Bulkhead | K3 | Inside the store door | Off at start: the dark pocket. |
| L1-8, 9 | Bulkheads 3000 K | K4 | Lift lobby | Corridor. |
| L1-10 | Exit sign over A1 | none (maintained emergency) | none: battery-backed, real | Glow below `LIGHT` dark 0.28 (build checks). |
Lit chokepoint: the A1 door (L1-9). Darkened by K4 or by shooting L1-9 (breakable); a guard-free bay needs no avoid route.

Sketch:
```
 z24 +-----------+-----------+-----+
     | lift      | KIT ROOM  |STORE|
     | lobby     | lockers   |dark |
     | (spawns)  |  bench    |     |
 z13 |      =====corridor (gear run)====[A1]
 z10 +-----------+-----------+     |
                 | BRIEFING  |     |
                 | map table |     |
 z0              +-----------+-----+
     x0          x6          x18   x24
```

---

## B2 - The Lanes (movement)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's cable hall, where the trunk cables entered and were distributed, stripped out; Cresset built two parallel obstacle lanes in it, either side of the old glazed supervisor's walkway. |
| Size, shape | 48 x 36, a tall hall (12 m); Lane N (z 21..36) and Lane S (z 0..15) either side of the walkway (z 15..21), glass walls on z 15 and z 21 (toughened, see-through, never breaks). |
| Verticality | Galleries and ledges at 4.0-4.5 in each lane; a drop pit to -0.5 (y 15.5). |
| Colour | 5000 K high bays over the lanes; the walkway dark. |
| New mechanics | Every ground and climbing verb, in each lane: step, vault, mantle, ladder, drainpipe, horizontal pipe, lower into a hang, shimmy, outside corner, gap jump, climb up, hang-drop vs jump down, landing bands, manual jump, forward roll, momentum carry, open and glazed windows, stop and quick 180. |
| Guards | None. |
| Lead / second | P2 / P1. The lead takes Lane N, the second Lane S; each lane holds every verb (different elements, different order). |

Lane N, west to east (Lane S mirrors it on the south wall with its own elements; x within +-1 m (TUNE)):
| # | x | Element (real reason) | Verb | Check |
| --- | --- | --- | --- | --- |
| 1 | 3 | Concrete plinth 0.5 (old cable-drum stand) | step | <= 0.65 (`pickTraversal`) |
| 2 | 6 | Steel rail 1.1 high, 0.3 thick (course obstacle) | vault | <= 1.25, thin |
| 3 | 9..11 | Block wall 1.7 high, 2 deep, z 24..33 (course obstacle) | mantle, drop 1.7 off the far side | <= 1.8 |
| 4 | 13 | Fixed ladder to gallery G1 (old cable gallery access) | ladder (Lane S: drainpipe, a cast-iron downpipe from the gallery gutter) | ladder 4.0 |
| 5 | 13..17, 17..21 | Gallery G1 (y 4.0, 1.5 deep on the wall), then a gap where the gallery was cut out, spanned by a cable-support pipe at y 6.5 | horizontal pipe, hand over hand (legs up optional) | hang height = pipe - 1.9 over the gallery gap's floor |
| 6 | 21..23 | Gallery G2 (y 4.0); at its east end | lower into a hang (hold drop / "Hang"), hang-drop to the floor (feet drop 2.1: soft, quiet) beside a jump-down (4.0: roll band, louder) | `LANDING` soft 0.6-2.5, roll 2.5-4.5 |
| 7 | 24 | Full-height cross wall with the lane door: LOCKED at start (the lane gate) | gate: opened by the lever in the other lane at its x 22 | full height (no wall-jump bypass) |
| 8 | 26..30 | Trench 1.2 wide, 1.5 deep (old cable trench, covers lifted), sprint strip | manual jump across; forward roll after it (crouch tap at gear >= 5) | `LEAP` apex 0.8, carry |
| 9 | 31 | Cast-iron downpipe to a beam ledge L1 at 4.5 (Lane S: ladder) | drainpipe up, lip at the top | `pipeLip` within 0.8 up, 1.0 across |
| 10 | 31..36 | Beam ledge L1 (0.25 deep: hang only), round a square column at 36 (two outside corners) | shimmy, outside corner | `canHang`, `canClimbUp` false |
| 11 | 36..39 | Gap 2.2 to ledge L2 (0.4 deep) | gap jump, climb up onto platform P (x 38..42, y 4.5, 4 deep) | `findJumpTarget` <= 2.5; `LEDGE.climbDepth` 0.38 |
| 12 | 42 | P's east edge over three pads: drops of 2.0, 3.2 and 5.0 m (pads at y 2.5 and 1.3, a pit floor at -0.5) | landing bands soft, roll, heavy (heavy: recovery and noise) | soft < 2.5, roll <= 4.5, heavy > 4.5 |
| 13 | 44 | Full-height cross wall with an open window and a glazed window side by side, sill 0.9 (the old cable hall's inspection windows) | window vault quiet vs breaking glass loud | window anchor reach |
| 14 | 46..48 | Floor marks: "stop on the line", "turn" | stop hold, quick 180 (step 22) | - |
| 15 | 46 | Door into the walkway's east end | - | - |
Momentum carry (step 26): Lane S puts items 2 and 3 in a straight run (a sprint vault into a mantle) and Lane N items 8-9
(a sprint jump into a pipe grab); both lanes run both chains in their own order.

Co-op split and gate: each lane's door at x 24 is locked; its lever is in the other lane at x 22, beside the glass, after
that lane's first half. Each player must finish their first half to let the other on. The walkway (glass both sides) lets
them watch and ping each other. Timed holds are allowed here (no guards, DECISIONS C8) but not used.
Lock behind: A2. Return path: none needed; a fall from any gallery lands on the lane floor and the lane's ladder or
downpipe climbs back.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L2-N1..4, L2-S1..4 | High bays 5000 K | N1 (x 0..24), N2 (x 24..48), S1, S2 | At each lane door and at the x 24 doors | The lanes are lit work areas. |
| L2-W1, W2 | Downlights 3000 K | W | A1 side of the walkway | Walkway dark at start (off). |
| L2-G1..3 | Gallery bulkheads (breakable) | G | Lane doors | Over the galleries. |
| L2-E | Exit sign over A2 | none | none: maintained emergency | |
Lit chokepoints: each x 24 lane door and the A2 door: darkened by their circuit switch or by shooting the fixture.
Sound: lanes concrete; galleries steel grating (loud); walkway carpet tile (quiet): a loud and a quiet floor side by side.

Sketch (Lane N; Lane S mirrored):
```
 z36 +-[lad]==G1==~pipe~==G2-+ |  [pipe]==L1==[col]  L2==P==pads | |
     |  step vault  MANTLE    |#|  trench   roll      drops 2/3.2/5| W|  stop / 180
 z21 +=====glass=========lever=+=+====glass=========================+=+====
     |   walkway (dark, carpet)        doors to each lane          ->[A2]
 z15 +=====glass=========lever=+=+====glass=========================+=+====
     |  Lane S: same verbs, own order and elements                  | W|
 z0  +-----------------------------------------------------------------+
     x0                       x24                                 x44 x48
```

---

## B3 - The Intake (CT shaft)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's main air intake shaft from the hilltop down to the plant level's fan chamber, with maintenance galleries, concrete cable-riser casings, a hoist beam (for lowering fan parts), and the spoil ropeway cable left from construction, which Cresset re-tensioned as a training zipline. Catch nets under the move points (standard working-at-height practice). |
| Size, shape | 18 x 18 square (2 m chamfered corners), 24 m deep from the headframe; galleries at local 10 (G1, entry), 14 (G2), 17.4 (G3); the fan chamber floor at 0, the fan control room outside the east wall. |
| Verticality | The tallest space in the course: up from G1 to G3 by split and wall jump, then down to the floor by rope. |
| Colour | 2000 K sodium bulkheads, amber; the fan chamber floods. |
| New mechanics | Split jump (into, jump up out of it), wall jump (straight and inside corner), horizontal pipe legs up, inverted and the flip drop, rappel (speeds, kick out, sideways, kick through a window, unhook), zipline, fence (climb, shimmy, rattle, flip over), duct crawl, wall vent unscrew vs kick. |
| Guards | None. |
| Lead / second | P1 / P2. |

Elements (local):
| Id | Element | Where | Verb | Check |
| --- | --- | --- | --- | --- |
| G1 | Gallery 2.5 deep, west and north walls | y 10 | entry from A2 (west wall, z 7..13) | guard rail 1.1 except at move points |
| RC | Concrete cable-riser casing 1.2 deep, x 6..12, standing 1.6 m off the north wall, 4.3 m tall above G1 | G1 north arm | split jump (double tap); from the split, jump up to the casing top | gap 1.2-1.95, both faces >= 3.6 (`SPLIT`); casing top 4.3 above G1 (T0: `findJumpTarget` from a split accepts a lip 3.95-4.75 above the split floor); the grated bridge steps down 0.3 to G2 |
| G2 | The casing top joins the east-wall gallery by a grated bridge | y 14 | - | - |
| WJ | North wall lip at 3.4 above G2, and the north-east inside corner | G2 north end | wall jump (straight), corner kick (alternate) | 2.7-3.8 (`WALL_JUMP`); corner reach 1.4 |
| G3 | Hoist landing, north-east corner, x 12..18, z 12..18 | y 17.4 | - | - |
| PH | Damper-shaft bar from G3 over a 4 m void to above G2 | y 19.9 (2.5 over G3) | hands, legs up, inverted, flip drop onto G2 (a way back for practice) | `PIPE` times |
| RP | Hoist beam over the east wall void, a rope anchor (`RappelPoint`, length 17.4 to the chamber floor y 0; T0: the rope bottom is the exit floor) | G3 east edge | rappel down the east wall; kick out, sideways, kick through the control-room window (y 3.0-4.5); unhook | `RAPPEL` speeds; `unhookHeight` 2.0 |
| ZP | Spoil ropeway cable from G3 (y 19.4) to above the west platform WP (x 0..4, z 0..4, floor y 2.6; cable end y 4.5, T0: body hangs 1.9 under the cable) | diagonal across the shaft | zipline, launched at the end onto WP | `ZIP_SPEED` 6 |
| CR | Fan control room, outside the east wall (local x 18..23, z 4..10), floor y 0, window in the shaft wall at y 3.0-4.5 | east | the rappel's window; the fan isolator; a door onto the chamber floor | window anchor; `ropeWindow` |
| FP | Fan pit (x 6..12, z 6..12) inside a chain-link fan guard 2.4 high (`LevelBuilder.fence`) | floor | fence climb, shimmy, flip over; rattle above gear 3 | `FENCE` |
| DU | Fan discharge duct, 1.2 wide x 1.0 high, from the pit's south wall 7 m to a wall grille in the plant corridor before A3 | floor | duct crawl; grille unscrew (hold, quiet) vs kick (tap, loud) | engine duct anchor (SPEC E6) |
| PL | Plant ladder, chamber floor to G1 (west wall) | shaft | the way back after a fall | 16.2.1 (plant shaft) |
| NT | Catch nets 2 m under the RC slot and under WJ | y 8, y 12 | a failed move lands soft (`LANDING` soft) and the net ladder climbs back | - |

Sequence: both split up RC and wall jump WJ to G3 (one at a time; the other spots and pings) -> optional PH practice ->
at G3 the team splits: the lead rappels RP, kicks out and through the CR window; the second ziplines ZP to WP and waits
over the running fan -> lead throws the fan isolator in CR (switch: the fan stops, its noise ends, the pit is safe) and
opens CR's chamber door -> second drops from WP, both climb the fan guard FP, crawl DU, open the grille (one unscrews,
quiet; the other may kick, loud, to hear the difference) -> A3.

Co-op split and gate: the pit stays live (fan running: the course framework blocks the fence: "Fan running") until the
lead isolates it from CR, which only the rappel's window reaches. Lock behind: A3.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L3-1..3 | Sodium bulkheads (G1, G2, G3) | I1 | A2 side | Breakable. |
| L3-4, 5 | Floods on the chamber walls | I2 | In CR | Off at start: the chamber is dark until the lead lights it (or leaves it dark). |
| L3-6 | Hoist lamp over RP | I1 | A2 side | |
| L3-E1..3 | Emergency bulkheads at each gallery door | none (maintained) | none | |
Sound: galleries steel grating (loud); the fan's running noise (an ambient bed in Phase 2: masking placeholder).

Sketch (plan; heights in brackets):
```
 z18 +--G1 north arm (10)--[ RC slot ]------+ G3 (17.4)
     |G1   ======RC casing======    G2 bridge| RP hoist beam ->| CR (0) window y3-4.5
     |west                         G2 (14)   |                  | isolator
     |(10)        FP fan pit + fence     G2  |
     |A2 ->       (floor 0)              east|
     | WP (2.6) <~~~~~~ ZP from G3 ~~~~~~~   |
 z0  +--------DU duct -> grille -> A3--------+
     x0                                      x18   x23
```

---

## B4 - The Cistern (co-op climbing)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's fire-water and domestic reservoir: three drained concrete cells with 4.4 m walls, a valve gallery along the top, a sluice gate in each wall, inspection doors bolted from the downstream side, an access ladder per cell from the valve gallery. Cresset padlocks the C1 and C2 ladders for the team-climb drill. |
| Size, shape | 36 x 38; cells C1 (z 26..38), C2 (z 13..25), C3 (z 0..12), walls W1 (z 25..26) and W2 (z 12..13), 1 m thick, 4.4 high, walkable tops; valve gallery along the east wall (x 32..36) at 4.4. |
| Verticality | Every wall is a co-op lip at 4.4 (level-design 11.3: 4.3-4.5, out of solo reach). |
| Colour | 4200 K mercury-vapour green-white; wet concrete. |
| New mechanics | Brace, boost, human ladder; one lifts, the other opens the way back; a timed hold (sluice). Phase 5 placeholders: split-jump boost, back-to-back climb, pull-up, rappel anchor. |
| Guards | None. |
| Lead / second | P2 / P1. |

Sequence and gates:
1. C1 to W1 (boost): the second braces against W1 (hold Y, wall behind), the lead boosts to the 4.4 lip and climbs onto
   W1, drops into C2 (hang-drop, soft) and draws the bolt on W1's inspection door (a door locked from the C1 side, opened
   from C2: course gate "one side"). The second walks through.
2. C2 to W2 (human ladder, roles swapped): the lead braces and holds as a ladder; the second climbs the human ladder,
   grabs W2's lip and climbs up, walks W2 to the valve gallery.
3. The sluice (timed hold): on the gallery, the second holds the W2 sluice handwheel (hold interactable); the W2 sluice
   (1.5 wide, under the wall) rises while held and drops 6 s (TUNE) after release. The lead passes under into C3. The
   second climbs down C3's access ladder (unlocked) from the gallery.
4. Phase 5 drills in C3, each on its own real element; until Phase 5 lands an element is built but is not a drill (D30),
   except the pull-up, whose now form (a boost onto the platform) is a required drill:
   - split-jump boost: the overflow channel (x 0..1.6, walls 6.0 high, lip 6.2): one splits, the other climbs onto them.
   - back-to-back: the 1.0 m wide float-valve shaft (x 3..4, 6 m) to the same lip.
   - pull-up: the A4 landing (local x 15..21, z 0..2) is raised 4.4 over C3 (the reservoir outlet platform); now: a boost
     onto it, then the top player lowers the outlet's hooked ladder for the partner (the B4 ladder trick, a course anchor
     unlocked by the boost: anchorLock); final: one climbs, pulls the other up.
   - rappel anchor: the sump (x 26..32, z 2..8) is 4 m deep with no anchor; now: not a drill (a ladder out); final: one
     holds the rope.
5. Both onto the outlet platform -> A4 (medkit).
Lock behind: A4. Softlock check (SPEC E3): a player alone in any cell has the gallery ladders of C3 and the inspection
doors; C1 and C2 have no way up alone, so the course framework restarts the bay if a partner disconnects (the session
ends anyway: no host migration, bible C2).

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L4-1..3 | Gallery bulkheads | V1 | Gallery north end | Breakable. |
| L4-C1, C2, C3 | One cage light per cell | C1, C2, C3 | Inside each cell by its inspection door | |
| L4-E | Exit sign over A4 | none | none | |
Sound: cell floors wet concrete; wall tops and gallery steel chequer plate (loud).

Sketch:
```
 z38 +-[A3]------------------------------+--+
     |  C1 (entry)                       |V |
 z26 |=====W1 (4.4) [insp. door]==========|A |
     |  C2                               |L |
 z13 |=====W2 (4.4) [sluice]==============|V |  handwheel
     |  C3  overflow | float shaft  sump |E |  C3 ladder
 z0  +---------[outlet platform 4.4][A4]-+--+
     x0                               x32  x36
```

---

## B5 - Standby Plant (light and sound)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's standby power plant: three diesel generator sets, the switch room with the mains breaker, the fuel day-tank bay, cable trenches under grating covers, a cable gallery along the north wall. Cresset runs it live (it powers the course) with role-player duty electricians. |
| Size, shape | 48 x 32, 9 clear; a big dark hall broken by three gensets. |
| Verticality | Genset roofs at 3.0 (wall jump, high route); the cable gallery at 3.5 (ladder); the cable trench at -1.5 (secret). |
| Colour | 4000 K high bays; red-white emergency bulkheads; the amber PIR flood at the fuel bay. |
| New mechanics | First guards. Switches and circuits, shooting lamps, the mains breaker (fuse box), maintained emergency lights, a PIR light, flashlights carried into the dark, loud and quiet floors, the whistle and noise masking (Phase 2 placeholders), thermal vision (hot gensets, step 14). |
| Guards | 2 (B5-G1, B5-G2). |
| Lead / second | P1 / P2. |

Layout (local):
| Element | Box / position | Real reason | Gameplay |
| --- | --- | --- | --- |
| Entry landing | x 27..33, z 30..32, grating | A4 door | vantage: dark, sees both guards within one cycle |
| Switch room SR | x 38..48, z 24..32, glazed west wall, rubber floor | breaker and circuit switches | mains breaker MB, switches L1-L3 |
| Gensets GEN-1, 2, 3 | x 10..16, 21..27, 32..38; z 15..17.5; 3.0 high | standby sets | full cover; roofs are planned lips (wall jump) |
| Cable trench grating | z 20..22, x 2..46 | trench covers | loud fast route |
| Cable trench (secret) | under the grating, 1.5 deep x 1.2 wide, lift-out panels at x 44 and x 4 | the trench itself | crouch duct (16.7.3) |
| Cable gallery | y 3.5, x 2..38, z 30.5..32; ladder at x 37 | cable trays | high route, hang-drop at x 2 |
| Main aisle | z 8..12 | plant aisle | lit crossing |
| Fuel bay FB | x 38..48, z 0..8; day tank 4 x 2 x 2.4 | fuel | cover; PIR flood |
| Monitoring desk | x 4..8, z 4..7, facing east | the duty desk | B5-G2's post |
| A5 door | west wall, z 13..19 | plant-room fire door on a mag lock | the gate |

Routes to A5:
- Shadow: from the landing west along the north wall under the cable gallery (dark), behind the gensets (z 18.5..20,
  dark gaps), down the west side to A5. Loop: round GEN-1 (two gaps, both dark).
- High: SR ladder to the cable gallery, west along it, hang-drop at x 2 beside A5 (soft, quiet); or wall jump onto the
  genset roofs and cross them (gaps of 5 m between sets: drop and climb).
- Loud: the grating walkway or the main aisle at speed.
- Secret: the cable trench from SR to x 4.

Co-op split and gate: A5's fire door is held by a mag lock that releases when the mains fail (fail-safe fire doors, real).
One player pulls MB in SR (hold 2 s): L1-L3 and the gallery lamps go off, emergency bulkheads stay on, A5 unlocks while
the mains are off. Final form (Phase 1 fuse box): a guard is sent to reset the breaker, so B5-G2 leaves the desk and walks
east along the aisle to SR (about 40 m, 45 s): the crosser reaches A5 unseen while the breaker player leaves SR by the
gallery ladder before G2 arrives. Now form: MB is a switch on the L1-L3 group (`MapLayout.switches`) plus the course
gate; `lightsOut` sends the nearest calm guard to investigate. If G2 resets MB, A5 relocks (unless both are inside).
Lock behind: A5.

Guard sheets:
| Field | B5-G1 duty electrician (grunt) | B5-G2 desk operator (grunt) |
| --- | --- | --- |
| Job | Rounds of the running sets, reading gauges | Watches the switchboard monitor; resets faults |
| Route | (21, 12) wait 3 face W (along the aisle, covers G2) -> (29, 12) wait 2 face N (GEN-3 gauge) -> (29, 19.5) wait 3 face E (behind GEN-3) -> (21, 19.5) wait 2 face W -> loop; 31 m at 0.9 m/s = 34 s + 10 s = 44 s | Post at (6, 5.5) seated facing E (yaw 90); glances N towards A5 every 10 s (existing glance) |
| Gaps | Facing E behind GEN-3 (t 23-26 s): the aisle west of GEN-2 is unwatched by G1 | Each glance N lasts about 2 s; between glances the A5 door is in his peripheral field only |
| Isolation | (29, 19.5) behind GEN-3, dark (light < 0.28), unseen by G2 (GEN-2 and GEN-3 block), t 20-26 s | None while seated; on a breaker reset he walks alone to SR (dark aisle) |
| Covered by / covers | Covers G2 from (21, 12) facing W | Covers the aisle and A5 |
| Lures | Shot HB5 / HB6 (L3 lamps): investigates under GEN-2; a noisemaker on GEN-1 | MB pulled (final: walks to SR); a lamp shot near the desk |
| Search | Behind the gensets; hide spots: trench panels, the fuel bay, the dark under the cable gallery | The desk area; hide: the west recess under the gallery hang-drop |
| Flashlight | Yes (existing `torchWanted`: investigating where the level is below 0.35) | Yes when sent into the dark |

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| HB1, HB2 | High bays 4000 K over the aisle west | L1 | SR | |
| HB3, HB4 | High bays over the aisle middle and east | L2 | SR | |
| HB5, HB6 | High bays over the gensets and grating | L3 | SR | |
| CG1..4 | Gallery battens | L3 | SR | |
| EM1 | Emergency bulkhead over A5 | none: maintained, battery (stays on with MB off) | none | Breakable. |
| EM2, EM3 | Emergency bulkheads at SR and FB doors | none | none | |
| PIR1 | PIR flood over the FB door (S3) | own | sensor | Now: a normal lamp, off. |
| DL | Desk lamp | own | at the desk | Lights G2's face (readable). |
MB kills L1, L2, L3. Lit chokepoints: (1) the A5 door under EM1: darkened by shooting EM1, EMP, pistol secondary (V3);
avoided by the gallery hang-drop right beside it and G2's glance gaps. (2) the aisle crossing between GEN-1 and GEN-2
(HB2): darkened by L1, MB or a shot; avoided by the trench or the genset roofs.
Sound (Phase 2 placeholders): running gensets mask footsteps within about 6 m (TUNE in Phase 2); grating loud; SR rubber
quiet; the fuel bay concrete. Whistle (Phase 2): lure G1 to the GEN-1 gap.
Hide spots: two trench panels (lift-out), the fuel bay behind the tank, the recess under the cable gallery west end.

Sketch:
```
 z32 +=cable gallery (3.5)==============[lad]+-SR (rubber)-+
     |                       [A4] landing    | MB L1 L2 L3 |
 z22 |==grating walkway (loud) / trench below=+------------+
 z18 |   [GEN-1]     [GEN-2]     [GEN-3]  G1 loop       |
 A5  |                                                  |
 z12 |==== main aisle (lit) =====================  [FB] |
     | [desk G2]                                  PIR  |
 z0  +--------------------------------------------------+
     x0                                               x48
```

---

## B6 - Mock Site (corners and security)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's former communications centre (teleprinter room, cipher room, signals office), refitted by Cresset as a mock secure facility: reception, a corridor of offices, an open office with a control room above it, records, lockers, and a mantrap into a mock server room. |
| Size, shape | 42 x 32, one storey (3.4 to the ceiling void) plus the control room mezzanine at 3.6 over the office's north part; ceiling void 3.4-4.6 carries the supply duct. |
| Verticality | Control room (y 3.6) over the office, reached by an enclosed stair behind a card door; the supply duct in the ceiling void. |
| Colour | 6500 K LED, clean blue-white; blue rack LEDs in the server room. |
| New mechanics | Back-to-wall slide, corner peek, lean-out aim, SWAT turn, door peek, optic cable; CCTV (fixed and sweep), security desk and operator, alarm panel (loop, cameras off, beams off), plant fault trip, card readers, keycards, clone, mantrap, iris, beams (high, low), PIR, lockpick, hacking, the egress button. |
| Guards | 3 (B6-GD, B6-GR, B6-GM). |
| Lead / second | P2 (operator) / P1 (runner). |

Rooms (local):
| Room | Box | Contents |
| --- | --- | --- |
| Reception RC | x 34..42, z 10..22 | Counter 1.1 (low cover); CAM1 fixed over the inner door; A5 door on the east wall. |
| Corridor CO | x 4..34, z 15..17 (2.0 wide) then south x 4..6, z 2..15 (the L) | Doors both sides (records, lockers, office x2); the L-turn corner; beam pair B6-BH (1.4) and B6-BL (0.35) 1.2 apart at z 9 and 7.8; PIR1 downlight at the turn. |
| Open office OF | x 14..34, z 17..32 | Desk pods with 1.5 partitions (low cover), the manager's glazed office (x 14..20, z 26..32, door lock `pin`), whiteboard with the exit code (seen on CAM4). CAM4 sweeps it from the control room front. |
| Control room CR | mezzanine x 20..34, z 24..32, y 3.6; glazed south front | Security desk SD (S0: seat point, feeds CAM1-4), alarm panel PN (loop / cameras off / beams off), the desk console (feeds view, PLAN 2 item 3). Enclosed stair x 20..22, z 17..24 behind reader RD2 (level 2). |
| Locker room LK | x 4..14, z 17..32 | Lockers (hide spots); locker 7 (`wafer`) holds card A (level 2). |
| Records RE | x 22..34, z 0..15 | Records PC (`hack`: services `intel:exitCode`, `unlock:RD3` for 20 s (TUNE)); CRAC unit (fault: "Trip cooling"); reader RD1 (level 1, door from CO). Ceiling grille: the supply duct's end over the records desk (vent drop, SPEC E6). |
| Mantrap MT | x 16..22, z 4..10 | Outer door RD3 (level 3) from CO's south wall at x 19; inner door RD4 (level 4) + iris IR1 (enrolled: B6-GM); the egress button on the secure side. |
| Server room SV | x 4..16, z 0..13 | Rack rows (full cover), blue rack LEDs; exit door to S6 on the west wall (z 0..2): keypad, code = `exitCode`. |
| Supply duct | from A5's service passage, in the ceiling void west along z 16, 1.2 x 1.0, to the records grille | the office's air supply from the plant (B5) | duct crawl, ceiling vent drop (alternate route for the runner) |

Devices (S0 kinds; counts within SN60-SN65):
| Id | Kind | At (local x, z, y) | Facing / sweep | Reason |
| --- | --- | --- | --- | --- |
| CAM1 | camera fixed | 35, 16, 2.8 | 270 (W along CO) | Covers the reception inner door |
| CAM2 | camera sweep | 33.5, 16.8, 2.8 | 225..315 | Corridor tour |
| CAM3 | camera fixed | 19, 17, 2.8 | 180 (S at the mantrap door) | Covers the mantrap |
| CAM4 | camera sweep | 27, 24, 3.4 | 135..225 | Office floor (shows the whiteboard) |
| SD | desk | 27, 30.2, y 3.6 | 180 | Operator post; feeds CAM1-4 |
| PN | panel | 33, 31, y 4.9 | 270 | Controls CAM1-4, B6-BH, B6-BL |
| FLT | fault (CRAC) | 32, 3, 1.2 | 0 | Responders: B6-GM |
| RD1..4 | readers | RE door, CR stair, MT outer, MT inner | - | Levels 1, 2, 3, 4; building A |
| IR1 | iris | 17, 9, 1.6 | - | Enrolled B6-GM |
| B6-BH, B6-BL | beams | a (4.2, 1.4, 9) b (5.8, 1.4, 9); a (4.2, 0.35, 7.8) b (5.8, 0.35, 7.8) | - | Corridor trap before the server wing |
| PIR1 | PIR | 5, 15, 3.2 | lamp L6-P | Corridor turn |
Cards: A (level 2, locker 7), B (level 3, held by B6-GR), M (level 4, held by B6-GM).

Sequence (the intended split; other orders work):
1. Corners (both): wall hug along CO's walls past CAM2's sweep, peek and lean at the office doorways, SWAT turn across
   them, door peek and optic cable under the locker room and records doors (V1 / step 13).
2. Operator: picks locker 7 (V2) for card A -> RD2 -> stair -> CR; takes B6-GD (lure him with the CRAC trip or a noise,
   or a takedown from behind at the desk) -> at the desk: loops the cameras (hold 6 s) and turns the beams off (2 s),
   watches the feeds on the console and pings the runner past B6-GR; reads the exit code off CAM4's whiteboard view.
3. Runner: takes B6-GR's card B (takedown at the corridor isolation spot, or clone it while grabbing him, S2) -> grabs
   B6-GM at the mantrap door (or lures him to the CRAC fault), walks him into the mantrap: RD3 with card B, RD4 with his
   card M, IR1 with his eye -> server room; drops him (knock out); presses the egress button for the operator.
   Alternate: the runner hacks the records PC for `exitCode` and the RD3 unlock, and crawls the supply duct (vent drop).
4. Operator comes down and through the mantrap on the egress -> both at the exit keypad: the runner enters the code the
   operator read -> S6.
Co-op split and gate: the exit keypad's code is only on CAM4's feed (operator) or in the records PC (hack); the mantrap's
egress is only on the secure side (runner). Now form (before S1B, S2, V2): RD doors are course-gate doors opened by a
switch "Swipe card" that needs the player to have used the matching "card" pickup (a switch that sets a course flag);
the exit keypad is three numbered switches, the right one shown by a lit sign the operator sees from CR (a wrong one
rings the panel: every guard investigates); the mantrap is two locked doors and an egress switch.
Lock behind: S6's top door (one-way, push bar: DR stage; now: a course gate that locks after both pass).

Guard sheets:
| Field | B6-GD desk operator (grunt) | B6-GR rounds officer (grunt, card B) | B6-GM mantrap post (officer, card M, enrolled) |
| --- | --- | --- | --- |
| Job | Watches the feeds | Rounds of reception, corridor and office | Holds the secure door; checks the records room |
| Route | Seat (27, 30.2, y 3.6) facing S | (36, 15) wait 3 face W -> (24, 16) wait 2 face S (records door) -> (24, 21) wait 3 face N (office) -> (30, 21) wait 2 face E -> loop; 31.5 m = 35 s + 10 = 45 s | Post (19, 14) facing W along CO; every 30 s walks to the RE door (24, 15) wait 4 face S and back: 10 m = 11 s + 4 = 15 s of 45 s |
| Gaps | Watches the office through the glass; the corridor is behind him (feeds only) | At (24, 21) facing N the corridor is clear for 3 s; at (30, 21) facing E the office west half is clear | Walking to the RE door (t 30-45 s) his back is to the L-turn |
| Isolation | Alone in CR all cycle (dark mezzanine behind the monitors) | (24, 16) facing S: CAM2 sweeps away (TUNE: phase the sweep), CR cannot see the corridor, B6-GM faces W but stands 5 m west round the post's line of sight blocked by the mantrap's wall (TUNE) | At the RE door facing S, t 34-38 s, dark (S3 off), unseen |
| Covered by / covers | Covers the office (eyes) and the corridor (CAM1, CAM2 feeds) | Covered by CAM2 most of his loop | Covers CO west and the L-turn; covered by CAM3 |
| Lures | CRAC trip (he dispatches B6-GM; he stays); a noise in CR's stair | A shot lamp in the office; a noisemaker in the locker room | CRAC trip (responder); the panel's "beams off" when manned (dispatch) |
| Search | CR and the stair | Office pods; hide: locker room lockers | Records room; hide: the server room rack ends |

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L6-C1..6 | Downlights 6500 K along CO | S1 | RC inner door | Breakable. |
| L6-O1..6 | Office troffers | S2 | Office doors (two) | |
| L6-R1, 2 | Records troffers | S3 | Records door | |
| L6-K1, 2 | Locker battens | S4 | Locker door | Off at start. |
| L6-V1, 2 | Server room battens; blue rack LEDs | S5; equipment | Server door; none (equipment: on with the racks) | Rack LEDs below dark 0.28 (build checks). |
| L6-P | PIR downlight at the L-turn | own | PIR1 | |
| L6-M | CR monitor glow + desk lamp | equipment; own | none; desk | Lights B6-GD's face. |
| L6-E1..3 | Exit signs | none | none | |
Lit chokepoints: (1) CO past CAM2 (S1): darkened by S1, shots, EMP; avoided through the office behind the partitions.
(2) The mantrap door (S3 spill, CAM3): darkened by S3, shots, pistol secondary on CAM3; avoided by the duct route to
records. (3) The RC inner door (CAM1): darkened by S1 or a shot; avoided behind the counter in its shadow (TUNE).
Sound: CO and RC vinyl (quiet); office carpet (quiet); server room raised floor (hollow knock: loud); CR vinyl.

Sketch:
```
 z32 +--LK lockers--+-mgr-+==== CR (3.6) SD PN =====+---------+
     | locker 7     |glass|  stair|  office below    |         |
 z17 |=====CO=======[OF door]======[OF door]===CAM2==[RC]CAM1 [A5]
     |L|  CAM3                                     | counter |
     |-| [MT]RD3/RD4/IR1      [RE records]         |         |
     |B| [SV servers]         PC  CRAC   grille    |         |
 z0  [S6 exit keypad]---------+----------------------+---------+
     x0 x4                 x22                    x34        x42
```

---

## S6 and A6 - quiet connector
An enclosed concrete stair (the bunker's original main stair between the plant and deep levels): 33 risers of 0.182,
going 0.28, one half landing 1.8 m; 3.0 wide with handrails both sides (16.2.4); no guard; one bulkhead (4000 K). At the
foot, A6 (medkit). A6's vision panel shows the kill house's lit windows across the dark cavern (the glimpse).

---

## B7 - The House (guards and takedowns)
| Field | Content |
| --- | --- |
| Real purpose | The rock cavern left from excavating the bunker (sprayed concrete), where Cresset built a two-storey block-and-timber "kill house" (a mock office) for close-quarters drills; a 300 mm water main and the cavern's lighting truss cross it overhead. |
| Size, shape | Cavern 44 x 40, 10 high, dark; the house x 14..34, z 10..26 (20 x 16), ground floor 0, first floor 3.2, flat roof 6.4 with a 1.1 parapet and a roof hatch; a single-storey annex (kitchen) on the south side x 20..28, z 6..10, roof 3.2. |
| Verticality | Roof, first floor, annex roof, the water main at 4.6, a sprayed-concrete bench on the west cavern wall at 3.0. |
| Colour | 3000 K: warm house windows in a dark cavern; cold floods on the cavern walls. |
| New mechanics | Every takedown kind (behind, front, side, corner, over a low obstacle, drop from a pipe, ledge pull, window, inverted from the pipe), tap / hold, elbow strike, grab (walk, sidearm, human shield, knock out, shove), interrogation, carry, drag, hide, bodies found, radio check, dual takedown and Sync, an officer's buff, a heavy (frontal = lethal only). |
| Guards | 6 (B7-P1, B7-P2, B7-W, B7-R, B7-O, B7-H). |
| Lead / second | P1 / P2. |

Elements:
| Id | Element (real reason) | Position | Use |
| --- | --- | --- | --- |
| WM | Water main 300 mm on brackets (the bunker's supply to the deep level) | z 6, x 4..40, y 4.6 | horizontal pipe: hang, legs up, inverted; drop takedown on B7-W at (8, 6); inverted takedown |
| WB | Sprayed-concrete bench on the west cavern wall (rock bolting platform) | x 0..1.5, z 4..30, top 3.0 | lip: hang and shimmy; reached by a fixed plant ladder at z 30 (cavern access) |
| AX | Annex roof (kitchen) | x 20..28, z 6..10, 3.2 | wall jump up (2.7-3.8); the first-floor manager's window above it (sill 4.1) = window takedown |
| PR | Roof parapet | roof edge, 6.4 + 1.1 | hang below it on the south face at (30, 10): ledge pull on B7-R |
| SB | Sandbag walls 1.0 (range wall leftovers, Cresset's cover props) | east side x 36..40, z 12..24 | low cover; takedown over a low obstacle |
| KH doors | Front (north, (24, 26)), back (south annex), side (east, (34, 18)) | - | open quiet / fast / bash; peek (step 13) |
| Windows | Ground floor: two glazed, two open; first floor: the manager's (south), two more | - | vault in; window takedown |
| Hides | Lobby lockers (2), three dark recesses in the cavern wall (west, north-east, south-east), a builder's skip (x 4..7, z 32..35) | - | hide bodies |
| Exit | Secure store door on the cavern's east wall (z 17..23) with a keypad | - | the gate (code from B7-O) |

Guard sheets:
| Field | B7-P1 / B7-P2 talking pair (grunts) | B7-W west rounds (runner) | B7-R roof watch (grunt) | B7-O officer (officer; knows the code) | B7-H lobby post (heavy) |
| --- | --- | --- | --- | --- | --- |
| Job | Smoke break at the front door, talking | Checks the cavern's west side and the water main valve | Roof watch over the cavern | Exercise officer in the manager's office | Holds the lobby |
| Route | Static at (22, 28) and (24.5, 28) facing each other, 20 s talk, then together to (22, 32) wait 5 face N and back: 8 m = 9 s + 5 s; cycle 34 s (TUNE: 25-45) | (8, 6) wait 3 face E (valve under WM) -> (8, 16) wait 3 face N -> (12, 16) wait 2 face E -> (12, 6) wait 3 face S -> loop; 28 m at the runner's 1.3 m/s = 22 s + 11 s = 33 s | Roof: (19, 12) wait 4 face S -> (30, 12) wait 3 face E -> (30, 16) wait 3 face E -> (19, 16) wait 2 face W -> loop; 30 m = 33 s + 12 s = 45 s | Desk (17, 14, y 3.2) wait 14 face N -> window (17, 10.6) wait 6 face S -> back; 6.8 m = 8 s + 20 s = 28 s | Post (24, 23) facing N (the front door); glance every 10 s |
| Gaps | During the 20 s talk both face each other: the north approach is in their peripheral fields only | At (12, 6) facing S the house's west wall is unwatched | Facing E at (30, 12)-(30, 16): the west half of the roof edge is unwatched | At the desk facing N: the window behind him | His back is to the back door and the annex |
| Isolation | The walk to (22, 32): together but out of the house's sight and dark | (8, 6) under WM, dark, unseen (the house's west wall blocks the pair), t 0-3 s | (30, 12), dark, t 14-17 s | At the window, t 22-28 s: alone, lit by his desk lamp only from behind | None (a heavy post); taken from behind, the back door, or avoided |
| Covered by / covers | Cover each other (overlap); B7-H covers their backs through the front door | Covered by B7-R when B7-R faces S at (19, 12) | Covers B7-W and the annex roof (facing S); covered by nobody | Buffs every guard within his officer radius (archetype buff): take him first or last by choice | Covers the pair through the front door |
| Lures | A noisemaker by the skip pulls one of the pair (the other follows after 3 s); a shot porch lamp | The lamp under WM (L7-W, shootable) pulls him to (8, 6) = under the drop spot | A noise on the annex roof | A knock at his door; the whistle (Phase 2) from the window ledge | Noise at the back door |
| Search | The skip, the north-east recess | The west recesses | The roof hatch | The first floor | The ground floor |

Sequence (intended; other orders work): from A6's dark vantage the team reads all six. Lead goes high (WB bench or AX
wall jump), takes B7-R with a ledge pull from the parapet's south face; second drops on B7-W from WM (drop takedown)
and hides him in the west recess before the radio check. Both take the pair with a dual takedown (Sync countdown when
Phase 5 lands; now: a radio line "together") from the dark north side. The lead takes B7-O through the window from AX
(window takedown) or grabs him and questions him for the code (V3: the code goes to the team as intel); the second deals
with B7-H (from behind through the back door, or avoids him). The code opens the store door -> A7.
Co-op split and gate: the store keypad's code is known only to B7-O (interrogation V3); the lead learns it upstairs while
the second holds the cavern; now form: B7-O's desk drawer (a switch, "Store key") sets the course flag. Every takedown
kind has a spot on a guard's route (FEATURES.md). Bodies: B7-W's loop finds a body left on the west side; radio check
(`ARCHETYPE.radio`) on, so a missing guard is noticed. Lock behind: A7.

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L7-F1..4 | Floods 4000 K on the cavern walls, aimed at the house | K1 | A6 exit | F4 lights the store door. Breakable. |
| L7-W | Bulkhead on a WM bracket column | K1 | A6 exit | The lure lamp. |
| L7-G1..4 | House ground floor ceiling lamps | KH-G | Lobby | Lit windows. |
| L7-U1..3 | First floor lamps | KH-1 | Stair top | |
| L7-O | Desk lamp in the manager's office | own | Desk | Back-lights B7-O at the window. |
| L7-P | Porch lamp over the front door | KH-G | Lobby | Breakable; the pair's light. |
| L7-E | Exit sign over the store door | none | none | |
Lit chokepoints: (1) the front door (L7-P): darkened by KH-G (inside), shooting L7-P, EMP; avoided by the back door or a
window. (2) The store door (L7-F4): darkened by K1 (at A6, behind the team), shooting, EMP; avoided: none needed after
the guards (TUNE: a dark approach along the east wall). (3) The roof hatch (L7-U3 below): darkened by KH-1 or a shot.
Sound: cavern floor gravel spoil (loud); house floors vinyl (quiet) and the stair timber (louder).

Sketch:
```
 z40 +[A6]-----------------------------------------+
     |  skip        pair (22-24,28)                |
 z30 |lad   +-------[front door]------+     NE rec |
     |WB    |  lobby (H)    office     |  SB        |
     |bench |      HOUSE 20x16         |  SB  [store door] -> A7
     |(3.0) |  1st: office O (SW)      |  SB        |
 z10 |      +----[annex roof 3.2]------+            |
 z6  |==W===========water main 4.6=================|
 z0  +---------------------------------------------+
     x0     x14                       x34          x44
```

---

## B8 - The Range (weapons, gadgets, enemy attacks)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's former workshop and vehicle bay, a long vaulted hall, now the indoor range: a firing line, six lanes to 50 m, a shoot-house of barricades, the range control tower and the old crane gantry as a catwalk. |
| Size, shape | 62 x 32, 8 high; the firing line at x 4..8, lanes x 8..58, the catwalk on the north wall at 4.0. |
| Verticality | Catwalk and tower (4.0) over the lanes. |
| Colour | 5600 K daylight high bays over the lanes; floods in the shoot-house. |
| New mechanics | Weapons (pistol, SMG, rifle, shotgun, sniper), ADS, no hip fire, reload, swap, suppressed vs loud, penetration, headshots, barrels; every gadget; pistol secondary and shock round (V3); throwables (Phase 6); ring airfoil (backlog); enemy attacks: guards shooting, a grenade, a flanker, suppression, a sniper laser, a shield. |
| Guards | 3 (B8-S sniper, B8-E enforcer, B8-F grunt flanker), alerted when "live fire" starts. |
| Lead / second | P2 (catwalk overwatch) / P1 (floor). |

Elements:
| Id | Element | Position (local) | Use |
| --- | --- | --- | --- |
| FL | Firing line benches | x 4..8, z 2..26 | weapon drills |
| KL | Kit lockers (the course kit loadout, PLAN T1) | x 0..4, z 20..30 | take each weapon class |
| TG | Training dummies on lane stands at 10, 25, 50 m (`TrainingDummy`) | lanes 1-6 | hits, headshots (head volume), reload under time |
| PW | Penetration wall: plywood 0.05 beside block 0.2 | lane 2 at 15 m | penetration vs none |
| BR | Two explosive barrels | lane 5 at 30 m | frag / shot |
| LG | Lamp gantry with breakable lamps and a fixed camera CAM-R | lane 6 at 20 m | shoot lamps; pistol secondary (V3); EMP |
| SH | Shoot-house barricades: low 1.0 and high 2.0 | x 30..58, z 2..18 | the floor advance; low cover |
| CW | Catwalk on the crane gantry, y 4.0 | x 8..60, z 28..32 | overwatch |
| RT | Range control tower cabin, y 4.0, glazed | x 8..14, z 26..32 | sniper drill; circuit switches |
| LD | Fixed ladder to RT (gantry access) | x 9, z 26 | - |
| CS | Catwalk stair down at the east end behind a door locked from below | x 58..60, z 26..32 | the gate back |
| SP | Sniper's platform at the far end (a scaffold 3.0) | x 56..60, z 20..24 | B8-S post |

Sequence: weapons drills on the firing line (both): pistol (draw by aiming, no hip fire, ADS spread), SMG and rifle at
25 m, shotgun at 10, reload and swap, headshots, suppressed vs loud (LANTERN shows the noise ring on the HUD meter when
Phase 2 lands), penetration at PW, barrels; the lead climbs to RT for the sniper at 50 m. Gadgets: frag at BR, sleeping
gas on a dummy group, flashbang (white-out when facing it), EMP on LG and CAM-R, noisemaker on a barricade, sticky cam on
the shoot-house corner (lure ping, gas), proximity mine at the shoot-house gate, shock round on a dummy (V3), pistol
secondary on a lamp and CAM-R (V3), a thrown bottle at a lamp (Phase 6) and the ring airfoil (backlog) once they land (not drills until then, D30). Then "live
fire": the three role-players at the far end are alerted (course trigger). The lead covers from the catwalk (sniper
rifle: B8-S first, laser and glint warn); the floor player advances through SH against B8-E (shield: flank, shock, or
a grab is refused frontally) and B8-F (flanks the player who holds cover over 4 s; one grenade at a time; suppression).
Co-op split and gate: the floor player reaches the far end, throws the "cease fire" switch and unlocks CS (the catwalk's
stair door, bolted from below) for the lead. Now and final forms are the same (doors, switches, existing AI).
Lock behind: A8 (medkit).

Guard sheets (combat role-players; they start calm at their posts and are alerted by the course's live-fire trigger):
| Field | B8-S sniper | B8-E enforcer (shield) | B8-F grunt flanker |
| --- | --- | --- | --- |
| Job | Overwatch the lanes from the scaffold | Holds the shoot-house gate | Patrols the barricades, flanks |
| Post / route | SP (58, 22, y 3.0), facing W; relocates 5-22 m (archetype) after shots | (56, 10) facing W | (44, 4) wait 4 face W -> (44, 14) wait 4 face W -> loop; 20 m = 22 s + 8 = 30 s |
| Counters | Shot from RT/CW (sniper vs sniper), smoke? none: gas, EMP his platform lamp, flank under the catwalk | Flank, shock (V3), frag, takedown from behind | Takedown, shock, any weapon |
| Isolation | Before live fire: at SP alone (the stealth option exists: ghost the drill by taking all three before live fire) | (56, 10) alone, dark if R3 is off | (44, 14), t 11-15 s |

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L8-R1..6 | High bays 5600 K over the lanes | R1 | RT | |
| L8-F1, F2 | Firing line downlights | R2 | RT | |
| L8-H1..3 | Shoot-house floods | R3 | RT and the far end | Breakable. |
| L8-G1..4 | Lamp gantry lamps (targets) | R4 | none (targets) | Breakable; respawn on bay restart. |
| L8-C | Catwalk battens | R5 | RT | |
| L8-S | Sniper platform lamp | R3 | far end | |
| L8-E | Exit sign over A8 | none | none | |
Lit chokepoints: the shoot-house gate (L8-H): darkened by R3 (RT or the far end), shots, EMP; avoided along the dark
corridor behind the lane stands (z 26..28, under the catwalk).
Sound: workshop concrete; catwalk grating (loud); the tower vinyl.

Sketch:
```
 z32 +RT[lad]=========== catwalk CW (4.0) ============[CS]+
     | KL |                                               |
 z26 |    |---------- lane stands 10 / 25 / 50 m ---------|
 A7  |FL  |  lanes 1-6   PW   BR   LG+CAM-R     SH barricades [SP] B8-S
     |    |                                  F   E gate   |  [A8]
 z0  +----+-----------------------------------------------+
     x0  x8                                  x30         x62
```

---

## B9 - The Plot (finale)
| Field | Content |
| --- | --- |
| Real purpose | The bunker's operations room, where the regional plot was tracked: a two-storey-deep well with the plotting floor and map table at the bottom, glazed cabins on balconies at 4.5 and 9.0, the controller's bridge across the north end at 9.0, the pneumatic message-tube system, and the exit lift to the surface. Final exercise: recover the case, turn both keys, extract. |
| Size, shape | 44 x 52, 14 high; plot floor x 8..36, z 8..44; balcony B-1 (4.5) on west, south and east (3 m deep) with cabins; balcony B-2 (9.0) west and east; the bridge z 40..43 at 9.0; enclosed stairs in the SW and SE corners (0 -> 4.5 -> 9.0); the lift lobby x 18..26, z 44..52. |
| Verticality | Three floors; rappel from the bridge, zipline from B-2 east to the lift lobby. |
| Colour | Mixed: 3000 K pendants over the floor, 4000 K balconies, the back-lit map table (cyan), 6500 K lift lobby, red alarm beacons. |
| New mechanics | Everything together; split and converge (two keys), Sync (two-key lift), clutch save, downed / revive / drag a downed partner / medkit on a mate (Phase 5), alarm panel and reinforcements, a dog (smell in the dark), a sniper, an enforcer, a heavy, an officer on a manned desk, team results. |
| Guards | 7 (B9-1 heavy, B9-2 handler + B9-D dog, B9-3 sniper, B9-4 enforcer, B9-5 rounds, B9-O controller). |
| Lead / second | P1 / P2 (each takes one key; the case is the lead's). |

Objectives (course framework, `ObjectiveChain` style):
| Order | Objective | Where | Notes |
| --- | --- | --- | --- |
| 1a | Key A | B-1 west cabin (x 0..8, z 24..32, y 4.5), in the cabin desk drawer (`wafer` lock, V2; now: open) | parallel with 1b (split and converge, C15) |
| 1b | Key B | B-1 east cabin (x 36..44, z 14..22, y 4.5), in a locker (`pin` lock, V2; now: open) | |
| 2 | The case | B-2 east, the senior controller's cabin (x 36..44, z 30..40, y 9.0) | the lead carries it (slower: carry speed as a body? no: an item, no speed cap) |
| 3 | Two-key lift | lift lobby: key switches K-A at (19.5, 46) and K-B at (24.5, 46), 5 m apart | both turned within 1.0 s (TUNE): Sync (C12; now: the course gate "two switches at once") |
| 4 | Extract | both inside the lift L9 -> the lift rises -> team results | |

Routes (each objective has at least two):
- Floor (shadow): the dark ring under the balconies (B-1's underside, 4.5 clear), between plotting stands, round the map
  table (low cover, glowing: avoid its light).
- High: the stairs or a boost to B-1 (one balustrade gap at the north-west where the balcony edge is a planned co-op lip,
  4.5 over the floor), along the cabins, up to B-2, the bridge; rappel from the bridge down to the floor north end; the
  zipline from B-2 east to the lift lobby's mezzanine rail (finishing launched onto the lobby floor).
- Loud: straight across the plot floor.
- Secret: the pneumatic tube duct (1.5 x 1.2, a builder's-work duct for the message tubes) from the B-1 west cabin's
  tube station down inside the west wall to an inspection door in the lift lobby.
- Loop: round the map table; round the B-1 south cabins (two doors each).

Ghost plan (D32, D33). B9 can be ghosted (Ghost tier: never seen, nobody touched), but only with careful planning:
- Overlapping coverage: every crossing on every route is watched by at least two of B9-1 (heavy), B9-2 / B9-D (handler
  and dog), B9-3 (sniper), B9-4 (enforcer), B9-5 (rounds), CAM-P1 and the controller's feeds. Each crossing opens for 3-5 s
  (TUNE) once per watcher cycle, and only when two cycles line up; T7b tunes the routes so each gap exists and lasts
  at least 3 s.
- Sync moment 1 (the plot floor): the west ring under B-2 west is in the sniper's view and CAM-P1's sweep. It opens only
  while the sniper looks east. One player on B-1 east throws a noisemaker onto the floor's east side on the Sync count (Phase 5; until then the players count it
  themselves with pings)
  (the sniper and the handler turn to it, B9-1 glances); the other crosses the west ring in that window. Nobody is
  touched; the noise is investigated by the dog, which must not find either player.
- Sync moment 2 (the lift lobby): the lobby is lit (P3), on CAM-P2 and held by B9-4. The P3 switch is inside the tube
  duct's inspection door; the zipline lands in the lobby from B-2 east. One player switches P3 off from the duct door on
  the count while the other lands from the zipline in the same second; with P3 out the enforcer's view of the landing
  is dark, and the controller sees only a dark feed (no video-loss event). Either alone fails: lights out without the
  landing sends B9-4 to the switch (the duct player is found); the landing in light is seen.
- Then the keys (pair gate, within 1.0 s). Silent tier: knock-outs without an alarm; Loud: an alarm.

Devices: CAM-P1 sweep over the floor (north wall, y 6.0, 135..225), CAM-P2 fixed on the lift lobby (y 3.0, facing N);
manned desk on the bridge (B9-O at it: feeds CAM-P1, CAM-P2); a high beam across the lift lobby threshold (z 44, y 1.4);
PIR on B-2 west; alarm panel (`MapLayout.alarms`) on B-1 south (x 20, z 1.5, y 4.5); reinforcement point: the staff
tunnel door at the floor's south-east (x 40, z 0) (`MapLayout.reinforce`); wall medkit on the floor's north-west.

Guard sheets:
| Field | B9-1 heavy | B9-2 handler + B9-D dog | B9-3 sniper | B9-4 enforcer | B9-5 rounds | B9-O controller (officer) |
| --- | --- | --- | --- | --- | --- | --- |
| Job | Guards the map table | Dog patrol of the floor | Overwatch from B-2 west | Holds the lift lobby | Balcony rounds on B-1 | Runs the exercise from the bridge desk |
| Route | Post (33, 26) beside the map table facing W (the entrance); glances N every 10 s | (14, 14) wait 3 face E -> (24, 14) wait 3 face N -> (24, 19) wait 3 face W -> (14, 19) wait 2 face W -> loop; 30 m at 0.9 m/s (the dog heels) = 33 s + 11 s = 44 s | Post (3, 30, y 9.0) facing E over the floor; relocates along B-2 west (5-22 m) after shots | Post (22, 45) facing S | Back-and-forth on B-1: (4, 12, y 4.5) wait 3 face E -> (4, 4) wait 3 face E -> (10, 4) wait 3 face N -> back the same way; 28 m = 31 s + 12 s = 43 s | Seat on the bridge (22, 41.5, y 9.0) facing S; feeds |
| Isolation | None (post); from behind via the dark ring | The handler at (24, 19) facing W, t 26-29 s (the dog smells a player within its smell range in the dark: dogs are the exception to darkness, archetype) | Alone on B-2 west at all times (the clutch-save target: he detects a partner on the floor, the team-only marker shows, the other player on B-2 takes him before his radio window ends) | None; flank or shock | (10, 4) facing N, alone, dark | Alone on the bridge; a rappel drop takedown from the bridge rail is not possible (he is on it): grab from behind, interrogate (the lift code text: flavour) |
| Covers | The floor centre | The floor | The floor and B-1 east | The lobby | B-1 west and south | Through the feeds |
| Lures | Noise at the stair doors | A noisemaker in the dark ring (the dog investigates first) | EMP or pistol secondary on his lamp; a flashbang from below | Noise at the tube duct door | A shot cabin lamp | CAM trouble (video loss dispatches a guard; he stays) |

Sequence (one of many): the team splits from the A8 vantage (south-west, floor level, dark). Lead: stairs or boost to
B-1 west -> Key A -> up to B-2 west (the sniper: take him, or crouch past behind him) -> along the bridge (grab B9-O
from behind) -> B-2 east, the case -> zipline to the lift lobby. Second: floor ring east -> SE stair to B-1 east -> Key B
-> back down -> the tube duct is west, so the second deals with B9-4 at the lobby (flank, shock, or lights out on P3)
-> the beam (crouch under). Both at the keys: Sync (3-2-1) -> the lift -> results.
Failure: a downed partner is dragged into the dark ring before the revive (Phase 5) or revived in place; a medkit on a
mate (Phase 5); both down restarts the bay at A8. An alarm (B9-5 or B9-O reaching the panel) brings reinforcements
through the staff tunnel: the team can disable the panel with a hold.
Co-op split and gate: two keys in opposite cabins, turned together; the case can be carried by either. Lock behind: the
lift (end).

Light plan:
| Id | Fitting | Circuit | Switch | Notes |
| --- | --- | --- | --- | --- |
| L9-P1..6 | Pendants 3000 K over the plot floor | P1 | Lighting board in the B-1 west cabin | Breakable. |
| L9-B1..8 | Balcony downlights 4000 K | P2 | Lighting board; each stair door | |
| L9-C1..6 | Cabin desk lamps | own each | In each cabin | |
| L9-T | Map table back-light (cyan) | equipment | none (EMP-able, shootable panel) | Lights the floor centre: avoid it. |
| L9-L1..3 | Lift lobby downlights 6500 K | P3 | Lift lobby | Breakable. |
| L9-S | Sniper's balcony lamp | P2 | Lighting board | The sniper's lure. |
| L9-A1..4 | Red alarm beacons | alarm | on with the alarm | |
| L9-E | Exit sign over the lift | none | none | |
Lit chokepoints: (1) the lift lobby (P3, CAM-P2, B9-4): darkened by the P3 switch, shots, EMP, pistol secondary on
CAM-P2 and the lamps; avoided by the tube duct or the zipline from above. (2) The stair doors on B-1 (P2): darkened at
the lighting board or by shots; avoided by the boost gap or the rappel. (3) The plot floor centre (L9-T): avoided by the
dark ring.
Sound: plot floor lino (quiet); balconies steel grating (loud); stairs concrete; cabins carpet.

Sketch (plan; heights in brackets):
```
 z52 +---------[ L9 lift ]--------+
     |   lift lobby  K-A  K-B      |  CAM-P2, beam z44
 z44 +====bridge (9.0) desk O=======+
     |B-2|                     |B-2 east (9.0) case cabin
     |W  |   plot floor (0)    |
     |(9)|   [ map table ] H   | B-1 east cabin: key B (4.5)
     |B-1|   dog loop          |
     |W  |                     |
     |key A cabin (4.5)        |
 A8  |SW stair             SE stair
 z0  +====B-1 south (4.5) panel=====+ staff tunnel (reinforce)
     x0  x8                   x36  x44
```

---

## 10. Element register (level-design 16.9)
Every route element. Airlocks, lamps and devices are in their bay tables above with their reasons.
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| E-B1-1 | Operator lockers | Personal kit storage in the guardroom | Kit start; hide spot lesson | 16.4.1 |
| E-B1-2 | Dark store shelving | The guardroom's store | Light meter, night vision | 16.4.1 |
| E-B2-1 | Glazed walkway | The cable hall supervisor's walkway | Lanes see each other | 16.3.1 |
| E-B2-2 | Plinths, rails, block walls | Cresset's course obstacles on old cable-drum plinths | Step, vault, mantle | 16.4.1 (training props, named) |
| E-B2-3 | Galleries G1-G3 | The old cable galleries | Ladder, pipe, hang | 16.2.6 |
| E-B2-4 | Cable-support pipe across a cut gallery | Trunk cable support, gallery removed when the cables came out | Horizontal pipe | 16.0 |
| E-B2-5 | Cast-iron downpipes | Gallery gutter drains (the hall had a leaking roof slab) | Drainpipe | 2.5 (every one of that kind climbable) |
| E-B2-6 | Beam ledges and the column | The hall's crane-rail beam and a structural column | Shimmy, corner, gap jump | 16.1.3 |
| E-B2-7 | Lane cross walls with doors and inspection windows | Cresset's lane gates in the old hall's bay walls | Gate; open vs glazed window | 16.3.5 |
| E-B2-8 | Drop pads and pit | Course landing pads | Landing bands | 16.4.1 |
| E-B2-9 | Cable trench | Original trench, covers lifted | Manual jump | 16.7.1 |
| E-B3-1 | Riser casing | Concrete casing of the shaft's cable risers | Split gap | 16.0 |
| E-B3-2 | North wall lip | The headframe's ring beam at G3 | Wall jump | 16.1.3 |
| E-B3-3 | Damper bar | The shaft damper's operating bar | Pipe legs up, inverted | 16.0 |
| E-B3-4 | Hoist beam | Lifting beam for fan parts | Rappel point | 16.0 |
| E-B3-5 | Spoil ropeway cable | Construction-era spoil ropeway, re-tensioned by Cresset | Zipline | 16.0 |
| E-B3-6 | Fan guard fence | Mesh guard round the fan pit | Fence | 16.4.1 |
| E-B3-7 | Fan discharge duct + grille | The fan's discharge into the plant corridor | Duct crawl, grille unscrew / kick | 16.3.4, 16.7.1 (SPEC E6) |
| E-B3-8 | Plant ladder and catch nets | Shaft maintenance ladder; working-at-height nets | Recovery after a fall | 16.2.1 |
| E-B4-1 | Cell walls 4.4 | Reservoir cell walls | Co-op lips (boost, human ladder) | 11.3 |
| E-B4-2 | Inspection door, bolted downstream | Cell access for cleaning | One-side gate | 16.3.5 |
| E-B4-3 | Sluice gate + handwheel | Cell isolation sluices | Timed hold | 16.3.1 |
| E-B4-4 | Valve gallery + cell ladders (C1, C2 padlocked) | Reservoir valve gallery; Cresset's drill padlocks | Circulation; the drill | 16.2.1 |
| E-B4-5 | Overflow channel, float shaft, sump, outlet platform | Reservoir overflow, float valve, sump and outlet | Phase 5 team-move drills | 16.7.1 |
| E-B5-1 | Gensets | Standby diesel sets | Cover; roofs: high route | 16.4.1 |
| E-B5-2 | Cable trench + gratings | Power cable trenches | Loud floor; secret route | 16.7.1, 16.7.3 |
| E-B5-3 | Cable gallery + ladder | Cable trays along the wall | High route | 16.2.1 (plant) |
| E-B5-4 | Mains breaker | Main incomer breaker | Lights out; mag lock gate | 16.8.1 |
| E-B5-5 | A5 mag-locked fire door | Fail-safe fire door on a mag lock | Gate | 16.3.5 |
| E-B5-6 | Day tank, fuel bay | Generator fuel | Cover, PIR | 16.4.1 |
| E-B6-1 | Counter, partitions, desks | Reception and office furniture | Low cover | 16.4.4 |
| E-B6-2 | Enclosed stair to CR behind RD2 | Control room access on a card | Circulation, card gate | 16.2.1 |
| E-B6-3 | Supply duct + records grille | Office air supply from the plant | Duct crawl, vent drop (SPEC E6) | 16.3.4 |
| E-B6-4 | Mantrap, iris, egress button | Secure-zone entry; request-to-exit inside | Security gate | 16.3.5 |
| E-B6-5 | Lockers, records PC, CRAC, keypad | Staff lockers, records, cooling, server room PIN | Lockpick, hack, fault, code | 16.3.1 |
| E-S6-1 | Stair 6 | The bunker's main stair to the deep level | Quiet connector | 16.2.4 |
| E-B7-1 | Kill house | Cresset's training building | Takedown spaces | 16.0 |
| E-B7-2 | Water main | Supply to the deep level | Pipe, drop and inverted takedowns | 16.0 |
| E-B7-3 | Rock-bolting bench + plant ladder | Cavern rock-bolting platform | Lip, shimmy | 16.2.1 |
| E-B7-4 | Annex roof, parapet, roof hatch | Kitchen annex; roof edge; roof access | Wall jump, ledge pull, window takedown | 16.2.5 (hatch), 16.5.3 |
| E-B7-5 | Sandbags, skip, recesses | Range leftovers; spoil skip; excavation niches | Cover, hides | 16.4.1 |
| E-B7-6 | Secure store door + keypad | Cresset's ammunition store | Gate | 16.3.5 |
| E-B8-1 | Benches, stands, dummies, barrels, lamp gantry | Range equipment | Weapon drills | 16.4.1 |
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
| A1 | 1 | Airlock cycle | - | - | First regroup |
| B2 Lanes | 2 | Ground and climbing verbs | Momentum chains | A2 | Showing off side by side |
| A2 | 1 | - | - | - | - |
| B3 Intake | 3 | Split, wall jump, pipe, rope, zipline, fence, duct | Climbing | A3 | Vertigo, then a quiet crawl |
| A3 | 1 | - | - | - | - |
| B4 Cistern | 2 | Team moves | Climbing + team | A4 (medkit) | Puzzle-like teamwork |
| A4 | 1 | - | - | - | - |
| B5 Standby Plant | 3 | Light, sound, first guards | Movement + light | A5 | First real stealth |
| A5 | 1 | - | - | - | - |
| B6 Mock Site | 4 | Corners, security, tools | Light + guards + tools | S6 stair | Heist |
| S6 / A6 | 1 | - | - | glimpse of the house | Breathe |
| B7 House | 4 | Takedowns, bodies, interrogation | Everything stealth | A7 | Predator |
| A7 | 1 | - | - | - | - |
| B8 Range | 4 | Weapons, gadgets, combat | Loud play | A8 (medkit) | Noise and release |
| A8 | 1 | - | - | - | - |
| B9 Plot | 5 | Sync, split and converge, revive | Everything | The lift | Finale |
Tension rises overall (1, 2, 3, 2, 3, 4, 4, 4, 5) with a release (an airlock) after every bay. First run 45-60 minutes
(D34), about 5-6 minutes a bay with every drill done.

## 12. Tool / problem matrix
| Problem | Tools (at least three each) |
| --- | --- |
| Lit post (B5-G2, B9-4) | Darkness route, circuit switch, shoot the lamp, EMP, pistol secondary (V3), lure, takedown from behind |
| Talking pair (B7-P1/P2) | Dual takedown / Sync, noisemaker lure, gas, avoid by the back door |
| Patrol over a crossing (B5-G1, B6-GR) | Timing gaps, lights out, the trench / duct, high route, takedown at the isolation spot |
| Locked route (every gate) | Partner action, card / clone / iris, lockpick, hack, code from a feed or interrogation |
| Loud floor (grating, chequer plate, gravel) | Silent gears, the parallel quiet floor, masking (Phase 2), hang-drop instead of a jump |
| Camera (B6, B9) | Darkness, sweep timing, loop / off at the panel, shoot, EMP, pistol secondary, take the operator |
| Beam (B6, B9) | Crouch under (high), jump over (low), panel beams off |
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
| B2 drop pads | 2.0 / 3.2 / 5.0 | soft < 2.5, roll <= 4.5, heavy > 4.5 | `LANDING` movement.ts:204 |
| B2 gap jump | 2.2 | <= 2.5 | `findJumpTarget` |
| B2 L2 depth | 0.4 | >= 0.38 to climb up | `LEDGE.climbDepth` anchors.ts:194 |
| B2 gallery lips 4.0, 4.5 | reached by ladder / downpipe | lips >= 1.9 | `LEDGE.minDrop` anchors.ts:190 |
| B3 split gap | 1.6 wide, 4.3 m faces | 1.2-1.95, >= 3.6 | `SPLIT` movement.ts:255 |
| B3 wall jump lip | 3.4 | 2.7-3.8 | `WALL_JUMP` movement.ts:283 |
| B3 rope | 17.4 m to the floor (y 0) | unhook at 2.0 | `RAPPEL.unhookHeight` |
| B3 fence | 2.4 | `FENCE.reach` 0.85 to grab | movement.ts:345 |
| B4, B9 co-op lips | 4.4, 4.5 | 4.3-4.5 (out of solo 3.8 + 0.5, under `TEAM.boostMax` 4.5) | level-design 11.3; movement.ts:286, 393 |
| B5 genset roofs | 3.0 | wall jump 2.7-3.8 | `WALL_JUMP` |
| B6, B9 beams | 1.4 high, 0.35 low, 1.2 apart | SN40, SN41, SN43 | S0 section 5 |
| B6 PIR | 3.2 mount | SN50 6 m range | S0 |
| B7 annex roof | 3.2 | wall jump | `WALL_JUMP` |
| B7 water main | 4.6 (drop to a guard 4.6 - 1.75 feet height) | drop takedown 1.2-5 m below | `game/takedown.ts` drop |
| B7, B8, B9 ducts | 1.5 x 1.2 (B5, B9), engine duct anchors (B3, B6) | crouch duct 1.5 x 1.2 (F32) | 16.7.3 |
| Guard cycles | 28-45 s (B7-P pair 34, B7-O 28) | 25-45 s | level-design 4.3 |
| Squads alive | at most 7 at once (B9) | `MAX_ALIVE` 12, `SQUAD_CAP` 9 | enemyManager.ts:25, infiltrationMode.ts:14 |

## 14. Self-critique (the 10 weakest points, with fixes)
| # | Weak point | Fix |
| --- | --- | --- |
| 1 | B2 is long and guard-free: two lanes of 15 items each can drag | Lanes run in parallel (half the time), the mid gate makes each player wait at most one half; LANTERN's lines are short; the T9 playtest times it (target 4 min) |
| 2 | B3 splits rappel and zipline between players | B9 reverses them (lead rappels in B3, second ziplines; in B9 the other player takes the zipline, and the rappel is open to both) |
| 3 | B4's padlocked ladders are a training rule, not architecture | Accepted under SPEC E7: the facility is a training site; the padlocks are visible and tagged |
| 4 | B5's breaker gate leans on Phase 1's guard reset, not built | Now form uses `lightsOut` (a calm guard investigates); the mag lock gate works either way |
| 5 | B6 is dense: three guards, nine devices, five tools | Every device has a now form; LANTERN gives one line per device; the operator / runner split halves each player's load |
| 6 | B6's exit code "from a feed" needs a desk console view nobody has specified | PLAN section 2 item 3: add it to S1 Part B, or the course framework's own console |
| 7 | B7's six takedown kinds depend on guards walking into their spots | Each spot is on a guard's loop with a lure that sends him there; the e2e places guards at the spots |
| 8 | B8's live fire may end in a firefight the players lose | Role-players aim like Rookie (host difficulty, step 19); the ghost option (take all three before live fire) exists |
| 9 | B9's seven guards with a dog and a sniper may be too much for a first run | Bay restart at A8; the alarm is survivable (disable the panel); T9 tunes posts |
| 10 | Coordinates are proposals; fitting 15 lane items in 48 m is tight | The build session fits them within +-1 m and re-runs the metrics check; any change goes in the progress log |

## 15. Playtest checklist (Michael's PC sessions and the e2e)
- Can a first-time pair read every patrol from each guarded bay's vantage within one cycle?
- Is any route strictly best in B5-B9?
- Is there a detection the players cannot escape?
- Did both players understand every detection?
- Did each player use every verb in FEATURES.md at least once?
- Did any gate leave one player idle for more than 60 s?
- Did any airlock cycle while a player was not inside, or fail to cycle with both inside?
- Did a remote pose ever look wrong (the partner's view) in any bay?
- Did the course feel like a real training bunker?
- Total time 45-60 minutes for a first run (D34)?
