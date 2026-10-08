# Level design standard - Silent But Deadly

The baseline for every map, now and future. A map's spec may tighten a rule; it may only loosen one with Michael's
written approval in that spec. Numbers marked "constant" come from the code: re-confirm them with grep before each
map, because tuning can change.

## 1. The player fantasy
The player is a predator, not prey: a stealth operative who reads a space, makes a plan, executes it and improvises
when it breaks. Combat is always possible and never required. Darkness, silence and patience are always the better
answer, and the level rewards them.

The core loop every space must support: **observe, plan, execute, improvise, release.**

## 2. Architecture first
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

## 3. Space structure
A level is a linear spine of encounter spaces joined by connectors.
1. **Entry vantage.** Every encounter space opens on a dark vantage, outside every guard's view for the whole patrol
   cycle, from which every guard in the space can be seen within one cycle.
2. **Three routes plus a secret.** Each guarded space has a shadow route (patience, timing), a high route (movement
   skill) and a loud route (force, fastest). At least half of the guarded spaces also have a secret route that
   rewards exploring (a crawlspace, a shaft, a back room). No route is strictly best: each trades speed, risk and
   reward.
3. **Rejoin at a pinch point.** All routes through a space rejoin at its exit before the next space. No route skips a
   space.
4. **Loops, not dead ends.** Every guarded space has at least one loop on its shadow route (around a blocker, through
   two doors of the same room) so a seen player can break line of sight and re-hide. A dead end on a stealth route is a
   design fault.
5. **Stepping stones.** Along shadow routes, darkness, cover or a hide spot at least every 4-8 m. Open lit ground is a
   deliberate crossing that needs timing, a light out or a tool.
6. **Height is safety and information.** Guards do not look up; the high route gives overwatch and takedowns from
   above in exchange for time and skill.
7. **Sightline control.** Long open sightlines are dangerous and used on purpose. Corners, doorways and occluders are the
   decision points between them.
8. **Quiet connectors.** Between encounter spaces: a stair, corridor, cupboard or shaft with no guard, where the player
   breathes and glimpses the next space (glass, a light under a door, voices beyond a wall).
9. **Checkpoint before every encounter space.** The objective (or checkpoint) at the end of a space sits on a floor, in
   the dark, out of every guard's view.

## 4. Guards
1. **Jobs, not lines.** Every guard does something someone would really do there at that hour (rounds, gauge
   reading, a post, a smoke break, loading a van). The job sets the route, the stops and where he looks.
2. **Mix patrol types** across a level: static post, sentry sweeping a view, loop, back-and-forth, talking pair,
   investigator. No two adjacent spaces use the same mix.
3. **Clockwork.** Patrol cycles 25-45 s; stops 3-6 s; gaps in coverage 3-8 s. No randomness that defeats planning.
4. **Isolation moment.** Every guard is alone, in the dark and unwatched at some point in his cycle. The design doc names
   the spot and the time.
5. **Overlapping coverage.** In every space with two or more guards (or a guard watching into a neighbouring space), at
   least one guard covers another for part of his cycle, so the player must choose who goes first.
6. **Lure destinations.** Every lure (a light switched off, a lamp shot, a noise) sends the guard somewhere the player can
   use: under an anchor, into a dark grab spot, away from a crossing.
7. **Bodies matter.** Each space has a hide spot near its takedown spots and at least one patrol that would find a body
   left in the open.
8. **Survivable searches.** Every place a player can be spotted on a stealth route has a hide spot or a dark escape
   within the guards' search area.
9. **Archetype limits.** A map's guard count respects the spawn caps (section 12).

## 5. Light and sound
1. **Every lit pool has a visible source** (a lamp, a tube, a floodlight, moonlight through a window) and a switch
   where a real one would be, by a door. Darkness is where nobody works at night.
2. **Every lit chokepoint** can be darkened at least two ways (switch, shoot the fixture, EMP) and avoided at least one
   way.
