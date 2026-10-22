# Guard AI - state

## Now
Research: three Opus agents (code audit, CT behaviour, tactics design) writing to `docs/guard-ai/research/`.

## Next
PLAN.md from the research; data shapes to Course Ready (sector-redesign) and Menu Notes (marlow-final); slice 1.

## Open
- Data shapes not yet agreed with Course Ready / Menu Notes.
- Protocol 32 only if guard state must go on the wire (marlow-final 30, sector-redesign 31).

## Done
- 2026-10-23 ~02:00: worktree off master ffade187, g44-above merged (e5e66e5e); BRIEF.md (a9ab3a29).

## Resume prompt
```
Night Shift | Guard AI Build - guard-ai: RESUME. Model Opus, effort high; clear context first.
Folder C:/NightShift/Mobile-Coop-guard-ai, branch feature/guard-ai (git fetch; git status; branch guard before every
write: CLAUDE.md "A job"). Read CLAUDE.md, docs/ROADMAP.md (on origin/feature/menu if newer), docs/guard-ai/BRIEF.md,
PLAN.md and this STATE.md. Continue from "Now": run the loop in docs/systems/session-method.md (implementer, fresh
checker, at most 1 fix round per slice; up to 6 agents; subagents start from docs/systems/agent-preamble.md). Tests by
message to Night Shift | Character Build (branch, commit, suites, E2E_GPU=1). Message Night Shift | Orchestrator at
each slice and the PR. Michael asleep: log assumptions (BRIEF A-numbers), no question dialogs. Save at 97% usage
(WIP pushed, this file current).
```
