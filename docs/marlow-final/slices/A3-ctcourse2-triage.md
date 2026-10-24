# A3 e2e-ctcourse:2 triage - "the cleaner is calm and back in the offices after the corridor lure"

Job marlow-polish (PR #257), branch `feature/marlow-polish` at 17d44d96. Opus triage, 2026-10-23. No laptop trace was
available (none on `origin/laptop-queue`); the cause is worked out from the diff, the AI code and a headless replay of the
guard's search points on the runtime nav grid.

## Verdict
- **Cause: the test, not the game.** 1bde5328 ("A3 step-4 lure flake") reordered step 3 so the cut and the dark send-back
  land 6-9 s after step 2's send-back, right when the cleaner stands searching in the corridor. He sees the client at the
  send-back spot, goes to combat, and his search round that spot runs through the L2 far door into the room the players
  hide in. With damage off nobody goes down, so he fights and searches for the whole 150 s wait.
- **Confidence: medium-high.** The mechanism is confirmed headlessly (search points below) and matches the one trace we
  have (mf-fix4-2b: in combat at x 75 inside L2). The exact moment he saw the client is inferred: no laptop trace.
- **Fix: test only**, `scripts/e2e-ctcourse/a3OfficeRange.mjs`: step 3 waits (150 s, traced) until the cleaner is calm and
  back on his office loop before the corridor cut. The same predicate as step 4, now a shared `calmOnLoop` helper.

## What changed between pass and fail
- `git log $(git merge-base HEAD origin/master)..HEAD` (merge-base 16caeacd, in master): 27 commits. A3 game files
  (`a3OfficeRange.ts`, `facility.ts`, `src/ai/**`) have the same blobs at the merge-base, 1bde5328, d0689dd8 and HEAD.
  `facility.ts` and `a3OfficeRange.ts` also match origin/master.
- Game changes up to 1bde5328 (first 3/3 fail) since the merge-base: `ctDevices.ricochetRay` (client only, cosmetic),
  `nearestHousing` (the host's `shotRay` refactored, same result), sector-mode / net rating rejoin. None touches the host's
  guard in Course mode. Later polish items (A2/A4/A6/A8 rails, the A6 lamp) are outside A3. No A3 test change after d0689dd8.
- origin/master's `src/ai` differs from the branch (c28e66c0 vs 550335df): guard-ai S9 barks, S22 consoles, A126 carry
  pose, gear parts. Nothing touches search, device response, doors, perception or return to the route. A3 has no consoles.
- The test, the one A3 change on the branch: master (train 32 pass) runs 8a392db6. The old order: the cut at once, a 3.5 s
  wait, the dark send-back, then the client into L2 and the door shut. 1bde5328 (47751771) puts both players in L2, shuts
  the door, waits 3.5 s, then cuts and takes the dark send-back. Old order: 2 of 3 passes on the desktop (S-e2e-fix4). New
  order: 0 of 5 on the laptop.
- G45 glass (clear glass passes `MASK.SIGHT`, `src/physics/groups.ts:21-35`) is already on the branch. The L2 slot is
  `facility.ts:73` (`SLOT`, z 11.95-12.45 on the 0.5 m wall at x 76). From any lobby point, a line through the slot needs
  |dz/dx| <= 1 inside the wall, so it covers only z of about 11-13.4 in the room. d0689dd8's hide spots (z 8.2) are out of
  that view, so the slot is not the cause. That is why d0689dd8 did not fix it.

## Mechanism (file:line)
1. Step 2's send-back is a camera alarm. `CtDevices.onCamera` (`src/game/ctDevices.ts:1116-1119`) calls `alertAt` ->
   `EnemyManager.deviceAlert` (`src/ai/enemyManager.ts:813-821`, wired at `src/game/modes/courseMode.ts:292`). The board
   sends the calm cleaner (`incidents.ts` S17). `Enemy.respondDevice` (`src/ai/enemy.ts:1377-1387`) starts a device search
   round (87, 10.75), at a run (S19 `rush`), for 60 s (`alertState.ts:29`, `response.ts:68-87`). Searching sight is x 1.6
   (`alertState.ts` `SENSITIVITY`).
2. ctcourse has **no rooms** (`layout.rooms` is empty, probe below). So `searchRoom` is null, and the search is the plain
   ring out to 11 m round the spot, wherever it lands (`enemy.ts:2214-2235`). The same goes for a combat search.
3. The new step 3 makes the cut at about T0+5.5 s and the dark send-back at about T0+8-9 s (T0 = step 2's send-back). He has
   arrived and is looking round at the first ring points, (87.25, 10.75) and (87.25, 11.75), 3 s each. That is 9.5 m from the
   send-back spot (77.8, 10.75), on the corridor's centre line. The client stands there in the lit lobby (circuit 34) until
   both pages confirm the send-back. Contact.
4. After contact, the search round that last known position (plain ring, slot 0, nav-snapped) is k0 (77.75, 10.75), k1
   (77.75, 12.25), k2 (82.25, 9.75), then **k3 (73.5, 5.2) and k4 (72.6, 18.7): both routed through the L2 far door into
   the L2 room**, and k7 (67.7, 15.3) through L2 into A2. The L2 far door is not locked (`CourseState.locked('L2-far')` false
   at set 3). A shut door that is not locked is opened on his way (`enemyManager.ts:532-539` `doorStep`, guard-ai S20
   `doorGate.ts`). Inside, he has both players in plain view at 2-4 m.
5. Before 1bde5328 the dark send-back came at about T0+7.5 s, also inside his corridor look-round: the same exposure, a coin
   flip on his facing (2 of 3). The reorder moved it to when he faces back west from k1. In the new order it failed every
   time.

The device search alone is safe for the players in L2. Its ring round (87, 10.75), replayed on the runtime nav, never routes
west of x 76.3. The nearest pass is 1.12 m from the L2 door centre, just outside `DOOR.enemyReach` (1.0 m). Its 5th point
(north of the set, unwalkable) sends him east through L3's near door, which is unlocked, to L3's far door, which is locked.
He waits there until the search runs out, then walks back. That fits the step-4 wait that passes on master.

## Fix
`scripts/e2e-ctcourse/a3OfficeRange.mjs`:
- New helper `calmOnLoop(what, msg)` next to `traced`: the existing step-4 predicate (unaware or cooldown, x > 79.6,
  z < 8.7, or no live guard), 150 s, traced.
- Step 3: after the players are in L2, the door is shut and the 3.5 s hold has passed, `calmOnLoop('A3 calm before the cut',
  'A3: the cleaner is calm and back in the offices after the first send-back')`. Then the cut and the dark send-back.
  - From his loop the corridor and the lobby are out of sight (walls, shut doors; `tests/ctcourse/a3OfficeRange.test.ts`
    "he reads no further than his office"). So the cut lures nobody.
  - The dark send-back's alarm sends him from the offices. The client is back in L2 (under a second) before he reaches the
    corridor (at least about 5 m and a door away).
- Step 4's wait uses the helper. The assert text is unchanged, so the logs compare with the earlier runs.
- The header and comments are updated. The changes fragment has one line.
- Cost: one more device search (about 60 s plus his walk back) per run of the set.

Files: `scripts/e2e-ctcourse/a3OfficeRange.mjs`, `changes/feature-marlow-polish.md`, this report. No game file.

## Checks (desktop, no e2e)
- `node --check scripts/e2e-ctcourse/a3OfficeRange.mjs`: ok.
- `npx tsc --noEmit -p tsconfig.json`: pass.
- `npx vitest run tests/ctcourse.test.ts tests/ctcourse/a3OfficeRange.test.ts`: 2 files, 81 tests pass.
- Scratch probes (a temporary `tests/zzScratchA3Triage.test.ts`, deleted): ctcourse rooms (0); A3 door anchors; the device
  and combat search rings on `tests/helpers/runtimeNav.ts`; door locks at set 3 (L2-far false, L2-near true, L3-near false,
  L3-far true). They were not kept as regression tests: they replay the ring maths, not the guard's walker.

## For the laptop
- Rerun `e2e-ctcourse:2` (`scripts/e2e-ctcourse/a3OfficeRange.mjs`) on the commit carrying this fix, GPU, 2 runs. It is a
  test-script-only change, so a pass also counts for 17d44d96's game code (CLAUDE.md test-runner rule).
- On a failure, send the `A3 calm before the cut: guard trace (host)` or `A3 calm: guard trace (host)` block. The `lvl`,
  `st`, `stim`, `spot`, `feet` and `pos` rows show whether he still reached the players (x < 76) or stalled elsewhere.

## Open
- A game question for guard-ai, not this job: with no rooms on ctcourse, a combat search round the send-back spot opens a
  holding room's far door and searches the previous set (k7 lands in A2). Michael may want searches kept to the set, through
  rooms on ctcourse or a leash. Logged here only.
