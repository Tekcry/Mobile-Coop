# mocap-trial - takes, picks and the pipeline

GENERATED in sections by scripts/mocap/analyze.mjs (findings, analysis, method), retarget.mjs (intermediates) and
emit.mjs (clips) from the CMU takes in `.mocap-cache/` (raw ASF / AMC, gitignored, never copied into tracked files: the
licence bans redistributing it). Edit the scripts, not this file. Source, URLs and licence: SOURCES.md. Clip format:
CLIP-FORMAT.md.

<!-- mocap:findings -->
## Findings

- Reader: 36 takes parsed; self-check (bone lengths constant to under 0.001 mm, unit rotations, floor within 8 cm) passes on every take. Floor (5th percentile of the lowest foot point): -0.4 to 2.2 cm, so the CMU floor is y = 0 within about 2 cm.
- Performers: subject 16 about 1.65 m (rest skeleton to the head-bone tip; the real stature is a few cm more), hip-ankle leg 0.836 m; subject 35 about 1.67 m (rest skeleton to the head-bone tip; the real stature is a few cm more), hip-ankle leg 0.866 m; subject 69 about 1.66 m (rest skeleton to the head-bone tip; the real stature is a few cm more), hip-ankle leg 0.852 m. Wren's leg is 0.782 m, so the motion is scaled by 0.90-0.94 (leg ratio) onto her 1.68 m.
- Missing data: the clavicle channels never move in any take (no shrug data; Wren has no clavicle joint in the bind export anyway); the finger channels are dead in almost every take and the thumbs / hands / toes carry little real motion (CMU captures no fingers). Dropout frames (a bone's channels written as exact zeros: the joint snaps to its rest pose for those frames): 16_15 (lhumerus 2, lradius 2, lwrist 2, lhand 7, lfingers 7, lthumb 7); 16_54 (rtoes 2); 16_33 (lhand 2, lfingers 2, lthumb 2); 69_13 (ltibia 5); 69_14 (ltibia 8, rtibia 2). The picks keep clear of them.
- Glitches (a core joint over 8 deg in one 1/120 s frame and 4x its neighbourhood): 35_01 left foot frames 96-102 (20-38 deg per frame); 16_17 at its end (frames 474-475: lower back 28 deg, femurs 34 deg); 16_43 frames 114-115 (16-20 deg); short settling pops in the first 0.15 s of 16_22, 16_34, 16_35, 16_46, 16_56 (neck and upper arms 9-14 deg). Extremity pops (toes, hands, thumbs) run 3-71 per take against 0-13 core: the toes and hands are noisy (CMU caveat), so the clips take the hands from the wrist segment and the feet from the ankle-ball segment; the toe joint is carried in the intermediates but not used by the clips.
- Walks: every walk take is clean and steady (1.0-1.7 m/s, all cycles steady, slide 1.5-2.5 cm on the performer). 16_15 has the left arm zeroed in its first 8 frames (outside the picked cycle).
- Jogs and runs: the "run/jog" loops are short (1.1-1.6 s), one or two full cycles each. 16_45 / 16_46 are the only steady runs (4.01 / 4.13 m/s), each with one right-strike cycle only (the loop is re-phased to start at the left strike). 16_55 ("run") and 16_56 ("run/jog") are accelerations from a walk (about 1 to 4.2 m/s in 1 s) with no steady cycle: unusable as loops, used as a run start from a walk.
- Turns on the move: 16_17-16_20 (walk) and 16_41-16_44 (jog) are clean 87-92 deg turns over 0.85-1.5 s with 1-3 steps. The "run" turns 16_51-16_54 are performed at jog speed (2.3-3.5 m/s) and are cut by the take edges (still turning at the start or the end): 16_53 / 16_54 capture only 64-73 deg; 16_17 ends in a glitch.
- Turn in place: 69_13 and 69_14 are NOT idle turns in place. They are walks back and forth along curved paths (the heading drifts about 90 deg over 3 s of walking) with a 160-190 deg turnaround every 4-5 s, slowing to 0.1-0.25 m/s (16 turnarounds found). The picks use the cleanest turnaround per side (pivot180_L / pivot180_R); the first 90 deg of the right one stands in for the turn-in-place slot, but it is a walking pivot (mean 0.4 m/s), not a standing turn. 69_13 / 69_14 also have knee dropout frames (ltibia, rtibia). No idle 90 deg turn in place exists in the downloaded set.
- Starts: only 16_31 and 16_32 start from standing (walk, 0.1 to 1.3 m/s in 1.3-1.4 s). No standing jog or run start.
- Stops: 16_33 / 16_34 walk to a standstill (1.2 m/s, 1.7-1.9 s, about 1.2 m, 3 steps); 16_57 and 16_08 jog to a standstill (3.0-3.3 m/s, about 1.6 s, 1.9 m, 3-4 steps; 16_08 holds still only 0.04 s before the take ends).
- Unusable for their listed use: 16_55 / 16_56 as loops (accelerating), 16_53 / 16_54 as 90 deg turns (cut at 64-73 deg), 69_13 / 69_14 as idle turns in place (walking turnarounds), 16_17 past 3.9 s (glitch).
<!-- /mocap:findings -->

<!-- mocap:analysis -->
## Picks per slot

Numbers in this and the next tables are the performer at their own size (metres, 120 fps).

| Slot | Pick | Runner-up | Why |
| --- | --- | --- | --- |
| walk_loop | 35_01 L-strike cycle 1.23-2.34 s | 16_15 (score 3.3) | Wren stride 1.3 m (game / clip 0.99 at the band middle), 1.29 m/s, 1.79 steps/s, stride 1.46 m, slide 1.9 cm, seam 2 cm, 0 pops, heading drift 0.4 deg |
| jog_loop | 16_36 R-strike cycle 0.30-1.09 s | 16_35 (score 9) | Wren stride 1.99 m (game / clip 1.02 at the band middle), 2.69 m/s, 2.53 steps/s, stride 2.11 m, slide 2.8 cm, seam 3.5 cm, 0 pops, heading drift -2.2 deg |
| run_loop | 16_46 R-strike cycle 0.16-0.85 s | 16_45 (score 19.5) | Wren stride 2.67 m (game / clip 0.95 at the band middle), 4.13 m/s, 2.89 steps/s, stride 2.81 m, slide 2.1 cm, seam 6.7 cm, 0 pops, heading drift -0.3 deg |
| walk_turn90_L | 16_18 turn -89.5 deg over 1.16 s | 16_17 (score 6.2) | -89.5 deg in 1.16 s (peak -122 deg/s), 1.05 -> min 0.69 -> 1 m/s, 2 steps |
| walk_turn90_R | 16_19 turn 91.7 deg over 0.85 s | 16_20 (score 6.8) | 91.7 deg in 0.85 s (peak 147 deg/s), 1.02 -> min 0.71 -> 0.97 m/s, 1 steps |
| jog_turn90_L | 16_41 turn -91 deg over 0.96 s | 16_42 (score 6.2) | -91 deg in 0.96 s (peak -134 deg/s), 2.63 -> min 1.79 -> 2.12 m/s, 3 steps |
| jog_turn90_R | 16_44 turn 87.8 deg over 0.93 s | 16_43 (score 13.6) | 87.8 deg in 0.93 s (peak 133 deg/s), 2.2 -> min 1.83 -> 2.2 m/s, 3 steps |
| run_turn90_L | 16_51 turn -87.1 deg over 1.44 s | 16_52 (score 24.5) | -87.1 deg in 1.44 s (peak -99 deg/s), 3.34 -> min 2.33 -> 2.52 m/s, 7 steps, turn cut by the take edge |
| run_turn90_R | 16_53 turn 64.4 deg over 1.11 s | 16_54 (score 36.1) | 64.4 deg in 1.11 s (peak 83 deg/s), 2.95 -> min 2.63 -> 2.73 m/s, 5 steps, turn cut by the take edge |
| pivot180_L | 69_14 -164.9 deg at 30.85-32.45 s | 69_13 (score 21.9) | -164.9 deg in 1.6 s, mean 0.29 m/s (min 0.06), travel 0.4 m, 1 steps, slide 7.7 cm, 0 pops |
| pivot180_R | 69_13 177 deg at 16.04-17.68 s | 69_13 (score 18.9) | 177 deg in 1.63 s, mean 0.37 m/s (min 0.18), travel 0.31 m, 2 steps, slide 3.6 cm, 0 pops |
| walk_stop | 16_34 stop from 1.22 m/s | 16_33 (score 20) | 1.22 m/s to standstill in 1.85 s over 1.18 m, 3 steps |
| jog_stop | 16_57 stop from 3.02 m/s | 16_08 (score 17.6) | 3.02 m/s to standstill in 1.59 s over 1.88 m, 4 steps |
| walk_start | 16_31 0.1 -> 1.29 m/s | 69_13 (score 9.8) | 0.1 -> 1.29 m/s in 1.26 s over 0.82 m, 1 steps, first foot l |
| run_start_from_walk | 16_55 1.06 -> 4.21 m/s | - | 1.06 -> 4.21 m/s in 0.94 s over 2.19 m, 3 steps, first foot l |

Score: lower is better (loops: seam cm + 2 x slide cm + 5 x pops + 0.5 x heading drift deg + 30 x speed deviation +
20 if a dropout frame falls in the cycle, minus up to 3 for steady cycles in the take; turns: 0.5 x |angle - 90| + 2 x
median slide + 5 x pops + 10 if the turn is cut by the take edge; pivots: 10 x mean speed + 2 x slide + 5 x pops + 20 for
dropouts + 0.1 x |180 - angle|; stops / starts: missing standstill or top speed, slide, pops, dropouts).

## All takes

| Take | Site label | Dur s | Gait | Speed m/s | Cadence steps/s | Stride m | Clean cycles | Slide cm med / max | Pops core / extr | Jitter mm core / extr | Dropouts | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16_15 | walk | 3.93 | walk | 1.10 | 1.71 | 1.30 | 4 / 4 | 1.9 / 2.2 | 2 / 32 | 0.95 / 1.10 | lhumerus 2, lradius 2, lwrist 2, lhand 7, lfingers 7, lthumb 7 |  |
| 16_16 | walk | 4.25 | walk | 1.01 | 1.67 | 1.22 | 5 / 5 | 1.8 / 2.3 | 0 / 26 | 0.88 / 1.01 | - |  |
| 16_21 | walk | 2.60 | walk | 1.72 | 2.09 | 1.65 | 3 / 3 | 1.6 / 2.0 | 0 / 5 | 0.94 / 1.04 | - |  |
| 16_22 | walk | 2.56 | walk | 1.62 | 2.09 | 1.56 | 4 / 4 | 1.9 / 2.8 | 6 / 11 | 1.01 / 1.13 | - |  |
| 16_31 | walk | 3.53 | walk | 1.27 | 1.87 | 1.37 | 2 / 3 | 1.7 / 2.5 | 0 / 19 | 0.78 / 1.04 | - | start 0.1->1.29 in 1.26 s |
| 16_32 | walk | 4.83 | walk | 1.26 | 1.88 | 1.35 | 5 / 5 | 2.2 / 2.8 | 3 / 11 | 0.82 / 1.24 | - | start 0.1->1.29 in 1.43 s |
| 35_01 | walk (second performer) | 2.98 | walk | 1.29 | 1.79 | 1.44 | 4 / 4 | 1.7 / 1.9 | 6 / 34 | 1.19 / 1.54 | - |  |
| 35_02 | walk (second performer) | 3.38 | walk | 1.25 | 1.76 | 1.40 | 4 / 4 | 2.2 / 2.4 | 0 / 50 | 1.22 / 1.60 | - |  |
| 35_03 | walk (second performer) | 3.56 | walk | 1.25 | 1.78 | 1.42 | 4 / 4 | 1.7 / 3.0 | 2 / 29 | 1.10 / 1.36 | - |  |
| 16_35 | run/jog | 1.35 | jog | 2.80 | 2.49 | 2.27 | 2 / 2 | 1.6 / 1.8 | 7 / 15 | 1.66 / 1.92 | - |  |
| 16_36 | run/jog | 1.58 | jog | 2.69 | 2.55 | 2.10 | 2 / 2 | 2.8 / 3.2 | 3 / 3 | 1.73 / 1.88 | - |  |
| 16_45 | run/jog | 1.13 | run | 4.01 | 2.82 | 2.81 | 1 / 1 | 1.4 / 1.9 | 2 / 12 | 1.84 / 2.30 | - |  |
| 16_46 | run/jog | 1.13 | run | 4.13 | 2.89 | 2.81 | 1 / 1 | 2.1 / 2.8 | 6 / 19 | 2.20 / 2.51 | - |  |
| 16_56 | run/jog | 1.41 | jog | 2.96 | 2.92 | 2.15 | 0 / 2 | 1.7 / 2.9 | 8 / 20 | 2.13 / 2.89 | - |  |
| 16_55 | run | 1.51 | jog | 3.21 | 3.27 | 2.10 | 0 / 2 | 1.6 / 3.0 | 12 / 28 | 2.79 / 4.07 | - | accel 1.06->4.21 in 0.94 s |
| 35_17 | run/jog (second performer) | 1.39 | jog | 3.16 | 2.64 | 2.38 | 1 / 1 | 1.5 / 2.5 | 0 / 24 | 1.83 / 2.00 | - |  |
| 35_18 | run/jog (second performer) | 1.46 | jog | 3.14 | 2.58 | 2.43 | 1 / 1 | 2.5 / 3.0 | 0 / 21 | 1.74 / 1.95 | - |  |
| 35_19 | run/jog (second performer) | 1.33 | jog | 3.35 | 2.67 | 2.51 | 1 / 1 | 2.7 / 3.9 | 0 / 40 | 1.99 / 2.42 | - |  |
| 16_17 | walk, 90-degree left turn | 4.32 | walk | 0.86 | 1.78 | 1.05 | 1 / 5 | 2.2 / 4.1 | 13 / 46 | 1.19 / 1.93 | - | turn -86.5 deg |
| 16_18 | walk, 90-degree left turn | 4.33 | walk | 0.89 | 1.74 | 1.11 | 1 / 5 | 2.3 / 2.9 | 0 / 49 | 1.15 / 1.52 | - | turn -89.5 deg |
| 16_19 | walk, 90-degree right turn | 3.42 | walk | 0.82 | 1.65 | 1.06 | 0 / 4 | 2.7 / 8.0 | 1 / 40 | 1.36 / 1.70 | - | turn 91.7 deg |
| 16_20 | walk, 90-degree right turn | 4.19 | walk | 0.92 | 1.70 | 1.15 | 1 / 5 | 2.4 / 5.1 | 1 / 35 | 1.34 / 1.62 | - | turn 86.1 deg |
| 16_41 | run/jog, 90-degree left turn | 1.33 | walk | 1.81 | 2.86 | 1.37 | 0 / 2 | 2.8 / 3.9 | 0 / 10 | 2.02 / 2.56 | - | turn -91 deg |
| 16_42 | run/jog, 90-degree left turn | 1.72 | walk | 1.67 | 3.26 | 1.28 | 0 / 2 | 1.4 / 2.8 | 0 / 16 | 1.83 / 2.69 | - | turn -96.8 deg |
| 16_43 | run/jog, 90-degree right turn | 1.75 | jog | 2.12 | 3.14 | 1.60 | 0 / 2 | 1.2 / 1.8 | 7 / 11 | 1.81 / 1.99 | - | turn 87.7 deg |
| 16_44 | run/jog, 90-degree right turn | 1.80 | walk | 1.85 | 2.89 | 1.66 | 0 / 3 | 1.1 / 1.7 | 2 / 12 | 1.95 / 2.42 | - | turn 87.8 deg |
| 16_51 | run, 90-degree left turn | 1.48 | jog | 2.65 | 6.49 | 0.88 | 0 / 3 | 1.2 / 2.2 | 4 / 19 | 2.33 / 2.80 | - | turn -87.1 deg (cut) |
| 16_52 | run, 90-degree left turn | 1.44 | jog | 2.31 | 4.66 | 1.06 | 0 / 4 | 1.6 / 2.3 | 0 / 11 | 2.34 / 2.68 | - | turn -67.4 deg (cut) |
| 16_53 | run, 90-degree right turn | 1.19 | jog | 2.61 | 4.29 | 1.37 | 0 / 3 | 2.2 / 3.1 | 3 / 27 | 2.44 / 2.77 | - | turn 64.4 deg (cut) |
| 16_54 | run, 90-degree right turn | 1.15 | jog | 2.47 | 4.43 | 1.24 | 0 / 2 | 1.3 / 3.7 | 0 / 23 | 2.92 / 3.26 | rtoes 2 | turn 53.1 deg (cut) |
| 16_08 | run/jog, sudden stop | 1.99 | jog | 2.05 | 3.17 | 1.25 | 0 / 2 | 1.3 / 1.5 | 5 / 5 | 1.11 / 1.37 | - | stop 3.31->0 in 1.56 s / 1.85 m |
| 16_57 | run/jog, sudden stop | 2.23 | walk | 1.83 | 2.79 | 1.33 | 1 / 3 | 1.5 / 1.7 | 0 / 17 | 1.01 / 1.23 | - | stop 3.02->0 in 1.59 s / 1.88 m |
| 16_33 | slow walk, stop | 2.38 | walk | 0.93 | 1.78 | 0.85 | 0 / 2 | 2.5 / 2.7 | 4 / 38 | 0.74 / 1.06 | lhand 2, lfingers 2, lthumb 2 | stop 1.22->0 in 1.71 s / 1.2 m |
| 16_34 | slow walk, stop | 2.89 | walk | 0.88 | 1.83 | 0.77 | 0 / 2 | 1.9 / 2.0 | 13 / 23 | 0.67 / 1.08 | - | stop 1.22->0 in 1.85 s / 1.18 m |
| 69_13 | walk, turn in place (repeated) | 39.58 | walk | 0.76 | 1.70 | 0.92 | 0 / 42 | 2.4 / 25.3 | 0 / 63 | 0.63 / 0.75 | ltibia 5 | start 0.1->0.84 in 0.72 s; 8 pivots |
| 69_14 | walk, turn in place (repeated) | 40.98 | walk | 0.76 | 1.66 | 0.98 | 0 / 47 | 2.8 / 33.0 | 0 / 71 | 0.62 / 0.74 | ltibia 8, rtibia 2 | 8 pivots |

Performers (rest skeleton, legs straight, head-bone tip): subject 16 about 1.65 m tall, leg (hip-ankle) 0.836 m; subject 35 about 1.67 m tall, leg (hip-ankle) 0.866 m; subject 69 about 1.66 m tall, leg (hip-ankle) 0.852 m.

## Cycles of the loop takes

| Take | Cycle | s | T s | Speed | Cadence | Stride | Slide cm | Seam cm | Height pop cm | Heading drift deg | Pops | Dropouts | Steady | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16_15 | L | 1.12-2.27 | 1.158 | 1.11 | 1.73 | 1.3 | 1.9 | 1.7 | -1.1 | 0 | 0 | 0 | yes | 5.8 |
| 16_15 | L | 2.27-3.46 | 1.183 | 1.1 | 1.69 | 1.29 | 2.2 | 1.3 | -0.5 | 2.5 | 0 | 0 | yes | 7 |
| 16_15 | R | 0.53-1.68 | 1.15 | 1.1 | 1.74 | 1.28 | 1.5 | 1.2 | -0.2 | -0.7 | 0 | 0 | yes | 4.6 |
| 16_15 | R | 1.68-2.86 | 1.183 | 1.1 | 1.69 | 1.31 | 2.2 | 1.7 | -1.2 | 2.2 | 0 | 0 | yes | 7.2 |
| 16_16 | L | 0.94-2.15 | 1.208 | 1.02 | 1.66 | 1.23 | 1.8 | 2 | -0.4 | 0.4 | 0 | 0 | yes | 6.1 |
| 16_16 | L | 2.15-3.35 | 1.2 | 1.01 | 1.67 | 1.2 | 2.3 | 2.1 | -0.5 | -3.8 | 0 | 0 | yes | 8.6 |
| 16_16 | R | 0.33-1.53 | 1.2 | 1.01 | 1.67 | 1.21 | 1.7 | 1.7 | 0.3 | -1.5 | 0 | 0 | yes | 5.9 |
| 16_16 | R | 1.53-2.73 | 1.192 | 1.01 | 1.68 | 1.22 | 1.8 | 2.1 | -0.9 | -0.2 | 0 | 0 | yes | 5.8 |
| 16_16 | R | 2.73-3.94 | 1.217 | 1.01 | 1.64 | 1.25 | 2.3 | 2 | -0.4 | 0 | 0 | 0 | yes | 6.6 |
| 16_21 | L | 0.33-1.33 | 1.008 | 1.71 | 1.98 | 1.64 | 1.5 | 4.2 | -0.4 | -0.6 | 0 | 0 | yes | 7.7 |
| 16_21 | L | 1.33-2.27 | 0.942 | 1.72 | 2.12 | 1.65 | 2 | 3.1 | -1.3 | 1.2 | 0 | 0 | yes | 7.7 |
| 16_21 | R | 0.80-1.76 | 0.958 | 1.72 | 2.09 | 1.65 | 1.6 | 2.2 | -1.2 | -0.8 | 0 | 0 | yes | 5.8 |
| 16_22 | L | 0.47-1.41 | 0.942 | 1.62 | 2.12 | 1.54 | 1.9 | 2.5 | -0.4 | -0.4 | 0 | 0 | yes | 6.6 |
| 16_22 | L | 1.41-2.38 | 0.967 | 1.61 | 2.07 | 1.57 | 2.8 | 2.6 | -1.5 | -4.6 | 0 | 0 | yes | 10.6 |
| 16_22 | R | 0.02-0.92 | 0.9 | 1.67 | 2.22 | 1.57 | 1.9 | 5.1 | -0.2 | 4.1 | 1 | 0 | yes | 17 |
| 16_22 | R | 0.92-1.89 | 0.975 | 1.59 | 2.05 | 1.54 | 2.8 | 2.2 | -0.8 | -4.6 | 0 | 0 | yes | 10.6 |
| 16_31 | L | 0.84-2.18 | 1.342 | 1.11 | 1.49 | 1.47 | 1.6 | 5.5 | -0.3 | 2.9 | 0 | 0 | no | 13.9 |
| 16_31 | L | 2.18-3.23 | 1.05 | 1.27 | 1.9 | 1.33 | 2.5 | 3.6 | -0.7 | -3.7 | 0 | 0 | yes | 10.5 |
| 16_31 | R | 1.59-2.68 | 1.092 | 1.28 | 1.83 | 1.4 | 1.8 | 3.5 | 0.2 | -2.8 | 0 | 0 | yes | 8.7 |
| 16_32 | L | 1.32-2.55 | 1.225 | 1.15 | 1.63 | 1.37 | 1.8 | 5.7 | 0.7 | 3.6 | 0 | 0 | yes | 13.7 |
| 16_32 | L | 2.55-3.60 | 1.05 | 1.28 | 1.9 | 1.35 | 2.4 | 2.7 | -0.6 | 2.1 | 0 | 0 | yes | 9 |
| 16_32 | L | 3.60-4.67 | 1.067 | 1.21 | 1.88 | 1.29 | 2.8 | 1.4 | -0.3 | -2.3 | 0 | 0 | yes | 9.3 |
| 16_32 | R | 1.99-3.06 | 1.067 | 1.27 | 1.88 | 1.36 | 1.9 | 2.6 | 0.1 | -2.6 | 0 | 0 | yes | 7.9 |
| 16_32 | R | 3.06-4.12 | 1.058 | 1.26 | 1.89 | 1.32 | 2.5 | 2.1 | -0.8 | 2 | 0 | 0 | yes | 8.1 |
| 35_01 | L | 0.07-1.23 | 1.15 | 1.27 | 1.74 | 1.44 | 1.9 | 2.4 | -0.3 | -3.3 | 6 | 0 | yes | 38.2 |
| 35_01 | L | 1.23-2.34 | 1.117 | 1.29 | 1.79 | 1.46 | 1.9 | 2 | -1.2 | 0.4 | 0 | 0 | yes | 6.1 |
| 35_01 | R | 0.64-1.76 | 1.117 | 1.28 | 1.79 | 1.44 | 1.9 | 1.7 | -0.8 | 1.2 | 6 | 0 | yes | 36.2 |
| 35_01 | R | 1.76-2.88 | 1.125 | 1.3 | 1.78 | 1.45 | 1.8 | 1.8 | -0.2 | -1.5 | 0 | 0 | yes | 6.5 |
| 35_02 | L | 0.47-1.61 | 1.133 | 1.25 | 1.76 | 1.4 | 2.4 | 2.2 | 0.4 | -2.2 | 0 | 0 | yes | 8.1 |
| 35_02 | L | 1.61-2.74 | 1.133 | 1.24 | 1.76 | 1.42 | 2.4 | 1.5 | -0.5 | 2.5 | 0 | 0 | yes | 7.8 |
| 35_02 | R | 1.03-2.17 | 1.142 | 1.25 | 1.75 | 1.41 | 2.4 | 2.1 | -0.3 | 0.4 | 0 | 0 | yes | 7.1 |
| 35_02 | R | 2.17-3.28 | 1.108 | 1.26 | 1.8 | 1.4 | 2.4 | 1.6 | -0.5 | 2.7 | 0 | 0 | yes | 8 |
| 35_03 | L | 0.46-1.58 | 1.125 | 1.24 | 1.78 | 1.4 | 1.7 | 1.2 | -0.2 | -3.5 | 2 | 0 | yes | 16.7 |
| 35_03 | L | 1.58-2.71 | 1.125 | 1.27 | 1.78 | 1.45 | 2.2 | 1.8 | -1.1 | 0.5 | 0 | 0 | yes | 6.8 |
| 35_03 | R | 1.00-2.15 | 1.15 | 1.25 | 1.74 | 1.42 | 1.7 | 2.5 | -0.3 | -2.1 | 2 | 0 | yes | 17.1 |
| 35_03 | R | 2.15-3.27 | 1.117 | 1.26 | 1.79 | 1.41 | 3 | 2.3 | -0.1 | 3 | 0 | 0 | yes | 9.9 |
| 16_35 | L | 0.03-0.84 | 0.808 | 2.78 | 2.47 | 2.25 | 1.6 | 3.6 | -0.8 | 2.6 | 4 | 0 | yes | 28.3 |
| 16_35 | R | 0.43-1.23 | 0.8 | 2.82 | 2.5 | 2.29 | 1.8 | 4.2 | -3.1 | 4.5 | 0 | 0 | yes | 10.3 |
| 16_36 | L | 0.72-1.49 | 0.775 | 2.68 | 2.58 | 2.09 | 3.2 | 3.7 | -2.2 | 2.3 | 1 | 0 | yes | 16.3 |
| 16_36 | R | 0.30-1.09 | 0.792 | 2.69 | 2.53 | 2.11 | 2.8 | 3.5 | -1.2 | -2.2 | 0 | 0 | yes | 10.3 |
| 16_45 | R | 0.12-0.82 | 0.708 | 4.01 | 2.82 | 2.81 | 1.4 | 5.8 | -1.8 | 2.1 | 2 | 0 | yes | 19.7 |
| 16_46 | R | 0.16-0.85 | 0.692 | 4.13 | 2.89 | 2.81 | 2.1 | 6.7 | 1.4 | -0.3 | 0 | 0 | yes | 11.1 |
| 16_56 | L | 0.12-0.83 | 0.717 | 2.51 | 2.79 | 1.89 | 1 | 10.5 | -1 | -7 | 0 | 0 | no | 20.5 |
| 16_56 | R | 0.51-1.17 | 0.658 | 3.4 | 3.04 | 2.41 | 2.9 | 10.3 | -1.1 | -4.3 | 2 | 0 | no | 32.8 |
| 16_55 | L | 0.27-0.90 | 0.633 | 2.75 | 3.16 | 1.88 | 0.8 | 11.7 | 2 | 5 | 1 | 0 | no | 25.1 |
| 16_55 | R | 0.62-1.21 | 0.592 | 3.67 | 3.38 | 2.32 | 3 | 11.9 | 0.9 | 3.1 | 3 | 0 | no | 38.7 |
| 35_17 | L | 0.28-1.03 | 0.758 | 3.16 | 2.64 | 2.38 | 2.5 | 3.6 | -1.4 | 1.2 | 0 | 0 | yes | 9.2 |
| 35_18 | L | 0.25-1.02 | 0.775 | 3.14 | 2.58 | 2.43 | 3 | 2.2 | 0.3 | -3.2 | 0 | 0 | yes | 9.8 |
| 35_19 | L | 0.27-1.02 | 0.75 | 3.35 | 2.67 | 2.51 | 2.7 | 3.9 | 1.2 | 1.6 | 0 | 0 | yes | 10.1 |

## Turns on the move

| Take | Angle deg | Turn s | Peak deg/s | Speed before / min / after | Steps in turn | Radius m | Cut by take edge | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16_17 | -86.5 | 2-2.83 (0.83) | -143 | 1.08 / 0.66 / 0.93 | 2 | 0.43 | no | 6.2 |
| 16_18 | -89.5 | 2.07-3.23 (1.16) | -122 | 1.05 / 0.69 / 1 | 2 | 0.62 | no | 4.9 |
| 16_19 | 91.7 | 1.64-2.49 (0.85) | 147 | 1.02 / 0.71 / 0.97 | 1 | 0.45 | no | 6.3 |
| 16_20 | 86.1 | 1.52-2.57 (1.05) | 118 | 1.01 / 0.76 / 0.91 | 2 | 0.61 | no | 6.8 |
| 16_41 | -91 | 0.25-1.21 (0.96) | -134 | 2.63 / 1.79 / 2.12 | 3 | 1.3 | no | 6.1 |
| 16_42 | -96.8 | 0.26-1.3 (1.04) | -128 | 2.38 / 1.66 / 2.26 | 3 | 1.23 | no | 6.2 |
| 16_43 | 87.7 | 0.28-1.66 (1.38) | 92 | 2.55 / 2.07 / 2.46 | 5 | 2.12 | no | 13.6 |
| 16_44 | 87.8 | 0.44-1.37 (0.93) | 133 | 2.2 / 1.83 / 2.2 | 3 | 1.29 | no | 13.3 |
| 16_51 | -87.1 | 0.03-1.48 (1.44) | -99 | 3.34 / 2.33 / 2.52 | 7 | 2.55 | yes | 18.9 |
| 16_52 | -67.4 | 0.21-1.43 (1.23) | -71 | 3.02 / 2.25 / 2.7 | 6 | 2.69 | yes | 24.5 |
| 16_53 | 64.4 | 0-1.11 (1.11) | 83 | 2.95 / 2.63 / 2.73 | 5 | 2.79 | yes | 32.2 |
| 16_54 | 53.1 | 0-0.93 (0.93) | 81 | 2.8 / 2.5 / 2.93 | 4 | 2.78 | yes | 36.1 |

## Pivot turns (69_13, 69_14)

| Take | Dir | Angle deg | s | Mean / min speed | Travel m | Steps | Slide cm | Pops | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 69_13 | L | -162.5 | 3.4-5.07 | 0.48 / 0.22 | 0.28 | 1 | 22.7 | 0 | 52 |
| 69_13 | R | 172.3 | 7.58-9.23 | 0.38 / 0.2 | 0.28 | 2 | 15.3 | 0 | 35.2 |
| 69_13 | L | -167.7 | 11.93-13.46 | 0.44 / 0.23 | 0.22 | 1 | 19.1 | 0 | 63.8 |
| 69_13 | R | 177 | 16.04-17.68 | 0.37 / 0.18 | 0.31 | 2 | 3.6 | 0 | 11.2 |
| 69_13 | L | -169.3 | 20.34-21.88 | 0.37 / 0.07 | 0.5 | 2 | 11.9 | 0 | 28.6 |
| 69_13 | R | 166.7 | 25.04-26.59 | 0.34 / 0.14 | 0.35 | 2 | 7.1 | 0 | 18.9 |
| 69_13 | L | -171.9 | 29.43-31.1 | 0.33 / 0.11 | 0.45 | 1 | 8.9 | 0 | 21.9 |
| 69_13 | R | 161.5 | 34.38-35.83 | 0.33 / 0.19 | 0.26 | 1 | 15.1 | 0 | 35.4 |
| 69_14 | L | -159.8 | 3.07-4.57 | 0.4 / 0.13 | 0.52 | 2 | 9.3 | 0 | 44.6 |
| 69_14 | R | 193.1 | 6.88-9.1 | 0.43 / 0.17 | 0.8 | 3 | 11.2 | 0 | 48 |
| 69_14 | L | -168.7 | 12.28-13.94 | 0.37 / 0.13 | 0.48 | 1 | 14.7 | 0 | 34.2 |
| 69_14 | R | 166.3 | 17.35-19 | 0.34 / 0.13 | 0.26 | 1 | 16.3 | 0 | 37.4 |
| 69_14 | L | -173.8 | 21.83-23.37 | 0.35 / 0.1 | 0.45 | 1 | 12.7 | 0 | 29.5 |
| 69_14 | R | 191.5 | 25.78-27.8 | 0.39 / 0.11 | 0.73 | 4 | 3.5 | 0 | 32.1 |
| 69_14 | L | -164.9 | 30.85-32.45 | 0.29 / 0.06 | 0.4 | 1 | 7.7 | 0 | 19.8 |
| 69_14 | R | 186.8 | 34.93-36.92 | 0.4 / 0.17 | 0.62 | 4 | 3.7 | 0 | 32.1 |

## Stops and starts

| Take | What | From m/s | To m/s | s | Time s | Distance m | Steps | Notes | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16_31 | start from rest | 0.1 | 1.29 | 0.24-1.5 | 1.26 | 0.82 | 1 | first foot l | 3.4 |
| 16_32 | start from rest | 0.1 | 1.29 | 0.47-1.9 | 1.43 | 0.84 | 1 | first foot l | 14.4 |
| 16_55 | acceleration | 1.06 | 4.21 | 0-0.94 | 0.94 | 2.19 | 3 | first foot l | 38.2 |
| 16_08 | stop | 3.31 | 0 | 0.38-1.94 | 1.56 | 1.85 | 3 | standstill, 0.04 s of hold after | 17.6 |
| 16_57 | stop | 3.02 | 0 | 0.33-1.93 | 1.59 | 1.88 | 4 | standstill, 0.3 s of hold after | 3 |
| 16_33 | stop | 1.22 | 0 | 0.38-2.09 | 1.71 | 1.2 | 3 | standstill, 0.28 s of hold after | 20 |
| 16_34 | stop | 1.22 | 0 | 0.78-2.63 | 1.85 | 1.18 | 3 | standstill, 0.26 s of hold after | 13.8 |
| 69_13 | start from rest | 0.1 | 0.84 | 0.41-1.13 | 0.72 | 0.3 | 1 | first foot l | 9.8 |
<!-- /mocap:analysis -->

<!-- mocap:intermediates -->
## Intermediates (build/mocap/<slot>.json, Wren 1.68 m, 60 fps)

Format `mocap-intermediate/1`: root track, pelvis, local bind-relative rotations and FK positions of all 23 Wren joints,
contacts, events and phase per frame (the `notes` field in each file). Slide is measured on Wren's de-slid feet (median /
max per contact, cm); seam = the end-to-start mismatch spread over the loop, then the last-to-first frame step against
the typical step. Contact sheets: `build/mocap/sheets/<slot>.svg` / `.png` (side, front, top).

