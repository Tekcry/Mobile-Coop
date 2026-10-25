# sector-redesign - engine research (what the engine does today)

Research agent, 2026-10-23, on `feature/sector-redesign` (r2-nav / r2-bolt + master 4.63.1). Read-only on code.
For the spec writer: design within these facts, or name the gap (section 6). Refs are `file:line` on this branch.
Inputs: BRIEF M1-M10 (M6 corporate research campus, M7 30-45 min co-op run, M8 up to 24 guards in S5 rising from S1,
M9 lit like a real site and players cut lights, M10 dogs and armed response).

## 0. The ten facts that matter most
1. Sections, connectors, checkpoints, team doors and the alarm are pure data in a `SectorDef[]` on the map
   (`src/game/sectors.ts:76-96`); a new map plugs in with `modes: ['sector']` and `sectors` (`src/world/mapDef.ts:111-113`).
   Any number of sections works; only one is live at a time.
2. The live guard cap in Sector Ops is 32 (`SECTOR.maxAlive`, `sectors.ts:227`), the co-op wire cap is 32
   (`MAX_ENEMIES`, `src/net/protocol.ts:22`). 24 guards + `alarmMax 3 x perStage` reinforcements must stay <= 32.
   The guard-cap perf run (12 / 16 / 24 awake) has **never been run**: `origin/feature/guard-cap` has the script and an
   empty report ("Not run yet"). Only measurement: ~2.6 ms main thread for 12 guards, sim p95 2.2-2.3 ms for 10 vs a
   2.9 ms budget (`docs/archive/sector-ops/PLAN.md` section 6). 24 awake is an unmeasured perf risk.
3. Runner and dog are melee-only (`src/config/enemies.json`); the melee branch in `decide()` returns before the gun
   code (`src/ai/enemy.ts:1173`), so arming a kind is data: give it a `weapon`, set `melee: null`.
4. Guard-to-guard: shouts, radio call-ins, a shared last known position, body discovery with KO revival and squad
   radio checks exist; **Sector Ops never joins guards to squads** (`sectorMode.ts:401-422`), so radio checks never run
   there. No conversations, no relief / shift change, no guards relighting lamps.
5. Cameras see by their own IR (light ignored, `CAMERA.irLight` 1), up to 18 m, 70 x 45 deg frame, and their fill rate
   falls off over the guards' 25 m focus range, not the camera's range: a camera fills almost as fast at 12 m as at 4 m.
   That is why they "pick the player up well outside the intended area". `feature/camera-range` has no commits yet.
6. Lasers raise the alarm only, are drawn only in night vision, and are cut by jamming their power panel. Keypads,
   lockpicks, breaching, a security desk and lockdown do not exist in Sector Ops.
7. Light parity is one `LightField` read by renderer, HUD meter and guards. Players can switch circuits
   (`MapDef.switches`), shoot any `destructible` lamp, and jam electric lamps 5 s. **Sector mode does not sync light
   state to the co-op client** (Course mode syncs layout groups only): a switched or shot lamp in co-op Sector Ops is a
   parity bug today.
8. Co-op-only band: solo reaches 3.8 m (wall jump) / ~3.22 m (jump + fall grab) / mantles 1.8 m even on `noLedge`;
   co-op boost 2.4-4.5 m, relay to 4.6, rope drop 2.2-6.0. Build co-op lips at 4.3-4.5 with ~6.2 m clear air over a
   4.4 m lip (`climbRoom`). No pair bolt exists; the r2 pair-bolt design is specified but unbuilt.
9. G44 (guards see poorly above them) is built on `origin/feature/g44-above` (fresh check PASS) but **not merged** into
   this branch: high routes rely on darkness until it merges.
10. G155: no heavies or dogs in co-op missions. M10 asks for dogs and the reinforcements spawn heavies
    (`sectorMode.ts:42`), and `tests/sectors.test.ts:409,425,453` assert no heavy / sniper / dog per section. Log both
    as decisions against G155 (Sector Ops is the playground, not a campaign mission).

## 1. Sector Ops framework

### 1.1 Data (`src/game/sectors.ts`)
- `SectorDef` (`:76-96`): `id`, `name`, `start` pose, one `objective` (`hack` 3 s hold / `grab` / `download` 10 s within
  4 m, `SECTOR` `:205-230`), `connector` (all but the last) or `extract` (the last), `guards: SectorGuard[]`,
  `reinforce: [x,z][]`, `perStage`, `routes` (M8 check data), `bolts` (team doors).
- `checkSectors` (`:263-277`) enforces: connector on every section but the last, extraction only on the last.
- `ConnectorDef` (`:42-54`): a plan box (+ `floorY`), `nearAt` / `farAt` doorway centres (doors found by position,
  `Doors.nearest` within 1.2 m, `sectorMode.ts:46,153-169`), `sealUnlocks` (side doors of the next section), `checkpoint`.
