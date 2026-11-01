# CT measured: speeds, starts, stops, posture, crouch, roll, jump

Measured 2026-10-17 from Michael's Chaos Theory footage (M20: copy pure CT). Clips are named by `HHMMSS` (`pc/ct-work/clips/clip_13570_20261017_HHMMSS.mp4`, 60 fps nominal, variable frame rate, start time 0; all times below are seconds from clip start, read from frame timestamps). Scratch frames: `pc/ct-work/frames/speeds/`.

## Method and how far to trust it

- **Noise meter as a gear signature.** The second HUD bar (footstep noise, 22 pips) holds a steady level for each gait and drops to 0 about 0.1-0.2 s after the body stops. Read per frame at 30 fps from the HUD crop (x 1840-2340, y 1448-1458). Levels are exact; they lag the body by about 0.1-0.15 s.
- **Speed from camera scroll.** The CT camera tracks the hero, so the wall behind him scrolls. A block-matching tracker measured the scroll in px/s per frame (wall band y 350-780, also a floor band at foot depth for checks), plus the hero's on-screen drift. Speed = (scroll + the hero's drift) / scale.
- **Scale reference: the hero himself**, ~790-830 px head to sole standing in the side-tracking clips (050259, 050827), taken as 1.8 m, so **~460 px/m at the hero's depth**. The floor band at foot depth scrolled at the same rate as the wall band at speed (050259 10-11 s: floor 1080-1150, wall 1005-1040 px/s), so the scroll is converted at the hero's scale. The door (~2 m) and tiles were not usable in these clips (door in another wall plane, no tiles beside the hallway wall).
- **Cross-check:** cadence x step length for the fast walk (050259 9.0-10.07 s: ~2 steps/s, toe-to-toe spread ~1.0 m, so ~1.7-2.0 m/s against 2.2 m/s by scroll). For the run the stride says ~3 m/s (step every 0.4 s, toe-to-toe spread ~0.95 m, 050259 15.65-16.7 s) against ~4.6 m/s by scroll: either CT's run slides the feet or the camera yaws while following. The scroll number is the world speed if the camera translates; treat the run as **4.6 m/s, plausible range 3.5-5**.
- **Uncertainty:** absolute speeds +-20-25% (scale, camera distance, camera lag). Ratios between gears in one clip are better (+-10%). The camera lags at slow speed: in 050718 and 050827 it stays still while the hero walks slowly, then catches up, so slow speeds are averaged over long windows.
- Nearly everything is night vision with the camera orbited by hand; the hero's feet are often at the frame edge. Leg detail (does the swing foot drop) is at the edge of what the footage shows.

## 1. Speeds

Noise levels seen (pips lit, per 0.25 s): standing **0-1, 2, 7, 11-12**; crouched **0-1, 4, 9-10**. Intermediate values (4-5 standing) appear only for 0.25 s during acceleration (050649 3.2, 17.3 s).

| Gait | Pips | m/s | +- | Reference (clip, s) |
| --- | --- | --- | --- | --- |
| Standing creep (slowest) | 0 | 0.1-0.3 | 0.1 | 050718 1.0-11.5 avg 0.3 (camera still 3.5-7 while the hero crosses the screen at ~0.1); 050827 6.7-9.7 ~0.1-0.2 |
| Standing walk | 0 | 0.75 | 0.15 | 050649 11.5-16.5 steady scroll 320-348 px/s, the hero fixed on screen; 050649 2.0-3.0 and 050259 6.5-8.0 give 0.9 |
| Standing fast walk | 2 | 2.0 | 0.4 | 050259 9.0-10.0 (1005 px/s); stride check 1.7-2.0 |
| Standing jog | 7 | 3.0 | 0.6 | 050827 18.4-19.2 and 22.0-22.9 (1350-1520 px/s peaks); 050259 10.2-11.8 reads 2.2 but the camera is still catching up |
| Standing run (full speed) | 11-12 | 4.6 | 0.9 | 050259 15.5-17.5 run back, steady 2020-2190 px/s, the hero drifts back 60 px/s; 050649 short bursts peak 3.9-4.4 |
| Crouched slow | 0 | 0.4 | 0.1 | 050330 0.5-2.5 (160-231 px/s) |
| Crouched walk | 0 | 0.85 | 0.2 | 050330 3.0-5.5 (311-468 px/s) |
| Crouched fast walk | 0 | 1.5 | 0.3 | 050330 5.5-8.0 (653-744 px/s) |
| Crouched brisk | 4 | 2.1 | 0.4 | 050330 8.0-9.0 (981-993 px/s) |
| Crouched run | 9-10 | 2.6 | 0.5 | 050330 13.5-16.0 (1220-1520 px/s, the hero drifts back ~45 px/s); 053816 3.6-4.5 after the roll (1135-1185 px/s) agrees |

