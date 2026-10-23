# section-rating - STATE

## Now
Planned, nothing built (2026-10-23 ~12:15). BRIEF.md and PLAN.md written by a planning subagent on
`feature/section-rating` (cut from master 3c460923). Not committed yet: the lead commits these three files first.
Defaults A1-A8 (BRIEF.md) apply until Michael answers M-a to M-h.

## Next
1. Lead commits the docs, checks master for guard-ai / sector-redesign / CT Core changes to the files in PLAN.md
   (merge master into this branch if any landed).
2. S1 (pure rules, Sonnet).
3. S2, S3, S4, S5 in parallel.
4. S6 and S7 in parallel; batch checkers; one PR to master.

## Open
- M-a to M-h for Michael (BRIEF.md), defaults in use.
- Interfaces waiting on other jobs: guard-ai alarm stage API (`alarmStep`), CT Core suppressor ammo and dual takedown.

## Done
- 2026-10-23: BRIEF, PLAN, STATE written.

## Resume prompt
```
Night Shift | Menu Notes Build: start section-rating. Work only in C:/NightShift/Mobile-Coop-section-rating on branch feature/section-rating (branch guard from CLAUDE.md "A job" before every write). Read CLAUDE.md, then docs/section-rating/STATE.md, BRIEF.md and PLAN.md. Commit the three docs first. Then run PLAN.md slice order (S1, then S2-S5 in parallel, then S6 and S7) with the session-method loop: Opus for src/net, save and mode code, Sonnet for UI, data and tests from strict Opus briefs, one fresh checker per batch, at most 1 fix round. Use assumed decisions A1-A8 until Michael answers M-a to M-h. Update STATE.md after every slice. Finish with one PR to master.
```
