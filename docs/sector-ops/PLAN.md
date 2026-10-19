# Sector Ops - plan

Job lead: "Night Shift | Sector Ops Build", 2026-10-19. Ask and answers: `BRIEF.md` (M1-M6). Research: `RESEARCH.md`.
Prototype effort only (the goal rule): placeholder geometry, no art pass, no feel tuning. Status: **approved by Michael 2026-10-19 with M7: build 3 sections first** (the existing Warehouse's service entrance,
floor and offices with connectors C2, C3; the courtyard, annex and roof wait until he has played it). No lives and
difficulty stars per op (M7, BRIEF.md). Earlier status: waiting for Michael's approval before slice 2 (M5b). Slice 1 (menus) and slice 3 (co-op mode switch) do not depend on it.

## 1. What we take from the research, and what we change
Facts and sources: `RESEARCH.md` (the guide sites refused direct fetches; most facts come from summaries and reviews).
- The reference: 6 base maps of about 4-5 zones each. A zone opens the next only when its enemy counter reaches zero,
  with a resupply and a checkpoint at the threshold. About 8-12 guards a zone. In the clear-out variant a detection
  calls about as many again; the strict variant fails on any detection and adds cameras and laser tripwires. Zones run
  from an open exterior approach through a transition building to tight interiors and a larger final space; zones
  that start lit and can be darkened, and vertical routes, set them apart. Death restarts the zone.
- Chaos Theory's co-op missions are one continuous level each, with alarm stages that never fail the run.
- Where Michael differs from the research: the research suggests 4-8 guards a sector for CT pace; Michael asked for
  20-25 patrolling (M6), so the plan follows M6 and measures. The research counts CT's alarm stages as 4; the game keeps
  3 (G125, `ALARM_MAX`).
- Take: a map split into sections played in a fixed order; one goal per section; the way on opens when it is done; a
  checkpoint at each section; reinforcements when the alarm goes up; solo or two-player co-op; a short timed result.
