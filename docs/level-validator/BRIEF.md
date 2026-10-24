# level-validator - brief (WIP)

## Ask (Michael, 2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras"; ROADMAP Decided "Level standard extras")
Verbatim from the ROADMAP Decided entry (feature/menu 58d61ed9):
"keep docs/level-design.md and ADD (1) a connectivity-graph JSON per map before any geometry plus a Node validator (port of its validate_level.py: reachability, solo / co-op completability, 3+ approaches of 2+ kinds, dead ends, room-class sizes, opening minimums, 0.5 m grid, ceilings, 2+ independent routes, co-op coverage, split parity, beat pacing) with OUR metrics (scale sheet: corridors 3.5-4.0 m, doors 1.2 x 2.1, nav limits); (2) a room-size-by-type table in the scale sheet (camera-adjusted); (3) numeric targets: routes cross at least once, vantage sees ~70% of the space, 40-60% floor in shadow, line of sight breakable within ~5 s anywhere, guard counts per space early / late and per player count; (4) co-op rules for the section 11 rewrite: splits <= 90 s, path parity within 20%, partners act for each other, an overwatch spot per split, a downed partner reachable within 15 s, shared routes >= 2.0 m wide. Keep the linear spine between sections (CT research), loops inside them. Every map passes the validator before greybox; campus S1-S3 is its first run."

## Approval record
CLAUDE.md hard rule: "The standard and the template change only with Michael's approval." Michael's choice above
("Add 1-4 as extras") IS that approval, for these four additions only: docs/level-design.md (numeric targets, section 11
rewrite, the graph-before-geometry step), docs/templates/map-spec.md (a graph JSON line), docs/design/scale-sheet.md
(room table). Scope: ADD, never replace or loosen. Anything else in the standard still needs him.

TODO: goal, limits, mapping table, A1.., open questions (in progress).
