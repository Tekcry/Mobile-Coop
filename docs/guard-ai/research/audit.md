# guard-ai - code audit against the 9 goals (BRIEF.md)

Research agent, 2026-10-23, read-only, on `feature/guard-ai` a9ab3a29 (master 4.64.0 + g44-above). Refs are `file:line`
on this branch. Plan base: `docs/archive/reviews/guards-review.md` (origin/feature/menu); its moved refs are in section 0.

## 0. Review line refs, re-checked (old -> now)
| Review ref | Now | Still true? |
| --- | --- | --- |
| enemyManager.ts:557-571 `hear` | 538-552 | yes: every unalerted guard in radius; walls x`MUFFLE` 0.45 |
| enemyManager.ts:267-283 `lightsOut` | 268-284 | yes: nearest calm 25 m, others 14 m `notice`, no LOS / walls / storey |
| enemyManager.ts:542-553 `noise` | 523-534 | yes: all within 28 m to combat, no walls, sets the global LKP |
| enemyManager.ts:228-239 bodies | 229-240 | yes: everyone within 22 m searches at once |
| enemyManager.ts:168-180 radio | 169-181 | yes: shout 8 m, radio 22 m, not relayed |
| enemyManager.ts:286-310 alarm | 287-311 | yes |
| enemy.ts:560-573 `hear`; :564 melee | 561-574; 565 | yes: `heard=true` overrides the suspicion floor |
| enemy.ts:133-137 paces | 134-136 | yes: patrol 1.1, investigate 1.2, search 1.3 x walk (backwards) |
| enemy.ts:1159, 1246 run | 1160, 1247 | yes |
| enemy.ts:1121 look sweep; 1617 turn | 1122; 1618 | yes |
| alertState.ts:125 / 129 / 135 | same | yes |
| perception.ts:196-200 `noiseSuspicion` | 215-219 | yes |
| patrol.ts:37, 39-41, 51-187, 143-153, 156-186, 193-199 | same | yes |
| gameState.ts:1334-1341 glass; 633-636 impact | 1429-1437; 671-675 (`IMPACT_NOISE` 4, :270) | yes |
| stealthSystems.ts:418-429 shot lamp | 431-443 (`shotRay`); switch 414-429 | yes |
| enemyPuppet.ts:240 low ready | 269 (aim from `st` only) | yes |
| ctcourse.ts:101-103 guard | 209-212 (two passive guards: station 1, S3 security room) | yes |
| warehouseSectors.ts:30-48 / 90-107 / 143-163 | 33-51 / 96-113 / 150-170 | yes (roles are comments only) |
| docs/systems/ai.md:36 stale | ai.md:39 (says wait 5.5, glance 10; code 9 / 14) | yes |

## 1. Goal by goal

### G1 Hearing by range with masking
Exists:
- API: `EnemyManager.hear(pos, radius)` (enemyManager.ts:538-552) -> `Enemy.hear(x, z, r)` (enemy.ts:561-574);
  `EnemyManager.noise(pos, radius)` for loud gunfire (523-534) -> `hearGunfire` (577-583) -> combat.
- Walls: one static ray at head height (+1.5 / +1.6), only when `d > radius * MUFFLE` (544-549). Inside 45 % of the radius
  walls are ignored entirely (a guard 6 m behind two walls hears a 15 m glass break at full strength). Distance is 3D
  (`Vector3.Distance`), no storey rule beyond the ray.
- Suspicion: `noiseSuspicion` (perception.ts:215-219) gives 0.12..0.70, but `Enemy.hear` returns only when s <= 0 (564),
  so every guard in range sets `heard` -> `AlertMachine` suspicious (alertState.ts:125) -> investigating after `hearLook`
  2.4 s (135). The floor below `PERCEPTION.suspicious` 0.3 never filters anyone.
