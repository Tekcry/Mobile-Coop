# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-27 ~07:50 SAVE (5-hour meter 83% at 07:49, resets 08:50; weekly 63%, resets 1 Nov 16:00 at ~16% weekly per full window, so it runs out ~Tue evening at full pace: ask Michael. NO SWAP: same account, sessions stay live. Boot if needed: list_sessions + ListAgents FIRST; start only missing titles; laptop lines over SSH still refused, so print lines 6-7.)**
- Master 4.128.0; train 161 (4.129.0) running. The storm mill walk build shipped in 4.127.0 (#631: S4 + S6 storm + S8 hero opening + S3 co-op knife kills + K0 + intro pose + intro guards). Michael walks ~09:00: card docs/orchestrator/WALK-4.127-CARD.md (also given in chat ~07:05). Videos: C:/NightShift/scratch/campaign/piano/video5 (4.127.0 opening).
- After the walk: label #317 coop4 (Guard AI, head 7b12a71ea or later) no-affected-e2e + train-ready (held so it can't touch the co-op walk); ask Michael the morning questions (C:/NightShift/scratch/walk-lines-0727.md: S1 car park light, indoor light level, weekly pace, plus Campaign's storm sound real recording or not); fold his walk notes (Campaign holds the S8 polish for them).
- In flight: #375 guard models (guard-carry fixed, CI test running, relabel when green), #671 F58 test fix, #601 / #653 / #656 / #658 co-op kit, #612 Marlow kit stations, #627 Marlow lines + Epic glare, #649 route-runs restart, #655 lamp ids, #665 / #667 / #673 Sector Ops shadow and alloc work, #669 / #670 Guard AI J16, Campaign J22 plan, Sector Ops J11 PR B build.
- FIXES tonight: F52 / F55 / F53 / F54 / F56 / F5 (netmove quarantined to 10-29, #663 shipped) / F57 / F58. Daily fold PR #650 (G408-G434); the 10-25 evening entries are left for the next fold.
- Sessions: Player, Marlow, Sector Ops, Campaign (desktop, bypass), Guard AI and Test Runner (laptop), Cloud Builder 8 (cloud, idle). No orchestrator agents running. Cron: 10-min check (session-only, recreate from STATE).
