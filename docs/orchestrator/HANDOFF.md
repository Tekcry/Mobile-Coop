# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~05:28 SAVE (same account; reset 04:50 used: 82% at 05:27, ~2%/min with 9 sessions: 100% ~05:35; next reset ~09:50. Weekly 31%: at ~10% per window it caps around Tue 27 Oct - plan a swap before then. Orchestrator context 51%: a clear or fresh boot is fine.) Resume after 09:50: message every live session to resume (the titles ListAgents shows); the 04:53-style one-shot cron is NOT set for 09:53 unless recreated.**
- Train 111 (4.105.3, #445 J20 PR-C): CI failed overnight on a doc budget (testing-tools.md 726 > 720); orchestrator trimmed it on train/111 (ec890005, CI green). The laptop service skips train heads that are not the version commit and had logged "done train 111", and `merge-train release --resume` was blocked by auto mode (production deploy). So a full 43-suite rerun was filed (20261025T180919-auto-train-ec890005-f381, set train111-rerun): running at 05:27; its success lets auto-train release by itself. If it fails, read the failing suite, do not retry blind. Michael may add a permission rule for merge-train release (told 05:10).
- Train-ready, waiting for train 111 to clear: #477 Mixamo I2 (9be7701f), #317 coop4 (603f23a43, big-pr), #450 guard rules PR1 (b718293d). After #477 merges: retarget #485 (Mixamo I1+I3+I4, cc52565b, checker carried, affected re-running) to master: `gh pr edit 485 --base master` (Player's auto mode blocks it).
- Mixamo: Player Build has the toggle (Settings > Gameplay > Animation source, default CMU = today; Studio switch + set filter) checker PASS on a9b96fe1, the G400 per-player source wire next; I5 carry on, strikes off (arm whips, no kill tag); I6 17 batch-2A clips converted; batch-2 plan checked (123 clips: 34 in game, 77 Studio only, 8 slices, I7 pack driver building). Downloads all done incl. 7 gap clips (cover idles, corner peek, soft landing, rifle draw / put-away, pistol draw). Marlow builds the kit-move Mixamo slice (feature/mixamo-kit, step 5+).
- Other PRs: #487 Marlow J14 PR 2 (big-pr added), #488 Sector Ops A28 (fix round on cloud), #481 / #489 stacked on #459 (waits affected-e2e), #483 S4 prebake, #482 Campaign objective pop-up. #468 and #472 closed (content on master). Cloud-queue: Marlow posted 11 briefs (validator S9 / S10 / D-C / D-D, J14 sets).
- Running orchestrator agents: none. Cron: 10-min check only (session-only).
