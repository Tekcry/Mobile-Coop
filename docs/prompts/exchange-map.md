# Task: Kestrel Exchange - a linear stealth level in a real 1930s building

## Context
Silent But Deadly (repo Tekcry/Mobile-Coop). Base branch: `ct-movement` (the Chaos Theory movement: speed gears,
split jump, wall jump, pipe legs-up / inverted, rappel, fences, CT takedowns and the grab, co-op team moves). Create
branch `feature/exchange-map` from `ct-movement` and work only there. Never merge into `ct-movement`, `dev` or
`master`, and never merge any branch into yours; Michael merges into `ct-movement` to test on the `/ct/` preview.

Goal: a new listed map, `exchange` ("Kestrel Exchange"), designed the way a professional level designer would design
a Splinter Cell: Chaos Theory level. It is a believable building first and a stealth playground second: every room
exists because the building needs it, every climbable thing is a real building element, and the player's path through
it is linear, readable and smooth, flowing between watching, sneaking, handling guards and a breather. Combat is always
optional; darkness and silence are always the better answer; every encounter has at least three solutions.

This map follows `docs/level-design.md`, the level design standard for every map (added by the handover). Where this spec is more specific, it wins; it never loosens the standard.

You are acting as a senior stealth level designer, then as the builder. Design comes first, on paper, reviewed by
Michael before a single block is placed.

## Scope: existing systems only (hard rule)
- This work builds a map, a mission entry, tests, dev scripts and docs. It adds no new game systems: no new movement,
  AI behaviour, takedown kinds, interactable kinds, objective types, net messages, HUD elements, input bindings or mode
  logic.
- TypeScript you write: `src/world/maps/exchange.ts`, its registration in `src/world/maps/index.ts` and
  `src/world/maps/listed.ts`, an exported constant of the map's co-op lips, unit tests. JSON: one entry in
  `src/config/missions.json`. Scripts: e2e suites and the plan renderer (`scripts/plan-svg.mjs`, Phase 3).
- If a step seems to need anything else, stop and report it as a "Future" item. Do not build it.
- Enemies must not change (perception, alert machine, motion, archetypes, `MAX_ALIVE`, `SQUAD_CAP`). Tune encounters
  with architecture, light, surfaces, patrol routes and waits only.
- Tuning tables (`config/movement.ts`, `game/takedown.ts`, `ai/perception.ts`, `world/anchors.ts`) never change. If a set
  piece does not engage, change the building.
- Parked maps, the Warehouse and Proving Grounds: no changes.

## Originality (hard rule)
- Kestrel Exchange is an original design. Do not open, read or copy `src/world/maps/warehouse.ts`,
  `src/world/maps/warehouseArt.ts`, `src/world/maps/provingGrounds.ts` or any parked map, and do not reuse any other
  map's layout, coordinates, room ids or names, colours, set-piece arrangements or guard routes.
- `CLAUDE.md` describes the Warehouse in places. Read those sections for how the systems work only; ignore layouts.
- Learn each `LevelBuilder` call from its signature and doc comment in `src/world/levelBuilder.ts`, the storey helpers
  from `src/world/maps/storey.ts`, the anchors from `src/world/anchors.ts`.

## Rules for working (read twice)
1. Read `CLAUDE.md` in full before anything else, then `docs/level-design.md`, then `docs/ct-movement.md` and
   `docs/ct-movement-progress.md`.
2. Before referencing any file, type, function, field or constant, confirm it exists with grep and note where. If
   something named in this prompt does not exist or differs, stop and report it; never invent a substitute.
3. Work one phase at a time. At the start of each phase, re-read this prompt (`docs/prompts/exchange-map.md`), the
   progress log and the approved design docs, then print a short plan (files and functions, one line each). Do only that
   phase.
4. At the end of each phase: run the listed checks, report results honestly (never claim a check passed unless you ran
   it in this phase; paste the summary line), list what changed, update the progress log, commit and push
   `feature/exchange-map`, then STOP and wait for Michael's go-ahead.
5. This spec lives at `docs/prompts/exchange-map.md` (added by the handover). Never edit it, or
   `docs/level-design.md`, without Michael's approval; proposed changes go in the progress log under "Spec change
   requests".
6. Progress log: `docs/prompts/exchange-map-progress.md` (phase, status, files changed, decisions, tests run with
   results, open issues, spec change requests).
7. Once Michael approves a design doc, it is the build contract. Build exactly it; any deviation goes under "Decisions"
   with the reason. If a deviation changes a route, a guard job or a room, stop and ask.
