# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~12:45 SAVE (5-hour 94% at ~12:42; resets 14:10 AEDT (03:10Z), not 13:10; weekly 50%, resets 13:00). Michael: docs first, no new game work until the docs are complete and he signs off the forward plan (G346, G355); this orchestrator session is NOT cleared until the docs are 100% done (Michael ~11:27). New session layout (ROADMAP Decided ~12:50): the orchestrator starts Player, Marlow, Sector Ops, Campaign Build (new) and one Cloud Builder at each swap; Michael pastes only the orchestrator and the two laptop lines (Guard AI, Test Runner).**
- Master 4.101.1 (RULES.md, VISION.md, rewritten bible, DECISIONS to G343, queue fixes #403). Train 87 (#409, 4.101.2 = #384) running.
- Docs left: #407 (feature/doc-final: level standard per mode + validator, archive sweep, re-audit fixes G344-G363; Opus PASS on 4368f322; replaces closed #398 / #402 / #404) and #400 (feature/doc-guard, stacked on #407: doc-lint in CI, owner / status headers, Job-done auto-archive, weekly prune script; re-check running on a27e3330). Train them TOGETHER once each has check + checker + affected-e2e (label both).
- Running orchestrator agents (12:45): #400 round (session layout in RULES + audit B doc items; then re-check); feature/menu round (STATE / BOOT incl. Campaign Build + auto-start / PROMPTS / review briefs incl. campaign.md / archive); tooling-fix builder fix/tooling-audit-b (pacing, autotrain self-update, swap laptop locks, affected GPU / legacy filter, dead scripts); #410 independent re-check (Test Runner conformance PASS by its own checker). Earlier: #400 re-check; final audit A (fresh-session boot + vision) and B (rules vs code, unnecessary files) on C:/NightShift/Mobile-Coop-doc-audit2; ROADMAP / BOOT / PROMPTS / spare-jobs rewrite on feature/menu (review-first start). Relaunch any that did not report.
- Then: apply the final audits' fixes; boot Player / Marlow / Sector Ops / Guard AI for their conformance reviews (plan only; briefs docs/orchestrator/review-briefs/; FORWARD-PLAN.md) once the BOOT rewrite is pushed; fold the five gap lists for Michael's sign-off.
- Test Runner (laptop, new session [9db74b]) is live: root C:/NightShift/CLAUDE.md written on the laptop (Michael approved); its conformance review running; #408 laptop-queue-5: orchestrator re-check FIX (conflicts with #403 resolved by the orchestrator in the train; spare runs must end when a real request opens: Test Runner fixing).
- Desktop: root C:/NightShift/CLAUDE.md written. Watchdog task installed ~12:25 (-Fix labels,prs); the desktop queue service (checkout d4608d3d) predates #403's allowlist and may disable it: re-enable after the service self-updates (when idle). Weekly prune task (scripts/prune-task.ps1) waits for #400.
- Finished game PRs still ship (G346): #389 waits on affected-e2e; #375 needs Michael's look picks + big-pr; #372 no checker yet.
- Michael's decisions today: ROADMAP Decided (all folded as G324-G363 in #407).
