# T0 - facts and baseline

Read-only research on origin/feature/training-bunker (from feature/kestrel), 2026-10-13, cloud session.
Line numbers checked by grep at that commit. A checker spot-checked the claims (section "Check").

## Baseline (cloud, software GL: trend only)
- `npm run check`: lint 0 errors / 38 warnings (no-console); 99 test files, 1085 tests passed; build ok (1 m 3 s).
- smoke e2e: ok (8 s).
- Perf trend (`node scripts/perf.mjs`, Warehouse, 10 enemies, gfx=min, machine speed x1.68): sim p95 3.9 ms,
  CPU p95 3.9 ms, anim 0.105 ms/char (over its scaled budget 0.067 on this VM: pre-existing, trend only), alloc
  11163 KB/s, draws 41, tris 0.15 M.
- `E2E_GPU=1 perf --desktop --budget`: pending PC run.
- `perf.mjs` needs a server on :4173; in the cloud run `vite preview --port 4173 --strictPort` around it and kill it.

## SPEC engine questions
**Q1 Nav floor.** Confirmed: rays cast down to y -2 and stop at y <= -1.5 (src/ai/navBuild.ts:86, :84), from
max(14, highest top + 1) (:65-66). Every bay floor (lowest y 0) is sampled. Caveat: at most 8 hits per column (:84),
each hit counts (slabs, duct shells); a surface needs 1.7 m headroom (:91, HEADROOM :9) and normal y > 0.65; NavGrid
keeps the lowest `layers` surfaces (src/ai/navGrid.ts:198). Keep stacks (B3 shaft, B7, B9) to 8 or fewer hits per column.

**Q2 navLayers 5.** Confirmed, per map only: `MapDef.navLayers?` src/world/mapDef.ts:81, passed gameState.ts:481,
default 3 (navBuild.ts:14, :20); arrays sized cols x layers (navGrid.ts:182-192).

**Q5 Jump out of a split (B3 RC).** The probe is floor + SPLIT.feetHeight 2.5 + 1.05 (src/player/attachController.ts
:1037-1047); `findJumpTarget` (src/world/anchors.ts:898) accepts an upward dy of 0.4-1.2 (:929-930), so the lip must be
3.95-4.75 above the split floor, hangable (face >= 1.9, LEDGE.minDrop :190) and at least about 1.45 m ahead of the
brace. 4.0 is 0.05 inside: T0 sets the casing top to 4.3 (see LOG.md spec change request).

**Q6 Ducts.** No engine size: a `Duct` is a feet-height polyline with grates (anchors.ts:79-96; builder
levelBuilder.ts:261). Duct camera boom 0.9 / pivot 0.55 (src/config/camera.ts:109) fits 1.0 high. Grate kinds 'wall' |
'ceiling' | 'floor' (anchors.ts:85). Entry within 1.1 m and grate y within 1.4 of the feet, wall grates faced
(anchors.ts:721-727). Only the entry grate is kicked (tap) or unscrewed (hold 1.2 s) (attachController.ts:529-568);
the exit opens itself (:574). A non-wall exit is a committed drop: lower 1.5 m on the hands (VENT_LOWER :68), then a
landing of the full drop (:500). B6 vent drop (3.4 m, or 2.65 onto the desk) is a roll landing (LANDING roll 2.5-4.5,
src/player/movement.ts:204), noise radius 5 (src/config/noise.ts:10): works. The B3 duct is one-way (pit-end entry,
corridor exit). The B6 supply duct entry (floor 3.4) is out of reach from A5's floor: needs a step-up (spec change).

**Q7 Rappel 15.4.** No length limit (RAPPEL movement.ts:318; RappelPoint anchors.ts:152; builder levelBuilder.ts:277).
Entry within 0.4 of `top.y`, reach 0.9 (anchors.ts:750-755). The rope bottom `top.y - length` is used as the floor at
the bottom exit (attachController.ts:468); unhook only with 2.0 m or less left (:714-715). So the length must reach the
floor under it (15.4 only if that floor is local 2.0; to y 0 use 17.4). Window kick: sill within 0.8 of feet + 0.6 (:742).

