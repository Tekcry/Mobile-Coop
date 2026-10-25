# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~14:02 SAVE (5-hour 73% at 14:01, ~1.5%/min: cap ~14:18; resets 18:10. Weekly 63%, resets 27th). Same-account 5-hour reset at 13:10 kept the sessions; this orchestrator booted fresh at 13:14. Michael today: plain English, brief dot points (STATE "How Michael works"); "ignore usage limits" (saves still run); ORDER confirmed 13:56: 1 finish the six reviews + land #400 / #412, 2 the folded plan and his sign-off, 3 then the doc fixes the reviews found. Leads finished their reviews and HOLD (ROADMAP row 6) until I message them at sign-off.**
- Master 4.102.2 (trains 88-90: #407, #389, #410, #408). Train 91 (#424 = #412 tooling audit B) running.
- Reviews (docs PRs, plan only): Test Runner #410 merged; Player #416 (checker PASS on fix head 4a819e6a pending CI); Marlow #417; Campaign #419 (PASS, re-check of polish head 6b2b8635); Sector Ops #420; Guard AI #423. Each lead posts its own `checker`; label by rule.
- Docs left: #400 doc-guard (big-pr approved by Michael 13:40; CONFLICTING: resolve in its train; affected-e2e queued on c85f1e5e) + #425 doc hygiene stacked on #400 (Next: line, one plan, daily tidy-up, plain English; Opus PASS on c821bd5a, polish 1-3 pending: train with #400).
- Fold (row 6): docs/orchestrator/FOLDED-PLAN.md on feature/fold-plan 2342bc9e6, Opus plan checker PASS (27 breaks, ~130 gaps, 39 questions: 9 answer-first, 30 accept-all). Gate: the five review PRs land first (#416 #417 #419 labelled 14:15; #420 waits CI; #423 waits its checker), then merge FOLDED-PLAN onto feature/menu and give Michael the summary + the 9 questions (native multiple choice, plain English).
- Finished PRs Michael approved to ship: #418 player-batch-25 (CONFLICTING on GitHub from old merge bases: resolve in its train), #421 Sector Ops bake5 (checker posted 13:55 with Michael's OK).
- Paused by Michael until row 6: #360 + #414 guard-ai T1 (drafts), #317 coop4 (draft; Guard AI says not ready: D3 dark flag + D4 room cap first). #375 waits on Michael's look picks.
- Running orchestrator agents (14:20): none. Train 91 (#424 = #412, hand-merged b01d15b2) on the laptop. #400: label when affected-e2e (desktop run, heavy.lock) is green; its train conflicts only on docs/ROADMAP.md: hand-merge keeping both sides (train with #425). Watchdog task re-enabled 15:12 (old service pid 14572 gone, svc checkout on master f24ebbf6). #375 drafted (auto re-request withdrawn, Michael 13:40).
- Permissions: user settings allow `gh api repos/Tekcry/Mobile-Coop/statuses/*` (Michael 13:28). Withdrawing other sessions' queue requests and recording passes for blocked leads need Michael's OK each time.
- Follow-ups: tooling PR after #412 (STATE "Known": deploy watch out of the release tick, gh retry, alone requests not counted as busy); Cloud Builder 1 told to stop the withdrawn brief campaign-tallow-design (WIP to feature/tallow-design-docs).
