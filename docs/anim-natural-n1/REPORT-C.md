# anim-natural N1 - fix round (REPORT-C)

2026-10-22 ~14:10, written by the job lead from the fix-round implementer's hand-back (on ccc1a14d + 0567c68b, not yet
merged with master 4.53.0). Tables: `fix-round/rep_rows.txt` (per row, ccc1a14d -> after, 60 and 120 Hz),
`fix-round/rep_guard_master.txt`, `fix-round/rep_guard_before.txt`. Only single test files were run; no e2e or GPU run.

## CHECK.md findings
1. Blocker (heel scrub): done.
   - (a) `src/anim/audit/metrics.ts` `contactSlide(heel, ball, contact, limit, up = 0.005)`: each point is measured
     over the frames it is down (within 5 mm of the lower point): the heel while it is down, the ball while it is down,
     both while flat. There is no projection; `footSlide` lost its lever. Used by the e2e-anim foot lock and turn block
     (`scripts/e2e-anim.mjs`), anim-audit (`scripts/anim-audit.mjs` ~884), the crab rows, `tests/footTurnHarness.ts`
     (`heelCm` / `ballCm`) and `tests/turnHarness.ts` (`heelSlide` / `ballSlide`).
   - (b) The planner (`src/anim/footPlanner.ts`): a planted foot turns about its contact. Toe up (> 0.05 rad) it turns
     on the heel: `pivotFeet` runs in the roll and `anchorFeet` moves the ball spot round the held heel. Otherwise it
     turns only with the heel >= 0.04 rad up. A flat foot never turns; the pivot raises the heel first, to at least
     0.1 rad (`TURN_ON`). The backstop (`twistCap`) anchors, then raises the heel 0.1 rad and turns about the ball,
     which covers pivot slider 0. Also: the turn step stays armed `BAND_TURN_TIME` after the rate last passed kRate
     (`rateT`; a 60 Hz spin's raw rate alternates 0 / 7.85 rad/s); walk / crouched walk `TURN_PIVOT.max` 1.2 -> 1.7;
     at a walk, no turn or rule step while the other foot's own clock swing is due (`otherDue`; fixed the 120 Hz jog 180
     backstop of 25-54 deg).
   - (c) `tests/turnFollow.test.ts`: twist bound is the measurement plus a margin: 0.45 rad body (max 0.42) and
     0.56 pelvis (0.53), was the backstop's own 0.54. Asserted: `r.scrub < 1e-6` and contact slide < 0.2 cm at 60 and
     120 Hz; remote parity at 60 Hz too.
   - (d) Held-spin harness rows: spin 0.75 / 2 / 3 / 4.2, crouch spin 0.85 / 2.1, remote spin 0.75 / 2 (`hz`, `remote`,
     `guard` options).
2. Spot gating: `spot = turnRule > 0 && stride 'velocity' && wallD NaN && v0 < SPOT_SPEED && (|yawRate| > 1 || turnT
   < BAND_TURN_TIME)` (the `turnT` latch lets the raised heels come down under the same rules). turnRule 0 = master:
   0 differing rows of 38 + 38 (60 / 120 Hz) and every guard row, byte-compared against dc4326a6's planner.
3. tuneStep crouched worstBehind: `> 0.49` and `<= thr - 0.05` (measured 0.52, thr 0.6).
4. Crouched lateral: single support stays +0.09 (max 18.3 cm at 120 Hz); new both-planted width bound <= master + 1 cm
   in every scenario at 60 and 120 Hz plus a crouched 180 flick (1.45 m/s). Planner: a foot left outside the band
   steps in when its partner lands; crouched band step margin 0.4 cm under the turn rules (`BAND_STEP_CROUCH`); a
   crouched landing is clamped to the band in the body frame. Crouched widths 19.6-20.2 cm (master 19.6; before 20.3 /
   20.1 / 23.9 at 120 Hz).
5. e2e turn block: slide < `L.FOOT_SLIDE` (1 cm, was 1.5); gap >= 5 cm (was 2); plantTurn <= 0.25 s at jog / run and
   snap <= 5 m/s now asserted. Harness on the same rows (60 Hz): contact 0.0, gap >= 7.0 cm, plantTurn <= 0.25 s, snap
   <= 4.89 m/s; `tests/footTurn.test.ts` asserts gap >= 5.