8. Update `CLAUDE.md` (World and player, Modes, the Commands e2e list) and `CHANGELOG.md` (`## 3.2.x - Kestrel Exchange`,
   a bullet block per phase) at the end of each phase that adds playable content.
9. Hyphens, never em dashes, in docs and comments. Follow `CLAUDE.md` Conventions and Hard rules.
10. Checks: `npm run check` (= lint + test + build). e2e needs a build first; single suites with
    `npm run e2e -- <suite>`; new suites are added to the default list in `scripts/run-e2e.mjs`.

## Verified facts (confirm each in Phase 0; report any mismatch)
| Fact | Where |
| --- | --- |
| `MapDef { id, name, description, theme, modes, build(b, seed), art?, weathers? }`; `build` returns `MapLayout` (`playerSpawns, enemySpawns, props, objectives, pickups, rooms?, switches?, alarms?, hideSpots?, reinforce?`) | `src/world/mapDef.ts` |
| `MAPS = [warehouse, provingGrounds]`; first map listing a mode is its default; `LISTED_MAP_IDS = ['warehouse', 'proving']`; `MISSIONS` filters on it | `src/world/maps/index.ts`, `listed.ts`, `src/game/missions.ts` |
| `RoomDef { id, name, minX, maxX, minZ, maxZ, minY?, maxY?, squad? }`; `SquadSlot { kind, x, z, yaw, y?, route?, wait? }` | `src/world/rooms.ts` |
| `LevelBuilder`: `box, block, floor, wall, wallX, wallZ, ramp, stairs(x, z, w, len, rise, steps, color, yaw, y), pillar, lowCover, highCover, perimeter, ladder(x, z, y0, y1, facing), pipeV, pipeH(ax, az, bx, bz, y), zipline, duct(path, entry, exit, grates), windowAt(cx, cy, cz, w, h, yaw, { sill, breakable, open }), door(hx, hy, hz, width, yaw, { height, swing, locked, breachable }), rappel(x, y, z, yaw, length), fence(ax, az, bx, bz, height, y), ledge(ax, az, bx, bz, top, opts), mark(from, { overhead, noLedge }), noLedge(x, z, r), light(init), surface(kind, minX, maxX, minZ, maxZ, top), ambientZone(minX, maxX, minZ, maxZ, ambient, minY = -1, maxY = 8)` | `src/world/levelBuilder.ts` |
| Storey helpers `wallXAt, wallZAt, windowX, windowZ, glassX, glassZ` | `src/world/maps/storey.ts` |
| Nav grid keeps at most 3 walkable surfaces per column (`layers`, default 3 with `sampleLayers`); stairs and ramps join storeys by height | `src/ai/navGrid.ts` |
| Light init fields (kind, x, y, z, radius, intensity, color, cone via `makeCone`, group, fixture) - confirm `LightInit` | `src/world/lights.ts` |
| Surfaces `concrete 1, metal 1.6, grate 1.4, wood 1.15, gravel 1.3, carpet 0.6` (`SURFACE_NOISE`) | `src/world/surfaces.ts` |
| Footstep noise is 0 at or under `NOISE_QUIET` (crouch 1.9, stand 1.45 m/s) on every surface; the surface only scales audible steps. Silent = crouched gears 1-4, standing gears 1-2 (`GEARS`) | `src/player/movement.ts`, `src/game/gameState.ts`, `src/config/movement.ts` |
| `LANDING` soft 0.6 / roll 2.5 / heavy 4.5 m; noise soft 1.2, roll 5, heavy 11 m | `src/player/movement.ts` |
| `SPLIT` 1.2-1.95 m wide, faces >= 3.6 m tall, feet at 2.5 m; gaps found from cover faces automatically | `src/config/movement.ts`, `src/player/splitJump.ts` |
| `WALL_JUMP.minUp 2.7`, `maxUp 3.8`, `wallReach 1.0`; `REACH.grabMax 2.7`; `LEDGE.minDrop 1.9`; manual jump grabs up to ~3.1 m | `src/config/movement.ts`, `src/world/anchors.ts` |
| `TEAM.boostMax 4.5`, `ladderGrab 4.1`, `mateRange 3`; `checkTeamRequest`, `canBrace` | `src/config/movement.ts`, `src/game/teamMoves.ts` |
| `TAKEDOWN`: drop 1.2-5 m below within 1.0 m; above 1.1-4.6 m within 2.2 m; below (ledge pull) 1.4 m; window 1.7 m; inverted 0.9 m, victim 0.6-2.8 m below | `src/game/takedown.ts` |
| `DUAL_WINDOW 1.5` s; revive needs the reviver within 1.5 m of height; no bleed-out | `src/net/coopHost.ts`, `src/game/interactables.ts` |
| `MAX_ALIVE 10`; Infiltration and Hunter `SQUAD_CAP 9`, pending squads spawn nearest first, >= 7 m from the player | `src/ai/enemyManager.ts`, `src/game/modes/*` |
| Mission JSON: 1-3 insertions; objectives `download (30-60 s) plant (1.5-8) sabotage (2-10) intel (items) extract (radius 1.5-8)`; rules `noAlarms noKills undetected` = `off | bonus | fail`; `squads: 'rooms' | 'spawns'`; checkpoint = player position when an objective completes | `src/game/missions.ts`, `src/game/modes/infiltrationMode.ts` |
| Enemy kinds `grunt runner heavy sniper enforcer dog droneOp officer` | `src/ai/enemyDefs.ts` |
| `scripts/shot.mjs <out.png> [query] [waitFrames] [js]`; `perf.mjs` takes `MAP=`; e2e map lists hard-coded in `e2e-anchors.mjs`, `e2e-clear.mjs` | scripts |

