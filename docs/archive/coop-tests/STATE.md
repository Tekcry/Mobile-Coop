# Co-op test fix - state

**Now (2026-10-19):** done; PR #17 to master is open (https://github.com/Tekcry/Mobile-Coop/pull/17), waiting for the orchestrator's review
and merge. Steps 1-6 done on `feature/coop-tests` (rebased onto master 4.6.4, 59f7a0da).

**Next:** nothing in this job unless the PR review asks for changes. If it does: make them here, rerun the touched
suites alone on the laptop (one runner, `E2E_JOBS=1`, BelowNormal, port 4191, `C:/NightShift/heavy.lock`), push, tell
the orchestrator.

**Open (not this job):**
- e2e-pad stays KNOWN FLAKY: laptop full run 2 failed its remap section ("A then B binds B (G22), warned on both rows",
  the Controls screen not open); full run 1 and the solo runs passed. Parked (Michael: park the non-co-op ones).
- CT Core's 0.75 m wall-entry placement (slice A) is not on master yet; when it lands it wins any conflict in
  e2e-netmove (the walk-off and stacked changes here are elsewhere in the file).
- Michael is reshaping the menus (sector mode, co-op as the campaign): e2e-coop's match choice (A1) may change later.

## Done
- 2026-10-19: step 6: KNOWN_FLAKY is e2e-pad only (e2e-coop, e2e-netmove, e2e-weapons-carry left); testing-tools.md,
  backlog, CHANGELOG ("Unreleased - co-op test fix").
- 2026-10-19: laptop full runs (npm run e2e, one suite at a time): run 1 all pass, 1387 s; run 2 all pass except e2e-pad
  (KNOWN FLAKY), 1416 s. Co-op suites in both: ctcourse ~283 s, course ~197 s, netmove ~125 s, coop ~95 s.
- 2026-10-19: solo rounds: netmove 3/3, coop 3/3, course 2/2, ctcourse 2/2 after the crouch fix (round 2 failed before
  it). e2e-pad alone, profiled: 119 s (the desktop's 306 s was load).
- 2026-10-19: rebased onto master 3bd51675 (#15, 4.6.3), no conflicts.
- 2026-10-19: crouch helpers wait to stand before pressing B (ctcourse station 5 race; netmove crouchOn too).
- 2026-10-19: e2e-coop solo PASS after two fixes: the lobby suites keep 1280 x 640 (the menus lay out at 1280 x 720 at
  least); the wall medkit heals to full on Normal (G119 / G180), the check read +40. A1 accepted by the orchestrator.
- 2026-10-19: e2e-ctcourse and e2e-netmove solo PASS (station 2's leg-up on the sim clock; the walk-off un-crouch, the
  stacked check settling on the sim clock).
- 2026-10-19: sim-clock `until` / `waitSim` / clock reports and `NET_VIEWPORT` in e2e-net-lib; e2e-coop off Hunter.
- 2026-10-19: branch `feature/coop-tests` off `feature/process-audit` 7a01b254; BRIEF and STATE.

## Resume prompt
```
Co-op test fix: RESUME. Folder C:/NightShift/Mobile-Coop-coop-tests, branch feature/coop-tests (PR #17 to master is
open). Read CLAUDE.md, then docs/coop-tests/BRIEF.md and docs/coop-tests/STATE.md. Report to the Night Shift |
Orchestrator session and wait for its instructions: the job is done unless the PR review asks for changes. Laptop
rules: heavy work one at a time with C:/NightShift/heavy.lock, E2E_JOBS=1, BelowNormal priority, headless, no GPU or
visual checks; test scripts only, never game code.
```
