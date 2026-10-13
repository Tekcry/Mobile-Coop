# Step T1c - tutorial HUD, drill detection, results, bay select (Block A end step)

Model: implementer opus, checker opus (touches src/net through T1b's messages). Deps: T1b. Runs e2e-coop, e2e-netmove.

## Read
- DECISIONS.md D18-D21, D26, D30, C9, C10; BAYS.md section 0 "Drills" paragraph
- src/game/course/* and src/game/modes/courseMode.ts (T1a, T1b); src/config/course.ts
- src/ui/hud/hud.ts (grep `setObjective`, `setInteract`), src/ui/hud/pings.ts (marker drawing, edge arrows),
  src/ui/hud/worldPrompts.ts (placement); src/ui/screens/resultsScreen.ts; src/game/gameState.ts 729-760 (endSession)
- src/core/settings.ts 140-160 (gameplay settings and defaults), grep `sanitize` for the settings sanitiser
- src/save/db.ts 1-40 (STORES, dbGet / dbPut), src/feedback/feedbackStore.ts 1-40 (a kv record pattern)
- src/net/coopUi.ts 245-420 (lobby: mode options, start); src/game/training.ts (how Training detects verbs today)

## Task (decisions)
1. `src/game/course/drillDetect.ts` (pure): maps one step's local snapshot (gear, stance, sprint, vision mode, ping
   sent, aim / fire / reload / swap, attach kind and sub-state, traversal kind, landing band, door action, gadget used,
   takedown kind, team move, light meter band, throw) to verb ids; edge-triggered (a verb ticks once per occurrence).
   GameState feeds it each fixed step for the local player; the host ticks host-visible verbs for the remote (C10);
   the client sends `ctick` for its local-only verbs. Unit tests per verb family.
2. Tutorial HUD (step texts in LANTERN's voice, D37) (`src/ui/hud/courseHud.ts`, DOM, writes only on change): a panel listing the current bay's drills in
   order with two tick columns (P1, P2; a dash where the drill is not that player's), the current step's text for this
   player in large type, a toast and a short radio line on every `drillDone` ("Moth: ledge shimmy - done"), and the
   airlock refusal naming the open drills. Pad / keyboard glyphs in step texts follow the input mode (existing prompt
   glyph system).
3. Markers (D19): the next drill's marker (a device or a point) drawn with the pings renderer (on screen and edge arrows);
   setting `gameplay.courseMarkers` (default on; Settings > Gameplay "Course markers"; sanitiser default) hides them.
4. Results (D31, D32, D23): at `courseDone` the results screen gets a course panel: total and per-bay time, detections,
   alarms, knock-outs, kills, revives, team moves, per player and team, with no penalty for anything in the drill bays;
   B9's ghost tier: Ghost (never seen, nobody touched), Silent (no alarm, knock-outs only), Loud, lowered by detections,
   alarms and bodies found, time breaks ties; best tier and time per run in the course record.
   `src/game/course/courseRating.ts` (pure, tested).
5. Course record (C9): `course:fallow` in IndexedDB kv through src/save (bays the host has finished, best run per bay
   and in total); read at the lobby, written at each airlock and at `courseDone`; sanitised on read.
6. Bay select (D20): the co-op lobby shows "Start at bay N" for bays in the host's record (all bays with the dev flag);
   the `start` message carries it; `CourseState.startAt(n)`.
7. No skip path anywhere (D30): no button, setting or radio line completes a drill; the dev solo flag only lets one
   player's ticks count for both.

## Tests
Unit: drillDetect (every verb family), courseRating, course record sanitise and round trip. `scripts/e2e-course.mjs`
grows: courselab's bay gets three drills (a gear change, a vault, a switch); the airlock names the open drill and
refuses; the client's gear change reaches the host as a tick; both tick columns show on both pages; markers hide with
the setting; results show the course panel; a second lobby offers "Start at bay 2".

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-course e2e-coop e2e-netmove`. Then the Block A end (BRIEF
4.5): full `npm run e2e` in the background, the perf trend, PC-PASS row 1 with `E2E_GPU=1`.

## Commit
"training T1c: tutorial HUD, drill detection, results, course record, bay select". Docs: docs/systems/ui.md (course HUD),
docs/systems/coop.md (ctick), docs/systems/saves.md (the kv record), LOG, STATE, CHANGELOG.
