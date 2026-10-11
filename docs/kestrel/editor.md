# Kestrel level editor (v1)

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
| Input | Does |
| --- | --- |
| Right mouse drag | look around |
| W A S D | move; Q / E down / up (fly); Shift fast; mouse wheel zooms in and out |
| Tab | walk at eye height (1.75 m player, walls block, doors and gaps let you through, C crouches to 1.15 m) / fly |
| Page Up / Page Down, Level list | change level (walking: you stay at the same spot on the new floor) |
| Show list | this level and below (cutaway), this level only, everything |
| 1 - 5 | tools: select, room, wall, door (type from the list beside it), window |
| Click, drag | select and move; drag the orange handles to resize a room, stretch a wall or widen an opening |
| Ctrl while dragging | fine grid (0.1 m) instead of the 0.5 m grid |
| Arrow keys | nudge the selection 0.5 m (Shift: 5 m) |
| Delete, Ctrl+D | delete (a wall takes its doors and windows), duplicate |
| F | go to the selection |
| Ctrl+Z, Ctrl+Y | undo, redo |
| Ctrl+S | save the file, the 7 plan images and the change log |
| H, P | show / hide the key list; plan size (beside, large, hidden) |

The plan view takes the same tools and drags. Mouse wheel zooms, right drag pans, double-click takes the camera there.
The blue arrow on the plan is the camera.

## Panels
- **Selected**: the selected element's fields (name, kind, access level, size and position, wall thickness and height,
  opening type, width, height, sill, locked, key). Type a value and press Enter.
- **Checks**: `check.mjs` and `standards-check.mjs` results, rerun after every change. Red lines are new since the
  editor opened. The badge on the toolbar counts them.
- **Changes**: what has been done since the last save, newest first.

## What v1 does not do yet (v2)
- Add, reshape or delete stairs, ladders and floor holes beyond moving them; no new levels.
- Rename ids (they are referenced from openings, stairs and the plan documents).
- Lighting preview, props, guards and routes.
- Walking up stairs: change level with Page Up / Page Down.
- Openings keep the rooms either side (`between`) up to date when they are placed or moved, not when a room moves.

## Files
| File | Role |
| --- | --- |
| `editor.html`, `src/editor/main.ts` | page, tools, panels, plan view |
| `src/editor/scene3d.ts`, `src/editor/controls.ts` | 3D massing, picking, handles; fly and walk camera |
| `src/editor/model.ts`, `src/editor/ops.ts`, `src/editor/geometry.ts` | data, undo and the journal; new elements and change words; wall cuts, snapping, walk collision (Babylon-free, `tests/editor/`) |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load, plan (one level, SVG), checks, save |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
