# Kestrel level editor (v2, Parts A, C and E)

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
| 1 - 5 | tools: select, room (with walls, outside walls or room only, from the list beside it), wall, door (type from the list beside it), window (type from the list beside it, ON9) |
| 6, 7, 8 | Stair (type from the list beside it), Ladder, Floor hole (kind from the list beside it) (ON2) |
| Space > Build: Roof tiles | the Roof tool (ON10): drag out the outline, or one click on a building to take its footprint; type from its tile |
| Click, drag | select and move; drag the orange handles to resize a room, stretch a wall or widen an opening |
| Wall tool: click, click, ... | a wall chain (ON1): each click ends a wall and starts the next from its end; a click on the first point closes it; Esc or a right click ends it; Backspace removes the last wall |
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
| A | the tool's action: select what the dot is on; on the selection, take the part the dot names (below); drawing tools start and finish (Wall: each A ends a wall and starts the next, a chain); door and window tools place one |
| B | cancel a grab or a drawing; else leave the card; else put the tool down; else clear the selection. Never deletes |
| X / X held | undo / redo |
| Y (tap) | the **tile menu** opens; Y again closes it (below) |
| D-pad, something selected | the **selection card** (below): up / down picks a row, left / right changes it |
| D-pad up / down, nothing selected | level up / down; the dot and camera rise or drop with it |
| D-pad left / right, a tool in hand | the tool's type: door type (Door), walls option (Room), stair type (Stair), hole kind (Floor hole). Without a tool: nothing |
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
| Selected (first, only with a selection) | Move, Duplicate, Rotate 90 (rooms, walls, stairs, ladders), Copy and Copy to level above (rooms, walls, floor holes), Split (rooms), Fit and Turn climb 90 (stairs), Rename id, Change type (lights the card's Type row), Properties (the full side panel), Delete |
| Build | Select, Room with walls, Room with outside walls, Room only, Wall, Stair: Main dogleg, Stair: Fire dogleg, Straight stair, Ladder, Floor hole, Measure, Paste, Paste to level above (greyed until something is copied) |
| Openings | one tile per door and window type (ON9): Single door, Fire door, Double door, Glass swing door, Sliding glass door (automatic), Sliding glass door (card), Sliding door (manual), Roller shutter, Gate, Sliding gate, Hatch, Arch (no leaf), Fixed window, Opening window (top hung), Frosted fixed window, Louvre window, Roof light |
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
| Door or window | Type (flips through doors only, or windows only), Name, Width, Height, Sill, Along wall, then only the settings the type has (ON9, below) |
| Wall | Type (interior, exterior, boundary, parapet, balustrade, glass partition), Name, Thickness, Height, Length (moves its end); a glass partition adds Glass, Blinds, Breakable |
| Room | Type (room kind), Name, Width, Depth (east and north edges; walls follow as set), Access (ring 0-5) |
| Stair | Type (Main dogleg, Fire dogleg, Straight), Name, Width, Depth, Climbs, To level (risers follow); the foot says whether it fits ("Fits: 25 risers", or "Needs 1.42 m more length for 25 risers") |
| Floor hole, ladder | Type (stair well, lift shaft, riser, hatch, roof light), Name, Width, Depth (floor hole); Name, Facing, To level (ladder) |
| Every card | ends with **Id**: A opens the keyboard (capitals kept); Done renames it and every reference (ON2) |

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
- A card longer than 9 rows (a door has up to 16) shows 9 at a time round the lit row, with "N more" above or below.

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
| Levels | the level to edit (A edits it); the level rows (ON2, below): storey height, add above / below, duplicate one storey up, rename, rename id, delete, Edit building outlines; then the Levels shown panel: presets, picked levels, ghost, exploded and gap, cut height, building filter |
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
- **Doors and windows (ON9)**: single, fire and double doors build as the game's hinged doors (hinge side, swing side and
  lock from the data; a double is two half leaves); every window is the game's glass pane (breakable unless set not to);
  sliding and glass doors, gates, hatches and arches stay open gaps, and the status strip says "Sliding and glass doors
  open in the game from stage DR" when the campus has one.
- **Not yet**: sliding and glass doors, readers, one-way doors and alarms (stage DR), pipe anchors on the
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