- `noise()` ignores walls, includes alerted guards, writes the exact shooter position into the shared LKP (531).
- Sources (all call `hear` unless noted): footsteps every 0.25 s (gameState.ts:1813), fence rattle (1817), landing
  (1461), roll (1694), glass 15 / kick 10 (`onBreakable` 1429-1437), shot <= `SUPPRESSED_NOISE` 0.6 -> `hear(28 x n)`,
  louder -> `noise` (586-587; pistolSd 0.35 -> 9.8 m), impact `hear(b, 4)` (674), noisy holds (1233, 1326), takedown
  (takedownController.ts:647), strike (strikeController.ts:240), doors quiet 2 / bash 10 (stealthSystems.ts:130),
  body drop 3 (297, 321), shot lamp 5 (441), gas 3 / flash 16 / noisemaker / sticky-cam ping 10 (gadgetSystem.ts:347,
  356, 461, 550), download (infiltrationMode.ts:261), co-op client shots and takedowns (coopHost.ts:656, 1108-1115).
- A guard dying makes no sound of its own; guard gunfire is never a noise to other guards (`onEnemyShot` is audio only).
- Ambient / noisy props: none anywhere. No map field, no audio emitter, no masking term. Only an editor catalogue
  'generator' prop (editor/catalogue.ts:72, Kestrel, dev only) and music-render 'hum' layers.
Gap: per-guard threshold (only those whose suspicion clears 0.3 react), walls at every distance, masking near noisy
things, and one responder per noise event (the rest only turn).
Hook: `EnemyManager.hear` is the single funnel (plus `noise`): add a pure `heardLevel(dist, radius, walls, mask)` in a
new Babylon-free `ai/hearing.ts`, cast the wall ray always (cost: one ray per guard per event inside radius), drop
`heard=true` for s < 0.3 (head turn via `notice`), and pick the responder there. Masking needs map data (section 4).
Tests that break: e2e-stealth-ai 'noise' (264-290: radius 9 at 6 m gives s 0.18 -> no longer suspicious), 'shots'
(675-710: suppressed shot at 10 m of 12.6 m gives 0.145; impact at ~1.8 m of 4 gives 0.296; both assert
'suspicious'), 'lights' (563/567: timing rides `hearLook`); perception.test.ts:111-116 (thresholds) and 135-145
(`heard` -> suspicious -> investigating). Keep: e2e-sectorops 452-461 (suppressed shot alerts nobody) and 480 (loud shot
alerts the nearest); e2e-wall 179, stepVolume / speedGears / holdNoise tests only check radii.

### G2 Witnessed kill or found body
Exists:
- `Enemy.die` (enemy.ts:738-757) hands the rig to `addBody` at once, so a witness notices it on its next think via
  `lookForBodies` (939-957: calm, non-melee, `bodyNoticed` field x light x distance, BODY.range 20, close 2.5; one ray).
  No "saw it happen" event, no killer attribution; a guard in combat never looks (940).
- `bodyFound` (enemyManager.ts:229-240): bark 'body' (not a radio bark: barks.ts:43), finder `searchAt` (with revive if
  KO), and every calm guard within `RADIO` 22 m `searchAt` the body at once (no walls, no delay, no radio).
- Wake: finder in `searching` walks to it, kneels `BODY.reviveTime` 3 s (enemy.ts:1064-1083) -> `revive`
  (enemyManager.ts:371-379) makes a NEW `Enemy` (new id, 60 % hp) that has no route (stands post where he fell for good),
  no squad, no hold, no `info`, `passive` lost.
- Radio check finds silent squad members (481-507) but squads exist only in Clear / Infiltration (clearMode.ts:96,
  infiltrationMode.ts:94); Sector never calls `joinSquad` (sectorMode.ts:382-400; ENGINE.md fact 4).
