# coop-real - STATE

## Now
Planned (2026-10-24 ~22:00, Opus planner). Next: group 1, H1 (Opus, starts with the lifecycle probe) and H2 (Sonnet)
in parallel. Open: none for Michael (A1-A9 assumed, BRIEF.md).

## Known before the run
- S2 is a sure KNOWN BUG on master: Course mode never sends a client lamp round (coopClient.ts:188-197, coopHost.ts:202).
- P6, P7 have fixes on master (coop-walk-fixes, train 30) never proven by input; R7 placement fixed (4.85.0), the drop
  itself not. The suite decides which marks they get.
- Open PR #317 coop4 (Guard AI, draft) edits src/net widely: F slices rebase in the train, never merge master in.

## Done
- 2026-10-24: BRIEF, PLAN, STATE.

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
