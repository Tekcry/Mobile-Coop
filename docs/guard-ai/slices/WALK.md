# Walk 4.72 fixes S17-S20 (implementer report, 2026-10-23)

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

## S19 (G3) Urgency: they hurry to alarms and reported bodies
Michael: "guards should rush to any triggered alarms or bodies reported, they need a sense of urgency when it makes
logical sense."

Cause: every board send walked at the calm paces (investigate x0.85, search x0.75 of a slow walk, under 1 m/s): a
camera's body, a missing man, a shots call alike; a dead body's radio report moved nobody.

Built:
- `src/ai/response.ts`: `PACE` moved here from `enemy.ts` (pure; `enemy.ts:170` re-exports it, its readers unchanged)
  with `rush` 0.75 (x the RUN speed, `:30`); `urgentKind(kind)` (`:47`: device, bodies, shots, missing, contact urgent;
  noise, distraction, light, breaker calm); `paceSpeed(rush, calm, walk, run)` (`:62`).
- `src/ai/gear.ts:81` `URGENT` (enabled, bodyHelpers 1).
- `src/ai/enemy.ts`: `rush` / `rushing`; set by `sendTo` (shots, `:910`), `pairSearch` (`:957`), `checkBody` (`:976`),
  `respondDevice` / `joinAsResponder` (`:1326`, `:1349`), `bodySearch(x, z, rush)` and `helpSearch` (`:822`, new: the
  radio body helper, bark `joining`, task kept through the search); cleared by `searchAt` (`:1171`), on arrival
  (`calmDecide`, `:2180`) and on calm / combat (`onLevel`, `:1647`); the investigate / search walk speed is
  `paceSpeed` (`:2200`).
- `src/ai/incidents.ts`: `bodyDead` (code 5, never on the board before) gets an assignment (`:718`): `want` calm free
  guards within `callR` by path, `MODE_HELP` 7 (`:204`); `reportBodyCall` (`:437`); merges by body while open.
- `src/ai/enemyManager.ts`: `noteBodyCall` / `bodyHelp` (`:744`, `:756`): the dead body each `body` call is about (a fixed
  ring of 8), and on the call's completion (`sink.completed`, `:326`) the `bodyDead` report unless the body is gone;
  `MODE_HELP` -> `helpSearch` (`:1904`); the finder's voice partner hurries (`bodyFound`, `:590`); `bodyHelps` counter.
- Tests that change by design: `scripts/e2e-stealth-ai.mjs` 'bodies' and 'witness' (A113): the calm guard out of voice
  range is searching (sent to help, `bodyHelps` 1) once the report gets through; `tests/awarenessWiring.test.ts` (fake
  `helpSearch`; the finder modelled as searching; the guard in range is sent once) and `tests/sectionAlert.test.ts`.

Tests: `tests/urgency.test.ts` (10): `urgentKind` splits every incident kind; `paceSpeed` (the rush > 2x the patrol pace,
calm unchanged); the board sends one calm guard in range to a radio-reported body, never the searching finder, and not a
second time while open; on the real `Enemy` code: a tripped device (a jog, then the search pace once there), a device
reinforcement, a camera's body, the radio body helper (a jog, then the search pace), the missing pair lead and cover and
a shots investigator all jog; a noise investigator keeps the investigate pace; calm or combat drops the hurry. Unit test
total for the batch: 28 new (deviceTrip 11, bodySearch 7, urgency 10); the AI set (33 files, 502 tests) green.

E2e to run: `e2e-stealth-ai` (its 'bodies' and 'witness' asserts changed, A113), `e2e-sectorops` (all parts),
`e2e-ctcourse`, `e2e-ct-warehouse`; plus `e2e-tactics` and `e2e-stealth` for the shared pace / search paths.

## S20 (G4) Guards keep apart and never walk through doors
Michael: "guards seem to walk through eachother and sometimes doors."

Cause, spacing: guards are kinematic on the nav grid (no physics body against each other). `Enemy.move` added one soft
push (3 x (1.1 - d) m/s inside about 1.05 m) to the wanted velocity, which the motion driver then smoothed; nothing held
the step. Measured on the real `Enemy.move` before the fix (two guards head on / at right angles): nearest 0.37 m at the
patrol walk, 0.03-0.07 m at the S19 jog, 0.03-0.05 m at a run. Cause, doors: the nav grid is built before the doors are
armed, so every doorway is walkable; a guard within 1 m of a shut door pushes it open (`Doors.pushOpen`), but
`Doors.open` refuses a locked door, so a guard routed at a locked door walked through its leaf, and nothing in the walker
knew a door was there (a door the player shut in his face mid-stride, too).

Built (host only: clients get guard positions and door states from the snapshots; no protocol or save change):
- `src/ai/separation.ts` (new, pure): `SEPARATION` (`:21`: reach 1.05, gain 3, ahead 2.2, lane 0.9, side 0.9, min 0.65,
  dy 1.5), `steerOff` / `steerFrom` (`:56`, `:83`: the old push plus the sidestep round a guard ahead), `keepApart`
  (`:98`), `tooClose` (`:118`), `stepApart` (`:136`: the step cut at `min` from every solid guard, two passes, else no
  step). Allocation-free.
