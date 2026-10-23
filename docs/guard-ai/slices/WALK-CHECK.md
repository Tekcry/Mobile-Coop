# Walk 4.72 fixes S17-S21 check (fresh Opus checker, 2026-10-23)

Branch `feature/guard-ai-walk` at 2082f96b (S17-S20 on the S15 tip fc249f3f, S21 merged in). Reviewed
`git diff fc249f3f..2082f96b -- src tests scripts` (31 files) against Michael's words G1-G5 (the bar), the builder
report `slices/WALK.md`, BRIEF A100-A126 and CLAUDE.md "Hard rules", "Current goal", "Definition of done". PLAN.md on
this branch has no "Walk 4.72 fixes" rows; the BRIEF section and WALK.md carry the spec.

## Verdict: PASS overall (one blocking fix made in S20)

| Slice | Michael | Verdict |
| --- | --- | --- |
| S17 | G1 lasers: look where the laser is, search the room | PASS |
| S18 | G2 bodies: they give up too easily | PASS |
| S19 | G3 rush to alarms and reported bodies | PASS |
| S20 | G4 through each other and doors | FAIL as built (deadlock), PASS after the fix below |
| S21 | G5 holstered in a calm area | PASS (GPU-lane visual pending) |

## Blocking finding and fix
1. **S20: two guards meeting head on in a doorway or a narrow corridor stood face to face forever.** The hard spacing
   (`stepApart` / `tooClose`, `SEPARATION.min` 0.65 m) plus the sidestep had no way out when the walkable band is
   narrower than 0.65 m (a 1.2 m or 0.9 m doorway, a 1.2 m corridor: band ~0.5 m after the 0.32 m agent radius).
   Measured on the real `Enemy.move` on a real `NavGrid`: both stuck at (-0.20, -0.25) / (0.22, 0.25), 0.65 m apart,
   for 40 s, at a walk and at the S19 jog; the old steering (min 0, no sidestep) let them pass. Two patrols crossing in
   a doorway, a response team meeting a patrol in a corridor, or a walker meeting a post on a choke would have frozen.
   Fix (`src/ai/enemy.ts:2909`, `:2965`, `tryMove`; `src/ai/separation.ts` `stall` / `squeeze`): held by the spacing
   (pushed off, cut or refused) with somewhere to go, at under a quarter of his pace, for `SEPARATION.stall` 1 s, he
   squeezes past for `SEPARATION.squeeze` 2 s with the soft push only (the pre-S20 steering): they brush past in the
   gap and walk on; the open-floor spacing is unchanged (every S20 spacing test still holds `SEPARATION.min`).
   Test: `tests/guardSpacing.test.ts` 'two guards meeting in a doorway or a narrow corridor never wait forever' (6: a
   1.2 m and a 0.9 m doorway and a 1.2 m corridor, walk and jog; both get through, nearer than the spacing for under
   4 s). All 6 fail with the stall rule off (`stall` 1e9). Logged as A127 (BRIEF), `docs/systems/ai.md` updated.

## What was checked

### S17 (G1): no device alarm reads the player's live position
- Every path from a device: `CtDevices.touch` reports `beamSpot` (the beam's midpoint, its floor) and `onCamera` the
  camera event's spot (where it saw someone then), both before `raiseAlarm`; host only (the client `CtDevices` has no
  `alertAt`). `EnemyManager.deviceAlert` (`enemyManager.ts:811`) never touches the last known position; the board's
  `device` incident (`incidents.ts:710`) sends calm free guards (`free`: not posted, not busy, no task) to the spot.
- The alarm's reinforcements: Sector Ops pushes them into `pending` and `fill()`s at once (alerted slots ignore the
  spawn distance), so `joinReinforcement` (`enemyManager.ts:734`) sees `deviceFresh` and makes them responders at the
  spot inside its room. Course mode raises no reinforcements. `setAlarmStage` hands gear only; the S13 sweep starts from
  the lead's position without a last known position. Responders search with `searchOwn` (never the shared position).
- A105 (`enemy.ts:2439`, `known = ... t.feet` with no last known position): after a device alarm it is reachable only
  by a reinforcement that spawns more than `DEVICE.fresh` 90 s after the trip, i.e. one held in `pending` by the live
  cap (`SECTOR.maxAlive` 32) until a guard dies. Not reachable in the shipped sections (well under 32 guards); polish 1.
  Other routes into combat (shot, gunfire heard, a contact call) follow a perception of the player, as before.

### S18 (G2): body search numbers wired
- `BODY_SEARCH` (180 s, ring 1.5 m + 1.5 m to 15 m, 2.5 s looks) flows through `searchSpec` into the alert machine
  (`searchFor`) and `calmDecide` (`ringPoint`, the look). `searchKind` is set by every `searchAt` and reset to plain when
  a search follows combat; searching is only entered through `searchAt` or from combat, so no stale kind leaks into a
  later search. The finder, the voice partner, the camera's second guard and the radio helper all search the body way.

