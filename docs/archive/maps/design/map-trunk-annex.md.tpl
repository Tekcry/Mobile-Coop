# Kestrel Trunk Annex - map design for "Dead Line"

Design only. No game code. Generated tables come from `map-trunk-annex.json` by `map-trunk-annex-render.mjs` (same script draws `map-trunk-annex.svg` and `.png`). Edit the JSON, then run `node docs/design/map-trunk-annex-render.mjs`; do not edit tables here by hand. Rules and sizes: `stealth-level-rules.md`, `scale-sheet.md`. Rule-by-rule evidence: `map-trunk-annex-validation.md`.

![plan](map-trunk-annex.png)

Coordinates: metres on a 0.5 m grid, x east, z north, origin at the centre of the site. Levels: Ground y 0, Upper y 3.3, Roof y 6.6. Build check: {{counts}}.

## a) Purpose

- **Site.** The Trunk Annex is a 1962 brick extension to the 1934 Kestrel Exchange. It holds the trunk switch that carries rented private lines, so it is where the broker's traffic physically passes. I chose it over the main exchange because it is small enough for 36 x 28 m, keeps the Kestrel premise and the Dead Line text, and has the three things light play needs: a double-height hall with a gallery, a roof, and a dark service yard.
- **Why the team is here.** Night Shift is hired by the Client (Alistair Crane, Continuity Office). He wants proof of who sells city call records before the blackout. A broker (Aldous Pell) rents a private line card, LC-4471, in the annex's core switch. The core switch is in a cage and is not on any network, so the tap must be clipped on by hand.
- **What the Client wants.** One thing: the tap on LC-4471. The circuit record in the Test room tells the team which card it is. The team must not be traced, so no kills and no alarm are the bonus goals.
- **Why guards are here.** Pell pays a private contractor (Halcyon Grid Services staff, who think they guard a telecoms asset). The contractor's night shift is six people.

## b) Security story and patrol logic

**Who hired whom.** Pell hired the contractor after a roof break-in two years ago, when a rival broker's crew photographed the cage. The contract names three things to protect: the core switch cage, the line-record cabinet, and the two entrances (the lane gate and the personnel door).

**What they expect.** A small theft or trace crew, on foot, at night, using the roof or the yard. Not a police raid. That is why the sniper covers the lane and the roof, and why a heavy sits in the cage.

**Systems that exist (all built from features the game has):**

| System | In the map | What it does |
| --- | --- | --- |
| Surveillance room | Control room (upper floor, desk, monitor wall, window onto the hall) | The officer watches the hall through the glass. **Cameras are PARKED:** the monitors show a static schematic. The "camera" is a guard at a window. |
| Alarm panels | AP1 control room, AP2 cage room, AP3 yard gate | A guard who has seen a person or a body runs to the nearest working panel within 30 m and holds it for 1.6 s (engine value). Three reinforcement grunts then arrive. |
| Perimeter lights | Circuit C1 (yard and roof security lights) | Sodium lamps, switchable, shootable. |
| Locked doors | Roller door RD and street door ND (sealed), vehicle gate Gv (chained), arrival gate Gp (padlock swapped by the team) | Sealed doors are walls for everyone. |
| Round checkpoints | The master clock | Every round is timed to the exchange's master clock. This is why every loop is 40 s, the sniper's included (his three facings are 12, 10 and 16.5 s plus 0.5 s per turn): the clock chimes (a tell) and each guard hits a checkpoint on it. Fixed, so learnable, and every window below repeats every 40 s. |

**What an alarm does.** If AP1 or AP2 is rung, 3 reinforcement grunts enter by the north street door ND into the break room and sweep south through the hall. The yard stays quiet. If AP3 is rung they come through the vehicle gate Gv, which closes the van exit (E1). The player cannot disable a panel (not in the verb list); the player denies it by taking the runner down first or by being out of the 30 m range. The guard count on the map stays 6 for any number of players.

**Why each guard walks where they walk, solo or pair:**