- `src/ai/doorGate.ts` (new, pure): `DOOR_GATE` (`:20`: r 0.32, half 0.05, pass 0.5, dy 1.2), `doorShut` (`:43`),
  `DoorGate.blocking` (`:75`: a step into, deeper into or across a shut leaf on his floor; typed arrays built once).
- `src/ai/enemy.ts`: `AiContext.doorStep?` (`:169`); `solid` (`:427`: alive, not taken); `move` steers with `steerFrom`
  (`:2884`) and cuts the step with `stepApart` (`:2914`, the velocity follows the cut); `tryMove` refuses a door-gated
  step and a step into a guard, the axis slides too (`:3011`).
- `src/ai/enemyManager.ts`: `doorGate` built on the first update with doors (`:2534`); `doorStep` in the context
  (`:531`): the gate; a shut, unlocked door is opened `Doors.open(d, 'enemy')` (`doorOpens`, `:384`) and the step waits.

Tests: `tests/guardSpacing.test.ts` (14): the spacing is 0.6-0.7 m; `keepApart` cuts at the circle, one already nearer
only moves apart; a head-on pair sidesteps to opposite sides; held, downed and upstairs guards push nobody; a step boxed
in by two guards ends clear of both; a pure walker pair head on, at right angles and overtaking at 1, 2.4 and 3.2 m/s
never nearer than 0.65 m and both arrive; on the real `Enemy.move` (motion driver, steering, cut step): head on and at
right angles at the patrol walk, the jog and a run, never nearer than `SEPARATION.min`, both get there (fails on the old
code: 0.03-0.37 m); a walker passes a standing pair keeping the spacing; a held and a downed guard and one upstairs do
not stop him. `tests/guardDoors.test.ts` (8): the gate's sizes match `DOOR.thickness` and the nav agent; shut while
closed, closing or opening under `pass`; a step at, into, deeper into or across a shut leaf is blocked, along / away /
through an open door / another floor is not; 20000 seeded random steps at a locked door never end in the leaf or cross
it; on the real `Enemy.move` through the manager's `doorStep` on a real nav grid: a shut door on his way is opened once
the enemy way and he is never inside its leaf while it is shut, then gets there (walk and run); a locked door: never in
its leaf or across it in 10 s, he waits at it, then once unlocked opens it and goes through (walk and run). The four
real-walker door tests fail on the old code. Also green: deviceTrip, bodySearch, urgency, breaker, posts, postsWiring,
pairs, pairsWiring, takedown, carry, hostageGait, nav, navClosure, doors, doorOpen, enemyManagerDespawn,
awarenessWiring, sectionAlert, camBodyWiring, incidents, sweep, alarmCall, gearWiring, hearing, perception,
radioWiring, responseWiring, s6CloseOn, sectorRestart, securityBodies, securityCamera, squadWiring, coopTorches,
ctcourseLight, difficulty, enemyLightsOut, cameraReach, sectorGuardTags, laserAlarm, jammer, sectorBoltPair,
sectorPairGate, campusRuntimeNav, benchmark, bunkerMap, campusS1-S3, sectorStageActions.

Assumptions: A114 (spacing numbers, who is solid), A115 (open the player's way and wait for the swing), A116 (a locked
door stops him; no per-door nav closure, and why), A117 (left as is).

E2e to run: `e2e-stealth-ai` (patrols, pairs, bodies, the door bash), `e2e-sectorops` (all parts: patrol legs, bolted
and keypad doors, posts, pair gates), `e2e-ctcourse` and `e2e-course` (course doors, airlocks, guards on the stations),
`e2e-ct-warehouse`, `e2e-stealth`, `e2e-tactics` (combat movement in groups), `e2e-takedown` (a held guard among
others), `e2e-coop` (host guards and the door sync). No e2e assert added (a crossing pair or a guard at a locked door
needs a staged scene; the unit tests run the real walker).
## S21 (G5) Weapon carry: calm guards walk holstered
Michael: "they also dont always have to be low-ready, then can walk around holstered if they are in a calm area."
Branch `feature/guard-ai-s21` off `feature/guard-ai-walk` d24453a7 (S20 runs beside it on `feature/guard-ai-walk`: the
`enemy.ts` edits here are kept to a field, the constructor's three lines, one line after `updateAwareness`, the `tryFire`
gate and the rig-pose block; no movement, nav or door code). Every guard stays armed (2026-10-23 ~01:25). A120-A126.

Cause: guards never set the rig's carry fields (`RigPose` armed / ready / swap), so every guard held his gun at low
ready all the time.

