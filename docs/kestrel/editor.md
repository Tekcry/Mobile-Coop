# Kestrel level editor (v2, Part A)

A dev-only tool for Michael to fly and walk the campus in 3D and change it directly. It edits
`docs/kestrel/kestrel.campus.blocks.json`, shows the live floor plan beside the 3D view, runs the Kestrel checks as you
work, and on save writes the file, the plan images and a change log for review. It is never part of the game build
(`editor.html` is not a build input; the endpoints exist only on the dev server).

## Start it
```bash
npm run editor
```
This opens `http://localhost:5199/editor.html` on this PC. Saving only works from this PC (localhost); the dev server
refuses writes from the network.

## Who is in charge (Michael, 2026-10-12)
- Once Michael saves from the editor, the campus file is the source of truth. The plan documents follow the file, not
  the other way round.
- `scripts/kestrel/p03b-blocks.mjs` (the old generator from `03B-block-plan.md`) refuses to overwrite an
  editor-owned file (`meta.editor` is set on save). `--force` throws the editor's changes away; never use it without
  Michael's word.
- The reviewer reads `docs/kestrel/editor-log.md` (plain English, one line per change, undos included),
  `docs/kestrel/editor-log.jsonl` (exact before and after of every change) and `git diff` of the campus file, then reruns
  `check.mjs` and `standards-check.mjs`.

## Controls
Every binding lives in one action map, `src/editor/actions.ts`; the help (H) and the hint bar along the bottom of the
views are generated from it, so this table and the editor cannot drift apart for long.

| Input | Does |
| --- | --- |
| Right mouse drag | look around |
| W A S D | move; Q / E down / up (fly); Shift fast; mouse wheel zooms in and out |
| Tab | walk at eye height (1.75 m player, walls block, doors and gaps let you through, C crouches to 1.15 m) / fly |
| Page Up / Page Down, Editing list | change the editing level (walking: you stay at the same spot on the new floor) |
| 1 - 5 | tools: select, room, wall, door (type from the list beside it), window |
| Click, drag | select and move; drag the orange handles to resize a room, stretch a wall or widen an opening |
| Ctrl while dragging | fine grid (0.1 m) instead of the 0.5 m grid |
| Arrow keys | nudge the selection 0.5 m (Shift: 5 m) |
| Delete, Ctrl+D | delete (a wall takes its doors and windows), duplicate |
| F | go to the selection |
| Ctrl+Z, Ctrl+Y (or Ctrl+Shift+Z) | undo, redo |
| Ctrl+S | save the file, the 7 plan images and the change log |
| V | view: 3D only, both, plan only (cycles) |
| ` (backquote) or I | open / close the side panel |
| M | small plan in the corner of 3D only (click it to take the camera there) |
| G, O, U | whole building, single level, up to this level |
| Shift+G, X | ghost the hidden levels, exploded view |
| H | show / hide the help |
| Esc | cancel a drag, put the tool down, clear the selection |

The plan view takes the same tools and drags. Mouse wheel zooms, right drag pans, double-click takes the camera there.
The blue arrow on the plan is the camera. Hovering a room, wall or opening in 3D or on the plan outlines it blue on the
plan and names it in the corner of the 3D view.

## Views (ED2 Part A)
- **3D | Both | Plan** in the toolbar (or V). Both has a divider to drag, **Side by side / Stacked** and **Swap**. The
  choice, the divider and the panel state are remembered (browser storage; a view preference, not a save).
- **Side panel** (Selected, Checks, Changes) sits on the right in every view. **Pin** keeps it beside the views;
  unpinned it floats over them. Close it with x, ` or I.
- **Levels** (second toolbar row): Whole building, Single level, Up to this level, or Pick levels (a tick per level).
  **Ghost the rest** draws the hidden levels as faint outlines that cannot be clicked. **Exploded** pulls the levels
  apart by the gap slider (0-12 m) with blue rods for stairs and ladders; edits there save as built (no gap in the file).
  **Cut walls at** draws walls only up to that height above their own floor. **Building**: All, A, B or Site (outside
  both footprints); hidden buildings cannot be clicked, in 3D or on the plan. **Plan: level below** draws the walls of the
  level below as faint blue dashes. The editing level is always shown; if the settings would hide it the hint bar says so.
- Walking (Tab) always shows the whole campus as built: no gap, no cut walls, every building.

## Unsaved work
- Every edit is copied to the browser's database (`kestrel-editor`, not the game's save) about a second later. If the
  page closes before a save, opening the editor again asks "Restore unsaved changes from <time>?". Restore brings back
  the edits and the change list (undo starts again from there); Discard drops them. Save clears the copy.
- **Revert to last save** throws away every unsaved change after a confirm and reloads the file; undo is cleared.

## Panels
- **Selected**: the selected element's fields (name, kind, access level, size and position, wall thickness and height,
  opening type, width, height, sill, locked, key). Type a value and press Enter.
- **Checks**: `check.mjs` and `standards-check.mjs` results, rerun after every change. Red lines are new since the
  editor opened. The badge on the toolbar counts them and opens the panel.
- **Changes**: what has been done since the last save, newest first.

## What it does not do yet (ED2 parts B-H)
- Walk test with the game's own player and camera (Part B); controller editing (Part C); linked walls, snapping,
  dimensions, clickable problems, search (Part D).
- Add, reshape or delete stairs, ladders and floor holes beyond moving them; no new levels; renaming ids (Part E).
- Lighting preview, props, guards and routes.
- Walking up stairs: change level with Page Up / Page Down.
- Openings keep the rooms either side (`between`) up to date when they are placed or moved, not when a room moves.
- On the plan, the building filter hides rooms, walls and openings; their name labels stay.

## Files
| File | Role |
| --- | --- |
| `editor.html`, `src/editor/main.ts` | page, tools, panels, plan view |
| `src/editor/scene3d.ts`, `src/editor/controls.ts` | 3D massing, picking, handles; fly and walk camera |
| `src/editor/model.ts`, `src/editor/ops.ts`, `src/editor/geometry.ts` | data, undo and the journal; new elements and change words; wall cuts, snapping, walk collision (Babylon-free, `tests/editor/`) |
| `src/editor/actions.ts`, `src/editor/visibility.ts`, `src/editor/draft.ts` | the action map (keys, help, hint bar); which levels and buildings are shown, ghosted or hidden, and the exploded lift; unsaved drafts in IndexedDB (Babylon-free, `tests/editor/editorV2.test.ts`) |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load, plan (one level, SVG), checks, save |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
