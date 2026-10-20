# Slice 5 report: wall keys wired (Sector Ops Build, anim-walls, 2026-10-20)

## Built
- `src/anim/wallKeyed.ts` (new): the six S5 clips as one set. Standing (square to the wall): wall_idle on a 5 s clock,
  wall_slide on the gait phase (by the slide's pace), wall_peek by the peek (the body lean over `WALL.peekLean`).
  Crouched (side-on): the same three crouch clips (idle on a 9 s clock). Standing to crouched by the crouch.
  Mirrored for the other side: standing for `wallSide` -1 (keyed open side right), crouched for `wallSide` 1 (keyed
  wall on the left, so the knee hand follows the graph's `kneeHand` sign). The mirrored slide plays half a cycle on.
- `src/anim/animGraph.ts`, wall paths only:
  - A wall share in the keyed weight. It is on when holstered (free hands `fw`), on foot and not aiming. It mixes into
    `o.keyed` with its track, knee pole, duty and lift (`keyedWallSet`).
  - The duplicated procedural terms give way by the keyed wall weight: `WALL_STANCE.pelYStand` / `pelY`, `spYawSlide`
    and `WALL_SIDE_POSE.spine`.
  - Crouched, the procedural crouch drop gives way, so the keys' dy is the full depth.
- A drawn weapon at the wall keeps the procedural pose (WALL_READY, the edge lean-outs); the arms stay procedural.
- The knee hand: `KNEE_HAND` IK keeps the contact. The rig turns the keyed arms off while it is active.

## Numbers
Not measured in game yet: heavy.lock was held by CT Core (S4) from 22:07 to after 23:15. The key geometry (S5-KEYS)
is inside the ranges: knee over ankle at most 2.1 cm, knees 0.79-1.07x standing and 0.90-1.05x crouched, and the slide
never crosses the feet. The planner places the feet in game, using the keys' track. The e2e-anim wall block measures
idle, slide both ways and both edge peeks, standing and crouched, and asserts: keyed weight > 0.9, knees in range, knee
over ankle <= 3 cm, no crossed feet, and the track within WALL_TRACK.

## Files
- New: `src/anim/wallKeyed.ts`, `tests/wallKeyed.test.ts`, `docs/anim-rework/S5-REPORT.md` (no `shots/s5/` yet).
- Changed: `src/anim/animGraph.ts` (wall paths, the keyed block's wall share, `keyedWallSet`), `scripts/e2e-anim.mjs`
  (new wall block).
- Untouched: footPlanner, motion, keyed, turnFollow, characterRig, limits.ts, the S2-S4 clips.

## Results
- tsc clean. eslint clean on the changed files.
- vitest: wallKeyed, wallStance, keyedDrawn, keyedWalk, rig, anim, g1Locomotion and wallController, 106 tests, all pass.
- **Not run:** `npm run check`, e2e-wall, e2e-anim and the before / after sheets in `shots/s5/`. The lock was held for
  the whole slot. For the laptop: `npm run build`, then `node scripts/run-e2e.mjs e2e-wall e2e-anim`. For the sheets
  (4189), build the before sheets from HEAD's animGraph.ts with the scenarios wall, wallslide, walledge (front),
  wallcrouch (side) and wallcrouchslide (front).

## Open items (CT Core)
- **Rig gate.** `characterRig` applies the keyed pose only in free gait (`stride 'facing'`) or with `keyDrawn` > 0.01.
  The wall is 'velocity', so the graph reports `keyDrawn` >= `WALL_KEYS.gate` (0.02) at the wall to open it. Nothing
  else reads `keyDrawn` at the wall. Clean fix: `|| this.input.wall` in that gate; then drop the floor.
- **Drawn at the wall.** The keyed trunk could carry a drawn carrier too. `AnimInput` has no carrier flag at the wall:
  `keyedDrawn` excludes the wall and `ready` means holstered. A rig flag would let the drawn wall use the keyed legs and
  trunk, with the arms staying procedural.
- **Head.** The rig keeps the head world-stable, which undoes the keyed neck yaw. `wallHeadYaw` is therefore kept: it
  is the head's only turn, and its values come from the footage (0.55 still, 1.3 sliding, peek). The keyed neck still
  shapes the neck.
- **Wall ranges** are in the e2e block, not `limits.ts`. Standing and crouched use `crabRanges`. The track is 10.5 cm
  for the idle (hip width, as CRAB_IDLE) and 16 cm for the slide and peek (the side step's 15 cm lead foot, S5-KEYS).
- The crouched wrist frames: the knee-hand path does not read them (`keyedArm` is off while the knee hand is on).
- Not checked: blending in and out of the wall on GPU beyond the sheets, and the remotes in a live session. The remotes
  run the same graph from `MoveState`.
