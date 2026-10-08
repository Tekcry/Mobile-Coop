# Kestrel Exchange - progress
Spec: docs/prompts/exchange-map.md | Branch: feature/exchange-map (from ct-movement c994469) | Last updated: 2026-10-08

## Status
| Phase | Status | Commit |
| --- | --- | --- |
| 0 Setup and investigation | done (waiting for Michael's go-ahead) | see log |
| 1 Paper plan | not started | |
| 2 Blockout S0-S3 | not started | |
| 3 Blockout S4-S7 and co-op lips | not started | |
| 4 Guards and mission | not started | |
| 5 Readability and verification | not started | |

## Next step
Michael: read the Phase 0 report below and say go for Phase 1 (paper plan). Decisions 1-6 under "Phase 0 findings" are
recommendations the plan will assume unless you say otherwise.

## Michael's phone notes
(none yet; Phase 5 reads this first)

## Phase log

### Phase 0 - setup and investigation (2026-10-08)
No gameplay code changed. Files: `docs/prompts/exchange-map.md` (the prompt, byte for byte from the upload),
`docs/level-design.md` (rules 1-14, hyphens), `docs/prompts/exchange-map-progress.md` (this file).

Setup notes:
- The branch `feature/exchange-map` already existed locally at `ct-movement`'s head (no commits ahead; not on origin).
  The working tree held two untracked files from an earlier attempt: an older revision of the prompt (the one that
  names the Warehouse as the reference for map patterns) and a `level-design.md` written from it. No other branch
  has either file. I copied both to the session scratchpad (`stale/`) and replaced them with the current prompt and
  a clean `level-design.md`. If you wanted the "stop and report" rule applied strictly to that file, say so and I
  will restore the old one.
- Originality: in this session I have not opened `warehouse.ts`, `warehouseArt.ts`, `provingGrounds.ts` or a parked
  map. I cannot see what the session before the `/clear` read (the stale files' timestamps are 05:00; the Warehouse /
  Proving sources' access times are older, which is inconclusive on this filesystem). Two things I did see that carry
  other maps' numbers: lines 83-140 of `scripts/e2e-ct.mjs` (the Proving CT course's split corridor coordinates) and
  a grep hit in `scripts/e2e-netmove.mjs` (Proving's 4.2 m boost block). I read the first 140 lines to take the
  harness and went slightly past it. Nothing from them is used; every number in the plan comes from the constants.
  `docs/ct-movement-progress.md` (read as the prompt instructs) also describes the Warehouse in prose.

#### Verified facts (all rows hold; where each lives)
| Fact | Where |
| --- | --- |
| `MapDef` fields; `build(b, seed)` returns `MapLayout` | `src/world/mapDef.ts:63-75` |
| `MapLayout` fields (`objectives` kinds are only `terminal | cache | extract`; `props` kinds `crate smallCrate barrel explosiveBarrel box`) | `mapDef.ts:43-61`, `props.ts:17` |
| `MAPS = [warehouse, provingGrounds]`, `getMap` falls back to Proving | `maps/index.ts:9-13` (`MAPS` at 9) |
| `LISTED_MAP_IDS = ['warehouse', 'proving']`; `MISSIONS = ALL_MISSIONS.filter(isListedMap)` | `maps/listed.ts:6`, `game/missions.ts:138` |
| `RoomDef extends RoomRect {minY?, maxY?}` + `squad?: SquadSlot[]`; `SquadSlot {kind, x, z, yaw, y?, route?, wait?}` | `world/rooms.ts:8-37` |
| `LevelBuilder` API (all 27 calls exist, signatures read) | `world/levelBuilder.ts:121-393` |
| Storey helpers `wallXAt wallZAt windowX windowZ glassX glassZ` | `maps/storey.ts:10-52` |
| `Grate {pos, nx, ny, nz, where: wall | ceiling | floor}` | `anchors.ts:79-86` |
| `LightInit` = `Partial<LightDef>` + x y z: kind (`lamp spot flashlight window fire`), radius, intensity, color, cone (`makeCone(dx,dy,dz,outer,inner)`), on, destructible, electric, group, fixture `{sx,sy,sz,oy}`, reach | `lights.ts:16-64,110` |
| Surfaces and `SURFACE_NOISE` (1 / 1.6 / 1.4 / 1.15 / 1.3 / 0.6) | `world/surfaces.ts:6-16` |
| Footstep noise = `noiseRadius(...) * SURFACE_NOISE * suit.noise`; 0 stays 0 on every surface | `gameState.ts:1033`, `player/movement.ts:193-199` |
| `GEARS` crouch 0.5..2.8, stand 0.8..5.0; `NOISE_QUIET` crouch 1.9 / stand 1.45 | `config/movement.ts:155-217` |
| `LANDING` 0.6 / 2.5 / 4.5, noise 1.2 / 5 / 11 | `player/movement.ts:203-216` |
| `SPLIT` 1.2-1.95 wide, faces >= 3.6, feet 2.5, `rootDrop` 0.37 | `config/movement.ts:255-281` |
| `WALL_JUMP` 2.7-3.8, reach 1.0 (+ `HANG.out` 0.22 in the test) | `config/movement.ts:283`, `splitJump.ts:113` |
| `REACH.grabMax` 2.7, `grabMin` 1.6; `LEDGE.minDrop` 1.9, `climbDepth` 0.38 | `anchors.ts:188-224` |
| `LEAP.vy` 5.6 (apex ~0.8 m, grabs ~3.1 m: from the progress log, not a constant) | `config/movement.ts:368`, `ct-movement-progress.md` |
| `TEAM` boostMax 4.5, ladderGrab 4.1, mateRange 3, partnerReach 1.2; `checkTeamRequest`, `canBrace` | `config/movement.ts:384`, `game/teamMoves.ts:39-54` |
| `TAKEDOWN` drop 1.2-5 / 1.0; above 1.1-4.6 / 2.2; below 1.4; window 1.7; inverted 0.9, victim 0.6-2.8 below | `game/takedown.ts:15-50` |
| `DUAL_WINDOW` 1.5 s | `net/coopHost.ts:48` |
| Revive = interactable on the body; `nearest` needs `abs(dy) < 1.5`; no bleed-out anywhere | `coopHost.ts:327-343`, `interactables.ts:126` |
| `MAX_ALIVE` 10 (exported); `SQUAD_CAP` 9 and `SPAWN_MIN_DIST` 7 are module-local in each mode | `enemyManager.ts:22`, `infiltrationMode.ts:14-15`, `clearMode.ts:12-14` |
| Mission JSON limits: 1-3 insertions; download 30-60, plant 1.5-8, sabotage 2-10; radius 1.5-8; rules off / bonus / fail; squads rooms / spawns | `game/missions.ts:64-129` |
| Infiltration checkpoint = player position on objective complete; 3 lives | `infiltrationMode.ts:39,172,288` |
| Enemy kinds | `ai/enemyDefs.ts:8` |
| e2e lists: `e2e-anchors.mjs:8-11` (`['proving','sandbox']`, `['warehouse','clear']`), `e2e-clear.mjs` is Warehouse-specific throughout, `perf.mjs:52` reads `MAP` | scripts |

No row of the prompt's table is wrong. What follows are consequences the prompt does not mention.

#### Answers asked for in Phase 0
- **Rooms and squads with routes:** `RoomDef` is a plan rectangle with optional `minY` / `maxY`; a squad slot is
  `{kind, x, z, yaw, y?, route?, wait?}`. Infiltration spawns every slot while alive < 9, nearest first, never within
  7 m of the player; `e.hold = room`; the route is `setPatrol({points, wait})` (`infiltrationMode.ts:84-100`). A
  route loops with 3+ points, else ping-pongs (`patrol.ts:59`). `wait` is ONE value per guard (default 9 s,
  `PATROL.wait`); a guard waits at every point. While paused it looks along the next leg (`patrol.ts:77`), so facing
  is set by the order of the points. A longer stand = two points 0.5-0.6 m apart along the wanted facing (arrival
  radius 0.45; coincident points would face +Z). Slots on raised floors need `y`; `rooms.test.ts` checks the slot is
  in its room at that height and not inside geometry.
- **Lamps / circuits / fixtures:** `b.light({kind:'lamp', x, y, z, radius, intensity, color, group, fixture:{sx,sy,sz,oy}, cone: makeCone(...)})`.
  `group` is the circuit; `MapLayout.switches` `{pos, yaw, group}` turns it. A `fixture` is what a shot hits and what
  goes dark. `destructible` defaults true, `electric` true.
- **Ambient zones:** `b.ambientZone(minX, maxX, minZ, maxZ, level, minY = -1, maxY = 8)`; the smallest containing box
  wins; `MapTheme.lightLevel` is the base. Zones are boxes in Y too, so a gallery over a floor can differ.
- **Surfaces on raised floors:** `b.surface(kind, minX, maxX, minZ, maxZ, top)`; the highest area whose `top` is within
  0.35 m of the feet wins (`surfaces.ts:32`). Raised floors need their own `top`.
- **Overhead walkable roof strip:** a solid `box` marked `b.mark(from, {overhead: true})` (nav samples the floor under
  it; it is still walkable and still gives lips on its edges).
- **Rappel beside a window:** `b.rappel(x, y, z, yaw, length)` on a solid walkway at `y`; the rope hangs along `yaw`
  (the wall's outward normal) down `length`. Reach from the roof: `|y - top.y| <= 0.4`, within 0.9 m, facing out, not
  past the edge. A window is "beside" the rope when its plane is parallel to the wall (|dot| >= 0.9), the body is 0..1.4 m
  out from it, within `max(0.9, w/2)` along it, and the sill is within 0.8 m of the feet + 0.6 m
  (`attachController.ts:731-745`). The kick out moves the rope sideways up to 1.5 m.
- **Duct with wall and ceiling grates:** `b.duct(path, entry, exit, grates)`; `Grate {pos, nx, ny, nz, where}`. Entry reach:
  within 1.1 m horizontally, within 1.4 m in height, facing a wall vent (`anchors.ts:721`). A ceiling-type exit is a
  committed drop through the hatch (0.8 m), landing like any fall (`attachController.ts:573-587`).
- **Doors:** a wall gap from `wallX / wallZ` plus `b.door(hx, hy, hz, width, yaw, {height, swing, locked, breachable})`
  (hinge at the floor, leaf `width` along `yaw`). A closed door blocks movement, sight and light; hand 1.1 s and quiet,
  a sprint bash 0.22 s and loud; `Doors.arm()` runs after the nav grid, so doorways are walkable for guards.
- **Windows:** `windowX / windowZ(b, c, z, y, h, color, {open, breakable})` need a matching 1.2 m gap in the wall;
  they add sill and header and a `windowAt` anchor. Open: vault through. Glazed: `Breakables` panel, then vault.
  Reach: sill 0.3-1.3 m above the feet, 0.25-1.4 m off the plane, facing through.
- **Fences:** `b.fence(ax, az, bx, bz, height, y)`; its own physics group (stops the body only), visual panel; nav
  blocks it (guards path round it).
- **Removing generated lips:** `generateLedges` skips a box with `noLedge`, a pitched box, a non-colliding or
  invisible one, a top under 1.9 m, and a box under 1.9 m tall standing on the floor. `b.mark(from, {noLedge: true})`
  flags every box added since index `from` (`from = b.boxes.length` before the calls). `b.noLedge(x, z, r)` instead
  turns off `canHang` / `canClimbUp` on lips passing within `r` of a point (the lips still exist). Cover faces and
  split gaps are NOT affected by either, so a 4.0 m split bank can be `noLedge` and still split.
- **Rope kick-through: open or glazed?** Both. `windowBeside` never reads `open`; `onKickThrough` breaks the glass
  only when `!w.open` (`traversal.ts:117-119`). Open = quiet; glazed = glass break, noise 15 m
  (`gameState.ts:864`). So the "add an open window 3 m along" fallback is not needed; both can still be offered.
- **Duct grates, which can be kicked or unscrewed:** only the ENTRY grate, by the player at it: a press under 0.3 s
  kicks (noise 10 m), a hold unscrews over 1.2 s after the 0.3 s tap window (silent) (`attachController.ts:532-565`,
  `gameState.ts:863-870`). The EXIT grate always opens as `unscrew` (silent) when the crawl reaches the end
  (`ductEnd`, `:575`). A duct is one way; reaching the start leaves by the entry. A kicked grate's noise goes through
  `EnemyManager.hear`, which cuts it to 0.45 x (4.5 m for the kick) when a wall is between and the listener is beyond
  that (`enemyManager.ts:482-494`). So the S0 -> S1 duct's loud choice is the S0 entry vent: G1's patrol must come
  within 4.5 m of it through the wall, or within 10 m in the open.
- **Harness:** `scripts/e2e-lib.mjs` exports `launch({url, params, touch, viewport})` (Pixel 7 landscape, software GL,
  fake pad `window.__pad`, `gfx=min` and `gear=4` appended unless named), `openPage(ctx, url, params)` (second page for
  co-op), `BTN`, `frames`, `press`, `stick`, `assert`, `touch`, `drag`, `focusTo`. The `tp / run / tap / I` helpers at the
  top of `e2e-ct.mjs` (lines 14-76) are inline in that script (it runs on import), so `e2e-exchange.mjs` copies the
  ~60-line block (`window.__ct` with `tp`, `run`, `tap`, `info`, `loop.manual = true`).
- **Down, revive, boost in co-op e2e:** `e2e-coop.mjs` downs a player with `target.applyDamage({amount: 9999, ...})`,
  revives with `current.reviveAll()` on the host or `interactables.items.find(id === 'revive-<id>').onUse(it)` on a
  client (`:161-172, 404-422`). `e2e-netmove.mjs` braces by holding Y on one page until `team.state === 'brace'`, waits
  for `team.offer.boost` on the other, taps Y, waits for `team.count.boosts`, and uses
  `net.teamRequest('boost', id, anchorId, s, gripY)` for the denial case (`:327-407`).
- **Can a solo player brace?** No. `TeamController.fixedUpdate` returns at once in state `none` when `mates` is empty
  (`teamController.ts:100`); `mates` is `g.net?.teamMates?.() ?? []`, empty without a net session (and for a host
  alone in a lobby); `canBrace` also needs a mate within 3 m (`teamMoves.ts:54`). No boost / ladder prompt without a
  braced mate within 1.2 m. No new gating code is needed.

#### Phase 0 findings (each changes the plan; recommendations in bold)
1. **Wall tops are lips.** Every collidable, upright box with a top >= 1.9 m gives hangable lips; `wallJumpReach`
   only needs `canHang` (not `canClimbUp`), so a 3.1 m interior wall is a wall-jump + hang target from the floor
   (3.1 is inside 2.7-3.8). A 0.3 m wall top is hang only (depth < 0.38), but shimmy, corners and jumps to the
   opposite lip can carry a player over a room. The prompt's table calls 3.1 m "over standing reach"; it is also
   inside the wall-jump window. **Mark the interior walls `noLedge` except where a lip is an intended route.**
2. **The perimeter is a hole.** `perimeter()` boxes (6.5 m, 1 m thick) generate inward lips that are hangable AND
   climbable (depth 1 >= 0.38). The S3 catwalk (3.3 m), S4 balcony (3.3 m) and S6 galleries (3.6 m) put that lip
   2.9-3.2 m up: a solo wall jump onto a 1 m wide wall top, and out of the map. The roof walkway at 6.0 m also sits
   0.5 m under a 6.5 m top (a step). A team-mate boost from the 2.4 m S0 plinth reaches it too (lip 4.1 m over that floor).
   **Mark the perimeter `noLedge` and make it >= 8.0 m so no step or mantle (<= 1.8 m) reaches it from the 6.0 m
   walkway** (spec change request below; roofs stay visual only).
3. **Boost targets are measured from the braced mate's own floor**, not the ground: lips and pipes with the grip
   3.75-4.5 m above `m.pos.y`, plus ladders and drainpipes spanning that range (`teamController.ts:184-197`; `gripNear`
   accepts ladders / pipeV). Plan section 5 lists them per standing floor (ground, plinth 2.4, boilers, catwalk 3.3,
   gallery 3.6, balcony 3.3, perch). Ladders / drainpipes are solo-climbable, so they are fine.
4. **Waits are per guard, not per point** (finding above). The prompt's "4 s under the split, 5 s at the desk"
   becomes one wait per guard. **Plan one wait value per guard in 3-6 s (the stand-longer trick above where needed).**
5. **Glass.** Glazed windows (`open: false`) are `G.STATIC` panels: translucent to the player (alpha 0.3) but they
   block guards' sight and bullets until broken (`breakables.ts:57`, `groups.ts`). `glassX / glassZ` fixed panes
   are opaque boxes (and collide): the player cannot see through them. **The "view through S2's high glass" (rule 12)
   uses a glazed `windowAt` high in the wall, not `glassX`:** the player gets the view, the guards do not.
6. **Guards use placed ladders** and one-way ledge drops 1-2.2 m (`navLinks`); fences block their paths; windows,
   ducts, pipes and zip lines are not links. "Guards do not climb" is true of boosts and lips, not of ladders: a
   chasing guard follows a ladder, so ladder-reached pockets (S3 SW, S5 archive, S6 NW) are not safe from a hunt.
7. **Existing unit tests that the new map touches.** `tests/rooms.test.ts:138` asserts `MAPS` ids equal
   `['warehouse','proving']`; `tests/missions.test.ts:26` asserts every listed mission is on the Warehouse. Both
   change (append `exchange`; allow `exchange-deadline`). `rooms`, `voxelFit` and `detailPass` run over every map, so
   the Exchange must pass them: rooms do not overlap (storeys by `minY / maxY`), squads and spawns are clear of
   geometry, voxel fit within 3 cm (palette <= 256, grid under 20 m tall and 110 x 110 m, > 50 shapes).
   `tests/losParity.test.ts` is Warehouse-only. **These two assertion edits are in scope as unit tests; I will list them
   under Decisions in the phase that registers the map.**
8. **The nav check is an e2e, not a unit test.** `buildNavGrid(scene, level, seed)` needs a Babylon scene and Havok
   (`navBuild.ts:18`); `NavGrid.findPath(from, to, maxExpand, fromY, toY)` is reachable in the running game only.
9. **perf.mjs on the Exchange:** its default path starts `mode=wave`; autostart does not check `MapDef.modes`
   (`main.ts:155-158`), so `MAP=exchange node scripts/perf.mjs` works if `enemySpawns` is filled (and `STEALTH=1`
   uses `clear`). `autostart=exchange&mode=infiltration` picks the first mission whose `map` matches once it is listed.
10. **A ceiling hatch is an exit only.** The S5 duct (entry on top of the archive slab, exit = ceiling vent) is
    entered from the wall vent at the ladder's top, crawled, and left by the hatch drop; the hatch cannot be the entry.

#### Decisions
- Copied the inline `e2e-ct.mjs` harness instead of importing or editing it (the prompt allows scripts of our own only).
- No `CLAUDE.md`, `CHANGELOG.md` or `TESTING.md` change in Phase 0 (no playable content yet).
- Commit trailers carry the session line and a plain `Co-Authored-By: Claude`; no model name.

#### Checks run
None required for Phase 0 and none run: no code, config or test file changed (docs only).

#### Open issues
- Strict reading of "stop if `docs/level-design.md` exists": see Setup notes.
- Findings 1-6 want a nod before Phase 1 builds on them.

## Spec change requests
(problem, proposed change, waiting for Michael / approved / rejected)
- Perimeter height (2026-10-08): the spec says 6.5 m. Problem: finding 2 (wall-jump / mantle out of the map from the
  catwalk, balcony, galleries and the 6.0 m walkway; a boost from the plinth). Proposed: perimeter 8.0 m with
  `noLedge`, still no collision on roofs. Waiting for Michael.
- Fixed glass in S2 (2026-10-08): the spec says `glassX` high in the north wall. Problem: finding 5 (opaque). Proposed:
  a glazed `windowAt` with its sill out of reach from the floor. Waiting for Michael.

## Future recommendations
(written at the end of Phase 5)
