# Kestrel level editor (v2, Parts A and C)

A dev-only tool for Michael to fly and walk the campus in 3D and change it directly. It edits
`docs/kestrel/kestrel.campus.blocks.json`, shows the live floor plan beside the 3D view, runs the Kestrel checks as you
work, and on save writes the file, the plan images and a change log for review. It is never part of the game build
(`editor.html` is not a build input; the endpoints exist only on the dev server).

## Start it (no Claude needed)
1. Install Node.js once (nodejs.org, the LTS version), if `node -v` in PowerShell shows nothing.
2. Either double-click `Kestrel-Editor.cmd` in the project folder (`C:\NightShift\Mobile-Coop`),
   or open Windows PowerShell and type:
   `cd C:\NightShift\Mobile-Coop` then `npm run editor`.
3. The browser opens `http://localhost:5199/editor.html`. If it does not, type that address into Chrome or Edge.
4. Plug in the controller (USB or Bluetooth) and press any button: the screen switches to the controller layout.
5. Save with Hold Y > File > Save (or Menu > Save, or Ctrl+S). To stop the editor, close the PowerShell or command
   window (or press Ctrl+C in it). Unsaved edits are offered back next time you open it.
6. Checks of the controller: `npm run e2e:editor` (about a minute, never saves).

7. Phone or tablet on the home Wi-Fi: double-click `Kestrel-Editor-Network.cmd` instead. It serves the editor over https
   with its own certificate (iOS lets a page use a controller only when it is secure), and devices on the home network
   (private addresses, never the internet) can save. Open `https://192.168.1.249:5199/editor.html` (the PC's address; the
   window prints it). Windows Firewall must allow port 5199 on Private networks (one admin command, done 2026-10-12).
8. First time on each iPhone (so Safari, home-screen web apps and controllers trust the editor):
   1. In Safari open `https://192.168.1.249:5199/__editor/cert.crt`. Safari warns the connection is not private:
      Show Details, then visit this website, then Allow the profile download.
   2. Settings, Profile Downloaded, Install.
   3. Settings, General, About, Certificate Trust Settings: switch on "Kestrel level editor".
   4. Open `https://192.168.1.249:5199/editor.html`. Share, Add to Home Screen makes it a web app.
   If the PC's address changes, the launcher makes a new certificate; install it again.
- On a phone the toolbars scroll sideways, the side panel slides over the view, and in portrait Both stacks the 3D view
  over the plan. With a controller the toolbars hide as on the PC.
## Controller screen (ED2 Part C2)
- Any controller input switches to the controller screen: both toolbars, the mouse cursor and the side panel hide; a
  status strip (top left: editing level, view, levels setting, building, tool, unsaved changes, new problems) and large
  button prompts along the bottom replace them. Moving the mouse more than a few pixels or pressing a key brings the
  normal screen back. Nothing else changes between the two.
- The tool bar (bottom centre) and the selection card (bottom right) show on the controller screen only.
- Rare things are in the hub (Menu, ED3-2): Play, File (save, revert, the change list), Checks, Levels (the level to
  edit and the Levels panel), View, Settings and Help. Selection wheel > Properties opens the side panel with the pad
  (D-pad up / down picks, A ticks or presses, left / right changes a number or slider, LB fine, B leaves).
- Questions are in-editor boxes answered with A or B.
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
Every binding lives in one action map, `src/editor/actions.ts`; the hub's Help tab (H) and the hint bar along the bottom of the
views are generated from it, so this table and the editor cannot drift apart for long.

| Input | Does |
| --- | --- |
| Right mouse drag | look around |
| W A S D | move; Q / E down / up (fly); Shift fast; mouse wheel zooms in and out |
| Tab | **walk test (game)**: the game's own player at the dot, unsaved edits included (below) |
| Shift+Tab | **quick walk** at the dot (same as L3; 1.75 m eye, walls block, C crouches to 1.15 m); again goes back |
| F10 (in the game) | back to the editor from the walk test |
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
| H | the hub, on its Help tab (H or Esc closes it) |
| Hold Space / hold R | the Build wheel / the Selection wheel (with something selected) |
| Esc | cancel a drag, put the tool down, clear the selection |