Gap: witness event (sight of the takedown / kill -> immediate caution, wake or report), report by radio with delay
(killable reporter), KO vs dead branches feeding G3, keep the revived guard's slot (route, squad, hold).
Hook: `ctx.addBody` / `onKilled` (enemyManager.ts:139-143, 187-191) to raise an incident; witnesses = calm guards with
LOS + field to the victim at that moment (reuse `lookForBodies`' ray); `bodyFound` becomes "report" (bark radio + delayed
`radio`-like call); `revive` should re-use the downed guard's walker / squad (store them on `Body`).
Tests that break: e2e-stealth-ai 'bodies' (413-450: mate 7.6 m away must be `searching` 1 s after the find; staggered
radio may miss the 1 s), 'revive' (613-634: `em.alive` must grow, bodies 0), 'radio window' (318-342: guard b at 10 m
sees two KO bodies and must not be 'alert'); perception.test.ts:191-196 (search trigger), 283-290 (`bodyNotice`).

### G3 Caution (death: until every aware guard is down; KO: timed)
Exists: no caution tier. `AlertLevel` = unaware | suspicious | investigating | searching | alert | cooldown
(alertState.ts:12). `cooldown` (sensitivity 1.3, 45 s, alertState.ts:31, 44, 129) is the nearest thing; after combat
`fought` pins it forever (101, 129). After a body: `searching` 60 s -> cooldown 45 s -> unaware (not fought), so a death is
forgotten after ~105 s and a KO likewise. No record of who knows what.
Gap: an incident registry (kind dead / KO, place, time, aware set) and a `cautious` state per guard: dead -> held while any
aware guard lives (aware guards eliminated -> clear); KO -> the woken guard and waker search, cautious "a few minutes"
(M3), then normal.
Hook: new pure `ai/incidents.ts` (aware sets as guard nums, timers; Vitest), owned by `EnemyManager`; remove a guard
from every aware set in `ctx.onKilled` (fires for KO and kill, 139-143) and `despawn` (398-427); clear in `resetMemory`
(443-455). Per guard: either a new level `cautious` in `AlertMachine` (edits every `switch` on level, `SENSITIVITY`,
`torchRule` archetypes.ts:156-160, `alertCode` coopHost.ts:81-84, puppet `LEVELS` enemyPuppet.ts:20) or a flag over
`cooldown` (`AlertMachine.calm = 'cooldown'` with a hold) - the flag is smaller.
Tests that break: perception.test.ts:146-153 (investigation -> cooldown -> unaware in 45 s), 168-183 (after combat cooldown
for good); e2e-stealth-ai 'lkp' (385-391: search ends `cooldown|unaware`); e2e-sectorops 353-354 (after restart every
guard 'unaware', `fought` 0: `resetMemory` must drop incidents); sectorRestart.test.ts; e2e-coop 423 (puppets 'unaware').

### G4 Broken or disrupted light
Exists: `lightsOut(x, z)` (enemyManager.ts:268-284), called from a shot lamp (stealthSystems.ts:442), a switch off
(427), the EMP gadget (gadgetSystem.ts:384; EMP removed by G152). The nearest calm non-melee guard within 25 m gets
`hear(x, z, max(6, bd x 1.6))` (s ~0.2, but `heard` -> investigate after 2.4 s); the rest within 14 m `notice(0.32)`
(a 3.5 s look, then calm). No LOS, walls or storey on either. A shot lamp also emits `hear(lamp, 5)` (441) and an impact
`hear(end, 4)` (gameState.ts:674): every guard within those radii investigates too. Investigation = walk to the lamp's
plan point, look 4 s with a +-1 rad sweep (enemy.ts:1112-1122, `ALERT.investigateLook`), give up at 20 s, then
`cooldown` 45 s and `rejoin` the route (onLevel 688-691). Torch on in the dark (archetypes.ts:156-160; 4 slots,
enemyManager.ts:314-345). The jammer's lamp cut (jammer.ts) never calls `lightsOut`: jammed lamps draw nobody.
Gap: 1-2 investigators (2 only if two are near; one if one), selection by path / LOS / storey, a short sweep of the
vicinity (2-3 points round the lamp, reuse `searchPoint` with a small ring), then straight back to normal (no 45 s
cooldown, no G3 caution), relight (GA4, if it lands), jam cut as a light event.
Hook: `lightsOut` (replace the `hear` hack with an explicit `investigate(x, z, mode: 'light', partner)` on Enemy);
mute `SHOT_LIGHT_NOISE` / impact for guards already picked. Pure picker in `ai/hearing.ts` or `ai/incidents.ts`.
Tests that break: e2e-stealth-ai 'lights' (515-567: guard at (6, 3) must be `investigating` 2.8 s after the shot and get
a torch within 15 s; the switch case 2.8 s after); coopTorches.test.ts, enemyManagerDespawn.test.ts:112-128
(torch rule) only if `torchRule` levels change; e2e-coop 168-172 (client torch) via the investigating level.

