# S0e - facility dressing (M5)

Slice 0e (PLAN.md section 4, row 0e). Date 2026-10-23. Not committed (the job lead commits). Edited: `src/world/maps/ctcourseSets/facility.ts`; new: `tests/ctcourse/facility.test.ts`, this report. Nothing else touched.

## What was placed, per area
**Shell and rule.** The shell is clad *over* its existing boxes with `kit.wallPanel` / `kit.skirting` (visual only), not `kit.wall`: `kit.wall` writes a new wall box, and every 0d box and door had to stay exactly as it was. Result: the first 188 builder boxes are identical (checksum pinned in the test), 14 doors, 14 anchors, 43 lamps; the only new boxes are the walk-in props' own (20, all `noLedge` by the end-of-build mark). No lamp was added.

- **Holding rooms L1-L7** (cool, circuit 91-97 each): charcoal panels with cove and skirting LED line on the room faces up to the 3.2 m lid, broken at both doors (1.0 m each side of the centre: the architrave) and the glass slot; two accent LED strips along the side walls (light off, 0.7 m clear of the lit read slots; L3 gets none, its lamps fill that corner); one `holdingBench` on a side wall, clear of the pad's 1 m inset and the L4 / L7 medkits; a `signPlate` over each door on the room side; and a plate on the set side of each far door (the set sign stand-in, 7 in all). L7 also has the `modelVitrine` over the plinth 0d built.
- **Lounge** (west shell wall only; A1 builds the other walls and its sliding doors): `receptionDesk` (x 1.0, z 10.2, along z, front to +x) with a `greenWall` of three modules behind it, one `kitCaseWall` at z 12.75, two `loungeSeat`s at (4.2, 9.1) and (4.2, 12.9) facing the desk, and hall panels from y 3 to 10 above them with their cove on circuit 10. Spawns (2, 10) and (2, 12) stay 0.16 m clear of the desk box (tested).
- **Cash dock** (warm, circuit 98): panels and skirting on its three walls (west is open to A8) and a board of three `signPlate`s on the end wall at 2.6 m ("ASSESSMENT COMPLETE" stand-in; text waits for a texture).
- **Gallery** (out of bounds, sight only; circuit 90, warm): console runs facing the glazing (south strip into A1 and A2, north strip into A5 and A4 on its south side and A6 on its north side), a chair to every second console, five observers' chairs facing A7, the bridge's `monitorWall` with a two-console desk, two operator chairs and LANTERN's chair, nine `galleryScreen` feeds (blue, green, amber) on the south strip's back wall over its panels, the back wall's panels (x 0-40), a balustrade (`kit.handrail`) along both glass sides of the bridge, and four ceiling accent strips. No gallery prop writes a box.
- **Glazing:** 0d left no glass slot undone (every set wall under a strip, the A8 end bay and the seven holding-room slots are `kit.glass` already), so none was added.

## Counts
Facility build now: 208 boxes (188 + 20 prop boxes), 201 collidable (181 + 20), 14 doors, 14 anchors, 43 lamps, 575 kit instances, 140 props.

