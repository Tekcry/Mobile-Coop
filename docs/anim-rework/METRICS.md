# Anim rework - anti-crab metrics

The numbers behind BRIEF section 5 "No crabbing" and "No sliding", measured in the running game by `e2e-anim`
("anti-crab metrics") with the pure functions in `src/anim/audit/metrics.ts` and the ranges in
`src/anim/audit/limits.ts` (`CRAB`). Unit tests: `tests/animCrabMetrics.test.ts`. Job: anim-metrics (Character Build,
2026-10-20), branch `feature/anim-metrics` off `feature/ct-prototype`.

## What is measured
Every metric is taken in the pelvis frame: the horizontal axis from the left hip joint to the right one, and the line
under the hips (the midpoint), so it reads the same in any heading. Each gait: 1 s to settle, then 2 s sampled every
60 Hz step (Proving Grounds, headless stepping).

| Metric | What | Range (`CRAB`) | Why |
| --- | --- | --- | --- |
| Knee separation | the knees' lateral distance over the hip joints' (ratio) | 0.6-1.3 | knees track over the toes; past 1.3 they bow out (the crab), under 0.6 they knock |
| Planted track | a planted foot's centre (ankle) from the line under the hips (cm) | <= 9 | a narrow track: walking step width about 8-12 cm between the feet, closer at a run |
| Knee over ankle | how far a knee sits outside its own ankle (cm) | <= 5 | knees over the toes, never out past them |
| Planted slide | a planted foot's travel over the ground while planted (cm) | < 1 | feet lock to the ground (`FOOT_SLIDE`) |
| Elbow wing | how far an elbow sits outside its own shoulder (cm) | <= 8 | elbows down and close to the ribs, not winged |

Report-only: `CRAB_GATES` in `limits.ts` turns a gait's hard asserts on (walk, jog, run, crouch, sneak) as CT Core's
anim-rework slices land (slice 2 holstered standing and crouched, slice 3 low ready and aiming, slice 4 sneak and crouch).
`CRAB_JSON=1` prints the table as one JSON line for tools.

## Today's values (feature/ct-prototype 65c5ffcd, before the rework; laptop, 2026-10-20)
The gaits: walk = stick 0.5, jog = full stick, run = full stick at speed 5, crouch = crouched full stick, sneak =
crouched stick 0.35. Track and knee separation: mean (min to max). Out of range in bold.

| Gait | Speed | Knee separation | Planted track (cm) | Knee over ankle (cm) | Slide (cm, plants) | Elbow wing (cm) |
| --- | --- | --- | --- | --- | --- | --- |
| walk | 1.40 m/s | 0.96 (0.91-1.01) | 6.6 (4.9 to **9.2**) | 2.7 | 0 (6) | 2.4 |
| jog | 3.00 m/s | 1.28 (1.18-**1.40**) | 8.3 (6.6 to **11.1**) | 3.2 | 0 (7) | **23.9** |
| run | 4.50 m/s | **1.34** (1.21-**1.48**) | 8.4 (6.4 to **12.0**) | 3.8 | 0 (10) | **24.0** |
| crouch | 2.15 m/s | **1.61** (**1.47-1.74**) | **9.5** (7.6 to **12.6**) | **5.5** | 0 (7) | **18.2** |
| sneak | 0.85 m/s | **1.58** (**1.48-1.65**) | 9.0 (7.5 to **10.9**) | **5.3** | 0 (5) | **16.6** |

Reading them:
- The walk is inside every range (only its widest plant touches 9.2 cm).
- The crab is in the crouch and the sneak: the knees sit 1.5-1.7x the hip width apart and 5 cm or more outside the
  ankles, on a wide track. Slices 2 and 4 bring them under 1.3 and inside 5 cm.
- Jog and run widen the knees (1.3-1.5x) and the track (up to 12 cm): a run's feet land near the line, so the track
  should narrow with speed, not grow.
- The elbows wing out 17-24 cm past the shoulders at jog, run, crouch and sneak (2.4 cm at the walk).
- Planted feet do not slide in any gait (the foot lock holds; e2e-anim's foot-locking asserts already gate it).

## Turning a gait on
When a slice lands, rerun `node scripts/run-e2e.mjs e2e-anim` (`CRAB_JSON=1` for the table), check the gait's numbers sit
inside `CRAB`, set `CRAB_GATES.<gait> = true` and update the table above. A range that proves wrong for a believable pose
changes in `CRAB` with the reason, never per gait in the suite.
