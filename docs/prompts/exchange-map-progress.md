# Kestrel Exchange - progress
Spec: `docs/prompts/exchange-map.md` | Standard: `docs/level-design.md` | Template: `docs/templates/map-spec.md`
Branch: `feature/exchange-map` (from `ct-movement`) | Last updated: 2026-10-08

## Status
| Phase | Status | Commit |
| --- | --- | --- |
| Handover (standard, template, spec) | done | f45cbb2 |
| 0 Setup and investigation | done (waiting for Michael's go-ahead) | see log |
| 1 Architectural design | not started | |
| 2 Gameplay design | not started | |
| 3 Build: ground floor | not started | |
| 4 Build: first floor, roof, yard, co-op lips | not started | |
| 5 Guards and mission | not started | |
| 6 Dressing, readability, verification | not started | |

## Next step
Michael: read the Phase 0 report below and say go for Phase 1 (building brief and floor plans, docs only).

## Michael's phone notes
(none yet; Phase 6 reads this first)

## Phase log

### Handover and fresh start (2026-10-08)
Michael's instruction: start fresh with the handover, use no existing asset for the Exchange, overwrite as necessary.
That overrides the handover's two stop conditions (Step 2: the branch already existed; Step 3: an older
`docs/level-design.md` / `docs/prompts/exchange-map.md` existed).
- `feature/exchange-map` was recreated from `origin/ct-movement` (ba21dc9). `ct-movement` already contained the old
  branch's tip, so the push was a fast-forward (no force push).
- e51f9fb reverts the earlier attempt's merge (its map, registration, unit test, e2e suite, `e2e-anchors` entry, plan,
  progress log, docs and its `CLAUDE.md` / `CHANGELOG.md` / `TESTING.md` entries). After it the tree is byte-identical to
  c994469, the pre-Exchange baseline the spec's "Verified facts" describe (`git diff c994469 HEAD` empty). Nothing of the
  old attempt is reused. When Michael merges this branch into `ct-movement`, the revert removes the old attempt there too.
- f45cbb2 `docs: level design standard, map spec template, Kestrel Exchange spec`: the three handover files copied byte
  for byte (`cmp` identical: `docs/level-design.md` 15714 bytes, `docs/templates/map-spec.md` 7237,
  `docs/prompts/exchange-map.md` 34754); `CLAUDE.md` gains the Hard rules bullet and the "Level design" section before
  "World and player"; `CHANGELOG.md` gains the docs bullet at the end of the unreleased `3.2.0` section (as its own entry).
- `npm run check`: exit 0 (lint clean; `Test Files 56 passed (56)`, `Tests 567 passed (567)`; `built in 44.07s`).

### Phase 0 - setup and investigation (2026-10-08)
Files: this log only. No code changed.

Reading (rule 1): `CLAUDE.md` in full, `docs/level-design.md`, the spec, `docs/ct-movement.md` and
`docs/ct-movement-progress.md` (both unchanged on `ct-movement` since c994469). No map file other than `index.ts`,
`listed.ts` and `storey.ts` was opened.

