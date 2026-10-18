# Step T5d - rebuild to BAYS v2: B1, A1, B2, A2

Model: implementer opus, checker opus. Deps: the step before (T5c first). No guards; one work lamp per room.

## Read
- BAYS.md v2: section 0 and the sections for B1, A1, B2, A2, their "R1-R8 check" and "Unavoidable elements" tables
- SPEC.md "Course rules" R1-R8; src/world/maps/bunkerUpper.ts and bunker.ts (the v1 build to replace); the earlier rebuilt
  bunker files (pattern); src/world/levelBuilder.ts 114-404 (signatures); the original T2-T5 step files for the
  checks they ran (tests/bunkerMap.test.ts, plan-svg, e2e-anchors)

## Task
1. Replace the geometry of B1, A1, B2, A2 in src/world/maps/bunkerUpper.ts with BAYS v2: compact linear rooms, every element unavoidable,
   one shared course where R3 says, the automatic airlock pad (T5b), glass partitions and observation windows as
   see-through collision (no way round an element through or over glass), dark shell with LED strip fixtures as
   visual-only pieces (T6 lights them).
2. Course data stubs for these bays: objectives in teaching order (explicit names, R5), gates only where a split is
   listed, airlocks automatic. Update debugPoints (one per room and vantage).
3. Tests in tests/bunkerMap.test.ts: the R1 nav test (the only path from entry to exit passes every element's trigger
   box in order) and the R2 test per element (remove the element's passage: the exit is unreachable); lips, split gaps,
   co-op lips, LANDING bands as before; footprint check (R4).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs`; `node scripts/run-e2e.mjs e2e-course e2e-bunker e2e-anchors smoke`.

## Commit
"training T5d: B1, A1, B2, A2 rebuilt to BAYS v2". Docs: LOG, STATE, CHANGELOG, WALK.md (the bays' checklist lines).
