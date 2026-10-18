# Step 12b - wall-edge-aim (Block C): D9 open-side weapon, D10 aim around low cover

At a back-to-wall edge, peek and lean-out use the open side: left edges move the weapon to the left hand or shoulder
(D9). At a low-wall end, crouched aim toward the end leans out past the end instead of rising over the top (D10).
Deps: 12 (runs directly after it, before 13). Model: implementer opus; checker opus (back-to-wall, network). (all subagents opus from step 06, Michael 2026-10-13)
Assumes step 09 (draw phases 0.2-0.3 s), step 11 (WALL_SUB incl. `leftHand` 128, e2e-wall) and step 12 (edgeL / edgeR,
`peek`, `lean`, lean kind `lk`, PROTOCOL_VERSION 7). Line numbers verified 2026-10-13 before Block A: grep first.

## Read
- docs/locomotion/DECISIONS.md "Michael's decisions D9-D10" (verbatim; it wins over this file)
- docs/design-bible.md 369-385 (5.3 back-to-wall), 399-412 (camera, corner peeking), 5.12.2 limits (grep 'Grip')
- src/player/wallController.ts (all) and tests/wallController.test.ts (steps 11-12)
- src/player/characterRig.ts: grep `wallHand`, `solveArm`, `gunPush`; src/anim/animGraph.ts: grep `READY_POSES`
- src/anim: grep `Inertializer` (blend API); src/weapons/playerWeapons.ts: grep the step 09 draw phases
- src/player/moveState.ts (WALL_SUB, `lk`); src/game/localMoveState.ts and src/net/remoteAvatar.ts wall branches
- The step 12 exposure sample points (grep the light-meter / perception body samples step 12 task 9 feeds)
- src/player/shoulderCamera.ts: grep the shoulder side and the `wall.lean` preset; scripts/e2e-wall.mjs header

## Task (D9 - open-side weapon at edges)
1. Open side: at edgeL it is the left, at edgeR the right. Peek and lean-out always use the open side. Mid-wall aim
   (no edge bit) stays on the normal right side. Pure `openSide(sub)` in the wallController core.
2. Left edge, pistol: weapon to the left hand, mirrored two-handed grip (left hand on the grip, right hand supports).
   Left edge, rifle: stock to the left shoulder, left hand on the grip, right hand on the handguard. Targets are the
   right-side grip data mirrored across the body's sagittal plane (code-built, no new authored clip). Right edges
   are unchanged.
3. The switch happens inside the draw (step 09, 0.2-0.3 s) or the lean-out step, blended with the Inertializer,
   never a pop. Releasing the lean or leaving the edge switches back the same way.
4. Camera shoulder follows the open side in step with the switch (step 12 `wall.lean` preset); local only.
5. Fire: muzzle, tracer and shot origin come from the mirrored weapon; fire stays gated on drawn (step 09).
6. Exposure: perception and the light meter read the real mirrored pose through the step 12 sample points, so the
   open-side lean exposes less body. No separate exposure model.
7. Network: `localMoveState` sets WALL_SUB `leftHand` from the edge side while peeking or leaning at edgeL;
   `poseFromMoveState` and remoteAvatar pose the mirrored grip and blend the switch from it.

## Task (D10 - aim around low cover)
8. Low wall (`low`, always crouched) at an edge: aim with the stick or look toward the end -> the body stays crouched
   and leans out past the end (same rules as task 1-7, D9 included; `lk` = 1). Aim mid-wall, or the stick up or away
   from the end -> rise over the top (`lk` = 2, step 12). Pure `lowAimKind(...)`, no allocation.
9. Crouched peek round the low-wall end works like the high-wall peek (`peek` with `low`).
10. Side-lean pose keeps the head below the wall top (clamp the lean / spine so the head sample stays under the
    segment height); exposure feeds perception and the light meter from that real pose.
11. Network: `lk` = 1 with `low` set is the side lean; remotes pose it. No PROTOCOL_VERSION bump (stays 7: `lk` came
    with step 12), so steps 13+ keep their numbers.

## Tests
- tests/wallController.test.ts: `openSide` per edge bit; mid-wall aim = right side; `lowAimKind` for stick toward
  the end, up, away and mid-wall; crouched peek at a low end; `leftHand` set only at edgeL while peeking / leaning.
- Pose test (pure): mirrored pistol and rifle grip targets; head height of the low-wall side lean below the wall top.
- Exposure test: on a symmetric test wall the left-edge lean exposes no more body (perception samples and light
  meter) than the right-edge lean, pistol and rifle.
- tests/net.test.ts: `leftHand` and `lk` with `low` round-trip.
- e2e-wall (extend scripts/e2e-wall.mjs): high-wall lean-aim and fire at left and right edges, pistol and rifle
  (camera on the open side, shot leaves the left-held weapon at left edges); low wall: side lean and over-the-top
  at both edges, pistol and rifle; crouched peek round a low end.
- e2e-netmove: cases "wall lean left edge" (pistol, rifle) and "low wall side lean", joints < 10 cm.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-wall e2e-netmove e2e-coop
  e2e-stealth-ai e2e-camera-bounds`
- `node scripts/anim-audit.mjs` local and remote: grips < 2 cm and no weapon through the wall (<= 2 cm) at left and
  right edges, pistol and rifle, high wall and low-wall side lean; the switch has no pop (Inertializer, no joint
  jump over the clip-blend limit); self-intersection <= 2 cm.
- Grep proofs: `grep -n "leftHand" src/game/localMoveState.ts src/net/remoteAvatar.ts`; PROTOCOL_VERSION = 7.
- PC-PASS (PROVISIONAL in the cloud): anim-sheet left and right edges, pistol and rifle, local and remote, for the
  high-wall lean and the low-wall side lean / over-the-top: "mirrored grip clean, no weapon through the wall, head
  below the low-wall top, switch blends without a pop".

## Commit
"locomotion 12b: open-side weapon at wall edges (D9), low-wall side lean (D10)"
Then LOG, STATE, AUDIT (S04), CHANGELOG, TESTING, docs/systems/movement.md, coop.md.
- Note from step 06: the restored dormant openLeft mirroring leaves both wrists 0.25-0.45 m from the grip on the mirrored side (HEAD behaviour); 12b must close this to < 2 cm (grips solved for the mirrored weapon).
