# afp-next: before numbers (AF0b harness, report-only)

Written by `npx vitest run tests/afpNext.test.ts` (tests/helpers/afpMeasure.ts). Headless Wren rig, sim 60 Hz, mocap ON
(the default) on every row, at the commit the file was committed on. No bar is asserted here. The `gun` column names what
is in hand: `rifle` / `pistol` a bare gun node under the weapon pivot (the pistol at weight 0.7 with the cupped support),
`-` holstered. Ready rows: the CT-driven run (ctRun) with the gun drawn, low ready (no aim), 2 s settle + 3 s recorded,
turns at the yaw rate in the name (R right, L left); stop rows move 3 s, the stick to 0 at 3 s, 2.5 s recorded from it.
Aimed rows: aimRun standing (aim 1, the body held on the aim), the local z pace in the name (+ forward, - back).
Idle rows: holstered unless the gun says otherwise; stop rows 4 s recorded from the stop, start rows from 0.5 s before it.
Columns as in docs/anim-fix-pass/before/numbers.md, plus: pel vert p2p = hips height peak-to-peak; cadence = landings
per second (both feet); foot pitch step = the worst change of either foot's heel -> ball pitch in one frame; head yaw =
the head bone's yaw against the root (p2p, fastest frame-to-frame turn).

## Control (AF0 gait rows, harness unchanged)
AF0's numbers.md was written at 098fc9af, before AF1-AF4b changed src/: a difference here is the game's, not the harness's.
(AF0b check at 48b9b73c: the base afpMeasure.ts and this one give these two rows identical to 3 decimals.)

| scenario | speed | trk L cm | trk R cm | pass gap cm | gap min cm | plant max s | slide cm | flips/s | flips/250ms | wrist jerk cm | elbow chg/s | trunk deg | pel below cm | bank deg | pel roll deg | step cm | max abs diff vs AF0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| walk-1.4-straight | 1.40 | 1.5 | 1.4 | 8.0 | 5.9 | 0.47 | 0.01 | 0.0 | 0 | 0.63 | 0.0 | 3.7 | 3.2 | 1.5 | -0.7 | 58 | 0.00 |
| jog-3-straight | 3.00 | 5.2 | 3.3 | 16.9 | 15.9 | 0.15 | 0.01 | 0.0 | 0 | 1.28 | 0.0 | 13.7 | 3.6 | -0.5 | -0.1 | 102 | 3.00 |

