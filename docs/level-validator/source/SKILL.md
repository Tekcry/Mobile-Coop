# Stealth Level Design Standard

> **Reference only** (Michael's uploaded stealth-level-design skill, 2026-10-24; its skill frontmatter is removed so it
> is never loaded as a skill). It is not a standard and nothing below binds a map. Our standard is
> `docs/level-design.md`; where they differ, level-design.md wins: the solo critical path and solo fallbacks (intro point
> 4, 6.1, 10; ours: campaign co-op only with a forced co-op gate per section, Sector Ops solo past team doors,
> level-design 11), shadow share (4.4; ours: real-world light bands, level-design 5.5), guard bands (4.5; ours: as many
> guards as realistically possible, below the band warns, level-design 4.9), room sizes and player metrics (2, 3.5;
> ours: `docs/design/scale-sheet.md`), deniable ops (7; parked), the output schema and validator (8, 9; ours:
> `docs/level-validator/graph-schema.md`, `scripts/level-validate.mjs`), and "Follow this document as a hard
> standard" below.

You are a senior level designer on a stealth-action game. Your levels must be:
1. **Believable** - a real place with a real function, built to real-world dimensions.
2. **Readable** - the player can observe, plan, and predict.
3. **Open to choice** - every problem has several valid solutions.
4. **Fun in solo and co-op** - co-op adds options; solo is never broken or empty.

Follow this document as a hard standard. When a request conflicts with it, say so in one line and propose the closest compliant option.

---

## 0. Project context (fill in once, then keep)

- Engine / editor: `<ENGINE>`
- Units: 1 unit = 1 metre (convert if the engine differs)
- Output target: `<e.g. JSON spec + engine blockout script / Tiled map / prefab list>`
- Player metric overrides: `<paste real values from the character controller here; they replace Section 2 defaults>`

---

## 1. Mandatory workflow

Never start with geometry. Work in this order and show each step's output before the next:

1. **Brief** - location, real-world purpose of the site, time of day, weather, mission fantasy in one sentence, mode (campaign / deniable ops), player count (1, 2, or both).
2. **Building program** - list the functional zones a real architect would include for this site (Section 3). Each zone: purpose, who uses it, how they enter it.
3. **Beat chart** - the intensity curve for the mission (Section 5.5).
4. **Connectivity graph** - spaces as nodes, connections as links, using the JSON schema in Section 8. No coordinates yet.
5. **Blockout** - give every space and link real dimensions from Section 2 and Section 3. Place on a 0.5 m grid. Stack stairs and lifts vertically across floors.
6. **Encounter pass** - guards, patrol loops, cameras, lights, sound surfaces (Section 4).
7. **Co-op pass** - co-op routes, split sections, overwatch spots, solo fallbacks (Section 6).
8. **Validate** - run `python scripts/validate_level.py <level>.json`. Fix every ERROR. Justify or fix every WARN. Then walk the manual checklist in Section 9.
9. **Deliver** - final JSON, a top-down map per floor (ASCII or SVG), and short design notes per encounter space: intended solutions, failure recovery, co-op twist.

If a step reveals a problem in an earlier step, go back and fix the earlier step. Do not patch around it.

---

## 2. Player metrics (default grid)

All geometry is built from these. Odd sizes are the main cause of levels feeling "strange". Replace defaults with engine values in Section 0.

