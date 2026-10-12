# ED3-3a - Rooms make their walls, walls follow rooms, Split, plus two fixes from the ED2-B review
Model: Opus, medium effort.
Decisions: 18

Start message: `Run docs/kestrel/prompts/ED3-3a.md`. Status: ready once Michael has tried the walk test (ED2-B) and
ED3-2 with his controller. If he has pad notes, a planner session folds them in first. One session. This is the first
half of ED3-3 (`docs/kestrel/editor-controller-review.md` section 7); ED3-3b (wall chains, door centring, live sizes
and guide lines) is written after this part commits. The ED2 "Every part" rules
(`docs/kestrel/prompts/ED2-editor-v2.md` lines 26-68) still apply. Do not start ED3-3b.

## 0. Start
1. `git checkout feature/kestrel && git pull`. Confirm the branch and a clean tree.
2. Preconditions (stop and report if one fails): `src/editor/gameWalk.ts`, `src/editor/grab.ts`, `src/editor/hub.ts`
   exist; `grep -n "wallInterior\|wallExterior" scripts/kestrel/facts.json` shows both (0.3 and 0.45);
   `timeout 300 npm run e2e:editor` passes (71 ok).
3. Print a plan of at most 10 lines.

## 1. Read (only these; files over 200 lines by line range or grep)
- `CLAUDE.md` hard rules; `docs/kestrel/RULES.md` sections 9-10; `docs/kestrel/prompts/ED2-editor-v2.md` lines 26-68
  and 298-341 (Part D; items 1 and the `between` gap are this part's).
- `docs/kestrel/editor-controller-review.md` sections 4.3, 4.4 and 5 (lines 85-145).
- `docs/kestrel/editor.md` lines 85-180 (controller, smarter A, screen) and 216-237 (unsaved work, limits).
- `docs/kestrel/schema.md` lines 28-45 (rooms, walls, openings).
- Editor: `src/editor/types.ts` (all), `src/editor/ops.ts` (all), `src/editor/geometry.ts` (all),
  `src/editor/model.ts` lines 35-60 and 110-140 (list, preview, commit), `src/editor/grab.ts` (all),
  `src/editor/padMenu.ts` (all), `src/editor/hub.ts` lines 1-60 (settings).
- `src/editor/main.ts`: 250-260 (commit), 300-430 (drag, handles, room / wall / opening creation), 1080-1120
  (delete, duplicate, Selection wheel actions); `grep -n "doorType\|wallTemplate\|Walls follow" src/editor/main.ts`
  and read only those spots.
- `src/editor/padControl.ts`: `grep -n "build\.\|sel\.\|ed.tool ===" ` and read only the menu handler and the tool A
  handler (about 245-330 and 760-800).
- `scripts/kestrel/editor-server.ts` lines 1-80 and 100-180; `scripts/e2e-editor.mjs` lines 1-40 and the last 60 lines.
- Anything else by `grep` and line ranges.

## 2. What to build
After this part, drawing a room also draws its walls, stretching or moving a room takes its walls along, and Split
divides a room in two with a wall. Michael builds a floor by drawing rooms, not by drawing every wall.

Facts this part relies on (campus file, measured by the planner 2026-10-12): every one of the 123 walls has its centre
line on a room edge of its level (0 on a face), so **a room edge is a wall centre line**. Wall kinds and thicknesses:
interior 0.3 (58), exterior 0.45 (35), boundary 0.45 (12), parapet 0.45 (18). `scripts/kestrel/facts.json`:
`wallInterior` 0.3, `wallExterior` 0.45 (source RULES section 6), `wallExtend` 0.5 (corner fill at build time).
`newWall` (ops.ts line 117) types 0.3 in code today. Grid 0.5 (`meta.grid`).

### Decisions
| # | Decision |
| --- | --- |
| 1 | **Pure module** `src/editor/roomWalls.ts` (Babylon-free, Vitest in `tests/editor/roomWalls.test.ts`): which walls lie on a room edge, the missing spans of an edge, linked-edit change lists, split. main.ts and padControl.ts only call it. |
| 2 | **"On an edge"**: a wall lies on a room edge when it is on the same level, parallel, its centre line within half its thickness of the edge line, and it overlaps the edge by more than 0.01 m. Walls are axis-aligned in this file; skip any that are not (none today, say so in a comment). |
| 3 | **Room tool option** (three values, shown under the Room icon on the tool bar like the door type): "Room with walls" (default), "Room with outside walls", "Room only". Build wheel: Room becomes a submenu with the three. Keyboard and mouse: a list beside tool 2, as the door type list beside tool 4. Remembered for the session only. |
| 4 | **Room makes walls**: finishing a room with walls adds a wall on every span of its four edges that no wall already covers. Spans shorter than the grid (0.5) are skipped. Kind interior at `wallInterior`, or exterior at `wallExterior` with the outside option; thicknesses read from facts.json (import the JSON; no 0.3 or 0.45 typed in code; `newWall`'s default changes to the same fact). Height: the level's height, as `newWall` does now. |
| 5 | **Reuse**: walls already on an edge are kept as they are (never duplicated, never re-kinded); a wall shared by two rooms stays one wall. Corners: new walls end on the corner points (centre lines meet), as the file does; the build fills corners with `wallExtend`. |
| 6 | **One undo step** for the room and its walls; change words like "Added Office 4 x 3 m with 3 walls (one side already walled)". |
| 7 | **Stretch an edge, walls follow**: when a room edge is stretched (A on an edge with the pad, or the mouse handle), every wall on that edge moves with it, and every perpendicular wall of the same level whose end sits on the old edge line, within the edge's span, stretches so its end stays on the edge. Doors and windows keep their distance from the nearer wall end (ED2 D1). |
| 8 | **Long walls are cut**: a wall on the stretched edge that runs past the edge's ends is cut at those ends first (up to three walls; the middle piece moves, the outer pieces stay). Each opening goes to the piece holding its centre; an opening the cut would split stays put and the stretch is refused with the hint "A door is in the way at the corner". New pieces get fresh ids from `freshId`. |
| 9 | **Neighbours follow a shared wall**: another room on the same level whose edge lies on the moved wall piece, along its whole length, has that edge moved too (the partition moves; both rooms resize). The hint before A names them: "Stretch east edge (also resizes Admin Office)". A neighbour only partly on the piece is left alone; the checks will show any overlap. |
| 10 | **Move a room, walls follow**: moving a whole room moves the walls on its edges that no other room on the level also lies on, with their openings. Shared walls stay where they are. Perpendicular walls of other rooms are not stretched. The hint says "Move (2 shared walls stay)" when that applies. |
| 11 | **Toggle "Walls follow rooms"**: on by default. A row in the hub's Settings tab (saved with the pad settings, a view preference) and a tool-bar button for the mouse. Off: rooms move and stretch alone, as now. |
| 12 | **`between` refresh** (the v1 gap in editor.md's limits): any room move, stretch or split recomputes `between` (`withBetween`, ops.ts 142) for every opening on a wall the edit touched and on every wall lying on the room's old or new edges, in the same change. |
| 13 | **One change for a linked edit**: the room, its walls, neighbours and openings are one commit and one undo step; words like "Widened Admin Office east by 1 m; moved 2 walls, stretched 2, also resized Store". |
| 14 | **Split** (rooms only): Selection wheel > Split (mouse: hold R > Split). A ghost line runs across the room through the dot, across the room's longer side by default; RB tap turns it 90 degrees; the dot moves it on the grid; A places it, B cancels. It must leave at least 1.0 m each side (hint "Too close to the edge" and no action). |
| 15 | **What Split makes**: a wall along the line, edge to edge, of the room tool's current wall option kind (interior unless set to outside; "Room only" makes no wall), except where a wall already lies on the line. The room keeps its id, name and fields on the west or south part; the other part is a new room with a fresh id, name "<name> 2", same kind, ring, building, ceiling, finish and minShort. Openings on the room's edges get `between` refreshed (12). One undo step: "Split Office into Office and Office 2 with a 4 m wall". |
| 16 | **Smarter A words**: grab.ts's hint for a room edge and a room move uses the linked-edit words above (9, 10) when "Walls follow rooms" is on; constants stay in grab.ts's table. |
| 17 | **Fix: tests never write the real files** (ED2-B incident): the editor server takes `KESTREL_EDITOR_SANDBOX=<dir>`; when set, it loads from and saves the campus file, plan images and change logs into that folder (copied from `docs/kestrel` at start) and never under `docs/kestrel`. `scripts/e2e-editor.mjs` always sets it to a temp folder, and gains one step that saves once and then checks `git status --porcelain docs/kestrel` is empty. The "saves only at count 0" guard stays. |
| 18 | **Fix: the draft is local only**: `GET /__editor/draft` answers only `isLocal` requests (editor-server.ts line 54), like the POST; the game iframe is same-origin, so the walk test is unaffected. |

## 3. Out of scope
Wall chains, door centring between cross walls, live sizes and distances, guide lines (ED3-3b); clickable problems,
floating names, save summary, search (Part D rest); stairs, ladders, floor holes and levels (Part E); objects (F).
No change to the save format or the campus file's contents (no new fields). No game code changes.

## 4. Checks
1. `timeout 300 npm run lint`, `timeout 600 npm test` (only the known kestrelMap failure allowed: the old B0 copy of
   the block plan, refreshed only by the B0 rerun), `timeout 600 npm run build`; `dist/` has 0 hits for
   `padControl`, `__editor`, `roomWalls`.
2. Vitest `tests/editor/roomWalls.test.ts`: an empty level, a 4 x 3 room makes 4 walls of the interior thickness from
   facts.json; a room drawn against an existing wall makes 3; an edge half covered makes one wall for the gap; a span
   under 0.5 is skipped; stretching an edge moves its wall, stretches both perpendicular walls and keeps a door's
   distance from the nearer end; a long corridor wall is cut into three and only the middle moves; an opening across
   a cut point refuses the stretch; a neighbour wholly on the shared wall resizes, a partial one does not; moving a
   room leaves shared walls and moves the rest; `between` is refreshed; Split makes two rooms and one wall, and none
   when a wall is already on the line; every case undoes in one step to the exact old data (`campusText` equal).
3. `timeout 300 npm run e2e:editor`, extended with the fake pad: draw a room with walls on an empty patch (4 walls,
   1 undo step); draw a second room against it (3 new walls); stretch the shared edge (both rooms resize, the wall
   moves); move the first room (the shared wall stays); Split the second room (2 rooms, 1 wall); "Walls follow
   rooms" off, stretch again (no wall moves); undo all, unsaved count 0; the sandbox save step (17); the draft GET
   from a non-local address is refused (or, if the test cannot fake one, a Vitest on the server's handler). Every
   existing step still passes. Report the pass count.
4. Browser screenshots (`.claude/launch.json` server `editor`): a room just drawn with its walls (3D); the hint
   "Stretch east edge (also resizes ...)"; the Split ghost line; the result after Split on the plan. View each image
   once. Reset viewport emulation.
5. Self-check commands, paste each summary line: `grep -c "0\.45\|0\.3\b" src/editor/roomWalls.ts` (expect 0);
   `grep -n "KESTREL_EDITOR_SANDBOX" scripts/e2e-editor.mjs scripts/kestrel/editor-server.ts` (both files);
   `git status --porcelain docs/kestrel` after the e2e run (empty); `npx vitest run tests/editor` (all pass).

## 5. End (RULES 9)
1. Fix failures, at most two rounds; then BLOCKED per RULES 7 if still failing.
2. `docs/kestrel/editor.md` updated (room tool option, walls follow rooms and its toggle, Split, the sandbox for
   tests; remove the `between` line and "Linked walls" from the limits); one log entry in `docs/kestrel/progress.md`
   (at most 6 lines); one line in `docs/kestrel/lessons.md`.
3. Commit `kestrel ED3-3a: <summary>` (only files you changed), push `feature/kestrel`.
4. Report to Michael per RULES 9 4c: plain English, at most 8 lines, no bare ids or decision numbers. Then a "Try
   this" list of 5-7 numbered steps: draw a room on an empty patch of the yard and see its walls; draw a second room
   against it; stretch the shared side and watch both rooms and the wall move; move the first room and see which
   walls go with it; Split a room; turn "Walls follow rooms" off in the hub's Settings and stretch again; undo
   everything and check the unsaved count reads 0. Real-pad feel is his test: say so in one line.
5. Last line before the Next step block: "Review chat: SKIP" (editor parts skip review; Michael, 2026-10-12,
   progress.md Decisions). The Next step block: "1. Type /clear." "2. Stay on Opus, medium." "3. Send the prompt
   below:" then a fenced code block holding `Planner: next` on its first line and the whole report under it.
6. STOP. Do not start ED3-3b.
