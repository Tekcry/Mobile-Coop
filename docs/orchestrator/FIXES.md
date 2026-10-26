# Open fixes (the one tracker)

Owner: the orchestrator. Status: current.

Every fix found by an audit, a train failure, a flake or a session report goes here the same turn, with an owner. The
orchestrator's cron run reads this table every run (Michael 2026-10-26 ~14:00: "how are you making sure all these fixes
are being handled automatically and not continuing to cause issues"; ~15:05: "main priority is getting all the fixes
out and staying on top of them constantly to ensure issues dont re-occur unncessarily"):
- fixes come before feature work for every owner (ROADMAP Decided 14:00, 15:05);
- no PR or branch 24 h after Opened: message the owner for a date; 48 h: reassign it or start an Opus fix agent;
- every fix PR adds a guard that catches a repeat (a unit test, an e2e step, an alert or an audit check), named in its
  Status; a fix with no guard is not done;
- a shipped fix stays in the table as "shipped <version>, watching" for a day; the cron checks its Evidence signal
  (queue log, auto-train log, CI) every run and reopens it with the new evidence if the problem shows up again;
- Done rows move to `archive/FIXES-done.md` with the PR, version and guard once shipped and quiet for a day.
Older audit findings: `BOTTLENECKS.md` (history; new findings go here, not there).

| # | Fix | Evidence | Owner | Opened | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Laptop service retries a failed train status post and done push | train 118 passed 11:57, verdict lost in the swap, ~1h45m stall | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F2 | A claim whose heartbeat stopped counts as stale (train-level timeout) | train 118 claim held 2 h after its run ended | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F3 | The alone hold needs a live train claim, not just a pending status | the alone hold froze every laptop PR claim 12:01-13:39 | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F4 | e2e-pad flake (remap section), out of quarantine | parked till 2026-11-07, no fix planned | Player Build | 2026-10-26 13:58 | PR #548 (fix, test-only, quarantine removed), Opus checker running, laptop proof x5 queued |
| F5 | e2e-netmove flake | flaked in train 118 | Player Build | 2026-10-26 13:58 | PR #548 with F4 |
| F6 | lightField "allocation-free under a loop" unit flake | train 117 CI red once; #457 CI red once (10-26) | Test Runner (feature/lightfield-heap-3) | 2026-10-26 11:40 | building (fix PR next) |
| F7 | e2e-ctcourse parts 3 + 4 flake (+3-4 min per train) | auto-quarantined to 10-27 23:31Z, 3 / 66 runs | Marlow Build | 2026-10-25 23:05 | assigned 14:00 |
| F8 | Repeat-flake fix jobs (alerts/*-fixjob-*.json) live | not shipped | Test Runner (J20 PR-B) | 2026-10-25 | #538 set to draft (kept out of trains); re-port on #552 as feature/test-runner-j20-prb3, fresh PR once #552 releases; then read alerts/*-fixjob-*.json every cron run, deduped by suite |
| F9 | Train-building no-new-claims gate set as soon as a candidate exists | train 101 waited 17 min | Test Runner | 2026-10-25 20:58 | partly: laptop done 4.105.1; desktop in laptop-queue-8 slice H |
| F10 | Kill a queue run when no suite finishes in ~15 min | #317 hung 4192 65 min | Test Runner | 2026-10-25 20:58 | laptop-queue-8 slice H (LQ_SUITE_IDLE_MIN) |
| F11 | A desktop failure queues the laptop rerun at once, incomplete runs included (timeout or no result: rerun every suite on the laptop) | #445 held 4191 45 min; tallow-prg1 c648c5d8 timed out on 4191 at 60 min, 0/7 suites, posted final red with no laptop rerun (service.mjs ~1504-1517 hands on only failed suites; Campaign 10-26 ~15:00) | Test Runner | 2026-10-25 21:28 | laptop-queue-8 slice H |
| F12 | auto-train: "nothing new" is idle, not an error; retry gh once inside a tick | train 102 7 min late; HTTP 499 error tick 2026-10-26 13:50 | Test Runner | 2026-10-25 13:35 | laptop-queue-9 (Opus planning) |
| F14 | Desktop overflow caps runs by expected time from times.json (~15 min at 1 job), not suite count | #447 held 4191 64 min; tallow-prg1 "7 suites" = ~17 parts, ~60 min on 4191 from 13:22 (10-26) | Test Runner | 2026-10-25 23:05 | reopened 14:10: slice H must cap by time |
| F15 | Renaming a request to an earlier id is a move, not a withdrawal | Mixamo lost its place | Test Runner | 2026-10-25 22:40 | laptop-queue-8 slice H |
| F16 | auto-train reads check + checker + affected-e2e itself (no label wait) | #460 missed train 103 | Test Runner | 2026-10-25 21:57 | laptop-queue-9 |
| F18 | merge-train release leaves the deploy watch to later ticks | ~6 min per train | Test Runner | 2026-10-25 13:35 | laptop-queue-9 |
| F19 | Pacing counts only laptop claims; then restore --min-interval | pacing OFF since 10-25 15:35 | Test Runner | 2026-10-25 15:35 | laptop-queue-9 plan 7ed99264, plan checker running; after it releases the ORCHESTRATOR re-registers auto-train with -TickArgs "--min-interval 60" (S5) |
| F20 | Watchdog reads re-filed T000001 ids correctly | misread as old | Test Runner | 2026-10-25 20:58 | laptop-queue-9 |
| F21 | Runner guard armed (G298), not melee | Inbox 2026-10-26 12:40 (Player J19 S4 brief) | Guard AI Build (#531) | 2026-10-26 12:41 | PR open, checker PASS, laptop runner-armed |
| F22 | Queue ranks master-based PRs ahead of stacked ones (base = a feature branch) | 7 stacked requests, ~51 suites ahead of trainable PRs (10-26 14:00) | Test Runner | 2026-10-26 14:10 | new |
| F23 | auto-train re-reads candidates when the build starts | #521 missed train 119 by 27 s | Test Runner (with F16) | 2026-10-26 14:10 | new |
| F24 | Desktop worker logs the CPU reading at each start (verify the 80% gate) | starts at 13:41 / 13:49 / 13:56 with CPU reported 100% | Test Runner | 2026-10-26 14:10 | new |
| F25 | No Math.random in src/ai: replayable guard timing (hard rule 8) | J20 S6b | Guard AI Build (#537) | 2026-10-26 14:10 | PR open, checker PASS, laptop seed-random |
| F26 | A quarantine matches a named step or error text, not any failure in the suite | e2e-pad was broken (not flaky) for 6 trains, hidden by its quarantine; ctcourse :3/:4 quarantine also forgives the deadlock and boot timeouts (Marlow 15:20) | Test Runner | 2026-10-26 14:20 | new |
| F27 | playerRefsInto (src/game/gameState.ts:1083) allocates every sim step (`out.length = 0` then push); hot paths allocate nothing (CLAUDE.md hard rules) | Sector Ops side finding 2026-10-26 ~15:05 | Guard AI Build (coop4) | 2026-10-26 15:05 | new |
| F28 | Second-tab join uses the 1.5 s probe and can deadlock in e2e-course, e2e-bunker, e2e-sectorops (as ctcourse did, F7 fix C): add `&autojoin=1` to the second tab | Marlow F7 triage, #553 (2026-10-26 ~15:20) | Test Runner (suites), Sector Ops for e2e-sectorops | 2026-10-26 15:20 | new |