| Slot | Take | Frames | Loop speed m/s | Seam before cm / deg (joint) | Seam step after / typical cm | Slide before -> after cm | Pivot contacts | Leg short cm | Height offset cm |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| walk_loop | 35_01 | 67 | 1.16955 | 1.1 / 12.7 (wrL) | 1 / 1.2 | 2/2.4 -> 1/1.3 | 0 | 0.1 | -1.1 |
| walk_loop_alt | 16_15 | 69 | 1.03005 | 0.2 / 3.8 (neck) | 0.6 / 1.1 | 2.8/3.3 -> 1.1/1.1 | 0 | 0 | -1 |
| jog_loop | 16_36 | 48 | 2.49103 | 0.9 / 9 (wrR) | 1.9 / 2 | 2.6/2.9 -> 0.9/1.2 | 0 | 0 | -0.9 |
| jog_loop_alt | 16_35 | 48 | 2.64621 | 2.6 / 10.6 (toeL) | 2 / 2.2 | 2.2/2.5 -> 0.9/1 | 0 | 0 | -1.9 |
| run_loop | 16_46 | 42 | 3.82459 | 1.6 / 20.1 (knL) | 3.1 / 2.9 | 2/2.4 -> 1.4/1.8 | 0 | 0 | -0.8 |
| run_loop_alt | 16_45 | 43 | 3.72214 | 1.3 / 23.7 (toeL) | 2.7 / 2.9 | 1.9/2 -> 1.2/1.4 | 0 | 0 | -1 |
| walk_turn90_L | 16_18 | 142 | - | - | - | 2.4/3.4 -> 1/1.1 | 0 | 0 | -0.5 |
| walk_turn90_R | 16_19 | 131 | - | - | - | 3.4/4.1 -> 0.8/1.5 | 1 | 0.3 | -1.3 |
| jog_turn90_L | 16_41 | 80 | - | - | - | 1.4/4.6 -> 0.7/0.8 | 0 | 0 | -2.1 |
| jog_turn90_R | 16_44 | 108 | - | - | - | 1.5/1.7 -> 0.7/0.8 | 0 | 0 | -1.9 |
| run_turn90_L | 16_51 | 89 | - | - | - | 1/2.4 -> 0.5/1.1 | 1 | 0 | -1 |
| run_turn90_R | 16_53 | 72 | - | - | - | 1.9/2.7 -> 1/1.4 | 0 | 0 | -4.2 |
| pivot180_L | 69_14 | 192 | - | - | - | 2.1/3.3 -> 4.5/7.8 | 2 | 0 | 0.3 |
| pivot180_R | 69_13 | 214 | - | - | - | 1.8/4.4 -> 0.8/1.1 | 1 | 0.1 | -0.3 |
| walk_stop | 16_34 | 146 | - | - | - | 1.3/1.3 -> 0.8/0.8 | 0 | 0 | -0.1 |
| jog_stop | 16_57 | 131 | - | - | - | 1.9/2.4 -> 0.9/1 | 0 | 0.2 | 0.4 |
| walk_start | 16_31 | 132 | - | - | - | 3.9/3.9 -> 1.2/1.2 | 0 | 0.6 | -0.4 |
| run_start_from_walk | 16_55 | 91 | - | - | - | 1.3/2 -> 1.3/2.1 | 0 | 0.2 | -3.8 |
<!-- /mocap:intermediates -->

