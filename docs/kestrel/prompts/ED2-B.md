# ED2 Part B - Walk test as the player (refreshed for the hub), plus two fixes from the ED3-2 review
Model: Opus, medium effort.
Decisions: 19 (revised 2026-10-12: spawn in place of the camera, seamless swap, review FIXES folded in)

Start message: `Run docs/kestrel/prompts/ED2-B.md`. Status: ready once Michael has tried ED3-2 with his controller
(ED3-2 reviewed right, 2026-10-12; his pad test was still to do when this was written). If he has pad notes, a planner
session folds them in first. One session. This file replaces Part B of `docs/kestrel/prompts/ED2-editor-v2.md`
(lines 137-192); the ED2 "Every part" rules (lines 26-68) still apply. Do not start ED3-3.

## 0. Start
1. `git checkout feature/kestrel && git pull`. Confirm the branch and a clean tree.
2. Preconditions (stop and report if one fails): `src/editor/hub.ts`, `src/editor/grab.ts`, `scripts/e2e-editor.mjs`
   exist; `grep -n "play.walk" src/editor/hub.ts` shows the greyed row; `timeout 300 npm run e2e:editor` passes (55 ok).
3. Print a plan of at most 10 lines.

## 1. Read (only these; files over 200 lines by line range)
- `CLAUDE.md` hard rules; `docs/kestrel/RULES.md` sections 9-10; `docs/kestrel/prompts/ED2-editor-v2.md` lines 26-68
  and 137-192 (the original Part B; this file wins where they differ).
- `docs/kestrel/editor.md` lines 83-214 (Controller, hub, screen, unsaved work, limits).
- `docs/kestrel/schema.md` lines 28-45 (section 2: the arch schema; line 36 lists the five wall kinds).
- Editor: `src/editor/hub.ts` lines 60-100 (the Play and File rows), `src/editor/hubView.ts` lines 140-160,
  `src/editor/actions.ts` (all), `src/editor/model.ts` (all), `src/editor/ops.ts` lines 1-25,
  `src/editor/padMenu.ts` lines 30-50, `src/editor/draft.ts` (all).
- `src/editor/main.ts` lines 800-870 (walk, toggleWalk, quick walk), 940-960 (run), 1040-1075 (save), 1100-1110
  (tool bar), 1195-1205 (Save title), 1380-1395 (hint notes), 1425-1470 (draft restore, revert), 1515-1530 (change
  list), 1545-1560 (Properties kinds). `src/editor/padControl.ts`: `grep -n "getGamepads\|poll\|frame(" ` and read
  only the per-frame pad read and its caller.
- `scripts/kestrel/editor-server.ts` lines 100-178, `vite.config.ts` lines 35-50, `scripts/e2e-editor.mjs` (all).
- Game: `src/main.ts` lines 190-232, `src/core/flags.ts` (all), `src/world/maps/index.ts`, `src/world/maps/kestrel.ts`
  (all), `src/world/maps/kestrelGeo.ts` (by range: 1-110 types and helpers, then each builder it exports),
  `src/ui/screens/pauseScreen.ts` (grep for the menu rows), `src/world/anchors.ts` lines 1-60,
  `tests/kestrelMap.test.ts`, `src/world/mapDef.ts` lines 44-82, `src/world/levelBuilder.ts` lines 222-237,
  `src/player/playerController.ts` lines 285-305, `src/player/shoulderCamera.ts` lines 48-60 and 234-247,
  `src/editor/orbit.ts` lines 1-60, `docs/kestrel/00-facts.md` section 2 (axes), `docs/kestrel/kestrel.campus.blocks.json` (with `python`/`node` summaries, not whole).
- Anything else by `grep` and line ranges (player position and yaw, the debug overlay, how other maps add anchors).

## 2. What to build
After this part, Hub > Play > "Walk test as the player" (or Tab) puts Michael in the game as the real player, in the
campus exactly as the editor holds it now, unsaved edits included, at the dot. One action brings him back to the
editor where he stopped, with his undo history intact.

