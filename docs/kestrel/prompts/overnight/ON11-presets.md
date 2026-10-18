# ON11 - Room presets and your own saved groups
Model: Opus, medium effort.
Decisions: 11

Read `ED-overnight.md` section 5 first. Then: `scripts/kestrel/modules.json` and `docs/kestrel/schema.md` section 7
(the module kit: real pre-checked rooms); `src/editor/catalogue.ts` (ON4), `lightCatalogue.ts` (ON6),
`openingCatalogue.ts` (ON9); the editor's copy / paste code (grep `clipboard`, `paste`).

Michael (2026-10-13): stamp a fitted-out office, WC block or stair core, and save his own groups to reuse.

| # | Decision |
| --- | --- |
| 1 | **Presets** (`src/editor/presets.ts`, data): a group of rooms, walls, openings, objects, lamps and circuits, relative to an origin, with a name, a footprint and `src`. Start set, sized from facts and the module kit where they exist: 4-desk office, 8-desk open office, meeting room (8), manager's office, WC block (male, female, accessible), kitchenette, security control room (desk, video wall, lockers), reception (counter, lounge), locker room, comms room (2 racks), store, plant room (UPS and batteries), stair core (main dogleg with its hole, from ON2), lift lobby, data hall bay (two rack rows with containment and cooling, from ON4), goods-in bay. |
| 2 | Module kit rooms (`modules.json`) appear as presets too, read from that file (not copied). |
| 3 | **Stamp tool** (Y menu: Presets tab): ghost of the whole group at the dot, RB turns 90 degrees, A places it as one undo step with fresh ids; its walls merge with walls already on the same lines (the ED3-3a rules: reuse, never double); lamps join new circuits with their own switch. |
| 4 | **Fit check**: before A, the ghost turns red where it overlaps existing rooms or walls in a way the rules would refuse, with words ("overlaps Admin Office by 1.2 m"). |
| 5 | **Save your own**: Selected tab "Save as preset" (with box select from ON3): asks a name (list or keyboard), stores the group in `docs/kestrel/editor-presets.json` (saved with the file save, through the dev server, sandbox-aware); they show in the Presets tab under "Mine"; rename and delete from the tab. |
| 6 | Presets carry their lamps and objects with the same records as ON4 and ON6 (no second format). |
| 7 | Vitest: stamping relative to origin with turns (ids fresh, walls merged, one change list), the fit check, saving and reading own presets, module kit read. |
| 8 | e2e: stamp a 4-desk office against an existing corridor wall (that wall reused, not doubled), turn and stamp a WC block; save a box-selected group as a preset and stamp it elsewhere; undo all to the file. |
| 9 | Screenshots: the Presets tab, an office stamp ghost. |
| 10 | No change to modules.json or expand.mjs. |
| 11 | editor.md: presets, stamping, own presets file. |

End per section 5. Commit id `ON11`.
