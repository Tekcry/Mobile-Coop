# Kestrel plan files - schema
Status: DRAFT (P03 Parts A to C)

Three JSON files describe the map before any code: `kestrel.arch.json` (the building), `kestrel.play.json` (the play layer, filled by P06-P08) and `kestrel.security.json` (the security devices, shape from S0 section 6). `scripts/kestrel/plans.mjs` draws them, `scripts/kestrel/check.mjs` checks them. Every number a tool tests comes from `scripts/kestrel/facts.json`.

## 1. Conventions
- Metres. A point is `[x, z]`; north is +Z, east is +X, up is +Y (00-facts section 2). Origin is the south-west corner of the site at ground floor level.
- A play point is `[x, z, "L"]` where `L` is a level id. A 3D point (lamp, switch, beam end, service path) is `[x, y, z]`; `y` is the height above its own level's floor, except in `exterior` and `services`, where `y` is absolute (ground floor = 0).
- Level ids: `B` basement, `G` ground, `F` first, `S` second (only if the building brief proves it), `R` roof.
- `rect = [x0, z0, x1, z1]` with `x0 < x1` and `z0 < z1`. Room and wall rects are wall-centreline (RULES section 6); clear size = rect minus half of each wall's thickness.
- Yaw degrees: 0 faces +Z (north), 90 faces +X (east).
- Every coordinate except object edges sits on `meta.grid` (0.5 m). Object edges sit on `meta.objectGrid` (0.1 m).
- An opening's `at` is the distance from wall end `a` to the opening's centre, along the wall.
- `ring` is one of `1, 2, 3, "3+", 4, 5` (zones of the building brief section 11: S1 = 1, S2 = 2, S3 = 3+, S4 = 3, S5 = 4, S6 = 5). `"3+"` counts as one step above `3`.
- The tools assume walls run along the X or Z axis, and a stair is one straight run in the `up` direction (A01, A11).
- Edges of a rect, for a room's `open` list: `"W"` (x0), `"S"` (z0), `"E"` (x1), `"N"` (z1).

