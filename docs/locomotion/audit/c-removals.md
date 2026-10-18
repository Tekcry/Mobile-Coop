# Audit (c): cover, takedowns, Mark & Execute, health, style tracker

Explore agent report, step 1. No wall-hug / back-to-wall / medkit code exists yet (only design rows in docs/systems/ct-toolkit.md:40, :213, :222).

## 1. Inventory

| item | owner file | trigger | duration | contacts | interrupts | networked | file:line |
|---|---|---|---|---|---|---|---|
| Snap cover (enter / in / peek / blind / corner / vault / dash) | src/cover/coverController.ts (986 lines) + coverState.ts | `cover` action (pad A, key Space, touch action); SNAP_REACH 3 m | ENTER_TIME 0.35 s; glide 0.25-0.42 s; SWAP_TIME 0.3 s | cover faces from `buildCoverSegments`; low 0.75-1.45 m, high >= 1.6 m | shot away -> `stumble()`; takedown / carry / traverse / team stand it aside | MoveState `cover` (+ `cu`, `lf`, `fp`, COVER_SUB incl. `blind`) | coverController.ts:50-52,65; coverState.ts:13,43; gameState.ts:1114-1116; moveState.ts:14,114 |
| Cover-to-cover glide / dash | coverController.ts (`coverDash` setting) | cover press while aiming at another face | GLIDE_MIN..MAX | other face | - | MoveState `cover` | coverController.ts:51-52,178; settings.ts:145,268,468 |
| Blind fire | coverState `'blind'`; rig `blind` | fire from cover without peeking | - | - | - | COVER_SUB.blind=8 | coverState.ts:13; moveState.ts:114,260,303; characterRig.ts:77,913 |
| Corner controller (doorway lean / check, slice the pie) | src/cover/cornerController.ts, corners.ts | aim near a corner or doorway out of cover | LEAN_TIME 0.25 s, CHECK_TIME 0.9 s | doorways, outside corners | cover / traversal -> off | no (local pose only) | cornerController.ts:10-11,21; corners.ts:30,36,79; gameState.ts:430,1165 |
| Cover aim limits | src/cover/coverAim.ts | in cover | - | - | - | no | coverAim.ts:10,96; player.ts:3 imports `clampAim` |
| Cover data (segments, standoff, points) | src/cover/coverData.ts | level build | - | - | - | no | coverData.ts:13,69,145,221 (shared with enemy AI) |
| Takedowns (behind / front / side / overCover / corner / above / below / window / drop / inverted) | src/game/takedown.ts (pure `pickTakedown`), takedownController.ts | action; tap = knockout, hold >= 0.3 s = lethal | approach 0.22 + strike 0.7 s (drop 0.5, pull 0.55) | reach 1.8, coverReach 1.9, belowReach 1.4 | player damage -> abort | client msg `td` start / done / abort; PvP `ptd`; MoveState `takedown`, `grab` (`tid`) | takedown.ts:10,15-50,110; takedownController.ts:112-175,272-278,353,438; protocol.ts:159,170 |
| Corner takedown (from high cover) | takedown.ts | attacker `highCover` -> kind 'corner' | as takedown | guard near edge | - | via `td` | takedown.ts:13,141 |
| Grab / human shield / shove | takedown.ts GRAB; takedownController | tap on `behind` | hold; hesitate 1.5 s | hostage 0.42 m in front | - | MoveState `grab` | takedown.ts:53-66; gameState.ts:1162 |
| Mark & Execute | src/game/marks.ts, executeController.ts | charge from takedown; mark (RB / T); execute (Y) | scripted | up to 3 marks | - | shot `ex`; `RemotePlayer.execCharges` | marks.ts:1; executeController.ts:20,57,103,115-162; takedownController.ts:431; gadgetSystem.ts:711; protocol.ts:525; coopHost.ts:233,726-728; remotePlayer.ts:42; coopClient.ts:310 |
| Regenerating shield | src/game/health.ts | regenDelay 4 s, regenRate | continuous | - | damage resets | snapshot `sh` | health.ts:1-54; playerTarget.ts:34 (`Health(100,50,4,30)`); remotePlayer.ts:27,128; gameState.ts:1232; protocol.ts:65,237; coopHost.ts:833; coopClient.ts:283,478; hud.ts:17,223 |
| Health pickup | src/game/pickups.ts | walk over | instant | - | - | host-auth (`onPickup`) | gameState.ts:696-704 (`heal(50)`), :1225; coopHost.ts:1087 |
| Style tracker (Ghost / Panther / Assault) | src/game/playstyle.ts | events | - | - | - | indirect | playstyle.ts:7,30,44; gameState.ts:93,286 |
| Style cash | src/progression/suit.ts `styleLines` / `STYLE_PAY` | end of run | - | - | - | no | suit.ts:223-243; rewards.ts:4,60-61 |

