# Guard AI polish batch 2 - plan (Opus planner, 2026-10-25)

Sources: `POLISH-PLAN.md` "Deferred (present, not in this batch)" and, at the lead's request, the non-blocking list of
`slices/POLISH-CHECK-A.md` (items 1-6). Every item was checked against the code on `feature/guard-ai-polish` head
4c872c66 plus the uncommitted B2 fix in the worktree (`onRoleBound`). Line numbers are from that tree and will move when
the B2 fix lands: find each spot by the name given. Branch for the build: the lead's choice (this branch after #363,
or `feature/guard-ai-polish2` off master).

Scope: `src/ai` plus the tests tied to it. Out, as in batch 1: `src/net` and the wire / save shape, visual / GPU work,
Michael's calls, code outside `src/ai`. Host only: no protocol or save change. New A numbers: A184-A194.

Kept 11 behaviour items + 1 test item; 12 not kept (fixed, no reader, accepted, outside `src/ai`, or a slice of its own).

## Builder rules (both groups)
- Each group owns its files. No two groups edit the same file, tests included. If your change breaks a test in a file
  you do not own, do not edit it: put the failing test and why in your report (the lead fixes it at the merge).
- Docs, the changelog fragment and `TESTING.md` belong to group B. Group A puts the doc lines it needs in its report.
- Hot paths: no closures, iterators, temporary arrays or vectors; `hyp2` / `hyp3`; typed-array or module scratch.
- Every behaviour change has an undo switch (a const) named in its A entry.
- Checks: `npm run typecheck:fast`, eslint on the changed files, the vitest list for your group (end of this file).
  No e2e (the lead queues them on the laptop after the merge).

Why two groups and not three: every behaviour item touches `src/ai/enemy.ts` (P5 and the noise `y` also need the
manager), so a split of the brain would put one file in two groups. Group A takes all behaviour; group B takes the
test-only item and the docs.

## Ranked list (player-visible impact first, then code health)

| Rank | Id | One line |
| --- | --- | --- |
| 1 | A184 | A guard sent to a noise behind a locked door stands where he is (up to 20 s), not at the door's near side |
| 2 | A185 | Several searchers hearing one step all bark "I heard something." in the same frame |
| 3 | A186 | A high-cover overwatch hardly ever suppresses while a mate bounds (his muzzle is behind his wall) |
| 4 | A187 | Co-op: a guard who goes alert on a call about A while he sees B hunts B with no call (no reporter for B) |
| 5 | A188 | Every searcher of one plan walks to the LKP and looks 3 s before taking plan points (~10 s on one spot) |
| 6 | A189 | A167's detour test can block a flank walk (a flank bends round the player's cover by design) |
| 7 | A190 | Instant detect only for the picked player: a partner lit 1.5 m in front fills the meter at a far player's rate |
| 8 | A191 | A device responder says "Clear." / "Standing down." and goes straight back to searching (A1) |
| 9 | A192 | An armour pick spends its 6 fire-line casts on any top-3 entrant, not on the best candidates (A2) |
| 10 | A193 | A heard spot snaps to the searcher's storey, not the noise's |
| 11 | A194 | In cover with no hunt position, sighting or stimulus, his known spot is his own position: he leaves cover |
| 12 | T1 | Test: the recon drone's sight verdict has no unit test |

## Group A - the brain (Opus, ~3 h)
Owns: `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/ai/searchArea.ts`, `src/ai/navGrid.ts`; tests new
`guardPolish2`, and `squadWiring`, `combatHearing`, `searchAreaWiring`, `searchArea`, `twoIntruders`, `coopPerception`,
`lockedDoorPath`, `nav`, `deviceTrip`, `guardPolishA`, `armourFireWiring` (edit only where an assert must change).
Do A184-A188 first; A189-A194 if time is left (each stands alone).