## 2. Architecture (kestrel.arch.json)
```json
{
  "meta": { "id": "kestrel", "version": 1, "grid": 0.5, "objectGrid": 0.1, "entry": [0, 0], "bay": [6, 6], "site": [0, 0, 60, 45], "footprint": [0, 0, 0, 0] },
  "levels": [ { "id": "G", "name": "Ground", "floor": 0, "height": 3.3 } ],
  "rooms": [ { "id": "G01", "level": "G", "name": "", "kind": "room|corridor|stair|shaft|plant|yard|lane|roof|zone", "rect": [0, 0, 0, 0], "ceiling": 3.0, "finish": "", "minShort": 3.0, "open": [], "ring": 3, "module": "" } ],
  "walls": [ { "id": "W001", "level": "G", "a": [0, 0], "b": [0, 0], "t": 0.3, "h": 3.0, "kind": "interior|exterior|boundary|parapet|balustrade" } ],
  "openings": [ { "id": "D001", "wall": "W001", "at": 0, "w": 1.2, "h": 2.1, "sill": 0, "type": "door|double|fire-door|window|arch|roller|hatch|gate|grille", "between": ["G01", "G02"], "locked": false, "key": "", "reason": "" } ],
  "stairs": [ { "id": "S01", "kind": "main|fire|feature|bulkhead", "from": "G", "to": "F", "rect": [0, 0, 0, 0], "up": "N|S|E|W", "width": 1.3, "risers": 20 } ],
  "ladders": [ { "id": "L01", "room": "B02", "at": [0, 0], "from": "B", "to": "G", "facing": "N|S|E|W", "reason": "" } ],
  "voids": [ { "id": "V01", "level": "F", "rect": [0, 0, 0, 0], "kind": "stairwell|liftshaft|riser|hatch|rooflight", "reason": "" } ],
  "objects": [ { "id": "O001", "level": "G", "name": "", "rect": [0, 0, 0, 0], "h": 1.2, "y": 0, "noLedge": false, "reason": "" } ],
  "exterior": [ { "id": "E001", "kind": "downpipe|stringcourse|sill|fire-escape|lamp-post|gate|fence|parapet|pipe", "a": [0, 0], "b": [0, 0], "y0": 0, "y1": 0, "climbable": false, "reason": "" } ],
  "services": [ { "id": "SV01", "kind": "cable|power|air|water|drain|heat", "path": [[0, 0, 0]], "size": [0, 0], "reason": "" } ]
}
```
| Field | Meaning |
| --- | --- |
| meta.id, version | Map id (`kestrel`) and file version, bumped on every approved change |
| meta.grid, objectGrid | Grid for walls, rooms and openings (0.5) and for objects (0.1) |
| meta.entry | `[x, z]` just inside the site gate, where the early builds start the player |
| meta.bay | Structural bay `[x, z]` in metres; the plan draws a grid line on every bay |
| meta.site | Site rect (RULES section 2 limit 80 x 60) |
| meta.footprint | Building footprint rect (limit 48 x 30) |
| levels[].id, name | Level id (B, G, F, S, R) and its name |
| levels[].floor | Floor height above ground floor level, in metres |
| levels[].height | Floor-to-floor height of that level |
| levels[].footprint | Optional rect `[x0, z0, x1, z1]` the level must be fully built over (A14); inside `meta.footprint` (A21). Default is `meta.footprint`. Use it when a floor covers only part of the building (first floor over the front block only) |
| rooms[].id, level | Unique room id and its level |
| rooms[].name | Name used on the plan label |
| rooms[].kind | What the space is; `ladder` is allowed only in `plant` or `shaft` rooms |
| rooms[].rect | Wall-centreline rectangle |
| rooms[].ceiling, finish | Ceiling height and floor finish (gravel, linoleum, carpet; level-design 16.8.3) |
| rooms[].minShort | Minimum clear short side this room must keep |
| rooms[].open | Edges (`"W"`, `"S"`, `"E"`, `"N"`) left with no wall |
| rooms[].ring | Security zone of the room (see conventions) |
| rooms[].module | Module-kit module the room came from, or empty |
| rooms[].service | Optional. True for a service room (the brief marks WCs, cupboards, risers, the mantrap and the like). A07 asks only that its doors fit inside the wall |
| rooms[].zone | Optional. Space id (S1-S6) the room belongs to; set by the module kit |
| gen, manual | Optional on rooms, walls, openings, objects, stairs, ladders and voids. `gen` is the placement id that made the item (section 7); `manual: true` keeps the item through a re-run |
| openings[].ringExempt | Optional text. Exempts the opening from A29; only for the carriers' entrance |
| walls[].id, level | Unique wall id and its level |
| walls[].a, b | Centreline end points `[x, z]` |
| walls[].t | Thickness: exterior 0.45, interior 0.30 |
| walls[].h | Wall height above the level floor |
| walls[].kind | Wall type; `parapet` and `balustrade` are low edge walls |
| openings[].id | Unique opening id |
| openings[].wall | Wall id the opening sits in |
| openings[].at, w | Centre distance from wall end `a`, and clear width |
| openings[].h, sill | Opening height and sill height above the floor |
| openings[].type | Door, double door, fire door, window, arch, roller door, hatch, gate or grille. A `fire-door` is exit-only: no handle on the lower-zone side (SC02) |
| openings[].between | The two room ids it joins; an empty string means outside |
| openings[].locked, key | Whether it is locked and which key or card opens it |
| openings[].reason | Who uses it and why it is there (level-design 16.3.1) |
| stairs[].id, kind | Unique id; main stair, enclosed fire stair, open feature stair or roof bulkhead |
| stairs[].from, to | Lower and upper level ids |
| stairs[].rect | Plan rect of the whole stair including landings |
| stairs[].up | Direction of climb on the plan |
| stairs[].width | Clear stair width |
| stairs[].risers | Total risers: floor-to-floor / 0.165, rounded |
| stairs[].layout | Optional. `dogleg`: two flights side by side with a landing between them at the far end (A11 sizes it: each flight at most the per-flight maximum, the rect `(risers/2 - 1) * going + landing` long and two flight widths wide; the landing is 1.3 m for a `fire` stair, 2.0 m otherwise). Default is one straight run |
| stairs[].flights | Optional (straight runs only). Number of straight flights; default is the fewest that keep each flight at or under the per-flight maximum (A11) |
| ladders[].id, room | Unique id and the plant or shaft room it stands in |
| ladders[].at | `[x, z]` of the ladder foot |
| ladders[].from, to | Level ids it joins |
| ladders[].facing | Side the climber faces |
| ladders[].reason | Why a ladder and not a stair |
| voids[].id, level | Unique id and the level whose floor has the hole |
| voids[].rect, kind | Hole rect, and what it is (well, shaft, riser, hatch, roof light) |
| voids[].reason | Why the floor is open here (level-design 16.3.2) |
| objects[].id, level | Unique id and level |
| objects[].name | The real object (rack, transformer, skip) |
| objects[].rect | Footprint on the 0.1 m grid |
| objects[].h, y | Height of the top above `y`, and `y` (base height above the floor) |
| objects[].noLedge | True if the top must not become a hangable lip |
| objects[].reason | Why the object is at that spot |
| exterior[].id, kind | Unique id and the kind of exterior element |
| exterior[].a, b | End points `[x, z]`; equal for a point element |
| exterior[].y0, y1 | Absolute bottom and top height |
| exterior[].climbable | The same value for every element of one kind (A23) |
| exterior[].reason | Why it is there |
| services[].id, kind | Unique id and the service carried |
| services[].path | Route as `[x, y, z]` points (absolute y) |
| services[].size | Cross-section `[w, h]` |
| services[].reason | What it serves |

