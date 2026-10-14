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
| Page Up / Page Down, Editing list | change the editing level (walking: you stay at the same spot on the new floor). With something selected or held that has a height (objects, lamps, signs, security devices, climb pieces, doors and windows, roofs): raise / lower it one grid step, Shift 1 m, one undo step each (fix-up 2026-10-14); a room or wall stays on its level, so the level changes as before |
| 1 - 5 | tools: select, room (with walls, outside walls or room only, from the list beside it), wall, door (type from the list beside it), window (type from the list beside it, ON9) |
| 6, 7, 8 | Stair (type from the list beside it), Ladder, Floor hole (kind from the list beside it) (ON2) |
| Space > Build: Roof tiles | the Roof tool (ON10): drag out the outline, or one click on a building to take its footprint; type from its tile |
| 9, R | the Object tool (ON4): click places the preset from the list beside it (a row: click the start, click the end); R turns the ghost, or the selected object, 90 degrees; with the Stamp tool (ON11, Space > Presets) R turns the preset and a click stamps it |
| Click, drag | select and move; drag the orange handles to resize a room, stretch a wall or widen an opening, resize an object by a corner (the opposite one stays), move a drawn piece's, strip light's or beam's end; a single centre marker moves the rest. Handles keep 12 px on screen (facts `render.handlePx`) |
| Wheel while dragging | raise / lower what is held one grid step (Shift: 1 m); in Resize taller / shorter (fix-up 2026-10-14) |
| T while dragging | Move or Resize: Resize keeps the corner (or end) opposite the pointer fixed (fix-up 2026-10-14) |
| Wall tool: click, click, ... | a wall chain (ON1): each click ends a wall and starts the next from its end; a click on the first point closes it; Esc or a right click ends it; Backspace removes the last wall |
| Ctrl while dragging | the object grid (0.1 m) when Settings > Grid is coarser; the grid is 0.1 m by default (ON0b) |
| Arrow keys | nudge the selection one grid step, 0.1 m by default (Shift: ten steps) |
| Delete, Ctrl+D | delete (a wall takes its doors and windows), duplicate |
| F | go to the selection |
| Ctrl+Z, Ctrl+Y (or Ctrl+Shift+Z) | undo, redo |
| Ctrl+S | save: first a summary of what will be written (ON3), then the file, the 7 plan images and the change log |
| Ctrl+K | **Find** a room, stair or object by name and go there (ON3) |
| Shift+click | add to the selection or take out: several things move, copy and delete together (ON3) |
| L, K | room names floating in 3D; the scale figure at the dot (ON3) |
| J | the stealth view (ON4): objects tinted by what they give the player |
| N | the finish view (ON5): floors tinted by floor finish, with a legend of how loud footsteps are |
| Space > Climb tiles | the Climb tool (ON5): a climb piece or exterior feature; click places it (a drawn one: click the start, click the end) |
| Y, B | the light view (ON7): the 3D scene at night, lit by the game's own light bake of the editing level; the darkness map: the floor by the light meter's band (both on Hub > View too) |
| Space > Lights > Guard view | the guard view tester (ON7): a click places a guard eye facing the way the camera looks; R turns the last eye 45 degrees; Esc or Delete removes it (Esc again leaves the tool) |
| Space > Mission tiles | the Mission tools (ON8): Guard (a click places a guard, then clicks add its patrol stops; a click on the first stop closes the loop; R turns the last stop 45 degrees, + / - its wait, Backspace removes it, Page Up / Down the level of the next stop, Esc ends), Insertion, Extraction (click a corner, click the far corner), Objective, Intel, Checkpoint, Hide |
| Space > Security tiles | the Security tools (ON12): Fixed camera, Pan camera (a click on a wall face mounts it facing out, elsewhere under the ceiling facing the way the view looks; R turns that ceiling ghost 45 degrees), Card reader and Keypad (a click by a door binds it to the door; on a wall face alone), Motion sensor, Beam (click one end, click the other); the card's rows in the side panel step them; Space > View > Security coverage |
| Space > Build > Crawl space | the Crawl space tool (ON13): click one end, click the other; a click at the selected crawl's end goes on with another leg; Esc puts the tool down. A room's side panel: Select the ceiling (its type, height and hatches step with the arrows); Space > View > Ceiling voids |
| Space > Selected: Mirror, Align, Evenly space, Array | ON14: mirror the selection east-west or north-south about its centre, or about a line (click two points on it); align a set by an edge or centre; evenly space three or more; Array: the mouse sets the spacing, Left / Right arrows the count, a click makes the copies; Esc stops |
| Space > Objects > Signs | the Sign tool (ON14): a click on a wall face fixes the sign there; away from walls a wayfinding sign hangs under the ceiling facing back along the view; the side panel sets its text, arrow, height and width. A door's side panel: Name plate (its text) |
| 0, R | the Light tool (ON6): click places the fitting from the list beside it (a strip: click the start, click the end; R turns the ghost); Switch in the list: click a wall face for a switch, then click lamps to put them on it, Esc ends |
| Ctrl+1 - 9, Alt+1 - 9 | save the camera as bookmark 1-9; go to bookmark 1-9 (ON3) |
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
| LT / RT | zoom out / in (4 to 140 m); in Plan only they zoom the plan. While holding something they raise and lower it instead (below) |
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
| RT / LT | raise / lower (analogue, 1 m/s at a full trigger, snapped to 0.1 m; LB held a quarter speed). Objects (base), lamps, signs, security devices, climb pieces, doors and windows (sill, kept inside the wall), roofs (base). A room, wall, stair or ladder says "Stays on its level". The triggers zoom again once it is dropped (fix-up 2026-10-14) |
| Y | **Move / Resize**. A small tag by the dot says which, with the height ("Resize, base 0.5 m, 1.2 m high"). Resize takes the corner (rooms, stairs, floor holes, roofs, objects) or end (walls, doors and windows, drawn pieces, strip lights, beams) nearest the dot; the opposite one stays put. The left stick and the D-pad (0.1 m) move it; RT / LT change the height (objects, walls, doors and windows, climb pieces). Min sizes and the room rules (walls follow, reuse) hold; Y again goes back to Move from where it is. The drop is one undo step (fix-up 2026-10-14) |
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
A full-width panel along the bottom of the views, as tall as its tiles need and at most about a third of the window
(then it scrolls; fix-up 2026-10-14). The 3D view stays visible above it, and the dot, tool bar and card wait until it
closes. A row of tabs centred over a centred grid of tiles: a letter, the name, and under it two to five words of what
it does. Every tile is one size (2026-10-14, Michael): 292 px wide (216 px on phones and small windows), the width the
longest names need capped so four columns fit at 1280 (932 on the small layout); long names wrap inside the tile. The
height is the tallest tile any grid tab can show, so every tab's tiles match. At most 4 columns, fewer on a narrow panel
(never stretched to the edges, never overflowing); a tab with fewer tiles than columns draws fewer columns, still
centred. The D-pad steps across the columns as drawn. The View tab's list is as wide as the grid would be. A group tile
(Objects, Presets, Lights) shows "shown" as a small marker. Tile words never name buttons: the hint bar says what A does.

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
| Selected (first, only with a selection) | With several things selected (ON3): Move N things, Copy, Copy to level above, Delete N things. With one: Move, Duplicate, Rotate 90 (rooms, walls, stairs, ladders), Copy and Copy to level above (rooms, walls, floor holes), Split and Floor finish (rooms, ON5: lights the card's Floor finish row), Ceiling (rooms, ON13: selects the room's ceiling) and Room (a ceiling: back to its room; a ceiling has no Move, Duplicate or Rename id), Fit and Turn climb 90 (stairs), Save as preset (rooms, and a set: ON11), Rename id, Change type (lights the card's Type row), Properties (the full side panel), Delete |
| Build | Select, Room with walls, Room with outside walls, Room only, Wall, Stair: Main dogleg, Stair: Fire dogleg, Straight stair, Ladder, Floor hole, Crawl space (ON13), the Roof types (ON10), Measure, Paste, Paste to level above (greyed until something is copied) |
| Openings | one tile per door and window type (ON9): Single door, Fire door, Double door, Glass swing door, Sliding glass door (automatic), Sliding glass door (card), Sliding door (manual), Roller shutter, Gate, Sliding gate, Hatch, Arch (no leaf), Fixed window, Opening window (top hung), Frosted fixed window, Louvre window, Roof light |
| Objects | the ON4 object groups and presets (below) |
| Presets (ON11) | Start set, Module kit, Mine (A shows that source, the menu stays), then its presets (A picks the Stamp tool); under Mine also Rename and Delete for the preset last picked (below) |
| Climb (ON5) | Downpipe, Horizontal pipe, Ledge or string course, Window sill, Parapet coping, Vent grille, Duct crawl, Fire escape stair, Lamp post, Chain-link fence |
| Lights, Mission | shown once a later part adds tiles to them |
| View (also Hub > View) | rows: Layout, Ghost other levels, Exploded (left / right: the gap), Cut walls at (A on / off, left / right 0.1 m), Levels shown, Building filter, Small plan, Labels, Level below on the plan, Room names in 3D, Scale figure (ON3), Stealth view (ON4), Finish view (ON5), the light rows (ON7), Guard paths (ON8), Security coverage (ON12), Ceiling voids (ON13) |

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
| Room | Type (room kind), Name, Width, Depth (east and north edges; walls follow as set), Access (ring 0-5), Floor finish (ON5; the foot gives the footstep loudness) |
| Climb piece (ON5) | Type (flips between pieces placed the same way: downpipe and vent; the drawn ones), Name, its heights and sizes (Bottom, Top, Height, Depth, Width, Length as the piece has them), Climbable (by hand: an override); the foot says what the player can do |
| Stair | Type (Main dogleg, Fire dogleg, Straight), Name, Width, Depth, Climbs, To level (risers follow); the foot says whether it fits ("Fits: 25 risers", or "Needs 1.42 m more length for 25 risers") |
| Ceiling (ON13) | Type (Suspended grid tile, Plasterboard, Exposed slab, Open / none), Height (0.1 m steps up to the slab's underside; below facts `ceiling.min` 2.1 m it becomes none; from none it takes 2.4 m in a corridor, 3.0 m elsewhere), Hatches (right adds one at the dot, or the room's middle; left takes the last off); no Id row (it is the room's); the foot gives the void's clear height against the crawl rule |
| Crawl space (ON13) | Name, Width (0.6-1.2 m), Floor height, Clear height, Start and End (what each end took: a hatch, a vent or open; redraw to change), Id; the foot gives the clear height against the crawl rule |
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
| Play | Quick walk at the dot (same as L3 tap; it runs, L3 slows to a walk, B comes back); Walk test as the player (the game, as Tab or L3 held); Find a room, stair or object (ON3, below) |
| File | Save (with the unsaved count), Revert to last save (asks first), the change list newest first: A on a line asks "Undo back to here?" and undoes every change down to and including it; undone changes show grey above it until a new edit drops them, and A on one asks "Redo up to here?" (ON3) |
| Checks | Next problem (the line after the last one visited), then the problem lines (fails and warnings; new ones red). A on a line closes the hub, selects the element it names and frames it (ON3); a line naming nothing says "no place to go". While this tab is open the problem spots carry red markers |
| Levels | the level to edit (A edits it); the level rows (ON2, below): storey height, add above / below, duplicate one storey up, rename, rename id, delete, Edit building outlines; then the Levels shown panel: presets, picked levels, ghost, exploded and gap, cut height, building filter |
| View | the tile menu's View rows: layout, ghost, exploded and gap, cut walls at, levels shown, building filter, small plan, labels, level below on the plan, room names in 3D, scale figure; then Bookmarks: save this view (a name from the list or typed) and one Go to row per bookmark (ON3) |
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
- **Status line**: hidden while the controller was used last (the views take its room); back with the mouse or keyboard.
  On the pad a new message shows for 3 s at the top right instead (fix-up 2026-10-14).
- **Hint bar** (controller): one line, at most 5 prompts; holding something: "A Drop, LT/RT Lower / raise, Y Move / Resize, RB Turn 90, B Back". Nothing selected: "A Select, Y Menu, X Undo, L3 Walk, Menu Hub";
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

## Ease of use (ON3, ED2 Part D items 5-13)
- **Problems you can click**: every Checks line that names an element (its first id: an opening, wall, room, stair, ladder,
  floor hole or roof) is a link. Pad: Hub > Checks > A on the line; mouse: click it in the side panel's Checks. The editor
  goes to the element's level, selects it and frames it. A line naming no element says "no place to go". While the hub's
  Checks tab or the side panel's Checks is open, every problem spot carries a red marker: a red post in 3D (on shown
  levels) and a red ring with a cross on the plan (the editing level).
- **Floating names** (L, or View > Room names in 3D): each room's name on its floor, fading with distance and hidden beyond
  40 m (`facts.json` render.roomNameRange) and on hidden levels. A fixed pool of 48 labels; nothing is made per frame.
- **Save summary**: Save (Ctrl+S, the Save button, Hub > File > Save) first shows what will be written in plain words, the
  net changes since the last save grouped ("3 rooms added, 12 walls moved, 1 door type changed"), and the number of new
  check problems, with Save / Cancel (A / B). Cancel writes nothing. A renamed id counts as one rename.
- **Find** (Ctrl+K; pad: Hub > Play > Find): a list of rooms, stairs and named objects, filtered as you type (every word
  must appear in the name or the id, any case; names that start with it first). Keyboard: type, up / down, Enter goes.
  Pad: an on-screen keyboard (D-pad picks a key, A types, X deletes, Y done), then up / down picks a line and A goes there:
  its level becomes the editing level and it is selected and framed (an object: the camera goes there). B closes.
- **History**: Hub > File keeps the change list; undone changes show grey above it until a new edit drops them; A on one
  asks "Redo up to here?" and redoes up to and including it.
- **Scale figure** (K, or View > Scale figure): a 1.75 m person and a 1.15 m crouch outline beside it (`facts.json`
  player.standHeight, crouchHeight, radius) at the dot (with the mouse: the screen centre on the editing floor).
- **Bookmarks** (Hub > View > Bookmarks: save this view, then a name from the list (Overview, Gatehouse view, ... and the
  room names on the editing level) or typed; one Go to row per bookmark). Keys: Ctrl+1-9 save the camera in that slot
  ("View 3"), Alt+1-9 go there. A new bookmark from the hub takes the first free slot, else the oldest. Stored as a view
  preference in browser storage (`kestrel-editor-bookmarks`), never in the file.
- **Multi-select**: pad: hold A and move the dot (at least 0.5 m) = a box; letting go selects everything wholly inside it
  on the editing level (rooms, walls, floor holes, stairs, ladders; doors and windows ride with their walls). Mouse:
  Shift+click adds or takes out. The set is outlined orange in 3D and on the plan. A on one of the set (or Selected > Move)
  grabs them all at the dot: A drops (one edit), B puts back. Mouse: drag one of the set. Arrow keys nudge the set,
  Delete deletes it, Selected > Copy and Copy to level above copy the rooms, walls with their doors and windows, and floor
  holes as one edit (pasted as a set, new ids). A plain A or click elsewhere clears the set.

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

## Objects and cover (ON4, ED2 Part F)
The colocation campus's own furniture and plant, at real sizes, and what each piece means for a stealth player.

- **Catalogue** (`src/editor/catalogue.ts`, one data list; Michael adds presets there only): five groups. Data hall
  (server rack 42U, rack row, network rack, containment end door and roof, in-row cooler, CRAH, power distribution
  cabinet, cable tray, gas suppression cylinders, cage mesh, crash cart, tape library, step ladder); Plant (UPS, battery
  rack, LV switchboard section and row, generator, day tank, bulk fuel tank, chiller, condenser, pump set, pad
  transformer, ring main unit, air handling unit); Office and security (desks, desk pod, chair, filing cabinet,
  cupboard, lockers, reception counter, security desk, CCTV video wall, meeting table, sofa, kitchenette, fridge,
  vending machine, water cooler, copier, shredder, whiteboard, pot plant); Goods-in (pallet, pallet stack, boxed
  equipment, packing bench, roll cage, pallet jack, shelving, crates 1.0 and 1.2); Yard and roof (car, van, pickup,
  skip, wheelie and bulk bins, bollard, boom gate, bike rack, smoking shelter roof, gas bottle cage, low wall, planter,
  column, roof walkway). Each has its footprint, height, base height, `noLedge`, mount (floor, wall, ceiling),
  see-through flag and a `src` (the brief, a fact, or "editor default: typical product"). The rack width is facts
  `rules.rackWidth`, a column a storey (`room.storey`), the containment roof the aisle width (`rules.aisleMin`).
- **Object tool**: Y > **Objects** tab: the five group tiles first (A shows that group, the menu stays open), then the
  group's presets; A picks one. The tool bar shows "Object" with the preset under it; D-pad left / right steps the preset
  within its group. The ghost sits at the dot on the 0.1 m object grid (`meta.objectGrid`) and backs onto a wall face
  within `rules.aisleMaxGap` (0.3 m: a gap that small is closed anyway); **RB** turns it 90 degrees; **A** places it and
  the tool stays on, so each A places another (the repeat). A wall-mounted preset (video wall, whiteboard) off a wall
  makes the dot red: "Move onto a wall". Mouse: key 9 or the tool bar's Object button and list, click places, R turns.
- **Rows**: rack row, LV switchboard row, low wall, cable tray, containment roof, cage mesh and walkway are drawn like
  walls: A at the start, A at the end (mouse: drag). A row runs along the longer axis; racks and switchboard sections
  snap to whole units (a 6 m rack row is 10 racks). While drawing, the dot gives the units, the length and the aisle to
  the next parallel tall object: "aisle 1.8 m clear to O001", or red "aisle 1.2 m to O001: under 1.8 m", or "closed up"
  for a gap of 0.3 m or less (facts `rules.aisleMin`, `aisleTallObject`, `aisleMaxGap`, as check A26).
- **Card** (D-pad): Type (the presets of its group; a row keeps its length), Name, Width, Depth, Height, Base, Turn
  (quarter turns about the centre, the corner kept on the grid), See-through, No ledge, Id. Its foot gives the stealth
  badges and the aisle. Selected > Rotate 90 and R turn it too.
- **Stealth badges** (`src/editor/objects.ts`, pure, from facts only): **Full cover** (top above `player.standHeight`),
  **Crouch cover** (top above `player.crouchHeight`, up to standing), **Vault** (top over `traverse.stepMax`, at or under
  `traverse.vaultMax`, the thin side at most `traverse.vaultDepth`), **Climb** (a mantle up to `traverse.mantleMax`, or a
  lip from `lip.autoHeight` to `reach.grabMax`, not `noLedge`), **Hang** (a lip from `lip.autoHeight` to
  `reach.jumpGrab`, at least `lip.minLength` long, not `noLedge`). Cover, vault and mantle need the object on the floor
  (base 0). See-through gives no cover. A missing fact gives no badge and a "no fact" note. The `traverse` facts are F04
  (`pickTraversal`); a test keeps them equal. Shown on the card and as a small label over each object in 3D.
- **Stealth view** (J; Hub > View > Stealth view; Y > View): objects tinted in 3D and on the plan: full cover green,
  crouch cover yellow, vault / climb / hang blue, see-through grey; others light grey.
- **Plan**: `plans.mjs` draws each object's footprint with its name (its id where the name does not fit); see-through
  ones dashed and unfilled.
- **Walk test**: every object is a solid box of its real height and base (see-through ones too: collision is real), on
  its level, through `campusToBuild` (`objectBoxes`); a `noLedge` object's top is never a hangable lip.

## Climb pieces, exterior features and floor finishes (ON5)
What the outside of a building gives a climbing player, and how loud each floor is underfoot.

- **Climb tool**: Y > **Climb** tab, one tile per piece; A picks it and the tool bar shows "Climb" with the piece under
  it; D-pad left / right steps the piece. The tool stays on, so each A places another. Mouse: Space, the Climb tab, a
  tile; then click.
- **How each goes in** (decision 8): a **downpipe** or **vent grille** backs onto the wall face nearest the dot (within
  facts `climb.wallReach`, 1.2 m; off a wall the dot is red: "Move onto a wall face"); a **window sill** sits on the
  window nearest the dot, on the dot's side, at the window's sill; a **parapet coping** runs along the top of the wall
  nearest the dot; a **lamp post** stands at the dot; a **horizontal pipe**, **ledge or string course**, **duct
  crawl**, **fire escape stair** and **chain-link fence** are drawn: A at the start, A at the end (mouse: drag). A
  ledge drawn near a wall moves onto its face. RB has nothing to turn: the wall or the drawn line sets the way.
- **Heights** (all facts, `scripts/kestrel/facts.json` group `climb` unless named): a downpipe runs from the floor to
  the tallest wall top on that wall line at the spot (the roof parapet); a horizontal pipe at `reach.grabMax` over the
  floor; a ledge's top at the floor line above (the storey height), `climb.ledgeDepth` deep (0.15-0.3 on the card); a
  coping `climb.copingThick` on the wall top, the wall plus `climb.copingOverhang` each side; a vent `climb.ventW` x
  `climb.ventH` with its bottom `climb.ventSill` up; a duct the crouch section (`duct.crouchWidth` x
  `duct.crouchHeight`) from a vent at its start (its bottom) or the floor; a fire escape one storey,
  `stair.fireWidth` wide, its risers by `stair.riserHeight`; a lamp post `climb.lampPost`; a fence `climb.fenceHeight`.
  Everything is stored with absolute heights (`exterior[]`, schema.md).
- **What the player can do** (decision 2; `src/editor/climb.ts`, pure, from the facts and the engine's own move list:
  each piece's move is an `AnchorKind` that is also a `MOVE_MODES` entry, cited in `climbCatalogue.ts`), shown at the
  dot, on the card's foot and in Properties:
  - Downpipe (`pipeV`): climbable when at least `player.standHeight` long with its foot within `reach.grabMax`;
    "top lip 9.5 m within reach" when a wall top (not one with a wall standing on it) or a ledge piece is within
    `climb.pipeLipRise` (0.8 m) of its top and `climb.pipeLipReach` (1.0 m) across, as the game's `pipeLip`; else
    "climb up and back down".
  - Horizontal pipe (`pipeH`): hangable from `reach.grabMin` up and at least `lip.minLength` long; over
    `reach.jumpGrab` it says to reach it from a pipe, ladder or ledge.
  - Ledge, sill, coping (`ledge`, box tops as F09): a lip from `lip.autoHeight` up and `lip.minLength` long; climbing
    onto it needs `lip.climbDepth`; a coping is measured from the ground outside.
  - Vent (`duct`): the way into a duct whose end is within reach; else "a grille only".
  - Duct (`duct`): crouch-move at the crawl rule size (`duct.crouchHeight` x `duct.crouchWidth`), a crawl under it,
    refused narrower than the player; it names the vents at its ends.
  - Fence (`fence`): climb over; it rattles when climbed fast (`climb.fenceRattle`, F14).
  - Fire escape: walked (a stair, not a climb), its risers and going against the stair facts.
  - Lamp post: "climbing a lamp post is not in the game yet".
- **Climbable** (decision 3): set from those rules on every placement, move and card step. Properties > Climbable
  (yes / no, with the Reason field) or the card's Climbable row overrides it: the piece keeps `override: true` and the
  reason, its words add "Set by hand to ... : reason", and A23 leaves it out. Flipping back to the rules' value clears
  the override.
- **Walk test** (decision 4; `src/world/maps/kestrelExterior.ts`, shared): a climbable downpipe is the game's
  `LevelBuilder.pipeV` (facing the wall), a horizontal pipe `pipeH`, a fence `fence`, a duct its sides and lid plus a
  `duct` anchor with grates at both ends, a ledge, sill or coping a box whose top the builder makes a ledge (F09); a
  fire escape is the builder's stairs, a lamp post a pillar, a vent a thin plate. A piece that is not climbable is
  plain collision (a box with no ledge).
- **Floor finishes** (decision 5): Selected > **Floor finish** on a room (or the card's Floor finish row, or
  Properties): None, Carpet, Vinyl, Ceramic tile, Sealed concrete, Steel grating, Raised access floor, Gravel, Grass,
  Asphalt; written to `rooms[].finish`.
- **Footstep loudness** (decision 6; `src/editor/finishes.ts`): each finish sounds as one of the game's six floor
  surfaces (`src/world/surfaces.ts`): carpet and grass as carpet, steel grating as grate, gravel as gravel, a raised
  access floor as the hollow wood knock, the rest as concrete. The card and Properties give the game's own numbers:
  the surface's multiplier on the footstep radius (`noiseRadius` at the game's jog and sprint speeds): "Steel grating:
  loud, heard at 4.8 m jogging, 12.6 m sprinting (walking is silent)". The walk test marks each finished floor with its
  surface, so footsteps there sound and carry as the card says.
- **Finish view** (N; Hub > View; Y > View): floors tinted by finish in 3D and on the plan, with a legend (top right
  of the 3D view) giving each finish's loudness word (quiet, normal, louder, loud).
- **Plan**: `plans.mjs` draws each piece as before (a dot or a dashed line, green when climbable) in a group the editor
  can click.

## Room presets and stamping (ON11)
Michael (2026-10-13): stamp a fitted-out office, WC block or stair core, and save his own groups to reuse.

- **Presets** (`src/editor/presets.ts`): a group of rooms, walls, doors and windows, objects, stairs, floor holes and
  ladders relative to an origin (its south-west corner at 0,0), with a name, a footprint and a `src`. The records are
  the campus file's own (doors and windows as ON9, objects as ON4 with their catalogue ids); levels are relative
  (`+0` the level stamped on, `+1` the one above).
- **Start set** (16, sizes from facts, the module kit and typical products, each with its `src`): 4-desk office, 8-desk
  open office, meeting room (8), manager's office, WC block (male, female, accessible), kitchenette, security control
  room (desk, video wall, lockers), reception (counter, lounge), locker room, comms room (2 racks), store, plant room (UPS
  and batteries), stair core (main dogleg over two levels; its well comes from the ON2 stairwell link), lift lobby (with a
  lift shaft), data hall bay (two rows of 10 racks, a contained 1.8 m cold aisle, two CRAH units), goods-in bay (roller
  shutter to the yard in an outside wall). Rooms are walled on every edge; shared edges are one wall.
- **Module kit**: every module of `scripts/kestrel/modules.json` is a preset too, read from that file each time the
  editor loads (the editor server runs `expand.mjs` on one placement per module at the origin; nothing is copied).
- **Stamp tool**: Y > **Presets** > a preset (mouse: Space, click). The ghost of the whole group sits centred on the dot
  (walls 1.2 m high, floors, objects; on the 0.1 m grid); **RB** (R) turns it 90 degrees; **D-pad left / right** steps to
  the next preset of the same source; **A** (click) stamps it as **one undo step** with fresh ids (rooms `<level>-NEW`,
  walls `W<level>-NEW`, doors `O-NEW`, objects `O001`...). Its walls merge with walls already on the same lines (the
  ED3-3a rules: an existing wall is reused, never doubled; a door on a reused wall moves onto it, and is left out where a
  door is already there). Walls take the level's height; rooms join the building under them; a stair gets the risers
  for the real rise.
- **Fit check**: the ghost turns red where the stamp would overlap a room already there (sharing an edge is fine; yards,
  lanes and roof areas are outside ground) or where a wall already there runs through one of its rooms, with words at the
  dot ("overlaps Admin Office by 1.2 m", "wall WG012 runs through Office for 5 m"); A then refuses with the same words.
  A preset that needs a level above says so.
- **Save your own**: select a room, or box select a set (ON3), then Selected > **Save as preset**; the name comes from
  the list (the selected rooms' names and your presets') or the keyboard. A set keeps its selected walls with their doors
  and windows; one room gets walls along its edges carrying the doors already there; objects standing wholly inside the
  rooms come along. They show under Presets > **Mine**; Rename and Delete there act on the one last picked. Your presets
  are written to `docs/kestrel/editor-presets.json` with the file save (the Save button shows `*`; through the editor
  server, so the e2e test's sandbox copy is used there).

## Lights (ON6)
Lamps are placed in the editor as the play file's own records (schema.md section 3 `lamps`, `circuits`), the same records
the walk test builds and later parts read: nothing is entered twice.

- **Play file**: the editor loads `docs/kestrel/kestrel.play.json` beside the campus file and writes it on the first save
  that has lamps or circuits (only `lamps` and `circuits`; other parts add theirs; it keeps every other collection it has).
  The two files are one document while editing (`src/editor/playFile.ts`): undo, the unsaved count, drafts, the save
  summary and the change log treat them as one. The campus file never holds lamps. A save with no lamp change leaves the
  play file alone; a no-op save writes neither (both byte-identical). `KESTREL_EDITOR_SANDBOX` covers it.
- **Fitting catalogue** (`src/editor/lightCatalogue.ts`, one data list; Michael adds fittings there only): five groups.
  Interior (downlight 90 mm, troffers 600 x 600 and 1200 x 300, LED strip in extrusion, pendant, under-cabinet strip, wall
  uplight, stair step light, desk lamp); Plant and goods (high bay, LED batten 1500 mm, round and oval bulkheads, cage
  light); Outside (floodlight, wall pack, pole lantern on a 6 m pole, bollard, PIR security flood); Emergency (twin spot,
  maintained exit sign, maintained emergency bulkhead); Glow (CCTV monitor, video wall, rack status LEDs, vending machine
  front, fridge door light). Each has its mount, body size, default height, lumens (per metre for strips), colour
  temperature, beam, the emergency, motion and breakable defaults, the kind of circuit it goes on, and a `src`.
- **One conversion** (`lightParams`): lumens, colour temperature and beam to the game's `LightInit` fields (radius,
  intensity, colour, cone, fixture box). The reach grows with the square root of the beam-weighted lumens, the intensity
  with the fourth root, calibrated so a 900 lm 60 degree downlight is the Warehouse office ceiling lamp (radius 4,
  intensity 0.7; facts `light.cal*`). Beams under 100 degrees are spot cones along the aim; wider ones light the hemisphere
  below, as the game's lamps do. Colour from the colour temperature, softened half way to white as the game's lamps are
  (exit signs green, screens blue-white). The light itself is the game's own formula (`lampMath.ts`); there is no second one.
- **Light tool**: Y > **Lights** tab: the five group tiles and **Switch** first (a group tile shows its fittings, the menu
  stays open), then the group's fittings; A picks one. The tool bar shows "Light" with the fitting under it; D-pad left /
  right steps the fitting within its group; RB turns the ghost. The ghost sits at the dot at the fitting's height: ceiling
  fittings under the room's ceiling (or under the slab above, the level height less facts `room.slab`, when the room has
  none), wall fittings backed onto the wall face within facts `light.wallReach`, desk lamps and monitors on a desk top,
  glow fittings on the front of their object (rack LEDs: one per rack along the row), exit signs over the opening nearest
  the dot (facts `light.openingReach`, `light.signAbove`), a pole lantern on the lamp post at the dot or with a new ON5
  lamp post. Red with words where it cannot go ("Move onto a wall face"). A places it and the tool stays on. Strips and
  battens are drawn: A at the start, A at the end. A light point stands at least facts `light.surfaceGap` (0.15 m) off its
  ceiling or wall, as the game's map lamps do, so the light bake does not swallow it.
