# level-validator - brief

Lead: Night Shift | Marlow Build. Branch `feature/level-validator`, worktree `C:/NightShift/Mobile-Coop-level-validator`.
Plan by Opus (2026-10-24 ~20:00). Michael's uploaded skill (reference only): `docs/level-validator/source/` (SKILL.md,
validate_level.py, example_level.json). **Our standard wins wherever the two differ.**

## Ask (Michael, 2026-10-24 ~20:05, native multiple choice "Add 1-4 as extras")
Recorded verbatim in the ROADMAP Decided entry "Level standard extras" (feature/menu 58d61ed9):

> keep docs/level-design.md and ADD (1) a connectivity-graph JSON per map before any geometry plus a Node validator
> (port of its validate_level.py: reachability, solo / co-op completability, 3+ approaches of 2+ kinds, dead ends,
> room-class sizes, opening minimums, 0.5 m grid, ceilings, 2+ independent routes, co-op coverage, split parity, beat
> pacing) with OUR metrics (scale sheet: corridors 3.5-4.0 m, doors 1.2 x 2.1, nav limits); (2) a room-size-by-type
> table in the scale sheet (camera-adjusted); (3) numeric targets: routes cross at least once, vantage sees ~70% of the
> space, 40-60% floor in shadow, line of sight breakable within ~5 s anywhere, guard counts per space early / late and
> per player count; (4) co-op rules for the section 11 rewrite: splits <= 90 s, path parity within 20%, partners act
> for each other, an overwatch spot per split, a downed partner reachable within 15 s, shared routes >= 2.0 m wide.
> Keep the linear spine between sections (CT research), loops inside them. Every map passes the validator before
> greybox; campus S1-S3 is its first run.

## Approval record (CLAUDE.md hard rule)
"The standard and the template change only with Michael's approval." Michael's choice "Add 1-4 as extras" IS that
approval for exactly these additions:
- `docs/level-design.md`: the graph-before-geometry step and the validator gate (14), the numeric targets (3), the
  section 11 two-player rewrite (4; also closes "Open items" 1, which Michael already ruled "Co-op only" on 2026-10-22).
- `docs/templates/map-spec.md`: one line requiring the map's graph JSON and a passing validator run before Phase 3.
- `docs/design/scale-sheet.md`: the room-size-by-type table (2).
Scope is ADD: nothing in the standard is removed or loosened. Any other change to the standard still needs Michael.

## Goal
Every map has a connectivity graph (`<map>.graph.json`) written before geometry; `node scripts/level-validate.mjs
<graph>` checks it against OUR metrics and exits 1 on any ERROR; the standard, scale sheet and template carry the new
numbers; campus S1-S3 gets the first real run with a patch / re-plan verdict per section, replacing the paused
campus-audit (feature/campus-audit 618cdd69).