## Applying the standard to this map
`docs/level-design.md` sections 1-12 govern every design decision. For the Exchange in particular:
- **"Why is it here?"** is answered against a 1934 telephone exchange or its present-day use by the broker.
- **Guard jobs**: the contracted night watchman's clocking rounds (stops at watchman's clock stations), the engineer
  reading switchgear gauges, the broker's tech babysitting servers, his head of security, his men at the cage and the van,
  a lookout on the roof.
- **Light**: work lamps, green-shaded desk lamps, fluorescent tubes (offices, server hall), the yard floodlight,
  moonlight through tall windows, the light well and skylights. Switches by doors.
- **Sound**: terrazzo and concrete (normal), linoleum and carpet in the offices (quiet), chequer plate over cable
  trenches, steel gratings and roof walkways (loud), glass.
- **Landmarks**: the light well, the brass call-board clock in the switchroom, the floodlit yard.

## Building brief
**Kestrel Exchange**, built 1934 as a city automatic telephone exchange (step-by-step equipment, a manual switchboard
for operator-assisted calls), steel frame, red brick with Portland stone dressings, art deco details, a central light
well for daylight to the equipment floors. Decommissioned in the 1990s; the shell (MDF frames, power room, switchboard
suite) survives because the building is heritage-listed. A black-market data broker now leases it: his servers fill the
old apparatus room, his tech works nights in the switchroom, a contracted night watchman does rounds, his own men guard
the cage and the yard. Night, rain.

Construction rules: structural grid of columns at 6 m centres (0.5 m square, visible inside); external walls 0.45 m;
internal brick walls 0.23-0.3 m; ground floor y 0, first floor y 4.5 (equipment floors are tall), roof 9.0 with a 1.0 m
parapet; storey slabs 0.3 m; tall steel-framed windows (sill 0.9, 1.6-2.0 wide, 2.4 high) on a regular rhythm; stone
string courses on the light-well walls at first-floor level and under the parapet; cast-iron drainpipes in the light-well
corners and on the rear elevation; a central stair and lift core; a goods entrance to a rear yard. At most three
walkable surfaces in any column (ground, first, roof); a double-height room has only its floor, any gallery, and the
roof.

Real dimensions to use: corridors 1.8-2.4 m; doors 0.9-1.0 x 2.1 m (double 1.8 m); stairs 1.2-1.5 m wide, rise 0.17
run 0.28, with a landing per half flight; MDF frames 4.0 m tall, aisles 1.2-1.95 m; apparatus racks 3.2 m, aisles 1.0-1.2
m; overhead cable runways (ladder racking) at 4.3-4.5 m above the floor; switchboard suite 1.4 m tall with operators'
positions at 1.5 m centres; office 4-6 m square; light well 10-14 m square.

Palette: wall plaster `#9c9486`, dark panelling `#4a3b2e`, bakelite black `#1f1c1a`, switchboard green enamel `#3f5e4f`,
brass `#b08d4a`, oxblood tile `#6e2f2a`, terrazzo `#8a857b`, cast iron `#3c4146`, Portland stone `#c9c2b0`, red brick
`#7a3b2e`, office carpet `#4f3a46`, glass `#1b2430`. Lights: warm sodium `[1, 0.78, 0.5]` (work lamps, yard), cold
fluorescent `[0.8, 0.95, 1]` (offices, server hall), green-shaded desk lamps, moonlight through windows and the light
well. Grade `{ tint: [0.95, 0.97, 1.1], saturation: 0.8, contrast: 1.12 }`.

