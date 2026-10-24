# level-validator - state

Job from Michael (2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras"; ROADMAP Decided top entry on
feature/menu 58d61ed9). Lead: Night Shift | Marlow Build. Branch feature/level-validator, worktree
C:/NightShift/Mobile-Coop-level-validator. Michael's uploaded skill (reference, not our rules): docs/level-validator/source/
(SKILL.md, validate_level.py, example_level.json; copied from C:/NightShift/scratch/stealth-level-design/).

## Now (2026-10-24 ~20:00, account cap ~20:10)
Opus PLAN agent started; it pushes BRIEF.md / PLAN.md as WIP. If cut off at the swap: rerun it (prompt below).

## Next
1. Opus PLAN (BRIEF with Michael's words + A1.., PLAN slices: validator port + tests (cloud-queue), graph JSON schema,
   scale-sheet room table, level-design numeric targets, section 11 co-op rewrite, campus S1-S3 graphs as first run).
2. Sonnet builders per slice (validator code + tests to cloud-queue), one Opus checker, one PR.

## Planner prompt (rerun)
Opus, plan only, docs only on feature/level-validator: read docs/systems/agent-preamble.md, CLAUDE.md "Hard rules",
the ROADMAP Decided entry "Level standard extras" (git show origin/feature/menu:docs/ROADMAP.md), docs/level-validator/source/*,
docs/level-design.md (esp. section 11, 12, 16, the SVG format), docs/design/scale-sheet.md, nav limits (src/ai nav grid
cell / step / climb constants), docs/campus-audit/BRIEF.md (paused audit: its goal is done through the validator's first
run on campus S1-S3). Write BRIEF.md and PLAN.md here; push WIP early.

## Resume prompt
```
Night Shift | Marlow Build: level-validator job (Michael ~20:05). Worktree C:/NightShift/Mobile-Coop-level-validator,
branch feature/level-validator; read docs/level-validator/STATE.md, BRIEF.md, PLAN.md (if the PLAN is missing or WIP,
rerun the planner from STATE "Planner prompt"). Then start the slices: validator port + unit tests to cloud-queue
(briefs/level-validator-*.md), docs slices with Sonnet builders here, one Opus checker, one PR. guard-cap continues in
parallel from docs/guard-cap/STATE.md on origin/feature/guard-cap (laptop M0 / M1 results, M2 on cloud-queue).
```
