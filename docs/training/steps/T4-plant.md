# Step T4 - geometry: Standby Plant, Mock Site, Stair 6 (Block B)

Model: implementer opus, checker opus. Deps: T3. No guards; one work lamp per bay; no device logic (T7a).

## Read
- BAYS.md 7-70 (conventions), 300-385 (B5), 386-485 (B6), 486-492 (S6, A6), 831-852 (metrics)
- src/world/levelBuilder.ts 125-224 (box, wallX / wallZ with gaps - gap lists sorted, stairs, lowCover, highCover),
  261-275 (duct, windowAt, door), 362-404; src/world/maps/stairs.ts (stair layout); src/world/maps/storey.ts
- src/world/mapDef.ts 44-66 (hideSpots, switches, alarms, security); src/security/data.ts (camera record fields only)
- The existing bunker files (pattern)

## Task (decisions)
1. `src/world/maps/bunkerPlant.ts`: B5, A5, B6, S6, A6.
2. B5: three gensets (3.0 high, full cover, their tops planned lips: list them in `BUNKER_LIPS`), the grating walkway
   strip, the cable trench under it (1.5 deep x 1.2 wide crouch duct per 16.7.3, floor y 4.5, lift-out panel openings
   at x 44 and x 4 as floor holes with the panels as hide spots), the cable gallery at 3.5 (x 2..38) with its ladder at
   x 37 and a planned hang-drop at x 2, the switch room (glazed west wall), the fuel bay and day tank, the monitoring desk,
   the A5 door (`locked: true`: the mains gate). Exhaust pipes visual only.
3. B6 rooms per the BAYS B6 table: reception and counter, corridor with the L, open office with 1.5 partitions and the
   glazed manager's office, the control room mezzanine at 3.6 with its glazed south front and the enclosed stair behind
   a door, locker room, records room, mantrap (two doors, the iris point), server room with rack rows and the exit door
   to S6. Every reader door is a `door` with `locked: true`. The supply duct from A5's service passage in the ceiling
   void (3.4-4.6) along z 16 to the records ceiling grille (engine duct with a ceiling exit: SPEC E6); entry by a
   plant platform in A5's service passage, feet 2.2 (T0: grate within 1.4 of the feet).
4. Device mount points only (no logic yet): the four camera positions, the desk seat, the panel, readers, iris, beams,
   PIR, the CRAC fault point, the exit keypad, as an exported table `BUNKER_DEVICES` (id, kind, local -> world position,
   facing) that T7a reads. Fixtures for cameras as small boxes (visual, `collide` false).
5. S6: the enclosed stair (33 risers 0.182, going 0.28, half landing 1.8, 3.0 wide, handrails) from B6's south-west
   door down to A6 at y 0; A6 with its medkit point and vision panel.
6. Hide spots: B5 trench panels, fuel bay, gallery recess; B6 locker room lockers (2), server rack ends (2).
7. debugPoints 'B5', 'B5-SR', 'B6', 'B6-CR', 'S6', 'A5', 'A6'.
8. Course stub: B5 (mains gate on the L1-L3 group -> A5; a `switch` MB; the group numbers T6 will light), B6 now forms
   (card pickups -> flag gates on RD1-RD4; three numbered keypad switches; the mantrap egress switch; one-way lock on S6's
   top door after both pass), airlocks A5, A6.

## Tests (tests/bunkerMap.test.ts)
- Genset tops in the wall-jump window; the trench section 1.5 x 1.2; the B6 mezzanine 3.6 over the office floor; no
  unplanned lip in B5 / B6 (gallery back edge, racks, lockers have `noLedge`).
- The S6 stair fits (stairs.ts layout) and its top and foot are on the nav grid (layered nav, height-joined).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs`; `node scripts/run-e2e.mjs e2e-course smoke`. The checker
walks a headless player (`stepHeadless`) from 'A5' to 'S6' with doors unlocked through the corridor and confirms the
nav path exists (`__app.current.world.nav.findPath`, per T0's API answer).

## Commit
"training T4: Standby Plant, Mock Site and Stair 6 geometry (B5, A5, B6, S6, A6)". Docs: CHANGELOG, LOG, STATE; PC-PASS.