- Change for Chaos Theory pace (slower, light and shadow first, ghosting rewarded):
  - The goal is an objective (hack, grab or download), never a body count. Kills are optional (M3).
  - Detection never fails the run. It raises an alarm stage (CT's 3 stages, G125) that sends guards in, hunting.
  - Each section is a distinct space with its own light: dark lanes and lit pools, never a flat-lit room.
  - Ghost (no kills, never spotted) is called out in the result and pays a score bonus.
  - Only one section is live at a time, so each can hold many patrolling guards (M5, M6).

## 2. The site: one building, five sections in a row
One map, `warehouseOps` ("Warehouse - Sector Ops"): the Warehouse in the middle, a new courtyard to the south and a new
office annex with its roof to the north. Section order runs south to north (+z). Every section is sealed from the
others by walls and its two connectors, so no guard sees into another section.

| # | Section | Space (m) | Light | Objective | Guards (M6 target) | Devices |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Courtyard: breaking in | 60 x 40 outside | moonlit, 2 floodlight towers, a lit gatehouse; dark lanes behind containers | Hack the gatehouse terminal | 20 | 1 camera on the gatehouse |
| 2 | Service entrance | 48 x 17 (yard strip, dock, dispatch, workshop, corridor) | dock floods, a few lamps; dark dock corners | Download from the workshop terminal (10 s) | 18 | 2 cameras, 2 laser bands in the corridor |
| 3 | Warehouse floor | 48 x 21 (racking aisles, factory floor, mezzanine) | lamp pools on the floor, dark aisles, rack tops | Take the case at the far aisle | 24 | 2 cameras, 1 laser band, sniper on the deck |
| 4 | Office annex | 48 x 24 new, one floor | bright: ceiling panels lit, a dark server corridor | Hack the security office terminal | 22 | 3 cameras, 2 laser bands at the server room |
| 5 | Roof: the climax | 48 x 24 at 6 m, new | moonlit, open sight lines, one lit control hut | Download from the rooftop uplink (12 s), then extract | 16 + 2 snipers | 2 cameras, 1 laser band |

### Section 1 - Courtyard (breaking in), new geometry
- Layout: the players start outside a cut in the south fence (0, -68). A truck yard: 3 parked trailers and 2 container
  stacks in two rows (dark lanes between), a guard hut west, 2 floodlight towers lighting the middle lane, the
  gatehouse on the east fence line by the inner gate. Low jersey barriers and pallets as crouch cover. A chain-link fence
  with a climbable stretch in the dark (existing `fence`).
- Light: theme moonlight 0.16; the floods make two lit pools 8 m across; `ambientZone` darkens the container lanes.
- Guards 20: 6 loop patrols on the lanes, 4 pairs crossing the floods, 2 at the hut, 2 on the gate, 2 dogs with
  handlers (dogs are hard in the dark: they hear), the rest on posts at container ends.
- Objective: hack the gatehouse terminal (3 s hold, lit window: a risk).
- Exit and connector C1: the inner gate opens into a fenced truck lock (6 x 10 m, two gates) at the old south perimeter.

### Section 2 - Service entrance, existing Warehouse south band
- Layout: the existing yard strip (z -26..-18), loading dock, dispatch, workshop and the service corridor. The openings
  north (dock to racking, corridor to floor) are walled up except the corridor's east door, which becomes C2.
- Light: the existing dock floodlights and lamps; the dock's dark corners and the shrink-wrapped stacks.
- Guards 18: the dock and its dog, dispatch, the workshop benches, 3 corridor patrols that pass the lasers.
- Objective: download at the workshop terminal (10 s within 4 m; a patrol passes every ~20 s).
- Connector C2: a 3 x 6 m vestibule (new walls) off the corridor's east door into the factory floor's SE corner.

### Section 3 - Warehouse floor, existing geometry
- Layout: the racking aisles (rack-top route, ladders), the factory floor (machines, press, conveyor), the mezzanine deck
  (pipe, zipline, duct into the manager's office). Openings south are walled (above).
- Light: the existing lamp pools; dark aisles between the racks.
- Guards 24: 6 aisle patrols, 6 floor patrols, 4 on the deck (one sniper), the manager's office pair, posts.
- Objective: take the case at the far west aisle (dark, a patrol turns there).
- Connector C3: the ground-floor office (6 x 6) between the floor door and a new door through the north wall, then a
  covered 3 m walkway to the annex. The office's door to the manager's office is walled.

### Section 4 - Office annex, new geometry
- Layout: a lobby desk by the entry, open-plan cubicle rows (1.2 m partitions: crouch cover), two glass meeting rooms,
  the security office (the objective) in the north-west, a dark server corridor along the east wall, toilets as dead
  ends. Ceiling 3.2 m.
- Light: the brightest section ("tighter light"): ceiling panels lit over the open plan; the server corridor and the
  meeting rooms dark; light switches on circuits (existing switches) to cut a row.
- Guards 22: 8 patrols between the rows, officers at the lobby and security office, 2 in the server corridor, posts.
- Objective: hack the security office terminal (3 s; 2 cameras watch the door).
- Connector C4: an enclosed stairwell in the north-east corner, a door at the bottom and one onto the roof.

### Section 5 - Roof (the climax), new geometry
- Layout: the annex roof at 6 m: HVAC units and ducts as cover, skylights (no walking on glass), a comms mast with a
  sniper, a small control hut with the uplink, the extraction point at the north edge (a rappel line down).
- Light: moonlit, open; the hut lit; long sight lines are the danger.
- Guards 16 + 2 snipers: enforcers and heavies on loops between the plant, the snipers on the mast and the stair head.
- Objective: download from the uplink in the hut (12 s). Then the run's exit: every living player at the extraction.

### Difficulty curve
| Section | Guards | Types | Devices | Light | Alarm |
| --- | --- | --- | --- | --- | --- |
| 1 | 20 | grunts, 2 dogs | 1 camera | dark with two pools | 2 per stage |
| 2 | 18 | grunts, a dog, a drone operator | 2 cameras, 2 lasers | mixed | 2 per stage |
| 3 | 24 | + heavies, a sniper | 2 cameras, 1 laser | pools and dark aisles | 2 per stage |
| 4 | 22 | + officers, enforcers | 3 cameras, 2 lasers | bright | 3 per stage |
| 5 | 18 | enforcers, heavies, 2 snipers | 2 cameras, 1 laser | open, moonlit | 3 per stage |

## 3. The connector rule (load and unload)
A connector is a short room with a near door (from the section) and a far door (into the next). It works like Marlow
Yard's airlocks (`src/game/course/`), as a small pure state machine in `sectors.ts`:
1. **Locked:** while the section's objective is open, the near door is locked (`Doors.setLocked`).
2. **Open:** the objective done unlocks the near door ("exit open", objective text and marker).
3. **Cycling:** every living player inside the connector for 1 s: the near door shuts and locks once its doorway is
   clear (the course rule, `AIRLOCK_DOORWAY_CLEAR`), and a 3 s cycle starts ("Next sector loading").
4. During the cycle the previous section **unloads**: its guards despawn (alive, knocked out or dead; bodies too), its
   cameras and lasers switch off. The next section **loads**: its guards spawn behind the far door, unaware, on their
   routes; its devices switch on.
5. **Sealed:** the far door unlocks; the connector is the checkpoint (a down respawns there). Lives: 3 (A5).
A section's reinforcements only ever come from its own entry points. The alarm stage carries over between sections
(A3), so a loud run stays loud.

## 4. What exists and what is new
| Piece | Exists | New |
| --- | --- | --- |
| Menus, briefing, co-op mode switch | slices 1 and 3 on this branch | - |
| Mode skeleton (objective, exit, alarm stage, reinforcements, lives, result, Ghost) | `SectorMode` and `SectorRun` (first cut on this branch) | connectors, sections instead of 4 sectors |
| Guards, routes, unaware spawn | `EnemyManager.spawn`, `setPatrol`, `SquadSlot` | `EnemyManager.despawn(e)` (dispose, drop from the lists); a per-mode cap `maxAlive` (Sector Ops 26 + 6 reinforcements, others keep 12) |
| Cameras, lasers, jammer, alarm stage | `SecuritySystem`, `CtDevices` | `CtDevices.setLive(section)`: devices of other sections off; the section index in `SecWire` for the client |
| Objectives | `Interactables` (terminal, intel), my mode's hack / grab / download | - |
| Doors and locks | `Doors`, `setLocked`, course `applyLocks` | the connector state machine (pure, Vitest) |
| Geometry | `LevelBuilder` (walls with gaps, blocks, doors, stairs, ladders, fences, lights, ambient zones, surfaces); the Warehouse build | `buildWarehouse(b, opts)` with perimeter gaps and walled openings (the plain Warehouse unchanged); the courtyard, annex and roof builders |
| Nav | `buildNavGrid`, `navLayers`, `navSeeds` | a nav seed per section; `navLayers` for the roof |
| Co-op | items, banners, objective text and enemies mirror; the `sector` message (slice 3) | the live section in the message |
| Test speed | - | `?sectorGuards=N` (dev and tests): at most N guards per section |
| Perf | `perf.mjs` (`MAP`, `EXTRA`) | a `MODE=sector` option; the run is "pending PC run" |

## 5. Build order (small steps, each `npm run check` + its suites)
1. Pure: section and connector types, the connector state machine, the run (sections, phases, carry-over alarm), Vitest.
2. AI: `despawn` and the per-mode cap, with a unit test for the cap and an e2e check that a despawned guard is gone on
   both pages.
3. Geometry, one section per step: `buildWarehouse` options and the walled openings (sections 2, 3; C2, C3), then the
   courtyard and C1, then the annex and C4, then the roof. Each step: a walk of its routes (e2e-levels style nav check).
4. Section data: guard slots and routes, devices, objectives, connectors, lamps (one data file, pure).
5. Mode: connectors, unload and load, per-section devices, checkpoints; the result unchanged.
6. Co-op: the live section in `SecWire`, the client's device filter; a two-page check over `?net=local` (e2e-coop only
   after the orchestrator says so).
7. Tests and docs (below); the perf run marked pending.

Estimate: steps 1-2 half a day, step 3 a day (placeholder boxes), steps 4-7 a day.

## 6. Guard budget (M6)
- Target 20-25 patrolling guards per section; only one section is live, plus up to 6 alarm reinforcements (wire cap
  `MAX_ENEMIES` 32).
- The only measurement: about 2.6 ms main thread for 12 guards (D1 guard cost), sim p95 2.2-2.3 ms with 10 guards on
  the laptop against a 2.9 ms budget. 25 guards may need about twice that: likely over budget, so measure first.
- Plan: build with the section counts above; `perf.mjs` on `warehouseOps` with `MODE=sector`, each section at its full
  count, on Michael's PC (`E2E_GPU=1`, port 4189): **pending PC run**. Then set each count from it (log as an
  A-decision); the fallback is 16 per section.
