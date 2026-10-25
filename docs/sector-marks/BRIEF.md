# sector-marks - brief

Owner: Night Shift | Sector Ops Build. Status: current.

Job lead: Night Shift | Sector Ops Build. Branch `feature/sector-marks` in `C:/NightShift/Mobile-Coop-sector-marks`,
from origin/master 2148ec96 (train 95). FOLDED-PLAN (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md`) job J5,
Sector Ops half: hard-rule breaks 2 and 3 (campus lines), plus J6's one Sector Ops line (break 7, `Math.hypot` in the
campus S4 dressing). A hard-rule fix to a shipped feature: allowed at the walk cap and ships as a fix, not behind a
flag (G355; RULES "Walk pacing").

## The ask
1. No exit beacon in Sector Ops. Every connector and the extraction put down an `extract` item whose default look is a
   2.6 m green disc and a 3.2 m lit green pole (`src/game/interactables.ts:134-136`, put down at
   `src/game/modes/sectorMode.ts:771`). It goes; the zone stays. The connector door, signs and light guide (CONFORMANCE
   Sector Ops M3).
2. Every campusOps objective line names what and where, short and plain (CONFORMANCE M4): S1
   (`src/world/maps/campusSectors.ts:315`), S3 (`:406`), S4 (`src/world/maps/campusS4Data.ts:180`), S5
   (`src/world/maps/campusS5Data.ts:169`). S2 (`campusSectors.ts:361`) already passes.
3. A place-word data test over every Sector Ops objective line, campusOps only.
4. (Added by the lead, from FOLDED-PLAN J6) `Math.hypot` in `src/world/maps/campusS4Dress.ts:176` becomes `hyp2`
   (CLAUDE.md hot-path rule; `docs/systems/conventions.md`).

Not in this job: Marlow Yard's lines and test (Marlow Build's own branch: `src/world/maps/ctcourseSets/*.ts`,
`src/ui/hud/courseHud.ts`, `tests/ctcourse/objectivePlace.test.ts`; this job touches none of them and shares no helper
with them); warehouseOps (frozen, Q26); the objective popup and field-menu list (CONFORMANCE M5 / M6: FOLDED-PLAN J3b,
Campaign); the compass / objective blip (M1: J3, Campaign).

## Michael said (verbatim)
- Q26, old warehouse map (ROADMAP "Decided", origin/feature/menu, 2026-10-25 ~16:50): "Freeze it" (no more work on
  warehouseOps).
- G290 (docs/DECISIONS.md:1567): "no markers plus an optional hint layer (off by default); guidance is in-world only
  (objective text names places, leads, light language, landmarks)" (the orchestrator's record of Michael's pick).
- G336 (2026-10-25 ~09:45): "Objectives must name what and where, but no map, level design must flow naturally towards
  each objective."
- G343 (2026-10-25 ~10:45): "Objectives can fade in/out in game, must be a short, plain English objective."
- G351: "What and where".

## Michael picked
- G336 (7b): "No maps at all".
- G351 (5): "What and where".

## Rules this job answers to
VISION 4 rule 5 (no maps, minimap, compass or objective blip; no markers in the campaign and Sector Ops); bible 5.10
"no world waypoints"; level-design 6.4 (G290); CLAUDE.md hot paths (`hyp2` / `hyp3`, never `Math.hypot`).

## Assumed decisions (G358 "Assume and log")
- A1 The beacon goes by mode, not per map: `drawsExitBeacon(mode)` is false for `sector` only. Infiltration and the old
  Mission mode (parked behind `?legacy=1`, bible 6) keep theirs. A campaign mission run in `sector` mode loses it too,
  which is what VISION 4 rule 5 asks. Undo: return true for `sector` in `drawsExitBeacon`.
- A2 warehouseOps loses its beacon too (the mode code is shared; no warehouseOps file is touched, so the freeze holds).
  Undo: a per-map opt-out in `drawsExitBeacon`.
- A3 The co-op client's own `Interactables` (`src/net/coopClient.ts:247`) gets the same switch through one constructor
  argument (no wire change: the item kind on the wire is unchanged). This makes the PR an `src/net` PR: two Opus
  checkers and the co-op suites. Undo: drop the argument (the client would draw the beacon again).
- A4 New lines (each names the room the objective stands in, from the map's own room tags):
  S1 "Download tonight's visitor list in the gatehouse" (was "Download tonight's visitor list and the courier badge
  template": the badge template stays in SPEC and the story, not the HUD line); S3 "Take the Tidewater board from the
  prototype store"; S4 "Download the signing logs in the server cage"; S5 "Take the signing key token from the
  strongroom". Undo: the old strings at the cited lines.
- A5 The test's rules: an objective line contains, lower-cased, the full name of a room (`S1_ROOMS`..`S5_ROOMS`) that
  holds the objective point (`inRoom` with its height); a connector or extraction label contains a place word from the
  map's room and section names; every line is at most `OBJECTIVE_LINE_MAX` 50 characters (G343 "short"; the co-op feed
  cap `INTEL_LINE_MAX` is 60). Undo: loosen the cap or the match in the test file only.
- A6 warehouseOps is skipped by the test (campusOps only), not fixed. It would fail today on 2 of its 3 lines (S1
  "Download the security DVR", S3 "Hack the production terminal": no place). Logged for Michael: the frozen map keeps
  two rule-5 lines. Undo: if Michael unfreezes it, add `WAREHOUSE_OPS_SECTORS` to the test and fix the two lines.
- A7 The test never loads Marlow Yard (it imports campus modules only), so Marlow's lines cannot fail it.
- A8 `hyp2` changes no placement: the S4 hero log is compared before and after (brief B1 step 5). If any hero moves the
  builder stops (a tie broken differently) and the lead decides.
</content>
</invoke>
<invoke name="Bash">
<parameter name="command">cd /c/NightShift/Mobile-Coop-sector-marks && test "$(git rev-parse --abbrev-ref HEAD)" = feature/sector-marks && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-sector-marks" && git add docs/sector-marks/BRIEF.md && git commit -q -m "sector-marks: BRIEF

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q -u origin feature/sector-marks 2>&1 | tail -2; git log --oneline -1