## Wall chains, door centring, live sizes, guide lines (ON1, ED3-3b)
- **Wall chains** (Wall tool): A starts a wall; each next A ends it and starts the next from that end; A on the chain's
  first point closes the loop and ends it; B ends the chain (the wall being drawn is dropped); X removes the last
  finished wall (the one being drawn starts again from its start). Mouse: click, click, ... (a drag-and-release also ends
  a wall and goes on); Esc or a right click ends it; Backspace removes the last. The whole chain is one undo step:
  "Added 4 walls (a chain, 18 m)" (one wall keeps the old words). Segments copy the first wall's kind and thickness (the
  Wall tool copies the last wall selected; otherwise `wallInterior` from facts.json). Hint bar while drawing a wall:
  A Next wall, X Remove last, B End chain, LB Fine.
- **Door centring**: the Door and Window ghost (and a placed or slid opening) snaps its centre to the middle of the clear
  run between the two nearest cross walls (walls meeting this one, or its ends) when the dot is within 0.5 m of that
  middle and it fits; the dot says "Centred". LB held (Ctrl with the mouse) turns it off.
- **Door distances**: while placing or sliding a door or window, the dot shows the clear distance from each side to the
  nearest cross wall face (or wall end), "1.2 m | 2.4 m", and the plan draws each as a dashed line with its figure.
- **Live sizes** while drawing or dragging: a room "4 x 3 m, 12 m2" (a stretched edge adds "2.4 m to the next wall": the
  nearest parallel wall's face the way the edge moves); a wall its length and "2.7 m to the parallel wall" (the nearest
  parallel wall on its level within 10 m that overlaps it, face to face); while chaining, the chain's count and total.
  Shown at the dot and as dashed text on the plan; with the mouse in the corner of the 3D view and on the plan. One pure
  function per element feeds both (`liveSizes.ts`).
- **Guide lines**: while the magnet holds a snap, a thin line runs along the snapped wall line or room edge (3 m past its
  ends), or through the snapped point along x and z: a thin box on the floor in 3D, a fine dashed line on the plan.
- **Smart snapping**: room edges (drawing or stretching) snap to wall centre lines, wall faces and other room edges on the
  level within 0.3 m; the dot also pulls onto room edges within 0.3 m (wall ends, wall lines, room corners and opening
  centres as before). A D-pad nudge, LB or Ctrl skips it. The distances are one table, `SNAP` in `grab.ts`.

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

## Stairs, ladders, floor holes, levels, renaming (ON2, ED2 Part E)
Everything that joins or makes floors can be drawn and changed, so a building can be made from nothing.

**Stair tool** (Y menu > Build: Stair: Main dogleg, Stair: Fire dogleg, Straight stair; key 6 with the type list):
1. A (click) at the start corner. The dot (or pointer) points the climb: the larger of its east-west and north-south
   offsets from the corner is the climbing direction, the other picks the side the stair goes.
2. The smallest legal stair to the level above follows the dot, drawn in 3D as real flights and a landing, with its
   words at the dot: "Main dogleg, Ground to First: 25 risers of 0.168 m, going 0.285 m, 2 flights (13 + 12), landing
   2 m; 3.7 x 5.5 m, climbs north". A (click) holds the proposal still; A (click) again accepts it, B (Esc) cancels.
- The sizes are the A11 rule (`check.mjs`), worked out by one shared function (`src/world/maps/stairs.ts`
  `stairSize`) from `scripts/kestrel/facts.json` (`stair.riserHeight`, `going`, `maxRisersPerFlight`, `midLanding`,
  `fireLanding`, `fireWidth`, `mainWidth`): 25 risers for a 4.2 m storey (progress.md Decisions), a dogleg twice the
  flight width wide and `(risers / 2 rounded up - 1) x going + landing` long (2 m main, 1.3 m fire). Rounded up to the
  0.1 m grid.
- The **stairwell** (a `stairwell` floor hole on the to-level, same rect) is made, moved, resized, relevelled and
  deleted with its stair in the same undo step, however the stair changes (grab, handles, card, panel, delete, rename).
- A selected stair: the card's foot and the side panel say whether it fits and by how much it does not ("Needs 1.42 m
  more length for 25 risers"). **Fit** (Selected tab, or the panel's button) resizes it to the smallest legal rect from
  the corner it was drawn from (the foot edge and the west or south side stay) and sets the rule's risers.