Built:
- `src/ai/carryState.ts` (new, pure): `GUARD_CARRY` (enabled, `calmHold` 15 s, draw rifle 0.7 / pistol 0.5 s, holster
  1.0 / 0.9 s, `never` sniper and enforcer); `calmArea` (`:46`, the rule, A120); `mayHolster` (`:51`, A121);
  `carrySlotOf` (`:57`: rifle `backC` across the back, pistol `thigh`, compact `sling`, A124); `carryRaise` (`:65`: no
  raise while holstered, A125); `GuardCarry` (`:70`): holstered / drawing / drawn / holstering, `step(dt, calm)` (the
  first step takes the start state with no clip; holsters only after the calm hold; a stir mid-holster draws straight
  back; the end of each travel shows for a step before the hand-over), `swapClip` (the swap clip time: holster 0 ..
  `DRAW_BEAT`, draw `DRAW_BEAT` .. 1), `seq` (phase changes for the render side). No allocation.
- `src/ai/enemyRig.ts` `GuardGunCarry` (`:39`): the gun follows the carry with the player's `WeaponModel` calls:
  `holster(rig, slot)` (re-parented to the torso / right hip; the pistol sets `thighGear`), `beginTravel` / `travel` (the
  trigger hand carries it along the travel path; the sling hands off with `inHand`), `hold` (the aim pocket). A travel
  cut by a takedown restarts from where the gun is. Render rate, before the rig animates.
- `src/ai/enemy.ts`: `carry` / `gunCarry` (`:201`, built in the constructor `:388`); `carryCalm` (`:1255`);
  `carry.step` after the awareness in `update` (`:1844`); `tryFire` waits for `carry.drawn` (`:2790`, A123); the rig-pose
  block in `frame` (`:3079`) sets `rp.ready`, `rp.swap` / `swapFrom` / `swapTo` and `rp.aim` (`carryRaise`) and applies
  `GuardGunCarry` (not while held in a takedown).
- `src/player/characterRig.ts`: `RigPose.ready?` (`:83`), read as `s.ready ?? (carrier && !heldWeapon)` (the player and
  remotes unchanged; A125).

Rig fields a guard drives (for Player Build / Test Runner): `RigPose.ready` (new, optional), `swap`, `swapFrom`,
`swapTo` (always the gun's one slot), `aim`; `armed` is left to the rig's default (`!!heldWeapon`), `thighGear` and
`weaponTravel` follow the `WeaponModel`.

Tests: `tests/carryState.test.ts` (17): the calm-area rule (each condition), who holsters across `enemies.json` and the
slots; holstered from the start with no clip, suspicious draws (the clip from the holstered beat, rising), combat raised
once drawn, rifle drawn within 0.7 s and pistol 0.5 s, an alarm or a high-security post keeps him drawn, the calm hold
(and a stir restarting it), a stir mid-holster draws back quicker than a full draw, calm mid-draw finishes the draw, a
never-holster kind always drawn, no allocation per step; on the real `Enemy` code: `carryCalm` for every condition and no
shot (no windup) until the draw ends, then a shot. `tests/guardGunCarry.test.ts` (2, NullEngine, the real guard rig): the
rifle on the torso (`backC`) holstered, the travel during the draw, held in the weapon pivot once drawn, back on the torso
after the calm hold; the pistol on the right hip with `thighGear`, drawn, a reversal mid-holster; the gun never moves more
than 12 cm in a frame (rifle worst 5.6 cm, pistol 10.4 cm: the raise to full aim after the hand-over). AI and rig test
set (70 files incl. readyHands / backDiagTravel / net; 1108 passed, 2 skipped as before) green.

Open items:
- Co-op (A126, **resolved** on `feature/guard-ai-a126`: the carry in `al` bits 7-8, `PuppetCarry`, BRIEF A136-A139): client puppets (`src/net/enemyPuppet.ts`) stay at low ready. The wire's alert level (`EnemyState.al`
  bits 0-1) cannot carry caution, a raised alarm, a post or a response team, so the client cannot derive the holster.
  It needs one bit on the wire (e.g. a carry bit in `al`, as `AL_TORCH`; a `PROTOCOL_VERSION` bump) with the puppet
  driving `GuardGunCarry` from it; not done here (no protocol change in this slice).
- A guard seized while holstered hides his gun as before (`beginTakedown`), so the slung rifle disappears while held;
  polish: keep a holstered gun shown.
- Visual (GPU lane, Test Runner): the guard's ready-hands carry and armed carriage with the gun slung (`guardRows`
  tables), the rifle across the back and the pistol on the thigh clear of the guard bodies (no clipping), and the draw /
  holster clip at the guard draw times.

E2e to run: `e2e-stealth-ai`, `e2e-sectorops` (all parts), `e2e-ctcourse`, `e2e-ct-warehouse`, `e2e-tactics`,
`e2e-stealth` (the fire gate on every combat path), `e2e-coop` (`src/net` imports `enemyRig.ts`; puppets unchanged); GPU
lane: a guard shot / contact sheet of a calm patrol (rifle slung, an officer's pistol on the thigh) and the draw.
