# sector-fixes slice R - co-op-only routes (plan)

Branch `feature/sector-fixes-r` in `C:/NightShift/Mobile-Coop-sector-fixes-r`, from master 4.55.1 (170ee701). Job lead:
Night Shift | Course Ready Build (track A), started 2026-10-22 ~18:00 on the orchestrator's assignment.

## The ask
Michael (2026-10-22 ~01:40, item 9 of docs/sector-fixes/BRIEF.md on feature/sector-fixes): "Add more coop only routes to
warehouse." BRIEF slice R: boost spots, relay climbs, team doors, rope points; each section at least one, following
docs/level-design.md and the co-op move set.

## Rules
- docs/level-design.md section 11, except the solo-first rules (11.1, 11.2 "solo invariance", 11.4 "anyone can leave
  alone"): the game is co-op only (G2, G50). Kept: 11.3 co-op lips out of solo reach (`WALL_JUMP.maxUp` 3.8 + 0.5) and
  within co-op reach (`TEAM.boostMax` 4.5): build at 4.3-4.5 m; 11.4's revive half (a downed player on a co-op surface
  can be revived: the reviver within 1.5 m of height) and no softlock (every co-op-only surface has a way back down
  for one player alone: a drop, a ladder down, a stair); 11.5 every lip in the band is planned or `noLedge`.
- G151: team moves work anywhere with room (no markers). Co-op verbs that exist: leg-up / boost, relay (the boosted one
  pulls the partner up), human ladder, throw, hang-down, two-person rope (`src/game/teamMoves.ts`).
- Each route is ordinary architecture with a real reason: a high loading door, a mezzanine with its stair removed, a
  pulled-up fire ladder, a door bolted from the inside.
- Out of bounds for this slice: lasers and camera files (#127, slice C), lampBake and lights (Menu Notes' slice L).
  New routes add no lamps; they go where the existing light already falls or into the dark.
- Guards' nav: no route geometry blocks a guard path; a bolted door is never on a guard route (e2e-sectorops M8).

## Work split (parallel)
| Part | Owner files | What |
| --- | --- | --- |
| R1 | `src/world/maps/warehouseS1.ts`, `tests/warehouseCoopS1.test.ts` | Section 1 co-op-only routes |
| R2 | `src/world/maps/warehouseS2.ts`, `src/world/maps/warehouse.ts`, `tests/warehouseCoopS2.test.ts` | Section 2 |
| R3 | `src/world/maps/warehouseS3.ts`, `tests/warehouseCoopS3.test.ts` | Section 3 |
| RT | `src/game/sectors.ts`, the Sector Ops mode / host / client code, `src/world/maps/warehouseSectors.ts`, `tests/sectorBolt.test.ts` | Team doors: a door bolted from one side in Sector Ops (the course's B2 rule) |
| RE | `scripts/e2e-sectorops.mjs` | After R1-RT: e2e coverage of the new routes and the bolt |

Team-door contract: each section file exports `S<n>_BOLTS: readonly { at: [number, number]; side: [number, number] }[]`
(door plan centre; `side` the unit plan direction from the door toward the side that can unbolt it). The door itself is
built `locked: true, breachable: false` in the section file. RT reads the three lists in `warehouseSectors.ts`.

## Assumed decisions
- A1: team doors reuse the course bolt rule (a door locked until a player on the far side unbolts it). Undo: drop the
  `S<n>_BOLTS` entries and build the doors unlocked.
- A2: co-op-only means the surface or passage cannot be reached by one player alone from the floor it starts on; a way
  back down alone always exists. Undo: none needed (routes are extras on top of the existing three per section).
- A3: a player downed on a co-op-only top cannot be revived there (the partner has no way up alone); the revive
  window runs out and the checkpoint respawn takes over, so nothing softlocks. 11.4's revive half is waived for these
  surfaces only. Undo: add a one-way solo climb up (which makes the surface no longer co-op-only).

## Michael's answers
- M1: Michael 2026-10-22 ~21:20 (through the orchestrator, "Add another"): section 2 add another co-op route (only C1b +
  the team door after the fix round). Done in the e2e fix round: C2, the dispatch mezzanine's landing on the x -4 wall
  (`S2_LANDING`, R2.md), at least 0.5 m clear of a top-gear solo running jump (`tests/helpers/soloJumpReach.ts`; 0.85 m).
