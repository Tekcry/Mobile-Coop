# flake-fix - brief

Job lead: Night Shift | Character Build (laptop). Branch `feature/flake-fix` in `C:/NightShift/Mobile-Coop-flake-fix`,
from master 4.51.1 (71ce1bff). Test-only; merge tier: CI + the edited suites, each run twice at E2E_JOBS=2 to prove it
holds under load. Train runs keep priority on the laptop.

## The ask
Michael (2026-10-22 ~11:40, through the orchestrator): "Fix load-flaky tests". The four suites that fail under load
(E2E_JOBS=2 on the laptop) and pass solo, seen on several branches on 2026-10-22:
1. e2e-stealth-ai: "ASSERT: the guard there sees the peeking head only ({"los":true,"head":false,...})".
2. e2e-netmove: "timed out waiting for client assists" (~15 fps).
3. e2e-mouse: "ASSERT: the capture times out after 5 s".
4. e2e-ctcourse: "timed out waiting for station 4: the client is thrown" (~6 fps).
Approach (as #107, the e2e-coop takedown fix): sim-time waits instead of wall-clock ones, hold the state steady
(calm guards, statue targets, no drift) through the checked moment, print both views (host and client) on failure.
Never loosen what a test proves.

## Limits
Test files only (`scripts/e2e-*.mjs`, `scripts/e2e-lib.mjs` helpers if shared, `docs/backlog.md`); a game-code change
only if a test exposes a real bug, then say so and stop for the orchestrator. CLAUDE.md hard rules.
