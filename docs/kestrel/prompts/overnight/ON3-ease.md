# ON3 - Ease of use: clickable problems, floating names, save summary, search, history, scale figure, bookmarks (ED2 Part D rest)
Model: Opus, medium effort.
Decisions: 11

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/prompts/ED2-editor-v2.md` lines 298-341 (Part D items 5-13);
`docs/kestrel/editor.md` sections "The hub", "Panels"; `src/editor/hub.ts` (all), `src/editor/hubView.ts` (grep
`Checks`, `File`); in `main.ts` grep `problemLines`, `runChecks`, `save()`, `journal`; `scripts/kestrel/check.mjs`
result shape (grep `details`).

| # | Decision |
| --- | --- |
| 1 | **Problems you can click**: every check line that names an element (an id in its details) selects it and takes the camera there (pad: Hub > Checks > A; mouse: click in the Checks panel); while the Checks tab or panel is open, problem spots carry a red marker in 3D and on the plan. Lines that name no element say so ("no place to go"). |
| 2 | **Floating names in 3D**: each room's name on its floor, faded with distance, hidden beyond 40 m and on hidden levels; toggle `L` and Hub > View. Pooled labels (no new DOM or mesh per frame). |
| 3 | **Save summary**: Save first shows what will be written in plain words (the net changes, grouped: "3 rooms added, 12 walls moved, 1 door type changed") and the number of new check problems, with Save / Cancel (pad: A / B). |
| 4 | **Search**: `Ctrl+K`; pad: Hub > Play (or a new top row "Find") opens a list of rooms, stairs and named objects filtered by an on-screen keyboard (D-pad grid, A types, X deletes, Y done) or by typing; A goes there and selects it. |
| 5 | **History**: the File tab's change list already undoes back to a line; add redo forward to a line ("Redo up to here?"), and show undone lines greyed until a new edit drops them. |
| 6 | **Scale figure**: a 1.75 m person (facts.json player stand height) and a 1.15 m crouch outline at the dot, toggle `K` and Hub > View. |
| 7 | **Bookmarks**: Hub > View > Bookmarks: save the camera (with a name from a list or typed), go to one; keys `Ctrl+1`-`9` save, `Alt+1`-`9` go. Stored as a view preference (browser storage). |
| 8 | **Multi-select** (Should 8): pad: hold A on empty floor and move = box select; Shift+click with the mouse; move, delete, copy and Copy to level above work on the set as one edit. |
| 9 | Vitest: problem line to element id parsing, save summary grouping and words, search filter, bookmark store / read. |
| 10 | e2e: open Checks, A on a line naming a room: selected and framed; floating names on; Save shows the summary and Cancel writes nothing; search a room by name and land on it; box select two rooms and move them (one undo step). |
| 11 | Screenshots: red problem markers, floating names, the save summary. |

End per section 5. Commit id `ON3`.
