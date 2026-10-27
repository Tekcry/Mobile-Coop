# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-27 ~15:10 WEEKLY SAVE (weekly 92% at 15:09, ~1% per 5 min: 100% ~15:50; 5-hour 55%, resets 18:50. Michael swaps accounts when the weekly runs out. Boot: list_sessions + ListAgents FIRST; sessions survived the last clear, so start only missing titles; print laptop lines 6-7 only for laptop titles not live. The app pauses SendMessage to desktop leads after 10 sends without a Michael message: batch.)**
- Master and /preview/ 4.133.0. Train 171 (#712, 4.134.0: #710 Marlow re-plan gate graph, #601 K5a Plank Bridge carry, feature/menu) on the laptop since 03:46Z, expected ~17 min, running late (~6 min at 15:09); #653 K1 and #317 coop4 were left out on conflicts (Player merged master into #653, waits affected-e2e; #317 needs merge 18).
- Train-ready, waiting the next train: #703 context prompts P3, #705 P4 (stacked on #703, retargets after it), #710 / #601 (in 171). #622 K5b retargets to master after #601 lands.
- Waiting affected-e2e on the laptop (desktop worker refuses them, each ~37 min > its 15 min cap): #708 Campaign mode 1/4, #711 Campaign mode 2/4, #713 Guard AI mill hunt PR 1 (checker PASS x2), #653, #622 (f421b1a6), eaf2ef77. Biggest wait: these PR runs behind trains with the desktop slots idle (CPU ~23%); fix candidate for Test Runner: raise LQ_DESKTOP_MAX_MIN or shard PR runs.
- Building: Guard AI mill hunt (H3 update running on PR 1's final board, then check B, PR 2; H4 next with the room-edge cluster fix); Campaign CM4 (lobby choice, briefing, Continue row, main menu item; one Opus builder); Player context prompts / co-op kit upkeep; Marlow A8 planner slice (told 15:05 to start, not wait for the swap); Sector Ops character shadow meter fix agent, then a fresh laptop run (stale csm-s4 request withdrawn).
- Context: Player Build cleared ~15:00 (re-booted, up); Test Runner cleared ~15:08 on the laptop and sent its boot line, showed OFFLINE in ListAgents at 15:09 (check it came back; it resumes from SAVE 77 on feature/flake-fix). Campaign 61%, Sector Ops 52%, Guard AI past 50% (clear at the swap).
- FIXES open: F57, F58-F61 as at 14:30 (F61 Saltmarsh perf spare with Sector Ops; Test Runner has 2 perf-campusops reruns queued). No orchestrator agents running. Cron: 10-min check (recreate from STATE if missing).
- Michael's next walk card: S1 car park light, storm level, mill hunt once it lands, context prompts in /preview/ (needs a menu path, not ?ctxprompts=1), J16 shadow cue.