### G5 Alerts spread by voice, then section radio, staggered
Exists: spotter -> `shout` 8 m / 2.5 m height, 0.3-0.6 s, no walls (enemyManager.ts:176-181, `ALERT.shout`); radio after
`callInDelay` 2.5 s x reaction (enemy.ts:670, 803-811; killing the spotter first stops it); loud alerts (hit, gunfire,
spawned alerted, flashbang) `callAlert` at once (666). `callAlert` (169-175): every calm guard within 22 m (3D), delay
0.4 + 0.03 d + rand 0.3 (max ~1.4 s) x reaction x officer; radioed alerts never relay (665). Gunfire `noise()` alerts all
within 28 m at once. One shared LKP / flow field for all alerted guards (enemyManager.ts:163-168, 587-594).
Squads: only Clear / Infiltration rooms; Sector Ops loads one section at a time, so "own section" there = every live
guard; a sub-section group needs `SectorGuard.squad` (sector-redesign, section 3).
Gap: radio scoped to the caller's squad / section, not a 22 m circle; stagger over a few seconds (in order of distance
or roster); voice range blocked by walls; other sections / squads untouched (also by gunfire `noise()` and the shared
LKP).
Hook: `ctx.callAlert` / `ctx.shout` closures (enemyManager.ts:169-181) and `radioCheckNow`'s squad map (89, 470-478);
fallback for `squad === -1` (every e2e-stealth-ai guard is spawned without one) = today's distance rule.
Tests that break: e2e-stealth-ai 'radio' (293-317: b at ~10.8 m joins within ~4.5 s of the sighting, guard at 25 m not
told), 'radio window' (318-342: guard 4.2 m away joins within 0.8 s by shout); e2e-sectorops 324 (`alerted >= 4` before
the restart); e2e-takedown 161-162 (a guard alerted by a call can still be taken from the front).

