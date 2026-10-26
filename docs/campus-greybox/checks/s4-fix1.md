# campus-greybox S4 fix 1 - CR8 / CR8-west sills climbable
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 3 (Opus, cloud), 2026-10-26, to `cloud-queue:briefs/campus-greybox-s4-fix1.md` (the
S4 lane checker's one blocker, 2026-10-25 ~23:15). Base `feature/campus-greybox-s4` 8379670b2; pushed on the same branch.

## The defect
`s4.ts` deleted `noLedge` on the two sill strips under the side grilles, so the generated ledges at 4.4 came from strips
0.2 m (dock wall P) and 0.3 m (hall wall T) deep: `canClimbUp = depth >= LEDGE.climbDepth` (0.38, `anchors.ts:414`), so
CR8 and CR8-west hung but never offered the climb-up (`attachController.ts:714`). Read on the base: the generated
ledges were (13.9 / 14.1 / -4.15 / -3.85, z 19.6875..20.8125, top 4.4) `canHang` true, `canClimbUp` false.

## What changed
- `src/world/maps/campusV2/s4.ts`: the `delete sill.noLedge` loop is gone (both sills stay noLedge; the float-equality
  lookup that threw on a miss goes with it). In its place four manual ledges at the sill tops (`b.ledge`, `makeLedge`:
  `canHang` and `canClimbUp` true, normal (tz, -tx)):
  - CR8, dock side: `(14.1, 19.5) -> (14.1, 21.0)`, normal +x; plenum side `(13.9, 21.0) -> (13.9, 19.5)`, normal -x.
  - CR8-west, battery room side: `(-4.15, 21.0) -> (-4.15, 19.5)`, normal -x; plenum side `(-3.85, 19.5) -> (-3.85, 21.0)`,
    normal +x.
- `tests/campusV2S4Coop.test.ts`: `ledges` is now the build's list (generated plus `b.anchors.ledges`, as
  `LevelBuilder.build` merges them); the "as briefed" case now expects the sills to stay noLedge; a new case requires a
  `canHang && canClimbUp` ledge at 4.4 along each sill on the boost face and on the plenum face (normal checked).
- `tests/campusV2S4Graph.test.ts`: the unplanned-lips check reads the manual ledges too (copies into a fresh
  `TraversalAnchors`, then `generateLedges`, then the `noLedge` points, as the build does); a pre-existing lint error in
  the same file fixed (`let shutLen = 0` -> `let shutLen: number`, no-useless-assignment: CI lint would fail on it).
- `changes/feature-campus-greybox-s4.md`: the G4.2 line says the sills climb.

## Numbers checked against the geometry (all as the brief gave them)
- Dock wall: `wall(b, false, 14, ..., P)`, P 0.2: faces x 13.9 (plenum) and 14.1 (dock).
- Hall west wall: `wall(b, false, -4, ...)`, T 0.3: faces x -4.15 (battery room) and -3.85 (plenum).
- Grille holes `[19.5, 21.0, 4.4, 5.9]` in both walls: the sill strips are y 0..4.4, z 19.5..21.0; sill top 4.4.
- Plenum floor: the lobby slab, top 3.2 over x -4..14 (`slab(..., 3.2)`): 1.2 m under the sill, not level, so the plenum-side
  ledges are added (step 3).
- No `b.noLedge(x, z, r)` point near either sill (the only S4 ones are at (34.6, 22.4 / 23.6)), so the build keeps them.
- `climbRoom` (`attachController.ts:1057`) tests the stand capsule HANG.out + 0.45 inside the lip at top + 0.05; the
  existing "rule 5" cases already require that air clear in the plenum (y 4.45..6.2) and the opening 1.5 high: green.

## Tests
- New case on the base 8379670b (tests changed, `s4.ts` not): **fails**, `CR8 face x 14.1: hang and climb up: expected
  false to be true` (and the changed "as briefed" case: `CR8: expected undefined to be true`, the sill not noLedge).
- On the head: `npx vitest run --maxWorkers=2 tests/campusV2S4Coop.test.ts tests/campusV2S4Graph.test.ts
  tests/campusV2S4.test.ts tests/campusV2S4Guards.test.ts tests/campusRuntimeNav.test.ts tests/campusV2.test.ts` **78 / 78**
  (77 on the base before the test change, plus the new case). Also `tests/campusS4.test.ts tests/campusV2S4Lights.test.ts
  tests/campusV2S4Screen.test.ts tests/campusV2S4Sync.test.ts` 62 / 62.
- `npm run typecheck:fast` clean; eslint clean on `s4.ts` and both test files.

## Pending PC run
- E2E-1: the CR8 / CR8-west leg-up, hang and climb-up into the plenum on the laptop (the climb prompt engages; a
  hang-drop back out from the plenum).
