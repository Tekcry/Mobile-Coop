# First Playable - a 4-player Kestrel Exchange greybox (milestone, comes before the rest of the roadmap)

Authority: Michael > this file > bible > other specs (for this milestone only). Written 2026-10-09. Version stays 3.6.x (no phase version bump; tag each step in `CHANGELOG.md` under "3.6.x first playable").

**Goal.** A playable, readable 1-4 player run through the Kestrel Exchange as a greybox (blocks, no art), start to finish, so Michael and up to 3 friends can play it and answer three questions (Section 4). Not polished. The PC hosts; a phone must be able to join and play; no phone tuning.

**Not the goal.** Visuals, sound, story, balance, perf budgets, Phase 3 removals. Anything not on the playtest's critical path is PARKED (Section 1).

**Source docs (read only what the step names).** Exchange facts live in `docs/prompts/exchange-design.md` (rooms Section 2, spaces Section 10, guards Section 11) and `docs/prompts/exchange-map.md` (building brief, route, target numbers). There is no Exchange section in `docs/level-design.md`; its Section 12 holds engine facts. The old Exchange blockout code is gone: the map is built new.

---

## 0. Efficiency rules (every step follows them)

1. Read only the files the step lists, using `grep` and line ranges. Do not read the whole bible, `docs/progress.md` (status table and Current state only) or large files end to end. Read `CLAUDE.md` first (hard rules still apply: Babylon via `src/core/babylon.ts`, no allocation in hot paths, strict TS, Babylon-free logic in testable modules).
2. Reuse and adapt what exists: Shoulder Strike enemy AI (`src/ai`), the cover system (`src/cover`), infiltration missions (`src/game/modes/infiltrationMode.ts`, `src/game/missions.ts`), co-op (`src/net`: host simulates, WebRTC via Trystero, up to 4 players), takedowns and carrying (`src/game/takedown*.ts`, `stealthSystems.ts`), switches and shot-out lamps (`stealthSystems.ts`), revive and ping messages (`src/net/protocol.ts`, `src/ui/hud/pings.ts`). Adapt; do not rebuild. A new file is allowed only where nothing exists.
3. One smoke test per feature: a short new suite `scripts/e2e-fp-<step>.mjs` (a section in an existing suite is fine if it is a few lines). Register it in `REQUIRED` and `COVERS` in `scripts/run-e2e.mjs` so `npm run e2e:quick` runs it when its folders change. Run `npm run check` and `npm run e2e:quick` per step. The full `npm run e2e` runs only at S10.
4. Every command gets a timeout (Bash `timeout` parameter or `timeout 300 ...`). Never `cat` or `tail` a file a background task is still writing; wait for the task, then read `test-results/e2e/<suite>.log`.
5. If a step fails its acceptance criteria twice, STOP. Write a short failure report in `docs/progress.md` (step, criterion, what was tried, the error), commit what exists, and tell Michael to escalate that step to Opus.
6. Commit at the end of each step on `ct-movement` and push. Never merge into `dev` or `master`.
7. Each step ends with a report of 6 lines at most: done, files, tests (pass / fail with numbers), what was cut, hand-check result NOT claimed (Michael does it), next step. GPU / perf / visual checks: write "pending PC run" (cloud sessions never claim them).
8. Greybox rule: blocks only (`box()` via `LevelBuilder`), no `art`, no decoration, no CC0 textures. Plain surfaces so noise and footsteps work. Keep one build for solo and co-op (guard count never changes with player count).
9. If a step needs a thing the spec did not foresee, take the smallest option that makes the playtest work, record it in one line in `docs/progress.md` under "First Playable decisions", and carry on. Do not ask Michael unless blocked.
10. Update docs minimally: one line per step in `docs/progress.md` (First Playable log) and `CHANGELOG.md`. The per-system `docs/systems/*.md` updates are deferred to after the playtest (PARKED).

---

## 1. Triage

FIRST PLAYABLE = in this milestone. PARKED = no work until after the playtest (Michael re-triages from the playtest result).

### Remaining Phase 1 (light parity) steps
- Step 4c strip lamps as line sources: PARKED (the greybox uses point-like lamps; avoid long strip fixtures in S1).
- Step 5 parity test and `?lightdebug=1`: PARKED (the one light truth already feeds the meter and guards; S5 adds one cheap guard-vs-meter check).
- Step 6 host-authoritative light state in co-op: FIRST PLAYABLE (inside S7a).
- Step 7 continuous light meter: PARKED (the current bar is enough).
- Step 8 fuse boxes: PARKED (switches and shot lamps are the light tools).
- Step 9 Phase 1 docs / version / final checks: PARKED (S10 is the check).