## Stealth verbs found in the building (use these mappings; justify any other)
| Verb | Real building element |
| --- | --- |
| Split jump (needs faces >= 3.6 m, 1.2-1.95 m apart) | Aisles between 4.0 m MDF frames; the narrow air shaft between the exchange and the neighbouring building |
| Horizontal pipe (hands, legs up, inverted) | Overhead cable runways at 4.3-4.5 m over apparatus / server aisles; the heating main along the power room |
| Lip hang, shimmy, gap jump, outside corner | Stone string courses on the light well; the power-room gallery edge; the roof parapet; window sills |
| Wall jump (lip 3.2-3.6 m, wall within 1.0 m) | Tops of cable trench walls and switchgear cubicles against a wall; a light-well corner below a sill |
| Ladders | MDF rolling ladders, the cable-chamber access ladder, the roof hatch ladder in the lift motor room |
| Drainpipes | Cast-iron downpipes in the light-well corners and on the rear elevation |
| Ducts and vents | The battery room's acid-fume extract duct; the office corridor's ceiling void with ventilation grilles |
| Rappel | From the roof parapet down the rear elevation into the yard |
| Fence | The engineers' stores cage; the broker's server cage; the yard gate |
| Doors, windows | Real doors on every room; steel-framed windows (opening casements = open, fixed panes = glazed) |
| Low / high cover | Desks, the test desk, battery stands, switchboard suite (low); MDF frames, racks, cubicles, lockers (high) |
| Hide spots | Lockers in the cloakroom, store cupboards, the cable chamber's cable drums |
| Zipline | No believable fixture in this building: leave it out (report it) |

## The route (spaces in path order; Phase 1-2 turn this into plans and sheets)
Each space lists what it is, what is there tonight, and how it meets the standard: new mechanic, routes (shadow / high /
loud / secret), the loop, guard jobs with isolation moments and overlaps, toys, objective and connector. Phase 2 may
refine any of it (recorded as Decisions) but must keep every standard requirement. Guards: 9 in total (`SQUAD_CAP` 9
spawns them all at the start; do not add a tenth). Each space is one `RoomDef` (ids `cable`, `mdf`, `power`, `well`,
`switchroom`, `offices`, `servers`, `roof`), plus extra rooms for galleries / storeys via `minY` / `maxY`.

1. **Cable tunnel and cable chamber** (ground, insertion, no guards, tension 1).
   - Street cables enter through a concrete tunnel from a manhole; the chamber is low (3.0 m ceiling) with cable bearers
     on the walls, cable drums and a sump. Dark, one caged bulkhead lamp with its switch.
   - Teaches: gears, the light and noise meters (a chequer-plate sump cover), lip hangs on the cable bearers, a hide spot.
   - Connector: a short stair to a fire door with a wired-glass panel showing a moonlit stripe of the MDF hall.
2. **MDF hall** (ground, 1 guard, tension 2).
   - A long, tall hall; rows of 4.0 m MDF frames with narrow aisles and cross aisles; rolling ladders on rails; a test
     desk under a green desk lamp; tall street-side windows throwing moonlight stripes across the aisles; the cable
     trench under the floor with removable chequer-plate covers.
   - Teaches: darkness vs moonlight, timing a patrol, the split jump, the rolling ladder to frame tops.
   - Routes: shadow along the dark aisles between moonlight stripes; high up a rolling ladder and along the frame tops
     (split above his aisle); loud straight down the cross aisle; secret through the cable trench (a duct with floor
     grates) from the frame end to the battery room door.
   - Loop: around a frame row via two cross aisles.
   - G1 night watchman (grunt), clocking rounds: in from the lobby, the cross aisle, a clock station by the test desk (5 s),
     down one frame aisle, out. Isolation moment: at the far clock station in the dark aisle end. Lure: the test desk lamp.
   - Objective: intel "the frame records" on the test desk. Connector: the battery room lobby (two doors, quiet).
