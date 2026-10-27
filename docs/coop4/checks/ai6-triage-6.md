# AI6 e2e-coop triage 6 (PR #317 head c740ac86, desktop worker, twice: 281 s and 288 s)

Failure: `AI6 (3) FAIL: timed out waiting for AI6 (3): C stands [host: sim 6.02 s ...; page 2: sim n/a ...; page 3:
sim 6.02 s ...; page 4: sim 6.02 s ...]`. Spawn, the 4 s crouch-walk (cN 66, cMoved 1.68, meter 0.00, nonCalm 0,
cValid 0) and every (2) / (2c) assert passed. This is the first run to reach the run leg (triage 5 cleared the crouch leg).

## Verdict: test bug (a race in the test's `setCrouch`), not a game bug

- The "page 2: sim n/a" hint is a red herring. The timeout text labels the pages 0-based-plus-one
  (`scripts/e2e-net-lib.mjs:40`: index 0 `host`, index i `page i+1`), so `page 2` is `P4[1]` = B, who left for good in
  (2c) and sits in the main menu (sim n/a is right). C is `P4[2]` = `page 3`, simming x1.00 at 28 fps. The wait polls
  C's page (`until(P4[2], ...)`), not a gone page. `idxC` is C's guards'-list index and is used only for `sawC`; the
  stand step never reads it. `cValid 0` is the assert that C has NO valid slot over a silent crouch-walk (wanted), not a
  wrong index.
- Cause: `setCrouch(false)` in `scripts/e2e-coop.mjs` (old 2819-2829). `padReady` calls
  `controller.clearCrouchToggle()` (`crouchToggled = false`). That alone stands C up on his NEXT frame
  (`crouchWanted(toggle, toggled=false, ...)` -> `applyCrouch(false)`, `src/player/playerController.ts:537-541`,
  `:745-751`). The test read `crouched` in the very next `evaluate`, before that frame, saw `true`, and pressed crouch
  (pad button 1). The press flips the toggle back on (`playerController.ts:525`), so C stays crouched and "C stands"
  waits 6 s on a crouch that holds. Two CDP round trips are a few ms against a 36 ms frame, so it fails almost every
  run (deterministic in practice). `setCrouch(true)` never hit it: clearing an already-false toggle changes nothing.
- The game is right: a cleared toggle stands you up, a press toggles. No `src` change.

## Fix (`scripts/e2e-coop.mjs` only)

`setCrouch` now clears the pad and the toggle, then lets 150 ms of sim pass before it reads `crouched`, and presses
only if C is still not in the wanted stance; up to 3 tries (each press flips the toggle), 3 s wait each. On failure it
throws with C's controller state per try: `crouched`, `crouchToggled`, `crouchIntent`, `crouchPend`, `autoCrouch`,
`frozen`, `grounded`, `hasHeadroom()`, position (a ceiling over the leg would show as `head: false`). The leg's intent
is unchanged: the calm grunt facing the wall, C crouch-walks the leg 2.6 m behind him unheard, then stands and runs it.

## Remaining risk

The run leg itself has never run. Triage 5's notes on it still hold (tier 2 only near the leg's middle at 2.6 m; move
the leg to 2.2 m if `loc` is null with `turnBy: 'turn'`).

## Checks

`node --check scripts/e2e-coop.mjs` OK; eslint (the file is in the ignore list, no errors); `npm run typecheck:fast` OK.
No src change, so no vitest. No e2e run here. Rerun: `e2e-coop` on the new head, `E2E_GPU=1`.