## Drawn low ready (CT-driven run)
| scenario | gun | speed | trk L cm | trk R cm | pass gap cm | gap min cm | plant max s | slide cm | flips/s | flips/250ms | wrist jerk cm | elbow chg/s | trunk deg | pel below cm | bank deg | pel roll deg | step cm | pel vert p2p cm | cadence /s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ready-rifle-walk-1.4-straight | rifle | 1.40 | 1.5 | 1.5 | 10.0 | 6.0 | 0.43 | 0.01 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 58 | 0.9 | 2.33 |
| ready-rifle-walk-1.4-turn1.5R | rifle | 1.40 | -0.3 | 7.5 | 9.7 | 3.2 | 0.42 | 0.01 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 52 | 0.9 | 2.33 |
| ready-rifle-walk-1.4-turn1.5L | rifle | 1.40 | 7.5 | -0.3 | 9.8 | 3.2 | 0.42 | 0.01 | 0.0 | 0 | 0.09 | 0.0 | 1.7 | 4.5 | -0.0 | 0.1 | 54 | 0.9 | 2.33 |
| ready-rifle-walk-1.4-turn2.5R | rifle | 1.40 | -2.1 | 5.4 | 9.6 | -0.5 | 0.43 | 0.00 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 44 | 0.9 | 2.33 |
| ready-rifle-walk-1.4-turn2.5L | rifle | 1.40 | 5.5 | -2.2 | 9.7 | -0.4 | 0.47 | 0.00 | 0.0 | 0 | 0.11 | 0.0 | 1.7 | 4.5 | -0.0 | 0.1 | 48 | 0.9 | 2.33 |
| ready-rifle-jog-3-straight | rifle | 3.00 | 1.6 | 1.6 | 10.0 | 5.8 | 0.28 | 0.00 | 0.0 | 0 | 2.77 | 0.0 | 4.2 | 6.2 | -0.0 | -0.1 | 102 | 4.6 | 3.00 |
| ready-rifle-jog-3-turn1.5R | rifle | 3.00 | -0.3 | 7.2 | 9.6 | -7.9 | 0.25 | 0.00 | 0.0 | 0 | 1.24 | 0.0 | 4.2 | 6.0 | 0.0 | -0.1 | 97 | 4.7 | 3.00 |
| ready-rifle-jog-3-turn1.5L | rifle | 3.00 | 7.2 | -0.3 | 9.6 | -7.9 | 0.25 | 0.00 | 0.0 | 0 | 1.21 | 0.0 | 4.2 | 6.0 | 0.0 | -0.1 | 96 | 4.7 | 3.00 |
| ready-rifle-jog-3-turn2.5R | rifle | 3.00 | -2.7 | 8.0 | 9.6 | -16.6 | 0.25 | 0.00 | 0.0 | 0 | 1.24 | 0.0 | 4.2 | 6.3 | -0.0 | -0.1 | 88 | 5.0 | 3.00 |
| ready-rifle-jog-3-turn2.5L | rifle | 3.00 | 8.0 | -2.7 | 9.6 | -16.7 | 0.25 | 0.00 | 0.0 | 0 | 1.23 | 0.0 | 4.2 | 6.2 | 0.0 | -0.1 | 87 | 5.0 | 3.00 |
| ready-rifle-run-4-straight | rifle | 4.00 | 1.8 | 1.8 | 10.0 | 4.7 | 0.22 | 0.01 | 0.0 | 0 | 8.84 | 0.0 | 23.7 | 4.8 | 0.1 | 0.0 | 126 | 15.8 | 3.00 |
| ready-rifle-run-4-turn1.5R | rifle | 4.00 | 0.3 | 7.3 | 9.5 | -3.0 | 0.18 | 0.01 | 0.0 | 0 | 7.29 | 0.0 | 23.7 | 2.2 | 0.2 | 0.0 | 120 | 12.0 | 3.00 |
| ready-rifle-run-4-turn1.5L | rifle | 4.00 | 7.3 | 0.2 | 9.6 | -2.7 | 0.18 | 0.01 | 0.0 | 0 | 7.38 | 0.0 | 23.7 | 2.3 | -0.1 | 0.0 | 121 | 12.6 | 3.00 |
| ready-rifle-run-4-turn2.5R | rifle | 4.00 | -1.8 | 7.5 | 9.5 | -11.9 | 0.18 | 0.00 | 0.0 | 0 | 7.42 | 0.0 | 23.7 | 2.2 | 0.1 | 0.0 | 111 | 12.9 | 3.00 |
| ready-rifle-run-4-turn2.5L | rifle | 4.00 | 7.6 | -1.9 | 9.6 | -11.9 | 0.18 | 0.00 | 0.0 | 0 | 7.31 | 0.0 | 23.7 | 2.2 | -0.1 | 0.0 | 112 | 12.6 | 3.00 |
| ready-rifle-stop-walk-1.4 | rifle | 0.03 | 1.8 | 2.9 | 9.4 | 6.0 | 0.20 | 0.00 | 0.0 | 0 | 0.93 | 0.0 | 4.3 | 3.9 | 0.1 | -0.1 | - | 1.2 | 1.20 |
| ready-rifle-stop-jog-3 | rifle | 0.06 | 1.4 | 2.8 | 11.0 | 6.0 | 0.22 | 0.00 | 0.0 | 0 | 3.11 | 0.0 | 4.3 | 4.8 | 0.1 | -0.1 | - | 11.4 | 1.20 |
| ready-rifle-stop-run-4 | rifle | 0.08 | 6.1 | 1.6 | 10.0 | 9.7 | - | 0.00 | 0.0 | 0 | 4.96 | 0.0 | 4.3 | 4.2 | 0.1 | 0.0 | - | 9.5 | 0.80 |
| ready-pistol-walk-1.4-straight | pistol | 1.40 | 1.5 | 1.5 | 10.0 | 6.0 | 0.43 | 0.01 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 58 | 0.9 | 2.33 |
| ready-pistol-walk-1.4-turn1.5R | pistol | 1.40 | -0.3 | 7.5 | 9.7 | 3.2 | 0.42 | 0.01 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 52 | 0.9 | 2.33 |
| ready-pistol-walk-1.4-turn1.5L | pistol | 1.40 | 7.5 | -0.3 | 9.8 | 3.2 | 0.42 | 0.01 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | -0.0 | 0.1 | 54 | 0.9 | 2.33 |
| ready-pistol-walk-1.4-turn2.5R | pistol | 1.40 | -2.1 | 5.4 | 9.6 | -0.5 | 0.43 | 0.00 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | 0.0 | 0.1 | 44 | 0.9 | 2.33 |
| ready-pistol-walk-1.4-turn2.5L | pistol | 1.40 | 5.5 | -2.2 | 9.7 | -0.4 | 0.47 | 0.00 | 0.0 | 0 | 0.10 | 0.0 | 1.7 | 4.5 | -0.0 | 0.1 | 48 | 0.9 | 2.33 |
| ready-pistol-jog-3-straight | pistol | 3.00 | 1.6 | 1.6 | 10.0 | 5.8 | 0.28 | 0.00 | 0.0 | 0 | 2.78 | 0.0 | 4.2 | 6.2 | -0.0 | -0.1 | 102 | 4.6 | 3.00 |
| ready-pistol-jog-3-turn1.5R | pistol | 3.00 | -0.3 | 7.2 | 9.6 | -7.9 | 0.25 | 0.00 | 0.0 | 0 | 1.30 | 0.0 | 4.2 | 6.0 | 0.0 | -0.1 | 97 | 4.7 | 3.00 |
| ready-pistol-jog-3-turn1.5L | pistol | 3.00 | 7.2 | -0.3 | 9.6 | -7.9 | 0.25 | 0.00 | 0.0 | 0 | 1.32 | 0.0 | 4.2 | 6.0 | 0.0 | -0.1 | 96 | 4.7 | 3.00 |
| ready-pistol-jog-3-turn2.5R | pistol | 3.00 | -2.7 | 8.0 | 9.6 | -16.6 | 0.25 | 0.00 | 0.0 | 0 | 1.30 | 0.0 | 4.2 | 6.3 | -0.0 | -0.1 | 88 | 5.0 | 3.00 |
| ready-pistol-jog-3-turn2.5L | pistol | 3.00 | 8.0 | -2.7 | 9.6 | -16.7 | 0.25 | 0.00 | 0.0 | 0 | 1.33 | 0.0 | 4.2 | 6.2 | 0.0 | -0.1 | 87 | 5.0 | 3.00 |
| ready-pistol-run-4-straight | pistol | 4.00 | 1.8 | 1.8 | 10.0 | 4.7 | 0.22 | 0.01 | 0.0 | 0 | 36.26 | 3.3 | 23.7 | 4.8 | 0.1 | 0.0 | 126 | 15.8 | 3.00 |
| ready-pistol-run-4-turn1.5R | pistol | 4.00 | 0.3 | 7.3 | 9.5 | -3.0 | 0.18 | 0.01 | 0.0 | 0 | 9.46 | 0.0 | 23.7 | 2.2 | 0.2 | 0.0 | 120 | 12.0 | 3.00 |
| ready-pistol-run-4-turn1.5L | pistol | 4.00 | 7.3 | 0.2 | 9.6 | -2.7 | 0.18 | 0.01 | 0.0 | 0 | 30.98 | 0.0 | 23.7 | 2.3 | -0.1 | 0.0 | 121 | 12.6 | 3.00 |
| ready-pistol-run-4-turn2.5R | pistol | 4.00 | -1.8 | 7.5 | 9.5 | -11.9 | 0.18 | 0.00 | 0.0 | 0 | 7.43 | 0.0 | 23.7 | 2.2 | 0.1 | 0.0 | 111 | 12.9 | 3.00 |
| ready-pistol-run-4-turn2.5L | pistol | 4.00 | 7.6 | -1.9 | 9.6 | -11.9 | 0.18 | 0.00 | 0.0 | 0 | 17.78 | 0.0 | 23.7 | 2.2 | -0.1 | 0.0 | 112 | 12.6 | 3.00 |
| ready-pistol-stop-walk-1.4 | pistol | 0.03 | 1.8 | 2.9 | 9.4 | 6.0 | 0.20 | 0.00 | 0.0 | 0 | 0.98 | 0.0 | 4.3 | 3.9 | 0.1 | -0.1 | - | 1.2 | 1.20 |
| ready-pistol-stop-jog-3 | pistol | 0.06 | 1.4 | 2.8 | 11.0 | 6.0 | 0.22 | 0.00 | 0.0 | 0 | 3.11 | 0.0 | 4.3 | 4.8 | 0.1 | -0.1 | - | 11.4 | 1.20 |
| ready-pistol-stop-run-4 | pistol | 0.08 | 6.1 | 1.6 | 10.0 | 9.7 | - | 0.00 | 0.0 | 0 | 5.11 | 0.0 | 4.3 | 4.2 | 0.1 | 0.0 | - | 9.5 | 0.80 |
| ready-rifle-draw-midjog-3 | rifle drawn at 3 s | 3.00 | 1.6 | 1.6 | 10.0 | 5.8 | 0.28 | 0.00 | 0.3 | 1 | 20.61 | 0.0 | 8.7 | 5.2 | -0.1 | -0.2 | 106 | 12.3 | 3.00 |
| ready-rifle-holster-midjog-3 | rifle holstered at 3 s | 3.00 | 1.6 | 0.9 | 10.0 | 6.0 | 0.28 | 0.01 | 0.3 | 1 | 22.64 | 0.0 | 11.7 | 4.7 | -0.1 | -0.1 | 98 | 12.3 | 3.00 |

