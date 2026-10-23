# S10 - Michael's walk 4.72 / 4.73 on Marlow Yard (diagnosis and fixes)

Branch `feature/marlow-final-s10`, not committed. The walk was on master's old Marlow (its "S2" / "S3"); each item is
mapped onto the rebuilt A-sets. Line numbers are HEAD's (before this slice) unless marked "now".

## W1 / M1 - the hallway camera is bulletproof
- Reproduces: yes. Any round through a camera's housing broke it: `src/security/securitySystem.ts:247` (HEAD,
  `shotRay` -> `c.destroy()`), reached from every host shot by `src/game/gameState.ts:714`. A3's `cam-a3-hall` had no
  way to opt out.
- Fix: `CameraDevice.armoured` (`src/security/data.ts`). `SecuritySystem.shotRay` turns the round on an armoured
  housing: no break, `ricochets++`, `onRicochet(x, y, z)`. `gameState.ts` hooks it to the existing effects: sparks
  at the housing (`vfx.sparks`, as a shot lamp) and the existing impact sound (`ballistics.onImpact`, the
  `sfx.impact` thud / ricochet). No new sound asset. The shot still makes its normal impact noise for the guards.
- Rule (assumed decision S10-A1): `ARMOURED_FROM_SET = 3` (`src/world/maps/ctcourseSets/types.ts`, applied in
  `ctcourse.ts` by `armourCameras`). A3's hall camera is Marlow's first camera, so every Marlow camera is armoured: A3
  hall, A4 C1-C3, A7 cam1-2, A8 C1-C3. A1 and A2 have no cameras, so they stay "early, shootable" in principle.
  Reason: ROADMAP stealth over shooting (1) says later sections get bulletproof cameras and early ones stay
  shootable, and Michael asked for the first one (A3) to be bulletproof. Undo: set `ARMOURED_FROM_SET` above 8
  (every camera shootable), or give one camera `armoured: false`. Sector Ops is untouched (sector-redesign owns its
  cameras).
- Co-op: a client's round never reached the host's cameras before (in course mode the client only sends lamp shots),
  so there is nothing to change on the wire. Not done: the client sees no sparks for its own round on a camera.
- Tests: `tests/marlowWalkS10.test.ts` (an armoured camera ricochets twice and stays online, the hook gets the
  housing; an unarmoured one still breaks; the set rule; every built Marlow camera is armoured).
  `tests/ctcourse/a7DataHall.test.ts:479` and `a8Strongroom.test.ts:690` now expect the armoured copies. e2e
  `a3OfficeRange.mjs` step 1b: two rounds through the hall camera's housing leave it online.
- Michael should try: shoot A3's hall camera. You should see sparks, hear a ricochet and the camera keeps working.
  Then jam it.

