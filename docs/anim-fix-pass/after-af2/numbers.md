# anim-fix-pass: after AF2 numbers (AF0 harness, report-only; same table as before/numbers.md)

Written by `npx vitest run tests/animFixPass.test.ts` (tests/helpers/afpMeasure.ts). Headless Wren rig, sim 60 Hz, mocap ON
(the default), at the commit the file was committed on. No bar is asserted here; the bars are in PLAN.md and each slice
asserts them in its own test. Units as in the column names. Gait rows: 2 s settle + 3 s recorded, turns at the yaw rate in
the name (R right, L left); trk = planted ankle offset from the hip midline in the facing frame (< -0.5 cm crossed),
pass gap = feet gap at passing, bank = trunk lean toward the turn (+ into), pel below = hips below the standing idle.
Strafe / wall rows: aimRun (the drawn gun, crouch 1); `grip` = right wrist vs hips in the root frame; `kneels` episodes.
The wall is the harness's stand-in (wall behind the root, side-on body as player.ts turns it), not the game's wall solver.

## Gait (free movement)
| scenario | speed | trk L cm | trk R cm | pass gap cm | gap min cm | plant max s | slide cm | flips/s | flips/250ms | wrist jerk cm | elbow chg/s | trunk deg | pel below cm | bank deg | pel roll deg | step cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| walk-1.4-straight | 1.40 | 1.5 | 1.4 | 8.0 | 5.9 | 0.47 | 0.01 | 0.0 | 0 | 0.63 | 0.0 | 3.7 | 3.2 | 1.5 | -0.7 | 58 |
| walk-1.4-turn1.5R | 1.40 | -3.9 | 9.0 | 9.9 | 2.7 | 0.42 | 0.01 | 0.0 | 0 | 0.70 | 0.0 | 8.5 | 2.9 | 3.4 | -2.6 | 52 |
| walk-1.4-turn1.5L | 1.40 | 6.2 | -6.9 | 9.9 | 3.1 | 0.42 | 0.01 | 0.0 | 0 | 1.40 | 0.0 | 7.7 | 3.0 | -0.1 | 1.7 | 54 |
| walk-1.4-turn2.5R | 1.40 | -6.1 | 6.7 | 9.6 | -1.3 | 0.43 | 0.00 | 0.0 | 0 | 0.97 | 0.0 | 8.7 | 3.0 | 3.4 | -2.5 | 44 |
| walk-1.4-turn2.5L | 1.40 | 4.3 | -9.8 | 9.4 | -0.7 | 0.47 | 0.00 | 0.0 | 0 | 3.52 | 0.0 | 8.0 | 3.1 | -0.1 | 1.8 | 48 |
| jog-3-straight | 3.00 | 5.2 | 2.3 | 15.9 | 15.0 | 0.15 | 0.01 | 0.0 | 0 | 1.28 | 0.0 | 13.7 | 3.6 | -0.5 | -0.1 | 102 |
| jog-3-turn1.5R | 3.00 | 3.9 | 1.7 | 14.7 | 12.8 | 0.15 | 0.00 | 0.0 | 0 | 1.28 | 0.0 | 13.7 | 3.6 | 0.7 | -0.6 | 99 |
| jog-3-turn1.5L | 3.00 | 5.0 | 2.8 | 16.2 | 14.4 | 0.15 | 0.00 | 0.0 | 0 | 1.29 | 0.0 | 13.8 | 3.6 | 1.7 | 0.5 | 97 |
| jog-3-turn2.5R | 3.00 | 1.0 | 6.5 | 10.7 | 4.8 | 0.15 | 0.01 | 0.0 | 0 | 1.28 | 0.0 | 13.9 | 4.2 | 2.8 | -1.6 | 89 |
| jog-3-turn2.5L | 3.00 | 8.2 | -0.6 | 10.7 | 4.7 | 0.15 | 0.01 | 0.0 | 0 | 1.28 | 0.0 | 14.2 | 3.8 | 3.9 | 1.5 | 87 |
| jog-3-turn4R | 3.00 | -0.1 | 6.5 | 10.3 | 0.3 | 0.15 | 0.01 | 0.0 | 0 | 1.33 | 0.0 | 15.7 | 4.2 | 8.0 | -4.0 | 72 |
| jog-3-turn4L | 3.00 | 8.2 | -1.6 | 10.3 | -0.1 | 0.15 | 0.01 | 0.0 | 0 | 1.29 | 0.0 | 16.4 | 3.7 | 9.0 | 3.9 | 70 |
| run-4-straight | 4.00 | 5.5 | 0.6 | 13.0 | 12.6 | 0.10 | 0.01 | 0.0 | 0 | 1.44 | 0.0 | 14.8 | 0.4 | 0.4 | -0.1 | 126 |
| (30 Hz) | run-4-straight: wrist jerk max 4.87 cm / frame |
| run-4-turn1.5R | 4.00 | 4.6 | 0.3 | 12.6 | 11.0 | 0.10 | 0.01 | 0.0 | 0 | 1.44 | 0.0 | 14.8 | 0.4 | 2.5 | -1.1 | 122 |
| (30 Hz) | run-4-turn1.5R: wrist jerk max 4.88 cm / frame |
| run-4-turn1.5L | 4.00 | 5.8 | 0.7 | 13.2 | 13.2 | 0.10 | 0.01 | 0.0 | 0 | 1.43 | 0.0 | 15.1 | 0.4 | 1.7 | 0.9 | 121 |
| (30 Hz) | run-4-turn1.5L: wrist jerk max 4.86 cm / frame |
| run-4-turn2.5R | 4.00 | 4.1 | -0.1 | 11.9 | 9.7 | 0.10 | 0.01 | 0.0 | 0 | 1.45 | 0.0 | 15.5 | 0.4 | 6.3 | -2.8 | 115 |
| (30 Hz) | run-4-turn2.5R: wrist jerk max 4.89 cm / frame |
| run-4-turn2.5L | 4.00 | 5.7 | 1.0 | 13.6 | 13.5 | 0.10 | 0.01 | 0.0 | 0 | 1.42 | 0.0 | 16.2 | 0.4 | 5.5 | 2.7 | 113 |
| (30 Hz) | run-4-turn2.5L: wrist jerk max 4.84 cm / frame |
| run-4-turn4R | 4.00 | 0.2 | 8.0 | 11.4 | -2.4 | 0.10 | 0.00 | 0.0 | 0 | 1.80 | 0.0 | 20.2 | 0.6 | 15.4 | -7.1 | 92 |
| (30 Hz) | run-4-turn4R: wrist jerk max 4.88 cm / frame |
| run-4-turn4L | 4.00 | 8.3 | 0.0 | 11.5 | -2.2 | 0.10 | 0.00 | 0.0 | 0 | 1.55 | 0.0 | 21.6 | 0.7 | 14.6 | 6.9 | 94 |
| (30 Hz) | run-4-turn4L: wrist jerk max 4.66 cm / frame |
| sprint-5-straight | 5.00 | 1.0 | 3.9 | 10.4 | 10.3 | 0.08 | 0.00 | 0.0 | 0 | 2.37 | 0.0 | 22.5 | 2.1 | -0.9 | 0.3 | 130 |
| (30 Hz) | sprint-5-straight: wrist jerk max 8.52 cm / frame |
| sprint-5-turn1.5R | 5.00 | 1.0 | 4.2 | 10.6 | 10.6 | 0.08 | 0.00 | 0.0 | 0 | 2.37 | 0.0 | 22.4 | 2.1 | 2.1 | -1.2 | 127 |
| (30 Hz) | sprint-5-turn1.5R: wrist jerk max 8.52 cm / frame |
| sprint-5-turn1.5L | 5.00 | 1.0 | 3.5 | 10.0 | 9.2 | 0.08 | 0.00 | 0.0 | 0 | 2.37 | 0.0 | 23.0 | 2.1 | 3.9 | 1.8 | 127 |
| (30 Hz) | sprint-5-turn1.5L: wrist jerk max 8.52 cm / frame |
| sprint-5-turn2.5R | 5.00 | 1.0 | 4.4 | 10.3 | 10.2 | 0.08 | 0.00 | 0.0 | 0 | 2.36 | 0.0 | 23.3 | 2.1 | 7.4 | -4.0 | 121 |
| (30 Hz) | sprint-5-turn2.5R: wrist jerk max 8.50 cm / frame |
| sprint-5-turn2.5L | 5.00 | 0.9 | 3.1 | 9.8 | 8.5 | 0.08 | 0.00 | 0.0 | 0 | 2.37 | 0.0 | 24.7 | 2.1 | 9.2 | 4.6 | 122 |
| (30 Hz) | sprint-5-turn2.5L: wrist jerk max 8.50 cm / frame |
| sprint-5-turn4R | 5.00 | 0.7 | 4.3 | 9.5 | 9.1 | 0.08 | 0.00 | 0.0 | 0 | 2.32 | 0.0 | 29.8 | 2.1 | 20.4 | -10.7 | 108 |
| (30 Hz) | sprint-5-turn4R: wrist jerk max 8.38 cm / frame |
| sprint-5-turn4L | 5.00 | 0.8 | 2.8 | 9.5 | 8.0 | 0.08 | 0.00 | 0.0 | 0 | 2.36 | 0.0 | 32.7 | 2.1 | 22.2 | 11.2 | 110 |
| (30 Hz) | sprint-5-turn4L: wrist jerk max 8.39 cm / frame |