6. Guards: measured, not opted out (table below).
7. `TURN_STEP` -> `FOOT_TURN_STEP` (planner, tuneBakeTable paths, BAKE.md, animTuneBake.test, turnFollow import, hooks).
8. `tuneStep.ts:35` hook `turnOver`.
9. `studioFeet` clears `anchored` (`StudioFoot.anchored?`, `studioDrive.ts`).
10. Plain labels (`src/ui/tunerLayout.ts`): Turn step twist, Turn step trigger speed, Ball pivot amount, Ball pivot heel
    lift, Landing turn lead.

Course Ready's N4 inputs (harness rows): slow walk 0.75 m/s, start 90 slow (0.75), start 90 (2.1): contact slide master
6.8 / 12.0 / 11.9 cm -> 0.0 / 0.0 / 0.0 (HOLD_CONTACT covers the slow walk); start-turn twist at lift master 14.3
(held by the cap's scrub), ccc1a14d 21.2, now 14.3 deg.

REPORT-B correction: the planner with turnRule 0 reproduces master exactly; REPORT-A's "flat" column differs in 4 rows
because the harness's flat points changed (toe 11.6 -> TOE_BALL 12 cm): jog sweep 3 3.7 vs 3.6, jog sweep 7 8.2 vs
8.5, run sweep 7 7.4 vs 7.7, crouch(a) 90 3.8 vs 4.0.

## Harness, ccc1a14d -> after (per-point contact metric)
- Contact slide (heel while down, ball while down): 0.0 cm in every row at 60 and 120 Hz (max 0.007). ccc1a14d: 0
  except aim spot 180 (heel 2.6). Master, same metric, 60 Hz turns: 3.8-12.4 cm.
- turnHarness (raw driver yaw rate), 60 Hz, heel / backstop: spin 0.75 4.6 cm / 48 deg -> 0 / 0; spin 2 4.6 / 31.6 ->
  0 / 0; crouched spin 2.1 4.6 / 16 -> 0 / 0; remote spin 2 4.3 / 14.5 -> 0 / 0; remote crouched spin 2.1 2.4 / 8.1 ->
  0 / 0; pivot slider 0, spins 0.75-4.2: 3.3-8.0 cm -> 0 (the backstop turns on the ball). Every turnHarness row at 60
  and 120 Hz, local and remote: backstop 0.
- Twist at lift (60 Hz): spin 2 28.3 -> 14.3; spin 0.75 17.2 -> 14.3; stand turn 180 / L 26.0 -> 14.3; start 90 21.2 ->
  14.3; aim spot 90 / 180 unchanged 21.2 / 27.1. 120 Hz: jog 180 30.9 -> 14.3; stand turns 28.4 -> 14.3.
- footTurnHarness backstop: aim spot 180 11 -> 2 deg (60), 11 -> 1 (120); 120 Hz jog 180 54 -> 0; others 0.
- plantTurn: max 0.25 s at jog / run (60); 0.258 at 120 Hz jog sweep 3 (ccc 0.26, master 0.25); 120 Hz jog 180
  0.34 -> 0.21.
- snap: max 4.89 m/s (60 Hz jog 90 L); walk 180 4.17 -> 2.80, crouch spin 2.1 4.76 -> 2.67, spin 0.75 3.94 -> 2.12.
- Gap (pelvis frame, 60 Hz): >= 5.2 cm except remote spin 2 2.1 cm (ccc 8.0; one frame at the window edge). 120 Hz:
  jog sweep 3 -29.1 and spin 4.2 -12.8 cm (= ccc1a14d; master 8.0 / 7.0): open item 1.

## Guard rows (enemy driver; master turnRule 0 -> after; contact slide cm, master = max(heel, ball))
| Row | Contact slide | Other |
| --- | --- | --- |
| guard 0.9 90 | 10.3 -> 0 | twist at lift 14.3 -> 22.9 deg (ccc 24.1); snap 0.76 -> 15.2 m/s (60 Hz), 0.40 -> 13.1 (120) (= ccc) |
| guard 0.9 180 | 28.5 -> 8.9 | the ball still slides: the 11 cm reach-limit drag at a walk, where master scrubbed |
| guard 1.3 90 | 8.9 -> 0 | |
| guard 1.3 180 | 11.8 -> 0 | snap 5.84 -> 1.09 |
| guard run 3.2 90 | 6.6 -> 0 | |
| guard alert 1.3 180 | 12.5 -> 0 | |
| guard spin 1.3 | 9.6 -> 0 | |
| guard straight 1.3 | 6.8 -> 0 | |
The guard skeleton identity fixture is unchanged.

## Metrics switched to the contact point (PR body)
- e2e-anim foot locking (walk, jog, sneak, crouch run), anchored plants: ball spot (heel + 17 cm) -> each point over
  the frames it is down (`M.footSlide`); 1 cm unchanged; unanchored plants still the ankle.
- e2e-anim crab slide and anim-audit footSlideL/R: the same rule (`(anim-natural-n1 fix round)`); C.slide / FOOT_SLIDE
  unchanged.
- e2e-anim turn block: ball-spot slide < 1.5 cm -> per point < 1 cm; gap >= 2 -> >= 5 cm; plantTurn <= 0.25 s and snap
  <= 5 m/s asserted (were report only).
- Unit: turnFollow planted twist 0.54 -> 0.45 body / 0.56 pelvis; new turnFollow backstop ~0, contact < 0.2 cm,
  both-planted width <= master + 1 cm; footTurn backstop <= 15 -> <= 3 deg; footTurn contact < 1 cm per point at both
  rates; footTurn 120 Hz plantTurn <= 0.25 s + 1 frame; tuneStep crouched pinned to the measurement.

## Tests
Changed: footTurn.test, footTurnHarness, turnHarness, turnFollow.test, tuneStep.test, animCrabMetrics.test (a heel
swept round the ball reads ~5 cm, a turn on the heel reads 0), animTuneBake.test (rename). Fixture
`tests/fixtures/anim-skeleton-identity.json` re-captured: 2 entries moved (`state:aimRifle`, `partner:moves`; spot
gating and the remote spin); `keyed:skeleton_test` dropped again; the guard fixture did not move. Passing (single
files): footTurn (12), turnFollow (48), tuneStep, tunerLayout, animCrabMetrics, animTuneBake, footPlanner, both
identity tests, animStudio / 2, tuneV2Sections, tuneBakedReset, g1Locomotion, stepTwentyOneC, keyedWalk, keyedCrouch,
animRig, rig, tunerV3, tunerMouse, marlowT1a / T2 and 24 more anim / rig files; tsc clean, eslint 0 errors.

## Open (for the re-check)
1. 120 Hz crossing (on ccc1a14d already): jog sweep 3 and spin 4.2, an early aimClock toe-off's straight swing path
   crosses the planted foot on the tight arc; at the no-crossing window edge (25 cm along) the foot jumps up to ~37 cm
   sideways in one frame. Not at 60 Hz; the rig animates per render frame (the 60 fps cap holds on 90 / 144 Hz, 4.16.1).
2. Remote crouched flick 1.45 m/s (not in SCENARIOS): single-support lateral 27-29 cm vs master 12.
3. Swing-foot one-frame speed (not in CHECK): jog 180 at 120 Hz 87 m/s (ccc = now) vs master 13; crouch spin 2.1 at
   120 Hz now 100 vs ccc 14, master 78 (takeover jumps; master has others).
4. Guard 0.9 m/s: the 13-15 m/s first-swing-frame snap and the 11 cm drag.
5. anim-audit "render" column: aim spot 180 and spin 2 read 0.8 -> 2.9-3.1 cm (the audit's heel point, foot.len x 0.25
   behind at ankle depth, is not footGeom's heel, which the planner now turns about): check on the GPU sheets.
6. N0 pass 2 item 5 (Menu Notes, docs/anim-natural/PASS2.md): aimed turn on the spot, 90 deg in 0.28 s, planted feet
   swivel 51 deg and slide 4-5 cm (aim spot rows: twist at lift 21.2 / 27.1 deg unchanged).
