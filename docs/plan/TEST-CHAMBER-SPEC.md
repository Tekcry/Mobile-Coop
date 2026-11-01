# Test Chamber spec v2 (stage G2b-G2d) - paper only
Owner: the orchestrator. Status: current.

Repo read: `D:\NightShift\Mobile-Coop` master (G1 + G2a's `src/game/modes/testMode.ts`). Nothing edited.
Rule followed: the existing 28 x 28 m room, its props, colours, grid and 7 lamps stay as they are. New pieces are plain
greybox in the existing colours (`PROP #59606a`, `PROP_DARK #454b53`, `METAL #6d7378`, `WALL #26292e`, `FLOOR #3a3e44`).
No Warehouse or Proving Grounds layout is copied: those maps were read only for builder calls and engine sizes.

Builder calls used (all exist): `box` levelBuilder.ts:171, `block` :177, `floor` :181, `wallX` :195, `wallZ` :206,
`ramp` :217, `stairs` :227, `pillar` :242, `highWall` :253, `perimeter` :258, `zipline` :299, `duct` :307,
`windowAt` :311, `door` :315, `fence` :357, `mark` :533, `light` :561, `surface` :567, `ambientZone` :573.

## 0. Why the room grows (one annex, 8.3 m east)

- Darkness is needed. The main room cannot be dark. Its floor never reads below about 0.45: the theme lightLevel is 0.6 and the sky fill 0.45 under the closed ceiling. Its 7 lamps reach radius x 1.6 = 17-22 m (`lampReach`), so they cover the whole room.
- Tests that cannot run without darkness:
  - a level below `LIGHT.shadow` 0.28 (lights.ts:93);
  - the 0.12, 0.27 and 0.40 grey cards;
  - a guard torch below `TORCH_DARK` 0.35 (archetypes.ts:151);
  - torch slots (`addTorchSlots` needs a zone below 0.5).
- The only way to get darkness without relighting the main room: a sealed annex behind a full-height wall with its own ambient zone of 0.12, the Warehouse interior value (warehouse.ts:446).
- The annex also supplies the walled side room, the second and third doors and the long walled path that the guard suites need.
- Everything that needs only open lit floor stays in the main room (pinned or real light). No main-room lighting changes.
- Final size: main room 28 x 28 (unchanged) plus annex 8 x 28. The bounds go from x 0..28 to x 0..36.3. The extra 8.3 m is 8 m of interior plus the 0.3 m dividing wall.

## 1. Layout

### 1.1 Plan sketch (x east →, z north ↑; not to scale; `||` = full-height 8 m wall, `D` = hinged door)
```
z28 +---------------------------------------------------++----------------------+
    |LEDGE   B   [====TEAM BLOCK 4.4====]F  bar   [BOOTH] ||A0      HALL   L0*   |
    |LEDGE   B   [   (unchanged)  rope R]F        [w  R2 ] ||   (amb .12)   v  f  |
z25 |  zip↓                lip 4.4                         ||          b   H1      |
    |  zip    . . . . anim lane x8-26 z18-24 (keep clear) . D(annex door z20)     |
z20 |reinf   zip end                                      ||    S       one-inv  |
    |  lowW    smallCrate crate barrel                    ||A1                   |
z15 |TUNNEL  dummies      (14,14)(16,14) spawns  [VENT]   ||sw  P   ====D(part A)|
    |TUNNEL  static/strafe                       [VENT]   ||STORE L1 | AISLE     |
z10 |PLATFORM<-chase       stairs35 ramp55  ex ex         ||carpet   | metal     |
    |PLATFORM ladder/pipe                      pipeH      ||------  -+           |
z5  |wall-jump  fence                                     || dumpster  hide      |
z4  |        ---door wall---  ---window wall---           ||    DARK BAY .12     |
    |steps .42 .6 .9                    wall-peek zone    ||  card .12  reinf    |
z0  +---------------------------------------------------++----------------------+
   x0                                                   x28 28.3               36.3
```

### 1.2 Existing props: all unchanged (Michael, 2026-11-01: booth, not a hollow team block)
- Kept exactly, with the same `CHAMBER_PROPS` numbers and code: team block (chamber.ts:62-63) and its rappel point (16.3, 4.4, 25) (:64), ledge wall, low wall, platform with ladder and drainpipe, pipeH, bar, vent block and floor duct, window wall, door wall, the 7 lamps, both player spawns.
- `CHAMBER_SIZE` stays 28 and `CHAMBER_MID` stays 14, so the loop player, the tuner, `TRAV_ENTRIES` and the pair station do not move.
- **New rappel booth (1.3 #9-#10), in the north-east corner, x 25-28, z 25-28.** I did not use the x 7-10 spot suggested earlier, for two reasons:
  - Block B (#6) keeps its place at x 7.5-9.5. The jump-across, corner wrap and lower-into-hang tests therefore stay on the ledge wall plus block B, and no extra piece is needed (1.3 #6).
  - The NE corner is otherwise empty, and it is clear of everything that needs room:
    - the anim lane (it ends at z 24);
    - the bar walk-in (the bar ends at x 23.5; its post is 1.35 m from the booth);
    - the annex-door test floor (z 19.4-20.6);
    - the zipline (x 5.3).
- What the booth tests:
  - the kick through a window from a rope (e2e-ct; `RAPPEL.windowReach` 0.9);
  - the breakable glazed window (e2e-traverse, e2e-anchors);
  - the duct ceiling-vent drop with a roll (e2e-traverse; `LANDING` roll band 2.5-4.5).
- New code reads new keys added to `CHAMBER_PROPS` (`steps`, `tunnel`, `stairs`, `ramp55`, `fence`, `blockB`, `fin`, `zip`, `booth`, `annex`). Old keys keep their values.

### 1.3 New pieces in the main room (G2b)
Each piece below is placed clear of:
- the anim lane (x 8-26, z 18-24);
- the loop entries' walk-ins (chamberTraversal.ts:67-168);
- the centre circle;
- the ladder chase line (z 9, x 3.8-9.05);
- the door and window floor (z 1.8-6.2 at x 10 and x 18);
- the wall-peek zone (x 21.5-28, z 0-3.6).

| # | Piece | Builder calls (exact) | Engine reason / tests |
|---|---|---|---|
| 1 | Step row (S wall) | `b.block(1.0, 0.6, 1.2, 0.42, 1.2, PROP)`; `b.block(3.0, 0.6, 1.2, 0.6, 1.2, PROP)`; `b.block(5.0, 0.6, 1.2, 0.9, 1.2, PROP_DARK)` | `MOVEMENT.maxStep` 0.42 walks up (config/movement.ts:78); 0.6 blocks walking and is the step move (≤0.65, movement.ts:136); 0.9 is a mantle (>0.65; against the wall, so never a vault). The 0.15 and 0.3 rows are dropped: both are below maxStep and add nothing. Approach from z 2.5 facing -z. |
| 2 | Crouch tunnel (W wall) | `b.block(2.75, 13.0, 0.5, 1.4, 3.0, PROP_DARK)`; `b.block(1.5, 13.0, 3.0, 0.3, 3.0, PROP, 1.4)` (the perimeter is its west side) | Underside 1.4 sits between `crouchHeight` 1.15 and `standHeight` 1.75 (movement.ts:75-76). Inner 2.5 wide, 3 long (z 11.5-14.5). Also S24's walled hide. |
| 3 | Stairs 35° | `b.stairs(18.0, 8.75, 2.0, 2.5, 1.75, 6, PROP, 0)` (rises to +z, z 7.5-10) | Walkable under `maxSlopeCosine` 50° (playerController.ts:261). Stairs collide as a smooth ramp (levelBuilder.ts:237), so one piece covers both "stairs" and "slope under 50°". Approach (18, 0, 5.3) yaw 0. |
| 4 | Ramp 55° | `b.ramp(20.2, 8.75, 1.6, 2.5, 3.57, PROP_DARK, 0)` | Too steep (>50°). The 20° ramp is dropped (same rule as #3). |
| 5 | Fence | `b.fence(6.0, 6.5, 9.0, 6.5, 2.6)` | 3 m ≥ the one 2.5 m post bay; 2.6 m is the climb case; ±2 m of floor each side (z 4.5-8.5). |
| 6 | Hang block B | `b.block(8.5, 26.0, 2.0, 2.4, 2.0, PROP)` (x 7.5-9.5, z 25-27) | Lip 2.4 is in the grab band 1.9-2.7 (`LEDGE.minDrop`, `REACH.grabMax`). Its south face is coplanar with the ledge wall's (z 25) with a 1.5 m gap: jump-across. Its free east corner (x 9.5): corner wrap onto the east face. 1 m behind it, and 1.5 m to the team block's west face: room for a hanging body. Lower-into-hang stays on the ledge-wall top (4, 2.42, 25.45, π). Every test position stays west of the zipline (x 5.3) or on B, out of the anim lane (z ≥ 24.4) and off the ledge loop walk-in (x 3.4). |
| 7 | Split fin | `b.box(18.8, 2.2, 26.5, 0.3, 4.4, 3.0, PROP_DARK)` (x 18.65-18.95, z 25-28) | Re-checked against the unchanged solid team block (one box, x 11-17, top 4.4). The two faces are x 17 and x 18.65, so the gap is **1.65 m**, inside 1.2-1.95. Both are 4.4 m tall (≥ 3.6); the overlap is z 25-28 = 3 m (≥ 0.8 + 2 x 0.3). The auto-split rule (level-design 12.1) holds. Lip 4.4 for the jump-up. The rope (16.3, 25) hangs at z < 25, south of the slot, so it is clear. 1.9 m from the bar post. No other face pair is 1.2-1.95 m apart and ≥ 3.6 m tall: B is 2.4 m, and the booth's nearest tall face is x 25, 6 m from the fin. |
| 8 | Zipline (from the ledge wall top) | `b.pillar(5.3, 27.3, 0.06, 2.0, METAL, 2.4)`; `b.box(5.3, 4.35, 27.1, 0.05, 0.05, 0.3, METAL, 0, 0, false)`; `b.zipline({ x: 5.3, y: 4.3, z: 26.9 }, { x: 5.3, y: 2.3, z: 20.0 })` | High end 1.9 m over the 2.4 deck (anchors check: floor 1.5-2.6 within `REACH.zip` 1.3). Cable 7.2 m, enough to pass 4 m/s (accel 2.4 to `ZIP_SPEED` 6, attach.ts:72). x 5.3 is 1.9 m clear of the loop's ledge climb at x 3.4. |
| 9 | **Rappel booth** (new, NE corner). Outside x 25-28, z 25-28, top 4.4. Its east side is the east wall's face at x 28: the perimeter in G2b, the divider (1.4) from G2c. Interior x 25.3-28, z 25.3-27.5. | **Walls**, all `PROP`, h 4.2, after `const booth0 = b.boxes.length`:<ul><li>south, west of window `b.box(25.45, 2.1, 25.15, 0.9, 4.2, 0.3, PROP)`;</li><li>south, east of window `b.box(27.55, 2.1, 25.15, 0.9, 4.2, 0.3, PROP)`;</li><li>sill `b.box(26.5, 0.5, 25.15, 1.2, 1.0, 0.3, PROP)`;</li><li>head `b.box(26.5, 3.2, 25.15, 1.2, 2.0, 0.3, PROP)` (2.2-4.2);</li><li>west `b.box(25.15, 2.1, 26.5, 0.3, 4.2, 3.0, PROP)`;</li><li>inner north `b.box(26.65, 2.1, 27.75, 2.7, 4.2, 0.5, PROP)`;</li><li>then `b.mark(booth0, { noLedge: true })`.</li></ul>**Roof slab**, top 4.4, round a 0.8 m vent hole at x 25.5-26.3, z 26.3-27.1:<ul><li>front `b.box(26.5, 4.3, 25.65, 3.0, 0.2, 1.3, PROP)`;</li><li>back `b.box(26.5, 4.3, 27.55, 3.0, 0.2, 0.9, PROP)`;</li><li>west `b.box(25.25, 4.3, 26.7, 0.5, 0.2, 0.8, PROP)`;</li><li>east `b.box(27.15, 4.3, 26.7, 1.7, 0.2, 0.8, PROP)`;</li><li>`b.noLedge(25.9, 26.7, 0.7)` (levelBuilder.ts:544): no lips round the hole. The outer roof lips stay.</li></ul>**Window**: `b.windowAt(26.5, 1.6, 25.15, 1.2, 1.2, 0, { sill: 1.0, open: false, breakable: true })`.<br>**Rope**: `b.rappel(26.5, 4.4, 25, Math.PI, 4.4)` (levelBuilder.ts:344; the same form as chamber.ts:64). | The rope is directly over the window: 0 m sideways (≤ `windowReach` 0.9). There is 1.5 m of face each side of the rope (x 25-28), enough for `lateralMax` 1.5 and the sideways step. Hooked feet are at top - 1.0 = 3.4 m, above `unhookHeight` 2.0. The sill is 1.0 m over the floor on both sides, so the window is also a "foot side" window for e2e-anchors (0.3-1.3). The interior is 2.2 deep: at least 1.5 for the kick-in, and under 2.5 so the "2.5 m clear" wall searches never pick an inner face. The interior is 2.7 m wide. Inner face pairs (2.7 / 2.2 apart) are outside the 1.2-1.95 split band. The south lip (z 25, 4.4) is a second boost-band lip, harmless. |
| 10 | **Booth roof duct with a ceiling vent** | `const duct1 = b.boxes.length`:<ul><li>`b.box(26.1, 4.95, 26.15, 1.6, 1.1, 0.1, METAL)`;</li><li>`b.box(26.1, 4.95, 27.25, 1.6, 1.1, 0.1, METAL)`;</li><li>`b.box(26.1, 5.55, 26.7, 1.6, 0.1, 1.2, METAL)`;</li><li>end cap `b.box(25.3, 4.95, 26.7, 0.1, 1.1, 1.0, METAL)`;</li><li>`b.mark(duct1, { noLedge: true })`;</li><li>`b.duct([{x:26.65,y:4.4,z:26.7},{x:25.9,y:4.4,z:26.7}], {pos:{x:26.9,y:4.95,z:26.7},nx:1,ny:0,nz:0,where:'wall'}, {pos:{x:25.9,y:4.2,z:26.7},nx:0,ny:-1,nz:0,where:'ceiling'})`.</li></ul> | The pattern is from PG:134-149 (not its place). The entry faces +x, so the stand point (entry + 0.6 n) is (27.5, 4.4, 26.7) on the booth roof, 0.5 m from the east wall and 1.7 m from the rope plate. The crawl path is 0.75 m (short: risk 3). The drop is from the duct floor at 4.4 to the booth floor at 0: inside the roll band, but only 0.1 m under the heavy landing at 4.5 (risk 3). It is `ducts[1]`; the floor duct stays `ducts[0]`. |
| 11 | Props (`layout.props`) | `smallCrate` (10.0, 16.8); `crate` (11.0, 16.4); `barrel` (9.0, 16.4); `explosiveBarrel` (26.9, 11.3) and (25.7, 11.3) | Push test: start 2.5 m south, walk +z. Barrels are 1.2 m apart, inside the chain radius 5.5 (props.ts:32), 2.3 m past the pipeH end. Shot from (26.9, 16.6) yaw π (6 m, line clear east of the vent block). |
| 12 | Dummies (G2a `MapLayout.dummies`) | `{ pos: (8, 0, 12.5), yaw: π/2 }`, `{ pos: (8, 0, 15.0), yaw: π/2, strafe: 2.5 }` | Shooter at (16, 12.5) yaw -π/2: the static dummy is 8 m away. Strafe across the line (along z, 13.75-16.25). Spawn them in `'test'` mode only (they would stand in the loop player's stage). |

### 1.4 The annex (G2c): x 28.3-36.3, z 0-28, ceiling 8 m, ambient 0.12
**Outer walls, divider and partitions** (the booth, 1.3 #9, sits against the divider's main-room face at x 28, z 25-28: it is 4.6 m north of the annex door)
- Perimeter: `b.perimeter(0, 36.3, 0, SIZE, H, WALL)` replaces chamber.ts:51.
- Ceiling: `b.box(18.15, H + 0.15, C, 36.9, 0.3, SIZE + 0.6, WALL)` replaces :52.
- Floors (one box per area, so each gets its own surface): hall `b.floor(32.3, 21.15, 8, 13.7, FLOOR)`; store `b.floor(30.3, 11.15, 4, 5.7, FLOOR)`; aisle `b.floor(34.45, 11.15, 3.7, 5.7, FLOOR)`; dark bay `b.floor(32.3, 4.0, 8, 8, FLOOR)`.
- Grid: the same loop extended. x lines for i in 1..35; z lines span 36.3 - 0.4, centred at x 18.15; the axis lines stay at 14.
- Divider (the old east wall, the same face at x 28 seen from the main room):
  - `b.wallZ(28.15, 0, SIZE, [[19.4, 20.6]], H, WALL, 0.3)`
  - lintel `b.box(28.15, (2.1 + H) / 2, 20, 0.3, H - 2.1, 1.2, WALL)`
  - **annex door** `b.door(28.15, 0, 19.4, 1.2, 0, { swing: 1, height: 2.1 })`. The leaf runs along +z. `swing: 1` should open it into the annex: verify in `doors.ts`.
- Partition A (hall | south part):
  - `b.wallX(14.15, 28.3, 36.3, [[34.8, 36.0]], H, WALL)`
  - lintel `b.box(35.4, (2.1 + H) / 2, 14.15, 1.2, H - 2.1, 0.3, WALL)`
  - **partition door** `b.door(34.8, 0, 14.15, 1.2, Math.PI / 2, { swing: 1, height: 2.1 })`. Shut, it keeps L0 out of the dark side (`DOOR_SHUT` 0.15).
- Store walls:
  - `b.wallX(8.15, 28.3, 32.6, [], H, WALL)`
  - `b.wallZ(32.45, 8.3, 14.0, [[8.6, 9.8]], H, WALL)` with lintel `b.box(32.45, (2.1 + H) / 2, 9.2, 0.3, H - 2.1, 1.2, WALL)`. Open doorway, no door. The opening sits at the aisle's south end, so L1 never sees the dark-bay card or the shadow spot.

**Contents**
- **H1** (free-standing high cover in the hall): `b.highWall(34.6, 21.25, 2.5, PROP)` (x 34.35-34.85, z 20-22.5, 2.6 tall). It is:
  - the report-then-engage cover;
  - the "cell behind a wall" for heard-in-a-search;
  - the impact-noise target.
- **Dumpster**: `b.block(30.3, 7.25, 1.9, 1.2, 1.0, PROP_DARK)` (x 29.35-31.25, z 6.75-7.75). Grey, not green.
- **L0**, the hall lamp on a switch (chamber bulb style, no fixture): `b.light({ kind: 'lamp', x: 32.3, y: 5, z: 23.5, radius: 7, intensity: 1, color: [1, 0.96, 0.9], group: 1 })`.
  - Electric and destructible by default (lights.ts:202-204).
- **L1**, the store strip (the "second lamp, shot 1.2 m off centre" needs a strip): `b.light({ kind: 'lamp', x: 29.4, y: 3.2, z: 12.2, radius: 3, intensity: 0.8, color: [1, 0.96, 0.9], group: 2, fixture: { sx: 0.25, sy: 0.08, sz: 2.4, oy: 0.15 } })`.
  - Reach 4.8 m. It cannot see the shadow spot (34.5, 9.5) or the dark bay.
- **Zone**: `b.ambientZone(28.3, 36.3, 0, SIZE, 0.12, -1, H)`.
  - The ambient grid is 1 m trilinear (ambientGrid.ts:9), so cards sit at least 1.2 m inside it (x ≥ 29.5).
- **Surfaces**: `b.surface('carpet', 28.3, 32.3, 8.3, 14)` (store) and `b.surface('metal', 32.6, 36.3, 8.3, 14)` (aisle).
  - Each gives a 5.4 m run along z. Concrete is the default.

**Interference**
- The 7 chamber lamps cannot see past the divider. L0 cannot see past partition A while its door is shut.
- Guards exist only when a test spawns them, or with `?guards=1` / `populate()`.
- The annex doors are shut on reset (stealth-ai `reset`), so hearing tests in the annex are behind 1-2 walls from the main room. Each wall costs `wallDb` 6.9 = x0.45 (hearing.ts:22,84).

## 2. Layout fields (the `return` of `chamber.build`)
- **playerSpawns**: unchanged, (14, 14) and (16, 14), yaw 0.
- **enemySpawns** (e2e-tactics only; `populate` uses rooms): (12, 22), (18, 22.5), (24, 22), (19.5, 11), (23, 6.5). All are in the open main room, 9-21 m from the tactics player at (2.7, 17), inside `engageMax` 26.
- **dummies**: as 1.3 #12.
- **props**: as 1.3 #11.
- **hideSpots**: `[{ pos: (30.3, 0, 6.05) }]`, the dumpster front. The interactable becomes `hide-0` "Hide body" (stealthSystems.ts:184).
- **switches**: `[{ pos: (29.2, 0, 14.45), yaw: 0, group: 1 }]`, on partition A's hall face. The interactable is `switch-0` (stealthSystems.ts:116).
- **alarms**:
  - `alarm-0`: `{ pos: (28.45, 0, 24.5), yaw: π/2 }`. It has 5 m of floor to +x for the e2e-enemies officer.
  - `alarm-1`: `{ pos: (28.45, 0, 17.0), yaw: π/2 }`. Faces +x, so stealth-ai's "pos + (0.7, 0), yaw -π/2" offset still holds.
- **reinforce**: `[(35.3, 0, 1.5)]`, used when a test sets `g.mode.reinforce = true` (testMode.ts:25, 78-81).
- **rooms**: `RoomDef`, rooms.ts:51. Squads are for `populate` / `?guards=1` only: 5 guards, under `POPULATE_CAP` 9 (testMode.ts:8) and `MAX_ALIVE` 12.

  | id | Box | Squad |
  |---|---|---|
  | `chamber` | 0-28 x 0-28 | none |
  | `hall` | 28.3-36.3 x 14.3-28 | grunt (30, 26) yaw π, route [[30,26],[30,17]], wait 2; grunt (35.5, 16) yaw 0 |
  | `store` | 28.3-32.3 x 8.3-14 | grunt (30.3, 11) yaw π/2 |
  | `aisle` | 32.6-36.3 x 8.3-14 | none |
  | `darkbay` | 28.3-36.3 x 0-8 | grunt (34, 4) yaw 0, route [[34,4],[30,2],[30,5.5]], wait 1; dog (33, 2) yaw 0 |

  - Rooms are needed for stealth-ai `lights` (a guard sees his own room's lamp go, enemyManager.ts:1336-1344) and `light pair` (c is not in L0's room).
  - They also give the benchmark flight its stops (gameState.ts:1373).
- **navSeeds**: ledge-wall top (4, 2.4, 26.5) for takedown "below" and hang-down. No guard stands on the team block or the booth, so they get no seed. Add hall (32, 0, 21) and dark bay (32, 0, 4) only if the nav does not pass shut unlocked doors (unverified).
- **camSpaces** (`[minX, minZ, maxX, maxZ]`, camSpaces.ts:12), all `tight`: store [28.3, 8.3, 32.3, 14], aisle [32.6, 8.3, 36.3, 14], booth interior [25.3, 25.3, 28, 27.5], tunnel [0, 11.5, 2.5, 14.5] with y [0, 1.4]. `camSize: 'open'` stays.
- **debugPoints** (cheap, optional):

  | Group | Point | Position, yaw |
  |---|---|---|
  | annex | post P | (32.3, 15.5), 0 |
  | annex | lit S | (32.3, 20.5), π |
  | annex | dark card | (31, 3), 0 |
  | annex | door | (26, 20), π/2 |
  | moves | steps | (3, 2.5), π |
  | moves | tunnel | (1.2, 10.9), 0 |
  | moves | split | (17.8, 24.5), 0 |
  | moves | fence | (7.5, 5.8), 0 |
  | moves | zip | (5.3, 2.42, 27.5), π |
  | moves | booth rope | (26.5, 4.45, 25.4), π |
  | moves | booth vent | (27.5, 4.42, 26.7), -π/2 |

- **Not needed**: medkitWalls (e2e-coop adds one at runtime), guardAi zones (the whole map stays one section, so the radio reaches everyone), objectives.

## 3. Test map (suite by suite)
Shorthand:
- P = (32.3, 15.5) yaw 0; S = (32.3, 20.5); S8 = (32.3, 23.5) under L0.
- PARK_A = (35.3, 1.5), the dark bay, used when guards are in the main room.
- PARK_M = (25, 1.8), behind the window wall, used when guards are in the annex.
- HIDE_FAR = (3.0, 2.5): the main room SW, more than 33 m by path from S through the annex door.

Boot changes:
- Every MOVE suite boots `autostart=chamber`, with `&mode=test` where it needs guards.
- `autostart=chamber` must not start the anim stage (G2a's opt-in, gameState.ts:1093-1095).
- Otherwise `drives` (chamberStage.ts:211) eats input in every suite.

Re-tune risk: L = low, M = medium, H = high.

| Suite | Zone | New points / what changes (and why) | Risk |
|---|---|---|---|
| e2e-move | Lanes: anim lane; steps; stairs/ramp; tunnel; crate | <ul><li>Runway tp (-10,0,-14,π/2) → (9, 0, 20, π/2); open spot (0,-2) → (20, 21).</li><li>Vault (5.2, 0, 17, -π/2), check `x<3.6`.</li><li>Mantle (5.0, 0, 2.5, π) `y>0.85`; step (3.0, 0, 2.5, π) `y>0.55`.</li><li>Step row: 3 rows (0.15/0.3 dropped).</li><li>Drop (4, 2.42, 25.6, π) `z<24.7`.</li><li>Slopes: L451 `*5` → the piece's length 2.5. 35° = stairs at (18, 0, 5.3, 0); 55° at (20.2, 0, 5.3, 0).</li><li>Stairs `peak>2.45` → `>1.6` (top 1.75 - 0.15).</li><li>Tunnel (1.2, 0, 10.9, 0), z window (11.5, 14.5).</li><li>Crate: first `smallCrate`.</li></ul> | M |
| e2e-traverse | Platform, ledge wall + B, pipeH, zipline, windows, ducts | <ul><li>Ladder bottom (3.8, 0, 9, -π/2); top (2.35, 3.0, 9, π/2); `y>3.5` → `>2.9`; `sin(yaw)-1` → `sin(yaw)+1`.</li><li>Drainpipe (3.55, 0, 10.4, -π/2); side checks re-axised to the east face (shimmy room z 8.25-10.75 is short: risk 6).</li><li>Ledge (4, 0, 24.4, 0); jump-across `x>7.6`; corner `nx>0.9`; climb `abs(y-2.4)`.</li><li>Lower-into-hang (4, 2.42, 25.45, π).</li><li>Pipe (25.1, 0, 6.5, π/2), speed along z.</li><li>Landings (20, y, 21, 0), y 1.6/3.4/5.5 (ceiling 8).</li><li>Fall-grab (1.5, 4.6, 7.4, 0).</li><li>Zip (5.3, 2.42, 27.5, π), landed `z<20.5 && y<0.2`.</li><li>Open window (18, 0, 2.8, 0) `z>4.4`.</li><li>Glazed window: tp (26.5, 0, 24.0, 0); `windows.find(!open)` = the booth's (26.5, 25.15); check `z>25.4`.</li><li>Floor duct (`ducts[0]`): tp (20.4, 0, 14, π/2); cam y 0..1.1, `abs(z-14)≤0.5`; gun `<1.08`.</li><li>Ceiling vent (`ducts[1]`, the booth roof duct): tp (27.5, 4.42, 26.7, -π/2), facing the entry grate at x 26.9; crawl to x 25.9, drop 4.4 m into the booth, roll. Replace the L500 vent box x 26.5..29 / z -8..-2 with the booth interior x 25.3..28 / z 25.3..27.5; "3.2 m drop rolls" → 4.4 m.</li></ul> | M |
| e2e-ct | Fin split, platform, pipeH, booth rope, fence | <ul><li>Split tp (17.8, 0, 26, 0); walls from the split anchor, not `[24.15, 25.95]`; lip 4.3 → 4.4.</li><li>Falls/jump (20, h, 21).</li><li>Pipe (25.2, 0, 6.5, π/2): `abs(sin)` → `abs(cos)`, `cam.yaw` += π/2.</li><li>Lip jump (4, 0, 24.3), top 2.3 → 2.4.</li><li>Wall jump (1.5, 0, 7.3, 0): top 3.3 → 3.0, `y≈1.4` → `≈1.1` (`HANG.drop` 1.9); too-far (1.5, 0, 6.2).</li><li>Corner kick (0.7, 0, 7.45, -π/2), s ≥ 0.3 (splitJump.ts:145).</li><li>Rappel, whole case on the booth rope: tp (26.5, 4.45, 25.4, π) (L369, L428); hooked `abs(y-4.7)` → `abs(y-3.4)` (top - 1.0); sideways either way (1.5 m of face each side).</li><li>Window lookup `abs(c.z-26.5)<.1 && abs(c.x-24)<.1` → `abs(c.z-25.15)<.1 && abs(c.x-26.5)<.1`; kicked in `z>26.8` → `z>25.4`.</li><li>The team-block rope (16.3, 4.4, 25) is not used here; e2e-anchors and the loop player still use it.</li><li>Fence tp (7.5, 0, 5.8, 0), rays z 4.5-8.5, stopped `z<6.0`, over `z>7.0`.</li></ul> | M |
| e2e-anchors | All | <ul><li>`MAPS=[['chamber','sandbox']]`.</li><li>`lips > 10` → `lips >= 6`, and assert the 4.4 / 2.4 / 3.0 lips by height (the old count was arbitrary).</li><li>Every new anchor passes its approach rule as placed: zip, fence, split, the booth roof duct (stand (27.5, 26.7) on the roof), the booth's glazed window (foot side both ways, sill 1.0), the second rope (stand (26.5, 25.4) on the roof), doors.</li></ul> | L |
| e2e-clip | Same points as traverse | <ul><li>Ground runs (9, 0, 20, π/2).</li><li>Wall walks along the team block's south face at z 23.55, facing ±x (unchanged block, len 6).</li></ul> | L |
| e2e-anim | Anim lane | <ul><li>(8,-14) / (12,-14) → (26, 19) / (22, 19), yaw -π/2 (18 m to x 8).</li><li>Wall search picks the team block's south face x 11-17 (len 6; the booth's south pieces are under 4 m long). The lane's +z turns end at z 23.8, 1.2 m short of the booth.</li><li>Error text "Proving" → "Test Chamber".</li></ul> | L |
| e2e-combat | Dummies, barrels | <ul><li>tp (16.6, 0, 12.5, -π/2), aim at `dummies[0]` +1.1.</li><li>Grenade at `dummies[1]`.</li><li>Barrel shot from (26.9, 0, 16.6, π).</li></ul> | L |
| e2e-wall | Team block face, door wall | <ul><li>`proving()`: the nearest qualifying face from spawn is the team block's south face (len 6, mid (14, 25)).</li><li>`edges()`: `abs(abs(az)-8)` → `abs(az - P.door.z)` (4).</li><li>Corner takedown on `test`.</li></ul> | L |
| e2e-netmove | As ct + team | <ul><li>reset (0, 0.1, 0) → (20, 0.1, 21).</li><li>Team places (4, 27.05)/(4, 26.2) → (14, 24.55)/(14, 23.7); relay (14, 24.1); walk-off `z<25.5` → `<23.0`.</li><li>Lip `abs(lipY-4.2)<0.1` → 4.4 (L481, L826).</li><li>Rope ray (14, 8, 25.6), expect 4.4; tops (14 / 14.9, top + .05, 25.6).</li><li>Split/wall jump/pipe/fence: as e2e-ct. Rappel hint (L318) → booth rope (26.5, 4.45, 25.4, π); "exactly 1 remote rope" still holds (the one hooked).</li><li>Wall-edge `abs(abs(az)-8)` → `abs(az-4)`.</li><li>Roll from (20, 0.1, 21) along +x.</li></ul> | M |
| e2e-levels | Platform ladder | <ul><li>Boot `mode=test`.</li><li>`layers===3` → `=== DEFAULT_NAV_LAYERS` (navBuild.ts:14).</li><li>`ladders>=6` → `>= 2 * anchors.ladders.length` (two link entries per ladder, navGrid.ts:321).</li><li>Chase floor (9.05, 9) is clear.</li></ul> | L |
| e2e-stealth, foley, weapon-audio, weapons-carry, mouse | Anim lane | <ul><li>(0,-14,π/2) → (9, 0, 20, π/2); weapons-carry (8,-14,-π/2) → (20, 0, 21, -π/2).</li><li>Foley needs 12 m of lane: x 9→21 at z 20.</li></ul> | L |
| e2e-feedback | Any | `map: 'proving'` → `'chamber'` (L22, L91). | L |
| e2e-tactics | Low wall, door wall | <ul><li>Player (2.7, 0, 17, π/2).</li><li>5 grunts at `enemySpawns`.</li><li>Noise check: grunt (8, 1), player (8, 11), the door wall between.</li><li>`hear(26)` → `hear(45)`. Under `coordinated` (testMode.ts:37) one wall makes the reach R x 0.45, and walking over needs 10 < R x 0.45 x 0.5, so R > 44.4. `hear(16)` stays (R x 0.45 < 10).</li></ul> | M |
| e2e-enemies | Main room + annex | <ul><li>Heavy/enforcer (8, 21)/(8, 22).</li><li>Runner/enforcer lane `lineClear` x 12, z 9→21.</li><li>Sniper (8, 24) vs player (20, 17); cover = the low wall's west face (enemy.ts:4153-4163 bands 5-22 / 12-60).</li><li>Dog (8, 4) yaw 0 → (20, 21) yaw 0, player behind it (smell 6 x 0.7, no darkness needed).</li><li>Drone operator (5, 21), park PARK_A (31 m, 2 walls; orbit 7 + cam 16 = 23).</li><li>Officer: far guard 12+ m (`buffRadius` 12); alarm officer at `alarm-0`.</li><li>`perfectionist` part is deleted in H.</li></ul> | M |
| e2e-gadgets | Main room, dark bay | <ul><li>Wheel/arc (20, 21).</li><li>Gas: player (20, 15), guards (20, 21.5) and (27, 21.5) (radius 3.6, 7 m).</li><li>Flash in the dark: player (31, 1.5), guard (31, 5.7) facing it.</li><li>Noise stick: throw from (8, 1.5, 1.5) north at the door wall; front guard (2, 1.5); behind (8, 11), more than 5.85 m (13 x 0.45).</li><li>EMP: first electric lamp, tp (lamp.x, lamp.z - 3).</li><li>Mine (30, 1.5)→(30, 7.5).</li></ul> | M |
| e2e-guard-carry | Main room | <ul><li>Boot `mode=test` (stealth on, testMode.ts:36).</li><li>Spot [0,-2.5] → [11, 21]; FAR [-22,-24] → PARK_M.</li><li>Door list: 3 doors.</li></ul> | L |
| e2e-lightbake | Whole map | Boot `autostart=chamber&mode=test`; message only. 9 lamps; `cs.slots===4` holds (CHAR_SHADOW.maxSlots 4). Moon cells are the grid size, not open sky, so no roof hole is needed. | L |
| e2e-darkness | Dark bay, main room, chamber door | <ul><li>0.12 card auto-probed in the dark bay, about (31, 3): zone 0.12 + bounce (tune the zone value at runtime).</li><li>0.70 card in the main room.</li><li>Thermal door = the chamber door (doors.list[0]).</li><li>Spawn 1 grunt in the bay.</li></ul> | M |
| e2e-desktop | Rooms, dark bay | <ul><li>Part 1: `app.benchmark` → `getMap('chamber')`, mode `'test'` (main.ts:460; populate runs on `opts.benchmark`, testMode.ts:39); regex → `/Benchmark - Test Chamber/`.</li><li>Part 3: 2 alerted guards in the dark bay (head < 0.35, out of view) light their torches.</li><li>Parts 2/4: map-free.</li></ul> | M |
| e2e-menus | test mode | Pause list: the `'anim-tuner'` row shows on chamber (pauseScreen.ts:176-189). Gate it on the stage being on, or add it to the expected list. Objectives screen → Marlow Yard course (out of this spec). | M |
| e2e-score, offline, modes | test mode | <ul><li>`?guards=1` → 5 squad guards.</li><li>Offline :141 objective text: assert "no objective" on test.</li><li>Modes: ragdoll budget after killing the populated guards; the Mission part is deleted in H.</li></ul> | L |
| e2e-pad | Main room, floor duct, annex door | <ul><li>Strike harness (2,-1.9)/(2,-1) → (20, 19.1)/(20, 20); 6 m north clear.</li><li>Landing (20, 2, 19.1).</li><li>Vent (20.4, 0.05, 14, π/2) on `ducts[0]`.</li><li>Ctx door `doors.nearest(28.15, 20, .5)`: stand (27.35, 20, π/2), away (24, 20, -π/2).</li><li>Pause list as e2e-menus.</li></ul> | M |
| e2e-takedown | Main room, platform, ledge, window, fin | <ul><li>Ground pad (2, -2.2)/(2, -1) → (20, 19.8)/(20, 21).</li><li>Patrol (10..16, -2) → (12..18, 21).</li><li>Runtime pipe (18..22, y 3.6, z 19.7); split `splits[0]` = the fin.</li><li>Above (1.5, 3.02, 8.45, π), guard (1.5, 6.9).</li><li>Below: lip filter → `abs(top-2.4)<.1 && abs(z-25)<.25`, player (lx, 0, 24.4), guard (lx+.2, 2.4, 25.6).</li><li>Window: player (18, 0, 4.7, π), guard (18, 3.1).</li><li>Co-op knife row at spawn + (0/±2.5, 0, 3): z 17 is clear.</li></ul> | M |
| e2e-coop | Main room + annex | <ul><li>Lobby regex adds "Test Chamber".</li><li>Hits: (13,-6.5) and the `map.id==='warehouse'` gate → (20, 21) on chamber.</li><li>Reinforcement row (20+1.2i, 9).</li><li>Doors: 3 shut unlocked doors.</li><li>Takedown/strike/grab pads (6,-6)/(8,-6) → (19, 21)/(21, 21).</li><li>Torches: annex zone 0.12 gives slots; guard in the hall.</li><li>S23: guard (33.5, 17.1) yaw 0, client (33.5, 26) under L0, host (33.5, 12.8) in the aisle behind partition A. Host nearer by 4.6 (> 3).</li><li>S24: pair 1 + host in the hall, host hides in the store (30.3, 11). Pair 2 + client in the main room (20, 12), client hides in the tunnel (1.5, 13). LKPs more than 10 m apart.</li><li>S26: hall, client at S8.</li><li>Hang-down: ledge-wall lip 2.4, z 25 (HZ 24.6, deck z 25.4; depth 1.2 within 1.0-1.25). Other guards at (lip.x+3+1.5i, 21).</li><li>Leg-up at the unchanged team block's south face: client (14, 23.7), host (14, 24.55); 4.2 → 4.4 (in `inBoostBand` 2.4-4.5).</li><li>Char-shadow: runtime, finds L0.</li><li>Team wipe: `g.mode.lives = 1` (testMode.ts:24).</li><li>Course restart part stays on ctcourse.</li></ul> | H |
| **e2e-stealth-ai** | see 3.1 | Boot `autostart=chamber&mode=test`. | H |

### 3.1 e2e-stealth-ai point by point
Old → new; "A:" is the assertion change and its reason.

**Light and sight**
- **shadow**: guard (34.5, 2.0) yaw 0. Crouched sneak from (31.5, 0.8) yaw π/2. Front spot (34.5, 9.5), 7.5 m in the dark aisle. No A change.
- **light / vision-detect**: guard P; player S8, 8 m, real L0 light (>0.6 to tune).
- **vision-dog**: P.
- **walls**: guard (30.3, 12.8) in the store, player (30.3, 15.9), partition A between (3.1 m).

**Noise and investigation**
- **noise**: player (31, 4), guard 0.6 x 4.51 m north.
- **one investigates**: noise at (32.3, 21). Guards at (32.3, 23.5), (35.5, 22.5), (29.3, 25), (35.5, 16.5): 2.5 / 3.5 / 5.0 / 5.5 m, all inside half (7.5), distinct. Positions are new; the A is unchanged.

**Radio**
- **radio**: a = P. b (35.5, 22) yaw 0, 7.2 m (> voice tier-2 6 m, radioNet.ts:50; was 10.8). far (34.5, 2.0) yaw π, 13.7 m and behind 2 walls.
- **radio window**: near (34.5, 18.5), 3.7 m (< 6).
- **radio stagger**: a = P. (34.5, 8.6), (30, 6.5), (35.5, 5), (29.5, 3), (33, 1.5), all yaw π: 7.2 / 9.3 / 11.0 / 12.8 / 14.0 m (was 8.9-24.2). Order and spread rest on rank x `staggerStep` 0.5. A unchanged.

**Last known position and search**
- **lkp**: player S, hide HIDE_FAR. More than 23 m by path (`SEARCH_AREA.max` 20 + 3, searchArea.ts:19); was 35.
- **report then engage**: hide (26, 23.5), behind the divider. H1 is the guard's cover.
- **search area**: park HIDE_FAR. The "near" dark cells are the hall's south half, beyond L0's reach (radius 7 x 1.6). The "wall" cell is the store: about 7 m straight from S, about 16 m by path (+9 ≥ 4).
- **heard in a search**: concrete hall. The wall cell is behind H1, about 3 m from S.

**Patrol, bodies, carry**
- **patrol**: (29.5, 1.5) → (33.5, 1.5) → (31.5, 5), wait 1. Player PARK_M. 4 m legs.
- **bodies**:
  - Lit: v at S8, w (32.3, 19) yaw 0 (4.5 m, was 9; lit range ~16.6). Mate f (35.5, 26.5) yaw 0, 8.2 m from w (> 6 m voice).
  - Dark: body (34.5, 3), guard (34.5, 6.5) yaw π. 3.5 m (> `BODY.close` 2.5; was 6).
- **carry**: victim (30.3, 3.5), player (30.3, 1.0) yaw 0. Hide at (30.3, 6.05) yaw 0 (was yaw π).

**Lamps and the switch**
- **lights**:
  - Guard (33.5, 21) yaw π, his head in L0's pool, facing away.
  - Lamp lookup `x===32.3 && z===23.5`, shot along a ray from (32.3, 1.5, 17) through the bulb.
  - Strip lookup `x===29.4 && z===12.2`, shot at z 13.4.
  - **A**: `'switch-4'` / `switches[4]` → find the switch whose group is L0's (index 0 here). The old index was a Warehouse artefact.
  - e2: (31, 18.5) yaw π.
- **breaker**: a (30, 18) yaw 0, patrol to (30, 23). b (29.5, 15.5) yaw π/2, patrol to (34.5, 15.5).
- **light pair**: c (30.3, 13.2) yaw -π/2 in the store. 10.5 m from L0 (< `lightPairR` 15, incidents.ts:59), another room, no line.

**Alarms**
- **alarm**: guard (31.5, 22.5) alerted, `alarm-0` 3.7 m away (was 6 m; must beat 6.5 s). Before it, set `g.mode.reinforce = true` (testMode.ts:25) so `em.alive` grows. `alarm-1` offset unchanged.
- **alarm call**: pair + mate (35.5, 22).

**Revive, surfaces, shots**
- **revive / witness**: as bodies (lit).
- **surfaces**: concrete (30, 0, 26.5) yaw π/2; metal (34.5, 0, 8.6) yaw 0; carpet (30.3, 0, 8.6) yaw 0. Metal is at floor level (was a 2.6 m deck; height is not the rule).
- **shots**: player (32.3, 27.2) yaw π.
  - Suppressed guard 7 m at (32.3, 20.2): > half 6.3, < 12.6 (was 10).
  - Loud guard 4.9 m: 0.7 x quarter 7.03.
  - Loud-far 8 m (32.3, 19.2): between 7.03 and 14 (was 10).
  - Impact ray onto H1's west face, 2.3 m from the guard (`IMPACT_NOISE` 4).

**Doors**
- **doors / optic / ctx prompts**: the annex door. The axis is now x (every old z offset becomes an x offset).
  - `doors.nearest(28.15, 20, .5)`.
  - Guard (31.15, 20) yaw -π/2, player (25.95, 20) yaw π/2, menu at (27.35, 20).
  - Sprint from (24.35, 18.35).
  - Bash KO guard (29.25, 20): 1.1 m behind (> `DOOR.enemyReach` 1.0).
  - Patrol (30.65, 20) → (24.65, 20).
  - Optic near guard (23.65, 20).

**Main-room scenarios**
- **wall peek**: runtime. Finds the window wall's free east end (x 21) with the clear zone x 21.5-28, z 0-3.6.
- **vision / helmet / armour**: P with S, or (32.3, 26.5) with (32.3, 18.5).
- **missed check**: a P, b (35.8, 19.5), c (35.8, 25), far (34.5, 2). Player PARK_M.
- **loud shot** (main room): player (6, 21) yaw π/2.
  - ear (21, 21), 15 m: > 14, < 28 (was 19).
  - far (34.5, 2): 33 m and 2 walls (was 31 m open).
  - Suppressed ear2 (14, 21), 8 m.
- **squad roles** (main room):
  - Player box x 5-24, z 5-24.
  - Guards at 10-12 m (was 14.5-17.5): the reporter band min is 10, overwatch 8-15 (squadRoles.ts:149-186).
  - Hide south of the door wall, (8..12, 1.5..3).
  - Cover: the main-room props.
- **four intruders** (main room): reinforcement grid (1.0 + 0.9k, 24 - 0.9j), the west column.
- **dog release** (main room): handler (14, 20), dog (15, 20). LKP circle 6-8 m (was 12-15; must be > smell 6, archetypes.ts:43). Player PARK_A (> 15 m).
- **charshadow**: runtime, `lightBake.lamps` includes L0.

## 4. Build order (each is one PR after G2a)

**G2b: main-room pieces and the locomotion, traversal and combat suites**
- Build 1.3 #1-#12, the new `CHAMBER_PROPS` keys, `enemySpawns`, `navSeeds`, and the booth and tunnel `camSpaces`.
- In G2b the booth's east side is the east perimeter wall's face (x 28). G2c replaces that wall with the divider, which has the same face at x 28, so nothing in the booth changes.
- Update `tests/animChamber2.test.ts:414-420`:
  - ladders 1, pipesV 1, pipesH 2 (unchanged);
  - ducts 1 → 2, windows 1 → 2, rappels 1 → 2;
  - add `ziplines` 1 and `fences` 1;
  - doors stay 1 in G2b and become 3 in G2c.
  
  The team-lip check at :423 is unchanged (the team block is untouched).
- Update `tests/testChamber.test.ts:41-51` (spawns still clear).
- Nothing waits on a decision: the booth is decided.
- Must pass: e2e-move, e2e-traverse, e2e-ct, e2e-anchors, e2e-clip, e2e-anim, e2e-combat, e2e-wall, e2e-netmove, e2e-levels, e2e-stealth, e2e-foley, e2e-weapon-audio, e2e-weapons-carry, e2e-mouse, e2e-feedback, e2e-tactics, e2e-enemies, e2e-takedown (solo parts on `test`), e2e-pad (strike, vent, remap).

**G2c: the annex and the guard/light suites**
- Build 1.4 and the rest of section 2: rooms, switches, alarms, hideSpots, reinforce, surfaces, zone, L0, L1, 3 doors.
- Read the real light once (`lightField.levelAt`) to set L0 and the zone value. Targets: the S8 level > 0.6; the guard's head in the lights test ≥ 0.45 before the shot and < 0.35 after; grey cards 0.12 / 0.27 / 0.40 present.
- Gate the pause tuner row on the stage.
- Must pass: e2e-lightbake, e2e-darkness, e2e-desktop, e2e-gadgets, e2e-guard-carry, e2e-score, e2e-offline, e2e-modes, e2e-menus (pause), e2e-pad (ctx door), e2e-coop-chamber.

**G2d: the two big suites**
- Re-base e2e-stealth-ai (3.1) and the guard parts of e2e-coop: client hits, S9, the guards block, S23, S24, S26, hang-down, char-shadow, torches, door peek, ctx prompts.
- No new geometry is expected. If a point fails, move the point, not the room.
- Must pass: e2e-stealth-ai, e2e-coop, e2e-netmove (re-run).

## 5. Size and cost
- **Floor and bounds:**
  - Interior 784 → 1008 m² (+29%); bounds 28 x 28 → 36.3 x 28.
  - For scale, the Warehouse is about 54 x 47 m.
  - The ceiling height (8 m) is the same.
- **Light bake:**
  - The canonical shapes and the sky/moon grids scale with the bounds volume: about +30%.
  - Lamps go from 7 to 9 (+2 visibility bakes; L1 is tiny, radius 3).
  - CHAR_SHADOW slots stay at 4.
  - About 1.3-1.35x today's chamber bake, well under the Warehouse.
- **Nav:** about +30% cells (same layer count, 3). New links: one zipline. There is no new ladder.
- **Boxes:**
  - About 42 new solid boxes: booth 10, roof duct 4, pieces 12, annex walls and lintels 10, floors 4, dumpster, H1, fin.
  - The booth uses 9 m² of the main room's empty NE corner and adds one rope.
  - About 22 more grid lines (visual, non-colliding).
  - Thin instances, so the draw-call cost is unchanged.

## 6. Risks and unknowns
1. **Booth details.**
   - Hidden lips at the 4.2 m wall tops under the roof slab are suppressed with `mark noLedge`, and the hole edges with `noLedge(25.9, 26.7, 0.7)`. Whether lip generation already skips covered tops is unchecked, so the marks stay.
   - The roof's outer south and west lips (4.4) remain: harmless extra boost-band lips.
   - The booth's 1.35 m gap to the bar post is enough for the bar loop. That gap is not covered by a recorded walk-in check.
   - The split fin needs nothing new: it faces the unchanged single-box team block, 1.65 m apart, so it qualifies by the rule.
2. **Light values are estimated, not measured.** Still to measure: the L0 pool level, the hall's dark cells, and the 0.27 / 0.40 / 0.12 cards (bounce inside the closed annex). A second dim hall lamp may be needed if the L0 gradient is steeper than findCards' 0.15/m steadiness rule.
3. **Booth roof duct.**
   - The ceiling-vent drop is 4.4 m, just under the heavy band at 4.5. If the landing reads heavy, add `b.block(25.9, 26.7, 1.0, 1.0, 1.0, PROP_DARK)` under the vent inside the booth, for a 3.4 m drop.
   - The crawl path is only 0.75 m, because the 3 x 3 m roof holds both the hole and a stand point. If the duct state needs a longer path (unchecked), lengthen it along z: path (26.9, 4.4, 25.6) → (25.9, 4.4, 26.7), entry facing -z from the front roof strip. Or make the booth 4 m deep (z 24-28; the front face then sits at z 24, still clear of the anim lane's z ≤ 23.8 turns).
   - The floor-duct tests (prompt, unscrew, crawl, camera, gun) stay on `ducts[0]`.
4. **Doors and the nav:** unclear whether the nav floods through shut unlocked doors. If not, add the two annex navSeeds (section 2). Door swing signs need checking against `doors.ts`.
5. **Ambient zone edge:** the 1 m trilinear grid may lift x 28.3-29 near the divider. Cards and dark asserts are kept at x ≥ 29.5.
6. **Drainpipe shimmy room** (existing, z 8.25-10.75 with the ladder at z 9) is tight for e2e-traverse's pass-the-pipe checks. Unchanged here; if it fails, re-axis the check rather than move the prop.
7. **Main-room squad roles and four intruders** depend on runtime searches over a room full of props: high re-tune risk.
8. **Dummies and props spawn in the stage too** unless G2a spawns dummies in `'test'` only. Props are placed off every loop walk-in, but a physics prop can still be knocked.
9. **e2e-tactics' noise check** and **e2e-coop hits** both had map- or mode-specific gates (the Mission uncoordinated rule; `map.id==='warehouse'`): both are rewritten, not just moved.
10. **Unclear:** `__chamber.pick('off')` validity. It is moot once G2a makes the stage opt-in, but suites must not boot `&stage=1`.

## 7. G2b as built: divergences from sections 1-4 (recorded 2026-11-01)
- **Tunnel (#2):** the entry is from the north, (1.2, 0, 15.6) facing -z. The spec's (1.2, 0, 10.9) is inside the platform (z 8-11). Crouch-walk window z 11.5-14.5 holds.
- **Step row (#1):** the mantle and step points stand at z 2.2, not 2.5. The traversal probe reaches 1.3 m from the feet and the faces are at z 1.2. The debug point moved to match.
- **Zipline (#8):** the high end is at the ledge wall's edge, (5.3, 4.3, 25.4), the post at z 25.7, the low end (5.3, 2.3, 19.0), the stand (5.3, 2.42, 26.4). With the high end 1.9 m back the rider's legs went through the wall.
- **Booth roof duct (#10):** the duct shell runs west to x 25.0 (the end cap at x 25.05) so the crawling head clears it. A 0.8 x 0.8 x 1.0 m block stands under the vent hole (the fallback of risk 3). The attach controller's floor probe is 3 m deep, so a bare 4.4 m drop found no floor. The drop is 3.0 m on the block (roll band); the booth is 0.6 m deep past the vent, so the roll itself has no room, and e2e-traverse asserts the registered landing.
- **Dummies (#12):** they stand in every match that is not the animation stage (Free Roam and the test mode), not in the test mode only. The stage is opt-in now, so the plain room is the test bed.
- **Stage (section 3 boot changes):** `autostart=chamber` starts the plain room; the stage starts from the main menu row and `?stage=1` (G2b, not G2a).
- **Hang block B (#6):** the jump from the ledge wall's east end lands on B's west face. e2e-traverse then shimmies round the south and east corners.
- **Drainpipe (e2e-traverse):** the east lip beside the pipe is 0.6 m on its north side, so a sideways step there carries round the corner; the shimmy past the pipe runs on to the ladder.
- **e2e-ct fence and split:** the split feet read 1.55 m of the 1.65 m gap, the fence stops the body at z 6.16.


## 8. G2c as built: divergences from sections 1-4 (recorded 2026-11-01)
Owner decision N17 settled the annex (a side room behind a door, same look, about 8 m wider; the main room unchanged) and the practice guards. Nothing below needed a decision beyond it.
- **Floors (1.4):** the four floors run flush under the walls (hall x 28-36.3 z 14-28; store x 28.3-32.45 and aisle x 32.45-36.3, z 8-14; dark bay x 28-36.3 z 0-8), not as separate boxes with 0.3 m gaps at the doorsills (the annex door sill, partition A's, the store doorway). The surfaces are still the two `b.surface` areas.
- **Lamp order (1.4, section 2):** L0 and L1 are added after the seven main-room lamps (ids 7 and 8), so the old lamp ids and `lights.list[0]` (the EMP test's first electric lamp) are unchanged. The annex zone (0.12) is under 0.5, so the map now also has the four guard torch slots (flashlight lights at ids 9-12, parked under the floor); every suite on the chamber sees them.
- **No navSeeds for the hall and the dark bay (section 2, risk 4):** doors are armed after the nav grid is built (`Doors.arm`), so the nav floods through the shut doors; the walkability of the annex points was read in the running game. The door swings are as the spec says (annex door into the annex, partition A's into the south part).
- **Light (section 6, risk 2), measured once with `lightField` at G2c:** no change to L0 or the zone value was needed. Body level (1.75 m): S8 (32.3, 23.5) under L0 1.00; the guard's spot (33.5, 21) 0.674 before the lamp is shot and 0.122 after (the hall with L0 off); the closed-door dark side reads 0.122 (bay, aisle, store south end 0.154-0.175); P (32.3, 15.5) 0.153. Grey cards the game's own search finds in the annex: 0.12 at (29.1, 1.0), (29.1, 4.0), (31.6, 6.0), (32.1, 1.0); 0.27 at (30.1, 18.5), (34.1, 18.5); 0.40 at (31.6, 19.5), (35.1, 27.0), (29.6, 27.0); 0.70 at (34.1, 25.0), (30.6, 22.0). The main room reads as before (0.45-1.0). The 0.27 and 0.40 cards sit in L0's pool edge, steady to 0.15 per m, so no second hall lamp was added. The chamber light bake: 7 lamps, 113 shapes, about 0.8 s (0.79-0.97 s over four cold boots) before; 9 lamps, 0.85-0.87 s after, 1.05x.
- **Mine (e2e-gadgets):** laid at (33, 1.5), the operator back at (33, 7.5), not (30, 1.5) and (30, 7.5): (30, 7.5) is inside the dumpster (x 29.35-31.25, z 6.75-7.75).
- **Noise and sticky cam (e2e-gadgets):** the operator stands in the open middle at (20, 21); the noisemaker and the cam are thrown from (8, 1.5, 1.5) at the door wall; front guard (2, 1.5) facing -x, far guard (8, 11). `reset()` also clears the grenades (the arc scenario's frag lands near the next scenario's guards on this map).
- **Practice guards (decision N17), placed outside the middle:** the designer's (12.75, 17.5), (15.25, 17.5), (19.5, 15.5) sit 0.1 m off the lane's bodies (z 17.6) and 1.5 m from the vent's walk-in, so they moved: (12.75, 16.75) and (15.25, 16.75) yaw 0 (backs to the spawns, 2.5 m apart, 3.0 m from the circle's centre), and (19.75, 16.25) yaw -2.0 (looking at the spawns' middle, 2.25 m from the vent walk-in). All three are grunts, 2.4 m or more from both spawns, clear of every solid box and every loop walk-in (`tests/testChamber.test.ts`).
- **How they start:** `MapLayout.practice` (a `SquadSlot` list, passive) is placed by `TestMode.startPractice` when `GameOptions.practice` is set: the main menu's Test Chamber row (now `mode: 'test'` with the stage, was Free Roam with the stage), the co-op lobby's Test Chamber start (the host's match), and `?practice=1` on a URL boot. `?practice=0` turns them off for the menu and the lobby; `e2e-lib` appends it to every test page unless the test names `practice=` (so no suite but the ones that ask has them). They are not room squads: `?guards=1` stays at five. `TestMode.populate` also sets `passive` from a slot now (the gap the designer found).
- **Practice guards ignore bodies (code detail):** a practice guard has an explicit `Enemy.practice` marker (it does not look for bodies) and no awareness key (`key = -1`), so a taken-down practice guard does not send his neighbour searching. Every other passive guard, the Marlow Yard gate checker included, behaves as on master (`tests/practiceBody.test.ts`).
- **Respawn (`practiceGuards.ts`):** down (killed, knocked out, carried off) 10 s and nobody within 2.5 m of the spot; a body being carried is left alone; the old guard and his body are removed and a fresh one placed (host only, the client mirrors as for any guard). No change to the wire, so `PROTOCOL_VERSION` stays 87.
- **Pause row:** `AnimTunePanel.pauseRow` (the tuner may open and `stageOn`, set by the app from `GameState.chamber`). The plain room and the co-op room list no pause row (F3 > Anim and the Settings row work there); the stage lists it before Quit.
- **Benchmark (e2e-desktop part 1):** `app.benchmark` flies the Test Chamber in the test mode (was the Warehouse in Clear): the Settings text says so. Part 3 spawns two alerted guards that face each other 3.2 m apart in the dark bay with the operator between them (a character in a torch's cone is what the torch shadow map renders); the dark bay has no props that cast.
- **e2e-darkness:** the 0.12 card is searched in the annex's south half (x 29.5-35.8, z 0.5-13.5), the 0.70 card in the main room; the thermal check tries the annex doors first (the chamber door's leaf reads too bright for the 40-unit blue margin) and takes the first with the margin.
- **e2e-menus:** the pause checks run on `mode=test`; with the stage off the list has no tuner row and the Objectives screen says "No objectives"; a second page (`stage=1`) lists the row. The Marlow Yard course gives the Objectives screen no lines (only Sector Ops does), so there it checks only that the screen opens; the mission's "current objective" check stays on the Warehouse Infiltration page with the tuner pad part, the results and the touch part (they go in stage H). That page overrides `stageOn` as it overrides `allowed`.
- **e2e-pad:** the context door check is on the annex door (stand (27.35, 20), away (24, 20)); the play setup and the in-game pause flow stay on `warehouse` (`__play('warehouse', 'sandbox', 'realistic')`).
- **e2e-enemies:** the drone's park is the dark bay (35.3, 1.5); the officer's alarm run now has a real panel (`alarm-0`, hall). Alerted guards go for the annex's panels, so the enforcer scenario sets `alarmRaised` as the sniper's does.
- **e2e-guard-carry:** the forced-timeout leg waits for the console to be quiet 3 s before it sorts the fault's own lines (the chamber compiles faster than the Warehouse, so the Babylon fallback chain outlasted the leg). Both pages boot `mapready=0`: the faults need the body shaders to compile after the match starts, and the load gate (on by default since one-game) compiles them first.
- **After the one-game merge (#740):** the e2e-menus Warehouse page carries `mapready=0` as master's other Warehouse boots do; the menu-start check in e2e-testmode waits for the load gate's release (`__mapReady.released`) before it steps the sim.
- **Failing on master too (not touched by G2c):** e2e-clip (ladder climb: 25.6 cm of the body in the world), e2e-anim (crouched start: elbows 23.9 cm outside the shoulder), e2e-foley (a sprint plants 7 times against a walk's 8), e2e-weapons-carry (every weapon visible, holstered, carried in its slot) and the mission part of e2e-modes (the hack row is empty): the same assertion each, on master 97152d5e3 and on this branch. Not isolated further here; G2c did not touch what they measure. e2e-desktop part 1 stalls after its benchmark checks on this PC (past `the benchmark leaves no override behind`, 900 s) on master as well; its benchmark checks all pass here.
- **e2e-score, e2e-offline, e2e-lightbake, e2e-modes:** `?guards=1` (the five squad guards). The test mode has no objective (offline asserts it). Left on their old maps (they go in stage H): the Mission and enemy-type parts of e2e-modes (Warehouse mission, Proving Grounds), the Infiltration match of e2e-offline, the mission-only parts of e2e-menus (above), the play setup and pause flow of e2e-pad.

## 9. G2d as built: the two big suites (recorded 2026-11-02)
Owner decision N18: slim G2d to the core guard tests (seeing, hearing, search, bodies, co-op guard sync); the detail tests of systems later phases rework are dropped. Dropped code is restorable from git history. No map change was needed.

**e2e-stealth-ai** (boots `autostart=chamber&mode=test`)
- Kept: shadow, light, vision-detect, walls, vision (seeing); noise, one investigates, shots (hearing); lkp, search area, heard in a search (search); bodies, carry (bodies).
- Dropped under N18, restorable from history: vision-dog, radio, radio window, radio stagger, report then engage, patrol, lights, breaker, light pair, alarm, alarm call, revive, witness, surfaces, doors, optic cable, wall peek exposes the head, helmet, armour, missed check, loud shot, squad roles, four intruders, dog release, the context prompts door block, the charshadow block (and the stand-in players, `t.fakes`, and the storey helpers only they used).
- Moved away from section 3.1:
  - noise: player (33, 4) and guard (33, 6.7), not x 31. The dumpster (x 29.35-31.25, z 6.75-7.75) stands on the guard's spot.
  - carry: victim (33.5, 3.5) and player (33.5, 1.0), not x 30.3. Walking on with the body from x 30.3 ended within 1.5 m of the dumpster's hiding spot, so the interact hid the body instead of putting it down. The hide step is at (30.3, 6.05) yaw 0 as in 3.1.
  - search area, `three`: the three hide in the crouch tunnel (1.5, 13), not HIDE_FAR. With three guards, one reached the annex door, from where (3, 2.5) is in sight across the main room, and the last known position moved onto the player. `near` and `wall` keep HIDE_FAR.
  - heard in a search, `wall`: the cell is picked at least 3 m from every point of his search plan. The cell behind H1 is the plan's top point, so his own search came within 1.5 m of it with no noise at all.
- Points 3.1 left open, picked here:
  - the parked player is HIDE_FAR (3, 2.5) in noise, one investigates, bodies, shots and heard in a search;
  - the calibration walk of heard in a search starts at S;
  - the impact in shots hits H1's west face at (34.3, 1, 21.5), a guard at (32.0, 21.5);
  - vision: guard P and player S;
  - shots: the guards face away from the player (yaw π).

**e2e-coop** (the matches are Test Chamber matches, `['test', 'chamber', '']`)
- Kept and re-based: host-validated client hits and kill credit; a host guard's torch on and off on the client; "co-op on the guards" (calm puppets, doors, mirrored items, a client takedown, kept and hidden bodies, strike, pings, gas, grab, the host's team takedown, dual takedown, a client revive); S23, S24, S26; the hang-down; the guard look seeds (G9); the difficulty part.
- Dropped under N18, restorable from history: guard-ai S9 (stage gear, bark, caution, shield-led team, deflect), the joint interrogation, the Infiltration objectives check, the char-shadow-meter block.
- Non-guard parts kept: lobby, server browser, ready-up, downed and revive, malformed messages, weapons crate, rejoins, team wipe, back to lobby, pause return, door peek, wall medkit, host leaves, context prompts, offline, the Marlow Yard course restart.
- Guards: the test mode queues none, so each match spawns grunts in the annex hall (`spawnHall`: x 29.6-35.8 at z 17, and (30.4, 19.2)): 5 in the first match, 6 in the guards match, 3 in the hang-down match.
- Points (section 3, e2e-coop row, unless stated):
  - hits: the victim at (20, 21), the client 2.2 m north of it;
  - takedown and grab pads (19, 21), strike pad and denied guard (21, 21), the client 1.1 m (takedown, grab) or 0.9 m (strike) behind; the gas victim (21, 20); the pings inside the room;
  - S23: guard (33.5, 17.1), client (33.5, 26), host (33.5, 12.8), as 3;
  - S24: pair 1 (31.8, 15.5) and (32.8, 15.5) with the host at S8; host hides in the store (30.3, 11), as 3. Pair 2 at (13.4, 20) and (14.6, 20) with the client at (14, 11), not (20, 12): the squad roles hold a pair 8 to 15 m off its last known position, so a client at (20, 12) had pair 2 holding at the annex door, nearer the host's spot than its own. The client hides behind the door wall at (12, 2.5), not in the tunnel: pair 2 saw the client in the tunnel for most of the hide;
  - S26: guard P, client S8, host HIDE_FAR, client hide (12, 2.5) (the same reason as S24);
  - hang-down: the ledge wall lip (top 2.4, z 25), hang at z 24.6, host on the deck at z 25.4, the client set up at lip.x - 0.8 (west, clear of the zipline post at x 5.3), the guard under the hang at (lip.x + 0.3, 24.3), the others at (lip.x + 3 + 1.5i, 21);
  - context prompts block: host (14, 24.55) and client (14, 23.7) at the team block's south face, map `chamber`.
- Test-side changes the move needed (no game change):
  - the weapons crate part turns `infiniteAmmo` off on both pages for its length: the test mode has infinite ammo, which makes a crate use a no-op;
  - the pages open with `ctxprompts=0`: the prompts are on by default since one-game, and the hang-down's hold-A list and the grab menu are written for the menu (as e2e-takedown and e2e-net-lib);
  - the context prompts block keeps its own `ctxprompts=1` pages.
- Left on another map: the Free Roam objective line ("Free roam" on the client) runs on a short Proving Grounds match, because the test mode has no objective; the Marlow Yard course restart stays on the course map. Nothing is left on the Warehouse.
- Run on the laptop RTX (Edge, headless): e2e-stealth-ai 1.5-1.6 min, e2e-coop 7.3 min, both passing.