#### Verified facts (every row holds)
| Fact | Where |
| --- | --- |
| `MapDef` (`build(b, seed)` at :70, `art?` :72, `weathers?` :74) and `MapLayout` (:43-61, `reinforce?` :60) | `src/world/mapDef.ts:43-75` |
| `MAPS = [warehouse, provingGrounds]`; the Play screen takes `mapsForMode()[0]` as the default | `src/world/maps/index.ts:9`, `src/ui/screens/playScreen.ts:58` and the lines after it |
| `LISTED_MAP_IDS = ['warehouse', 'proving']`; `MISSIONS = ALL_MISSIONS.filter(isListedMap)` | `src/world/maps/listed.ts:6`, `src/game/missions.ts:138` |
| `RoomRect` (`minY?` :16, `maxY?` :17), `SquadSlot` (`y?` :27, `route?` :29, `wait?` :31), `RoomDef` :34 | `src/world/rooms.ts:8-37` |
| Every `LevelBuilder` call and signature in the row exists as written (box :121 .. ambientZone :391, `minY = -1, maxY = 8`) | `src/world/levelBuilder.ts:121-391` |
| `wallXAt` :10, `wallZAt` :20, `windowX` :30, `windowZ` :36, `glassX` :44, `glassZ` :49 | `src/world/maps/storey.ts` |
| Nav layers: `layers` defaults to 1, or 3 with `sampleLayers` (`navGrid.ts:58-59,179`); `navBuild` always passes `sampleLayers` (`navBuild.ts:77`), so 3; a surface needs `HEADROOM` 1.7 (`navBuild.ts:9,88`) | `src/ai/navGrid.ts`, `src/ai/navBuild.ts` |
| `LightKind` :16, `group` :48, `fixture` :51, `LightFixture` :57, `LightInit` :64, `makeCone` :110 | `src/world/lights.ts` |
| `SURFACE_NOISE` concrete 1, metal 1.6, grate 1.4, wood 1.15, gravel 1.3, carpet 0.6 | `src/world/surfaces.ts:10-15` |
| `NOISE_QUIET` crouch 1.9 / stand 1.45 (`movement.ts` config :214-216); `noiseRadius` returns 0 at or under it (`player/movement.ts:197-198`); footsteps x `SURFACE_NOISE` (`gameState.ts:1033`); `GEARS` caps (:159-160) | as listed |
| `LANDING` (:203), landing noise 11 / 5 / 1.2 (:215) | `src/player/movement.ts` |
| `SPLIT` minWidth 1.2 :259, maxWidth 1.95 :260, minHeight 3.6 :262, feetHeight 2.5 :271; `findSplitGaps` | `src/config/movement.ts`, `src/player/splitJump.ts:34` |
| `WALL_JUMP` minUp 2.7 :285, maxUp 3.8 :286, wallReach 1.0 :288; `REACH.grabMax` 2.7 (`anchors.ts:215`); `LEDGE.minDrop` 1.9 (`anchors.ts:190`); the ~3.1 m jump grab is from the log, not a constant (`LEAP.vy` 5.6 :370; `docs/ct-movement-progress.md:218`) | as listed |
| `TEAM` mateRange 3 :387, partnerReach 1.2 :390, boostMax 4.5 :393, ladderGrab 4.1 :398; `checkTeamRequest` :39, `canBrace` :54 | `src/config/movement.ts`, `src/game/teamMoves.ts` |
| `TAKEDOWN` above 1.1 / 4.6 / 2.2 :22-24, belowReach 1.4 :26, windowReach 1.7 :28, drop 1.2 / 5 / 1.0 :42-44, inverted 0.9 / 0.6 / 2.8 :47-49 | `src/game/takedown.ts` |
| `DUAL_WINDOW` 1.5 (`coopHost.ts:48`); `nearest` needs `abs(dy) < 1.5` (`interactables.ts:126`); no bleed-out (no match for "bleed" in `src`) | as listed |
| `MAX_ALIVE` 10 (`enemyManager.ts:22`); `SQUAD_CAP` 9 and `SPAWN_MIN_DIST` 7 in `infiltrationMode.ts:14-15` and `clearMode.ts:12-14`; pending squads sorted nearest first (`infiltrationMode.ts:82`) | as listed |
| Missions: 1-3 insertions :91; download 30-60 :66, plant 1.5-8 :67, sabotage 2-10 :69; intel needs items :102; radius 1.5-8 :115; rules :61; squads :129; checkpoint = player position on completion (`infiltrationMode.ts:172`) | `src/game/missions.ts` |
| `ENEMY_KINDS` | `src/ai/enemyDefs.ts:8` |
| `shot.mjs` args `[out, query, wait, js]` (:3); `perf.mjs` `MAP` (:52); hard-coded lists `e2e-anchors.mjs:9-10`, `e2e-clear.mjs` (Warehouse runs from :63) | scripts |
No mismatch. Two nuances: the nav's 3 layers come from `navBuild` passing `sampleLayers`; the jump-grab height is documented, not a constant.

#### How to build each element (engine files only)
- **Rooms and squads**: `RoomDef` rect (+ `minY` / `maxY` for a storey); `SquadSlot {kind, x, z, yaw, y?, route?, wait?}`.
  A first-floor guard sets `y` 4.5: both modes spawn at `new Vector3(x, slot.y ?? NaN, z)` (`infiltrationMode.ts:90`,
  `clearMode.ts:92`). Route points are 2D; the guard keeps its storey. One `wait` per guard (default `PATROL.wait` 9 s);
  while paused it looks along the next leg (`patrol.ts:75-78`); 3+ points loop, fewer ping-pong (`patrol.ts:59-62`).
- **Stairs between storeys**: `stairs(x, z, w, len, rise, steps, color, yaw, y)` collides as one smooth ramp
  (`levelBuilder.ts:188`); the nav joins storeys by height. The landing slab must overlap the stair's top.
- **First-floor walls and windows**: `wallXAt / wallZAt(b, .., y, h, ..)`; `windowX / windowZ(b, c, z|x, y, h, ..)` put the
  sill 0.9 above `y`; `glassX / glassZ` are opaque fixed panes (no anchor).
