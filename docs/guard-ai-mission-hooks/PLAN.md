# guard-ai-mission-hooks: plan
Owner: Night Shift | Guard AI Build. Status: current (plan stage, waits for the plan checker).

Lead: Night Shift | Guard AI Build. Planner: Opus, master 2148ec969. Brief: `docs/guard-ai-mission-hooks/BRIEF.md`.
Sources: #372 BEAT / SIGNOFF pages (origin/feature/mission-framework `docs/missions/prototypes/`), the mission engine
(origin/feature/mission-engine `src/game/mission/sectorMission.ts`, `missionDef.ts`, `tallowWharfMissions.ts`),
conformance rows D6-D9 (`docs/conformance-guard-ai/parts/D-response.md`).

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
  - tests/areaAlarms.test.ts
  - tests/hearing.test.ts
  - tests/guardAiData.test.ts
  - tests/missionOrdersManager.test.ts
  - scripts/e2e-stealth-ai.mjs
  - docs/guard-ai-mission-hooks/**
maps: none
protocol: none
save: none
```

## Facts the plan stands on (code at master 2148ec969, engine at origin/feature/mission-engine 00b6cde9c)
- `missionEvent {name, guardTag, postId, via?}` exists only on the engine branch (`gameEvents.ts:13`), raised by
  `SectorMission.stepEvents` (`sectorMission.ts:566-578`) once per step done. After a restart `syncWalked`
  (`:581`) marks every step still done as raised, so today an order is never replayed, while the world (guards
  included) restarted whole (`restarted`, `:342-370`). Data already uses it: Two-Key Ledger `tkl-3`
  `{telltale, 'w3-lodge-porter', 'w3-passage'}` (`tallowWharfMissions.ts:165`; the porter is W3 slot `zone:
  'w3-lodge-porter'`, `tallowWharfSectors.ts:150`), Three Grey Coats `mindersArrive`, `campusMissionTest.ts` c1 / c2.
- Building blocks: `Enemy.sendTo` (`enemy.ts:1260`), `Enemy.resetBreaker` (`:1407`, calm walk, `BREAKER_WALK.giveUp`,
  ends when the circuit is on), `sendable` (`:1251`), `postDef.secure`, `zone` / `slotIdx` / `section` (`:1640-1660`);
  `EnemyManager.setAlarmStage` (`enemyManager.ts:1022`), `alarmRaised` (`:249`, once per section load), `raiseAlarm`
  (`:808`), `contactThrough` (`:830`), caller pick (`:2514`), `setNoisy` / `mapNoisy` (`:557`), `tierOf` reads
  `ambientDb` per listener (`:2728`), `breakerOff` ctx (`:676`), `clear()` on a section load or restart.
- `NoisySource` (`hearing.ts:38-52`) has no switch link; no map defines `noisy` (D8).

## Design
### 1. Mission orders (D7)
`src/ai/missionOrders.ts` (new, pure, no Babylon):
- Types: `OrderKind = 'reset' | 'walk'`; `MissionPost {id, x, z, y?, yaw?, circuit?}`; `OrderEvent` (the engine's
  event shape, structural: no import from `src/game`).
- `ORDER` numbers (G4 prototype values): `lookT` 8 s, `joinWait` 20 s, `followGap` 1.5 m, `atVia` 2.5 m,
  `giveUp` 120 s, `maxOrders` 8.
- `matchesTag(tag, zone, sectionId, k)`: zone equal, or `${sectionId}:${k}` equal (A1).
- `resolvePoint(id, posts, rooms, out)`: mission post, else room centre on its storey (A2); returns false unresolved.
- `OrderBoard`: a fixed table of `maxOrders` slots (preallocated; no allocation after construction). `add(name,
  kind, tag, post, via)` fills a slot; events with the same `name` and `via` share a group id (A6). Slots hold the
  resolved points, the group, its leader and a `members` bitmask over guard ids seen. `clear()` empties it.
- `OrderLeg` stepper (pure, one per Enemy, reused): phases `toVia -> waitVia -> toPost -> look | reset -> done`;
  `step(px, pz, dt, leaderX, leaderZ, leaderPhase)` returns the target point, the pace class and the facing into a
  reused goal object. A follower targets `followGap` behind the leader; a leader at `via` waits for the members or
  `joinWait`.
- `checkMissionOrders(events, sections, posts, rooms)`: for Campaign Build's mission tests: each `guardTag` matches at
  least one guard of a section the mission runs; `postId` / `via` resolve; no secure-post guard is tagged (A7); a
  `reset` post's circuit is >= 0. Returns readable error strings.

`EnemyManager` (host / solo; the guard simulation):
- `setMissionMap(sectionIds, posts)`: once at the mission bind (Campaign Build calls it).
- `missionOrder(tag, kind, postId, via?, name = '')`: flag `missionOrders` off -> no-op. Resolve the points (fail:
  dev warn once, return false). Add to the `OrderBoard`, then offer it to every living guard of the live section that
  matches. `onMissionEvent(ev)` = `missionOrder(ev.guardTag, post.circuit !== undefined ? 'reset' : 'walk', ...)`.
- Standing orders: a matching guard placed later (`placeSlot`: pending spawns after a restart) or freed later (on a
  board task when it came) is offered the order in the existing low-rate manager pass (no per-frame scan of tags:
  the matching guard ids are cached in the slot at `add` and at `placeSlot`).
- `clear()` (section load / restart) also clears the `OrderBoard` (A8).
- Debug / e2e getters: `orderOf(e)` (slot, phase), `orders.count`.

`Enemy`:
- `takeOrder(slot, leg)`: refused unless `sendable`, level unaware / cooldown / suspicious, not `secure` (A4, A7).
  Board task in hand: stays offered until free. Bark: existing `checking` line (no new text).
- In the unaware / suspicious branch beside the breaker walk (`enemy.ts:2672-2719`): `orderStep(dt)` follows
  `OrderLeg` with `goTo`, patrol pace, perception live; a glimpse pauses it, anything more drops it (A5).
- `reset` at the post: hand over to `resetBreaker(post.x, post.z, post.y, -1, circuit)` (existing walk end, switch
  time, circuit-on check: a replay after a world restart finds the board on and ends at once).
- `done` / dropped: `walker.rejoin` (back to his route or post), group leader released to the next member.

Restart (A8): Guard AI forgets orders at `clear()`; Campaign Build makes `restarted()` mark done steps that carry
events as not raised, so the next tick raises them again (C3). The replayed walk starts from his spawn.

### 2. Per-area alarm stages (D6, behind `areaAlarms`; A9 waits on Q1 for switch-on)
`src/ai/areaAlarms.ts` (new, pure): `AreaBox {boxes: [minX, minZ, maxX, maxZ][], y?: [lo, hi]}` (the engine's track
shape); `areaOf(areas, x, z, y)` -> 0..1 or -1; `AreaStages` (Int8Array site + 2 areas; `stageFor(area)` = max(site,
area)); `AREA` numbers.
`EnemyManager`:
- `setAreas(areas | null)` (Campaign Build at bind; null or flag off = today). `Enemy.area` set at `placeSlot` from his
  spawn point; a reinforcement from its entry point (A10).
- `setAreaStage(area, stage)`: area gear (`stageGear`) to that area's living guards and later placements; `alarmStage`
  reads for calm carry (`carryCalm`) and helmets (G350) become `stageFor(e.area)` through a new ctx `areaStage(e)`.
- Alarm per area: a panel alarm stays site-wide (today's `alarmRaised`). A radio command call (`contactThrough`, `p`
  null) sets `areaRaised[area]` only, so the other area's guards can still raise theirs; the caller pick and the alarm
  hunt prefer guards of the caller's area. `alarmArea` (the raiser's area, -1 site) is readable by the mode before
  `onAlarm` fires.
- Campaign Build's side (C5): stages per area stay in `SectorMission.stages`; it reads `em.alarmArea` in
  `guardAlarm()` (today TEAM_BOTH), calls `em.setAreaStage`, raises the site stage when both areas reach 1, and runs
  the area's stage actions (lights, the area reinforcement) in `sectorMode`. Sector Ops adds `area` to the S2 / S4
  stage actions (groups 50-52, 70-72; reinforcement points (-36, -7), (-40, -16.5), (28, 20.5)).

### 3. Noise zones (D8, behind `noiseZones`)
- Data shape (`hearing.ts`): `NoisySource` gains `group?: number` (a power / light circuit) and `on?: 'on' | 'off'`
  (live while the circuit is on, default; `'off'`: live while it is off) (A11). `ambientDb(src, x, z, y, live?)` skips
  a source whose `live[i]` is 0 (a Uint8Array the manager owns; absent = all live). `validateNoisy` in
  `guardAiData.ts`: radius 1-40 m, db 0-24, group integer.
- `EnemyManager`: `setNoisy` stores the list only with `noiseZones` on (else []); one live mask sized at `setNoisy`,
  refreshed once per AI tick from `ctx.breakerOff(group)` (no breakers system: live). `ambientAt(x, y, z)` = the same
  sum the guards use, for the HUD meter (D9).
- Data owners (not this job): Sector Ops `SectorDef.noisy` (S2 east plant switchgear on groups 55 / 56, S4 data hall
  CRACs and generator compound, S5 boiler room); Marlow Yard `guardAi.noisy` on `ctcourse` (substation, pump house);
  Campaign Build on `tallowWharf` (cranes, the W4 weir). The orchestrator renames the bible's `noiseZones` (A12).

## Slices
Parallel group 1: S1 and S2 (file-disjoint). Then S3, then S4 (both edit `enemy.ts` / `enemyManager.ts`).

**S1 Mission orders (Opus).** Section 1 whole, plus the three flags (`missionOrders`, `areaAlarms`, `noiseZones`,
URL `?missionorders=1` / `?areaalarms=1` / `?noisezones=1`, all default off) so no later slice edits `flags.ts`.
- Files: `src/core/flags.ts` (~20), `src/ai/missionOrders.ts` (new ~260), `src/ai/enemy.ts` (~170),
  `src/ai/enemyManager.ts` (~130), `tests/missionOrders.test.ts` (new ~300), `tests/missionOrdersManager.test.ts` (new
  ~120, the stub-manager harness of `enemyManagerDespawn.test.ts`), `scripts/e2e-stealth-ai.mjs` (scenario
  `missionOrder` ~140). Est. 1,140 lines.
- Unit: tag match (zone, `<id>:<k>`, none); post / room / unresolved resolution; group by name + via; leg phases (via
  wait, join timeout, follower gap, look, reset hand-off); restart clear; secure and KO refusal; standing order taken
  by a guard placed later; flag off = no-op; `checkMissionOrders` errors; no allocation (the board and legs reuse
  their objects: a test counts `OrderBoard` slots and leg goal identity across steps).
- e2e (`e2e-stealth-ai`, warehouse): `?missionorders=1`; order a calm grunt to a room via a second room: he walks via,
  looks round, rejoins his route; a two-guard group leaves via together; a `reset` on a switched-off circuit relights
  it; a knocked-out guard ignores the order; `em.clear()` drops it.
- Done looks like: the porter-style walk visible in the e2e, tsc and the unit files green, nothing changes with the
  flag off (stealth-ai's other scenarios unchanged).

**S2 Noise data shape (Opus).** Section 3's pure half: `group` / `on` on `NoisySource`, the live mask in
`ambientDb`, `validateNoisy`.
- Files: `src/ai/hearing.ts` (~50), `src/ai/guardAiData.ts` (~40), `tests/hearing.test.ts` (~120),
  `tests/guardAiData.test.ts` (~60). Est. 270 lines.
- Unit: a source off by its circuit masks nothing; `on: 'off'` inverts; no mask = today's numbers (existing tests
  untouched); validator rejects a 0 radius, db over 24, a fractional group.
- Done looks like: tests green, hearing numbers byte-identical without a mask. Flag: none needed (no caller yet).

**S3 Per-area alarm stages (Opus).** Section 2.
- Files: `src/ai/areaAlarms.ts` (new ~150), `src/ai/enemyManager.ts` (~200), `src/ai/enemy.ts` (~40),
  `tests/areaAlarms.test.ts` (new ~260), `tests/missionOrdersManager.test.ts` (area cases ~80),
  `scripts/e2e-stealth-ai.mjs` (scenario `areaAlarm` ~120). Est. 850 lines.
- Unit: `areaOf` boxes and height band; `stageFor`; a radio alarm in area 0 leaves area 1 able to raise; a panel stays
  site-wide; gear only to the area's guards; flag off or no areas = today (`alarmCall.test.ts`, `radioWiring.test.ts`,
  `sectorStageActions.test.ts` untouched and green).
- e2e (`e2e-stealth-ai`): two test boxes on the warehouse; a contact call in box 0 raises box 0 only; a second call in
  box 1 raises box 1; flag off: one shared alarm as today.
- Done looks like: as above, plus `e2e-sectorops:1` green (the `src/ai` affected row) with the flag off.

**S4 Noise wiring and the meter read (Opus or Sonnet from S2's brief).** Section 3's manager half.
- Files: `src/ai/enemyManager.ts` (~70), `tests/missionOrdersManager.test.ts` (noise cases ~60, file renamed in the
  brief if the lead prefers `tests/noiseZones.test.ts`), `scripts/e2e-stealth-ai.mjs` (scenario `noiseZone` ~100).
  Est. 230 lines.
- Unit: flag off = sources ignored; the mask follows a breaker toggle on the next tick; `ambientAt` equals the
  listener sum.
- e2e (`e2e-stealth-ai`): `?noisezones=1` and a test source on a warehouse circuit: a footstep inside it is not heard
  at a range it is heard outside; the circuit off: heard again.
- Done looks like: masking switchable by power, readable by the HUD; with the flag off nothing changes.

Totals: ~2,490 lines in 4 PRs, each under 1.5k. Builders: Opus for S1-S3 (AI code), S4 Opus or Sonnet. Two
independent Opus checkers per AI PR (RULES "A job"); every e2e on the laptop queue, `E2E_GPU=1`; the `src/ai` affected
row also runs `e2e-guard-carry` and `e2e-sectorops:1` on each PR head.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `missionOrders` (`?missionorders=1`) | off | Night Shift \| Guard AI Build | Michael's prototype walk (date: orchestrator) | S1 passed, C1-C3 on master, the three twists accepted on the walk |
| `areaAlarms` (`?areaalarms=1`) | off | Night Shift \| Guard AI Build | Michael's prototype walk, after Q1 | S3 passed, C5 on master, Q1 "Yes", Split Shift / Code Relay alarm items accepted |
| `noiseZones` (`?noisezones=1`) | off | Night Shift \| Guard AI Build | the walk after map data lands | S2 + S4 passed, a map's sources in, the masking item accepted |

## Coordination items (exact calls; not this job's files)
Campaign Build (mission engine, `src/game/mission/**`, mission data):
- C1 In `bindSectorMission` (`sectorMission.ts`, beside `m.listen`): `g.enemyMgr?.setMissionMap(run.defs.map((d) =>
  d.id), def.posts ?? [])` and `const off = g.events.on('missionEvent', (ev) => g.enemyMgr?.onMissionEvent(ev))`,
  unsubscribed with the mission.
- C2 `MissionDef.posts?: MissionPost[]` (type from `src/ai/missionOrders.ts`) and the events: Split Shift step 3
  (`sync-s2-power`) two events `{name: 'ss-power', guardTag: 's2:<k of #7>' and 's2:<k of #1>', postId:
  's2-plant-board', via: 's2-foyer'}` with post `s2-plant-board {x, y, z, circuit: 55}` (coordinates from Sector Ops'
  board); Code Relay step 3A (`sync-s4-noc`) `{name: 'cr-release', guardTag: 's4:<k of #20>', postId: 's4-cage-front',
  via: 's4-hall-w'}` with post `s4-cage-front` at the cage front gate (18, 33). Two-Key Ledger as built (`w3-passage`
  resolves to its room).
- C3 Restart replay: in `SectorMission.restarted()`, replace `this.syncWalked()` with a version that leaves
  `walked[i] = 0` for steps done that carry `events` (the next tick's `stepEvents` raises them again).
- C4 Its mission tests call `checkMissionOrders(def.steps' events, sector guards, def.posts, rooms)` and expect `[]`.
- C5 Areas: at bind `g.enemyMgr?.setAreas(<the def's track boxes and y bands>)`; in `guardAlarm()` read
  `em.alarmArea` (-1: both); on each area rise `em.setAreaStage(area, stage)`; site stage 2 when both areas are at 1
  (`run.raiseAlarm()`); area stage actions (`StageAction.area`) in `sectorMode`.
- C6 The mission e2e part (`scripts/e2e-sectorops-mission.mjs`) asserts the c1 / c2 walk with `?missionorders=1`
  (reads `em.orderOf`).
Sector Ops: S2 / S4 post coordinates for C2, `area` on S2 / S4 stage actions (C5), `SectorDef.noisy` data (D8).
Marlow Yard: `ctcourse` `guardAi.noisy`. HUD owner (D9): the meter marker reads `g.enemyMgr.ambientAt(x, y, z)` at
the player. Orchestrator: bible 5.2 S2 field name (A12); Q1 to Michael by day.

## Hard rules check
- No allocation in hot paths: `OrderBoard` and `AreaStages` are fixed arrays sized at construction; each Enemy
  reuses one `OrderLeg` and one goal object (the breaker walk's pattern); tag matching runs at order and placement
  time only; the noise live mask is a Uint8Array refreshed once per tick; `hyp2` for every distance.
- Fixed and explainable (VISION 8, G143): no randomness; every walk names its cause (the bell, the cut, the release),
  uses the guard's own route back, and any detection on the way is the normal perception path.
- Gameplay never reads graphics: points come from mission posts, rooms and the nav grid; circuit state from the
  switch system (`breakerOff`), never from lights' rendered state; noise from the noise model.
- Co-op: host-only simulation, no wire or save change. Dark: all three flags off by default.

## Walk items
- Two-Key Ledger W3 (`?missionorders=1`): turn both keys; the porter leaves the lodge, walks to the passage, looks
  round, goes back - accept when he comes every time the keys turn, never when knocked out first.
- Split Shift S2: cut the east boards; #7 stops at reception, both walk to the plant room, #7 resets the board -
  accept when splitting them (atrium board) leaves #7 alone after the wait.
- Code Relay S4: the release; #20 walks the west aisle to the cage front - accept when a Relay team restart replays it.
- Areas and noise items after Q1 and the map data.

## Risks and open questions
- Claims overlap (`claims-check` 2026-10-25): feature/guard-rules (J15) on `enemy.ts`, `enemyManager.ts`,
  `guardAiData.ts`, `flags.ts`, `e2e-stealth-ai.mjs`; `flags.ts` also with coop-kit, map-ready, player-batch-j19. The
  orchestrator orders guard-rules against this job (same lead, so the lead may simply run them in sequence); flag
  lines are additive. Each slice adds code in new blocks tagged `(guard-ai-mission-hooks Sn)`.
- `missionEvent` is not on master until the engine merges; S1 does not depend on it (structural `OrderEvent`), C1 does.
- A walk over 120 s (`giveUp`) ends early on a long map path; S1's e2e logs walk times, C4 can warn.
- Q1 (G125) decides `areaAlarms` switch-on; S3 is built dark either way.
