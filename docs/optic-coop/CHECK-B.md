# optic-coop: check B (gameplay and engine side)

Verdict: **PASS**

Fresh Opus checker B, branch `feature/optic-coop` at f32aaf17 (diff `origin/master...f32aaf17`). Code not edited.

## Runs (one at a time)
- `npx vitest run tests/opticCoop.test.ts`: 15 / 15 pass.
- Related files: opticCable 12, doorMenu 3, poseParity 12, animN4dKill 11, marlowN9SlideDoor 11, doorPeek 15,
  moveState 15, net 75, medkit 5, rappelFence 7, teamClimb 6, changelogAssemble 13, changesFragments 1: all pass.
- `npx tsc --noEmit -p .`: clean. `npx eslint` on the 11 changed src files and the new test: clean.
- No e2e run (as briefed). The new e2e-netmove "optic cable" section has not run anywhere yet.

## Blockers
None.

## Checked
- Door path from #239 unchanged: `pick` gives the same gap ray (both ends at `ty + OPTIC.pad`, as before),
  `begin(di, 0)` = the old `core.start(di)`, abort on the door gone or opening is the same, `ov.crouch` is true for
  doors (`opticPlace`), the base pitch is 0, so `clampTipPitch(p, 0)` is the old clamp. "Sealed" still comes first
  (opticCable / doorMenu tests pass). The door menu's OPTIC CABLE row still calls `optic.pick` (gameState.ts:1519).
- New gaps: `OpticPoint`, `LevelBuilder.opticGap` (data only) -> `BuiltLevel.opticPoints` (the only BuiltLevel
  constructor, so `level.opticPoints` always exists for the client's per-snapshot check). `opticPointPlace` /
  `opticPointRefusal` / `opticPlaceOf` / `opticCableEnd` are pure, Babylon-free, allocation-free (`hyp2`) and tested.
  "Too far" (1.0 m flat, 0.6 m under to 2.4 m over the feet) before "No gap" (collision ray gap -> tip + pad). Panel
  fed standing (`crouch` false -> no crouch bit -> the partner stands too). Shaft top -> sub 3, as documented (A1).
- Gameplay never reads render state: the placement reads map data, door anchors and `ballistics.hitDistance`
  (collision) only. The hand (`rig.reachR`) and the cable (`world.ropes`) are written in `frameUpdate` / the remote's
  render path and read by nothing in gameplay. Light parity untouched (the cable has no light).
- Local hand and cable: render only; the camera still sits at the tip (frameUpdate unchanged apart from the base
  pitch); the cable stops at 0.85 in the view so it does not poke the camera. The view stays local: the look is
  consumed by `optic.look`, `cam.yaw` and the wire's `ay` / pitch are untouched; only mode, sub, `a` and `ph` go out.
- Wire: `optic` appended (older indices stay), sanitize refuses a bad sub or index, `dropBadDoorMove` covers sub 0,
  `dropBadOpticMove` on host accept and client snap. No `PROTOCOL_VERSION` change. Team moves treat a partner in
  `optic` as busy (teamMoves.ts:59), as wanted.
- Skipped items left open, not half-wired: no new input, no map placement, `pickPoint` is a public method with no
  caller (lint clean, documented as A6 in ct-toolkit section 2 and the status line). F is the co-op action
  (keyBindings.ts:63), so not binding it is correct per section 2 ("stops and asks Michael").
- Docs: ct-toolkit status, rows :52 / :81 / :223 / :255, coop.md, TESTING.md and the fragment match the code.
  No reference-game names in the diff.

## Polish (none blocks)
1. Ceiling panel look passes vertical: base +50 deg plus `pitchMax` 60 gives 110 deg (opticCable.ts:220,
   :174, :275), and `camera.rotation.set(-pitch, ...)` then turns the view upside down. Not reachable until a gap
   input exists; clamp the absolute pitch to about +-85 deg when binding. On a floor gap straight down (-90) is out of
   reach (-60 lowest); fine for the prototype (A3).
2. `pickPoint` (opticSystem.ts:66) skips the busy checks the door menu has (gameState.ts:1468: door peek, door
   open, wall, attached, committed, team, carrying). The future binding (or `pickPoint` itself) should apply them.
3. The default tip plus pad is 0.46 m along the normal (`gapClear`, opticSystem.ts:91): a raised-floor void
   shallower than that refuses "No gap" unless the map gives a tip. A gap point placed on the slab surface starts the
   ray 2 cm inside it. Worth a line in ct-toolkit section 5 for whoever places the first gap.
4. The 3-D `pickPoint` / `gapClear` path and `LevelBuilder.opticGap` run in no test (their pure parts do). Add an
   e2e step when the first map places a gap.
5. Foot parity: the partner's copy settles its feet in `optic` (moveState.ts:344) but the owner's `pose.settle`
   is only set by the door peek (gameState.ts:2845). Small, visual only.
6. Under a panel the body stands but `ov.noise` stays 'crouched' (opticSystem.ts:142). Silent while still anyway.
7. e2e-netmove's optic section prints SKIP on "No gap" (scripts/e2e-netmove.mjs:729), so a blocked Proving door
   would hide it. Check the laptop run prints the asserts, not the SKIP.
