# Step 06 - remove cover from the rig and the wire; PROTOCOL_VERSION 3

Block A. Deps: 05. Bible 6, 5.12.4 ("cover clips are removed"); DECISIONS A2; audit c 2a; AUDIT 1i.

## Model
Implementer: opus. Checker: opus (src/net, protocol change). (all subagents opus from step 06, Michael 2026-10-13)

## Read
- DECISIONS.md A2. docs/locomotion/audit/c-removals.md 2a (lines 22-40).
- src/player/moveState.ts:1-120, 160-220, 250-310; src/game/localMoveState.ts:1-60, 95-120; tests/moveState.test.ts (grep -n cover).
- src/net/protocol.ts:10-14, 55-75; src/net/remoteAvatar.ts:15-35, 250-300.
- src/player/characterRig.ts:14-18, 55-80, 184-194, 344-380, 400-404, 900-960, 1020-1062, 1305-1352, 1405-1470.
- src/anim/animGraph.ts:30-110, 160-310, 340-365, 510-595, 628-660, 705-770, 780-790, 855-905; src/anim/clips/actions.ts:128-205;
  src/anim/pose.ts:25-35; motion.ts:238-244; footPlanner.ts:90-96; rigMath.ts:90-95.
- src/player/player.ts:15-40, 255-330 (pose hand-off); src/player/shoulderCamera.ts (grep -n -i "cover\|lean").
- scripts/run-e2e.mjs:20-60; scripts/e2e-times.json; docs/systems/cover.md (all), movement.md:5-166, 228-end, input-and-loop.md:11-45,
  coop.md (grep -n -i cover), testing-tools.md (grep -n e2e-cover); CLAUDE.md:82 and the doc index row for cover.md.

## Task
1. moveState.ts: `MOVE_MODES[1]` 'cover' -> 'wall' (A2: same index; reserved, nothing sets it until step 11). Delete `COVER_SUB` (:113-114),
   the cover-only fields `cu`, `lf`, `fp` (:92-100) and their sanitize lines (:189-191), the `case 'cover'` of `poseFromMoveState`
   (:295-306). `footOffsets` / `footPoints` (:229-250) are cover-only (localMoveState.ts:120, remoteAvatar.ts:263): delete; step 11 may
   bring them back for `wall`.
2. `MovePose` / `emptyMovePose` (:254-272): drop `cover`, `coverTop`, `coverMode`, `blind`, `peekOver`, `peekClear`, `kneel`, `edgeLook`;
   keep `wallSide` and `lean` (step 11-12 reuse) and every attach / committed / takedown field.
3. localMoveState.ts: remove the `pose.cover !== 'none'` branch (:99-121) and the `COVER_SUB` / `footOffsets` imports (:7).
4. protocol.ts:12 `PROTOCOL_VERSION = 3` (ships the Block A wire changes: `ex` 01, `sh` 03, `cover` -> `wall` here). A peer on version 2
   is refused by the existing version check (verify with a unit test).
5. remoteAvatar.ts: delete :256-263 (left-hand swap, curl / lift hold, cover feet) and the cover fields at :289-294.
6. characterRig.ts: delete low-cover height control (`coverHeight`, `curl`, `lift`, `curlHold`, `liftHold`, HIDE / OVER constants
   :186-192, :346-363, :1023-1060), blind fire (:77, :913), turn-and-swap (`coverTurn` :58-59, :906), weapon hand swap (`HAND_SWAP_TIME`
   :16, `leftHanded` swap :374-376, :402, :952, :1308 mirror). Keep the support-hand wall contact: rename `coverHand` -> `wallHand`
   and `offCover` -> `offWall` (:377-378, :1346-1350, :1407-1466): D5.9 contact IK and back-to-wall (step 11) use it.
7. animGraph.ts: delete low-cover / blind / turn / edge-peek inputs and blends; lower state 'cover' -> 'wall' (`LOWER_STATES` :43) with
   the flat-back high stance only; delete clips COVER_ENTER, COVER_ENTER_SIDE, COVER_EXIT, COVER_TURN (actions.ts:128-205) and
   their imports (:34). Log "A6 (ASSUMED - for review): the high flat-back pose and wall-hand IK are kept as the back-to-wall base;
   alternative: delete all and author in step 11" in DECISIONS.md.
8. player.ts: `coverPose` -> `pose`; `PlayerPose.cover` and the cover fields go; update every reader (attachController.ts:516, :889,
   localMoveState.ts:18, shoulderCamera cover / coverTop inputs: delete).
9. tests/moveState.test.ts: cover cases -> a 'wall' slot test (`MOVE_MODES.indexOf('wall') === 1`, pack / sanitize round trip);
   tests/rig.test.ts, anim.test.ts, splitJump / voxelFit / detailPass tests: fix imports. Add a test that PROTOCOL_VERSION is 3.
10. Delete scripts/e2e-cover.mjs and its e2e-times.json entry; remove cover scenarios left in e2e-clip (low / high cover idle, peeks).
11. Docs: delete docs/systems/cover.md; movement.md "Corners and doorways" (:228+) and the cover parts of :5-166; input-and-loop.md cover
    bindings -> 'context action'; coop.md MoveState table: slot 1 `wall` (reserved), PROTOCOL_VERSION 3; testing-tools.md e2e-cover row.
12. CLAUDE.md module map row (:82) -> `| cover/ | Cover data for enemy AI and level build (coverData, corners); back-to-wall reuses it |`;
    doc index: drop the cover.md row. (CLAUDE.md is the one file outside the step scope this step may edit.)
13. Enemy cover AI untouched: coverData.ts, corners.ts, ai/enemy.ts cover use, tactics.ts.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-netmove.mjs` and `node scripts/e2e-coop.mjs` (both pass on PROTOCOL 3;
  netmove worst error <= 10 cm, report each case vs STATE.md baseline); `node scripts/e2e-anim.mjs`, `node scripts/e2e-clip.mjs`;
  `npm run e2e:legacy` report only. Block A end: full `npm run e2e` (background) + `node scripts/perf-trend.mjs` (sim p95 <= 3.31 ms,
  anim <= 0.063 ms/char on this VM).
- Grep proofs (print nothing): `git grep -n "COVER_SUB\|coverHeight\|curlHold\|HAND_SWAP_TIME\|COVER_ENTER\|COVER_TURN\|e2e-cover" -- src tests scripts`;
  `git grep -n "'cover'" -- src/player/moveState.ts src/game/localMoveState.ts src/net`.
- `grep -n "PROTOCOL_VERSION = 3" src/net/protocol.ts` prints one line.

## Commit
`locomotion 06: rig cover poses gone, MoveState slot 1 = wall (reserved), COVER_SUB retired, PROTOCOL_VERSION 3, e2e-cover deleted, docs`

## Numbers
- PROTOCOL_VERSION 2 at src/net/protocol.ts:12 -> 3. MOVE_MODES at moveState.ts:12-45, slot 1 at :14.
- Perf trip lines (STATE.md): sim p95 2.65 -> 3.31 ms, anim 0.0504 -> 0.063 ms/char.
