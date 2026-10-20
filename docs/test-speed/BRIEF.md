# Test speed - brief

Set by the orchestrator, 2026-10-20, approved by Michael (09:55). Branch `feature/test-speed` off master 4.12.0
(4fe98222), folder `C:/NightShift/Mobile-Coop-test-speed`. Job lead: Character Build (the laptop).

## Michael's words
- (09:55, relayed) "Are any of the suite tests causing consistent problems that should be diagnosed and fixed? i dont
  want us to got bogged down waiting for them if they are inefficient"
- Laptop rule (2026-10-19, 2026-10-20 23:45): low priority. This job's own runs go at BelowNormal with the laptop
  `heavy.lock`, headless only, no GPU or visual checks.

## Goal
A full `npm run e2e` at `E2E_JOBS=2` that passes without reruns on a loaded machine, in about 15-20 min.

## The ask (orchestrator)
1. e2e-ctcourse, e2e-coop, e2e-netmove: wait on sim time, not wall-clock, so slow frames do not time out; and/or a
   `run-e2e.mjs` "exclusive" flag so they run with nothing alongside.
2. Split e2e-ctcourse (about 240 s, 8 stations in sequence) into station groups that run in parallel, same coverage.
3. e2e-stealth: the wall-clock look-input wait becomes a condition wait.
4. e2e-pad (KNOWN FLAKY, about 190 s, failures ignored): find the cause and fix it, or move it out of the full run into
   its own list (`docs/backlog.md` "Flaky e2e suites").
5. e2e-netmove doorPeek ankle (12.9 cm vs 10 cm once, be2ba814): a real foot issue (tell CT Core and the orchestrator)
   or a sampling flake.

## Limits
- Test code only (`scripts/`, docs). Never game code; a game bug goes to the orchestrator (and CT Core for its area).
- CT Core owns the course content of e2e-ctcourse; this job owns its waits and how it is split.
- Runner requests from CT Core and the other job leads come first.
- Verify: 3 full runs at `E2E_JOBS=2` with no "not ok", times logged in STATE. One PR to master; the orchestrator sets
  the version.

## Decisions
Assumed (each can be undone by reverting its commit):
- **A1 e2e-course's latency limits (0.5 s host press, 1.5 s client press) count game time** on the client's clock, not
  wall time: a loaded machine's slow frames are not network lag. Undo: `clientWithin` back to `Date.now()`.
- **A2 `press` / `stick` (e2e-lib) hold for exactly one input poll**, not 3 rendered frames (the menu's nav repeat runs
  on real time). A page without the app's input falls back to the 3-frame hold. Undo: the old 3-frame body.
- **A3 e2e-ctcourse runs as three station groups in the full run** (`e2e-ctcourse:1..3`); named alone it still runs
  all eight stations, which is what job leads ask the runner for. Each group costs a match start (about 40 s), so the
  summed suite time grows; the gain is the shorter critical path when two or more jobs run. Undo: drop
  `'e2e-ctcourse'` from `PARTS` in `run-e2e.mjs`.
- **A4 match loads wait up to 120 s** (`LOAD_MS`, wall time; they were 40-60 s). Undo: `E2E_LOAD_MS`.
