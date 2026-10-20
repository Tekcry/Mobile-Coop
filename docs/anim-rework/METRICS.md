# Anim rework - anti-crab metrics

The numbers behind BRIEF section 5 "No crabbing" and "No sliding", measured in the running game by `e2e-anim`
("anti-crab metrics") with the pure functions in `src/anim/audit/metrics.ts` and the ranges in
`src/anim/audit/limits.ts` (`CRAB`, `CRAB_CROUCH`). Unit tests: `tests/animCrabMetrics.test.ts`. Jobs: anim-metrics and
anim-metrics-2 (Character Build, 2026-10-20), branches off `feature/ct-prototype`.

## See it live (Michael's walk-throughs)
Settings > Graphics > Show FPS overlay on (or F3). During play the overlay shows, under the frame-rate lines (an example):

```
crab  walk  standing, holstered  1.40 m/s
knees 0.91-1.01 x hips (0.5-1.1)
track L 6.1 R 6.6 cm from the line (<= 7.0)
knee outside ankle L 2.1 R 2.5 cm (<= 3.0)
elbow outside shoulder L 2.0 R 2.4 cm (<= 6.0)
```

Each line is green inside its range and red outside, the worst of the last quarter second (the track: planted feet
only). The ranges switch to the crouched ones when crouched. Nothing is measured in the menus.

## What is measured
Every metric is taken in the pelvis frame: the horizontal axis from the left hip joint to the right one, and the line
under the hips (the midpoint), so it reads the same in any heading. The elbows use the shoulder line instead.

| Metric | What | Standing | Crouched | Why (human data) |
| --- | --- | --- | --- | --- |
| Knee separation | the knees' lateral distance over the hip joints' (ratio) | 0.5-1.1 | 0.5-1.25 | knees about hip width or narrower, over the feet; past it they bow out (the crab), under 0.5 they knock |
| Planted track | a planted foot's centre (ankle) from the line under the hips (cm) | <= 7 | <= 8 | normal walking step width is about 5-13 cm between the heel centres (mean 8-10), so 2.5-6.5 cm a foot; a run lands nearer the line |
| Knee over ankle | how far a knee sits outside its own ankle (cm) | <= 3 | <= 3 | knees track over the toes |
| Planted slide | a planted foot's travel over the ground while planted (cm) | < 1 | < 1 | feet lock to the ground (`FOOT_SLIDE`) |
| Elbow wing | how far an elbow sits outside its own shoulder (cm) | <= 6 | <= 6 | elbows down and close to the ribs, not winged |

