# S-e2e-fix: three e2e-ctcourse failures (Character Build verdict on 45458bbc)

Date 2026-10-23. Not committed by me (the job lead folded the files into WIP 4a8945f4). Desktop lane: port 4189,
`E2E_GPU=1`, `E2E_JOBS=1`, this worktree, `heavy.lock` taken 09:51 and released after the last run. No `src/net` change,
no wire change: `PROTOCOL_VERSION` stays 33.

| # | Failure | Cause | Fixed | Desktop evidence |
| --- | --- | --- | --- | --- |
| 1 | `:1` A1 variant host at (12.52, 2.52, 7.00) | engine: stale Havok support for one step after a kinematic move | yes (engine + e2e) | `:1` PASS 198 s |
| 2 | `:2` A3 relay jam 1 timed out | e2e: the host's damage was on, the lured cleaner shot him (plus a fragile aim) | yes (e2e) | A3 passes in full; `:2` then fails in A4 (new, not mine) |
| 3 | `:3` A6 holder's spot lit again, host 0.524 / client 0.188 | e2e race: the level read came before the client's `course` message | yes (e2e) | not run (`:3` is long; laptop) |

## 1. A1 variant: feet on the yard floor past the wall (12.52, 2.52, 7.00)

**Cause (engine).** Babylon's `PhysicsCharacterController.checkSupport` builds its answer from the contact manifold of
its last `integrate` (`node_modules/@babylonjs/core/Physics/v2/characterController.js:1118-1120`, the manifold is only
refreshed in `_integrateManifolds`, `:1558-1561`). `setPosition` does not refresh it (`:292`). During a kinematic
override (a hang, a climb, a team move) the controller only calls `setPosition` and returns before `checkSupport` /
`integrate` (`src/player/playerController.ts:470-478`), so the manifold still holds the floor the body left: for the
hang-drop, the wall top it stood on before lowering. On the let-go step `checkSupport` read that stale floor as support:
`grounded` stayed true for one step at the hang height. (12.52, 2.52, 7.00) is the hang pose exactly (lip 12.3 + 0.22,
lip 4.4 minus the hang). The e2e (`a1Gate.mjs`, old `until(grounded)` right after `!attached`) read that step; the host
page is in the background and pumped every 40 ms, so whether a step ran between the two reads was chance: the main leg
passed, the variant did not. Not the master 4.68.0 merge: no traversal / attach / controller file changed in it, only
`characterRig.ts`. A teleport has the same stale step (a teleport into the air read grounded for one step).

**Fix.**
- `src/player/playerController.ts`: `staleSupport` (`:181`) is set by the kinematic branch (`:473`) and `teleport`
  (`:360`) and cleared after the next `integrate` (`:668`). On that first free step a SUPPORTED answer stands only if
  `floorNear()` (`:422`) finds a floor under the centre or a rim ray (as `settleGap`) within `SETTLE.reach` under the feet
  and at most `STALE_TOP` 0.1 m over them (`:89`; a ray that starts inside a wall reads its own start). Otherwise the step
  is UNSUPPORTED and gravity takes over. One check per exit; the floor rays now share one filter bag (`FLOOR_QUERY`), no
  allocation. A kinematic move or teleport that ends on a floor (climb-up, vault, the e2e teleports) is unchanged.
- `tests/marlowStaleSupport.test.ts` (new, real Havok WASM on a NullEngine): grounded on the wall top; a let-go from a
  hang at (12.52, 2.52, 7) is airborne on its first free step and lands past the wall within 1.2 s with a real fall (> 2 m);
  a kinematic move onto the wall top stays grounded; a teleport into the air is airborne, onto a floor grounded. Before
  the fix the let-go and the teleport cases failed (`expected true to be false`); after, 4 / 4 pass.
- `scripts/e2e-ctcourse/a1Gate.mjs` `lowerAndDrop` (`:57-69`): waits for the landing (`!attached && grounded && y < 0.3`,
  6 s) instead of the first `grounded`, asserts it lands within 2 s of game time of the let-go (a stuck or hovering body
  still fails), and prints a drop diag (pose, support, override, attach / team state, partner) on a timeout.
- Same file, step 8 (`:223`): after the client turns the yard switch on again it waits for the client's wire to show group
  12 on before the parity read (the race of failure 3; it had passed by luck).

**Evidence.** Desktop `e2e-ctcourse:1` PASS 198 s (A1 + A2): host, variant host and variant client drops land at y 0.04
in 0.45-0.47 s of game time; the yard relit 0.583 / 0.583.

## 2. A3 relay jam 1: the host jams the camera (timed out)

**Cause (e2e).** The host's damage was on in A3, and step 3's corridor switch lured the armed cleaner to the west lobby,
where the host stands at the west jam post:
- The runner sets the host's `damageMul = 0` once at the match start (`scripts/e2e-ctcourse.mjs:306`). A part that starts
  at set 3, 5 or 7 starts with `scheduleRespawn(checkpoint, 0)` (`src/game/modes/courseMode.ts:242`), and the respawn's
  spawn protection ends on a wall-clock `setTimeout(2000)` at `damageMul = 1` (`src/game/gameState.ts:1869-1870`), which
  can land after the runner's line. (Part 1 is covered: the runner sets it again after its restart, `:345-347`.)
- `a3-sw-corr` off is a lights-out lure (`stealthSystems.ts` `toggle` -> `lightsOut`): the cleaner walks out of office 1
  to the switch at (78.6, 12.7) in the west lobby. A host-step watch caught the host at 93 hp at the west post (78.5,
  10.75) with the cleaner alerted at (75.7, 10.3) / (78.6, 3.3). A downed host cannot aim: run 2's jam diag showed
  `ads: false`, no pick, the eye at the hip camera (relay jam 1 timed out exactly as on the laptop). Once out of revive
  time the bay restarts at L2: runs 3-6 showed both players back in the L2 room, every A3 flag cleared, at "the pass zone
  sets a3-far" (the laptop's JOBS=3 timeout at a3-far1 is the same restart).
