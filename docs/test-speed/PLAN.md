# Test speed - plan

Evidence so far (laptop runner, 2026-10-19/20):
- `E2E_JOBS=1` full run: about 1140-1390 s, all pass. Slowest: e2e-ctcourse 235-255 s, e2e-course 175-190 s,
  e2e-netmove 105-120 s, e2e-menus 57-107 s, e2e-coop 77-99 s, e2e-pad 89 s.
- `E2E_JOBS=2` full run (Sector Ops bd6b73ef): e2e-netmove "timed out waiting for client assists" (host sim x0.48,
  11 fps) and e2e-coop "timed out waiting for host match" (page 2 at 1 fps, sim n/a); both pass alone.
- The waits in `e2e-net-lib` already count sim time inside a match; outside one (lobby, match start) they count wall
  time. Several co-op steps queue taps with in-page `setTimeout` (wall time: e2e-coop:613, e2e-netmove:420/484/573).
- Only anim-audit launches with `--disable-background-timer-throttling --disable-renderer-backgrounding
  --disable-backgrounding-occluded-windows`; a two-page suite's second page can be throttled.

Steps:
1. Baseline: full run at `E2E_JOBS=2` on master, BelowNormal; log failures and times.
2. Two-page suites: unthrottled background pages (launch flags); in-page `setTimeout` tap chains become sim-time
   steps; match-start and lobby waits get a load-proof bound. If still not stable: an "exclusive" mark in
   `run-e2e.mjs` (the suite runs with nothing alongside).
3. Split e2e-ctcourse into station groups (`--part=N`, like e2e-desktop), each its own pair of pages.
4. e2e-stealth: condition wait for the look input.
5. e2e-pad: find the remap flake; fix it or move it to its own list.
6. e2e-netmove doorPeek: sample the ankle over frames; flake or real.
7. Verify: 3 full runs at `E2E_JOBS=2`, no "not ok"; times in STATE; docs (testing-tools, backlog, CHANGELOG); PR.
