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

- `walk.ts`: walk_loop 35_01 1.225-2.342 s, Wren 1.17 m/s, stride 1.31 m, cycle 1.117 s, R strike at 0.478 of the take cycle (warped to 0.5), duty 0.604, liftH 15.6 cm, half 0.063, game/clip stride 0.89-1.10 over the band, mean pelvis yaw 1.4 deg. keyedClip ok (48 frames, feet); seam step 1.3 cm (median 1.6, max inside 2.1); planted foot vs the moving root: median 0.00 / max 3.94 cm per frame over 56 planted frame pairs.
- `jog.ts`: jog_loop 16_36 0.3-1.092 s, Wren 2.49 m/s, stride 1.99 m, cycle 0.800 s, R strike at 0.500 of the take cycle (warped to 0.5), duty 0.281, liftH 25.2 cm, half 0.035, game/clip stride 0.89-1.10 over the band, mean pelvis yaw -0.4 deg. keyedClip ok (48 frames, feet); seam step 1.9 cm (median 2.0, max inside 2.4); planted foot vs the moving root: median 0.00 / max 2.55 cm per frame over 26 planted frame pairs.
- `run.ts`: run_loop 16_46 0.158-0.85 s, Wren 3.82 m/s, stride 2.68 m, cycle 0.700 s, R strike at 0.500 of the take cycle (warped to 0.5), duty 0.229, liftH 34.4 cm, half 0.018, game/clip stride 0.95-0.97 over the band, mean pelvis yaw -1.8 deg. keyedClip ok (48 frames, feet); seam step 2.7 cm (median 2.6, max inside 3.1); planted foot vs the moving root: median 0.12 / max 2.92 cm per frame over 21 planted frame pairs.
- `turn_in_place.ts`: pivot180_R 69_13 15.5-19.058 s, 47 frames, turned 90.0 deg over 1.18 s of the take. keyedClip ok (47 frames).
- `turn_move_l.ts`: walk_turn90_L 16_18 1.692-4.05 s, 56 frames, turned -86.5 deg over 1.40 s of the take. keyedClip ok (56 frames).
- `turn_move_r.ts`: walk_turn90_R 16_19 1.242-3.408 s, 47 frames, turned 90.0 deg over 1.18 s of the take. keyedClip ok (47 frames).
- `start.ts`: walk_start 16_31 0-2.183 s, 79 frames, 1.95 s. keyedClip ok (79 frames).
- `stop.ts`: walk_stop 16_34 0.458-2.883 s, 85 frames, 2.10 s. keyedClip ok (85 frames).
- `alt/walk.ts`: walk_loop_alt 16_15 0.525-1.675 s, Wren 1.03 m/s, stride 1.18 m, cycle 1.150 s, R strike at 0.478 of the take cycle (warped to 0.5), duty 0.635, liftH 15.5 cm, half 0.062, game/clip stride 0.98-1.22 over the band, mean pelvis yaw -0.4 deg. keyedClip ok (48 frames, feet); seam step 0.9 cm (median 1.6, max inside 2.3); planted foot vs the moving root: median 0.01 / max 3.76 cm per frame over 60 planted frame pairs.
- `alt/jog.ts`: jog_loop_alt 16_35 0.433-1.233 s, Wren 2.65 m/s, stride 2.12 m, cycle 0.800 s, R strike at 0.479 of the take cycle (warped to 0.5), duty 0.292, liftH 32.4 cm, half 0.067, game/clip stride 0.84-1.03 over the band, mean pelvis yaw -1.5 deg. keyedClip ok (48 frames, feet); seam step 2.1 cm (median 2.2, max inside 2.6); planted foot vs the moving root: median 0.01 / max 2.92 cm per frame over 27 planted frame pairs.
- `alt/run.ts`: run_loop_alt 16_45 0.117-0.825 s, Wren 3.72 m/s, stride 2.67 m, cycle 0.717 s, R strike at 0.488 of the take cycle (warped to 0.5), duty 0.240, liftH 36.1 cm, half 0.055, game/clip stride 0.95-0.97 over the band, mean pelvis yaw -1.7 deg. keyedClip ok (48 frames, feet); seam step 2.5 cm (median 2.6, max inside 3.1); planted foot vs the moving root: median 0.19 / max 2.74 cm per frame over 22 planted frame pairs.
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
