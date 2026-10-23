# S-e2e-fix2: three e2e-ctcourse failures (Character Build verdict on 45a74383)

Date 2026-10-23. Not committed by me. Desktop lane: port 4191, `E2E_GPU=1`, `E2E_JOBS=1`, this worktree, one build
(11:10, `npm run build` exit 0, includes the A8 dresser's uncommitted files). `heavy.lock` per run (the job lead's rule from
11:4x on). All three causes are in the e2e modules; no `src/` change, no wire change.

| # | Failure | Cause | Fixed | Desktop evidence |
| --- | --- | --- | --- | --- |
| 1 | `:2` A3 "the cleaner walks toward office 1's switch" | e2e: players left in the west lobby when the corridor switch lures the cleaner there; a searching guard read as calm | yes (e2e) | A3 passes in full, ghost ledger 0 detections (run 2d); `:2` then fails in A4 (not mine) |
| 2 | `:3` A6 pass 2 "the host presses the exit release" | e2e: A held through a press row; the context menu runs a press row on A's release | yes (e2e) | `:3` PASS 404 s |
| 3 | `:4` A7 "the technician leaves R0" | e2e: the hall door opened while he walked toward it; he noticed the open door and investigated | yes (e2e) | A7 passes in full (run 4c); `:4` then fails in A8 (not mine) |

Suspects ruled out, with evidence:
- (a) dressing as a nav blocker: a scratch real-Havok test (`buildNavGrid` on the built `ctcourse` level, NullEngine, the
  bundled Havok WASM; deleted after) found every A3 loop point and A7 route point walkable, A* paths from office 2 to office 1's
  switch (via the communicating door) and every A7 leg as a clear line. The trolley (85.55-86.05, z 0.3-1.4) ends 0.4 m short
  of the communicating door's inflated band. The traces show both guards walking normally.
- (b) `playerController` staleSupport: guards do not use it (`Enemy.move` / `tryMove` walk the nav grid, `src/ai/enemy.ts:1601`, `:1746`).
- (c) the perf pass: render only. (d) the master merge c97b0123 is an ancestor of 45458bbc, where `:4` passed.
- `2e58f265` (gates on a door): A6's cage door has one gate (egress); `locked()` gives the same answer as before for it, and
  the unit case (`tests/ctcourse/a6PumpHouse.test.ts:426`) passes.

## 1. A3: the cleaner does not walk toward office 1's switch