### S19 (G3): urgency only where it makes sense
- `urgentKind`: device, bodies, shots, missing, contact hurry; noise, lure, light and breaker keep the calm pace
  (`sendTo` passes `noise` for a calm send, so a noise or lure stays calm; S15's breaker walk untouched). The hurry ends
  on arrival, at calm and in combat.
- The `bodyDead` helper (`incidents.ts:726`, `enemyManager.ts:774`) marks through `free`: `GV_POSTED` (high-security
  posts) is excluded, a response team and device responders are searching (never calm), and anyone on a task is busy.
  Re-entrant `boardStep` from the radio sink matches the S14 `alertThrough` pattern.

### S20 (G4)
- Doors: `doorStep` (`enemyManager.ts:531`) opens through `Doors.open(d, 'enemy')`, the same call `pushOpen` makes
  (sound, the guard-opened close, co-op door sync); no new door state. Locked doors: refused, he waits.
- A116 judged acceptable for now: a guard whose path crosses a locked door (the grid still walks it) waits at the leaf.
  A plain search ends on its clock and the entry route has `ENTRY_MAX`, so the board-sent device guards and patrol
  searches recover; a hunting responder or a combat guard whose target is behind a locked door waits there. Sector
  Ops' locked section doors seal sections the responders spawn inside, keypad / bolt / lockdown / pair-gate doors are
  closures already; nothing in the map data puts a device room behind a locked door. Polish 3.
- Takedown / grab / carried bodies: held (`taken`) and downed guards are not solid; players keep the old soft push;
  carried bodies are `Body`, not guards. The squeeze fix does not touch them.

### S21 (G5)
- Draw 0.7 / 0.5 s, then the old reaction and aim settle; suspicion draws early, so a guard who spots the player has
  mostly drawn. `tryFire` (`enemy.ts:2807`) is the only route to `shoot`: no shot while holstered or drawing.
- `RigPose.ready` (`characterRig.ts:1796`) is `s.ready ?? (carrier && !heldWeapon)`: the player and remotes never set
  it, so they are unchanged; guards that never holster leave it unset (as before). Co-op puppets (`src/net`) untouched:
  low ready on clients (A126), not broken.

### Across all
- Host only: no `src/net`, `PROTOCOL_VERSION` (31) or `SAVE_VERSION` (9) change. S15 breaker code (`brk*`,
  `circuitOut`, `lightsOut`, `switchFloor`, `BREAKER`) untouched.
- Hot paths: no closures, iterators, temporary vectors or `Math.hypot` in the added loop code (`doorStep` and the hooks
  are made once; `bodyHelp`'s string parse is per radio call). Tests run the real `Enemy` code, not only fakes.
- Runs on the fixed tree: `npx tsc --noEmit -p .` clean; eslint on every changed src / test file clean; vitest 28 files,
  412 tests green: deviceTrip, bodySearch, urgency, guardDoors, guardSpacing (20), carryState, guardGunCarry,
  awarenessWiring, sectionAlert, breaker, incidents, posts, postsWiring, pairs, pairsWiring, takedown, squadRoles,
  squadWiring, awareness, responseTeam, responseWiring, camBodyWiring, alarmCall, laserAlarm, sweep, gear, gearWiring,
  readyHands.

## Polish list (not blocking)
1. S17: a reinforcement held in `pending` by the live cap past `DEVICE.fresh` comes in combat with no last known
   position and goes for the player's feet (A105). Tag the pending slot with the device spot when the alarm rises.
2. S17: a responder stirred into an investigation (a noise) ends in cooldown, then unaware: he drops the device search
   and, with no route, stands. Return him to the device search instead.
3. S20 / A116: per-door nav closure while locked and shut (or a walk timeout on a search point), so a hunting guard
   never waits at a locked door.
4. S21: `ctx.alarmRaised` is the guards' command alarm, not the Sector Ops alarm stage: after a laser or camera stage-up
   the guards not involved stay holstered. Add `alarmStage > 0` to `calmArea`.
5. S21 open items from WALK.md: client puppets at low ready (needs a carry bit and a protocol bump); a guard seized while
   holstered hides his slung gun.
6. S20 fix: in a narrow gap the two guards brush past (up to ~2 s nearer than 0.65 m). Visual only.

## E2e to request (all `E2E_GPU=1`)
`e2e-stealth-ai` (bodies / witness asserts changed, A113), `e2e-sectorops` (all parts), `e2e-ctcourse`, `e2e-course`,
`e2e-ct-warehouse`, `e2e-stealth`, `e2e-tactics`, `e2e-takedown`, `e2e-coop`, `e2e-netmove` (`src/player` and
`src/game` changed). Note: an e2e waiting for a body search to end now waits up to 180 s.

GPU-lane visual (Test Runner, port 4189): a contact sheet of a calm patrol (rifle slung across the back `backC`, an
officer's pistol on the right thigh, ready hands with the armed carriage, no clipping), the draw on suspicion and the
holster after 15 s calm; two guards passing in a doorway (the squeeze).
