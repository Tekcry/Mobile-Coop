# Guard AI polish batch - plan (Opus planner, 2026-10-24)

Branch `feature/guard-ai-polish` (= master 92d0205d, 4.97.1). Why now: ROADMAP Decided 2026-10-24 ~21:50 lifted the
"no refining until playtest" rule. Sources: the polish / non-blocking lists in `docs/guard-ai/slices/*-CHECK*.md`,
`*RECHECK*.md`, `LR16-4-POLISH.md`, `S24-LEVELS-CHECK.md`, `S24-COOP-TRIAGE.md`, `S26-COOP-TRIAGE.md`, `S26-FIX.md`,
`S25B-FIX.md`. Every item below was checked against the code on 92d0205d (line numbers are from that tree).

Scope: `src/ai` plus the tests tied to it; one world file (`src/world/doors.ts`, C2). Out: `src/net` and the wire / save
shape (PR #317 feature/coop4 owns `src/net`), visual / GPU work, items that need Michael, legacy-only items.
The coop4 AI work (A170-A181) is already on master, so this plan's new A numbers are A165-A169, then A182.

## Builder rules (all groups)
- Each group owns its files. No two groups edit the same file, tests included. If your change breaks a test in a file
  you do not own, do not edit it: put the failing test and why in your report (the lead fixes it at the merge).
- Docs, the changelog fragment and `TESTING.md` belong to group C. A and B put the doc lines they need in their reports.
- Hot paths: no closures, iterators, temporary arrays or vectors; `hyp2` / `hyp3`; typed-array or module scratch.
- Every behaviour change has an undo switch (a const) named in its A entry.
- Checks: `npm run typecheck:fast`, eslint on the changed files, the vitest list for your group (end of this file).
  No e2e (the lead queues them on the laptop after the merge, see "e2e").

## Ranked list (player-visible impact first, then code health)

| Rank | Id | One line |
| --- | --- | --- |
| 1 | A2 | Cover pick sends a guard on a long detour to cover he can never fight from, or fails on a mate's cover and freezes |
| 2 | A1 | A device responder who hears a noise drops his search and then stands still |
| 3 | B1 | A circuit cut twice inside 60 s (or a failed reset walk) stays dark for good: nobody relights it |
| 4 | A5 | A guard in cover reads the player's real feet out of sight: arrives, pops up into an upright strafe, re-picks |
| 5 | A3 | Co-op: a slotless guard walks the freshest intruder's field to a player nobody told him about |
| 6 | A4 | Co-op: a guard hunting A who sees B switches silently; B's fight has no reporter and is never called in |
| 7 | B4 | The search plan hands out the same 12 points on every rebuild, and point 1 can re-look the LKP |
| 8 | B2 | One-mover rule counts any `seekCover` as a bound, so the open-wait pick lifts the hold (e2e flake) |
| 9 | B3 | A fighter who hears the other player restarts his 1.5 s throttle and goes deaf to his own target |
| 10 | A6 | Stale `advancing` after an open-wait pick: cover / chase churn every ~5.5 s, overwatch never suppresses |
| 11 | A7 | Suppress line verdict carried across episodes: up to 0.25 s of rounds into a wall |
| 12 | A8 | Suppress line test ignores props: rounds into crates |
| 13 | C1 | Calm guard with two players in view swaps target every think (looks back and forth) |
| 14 | A11 | Search points snap to the lowest storey (campus floors) |
| 15 | A12 | A heard spot consumes a ring index, or the LKP visit |
| 16 | A13 | A clamped plan point (hold room, high-security leash) is marked searched though nobody looked there |
| 17 | A9 | Co-op: first shots at a newly picked target use the old target's aim settle |
| 18 | A10 | Co-op: a dog in combat ignores a smelled partner and lets the fight cool |
| 19 | B5 | Co-op: two intruder groups can be handed the same free cover in one roles tick |
| 20 | B6 | A blinded calm guard still turns to and reports noises |
| 21 | B7 | Redundant `tell(alarmHunt)` after an alerted spawn binds a positionless slot |
| 22 | C2 | Opening a still-locked shut door leaves its nav closure shut for one update |
| 23 | B10 | Per-step `for...of` loops in `EnemyManager` (one O(N^2)) |
| 24 | A14 | `pickCover` allocates an object and an array per candidate |
| 25 | B8 | `consoleStep` casts the sight ray before the cheap busy check |
| 26 | B9 | `boardStep` scans for the console key on every send |
| 27 | A15, A16, C3 | Tests: real-Enemy onLevel re-call, exact R_NONE steps, ray-path miss with distance 0 |
| 28 | A17, C4 | Comments and docs |

## Group A - the guard brain (Opus, ~2 h)
Owns: `src/ai/enemy.ts`; tests `deviceTrip`, `twoIntruders`, `coopPerception`, `squadWiring`, new `guardPolishA`.
Do A1-A10 first; A11-A17 if time is left (each stands alone).

| Id | Source | Where now | Defect | Fix | Test | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | WALK-CHECK 2 | enemy.ts:1655-1666 `joinAsResponder`, :1898 `onLevel`; alertState.ts:186 | A device responder pulled into an investigation ends it in cooldown; `responder` stays true but his device search is gone and, with no patrol, he stands | Keep the device spot and room (`devX`, `devZ`, `devRoom`) in `joinAsResponder`; in `onLevel`, a responder going investigating -> cooldown / unaware goes back to `searchAt(dev, SEARCH_DEVICE)` with `searchRoom` restored | deviceTrip: responder hears a noise, investigates, is searching the device room again after the look | med |
| A2 | S24-COOP-TRIAGE open item, S26-COOP-TRIAGE, S27-CHECK-A 2, S27-CHECK-B 1 (part), 5, S16 check (fix 2 note) | enemy.ts:3296-3354 `pickCover`, :2846 `boundTo`, :2825-2835 open wait | Cover is scored by straight-line distance; a cover behind a full wall 3 m away wins over a 12 m walk; a cover a mate owns fails `reserveCover` and ends the pick for good (`openNoCover`); the open-wait pick can land on his own held role cover | Keep the best 3 candidates (fixed scratch); try them in order: skip one `reserveCover` refuses, A* it, reject a path longer than `COVER_DETOUR.k` x straight + `COVER_DETOUR.add` (1.5, 3 m) and try the next. `boundTo` with a detour path: `blockCover(idx)`, return false (roles re-pick next tick). The open wait clears `openNoCover` every `SQUAD.openWait` (one retry), and while `roleMoving` is false it skips `roleCover` (A167) | guardPolishA: wall-pocket cover rejected for the open one; mate-owned best gives the second; a failed wait retries after 3 s; squadWiring still green | med |
| A3 | S24-RECHECK-B 1 | enemy.ts:3240-3248 `chasePoint`; enemyManager.ts:2907-2911 `flowOf(-1)` = freshest | With `hunt` -1 in stealth he follows the freshest intruder's chase field, so in co-op he walks towards a player nobody told him of (G139) | In stealth with `hunt < 0`, path to his own `knownSpot` (A* `goTo`) instead of the field; switch `SLOTLESS_FIELD` (A165) | twoIntruders: a slotless guard in co-op heads for his own stimulus, not the partner's LKP; solo with a slot unchanged | med |
| A4 | S24-RECHECK-A 2, S24-RECHECK-B 2 | enemy.ts:1441-1447 `takeSighting` (`had < 0` only) | A guard hunting A who sees B switches with no call: B's fight gets no reporter and command never hears of B | When the sighting's slot differs from the one he had, call the contact once per slot per fight (`calledMask`, cleared with `hunt` at cooldown / unaware); switch `RECALL_SWITCH` (A166). He saw him, so G139 holds | twoIntruders: hunting A, sees B: one contact call naming B, `callers[B]` set, no second call on a later B sighting | med |
| A5 | S27-CHECK-B 4 | enemy.ts:3126-3140 (`t.feet`, `this.dist` in the inCover exits) | Out of sight, the "cover still protects" and "too close" tests read the player's real position: he arrives, pops to `attack` (upright strafe 2.6 s), re-picks | Out of sight in stealth, use `knownPt` for the protect vector and its distance for the too-close test | squadWiring: in cover, player moves out of sight behind him: stays in cover, no `attack` | med |
| A6 | S27-CHECK-A 3, S27-CHECK-B 3 | enemy.ts:2825-2834 | The open-wait pick clears `armourPick` but not `advancing` | `this.advancing = false` next to `coverPicked = true` | squadWiring: a role guard who advanced before, open-wait pick, holds in cover (no chase after 2.5 s) | low |
| A7 | S27-CHECK-A 4, S27-CHECK-B 2 | enemy.ts:2867-2881 `suppressLkp` | `suppressCheckT` keeps its value through a lapse: the next episode fires on the old verdict | Reset `suppressCheckT` to 0 when the last suppress call was more than one step ago or `suppressAim` moved > 0.5 m | squadWiring: blocked line after a lapse: no round before the first new check | low |
| A8 | S27-CHECK-B 8 | enemy.ts:2875 (`G.STATIC`) | Line test ignores `G.PROP`; `ENEMY_SHOT` hits props | Cast `G.STATIC \| G.PROP` | squadWiring: a prop on the line holds fire | low |
| A9 | S23-CHECK-A 3 | enemy.ts:2177-2178, :2318 | `losT` not reset when the target changes: the first shots at the new target use the old settle | In `perceive`, `losT = 0` when `best !== previous target` | coopPerception: B lost, A seen: `losT` starts at 0 | low |
| A10 | S23-CHECK-B 3 | enemy.ts:2298, :2315 | A dog in combat picks only by `los`; a smelled partner is ignored, the fight cools | For a dog pass a seen array = `P_LOS \| P_SMELL` (module scratch) to `pickTarget` | coopPerception: dog fights A, A gone, B smelled: target B | low |
| A11 | S26-CHECK-B 9, S25B-CHECK-B P4 | enemy.ts:1096-1117 `hearSearch`, :2602-2606 search snap | `nearestWalkable` with no `y` picks the lowest storey; `nav.center(c)` allocates an array per point | Snap with `y`: the hunt position's `y` for search points, the guard's own `y` in `hearSearch`; inline the cell centre (as `hearSearch` does) | guardPolishA: two-storey nav, a point over the upper floor snaps to it | low |
| A12 | S26-CHECK-B 8 | enemy.ts:2627-2630 (+ `hearSearch`) | A heard spot's look ends with `searchK++`: the next ring index is skipped, or at `searchK` 0 the LKP visit is replaced | Mark a heard spot (`heardSpot` flag); its look end does not advance `searchK` | guardPolishA: heard spot at `searchK` 0, the next point is still the LKP | low |
| A13 | S25B-CHECK-A 5, S25B-CHECK-B 7 | enemy.ts:2609-2615 clamps, :2628 `planOver(true)` | A plan point moved by a hold-room or high-security clamp is finished as searched | A high-security post never asks `searchPoint`; a clamped plan point finishes with `reached` false | guardPolishA: high-security searcher gets the ring; a hold-clamped plan point stays open | low |
| A14 | S27-CHECK-B 10 | enemy.ts:3322 | `coverQuality({...}, [{...}])` builds an object and an array per candidate | Module scratch object and a one-element array reused | guardPolishA with `tests/helpers/allocPerCall.ts`: `pickCover` loop allocates nothing per candidate | low |
| A15 | S24-LEVELS-CHECK 3, S24-RECHECK-A 5 | tests only | The (i)/(i2) `alert` stand-in skips the real `onLevel` branch; the `onLevel` re-call path has no unit test | Real `Enemy.alert()` on a told calm guard: hunts the slot, his contact names it; re-call on the -1 -> slot step | twoIntruders | low |
| A16 | S27-CHECK-A 6 | tests only | Test (e) R_NONE is loose | Assert the exact S8 chase goal, `wantCrouch` false, no `reserveCover` from the open wait | squadWiring | low |
| A17 | S25B-CHECK-A 9 | enemy.ts `AiContext.searchDone` doc | Comment does not say the manager ignores `reached` | One comment line | none | low |

## Group B - the manager (Opus, ~2 h)
Owns: `src/ai/enemyManager.ts`, `src/ai/squadRoles.ts`, `src/ai/searchArea.ts`, `src/ai/breaker.ts`; tests
`combatHearing`, `breaker`, `guardRelight`, `consoleFault`, `searchAreaWiring`, `searchArea`, `squadRoles`, new
`guardPolishB`. Do B1-B5 first.

| Id | Source | Where now | Defect | Fix | Test | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | LR16-4-POLISH 1 | enemyManager.ts:1166-1181 `circuitOut`, :2306 `markKey`; breaker.ts:120-130 `DarkList` | A second cut inside `BREAKER.repeatT` gets the S2 check, the circuit is marked known and nobody relights it; a reset walk that ends without the flip (KO, alarm, 30 s give-up) also leaves it dark for good | As consoles (`consoleFault.ts:180` `notice`): the same cut noticed again after its tamper check is a fault (the reset walk). When a circuit's incident is gone, nobody walks it (`breakerGroup`) and it is still off, unmark it in `DarkList` after a hold (`BREAKER_WALK.retry` 20 s, breaker.ts:25) so late discovery finds it again (A168) | breaker / guardRelight: two cuts in 60 s -> check, then a walker relights; walker KO'd mid-walk -> another guard relights after the hold | med |
| B2 | S27-CHECK-A 1, S27-CHECK-B 1 | enemyManager.ts:3241-3248 `ptGoing` / `flGoing` | `state === 'seekCover'` counts any trip, so a held point's open-wait pick lifts the flank's hold (and the e2e `movers <= 1` can flake) | Going = `seekCover` and `coverIdx === out.cover[k]` (a trip to his role cover); no new state | guardPolishB: point open-waits to a non-role cover, flank stays held | low |
| B3 | S26-CHECK-A notes 1-2 and 5, S26-CHECK-B 3 | enemyManager.ts:2770-2786 `hearFight` | `heardInFight()` runs before the slot is known: hearing B while hunting a fresh A restarts the throttle and he is deaf to A 1.5 s; a searcher switched to B by `tell` keeps an old `pendingHunt` A | Call `heardInFight()` only when the noise is his hunt's or he took the slot; switch a searcher with `retell(slot)` | combatHearing: B's step while hunting fresh A: `heardT` unchanged, A's next step heard; searcher's `pendingHunt` is B | low |
| B4 | S25B-CHECK-B P2, P6; S25B-FIX "polish left" | enemyManager.ts:3042-3127 `buildPlan`; searchArea.ts:106 `offer` | A rebuild at R's cap re-offers the same candidates and re-marks the same top 12 done, so a search gets 12 points then the ring; a dark cell at the LKP becomes point 1 (re-look of point 0) | `SearchPlan` keeps its searched points (fixed arrays, cleared on a moved centre or a full reset); `buildPlan` skips candidates within `spacing` of a searched point or of the centre before `offer`; drop the post-offer re-mark loop and its scratch | searchAreaWiring: a rebuild after 12 done gives 12 new points; no point within `spacing` of the LKP | med |
| B5 | S24-RECHECK-A 5, S24-RECHECK-B 5 | squadRoles.ts:455 (`takenN = 0` per call); enemyManager.ts:3140-3190 `rolesStep`, :3233-3240 | Covers are reserved only at `boundTo`: two intruder groups in one roles tick can be given the same free cover | squadRoles: a `takenBase` reset once per roles tick (`rolesTickStart`), `assignRoles` starts from it, `rolesCommit()` after a group's final assign; `rolesStep` / `rolesFor` call them | squadRoles: two groups, one free cover in range: only the first gets it | low |
| B6 | S26-RECHECK 2 | enemyManager.ts:2713-2724 `hear` | The blind gate sits in `hearFight` only: a blinded calm guard still `hearTurn`s and reports | `if (e.blindT > 0) continue;` at the top of the loop, as `:789` / `:2397` | combatHearing: blinded calm guard: no turn, no board report | low |
| B7 | S24-LEVELS-CHECK 1, 2 | enemyManager.ts:887, :1084 (`e.tell(this.alarmHunt)`), :1805-1816 `sendIn` / `commandHunt` | After `spawn(.., true)` (`sendIn`) the extra `tell` only binds a positionless alarm slot when nothing is valid | Drop both `tell` calls (A182); note on `sendIn` that the freshest fallback is for the parked modes only | guardPolishB: parked reinforce with no valid slot: `hunt` -1, binds on the next call | low |
| B8 | S22-CHECK 1, S22-GAME-CHECK 6 | enemyManager.ts:1360 `consoleStep` | `seesConsole` (a ray) runs before `consoleBusy` | Busy once per console per step (it does not depend on the guard), checked before the ray | consoleFault: still green; ray count with a busy console 0 | low |
| B9 | S22-CHECK 4 | enemyManager.ts:2305-2309 `boardStep` | `con` (a `keyOf` scan) is computed for every send | Compute it inside the light / breaker branches only | covered by consoleFault / breaker | low |
| B10 | conventions.md "Hot paths" | enemyManager.ts:2804, :2810, :3350, :3484, :3505, :3524-3527 (O(N^2) `updateBuffs`), :3611-3613 | `for...of` over arrays in per-step / per-frame loops | Index `for` loops; leave load-time and event-rate loops | existing list | low |

## Group C - pure modules, world door, docs (Opus or Sonnet, ~1 h)
Owns: `src/ai/targetPick.ts`, `src/world/doors.ts`, tests `targetPick`, `lockedDoorPath`, `perception`;
`docs/systems/ai.md`, `docs/guard-ai/BRIEF.md` (A entries), `changes/feature-guard-ai-polish.md`, `TESTING.md`.

| Id | Source | Where now | Defect | Fix | Test | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | S23-CHECK-B 2 | targetPick.ts:54-63 (calm branch ignores `cur`) | Two players in view at near-equal rates: the calm target swaps every think | Calm: keep `cur` (alive, rate > 0) unless another's rate exceeds it by `CALM_KEEP` 1.25 (a separate const, so `TARGETS`' shape and its test stay) (A169) | targetPick: rates 1.0 / 1.1 keep `cur`; 1.0 / 1.3 switch; solo unchanged | low |
| C2 | S28-RECHECK N1 | doors.ts:293 | `setOpen` fires `onLocked` only on a shut; opening a still-locked door opens its closure one update late | Fire `onLocked` on both directions while `anchor.locked` (no in-game caller today) | lockedDoorPath: locked shut door opened by force: walkable with no update between | low |
| C3 | R1-CHECK P4 | tests/perception.test.ts:438 | The ray-only double's miss returns `distance: len`, so the `!hit` branch is not proven to ignore distance | Add a miss case with `distance: 0` | perception | low |
| C4 | LR16-4-POLISH 6, S27-CHECK-A 7, S27-CHECK-B 11, plus A / B reports | docs/systems/ai.md:228, :233 | Timed cut sends 1-2 guards with a ring check (deliberate, the lure) is not said; "one think" is the second think; `suppressHeld` counts steps | Fix the wording; add the lines A and B report; A165-A169 and A182 in BRIEF.md; one changelog fragment; TESTING.md lines for A1, A2, A3 / A4 (co-op), B1 | none | low |

