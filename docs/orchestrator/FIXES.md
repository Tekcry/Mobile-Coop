# Open fixes (the one tracker)

Owner: the orchestrator. Status: current.

Every fix found by an audit, a train failure, a flake or a session report goes here the same turn, with an owner. The
orchestrator's cron run reads this table every run (Michael 2026-10-26 ~14:00: "how are you making sure all these fixes
are being handled automatically and not continuing to cause issues"):
- no PR or branch 24 h after Opened: message the owner for a date; 48 h: reassign it or start an Opus fix agent;
- a fix whose problem shows up again after it shipped: reopen it, with the new evidence;
- Done rows move to `archive/FIXES-done.md` with the PR and version once shipped and quiet for a day.
Older audit findings: `BOTTLENECKS.md` (history; new findings go here, not there).

| # | Fix | Evidence | Owner | Opened | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Laptop service retries a failed train status post and done push | train 118 passed 11:57, verdict lost in the swap, ~1h45m stall | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | planning |
| F2 | A claim whose heartbeat stopped counts as stale (train-level timeout) | train 118 claim held 2 h after its run ended | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | planning |
| F3 | The alone hold needs a live train claim, not just a pending status | the alone hold froze every laptop PR claim 12:01-13:39 | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | planning |
| F4 | e2e-pad flake (remap section), out of quarantine | parked till 2026-11-07, no fix planned | Player Build | 2026-10-26 13:58 | Opus investigating |
| F5 | e2e-netmove flake | flaked in train 118 | Player Build | 2026-10-26 13:58 | Opus investigating |
| F6 | lightField "allocation-free under a loop" unit flake | train 117 CI red once | Test Runner (feature/lightfield-heap-3) | 2026-10-26 11:40 | building |
| F7 | e2e-ctcourse parts 3 + 4 flake (+3-4 min per train) | auto-quarantined to 10-27 23:31Z, 3 / 66 runs | Marlow Build | 2026-10-25 23:05 | assigned 14:00 |
| F8 | Repeat-flake fix jobs (alerts/*-fixjob-*.json) live | not shipped | Test Runner (J20 PR-B) | 2026-10-25 | after slice G |
| F9 | Train-building no-new-claims gate set as soon as a candidate exists | train 101 waited 17 min | Test Runner | 2026-10-25 20:58 | check: done in #507? |
| F10 | Kill a queue run when no suite finishes in ~15 min | #317 hung 4192 65 min | Test Runner | 2026-10-25 20:58 | check |
| F11 | A desktop failure queues the laptop rerun at once | #445 held 4191 45 min | Test Runner | 2026-10-25 21:28 | check |
| F12 | auto-train: "nothing new" is idle, not an error; retry gh once inside a tick | train 102 7 min late; HTTP 499 error tick 2026-10-26 13:50 | Test Runner | 2026-10-25 13:35 | check |
| F13 | request.mjs rejects unknown suite names | a 0-suite run posted success | Test Runner | 2026-10-25 21:28 | check |
| F14 | Runs over ~8 suites stay off the desktop overflow | #447 held 4191 64 min | Test Runner | 2026-10-25 23:05 | check |
| F15 | Renaming a request to an earlier id is a move, not a withdrawal | Mixamo lost its place | Test Runner | 2026-10-25 22:40 | check |
| F16 | auto-train reads check + checker + affected-e2e itself (no label wait) | #460 missed train 103 | Test Runner | 2026-10-25 21:57 | check |
| F17 | Laptop train gap tied to auto-train's releasing state | Player ffb7f02a killed twice | Test Runner | 2026-10-25 21:57 | check: #507 slice F? |
| F18 | merge-train release leaves the deploy watch to later ticks | ~6 min per train | Test Runner | 2026-10-25 13:35 | check |
| F19 | Pacing counts only laptop claims; then restore --min-interval | pacing OFF since 10-25 15:35 | Test Runner | 2026-10-25 15:35 | check |
| F20 | Watchdog reads re-filed T000001 ids correctly | misread as old | Test Runner | 2026-10-25 20:58 | check |
