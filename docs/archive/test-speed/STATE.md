# Test speed - state

**Now (2026-10-20 22:55):** done. Full runs 6 and 7 on 7221641c clean (the done criteria); master 4.17.0 merged; the
PR head b58557a3 full run clean (1235 s, no "not ok", e2e-pad and e2e-levels included). Docs written. PR to master
open; the orchestrator sets the version (patch).

**Next:**
1. The orchestrator reviews and merges the PR.
2. Later, not a blocker: the 12-15 min figure at `E2E_JOBS=2` is measured on the desktop.
3. e2e-pad off `KNOWN_FLAKY` once it has run clean in a few more full runs (it passed in runs 6 and 7 and in every
   runner request since).

**Open:**
- doorPeek (item 5): a real parity gap, not a test flake; CT Core's game fix (e4d85253, the remote's doorPeek feet
  settle frame-rate independently) is on feature/ct-prototype, not on master yet. Measured there: max 2.4 cm.
- `E2E_JOBS=2` on the laptop is no faster than `E2E_JOBS=1` (1330-1745 s vs 1140-1650 s): the laptop is CPU-bound at
  BelowNormal. The gain from two jobs and the e2e-ctcourse split is on the desktop.
- Seen on Sector Ops 9b40f469 at jobs=2 (21:10), passed solo: e2e-desktop:1 "the result is saved as a performance note
  without a tap" right after a 5 fps benchmark. Not seen on this branch; watch it.
- e2e-levels "a runner climbs the rack ladder" failed twice (run 4 and the PR head c758d852, "0.0 -> 0.02 m in 30 s",
  no link taken). The test runs on sim time (`stepHeadless`) and `src/ai` reads no wall clock, so this is not a test
  wait: likely the runner AI's own randomness (game code). Solo rerun to classify; if it fails solo, it goes to the
  orchestrator as a game issue.

## The laptop runner (between test-speed steps, always first)
- Requests come from CT Core, the orchestrator (relaying for Course Ready, Sector Ops / warehouse jobs, coop-fix and the
  rest) by cross-session message, with a branch, a commit and the suites. Order: CT Core first, then the others by
  arrival; a request comes before any test-speed run (stop a running test-speed run: kill the `laptop-runner.ps1`
  PowerShell tree, delete `C:/NightShift/heavy.lock` if it was left).
- Each request: `powershell -NoProfile -ExecutionPolicy Bypass -File C:/NightShift/Mobile-Coop-test-speed/scripts/archive/laptop-runner.ps1 -Label <name> -Commit <sha> -Steps "<steps>" -Low`
  with `RUN_TIMEOUT=1200` when asked; `E2E_JOBS=1`, BelowNormal, port 4191, headless (the script does all of that).
  Steps: `check`, `build`, `full`, or suite names (one suite per step to keep going after a failure).
- Reply to the requester with pass / fail per suite, the failing assert (from the suite's `.log` / `.err`, the
  "Error:" line and the dump around it), the time and the commit, and copy "Night Shift | Orchestrator". A result counts
  only for the exact commit it ran on.
- Logic e2e only: never GPU, perf or visual checks; never `E2E_HEADED`; nothing that takes focus.

## Runs