## Vitest per group
CORE (every test importing `enemy.ts`, `enemyManager.ts` or their direct importers; 82 files):
```
tests/alarmCall.test.ts tests/animN4dKill.test.ts tests/awarenessWiring.test.ts tests/bodyPos.test.ts tests/bodySearch.test.ts tests/breaker.test.ts tests/camBodyWiring.test.ts tests/cameraCue.test.ts tests/campusS2Board.test.ts tests/carryState.test.ts tests/combatHearing.test.ts tests/consoleFault.test.ts tests/consoleNoticeA4.test.ts tests/coopGuardAi.test.ts tests/coopPerception.test.ts tests/coopRejoin.test.ts tests/coopTorches.test.ts tests/coopWalkFixes.test.ts tests/courseConsole.test.ts tests/ctcourse/a7DataHall.test.ts tests/ctcourse/a8Strongroom.test.ts tests/deviceTrip.test.ts tests/economy.test.ts tests/enemyLightsOut.test.ts tests/enemyManagerDespawn.test.ts tests/flagLamp.test.ts tests/fourIntruders.test.ts tests/gearWiring.test.ts tests/guardBody.test.ts tests/guardDoors.test.ts tests/guardGunCarry.test.ts tests/guardLook.test.ts tests/guardRelight.test.ts tests/guardSpacing.test.ts tests/hangDown.test.ts tests/hangDownTakedown.test.ts tests/hearing.test.ts tests/incidents.test.ts tests/intel.test.ts tests/intelPartB.test.ts tests/intruders.test.ts tests/laserAlarm.test.ts tests/laserPanels.test.ts tests/lockedDoorPath.test.ts tests/loneGuardEngage.test.ts tests/marlowN2Isolator.test.ts tests/marlowN4Hold.test.ts tests/marlowN6Scanners.test.ts tests/marlowPassAny.test.ts tests/marlowWalkS10.test.ts tests/net.test.ts tests/pairsWiring.test.ts tests/perceive4.test.ts tests/playerSlots.test.ts tests/polishBatch.test.ts tests/poseParity.test.ts tests/postsWiring.test.ts tests/progression.test.ts tests/radioWiring.test.ts tests/remoteKneelTense.test.ts tests/responseWiring.test.ts tests/searchAreaWiring.test.ts tests/sectionAlert.test.ts tests/sectorBoltPair.test.ts tests/sectorDesk.test.ts tests/sectorGuardFreezeAtlas.test.ts tests/sectorGuardFreezeLamp.test.ts tests/sectorGuardFreezeSeeThrough.test.ts tests/sectorGuardFreezeView.test.ts tests/sectorGuardTags.test.ts tests/sectorKeypad.test.ts tests/sectorPairGate.test.ts tests/sectorRestart.test.ts tests/securityBodies.test.ts tests/securityCamera.test.ts tests/securityCameraE8.test.ts tests/squadWiring.test.ts tests/strikePops.test.ts tests/torchOcclusion.test.ts tests/trainingCamera.test.ts tests/twoIntruders.test.ts tests/urgency.test.ts
```
- A: CORE + `tests/guardPolishA.test.ts tests/squadRoles.test.ts tests/s6CloseOn.test.ts tests/armourFireWiring.test.ts`.
- B: CORE + `tests/guardPolishB.test.ts tests/squadRoles.test.ts tests/s6CloseOn.test.ts tests/searchArea.test.ts`.
- C: CORE (targetPick is imported by `enemy.ts` / `enemyManager.ts` / `intruders.ts`) + `tests/targetPick.test.ts
  tests/radioNet.test.ts tests/perception.test.ts tests/doors.test.ts tests/ctcourse/a5Substation.test.ts
  tests/ctcourse/a7LockedCage.test.ts tests/marlowN9SlideDoor.test.ts tests/sectorStageActions.test.ts`.
