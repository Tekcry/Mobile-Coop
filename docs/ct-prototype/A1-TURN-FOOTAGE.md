# A1 - Lower body in turns: footage vs code

Read-only research, 2026-10-18. Michael's note: "Hips and legs seem to follow the body to prevent clipping or awkward stances when walking in circles or turning etc based off ct footage. Must review before making changes."

Sources: docs/research/ct-movement/ct-measure-turns.md (MT), ct-footage-catalogue.md (CAT), ct-measure-speeds-stops-posture.md (MS), ct-locomotion.md (LOC), docs/archive/locomotion/PROTOTYPE-PLAN.md P1 step 4. Clip ids are `HHMMSS` of `clip_13570_20261017_*.mp4`.

## 1. What the footage docs say

### Measured (read from footage)

| topic | finding | clip / time |
| --- | --- | --- |
| No stationary turn | Any stick input walks. A spin on the spot is the normal walk cycle on a circle of radius about 0.15-0.2 m; hero stays within about 0.25 m of one spot. | 051339 5.2-6.03 s |
| Spin rate | One 360 in 0.83 s (about 430 deg/s); repeats 0.8-0.9 s per turn, so 400-450 deg/s. Hard cap about 450. | 051339 5.2-8.0 s |
| Steps per turn | Cadence unchanged, one step per 0.2-0.25 s: about 4 steps per 360, 1 per 90 deg, 2 per 180. More steps per 90 deg at slower yaw rates. | 051339 5.2-6.03 |
| No pivot, no leg twist | "Legs never twist or stay planted." No pivot on a planted foot, no wind-up pose. | 051339, 051501 (MT s.1, s.3) |
| Crouched | Same cap 400-450 deg/s; crouch-walk or crouch-run cycle keeps playing on a tight circle. No separate crouched turn clip. | 051501 2.4-4.9 s, 19.4-22.0 s |
| Run | Cap 300-400 deg/s (about 290 at 0-2.4 s, about 370 at 17-19.7 s); path radius about 0.5-0.6 m; no outward drift or skid. | 051339 0-2.4, 17.0-19.7 |
| Flick 180 | 0.40 +-0.04 s, four flicks. About 0.05 s ease-in, about 450 deg/s (peak about 600 in first 0.1 s), about 0.05 s ease-out. Cycle continues, about 2 steps per 180, hero already moving in the new direction from about 90 deg of turn. No pivot pose. | 051250 5.93-6.33, 22.08-22.48 (25/60/95/125/150/175/180 deg at +0.033/0.10/0.17/0.23/0.30/0.37/0.40 s), 26.97-27.37 |
| Run reversal | One continuous turn 0.37 +-0.04 s (about 490 deg/s), running gait continues, no brake or plant; forward travel stops as the turn starts, speed near zero mid-turn, back at pace about 0.3 s later; about 0.7 s total, no slide past the turn point. | 051421 7.28-8.0 s |
| Slow back walk | Slowest gear only: hero faces away from camera and drifts back about 1 m per 2 s (about 0.5 m/s +-0.3). Any faster gear turns 180. | 051250 0-5.75 s, 12.5-18 s |
| Head leads | Head leads the shoulders by 1-2 frames (about 0.03 s) at flick start. | 051250 5.93, 22.08 |
| Bank | About 10 deg (+-5) torso lean to the inside at run, legs splayed wide; none at walk. Low confidence (top-down). | 051421 1.6-2.4 s |
| Body vs camera while aiming | Body locked to camera yaw, no lag or catch-up. Legs out of frame. | 051543 4.9-6.3, 9.9-10.1 |
| Stops (not turns) | Root stops first, torso pitch follows about 0.15 s later; feet freeze mid-stride, no closing step. | MS: 050827 28.05-30.4 |

Source-based (not footage), LOC: CT locks feet in position and orientation during the weight shift on a direction change, a "stylistic workaround" [S4]. SC1 turns in place with a looping step-turn clip above about 55 deg/s [`EPawn.uc`]. LOC: no source describes a reversal pivot. LOC P3: "Spinning in circles should play a continuous stepping turn, never a leg twist."

### Answers to the questions asked

