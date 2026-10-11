# ED2 - Level editor v2: views, walk test as the player, controller, ease of use, levels, objects, documents

**Status: TBC (Michael, 2026-10-12).** Written, not approved to run. No session starts a part until Michael's own
message says to (the start messages below). Michael may reorder, drop or change parts first; whoever runs a part
checks this status line and stops if it still says TBC and the message does not name the part.

Michael, 2026-10-12. Builds on editor v1 (commit c090732, `docs/kestrel/editor.md`). One session per part. Michael
tests each part before the next. A to D are the core; E to G finish "build a map from scratch"; H is an outline that
needs Michael's decisions before it can be written in full.

| Part | What | Message to start it | Model | Needs |
| --- | --- | --- | --- | --- |
| A | View modes (3D, plan, both), level and building visibility, shared groundwork | `Editor: ED2 Part A` | Opus, medium | - |
| B | Walk test with the game's own player, movement and camera | `Editor: ED2 Part B` | Opus, medium | A |
| C | Controller editing with a hold-to-open radial menu | `Editor: ED2 Part C` | Opus, medium | A |
| D | Ease of use: linked walls, snapping, dimensions, problems you can click, search | `Editor: ED2 Part D` | Opus, medium | A |
| E | Levels and vertical pieces: stairs, ladders, floor holes, adding and changing levels, renaming | `Editor: ED2 Part E` | Opus, medium | A, D |
| F | Objects and cover: racks, desks, crates, plant, outside features | `Editor: ED2 Part F` | Opus, medium | A, D |
| G | Documents follow the file: plan documents, reviews and the Kestrel stages after editor saves (a planner session) | `Planner: ED2 Part G` | Opus, medium | any save |
| H | Lighting preview (outline only) | `Editor: ED2 Part H plan` | Opus, medium | Michael's answers |

Not in this prompt (they belong to Kestrel stages, and the editor picks them up when those land): doors that open,
close and lock in the walk test (stage DR), guards, routes and patrols (P06-P07), security devices (P04S), co-op.

## Every part

### Read first (only these, plus what the part lists)
- `CLAUDE.md` (hard rules), `docs/kestrel/RULES.md` sections 9-10 (ending a session, approval), this file.
- `docs/kestrel/editor.md` and every file in `src/editor/`, `editor.html`, `scripts/kestrel/editor-server.ts`.
- `tests/editor/*.test.ts`.

### Michael's goals (his words, 2026-10-12)
- "Implement use of controller to edit maps, must be intuitive (potentially holding one button to bring up rotary
  selection menu and being able to use analogue stick to select or enter sub menus)."
- "Walk test should actually use the game's avatar and movement etc for accurate testing."
- "Floor plans and 3D should have view options to select one or the other, or both, at any time."
- Make the whole editor more user friendly.
- Background: he works by seeing and walking the place, not by reading plans. Every choice should favour seeing,
  feeling scale, and fast trial and error.

### Rules that apply
- The editor stays dev-only: `editor.html` is never a build input, and nothing in `src/editor/` is imported by the game.
  The game may gain a dev-only path for Part B, behind `import.meta.env.DEV` and a URL flag, and the production
  build must not contain or call it (check `dist/` after `npm run build`).
- Babylon only through `src/core/babylon.ts` (add any side-effect import there). Strict TS, `import type`.
- Pure logic (menu maths, bindings, snapping, linked edits, converters) goes in Babylon-free modules with Vitest tests.
- The campus file `docs/kestrel/kestrel.campus.blocks.json` is in charge once Michael saves from the editor
  (progress.md Decisions, 2026-10-12). Never run `p03b-blocks.mjs --force`.
- Save format stays byte-identical on a no-op save (`campusText`, test exists). New fields only when a part says so.
- UI preferences (layout, divider, labels on/off, bindings) may use `localStorage`; they are view preferences, not saves.
  Unsaved edit drafts go to IndexedDB (Part A).
