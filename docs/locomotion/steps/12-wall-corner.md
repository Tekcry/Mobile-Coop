# Step 12 - wall-corner (Block C)

At a wall edge: peek, lean out to aim and shoot, SWAT turn across a doorway gap, corner takedown (bible 5.3, 5.4).
Deps: 11. Model: implementer opus; checker opus. Step 12b (D9 open-side weapon, D10 low-wall side lean) runs next. (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A, step 09 (draw phases), step 10 (PROTOCOL_VERSION 5), step 11 (`wallController`, WALL_SUB, MoveState
`wall`, PROTOCOL_VERSION 6). Line numbers verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- docs/design-bible.md 369-385 (5.3 back-to-wall, edge verbs), 399-412 (camera, corner peeking), 428-448 (5.4)
- src/player/wallController.ts (all; step 11) and tests/wallController.test.ts
- src/cover/corners.ts 1-140 (`Doorway` :8, `OutsideCorner` :19, `SLICE` :30, `findDoorways` :36, `outsideCorners`
  :79, `doorSide` :115, `pickLean` :127)
- src/game/takedown.ts 10-15 (TakedownKind, AttackerState), 110-160 (`pickTakedown`, `highCover` case :137-141)
- src/player/moveState.ts 12-60 (MOVE_MODES, COMMITTED_MODES :49, MoveCommit :55), 250-300
- src/player/traversal.ts 15-35 (`traverseDuration` :27-31); src/net/validate.ts 155-180 (commit speed check)
- src/net/remoteAvatar.ts 155-180 (MoveCommit replay), 196-230
- src/player/shoulderCamera.ts 245-300 (presets, follow), 335-350 (lean shift removed in Block A); src/config/camera.ts 95-112

## Task
1. Edge: on the wall within 0.35 m of a segment end that is an `outsideCorner` or a doorway side (`findDoorways`).
   Sets WALL_SUB edgeL / edgeR. Prompts show the edge verbs (pad first).
2. Peek: at an edge, the stick held toward the edge 0.2 s (or look past it): the camera swings out (offset 0.6 m,
   yaw 25 deg, blend 0.2 s; local only, bible "guards detect the body, never the camera"). The body leans head and
   near shoulder out <= 0.25 m (sub `peek`); perception and the light meter use that real body exposure.
3. Lean-out aim: aim at an edge steps the body out 0.35 m, pivoting on the outer foot, weapon drawn by the step 09
   timings (rifle or pistol), camera shoulder to the open side. Fire only when drawn. Release: back in 0.25 s.
   Sub `lean`; aim yaw / pitch ride the existing `r` / `ay` fields. Low wall crouched: aim rises over the top (lean
   kind 2). Both edges lean here with the normal right-hand weapon as a stand-in; 12b mirrors it at left edges (D9)
   and adds the low-wall side lean (D10). Do not build either here.
4. SWAT turn: at a doorway edge with a coplanar segment across a gap of 0.8-2.0 m, context press with the stick toward
   the gap: a crouched committed move to the far wall, duration = clamp(gap / 2.4 x 1.15, 0.5, 0.8) s, quiet, ends in
   `wall` on the far segment. New MoveState mode `swat` appended (index 26), added to COMMITTED_MODES, sent as a
   `MoveCommit` (from, to, dur), client-owned like traversals; host validates speed (validate.ts).
5. Corner takedown: rename AttackerState `highCover` -> `wall` (takedown.ts:13, :137-141); a guard within reach round
   the edge gives kind `corner`. Low-wall crouch maps `lowCover` -> `wallLow` for `overCover`. Host approval stays on
   `td` (moves to `cmove` in step 27).
6. Leaving at an edge: stick past the edge for 0.3 s steps round the corner off the wall (no auto move; the press or
   stick is always the player's, bible 5.3).
7. MoveState: `peek` and `lean` sub bits set by `localMoveState`; `poseFromMoveState` and remoteAvatar pose them
   (lean amount from aim). `swat` replays through the MoveCommit path (remoteAvatar :155-180).
8. Camera: `wall.peek` and `wall.lean` presets in config/camera.ts; capped-rate swing, never inside geometry
   (cameraBounds). Never sent.
9. Light parity: peek and lean exposure feed the light meter and guard perception from the same body sample points.
10. Lean kind (D10 "a field on the existing lean"): wall MoveState gains a 2-bit field `lk` (0 none, 1 out past the
    edge, 2 over the top), packed and sanitized; step 12 writes 1 and 2, 12b adds 1 with `low` set (side lean), so
    12b needs no protocol bump. Log the choice as ASSUMED (next free A-number; alternative: a new WALL_SUB bit, but
    WALL_SUB's 8 bits are all used). WALL_SUB `leftHand` (128) stays 0 here; 12b sets it.
11. PROTOCOL_VERSION 6 -> 7 (covers `swat`, sub bits and `lk`).

## Tests
- tests/wallController.test.ts: edge detect at 0.35 m, peek hold 0.2 s, lean offset 0.35 m and return 0.25 s, SWAT
  gap range and duration clamp, step-round-corner exit.
- tests/net.test.ts: `lk` pack / sanitize (0-2; 3 rejected).
- tests/takedown.test.ts: `wall` + guard round the edge -> `corner`; `wallLow` -> `overCover`.
- e2e-wall: peek, lean-aim and fire (high wall, right edge), over-the-top aim on a low wall, SWAT across the Proving
  doorway (1.1 m), corner takedown. Left-edge and low-wall side-lean cases are 12b's.
- e2e-pad: stick-to-edge peek, LT lean, RT fire, A SWAT, Y corner takedown. e2e-mouse: the same with RMB / LMB / keys.
- e2e-takedown: corner takedown from the wall.
- e2e-netmove: cases "wall peek", "wall lean" (aiming) and "swat" (mid-move and settled), joints <= 10 cm.
- e2e-stealth-ai: a guard sees a leaning player and not a peeking camera alone.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-wall e2e-netmove e2e-coop
  e2e-takedown e2e-camera-bounds e2e-stealth-ai`
- `node scripts/anim-audit.mjs` local and remote (peek, lean, SWAT >= 0.5 s, corner takedown >= 1.0 s, wall clip)
- Grep proofs: `grep -n "highCover" src` empty; `grep -n "'swat'" src/player/moveState.ts`; `grep -n "lk"
  src/player/moveState.ts`; PROTOCOL_VERSION = 7.
- PC-PASS: peek camera swing and lean framing, pending PC run.

## Commit
"locomotion 12: wall corner peek, lean-out aim, SWAT turn, corner takedown"
Then LOG, STATE, AUDIT (S02, S04), CHANGELOG, TESTING, docs/systems/movement.md, takedowns.md, coop.md.