3. **Battery and power rooms** (ground; double-height power room with a switchgear gallery at 4.5 m; 1 guard; tension 2).
   - Battery room: rows of glass-cell batteries on 1 m stands, acid-tile floor, the fume extract duct overhead. Power room:
     generators, rectifier cubicles, chequer plate over cable trenches, the heating main along a wall, a steel stair to the
     gallery.
   - Teaches: noise by surface (chequer plate loud, battery room quiet), ledge pull, the heating main as a pipe.
   - Routes: shadow through the battery room and along the generators' dark side; high on the heating main and to the
     gallery edge; loud across the chequer plate; secret through the extract duct from the battery room to a grille behind
     the gallery.
   - Loop: around the generator block.
   - G2 engineer (grunt) reads gauges along the gallery (`y` 4.5), pauses at the rail over the dark generator side.
     Isolation moment: the gallery's far end, back to the room. Lure: the gallery work lamp.
   - Objective: sabotage "disable the generator auto-start" in the dark by the exit. Connector: a corridor with a door to
     the light well, its glass showing the court in rain.
4. **Light well** (ground, open sky, watched from above, tension 3).
   - A stone-paved court with a dry fountain; cast-iron drainpipes in the corners; stone string courses at 4.5 m and under
     the parapet; the switchroom's tall windows look down into it, one lit; a fire escape with its drop ladder pulled up
     (co-op C1); the narrow air shaft to the neighbouring building in one corner.
   - Teaches: climbing (drainpipe, string-course shimmy with a gap and an outside corner), getting up a floor unseen.
   - Routes: shadow along the colonnade's dark side to the internal stair (the watchman's round passes it); high up the
     drainpipe and along the string course to an open casement; loud straight up the internal main stair; secret up the air
     shaft by split jumps to a first-floor window.
   - Loop: around the fountain.
   - No guard on the ground: G3 in the switchroom glances out (overlap: he covers the court). Isolation: n/a.
   - Objective: plant "tap the trunk cable" on the cable junction box in the dark corner by the drainpipe. Connector: inside
     the window, the cloakroom (lockers, dark).
5. **Operators' switchroom** (first floor, 1 guard, tension 3).
   - Long room along the light well; the switchboard suite with chairs; the supervisor's raised desk; tall windows; the
     tea room (serving hatch into the switchroom) and the cloakroom with lockers.
   - Teaches: windows (entering, the window takedown), low cover along the suite, grab and hide in a locker.
   - Routes: shadow behind the switchboard suite; high on the string course outside the windows; loud across the floor;
     secret through the tea room's serving hatch.
   - Loop: switchroom, tea room door, serving hatch.
   - G3 the broker's tech (grunt): at the supervisor's desk, then to the windows to look out, then the tea room. Isolation
     moment: in the tea room making tea. Lure: his desk lamp.
   - Objective: intel "the operator's log" in the tea room. Connector: a short corridor with a clerk's hatch, voices from
     the offices.
6. **Offices corridor** (first floor, 1 guard, tension 3).
   - The manager's office (now the broker's), records office, clerks' office; corridor with a T junction; glazed
     internal partitions; interconnecting doors between offices; linoleum corridor, carpeted offices; a ceiling void with
     grilles into each office.
   - Teaches: doors, corners, cover-to-cover, the corner takedown, the human shield, the vent drop, the download's noise.
   - Routes: shadow through the interconnecting offices; high through the ceiling void; loud down the corridor; secret
     through the records office's document lift hatch (a duct).
   - Loop: corridor and interconnecting doors.
   - G4 head of security (officer: alarm first) works between the offices. Isolation moment: filing in the records office.
     Lure: a per-office light switch.
   - Objective: download "the broker's ledger" (30 s); its pulses bring G4 past a dark doorway and under a grille.
     Connector: the old equipment lobby, cold LED light under the server hall doors.
7. **Server hall** (first floor, 2 guards, tension 4).
   - The old apparatus room: rows of 3.2 m step-by-step racks partly stripped, new server racks in cold LED, overhead cable
     runways at 4.4 m, the chain-link server cage in the middle, fluorescent work lights on circuits.
   - Teaches / combines: the runway as a pipe over both guards, light management, Mark & Execute, the cage fence.
   - Routes: shadow along the stripped racks; high on the runways (from a rack top); loud straight to the cage gate; secret
     over the stripped rack tops to the cage's blind side.
   - Loop: around the cage through the rack aisles.
   - G5 patrol (grunt) walks the aisles; G6 heavy at the cage gate covers G5's aisle ends (overlap). Isolation moments: G5 at
     the far aisle end out of G6's view; G6 when he checks the cage rear.
   - Objective: plant "install the tap" (4 s) on the core switch inside the cage. Connector: the lift motor room, its
     ladder up to the roof hatch (rain noise).
