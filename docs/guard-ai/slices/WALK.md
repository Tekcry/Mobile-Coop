# Walk 4.72 fixes S17-S19 (implementer report, 2026-10-23)

Spec: `PLAN.md` "Walk 4.72 fixes" rows S17, S18, S19 (Michael's words G1-G3 from his walk of 4.72,
`docs/orchestrator/WALK-4.72-REPORT.md` "Guard AI Build" on `feature/menu`); `BRIEF.md` A100 onward. Branch
`feature/guard-ai-walk` off the S15 tip. Host only: no `src/net` edit, no `PROTOCOL_VERSION` change, no save-shape change.
No edit to S15's breaker walk (`brkAt` / `brkY` / `brkWalkT`), `circuitOut`, `lightsOut`, `switchFloor`, the
`BREAKER.reset` branch, `navGrid.ts` or the `stealthSystems.ts` breaker / panel code; no walker / door / separation (S20)
or carry pose (S21) work.

## S17 (G1) Lasers: the guards look where the laser is and search the room
Michael: "when guards alerted when i cross laser, they somehow know ive climbed elsewhere. theres no way they could no
that unless they saw me. change it so they come to look where the laser is and search the room."

Cause: a broken beam raised the alarm stage (`CtDevices.touch` -> `raiseAlarm` -> `SectorMode.cameraAlarm` -> `raised`),
which brought reinforcements in told by command (`Enemy.joinAsReinforcement` -> `radio(0)`: combat the next step). In
combat a guard goes for `this.ctx.lkp` only while the shared last known position is valid; a beam never set one, so
`Enemy.decide`'s `known = ... !this.ctx.lkpValid() ? t.feet : ...` put them on the player's live feet, wherever he had
climbed. Nothing else on a device alert read the player into the AI (the camera stage event carries where the camera saw
him, which is a sighting; `setAlarmStage` only hands out gear).

Built:
- `src/ai/gear.ts:62` `DEVICE` (enabled, want 2, callR 30 m, wait 20 s, fresh 90 s).
- `src/game/jammer.ts:339` `beamSpot(def, out)`: the beam line's midpoint at its floor (NaN: none), A100.
- `src/game/ctDevices.ts`: `CtHooks.alertAt?(x, y, z, key)` (`:209`), `CAM_KEY` 1000 (`:213`); `touch` reports the broken
  beam's spot before the alarm stage rises (`:999`); `onCamera` (full awareness) reports where the camera saw someone
  (`:1036`, A101).
- `src/game/modes/sectorMode.ts:223`, `src/game/modes/courseMode.ts:220`: `alertAt` -> `EnemyManager.deviceAlert` (A104).
- `src/ai/incidents.ts`: kind `device` (`K_DEVICE` 11, appended: `:46`), `MODE_DEVICE` 6 (`:198`), `reportDevice` (`:419`;
  merges by device key while open), assignment (`:684`): the `DEVICE.want` calm free guards best by path within
  `DEVICE.callR`; nobody: waits `DEVICE.wait` s, then lapses.
- `src/ai/enemyManager.ts`: `deviceAlert` (`:745`): the spot (nav floor when y is NaN), its board time, a `device`
  incident; no last known position is touched. `joinReinforcement` (`:704`): an alarm within `DEVICE.fresh` s of a
  device alert with no last known position (`deviceFresh`, `:725`) makes the reinforcement a responder
  (`Enemy.joinAsResponder` at the spot and its room, `roomOf`), else as before (A102). `boardStep` sends `MODE_DEVICE`
  to `Enemy.respondDevice` with the spot's room (`:1854`). `clear` forgets the device spot.
- `src/ai/enemy.ts`: `respondDevice` (`:1277`): `searchAt` the spot (his own search: never the shared last known
  position), the room it is in (`searchRoom`), the task kept through the search (`onLevel`, `:1546`), bark `tripped`.
  `joinAsResponder` (`:1293`): aggressive profile, the run-in route first (calm search too: `entryStep`, `:1307`, now
  shared with combat), then the spot's search; `responder` keeps it hunting (`:1945`: never calm, so a response team
  sweeps after it as S13). Search points of a device search are clamped into its room (`calmDecide`, `:2114`).
- `src/ai/barks.ts`: `tripped` ("Sensor tripped. Moving to check.", "Alarm point's lit. On my way.").