| Metric | Value |
|---|---|
| Snap grid | 0.5 m |
| Standing height / width | 1.8 m / 0.6 m |
| Crouch height | 1.2 m |
| Crawlspace / vent clearance (gameplay) | min 0.9 x 0.9 m |
| Single door | 1.0 x 2.2 m |
| Double door | 2.0 x 2.2 m |
| Loading-dock / vehicle door | 3.0-4.5 m wide, 3.5-4.5 m high |
| Corridor width | 1.5 m min; 2.0 m where two agents must pass; 3.0 m max except lobbies |
| Ceiling: office / residential | 2.7-3.2 m |
| Ceiling: industrial / warehouse | 6-12 m |
| Stairs | 0.18 m rise, 0.28 m tread, 1.2 m min width, landing every 12 risers max |
| Low mantle | up to 1.0 m |
| High mantle (needs grabbable edge) | 1.0-2.0 m |
| Above 2.0 m | needs ladder, pipe, ledge chain, or co-op boost |
| Max jump gap | 2.0 m horizontal |
| Safe drop | up to 3.5 m; anything higher needs a ledge hang, pipe, or rappel |
| Split-jump / wall-brace corridor | 1.6-2.2 m between parallel walls, 3+ m tall |
| Pipe / ledge shimmy section | 4-15 m long, with a rest point every 10 m |
| Cover object height | low 1.0 m, high 1.8 m+ |
| Cover spacing while sneaking | 3-6 m; never more than 8 m of open, lit ground without an alternative route |
| Guard sight in light / in shadow | 15-20 m / 3-5 m (tune to AI) |

---

## 3. Realism: architecture rules

A level is a real place first and a playground second. Players feel fake architecture instantly.

**3.1 The "why does this room exist" test.** Every space must have a function, a user, and a logical way in. If you cannot answer all three, delete or rework the room.

**3.2 Required building systems.** A real site includes most of these. Use them as gameplay layers:
- **Public front**: entrance, lobby, reception, visitor areas.
- **Staff back**: offices, break room, lockers, restrooms near stair cores.
- **Security**: guard post at each entrance, CCTV/security room, armoury or guard barracks (natural reinforcement spawn).
- **Circulation**: stair cores stacked floor to floor, lifts beside stairs, fire exits at both ends of long floors, fire escape outside.
- **Service spine**: maintenance corridors, loading dock, freight lift, waste area, storage.
- **Utilities**: electrical room (lights can be cut here), server room, boiler / HVAC plant, rooftop plant, riser shafts.
- **Exterior site**: perimeter fence or wall, gate with guard booth, access road, parking, floodlights on poles, landscaping, drainage.

**3.3 Systems run on real routes.** Ducts run from plant rooms along corridors above ceilings. Pipes follow walls and ceilings in service areas. Cables go to the server room. Never place a vent or pipe that does not connect to a system that would plausibly feed it.

**3.4 Structural logic.** Large spaces sit on a column grid of 6-9 m. Walls line up across floors. Stairs and lifts stack. Upper floors are no larger than the structure below allows, unless cantilevered on purpose.

**3.5 Room size reference (w x l, metres).**

| Room | Size |
|---|---|
| Private office | 3 x 4 to 4 x 5 |
| Open-plan office | 10 x 15 to 30 x 40 |
| Meeting room | 4 x 6 to 6 x 10 |
| Restroom block | 3 x 5 to 6 x 8 |
| Break room / kitchen | 5 x 6 to 8 x 10 |
| Server room | 6 x 8 to 15 x 20 |
| Security / CCTV room | 4 x 5 to 6 x 8 |
| Lobby | 10 x 12 to 25 x 30 |
| Warehouse | 25 x 40 to 60 x 120 |
| Loading dock apron | 15 x 20 to 30 x 40 |
| Hotel room | 4 x 8 to 5 x 10 |
| Ship corridor | 1.2-1.8 wide |

**3.6 Variety with purpose.** Room sizes vary because functions vary. Never tile identical boxes. Never build mazes; real buildings are planned so people can find their way.

**3.7 Set dressing does two jobs.** Every prop tells the story of the place and doubles as cover, a climb point, a hiding spot, or a sound hazard.

---

## 4. Stealth gameplay rules

**4.1 Pillars.** The player chooses the approach. Light, shadow and sound are readable. Ghost, non-lethal and aggressive play all work. Observation is always rewarded.

**4.2 Rule of three routes.** Every encounter space has at least 3 approaches, of at least 2 different types:
- **Ground / shadow** - patient movement through darkness and cover.
- **Vertical** - ledges, pipes, rooftops, split-jumps, catwalks.
- **Utility** - vents, crawlspaces, maintenance doors, locks, hackable doors.
- Optional **aggressive** route - direct, cover-rich, louder.

Routes must **cross at least once** so the player can switch mid-approach when a plan fails.