- **G1 yard sentry (solo).** The contract names the gate and the personnel door. One man walks the yard line and checks the door lock and the gate chain. Solo because outdoors there is nobody to cover.
- **G2 and G3 pair, hall patrol.** The hall is the asset. After a past theft the contractor's rule is *no one patrols the hall alone*. They go in a pair, 2.5 s apart. **Their coverage gap:** on every loop both stand in the break room for about 6 s behind a closed double door, so the hall and the wide opening are unwatched (choke K2, windows below).
- **G4 officer, control room.** A duty officer logs the rounds, watches the hall through the window and works AP1. He walks the gallery to check the Test room door each loop because the records are the second most valuable thing.
- **G5 heavy, cage warden.** Stays in the cage room. A shotgun man because the threat is a theft crew. He rings AP2 only if he sees a person.
- **G6 sniper, roof overwatch.** Never moves. The lane and the roof are the only ways a vehicle or a roof team can come, and the previous break-in came over the roof. His 55 degree view covers the lane, then the yard, then the roof deck. He has a blind strip within 5 m of the south wall (the parapet hides the foot of the facade from him).

## c) Arrival and exfiltration

**Arrival.** The team's van drops them in Cooper's Lane south of the yard. Lantern's contact swapped the padlock on the pedestrian gate Gp the day before. The team steps into a drum-screened pocket at the yard's west end that is out of every guard's sight. Why this way: the lane is empty at night, the pocket is dark, and the gate is the contractor's own approved door (no cutting, no noise). *Story note (decided by Michael):* the team arrives by the lane gate Gp, and the radio lines in `story.md` section 8 now say so. The 1.3 m trench D1 stays on the map as the discoverable "cable tunnel" bypass (reward X2); no radio line sends the team into it.

**Exits compared:**

| Exit | Realism | Noise | Fit with the city blackout | Gameplay value | Verdict |
| --- | --- | --- | --- | --- | --- |
| Return to the start (gate Gp) | High: same way as in | Silent | Very good: dark lane | Low variance, but it is the safe fall-back | **Alternate E2** |
| Van at the vehicle gate Gv | High: the delivery lane has a gate | Low to medium (the gate chain, engine) | Good: no headlights needed | A final test across the lit yard under the sentry and the sniper | **Primary E1** |
| Helicopter on the roof | Low: a noisy, lit, traceable pickup in a city | Very loud | Poor: needs a lit pad, which the blackout removes | Roof is already the sniper's; a pickup would end every run on the roof | PARKED (a rooftop skyline moment for a later mission) |
| Utility tunnel to the lane | Good: exchanges have cable vaults | Quiet | Very good | Would be a second duct exit, a free skip of the yard, and a third walkable level (the roof is the link level) | Rejected for this map |

**How the player's actions change the trip out:**

- **Alarm at AP1 or AP2:** reinforcements come from the north (ND). The yard is quiet. E1 is still open but the hall is hunted: take the generator room (EX-1).
- **Alarm at AP3:** reinforcements at Gv. E1 is closed: go back by E2 through the hall and Goods-in (EX-2).
- **Bodies:** a found body sends the finder to the nearest panel (above). A hidden body (body spots in the hide table) does not.
- **Lights:** with C1 off the sniper cannot see the yard past 8 m, so the van run window widens from {{k6lit}} s to {{k6dark}} s per 40 s; G1 spends 12 s searching at pole lamp Y2.
- **Route taken:** a player who came in by the roof can leave by the roof side and the fire stair into the yard east (FD1) without touching the hall.

## d) The gameplay loop

Watch the guards from a dark place, learn that their rounds repeat on the master clock, choose between a bold lit route, a quiet long one and a hidden one, act on a window or put a light out to make one, adapt when something changes, and run it again faster using what you found. First-time run: about 9 to 11 minutes (two to three loop-watches of 40 s each, three or four waits at chokes, two routes of about 30 to 45 s of walking). A known route: about 2 to 3 minutes (cable run X2: O1-C {{o1c}} s and O2-D {{o2d}} s, EX-1 {{ex1}} s, plus short waits; the table in section m has every route).

**Beat sheet**