## 3. Play (kestrel.play.json)
```json
{
  "spaces": [ { "id": "S1", "name": "", "beat": 2, "rooms": ["G03"], "teaches": "", "combines": [], "tension": 3, "vantage": "VP1", "exit": [0, 0, "G"], "checkpoint": "CP1" } ],
  "routes": [ { "id": "S1-shadow", "space": "S1", "kind": "shadow|high|loud|secret|coop|critical|exfil", "points": [[0, 0, "G"]], "uses": [] } ],
  "vantages": [ { "id": "VP1", "space": "S1", "at": [0, 0, "G"] } ],
  "hides": [ { "id": "H1", "space": "S1", "at": [0, 0, "G"], "kind": "recess|locker|dark|under" } ],
  "traversal": [ { "id": "T1", "kind": "ladder|drainpipe|pipeH|ledge|split|wallJump|rappel|fence|vault|mantle|window|duct", "element": "E001", "approach": [0, 0, "G"], "top": 0, "check": "" } ],
  "checkpoints": [ { "id": "CP1", "at": [0, 0, "G"] } ],
  "lamps": [ { "id": "LP1", "fixture": "", "owner": "", "room": "G03", "at": [0, 0, 0], "circuit": "C1", "params": {} } ],
  "circuits": [ { "id": "C1", "switch": { "at": [0, 0, 0], "wall": "W001" }, "lamps": ["LP1"], "unswitchable": "" } ],
  "surfaces": [ { "room": "G03", "kind": "" } ],
  "guards": [ { "id": "GD1", "kind": "", "employer": "", "job": "", "space": "S1", "loop": [ { "at": [0, 0, "G"], "wait": 4, "face": 0 } ], "cycle": 0, "isolation": { "at": [0, 0, "G"], "t": 0 } } ],
  "lures": [ { "id": "LU1", "source": "", "guard": "GD1", "sendsTo": [0, 0, "G"] } ],
  "spawns": [ [0, 0, "G"] ],
  "objectives": [ { "id": "OBJ1", "kind": "", "room": "", "at": [0, 0, "G"], "optional": false, "order": 1, "requires": [], "unlocks": [] } ],
  "extraction": { "level": "G", "rect": [0, 0, 0, 0] },
  "coop": [ { "id": "CO1", "kind": "boost|ladder", "wall": "W001", "at": [0, 0, "G"], "lip": 0, "top": "R01", "soloWay": "route id" } ],
  "radio": [ { "id": "RD1", "trigger": "", "speaker": "", "line": "" } ]
}
```
| Field | Meaning |
| --- | --- |
| spaces[].id, name | Encounter space id (S1-S6, exfil) and its name |
| spaces[].beat | Mission beat the space serves (01-mission-brief) |
| spaces[].rooms | Room ids the space covers |
| spaces[].teaches | The one skill or idea the space teaches |
| spaces[].combines | Earlier skills the space asks the player to combine |
| spaces[].tension | Tension level 1-5 |
| spaces[].vantage | Vantage point id where the player can read the space |
| spaces[].exit | Where the space hands over to the next, a play point |
| spaces[].checkpoint | Checkpoint id at that hand-over |
| routes[].id, space | Unique route id and the space it crosses |
| routes[].kind | Shadow, high, loud, secret, co-op, critical (shortest stealth line) or exfil |
| routes[].points | Polyline of play points; a level change is a change of the third item |
| routes[].uses | Element or traversal ids the route relies on |
| vantages[].id, space, at | Vantage id, its space, and the point |
| hides[].id, space, at | Hiding place id, its space, and the point |
| hides[].kind | Recess, locker, dark patch or under cover |
| traversal[].id | Unique id of a planned climb or move |
| traversal[].kind | Which engine move it is (ladder, drainpipe, split jump, wall jump and so on) |
| traversal[].element | Arch element id it uses (exterior, object, wall or ladder id) |
| traversal[].approach | Play point the player starts the move from |
| traversal[].top | Height of the lip or top the move reaches, above the approach floor |
| traversal[].check | The reach or window rule it must meet (fact id) |
| checkpoints[].id, at | Checkpoint id and play point |
| lamps[].id, fixture | Unique lamp id and the real fitting |
| lamps[].owner | Who installed and switches it (level-design 16.8.1) |
| lamps[].room | Room id the lamp is in |
| lamps[].at | `[x, y, z]`, y above the room's floor |
| lamps[].circuit | Circuit id it belongs to |
| lamps[].params | Light parameters (radius, intensity, colour, cone) as `LightInit` fields (F25) |
| circuits[].id | Circuit id |
| circuits[].switch | Where the switch is: `at` `[x, y, z]` and the `wall` id it is on |
| circuits[].lamps | Lamp ids on the circuit |
| circuits[].unswitchable | Empty, or the real reason it has no switch (photocell, emergency, cage) |
| surfaces[].room, kind | Room id and its floor sound surface |
| guards[].id, kind | Unique guard id and the guard kind (F20) |
| guards[].employer, job | Who pays the guard, and what the guard is doing (level-design 16.8.2) |
| guards[].space | Space id the guard belongs to |
| guards[].loop | Patrol stops in order: `at` point, `wait` seconds, `face` yaw in degrees |
| guards[].cycle | Seconds for one full loop |
| guards[].isolation | The point and time `t` (s) at which the guard is alone and can be taken |
| lures[].id, source | Lure id and what causes it (cooling trip, thrown item) |
| lures[].guard | Guard id the lure pulls |
| lures[].sendsTo | Point the guard goes to |
| spawns | Player spawn points `[x, z, level]` (1-4 players) |
| objectives[].id, kind | Objective id and its kind |
| objectives[].room, at | Room id and play point where it is done |
| objectives[].optional | True for the two optional objectives |
| objectives[].order | Position in the chain (1-7) |
| objectives[].requires, unlocks | Objective ids needed first, and those it opens |
| extraction.level, rect | Level id and the rect of the exfiltration zone |
| coop[].id, kind | Co-op route id and its kind (boost or ladder) |
| coop[].wall | Wall id the co-op lip is on |
| coop[].at | Play point the team starts from |
| coop[].lip | Lip height above the floor (4.3-4.5, F33) |
| coop[].top | Room id the route reaches |
| coop[].soloWay | Route id a solo player uses to reach the same place |
| radio[].id | Unique radio line id |
| radio[].trigger | What fires it (a zone, an objective id) |
| radio[].speaker, line | Who speaks, and the text (docs/story.md writing rules) |

