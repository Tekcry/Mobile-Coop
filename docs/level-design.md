# Level design standard - Night Shift

The baseline for every map, now and future. A map's spec may tighten a rule; it may only loosen one with Michael's
written approval in that spec. Numbers marked "constant" come from the code: re-confirm them with grep before each
map, because tuning can change. Sizes, speeds, times and targets live in `docs/design/scale-sheet.md` (generated into
`docs/design/metrics.json`): this standard states the rule and names the metrics key. Check severities (ERR / WARN /
INFO) live in `docs/level-validator/graph-schema.md`.

## Modes and tags
Every rule names the modes it binds: **[All]**, **[Campaign]**, **[SectorOps]** or **[Training]**. A tag on a section
heading covers every rule under it; a rule's own tag replaces it. A map's graph names its mode in `meta.mode`
(`campaign`, `sector`, `training`) and the validator runs that mode's profile (rule index at the end).

### Campaign profile (Infiltration mode; Mission 1 is Tallow Wharf, Michael 2026-10-25 ~10:45)
- Exactly two players; it cannot be completed solo; no bot (G2, G50, G253). (11.1)
- Every section has at least one forced co-op gate: its exit cannot be reached from its entry by solo moves, and each
  gate has a solo way back so a downed partner is reached within the revive reach (11.6, 11.10; Michael 2026-10-24
  ~22:45, G292). The co-op traversal kit is 11.9.
- Several routes: a shadow, a high and a loud route per guarded space, a secret in half of them (3.2), two routes per
  section (11.2).
- In-world guidance only: no markers, no maps; objectives name what and where (6.4).
- Up to 2 strict rules per mission; breaking one restarts the section (9.3).
- Guards: as many as realistically possible (4.9); no heavies or dogs; helmets by difficulty (4.10).
- Light: real-world bands per space type (5.5); hardened lit chokepoints allowed with a route around (5.2).

### Sector Ops profile (map `campusOps`, Saltmarsh Park)
- 1-4 players (coop4 #317, G308); solo is always possible: a team door keeps a solo route past it (G280), so no
  softlock (11.6). Parallel objectives for teams, or one solo player doing them all (G291).
- Several routes: 2-3 routes per section to its objective and exit (G190), three routes per guarded space (3.2).
- In-world guidance only (6.4). Strict rules may be global, per team or per split (9.3).
- Guards scale with the player count ("Keep scaling", G331); `sector_alive_max` alive per section is a ceiling,
  not a target (G187, G332); room to manoeuvre first (G190); some guards are unavoidable (G303); dogs, riot shields in
  response teams, late armour, helmets by difficulty (4.10).
- Revive syringes and checkpoints (G188). Light as the campaign (5.2, 5.5).

### Training profile (Marlow Yard, map `ctcourse`, Course mode)
- Two players (G308). Heavily guided and very linear: one route, with split paths and multiple objectives only in its
  later sections, as teaching (Michael 2026-10-24 ~22:45, G292). The route-count rules (3.2, 3.3, 11.2) do not bind it,
  nor do the forced-gate and no-softlock rules (11.6, 11.10): it teaches each co-op move in place.
- Keeps its guidance marks and the always-on objective list (G292); no maps, minimap, compass or blip (6.4).
- Timed drills allowed: "Marlow can use timed drills, it must force players into situations as a way of training them"
  (Michael 2026-10-25 ~10:45; 6.3).
- Lit by default, the players cut it (G279); normal guards, few per set (4.9).

## 1. The player fantasy [All]
The player is a predator, not prey: a stealth operative who reads a space, makes a plan, executes it and improvises
when it breaks. Combat is always possible and never required. Darkness, silence and patience are always the better
answer, and the level rewards them.

The core loop every space must support: **observe, plan, execute, improvise, release.**

## 2. Architecture first [All]
1. **Real building.** Design the building before the gameplay: its purpose, era, construction, every room's job, how
   people, goods and services moved through it, and what it is used for now. Then lay the stealth route over it.
2. **"Why is it here?"** Every wall, block, pipe, ledge, ladder, vent, window, crate, lamp and fence must be a real
   element of that building in a sensible place. "So the player can do X" is never the reason. The design doc records
   the answer for every traversal element.
3. **Moves come from architecture.** Each stealth verb is found in a real building element (the spec lists the
   mapping). If no believable element exists for a verb, the map leaves that verb out and says so.
4. **Real proportions.** Real corridor, door, stair, storey, window and room sizes for the building's era and type.
5. **Consistent visual language.** Things that look the same behave the same. If one drainpipe is climbable, every
   drainpipe of that kind is. Non-climbable look-alikes must look clearly different.
6. **Gate with real things.** The critical path is held linear by locked doors, sealed fire doors, shuttered lifts,
   security cages and walls - never invisible walls.

## 3. Space structure [All]
A level is a linear spine of encounter spaces joined by connectors.
1. **Entry vantage.** Every encounter space opens on a dark vantage, outside every guard's view for the whole patrol
   cycle, from which every guard in the space can be seen within one cycle. The vantage sees at least
   `vantage_min_frac` of the space's floor (`sees_pct` in the map's graph, measured in greybox). (G284.)
2. **Three routes plus a secret.** [Campaign] [SectorOps] Each guarded space has a shadow route (patience, timing), a
   high route (movement skill) and a loud route (force, fastest). At least half of the guarded spaces also have a
   secret route that rewards exploring (a crawlspace, a shaft, a back room). No route is strictly best: each trades
   speed, risk and reward. [Training] One route; split paths only in the later sections, as teaching (G292).
3. **Rejoin at a pinch point.** All routes through a space rejoin at its exit before the next space. No route skips a
   space. [Campaign] [SectorOps] Between entry and exit the routes cross at least once: they share a room or junction
   where a player can switch route (checked per section). (G284.)
4. **Loops, not dead ends.** Every guarded space has at least one loop on its shadow route (around a blocker, through
   two doors of the same room) so a seen player can break line of sight and re-hide. A dead end on a stealth route is a
   design fault. From any point of a stealth route, line of sight can be broken within `los_break_max_s` (`los_break_s`
   per encounter space, measured in greybox on the nav grid). (G284.)
