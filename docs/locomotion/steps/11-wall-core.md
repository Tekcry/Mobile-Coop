# Step 11 - wall-core (Block C)

Back-to-wall: enter on the context press near a wall, slide along it, leave; MoveState `wall`; feeds the AI's cover
reference; two players stack on one wall. Deps: 06, 08. Model: implementer opus; checker opus. (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A (player snap cover removed, `cover` input kept as the context action, MoveState slot 1 = `wall`,
COVER_SUB retired, PROTOCOL_VERSION 3) and steps 09-10 (PROTOCOL_VERSION 5). Line numbers verified 2026-10-13 before
Block A: grep the named symbol first.

## Read
- docs/design-bible.md 369-385 (5.3 back-to-wall), 669-680 (C11); DECISIONS.md D8 (stacking), A2
- src/cover/coverData.ts 13-70 (`CoverSegment`, LOW_MIN :56, HIGH_MIN :58, `classifyHeight` :62), 138-170
  (`locate`, `coverStandoff` :145); src/game/tactics.ts 40-90 (`CoverSpot`, `coverQuality` :61)
- src/game/gameState.ts: grep `updateCoverRef` (~1779-1795) and the `cover` action press
- src/player/moveState.ts 12-52, 70-110, 160-230, 250-300; src/game/localMoveState.ts 1-130
- src/net/remoteAvatar.ts 196-230 (attached `s` interpolation :210-213: copy it for walls), 270-302
- src/net/coopHost.ts grep `ref.cover` / RemotePlayer ref; src/net/remotePlayer.ts 1-60
- src/config/movement.ts 155-170 (gear caps :159-160, old cover caps :167); src/config/camera.ts 95-112 (presets)
- src/input/touchControls.ts 20-40 (context button); src/input/keyBindings.ts 44-70

## Task
1. New src/player/wallController.ts with a pure core (no Babylon) and a thin adapter. State: off, entering (0.2 s
   settle onto the face, max 0.9 m travel: no snap from a distance, no glide), on, leaving.
2. Candidates: `CoverSegment`s (kept for the AI). High (>= HIGH_MIN 1.6 m): standing or crouched. Low (LOW_MIN 0.75 m
   up to LOW_MAX): always crouched. Body line = `coverStandoff` from the face.
3. Enter: context press (`cover` action: pad A, KBM bind, touch context button) with a face within 0.9 m whose normal
   is within 100 deg of the move or look direction; or the stick held into a high face for 0.35 s at gear <= 4.
4. Slide: the stick's along-wall component at the current gear speed, capped at gear 4 (2.8 / 1.8 m/s, the old cover
   caps), footstep noise at the crouch band (quiet, bible 5.3). Joined segments wrap round inside corners (ends within
   0.1 m). Stops at an outside end (the edge; step 12 adds peek there).
5. Leave: stick pulled away (outward > 0.6 for 0.15 s), context press again, jump, sprint, takedown, traversal.
   Aiming mid-wall turns the upper body out from the wall; release returns.
6. Hold / toggle: read `gameplay.wallToggle` (default true = press on / press off); the hold variant ships in step 18.
7. MoveState `wall` (slot 1): `a` = segment index (deterministic level order on every peer), `s` = metres along it,
   `sub` = WALL_SUB { crouch 1, faceRight 2, edgeL 4, edgeR 8, peek 16, lean 32, low 64, leftHand 128 } (bits 4-32
   reserved for step 12). Mirror in `localMoveState`, `poseFromMoveState`, remoteAvatar (position from `a` / `s`,
   interpolated on the same `a`; yaw from the face normal), pack / sanitize (`a` < segment count).
8. Rig pose (A6): build on the flat-back pose and support-hand contact kept by step 06 (`wallHand`, `offWall`; grep
   characterRig.ts): back and shoulder blades on the wall (<= 3 cm gap, no clip), head turned along the slide, near
   hand on the wall; sidesteps from the foot planner so planted feet slide < 1 cm. Clip polish is step 27.
9. AI (bible: enemy cover AI stays): `localRef.cover` = the segment's `CoverSpot` while on the wall, else null; the
   host does the same for each remote from its MoveState so guards flank clients too.
10. Takedown attacker state while on the wall = `ground` for now (corner takedown in step 12).
11. Stacking (D8): pure `stackClamp(s, dir, others, n)` keeps capsule centres >= 0.62 m apart along one segment (2 x
    0.3 + 0.02), fed from remote avatars' `wall` MoveStates (client and host alike); no allocation per frame.
12. Camera preset `wall` (boom 2.6, shoulder to the open side, blend 0.25 s); local only, never sent.
13. New e2e suite scripts/e2e-wall.mjs, added to REQUIRED and the quick map for src/player in run-e2e.mjs (replaces
    e2e-cover deleted in step 06). PROTOCOL_VERSION 5 -> 6.

## Tests
- tests/wallController.test.ts: enter reach and angle, low -> crouched, stick-into-wall 0.35 s, slide speed = gear cap
  <= gear 4, edge stop, inside-corner wrap, pull-away exit 0.15 s, `stackClamp` spacing, no allocation (reused out).
- tests/net.test.ts: `wall` pack / sanitize (`a` bound, `sub` u8).
- e2e-wall (Proving close-quarters lane): enter, slide, edge stop, exit; guard flank uses `localRef.cover`.
- e2e-pad: A enters, stick slides, A leaves. e2e-mouse: the KBM context key does the same. e2e-touch stays green.
- e2e-netmove: cases "wall" (standing) and "wall crouch" (joints <= 10 cm; remote `s` within 5 cm after settle);
  "stack": both pages on one wall, centres >= 0.6 m apart, no capsule overlap. Bot-partner stacking: rerun after 20.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-wall e2e-netmove e2e-coop
  e2e-stealth-ai e2e-tactics`
- `node scripts/anim-audit.mjs` local and remote (wall poses: foot slide, wall clip <= 3 cm, self-intersection)
- Grep proofs: `grep -n "'wall'" src/player/moveState.ts src/game/localMoveState.ts src/net/remoteAvatar.ts`;
  `grep -rn "src/net" src/player/wallController.ts` empty; PROTOCOL_VERSION = 6.
- PC-PASS: wall pose contact sheet, pending PC run.

## Commit
"locomotion 11: back-to-wall core, MoveState wall, two-player stacking"
Then LOG, STATE, AUDIT (S04), CHANGELOG, TESTING, docs/systems/movement.md, ai.md, coop.md, testing-tools.md.
- Step 11 must also restore an e2e check that enemies flush a wall-held player with grenades and assign a flanker (lost with snap cover in step 05; enemyManager.ts:513, enemy.ts:1296 need localRef.cover).
- Also (from the step 10 check, small): scripts/e2e-netmove.mjs ~389-393 wait for the host's strike record to clear (`net['strikes'].size === 0`) before begin('nobody'); scripts/e2e-coop.mjs strike retry loop retries only after the client strike ended and the host record cleared; docs/systems/coop.md: the client aligns its phase to min(local, host-now - t0) (A44).