## Aimed glide (standing)
| scenario | gun | speed | step cm | cadence /s | trk L cm | trk R cm | pass gap cm | slide cm | foot pitch step deg | pel lat p2p cm | trunk deg | gun leg cm | gun trunk cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| aimed-rifle-z+1.4 | rifle | 1.40 | 46 | 3.00 | 3.3 | 3.3 | 10.0 | 0.00 | 11.3 | 2.3 | 15.6 | 47.7 | 0.7 |
| aimed-rifle-z-1.05 | rifle | 1.05 | 26 | 4.00 | 3.1 | 3.1 | 10.0 | 0.00 | 17.2 | 2.8 | 16.0 | 47.7 | 0.8 |
| aimed-rifle-z+0.75 | rifle | 0.75 | 36 | 2.00 | 3.7 | 3.7 | 10.0 | 0.00 | 7.7 | 1.7 | 16.1 | 47.7 | 0.8 |
| aimed-rifle-z-0.56 | rifle | 0.56 | 22 | 2.33 | 3.5 | 3.5 | 10.0 | 0.00 | 14.2 | 1.9 | 16.1 | 47.7 | 0.8 |
| aimed-rifle-raise-walk1.4 | rifle | 1.40 | 46 | 3.25 | 3.2 | 3.3 | 10.0 | 0.00 | 11.3 | 3.6 | 13.8 | 29.5 | 0.7 |
| aimed-rifle-fwd-back-reverse | rifle | 1.24 | 32 | 3.43 | 3.0 | 3.1 | 9.9 | 2.13 | 17.2 | 2.8 | 15.8 | 47.7 | 0.7 |

