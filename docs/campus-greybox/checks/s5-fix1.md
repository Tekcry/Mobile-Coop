# campus-greybox S5 fix 1 - the three co-op lips climbable
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 3 (Opus, cloud), 2026-10-26, to `cloud-queue:briefs/campus-greybox-s5-fix1.md` (the
S5 lane checker's one blocker, 2026-10-25 ~23:35). Base `feature/campus-greybox-s5` 589f9b69d; pushed on the same branch.

## The defect
`generateLedges` (`anchors.ts:414`) gives `canClimbUp` only to a piece at least `LEDGE.climbDepth` (0.38) deep across its
lip, and `attachController.ts:714` offers the climb only then. CR8-s5's gutter kerb was 0.30 deep, CR9-s5's coping 0.30 and
CR10-s5's smoke hatch west kerb 0.10: all three hung, none climbed.

## What changed
- `src/world/maps/campusV2/s5.ts`: each lip piece 0.40 deep, the lip face where it was (the lip data `S5_COOP_LIPS` and
  `S5_LIP_SEGMENTS` unchanged):
  - CR8-s5 `bx(b, -32, -26, L1, L1 + 0.2, 43.75, 44.15, STEEL)`: face z 44.15 (was z 43.85..44.15).
  - CR9-s5 `bx(b, -32.25, -31.85, R, R + 0.2, 30, 33, STEEL)`: face x -31.85 (was -32.15..-31.85); still on the wall top
    and the roof slab, between the parapet runs z 18..30 and 33..44 (x -32.2..-32).
  - CR10-s5 `bx(b, sh0 - 0.4, sh0, L1, L1 + 0.2, shz0 - 0.1, shz1 + 0.1, STEEL)`: face x -28.6 (`S5_BOX.smokeHatch[0]`;
    was sh0 - 0.1).
  Every number as briefed; checked against the geometry (`S5_BOX.smokeHatch` [-28.6, 41.4, -27.4, 42.6], the parapet
  rails at x -32.2..-32, the low roof slab -32..-26 x 18..44).
- `tests/campusV2S5Coop.test.ts`: the pinned piece extents (`PIECES`) updated; a new case: each lip's ledge has
  `canClimbUp`, and the body (radius `MOVEMENT.radius`, `MOVEMENT.standHeight` tall) fits 0.6 m inside the lip at
  lip + 0.05 (CR8 z 43.55, CR9 x -32.45, CR10 x -29.2, each at the lip's middle); "exactly one canHang ledge per lip,
  none elsewhere" now counts only ledges with a true drop over 1.9 (the brief's preferred option, as the LD 11.8 case
  already does), so the thicker pieces' back faces (a 0.2 drop to their roof) are not lips; `trueDrop` moved above it.
- `tests/campusV2S5.test.ts` (P1 roof case): the three `findBox` extents updated to the 0.40 pieces (a rule test that
  pins the pieces, as the brief allows).
- `changes/feature-campus-greybox-s5.md`: the P4 line says the lips climb.

## Tests
- On the base 589f9b69 (the new case only): **fails**, `CR8-s5 canClimbUp: expected false to be true` (the loop stops at
  the first lip; CR9-s5 and CR10-s5 are 0.30 / 0.10 deep, under 0.38, by the same rule).
- On the head: `npx vitest run --maxWorkers=2 tests/campusV2S5*.test.ts tests/campusS5*.test.ts
  tests/campusRuntimeNav.test.ts tests/campusV2.test.ts` **116 / 116** (11 files; rules 1-5 per lip and LD 11.8 green).
- `npm run typecheck:fast` clean; eslint clean on `s5.ts` and both test files; changesFragments 1 / 1.

## Pending PC run
E2E-1: the climbs on CR8-s5, CR9-s5 and CR10-s5 (the climb prompt engages after the leg-up).
