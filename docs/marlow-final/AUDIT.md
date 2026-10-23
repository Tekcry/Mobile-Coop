# Marlow Yard (`ctcourse`) - audit of the yard as built (marlow-final, step 1)

Auditor, read only. Folder `C:/NightShift/Mobile-Coop-marlow-final`, branch `feature/marlow-final` (master af56ab43 + docs). Nothing was edited, built or run. Paths are relative to that folder. "x0" means the bay origin, `bayX(i) = 22 i` (`src/world/maps/ctcourse.ts:43`).

## Summary
- The yard is eight identical 16 x 14 m concrete boxes in a 170 m line, with a 6 x 6 m airlock between each pair (`ctcourse.ts:409-520`). Each box has one cross wall at x0 + 9, which is the obstacle, and nothing else that matters. This is the "simple square rooms with random walls" Michael described. There are no pipes, ladders or vents anywhere. The only traversal is generated lips on three walls and one roof.
- The yard has no live guards. There are two passive training guards who "see and hear nothing" (`ctcourse.ts:210-213`). So light, shadow, noise and timing play no part anywhere. All 31 lamps can be jammed or shot (`src/game/ctDevices.ts:347-352`), but nothing gives darkness a use. No light switches are placed.
- What is genuinely good: station 3 (a camera hallway that needs a real jam handoff, plus a security room) and station 5 (leg-up + relay + hang-down hack). Stations 2, 6 and 7 teach the right CT moves in a bare layout. Station 4 can be skipped: walking through the laser only raises the alarm. Stations 1 and 8 have no co-op exercise.
- A first co-op run takes about 7-12 min now. Michael asked for 15-20 min (BRIEF M3). A practised pair takes about 3-4 min (the spec target).

---

## 1. Map as built

### 1.1 Global facts
- Footprint x -1..171, z -1..15 (`ctcourse.ts:100`). Floor y 0. Perimeter and airlock walls are 7.5 m high (`FENCE`, `:33`, `:388-392`).
- Bay i spans x 22i .. 22i+16. Airlock A(i+1) spans x 22i+16 .. 22i+22, z 4-10 (`:348-351`, `:447-464`). The pockets beside each airlock (z 0-4 and 10-14) are sealed void, dressed as plant rooms (south) and as instructor booths at A3 / A4 (north) (`ctcourseVariety.ts:95-114`, `:207-216`).
- Every opening in a cross wall is a 1.2 m door at z 6.4-7.6 with a 2.1 m lintel (`DOOR_Z0`, `crossWall`, `ctcourse.ts:39-40`, `:223-228`).
- Ceilings (slab underside): S1 / S3 / S6 / S8 are 4.5 m, S4 is 5.5 m, S2 / S5 / S7 are 7.5 m. The airlocks have a 3.2 m lid (`:58`, `:61`).
- Theme: underground, `lightLevel` 0.30 (all fill), no moon (`:370-382`). `camSize` is "open". Airlocks, the annex interior and the security room are "tight" (`:634-640`).
- Spawns: x 2, z 6 and z 8, facing +x (`:612-615`). Nav seeds sit at each bay's x0 + 3, z 7 (`:610`).
- Course rules: an airlock cycles by itself once both players stand on its pad, nobody is down and the bay's drills are done. It takes 4 s (`courseState.ts:819-835`; `config/course.ts:7`). **No bay has drills** (`ctcourse.ts:341`), so the airlock never checks whether the station was completed. Only doors locked by gates hold players back (`courseState.ts:423-436`, `:800-805`).
- The course ends when both players are in the exit zone (`ctcourse.ts:216`; `courseState.ts:412`).