| Beat | Time (first run) | The player sees | Decides | Learns |
| --- | --- | --- | --- | --- |
| 1 Arrive | 0:00 to 0:30 | Pocket, sodium pool Y1 on the wall, the sentry G1 pacing to the personnel door and back, the sniper's silhouette on the roof | Which spawn exit: ladder, door or south wall | Pools are danger, dark is safe; G1 pauses 4 s at the door and 4.8 s at the gate |
| 2 Observe | 0:30 to 2:30 | From V1 the sentry; from the roof AHU cover V3 the sniper; from the hall alcove V2 the pair; from the gallery V4 the heavy and the officer | Which route (stair, roof, riser) and when | The master clock: every loop is 40 s; the pair's break-room gap; the heavy's back-turned time |
| 3 Plan | 2:30 to 3:00 | The three O1 routes and their pools | Switch a circuit, shoot a lamp, or time it | Each switch has a cost (guard reaction in the circuit table) |
| 4 First move | 3:00 to 4:30 | Personnel door, then Goods-in with the riser ladder in the corner | PD window (K1) or the roof ladder | The door only matters at certain seconds |
| 5 Circuit record (O1) | 4:30 to 6:00 | Test room, cabinet in the dark with a lit sign, lit bench in the middle | Cross the lit bench or hug the wall; 3 s hold | The officer checks the door every 40 s; the record names LC-4471 |
| 6 Transition | 6:00 to 7:00 | Stair top over the hall, the cage across the mesh | Down the stair into the hall, back down the riser, or over the roof | The heavy's beat; three ways into the cage |
| 7 Tap (O2) | 7:00 to 9:00 | Cage racks, dark aisle, the core switch | Which aisle; when to hold 4 s | The heavy is back-turned for 20 s of 40 |
| 8 Exit | 9:00 to 10:30 | Yard, van lights off at the gate, sentry and sniper | Run on the one window, put out Y3/C1, or go back by Gp | The exit has a price that depends on what you did |

## e) Scale numbers

{{scale}}

Door spacing and grid check (scale sheet sections 4 and 5):

{{doorSpacing}}

{{doorPass}}

## f) Floor plan

Grid: 0.5 m. Rects are `x0..x1`, `z0..z1`. Space "Gallery" is open to the hall (see-through rail on its east and south sides). The fire stair stands inside the generator room's south-east corner (carved out of it).

{{spaces}}

**Doors and openings**

{{doors}}

**Stairs, ladders, ducts**

{{links}}

**Corridors and lanes (width = short side; all at least 3.0 m)**

{{corridors}}

## g) Asset audit

One row per door, stair, vent, shaft, window, light circuit, alarm panel, control room and guard post. Any row whose gameplay value could not be defended was deleted or moved during design (removed: roller-door gameplay, second fire-stair door, yard lamp Y4 and hall lamp HN2, the canteen, a south-yard drum stack that blocked the wall route).

{{assets}}

## h) Spawn points

All four are in the dark pocket at the yard's west end, at least 1.2 m apart, none on a door. Each spawn sees the sentry G1 at his door check and the lit pool Y1; no guard can see a spawn in the first 90 s (validated by line-of-sight on the plan, see the validation file). First moves differ: ladder RL to the roof (S1), personnel door PD (S2), the south-wall run east (S3), waiting and watching (S4).

{{spawns}}

## i) Objectives and exits

{{objectives}}

**Why this order.** O1 gives the card number LC-4471; the tap needs it. O1 is on the upper floor, so the player also gets the gallery view of the hall before the harder O2. O2 is last because the cage is the heaviest room. Both sites are in shadow; the shortest path to each crosses at least one lit pool (validation, rule 13).

{{extraction}}

## j) Guard sheets

All loops are literal and deterministic. Dwell time includes a 0.5 s turn per waypoint (engine feel value used in the sheets). "Phase" shifts the loop start so that the windows line up the same on every run.

{{loops}}

{{guards}}

**Safe windows created** (over the 40 s master-clock cycle: every loop is 40 s, so a cycle is one loop). Windows are the seconds in which none of the listed guards can see the choke. "Lights out" re-computes with sentry-and-sniper far views removed (a dark body is only seen inside 8 m; engine assumption).

{{chokes}}

Guard to window: G1 opens K1 and K6; G2 and G3 open K2 (the pair gap); G4 opens K3 and K8; G5 opens K4, K5 and K9; G6 opens K1, K6 and K7.

## k) Light plan

{{lamps}}

{{circuits}}

Which lamps can be shot: every lamp is shootable; shooting one is heard (shot noise) and the nearest guard goes to that lamp for 8 s. Switches are physical and only on the walls listed. The sign decals for CORE and LINE RECORDS are tuned in build step 2 so they do not lift the objective above the shadow threshold (0.28).

{{panels}}

## l) Hide spots and vantage points

{{hides}}

{{vantage}}

## m) Routes