### Later phases
- Phase 2 Sound (zones, sound meter, mix): PARKED. Existing footstep and noise model stays as is.
- Phase 3 Pure CT conversion: only back-to-wall, holster/aim with no hip fire and the elbow strike (S3a; S3b back-to-wall is cuttable) are FIRST PLAYABLE. Removal of snap cover, Mark & Execute, sonar code: PARKED. Thermal vision: PARKED. Night vision realism ideas (backlog 16): PARKED.
- Phase 3b movement / camera / animation lock and the animation audit: PARKED.
- Phase 4 Mission framework (checkpoints, radio, briefing, alarm levels, stealth rating): PARKED, except a minimal objective, extraction, win/fail/restart and results (S6).
- Phase 5 Co-op 2-4: FIRST PLAYABLE as S7a, S7a2, S7b, S8 (only the parts listed there); sync takedown is S9, after the first playtest. Lobby polish, co-op extras (`coopExtras`), team moves beyond what exists: PARKED.
- Phase 6 CT verbs for the slice (new verbs): PARKED. Existing CT movement stays; the greybox does not require split jumps, rappel or secret routes.
- Phase 6b visual target: PARKED. Phase 7 vertical slice, map phases 4-6 (dressing, readability, civilians, medkits, radio): PARKED.
- Exchange alignment pass (`exchange-alignment.md`): PARKED except what S1 needs (light plan, 4 spawns).
- Warehouse and the other maps as playtest maps: DROPPED from the playtest (they stay in the build).

### Backlog (`docs/backlog.md`)
- 1 Free Roam lights / switches / alarms: FIRST PLAYABLE, but on the Exchange mission (S2), not Free Roam.
- 2 Perf overlay minimal bar: PARKED.
- 4 Holster / no hip fire / elbow: FIRST PLAYABLE (S3a); back-to-wall S3b is cuttable.
- 5 Ghost copy of operator (Epic): PARKED.
- 6 Voice test: PARKED. 7 Epic perf targets: PARKED. 8 voxMat texture units: PARKED. 9 Skin shader warning: PARKED.
- 12 Benchmark data: PARKED. 13 Thermal: PARKED. 14 iPhone crash on desktop+Epic: PARKED (friends on phones use the default phone look; tell them not to switch to Epic).
- 15 Strip lamps as line sources: PARKED. 16 Night vision realism ideas: PARKED.
- Flaky e2e suites: PARKED (they still run and print KNOWN FLAKY).

---

## 2. Dependency notes (changes from the order Michael gave)

- **S1 is split into S1a, S1b, S1c**, **S3 into S3a, S3b** and **S7 into S7a, S7a2, S7b**: one Sonnet session each, no step touches more than about 12 files.
- Order otherwise unchanged. The map must exist first (S1), guards need lights (S2) and the player verbs (S3a, S4; S3b if it survives) to be tested properly in S5.
- S2 and S4 are mostly "make the existing system work on the Exchange and under the first-playable rules": switches, shot lamps, carry, hide spots and takedowns already exist (`stealthSystems.ts`, `takedown*.ts`), so they are small.
- Single-player and the Exchange work end to end before any co-op step (S6 before S7a). S9 (sync takedown) moves after S10 and the first playtest. Co-op is never a prerequisite for a solo step.
- The existing `?autostart=exchange&mode=infiltration` boot path is the test entry for every step. Co-op tests use `?net=local` (BroadcastChannel between tabs, `src/net/localTransport.ts`) with `scripts/e2e-coop.mjs` as the pattern.

---

## 3. Steps

Common to all steps: rules in Section 0 apply; "Smoke" is the one test to add; "Hand check" is what Michael does on his PC (`npm run dev`, open `/?autostart=exchange&mode=infiltration`; co-op: add `&net=local` in several tabs once S7a exists).

