# L2-V2 index: light campus v2 S2-S5 (J10; v1 rows L2-S2..S5 re-targeted to v2, Campus v1 dropped)
| Order | Brief | Size (changed lines) | Lamps added | Runs after |
| --- | --- | --- | --- | --- |
| 1 | `L2V2-S2.md` HQ (+ budget helper, shots `--spaces` flag, lux-per-fitting scale) | ~600 | 10 | gates 1-2 |
| 2 | `L2V2-S3.md` labs | ~400 | 10 | S2 merged |
| 2 | `L2V2-S4.md` data hall (+ deck pole arms, A6 fault) | ~450 | 5 | S2 merged |
| 2 | `L2V2-S5.md` Old House, grounds | ~400 | 0-4 | S2 merged |
S3-S5 build in parallel and merge S3, S4, S5 in that order (each appends rows to `spaces/campusOps-v2.json`).
## Gates before any build
1. Michael's S1 walk must say the S1 car park light is right (ROADMAP ~11:45 "let me walk it before doing any more").
   His walk 4.119 answer (~23:00) covered the window and layout ("fail ... nothing really changed"), not the light.
2. Lamp-id cap: `lampGrid` keeps 255 ids (8-bit slots, `src/voxel/lampBake.ts:928`); picture and meter read that grid
   (`lightField.ts:598`). The all-v2 campus (/preview/) has 260 lamps (counted on master 1b20393c7: S1 45, S2 85, S3 32,
   S4 44, S5 54): the last 5 (S5 service stair, circuit 156) are dark today, though lux-grid (each lamp read alone)
   counts them. Every lamp added goes dark the same way. Engine fix (16-bit ids in the grid and both shader loops), not
   map data: the lead routes it. Worst 2 m column now 20 of 24 slots.
## Shared-file risks
`spaces/campusOps-v2.json` (all four); `shots.mjs` (S2 only); `tests/helpers/campusLampBudget.ts` (S2 writes, others
import); the map-wide id and slot budget (each PR re-checks with all five sections); prebake caps (16 MB a section,
48 MB the map: CI build log). Out of scope: unlit links C3 / C4 (`campusOps.ts:42-44`). Checkers: one Opus per batch (S2; S3-S5).
## Shared assumptions (briefs add theirs from A21)
A15 bands over 178 lx: floor 178 lx mean on the lux sum (`lux.ts` `saturated`, PLAN note 2 option a; undo: option b).
A16 BRIEF A8 reversed: J10 edits the v2 light blocks (undo: hand to J17). A17 03:00 = key-ceremony night, site staffed,
every fitting on (A9, Q2). A18 v2 rows in `campusOps-v2.json`, rect = the room's free rectangle (undo: room boxes).
A19 no e2e beyond affected-e2e: production runs v1, no e2e loads v2 (undo: e2e with `?campusv2=N`). A20 at most 3
bakes per section; a space still failing ships logged (prototype mode; undo: a tuning PR after his walk).
## For Michael (lead asks, native choice)
1. Is the S1 car park light right (gate 1)? 2. Interiors at the standard read fully lit in the picture (A14 overlap),
and he called Marlow "blinding on epic": interiors at the standard, or a lower indoor floor (40-100 lx)?

## Michael's answers (2026-10-27 ~11:10, via the orchestrator)
- Indoor light: "Keep the standard" (offices and workshops at real working levels; AS/NZS 1680 bands stand as briefed; A15's 178 lux measure cap stays a tool limit, not a lower target).
- S1 car park light: "Haven't checked": it goes on his next walk card. No L2-V2 build starts until that walk (his "let me walk it before doing any more", ROADMAP Decided 2026-10-26 ~11:45).
