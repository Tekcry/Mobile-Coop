# Test speed round 2 - state

Branch `feature/test-speed-2` off master 170ee701, master 79216e49 (4.56.0) merged in (154f6a9d). Tests only, no
`src/` change. Nothing here has run yet: the session lead runs every proof (the implementer may not run suites).

## The honest picture first
- At `E2E_JOBS=2` the full run's wall time is about (sum of suite times) / 2, not the slowest suite: 27 min wall is
  about 54 min of suite time. 15 min wall means cutting about 24 min of suite time. Splitting a suite (method 3) only
  shortens the critical path and adds a match load per part, so at 2 jobs it makes the run longer. Not used.
- The fixed waits in the six slow suites add up to little: most remaining pauses are measurement windows ("stays off
  for 2 s", "no touch while walking the beam line") or short retry steps, which stay. Where the time goes is the
  rendering: two pages (or a 1920 x 1080 menu) on software GL, so the sim runs at x0.3-0.5 of real time and every
  game-time wait costs 2-3 times its length.
- The changes below save an estimated 2-2.5 min of suite time (about 1-1.5 min wall at 2 jobs). They do not reach
  15 min. The levers that could are in "Next".

## Changes, per suite

| Suite | Where (file:line now) | Old -> new | Condition | Est. saved |
| --- | --- | --- | --- | --- |
| e2e-netmove | `compare`, 37-42 | 0.8 s sim after the client settles -> condition (3 s sim cap; miss: the old 0.8 s) | host buffered a client state received >= 0.15 s (host clock) after the client was seen still (`avatar.buf.latestTime()`) | ~0.6 s sim x 20 compares |
| e2e-netmove | `compare`, 55-63 | trailing 0.3 s sim always -> only when the host's copy never stood still | the existing 0.3 s still-loop broke | 0.3 s sim x 20 |
| e2e-netmove | `attach` 89, ladder climb 142, wall crouch 491 | 0.4 / 0.5 / 0.6 s sim -> removed | `compare` follows each: host shows the mode, client and host copy still | ~3.1 s sim |
| e2e-netmove | `reset` (102, `landed` 105-117) and 5 teleports (175, 207, 216, 243, 255) | 0.6 s sim -> `landed` (3 s cap; miss: rest of the 0.6 s) | >= 0.15 s of client sim (stale `grounded` after a teleport), grounded, not attached / overridden / crouched, speed < 0.05; reset also: host has the feet within 0.3 m of the spot | ~0.4 s sim x ~19 |
| | | | **e2e-netmove total** | ~26 s sim, est. 50-70 s |
| e2e-menus | 231 and 291-401 | the four cinematic launches (H3, fast clock + reduced motion, both title runs) moved after the menu page's `goto('about:blank')`, before the match | none: same checks; the 1920 x 1080 backdrop no longer renders beside them (the havok-stall finding) | est. 25-45 s |
| e2e-coop | `moveClient` 411-421 | 0.5 s sim -> condition (miss: rest of 0.5 s) | host has the client feet within 0.4 m, then >= 0.15 s client sim and grounded | ~0.3 s sim x 8 |
| e2e-coop | `puppetAt` 422, used after the takedown and strike guard moves | 0.6 s sim -> condition (3 s; miss: 0.6 s) | the client's puppet of that guard within 0.3 m of the new spot | ~0.8 s sim |
| e2e-coop | restart while holding, 792-797 | 3 s sim -> condition (8 s) + 1 s sim | client dropped the old puppet and has an alive respawned one; then 1 s of frames for the error check | ~1.5 s sim x 2 |
| | | | **e2e-coop total** | ~6 s sim, est. 12-18 s |
| e2e-course | grenade loop 384 | 1.4 s wall per blast -> until the host is down (1.4 s sim cap) | `!player.alive` on the host | est. 1-1.5 s |
| e2e-ctcourse:2 | security room 389 | 0.6 s sim then `until(cueHidden, 3 s)` -> the `until` alone | `cueHidden` (alpha 0, not shown, not seen) holds only after the fade | est. 1-2 s |

Total estimate: about 90-135 s of suite time, 45-70 s wall at `E2E_JOBS=2`.

## Risks for the proof run to watch
1. e2e-netmove joint compares (10 cm), above all doorPeek and the ankles: `compare` now samples sooner after the
   client settles. Guarded by the host-copy still-loop, but this is the suite's known sore spot. A failure there:
   revert the `compare` hunk at 37-42 first.
2. e2e-netmove `landed`: a client that never meets the stand condition costs 3 s sim instead of 0.6 s (no failure).
   Look for slower netmove times than before; the split, wall jump, pipe, rappel and fence offers follow it.
3. e2e-coop restart-while-holding: the "no errors after the restart" window is now drop + 1 s, not 3 s. The old crash
   threw every frame, so 1 s catches it; say so if Michael wants the full 3 s back.
4. e2e-coop `moveClient`: the takedown / strike / revive retries now start as soon as the host has the client there.
5. e2e-menus: the cinematic checks now run on an idle machine side; only their order in the log changed.
6. e2e-course: each grenade iteration that does not down the host now waits 1.4 s of game time (longer in wall time
   under load); the first blast normally downs it.

## Next (the levers that could reach 15 min; each needs a measured run, none is implemented)
1. Hidden background page in the two-page suites: since round 1 every suite launches with
   `--disable-renderer-backgrounding` and friends, so both pages render. The game now has a co-op hidden-page tick
   worker (`GameLoop.holdBackgroundTicks`, coop-fix) that runs a hidden page's sim without rendering. Dropping those
   flags for e2e-coop / netmove / course / ctcourse could halve their render cost. Risk: in-page rAF helpers on the
   hidden page (`__afterSim`, `frames`, station 3's 800 ms rAF probe on the host) stall; check each first.
2. A smaller `NET_VIEWPORT` (960 x 480 now) for e2e-netmove and e2e-ctcourse, e.g. 640 x 320: fewer pixels per
   software-GL frame. Gameplay reads no graphics state; check HUD-text reads (`dev().hud`) still find their text.
3. e2e-menus' rendered-frame settles in the match block (`frames(P, 30)`, `frames(P, 40)`) on the sim clock
   (`stepHeadless`, as the tuner-camera block already does).

## Commits
- 6eb639a7 e2e-netmove
- 3056d20b e2e-menus
- e89789bf e2e-coop
- 154f6a9d merge origin/master 79216e49 (clean; e2e-netmove's holster limit from master kept)
- 2ae84303 e2e-course
- c5733bc5 e2e-ctcourse

CHANGELOG: none (round 1 edited CHANGELOG.md at the end of the job, no fragments; the orchestrator sets the version).