### S1a - Exchange greybox: shell, ground floor, tunnel (Sonnet)
**First, before anything else:** confirm `docs/prompts/exchange-design.md`, `docs/prompts/exchange-map.md` and every `docs/prompts/exchange-plans/*.svg` (`basement`, `ground`, `first`, `roof` and the four `-gameplay` versions) exist. If any is missing, STOP and tell Michael.
**Goal.** The ground floor and cable tunnel of the Kestrel Exchange as walkable blocks, listed as a map.
**Read.** `docs/prompts/exchange-design.md` Sections 2 (Basement, Ground floor) and 10 Spaces 1-4; `docs/prompts/exchange-plans/ground.svg`; `docs/prompts/exchange-map.md` "Construction rules" and "Target numbers"; `src/world/mapDef.ts`; `src/world/maps/warehouse.ts` (build pattern); `src/world/maps/index.ts`, `listed.ts`; `src/world/levelBuilder.ts` (grep the `box`, `room`, `door`, `light` methods); `src/world/rooms.ts`.
**Files.** New `src/world/maps/exchange.ts` (`EXCHANGE_MAP`, build split into `buildGround`, later `buildFirst`, `buildRoof`); `src/world/maps/index.ts`, `listed.ts`; a unit test `tests/exchangeMap.test.ts`.
**Do.** Real proportions from the design (1.8-2.4 m corridors, 0.9-1.0 x 2.1 m doors, 6 m column grid, ground y 0, first floor y 4.5, roof 9.0). Spaces 1-4: cable tunnel and chamber, MDF hall, battery and power rooms, light well, each as one `RoomDef` (`cable`, `mdf`, `power`, `well`). Real doors, plus a stair core (1.2 m wide, rise 0.17 run 0.28) to the first floor. Theme: night, `lightLevel` 0.1, `faction: 'urban'`, `modes: ['infiltration','sandbox']`. Skip: MDF frame tops, runways, trenches, ducts, drainpipes, string courses, secret routes. Leave floor-plane space for 3 player routes through the MDF hall (two aisles plus the cross aisle).
**Acceptance.**
1. `?autostart=exchange&mode=sandbox` boots with 0 console errors and the operator stands in the cable chamber.
2. Unit test: every room's centre is reachable from the first player spawn over the nav grid (use `navBuild.ts` the way `tests` for other maps do; grep `tests/` for a reachability test to copy) including the stair to y 4.5.
3. No two walkable surfaces closer than 2.4 m in one column except stair runs (test or documented in the unit test).
4. `npm run check` passes.
**Smoke.** `scripts/e2e-fp-map.mjs`: boot the map, assert room ids `cable`, `mdf`, `power`, `well` exist, the player has a floor under it, and no console errors. (Extended in S1b and S1c.)
**Hand check.** Walk cable chamber to MDF hall to battery room to light well to the stair. Anything you cannot walk through or get stuck on: note it.

### S1b - Exchange greybox: first floor, roof, yard (Sonnet)
**Goal.** Upper storey, roof and yard blocks, joined to S1a.
**Read.** `exchange-design.md` Sections 2 (First floor, Roof) and 10 Spaces 5-8; `exchange-plans/first.svg`, `roof.svg`, `first-gameplay.svg`, `roof-gameplay.svg`; the S1a `exchange.ts`.
**Files.** `src/world/maps/exchange.ts`, `tests/exchangeMap.test.ts`, `scripts/e2e-fp-map.mjs`.
**Do.** Rooms `switchroom`, `offices`, `servers`, `roof`, plus the yard as a room (`yard`). Server hall with a chain-link-height cage (a 2.4 m fence block) around the core switch. Offices: a T-junction corridor with interconnecting office doors. Roof: parapet 1.0 m, tank room, a hatch route down by stair (no ladder or rappel needed), and the stair or external steel stair to the yard. Yard: van block, pallets as cover, a gate. Routes: the design's loud route (main stair), the switchroom window route may be a plain door; keep at least TWO ways between ground and first floor (central stair plus a second stair from the power room gallery or the yard), and in the server hall at least three lanes (stripped racks, cross aisles, cage perimeter) so 4 players do not queue.
**Acceptance.**
1. Reachability test from spawn to every room centre, to the cage interior door, and to the yard gate.
2. Two separate ground-to-first-floor routes exist (the test finds two paths with no shared stair).
3. `npm run check` and `e2e:quick` pass.
**Smoke.** Extend `e2e-fp-map.mjs`: all 9 room ids exist; teleport to the server hall and the yard, floor present, 0 console errors.
**Hand check.** Walk spawn to yard gate by the main stair, then find the second route. Note dead ends.

### S1c - Exchange greybox: lights, guards, spawns, objective, extraction (Sonnet)
**Goal.** The map is a mission: lit pools and dark, 9 guards on patrols, 4 spawns, one objective, one extraction.
**Read.** `exchange-design.md` Section 11 (guard sheets) and Section 10 per-space lamp notes; `exchange-map.md` "Mission and modes" and "Co-op routes" (ignore lips); `src/game/missions.ts` and the `Insertion` / `MissionDef` shapes; `src/game/modes/infiltrationMode.ts` (objective kinds `plant`, extraction); `src/world/lights.ts` (lamp API as used in `warehouse.ts`); `src/ai/patrol.ts`, `src/world/rooms.ts` (`SquadSlot`).
**Files.** `src/world/maps/exchange.ts`; `src/game/missions.ts` (new mission `exchange-playtest`); `tests/exchangeMap.test.ts`; `scripts/e2e-fp-map.mjs`.
**Do.**
- Lights: warm sodium lamps 0.9-1.0 intensity, radius 6-8 m, point-like (no long strip fittings). Dark `ambientZone` 0.08-0.12 per storey. At least two lamp circuits (switch groups) per lit space, one wall `switches` entry by a door per circuit. Every guard sits near a lit pool with a dark flank so a player has a shadow route.
- Guards: the 9 from the design (G1-G9), `squads: 'rooms'`, each a loop of 2-4 waypoints; set each stop's facing as the design says. G4 is an officer, G7 a sniper, G6 a heavy; if an archetype needs code you lack, use `grunt`. Do not add a tenth.
- Spawns: `playerSpawns` holds 4 points in the cable chamber, each at least 1.2 m apart and none on a door; insertion `manhole` at spawn 1.
- Objective (the one): plant "tap the broker's line" (4 s hold) on the core switch inside the server hall cage, dark side. Extraction: the yard side gate, radius 2. Rules: `noAlarms`, `noKills`, `undetected` stay `bonus`.
- Alarm panels in the offices corridor, server hall and yard; `reinforce` at the street lobby and the yard lane; `hideSpots` at least one per guarded space; medkits: skip.
**Acceptance.**
1. `?autostart=exchange&mode=infiltration` boots, shows the objective, 9 guards spawn, 4 spawn points listed.
2. Unit test: the objective and extraction are reachable from every spawn; every guard patrol point is on the nav grid; every objective site has light level below `LIGHT.shadow`.
3. Headless run: the operator is teleported to the plant site, holds the interact, then to extraction; the mission reports complete (a basic path; fuller win/fail in S6).
**Smoke.** Extend `e2e-fp-map.mjs`: step 3 above.
**Hand check.** Play solo from the cable chamber to the yard once, using whatever you like. Is the route readable? Is there a dark way past each guard? Where do you get lost?

