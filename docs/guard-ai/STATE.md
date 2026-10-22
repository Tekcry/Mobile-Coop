# Guard AI - state

## Now
S1 Hearing (PLAN.md): Opus implementer, then a fresh checker.

## Next
S2 incident board, S3 radio net, then S4-S10 in PLAN order.

## Open
- Data shapes: proposed to Course Ready (sector-redesign, ENGINE.md section 7 read) and Menu Notes (marlow-final) by
  message 2026-10-23 ~02:10; waiting on their replies (PLAN.md "Data shapes").
- Protocol 32 only if S9 is needed (marlow-final 30, sector-redesign 31).
- A11: Sector Ops melee tour guards vs "every guard armed" (Course Ready's data).

## Pacing (lean windows, ROADMAP Decided ~01:45)
Each 5-hour window to 99%: no new agent at 97%, save at 98% (WIP pushed, this file current). At most 3 agents. AI
behaviour code Opus; Sonnet only for tests / e2e scenarios / data from a strict brief; checkers Opus.

## Done
- 2026-10-23 ~02:00: worktree off master ffade187, g44-above merged (e5e66e5e); BRIEF.md (a9ab3a29).
- 2026-10-23 ~02:10: research (research/audit.md, ct-behaviour.md, tactics-design.md); PLAN.md; BRIEF A2-A11.

## Resume prompt
```
Night Shift | Guard AI Build - guard-ai: RESUME. Model Opus, effort high; clear context first.
Folder C:/NightShift/Mobile-Coop-guard-ai, branch feature/guard-ai (git fetch; git status; branch guard before every
write: CLAUDE.md "A job"). Read CLAUDE.md, docs/ROADMAP.md (origin/feature/menu if newer), docs/guard-ai/BRIEF.md,
PLAN.md and this STATE.md. Continue from "Now": the loop in docs/systems/session-method.md (implementer, fresh checker,
at most 1 fix round per slice; at most 3 agents; subagents start from docs/systems/agent-preamble.md; slice detail in
research/tactics-design.md). e2e by message to Night Shift | Character Build (branch, commit, suites, E2E_GPU=1).
Message Night Shift | Orchestrator at each slice and the PR. Michael asleep: log assumptions (BRIEF A-numbers), no
question dialogs. Lean windows: no new agent at 97%, save at 98% (WIP pushed, STATE current).
```
