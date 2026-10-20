# Warehouse sections 2 and 3 - brief

Set by the orchestrator, 2026-10-20 (after #37 merged as 4.14.0). Branch `feature/warehouse-s23` from master cf73f8b5,
folder `C:/NightShift/Mobile-Coop-warehouse-s23`. Job lead: "Night Shift | Sector Ops Build". Lowest priority (M5): heavy
work only when `C:/NightShift/heavy.lock` is absent and CT Core is not waiting; logic suites to the laptop through the
orchestrator. One PR to master (a minor step). Prototype effort only (CLAUDE.md "Current goal").

## Michael's words
The warehouse-redesign job's M1-M6 (`docs/warehouse-redesign/BRIEF.md`) carry over: realistic building logic, a
free-flowing sandbox, several stealth routes per section, guard routes with a reason; "Loosen where needed"; lowest
priority. His notes from walking section 1 on /preview/ (4.14.0) come through the orchestrator and are added here as
M1 onward when they arrive.
- **M1** (2026-10-20 15:00, walking section 1, verbatim): "section 1 is ok, better than before at least but not perfect. Its
  hard to tell, the night vision is so poor. I cant see properly at night, and the bodies are very bright." The
  orchestrator: the direction holds; build section 2 the same way. Night vision is a separate job: no NV change here.
  A small follow-up in this PR: section 1's key routes and objective areas get enough lamp light to read without NV,
  with a light-field test of must-see points, as course-ready S2 did for Marlow Yard (`tests/ctcourseLight.test.ts`,
  `docs/course-ready/LIGHT.md`).

## Goal
Rebuild sections 2 (storage hall) and 3 (assembly hall, mezzanine, rear offices) as greybox prototypes to
`docs/warehouse-redesign/SPEC.md` 2.2 and 2.3, the way section 1 was built (SPEC 5): a build sheet per section first,
then the greybox, a fresh checker, at most one fix round, `npm run check` + e2e-sectorops (+ e2e-coop / e2e-netmove if
`src/game` or `src/net` change), then the full `npm run e2e` on the PR head. G155: no heavies or dogs (replaces
warehouse-redesign A5 once built).

## Level-standard loosenings
L1-L15 from `docs/warehouse-redesign/BRIEF.md` apply; any new one is logged here (what, why, how to undo).
- **L16 - LD 16.7.5 (LD:346), ducts only in walls, slabs or voids; extends L6 to section 3's header** (`BUILD-S3.md` D5).
  - What: the hall main's riser ends in an exposed header pipe at 5.8 m over the plant-room roof (L6 named 4.7-5.0 m).
  - Why: from the 3.8 m roof a standing grab needs the pipe 1.6-2.7 m up, and a jump from a hang reaches at most 1.2 m up, so the
    main at 5.0 cannot be reached from the roof; the header is the riser's real top.
  - Undo: drop the header and climb a `pipeV` riser from the roof to the main (SPEC 2.3 fallback; its reach band starts at the roof).

## Assumed decisions (job lead; each with how to undo)
- **A1 (node_modules):** a junction to `C:/NightShift/Mobile-Coop-sector-restart`'s (dependencies identical to master's;
  `npm ci` is heavy). Undo: delete the junction and `npm ci` under the lock.
- **A2 (order):** the section 2 build sheet first; code for section 2 starts after Michael's section 1 notes are read (M1: go ahead), so
  a direction change costs a sheet, not a build. Undo: build without waiting.
- **A3 (x -4 wall):** the wall between sections 2 and 3 rises from 3.2 m to 6.0 m with a parapet (SPEC 2.2); it is also
  section 3's west wall. Undo: back to 3.2 m.
- **A4 (perimeter parapets):** new parapets on the west and north perimeter wall tops, so the 4.0 m rack tops and the
  north pipe cannot reach a wall top into section 3. Undo: remove them (and lower the racks or pipe).
- **A5 (A2 ladder):** a ladder in aisle A2 south of the beam sensor replaces SPEC's "split-climb over the beam" (a split
  jump cannot travel along the aisle); the split stays as a hide. Undo: the split route once the engine can travel.
- **A6 (sheet adjustments):** `BUILD-S2.md` section 9 D4-D13 (guard starts 7 m from the section start, the tour guard's
  3 s pause as its takedown spot, small guard and ladder moves, a 1.0 m cage gate, a visual-only west fire exit).
  Undo: the SPEC 2.2 values.
- **A7 (section 3 parapets, BUILD-S3 D13):** parapets on the north and east perimeter wall tops (the deck puts the north
  top in a standing grab, and the tops lead out of the building); extends A4. Undo: remove them.
- **A8 (section 3 sheet adjustments):** `BUILD-S3.md` section 9 D1-D17 taken as written (the office door on the south
  wall and the clerk facing north, the window built open, the fitter's three screens by the press, the east-cell
  machines at x 12.5, the tour guard's spot at the fire-exit clocking point, cameras moved into the 2.4-3.5 m mount
  band, 42 lamps for readability). Undo: the SPEC 2.3 values.