<!-- mocap:clips -->
## Clips (build/mocap/clips/, CLIP-FORMAT.md)

Emitted by `emit.mjs` as TS modules matching `src/anim/clips/mocap/<name>.ts` (the job lead moves them into src);
`alt/` holds the runner-up loops, `extra/` the slots the format has no file for yet. Each clip passed the game's
own `keyedClip` (src/anim/keyed.ts). Cycles: 48 frames, phase-warped halves (left strike 0, right 0.5), the root
linear in phase (planted feet fall back at exactly `stride` per cycle), contacts written on the runtime's duty windows.
One-shots: 40 samples per second of take, turns sampled by the turned heading, no `feet` (ignored for one-shots).

- `walk.ts`: walk_loop_alt 16_15 0.525-1.675 s, Wren 1.03 m/s, stride 1.18 m, cycle 1.150 s, R strike at 0.478 of the take cycle (warped to 0.5), duty 0.563 (ankle pinned; the take's contact 0.635), capture lift 15.5 cm (liftH written 0.075: the planner's), half 0.043 (the take's 0.062), knee pole -0.055, game/clip stride 0.98-1.22 over the band, mean pelvis yaw -0.4 deg. keyedClip ok (48 frames, feet); seam step 0.9 cm (median 1.6, max inside 2.3); planted foot vs the moving root: median 0.00 / max 1.02 cm per frame over 52 planted frame pairs.
- `jog.ts`: jog_loop 16_36 0.3-1.092 s, Wren 2.49 m/s, stride 1.99 m, cycle 0.800 s, R strike at 0.500 of the take cycle (warped to 0.5), duty 0.208 (ankle pinned; the take's contact 0.281), capture lift 25.2 cm (liftH written 0.17: the planner's), half 0.080 (the take's 0.035), knee pole -0.09, game/clip stride 0.89-1.10 over the band, mean pelvis yaw -0.4 deg. keyedClip ok (48 frames, feet); seam step 1.9 cm (median 2.0, max inside 2.4); planted foot vs the moving root: median 0.00 / max 0.81 cm per frame over 18 planted frame pairs.
- `run.ts`: run_loop 16_46 0.158-0.85 s, Wren 3.82 m/s, stride 2.68 m, cycle 0.700 s, R strike at 0.500 of the take cycle (warped to 0.5), duty 0.156 (ankle pinned; the take's contact 0.229), capture lift 34.4 cm (liftH written 0.22: the planner's), half 0.070 (the take's 0.018), knee pole -0.03, game/clip stride 0.95-0.97 over the band, mean pelvis yaw -1.8 deg. keyedClip ok (48 frames, feet); seam step 2.7 cm (median 2.6, max inside 3.1); planted foot vs the moving root: median 0.03 / max 0.86 cm per frame over 14 planted frame pairs.
- `turn_in_place.ts`: pivot180_R 69_13 15.5-19.058 s, 47 frames, turned 90.0 deg over 1.18 s of the take. keyedClip ok (47 frames).
- `turn_move_l.ts`: walk_turn90_L 16_18 1.692-4.05 s, 56 frames, turned -86.5 deg over 1.40 s of the take. keyedClip ok (56 frames).
- `turn_move_r.ts`: walk_turn90_R 16_19 1.242-3.408 s, 47 frames, turned 90.0 deg over 1.18 s of the take. keyedClip ok (47 frames).
- `start.ts`: walk_start 16_31 0-2.183 s, 79 frames, 1.95 s. keyedClip ok (79 frames).
- `stop.ts`: walk_stop 16_34 0.458-2.883 s, 85 frames, 2.10 s. keyedClip ok (85 frames).
- `alt/walk.ts`: walk_loop 35_01 1.225-2.342 s, Wren 1.17 m/s, stride 1.31 m, cycle 1.117 s, R strike at 0.478 of the take cycle (warped to 0.5), duty 0.542 (ankle pinned; the take's contact 0.604), capture lift 15.6 cm (liftH written 0.075: the planner's), half 0.043 (the take's 0.063), knee pole -0.055, game/clip stride 0.89-1.10 over the band, mean pelvis yaw 1.4 deg. keyedClip ok (48 frames, feet); seam step 1.3 cm (median 1.6, max inside 2.1); planted foot vs the moving root: median 0.00 / max 1.39 cm per frame over 50 planted frame pairs.
- `alt/jog.ts`: jog_loop_alt 16_35 0.433-1.233 s, Wren 2.65 m/s, stride 2.12 m, cycle 0.800 s, R strike at 0.479 of the take cycle (warped to 0.5), duty 0.219 (ankle pinned; the take's contact 0.292), capture lift 32.4 cm (liftH written 0.17: the planner's), half 0.080 (the take's 0.067), knee pole -0.09, game/clip stride 0.84-1.03 over the band, mean pelvis yaw -1.5 deg. keyedClip ok (48 frames, feet); seam step 2.1 cm (median 2.2, max inside 2.6); planted foot vs the moving root: median 0.01 / max 1.17 cm per frame over 20 planted frame pairs.
- `alt/run.ts`: run_loop_alt 16_45 0.117-0.825 s, Wren 3.72 m/s, stride 2.67 m, cycle 0.717 s, R strike at 0.488 of the take cycle (warped to 0.5), duty 0.156 (ankle pinned; the take's contact 0.240), capture lift 36.1 cm (liftH written 0.22: the planner's), half 0.070 (the take's 0.055), knee pole -0.03, game/clip stride 0.95-0.97 over the band, mean pelvis yaw -1.7 deg. keyedClip ok (48 frames, feet); seam step 2.5 cm (median 2.6, max inside 3.1); planted foot vs the moving root: median 0.01 / max 0.72 cm per frame over 14 planted frame pairs.
- `extra/turn_jog_l.ts`: jog_turn90_L 16_41 0-1.325 s, 39 frames, turned -90.5 deg over 0.97 s of the take. keyedClip ok (39 frames).
- `extra/turn_jog_r.ts`: jog_turn90_R 16_44 0-1.792 s, 59 frames, turned 91.8 deg over 1.48 s of the take. keyedClip ok (59 frames).
- `extra/turn_run_l.ts`: run_turn90_L 16_51 0-1.475 s, 49 frames, turned -87.7 deg over 1.22 s of the take. keyedClip ok (49 frames).
- `extra/turn_run_r.ts`: run_turn90_R 16_53 0-1.183 s, 40 frames, turned 67.7 deg over 1.00 s of the take. keyedClip ok (40 frames).
- `extra/turn_in_place_l.ts`: pivot180_L 69_14 29.483-32.667 s, 69 frames, turned -90.0 deg over 1.73 s of the take. keyedClip ok (69 frames).
- `extra/turnaround_r.ts`: pivot180_R 69_13 15.5-19.058 s, 89 frames, turned 190.4 deg over 2.23 s of the take. keyedClip ok (89 frames).
- `extra/turnaround_l.ts`: pivot180_L 69_14 29.483-32.667 s, 123 frames, turned -224.4 deg over 3.08 s of the take. keyedClip ok (123 frames).
- `extra/stop_jog.ts`: jog_stop 16_57 0.058-2.225 s, 77 frames, 1.90 s. keyedClip ok (77 frames).
- `extra/start_run.ts`: run_start_from_walk 16_55 0-1.5 s, 61 frames, 1.50 s. keyedClip ok (61 frames).
<!-- /mocap:clips -->

<!-- mocap:method -->
## Method and thresholds

- Reader (`asfamc.mjs`): ASF units length 0.45 (metres = value / 0.45 x 0.0254), degrees; per bone C = Euler(axis) in
  the axis order, motion M from the AMC dofs in their order (rx ry rz -> Rz Ry Rx), L = C M C^-1, world W = W_parent L,
  tip = tip_parent + length W direction. Game frame = (-x, y, z) (CMU left is +x). A partial last frame is dropped.
- Contacts: ankle (tibia tip) below its 5th-percentile height + 4.5 cm, or ball (foot tip) below its 5th percentile
  + 3.5 cm, and horizontally slower than 0.7 m/s; gaps under 0.04 s filled, contacts under 0.05 s dropped. Strike = a
  contact starting, toe-off = one ending.
- Cycles: same-foot strike to strike with exactly one other-foot strike between, 0.6-1.5 x the median length; steady
  = speed within 12 % of the take's median cycle speed and heading drift under 10 deg.
- Slide: per contact, the largest horizontal travel of the ankle while the foot is flat (ankle within 2 cm and ball
  within 1.5 cm of their low heights) and of the ball while it is down, from the slowest frame's position. A foot that
  turns over 15 deg while down (a pivot) counts its ball only.
- Seam: RMS distance (cm) of 12 joints between the cycle's first and last frame, pelvis-relative in the heading frame.
- Pops: a joint's local rotation stepping over 8 deg in one frame and over 4x its +-10-frame median. Jitter: the median
  second difference of joint positions (mm per frame^2 at 120 fps; real acceleration included).
- Turns: smoothed pelvis heading (+-0.25 s); the turn spans the peak rate down to 25 % of it each side; the angle is
  measured 0.1 s outside that span. Stops: from the last frame at 90 % of the starting speed to under 0.1 m/s. Starts:
  from over 0.1 m/s to 90 % of the take's top speed.
- Retarget (`retarget.mjs`): each Wren joint takes the world rotation of the CMU bone spanning the same segment
  (pelvis root, spine upperback, chest thorax, neck upperneck, head head, shoulder humerus, elbow radius, wrist hand,
  hip femur, knee tibia, ankle foot, toe toes; the hands ride the wrist) times a fixed rest correction (the shortest arc
  from Wren's bind segment onto the CMU rest direction), so every Wren segment points exactly where the performer's does
  (checked per slot: 0.000 deg) with Wren's lengths. The pelvis follows the performer's hip midpoint x the leg ratio; a
  vertical offset sets the flat foot's ankle at Wren's bind ankle height (6.6 cm). Resampled to 60 fps (slerp).
- Loops: the cycle from a strike to the same foot's next strike, the root moving straight at the cycle's mean velocity,
  the end-to-start mismatch spread linearly over the cycle (pelvis offset and every local rotation), re-phased so frame
  0 is the left strike; the last frame joins frame 0 (no repeated end frame).
- De-slide: per contact, the foot's heading is held while flat (unless it pivots over 15 deg), then the ankle is pinned
  while flat and the ball after heel-off (the ball through a pivot), eased in and out over 4 frames; the leg follows by
  two-bone IK (hip fixed, knee in its plane). Loops are de-slid unrolled over three cycles so a contact across the seam
  stays whole.

## Rerun

Node only (no Blender, no heavy lock needed), from the repo root:

```
node scripts/mocap/asfamc.mjs 16_15 35_01 69_13      # reader self-check on any takes
node scripts/mocap/analyze.mjs                       # analysis -> build/mocap/analysis.json + this file
node scripts/mocap/retarget.mjs                      # intermediates -> build/mocap/<slot>.json
node scripts/mocap/sheets.mjs --png                  # stick contact sheets -> build/mocap/sheets/
node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/emit.mjs   # clips -> build/mocap/clips/
```
<!-- /mocap:method -->

<!-- mocap:m3 -->
## M3 takes: crouch walk / sneak, sprint, strafe, back-to-wall (downloaded 2026-10-23)

GENERATED by `scripts/mocap/m3.mjs` (the same per-take analysis as analyze.mjs, plus the travel direction against
the facing, the crouch drop and the look-arounds). The sections above (analyze / retarget / emit) are unchanged.
Performer size, metres, 120 fps unless marked Wren. Rerun: `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/m3.mjs`.

### Recommended take per game clip

| Game clip | Pick | Runner-up | Usable | Built | Why / notes |
| --- | --- | --- | --- | --- | --- |
| crouch walk loop (fits the crouched sneak, 0.8 m/s) | 136_09 R-strike cycle 4.23-5.51 s (score 4.1) | 136_10 R-strike cycle 6.10-7.41 s (score 4.2) | 1.275 s cycle (loop); 6.99 s bout | `clips/m3/crouch_walk.ts` | 0.87 m/s (Wren 0.84), 1.57 steps/s, stride 1.1 m, direction 5 deg off the facing, crouch drop 14 cm, speed change -4 %, feet gap min 2.7 cm, slide 0 cm, seam 2.8 cm, 0 pops, heading drift 0 deg. Game: sneak 0.8, crouch walk 1.8, crouch run 2.6 m/s; no crouched capture is faster than about 1 m/s, so the crouch walk / run bands would need a stride scale over 2 (only the sneak band fits). Emitted with the capture's own track half (not the walk's 0.0425), the walk's knee pole and planner lift |
| sprint loop (game 5 m/s) | 127_07 R-strike cycle 0.33-1.01 s (score 26.3) | 127_08 R-strike cycle 0.38-1.02 s (score 28.5) | 0.683 s cycle (loop); 1.2 s bout | `clips/m3/sprint.ts` | 4.42 m/s (Wren 4.01), 2.93 steps/s, stride 3.08 m, direction 7 deg off the facing, crouch drop 3.9 cm, speed change 6 %, feet gap min 1.9 cm, slide 1.6 cm, seam 14.4 cm, 3 pops, heading drift -5 deg. The run takes are still accelerating: the loop seam carries the speed change; emitted with the run's track half / knee pole / planner lift (emit.mjs run values) |
| sprint start (from standing) | 127_03 0.1 -> 4.31 m/s, 0.86-2.28 s (score 0) | 127_04 (score 0) | 2.03 s one-shot | `clips/m3/sprint_start.ts` | 1.42 s over 2.24 m, 1 steps, first foot l |
| strafe left (aimed, 0.7 m/s) | 69_59 R-strike cycle 4.63-5.63 s (score 21.8) | 143_40 R-strike cycle 2.56-3.20 s (score 39.2) | 1 s cycle (loop); 2.45 s bout, 3.15 s bout | `clips/m3/strafe_l.ts` | 0.57 m/s (Wren 0.52), 2 steps/s, stride 0.55 m, direction -86 deg off the facing, crouch drop 1 cm, speed change 40 %, feet gap min 8.6 cm, slide 3.3 cm, seam 3.1 cm, 0 pops, heading drift -0.3 deg. Sideways cycle: root turned to the body facing (faceRoot), then its travel onto the x axis (emit.mjs `travel`) |
| strafe right (aimed, 0.7 m/s) | 69_56 L-strike cycle 1.32-2.27 s (score 20.5) | 143_40 L-strike cycle 6.22-6.88 s (score 34) | 0.958 s cycle (loop); 6.03 s bout | `clips/m3/strafe_r.ts` | 0.52 m/s (Wren 0.48), 2.09 steps/s, stride 0.55 m, direction 95 deg off the facing, crouch drop 1.6 cm, speed change 33 %, feet gap min 10.1 cm, slide 2.8 cm, seam 4.1 cm, 0 pops, heading drift 3.1 deg. Sideways cycle: root turned to the body facing (faceRoot), then its travel onto the x axis (emit.mjs `travel`) |
| wall side-step left, standing (0.35 m/s) | 69_59 L-strike cycle 0.03-1.12 s (score 18.6) | 143_40 R-strike cycle 2.56-3.20 s (score 53.1) | 1.083 s cycle (loop); 2.45 s bout, 3.15 s bout | `m3/wall_step_L.json` | 0.49 m/s (Wren 0.45), 1.85 steps/s, stride 0.51 m, direction -78 deg off the facing, crouch drop 1.4 cm, speed change -66 %, feet gap min 11.2 cm, slide 2.5 cm, seam 2.3 cm, 0 pops, heading drift -5.3 deg. Lateral cycle: the clip format has no sideways cycle yet (CLIP-FORMAT cycles travel along +z): intermediate only, root turned to the body facing (faceRoot) |
| wall side-step right, standing (0.35 m/s) | 69_56 L-strike cycle 1.32-2.27 s (score 19.3) | 143_40 L-strike cycle 6.22-6.88 s (score 47.8) | 0.958 s cycle (loop); 6.03 s bout | `m3/wall_step_R.json` | 0.52 m/s (Wren 0.48), 2.09 steps/s, stride 0.55 m, direction 95 deg off the facing, crouch drop 1.6 cm, speed change 33 %, feet gap min 10.1 cm, slide 2.8 cm, seam 4.1 cm, 0 pops, heading drift 3.1 deg. Lateral cycle: the clip format has no sideways cycle yet (CLIP-FORMAT cycles travel along +z): intermediate only, root turned to the body facing (faceRoot) |
| wall side-step left, crouched (0.5 m/s) | 139_15 R-strike cycle 5.35-6.19 s (score 34.5) | 139_14 L-strike cycle 6.18-6.92 s (score 45.2) | 0.842 s cycle (loop); 3 s bout | `m3/wall_crouch_step_L.json` | 0.83 m/s (Wren 0.83), 2.38 steps/s, stride 0.71 m, direction -61 deg off the facing, crouch drop 14.1 cm, speed change 44 %, feet gap min 4.5 cm, slide 3.2 cm, seam 7.8 cm, 0 pops, heading drift 0.9 deg. Lateral cycle: the clip format has no sideways cycle yet (CLIP-FORMAT cycles travel along +z): intermediate only, root turned to the body facing (faceRoot) |
| wall side-step right, crouched (0.5 m/s) | 139_15 L-strike cycle 2.28-3.00 s (score 33.7) | 139_14 R-strike cycle 2.90-3.53 s (score 38.2) | 0.717 s cycle (loop); 2.48 s bout, 1.23 s bout | `m3/wall_crouch_step_R.json` | 0.82 m/s (Wren 0.82), 2.79 steps/s, stride 0.6 m, direction 62 deg off the facing, crouch drop 13.5 cm, speed change 70 %, feet gap min 13.4 cm, slide 3.7 cm, seam 6.3 cm, 0 pops, heading drift -0.6 deg. Lateral cycle: the clip format has no sideways cycle yet (CLIP-FORMAT cycles travel along +z): intermediate only, root turned to the body facing (faceRoot) |
| strafe left / right (jog) | none | - | - | - | no jogging strafe on the site; 127_13 / 127_14 are forward runs with a dodge (see findings): mirror / speed up the walk strafe or keep the procedural strafe |
| wall peek left (stand-in) | 139_04 look L 4.93-6.3 s (score -4.3) | 139_01 5.09-6.56 s (score -4.2) | 1.38 s one-shot | `clips/m3/wall_peek_l.ts` | head -113 deg off the pelvis, chest lean -11 deg sideways / 33 forward, crouch drop 11.2 cm, hips 0.07 m/s, both feet down 100 %. A look-around, not a lean past a corner |
| wall peek right (stand-in) | 139_01 look R 7.49-8.98 s (score -4.5) | 139_04 3.54-5.4 s (score -3.3) | 1.49 s one-shot | `clips/m3/wall_peek_r.ts` | head 112 deg off the pelvis, chest lean 29 deg sideways / 50 forward, crouch drop 13.2 cm, hips 0.05 m/s, both feet down 100 %. A look-around, not a lean past a corner |

Scores: lower is better. Cycles: analyze.mjs's loop score (seam cm + 2 x slide cm + 5 x pops + 0.5 x heading drift
deg + 30 x speed deviation + 20 for a dropout) + 20 x |ln(Wren speed / the game's speed)| (the game's: sneak
0.8, sprint 5, aimed strafe 0.7, wall slide 0.35 standing / 0.5 crouched m/s), plus per clip: crouch walk +2 per cm
of crouch drop under 12 cm (unsteady cycles and cycles under 8 cm dropped); sprint +30 x the speed change across the
cycle (share; cycles under 0.55 s dropped: a missed strike); strafe / side-steps +0.3 per deg the travel is off 90 deg
from the facing, +10 when the feet cross (standing clips take cycles under 8 cm of crouch drop, crouched clips 8 cm or
more). L / R pairs come from one performer where both sides exist. Look-arounds: 0.3 x (90 - |peak head yaw|) + 10 x
hip speed + 15 x (share of frames without both feet down) + 3 per s over 1.5 s + 10 if the head does not come back -
0.5 x the chest lean into the look (up to 10 deg).

### All M3 takes

| Take | Site label | For | Dur s | Gait (plateau m/s) | Cadence steps/s | Stride m | Cycles steady / ok | Slide cm med / max | Pops core / extr | Dropouts | Bouts (s, direction, m/s, crouch drop cm) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 136_09 | Walk Crouched | crouch walk | 9.42 | walk (0.86) | 1.61 | 1.10 | 9 / 9 | 0.0 / 5.1 | 0 / 0 | - | 2.42-9.41 fwd 0.82 (14.5) | start 0.1->0.93 m/s in 3.09 s |
| 136_10 | Walk Crouched | crouch walk | 11.14 | walk (0.81) | 1.52 | 1.09 | 8 / 10 | 0.0 / 0.9 | 3 / 5 | - | 1.63-10.61 fwd 0.75 (13.3) | start 0.1->0.9 m/s in 1.02 s |
| 139_29 | Sneaking | sneak | 17.53 | walk (0.53) | 1.39 | 0.82 | 7 / 20 | 3.3 / 4.2 | 2 / 31 | rtibia 2 | 1.77-2.49 fwd 0.41 (4.8); 2.98-5.71 fwd 0.51 (5); 6.21-9.59 fwd 0.57 (6.9); 10.53-13.46 fwd 0.55 (6.5); 13.82-17.43 fwd 0.69 (5.1) | facing turns 18 / 5 / -59 / -14 / 86 deg over the bouts; start 0.1->0.88 m/s in 3.42 s |
| 139_32 | Sneaking | sneak | 15.78 | walk (0.63) | 2.14 | 0.64 | 0 / 27 | 2.7 / 20.3 | 3 / 25 | - | 1.31-3.54 fwd 0.65 (12.1); 4.08-5.56 fwd 0.67 (11.7); 5.83-8.26 fwd 0.55 (10.4); 8.45-9.44 fwd 0.6 (11.7); 9.87-14.36 fwd 0.57 (9.6); 15.03-15.78 fwd 0.79 (5.4) | facing turns -30 / -30 / -264 / 104 / 67 / -54 deg over the bouts; start 0.1->1.07 m/s in 2.04 s |
| 139_34 | Sneaking | sneak | 9.35 | walk (0.75) | 1.94 | 0.70 | 4 / 4 | 3.2 / 5.1 | 2 / 4 | - | 1.15-3.14 fwd 0.58 (7.6); 5.61-7.74 fwd 0.6 (4.4) | facing turns 1 / 5 deg over the bouts; start 0.1->0.94 m/s in 0.69 s; stop 0.05->0 in 0 s |
| 139_11 | Run To Sneak | sneak | 2.67 | jog (2.09) | 5.22 | 0.94 | 1 / 5 | 2.2 / 3.2 | 1 / 15 | - | 0.64-2.6 fwd 1.79 (7.1) | facing turns -5 deg over the bouts; start 0.14->3.71 m/s in 1.25 s |
| 127_06 | Run | sprint | 1.44 | run (3.96) | 2.99 | 2.70 | 2 / 2 | 0.0 / 2.0 | 4 / 0 | - | 0-1.43 fwd 3.87 (6.8) | top hip speed 4.44 m/s |
| 127_07 | Run | sprint | 1.21 | run (4.42) | 2.93 | 3.08 | 1 / 1 | 0.0 / 1.6 | 6 / 2 | - | 0-1.2 fwd 4.31 (5) | top hip speed 4.62 m/s |
| 127_08 | Run | sprint | 1.16 | run (4.55) | 3.06 | 2.97 | 2 / 2 | 2.2 / 2.5 | 8 / 0 | - | 0-1.15 fwd 4.57 (9.2) | top hip speed 4.95 m/s |
| 143_42 | Run | sprint | 4.47 | run (3.92) | 5.26 | 1.58 | 2 / 10 | 1.1 / 3.1 | 2 / 0 | - | 0.68-2.21 fwd 2.44 (5.6); 2.67-4.26 fwd 2.42 (5.7) | top hip speed 3.91 m/s; start 0.1->4.35 m/s in 0.79 s; stop 0.01->0 in 0 s |
| 127_03 | Run | sprint start | 2.77 | run (3.84) | 3.20 | 2.48 | 1 / 1 | 0.0 / 0.0 | 0 / 0 | - | 1.02-2.76 fwd 2.45 (8) | top hip speed 4.42 m/s; start 0.1->4.31 m/s in 1.42 s |
| 127_04 | Walk to Run | sprint start | 3.72 | jog (2.99) | - | - | 0 / 0 | 0.0 / 2.0 | 0 / 0 | - | 1.48-3.71 fwd 2.1 (6.2) | no clean forward cycle; top hip speed 4.34 m/s; start 0.1->4.06 m/s in 1.89 s |
| 143_40 | Walk Sideways | strafe (walk) | 8.05 | walk (1.31) | 3.00 | 0.89 | 13 / 18 | 1.8 / 5.5 | 4 / 59 | - | 0.46-4.01 L 1.13 (3.3); 4.17-8.04 R 1.08 (3.5) | start 0.11->1.44 m/s in 0.83 s |
| 69_56 | walk sideways and turn (opposite direction) | strafe (walk) | 6.43 | walk (0.52) | 1.98 | 0.55 | 3 / 10 | 1.9 / 3.0 | 0 / 6 | lhand 82, lfingers 82, lthumb 82 | 0.38-6.42 R 0.52 (1.5) | start 0.1->0.7 m/s in 0.63 s |
| 69_59 | walk sideways and turn | strafe (walk) | 5.88 | walk (0.49) | 1.93 | 0.54 | 2 / 10 | 2.5 / 6.4 | 0 / 6 | - | 0-2.45 L 0.48 (1.2); 2.72-5.87 L 0.55 (1.1) |  |
| 127_13 | Run Side Step Left | strafe (run) | 1.54 | jog (3.24) | 3.16 | 1.98 | 1 / 2 | 0.0 / 1.8 | 0 / 2 | - | 0-1.53 fwd 3.33 (10.5) | no clean sideways cycle; travels forward: a run with a sidestep dodge, not a strafe |
| 127_14 | Run Side Step Right | strafe (run) | 1.26 | run (3.67) | 3.43 | 2.38 | 1 / 2 | 2.1 / 3.6 | 0 / 0 | - | 0-1.25 fwd 3.66 (11.3) | no clean sideways cycle; travels forward: a run with a sidestep dodge, not a strafe |
| 139_14 | Sneak Sideways | wall side-step | 8.25 | walk (1.11) | 2.86 | 0.81 | 9 / 18 | 2.4 / 5.4 | 1 / 32 | - | 3.67-4.31 R 0.81 (8.5); 4.99-5.72 diag 0.91 (9.7); 7.04-8.24 L 1.08 (11.1) | facing turns -11 / -6 / 20 deg over the bouts; accel 0.31->1.35 m/s in 1.68 s |
| 139_15 | Sneak Sideways | wall side-step | 8.98 | walk (0.86) | 2.76 | 0.66 | 17 / 21 | 3.2 / 4.5 | 4 / 53 | - | 0.13-2.6 R 0.74 (13.2); 3.39-4.63 R 0.85 (13); 5.98-8.98 L 0.9 (13.1) | facing turns 24 / -13 / 6 deg over the bouts; start 0.1->1.16 m/s in 0.82 s |
| 139_01 | Looking Around | wall peek (stand-in) | 9.08 | walk (0.37) | - | - | 0 / 0 | - / 0.0 | 1 / 6 | - | none | start 0.1->0.43 m/s in 2.22 s; stop 0.02->0 in 0 s (no standstill) |
| 139_04 | Looking Around | wall peek (stand-in) | 7.36 | walk (0.30) | - | - | 0 / 0 | - / 0.0 | 0 / 4 | - | none | start 0.18->0.4 m/s in 3.96 s |

Crouch drop: the performer's standing hip height (the rest skeleton's hip height above its lowest foot point + 5 cm: the rest pose reads 4-7 cm under the standing frames of 16_15, 136_09 and 139_01: subject 136 86.5 cm, subject 139 83.3 cm, subject 127 89.3 cm, subject 143 77.6 cm, subject 69 89 cm) minus the hip height above the floor; standing reads about -2 to 2 cm. Feet gap: the right ankle's offset from the left across the facing (under 0 the feet cross). Wren speed: the performer's x Wren's leg / theirs. Direction: the hip travel over +-0.5 s against the pelvis facing (fwd under 35 deg, L / R 55-125 deg, back over 145 deg, still under 0.25 m/s); bouts hold one class for 0.6 s or more.

### Cycles of the M3 takes

| Take | Cycle | s | T s | Speed (Wren) | Direction (deg vs facing) | Crouch drop cm | Speed change % | Feet gap min cm | Cadence | Stride | Slide cm | Seam cm | Heading drift deg | Pops | Steady | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 136_09 | L | 3.67-4.92 | 1.242 | 0.86 (0.83) | fwd (5) | 13.8 | 4 | 2.7 | 1.61 | 1.14 | 0 | 4 | -1.2 | 0 | yes | 4.6 |
| 136_09 | L | 4.92-6.14 | 1.225 | 0.9 (0.87) | fwd (3) | 14 | 9 | 2.7 | 1.63 | 1.13 | 0 | 2.7 | 2 | 0 | yes | 5.1 |
| 136_09 | L | 6.14-7.40 | 1.258 | 0.85 (0.82) | fwd (3) | 15.7 | -10 | 6.2 | 1.59 | 1.02 | 1.1 | 2.7 | -1.3 | 0 | yes | 5.9 |
| 136_09 | L | 7.40-8.63 | 1.225 | 0.85 (0.82) | fwd (2) | 15.8 | 7 | 5.2 | 1.63 | 1.05 | 5.1 | 2 | 0.1 | 0 | yes | 12.6 |
| 136_09 | R | 2.87-4.23 | 1.367 | 0.78 (0.75) | fwd (6) | 13 | 8 | 4 | 1.46 | 1.12 | 0 | 4.2 | 3.7 | 0 | yes | 8.8 |
| 136_09 | R | 4.23-5.51 | 1.275 | 0.87 (0.84) | fwd (5) | 14 | -4 | 2.7 | 1.57 | 1.1 | 0 | 2.8 | 0 | 0 | yes | 3.1 |
| 136_09 | R | 5.51-6.75 | 1.242 | 0.91 (0.88) | fwd (2) | 14.7 | -4 | 6.8 | 1.61 | 1.11 | 0 | 4.9 | 1.3 | 0 | yes | 7.3 |
| 136_09 | R | 6.75-8.01 | 1.258 | 0.82 (0.79) | fwd (3) | 15.7 | 2 | 6.2 | 1.59 | 1.02 | 1.1 | 3.3 | 1 | 0 | yes | 7.4 |
| 136_09 | R | 8.01-9.23 | 1.225 | 0.86 (0.83) | fwd (1) | 16.6 | -4 | 4.7 | 1.63 | 1.06 | 5.1 | 3.4 | -2.1 | 0 | yes | 14.7 |
| 136_10 | L | 2.78-4.13 | 1.342 | 0.85 (0.82) | fwd (4) | 15.9 | 6 | 8 | 1.49 | 1.15 | 0.9 | 2.7 | 0.3 | 0 | yes | 6.3 |
| 136_10 | L | 4.13-5.45 | 1.325 | 0.91 (0.88) | fwd (3) | 13.7 | 1 | 8 | 1.51 | 1.19 | 0 | 3.1 | 2.8 | 0 | no | 8.4 |
| 136_10 | L | 5.45-6.75 | 1.3 | 0.81 (0.78) | fwd (-1) | 13.7 | 2 | 5.2 | 1.54 | 1.05 | 0 | 3.6 | 0.5 | 0 | yes | 4 |
| 136_10 | L | 6.75-8.07 | 1.325 | 0.75 (0.72) | fwd (1) | 12.6 | 0 | 3.1 | 1.51 | 0.97 | 0 | 1.7 | -1.1 | 0 | yes | 4.3 |
| 136_10 | L | 8.07-9.40 | 1.325 | 0.68 (0.65) | fwd (2) | 15 | 6 | 3 | 1.51 | 0.93 | 0 | 2 | 2.2 | 0 | no | 7.8 |
| 136_10 | R | 2.10-3.47 | 1.367 | 0.8 (0.77) | fwd (3) | 16.4 | 5 | 12 | 1.46 | 1.12 | 0.9 | 3.2 | 0.8 | 0 | yes | 5.6 |
| 136_10 | R | 3.47-4.78 | 1.308 | 0.89 (0.86) | fwd (6) | 15.1 | 2 | 8 | 1.53 | 1.16 | 0 | 2.7 | 0.2 | 0 | yes | 6 |
| 136_10 | R | 4.78-6.10 | 1.325 | 0.85 (0.82) | fwd (0) | 13.4 | -13 | 5.7 | 1.51 | 1.13 | 0 | 4.3 | 3.5 | 0 | yes | 7.7 |
| 136_10 | R | 6.10-7.41 | 1.308 | 0.79 (0.76) | fwd (0) | 13 | -8 | 5.2 | 1.53 | 1 | 0 | 2.2 | 0.9 | 0 | yes | 3.2 |
| 136_10 | R | 7.41-8.72 | 1.308 | 0.71 (0.68) | fwd (2) | 13.7 | -12 | 3 | 1.53 | 0.93 | 0 | 3.5 | -2.2 | 0 | yes | 8.1 |
| 139_29 | L | 2.29-4.23 | 1.942 | 0.38 (0.38) | fwd (-10) | 5.5 | 36 | 19.8 | 1.03 | 0.72 | 4.1 | 5.2 | -6.9 | 0 | no | 45.3 |
| 139_29 | L | 4.23-5.57 | 1.333 | 0.58 (0.58) | fwd (-5) | 4.8 | -13 | 18.5 | 1.5 | 0.85 | 3.2 | 4.9 | 15.4 | 0 | no | 21.8 |
| 139_29 | L | 5.57-7.41 | 1.842 | 0.42 (0.42) | fwd (-12) | 4.9 | 59 | 21.5 | 1.09 | 0.72 | 3.2 | 4.9 | -15.8 | 0 | no | 25.4 |
| 139_29 | L | 7.41-8.85 | 1.442 | 0.56 (0.56) | fwd (5) | 8.8 | 29 | 18.7 | 1.39 | 0.91 | 3.7 | 6.1 | 4.5 | 0 | yes | 17.4 |
| 139_29 | L | 8.85-10.10 | 1.25 | 0.67 (0.67) | fwd (7) | 5.6 | -48 | 21.6 | 1.6 | 0.36 | 3.9 | 11.8 | -135.6 | 0 | no | 95.3 |
| 139_29 | L | 10.10-11.77 | 1.667 | 0.49 (0.49) | fwd (-6) | 7.8 | 48 | 18.3 | 1.2 | 0.76 | 3.7 | 10.7 | -42.1 | 0 | no | 41.4 |
| 139_29 | L | 11.77-13.20 | 1.433 | 0.56 (0.56) | fwd (0) | 5.8 | 2 | 19.6 | 1.4 | 0.8 | 3.6 | 2.9 | 1.5 | 0 | yes | 12.5 |
| 139_29 | L | 13.20-14.93 | 1.725 | 0.56 (0.56) | fwd (-14) | 6.6 | 55 | 22 | 1.16 | 0.96 | 3.7 | 6.5 | -2.4 | 0 | yes | 16.8 |
| 139_29 | L | 14.93-16.23 | 1.308 | 0.81 (0.81) | fwd (-6) | 6.9 | 1 | 19.7 | 1.53 | 1.05 | 4.2 | 6.7 | 7.6 | 0 | no | 34.7 |
| 139_29 | L | 16.23-17.26 | 1.025 | 0.52 (0.52) | fwd (-13) | 2.6 | -21 | 12.8 | 1.95 | 0.61 | 4.2 | 14.9 | 73.4 | 0 | no | 60.6 |
| 139_29 | R | 1.57-3.53 | 1.967 | 0.36 (0.36) | fwd (-5) | 5.4 | -41 | 22.5 | 1.02 | 0.77 | 4.1 | 5.5 | 1.2 | 0 | no | 43.9 |
| 139_29 | R | 3.53-4.89 | 1.358 | 0.52 (0.52) | fwd (-3) | 4.8 | 38 | 19.8 | 1.47 | 0.74 | 4.1 | 6.1 | -4.6 | 0 | yes | 17.2 |
| 139_29 | R | 4.89-6.82 | 1.925 | 0.45 (0.45) | fwd (-12) | 5.5 | -60 | 18.5 | 1.04 | 0.79 | 3.2 | 6.1 | 13.6 | 0 | no | 23.8 |
| 139_29 | R | 6.82-8.12 | 1.3 | 0.52 (0.52) | fwd (-1) | 6.2 | 0 | 21.5 | 1.54 | 0.77 | 3.7 | 13.2 | -5.6 | 0 | yes | 24 |
| 139_29 | R | 8.12-9.65 | 1.533 | 0.64 (0.64) | fwd (5) | 7.7 | -2 | 18.7 | 1.3 | 0.91 | 3.9 | 15.1 | -57.1 | 0 | no | 57.7 |
| 139_29 | R | 9.65-11.07 | 1.417 | 0.14 (0.14) | still (-17) | 7.6 | 153 | 25.4 | 1.41 | 0.83 | 3.9 | 9.9 | -121.5 | 0 | no | 100.5 |
| 139_29 | R | 11.07-12.53 | 1.467 | 0.54 (0.54) | fwd (2) | 5.8 | 8 | 18.3 | 1.36 | 0.82 | 3.3 | 4.8 | -2 | 0 | yes | 13 |
| 139_29 | R | 12.53-14.30 | 1.767 | 0.48 (0.48) | fwd (-8) | 6.1 | -20 | 19.6 | 1.13 | 0.9 | 3.6 | 6.6 | -8.1 | 0 | yes | 20.7 |
| 139_29 | R | 14.30-15.58 | 1.283 | 0.77 (0.77) | fwd (-8) | 6.8 | 14 | 22.8 | 1.56 | 0.97 | 4 | 3.1 | 3.4 | 0 | no | 26.4 |
| 139_29 | R | 15.58-16.82 | 1.233 | 0.78 (0.78) | fwd (-7) | 5.3 | -13 | 17.4 | 1.62 | 0.54 | 4.2 | 14.6 | 40 | 0 | no | 57.2 |
| 139_32 | L | 1.73-2.61 | 0.875 | 0.72 (0.72) | fwd (9) | 12.6 | 19 | 8.9 | 2.29 | 0.46 | 3.4 | 11.1 | -80.6 | 0 | no | 62.5 |
| 139_32 | L | 2.61-3.60 | 0.992 | 0.89 (0.89) | fwd (-20) | 12.3 | -4 | 1.3 | 2.02 | 0.98 | 5.7 | 8.9 | 60.4 | 0 | no | 62.9 |
| 139_32 | L | 3.60-4.70 | 1.1 | 0.42 (0.42) | fwd (-29) | 11.3 | -31 | 16.1 | 1.82 | 0.82 | 5.7 | 6.5 | 69.9 | 0 | no | 62.9 |
| 139_32 | L | 4.70-5.65 | 0.95 | 0.91 (0.91) | fwd (-5) | 12.1 | 26 | 24.5 | 2.11 | 0.3 | 4.8 | 9 | -67.6 | 0 | no | 65.7 |
| 139_32 | L | 5.65-6.69 | 1.042 | 0.78 (0.78) | fwd (23) | 10.6 | 37 | 11.4 | 1.92 | 0.39 | 2.5 | 6.6 | -105.2 | 1 | no | 76.3 |
| 139_32 | L | 6.69-7.51 | 0.817 | 0.73 (0.73) | fwd (16) | 10.4 | 11 | 13.3 | 2.45 | 0.36 | 5 | 5.4 | -95.9 | 0 | no | 68.1 |
| 139_32 | L | 9.36-10.25 | 0.892 | 0.5 (0.5) | fwd (-32) | 11.1 | -44 | 19.1 | 2.24 | 0.82 | 3 | 8.5 | 82.1 | 0 | no | 61.7 |
| 139_32 | L | 10.25-11.18 | 0.933 | 0.57 (0.57) | fwd (-18) | 8.7 | -8 | 17.3 | 2.14 | 0.64 | 2.6 | 8.6 | 72.3 | 0 | no | 52.8 |
| 139_32 | L | 11.18-11.97 | 0.783 | 0.63 (0.63) | fwd (-25) | 9.5 | 4 | 8.7 | 2.55 | 0.76 | 3 | 3.5 | 75.2 | 0 | no | 47.1 |
| 139_32 | L | 11.97-12.72 | 0.758 | 0.45 (0.45) | fwd (-21) | 10.6 | 15 | 16.3 | 2.64 | 0.59 | 3 | 7.8 | 35.1 | 0 | no | 39.9 |
| 139_32 | L | 12.72-13.65 | 0.925 | 0.72 (0.72) | fwd (12) | 8.9 | 12 | 11.5 | 2.16 | 0.33 | 3.3 | 5.2 | -73.4 | 0 | no | 52.8 |
| 139_32 | L | 13.65-14.46 | 0.808 | 0.67 (0.67) | fwd (19) | 10.5 | 3 | 15.3 | 2.47 | 0.22 | 2.9 | 9.9 | -71.1 | 0 | no | 53.2 |
| 139_32 | L | 14.46-15.73 | 1.275 | 0.62 (0.62) | fwd (-7) | 8.6 | 98 | 29.9 | 1.57 | 0.5 | 2.9 | 28.9 | -53.9 | 1 | no | 67.1 |
| 139_32 | R | 1.19-2.21 | 1.017 | 0.57 (0.57) | fwd (16) | 11.4 | 0 | 8.9 | 1.97 | 0.68 | 3.4 | 14 | -41.1 | 0 | no | 44.2 |
| 139_32 | R | 2.21-3.10 | 0.892 | 0.55 (0.55) | fwd (-4) | 13 | 61 | 10.6 | 2.24 | 0.74 | 5.3 | 7.4 | -29.1 | 0 | no | 36.4 |
| 139_32 | R | 3.10-4.03 | 0.925 | 1.01 (1.01) | diag (-36) | 11.5 | 3 | 1.3 | 2.16 | 0.41 | 5.7 | 7.1 | 97.3 | 0 | no | 85.2 |
| 139_32 | R | 4.03-5.29 | 1.267 | 0.68 (0.68) | fwd (-19) | 11.6 | 30 | 16.1 | 1.58 | 0.9 | 4.9 | 7.7 | 12.4 | 0 | no | 26.1 |
| 139_32 | R | 5.29-6.28 | 0.992 | 0.47 (0.47) | fwd (22) | 11 | -41 | 11.4 | 2.02 | 0.9 | 4.4 | 4.5 | -118.6 | 0 | no | 80.2 |
| 139_32 | R | 6.28-7.17 | 0.883 | 0.56 (0.56) | fwd (19) | 10.3 | -37 | 13.3 | 2.26 | 0.71 | 2.7 | 6.2 | -97.3 | 1 | no | 68.6 |
| 139_32 | R | 7.17-8.04 | 0.875 | 0.51 (0.51) | fwd (18) | 10.4 | 20 | 17.2 | 2.29 | 0.74 | 20.3 | 8 | -99.7 | 0 | no | 104.2 |
| 139_32 | R | 8.74-9.68 | 0.942 | 0.95 (0.95) | fwd (-25) | 12.2 | 26 | 10.4 | 2.12 | 0.33 | 20.3 | 6.4 | 120.4 | 0 | no | 122.4 |
| 139_32 | R | 9.68-10.65 | 0.967 | 0.67 (0.67) | fwd (-22) | 9.7 | 20 | 19.1 | 2.07 | 0.37 | 2.6 | 7.6 | 61.4 | 0 | no | 45.4 |
| 139_32 | R | 10.65-11.47 | 0.817 | 0.76 (0.76) | fwd (-20) | 9.2 | 7 | 17.3 | 2.45 | 0.32 | 2.8 | 7.5 | 73.5 | 0 | no | 56 |
| 139_32 | R | 11.47-12.28 | 0.808 | 0.81 (0.81) | fwd (-25) | 9 | -9 | 8.7 | 2.47 | 0.31 | 3 | 2.5 | 83.3 | 0 | no | 58.7 |
| 139_32 | R | 12.28-13.27 | 0.992 | 0.62 (0.62) | fwd (-5) | 10.2 | -5 | 11.5 | 2.02 | 0.73 | 3.3 | 9 | -37 | 0 | no | 34.6 |
| 139_32 | R | 13.27-14.22 | 0.95 | 0.49 (0.49) | fwd (19) | 9.5 | -19 | 15.3 | 2.11 | 0.65 | 3.3 | 6.3 | -79.9 | 0 | no | 59.5 |
| 139_32 | R | 14.22-15.40 | 1.183 | 0.29 (0.29) | fwd (-7) | 11.2 | 89 | 29.4 | 1.69 | 0.7 | 2.9 | 10.6 | -60.3 | 1 | no | 67.7 |
| 139_34 | L | 1.43-2.46 | 1.025 | 0.78 (0.78) | fwd (0) | 8.9 | 8 | 22.7 | 1.95 | 0.83 | 5.1 | 3.8 | 0.1 | 0 | yes | 15.5 |
| 139_34 | L | 5.93-7.11 | 1.175 | 0.75 (0.75) | fwd (-3) | 4.2 | 2 | 18.5 | 1.7 | 0.95 | 3.4 | 5 | -0.1 | 0 | yes | 12.1 |
| 139_34 | R | 1.99-2.99 | 1 | 0.67 (0.67) | fwd (-1) | 7.3 | -39 | 22.7 | 2 | 0.51 | 5.1 | 9.3 | 4 | 0 | yes | 24.5 |
| 139_34 | R | 6.53-7.58 | 1.042 | 0.74 (0.74) | fwd (-8) | 5.1 | 4 | 18.5 | 1.92 | 0.56 | 3.4 | 12.4 | 9 | 0 | yes | 23.9 |
| 139_11 | L | 1.21-1.64 | 0.433 | 4.12 (4.11) | fwd (1) | 7.8 | -7 | 16.8 | 4.62 | 1.99 | 2.1 | 28.3 | 3.6 | 0 | no | 63.4 |
| 139_11 | L | 1.64-2.02 | 0.383 | 2.09 (2.08) | fwd (-1) | 7 | -52 | 12.9 | 5.22 | 0.94 | 3.2 | 16.3 | -3.2 | 0 | yes | 24.3 |
| 139_11 | L | 2.02-2.62 | 0.592 | 0.71 (0.71) | fwd (8) | 8.1 | -21 | 37.3 | 3.38 | 0.19 | 3.2 | 13.3 | -10 | 0 | no | 44.5 |
| 139_11 | R | 1.43-1.80 | 0.367 | 3.45 (3.44) | fwd (-3) | 6 | -38 | 12.9 | 5.45 | 1.39 | 2.2 | 21.1 | 0 | 0 | no | 45 |
| 139_11 | R | 1.80-2.33 | 0.533 | 1.24 (1.24) | fwd (1) | 7.3 | -62 | 13.4 | 3.75 | 0.53 | 3.2 | 21.2 | -4.5 | 0 | no | 42.1 |
| 127_06 | L | 0.57-1.23 | 0.65 | 4.22 (3.83) | fwd (7) | 5 | 7 | 1 | 3.08 | 2.79 | 0 | 13.6 | 1.1 | 4 | yes | 36.1 |
| 127_06 | R | 0.20-0.89 | 0.692 | 3.7 (3.35) | fwd (7) | 8.3 | 19 | 0.9 | 2.89 | 2.61 | 2 | 13.4 | 0 | 4 | yes | 39.4 |
| 127_07 | R | 0.33-1.01 | 0.683 | 4.42 (4.01) | fwd (7) | 3.9 | 6 | 1.9 | 2.93 | 3.08 | 1.6 | 14.4 | -5 | 3 | yes | 35.1 |
| 127_08 | L | 0.04-0.70 | 0.658 | 4.29 (3.89) | fwd (5) | 11.3 | 16 | -0.8 | 3.04 | 2.75 | 2.5 | 13.7 | -0.9 | 6 | yes | 50.8 |
| 127_08 | R | 0.38-1.02 | 0.65 | 4.8 (4.35) | fwd (7) | 7.7 | 8 | -0.8 | 3.08 | 3.19 | 2.2 | 15.8 | -2.8 | 4 | yes | 43.3 |
| 143_42 | L | 1.52-1.92 | 0.392 | 4.51 (4.77) | fwd (5) | 4 | 2 | 1.9 | 5.11 | 1.89 | 1.3 | 9.6 | -6.6 | 0 | no | 20.1 |
| 143_42 | L | 1.92-2.17 | 0.258 | 3.42 (3.62) | fwd (18) | 6.3 | -23 | 4.5 | 7.74 | 0.91 | 0.8 | 21.2 | -21.1 | 0 | no | 37.1 |
| 143_42 | L | 2.17-2.66 | 0.483 | 0.69 (0.73) | fwd (13) | 7.1 | -114 | 1.1 | 4.14 | 0.06 | 3.1 | 19.9 | -106.3 | 0 | no | 104 |
| 143_42 | L | 2.66-3.15 | 0.492 | 3.44 (3.64) | fwd (-7) | 6 | 46 | -0.4 | 4.07 | 1.74 | 2.1 | 13.8 | -49.3 | 0 | no | 46.3 |
| 143_42 | L | 3.15-3.53 | 0.383 | 4.56 (4.83) | fwd (5) | 6.4 | -8 | 5.3 | 5.22 | 1.94 | 1.1 | 16.2 | 1 | 0 | no | 23.8 |
| 143_42 | L | 3.53-3.79 | 0.258 | 2.49 (2.64) | fwd (-2) | 6.9 | -63 | 10.4 | 7.74 | 0.56 | 1.1 | 11.3 | 8.6 | 0 | no | 28.7 |
| 143_42 | R | 1.27-1.73 | 0.458 | 3.98 (4.21) | fwd (1) | 5.4 | 22 | 0.6 | 4.36 | 1.78 | 1.3 | 12.4 | -5.1 | 2 | yes | 28 |
| 143_42 | R | 1.73-2.10 | 0.375 | 4.15 (4.39) | fwd (11) | 4.3 | -20 | 1.9 | 5.33 | 1.71 | 0.7 | 25.7 | -18 | 0 | no | 37.9 |
| 143_42 | R | 2.94-3.35 | 0.408 | 4.51 (4.77) | fwd (5) | 4.9 | 9 | 2 | 4.9 | 1.86 | 0.7 | 8.8 | -8 | 0 | no | 18.8 |
| 143_42 | R | 3.35-3.67 | 0.325 | 3.85 (4.08) | fwd (2) | 7.4 | -32 | 5.3 | 6.15 | 1.38 | 1.1 | 18.2 | 4.8 | 0 | yes | 23.3 |
| 127_03 | L | 1.97-2.59 | 0.625 | 3.84 (3.48) | fwd (6) | 9.1 | 23 | 1.5 | 3.2 | 2.48 | 0 | 15.5 | -0.3 | 0 | yes | 15.7 |
| 127_04 | none: no full stride with clean contacts | | | | | | | | | | | | | | | |
| 143_40 | L | 0.83-1.53 | 0.7 | 1.2 (1.27) | L (-105) | 3.8 | 17 | -23.8 | 2.86 | 0.86 | 4.7 | 4.6 | 12 | 2 | no | 32.5 |
| 143_40 | L | 1.53-2.19 | 0.658 | 1.44 (1.52) | L (-109) | 3.3 | -9 | -29.7 | 3.04 | 1.02 | 4.7 | 3.7 | -0.9 | 0 | yes | 16.5 |
| 143_40 | L | 2.19-2.87 | 0.675 | 1.41 (1.49) | L (-111) | 2.9 | -10 | -24.9 | 2.96 | 0.88 | 1.8 | 3.1 | 4.1 | 0 | yes | 11 |
| 143_40 | L | 2.87-3.53 | 0.667 | 1.41 (1.49) | L (-106) | 2.9 | -2 | -25.7 | 3 | 1.01 | 1.8 | 3.6 | -8 | 0 | yes | 13.5 |
| 143_40 | L | 4.84-5.56 | 0.717 | 1.33 (1.41) | R (99) | 3.2 | 9 | -27.8 | 2.79 | 0.93 | 1.6 | 4.3 | -6.2 | 1 | yes | 16.1 |
| 143_40 | L | 5.56-6.22 | 0.667 | 1.32 (1.4) | R (104) | 2.9 | 3 | -28.6 | 3 | 0.89 | 1.9 | 1.6 | -3 | 0 | yes | 7.1 |
| 143_40 | L | 6.22-6.88 | 0.658 | 1.3 (1.38) | R (101) | 3.3 | 10 | -26.7 | 3.04 | 0.84 | 1.9 | 1.1 | 3.9 | 0 | yes | 7.1 |
| 143_40 | L | 6.88-7.54 | 0.658 | 1.14 (1.21) | R (99) | 4.1 | -13 | -25 | 3.04 | 0.72 | 3.3 | 4.2 | 3.8 | 0 | no | 16.6 |
| 143_40 | L | 7.54-7.97 | 0.433 | 0.45 (0.48) | R (94) | 5.3 | -78 | -16.1 | 4.62 | 0.06 | 4.3 | 8.7 | 7.7 | 0 | no | 40.8 |
| 143_40 | R | 1.22-1.88 | 0.658 | 1.39 (1.47) | L (-110) | 3.6 | 13 | -29.3 | 3.04 | 0.96 | 4.7 | 3.9 | 0.9 | 0 | yes | 15.6 |
| 143_40 | R | 1.88-2.56 | 0.683 | 1.42 (1.5) | L (-109) | 2.9 | 2 | -29.7 | 2.93 | 0.94 | 4.7 | 3.5 | 3.1 | 0 | yes | 17 |
| 143_40 | R | 2.56-3.20 | 0.642 | 1.38 (1.46) | L (-110) | 2.9 | 7 | -24.9 | 3.12 | 0.89 | 1.8 | 2.1 | -2.4 | 0 | yes | 8.5 |
| 143_40 | R | 3.20-3.88 | 0.683 | 1.18 (1.25) | L (-97) | 3.3 | -32 | -25.7 | 2.93 | 0.69 | 5.5 | 10.9 | -12.6 | 0 | no | 31.2 |
| 143_40 | R | 4.47-5.18 | 0.708 | 1.22 (1.29) | R (95) | 3.3 | 5 | -25.6 | 2.82 | 0.87 | 5.5 | 5.1 | -9.2 | 0 | yes | 22.8 |
| 143_40 | R | 5.18-5.88 | 0.7 | 1.36 (1.44) | R (102) | 2.8 | -8 | -28.6 | 2.86 | 0.91 | 1.9 | 3.9 | -9.4 | 1 | yes | 18.5 |
| 143_40 | R | 5.88-6.54 | 0.658 | 1.29 (1.37) | R (103) | 3 | -8 | -26.7 | 3.04 | 0.86 | 1.9 | 2.3 | 2.2 | 0 | yes | 7.7 |
| 143_40 | R | 6.54-7.19 | 0.65 | 1.3 (1.38) | R (100) | 3.7 | -12 | -25 | 3.08 | 0.84 | 3.3 | 1.7 | 1.6 | 0 | yes | 9.3 |
| 143_40 | R | 7.19-7.77 | 0.575 | 0.91 (0.96) | R (97) | 4.6 | -58 | -16.1 | 3.48 | 0.31 | 4.3 | 12.2 | 4.1 | 0 | no | 32 |
| 69_56 | L | 1.32-2.27 | 0.958 | 0.52 (0.48) | R (95) | 1.6 | 33 | 10.1 | 2.09 | 0.55 | 2.8 | 4.1 | 3.1 | 0 | yes | 11.5 |
| 69_56 | L | 2.27-3.32 | 1.042 | 0.45 (0.41) | R (85) | 1.1 | 47 | 10.6 | 1.92 | 0.58 | 2.7 | 4.5 | 46.2 | 0 | no | 36.8 |
| 69_56 | L | 3.32-4.28 | 0.958 | 0.47 (0.43) | R (73) | 1 | 51 | 12.3 | 2.09 | 0.56 | 2.7 | 4.1 | 46.6 | 0 | no | 35.4 |
| 69_56 | L | 4.28-5.30 | 1.025 | 0.6 (0.55) | R (79) | 1.8 | 49 | 10.9 | 1.95 | 0.64 | 2 | 5.3 | 1 | 0 | no | 14.8 |
| 69_56 | L | 5.30-6.31 | 1.008 | 0.55 (0.51) | R (87) | 2.3 | 34 | 9.9 | 1.98 | 0.53 | 3 | 3.4 | -4.1 | 0 | yes | 13.5 |
| 69_56 | R | 0.71-1.79 | 1.083 | 0.51 (0.47) | R (95) | 1.3 | -34 | 10.1 | 1.85 | 0.56 | 2.8 | 6.3 | 7.9 | 0 | yes | 16.1 |
| 69_56 | R | 1.79-2.79 | 1 | 0.48 (0.44) | R (94) | 1.4 | -42 | 10.6 | 2 | 0.5 | 2.8 | 4.4 | 19.6 | 0 | no | 21.8 |
| 69_56 | R | 2.79-3.77 | 0.983 | 0.46 (0.42) | R (77) | 1.1 | -49 | 12.4 | 2.03 | 0.54 | 2.7 | 2.8 | 52.4 | 0 | no | 37.6 |
| 69_56 | R | 3.77-4.79 | 1.017 | 0.53 (0.49) | R (73) | 1.2 | -34 | 10.9 | 1.97 | 0.62 | 2.7 | 4 | 22.4 | 0 | no | 21.5 |
| 69_56 | R | 4.79-5.79 | 1 | 0.6 (0.55) | R (83) | 2 | -54 | 9.9 | 2 | 0.6 | 3 | 2.6 | -4.7 | 0 | no | 15.9 |
| 69_59 | L | 0.03-1.12 | 1.083 | 0.49 (0.45) | L (-78) | 1.4 | -66 | 11.2 | 1.85 | 0.51 | 2.5 | 2.3 | -5.3 | 0 | yes | 10 |
| 69_59 | L | 1.12-2.13 | 1.008 | 0.43 (0.39) | L (-70) | 1 | -91 | 13.2 | 1.98 | 0.46 | 4.1 | 4.8 | -40.2 | 0 | no | 36.8 |
| 69_59 | L | 2.13-3.13 | 1.008 | 0.42 (0.39) | L (-62) | 1.1 | -48 | 13.7 | 1.98 | 0.55 | 5.1 | 4.8 | -49.4 | 0 | no | 44 |
| 69_59 | L | 3.13-4.13 | 1 | 0.54 (0.5) | L (-78) | 1 | -37 | 10 | 2 | 0.58 | 6.4 | 4 | 9.8 | 0 | yes | 24.8 |
| 69_59 | L | 4.13-5.15 | 1.017 | 0.59 (0.54) | L (-84) | 1.1 | -40 | 8.6 | 1.97 | 0.58 | 6.4 | 2.3 | -0.7 | 0 | no | 21.6 |
| 69_59 | R | 0.60-1.68 | 1.075 | 0.46 (0.42) | L (-73) | 1.1 | 59 | 11.2 | 1.86 | 0.54 | 4.1 | 3.6 | -23.5 | 0 | no | 25.4 |
| 69_59 | R | 1.68-2.67 | 1 | 0.39 (0.36) | L (-64) | 0.9 | 60 | 13.2 | 2 | 0.46 | 5.1 | 4.6 | -55.4 | 0 | no | 48.6 |
| 69_59 | R | 2.67-3.63 | 0.95 | 0.49 (0.45) | L (-71) | 1.2 | 51 | 12.2 | 2.11 | 0.55 | 5.1 | 5.6 | -10.7 | 0 | no | 21.2 |
| 69_59 | R | 3.63-4.63 | 1 | 0.58 (0.53) | L (-82) | 1.2 | 51 | 10 | 2 | 0.6 | 6.4 | 2.8 | 6 | 0 | no | 24.1 |
| 69_59 | R | 4.63-5.63 | 1 | 0.57 (0.52) | L (-86) | 1 | 40 | 8.6 | 2 | 0.55 | 3.3 | 3.1 | -0.3 | 0 | no | 14.7 |
| 127_13 | L | 0.70-1.36 | 0.658 | 3.35 (3.04) | fwd (2) | 10.6 | 22 | 5.8 | 3.04 | 2.41 | 1.8 | 18.7 | 10.8 | 0 | no | 28.8 |
| 127_13 | R | 0.36-0.99 | 0.633 | 3.12 (2.83) | fwd (2) | 10.5 | -9 | 27.9 | 3.16 | 1.98 | 0 | 20.6 | -2.6 | 0 | yes | 23 |
| 127_14 | L | 0.24-0.76 | 0.517 | 3.57 (3.24) | fwd (5) | 11.8 | 12 | -13.6 | 3.87 | 2 | 2.5 | 24 | 18.9 | 0 | no | 39.2 |
| 127_14 | R | 0.46-1.04 | 0.583 | 3.76 (3.41) | fwd (4) | 11.3 | 2 | -13.6 | 3.43 | 2.38 | 3.6 | 26 | -2.7 | 0 | yes | 35.3 |
| 139_14 | L | 1.23-1.90 | 0.675 | 0.95 (0.95) | R (59) | 12.1 | 46 | -9.7 | 2.96 | 0.81 | 3 | 6.3 | 12.2 | 0 | no | 22.6 |
| 139_14 | L | 1.90-2.58 | 0.683 | 1.3 (1.3) | R (56) | 10.9 | 7 | -10.4 | 2.93 | 0.8 | 3.2 | 5.4 | -3.2 | 0 | no | 18.7 |
| 139_14 | L | 2.58-3.23 | 0.642 | 1.14 (1.14) | R (55) | 10.2 | 24 | 4.2 | 3.12 | 0.67 | 2.1 | 4.6 | -6.5 | 0 | yes | 13 |
| 139_14 | L | 3.23-3.92 | 0.7 | 1.18 (1.18) | R (62) | 9.1 | 25 | -10.2 | 2.86 | 0.94 | 2.4 | 6.7 | 2.2 | 0 | yes | 14.6 |
| 139_14 | L | 3.92-4.62 | 0.692 | 0.52 (0.52) | R (124) | 8 | -31 | -10.5 | 2.89 | 0.74 | 2.4 | 30.5 | -36.4 | 0 | no | 69.4 |
| 139_14 | L | 4.62-5.29 | 0.675 | 0.67 (0.67) | L (-61) | 9 | 14 | 15.5 | 2.96 | 0.79 | 3.9 | 18.2 | -17 | 0 | no | 46.3 |
| 139_14 | L | 5.29-6.18 | 0.892 | 1.05 (1.05) | diag (-52) | 10 | -35 | -10.2 | 2.24 | 0.87 | 3.9 | 8.3 | -8.4 | 0 | yes | 21.8 |
| 139_14 | L | 6.18-6.92 | 0.733 | 0.9 (0.9) | L (-57) | 9.9 | -30 | 15.6 | 2.73 | 0.73 | 4.1 | 5.2 | 9.1 | 0 | no | 23.5 |
| 139_14 | L | 6.92-7.62 | 0.7 | 1.22 (1.22) | L (-65) | 11.6 | -36 | -3.7 | 2.86 | 0.81 | 5.4 | 7 | 2.5 | 0 | yes | 22.2 |
| 139_14 | R | 1.48-2.22 | 0.742 | 1.19 (1.19) | R (57) | 11.9 | -2 | -10.4 | 2.7 | 0.97 | 3.2 | 7.6 | 4.9 | 0 | yes | 18.8 |
| 139_14 | R | 2.22-2.90 | 0.683 | 1.18 (1.18) | R (56) | 10.6 | -31 | 4.5 | 2.93 | 0.73 | 3.2 | 5.5 | 0 | 0 | yes | 13.9 |
| 139_14 | R | 2.90-3.53 | 0.633 | 1.12 (1.12) | R (60) | 9.5 | -27 | 3.4 | 3.16 | 0.73 | 2.4 | 4.3 | -7.2 | 0 | yes | 13.1 |
| 139_14 | R | 3.53-4.19 | 0.658 | 1.13 (1.13) | R (68) | 8.8 | -46 | -10.5 | 3.04 | 0.57 | 2.4 | 11.3 | -2.6 | 0 | yes | 18.1 |
| 139_14 | R | 4.19-4.91 | 0.717 | 0.47 (0.47) | diag (-136) | 7.6 | 26 | 16.1 | 2.79 | 0.5 | 2.4 | 24.6 | -41.6 | 0 | no | 67.4 |
| 139_14 | R | 4.91-5.79 | 0.883 | 0.92 (0.92) | diag (-49) | 9.6 | 47 | -9 | 2.26 | 1 | 3.9 | 10.5 | -9.4 | 0 | no | 28 |
| 139_14 | R | 5.79-6.60 | 0.808 | 0.94 (0.94) | diag (-54) | 10.1 | 24 | -10.2 | 2.47 | 0.58 | 3.8 | 9.6 | -0.1 | 0 | no | 21.7 |
| 139_14 | R | 6.60-7.36 | 0.758 | 1.09 (1.09) | L (-62) | 11.1 | 46 | -3.3 | 2.64 | 0.88 | 4.1 | 8.5 | 3.4 | 0 | yes | 18.8 |
| 139_14 | R | 7.36-8.01 | 0.65 | 1.12 (1.12) | L (-81) | 11.3 | 4 | -3.7 | 3.08 | 0.54 | 5.4 | 14.2 | 20.6 | 0 | no | 35.7 |
| 139_15 | L | 0.88-1.56 | 0.683 | 0.91 (0.91) | R (65) | 13.2 | 43 | 16.2 | 2.93 | 0.67 | 4.5 | 3.3 | 7 | 0 | yes | 17.5 |
| 139_15 | L | 1.56-2.28 | 0.725 | 0.82 (0.82) | R (66) | 12 | 48 | 13.8 | 2.76 | 0.67 | 4.2 | 5.1 | 4.8 | 0 | yes | 17.3 |
| 139_15 | L | 2.28-3.00 | 0.717 | 0.82 (0.82) | R (62) | 13.5 | 70 | 13.4 | 2.79 | 0.6 | 3.7 | 6.3 | -0.6 | 0 | yes | 15.4 |
| 139_15 | L | 3.00-3.74 | 0.742 | 0.89 (0.89) | R (65) | 11.7 | 49 | 12 | 2.7 | 0.6 | 3.9 | 7.1 | -5.2 | 0 | yes | 18.5 |
| 139_15 | L | 3.74-4.39 | 0.65 | 0.92 (0.92) | R (78) | 13.1 | 28 | 11.6 | 3.08 | 0.45 | 4 | 8 | -7.1 | 1 | yes | 26.6 |
| 139_15 | L | 4.39-5.04 | 0.65 | 0.55 (0.55) | back (148) | 12.5 | 32 | 25.1 | 3.08 | 0.75 | 3 | 18.4 | -28.4 | 0 | no | 49.4 |
| 139_15 | L | 5.04-5.70 | 0.658 | 0.58 (0.58) | L (-86) | 12.9 | -12 | 14.3 | 3.04 | 0.66 | 3.2 | 14.8 | -10.9 | 0 | no | 36.4 |
| 139_15 | L | 5.70-6.48 | 0.783 | 0.91 (0.91) | L (-59) | 13.9 | -38 | 3.2 | 2.55 | 0.69 | 3.2 | 4.6 | 4.4 | 0 | yes | 14.9 |
| 139_15 | L | 6.48-7.32 | 0.833 | 0.92 (0.92) | L (-66) | 13 | -43 | -8.3 | 2.4 | 0.75 | 3.2 | 2.5 | 4.3 | 0 | yes | 13.1 |
| 139_15 | L | 7.32-8.04 | 0.725 | 0.79 (0.79) | L (-72) | 12.2 | -62 | 7.4 | 2.76 | 0.55 | 4.2 | 5.4 | -5.9 | 2 | yes | 29.2 |
| 139_15 | L | 8.04-8.82 | 0.775 | 0.9 (0.9) | L (-67) | 13.5 | -47 | -1.4 | 2.58 | 0.84 | 4.2 | 10.3 | 5.3 | 0 | yes | 22.7 |
| 139_15 | R | 1.14-1.87 | 0.725 | 0.91 (0.91) | R (65) | 12.2 | -86 | 15.8 | 2.76 | 0.58 | 4.5 | 5.4 | 5.8 | 0 | yes | 19 |
| 139_15 | R | 1.87-2.59 | 0.725 | 0.79 (0.79) | R (65) | 13.1 | -90 | 13.4 | 2.76 | 0.62 | 4.2 | 5.7 | 6 | 0 | yes | 19.5 |
| 139_15 | R | 2.59-3.33 | 0.742 | 0.86 (0.86) | R (60) | 12.6 | -62 | 15 | 2.7 | 0.66 | 3.9 | 5 | -6.7 | 0 | yes | 16.2 |
| 139_15 | R | 3.33-4.01 | 0.675 | 0.95 (0.95) | R (69) | 11.9 | -69 | 11.6 | 2.96 | 0.66 | 4 | 4.3 | -1.3 | 1 | yes | 21.1 |
| 139_15 | R | 4.01-4.61 | 0.6 | 0.79 (0.79) | R (88) | 14.1 | -129 | 25.1 | 3.33 | 0.28 | 4 | 9 | -12.6 | 0 | no | 25.7 |
| 139_15 | R | 4.61-5.35 | 0.742 | 0.58 (0.58) | back (-157) | 11.8 | -5 | 16.3 | 2.7 | 0.44 | 3 | 22.4 | -31.9 | 0 | no | 54.1 |
| 139_15 | R | 5.35-6.19 | 0.842 | 0.83 (0.83) | L (-61) | 14.1 | 44 | 4.5 | 2.38 | 0.71 | 3.2 | 7.8 | 0.9 | 0 | yes | 15.7 |
| 139_15 | R | 6.19-7.03 | 0.842 | 0.92 (0.92) | L (-64) | 13.1 | 29 | -8.1 | 2.38 | 0.79 | 3 | 4.7 | 7 | 0 | yes | 16.3 |
| 139_15 | R | 7.03-7.80 | 0.767 | 0.83 (0.83) | L (-70) | 12.1 | 23 | -8.3 | 2.61 | 0.56 | 3.2 | 7.6 | -4.4 | 2 | yes | 27.2 |
| 139_15 | R | 7.80-8.50 | 0.7 | 0.87 (0.87) | L (-70) | 12.7 | 51 | -0.8 | 2.86 | 0.67 | 4.2 | 7.2 | 0 | 0 | yes | 15.9 |

### Look-arounds (wall peek stand-ins)

| Take | Side | s | Peak head yaw deg | Chest lean sideways / forward deg | Crouch drop cm | Hip speed m/s | Both feet down | Head back | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 139_01 | L | 0.69-2.04 | -76 | -18 / 65 | 20.1 | 0.14 | 0.94 | yes | 1.5 |
| 139_01 | R | 1.48-2.8 | 70 | 40 / 72 | 25.2 | 0.19 | 1 | yes | 2.9 |
| 139_01 | L | 2.27-4.12 | -97 | -41 / 69 | 27.6 | 0.21 | 1 | yes | -1.8 |
| 139_01 | R | 4.53-5.63 | 77 | 19 / 64 | 14.2 | 0.09 | 1 | yes | -0.2 |
| 139_01 | L | 5.09-6.56 | -94 | -19 / 53 | 10.5 | 0.08 | 1 | yes | -4.2 |
| 139_01 | R | 6.26-7.47 | 64 | 3 / 39 | 11.1 | 0.08 | 1 | yes | 7.1 |
| 139_01 | L | 6.94-8.07 | -69 | 2 / 42 | 12.3 | 0.06 | 1 | yes | 6.9 |
| 139_01 | R | 7.49-8.98 | 112 | 29 / 50 | 13.2 | 0.05 | 1 | yes | -4.5 |
| 139_01 | L | 8.5-9.07 | -49 | -4 / 60 | 14.9 | 0.09 | 1 | no | 21.2 |
| 139_04 | R | 0-0.91 | 38 | 3 / 31 | 4.5 | 0.11 | 1 | yes | 15.2 |
| 139_04 | R | 0.46-1.72 | 86 | 14 / 34 | 9.7 | 0.06 | 1 | yes | -3.2 |
| 139_04 | R | 1.32-2.41 | 37 | 5 / 27 | 4.4 | 0.05 | 1 | yes | 13.9 |
| 139_04 | R | 2.3-3.75 | 40 | 3 / 14 | 1 | 0.06 | 1 | yes | 14.1 |
| 139_04 | R | 3.54-5.4 | 111 | 39 / 57 | 15.8 | 0.06 | 1 | yes | -3.3 |
| 139_04 | L | 4.93-6.3 | -113 | -11 / 33 | 11.2 | 0.07 | 1 | yes | -4.3 |
| 139_04 | L | 6.33-7.35 | -46 | 1 / 31 | 6.6 | 0.28 | 0.78 | yes | 19.3 |

### Intermediates and clips (build/mocap/m3/, build/mocap/clips/m3/)

Intermediates: `build/mocap/m3/<slot>.json` (format `mocap-intermediate/1`, as retarget.mjs; the lateral loops carry
a facing root and a `travel` field, see "faceRoot" in m3.mjs). Clips: `build/mocap/clips/m3/<name>.ts` in the
CLIP-FORMAT.md shape, checked through the game's `keyedClip`; nothing is in src/ yet.

- `crouch_walk` (136_09 4.233-5.508 s, 77 frames @60): slide 3.9/4 -> 0.9/0.9 cm, seam 1.1 cm / 7.5 deg (hipL) -> step 0.5 cm (typical 0.8) -> `clips/m3/crouch_walk.ts`: keyedClip ok (48 frames, feet); Wren 0.83 m/s, stride 1.07 m, cycle 1.283 s, duty 0.604 (the take's contact 0.698), capture lift 12.7 cm (liftH written 0.075), the take's half 0.057 (written 0.0569), knee pole -0.055; at the game's 0.8 m/s the clip plays at 0.96x its captured speed; seam step 0.8 cm (median 1.3, max inside 2.1).
- `sprint` (127_07 0.325-1.008 s, 41 frames @60): slide 3.9/6 -> 0.7/1.3 cm, seam 3.8 cm / 29.3 deg (knL) -> step 3.8 cm (typical 3.5) -> `clips/m3/sprint.ts`: keyedClip ok (48 frames, feet); Wren 4.03 m/s, stride 2.76 m, cycle 0.683 s, duty 0.135 (the take's contact 0.198), capture lift 35.6 cm (liftH written 0.22), the take's half 0.027 (written 0.07), knee pole -0.03; at the game's 5 m/s the clip plays at 1.24x its captured speed; seam step 3.3 cm (median 3.0, max inside 3.6).
- `sprint_start` (127_03 0.558-2.592 s, 123 frames @60): slide 0/0 -> 0/0 cm -> `clips/m3/sprint_start.ts`: keyedClip ok (70 frames); 70 frames, 1.73 s.
- `strafe_walk_L` (69_59 4.625-5.625 s, 60 frames @60): slide 3.6/4.7 -> 2.3/3.1 cm, seam 0.2 cm / 40.4 deg (neck) -> step 0.5 cm (typical 0.7), travel heading -86 deg, body turned 86 deg off the travel root before faceRoot -> `clips/m3/strafe_l.ts`: keyedClip ok (48 frames, feet); Wren 0.53 m/s, stride 0.53 m, cycle 1.000 s, duty 0.708 (the take's contact 0.708), capture lift 5.5 cm (liftH written 0.05), the take's half 0.196 (written 0.19566), knee pole 0; at the game's 0.7 m/s the clip plays at 1.33x its captured speed; travel -x (the take's travel turned -4.0 deg onto the axis), game / clip stride 0.63-1.42 over 0.4-0.9 m/s; seam step 0.6 cm (median 0.8, max inside 1.4).
- `strafe_walk_R` (69_56 1.317-2.275 s, 58 frames @60): slide 2.7/2.8 -> 2.7/3.2 cm, seam 0.3 cm / 11.4 deg (toeL) -> step 0.5 cm (typical 0.7), travel heading 96.8 deg, body turned -96.8 deg off the travel root before faceRoot -> `clips/m3/strafe_r.ts`: keyedClip ok (48 frames, feet); Wren 0.48 m/s, stride 0.46 m, cycle 0.967 s, duty 0.708 (the take's contact 0.708), capture lift 3.4 cm (liftH written 0.05), the take's half 0.187 (written 0.18694), knee pole 0; at the game's 0.7 m/s the clip plays at 1.47x its captured speed; travel +x (the take's travel turned -6.8 deg onto the axis), game / clip stride 0.72-1.62 over 0.4-0.9 m/s; seam step 0.6 cm (median 0.8, max inside 0.9).
- `wall_step_L` (69_59 0.033-1.117 s, 65 frames @60): slide 4.4/5 -> 2.6/2.9 cm, seam 0.8 cm / 17.1 deg (toeL) -> step 0.4 cm (typical 0.6), travel heading -80 deg, body turned 80 deg off the travel root before faceRoot -> intermediate only.
- `wall_step_R` (69_56 1.317-2.275 s, 58 frames @60): slide 2.7/2.8 -> 2.7/3.2 cm, seam 0.3 cm / 11.4 deg (toeL) -> step 0.5 cm (typical 0.7), travel heading 96.8 deg, body turned -96.8 deg off the travel root before faceRoot -> intermediate only.
- `wall_crouch_step_L` (139_15 5.35-6.192 s, 51 frames @60): slide 3.7/5.2 -> 2.5/2.6 cm, seam 1.5 cm / 20.8 deg (shL) -> step 0.9 cm (typical 1.7), travel heading -53.2 deg, body turned 53.2 deg off the travel root before faceRoot -> intermediate only.
- `wall_crouch_step_R` (139_15 2.283-3 s, 43 frames @60): slide 5.2/6.7 -> 3.2/3.4 cm, seam 1.1 cm / 24.8 deg (shL) -> step 1.7 cm (typical 1.8), travel heading 66.2 deg, body turned -66.2 deg off the travel root before faceRoot -> intermediate only.
- `wall_peek_L` (139_04 4.925-6.3 s, 83 frames @60): slide 0/0 -> 0/0 cm -> `clips/m3/wall_peek_l.ts`: keyedClip ok (56 frames); 56 frames, 1.37 s.
- `wall_peek_R` (139_01 7.492-8.983 s, 90 frames @60): slide 0/0 -> 0/0 cm -> `clips/m3/wall_peek_r.ts`: keyedClip ok (60 frames); 60 frames, 1.48 s.

### Findings

- Crouch walk: 136_09 / 136_10 ("Walk Crouched") are steady, straight crouch walks (2.42-9.41 s at 0.82 m/s; 1.63-10.61 s at 0.75 m/s), hips 14.5 / 13.3 cm under standing, 0 core pops in 136_09. 136_09 starts standing and crouches at about 1.3 s; 136_10 starts crouched and stands up and turns at its end (10-11 s). At 0.75-0.85 m/s (Wren about the same) they fit the game's crouched sneak (0.8 m/s); the crouch walk (1.8) and crouch run (2.6 m/s) have no capture: played there, the stride would scale over 2x.
- Sneak: the 139 "Sneaking" takes are a slow, wandering sneak (0.4-0.8 m/s), hips 4.8 / 5 / 6.9 / 6.5 / 5.1 cm (139_29) and 12.1 / 11.7 / 10.4 / 11.7 / 9.6 / 5.4 cm (139_32) down, the facing turning through large angles between pauses (139_32: -30 / -30 / -264 / 104 / 67 / -54 deg over its bouts). 139_32 has no steady cycle; 139_29 and 139_34 have a few (scores 12-17 against 136's 4-5). A second choice for the sneak, not the loop. 139_11 ("Run To Sneak") runs up to about 4 m/s and slows into a sneak within a second: too short for either loop.
- Sprint: no take is named "sprint". The 127 "Run" takes are 1.2-1.4 s, one or two cycles, and still accelerating (top hip speed 127_06 4.44 m/s, 127_07 4.62 m/s, 127_08 4.95 m/s); on Wren their cycles run 3.35-4.35 m/s; the pick and runner-up (4.0 / 4.35) play at 1.25 / 1.15x at the game's 5.0 m/s sprint. The lfoot / rfoot "pops" in 127_07 / 127_08 are the heel strike's slap (8-10 deg per frame for 3-4 frames), not glitches. 143_42 (two 4.6 m/s straights with a 180 deg turn) reads 0.26-0.49 s "cycles" (5-8 steps/s): its strikes are missed, so it is out.
- Sprint start: 127_03 0.1 -> 4.31 m/s in 1.42 s over 2.24 m, first foot l; 127_04 0.1 -> 4.06 m/s in 1.89 s over 2.42 m, first foot r; 143_42 0.1 -> 4.35 m/s in 0.79 s over 1.28 m, first foot r. 127_03 is a clean standing start into a run (0 core pops); 127_04 walks first, then runs.
- Strafe (walk): 143_40 walks sideways left (0.46-4.01 s at 1.13 m/s) then right (4.17-8.04 s at 1.08 m/s) facing one way, but crosses its feet every step (feet gap down to -24 to -30 cm: a crossover side walk) and runs at 1.4-1.5 m/s on Wren, twice the game's aimed strafe (0.7 m/s), whose glide never crosses the feet. 69_56 (right) and 69_59 (left) step sideways without crossing (gap 8.6-13.7 cm) at 0.4-0.55 m/s on Wren in a step-together rhythm (the hip speed pulses 30-70 % within a cycle) and turn their facing about 90 deg in the middle of the take: one performer for both sides, played at about 1.35-1.45x for the strafe. No jogging strafe exists on the site: 127_13 / 127_14 "Run Side Step Left / Right" travel forward (2, 2 / 5, 4 deg off the facing): a sidestep dodge inside a run, not a strafe.
- Wall side-step, standing: no wall take exists; the 69 sideways steps (0.45-0.5 m/s on Wren) are the nearest to the game's standing wall slide (0.35 m/s at full stick), played at about 0.75x. Crouched: 139_14 / 139_15 ("Sneak Sideways") side-step in a crouch (139_15 hips 13.2 / 13 / 13.1 cm down), right then left, the travel 60-70 deg off the facing (a diagonal sidestep, not square to the body), the left run crossing the feet (gap down to -8 cm); 0.8-0.9 m/s, so at the game's crouched 0.5 m/s they play at about 0.6x (under the 0.8 the stride scale looks right at). Both are free-standing (no wall behind the performer): the arms are the performer's own, not a wall pose.
- Wall peek: nothing on the site is a back-to-wall peek. 139_04 (standing, dipping 10-16 cm in the bigger looks) and 139_01 (crouched, 10-28 cm) turn the head 64-113 deg off the pelvis with the feet planted, the chest bent 30-70 deg forward and leaning up to 40 deg sideways into the look: a look-around, not a lean past a corner. Usable only as a head / chest turn stand-in; the lean out past the edge stays hand-keyed or procedural.
- Slide on the sideways cycles stays 2.3-3.2 cm after the de-slide (the forward cycles 0.7-0.9): the de-slide pins the ankle while the foot is flat, and side-steps land and push off on the ball / edge of the foot. Frame rate: every M3 take is 120 fps (the subject 77 creeping takes were skipped at 60 fps).
<!-- /mocap:m3 -->
