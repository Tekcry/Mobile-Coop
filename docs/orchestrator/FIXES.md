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
- until the fix-first queue tier ships (#552), every cron run fronts the open laptop-queue requests of `fix`-labelled
  PRs (rename the request to a `20191231T...` id on the laptop-queue branch: lib `isFront` early-id tier), so fixes never
  wait behind feature requests (15:10 audit: fix PRs sat unclaimed 47-65 min behind ~46 requests);
- Done rows move to `archive/FIXES-done.md` with the PR, version and guard once shipped and quiet for a day.
## Fix freeze (Michael 2026-10-26 ~15:20, ROADMAP Decided; on until it ends below)
- Drafted by the orchestrator at 15:25 (mark ready again at the end; leave other drafts alone): 317 487 498 514 516 518 522 523 524 525 526 527 528 529 530 532 533 534 535 539 540 541 542 543 544 545 546 547 550 551 556 557 558 560 561 562 563.
- Parked: 51 feature requests moved from `requests/` to `parked/` on the laptop-queue branch (b0a996b0e); move each back
  at the end unless its head moved (then the lead re-files). Fix PR requests stay in `requests/`, fronted.
- Builders: Player Build builds laptop-queue-10 S1-S6 in order (one PR, Test Runner checks and owns it); Marlow
  Build builds laptop-queue-9 S1-S3; Test Runner ships #552 and #559, takes F8, F30 and checks both lanes; Campaign
  and Sector Ops F28 (their suites); Guard AI F21, F25, F27; Player F4 / F5 (#548). No feature builders, no feature
  queue requests; planning, reviews and briefs are fine.
- Each cron run: fronts fix requests, checks every open row for a builder, and ends the freeze when no open row is
  left without a shipped version (rows on watch do not hold it).

Older audit findings: `BOTTLENECKS.md` (history; new findings go here, not there).

| # | Fix | Evidence | Owner | Opened | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Laptop service retries a failed train status post and done push | train 118 passed 11:57, verdict lost in the swap, ~1h45m stall | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix): CI green, checker PASS 2fbfbd30; affected-e2e fronted 15:40 (was unclaimed 47 min); guards: unit trainRepair / trainHold lost / workerActivity; next: train-ready, train 122 |
| F2 | A claim whose heartbeat stopped counts as stale (train-level timeout) | train 118 claim held 2 h after its run ended | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F3 | The alone hold needs a live train claim, not just a pending status | the alone hold froze every laptop PR claim 12:01-13:39 | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F4 | e2e-pad flake (remap section), out of quarantine | parked till 2026-11-07, no fix planned | Player Build | 2026-10-26 13:58 | PR #548 (fix): CI green, checker PASS, proofs flake-fix-1..5 green (run 1 had one e2e-pad fail then pass: Player to explain before ship); affected-e2e fronted 15:40; guard: quarantine removed, a break fails the run |
| F5 | e2e-netmove flake | flaked in train 118 | Player Build | 2026-10-26 13:58 | PR #548 with F4; no netmove flake since 12:29 |
| F6 | lightField "allocation-free under a loop" unit flake | train 117 CI red once; #457 CI red once (10-26) | Test Runner (feature/lightfield-heap-3) | 2026-10-26 11:40 | PR #559 (dc17e670, 15:07): affected-e2e success (unit only), CI running, checker not started; guard: the test made deterministic (tests/helpers/allocPerCall.ts) |
| F7 | e2e-ctcourse parts 3 + 4 flake (+3-4 min per train) | auto-quarantined to 10-27 23:31Z, 3 / 66 runs | Marlow Build | 2026-10-25 23:05 | PR #553 (fix): CI green, checker PASS x2; affected-e2e + proofs f7-stall-after / f7-soak-1 fronted 15:40; guards: autojoin path, boot diagnostic, stall knob, a5Substation unit test (PR body) |
| F8 | Repeat-flake fix jobs (alerts/*-fixjob-*.json) live | not shipped | Test Runner (J20 PR-B) | 2026-10-25 ~23:00 | #538 draft, CONFLICTING, CI red; re-port after #552 releases as feature/test-runner-j20-prb3 (no branch yet); then read alerts/*-fixjob-*.json every cron run, deduped by suite |
| F9 | Train-building no-new-claims gate set as soon as a candidate exists | train 101 waited 17 min | Test Runner | 2026-10-25 20:58 | plan on feature/laptop-queue-10 (f5911cb4) S3, plan checker not run; builders not started (15:10) |
| F10 | Kill a queue run when no suite finishes in ~15 min | #317 hung 4192 65 min | Test Runner | 2026-10-25 20:58 | laptop-queue-10 S1, plan only (15:10) |
| F11 | A desktop failure queues the laptop rerun at once, incomplete runs included (timeout or no result: rerun every suite on the laptop) | #445 held 4191 45 min; tallow-prg1 c648c5d8 timed out on 4191 at 60 min, 0/7 suites, posted final red with no laptop rerun (service.mjs ~1504-1517 hands on only failed suites; Campaign 10-26 ~15:00) | Test Runner | 2026-10-25 21:28 | laptop-queue-10 S2, plan only (15:10) |
| F12 | auto-train: "nothing new" is idle, not an error; retry gh once inside a tick | train 102 7 min late; HTTP 499 error tick 2026-10-26 13:50 | Test Runner | 2026-10-25 13:35 | laptop-queue-9 S1, plan only, PAST 24 h (15:10): PR date asked |
| F14 | Desktop overflow caps runs by expected time from times.json (~15 min at 1 job), not suite count | #447 held 4191 64 min; tallow-prg1 "7 suites" = ~17 parts, ~60 min on 4191 from 13:22 (10-26) | Test Runner | 2026-10-25 23:05 | laptop-queue-10 S2, plan only; RECURRING: desktop 4192 ran #487's affected 31+ min (14:36-15:07+); #552 slice D is the stop-gap |
| F15 | Renaming a request to an earlier id is a move, not a withdrawal | Mixamo lost its place | Test Runner | 2026-10-25 22:40 | laptop-queue-10 S6, plan only (15:10) |
| F16 | auto-train reads check + checker + affected-e2e itself (no label wait) | #460 missed train 103 | Test Runner | 2026-10-25 21:57 | laptop-queue-9 S2, plan only (15:10) |
| F18 | merge-train release leaves the deploy watch to later ticks | ~6 min per train | Test Runner | 2026-10-25 13:35 | laptop-queue-9 S1, plan only, PAST 24 h; still happening: release 119 7 m 27 s, 120 4 m 53 s |
| F19 | Pacing counts only laptop claims; then restore --min-interval | pacing OFF since 10-25 15:35 | Test Runner | 2026-10-25 15:35 | laptop-queue-9 S1, plan only, 24 h at 15:35; then the orchestrator re-registers --min-interval 60 (S5) |
| F20 | Watchdog reads re-filed T000001 ids correctly | misread as old | Test Runner | 2026-10-25 20:58 | laptop-queue-9 S3, plan only (15:10) |
| F21 | Runner guard armed (G298), not melee | Inbox 2026-10-26 12:40 (Player J19 S4 brief) | Guard AI Build (#531) | 2026-10-26 12:41 | PR #531 RED: CI test (weapons-audio.test.ts gun table runner) + laptop-e2e/runner-armed 1/3 (e2e-modes, e2e-enemies), 14:02-14:09; Guard AI fixing |
| F22 | Queue ranks master-based PRs ahead of stacked ones (base = a feature branch) | 7 stacked requests, ~51 suites ahead of trainable PRs (10-26 14:00) | Test Runner | 2026-10-26 14:10 | laptop-queue-10 S4, plan only (15:10) |
| F23 | auto-train re-reads candidates when the build starts | #521 missed train 119 by 27 s | Test Runner (with F16) | 2026-10-26 14:10 | laptop-queue-9 S2, plan only (15:10) |
| F24 | Desktop worker logs the CPU reading at each start (verify the 80% gate) | starts at 13:41 / 13:49 / 13:56 with CPU reported 100% | Test Runner | 2026-10-26 14:10 | laptop-queue-10 S3, plan only; desktop still logs no CPU reading at starts (14:36, 14:47) |
| F25 | No Math.random in src/ai: replayable guard timing (hard rule 8) | J20 S6b | Guard AI Build (#537) | 2026-10-26 14:10 | PR #537 (fix): CI green, checker PASS; affected-e2e + laptop seed-random fronted 15:40 (were unclaimed 62-65 min); guard: replayDeterminism allowlist empty, aiSeeded.test.ts |
| F26 | A quarantine matches a named step or error text, not any failure in the suite | e2e-pad was broken (not flaky) for 6 trains, hidden by its quarantine; ctcourse :3/:4 quarantine also forgives the deadlock and boot timeouts (Marlow 15:20) | Test Runner | 2026-10-26 14:20 | laptop-queue-10 S5, plan only (15:10) |
| F27 | playerRefsInto (src/game/gameState.ts:1083) allocates every sim step (`out.length = 0` then push); hot paths allocate nothing (CLAUDE.md hard rules) | Sector Ops side finding 2026-10-26 ~15:05 | Guard AI Build (coop4) | 2026-10-26 15:05 | new; no branch yet (15:10). Number clash: laptop-queue-10's BRIEF calls the per-attempt train log folders F27; that is F31 here |
| F28 | Second-tab join uses the 1.5 s probe and can deadlock in e2e-course, e2e-bunker, e2e-sectorops (as ctcourse did, F7 fix C): add `&autojoin=1` to the second tab | Marlow F7 triage, #553 (2026-10-26 ~15:20); e2e-sectorops:6 flaked in train 121 (15:07, 890 s vs ~570 s), auto-quarantined since 10-25 19:13 (3 of 4 runs): maybe this cause | Test Runner (suites), Sector Ops for e2e-sectorops | 2026-10-26 15:20 | new |
| F29 | Route-run self-tests fail on #520 (1 player 0/1 in 42 s, pair 0/1 in 117 s) | laptop alone sets route-run-selftest-steps / -pair on bf8a91ee4, 2026-10-26 ~14:45-14:49 | Marlow Build (Opus triage on 4191; to Test Runner if the queue's serve step) | 2026-10-26 15:30 | triage running: scratch/marlow/rr-selftest-triage.md; fix branch feature/route-runs-selftest-fix |
| F30 | Logs of failed laptop alone runs never reach the desktop (no way to read why it failed) | F29: both failures, no logs on the desktop | Test Runner | 2026-10-26 15:30 | new |
| F31 | Keep each train attempt's logs in its own folder (train 118 logs were lost) | laptop-queue-10 BRIEF "F27" | Test Runner | 2026-10-26 15:40 | laptop-queue-10, plan only |
| F32 | shadowCues S3b allocation over its 2432 B limit in a full parallel run (5/5 green alone): possible next allocation flake | #559 body (2026-10-26 15:07) | Sector Ops (shadow cues) | 2026-10-26 15:40 | watch: reopen as a fix on the first CI or e2e fail |
