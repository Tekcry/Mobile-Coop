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
  edit and the Levels panel), View, Settings and Help. Selected > Properties (the Y tile menu) opens the side panel with the pad
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
| Shift+Tab | **quick walk** at the dot (same as L3 tap; 1.75 m eye, walls block, C crouches to 1.15 m, Shift held runs); again goes back |
| F10 (in the game) | back to the editor from the walk test |
| Page Up / Page Down, Editing list | change the editing level (walking: you stay at the same spot on the new floor) |
| 1 - 5 | tools: select, room (with walls, outside walls or room only, from the list beside it), wall, door (type from the list beside it), window |
| Click, drag | select and move; drag the orange handles to resize a room, stretch a wall or widen an opening |
| Ctrl while dragging | the object grid (0.1 m) when Settings > Grid is coarser; the grid is 0.1 m by default (ON0b) |
| Arrow keys | nudge the selection one grid step, 0.1 m by default (Shift: ten steps) |
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
| Space | the **tile menu** (Space again or Esc closes; click a tab or a tile) |
| Esc | close the menu, cancel a drag, put the tool down, clear the selection |

The plan view takes the same tools and drags. Mouse wheel zooms, right drag pans, double-click takes the camera there.
The blue arrow on the plan is the camera. Hovering a room, wall or opening in 3D or on the plan outlines it blue on the
plan and names it in the corner of the 3D view.

## Controller (ED2 Part C, ED3-1 builder camera, ED3-2 hub, smarter A, ON0a tile menu and card)
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
| LB held + right stick up / down | raise or lower the camera without tilting (the camera keeps its x, z; the dot slides along the view); the hint bar says so while LB is held |
| LT / RT | zoom out / in (4 to 140 m); in Plan only they zoom the plan |
| A | the tool's action: select what the dot is on; on the selection, take the part the dot names (below); drawing tools start and finish; door and window tools place one |
| B | cancel a grab or a drawing; else leave the card; else put the tool down; else clear the selection. Never deletes |
| X / X held | undo / redo |
| Y (tap) | the **tile menu** opens; Y again closes it (below) |
| D-pad, something selected | the **selection card** (below): up / down picks a row, left / right changes it |
| D-pad up / down, nothing selected | level up / down; the dot and camera rise or drop with it |
| D-pad left / right, a tool in hand | the tool's type: door type (Door), walls option (Room). Without a tool: nothing |
| LB held | slow: pan, orbit and zoom at 30 %, magnet off (ON0b: no longer a finer grid; the grid is Settings > Grid) |
| RB tap | go to the selection (with Split: turn the line). RB held does nothing |
| L3 tap | quick walk at the dot, **running** (the walk's run speed, 4.5 m/s); while walking L3 toggles a slow walk (1.6 m/s) and back, B returns to the camera exactly as it was |
| L3 held 0.6 s | the **walk test as the player** (the game), same as Tab; also from a quick walk |
| R3 (right stick click) | levels shown: up to this level, single level, whole building (cycles) |
| View tap / View held | top-down and back (north up) / layout: 3D, Both, Plan (cycles) |
| Menu | the **hub** |

### Camera feel (ON0b)
All the numbers are in one table, `ORBIT` in `src/editor/orbit.ts`. Both sticks have a radial dead zone (0.15) and an
exponent-2 response curve, so small pushes are fine and a full push is full speed. Pan, orbit, tilt, zoom and height ease
in over 0.25 s (Smoothing medium) and stop in half that, never past zero, so the camera does not overshoot. A full left
stick pans about one screen width in 1.5 s at the default zoom (25 m); orbit (1.8 rad/s) and tilt (1.1 rad/s) have their
own rates. Hub > Settings: **Grid** (0.1 m, 0.25 m, 0.5 m), **Pan speed**, **Orbit speed** (0.5x to 2x), **Smoothing**
(low 0.12 s, medium 0.25 s, high 0.4 s), **Invert tilt**, **Dead zone** (0.05 to 0.35), saved with the pad settings.

### Grid: 0.1 m everywhere (ON0b)
Drawing, moving, stretching, D-pad nudges, arrow-key nudges and every length on the selection card step one grid:
Settings > Grid, 0.1 m by default (0.25 and 0.5 m too). The file's `meta.grid` is no longer read. The magnet still snaps
onto wall ends, wall lines, room corners and door centres, so lining things up stays easy.

### Wall corners and gaps (ON0b)
- **Corners**: in the 3D view, the quick walk and the walk test, a wall end that meets another wall (end to end, or on its
  line) is drawn longer by half the other wall's thickness (`wallExtend` 0.5 x its thickness, facts.json), so outside
  corners are square and a T-join reaches the far face. Walls on one line whose ends meet draw as one wall: no extension
  and no outline at the seam. A free end stays as drawn. The file keeps its centre lines (`geometry.ts` `wallJoins`).
- **Gaps**: a wall end within 0.05 m of another wall but not on it (`wallGapMax`; on it means within `wallJoinTol`
  0.001 m) shows a red ring and "Gap 0.04 m" on the plan, and a red "Gap 0.04 m: W1 end b to W2" line first in the
  Checks (side panel and hub). Select the wall: **Close gap** on the Selected tab (or the button in the side panel) moves
  the end onto the other wall's end (or its line); a wall along x or z stays along it, shifting across only when it
  must. Its doors and windows keep their places. One undo step.

### No generated wall dressing on Kestrel (ON0b)
The game's detail pass (skirting, conduits, junction boxes, vents, signs, floor clutter at Ultra and Epic, and the Medium
dressing in the light bake) does not run for the Kestrel map (`MapDef.detail: false`; `detailPass.ts` `dressingOn`,
read by the level builder and the light-bake shapes, so light parity holds). Everything on a wall is placed on purpose
in the editor; the editor never adds dressing. Other maps are unchanged.