## Crouch (holstered, CT-driven)
| scenario | speed | trunk deg | hips cm | CoM dbl cm | CoM any cm | pel lat p2p cm | step cm | slide cm | trk L cm | trk R cm | wrist jerk cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crouch-idle | 0.00 | 28.4 | 50.6 | 4.2 | 4.2 | 0.6 | - | 0.00 | 7.7 | 7.0 | 0.00 |
| crouch-gear1-0.85 | 0.85 | 43.1 | 68.7 | 15.0 | 16.8 | 8.4 | 47 | 0.01 | 1.0 | 1.1 | 0.19 |
| crouch-gear2-1.3 | 1.30 | 35.5 | 65.1 | 13.2 | 15.5 | 5.0 | 56 | 0.01 | 2.8 | 2.8 | 0.29 |
| crouch-gear3-1.7 | 1.70 | 28.0 | 61.7 | 11.2 | 13.4 | 3.3 | 64 | 0.01 | 3.6 | 3.6 | 0.51 |
| crouch-ramp-1to3 | 1.25 | 36.3 | 65.5 | 13.7 | 15.7 | 8.4 | 58 | 0.01 | 1.0 | 1.1 | 0.53 |
| (ramp) | first -> last third: trunk -15.0 deg, hips -6.9 cm |