### G6 Reinforcements only after a raised alarm; aggressive
Exists: Clear / Infiltration: `assignAlarm` (enemyManager.ts:287-311, 2 Hz, stealth only, alerted non-melee guard
within 30 m of a panel, officer x0.25) -> `Enemy.runAlarm` (613-618) runs at `runSpeed`, holds `raiseTime` 1.6 s x
reaction (enemy.ts:1146-1162) -> `raiseAlarm` once per match (249-254) -> `StealthSystems.onAlarm` (stealthSystems.ts:
477-503: grunt, grunt, heavy at the `reinforce` point furthest from the player) or the mode's own (clearMode.ts:113,
sectorMode.ts:406-411). Sector Ops: panel, camera full meter and laser break each raise one stage (max 3) and send
`perStage` 2 (sectorMode.ts:406-436, ctDevices.ts:964-990, sectors.ts:427-484); a radio call-in never raises anything.
Reinforcements: `EnemyManager.reinforce` / `spawn(kind, pos, alerted=true)` (257-264, 457-467) -> `e.alert()` ->
`loudAlert` -> `callAlert` at once from the entry point (onLevel 666): they radio-alert every calm guard within 22 m of
the door as they arrive. They run the normal brain: 85 % seek cover first (1223), cover-to-cover advance with 2.5 s
holds out of sight (1234-1245) - cautious, not aggressive. Course mode never sets `em.stealth` (only clear / infiltration
/ sector do: clearMode.ts:56, infiltrationMode.ts:55, sectorMode.ts:122), so in Marlow Yard alarm runs, radio delays and
LKP rules are all off (any active guard there would be sent at the real player).
Gap: "radio report that gets through" as an alarm trigger (the spotter's `radioT` expiring alive), a camera alarm should
it count (M4 names panel or radio only: question for Michael, Sector currently sends guards on camera / laser), an
`aggressive` flag (no cover-first, run to LKP, push, flank at once), arrival without alerting the whole entry area.
Hook: `Enemy.update` radio expiry (803-811) -> `ctx.raiseAlarm(e, null)`; `reinforce` sets `aggressive`; `decide`
(1218-1248) branches on it. Sector's stage logic lives in sectorMode / ctDevices (not ours): agree a hook
(`em.onAlarm` already exists) by message.
Tests that break: e2e-stealth-ai 'alarm' (570-610), e2e-sectorops 163-166 (`onAlarm()` -> stage 1, `reinforced` 2,
`hunting >= 2` after 1 s), 228-257, 274; ctcourse 220, 410 (camera stage); tests/sectors.test.ts (`alarmStep`),
laserAlarm.test.ts.

### G7 High-security posts hold, still distractable
Exists: `Enemy.hold: RoomRect` (enemy.ts:252): combat stays inside (1170, 1226-1231, 1273), cover inside (1417, 1453),
investigation and search spots clamped into the room (1110); set by Clear / Infiltration per room (clearMode.ts:95,
infiltrationMode.ts:93; `SquadSlot.free` opts out). Calm noises still turn and walk him within the room (distraction
works). Not honoured: `assignAlarm` (a held guard runs to a panel outside), `lightsOut` picker, `bodyFound` radius search
(clamped spot, so fine), revive (new Enemy loses `hold`). Sector Ops sets no hold; `SectorGuard.zone` is a string tag,
not an area.
Gap: a post area (rect or centre + radius) per guard from map data, "never leave" vs "leave for combat only", a
distraction budget (look / step out N m, return), excluded from alarm runs and light / body duty.
Hook: reuse `hold` (accept a circle too: `clampToRoom` / `inRoom` in world/rooms.ts), set from the slot at spawn.
Tests that break: none directly; e2e-ct-warehouse 225 / 249 and sectors.test.ts isolation (318, `CHECK_PATROL_PACE`
sectorCheck.ts:219) if calm walking changes.

### G8 Tactical: together, flank, cover, hide and report, no rushing
Exists: cover first (1223), attack <-> cover 2.5-4.5 s (1258), peek cycles 4.2 s x5 with blind fire (1320-1327),
suppressive fire 2.5 s after losing sight (1251-1252), cover-to-cover advance on the LKP out of sight (`pickAdvance`
1407-1440), doorway pause 0.7 s (849), one flanker vs a player holding cover > 4 s (enemyManager.ts:567-585,
enemy.ts:1373), one grenade > 6 s (1365), officer buff 12 m (659-672). `heavy` / `enforcer` have `usesCover` false
(enemies.json) and `runner` / `dog` are melee (skip bodies 940, lights 272, alarms 296, flanking 577).
Missing: roles per incident (pin / flank / hold / report), flanking only when the player sits in cover, everyone homes on
the one shared LKP (one flow field), `chase` runs at `runSpeed` when not a cover user (1247), the spotter keeps fighting
(no break to cover to radio), no pairs (G11), no retreat when outnumbered.
Hook: a squad coordinator in `EnemyManager.update` at 2 Hz beside `assignFlanker` (role per alerted guard), read in
`decide` (1138-1353). Pure scoring in `game/tactics.ts` (already Babylon-free, tactical.test.ts).
Tests that break: e2e-wall 241-242 (flanker after 4 s, grenade after 6 s), e2e-stealth-ai 'lkp' (385-391: converge
< 2.5 m, search, no wallhack), e2e-takedown 391, tactical.test.ts.

### G9 Cameras see downed guards and send guards
Exists: `SecuritySystem.think` (security/securitySystem.ts:105-123, 4 Hz) tests players only: `cameraSight` (51-58, IR
light, one static ray to the head) -> `stepCamMeter` -> events `stage` / `cameraDown` (18-20). "Cameras only report;
they never touch enemies" (63). `CtDevices` owns `onEvent` (ctDevices.ts:311-312, replaced not chained) and turns stage 2
into an alarm stage (978-990). The system exists only on the host (gameState.ts:698-708, `!this.puppet`): no wire need.
`em.bodies` (enemyManager.ts:65) has `pos`, `light`, `found`, `present`, `lethal`.
Gap: a body test per camera (frame + one ray to the body, `c.sees` respected so jam / off / console-off cameras are blind),
a `body` event, and a guard dispatch (nearest 1-2 calm guards within N m search it, `found` set, KO woken) - no alarm
stage, per M6.
Hook: in `SecuritySystem.think` add a body pass (bodies via a new `SecurityHost.bodies?()`), a separate callback
(`onBody`) so `CtDevices`' `onEvent` stays untouched (ctDevices.ts is Menu Notes'); `EnemyManager.cameraReport(x, z, b)`
does the dispatch (G2 / G4 picker).
Tests that break: none if no alarm stage changes; watch e2e-ctcourse 377-410 (security room: alarm unchanged) and
e2e-sectorops 118 / 123 (`Spotted 0`); securityCamera.test.ts, cameraCue.test.ts.