Three routes per objective (A, B, C; O2 also has a trench variant D). They share at most 30 percent of their length (the first 6 m and the last 6 m are excluded, since every route starts at a spawn and ends on the objective). Paces are the scale sheet's gears: stand gear 3 = 2.0 m/s is the main pace; stairs 1.6 and ladders 1.0 are fixed by the code; the discovery routes may use a faster gear where the noise cannot reach a guard (stand gear 4 jog 2.8 m/s, noise about 3.4 m; crouch gear 6 crawl 2.8 m/s, noise about 2 m, muffled through a floor) and the quiet pace (stand gear 3, crouch gear 4 = 1.8 m/s, silent) is the worst case. **Best case** = zero waits at the fast pace. **Worst case** = the quiet pace plus every worst-case choke wait (a player who does not know the windows).

{{routes}}

**Legs used by the discovery decision (walking time per leg, best and worst case)**

{{legs}}

**Whole runs: spawn to O1 to O2.** A discovery saves time over the whole run, because O2 cannot be done before O1. The main run is O1-A then O2-A. The 15 s rule is on the best-case walk of the main run.

{{runTable}}

Why the comparison is on the run and not on the O2 leg alone: the straight line from O1 to O2 is 33 m, so no route can beat the 27 s main O2 leg by 15 s. The riser removes the stair detour on the O1 leg (spawn to O1: {{o1c}} s against {{o1a}} s); the trench is entered at the riser foot and also beats the main O2 leg by {{o2save}} s while removing every hall wait. X3 is the safe, slow route by design.

## n) Exploration rewards

{{rewards}}

## o) Co-op and solo

{{coop}}

**Four players spread:** P1 takes the riser R1 to O1. P2 goes up RL and over the roof to the exhaust shaft ES. P3 takes the riser and the trench D1 from the Goods-in south-west corner. P4 runs the south wall to the generator door and the east aisle. All four meet in the cage east aisle, 4 m from O2. No door is a queue: the ladders, the 3.0 m wide opening and the yard are separate. Any player can do O2 once any player did O1.

## p) Build plan (three Sonnet steps)

Common: the map data is `docs/design/map-trunk-annex.json`. Copy it to `src/world/maps/trunkAnnex.data.json` and have the builder read it, so the design file and the game cannot drift. Nothing here changes the player, nav, AI or camera code. Hand check on Michael's PC with `npm run dev`, `/?autostart=trunk-annex&mode=infiltration`.

### T1 - Trunk Annex: walkable greybox with guards (Sonnet)
**Goal.** The whole map walkable in greybox with the six guards patrolling, so the loop can be tested in one session.
**Read.** `docs/design/map-trunk-annex.md` sections e, f, j; `map-trunk-annex.json` (spaces, blocks, openings, links, guards); `docs/design/scale-sheet.md` section 4; `src/world/maps/exchange.ts` (how a map is registered); grep `src/world/levelBuilder.ts` for `box`, `room`, `door`, `stair`, `ladder`; `src/ai/patrol.ts`; `src/ai/navBuild.ts`.
**Files.** `src/world/maps/trunkAnnex.ts`, `src/world/maps/trunkAnnex.data.json`, `src/world/maps/index.ts`, `tests/trunkAnnexMap.test.ts`, `scripts/e2e-fp-trunk.mjs`, `docs/progress.md`, `CHANGELOG.md`.
**Do.** Build every space, block, opening (door sizes exactly as listed, centres on the 0.5 m grid), open stair S1, fire stair FS, ladders RL, R1, GL, ES, and the 6 guards from the JSON with their loops. Greybox only. Sealed doors are walls. Do not build D1 yet.
**Acceptance.**
1. Unit test: for every opening of type door1, door2, wide or gate, the cells on both sides are connected on the 0.5 m nav grid, **and** a 1.2 m door at an odd centre (for example x = 12.3) is reachable from both sides.
2. Unit test: every space centre, both objectives, both exits and all four spawns are reachable from spawn 2 (D1 excluded; ES, GL, R1, RL, S1, FS included).
3. Unit test: every corridor and lane in the JSON `corridors` list is at least 3.0 m wide on the nav grid (short side), and no walkable cell is closer than 0.32 m to a wall.
4. Unit test: every guard waypoint is a walkable cell, every leg between waypoints is walkable on the grid, and the computed loop period is 40 s for every guard, G6 included, within 0.3 s.
5. Unit test: no door within 1.5 m of a wall corner and 3.0 m between door centres on one wall (the generated door-spacing table).
6. `?autostart=trunk-annex&mode=sandbox&fullbright=1` boots with 0 console errors, 6 guards spawn and move.
7. `npm run check` and `e2e:quick` pass (known-flaky suites excepted).
**Smoke.** `e2e-fp-trunk`: boot, teleport to each space, confirm each guard has moved after 10 s.
**Hand check.** Walk spawn to PD to the stair and up; take the riser; climb RL and cross the roof; ride ES down. Watch G1, the pair and the heavy loop. Is every lane roomy for the camera?

