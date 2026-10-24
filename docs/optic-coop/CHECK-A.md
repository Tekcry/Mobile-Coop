# optic-coop: check A (fresh Opus, wire and host / client agreement)

Verdict: **PASS**. Commit checked: f32aaf17 (diff `origin/master...f32aaf17 -- src tests scripts`).

## Runs (one at a time)
- `tests/opticCoop.test.ts` 15/15, `tests/net.test.ts` 75/75, `tests/animN4dKill.test.ts` 11/11, `tests/poseParity.test.ts` 12/12.
- Also touching moveState / remoteAvatar / opticCable: animMoveRows 18, climbHands 5, doorPeek 15, doorPeekParity 1,
  editor/ceilings 12, editor/climb 17, hangDownNet 5, hostageGait 10, medkit 5, moveState 15, opticCable 12,
  rappelFence 7, remoteAvatarSeed 8, teamClimb 6, teamMoves 24: all pass.
- `npx tsc --noEmit -p .`: clean. No e2e run (the e2e-netmove "optic cable" section is unrun here).

## Findings on the focus points
- **Mode index.** The mode goes on the wire as its number (`packMoveState`, `src/player/moveState.ts:271`). `optic` is
  appended last (`moveState.ts:57`), so every older index is unchanged (tests still pin `doorPeek` 26, `takedown` 16,
  `wall` 1). An older build receiving index 27 gets `MOVE_MODES[27]` undefined -> `sanitizeMoveState` null -> `mv`
  dropped by `protocol.ts:375` (pose as ground), no crash. `PROTOCOL_VERSION` untouched; the new test reads the
  constant only (`> 0`). Announced in REPORT.md.
- **Parse bounds.** `sanitizeMoveState` (`moveState.ts:228-231`): sub must be an integer 0..3 (missing / out of range ->
  null); `a` >= 0 and < `doorCount` (96 default on the wire) for sub 0, < `OPTIC_POINT_MAX` 256 for subs 1-3; `a` is
  floored, NaN / non-number falls to -1 and is refused. `ph` clamped 0..1 (`num`), sub re-clamped at `:237`.
- **Level check on receive.** Host: `RemotePlayer.accept` runs `dropBadDoorMove` (now covers optic sub 0) and
  `dropBadOpticMove` with the level's `opticPoints.length` (`remotePlayer.ts:116-118`, `coopHost.ts:673`). Client:
  `dropBadOpticMove` on every snapshot player (`coopClient.ts:418`). Even past those, the pose read is safe:
  `remoteAvatar.ts:424` uses `doors.list[mv.a]?.anchor` and `opticPoints[mv.a]` (undefined -> `opticPlaceOf` null),
  and `opticPlaceOf` also refuses a gap whose kind does not match the sub. No out-of-range index can crash.
- **Pose reads wire + level only.** The partner's hand / cable come from `mv.sub`, `mv.a`, `mv.ph`, the door anchor or
  the level's `OpticPoint`, and the copy's own interpolated position; the kneel from the crouch bit plus `moveKneels`.
  Nothing gameplay reads the cable or the pose (`world.ropes` and `rig.reachR` are render; `teamSide` / `teamMates` see
  `mode 'optic'`, which no team move accepts). Owner and partner use the same `opticPlace` / `opticPointPlace` /
  `opticCableEnd` with the same `DOOR.thickness`; side / direction from the body converge once the body is on the
  kneel spot. Intended difference: the owner's cable stops at 0.85 in the view (A4).
- **No static `src/net` import from single player.** The only new imports into `src/net` files come from `player/` and
  `config/` (allowed direction). No file outside `src/net` gained a `net` import; `opticCable.ts` stays Babylon-free
  (now reached from `remoteAvatar`).
- **No per-frame allocation.** `OpticSystem.handFrame` writes the preallocated `end` and a constant key;
  `RemoteAvatar` uses preallocated `opticPl` / `opticEnd` and a key built once in the constructor; `opticPlace`,
  `opticPointPlace`, `opticCableEnd`, `clearGripAxis`, `Ropes.set` (preallocated vectors, `indexOf` on a fixed array)
  and `localMoveState`'s new branch allocate nothing. `gapClear` uses the class's vectors (pick time only anyway).
- **Pings from the view.** Correct: `OpticSystem.frameUpdate` sets `cam.gamePos` to the tip and `cam.forward` to the
  tip's look (`opticSystem.ts:174-175`); `GameState.sendPing` casts from `cam.gamePos` (`gameState.ts:3241-3245`) and
  reads the real input while viewing (`:1787`). Host check (`coopHost.ts:728-731`): rate 0.8 s and the hit point within
  150 m horizontally of the sender's feet; the ray is 120 m from a tip within ~1.3 m of the feet, so a view ping is
  always accepted. No input binds `ping` yet (REPORT open item).

## Blockers
None.

## Polish
1. Client snapshot path has no `dropBadDoorMove` (pre-existing for doorPeek): an optic sub 0 with a door index in
   [doors.length, 96) kneels with no hand or cable instead of posing ground. Harmless; add it beside `coopClient.ts:418`
   for symmetry with the host.
2. `LevelBuilder.opticGap` does not cap at `OPTIC_POINT_MAX` (256): a map with more gaps would send states every peer
   drops (ground pose, no crash). A dev assert in `opticGap` would catch it.
3. `remoteAvatar.ts:436-440`: leaving optic zeros `reachR.w` unconditionally, which could cancel a right-hand reach a
   block above set in the same frame (e.g. optic -> doorPeek in one snapshot); one frame at most. Guard on the mode.
4. `coopHost.ts:675` passes `msg.s.mv.m` to `onRemoteMove` even when accept dropped a bad gap (pre-existing pattern
   for doorPeek / wall); course mode only logs the mode name.
5. First frame of the view: a ping in the sim step before `frameUpdate` would still cast from the shoulder camera
   (one frame); moot until ping is bound.
