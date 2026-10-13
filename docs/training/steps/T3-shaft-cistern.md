# Step T3 - geometry: the Intake shaft and the Cistern (Block B)

Model: implementer opus, checker opus. Deps: T2. No guards; one work lamp per bay.

## Read
- SPEC.md Engine questions with T0's answers (5 split jump reach, 6 ducts, 7 rope, 8 zipline)
- BAYS.md 7-70 (conventions), 187-246 (B3), 247-299 (B4), 831-852 (metrics)
- src/world/levelBuilder.ts 226-404 (ladder, pipeV, pipeH, zipline, duct, windowAt, door, rappel, fence, ledge, mark)
- src/player/splitJump.ts (findSplitGaps rules); src/config/movement.ts 255-400 (SPLIT, WALL_JUMP, PIPE, RAPPEL,
  FENCE, LEAP, TEAM)
- src/world/maps/bunker.ts and bunkerUpper.ts (T2's pattern)

## Task (decisions)
1. `src/world/maps/bunkerShaft.ts`: B3, A3, B4, A4, called from bunker.ts.
2. B3 shaft: walls to y 30 (local 24), chamfered corners, galleries G1 (10), G2 (14), G3 (17.4) with 1.1 rails except at
   the move points; the riser casing RC 1.6 m off the north wall, its top 4.3 above G1 (T0: lip window
   3.95-4.75 above the split floor); the grated bridge from the casing top down 0.3 to G2.
3. The wall-jump lip 3.4 above G2 on the north wall and the north-east inside corner (2.7-3.8 window).
4. The damper bar `pipeH` 2.5 over G3 across the 4 m void to above G2; the hoist `rappel` point (length 17.4 to the floor:
   T0); the control room CR outside the east wall with its shaft window on the rope line (`windowAt`, breakable,
   at local y 3.0-4.5) and its door onto the chamber floor; the spoil `zipline` from G3 (y 19.4) to the west platform WP
   (floor 2.6, cable end y 4.5: T0); the fan pit `fence` 2.4 high round x 6..12, z 6..12; the discharge `duct` (engine crawl duct, SPEC E6) from
   inside the pit to a wall grille in the short plant passage before A3; the plant ladder floor -> G1; catch nets
   (collision floors of grating, visual mesh) 2 m under RC and WJ with a net ladder back up.
5. Exactly one split gap in B3 (the RC slot): assert it. Put `noLedge` on every gallery back edge and on the CR roof so
   no unplanned lip appears.
6. B4: cells C1-C3, walls W1, W2 1 m thick 4.4 high (walkable tops), the valve gallery at 4.4 along the east wall, the
   inspection door in W1 (`door`, locked; the course's bolt gate opens it from the C2 side), the sluice opening under W2
   (1.5 wide `door` used as the gate), the handwheel point on the gallery, C3's cell `ladder` from the gallery, the C1 / C2
   ladders as visual-only padlocked props (no anchor), the overflow channel (walls 6.0, lip 6.2), the float shaft (1.0
   wide, 6 m), the sump (4 m deep: floor at local -4 is y 2.0, above the nav floor), the outlet platform at 4.4 with a
   fixed plant ladder (the pull-up's now form).
7. Co-op lips: W1 and W2 tops and the outlet platform at 4.4; add them to `BUNKER_COOP_LIPS` (exported) and assert each is
   above `WALL_JUMP.maxUp` + 0.5 and at or under `TEAM.boostMax` from its floor.
8. debugPoints 'B3' (G1 at the A2 door), 'B3-G3', 'B3-floor', 'B4', 'A3', 'A4'.
9. Course stub: add B3 (anchorLock on the fan-guard fence until the CR isolator flag; the isolator a `switch`), B4
   (bolt, timedHold on the sluice, the C3 ladder), airlocks A3, A4.

## Tests (tests/bunkerMap.test.ts)
- `anchors.splits` = exactly the RC slot (1.6 wide, faces >= 3.6); wall-jump lip in 2.7-3.8 over G2.
- Rope length within `RAPPEL`; zipline endpoints as BAYS; the fence height 2.4.
- Co-op lips out of solo reach and within boost reach (level-design 11.3); no other lip in 3.8-4.5 above any B4 floor.

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs` (Plant level SVG vs BAYS sketches); `node scripts/run-e2e.mjs
e2e-course smoke`. The checker also teleports to 'B3-G3' in a headless run (`__app.current.player.controller.teleport`)
and checks the rappel and the zipline are offered (`attach` probe), and at 'B3' that the split is offered.

## Commit
"training T3: Intake shaft and Cistern geometry (B3, A3, B4, A4)". Docs: CHANGELOG, LOG, STATE; PC-PASS shots B3, B4.