- `ConnectorMachine` (`:308-371`): locked -> open (objective done, near door unlocks) -> cycling (every player in the box
  1 s and the near doorway clear: near door locks, the section unloads; at 1.5 s the next loads) -> sealed (3 s: far door
  opens silently, the connector is the checkpoint). Downed players count (A20, `sectorMode.ts:352-364`).
- `SectorRun` (`:380-497`): index, phase (objective / connector / extract / done), download, alarm stage carried over
  between sections, `alarmAtStart`, checkpoint copy. `restartSection` (`:469-483`) rewinds the current section.

### 1.2 Mode (`src/game/modes/sectorMode.ts`)
- `start` (`:126-150`): `em.stealth = true`, `em.maxAlive = 32`, builds `CtDevices` (cameras, lasers, panels, jammer),
  locks every connector door and team door, loads section 0.
- `loadSection` (`:262-272`): `ct.setLive(i)` (other sections' devices dead), `stealth.setLiveAlarms(i)`,
  `enemyMgr.resetAlarm()`, queues guards (`?sectorGuards=N` caps them, `src/core/flags.ts:111`).
- `fill` (`:401-422`) every 0.5 s: spawns pending guards unaware unless within 7 m of a player (`SPAWN_MIN_DIST`), passes
  `route, wait, waits, faces, start, loop` to `setPatrol`. Not passed: `free`, `passive`, `info`; no `joinSquad`.
- `unloadSection` (`:275-284`): releases holds, `despawnAll` (guards, bodies), devices and panels off.
- Alarm (`:425-455`): a panel alarm (`onAlarm`) or a camera / laser alarm (`cameraAlarm`) raises the stage (max 3); each
  stage spawns `perStage` guards, alerted, alternating grunt / heavy (`KINDS`, `:42`) at the `reinforce` points in turn.
- Restart (`:484-514`): everyone down (`onPlayerDeath`, `:590-595`), co-op out of syringes (`onPlayerOut`), or the pause
  menu: rebolts team doors, despawns, `resetMemory`, `checkpointReset` (loadout back), reloads guards, repairs shot
  cameras, respawns at the checkpoint. Not reset: doors (other than connector / bolt), lamps (check-slice2 item 5).
- Result (`:474-477`): time, kills (KOs excluded), spotted (detections + camera alarms), Ghost (+2000). Stars per
  difficulty in IndexedDB key `sector:ops` (`src/save/sectorRecord.ts`, A11). Syringes 3/2/1/1 by difficulty (`:229`).
- Co-op: `sector` message every 0.5 s or on change: `SecWire` + `{ls, lk, dn, sy}` (`sectors.ts:549-554`,
  `sectorMode.ts:608-612`). No lamp / switch state in it.

### 1.3 Team doors (r2-bolt + r2-nav, kept)
- `SectorBolt {at, side, w?}` (`sectors.ts:105-110`): door built `locked: true, breachable: false`; an "Unbolt" item on
  the `side` only, reach `BOLT_DEPTH` 1.2 out, `boltHalfSpan` = w/2 + 0.3 along (`:113-144`). One player alone can use it.
- Bolted doors are nav closures (`sectorMode.ts:186-191`, `BOLT_NAV_ALONG` 0.5, `ACROSS` 0.35): guards route round.
- `tests/sectorBolt.test.ts` asserts exactly three Warehouse bolts (update it for a new map).

### 1.4 How a new map plugs in
- Registry: add the `MapDef` to `MAPS` (`src/world/maps/index.ts:21`); `LISTED_MAP_IDS` (`:28`) is the menu list.
  The op selector lists every map with `modes` containing `'sector'` and sectors (`src/ui/screens/missionsScreen.ts:42`),
  the co-op lobby likewise (`src/net/coopUi.ts:394`); the main menu's stars hardcode `warehouseOps` (`src/main.ts:151`).
  Reusing the id `warehouseOps` keeps the stars record; a new id starts a new record.
- `MapDef.build(b)` returns a `MapLayout` (`mapDef.ts:48-106`): `playerSpawns`, `rooms`, `switches`, `alarms` (with
  `section`), `hideSpots`, `pickups`, `navSeeds`, `security`, `lasers`, `laserPanels`, `medkitWalls`, `camSpaces`.
  `MapDef.navLayers` (default 3), `theme.lightLevel` (ambient, warehouse 0.3), `detail`, `art`.
- Pattern to copy: `warehouseOps.ts` = shell + one builder per section (`warehouseS1/2/3.ts`) + data in
  `warehouseSectors.ts` + `mountLights` + `dressWarehouseOps`. Section files export rooms, switches, pickups,
  hide spots, spawns, nav seeds, bolts.
- Level builder primitives (`src/world/levelBuilder.ts`): `box :140`, `block :146`, `floor :150`, `wall :155`,
  `wallX / wallZ :164/:175` (ground only; upper storeys `wallXAt / wallZAt` in `maps/storey.ts`), `ramp :186`,
  `stairs :196` (steps + smooth collision ramp; sizing in `maps/stairs.ts`), `pillar :211`, `lowWall / highWall`,
  `perimeter :227` (sets `bounds`), `ladder :241`, `pipeV / pipeH :255/:261`, `zipline :268`, `duct :276`,
  `windowAt :280`, `door :284`, `rappel :292`, `fence :305`, `ledge :377`, `mark {overhead, noLedge} :382`,
  `noLedge :392`, `sheet :402` (translucent roof, passes light), `light :409`, `surface :415`, `ambientZone :421`.
- Anchors (`src/world/anchors.ts:18`): ladder, pipeV, pipeH, ledge, duct, window, door, zipline, split, rappel, fence.
  Ledges are generated from box tops >= 1.9 m with lips >= 0.6 m; climb-up needs top depth >= 0.38 (`:188-201, 311-401`).
- Collision: one static Havok body of all pieces; nav and perception read collision only. Gameplay never reads voxels.
- Light bake: lamps baked at `LAMP_CELL` 0.2 m (`src/voxel/lampBake.ts:15`); `LAMP_GRID` 2 m columns hold at most
  `LAMP_GRID_SLOTS` 8 lamps, a 9th is dropped (`:313-315`); `MAX_REAL_LIGHTS` 48 (`src/world/lightRig.ts:19`); doors cut
  lamps (`DOORS_PER_LAMP` 4, `lightField.ts:29`). Bake and load time grow with map area and lamp count (warehouseOps:
  133 lamps).

### 1.5 Size limits
| Limit | Value | Where |
| --- | --- | --- |
| Map bounds | no hard cap; set by `perimeter` or `b.bounds` (Warehouse 48 x 44 m, `warehouse.ts:210`) | `levelBuilder.ts:130,227` |
| Nav grid | 0.5 m cells, agent radius 0.32, step 0.45, over the whole bounds; 3 surfaces per column unless `navLayers` | `src/ai/navBuild.ts:14,69-77` |
| Nav depth | sampler casts down to y -2: no basement below about -1.5 m | `docs/level-design.md` 12.1 |
| Live guards | 32 Sector Ops, 12 other modes (`MAX_ALIVE`) | `sectors.ts:227`, `enemyManager.ts:26` |
| Co-op enemies on the wire | 32 | `net/protocol.ts:22` |
| Cameras per map | 12 (validation error above it) | `src/config/security.ts:49-51`, `security/data.ts:61` |
| Physics | 28 dynamic props, 4 ragdolls, 24 projectiles | `src/physics/groups.ts:35-39` |
| Bodies kept | 12 | `src/ai/bodies.ts` |
| Guard flashlights | 4 slots, dark maps only | `src/world/torches.ts:15` |
| Lamps | 8 per 2 m column, 48 real lights pooled | above |
| Voxel palette | 256 entries | `src/voxel/levelVoxels.ts:66` |
| Perf budget | sim p95 2.9 ms, main thread Epic p95 5.5 ms, 600 draws | `docs/systems/performance.md` |

Five sections of the campus need more than 12 cameras in total (gap G1) and likely `navLayers` 4-5 for multi-storey.

## 2. Guards

### 2.1 Archetypes (`src/ai/enemyDefs.ts:7`, `src/config/enemies.json`, `src/ai/archetypes.ts`)
| Kind | Weapon | HP | Walk / run | Notes |
| --- | --- | --- | --- | --- |
| grunt | rifle 7 dmg, 420 rpm, range 34 | 100 | 0.9 / 3.2 | cover |
| runner | **melee only** (16 dmg, 1.7 m lunge) | 55 | 1.3 / 4.2 | no cover |
| heavy | rifle 760 rpm, windup 0.7 | 340 | 0.75 / 2.0 | directional armour; G155 |
| sniper | rifle 42 dmg, range 70, laser 1.1 s | 90 | 0.85 / 3.4 | relocates after 2 shots / 9 s |
| enforcer | pistolSd 9 dmg, range 22 | 180 | 0.8 / 2.2 | shield arc 70 deg |
| dog | **melee only** (14 dmg, 1.3 m) | 60 | 1.1 / 6.0 | quadruped, smell |
| droneOp | rifle 6 dmg | 90 | 0.85 / 3.0 | spawns a recon drone |
| officer | pistolSd 11 dmg, range 24 | 120 | 0.85 / 3.1 | 12 m buff to nearby guards; preferred alarm runner |
- Arming everyone: give `runner` a `weapon` and `melee: null` (data only; the shared ranged brain `enemy.ts:1197-1564`
  serves every armed kind). `melee` truthy also opts a guard out of body discovery (`enemy.ts:938`), lights-out response
  (`enemyManager.ts:274`), alarm running (`:298`), flanking and grenades, so today runners and dogs never find bodies,
  never answer a light going out and never run to a panel. Simplest fix: use no runners (Size S); dogs stay melee.
- Perception is identical for every kind (`src/ai/perception.ts:15-55`): focus cone 55 deg, 25 m; periphery to +-100 deg,
  12 m at x0.35; rate 2.2/s capped 3.2/s; instant detect within 1.6 m when lit; think every 0.22-0.30 s (`enemy.ts:824`).
- Difficulty (`archetypes.ts:170-193`): rookie / normal / realistic / perfectionist scale damage, accuracy, hp,
  perception (0.7-1.5) and reaction (1.35-0.7).

### 2.2 Patrols and posts (`src/ai/patrol.ts:13-31`, `src/world/rooms.ts:21-44`)
- `PatrolRoute`: `points`, `wait` (default 9 s, `:37`), `pingPong` (default under 3 points), per-point `waits` and
  `faces`, `start {idx, wait}`, timed `loop {period, leave[], t0}` (master clock). No route = a post glancing +-0.6 rad
  every 14 s. `rejoin` after a search goes to the nearest point or the scheduled one.
- `SquadSlot`: kind, x, z, y, yaw, route, wait, waits, faces, start, loop, free, passive, info. `SectorGuard` adds
  `takedownSpot` (M8 check, `src/game/sectorCheck.ts`, `CHECK_RANGE` 15 m; isolation in time per SPEC C1).

### 2.3 Alert, search, alarm
- States (`src/ai/alertState.ts`): unaware > suspicious (0.3) > investigating (0.6) > alert > searching (60 s) >
  cooldown (45 s); a guard that fought never returns to unaware (`:129`). Sensitivity x1 .. x2 by state.
- Light: `PlayerRef.light` (the same `LightField.bodyLevel` the HUD meter shows, `gameState.ts:1468-1504`); sight rate x
  `visibilityFromLight^2` (`perception.ts:92`). Noise: `noiseSuspicion` (`:196`), walls muffle.
- Search: ring sweep 2 m + 2.5 m per point, max 11 m, 3 s per look (`patrol.ts:193-199`); searchers fan out.
- Lights out (`enemyManager.ts:268-287`): the nearest calm armed guard within 25 m comes to look; others within 14 m turn.
- Alarm panel (`src/ai/alarm.ts`): an alerted armed guard within 30 m runs to it (officers preferred), holds 1.6 s x
  reaction; a player disables it with a 1.2 s hold; one panel alarm per section load.
- Torches: on when investigating / searching in light < 0.35 (`archetypes.ts:156-160`), 4 slots, dark maps only.

### 2.4 Guard-to-guard interaction
Exists:
- Shout: guards within 8 m (2.5 m height) join a sighting in 0.3-0.6 s (`enemyManager.ts:178-183`).
- Radio call-in after 2.5 s x reaction (`enemy.ts:672`); taking the spotter out first stops it; reaches 22 m.
- One shared last known position + flow field (`enemyManager.ts:165-170`).
- Bodies (`src/ai/bodies.ts`): noticed to 20 m by light and view; the finder searches, others within 22 m join; a
  knocked-out guard is revived after a 3 s kneel at 60% hp (`enemy.ts:1063-1078`).
- Radio checks every 40 +- 8 s for squads (`enemyManager.ts:483-509`): a down member is "missed" and searched for.
  **Off in Sector Ops** (no squads).
- Doors: guards shut doors they opened when calm (1.5 s after), and come to shut a player-opened door they see
  (`stealthSystems.ts:505-571`; ai.md still says G41 is not built: doc drift).
- Officer buff, one flanker, one grenade at a time. Barks are text only (`src/ai/barks.ts`, 16 events).
Missing (for "guards should interact with each other and have reason"):
- Conversations / talking pairs (a stop where two guards face each other and a bark exchange), relief / shift change
  (bunker `RELIEF_DOORS` is data with no code), a guard walking over to check on a silent partner, guards relighting
  lamps, handing items, a CCTV operator reacting to cameras, voiced lines (G82: text radio now).
- `PatrolRoute.loop` (master clock) can already script meetings: two guards whose loops reach one point together.

### 2.5 Dogs and drones (M10)
- Dog exists: `kind: 'dog'`, procedural `DogModel` (`src/ai/dogModel.ts`), smell 6 m ignoring light and line of sight
  (x0.7 crouched, rate 0.9, `archetypes.ts:33-40,135-140`), sees and hears like others, no torch, never climbs (waits
  at ladder / drop links, `enemy.ts:1569`), heels 1.3 m beside the nearest humanoid within 10 m (any guard, since Sector
  guards have no squad; `enemy.ts:507-524`). Cannot be grabbed; plain takedown allowed; the palm strike does not
  exclude dogs (`strikeController.ts:91-99`), against G42 / G49. No carriable body.
- Co-op: the client builds a `DogModel` puppet (`src/net/enemyPuppet.ts:76-78`); kinds ride `ENEMY_KINDS`.
- Sector: `SectorGuard.kind: 'dog'` spawns today; `tests/sectors.test.ts:409,425,453` forbid it.
- Recon drone (`src/ai/reconDrone.ts`): spawned with each droneOp, orbits 7 m at 3.4 m, 16 m camera, no light needed.
  **Not mirrored in co-op** (no drone code in `src/net`): do not use it in a co-op section.

## 3. Security devices

### 3.1 Cameras (`src/security/*`, `src/config/security.ts`)
- Data (`security/data.ts:7-28`): `id, level, at [x,z], y (2.4-3.5), facing, sweep [a,b] (max 120 deg), aim (floor point,
  pitch = atan2(y, aim)), range (4..18, default 18), reason (required), section, offFlag`.
- Frame 70 x 45 deg, 3D range test (`camera.ts:68-77`); think 4 Hz; sweep 15 deg/s, 2 s pause; one static ray lens to
  head (`securitySystem.ts:51-58`).
- Fill: the guard sight rate at focus angle 0 with light fixed at IR 1 and the falloff `(1 - d/25)^1.5` over the guards'
  25 m (`camera.ts:83`, `perception.ts:18`): darkness never helps against a camera and range barely slows it.
- Stages (`camera.ts:103`): meter 0.3 radio line; meter 1 raises the alarm stage (5 s gap, `jammer.ts:343-358`).
  Cameras never alert guards or give them a position.
- Shot out (host only; a client's shots are not tested, `coopHost.ts:513-516`), jammed (off + frozen, 1.5 s reboot),
  repaired only by a section restart. `looped` mode and the camera desk are not built.
- Camera cue (`security/cameraCue.ts`): a red scan grid on what the camera sees, render only.

### 3.2 Lasers (`src/game/jammer.ts:277-332`, `src/game/laserPanels.ts`)
- `LaserDef`: plan segment, beam heights `ys`, `floorY`, `section`, `offFlag`. Touch within 0.3 m plan at a beam height
  inside the body (1.75 standing, 1.1 crouched). A break raises the alarm only (2 s per-player cooldown).
- Drawn only in night vision; the sensor always works. Each laser has exactly one power panel (`checkPanels`); jamming
  the panel cuts every band it powers for the jam + 1.5 s.

### 3.3 Alarm panels, keypads, locks, scanners, security room
- Alarm panels: `MapLayout.alarms {pos, yaw, section}`; see 2.3.
- Keypads: none in the live game (parked Fallow course pickups only). No code UI, no codes in intel.
- Locks: `Doors.setLocked`; a locked door has no menu options ("no lock picking or breaking in the game yet, G180",
  `doorMenu.ts:1-7`). Door menu: open, stealth open, bash (noise 10, KOs a guard behind it), optic cable (stub).
- Paired scanners (`src/game/scanners.ts`): two panels hacked 2 s each within 1.5 s, 10 hp on a fail; built only from
  `lay.course.devices` with course-specific z (`ctDevices.ts:358-362,426`): course mode only.
- Security room (`src/game/course/securityRoom.ts`): a guarded console that sets a flag turning off cameras with that
  `offFlag`; course only ("Not in Sector Ops (Michael, 2026-10-22)", `:4`; Sector passes no flag hooks, `sectorMode.ts:133-137`).
- Breakables: glass (break), grates (kick loud / unscrew quiet) (`src/world/breakables.ts`).

### 3.4 Jammer (held pistol, `jammer.ts:14-39`)
Targets cameras, laser panels and fixed electric lamps / spots. 5 s max, 5 s cooldown, 20 m, ~9 deg cone, clear line,
stand still (< 0.45 m/s). Lamps flicker off 0.5 s, stay off while jammed + 4 s. EMP gadget removed (G152).

### 3.5 Escalation
- 3 stages (G125, never fails the run). Each stage: `perStage` guards, alerted, grunt / heavy at `reinforce` points.
  The stage carries over between sections; a restart rewinds to the section's start stage. HUD "Alarm a/3".
- Not built: per-stage behaviour (armour / helmets by stage per G155), lockdown (doors locking on alarm), cameras
  briefing guards, an armed-response team (a squad arriving by a set route), camera operator.

### 3.6 Placement per section
All devices take `section` (index); `CtDevices.setLive(i)` kills the others (`ctDevices.ts:551-562`); untagged devices are
always live. Co-op mirror: `SecWire` (`ctDevices.ts:82-97`) + `sector` extras; jam claims re-checked on the host.

## 4. Traversal and co-op moves

### 4.1 Numbers (`src/config/movement.ts`, `src/player/*`)
| Fact | Value | Where |
| --- | --- | --- |
| Stand / crouch height, radius | 1.75 / 1.15, 0.3 | `movement.ts:6-79` |
| maxStep | 0.42 (nav step 0.45) | `movement.ts:75-78` |
| Step / vault / mantle | <= 0.65 / <= 1.25 (depth <= 1.0) / <= 1.8 with standing room; physics rays, so `noLedge` boxes are still mantled to 1.8 | `src/player/movement.ts:135-141`, `traversal.ts:241-264` |
| Ground grab | 1.6-2.7 | `anchors.ts:212-224` |
| Jump | `LEAP.vy` 5.6, gravity 18: apex 0.87 m; top gear 4.0 m/s | `movement.ts:422-436` |
| Jump + fall grab | lip up to ~3.22 m over the take-off floor (`FALL_GRAB` 1.5-2.35 under the lip, 0.7 plan) | `movement.ts:444-448` |
| Wall jump | lip 2.7-3.8 over the feet | `WALL_JUMP` `:335-349` |
| Climb-up room | clear standing ray 0.45 m + `HANG.out` 0.22 inside the lip; a 4.4 lip needs clear air to ~6.2 | `attachController.ts:1057-1060`, R2-PATHS |
| Split jump | facing faces >= 3.6 tall, 1.2-1.95 apart (automatic) | `SPLIT` `:307` |
| Boost (leg-up) | lip 2.4-4.5 over the floor, 2.6 m room up, 1.0 to a side | `TEAM` `:450-516`, `teamMoves.ts:111-118` |
| Human ladder grab / relay | 4.1 / partner 0.3-4.6 above, 1.6 plan | `teamMoves.ts:55-105` |
| Throw | 3.2 m out, apex 1.7, landing within 1.0 of the floor: clears nothing a solo cannot mantle | `teamMoves.ts:193,216` |
| Hang-down | drop >= 2.2, head 1.0-2.5 under | `teamMoves.ts:229-277` |
| Two-person rope | drop 2.2-6.0 | `ropeMax` |
| Revive | reviver within 1.5 m of height | LD 11.4 |

### 4.2 Solo-proof checks
- `tests/helpers/soloJumpReach.ts`: `soloJumpReach(from, lip)` = 0.7 + 4.0 t + 0.3 (`:37-41`), 0 when the lip is more
  than 3.22 above; `soloJumpThreats` (`:79-124`) flags solo-standable tops near a co-op lip. R2-JUMP adds an unbuilt
  `soloTopLandingReach` (a running jump 4.0 -> 4.4 across 3.0 m lands by ~0.10 m: gaps >= 3.6 m for a 0.5 margin).
- Rule of thumb for a co-op-only lip: 4.3-4.5 m, no wall below it within wall-jump reach of a solo top, no solo top
  within a running jump, `noLedge` on boxes 1.9-4.2 that would be stepping stones, ~6.2 m clear above.

### 4.3 Co-op-only gates that exist
| Device | Mode | Truly two-player? |
| --- | --- | --- |
| Team door / bolt (`SectorBolt`) | Sector | No: one player on the bolt side unbolts; only geometry keeps the bolt side co-op-only (R2-PATHS: every Warehouse bolt side was solo-reachable) |
| Pair bolt (r2 design: unbolts only with the partner within 1.5 m on the near side) | none | Yes; specified in R2-PATHS, not built (S) |
| PairGate (two switches within 1.0 s) | Course | By layout only |
| PassZone (both in a box) | Course (`ctDevices.ts:118`) | Yes |
| Paired scanners | Course | Yes |
| Leg-up / relay / rope to a 4.3-4.5 lip | any | Yes, if the solo checks pass |
- Solo completion (M1 "still able to complete solo"): every co-op-only pathway needs a solo route to the same
  objective / exit; bolt sides must not be solo-reachable, or the pair bolt must be used.

### 4.4 Not in the engine
Roller / sectional doors, floor or roof hatches (`window` is vertical only), lifts, one-way fire doors, rooflights,
movable ladders, prone, rope climb (G110). Glass: intact panes are static colliders, so they block guard sight and
bullets until broken; light passes (panes are not in the light shapes); no clear / frosted kinds (G45 not built).

## 5. Lighting

### 5.1 Tools (`src/world/lights.ts`)
- Kinds: lamp, spot, flashlight, window, fire (`:11`). `LightDef`: radius, intensity, cone, on, `destructible`
  (default true), `electric` (default true), `group` (circuit, -1 none), fixture model.
- Thresholds: `LIGHT.shadow` 0.28, `lit` 0.6 (`:74`); `visibilityFromLight` 0.25 in the dark .. 1.0 lit (`:345`).
- Ambient: `theme.lightLevel` (warehouse 0.3, ctcourse 0.3) and `ambientZone` per area / storey (smallest wins).
- Switches: `MapLayout.switches {pos, yaw, group}` -> "Lights off / on" (reach 1.3, `stealthSystems.ts:68-75,414-429`);
  off calls `lightsOut` (a guard comes to look). Warehouse Ops has 11.
- Shoot: any `destructible` on, non-flashlight light (`lightOnRay :412`), noise `SHOT_LIGHT_NOISE`.
- Jam: electric lamps and spots, 5 s (+4 s dark after).
- Breakers / fuse boxes / timed isolators: **none** as devices; `setGroup` is the hook ("a wall switch / breaker",
  `:239`). Marlow-final has an unmerged circuit schedule (`src/world/lighting/` in that worktree, untracked).
- Guards never switch lights back on; lights stay as the players left them until a course restart (Sector does not
  restore lamps on restart).

### 5.2 Parity
Gameplay reads only `LightField` (ambient grid, moon, baked lamp visibility, closed doors cut lamps, flashlights);
the renderer uses the same `lampMath` and bake; the HUD meter (`hud.setLight`, `src/ui/hud/hud.ts:344`) reads
`bodyLevel` at 10 Hz. Cameras ignore light. **Sector co-op does not mirror switch / shot / group state** (Course mode
mirrors its layout `groups` only, `courseMode.ts:727-735`): needs a wire field and a `PROTOCOL_VERSION` bump.

### 5.3 The rules Michael calls too strict (`docs/level-design.md`)
- 3.1 entry vantage is dark and out of every guard's view; 3.5 darkness / cover / hide spot every 4-8 m, open lit
  ground is a deliberate crossing; 3.9 checkpoint in the dark; 4.4 every guard alone **in the dark** once per cycle;
  5.1 every lit pool has a source and a switch, "Darkness is where nobody works at night"; 5.2 every lit chokepoint
  darkened two ways (switch, shot, EMP: EMP is removed); 15 darkness acceptance test (vantage and dark pockets keep a
  still crouched player under suspicious for a full cycle); 16.8.1 every lamp has an owner, fitting and switch.
- The engine itself has no darkness rule: it only needs `LIGHT.shadow` 0.28 for "in shadow". The darkness comes from
  map data (ambient 0.3 and lamp layout) and these rules.
- The lighting proposal (`docs/archive/lighting-review/PROPOSAL.md`) is **untracked** in `C:/NightShift/Mobile-Coop-marlow-final`
  (not on any branch): "lit by default, the players make the dark"; LR1 lit-by-default rule, LR2-4 vantage / checkpoint
  / isolation become "concealed or darkenable", LR5 ways to darken = switch, breaker / isolator, jammer, shot (not only a
  shot), LR6 timed isolators, LR7 standby fill 0.14 in encounter spaces, 0.30 in transit, LR12 the Sector sync gap.
  Changes to level-design.md need Michael's approval: list them as "Proposed loosenings" in the SPEC.

## 6. Gaps (what the redesign needs that does not exist)
Size: S = under a day, data or a small pure module; M = 1-3 days or a wire change; L = a new system.

| # | Gap | Why the redesign needs it | Size |
| --- | --- | --- | --- |
| G1 | Camera cap 12 per map -> per section (or raise) | 5 sections with ramping cameras | S |
| G2 | Camera range / falloff: fill over the camera's own `range`, a near "hot" zone, optional light term | M1 "less range"; owned by `feature/camera-range` (no commits yet) | S |
| G3 | Arm every guard: no runners (or a runner `weapon`); reinforcements without heavies (`sectorMode.ts:42`) | M1 "they should all have weapons"; G155 | S |
| G4 | Squads in Sector Ops: `joinSquad` per section group in `fill` so radio checks and "missed" searches run | guards checking on each other | S |
| G5 | Talking pairs / conversations: a timed meeting stop with a bark exchange (text radio, G82), interruptible | "guards should interact with each other" | M |
| G6 | Relief / shift change: a guard walks to a post and the post guard walks off (timed `loop` + swap) | reasons and timing to plan around | M |
| G7 | Guards relight lamps / reset a breaker (an investigator who finds a circuit off turns it back on) | makes cutting lights a timed choice, M9 | M |
| G8 | Light-state co-op sync in Sector mode (groups, shot and jammed lamps) + `PROTOCOL_VERSION` bump | light parity in co-op; required before any switch-heavy level | M |
| G9 | Breaker / fuse box / timed isolator device (cuts a group, has a reason, guard may reset) | M9 "players cut lights"; LR5 / LR6 | M |
| G10 | Keypads with codes found in intel (or a pass card pickup) | M10 security ladder (keypads before dogs) | M |
| G11 | Pair bolt (partner on the near side) or PassZone / paired scanners usable in Sector | true co-op-only pathways with a solo bypass | S (pair bolt) / M (scanners out of course mode) |
| G12 | Lockdown / armed response per alarm stage (doors lock, a response team by a route, helmets at stage 2+) | "security that gradually gets harder", M10 armed response | M |
| G13 | Security desk in Sector Ops (operator watches cameras; KO him or use the console to loop / switch cameras off) | a reason for cameras; the course console exists but is off in Sector | M |
| G14 | Glass per G45: clear passes sight and light, frosted light only; blinds | a research campus is glass offices and labs | M |
| G15 | Vertical sight G44: merge `origin/feature/g44-above` | high routes (atria, mezzanines) | S (merge) |
| G16 | Multi-storey: `navLayers` 4-5 (perf check), upper-storey walls (`storey.ts`), stairwell cores | campus buildings, 2-3 storeys | S (data) + perf |
| G17 | Lifts (a moving car or a lift-shaft climb) | campus multi-storey realism; can be faked with a shaft + ladder | L (or S as a shaft) |
| G18 | Hatches and rooflights (horizontal openings) | ceiling / roof entries | M |
| G19 | Roller / sectional doors, one-way fire doors (push bar) | loading bay, labs, fire exits | M |
| G20 | Dog rules: palm strike exclusion (G42), dog handler pairing (explicit leader), a dog test override in `sectors.test.ts` | M10 dogs | S |
| G21 | Recon drone co-op mirror | only if drones are used | M |
| G22 | Restart resets lamps and doors (check-slice2 item 5) | a clean retry once players cut lights | S |
| G23 | Guard-cap perf run (12 / 16 / 24 awake) on the laptop GPU; then dormant guards or AI LOD if it fails | M8 24 guards in S5 | S (run) / M-L (fix) |
| G24 | Lab / campus security tokens: access-card readers on doors (a locked door that opens with a carried card) | campus security flavour; can reuse keypad item | M (with G10) |
| G25 | Larger map load: light bake and nav build time for ~2-3x the Warehouse area (measure; split the map per section if slow) | "larger" | S (measure) |

Campus specifics (M6): glass (G14), multi-storey nav and stairs (G16), lifts (G17, fake as shaft), card readers (G24),
a security desk (G13) and lab airlocks (Course airlock logic `config/course.ts` could be reused: M). Dogs (M10) exist;
they need G20 and a G155 decision.

## 7. Requests for guard-ai (slice 0, 2026-10-23)
Guard behaviour in `src/ai/*` belongs to the guard-ai job (Night Shift | Guard AI Build). The redesign places guards as
data in `SectorDef.guards` (`SectorGuard`, `src/game/sectors.ts`). Slice 0 added these fields as optional data that no
code reads yet (except `handler`, which `checkSectorGuards` validates). Each line: the field, then the behaviour it
should drive.
- `squad?: number` (squad id within the section): `sectorMode.fill` (or a guard-ai hook it calls) joins the guard to
  that squad (`EnemyManager.joinSquad`, an id unique per section, e.g. section x 100 + squad) so squad radio checks run in
  Sector Ops and a silent (down) partner is missed and searched for (ENGINE G4). Default when absent: one squad per
  cluster of posts (posts within ~12 m), or per room. Today Sector never joins squads, so radio checks never run there.
- `handler?: number` (a dog's handler, index in the section's `guards`; required for a dog): the dog heels on that
  guard (`Enemy.leader` set at spawn, the dog in the handler's squad), not on whichever humanoid is nearest within 10 m
  (`findLeader`); if the handler goes down the dog alerts / searches by him. The dog spawns after its handler.
- `zone?: string` (post / zone tags: `secure`, `perimeter`, `lobby`, `lab`, ...): what the post protects. Drives where
  a guard returns after a search, who answers a disturbance in a secure zone first, and (with G12) lockdown posts.
- `role?: string` (`gate`, `patrol`, `desk`, `handler`, `response`, `supervisor`, ...): the job. Drives the alarm
  runner choice (a supervisor before an officer), who checks a light that went out, who does radio checks (a desk role
  calls them), and barks matched to the job.
- `reason?: string` (why he is there, M1 "have reason to what they are doing or protecting"): design text now; later a
  bark or an interrogation line (`info`).
- `pair?: number` (talking-pair partner, index in the section's `guards`): the two meet on their routes (loop clocks),
  face each other and exchange barks (G5, GA2); interrupted by a disturbance; one missing at the meeting time makes the
  other look for him (a meeting is a radio check in person).
- `SectorDef.dogs?: number` (dogs allowed in the section, default 0) is data the tests enforce; no behaviour.
Also asked: dogs carry no flashlight (G201) holds today (`carriesTorch`, tested in `enemyManagerDespawn.test.ts`); keep
it in any torch rework. The palm strike dog exclusion (G42) lives in `src/game` (`strikeTargetable`), not in `src/ai`.