(anim-metrics-2, 14:45 recheck) The first cut (knees 0.6-1.3, track 9 cm, knee out 5 cm, elbows 8 cm) was too loose:
it let the walk pass with feet up to 9 cm off the line, an 18 cm step width, past the widest normal walking step. The
ranges above follow the gait data. A standing idle is not a walk: the brief asks for feet about hip width there (about
9 cm a foot for Wren's 18 cm hip joints), so read the idle's track against that, not against 7 cm.

Report-only: `CRAB_GATES` in `limits.ts` turns a gait's hard asserts on (walk, jog, run, crouch, sneak) as CT Core's
anim-rework slices land. `CRAB_JSON=1` prints the gait table as JSON; `CRAB_STATES=1` adds the walk's sub-states below.

## The gaits (feature/ct-prototype 7cf08239 with anim-rig; laptop, 2026-10-20)
1 s to settle, then 2 s sampled every 60 Hz step (Proving Grounds, headless stepping). walk = stick 0.5, jog = full stick,
run = full stick at speed 5, crouch = crouched full stick, sneak = crouched stick 0.35. Mean (min to max); out of range
in bold.

| Gait | Speed | Knee separation | Planted track (cm) | Knee over ankle (cm) | Slide (cm) | Elbow wing (cm) |
| --- | --- | --- | --- | --- | --- | --- |
| walk | 1.40 m/s | 0.96 (0.91-1.01) | 6.6 (4.9 to **9.2**) | 2.7 | 0 | 2.4 |
| jog | 3.00 m/s | **1.28** (1.18-**1.40**) | **8.3** (6.6 to **11.1**) | **3.2** | 0 | **23.9** |
| run | 4.50 m/s | **1.34** (**1.21-1.48**) | **8.4** (6.4 to **12.0**) | **3.8** | 0 | **24.0** |
| crouch | 2.15 m/s | **1.61** (**1.47-1.74**) | **9.5** (7.6 to **12.6**) | **5.5** | 0 | **18.2** |
| sneak | 0.85 m/s | **1.58** (**1.48-1.65**) | **9.0** (7.5 to **10.9**) | **5.3** | 0 | **16.6** |

## The walk Michael tested: every sub-state at speeds 1-3 (CRAB_STATES=1)
Standing; holstered except the aimed strafe and backwards. Speeds 2 and 3 read almost the same as speed 1 except where
shown. Max values; out of range in bold.

| Sub-state | Speed (m/s) | Knee separation (max) | Track (cm, max) | Knee over ankle (cm) | Slide (cm) | Elbow wing (cm) |
| --- | --- | --- | --- | --- | --- | --- |
| idle (speed 1 / 2-3) | 0 | 1.08 / **1.16** | 9.5 / 11.0 (hip width, see above) | 0.7 | 0 | **9.1** |
| start | 0.6-1.6 | **1.46-1.50** | **16.1-16.3** | 2.3-2.7 | **7.6-8.7** | **9.1** |
| straight walk | 0.75 / 1.40 / 2.10 | 0.96 / 1.01 / 1.08 | **8.6 / 9.2 / 9.9** (mean 6.6-6.7) | 2.3-2.7 | 0 | 2.3-2.5 |
| stop | 0-0.1 | 0.96-1.05 | **7.8-9.2** | 2.1-2.3 | 0 | **9.1** |
| turn round from a standstill | 0.39 | **1.43** | **15.1** (mean 13.8) | 2.6 | 0 | **9.1** |
| 90 deg direction change | 0.7 / 1.3 / 2.0 | 1.10 / **1.64** / 1.08 (min **0.2**) | **11.7-14.2** | 3.0 / **8.6** / **11.3** | 0 / **9.7** / **3.6** | 2.4-2.7 |
| 180 deg direction change | 0.5 / 1.2 / 1.8 | 0.95 / **1.62** / **1.80** | 6.5 / **14.0** / **14.4** | 2.4 / **7.2** / **11.7** | 0 / **9.0** / **9.4** | 2.3-2.5 |
| strafe, aiming | 0.67 / 1.26 | **2.45 / 2.78** (mean **1.77 / 1.96**) | **44.5 / 52.9** (mean **18 / 21**) | **9.7 / 11.9** | 0 | in |
| backwards, aiming | 0.56 / 1.05 | **1.30 / 1.29** (mean **1.24**) | **12.5 / 9.9** | **3.1-3.2** | 0 | in |

Which states are wide, and by how much:
- **Aimed strafe is the crab.** The knees open to 2-2.8x the hip width (mean about 1.9x) and a planted foot lands up
  to 45-53 cm off the line, against 1.1x and 7 cm. The feet step wide apart instead of the brief's shuffle step that
  never crosses. This is the worst state by far.
- **Turning round from a standstill** (stick pulled back while standing): knees 1.43x, the feet planted 14-15 cm off the
  line, double the range: a wide pivot stance.
- **Starts**: knees up to 1.5x, a foot 16 cm off the line, and a planted foot sliding 7.6-8.7 cm in the first steps.
- **90 and 180 deg direction changes at speeds 2-3**: knees swing from 0.2x (crossed) to 1.6-1.8x, knees 7-12 cm outside
  the ankles, feet 14 cm off the line, and planted feet sliding 4-10 cm. At speed 1 they stay near the range.
  (During a turn the pelvis frame turns under a planted foot, so part of a turn's track reading is the turn itself;
  the knee-over-ankle and slide numbers do not depend on that.)
- **Aimed backwards**: knees a steady 1.24x and the feet 10-12 cm off the line: a wide, open-kneed back step.
- **Idle standing and the stop pose**: knees 1.08-1.16x and the elbows 9 cm out from the shoulders (arms held away from
  the body); the feet about hip width, which the brief allows standing.
- **The straight walk** is close: knees 0.91-1.08x, mean track 6.6 cm, but every speed has plants 8.6-9.9 cm off the
  line (a 17-20 cm step width) where 7 cm is the widest normal step.
- Jog, run, crouch and sneak stay as before: open knees (1.3-1.7x), wide track (8-12.6 cm), elbows 17-24 cm out.

## Turning a gait on
When a slice lands, rerun `CRAB_STATES=1 CRAB_JSON=1 node scripts/run-e2e.mjs e2e-anim`, check the gait's numbers sit
inside the ranges, set `CRAB_GATES.<gait> = true` and update the tables above. A range that proves wrong for a believable
pose changes in `CRAB` / `CRAB_CROUCH` with the reason, never per gait in the suite.

## Slice 2 (anim-rework S2, 2026-10-20, desktop): standing holstered
`CRAB_GATES.walk / jog / run` are on, and `CRAB_STATE_GATES` asserts the standing holstered sub-states idle, start,
straight, stop and the turn round from a standstill at speeds 1-3 on every e2e-anim run (a turn: all but the track).
The 90 / 180 deg changes stay report-only. Idle, start and stop read their track against `CRAB_IDLE` (10.5 cm: a
hip-width stance). The crab recordings now holster first (the aim checks before them left the gun at low ready, so the
tables above measured drawn arms at jog / run / idle). After: walk / jog / run knees 0.74-0.76 x the hips (max 0.89),
track 4.0-4.4 cm (max 6.0), knee out 2.2-2.5 cm, slide 0, elbows 2.5-2.7 cm. Full tables: `S2-REPORT.md`.

## Slice 3 (anim-rework S3, 2026-10-20, desktop): drawn, standing
`CRAB_DRAWN_GATES` asserts the drawn states, rifle and pistol, on every e2e-anim run: the aimed idle, strafe right and
left and backwards at speeds 1-2, the aimed forward (its track report-only: 6.9-7.0 cm at the aim's 1.4 m/s top, the
pelvis' stepping twist), the low ready idle, walk and jog. The aimed strafe reads against the new `CRAB_STRAFE` (written
reason in `limits.ts`: a side-step opens the feet from the close to about shoulder width; knees 1.5 x, track 20 cm) and
asserts the feet never cross; the idles against `CRAB_IDLE`. The drawn pose asserts (`DRAWN_POSE`): the low ready muzzle
28-47 deg down (rifle) / 20-50 (pistol), within 25 deg of the facing; aiming the head within 14 deg of upright. The old
walk table's "strafe / backwards (aiming)" rows stay report-only against the walk's ranges. After (rifle; the pistol reads
the same legs): strafe knees 0.63-1.23 x, track max 16-18 cm, knee out 1.6-1.8 cm, never crossed; backwards 0.68-0.71 x,
track max 5.5-6.0, knee out 1.9-2.1; elbows 4.1-4.2 cm (were 6.6-7.2). Full tables: `S3-REPORT.md`.

## Slice 4 (anim-rework S4, 2026-10-20, desktop): crouched
`CRAB_GATES.crouch / sneak` are on, and `CRAB_CROUCH_GATES` asserts the crouched sub-states on every e2e-anim run: the
crouched idle (the keyed squat), a crouched start and stop at speeds 1 and 3, the crouch run at speed 5, and drawn
(rifle) the crouched low ready walk, the aimed idle (the kneel) and the aimed strafe at speeds 1-2. The idle, start,
stop and aimed idle read their track against `CRAB_CROUCH_IDLE` (10.5 cm, the hip-width stance, as standing), the aimed
strafe against `CRAB_STRAFE` (and never crossing), the rest against `CRAB_CROUCH`. New: the knee hand in the crouched
idle (`KNEE_HAND`: the palm within 7 cm of the knee top, palm down, fingers forward) and a stand <-> crouch check on the
posed rig in nine states (`CROUCH_POP`, written reason in `limits.ts`). After: crouch / sneak knees 0.68-0.70 x the
hips (was 1.58-1.61), track mean 5.2 cm (max 6.7-7.2; was 9.0-9.5, max 11-12.6), knee out 2.1-2.4 cm (was 5.3-5.5),
elbows 1.8-2.4 cm (was 16.9-18.2); the knee hand 1.4 cm off the knee top (was 27 cm, palm up); the crouched aimed strafe
track max 16 cm, knees 0.88-0.90 x (was 43 cm with crossing feet, 1.9-2.0 x). Full tables: `S4-REPORT.md`.