## 2. Removal map

### 2a. Snap cover, glide, cover-to-cover, blind fire
- DELETE: src/cover/coverController.ts, coverState.ts, coverAim.ts (move `clampAim` / `AimLimit` / `AimState` out of player.ts:3 or delete with its use). cornerController.ts: see ASSUMED A1.
- KEEP: src/cover/coverData.ts and src/cover/corners.ts. Enemy AI uses `coverPose`, `nearestEdge`, `CoverSegment` (ai/enemy.ts:13,1236,1264,1268-1270). Level build uses `buildCoverSegments`, `coverPointsFromSegments`, `coverStandoff` (levelBuilder.ts:30,41,527,546). splitJump.ts:8 imports `CoverSegment`. Back-to-wall reuses `HIGH_MIN` (coverData.ts:58) and corners.ts edge logic.
- gameState.ts: imports :51, :52, :61; fields :213, :215, :228, :238-239, :345-346; construct :361, :430; debug :601-604, :815; step :1109-1116, :1132, :1165, :1181 (`cover.spreadMul`), :1210; reset :1237-1239; `updateCoverRef` :1778-1795; `coverQ` :1827-1834; stumble :1923; `onFace` / `updateCoverHud` :2008-2062; constants :187, :191.
- player.ts:3,19-38; moveState.ts:14, :75-114, :189-191, :254-304; characterRig.ts:16, 58-77, 186-192, 346-378, 906-931, 952, 1028-1056, 1308-1350, 1407-1466; movement.ts:15,57-60; speedGears.ts (`coverPace`); config/movement.ts (`coverSpeed`, `coverCrouchSpeed`); attachController.ts:516,889.
- net: remoteAvatar.ts:257-263,289-294; coopClient.ts:423; coopHost.ts:974; netShared.ts:18; validate.ts:154,159.
- input: actions.ts:19-20, gamepadMapping.ts:53-59, gamepadSource.ts:119, inputState.ts:26-28, keyBindings.ts:14,49, touchControls.ts:25,63,85 (repurpose `cover` as the back-to-wall press).
- settings.ts:145,268,468 (`gameplay.coverDash`); worldPrompts.ts:30; controlsScreen.ts.
- tactics.ts (`CoverSpot`, `coverQuality`: enemy flanking via `PlayerRef.cover / coverT`, ai.md:117): enemy side stays; `localRef.cover` fed by back-to-wall or null.
- training.ts:6 step `'cover'`, trainingMode.ts.
- Unit tests: cover.test.ts, coverAim.test.ts, corners.test.ts; import fixes in splitJump, rig, voxelFit, detailPass, anim, input, keybinds, nav, vision, deadLineV2Map, training tests.
- e2e: scripts/e2e-cover.mjs; REQUIRED list run-e2e.mjs:24; quick map :45, :48, :50; e2e-times.json. Cover references in many suites (anchors, anim, clip, coop, ct, ct-warehouse, dead-line-v2, enemies, gadgets, lib, move, netmove, security, stealth-ai, stealth, tactics, takedown, touch, training, traverse, weapons-carry).
- Net: no message; MoveState mode `cover` in `PlayerState.mv` (protocol.ts:66). Save: none.
- Docs: cover.md :6, :63; movement.md:22,46,105-114,127-147; input-and-loop.md:18-40.

