# A7 cabinet (marlow-a7-cabinet): T2's spot hidden from the technician

Job `marlow-a7-cabinet`, branch `feature/marlow-a7-cabinet`, a small fix off master, 2026-10-23. Why: guard-ai S23 (PR #254)
makes a guard pick the best-seen player, so the technician at R0 (84.4, 60.6, facing east) saw the client waiting at T2's
spot (96.65, 61.5) through both of the cage's mesh faces (`b.fence` passes sight) and train 34's `e2e-ctcourse:4` failed
(meter 0 -> 0.51, SPOT2). The set doc needs T2's spot hidden from R0.

## The box
`A7_CABINET = { x0: 90.4, x1: 91.6, z0: 60.2, z1: 63.7, h: 1.75 }` (`src/world/maps/ctcourseSets/a7DataHall.ts`), one solid
`noLedge` box built in the A7-2 tally right after the kick-panel loop with the file's `slab` helper and the rack colour.

- Plan: centred on x 91.0, the midpoint of the two hack spots, so the lamp lines cross it at their lowest symmetric height.
  South face 0.15 m off the south kick panel (clear of its 3 cm plate and rib skins); north face 0.2 m short of the door
  span (63.9), so the door-to-door walk at z 64.5 keeps 0.5 m beside a 0.3 m body.
- Height 1.75, not the triage's 1.85: at 1.85 the existing assertion that each hacker sees the other terminal's state lamp
  (1.95) fails (that line crosses the cabinet at 1.767 from a 1.6 m eye). At 1.75 every guard line is still blocked with
  margin (below), the state lamp clears by 1.7 cm and the ready lamp (2.25) by 16 cm.
- Nav seed moved: the cage's seed (91, 63) sat inside the cabinet; now (91, 64.8) on the crossing strip.
- No dressing on it (a plain greybox box; a rack prop skin is a polish-list item).

## Sight lines (unit test, the file's own `blockers`: segment vs the built level's collision boxes, the mesh is no box)
Guard eye `EYE_STAND x grunt scale` = 1.568 m. Body samples: hips 0.85, chest 1.35, head 1.6 (`remoteHeadY` standing) and a
tall head 1.7. Targets: T2's spot and 0.3 m round it (9 feet).

| From | Lines | Open with the cabinet | Open without it |
| --- | --- | --- | --- |
| R0, the front aisle's south turn (84.4, 57.4), aisle C's east end (84.4, 65.7), aisle B z 61.5 x 78.5-85.35 (0.25 m steps), the front aisle x 84.4 z 57.4-65.7 (0.25 m steps): 65 eyes (in the test) | 2340 | 0 | 1458 |
| R0 alone (teeth, in the test) | 36 | 0 | 27 (every chest and head line; hips stop on the east kick panel) |
| Aisle B across its width (z 60.6-62.4, 140 eyes; probe, not kept) | 5040 | 0 | 3780 |
| Aisle C, x 77.5-84.4 at z 65.7 (probe) | 1008 | 0 | 756 |
| West cross aisle, x 77.5 z 57.4-65.7 (probe) | 1224 | 0 | 393 |
| Cage's north apron, x 84-96, z 67-71 (probe) | 1404 | 946 | 964 |

The R0 chest and head lines are stopped by the cabinet alone (the test pins `blockers` = [cabinet]). The north apron is off
his loop (the set doc's blind side, `a7-cam1`'s area); from there T2 shows through the north and east mesh. Open item,
not this job.

Margin: the guard lines cross the cabinet at most ~1.66 m (aisle B's west end to a 1.7 m head), so a head up to ~1.83 m is
hidden from x 78.5 and ~1.9 m from R0.

## Lamps (players' views)
From a standing eye of 1.6 m at one hack spot to the other terminal's lamps, the height over the cabinet's near edge:
ready lamp (2.25) 1.910, state lamp (1.95) 1.767; both clear of 1.75 (existing lamp test unchanged and passing, plus a new
case that pins the margin). Eye 1.7: 1.962 / 1.819. Eye 1.3 (half crouch): ready 1.753 clear, state 1.610 hidden. Eye 1.05
(crouched): both hidden, but that eye was already below its own side's kick panel line before the cabinet. The jam line
from T2's spot to cam1's side passes 0.18 m north of it (test unchanged, passing).

## Crossing and nav
- Door to door at z 64.5 (body 0.3): clear, x 85.4-96.6. With 0.3 m spare (radius 0.6) inside the cage: clear.
- e2e step 7 `moveHost` targets (85.2, 63.3), (87.0, 64.5), (95.2, 63.3), (97.2, 64.5), (99.0, 59.4): teleports, each one
  unblocked and >= 0.6 m from the cabinet (nearest: (87.0, 64.5), 3.5 m).
- Runtime nav grid (`tests/helpers/runtimeNav.ts`, the game's `navGridFromLevel`): the cabinet's centre cell is blocked, a
  path joins the cage's west and east halves (88, 61) -> (94.5, 61) round its north end, every A7 seed, both hack spots
  and R0 are walkable.

## Light
The box is 1.2 x 1.75 x 3.5 (>= `CANON_MIN_THICK`), so it is in the canonical light shapes. `CTLIGHT_PRINT=1` measured A7's
16 spots unchanged to two decimals (T1 0.67 pool, T2 0.61 read, every cut and standby as before): no `.light.json`
regenerated. Its nearest lamps are row 70's (91.0, 57.4) and (91.0, 69.0); neither reaches T1's or T2's spot past it.

## Files
- `src/world/maps/ctcourseSets/a7DataHall.ts`: `A7_CABINET`, the box in A7-2 (register text names it), the cage nav seed,
  header comment (greybox 47 / 37).
- `tests/ctcourse/a7DataHall.test.ts`: derived edits: `GREY.boxes` 46 -> 47, `GREY.solids` 36 -> 37, `GREY.checksum`
  17438.80738438888 -> 17774.157384388884, the greybox case's title (47 / 37); imports (`EYE_STAND`, `ctcourse`,
  `runtimeNav`, `A7_CABINET`). New describe "the cage's equipment cabinet", 6 cases: the box; every guard line blocked; teeth
  (without it R0 sees chest and head; R0's lines are the cabinet's own); the lamp margins; the crossing and e2e teleports;
  the nav grid.
- `docs/marlow-final/sets/a7DataHall.md`: the cage row and "What he sees".
- `changes/feature-marlow-a7-cabinet.md` (kind: patch).

## Results
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run tests/ctcourse/a7DataHall.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`:
  4 files, 111 passed, 1 skipped (the light print case); A7 file 59 (53 before + 6 new).
- No e2e on this machine: `e2e-ctcourse` (part `:4`) on the laptop queue with guard-ai S23 in the train is the real check.

## Open
- The north apron still sees T2 through the north and east mesh (off his loop; a lured or searching technician could).
- A crouched hacker with a low camera may lose the partner's state lamp over the cabinet; the ready lamp shows from a 1.3 m
  eye up. Playtest item: "is the ready lamp readable over the cabinet?"
- Polish list: dress the cabinet (a rack prop skin, vents) in a visual pass.
