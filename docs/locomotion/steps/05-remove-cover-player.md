# Step 05 - remove player snap cover (gameplay side)

Block A. Deps: none (06 follows). Bible 6 ("snap cover, glide, cover-to-cover, blind fire"), 5.3; DECISIONS A1; audit c 2a, 2e.

## Model
Implementer: sonnet. Checker: opus (touches src/net).

## Read
- docs/locomotion/audit/c-removals.md 2a, 2e (lines 22-40, 62-64); DECISIONS.md A1.
- src/cover/: coverController.ts (grep -n "export\|import"), coverState.ts:1-70, coverAim.ts:1-20, cornerController.ts:1-30, coverData.ts:50-70.
- src/game/gameState.ts:51-61, 185-240, 340-362, 428-432, 598-606, 812-816, 1105-1135, 1160-1185, 1205-1240, 1776-1836, 1920-1930,
  2005-2160, 2195-2205, 2300-2320, 2370-2378.
- src/player/player.ts:1-100, 170-200, 230-330, 360-392; src/player/movement.ts:10-60; src/player/speedGears.ts:30-40;
  src/config/movement.ts:15-22, 95-100, 155-168; src/player/attachController.ts:510-520, 885-893.
- src/game/takedownController.ts:100-110, 150-160, 228-240; src/game/takedown.ts:10-15, 130-160; stealthSystems.ts:128-133; teamController.ts:96-102, 210-218.
- Input: actions.ts:15-22; gamepadMapping.ts:50-75; gamepadSource.ts:115-122; inputState.ts:20-30; keyBindings.ts:10-50; touchControls.ts:20-90.
- src/core/settings.ts:140-150, 262-270, 462-470; src/ui/hud/worldPrompts.ts:1-45; src/ui/screens/controlsScreen.ts (grep -n -i cover).
- src/game/training.ts:1-60; src/game/modes/trainingMode.ts (grep -n -i cover); src/game/tactics.ts (grep -n "cover").
- src/net/coopClient.ts:418-425; netShared.ts:15-22; validate.ts:150-165.
- tests: cover.test.ts, coverAim.test.ts, corners.test.ts (grep -n "import"). scripts/run-e2e.mjs:20-60.

## Task
1. Delete src/cover/coverController.ts, coverState.ts, coverAim.ts, cornerController.ts and tests/cover.test.ts, coverAim.test.ts
   (A1: the doorway / corner lean goes; corner peek returns in step 12). KEEP coverData.ts and corners.ts (enemy AI, level build,
   splitJump, back-to-wall later) and tests/corners.test.ts (trim to the kept exports).
2. player.ts: drop the coverAim import (:3), `aimLimit` / `clampAim` use (:74-84, :235), `coverFireBlocked` (:84, :364-372),
   `context.coverEdge`; keep `PlayerPose` and `coverPose` (renamed `pose` later in 06) with cover fields fixed at 'none' / 0.
3. gameState.ts: remove imports :51, :61 (keep `CoverSegment` :52 if still used), fields `cover` / `corners` (:213, :215),
   construction :361, :430, debug :601-604 and 'cover' in :815, cover step :1109-1116, corners step :1165, `stumble` caller on cover
   lost (:1116; keep `stumble()` if hits use it), `spreadMul` :1181 -> `suppression.spreadMul` only, reset :1237, `updateCoverHud`
   and `onFace` (:2008-2115), touch `leaveAct` and cover branches of the action button (:2119-2153, :2307, :2319), :2201.
4. `updateCoverRef` (:1778-1795): `localRef.cover = null`, `coverT = 0` until step 11 feeds it from back-to-wall. Keep `coverQ`
   (:1827-1834) and the enemy tactics side (tactics.ts `CoverSpot`, `coverQuality`) unchanged.
5. Every other `g.cover` / `g.corners` reader: takedownController.ts:107 (attacker state from cover -> 'ground'; keep the `lowCover` /
   `highCover` AttackerState values, step 12 maps them to back-to-wall), :157, :233; stealthSystems.ts:131; teamController.ts:100, :215;
   coopClient.ts:423. Keep `overCover` (bible 1.13 table: takedown over a low obstacle).
6. Movement: remove stances 'cover' / 'coverCrouch' (movement.ts:15, :57-60), `coverSpeed` / `coverCrouchSpeed` (config/movement.ts:19-20,
   :97-98), `coverPace` and `GEARS.coverMax` (speedGears.ts:35-38; config/movement.ts:165-167). attachController.ts:516, :889 read the pose
   only: keep.
7. Input: keep the `cover` action as the context action (PLAN; bound A / Space / touch action), unbound behaviour for now (step 11
   wires back-to-wall). Comments and labels: actions.ts:19 'Context: back-to-wall (step 11)', keyBindings.ts:49 label 'Context action'.
   Delete `inputState.coverLeave` (:26-28).
8. settings.ts: remove `gameplay.coverDash` (:145, :268, :468); sanitize ignores the old key (unit test with a literal old settings object).
9. worldPrompts.ts: remove prompt ids 'cover', 'move', 'corner' (:6, :18, :27-30, :42); keep 'vault', 'state', 'jumpTo', 'drop', 'takedown'.
10. Training: remove the 'cover' step (training.ts:6, :19, :34, :54-55); the vault step text no longer says "in cover". Step 33 rewrites Training.
11. net: netShared.ts:18 and validate.ts:154-160 comments drop cover glides; the host speed allowance keeps its numbers.
12. e2e: remove 'e2e-cover' from REQUIRED (run-e2e.mjs:24) and the quick map (:45, :48, :50; 'src/cover/' row keeps e2e-stealth,
    e2e-tactics); the file goes in 06. Remove the four cover cases of e2e-netmove (low cover, low peek, high cover, high edge peek, :137-186),
    `g.cover.reset()` in its reset (:101) and `cover:` in the debug log (:54). In e2e-anim (`tp` :36-37), e2e-clip, anchors, ct, ct-warehouse, enemies, gadgets,
    stealth-ai, stealth, tactics, takedown, touch, traverse, weapons-carry: delete `g.cover.*` / `g.corners.*` calls and cover-only scenarios.
13. controlsScreen.ts cover rows -> 'Context action'. Docs in step 06.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/e2e-netmove.mjs` (cover cases removed, the rest within 10 cm), `node scripts/e2e-coop.mjs`,
  `node scripts/e2e-tactics.mjs` and `node scripts/e2e-stealth-ai.mjs` (enemy cover AI intact), `node scripts/e2e-touch.mjs`;
  `npm run e2e:legacy` report only.
- Grep proofs (print nothing): `git grep -n "CoverController\|CornerController\|coverAim\|coverDash\|coverLeave\|coverPace" -- src tests scripts`;
  `git grep -n "g\.cover\.\|\.corners\." -- src scripts`. `ls src/cover` shows coverData.ts and corners.ts only.

## Commit
`locomotion 05: remove player snap cover, glide, cover-to-cover, blind fire, corner lean; cover input kept as context action`

## Numbers
- Removed: SNAP_REACH 3 m, ENTER_TIME 0.35 s, glide 0.25-0.42 s, SWAP_TIME 0.3 s (coverController.ts:50-52, :65); LEAN_TIME 0.25 s,
  CHECK_TIME 0.9 s (cornerController.ts:10-11); coverSpeed 2.3 / 1.25 m/s; coverMax 2.8 / 1.8 m/s. `wc -l` src/cover before: 1837 lines.
- Kept: `HIGH_MIN` (coverData.ts:58) for back-to-wall >= 1.6 m (PLAN step 11). netmove baseline without the cover cases: worst 1.1 cm (split aim).