## W2 / M2 - a set restart is a full reset
- Reproduces: yes, on host and client. `courseMode.ts:605-614` (HEAD, `bayRestart`) only respawned the squad
  (`spawnSquad` -> `despawn` of the squad's own guards, `:703`) and the lamps. The cause, compared with Sector Ops'
  `restartSection` (`sectorMode.ts:779-818`):
  - The guard AI's shared memory stayed. `despawn` (`src/ai/enemyManager.ts:783`) removes a guard and his body, but
    the incident board, the radio calls, the awareness holds (the "dead" hold opened by the kill) and the last known
    position live on. `EnemyManager.clear` (`:1466`) is the only thing that clears them. The fresh guard was handed
    the old body's incident and the open hold, so he went cautious. A second restart happened to clear it once the
    hold timed out. Reinforcements outside the squad also stayed.
  - The camera body reports stayed (`security.clearBodyReports` was never called).
  - Cameras were never repaired (`ctDevices.repair` was never called), and there was no player-side reset: a carried
    body, gadgets out in the world, the noise meter (`GameState.checkpointReset` was never called).
  - "Old body still there": `despawn` removes the bodies, but only those of the current squad's guards.
- Fix (`src/game/modes/courseMode.ts`, now ~:621-640, `dropSquad` ~:725): `bayRestart` now runs Sector Ops' full
  path. Held guards are let go (takedown, `net.releaseHolds`), then `EnemyManager.resetMemory()` (every guard, body
  and drone; board, calls, caution, alarm run, LKP), then the squad respawns. After that come `g.checkpointReset()`
  (carried body dropped, grenades and gadgets cleared, noise and music calm; the course host never marks a weapons
  checkpoint, so the loadout is untouched), `security.clearBodyReports()` and `ct.repair(-1)` (a broken camera
  comes back, every camera's meters empty). The next set's squad still uses the per-guard `despawn`, as before.
  Co-op client: the host's restart banner is now the constant `COURSE_RESTART_TITLE` (`course/courseWire.ts`).
  `coopClient.ts` runs its own `checkpointReset` on it, as Sector Ops' client does. The client's guards and bodies
  follow the host's snapshot (a despawned guard and his kept ragdoll drop). No wire change: protocol stays 33.
- No `src/ai` change: `resetMemory` already exists (Guard AI's), so the course-side path covers it.
- Tests: e2e `a3OfficeRange.mjs` step 1b. Kill the cleaner and break the camera by hand, then restart: one fresh
  cleaner, no body on the host, not alerted, caution 0, the camera online again, and on the client no kept body and
  one guard. `a2CarriageShed.mjs` restart: one shunter, no bodies, calm, caution 0.
- Michael should try: in A3, kill the cleaner (and carry him), then restart the checkpoint. The new cleaner should
  walk his loop calm, with no body anywhere. Try the same in co-op from both seats.

## W3 / M3 - a set restart resets the doors
- Reproduces: yes. The course restart only re-applied locks (`courseMode.ts:779` HEAD, `applyLocks`). A door a
  player or guard opened stayed open. A door the course re-locked stayed open but locked, because `applyLocks` never
  forces a lock shut except an airlock's rear door. Sector Ops does it with `SectionStartState` (`sectorReset.ts`,
  taken at `beginSection`, applied in `restartSection`).
- Fix: the same path. `SectionStartState.applyDoors(doors, locked)` is split out of `apply` (Sector Ops unchanged:
  `apply` calls it without `locked`). `CourseMode` takes the snapshot when a set starts and puts the doors back on a
  restart, in `handle` after `applyLocks`, so the course's own locks and the airlock doors are settled first. Marlow
  passes `locked = true`: a door locked at the set start (A1's wicket, a holding-room door) shuts as it began.
  Cracked doors are uncracked. `restarts` and `lastDoors` are exposed for tests. The client mirrors doors from the
  snapshot, so there is no wire change.
- Assumed decision S10-A2: the restart shuts locked doors too (Sector Ops leaves them). A player standing in such a
  doorway is respawned at the checkpoint 0.5 s later. Undo: `applyDoors(this.g.world.doors)` without `true` in
  `CourseMode.handle`.
- Tests: `tests/marlowWalkS10.test.ts` (open, shut and cracked doors restored; locked ones only with `locked`).
  e2e `a2CarriageShed.mjs`: the cabin door the host opened is shut again on both pages after the restart, and
  `lastDoors >= 1`.
- Michael should try: in A2, open the cabin doors, then restart. They should be shut again on both screens.

## W4 / M4 - no work
The A3 console's "guard still watching" refusal is expected. G6's switch-back belongs to Guard AI Build.

## W5 / M5 - the lamp over the A2 locked door
- Reproduces: no, not on the rebuilt A2, so no data was changed. On master (`ctcourse.ts:531-534`, origin/master)
  old S2 had a low lamp on top of the 4.4 m leg-up wall (`S2_TOP_LAMP`, radius 7.6, intensity 0.5). It sat 0.4 m
  past the wall's far face, above the bolted S2 door. Seen from the first room it hung over both rooms, but the
  wall top shadowed the near side. That matches Michael's words exactly.
- The rebuilt A2 has no leg-up wall, no bolted door and no lamp near a dividing wall. Its fittings:
  - the four neck high-bays (21);
  - six shed strips at 6.5 m (20), the nearest 1 m short of the east wall;
  - the cabin panel inside the cabin (22);
  - four staging strips (23) over the deck.
  The only locked doors are the holding-room sliding doors (L1 far, L2 near). Their status bar (red when locked) is
  an emissive sign on both faces, not a lamp. Fixing it would be an engine or kit change, outside this slice.
- The orchestrator's note: the old lamp fails because of linear falloff (its reach is about its mount height), and
  Sector Ops is building an all-maps photometric falloff toggle, so the engine falloff stays untouched here. That
  fitting (`S2_TOP_LAMP`, master's `ctcourse.ts:83` / `:534`) does not exist on this branch: `grep S2_TOP_LAMP src`
  finds nothing. marlow-final's rebuilt `ctcourse.ts` (193 lines, the A-sets) replaces master's file when it merges,
  so the lamp goes away with the old map, and there is no Marlow data left to fix. If Michael still sees the problem
  on the rebuilt A2, the fix stays data-only (position, height, range or room of that fitting).
- Michael should try: in A2, look for any fitting that seems to hang over two rooms and light only one, and send a
  screenshot with its place. The general lamp output and spread concern ("not spreading light as much as it
  should") is Sector Ops Build's all-maps review (S1, LR1-LR12).

## Checks
- `npx tsc --noEmit` clean. ESLint on the changed files is clean.
- Vitest: `tests/marlowWalkS10.test.ts` (new), `securityCamera`, `ctcourse`, `ctcourse/a3`, `a4`, `a7`, `a8`,
  `course`, `sectorSlice0`, `sectorIsolator`: all pass.
- e2e (desktop lane, GPU, 4191): see the job lead's report for the results of `e2e-ctcourse:1`, `e2e-ctcourse:2`
  and `e2e-course`.
- Not run: parts 3 and 4. Their restarts (A5, A6, A7, A8) now also reset doors, guard memory and gadgets. Run
  `e2e-ctcourse:3` and `e2e-ctcourse:4` in the train.

## Files
`src/security/data.ts`, `src/security/securitySystem.ts`, `src/game/gameState.ts`, `src/game/sectorReset.ts`,
`src/game/modes/courseMode.ts`, `src/game/course/courseWire.ts`, `src/net/coopClient.ts`, `src/world/maps/ctcourse.ts`,
`src/world/maps/ctcourseSets/types.ts`, `tests/marlowWalkS10.test.ts` (new), `tests/ctcourse/a7DataHall.test.ts`,
`tests/ctcourse/a8Strongroom.test.ts`, `scripts/e2e-ctcourse/a2CarriageShed.mjs`,
`scripts/e2e-ctcourse/a3OfficeRange.mjs`. Not touched: `stealthSystems.ts`, `a8Strongroom.mjs`, `src/ai`.

## Open
- The changelog fragment and the TESTING.md lines are the job lead's.
- The client gets no ricochet sparks for its own round on an armoured camera (cosmetic; polish list).
