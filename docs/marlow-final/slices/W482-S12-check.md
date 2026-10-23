# W482 S1 (X6) + S2 (X2a) - fresh Opus check

Commit 58fcf7b5 on feature/marlow-walk482 (parent ee24c65f). Checker: Opus, read-only, 2026-10-23.
Brief: WALK-4.82.md X6 and X2 (X2a) on origin/feature/marlow-final.

## Verdict: PASS

No must-fix. Both changes do what Michael asked, are host-only where they need to be and add no hot-path allocation.

## Runs
- `npx tsc --noEmit -p tsconfig.json`: clean (exit 0). Run over the working tree, which holds other builders' uncommitted
  edits (a1Gate, a2CarriageShed, facility, their tests, PROPS.md); none of them errored.
- `npx vitest run tests/spotFail.test.ts tests/ctcourse.test.ts tests/jammer.test.ts tests/course.test.ts`: 4 files,
  101 tests, all pass.
- `node --check scripts/e2e-ctcourse/a3OfficeRange.mjs`: OK.
- e2e not run (laptop queue: e2e-ctcourse:2 for X6, e2e-ctcourse:1 once S3 lands).

## 1. X6 - A3 hall camera: send-back only
- `CtDevices.onCamera` (src/game/ctDevices.ts:1119) returns after the stage-1 radio line and before `hooks.alertAt`
  (:1122) and `raiseAlarm` (:1128) when `e.camera` is a hall-rule camera. Correct.
- The send-back still works: `stepHall` (:913) reads the camera's meter stage straight from `CameraUnit.meters`
  (:926), not from `onCamera`, and resets the meter itself (:937). Nothing in it depended on the alarm.
- No other camera loses its alert: `hallCameras` (src/game/passZones.ts:33) collects only `PassZone.hall.camera`.
  Only A3 has hall rules (a3OfficeRange.ts:315-316, both zones share `A3_HALL`; the Set dedupes). No other map has
  `passZones` with `hall` (grep over src/world); Sector Ops' CtDevices gets an empty set. Test pins `{cam-a3-hall}`.
- Co-op: host-only build is right. `g.security` exists only on the host (gameState.ts:739, `!this.puppet`) and
  `onEvent = onCamera` is wired only in the host branch (ctDevices.ts:367). The client CtDevices (courseMode.ts:1113,
  coopClient.ts:162) never runs `onCamera`; the client takes the alarm stage from the wire (`al`, :1175), which stays
  unchanged. No wire change.
- Other paths that could tell guards of this detection: none found.
  - `EnemyManager.deviceAlert` callers: only `CtHooks.alertAt` (courseMode.ts:293, sectorMode.ts:316), reached only
    from `CtDevices.touch` (lasers) and `onCamera`.
  - `SecuritySystem` emits stage events only through `onEvent` (securitySystem.ts:240); its `onBody` pass reports
    bodies, not players.
  - Incidents: the `device` incident is opened only inside `deviceAlert`. Radio: only LANTERN lines (`hooks.say`),
    which guards do not hear. The `alarm` event bus / horn is emitted by mission mode only. `style.detections` counts
    guard combat only (gameState.ts:1925), not cameras.
- e2e (a3OfficeRange.mjs): the `camCost` / `noCamCost` / `calmHolds` helpers read real fields (`enemyMgr.deviceAlerts`,
  enemyManager.ts:769/833; `__ctdev.debug().alarm`, ctDevices.ts:1261). Steps 2, 3 (dark) and 4 (window miss) assert no
  device alert and an unchanged alarm stage relative to a baseline (stricter than the brief's `=== 0` and also right in
  an all-sets run). Step 3's 150 s `calmOnLoop` became a 5 s `calmHolds`; step 4's `calmOnLoop('A3 calm')` stays for the
  lights-out lure. Coherent with the code.
- A5 note: the alarm stage is never reset between sets (no `this.alarm = 0` in CtDevices; only `raiseAlarm` and the
  client `apply` write it). In an all-sets run A5's `alarm === 0` asserts (a5Substation.mjs:160, :189) used to follow
  A3's camera alarms and would have read > 0; now A3 raises none, so they mean "no set before A5 raised an alarm" and
  can pass. In part runs (`--part=3`, A5 first) their meaning is unchanged. A4 (:248), A7 (:186) and A8 (:262) compare
  against a baseline and are unaffected.

## 2. X2a - A2 spotted fails the set
- `spotFailed` (src/game/course/spotFail.ts:16): no rule -> false; any squad guard `alive && !passive && alerted` ->
  true. Index loop, no allocation. Matches the brief. Tests cover the four cases.