- **Double-height room with a gallery**: the floor plus a gallery slab at 4.5 (a walkable box top); the nav keeps up to 3
  surfaces per column, each needing 1.7 m headroom, so floor + gallery + a solid roof is the limit. Roofs drawn with
  `box(..., collide=false)` do not count. The gallery is its own room (`minY`).
- **Lamps, circuits, switches**: `light({kind, x, y, z, radius, intensity, color, group, fixture, cone: makeCone(..)})`;
  `MapLayout.switches {pos, yaw, group}`. A switch starts "on" (`stealthSystems.ts:51`) and toggles every switch on
  its circuit (`:176-182`), so a circuit whose lamps start off gives a dead first press.
- **Ambient zones per storey**: `ambientZone(minX, maxX, minZ, maxZ, level, minY, maxY)`; the default `maxY` 8 stops
  below the 9.0 roof, so roof zones need their own `minY` / `maxY`.
- **Surfaces on raised floors**: `surface(kind, .., top)`; the highest area within 0.35 m of the feet wins.
- **Walkable roof**: a solid box; `mark(from, {overhead: true})` keeps the floor under it on the nav grid.
- **Rappel down a 10 m elevation**: `rappel(x, y, z, yaw, length)`. Nothing caps the length: the travel range is
  `min(minOut, len) .. len` (`attach.ts:118-120`), `MoveState.s` is clamped only to the world size (`moveState.ts:177`)
  and the rope is drawn at any length. The point must be on a surface the player stands on (`|y - top.y| <= 0.4`,
  within 0.9 m, facing out, not past the edge). A 1.0 m parapet in front of it needs a real gap (a hoist opening).
- **Ducts with wall / ceiling / floor grates**: `duct(path, entry, exit, grates)`. Entry: within 1.1 m and 1.4 m of
  height (`anchors.ts:724`); a wall grate also needs facing (`:726`), a floor grate does not. Exit: a wall grate crawls out;
  every other kind is a committed drop through it (`attachController.ts:576`). So a duct cannot exit upwards through a
  floor grate.
- **Doors**: `door(hx, hy, hz, width, yaw, {height, swing, locked, breachable})`. `locked` refuses to open
  (`doors.ts:141`) and its interact is disabled (`stealthSystems.ts:87`). `breachable` is stored but nothing reads it: no
  breach mechanic exists. The nav is built before doors arm, so it treats a locked doorway as open: keep locked doors
  off every guard route and chase path.