## Standing idle
| scenario | gun | speed | trk L cm | trk R cm | gap min cm | pel lat p2p cm | pel vert p2p cm | head yaw p2p deg | head yaw rate max deg/s | wrist jerk cm | pel beyond cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| idle-holstered-12s | - | 0.00 | 2.1 | 2.1 | 6.0 | 1.8 | 0.4 | 27.2 | 14 | 0.01 | 0.01 |
| idle-drawn-rifle-12s | rifle | 0.00 | 6.4 | 6.5 | 14.1 | 1.2 | 0.6 | 0.8 | 1 | 0.01 | 0.01 |
| idle-stop-from-walk-1.4 | - | 0.02 | 1.0 | -0.1 | 4.8 | 4.5 | 4.4 | 26.3 | 59 | 1.02 | 1.37 |
| idle-stop-from-jog-3 | - | 0.04 | 2.6 | 2.8 | 6.0 | 3.7 | 6.5 | 26.3 | 72 | 1.92 | 0.90 |
| idle-start-to-walk-1.4 | - | 1.09 | 1.5 | 0.3 | 4.2 | 4.7 | 11.3 | 12.3 | 50 | 1.54 | 0.47 |
| idle-start-to-jog-3 | - | 2.33 | 2.3 | 2.1 | 6.0 | 2.9 | 13.2 | 18.7 | 118 | 4.78 | 1.13 |