- **Circuits**: a new lamp joins the nearest switch's circuit in its room, else a new circuit (no switch yet). Emergency,
  photocell (outside) and equipment (glow) lamps join a circuit of their kind already in the room, else a new one; PIR,
  desk and fridge lamps each get their own. Unswitchable circuits carry the real reason ("Emergency lighting: on its own
  battery supply, no switch", "Photocell: on from dusk to dawn", "PIR: its motion sensor switches it", "Switched at the
  lamp", "Equipment light: on with the equipment", "Door switch: on when the door opens"). A lamp's `circuit` is the one
  source: every edit keeps the circuits' lamp lists in step (`circuitLink`, the model's link), so a lamp is on one circuit
  only; a switchless circuit left with no lamps goes.
- **Switches**: Y > Lights > **Switch**: A on a wall face places a switch (1.2 m up; a new circuit with `switch.at`,
  `.wall`); then A on lamps puts each on it (facts `light.lampPick`), B ends. Selected > **Add lamps** on a switch does the
  same for an existing one. With a lamp or switch selected the plan draws thin dashed lines from the switch to its lamps;
  the plan marks every lamp (a dot in its colour, a strip as a line) and switch (a square with its id).
- **Card** (D-pad): Type (the fittings of its group with the same mount), Name, Lumens (catalogue default shown), Colour
  temp, Beam, Height, Aim turn and Aim down (aimed fittings), Emergency (no, maintained, non-maintained), Motion (PIR),
  Breakable, Circuit (the circuits on its level, then a new one), Owner (Site, Building A, Building B, owners in use), Id.
  Its foot gives lumens, colour, beam, reach and circuit. The side panel has the same rows for the mouse.