### S2 - Lights: switch off and shoot out (Sonnet)
**Goal.** On the Exchange, a player can switch a circuit off and shoot out any lamp; the light meter, the render and guard perception agree; guards react.
**Read.** `src/game/stealthSystems.ts` (switches, `shotRay`, lamp shot handling); `src/world/lights.ts`, `src/world/lightField.ts` (the one truth); `src/ai/enemyManager.ts` (`lightsOut`); the unit tests `tests/` for light (grep `lightField`).
**Files.** `src/game/stealthSystems.ts`, `src/ai/enemyManager.ts`, `src/world/maps/exchange.ts` (lamp data), `scripts/e2e-fp-lights.mjs`.
**Do.** Make sure every Exchange lamp is shootable (bulb exposed, a hit removes it from `LightRegistry` and remixes the field) and each lamp belongs to a switchable circuit or is a lone shootable lamp. A circuit going dark or a lamp breaking makes the nearest calm guard walk to the spot with his torch on (existing `lightsOut` behaviour; wire it if it is off in infiltration). Shot lamps stay out; switched circuits stay off until a guard resets the switch (use the existing guard switch-reset if it exists, else leave off).
**Acceptance.**
1. Interact with a switch: its circuit goes off, the light level at 5 sample points in that room drops below `LIGHT.shadow`, the meter reads dark there.
2. Shoot a lamp: removed; light at its sample points drops; one nearby guard changes to investigate.
3. Rendering follows (the desktop render and the phone look both read the remixed field; if the remix call needs an explicit trigger, add it).
**Smoke.** `e2e-fp-lights.mjs`: switch off a circuit, read `levelAt` at a point before and after; shoot a lamp, same check; guard alert state changes.
**Hand check.** In the MDF hall switch a circuit off, shoot a lamp, then watch whether the guard comes and where you can wait in the dark.

### S3a - Holster, no hip fire, elbow (Sonnet)
**Goal.** Weapon holstered unless aiming (no hip fire) and an elbow strike on the fire button.
**Read.** `src/weapons/` (grep `aim`, `holster`, `ads`); `src/input/` action map (grep `fire`); bible 1.11 line only (the version note at the top of `docs/design-bible.md`); `src/game/takedown.ts` (an elbow reuses its melee hit).
**Files.** `src/weapons/*`, `src/input/*`, `src/game/gameState.ts` (hooks), `src/player/playerController.ts`, `scripts/e2e-fp-verbs.mjs`.
**Do.**
- Holster: the weapon is holstered unless aim is held; no hip fire (fire does nothing unless aiming). Aim raises the weapon in under 0.3 s.
- Elbow: when not aiming, the fire button throws an elbow (melee hit, short range, 1 s cooldown). Behind a guard it stuns or knocks out (reuse the takedown knock-out result) so it works as a quick close takedown; from the front it makes noise and alerts.
- Touch: the controls must offer these (fire = elbow when not aiming); keep the touch layout otherwise.
**Acceptance.**
1. Unaimed fire does not spawn a projectile; aimed fire does.
2. Elbow behind an unaware guard within 1.2 m knocks him out; from the front he alerts.
3. `npm run check`, `e2e:quick` pass; existing `e2e-weapons-carry` and `e2e-combat` suites updated only where the new rules change the expectation (note each change).
**Smoke.** `e2e-fp-verbs.mjs`: the two checks above in the Exchange or the Proving Grounds.
**Hand check.** Aim and fire, try fire without aim, elbow a guard from behind and from the front.