### 1.2 Totals
- **Lights: 31.** 7 airlock bulkheads plus 24 in the bays (counts per bay below). Colour is cool white, S4 faint red, render only (`:71-72`).
- **Guards: 2**, both passive: `s1-guard` and `s3-sec-guard`.
- **Cameras: 1** (`cam-s3`).
- **Lasers: 1 band** (3 beams) with 1 power panel.
- **Scanners: 1 pair.**
- **Course doors: 18.** A1-A7 near and far, S2-door, S5-door, S5-grid, S6-door. Plus 1 plain door to the security room.
- **Medkits: 2.**
- **Optional panels: 8**, one per station, at x0 + 3.5, z 13.6 (S3's at x 45.6) (`:522-528`).
- **No placed anchors** (no ladders, pipes, vents or rope anchors); `e2e-anchors.mjs:9` skips the map. The only lips are the S2 and S7 wall tops, the S5 roof front and the S7 return stair (`tests/ctcourse.test.ts:408`).

### 1.3 Plan (generated from the code; 1 char = 1 m in x, 1 row = 1 m in z, north up)
```
x 0-88  (tens digit of x every 10 m; north = z 14 at top)
     0         1         2         3         4         5         6         7         8
 13  ...n............|####|...n....HH......|####|.n.|###|     |..|####|...n.....|..R...|####|
 12  ................|####|........HH......|####|...|###|     |..|####|.........|......|####|
 11  ................|####|........HH......|####|...|###|k    |..|####|.........|......|####|
 10  ................|####|........HH......|####|...|###| g   |..|####|.....j...|......|####|
  9  ................------........HH......------...|###|      ..------.........:......------
  8  ..2.............|====|........HH......|====|...|###-------..|====|.........:......|====|
  7  ....*.......*....=A1=.....*....b..*....=A2=..*.|#########|*..=A3=.....*....:..*....=A4=.
  6  ..1..............====..................====....|#########|...====..........:.......====.
  5  ................|====|........HH......|====|...|#########|..|====|.........:......|====|
  4  ................------........HH......------...|#########|..------.........:......------
  3  ..........G.....|####|........LH......|####|...|=========|..|####|.........|......|####|
  2  ................|####|........HH......|####|................|####|.........|......|####|
  1  ................|####|........HH......|####|.<..~.*~..~*...C|####|.........|......|####|
  0  ..........dd....|####|........HH......|####|................|####|.........|..P...|####|

x 88-170
       9         0         1         2         3         4         5         6
 13  ...n.....|rr|rr+|####|...n.S...|......|####|...n....HH......|####|..+n.....|......
 12  .........|rr|rrr|####|.....'...|......|####|........HH......|####|.........|......
 11  .........|rr|r*r|####|.....'...|......|####|........HH......|####|.........|......
 10  .........|rp|rrr|####|m....'...|......|####|........HH......|####|.........|.EEEE.
  9  .........|rr|rrr------m....'...|......------........HH......------.........|.EEEE.
  8  .........|rr|rrr|====|m....'...|......|====|........HH......|====|.........|.EEEE.
  7  ....*....rr*rrrr.=A5=.....*'......*....=A6=.....*...H@..*....=A7=.....*......E*EE.
  6  .........rrr*rrr.====......'...........====.........HH.......====............EEEE.
  5  .........|rr|rrr|====|.....'...|......|====|........HH......|====|.........|.EEEE.
  4  .........|rr|rrr------.....'...|......------........HH......------.........|.EEEE.
  3  ........L|rp|r*r|####|.....'...|......|####|........LH......|####|.........|.EEEE.
  2  .........|rr|rrr|####|.....'...|......|####|........HH......|####|.........|......
  1  .........|rr|rOr|####|.....'...|......|####|........Hsss....|####|.........|......
  0  .........|rr|rhr|####|.....S...|......|####|........HH......|####|.........|......
```
Legend:

| Symbol | Meaning |
| --- | --- |
| `|` | Cross wall (a gap is a door) |
| `HH` | 1 m thick 4.4 m wall (S2, S7) |
| `#` | Sealed void |
| `====` inside `A1`-`A7` | Airlock pad |
| `-` / `=` (in S3) | Wall along x |
| `*` | Lamp |
| `n` | Optional panel |
| `1` / `2` | Spawns |
| `G` | S1 guard |
| `d` | S1 desk |
| `L` | Leg-up square |
| `b` | Bolt |
| `<` | S3 send-back spot |
| `~` | Hallway lamps |
| `C` | Camera |
| `g` | S3 duty guard |
| `k` | Security console |
| `:` | Laser band |
| `R` | Laser release |
| `P` | Laser power panel |
| `j` | Panel jam spot |
| `r` | Annex under its roof (roof top 4.4) |
| `p` | Roof plates (on the roof) |
| `O` | Roof hatch |
| `h` | Hack panel |
| `+` | Medkit |
| `S` / `'` | Scanners and the painted pair line |
| `m` | Server racks |
| `s` | Return stair |
| `@` | Rope holder strip |
| `E` | Exit zone |

### 1.4 Areas in route order

| Area (x / z) | Teaches | Built (props, lights, guards, devices, gates) | Anchors / connections |
| --- | --- | --- | --- |
| **S1 Induction hall** x 0-16 (ceiling 4.5) | Nothing is required. Read the panel; optional grab and INTERROGATE | Passive guard `s1-guard` at x 10.5, z 3.2, facing +x, with 2 info lines (medkit locations) (`ctcourse.ts:203-213`). Sentry desk (collide off) x 10.3-12.1, z 0.9-1.7 (`ctcourseVariety.ts:37-46`). Lift doors and blast frame on the west wall (`ctcourse.ts:394`; `ctcourseVariety.ts:49-57`). 2 flush strips at x 4 / 12.5, y 4.35, 0.9 intensity, radius 13 (`ctcourse.ts:438-440`). No gate except the panel pickup (`:288-289`, `:335`) | None. Leads to A1 (x 16-22) |
| **S2 Leg-up wall** x 22-38 (7.5) | CT drill 1, leg-up; one opens the way for the other | Wall at x 31, 1 m thick, 4.4 m, full width, door z 6.4-7.6 (`:508-513`). Bolt gate `g-s2` on `S2-door`, opened from +x only (`:293`). Leg-up square x 30, z 3.5, plus a yellow band on the wall face (`:516`, `:536`). Lights: 2 pendants at y 5 (x 26, 34.5) and a wall-top strip at x 31.9, y 7.35, z 5, 0.5 intensity, radius 7.6 (`:420-428`, `:534`) | Generated 4.4 m lip on both faces. A2 at x 38-44 |
| **S3 Camera hallway + security room** x 44-60 (4.5) | CT drill 2, the jam handoff; optional security room | Entry lobby x 44-47 (full width). Hallway x 47-57.6, z 0.15-3.05. Far lobby x 57.6-60. The rest is void (`:116`, `:477-490`). Camera `cam-s3` at x 59.6, z 1.6, y 2.4, facing west, sweep 262-278 deg, pitched to 6.5 m. It sees by IR, so lamps do not affect it (`:117-119`, `:191-193`; marlow-jammer BRIEF M3). Hard rule: a player the camera catches is sent back to x 45.5, z 1.6 (`:125-135`). Flag gate `g-s3` (both players in the far lobby, x 57.8-59.7) unlocks `A3-near` (`:300`). Security room x 51.6-57.6, z 8-14, plain door at x 57.6, z 9.2-10.4 (`:181`, `:485-493`). Passive guard `s3-sec-guard` at x 53.25, z 10.75 facing the monitors (`:184`, `:212`). Console `sw-s3-console` at x 52.55, z 11.6 sets `cams-off-s3` once the guard is down (`:301`, `:542`, `:631`). Monitor wall and desk (`ctcourseVariety.ts:64-89`). Lights: 4 strips at y 4.35: hallway x 50 / 55, z 1.6, radius 8; lobbies x 45.5, z 7, radius 11 and x 58.8, z 7, radius 9. Plus a room panel at x 54.6, z 11, 0.8 intensity, radius 6 (`ctcourse.ts:87-92`, `:432-436`). Instructor booth face in the far lobby (`ctcourseVariety.ts:215`) | None. A3 is reached only via the far lobby |
| **S4 Laser line** x 66-82 (5.5) | CT drill 3, partner throw over a laser; jam alternative | Wall at x 75 up to the ceiling, 6 m gap at z 4-10, header from 4.6 m (`ctcourse.ts:465-471`). IR band of 3 beams (0.35 / 0.9 / 1.45 m) across the gap, visible only in night vision (`:149`). Red release `sw-s4-release` at x 78, z 13.6 (pickup `g-s4`, sets `s4-release`) (`:305`, `:546-547`). Power panel `panel-s4` at x 78, y 4.0, z 0.15, jammed from x 71.5, z 10.5 (`:157-159`). Marks at x 73.4 / 77.2 (`:475-476`). Lights: 2 strips at y 5.35, 0.85 intensity, faint red (`:438-439`) | None. A4 at x 82-88 |
| **S5 Annex (kill-house)** x 88-104 (7.5) | CT drill 4, leg-up, relay, two plates, hang-down hack | Front wall at x 97, 4.0 m, with `S5-door`. Grid wall at x 100.5 with `S5-grid` (`:513`, `:564`). Roof slab y 4.0-4.4 over x 96.85-104 (`:553-557`). Hatch 0.55 m at x 102.125-102.675, z 1.0-1.55, with a striped frame, a holder square and the cover lying beside it (`:164`, `:558-563`). Pair gate `g-s5` (roof plates at x 99, z 3.6 and 10.4, y 4.4, 1 s window) opens `S5-door` (`:315`, `:571-574`; `config/course.ts:22`). Lever `g-s5-grid` = the hack panel at x 102.4, z 0.4, y 1.2 (`:316`, `:577`). Medkit at x 103, z 13.6 (`:622`). Plywood skin and painted windows (`ctcourseVariety.ts:117-138`). Lights: pendant at x 92, y 5; roof strip at x 100.5, y 7.35, radius 13; 3 annex panels at y 3.85 (x 99, z 7; x 102.2, z 3; x 102.6, z 11.5) (`ctcourse.ts:422-427`, `:566-569`) | 4.4 m roof-front lip (leg-up square x 96, z 3.5). Hang-down through the hatch. A5 at x 104-110 is entered from the back room |
| **S6 Vault vestibule** x 110-126 (4.5) | CT drill 5, paired scanners (two-key sync) | Scanners A at x 115, z 0.4 and B at x 115, z 13.6, with frames and a painted pair line (`ctcourse.ts:580-587`; `ctcourseVariety.ts:141-146`). Flag gate `g-s6` (`s6-sync`: 2 s hacks, 1.5 s window, 10 HP cost on a fail) opens `S6-door` in the bulkhead at x 119 (`ctcourse.ts:308`; `scanners.ts:12-16`). 4 solid 2 m racks at x 110.6, z 8.3-10.2 (`ctcourseVariety.ts:147-151`). Lights: 2 strips at y 4.35 | None. A6 at x 126-132 |
| **S7 Rope wall** x 132-148 (7.5) | CT drill 7, two-person rope | Solid wall at x 141, 1 m thick, 4.4 m, full width, no door, no gate (`ctcourse.ts:310-312`, `:494-497`). Holder strip and anchor plate on top (`:595-597`). Return stair on the far side (blocks at x 141.5-144.5, z 0.4-1.6, tops 3.3 / 2.2 / 1.1) (`:598-601`). Lights: 2 pendants at y 5 and a wall-top strip at x 141, y 7.35, 0.7 intensity, radius 5 (`:594`) | 4.4 m lips on both faces and the stair ledges. Leg-up square x 140, z 3.5. A7 at x 148-154 |
| **S8 Extraction lobby** x 154-170 (4.5) | Nothing. Walk through, both into the exit zone | Bulkhead at x 163 to the ceiling with an open doorway (`:498-507`). Exit zone x 165.5-169.5, z 3-11 (`:216`, `:604`). Medkit at x 156, z 13.6 (`:623`). Exit coffer with green LEDs (`ctcourseVariety.ts:177-187`). Goods-lift doors on the east wall (`ctcourse.ts:395`). Lights: 2 strips at y 4.35 | None. End |
| **A1-A7 Airlocks** | Both players on the pad, a 4 s cycle, the checkpoint | Caged bulkhead lamp at x0 + 19, y 3.05, 0.35 intensity, radius 7. 3.2 m lid with haunches. Green pad 4 x 4 m (`ctcourse.ts:450-463`) | Near door unlocked (A3-near gated); far door locked until sealed (`courseState.ts:427-428`) |

---

## 2. Per-area verdicts

| Area | Verdict | Reason |
| --- | --- | --- |
| S1 Induction hall | REWORK | An empty 16 x 14 m box with no co-op. The guard is a passive statue (`ctcourse.ts:211`), so the grab and interrogate is a solo beat in an empty room. The arrival fiction is worth keeping. |
| A1-A7 Airlocks | REWORK | Seven identical 4 s locks (`:447-464`; `config/course.ts:7`) cut the route into equal boxes. Keep the both-on-pad checkpoint, but use fewer locks and place them as connectors. |
| S2 Leg-up wall | REWORK | Right lesson (CT drill 1, real bolt), but it is a free-standing 4.4 m wall that stops 3.1 m under a 7.5 m ceiling and is called a "blast bulkhead" (`:58`, `:508-513`). That fails the reason test (`docs/level-design.md` 16.0). The booster idles once the partner is over. |
| S3 Camera hallway + security room | KEEP | The only area built as a co-op scenario. The handoff is enforced by the send-back rule (`:121-135`). The security room is a real alternative (`:166-187`). Fixes needed: the room guard is passive and the camera end is dark (section 3). |
| S4 Laser line | REWORK | It can be skipped: a beam break only raises the alarm stage (`ctDevices.ts:953-959`). The release gate is a pickup that locks no door (`courseDef.ts:189-191`), and the airlock does not ask for it (`courseState.ts:800-805`). The throw is optional. |
| S5 Annex | KEEP (REWORK the plates) | The most purpose-built area (CT drill 4: leg-up, relay, drop-line hack, a real back room) (`:549-578`). The roof plates are a side-by-side press that repeats S6 (`:571-574`). The route backtracks off the roof. |
| S6 Vault vestibule | REWORK | The two-key sync is right (`scanners.ts`), but it is two panels on opposite walls of an empty box (`ctcourse.ts:580-587`). There is nothing to protect or time it against. |
| S7 Rope wall | REWORK | A copy of the S2 wall (`:494-497`). The rope is not enforced: the ledge relay from S5 also gets the second player up (`teamMoves.ts:60-62`). The return stair exists only to prevent being stranded (`:598-601`). |
| S8 Last wall + exit | CUT as built | A doorway and a green square (`:498-507`, `:604`). No co-op; CT's final launch was never built (`docs/ct-prototype/B8-REVIVE.md:271`). The finale is meant to use everything (`docs/level-design.md` 6.1). Keep only the exit-zone both-in rule. |
| Dressing (`ctcourseBunker.ts`, `ctcourseVariety.ts`) | KEEP as a kit | The fiction props (plant rooms, booths, plywood, racks, coffer, hazard frames) are reusable. They are all collide off except the racks, and do not affect gameplay. |
| Medkits | REWORK | Nothing in the yard hurts a player except a failed scanner hack (10 HP, floor 1 HP; `B6-SCANNERS.md:173`) and friendly fire. Both medkits (`ctcourse.ts:620-624`) have no use. |

---

## 3. Flow problems

**Station 4 can be skipped.**
- Lasers deal no damage (sector-fixes C) and only raise the alarm stage, which never ends the run (`ctDevices.ts:953-973`).
- `g-s4` is a pickup with no door (`ctcourse.ts:305`), and the A4 near door is never locked (`courseState.ts:423-436`).
- A pair can walk through the beams and onto the A4 pad. This breaks the spec's "no station skippable" (`docs/ct-prototype/CTCOURSE-SPEC.md:3`).

**Station 7's rope is optional.** After the leg-up, the hanging player can offer the ledge relay, which works at any ledge (`teamMoves.ts:60-62`).

**Station 5's rope alternative.** The first player on the roof can also drop a rope for the second, since the 4.4 m drop is inside the rope's 2.2-6 m band (`B7-ROPE.md:205`). Not a fault, but the relay is not forced either.

**Same box every time.** Eight 16 x 14 m cells, each with one full-width wall at x0 + 9 (`ctcourse.ts:409-520`). The areas differ only by the colour band (`ctcourseBunker.ts:25`). This breaks:
- 16.6.2 (a purpose for every space);
- 6.1 (teach, test, twist; a finale that combines everything);
- 6.4 (landmarks).

**No co-op at all in S1 and S8.** S1 has nothing to do (`ctcourse.ts:288-289`). S8 is a walk (`:318-320`).

**Partner idles.**
- S2: the booster waits while the partner unbolts.
- S4: the thrower waits for the release.

**Side-by-side solo actions.** The pair do the same thing at the same time, apart:
- S5 roof plates (two presses within 1 s, `config/course.ts:22`);
- S6 scanners;
- every airlock pad.

S5 and S6 teach the same "press together" twice.

**Leg-up three times on the same element.** S2, S5 and S7 all use a 4.4 m lip with a yellow square at x0 + 8, z 3.5 (`ctcourse.ts:52`, `:536`).

**Long empty walks.**
- 16 m of nothing in S1 and in S8.
- About 7 m of empty floor behind every obstacle wall.
- Seven airlock stops of roughly 10-15 s each (two doors plus the 4 s cycle) give about 1.5 min of dead time per run.

**Backtracking.**
- S5: up the roof at x 96, east to the hatch at x 102.4, back west to drop off the front edge at x 96.85, then east again through `S5-door` and `S5-grid` (`:549-578`).
- The S3 security room is a dead-end room. That is by design (`:166-173`) but needs to read as a side room.

**Unclear next step.**
- S3: the camera end and far lobby are very dark, and the camera is barely readable from the entry (`docs/marlow-jammer/STATE.md:5-6`).
- S4: the panel is deliberately hidden, the beams are invisible without night vision, and the release is on "the left wall" (`ctcourse.ts:243`).
- The jam binding is described three different ways. Game and panel text: LT aims, Co-op (RB / F) held jams (`ctcourse.ts:242`; `scripts/e2e-ctcourse.mjs:188-197`). The spec and walkthrough still say "held LT / Z" (`CTCOURSE-SPEC.md` row 3; `docs/course-ready/WALKTHROUGH.md` controls table).

**Lighting with no purpose.**
- With no active guards, every lit or dark area is cosmetic: there are no stealth stakes (`docs/level-design.md` sections 4 and 5).
- The camera ignores light (IR, marlow-jammer M3), so the four S3 lamps only feed the light meter.
- No lamp has a switch, and `MapDef.switches` is unused (`mapDef.ts:63-64`). This breaks 5.1 and 16.8.1.
- The S3 orange-red band (`#b54a2e`) reads as a laser or sweep line (`marlow-jammer/STATE.md:7`).

**No guard design.** Section 4 (jobs, 25-45 s clockwork, isolation moments, overlap, bodies) is absent. Patrol routes are supported (`src/world/rooms.ts:29-39`) but not used.

**One route per bay.** There is no shadow / high / loud choice (3.2), no loop (3.4) and fewer than two toys per space (7.2).

**Revive is never reached in normal play.** No source in the yard downs a player except friendly fire. The e2e forces it with 1000 damage at S8 (`e2e-ctcourse.mjs:801-824`).

**The finale rating is meaningless.** Only the last bay is rated (`courseRating.ts:1-8`), and S8 has no threat, so every run rates Ghost.

**Time pressure is loose.** The 5 s jam (`jammer.ts:16`) covers a 10.6 m hallway that takes about 2.7 s at the 4.0 m/s run (`movement.ts:160`), so the jam is never tight.

**Stale shot coordinates.** `scripts/shots-ctcourse.mjs:19` and `nv-shots.mjs:17` frame "s3-camera" at x 52, z 7, which is now inside the sealed void.

---

## 4. Co-op content

### 4.1 Exercised in the yard now

| Action | Where | Required? |
| --- | --- | --- |
| Leg-up (boost, `TEAM.boostMax` 4.5) | S2, S5, S7 | Yes, at each (one player) |
| Ledge relay (human ladder) | S5 roof; also works at S7 | Yes at S5 (or a rope); optional at S7 |
| Partner throw | S4 | No: the laser can be walked through |
| Hang-down (drop line) hack | S5 hatch to the hack panel | Yes (or the holder drops the partner into the back room) |
| Two-person rope | S7 (also possible at the S5 roof) | No: the relay works too |
| Bolt (one opens the door for the other) | S2 | Yes |
| Jammer handoff on a camera (5 s use, 5 s cooldown, 1.5 s reboot, joined jams allowed) | S3 | Yes (hard send-back rule) |
| Jam a laser power panel | S4 | Optional alternative |
| Jam or shoot lamps | Any lamp | Never needed |
| Security room: take out the guard, console turns cameras off | S3 | Optional (replaces the second jam) |
| Grab + INTERROGATE | S1 guard, S3 room guard | Optional (one player) |
| Pair plates (1 s window) | S5 roof | Yes |
| Paired scanners (2 s hack, 1.5 s window) | S6 | Yes |
| Both on the airlock pad | A1-A7 | Yes |
| Both in the exit zone; "Revive first" | S8 | Yes |
| Revive (30 s window, 2 per mission) | Anywhere, only after friendly fire | Not reachable in normal play |

### 4.2 Supported by the game or the framework but not used in the yard
- **Dual takedown.** Two takedowns by different players within 1.5 s give a banner (`src/net/coopHost.ts:57-58`, `:255-266`). The yard never has two guards at once.
- **Live guards with patrols and timed loops** (`rooms.ts:29-39`). Needed for "timed isolation" and for CT's Double Drop and ambushes.
- **Light switches and circuits** (`mapDef.ts:63-64`) and the course **`mains` gate**, which unlocks a door while a light group is off (`courseDef.ts:58-59`). Built for "timed isolation of lights"; unused.
- **Other gate kinds:** `hold` / `timedHold` (one holds while the other passes; `courseDef.ts:51-53`, `TIMED_HOLD_AFTER` 6 s), `egress` (57), `anchorLock` (62-63), per-player `pickup` (65), and drills with verbs (`courseDef.ts:89-104`; `drillDetect.ts`). All unused.
- **Hide spots** (`mapDef.ts:69`) and body carry (solo): no use without guards.
- **Ping callouts** (`docs/systems/coop.md`, Pings): never taught.
- **Door menu with optic cable, bash and stealth open** (`src/game/doorMenu.ts:11-32`): no room to scout.
- **Gadgets** relayed to the host (gas, flash, noise, sticky cam, mine): no targets in the yard.
- **Camera alarm stages beyond the banner:** no guard ever reacts.
- **Multiple lasers and panels** are supported (lists). **Only one scanner pair per map** runs (`ctDevices.ts:358`, `layout.scanners[0]`): a second sync-hack set piece needs a code change.

### 4.3 CT co-op moves not built in the game (from `docs/ct-research/moves-mechanics-digest.md:347-358`)
- Stack (shoulder stand): the wire mode `stacked` exists but is unbound (`B2-LEGUP-RELAY.md:48`).
- Living Key (forcing a captive onto a scanner) (`B6-SCANNERS.md:190`).
- Spotter-operator.
- Hand-off (sharing equipment) and feed share.
- Throw over wire, the final launch, and a throw that knocks out a guard at the landing (`B4-THROW.md:117-119`).
- Light jams: built (marlow-jammer), but not yet used for a gate.

---

## 5. Timings

**E2E driver.** `scripts/e2e-ctcourse.mjs` teleports between spots (`moveHost` / `moveClient`, `:98-106`). It uses real pad buttons only for team moves, crouch, climb, the pistol and the hack, and calls `onUse` directly for devices. The three parts (`:19`) and their last recorded runner wall times (`scripts/e2e-times.json:11-13`):

| Part | Stations | Time |
| --- | --- | --- |
| 1 | S1-S3 | 130 s |
| 2 | S4-S5 | 120 s |
| 3 | S6-S8 | 110 s |

These are software-GL times, not play times. The suite as a whole took 392-642 s before it was split (`B1`-`B7` docs).

What each part does:
- **Part 1:** S1 panel, the pause-menu restart, S2 real leg-up and bolt, S3. S3 covers the alarm, both send-backs, a stale-position guard, the jam handoff with the 5 s cap and the reboot refusal, a jammed lamp's 4 s and flicker, and the security room (refused, then the guard knocked out, cameras off, "already off").
- **Part 2:** S4 IR visibility, a beam break that raises the alarm, the panel jam, the throw and the release. S5 leg-up, relay, plates, hang-down hack and pull-up.
- **Part 3:** S6 late fail then sync. S7 rope let go, then a full climb. S8 forced down and revive, then the exit-zone both-in rule.

**Spec target.** 3-4 min for a practised pair, 9-16 min casual (`CTCOURSE-SPEC.md:5`, from CT M0).

**Estimate of a first co-op run now.** A pair who know the controls, no deaths:

| Segment | Estimate |
| --- | --- |
| S1 | 20-40 s (60 s with the interrogation) |
| S2 | 40-60 s |
| S3 | 1.5-3 min (one send-back each likely; +30-60 s with the security room) |
| S4 | 30-60 s (about 10 s if they just walk through) |
| S5 | 1.5-3 min |
| S6 | 20-60 s (one fail likely) |
| S7 | 45-90 s |
| S8 | 15-20 s |
| Seven airlocks | about 1.5 min |
| Walking (170 m) | about 1 min |
| **Total** | **about 7-12 min** |

That is about half of Michael's 15-20 min. Of it, roughly 3 min is airlocks and empty walking.

---

## 6. What the rebuild must keep (tests, systems, saves)

**Identity**
- Map id `ctcourse`, name "Marlow Yard", `modes: ['course']`, not listed (`ctcourse.ts:364-383`).
- Position in `MAPS` (`src/world/maps/index.ts:19`; `tests/rooms.test.ts:140` asserts the id list).
- Campaign default: `CAMPAIGN_MAP = 'ctcourse'` (`src/net/coopUi.ts:382`, `:811`); `session.map` default (`src/net/session.ts:58`); `e2e-park.mjs:92`; `e2e-coop.mjs:93` (the room listing names "Marlow Yard|ctcourse").

**e2e-coop needs a guard in bay 1.** At bay 1's start it needs a live guard who can be grabbed from behind (`e2e-coop.mjs:750-790`, restart while holding). Keep a guard in the first bay's squad, passive or at least not alerted at spawn.

**Course framework contract**
- Airlocks are 6 x 6 m within 0.5 (`courseDef.ts:229-233`; `config/course.ts:18-20`).
- Bays chain start -> airlocks -> end, and the last exit is `'end'` (`courseDef.ts:247-256`).
- Text limits: radio, objective and drill lines 90 characters max (`config/course.ts:30`); panels 120 (`ctcourse.ts:236`). Pad and keyboard words are required by `tests/ctcourse.test.ts:341-367`.
- Panel ids `sw-pN` (`isPanelId`, `courseDef.ts:157-159`).
- Every flag that is read must be set by a gate or `externalFlags` (`:304`).
- Interactable ids are `c-<device id>`; the bolt is `c-<gate id>`.

**Saves**
- The course record is keyed by map id with bay ids (S1-S8), finished lists and best times per bay (`src/save/courseRecord.ts:15-88`; `courseMode.ts:593`, `:612`). Changing bay ids or count invalidates "Start at" for old records. No SAVE_VERSION bump is needed (a kv key), but say so.
- "Start at" with the all-bays dev flag is hard-coded to 9 bays (`coopUi.ts:595`).
- Rejoin and resume store a bay index (`coopUi.ts:183`, `:205`; `tests/rejoin.test.ts:215-226`; `e2e-menus.mjs:352` uses bay 2).

**Device systems and their rules**
- `PassZone.hall` send-back rule (`ctDevices.ts:118-125`).
- `SecurityConsole`: the guard must be in the gate's bay squad and a camera must name its `offFlag` (`securityRoom.ts:45-63`).
- `LaserDef.offFlag`, `LaserPanelDef`, `ScannerDef` (one pair only), `S3_CAMERA` IR.
- Jam targets: every electric lamp is `lt-<registry id>` (`ctDevices.ts:347-352`).

**E2E structure**
- `e2e-ctcourse` runs as three parts (`run-e2e.mjs:30`, `:43-44`; the suite's `GROUPS`, `:19`), each started through `session.courseBay`.
- Keys `e2e-ctcourse:1..3` in `scripts/e2e-times.json`.
- Quick-run mapping from `src/world/maps/ctcourse.ts` and `src/world/` (`run-e2e.mjs:107-108`).
- Debug hooks the suite reads: `window.__course` (state, debug, layout, squadOf, checkpointPos, restartCheckpoint, wire); `window.__ctdev.debug()` (cams, jam, cool, left, hud, cue, lights, panels, lasers, scan, hall, sendBacks, alarm, hits, devs); team counters (boosts, ladders, throws, hangs, pulls, ropes, slides, tops); `net.reviveClock`.

**Unit tests that import map exports** (rewrite alongside the map)
- `tests/ctcourse.test.ts:3` imports 28 exports; `tests/ctcourseLight.test.ts:12` imports 15, plus the tuned levels in `ctcourseLight.tuned.json` (within 0.08; open floor 0.30).
- `tests/guardInfo.test.ts:6` (`GUARD_INFO`, `GUARD_SLOT`, `S3_SEC_GUARD`).
- `tests/jammer.test.ts:410-480` (S4 band, S3 hallway geometry).
- `tests/laserPanels.test.ts:31` (`S4_PANEL`, `S4_PANEL_JAM`).
- `tests/scanners.test.ts:19` (`S6_FLAG`, `S6_SCANNERS`).
- `tests/camSpaces.test.ts:4`, `tests/smoothWorldLight.test.ts:15` (`bayX`, `CT_BAY`, `CT_OBST`, `CT_CEIL`).
- `tests/lampGridLossless.test.ts`, `tests/levelFillParity.test.ts` (use the map only).

**GPU and shot scripts** that frame fixed coordinates or ids:
- `shots-ctcourse.mjs:14-36`, `nv-shots.mjs:15-20`, `sector-lights-shots.mjs:62-64`;
- `sector-fixes-c-shots.mjs:18` (`cam-s3`, `laser-s4`);
- `camera-cue-shots.mjs`, `wheel-shots.mjs` (map only).

**Docs to update with the rebuild**
- `docs/ct-prototype/CTCOURSE-SPEC.md` (plan and element register; drifted: the jam binding and the S4 "gate").
- `TESTING.md:45-60`, `:263-294` (station-by-station checks).
- `docs/systems/testing-tools.md:33`, `:42-44`.
- `docs/course-ready/WALKTHROUGH.md`.
- If the rebuild places ladders, pipes or rope anchors, add `ctcourse` to `e2e-anchors.mjs:9`.
