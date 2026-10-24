# S22 (game side) - fresh check

PASS (fresh Opus checker, 2026-10-23). Scope: `git diff 0e6fa9ef 08586783` (fa6230b6 wiring + unit tests, 08586783 the
A4 e2e), read against `slices/S22.md`, CLAUDE.md's hard rules and the S22 AI code it calls (`src/ai/consoleFault.ts`,
`EnemyManager.consoleState` / `watchesConsole` / `consoleStep` / `consoleReset` / `resetMemory`).

## Checks run
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/courseConsole.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/consoleFault.test.ts`: 3 files,
  73 tests, all pass.
- `node --check scripts/e2e-ctcourse/a4GoodsShed.mjs`: clean.
- No e2e run (checker scope). `e2e-ctcourse` (A4) and `e2e-coop` still to run on the laptop.

## Blocking findings
None.

## What was checked
- **Matches the spec.** The code matches the plan in `S22.md` "Game-side wiring" exactly: `CourseState.consoleBack`
  (courseState.ts:901) ends the loop through `endWindow`, the same path as the loop running out (flag cleared with a
  `flagCleared` event, gate closed, re-arm started), and returns false when the flag is not set. `consoleHost` is set in
  `start()` only when the map has consoles (courseMode.ts:270) and is nulled in `dispose()` (:949). The refusal uses
  `watchesConsole` at the console device (:391). `consoleEdge` runs on `flagSet` (off) and `flagCleared` (on) (:667-671,
  :778). `consoleBack` only marks the mode dirty (:792).
- **Host-only authority and co-op.** Only the host runs the console logic. A puppet (the client) builds no
  `EnemyManager` and no `CourseMode` (gameState.ts:655): the client reaches the course only through `applyCourseWire`. It
  sees the flag in `wire.s` and the cameras in `wire.sec`, both built from host state, so it never runs `consoleBack`
  and cannot reset a console. The client's own press reaches the host's `press(cid, 1)`, which goes through the same
  refusal and the same `consoleEdge`. No new `src/net` import, static or dynamic.
- **Reentrancy.** `enemyMgr.update` runs before `mode.fixedUpdate` (gameState.ts:1908 / :1925). A guard's reset pushes
  its events from inside the guards' update without calling `handle`. The same frame's `handle` then sends
  `flagCleared`, the cameras and the wire, and `consoleEdge(on)` is a no-op because `consoleReset` already set `on`.
- **A restart forgets consoles.** `st.restart()` emits `bayRestart`, then `dropSquad(true)` calls
  `EnemyManager.resetMemory`, which runs `consoles.clear()`. That clears the tampering clock too. The restart deletes
  the bay's flags without a `flagCleared` event, but the table is already gone. In the one frame between the restart and
  `handle`, a guard who reached the console would get `consoleBack` false (the flag is gone), so nothing breaks. The next
  press registers the console again as a fresh cut.
- **Allocation.** Nothing new runs per frame. `consoleEdge` runs only on a flag event, and its `for...of` matches the
  `flagSet` case beside it. The host closure is built once in `start()`. `consoleBack` allocates nothing. No `Math.hypot`
  in `src` (the e2e page code uses it, as the rest of the suite does).
- **Strict TS.** Clean. The `this.layout!` at :390 is safe because `con` was found in `this.layout?.consoles`.
- **The e2e asserts cannot pass by accident.**
  - The refusal waits first for `watchesConsole` to be true at his post, then for the guard-up text, which is not the
    re-arm or already-off text.
  - The press-through waits first for the distraction to take effect: `incident >= 0` and not watching.
  - The notice and the reset are counter deltas, with exactly one of each asserted. `consoleResets` only moves when
    `consoleHost.reset` returns true, so a loop that runs out cannot pass for a reset: it fails the step.
  - Flag cleared and cameras online are checked on both pages. The gate is closed with the re-arm above 0.
  - The officer must still be calm, with no change to the alarm.
  - The second press checks LANTERN's line with a counter delta (`rln0`).
- **Implementer's risks (all fail loudly, none passes by accident):**
  - Noise does not reach him at tier 2: the 8 s wait for `incident >= 0` fails.
  - The 40 s notice wait plus 20 s reset against the 60 s loop: hearLook 2.4 s + about 4 m walk + investigateLook 4 s is
    about 10-15 s before he is free, so the margin is wide. If the loop ever ran out first, the reset wait fails
    (`consoleBack` false).
  - An L3 sightline that alerts him: `consoleFree` goes false, so the notice wait fails, and so does the `!alerted`
    assert.

## Polish list
1. `scripts/e2e-ctcourse/a4GoodsShed.mjs:198-206`: the client's own guard-up refusal (`ref` / `rn` carrying
   `CONSOLE_GUARD_UP`) is no longer covered, only "already off" and "rebooting". Done looks like a client press from a
   spot in reach that the officer cannot see, while he watches the console.
2. `src/game/course/securityRoom.ts:28`: `CONSOLE_GUARD_UP` still reads "Take him out first." Now that a distraction
   lets the press through, consider the spec's optional "Take him out or draw him away first." (Marlow's call, A134).
3. `a4GoodsShed.mjs:223`: if the loop ever runs out before his reset, the failure reads "turns the console back on".
   Logging `gateTimer` at the notice would say why at once.
4. A134 as written: an alerted officer (in combat at the console) does not refuse the press, because `consoleFree`
   needs him calm. This is intended, but worth a line in Michael's playtest notes.
5. `courseMode.ts:391` / `:785`: the device `y` is taken as the console's floor (screens at y + 1.1 m). A4's device works
   (the e2e asserts `watchesConsole` at his post). A later map that places a console device at button height would aim
   the screen point 1.1 m too high.
6. Carried from the AI-side check: in `consoleStep`, run the cheap `consoleBusy` before the `seesConsole` ray.
