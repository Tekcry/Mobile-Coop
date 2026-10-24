# Campus layout audit - state

## Now (2026-10-24 ~19:45)
Three Opus section agents running, one per section, each in its own worktree and branch, writing only its own files in
docs/campus-audit/:
- S1: C:/NightShift/Mobile-Coop-campus-audit-s1, feature/campus-audit-s1 (S1.md, S1.svg)
- S2: C:/NightShift/Mobile-Coop-campus-audit-s2, feature/campus-audit-s2 (S2.md, S2-<storey>.svg)
- S3: C:/NightShift/Mobile-Coop-campus-audit-s3, feature/campus-audit-s3 (S3.md, S3.svg)
Each commits WIP by 20:05 (account cap ~20:13).

## Next
1. When the section branches are done: merge them into feature/campus-audit, write REPORT.md (counts, verdict per
   section, effort, 5-10 lines for Michael), push, message the orchestrator the summary.
2. If an agent was cut off at the swap: rerun it from the section prompt in "Agent prompt" below, starting from its WIP.

## Agent prompt (rerun per section, replace <N>)
Read docs/systems/agent-preamble.md and docs/campus-audit/BRIEF.md on origin/feature/campus-audit. Audit campusOps
section S<N> only, read-only on src. Worktree C:/NightShift/Mobile-Coop-campus-audit-s<N>, branch
feature/campus-audit-s<N>; write only docs/campus-audit/S<N>.md and S<N>*.svg; commit and push often (WIP by 20:05).

## Resume prompt
```
Night Shift | Marlow Build: TOP PRIORITY = campus-audit (Michael ~19:50, read-only layout audit of campusOps S1-S3).
Worktree C:/NightShift/Mobile-Coop-campus-audit, branch feature/campus-audit; brief docs/campus-audit/BRIEF.md, state
docs/campus-audit/STATE.md. git fetch; check origin/feature/campus-audit-s1 / -s2 / -s3 for each section's S<N>.md
and SVGs (WIP or done). Finish any section left incomplete with an Opus agent (STATE "Agent prompt"), then merge the three
into feature/campus-audit, write REPORT.md (table counts, verdict patch vs re-plan per section with effort, 5-10 lines for
Michael), push, and message "Night Shift | Orchestrator" the summary. Then guard-cap: docs/guard-cap/STATE.md resume block
on origin/feature/guard-cap (M0 / M1 laptop results, M2 on cloud-queue, desktop M1 smoke log
C:/NightShift/scratch/guard-cap/m1-desk-smoke.log).
```
