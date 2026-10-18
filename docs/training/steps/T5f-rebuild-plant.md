# Step T5f - rebuild to BAYS v2: B5, A5, B6, S6, A6

Model: implementer opus, checker opus. Deps: the step before (T5c first). No guards; one work lamp per room.

## Read
- BAYS.md v2: section 0 and the sections for B5, A5, B6, S6, A6, their "R1-R8 check" and "Unavoidable elements" tables
- SPEC.md "Course rules" R1-R8; src/world/maps/bunkerPlant.ts and bunker.ts (the v1 build to replace); the earlier rebuilt
  bunker files (pattern); src/world/levelBuilder.ts 114-404 (signatures); the original T2-T5 step files for the
  checks they ran (tests/bunkerMap.test.ts, plan-svg, e2e-anchors)

## Task
1. Replace the geometry of B5, A5, B6, S6, A6 in src/world/maps/bunkerPlant.ts with BAYS v2: compact linear rooms, every element unavoidable,
   one shared course where R3 says, the automatic airlock pad (T5b), glass partitions and observation windows as
   see-through collision (no way round an element through or over glass), dark shell with LED strip fixtures as
   visual-only pieces (T6 lights them).
1a. Add A4's wall medkit (BAYS 0.1 / 0.4: A4, A6, A8; T5e's buildAirlock has none; device like A6-MED).
    Undo the T5e interim (A71): move B4 / A4 to their v2 offsets (66, 14) / (70, 8) in bunkerShaft.ts; remove
   `INTERIM_PASSAGE`, its floor / walls / roof build, debug point `B4-X` and the passage rects in the reachability
   test (tests/bunkerMap.test.ts); update the A4 airlock box hard-coded in bunker.ts (`[97, 24, 103, 30]`) and the same box hard-coded in
   tests/bunkerMap.test.ts (~:448, `expect(...A4...).box).toEqual([97, 24, 103, 30])`).
2. Course data stubs for these bays: objectives in teaching order (explicit names, R5), gates only where a split is
   listed, airlocks automatic. Update debugPoints (one per room and vantage).
3. Tests in tests/bunkerMap.test.ts: the R1 nav test (the only path from entry to exit passes every element's trigger
   box in order) and the R2 test per element (remove the element's passage: the exit is unreachable); lips, split gaps,
   co-op lips, LANDING bands as before; footprint check (R4).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs`; `node scripts/run-e2e.mjs e2e-course e2e-bunker e2e-anchors smoke`.

## Commit
"training T5f: B5, A5, B6, S6, A6 rebuilt to BAYS v2". Docs: LOG, STATE, CHANGELOG, WALK.md (the bays' checklist lines).