- Handles: the four edges (stretch), and the orange **arrow** handle a third of the way up the climb (mouse: a click turns
  the climb 90 degrees, the rect stays; pad: the card's Climbs row or Selected > Turn climb 90). RB while grabbing turns
  the whole stair about the dot, as before.
- The 3D view and the walk test draw stairs from the same layout (`stairLayout`): a dogleg's flights split 13 + 12, a
  straight run of more than 18 risers gets a mid landing.

**Ladder tool** (Build > Ladder; key 7): A (click) on or near a wall face: the foot stands off the wall by half its
thickness and half the ladder's width (`ladder.width`), facing the wall; on open floor it stands at the dot facing north.
It climbs from the editing level to the level above (the card's To level row or the panel changes it), stands in the
room it is in, and its words give the climb against the reach facts: "climbs 4.2 m to First, beyond jump-grab reach
(3.1 m): the ladder is the way up" (within `reach.grabMax` 2.7 m it says a ladder is optional).

**Floor hole tool** (Build > Floor hole; key 8, kind from the list or D-pad left / right): drag a rectangle (A, A) on
the editing level; kinds stairwell, lift shaft, riser, hatch, roof light. Holes cut the room floors in the editor's 3D
(you see the level below through them) and in the walk test (the converter already cut voids; unchanged).

**Levels panel** (hub > Levels; mouse: click the rows, - / + on the stepped rows). Rows below the level list, for the
editing level:
| Row | Does |
| --- | --- |
| Storey height of ... | left / right (or - / +) sets a new height in 0.1 m steps, A applies it: every level that started at or above the old storey top moves by the difference; "47 walls were 4.2 m: stretch to 4.5 m?" (A yes, B no) stretches the walls that were exactly the old height; stairs whose rise changed get the rule's risers. One undo step, in words |
| Add a level above / below | a name from the list (Ground, First, Second, Third, Roof, Basement, Mezzanine) or the keyboard; storey height and footprint from the editing level; above: the levels at or above it move up a storey; below: the levels under it move down. The id is a free capital from the name (Roof Plant: O) |
| Duplicate ... one storey up | a new level above (as Add) with the level's rooms, walls, doors and windows, objects and floor holes copied with new ids (the level letter swapped: G-FRONT to S-FRONT, WG003 to WS003; else "-S" added) |
| Rename ... / Rename id ... | the level's name (list or keyboard); its id (keyboard), every reference following |
| Delete ... | asks first, listing what goes ("With it go 12 rooms, 40 walls, ..."): its rooms, walls with their doors and windows, objects, floor holes, the stairs and ladders from or to it (and the wells of stairs from it). Levels above keep their floors |
| Edit building outlines | on: each building's footprint (orange) and the site (blue) are drawn in 3D, and each building's four edges are rows (left / right moves an edge 0.1 m) with its size and the RULES 2 limits (site 110 x 80 m, building 48 x 30 m, facts.json `rules`); over a limit, outside the site or overlapping shows red lines. Warned, never blocked |

**Renaming ids** (the card's Id row, Selected > Rename id, the side panel's Id field, Levels > Rename id): every
reference in the file changes in the same edit: a wall's openings (`wall`), a room's openings (`between`) and ladders
(`room`), a level's rooms, walls, floor holes, objects (`level`) and stairs and ladders (`from`, `to`). A taken or empty
id is refused; one out of the file's style (capitals, digits and hyphens; a level: one capital) is kept with a warning.
Each rename is its own change-log line: "Renamed WG-NEW1 to WG015 (3 references updated)".

## Doors, windows and glass (ON9)
Every door and window has a **type** from one catalogue (`src/editor/openingCatalogue.ts`; sizes from the facts' door
numbers or a typical product, each with its source) and only the settings that type has. New ones start with realistic
defaults; files written before ON9 show their type's defaults until a setting is changed.

| Type | Settings on the card |
| --- | --- |
| Single door, Fire door | Hinge, Swings into, One-way, Locked, Reader, Card level (card readers only), Self-closing, Alarmed, Vision panel |
| Double door | as a single door, no Hinge |
| Glass swing door | Hinge, Swings into, One-way, Locked, Reader, Card level, Self-closing, Alarmed, Glass, Breakable |
| Sliding glass door (automatic or card) | Slides to, One-way, Locked, Reader, Card level, Alarmed, Glass, Breakable |
| Sliding door (manual) | Slides to, Locked, Reader, Card level, Alarmed, Vision panel |
| Roller shutter, Sliding gate | Locked, Reader, Card level, Alarmed (a sliding gate also Slides to) |
| Gate | Hinge, Swings into, One-way, Locked, Reader, Card level, Self-closing, Alarmed |
| Hatch | Hinge, Swings into, Locked, Alarmed |
| Arch (no leaf) | none |
| Every window type | Glass (clear, frosted, wired, tinted), Blinds (none, open, half, closed), Breakable, Opens |

- **Defaults**: fire doors self-closing, alarmed and one-way out (free from the stair, else from the inside, swinging
  the way people escape); double and glass doors self-closing; a card sliding door locked with a card reader at the
  higher room's access level; an automatic sliding door has no reader; a roller shutter a key switch; frosted windows
  frosted; opening and louvre windows open.
- **Words**: Hinge and Slides to are left or right as seen standing on the side the door opens away from, facing it.
  Swings into and One-way name the rooms (Outside for none). Reader: None, Card, Card and PIN, Keypad, Key switch.
  Card level 0-5 (S0 2.3).
- **Editing**: the D-pad on the card (Type first; the Type row flips doors with doors and windows with windows and
  gives the new type its defaults, keeping the hinge, swing, one-way and card level; a fire door keeps its own swing and
  one-way); with the mouse, the side panel (Properties) shows the same settings with ‹ › buttons and a Type list. The
  Window tool has its own type list beside it (D-pad left / right with the tool in hand flips it, as for doors).
- **3D**: the leaf as solid, glass (clear, milky frosted, wired, tinted) or mesh; a dark hinge post, the swing arc and the
  open leaf on the floor; a sliding door's track running past its stack side and an arrow toward it; a reader (green:
  card) or a lock (yellow) at handle height on both faces; a green one-way arrow from the free side through the door; a
  door with a card reader and a level shows a small plate over it in the plans' level colour; blinds as a pale panel
  (closed: all, half: the top half, open: a strip at the head). A glass partition is see-through, with its blinds.
- **Plan**: swing arcs on the hinge side, sliding leaves offset with an arrow toward the stack, glass hatching on glass
  leaves, windows and glass partitions (denser when frosted).
- **Checks**: no check changed. A29 and SC02 also read the new door types as passable, a door with One-way as exit-only
  and one with its own card reader and level as a reader door (`check.mjs`).
- **Frosted glass and closed blinds** block sight but pass light (bible 5.1). The editor shows it; the game has no such
  state yet: in the game from stage DR.

## Roofs (ON10)
Every roof is one record in `roofs[]` (schema.md section 2): an axis-aligned outline at the wall line, the eaves height
(`base`) there, a type and only that type's settings. The geometry is one pure module, `src/world/maps/kestrelRoofs.ts`,
used by the editor's 3D, the plan (`plans.mjs` imports it directly) and the walk test.

**Roof tool** (Y menu > Build: Roof: Flat, Mono-pitch (skillion), Gable, Hip, Sawtooth, Curved (barrel); with the tool in
hand D-pad left / right changes the type, as for stairs):
1. A at one corner, A at the other (mouse: drag): the roof follows the dot, its eaves on the walls under it.
2. Or A twice on the same spot (mouse: one click): the roof takes the footprint of the building under the dot; outside the
   buildings, the room under it grown to the outside faces of its walls (the gatehouse). The reticle names what it takes.
- **Eaves height default**: the wall top that most of the wall length under the outline reaches (interior, exterior and
  glass walls on this level or below; a bulkhead on a roof does not lift it), else the top of the level (floor + storey
  height). The card's Eaves height row changes it.
- **Defaults** (`src/editor/roofGeometry.ts` `ROOF_TYPES`, each with its source): flat membrane, falls 1 degree to the
  south, parapet 1.1 m (facts `rules.parapet`) or upstand 0.3 m (facts `roof.upstand`); mono-pitch metal deck 10 degrees,
  high side north; gable and hip tile 25 degrees, 0.5 m eaves; sawtooth metal deck 25 degrees, 6 m teeth, glass facing
  south (away from the sun in Australia); curved metal deck, rise 1.5 m. Pitched types have a gutter and downpipes.

| Type | Settings on the card (after Type, Name, Width, Depth, Eaves height) |
| --- | --- |
| Flat | Fall (1-2 degrees, facts `roof.fallMin` / `fallMax`), Falls to, Edge (parapet or upstand), Parapet height or Upstand height |
| Mono-pitch | Pitch, High side |
| Gable | Pitch, Ridge (east-west or north-south) |
| Hip | Pitch (hips on all four sides; the ridge runs along the longer side, as long as the long side less the short side) |
| Sawtooth | Pitch, Tooth width (teeth = span / width, rounded), Glass faces |
| Curved | Rise, Ridge (the barrel's axis) |
| Every type | Overhang (0-1.0 m, facts `roof.overhangMax`), Fascia depth, Material (metal deck, concrete, membrane, tile; sets its colour), Colour, Gutter, Downpipes (with a gutter) |

- Pitch and fall step 1 degree, lengths 0.1 m. **Type** flips keep the pitch, overhang, trim and material between pitched
  types; to or from Flat the new type's defaults apply. Mouse: the side panel has a Type list, the eaves height and the
  outline as fields and every setting with ‹ › buttons.
- **Words**: the card's foot and the panel give the ridge and eaves heights (hip: the ridge length; sawtooth: the teeth)
  and the walking verdict from the game's own slope limit (`player.maxSlope` 50 degrees, the controller's
  `maxSlopeCosine`; a test keeps them equal): "walkable up to the game limit of 50 degrees" or "too steep to walk (game
  limit 50 degrees)". A flat roof over roof rooms is checked against that level's floor: "Top 8.6 m is 0.2 m above the
  Roof floor (8.4 m)" in red.
