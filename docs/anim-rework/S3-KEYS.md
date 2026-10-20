# Slice 3 keys: the drawn-weapon leg clips (Course Ready Build, 2026-10-20)

Keyed by hand in the G8 key format from the realism standard (BRIEF section 3 "Weapon carry and aiming", M6), never
traced. New files only; nothing is wired. Legs, pelvis and trunk only: the arms are keyed neutral (hanging, elbows 10)
because the weapon arms stay procedural (hand IK on the gun). Prototype quality.

## Files
| Clip | Keys | Baked module | Track half-width (bake) |
| --- | --- | --- | --- |
| ready stance | `scripts/anim-keys/keys/ready_stance.json` (8 keys, not mirrored) | `src/anim/clips/keyed/ready_stance.ts` (`KEYED_READY_STANCE`) | 7.9 cm |
| glide forward | `glide_fwd.json` (4, mirrored) | `glide_fwd.ts` (`KEYED_GLIDE_FWD`) | 5.7 cm |
| glide strafe (right) | `glide_strafe.json` (8, not mirrored) | `glide_strafe.ts` (`KEYED_GLIDE_STRAFE`) | 7.6 cm (mean of the step) |
| glide back | `glide_back.json` (4, mirrored) | `glide_back.ts` (`KEYED_GLIDE_BACK`) | 5.7 cm |

All are 32 frames. Preview strips (8 phases, side and front): `docs/anim-rework/shots/s3-keys/<clip>-side.png`, `-front.png`.

## Measured numbers
From the key geometry, Wren at 1.75 m with hip joints 18.7 cm apart; the track half-width is the bake's.

| Clip | Knees / hips | Planted track | Knee outside its ankle | Pelvis bob | Planted knee bend |
| --- | --- | --- | --- | --- | --- |
| ready stance | 1.0x | 9.4 cm a foot (hip width, as asked) | 0 | 0 (breathing only) | 22-24 deg |
| glide forward | 0.82x | 5.9 cm | 1.8 cm | 1.1 cm | 12-34 deg |
| glide back | 0.82x | 5.9 cm | 1.8 cm | 1.3 cm | 10-34 deg |
| glide strafe, closed | 0.78x | 5.1 cm | 2.2 cm | 0.3 cm | 18 deg |
| glide strafe, widest | 1.07x | 6.5 / 14.9 cm | under 0 (knees inside the ankles) | - | 16-20 deg |

Targets: knees 0.5-1.1x, track 7 cm or less, knee over ankle 3 cm or less.
- All within target except the strafe at its widest: there the lead foot is 15 cm off the line, as a lateral step has to
  be. The ankles are 23 cm apart at the widest and 10 cm closed, a 15 cm step.
- Today's aimed strafe crab is 2-2.8x and 45-53 cm. This clip is 1.07x and 15 cm.

## What was keyed
- **Ready stance:**
  - Feet staggered 26 cm with the left forward, about hip width apart.
  - Knees soft, hips 2.5 cm below standing.
  - Pelvis 2 cm ahead of the feet centre, so the weight is a little forward.
  - Pelvis turned 6 deg right with the stagger; chest square (yaw 0).
  - Pelvis 6 / chest 4 deg forward, head upright.
  - Two slow breaths and a 0.6 cm sway over the cycle.
- **Glide forward:**
  - Steps of about 36 cm, heel first, rolled to the toe.
  - The stance knee bends to absorb each step, so the pelvis stays level within 1.1 cm.
  - No lean beyond the ready stance; pelvis yaw 1 deg.
- **Glide back:**
  - The reaching foot checks the ground behind with the toes first, then lowers the heel.
  - Knees bent over the toes; the front foot leaves heel first.
  - Steps of about 32 cm.
- **Glide strafe:**
  - Written for a step to the RIGHT.
  - The lead foot lifts low and steps out, the weight moves onto it, then the trailing foot closes in. The feet never
    cross.
  - Hips face forward (no yaw); pelvis level.

## Wiring notes (slice 3)
- **Left strafe:** play `glide_strafe` mirrored (swap the sides, negate dx, yaw and roll, as `mirror_key` in
  `key_clip.py`). The clip is one full step cycle, phase 0 with the feet closed.
- **Pelvis height:** dy is the full stance drop from standing (-1 to -4.5 cm). It is small, but the game adds it to its
  own drop (`characterRig.ts`). Take it relative to the clip mean if the procedural aim stance already lowers the hips.
- **Pelvis fore-aft:** dz is set so the pelvis sits over the mean planted foot: ready 4.8, forward 6, back 2, strafe 1.6.
  The keyed dz replaces the procedural one.
- **Duty and liftH:** set from the gait, not matched to the planner. Ready 0.56 / 0.04; glides 0.62 / 0.05; strafe
  0.6 / 0.05.
- **Weapon arms:** keep the arms off the keyed arm weight for these clips (or at zero); the neutral arm keys are only
  for the previews.
- Not checked: the in-game metrics (e2e-anim aimed strafe and backwards), the GPU look, and blending against the
  procedural aim pose.
- **Polish:** the strafe step is short (15 cm), so at a higher strafe speed the cadence rises. Lengthen the step if
  playtesting shows a fast shuffle.