The plan view takes the same tools and drags. Mouse wheel zooms, right drag pans, double-click takes the camera there.
The blue arrow on the plan is the camera. Hovering a room, wall or opening in 3D or on the plan outlines it blue on the
plan and names it in the corner of the 3D view.

## Controller (ED2 Part C, ED3-1 builder camera, ED3-2 hub, wheels, smarter A)
Any Xbox, PlayStation or Nintendo pad works alongside the mouse and keyboard. The hint bar and the hub's Help tab switch
to the pad's own button names when the pad was used last, and back when the keyboard or mouse is used.

The pad drives a **builder camera** that circles the **dot**, a point on the editing floor. The first pad input starts
it from the current view (aimed at the screen centre, or 25 m ahead when that misses); mouse or key input hands back to
the free camera from the same spot. Nothing jumps either way.

### Building (the normal state)
| Button | Does |
| --- | --- |
| Left stick | move the dot across the editing floor, the way the camera faces; faster when zoomed out, a little slower near a snap |
| Right stick | orbit left / right, tilt up / down (about 20 degrees to straight down) |
| LT / RT | zoom out / in (4 to 140 m); in Plan only they zoom the plan |
| A | the tool's action: select what the dot is on; on the selection, take the part the dot names (below); drawing tools start and finish; door and window tools place one |
| B | cancel a grab or a drawing; else put the tool down; else clear the selection. Never deletes |
| X / X held | undo / redo |
| Y tap / Y held | the last tool again / the **Build wheel** |
| D-pad left / right | previous / next tool on the tool bar (wraps) |
| D-pad up / down | level up / down; the dot and camera rise or drop with it |
| LB held | precision: 0.1 m grid, pan, orbit and zoom at 30 %, magnet off |
| RB tap / RB held | go to the selection / the **Selection wheel** (with nothing selected: "Select something first") |
| L3 (left stick click) | quick walk at the dot; while walking L3 toggles run (as the game's sprint), B returns to the camera exactly as it was |
| R3 (right stick click) | levels shown: up to this level, single level, whole building (cycles) |
| View tap / View held | top-down and back (north up) / layout: 3D, Both, Plan (cycles) |
| Menu | the **hub** |

### Grabbing and drawing
| Button | Does |
| --- | --- |
| Left stick | the grabbed thing follows the dot, snapped |
| D-pad | nudge one grid step (relative to the camera) |
| A | drop / finish the corner or wall end |
| B | put it back / cancel |
| RB tap | turn the grabbed room, stair, ladder or wall 90 degrees about the dot (shown live; the drop saves move and turn as one change; B puts it back). Doors, windows and floor holes ignore it |
| LB held | precision, as above |

### Smarter A
- **Edge-aware grab**: with something selected, the part A would take lights up (3D and plan) and the dot and the hint bar
  say it. Rooms, stairs and floor holes: near an edge (inside or just outside) "Stretch east edge" and so on, the nearer
  edge at a corner; elsewhere "Move". Walls: near an end "Stretch this end", else "Move". Doors and windows: near a side
  "Widen", else "Slide along the wall". Further away, A selects what the dot is on. The band is 0.5 m, or a quarter of
  the shorter side or the wall length when that is less (doors and windows: 0.25 m or a quarter of the width). The mouse
  keeps the orange handles.
- **Magnetic dot**: on the editing level the dot pulls onto wall ends, room corners and door or window centres within
  0.5 m, else onto wall centre lines (grid steps along the line); it lets go beyond 0.7 m. It pulses once, the pad
  rumbles once and the dot names the snap ("Wall end", "Room corner", "Door centre", "On wall"). While dragging, the
  dragged thing's own points are skipped. LB held turns it off.
- **Ghosts**: before A, Room and Wall show a start marker ("A: start a room here"); Door and Window show a see-through
  opening at its default size on the nearest wall within 1.2 m, with its width and "A: place <kind> on <wall>"; with no
  wall in reach the dot turns red and says "Move onto a wall". Measure shows its line and length. The plan shows the
  same as dashed outlines.
- The constants are one table at the top of `src/editor/grab.ts` (Michael tunes them after his pad test).

### The wheels (hold, point with either stick, release to pick; resting on a submenu opens it)
| Build wheel (Y held; mouse: hold Space) | Selection wheel (RB held; mouse: hold R) |
| --- | --- |
| Select, Room, Wall, Door > (door kinds), Window, Measure, Paste and Paste to level above (only with something copied). Stair, Ladder, Floor hole and Object join when those tools exist | Only what fits the selection: Move (as A in the middle), Properties (the side panel), Duplicate, Rotate 90 (rooms, walls, stairs, ladders), Copy and Copy to level above (rooms, walls, floor holes), Change type > (door kinds for doors and windows, room kinds, wall kinds: interior, exterior, boundary, parapet, balustrade (blue-grey in 3D); one undo step), Delete |

- Picking from the Build wheel also lights that tool on the tool bar. **Copy to level above** copies, pastes one level up
  in one change, selects the copy and takes the editing level up with it ("No level above" at the top).
- A on a slot picks it; B goes back (at the top, closes). The last pick in each ring is highlighted next time. After a
  wheel or the hub closes, the sticks do nothing until they return to the centre.

### The hub (Menu; H on the keyboard opens it on Help)
A full-screen pause-style screen. LB / RB change tabs (wrapping), D-pad up / down picks a row, left / right changes a
value, A does it, B or Menu closes. Mouse: click a tab or a row; Esc or H closes. While it is open nothing else reads the
pad, and any grab is put back first.

| Tab | Holds |
| --- | --- |
| Play | Quick walk at the dot (same as L3; L3 runs, B comes back); Walk test as the player (the game, as Tab) |
| File | Save (with the unsaved count), Revert to last save (asks first), the change list newest first: A on a line asks "Undo back to here?" and undoes every change down to and including it |
| Checks | Next problem (the line after the last one visited), then the problem lines (fails and warnings; new ones red). A on a line closes the hub and goes there |
| Levels | the level to edit (A edits it), then the Levels panel: presets, picked levels, ghost, exploded and gap, cut height, building filter |
| View | layout 3D / Both / Plan, plan labels, small plan (3D only), level below on the plan |
| Settings | rumble on / off, stick speed (0.5 to 2.0, step 0.25), invert tilt, text size (Large = 1.25x on the pad screen, the hub and the wheels). Saved with the pad preferences (browser storage, a view preference) |
| Help | a picture of the controller with every button labelled with its building-state action (from the action map), then every binding by group for keys, mouse and pad |

- The unsaved count is the net change since the last save: undo lowers it, and it is 0 exactly when the building is as
  saved (an edit after undoing past the save counts both ways). The change log written on save still lists every undo.

### Screen
- The **dot** shows the position, the snap, what A would do and, while grabbing or drawing, the live size, length or
  move. In Plan only its words show under the plan.
- **Tool bar** (bottom centre): Select, Room, Wall, Door (the door type under it in words: Single, Double, Fire door), Window,
  Measure; the current one lit. When the selection card shows, the bar centres in the width left of it; where that is too
  narrow the card rises above the bar. Nothing on the pad screen overlaps (e2e checks 1280 x 720, 1024 x 600, 932 x 430).
- **Selection card** (bottom right): the name, or the kind in words ("Interior wall"), with its code small and grey; size;
  level. Read-only; edit through the Selection wheel > Properties.
- **Hint bar** (controller): one line, at most 5 prompts in one or two words ("A Move", "RB Go to", "RB hold Change",
  "B Back"); what A would take is the A prompt's word. Full words are in the hub's Help. The keyboard keeps the long words.
- **Quick walk**: left stick walks, right stick looks, D-pad up / down changes level (the walk moves to that floor at
  the same spot), L3 toggles run, B ends it. The dot, tool bar and card hide; A does nothing. Shift+Tab does the same from the keyboard.
- **Plan with the pad**: the plan never takes the pad; it shows the dot as a blue ring, the lit part and the ghosts as
  dashed outlines, and pans to keep the dot in view. The mouse still pans, zooms and edits the plan as before.
- **Side panel**: Selection wheel > Properties takes the pad: D-pad up / down picks a field, left / right changes a
  number by one grid step (LB: fine) or steps a list, A presses a button or opens a text field, B leaves.
- **Questions** such as Revert are answered in the editor: A (or click) yes, B no.
- **Rumble**: once on a new snap, on a drop, and a heavier one on an error. Off in the hub's Settings.
- Copy and paste take rooms, walls and floor holes. Measure is pad-only for now (A, A).
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

## Walk test as the player (ED2 Part B)
- **Ways in**: Tab, the tool bar's "Walk test (game)", or Hub > Play > Walk test as the player. The game opens over the
  editor in the same tab, built from the campus exactly as the editor holds it, unsaved edits included (the editor sends
  it to the dev server's memory; nothing is written to disk).
- **Where you start**: exactly where the editor camera is centred: the dot on the editing level (pad), the eye during a
  quick walk, or the screen centre on the floor (mouse); facing the camera's way, pushed clear of walls by a hand's width.
  No room or reachability test: a sealed room, a roof or a void is a valid start.
- **Ways back**: F10, Esc then "Back to editor", or hold View + Menu for half a second. The camera starts where the game
  camera was and eases to an orbit round the player on the player's level; undo history, selection and the unsaved count
  are as before the walk. The swap in eases the editor camera onto the game camera first, so there is no blank frame.
- **Kept warm**: after the first walk the game stays loaded, hidden and paused. With no edits since, the next walk only
  moves the player (instant); after an edit it rebuilds ("Loading game..." on the status strip, the editor stays live).
  Revert and restore drop it. The hidden game still draws frames (a dev-tool cost; fine on the PC, slow under software GL).
- **What is modelled**: walls, fences, parapets and balustrades collide at their own heights; every opening is an open gap
  of its width and height (windows above their sill); stairs are walkable flights with the file's risers; floors have their
  voids cut; all six ladders are climbable (the engine's ladder anchor, facing their wall); the pipe rack is a solid box.
- **Not yet**: doors that open, close or lock (stage DR; the game says "Doors are open gaps for now"), pipe anchors on the
  rack (later work), guards, security, lighting. The corner readout shows "x, z, level" to say where something feels wrong;
  the game's debug overlay (F3) works as usual.
- Code: `src/editor/gameWalk.ts` (iframe, warm game), `src/dev/editorBridge.ts` (game side, dev only),
  `src/world/maps/kestrelCampus.ts` (campus file to the game's builder, Babylon-free, `tests/kestrelCampus.test.ts`).

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
- Linked walls, snapping,
  dimensions, clickable problems, search (Part D).
- Add, reshape or delete stairs, ladders and floor holes beyond moving them; no new levels; renaming ids (Part E).
- Lighting preview, props, guards and routes.
- Quick walk up stairs: change level with Page Up / Page Down (the walk test climbs stairs and ladders for real).
- Openings keep the rooms either side (`between`) up to date when they are placed or moved, not when a room moves.
- On the plan, the building filter hides rooms, walls and openings; their name labels stay.

## Files
| File | Role |
| --- | --- |
| `editor.html`, `src/editor/main.ts` | page, tools, panels, plan view |
| `src/editor/scene3d.ts`, `src/editor/controls.ts` | 3D massing, picking, handles; fly and walk camera |
| `src/editor/model.ts`, `src/editor/ops.ts`, `src/editor/geometry.ts` | data, undo and the journal; new elements and change words; wall cuts, snapping, walk collision (Babylon-free, `tests/editor/`) |
| `src/editor/padControl.ts`, `src/editor/padMenu.ts` | controller editing: the dot and its magnet, edge-aware grab, ghosts, tool bar, selection card, quick walk, plan marker, side panel, rumble; the Build and Selection wheels' contents and ring |
| `src/editor/grab.ts`, `src/editor/hub.ts`, `src/editor/hubView.ts` | which part A takes, the magnet search and their constants; the hub's tabs, rows, settings and help labels (pure, `tests/editor/grab.test.ts`, `hub.test.ts`); the hub on screen |
| `src/editor/orbit.ts` | the pad's builder camera: state, pan / orbit / zoom, clamps, eases, top-down swap (pure, `tests/editor/orbit.test.ts`) |
| `src/editor/pad.ts`, `src/editor/radial.ts` | pad reading (edges, taps and holds, D-pad repeat, button names); radial slot maths and menu navigation (Babylon-free, `tests/editor/editorPad.test.ts`) |
| `src/editor/actions.ts`, `src/editor/visibility.ts`, `src/editor/draft.ts` | the action map (keys, help, hint bar); which levels and buildings are shown, ghosted or hidden, and the exploded lift; unsaved drafts in IndexedDB (Babylon-free, `tests/editor/editorV2.test.ts`) |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load, plan (one level, SVG), checks, save |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