### S3b - Back-to-wall (Sonnet; CUTTABLE)
**Goal.** Back-to-wall as a hide-and-sidle verb.
**Cut rule.** If S3b fails its acceptance twice, do NOT escalate: revert its code, park it (add "S3b back-to-wall PARKED, failed twice" with the error to `docs/progress.md`), and carry on to S4 without it. No later step depends on it.
**Read.** `docs/ct-movement.md` and `docs/systems/movement.md` only for "wall"; `src/cover/coverController.ts`, `coverState.ts`, `cornerController.ts`; `src/input/` action map (grep `cover`).
**Files.** `src/cover/*`, `src/input/*`, `src/player/playerController.ts`, `scripts/e2e-fp-verbs.mjs` (extend).
**Do.** Adapt the cover controller. Near a wall (back within 0.4 m) and holding the existing cover button, the player presses back to the wall, moves along it slowly and quietly, and is hidden from guards facing away by the existing cover rules (reuse the visibility reduction). No snap to cover nodes, no cover-to-cover. Release to leave. Keep it simple: a wall-hug state plus a peek (camera offset) at corners; if peek is large, ship hug without peek and list it as cut.
**Acceptance.**
1. Back-to-wall engages against a wall; speed is below walking speed; a guard whose view cone points away does not see the player at 3 m in shadow.
2. `npm run check`, `e2e:quick` pass; `e2e-cover` updated only where the new rules change the expectation (note each change).
**Smoke.** Extend `e2e-fp-verbs.mjs` with check 1.
**Hand check.** Hug a wall near a guard in the dark, then in the light.

### S4 - Takedowns and body drag (Sonnet)
**Goal.** Takedown (grab / knock-out) and dragging a body into the dark or a hide spot work on the Exchange.
**Read.** `docs/systems/takedowns.md` (skim); `src/game/takedown.ts`, `takedownController.ts`; `src/ai/bodies.ts`, `src/ai/body.ts`; `stealthSystems.ts` (carry, `hideSpots`).
**Files.** `src/game/takedown*.ts`, `src/ai/bodies.ts`, `src/game/stealthSystems.ts`, `scripts/e2e-fp-takedown.mjs`.
**Do.** Verify and fix: takedown from behind (button prompt in range), the body stays down for the match and is a found-body trigger for other guards (alert), pick up and drag: slow movement, drop in a `hideSpots` position or in a dark spot (below `LIGHT.shadow`) so it is not found. Remove only what breaks the playtest; Mark & Execute stays untouched and unused.
**Acceptance.**
1. From behind in range: takedown completes, guard down, noise below a gunshot.
2. Drag: the body follows the player, movement slows, drop in a hide spot hides it (a guard walking past does not raise an alert); drop in the open and a guard within view alerts.
3. `e2e-takedown` still passes.
**Smoke.** `e2e-fp-takedown.mjs`: take down one guard, drag to the nearest `hideSpot`, assert hidden flag.
**Hand check.** Take down G1 in the MDF hall, drag him to a locker or dark corner, see if another guard finds him.

### S5 - Guard perception, search, alarm (Sonnet)
**Goal.** Guards see in the light, miss in the dark, hear footsteps and shots, search a last-known position, and raise the alarm. Tuned so the dark is a real tool but not a free pass.
**Read.** `docs/systems/ai.md` (skim); `src/ai/perception.ts`, `alertState.ts`, `alarm.ts`, `enemy.ts`; `tests/` for perception (grep `sightRate`).
**Files.** `src/ai/perception.ts`, `src/ai/alertState.ts`, `src/ai/enemy.ts`, `src/ai/alarm.ts`, `scripts/e2e-fp-ai.mjs`, a unit test for the meter guarantee.
**Do.** Confirm and fix these behaviours in the Exchange (infiltration, difficulty `normal`):
- In dark (`LIGHT.shadow`) at more than 2 m a standing player is not spotted; in the light at 10 m in the view cone he is, within about 2-3 s; crouched in shadow is safer than standing in light (one unit test: for equal geometry, `sightRate` at `LIGHT.shadow` never exceeds the sight rate the meter band reports as dark).
- Footsteps within a distance by gear (the existing noise model) and shots are heard; the guard goes to the sound, then searches around it for 10-20 s, then returns to his patrol.
- A guard who sees the player in an alarm-capable state goes to the nearest alarm panel; reaching it calls the existing reinforcement at `reinforce` points. Mission fail does NOT depend on the alarm (S6 defines fail).
- Found body: raises the search at the body (S4).
**Acceptance.** The four behaviours, one assertion each, in the headless suite, plus `e2e-stealth-ai` and `e2e-enemies` unchanged and passing.
**Smoke.** `e2e-fp-ai.mjs`: place a guard and the player in a lit and then a dark lamp state, step the sim, assert alert state (unaware vs suspicious); a gunshot noise moves a guard to the spot; an alerted guard reaches an alarm.
**Hand check.** Stand in the dark in front of a guard, then step into the light. Make noise around a corner. Get seen and see whether he calls the alarm.