### Grabbing and drawing
| Button | Does |
| --- | --- |
| Left stick | the grabbed thing follows the dot, snapped |
| D-pad | nudge one grid step (relative to the camera) |
| A | drop / finish the corner or wall end |
| B | put it back / cancel |
| RB tap | turn the grabbed room, stair, ladder or wall 90 degrees about the dot (shown live; the drop saves move and turn as one change; B puts it back). Doors, windows and floor holes ignore it |
| LB held | slow and no magnet, as above |

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

### The tile menu (ON0a: replaces the wheels; Y tap, Space with the mouse)
A full-width panel over the bottom half of the views; the 3D view stays visible above it, and the dot, tool bar and card
wait until it closes. A row of tabs, then a grid of large tiles (a letter, the name, one line of what it does).

| Button | Does |
| --- | --- |
| D-pad or left stick | move the highlight (wraps); on the View tab, left / right change the row's value |
| A | pick the tile: a tool or an action runs and the menu closes; a View row changes and the menu stays |
| LB / RB | previous / next tab (wraps) |
| B or Y | close |
| Right stick | scroll a long tab |
| Mouse | Space opens and closes it; click a tab or a tile; Esc closes |

| Tab | Tiles |
| --- | --- |
| Selected (first, only with a selection) | Move, Duplicate, Rotate 90 (rooms, walls, stairs, ladders), Copy and Copy to level above (rooms, walls, floor holes), Split (rooms), Change type (lights the card's Type row), Properties (the full side panel), Delete |
| Build | Select, Room with walls, Room with outside walls, Room only, Wall, Measure, Paste, Paste to level above (greyed until something is copied) |
| Openings | one tile per door and window type: Door, Fire door, Double door, Roller shutter, Gate, Window |
| Objects, Lights, Mission | shown once a later part adds tiles to them |
| View (also Hub > View) | rows: Layout, Ghost other levels, Exploded (left / right: the gap), Cut walls at (A on / off, left / right 0.1 m), Levels shown, Building filter, Small plan, Labels, Level below on the plan |

- The menu remembers the last tab and the tile on each tab while the editor runs. Hub > Settings > "Menu opens on"
  chooses the last tab (default) or always Build.
- **Rule for later parts (ON0a decision 10):** where a brief says "Build wheel", add tiles to the tile menu's matching
  tab (or a new tab in `MENU_TABS`); where it says "Selection wheel", use the Selected tab; where it says "D-pad", use
  this scheme (the card with a selection, levels and tool types without). The tiles are one data list in
  `src/editor/tileMenu.ts` (`menuTiles`); a tab with no tiles is hidden.

### The selection card on the D-pad (ON0a)
With something selected, no tool in hand and nothing grabbed, the card (bottom right) shows the element's rows: **Type
first** (door type, wall kind, room kind), then its own fields.

| Element | Rows |
| --- | --- |
| Door or window | Type, Name, Width, Height, Sill, Along wall, Locked |
| Wall | Type (interior, exterior, boundary, parapet, balustrade), Name, Thickness, Height, Length (moves its end) |
| Room | Type (room kind), Name, Width, Depth (east and north edges; walls follow as set), Access (ring 0-5) |
| Stair, floor hole, ladder | Name, Width, Depth, Climbs (stair); Name, Width, Depth (floor hole); Name, Facing (ladder) |

| Button | Does |
| --- | --- |
| D-pad up / down | pick a row (lit); the first press starts editing the card |
| D-pad left / right | change the lit row by one step: 0.1 m (the object grid) for lengths, one item for lists (wrapping), on / off for flags; held, it repeats and speeds up |
| Left stick (while editing) | as the D-pad; the dot stays put until you leave the card |
| A | on Name: the **name list** (the names already used for that kind) and "Type a name..." (an on-screen keyboard: D-pad or stick moves, A types, Done keeps it, B back); elsewhere: done, back to the dot |
| B | leave the card (the selection stays); B again clears the selection |

- Every change is its own undo step, except that changes to the same row less than 1 s apart join into one (holding
  right on Width is one undo step). A save in between keeps the steps apart.
- A length never goes below one step; a door or window stays on its wall.

### Every menu takes the sticks (ON0a decision 8b)
The hub (tabs, rows, Settings, Levels, Checks, File), the tile menu, the card while editing, the name list and the
keyboard take the left stick as well as the D-pad: a push past half way steps once at once; held, it repeats after
0.35 s and speeds up the longer it is held and the further it is pushed (so left / right on a slider row, such as Stick
speed, the exploded gap or a length, runs faster at full push). The right stick scrolls long lists and the Help page.
One pure helper, `src/editor/stickSteps.ts`; Hub > Settings > Repeat speed scales it.

### The hub (Menu; H on the keyboard opens it on Help)
A full-screen pause-style screen. LB / RB change tabs (wrapping), D-pad up / down picks a row, left / right changes a
value, A does it, B or Menu closes. Mouse: click a tab or a row; Esc or H closes. While it is open nothing else reads the
pad, and any grab is put back first.

| Tab | Holds |
| --- | --- |
| Play | Quick walk at the dot (same as L3 tap; it runs, L3 slows to a walk, B comes back); Walk test as the player (the game, as Tab or L3 held) |
| File | Save (with the unsaved count), Revert to last save (asks first), the change list newest first: A on a line asks "Undo back to here?" and undoes every change down to and including it |
| Checks | Next problem (the line after the last one visited), then the problem lines (fails and warnings; new ones red). A on a line closes the hub and goes there |
| Levels | the level to edit (A edits it), then the Levels panel: presets, picked levels, ghost, exploded and gap, cut height, building filter |
| View | the tile menu's View rows: layout, ghost, exploded and gap, cut walls at, levels shown, building filter, small plan, labels, level below on the plan |
| Settings | plain toggles and sliders, the value shown large: rumble on / off, stick speed (0.5 to 2.0, step 0.25), repeat speed (0.5 to 2.0: held D-pad and stick in every menu and on the card), invert tilt, text size (Large = 1.25x on the pad screen, the hub and the tile menu), Menu opens on (last tab / Build tab), Walls follow rooms (on by default; the tool bar's button for the mouse). Saved with the pad preferences (browser storage, a view preference) |
| Help | a picture of the controller with every button labelled with its building-state action (from the action map), then every binding by group for keys, mouse and pad |

- The unsaved count is the net change since the last save: undo lowers it, and it is 0 exactly when the building is as
  saved (an edit after undoing past the save counts both ways). The change log written on save still lists every undo.

### Screen
- The **dot** shows the position, the snap, what A would do and, while grabbing or drawing, the live size, length or
  move. In Plan only its words show under the plan.
- **Tool bar** (bottom centre): the active tool only (the Y menu picks tools), with its type under it in words (Door:
  Single, Double, Fire door; Room: With walls, Outside walls, Room only). When the selection card shows, the bar centres
  in the width left of it; where that is too narrow the card rises above the bar. Nothing on the pad screen overlaps (e2e
  checks 1280 x 720, 1024 x 600, 932 x 430, also with the menu open and with the card being edited).
- **Selection card** (bottom right): the name, or the kind in words ("Interior wall"), with its code small and grey; its
  first row, size and level; while the D-pad edits it, every row with the lit one between arrows (the dot's words hide).
- **Hint bar** (controller): one line, at most 5 prompts. Nothing selected: "A Select, Y Menu, X Undo, L3 Walk, Menu Hub";
  with a selection: "D-pad Edit, A Grab, Y Menu, B Clear, RB Go to"; editing the card: "D-pad Edit, A Done, Y Menu, B
  Back, RB Go to"; menu open: "D-pad Move, A Pick, LB/RB Tab, B Close"; LB held: "LB + RS Height, LB Slow". What A would take replaces "Grab" ("Stretch east
  edge"). Full words are in the hub's Help. The keyboard keeps the long words.
- **Quick walk**: left stick walks, right stick looks, D-pad up / down changes level (the walk moves to that floor at
  the same spot); it runs by default, L3 toggles a slow walk, L3 held starts the walk test, B ends it. The dot, tool bar and card hide; A does nothing. Shift+Tab does the same from the keyboard.
- **Plan with the pad**: the plan never takes the pad; it shows the dot as a blue ring, the lit part and the ghosts as
  dashed outlines, and pans to keep the dot in view. The mouse still pans, zooms and edits the plan as before.
- **Side panel**: Selected > Properties takes the pad: D-pad (or left stick) up / down picks a field, left / right changes
  a number by one grid step (LB: fine) or steps a list, A presses a button or opens a text field, B leaves.
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

## Rooms and their walls (ED3-3a)
- A room edge is a wall's centre line (every wall in the campus file sits on one). A wall counts as on an edge when it is
  on the same level, parallel, within half its thickness of the edge and overlapping it.
- **Room tool**: "Room with walls" (default) adds an interior wall (0.3 m) on every part of the four sides that no wall
  covers yet; "Room with outside walls" makes them exterior (0.45 m); "Room only" makes none. Thicknesses come from
  `scripts/kestrel/facts.json` (`rules.wallInterior`, `rules.wallExterior`). Walls already there are reused, never
  doubled; gaps under 0.5 m are skipped; height is the level's. The room and its walls are one undo step.
- **Walls follow rooms** (on by default): stretching a side moves the walls on it and stretches the walls that end on
  it; a wall running past the side's ends is cut there first (up to three walls, the middle one moves; a door across a
  cut point refuses the stretch: "A door is in the way at the corner"). A room lying wholly along the moved wall
  resizes with it (A's words name it: "Stretch east edge (also resizes Store)"). Moving a room takes the walls only it
  lies on; shared walls stay ("Move (2 shared walls stay)"). Doors keep their distance from the nearer wall end. A room
  turned with RB leaves its walls. Every room move, stretch or split refreshes the rooms either side of the doors it
  touched. One undo step for all of it.
- **Split** (the Y menu's Selected tab, rooms): a line across the room through the dot, across its longer side; RB turns it, A
  places it, B cancels (mouse: click, Esc). At least 1 m each side. The wall follows the room tool's option; the room
  keeps its name on the west or south part, the other part is "<name> 2" with the same kind and access level.
- Tests run the editor server with `KESTREL_EDITOR_SANDBOX=<folder>`: it loads and saves a copy there, never
  `docs/kestrel`. The walk test's draft is served only to this PC.

## What it does not do yet (ED2 parts B-H)
- The tile menu's Objects, Lights and Mission tabs are empty (hidden) until the later parts add tiles. The card has no
  Type row for stairs, ladders and floor holes. The on-screen keyboard has no lower-case or symbol page (words start with
  a capital, the rest is small).
- Wall chains, door centring, live sizes and distances, guide lines (ED3-3b); clickable problems, search (Part D).
- Add, reshape or delete stairs, ladders and floor holes beyond moving them; no new levels; renaming ids (Part E).
- Lighting preview, props, guards and routes.
- Quick walk up stairs: change level with Page Up / Page Down (the walk test climbs stairs and ladders for real).
- On the plan, the building filter hides rooms, walls and openings; their name labels stay.
- Corner joins are drawn for the editor's 3D, the quick walk and the walk test; the plan images (`plans.mjs`) keep their own
  `wallExtend` drawing. Joins assume straight walls; an angled join is closed but not mitred. Gaps are listed in the
  editor only, not by `check.mjs`.

## Files
| File | Role |
| --- | --- |
| `editor.html`, `src/editor/main.ts` | page, tools, panels, plan view |
| `src/editor/scene3d.ts`, `src/editor/controls.ts` | 3D massing, picking, handles; fly and walk camera |
| `src/editor/model.ts`, `src/editor/ops.ts`, `src/editor/geometry.ts` | data, undo and the journal; new elements and change words; wall cuts, snapping, walk collision, corner joins, gaps and Close gap (Babylon-free, `tests/editor/`, `wallJoins.test.ts`) |
| `src/editor/padControl.ts`, `src/editor/tileMenuView.ts` | controller editing: the dot and its magnet, edge-aware grab, ghosts, tool bar, the selection card on the D-pad, the tile menu's frame and actions, View items, quick walk, plan marker, side panel, rumble; the tile menu and the name picker on screen |
| `src/editor/tileMenu.ts`, `src/editor/card.ts`, `src/editor/stickSteps.ts` | the tile menu's tabs, tiles (one data list), navigation and memory; the card's rows and steps, the name list and keyboard; stick and D-pad to menu steps (pure, `tests/editor/tileMenu.test.ts`, `card.test.ts`) |
| `src/editor/grab.ts`, `src/editor/hub.ts`, `src/editor/hubView.ts` | which part A takes, the magnet search and their constants; the hub's tabs, rows, settings and help labels (pure, `tests/editor/grab.test.ts`, `hub.test.ts`); the hub on screen |
| `src/editor/orbit.ts` | the pad's builder camera: the ORBIT feel table, dead zone and curve, eased pan / orbit / tilt / zoom / height, clamps, eases, top-down swap (pure, `tests/editor/orbit.test.ts`) |
| `src/editor/pad.ts` | pad reading (edges, taps and holds, D-pad repeat, button names) (Babylon-free, `tests/editor/editorPad.test.ts`) |
| `src/editor/actions.ts`, `src/editor/visibility.ts`, `src/editor/draft.ts` | the action map (keys, help, hint bar); which levels and buildings are shown, ghosted or hidden, and the exploded lift; unsaved drafts in IndexedDB (Babylon-free, `tests/editor/editorV2.test.ts`) |
| `src/editor/roomWalls.ts` | rooms and their walls: walls on an edge, the walls a new room needs, linked edits, Split, A's linked words (pure, `tests/editor/roomWalls.test.ts`) |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load, plan (one level, SVG), checks, save, the walk test's draft; `KESTREL_EDITOR_SANDBOX` for tests |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