## Crouched aimed strafe (rifle, pistol)
| scenario | speed | pel lat p2p cm | pel beyond cm | grip step cm | grip mean cm | grip spread cm | kneels | side chg | kneel on flip fr | gun leg cm | gun trunk cm | gap min cm | slide cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cstrafe-rifle-L0.4 | 0.40 | 2.2 | 0.55 | 0.37 | 23.2 | 0.0 | 0 | 0 | 0 | 43.3 | 0.9 | 9.0 | 0.00 |
| cstrafe-rifle-R0.4 | 0.40 | 2.2 | 0.56 | 0.37 | 23.2 | 0.0 | 0 | 0 | 0 | 43.3 | 0.9 | 9.0 | 0.00 |
| cstrafe-rifle-L0.7 | 0.70 | 2.2 | 0.85 | 0.55 | 23.1 | 0.0 | 0 | 0 | 0 | 43.3 | 0.9 | 9.0 | 0.00 |
| cstrafe-rifle-R0.7 | 0.70 | 2.2 | 0.85 | 0.55 | 23.1 | 0.0 | 0 | 0 | 0 | 43.3 | 0.9 | 9.0 | 0.00 |
| cstrafe-rifle-flip0.7 | 0.53 | 12.7 | 1.11 | 0.59 | 23.0 | 0.4 | 0 | 0 | 4 | 42.0 | 0.8 | 9.0 | 0.00 |
| cstrafe-rifle-stopgo10-L | 0.34 | 8.1 | 1.10 | 0.58 | 23.1 | 0.1 | 10 | 0 | 0 | 41.8 | 0.9 | 9.0 | 0.00 |
| cstrafe-rifle-stopgo10-R | 0.34 | 10.9 | 1.01 | 0.60 | 23.4 | 0.1 | 10 | 0 | 0 | 41.8 | 0.8 | 9.0 | 0.00 |
| cstrafe-pistol-L0.4 | 0.40 | 2.2 | 0.55 | 0.68 | 18.2 | 0.1 | 0 | 0 | 0 | 49.7 | 8.8 | 9.0 | 0.00 |
| cstrafe-pistol-R0.4 | 0.40 | 2.2 | 0.56 | 0.68 | 18.2 | 0.1 | 0 | 0 | 0 | 49.8 | 8.8 | 9.0 | 0.00 |
| cstrafe-pistol-L0.7 | 0.70 | 2.2 | 0.85 | 1.01 | 18.2 | 0.1 | 0 | 0 | 0 | 49.8 | 8.8 | 9.0 | 0.00 |
| cstrafe-pistol-R0.7 | 0.70 | 2.2 | 0.85 | 1.01 | 18.2 | 0.1 | 0 | 0 | 0 | 49.8 | 8.8 | 9.0 | 0.00 |
| cstrafe-pistol-flip0.7 | 0.53 | 12.7 | 1.11 | 0.98 | 18.0 | 0.5 | 0 | 0 | 4 | 37.5 | 8.1 | 9.0 | 0.00 |
| cstrafe-pistol-stopgo10-L | 0.34 | 8.1 | 1.10 | 1.02 | 18.1 | 0.1 | 10 | 0 | 0 | 37.3 | 8.4 | 9.0 | 0.00 |
| cstrafe-pistol-stopgo10-R | 0.34 | 10.9 | 1.01 | 1.00 | 18.5 | 0.1 | 10 | 0 | 0 | 37.3 | 8.2 | 9.0 | 0.00 |

## Drawn crouched wall slide
| scenario | speed | pel lat p2p cm | grip step cm | grip mean cm | kneels | gun leg cm | gun trunk cm | trunk deg | gap min cm | slide cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wallslide-rifle-L | 0.60 | 2.6 | 10.89 | 24.7 | 0 | -2.2 | -4.3 | 45.1 | 14.1 | 0.00 |
| wallslide-rifle-R | 0.60 | 2.6 | 33.50 | 8.7 | 0 | -10.5 | -16.0 | 45.1 | 13.7 | 0.00 |
| wallslide-rifle-reverse | 0.60 | 7.7 | 30.53 | 11.7 | 0 | -10.3 | -15.4 | 40.6 | -8.7 | 2.83 |
| wallslide-pistol-L | 0.60 | 2.6 | 10.89 | 24.7 | 0 | -1.4 | 5.9 | 45.1 | 14.1 | 0.00 |
| wallslide-pistol-R | 0.60 | 2.6 | 33.50 | 8.7 | 0 | -7.8 | -6.1 | 45.1 | 13.7 | 0.00 |
| wallslide-pistol-reverse | 0.60 | 7.7 | 30.53 | 11.3 | 0 | -8.6 | -12.3 | 40.6 | -8.7 | 2.83 |