### S6 - Mission loop: objective, extraction, win/fail, restart, results (Sonnet)
**Goal.** A complete solo run: spawn, do the objective, extract, see a result, restart.
**Read.** `src/game/modes/infiltrationMode.ts` (chain, `lives`, `checkpoint`, end stinger); `src/game/missions.ts` (`missionRating`); `src/ui/screens/` results screen (grep `results`); `src/game/gameState.ts` `onPlayerDeath`; `src/main.ts` `startGame`.
**Files.** `src/game/modes/infiltrationMode.ts`, `src/game/missions.ts`, `src/ui/screens/results*.ts` (or the file the grep shows), `src/main.ts`, `scripts/e2e-fp-mission.mjs`.
**Do.**
- Win: objective done and everyone alive at extraction (solo: the player) reaches the extraction zone and holds 1 s; show "MISSION COMPLETE".
- Fail: the player is killed with no lives left (set `lives` to 1 for the playtest: one death ends solo), or time out is NOT used. Show "MISSION FAILED".
- Results: time, guards knocked out, alarms raised, times seen, objective done. No XP, ranks or unlocks.
- Restart: a "Restart" button on the results screen builds a fresh match with the same map, mission, seed and settings. A pause-menu "Restart mission" does the same.
- Keep the existing objective HUD text and extraction marker; no radio.
**Acceptance.**
1. A scripted solo run reaches COMPLETE; a scripted death reaches FAILED; Restart yields a fresh match in under 5 s with all 9 guards alive and the objective reset.
2. No console errors; `e2e-missions` updated only where the changed rules require.
**Smoke.** `e2e-fp-mission.mjs`: the three flows above.
**Hand check.** Play the whole mission solo, win once, die once, press Restart each time. Time how long a run takes (target: 8-15 minutes).

### S7a - Co-op sync of lights, switches, lamp shots, guards and bodies (Sonnet)
**Goal.** 2-4 players (via `?net=local` tabs and WebRTC) share the same world state: the host simulates; lights, switches, shot lamps, guards and bodies agree on every client.
**Read.** `docs/systems/coop.md`; `src/net/protocol.ts` (messages, `NetItem`, snapshot, `doorsSig` pattern), `src/net/coopHost.ts` (snapshot loop, `ITEMS_EVERY`), `coopClient.ts`, `src/net/enemyPuppet.ts`; `src/game/stealthSystems.ts` (what already syncs); `scripts/e2e-coop.mjs` (test pattern); `phase-1-light-parity.md` Step 6 (the light-state design to follow).
**Files.** `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/game/stealthSystems.ts`, `scripts/e2e-fp-coop.mjs`.
**Do.**
- Light state (Phase 1 Step 6): per light on / destroyed, per group on / off, sent when its signature changes and every `ITEMS_EVERY`. Client switch and lamp-shot requests are validated and applied by the host, then broadcast; clients remix their field.
- Guards and bodies: alert states, positions, knocked-out guards and dragged / hidden bodies come from the host; clients see them match.
- Client takedown / elbow requests on guards already exist for co-op takedowns; confirm they work for the new elbow (S3a) and drag (S4) (carried body ownership on the host).
**Acceptance.** With 2 `?net=local` tabs: a client switch off syncs to the host and back; a client lamp shot syncs and light levels at 3 sample points match on both; a host takedown shows on the client; a client drags a body and the host sees it hidden.
**Smoke.** `e2e-fp-coop.mjs` (2 tabs): the checks above in one scripted run, on `exchange`.
**Hand check.** Two browser tabs (`&net=local`): shoot a lamp in one, watch the other; take down a guard in one, find the body in the other.

### S7a2 - Co-op sync of objective, extraction, results, restart, late join (Sonnet)
**Goal.** The mission loop (S6) works for 2-4 players: objective, extraction, end state, results and restart agree on every client; a late joiner gets the current state.
**Read.** The S7a changes (`git diff` of S7a), `src/net/protocol.ts`, `src/net/coopHost.ts` (snapshot, start path), `coopClient.ts`, `src/game/modes/infiltrationMode.ts`, the results screen, `scripts/e2e-fp-coop.mjs`.
**Files.** `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/game/modes/infiltrationMode.ts`, results screen, `scripts/e2e-fp-coop.mjs` (extend).
**Do.**
- Objective chain, plant progress, extraction hold and the end state (complete / failed, with the results data) come from the host and show on every client.
- Restart: the host's restart rebuilds the match and tells clients to reload their world (reuse the lobby start path).
- Late join: a tab joining mid-run gets current light, guard, body and objective state and spawns at the nearest spawn point.
- Failure rule for co-op: the run fails when all players are dead at the same time (S7b adds downed).
**Acceptance.** With 2 `?net=local` tabs: both see the plant progress and COMPLETE together; both see FAILED when both die; restart gives both a fresh match with 9 guards and the objective reset; a third tab joining mid-run matches the host's light and guard state within 5 s.
**Smoke.** Extend `e2e-fp-coop.mjs`: complete, fail, restart, late join in one run.
**Hand check.** Two tabs: finish the mission together, press Restart, join a third tab mid-run.