## 4. Security (kestrel.security.json)
Shape and field rules are S0-security-spec.md section 6; they are not repeated here. Summary of the three top-level lists:
```json
{
  "devices": [ { "id": "cam-lobby-1", "kind": "camera|desk|panel|reader|mantrap|iris|beam|pir|fault", "level": "ground", "at": [0, 0], "y": 3.0, "facing": 0, "sweep": [0, 0], "room": "", "reason": "" } ],
  "zones": [ { "id": "secure", "rooms": ["mantrap"], "secure": true } ],
  "cards": [ { "id": "card-mgr", "opens": ["rd-ops"], "heldBy": "g-s2-manager" } ]
}
```
| Field | Meaning |
| --- | --- |
| devices[].id, kind, level, room | Unique id, device kind, level (id such as `G` or name such as `ground`) and room |
| devices[].at, y | `[x, z]` and mount height above the floor |
| devices[].facing, sweep | Yaw of a camera, and its yaw range when it sweeps |
| devices[].a, b | Beam ends as `[x, y, z]` |
| devices[].door, door2 | Opening id(s) a reader, iris or mantrap controls |
| devices[].feeds, controls | Cameras a desk shows; cameras and beams a panel switches |
| devices[].enrolled, responders, lamp, minPlayers | Iris enrolment, fault responders, PIR lamp id, minimum players (S0 section 6) |
| devices[].reason | Why a real operator put it there |
| zones[].id, rooms, secure | Zone id, its room ids, and whether it is the secure zone |
| cards[].id, opens, heldBy | Card id, reader ids it opens, and the guard, civilian or object that holds it |

