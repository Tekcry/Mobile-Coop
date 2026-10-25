# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~15:40 SAVE (5-hour 91% at 15:40, ~0.3%/min now that leads hold: cap ~16:10; resets 18:10. Weekly 66%). Michael today: plain English, brief dot points; "ignore usage limits" (saves still run); ORDER 13:56: 1 reviews + doc PRs land, 2 the folded plan and his sign-off, 3 then the doc fixes. Leads HOLD (ROADMAP row 6) until I message them at sign-off, EXCEPT Player Build on row 0c (anim tuner clarity, Michael 15:30, ahead of row 6).**
- Master 4.102.4 (trains 88-92: #407 #389 #410 #408 #412 and all six reviews #416 #417 #419 #420 #423 + #421 bake5). Train 93 (#428 = #427 player-batch-25 re-cut) on the laptop.
- Docs left for step 1: #400 doc-guard + #425 doc hygiene (all checks green on c85f1e5e / c821bd5a; both conflict with master only in docs/ROADMAP.md). An orchestrator helper builds the next train with both by hand after train 93 (ROADMAP: take feature/menu's; other docs keep both sides). Labels removed so auto-train stops dropping them.
- Step 2 ready: docs/orchestrator/FOLDED-PLAN.md on feature/menu (Opus plan checker PASS at 2342bc9e6, Guard AI B16 folded). As soon as #400 + #425 release: give Michael the plain summary and the 9 answer-first questions (he has read them; native multiple choice), plus one "accept all 30 recommended" question; then fold answers (J2), message every lead to resume (row 6), start J1 doc fixes.
- Row 0c: Player Build builds anim tuner clarity on feature/tuner-clarity (labels motion capture / hand-made / both per tab and slider, "Now playing" line, warning when an edit does not touch what plays, Keys tab Legs part with foot / ankle and shin twist). Michael wants a version to try: tell him the menu path and version when it ships.
- Auto-train pacing OFF since 15:35 (`--min-interval 0`; STATE "Known"). Watchdog task re-enabled 15:12.
- Paused by Michael until row 6: #360 + #414 (drafts), #317 coop4 (draft), #375 (draft; waits on his look picks).
- Standing OKs: post checker statuses (allow rule); record passes on docs-only reviews an independent checker passed (14:10). Withdrawing other sessions' queue runs and opening PRs for blocked leads need his OK each time.
- Running orchestrator agents (15:40): train helper for #400 + #425. Relaunch if it did not report.
- Inbox: Michael's tuner notes (Keys tab, mocap vs keyed) triaged to row 0c.
