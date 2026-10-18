# Step 07 - anim-audit harness, local player

Block B. Deps: 06. Bible 5.12.2 (`docs/design-bible.md:786-887`), 5.12.4.2 (:919-928), 5.17 D2 (:1251-1258), D5 (:1268-1283).

## Model
Implementer: opus. Checker: opus. (all subagents opus from step 06, Michael 2026-10-13)

## Read
- docs/locomotion/AUDIT.md sections 2 and 4 (:161-177, :214-245); audit/a-anim-rig.md (grep -n "bob\|sway\|breath\|LOD").
- src/core/loop.ts:57-90 (`stepHeadless(seconds, renderHz)`: fixed 60 Hz steps, `renderHz / 60` frame updates per step).
- scripts/e2e-anim.mjs:20-75 (the `window.__t` driver: `tp`, `frame`, `run(sec, inp, sample, hz)`), :463-494 (parity tolerances).
- scripts/e2e-clip.mjs:1-60 (weapon vs world rays, leg capsules); scripts/e2e-lib.mjs:83-110 (`launch`), :249 (`assert`).
- src/player/characterRig.ts:300-335 (joint nodes), :393 (`planner`); src/anim/footPlanner.ts:17-34 (`FootState` contact / landed / slide).
- src/config/movement.ts:150-168 (GEARS); src/world/maps/provingGrounds.ts:36-56 (ramp, stairs, slopes, step row, tunnel);
  src/player/shoulderCamera.ts:220-300 (camera follow).

## Task
1. New Babylon-free `src/anim/audit/limits.ts`: the limits table below as typed constants, each with its bible line in a comment.
   Step 32 moves the final values to src/config/animLimits.ts.
2. New Babylon-free `src/anim/audit/metrics.ts`, pure functions over plain arrays (no allocation rules: offline code, but no Babylon):
   `jointRate`, `pelvisJump`, `teleports`, `footContact` (slide / float / sink while planted), `handContact`, `romAngles` (knee / elbow
   from 3 points, wrist flex / side, neck twist, spine twist), `balanceMargin` (COM vs convex hull of planted feet + margin),
   `segmentDistance` (self-intersection), `pelvisPerStride` (p2p per stride from heel strikes, count of lows / highs per step with 2 mm
   hysteresis), `lateralSway`, `headVsPelvis`, `oscP2P` (detrended by a linear fit), `settleTime`, `landingDip` (minima count, rebound),
   `rootOvershoot`, `stairsPelvisDrop`, `durationOf`. Each returns `{ worst, frame, pass }`.
3. `tests/animAudit.test.ts`: synthetic signals per function: a clean sine passes, a double bounce fails `pelvisPerStride`, a 2.1 cm slide
   fails `footContact`, a knee at 156 deg fails ROM, an overshoot fails `rootOvershoot`, a settle at 0.25 s fails, 120 Hz scaling of
   `jointRate` (12.5 deg per frame), COM 11 cm outside fails balance.
4. Build the metrics for node: `node_modules/.bin/esbuild src/anim/audit/metrics.ts src/anim/audit/limits.ts --bundle --format=esm
   --outdir=test-results/anim-audit/lib` at harness start (test-results is gitignored). The page only records; node computes.
5. `scripts/anim-audit.mjs [url] [--quick] [--only=<scenario>] [--out=dir] [--shots]`: `launch({ params: 'autostart=proving' })`,
   `loop.manual = true`, a driver like e2e-anim's `__t`. Per 60 Hz step (and 120 Hz sub-frame) record into Float32Arrays: hips, spine, torso, neck, headNode (pos + world quat), shoulders, elbows, wrists, hipL/R, knees, ankles, weaponPivot,
   camera position, capsule pos / speed / gear / crouch, planner L / R (contact, landed, slide, y), lower state and its fade time.
6. Gear mapping for D2 (log as "A7 (ASSUMED - for review)" in DECISIONS.md, alternative: by speed bands): stand gears 1-3 walk,
   4-5 run, 6 sprint; crouch gears 1-6 crouch. Lateral sway applies to stand 1-3.
7. Scenarios (full run): every gear (stand 1-6, crouch 1-6) on flat at 60 and 120 Hz (24 runs); every gear up the stairs and up the 20.4 deg
   ramp at 60 Hz (24); stairs and 35 deg slope at 120 Hz for stand 2 / 4 / 6 and crouch 2 / 6 (10). Each run: 1.0 s accel (ignored by the
   D2 steady metrics), >= 2 strides steady, release, 1.5 s stop / settle / idle.
8. Transitions (60 and 120 Hz): stand -> crouch -> stand, quick 180 at gear 4, ADS raise, weapon swap, vault (0.9 m block, step row),
   ladder rung (first ladder anchor), drop off the 0.9 m block and the 2.4 m platform (landing dip), 3 s idle (breathing), crouch tunnel.
