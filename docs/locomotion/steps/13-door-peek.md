# Step 13 - door-peek (Block C)

Context press at a closed door: crack it open, peek through the crack, close it (or open it quietly). MoveState
`doorPeek`; the door's crack is host-authoritative (bible 5.3 Doors). Deps: 06. Model: implementer opus; checker opus. (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A (PROTOCOL_VERSION 3) and steps 09-12b (PROTOCOL_VERSION 7, MOVE_MODES up to `swat` 26). Line numbers
verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- docs/design-bible.md 385 (Doors), 404-412 (camera, corner peeking), 669-680 (C11)
- src/world/doors.ts 15-60 (DoorHow :20, DOOR :23-35, DoorState :36), 140-170 (`open` :144, `setOpen` :163),
  195-215 (enemy walk-through :206)
- src/world/maps/provingGrounds.ts 100-110 (shed door)
- src/net/coopHost.ts 820-860 (`doors()` :823, snapshot sig :841-850), 430-470 (dispatch); src/net/coopClient.ts grep
  `setOpen`; src/net/protocol.ts 150-160 (`snap` :154 `doors?`), parse `snap`
- src/player/moveState.ts 12-52, 160-230, 250-300; src/game/localMoveState.ts 1-130; src/net/remoteAvatar.ts 196-230
- src/player/shoulderCamera.ts 245-300; src/config/camera.ts 95-112; src/game/gameState.ts grep `'cover'` press path

## Task
1. Pure door-peek core in src/world/doorPeek.ts (Babylon-free): eligible when a door is closed (target 0), unlocked,
   its face within 1.0 m and the player faces it within 60 deg, grounded, not in another state.
2. Context press (`cover` action; touch context button) starts it: 0.25 s settle to the frame (shoulder to the hinge
   side, hand on the handle), then the leaf cracks to `DOOR.crack` 0.12 of its swing over 0.6 s, quiet (no noise on
   quiet floors; the quiet-open sound at 30% volume).
3. Peek view: camera to the crack (eye offset local, FOV x0.85), stick or mouse looks +-35 deg; camera never sent and
   never inside geometry.
4. Close: context press again or stick back 0.2 s -> leaf closes in 0.4 s, quiet. Push forward or `interact` -> the
   existing quiet open (`open(d, 'quiet')`). Damage, aim, jump or sprint ends the peek (door stays cracked until closed).
5. Gameplay facts (ASSUMED, logged): a cracked door keeps its collision body, keeps blocking light (bake unchanged)
   and guard sight; guards walking through treat it as closed and open it (doors.ts:206). Light parity holds because
   nothing about lighting or perception changes.
6. Doors gains `crack(d, on)`, `DOOR.crack = 0.12`, `DOOR.crackTime = 0.6`, `DoorState.cracked`.
7. MoveState `doorPeek` appended (index 27): `a` = door index, `sub` bit 1 = hinge on the right, `ph` = crack amount.
   Mirror in `localMoveState`, `poseFromMoveState`, remoteAvatar (pose at the frame), pack / sanitize (`a` < doors).
8. Host authority: new message `door {i, crack}` client -> host (parse + `tests/net.test.ts` case); the host checks
   reach (door centre within 1.5 m of the client's feet), closed and unlocked, then cracks it. Snapshots add `dcr?`
   (cracked door indices, MAX_DOORS cap) to the doors signature; clients mirror with `Doors.crack`. The host's own
   player uses the same function. A crack request on an open door is ignored.
9. A door opened fully by anyone clears `cracked`; the peeking player exits to ground.
10. PROTOCOL_VERSION 7 -> 8.

## Tests
- tests/doorPeek.test.ts: eligibility (distance, angle, locked, open), timings, close and open exits.
- tests/doors.test.ts (or the existing doors test): crack keeps the body, enemy walk-through opens a cracked door.
- tests/net.test.ts: `door` parse (index bound, bool), snapshot `dcr` clamp.
- e2e-pad (Proving shed door): A cracks, right stick looks, A closes; stick forward opens quietly.
  e2e-mouse: the KBM context key and mouse look do the same. e2e-touch: context button cracks (basic scheme).
- e2e-netmove: case "doorPeek" (host remote mode `doorPeek`, joints <= 10 cm); host door leaf at crack within 0.05.
- e2e-coop: a client crack shows on the host and a third page; close clears it.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-netmove e2e-coop e2e-stealth
  e2e-lightbake`
- `node scripts/anim-audit.mjs` local and remote (doorPeek pose: hand on handle < 2 cm, no clip into the leaf)
- Grep proofs: `grep -n "'doorPeek'" src/player/moveState.ts`; `grep -n "dcr" src/net/protocol.ts src/net/coopHost.ts`;
  `grep -rn "cracked" src/ai src/world/lightBake.ts src/voxel/lampBake.ts` empty; PROTOCOL_VERSION = 8.
- PC-PASS: crack view framing, pending PC run.

## Commit
"locomotion 13: door peek, MoveState doorPeek, host-authoritative door crack"
Then LOG, STATE, AUDIT (S05), CHANGELOG, TESTING, docs/systems/movement.md, world-and-characters.md, coop.md.
- Small carry-overs from the step 12b check (do first): scripts/e2e-netmove.mjs peek case add a lower bound on the head offset (local and host hd > 0.1 m); src/player/characterRig.ts ~361-365 posedHead comment (now called every frame per wall remote on the host); clear ref.head in RemotePlayer.accept when the move mode stops being wall.
