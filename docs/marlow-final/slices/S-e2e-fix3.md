# S-e2e-fix3 - e2e fixer 3 (A4 camera cues, A8 night circuit)

Resumed from the WIP commit bea5aa6d (plus its uncommitted a4GoodsShed.mjs edit). Both fails are test bugs; `src/` is
unchanged. Checks: `npx tsc --noEmit` clean; no vitest file touched.

## e2e-ctcourse:2 - A4 "the camera cues are hidden on the host"
- Cause (test bug): `cueHidden` asserted every entry of `__ctdev.debug().cue`. That list covers every camera on the map
  (`CameraCueView` is built over `CtDevices.cams`), and Course mode never calls `setLive`, so A3's, A7's and A8's cameras
  stay online with their cues shown (`stepCue`: `a` fades in while `mode === 'online'`). The check could never pass. The
  restart is not involved: the cue state follows the camera mode each frame.
- Fix: filter to `cam-a4-*` and require all three hidden (scripts/e2e-ctcourse/a4GoodsShed.mjs:96-98); the same
  filter on the "seen / back" loop (a4GoodsShed.mjs:238-240).
- Follow-on (test bug): "the client gets 'already off'" waited for the client to see the host's refusal, but
  `CourseMode.refuse` (src/game/modes/courseMode.ts:397) sends only the client's own refusals (`ref` / `rn`). The client
  now presses the console itself from CLIENT_PRESS and waits for its own `rn` to rise (a4GoodsShed.mjs:220-227).
- Desktop run (GPU, E2E_JOBS=1, port 4191, build at this tree): **e2e-ctcourse:2 PASS, 346 s**.

## e2e-ctcourse:4 - A8 "the night circuit is off on the host"
- Cause (test bug): the wait read `stealth.switchOn(81)`, which reads the wall switches
  (src/game/stealthSystems.ts:753, `?? true` when none). Circuit 81 has no wall switch: the lighting board is an
  isolator (`StealthSystems.isolate` sets the registry). So `switchOn(81)` is always true and the wait always timed out.
- Fix: read the host's light registry for group 81 (all lamps off / on) in pass 1 and pass 2
  (scripts/e2e-ctcourse/a8Strongroom.mjs:307-309 and :454-455).
- Desktop run: the fixed step passes (night lamps off on both pages, the front and the grille approach dark and equal on
  both pages, grille unlocked, N1 walks to the board). **e2e-ctcourse:4 FAIL, 260 s**, at the next step:
  "timed out waiting for A8: N2 walks away from the grille (route index 4)" (a8Strongroom.mjs:320). This step was
  never reached before (the A8 walk is new since the last :4 pass on 45458bbc, which predates the A8 greybox).
- Probe run (temporary, removed): by the time N1 walks to the board, N2 is already alerted (`alert`, meter 1, state
  attack / seekCover / chase) while still on route index 2 at the grille, moving around (125.8, 57.9) -> (134.8, 63.5);
  then he drops to `searching` and walks to about (133.2, 65.9), a metre from the client in the lane (132.25, 66.0),
  and never returns to his route within 30 s. Who he spotted was not caught (the second probe run, logging both
  players and N1 from the board press, was stopped: the desktop lock was held). Likely suspects: the client teleported
  from the board to the lane in his view while the circuit fades, or the host upstairs in the office. Open: decide test
  (where the client waits) or game (A8 sightlines / N2 route) once the probe data is in.

## Open
- A8 step 6 above (N2 alerted before route index 4). Not fixed.
- :2 and :4 to be rerun on the laptop test runner on this commit.