3. **Sound comes from materials.** Loud floors (metal, grating, chequer plate, gravel, glass) and quiet floors (carpet,
   linoleum) are placed on purpose, look different, and put a quiet and a loud version of the same action side by side
   (an open window beside a glazed one, a door opened or bashed, a vent unscrewed or kicked, a hang-and-drop or a jump
   down).
4. **Readable at a glance on a phone at Low quality:** lit and dark areas match the light meter.

## 6. Pacing
1. **Teach, test, twist.** One new mechanic per space: introduce it safely, test it alone, then combine it with earlier
   ones. The level ends in a set piece that uses everything.
2. **Tension and release.** Tension rises across the level; every peak is followed by a release. The beat chart (section
   13) proves it.
3. **The player sets the pace.** No forced timers in stealth sections. Pressure comes from guards, light and noise.
4. **Guide without waypoints.** Landmarks visible from afar, light leading the eye towards the way on, sightlines into
   the next space.

## 7. Agency and toys
1. **Every problem has several tools; every tool solves several problems.** The design doc's tool / problem matrix shows
   it.
2. **Toys in every space:** at least two of switches, breakable lamps, doors, windows, vents, lure spots.
3. **Ghost, non-lethal and lethal play are all viable.** The mission rules reward the harder styles (no alarms, no kills,
   undetected as bonuses).
4. **Gadgets help, never required.**