9. Steady metrics on stairs / slopes use pelvis y minus the smoothed capsule y (detrended); camera oscillation likewise.
10. `--quick`: flat only, stand 2 / 4 / 6 and crouch 3, 60 and 120 Hz, plus stop / idle: under 60 s. Steps 21-31 use it between full runs.
11. Output: `<out>/local.json` (per scenario, per metric: worst, frame, limit, pass, bible line) and `<out>/fails.txt` (one line per fail:
    scenario, Hz, metric, value, limit, frame numbers). Print a summary table and wall time. `--shots` saves PNGs at failing frames (PC only).
12. Report mode: exit 0 unless the harness errors; `--strict` exits 1 on any fail (step 32). Full run < 4 min on software GL (print it;
    if over, shorten steady windows to 2 strides, never drop a gear / surface / Hz).
13. Measure only: no src/anim / src/player behaviour change. Report today's numbers; step 08 writes them into AUDIT.md.
14. docs/systems/testing-tools.md: anim-audit row (command, flags, outputs, runtime). PC-PASS.md: `E2E_GPU=1 node scripts/anim-audit.mjs --shots`.

## Limits (bible lines; pelvis jump = speed x dt + 2 cm, gear caps from movement.ts:159-160)
| metric | limit | line |
|---|---|---|
| joint rotation / frame | 25 deg at 60 Hz, 12.5 deg at 120 Hz (1500 deg/s); hit / impact exempt | :794 |
| pelvis jump / frame, stand g1-6 | 60 Hz 3.33 / 4.17 / 5.33 / 6.67 / 8.33 / 10.33 cm; 120 Hz 2.67 / 3.08 / 3.67 / 4.33 / 5.17 / 6.17 cm | :795 |
| pelvis jump / frame, crouch g1-6 | 60 Hz 2.83 / 3.50 / 4.17 / 5.00 / 5.83 / 6.67 cm; 120 Hz 2.42 / 2.75 / 3.08 / 3.50 / 3.92 / 4.33 cm | :795 |
| teleports / blend | 0 outside spawn, respawn, checkpoint / fade 0.10-0.25 s | :796-797 |
| planted foot | slide < 1 cm, float <= 2 cm, sink <= 1 cm | :801 |
| hands | contact < 1 cm, weapon grip < 2 cm | :802 |
| clipping | body <= 3 cm, weapon <= 2 cm, self <= 2 cm, character <= 3 cm | :806-808 |
| ROM | knee / elbow 0-150 deg, hyperextension <= 5; wrist 70 flex-ext / 25 side; neck twist 80; spine twist 60 | :812-815 |
| balance | COM over support + 10 cm (starts, stops, jumps, rolls, falls, pushes exempt); COM by Winter 2009 Table 4.1 masses | :818 |
| minimum durations (s) | crouch 0.25, stand 0.30, 180 0.25, mantle 0.6, vault 0.5, rung 0.3, raise 0.2, swap 0.6, grab 0.5, lift 1.0, takedown 1.0-1.5 | :824-834 |
| frame-rate parity | root 2 cm, yaw 0.02 rad, feet 4 cm, camera 3 cm horiz / 2 cm vert (e2e-anim.mjs:491-493) | :854 |
| D2 pelvis p2p / stride | crouch 2.5, walk 4, run 6, sprint 8 cm; exactly 1 low + 1 high per step | :1253 |
| D2 head | travel <= pelvis p2p; pitch / roll p2p <= 2 deg | :1254 |
| D2 sway / camera | walk lateral <= 3 cm; camera vertical p2p <= 0.5 cm; landing: 1 dip, rebound <= 2 mm | :1255-1256 |
| D2 settle / breath | weapon + kit settle <= 0.2 s, no second excursion > 2 mm; idle breathing <= 1 cm | :1257 |
| D5 | root overshoot 0 (speed <= target x 1.01, no backward step after a stop); foot slide vs capsule < 1 cm; head level (as D2 head); stairs pelvis drop: no pelvis step > continuity limit, feet on treads (contact rows) | :1271, :1273, :1275, :1279 |

## Checks
- `npm run check` (new unit tests pass); `npm run e2e:quick`; `node scripts/anim-audit.mjs` (completes, < 4 min, JSON + fail list
  written; fails are expected and reported, not fixed); `node scripts/anim-audit.mjs --quick` < 60 s; `node scripts/e2e-anim.mjs`.
- `git grep -n -i "babylon" -- src/anim/audit` prints nothing. No GPU or visual claims.

## Commit
`locomotion 07: anim-audit harness (local): pure metrics + limits with tests, 60 / 120 Hz, all gears, flat / stairs / slope`

## Numbers
- Stairs (provingGrounds.ts:42): 9 steps, 2.6 m over 7 m: rise 0.289 m, tread 0.778 m. Ramp (:41): atan(2.6 / 7) = 20.4 deg. Slopes (:46-50):
  20 deg, 35 deg (rise 3.50 m / 5 m); the 55 deg ramp is unwalkable (red), skipped. Step row (:45): 0.15 / 0.3 / 0.42 / 0.6 / 0.9 m.