### S7b - 4 players, downed/revive, pings, team results (Sonnet)
**Goal.** 4 players start together at 4 spawns, can be downed and revived, can ping, and get a simple team result.
**Read.** `src/net/protocol.ts` (`revive`, `ping`, `NetItem 'revive'`), `src/game/gameState.ts` (`onPlayerDeath`, `net.reviveAll`), `src/ui/hud/pings.ts`, `src/net/coopUi.ts` (lobby: player count and start); `src/game/interactables.ts` (`revive`); `src/net/remoteAvatar.ts`.
**Files.** `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/coopUi.ts`, `src/game/gameState.ts`, `src/game/modes/infiltrationMode.ts`, `src/ui/hud/pings.ts`, results screen, `scripts/e2e-fp-coop4.mjs`.
**Do.**
- 4 players: each joins at `playerSpawns[i]` (S1c). Lobby accepts up to 4 for the Exchange and starts with 1-4; the mission works with any number.
- Downed: at 0 health a co-op player is downed (crawl or stay down for 30 s; a mate holds interact within 1.5 m for 3 s to revive at 40% health). If nobody revives within 30 s they are dead for the rest of the run (no checkpoints in this milestone). All dead or downed at once = fail. Use the existing `revive` interactable and message; adapt rather than rebuild.
- Pings: one button places a ping at the aim point, or on a guard; all players see it for 6 s with the pinger's name colour (existing message). Make sure the button exists on touch.
- Team results: after the mission, a list of players with guards knocked out, revives, times downed, alarms; a team total and COMPLETE or FAILED.
**Acceptance.** 4 tabs: all four spawn at distinct spawns; one is downed, a mate revives; a ping shows in all tabs; the results list 4 names; restart brings all four back. 1-player and 2-player runs unchanged (S6, S7a and S7a2 smokes pass).
**Smoke.** `e2e-fp-coop4.mjs`: 4 `?net=local` tabs, the checks above (use `e2e-coop.mjs` for page-launch code).
**Hand check.** Four tabs on your PC (each at low graphics: `&gfx=low` if available). Down one player, revive, ping, finish.

