# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~08:55 SAVE (Michael swaps account at 100%: 57% at 08:50, ~1.75%/min, 100% ~09:15; weekly 26%. Boot: list_sessions + ListAgents FIRST and start only titles not already live (Michael 08:50).)**
- Train 112 (#491, 4.106.0): CI lint failed (testing-tools.md 721 > 720); fixed on train/112 546a2286; full laptop rerun 20261025T212720-auto-train-546a2286 (set train112-rerun, Test Runner says ~40 min from 08:28). auto-train shows "no version commit: rebuild" (gh 100-commit cap hides the version commit under the fix; fixed in #495, which cannot ship first). So when laptop-e2e / laptop-e2e/train112-rerun is green on 546a2286: `node scripts/merge-train.mjs release 112 4.106.0 "<#491 title after the version>" --resume --head 546a22864a8bdc199a52d3d008eab877037e6f94` from C:/NightShift/Mobile-Coop-train (auto mode may block it as a production deploy: ask Michael). Then: retarget #485 to master (`gh pr edit 485 --base master`, Player owed); Guard AI merges master into feature/coop4 and fixes #317 (5 files).
- #495 feature/train-doclint (orchestrator tooling): merge-train build leaves out a member that adds a doc-lint error; auto-train finds a version commit past the 100-commit cap. First checker VERDICT FIX d7f6cd40 (lint used runner rules); fix round 17de9332 (sameLintRules) has a fresh Opus checker running. On PASS post `checker` on the head; affected-e2e passes at once (scripts only), then train-ready.
- Posted `checker` for leads (auto mode blocks them): #473, #487 (Marlow re-plan), #493 (Mixamo I5), #494 (animation source toggle).
- Cloud: 4 builders (Cloud Builder 1 twice, 2, 3); reopened j14-g-a2..a5 from the old account; ~10 briefs open.
- Leads at the save: Player (wire, I2b, I9, I6 agents), Marlow (R4a fix round, Mixamo kit checker, A1/A7 checker), Sector Ops (A28 fix, S2, S10; BIG queue requests trimmed), Campaign (Wharf test fix, shutter wiring, D0). Guard AI: #317 after 112. Test Runner: #492 J20 PR-A docs checker.
- Connectors: Claude Docs and visualize are off by default for new sessions (Michael approved 08:48); Marlow could not turn visualize off (auto mode).
- Not done: stopping old tail / grep watchers (auto mode blocked Stop-Process).
- Running orchestrator agents: the #495 fix-round checker (relaunch on 17de9332 if lost). Cron: 10-min check (session-only).
