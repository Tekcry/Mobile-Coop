# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~18:35 SAVE (5-hour meter 79% at 18:30, ~1%/min: 92% ~18:42, 100% ~18:50, resets 22:00; weekly 30%, resets 1 Nov. Boot: list_sessions + ListAgents FIRST; start only missing titles; bypassPermissions on every desktop session; try the laptop lines over SSH first (STATE Known).)**
- Master 4.114.1 (train 126, ~17:25). Trains 125, 127 failed (#574 ctcourse; #525 sectorops:6), 128 failed CI (#530 levelMeasureCampus drift S1-S5), 129 closed by hand (#530 rejoined unchanged, F49). #530 is DRAFT until Marlow pushes the drift fix. Next train should take: #586 (F44 auto-drop fix), #572 (affected cap 1), #587 (F46/F48 + closed-PR pick + gh retry), #582 (preview prebake), #579 (F45 Mixamo preview default), #574 (re-plan yard, ctcourse 5/7/8 quarantined to 10-29), #561 #562 #550 #516 #514 #558 #552 #522; then #573 #525 #518 (S1 v2 + lighting, sectorops:6 walk fixed) and the S2-S5 v2 PRs #529 #544 #547 #535.
- PR 591 (Marlow Yard play blockers, superset of 574, checker PASS f27d0c40): label train-ready once 574 is on master (Marlow asked). PR 590 (Player coop-kit A1) waits on 578.
- Prototype mode steps done: freeze over (32 PRs readied 17:12; #518 back to draft by Sector Ops), #560 shipped (4.114.0), play plan given to Michael ~17:25 BUT he is told to HOLD playing until #574 (Marlow Yard spotted rule / stations) and #525 (15-guard S1) ship: when both are on /preview/, tell him the version label and that he can play (plan text in chat at ~17:25; Marlow Yard needs 2 players; Tallow not startable until #583).
- Open lead work: Player - coop-kit A1 rope descent (stacked on feature/mission-b-sector) + part 2 plan (Plank Bridge, Deadweight, Chimney Pair, Swing Pass, Drop Catch); Marlow - play-blocker builders on feature/marlow-play (3 of 5 done), #530 drift fix; Sector Ops - S1 bake into shipped prebake, v2 S2-S5 PRs; Campaign - engine chain #522 -> #578 -> #581 -> #583 (CI test fixes pushed 18:20; retarget in order); Guard AI - #585 / #588 play pass, #317 (needs checker + co-op affected on 63636bd2), #558 (needs checker status); Test Runner - #572 #586 #587.
- FIXES F43-F49 added today (watchdog vs withdrawn affected, auto-drop root cause, Mixamo preview, dead-head claims, ready not re-filing affected, per-machine quarantine, dropped PR re-added). Cloud Builder 5 idle (no open briefs).
- Sessions at the save: Player, Marlow, Sector Ops, Campaign (desktop, bypass, started 17:05), Guard AI and Test Runner (laptop, switched to bypass by Michael ~17:55), Cloud Builder 5 (cloud). Running orchestrator agents: none. Cron: 10-min check (session-only, recreate from STATE).
