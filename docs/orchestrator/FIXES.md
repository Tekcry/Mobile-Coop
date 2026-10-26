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
- Drafting does not keep a PR out of a train (auto-train and the watchdog ignore draft, F34): each cron run removes
  `train-ready` from every drafted freeze PR. Train 122 (#487, built ~15:17 before the draft) is left to finish.
- Renaming a request to front it posts affected-e2e error "withdrawn by the requester (not run)" on the old id (F15);
  the renamed request still runs and posts the verdict.
- No lead takes heavy.lock / heavy2.lock for a one-off while fix requests wait (15:33 audit: 4191 lost 6.5 min to a
  triage lock); desktop over 90%: the orchestrator trims the heaviest session.
- At the end, before any drafted PR gets train-ready again: Guard AI re-reviews #551 guardWarm.ts (Sector Ops ask,
  15:15); the orchestrator posts the checker marks Guard AI reported for #317 (2ec31a28, MERGE3*.md) and #558
  (ae3d37a7) after reading those reports.
- Each cron run: parks any new non-fix request (a desktop failure rerun of a draft is still filed: #518 at 15:31, F34),
  fronts fix requests, checks every open row for a builder, and ends the freeze when no open row is
  left without a shipped version (rows on watch do not hold it).

Older audit findings: `BOTTLENECKS.md` (history; new findings go here, not there).

| # | Fix | Evidence | Owner | Opened | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Laptop service retries a failed train status post and done push | train 118 passed 11:57, verdict lost in the swap, ~1h45m stall | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix): CI green, checker PASS 2fbfbd30; affected-e2e fronted 15:40 (was unclaimed 47 min); guards: unit trainRepair / trainHold lost / workerActivity; next: train-ready, train 122 |
| F2 | A claim whose heartbeat stopped counts as stale (train-level timeout) | train 118 claim held 2 h after its run ended | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F3 | The alone hold needs a live train claim, not just a pending status | the alone hold froze every laptop PR claim 12:01-13:39 | Test Runner (laptop-queue-8 slice G) | 2026-10-26 13:45 | PR #552 (fix, squash onto master, 1094 lines), checker PASS 2fbfbd30, 301/301 unit; trains ahead of F8 |
| F4 | e2e-pad flake (remap section), out of quarantine | parked till 2026-11-07, no fix planned | Player Build | 2026-10-26 13:58 | PR #548 new head 852e2832 (15:50): flake-fix-1 log showed a second cause (quit to main menu applies a waiting update, pwa.ts reloads, page.evaluate dies); quit check now waits across a reload and reconnects the pad; fresh Opus checker running; proofs flake-fix-r2-1..3 fronted; guard: the step names a reload when it happens |
| F5 | e2e-netmove flake | flaked in train 118 | Player Build | 2026-10-26 13:58 | PR #548 with F4; no netmove flake since 12:29 |
| F6 | lightField "allocation-free under a loop" unit flake | train 117 CI red once; #457 CI red once (10-26) | Test Runner (feature/lightfield-heap-3) | 2026-10-26 11:40 | PR #559: Opus fix round for the checker FAIL running; new head + checker ~17:30 (Test Runner) |
| F7 | e2e-ctcourse parts 3 + 4 flake (+3-4 min per train) | auto-quarantined to 10-27 23:31Z, 3 / 66 runs | Marlow Build | 2026-10-25 23:05 | PR #553 (fix): CI green, checker PASS x2; affected-e2e + proofs f7-stall-after / f7-soak-1 fronted 15:40; guards: autojoin path, boot diagnostic, stall knob, a5Substation unit test (PR body) |
| F8 | Repeat-flake fix jobs (alerts/*-fixjob-*.json) live | not shipped | Test Runner (J20 PR-B) | 2026-10-25 ~23:00 | #538 draft, CONFLICTING, CI red; re-port after #552 releases as feature/test-runner-j20-prb3 (no branch yet); then read alerts/*-fixjob-*.json every cron run, deduped by suite |
| F9 | Train-building no-new-claims gate set as soon as a candidate exists | train 101 waited 17 min | Test Runner | 2026-10-25 20:58 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F10 | Kill a queue run when no suite finishes in ~15 min | #317 hung 4192 65 min | Test Runner | 2026-10-25 20:58 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F11 | A desktop failure queues the laptop rerun at once, incomplete runs included (timeout or no result: rerun every suite on the laptop) | #445 held 4191 45 min; tallow-prg1 c648c5d8 timed out on 4191 at 60 min, 0/7 suites, posted final red with no laptop rerun (service.mjs ~1504-1517 hands on only failed suites; Campaign 10-26 ~15:00) | Test Runner | 2026-10-25 21:28 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F12 | auto-train: "nothing new" is idle, not an error; retry gh once inside a tick | train 102 7 min late; HTTP 499 error tick 2026-10-26 13:50 | Test Runner | 2026-10-25 13:35 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34 |
| F14 | Desktop overflow caps runs by expected time from times.json (~15 min at 1 job), not suite count | #447 held 4191 64 min; tallow-prg1 "7 suites" = ~17 parts, ~60 min on 4191 from 13:22 (10-26) | Test Runner | 2026-10-25 23:05 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F15 | Renaming a request to an earlier id is a move, not a withdrawal | Mixamo lost its place | Test Runner | 2026-10-25 22:40 | laptop-queue-10 S6 building (Player, #570) |
| F16 | auto-train reads check + checker + affected-e2e itself (no label wait) | #460 missed train 103 | Test Runner | 2026-10-25 21:57 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34 |
| F18 | merge-train release leaves the deploy watch to later ticks | ~6 min per train | Test Runner | 2026-10-25 13:35 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34 |
| F19 | Pacing counts only laptop claims; then restore --min-interval | pacing OFF since 10-25 15:35 | Test Runner | 2026-10-25 15:35 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34; then the orchestrator re-registers --min-interval 60 |
| F20 | Watchdog reads re-filed T000001 ids correctly | misread as old | Test Runner | 2026-10-25 20:58 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34 |
| F21 | Runner guard armed (G298), not melee | Inbox 2026-10-26 12:40 (Player J19 S4 brief) | Guard AI Build (#531) | 2026-10-26 12:41 | PR #531 new head 1f3a20fd: CI fixed, checker PASS posted 15:58 (re-check on 13cf2b9c9); affected-e2e running on the desktop, runner-armed (modes + enemies) fronted |
| F22 | Queue ranks master-based PRs ahead of stacked ones (base = a feature branch) | 7 stacked requests, ~51 suites ahead of trainable PRs (10-26 14:00) | Test Runner | 2026-10-26 14:10 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F23 | auto-train re-reads candidates when the build starts | #521 missed train 119 by 27 s | Test Runner (with F16) | 2026-10-26 14:10 | built in laptop-queue-9 (Marlow, ced837000, 215 unit); two Opus checkers running; PR after F34 |
| F24 | Desktop worker logs the CPU reading at each start (verify the 80% gate) | starts at 13:41 / 13:49 / 13:56 with CPU reported 100% | Test Runner | 2026-10-26 14:10 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F25 | No Math.random in src/ai: replayable guard timing (hard rule 8) | J20 S6b | Guard AI Build (#537) | 2026-10-26 14:10 | PR #537 TRAIN-READY 15:58 (d51202fa): CI, checker PASS, affected-e2e 3/3, seed-random 8/8; guards: replayDeterminism allowlist empty, aiSeeded.test.ts |
| F26 | A quarantine matches a named step or error text, not any failure in the suite | e2e-pad was broken (not flaky) for 6 trains, hidden by its quarantine; ctcourse :3/:4 quarantine also forgives the deadlock and boot timeouts (Marlow 15:20) | Test Runner | 2026-10-26 14:20 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F27 | playerRefsInto (src/game/gameState.ts:1083) allocates every sim step (`out.length = 0` then push); hot paths allocate nothing (CLAUDE.md hard rules) | Sector Ops side finding 2026-10-26 ~15:05 | Guard AI Build (coop4) | 2026-10-26 15:05 | new; no branch yet (15:10). Number clash: laptop-queue-10's BRIEF calls the per-attempt train log folders F27; that is F31 here |
| F28 | Second-tab join uses the 1.5 s probe and can deadlock in e2e-course and e2e-bunker (as ctcourse did, F7 fix C): add `&autojoin=1` to the second tab | Marlow F7 triage, #553 (2026-10-26 ~15:20); e2e-sectorops does not use the probe (joins through the menu; Sector Ops 15:35) | Campaign Build (fix freeze), Test Runner checks | 2026-10-26 15:20 | PR #567 (fix, b7cdc3a5, stacked on #553: retarget to master once #553 ships); guard: a boot timeout prints both tabs' sessions; Opus checker running |
| F29 | Route-run self-tests fail on #520 (1 player 0/1 in 42 s, pair 0/1 in 117 s) | laptop alone sets route-run-selftest-steps / -pair on bf8a91ee4, 2026-10-26 ~14:45-14:49 | Marlow Build (Opus triage on 4191; to Test Runner if the queue's serve step) | 2026-10-26 15:30 | cause found (Marlow test fixture, not the queue): link 12 walk point on the locked plant-room dock door, link 19 at the hatch centre (robot stalls 0.59 m short); Opus fix on #520 (f29-fix-report.md); guard: unit test that fixture points sit strictly inside their space, never in a door or opening |
| F30 | Logs of failed laptop alone runs never reach the desktop (no way to read why it failed) | F29: both failures, no logs on the desktop | Test Runner | 2026-10-26 15:30 | log half done (Guard AI pushed logs/pad-flakes/flake-fix-1-1d24b5de/, fa5f31dd0); code half in laptop-queue-11, PR ~18:30 |
| F31 | Keep each train attempt's logs in its own folder (train 118 logs were lost) | laptop-queue-10 BRIEF "F27" | Test Runner | 2026-10-26 15:40 | built in laptop-queue-10 (Player, draft PR #570, 333 unit); checker + PR after S6c, base #552 |
| F32 | shadowCues S3b allocation over its 2432 B limit in a full parallel run (5/5 green alone): possible next allocation flake | #559 body (2026-10-26 15:07) | Sector Ops (shadow cues) | 2026-10-26 15:40 | watch: reopen as a fix on the first CI or e2e fail |
| F33 | e2e-sectorops:6 (solo Saltmarsh Park S1-S5 + guard-ai S16) fails three ways: 900 s kill (part alone 676-749 s), an S3 guard ending at y 0 under a 4.5 m slot, a breaker-count assert (maybe a WIP head) | train 121 flake 15:07 (890 s vs ~570 s); auto-quarantined since 10-25 19:13 (3 of 4 runs); desktop logs | Sector Ops Build | 2026-10-26 15:35 | PR #568 (fix, 9804f784): checker PASS; proof f33-parts (e2e-sectorops:6-9) fronted 15:40; guards: named `launch:` error at 180 s, e2eAffected maps campus files to parts 6-9, a `SLOW:` line at 75% of the kill limit (e2eVerdict tests) |
| F34 | auto-train and the watchdog ignore draft: a draft PR keeps or gets `train-ready` and rides a train | #487 drafted ~15:24 for the fix freeze, already in train 122 (built ~15:17) with the label still on; the desktop worker files a laptop rerun for a failed draft run (#518, 15:31) | Test Runner (laptop-queue-9 lane, Marlow builds) | 2026-10-26 15:25 | laptop-queue-9 S6 building (Marlow); orchestrator strips the label meanwhile |
| F35 | Nothing reports the new `SLOW:` line (a passing suite over 75% of its kill limit): the queue summary or the watchdog should raise it, or it is no early warning | Sector Ops, #568 (2026-10-26 15:40) | Test Runner | 2026-10-26 15:40 | laptop-queue-11 (feature/laptop-queue-11), Opus building; PR ~18:00 |
| F36 | times.json has no rows for e2e-sectorops parts 7-9 until the next full run: a sharded plain e2e-sectorops request before then runs parts 1-6 only | Sector Ops, #568 (2026-10-26 15:40) | Test Runner | 2026-10-26 15:40 | laptop-queue-11: wider than read: the queue shards from times.json keys, not the head's own run-e2e PARTS, so stale keys (ctcourse:5-8, desktop:3) can make parts that do not exist; fix reads the head's parts; PR ~18:00 |
| F37 | Objective lines name a place; no exit beacon (rule fix, G290 / G339) | #457 (fix label, Sector Ops J5) | Sector Ops Build | 2026-10-26 15:45 | PR #457: checker PASS, affected-e2e queued |
| F38 | Mixamo is not the default: Animation source toggle Hand-made / CMU / Mixamo (Michael ~00:25 fix to shipped behaviour) | #494 (fix label, Player) | Player Build | 2026-10-26 15:45 | PR #494: master merge e24281c9, Opus checker on the merge, affected-e2e queued |
| F39 | Queue pick runs an alone request over 30 min old before the front tier, and an alone run takes both laptop slots: fronted fix PR runs waited behind two aged #553 / #520 alone sets | 15:33 time audit: 0 fix minutes on the laptop 15:00-15:33; #552 affected 70 min unclaimed | Test Runner (laptop-queue-10 lane, Player builds) | 2026-10-26 15:45 | laptop-queue-10 S6b (Player, #570), after S6; orchestrator resets alone ages meanwhile |
| F40 | A freeze or withdraw does not stop an in-flight run: parked feature runs kept the slots (#518 12 min on 4191, failed; #520 alone to 15:21) | 15:33 time audit | Test Runner (laptop-queue-10 lane) | 2026-10-26 15:45 | laptop-queue-10 S6c (Player, #570) |
| F41 | A fresh e2e browser sees a waiting game update: the e2e profile or origin seems to keep an old service worker between runs, so quitting to the menu reloads the page mid-test | #548 flake-fix-1 log (e2e-pad, "Execution context was destroyed"), a desktop run 10-25 (Player 15:50) | Test Runner | 2026-10-26 15:55 | new |
| F42 | Saltmarsh Park S1: a PC desk (0.75 m top) sits where the window vault lands (campusS1.ts:210), over the 0.6 m landing check (traversal.ts:283-284), so the vault the map graph declares cannot happen in game | Marlow F29 triage (2026-10-26 ~15:55) | Sector Ops Build | 2026-10-26 15:55 | new |