8. **Roof and yard** (roof and ground, 3 guards, tension 5: the set piece).
   - Flat roof, metal walkways to the tank room, parapets, skylights; the rear elevation down to the floodlit goods yard
     with the broker's van, pallets, the yard gate.
   - Combines everything.
   - Routes: shadow along the tank room's dark side to the rappel, then the yard's dark edge; high over the parapet, the
     drainpipe or rappel, a drop on a loader from the rope; loud across the roof and down; secret over the neighbouring
     building's roof and down its fire escape into the lane.
   - Loop: around the tank room on the roof; around the van and pallets in the yard.
   - G7 lookout (sniper) on the roof watching the yard over the parapet: he covers the pair (overlap). G8 and G9 load the
     van, talking. Isolation moments: G7 at the far parapet corner; one loader in the van's cab.
   - Objective: extract through the yard's side gate into the lane (radius 2), placed so the pair can be avoided.

## Target numbers (derived from the tuning constants; the e2e runs confirm each)
If a target does not engage, adjust the building inside the constant's window and record it. Never change a constant.
| Set piece | Build | Constant |
| --- | --- | --- |
| Split | Faces 4.0 m tall, 1.85 m apart, >= 5 m long | `SPLIT` |
| No accidental splits | No other pair of facing faces >= 3.6 m tall and 1.2-1.95 m apart | automatic split gaps |
| Wall jump | Lip 3.2-3.6 m above the floor, wall within 1.0 m | `WALL_JUMP` |
| Jump grab / standing grab | <= 3.0 m / <= 2.6 m | `LEAP`, `REACH.grabMax` |
| Generated lips | Box tops >= 1.9 m are hangable; remove unwanted ones with `noLedge` / `mark` | `LEDGE.minDrop` |
| Cable runway / heating main | 4.3-4.5 m over the target guard's floor; confirm drop and inverted in the e2e | `TAKEDOWN`, `PIPE` |
| Rappel | Parapet at 9.0 + 1.0 m, rope to the yard, any window it passes within `RAPPEL.windowReach` | `RAPPEL` |
| Fence | 2.4 m | `FENCE` |
| Lit pool / dark | Lamp 0.9-1.0 intensity, radius 6-8 m / `ambientZone` 0.08-0.12 per storey (set `minY` / `maxY`), moonlit court 0.28-0.3 | lights, zones |
| Co-op boost lip | 4.4 m above its floor (4.3-4.5) | >= `WALL_JUMP.maxUp` + 0.5, <= `TEAM.boostMax` |

## Co-op routes (existing team moves only)
Available: brace + boost (lip / pipe / split up to 4.5 m), human ladder (firing platform; lips <= 4.1 m), dual takedown.
- Solo invariance: one build for solo and co-op; co-op routes are ordinary architecture, never required, no markers.
- Gating is in the team moves (a mate within `TEAM.mateRange`, host `checkTeamRequest`); confirm a solo player can never
  brace or see a boost prompt. No new gating code.
- A co-op lip is 4.4 m above the floor it is boosted from. Every surface it leads to is also reachable solo by another
  route (no bleed-out; a revive needs 1.5 m of height): the co-op part is the shortcut, not the destination.
- List every lip and pipe between `WALL_JUMP.maxUp` and `TEAM.boostMax` above the floor beneath it: each is a planned
  co-op lip, sits on a solo-reachable surface, or is removed (`noLedge` / `mark`). MDF frame and air-shaft tops are in
  this band: remove their ledges.
- Export `EXCHANGE_COOP_LIPS` (id, endpoints, height, boost floor height) for tests.
Routes (real reasons why solo cannot reach them):
- C1 light well: the fire escape's counterweighted drop ladder is pulled up; its first-floor landing (4.5 m) is boosted
  to from the court. Solo reaches the landing from the switchroom window.
- C2 power room: the gallery edge (4.5 m) boosted to from the dark generator side, skipping the lit steel stair. Solo
  uses the stair.
- C3 server hall: the cable runway (4.4 m) boosted to from a dark aisle. Solo reaches it from a rack top.
- Dual takedown on the yard pair.

## Mission and modes
- `MapDef.modes`: `['infiltration', 'clear', 'sandbox']`. Append `exchange` to `MAPS` and to `LISTED_MAP_IDS`. Do not
  change any mode's default map.
