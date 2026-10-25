# Map connectivity graph - JSON schema

Every map is written as a connectivity graph (`<map>.graph.json`) before any geometry, and the graph passes
`node scripts/level-validate.mjs <graph.json> [more.json ...]` with 0 errors before Phase 3 (build); every WARN is
justified in the map's design doc (Michael 2026-10-24, "Add 1-4 as extras"; `docs/level-design.md` section 14). For a
map that is already greyboxed (campus) the graph describes the map AS BUILT and the run is an audit.

- Worked example: `docs/level-validator/example.graph.json` (two campaign sections, each with a forced co-op gate, one
  spine link, one split with an overwatch and an assist; V1's CLI smoke fixture, 0 errors; it also shows the V6
  fields `area`, `vantage.at` and a link `at`, see "Schema additions").
- Graph sets: every committed graph set is listed in `docs/level-validator/graph-sets.json` and run by
  `npm run validate:levels`, which fails when a set's error or warning count changes (`docs/systems/testing-tools.md`).
- Rules: `docs/level-design.md` (its rule index names the check for each rule; the job's history is in
  `docs/archive/level-validator/`); numbers: `docs/design/metrics.json`, generated from
  `docs/design/scale-sheet.md` sections 1, 3, 7 (room sizes by type) and 8 (validator numbers). No number in this
  doc or in the validator is a source of truth: the sheet is.
- Severity: **ERR** = validator ERROR (exit 1); **WARN** = justify in the design doc; **INFO** = printed, no exit code.
  This doc owns the severities.
- Michael's reference skill (`docs/level-validator/source/`) uses a different schema; where the two differ, this one
  wins (solo flags, `floor`, `beats`, `split_a` / `coop_overwatch` tags and rope kinds are not ours).

## File layout and merge

- One graph per map; it may be split into one file per section so sections are written in parallel (A6). The CLI
  merges the files given: `meta` from the first file, `spaces` and `links` concatenated in file order,
  `meta.sections` unioned in file order, `meta.measured` combined per file (see "Schema additions"). A link may name a
  space from another file (the spine link does).
- Campus files: `docs/sector-redesign/graph/campusOps-S<n>.json`. Other maps: the map's docs folder.
- Never validate one section alone: pass every file of the map, first section first (campus: S1 to S5 in order).
  The spine, reach, pacing and early / late checks need the whole map; one file alone reports false errors.
- Ids are unique across all merged files (ERR on a duplicate). Use a section prefix: `s1-carpark`.
- Spine order (beat pacing, early / late) = `meta.sections` order, then space order in the file.

## `meta`

