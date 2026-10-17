# CT turning, measured from footage

Measured 2026-10-17 from Michael's Chaos Theory clips (M20: CT behaviour from footage is the authority). Research only; nothing here is a decision.

Method: clips in `pc/ct-work/clips/clip_13570_20261017_<HHMMSS>.mp4` (HEVC, variable rate, ~60 fps: 051044 is 59.94, the rest 60). Contact sheets with the clip timestamp burned into every tile, 1-30 fps around each event, saved in `pc/ct-work/frames/turns/` (sheet name in brackets below). Times are seconds from clip start. Yaw is read from head / shoulder orientation on top-down views (051250, 051339, 051501, 051421), so each reading is +-15 deg; rates are +-15 % unless noted.

Limits of the footage:
- No input overlay: the delay between stick and body cannot be measured directly. Capture is from the PC version; whether Michael used a pad or keyboard and mouse is not recorded (a keyboard makes the flick a key press and the circles mouse-driven).
- The camera tracks the hero, so travel speed and path radius come from room references (bench, door, guard's body) or from radius = speed / yaw rate. They are estimates.
- Feet are out of frame in the behind views (051044, 051543), and night vision hides foot detail top-down. Foot order is not readable.
- The "slow" parts of 051339 and 051501 are not slow: Michael spun the stick in circles throughout, so they give near-maximum rates.

## 1. Turn in place, standing (D1 051044, D3 051339)

- **CT has no stationary turn in place.** Any stick input moves the hero, and he faces his travel direction. A "turn on the spot" is the normal walk cycle on a very tight circle.
  - 051339 at 5.2-6.03 s [d4_feet, d4_d]: one full 360 deg turn in 0.83 s (about 430 deg/s). The hero stays within about 0.25 m of one spot (path radius about 0.15-0.2 m).
  - Same clip at 5.2-8.0 s: turns take 0.8-0.9 s each, so 400-450 deg/s.
- **Footwork while spinning:** the walk cycle keeps its normal cadence of about one step per 0.2-0.25 s. There is no separate turn-in-place clip and no pivot on a planted foot.
  - At about 430 deg/s that is about 4 steps per 360: about 1 step per 90 deg, 2 per 180.
  - At slower yaw rates there are more steps per 90 deg, because the cadence stays the same.
  - Foot order cannot be read from the footage.
- **Slow stick circle (051044, fixed camera behind) [d1_overview, d1_a, d1_b]:**
  - From standing at about 1.6 s, the body swings about 90 deg in about 0.25 s (+-0.1 s). That is roughly 360 deg/s at the start, with no snap.
  - After that, yaw follows the stick at 45-75 deg/s: 0 to 180 deg over 1.6-4.0 s, 180 to 360 over 4-8 s, then 8-11.25 s.
  - The hero walks a small circle (radius about 0.5-1 m) across the room.
- **Stick-to-body delay:** not measurable (no input overlay). There is no visible wind-up pose. The head leads the shoulders by 1-2 frames (about 0.03 s) at the start of every flick (051250 at 5.93 and 22.08 s).

## 2. Flick 180 and the slowest-speed back walk (D2 051250)

- **Slow back walk confirmed:** from 0 to 5.75 s and 12.5 to 18 s, the hero keeps facing away from the camera but drifts back and forth about 1 m every 2 s [d2_pos, d2_a, d2_b]. The guard's body behind him moves in and out of frame.
  - This is a backwards walk without turning, as Michael noted.
  - His threshold is "lowest speed only": every faster step turns. In Night Shift terms that is gear 1 (0.65 m/s standing).
  - Back-walk speed: about 0.5 m/s (+-0.3), slow-walk class. The tracking camera prevents a better value.
  - The angle at which "back" becomes back walking is not measurable. With a keyboard it is exactly 180 deg.
- **Flick 180 duration:** 0.40 s (+-0.04) in all four flicks read frame by frame.
  - 5.93-6.33 s [d2_flick].
  - 22.08-22.48 s [d2_f2]: about 25 deg at +0.033 s, 60 at +0.10, 95 at +0.17, 125 at +0.23, 150 at +0.30, 175 at +0.37, 180 at +0.40.
  - 26.97-27.37 s [d2_rev].
  - 51421 at 7.28-7.67 s (at run, see section 5).
- **Flick profile:** about 0.05 s ease-in, then a near-constant ~450 deg/s (peak about 600 deg/s in the first 0.1 s), then about 0.05 s ease-out. This is a rate-capped turn, not an exponential approach.
- **Flick footwork:** the walk cycle continues through the turn, about 2 steps per 180. The hero starts travelling in the new direction while still turning (22.2 s on: he moves toward the camera from about 90 deg of turn onward). He does not stop first and there is no pivot pose.
- **Camera:** the camera does not swing round after the flick. The hero ends facing the camera.

## 3. Fast spinning (D3 051339, D6 051501)

- **Legs:** the normal locomotion cycle (walk, run or crouch-walk) keeps playing on a tight circle. Legs never twist or stay planted.
- **Maximum yaw rate:**
  - Walk: 400-450 deg/s (0.8-0.9 s per turn; 051339 5.2-8.0 s).
  - Crouch: 400-450 deg/s (051501 2.4-4.9 s [d6_slow] and 19.4-22.0 s [d6_fast], 0.8-0.9 s per turn).
  - Run: 300-400 deg/s. 051339 0-2.4 s [d4_c] gives 1.2-1.3 s per turn (about 290 deg/s). 17.0-19.7 s [d4_fast] gives 0.9-1.0 s per turn (about 370 deg/s).
- **Limit:** a hard cap of about 450 deg/s. No reading in any clip exceeds it.
  - At run the cap looks about 15-25 % lower, matching SC1's `rot x (1 - v / (4 x runSpeed))` (75 % at full run, about 330 deg/s), within error.
  - Path radius at run is about 0.5-0.6 m (3.5-4 m/s divided by about 6.5 rad/s), with no outward drift. Velocity follows facing.

## 4. Turning while moving (D4 051401, 051339; D5 051421)

- **Walk:** gentle stick changes give yaw rates of 45-75 deg/s.
  - 051401 at 3.5-4.0 s [d4_behind]: about 35 deg in 0.5 s (about 70 deg/s). Path radius about 1 m at slow walk.
  - Hard stick turns go up to the 450 deg/s cap with radius 0.15-0.2 m (section 3).
- **Run:**
  - Hard turns: 300-400 deg/s, radius about 0.5-0.6 m.
  - Swept 90 deg turn at 051421 1.23-1.95 s [d5_90]: about 120 deg of world yaw (screen yaw plus about 30 deg of camera swing) in 0.7 s, about 170 deg/s. This was stick-limited.
- **Momentum:** the path follows the facing tightly. There is no wide drift, no skid, and no visible slide when the turn starts.
- **Bank (roll):**
  - A lean into run turns is visible: 051421 at 1.6-2.4 s [d5_bank], with the torso tilted toward the inside and the legs splayed wide.
  - Roughly 10 deg (+-5), read from a high top-down view, so low confidence. This agrees with SC1's ~11 deg at full run and full turn.
  - No bank is visible at walk.

## 5. Reversal at full speed (D5 051421 7.0-8.2 s [d5_rev, d5_pos])

| phase | time | what happens |
| --- | --- | --- |
| run toward bench | 7.0-7.27 s | Full run. HUD noise meter 11-12 segments. |
| turn | 7.28-7.67 s (0.37 +- 0.04 s) | Running gait continues, no plant or brake pose. Yaw about 20 deg at 7.33, 80 at 7.43, 130 at 7.57, 165 at 7.63, 180 at 7.67 (about 490 deg/s average). Forward travel stops as the turn starts (gap to the bench stays about 45-70 px from 7.1 to 7.63). |
| speed dip | 7.6-7.8 s | Noise meter drops to about 1-3 segments, so speed passes near zero. |
| push away | 7.7-8.0 s | Runs back toward the camera. Gap to the bench grows steadily. Noise meter back to about 8 by 8.03 s. |

- **Total:** about 0.7 s from turn start to running away again, with no hold.
- **Sequence:** no distinct brake, plant, pivot or push phases. It is one continuous capped-rate turn while the velocity reverses through roughly zero.
- **Path shape:** either a U of 0.5 m or less, or a stop-and-turn. The view cannot tell them apart. Either way there is no slide past the turn point.

## 6. Crouched and aiming turns

- **Crouched (D6 051501):**
  - Same cap as standing, 400-450 deg/s.
  - The crouch-walk (or crouch-run, 19-22 s) cycle keeps playing on a tight circle. No separate crouched turn clip is visible.
  - 11.5-17 s keeps facing roughly up while the hero drifts, which is possibly a crouched slow back walk (unconfirmed).
- **Aiming (D7 051543):**
  - The hero's body is locked to the camera yaw: his framing on screen does not change during pans, so there is no lag and no catch-up.
  - Legs are out of frame, so stepping is not visible.
  - Turn rate:
    - Pan 4.9-6.3 s [d7_fast]: the chair and door move about 0.75 frame widths per second, about 60 deg/s.
    - Fastest swing 9.9-10.1 s [d7_fast2]: about 1.5 widths per second, about 120 deg/s.
    - Both assume a horizontal field of view of 80 +- 10 deg, so +-25 %. SC1 aims at half the camera speed (about 110 deg/s).

## Final table

| item | CT measured (clip, time) | Night Shift now (current-code.md s.1-2, motion.ts) | change needed |
| --- | --- | --- | --- |
| Max body yaw, walk / crouch | 400-450 deg/s (051339 5.2-8.0; 051501 2.4-4.9, 19.4-22.0) | 720 deg/s, accel 240 rad/s2 (CT.turnRate) | Cap at about 450 deg/s (SC1 440). |
| Max yaw at run | 300-400 deg/s (051339 0-2.4, 17-19.7) | 720 deg/s | Scale the cap down with speed: about 0.75-0.85 at full run (SC1 formula). |
| Turn profile | Ease-in about 0.05 s, constant rate, ease-out about 0.05 s (051250 22.08-22.48) | Rate-capped with accel 240 rad/s2 | Keep the shape. Accel about 150 rad/s2 (about 7.8 rad/s reached in 0.05 s). |
| Flick 180 | 0.40 +- 0.04 s, walk cycle continues, moves off in the new direction while turning (051250 x3) | From rest the heading snaps to the stick | No snap from rest: turn at the cap (0.4 s per 180) while starting to move. |
| Turn in place, standing | None stationary: walk cycle on a circle of radius 0.2 m or less, about 1 step per 90 deg at the cap (051339 5.2-6.03) | Not aiming, standing still: facing held, no turn; stepped chunks only on the aim path | Treat any stick input as walking. A tight spin is the gear's normal walk cycle on a small radius (no step-turn clip, no leg twist). |
| Slow stick circle | Yaw follows stick at 45-75 deg/s; first 90 deg in about 0.25 s (051044 1.6-11.25) | 720 deg/s follow | Comes from the cap above. Nothing extra. |
| Slowest-speed back walk | Gear 1 only: stick back walks backwards facing away, about 0.5 m/s; every faster gear turns 180 (051250 0-5.75, 12.5-18; D2 note) | Backwards only while aiming (strafe-locked) | Add a back walk at gear 1 (standing; crouched likely) when the stick points behind. Threshold angle unmeasured: propose more than about 135 deg. |
| Reversal at run | One continuous turn of 0.37 s at about 490 deg/s, gait continues; forward travel stops at turn start, speed dips near zero mid-turn, back at speed about 0.3 s later; total about 0.7 s (051421 7.28-8.0) | Pivot above 1.2 m/s and more than 134 deg: brake, flip, hold 0.3 s | Remove the brake / flip / hold pivot. Capped turn plus velocity reversing through about zero with no slide, at about 0.7 s total. |
| Momentum in curves | Path follows facing; no outward drift at a 0.5 m radius running (051339) | Turn inertia tau (0.15/3) x k, k up to 1 at 1.6 m/s | Velocity follows facing tightly. Keep the inertia small or remove it. |
| Bank in turns | About 10 deg (+-5) at run, none visible at walk (051421 1.6-2.4) | Pelvis roll from lateral accel, at most 0.08 rad (4.6 deg) | Raise to about 10 deg max, driven by speed x yaw rate (SC1 RollPawn). Low-confidence number: check by eye. |
| Crouched turns | Same cap, crouch-walk / run cycle keeps playing (051501) | Same paths as standing | Same changes as standing. |
| Aiming turns | Body locked to camera yaw, no lag; 60-120 deg/s (051543 4.9-6.3, 9.9-10.1) | Root turns at 360 deg/s, idle steps when the error passes a threshold | Lock body yaw to the aim camera. Aim camera turn about 110 deg/s (SC1 half speed). Legs not visible in the footage. |
| Stick-to-body delay | Not measurable; no wind-up; head leads the shoulders by 1-2 frames | n/a | Optional head-lead of about 0.03 s. |

Open items for Michael:
- Which input device was used for the footage.
- The back-walk threshold angle.
- Whether a crouched back walk exists. Check 051501 11.5-17 s in game.
