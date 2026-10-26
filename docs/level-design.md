# Level design standard - Night Shift
Owner: Marlow Build (level validator); a change needs Michael's approval. Status: current.

The baseline for every map, now and future. A map's spec may tighten a rule; it may only loosen one with Michael's
written approval in that spec. Numbers marked "constant" come from the code: re-confirm them with grep before each
map, because tuning can change. Sizes, speeds, times and targets live in `docs/design/scale-sheet.md` (generated into
`docs/design/metrics.json`): this standard states the rule and names the metrics key. Check severities (ERR / WARN /
INFO) live in `docs/level-validator/graph-schema.md`.

## Modes and tags
Every rule names the modes it binds: **[All]**, **[Campaign]**, **[SectorOps]** or **[Training]**. A tag on a section
heading covers every rule under it. A tag at the start of a rule replaces the heading's tag for that rule. A tag inside
a rule covers the rest of that rule, up to the next tag. A map's graph names its mode in `meta.mode` (`campaign`,
`sector`, `training`) and the validator runs that mode's profile. The profiles below list where each mode's rules are;
the numbered sections hold the rules.

### Campaign profile (Mission 1 is Tallow Wharf, G340)
Campaign missions run on the Sector Ops runtime (`SectorMode`) with two players (mission-framework A6).
- Players: exactly two, never solo, no bot (11.1).
- A forced co-op gate per section (11.10), each with a way back (11.6); the co-op kit (11.9).
- Routes: three per guarded space plus secrets (3.2), two per section (11.2).
- Guidance (6.4), strict rules (9.3), soft windows only (6.3), downed (9.4).
- Guards: counts and the 32 alive ceiling (4.9), no heavies, dogs or riot shields (4.10), no civilians on Mission 1 (13,
  G373), security devices (4.11).
- Light: real-world bands (5.5), hardened chokepoints (5.2).
- Built for two (G157): a vantage for two (3.1), the designed exit (3.10), the finale seen early (6.1), pacing targets
  in minutes (6.2), teamwork minimums (11.11), the two-player tests (15).

### Sector Ops profile (map `campusOps`, Saltmarsh Park)
- Players: 1-4; solo is always possible past team doors (11.1, 11.6, 11.10). Parallel objectives for teams, or one
  solo player doing them all (G291; the objective plan, 13).
- One run takes 30-45 min over five sections, S1-S5 (G297). The old map `warehouseOps` is frozen: no more work (G390).
- Routes: 2-3 per section to its objective and exit (11.2, G190), three per guarded space plus secrets (3.2).
- Guidance and the two-minute test (6.4), strict rules global, per team or per split (9.3), soft windows only (6.3).
- Guards: counts scale with the players, 32 alive ceiling (4.9); patrol pockets (4.4); dogs, riot shields, late armour
  (4.10); security devices (4.11); unavoidable guards (4.12).
- Downed: revive syringes and checkpoints (9.4); an ammo crate per section (13, checkpoint plan).
- Light: real-world bands (5.5), hardened chokepoints (5.2).

### Training profile (Marlow Yard, map `ctcourse`, Course mode)
Michael (2026-10-24 ~22:45, G292): "Marlow is a training course and may have different rules to standard mission, ie its
heavily guided and must teach the players the basics of coop gameplay". It is the campaign's training prologue, played
before Mission 1 (G371).
- Players: two (G308); one co-op run takes 15-20 min (G272).
- One linear route: side routes are closed and every section is forced (G388). The later sections, those after every
  move of the co-op kit has been taught on its own (6.1), teach split paths and multiple objectives (G292, G363), and
  only there may a side route stay, for training against enemies, built to the campaign's rules for a mission area
  (G388): such a section follows the campaign route rules (3.2, 3.3, 11.2); outside it they do not bind. The last
  section that teaches a kit move on its own is the graph's `meta.taught_by` (graph-schema), which the validator uses
  for the forced-section and side-route checks (G363, G388). The gate reach and no-softlock parts of 11.6 and the
  forced gate (11.10) do not bind: each exercise teaches its move in place.
- Guidance: its guidance marks (the screen-edge next-drill pointer included, G383) and the always-on objective list,
  which updates per area; no explainer pads (G277, G292); no maps, minimap, compass or blip (6.4).
- Strict rules: none, and no fail or send-back anywhere: every failure is a retry (G370; 9.3).
- Timed drills are allowed (6.3, G342); a failed drill retries the drill only (G361). Downed: the campaign rule (9.4).
- Light: lit by default, every light working (5.1, G367), the players cut it (G279); the dark-vantage, dark-checkpoint
  and darkness-test rules apply once a drill has cut the light (3.1, 3.9, 15).
- Guards: normal guards, only as many as each exercise needs, sometimes none, at most 3 per set (G376; 4.9, 4.10).
- Co-op: each exercise forces the one co-op move it teaches, so the co-op coverage check (11.9) and the forced gate
  (11.10) do not bind (G392); the shutter hold and the vent unlock are taught where the yard gives them a real reason
  (G389).
- The campaign's built-for-two checks (G157; Campaign profile) are tagged [Campaign], so they do not bind here, also
  not in a late section that keeps a side route (there the campaign route rules bind, not the co-op ones).

## 1. The player fantasy [All]
The player is a predator, not prey: a stealth operative who reads a space, makes a plan, executes it and improvises
when it breaks. Combat is always possible and never required. Darkness, silence and patience are always the better
answer, and the level rewards them.

The core loop every space must support: **observe, plan, execute, improvise, release.**

## 2. Architecture first [All]
1. **Real building.** Design the building before the gameplay: its purpose, era, construction, every room's job, how
   people, goods and services moved through it, and what it is used for now. Then lay the stealth route over it. If a
   gameplay idea has no real-world reason, change the idea, not the building.
2. **"Why is it here?"** Every wall, block, pipe, ledge, ladder, vent, window, crate, lamp and fence must be a real
   element of that building in a sensible place. "So the player can do X" is never the reason. The element register
   (16.9) records the answer for every element.
3. **Moves come from architecture.** Each stealth verb is found in a real building element (the spec lists the
   mapping). If no believable element exists for a verb, the map leaves that verb out and says so.
4. **Real proportions.** Real corridor, door, stair, storey, window and room sizes for the building's era and type.
5. **Consistent visual language.** Things that look the same behave the same. If one drainpipe is climbable, every
   drainpipe of that kind is. Non-climbable look-alikes must look clearly different.
6. **Gate with real things.** The critical path is held linear by real locks with an owner (whose key, which side
   opens), sealed fire doors, shuttered lifts, security cages, fences, bricked openings and walls - never invisible
   walls.

## 3. Space structure [All]
A level is a linear spine of encounter spaces joined by connectors.
1. **Entry vantage.** Every encounter space opens on a dark vantage, outside every guard's view for the whole patrol
   cycle, from which every guard in the space can be seen within one cycle. The vantage sees at least
   `vantage_min_frac` of the space's floor (`sees_pct` in the map's graph, measured in greybox). (G284.) [Campaign]
   The vantage has room for both players to watch and plan together, side by side or at one window (G157). [Training]
   Lit by default: the vantage is out of every guard's view; it is dark once the drill has cut the light.
