# ED2 - Level editor v2: view modes, walk test as the player, controller, ease of use

Michael, 2026-10-12. Builds on editor v1 (commit c090732, `docs/kestrel/editor.md`). Four parts, one session each, in
order. Michael tests each part before the next.

| Part | What | Message to start it | Model |
| --- | --- | --- | --- |
| A | View modes (3D, plan, both) and the groundwork the other parts share | `Editor: ED2 Part A` | Opus, medium |
| B | Walk test with the game's own player, movement and camera | `Editor: ED2 Part B` | Opus, medium |
| C | Controller editing with a hold-to-open radial menu | `Editor: ED2 Part C` | Opus, medium |
| D | Ease of use: linked walls, snapping, dimensions, problems you can click, search, autosave | `Editor: ED2 Part D` | Opus, medium |

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

## Part A - View modes and shared groundwork

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

### A2. Shared groundwork for B, C and D
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

### A3. Part A checks
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
  2. **Build >** Room, Wall, Door > (door, double, fire door, roller, gate), Window, Stair (Part D), Floor hole (Part D)
  3. **Edit >** Duplicate, Delete, Rotate 90 degrees (rooms, wall runs, selections), Copy, Paste, Paste to level above,
     Measure
  4. **Undo**
  5. **Walk test** (Part B)
  6. **View >** 3D, Both, Plan, Show (this level and below / this level only / everything), Labels on/off, Minimap
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
   east by 1 m; moved 2 walls").
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
10. Stair, ladder and floor hole tools: draw a stair as a rectangle with a climbing direction, layout straight or
    dogleg, from-level and to-level; the matching floor hole on the upper level is made with it.
11. Search (`Ctrl+K`, pad: Menu > Search with the on-screen keyboard): type a room name, pick it, fly there.
12. History panel: the Changes list is clickable to undo back to any step.
13. Upper levels ghosted (transparent) instead of hidden in "this level and below", and a section height slider that
    cuts walls at a chosen height so rooms read from above.
14. A 1.75 m person figure under the reticle (toggle `K`) for scale in 3D.

### Could (list in the report if not done)
15. Named camera bookmarks ("Gatehouse view"), keys `Ctrl+1`-`9` to store, `1`-`9` with `Alt` to recall.
16. A first-run walkthrough of the five basic actions.
17. Lighting preview (the game's core): a separate future part; do not start it here.

### Part D checks
- Vitest for linked walls (edge drag moves exactly the walls on that edge; doors keep offsets; undo restores), smart
  snapping (end-to-end, end-to-line, door centring) and the save summary text.
- Browser: widen a room by dragging its edge and watch its wall follow; draw a wall that snaps to two existing walls;
  click a check problem and land on it; screenshots of each.
