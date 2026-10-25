# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~23:30 SAVE (account since ~22:50; 5-hour 69% at 23:28, ~2.5%/min: 92% ~23:37, 100% ~23:40; resets 03:50. Weekly 12%). Plain English, brief dot points.**
- Boot 22:56 fine: the 4 desktop leads started by start_session (cwd C:\NightShift, use_worktree false). Cloud start refused again (new account had no cloud environment; project folder not a git checkout): Michael started Cloud Builders 1-3 and both laptop sessions himself from prompts printed IN FULL in chat. Do the same next boot: try start_session cloud once, then print 3 cloud prompts + 2 laptop lines in one message.
- 23:38: train 107 released 4.104.2; train 108 (4.105.0: #452 Mixamo Anim Studio + #472 validator A2) built 23:36, CI + laptop running: when it releases, give Michael the Anim Studio walk card. #475 laptop-queue-6 (train gap fix): checker PASS reported by Test Runner but its report is not written anywhere yet; post checker only after reading it (asked Test Runner for a PR comment).
- Trains: 106 released 4.104.1 (#464 validator gate core). 107 (#466 Tallow spec, #463 Marlow 2 players, #447 no minimap / compass / blips, #446 guard alloc) built 23:14, CI green, laptop sharded running at 23:26.
- TOP PRIORITY (Michael ~22:42): Mixamo. #452 Anim Studio Mixamo is train-ready (all gates green 23:15) and missed train 107 by ~1 min: it rides train 108. When it ships, give Michael the Anim Studio walk card (menu path + version). In-game I1 checking, I2 in an Opus fix round (crawl capture spins the chest: Mixamo crawl off, hand-made kept), I3 brief open on cloud (priority top).
- Open PRs waiting on laptop runs: #468 + #472 validator B2 / A2 (tooling), #469 Sector Ops door light, #471 Marlow ctcourse flake fix (checker PASS; Test Runner quarantined ctcourse:4 by hand to 10-27 23:10), #473 Marlow re-plan PR 1 (dark; coop gate filed), #474 Sector Ops stars / PERFECT (delta checker running), #457, #445. #450 Guard AI rules PR1: checker posted, only affected 211a66d5 (14 suites) pending; docs-only conflicts in ai.md + takedowns.md: hand-merge in the train. #459 CI red (Node 22; cloud brief open); the service re-requested its affected run after I withdrew it (tooling: skip red-CI heads). #317 coop4 conflicts as before.
- Waste audit 23:05 acted on (STATE Known 23:05 line): leads file gate runs with the push; no request renames, priority only; Test Runner takes the train-gap / release tie-in tooling fix next. The 23:27 audit was skipped for the save: run one at boot.
- Laptop queue 21 open requests / 112 suites at 23:28: the biggest wait. Desktop CPU 100% (overflow runs + leads at BelowNormal).
- Cloud-queue: 4 briefs left claimed by the old account were reopened at boot; do the same next boot for any still claimed by Cloud Builder 1-3 of this account.
- Running orchestrator agents: none. Cron: 10-min check (dies with this session).