## 2. Hot loops and their allocations
| Loop | Rate | Cost / allocation |
| --- | --- | --- |
| `EnemyManager.update` (596-657) | 60 Hz | for-of over enemies; `this.players()` at 637 nearly every step |
| `players` callback = `GameState.playerRefs()` (gameState.ts:917-921) | per call | NEW array `[local, ...remotes]` each call. Called in `Enemy.move` (enemy.ts:1598) per guard per step, `perceive` (856), `shoot` (1545), manager 578 / 589 / 637 / 690, `SecuritySystem.think` (106). `playerRefsInto` (924-932) exists and is unused here. Biggest per-step allocation. |
| `Enemy.decide` / `calmDecide` (1030-1353) | 60 Hz x guard | returns a new `{point, speed, face}` object every step; combat also `tp: P2` (1165), `sp` (1272), `[cp.pos.x, cp.pos.z]` (1305, 1329), `pt` (1340, 1345); `chasePoint` `me` / `cand` (1391, 1400) |
| `Enemy.move` (1567-1642) | 60 Hz x guard | separation O(N^2) over guards + players; no alloc besides `players()` |
| `Enemy.perceive` (843-936) | ~4 Hz x guard | 2-3 LOS rays + 1 body ray; for-of over `players()` |
| `pickCover` (1442-1486) | on entering seekCover | `coverQuality({..}, [{..}])` allocates per cover candidate (1464); `findPath` allocs |
| `goTo` / `findPath` (1002-1027) | replans <= 1 Hz | A* arrays |
| `updateTorches` (314-345) | 60 Hz | `torchOwner.includes` per guard; 5 rays per torch round robin |
| `refreshFlow` (587-594) | 2 Hz | `filter` + `map` arrays + a full-grid flow field |
| `assignFlanker` (567-585) | 2 Hz | `players().some(closure)`, `players()[0]` per guard |
| `updateBuffs` (659-672) | 2 Hz | O(N^2) |
| `hear` (538-552) | per noise (footsteps 4 Hz) | <= 1 ray per guard, `earA/earB` reused, no alloc |
| `frameUpdate` -> `Enemy.frame` (1732-1788) | render | `computeWorldMatrix(true)` + `getAbsolutePosition` per guard |
| `SecuritySystem.think` | 4 Hz | per camera x player one ray; `players()` alloc |
New code must use the `playerRefsInto` pattern, reuse result objects for `decide`, and keep incident / radio queues as
preallocated arrays. 24 awake guards are unmeasured (ENGINE.md fact 2; guard-cap run never done).