| Field | Type | Req | Meaning | Feeds |
| --- | --- | --- | --- | --- |
| `map` | string | yes | Map id as registered (`campusOps`, `ctcourse`) | report header |
| `name` | string | yes | Display name | report header |
| `mode` | string | yes | `campaign`, `sector` (Sector Ops) or `training` (Marlow Yard): the profile below. Arena / deniable ops is parked (no rules) | every profile check |
| `players` | int[] | yes | Player counts the map supports: `[2]` for campaign and training maps (G2, G50, G308); Sector Ops lists its counts within 1-4, `[1, 2, 3, 4]` (coop4 #317, G308), with guard counts per player count ("Keep scaling", 2026-10-25) | checkStructure, guard keys |
| `sections` | string[] | yes | Section ids in spine order (`["S1", "S2", ...]`) | checkSpine, checkRedundancy, pacing, early / late |
| `taught_by` | string | `training` only | The section where the last co-op kit move is taught on its own (level-design "Training profile", G363, G388); one of `sections` | checkTraining: ERR missing or not in `meta.sections` on a `training` map; ERR present on any other mode |

### Mode profiles (`docs/level-design.md` "Modes and tags")

| Check | `campaign` | `sector` | `training` |
| --- | --- | --- | --- |
| Players | ERR not `[2]` | ERR a count outside 1-4 | ERR not `[2]` |
| Exfil | ERR none | - | - |
| Routes per encounter (3 approaches, 2 kinds, shadow / high / loud, secret share), routes cross, 2 routes per section | as below | as below | skipped (one route, G292) |
| Forced co-op gate per section | ERR a section whose exit solo links reach from its entry | - | - |
| Co-op coverage | ERR | ERR | - (G392) |
| Gate reach (a way back over each co-op link) | ERR none; ERR over `reach_max_s` | - | - |
| No softlock | - | ERR | - |
| Solo twins | ERR | WARN | INFO (A7) |
| Guard bands | WARN below | WARN below | INFO below |
| Alive ceiling (the campaign runs on the Sector Ops runtime) | ERR a section over `sector_alive_max` | ERR a section over `sector_alive_max` at a player count | - |
| Unavoidable guard (`unavoidable` tag) | WARN a tagged space with a way round | WARN none tagged; WARN a way round | WARN a way round |
| Timed drill (`drill_s`) | ERR | ERR | allowed |
| Shadow share | INFO | INFO | INFO |
| Training checks (`taught_by`, `teach`, side routes; "How the checks read the graph") | ERR `taught_by` present | ERR `taught_by` present | ERR `taught_by` missing or unknown; up to and including it ERR 2+ routes, a `split:` tag, no teach element, a teach element a path avoids; after it ERR 2+ routes with no guarded encounter space, and the campaign route rules on such a section |
| No-kill path (no `requires_kill` link) from `start` to every `objective` and on to the run's end | ERR | ERR | ERR |
| Ghost path (also no `loud` link) | ERR | ERR | INFO |
| Markers (`mark`) | ERR each | ERR each | INFO count |
| Nav floor (an encounter or guarded space below `nav_floor_depth_m`) | WARN | WARN | WARN |

## `spaces[]`

A space is a walkable volume with one function: a room, a yard, a hall, a corridor run, a stair core, or a route
surface above a floor (a gantry, a roof walk, a cable basket run, a ledge run) that a player stands on.

| Field | Type | Req | Meaning | Rules it feeds (severity) |
| --- | --- | --- | --- | --- |
| `id` | string | yes | Unique id, section-prefixed | structure (ERR duplicate / unknown reference) |
| `section` | string | yes (M3) | One of `meta.sections` | checkSpine, checkRedundancy (ERR missing or unknown) |
| `type` | enum | yes | `encounter`, `connector`, `hub`, `safe_room`, `objective`, `reward`, `exterior`, `utility`, `stair_core`, `duct` | which checks apply (encounter rules only on `encounter`) |
| `room_class` | string | yes | A class key of scale-sheet section 7 (`lobby`, `corridor`, `yard`, ...) or `custom` | checkDimensions: ERR below the class min w / l; WARN above max; ERR an encounter space of a `no` class, or of a `conditional` class under the 6.0 camera floor; `custom` = WARN (reason in the design doc) |
| `function` | string | yes | One line: what the space is for, who uses it (level-design 2.2 reason test) | ERR empty or missing |
| `storey` | number | yes | Floor (walking) height in metres: G 0, campus S2 L1 4.4, a gantry 4.5 | level changes, reading the plan |
| `size` | [w, l, h] | yes | Metres; w = short side, l = long side, h = clear height above the floor (ceiling, slab underside or the next obstruction; open sky: the height you could stand up to, 12.0 if nothing) | ERR h < 2.4; WARN h < 3.0 in rooms and corridors; class ceiling range (WARN outside; an `open` class skips it); 0.5 grid (WARN off-grid); camera floors via the class (encounter w >= 6.0, walk-through w >= 3.5, corridor 3.0-4.0, target 3.5-4.0) |
| `area` | string or box list | no | Where the space is, for the greybox measurement (V6): a RoomDef id or `[minX, minZ, maxX, maxZ]` boxes. See "Schema additions" | measurement only; `level-measure` needs it on encounter and split-leg spaces |
| `tension` | int 1-5 | yes | Beat chart intensity (level-design 6.2, 13) | checkPacing: ERR three spaces >= 4 in a row on the spine; WARN the map opens above 2; WARN no 1-2 after a peak |
| `tags` | string[] | yes (may be empty) | See "Tags" | reach, spine, splits, dead ends |
| `drill_s` | s | no | Training only: a timed drill's limit in seconds (level-design 6.3; G342) | ERR on a `campaign` or `sector` map (soft windows only, G334); ERR not > 0 |
| `shadow_pct` | 0-1 | no | Share of the floor in shadow, for information: the real-world light band (scale sheet section 9, level-design 5.5) is the light target since 2026-10-25 | INFO outside `shadow_min_frac`-`shadow_max_frac` |
| `los_break_s` | s | encounter | Declared TARGET: worst-case time to break a guard's line of sight from any point of a stealth route | ERR missing; ERR above 5 (M4) |
| `vantage` | `{ "from": id, "sees_pct": 0-1, "at"?: [x, y, z] }` | encounter | The observation point (a space id) and the share of the space it sees; it must also see every guard within one cycle, out of view (level-design 3.1: design doc). `at` is the optional V6 feet point ("Schema additions") | ERR missing or unknown `from`; ERR `sees_pct` < 0.7 (M4) |
| `guards` | `{ "<players>": n }` | encounter | Guards in the space by player count, dogs included (`{ "2": 4 }`); a guard present only from N players counts only in the `"N"` key and above | WARN below the `guards_early` / `guards_late` band (training: INFO), no upper limit (level-design 4.9); `sector` and `campaign`: ERR when a section's spaces sum to more than `sector_alive_max` at one player count; ERR a count lower than a smaller player count's |
| `phase` | `early` / `late` | no | Overrides A3 (first half of the spine by section index = early, second half = late) | guard bands |
| `mark` | any | no | A guidance marker on the space (any value; Marlow Yard keeps its guidance marks, G292; the campaign and Sector Ops have none, G290, G339) | checkPerfect: ERR per marked space on `campaign` and `sector`; INFO count on `training` |
| `note` | string | no | What was not measured or is estimated, and from where (V5 writes one on every guessed value) | ignored by the validator |
| `measured` | object | no | Greybox measurement (V6): measured values beside the targets; never written by hand. See "Schema additions" | `checkMeasured`: ERR when a measurement misses its target (what it checks: "How the checks read the graph") |

## `links[]`

A link is one way between two spaces: an opening, a passage, a climb, a co-op move. Two doors between the same two
spaces are two links. Links are two-way unless `one_way` is set or the kind is `drop`.

| Field | Type | Req | Meaning | Rules it feeds (severity) |
| --- | --- | --- | --- | --- |
| `from`, `to` | id | yes | Space ids; for a one-way link the direction of travel | ERR unknown id |
| `kind` | enum | yes | See "Link kinds" | dimension rules per kind; co-op kinds |
| `route` | enum | yes | `shadow`, `high`, `loud`, `secret` (A4: the skill's ground / vertical / aggressive / utility), or `spine` (the one connector between two consecutive sections) | rule of three, routes cross, checkSpine |
| `width` | m | for openings, passages, stairs, ducts | Clear width; for `split_jump` the gap between the two faces | per-kind minimums (table below), 0.5 grid, `shared` |
| `height` | m | for openings, ducts, corridors | Clear height (door leaf, lintel, duct); for `split_jump` the face height | per-kind minimums |
| `length` | m | split legs, reach paths (else optional) | Walking length from the middle of `from` to the middle of `to` along this link, so a chain of links sums to the walk (the validator adds nothing for the spaces in between) | split time, partner reach, 0.5 grid |
| `time_s` | s | no (use on every climb, crawl and co-op move on a split leg) | Traversal time of the link at the leg's pace (M4); overrides `length` / speed | split legs, partner reach |
| `level_change` | m | for any height change | Height climbed or dropped (positive number) | ERR in the step band, over 0.40 up to 0.45; `wall_jump` <= 3.8 solo reach; co-op lip band 4.3-4.5; drop above the safe-drop height |
| `shared` | bool | no | Both partners move through together | ERR `width` < 2.0 |
| `one_way` | bool | no | Passable only `from` -> `to` | reach, redundancy, approaches (counted only at `to`), dead ends (a way out only at `from`) |
| `bolted` | bool | no | Bolted on its `to` side: one player opens it only from there (a door the partner unbolts after a co-op move, such as a throw; the vent has its own kind, `vent_unlock`). Two players: a normal way. Unbolted, it stays open both ways | ERR not a bool; forced gate and solo twins: one player uses it only `to` -> `from`; gate reach: open both ways |
| `assist` | split id | no | On the link of one leg that the other leg's action opens, darkens or disables; `reason` names the action and where it is done | checkCoop: ERR a split with no assist |
| `teach` | string | no | The kit move this link teaches (free text from the map's teach list; a move with no link kind uses the `teach:<move>` space tag instead) | checkTraining, `training` only: ERR not text; a teach element of its section when both ends are in it |
| `requires_kill` | bool | no | A perfect run cannot pass this link without a kill | checkPerfect: ERR any value but true or false (every mode); the no-kill and ghost paths skip a `true` link |
| `mark` | any | no | As on spaces | checkPerfect, as on spaces |
| `exception` | string | no | The approved exception to a size row that this one link uses. Only value: `"long_throw"`, only on a `team_throw` | ERR any other value; ERR on any other kind; the `long_throw` rules are below the table |
| `reason` | string | no (expected on every link) | One-line real-world reason (level-design 16.9 element register) | not checked; the register row lives in the design doc |
| `at` | `[x, y, z]` | no | The opening point the link passes, for the greybox measurement (V6). See "Schema additions" | measurement only |
| `note`, `measured` | | no | As on spaces | |

`exception: "long_throw"` (A27; Michael ~20:45, "Mix of both") lets one `team_throw` span a gap up to
`sizes.throw_long.max` instead of the throw gap row. The scale sheet owns it (section 3, "Long throw (named spots
only)"), with the spots it approves, each `<meta.map>:<from>><to>`; a new spot is a sheet change with Michael's
approval and the field alone approves nothing. At a listed spot the gap passes up to the max with an INFO line naming
the spot, and a wider gap is an ERR. At an unlisted spot (the same space ids on another map too) it is an ERR "not an
approved long-throw spot". With no `exception` the throw gap row applies, listed spots included. A metrics file with
no `sizes.throw_long` (or one that is not `{ max, spots }`) prints one WARN and the throw falls back to the throw gap
row.

## Link kinds

Speeds come from scale-sheet section 8: 1.3 m/s on split legs, 3.0 m/s to reach a downed partner. Kinds with no
walking speed (climbs, crawls, co-op moves) carry `time_s` on any split leg or reach path.

| Kind | Two players needed | Dimension rule (numbers from the sheet) |
| --- | --- | --- |
| `door` | no | ERR width < 1.0; WARN 1.0-1.19 (nav passes only on a half-metre centre); target 1.2 x 2.1; ERR height < 2.0 or > 2.2 |
| `double_door` | no | ERR width < 1.8; 1.8 or 2.0 x 2.1 |
| `opening` | no | WARN width outside 2.5-3.5; lintel 2.1 |
| `roller_door` | no | ERR width < 3.0; 3.0 x 3.0 |
| `corridor` | no | ERR width < 3.0; WARN 3.0-3.49 or > 4.0; target 3.5-4.0 |
| `fire_stair` | no | ERR width < 1.3; rise 0.165, run 0.28-0.285 |
| `open_stair` | no | WARN width < 2.4 |
| `ladder` | no | `level_change` = the climb |
| `duct` | no | ERR below 1.2 wide x 1.5 high; player only (guards do not follow) |
| `tunnel` | no | walk-in, height 2.1 (2.4 preferred) |
| `window`, `hatch` | no | width / height as built |
| `ledge`, `pipe` | no | shimmy runs; `length` = the run |
| `drop` | no | one way by default; WARN above 4.5 (`safe_drop_m` = `LANDING.heavy`, `src/player/movement.ts:168`; no fall damage) |
| `wall_jump` | no | `level_change` <= 3.8 (solo `WALL_JUMP.maxUp`) |
| `split_jump` | no | `width` 1.2-1.95 between faces, `height` >= 3.6 |
| `coop_boost` | **yes** | lip `level_change` 4.3-4.5 (`TEAM.boostMax` 4.5) |
| `human_ladder` | **yes** | lip `level_change` 4.3-4.5 (ladder grab 4.1 until G57) |
| `pair_gate` | **yes** | a team door (pair gate / pair bolt, CR5 / CR6): `door` sizes; opens only with both players (lead decision 1); once passed it stays open (its own way back); judged both ways for a solo twin |
| `team_throw` | **yes** | throw over a gap (kit, G293): `width` = the gap (required), ERR above 2.7 m (sheet "Throw gap"), or above `sizes.throw_long` with `exception: "long_throw"` at a listed spot (sheet section 3, "Long throw (named spots only)"; Michael ~20:45, "Mix of both"); needs `time_s` |
| `team_hang` | **yes** | hang-down relay (climb the hanging partner): `level_change` = the lip; ERR above 4.6, WARN under 4.3 (sheet "Relay lip"); needs `time_s` |
| `team_pull` | **yes** | pull-up: catch a jumping partner at a lip and haul: `level_change` = the lip; ERR above 4.5, WARN under 4.3 (sheet "Pull-up lip"); needs `time_s` |
| `shutter` | **yes** | hold a shutter or door: one lifts and holds, the other crawls under: `width` required, ERR below the door minimum; `height` (the held gap, optional) ERR under 0.9 (sheet "Held shutter"); stays open once passed; judged both ways for a solo twin, like `pair_gate` |
| `team_rope` | **yes** | the two-person rope (G180 over G110, CR7): `level_change` = the climb, ERR outside 2.2-6.0 (sheet "Two-person rope"); needs `time_s` (lead decision 2) |
| `rappel` | no | one way down (`RAPPEL`, `src/config/movement.ts:370`); `level_change` = the descent; needs `time_s` (lead decision 2) |
| `vent_unlock` | **yes** | the door a crawler opens from its `to` side after the vent (the vent is its own `duct` link; Q25): `door` sizes, `width` and `height` required; one player passes it only `to` -> `from` (a `bolted` link); once open it stays open both ways (its own way back) |
| `plank_bridge` | **yes** | both carry a scaffold board and lay it over a gap (ROADMAP Decided ~18:05, "Add it"; G403): `width` and `height` required, as `pair_gate`; stays open both ways once passed; no size band yet: the band row comes with the move's coop-kit PR |
| `deadweight` | **yes** | one hangs on a chain so a counterweighted grate lifts for the other (ROADMAP Decided ~18:05; G403): `width` required, as `shutter`; stays open both ways once passed; needs `time_s`; no size band yet: the band row comes with the move's coop-kit PR |
| `chimney_pair` | **yes** | both brace back to back in a narrow shaft and climb it together (ROADMAP Decided ~18:05; G403): `level_change` = the climb; climbs both ways; needs `time_s`; no size band yet: the band row comes with the move's coop-kit PR |
| `swing_pass` | **yes** | one, braced on a pipe, swings the partner across a shaft (ROADMAP Decided ~18:05; G403): `width` = the gap, required, as `team_throw`; one way only when the graph says so; needs `time_s`; no size band yet: the band row comes with the move's coop-kit PR |
| `drop_catch` | **yes** | one drops into the partner's arms for a silent landing (ROADMAP Decided ~18:05; G403): `level_change` = the drop; one way by default, as `drop`; needs `time_s`; no size band yet: the band row comes with the move's coop-kit PR |

The five moves marked "no size band yet" are the kit moves Michael added on 2026-10-25 (ROADMAP Decided ~18:05, the
moves named there, Plank Bridge "Add it"). Each takes the fields of the kind it stands in for, as the rows say. The
validator accepts them and counts them as co-op links, but checks no size: it prints one INFO per kind used
("`<kind>`: no size band yet; the scale-sheet row comes with the move's coop-kit PR"). The band (scale-sheet section 3)
and the level-design 11.9 entry for each come with that move's coop-kit PR, and Michael approves the sheet rows;
`vent_unlock` gets the door rows now (Q25).

No zipline. The core schema's "no rope (G110)" line is out of date: G180 restored the two-person rope (`team_rope`).

## Lead decisions (Marlow Build, 2026-10-24 ~20:25; the validator follows these)
1. New co-op kind `pair_gate` for team doors (counts as a co-op link in no-softlock and coverage).
2. New kinds `team_rope` (co-op) and `rappel` (solo, one way by default). Hang-down stays `drop`; jam-and-pass is an
   `assist` reason, not a kind.
3. Connectors are single `spine` links (not spaces). For pacing, every `spine` link counts as a release (tension 1).
4. `length` is middle-to-middle walking length; V1 adds nothing per space (A5's half long side is dropped).
5. A split leg or reach path through a link with no walking speed (climb, crawl, co-op move, `team_rope`, `rappel`)
   and no `time_s`: WARN, never a silent walking-speed guess.
6. `open` ceilings (`yard`) and `exterior` spaces skip the ceiling range check and the 3.0 m ceiling WARN.
7. The split-leg time rule and dead-end depth are as written in "How the checks read the graph" (V1 matches them).

## Tags

| Tag | On | Meaning | Rules |
| --- | --- | --- | --- |
| `start` | space | Where the players begin (one per map) | checkReach root |
| `exfil` | space | Extraction | ERR not reachable by two players; checkSpine end |
| `objective` | space | A mission objective | ERR not reachable by two players |
| `checkpoint` | space | Restart point | info |
| `reward` | space | Intel, gear, secondary objective | allows a dead end |
| `entry`, `exit` | space | The section's first and last space (one each per section) | checkRedundancy: ERR fewer than 2 edge-disjoint routes entry -> exit inside the section (M3); the `spine` link joins one section's `exit` to the next section's `entry` |
| `split:<id>:a`, `split:<id>:b` | space | The spaces of leg a / leg b of split `<id>`, in walking order (file order) | checkCoop |
| `overwatch:<id>` | space | The spot from which one partner sees and covers the other's leg (may be a leg space) | ERR a split with none |
| `teach:<move>` | space | The move this space teaches (free text from the map's teach list, so a move with no link kind counts: the jam relay, the console loop) | checkTraining, `training` only: a teach element, counted for the space's own section only |
| `sync_pair` | space | A guard pair for a synced takedown (two ordinary takedowns timed together) lives here | co-op coverage evidence (design doc) |
| `unavoidable` | space | A guarded encounter space the players cannot go round on the way to the section's exit or objective (G303) | WARN when the section's exit and objectives are reached around it; `sector`: WARN when no space has it |

## How the checks read the graph

- **Reach (checkReach).** Every space, every `objective` and `exfil` is reachable from `start` over all links (ERR).
  Then per mode (level-design 11.6): `sector`, no softlock: every space a co-op link reaches is also reachable without
  co-op links (ERR; a `bolted` door or a `vent_unlock` opens for one player only from its `to` side), so a downed or
  solo player is never stranded (G280). `campaign`, gate reach: every co-op link has a way back from its `to` to its
  `from` over solo links (a passed two-way gate - `pair_gate`, `shutter`, `plank_bridge`, `deadweight`, `vent_unlock` -
  and an unbolted door count) within `reach_max_s` at
  `reach_speed_mps` (`time_s`, else `length` / speed) (ERR none or too slow; WARN when only links with no `time_s` make
  it). `training`: neither. Solo completability is not checked (A1; G2, G50).
- **Forced co-op gate (checkRedundancy, `campaign`).** In each section, the solo links inside it (no co-op kind, no
  `spine`; a `bolted` link or a `vent_unlock` only from its `to` end) must not join its `entry` to its `exit` (ERR:
  "every campaign section forces a co-op traversal move", G292). A campaign section whose `entry` is its `exit` has no room for a gate (ERR).
- **Spine (checkSpine).** Each `spine` link joins consecutive sections (ERR otherwise); removing any section's spaces
  disconnects `start` from `exfil` (ERR: a route skips a section). Loops live inside sections.
- **Encounter spaces (checkEncounters).** Approaches = links other than `spine` that can enter the space (a one-way
  link counts only at its `to` end), from a space that can be entered by a link from somewhere else (a door to a side
  room entered only from this space is no approach). `campaign` and `sector`: ERR fewer than 3 approaches or fewer than
  2 route kinds; ERR missing any of `shadow`, `high`, `loud`; WARN `secret` in fewer than half of the guarded spaces.
  Routes cross: in each section the route kinds used between entry and exit share at least one space (ERR). `training`
  skips these and the two-routes-per-section check (one route, G292); a late section that keeps a side route runs the
  route rules on itself (Training, below).
- **Dead ends.** A space with at most one way out (not `start` / `exfil`) is ERR unless it is tagged `reward` or
  `objective` (or typed so) and `size[1]` <= 15 m (level-design 3.4, 16.6.3). Ways out are links, not neighbours: two
  ladders to one hall are a loop; a one-way link is a way out only at its `from` end (a drop in is none).
- **Splits (checkCoop).** A leg's time = the link into its first tagged space + the links between its tagged spaces +
  the fastest non-co-op link out of its last tagged space to the rejoin space (the first space both legs reach), each
  as `time_s`, else `length` / 1.3. ERR a leg over 90 s; ERR legs more than 20% apart (M4: time, not room length);
  ERR no `overwatch:<id>`; ERR no `assist: "<id>"`. Partner reach: the shortest path over non-co-op links from any
  space of leg a to any of leg b, `time_s` else `length` / 3.0, ERR above 15 s. It is measured from every space of one
  leg to the nearest space of the other leg (the worst such space counts), not to every point of the other leg as
  level-design 11.6 could be read: legs up to 117 m long cannot all lie within 45 m of each other.
- **Co-op coverage.** A co-op link (`coop_boost`, `human_ladder`, `pair_gate`, `team_rope`, `team_throw`, `team_hang`,
  `team_pull`, `shutter`, `vent_unlock`, `plank_bridge`, `deadweight`, `chimney_pair`, `swing_pass`, `drop_catch`)
  touches at least half of the encounter spaces (ERR) and at least one space in every section (ERR). Not checked on
  `training`: each Marlow exercise forces the move it teaches (G392).
- **Solo twins (checkCoop).** A co-op link is a solo twin when one player can make the same move: a solo link from its
  `from` to its `to`, or a solo path there that does not pass the target, on the co-op link's own `route` and no
  longer than its `length` (a longer solo route, or one on another route kind, is the no-softlock alternative; a direct
  solo link with no `length`, or beside a co-op link with none, counts). The move runs `from` -> `to` (a climb's foot
  to its top); a two-way gate (`pair_gate`, `shutter`, `plank_bridge`, `deadweight`) is judged both ways; a `bolted`
  link or a `vent_unlock` twins only from its `to` end. ERR on a `campaign` map (two players only, G2); WARN on Sector
  Ops (G185: solo completes; G280: team doors stay two-player); INFO on `training` (A7). The message names both links
  (campus CR7: the `team_rope` beside the `drop`).
- **Pacing (checkPacing).** Over the spine order of spaces; see `tension`.
- **Dimensions (checkDimensions).** Every `size`, `width`, `height`, `length` on the 0.5 m grid (WARN); class and kind
  rules above, the co-op kit bands included (scale-sheet section 3); ERR any `level_change` over 0.40 up to 0.45 (the
  step band: player 0.42 vs nav 0.45 disagree; a 0.40 curb passes).
- **Guard counts.** Per encounter space and player count: WARN below the early / late band (`training`: INFO), no upper
  limit (Michael 2026-10-24: as many as realistically possible, bounded by the guard-cap perf floor). `sector` and
  `campaign` (the campaign runs on the Sector Ops runtime): per section and player count, the spaces' counts sum to at
  most `sector_alive_max` (ERR; G187; campaign: G359). The training spawn cap
  (`SET_GUARDS_MAX` 3 per set, level-design 12.1) is checked against the guard sheets.
- **Unavoidable guards (checkEncounters).** A space tagged `unavoidable` must stand on every way (two players, all
  links) from its section's `entry` to the section's `exit` or objectives; WARN when they are reached around it, or when
  it is not a guarded encounter space. `sector`: WARN when no space is tagged (G303).
- **Training (checkTraining, `training` only).** `meta.taught_by` is ERR on a map of any other mode. A teach element is
  a link `teach` field or a `teach:<move>` space tag (a `teach` that is not text: ERR). Routes are counted per section
  on its interior (`sectionRoutes`): the section's spaces and the links with both ends in it, no `spine` link; each
  split's leg spaces merged into one node; a link is a step both ways unless it is one-way, and steps between the same
  two nodes in the same direction count once; routes are the simple paths from the section's `entry` to its `exit`
  (no space entered twice), counted up to 10 ("10+"); a section without exactly one `entry` and one `exit` has none.
  Up to and including the `taught_by` section each section is one guided route. ERR 2+ routes (a side route); ERR a
  `split:` tag; ERR no teach element; ERR a teach element that some entry-to-exit path avoids (take it away and the
  `exit` is still reached; a teach on the `entry` or `exit` space cannot be avoided). After it, a section with 2+
  routes needs a guarded encounter space (an encounter space with guards at some player count; ERR), and then the
  campaign route rules run on that section alone as ERR: 3+ approaches, 2+ route kinds, `shadow`, `high` and `loud`
  approaches, routes cross. A section whose only second way is a split has one route and needs neither. Two known
  limits: a teach on a link between two sections counts for neither section (interior only); the route rules of a late
  section run on a one-section subgraph without the links that enter the section, so an entry space whose only interior
  link leads into a guarded encounter space is not counted as an approach there (the full-graph rule would count it;
  no graph hits this today).
- **Perfect run (checkPerfect).** Two players, every link kind. The no-kill path (no `requires_kill` link) and the
  ghost path (also no `loud` link: the loud route is the nearest graph fact to "no alarms", G146) must run from `start`
  to every `objective` and on to the run's end: the `exfil` spaces on a `campaign` map, the last section's `exit` on
  Sector Ops and `training`. A missing no-kill path is ERR in every mode; a missing ghost path is ERR on `campaign` and
  `sector`, INFO on `training` (every section is one route, so a forced section cannot route round a `loud` link). A
  target with no no-kill path is reported once, by the no-kill line. `requires_kill` must be true or false (ERR). A
  `mark` on a space or link: ERR each on `campaign` and `sector`; on `training` one INFO count (G290, G339, G292). One
  known limit: each objective's reach from `start` and its way on to the end are checked separately, not as one tour, so
  two objectives in separate one-way branches both pass (two players can split).
- **Engine facts (checkEngine).** A space more than `rules.nav_floor_depth_m` below storey 0 that is an encounter space
  or has guards is a WARN: the guards' nav grid does not reach that deep (level-design 12.1). The key is read only when
  such a space exists; a missing key prints one WARN and skips the check. An `exception` on any link kind but
  `team_throw` is ERR here (the `team_throw` check of `checkDimensions` judges the value).
- **Measured values (checkMeasured).** The `measured` values `level-measure` writes ("Schema additions") are held to
  the same limits as the declared targets (numbers: scale-sheet section 8, `docs/design/metrics.json`). Shadow share is
  information only, in every mode (G329, BRIEF A4); a measured value over its limit (vantage, LOS break, split legs,
  reach, way back) is an ERR (G285 (d)), and one apart from its declared target is a WARN or INFO, as the table says. A
  `null` is "not measured": it prints a WARN only for a split's `reach_s` and a way back's `back_s` (a move the nav grid
  does not model, which the design doc must justify, with the declared time still checked by the core, lead answer L2);
  any other `null` prints nothing, and under `--require-measured` a `null` `a_s`, `b_s` or way back counts as missing.
  Presence is a gate: without `--require-measured` a missing value is INFO or
  nothing, with it (the greybox exit gate, level-design 14) a missing value is an ERR (BRIEF A5, V2).

  | Check | Severity |
  | --- | --- |
  | Encounter space with no `measured` | INFO "pending V6"; ERR under `--require-measured` |
  | Measured `sees_pct` below `vantage_min_frac` (encounter) | ERR |
  | Measured `los_break_s` over `los_break_max_s` (encounter) | ERR |
  | Measured `shadow_pct` outside `shadow_min_frac` - `shadow_max_frac` (encounter) | INFO, every mode, flag or not |
  | Measured `shadow_pct` apart from the declared one by more than 0.10 | INFO |
  | Measured `sees_pct` (0.10), `los_break_s` (1.5 s) or link `time_s` (1.5 s) apart from the declared value | WARN (update the declared target) |
  | Measured value that is not a number (null = not measured) | ERR |
  | Split `a_s` / `b_s` over `split_max_s`, or apart by more than `split_parity_pct` | ERR |
  | Split `reach_s` over `reach_max_s` | ERR |
  | Split `reach_s` null | WARN; the core's declared reach check still runs |
  | Declared split with no `meta.measured.splits.<id>`, or no `a_s`, `b_s` or `reach_s` | ERR under `--require-measured` |
  | `meta.measured.splits.<id>` naming no split | WARN |
  | Campaign co-op link with no matching `ways_back` entry (from / to / kind) | ERR under `--require-measured` |
  | Campaign way back with no `back_s` on a link that is not a two-way gate | ERR under `--require-measured` |
  | `meta.measured.ways_back` that is not a list, or an entry in it that is not an object (campaign) | ERR |
  | Way back `back_s` over `reach_max_s` | ERR (not on a two-way gate: a passed `pair_gate`, `shutter`, `plank_bridge`, `deadweight` or `vent_unlock` is its own way back, as in the core gate reach) |
  | Way back `back_s` null | WARN with its `why` (not on a two-way gate, which only needs its entry); the core's declared way back still runs |
  | `ways_back` entry naming no co-op link | WARN |

  The 0.10 and 1.5 s drift tolerances are tooling constants in `scripts/level-checks/measured.mjs`, not level numbers.
  Split legs, partner reach and gate reach in the core read a link's `measured.path_m` first (A6, `linkTime`).

## Estimating the targets before geometry (M4, A8)

The graph is written before any geometry, so `sees_pct` and `los_break_s` (and the optional `shadow_pct`) are the
designer's declared targets, not measurements. Write the number you are designing for, and say in the design doc how
the layout delivers it. V6 (greybox measurement) samples the light bake, the nav grid and nav-grid path times and
writes `measured` beside each target (`scripts/level-measure.mjs`; `npm run level-measure`);
`checkMeasured` fails the map if a measurement misses its target ("Schema additions", "How the checks read the graph").

- **`shadow_pct`.** Sketch the lit pools: each working fixture lights roughly a circle of radius 1.5 x its mount height;
  sum the lit area over the floor area (`w x l`), shadow = 1 - lit. Information only (INFO): the light target is the
  real-world band of the space type (scale sheet section 9).
- **`sees_pct`.** From the vantage, count the floor the eye reaches over cover: a high vantage (>= 3 m above the floor)
  over cover <= 1.8 m sees most of an open floor; tall racks, pods and partitions hide their back sides. Do not
  declare more than you can draw as a view cone on the plan.
- **`los_break_s`.** The worst point on any stealth route through the space: metres to the nearest full-height cover,
  a door or a dark pocket, divided by 3.0 m/s (run). 5 s = 15 m; cover every 8 m keeps it near 3 s.
- **Partner reach and split times** come from `length` / `time_s`, so measure them on the plan, not by eye. Climbs:
  about 1 s per metre of ladder plus the walk; a co-op boost about 4-6 s.

## Schema additions (V6 greybox measurement)

Source: V6 (`docs/archive/level-validator/V6-PLAN.md`, "Schema additions" and "Measurement definitions"). Every field
here is OPTIONAL: a graph without them stays valid. An encounter space with no `measured` prints "pending V6" until the
greybox exit gate (`--require-measured`, level-design 14) asks for it. Coordinates are world metres `[x, y, z]`, y up; a
box is `[minX, minZ, maxX, maxZ]`. `measured` is written by `scripts/level-measure.mjs` (`npm run level-measure`), never
by hand. What the validator checks in it: "How the checks read the graph".

| Field | On | Type | Meaning |
| --- | --- | --- | --- |
| `area` | space | string or `[minX, minZ, maxX, maxZ][]` | Where the space is: a RoomDef id of the map's rooms (`"gatehouse"`, `src/world/rooms.ts`; box and `minY` / `maxY` from code), or a list of boxes (L-shapes, route surfaces with no RoomDef). Floor cells = walkable nav cells inside it within 1.0 m of `storey`. Needed by the measure tool on encounter and split-leg spaces |
| `vantage.at` | space | `[x, y, z]` | Vantage feet point. Absent: the tool picks the best cell of the `from` space at 1 m stride and writes it to `measured.vantage_at` (the designer pins it after) |
| `at` | link | `[x, y, z]` | The opening / door point the link passes. Absent: the walkable cell on the shared edge of the two `area`s nearest both centres (ERR in the measure report when that edge has 2+ gaps) |
| `measured` | space | `{ shadow_pct, sees_pct, vantage_at, los_break_s, cells, geom }` | Measured values beside the declared targets; `cells` = floor cell count |
| `measured` | link | `{ time_s, path_m }` or `{ time_s: null, why }` | Nav-path time and length; `null` + `why` for a kind the nav grid does not model, or a drop / ladder off the nav |
| `meta.measured` | meta | `{ tool: "level-measure 1", date, geom, splits, ways_back }` | Run stamp, the per-split measured leg times and partner reach, and the campaign way backs |
| `meta.measured.splits.<id>` | meta | `{ a_s, b_s, reach_s }` | Measured leg times (`null` when a leg is not timed) and partner reach (`null` when no nav path) of split `<id>` |
| `meta.measured.ways_back` | meta (campaign) | `[{ from, to, kind, back_s, path_m }]`, or `{ from, to, kind, back_s: null, why }` per entry | One per co-op link, in graph order: the solo nav time from the link's `to` floor back to its `from` floor at `reach_speed_mps` (level-design 11.6). Written on campaign graphs only |
| `geom` | `measured`, `meta.measured` | string | Canonical light-shape hash (`canonicalLightSet(...).hash`) + nav input hash: stale detection |

**Multi-file maps (one file per section).** The tool measures the merged map once and writes to each file its own
`meta.measured` block: `tool`, `date`, `geom`, the splits whose leg spaces that file holds, and the `ways_back` of the
co-op links that file owns (in merged link order). `mergeGraphs` combines the blocks back into one: `tool`, `date` and
`geom` from the first file that has them, `splits` unioned, `ways_back` joined in file order. A map whose files carry
no `measured` merges as before.

Measurement definitions (one line each; full text in V6-PLAN.md; numbers from `docs/design/metrics.json`):
- **Shadow** (`shadow_pct`): share of floor cells where `LightField.bodyLevel(x, h, z, 1.7)` is below `LIGHT.shadow`,
  doors open.
- **Vantage** (`sees_pct`): share of floor cells that `SightWorld.clear(vantage eye at +1.55, cell + 1.0)` sees within
  25 m; light ignored.
- **LOS break** (`los_break_s`): worst flow-field time from a lit, observed floor cell to the nearest unexposed cell
  (space + 6 m), at the reach speed.
- **Reach** (`splits.<id>.reach_s`): worst flow-field time between the two legs' floor cells, both ways, at the reach
  speed; null when no nav path.
- **Links** (`time_s`): `findPath` from the `from` centre through `at` to the `to` centre, length / `split_speed_mps`;
  off-nav kinds, and a `drop` or `ladder` whose path takes no nav link (the guard nav links only 1.0-2.2 m drops), get
  `null` and the declared `time_s` stays. The partner reach check re-times a measured link at the reach speed from
  `path_m`.

## Rule coverage (rule -> field)

| Rule | Field(s) | | Rule | Field(s) |
| --- | --- | --- | --- | --- |
| Snap grid | `size`, `width`, `height`, `length` | | Rule of three | links per encounter, `route` |
| Player size | info only (no field) | | Routes cross | `route`, `entry` / `exit`, `section` |
| Single / double door, wide opening, vehicle door | `kind`, `width`, `height` | | Dead ends | `tags` (`reward`, `objective`), `size` |
| Corridor | `kind: corridor` + `width`; `room_class: corridor` + `size` | | Topology (spine) | `meta.sections`, `section`, `route: spine` |
| Stairs | `fire_stair` / `open_stair` `width` (rise / run: design doc) | | 2+ independent routes | `entry`, `exit`, `section` |
| Vent / crawlspace | `duct` / `tunnel` `width`, `height` | | Solo completability | dropped (A1); 2-player reach from `start` |
| Ceiling | `size[2]`, `room_class` | | No softlock (`sector`), gate reach (`campaign`) | co-op `kind`s, `one_way`, `length`, `time_s` |
| Step / curb | `level_change` | | Co-op coverage | co-op `kind`s, `section` |
| Above 2.0 m needs help | `kind` + `level_change` | | Split parity, split length | `split:<id>:*`, `length`, `time_s` |
| Split-jump corridor | `split_jump` `width`, `height` | | Overwatch | `overwatch:<id>` |
| Safe drop | `drop` `level_change` | | Partners act for each other | `assist` |
| Room-class sizes | `room_class`, `size`, `type` | | Reach a downed partner | split tags, `length`, `time_s` |
| Cover spacing | design doc (not in the graph) | | Space for two | `shared`, `width` |
| Patrol loops | design doc / guard sheets (not in the graph) | | Beat pacing | `tension`, spine order |
| Guards per space | `guards`, `phase` | | Shadow (INFO), light band | `shadow_pct` (+ V6 `measured`); band: scale sheet 9 |
| Observation point | `vantage` (every guard in one cycle: design doc) | | LOS break | `los_break_s` (+ V6 `measured`) |
| Taught by, teach elements | `meta.taught_by`, link `teach`, space tag `teach:<move>` | | Perfect run | `requires_kill`, `route: loud` |
| Markers | `mark` | | Long throw | `exception`, `width` |

## Campus conventions

The campus graphs (`docs/sector-redesign/graph/`) follow `docs/level-validator/campus-run/CONVENTIONS.md`: storeys,
connectors as `spine` links, posted choke guards, dogs, and what stays out of the graph.