- Plain English, hyphens not em dashes. Anything Michael sees in the editor is in plain words, no bare ids without a name.
- `tests/kestrelMap.test.ts` already fails before v1 (the B0 map copy `src/world/maps/kestrel.blocks.json` no longer
  equals `docs/kestrel/kestrel.blocks.json`). Do not "fix" it by editing either file; Part B reports what it found.

### Done for every part
1. `npm run lint`, `npm test` (only the known kestrelMap failure allowed; any other fail is yours), `npm run build`.
2. The part's own checks below, run in the browser (`.claude/launch.json` has the `editor` server on port 5199).
   Screenshots for every visible change. Reset any viewport emulation when finished.
3. `docs/kestrel/editor.md` updated (controls table, panels, limits). One log entry in `docs/kestrel/progress.md`
   (at most 6 lines). One line in `docs/kestrel/lessons.md`.
4. Commit `kestrel ED2 <part>: <summary>` (only files you changed), push `feature/kestrel`.
5. Report to Michael per RULES 9 4c (plain English, at most 8 lines) plus a short "Try this" list of 4-8 things to do
   in the editor to test the part. End with "Review chat: SEND - editor part end" and the Next step block (RULES 9 4b).
6. STOP. Do not start the next part.

---

## Part A - View modes, level visibility and shared groundwork

### A1. View modes
- Three layouts, switchable at any moment without losing state: **3D only**, **Plan only**, **Both**.
- Switch by a segmented control in the toolbar ("3D | Both | Plan"), the `V` key (cycles), and (Part C) the
  controller's View button. The current one is highlighted.
- **Both**: a draggable divider; a toggle for side by side or stacked (stacked suits a narrow window); a swap button.
  Divider position and orientation are remembered.
- The selection, current level, hover highlight and camera marker stay in sync in every mode. Plan only must be
  fully usable for editing (it already is for mouse; keep it so).