**4.3 Encounter space anatomy.**
1. **Entry** - the player arrives unseen.
2. **Observation point** - a safe vantage that shows at least 70% of the space and all patrol routes, out of every guard's sight.
3. **Play space** - the puzzle of guards, light and cover.
4. **Exits** - at least 2. Being spotted must be recoverable: the player can break line of sight within about 5 seconds of movement from any point.

**4.4 Light.** Stealth spaces aim for 40-60% of floor area in shadow. Every light has a real fixture. Lights the player can shoot or switch off must matter. Use light pools to create deliberate choke points, not random ones. Objectives and guard posts sit in brighter areas.

**4.5 Guards and patrols.**
- Patrol loops of 20-45 seconds with pauses at the ends. Crossing windows of 3-8 seconds.
- Mix types per space: stationary, patrolling, wandering, camera, civilian/worker.
- Per space: 3-6 enemies early in the mission, 6-10 late.
- The puzzle must be solvable: no set of guards and cameras covers every route permanently.
- Every guard is isolated at some point, or a pair can be separated by a distraction.
- Body-hiding spots (dark corners, lockers, crates, ledges) near each takedown zone.
- Sound surfaces (metal grating, glass, puddles) offer shortcuts at the cost of noise.
- Alarms escalate in 3 stages. Reinforcements arrive from logical places (barracks, gate, vehicles), never from thin air.

**4.6 Dead ends.** A dead end is allowed only if it holds a reward (intel, gear, secondary objective) and is short (15 m or less), or it has a second exit such as a vent.

---

## 5. Mission structure (campaign)

**5.1 Length.** 25-45 minutes of stealth play. 4-6 encounter spaces plus a climax.

**5.2 Topology.** Prefer hub-and-spoke and loops over a chain of corridors. Loops bring the player back through new routes rather than backtracking.

**5.3 Gating.** Use realistic gates: keycards, locked doors, security systems, power. The gate and its key should be visible to the player before the solution is.

**5.4 Objectives.** Primary on the critical path. Secondary on branches that add 10-25% to the route. Opportunity objectives (intel, hacking, interrogation) inside encounter spaces.

**5.5 Beat chart.** Intensity 1-5 per section. Pattern: low intro, build, spike, release, build, bigger spike, release, climax, exfil. Never 3 high-intensity sections (4-5) in a row without a release (1-2). Releases are traversal connectors (20-60 seconds), safe rooms, or exterior climbs with a view.

**5.6 Orientation.** Each section has one landmark visible from several points (a lit tower, crane, signage, atrium). The next objective's direction should be readable from each observation point.

---

## 6. Co-op standard

**6.1 Co-op adds, solo never loses.** The full critical path must be completable solo. Every co-op-only link is either an optional shortcut or has a solo equivalent (a ladder kicked down from the other side, a crate to push, a longer pipe route).

**6.2 Co-op routes per space.** At least half of encounter spaces include a co-op route (boost, split-jump assist, rope/rappel hold, human ladder, pull-up). Make it the most elegant route, not the only one.

**6.3 Split and rejoin.** Planned separations last 90 seconds or less. Both paths are within 20% of each other in length and they interact: one agent opens a door, cuts lights, or disables a camera for the other.

**6.4 Overwatch.** Each split section has an elevated spot where one agent can see and cover the partner's route.

**6.5 Synchronised actions.** Place guard pairs that need simultaneous takedowns. In solo, the same pair can be split by a distraction.

**6.6 Reach and revive.** No forced separation where a downed agent cannot be reached within 15 seconds.

**6.7 Space for two.** Corridors where agents move together are 2.0 m or wider. Cover clusters fit two agents. Enemy count and awareness scale with player count; record both values per space.

---

## 7. Deniable ops (arena mode)

Short, replayable missions on compact maps.

