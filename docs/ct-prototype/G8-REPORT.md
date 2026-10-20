# G8 report: animation feel, the keyed walk proof (2026-10-20)

Implementer, Opus. Michael (10:10): "i played through it and want to focus on fine tuning the animations, they all look
weird and unnatural" ... "Legs are out too wide, looks like a crab. Elbows also go out too wide when moving quicker.
This all translates to crouching too, and crouching idles too quick, and the hand resting on the knee is upside down and
not sitting on the knee". Direction change (10:25): "You have all walking videos from CT, why cant we match it" ...
"Yes, keyframed clips". So: the before evidence for every gait, then the pipeline (`G8-PLAN.md`) and the walk as the
proof. Jog, run, crouch walk, crouch run, crouch idle and the wall knee hand wait for Michael's verdict on the walk.
Uncommitted in the working tree of `feature/ct-prototype`.

## Sheets
- Before (CT row on top, ours below, frame times in each tile): `shots/g8/before/` `walk-side.jpg`, `walk-front.jpg`,
  `jog-side.jpg`, `run-side.jpg`, `run-backfront.jpg` (CT from behind, ours from the front), `crouchwalk-side.jpg`,
  `crouchwalk-front.jpg`, `crouchrun-side.jpg`, `crouchidle-front.jpg`, `wallknee.jpg`; our raw sheets in
  `before/ours/` (both views of every gait). CT frames: ffmpeg from `pc/ct-work/clips` (105949 @ 11.8-12.9 side, 105509
  @ 33.0-34.1 front, 110038 @ 10.6-11.3, 110117 @ 0-0.55 and 6.9-7.45 and 12.5-13.6, 110341 @ 39-40.4, 105624 @ 50-51.8
  and 53-55.75, 051917 @ 34.5-37.25).
- Walk proof: `shots/g8/walk-proof/walk-side.jpg` and `walk-front.jpg` (rows: CT, before, after), raw sheets in
  `walk-proof/ours/` (side, front, back, front three-quarter).
- Keyed pose previews (Blender, not committed, rebuilt by the pipeline): `build/anim-keys/walk-side.png`, `-front.png`.

## Before (measured)
Ours: `scripts/anim-keys/measure.mjs` (new): the rig's joints over the cycle in the body frame, from `dist/` (raw:
`pc/ct-work/frames/g8/measure-before.json`). CT: by eye and pixel counts on the frames above, scaled by the hero's
height (~1.8 m) and head (~0.2 m); estimates, +-2 cm / +-5 deg. Wren's hip joints are 0.17 m apart (2 x hipHalf).

| gait (pace) | item | CT | ours before |
| --- | --- | --- | --- |
| walk (1.36 m/s) | track (ankle centres) | ~0.12-0.15 m, ~0.65-0.8 hip widths, feet nearly on one line | 0.17 m, 0.98 hip widths |
| | knee separation | ~0.12-0.15 m (thighs brush) | 0.187 m |
| | elbow out of the shoulder line | ~0.02-0.04 m (arms hang close) | 0.082 m (max 0.107) |
| | wrist from the midline | just outside the thigh | 0.28 m |
| | elbow flex | ~15 back, ~30-35 forward | 16 (17 max): a near straight hang all cycle |
| | wrist swing fore-aft | ~0.2-0.3 m | 0.11 m |
| | stride (ankle range) | ~0.65 m | 0.66 m |
| | pelvis bob / sway | head 2-3 cm / < 2 cm | 4.1 / 2.6 cm |
| | torso lean | 3-5 deg | 5 deg |
| jog (2.9 m/s) | elbows | ~85 deg, tucked to the trunk | 84 deg, 0.185 m out of the shoulder line (max 0.234): "chicken wings" |
| | track / knees | under the body | 0.166 m / 0.20 m |
| | torso lean | 10-15 deg | 21 deg |
| run (4.4 m/s, gear 5) | elbows | ~90 deg, within ~5 cm of the trunk, hands in front of the hips | 85 deg, 0.186 m out (max 0.237) |
| | torso / cadence | 20-25 deg / ~4.6 steps a s | 22 deg / ~5 (short sample) |
| sneak (0.82) and crouch walk (1.65) | track / knees | feet under the knees, knees inside the hip width (~0.2 m at most) | 0.18 m / 0.27 m: each knee bowed 4.5 cm out of its hip-ankle line (the crab) |
| | elbows / hands | hanging close by the thighs | 0.14 m out of the shoulder line, wrists 0.27-0.28 m from the midline ("gorilla") |
| | torso | 30-45 deg | 40 deg |
| crouch run (2.5, gear 5) | knees / elbows | as the crouch walk, torso 60-70 deg | 0.25 m / 0.146 m out; torso 49 deg |
| crouch idle | breathing / sway | still for 3.5 s at 2 fps (105624 @ 27-30.5; no visible cycle, < ~5 mm; a lamp flicker stops a pixel track) | kneel; head cycle 3.5 s at 6 mm; the crouch idle clip's height keys repeat every 2.1 s |
| wall knee hand | the open-side hand | palm down on top of the front knee, fingers forward over it, elbow ~60-80 deg | the wrist ahead of the knee with the fingers pointing up (`before/ours/wallcrouch-front.jpg`) |

