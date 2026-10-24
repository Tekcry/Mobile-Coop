# S22 game side: second check (independent, 2026-10-23)

Scope: `git diff 0e6fa9ef 08586783` (fa6230b6 wiring + unit tests, 08586783 A4 e2e), the AI side it calls
(`src/ai/consoleFault.ts`, `EnemyManager.consoleState / watchesConsole / consoleStep / consoleReset`, the breaker walk in
`Enemy`), and the merge 0e6fa9ef in the files S22 touches. Written before reading `S22-GAME-CHECK.md`.

## Verdict: PASS

No blocking finding.

## Checks run
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run --maxWorkers=4 tests/courseConsole.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/consoleFault.test.ts`:
  3 files, 73 tests, all pass.
- `node --check scripts/e2e-ctcourse/a4GoodsShed.mjs`: OK.
- No e2e run (as briefed).

## What was checked and holds
- **Merge 0e6fa9ef:** `courseState.ts`, `courseMode.ts`, `securityRoom.ts`, `sectorReset.ts` and the A4 e2e come out
  identical to marlow-final 4cbfc1af (no hand resolution). The conflicts were in `src/net/*`, `docs/systems/coop.md`,
  `scripts/run-e2e.mjs` and net tests, none of which S22 touches.
- **Host authority / co-op:** the refusal (`courseMode.ts:391`) runs on the host for both players' presses (a client
  press arrives as `press(cid, 1)` and its refusal goes back through `ref2` / `refN`). A guard's reset goes through
  `CourseState.consoleBack` (`courseState.ts:901`), which calls the same `endWindow` as the loop running out, so the
  client gets exactly what it gets today when a loop ends: flag cleared, gate closed, re-arm `tb` in `pack()`, cameras
  back through `hasShared`. `consoleBack` sets `dirty`, so the `course` message goes out on the next fixed step. No
  wire change, no `src/net` import.
- **Reentrancy:** `consoleBack` is reached from inside the guards' update (`breakerStep` -> `breakerReset` ->
  `consoleReset` -> `consoleHost.reset`) and does not call `handle`; `flagCleared` is drained by the next
  `fixedUpdate` -> `handle` and reaches `consoleState(.., true)`, which is a no-op because `consoleReset` already
  set `on[i] = 1` (no fresh cut).
- **Edge cases:**
  - Killed or knocked out mid-walk: KO is `alive` false; `consoleBusy` drops him, and the board's re-send / retry
    (A132, 3 s) lets the next guard pick it up.
  - Alarm mid-walk: `setLevel` ends the walk (`enemy.ts:1596`). The console stays off until the loop ends or a calm
    guard notices it again.
  - Turned back on before he arrives: players can't do this (a press while looped is "already off"). The loop running
    out sends `flagCleared` -> `consoleState(on)` -> `breakerOff` false -> his walk ends.
  - Same frame as the loop running out: `consoleBack` returns false (flag already gone), `consoleReset` leaves `on`
    alone, and `flagCleared` fixes it.
  - Two consoles (A4, A8): keyed by device id and flag, one pseudo group each. Two guards: `consoleBusy` keeps the
    second off.
  - Section restart mid-walk: `bayRestart` -> `dropSquad(true)` -> `resetMemory` clears the console table.
    `CourseState.restart` deletes the flag without an event, which is fine because the table is empty. A stray reset
    between `restart()` and `handle` gets `false` from `consoleBack`.
  - Re-arm against the walk: a reset starts the 20 s re-arm (A133). A second cut inside 60 s gets the tamper check (A131).
  - Save / rejoin: nothing persists AI-side. A rejoining client gets the full `course` wire.
- **Per-frame cost:** nothing new per frame. The `consoleHost` closure is made once in `start()`. `consoleEdge` runs
  only on flag events. `watchesConsole` runs only on a press. The AI step is allocation-free, uses `hyp3`, and has no
  `Math.hypot` in `src`. Strict TS is clean; `this.layout!` in `press` is safe because `con` came from
  `this.layout?.consoles`.
- **Per-player consoles:** not an issue. `consoleErrors` requires a shared pickup gate, so `consoleBack`'s
  `flags.has(def.flag)` and `consoleEdge`'s exact flag match are enough.
- **A4 e2e:** every wait has a bound and a message.
  - The refusal can't pass vacuously: it waits for `watchesConsole` true first, and no earlier step leaves "Take him out"
    in `refusal`.
  - The distraction wait checks both `incident >= 0` and not watching.
  - The counters are compared to a baseline taken before the press.
  - The second LANTERN line is gated on `rln` moving past its pre-press value (`rln0`), so it can't match the first
    loop's line.

## Polish (non-blocking)
1. **A8 console height (verify).** A8's console device y is 5.6, which is the device height; the office floor is 4.4.
   The S22 contract says y is the floor. As a result:
   - `consoleEdge` / `press` (`courseMode.ts:391`, `:785`) put A8's screen point at 6.7 m, 2.3 m above the floor.
   - The walk's `switchFloor` gets 5.6.
   - By the numbers the A8 refusal still holds: the officer is seated 0.8 m in front, the point is 1.1 m away in 3D,
     angle 0, so it is in his cone, and the sight ray is 0.7 m long.
   - But `a8Strongroom.mjs:272-273` ("refuses while the officer is up") now runs under the new rule, and the repo
     records no e2e run of it.
   - Done looks like: `e2e-ctcourse` run including A8, or the floor passed instead (e.g. `nav.heightAt` under the device,
     or a `floorY` on the console).
2. **Client refusal untested.** The A4 e2e no longer checks the client's own "Take him out" refusal (the
   `CLIENT_PRESS` press was dropped, because the client would stand in his view), and no unit test covers it.
   Done looks like: a case in `tests/courseConsole.test.ts` with `watching = true`, `m.press('sw-con', 1)`, expecting
   `ref2 === CONSOLE_GUARD_UP`, `refN` up by 1 and no flag.
3. **Refusal text.** `CONSOLE_GUARD_UP` still reads "Take him out first." A distraction now works too (A134). Marlow
   Build's call: "Take him out or draw him away first."
4. **No cue when he turns it back on.** The client hears no line: the `console` bark is host-only until S9's
   `BARK_EVENTS` merge (open item). Neither player gets a LANTERN line; the camera cues and the timer line just come
   back. Suggest a LANTERN line on a guard reset, keyed like `gateWarn`.
5. **Held guard no longer blocks.** A held (`taken`) or suspicious guard no longer blocks the console. The old rule was
   "alive, held or not". This follows A134, but it is a feel change Michael should know of: a grab plus the partner's
   press now loops without the takedown.
6. **`start()` wiring untested.** `start()`'s `consoleHost` assignment (`courseMode.ts:270`) is covered only by the
   e2e. The unit rig sets the host by hand.
7. **Exact counter equality may flake.** `cc1.finds === cc0.finds + 1` (`a4GoodsShed.mjs:226`) fails if his walk is
   dropped and re-noticed (A132 retry), e.g. if the distraction runs long. `>=` on finds with exactly one reset would
   tolerate it. The failure message is clear either way.
8. **Iterator in `consoleEdge`.** `consoleEdge` uses `for...of` on `lay.consoles`. It runs only on events, not per
   frame, and matches the rest of `onEvent`; an indexed loop would fit the house rule.