- The panel (Selected / Checks / Changes) becomes a drawer on the right that works in all three modes: open, closed,
  or pinned. `Tab` is taken by walking in v1; use `` ` `` (backquote) or `I` to toggle the drawer, and say which in the help.
- In 3D only, show an optional small plan minimap in a corner (toggle `M`): the current level, the camera arrow, and
  click-to-go. It is the same SVG as the plan view, scaled; it must not re-request the server on its own.
- The 3D engine resizes on every layout change (`engine.resize()`); no stretched frame.

### A2. Whole building or single levels
v1 has one "Show" list (this level and below, this level only, everything). Replace it with a clear **Levels** control,
the same in 3D and on the plan where it applies:
- **Whole building**: every level drawn, as built. The editing level still decides what clicks select.
- **Single level**: only the editing level, alone. Fastest way to see one floor plainly.
- **Up to this level** (the v1 cutaway): the editing level and everything below it; levels above hidden.
- **Ghost the rest** (a toggle on top of any of the above): levels that would be hidden are drawn instead as faint
  see-through outlines, so you keep your bearings. Ghosted pieces are never clickable.
- **Pick levels**: a checkbox per level (named with height, "First floor (4.2 m)") to show any mix, for example the
  ground floor and the underfloor void together. Choosing one of the presets above sets the boxes.
- **Exploded view** (a toggle): levels pulled apart vertically by an adjustable gap (0-12 m), so the whole building
  can be seen floor by floor from the side, with stairs and ladders drawn as lines joining the floors they link.
  Editing still works; positions are saved as if the gap were 0.
- **Section height** (a slider, "cut walls at"): walls on the shown levels are drawn only up to the chosen height
  above their own floor (for example 1.2 m), so rooms read clearly from above without hiding the level. Off by default.
- **Building filter**: All, Building A, Building B, Site (outside both footprints), from `meta.buildings`. Hidden
  buildings are not drawn and not clickable.
- **Editing level**: still chosen with the Level list and Page Up / Page Down. Hidden levels can never be edited by
  accident: if the editing level is hidden, show it anyway and say so in the hint bar.
- **Plan view**: the plan always shows the editing level. Add an optional faint underlay of the level below (toggle),
  drawn client-side from the data, not a second server render, to line walls up between floors.
- Every combination is one click (toolbar), one key (`G` whole building, `O` single level, `U` up to this level,
  `X` exploded, `Shift+G` ghost the rest) and, in Part C, a submenu in View >. Remembered between sessions.
- Pure module `src/editor/visibility.ts`: given the settings, the levels and an element, returns hidden, ghost or
  shown, and the exploded height offset. Vitest covers every preset, picks, building filter and the editing-level rule.

### A3. Shared groundwork for B, C and D
- **Input layer**: one editor action map (`src/editor/actions.ts`, pure) that keyboard, mouse and (Part C) gamepad all
  feed. Each action has an id, a plain name and its bindings per device. The help overlay and the hint bar are
  generated from it, so bindings are written once.
- **Hint bar**: a one-line strip over the bottom of the 3D or plan view showing what the buttons do right now, by context
  (nothing selected, room selected, dragging, drawing a wall, menu open). Keyboard and mouse words now; Part C adds
  pad glyphs from `GLYPHS` / `detectPadStyle` in `src/input/gamepadMapping.ts`.
- **Draft autosave**: every committed edit writes the in-memory campus and the journal to IndexedDB (database
  `kestrel-editor`, not the game's `shoulder-strike`), debounced 1 s. On load, if a draft is newer than the file on disk
  and differs from it, ask: "Restore unsaved changes from <time>?" with Restore / Discard. Save clears the draft.
- **Revert**: a toolbar "Revert to last save" with a confirm, which reloads the file and clears undo.

### A4. Part A checks
- Screenshots of: whole building, single level (first floor), up to ground with the rest ghosted, exploded view with
  a 6 m gap, section height 1.2 m, Building B only.
- In exploded view, move a wall on the first floor, turn exploded off: the wall sits at its new position at 4.2 m,
  and the saved file has no exploded offset in it.
- Switch 3D, Both and Plan ten times while a wall is being dragged and while a room is selected; nothing is lost and
  the 3D view is never stretched.
- Edit in Plan only (move a wall, add a door), switch to 3D, see the change, undo it from 3D.
- Make three edits, reload the page, restore the draft, then Save; the draft is gone after.
- Vitest: the action map (no binding is used twice in the same context), draft serialise and compare.

---

## Part B - Walk test as the player

Goal: press one button and be standing in the game, as the real player character, with the real movement, camera,
crouch, speed gears, climbing, stairs and collision, in the campus exactly as it is in the editor right now, including
unsaved edits. Press one button to come back to the editor where you stopped.

### B1. Read first
- `src/world/maps/kestrel.ts`, `src/world/maps/kestrelGeo.ts` (the existing B0 builder that turns an arch-schema file
  into floors, walls with gaps, stairs and slabs), `docs/kestrel/schema.md` section 2.
- `src/main.ts` around `flags.autostart` and `startGame`, `src/core/flags.ts`, `src/world/maps/index.ts`.
- `tests/kestrelMap.test.ts`.
- Use `grep` and line ranges for anything else (player spawn, pause menu).

### B2. Map from the editor's data
- `kestrelGeo.ts` was written for the older B0 file. Make the game build the campus file: multiple buildings, level
  footprint lists, levels U, H, L, boundary fences, gates and rollers, parapets, services (the pipe rack), ladders.
  Prefer a pure converter (`src/world/maps/kestrelCampus.ts`) from the campus schema to what `buildKestrel` reads, so
  the B0 path keeps working. No coordinate typed in code: everything comes from the file.
- In the walk: walls and fences collide; every opening is an open gap of its own width and height (doors are not
  modelled yet; say so on screen in one line); windows are gaps above their sill; stairs are walkable flights with the
  file's riser count; floors have their voids cut; ladders are climbable if the engine's ladder or attach system can
  take them from the data, otherwise skipped and listed in the report.
- Vitest with the real campus file: wall count in = collision boxes out (minus fence-only rules you document), every
  opening leaves a gap at its `at` and width, every stair's flights rise floor to floor, no floor tile covers a void.
- Investigate the kestrelMap test failure and report in plain words what differs and why; do not change either file.

### B3. Hand-off and spawn
- The editor posts its current data to a new dev endpoint `/__editor/draft` (held in the dev server's memory, never
  written to the repo). The game, in dev only (`import.meta.env.DEV`) and only with the URL flag `editorDraft=1`, fetches
  it and builds the Kestrel map from it instead of the bundled file. Production code paths and the bundle stay
  unchanged.
- Boot as `?autostart=kestrel&mode=sandbox&editorDraft=1&spawn=<x>,<z>,<level>,<yaw>`. Spawn at the point under the
  editor's view centre on the current level (or the selected room's centre if a room is selected), facing the editor
  camera's direction, pushed clear of walls (reuse `clearOfWalls`). On a roof or a floor with no room under the point,
  fall back to the nearest room on that level.
- Show the game in a full-window overlay `<iframe>` inside the editor page (same tab, so returning is instant and the
  editor keeps its undo history). Mute nothing; the game's own audio is fine.
- Come back with Esc then "Back to editor" (a dev-only pause-menu item), `F10`, or (Part C) holding View + Menu on the
  pad for 0.5 s. On return the editor camera moves to where the player stood, on the player's level, looking the same
  way, and the plan arrow follows.
- The editor's "Walk" button and `Tab` now start the game walk. Keep the old quick eye-height walk as "Quick walk"
  (`Shift+Tab`) for instant checks; label both clearly.
- While walking, the game's debug overlay (`docs/systems/testing-tools.md`) is available; add a small corner readout
  with position and level so Michael can say "at x 34, z 41 the corridor feels tight".

### B4. Part B checks
- From the editor, select the data hall and press Walk: you stand in the data hall as the player within 10 s on this PC.
- Walk the ground spine corridor end to end, go up main stair A to the first floor, cross the link bridge into Building
  B, crouch in the hall underfloor if it is reachable, then go back to the editor and confirm the camera is where you
  stopped.
- Move a wall in the editor without saving, walk again: the wall is in its new place in the game.
- `npm run build` then search `dist/` for `editorDraft` and `__editor`: zero hits.
- GPU note: performance is not judged here (dev tool), but the walk should hold a smooth frame rate on Michael's PC;
  report the debug overlay's frame time once.

---

## Part C - Controller editing

Goal: Michael can build and change the campus with a controller alone, comfortably, and never needs to remember a
button because the screen always shows what each one does.

### C1. Read first
- `src/input/gamepadMapping.ts` (`PAD`, `mapPad`, `TapHold`, `GLYPHS`, `detectPadStyle`), `src/input/gamepadSource.ts`,
  `src/input/stickMath.ts` (`applyRadialDeadzone`), `src/ui/hud/gadgetWheel.ts` (the game's wheel: match its look),
  `scripts/e2e-pad.mjs` (the fake Gamepad API the e2e suites use).

### C2. Button map (Xbox names; PlayStation and Nintendo glyphs come from `GLYPHS`)
Defaults below; every binding lives in the Part A action map, so changing one is a one-line edit.

| Input | Fly / edit | Notes |
| --- | --- | --- |
| Left stick | move | click (L3): fast, toggles |
| Right stick | look | click (R3): look at the selection |
| LT / RT | down / up | analogue; deeper press is faster |
| A | select what is under the centre reticle; on the selected item, grab it; A again drops it | drawing tools: A starts and A finishes (wall ends, room corners) |
| B | cancel the grab or drawing; else deselect; in menus, back | never deletes anything |
| X | undo | hold X 0.5 s: redo |
| Y hold | radial menu (C3) | Y tap: repeat the last tool |
| LB hold | fine grid (0.1 m) while held | |
| RB | go to the selection | |
| D-pad | while grabbing: nudge one grid step, relative to where the camera faces; otherwise up / down: level up / down, left / right: previous / next element in the room or wall list near the reticle | |
| View | cycle 3D / Both / Plan; in Both, hold View 0.4 s to move pad focus between the 3D and plan panes (the focused pane has an orange border) | |
| Menu | help overlay with the full button map; from there Save, Revert, Walk test | |
| View + Menu hold 0.5 s | in the walk test: back to the editor | |

- A **centre reticle** in 3D is the pad's pointer. It snaps to the grid on the floor of the current level, shows the
  coordinates, and highlights what A would pick (the hover name in the hint bar).
- Grabbing (like a forge mode in console shooters): the grabbed item follows the reticle on its level plane, snapped;
  handles work the same way (aim at a handle, A, move, A). Show the live size or offset while moving.
- In the **plan pane** with pad focus: left stick moves a crosshair cursor over the plan (accelerates with time held),
  right stick pans, LT / RT zoom, A / B / X / Y act exactly as in 3D at the crosshair.
- **Properties with the pad**: in the drawer, D-pad up / down moves between fields (reuse `src/ui/focusNav.ts` if it
  fits), left / right changes a number by one grid step (LB held: fine step) or steps through a list, A edits text with
  the browser's on-screen keyboard where available, B leaves the drawer.
- Light rumble (if `vibrationActuator` exists) on a snap to a wall end, on a drop and on an error; off switch in the
  help overlay.
- Mouse, keyboard and pad work at the same time; the hint bar shows the device last used.

### C3. Radial menu
- Hold Y to open a ring of up to 8 slots around the screen centre; the game keeps rendering behind it, the camera stops.
- Either stick points (whichever is pushed further). Inner deadzone about 0.35, sector hysteresis about 8 degrees so
  the highlight does not flicker on a border. The highlighted slot grows, shows its name and a one-line description in
  the centre.
- **Leaf slot**: release Y (or press A) to pick it. Releasing Y with the stick in the centre cancels.
- **Submenu slot** (marked with a small arrow): hold the stick on it for 0.25 s or press A; the ring is replaced by the
  submenu, the centre shows a breadcrumb ("Build > Door"), and the menu stays open even if Y is released, until a leaf
  is picked (A, or release-to-pick if Y is still held) or B goes back one level (B at the top closes).
- Mouse and keyboard get the same menu: hold `Space`, point with the mouse, release to pick or click.
- The last picked slot in each ring is pre-highlighted next time.
- Root ring (clockwise from the top):
  1. **Select**
  2. **Build >** Room, Wall, Door > (door, double, fire door, roller, gate), Window, Stair, Ladder, Floor hole (these
     three from Part E), Object > (Part F); slots for parts not built yet stay hidden
  3. **Edit >** Duplicate, Delete, Rotate 90 degrees (rooms, wall runs, selections), Copy, Paste, Paste to level above,
     Measure
  4. **Undo**
  5. **Walk test** (Part B)
  6. **View >** 3D, Both, Plan, Levels > (Whole building, Single level, Up to this level, Ghost the rest, Exploded,
     Section height, Level below underlay), Buildings > (All, A, B, Site), Labels on/off, Minimap
  7. **Level >** one slot per level, named ("First floor (4.2 m)")
  8. **File >** Save, Revert to last save, Help
- Pure module `src/editor/radial.ts`: stick vector to slot with deadzone and hysteresis, menu tree navigation, hold
  timing. Vitest covers every rule above.

### C4. Part C checks
- New e2e `scripts/e2e-editor.mjs` (starts its own Vite dev server on a free port, not `dist/`; reuses the fake pad from
  `scripts/e2e-pad.mjs`): open the radial with Y, go Build > Wall, draw a 6 m wall with the pad alone, undo with X,
  redo with X held, cycle views with View, open Build > Door > double and place one, save is not called. Add it to
  `docs/systems/testing-tools.md` as `npm run e2e:editor` (not part of the required `npm run e2e` set).
- Browser check with the fake pad: screenshots of the radial at the root and in a submenu, and of the hint bar in
  three contexts.
- Report what Michael should try with his real controller (he tests on his PC).

---

## Part D - Ease of use

Do the Must items; do Should items while time allows and list the rest in the report.

### Must
1. **Linked walls**: dragging a room edge moves and stretches the walls that lie on that edge (same level, within half a
   wall thickness), and their doors keep their distance from the nearer wall end. Moving a room moves its own walls.
   On by default; a toolbar toggle "Walls follow rooms". The change log shows it as one edit ("Widened Admin Office
   east by 1 m; moved 2 walls"). Any room move or resize also refreshes the "rooms either side" (`between`) of every
   opening on the walls it touched (a v1 gap).
2. **Smart snapping** beyond the grid: wall ends snap to other wall ends and to wall lines, room edges to wall faces
   and other room edges, doors to the middle of the clear wall between two cross walls. Show thin guide lines while
   snapping. LB / Ctrl turns smart snapping off for that drag.
3. **Live dimensions** while drawing or dragging: wall length, room width and depth, distance to the nearest parallel
   wall, door distance to each wall end. Shown in 3D (floating) and on the plan.
4. **Measure tool**: click (A) two points, see the distance and the height difference; stays until B.
5. **Problems you can click**: each check line in the Checks panel that names an element selects it and goes to it;
   problem spots get a red marker in 3D and on the plan while the Checks panel is open.
6. **Floating names** in 3D: each room's name on its floor, faded with distance, toggle `L` and in View >.
7. **Save summary**: Save first shows a short list of what will be written (the unsaved changes in plain words) and
   the number of new check problems, with Save / Cancel.

### Should
8. Multi-select (Shift+click, box select by dragging on empty floor in Select) and move or delete them together.
9. Copy and paste, including to the level above or below at the same position (good for stacking floors).
10. Search (`Ctrl+K`, pad: Menu > Search with the on-screen keyboard): type a room name, pick it, fly there.
11. History panel: the Changes list is clickable to undo back to any step.
12. A 1.75 m person figure under the reticle (toggle `K`) for scale in 3D.

(Stair, ladder and floor hole tools are Part E; ghosting and section height are Part A2.)

### Could (list in the report if not done)
13. Named camera bookmarks ("Gatehouse view"), keys `Ctrl+1`-`9` to store, `1`-`9` with `Alt` to recall.
14. A first-run walkthrough of the five basic actions.
15. Lighting preview: Part H, do not start it here.

### Part D checks
- Vitest for linked walls (edge drag moves exactly the walls on that edge; doors keep offsets; undo restores), smart
  snapping (end-to-end, end-to-line, door centring) and the save summary text.
- Browser: widen a room by dragging its edge and watch its wall follow; draw a wall that snaps to two existing walls;
  click a check problem and land on it; screenshots of each.

---

## Part E - Levels and vertical pieces

Goal: everything that joins or makes floors can be drawn and changed in the editor, so a building can be made from
nothing: stairs, ladders, floor holes, new levels, storey heights, and ids that can be renamed safely.

### E1. Read first
- `docs/kestrel/schema.md` (stairs, ladders, voids, levels; the dogleg sizing rule, "A11"), `scripts/kestrel/facts.json`
  groups `stair`, `player`, `reach`, `room`, `scripts/kestrel/standards-check.mjs` (stair and vertical checks).
- The stair decision in `docs/kestrel/progress.md` Decisions: 25 risers per 4.2 m storey (0.168), not the brief's 26.

### E2. Stairs
- **Stair tool** (Build > Stair): drag a rectangle on the lower level, then pick in the panel: climbs N, S, E or W;
  layout straight or dogleg; kind main or fire; to-level (default: the level above). The panel shows risers, riser
  height, going, flight count and landing size worked out from the facts and the two floor heights, and says in words
  if the rectangle is too short or too narrow for them ("needs 1.4 m more length for 25 risers"); a button "Fit
  rectangle" resizes it to the smallest legal size from the corner you drew.
- The floor hole above is made and kept matched automatically (same rect on the to-level, kind `stairwell`), moved
  and resized with the stair, deleted with it (one undoable edit).
- Stairs draw in 3D as real flights and landings matching the game's walk test (Part B uses the same layout code; one
  shared pure function, no second copy of the stair maths).
- Handles: the four edges, plus an arrow handle that turns the climbing direction 90 degrees per click.

### E3. Ladders and floor holes
- **Ladder tool**: click a wall face or a point; from-level and to-level from the panel; facing taken from the wall it
  is on. Shows the climb height and whether it meets `reach` limits.
- **Floor hole tool**: drag a rectangle on a level (shaft, hatch, void); kind from a list (stairwell, shaft, hatch,
  atrium); holes cut the floor in 3D and in the walk test.

### E4. Levels
- A **Levels panel** listing every level (name, floor height, storey height), with: add a level above or below,
  duplicate a level (walls, rooms, openings and objects copied with new ids, placed one storey up), delete a level
  (confirm, lists what goes with it), rename, change storey height.
- Changing a storey height moves every level above by the difference, and offers to stretch full-height walls on that
  level ("47 walls were 4.2 m, the old storey height: stretch them to 4.5 m?"). One undoable edit, logged in words.
- Building footprints (`meta.buildings`) editable by handles in a site view, with the RULES 2 caps (site 110 x 80,
  each building 48 x 30) shown as limits; warn, do not block.

### E5. Renaming ids
- Rename any id from the panel. Every reference in the file is updated in the same edit: walls in openings, rooms in
  `between` and ladders, levels everywhere. The new id must be unique and match the file's id style (warn if not).
- The change log lists each rename on its own line so Part G and the reviewer can update documents.

### E6. Part E checks
- Vitest: stair sizing (straight and dogleg, fire and main, against the facts), stair plus hole kept in step, storey
  height change moves the levels above and stretches only the walls that matched the old height, rename updates every
  reference (count references before and after on the real campus file).
- Browser: draw a dogleg main stair from ground to first floor with "Fit rectangle", walk it in the Part B walk test,
  screenshots. Add a level above the roof and delete it again; the file is byte-identical afterwards (undo).

---

## Part F - Objects and cover

Goal: place the things that make a space playable for stealth (racks, desks, crates, plant, skips, pipes, fences,
lamp posts) and see at a glance what each one does for the player.

### F1. Read first
- `docs/kestrel/schema.md` `objects` and `exterior`, `scripts/kestrel/facts.json` groups `player`, `reach`, `lip`,
  `door` (`objectFrontClear`), `docs/level-design.md` (the cover and climb sections; grep, do not read whole).

### F2. Catalogue
- A catalogue file `src/editor/catalogue.ts` of object presets: name, footprint, height, base height, `noLedge`, and
  a `src` for every size (the scale sheet or `docs/level-design.md` where they give it, else "editor default"). Start
  with: server rack, rack row (n racks), desk, desk pair, filing cabinet, crate (1.0, 1.2), pallet stack, plant unit,
  generator, transformer, skip, vehicle (van, car), barrier, low wall, column. Michael can add presets later by
  editing this one file.
- **Object tool** (Build > Object >, grouped: Office, Data hall, Plant, Yard): pick a preset, click to place, `R` /
  pad LB+RB rotates 90 degrees, objects snap to the 0.1 m object grid and to walls (back against a wall).
- **Rows**: drag to place a row of racks with a set aisle width; the panel shows the aisle clear width against the
  corridor and clearance facts.
- Exterior features (`exterior`: downpipe, sill, string course, fire escape, lamp post, fence, pipe) placed along a
  wall face or between two points, with `climbable`.

### F3. What it means for the player
- Each object shows a small badge, worked out from `facts.json` and never typed in code: **full cover** (top above
  standing height), **crouch cover** (top above crouch height), **vault** (low enough to vault), **climb** (top within
  grab reach and not `noLedge`), **hang** (a lip the player can hang from).
- A toggle "Stealth view" tints objects by those badges in 3D and on the plan, so cover gaps in a yard or hall are
  obvious.
- The walk test (Part B) builds objects as solid boxes with the same heights.

### F4. Part F checks
- Vitest: badge rules at the boundaries (just under and over each fact), rack row spacing, rotate keeps the footprint
  on the grid.
- Browser: fill a bay of the data hall with two rack rows, check the aisle, walk the aisle in the walk test, crouch
  behind a crate; screenshots of the stealth view.

---

## Part G - Documents follow the file (a planner session)

Goal: once Michael edits in the editor, the Kestrel documents, checks and stages keep working, with no one hand-
copying numbers. This part changes process documents, so it runs as a planner session and Michael approves it.

### G1. Read first
- `docs/kestrel/PLANNER.md`, `docs/kestrel/RULES.md` (all), `docs/kestrel/REVIEW.md`, `docs/kestrel/handover.md`
  Status, the newest progress.md entries, `docs/kestrel/03B-block-plan.md` (tables only, by grep), the editor logs.

### G2. Work
1. **Drift report**: a script `scripts/kestrel/doc-sync.mjs` that compares every rect, wall, opening, stair and level
   in the campus file with the tables in `03B-block-plan.md` and prints what differs, in words and as a count.
2. **Recommendation to Michael** (questions with the multiple-choice tool, recommended option first): either the 03B
   tables are regenerated from the file by the script (the document keeps its reasons and decisions; numbers come from
   the file), or 03B is frozen as history and a generated `03B-current.md` is the reference from now on.
3. **RULES and PLANNER**: "current plan wins" (RULES 7) points at the campus file for positions and sizes; stages
   read positions from the file, never from 03B; the generator rule (no `--force`) is written in.
4. **REVIEW.md**: a section "Reviewing an editor save": read `editor-log.md` since the last review, the `.jsonl` for
   exact values, `git diff` of the file; rerun check.mjs, standards-check.mjs and the ring and path checks; judge
   realism and stealth flow as usual; renames (Part E) listed for document updates. A message template
   `Reviewer: editor save` for Michael to send after a save.
5. **Cascade**: which stages go back to DRAFT when Michael's edits touch their inputs (RULES 10 cascade), and the
   status of P03R and HK after the pause (progress.md Decisions, 2026-10-12).
6. The Next step block for whatever stage comes next.

### G3. Part G checks
- The drift report runs on the current file with 0 drift before any editor save, and lists exactly the change after a
  test edit (then undo the test edit).

---

## Part H - Lighting preview (outline; write the full part after Michael answers)

Light and shadow is the core of the game, so a light preview is the most useful later addition for stealth design.
It must obey light parity (bible 5.1: what the player sees, the light meter and guard perception agree), so it cannot
be a look-only approximation. Before a full prompt, the planner asks Michael (multiple-choice tool, recommended first):
1. When are lamps placed: in the editor now (lamps added to the file), or only after the Kestrel lighting stage writes
   the play file (P06)? Recommended: in the editor, writing the same lamp records the play file will use, so nothing is
   entered twice.
2. What the preview shows: the game's own light bake and meter values (exact, slower to update), or a quick estimate
   while dragging and the exact bake on release? Recommended: quick while dragging, exact on release, and the
   exact one is what the darkness overlay shows.
3. A "darkness map" overlay on the plan and floor (light meter value per 0.5 m cell, shaded from lit to black), with
   the player's "hidden" threshold marked? Recommended: yes; it shows dark routes at a glance.
4. Guard sight cones from patrol points as a later add-on (needs P06-P07 data)? Recommended: later.

Read `docs/systems/lighting.md` and the bible section on light before writing Part H in full.