| Id | Source | Where now | Defect | Fix | Test | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| A184 | S28-CHECK-B F2 | navGrid.ts:591 `findPath` (null when not `found`); enemy.ts:2556 `goTo` (`routePath` [] on a miss, returns null), :2748 the calm `goTo(this.spot, dt)` | A goal behind a locked shut door (S28 closure) with no way round has no path: an investigating guard stands where he heard it until `ALERT.investigateMax` 20 s (a fresh noise keeps him there). S28.md promised "goes round to the nearest reachable point" | `findPath(.., partial = false)`: with `partial` and no path, end at the expanded cell with the lowest octile to the goal (track it in the loop, no allocation beyond today's path build); that cell is the start: null. `goTo(.., partial)`; the investigating branch passes `NEAR_SIDE` (searching keeps its skip, patrol and chase unchanged). At the partial end (no path from there) he counts as arrived (`spotArrived`, face the spot), so `investigateLook` ends it as at a reached spot. The 1 s miss retry (`routeT`) is today's | lockedDoorPath: noise inside a locked room, guard outside: walks to within ~1.5 m of the closure's near side, the investigation ends by `investigateLook`, not `investigateMax`; nav: `findPath` partial gives the near side, default still null | med |
| A185 | S26-CHECK-B 7 | enemy.ts:1155 `hearSearch` (bark per guard, `COMBAT_HEAR.bark` throttle); enemyManager.ts:2812 `hear` -> :2874 `e.hearSearch` per searcher | One step heard by three searchers gives three overhead lines and three voice lines in one frame (`hud/barks.ts` shows one per speaker) | `hearSearch(x, y, z, mayBark): boolean` (barked); the manager's `hear` keeps a `hearBarked` field reset at its top and passes `!hearBarked`, so one line per noise (the first searcher in reach; his own throttle still applies). Undo `POLISH2.oneHeardBark = false` (enemyManager.ts) | combatHearing: three searchers hear one step: one `investigate` bark, all three walk to it; off: three | low |
| A186 | S27-CHECK-B 7 | enemy.ts:3291 `suppressLkp` in `inCover`, :3306 the 4.2 s hide / peek cycle (`peeking = cycle > 2.4`), the edge step under `!cp.low && peeking` | Overwatch suppression casts from `this.pos`. In high cover that is behind his own wall, so the line is blocked except in the 1.8 s peek phase, and only once he has walked to the edge (up to ~3.5 m). While a mate bounds he rarely fires at all. Low cover is not this item (S27-CHECK-B 6 stays Michael's) | High cover, role overwatch, `mateMoving`, out of sight, profile `suppress`: he holds the peek position (the existing edge / side-step point) for as long as the mate moves, so `suppressLkp` casts from the edge. The `tryFire` aim, the peek count and low cover are unchanged. Undo `OW_HIGH_PEEK = false` | guardPolish2: high-cover overwatch, mate moving, LKP clear past the edge only: at the edge in the hide phase and `suppressRounds` > 0; off: 0 in the hide phase. squadWiring stays green | med |
| A187 | POLISH-CHECK-A 1 | enemy.ts:2020 `onLevel('alert')` `takeSighting(target, called && hunt < 0 && pendingHunt < 0)`, :2024 `calledMask` from `hunt` | Told of A (`pendingHunt` A), he goes alert in a step where he sees B. `takeSighting(B, recall false)` makes him hunt B with no call. Then `calledMask` marks B as called though nobody called B in. B's fight has no reporter from him, and A166's later recall never fires for B | Keep `told = pendingHunt` before the sighting. Mark `told` in `calledMask`, and `hunt` only when not told or `hunt === told`. With `alertIn.called && netOn && told >= 0 && hunt >= 0 && hunt !== told`, call `callContact()` once. Undo `ALERT_RECALL = false` | twoIntruders: told of A, sees B at the alert: `hunt` B, one contact call naming B, `callers[B]` set, `calledMask` has A and B | low |
| A188 | S25B-CHECK-B P5 | enemy.ts:2699 (`searchK === 0`: the spot is the hunt position for every searcher); searchArea.ts:98 `SearchPlan`; enemyManager.ts:3101 `searchPointFor`, :3132 `planSweep` | Each searcher of a combat search first walks to the LKP and looks 3 s. Three searchers spend about 10 s on one spot before the plan spreads them | `SearchPlan.lkpBy` (guard num, -1; cleared in `reset`). New `AiContext.searchLkp?(e): boolean`: true when nobody holds it (he takes it) or he holds it. At `searchK === 0` in a combat plan search (same gate as `searchPoint`: `combatSearch`, `!searchOwn`, `hunt >= 0`, not high-security), false sets `searchK = 1` and the same pick goes on to the plan / ring. `planSweep` frees `lkpBy` with its claim rule. Off, the parked modes, a lone searcher: unchanged. Undo `POLISH2.lkpOnce = false` | searchAreaWiring: three searchers of one plan: one goes to the LKP, two take plan points at once; a moved centre clears `lkpBy`; lone searcher unchanged | med |
| A189 | POLISH-CHECK-A 3 | enemy.ts:2978 `boundTo` (`detour` with `COVER_DETOUR` 1.5 x + 3 m, enemy.ts:261) | A flank walk bends round the player's cover on purpose. A flank through a doorway can pass 1.5 x + 3 m, so the flanker's cover is blocked `TACTICS.blockS` and the flank does not start (not seen yet; watch e2e-stealth-ai S27) | `COVER_DETOUR.flankK` 2.5: `boundTo` for `R_FLANK` tests `flankK`, not `k`; point bounds, `pickCover` and open waits unchanged. Undo `flankK = 1.5` | guardPolish2: flank cover with a path 2 x straight + 3: bound starts; same path as a point: rejected | low |
| A190 | S23-CHECK-B 1 (part 1) | enemy.ts:2455 `instantDetect(si)` on the picked player only; pick at :2415-2417 (A169 `CALM_KEEP` keeps `cur`) | A calm guard watching far A (high rate) does not instantly detect B, lit in focus 1.6 m in front: he fills at A's rate (< 0.4 s at `maxRate`) and looks at A. A169 makes him keep A even more | In the per-player loop, a calm, non-passive guard notes the nearest player for whom `instantDetect(P_SIGHT)` holds; if any, he is the pick (over `pickTarget` and `CALM_KEEP`), so the tail's `instantDetect` sets the meter for him. Combat unchanged. Undo `INSTANT_ANY = false` | coopPerception: calm, A far at a high rate, B lit 1.5 m in focus: target B, meter 1 this think; off: A | low |
| A191 | POLISH-CHECK-A 5 | enemy.ts:1993 (`cooldown` bark `standDown` / `clear`), :2082 the A1 resume | A responder whose investigation ends calm says "Clear." (or "Standing down.") and in the same step goes back to the device search | Work out the resume before the bark lines; while resuming, skip the `clear` / `standDown` bark (the task's `standDown` radio call stays: that investigation is over). Undo `RESUME_QUIET = false` | deviceTrip or guardPolish2: responder's investigation ends: no `clear` / `standDown` bark, searching the device room | low |
| A192 | POLISH-CHECK-A 4 | enemy.ts:3499-3503 (armour cast inside the score loop for any top-3 entrant), :3523 try loop | With `armourPick` every candidate entering the top 3 costs a cast, in cover-index order. On a dense cover set the 6 casts go before the better candidates are scored, and those are skipped (`continue`) | With `armourPick`, keep the best `ARMOUR_FIRE.coverCasts` (6, `CV_IDX` holds 8) uncast. In the try loop, cast each before `reserveCover`, best first: at most `coverCasts` casts and at most `COVER_TRIES` A*. Without armour: unchanged. Undo `ARMOUR_CAST_LATE = false` | armourFireWiring / guardPolish2: 10 candidates, the 7 nearest by index armoured, the best-scored clear: picked with <= 6 casts | low |
| A193 | S26-CHECK-B 9 remainder | enemy.ts:1162 (`snapSpot(this.pos.y)` in `hearSearch`), enemyManager.ts:2874 (passes x, z) | A noise on another storey in `hyp3` reach snaps to the searcher's own storey (A11 used his `y`), so he searches the floor below / above the step | `hearSearch` takes the noise `y` (with A185's signature) and snaps with it; NaN: his own. The manager passes `pos.y`. Undo `HEAR_STOREY = false` (his own `y`) | guardPolish2: two-storey nav, a step on the upper floor heard from below: spot on the upper storey | low |
| A194 | POLISH-CHECK-A 2 | enemy.ts:1507 `knownSpot` (falls back to `this.pos`), :3265 `blindCover`, :3280 the too-close exit | With no hunt position, no sighting and no stimulus, the known spot is his own position: `near` 0, so he leaves cover to `attack`. Not reachable today: roles need `hunt >= 0` (enemyManager.ts:3310) and a lone guard reaches cover only from a sighting. Hardening | `blindCover` only when `huntPos() !== null \|\| sawOnce \|\| hasStimulus`; else today's feet rule. Undo `KNOWN_NEEDS_SPOT = false` | guardPolish2: in cover, out of sight, no spot of any kind: stays in cover (no `attack`) | low |

## Group B - drone test and docs (Sonnet, ~1 h)
Owns: new `tests/reconDroneSight.test.ts`; `docs/systems/ai.md`, `docs/guard-ai/BRIEF.md` (A entries),
the batch's changelog fragment (`changes/<branch-with-dashes>.md`: a new file if the branch is new, else add to
`changes/feature-guard-ai-polish.md`), `TESTING.md`.

| Id | Source | Where now | Defect | Fix | Test | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | R1-CHECK P3 | reconDrone.ts:180 (`hitDistance(eye, to, MASK.SIGHT) > Vector3.Distance(eye, to) - 0.3`) | The drone's sight verdict has no unit test (only e2e). No test file imports `reconDrone.ts` except `enemyManagerDespawn` | New test with a NullEngine scene (as `enemyManagerDespawn`) and a stand-in `Ballistics.hitDistance`: a hit 0.2 m short of the aim point sees, 0.5 m short does not, a miss (distance = length) sees; outside the cone and > 3 m off: no ray | itself | low |
| C | the A report | docs | - | ai.md lines for A184-A194 (the locked-door near side; one heard bark; high-cover overwatch suppresses from the edge; one LKP look per plan); BRIEF A184-A194 (below); changelog fragment; TESTING.md lines for A184, A185, A186, A188 | none | low |

## Vitest per group
CORE (every test importing `enemy.ts`, `enemyManager.ts` or their direct importers, type imports included, as batch 1;
regenerated on this head: batch 1's 82 + `guardPolishA` / `guardPolishB` = 84 files):
```
tests/alarmCall.test.ts tests/animN4dKill.test.ts tests/awarenessWiring.test.ts tests/bodyPos.test.ts tests/bodySearch.test.ts tests/breaker.test.ts tests/camBodyWiring.test.ts tests/cameraCue.test.ts tests/campusS2Board.test.ts tests/carryState.test.ts tests/combatHearing.test.ts tests/consoleFault.test.ts tests/consoleNoticeA4.test.ts tests/coopGuardAi.test.ts tests/coopPerception.test.ts tests/coopRejoin.test.ts tests/coopTorches.test.ts tests/coopWalkFixes.test.ts tests/courseConsole.test.ts tests/ctcourse/a7DataHall.test.ts tests/ctcourse/a8Strongroom.test.ts tests/deviceTrip.test.ts tests/economy.test.ts tests/enemyLightsOut.test.ts tests/enemyManagerDespawn.test.ts tests/flagLamp.test.ts tests/fourIntruders.test.ts tests/gearWiring.test.ts tests/guardBody.test.ts tests/guardDoors.test.ts tests/guardGunCarry.test.ts tests/guardLook.test.ts tests/guardPolishA.test.ts tests/guardPolishB.test.ts tests/guardRelight.test.ts tests/guardSpacing.test.ts tests/hangDown.test.ts tests/hangDownTakedown.test.ts tests/hearing.test.ts tests/incidents.test.ts tests/intel.test.ts tests/intelPartB.test.ts tests/intruders.test.ts tests/laserAlarm.test.ts tests/laserPanels.test.ts tests/lockedDoorPath.test.ts tests/loneGuardEngage.test.ts tests/marlowN2Isolator.test.ts tests/marlowN4Hold.test.ts tests/marlowN6Scanners.test.ts tests/marlowPassAny.test.ts tests/marlowWalkS10.test.ts tests/net.test.ts tests/pairsWiring.test.ts tests/perceive4.test.ts tests/playerSlots.test.ts tests/polishBatch.test.ts tests/poseParity.test.ts tests/postsWiring.test.ts tests/progression.test.ts tests/radioWiring.test.ts tests/remoteKneelTense.test.ts tests/responseWiring.test.ts tests/searchAreaWiring.test.ts tests/sectionAlert.test.ts tests/sectorBoltPair.test.ts tests/sectorDesk.test.ts tests/sectorGuardFreezeAtlas.test.ts tests/sectorGuardFreezeLamp.test.ts tests/sectorGuardFreezeSeeThrough.test.ts tests/sectorGuardFreezeView.test.ts tests/sectorGuardTags.test.ts tests/sectorKeypad.test.ts tests/sectorPairGate.test.ts tests/sectorRestart.test.ts tests/securityBodies.test.ts tests/securityCamera.test.ts tests/securityCameraE8.test.ts tests/squadWiring.test.ts tests/strikePops.test.ts tests/torchOcclusion.test.ts tests/trainingCamera.test.ts tests/twoIntruders.test.ts tests/urgency.test.ts
```
- A: CORE + `tests/guardPolish2.test.ts` + the importers of `navGrid.ts`, `searchArea.ts`, `armourFire.ts` and
  `squadRoles.ts` not in CORE: `tests/armourFire.test.ts tests/armourFireWiring.test.ts tests/benchmark.test.ts
  tests/bunkerMap.test.ts tests/campusArtGameplay.test.ts tests/campusS1.test.ts tests/campusS2.test.ts
  tests/campusS3.test.ts tests/campusS4.test.ts tests/campusS5.test.ts tests/ctcourse/a5Substation.test.ts
  tests/ctcourse/a7LockedCage.test.ts tests/nav.test.ts tests/navClosure.test.ts tests/posts.test.ts
  tests/s6CloseOn.test.ts tests/searchArea.test.ts tests/sectorStageActions.test.ts tests/squadRoles.test.ts`.
- B: `tests/reconDroneSight.test.ts tests/enemyManagerDespawn.test.ts`.
- Regenerate CORE before running (another fix may add a test): the importers of `src/ai/enemy.ts` /
  `src/ai/enemyManager.ts` in `src` (type imports too), then every `tests/**/*.test.ts` importing any of them.
- Run in chunks of ~20 files (`npx vitest run --maxWorkers=2 <files>`), per the CPU rule.

## e2e (the lead, after A + B merge; one laptop request, Test Runner's queue)
`e2e-stealth-ai` (S27 roles `movers <= 1` and the suppress `viol` check for A186 / A189; 'search area' and 'lkp' for
A188; S26 heard-in-search for A185 / A193), `e2e-ctcourse` (Marlow A7 cage: A184's near side, S28's lock asserts),
`e2e-coop` (S24 two intruders, S26: A187, A190), `e2e-sectorops` (S6 close-on, S13 response team, campus storeys,
armour S16 block: A192), `e2e-tactics` and `e2e-enemies` (`pickCover` / `findPath` in every mode),
`e2e-ct-warehouse`. All `E2E_GPU=1`.
Watch: `e2e-ctcourse` A7 (a technician sent at a noise in the pod now walks to the cage side, S28-CHECK-B F3);
`e2e-stealth-ai` S27 (A186 puts a high-cover overwatch at his edge during a bound).

## Assumed decisions (BRIEF.md, written by group B)
- **A184** (S28-CHECK-B F2) An investigating guard whose spot is behind a locked door with no way round walks to the
  nearest reachable point (the A* cell nearest the goal) and looks from there; before: he stood where he was. Search,
  patrol and combat chase are unchanged. Undo: `NEAR_SIDE = false` in `src/ai/enemy.ts`.
- **A185** (S26-CHECK-B 7) One "I heard something." per noise however many searchers hear it (all of them still go).
  Undo: `POLISH2.oneHeardBark = false` in `src/ai/enemyManager.ts`.
- **A186** (S27-CHECK-B 7) A high-cover overwatch holds his peek edge while a squadmate bounds, so his suppression line
  starts there. Low cover unchanged (S27-CHECK-B 6 is Michael's). Undo: `OW_HIGH_PEEK = false`.
- **A187** (POLISH-CHECK-A 1) A guard who goes alert on a call about one intruder while he sees another calls the
  second in once (A166 at the alert step). Undo: `ALERT_RECALL = false`.
- **A188** (S25B-CHECK-B P5) In a combat plan search only the first searcher looks at the last known position; the rest
  take plan points at once. Undo: `POLISH2.lkpOnce = false`.
- **A189** (POLISH-CHECK-A 3) A flank bound may be up to 2.5 x the straight line + 3 m (`COVER_DETOUR.flankK`). Undo:
  `flankK = 1.5`.
- **A190** (S23-CHECK-B 1) A calm guard instantly detects any player in his instant range and focus, and that player
  becomes his target. Undo: `INSTANT_ANY = false`.
- **A191** (POLISH-CHECK-A 5) A responder going back to his device search says no "Clear." / "Standing down." Undo:
  `RESUME_QUIET = false`.
- **A192** (POLISH-CHECK-A 4) An armour pick casts the fire line for its best candidates in score order (at most 6).
  Undo: `ARMOUR_CAST_LATE = false`.
- **A193** (S26-CHECK-B 9) A heard spot snaps to the noise's storey. Undo: `HEAR_STOREY = false`.
- **A194** (POLISH-CHECK-A 2) The in-cover known-spot exits need a spot (hunt position, a sighting or a stimulus).
  Undo: `KNOWN_NEEDS_SPOT = false`.

## Not kept (12)
| Item | Why, with evidence |
| --- | --- |
| S16 1 (fire-gate cache keyed by cells only) | Accepted design: A81 (BRIEF.md:263). At most 0.25 s of verdict; the rounds stop on the armour |
| S16 5 (debug counters count chase probes) | Still present (enemy.ts:3134 `armourBlocks` in the chase probe), counters only: during a move `plan` returns `moving` before `held` is read, and after it `cool` blocks a new move, so `held` changes nothing |
| S16 6 + S16 fix-2 note (role / cover picks skip the armour line and the sight line) | New cover scoring: a fire-line or view cast per role / cover candidate in `rolesFor` / `pickCover`. That is a tactics slice, not polish. Armour sits only on campus S4 / S5 (four pieces). The gate already stops every round, and the worst case is a 14 s hold |
| S23-CHECK-B 1 part 2 (`spotted` only for the picked player) | By design. `spotted` marks the player a fight is on (`reportSighting` at every combat sighting, enemyManager.ts:631; FIGHTS4 clears it per fight, :3714). Marking a player he only glimpsed would change who may take a guard down |
| S24 `mirror()` keeps `sightT` with no freshest | No game reader: `git grep sightT -- src` finds only enemyManager.ts writes; the readers are e2e and tests. It counts up each update (:3501) |
| S25B-CHECK-B P9 (`planSweep` claimant ref) | Index loop, no allocation. It runs only for live claims (<= searchers) x guards per step |
| S26-CHECK-A (`combatHearAct` table test mirrors the rule) | A test-style note, no defect |
| LR16-4-POLISH 4 (multi-circuit board reports one circuit, per-circuit tamper clock) | Outside `src/ai` (stealthSystems.ts:137 reports `liveGroup(i)` only) and unreachable: the only untimed board, `S2_BOARDS` (campusS2.ts:192), has one circuit; S4 / S5 boards are timed (`window: 20`) |
| POLISH-CHECK-A 6 (A3: a slotless guard at his own known spot holds until `ALERT.lostSight`) | No freeze (checker). Whether he should start searching early is a behaviour call, not a defect |
| POLISH-CHECK-A 7 (`coverQuality` `for...of`, tactics.ts:86) | Measured under 64 B a call by the A14 alloc test |
| POLISH-CHECK-A 8 (older `decide` / `chasePoint` literals) | The return-literal pattern runs through `decide`. Removing it is a refactor, not polish |
| POLISH-CHECK-A 9, 10 | No action (test location; the lead's typecheck) |