## 3. Babylon-free and unit-tested today
| Module | Babylon-free | Tests |
| --- | --- | --- |
| ai/perception.ts | yes (mathx, physics/groups, world/lights) | perception.test.ts:18-117 |
| ai/alertState.ts | yes | perception.test.ts:119-197 |
| ai/patrol.ts | yes | perception.test.ts:198-248 |
| ai/bodies.ts, ai/alarm.ts | yes | perception.test.ts:282-307 |
| ai/archetypes.ts, ai/barks.ts | yes | archetypes.test.ts (13 its, incl. `BarkVoice` :88, `radioCheck` :83 - the pure fn is unused by the manager) |
| ai/guardInfo.ts | yes | guardInfo.test.ts |
| ai/navGrid.ts | yes | nav.test.ts |
| config/noise.ts | yes | holdNoise.test.ts |
| security/camera.ts | yes | securityCamera.test.ts |
| game/tactics.ts, cover/coverData.ts | yes | tactical.test.ts |
| ai/enemyManager.ts | no (Vector3), but unit-testable with stubs | enemyManagerDespawn.test.ts:17-43 builds one with stub world / nav and fake guards: the pattern for hear / lightsOut / callAlert routing tests |
| ai/enemy.ts | no (rig, meshes) | e2e only |
Dead data: `ARCHETYPE.officer.searchMul` (archetypes.ts:47) is read nowhere.

## 4. Noise model API
- `EnemyManager.hear(pos: Vector3, radius: number)`: suspicion for calm guards; walls x`MUFFLE` 0.45 (config/noise.ts:7)
  only beyond 45 % of the radius; one head-height ray.
- `EnemyManager.noise(pos, radius)`: gunfire, straight to combat, no walls, sets LKP.
- `Enemy.hear(x, z, radius)` / `notice(x, z, level)` / `searchAt(x, z, revive)` / `radio(delay)` / `hearGunfire`.
- `noiseSuspicion(dist, radius)` = 0.12 + 0.58 k^2, k = 1 - d / r (perception.ts:215-219).
- Radii: config/noise.ts (landing 1.2 / 5 / 11, hold 4, manhole 10, pulse 0.5 s), gameState.ts:259-270 (`SHOT_NOISE` 28,
  `SUPPRESSED_NOISE` 0.6, `IMPACT_NOISE` 4), stealthSystems.ts:19-26, `world/surfaces.ts` `SURFACE_NOISE`.
- Ambient / noisy props: nothing in MapLayout, maps, props or audio. Masking needs a new data shape (Course Ready's map
  data): proposal `MapLayout.noisy?: { x, z, y?, r, mask }[]` (a generator, a vent, a machine: within r a listener's
  hearing radius x (1 - mask)), plus the same entries for the audio job to play a loop at (parity: what masks a guard
  should be audible). Until maps carry it, guard-ai can unit-test the term with no map change.

## 5. Co-op wire
- The client renders guards only from `EnemyState` {id, k, x, y, z, yaw, st 0-3, hp, al} (protocol.ts:81-104), packed
  at coopHost.ts:1035-1043 (`alertCode` 81-84: al bits 0-1 = calm(unaware + cooldown) / suspicious+investigating /
  searching / alert, +4 seized, +8 torch). Puppet: position / yaw interpolated, aim from `st` (enemyPuppet.ts:255-275),
  `level` from `al & 3` (`LEVELS` :20, :103) for takedown rules; torch from `AL_TORCH` (protocol 25). Bodies: id list in
  the snap (coopHost.ts:1047-1050). AI runs host-only.
- Barks are not on the wire at all: `onBark` -> host HUD only (gameState.ts:649-652); no `NetEvent` kind (protocol.ts:
  121-140). The client player sees no guard callouts today: a parity gap for G2 / G5 radio lines.
