# Co-op test fix - state

**Now (2026-10-19):** steps 1-5 done. Solo runs on the laptop (E2E_JOBS=1, BelowNormal, port 4191): e2e-netmove PASS
(127 s), e2e-ctcourse PASS (all 8 stations, 282 s), e2e-coop PASS (57 checks, 98 s; run 3, after two test fixes).

**Next:** solo rounds 2 and 3 (netmove, ctcourse, coop, course), then 2 full runs; then step 6 (out of KNOWN_FLAKY),
rebase onto master once PR #15 merges (take CT Core's 0.75 m wall entry), PR.

**Open:**
- CT Core's 0.75 m wall-entry commit (expected conflict in e2e-netmove: take 0.75).

## Done
- 2026-10-19: e2e-coop solo run 3 PASS. Two fixes on the way: the lobby needs the default 1280 x 640 window (the menus
  lay out at 1280 x 720 at least; at 960 x 480 "Start mission" was outside it), so only netmove and ctcourse use
  960 x 480; the wall medkit heals to full on Normal (G119 / G180), the check read +40.
- 2026-10-19: e2e-ctcourse solo PASS (station 2's leg-up, the old wall-clock timeout, passes on the sim clock).
- 2026-10-19: e2e-netmove solo PASS (the walk-off un-crouch; the stacked check settles on the sim clock).
- 2026-10-19: sim-clock until / waitSim / clock reports in e2e-net-lib; e2e-coop off Hunter (A1).
- 2026-10-19: branch `feature/coop-tests` off `feature/process-audit` 7a01b254; BRIEF and STATE.

## Resume prompt
```
Co-op test fix: RESUME. Folder C:/NightShift/Mobile-Coop-coop-tests, branch feature/coop-tests. Read CLAUDE.md, then
docs/coop-tests/BRIEF.md and STATE.md, and carry on from "Next". Report to the Night Shift | Orchestrator session.
```
