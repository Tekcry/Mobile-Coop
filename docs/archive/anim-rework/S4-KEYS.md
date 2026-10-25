# Slice 4 keys: the crouched holstered clips (Course Ready Build, 2026-10-20)

Keyed by hand in the G8 key format from the realism standard (BRIEF section 3 "Stealth", M6), never traced. New files
only; nothing wired (slice 4 wires them). Prototype quality: believable, not tuned.

## Files
| Clip | Keys | Baked module | Frames | Track half-width |
| --- | --- | --- | --- | --- |
| crouch walk | `scripts/anim-keys/keys/crouch_walk.json` (4 keys, mirrored) | `src/anim/clips/keyed/crouch_walk.ts` (`KEYED_CROUCH_WALK`) | 32 | 6.2 cm |
| crouch run | `scripts/anim-keys/keys/crouch_run.json` (4, mirrored) | `src/anim/clips/keyed/crouch_run.ts` (`KEYED_CROUCH_RUN`) | 32 | 6.1 cm |
| sneak | `scripts/anim-keys/keys/sneak.json` (4, mirrored) | `src/anim/clips/keyed/sneak.ts` (`KEYED_SNEAK`) | 32 | 6.4 cm |
| crouched idle | `scripts/anim-keys/keys/crouch_idle.json` (12, not mirrored, wrist keyed) | `src/anim/clips/keyed/crouch_idle.ts` (`KEYED_CROUCH_IDLE`, with `wrist`) | 64 | 12.2 cm |

Preview strips (8 phases, side and front): `docs/anim-rework/shots/s4-keys/<clip>-side.png`, `<clip>-front.png`.
Bake: `node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs <clip> --preview` (Blender `-b`,
under the desktop heavy.lock).

## What was keyed
- How the legs were keyed: world thigh and shin angles per phase. Pelvis height comes from the longest-reaching leg, so a
  planted foot sits on the floor in the preview. The hips bob 1-2 cm, lowest at the foot strike. In stance the knees
  are bent 80-115 deg with the shins forward of the ankles (the knees over the toes). Legs add 2: about 6 cm a foot,
  inside the crouched 8 cm.
- Crouch walk: hips about 23 cm below standing; steps about 42 cm. The weight sits between the feet and the trunk leans
  forward (pelvis 16, chest 24 deg) with the head up. The arms hang along the body (in the world 8 deg back to 6 deg
  forward) with the elbows at 16-22 deg.
- Crouch run: hips about 21 cm below standing and almost level. The body leans forward (pelvis 22, chest 28 deg). The
  heel kicks high behind and the knee drives in front. The trailing knee stays 30 cm or more off the floor. Elbows
  70-85 deg.
- Sneak: hips about 29 cm below standing, with deeper knees than the crouch walk. Each step lands toes first and rolls
  flat, and the swing foot skims about 5 cm high. The trunk is more upright (pelvis 14, chest 18 deg), the head level,
  the arms close (elbows about 30 deg) with barely any swing.
- Crouched idle: a deep balanced squat with the feet about hip width and flat (the ankles bent 38 deg up). The knees
  are bent 112 deg and the hips sit 37 cm below standing and 10 cm behind the feet. Both forearms rest along the thighs
  with the hands on top of the knees, palm down and fingers forward. The wrist frame is keyed on every key: R yaw -80,
  roll 47; L yaw -76, roll 42, so the left hand is a little looser. Over 12 keys: three slow breaths, a 1.2 cm weight
  shift, and a head scan 16 deg right and 13 deg left.

## Open points (for the slice 4 wiring)
- **Pelvis height.** The clips' `pel` y is the full crouch depth (-22 to -37 cm), so the preview stands on the floor.
  The game adds a clip's dy to its own crouch drop (`characterRig.ts` "the height adds to the procedural one").
  - Fix: take the clip's dy relative to its mean, or let the clip's depth replace the procedural crouch.
- **Duty and liftH** are set from the gait, not matched to the planner's crouched values:
  - crouch walk: duty 0.6, liftH 0.08
  - crouch run: duty 0.45, liftH 0.12
  - sneak: duty 0.68, liftH 0.05
  - crouched idle: duty 0.56, liftH 0.04

  Match them to the planner when wiring.
- **Knee hand.** The idle's hands-on-knees needs `keyedArm` active while crouched idle. The anim-rig STATE notes that
  `keyedArm` is off while the knee hand is active (`characterRig.ts`, the knee-hand path).
- **Idle cycle length.** 12 keys at one a second assumes a 12 s period, like `KEYED_IDLE_PERIOD`.
- **Polish list** (not done: fix round used):
  - In the crouch run the forearms come to about horizontal at the front of the swing, so the hands are well ahead of
    the chest. Lower the elbows to about 60 and swing the arms further back.
  - The sneak's trailing knee drops to about 20 cm above the floor at toe-off.
  - The idle stance is 12 cm a foot, wider than the standing idle's 9.
- Not checked: the in-game metrics (e2e-anim crouched ranges), the GPU look and the hand-on-knee contact in the game.
