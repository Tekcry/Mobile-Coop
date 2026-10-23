# S0e check - facility dressing (fresh checker)

Commit `153db3e8` against `S0e.md`, PLAN.md row 0e, SPEC.md section 6. Date 2026-10-23. Read-only on code.

## Verdict: PASS

No blocker. Dressing does not change gameplay beyond the 20 declared walk-in prop boxes, and none of those blocks a route, door, spawn or pad, or creates a ledge or boost target.

## What was checked
- **Shell unchanged.** The diff touches only new dressing functions, imports, `props: []` -> placements and one register row (F5). No 0d box, door or lamp call changed. The props write last (`dress.write(b)` inside the F8 tally), so the first 188 boxes keep their order. The test pins them by checksum (188 boxes, 181 solids, 14 doors, 14 anchors, 43 lamps).
- **The 20 prop boxes:** 7 benches (1 each), vitrine 2, desk 2, 2 seats x 4, kit case 1 (`PROP_COLLISION`, facilityProps.ts:276-296). All are `noLedge` (the end-of-build `b.mark(from, ...)` comes after the write). The tallest is the kit case at 2.4 m, and it is `noLedge`. None has a top in the 3.8-4.5 m band.
  - Benches stand 0.265-0.715 m off a side wall. The 1 m pad inset stays clear. No bench sits on a door wall (L3's far door is on the north wall with its bench on the south; L5's doors are on the south and north walls with its bench on the west; L7's bench is on the north wall with doors on the west and east). The L7 bench ends 0.25 m short of the east wall face, well north of the door opening and slide pocket (z 59.1-61.8), and stays 1.7 m from the L7 medkit (x 102).
  - Lounge: the desk occupies x 0.46-1.54, z 8.4-12.0, and the seats x 3.8-4.6. That leaves a 3 m clear lane (z 9.5-12.5) east to x 6. Spawns (2, 10) and (2, 12) are tested at more than 0.3 m from every box (0.16 m margin).
  - Boost / lip: the nearest 4.4 m lip is A1's wall at x 12, 7 m or more from any prop. Holding-room props are under a 3.2 m lid. Desk top 1.09 + solo reach 3.8 = 4.89, which nothing within reach of the desk meets today (see P4).
- **Light parity.**
  - Every kit glow (panels, skirting, accent slots, handrail) is on its area's circuit (91-97, 10, 98, 90), each a `house` row in `marlowCourseGroups()` (tested).
  - The accent slots are `light: false`, which return before `b.light` (facilityKit.ts:416-424). No lamp was added (43, tested).
  - Gallery props write no box, so they cannot be shot. No lamp means no jam target.
- **Balustrade (`NO_COLLISION`, facility.ts:400).** `handrail` calls only `b.boxes.length` (always 0), `b.box` (no-op) and `b.mark` (no-op), then pushes instances to `visual.instances`. Those are appended to the real kit at facility.ts:666. `door` throws and `light` is a no-op, and neither is reached. Nothing is written to the real builder.
- **Gallery stays out of bounds:** no new collision anywhere in the gallery.
- **Budgets are honest:** the test computes kit triangles per area (`kitTriangles` over the kit JSON report) and prop triangles and draws per area (`propTriangles` / `propDraws` / `check` over the props JSON). Nothing is hard-coded except the 60 k / 12 limits.
- **`detail: false`** (ctcourse.ts:174) is read only through `dressingOn(map)`:
  - world.ts:230 and levelBuilder.ts:443-444: no generated detail pieces (all `collide: false`, `noLedge`).
  - lightShapes.ts:31-32: none in the canonical light shapes either, so the GPU and the gameplay bake stay in agreement.
  - The only other reader is editor/lightView.ts:393, which is dev only.
  - The side effect is a slightly different (consistent) bake: thin skirting and conduit shadows are gone. `ctcourseLight` and `levelFillParity` pass.
- **Hard rules.** `facility.ts` stays Babylon-free (kit and props modules only), strict TS is clean, and no gameplay path reads graphics state.

## Findings
| # | Where | Severity | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| P1 | facility.ts:527-528, 553, 541, 543 | polish | Prop emissives carry no circuit: `signPlate` backlit faces (holding rooms, set side, dock) and the LED lines in `receptionDesk` / `kitCaseWall` (`PROP_LAMP_TINT`). A jammed or shot holding room (91-97 `cutBy: jam, shot`) keeps its plates glowing. The lounge desk and kit case glow while the group-10 cove sits dark (E3). They light nothing, so the meter and guards are unaffected. SPEC 6 allows an ungrouped accent only on the instructors' circuit. | A `group` on `PropPlacement` that the prop renderer dims with its circuit (props system, later). Or, for now, `lamp: [0, 0, 0]` on the holding-room and dock plates. |
| P2 | facility.ts:533 | polish | The L7 vitrine stands 0.16 m up and is 1.2 m deep over a 0.6 m deep plinth. Its front half floats 16 cm off the floor, and it covers the pad outline at z 58 (5.6% of the pad, under the 15% test cap). The pad stays usable. | Give the vitrine a floor-standing base, or move it 0.45 m south off the pad once the old plinth box is dropped. |
| P3 | S0e.md:49 | polish (doc) | "MapDef.detail ... is still on for Marlow Yard (not this file)" contradicts the commit, which sets `detail: false` in ctcourse.ts. | Reword: the detail pass is off for ctcourse as of 0e. |
| P4 | facility.ts:541-546 | note for A1 | The desk top (1.09 m, mantleable) is a step-up. When A1 builds the lounge walls, keep any lip within reach of the desk above 4.9 m solo (5.6 m boosted) or make it `noLedge`. | A1 slice: add the desk to the unplanned-boost-target test. |
| P5 | S0e.md E6 | note for sets | The 7 set-side plates count against each set's 12 prop draws once the sets add their own props. | Set slices include `facility.props` plates in their per-set draw test. |

## Tests
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/ctcourse/facility.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/levelFillParity.test.ts tests/voxelFit.test.ts`: Test Files 5 passed (5), Tests 51 passed | 1 skipped (52), 10.8 s.
- No e2e run here (the laptop runs it).