- **Windows**: `windowAt(.., {sill, breakable, open})` or the storey helpers. Open = vault; glazed = a `Breakables`
  panel (a static body: blocks guards' sight and bullets until broken, translucent for the player).
- **Fences**: `fence(ax, az, bx, bz, height, y)` (stops the body only; nav blocks it).
- **No ledge**: `mark(from, {noLedge: true})` skips the boxes added since `from`; `noLedge(x, z, r)` turns off lips passing
  within `r`. Neither affects cover faces or split gaps.

#### Answers
- **Guard search after a suspicion**: suspicious 3.5 s (`ALERT.suspiciousTime`), then investigating walks to the stimulus,
  looks 4 s (`investigateLook`) and gives up after 20 s (`investigateMax`); combat without sight for 12 s (`lostSight`)
  becomes searching for 60 s (`searchTime`) on a widening ring round the last known position, radius 2 + 2.5 m per point
  up to 11 m (`PATROL.searchR0 / searchStep / searchMax`, `patrol.ts:141`, `enemy.ts:1021-1028`), each searcher on its own
  bearing; a radioed alert reaches guards within 22 m (`EnemyManager.RADIO`). For section 4.8 that means a hide spot or a
  dark escape within ~11 m of any spot on a stealth route.
- **Does a rope kick-through need a glazed window?** No. `windowBeside` never reads `open` (`attachController.ts:731`);
  the glass breaks only when the window is glazed (`traversal.ts:118`). Open = silent, glazed = 15 m
  (`gameState.ts:864`).
- **Which duct grates can be kicked or unscrewed?** Only the entry grate, by the player at it: under 0.3 s kicks (10 m),
  holding unscrews over 1.2 s (silent) (`attachController.ts:60-61,532-563`). The exit always opens silently
  (`:575`). A kick through a wall is muffled to 4.5 m beyond that range (`enemyManager.ts:25,492`).
- **Is a 10 m rappel allowed?** Yes (above). At 1.6 m/s down (3.0 with sprint) it takes about 6 s; unhooking needs the feet
  within 2.0 m of the floor.
- **Window takedown while hanging from a ledge outside the window?** No. The window takedown needs the attacker standing
  at a vaultable window (state `window` from `hintWindow`, `takedownController.ts:108`). Hanging is state `hang`
  (`:98`), which offers the ledge pull (`takedown.ts:180-195`: the guard 0.8-2.6 m above the hands, within 1.4 m) or a drop
  attack. A guard standing at a sill above the hands can be pulled out.
- **`e2e-lib.mjs`**: `launch({url, params, touch, viewport})` (:5; Pixel 7 landscape, fake pad `window.__pad`),
  `openPage` (:18, a second page for co-op), `gfx=min` (:60) and `gear=4` (:63) unless named, `BTN` (:75), `frames`,
  `press`, `stick`, `assert`, `touch`, `drag`.
- **The harness at the top of `e2e-ct.mjs`**: inline in the script (it runs on import, so it is not importable):
  `window.__ct` with `tp(x, y, z, yaw)` (:17), `run(s, sx, sy, btns)` (:27, headless steps at 120 Hz), `tap(b)` (:37),
  `info()` (:43), `loop.manual = true` (:66), and Node wrappers `I`, `run`, `tap`, `tp` (:68-75). A new suite copies it.
- **How `e2e-coop.mjs` / `e2e-netmove.mjs` down, revive and boost**: down = `applyDamage({amount: 9999, ...})` on the
  player's target (`e2e-coop.mjs:166,408`); revive = `current.reviveAll()` on the host (:171) or the client using the
  `revive-<id>` interactable (`:411` and after); boost = hold Y until `team.state === 'brace'` (`e2e-netmove.mjs:330-332`),
  wait for `team.offer.boost` on the partner (:346), tap Y, check `team.count.boosts` (:351); denials through
  `net.teamRequest(..)` (:393, :404).
- **A solo player cannot brace or see a boost prompt**: `mates` is `net?.teamMates?.() ?? []`
  (`teamController.ts:61`) and state `none` returns at once without mates (`:100`); `canBrace` also needs a mate
  within 3 m.

#### Findings for Phases 1-2 (the spec's route meets these)
1. **Air-shaft split (space 4, secret route)**: "up the air shaft by split jumps to a first-floor window" needs a move the
   game does not have. A split is left only by dropping (`attachController.ts:1037-1038`: no jump out of it). A split
   shaft can hold the player above a guard; it cannot be climbed. Phase 1-2 needs another real element for that secret
   route, or the shaft becomes a hiding perch. Spec change request below.
2. **Cable-trench duct (space 2, secret route)**: entering through a floor grate works; leaving must be by a wall grate,
   or a drop through a ceiling grate into a lower room. The trench can end at a wall vent (for example in the battery
   room lobby's wall).
3. **Window takedown (space 5)**: from inside, or standing outside at a sill within vault reach (0.3-1.3 m above the
   feet). Hanging from the string course only gives the ledge pull.
4. **Roof rappel (space 8)**: the parapet needs an opening where the rope goes over (a hoist opening fits a 1934
   building).
5. **Locked doors as gates** must not sit on any guard route or chase path.
6. **Switches**: start each circuit's lamps on.
7. **Zones**: roof and parapet zones need `minY` / `maxY` above the default 8.
8. **Registering the map** later breaks two existing assertions: `tests/rooms.test.ts:138` (the exact `MAPS` ids) and
   `tests/missions.test.ts:26` (every listed mission on the Warehouse). Both are unit tests, so editing them is in scope.

#### Decisions
- The fresh start (above) instead of the handover's stop conditions, per Michael's instruction.
- The `CHANGELOG.md` bullet sits at the end of the unreleased `3.2.0` section as its own entry.
- Commit trailers: `Co-Authored-By: Claude` and the session line (no model name in commits).

#### Checks run
- `npm run check` once, on the handover commit: exit 0, `Tests 567 passed (567)`. Phase 0 changes only this log.

#### Open items
- Spec change request 1 (air shaft) waits for Michael.

## Spec change requests
(problem, proposed change, waiting / approved / rejected)
1. Space 4 secret route (2026-10-08): the engine cannot climb a split (no jump out of a split). Options: (a) the air
   shaft keeps a split as a hiding perch over a guard path, and the secret route up uses a real element the engine can
   climb (a shaft ladder for the air-shaft's cleaning access, or the shaft's cast-iron soil pipe as a drainpipe);
   (b) drop the air shaft secret. Waiting for Michael.

## Future recommendations
(written at the end of Phase 6)
