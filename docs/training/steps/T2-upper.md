# Step T2 - geometry: Upper level (Block B)

Model: implementer opus, checker opus. Deps: T1b. No guards, no lights beyond one work lamp per bay (T6 does lights).

## Read
- SPEC.md: Scope, Originality, Building brief, Stealth verbs table, Engine questions (with T0's answers)
- docs/training/T0-facts.md (map building answers)
- BAYS.md lines 7-70 (conventions, offsets, airlock), 71-124 (B1), 125-186 (B2), 831-852 (metrics)
- src/world/levelBuilder.ts 114-404 (every method's signature and doc comment); src/world/mapDef.ts 1-100
- src/world/maps/storey.ts and stairs.ts (helpers; allowed by the originality rule); src/world/maps/index.ts
- src/world/anchors.ts: grep `export const LEDGE`, `REACH`, `HANG`, `CLIMB_STANDOFF`
- Never open another map builder (originality rule)

## Task (decisions)
1. Files: `src/world/maps/bunker.ts` (the `MapDef`: id 'bunker', name 'Fallow', description, theme with `lightLevel`
   0.05 (TUNE), no sun (`sunIntensity` 0), floor 'concrete', grade greys; modes ['course', 'sandbox']; navLayers 5;
   build() calls one builder per level and returns the `MapLayout`), `src/world/maps/bunkerUpper.ts` (B1, A1, B2, A2).
   T3-T5 add `bunkerShaft.ts`, `bunkerPlant.ts`, `bunkerDeep.ts`. Register `bunker` in index.ts (not listed.ts).
2. Every coordinate in world space = BAYS local + the bay's offset (BAYS 0 table). Write a small local helper per bay
   (`at(bay, x, z, y)`) so the code reads like the BAYS tables.
3. Shell: each bay's floor slab, perimeter walls (0.45 outer, 0.2 partitions), and an overhead roof slab at its clear
   height (`mark(..., { overhead: true, noLedge: true })`), so the nav sees the floors and nothing above is a lip.
4. Airlocks A1, A2 (BAYS 0): walls, two `door` anchors 1.2 wide with `locked: true` (the course unlocks them), bench,
   vision panel (a glazed slot, visual only).
5. B1 rooms, corridor, store, lockers (box props named in comments), map table, bench (BAYS B1 table). Spawns: (2, 12)
   and (4, 12) local, facing east (yaw pi/2).
6. B2: both lanes item by item (BAYS B2 table, Lane S mirrored on the south wall with its own order: ladder and
   downpipe swapped at items 4 and 9). Glass walls on z 15 and z 21 (see-through: build them as BAYS says; if the builder
   has no see-through wall, use `fence`-style collision only where the player must not pass and log the choice as an
   assumption). Lane doors at x 24 (`locked: true`). Drop pads and the pit at the heights the `LANDING` bands need
   (re-grep `LANDING`). Windows with `windowAt` (one `open: true`, one `breakable: true`) side by side.
7. Anchors: ladders, downpipes (`pipeV`), the cable-support pipe (`pipeH`), beam ledges (`ledge`, `canClimbUp` false on
   L1, true on L2), and `noLedge` wherever a box top >= 1.9 m is not a planned lip (galleries' back edges, lockers,
   shelving, the overhead slab).
8. `debugPoints`: one per bay vantage (ids 'B1', 'B2'; group 'Fallow') plus 'A1', 'A2'.
9. `scripts/plan-svg.mjs` (does not exist yet): builds the level headless and writes one SVG per storey (1 m = 10 px,
   6 m grid, north up, boxes and anchors labelled) to `test-results/training/plan-<y>.svg`; usage in its header comment.
10. Course data stub: `MapLayout.course` with the B1 and B2 bays and A1, A2 (gates: B2 levers -> lane doors; airlocks)
    so the course runs from the lift to A2 now; T7a completes it.

## Tests (tests/bunkerMap.test.ts, under the NullEngine like the existing map build tests T0 found)
- The map builds; no split gaps on the Upper level (`anchors.splits` empty here).
- Every lip in B1 / B2 is one BAYS names (list them in an exported constant `BUNKER_LIPS`); none else above 1.9 m.
- Metrics: step 0.5, vault 1.1, mantle 1.7, gap 2.2, L2 depth >= 0.38, drop pads in their bands (assert against the
  constants by import, not literals).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs` (look at the Upper SVG against the BAYS sketches; the checker
compares item order and positions within +-1 m); `node scripts/run-e2e.mjs e2e-course smoke`.

## Commit
"training T2: Upper level geometry (B1, A1, B2, A2), plan-svg". Docs: CLAUDE.md (a short "Fallow" line under World and
player), CHANGELOG, LOG, STATE; PC-PASS rows for the B1 / B2 shots.
