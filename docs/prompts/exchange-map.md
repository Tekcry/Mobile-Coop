# Task: Kestrel Exchange - a linear stealth map for the Chaos Theory movement

## Context
Silent But Deadly (repo Tekcry/Mobile-Coop). Base branch: `ct-movement` (the Chaos Theory movement: speed gears,
split jump, wall jump, pipe legs-up / inverted, rappel, fences, CT takedowns and the grab, co-op team moves). Create
branch `feature/exchange-map` from `ct-movement` and work only there. Never merge into `ct-movement`, `dev` or
`master`, and never merge any branch into yours; Michael merges into `ct-movement` to test on the `/ct/` preview.

Goal: a new listed map, `exchange` ("Kestrel Exchange"): a linear, indoor, night-time stealth level in the spirit of
Splinter Cell: Chaos Theory, built only from systems that already exist on `ct-movement`. It must make the player feel
like a stealth operative, let them practise every movement and stealth verb the game has, and keep combat optional:
darkness and silence are always the better answer, and every encounter can be solved at least three ways. It also
gets co-op shortcuts that use the existing team moves without changing solo play.

Premise: a 1930s telephone exchange, now a black-market data broker's switching hub. The operator enters through a
storm culvert, works through the building section by section, taps the broker's line and leaves by the freight lift.
Rain outside; the only open sky is the light well and the atrium skylight.

## Scope: existing systems only (hard rule)
- This work builds a map, a mission entry, tests and docs. It adds no new systems: no new movement, AI behaviour,
  takedown kinds, interactable kinds, objective types, net messages, HUD elements, input bindings or mode logic.
- The only TypeScript you write: `src/world/maps/exchange.ts`, its registration in `src/world/maps/index.ts` and
  `src/world/maps/listed.ts`, an exported constant of the map's co-op lips (see "Co-op routes"), unit tests and e2e
  scripts. JSON: one entry in `src/config/missions.json`.
- If a step seems to need anything else (a new field, function, message or behaviour), stop and report it as a
  "Future" item. Do not build it. The "Future recommendations" section lists the ones already known.
- Enemies must not change (perception, alert machine, motion, archetypes, `MAX_ALIVE`, `SQUAD_CAP`). Tune encounters
  with geometry, light, surfaces, patrol routes and wait times only.
- Tuning tables (`config/movement.ts`, `game/takedown.ts`, `ai/perception.ts`, `world/anchors.ts`) never change. If a set
  piece does not engage, move the geometry.
- Parked maps, the Warehouse and Proving Grounds: no changes.

## Originality (hard rule)
- Kestrel Exchange is an original design. Do not open, read or copy `src/world/maps/warehouse.ts`,
  `src/world/maps/warehouseArt.ts`, `src/world/maps/provingGrounds.ts` or any parked map, and do not reuse any other
  map's layout, coordinates, room ids or names, colours, set-piece arrangements or guard routes.
- `CLAUDE.md` describes the Warehouse in places (World and player, Stealth AI, Modes). Read those sections for how the
  systems work only; ignore every layout detail.
- Learn each `LevelBuilder` call from its own signature and doc comment in `src/world/levelBuilder.ts`, the storey
  helpers from `src/world/maps/storey.ts`, and the anchors from `src/world/anchors.ts`. Every height and width in this
  spec is derived from the tuning constants, not from another map.
- Its own visual identity: palette below, its own light colours, its own grade.

## Rules for working (read twice)
1. Read `CLAUDE.md` in full before anything else, then `docs/ct-movement.md` and `docs/ct-movement-progress.md`.
2. Before referencing any file, type, function, field or constant (in code, tests or docs), confirm it exists with grep
   and note where. If something named in this prompt does not exist or differs, stop and report it; do not invent a
   substitute and do not "fix" the prompt yourself.
3. Work one phase at a time. At the start of each phase, re-read this prompt (`docs/prompts/exchange-map.md`) and the
   progress log, then print a short plan: files and functions you will touch, one line each. Do only that phase.
4. At the end of each phase: run the listed checks, report results honestly (never claim a check passed unless you ran
   it in this phase and saw it pass; paste the summary line), list what changed, update the progress log, commit and
   push `feature/exchange-map`, then STOP and wait for Michael's go-ahead.
5. Save this prompt verbatim to `docs/prompts/exchange-map.md` in Phase 0. Never edit it without Michael's approval.
   Proposed changes go in the progress log under "Spec change requests".
6. Progress log: `docs/prompts/exchange-map-progress.md` (phase, status, files changed, decisions, tests run with
   results, open issues, spec change requests), same style as `docs/ct-movement-progress.md`.