2. **Three routes plus a secret.** [Campaign] [SectorOps] Each guarded space has a shadow route (patience, timing), a
   high route (movement skill) and a loud route (force, fastest). At least half of the guarded spaces also have a
   secret route that rewards exploring (a crawlspace, a shaft, a back room). No route is strictly best: each trades
   speed, risk and reward. [Training] One route; split paths only in the later sections, as teaching (G292). A late
   section that trains against enemies may keep a side route; it then follows the campaign route rules (Michael
   2026-10-25 ~16:50; Training profile).
3. **Rejoin at a pinch point.** All routes through a space rejoin at its exit before the next space. No route skips a
   space. [Campaign] [SectorOps] Between entry and exit the routes cross at least once: they share a room or junction
   where a player can switch route (checked per section). (G284.)
4. **Loops, not dead ends.** Every guarded space has at least one loop on its shadow route (around a blocker, through
   two doors of the same room) so a seen player can break line of sight and re-hide. A dead end on a stealth route is a
   design fault. From any point of a stealth route, line of sight can be broken within `los_break_max_s` (`los_break_s`
   per encounter space, measured in greybox on the nav grid). (G284.)
5. **Stepping stones.** Along shadow routes, darkness, cover or a hide spot at the stepping-stone spacing (scale sheet
   section 5). Open lit ground is a deliberate crossing that needs timing, a light out or a tool.
6. **Height is safety and information.** Guards see poorly above them (G44): the high route gives overwatch and
   takedowns from above in exchange for time and skill. [Campaign] [SectorOps] Some high routes (pipes, catwalks, vents)
   have a static lookout posted on them, so height is not always safe (G335, "Add both"); a vent lookout stands where he
   overlooks the vent run or its exit (G378).
7. **Sightline control.** Long open sightlines are dangerous and used on purpose. Corners, doorways and occluders are
   the decision points between them.
8. **Quiet connectors.** Between encounter spaces: a stair, corridor, cupboard or shaft with no guard, where the player
   breathes and glimpses the next space (glass, a light under a door, voices beyond a wall).
9. **A checkpoint before every encounter space.** Each encounter space has an encounter checkpoint at its entry (the end
   of the connector before it), on a floor, in the dark, out of every guard's view; a team that is out (9.4) restarts
   at the last checkpoint it reached. The first of these in a section is the section checkpoint: a broken strict rule
   restarts the section there (9.3). An objective at the end of a space is placed the same way. [Training] Out of
   every guard's view; dark only once a drill has cut the light.
10. **Designed exit.** [Campaign] Both players must reach the exit to finish (G138). The run from the last objective to
   the exit takes under 2 minutes, or takes a different route for at least half of the way back (G157).

## 4. Guards [All]
1. **Jobs, not lines.** Every guard does something someone would really do there at that hour (rounds, gauge
   reading, a post, a smoke break, loading a van). The job sets the route, the stops and where he looks. Every guard
   has an employer and a reason to be at each stop; no guard stands somewhere nobody would.
2. **Mix patrol types** across a level: static post, sentry sweeping a view, loop, back-and-forth, talking pair, paired
   patrol, lookout on a high route, investigator. No two adjacent spaces use the same mix.
3. **Clockwork.** Patrol cycles, stops and gaps in coverage follow scale sheet section 10. No randomness that defeats
   planning.
4. **Isolation moment.** Every guard is alone, in the dark and unwatched at some point in his cycle; the guard sheet
   names the spot and the time. Exception: a paired patrol whose two guards check on each other (G335, "Add both";
   replaces G11's cut for this) is split by a distraction or taken together with a synced takedown (two ordinary
   takedowns timed together; no dedicated dual move, G180); the guard sheet names that spot instead. [SectorOps]
   Patrols sit in separate pockets, each with a takedown spot out of the other guards' sight; the count drops before
   the spacing does (G190).
5. **Overlapping coverage.** In every space with two or more guards (or a guard watching into a neighbouring space), at
   least one guard covers another for part of his cycle, so the player must choose who goes first.
6. **Lure destinations.** Every lure (a light switched off, a lamp shot, a noise) sends the guard somewhere the player
   can use: under an anchor, into a dark grab spot, away from a crossing.
7. **Bodies matter.** Each space has a hide spot near its takedown spots and at least one patrol that would find a body
   left in the open.
8. **Survivable searches.** Every place a player can be spotted on a stealth route has a hide spot or a dark escape
   within the guards' search area.
9. **Guard counts.** As many guards as realistically possible (Michael 2026-10-24 ~22:00, G289): each space gets the
   guards a real site would post (entries, posts, patrols, response), pushed high for challenge, bounded by the mode's
   alive ceiling (12.1) and by every route staying passable. The per-space bands `guards_early` / `guards_late` (first
   or second half of the spine) are a floor, not a ceiling: below the band warns, there is no upper band. The graph
   records the count per player count.
   - [Campaign] At most `sector_alive_max` (32) alive per section, a ceiling, not a target (G359). Each mission spawns
     only its own sections and guards (its guard list, mission-framework EN4, not on master yet).
   - [SectorOps] Counts rise with the player count ("Keep scaling", G331); `sector_alive_max` alive per section is a
     ceiling, not a target (G187, G332); room to manoeuvre comes before count (G190). Signed-off counts: S1 15, S2 18,
     S3 20, S4 25, S5 26 (G328), for two players (G362). One player uses the same counts, with no scale-down; three or
     four players add the guards tagged for them, inside the ceiling (S5: alarm reinforcements fill what is left, G375).
     The Sector Ops job writes them per player count in the graphs.
   - [Training] The "as many as realistically possible" lead above does not bind: a set has only the guards its
     exercise needs, sometimes none (G376), and spawns at most `SET_GUARDS_MAX` 3 (12.1); the bands do not bind.
10. **Archetypes per mode.** [Campaign] No heavies or dogs (G155); armour comes with the alarm stages; alarm teams carry
   no riot shields (G377). [SectorOps] Dogs (G297): killing one counts as a kill (no Perfect) and costs score (G374);
   gas knocks one out; no takedown; a dog can be distracted (G348). Riot shields only in alarm response teams; heavier
   armour in later sections (G307). [Campaign] [SectorOps] Helmets by difficulty: bible 5.6 (G350). [Training] Normal
   guards (G279).