- Not the camera's 14 m cap (the jammer reaches 20 m, `JAMMER.range`; the post is 18.1 m from the lens), not the cooldown,
  not the 3.5 s wait, not the a3-far1 box: (98.5, 8.5) is inside `A3_FAR_ZONE` [97.3, 0.3, 99.7, 12.7].
- Second, latent: every fixed electric lamp is a jam target and the pick is the target nearest the aim
  (`jammer.ts` `pickJamTarget`). The corridor panel at x 96 hangs 0.6 m in front of the lens and 0.15 m higher: from the
  west post it is 0.0103 rad (0.6 deg) from the lens, lamps 84-96 all inside the 0.16 rad cone. An aim that drifts 0.005
  rad up jams the lamp.

**Fix (`scripts/e2e-ctcourse/a3OfficeRange.mjs`).**
- Both players unhurt for the set: `noDamage(A)` and the client's copy on the host at `damageMul 0` (as A6) after the
  start checks (`:171`), and `noDamage(A)` again plus "the host is unhurt" before the jam posts (`:224`), seconds after the
  respawn timer.
- Before step 4 the posts wait until the cleaner is calm and back on his office loop after the corridor lure (`:222`).
- `aimPick` (`:73`): after `aimAt` the aim is set from the game camera's own eye (`gamePos`, what the pick reads) a few
  thousandths of a radian under the lens, lower on each retry, until the page's `localPick` is the camera; it fails with
  the jam diag otherwise.
- Diags on a timeout: `jamDiag` (jam, cooldown, device phase, pick, eye, aim, ads / stance / pad / wheel, hp, cleaner),
  `zoneDiag` (each A3 zone's hallway state per player, feet, hp, cleaner, camera) and the host-step hurt watch.

**Evidence.** Desktop `e2e-ctcourse:2` run 7: all of A3 passes (start, send-back, dark send-back, window miss, relay,
swap, lure, to L3). The suite then fails in A4, which no earlier `:2` run had reached:
"timed out waiting for A4: the client gets the refusal" (`a4GoodsShed.mjs:177`): the host reads the console's "Take him
out" refusal, the client's `__course.debug().refusal` does not within 8 s. Not looked into (not in this task's files).

## 3. A6: the holder's spot reads lit again (host 0.524, client 0.188)

**Cause (e2e race, not an engine bug).** The relit switch is the map's gallery wall switch (group 61), not the drive
panel: no A6 gate is an isolator, and the held panel (`g-a6-panel`, a pickup gate) sets a flag only, no light group. The
client's group path is sound: `applyCourseWire` sets every group from the host's `lights.groups`
(`src/game/modes/courseMode.ts:1000-1003`, the same `setGroup` the host's `toggle` runs), and the host sends the
message on its next fixed step after the registry changes (`:539-544`, `:570-575`). But the host takes a client's `use`
when the message arrives, outside the step (`src/net/coopHost.ts:544-546`), so `stealth.switchOn(61)` is true on the
host before the `course` message leaves; the host page is pumped every 40 ms in the background. The e2e waited for the
host only and read both levels at once: 0.188 is the client's still-off level (the off read was <= 0.24 on both). The off
case passed because it waits for the client's wire first.

**Fix.** `scripts/e2e-ctcourse/a6PumpHouse.mjs:273`: wait for the client's wire to show group 61 on before the parity
read, as the off case does. The assert itself (host >= 0.4, |host - client| < 0.02) is unchanged.

**Evidence.** Code reading; the same race is in A1 step 8, now passing with the same wait. `:3` not run on the desktop.

## Laptop runs (Character Build)
- `e2e-ctcourse:2` and `e2e-ctcourse:3` (E2E_GPU=1, port 4189); `e2e-ctcourse:1` again to confirm on the laptop.
- `src/player` changed (the controller): the slice tier adds `e2e-coop` and `e2e-netmove`; `e2e-course` is worth one run
  (teleports and climbs go through the new first-step check).
- Expect `:2` to stop in A4 at "the client gets the refusal" until that is looked at.

## Recommendations (not done: outside this task's files)
- `scripts/e2e-ctcourse.mjs:306`: set the host's `damageMul = 0` after a 2.2 s wait (as the restart step at `:345-347`),
  so every part that starts past set 1 (A3, A5, A7) runs with the host's damage off. A3 now does it itself; A5 / A6 / A7
  / A8 do not at their start.
- A4 refusal on the client (above).
- Design notes for playtest: the west jam post is in the cleaner's lights-out path from the corridor switch (he walks into
  the west lobby and finds the jammer); and from the west post the x 96 corridor panel sits 0.6 deg from the camera's lens,
  so a player aiming slightly high jams the panel (a held jam could prefer its locked target within `cone * 2.5`).

## Checks
- `npx tsc --noEmit`: exit 0.
- `npx eslint src/player/playerController.ts tests/marlowStaleSupport.test.ts`: exit 0 (the e2e scripts are on eslint's
  ignore list; `node --check` on all three: ok).
- `npx vitest run tests/marlowStaleSupport.test.ts tests/player.test.ts tests/wallController.test.ts
  tests/editor/roofGeometry.test.ts` (every unit file importing the controller): all pass (4 new + 60).
- Desktop e2e: `:1` PASS 198 s; `:2` 7 runs (diagnosis), the last with A3 passing and A4 failing as above.
