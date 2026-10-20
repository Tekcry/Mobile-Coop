# ghost-fix - state

## Now
Diagnosis (an Opus agent; report DIAGNOSIS.md): the temporal path (TAAU / TAA history, motion vectors of skinned
figures and attached weapon meshes, neighbourhood clamp) on a fast draw / holster at Epic.

## Next
Fix, before / after GPU strips, check, PR.

## Done
- 2026-10-20: worktree and branch from master 4.13.0 (51af5ffb); BRIEF, STATE.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for ghost-fix. Folder C:/NightShift/Mobile-Coop-ghost-fix, branch
feature/ghost-fix. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-ghost-fix && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ghost-fix && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-ghost-fix"
Read CLAUDE.md, docs/ROADMAP.md, docs/ghost-fix/BRIEF.md and this STATE.md; carry on from "Now". GPU work on port 4189
under C:/NightShift/heavy.lock. PR to master (patch), message "Night Shift | Orchestrator", STOP.
```
