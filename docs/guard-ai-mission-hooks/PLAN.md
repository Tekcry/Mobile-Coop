# guard-ai-mission-hooks: plan
Owner: Night Shift | Guard AI Build. Status: current (fix round 1 after PLAN-CHECK 76da6d00a; waits for a fresh checker).

Lead: Night Shift | Guard AI Build. Planner: Opus, master 2148ec969. Brief: `docs/guard-ai-mission-hooks/BRIEF.md`.
Sources: #372 BEAT / SIGNOFF pages (origin/feature/mission-framework `docs/missions/prototypes/`), the mission engine
(origin/feature/mission-engine `src/game/mission/sectorMission.ts`, `missionDef.ts`; `src/world/maps/
tallowWharfMissions.ts`, `tallowWharfSectors.ts`, `tallowWharfW3.ts`), conformance rows D6-D9
(`docs/conformance-guard-ai/parts/D-response.md`), J15 PLAN (origin/feature/guard-rules `docs/guard-rules/PLAN.md`).

## Claims
```claims
files:
  - src/core/flags.ts
  - src/ai/missionOrders.ts
  - src/ai/areaAlarms.ts
  - src/ai/hearing.ts
  - src/ai/guardAiData.ts
  - src/ai/enemy.ts
  - src/ai/enemyManager.ts
  - tests/missionOrders.test.ts
  - tests/missionOrdersManager.test.ts
  - tests/missionGroups.test.ts
  - tests/areaAlarms.test.ts
  - tests/areaAlarmsManager.test.ts
  - tests/noiseZones.test.ts
  - tests/hearing.test.ts
  - tests/guardAiData.test.ts
  - scripts/e2e-stealth-ai.mjs
  - docs/guard-ai-mission-hooks/**
maps: none
protocol: none
save: none
```

## Facts (pinned at the plan; every builder re-pins file:line on the head it starts from, see "Order with J15")
- `missionEvent {name, guardTag, postId, via?}` is on the engine branch only (`gameEvents.ts:13`), raised by
  `SectorMission.stepEvents` (`sectorMission.ts` ~:573) once per step done; after a restart `syncWalked` (~:588) marks
  every step still done as raised, so an order is never replayed although the world restarted whole (`restarted`
  ~:349). Data: Two-Key Ledger `tkl-3` `{telltale, 'w3-lodge-porter', 'w3-passage'}`; the porter is W3 slot 2, `zone:
  'w3-lodge-porter'`, posted at (117, 48) in room `w3-lodge` [114-120, 44-52] (`tallowWharfW3.ts:102`).
