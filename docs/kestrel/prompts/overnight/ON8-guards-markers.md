# ON8 - Guard patrol paths and mission markers
Model: Opus, medium effort.
Decisions: 13

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/schema.md` section 3 rows `guards`, `spawns`,
`objectives`, `extraction`, `hides`, `checkpoints` (grep); `docs/kestrel/01-mission-brief.md` (grep `guard`,
`objective`, `insertion`, `extraction`, `intel`; read only those ranges); `docs/systems/ai.md` (patrols, archetypes:
grep `patrol`, `archetype`, `kind`); `src/ai/` walk speed and guard kinds (grep `walkSpeed\|patrolSpeed` and the
archetype list in `src/config`); `src/ai/navBuild.ts` lines 1-20 (cell 0.5, agent radius); the ON6 play-file code in
the editor (load / save / undo of `kestrel.play.json`).

Michael (2026-10-13): per-guard path creation; mission markers (insertion, extraction, objectives, intel) placed in
the editor. Both go to the play file (schema section 3), so the later stages (P06-P08) read them instead of typing them.

| # | Decision |
| --- | --- |
| 1 | **Guard tool** (Build wheel: Mission > Guard): A places a guard (`guards[]`: id, kind from the game's archetypes, employer and job from a list built from the mission brief's roster, space empty until P06). Selection wheel on a guard: Edit path, Properties, Delete. |
| 2 | **Path editing** (per guard): A adds a stop at the dot (`loop[]`: at, wait, face); RB turns the stop's facing (right stick aims); D-pad up / down changes the wait (1 s steps, from 0); X removes the last stop; A on the first stop closes the loop; B ends. Stops on other levels via D-pad level change (stairs between them are the guard's way; the path shows a warning if no stair or ladder joins the two levels). Mouse: click stops, Esc ends. |
| 3 | **Walkability**: each leg is checked against the walls and objects with a simple grid path search at the nav cell size and agent radius (cited from `navBuild.ts`), never the game's AI code changed; a leg with no way through is red with "No way from stop 3 to stop 4". |
| 4 | **Cycle time**: `cycle` = path length / the guard kind's patrol walk speed (cited) + the waits; shown on the card ("Loop 84 m, 71 s"). |
| 5 | **Path drawing**: 3D: a line on the floor with arrows and a facing wedge at each stop, the wait as a number; plan: the same, one colour per guard. Hub > View "Guard paths" shows all or only the selected guard. |
| 6 | **Patrol preview**: Selection wheel on a guard: "Play patrol": a guard figure walks the loop at its speed (waits and facing honoured) in the editor view; with the ON7 guard view on, its sight cone moves with it. Not saved. |
| 7 | **Isolation point**: Selection wheel "Mark alone here": sets `isolation` (at, t along the cycle). |
| 8 | **Mission markers** (Build wheel: Mission > Insertion, Extraction, Objective, Intel, Checkpoint, Hide): insertion = `spawns` (1-4 points, numbered); extraction = `extraction` rect (drawn); objective = `objectives[]` (kind from a list built from the mission brief, order, optional, requires / unlocks by picking other objectives); intel = an objective of kind `intel` (or a new `intel[]` list if the schema has a better home: add the row); checkpoint = `checkpoints[]`; hide = `hides[]` (kind recess, locker, dark, under). Each draws as a labelled marker in 3D and on the plan. |
| 9 | **Walk test**: Tab with "Start at insertion 1" (Hub > Play row) spawns at the first spawn point; markers are not built in the game (P08 does that). |
| 10 | Play file: all of these round-trip byte-identically; ids fresh and readable (`GD1`, `OBJ1`); the change log words them ("Added guard GD3, Night guard, 6 stops, 71 s loop"). |
| 11 | Vitest: path length and cycle, grid path search (blocked and open legs), loop close, stop edit undo, marker round-trip, objective requires / unlocks have no cycles (warn). |
| 12 | e2e: place a guard in Building A's ground corridor, 4 stops, close the loop: cycle shown, all legs walkable; put a stop inside a closed room: that leg red; place insertion, an objective and extraction; save to the sandbox (play file written); "Start at insertion 1" spawns there in the walk test. |
| 13 | Screenshots: a guard path with stops and facing, the patrol preview, the markers on the plan. editor.md: the Mission tools; schema.md rows. |

End per section 5. Commit id `ON8`.
