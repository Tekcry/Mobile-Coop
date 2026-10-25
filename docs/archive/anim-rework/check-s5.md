# Check: anim-rework slice 5, wall keys wired (commit 5b91485d, feature/anim-walls, 2026-10-20)

## Commands and results
- `npx tsc --noEmit -p .`: clean. `eslint` on wallKeyed.ts, animGraph.ts, wallKeyed.test.ts: clean (e2e-anim.mjs is
  eslint-ignored; `node --check` OK).
- vitest wallKeyed, wallStance, keyedDrawn, keyedWalk, wallController (59) + rig, anim, g1Locomotion (47): 106 pass.
- Not run (lock held, laptop): e2e-anim (new wall block), e2e-wall, sheets. Suggest e2e-netmove too (wall crouch knee hand).

## Findings
- Scope kept: 5 files (wallKeyed.ts new, wallKeyed.test.ts new, animGraph.ts wall terms + keyed block, e2e-anim wall
  block, report). No footPlanner, motion, keyed.ts, turnFollow, characterRig, limits.ts or clip edits. The keyed-block
  edit only adds `kWl` to `kT` and a `keyWallS` share; off the wall `kWl` = 0, so S2/S3 weights are unchanged.
- Six clips wired, standing and crouched, idle/slide/peek, eased by crouch. Mirroring matches the game: `wallSide`
  is the facing side (`wallFacing`), standing unmirrored at side 1 (open side right as keyed); crouched unmirrored at
  side -1, where the graph's `kneeHand` is +1 (right hand), as keyed. Mirrored slide plays half a cycle on.
- Duplicates zeroed by the keyed wall weight: `pelYStand`/`pelY`, `spYawSlide`, `WALL_SIDE_POSE.spine`. Crouched,
  `pose[pelY]` scales out by keyW x share x crouch, so the keys' dy is the full depth. KNEE_HAND untouched.
- Drawn stays procedural: `kWl` needs `fw` (free hands = carrier, holstered, no reload/swap/throw) and `1 - raiseS`.
  Guards (not carriers) get `fw` 0, so cover poses are unaffected.
- Hot path: no closures, iterators, temp objects or `Math.hypot`; module-level trios, preallocated poses.
- e2e-anim wall block: asserts on-wall, rig keyed weight > 0.9 (rig `keyWNow`, so the gate must open), knee range
  (`crabRanges`), knee over ankle <= 3 cm, feet never cross (planted track min > -0.5 cm), track within WALL_TRACK,
  for idle, slide both ways and both edge peeks, standing and crouched. It can fail. Gaps under polish.
- Co-op: remotes feed the same AnimInput (`wall`, `wallSide`, `lean`, crouch, carrier/holstered from MoveState) into
  the same graph; no wire change.
- Open item 1 (keyDrawn floor 0.02): sound. Only two readers: the rig gate (1766) and the glide hip shift (1791), which
  already excludes the wall. `keyTrunk` reads `dS`, not `keyDrawn`. After leaving the wall the floor lasts only while
  the keyed weight fades. Clean fix stays CT Core's (`|| this.input.wall` in the gate).
- Open item 3 (keep wallHeadYaw): justified. The rig sets the head in world space (characterRig ~2003: yaw + lookYaw
  + ...), so the keyed neck yaw never reaches the head; zeroing wallHeadYaw would leave the head square, against
  BRIEF "head turned to the open side".
- Open item 2 (drawn keyed legs at the wall): a follow-up; the brief allows procedural arms and pose when drawn.
- Open item 4 (ranges in the suite, not limits.ts): OK for now because limits.ts was out of scope. Move them to
  `CRAB_WALL` in limits.ts when CT Core next touches it (METRICS rule).

## Verdict
PASS (pending the laptop's e2e-anim + e2e-wall on 5b91485d; a failing wall assert there is a fix-round item).

## Polish list
1. Reversal pop: the mirror switches on the sign of eased `wallS` (`this.wallS || 1`), so a standing reversal snaps
   the keyed chest yaw (+12 to -12 deg), roll and pelvis dx in one frame. Blend the mirrored and plain samples by
   `(wallS + 1) / 2`, or add a wall-reversal continuity check.
2. e2e wall block: assert `speed > 0.1` on the slide rows and `edge !== 0` (or lean > 0.15) on the peek rows, so a
   row that never slides or peeks cannot pass as idle.
3. `WALL_KEYS.peekLean` copies `WALL.peekLean` (0.2); keep them in step or pass the ratio in from the input.
4. Possible doubled peek lean: the procedural body lean (`bd`) still applies on top of the keyed peek's 7 cm pelvis
   shift. Check on the walledge sheet.
5. The wrist frames of the crouched knee hand are unused (`keyedArm` is off with the knee hand on), as the report says.