- **Overhang** carries the slope past the wall line: the eaves drop by overhang x tan(pitch), the ridge stays.
- **3D**: the planes, the end walls under them (gable ends, a skillion's cheeks and high wall, barrel ends), sawtooth
  glass, parapets or upstands, fascia and barge boards, gutters along the eaves and downpipes from their ends to the
  ground. Handles sit at the eaves. With Cut walls at on, a roof above the cut is hidden (to see under the gatehouse roof).
- **Plan** (`plans.mjs`, the level the roof was drawn on): the overhang dashed, the wall line thin, ridge and hip lines,
  an arrow down each slope (the fall on a flat roof), the ridge and eaves heights.
- **Walk test**: every roof as the game's boxes (`kestrel.ts`): a flat roof is a slab the player walks on with its
  parapets or upstands; a sloped plane is strips tilted to the pitch (0.5 m, `ROOF_BUILD.strip`): within the game's slope
  limit the player stands on it, steeper the controller slides off it; end walls as upright pieces; sawtooth glass as the
  game's glass panes; trim, gutters and downpipes as boxes. No player or physics change. They are ordinary boxes, so the
  moon and sky bakes see them as the game does (bible 5.1). Roof lights (floor holes of kind roof light on the roof's
  level or at its height) cut through. A flat roof whose top already has level floors under it (level R's roof rooms) adds
  no second slab, and no parapet on an edge that already has a parapet wall.

## What it does not do yet (ED2 parts B-H)
- ON10: outlines are rectangles along x and z (no L-shapes or angled roofs); one roof per outline, no valleys between
  roofs. A flat roof's fall is drawn, not built (level in 3D and in the walk test). Roof lights cut the walk test's roof
  but are not drawn as holes in the editor's 3D roof planes. Gutters and downpipes are roof settings drawn as boxes; ON5
  judges them as climbing pieces. Roof edges are not checked by `check.mjs`. Hip roofs always run their ridge along the
  longer side.
- ON9: the door and glass settings are data and drawing only; the game builds them from stage DR: sliding and glass
  doors, readers and card levels, one-way (push bar) doors, closers, alarms, vision panels, and frosted glass and closed
  blinds that block sight but pass light (in the game from stage DR; the walk test draws a glass partition as a solid wall
  and a frosted pane as clear). Hatches sit in walls; a floor or ceiling hatch is still a Floor hole. A roof light is a
  high window in a wall; a glazed hole in a roof slab is the Floor hole tool's Roof light. The card level does not change
  the room's access level (the Checks show A29 as before).
- The tile menu's Objects, Lights and Mission tabs are empty (hidden) until the later parts add tiles. The on-screen
  keyboard has no lower-case or symbol page (words start with a capital, the rest is small; ids keep capitals).
- ON2: building outlines are edited as edge rows on the Levels tab with the outlines drawn in 3D, not dragged on a site
  plan; the plan images do not draw them. Deleting a level leaves the levels above where they are. Free text that names an
  id (a hole's `reason`, the documents) is not renamed. Renaming the ground level G makes the walk test start on the level
  nearest floor 0. Services (pipe runs) keep their heights when a storey height changes. Duplicate does not copy stairs or
  ladders (they join two levels).
- Clickable problems, search (Part D). With the mouse, wall ends do not snap to other walls (the pad's magnet does);
  a wall crossing another (an X, no end on it) is not a cross wall for door centring; live sizes measure straight walls
  along x or z for room edges (angled walls are skipped).
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
| `src/editor/grab.ts`, `src/editor/hub.ts`, `src/editor/hubView.ts` | which part A takes, the magnet search, guide lines and their constants (`GRAB`, `MAGNET`, `SNAP`); the hub's tabs, rows, settings and help labels (pure, `tests/editor/grab.test.ts`, `hub.test.ts`); the hub on screen |
| `src/editor/orbit.ts` | the pad's builder camera: the ORBIT feel table, dead zone and curve, eased pan / orbit / tilt / zoom / height, clamps, eases, top-down swap (pure, `tests/editor/orbit.test.ts`) |
| `src/editor/pad.ts` | pad reading (edges, taps and holds, D-pad repeat, button names) (Babylon-free, `tests/editor/editorPad.test.ts`) |
| `src/editor/actions.ts`, `src/editor/visibility.ts`, `src/editor/draft.ts` | the action map (keys, help, hint bar); which levels and buildings are shown, ghosted or hidden, and the exploded lift; unsaved drafts in IndexedDB (Babylon-free, `tests/editor/editorV2.test.ts`) |
| `src/editor/liveSizes.ts`, `src/editor/chain.ts` | live sizes and distances: clear runs between cross walls, door centring and side distances, the nearest parallel wall, room sizes, room edge snapping; wall chains (pure, `tests/editor/liveSizes.test.ts`, `chain.test.ts`) |
| `src/editor/roomWalls.ts` | rooms and their walls: walls on an edge, the walls a new room needs, linked edits, Split, A's linked words (pure, `tests/editor/roomWalls.test.ts`) |
| `src/editor/vertical.ts`, `src/editor/levels.ts` | ON2: the stair proposal, fit and Fit, the stairwell link, ladders, floor holes; add, duplicate, delete levels, storey heights, renaming ids with every reference, building outlines and the RULES 2 warnings (pure, `tests/editor/vertical.test.ts`) |
| `src/editor/openingCatalogue.ts` | ON9: every door and window type (name, family, leaf, size with its source, the settings it has), realistic defaults per type, the settings in words and their steps, a type flip within the family (pure, `tests/editor/openingCatalogue.test.ts`) |
| `src/world/maps/kestrelDoors.ts` | ON9: the one copy of the door side maths (swing side, hinge or stack end), shared by the editor and the walk test, and the walk test's game doors and panes (pure) |
| `src/editor/roofGeometry.ts` | ON10: the roof types, settings and defaults with sources, a new roof, the footprint under the dot, the default eaves height, the card's rows and steps, the type flip, the steepness flag and the roof level check (pure, `tests/editor/roofGeometry.test.ts`) |
| `src/world/maps/kestrelRoofs.ts` | ON10: the one copy of the roof geometry (planes, edges, ridges, hips, plan marks, the walk test's boxes and panes), shared by the editor, the walk test and `plans.mjs` (pure, import-free) |
| `src/world/maps/stairs.ts` | the one copy of the stair maths, shared by the editor and the walk test: `stairSize` (A11 sizing), `stairSplit`, `stairLayout` (flights and landings) (pure; `kestrelGeo.ts` re-exports `stairLayout`) |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load, plan (one level, SVG), checks, save, the walk test's draft; `KESTREL_EDITOR_SANDBOX` for tests |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
