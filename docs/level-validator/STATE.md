# level-validator - state

Job from Michael (2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras"; ROADMAP Decided top entry on
feature/menu 58d61ed9). Lead: Night Shift | Marlow Build. Branch feature/level-validator, worktree
C:/NightShift/Mobile-Coop-level-validator. Michael's uploaded skill (reference, not our rules): docs/level-validator/source/
(SKILL.md, validate_level.py, example_level.json; copied from C:/NightShift/scratch/stealth-level-design/).

## Now (2026-10-24 ~20:00, account cap ~20:10)
Opus PLAN agent started; it pushes BRIEF.md / PLAN.md as WIP. If cut off at the swap: rerun it (prompt below).

## Plan pushed f2df3f5b (20:06), BEFORE Michael's approval changes below: fold M1-M4 into BRIEF / PLAN first
(Opus; the planner was re-sent them at ~20:09 and may have pushed a later commit: check git log). Conflicts to fix:
A7 (validator reads the room table straight from scale-sheet.md) -> replaced by M2's generated metrics JSON;
A8 (shadow / vantage / LOS are designer estimates) -> M4: targets in the JSON check, measured at greybox;
"2+ independent routes inside each section" -> M3 (entry to exit per section, every space has `section`);
V2 room table values -> M1 scaling 1.3-1.5x; split parity -> traversal time on links; A2 guard counts -> compare
with our guard sheets first. Then start V0 / V1 (cloud-queue) / V2 / V4->V3 / DOC in parallel per PLAN.

## Michael's approval changes (~20:08, via the orchestrator; full text ROADMAP Decided top entry, feature/menu)
- M1 (a) Room-size table scaled ~1.3-1.5x real (like corridors / doors), tuned in greybox; no room passes that the camera cannot work in.
- M2 (b) ONE metrics JSON generated from docs/design/scale-sheet.md (generator script + a test that the JSON matches the sheet); nothing hardcoded in the validator.
- M3 (c) Route redundancy per section: every space has a `section`; 2+ independent routes from each section's entry to its exit.
- M4 (d) Declared values (shadow %, 70% vantage, 5 s LOS break, 15 s revive reach) are targets only in the JSON check; a greybox measurement step (light bake sampling, navmesh path distance / time) measures them and the map fails on a mismatch. Split parity = traversal time on links, not room length.
- Guard counts (3-6 early, 6-10 late): compare with our guard sheets before making them rules. Arena mode parked.
- Michael offered his own Node port: reference only if it arrives (we build here: repo tests, CI, our metrics).

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