- **Pelvis lead or lag vs torso?** Not covered. Only the head leading the shoulders by about 0.03 s at flick start (051250). No pelvis-vs-torso reading exists. MS's torso lag at stops is pitch, not yaw.
- **Upper body twist from hips?** Not measured. MT gives no number for shoulder-vs-hip yaw.
- **Feet cross or step around?** Not covered. MT: "Feet are out of frame in the behind views (051044, 051543), and night vision hides foot detail top-down. Foot order is not readable."
- **Step width in a circle?** Not measured. Only path radius (0.15-0.2 m) and, at run, "legs splayed wide" in the bank (051421 1.6-2.4).
- **Foot pivot or shuffle?** Measured as absent: "no pivot on a planted foot", "no pivot pose", "no brake, plant, pivot or push phases"; normal cadence continues.
- **Standing vs crouched?** Same cap and same cycle-on-a-circle. Crouched detail is thin: only 051501 (top-down, night vision). Crouched slow back walk unconfirmed (051501 11.5-17 s).
- **Michael's hypothesis (hips and legs follow the body to avoid clipping):** consistent with "no pivot, no leg twist, cycle continues", but never observed directly. The evidence is the absence of twisted or planted legs, not a view of the pelvis.

### Not covered - clips to re-watch

| to settle | clip | time |
| --- | --- | --- |
| Foot order and crossing in a tight spin | 051339 (top-down); also 051044 (front, side, back of hero) | 5.2-8.0 s at quarter speed; 1.6-11.25 s |
| Pelvis vs shoulder yaw at flick start | 051250 | 5.93-6.33, 22.08-22.48, 26.97-27.37 |
| Step width / splay in a run turn | 051421 | 1.6-2.4 s |
| Crouched spin feet, crouched back walk | 051501 | 2.4-4.9, 11.5-17, 19.4-22.0 |
| Slow back walk feet (shuffle?) | 051250 | 0-5.75, 12.5-18 |
| Walking circle about 1 m radius, hips vs travel | 051401 | 3.5-4.0 s |

## 2. What the code does today