- Needs a bump (32) only for: a bark / radio-line event (new `netEvent` case, protocol.ts:297), or a new `al` bit (the
  parser clamps `al` to 0..15, protocol.ts:276). A `cautious` tier that maps onto the existing 2 bits (as 0 or 1), new
  investigators, posts, reinforcement tactics, camera dispatch and torches need no wire change. Decide the map of
  `cautious`: as 0 the client allows side takedowns (e2e-takedown 168), host check coopHost.ts:635 uses the real level.
- Versions: master 29, sector-redesign 29 (31 planned, slice L light sync), marlow-final 30. Asserted by
  tests/jammer.test.ts:395 and tests/jammerFixes.test.ts:205-206 (`toBe(29)`), coopTorches.test.ts (bits).
- `revive` mints a new enemy id: the client drops the body's puppet and builds a new one (works today).

## 6. Data shapes from Course Ready (origin/feature/sector-redesign 93496451)
ENGINE.md (`docs/sector-redesign/research/ENGINE.md`, 351 lines) has no "Requests for guard-ai" section yet, though
sectors.ts points to it; the shapes are in code and SPEC:
- `SectorGuard extends SquadSlot` (sectors.ts:73-92 on that branch), all optional, "not read by any code yet":
  `handler?: number` (a dog's handler, index in the section's `guards`), `squad?: number` ("radio checks, the 'missed'
  search, a dog's fallback handler"), `zone?: string` ("'secure', 'perimeter', 'lobby', ...: what the guard's post
  protects"), `role?: string` ("'gate', 'patrol', 'desk', 'handler', 'response', ..."), `reason?: string` ("design text,
  may become a bark"), `pair?: number` ("a talking-pair partner").
- `SectorDef.reinforce: [number, number][]`, `perStage: number` (sectors.ts:107-109 there); `SECTOR.maxAlive` 32,
  `alarmMax` 3; reinforcement kind `SECTOR_REINFORCE_KIND` (sectorMode.ts:462 there).
- SPEC "Engine work needed" GA1-GA6 (guard-ai provides): "Squads + radio checks, talking pairs, posted guards, light
  investigations / relight, staggered alerts, reinforcement tactics". SPEC: "Data tags per guard (our data, guard-ai
  reads them): `post | zone | squad | reason`". EW9 (theirs): lockdown, response-team route, dog release.
- `SquadSlot` (world/rooms.ts:21-44): kind, x, z, yaw, y, route, wait, waits, faces, start, loop, free, passive, info.
- MapLayout (world/mapDef.ts:61-80): `rooms`, `switches {pos, yaw, group}`, `alarms {pos, yaw, section?}`, `hideSpots`,
  `reinforce: Vector3[]`, `security` (cameras: `security/data.ts`).
- Ask them for (by message): a post area (rect, or centre + radius) beside `zone` for G7; `noisy` zones for G1 masking;
  `squad` set on every section guard; a reinforcement entry route if G6 wants one. `sectorMode.fill` (382-400 here) is
  theirs: `joinSquad` / `hold` / tags must be passed there, or guard-ai exposes `em.placeSlot(e, slot)` they call.

## 7. Biggest risks
1. Every e2e-stealth-ai reaction scenario (noise, shots, lights, bodies, radio, radio window, revive, alarm) asserts
   today's "everyone in range reacts" timing; G1 / G2 / G5 change them by design: retune in the same slice.
2. `playerRefs()` allocation in the per-step loop scales with guard count; 24 guards are unmeasured.
3. Sector Ops has one live section: M5's "own section" needs `SectorGuard.squad`, which no code reads yet and sectorMode
   is not ours.
4. Camera alarms send reinforcements in Sector (sectorMode.ts:414-436) while M4 names panel or radio only: ask Michael.
5. Course mode runs with `stealth` off: any active guard Menu Notes adds to Marlow Yard skips LKP, call-in delay and alarm
   rules.
6. Barks never reach the co-op client: G2 / G5 radio reports are host-only text unless protocol 32 carries them.