**Q8 Zipline 22 / 25 m.** No length or slope limit (levelBuilder.ts:253; Zipline anchors.ts:124). Speed ZIP_SPEED 6,
accel 2.4 (src/player/attach.ts:64-65). Entry within 1.3 m of `a`, cable 1.5-2.6 above the feet (anchors.ts:715-719).
The body hangs HANG.drop 1.9 below the cable (attach.ts:265); the ride ends in a launch along the cable (attachController
.ts:504-510). So the cable end `b.y` sits about 1.9 above the landing floor (B3: WP 2.6 -> 4.5; same rule for B9).

**Map building, other.**
- No Vitest test runs `LevelBuilder.build(scene)`. Map tests call `def.build(new LevelBuilder(), 0)` for data
  (tests/deadLineV2Map.test.ts:17-18); ledges and splits come only from `build` (levelBuilder.ts:530, :540): test them
  with `generateLedges(boxes)` (tests/anchors.test.ts:33) and `findSplitGaps(buildCoverSegments(boxes))`
  (tests/splitJump.test.ts:13). NullEngine only in tests/voxel.test.ts:169-173.
- Stairs (levelBuilder.ts:181-193): visual steps (collide false) plus a hidden pitched 0.3 m ramp (:192; ramp :171); pitched pieces
  make no nav blockers (navBuild.ts:27) and no ledges.
- `overhead` (levelBuilder.ts:54-56, mark :367) only drops the piece from nav blockers (navBuild.ts:29); the sampler still
  hits it, and a roof with 1.7 m headroom above becomes a nav layer.
- Takedowns: drop 1.2-5 m below, reach 1.0 (src/game/takedown.ts:42-44, :236); inverted 0.6-2.8 m below, reach 0.9
  (:47-49, :167); GRAB :53. Anchors: LEDGE / HANG / REACH :188 / :204 / :212, nearestInReach :772;
  findSplitGaps src/player/splitJump.ts:34.

**Q3 Door lock at run time.** `Door.locked` is a plain mutable field (src/world/anchors.ts:119), set at build
(src/world/levelBuilder.ts:269-270); nothing in the game writes it (only src/editor, off-limits). `Doors.open` refuses
locked doors (src/world/doors.ts:145); `setOpen` (:163) ignores locks, so client mirroring works. The door
interactable's enabled flag is set once from the lock (src/game/stealthSystems.ts:87). Clients see open indices only
(src/net/protocol.ts:155; coopHost.ts:823-825; coopClient.ts:217, 265-267); the item `on` flag does reach clients
(coopHost.ts:818, :848-856). Consequence: T1b `Doors.setLocked` must also `setEnabled` the door interactable, and
`locks` travel in the `course` message.

**Q4 TrainingDummy above y 0.** Yes: the constructor uses `home` as given, no floor snap (src/game/trainingDummy.ts:24-44;
update :83-96 keeps home.y). Only the sandbox helper hard-codes y 0 (src/game/gameState.ts:564-565). Dummies are not
EnemyManager enemies (no MAX_ALIVE cost). Strafe is x/z only: the floor under a strafe path must be flat.

**Q9 Lights per map.** Hard cap 255 baked lights: `lampGrid` takes `min(255, count)` and stores ids +1 in a Uint8
(src/voxel/lampBake.ts:326, :341); every non-flashlight light is baked (src/world/lightBake.ts:17). LightRegistry has
no cap (src/world/lights.ts:100-132). Per 2 m column: 8 nearest lamps by horizontal distance whose radius reaches it
(lampBake.ts:313-315, :335-338); the column spans all heights, so stacked storeys share the 8 slots. levelAt
(src/world/lightField.ts:121, :198-214) and the renderer (src/world/bakedLamps.ts:129) read the same grid (parity
holds; a 9th lamp is dark in that column). GI_SLOTS = 12 switch groups (src/world/world.ts:83; extra groups share the
last slot, :93). Lamp atlas rows are 1024 cells with no height guard (lampBake.ts:262): GPU item.
Consequence: 150-170 lights fits; keep a running total with headroom; count per column across stacked storeys; at
most 12 switch circuits map-wide. `ambientZone` defaults to maxY 8 (levelBuilder.ts:395): upper and deep storeys pass
minY / maxY.

**Q10 SQUAD_CAP.** Not inherited: each mode declares its own (clearMode.ts:12, infiltrationMode.ts:14, both 9).
Enemy alive cap MAX_ALIVE = 12 (src/ai/enemyManager.ts:25; spawn returns null at the cap :403; reinforce :247 spawns
fewer silently). Consequence: the course spawns per bay on bay start and despawns the previous bay's squad; the active
bay's squad plus reinforcements stays at 12 or fewer.