7. If the prompt and the code disagree, or the prompt is ambiguous: pick the option closest to existing code patterns
   (never another map's design), record it under "Decisions" and carry on. If the choice would
   change gameplay outside this map, stop and ask.
8. Update `CLAUDE.md` (World and player, Modes, the Commands e2e list) and `CHANGELOG.md` (one
   `## 3.2.x - Kestrel Exchange` heading, a bullet block per phase) at the end of each phase that adds playable content.
9. Hyphens, never em dashes, in docs and comments. Follow `CLAUDE.md` Conventions and Hard rules.
10. Checks: `npm run check` (= lint + test + build). e2e needs a build first; run single suites with
    `npm run e2e -- <suite>`; new suites are added to the default list in `scripts/run-e2e.mjs`.

## Verified facts (confirm each in Phase 0; report any mismatch)
| Fact | Where |
| --- | --- |
| Maps are `MapDef { id, name, description, theme, modes, build(b, seed), art?, weathers? }`; `build` returns `MapLayout` | `src/world/mapDef.ts` |
| `MapLayout`: `playerSpawns, enemySpawns, props, objectives, pickups, rooms?, switches?, alarms?, hideSpots?, reinforce?` | `src/world/mapDef.ts` |
| `MAPS = [warehouse, provingGrounds]`; first map listing a mode is its default | `src/world/maps/index.ts` |
| `LISTED_MAP_IDS = ['warehouse', 'proving']`; `MISSIONS` filters on it | `src/world/maps/listed.ts`, `src/game/missions.ts` |
| `RoomDef { id, name, minX, maxX, minZ, maxZ, minY?, maxY?, squad? }`; `SquadSlot { kind, x, z, yaw, y?, route?, wait? }` | `src/world/rooms.ts` |
| `LevelBuilder` public API: `box, block, floor, wall, wallX, wallZ, ramp, stairs, pillar, lowCover, highCover, perimeter, ladder, pipeV, pipeH, zipline, duct, windowAt, door, rappel, fence, ledge, mark, noLedge, light, surface, ambientZone` | `src/world/levelBuilder.ts` |
| Storey helpers `wallXAt, wallZAt, windowX, windowZ, glassX, glassZ` | `src/world/maps/storey.ts` |
| `Grate { pos, nx, ny, nz, where: 'wall' | 'ceiling' | 'floor' }` for `duct` | `src/world/anchors.ts` |
| Light init fields (kind, x, y, z, radius, intensity, color, cone via `makeCone`, group, fixture) - confirm `LightInit` | `src/world/lights.ts` |
| Surfaces `concrete 1, metal 1.6, grate 1.4, wood 1.15, gravel 1.3, carpet 0.6` (`SURFACE_NOISE`) | `src/world/surfaces.ts` |
| Footstep noise is 0 at or under `NOISE_QUIET` (crouch 1.9, stand 1.45 m/s) on every surface; the surface only scales audible steps | `src/player/movement.ts` `noiseRadius`, `src/game/gameState.ts` |
| Gear caps crouch `0.5 0.9 1.3 1.8 2.3 2.8`, stand `0.8 1.3 2.0 2.8 3.8 5.0`: silent = crouched gears 1-4, standing gears 1-2 | `src/config/movement.ts` `GEARS` |
| `LANDING` soft 0.6 / roll 2.5 / heavy 4.5 m; noise soft 1.2, roll 5, heavy 11 m | `src/player/movement.ts` |
| `SPLIT` 1.2-1.95 m wide, faces >= 3.6 m tall, feet at 2.5 m; split gaps come from cover faces automatically | `src/config/movement.ts`, `src/player/splitJump.ts` |
| `WALL_JUMP.minUp 2.7`, `maxUp 3.8`, `wallReach 1.0` | `src/config/movement.ts` |
| `REACH.grabMax 2.7`; generated ledges need `LEDGE.minDrop 1.9` | `src/world/anchors.ts` |
| Manual jump (`LEAP`) grabs lips up to ~3.1 m | `src/config/movement.ts`, `docs/ct-movement-progress.md` |
| `TEAM.boostMax 4.5`, `ladderGrab 4.1`, `mateRange 3`, `partnerReach 1.2`; `checkTeamRequest`, `canBrace` | `src/config/movement.ts`, `src/game/teamMoves.ts` |
| `TAKEDOWN`: drop 1.2-5 m below within 1.0 m; above 1.1-4.6 m within 2.2 m; below (ledge pull) 1.4 m; window 1.7 m; inverted 0.9 m reach, victim 0.6-2.8 m below | `src/game/takedown.ts` |
| `DUAL_WINDOW 1.5` s: two players' takedowns that close count as a dual | `src/net/coopHost.ts` |
| Revive is an interactable; `Interactables.nearest` needs `abs(dy) < 1.5`; no bleed-out timer | `src/net/coopHost.ts`, `src/game/interactables.ts` |
| `MAX_ALIVE 10`; Infiltration and Hunter `SQUAD_CAP 9`, spawning pending squads nearest first, >= `SPAWN_MIN_DIST` 7 m from the player | `src/ai/enemyManager.ts`, `src/game/modes/infiltrationMode.ts`, `src/game/modes/clearMode.ts` |
| Mission JSON: 1-3 insertions; objective types `download (30-60 s) plant (1.5-8) rescue sabotage (2-10) intel (items) extract (radius 1.5-8)`; rules `noAlarms noKills undetected` = `off | bonus | fail`; `squads: 'rooms' | 'spawns'` | `src/game/missions.ts` |
| Infiltration checkpoint = player position when an objective completes; 3 lives | `src/game/modes/infiltrationMode.ts` |
| Enemy kinds `grunt runner heavy sniper enforcer dog droneOp officer` | `src/ai/enemyDefs.ts` |
| e2e map lists hard-coded in `scripts/e2e-anchors.mjs` and `scripts/e2e-clear.mjs`; `perf.mjs` takes `MAP=` | scripts |

## Level design rules (save as `docs/level-design.md` in Phase 0; they apply to every map)
If `docs/level-design.md` already exists on this branch, stop and report (another branch writes the same file).
Principle: a linear path through non-linear spaces. The player always knows where they are heading; how they get
through each space is their choice.
1. Spine and arenas: one critical path of connectors linking encounter spaces. Each space has 2-3 solo routes
   (high / traversal, low / shadow, loud / aggressive) that rejoin at a chokepoint before the next space. No route
   skips a space.
2. Scout first: every space has an entry vantage, dark and outside every guard's focus cone for the whole patrol
   cycle, from which the player can watch every patrol before committing.
3. Teach, test, twist: one new mechanic per space; introduce it safely, test it alone, then combine it with earlier ones.
4. Tension and release: a quiet safe zone after each high-pressure space; complexity escalates toward a set piece.
5. Readable AI: detection states and cues stay consistent; the player can always tell why they were seen.
6. Predictable patrols with exploitable gaps: cycles 25-45 s, waits 3-6 s placed under an anchor or facing away from
   the shadow route, every patrol crossing a lit stretch and a dark stretch. No randomness that defeats planning.
7. Clear light / shadow and noisy-surface readability: lit pools and dark pockets read at a glance on a phone at Low;
   loud floors look different from quiet ones.
8. The player sets the pace: no forced timers in stealth sections (a download's noise pulses are pressure, not a
   timer).
9. Graceful failure: detection escalates, line of sight can be broken, a checkpoint sits before each space.
10. Toys in every space: switches, breakable lamps, doors, windows, vents.
11. Reward curiosity and risk: shortcuts and alternate takedowns from anchors.
12. Useful environmental information: sightlines into the next space (glass, high windows) that help planning.
13. Guide without waypoints: landmarks, lighting and sightlines to the objective.
14. Co-op routes are extra routes layered on top. Rules 1-13 must be fully satisfied in solo. Co-op rules below.

## Target numbers (derived from the tuning constants; the e2e runs confirm each)
If a target does not engage in the e2e run, adjust the geometry inside the constant's window and record it under
Decisions. Never change the constant.
| Set piece | Build | Constant it comes from |
| --- | --- | --- |
| Split corridor | Two 4.0 m walls, 1.85 m between inner faces, >= 5 m long | `SPLIT` 1.2-1.95 wide, faces >= 3.6 m, feet at 2.5 m |
| No accidental splits | No other pair of facing faces >= 3.6 m tall and 1.2-1.95 m apart | split gaps come from cover faces automatically |
| Interior walls | 3.1 m, 0.3 m thick | under 3.6 (no split), over standing reach |
| Wall jump | Lip 3.2-3.6 m above the floor, wall face within 1.0 m | `WALL_JUMP` 2.7-3.8, `wallReach` 1.0 |
| Manual jump grab | Lips / pipes <= 3.0 m | `LEAP` grabs up to ~3.1 |
| Standing grab | Lips <= 2.6 m | `REACH.grabMax` 2.7 |
| Generated lips | Box tops >= 1.9 m become hangable lips | `LEDGE.minDrop` |
| Horizontal pipe | 4.3-4.5 m over the target guard's floor | drop 1.2-5 m below; inverted victim 0.6-2.8 m below the hanging root; confirm both in the e2e |
| Drop / above takedowns | Victim 1.2-5 m below within 1.0 m (drop); 1.1-4.6 m within 2.2 m (above) | `TAKEDOWN` |
| Ledge pull | Guard within 1.4 m of the lip you hang from | `TAKEDOWN.belowReach` |
| Window takedown | Guard within 1.7 m across the sill | `TAKEDOWN.windowReach` |
| Rappel | Point on a solid roof walkway at 6.0 m, `length` to the floor, a window (sill 0.9 m) within reach of the rope | `RAPPEL` (`windowReach` 0.9, `unhookHeight` 2.0) |
| Fence | 2.4 m chain-link | `FENCE` |
| Ladders | 2.4-3.4 m | `ladder(x, z, y0, y1, facing)` |
| Ceiling vent drop | Ceiling slab ~3.2 m with a vent hole, duct on top, pieces marked `{ overhead: true, noLedge: true }` | `duct`, `mark` |
| Lit pool | Lamp intensity 0.9-1.0, radius 6-8 m | `lightLevelAt`, `visibilityFromLight` |
| Dark interior | `ambientZone` 0.08-0.12; moonlit open sky 0.28-0.3 | `MapTheme.lightLevel`, zones |
| Silent movement | Crouched gears 1-4, standing gears 1-2 | `NOISE_QUIET` |
| Co-op boost lip | 4.4 m above its floor (window 4.3-4.5) | >= `WALL_JUMP.maxUp` + 0.5, <= `TEAM.boostMax` |

## Look (original)
Art deco telephone exchange gone to seed. Palette (use these, not other maps' colours): wall plaster `#9c9486`, dark
panelling `#4a3b2e`, bakelite black `#1f1c1a`, switchboard green enamel `#3f5e4f`, brass `#b08d4a`, oxblood tile `#6e2f2a`,
terrazzo floor `#8a857b`, cast iron `#3c4146`, rust `#7a4a2c`, records-wing carpet `#4f3a46`, glass `#1b2430`. Lamps:
warm sodium `[1, 0.78, 0.5]` for working lights, cold fluorescent `[0.8, 0.95, 1]` in S5, moonlight from the light well
and skylight. Landmarks: S4's dry fountain, S6's brass call-board clock over the gallery (visible through S2's high glass).

## Layout
Footprint x -32..32, z -20..20 (+Z north, yaw 0 = +Z). Perimeter walls 6.5 m. Roofs visual only (no collision:
`box(..., collide = false)`), except the light-well roof walkway (solid, marked `overhead` so the floor under it stays on
the nav grid). A U-shaped path: west to east along the
south row, north through the light well, west along the north row.

```
 z=20 +-------------------+--------------------+------------------------+
      | S7 Tunnel & Lift  | S6 Exchange Floor  |   S5 Records Wing      |
      |   (extract NW)    | (2 storeys, gallery|   (offices, corridor)  |
      |                   |  3.6 m, skylight)  |                        |
 z=6  |                   |                    +--------+---------------+
      |                   |                    | plant  | S4 Light Well |
 z=-6 +--------+----------+-----+--------------+--------+ (open sky)    |
      | S0     | S1 Sorting     | S2 Switchboard Hall   | S3 Boiler Room|
      | Culvert| Room           |                       |               |
 z=-20+--------+----------------+-----------------------+---------------+
      x=-32   -24              -8                      12              32
```

Footprints (adjust by up to 2 m to make set pieces work; keep the order and the sealed boundaries):
S0 x -32..-24, z -20..-6 | S1 x -24..-8, z -20..-6 | S2 x -8..12, z -20..-6 | S3 x 12..32, z -20..-6 |
S4 x 12..32, z -6..6 | S5 x 8..32, z 6..20 | S6 x -12..8, z -6..20 | S7 x -32..-12, z -6..20.
The plant room (x 8..12, z -6..6) is solid, no access. Sealed: S2/S6, S1/S7, S0/S7 and the plant room are solid walls.
S2 may have fixed glass panes (`glassX`) high in its north wall so the atrium is in view early (rule 12, 13).

Rooms: one `RoomDef` per section, ids `s0`..`s7`, in path order. The S6 gallery gets its own room with `minY` / `maxY`
(see `RoomRect`); squads on raised floors set `SquadSlot.y`.

Guards: 9 in total (`SQUAD_CAP` 9: Infiltration spawns every one at the start, none within 7 m of the spawn; a tenth
would only spawn after someone dies, so a ghost run would never see it). Do not add a tenth; more guards per section is
a Future item (section-ordered spawning).

### S0 Culvert - insertion, no guards (safe zone)
- Teaches: gears, light meter, noise meter, the first crawl.
- Pitch dark (`ambientZone` 0.08) with one maintenance lamp over the obvious walkway and its circuit switch beside it.
  A 2.4 m pump plinth with lips (hang, shimmy, climb up, hold B to lower in) and a 2.5 m drop off its back (landing
  bands). A 1.2 m wide dry channel, 10 m long, for the forward roll (gear 5-6, crouch tap). A strip of `grate` surface
  across the channel so the noise meter reacts above gear 2 standing.
- Spawn (-28, -18) facing north; insertion `culvert`.
- Exit: `duct` from a wall vent in S0 to a wall vent in S1's dark south-west corner behind a mail shelf. Whichever
  grate can be kicked or unscrewed (Phase 0 answers which): unscrewing (hold) is quiet, kicking is loud. Place the duct so
  the loud option is within G1's hearing (muffled by walls: `MUFFLE`).

### S1 Sorting Room - "Shadows" (1 guard)
- Teaches: darkness vs light, quiet gears, the grab from behind, carry and hide a body, switches and shooting lights,
  low cover, over-cover takedown, shelf tops and the takedown from above.
- Four rows of 2.6 m mail shelving (high cover; their tops make lips), aisles 2.2 m. A 1.3 m mail cart beside one row
  (step up, then grab the top). Two 1.0 m sorting tables (low cover) on the main path, each under a lamp (lit pools);
  aisles dark (0.12). The room circuit switch on the north wall, reached by a dark aisle. A hide spot (mail cage) by the
  exit and one by the tables.
- G1 (grunt): loop: table pool, aisle ends, then stands 6 s at the exit door under the second lamp facing into the room
  (~35 s cycle).
- Approaches: ghost through the aisles and the open window (sill 0.9) beside the exit door while G1 walks the loop;
  kill the circuit or shoot his lamp and grab him when he investigates in the dark; walk the shelf tops and take him from
  above; over-cover takedown at a table; loud: shoot him.
- Objective (checkpoint): intel "the sorting ledger", dark corner by the exit.
- Exit: door (quiet open vs sprint bash) or the open window, into S2.

### S2 Switchboard Hall - "Look up" (1 guard)
- Teaches: split jump, drop attack and sidearm from the split, horizontal pipe (hands, legs up past an obstacle,
  inverted), inverted takedown, wall jump to a perch, a high window.
- The lane: two 4.0 m switchboard banks, 1.85 m between inner faces, 6 m long, on the main path. A dark lane behind the
  north bank, 2.2 m wide, its walls under 3.6 m. An operator's desk under a lamp in the hall centre. A horizontal pipe at
  4.4 m crossing the hall north-south over the desk, reached by a jump grab from a 2.6 m cable cabinet in the dark
  north-west corner; a collidable cable bundle hanging at about 3.9 m half way along (hands are blocked, legs up passes;
  confirm with the e2e run). A 3.3 m relay cabinet bank on the east wall, its lip within 1.0 m of the wall: wall jump to
  a perch. From the perch an open window (sill 0.9 above the perch top) onto S3's catwalk at the same height.
- G2 (grunt): from the west end through the split lane (waits 4 s under its middle), on to the desk (waits 5 s under the
  pipe), back (~40 s).
- Approaches: ghost the dark lane and the door; split: let him pass under you, drop on him (tap knock out, hold lethal) or
  shoot from the split; pipe: inverted choke or drop at the desk, or pass over him; wall jump, perch, window: skip the
  hall into S3 high; kill the desk lamp to pull him into the dark lane under the split.
- Objective: plant (3 s) "tap the trunk line" on a junction box at the perch base (dark).
- Exit: ground door into S3, or the perch window onto the catwalk.

### S3 Boiler Room - "Hear yourself" (1 guard)
- Teaches: noise by surface and gear, ladders, catwalk lips (hang, shimmy, drop attack), quiet hang-and-drop vs a loud
  jump down, the chain-link fence (no cover: guards see through it; rattles above gear 3), drainpipe.
- Two boilers as high cover; boiler A 4.4 m tall (co-op route C1), boiler B 3.6 m with a drainpipe to its top. A
  `grate` catwalk at 3.3 m (surface top 3.3) along the west and north walls meeting S2's high window; metal stairs at the
  lit east end, a ladder in the dark south-west corner. The catwalk lip is a wall-jump lip. Boiler A's top joins the
  catwalk by a step of about 1.1 m (solo reaches it from the catwalk). A chain-link tool cage (fence 2.4 m) around the
  dark north-east corner holding the ground exit door. The catwalk's north end leads through a doorway onto S4's
  balcony at 3.3 m.
- G3 (grunt): patrols the floor between the boilers and under the catwalk, waiting by the cage (~35 s).
- Approaches: ghost the floor in the boilers' shadow at a silent gear (G3 hears the grate above you at standing gear 3+);
  hang off the catwalk lip and drop on him; from boiler B's top drop on him; climb the cage quietly (gear <= 3) while he
  walks away; the catwalk straight to the balcony.
- Objective: sabotage (4 s) "jam the pressure valve", dark under the catwalk by the cage.
- Exit: cage door (ground) or the catwalk door (balcony at 3.3 m) into S4.

### S4 Light Well - "The climb" (1 guard, open sky)
- Teaches: drainpipe climb, the roof walkway (metal, loud above silent gears), ledge run with a gap jump and an outside
  corner, inside-corner wall jump, rappel, drop attack and sidearm from the rope, kick through a window, a fence in the
  open.
- An open courtyard (no roof, moonlit 0.3, rain applies) with a dark arcade (roofed, 0.12) along its south side; a
  planter (low cover) in the middle. The balcony (3.3 m deck) along the west wall from S3. A drainpipe from the balcony to
  a solid roof walkway (6.0 m, `overhead`, surface `metal`) along the east and north edges. A cornice ledge on the east
  wall at 4.4 m (co-op route C2) with a 1.8 m gap to jump and an outside corner, reached solo from the drainpipe or the
  roof (lower into a hang). An inside corner below the balcony's south end with a lip at 3.3 m (inside-corner wall jump).
  A fence across the arcade's east end. A rappel point on the north roof edge over S5's facade, down beside an office
  window (sill 0.9) next to S5's entry door. Check in Phase 0 whether the rope's kick-through needs a glazed window; if
  so make it glazed (fast, loud) and add an open window 3 m along, reached from the ground (slow, quiet).
- G4 (grunt): loops the planter in the moonlight, then waits 6 s at S5's door under its door lamp, under the rope
  (~40 s).
- Approaches: ghost the arcade and the fence to a dark side door into S5; high: balcony, drainpipe, roof, rappel, then drop
  on G4 from the rope, shoot from it or kick into the dark office; drop on G4 from the balcony; shoot the door lamp and
  take him in the dark.
- Objective: intel "the courier's phone" in the arcade's dark west end (every route passes it). Quiet safe zone after
  S1-S3.
- Exit: S5 entry door (lit), the dark side door (past the fence), or the rope window.

### S5 Records Wing - "Doors and corners" (1 guard)
- Combines: doors, interior windows (open vault, glazed break), cover-to-cover, a SWAT turn across a doorway, a corner
  takedown at a T junction, the window takedown, the grab and human shield, the ceiling duct and vent drop, per-room
  circuits, carpet (faster for less noise), the download's noise pulses, an alarm panel.
- A 2.4 m carpeted corridor east-west, three small offices each side (3.1 m walls, doors swinging in, interior windows to
  the corridor: two open, two glazed), desks (low cover), filing cabinets (high cover), a T junction half way. Each office
  its own circuit and switch. The archive office at the west end with a ceiling slab at 3.3 m, a vent and a duct on top,
  reached by a ladder in a dark store room. A lit reception at the east end with the alarm panel.
- G5 (officer: runs to the alarm first): patrols the corridor, waits facing into two offices through their doors and
  once at an interior window (~45 s).
- Approaches: ghost through the offices, vaulting open windows while he faces the other way; corner takedown at the T;
  window takedown while he stands at the open interior window; grab him and walk him as a shield; duct and vent drop
  behind him in the archive; kill the reception lights so his alarm run is through the dark.
- Objective: download (30 s) "pull the broker's call logs" at a terminal in a mid-corridor office; its noticed pulses
  draw G5 past a dark doorway and under the archive vent.
- Exit: double doors west onto S6's ground floor, or a stair in S5's west end up to S6's gallery door (lit, in the
  sniper's view: the riskier way up).

### S6 Exchange Floor - "Above it all" (2 guards, two storeys)
- Combines: gallery lips (wall jump from the floor, ledge pull), the pipe over the floor, zipline, sniper laser and
  glint, Mark & Execute, goggles, co-op boost.
- A two-storey hall (roof 9 m, visual) with a skylight casting a moonlit stripe (0.3) across the floor; the rest dark
  (0.1). Gallery 2.5 m wide at 3.6 m on the north, east and south sides (railings 1.0 m with gaps; lip 3.6, a wall face
  within 1.0 m below it for the wall jump), a lit stair at the east end, a ladder in the dark north-west corner. Rows of
  switchboard desks (low cover) and a central lamp (lit pool) on the floor. A pipe at 4.4 m between two columns away from
  the galleries, reached by a jump grab from a 2.6 m crate stack. A zipline from the north gallery's west end down over
  the floor towards S7 (end about 2.3 m). The broker's glass office on the south gallery (glazed walls, an open window
  to the gallery). A 4.4 m block on the north wall (co-op route C3) whose top steps down 0.8 m onto the north gallery.
- G6 (sniper): post on the north gallery at the lip, laser over the floor. G7 (heavy: frontal takedown lethal only):
  patrols the floor through the lamp pool and the dark rows, waiting under the pipe (~40 s).
- Approaches: wall jump to the gallery and pull G6 off his post; pipe over G7 (inverted from behind or drop); ghost along
  the dark rows and up the ladder; Mark & Execute both with the charges earned so far; zipline out over the floor.
- Objective: plant (4 s) "install the tap" on the broker's terminal in the glass office.
- Exit: ground door west into S7 (lit), or the zipline, which lands by an open service hatch (window) into S7.

### S7 Service Tunnel and Freight Lift - "The exam" (2 guards)
- Combines everything with less room.
- A 3 m service tunnel west from S6 with a second split section (two 4.0 m walls, 1.85 m apart, 6 m long) and a side
  duct round it; then north into the freight lift hall (x -32..-22, z 10..20): lit loading lamps, crates (low and high
  cover), a pipe at 4.4 m across the hall over the pair, a fence gate (2.4 m) in front of the lift with a walk-round gap on
  the lit side, the lift car (extraction zone, dark inside).
- G8 and G9 (grunts): a talking pair by the lift gate under the lamps, facing each other (each sees the other).
- Approaches: Mark & Execute both; the pipe over them (inverted on one, the other sees: a race); a noisemaker to split
  them; shoot the lamps and climb the fence in the dark past them; co-op dual takedown; loud: they are the last two.
- Objective: extract in the lift car (radius 2).

## Coverage checklist (each item exists at the sections shown; the e2e runs check each)
Gears and quiet movement (all), forward roll (S0), landing bands (S0, S3), switches (S0, S1, S5), shoot a light (S1,
S2, S4, S7), cover / cover-to-cover / SWAT turn (S1, S5), over-cover takedown (S1), above takedown (S1), grab, carry,
hide (S1, S5), human shield (S5), doors quiet / bash (S1, S5), open / glazed windows (S1, S2, S5), duct + vent unscrew /
kick (S0, S5, S7), ceiling vent drop (S5), ladders (S3, S5, S6), drainpipes (S3, S4), lip hang / shimmy / climb up /
lower in (S0, S3, S4, S6), gap jump and outside corner (S4), manual jump grab (S1, S2, S6), wall jump straight (S2, S3,
S6) and inside corner (S4), split jump + drop + sidearm (S2, S7), pipe hands / legs up / inverted + inverted takedown +
drop (S2, S6, S7), ledge pull (S6), drop from a hang (S3), fence quiet / rattle (S3, S4, S7), metal roof walkway (S4),
rappel + kick-through + drop + sidearm (S4), corner takedown (S5), window takedown (S5), download pulses (S5), alarm
(S5, S6, S7), zipline (S6), sniper (S6), heavy (S6), goggles (S0, S6), Mark & Execute (S6, S7), co-op boost (C1-C3), co-op
dual takedown (S7). Gadgets help but are never required.

## Co-op routes (existing team moves only)
Available verbs on `ct-movement`: brace + boost (to a lip / pipe / split up to `TEAM.boostMax` 4.5 m), the human ladder
(firing platform; grabs lips <= 4.1 m) and the dual takedown (`DUAL_WINDOW`). Nothing else: two-person lifts, split
switches, co-op intel and partner markers do not exist (Future).

Rules:
- Solo invariance: one map build for solo and co-op. Co-op routes are ordinary geometry (no locked doors, no markers,
  nothing that teases a solo player). They are never required for any mode or mission.
- Gating is already in the team moves: bracing needs a team-mate within `TEAM.mateRange` (`canBrace`) and the host
  checks every request (`checkTeamRequest`). Confirm in Phase 0 that a solo player can never brace or see a boost /
  ladder prompt. No new gating code.
- A co-op lip is 4.4 m above the floor it is boosted from (window 4.3-4.5: at least 0.5 m over `WALL_JUMP.maxUp`, the
  highest solo reach; at most `TEAM.boostMax`). If Phase 0 finds a solo reach constant higher than `WALL_JUMP.maxUp`, use
  it and report.
- No softlocks: the game has no bleed-out and a revive needs the reviver within 1.5 m in height. So every surface a
  co-op lip leads to must also be reachable solo by another route (C1 from the catwalk, C2 from the drainpipe / roof, C3
  from the gallery): a downed player there can be revived by a partner walking the solo route, and anyone can leave alone
  (walk the solo route back, or lower into a hang and drop). The co-op part is the shortcut, not the destination.
- Unplanned boost targets: list every lip and pipe the map generates between `WALL_JUMP.maxUp` and `TEAM.boostMax` above
  the floor beneath it. Each must be one of C1-C3, sit on a surface reachable solo, or be removed with `noLedge` / `mark`.
  The two split banks' 4.0 m tops (S2, S7) are in this band: remove their ledges (they are not routes).
- Export the co-op lips from the map file (`EXCHANGE_COOP_LIPS`: id, lip endpoints, height, the floor height it is boosted
  from) so tests can read them.
- Players on co-op routes are subject to normal light, noise and sight. Guards do not climb, so they never use them.

Routes:
- C1 (S3): from the dark floor beside boiler A, boost onto its 4.4 m top: overwatch on G3's route and a drop onto him;
  skips the lit stairs.
- C2 (S4): from the dark arcade, boost onto the 4.4 m cornice: skips the drainpipe and the roof, straight to the rope.
- C3 (S6): from the dark floor under the north wall, boost onto the 4.4 m block, then step down onto the gallery behind
  the sniper: skips the lit stair and the wall jump in his view.
- Dual takedown at S7's pair (no geometry).

## Mission and modes
- `MapDef.modes`: `['infiltration', 'clear', 'sandbox']` (Free Roam has no guards: route practice). Append `exchange` to
  `MAPS` after the existing maps and to `LISTED_MAP_IDS`. Do not change any mode's default map.
- `missions.json` entry: id `exchange-deadline`, name "Dead Line", map `exchange`, `squads: 'rooms'`, one insertion
  `culvert`, brief "Get into Kestrel Exchange through the culvert, tap the broker's line and leave by the freight lift.
  Stay in the dark." Objectives in order: S1 intel (one item), S2 plant 3 s, S3 sabotage 4 s, S4 intel (one item), S5
  download 30 s, S6 plant 4 s, S7 extract radius 2. Rules: `noAlarms`, `noKills`, `undetected` all `bonus`. Each objective
  site is on a floor, dark and out of every guard's view (it becomes the checkpoint).
- Theme: night, `lightLevel` 0.1, moon `sunIntensity` about 0.14, `faction: 'urban'`, grade `{ tint: [0.95, 0.97, 1.1],
  saturation: 0.8, contrast: 1.12 }` (cold, desaturated), `weathers: ['clear', 'rain', 'fog']` (wet floors only in S4). No `art` (plain voxels); visual-only dressing
  (`box(..., false)`) is fine.
- `reinforce`: S0 culvert and the S7 lift. `alarms`: S5 reception, S6 stair landing, S7 lift hall. `hideSpots`: at least
  one per section with a guard. `switches`: one per lamp circuit in S0, S1, S2, S5 (each office), S7.

## Phases

### Phase 0 - Setup and investigation (no gameplay changes)
- Create the branch, save this prompt verbatim, start the progress log, write `docs/level-design.md`.
- Confirm every row of "Verified facts" by grep (file and line). Report each mismatch.
- From `src/world/levelBuilder.ts`, `storey.ts`, `anchors.ts`, `lights.ts`, `rooms.ts` and `mapDef.ts` only (not from
  any map), report how to make: rooms and squads with routes, lamps with circuit groups and fixtures, switches, ambient
  zones, surfaces on raised floors, an `overhead` walkable roof strip, a rappel point beside a window, a duct with wall and
  ceiling grates, doors, windows (open / glazed), fences, and how generated lips are removed (`noLedge`, `mark`).
- Answer: does the rope's kick-through work on an open window or only glazed? Which duct grates (entry, exit) can be
  kicked or unscrewed, and what noise does each make? How does `noLedge` / `mark(noLedge)` stop
  generated lips? What do `scripts/e2e-lib.mjs` and the test harness at the top of `scripts/e2e-ct.mjs` (`tp`, `run`, `tap`) provide to
  reuse? (Use the harness only, not the course.)
  How does `scripts/e2e-coop.mjs` / `e2e-netmove.mjs` down and revive a player and perform a boost? Can a solo player
  brace (trace `canBrace` and the mate list)?
- Report, then stop.

### Phase 1 - Paper plan (report only, no code)
- Write `docs/prompts/exchange-map-plan.md`: per section, a table of every piece (call, x, y, z, size, purpose), every
  anchor, light (with circuit group), ambient zone, surface, door, window, hide spot, switch, objective site and guard
  (slot, route points, waits, estimated cycle time), plus the entry vantage and each dark pocket the darkness test will
  use.
- Self-check the plan against the "Target numbers" table and each level design rule (pass / fail with a one-line reason
  per section), list every lip / pipe in the 3.8-4.5 m band and what happens to it, and check no route skips a section.
- Stop and wait for approval of the plan. Build exactly the approved plan in Phases 2-3; any deviation goes under
  Decisions with the reason.

### Phase 2 - Blockout S0-S3 (no guards)
- `src/world/maps/exchange.ts` with the shell (footprint, perimeter, floors, roof visuals, theme), S0-S3 complete,
  S4-S7 as empty rooms with their sealed walls and connecting doorways, spawn, registration, listing.
- New `scripts/e2e-exchange.mjs` (Free Roam, `autostart=exchange&mode=sandbox`, harness from `e2e-lib.mjs` / `e2e-ct.mjs`),
  added to `scripts/run-e2e.mjs`: every S0-S3 checklist item that needs no guard engages from its intended approach by
  pad, and the split, pipe, fence and wall jump also by the touch action button. `scripts/e2e-anchors.mjs`: add
  `['exchange', 'sandbox']`.
- Done when: `npm run check` green; `e2e-exchange` and `e2e-anchors` pass;
  `MAP=exchange node scripts/perf.mjs` with `--budget`, `--preset=low --mobile --budget` and `--preset=ultra --mobile
  --budget` within the budgets in `CLAUDE.md` (Performance budget); report the numbers.

### Phase 3 - Blockout S4-S7 and co-op lips (no guards)
- S4-S7 complete, C1-C3, `EXCHANGE_COOP_LIPS`, `noLedge` on unplanned boost targets.
- Tests: `e2e-exchange` extended to every S4-S7 item that needs no guard; a check that lists every split gap the map
  produces and asserts it is exactly the two intended (S2, S7); a nav check that the path from the spawn to the lift passes
  rooms s0..s7 in order; a solo check at each co-op lip's boost floor: no wall jump, jump grab, standing grab or other
  prompt offers the lip, and holding Y against the wall gives no brace / boost prompt. Unit test
  (`tests/exchangeCoop.test.ts`): every `EXCHANGE_COOP_LIPS` height above its floor is >= `WALL_JUMP.maxUp` + 0.5 and <=
  `TEAM.boostMax` (it fails if a future solo move reaches higher). `e2e-netmove.mjs` (or a co-op section of
  `e2e-exchange.mjs` using the same two-page `?net=local` setup): a boost onto each of C1-C3 (client and host each boosting
  once), and the solo route to each co-op surface walked by the partner.
- Done when: `npm run check`, `e2e-exchange`, `e2e-anchors`, `e2e-netmove`, perf as in Phase 2.

### Phase 4 - Guards and mission
- Squads (9 guards as listed), alarms, reinforce points, hide spots, the mission entry.
- Tests in `e2e-exchange.mjs` (Infiltration, `autostart=exchange&mode=infiltration`): (1) every guard-dependent checklist
  item works with the guard brought to its planned spot (split drop S2 / S7, pipe inverted and drop S2 / S6 / S7, drop from
  the catwalk hang S3, shelf-top above S1, over-cover S1, rope drop S4, corner and window S5, grab and shield S5, ledge
  pull S6); (2) darkness: for each section with a guard, a crouched still operator at the entry vantage and at each
  planned dark pocket stays under suspicious for one full patrol cycle, and the same operator in the lit pool on the
  route is noticed; turning the circuit off makes that pool safe and sends the guard to investigate; (3) noise: S3, the
  catwalk at standing gear 4 brings G3 to investigate and crouched gear 2 does not; the duct grate kick brings G1 and the
  unscrew does not; (4) patrols: every route point is on the nav grid, each cycle is 25-45 s, every guard covers his route;
  (5) all 9 guards are alive within 1 s of the start; (6) a ghost run (teleports between objective sites, walking the last
  stretch) succeeds with all three bonuses; (7) a body left on a patrol's path is found. `e2e-missions.mjs`: the new
  mission to success and to failure (three downs). `e2e-clear.mjs`: Infiltration lists the Exchange mission too; Hunter on
  the Exchange shows the plan's room count and 9 guards. Co-op (`e2e-coop.mjs` pattern): the mission on a client to one checkpoint, a
  client takedown, a dual takedown on S7's pair, and a player downed on each co-op surface revived by the partner.
- Done when: those suites, `npm run check`, then the full `npm run e2e`; perf with `STEALTH=1 MAP=exchange` (desktop
  test path and the two mobile presets).

### Phase 5 - Readability and verification
- Read Michael's phone notes in the progress log first and do those.
- Readability with existing pieces only: every climbable thing looks climbable (pipes, cable trays, cornices, crates
  under lips); lit pools and dark pockets match the light meter at Low; from each entry vantage every patrol is visible
  within one cycle; no forced heavy landing on the main path; no prompt flicker where two anchors meet.
- Screenshots of each section's vantage at Low and Ultra (`node scripts/shot.mjs`) attached to the report.
- Done when: `npm run check`, full `npm run e2e`, perf budgets; final file list, test results and open items.

## Future recommendations (do not build; Michael decides later)
At the end of Phase 5, write one paragraph each in the progress log: how it would fit the existing systems and which
section would use it.
- Section-ordered guard spawning (spawn ahead, retire calm guards far behind) so sections can hold 2-4 guards each
  within `MAX_ALIVE`; with it, a dog and handler in S6 and an extra patroller in S5 and S7.
- Ambient noise zones that mask footsteps (boiler hum, rain), like Chaos Theory's sound meter.
- A whistle to lure a guard; opening a door a crack / peeking under it; interrogating a grabbed guard; the sidearm while
  hanging from a lip.
- Optional intel pickups (not objectives) and overheard scripted chatter that reveals routes (rules 11, 12).
- Co-op verbs: two-person lift (shutter held by two players), split switches (two panels within `DUAL_WINDOW`), a
  reach-down pull-up, co-op intel, a partner world marker, a bleed-out / auto-revive rule so dead-end co-op perches become
  possible.

## Report format (end of each phase)
Files changed (one line each); Decisions (spec conflicts and choices); checks run with their summary lines (unit counts,
e2e suites, perf numbers against the budgets); anything left undone; manual phone checks for Michael per section
(also added to `TESTING.md`); then STOP.
