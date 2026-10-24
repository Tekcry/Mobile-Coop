# Campus layout audit (campusOps S1-S3) - brief

Lead: Night Shift | Marlow Build. Ordered by the orchestrator 2026-10-24 ~19:42 for Michael (~19:50: "Yes proceed with an
audit of campus and report back"). READ-ONLY: report only, no map or src change.

## Michael's words (~19:35, via the orchestrator)
Rooms randomly placed, hallways too small, not enough space when doors open, out-of-bounds areas reachable, "don't feel
like proper levels... don't flow well"; he asked whether NCC (Australian National Construction Code) rules would help.

## Rules to check
- `docs/level-design.md` Section 16 (16.1.2 sizes, 16.3.x openings / gates / no invisible walls, 16.4.2 clearances,
  16.6.1 rooms follow function, corridors straight between cores), the "Floor plans (SVG)" format (~line 207).
- `docs/design/scale-sheet.md`: corridor 3.5-4.0 m, never < 3.0 m; doors 1.2 x 2.1 m.
- NCC-style checks (assumed decision A1: NCC is used as a reasonableness yardstick for real-building layout, not as a
  hard rule; the game rules above win where they differ):
  - a door swing must not block a corridor or another door (recess it, or swing it into the room);
  - a circulation spine, rooms grouped by function off it;
  - sensible egress and travel distances (no dead-end maze, no backtracking through unrelated rooms);
  - ceiling heights sensible for the room use.
- Out-of-bounds: a spot counts as reachable only when proven from collision / nav data (nav grid walkable cells,
  collision boxes, gaps between walls, climbable / mantle heights, ledges), never a guess. Give coords and the route.
- Spec: `docs/sector-redesign/SPEC.md` (what each section was meant to be).

## Output (branch feature/campus-audit, folder docs/campus-audit/)
1. `S1.svg`, `S2-<storey>.svg` (each storey), `S3.svg`: to scale per level-design's floor-plan format, failures marked
   (red outline + a number keyed to the table).
2. `S<n>.md` per section: a table of every failing room / door / corridor / out-of-bounds spot (id, what, x / z coords,
   measured size, the rule broken with its source line, severity: blocker / major / minor).
3. Counts per section and a verdict per section (patch vs re-plan) with a rough effort.
4. `REPORT.md` (lead): the three sections merged, the verdicts, and 5-10 lines for Michael.

## Assumed decisions
- A1 NCC as a yardstick, not a rule (above). Undo: if Michael wants NCC adopted, a level-design.md change (his approval).
- A2 S4 / S5 are out of scope (Michael named S1-S3).
