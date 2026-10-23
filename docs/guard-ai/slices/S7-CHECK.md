# S7 - Cameras see bodies (fresh checker, 2026-10-23)

Commit 084e373c on `feature/guard-ai-s7`. Reviewed `git diff 7a4167b2 084e373c` in full (`src/ai/incidents.ts`,
`enemy.ts`, `enemyManager.ts`, `barks.ts`, `src/game/gameState.ts`, `src/game/modes/sectorMode.ts`,
`tests/camBodyWiring.test.ts`, `scripts/e2e-sectorops.mjs`, docs) against BRIEF goal 9 and A20-A22, PLAN row S7,
design section 9, `S7-module.md`, `S7.md`, and Michael (~01:37): "cameras should also see dead or knocked out guards,
and report to other nearby guards to investigate if so."

## Verdict: PASS

Nothing is broken or unplayable. A camera that sees a knocked-out or dead guard opens one incident per body. The
nearest 1 or 2 calm guards walk over, and a knocked-out guard is woken through the existing body-found path. Every
exit from the walk has a bound, so no sent guard can be stuck. The e2e scenario really proves that the camera sent
the guard. Marlow Yard's security room is unaffected. The items below are polish or belong to S4.

### Re-run here
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` on the 7 changed src / test files: exit 0.
- `npx vitest run tests/camBodyWiring.test.ts tests/incidents.test.ts tests/securityBodies.test.ts
  tests/radioWiring.test.ts tests/securityCamera.test.ts tests/sectorRestart.test.ts tests/enemyManagerDespawn.test.ts`:
  7 files, 105 / 105 pass.
- Full `npm run check` and full vitest: not run (desktop CPU, as ordered). e2e: not run, as ordered. The new
  `e2e-sectorops` scenario has not run anywhere yet (`S7.md` says so), so it still needs its laptop run.

### Verified
- **One incident per body.**
  - `findMerge` (`incidents.ts:390`): a `camBody` merges only with an open `camBody` that has the same key (the body's
    number). Two cameras give one incident. Two bodies side by side give two incidents.
  - The desk line goes out only when `board.opened` changes (`enemyManager.ts:885-890`), so there is one line per
    incident.
  - Body ids come from a module-wide counter (`body.ts:29`), so a key never repeats across sections or restarts.
  - A body already found is ignored (`cameraReport`, `:880`), so a body found by a guard is never sent again.
  - The camera module reports each body at most once per camera. A later report from another camera, after the first
    incident has closed, opens a new incident. That is correct: it is a new sighting.
- **Every exit from the sent guard's walk has a bound** (`stepCamBody`, `enemy.ts:752-777`).
  - `camBody` is cleared when the body is not present, found, carried or hidden, or when `camBodyT >= bodyWalk` (45 s),
    at `:766`.
  - It is also cleared on a glimpse, which also drops the task (`:760-764`), and on any level change away from
    investigating (`:756`, `:899`).
  - A body that is removed (revived, capped, despawned) loses its rig, so `present` turns false (`body.ts:76`) and the
    walk ends.
  - `AlertInput.hold` is true only while `camBody` is set (`:1245`). The alert machine ignores arrival while held
    (`alertState.ts:157`). Once the hold drops, the usual 4 s look or the 20 s `investigateMax` ends the
    investigation. So he cannot hang in investigating.
  - A guard held by the player skips his brain (`enemy.ts` `update`, the `taken` early return). The walk clock pauses
    with him and resumes after.
  - The board side ends too. `follow` sees him off the task (searching after `bodyFound`, combat, done) and closes the
    incident. A send that `camBodyOf` or `sendable` refuses leaves the task at -1, and the next tick closes it.
  - With nobody in range, the incident closes after `camWait` (30 s, `incidents.ts:565`).
- **The KO'd guard is woken.**
  - Within `BODY.close` with a clear line, `ctx.bodyFound` runs (`enemy.ts:775-776`). That calls `searchAt(..., b)`
    for a knocked-out body, then the revive walk and `revive` (`enemyManager.ts` `bodyFound` and `revive`).
  - This is the same path as a guard who finds a body himself.
  - For a dead body, the second guard sees `found` and drops his walk. He is within `RADIO` of the finder, so he is
    told to search.
- **Who goes.**
  - `mark(s, view, 1, false, callR)` with `free()` excludes melee and dogs (`GV_MELEE`), held, busy (passive, alarm
    run), down, tasked guards, and every level except unaware, suspicious and cooldown.
  - The S2 `best` picks by path. A second guard is sent only when `want === 2`, which means lethal
    (`incidents.ts:561-575`).
- **Host only, coordinated only.**
  - The wiring sits inside the `world.layout.security && !this.puppet` block (`gameState.ts:702-731`), so a co-op
    client never runs it.
  - `cameraReport` returns -1 in the parked modes (`enemyManager.ts:870`).
  - The only new import into `enemyManager` is `import type { CameraBodyEvent }`. Nothing touches `src/net`.
    Protocol: untouched.
- **Cleared on dispose and restart.**
  - `SecuritySystem.dispose` clears `onBody` and the body source. `GameState.dispose` calls it (`gameState.ts:1122`).
  - `SectorMode.unloadSection` calls `clearBodyReports` after `despawnAll` (`sectorMode.ts:289`), and both a section
    load and `restartSection` pass through it.
  - The source closure reads the manager's `readonly bodies` array, which is never reassigned. So no stale body can
    be reported: after `despawnAll` the array is empty.
- **CtDevices' `onEvent` is untouched.** Only `onBody`, `setBodySource` and `em.onCameraLine` are set. Player alarms
  still go through `onEvent`.
- **No per-tick allocation.**
  - `stepCamBody` uses the kept `tmpHips` / `tmpEye`, plus `hyp2` and `losTo`.
  - The board's `camBody` branches use typed arrays only.
  - The body pass allocates only its event, on a first sight.
  - The string work (`slice`, `parseInt`, `` `Camera ${k + 1}` ``, `` `b${key}` ``) runs once per report or send,
    never per tick.
  - `placeBark`'s `cam:` branch compares strings without slicing.
  - No `Math.hypot` in `src`.
- **The e2e scenario is sound.**
  - The "sent" check reads `e.camBody.id === body.id`. Only `checkBody` sets that field, so a guard who found the body
    himself cannot pass it.
  - A self-find would set `found`, and `cameraReport` would then ignore the body, so that case fails the test rather
    than passing it.
  - Guards are blinded to the player through a `perceptionMul` getter (it shadows the prototype getter at
    `enemy.ts:598`), and the cameras' player think is stubbed, so there is no alarm.
  - The numbers come from `em.incidentTable` (`= INCIDENT`).
  - The probe runs through the real `bodyPass`, then calls `clearBodyReports` and puts the source back.
  - The APIs it uses exist with those signatures: `nearestWalkable(x, z, ring, y)`, `lineClear(a, b, ya, yb)`,
    `nav.height`, `center`, `setPatrol`, `knockOut(HitInfo)`, `onRevived`, `board.opened`, `e.level`.
- **Marlow Yard security room.**
  - The duty guard is the only member of bay 3's squad (`ctcourse.ts`, `squad: n === 3 ? [S3_SEC_GUARD]`), and he is
    `passive`. A passive guard is `GV_BUSY` (`enemyManager.ts:735`) and is never sent.
  - So when he is KO'd, nobody can be sent: no guard who could be sent exists in that bay. Even if `cam-s3` saw him
    through the doorway, the incident would wait 30 s and close.
  - The console checks `squadOf(guard).alive`, the flag and `cams[0].mode`. The `e2e-ctcourse` asserts at 436-475
    check the refusal, the flag, the camera going off and the hallway. None of that changes. At most a desk subtitle
    could appear (polish 1).
- **Sector Ops' existing KO** (`e2e-sectorops.mjs:100`) asserts a body 0.2 s after the knockout, then unloads 1.3 s
  later. That is far too soon for a sent guard to revive anyone, so the assert holds even when a camera sees it.

## Fixes

None blocking.

## Polish list (later slices or the feel pass)
1. **The desk line with nobody to send.**
   - In Marlow Yard (passive guards only) and anywhere with no calm guard within 25 m, the desk still says "Nearest
     unit, check on him." and nobody comes.
   - Done looks like: the line waits for the first send, or a "no units near" variant is used. Section caution is
     S4's (A21).
2. **The waiting incident follows the body, not the camera's spot.**
   - Suppose the body is carried during the 30 s wait and dropped out of every camera's view. A guard who comes
     within 25 m of the old spot is still sent, to the body's new position (`camBodyOf` by key).
   - In the same way, a body a guard has already found (but not woken) can still be the target of a late send. The
     guard then sees it as found at once and just investigates the spot.
   - Done looks like: `camBodyOf` returns null for a found body, or for one more than a few metres from the incident's
     spot.
3. **A room-held guard (Infiltration squads, `Enemy.hold`) can be sent to a body outside his room.** His spot is
   clamped to the room, so he never gets within 2.5 m and spends the full 45 s. This is the same as the S2 noise sends.
   Done looks like: `fillView` flags room-held guards as busy for `camBody`, or the spot test uses the clamped point.
4. **A body on unwalkable ground** (a ragdoll on racking or a crate) more than 2.5 m from the nearest walkable cell is
   never reached. The guard gives up at 45 s.
5. **`Enemy.checkBody` / `stepCamBody` have no unit test.**
   - The unit tests stub `checkBody`. The walk's exits (timeout, body carried or removed, glimpse, found first) are
     covered only by reading the code.
   - The handoff to `bodyFound` and the revive is covered only by the new e2e, which has not run yet.
   - Done looks like: a small test on a real `Enemy` with a stub context.
6. **Two lines at the send.** `checkBody` barks `checking`, then `onLevel` barks `investigate` (the same pattern as
   `checkLight`).
7. **Carried over from `S7.md`.** A body re-dropped in the same camera's view is not reported again. The second guard
   for a dead body goes to the same point. "Camera N" counts across sections. There is no `{room}` when the body is
   outside every room rect.
