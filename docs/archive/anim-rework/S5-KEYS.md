# Slice 5 keys: back-to-wall clips (Course Ready Build, 2026-10-20)

Keyed by hand in the G8 key format from the realism standard (BRIEF section 3 "Walls and corners", M6), never traced,
and checked against the CT wall rules (`docs/systems/movement.md` "Back-to-wall": standing square to the wall in a
semi-crouch, crouched side-on). New files only; nothing is wired. The arms are holstered and close to the body; with a
weapon drawn the arms stay procedural (`WALL_READY`, `offWall`). Prototype quality.

## Files
Keys are in `scripts/anim-keys/keys/<clip>.json`; baked modules in `src/anim/clips/keyed/<clip>.ts` (`KEYED_<CLIP>`).
None is mirrored. Strips (8 phases, side and front): `docs/anim-rework/shots/s5-keys/<clip>-side.png`, `-front.png`.

| Clip | Keys / frames | Frame | Track half-width (bake) | Wrist |
| --- | --- | --- | --- | --- |
| wall_idle | 8 / 32 | square to the wall, open side RIGHT | 9.4 cm (hip width) | - |
| wall_slide | 8 / 32 (one step) | square, sliding RIGHT | 7.6 cm (mean of the step) | - |
| wall_peek | 8 / 32 | square, peek at the RIGHT edge | 10.1 cm | - |
| wall_crouch_idle | 12 / 64 | side-on (wall on the LEFT) | 12.2 cm | R hand on the knee |
| wall_crouch_slide | 8 / 32 | side-on, travelling forward | 6.2 cm | R hand on the knee |
| wall_crouch_peek | 8 / 32 | side-on, edge ahead | 10.1 cm | R hand on the knee |

## Measured numbers (key geometry, Wren at 1.75 m, hip joints 18.7 cm apart)
| Clip | Knees / hips | Planted track | Knee outside its ankle | Pelvis bob | Knee bend |
| --- | --- | --- | --- | --- | --- |
| wall_idle | 1.0x | 9.4 cm (hip width, as asked) | 0 | breathing only | 34 deg |
| wall_slide | 0.79x closed, 1.07x widest | 5.3 cm closed, 14.8 cm lead foot at the widest | 2.1 cm | 0.5 cm | 32-54 deg |
| wall_peek | 1.03x | 6.6 / 13.4 cm (outside foot out) | 1.4 cm | held | 32 / 40 deg |
| wall_crouch_idle | 1.05x | 10.9 cm | under 0 | breathing only | 112 deg |
| wall_crouch_slide | 0.90x | 7.3-7.6 cm | 1.4 cm | 2.0 cm | 80-102 deg |
| wall_crouch_peek | 1.01x | 9.4 / 10.2 cm | under 0 | held | 104 / 106 deg |

Elbows stay within 6 cm: abduction is 0-8 deg on hanging or knee arms. Standing knees are within 1.1x and crouched
knees within 1.25x. Two numbers exceed the brief's targets, but these are poses the brief itself asks for:
- **wall_idle:** its 9.4 cm track is over the 7 cm gait target because the idle keeps the asked hip-width feet.
- **wall_slide:** its lead foot is 15 cm off the line at the widest step, as a side step has to be.

## What was keyed
- **wall_idle:**
  - CT semi-crouch: knees 34 deg, hips 4 cm down, feet hip width.
  - Pelvis and chest tipped back 2 deg, so the shoulder blades and the back of the head sit a small gap off the wall.
    The game's root push sets the gap itself.
  - Head turned about 30 deg to the open side, with a slow look (26-38 deg) and two breaths.
- **wall_slide:**
  - The glide strafe's shuffle at the wall stance: the lead foot lifts low and steps out (a 12 cm step), the trailing
    foot closes. The feet never cross.
  - Height constant (0.5 cm bob).
  - Chest turned 12 deg and head 40 deg toward the travel, head dropped 10 deg.
- **wall_peek:**
  - The lean comes from the hips and the outside knee: the pelvis shifts 7 cm to the edge and dips 5 deg over the more
    bent right knee.
  - The trunk tips toward the edge (spine 6, chest 12 deg roll) and the head turns 55 deg round it, held more upright
    than the chest. Only the head and one eye should pass the edge (the game keeps the body at its edge marker).
- **wall_crouch_idle:**
  - CT's side-on crouch: the crouched idle's squat with the trunk about 45 deg over the knees (pelvis 24, chest 42).
  - The open-side (right) hand rests on top of its knee, palm down, fingers forward (wrist frame on every key); the
    wall-side hand hangs low by its shin.
  - Three breaths, a weight shift and a look ahead and back.
- **wall_crouch_slide:**
  - The crouch walk's legs in the side-on frame (8 explicit keys, so the hands keep their sides while the legs
    alternate).
  - The right arm is keyed to the knee's mean place (on the thigh just behind the knee), the left hand low.
- **wall_crouch_peek:**
  - The lean comes from the hips and the front (outside) knee: a split stance with the right foot forward and the
    left knee low behind on the ball of its foot.
  - The pelvis is 5 cm forward of the crouch, the trunk further over (chest 48), the head up and turned 12 deg toward
    the wall side.
  - The right hand on the front knee for balance (wrist keyed), the left hand low by the shin.

## Wiring notes (slice 5)
- **Mirroring.** The standing clips are written for the open side on the right and the crouched clips for travel to
  the right (wall on the body's left). Play them mirrored for the other side: swap the sides, negate dx, yaw and roll.
  For the crouched clips the mirror also swaps the knee hand to the new open side, which is what CT does.
- **Crouched clips are in the posed side-on frame.** The game already turns the body 83 deg (`WALL_SIDE.yaw`,
  `wallYawOffset`), so apply them after that turn, not on the capsule's frame.
- **Possible doubling with the procedural pose.** The rig already adds three things these keys also carry:
  - the standing pelvis drop (`WALL_STANCE.pelYStand` -8 cm);
  - the slide chest and head yaw (`spYawSlide`, `wallHeadYaw`);
  - the side-on trunk (`WALL_SIDE_POSE.spine`).

  The keys carry their own versions (dy -4 standing; chest 12 / head 40 sliding; chest 42 crouched). Use the keys
  instead of those terms, or zero the duplicated ones.
- **Crouched dy is the full crouch depth** (-23 to -37 cm), as in S4. Do not add it to the procedural crouch drop.
- **Knee hand.** `KNEE_HAND` IK should keep holding the knee contact. The keyed right arm only puts the hand close to
  it, and `keyedArm` is off while the knee hand is active (characterRig.ts), so the wrist frame needs that path to
  read it.
- **Duty and liftH:** set from the gait, not matched to the planner.
  - wall_idle and wall_peek: 0.56 / 0.04
  - wall_slide: 0.6 / 0.05
  - wall_crouch_idle and wall_crouch_peek: 0.56 / 0.04
  - wall_crouch_slide: 0.6 / 0.08
- **Not checked:** the in-game metrics, the wall gap in the game, the GPU look, and blending into and out of the wall.
- **Polish:** the standing slide's 12 cm step makes a quick shuffle at 0.39 m/s.