Distinct speeds: **about 5 standing and 5 crouched** (B1 and B2 were stepped up one notch at a time). The noise meter only separates 4 standing / 3 crouched bands; the slow notches are all silent (0-1 pip). Run / walk ratio ~6; crouched run / standing run ~0.55.

## 2. Starts (C1)

050649 16.6-17.2 standing still, start at **17.25**:
- Torso pitches forward into the run lean within ~0.15 s (17.25-17.40); arms start swinging at once.
- First step is a full-length stride (17.45-17.5), no small step-out or shuffle.
- Noise reaches 6 pips at 17.3-17.6 and 11 pips by 17.9; allowing the meter's ~0.1-0.15 s lag, the body reaches run speed **~0.4-0.5 s** after first motion (+-0.1). Camera scroll lags further (full at 18.0-18.5).
- Walking jump 053849 5.6-5.9 lands straight into a run with the same lean.

## 3. Stops (C2-C5)

| Stop | Clip, time | Frames to still | Notes |
| --- | --- | --- | --- |
| Full speed, standing | 050827 27.95-28.2 | scroll 2187 -> 746 -> 379 -> ~70 px/s at 27.95 / 28.05 / 28.10 / 28.2: **~0.15-0.2 s (9-12 frames at 60 fps)** | slide ~0.25-0.35 m |
| Middle (jog), standing | 050827 22.85-23.05 | 1507 -> 846 -> 464 -> 183 -> 23 px/s at 50 ms steps: **~0.2 s (12 frames)** | slide ~0.25 m |
| Slow walk, standing | 050649 ~16.5 | scroll 343 -> 54 px/s across 16.5-17.0, pose frozen from ~16.5: **<= 0.2 s** | slide < 0.1 m |
| Crouched run | 050933 ~21.0 | crouch pose static from 21.0 (10 fps), meter decays 21.2-21.4: **~0.1-0.2 s** | |
| Noise meter | all | decays 10 -> 0 in ~0.2 s, starting ~0.1-0.15 s after the body stops | |

What the body does (frame-stepped at 60 fps, 050827 28.05-28.45; 30 fps 22.75-23.55; 5 fps 28.2-31.4):
- **Root stops first, torso follows**: the run lean (~23 deg) holds until 28.17, after the root has nearly stopped, then the torso pitches back upright by 28.32 (~0.15 s). No overshoot or hip settle visible.
- **Feet freeze mid-stride**: no finishing step at any speed. The legs stay split where they were (front leg forward, rear leg back) - the stride is held as a stance.
- Swinging foot: it ends on the ground in the held split pose; at 60 fps the drop is not distinguishable from the freeze (within ~2 frames).
- **Hold, then settle**: the split stance holds ~1.7 s (28.3-30.0), then blends to the idle stance with feet together over **~0.3-0.4 s** (30.0-30.4). Same held stance after the middle-speed stop (23.0-23.55+).

## 4. Posture

| Item | CT measured | +- | Reference |
| --- | --- | --- | --- |
| Standing spine (pelvis -> neck from vertical) | **~3-5 deg forward**, essentially upright | 3 deg | still 145526 (side, low camera) |
| Standing head pitch | ~5-10 deg down, chin level with the collar | 5 deg | 145526 |
| Standing knees | straight (no visible bend) | 5 deg | 145526, idle 043858 |
| Arms, holstered | hang at the sides, slight elbow bend (~10-15 deg), hands at upper-thigh height a few cm out from the thighs | - | 145524 front, 145526 |
| Run lean (torso) | ~23 deg forward, arms bent forward at chest height | 5 deg | 050827 28.05-28.15, 050259 15.5-16.7 |
| Crouched spine | **~35-45 deg forward** | 5 deg | 145708 (side) |
| Crouched head | gaze level (head pitched up against the torso), not looking at the floor | 10 deg | 145708, 145730 |
| Crouched front knee (interior angle) | ~60-70 deg (deep squat, thigh near horizontal) | 10 deg | 145708 |
| Crouch depth | hip ~0.46 m = **~0.48 of standing hip height**; head top ~1.1 m = ~0.62 of standing height | 0.05 | 145708, head size as scale (0.23 m) |
| Idle motion (10 s) | breathing cycle **~3 s**; vertical motion of the silhouette <= 3 px of ~720 px (**< 1 cm**); no weight shifts, no sway (centroid x steady +-1 px) | - | 043858 3.0-12.4 (tracked at 30 fps) |