## Limits
- Docs + one Node script + one Vitest file + graph JSON files. No `src/` change, no map geometry change in this job
  (campus fixes are a follow-up job from V5's verdicts).
- The validator is plain Node (`.mjs`), no Babylon, no dependency, pure functions exported (tested the way
  `tests/heavyLock.test.ts` imports `scripts/heavy-lock.mjs`). Docs tier: CI `npm run check` only, no e2e.
- Not ported: the skill's "deniable ops" arena rules (section 7), solo completability (G2 / G50), its own metric
  defaults (section 2), its room table values (replaced by V2), Python.

## Mapping: the skill's rules to OUR metrics
"ERR" = validator ERROR (exit 1), "WARN" = must be justified in the map's design doc.

| Their rule | Their number | Our number (validator level) | Source |
| --- | --- | --- | --- |
| Snap grid | 0.5 m | 0.5 m on every size, width, height, length (WARN off-grid); door centres on the 0.5 lattice when width < 1.14 | scale-sheet 1, 4; `navBuild.ts` cell 0.5 |
| Player size | 1.8 / 0.6, crouch 1.2 | 1.75 stand, 1.15 crouch, radius 0.30 (info only) | `src/config/movement.ts:75-77` |
| Single door | min 0.9 x 2.0 | ERR < 1.0 wide; WARN 1.0-1.19 (passes nav only on a half-metre centre); target 1.2 x 2.1; ERR height < 2.0 or > 2.2 | scale-sheet 1, 3, 4 (nav band w - 0.64 >= 0.5) |
| Double door | min 1.8 x 2.0 | 1.8 or 2.0 x 2.1; ERR < 1.8 | scale-sheet 3 |
| Wide opening | none | 2.5-3.5 m, lintel 2.1 (WARN outside) | scale-sheet 3 |
| Vehicle door | 3.0-4.5 x 3.5-4.5 | roller door 3.0 x 3.0 (ERR < 3.0 wide) | scale-sheet 3 |
| Corridor | 1.5 min, 2.0 passing, WARN > 3.0 | ERR < 3.0; WARN 3.0-3.49 or > 4.0; target 3.5-4.0 | scale-sheet 2, 3 (camera: 0.78 m shoulder clearance, two players pass) |
| Stairs | 1.2 min, rise 0.18, tread 0.28 | fire stair 1.3 (ERR < 1.3), open feature stair 2.4 (WARN < 2.4), rise 0.165, run 0.28-0.285 | scale-sheet 3 |
| Vent / crawlspace | 0.9 x 0.9 | crouch duct 1.2 wide x 1.5 high (ERR below), player only; walk-in tunnel 2.1 (2.4 preferred) | scale-sheet 3; level-design 16.7.2-3 |
| Ceiling | ERR < 2.4 | ERR < 2.4; WARN < 3.0 in rooms / corridors; halls 4.5-6.0; storey 3.3 (ducts exempt) | scale-sheet 3 |
| Step / curb | none | ERR any level change 0.40-0.45 (player 0.42 vs nav 0.45 disagree) | scale-sheet 1, 3 |
| Above 2.0 m needs help | 2.0 | solo wall-jump reach 3.8; co-op lip band 4.3-4.5 (boost 4.5, human ladder 4.1 until G57) | `movement.ts` `WALL_JUMP.maxUp`, `TEAM.boostMax` / `ladderGrab`; level-design 11.3, 12.2 G57 |
| Split-jump corridor | 1.6-2.2 apart, 3+ tall | split gaps 1.2-1.95 apart, faces >= 3.6 tall | level-design 12.1 |
| Safe drop | 3.5 m | TODO: confirm the fall / landing constant by grep in V1 (none found in this pass; `FALL_GRAB` at `movement.ts:444`) | - |
| Room-class sizes | skill 3.5 table | V2 table in the scale sheet, camera-adjusted; play space >= 6 m short side; the validator reads that table | scale-sheet 3 + V2 |
| Cover spacing | 3-6 m, never > 8 m open | stepping stones every 4-8 m; recess every 8 m; no straight run > 12 m (not in the graph: design doc) | level-design 3.5; scale-sheet 5 |
| Patrol loops | 20-45 s, crossings 3-8 s | 25-45 s, stops 3-6 s, gaps 3-8 s (not in the graph: guard sheets, `tests/campus*.test.ts`) | level-design 4.3 |
| Guards per space | 3-6 early, 6-10 late, ERR > 10 | per encounter space, per player count: early 3-6, late 6-10 (WARN outside), ERR > 10; per section ERR above the map's caps (`SQUAD_CAP` 9 spawn, `MAX_ALIVE` 12, campus screen cap 12); count rises with players | Michael (3); level-design 12.1; `campusSectors.ts` `CAMPUS_SCREEN_CAP` |
| Shadow | 40-60% | 40-60% of an encounter space's floor (WARN outside, ERR missing) | Michael (3) |
| Observation point | 70% | a vantage per encounter space seeing ~70% (WARN < 0.7, ERR missing) + our 3.1 (every guard within one cycle, out of view) | Michael (3); level-design 3.1 |
| LOS break | ~5 s | `los_break_s` <= 5 per encounter space (WARN above, ERR missing) | Michael (3) |
| Rule of three | 3+ approaches, 2+ kinds | 3+ approaches of 2+ kinds (ERR) AND our 3.2: a shadow, a high and a loud route each (ERR), a secret route in half the guarded spaces (WARN) | Michael (1); level-design 3.2 |
| Routes cross | "at least once" (manual) | in each section the route kinds share at least one space between entry and exit (ERR) | Michael (3); level-design 3.3 |
| Dead ends | reward and <= 15 m, or a 2nd exit | ERR any dead end on a stealth route; allowed only off-route, tagged reward / objective, length <= 15 m | level-design 3.4, 16.6.3 (stricter) |
| Topology | prefer hubs and loops | linear spine of sections: every start -> exfil path passes every section in order (ERR on a skip); loops inside a section | Michael; level-design 3, 3.3, 15; CT research |
| 2+ independent routes | start -> objective, edge-disjoint | per section, entry -> exit, edge-disjoint >= 2 (ERR); the spine connector between sections is single on purpose | Michael (1); level-design 3.3, 3.4 |
| Solo completability | ERR if solo cannot finish | dropped: the campaign is two players and cannot be completed solo; instead 2-player completability (ERR) | G2, G50; level-design Open items 1 |
| No softlock | (solo fallback) | every space reached by a co-op link is also reachable by a non-co-op route (ERR), so a downed player can be reached | level-design 11.4 |
| Co-op coverage | half of encounters | co-op route in at least half the encounter spaces (ERR) and in every section (ERR); co-op kinds = our verbs only (boost, human ladder; dual takedown as a space tag) | Michael (1); level-design 11.6; G110 (no rope) |
| Split parity | lengths within 20% | split legs within 20% by path length (ERR) | Michael (4) |
| Split length | none | each leg <= 90 s at 1.3 m/s (crouch gear 3) = 117 m (ERR) | Michael (4); scale-sheet 1 speeds |
| Overwatch | one per split section (WARN) | one per split, seeing that split's legs (ERR) | Michael (4) |
| Partners act for each other | link interaction (manual) | each split has >= 1 `assist` (one leg's action opens / darkens / disables for the other) (ERR) | Michael (4) |
| Reach a downed partner | 15 s | from any space of one leg to any space of the other <= 15 s at 3.0 m/s = 45 m (ERR) | Michael (4); G40 speed 3.0 |
| Space for two | 2.0 m | ERR < 2.0 on any link marked `shared` (both partners move together); corridors are 3.0+ anyway | Michael (4) |
| Beat pacing | ERR on 3 highs (4-5) in a row; WARN open > 2 | same, over the spine order of spaces and connectors; WARN no release (1-2) after a peak | Michael (1); level-design 6.2, 13 beat chart |

## Assumed decisions (logged, job carries on; undo listed)
- A1 Co-op only: the solo checks of the skill are dropped and replaced by 2-player completability and the no-softlock
  check. Undo: re-add a `solo` pass in `scripts/level-validate.mjs` (one filter, as in validate_level.py).
- A2 Player counts: `meta.players` is `[2]` for the campaign; guard counts are keyed by player count
  (`"guards": {"2": n}`), and `"3"` / `"4"` are checked (non-decreasing) only when `meta.players` lists them (Sector Ops
  4-player, ROADMAP line 79). Undo: drop the keys.
- A3 Early / late: a space is "early" in the first half of the spine (by section index) and "late" in the second, unless
  it sets `"phase"`. Undo: require `phase` on every encounter space.
- A4 Route kinds use our names: `shadow`, `high`, `loud`, `secret` (their ground / vertical / aggressive / utility),
  plus `spine` for section connectors. Undo: an alias table in the validator.
- A5 Speeds for time rules: split legs at 1.3 m/s (crouch gear 3, stealth pace), reach-a-partner at 3.0 m/s (G40 run).
  Times come from link `length` + half of each space's long side. Undo: two constants at the top of the module.
- A6 One graph per map, sections inside it (`meta.sections` in spine order). Files live in the map's docs folder
  (campus: `docs/sector-redesign/campusOps.graph.json`). Undo: move files; the CLI takes any path.
- A7 The room table has one source: the validator reads the V2 table from `docs/design/scale-sheet.md` at run time (the
  pure module takes the table as an argument). Undo: inline a constant.
- A8 Vantage %, shadow % and LOS-break seconds are the designer's estimates in the graph (no geometry exists yet); V5
  cross-checks campus estimates against the built map by hand. A measuring tool is a later job, not this one.
- A9 The campus graphs are written by hand from `docs/sector-redesign/SPEC.md` and the element register, sizes cross-read
  from `S1_ROOMS` / `S2_ROOMS` / `S3_*` boxes, `C1_BOX`, `C2_BOX`, `S2_FLOORS`. The map data has no link list (only named
  door centres, co-op lips and flights), so nothing is extracted automatically. Undo: an extractor job later.
- A10 S4 / S5 are out of scope (Michael named S1-S3), as in campus-audit A2.
- A11 The campus-audit's NCC yardstick (its A1) is not carried: the validator's numbers are the yardstick now; V5 still
  lists door-swing-into-corridor findings it sees by hand. Undo: re-open campus-audit.
- A12 The validator gate sits between level-design Phase 2 (gameplay design) and Phase 3 (build), i.e. "before greybox".
  For existing maps it runs as an audit (campus is already greyboxed). Undo: one line in 14.

## Open questions
None: no hard rule blocks the goal (Michael's choice is the approval for the standard / template / scale-sheet edits).
