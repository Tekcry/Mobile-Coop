# W482 S3 (X2b + X3) and S4 (X5) check

Checker: fresh Sonnet. Head `feature/marlow-walk482` 54fc7eca (S4 = 57f1391e, S3 = 54fc7eca). Read-only on code.

## Verdict: PASS

No must-fix. Everything the brief asked for is built, playable and pinned by tests.

## Must-fix

None.

## Evidence

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run` on the five named files (single files, no CTLIGHT_WRITE): 5 files passed, 155 tests passed, 1 skipped (no `.skip` in these files).
- `node --check scripts/e2e-ctcourse/a2CarriageShed.mjs`: OK. The e2e itself was not run (laptop queue).

### 1. A2 completes
- Both co-op routes are walkable. Floor route: gap 2/3 is open floor from x 34 to 69 along z 12.5, then (66, 12.5) to (68.8, 13.4) to cabinet 2. The lane count at x 45.75 / 56.25 is exactly 2 (4 with the closures removed, so the test has teeth). Route 2: deck, screens and east stair are untouched. Watchers stand at z 17.9 (body z 17.6-18.2) behind the screens, leaving about 1.3 m of deck (z 18.5-19.45) for the leg-up route; a test pins that nothing stands inside either watcher's body circle.
- Shunter: slot untouched and first in the squad. Gap 1/2 stays open; his loop legs and the lured walk pass `dressWalk`. Timing holds: the dark crossing is about 8.8 s of the 15 s window; B's run from (41, 12.5) to cabinet 2 is 16.7 s against the 18 s re-arm.
- Squad = [shunter, watch-w, watch-e] = 3 = `SET_GUARDS_MAX`; all `grunt`, none passive, so all armed.
- Closures: 4 solid, `noLedge`, 0.5 m thick, 2.5 m and 4.4 m, inside the greybox boxes. `soloJumpThreats` is empty. The cess pocket and the north pocket (west of x 45.5, and east of 56.5) open onto floor on their far side, so nothing traps a player. Nothing in x 45.5-56.5 is near a door: the only A2 doors are the cabin's (x 28-32) and L1 / L2 (x 28 / 70). No collision box touches the L2 door.

### 2. Watchers and posts.ts
- `post { leash: 0, highSecurity: true }` is valid. `clampToLeash` returns the post for leash 0, `mayLeave` is false, and `lightsOut` lures a secure guard with `lureTo` instead of sending him. Spawned at y 4.4 through `spawnSquad` and `placeSlot`, so they hold the deck. A cut neck only turns them (the bearing to the fixtures is about south, inside the +-0.6 rad sweep).
- Yaw pi = -z = south (Enemy yaw 0 = +z). Both see the lit crossing, the lane mouths and the neck middle at head heights 1.05 and 1.7. Teeth: a fake wall blinds them in the test.
- Hidden waits checked by hand: (41, 12.5) from both watchers is blocked by the road 3 van. The builder's wait deviation is justified: from (42, 11.6) the east ray grazes the van edge at x 46 and sees the player.
- Perception: the 100 degree half-FOV leaves the deck behind the watchers blind. Within 1.8 m a crouched or silent walker stays under the 0.2 leak rate. Standing walk is in the silent footstep band (speed <= 2); only a jog is audible.

### 3. X3
Clear. Road 2's east stop and its skins are not built (`NO_STOP`). Walks at z 9.4 / 10 / 10.6 from x 66.4 to 69.7 are open, and the old stop put back blocks them (teeth). Only a 2 cm rail head is left on that floor. Starting the test walk at x 66.4 is fine: the east rake ends at x 66.

### 4. X5
- Lounge shell interior is x 0.25-5.75, z 8.25-13.75. Lockers (x 1.0-4.6, z 8.25-8.75 and 13.25-13.75, 1.9 m) sit flush on the flats, one solid `noLedge` box each plus 2 cm skins. Nothing clips a wall. The cabinet is 4 `kitCaseWall` at x 0.25, z 8.6-13.4, fronts facing +x (run yaw plus `flip` derived by hand; it agrees with the old yaw pi/2 prop).
- Benches at (3.4, 9.5) and (3.4, 12.5), 1.8 x 0.45: z 9.275-9.725 and 12.275-12.725, x 2.5-4.3. They sit 0.525 m off the locker faces (z 9.45 / 12.55 would give 0.475, under the 0.5 rule, so the deviation is correct), 1.45 m off the east wall. The aisle is z 9.725-12.275 and the door at x 6, z 11 is clear. Spawns (2, 10) / (2, 12) are 0.5 m from the bench ends.
- Tests pin all of it (bench to wall, locker and cabinet >= 0.5 m; lockers noLedge and >= 1.8 m; spawn walks to the door).

### 5. e2e script
Coherent with `courseMode.ts`: `mode.restarts`, `window.__course.radioLine`, `wire.rl`, `checkpointPos()` and `Enemy.secure` all exist. Step 2b waits for `restarts === r0 + 1` (45 s); the 1.5 s `SPOT_HOLD` starts at the bay restart, so fresh guards cannot re-fail. CROSS (51, 12.5) and WAIT (41, 12.5) are used consistently in steps 1-6. Light thresholds (lit >= 0.55, dark <= 0.24) match the baseline (crossing 1, cut 0.14). Guard order [shunter, w1, w2] matches `enemies`.

## Should-fix (none blocks)

1. `scripts/e2e-ctcourse/revive.mjs` SURFACES[2]: the A2 staging revive stands both players on the deck at x 33-34.2, z 18.1-18.6 with both watchers live, 13.8-15 m from the west watcher. That is beyond the 12 m peripheral range and perpendicular to his facing, so it should not spot, but it is the one other e2e where a spot restart could land mid-test. Confirm in the laptop run; if it flakes, pacify or kill the watchers before `reviveOn` for set 2.
2. `a2CarriageShed.mjs` step 2b `radioLine` check: `radioLine` is overwritten by the next queued line after `RADIO_GAP` (3 s). The poll is 50 ms and the queue should be empty, so a miss is unlikely. If it flakes, also assert `radioN` rose.
3. West wait margin: at (41, 11.6) the east watcher's ray clears the van roof (3.4 m) by about 0.3 m at 1.7 m head height, about 0.2 m at a real 1.8 m. If a playtest shows the waiter spotted, move the wait to x 39-40 (the taught centre line z 12.5 is safer).

## Polish

- `STOPS` / `NO_STOP` name the sides inverted (`side 'w'` is the east end at x 68.6). Rename or comment.
- The hidden-wait test has no matching teeth case (vans removed, wait becomes seen). The positive sight tests and the fake wall cover the sight function.
- Route 2 passes 0.6-1.5 m behind the watchers on loud metal (x 1.6). Fine crouched or walking; a jog would carry.