- `missions.json`: id `exchange-deadline`, name "Dead Line", map `exchange`, `squads: 'rooms'`, insertion `manhole`,
  brief "Get into Kestrel Exchange through the cable tunnel, tap the broker's line and get out through the yard. Stay in
  the dark." Objectives in route order (spaces 2-8, labels above; one item per intel). Rules: `noAlarms`, `noKills`,
  `undetected` all `bonus`. Every objective site is on a floor, dark and out of every guard's view (it is the checkpoint).
- Theme: night, `lightLevel` 0.1, moon `sunIntensity` about 0.14, `faction: 'urban'`, the grade above, `weathers:
  ['clear', 'rain', 'fog']` (wet only in the light well, on the roof and in the yard). No `art`; visual-only details with
  `box(..., false)`.
- `reinforce`: the street lobby and the yard lane. `alarms`: watch lodge, offices corridor, server hall, yard. `hideSpots`:
  at least one per guarded space. `switches`: one per lamp circuit, by a door.

## Phases

### Phase 0 - Setup and investigation (no gameplay changes)
- The handover has created the branch and added `docs/level-design.md`, `docs/templates/map-spec.md` and this spec.
  Confirm all three are present and unchanged, then start the progress log.
- Confirm every "Verified facts" row by grep (file and line).
- From the engine files only, report how to make: rooms and squads (including `SquadSlot.y` on a first floor), stairs
  between storeys, walls and windows on the first floor (`storey.ts`), a double-height room with a gallery, lamps with
  circuits and switches, ambient zones per storey, surfaces on raised floors, a walkable roof (`overhead`), a rappel down
  a 10 m elevation, ducts with wall and ceiling grates, doors (locked, breachable), windows (open / glazed), fences,
  `noLedge`.
