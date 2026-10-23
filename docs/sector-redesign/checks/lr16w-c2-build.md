# LR16-W part C2 - Marlow Yard S7 stair light (build report)

Builder: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w-c2` off `67f3661a`. Brief: `docs/sector-redesign/briefs/LR16-W.md`
"Part C2".

## Built
- `src/world/maps/ctcourse.ts`: one added block after the S7 stair loop (`:602-616`): an LED wall bulkhead on the south
  wall over the stair head. Light point (142, 6.4, 0.30) = (x0 + CT_OBST + 1, 6.4, wall face 0.15 + 0.15), kind `spot`,
  cone `makeCone(0, -0.819, 0.574, 0.96)` (forward-down, as the warehouse's WALL_N), radius 2.5 (reach 4.0), intensity
  0.05, colour WHITE, fixture `{ sx 0.3, sy 0.16, sz 0.07, oy 0, model 'bulkhead', base 'wall', yaw 0, mount 0 }`, no group.
  It sits under the ceiling haunch's toe (the haunch reaches 6.65 at z 0.30) and is not in the test's `NEW_LAMPS`.
- The import line `:12` became `import { makeCone, type LightFixture } from '../lights';` (the block needs `makeCone`).
  So the change is one added block plus that one import line.
- `tests/ctcourseLight.tuned.json`: S7 stair step 1 (top) 0.31 -> 0.46, S7 stair step 2 0.40 -> 0.41; one sentence added to
  `_note` ("LR16-W: S7 stair light ..."). No other entry moved.

## Numbers used (probe on the base bake with the lamp added, bounce synced to the intensity)
| intensity | step 1 (142, 3.3, 1.0) | step 2 (143, 2.2, 1.0) | step 3 (144, 1.1, 1.0) |
| --- | --- | --- | --- |
| none (base) | 0.312 | 0.401 | 0.527 |
| 0.02 | 0.366 | 0.404 | 0.527 |
| 0.04 | 0.426 | 0.407 | 0.527 |
| **0.05 (built)** | **0.456** | **0.409** | **0.527** |
| 0.08 | 0.549 | 0.415 | 0.527 |
Step 1's body (head 4.9) is 1.4-3.1 m under the light, deep in the photometric near field, so the night level is low
(0.05): step 1 lands in the 0.4-0.55 route rim with 0.10 over its 0.33 minimum (brief asked >= 0.36). Steps 2 / 3 are at
the cone's edge / out of reach and hardly move. At 0.3 or more step 1 clamps to 1.00.
Every other S7 point (routes, leg-up square and floor, rope holder, strip, panel, all eight S7 corners incl. x0 + 9.8 /
15.4 at z 0.6, the A7 corner) read identical with the lamp off and on at 3 decimals. The lamp's own term is 0 at the
wall-top test points (139.5 / 142.5, 1.6, MID), at (141.8, 1.6, 0.6), (147.4, 1.6, 0.6) and on the stair foot (142, 0.5, 1.0).
Worst 2 m column: 9 lamps of 24 slots.

## Tests (vitest single files, `--maxWorkers=2`, slot lock)
| file | result |
| --- | --- |
| `ctcourseLight` | 12 passed, 1 skipped (the print case) (base: 1 failing, step 1 0.31 < 0.33) |
| `ctcourse` | 38 passed |
| `lampBoxAlign` | 6 passed (the audit over every map: the bulkhead is neither embedded nor wall-flagged) |
| `lampAtlasFit` | 6 passed |
| `lampFlicker` | 20 passed |
| `lights` | 10 passed |
`npx tsc --noEmit` clean; `npx eslint src/world/maps/ctcourse.ts` clean. Before the re-take the tuned check failed only on
"S7 stair step 1 (top): 0.31 -> 0.46" (step 2's 0.01 move was inside 0.08; re-taken anyway so the table matches).

## Skipped
- Laptop (Test Runner): `e2e-ctcourse` (`E2E_GPU=1`) and the GPU sheet row "S7 stair from the rope wall's far side"
  (base / after). Not run here (no e2e on the desktop for this part).

## Light parity
One baked lamp with a drawn bulkhead model: the picture (the bulkhead and its pool on the stair head), the meter
(`LightField.bodyLevel`) and the guards (`fieldLight`) read the same registry entry and bake.

## Merge note (orchestrator)
`ctcourse.ts` is Marlow Build's map. `origin/feature/marlow-final` (11cff526) has retired the old bunker bays: its
`ctcourse.ts` is the set-merge module (A1-A8 from `ctcourseSets/`), the S7 rope-wall stair no longer exists there, and it
deletes `tests/ctcourseLight.tuned.json`. When marlow-final lands after this part, take marlow-final's side of both files:
this part's block and its tuned entries then go away with the old bays (nothing to port). If this part lands after
marlow-final, it does not apply: drop it.

## For Michael to try
Marlow Yard station 7, the far side of the rope wall: a small bulkhead glows on the south wall over the return stair; the
top step reads in the meter's twilight band (not lit, not dark), the steps below unchanged.
