# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~18:20 SAVE (5-hour 85% at 18:17, rising ~3.5%/min with six leads plus planners: 100% ~18:22; resets 21:30. Weekly 15%). Michael signed off the folded plan at ~17:53 (39 answers), all 6 #372 mission pages (~18:05) and the 12 G157 level-rule changes (~18:20): ROADMAP "Decided". Plain English, brief dot points.**
- Master 4.103.0 (train 95: anim tuner clarity; Michael told: Main menu or Pause > Anim Studio (dev)). Train 96 (4.103.1, PR #439: first J1 docs PRs) on the laptop at 18:17; release it if green.
- CPU HOLD: desktop CPU at 97-100% since ~18:05 (Defender MsMpEng ~1.3-2.2 cores scanning agent file churn; node tsc / build). Leads told: no NEW agents until the orchestrator says CPU < 80%. Lift it first thing after the swap if CPU allows. Michael told a Defender exclusion for C:/NightShift would fix it (his call, a security setting).
- Phase B starts at J1 PR open (FOLDED-PLAN, 18:10 audit). J1 PRs: #432 Test Runner, #433 Sector Ops (checker posted by me), #434 Campaign, #435 Guard AI, #436 Marlow, #437 Player. Phase B open: #438 G327 (Guard AI), #317 coop4 READY and ships LIVE (Q16; conflicts with master in protocol.ts / coopHost.ts / coop.md / testing-tools.md: hand-merge in the train per docs/guard-ai/checks/coop4-release-check-A.md "Train merge notes" on feature/guard-ai: the coopHost snapshot hunk is a real clash and master's "in":1 pushes the 4x32 steady snapshot ~6177 B over STEADY_MAX 6144; Guard AI saved 18:22, its laptop runs queued), #440 Player tool tidy-up, #441 Marlow J5 lines. #372 mission pages: fill picks, then checker + big-pr from me.
- Owed to Michael next: Marlow route-runs Q1 (co-op moves in robot runs: stub (recommended, assumed A1) / script / skip); Marlow Yard re-plan page (J14) for one click; Tallow walk card when built.
- Running orchestrator agents: J2 fold agent (feature/fold-j2, worktree C:/NightShift/Mobile-Coop-fold-j2): DECISIONS + bible + VISION fold of every Decided entry today (incl. mission pages, the 12 changes: DECISIONS / bible only) + 4 RULES lines from Test Runner J1; with its own fresh Opus checker. Relaunch from its branch head if it did not finish (check for its PR first).
- Standing OKs: post `checker` for any lead blocked by auto mode when an independent checker's report says PASS on that head (Michael ~18:15, STATE "How Michael works"); big-pr is the orchestrator's call.
- Auto-train pacing still OFF (`--min-interval 0`; STATE "Known").