## 5. Crouch, roll, jump

| Move | CT measured | +- | Reference |
| --- | --- | --- | --- |
| Stand -> crouch, standing still | **~0.2-0.25 s** (1.27-1.47) | 0.05 | 053800, 30 fps |
| Crouch -> stand, standing still | **~0.23 s** (3.47-3.70) | 0.05 | 053800, 30 fps |
| Crouch while walking (both ways) | not separated from camera motion; looks the same speed | - | 053800 8-14 (pending frame-step) |
| Roll (from a run) | **~0.75 s** dive to feet (2.27-3.03), **~2.3 m**, keeps the run speed (~3.7 m/s by scroll), ends crouched and goes straight into a crouch run | 0.1 s / 0.6 m | 053816, 10 fps + scroll |
| Standing jump | wind-up crouch **~0.27 s** (0.47-0.73), airborne **~0.7 s** (0.77-1.47), landing crouch >= 0.27 s; ~1.3 s total | 0.07 s | 053849, 15 fps |
| Walking jump | wind-up <= 0.1 s, airborne **~0.5 s** (5.03-5.53), landing ~0.2-0.3 s then runs on; loud landing (11 pips) | 0.07 s | 053849, 15 fps |
| Running jump | not measured (053849 12-13 s, pending) | - | - |

## 6. CT against Night Shift now

| Item | CT measured | Night Shift (current-code.md) | Change needed |
| --- | --- | --- | --- |
| Standing speeds | ~0.2 / 0.75 / 2.0 / 3.0 / 4.6 m/s (5 notches) | 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 (6 gears) | Add a slower creep (~0.2), close the gap above walk; top run ~4.6 (+-0.9). Ratios are the safer copy: run / walk ~6 |
| Crouched speeds | ~0.4 / 0.85 / 1.5 / 2.1 / 2.6 m/s | 0.42 / 0.75 / 1.08 / 1.5 / 1.9 / 2.3 | Close; crouched run a little faster (~2.6 = 0.55 x standing run) |
| Start | full lean in ~0.15 s, full first stride, speed in ~0.4-0.5 s | spring, 95% in 0.3 s | Keep; make the lean immediate (current accel lean is barely visible) |
| Stop time | ~0.15-0.2 s at any speed | 98% in 0.25 s | Slightly faster (~0.18 s) |
| Stop slide | ~0.25-0.35 m from full run | ~0.36 m from sprint | About right |
| Feet at stop | freeze mid-stride, no closing step | closing step if swing > 5 cm behind | Remove the closing step (3.2.0 had this right) |
| After stop | split stance held ~1.7 s, then 0.3-0.4 s blend to idle | pose blends to idle, tau 0.04 s | Hold the frozen stride ~1.7 s, then blend ~0.35 s |
| Upper body at stop | torso pitches back upright ~0.15 s after the root stops, no overshoot | not modelled | Add a short lag on torso pitch |
| Standing spine | ~3-5 deg forward | chest ~33 deg forward (HUNCH) | Remove the hunch when standing (P1) |
| Standing head | ~5-10 deg down | head -0.34 rad in HUNCH | Small pitch only |
| Crouched spine | ~35-45 deg forward, head level | ~62 deg forward | Reduce to ~40 deg; head up to a level gaze |
| Crouch depth | hip ~0.48 of standing | (clip-driven) | Check against 0.48 |
| Run lean | ~23 deg | sprint ~38 deg | Reduce to ~23 deg |
| Arms holstered | at the sides, elbows ~10-15 deg, hands a few cm out | 0.06 m out, 0.05 m ahead, elbow 18 deg | Close; elbow a little straighter |
| Idle | breathing ~3 s cycle, < 1 cm, no weight shift | not in the survey | Very subtle breathing only |
| Crouch toggle | ~0.2-0.25 s each way | not in the survey | Match 0.2-0.25 s |
| Roll | ~0.75 s, ~2.3 m, keeps speed, ends in a crouch run | not in the survey | Match |
| Jump | standing 0.27 s wind-up + 0.7 s air; walking 0.5 s air, no wind-up | not in the survey | Match |

## Open items

- Running jump (053849 12-13 s) and crouching while walking (053800 8-14 s) need a 60 fps frame-step with the hero's screen position.
- A top-down floor-tile count (051339) would confirm the run speed (scroll 4.6 against stride 3 m/s).