- Run in chunks of ~20 files (`npx vitest run --maxWorkers=2 <files>`), per the CPU rule.

## e2e (the lead, after A + B + C merge; one laptop request)
`e2e-stealth-ai` (squad roles S27 `movers <= 1`, search area, lkp), `e2e-sectorops` (S6 close-on, S13, nav reads),
`e2e-coop` (S24 two intruders, S26), `e2e-ctcourse` (consoles A4 / A8, Marlow guards), `e2e-enemies` and
`e2e-tactics` (`pickCover` runs in every mode), `e2e-ct-warehouse`. All `E2E_GPU=1`.

## Assumed decisions (BRIEF.md, written by group C)
- **A165** (A3) A guard with no intruder in stealth paths to his own known spot, not along the freshest intruder's
  field. Undo: `SLOTLESS_FIELD = true` in enemy.ts.
- **A166** (A4) A guard who sees a second intruder calls him in once per fight (G139 holds: he saw him). Undo:
  `RECALL_SWITCH = false`.
- **A167** (A2) Cover is rejected when the walk there is longer than 1.5 x the straight line + 3 m; up to 3 candidates
  are tried; the open wait retries once per `openWait`. Undo: `COVER_DETOUR.k = Infinity`, `COVER_TRIES = 1`.
- **A168** (B1) A cut circuit nobody fixed is noticed again after `BREAKER_WALK.retry` 20 s; the same cut seen again after
  its tamper check gets the reset walk. Undo: `BREAKER_WALK.retry = Infinity`.
