# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~00:00 BOOT (new account since ~23:52; 5-hour 3% at 23:58, resets 04:50; weekly 0%). Michael 2026-10-25 ~23:59: "this session will continue overnight on the same account" - no swap tonight; after the 04:50 reset message every live session to resume (RULES "Swaps and context").**
- Boot: 4 desktop leads started by start_session (cwd C:\NightShift, use_worktree false). Cloud start refused again (no cloud environment on this account): Michael started Cloud Builders 1-3 and both laptop sessions from prompts printed in full. All 9 sessions up at 23:59. Next boot: try start_session cloud once, then print 3 cloud prompts + 2 laptop lines in one message.
- Cloud-queue: 5 briefs claimed by the old account's builders reopened at boot (s3-join, s4-fix1, light-realism-L1, player-hygiene-s1, route-runs-r4a).
- Train 108 released 4.105.0 (#452 Anim Studio Mixamo, an earlier #472 head) and deployed: Anim Studio walk card given to Michael at 00:00. #472 still open at 241c8b23, CONFLICTING (Marlow told). Train 109 (4.105.1: #475 laptop-queue-6 + feature/menu docs) built 23:57, CI + laptop running.
- Open PRs all wait on affected-e2e (laptop queue 25 requests / 161 suites at 23:57, the biggest wait). CI red: #477 Mixamo I2 (Player told, plus 3 stale / old-head requests to withdraw), #468 validator B2 (Marlow told). #450 docs-only conflicts: hand-merge in the train. #317 coop4 conflicts as before.
- Running orchestrator agents: one Opus waste audit (started 23:59). Cron: 10-min check (dies with this session).