- **Aim**: Selected > **Aim** on a floodlight, PIR flood or twin spot: the right stick turns (left / right) and tips (up /
  down) the beam, previewed; A sets it in one undo step, B puts it back. A rod along the beam shows the aim in 3D (a twin
  spot's second head points the other way along its wall).
- **3D**: every lamp shows its body and an emissive bulb in its colour (a dark bulb for a lamp off in its normal state);
  switches are small white plates. Lighting the editor's scene from the lamps is ON7.
- **Walk test**: lamps build through the campus converter (`src/world/maps/kestrelLights.ts`, `campusToBuild().lights`)
  into the game's own `LightRegistry` with `LevelBuilder.light`, the path every map's lights take, so the light meter and
  the guards read them (bible 5.1). Circuits are switch groups (1, 2, ... in the circuits' order), breakable is
  `destructible`, a twin spot is two lights. Not in the game yet: PIR triggering and mains-off; a PIR lamp and a
  non-maintained emergency lamp build in their normal state, off (a maintained one is on); the fridge light is off.

## Live lighting, darkness map, lights preview and guard view (ON7)
What the editor shows is what the game computes (bible 5.1): every light value comes from the game's own light code.

- **Light view** (Y; Hub > View or the tile menu's View tab: "Lighting"): the 3D scene switches from its flat massing
  light to night: the Kestrel theme's sky, its moon as the scene's directional light, and the lamps.
- **Exact light: the game's own pipeline, run in the editor page.** The editing level's campus (with only that level's
  lamps) goes through the Kestrel map's builder (`kestrel.build`, the walk test's path, `campusLights` for the lamps), then
  `LevelBuilder.build` on a hidden physics scene (the canonical light shapes, collision, the doors), then the game's
  `bakeLevelLight` (lamp and moon visibility through the game's voxel worker pool, so the page stays usable while it
  bakes, cached in IndexedDB as the game caches it), then the game's `LightField` with the doors closed. The 3D view uses
  the game's `BakedLamps` and `LampPlugin` (the phone light look: standard materials and the lamp volume) on clones of
  the editor's materials; the hemisphere goes off as on the phone (the plugin's ambient-grid fill replaces it). It runs
  when the light view, darkness map or guard view comes on, 300 ms after any change on the level (a lamp edit, a wall,
  object, opening, room, anything; while a drag is held it waits for the drop) and when the editing level changes. The
  legend (bottom right of 3D) says "Baking light..." while it runs and "Exact light (n ms)" after; the previous result
  stays on screen until the new one is ready.
- **Quick light while dragging**: a lamp being dragged, aimed or stepped on the card shows at once as a Babylon range
  light (the falloff `lampMath` takes from Babylon's lights; a spot as a spot) at its new place with its own baked light
  switched off; the other lamps keep their exact bake. The exact bake follows on the drop (300 ms). The quick light is
  3D only: the darkness map, the guard view and the meter never read it (the dot says "light: baking" meanwhile).
- **Darkness map** (B; Hub > View "Darkness map"): every 0.5 m cell (facts `light.mapCell`) of the editing level's floor
  (its rooms, less its floor holes) shaded by the game light meter's own sample, `LightField.bodyLevel` for a 1.75 m
  body (facts `player.standHeight`; the brighter of chest and head, as `GameState.updateLight` reads it): black under
  `LIGHT.shadow` (0.28, hidden), grey to `LIGHT.lit` (0.6), white above (lit). The two thresholds are drawn as contour
  lines, blue "hidden" and yellow "lit", in 3D and on the plan (the plan's are labelled). From the exact bake only.
- **Meter at the dot**: with the light view or the darkness map on, the dot's words end with the meter and its band
  ("light 0.21 hidden").
- **Lights preview** (Hub > View / tile menu View: "Lights preview", left / right): Normal (as the game builds the lamps:
  PIR and non-maintained emergency lamps off); Mains off (only maintained and non-maintained emergency fittings, exit
  signs among them, lit); Switched off (a "Circuit off" row appears: left / right picks the circuit on this level, it
  turns off); Motion lights on (PIR lamps lit, as if triggered); Lamp shot out (select a breakable lamp, Selected >
  **Preview shot out**). A mode switches the lamps in the game's registry (`setOn`, as a switch or a shot does) over the
  same bake (the bake does not depend on which lamps are on), so it shows at once. Nothing is saved.
- **Guard view tester** (Y > Lights > **Guard view**): A (a click) places a guard eye at the dot, facing the way the
  camera looks, at the AI's standing eye height (`EYE_STAND` 1.55 m, `src/ai/perception.ts`, used by `Enemy.eye`); the
  right stick's left / right turns the last eye (R: 45 degrees); B (Esc, Delete) removes it, B again leaves the tool.
  Several eyes are allowed; none is saved. The floor the guard can see is tinted: within the AI's own field of view and
  ranges (`PERCEPTION` focused cone 55 degrees to 25 m, peripheral to 100 degrees either side and 12 m, `fieldFactor`),
  with line of sight by the AI's own test (`losClear`, the ray `Enemy.losTo` makes against static collision, closed doors
  included, through the game's `Ballistics.ray` on the hidden physics scene) to the chest, else the head, of a body
  standing there: red where the body is lit (noticed at once), amber between the thresholds (noticed slowly), clear
  where it is hidden or out of sight.
- **Performance**: only the editing level is baked; the darkness map and guard view are recomputed only when the bake,
  the mode or an eye changes; the plan's map is one image (one pixel a cell), the 3D map one mesh.
- **Walk test**: it builds the same lamps (ON6) through the same map builder and bake, so the game and the editor
  agree; the e2e checks one cell's darkness map value against the walk test's light meter there (within 0.05).
- **The Kestrel night (ON7)**: the map's theme is the mission's night (01-mission-brief.md section 2), at the game's
  night-map levels (Embassy's: sky fill 0.28, moon 0.14, light level 0.22); it was the B0 massing walk's day light (0.9),
  which lit every floor over the lit threshold. ON15 sets the moon.
- **GPU**: the look and the frame time of the lit 3D view are Michael's check on the PC (CLAUDE.md GPU rule); the e2e runs
  on software GL and checks values, not looks.

## Guards and mission markers (ON8)
Guards and the mission markers are placed in the editor as the play file's own records (schema.md section 3 `guards`,
`spawns`, `objectives`, `extraction`, `hides`, `checkpoints`), so P06-P08 read them instead of typing them. They ride in
the editing document like the lamps (`src/editor/playFile.ts`): undo, drafts, the save summary and the change log treat
them as one with the campus; the save writes them to the play file only (spawns as bare points, the extraction as one
object, as the schema has them). Ids are fresh and readable (GD1, OBJ1, H1, CP1).

- **Mission tab** (Y; Space with the mouse): Guard, Insertion, Extraction, Objective, Intel, Checkpoint, Hide. The tool
  bar shows "Mission" with the tool under it.
- **Guard tool**: A (a click) places a guard (`guards[]`): kind, employer and job from the mission brief's roster (section
  3, `src/editor/missionCatalogue.ts`; D-pad left / right with the tool picks the role, default Rounds officer), `space`
  empty until P06. The guard stands at its first stop and path editing starts at once.
- **Path editing** (right after placing, or Selected > **Edit path**): A (a click) adds a stop at the dot (`loop[]`: `at`,
  `wait`, `face`; a new stop faces the way it was walked to); RB (R) turns the last stop 45 degrees, RB held aims it with
  the right stick (the way the stick points from the camera's view); D-pad up / down (+ / -) changes its wait, 1 s steps
  from 0; X (Backspace) removes the last stop; A on the first stop closes the loop (three stops at least); B (Esc) ends.
  D-pad left / right (Page Up / Down) changes the level: a stop on another level is reached by the nearest stair or ladder
  joining the two; with none, the leg is red with "No stair or ladder joins Ground and First". The dot shows the leg
  from the last stop as you move ("A: stop 5 here, 9.5 m from stop 4", or "No way from stop 4 to here", red). A new
  guard and its first path session are one undo step ("Added guard GD1, Rounds officer, 6 stops, 71 s loop"); a later
  session is one step too ("Changed GD1's patrol ...").
- **Walkability**: each leg is searched on a grid at the AI nav grid's cell (0.5 m) and agent radius (0.32 m), cited
  from `src/ai/navBuild.ts` (facts `guard.navCell`, `guard.agentRadius`, `guard.stepHeight`): the floor is the level's
  rooms less its floor holes; walls block by the radius except across door openings (on the floor, at least the
  headroom tall); objects between the step height and the headroom block. The game's AI code is not used or changed.
  The path is pulled tight where a straight line stays on the floor. A leg with no way through is red with "No way from
  stop 3 to stop 4" (plan, 3D, card and dot).
- **Cycle time**: `cycle` = loop length / the guard kind's patrol walk speed (facts `guard.walk`, F20: a looped patrol
  walks at `walkSpeed`, `src/ai/enemy.ts`) + the waits; the card's foot says "Loop 84 m, 71 s; walks 0.9 m/s". It is
  worked out again on every change of the guard (a moved stop, a new kind on the card); its legs are searched again
  when the building around it changes.
- **Drawing**: 3D: a line on the floor per leg in the guard's colour (red where there is no way) with arrows the way it
  walks, a pad at each stop with a wedge for its facing, a see-through figure at the first stop, labels with the stop
  number and its wait; plan: the same, one colour per guard, the wait as a number in the stop, the first stop with the
  guard's id, a red leg's words beside it, an open loop's way back dashed. Hub > View (and the tile menu's View) **Guard
  paths**: All guards, or Selected guard (only the selected guard's path; the others show their figure).
- **Patrol preview** (Selected > **Play patrol**; Stop patrol ends it): a guard figure walks the loop at its own speed
  (real time), waiting and facing at each stop, in 3D and on the plan. With the guard view on (the light view, the
  darkness map or a guard eye from ON7), the preview has its own guard eye that walks with it, so its sight tint moves.
  Not saved.
- **Mark alone here** (Selected): sets `isolation` (`at`, `t`): the point of the loop nearest the dot and the time it is
  there; while the preview plays, the figure's place and time now. Drawn as a dashed ring with "alone 31 s".
- **Markers**: Insertion: A places a player start (`spawns`, 1-4, numbered in order; a fifth is refused). Extraction: A at
  one corner, A at the far corner (the `extraction` rect; a new one replaces the old in the same edit). Objective: A
  places one (`objectives[]`: kind from the list built from the brief's chain and F28 (zone, take, panel, intel, code,
  plant, download, extract), the room under it, the next order, not optional). Intel: an objective of kind `intel`.
  Checkpoint: `checkpoints[]`. Hide: `hides[]` (kind recess, locker, dark patch, under cover on the card). Each draws as a
  labelled marker in 3D (insertion: a blue post and disc; objective: a diamond, amber for intel; hide: a grey box;
  checkpoint: a flag; extraction: a green zone) and on the plan.
- **Objectives' order**: Selected > **Needs first** on an objective, then A on other objectives: each is needed first (A
  again takes it back); Selected > **Opens** does the reverse. `requires` and `unlocks` stay mirrored; a loop through
  them is warned on the card and in the status line ("Objectives OBJ2, OBJ3 need each other ... none of them can be
  done"). Deleting an objective takes its id out of the others.
- **Card** (D-pad): a guard: Type (the game's guard kinds), Name, Role (the roster: name, employer and job together),
  Employer, Job, Id; an objective: Type, Name, Order, Optional, Id; a hide: Type, Name, Id; the extraction: Width, Depth.
  The side panel has the same rows for the mouse, and Edit path, Play patrol and Mark alone here for a guard.
- **Walk test** (Hub > Play **Start at insertion 1**, on / off): Tab, L3 held and Hub > Play > Walk test start at
  insertion point 1 (facing north) instead of the dot. The markers are not built in the game yet (P08).

## Security devices (ON12)
Cameras, card readers and keypads, motion sensors (PIR) and infrared beams are placed as the security file's own records
(`docs/kestrel/kestrel.security.json`, S0-security-spec.md section 6, schema.md section 4), so the security stages
(S1-S4) and P04S read them. They ride in the editing document as `devices`, like the play file's records
(`src/editor/security.ts`): undo, drafts, the save summary and the change log treat them as one with the campus; the save
writes them to the security file only, and only when its text changed (a no-op save leaves it byte-identical); the file is
made on the first save with a device, with empty `zones` and `cards`, and its zones, cards and other device kinds (desk,
panel, mantrap, iris, fault) are kept as they are. Ids are fresh and readable (CAM1, RD1, PIR1, BM1). Every device gets its
room (the room under it) and a plain reason ("watches G-FRONT", "controls door RA11"), which the side panel edits.

- **Security tab** (Y; Space with the mouse): Fixed camera, Pan camera, Card reader, Keypad, Motion sensor, Beam. The tool
  bar shows "Security" with the device under it; D-pad left / right with the tool steps the device.
- **Cameras**: A (a click) on a wall face (within facts `light.wallReach`) mounts it there facing out of the wall; elsewhere
  it hangs under the ceiling facing the way the view looks (RB / R turns that 45 degrees first). Mount height facts
  `security.cameraMountDefault` 3.0 m (S0 section 6), kept inside SN04 2.4-3.5 m and at most the ceiling (its bracket);
  a ceiling under 2.4 m refuses it with the reason; outdoors it needs a wall. A pan camera sweeps facts
  `security.cameraSweepDefault` 90 degrees round its facing (SN13 caps it at 120). Its frame is the game's own: SN01 70 x
  SN02 45 degrees, SN03 18 m (`src/config/security.ts` `CAMERA`), looking level.
- **Aim**: Selected > **Aim** (camera or sensor): the right stick turns it (5 degree steps), A sets, B puts it back; the
  card's Facing row steps facts `security.cameraAimStep` 5 degrees, Sweep `cameraSweepStep` 10 degrees; with the mouse the
  side panel's arrows step the same rows. A pan camera's sweep turns with it.
- **What a camera sees**: a selected camera tints the editing level's floor cells it sees, with the guard view's sight
  code: a body at a cell is seen when its chest, else its head, is in the camera's frame (the game's `inFrame`, a pan camera
  at the yaw of its sweep nearest the cell) and the ray from the lens is clear (perception's `losClear` through the
  game's `Ballistics` on the light view's hidden physics scene: walls, closed doors, objects). The light at the cell then
  decides (S0 2.1: the camera rate is the guard's `sightRate`, so the guard view's bands apply): red where the body is lit
  (seen at once), amber between the thresholds (seen slowly), blue where it is in frame but hidden (too dark). In 3D and on
  the plan, with a legend; the plan also draws every camera's frame outline (dashed, to its range; a pan camera's whole
  sweep) and 3D draws the same outline on the floor. The cells need the exact light: selecting a camera starts the bake
  (the light view's legend says "Baking light..." meanwhile).
- **Readers and keypads**: A by a door (its middle within facts `light.openingReach`) places the reader beside the door on
  the dot's side, at facts `security.readerHeight` 1.1 m, and binds it: the door gets the reader's type (ON9 `reader`: card,
  card and PIN, keypad), the reader's access level as its card `level`, and `locked` (S0 2.3), in the same edit. Its card:
  Type, Access level 0-5 (the plate's colour: grey, green, blue, yellow, orange, red), Building (A or B, from where it is),
  Door, Height. Stepping the level or type keeps the door in step; deleting the reader sets the door's reader to none (it
  stays locked); deleting the door drops it from the reader. A away from doors on a wall face: a reader alone.
- **Motion sensors (PIR)**: on a wall face (facts `security.pirWallHeight` 2.4 m, its fan the half in front of the wall,
  `pirWallFan`) or under the ceiling (a full circle). Range SN50 6 m on its level (S0 2.6 tests range only). The card's
  Links to row picks the alarm or a motion (PIR) lamp of ON6 on its level within range; a new sensor links to the nearest
  such lamp, else the alarm. Selected, its fan is tinted violet; the plan draws every fan dashed.
- **Beams**: A at one end, A at the other: an end within reach of a wall face sits on the face, else on a post. Length SN48
  1.5-12 m and height SN40 / SN41 (the card steps only 0.3, 0.4, 1.3, 1.4, 1.5 m; default 1.4, high) are checked on the
  drop, with the reason when refused. Visible (on the card): drawn bright, else night vision only (S0 section 3, drawn dark
  red and dashed on the plan). Every beam reports to the desk (the alarm, S0 2.5).
- **Security desk link**: a camera's Desk row picks a security desk object (ON4 `security-desk`, any level) and takes the
  next free monitor (Monitor row 1-16, facts `security.monitorMax`); the desk object's card and side panel list its feeds
  ("Feeds: CAM1 on monitor 1, ...").
- **Coverage view** (Hub > View and the tile menu's View: **Security coverage**): every camera cone (blue) and sensor fan
  (violet) of the editing level tinted on the plan and the floor, the unwatched floor left clear, with the count of
  unwatched cells and square metres in the legend. Change the level to see another. Not saved.
- **Checks**: the checker's S0 rules (SC01-SC06: ids exist, readers on doors into higher zones, camera mount heights and
  counts, beam heights, reasons, cards) run on the editor's devices with the file's zones and cards and show in Checks
  (no new rules). With no device and no file they are skipped as before.
- **Walk test**: cameras are built in the game as its own S1 cameras (`SecuritySystem`, housing and LED, the frame and the
  meter). Readers are built by stage S2, beams and motion sensors by S3 (the door's lock and card level already apply).
- **Card** (D-pad): a camera: Type (fixed / pan), Name, Facing, Sweep (pan), Height, Mount, Desk, Monitor, Id; a reader:
  Type (card reader, card and PIN, keypad), Name, Access level, Building, Door, Height, Id; a sensor: Type, Name, Links to,
  Mount, Height, Id; a beam: Type, Name, Height, Visible, Id. The card's foot says what it does in the game and which stage
  builds it.

## Ceilings, voids and crawl spaces (ON13)
Every room's ceiling is a piece of its own: `rooms[].ceiling` (height, 0 = none), `ceilingType` and `hatches`
(schema.md section 2), edited as the element `ceilings:<room id>` (`src/editor/ceilings.ts`; the model writes it back
into the room, so undo, drafts, the change log and the save treat it as a room change, and a no-op save stays
byte-identical). Types, thicknesses and hatch sizes are data with sources in `src/world/maps/kestrelCeilings.ts`
(shared with the walk test): suspended grid tiles (20 mm, 600 mm tiles), plasterboard (15 mm), exposed slab (150 mm),
open / none. A ceiling with no type of its own is a grid in a corridor and plasterboard elsewhere.

- **Select it**: Selected > **Ceiling** on a room (or the side panel's "Select the ceiling"); in 3D a ceiling is drawn
  facing down, so it is seen and picked (A, a click) only from below and never hides a room from the builder camera.
  Selected > Room goes back. Delete takes the ceiling away (open), as the Type row's Open / none does.
- **Ceiling void**: the space from the ceiling's top to the underside of the slab above (the lowest level above whose
  rooms cover the room's middle, less facts `room.slab`; else the top of its own level less a slab). Its clear height is
  the slab underside less the ceiling height less the ceiling's thickness, against the crawl rule facts
  `duct.crouchHeight` (1.5 m, F32): green when it meets it, red when not. **Y > View > Ceiling voids** draws every void
  as a see-through box in that colour, tints the plan with "Void 1.48 m" labels, and lists the editing level's voids
  with their clear heights in a legend (top right). Not saved.
- **Hatches**: on a grid ceiling any tile pushes up, so a hatch is a marked tile (tiles laid from the room's south-west
  corner, only whole tiles); on plasterboard or a slab only a placed 600 mm access hatch opens (on the 0.1 m grid, inside
  the room). The words say what the player can do from below at the ceiling's height: climb up (mantle, facts
  `traverse.mantleMax` 1.8 m), reach up and grab the edge (facts `reach.grabMax` 2.7 m), jump and grab (`reach.jumpGrab`
  3.1 m), or out of reach (a ladder or something to stand on).
- **Crawl space** (Y > Build > Crawl space): A (a click) at one end, A at the other draws a straight leg at the height of
  the ceiling void under its middle (no void there: on the floor, up to the ceiling or the slab); A at the end of the
  selected crawl goes on with another leg. An end within facts `ceiling.endReach` (0.6 m) of an ON5 vent piece takes the
  vent; an end under a ceiling takes a hatch there (a hatch already there, else a new one: the tile on a grid, an access
  hatch elsewhere, added to the room's ceiling in the same edit); else it is open. Width facts `crawl.widthDefault` 1.2 m,
  0.6-1.2 on the card. Written as `crawls[]` (schema.md section 2). The dot's words say where it would start and how
  clear it is; the plan draws each route at its width in the rule's colour, dashed, with its id and clear height.
- **What the player can do**: the game has a duct move (`duct` in `MOVE_MODES`, a `Duct` anchor), used by the Climb
  tab's Duct crawl; a crawl space does not use it: it is a crouch space (the crouch height facts `player.crouchHeight`
  1.15 m under its clear height), and the card says so. No new move.
- **Guards never enter voids** (handover); the card and the words say so; nothing for guards changes.
- **Walk test** (decision 6): a ceiling builds as thin boxes over the room less its hatches, at least 0.05 m thick so
  the light bake sees it (`CANON_MIN_THICK`): grid tiles are drawn and block light but do not collide (a tile pushes up
  and nobody stands on tiles; one-sided collision is not available); plasterboard and an exposed slab collide (a player
  can stand on plasterboard in the walk test: no one-sided collision); open builds nothing. A crawl space builds floor
  boards (top at `y0`, past each bend to cover the corner, stopping short of a hatch end so the hole stays open) and side
  boards (no ledge); both collide, so the player crouch-moves along the boards and climbs out at a hatch where the grab
  reaches. Ceilings and boards are light shapes (bible 5.1), so a void is dark unless a lamp is placed in it; the light
  view (ON7) bakes them too.

## Mirror, align, evenly space; name plates and signs (ON14)
The rules are `src/editor/arrange.ts` and `src/editor/signs.ts` (pure, `tests/editor/arrange.test.ts`, `signs.test.ts`);
`arrangeTool.ts` and `signTool.ts` join them to the editor. Every tool here is one commit (one undo step).

- **What a selection brings**: a selected room takes its own walls (lying on its edges, no longer than the edge, ED3-3a
  `onLine`) with their doors and windows, and what stands inside it: objects, signs, floor holes, stairs, ladders and its
  lamps. The ED3-3a wall rules are kept: a moved wall landing on a wall that stays is dropped and that wall reused (its
  doors move onto it); a room edge that had walls and has none at the new place gets new ones (its old kind and height);
  a wall shared with a room that does not move stays (a wall onto a yard, the lane, a zone or a roof is the room's own);
  a door on a wall that stays but on the room's edge moves with the room onto whatever wall is at its new place; every
  moved door's `between` is worked out again (its swing and one-way rooms follow).
- **Mirror** (Selected, one thing or a set): Mirror east-west, Mirror north-south (about the selection's centre), Mirror
  about a line (the Arrange tool: A at a point on the line, A at a second; a line running north-south flips east-west).
  Doors keep their hinge mirrored (a set left / right swaps; the default `a` end mirrors with the wall), stairs their
  climb (`up`), objects, ladders, lamps (yaw, aim) and signs their facing (a sign's left / right arrow swaps). A lone
  door mirrors in place (its hinge flips).
- **Align** (a set of two or more): left (west), right (east), top (north), bottom (south), centres (x), centres (z), to
  the outermost edge or, with Selected > Align to: First picked, to the first thing picked. Moves step 0.1 m.
- **Evenly space along x / z** (three or more in a row): the outer two stay, the others move to equal gaps.
- **Array** (Selected > Array): the Arrange tool; the dot's offset from the selection's centre along its larger
  direction sets the direction and the spacing (0.1 m steps); D-pad left / right (Left / Right arrows) sets the count
  (1 to facts `sign.arrayMax`, 20); the ghost shows every copy's outline before A. Copies get fresh ids (rooms
  `<level>-NEW1`, named "Office 2"...); a copied wall that lands on a wall is not made (it is reused, and the copy's doors
  go on it). Copies that would overlap are refused.
- **Box select** now takes objects and signs too.
- **Door name plates** (decision 5): `openings[].plate` (schema.md section 2), the plate's text. The door card's
  **Name plate** row turns it on (the name of the room the door opens into: the one that is not a corridor, stair or
  outside; between two rooms, the one it swings into) or off; **Plate text** steps through the site's names (A types).
  The plate is in the door's card level colour (ON9, grey with none), 300 x 100 mm, on the wall beside the latch edge on
  the outside face (away from the room it names) at facts `sign.plateCentre` 1.5 m; on the plan a small tag in that colour.
  **Selected > Name plates: this level / this building** on a room adds a plate to every door without one (one edit).
- **Signs** (decision 6, Y > Objects > Signs; the Sign tool): Direction sign, Room sign, Fire exit sign (wall or hung),
  and the fixed safety presets Fire extinguisher, First aid, High voltage, Gas suppression warning, No entry, Authorised
  only, CCTV in operation (wall only); sizes and colours with sources in `signCatalogue.ts`. A on a wall face (within
  facts `sign.wallReach`) fixes it at facts `sign.wallCentre`; elsewhere a wayfinding sign hangs facts `sign.hangGap`
  under the room's ceiling, facing back along the view, never lower than facts `sign.hangBottomMin` at its bottom. The
  card: Type, Text (left / right: Building A, Building B, the buildings' names, Exit, Reception, Goods In, every room name;
  A types), Arrow (none, left, right, ahead, up, down; drawn on the side it points), Height, Width. `signs[]`, schema.md
  section 2. All sign text is in-world text (docs/story.md section 2: British spelling, the site's names).
- **Walk test** (decision 8): plates and signs build as thin panels (facts `sign.panelThick`, 0.02 m) in their colour,
  no collision, no ledge. The game cannot draw text on a panel (LevelBuilder's only DynamicTexture is the fence wire,
  levelBuilder.ts:305; the detail pass's own signs are plain coloured boxes, detailPass.ts:94), so the words show in the
  editor only. At 0.02 m they are under the light bake's `CANON_MIN_THICK` (0.05 m), as the detail pass's signs are, so
  they are not light shapes (bible 5.1 parity).

## Moon and time (ON15)
The moon over the map: its direction, height and brightness, and a time-of-night slider, previewed with the game's own
moon bake and kept for the map in the campus file (`meta.night`, schema.md).

- **Moon and time** (Y > View, or Hub > View; A turns it on): its rows appear under it. Left / right steps a row (on the
  hub, the - / + buttons with the mouse, or the arrow keys):
  - **Time of night**: dusk (16:00) to dawn (08:00) in 10 minute steps; it sets the bearing and height from a simple sky
    path for the site, and the hub draws it as a slider with a **Brief** marker at 01:10 (A goes back to the brief's
    night). The sky path: the site at 54 degrees north (Overnight choice: RULES section 1 says a northern British city and
    gives no latitude), the moon at a winter full moon's declination (+20) crossing the meridian in the south at
    midnight: it rises north of east at dusk, stands 56 degrees high in the south at midnight and sets north of west at
    dawn (heights kept 5-85 degrees). Facts `moon`.
  - **Moon bearing**: the compass bearing in 5 degree steps; **Moon height**: degrees above the horizon in 5 degree
    steps. Setting either by hand marks the time "hand set".
  - **Moon brightness**: new, quarter, half, full: a share 0, 0.25, 0.5 or 1 of the Kestrel theme's moon, which is the
    game's night-map moon (Embassy's); the sky fill stays as it is, so a new moon leaves the sky fill only.
  - **Use for the map**: writes the setting to `meta.night` (unsaved until Save; it is in the change log and the save
    summary, but not an undo step: use it again with other values to change it). The walk test and the game (dev and
    build) then light the map with it. Without `meta.night` the map keeps its own moon exactly (bearing 228, about 50
    degrees high, full).
- **The default is the brief's night** (01-mission-brief.md section 2): a Tuesday in late November, 01:10, a thin waning
  moon behind cloud, so the yard has no moonlight: brightness **new**. Until a row is stepped, the light view shows the
  map's own moon (the legend says which: "Moon: the map's own", or the setting with "preview, not yet for the map").
- **Preview**: with the light view, the darkness map or Moon and time on, a step is quick and the release is exact: at
  once the 3D's sky light (the moon as the scene's directional light, its strength, the sky fill) follows; 300 ms after
  the last step the editing level is baked again through the game's own pipeline (the map's theme under the setting, the
  game's `bakeMoon` through `bakeLevelLight`; the lamps come from the cache), which moves the moon shadows in 3D and the
  darkness map. The legend says "quick: sky light only" in between.
- **Moon shadow lines** (the plan, while Moon and time is on): a moon arrow in the top left corner of the level's floor,
  pointing the way the light travels, with the bearing, height and brightness; and dashed violet lines round the ground
  in the moon's shadow (the exact bake's moon visibility a hand above the floor, at 0.5), so long dark strips across the
  yard show. They are drawn from the exact bake only (hidden while a step waits for it).
- **Light parity**: the light view, the darkness map and the walk test's light meter all read the same theme through the
  game's own light code; the e2e checks a yard cell's darkness value against the walk test's meter after a moon change
  (within 0.05).
- **GPU**: how the moonlit 3D looks is Michael's check on the PC.

## What it does not do yet (ED2 parts B-H)
- Fix-up 2026-10-14: a ceiling is never held, so its height stays on the card (it moves with its room); signs and point
  devices have no Resize (a centre marker only); a strip light's or beam's end moves without the placing checks (they
  run again on the next Checks). Resize words show size and height in the tag and the status line, not on the card
  while held.
- ON15: the sky path is a simple full-moon arc (the moon's real place on a given date, its phase from the date and cloud
  are not worked out); the brightness is a share of the game's night moon, not lux. Use for the map is not an undo step.
  The moon arrow sits in a fixed corner of the plan. Only the editing level is baked (as ON7).
- ON14: a plate sits on the wall beside the door, not on the leaf (the game's hinged leaf cannot carry a panel). The walk
  test's plates and signs have no words. Align and Evenly space move each room with its own walls; a wall two moved rooms
  share goes with the later one. Array does not copy security devices, guards or crawl spaces, and copied lamps keep their
  circuit. Mirror about a line takes only lines along x or z. The mirror and Array ghosts show outlines only (the pad's dot).
- ON13: the clear height counts the ceiling's thickness but not the crawl boards' (boards sit on the ceiling). A ceiling
  is the room's whole rectangle (wall-centreline; no cut round columns, risers or bulkheads), one height, flat. The
  void's slab is found from the room's middle only. A crawl route's legs are straight; a bend leaves its corner square
  without side boards; a crawl does not cut walls it crosses (walls to the slab stay solid in the walk test). Ends are
  taken on the drop (move a crawl and drop it again to retake them); Start and End rows are words only. Hatches cannot
  be moved (take the last off and add one at the dot); a crawl's hatch stays when the crawl is deleted. Renaming a room
  or vent does not rename a crawl end's `ref`. Crawl spaces are not boxed, copied, pasted or in presets; the plan images
  (`plans.mjs`) and `check.mjs` do not read them. The walk test lets the player stand on plasterboard ceilings (no
  one-sided collision) and fall through grid tiles off the boards; whether the game's ledge grab climbs up through a
  hatch into a 1.5 m space is the game's (not tested).
- ON12: the desk, panel, mantrap, iris and fault devices, zones and cards are not placed or edited (kept from the file);
  the desk link is stored on the camera (`desk`, `monitor`), not as a desk device's `feeds`. Coverage counts the editing
  level only and needs the light bake; a pan camera's cone is its whole sweep (the time it watches each part is not
  shown). A sensor fan is range only (no line of sight, as S0 2.6). Moving a reader away from its door keeps the binding.
  Devices are not duplicated, boxed, copied or pasted, and presets carry none; renaming a door does not rename a reader's
  `door`.
- ON8: the walk grid is the editor's own plain rule set, not the game's nav grid (no raycast floors, ledge drops,
  ladder links or door locks; a door opening is open across its whole width); a leg to another level goes by the stair's
  middle (the climb counted along its slope), not its real flights. Guards are not built in the walk test (P07) and the
  markers not in the game (P08); spawns face north. Renaming a guard or objective id does not rename the objective ids
  in `requires` / `unlocks`. Guards and markers are not duplicated, boxed, copied or pasted, and presets carry none. The
  patrol preview walks the drawn legs at the walk speed (no turning time). Lures, routes, spaces and radio are not edited.
- ON7: only the editing level's lamps are baked (a lamp on another level lighting through a stair well is left out). The
  lit 3D view lights world positions: an exploded or lifted level is lit where it would stand, not where it is drawn. A
  material whose colour a view tints in place (stealth, finish view) keeps its untinted lit clone until the next bake.
  The darkness map counts room floors less floor holes as walkable (objects and stairs are not taken out). The guard view
  samples a standing body at the meter's chest and head heights (the game samples the pose's own chest, head and hips)
  and does not model crouching, motion or distance in its colours (the light band and line of sight only). The quick
  light is drawn by Babylon's range light (falloff and cone as the formula, no N.L difference from the bake). PIR
  triggering and mains-off are previews only; the game still builds them in their normal state.
- ON6: PIR triggering and mains-off are not in the game (motion and
  non-maintained lamps stay off in the walk test). Lamps keep their place when a room or wall moves (they are not linked to
  rooms); a lamp whose room is deleted is skipped by the walk test. Strips are drawn on the ceiling or at their height
  on a line, not backed onto a wall face. A wall fitting's body stands at its light point (0.15 m off the wall), not
  against the wall. Renaming a wall or room id does not rename a switch's `wall` or a lamp's `room`; renaming a lamp id
  keeps its circuit. Switches cannot be moved (delete and place again); Box select, Copy and Paste do not take lamps or
  switches. `check.mjs` reads no lamp rules yet.
- ON11: presets carry no lamps or circuits (the ON6 records are not part of a preset yet). The
  ghost shows for the pad (the mouse sees the words after a click). A stamp lands where the dot puts it (no snapping of
  its edges to nearby walls; the magnet still moves the dot). The fit check looks at rooms and walls, not objects, climb
  pieces or roofs. Saving a preset takes rooms, walls, floor holes, stairs, ladders and objects, not roofs or climb
  pieces. A module kit preset's walls are its expand walls (outside walls 0.45 m where the module has no neighbour).
- ON5: pieces are straight (a duct or pipe is one run; no bends); a duct does not cut the walls it crosses (they stay
  solid in the walk test). A fire escape is one straight flight with no landings (its words say when a real one would
  need one). A downpipe's top lip counts wall tops and ledge pieces, not roof edges or object tops. A lamp post's lamp
  is the Light tool's pole lantern (ON6). The editor draws a piece as one bar (no pipe brackets, fence mesh or grille slats). Finishes the game has no
  surface for sound as the nearest one (vinyl, ceramic and asphalt as concrete, grass as carpet, a raised floor as
  wood). Box select, Copy and Paste do not take climb pieces. A level's storey change does not move them (heights are
  absolute).
- ON4: objects are axis-aligned boxes (quarter turns only); a boom gate, smoking shelter or desk is one box (the shelter
  is its roof slab). Box select, Copy and Paste do not take objects. Objects have no handles: change sizes on the card.
  A row's side across the drawn line is centred on it (no side flip). The walk test draws every object in one grey.
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
- The on-screen keyboard has no lower-case or symbol page (words start with a capital, the rest is small; ids keep capitals).
- ON2: building outlines are edited as edge rows on the Levels tab with the outlines drawn in 3D, not dragged on a site
  plan; the plan images do not draw them. Deleting a level leaves the levels above where they are. Free text that names an
  id (a hole's `reason`, the documents) is not renamed. Renaming the ground level G makes the walk test start on the level
  nearest floor 0. Services (pipe runs) keep their heights when a storey height changes. Duplicate does not copy stairs or
  ladders (they join two levels).
- ON3: a problem line goes to the first element it names (a line naming two goes to the first). The plan marks problems on
  the editing level only. Floating names are drawn over the 3D view (not hidden by walls in front). The new-problem count in
  the save summary is "new since the editor opened" (as the Checks badge), not since the last save. In some browsers
  Ctrl+1-9 switches tabs before the page sees it; Hub > View > Bookmarks always works. Box select is pad-only (the mouse
  uses Shift+click); a set cannot be turned 90 or duplicated (Copy and Paste can); walls follow rooms does not apply to a
  set (box the walls with the rooms). Find lists rooms, stairs and named objects only (no walls or doors).
- With the mouse, wall ends do not snap to other walls (the pad's magnet does);
  a wall crossing another (an X, no end on it) is not a cross wall for door centring; live sizes measure straight walls
  along x or z for room edges (angled walls are skipped).
- Props and routes.
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
| `src/editor/held.ts` | fix-up 2026-10-14: raising and lowering what is held, Move / Resize with the opposite corner fixed, min heights, height words, handle size on screen (3D distance, plan zoom) (pure, `tests/editor/held.test.ts`, also the tile word rules) |
| `src/editor/grab.ts`, `src/editor/hub.ts`, `src/editor/hubView.ts` | which part A takes, the magnet search, guide lines and their constants (`GRAB`, `MAGNET`, `SNAP`); the hub's tabs, rows, settings and help labels (pure, `tests/editor/grab.test.ts`, `hub.test.ts`); the hub on screen |
| `src/editor/orbit.ts` | the pad's builder camera: the ORBIT feel table, dead zone and curve, eased pan / orbit / tilt / zoom / height, clamps, eases, top-down swap (pure, `tests/editor/orbit.test.ts`) |
| `src/editor/pad.ts` | pad reading (edges, taps and holds, D-pad repeat, button names) (Babylon-free, `tests/editor/editorPad.test.ts`) |
| `src/editor/actions.ts`, `src/editor/visibility.ts`, `src/editor/draft.ts` | the action map (keys, help, hint bar); which levels and buildings are shown, ghosted or hidden, and the exploded lift; unsaved drafts in IndexedDB (Babylon-free, `tests/editor/editorV2.test.ts`) |
| `src/editor/liveSizes.ts`, `src/editor/chain.ts` | live sizes and distances: clear runs between cross walls, door centring and side distances, the nearest parallel wall, room sizes, room edge snapping; wall chains (pure, `tests/editor/liveSizes.test.ts`, `chain.test.ts`) |
| `src/editor/roomWalls.ts` | rooms and their walls: walls on an edge, the walls a new room needs, linked edits, Split, A's linked words (pure, `tests/editor/roomWalls.test.ts`) |
| `src/editor/vertical.ts`, `src/editor/levels.ts` | ON2: the stair proposal, fit and Fit, the stairwell link, ladders, floor holes; add, duplicate, delete levels, storey heights, renaming ids with every reference, building outlines and the RULES 2 warnings (pure, `tests/editor/vertical.test.ts`) |
| `src/editor/openingCatalogue.ts` | ON9: every door and window type (name, family, leaf, size with its source, the settings it has), realistic defaults per type, the settings in words and their steps, a type flip within the family (pure, `tests/editor/openingCatalogue.test.ts`) |
| `src/editor/catalogue.ts`, `src/editor/objects.ts` | ON4: the object presets (one data list with sizes and sources); placing at the dot, backing onto walls, turning, drawn rows in whole units, aisles, stealth badges and tints (pure, `tests/editor/objects.test.ts`) |
| `src/world/maps/kestrelDoors.ts` | ON9: the one copy of the door side maths (swing side, hinge or stack end), shared by the editor and the walk test, and the walk test's game doors and panes (pure) |
| `src/editor/climbCatalogue.ts`, `src/editor/climb.ts`, `src/editor/finishes.ts` | ON5: the climb pieces (one data list: placing, engine move, source); placing at the dot, drawn pieces, the reach rules and words, `climbable` from the rules or by hand, the card's rows and steps; floor finish loudness from the game's own surface noise, the legend (pure, `tests/editor/climb.test.ts`) |
| `src/world/maps/kestrelExterior.ts` | ON5: the one copy of the floor finishes and their game surfaces, and of how each climb piece builds in the walk test (the engine's builders or plain collision), shared by the editor and the walk test (pure) |
| `src/editor/ease.ts`, `src/editor/group.ts` | ON3: the element a check line names, the save summary's net changes and words, the Find list and filter, the bookmark store; multi-select box pick, moving, copying and pasting a set as one edit (pure, `tests/editor/ease.test.ts`) |
| `src/editor/overlays.ts`, `src/editor/findView.ts` | ON3: floating room names (pooled labels), red problem markers, the scale figure; the Find box and its on-screen keyboard |
| `src/editor/roofGeometry.ts` | ON10: the roof types, settings and defaults with sources, a new roof, the footprint under the dot, the default eaves height, the card's rows and steps, the type flip, the steepness flag and the roof level check (pure, `tests/editor/roofGeometry.test.ts`) |
| `src/world/maps/kestrelRoofs.ts` | ON10: the one copy of the roof geometry (planes, edges, ridges, hips, plan marks, the walk test's boxes and panes), shared by the editor, the walk test and `plans.mjs` (pure, import-free) |
| `src/world/maps/stairs.ts` | the one copy of the stair maths, shared by the editor and the walk test: `stairSize` (A11 sizing), `stairSplit`, `stairLayout` (flights and landings) (pure; `kestrelGeo.ts` re-exports `stairLayout`) |
| `src/editor/presets.ts`, `src/editor/stampTool.ts` | ON11: the start set (data with sources), module kit presets from expand's output, turning and placing a group, the fit check, stamping as one change list with wall reuse, saving a selection, the own presets file; the Stamp tool's state, ghost cache and save (pure, `tests/editor/presets.test.ts`) |
| `src/editor/lightCatalogue.ts`, `src/editor/lamps.ts`, `src/editor/playFile.ts` | ON6: the fittings (one data list with sources) and the one lumens conversion; placing lamps and switches, linear fittings, default circuits, the circuit link, the card's rows and steps, words; the play file joined in and split out (pure, `tests/editor/lamps.test.ts`) |
| `src/world/maps/kestrelLights.ts` | ON6: the lamp and circuit records and how the walk test builds them as the game's lights (pure); ON7: the lamp id of each light |
| `src/editor/lightPreview.ts` | ON7: the lights preview modes, the light bands at `LIGHT`, the darkness map's cells and contours, the guard view's classes from `PERCEPTION`, the quick light (`contribution`) (pure, `tests/editor/lightPreview.test.ts`) |
| `src/editor/missionCatalogue.ts`, `src/editor/mission.ts`, `src/editor/missionTool.ts` | ON8: the guard kinds and walk speeds, the brief's roster, objective and hide kinds (data with sources); the mission records, the walk grid and leg search, length and cycle, path edits, the patrol as time, isolation, objective links and loops, the play file shapes (pure, `tests/editor/mission.test.ts`); the Mission tools in the editor: path editing, markers, picking, the patrol preview, plan marks and 3D labels |
| `src/editor/lightView.ts` | ON7: the exact light through the game's pipeline (map builder, hidden physics scene, `bakeLevelLight`, `LightField`, `BakedLamps` on material clones), the quick light, the darkness map and guard view in 3D and on the plan, the eyes, the legend |
| `src/editor/securityCatalogue.ts`, `src/editor/security.ts`, `src/editor/securityTool.ts` | ON12: the Security tab's devices, reader types, access level colours and drawn sizes (data with sources); the device records, placing (wall face, ceiling, by a door), the reader's door link, what a camera sees (`inFrame`, `losClear`), sensor fans, coverage and gaps, the card's rows and steps, the security file split (pure, `tests/editor/security.test.ts`); the Security tool in the editor: ghost and words, plan marks, labels, the light view's security cells |
| `src/editor/ceilings.ts`, `src/editor/crawlTool.ts` | ON13: the ceiling piece (a room's ceiling fields), the slab underside and the void's clear height against the crawl rule, hatches (tiles and access hatches), the card's rows and steps, crawl records (ends at hatches and vents, heights from the void, legs, settling), words (pure, `tests/editor/ceilings.test.ts`); the Crawl space tool in the editor: drawing and going on, the dot's words, plan marks, the voids legend |
| `src/editor/night.ts` | ON15: the Moon and time panel: the time-of-night sky path (facts `moon`), the steps, the brief's night, the words (pure, `tests/editor/night.test.ts`); the preview and shadow lines are in `lightView.ts` |
| `src/world/maps/kestrelNight.ts` | ON15: the one copy of `meta.night`: reading it, the brightness shares (data with sources), the moon's direction, and the Kestrel theme under it (the game's map and the editor) (pure) |
| `src/editor/arrange.ts`, `src/editor/arrangeTool.ts` | ON14: what a selection brings, mirror, align, evenly space, Array and their ghosts with the ED3-3a wall rules (pure, `tests/editor/arrange.test.ts`); the Selected tab's tools, the Arrange tool's modes, auto name plates |
| `src/editor/signCatalogue.ts`, `src/editor/signs.ts`, `src/editor/signTool.ts` | ON14: the sign kinds and the plate (data with sources); the plate's room, text, colour and place, auto plates, sign records, the text list, placing on a wall face or hung, the card's rows and steps, the walk test's panels (pure, `tests/editor/signs.test.ts`); the Sign tool, plan marks and plate tags |
| `src/world/maps/kestrelCeilings.ts` | ON13: the one copy of the ceiling types, tile and hatch sizes and crawl boards (data with sources), and how the walk test builds ceilings (less their hatches) and crawl spaces, shared by the editor's 3D (pure) |
| `docs/kestrel/kestrel.security.json` | ON12: the security file (S0 section 6, schema.md section 4); the editor writes `devices` |
| `docs/kestrel/kestrel.play.json` | ON6: the play file (schema.md section 3); the editor writes `lamps` and `circuits` |
| `docs/kestrel/editor-presets.json` | ON11: Michael's own presets (schema.md section 7, own presets); written by the editor's Save |
| `scripts/kestrel/editor-server.ts` | dev-server endpoints: load (the campus file and, ON6, the play file; ON12, the security file), plan (one level, SVG), checks (ON12: the S0 security rules on the editor's devices), save (all three files), the walk test's draft, presets (the module kit expanded, the own presets file); `KESTREL_EDITOR_SANDBOX` for tests |
| `scripts/kestrel/plans.mjs` | the same plan drawing the documents use; `--level` and `--svg-only` for the live view, `data-id` on rooms, walls and openings for clicks |