- Building blocks: `Enemy.sendTo` (`enemy.ts:1260`), `resetBreaker` (`:1407`), `sendable` (`:1251`), `Enemy.secure`
  (from `PostDef.highSecurity`), `zone` / `slotIdx` / `section`; `EnemyManager.circuitOut` (`enemyManager.ts:1195`,
  `report('breaker' | 'light', ..., CIRCUIT_KEY + group)`), `circuitBusy` (`:1238`: open incident on the key, or a
  guard with `breakerGroup === group`), `tierOf` (`:2728`), `noise` (`:2757`), `ctx.breakerOff` (`:676`: returns
  true, "off", when there is no breaker host), the constructor's `mapNoisy` (`:559-560`) and `setNoisy`; `BreakerHost.
  switchOf(group, x, z, out)` / `isOff(group)` (`src/ai/breaker.ts:14-16`).
- `NoisySource` (`hearing.ts:38-52`) has no switch link; no map defines `noisy` (D8).

## Order with J15 (guard-rules, same lead)
J15's PRs go first; this job re-pins every file:line fact on the head it starts from.
- S1a starts on the head after J15 PR4 merges (PR3 S4 bark causes, S6 posted pairs and PR4 S7 lookouts / S8 edit
  `enemy.ts`, `enemyManager.ts`, `flags.ts`, `e2e-stealth-ai`; S1a reads PR4's `post.lookout`). S1b follows S1a.
- S2, S3, S4 start after J15 PR4 merges (S7 lookouts: `guardAiData.ts validatePosts`, `placeSlot`; S8 `enemy.ts`).
- S3 builds on J15 S5 (repeat alarms: the lock at `raiseAlarm` / `contactThrough` / `assignAlarm` / the caller /
  `radioAlarm`, `ALARM_REPEAT` max 3, `rearm` 60 s). Decision: with areas set, the lock and the count are per area
  (one lock, one count per area; a panel alarm uses the site lock), because the beats escalate each area on its own
  and site stage 2 needs both areas: a shared lock would let Ghost's alarm block Shadow's. No areas = J15's one lock.
- S3 builds on J15 S1's helmet rule (`DifficultyDef.helmets: 'stage' | 'always' | 'locked'`): area gear changes only
  the `stage` tier (Rookie / Normal); `always` / `locked` are untouched.
- S1a treats J15 S7 lookouts (copied to high-security posts at `placeSlot`) as secure; `checkMissionOrders` also fails
  a tag on a `post.lookout` slot. An ordered guard in a J15 S6 pair: his partner reacts as to a partner gone
  (S6 `missing`), no order of his own.
- `flags.ts` also overlaps coop-kit, map-ready, player-batch-j19: additive lines, no blocker.

## Design
### 1. Mission orders (D7)
`src/ai/missionOrders.ts` (new, pure, no Babylon, no `src/game` import):
- Types: `OrderKind = 'reset' | 'walk'`; `MissionPost {id, x, z, y?, yaw?, circuits?: number[], bell?: {x, y, z,
  reach}}`; `OrderEvent` (the engine's event shape, structural); `OrderPhase = 'none' | 'offered' | 'gathering' |
  'walking' | 'arrived' | 'done' | 'dropped'`.
- `ORDER` (G4 prototype values): `lookT` 8 s, `joinWait` 20 s, `followGap` 1.5 m, `atVia` 2.5 m, `giveUp` 120 s,
  `bellTier` 1, `maxOrders` 8, `maxMembers` 4.
- `matchesTag(tag, zone, sectionId, k)`: zone equal, or `${sectionId}:${k}` equal (A1).
- `resolvePoint(id, posts, rooms, out)`: mission post, else room centre on its storey (A2); false when unresolved.
- `OrderBoard`: `maxOrders` preallocated slots; each holds name, kind, resolved points, circuits, group, phase and a
  fixed member list (`Int32Array(maxMembers)` of enemy ids plus a count; no bitmask, so ids > 31 are fine). `clear()`.
- `OrderLeg` stepper (one per Enemy, reused): `toVia -> waitVia -> toPost -> look | reset -> done`; `step(...)` writes
  the target, pace class and facing into a reused goal object; a follower targets `followGap` behind the leader.
- `checkMissionOrders(events, sections, posts, rooms, noisy, hearAt)`: each tag matches a guard of a section the
  mission runs; `postId` / `via` resolve; no high-security or lookout slot is tagged (A7); `circuits` are integers
  >= 0; a `bell` is heard by each tagged guard at his post through one wall plus masking (`hearAt` is the pure tier
  from `hearing.ts`, `WALL_FACTOR`). Returns readable error strings (Campaign Build expects `[]`, C4).

The offer rule (A6), one table for every kind:
| Kind | Offered when | To whom | Eligible | Ends (done) | Dropped |
| --- | --- | --- | --- | --- | --- |
| walk | once, at the event | tagged guards of the live section; a not-yet-placed tagged slot once at its `placeSlot` (same load) | alive, not KO / held / passive / alerted / busy / secure; a `bell` post: also hears the bell (tier >= `bellTier`) | look-round over, back to route | ineligible at the offer; an investigation, search or alert on the way; `giveUp`; unresolved post; `clear()` |
| reset | as walk | as walk | as walk, except a breaker walk or breaker incident on one of the order's circuits is not "busy": the order takes it over (below) | every listed circuit back on (by him, or by other means) | as walk |
| group (same name + via) | as its members' kind | each member as above | as above, per member | the leader's end ends the group | per member, as above; the group drops when no member is left |
A woken guard (`inherit` / revive) is never offered an order. "Busy" = an incident, breaker walk, lure, search or
another order in hand. Every drop is recorded per order (`orderPhase`), with a dev log line naming the cause.

Breaker composition (Split Shift; unit test per case):
- Cut first: #7 notices 55 / 56 go dark (`circuitOut` -> `report('breaker')`) and is on the breaker walk or holds its
  incident when the order comes. The reset order on circuits [55, 56] takes it over: his breaker walk ends without a
  reset, the order holds the circuits' incidents, and any other guard's breaker walk on those circuits ends (one goes:
  the facilities officer). No second guard is sent and the tamper clock does not run.
- Order first: #7 is on the order when the cut is noticed. `circuitBusy(group)` counts order holders, and
  `circuitOut` reports nothing for a circuit an order holds (no incident, no tamper clock, no second guard).
- At the board: the switch point comes from `BreakerHost.switchOf(circuit, x, z, out)`; he works it `BREAKER.resetT`
  and every listed circuit still off comes back on (`ctx.breakerReset` per circuit). A replay after a world restart
  finds them on and ends at once (phase `done`).

`EnemyManager` (host / solo):
- `setMissionMap(sectionIds, posts)` (Campaign Build at the bind, C1).
- `missionOrder(tag, kind, postId, via?, name = '')`: flag off = no-op. Resolve (fail: dropped, dev warn once). Fill a
  slot; with a `bell`, emit the bell as a device sound at its point: the tagged guards are judged through `tierOf`; the
  others in reach turn to look (no incident, no report). Offer once to each eligible tagged guard (the table).
- `onMissionEvent(ev)` = `missionOrder(ev.guardTag, post.circuits ? 'reset' : 'walk', ev.postId, ev.via, ev.name)`.
- `orderPhase(name): OrderPhase` (supported read for the mission's lamps and lines, C7) and `orderMembers(name)` (how
  many guards are on it now). Debug: `orderOf(e)`.
- `clear()` (section load / restart) clears the `OrderBoard` (A8).

`Enemy`: `takeOrder(slot)` (the gate above); `orderStep(dt)` beside the breaker walk in the unaware / suspicious
branch: follows `OrderLeg` with `goTo` at patrol pace, perception live; a glimpse pauses it, anything more drops it
(A5); bark: the existing `checking` line (J15 S4's bark-by-cause once on master); done / dropped: `walker.rejoin`.

Restart (A8): orders go at `clear()`; Campaign Build re-raises still-done steps' events after a restart (C3).

### 2. Per-area alarm stages (D6, flag `areaAlarms`; on master with A9, switch-on by Q1 on the walk card)
`src/ai/areaAlarms.ts` (new, pure): `AreaBox {boxes: [minX, minZ, maxX, maxZ][], y?: [lo, hi]}` (the engine's track
shape); `areaOf(areas, x, z, y)` -> 0..1 or -1; `AreaStages` (site + 2 areas, `stageFor(area)` = max(site, area)); the
per-area lock and count on J15 S5's rule.
`EnemyManager`: `setAreas(areas | null)` (C5; null or flag off = today); `Enemy.area` at `placeSlot` from his spawn
point, a reinforcement from its entry (A10); `setAreaStage(area, stage)`: area gear (`stage` helmet tier only) to that
area's living guards and later placements; calm carry and helmets read `stageFor(e.area)` through ctx `areaStage(e)`; a
panel alarm stays site-wide; a radio command call (`contactThrough`) locks and counts only the caller's area; the
caller pick and the alarm hunt prefer the caller's area; `alarmArea` (the raiser's area, -1 site) is readable before
`onAlarm` fires.
Campaign Build's side (C5) and Sector Ops' data (area stage actions) are in "Coordination".

### 3. Noise zones (D8, flag `noiseZones`)
- `hearing.ts`: `NoisySource.group?: number`, `on?: 'on' | 'off'` (A11); `ambientDb(src, x, z, y, live?)` skips a
  source whose `live[i]` is 0 (absent = all live). `guardAiData.ts validateNoisy`: radius 1-40 m, db 0-24, integer
  group.
- `EnemyManager`: with `noiseZones` off, both the constructor's `mapNoisy` and `setNoisy` store [] (map data is
  ignored); on, one live mask sized at `setNoisy`, refreshed once per AI tick from `this.breakers.isOff(group)` in its
  own branch: no breaker host = live (not `ctx.breakerOff`, which reads "off" then); a console group is read the same way as `breakerOff` reads it (Re-check polish). `ambientAt(x, y, z)` = the same
  sum the guards use, for the HUD (D9); it refreshes the mask itself when the AI tick has not run since the last
  switch change (a co-op client does not tick the AI).
- Data owners (not this job): Sector Ops `SectorDef.noisy` (S2 east plant switchgear on 55 / 56, S4 data hall CRACs
  and generator compound, S5 boiler room); Marlow Yard `ctcourse` `guardAi.noisy` (substation, pump house); Campaign
  Build `tallowWharf` (cranes, the W4 weir). The orchestrator renames the bible's `noiseZones` (A12).

## Slices
Order (all after J15 PR4 merges): S1a -> S1b; S2 ( file-disjoint from S1a / S1b, may run beside S1b) -> S3 -> S4.

**S1a Single-guard orders (Opus).** Section 1 without groups; the three flags (`missionOrders`, `areaAlarms`,
`noiseZones`; URL `?missionorders=1` / `?areaalarms=1` / `?noisezones=1`; all off) so no later slice edits `flags.ts`.
- Files: `src/core/flags.ts` (~20), `src/ai/missionOrders.ts` (new ~280), `src/ai/enemy.ts` (~150),
  `src/ai/enemyManager.ts` (~190: offer, bell, breaker take-over, phase), `tests/missionOrders.test.ts` (new ~260),
  `tests/missionOrdersManager.test.ts` (new ~160, the stub harness of `enemyManagerDespawn.test.ts`),
  `scripts/e2e-stealth-ai.mjs` (scenario `missionOrder` ~160). Est. 1,220 lines.
- Unit: tag match; post / room / unresolved; the offer table row by row (ineligible states dropped, never picked up
  later, a late-placed slot once, a woken guard never); bell heard / not heard / through a wall plus masking;
  breaker cut-first and order-first; reset relights both circuits; `orderPhase` sequence; restart clear; flag off =
  no-op; `checkMissionOrders` errors (lookout, secure, unheard bell); no allocation (slot and goal identity reused).
- e2e (`e2e-stealth-ai`, warehouse, `?missionorders=1`): a bell order: the guard in the bell's room comes and looks
  round, a guard outside its reach does not, a knocked-out one does not; a reset order on a cut circuit with the
  breaker walk already running takes it over and relights it; phases read `walking` -> `arrived` -> `done`.
- Done looks like: the porter-style and supervisor-style walks in the e2e; nothing changes with the flag off.

**S1b Groups (Opus).** A6 groups: via wait, join timeout, follow, members dropping out.
- Files: `src/ai/missionOrders.ts` (~120), `src/ai/enemy.ts` (~60), `src/ai/enemyManager.ts` (~60),
  `tests/missionGroups.test.ts` (new ~220), `scripts/e2e-stealth-ai.mjs` (scenario `missionGroup` ~130). Est. 590.
- Unit: a member at via waits; the group leaves when all are in or after `joinWait`; follower gap; a member busy at the
  event never joins; a member sent to a breaker fault on the way leaves; phase `gathering` -> `walking`.
- e2e: two warehouse guards, one at the via: they walk the last leg together; with the second guard busy at the
  event, the first goes alone after the wait.
- Done looks like: the Split Shift pair behaviour on the warehouse; flag off = nothing.

**S2 Noise data shape (Opus).** Section 3's pure half.
- Files: `src/ai/hearing.ts` (~50), `src/ai/guardAiData.ts` (~40), `tests/hearing.test.ts` (~120),
  `tests/guardAiData.test.ts` (~60). Est. 270 lines.
- Unit: a source off by its circuit masks nothing; `on: 'off'` inverts; no mask = today's numbers; the validator
  rejects a 0 radius, db over 24, a fractional group. Done looks like: tests green, numbers unchanged without a mask.

**S3 Per-area alarm stages (Opus).** Section 2, on J15 S5 and S1.
- Files: `src/ai/areaAlarms.ts` (new ~170), `src/ai/enemyManager.ts` (~220), `src/ai/enemy.ts` (~40),
  `tests/areaAlarms.test.ts` (new ~220), `tests/areaAlarmsManager.test.ts` (new ~140), `scripts/e2e-stealth-ai.mjs`
  (scenario `areaAlarm` ~120). Est. 910 lines.
- Unit: `areaOf` boxes and height band; `stageFor`; per-area lock and count (a radio alarm in area 0 leaves area 1
  free; max 3 per area; rearm); a panel stays site-wide; gear only to the area, `stage` tier only; no areas = J15's
  rule (`alarmRepeat.test.ts`, `alarmCall.test.ts`, `radioWiring.test.ts` untouched and green).
- e2e: two test boxes on the warehouse: a contact call in box 0 raises box 0 only, then box 1 its own; flag off: one.
- Done looks like: as above, plus `e2e-sectorops:1` green with the flag off.

**S4 Noise wiring and the meter read (Opus, or Sonnet from S2's brief).** Section 3's manager half.
- Files: `src/ai/enemyManager.ts` (~80), `tests/noiseZones.test.ts` (new ~120), `scripts/e2e-stealth-ai.mjs` (scenario
  `noiseZone` ~100). Est. 300 lines.
- Unit: flag off = constructor and `setNoisy` data ignored; no breaker host = live; the mask follows a toggle on the
  next tick; `ambientAt` equals the listener sum and refreshes without an AI tick.
- e2e (`?noisezones=1`, a test source on a warehouse circuit): a footstep inside it is not heard at a range heard
  outside; circuit off: heard again. Done looks like: masking switchable by power, readable by the HUD.

Totals ~3,290 lines in 5 PRs, each under 1.5k. Two independent Opus checkers per AI PR; e2e on the laptop queue
(`E2E_GPU=1`); the `src/ai` affected row also runs `e2e-guard-carry` and `e2e-sectorops:1` on each head.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `missionOrders` (`?missionorders=1`) | off | Night Shift \| Guard AI Build | Michael's prototype walk (date: orchestrator) | S1a + S1b passed, C1-C3 and C7 on master, the three twists accepted on the walk |
| `areaAlarms` (`?areaalarms=1`) | off | Night Shift \| Guard AI Build | Michael's click on Q1 at the prototype walk (walk card) | S3 passed, C5 on master, Q1 "Yes", the alarm items accepted |
| `noiseZones` (`?noisezones=1`) | off | Night Shift \| Guard AI Build | the walk after map data lands | S2 + S4 passed, a map's sources in, the masking item accepted |

## Coordination items (exact calls; not this job's files)
Campaign Build (mission engine, `src/game/mission/**`, mission data):
- C1 In `bindSectorMission`, host / solo only (where the manager simulates guards; never on a co-op client), beside
  `m.listen`: `g.enemyMgr?.setMissionMap(run.defs.map((d) => d.id), def.posts ?? [])` and `const off =
  g.events.on('missionEvent', (ev) => g.enemyMgr?.onMissionEvent(ev))`, unsubscribed with the mission.
- C2 `MissionDef.posts?: MissionPost[]` (type from `src/ai/missionOrders.ts`) and these posts and events (floor y 0
  unless named; k = guard number - 1, `campusSectors.ts:81`):
  - Two-Key Ledger (as built: `tkl-3`, tag `w3-lodge-porter` = W3 slot 2): post `w3-passage` {x 101, z 53.75, y 0
    (room `w3-passage` centre), bell {x 118.5, y 1.5, z 50, reach 20}} (the bell on the lodge's inner wall, 2.5 m
    from the porter's post (117, 48); in reach also the yard watchman and his dog near (112, 46): they only turn to look (`hearTurn`), the dog
    included; no bystander runs its own hearing rule (a dog would charge), no incident).
  - Split Shift step 3 (`sync-s2-power`): two events `{name 'ss-power', guardTag 's2:6'}` (#7, facilities) and
    `{name 'ss-power', guardTag 's2:0'}` (#1, reception), both `postId 's2-plant-board', via 's2-reception'`; posts
    `s2-plant-board` {x -2, z -17, y 0 (room `plant` centre), circuits [55, 56]} (the walk ends at the board's switch
    from `switchOf`; Sector Ops builds the board in room `plant`) and `s2-reception` {x -18.5, z -24, y 0} (room
    `foyer`, in front of #1's desk at (-20, -24.9): #1 counts as at via).
  - Code Relay step 3A (`sync-s4-noc`): `{name 'cr-release', guardTag 's4:19' (#20, mobile supervisor), postId
    's4-cage-front', via 's4-west-aisle'}`; posts `s4-cage-front` {x 19.5, z 33, y 0, yaw PI} (room `s4-hall`, beside
    the keyholder's gate post (18, 33)) and `s4-west-aisle` {x -2.5, z 33, y 0} (on #20's own route, room `s4-hall`):
    up the west aisle, then east to the cage front.
- C3 Restart replay: in `SectorMission.restarted()`, replace `this.syncWalked()` with a version that leaves
  `walked[i] = 0` for steps done that carry `events`, so the next tick's `stepEvents` raises them again; a tagged
  slot still pending then gets the order once at its `placeSlot` (A6).
- C4 Mission tests call `checkMissionOrders(events, sector defs, def.posts, rooms, noisy, hearAt)` and expect `[]`.
- C5 Areas: at bind `g.enemyMgr?.setAreas(<the def's track boxes and y bands>)`; `guardAlarm()` reads `em.alarmArea`
  (-1: both) instead of TEAM_BOTH; each area rise calls `em.setAreaStage(area, stage)`; site stage 2 when both areas
  are at 1 (`run.raiseAlarm()`); area stage actions (`StageAction.area`) in `sectorMode`. Sector Ops: `area` on the S2 /
  S4 stage actions (groups 50-52, 70-72; reinforcement points (-36, -7), (-40, -16.5), (28, 20.5)).
- C6 The mission e2e part (`scripts/e2e-sectorops-mission.mjs`, or the Tallow mission e2e) asserts, with
  `?missionorders=1` and real wall rays: the porter takes the bell order (`orderPhase('telltale')` reaches `walking`),
  and the c1 / c2 walks of `campusMissionTest`.
- C7 The mission's world leads follow the guard, not the event: the lodge lamp and SEXTON's "Porter's coming" on
  `orderPhase('telltale') === 'walking'` (a KO'd porter: `dropped`, no lamp, no line); "Two of them coming" when
  `orderPhase('ss-power') === 'walking'` with `orderMembers('ss-power') === 2`; "Supervisor's off the west aisle" on
  `orderPhase('cr-release') === 'walking'`. Polled at the mission tick (no allocation).
Sector Ops: the S2 board in room `plant` (C2), `area` on stage actions (C5), `SectorDef.noisy` (D8). Marlow Yard:
`ctcourse` `guardAi.noisy`. HUD owner (D9): the meter marker reads `g.enemyMgr.ambientAt(x, y, z)` at the player.
Orchestrator: bible 5.2 S2 field name (A12); Q1 on the prototype walk card.

## Hard rules check
- No allocation in hot paths: `OrderBoard` (fixed slots, `Int32Array` member lists) and `AreaStages` are sized at
  construction; each Enemy reuses one `OrderLeg` and goal object; tag matching and bell judging run at order and
  placement time only; the noise mask is a Uint8Array refreshed once per tick; `hyp2` for every distance.
- Fixed and explainable (VISION 8, G143): no randomness; one offer rule; every walk has a heard or named cause; every
  drop is recorded with its cause; detections on the way are the normal perception path.
- Gameplay never reads graphics: posts, rooms, the nav grid, the switch state (`BreakerHost`), the noise model.
- Co-op: host-only simulation, no wire or save change. Dark: all three flags off by default.

## Walk items
- Two-Key Ledger W3 (`?missionorders=1`): turn both keys; the bell rings in the lodge, the porter lights his lamp,
  walks to the passage, looks round, goes back - accept when he comes each time the keys turn, never when knocked out
  or moved out of the bell's reach first.
- Split Shift S2: cut the east boards; #7 stops at reception, both walk to the plant room, #7 resets both boards -
  accept when pulling the atrium board before the cut leaves #7 to go alone after the wait.
- Code Relay S4: the release; #20 walks up the west aisle and east to the cage front - accept when a Vault restart (3A
  still done) replays the walk, and a Relay restart (3A taken back) does not.
- Q1 (areas) and the noise item after the map data.

## Risks and open questions
- Claims overlap (`claims-check` 2026-10-25): feature/guard-rules (J15) on `enemy.ts`, `enemyManager.ts`,
  `guardAiData.ts`, `flags.ts`, `e2e-stealth-ai.mjs`: settled by "Order with J15". New code sits in blocks tagged
  `(guard-ai-mission-hooks Sn)`. Also char-shadow-meter (J16) on `e2e-stealth-ai.mjs` and `flags.ts`, and coop-kit,
  map-ready, player-batch-j19, sector-batch on `flags.ts`: additive scenarios / lines; the orchestrator orders them.
- `missionEvent` is not on master until the engine merges; S1a / S1b do not depend on it (structural `OrderEvent`).
- A walk over `giveUp` (120 s) ends early on a long path; S1a's e2e logs walk times, C4 can warn.
- The S2 plant board is not built yet (Sector Ops); until it is, the Split Shift reset is tested on the warehouse.