## Course framework reuse list
- ModeId: src/game/modes/gameMode.ts:9; `MapDef.modes` src/world/mapDef.ts:74; mode ternary gameState.ts:508-517
  (falls through to MissionMode; sandbox skips at :472, :479).
- NetMode: src/net/protocol.ts:28-29 (NET_MODES; 'start' parse validates at :407, :491). `capacity` :32 needs an
  explicit course branch (else COOP_MAX 4, :15); enforced at src/net/session.ts:103, :234-235. PROTOCOL_VERSION :12 = 2.
- Lobby: MODE_OPTS src/net/coopUi.ts:251-258, lobbyModes :260, map filter `m.modes.includes` :349. Do not add 'course'
  to PARKED_MODES (src/core/legacy.ts:9). Keep it out of the solo Play screen MODES (src/ui/screens/playScreen.ts:16, shown :26).
- Lights: no light / lamp / group state reaches clients (none in protocol, coopHost, coopClient). setGroup
  src/world/lights.ts:174, destroy :186. T1b's `lights: { groups, dead }` is new work.
- Respawn: host death gameState.ts:870 -> `net.onLocalDeath` (coopHost.ts:1042) or `mode.onPlayerDeath`; remote death
  coopHost.ts:312-325 (:324), leaver :301; mode calls `g.scheduleRespawn(point, 3)` (infiltrationMode.ts:287-297);
  gameState.ts:723 stores, :1236-1250 revives and calls `net.onRespawn` (coopHost.ts:1061 revives remotes). CourseMode
  can restart the bay and schedule respawn at the airlock; remotes follow.
- Client use: mirror item sends `{t:'use',id}` (coopClient.ts:247); parse protocol.ts:440-442; host coopHost.ts:454-455
  -> onUse :488-498 (alive, enabled, reach + 0.75, dy <= 2) -> `it.onUse(it)` or `mode.onInteract`. The host does not
  pass who pressed: bolt (side) and pair (who) gates need the RemotePlayer passed through (small coopHost change).
- Interactables: InteractKind src/game/interactables.ts:7, add :59, nearest :121, onUse :42. Mirrored kinds limited by
  ITEM_KINDS (protocol.ts:103, imported coopHost.ts:15); MAX_ITEMS 48 per snap (protocol.ts:20).
- ObjectiveChain (src/game/missions.ts:166) is bound to MissionDef / ObjectiveType (:10, :179): style model only.
- Radio: only path is EnemyManager.onBark -> `hud.barks.say(id, line, radio)` (gameState.ts:501-504; src/ui/hud/barks.ts
  :39-53) which prints "Radio:" / "Guard:" with no speaker name, hides when subtitles are off (barks.ts:48; setting
  src/core/settings.ts:269), shows 2.2 s (BARK.show, src/ai/barks.ts:50). T7a needs a small radio channel (named speaker LANTERN,
  90-character cap, shown whatever the subtitles toggle). HUD has banner / setObjective / setModeInfo / feedItem
  (src/ui/hud/hud.ts:291-392).
- S1 cameras: built from `world.layout.security` on any map, host only, any mode (gameState.ts:549-560). Fields
  src/security/data.ts:7-18; `y` 2.4-3.5 above `levels[level]` (src/config/security.ts:17-18; securitySystem.ts:43),
  so B1 cameras need `levels: {B1: 16}`. At most 12 cameras, sweep <= 120 deg (security.ts:30; cap :39). Gap: nothing sets
  `SecuritySystem.onEvent` (securitySystem.ts:31; fires 'stage' :93, 'cameraDown' :106): the course mode must hook it.
- AI: alarm once per match (enemyManager.ts:239-244); hear() 3D with wall muffle (:483); lightsOut (:258-274) and the
  switch toggle (stealthSystems.ts:174-192) use horizontal distance only (25 m nearest, 14 m notice): keep stacked
  guards apart in plan. Radio relay 22 m 3D (enemyManager.ts:60, :169). shotRay stealthSystems.ts:194. SquadSlot
  src/world/rooms.ts:20-39 (`y` = storey). surfaceAt matches feet within 0.35 of `top` (src/world/surfaces.ts:28-42).