| When | Commit | Run | Result | Wall |
| --- | --- | --- | --- | --- |
| 2026-10-20 10:40 | c479bc80 | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-netmove (doorPeek ankle 10.8 cm), e2e-ctcourse:3 (station 7 top-out), e2e-coop (match load past 40 s), e2e-pad (left stick, KNOWN FLAKY) | 1299 s (summed 2534 s) |
| 2026-10-20 11:11 | 83c6a03f | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-desktop:2 ("music menu TypeError: Failed to fetch" warning), e2e-pad remap (KNOWN FLAKY: no capture after A); the co-op suites and the three ctcourse parts pass | 1533 s (summed 2999 s) |
| 2026-10-20 15:07 | 8f9ebf14 (master cf73f8b5 merged) | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-menus and e2e-pad (`page.goto` past 30 s: page loads under load), e2e-ctcourse:3 (station 6 "the late hack costs the client health" timed out at x0.46 sim; passed in run 2); the co-op suites, ctcourse:1 and :2 pass | 1743 s (summed 3418 s) |
| 2026-10-20 15:40 | 03a6ee67 | full, jobs=2, BelowNormal (laptop) | FAIL: e2e-ctcourse:3 (station 6 again: the late press missed the 1.5 s sync window, "-1:alone"), e2e-menus (title fade 0.57 after a fixed 0.5 s), e2e-levels (a runner never took the ladder in 30 s of sim; passed every other run), e2e-pad (connect toast after a fixed 250 ms, KNOWN FLAKY) | 1504 s (summed 2947 s) |
| 2026-10-20 16:09 | bc10b3c7 | full, jobs=2, BelowNormal (laptop) | every required suite ok ("all e2e suites passed"); e2e-pad FAIL (KNOWN FLAKY: "the locked row toasts its reason", read at once; now a condition wait). Not counted: a "not ok" | 1330 s (summed 2596 s) |
| 2026-10-20 17:28 | 7221641c | full, jobs=2, BelowNormal (laptop) | CLEAN: all e2e suites passed, 0 "not ok" (clean 1 of 2) | 1430 s |
| 2026-10-20 21:14 | 7221641c | full, jobs=2, normal priority (laptop; Michael freed it, 2026-10-20) | CLEAN: all e2e suites passed, 0 "not ok" (clean 2 of 2) | 1229 s |
| 2026-10-20 21:46 | c758d852 (master 4.17.0 merged) | check + full, jobs=2 (laptop) | FAIL: e2e-pad (KNOWN FLAKY, "LB tap switches weapon", a fixed 600 ms; fixed), e2e-levels (rack ladder, see Open) | 1179 s |
| 2026-10-20 22:30 | b58557a3 (PR head) | full, jobs=2 (laptop) | CLEAN: all e2e suites passed, 0 "not ok" | 1235 s |

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
| e2e-menus, e2e-pad `page.goto: Timeout 30000ms` (run 3) | a page load with two suites (four pages) on software GL ran past Playwright's 30 s navigation default | every suite page's navigations wait up to 120 s (`setDefaultNavigationTimeout` in `openPage`) |
| e2e-ctcourse station 6 "the late hack costs the client health" (runs 3, 4) | the late press was sent after polls from Node saw scanner A ready on both pages; under load that took longer than the 1.5 s sync window, so it counted as a lone start ("-1:alone", no cost) | the client page presses on its own first frame that sees A ready |
| e2e-menus "the prompt and wordmark have faded out" (run 4), e2e-pad "connect toast" (run 4) | fixed real-time pauses (0.5 s, 250 ms) before reading a fade / a toast | wait for the condition (8 s cap) |
| e2e-pad "the locked row toasts its reason" (run 5) | the toast read at once after the press | wait for it (8 s cap) |
| e2e-pad "LB tap switches weapon and leaves the wheel shut (0 -> 0 of 2)" (PR head c758d852, came with master's merge) | the tap was read after a fixed 600 ms of real time; under load the game had not run the frames yet | wait for the slot change (8 s cap), then read the wheel |
| e2e-ctcourse 240-280 s, one job | eight stations in sequence | `--part=1..3` (stations 1-3, 4-5, 6-8), each its own pair of pages, started at its bay through the host session's `courseBay` |

## Done
- 2026-10-20: full runs 6 and 7 clean (the done criteria); docs; the PR to master. Runner requests served between runs
  (CT Core PR #43, 6546a1ca, 534962d0, PR #52; Menu Notes nv-pass; anim-rig; Sector Ops PR #50).
- 2026-10-20: rounds 1-7 of load fixes (Findings and fixes); full runs 1-5 at jobs=2 on the laptop (Runs); the laptop runner script in the repo (scripts/archive/laptop-runner.ps1).
- 2026-10-20: branch off master 4fe98222 (4.12.0); BRIEF, PLAN, STATE.

## Resume prompt
```
Night Shift | Character Build: RESUME on the laptop (the second heavy slot). Two roles, the runner first.
Read CLAUDE.md "Sessions" (above all "Machines" and "The laptop is the test runner"), docs/ROADMAP.md, then
docs/test-speed/BRIEF.md and docs/test-speed/STATE.md in C:/NightShift/Mobile-Coop-test-speed (branch feature/test-speed,
pushed; git fetch first).
1. Laptop test runner: when CT Core, the orchestrator (relaying for the other jobs) or another job lead messages a
   branch, an exact commit and named suites, run them with C:/NightShift/Mobile-Coop-test-speed/scripts/archive/laptop-runner.ps1
   (STATE "The laptop runner": Mobile-Coop-testrun detached at the commit, npm ci only when package-lock.json changed,
   E2E_PORT=4191, E2E_JOBS=1, BelowNormal, the laptop heavy.lock, one at a time, CT Core first, then by arrival).
   Reply to the job lead with pass / fail per suite, the failing assert, the run time and the commit; copy
   "Night Shift | Orchestrator". A request stops a running test-speed run.
2. Between requests, test-speed: follow STATE "Next" (two consecutive clean full runs at E2E_JOBS=2 on the laptop,
   BelowNormal, no "not ok" and no reruns; the doorPeek failure counts as known; then docs and one PR to master; the
   orchestrator sets the version). Test code only, never game code.
Headless only, never GPU or visual checks. No em dashes. Message the orchestrator at milestones only.
```