11. **Security devices have reasons.** Every camera, laser, keypad and alarm panel protects something named and sits
   where a real site would put one: "why would they be there in that location, what are they protecting" (G295). Each
   has a row in the map's security register (13). Devices are placed like real ones: door contacts on doors, motion
   sensors high in room corners, beams mostly outdoors, cameras with real ranges and real blind spots (glare,
   back-light, deep shadow). Every weak spot in the security that the players use has a story reason (renovation work,
   a broken camera waiting for repair, a contractor's shortcut, a staff habit) (G157). [SectorOps] Security grows
   section by section: cameras, lasers, alarm panels and keypads, then dogs and armed response (G297); later sections
   bring bulletproof cameras (shots only ricochet: jam, cut the power or slip the sweep), armoured routes with a quiet
   bypass, and thermal or night-vision cameras (G307 (1), (10), (14)). An alarm stage adds armour, helmets and a
   response team, never cameras (G307 (4)).
12. **Unavoidable guards.** [SectorOps] Some sections have at least one guard the players cannot go round on the way to
   the objective or exit: he must be distracted, knocked out or killed (G303). The graph tags his space `unavoidable`.

## 5. Light and sound [All]
1. **Every lit pool has a visible source** (a lamp, a tube, a floodlight, moonlight through a window) with an owner and
   a real fitting, and a switch where a real one would be, by a door. An unswitchable lamp has a real reason (a
   photocell, an emergency circuit, a vandal cage). Every fitting works and is on: no dead, failed or switched-off light
   makes a dark pocket, on any map and in any mode (G367, "Never"). Darkness comes only from cover (the real gaps
   between and behind things), cut power and shot lamps.
2. **Every lit chokepoint** can be avoided at least one way and has two ways to darken it, or [Campaign] [SectorOps]
   hardened with a route around (G333). The ways to darken: a switch, a breaker, shooting the fixture, the held pistol
   jammer (G152). Hardened means an un-shootable fixture or a guarded or locked breaker.
3. **Sound comes from materials.** Loud floors (metal, grating, chequer plate, gravel, glass) and quiet floors (carpet,
   linoleum) come from the room's real finish, are placed on purpose, look different, and put a quiet and a loud
   version of the same action side by side (an open window beside a glazed one, a door opened or bashed, a vent
   unscrewed or kicked, a hang-and-drop or a jump down).
4. **Readable at a glance on desktop at the Low preset:** lit and dark areas match the light meter.
5. **Real light levels.** Each space is lit to the real-world illuminance band of its space type (scale sheet section 9:
   AS/NZS 1158.3.1 car parks and roads, AS/NZS 1680 interiors, EN 12464 where they are silent; values set by the
   light-realism job after one lux calibration, the table approved by Michael with the S1 car-park light map, G368),
   with engine light calibrated to lux once and measured from the bake at greybox exit. Stealth comes from real gaps
   (between poles, under carports, behind cars, cut circuits, shot lamps), never from leaving lit places unlit or a
   light dead or switched off (G329, "Real-world levels"; G367). Until the bands have values, light each space like a
   real site of that type at night (scale sheet section 9, interim rule). The floor shadow share (`shadow_pct`,
   `shadow_min_frac` - `shadow_max_frac`) is reported for information only; the band wins. [Training] Lit by default,
   the players cut it (G279); this is never the fallback for the campaign or Sector Ops.
6. **Readable machines, windows and weather.** A machine shows whether it is on or off by look and by sound, with a
   visible link to its switch (a cable run, a conduit, a labelled panel). A lit window exposes anyone in it, seen from
   either side; a dark room hides (G144). Weather only where the map has weather: there it changes light and sound;
   a map without weather needs none (G157).

## 6. Pacing [All]
1. **Teach, test, twist.** One new mechanic per space: introduce it safely, test it alone, then combine it with earlier
   ones. The level ends in a set piece that uses everything. [Campaign] The players see the final area from a distance
   before they reach it (G157).
2. **Tension and release.** Tension rises across the level; every peak is followed by a release. The beat chart (section
   13) proves it. In spine order, no three spaces in a row sit at tension 4-5, the map opens at 1-2, and a 1-2 follows
   every peak (validator `checkPacing` on the graph's `tension`). (G284.) [Campaign] Pacing in minutes, as playtest
   targets for an average pair, not validator errors: a small teamwork moment every 2-4 min, a big one every 6-10 min,
   30-90 s of calm after each big one, 1-2 signature moments never repeated within the mission, and one objective twist
   (the objective changes; not 6.1's twist of a mechanic) 40-60% of the way through (G157).
3. **The player sets the pace.** [Campaign] [SectorOps] No forced timers in stealth. Pressure comes from guards, light
   and noise. Soft windows only: predictable windows (shift changes, fixed patrol cycles) signposted in the world; no
   countdown that closes a route (G334, "Soft windows only"). [Training] Timed drills are allowed: "Marlow can use timed
   drills, it must force players into situations as a way of training them" (G342). Each drill's limit is in the
   graph (`drill_s` on its space) and the objective plan (13), tuned in playtest (G10). A failed drill retries the
   drill only: the drill resets in place, with no checkpoint reload (G361).
4. **Guide without markers.** [Campaign] [SectorOps] Objectives name what and where; the level flows naturally to each
   objective ("Objectives must name what and where, but no map, level design must flow naturally towards each
   objective", G336): landmarks visible from afar, light leading the eye towards the way on, signs and place names,
   sightlines into the next space. The objective is a short, plain English line; it fades in and out in game, shows
   on every update, and a tap on View (Select) on the pad or O on the keyboard shows it for about 5 s
   (G343). No markers or waypoints (G290); no maps, minimap, compass or objective blip in any mode (G336,
   G339); an optional hint layer, off by default (G290). Two-minute test: at every blocked route (a locked door, a gap,
   a guarded crossing) the players can see or work out a way past from where they stand within about 2 minutes, a
   playtest target (G157). [Training] Marlow Yard keeps its guidance marks and the
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
4. Harmless noises (a fan, a dripping pipe, a settling roof) are clearly harmless: they sound and look unlike a threat
   (G157).

## 9. Failure [All]
1. Detection escalates step by step and line of sight can be broken.
2. Failure is a new situation, not a reload: running, hiding and fighting are all real options after a detection.
3. **Strict rules.** A mission has up to 2 strict rules, signposted in the briefing and the objective list; "ghost"
   counts as one. Breaking one restarts the section: the team goes back to the section checkpoint (3.9) and the mission
   continues (G290). Killing a civilian or a protected character restarts the section too (G353). [SectorOps] A rule may
   be global, per team or per split (G291). [Training] None: every failure is a retry (G370).
4. **Downed.** [Campaign] [Training] The partner revives a downed player within 30 s, at most twice per mission; past
   that, or with both down, the team restarts at the last checkpoint it reached (3.9; `REVIVE_WINDOW`,
   `REVIVES_PER_MISSION`, `src/game/reviveClock.ts`; G126; Marlow Yard: G349).
   [SectorOps] No lives: a partner revives with a revive syringe, counted per op by difficulty (`SECTOR.syringes`,
   `src/game/sectors.ts:510`) and growing with the player count (G331); both down, or solo, restarts at the section
   checkpoint (3.9, G188); a downed player nobody revives within 30 s dies and waits out of play until the team
   reaches the next section door, where he comes back (G385).

## 10. Exploration and reward [All]
1. Secret routes, alternate takedowns from anchors and shortcuts reward curiosity.
2. Environmental storytelling: props show who works there and what happened (dressing only).
3. Sightlines and glass let a player plan the next space early.

## 11. Co-op layering
The authority for co-op flow is the CT co-op research (G3, G117; `docs/ct-research/levels-digest.md` section 3). Each
rule names the check of `scripts/level-validate.mjs` that tests it on the map's connectivity graph (section 13); sizes,
speeds and times come from `docs/design/metrics.json`, generated from the scale sheet. Times and reach are targets
declared in the graph before geometry and measured in greybox: a map whose measured value misses its target fails.
1. **Player counts.** [Campaign] Two players, always: completable by two and by no fewer (G2, G50, G253; 11.10,
   11.11). [SectorOps] 1-4 players (coop4 #317, G308); solo play works past every team door (G280). [Training] Two
   players (G308). The graph lists the counts in `meta.players`. Check: `checkStructure` (counts), `checkReach` (every
   space, objective and exfil reached).
2. **Linear spine between sections, loops inside them.** [All] A map is a chain of sections in order (CT missions are
   one continuous level, `levels-digest.md`). Every path from insertion to exfil passes every section in order, and two
   sections join by one spine connector. No route skips a section. Check: `checkSpine`. [Campaign] [SectorOps] Inside a
   section, at least 2 independent (edge-disjoint) routes join its entry to its exit, so the pair can split up, loop
   and re-hide (3.3, 3.4). Check: `checkRedundancy`. [Training] One route (G292), except a late section that trains
   against enemies and keeps a side route: it follows the campaign route rules (Michael 2026-10-25 ~16:50; Training
   profile).
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
   leg within `reach_max_s` at `reach_speed_mps` (the jog, G40; G284 (4)). The revive window is 30 s (9.4; the revive
   itself takes 2.5 s), so the reach leaves time to clear the room first (constant: the reviver within 1.5 m of
   height). Check: `checkCoop`.
   [Campaign] Gate reach: every forced co-op gate (11.10) has a solo way back (a drop, a ladder kicked down, a door that
   stays open), so a partner downed on either side of it is reached within `reach_max_s` (G284 (4): a downed partner
   reachable within 15 s). Check: `checkReach` (gate reach).
   [SectorOps] No softlock: every surface a co-op route reaches is also reached by another route without a co-op move,
   so a downed or solo player is never stranded (G280). Check: `checkReach` (no softlock).
7. **Room for two.** [All] A shared route (both partners moving through together) is at least `shared_min_w_m` wide;
   corridors stay in `sizes.corridor_w`. Check: `checkCoop` (`shared` links), `checkDimensions` (corridors).
8. **Co-op reach.** [All] A co-op lip is above the highest one-player reach from its floor (constant:
   `WALL_JUMP.maxUp` 3.8) and within the co-op reach (constant: `TEAM.boostMax` 4.5): build in `sizes.coop_lip` (G57:
   one band for the boost and the human ladder). Co-op routes are ordinary architecture with a real reason one player
   cannot use them (a fire-escape ladder pulled up, a high hatch, a shutter that needs holding, a door bolted on the far
   side; section 2). A locked door with no way to open it is a wall (2.6), not a gate. Unplanned boost targets: every
   lip and pipe between one-player reach and co-op reach above its floor is a planned co-op route, sits on a surface
   reached without a co-op move, or has its ledge removed. Team moves work anywhere with room (G151), so every such lip
   is a real boost target. Check: `checkDimensions`, the co-op lip unit test (15).
9. **Co-op kit and coverage.** [All] The co-op traversal kit (G293): boost up a wall, throw over a gap, human ladder /
   pull-up, hold a shutter or door, rope brace / descent (CT's two-person rope, G180), vent unlock for the partner, plus
   new creative moves (Michael: "Any other creative coop ideas"): Deadweight, Drop Catch, Chimney Pair, Swing Pass and
   Plank Bridge (G403; bible 5.9 C4); and the synced takedown (4.4). A move the game does
   not have yet is built by its co-op job before a map relies on it. Graph kinds: `coop_boost` (boost), `human_ladder`
   (human ladder), `team_pull` (pull-up), `team_hang` (hang-down relay), `team_throw` (throw over a gap), `shutter`
   (hold a shutter or door), `pair_gate` (team door), `vent_unlock` (the door a crawler opens from the far side after a
   vent, Q25), a `bolted` door (unlocked from the far side after a throw), `team_rope` (rope). Each kit move's size
   band is in scale sheet section 3. Co-op routes are in at least half of the encounter spaces and in every section.
   Check: `checkCoop` (coverage), `checkDimensions` (bands). [Training] The coverage check does not bind: each exercise
   forces the move it teaches (G392).
10. **A forced co-op gate per section.** [Campaign] Every section forces a co-op traversal move with no solo bypass:
   the section's exit cannot be reached from its entry by solo links alone (Michael 2026-10-24 ~22:45: "must have forced
   coop traversal to proceed", G292). Each gate keeps its way back (11.6). Check: `checkRedundancy` (forced gate).
   [SectorOps] Team doors stay two-player, with a solo route past them (G280). [Training] Each exercise teaches its move
   in place; not checked.
11. **Teamwork minimums.** [Campaign] Each mission sets a minimum count for each kind of teamwork and meets it: a door
   or shutter held, a boost or climb, one partner covering the other, and a split that ends in a joint action at its
   merge point. The map spec sizes each minimum to the map (G157). Splits keep the stricter `split_max_s` limit of
   11.3. Nobody waits more than 60 s for the partner, and the players swap roles: neither is always the one who boosts
   or holds. Joint actions are forgiving (a timing window, not a frame), work with pings alone (G135), and a failed one
   raises the alarm, never kills. Check: design doc (co-op plan).

## 12. Engine constraints (re-confirm per map) [All]
State on 2026-10-25. Every number is a starting value tuned after the CT prototype (DECISIONS G10). Tuning tables
never change for a map; change the geometry.

### 12.1 Facts in the code now
- Nav: 3 walkable surfaces per column by default (`DEFAULT_NAV_LAYERS` in `src/ai/navBuild.ts`); a map raises it with
  `MapDef.navLayers` (campus: 5). The nav sampler casts down to y -2 only, so a surface below about -1.5 m (a
  basement, a tunnel) is not on the guards' grid. Stairs and ramps join storeys by height. Guards walk surfaces whose
  normal y > 0.65 (about 49 deg); the player walks up to 50 deg: keep designed slopes at 45 deg or less.
- Guard caps per mode: Sector Ops allows `SECTOR.maxAlive` 32 alive (`src/game/sectors.ts:508`, G187), and so does the
  campaign, which runs on the Sector Ops runtime (mission-framework A6 and EN4, on its branch, not on master yet).
  Course mode spawns one set's squad at a time, at most `SET_GUARDS_MAX` 3 per set
  (`src/world/maps/ctcourseSets/types.ts:191`). Every other mode keeps `MAX_ALIVE` 12 (`src/ai/enemyManager.ts:83`);
  the parked Infiltration and Hunter modes spawn `SQUAD_CAP` 9 at a time (`src/game/modes/infiltrationMode.ts:14`,
  `clearMode.ts:12`). The guard-cap job looks for ways past the caps (G254).
- Guard sight: full up to 22 deg above the eye line, easing to a floor of 0.15 by 48 deg, so a player well above a
  guard is seen slowly, never at once (G44; `pitchFactor`, `src/ai/perception.ts:56-64`).
- Split gaps are found automatically from any two facing faces >= 3.6 m tall and 1.2-1.95 m apart: no accidental ones.
- Box tops >= 1.9 m become hangable lips automatically: remove unwanted ones with `noLedge` / `mark`.
- `ambientZone` covers y -1..8 by default: set `minY` / `maxY` per storey.
- Reach: solo wall-jump reach `WALL_JUMP.maxUp` 3.8 m; co-op boost `TEAM.boostMax` 4.5 m; human ladder grab
  `TEAM.ladderGrab` 4.1 m (all in `src/config/movement.ts`). The other kit moves' bands: scale sheet section 3.
- Speeds and footstep noise: five speeds per stance on the stick (creep, sneak, walk, jog, run; no sprint), values in
  scale sheet section 1. Footsteps are silent on every surface at the crouched creep, sneak and walk and the standing
  creep and sneak (`NOISE_QUIET`, `src/config/movement.ts:273-276`); the surface only scales audible steps.
- Doors: a door blocks light until it is open past `DOOR_SHUT` 0.15 of its swing (`src/world/lightField.ts:34`, G41);
  the peek crack and a stick-driven door under `DOOR.driveShut` 0.15 keep the swing at 0, shut to light, sound and
  sight; an ordinary open drops the door's body at once, so guard sight and sound pass from its start (Guard AI, J15).
  Guards push doors open as they walk through
  (`Doors.pushOpen`), and a door a guard opened shuts behind him (`DOOR.autoCloseTime`, `src/world/doors.ts:42`). The
  door menu (`src/game/doorMenu.ts`) offers open, stealth open, bash (loud; knocks out a guard right behind the leaf)
  and the optic cable.
- A hold can make noise per object (`Interactable.holdNoise`, pulses every 0.5 s; no current map sets one; the cast-iron
  manhole constant `MANHOLE_LIFT_NOISE_RADIUS` is 10 m). Hearing (guard-ai S1, `ai/hearing.ts`): a wall cuts a noise's
  reach to 0.45 and a noisy thing near the guard masks it (6 dB halves, 12 dB quarters); every guard inside the
  effective reach turns to look, and one guard per noise, the nearest inside half of it, walks over. Loud gunfire is
  combat only inside a quarter of its effective reach (28 m in the open -> ~7 m); farther, one guard is sent to look.
- Health comes back only at wall medkit stations (`MapDef.medkitWalls`: hold 0.6 s, +40, single use); there are no
  carried medkits and no medkit crates. Health does not regenerate.
- The camera is the CT camera (scale sheet section 1). Corridor widths, bend lengths and the 1.5 m crouch height in
  16.7.3 and scale sheet section 2 were measured on the old shoulder camera; they stand until re-measured (G54).

### 12.2 Decided, not built yet
The design bible holds Michael's decided rules (`docs/design-bible.md` section 5): design new maps against them and
re-confirm against the code when they land. Those that change a floor plan now:
- Doors (G41): light, sound and sight pass past about 15% open (the code: light at 15%; on an ordinary open sight and sound pass from its start, 12.1); guards notice a door open that
  should be shut.
- Corridor widths, crawl heights and aisles are re-measured on the CT camera before new floor plans (G54).
- The human ladder reaches 4.5 m (G57; the code: 4.1 m, open item 1).
- A medkit station in every map (G98).

### 12.3 Map decisions that relied on changed facts
A job that changes a 12.1 fact lists here the map decisions that relied on the old fact; once a map's job re-checks
one, it leaves this list.
- Hearing (guard-ai S1): one guard walks over per noise and loud gunfire is combat only close in (a quarter of its
  reach). Map decisions that relied on "a loud shot alerts every guard within 28 m": the Sector Ops suppressed-shot spot
  check (`e2e-sectorops`, its control now fires from beside the guard). No map spec relies on everyone walking over.
- Kestrel (paused, G53) and the Fallow bunker (parked) rely on the old speeds, camera and moves; they are re-checked if
  they resume (`docs/kestrel/00-facts.md`, `docs/archive/maps/`).
- Doors (sector-batch, G41): the light cut `DOOR_SHUT` went from 0.05 to 0.15 of the swing (12.1). Map decisions that
  relied on 0.05: none.

## 13. Required design deliverables (templates) [All]
This section owns the per-map deliverables (the design bible points here). Phases 1 and 2 of every map produce them in
the map's own docs folder (one folder per map, G55; for example `docs/sector-redesign/` for the campus,
`docs/ct-prototype/` for Marlow Yard): `<map>-design.md` and `plans/*.svg`. Each item is [All] unless tagged.

**Map spec** (Phase 0): the map's spec, started from `docs/templates/map-spec.md` and saved verbatim; it names the
map's mode, and may tighten this standard but loosens it only with Michael's written approval.

**Connectivity graph** (first, before any geometry and before the floor plans; G284). One JSON file per map,
`<map>.graph.json` (it may be split one file per section), in the format of `docs/level-validator/graph-schema.md`:
`meta.mode`, every space (section, type, room class, function, size, tension, and for encounter spaces the targets:
vantage view, line-of-sight break, guards per player count) and every link (kind, route, width, height, length or
time, reason). Phase 1 writes the spaces and links with the building brief; Phase 2 adds the routes, splits, overwatch
spots, assists, gates and targets. It passes `node scripts/level-validate.mjs <graph files>` (every size from
`docs/design/metrics.json`) before Phase 3 (section 14). A map split into files is always validated whole: every
file, first section first (campus: S1 to S5 in order).

**Building brief.** Purpose, era, location and site, who works there and when, why it is quiet tonight, construction
(structural grid, wall thicknesses, storey heights, windows, materials), every room with its original purpose, size and
present-day contents, vertical circulation, services (how people, goods, cables, air, water moved), palette and
lighting character (the space types and their light bands, 5.5).

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
| Chain | [Campaign] Whether this step needs both players and what each one does; what it reveals or unlocks for the next step, so the rows read as the objective chain (G157) |
| Rules | The mission's strict rules (9.3) and where each is signposted |
| Windows and drills | Any soft window it uses (6.3) and how the world signposts it; [Training] a timed drill: its limit (`drill_s`) and what it trains |

**Light plan** (one per space): every lamp with its fitting and owner (5.1), its switch or circuit group, the space
type and its light band (5.5), the dark pockets the real gaps make (between poles, under carports, behind cars), and
which route each light change opens or closes (a switch, a breaker, a shot lamp, the jammer; hardened chokepoints and
the route around them, 5.2). [Training] Lit by default, the drills cut it (G279).

**Sound plan** (one per space): ambient zones (`ambientZone` per storey, 12.1) and what masks a noise there, loud and
quiet floors with their real finish (5.3), and where a quiet and a loud version of the same action sit side by side.

**Security register** (one row per device): id, device (camera, laser, keypad, alarm panel), what it protects, why a
real site has it there (4.11), its power or circuit, how it is beaten (jam, cut the power, slip the sweep, hack, a
code), its section. [Campaign] [SectorOps] On top, a site security summary: how secure the site is and why, its layers
from the fence to the target, who can open what, the steps that need two people, the weak spots and their story
reasons (4.11), and the alarm chain (who is called and how long they take) (G157). [SectorOps] Which step of the
section-by-section rise each device is (4.11).

**Checkpoint plan**: the encounter checkpoint before each encounter space and the section checkpoint (3.9), so replay
loss is about 10 minutes at most (G126). [SectorOps] Revive syringes per difficulty and player count (9.4), and one
ammo crate per section at its start or checkpoint, usable once per player and looking like a weapons crate
(G307 (7)).

**Co-op plan** (one per space): the co-op routes and their graph kinds (11.9), splits with their legs, overwatch and
assist (11.3-11.5), the downed-partner reach (11.6) and the synced-takedown pairs (4.4). [Campaign] Each section's
forced co-op gate and its way back (11.10, 11.6); the teamwork minimums and where each is met (11.11); per team move,
the pings and warnings the players use (who pings what, what the world shows before they commit; G135, G157).
[SectorOps] The solo route past each team door (G280) and how a team
of 1-4 splits the objectives. [Training] The move each exercise teaches and its drill.

**Medkit and civilian plan**: the wall medkit stations (G98; where each is and why a real one is there) and every
civilian (who works there at night, where, and why), with what a civilian sees and does. Killing a civilian or a
protected character restarts the section (9.3). [Campaign] Mission 1 has no civilians: its named people are protected
and everyone else is an armed guard (G373).

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
| Job | What he is doing there tonight, and for which employer |
| Route | Points (x, z, y), stop at each (seconds, facing), cycle time |
| Gaps | Coverage gaps the player can use (time, place) |
| Isolation moment | Where and when he is alone, dark and unwatched (or, for a paired patrol, where the pair is split) |
| Covered by / covers | Overlaps with other guards |
| Lures | What draws him, where it sends him |
| Search | Where he searches when suspicious; the nearest hide spots |

**Beat chart**: one row per space and connector: tension 1-5, mechanic taught, mechanics combined, release, the feeling
(tension rises overall, a release after every peak, the set piece last). [Campaign] Each row also gives its minute
for an average pair, against the pacing targets (6.2), and the chart marks the objective twist, the 1-2 signature
moments and three wow moments: a two-person move, a moment of timing together, a story reveal. Each wow moment passes
five tests: a watcher understands it; the players trigger it and it can fail; both have a job; the danger reads before
they commit; it can be retold in one sentence (G157).

**Coverage table**: every movement and stealth verb the game has (from `docs/systems/input-and-loop.md` and the CT
research) against where it is used: taught / tested / combined, or "not used" with the reason.

**Tool / problem matrix**: rows = problems (a lit post, a pair, a patrol over a crossing, a locked route, a loud floor),
columns = tools (darkness, light switch, shoot light, lure, takedown kinds, anchors, gadgets, co-op): each problem has
at least three tools.

**Metrics check**: every traversal element and takedown spot against its constant window.

**Element register** (16.9).

**Self-critique**: as lead designer, the 10 weakest points (flow breaks, a dominant route, a guard job that makes no
sense, a dead end, a space without toys, an element that fails "why is it here", an unfair detection) and the fix for
each.

**Playtest checklist** (for Michael's walks and the e2e):
- Can a first-time player read every patrol from the vantage within one cycle?
- Is any route strictly best?
- Is there a detection the player cannot escape?
- Did the player understand every detection?
- Did the players find every objective from its text and the level alone?
- At every blocked route, did the players see or work out a way past within about 2 minutes (6.4)?
- [Campaign] Did the pacing meet its minute targets (6.2), and did either partner wait more than 60 s (11.11)?
- Was every toy used at least once across sessions?
- Did the level feel like the building it claims to be?

## 14. Standard phases and gates [All]
This section owns the phases; the map spec template refers to it. Phases run back to back under the job's lead (G87).
Michael's gates are one-click: before greybox or art on a map he approves a one-page to-scale plan and a 5-line intent
check (G288 (4)), and after the release he walks the 10-minute walk card. [Campaign] The campaign map (Tallow Wharf)
may be greyboxed before that sign-off; the sign-off page is still made (G293).

G157: Michael adopted the 12 changes the design-kit research proposed (`docs/ct-research/design-kit-digest.md`,
appendix; 2026-10-25 ~18:20); they are written into the rules they belong to, and he confirms them on his Tallow
Wharf walk.
0. **Setup and investigation**: branch, save the spec verbatim, progress log, confirm every referenced fact by grep,
   answer the spec's engine questions. No gameplay changes.
1. **Architectural design** (docs only): building brief, floor plans, element register.
2. **Gameplay design** (docs only): objective and lead plan, space sheets, guard sheets, security register, gameplay
   overlays, beat chart, coverage table, tool / problem matrix, metrics check, self-critique, the review checklist
   (16.10). The approved docs are the build contract.
   **Validator gate** (G284): Phase 2 ends with the map's connectivity graph (13) passing
   `node scripts/level-validate.mjs` with 0 errors, every warning justified in the design doc, the output saved with
   the design docs, and the one-click sign-off. No map enters Phase 3 (greybox) without both. A map already greyboxed
   runs it as an audit; the campus (Sector Ops) is its first run.
3. **Build** (one storey or area per phase, no guards): geometry, anchors, lights, zones, surfaces, doors, windows, hide
   spots; `scripts/plan-svg.mjs` renders the built level to compare with the approved plans.
   **Greybox exit gate**: (1) a measured validator pass: `node scripts/level-measure.mjs <graph files> --write`, then
   `node scripts/level-validate.mjs --require-measured <graph files>` with 0 errors (graph-schema "Schema additions";
   G289 (2), "Yes, require it"); (2) bot route-runs: a scripted run walks every declared
   route (shadow, high, loud) against live guards, logging time, detections and dead stops (the route-runs job, Marlow
   Build; G330, "Bot route-runs + your walk"). A map passes its route-runs when no run has a dead stop; the times the
   robots were seen go on the walk card (G372; Michael, 2026-10-25 ~16:40, Q7, "Never stuck"). What a dead stop is:
   `docs/systems/route-runs.md`. (3) A 10-minute walk card for Michael.
4. **Guards and mission**.
5. **Dressing, readability and verification**.

## 15. Acceptance tests every map has [All]
- The map's connectivity graph passes the validator (`node scripts/level-validate.mjs`, 0 errors, warnings justified)
  and matches the built map. (G284.)
- Greybox measurements meet the graph's targets: vantage view (3.1), line-of-sight break (3.4), downed-partner reach
  (11.6) and split leg times (11.3), measured from the light bake and the nav grid by `scripts/level-measure.mjs` and
  checked under `--require-measured` (14); the shadow share is information only (G329). The light band (5.5) is
  measured when the lux band check lands (light-realism J10). A measured value that misses its target fails the map.
- A map passes its route-runs when no run has a dead stop (14); what a dead stop is: `docs/systems/route-runs.md`.
- Every planned traversal element engages from its planned approach (pad).
- `e2e-anchors.mjs` covers the map.
- The split gaps on the map are exactly the planned ones.
- The nav path from insertion to extract passes the spaces in order; no path skips a space.
- Darkness: at each vantage and planned dark pocket a crouched still player stays under suspicious for a full patrol
  cycle; in each planned lit pool on a route he is noticed; switching the circuit off makes it safe and lures the guard.
  [Training] Run after the drill has cut the light.
- Noise: each planned loud floor draws the planned guard above a silent speed and not at a silent one.
- Patrols: every route point is on the nav grid, cycles are within scale sheet section 10, every guard covers his route.
- Every guard the mode spawns at the start is alive (12.1); a ghost run succeeds and earns every section-rating bonus
  (G307 (5)); a body left on a route is found. [Campaign] The ghost run is two players who both reach the exit unseen
  (G138, G157).
- Co-op: each co-op route works for host and client; each co-op lip is out of solo reach (unit test); a player downed on
  each co-op surface is revived. [Campaign] Each section's forced gate cannot be passed solo, and the revive on each
  team-move surface fits inside the revive window (9.4, G157). [SectorOps] Solo play completes past every team door.
- [Campaign] [SectorOps] Partner beacons: each player's goggle-light colour (G135) is told apart from the others' at
  about 20 m at the map's darkest real spot: the darkest place on a route with every light on as built, since no map
  leaves lights dead or off to make darkness (G157).
- Perf budgets from `docs/systems/performance.md` on desktop.

## 16. Level logic rules [All]
Michael's rules for the building itself (2026-10-10). They apply section 2 to circulation, openings, objects, roofs,
rooms, ducts and light. Rule ids are 16.N.M; references to other sections of this standard are plain section numbers.
Ids whose rule now lives in an earlier section stay as pointers, so citations hold.

### 16.0 Rule zero
Architecture first, gameplay second: 2.1. The reason test (a one-line real-world reason per element): 2.2, recorded in
the element register (16.9).

### 16.1 Program before plan
16.1.1 The building brief (13) comes first, in Phase 1 (14): what the site is, who built it, who works there and when,
what each building does, every room with its function and size, circulation, services, and why it is quiet tonight.
Gameplay design (Phase 2) starts from it; Michael approves the plan at the one-click gate before greybox (14).
16.1.2 Room sizes, storey heights, stair and door sizes follow the era and building type and
`docs/design/scale-sheet.md`. Gameplay widths may be larger than code minimums, never smaller.
16.1.3 A building has a structural grid. Walls, columns and cores sit on it.

### 16.2 Vertical circulation
16.2.1 People move between storeys only by **stair cores** (main stairs), **enclosed fire stairs**, or **fixed ladders
inside plant spaces and service shafts** (plant rooms, lift motor rooms, risers, boiler platforms, manholes). Nothing
else joins two floors.
16.2.2 **Never a ladder beside a stair** that serves the same two levels.
16.2.3 **No ladder in a hole in an occupied floor.** A ladder opening exists only inside a plant space or shaft, with a
cover or a guard rail.
16.2.4 **Every stair is complete:** real riser and going, handrails, a balustrade on every open side, and no gap between
the stair, the landing, the floor edge or the wall. Enclosed stairs have full-height walls.
16.2.5 **Roof access on a secure building is a covered stair bulkhead or a fire stair**, at a core or near a building
corner. Never an exterior ladder in a random spot.
16.2.6 Exterior climbing (drainpipes, low roofs, walls) is player traversal, not circulation. It uses real elements of
the street or building and follows 2.5.
16.2.7 **Two separate staircases in every multi-storey building** (stair cores or enclosed fire stairs, 16.2.1), apart
from each other as real escape routes are (G157).

### 16.3 Openings, holes and barriers
16.3.1 Every door, window, hatch, grille, vent, gap and hole has a stated function: who uses it, when, and why it is
where it is.
16.3.2 **No hole in a floor or roof** except a real opening: a stair well (with a balustrade), a lift shaft
(enclosed), a service riser (enclosed, with access doors), a hatch (with a cover), a roof light or skylight (glazed), a
cowl or vent (with its duct).
16.3.3 **No barrier in front of a room, door or window** unless the object has a job at that spot and does not block
that door's or window's own function.
16.3.4 **A vent exists only as the end of a real duct system** that starts at a plant room or fan and serves a room. No
vent as a pure shortcut, no vent that goes nowhere.
16.3.5 Gates are real locks with an owner: 2.6.
16.3.6 **Escape exits open from inside** without a key (a push bar, a thumb turn), as real ones do (G157). Whether a
fire alarm unlocking electric doors is a player tool is a separate decision (open item 3); until it is made, no map
relies on it.

### 16.4 Objects and blocks
16.4.1 **No block without a named real object** (a skip, an A/C condenser, a transformer, a pallet of bricks, a parked
van), placed where that object is used, stored or delivered.
16.4.2 Objects keep real clearances: 1.0 m in front of electrical panels, doors and escape routes; nothing blocks a fire
exit.
16.4.3 **Roof objects are roof equipment:** A/C condensers on frames, lift motor rooms, water tanks, exhaust cowls,
aerials. Each has pipes or cables going somewhere.
16.4.4 Low cover comes from real objects of the right height (bins, cars, dock edges, bund walls), not from
free-standing boxes.

### 16.5 Roofs and floors
16.5.1 **Roofs are fully covered.** The only openings are real hatches, bulkhead doors, roof lights and cowls.
16.5.2 **Upper floors are fully enclosed:** every storey's slab is complete except stair wells, lift shafts and risers.
16.5.3 Roof edges where people work have a parapet or guard rail (1.1 m).

### 16.6 Rooms and paths
16.6.1 **Room shapes follow function and structure:** rectangles on the grid, corridors straight between cores. **No
zig-zag or serpentine partitions to lengthen or force a path.** A route is long because the functions it joins are far
apart.
16.6.2 **Every space has a purpose and a matching level of access.** Valuable rooms are locked, guarded or high; utility
rooms are plain. No space exists only to be there.
16.6.3 **No dead end that only works with an invented side entrance.** If a route dead-ends, either the room really has
a second door (and the brief says why) or the dead end is removed.
16.6.4 Circulation reads as a hierarchy: main corridors, service corridors, plant spaces. A player can guess where a
stair or a plant room will be.
16.6.5 **Signs are realistic:** exits, public rooms and routes are signed as a real site signs them; critical rooms in
a secure site are not (G157).

### 16.7 Underground and ducts
16.7.1 An underground or duct route exists only as a real system: cable tunnel, pipe subway, storm drain, cable trench,
builder's-work air duct, basement link. Its row in the brief states what it carries, who owns it, its size, its access
points and where it ends and why.
16.7.2 **Walk-in tunnels:** at least 2.1 m clear (2.4 m preferred). Guards can walk them (nav headroom 1.7 m), so the
brief says why they do or do not.
16.7.3 **Crouch ducts and trenches:** 1.5 m clear height, 1.2 m wide (scale sheet section 3). Guards cannot enter. The
player crouches and walks; no auto-crawl anchors unless Michael approves one.
16.7.4 Duct and tunnel ends are real: inspection doors, shafts with plant ladders, pit stairs, trench steps. Never a
grille that pops into a room as a shortcut. Supply grilles are real sizes and are look-through only.
16.7.5 Ducts are built inside walls, slabs or ceiling voids. A free-standing duct box under 1.8 m is an accidental
mantle; one over 1.9 m becomes a hangable lip (12.1). Neither is allowed unless planned.

### 16.8 Light, guards and sound need reasons too
16.8.1 Lamps (owner, real fitting, switch, a reason for an unswitchable one): 5.1.
16.8.2 Guards (employer, job, a reason for each stop): 4.1.
16.8.3 Floors (the room's real finish): 5.3.
16.8.4 Security devices (what each protects, why it is there, placed like real ones, a story reason for each weak
spot): 4.11.

### 16.9 The element register (required for every map)
One table in the map's design doc, one row per element:

| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |

Every route element (ladder, pipe, roof, duct, tunnel, hatch, opening, cover object, lamp) has a row. A missing row
fails review.

### 16.10 Review checklist (Michael's notes from a playtest)
Before any map leaves Phase 1 or Phase 2 (14), answer each with "none" or a list of fixes:

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
15. Any multi-storey building with one staircase, or an exit that does not open from inside? (16.2.7, 16.3.6)
16. Any sign a real site would not have, or any security weak spot without a story reason? (16.6.5, 4.11)

## Rule index
Metrics keys are in `docs/design/metrics.json` (`rules.*` unless marked `sizes.`); checks are in
`scripts/level-validate.mjs` and `scripts/level-checks/`, their severities in `docs/level-validator/graph-schema.md`.
"Design doc" = checked by review, not by the validator. Owner = the job that keeps the rule's number or check current.
The index lists the checked and owned rules; a rule not listed here still binds as tagged. For the G157 rules, "check
later" marks one a validator or e2e check could test once added; "review only" marks one only a reviewer or a playtest
can judge.

| Rule | Modes | Metrics key | Validator check | Owner |
| --- | --- | --- | --- | --- |
| Training profile: one route, forced sections | Training | - | `checkTraining` (`taught_by`, teach elements, side routes) | level validator |
| 3.1 Entry vantage; room for two | All; room for two: Campaign | `vantage_min_frac` | `checkEncounters`, `checkMeasured` (vantage); room for two: design doc (space sheets), check later | level validator (Marlow Build) |
| 3.2 Three routes plus a secret | Campaign, SectorOps | - | `checkEncounters` (approaches, secret share) | level validator |
| 3.3 Routes cross | Campaign, SectorOps | - | `checkEncounters` (routes cross) | level validator |
| 3.4 Loops, LOS break | All | `los_break_max_s`, `dead_end_max_m` | `checkEncounters` (dead ends, LOS target), `checkMeasured` (LOS break) | level validator |
| 3.5 Stepping stones | All | scale sheet 5 | design doc (space sheets) | map job |
| 3.6 Lookouts on high routes | Campaign, SectorOps | - | design doc (guard sheets) | Guard AI |
| 3.9 Checkpoints | All | - | design doc (checkpoint plan) | map job |
| 3.10 Designed exit | Campaign | - | design doc (objective plan), check later (exit run time or overlap from the graph) | map job |
| 4.3 Clockwork | All | scale sheet 10 | design doc, e2e patrols (15) | map job |
| 4.4 Isolation, paired patrols, pockets | All; pockets SectorOps | - | design doc (guard sheets) | Guard AI, map job |
| 4.9 Guard counts, alive ceiling | All (bands, ceiling: Campaign, SectorOps) | `guards_early`, `guards_late`, `sector_alive_max` | `checkEncounters` (bands, alive ceiling) | level validator, guard-cap |
| 4.10 Archetypes per mode | All | - | design doc | Guard AI |
| 4.11 Security devices, real placement, weak-spot reasons | All; site summary: Campaign, SectorOps | - | design doc (security register, site security summary), review only | map job |
| 4.12 Unavoidable guards | SectorOps | - | `checkEncounters` (unavoidable) | level validator |
| 5.2 Lit chokepoints | All; hardened: Campaign, SectorOps | - | design doc (space sheets) | map job |
| 5.5 Real light levels | All | scale sheet 9 (light-realism); `shadow_min_frac`, `shadow_max_frac` (INFO) | `checkEncounters` (shadow INFO), `checkMeasured` (shadow INFO); the light band: when the lux band check lands | light-realism (Sector Ops Build) |
| 5.6 Readable machines, lit windows, weather | All | - | design doc (light and sound plans), review only | map job |
| 6.1 Finale seen early | Campaign | - | design doc (beat chart), review only | map job |
| 6.2 Tension and release; minute targets | All; minutes: Campaign | - | `checkPacing`; minutes: design doc (beat chart), playtest, check later (from link times) | level validator |
| 6.3 Soft windows only; Marlow timed drills | Campaign, SectorOps; Training | - | `checkStructure` (`drill_s`); design doc (objective plan) | mission framework |
| 6.4 Guidance; two-minute test | All (Training keeps marks); two-minute test: Campaign, SectorOps | - | `checkPerfect` (`mark`: ERR, INFO on Training); design doc (objective and lead plan); two-minute test: playtest, review only | mission framework |
| 7.3 Play styles | All | - | `checkPerfect` (ghost and no-kill paths); design doc | map job |
| 8.4 Harmless noises | All | - | design doc (sound plan), playtest, review only | map job |
| 9.3 Strict rules | All | - | design doc (objective plan) | mission framework |
| 9.4 Downed | All | - | design doc (checkpoint plan) | mission framework |
| 11.1 Player counts | All | - | `checkStructure`, `checkReach` | level validator |
| 11.2 Spine; two routes per section | All; Campaign, SectorOps | - | `checkSpine`; `checkRedundancy` | level validator |
| 11.3 Splits | All | `split_max_s`, `split_parity_pct`, `split_speed_mps` | `checkCoop` (splits), `checkMeasured` (legs, reach) | level validator |
| 11.4 Assist | All | - | `checkCoop` (assist) | level validator |
| 11.5 Overwatch | All | - | `checkCoop` (overwatch) | level validator |
| 11.6 Downed partner | All; Campaign gate reach; SectorOps no softlock | `reach_max_s`, `reach_speed_mps` | `checkCoop` (reach), `checkReach`, `checkMeasured` (way backs) | level validator |
| 11.7 Room for two | All | `shared_min_w_m`, `sizes.corridor_w` | `checkCoop`, `checkDimensions` | level validator |
| 11.8 Co-op reach | All | `sizes.coop_lip` | `checkDimensions`, co-op lip unit test | level validator, map job |
| 11.9 Co-op kit, coverage | All (coverage: Campaign, SectorOps, G392) | `sizes.pull_lip`, `sizes.hang_lip`, `sizes.rope_span`, `sizes.throw_gap_max`, `sizes.throw_long`, `sizes.shutter_gap_h` | `checkCoop` (coverage, solo twins), `checkDimensions` (kit bands; `team_throw` `exception`) | level validator, co-op moves (Player Build) |
| 11.10 Forced co-op gate | Campaign | - | `checkRedundancy` (forced gate) | level validator |
| 11.11 Teamwork minimums | Campaign | - | design doc (co-op plan), check later (kit kinds per mission, a joint action at each merge) | level validator, map job |
| 12.1 Nav floor | All | `nav_floor_depth_m` | `checkEngine` | level validator |
| 14 Greybox exit | All | - | `level-measure --write` + `level-validate --require-measured`, route-runs | level validator, route-runs (Marlow Build) |
| 15 Two-player tests (unseen pair, revive per team-move surface, beacons) | Campaign; beacons: Campaign, SectorOps | - | e2e and playtest, check later | map job |
| 16 Level logic | All | scale sheet 3, 7 | `checkDimensions`; review checklist 16.10; two staircases per multi-storey building (16.2.7): check later | map job |

## Open items: rules that conflict with docs/DECISIONS.md
The standard changes only with Michael's approval, so these rules stand as written until he decides.
1. 11.8 builds co-op lips in `sizes.coop_lip` (4.3-4.5 m) from the boost reach; the human ladder reaches
   `TEAM.ladderGrab` 4.1 m in code (`src/config/movement.ts:464`) until G57 (4.5 m) is built.
2. 16.7.3's crouch-duct height was measured on the old camera; it is re-measured on the CT camera (G54).
3. Fire alarms unlocking electric doors as a player tool (G157 item 10): not adopted with G157; a separate decision for
   Michael. Until he decides, exits only open from inside (16.3.6) and no map uses a fire alarm to open a door.
