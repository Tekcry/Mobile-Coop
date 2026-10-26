# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~16:05 SAVE (5-hour meter 81% at 16:03, ~1.2%/min: 92% ~16:12, 100% ~16:19; weekly 64%, resets 1 Nov. Boot: list_sessions + ListAgents FIRST; start only missing titles; bypassPermissions on every desktop session.)**
- PROTOTYPE MODE (ROADMAP Decided ~16:05) replaces the fix freeze: read that entry first. Steps left: (1) train 124 should take #552 #568 #457 #494 #531 #537 #559 (labelled train-ready + no-affected-e2e at 16:04); Marlow fixes #553's conflict and Campaign #567's, then label; #548 joins when Player's recheck passes. (2) once that train ships: `gh pr ready` every PR in C:/NightShift/scratch/freeze-drafted.txt (37), leave parked/ on laptop-queue parked (cancelled). (3) #560 preview flags: Player rebases (conflicting), orchestrator labels it train-ready + no-affected-e2e. (4) Test Runner sets the affected cap to 1 (E2E_AFFECTED_MAX=1) on the laptop and desktop workers. (5) write Michael's play plan for /preview/ (menu paths, version label, Marlow Yard training, Saltmarsh Park S1, co-op) once #560 ships; the walk card for 4.108-4.113 folds into it.
- Train 123 (4.113.1, #569) was testing at the save; train 122 (4.113.0) shipped 15:41.
- Lanes still building (finish review and ship, nothing new after): laptop-queue-10 #570 (Player, S7 docs + checker), laptop-queue-9 (Marlow, F34 S6 + checkers, PR to open), laptop-queue-11 #572 (Test Runner, checker), F29 fix on #520 (Marlow), F33 #568, F42 (Sector Ops, new), F27 (Guard AI, not started).
- FIXES.md is current (F1-F42); its "Fix freeze" block ends with prototype mode. Rules added today: fixes first with repeat guards (14:00, 15:05); no session waits on another, blocked sessions message the orchestrator (15:55).
- Sessions at the save: Player, Marlow, Sector Ops, Campaign (desktop, bypass, started ~14:52), Guard AI and Test Runner (laptop), Cloud Builder 4 (cloud, D1 blocked on a Tallow map fix Campaign is planning). Running orchestrator agents: none. Cron: 10-min check (session-only, recreate from STATE).
