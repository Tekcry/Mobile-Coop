# Step T5g - rebuild to BAYS v2: B7, A7, B8, A8, B9, L9

Model: implementer opus, checker opus. Deps: the step before (T5c first). No guards; one work lamp per room.

## Read
- BAYS.md v2: section 0 and the sections for B7, A7, B8, A8, B9, L9, their "R1-R8 check" and "Unavoidable elements" tables
- SPEC.md "Course rules" R1-R8; src/world/maps/bunkerDeep.ts and bunker.ts (the v1 build to replace); the earlier rebuilt
  bunker files (pattern); src/world/levelBuilder.ts 114-404 (signatures); the original T2-T5 step files for the
  checks they ran (tests/bunkerMap.test.ts, plan-svg, e2e-anchors)

## Task
0. Add B9's rappel and zipline to the 'rope catchers' test (tests/bunkerMap.test.ts, from T5e) and assert the
   exact traversal anchor set per rebuilt bay, as T5d / T5e did.
1. Replace the geometry of B7, A7, B8, A8, B9, L9 in src/world/maps/bunkerDeep.ts with BAYS v2: compact linear rooms, every element unavoidable,
   one shared course where R3 says, the automatic airlock pad (T5b), glass partitions and observation windows as
   see-through collision (no way round an element through or over glass), dark shell with LED strip fixtures as
   visual-only pieces (T6 lights them).
1a. Undo the T5f interim (A74): drop DEEP_OFFSET's (+17.5, -29) shift for the v2 offsets, shrink BUNKER_BOUNDS to the
   v2 course and restore a fixed bunker area limit in tests/voxelFit.test.ts (166 x 162 or tighter).
2. Course data stubs for these bays: objectives in teaching order (explicit names, R5), gates only where a split is
   listed, airlocks automatic. Update debugPoints (one per room and vantage).
3. Tests in tests/bunkerMap.test.ts: the R1 nav test (the only path from entry to exit passes every element's trigger
   box in order) and the R2 test per element (remove the element's passage: the exit is unreachable); lips, split gaps,
   co-op lips, LANDING bands as before; footprint check (R4).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs`; `node scripts/run-e2e.mjs e2e-course e2e-bunker e2e-anchors smoke`.

## Commit
"training T5g: B7, A7, B8, A8, B9, L9 rebuilt to BAYS v2". Docs: LOG, STATE, CHANGELOG, WALK.md (the bays' checklist lines).

## Then: walk 2 (planned stop)
Block-end checks (full `npm run e2e` in the background, perf trend). Rewrite WALK.md for walk 2 (same format: start
commands, the two URLs, F3 teleports per room, a short per-bay checklist built from the R1-R8 tables), reset the review
page's notes section for walk 2 if the page is updated, STATE "Paused for Michael's walk 2", final message with the
"Next for Michael" block (BRIEF 6), then STOP. On RESUME: apply walk 2 notes (a fix step like T5b, only if notes exist),
then TM.