- Software-GL tests run with `?sectorGuards=4`.

## 7. Tests
- `e2e-sectorops` (new required suite, in `REQUIRED` and `COVERS`; e2e-modes is legacy since #15):
  - one solo walk through every section with `?sectorGuards=4`: the near door is locked before the objective, the
    objective opens it, the connector cycles, the previous section's guards are gone, the next section's are in, to the
    result;
  - one ghost check: the walk with the AI and cameras held still ends with "Ghost";
  - an alarm: the stage rises, reinforcements come in hunting, a kill breaks the Ghost.
- `e2e-menus`, `e2e-park`, `e2e-pad`: the menu (slice 1) and the lobby (slice 3).
- Unit: `sectors.test.ts` (run, connector, result, the data's budget), `net.test.ts` (protocol 23, the room default).
- Co-op Sector Ops by room code: e2e-coop, only after feature/coop-tests merges and the orchestrator agrees.

## 8. Risks
- Perf: 20-25 live guards may be over the sim budget (section 6).
- Load time and memory: the map is about 2.5 times the Warehouse's area (nav grid, light bake, voxels). Measure the
  load on the PC; split the roof's nav layer if needed.
- Visibility: any gap between sections lets a guard see into the next. Every opening is walled; checked by a walk.
- Co-op: a despawned guard must vanish on the client, not ragdoll (the snapshot drops it; checked in step 2).
- The level-design standard applies at prototype depth only: no map spec, scale sheet or light plan; placeholder
  geometry; exceptions logged in `BRIEF.md`.
- e2e time: the walk uses teleports and 4 guards a section to stay fast.

## Slices
1. **Menus** (done on this branch): the main menu is Sector Ops, Co-op, Loadout, Settings, Feedback; Missions, Training
   and Free roam only with `?legacy=1`; Sector Ops opens a briefing; the Co-op text is fixed.
2. **Sector Ops** (this plan; after Michael's approval).
3. **Co-op mode switch** (done on this branch): the lobby's modes are Campaign (Marlow Yard, Course mode, the default)
   and Sector Ops; Hunter, Infiltration and Free Roam only with `?legacy=1`; the client mirrors cameras and lasers.
