# T2 - full e2e triage after the master merge (port 4193, one suite at a time, scripts only)

No game code changed. Every suite below was rerun alone on an idle PC (software GL).

| Suite | Alone (before edits) | Cause | Change | Final |
|---|---|---|---|---|
| e2e-ctcourse | FAIL 3 of 3 runs at station 3 (drawn x2, holstered x1) | Test, not the weapons code: `drawPistol` / `holster` tapped X for 250 ms; with the real weapon meshes a software-GL frame can outlast the tap, so the toggle never registered (`adsWanted` stayed false, `drawPhase` 0; weapons code draws correctly). | `drawPistol` / `holster` now hold X until the phase changes (`holdUntil`), plus a `diagWeapons` dump on failure | PASS (738 s). One run in between failed at station 4 "the client is thrown" (B4 throw, load; not repeated) |
| e2e-desktop (all 4 parts) | FAIL part 1 | stale: F1a relabelled the G binding "Quick-use selected gadget" | toast regex `/also Quick-use selected gadget/` | PASS (537 s) |
| e2e-stealth-ai | FAIL | stale: F1a / G179, N toggles the wheel's mode (night by default), the wheel picks thermal / electro | scenario rewritten: press = night, press = off, wheel picks thermal then electro via `vision.select` | PASS |
| e2e-stealth | PASS alone (25 s) | the pitch check and goggles failure were load only (the goggles check lives in e2e-stealth-ai) | none | PASS |
| e2e-traverse | PASS alone (42 s) | load (kick-in noise check) | none | PASS |
| e2e-menus | PASS alone (187 s) | load (hold-right repeat) | none | PASS |
| e2e-course (legacy Fallow) | PASS alone (269 s) | load (lamp group timing) | none | PASS |
| e2e-pad (flaky) | PASS alone (257 s) | | | PASS |
| e2e-netmove (flaky) | PASS alone (168 s) | | | PASS |
| e2e-coop (flaky) | FAIL alone (42 s), KNOWN FLAKY | "host sees the client holstered" timed out (same X-tap shape as ctcourse, possibly the same cause: not changed, not in scope) | none | report only |

Not touched: e2e-kestrel, e2e-camera-bounds level U (pre-existing).

Files: `scripts/e2e-ctcourse.mjs`, `scripts/e2e-desktop.mjs`, `scripts/e2e-stealth-ai.mjs`.
`npm run check` passes (lint, unit tests, build).
Advice: the full `npm run e2e` at 2 at a time is load-sensitive on this PC; rerun any failure alone before reading into it.