- **A169** (C1) A calm guard keeps his target until another player's sight rate beats it by 25%. Undo: `CALM_KEEP = 1`.
- **A182** (B7) The redundant `tell(alarmHunt)` after an alerted spawn is gone: with nothing valid he binds on the next
  call or sighting, not to a positionless slot. Undo: restore the two calls (enemyManager.ts:887, :1084).
(A170-A181 are coop4's, already on master.)

## Deferred (present, not in this batch)
- S16 1 (fire-gate cache keyed by cells only; A81 accepts it), S16 5 (debug counters count chase probes), S16 6 and the
  S16 fix-2 note (role / cover picks do not test the armour line or keep a sight line to the hall): new cover logic.
- S23-CHECK-B 1: instant detect and the `spotted` mark only for the picked player (< 0.4 s difference).
- S24 carried: `mirror()` with no freshest keeps `sightT` (no reader affected).
- S25B-CHECK-B P5 (every searcher looks at the LKP first; needs an `AiContext` hook across A and B files), P9 (per-point
  claimant ref; not a hot path).
- S26-CHECK-B 7: bark stacking ("I heard something." from several searchers at once); needs a manager-level gate
  across A and B files. S26-CHECK-A: the `combatHearAct` table test mirrors the rule.
- S26-CHECK-B 9 remainder: pass the noise's `y` to `hearSearch` (needs the manager call; A11 uses the guard's `y`).
- S27-CHECK-B 7: high-cover overwatch never suppresses (new behaviour, a tactics slice).
- S28-CHECK-B F2: path to the near side of a locked door instead of standing (new behaviour).
- R1-CHECK P3: no unit test of the drone's sight verdict (e2e covers it).
- LR16-4-POLISH 4: multi-circuit board reports one circuit, per-circuit tamper clock (spans `stealthSystems.ts`).

