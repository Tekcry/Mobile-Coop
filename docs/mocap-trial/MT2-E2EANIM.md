# MT2-E2EANIM - e2e-anim with mocap ON by default (M1 "Mocap, as captured")

Branch `feature/mocap-on` (base d60f374f). With the switch on by default, e2e-anim failed at "walk: knees over the toes
(outside by 3.8 cm)" (limit 3.5). M1 / A4: the old procedural shape / style limits are notes when mocap is on; pops,
foot slides, crossing feet, clipping, speed and timing stay fails.

## What changed
- `src/main.ts`: read-only debug hook `window.__mocapOn = () => LOCO.mocap` (the switch as resolved for the page:
  `?mocap=` over the stored setting). No game behaviour change.
- `scripts/e2e-anim.mjs`:
  - `E2E_MOCAP=0` / `1` adds `&mocap=0` / `&mocap=1` to the page; unset = the stored setting (default ON).
  - `MOCAP` read from `__mocapOn` after launch; when ON one header line prints
    (`mocap locomotion ON: the old shape / style limits are notes (M1 as captured)`).
  - `shape(cond, msg)`: OFF = `assert(cond, msg)` exactly; ON = `  note - <msg with the value> [M1 as captured]`
    (`: past the old limit` appended when the old bar is missed).
  - `shapeTrack(track, half, msg)`: the planted-track width is shape; with ON a foot crossed over the line past the
    limit (`track.min < -half`) still fails with the same message.

## Converted limits (line numbers in the new file)
Anti-crab gated gait rows (walk, jog, run, crouch, sneak; `CRAB_GATES`):
- 695 knee separation (`r.knee.pass`)
- 696 planted track width (`r.track.pass` -> `shapeTrack`, crossing side still asserts)
- 697 knees over the toes / knee-out (`r.bow.pass`) - the failing one
- 699 elbows in (`r.wing.pass`)

Anti-crab standing holstered sub-states (idle / start / straight / stop / turn round, speeds 1-3; `CRAB_STATE_GATES`):
- 777 knee separation, 778 track width (`shapeTrack`), 779 knee-out, 781 elbows in

Body mechanics (holstered gaits the mocap set plays):
- 1348 walk pelvis / shoulders counter-rotation p2p (7-9 deg)
- 1351 walk pelvis lateral sway (2.5-3.5 cm)
- 1353 jog pelvis / shoulders p2p (11-13 / 14.5-17 deg)
- 1355 sneak pelvis / shoulders p2p (4.5-5.5 / 4.5-6 deg)
- 1357 crouch walk pelvis / shoulders p2p (7-9 / 7-9.5 deg)
- 1358 run pelvis lateral sway (2-3 cm)
- 1360 run head yaw follows the chest (2-6 deg)
- 1362 walk / jog / sneak / crouch walk pelvis-shoulder counter-rotation correlation (< -0.9)
- 1363 walk / jog / sneak / crouch walk head yaw follows the chest (2-6 deg)
- 1371 head pitch p2p <= 2 deg for walk / jog / run / sneak / crouch walk (the aim glide rows still assert)

Not touched (still asserts ON and OFF): every planted-slide / foot-lock assert, turn-feet contact / wind-up / crossing
/ plant time / snap, responsiveness and timing, stance / aim / weapon clip timings, the wall rows (incl. never cross),
drawn states, crouched sub-states (incl. never cross), crouched idle knee hand, crouch pops (`CROUCH_POP`), transition
continuity / flinch, camera, Hz parity, the aim glide body mechanics.

## ON values past the old limits (GPU run, 08:11)
| Limit | Old bar | ON value |
| --- | --- | --- |
| walk knee-out | <= 3.5 cm | 3.8 cm |
| speed 2 straight knee-out | <= 3.7 cm | 3.8 cm |
| speed 2 stop knee-out | <= 3.8 cm | 4.6 cm |
| speed 3 straight knee-out | <= 3.7 cm | 3.8 cm |
| speed 3 stop knee-out | <= 3.8 cm | 4.3 cm |
| sneak planted track | <= 8.0 cm | 9.1 cm (min 1 cm: no crossing) |
| walk pelvis / shoulders p2p | 7-9 / 7-9 deg | 6.18 / 8.95 |
| walk pelvis lateral sway | 2.5-3.5 cm | 4.2 |
| walk counter-rotation corr | < -0.9 | -0.88 |
| walk head yaw | 2-6 deg | 8.76 |
| jog pelvis / shoulders p2p | 11-13 / 14.5-17 deg | 14.52 / 25.61 |
| jog counter-rotation corr | < -0.9 | 0.99 |
| jog head yaw | 2-6 deg | 18.74 |
| jog head pitch | <= 2 deg | 4.82 |
| run pelvis lateral sway | 2-3 cm | 1.8 |
| run head yaw | 2-6 deg | 11.36 |
| run head pitch | <= 2 deg | 2.96 |
| sneak pelvis / shoulders p2p | 4.5-5.5 / 4.5-6 deg | 6.21 / 4.44 |
| sneak counter-rotation corr | < -0.9 | 0.81 |
| sneak head pitch | <= 2 deg | 2.88 |

97 notes printed ON, 20 of them past the old bar (the rows above). All slides 0 cm, turn feet 0.0 cm contact slide,
no crossings, no pops, timings unchanged.

## Runs (desktop GPU, `E2E_GPU=1 E2E_PORT=4191 E2E_JOBS=1`, heavy.lock lane)
- Discovery (ON, `SOFT=1`, build 08:04-08:06): the failures above plus nothing else; no pop / slide / crossing /
  timing failure, so no mocap code change was needed.
- ON (default setting, build 08:08-08:11): `e2e-anim ok 64s` (317 ok, 97 notes).
- OFF (`E2E_MOCAP=0`, same dist): `e2e-anim ok 59s` (414 ok, no notes, no header line).
- Baseline (d60f374f script with `&mocap=0`, same dist, temporary zz copy, deleted): `ok 55s`, 414 ok. The OFF run's
  assert messages are identical to the baseline's (diff of the `ok -` text up to the value: none); the only diffs are
  sub-mm value noise run to run (idle rows, e.g. 3.3 vs 3.4 cm).

## Checks
- `npx tsc --noEmit -p .` clean; `npx eslint src/main.ts` clean (`scripts/e2e-anim.mjs` is eslint-ignored by config).
- tests/mocapPlayer.test.ts 10 passed / 1 skipped; tests/mocapSwitch.test.ts 13 passed.
- No anim src change: the per-frame allocation number is unchanged.

## Notes
- Port: the brief named 4191 with `E2E_GPU=1`; CLAUDE.md's port table reserves 4189 for GPU suites. Used 4191 as
  briefed, freed before and after each run.

## Changelog entry (for the lead)
- e2e-anim reads the mocap switch (`window.__mocapOn`, `E2E_MOCAP=0/1`); with mocap on, the old shape / style bars
  (knee-out, knee separation, track width, elbows, pelvis / shoulder rotation, sway, head yaw / pitch) print as
  "M1 as captured" notes; slides, crossings, pops and timings still fail. OFF asserts unchanged.
