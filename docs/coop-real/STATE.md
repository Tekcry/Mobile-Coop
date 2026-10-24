# coop-real - STATE

## Now
Plan check applied (2026-10-24, PLAN-CHECK 1-18). Group 1: H2 done (e735dc8a); H1a then H1b running on feature/cr-h1
(Opus, starts with the lifecycle probe); H2b part-3 registration is a lead edit. Then group 2: C1 (Sonnet, Opus brief)
∥ C2 (Opus). Open: desktop dev lane, pending orchestrator answer (heavy2.lock lane for H1 / C1 / C2 smoke, else laptop
alone requests). None for Michael (A1-A9 assumed, BRIEF.md).

## Known before the run
- S2 is a sure KNOWN BUG on master: Course mode never sends a client lamp round (coopClient.ts:188-197, coopHost.ts:202).
- P6, P7 have fixes on master (coop-walk-fixes, train 30) never proven by input; R7 placement fixed (4.85.0), the drop
  itself not. The suite decides which marks they get.
- Open PR #317 coop4 (Guard AI, draft) edits src/net widely: PR B goes first (never the same train); if #317 is
  train-ready first, F1b / F2b / F3 rebase onto feature/coop4. Never merge master in.

## Done
- 2026-10-24: BRIEF, PLAN, STATE.
- 2026-10-24: H2 runner wiring (e735dc8a). Plan check PASS WITH FIXES (d626f05c).
- 2026-10-24: Plan check applied: H1 -> H1a / H1b, three parts, C1 scripted cases, KNOWN BUG with `expect`, F1 / F2 split
  into a / b halves, run 1 doubled (seeded) + e2e-netmove, gates from finding 13.

## Resume prompt
```
Night Shift | Player Build - coop-real: RESUME (Opus, medium effort; clear only past ~50% context).
Folder C:/NightShift/Mobile-Coop-coop-real, branch feature/coop-real. Guard before every write:
cd /c/NightShift/Mobile-Coop-coop-real && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-real && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-real"
Read CLAUDE.md "Sessions" / "Hard rules", then docs/coop-real/STATE.md, BRIEF.md, PLAN.md (only these).
Do the "Now" line: run PLAN's parallel group next in order, each agent from docs/systems/agent-preamble.md with its
slice row, the "Code this builds on" pointers and BRIEF "The input line". One fresh Opus checker per batch (K1, K2) in
parallel with the laptop request on the same commit (PLAN "Laptop queue requests"). Failures become KNOWN BUG marks
(M1) pointing at F1-F4; dead prompts outside the five go to TRIAGE.md and their owners. Update STATE after each group;
PR A after K1 + run 1, PR B (fixes) stacked; message the orchestrator only when a PR opens / is train-ready or blocked.
```