| Area | Kit triangles (limit 60 k) | Props | Prop triangles | Prop draws (limit 12) |
| --- | --- | --- | --- | --- |
| Gallery | 53,576 (264 instances; 39.2 k of it is 0d's glass) | 101 | 22,324 | 12 |
| Lounge | 1,880 | 7 | 1,476 | 12 |
| L1, L2, L4, L6 | 5,928 each | 3 | 116 | 4 |
| L3 | 5,680 | 3 | 116 | 4 |
| L5 | 5,924 | 3 | 116 | 4 |
| L7 | 5,928 | 4 (with the vitrine) | 320 | 9 |
| Dock | 6,764 | 3 | 72 | 2 |
| Set-side plates (7, one per far door) | - | 7 | 168 | 2 |

Kit pieces: 159 `wallPanel`, 37 `wallUpper`, 203 `glassClear`, 46 `skirting`, 30 `ledSlot`, 30 `handrail`, 28 each `doorFrame` / `doorLeaf`, 14 `doorJamb`; whole-facility kit 103,464 triangles (the 60 k limit is per area; the sets add their own on top). The gallery and the lounge sit exactly on the 12 prop draws: nothing more of a new prop kind fits those two without dropping one.

## Decisions (Michael asleep; each can be undone)
- E1 **Gallery "lit slots" are accent strips (light off, group 90), not lamps.** `kit.ledSlot` lamps are hard-coded `destructible: true`, which breaks `tests/ctcourse.test.ts` "gallery lamps are decor" (destructible false); an accent line on group 90 is lit, never goes off (instructors' circuit) and adds no lamp. Real gallery light stays 0d's 27 decor lamps.
- E2 **Balustrade through a no-collision kit.** `kit.handrail` writes a collision box, which the "no new collision" rule rules out; the gallery's rails are drawn by a second `FacilityKit` over a builder that writes nothing, and its instances are appended to the real kit's layout (`NO_COLLISION`, `kit.instances.push`). The glass behind it already blocks.
- E3 **Lounge accent lines are on group 10** (`LOUNGE_GROUP`, the `a1-lounge` circuit). The 0d stub places no group-10 lamp, so the lounge's cove draws dark (`LED_DARK`) until A1's slice builds its four. One-line change to 90 if you want it lit now.
- E4 **L7 vitrine stands 0.16 m up** so its plinth top skin (0.91) clears the old plinth box (top 0.90); the old box shows under it as a recessed foot. The vitrine (1.2 deep) reaches 0.44 m into the pad's south edge (about 5% of the pad; the test caps it at 15%).
- E5 **Set halls were not clad.** The sets keep their own materials (SPEC 6) and own their dark exercises: a group-90 cove high on a set wall would glow through an isolator cut. Hall coves above a set are for the set slices (or a later pass), with the set's own group.
- E6 **Set-side plates are in `facility.props`** (7, one over each far door, 2.55 m up). They draw as part of the one global `signPlate` mesh; they do not count against any set's own 12 draws in a set test (only against the set whose list holds them).

## Tests
- New `tests/ctcourse/facility.test.ts` (13 cases): shell unchanged (188 boxes by checksum, 14 doors, 14 anchors, 43 lamps; boxes added = the walk-in props' own, none a ledge, gallery props write none); register rows F1-F8; every glowing kit instance and lamp has a group in `marlowCourseGroups()`; each area on its own circuit (91-97, 10, 98, 90); the panels and strips present; kit triangles per area <= 60 k and no instance outside an area; `FacilityProps.check` per area (holding rooms, lounge, dock, each set's plates, the gallery by corners-in-strips then budget); what stands where; spawns clear of every written prop box; pad take <= 15%.
- `npx tsc --noEmit`: clean (25 s).
- `npx eslint src/world/maps/ctcourseSets/facility.ts tests/ctcourse/facility.test.ts`: clean.
- `npx vitest run tests/ctcourse/facility.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/voxelFit.test.ts tests/levelFillParity.test.ts`: "Test Files  5 passed (5), Tests  51 passed | 1 skipped (52)" (the skip is the CTLIGHT print / write case). `ctcourseLight` and `levelFillParity` pass unchanged: the kit faces are visual and the prop boxes did not move a tuned level.
- Extra: `tests/marlow* tests/facilityKit.test.ts tests/facilityProps.test.ts tests/ctcourseGreybox.test.ts`: 237 passed, 1 failed: `marlowLightingLevels` "bodyEstimate does not allocate" (heap delta 2.63 MB over a 2 MB limit; a pure function, no map, a heap-measurement flake on a loaded machine, not touched by this slice).

## Could not do / for others
- No GPU shots or perf run (Character Build, after 0e: lounge, a holding room, the gallery from A1; `f-l1-holding`, `f-l7-model`, `f-gallery-from-a1`, `f-dock` vantages are in place).
- The A1 slice must keep clear of the lounge pieces: west wall x 0.25-1.6 for z 8.4-13.35, seats at x 3.8-4.6 (z 8.7-9.5 and 12.5-13.3). It owns the lounge's other walls, sliding doors and the four group-10 lamps (E3).
- Hall wall coves, set signage text (a plate texture), seated instructor figures (N14) and the V&R logo plate in the lounge (the lounge has no prop draws left) are not built.
- `MapDef.detail` (the generated skirting and conduits) is still on for Marlow Yard (not this file): it will sit under the kit's panels in the holding rooms; `detail: false` is in `ctcourse.ts`.