- `CourseMode.fixedUpdate` (courseMode.ts:576-581): host only (CourseMode is built only for non-puppets,
  gameState.ts:698-707; the client runs the course mirror). Gated `!st.over && this.restartT < 0`; the restart drops
  the squad in this same step's `handle()` (bayRestart -> `dropSquad(true)`, `spawnSquad`), so it cannot fire twice on
  the old squad. `unshift` happens only on the trigger step; no per-step allocation.
- Order is right for the stats: `enemyMgr.update` and the `detected` tally (gameState.ts:1921-1926) run before
  `mode.fixedUpdate` (:1938), so the detection that caused the fail is in the bay stats before `rating.begin`
  re-bases on `bayRestart` (courseMode.ts:682). A clean retry rates clean; a set already rated is not re-rated (A8).
- Everyone-down restart: a pending one (`restartT >= 0`) blocks the rule; the rule's `restartCheckpoint` sets
  `restartT = -1`, cancelling a pending one (same as the pause restart). No conflict.
- Knocked-out guard: `knockOut` drains HP (enemy.ts:1777-1781), so `alive` is false (`Health.alive` = hp > 0). A KO'd
  guard cannot trigger the restart.
- Radio: the line is put first and capped at 4; the queue is held while any guard is alerted (courseMode.ts:625), and
  the fresh squad is calm, so it plays on the next free slot and reaches the client through `rl`.
- Double-restart risk (assessed, see should-fix 1): after the restart the host is teleported only when
  `scheduleRespawn(.., 0.5)` runs out (gameState.ts:1940), the client only when the host respawns
  (`CoopHost.onRespawn`) plus network delay. Nothing guards that window: no spawn grace in `Enemy` (first `perceive` at
  0-0.25 s, enemy.ts:227/1841), `resetMemory` only clears shared memory, `restartT` is -1 again. A fresh guard reaches
  `alerted` inside it when (a) the meter fills: the cap is 3.2/s (perception.ts:37), a sprinting player in full light
  at ~7 m from a deck watcher nets ~2.2/s, so 0.25-0.5 s of sight can reach 1; or within 1.6 m in light it is instant;
  or (b) an unsuppressed shot lands within a quarter of its reach (enemyManager.ts:2425, straight to combat). Each extra
  restart re-arms `scheduleRespawn(0.5)`, so a held trigger in the neck keeps restarting (guns are reloaded by
  `checkpointReset`) until it is released. Recoverable, not unplayable: hence should-fix. The e2e step 2b (client
  teleported standing still, ~0.5/s at 7.5 m) will not hit it.

## 3. e2e scripts
- a3OfficeRange.mjs: syntax OK; step changes coherent (see 1). No other e2e-ctcourse file is in this commit; the A2
  e2e (step 2b) is S3's.

## Must-fix
None.

## Should-fix
1. Post-restart grace for the spotted rule (src/game/modes/courseMode.ts). Stops a second / looping restart while the
   players are still in the lit neck waiting for the 0.5 s respawn (and the client's network delay).
   - Add a field next to `restartT` (:157): `private spotHold = 0;`
   - In `onEvent` case `'bayRestart'` (:678), next to `this.restartT = -1;`: `this.spotHold = 1.5;`
   - In `fixedUpdate` before :576: `if (this.spotHold > 0) this.spotHold -= dt;` and add `&& this.spotHold <= 0` to the
     condition at :577.
   1.5 s covers the 0.5 s respawn plus co-op latency; the fresh guards' meters start at 0, so nothing is missed.
2. Woken guards are not in `this.squad` (courseMode.ts:148): `EnemyManager.revive` (enemyManager.ts:1349) builds a new
   `Enemy` and CourseMode has no `onEnemyJoined`, so a KO'd guard woken by a squadmate who then goes to combat does not
   fail the set (the list keeps the old, dead object). Low risk in A2 (the deck watchers are leash 0 and cannot walk to
   a body). Simplest fix: at :577 pass `g.enemyMgr?.enemies ?? this.squad` instead of `this.squad` (Course mode spawns
   only the current set's squad, `spawnSquad` -> `dropSquad(false)`, so the manager's list is that squad plus woken
   guards and reinforcements; `Enemy` fits `SpotGuard`).

## Polish
- ctDevices.ts:910-911: `stepHall`'s doc still says "Being seen also raises the alarm stage as everywhere (both kept:
  the simpler choice)"; now false for hall cameras. Reword to point at X6.
- The device alarm stage carries across sets (never reset at `bayStarted`). Not this slice's scope; worth a note for the
  rating / Sector Ops owners if a later set's camera should start from stage 0.
- A3 hall camera stage 2 outside the hall / far boxes now costs nothing at all (no send-back, no alarm). Out of the
  camera's 14 m reach from the lobby in practice; fine for training.