## Excluded
- Michael's decisions or feel: A148 reinforcements stand at spawn (S24-LEVELS 4); S23 arcs / LKP ghost (S23-CHECK-A 1,
  S23-CHECK-B 4, 5, S26-CHECK-A / B 5 ghost on a heard move, the ghost's `slotFor` in gameState); S25 searchers' flares;
  S16 4 (`retry` tuning), S25B-CHECK-A 2 (rebuild by age), S26-CHECK-A (heard noise does not extend the clock), S27-CHECK-A
  5 / S27-CHECK-B 6 (low-cover overwatch suppresses only while peeking), S22-GAME-CHECK 4, S22-GAME-CHECK2 5 (A134
  feel), S26-CHECK-A 3 / S26-CHECK-B 4 (calm body search locates: the lead's accepted deviation).
- By design: S22-CHECK 3 (same-room console shortcut matches the light rule), S24-RECHECK-A 3 (no own bark line), 4 (far
  joiners stay slotless if the re-caller is cut, consistent with M5), S24-RECHECK-B 3 (a call naming B binds a slotless
  guard), S25B-RECHECK P1 ("no change needed").
- `src/net` / wire: A126-CHECK 1-3, COOP-CARRY-MERGE-CHECK-A all, COOP-CARRY-MERGE-CHECK-B 1-3, S26-CHECK-A client step
  surface / suit, S26-RECHECK 1, 4, S26-FIX "not done", the `coopHost` part of S26-CHECK-B 6.
- Visual / GPU: WALK-CHECK 5 (holstered gun hidden while seized), 6 (squeeze), S16 2 (sparks past the player),
  CARRY-FIX2-CHECK 1-6, BODY-WATCHDOG-CHECK (pin strings, Epic compile time).
- Outside `src/ai` and not guard logic: S22-GAME-CHECK 1-3, 5, 7; S22-GAME-CHECK2 1-4, 6-8 (course mode, A4 / A8 e2e,
  console text); LR16-4-POLISH 2, 3, 5, 7 (`stealthSystems` boards, no map data); S27-CHECK-B 9 (course mode alarm
  stage, `courseMode.ts`); S26-CHECK-B 6 (`strikeController`, `stealthSystems` noises with no maker); SNIPER-CHECK notes
  and SNIPER-TRIAGE open items; S24-RECHECK-B 7 (e2e-coop setup, coop4's suite now).

## Dropped: fixed or obsolete (28 items)
| Item | Evidence |
| --- | --- |
| WALK-CHECK 1 (A105, reinforcement goes for the feet) | `knownSpot` never returns feet (enemy.ts:1428-1435, `INTRUDERS.noFeet` A148) |
| WALK-CHECK 3 (locked-door nav closure) | S28 `LockedDoorNav` (src/ai/lockedDoors.ts; doorGate.ts:15) |
| WALK-CHECK 4 (alarm stage in the calm area) | S27 A164 `carryCalm` (enemy.ts:1555-1558) |
| WALK-CHECK 5 part 1 (client low ready) | A126 carry bit (`src/net/puppetCarry.ts`) |
| S22-CHECK 2, 5 (no host) | game wiring landed (S22-GAME checks, `courseMode` `consoleHost`) |
| S23-CHECK-A 2 (docs missing) | `slices/S23.md`, coop.md:216, TESTING.md:98 |
| S23-CHECK-A 4 (Float64 wording) | S24 brief done |
| S23-CHECK-A 5 (`TARGETS` mutation) | coopPerception restores it in `afterEach` |
| S24-RECHECK-A 1 (`contactHunt` never expires) | S25b fix, enemyManager.ts:790-791 |
| S24-RECHECK-B 4 (slot ids never freed) | coop4 A171, intruders.ts:18 `reuse` |
| S24-RECHECK-B 6 (test-only `em.lkp` write) | no game path |
| S25B-CHECK-A 1, 3, 4, 6, 7 / S25B-CHECK-B B1, P3 (radius), P8 | S25B-FIX: enemyManager.ts:2996 centre check, :3027 crew release, `queryNearest`, plans from `MAX_INTRUDERS`; S26 A157 `areaRadius(locT)` |
| S25B-CHECK-A 8 (doc: re-marked done) | superseded by B4 |
| S26-CHECK-B 1, 2 | S26-FIX: hearFight blind gate enemyManager.ts:2756; `clientStepNoise` |
| S28-CHECK-A F1 / S28-CHECK-B F1 | S28 fix round, e2e reads unlock / relock |
| S28-CHECK-A F2 / S28-CHECK-B F4 (`routeMiss`) | enemy.ts:2463, :2470 (0.5 m, cleared on a clear line) |
| S28-CHECK-A F3 (lock then shut lag) | doors.ts:293 fires on the shut |
| S28-CHECK-B F4 docs, S28-RECHECK N2 | doorGate.ts:15, BRIEF.md:486 |
| R1-CHECK P1 (`res.reset` allocates) | ballistics.ts:77-88, no reset |
| R1-CHECK P2 (comment / ai.md wording) | perception.ts:79-82, ai.md:36 |
| S24-LEVELS-CHECK 4 (changelog line) | S24 released |