**Cause (e2e).** Step 3 turns the corridor switch off from the west lobby. A switch off is a lure:
`StealthSystems.toggle` -> `EnemyManager.lightsOut` (`src/ai/enemyManager.ts:285`) sends the nearest calm guard to the
switch at (78.6, 12.7). Both players were left in the west lobby (the host at the switch, the client at the send-back spot
(77.8, 10.75)). The host-step trace (run 2b, step 4's wait, now strict) shows the cleaner in a loop for the whole 150 s:
`alert` / `seekCover` at (78.5, 6.0), `inCover` at (85.0, 0.5), `searching` towards the last known position (77.25, 9.75),
seeing the players again, `alert`, and so on.
The waits after it read "calm" as `!e.alerted`, and `alerted` is the combat level only (`src/ai/enemy.ts:463`,
`alertState.ts:92`): a guard `searching` (60 s, `ALERT.searchTime`) passed both "calm and back in the offices" (step 4) and
"calm in office 2" (step 7). A searching guard ignores a heard lure: `heard` moves the level only from unaware, cooldown,
suspicious and investigating (`src/ai/alertState.ts:124-160`); searching only times out. So step 7's lure did nothing when it
fell inside a search. That is the laptop timeout (30 s, sims x1.00). It passed in my run 2a and in the previous fixer's
run 7 when the search had ended by step 7. Not a game bug: a guard sent to a switch finds the players standing at it.

**Fix (`scripts/e2e-ctcourse/a3OfficeRange.mjs`).**
- Step 3: the host moves into the L2 holding room (`L2_HIDE`, x 72.5) before working the corridor switch (a test `use`, no
  reach). The client joins after its dark send-back. The host shuts the L2 far door (a player-closed door is never
  noticed). The switch goes back on. Steps 4-8 teleport both out as before; the door stays shut (no later step uses it).
- Step 4 and step 7 waits: calm = `aware.level` unaware or cooldown (on his loop), timeouts 150 s.
- `npcDiag` / `traced`: the guard is sampled every 1.5 s during the step-4 wait, the step-7 wait and the lure walk, and the
  trace is printed on a timeout.
- Header comment step 3 updated.

**Evidence.** Run 2a (old waits, diag only): A3 passed in full, and the suite failed in A4 (below). Run 2b (strict waits,
before the L2 hide): "the cleaner is calm and back in the offices" timed out at 150 s, with the fight / search trace above.
Run 2c (L2 hide, on heavy2.lock / port 4192): failed at "the L2 far door shuts (host)" after the host's door use. Most likely the motorised far door had already shut by itself, so the use opened it. The step now closes the door only if it is open, waits for it shut (`target` 0, `open` < 0.05) and prints a door diag on a timeout. Run 2d (that version, port 4192): A3 passes in full. The ghost ledger reads 0 detections (3 in run 2a): the cleaner never saw a player. The suite then fails in A4 as in run 2a.

## 2. A6 pass 2: the exit release never unlocks the cage door

**Cause (e2e).** `holdA` holds pad A until the condition holds. The exit release is a press device (`holdT` 0). Since the
G5 context menu, a press row runs when A is **released** ("releasing A runs the highlighted row",
`src/game/contextMenu.ts:6-9`, `step` `:244-247`). With A held until the unlock, the row never ran. Only hold rows (the
drive panel) run while A is down (`:234-241`). Pass 2 had never been reached before: on 45458bbc `:3` failed earlier (the
holder's light read, fixed by S-e2e-fix). Not 2e58f265: see above.

**Fix (`a6PumpHouse.mjs`).** New `tapA(P, id)`: A down until the host's list is open (`ctxMenu.state` active, row 1, the
`interactTarget` is the release), then A up. Pass 2 does `padReady`, `tapA(EXIT)`, then waits for the unlock (8 s). It
prints a diag on a timeout (nearest item, menu rows, lock, last press, team state, feet). `holdA` stays for the hold panel.

**Evidence.** Desktop `e2e-ctcourse:3` PASS 404 s (A5 + A6, pass 2 through the cage door and out).

## 3. A7: the technician does not leave R0

**Cause (e2e).** The step opened the hall door as soon as `walker.idx === 0`, which includes his walk south from R4
(84.4, 65.7) to R0. On that leg the open doorway (76, 61.6) is inside the open-door notice
(`StealthSystems.noticeOpenDoors`, `src/game/stealthSystems.ts:563-590`: 9 m, facing cos >= 0.2, clear line at head
height) between about z 63.5 (where row 2 stops hiding it) and z 63.3. Whether the 0.25 s check landed in that strip was
chance (passes on 45458bbc and in my run 4a). Trace (run 4b): noticed at (84.42, 62.93), suspicious, then investigating to
the door (76.67, 61.67), then cooldown and back on his loop at R3 / R4 (idx 3, 4, 0). R0 was not left in 30 s. This is the
game's rule working.

**Fix (`a7DataHall.mjs`).**
- The door opens while he stands **at** R0 (within 0.45 m, idx 0, not investigating or searching), facing east with the
  door 8.4 m behind him.
- After he walks west behind row 1, the host shuts the hall door again. From x 78.8 on that leg the open doorway is 4-5 m
  ahead of him.
- Header comment updated; the guard trace on both waits.
- Second fix, same step 6 (found once A7 got past R0, run 4a: "the client starts 0.5 s after the host, inside the
  window ({at: 1.6})"). The client's mirror of the scanner pair gets the host's hack time only in the `course` message. That
  message is sent on a phase change or every `COURSE_SEND` 2 s (`courseMode.ts:571`, `scanners.ts:184`); the client does
  not run the time on between messages (`ctDevices.frame` advances jams and cameras, not scans). So a client-frame trigger
  on t >= 0.5 fired at whatever the next message carried. Now the host's clock times it: wait on the host for its hack
  0.5 s in, `use(B, T2)`, and a host-step hook reads the host's t when it takes the client's start. The assert is
  unchanged (0.5 <= t < 1.5).

**Evidence.** Run 4c: A7 passes in full (the door at R0 and shut again; the client's start taken at host t 0.58; cage, pod,
L7). `:4` then fails in A8 "the night circuit is off on the host" (10 s), not in my files (another agent is dressing A8,
uncommitted).

## Desktop runs (port 4191, E2E_GPU=1, E2E_JOBS=1)
| Run | Suite | Result |
| --- | --- | --- |
| 4a | `:4` (diag only) | A7 R0 passed by chance; FAIL A7 sync "at 1.6" (fixed) |
| 4b | `:4` | FAIL A7 R0 with the trace (cause 3) |
| 4c | `:4` (A7 fixes) | A7 PASS in full; FAIL A8 night circuit (not mine) |
| 2a | `:2` (diag only) | A3 PASS in full; FAIL A4 "the camera cues are hidden on the host" (not mine) |
| 2b | `:2` (strict calm waits) | FAIL A3 step-4 wait with the fight / search trace (cause 1) |
| 2c | `:2` (L2 hide, port 4192) | FAIL A3 "the L2 far door shuts" (the door had shut already; fixed) |
| 2d | `:2` (final A3, port 4192) | A3 PASS in full (0 detections); FAIL A4 "the camera cues are hidden on the host" (not mine) |
| 3a | `:3` (A6 tap) | PASS 404 s |

## Not done / open
- Character Build: `e2e-ctcourse:2` (A3 passes on the desktop; A4's failure is someone else's), `:3`, `:4` (A7 passes on
  the desktop; A8 is the A8 agent's).
- A4 (`a4GoodsShed.mjs`): "timed out waiting for A4: the camera cues are hidden on the host" (3 s), after "the floor switch
  lures D1; the restart". Not looked into (not in my files).
- A8: "the night circuit is off on the host" (10 s). The A8 agent's files.
- Runner request: none needed.
- Design notes for playtest (no change made): (1) the A3 corridor switch sits in the west lobby, where players wait. Turning
  it off brings the armed cleaner to them. (2) A client's scanner hack progress mirrors at 2 s steps between phase
  changes. That is a visual jump on the client's HUD, if it shows the time. `ctDevices.frame` could run `t` on as it does
  for jams (not done: not in my files).

## Checks
- `node --check` on `a3OfficeRange.mjs`, `a6PumpHouse.mjs`, `a7DataHall.mjs`: ok.
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/ctcourse/ tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/voxelFit.test.ts`: 12 files,
  496 passed, 1 skipped.
- eslint: no `src` file changed (the e2e scripts are on eslint's ignore list).