- **Footprint** 60 x 60 to 120 x 120 m, 3-5 distinct zones, 2-3 vertical levels.
- **No dead ends.** Every space has at least 2 connections. The map is a set of loops.
- **Longest unbroken sightline** 40 m or less.
- **Reinforcement entries** are logical (gates, vehicles, barracks) and placed away from player spawns.
- **Variants** must be supported by the layout:
  - **Hunt** - clear all enemies; detection triggers reinforcements. Needs pockets where groups can be isolated.
  - **Defend** - protect a device. At least 3 attack lanes, flank routes, and no single choke point.
  - **Ghost** - reach objectives with zero detection. Cameras, lasers, tight patrols, multiple safe routes.
  - **Duel** - competitive two-player variant (optional). Symmetric in opportunity, not in shape.
- **Replayability.** 3+ candidate objective / device positions, 2+ patrol variants per zone.

---

## 8. Output schema

Every level is described as JSON before any engine work. The validator reads this.

```json
{
  "meta": {
    "name": "Harbour Customs Depot",
    "mode": "campaign",
    "players": [1, 2],
    "beats": [1, 3, 4, 2, 3, 5, 2, 5, 1]
  },
  "spaces": [
    {
      "id": "lobby",
      "type": "encounter",
      "room_class": "lobby",
      "function": "Public entrance and reception",
      "floor": 0,
      "size": [14, 18, 4],
      "shadow_pct": 0.45,
      "guards": {"solo": 4, "coop": 6},
      "tags": ["start"]
    }
  ],
  "links": [
    {
      "from": "lobby",
      "to": "security_room",
      "kind": "door",
      "route": "ground",
      "width": 1.0, "height": 2.2, "length": 0,
      "solo": true, "coop": true,
      "one_way": false
    }
  ]
}
```

- `type`: `encounter`, `connector`, `hub`, `safe_room`, `objective`, `reward`, `exterior`, `utility`.
- `room_class`: a key from Section 3.5 (see validator table) or `custom`.
- `tags`: `start`, `exfil`, `objective_primary`, `objective_secondary`, `reward`, `coop_overwatch`, `split_a`, `split_b`.
- `kind`: `door`, `double_door`, `corridor`, `stairs`, `lift`, `vent`, `crawlspace`, `ledge`, `pipe`, `window`, `ladder`, `drop`, `rappel`, `zipline`, `coop_boost`, `split_jump`, `coop_rope`.
- `route`: `ground`, `vertical`, `utility`, `aggressive`.
- `solo: false` marks a co-op-only link. `coop: false` marks a solo-only fallback.

See `examples/example_level.json` for a complete small level.

---

## 9. Validation

**9.1 Automated.** Run:

```
python scripts/validate_level.py path/to/level.json
```

It checks connectivity, solo completability, route redundancy, the rule of three, dead ends, room and opening sizes, shadow ratios, guard counts, co-op coverage, split parity, beat chart pacing, and arena loop rules. Fix all ERRORs. Do not deliver with errors.

**9.2 Manual checklist.** Answer each in the design notes:
- [ ] Every room passes the "why does this room exist" test.
- [ ] Building systems (ducts, pipes, power) connect to real sources.
- [ ] Each encounter space has an observation point and its intended solutions are listed (at least 3).
- [ ] Each encounter space has a recovery plan if the player is spotted.
- [ ] Patrols are readable within one loop of observation.
- [ ] A landmark is visible from every observation point.
- [ ] Solo walkthrough: describe one full route with no co-op links.
- [ ] Co-op walkthrough: describe one full route that uses co-op links and one split section.
- [ ] Nothing in the layout would look wrong in a photo of a real building of this type.

---

## 10. Anti-patterns (reject on sight)

- Rooms with no function, or sized at random.
- Corridors that lead nowhere, or loop back without new content.
- Mazes, identical box rooms, floating platforms, ladders to nowhere.
- Vents that start and end in walls with no system behind them.
- One-route encounters, or "three routes" that never cross.
- Guards that cover every route at all times (unsolvable) or never overlap (trivial).
- Open lit areas wider than 8 m with no alternative route.
- Co-op-only gates on the critical path with no solo fallback.
- Split sections that leave a partner alone for minutes with nothing to do.
- Reinforcements spawning inside view of the player.
- Arena maps with dead ends or one dominant sniping lane.
