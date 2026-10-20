# Test speed - state

**Now (2026-10-20 13:00): PAUSED** for anim-metrics (Michael's movement priority, orchestrator). Round 4 is committed
and pushed (30c2bbda). Full run 3 at `E2E_JOBS=2` on 30c2bbda was started three times and stopped each time for runner
requests; it has not finished.

**Next:** full runs at `E2E_JOBS=2` until 3 in a row have no "not ok"; then docs (testing-tools, backlog, CHANGELOG) and
the PR.

**Open:**
- doorPeek (item 5): a real parity gap, not a test flake. In every run the host's copy stands about 2 cm higher at the
  ankles and 3 cm at the head; on a loaded machine its left foot lands 9-13 cm off (two loaded runs; 2-2.5 cm alone;
  the copy not moving when sampled). CT Core takes it as a game fix (the remote settles its doorPeek feet frame-rate
  independently from MoveState), 2026-10-20.
- `E2E_JOBS=2` on the laptop is no faster than `E2E_JOBS=1` (1299 s vs 1140-1240 s): the laptop is CPU-bound, so two
  suites each run about 2x slower. The gain from two jobs (and from the e2e-ctcourse split) is on the desktop.

## Runs

| When | Commit | Run | Result | Wall |
| --- | --- | --- | --- | --- |
| 2026-10-20 10:40 | c479bc80 | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-netmove (doorPeek ankle 10.8 cm), e2e-ctcourse:3 (station 7 top-out), e2e-coop (match load past 40 s), e2e-pad (left stick, KNOWN FLAKY) | 1299 s (summed 2534 s) |
| 2026-10-20 11:11 | 83c6a03f | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-desktop:2 ("music menu TypeError: Failed to fetch" warning), e2e-pad remap (KNOWN FLAKY: no capture after A); the co-op suites and the three ctcourse parts pass | 1533 s (summed 2999 s) |

## Findings and fixes
| Failure (where) | Cause | Fix |
| --- | --- | --- |
| e2e-coop "host match" / "infiltration match on every page" (jobs=2) | page 2 at 1-3 frames/s: Chromium throttles the background tab; a match load at 2-3 frames/s ran past the 40-60 s wall wait | every suite launches without background throttling; load waits `LOAD_MS` 120 s (`e2e-net-lib`) |
| e2e-netmove "client assists" (jobs=2) | door / wall taps queued with in-page `setTimeout` (real time) landed before the game had run the frames between them | `window.__afterSim(sec, fn)`: taps on the match clock |
| e2e-pad "left stick moves focus down", remap "A then B binds B" | a 3-frame hold lasted long enough in real time for the menu's nav repeat to step twice; the remap B landed with no capture listening | `press` / `stick` hold for exactly one input poll; the remap step checks the screen and waits for the capture |
| e2e-ctcourse station 7 "stands on the wall top (y 0.04)" (jobs=2) | the stick was released by the next poll from Node, about a second of game time after the top-out: the client walked off the far side | the stick lets go on the page's own fixed step that counts the top-out |
| e2e-stealth (wall-clock look) | `lookFor` and the pauses counted real time | `forSim`: sim-time waits |
| e2e-course latency checks (0.5 s / 1.5 s) | measured in wall time | measured on the client's sim clock |
| e2e-offline "music menu TypeError: Failed to fetch" (PR #34 full run) | went offline while the menu theme was still fetching | waits for the menu theme decode first |
| e2e-desktop:2 and e2e-offline "music menu TypeError: Failed to fetch" (warning) | a music track's fetch failed under load; the game logs it and plays on without the track | e2e-lib prints it as "(ignored: ...)" and does not count it as a console error (the audio suites cover music) |
| e2e-pad remap "A then B binds B" again (run 2) | after the play page closes, the first pad A did not start the capture (the screen was there) | one more A when no capture started, with the input mode logged |
| e2e-ctcourse 240-280 s, one job | eight stations in sequence | `--part=1..3` (stations 1-3, 4-5, 6-8), each its own pair of pages, started at its bay through the host session's `courseBay` |

## Done
- 2026-10-20: branch off master 4fe98222 (4.12.0); BRIEF, PLAN, STATE.

## Resume prompt
```
Test speed: RESUME. Folder C:/NightShift/Mobile-Coop-test-speed, branch feature/test-speed (pushed).
Read CLAUDE.md "Sessions", then docs/test-speed/BRIEF.md, PLAN.md and STATE.md, and follow STATE "Next".
Laptop rules: heavy work one at a time with C:/NightShift/heavy.lock, BelowNormal, port 4191, headless, no GPU or
visual checks; test code only, never game code. Laptop runner requests (CT Core first, then Course Ready) come before
this job. Message "Night Shift | Orchestrator" at milestones only.
```