## 5. Plan renderer (scripts/kestrel/plans.mjs)
`node scripts/kestrel/plans.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--out docs/kestrel/plans]` writes, for each level `L`:
- `L.svg` and `L.png`: the architecture only.
- `L-play.svg` and `.png` with `--play`: the same plan with routes, guard loops, lamps, vantages, hides, objectives, spawns, checkpoints, lures, co-op points and the extraction zone on top, plus the security devices when `--security` is also given.
- `L-security.svg` and `.png` with `--security`: the architecture plus the security devices.

Drawing conventions the renderer chose where this schema is silent:
- A door's leaf is hinged at the `a` end of its opening and swings toward `between[1]` (toward the left of the wall direction when that room is empty or unknown).
- A stair is hatched on its `from` level with an UP arrow and drawn dashed with a DN arrow on its `to` level; a ladder is drawn on both its levels.
- An exterior element or service is drawn on every level whose height span it touches.
- An object id that does not fit inside the object (each rack of a row) is left off the plan.
- A room label that does not fit inside its room clear of the stairs, voids and objects (for example a stair core filled by its stair) goes to a callout column right of the site, with a leader line to a dot in the room.

## 6. Checker (scripts/kestrel/check.mjs)
`node scripts/kestrel/check.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--register docs/kestrel/04-plans.md]` prints one line per check (PASS, WARN, FAIL, SKIP or INFO) and indented lines for each violation, then the counts. It exits 1 if any check FAILs. A check that needs a fact missing from facts.json prints SKIP (no fact). Tests: `node --test scripts/kestrel/check.test.mjs`.
- Architecture: A01-A30 (A24 needs `--register`; A30 runs only when a room has a `module`). A19 is an INFO table, A10, A16, A18 and A27 only WARN.
- A07: every opening sits inside its wall. The 1.5 m corner rule (near edge clear of the wall end) applies only when the opening joins a corridor or a room at play-space size (clear short side of `room.playSpaceMin` or more, not marked `service`); a service room, or a room under play-space size, only needs the opening to fit inside the wall.
- A11: a straight run needs `(risers - flights) * going + (flights - 1) * midLanding` along `up`; a `dogleg` stair is sized as described under `stairs[].layout`.
- A28: every room has a ring. A29: an opening of a passable type (door, double, fire-door, arch, roller, gate) joins rooms whose rings are one step apart on 1-2-3-4-5 (`kit.ringStepMax`) or equal; ring `3+` is a side room of zone 3 and joins `3` and `3+` only (so 3 to 4 passes, 2 to 3+ and 3+ to 4 fail); exempt are an exit-only `fire-door`, an opening with `ringExempt`, and one touching a room whose module has `carrier: true`.
- A30: (1) every occupied floor (a floor with a room of kind `room` or `corridor`) has a staff WC and a janitor cupboard, found by the module's `provides` or, for a room with no module, by its name; (2) every upper occupied level has an enclosed `fire` stair that serves it and whose stack, going down by overlapping rects, ends on the ground floor in a room with an opening to the outside; (3) from each occupied room, the door route (room centre to door to room centre) to the nearest such stair is at most `escape.oneWay` with one stair reachable, or `escape.twoWay` with two or more; (4) when the plan has a level `R`, at least one such fire stair continues up (fire or bulkhead stairs, overlapping rects) to `R`.
- Security: SC01-SC06 (need `--security`).
- Play: the `// GAMEPLAY CHECKS (P09)` section of check.mjs is empty until P09. `--play` is read now only by A27.
- Fixed in Part C: A06 no longer counts a collinear wall that only lies beside an edge; A26 ignores a gap with a tall object or wall standing across its whole width (a row of racks at the 0.6 m pitch would otherwise fail against itself).
- Where the prompt table is open to two readings the checker uses: an opening must keep its near edge (not its centre) the end-clearance from the wall end; a walkable surface over a cell is a level floor (a room not under a void) or a non-`noLedge` object top at or above the auto-lip height; an upper level must be covered over its own `levels[].footprint` (default `meta.footprint`); a split-jump face is a wall face or a floor-standing object face on one level.