Working tree note: src/config/movement.ts and src/player/* have uncommitted edits by another agent (CT.turnRate 8.8 rad/s, turnAccel 300 when read).

**Root yaw (src/anim/motion.ts `stepCt`, `updateYaw`).** Free (not aiming) the body yaw turns toward the stick at `CT.turnRate` 8.8 rad/s (about 505 deg/s), accel 300 rad/s^2, via `turnToward` (line 418). Velocity runs along the facing (`heading = yaw`), so the path follows the facing. A 180 at the cap is about 0.4 s. Pace dips by `turnDip` 0.55 x smoothUnit(angle/pi), so a reversal slows and recovers. Slowest gear plus stick over 135 deg walks backwards at 0.5 m/s (release under 120 deg). The CT path has no pivot state. Stepped turn chunks (`startChunk`) remain only on the non-CT aim path. No speed-scaled cap (run 300-400 deg/s is not applied).

**Pelvis and torso (src/anim/animGraph.ts, clips/locomotion.ts, src/player/characterRig.ts).** The rig root carries the full motion yaw, so pelvis, spine and leg roots rotate rigidly with it: hips cannot lag or lead the facing. Pelvis yaw is only the gait twist from the clip (`twist(amp)`: 0.04-0.12 rad x `GAIT_STYLE.twist` 1.3, at most about 9 deg) plus strike wind-up twist (animGraph 999). Spine yaw is the clip value plus aim; the rig splits it as `sp.yaw*0.4 - pe.yaw*0.6` and `sp.yaw*0.6` (characterRig 1483-1484). No yaw-rate-driven torso twist, counter-twist or lag exists. Bank: pelvis roll from lateral accel, max 0.08 rad (about 4.6 deg) (animGraph 732-738).

**Feet (src/anim/footPlanner.ts).** World-space planner: planted feet are locked in world space; swing feet fly to a landing spot predicted from root velocity (half a stance ahead of the hip), with the ideal stance spot rotated by body yaw.
- `aim` (498): `PLANNER.minGap` 0.13 m between feet along the body's lateral axis (no crossing). `swingTo` (636-650): swing bows out to `swingGap` 0.1 m when passing the planted foot.
- `holdOrStep` (435): a planted foot steps only when beyond leg reach (`reach` 0.55 m) from its hip, or, only at a wall, when its yaw is over `turnStep` (1.2 rad) from the body (`Infinity` off walls, characterRig 1225).
- Both planted and still: the worst foot by position plus yaw error steps (`idleYawErr` 0.38 rad, 0.34 s), one at a time (403-432). Foot yaw eases `fromYaw` to `toYaw` over the swing.
- Cadence comes from speed (`cycleTime = 2 x stepLength / speed`), not yaw rate.

**Plain terms.**
- Tight circle: the root swings at up to about 505 deg/s while walking at stick speed along the facing, so the body traces a small circle at the normal walk cadence. Planted feet stay locked in the world while the root rotates around them, so they drift out of their stance spots and get replaced only when the leg is at full stretch. Landing spots follow the velocity vector, which turns every frame.
- 180 at pace: about 0.4 s turn, pace dips to about 45 percent, legs keep stepping. Off walls a planted foot's yaw is not forced to follow the root, so a foot planted at turn start can end 90-180 deg from the body before it lifts.
- Where clipping or awkward stances can arise (code-reading inferences, not observed in play):
  - (a) Planted-foot yaw lag: toes point sideways or backwards under a hip that has turned (hip twist, knee bending sideways).
  - (b) Crossing: the minimum gap uses the body's current lateral axis, which rotates about 90 deg per 0.2 s at the cap; a swing target can land across a world-locked foot. The bow-out only acts within `swingNear` 0.18 m along.
  - (c) The first step after a flick can be a long reach step, since both feet were planted through the spin.
  - (d) Crouch: same code, shorter reach, knees bent, so (a) and (b) are more visible.
  - (e) Back walk: feet face the body (correct), but step length and lateral rules were tuned for forward travel.
  - (f) Leftover reversal pivot logic (`PIVOT_TURN`, `PIVOT_REACH`, A82, lines 151-154, 463-466) is still in the planner. Motion no longer pivots, but it can still hold a planted foot turned back under a reversing body.
  - Locked feet cannot slide by design, but a planted foot that is not allowed to rotate while the body spins scrubs its yaw.

## 3. Gap list (smallest first)

| # | change | file | size |
| --- | --- | --- | --- |
| 1 | Michael re-watches the clips in section 1 for foot order, step width, pelvis-vs-shoulder yaw, before any lower-body change | none | 30-60 min |
| 2 | Scale the yaw cap with speed: about 450 deg/s walk and crouch, 300-400 at run | src/anim/motion.ts `updateYaw` / src/config/movement.ts `CT` | small, about 10 lines |
| 3 | Delete or gate the leftover reversal pivot logic | src/anim/footPlanner.ts (151-154, 463-466) | small, about 20 lines out |
| 4 | Planted-foot yaw: step or rotate a planted foot when its yaw is over about 0.6-0.8 rad from the body, in every state, not just at a wall (set `turnStep` finite) | src/anim/footPlanner.ts `holdOrStep`, src/player/characterRig.ts 1225 | small, 5-20 lines plus tests |
| 5 | Crossing guard measured in the landing foot's own frame at landing time; wider swing bow-out window during fast yaw | src/anim/footPlanner.ts `aim`, `swingTo` | small-medium, 20-40 lines |
| 6 | Bank to about 10 deg at run, driven by speed x yaw rate (now 4.6 deg from lateral accel) | src/anim/animGraph.ts 732-738 | small, 5-10 lines |
| 7 | Tie step cadence to yaw rate in a tight spin (about 1 step per 90 deg) so feet keep up with the root | src/anim/footPlanner.ts, src/anim/animGraph.ts gait phase (598) | medium, 40-80 lines |
| 8 | Optional: pelvis/torso lag model and head-leads-by-0.03 s. The footage does not show a pelvis lag; only after step 1 | src/anim/animGraph.ts, src/player/characterRig.ts 1480-1486 | medium, new spring chain |

Suggested order: 2, 3, 4 first (low risk, backed by the footage), then 5 and 7 after the foot-order re-watch. Leave 8 unless the re-watch shows a pelvis lag.

Caveat: section 2 was read, not run. The anim e2e metrics (`footSlideR`, `selfShanks`, `turn180` in scripts/e2e-anim.mjs, which another agent is editing) can confirm (a)-(f).