Tests: `tests/deviceTrip.test.ts` (11): `beamSpot` is the beam's middle; the board sends the 2 nearest calm guards in range
to the beam spot (a guard in combat or 46 m off never), merges a second trip of the same beam, lapses after
`DEVICE.wait`; wired with the player on the roof 40 m off: the sent guards get the beam spot and the lab room, no last
known position is set; a reinforcement on the trip becomes a responder at the beam (after a sighting: combat as before;
after `DEVICE.fresh`: as before); parked modes nothing; on the real `Enemy` code the responder's first stop is the beam
spot and every search stop stays inside the lab, none near the player, with the shared last known position set on the
player the whole time. Also run green: incidents, camBodyWiring, breaker, alarmCall, laserAlarm, jammer, sweep,
awarenessWiring, gear.

E2e to run: `e2e-stealth-ai`, `e2e-sectorops` (all parts), `e2e-ctcourse` (station 4's laser), `e2e-ct-warehouse`.
No e2e assert added (the suites trip lasers only for the alarm stage; a guard-side assert needs a guard in range of a beam,
not cheap without a run).

## S18 (G2) Bodies: the finders search longer, at more points, further out
Michael: "guards investigating dead bodies give up too easily."

Cause: a dead body's finder (and the guard who heard his shout) ran the same search as any call: `ALERT.searchTime`
(60 s) over `PATROL`'s ring (2 m, +2.5 m, cap 11 m), 3 s per point; at the calm search pace (x0.75 of a slow walk) that
was about five stops, the furthest ~9.5 m out. The second guard a camera sent to a dead body stood down when the first
found it.

Built:
- `src/ai/gear.ts:71` `BODY_SEARCH` (timeMul 3, r0 1.5, step 1.5, max 15, look 2.5).
- `src/ai/response.ts` (new, pure): `SEARCH_PLAIN` / `SEARCH_BODY` / `SEARCH_DEVICE`, `SearchSpec` and the `SEARCH` table
  (plain = `ALERT.searchTime` + `PATROL`'s ring; body = `BODY_SEARCH`; device = plain), `searchSpec`, `ringPoint`
  (`patrol.ts` `searchPoint` with a spec), `searchCoverage` (a model of one search: stops and reach; docs and tests).
- `src/ai/alertState.ts:88` `AlertInput.searchFor` (absent / 0: `ALERT.searchTime`), read by the searching case (`:189`).
- `src/ai/enemy.ts`: `searchKind` (plain unless set), `searchAt(..., kind)`; `bodySearch` (`:810`: starts over when
  already searching, then the body's search); `updateAwareness` sets `searchFor` by kind (`:1977`); `calmDecide` takes
  the ring and the look from the spec (`:2134`, `:2158`); combat's search is plain (`onLevel`, `:1616`); `stepCamBody`
  (`:991`): a dead body found by the other guard sent with him -> he joins its search. `respondDevice` /
  `joinAsResponder` search the device way.
- `src/ai/enemyManager.ts:579-581` `bodyFound` (dead, coordinated): the finder and the voice partner `bodySearch`.
- Tests that change by design: `tests/awarenessWiring.test.ts` and `tests/sectionAlert.test.ts` fake guards gain
  `bodySearch` (awareness: it records a `searchAt` round the body, so its asserts hold as written).

Tests: `tests/bodySearch.test.ts` (7): the table (body = searchTime x timeMul, wider, denser; device and unknown plain);
the plain ring equals `searchPoint` (nothing changes for other searches); the coverage model at the search pace: twice
the stops and 3+ m further; `AlertMachine` ends a search after its `searchFor`; on the real `Enemy` code (its own
`updateAwareness` and `calmDecide`): a dead body's search lasts 180 s against 60 s, at least twice the stops and 3+ m
further out, then cooldown under the held caution; a guard already searching starts over; the second camera-sent guard
joins the search. Also green: awarenessWiring, sectionAlert, pairsWiring, sectorGuardTags, camBodyWiring, incidents,
sweep, deviceTrip, breaker and the other AI suites (alarmCall, cameraReach, coopTorches, ctcourseLight, difficulty,
enemyLightsOut, enemyManagerDespawn, gearWiring, hearing, perception, postsWiring, radioWiring, responseWiring,
s6CloseOn, sectorRestart, securityBodies, securityCamera, squadWiring).

E2e to run: `e2e-stealth-ai` (body finding and the search that ends), `e2e-sectorops` (all parts; camera bodies),
`e2e-ctcourse`. Note for the runner: an e2e that waits for a body search to end now waits up to 180 s, not 60 s.