### 2b. Mark & Execute
- DELETE: src/game/marks.ts, executeController.ts, src/ui/hud/markers.ts, their tests.
- gameState.ts:83-84, :276-281, :402, :414, :492, :910, :1168-1172, :1752-1765, :1859; takedownController.ts:431; gadgetSystem.ts:711; gameEvents.ts:19; damage.ts:25; training.ts:6,25,65-66; trainingMode.ts:66,179-180; hud.ts:77,375; playScreen.ts:21; controlsScreen.ts:69; actions.ts:31-32; gamepadMapping.ts:65; gamepadSource.ts:120; keyBindings.ts:28-29,63-64; touchControls.ts:34-35; settings.ts:23-24,185-186,206 (touch layout version :31); archetypes.ts:162; suit.ts `hqStats.extraMarks` (parked).
- Net: shot field `ex` (protocol.ts:525, coopClient.ts:310), `execCharges` (remotePlayer.ts:42), coopHost.ts:233, :726-728.
- Save: HQ `marks` level (schema.ts:67,175-177), parked economy.
- Docs: takedowns.md:6; coop.md:37-40; ai.md:98.

### 2c. Regenerating shield
- health.ts: drop shield / regen; add medkit heal over time. Constructors playerTarget.ts:34, remotePlayer.ts:27 -> `new Health(100)`.
- `.shield` / `sh` callers: takedownController.ts:170,277,353; hud.ts:17,223; coopHost.ts:833; coopClient.ts:283,478; protocol.ts:65,237. (gameState.ts:2339 is the hostage shield, keep.)
- Heal: gameState.ts:702, coopHost.ts:1087. `Health.update`: gameState.ts:1232, remotePlayer.ts:128. Tests: weapons.test.ts:81.

### 2d. Style tracker and cash
- Replace playstyle.ts with a stub. Callers: gameState.ts:93, :286, :492-495, :743-745, :1217; stealthSystems.ts:168, :212; infiltrationMode.ts:171, :197, :207, :229 (keep `alarms / kills / detections` counters); coopHost.ts:240.
- resultsScreen.ts:41-78; rewards.ts:4,60-61; suit.ts:223-243 `styleLines`, :250+ preset names; profile.ts:109-111.
- Save: schema.ts:28-37 `MissionRecord {ghost, panther, assault}`, sanitize :157-158. `SAVE_VERSION = 7` at src/save/schema.ts:10; migrations.ts:97-104. Remove -> 8 + migration + literal old-save test.
- Tests: economy, missions, ui, save, net. Docs: modes-and-progression.md:10-12,46; saves.md.

### 2e. Takedowns (keep)
- Remove `g.marks.earn()` (takedownController.ts:431) and shield add-ups (:170,277,353). `overCover` / `highCover` / 'corner' (takedown.ts:13,141) remap to back-to-wall. Add the elbow strike.
- Tests: takedown.test.ts; e2e-takedown, e2e-coop, e2e-enemies, e2e-training.

## 3. Parked ?legacy=1 content
Gate: src/core/legacy.ts, `flags.legacy`. Must keep compiling: resultsScreen.ts:41-78, profile.ts:109-111, rewards.ts:4,60, suit.ts:223, loadoutScreen.ts, profileBadge.ts. Legacy e2e: e2e-progression, e2e-cosmetics, e2e-clear (run-e2e.mjs:25). Parked modes share gameState / net `sh`, `ex`: pvp.test.ts, net.test.ts, e2e-coop.

## 4. Hooks
- Stealth rating stub: keep `GameState.style` (gameState.ts:286) as a `StealthRating` with `alarms`, `kills`, `detections` and a no-op `record(ev, detected)`. `MissionRecord.rating` exists (schema.ts:30).
- Medkits: health.ts + constructors; pickup kind 'health' (pickups.ts:4,38; gameState.ts:696-704, :1225; coopHost.ts:1087; `onPickup` gameState.ts:155-156).
- Back-to-wall: `CoverSegment` / `HIGH_MIN`, corners.ts, the `cover` input action; feed `localRef.cover` and takedown `highCover`.