### S8 - OPUS: co-op netcode review of S7 (OPUS)
**Goal.** Find and fix correctness problems in the S7a / S7a2 / S7b netcode before friends play. Runs before S10.
**Read.** The diffs of S7a, S7a2 and S7b (`git diff <S6 commit>..HEAD -- src/net src/game`), `docs/systems/coop.md`, `src/net/*`.
**Check.**
- Authority: every client request (switch, lamp shot, takedown, drag, revive, ping, plant, extract) is validated by the host (range, state, rate) in `validate.ts` / `parseMessage`; a client cannot change another player's state or the objective.
- Desync: light, guard, body, door, objective and downed state each have a signature compare and periodic re-send; the clients converge after 5 s of packet loss (simulate loss in the local transport).
- Late join and rejoin: current state arrives; a rejoining player keeps their identity and is not revived for free; joining mid-run behaves (spawns at the nearest spawn or spectates).
- 4 players: snapshot size and rate (bandwidth with 4 players, 9 guards, 4 bodies) stays under the data-channel limits (`trysteroTransport.ts` has a 64 KB message cap); interpolation with 4 remote players.
- Disconnects: host leaving ends the run cleanly; a client leaving while carrying a body or reviving releases it.
- Restart and results: both consistent across clients; no stale state after restart.
**Deliver.** Fixes in code with tests, plus a short report in `docs/progress.md` ("S8 review"): findings, fixed, left (with the risk).
**Acceptance.** `e2e-fp-coop` and `e2e-fp-coop4` pass 3 of 3; `e2e-coop` and `e2e-netmove` pass (or fail only as KNOWN FLAKY).
**Smoke.** One added check in `e2e-fp-coop.mjs`: drop 20% of messages in the local transport for 5 s, assert convergence.
**Hand check.** None (Michael's S10 test covers it).

### S10 - Full e2e, Michael's 4-tab test, then the friends playtest (Sonnet runs the first part; Michael the rest)
**Goal.** Everything green, then humans.
**Sonnet does (one session).**
1. `npm run build`, then `npm run check` and `npm run e2e` with a 600 s timeout per command, in the background; read the logs only after the task ends. Fix real failures in new code; KNOWN FLAKY suites may fail without blocking. If a failure is in code outside the first-playable files, report it and stop on that item (do not fix unrelated systems).
2. Version labels: nothing. `CHANGELOG.md` "3.6.x first playable" one entry summarising S1-S8 (S3b if kept); `TESTING.md` "First Playable manual check" (Michael's list below, 10 lines at most).
3. Make sure `/ct/` builds (Michael tests the preview at `/ct/`; deploy is Michael's) and that `README` or `TESTING.md` has the join instructions (Section 4).
4. Report in the Appendix B format, then STOP.
**Michael's 4-tab test (PC, `?net=local`, one tab per player).** Run: host plus 3 tabs; complete the mission together; down and revive one; ping; switch off a circuit and shoot a lamp from different tabs; restart. Write what broke in `docs/backlog.md` (one line each, tagged BLOCKER if it stops the playtest). Blockers go back to Sonnet as small fix sessions (one session per blocker, same rules, two failures means Opus).
**Then** the friends playtest (Section 4).
**Smoke / hand check.** The S10 pass itself is the full suite; Michael's test is the hand check.

### S9 (after the first playtest) - Sync takedown (Sonnet)
**Goal.** Not part of the first playtest; built after Michael has the playtest answers. Up to 4 players each mark a guard; a shared countdown starts; at zero every marked guard is taken down at once (the co-op engagement system, bible C12 in spirit: simple version).
**Read.** `src/game/teamMoves.ts`, `teamController.ts` (the existing dual takedown); `src/net/coopHost.ts` (`checkTeamRequest`, the dual takedown path); `src/ai/enemy.ts` (knock-out result); `src/ui/hud/hud.ts` (add a marker and a countdown, reuse `pings.ts` styles); input action map.
**Files.** `src/game/teamMoves.ts`, `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/ui/hud/*`, `src/input/*`, `scripts/e2e-fp-sync.mjs`.
**Do.**
- Mark: with a guard in line of sight within 25 m and not alerted, a player holds the sync button 0.5 s to mark him (marker above the guard, visible to all, in the marker owner's colour). One mark per player; marking another moves it.
- Countdown: when 2 or more players have marked distinct guards, any marker can press the same button to start a 3 s shared countdown, shown to all.
- Execute: at zero the host checks each marked guard is alive, unalerted, and still in the owner's line of sight; those who qualify get the knock-out at the same tick (guards need no animation beyond the existing knock-out); players whose guard is lost see "sync failed" for that mark. Alerted guards are never taken down; the countdown cancels if fewer than 2 marks remain.
- Solo: the button is hidden.
- Never "kills" for the `noKills` rule; they count as knock-outs.
**Acceptance.** Host-side logic is a Babylon-free module with unit tests (mark, count, cancel, execute, lost line of sight). With 2 `?net=local` tabs: both mark a different guard, start, both go down within one snapshot of each other; a guard alerted during the countdown stays up.
**Smoke.** `e2e-fp-sync.mjs`: 2 tabs, the success path and the alerted-guard path.
**Hand check.** Two or three tabs in the server hall: mark G5 and G6, start the countdown, watch both go down.

---

## 4. Playtest

**Who.** Michael hosts on the PC (hardware GPU, the `/ct/` preview build or `npm run dev` on the LAN). Up to 3 friends join by room code from phone or PC. Solo runs count too.
**How.** Michael creates a room on the Exchange mission and shares the code. Friends use the `/ct/` preview URL, default settings, headphones optional. Do not switch phones to Epic or `platform=desktop` (backlog 14). Play 2 full runs (a first run, then a run with a plan). Record the host's screen if possible.
**Three questions (ask each player separately, write answers in `docs/progress.md` under "First Playable playtest").**
1. Did you want another go? (yes / no, and why)
2. Were there tense moments in the dark? (describe the best one; if none, say where it was dull or too easy / too hard)
3. Did co-op create moments solo cannot? (name one; or say it felt like four people running one solo game)
Also note: time per run, where players got lost, any crash or desync, the worst frame hitch on the phone.
**Decision after.** Michael re-triages the PARKED list from the answers.

### TURN relay risk
Co-op uses WebRTC through Trystero with public STUN only (`src/net/trysteroTransport.ts`). Players behind carrier-grade or symmetric NAT (many phones on mobile data) may fail to connect even with a correct room code. Check before the playtest: Michael tests one phone on mobile data and one on a different home Wi-Fi.
**Fallback step S10b (only if a friend cannot connect; Sonnet, about one session).**
1. Add an optional TURN server to the WebRTC config (Trystero `rtcConfig.iceServers`) read from a build-time env var (`VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_PASS`), absent by default so single player and plain co-op stay unchanged. Michael chooses and pays for the service (a free-tier relay such as Cloudflare Calls TURN or Metered is enough for a few players) and sets the secrets in the CI workflow; credentials are never committed.
2. A one-line in-lobby status ("connected direct / via relay / failed") so a failed join is diagnosable.
3. Acceptance: with the TURN env set, a Playwright run forcing `iceTransportPolicy: 'relay'` connects two pages; with it unset, behaviour is unchanged.
**Zero-code fallbacks.** Friends on the same LAN or VPN (Tailscale) open the host's dev server address; or play on Wi-Fi instead of mobile data.