## 7. Module kit (scripts/kestrel/modules.json, expand.mjs)
The architect places real, pre-checked rooms instead of typing walls. `node scripts/kestrel/expand.mjs [--layout docs/kestrel/kestrel.layout.json] [--arch <existing arch>] [--out docs/kestrel/kestrel.arch.json] [--modules scripts/kestrel/modules.json] [--dry]` reads the layout and writes rooms, walls, openings, objects, stairs, ladders and voids into the arch file. `--list` prints every module with its sizes. `docs/kestrel/sample.layout.json` is a 3-module example.

### Layout file (kestrel.layout.json)
```json
{ "meta": { }, "levels": [ ], "placements": [ { "id": "G03", "module": "staff-wc", "size": [5, 4], "level": "G", "at": [2, 6], "rot": 0, "zone": "S4", "ring": 3, "label": "Staff WC" } ] }
```
| Field | Meaning |
| --- | --- |
| meta, levels | Optional. Merged over the arch file's `meta` and `levels` (the layout wins). Needed when there is no arch file yet |
| placements[].id | Unique id. It becomes the room id (an upper-level room of a stair is `<id>.<level>`, or `ids[level]`) and prefixes every wall, opening and object (`G03-W1`, `G03-Dmain`, `G03-O2`) |
| placements[].module | Module id from modules.json |
| placements[].size | `[w, d]` **clear** size, on the grid; one of the module's sizes, or any size on the grid at or above `sizeMin` for a module marked `free`. Default: the module's first size |
| placements[].level | Level id of the base floor |
| placements[].at | `[x, z]` of the south-west corner of the room's wall-centreline rect, on the grid |
| placements[].rot | 0, 90, 180 or 270 degrees clockwise on the plan (north up). Default 0. `at` stays the south-west corner of the turned rect |
| placements[].zone, ring | Override the module's zone (space id) and ring |
| placements[].label | Room name on the plan (default: the module's name) |
| placements[].open | World edge letters (W, S, E, N) left with no wall, as `rooms[].open` |
| placements[].doors | A list of door specs (same shape as modules.json doors) that replaces the module's doors |
| placements[].skipDoors | Keys of module doors to leave out |
| placements[].to | Level id a stair stack climbs to (default: the module's own span) |

### Module file (modules.json)
| Field | Meaning |
| --- | --- |
| id, name, category | Module id, plan name, and the group the prompt lists it under |
| zone, ring | Default space id (S1-S6) and ring |
| kind, ceiling, finish | Copied to the room. `ceiling` is a number or `@fact` |
| sizes | Clear sizes `[w, d]` on the 0.5 m grid |
| free, sizeMin | `free: true` allows any grid size at or above `sizeMin` |
| service | True for rooms the brief tags as service rooms (below the 6 m play-space minimum by function) |
| provides | `staffWC` or `janitor`; A30 reads it |
| carrier | True for the carriers' own path (vault, riser); A29 reads it |
| wallKind | `boundary` makes its walls kind `boundary` (a fence), at the exterior thickness |
| doors | `key`, `side` (S, E, N or W, local), `at` (metres from the south or west end of that side, or `"centre"`; with `"from": "end"` from the other end), `w`, `h`, `type`, `levels` (`all`, `base` or `upper`), `reason` |
| objects | `name`, `size [w, d]`, `h`, `y`, `noLedge` (default: true when the top reaches the auto-lip height), `x` and `z` as `[anchor, gap]` (anchor W, E or C along x; S, N or C along z), `reason`, and `repeat` |
| objects[].repeat | A list of `{ axis, count (n or "fit"), pitch (metres, or "size+@fact"), endGap }`. `fit` fills the room leaving `endGap` free at the far end; rows start at the anchor and run away from it |
| stair | `kind`, `width`, `up` (local direction), `span` (1, or `"roof"`), `roofCeiling`: makes a room per level, a stair and a stairwell void per storey |
| ladder, voidAbove | A ladder from the base level to the next, and a void in the floor of the next level (riser, lift shaft) |
| source | Where the sizes come from. Fixed-content sizes are general knowledge unless a fact id is named |

A `"@a.b"` value is read from facts.json, so door sizes, aisles and rack width stay in one place.

### What expand does
- Local frame: south-west corner 0,0, x east, z north; side S is the entry side. A clear size becomes a rect size = clear + the exterior wall thickness, rounded up to the grid, so the clear room is never smaller than the nominal size.
- Walls: every room edge is a wall. A wall shared by two rooms is one wall (interior thickness); an edge with a room on one side only is exterior; collinear touching walls of the same kind, thickness and height join into one wall. Height is the taller ceiling of the rooms it serves, so a wall splits where the ceiling changes. An edge listed in `open` on every room using it gets no wall.
- Doors: built from the module (or placement) door list at the wall position; `between` is the room and the room across the wall (empty string when none). Two doors overlapping on one wall keep the first, with a warning. A door on an open edge or past the wall end is a warning and is not made. Doors to the outside are listed as INFO.
- Objects stand inside the clear room, rounded inward to `meta.objectGrid`, and turn with the room. One that does not fit is skipped with a warning.
- Stairs: a `dogleg` stair (all three stair modules) fills its room, so its rect is the room rect; a straight stair is the clear room rounded inward to the grid. `risers` = floor-to-floor / riser height. The upper rooms use the same rect and doors (`levels` can restrict a door to the base floor). The stairwell void is the stair rect.
- Re-runs: every item expand wrote carries `"gen": "<placement id>"` and is rewritten each run. Items marked `"manual": true`, and items with no `gen` tag, are kept untouched (a manual wall or opening may name a generated wall id; keep it only if that wall still exists).

### Calls made (Michael, 2026-10-10) and brief deviations
- A07 corner rule: corridors and play-space rooms only; service rooms only need the door to fit in the wall. Small rooms no longer need neighbours on both sides.
- The mantrap is ring 4, as the brief says. A29 steps are 1-2-3-4-5; 3+ sits beside 3 only.
- Stair cores are the brief's 6.0 m long, as dog-legs. The main core holds two 1.3 m flights (`stair.fireWidth`) side by side in its 3.5 m width, not the 2.4 m open feature stair, which would need a wider core. P04 records these as brief deviations: fire stair 3.0 wide (brief 2.8, to sit on the grid) and customer cage 3.5 deep (brief 3.0; 4.0 x 3.0 leaves less than a 1.8 m aisle beside a 1.2 m rack, A26).
- Fixed-content sizes (rack 0.6 x 1.2 x 2.0 and the rest) are general knowledge; only the 0.6 m rack width and the 1.8 m aisle are facts.