Facts this part relies on (campus file, 2026-10-12): 7 levels B, U, G, F, H, L, R; 87 rooms, 123 walls (kinds
interior, exterior, boundary, parapet), 33 openings (door, double, fire-door, gate, roller), 7 stairs, 6 ladders,
16 voids, 1 services entry, 0 objects; site 108 x 76 (under the 110 x 80 limit). `buildKestrel` (kestrel.ts line 39)
reads the older B0 file `kestrel.blocks.json`. Maps place ladders with `LevelBuilder.ladder(x, z, y0, y1, facing)` (levelBuilder.ts 222-237). Map build is
synchronous (`MapDef.build`, mapDef.ts 68-82). The player has `teleport(feet, yaw)` (playerController.ts 287) and the
game camera `snap()` (shoulderCamera.ts 235); call them, never change them (RULES 11: no player controller or camera
changes). Do not grep other maps for ladders: the only hits are deadLine.ts and deadLineV2.ts, which RULES 4 forbids.

### Decisions
| # | Decision |
| --- | --- |
| 1 | **Draft endpoint**: `POST /__editor/draft` stores the editor's current campus JSON in the dev server's memory (never written to disk); `GET /__editor/draft` returns it (404 if none). The editor posts `model.data` every time a game walk starts. |
| 2 | **Game flags** (dev only): `editorDraft=1` and `spawn=<x>,<z>,<level>,<yaw>` in `flags.ts`. With `import.meta.env.DEV` and `editorDraft=1`, the Kestrel map fetches the draft and builds from it instead of the bundled file; otherwise nothing changes. The fetch happens in `src/main.ts` before `startGame` on the autostart path (main.ts
205-212) and hands the campus to the Kestrel map through a setter in kestrel.ts; no fetch inside `build`. The production bundle has no `editorDraft` or `__editor` text (dynamic import behind the DEV check if needed). |
| 3 | **Campus converter** (pure, Babylon-free, `src/world/maps/kestrelCampus.ts`): campus schema to what the builder reads: several buildings, level footprint lists, levels U, H and L, boundary fences, gates and rollers, parapets and balustrades. No coordinate typed in code; everything comes from the file. The B0 path keeps working unchanged. |
| 4 | **Openings**: every opening is an open gap of its own width and height at its `at`; windows are gaps above their sill. One line on screen while walking: "Doors are open gaps for now". |
| 5 | **Stairs and floors**: stairs are walkable flights with the file's riser count, rising floor to floor; floors have their voids cut. |
| 6 | **Ladders**: build one per `ladders[]` entry with `LevelBuilder.ladder` (base on its `from` floor, top on its `to` floor). The file's facing is a compass letter ("W"); convert it to yaw with the axes in 00-facts.md section 2. |
| 7 | **Walls, fences, services**: walls and fences collide at their own height; balustrades and parapets collide at theirs; the services entry (pipe rack) is a solid box for now (pipe anchors are later work, say so in editor.md). It clears the link bridge (rack z 44.5-46.5, bridge z 40-43.5). |
| 8 | **Iframe hand-off**: the game opens in a full-window `<iframe>` overlay inside the editor page (same tab; the editor keeps its state). On open the iframe takes focus; while it is open the editor reads no pad, keys or mouse (its per-frame pad read is skipped, so a press is never seen by both). Game audio plays as normal. |
| 9 | **Spawn in place of the camera** (Michael, 2026-10-12): the player stands exactly where the editor camera is centred: the dot (orbit target) on the editing level's floor, or the eye position's x, z during a quick walk; facing the camera's yaw. No room or reachability test: a sealed room, a roof or a void with no way in is a valid start, so any area can be tested on its own. The editor computes the point and passes it in `spawn=`; the game only applies `clearOfWalls` (kestrel.ts line 23) and the level's floor height (level passed by id). |
| 10 | **Ways in**: Hub > Play > "Walk test as the player" is enabled (closes the hub); Tab and the tool bar's Walk button start the game walk. Shift+Tab is "Quick walk" and does exactly what L3 does (the editor's eye-height walk at the dot). Labels and hints say "Walk test (game)" and "Quick walk" so the two are never confused. |
| 11 | **Ways back**: the game's pause screen gains "Back to editor" (only with DEV and `editorDraft=1`); F10; holding View + Menu together for 0.5 s on the pad. The game sends the editor (`postMessage`, same origin only) the player's x, z, floor height, level id and yaw, and its camera's position and look target; the editor hides the iframe (it is not destroyed, see 19). |
| 12 | **Seamless swap** (Michael, 2026-10-12): no blank frame and no jump either way. Going in: the editor eases its own camera (about 0.4 s) from its pose to the game camera's start pose behind the player (the game reports it when ready), then shows the iframe in the same frame the game renders that pose. Coming back: the editor camera starts at the game camera's reported pose and eases to an orbit centred on the player (target = player x, z on its floor, yaw = camera yaw, the pitch and distance it had before the walk). Editing level = the player's level; the plan arrow follows. Undo history, selection and unsaved count are as they were before the walk. The game's own camera code is not changed; the blend is done on the editor side. |
| 13 | **Readout**: while walking, a small corner readout shows "x 34.0, z 41.5, First floor" (one decimal, level by name) so Michael can say where something feels wrong; the game's debug overlay stays available. |
| 14 | **kestrelMap test**: find out in plain words why `tests/kestrelMap.test.ts` fails (B0 copy vs the docs file) and report it; change neither file. |
| 15 | **Fix: balustrade wall kind**: `WALL_KINDS` in `ops.ts` follows schema.md line 36 (adds `balustrade`); Change type, Properties and the pad lists use the same constant; 3D and plan draw it (a colour of its own if parapet's would mislead). |
| 16 | **Fix: unsaved count is the net change**: undoing must lower it. The model remembers the saved point in its undo history; the count is the number of undo or redo steps between now and that point (an edit after undoing past the saved point counts both ways). It is 0 exactly when the data's saved text (`campusText`) equals the file as last loaded or saved, and at least 1 whenever it differs (covers a restored draft). The journal and the change log written on save are unchanged (they still record undos). The status strip, Save title, File tab and restore message use the new count. |
| 17 | **Action map, hint bar, editor.md**: Tab, Shift+Tab, F10 and the View + Menu hold in `actions.ts` with plain names; `conflicts()` stays empty. editor.md: the walk test (ways in and back, what is modelled, what is not: doors, ladders if skipped, pipes), the unsaved count's meaning, balustrade. Every reader of `model.dirty` follows the new count: main.ts 158 (leave-page warning), 1052 (save guard), 1199 (Save title), 1426 (draft write); hubView.ts 151; padControl.ts 361, 508-513, 700. padControl 508-513 detects a tool press that did nothing by "dirty unchanged": switch it to `model.history` length. With the count at 0 and a non-empty journal (edit then undo), Save clears the journal and shows the existing "Nothing new to save"; the Save button's title reads "Nothing to save". Remove "walk test" from the "does not do yet" list. |
| 18 | **Tests**: Vitest for the converter with the real campus file (wall count in = collision boxes out, minus documented fence rules; every opening leaves a gap at its `at` and width; every stair's flights rise floor to floor; no floor tile covers a void; balustrade kind kept) and for the model's count (edit, undo = 0; edit, edit, undo = 1; save, undo = 1; undo past save then a new edit = 2; restore of a differing draft >= 1). e2e in section 4. |
| 19 | **Game kept warm**: after the first walk the iframe stays loaded and hidden, paused through the game's existing pause (find it by grep; no change to the game loop). The next walk: if `campusText` equals the draft the game was built from, teleport the player to the new spawn (`teleport`, then the camera's `snap`), unpause and swap; if it differs, post the new draft and reload the iframe. While loading, the editor stays live with a "Loading game..." line on the status strip, and the swap happens only when the game reports ready. Revert, restore and closing the editor drop the warm game. |

## 3. Out of scope
Doors that open, close or lock (stage DR), guards and patrols, security devices, lighting, co-op; room tool walls,
split, wall chains (ED3-3); levels, stairs and ladder tools (Part E). No change to the save format or the campus file.
Performance is not judged (dev tool), but report the debug overlay's frame time once.

## 4. Checks
1. `timeout 300 npm run lint`, `timeout 600 npm test` (only the known kestrelMap failure allowed; the detailPass, pvp
   and voxel timeouts under full load count only if they also fail alone), `timeout 600 npm run build`; then search
   `dist/` for `editorDraft`, `__editor`, `padControl`: zero hits. `timeout 600 npm run e2e:quick` (game code changed).
2. `timeout 300 npm run e2e:editor`, extended (allow up to 60 s for the game to load under software GL; the fake pad
   init script must reach the iframe too):
   - Hub > Play > Walk test: the iframe opens, the game reports a player within 0.5 m of the dot on the editing
     level's floor, facing the camera's yaw within 5 degrees. A dot inside a room with no door also spawns there.
   - Seamless: no frame between the editor and the game shows neither (the swap waits for the game's ready message);
     the editor camera's first frame on return is within 0.1 m of the game camera's reported pose.
   - Second walk with no edits reuses the warm game (no iframe reload; the player teleports); a second walk after an
     edit reloads it.
   - A wall moved 1 m without saving: the game's collision for that wall is at the new place (read through the
     game's test hook or the built layout); the file on disk is unchanged.
   - F10 returns: iframe gone, editing level is the player's level, orbit target within 0.5 m of the player, undo
     history length and unsaved count unchanged. The pause screen's "Back to editor" does the same.
   - Shift+Tab starts the quick walk (same state as L3); B ends it.
   - Unsaved count: two edits = 2, undo = 1, undo = 0 and Save shows "Nothing to save".
   - Change type on a wall offers balustrade and is one undo step.
   - Every existing step still passes. Report the pass count.
3. Browser screenshots (`.claude/launch.json` server `editor`): the hub's Play tab; standing in the game in the data
   hall with the corner readout; the editor after return with the plan arrow; the frame just before and just after the swap in. View each image once. Reset viewport
   emulation.
4. Self-check commands, paste each summary line: `grep -c "balustrade" src/editor/ops.ts` (expect 1 or more);
   `grep -c "Comes in the next part" src/editor/hub.ts` (expect 0); `npx vitest run tests/editor` (all pass).

## 5. End (RULES 9)
1. Fix failures, at most two rounds; then BLOCKED per RULES 7 if still failing.
2. `docs/kestrel/editor.md` updated; one log entry in `docs/kestrel/progress.md` (at most 6 lines); one line in
   `docs/kestrel/lessons.md`.
3. Commit `kestrel ED2 B: <summary>` (only files you changed), push `feature/kestrel`.
4. Report to Michael per RULES 9 4c: plain English, at most 8 lines, no bare ids or decision numbers; say what the
   kestrelMap failure is in one line and which ladders were skipped, if any. Then a "Try this" list of 6-8 numbered
   steps: open the hub, Play, Walk test in the data hall; walk the ground corridor end to end; up the main stair in
   Building A to the first floor; across the link bridge into Building B; back to the editor with the pause screen
   and check the camera is where you stopped; move a wall without saving and walk again; undo everything and check
   the unsaved count reads 0. Real-pad feel and the frame rate on his PC are his tests: say so in one line.
5. Last line before the Next step block: "Review chat: SKIP" (editor parts skip review; Michael, 2026-10-12, progress.md
   Decisions). The Next step block: "1. Type /clear." "2. Stay on Opus, medium." "3. Send the prompt below:" then a
   fenced code block holding `Planner: next` on its first line and the whole report under it.
6. STOP. Do not start ED3-3.