- Find how far guards search after a suspicion (for the standard's section 4.8) and report it.
- Answer: does a rope kick-through need a glazed window? Which duct grates can be kicked or unscrewed? Is a 10 m rappel
  allowed? Can a window takedown be done while hanging from a ledge outside the window? What do `e2e-lib.mjs` and the
  harness at the top of `e2e-ct.mjs` (`tp`, `run`, `tap`) offer? How do `e2e-coop.mjs` / `e2e-netmove.mjs` down, revive
  and boost?
- Report, then stop.

### Phase 1 - Architectural design (docs only, no code)
Per `docs/level-design.md` section 13 (building brief, floor plans): `docs/prompts/exchange-design.md` plus SVG floor plans `docs/prompts/exchange-plans/ground.svg`, `first.svg`, `roof.svg`
(to scale, 1 m = 10 px, grid lines every 6 m, north up, labelled rooms, doors with swing arcs, windows, stairs with
arrows, columns, light-well, dimensions on the key rooms; they must render on GitHub's mobile view):
- The building as built in 1934: footprint and site (street, neighbour, rear yard, lane), structural grid, every room on
  every floor with its 1934 purpose, size, and what is in it now; vertical circulation (stair, lift, hatches, shafts); how
  cables, air and people moved through it.
- Write it as an architect would, then check: every room reachable by real circulation, real proportions (table above),
  the three-surfaces-per-column limit, windows on a rhythm, nothing that fails the "why is it here?" test.
- No gameplay content in this phase except the route's order (spaces 1-8) drawn as a dashed line.
- Stop for Michael's review of the building.

### Phase 2 - Gameplay design (docs only, no code)
Extend the design doc and plans with every deliverable in `docs/level-design.md` section 13: gameplay overlays
(`*-gameplay.svg`), a space sheet per space, a guard sheet per guard, the beat chart, the coverage table, the tool /
problem matrix, the metrics check against "Target numbers", and the self-critique (10 weakest points and their fixes).
Each route is written as a walkthrough in the player's own words ("crouch along the frame aisle in the dark, wait for
the watchman to clock in, climb the rolling ladder..."). Check every space against sections 3-7 of the standard (pass /
fail with a one-line reason) and fix every fail. Stop for Michael's approval: the approved docs are the build contract.

### Phase 3 - Build the ground floor (no guards)
- `src/world/maps/exchange.ts`: the shell, site, structure, ground-floor rooms and spaces 1-4 with all their pieces,
  lights, zones, surfaces, doors, windows, hide spots; first floor and roof as plain slabs and walls only. Registration
  and listing. `scripts/plan-svg.mjs`: renders the built level (boxes, anchors, lights) top-down per storey from the map's
  build output to `docs/prompts/exchange-plans/built-*.svg` so the build can be compared with the approved plans.
- New `scripts/e2e-exchange.mjs` (Free Roam), added to `run-e2e.mjs`: every element of spaces 1-4 engages from its
  planned approach (pad; split, pipe, fence, wall jump also by the touch action button). `e2e-anchors.mjs`: add
  `['exchange', 'sandbox']`.
- Done when: `npm run check`; `e2e-exchange`, `e2e-anchors` pass; perf `MAP=exchange` with `--budget`, `--preset=low
  --mobile --budget`, `--preset=ultra --mobile --budget` within the `CLAUDE.md` budgets; built plans match the approved
  plans (list differences); screenshots from each space's vantage (`scripts/shot.mjs`) in the report.

### Phase 4 - Build the first floor, roof and yard; co-op lips (no guards)
- Spaces 5-8, C1-C3, `EXCHANGE_COOP_LIPS`, `noLedge` where needed.
- Tests: `e2e-exchange` for spaces 5-8; the split gaps on the map are exactly the planned ones; the nav path from the
  insertion to the extract passes the spaces in order and no path skips one; at each co-op boost floor a solo player gets
  no climb prompt for the co-op lip and no brace / boost prompt; unit test `tests/exchangeCoop.test.ts` (each co-op lip is
  >= `WALL_JUMP.maxUp` + 0.5 and <= `TEAM.boostMax` above its floor); two-page `?net=local` co-op: a boost onto C1-C3
  (host and client), and the partner reaches each co-op surface by its solo route.
- Done when: `npm run check`, `e2e-exchange`, `e2e-anchors`, `e2e-netmove`, perf as Phase 3, built plans vs approved.

### Phase 5 - Guards and mission
- Squads (9), alarms, reinforce points, the mission entry.
- Tests (`e2e-exchange`, Infiltration), covering every item of `docs/level-design.md` section 15: (1) every guard-dependent takedown in the plan works with the guard at his planned
  spot; (2) darkness: at each entry vantage and planned dark pocket a crouched still operator stays under suspicious for
  a full patrol cycle, and in the planned lit pool on the route is noticed; switching that circuit off makes it safe and
  sends the guard to investigate; (3) noise: chequer plate at standing gear 4 brings G2, crouched gear 2 does not; (4)
  every route point on the nav grid, cycles 25-45 s, every guard covers his route; (5) all 9 guards alive within 1 s of
  the start; (6) a ghost run succeeds with all three bonuses; (7) a body left on a route is found; (8) from each
  entry vantage every guard of the space is in view within one cycle; (9) each planned shadow-route loop lets a spotted
  operator break line of sight so the guards fall back to searching and do not find him. `e2e-missions.mjs`:
  success and failure. `e2e-clear.mjs`: the Exchange mission listed; Hunter on the Exchange has the planned room count and
  9 guards. Co-op: a client to one checkpoint, a client takedown, the yard dual takedown, a player downed on each co-op
  surface revived.
- Done when: those suites, `npm run check`, full `npm run e2e`, perf with `STEALTH=1 MAP=exchange`.

### Phase 6 - Dressing, readability and verification
- Michael's phone notes first (progress log).
- Dressing that tells the building's story with visual-only pieces: cable bundles, frame labels, ashtrays at the
  watchman's clock stations, the tech's mugs, heritage signage, rain through the light well. Climbable things read as
  climbable; non-climbable look different; lit pools and dark areas match the light meter at Low; no forced heavy landing
  on the spine; no prompt flicker where anchors meet.
- Done when: `npm run check`, full `npm run e2e`, perf budgets, vantage screenshots at Low and Ultra, final file list.

## Future recommendations (do not build; write one paragraph each at the end of Phase 6)
- Section-ordered guard spawning so spaces can hold 2-4 guards within `MAX_ALIVE` (a dog and handler in the yard, a second
  watchman).
- Ambient noise zones that mask footsteps (generator hum, rain), like Chaos Theory's sound meter.
- A whistle to lure; opening a door a crack / peeking under it; interrogating a grabbed guard; the sidearm while hanging.
- Optional intel and overheard scripted chatter that reveal routes.
- Co-op: two-person lift, split switches, reach-down pull-up, partner marker, a bleed-out rule.
- Watchman's clock stations as interactables the guard actually punches.

## Report format (end of each phase)
Files changed (one line each); Decisions; checks run with their summary lines; anything left undone; manual phone checks
for Michael per space (also in `TESTING.md`); then STOP.