## 8. Readability and fairness
1. The player can always tell why they were seen: no off-screen instant detection, no hidden watchers.
2. Threats are telegraphed: sniper lasers, flashlights, barks, footsteps.
3. Detection states and cues are the same everywhere (the game's alert arcs and barks; no map-specific exceptions).

## 9. Failure
1. Detection escalates step by step and line of sight can be broken.
2. Failure is a new situation, not a reload: running, hiding and fighting are all real options after a detection.
3. Instant failure only through a mission's own rules (for example a Ghost contract).

## 10. Exploration and reward
1. Secret routes, alternate takedowns from anchors and shortcuts reward curiosity.
2. Environmental storytelling: props show who works there and what happened (dressing only).
3. Sightlines and glass let a player plan the next space early.

## 11. Co-op layering
1. **Solo first.** Sections 1-10 are fully met in solo. Co-op routes are extra routes on top, never required.
2. **Solo invariance.** One map build for solo and co-op. Co-op routes are ordinary architecture with a real reason solo
   cannot use them (a fire-escape ladder pulled up, a high hatch); no locked-door teases, no co-op markers.
3. **Out of solo reach.** A co-op lip is at least 0.5 m above the highest solo reach from its floor (constant:
   `WALL_JUMP.maxUp` 3.8) and within the co-op reach (constant: `TEAM.boostMax` 4.5): build at 4.3-4.5 m.
4. **No softlocks.** Every surface a co-op route reaches is also reachable solo by another route, so a downed player can
   be revived (constant: revive needs the reviver within 1.5 m of height; there is no bleed-out) and anyone can leave
   alone.
5. **Unplanned boost targets.** Every lip and pipe between solo reach and co-op reach above its floor is a planned co-op
   route, sits on a solo-reachable surface, or has its ledge removed.
6. **Co-op verbs** are the ones the game has (brace and boost, human ladder, dual takedown). New verbs are Future work.

## 12. Engine constraints (re-confirm per map)
- Nav: at most 3 walkable surfaces per column (`src/ai/navGrid.ts`); stairs and ramps join storeys by height.
- Guards: Infiltration and Hunter spawn up to `SQUAD_CAP` 9 nearest first; `MAX_ALIVE` 10. A map that wants every guard
  present on a ghost run has 9 or fewer.
- Split gaps are found automatically from any two facing faces >= 3.6 m tall and 1.2-1.95 m apart: no accidental ones.
- Box tops >= 1.9 m become hangable lips automatically: remove unwanted ones with `noLedge` / `mark`.
- `ambientZone` covers y -1..8 by default: set `minY` / `maxY` per storey.
- Footsteps are silent on every surface at crouched gears 1-4 and standing gears 1-2; the surface only scales audible
  steps.
- Tuning tables never change for a map; change the geometry.

## 13. Required design deliverables (templates)
Phase 1 and 2 of every map produce these in `docs/prompts/<map>-design.md` and `docs/prompts/<map>-plans/*.svg`.

**Building brief.** Purpose, era, location and site, construction (grid, wall thicknesses, storey heights, windows,
materials), every room with its original purpose, size and present-day contents, vertical circulation, services (how
people, goods, cables, air, water moved), palette and lighting character.

**Floor plans (SVG).** To scale (1 m = 10 px), grid every 6 m, north up, rooms labelled, doors with swing arcs, windows,
stairs with arrows, columns, key dimensions; one file per storey; must render on GitHub's mobile view. Gameplay overlays
as separate files (`*-gameplay.svg`): shadow / high / loud / secret routes in four colours, guard routes with stops and
facing, lit pools, dark areas, loud floors hatched, vantages, objectives, co-op routes.

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
| Lights | Each source, its switch, circuit group, the ways to darken each chokepoint |
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
| Isolation moment | Where and when he is alone, dark and unwatched |
| Covered by / covers | Overlaps with other guards |
| Lures | What draws him, where it sends him |
| Search | Where he searches when suspicious; the nearest hide spots |

**Beat chart**: one row per space and connector: tension 1-5, mechanic taught, mechanics combined, release, the feeling
(tension rises overall, a release after every peak, the set piece last).

**Coverage table**: every movement and stealth verb the game has (from `CLAUDE.md`) against where it is used: taught /
tested / combined, or "not used" with the reason.

**Tool / problem matrix**: rows = problems (a lit post, a pair, a patrol over a crossing, a locked route, a loud floor),
columns = tools (darkness, light switch, shoot light, lure, takedown kinds, anchors, gadgets, co-op): each problem has at
least three tools.

**Metrics check**: every traversal element and takedown spot against its constant window.

**Self-critique**: as lead designer, the 10 weakest points (flow breaks, a dominant route, a guard job that makes no
sense, a dead end, a space without toys, an element that fails "why is it here", an unfair detection) and the fix for
each.

**Playtest checklist** (for Michael's phone sessions and the e2e):
- Can a first-time player read every patrol from the vantage within one cycle?
- Is any route strictly best?
- Is there a detection the player cannot escape?
- Did the player understand every detection?
- Was every toy used at least once across sessions?
- Did the level feel like the building it claims to be?

## 14. Standard phases and gates
Every new map follows these phases, stopping for Michael after each:
0. **Setup and investigation**: branch, save the spec verbatim, progress log, confirm every referenced fact by grep,
   answer the spec's engine questions. No gameplay changes.
1. **Architectural design** (docs only): building brief and floor plans. Review.
2. **Gameplay design** (docs only): space sheets, guard sheets, gameplay overlays, beat chart, coverage table, tool /
   problem matrix, metrics check, self-critique. Approval makes the docs the build contract.
3. **Build** (one storey or area per phase, no guards): geometry, anchors, lights, zones, surfaces, doors, windows, hide
   spots; `scripts/plan-svg.mjs` renders the built level to compare with the approved plans.
4. **Guards and mission**.
5. **Dressing, readability and verification**.

## 15. Acceptance tests every map has
- Every planned traversal element engages from its planned approach (pad; split, pipe, fence, wall jump also by touch).
- `e2e-anchors.mjs` covers the map.
- The split gaps on the map are exactly the planned ones.
- The nav path from insertion to extract passes the spaces in order; no path skips a space.
- Darkness: at each vantage and planned dark pocket a crouched still player stays under suspicious for a full patrol
  cycle; in each planned lit pool on a route he is noticed; switching the circuit off makes it safe and lures the guard.
- Noise: each planned loud floor draws the planned guard above a silent gear and not at a silent one.
- Patrols: every route point is on the nav grid, cycles are 25-45 s, every guard covers his route.
- Every guard is alive at the start; a ghost run succeeds with every bonus; a body left on a route is found.
- Co-op: each co-op route works for host and client; each co-op lip is out of solo reach (unit test); a player downed on
  each co-op surface is revived.
- Perf budgets from `CLAUDE.md` on desktop and the mobile presets.