Causes found in the code (evidence for the keyed follow-ups, not tuned here):
- Elbows out at speed: the free arm's elbow pole is `0.55` out to the side (`characterRig.ts solveArm`, `dirToWorld(side *
  0.55 ...)`) plus `HOLSTER_ELBOW_OUT` 0.8 on the right; at the jog's 85 deg bend the elbow swings out, not back.
- Crouched crab: the knee pole `KNEE_OUT` 0.12 and the knee-gap rule (`KNEE_GAP` 0.15 m, a pole up to ~70 deg out when the
  knees come closer); the crouch clips' `width` 1.3-1.35.
- Wall knee hand: the hand continues the forearm (wrist identity) and the forearm comes down and forward onto the knee, so
  the palm faces forward and the fingers up; nothing keys a wrist frame.

## What changed (walk only)
New pipeline (`G8-PLAN.md`): hand-typed key poses, baked on Wren's armature in Blender 5.2.2 headless, sampled into a
bundled clip that the graph and rig play over the procedural layer.
- `scripts/anim-keys/keys/walk.json`: 4 keys (0, 0.125, 0.25, 0.375), mirrored: feet in toward the midline (adduction
  1.7 deg), knees straight forward (pole out 0.02), arms hanging 6-7 deg out with a 5 deg carry angle, swinging opposite the
  legs (forward 13 deg with the elbow at 27, back 11 at 14), pelvis over the planted foot (+-1.2 cm), turning 4 deg
  against the chest (-3.5 deg), a 5 deg pelvis tilt and 4 deg chest lean, a small keyed height shape (the legs' reach makes
  the rest of the bob).
- `scripts/anim-keys/py/key_clip.py` (Blender), `scripts/anim-keys/build.mjs` (driver), output
  `src/anim/clips/keyed/walk.ts` (generated, 32 frames), `src/anim/keyed.ts` (format and sampler, no allocation).
- `src/anim/animGraph.ts`: `KEYED_WALK_BAND` (full to effort 1.2 = just over gear 2, gone by 1.8; amp 0.5 at a standstill;
  eased 0.08 s; slower walks +0.04 stance, -25 % lift); `RigTargets.keyW / keyArmW / keyed / keyKneeOut`; the stance
  half-width toward the clip's (`half` 0.059 at 1.75 m, was hipHalf ~0.09), the planner's duty / lift toward the clip's
  (0.54 / 0.06: a longer 0.6 stance made the head bob 5.4 cm, measured, so the duty stays the old walk's).
- `src/player/characterRig.ts`: after the procedural solve, by the weight: the pelvis offset (x, z replaced; the height
  added to the procedural, so the posture and the legs' reach stay), pelvis / spine / chest / neck rotations
  (`keyedTrunk`, with the turn follow), both free arms onto the keyed elbow and wrist points (`keyedArm`, the rig's own
  bone frames), the knee pole (`kneeOutNow`) and the knee-gap rule's threshold (`KEYED_KNEE_GAP` 0.11 m under the keyed
  walk, 0.15 otherwise). The trunk clearance, rate limits and foot planner are unchanged. `keyedWalk` getter for tests.
- `scripts/anim-sheet.mjs`: scenarios `run` (gear 5, 4.5 m/s; `sprint` is the full-stick jog) and `crouchrun5`.

Old -> new (walk, measured the same way; raw `pc/ct-work/frames/g8/measure-walk1.json`):

| item | before | after (keyed) | CT |
| --- | --- | --- | --- |
| track | 0.17 m (0.98 hip widths) | 0.13 m (0.75) | ~0.12-0.15 m |
| knee separation | 0.187 m | 0.155 m (min 0.153) | ~0.12-0.15 m |
| knee bow out of the hip-ankle line | 0.8 cm | 0.2 cm | ~0 |
| elbow out of the shoulder line | 8.2 cm (max 10.7) | 3.0 cm (max 3.7) | ~2-4 cm |
| wrist from the midline | 0.28 m | 0.26 m | just outside the thigh |
| elbow flex | 16 (max 17) | 21 (max 27) | ~15-35 |
| wrist swing fore-aft | 0.11 m | 0.29 m | ~0.2-0.3 m |
| torso lean | 5 deg | 4 deg | 3-5 deg |
| head bob | 4.1 cm | 4.1 cm in game (3.35 cm in the NullEngine walk test, was 3.15) | 2-3 cm |
| stride, cadence | 0.66 m, 2.5 steps a s | the same (the planner's) | ~0.65 m |

Network parity: no wire change (PROTOCOL_VERSION 24). The weight comes from MoveState inputs (speed, crouch, stride) and
the graph's own clock, so a remote copy plays the same clip (`keyedWalk.test.ts`: owner and remote at weight > 0.95, arms
on the keyed points within 2 cm, knees >= 9 cm).

## Tests
- New `tests/keyedWalk.test.ts`: the sampler (frames, wrap, amp, negative phases), the clip against the footage numbers
  (track <= 0.75 hip widths with the soles >= 0.11 m apart, elbows <= 4 cm and wrists <= 9.5 cm out of the shoulder line,
  wrist swing 0.18-0.32 m, counter swing, pelvis over the planted foot, hips against shoulders), the graph's weight (full
  at gears 1-2, 0 jogging, crouched, on a wall, in the air, raised, spinning, still; eases in; the stance half-width;
  remote clock; arms only with free hands) and the NullEngine rig (owner and remote).
- `tests/anim.test.ts` "duty and lift follow speed": the creep sample now settles 30 frames before it is read (the keyed
  weight eases in over 0.08 s; one frame read a half blended stance). The assertion (slower = longer stance, lower lift)
  is unchanged and holds.
- Unchanged and passing: g1Locomotion (walk head bob <= 3.5 cm: 3.35), turnFollow, footPlanner, rig, posture x2,
  readyHands, animAudit, gaitEffort.

Run here (desktop, `heavy.lock` held): `npx tsc --noEmit` clean; eslint clean on the changed TS; vitest 11 files 142 tests
pass; `npm run build` ok on the new base (master 51af5ffb, 4.13.0, merged under the working tree mid-slice: rebuilt, the walk
proof re-rendered); e2e on port 4195, serial, on that build: e2e-anim (walk foot lock 0.00 cm), e2e-move, e2e-clip, e2e-wall,
e2e-traverse all pass.

## Fix (coordinator, after the walk proof)
`npm run check` failed 2 tests in `tests/g7CloseQuarters.test.ts` (the hostage hold / walk at 0.7 m/s: her legs met the
guard's). The keyed walk narrowed her stance under the hold, but the hold needs its own offset stance. Fix: a new
`AnimInput.keyedOk`, which the rig sets only for free movement along the facing with no close-quarters bend (`bend` /
`bendDrop` > 0: a held guard, a lifted or carried body, a knockout). It is off by default, so guards and scripted rigs
stay procedural. The owner and the remote both pass `bend` from the same MoveState numbers, so parity holds. Tests:
`keyedWalk.test.ts` now also checks `keyedOk` false -> weight 0, and the rig letting go of the keyed walk when it holds
(owner and remote). g7CloseQuarters passes. `npm run check` passes (177 files, 1943 tests, build ok).

## The rig (step 3)
- No toe joint in the game LODs (17 joints; the hero LOD's toe bones are not exported): the foot is one rigid block, so
  the heel-to-toe roll pivots the whole foot (the toe-off lifts the ankle by `TOE_BALL` and the toes stay straight). Seen
  in `walk-proof/ours/walk-side.jpg` at 0.42 s and 0.92 s (the trailing foot's sole a flat plank on its tip). Next step:
  a toe joint per foot (LOD export joint list and toe-box weights in `bake_lods.py`, two rig nodes, toe pitch from the
  planner's roll), about half a day plus a LOD rebuild.
- The wrist has no keyed frame: the knee hand needs one (palm down, fingers forward); planned in the knee-hand clip, no rig
  change (about 1 h).
- No shoulder girdle bones and no fingers (grip morphs): enough for the gaits.
None of these blocks the walk; the keyed approach does not need a new rig for jog, run or the crouch gaits.

## Not done (waiting on Michael's verdict on the walk)
Jog and run (elbows tucked: the keyed elbow points replace the 0.55 out pole), crouch walk / run (knees inside the hips,
hands by the thighs), crouch idle (a slower, smaller breath: CT shows none at 2 fps over 3.5 s; ours 3.5 s at 6 mm), the
wall knee hand (keyed wrist frame). The head bob (4.1 cm in game, CT 2-3) comes from the legs' reach (the pelvis drop),
not the clip: worth a look with the run, not tuned here.

## What Michael should try
On `/ct/` (after the job lead pushes), standing, walk at gears 1 and 2 (D-pad) in a straight line and in curves, seen from
behind and from the front (orbit the camera): the feet land nearly on one line, the knees pass close and point forward, the
arms hang close to the body and swing opposite the legs with a bent forward elbow. Gear 3 and up, crouched, aimed, on a
wall: unchanged (procedural). The walk proof sheet: `shots/g8/walk-proof/walk-front.jpg`.