5. **Stepping stones.** Along shadow routes, darkness, cover or a hide spot at least every 4-8 m. Open lit ground is a
   deliberate crossing that needs timing, a light out or a tool.
6. **Height is safety and information.** Guards see poorly above them (G44): the high route gives overwatch and
   takedowns from above in exchange for time and skill. [Campaign] [SectorOps] Some high routes (pipes, catwalks,
   vents) have a static lookout posted on them, so height is not always safe (G335, "Add both").
7. **Sightline control.** Long open sightlines are dangerous and used on purpose. Corners, doorways and occluders are the
   decision points between them.
8. **Quiet connectors.** Between encounter spaces: a stair, corridor, cupboard or shaft with no guard, where the player
   breathes and glimpses the next space (glass, a light under a door, voices beyond a wall).
9. **Checkpoint before every encounter space.** The objective (or checkpoint) at the end of a space sits on a floor, in
   the dark, out of every guard's view.

## 4. Guards [All]
1. **Jobs, not lines.** Every guard does something someone would really do there at that hour (rounds, gauge
   reading, a post, a smoke break, loading a van). The job sets the route, the stops and where he looks.
2. **Mix patrol types** across a level: static post, sentry sweeping a view, loop, back-and-forth, talking pair, paired
   patrol, lookout on a high route, investigator. No two adjacent spaces use the same mix.