### T2 - Trunk Annex: lights, switches, panels, hide spots, objectives, extraction (Sonnet)
**Goal.** The map is a mission: lit pools and dark, six switches, three alarm panels, objectives O1 then O2, two exits.
**Read.** `map-trunk-annex.md` sections i, k, l; `src/game/missions.ts`; `src/game/modes/infiltrationMode.ts`; `src/world/lights.ts`; `src/game/stealthSystems.ts`; the T1 map file.
**Files.** `src/world/maps/trunkAnnex.ts`, `src/game/missions.ts`, `tests/trunkAnnexMap.test.ts`, `scripts/e2e-fp-trunk.mjs`.
**Do.** Lamps and circuits exactly as the JSON (positions, heights, radii), ambient zones 0.08 to 0.12 indoors and 0.15 in the yard, six wall switches, three alarm panels with the two reinforcement points, hide spots as three-sided prop bays, four spawn points, objectives O1 (3 s hold at the line-record cabinet) and O2 (4 s hold at the core switch), extraction E1 and E2 (radius 2). Add one mission entry `trunk-annex` (do not touch `exchange-greybox`). Rules `noAlarms`, `noKills`, `undetected` stay `bonus`.
**Acceptance.**
1. Unit test: both objective sites are below `LIGHT.shadow` (0.28) on the light field; the first lit cell on each of the O1 and O2 routes A is above `LIGHT.lit` or at least above `LIGHT.shadow`.
2. Unit test: every hide spot cell is below `LIGHT.shadow` and meets 1.2 x 1.0 x 1.2 m.
3. Unit test: each switch turns exactly its circuit off; shooting a lamp removes only that lamp.
4. Unit test: both objectives and both extractions are reachable from every spawn.
5. Headless run completes O1, O2 and E1 in order and the mission reports complete.
6. `npm run check` and `e2e:quick` pass.
**Smoke.** Extend `e2e-fp-trunk` with step 5.
**Hand check.** Play solo from the pocket to the van once. Are the pools readable? Is there a dark way past each guard? Where do you wait?

### T3 - Trunk Annex: trench duct D1, rewards, and the 40 s window test (Sonnet)
**Goal.** The player-only trench D1, the discoverable shortcuts, and a test that the guard windows match the design.
**Read.** `map-trunk-annex.md` sections g (rows T1, T2, D1), m, n; `map-trunk-annex.json` (links D1, chokes); the crouch clearance in `src/player`.
**Files.** `src/world/maps/trunkAnnex.ts`, `tests/trunkAnnexMap.test.ts`, `scripts/e2e-fp-trunk.mjs`, `docs/progress.md`, `CHANGELOG.md`, `TESTING.md`.
**Do.** Measure crouch clearance first (clear height = crouch height + 0.15 m, minimum 1.2 m). Build the trench from grille T1 to hatch T2 along the polyline in the JSON, the grille and hatch as door-like interactables, the entry noise radius 4 m, and keep guards out of it (nav headroom 1.7 m already excludes them; assert it). Add the pinned break-room rota and cable chart decals.
**Acceptance.**
1. Unit test: guards cannot path into the trench; a player with the doors into the cage blocked can reach O2 through D1; D1 is 36.6 m on the polyline (grille T1 at -13.2, -6.4 to hatch T2 at 16.5, 6.5).
2. Unit test: for chokes K1 to K9 the safe windows computed from the loop sims equal the JSON-generated table within 0.5 s.
3. A crouched player fits the trench.
4. `npm run check` and `e2e:quick` pass; full `npm run e2e` before merge.
**Smoke.** Extend `e2e-fp-trunk` with the trench crawl.
**Hand check.** Enter T1, crawl, emerge at T2 next to the heavy's aisle. Is 13 s noisy or 20 s silent the right cost?
