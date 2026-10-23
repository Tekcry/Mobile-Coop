# E5 check - EW9 alarm-stage actions (checker: Opus, 2026-10-23)

Commit checked: 417c7560 (base 95097957), branch feature/sector-redesign-e5. Read-only: nothing edited but this report.

## Verdict: FIX (2 small blocking items)

The lights, restart undo, co-op mirroring, response route and dogs stub are sound. The lockdown door's "never a
softlock" promise has two holes: the data check does not cover a player shut in behind the door, and the runtime lock
shuts the door on a player standing in the doorway. No map uses `stageActions` yet, so nothing is broken in play today,
but EW9's lockDoors is not done until both are closed.

## Checks
- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run tests/sectorStageActions.test.ts`: 11 passed.
- `npx vitest run tests/sectors.test.ts tests/sectorRestart.test.ts tests/sectorSlice0.test.ts tests/navClosure.test.ts`: 47 passed.
- No build, no e2e (as briefed).

## Blocking fixes (ranked)

**1. The softlock check misses a player locked in on the far side of a lockdown door.**
`src/game/sectorStage.ts:139-165` (`softlocks`) only judges start -> objective, checkpoint -> objective and
objective -> exit. A lockdown door that is the only door of a side room passes the check (the S3 "store locks at stage 2"
is exactly that shape), and a player inside the room when stage 2 hits is shut in until a restart. In co-op, one player
on each side of the door is the same case.
- Done looks like: for each lockdown door (found by `doorAt`), two extra legs: from a point 0.8 m either side of the
  doorway centre along the door normal to the exit centre, each judged only when it had a nav path unlocked (the
  current rule). With all lockdown closures shut, both must still reach the exit. Tests: a one-door side room lockdown is
  rejected; the same room with a back corridor passes.

**2. A lockdown door is forced shut on a player standing in it.**
`src/game/modes/sectorMode.ts:294-300` (`lockDoor`) calls `doors.setOpen(d, false)`, which ignores occupancy
(`src/world/doors.ts:272`). The door's static body is added when the leaf closes (`doors.ts:376`), with no
depenetration. The repo itself notes that "a door forced shut on them would pin them" (`src/config/course.ts:12`). That
is why the connector waits on `AIRLOCK_DOORWAY_CLEAR`. Connector and team doors only lock when nobody is there (at the
start or during a cycle). Lockdown is the first lock that fires mid-play.
- Done looks like: `SectorStageRun.raise` marks a lock pending. The mode locks it, and shuts its nav closure, only when no
  living player's feet are within `DOOR.clearance` (0.75 m) of `d.cx, d.cz`. Check both co-op players with
  `g.playerRefsInto(this.refs)`. Pending locks are retried in `fixedUpdate` (a plain loop over the locks, no allocation),
  and `release()` drops pending ones too. Test: a player at the doorway centre at stage 2 keeps the door unlocked until
  they step 1 m away, then it locks.

## Judged and fine
- **Restart and section change.** `unloadSection` (`sectorMode.ts:324`) releases every lockdown door and opens its nav
  closure, on both a cycle and a restart. On a restart the order is:
  1. Release.
  2. `startState.apply`. It skips locked doors, so the now-unlocked lockdown door gets its start open/shut state.
  3. `beginSection(false)` reapplies the restored stage's actions.
  Lamps come back through the start state. The start state is taken after the carried stage's actions, so a section
  entered at stage 2 restarts lit and locked. A cycle-time restart (`CONN_UNLOCK_FAR`) takes the start state, then
  reapplies: correct. Lights forced full are not undone at a section change. That is by design, because the alarm
  carries over (S1 in the builder report). The response route is a per-stage slot, so there is nothing to undo.
- **Co-op.** `SectorMode` runs on the host and in solo only. Lights go through `LightRegistry.setGroup` (a version bump),
  so slice L's `lamps` message carries them (`src/net/lampSync.ts:160`). Locks reach the client in `lk`
  (`coopClient.ts:637`) and are sent at once (`secT = 0`). The door shut follows the snapshot like every other host
  door. No protocol change, no desync.
- **Light parity.** There is one path, `setGroup`. The baked lamp field follows the registry version
  (`bakedLamps.ts:258`), and the meter and guard perception read the registry. Shot lamps stay out, and jammed lamps take
  the base. `syncSwitches` keeps the wall-switch labels right.
- **Hot path.** Nothing runs per tick. `raise` and `reinforceSlot` allocate only on a stage change, and closures are built
  at the start only. `sectorStage.ts` imports `hyp2` and types only, with no `src/net` import.
- **Response route and dogs.** Slots get `route`, and the mode's `fill` hands it to `setPatrol`. `dogsReleased` is a flag
  reset on release. Fine as a stub.

## Merge into feature/sector-redesign-int (b71a9894)
Expect textual conflicts in `sectorMode.ts` and `sectors.ts`. The nav closures do not clash at runtime: they use separate
closure ids and the same 0.35 / 0.5 sizing as `TEAM_NAV_*`. Four things must change at merge:
1. `src/game/modes/sectorMode.ts`
   - `start()`: int has `this.team.build(); this.findKeypads();` in place of `findBolts()`. Put `this.findStageDoors();`
     after `this.findKeypads();`.
   - `raised()`: keep E5's loop (`reinforceSlot`, the `n` count, no `reinforce.length === 0` early return) and the
     `if (s && stage > from) this.stageActions(from, stage);` line. Push `{ k: -1, slot, alerted: true }`, because int's
     `Pending` has `k`.
   - `unloadSection()`: add E5's `if (this.stageRun?.release()) this.secT = 0;` after `g.enemyMgr?.despawnAll();`. Int
     added `this.slotEnemy.length = 0;` before it; keep both.
   - `beginSection()`: add `this.stageActions(0, this.run.alarm);` before `if (kit) {`, so int's E4 `markGroupOn` block
     still runs after the take.
   - `debug()`: add `lockdown: this.stageRun?.lockedCount() ?? 0,` beside `keypads`.
2. `src/game/sectorStage.ts:114-121` (the `checkStageActions` fixed list): also push every `d.pairGates[].door` and every
   `d.keypads[].at`. Without this, `release()` in `unloadSection` would unlock a lockdown placed on a keypad or pair-gate
   door. Int's `restartSection` calls it after `team.reset` / `rekey`, so the keypad door would open with no code.
3. One closure helper: make `SectorTeamDoors.navClosure` (`sectorTeamDoors.ts:142`) build through E5's pure
   `addDoorClosure(nav, { cx: at[0], cz: at[1], yaw: a.yaw, width: a.width, y: a.hinge.y })`, then call
   `setClosed(id, true)`. Drop `TEAM_NAV_ALONG / TEAM_NAV_ACROSS` for `STAGE_NAV_*` (rename them `DOOR_NAV_*` if wanted).
   `addDoorClosure` has to stay pure, because the map-test softlock check uses it without a `DoorState`.
4. `src/game/sectors.ts`: keep int's `checkSectors` body. Take E5's `nav?: StageNavCheck` parameter and the final
   `out.push(...checkStageActions(defs, nav));`, and add the `stageActions?` field beside `pairGates` / `keypads`.

## Polish (not blocking)
- E4 interplay: `lightsFull` during a running isolator window lights the circuit while the board still reads "Circuit
  isolated". The window's end is then a cue with no effect. Decide whether a lockdown cancels running windows on its
  groups (`boards` has `cancel`). On int, `syncSwitches` already calls `followBoards` for idle boards.
- A guard standing in the doorway when its closure shuts is left in a closed nav cell. Check that `findPath` from a closed
  start cell steps out, or add guards to the occupancy test in fix 2.
- Map tests must call `checkSectors(defs, { nav, doorAt: doorFinder(anchors.doors) })` once the S2 / S3 data lands.
  `checkSectors(defs)` alone does not run the softlock check.
- The check judges the guards' nav grid, so a route only players can take (a climb) does not count as another way. Note
  this in the S2 data: the NE stair roof route must be on the nav grid or be checked by hand.

## Fix round (implementer: Opus, 2026-10-23)

Both blocking items fixed. No protocol change; polish items and merge notes untouched.

**1. Softlock check covers a player shut in behind a lockdown door.** `src/game/sectorStage.ts`
- `STAGE_SIDE_STEP = 0.8` (:49). `softlocks` (:145-) keeps each found door's info (:150) and, per lockdown door, adds
  two legs from 0.8 m either side of the doorway centre along the door normal `(cos yaw, -sin yaw)` to the exit centre
  (:169-178). They are judged by the existing rule: only when the leg had a nav path with the doors unlocked. Message:
  `<id>: the stage lockdown doors leave no nav path from beside the lockdown door (cx, cz) at (x, z) to the exit (a softlock)`.

**2. A lockdown door never shuts on a player.** `src/game/sectorStage.ts`, `src/game/modes/sectorMode.ts`
- Pure helper `doorwayClear(cx, cz, players, clear = STAGE_DOOR_CLEAR)` (`sectorStage.ts:228`): false while any living
  player's feet are within 0.75 m (plan, `hyp2`) of the doorway centre. It is a plain loop with no allocation.
  `STAGE_DOOR_CLEAR = 0.75` (:54), and a test keeps it equal to `DOOR.clearance`.
- `SectorStageRun`: each lock has a preallocated `pending` flag, plus a `pendingN` counter.
  - `raise` marks the reached locks pending, then calls `step()`, so a clear doorway still shuts at once.
  - `step()` (:302) shuts, locks and closes the nav of each pending lock whose `hooks.canShut(door)` passes. It returns
    at once when nothing is pending.
  - `release()` (:322) drops pending locks without calling the unlock hooks.
  - `lockedCount()` counts shut locks only. `pendingCount()` is new.
- Mode: hook `canShut: (d) => doorwayClear(d.cx, d.cz, g.playerRefsInto(this.refs))` (`sectorMode.ts:263`) checks host
  and partner. `fixedUpdate` calls `if (this.stageRun?.step()) this.secT = 0;` every tick (:624), so a late lock reaches
  the client's `lk` at once. `playerRefsInto` runs only while a lock is pending.

**Tests** (`tests/sectorStageActions.test.ts`, 11 -> 18)
- Softlock:
  - A one-door side room locked down is rejected, with exactly one error (the room side).
  - The same room with a back corridor passes.
- Doorway:
  - `doorwayClear` cases: occupied, partner, down player, 1 m away, and `STAGE_DOOR_CLEAR === DOOR.clearance`.
  - Occupied: the door waits pending, stays open and nav-walkable while the host or the partner is in the doorway, then
    shuts on the next `step` once clear.
  - Clear at the stage: the door shuts at once.
  - `release` drops a pending lock: it never shuts later, and the stage relocks it after the restart.
  - Source asserts for the mode's hook and the per-tick `step`.

**Results**
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/sectorStageActions.test.ts tests/sectors.test.ts tests/sectorRestart.test.ts tests/sectorSlice0.test.ts tests/navClosure.test.ts`:
  5 files, 65 passed (sectorStageActions 18).
- eslint on the 3 changed source and test files: clean.
- No build, no e2e.