3. **Clockwork.** Patrol cycles 25-45 s; stops 3-6 s; gaps in coverage 3-8 s. No randomness that defeats planning.
4. **Isolation moment.** Every guard is alone, in the dark and unwatched at some point in his cycle; the design doc names
   the spot and the time. Exception: a paired patrol whose two guards check on each other (G335,
   "Add both"; replaces G11's cut for this) is split by a distraction or taken together with a dual takedown; the
   design doc names that spot instead.
5. **Overlapping coverage.** In every space with two or more guards (or a guard watching into a neighbouring space), at
   least one guard covers another for part of his cycle, so the player must choose who goes first.
6. **Lure destinations.** Every lure (a light switched off, a lamp shot, a noise) sends the guard somewhere the player can
   use: under an anchor, into a dark grab spot, away from a crossing.
7. **Bodies matter.** Each space has a hide spot near its takedown spots and at least one patrol that would find a body
   left in the open.
8. **Survivable searches.** Every place a player can be spotted on a stealth route has a hide spot or a dark escape
   within the guards' search area.
9. **Guard counts.** As many guards as realistically possible (Michael 2026-10-24 ~22:00, G289): each space gets the
   guards a real site would post (entries, posts, patrols, response), pushed high for challenge, bounded by the mode's
   caps (12.1) and by every route staying passable. The per-space bands `guards_early` / `guards_late` (first or second
   half of the spine) are a floor, not a ceiling: below the band warns, there is no upper band. The graph records the
   count per player count.
   - [Campaign] Infiltration spawns `SQUAD_CAP` guards at a time, the rest as the alive count drops (12.1).
   - [SectorOps] Counts rise with the player count ("Keep scaling", G331); `sector_alive_max` alive per section is a
     ceiling, not a target (G187, G332); room to manoeuvre comes before count (G190); signed-off counts S1 15, S2 18,
     S3 20, S4 25, S5 26 (G328).
   - [Training] A set spawns at most `SET_GUARDS_MAX` 3 guards (12.1); the bands do not bind.
10. **Archetypes per mode.** [Campaign] No heavies or dogs (G155); armour and helmets come with the alarm stages, and by
   difficulty: harder difficulties always have helmets, on the hardest a helmet cannot be shot off (G338; for the
   campaign Michael 2026-10-25 ~10:45, "Same rule"). [SectorOps] Dogs (G297); riot shields only in alarm response
   teams, heavier armour in later sections (G307); helmets by difficulty as above. [Training] Normal guards (G279).

## 5. Light and sound [All]
1. **Every lit pool has a visible source** (a lamp, a tube, a floodlight, moonlight through a window) and a switch
   where a real one would be, by a door. Darkness is where nobody works at night.
2. **Every lit chokepoint** can be darkened at least two ways (a switch, a breaker, shooting the fixture, the held
   pistol jammer G152), or is hardened (an un-shootable fixture, a guarded or locked breaker) with a route around it
   (G333, "Everywhere"). Every lit chokepoint can be avoided at least one way.
3. **Sound comes from materials.** Loud floors (metal, grating, chequer plate, gravel, glass) and quiet floors (carpet,
   linoleum) are placed on purpose, look different, and put a quiet and a loud version of the same action side by side
   (an open window beside a glazed one, a door opened or bashed, a vent unscrewed or kicked, a hang-and-drop or a jump
   down).
4. **Readable at a glance on desktop at the Low preset:** lit and dark areas match the light meter.
5. **Real light levels.** Each space is lit to the real-world illuminance band of its space type (scale sheet section
   9: AS/NZS 1158.3.1 car parks and roads, AS/NZS 1680 / EN 12464 interiors; values set by the light-realism job),
   with engine light calibrated to lux once and measured from the bake at greybox exit. Stealth comes from real gaps
   (between poles, under carports, behind cars, cut circuits, shot lamps), never from leaving lit places unlit
   (G329, "Real-world levels"). The floor shadow share (`shadow_pct`, `shadow_min_frac` -
   `shadow_max_frac`) is reported for information only; the band wins. [Training] Lit by default, the players cut it
   (G279).

## 6. Pacing [All]
1. **Teach, test, twist.** One new mechanic per space: introduce it safely, test it alone, then combine it with earlier
   ones. The level ends in a set piece that uses everything.
2. **Tension and release.** Tension rises across the level; every peak is followed by a release. The beat chart (section
   13) proves it. In spine order, no three spaces in a row sit at tension 4-5, the map opens at 1-2, and a 1-2 follows
   every peak (validator `checkPacing` on the graph's `tension`). (G284.)
3. **The player sets the pace.** [Campaign] [SectorOps] No forced timers in stealth. Pressure comes from guards, light
   and noise. Soft windows only: predictable windows (shift changes, fixed patrol cycles) signposted in the world; no
   countdown that closes a route (G334, "Soft windows only"). [Training] Timed drills are allowed: "Marlow can use timed
   drills, it must force players into situations as a way of training them" (Michael 2026-10-25 ~10:45).
4. **Guide without markers.** [Campaign] [SectorOps] Objectives name what and where; the level flows naturally to each
   objective ("Objectives must name what and where, but no map, level design must flow naturally towards each
   objective", G336): landmarks visible from afar, light leading the eye towards the way on, signs and place names,
   sightlines into the next space. The objective is a short, plain English line; it fades in and out in game, shows
   on every update, and a tap on View (Select) on the pad or O on the keyboard shows it for about 5 s (Michael
   2026-10-25 ~10:45). No markers or waypoints (G290); no maps, minimap, compass or objective blip in any mode (G336,
   G339); an optional hint layer, off by default (G290). [Training] Marlow Yard keeps its guidance marks and the
   always-on objective list (G292).

## 7. Agency and toys [All]
1. **Every problem has several tools; every tool solves several problems.** The design doc's tool / problem matrix shows
   it.
2. **Toys in every space:** at least two of switches, breakable lamps, doors, windows, vents, lure spots.
3. **Ghost, non-lethal and lethal play are all viable**, except in a mission whose strict rule is no-kill (9.3). The
   section rating rewards the harder styles (undetected, no kills, no alarms, bodies hidden; G307).
4. **Gadgets help, never required.**

## 8. Readability and fairness [All]
1. The player can always tell why they were seen: no off-screen instant detection, no hidden watchers.
2. Threats are telegraphed: sniper lasers, flashlights, barks, footsteps.
3. Detection states and cues are the same everywhere (the game's alert arcs and barks; no map-specific exceptions).

## 9. Failure [All]
1. Detection escalates step by step and line of sight can be broken.
2. Failure is a new situation, not a reload: running, hiding and fighting are all real options after a detection.
3. **Strict rules.** A mission has up to 2 strict rules, signposted in the briefing and the objective list; "ghost"
   counts as one. Breaking one restarts the section: the team goes back to that section's checkpoint and the mission
   continues (G290). [SectorOps] A rule may be global, per team or per split (G291).

## 10. Exploration and reward [All]
1. Secret routes, alternate takedowns from anchors and shortcuts reward curiosity.
2. Environmental storytelling: props show who works there and what happened (dressing only).
3. Sightlines and glass let a player plan the next space early.

## 11. Co-op layering
Rewritten 2026-10-24 for two players (G284) and per mode 2026-10-25 (doc-level). The authority for co-op flow is the
CT co-op research (G3, G117; `docs/ct-research/levels-digest.md` section 3). Each rule names the check of
`scripts/level-validate.mjs` that tests it on the map's connectivity graph (section 13); sizes, speeds and times come
from `docs/design/metrics.json`, generated from the scale sheet. Times and reach are targets declared in the graph
before geometry and measured in greybox: a map whose measured value misses its target fails.
1. **Player counts.** [Campaign] Two players, always: completable by two and by no fewer (G2, G50, G253). [SectorOps]
   1-4 players (coop4 #317, G308); solo play works past every team door (G280). [Training] Two players (G308). The
   graph lists the counts in `meta.players`. Check: `checkStructure` (counts), `checkReach` (every space, objective and
   exfil reached).
2. **Linear spine between sections, loops inside them.** [All] A map is a chain of sections in order (CT missions are
   one continuous level, `levels-digest.md`). Every path from insertion to exfil passes every section in order, and two
   sections join by one spine connector. No route skips a section. Check: `checkSpine`. [Campaign] [SectorOps] Inside a
   section, at least 2 independent (edge-disjoint) routes join its entry to its exit, so the pair can split up, loop
   and re-hide (3.3, 3.4). Check: `checkRedundancy`. [Training] One route (G292).
3. **Splits are short and even.** [All] A split is a stretch where the partners take different legs and meet again at a
   defined merge point (CT research: no separation without a merge point). Each leg takes at most `split_max_s` at the
   stealth pace `split_speed_mps` (crouched sneak), and the two legs' times are within `split_parity_pct` of each other.
   Leg times are summed from link traversal times (a link's `time_s`, else its length over the speed), not from room
   lengths. Check: `checkCoop`.
4. **Partners act for each other.** [All] Every split has at least one assist: one leg's action opens, darkens or
   disables something for the other leg (a door opened, lights cut, a camera jammed). Check: `checkCoop`.
5. **An overwatch spot per split.** [All] Each split has one spot from which one partner sees the other's leg and can
   cover it (spot a guard, cut a light, jam a camera). Check: `checkCoop`.
6. **A downed partner is reachable.** [All] From any point of one leg of a split, the other partner reaches the other
   leg within `reach_max_s` at `reach_speed_mps` (the jog, G40). The revive window is 30 s (G126, `REVIVE_WINDOW` in
   `src/game/reviveClock.ts`; the revive itself takes 2.5 s), so the reach leaves time to clear the room first
   (constant: the reviver within 1.5 m of height). Check: `checkCoop`.
   [Campaign] Every forced co-op gate (11.10) has a solo way back (a drop, a ladder kicked down, a door that stays
   open), so a partner downed on either side of it is reached within `reach_max_s`. Check: `checkReach` (gate reach).
   [SectorOps] No softlock: every surface a co-op route reaches is also reached by another route without a co-op move,
   so a downed or solo player is never stranded (G280). Check: `checkReach` (no softlock).
7. **Room for two.** [All] A shared route (both partners moving through together) is at least `shared_min_w_m` wide;
   corridors stay in `sizes.corridor_w`. Check: `checkCoop` (`shared` links), `checkDimensions` (corridors).
8. **Co-op reach.** [All] A co-op lip is above the highest one-player reach from its floor (constant:
   `WALL_JUMP.maxUp` 3.8) and within the co-op reach (constant: `TEAM.boostMax` 4.5): build in `sizes.coop_lip` (G57:
   one band for the boost and the human ladder). Co-op routes are ordinary architecture with a real reason one player
   cannot use them (a fire-escape ladder pulled up, a high hatch, a shutter that needs holding, a door bolted on the far
   side; 16.0). A locked door with no way to open it is a wall (2.6), not a gate. Unplanned boost targets: every lip
   and pipe between one-player reach and co-op reach above its floor is a planned co-op route, sits on a surface
   reached without a co-op move, or has its ledge removed. Team moves work anywhere with room (G151), so every such lip
   is a real boost target. Check: the co-op lip unit test (15).
9. **Co-op kit and coverage.** [All] The co-op traversal kit (G293): boost up a wall, throw over a gap, human ladder /
   pull-up, hold a shutter or door, rope brace / descent (CT's two-person rope, G180), vent unlock for the partner, plus
   new creative moves (Michael: "Any other creative coop ideas"); and the dual takedown. A move the game does not have
   yet is built by its co-op job before a map relies on it. Graph kinds: `coop_boost` (boost), `human_ladder` (human
   ladder, pull-up), `coop_throw` (throw over a gap), `pair_gate` (hold a shutter or door, a door unlocked from the far
   side after a vent or a throw), `team_rope` (rope). Co-op routes are in at least half of the encounter spaces and in
   every section. Check: `checkCoop` (coverage).
10. **A forced co-op gate per section.** [Campaign] Every section forces a co-op traversal move with no solo bypass:
   the section's exit cannot be reached from its entry by solo links alone (Michael 2026-10-24 ~22:45: "must have forced
   coop traversal to proceed", G292). Each gate keeps its way back (11.6). Check: `checkRedundancy` (forced gate).
   [SectorOps] Team doors stay two-player, with a solo route past them (G280). [Training] Each exercise teaches its move
   in place; not checked.

## 12. Engine constraints (re-confirm per map) [All]
State on 2026-10-25. Every number is a starting value tuned after the CT prototype (DECISIONS G10). "Decided, not built
yet" rows are Michael's decisions the code does not have yet: design new maps against them, and re-confirm against the
code when they land.

### 12.1 Facts in the code now
- Nav: 3 walkable surfaces per column by default (`DEFAULT_NAV_LAYERS` in `src/ai/navBuild.ts`); a map raises it with
  `MapDef.navLayers` (campus: 5). The nav sampler casts down to y -2 only, so a surface below about -1.5 m (a
  basement, a tunnel) is not on the guards' grid. Stairs and ramps join storeys by height. Guards walk surfaces whose
  normal y > 0.65 (about 49 deg); the player walks up to 50 deg: keep designed slopes at 45 deg or less.
- Guard caps per mode: Infiltration (the campaign mode) and Hunter (parked) spawn up to `SQUAD_CAP` 9 at a time,
  nearest first, the rest as the alive count drops (`src/game/modes/infiltrationMode.ts:14`, `clearMode.ts:12`);
  `MAX_ALIVE` 12 awake in every mode but Sector Ops (`src/ai/enemyManager.ts:83`); Sector Ops raises it to
  `SECTOR.maxAlive` 32 (`src/game/sectors.ts:508`, G187); Course mode spawns one set's squad at a time, at most 3 per
  set (`SET_GUARDS_MAX`, `src/world/maps/ctcourseSets/types.ts:190`). The 12 is reviewed against desktop performance
  (G46); the guard-cap job looks for ways past the caps (G254).
- Guard sight is a horizontal cone with no vertical limit: a guard sees a player 4 m above him as well as one at his
  height (G44 is decided, not built: 12.2).
- Split gaps are found automatically from any two facing faces >= 3.6 m tall and 1.2-1.95 m apart: no accidental ones.
- Box tops >= 1.9 m become hangable lips automatically: remove unwanted ones with `noLedge` / `mark`.
- `ambientZone` covers y -1..8 by default: set `minY` / `maxY` per storey.
- Reach: solo wall-jump reach `WALL_JUMP.maxUp` 3.8 m; co-op boost `TEAM.boostMax` 4.5 m; human ladder grab
  `TEAM.ladderGrab` 4.1 m (all in `src/config/movement.ts`).
- Footstep noise: silent on every surface at crouched gears 1-4 (caps 0.42 / 0.75 / 1.08 / 1.5 m/s; `NOISE_QUIET.crouch`
  1.7) and standing gears 1-2 (0.65 / 1.1 m/s; `NOISE_QUIET.stand` 1.45); the surface only scales audible steps. Six
  gears per stance, the sprint is standing gear 6 (4.15 m/s).
- Doors: a door blocks light, sound and guard sight until it is open past `DOOR_SHUT` 0.05 of its swing; the player's
  door crack (0.12) counts as closed. Guards push doors open as they walk through (`Doors.pushOpen`) and never close
  them; only players close doors. A door is bashed open at a sprint.
- A hold can make noise per object (`Interactable.holdNoise`, pulses every 0.5 s; no current map sets one; the cast-iron
  manhole constant `MANHOLE_LIFT_NOISE_RADIUS` is 10 m). Hearing (guard-ai S1, `ai/hearing.ts`): a wall cuts a noise's
  reach to 0.45 and a noisy thing near the guard masks it (6 dB halves, 12 dB quarters); every guard inside the
  effective reach turns to look, and one guard per noise, the nearest inside half of it, walks over. Loud gunfire is
  combat only inside a quarter of its effective reach (28 m in the open -> ~7 m); farther, one guard is sent to look.
- Health comes back only at wall medkit stations (`MapDef.medkitWalls`: hold 0.6 s, +40, single use); there are no
  carried medkits and no medkit crates. Health does not regenerate.
- The camera is the shoulder camera; corridor widths, bend lengths and the 1.5 m crouch height in 16.7.3 and the scale
  sheet were measured on it.
- Tuning tables never change for a map; change the geometry.

### 12.2 Decided, not built yet (the CT prototype and later jobs change these)
- Speeds and silent bands (G40, loco M25 (6)): CT speeds (standing about 0.2 / 0.75 / 2.0 / 3.0 / 4.2 m/s, crouched about
  0.4 / 0.85 / 1.5 / 2.1 / 2.6 m/s; no sprint); the two slowest standing and the three slowest crouched speeds are silent.
- Camera (G28, G29, G38): the exploring camera sits about 1.8 m behind, head at screen centre, the same height for every
  operator. Corridor widths, crawl heights and aisles are re-measured right after the camera part of the prototype and
  the scale sheet is updated before new floor plans (G54).
- Doors (G41, G97): light, sound and sight pass past about 15% open (one threshold); guards close doors behind them on a
  calm patrol and notice any door open that should be shut; a CT door menu (open, stealth open, bash, optic cable), bash
  can knock out a guard behind the door; running into a door does nothing special.
- Guards see poorly above them (G44).
- Glass (G45): clear glass passes light and sight; frosted glass and blinds pass light only; thermal never sees through
  glass.
- Strike (G42): the palm strike knocks out any human guard from any side in one hit; dogs cannot be palm-struck; heavies
  follow the CT co-op research (G49).
- Crawl spaces are crouch-walked; automatic crawl only in real duct ends inside plant shafts (G56).
- Co-op reach (G57): one co-op ledge band 4.3-4.5 m serves the boost and the human ladder (the ladder reaches 4.5 m).
  Team moves work anywhere with room (G151, which replaced G81's marked spots).
- Medkit stations are placed in every map (G98).
- Two players only in the campaign and Marlow Yard (G2, G50, G308): the campaign cannot be completed solo.
- No prone crawl (G110); CT's two-person rope is back (G180, graph kind `team_rope`).

### 12.3 Map decisions that relied on changed facts
A job that changes a 12.1 fact lists here the map decisions that relied on the old fact; once a map's job re-checks
one, it leaves this list (its history is in git and `docs/archive/maps/`).
- Hearing (guard-ai S1): one guard walks over per noise and loud gunfire is combat only close in (a quarter of its
  reach). Map decisions that relied on "a loud shot alerts every guard within 28 m": the Sector Ops suppressed-shot spot
  check (`e2e-sectorops`, its control now fires from beside the guard). No map spec relies on everyone walking over.

## 13. Required design deliverables (templates) [All]
This section owns the per-map deliverables (the design bible points here). Phases 1 and 2 of every map produce them in
the map's own docs folder (one folder per map, G55; for example `docs/sector-redesign/` for the campus,
`docs/ct-prototype/` for Marlow Yard): `<map>-design.md` and `plans/*.svg`.

**Connectivity graph** (first, before any geometry and before the floor plans; G284). One JSON file per map,
`<map>.graph.json` (it may be split one file per section), in the format of `docs/level-validator/graph-schema.md`:
`meta.mode`, every space (section, type, room class, function, size, tension, and for encounter spaces the targets:
vantage view, line-of-sight break, guards per player count) and every link (kind, route, width, height, length or
time, reason). Phase 1 writes the spaces and links with the building brief; Phase 2 adds the routes, splits, overwatch
spots, assists, gates and targets. It passes `node scripts/level-validate.mjs <graph>` (every size from
`docs/design/metrics.json`) before Phase 3 (section 14).

**Building brief.** Purpose, era, location and site, construction (grid, wall thicknesses, storey heights, windows,
materials), every room with its original purpose, size and present-day contents, vertical circulation, services (how
people, goods, cables, air, water moved), palette and lighting character (the space types and their light bands, 5.5).

**Floor plans (SVG).** To scale (1 m = 10 px), grid every 6 m, north up, rooms labelled, doors with swing arcs, windows,
stairs with arrows, columns, key dimensions; one file per storey; must render on GitHub's mobile view. Gameplay overlays
as separate files (`*-gameplay.svg`): shadow / high / loud / secret routes in four colours, guard routes with stops and
facing, lit pools, dark areas, loud floors hatched, vantages, objectives, co-op routes and gates.

**Objective and lead plan** (one row per objective, in order; parallel tracks side by side for Sector Ops)
| Field | Content |
| --- | --- |
| Objective | The objective text as the player reads it: a short, plain English line naming what and where (6.4) |
| Leads | The in-world guidance to it: landmarks, signs and place names, light leading the eye, sightlines |
| Flow | How the level carries the players there from the previous objective, and where they could lose the way |
| Who | [SectorOps] Which team or split does it, and how one solo player does it |
| Rules | The mission's strict rules (9.3) and where each is signposted |
| Windows | Any soft window it uses (6.3) and how the world signposts it |

**Space sheet** (one per encounter space)
| Field | Content |
| --- | --- |
| Space | Name, storey, real purpose, size |
| New mechanic | What this space teaches; what it combines |
| Entry vantage | Position, what is visible, cycle needed to see every guard |
| Routes | Shadow, high, loud, secret: each a short walkthrough in the player's words |
| Loop | Where the shadow-route loop is |
| Stepping stones | Darkness / cover / hide spots along the shadow route with spacing |
| Guards | See guard sheets; who covers whom; each isolation moment |
| Lights | Each source, its switch, circuit group, the ways to darken each chokepoint or why it is hardened |
| Surfaces | Loud and quiet floors and why they are there |
| Toys | Switches, lamps, doors, windows, vents, lure spots and where each lure sends a guard |
| Hide spots | Positions; which patrol finds a body left where |
| Traversal elements | Each with its "why is it here" and its target-number check |
| Exit | Pinch point, checkpoint / objective site, the connector after and what it reveals |
| Tension | 1-5 |

**Guard sheet** (one per guard)
| Field | Content |
| --- | --- |
| Guard | Id, kind, space |
| Job | What he is doing there tonight |
| Route | Points (x, z, y), stop at each (seconds, facing), cycle time |
| Gaps | Coverage gaps the player can use (time, place) |
| Isolation moment | Where and when he is alone, dark and unwatched (or, for a paired patrol, where the pair is split) |
| Covered by / covers | Overlaps with other guards |
| Lures | What draws him, where it sends him |
| Search | Where he searches when suspicious; the nearest hide spots |

**Beat chart**: one row per space and connector: tension 1-5, mechanic taught, mechanics combined, release, the feeling
(tension rises overall, a release after every peak, the set piece last).

**Coverage table**: every movement and stealth verb the game has (from `docs/systems/input-and-loop.md` and the CT
research) against where it is used: taught / tested / combined, or "not used" with the reason.

**Tool / problem matrix**: rows = problems (a lit post, a pair, a patrol over a crossing, a locked route, a loud floor),
columns = tools (darkness, light switch, shoot light, lure, takedown kinds, anchors, gadgets, co-op): each problem has at
least three tools.

**Metrics check**: every traversal element and takedown spot against its constant window.

**Self-critique**: as lead designer, the 10 weakest points (flow breaks, a dominant route, a guard job that makes no
sense, a dead end, a space without toys, an element that fails "why is it here", an unfair detection) and the fix for
each.

**Playtest checklist** (for Michael's walks and the e2e):
- Can a first-time player read every patrol from the vantage within one cycle?
- Is any route strictly best?
- Is there a detection the player cannot escape?
- Did the player understand every detection?
- Did the players find every objective from its text and the level alone?
- Was every toy used at least once across sessions?
- Did the level feel like the building it claims to be?

## 14. Standard phases and gates [All]
This section owns the phases; the map spec template refers to it. Phases run back to back under the job's lead (G87).
Michael's gates are one-click: before greybox or art on a map he approves a one-page to-scale plan and a 5-line intent
check (G288 (4)), and after the release he walks the 10-minute walk card.
0. **Setup and investigation**: branch, save the spec verbatim, progress log, confirm every referenced fact by grep,
   answer the spec's engine questions. No gameplay changes.
1. **Architectural design** (docs only): building brief and floor plans.
2. **Gameplay design** (docs only): objective and lead plan, space sheets, guard sheets, gameplay overlays, beat chart,
   coverage table, tool / problem matrix, metrics check, self-critique. The approved docs are the build contract.
   **Validator gate** (G284): Phase 2 ends with the map's connectivity graph (13) passing
   `node scripts/level-validate.mjs` with 0 errors, every warning justified in the design doc, the output saved with
   the design docs, and the one-click sign-off. No map enters Phase 3 (greybox) without both. A map already greyboxed
   runs it as an audit; the campus (Sector Ops) is its first run.
3. **Build** (one storey or area per phase, no guards): geometry, anchors, lights, zones, surfaces, doors, windows, hide
   spots; `scripts/plan-svg.mjs` renders the built level to compare with the approved plans.
   **Greybox exit gate**: (1) a measured validator pass, `node scripts/level-validate.mjs --require-measured` (V6,
   Michael 2026-10-24 ~22:00, "Yes, require it", G289 (2); until the flag is on master the greybox exit waits for it);
   (2) bot route-runs: a scripted run walks every declared route (shadow, high, loud) against live guards, logging time,
   detections and dead stops (the route-runs job, Marlow Build; G330, "Bot route-runs + your walk"); (3) a 10-minute walk card for Michael.
4. **Guards and mission**.
5. **Dressing, readability and verification**.

## 15. Acceptance tests every map has [All]
- The map's connectivity graph passes the validator (`node scripts/level-validate.mjs`, 0 errors, warnings justified)
  and matches the built map. (G284.)
- Greybox measurements meet the graph's targets: light band (5.5), vantage view (3.1), line-of-sight break (3.4),
  downed-partner reach (11.6) and split leg times (11.3), measured from the light bake and the nav grid; a measured
  value that misses its target fails the map. A target not yet measured prints "pending V6"; at greybox exit
  `--require-measured` turns pending into an error (14).
- Every declared route passes its bot route-run (14).
- Every planned traversal element engages from its planned approach (pad).
- `e2e-anchors.mjs` covers the map.
- The split gaps on the map are exactly the planned ones.
- The nav path from insertion to extract passes the spaces in order; no path skips a space.
- Darkness: at each vantage and planned dark pocket a crouched still player stays under suspicious for a full patrol
  cycle; in each planned lit pool on a route he is noticed; switching the circuit off makes it safe and lures the guard.
- Noise: each planned loud floor draws the planned guard above a silent gear and not at a silent one.
- Patrols: every route point is on the nav grid, cycles are 25-45 s, every guard covers his route.
- Every guard the mode spawns at the start is alive (12.1); a ghost run succeeds and earns every section-rating bonus
  (G307 (5)); a body left on a route is found.
- Co-op: each co-op route works for host and client; each co-op lip is out of solo reach (unit test); a player downed on
  each co-op surface is revived. [Campaign] Each section's forced gate cannot be passed solo. [SectorOps] Solo play
  completes past every team door.
- Perf budgets from `docs/systems/performance.md` on desktop.

## 16. Level logic rules [All]

Adopted by Michael on 2026-10-10, written after the playtest of a since-retired map (its files are in `docs/archive/maps/`). They bind every new map. Rule ids are 16.N.M; references to other sections of this standard are plain section numbers.

### 16.0 Rule zero

Architecture first, gameplay second. Design the place as its architect drew it for its job, then find the stealth play inside it. If a gameplay idea has no real-world reason, change the idea, not the building.

**The reason test.** Every space, wall, object, opening, level change, lamp and route element has a one-line real-world reason in the map's element register (16.9). "So the player can..." is never a reason. If no line can be written, the element goes.

### 16.1 Program before plan

16.1.1 The D0 brief comes first: what the site is, who built it, who works there and when, what each building does, every room with its function and size, circulation, services, and why it is quiet tonight. Gameplay design starts only after Michael approves it.
16.1.2 Room sizes, storey heights, stair and door sizes follow the era and building type and `docs/design/scale-sheet.md`. Gameplay widths may be larger than code minimums, never smaller.
16.1.3 A building has a structural grid. Walls, columns and cores sit on it.

### 16.2 Vertical circulation

16.2.1 People move between storeys only by **stair cores** (main stairs), **enclosed fire stairs**, or **fixed ladders inside plant spaces and service shafts** (plant rooms, lift motor rooms, risers, boiler platforms, manholes). Nothing else joins two floors.
16.2.2 **Never a ladder beside a stair** that serves the same two levels. (Old layout: stairs next to a ladder.)
16.2.3 **No ladder in a hole in an occupied floor.** A ladder opening exists only inside a plant space or shaft, with a cover or a guard rail. (Old layout: a ladder in a random hole in the floor.)
16.2.4 **Every stair is complete:** real riser and going, handrails, a balustrade on every open side, and no gap between the stair, the landing, the floor edge or the wall. Enclosed stairs have full-height walls. (Old layout: stairs with no handrail and a gap.)
16.2.5 **Roof access on a secure building is a covered stair bulkhead or a fire stair**, at a core or near a building corner. Never an exterior ladder in a random spot. (Old layout: roof ladders on a secure building.)
16.2.6 Exterior climbing (drainpipes, low roofs, walls) is player traversal, not circulation. It uses real elements of the street or building, and the same element behaves the same everywhere: if one cast-iron downpipe is climbable, every one of that kind is (2.5).

### 16.3 Openings, holes and barriers

16.3.1 Every door, window, hatch, grille, vent, gap and hole has a stated function: who uses it, when, and why it is where it is.
16.3.2 **No hole in a floor or roof** except a real opening: a stair well (with a balustrade), a lift shaft (enclosed), a service riser (enclosed, with access doors), a hatch (with a cover), a roof light or skylight (glazed), a cowl or vent (with its duct). (Old layout: a random hole in the roof.)
16.3.3 **No barrier in front of a room, door or window** unless the object has a job at that spot and does not block that door's or window's own function. (Old layout: a barrier in front of a room for no reason; a block in front of a window.)
16.3.4 **A vent exists only as the end of a real duct system** that starts at a plant room or fan and serves a room. No vent as a pure shortcut, no vent that goes nowhere. (Old layout: a pointless vent.)
16.3.5 Gates are real locks with an owner (whose key, which side opens). The critical path is held linear by real locks, fences, cages, sealed doors and bricked openings, never invisible walls (2.6).

### 16.4 Objects and blocks

16.4.1 **No block without a named real object** (a skip, an A/C condenser, a transformer, a pallet of bricks, a parked van), placed where that object is used, stored or delivered. (Old layout: blocks with no purpose, several.)
16.4.2 Objects keep real clearances: 1.0 m in front of electrical panels, doors and escape routes; nothing blocks a fire exit.
16.4.3 **Roof objects are roof equipment:** A/C condensers on frames, lift motor rooms, water tanks, exhaust cowls, aerials. Each has pipes or cables going somewhere. (Old layout: random blocks on the roof.)
16.4.4 Low cover comes from real objects of the right height (bins, cars, dock edges, bund walls), not from free-standing boxes.

### 16.5 Roofs and floors

16.5.1 **Roofs are fully covered.** The only openings are real hatches, bulkhead doors, roof lights and cowls.
16.5.2 **Upper floors are fully enclosed:** every storey's slab is complete except stair wells, lift shafts and risers. (Old layout: upper floor not fully covered.)
16.5.3 Roof edges where people work have a parapet or guard rail (1.1 m).

### 16.6 Rooms and paths

16.6.1 **Room shapes follow function and structure:** rectangles on the grid, corridors straight between cores. **No zig-zag or serpentine partitions to lengthen or force a path.** A route is long because the functions it joins are far apart. (Old layout: zig-zag rooms that force a path, several.)
16.6.2 **Every space has a purpose and a matching level of access.** Valuable rooms are locked, guarded or high; utility rooms are plain. No space exists only to be there. (Old layout: areas with no purpose that are also too easy to access.)
16.6.3 **No dead end that only works with an invented side entrance.** If a route dead-ends, either the room really has a second door (and the brief says why) or the dead end is removed. (Old layout: a dead end that would only work with a side vent into the room.)
16.6.4 Circulation reads as a hierarchy: main corridors, service corridors, plant spaces. A player can guess where a stair or a plant room will be.

### 16.7 Underground and ducts

16.7.1 An underground or duct route exists only as a real system: cable tunnel, pipe subway, storm drain, cable trench, builder's-work air duct, basement link. Its row in the brief states what it carries, who owns it, its size, its access points and where it ends and why.
16.7.2 **Walk-in tunnels:** at least 2.1 m clear (2.4 m preferred). Guards can walk them (nav headroom 1.7 m), so the brief says why they do or do not.
16.7.3 **Crouch ducts and trenches:** 1.5 m clear height, 1.2 m wide (scale sheet; the camera reasons, measured on the old camera, are in `docs/archive/maps/design/dead-line-v2-engine-check.md`). Guards cannot enter. The player crouches and walks; no auto-crawl anchors unless Michael approves one.
16.7.4 Duct and tunnel ends are real: inspection doors, shafts with plant ladders, pit stairs, trench steps. Never a grille that pops into a room as a shortcut. Supply grilles are real sizes and are look-through only.
16.7.5 Ducts are built inside walls, slabs or ceiling voids. A free-standing duct box under 1.8 m is an accidental mantle; one over 1.9 m becomes a hangable lip (Section 12). Neither is allowed unless planned.

### 16.8 Light, guards and sound need reasons too

16.8.1 Every lamp has an owner, a real fitting and a switch where a real one would be. An unswitchable lamp has a real reason (photocell, emergency circuit, vandal cage).
16.8.2 Every guard has an employer, a job and a reason to be at each stop (4.1). No guard stands somewhere nobody would.
16.8.3 Loud and quiet floors come from the room's real finish (gravel, chequer plate, linoleum, carpet).

### 16.9 The element register (required for every map)

One table in the map's design doc, one row per element:

| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |

Every route element (ladder, pipe, roof, duct, tunnel, hatch, opening, cover object, lamp) has a row. A missing row fails review.

### 16.10 Review checklist (from the D1 playtest, Michael's notes)

Before any map leaves D0 or D1, answer each with "none" or a list of fixes:

1. Any room shape that exists to force a path (zig-zag, serpentine, dog-leg partitions)? (16.6.1)
2. Any space with no purpose, or easier to reach than its value allows? (16.6.2)
3. Any ladder beside a stair, or any ladder outside a plant space or shaft? (16.2.1, 16.2.2)
4. Any stair without handrails or with a gap? (16.2.4)
5. Any roof reached by anything other than a covered stair bulkhead or fire stair? (16.2.5)
6. Any roof object that is not roof equipment? (16.4.3)
7. Any floor or roof not fully covered, or any hole without a real reason? (16.3.2, 16.5.1, 16.5.2)
8. Any block without a named object? Any object in front of a window or door it would block? (16.3.3, 16.4.1)
9. Any barrier in front of a room for no reason? (16.3.3)
10. Any ladder in a hole in a floor? (16.2.3)
11. Any vent that is not the end of a real duct system? (16.3.4)
12. Any dead end that only works with an invented side entrance? (16.6.3)
13. Does every element have a register row with a real reason? (16.9)
14. Would an architect of that era recognise every room, and could a visitor guess where the stairs are? (16.1, 16.6.4)

## Rule index
Metrics keys are in `docs/design/metrics.json` (`rules.*` unless marked `sizes.`); checks are in
`scripts/level-validate.mjs`, their severities in `docs/level-validator/graph-schema.md`. "Design doc" = checked by
review, not by the validator. Owner = the job that keeps the rule's number or check current.

| Rule | Modes | Metrics key | Validator check | Owner |
| --- | --- | --- | --- | --- |
| 3.1 Entry vantage | All | `vantage_min_frac` | `checkEncounters` (+ V6 measured) | level validator (Marlow Build) |
| 3.2 Three routes plus a secret | Campaign, SectorOps | - | `checkEncounters` (approaches, secret share) | level validator |
| 3.3 Routes cross | Campaign, SectorOps | - | `checkEncounters` (routes cross) | level validator |
| 3.4 Loops, LOS break | All | `los_break_max_s`, `dead_end_max_m` | `checkEncounters` (dead ends, LOS target) | level validator |
| 3.6 Lookouts on high routes | Campaign, SectorOps | - | design doc (guard sheets) | Guard AI |
| 4.3 Clockwork | All | - | design doc, e2e patrols (15) | map job |
| 4.4 Isolation, paired patrols | All | - | design doc (guard sheets) | Guard AI, map job |
| 4.9 Guard counts | All (bands: Campaign, SectorOps) | `guards_early`, `guards_late`, `sector_alive_max` | `checkEncounters` (bands, Sector Ops ceiling) | level validator, guard-cap |
| 4.10 Archetypes per mode | All | - | design doc | Guard AI |
| 5.2 Lit chokepoints | All | - | design doc (space sheets) | map job |
| 5.5 Real light levels | All | scale sheet 9 (light-realism); `shadow_min_frac`, `shadow_max_frac` (INFO) | `checkEncounters` (shadow INFO), V6 | light-realism (Sector Ops Build) |
| 6.2 Tension and release | All | - | `checkPacing` | level validator |
| 6.3 Soft windows only; Marlow timed drills | Campaign, SectorOps; Training | - | design doc (objective plan) | mission framework |
| 6.4 Guidance | All (Training keeps marks) | - | design doc (objective and lead plan) | mission framework |
| 7.3 Play styles | All | - | design doc | map job |
| 9.3 Strict rules | All | - | design doc (objective plan) | mission framework |
| 11.1 Player counts | All | - | `checkStructure`, `checkReach` | level validator |
| 11.2 Spine; two routes per section | All; Campaign, SectorOps | - | `checkSpine`; `checkRedundancy` | level validator |
| 11.3 Splits | All | `split_max_s`, `split_parity_pct`, `split_speed_mps` | `checkCoop` (splits) | level validator |
| 11.4 Assist | All | - | `checkCoop` (assist) | level validator |
| 11.5 Overwatch | All | - | `checkCoop` (overwatch) | level validator |
| 11.6 Downed partner | All; Campaign gate reach; SectorOps no softlock | `reach_max_s`, `reach_speed_mps` | `checkCoop` (reach), `checkReach` | level validator |
| 11.7 Room for two | All | `shared_min_w_m`, `sizes.corridor_w` | `checkCoop`, `checkDimensions` | level validator |
| 11.8 Co-op reach | All | `sizes.coop_lip` | `checkDimensions`, co-op lip unit test | level validator, map job |
| 11.9 Co-op kit, coverage | All | - | `checkCoop` (coverage, solo twins) | level validator, co-op moves (Player Build) |
| 11.10 Forced co-op gate | Campaign | - | `checkRedundancy` (forced gate) | level validator |
| 14 Greybox exit | All | - | `--require-measured` (V6), route-runs | level validator, route-runs (Marlow Build) |
| 16 Level logic | All | scale sheet 3, 7 | `checkDimensions`; review checklist 16.10 | map job |

## Open items: rules that conflict with docs/DECISIONS.md
The standard changes only with Michael's approval, so these rules stand as written until he decides.
1. 11.8 builds co-op lips in `sizes.coop_lip` (4.3-4.5 m) from the boost reach; the human ladder reaches
   `TEAM.ladderGrab` 4.1 m in code (`src/config/movement.ts:464`) until G57 (4.5 m) is built.
2. 16.7.3's crouch-duct height was measured on the old camera; it is re-measured on the CT camera (G54).

Resolved and removed 2026-10-25 (doc-level): old 1 (solo rules; G253, section 11), 2 (3.6 now follows G44), 3 (G81,
replaced by G151 in 11.8), 5 (design-doc folder, now 13), 6 (phases, now 14), 7 (verb list, now 13). Old 4 is now 1,
old 8 is now 2. Rule ids 1-16 are unchanged; 4.10 and 11.10 are new.
