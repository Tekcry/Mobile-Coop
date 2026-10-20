# Slice 2 report: standing holstered locomotion (A4) + M6

Implementer (Opus), 2026-10-20 18:40-19:40, uncommitted in `feature/ct-prototype` (base 988788bc, then the job lead's
fast-forward to 2be56fc3 / anim-rig #47). Scope: STATE A4 (standing, holstered) plus Michael's M6 (19:00).

## What was built
- **One keyed speed blend** (`AnimGraph.keyedSet`, `KEYED_GAITS`): holstered standing plays keyed `walk` -> `jog` -> `run`
  cross-faded by effort pace (walk to 2.1 m/s, jog ~2.6-3.3, run from ~3.8), on the gait phase. Stride and cadence stay
  the planner's from the ground speed. Track, knee pole, duty and lift blend with it. `mixKeyed` (pure) blends poses.
- **Keyed idle** (`idle`, 12 s cycle `KEYED_IDLE_PERIOD`): 3 slow breaths, weight shift each way (1.2 cm), a head scan
  each way (18 / 15 deg), arms along the sides, feet hip width. Plays from the first frame still (was frozen 2 s). Stops
  blend into it by the still share.
- **New keys** (hand keyed, real-world standard, never traced): `walk` re-keyed (upright, legs add 3 deg, pelvis yaw 2,
  arms hanging, knee pole -0.03), `jog`, `run` (elbows 80-95 deg close to the ribs, abd 4, lean only in the run),
  `idle`. Baked headless in Blender 5.2.2 (`scripts/anim-keys/build.mjs`).
- **The wide walk's root cause**: `FootPlanner.aim` pushed every landing 13 cm (`PLANNER.minGap`) from the other foot, so
  the left foot always landed 7.7 cm out whatever the clip said. Now `FREE_GAP` 0.85 x the stance width (standing).
- **Planner fixes**: standing planted feet are not scrubbed through turns / direction changes (the scrub only after 0.5 s
  of continuous spin, `SPIN_SCRUB`; crouched keeps G1); standing band 0.03-0.09 m (`standMin/MaxLateral`); a clock swing
  waits while the other foot is still in the air at a walk (no two-foot hop turning from a standstill); a toe-off rule
  never fires with the other foot airborne at a walk; heel rise capped 6 rad/s (`HEEL_RISE`; the start slide).
- **Rig**: knee bow-out rule under the keyed set bows only a swinging leg, gently (`KEYED_KNEE_BOW` 2.5); a swinging
  leg's knee pole stays near the pelvis forward (`KNEE_SWING_SHARE` 0.15); the look-at keeps its neck yaw over the
  keyed neck; hips trail the chest in turns (`PELVIS_FOLLOW_MAX` 0.05 -> 0.35 rad).
- **M6**: run 4.5 -> 4.0 m/s (`GEARS.stand`, `CT.turnSlowTo`); steps `0.3 + 0.24 v` capped 1.3 m (walk 0.3 + 0.2 v,
  crouched unchanged): 2.4 steps/s at 1.4 m/s (was 2.6), 3.2 at the run (was 4.7); no lean below the run; legs near
  vertical (knees 0.75 x hips, was 0.97); arms parallel to the body, swing grows with pace. M6.5 (weight) not done.
- **Idle stance** `IDLE_STANCE` extra 0.065 -> 0 (hip width), lead 0.05 -> 0.04.
- Drawn states (low ready, aiming): unchanged path (old walk band, procedural jog / idle; slice 3). Hot paths allocate
  nothing. No wire change (PROTOCOL_VERSION 24): remotes run the same graph from speed / crouch and their own clock.

Clip values (1.75 m): walk duty 0.54 lift 0.075 kneeOut -0.03 half 4.7 cm; jog 0.44 / 0.17 / -0.045 / 4.9; run 0.40 /
0.22 / -0.045 / 4.5; idle half 8.6 cm.

## Metrics (e2e-anim, `CRAB_STATES=1 CRAB_JSON=1`, desktop, port 4191, holstered standing)
Before: dist of 17:03 (pre-slice code, old LODs). After: this tree. The before run measured whatever weapon state the
earlier aim checks left (low ready), so its jog / run / idle elbows are the drawn arms; the after run holsters first
(`crabRecord` now calls `stance.holster()`, the fix that makes the suite measure holstered).

### Before
| gait / state | m/s | knees x hips mean (min-max) | track cm mean (min to max) | knee out cm | slide cm | elbow cm | out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| walk | 1.45 | 0.97 (0.92-1.02) | 6.6 (4.9 to 9.2) | 2.8 | 0 | 8.1 | track, elbows |
| jog | 3 | 1.28 (1.18-1.4) | 8.3 (6.6 to 11.1) | 3.2 | 0 | 11.2 | knees, track, knee-out, elbows |
| run | 4.5 | 1.34 (1.21-1.48) | 8.4 (6.4 to 12) | 3.8 | 0 | 11.6 | knees, track, knee-out, elbows |
| speed 1 idle | 0 | 1.16 (1.16-1.16) | 9 (8.4 to 9.5) | 1.4 | 0 | 8 | knees, elbows |
| speed 1 start | 0.58 | 1.3 (1.13-1.51) | 12.6 (5.1 to 16.1) | 2.4 | 0 | 7.9 | knees, track, elbows |
| speed 1 straight | 0.75 | 0.94 (0.91-0.97) | 6.7 (5 to 8.6) | 2.4 | 0 | 7.9 | track, elbows |
| speed 1 stop | 0.04 | 0.94 (0.92-0.98) | 6.6 (5.2 to 7.8) | 2.1 | 0 | 8 | track, elbows |
| speed 1 turn round (standstill) | 0.39 | 1.27 (1.06-1.47) | 13.8 (5 to 15.1) | 2.6 | 0 | 8 | knees, track, elbows |
| speed 1 90 deg change | 0.72 | 0.99 (0.49-1.13) | 7 (5.1 to 11.7) | 3.3 | 0 | 7.9 | knees, track, knee-out, elbows |
| speed 1 180 deg change | 0.51 | 0.9 (0.86-0.96) | 6.1 (5.1 to 6.5) | 2.5 | 0 | 7.9 | elbows |
| speed 2 idle | 0 | 1.24 (1.24-1.24) | 10.4 (9.8 to 11) | 0.6 | 0 | 8 | knees, track, elbows |
| speed 2 start | 1.08 | 1.24 (0.98-1.53) | 10.6 (4.9 to 16.2) | 2.8 | 0 | 8 | knees, track, elbows |
| speed 2 straight | 1.4 | 0.96 (0.91-1.01) | 6.6 (4.9 to 9.2) | 2.6 | 0 | 8.1 | track, elbows |
| speed 2 stop | 0.08 | 0.94 (0.92-1) | 6.5 (5.2 to 9.2) | 2.7 | 0 | 8 | track, elbows |
| speed 2 turn round (standstill) | 0.39 | 1.27 (1.06-1.47) | 13.8 (5 to 15.1) | 2.6 | 0 | 8 | knees, track, elbows |
| speed 2 90 deg change | 1.34 | 0.99 (0.85-1.69) | 7.4 (4.7 to 14.2) | 9.1 | 9.7 | 8 | knees, track, knee-out, slide, elbows |
| speed 2 180 deg change | 1.2 | 1.03 (0.63-1.75) | 7.6 (4.7 to 14) | 10.2 | 9 | 8 | knees, track, knee-out, slide, elbows |
| speed 3 idle | 0 | 1.24 (1.24-1.24) | 10.4 (9.8 to 11) | 0.6 | 0 | 8 | knees, track, elbows |
| speed 3 start | 1.63 | 1.2 (0.92-1.53) | 9.8 (5 to 16.3) | 2.8 | 0.7 | 8 | knees, track, elbows |
| speed 3 straight | 2.1 | 0.99 (0.92-1.08) | 6.7 (5 to 9.9) | 2.8 | 0 | 8.1 | track, elbows |
| speed 3 stop | 0.12 | 0.96 (0.92-1.05) | 6.8 (5.7 to 9.2) | 2.1 | 0 | 8 | track, elbows |
| speed 3 turn round (standstill) | 0.39 | 1.27 (1.06-1.47) | 13.8 (5 to 15.1) | 2.6 | 0 | 8 | knees, track, elbows |
| speed 3 90 deg change | 2.02 | 0.92 (0.14-1.49) | 6.5 (4.4 to 10.3) | 10.5 | 3.6 | 8.1 | knees, track, knee-out, slide, elbows |
| speed 3 180 deg change | 1.8 | 1.08 (0.2-2.15) | 7.8 (4.4 to 14.4) | 14.7 | 9.4 | 8.1 | knees, track, knee-out, slide, elbows |

### After
| gait / state | m/s | knees x hips mean (min-max) | track cm mean (min to max) | knee out cm | slide cm | elbow cm | out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| walk | 1.45 | 0.75 (0.7-0.81) | 4.4 (3.5 to 5.7) | 2.4 | 0 | 2.7 | in |
| jog | 3 | 0.76 (0.64-0.89) | 4.4 (3.7 to 6) | 2.2 | 0 | 2.5 | in |
| run | 4 | 0.74 (0.6-0.89) | 4 (3.3 to 5.9) | 2.5 | 0 | 2.5 | in |
| speed 1 idle | 0 | 1.02 (1.02-1.02) | 8.9 (7.7 to 10.2) | 0.5 | 0 | 2.3 | in |
| speed 1 start | 0.58 | 0.9 (0.86-0.98) | 7.5 (4 to 9.2) | 2.3 | 0 | 2.4 | track |
| speed 1 straight | 0.75 | 0.75 (0.73-0.77) | 4.3 (3.7 to 5.3) | 2.4 | 0 | 2.4 | in |
| speed 1 stop | 0.04 | 0.77 (0.76-0.78) | 4.5 (3.5 to 5.4) | 2.6 | 0 | 2.2 | in |
| speed 1 turn round (standstill) | 0.39 | 0.9 (0.82-0.98) | 7.9 (7.1 to 9.5) | 2 | 0 | 2.4 | track |
| speed 1 90 deg change | 0.72 | 0.81 (0.58-0.98) | 5 (2.7 to 9.5) | 3.7 | 0 | 2.8 | track, knee-out |
| speed 1 180 deg change | 0.51 | 0.74 (0.72-0.76) | 4 (3.8 to 4.5) | 2.4 | 0 | 2.4 | in |
| speed 2 idle | 0 | 0.99 (0.98-1) | 8.3 (7.1 to 9.5) | 0.8 | 0 | 3.7 | in |
| speed 2 start | 1.09 | 0.86 (0.75-0.98) | 6.5 (3.6 to 9.4) | 2.3 | 0 | 2.5 | track |
| speed 2 straight | 1.4 | 0.76 (0.7-0.81) | 4.4 (3.5 to 5.7) | 2.5 | 0 | 2.5 | in |
| speed 2 stop | 0.08 | 0.85 (0.77-0.88) | 6 (4.4 to 8.4) | 2.3 | 0 | 2.1 | track |
| speed 2 turn round (standstill) | 0.39 | 0.9 (0.82-0.98) | 7.8 (7.1 to 9.5) | 2 | 0 | 2.4 | track |
| speed 2 90 deg change | 1.35 | 0.8 (0.6-1.37) | 4.7 (-0.5 to 11.4) | 6.3 | 0 | 2.5 | knees, track, knee-out |
| speed 2 180 deg change | 1.19 | 0.85 (0.64-1.33) | 5.5 (0.5 to 10.8) | 5.4 | 0 | 2.5 | knees, track, knee-out |
| speed 3 idle | 0 | 0.99 (0.98-1) | 8.3 (7.5 to 9.1) | 0.6 | 0 | 3.6 | in |
| speed 3 start | 1.62 | 0.85 (0.73-0.98) | 6.2 (3.3 to 9.6) | 2.5 | 0 | 2.6 | track |
| speed 3 straight | 2.1 | 0.77 (0.71-0.84) | 4.3 (3.3 to 6.2) | 2.5 | 0.6 | 2.6 | in |
| speed 3 stop | 0.12 | 0.79 (0.74-0.79) | 4.8 (3.3 to 5.2) | 2.4 | 0 | 2.6 | in |
| speed 3 turn round (standstill) | 0.39 | 0.9 (0.82-0.98) | 7.9 (7.5 to 9.1) | 2 | 0 | 2.4 | track |
| speed 3 90 deg change | 2.02 | 0.7 (-0.13-0.94) | 3 (-11.6 to 8.9) | 13.4 | 0 | 2.6 | knees, track, knee-out |
| speed 3 180 deg change | 1.79 | 0.75 (-0.07-0.98) | 3.5 (-12.3 to 10.8) | 12.3 | 0 | 2.6 | knees, track, knee-out |

Ranges: knees 0.5-1.1, track <= 7 cm (idle / start / stop <= 10.5, `CRAB_IDLE`), knee out <= 3, slide < 1, elbows <= 6.

## Gates
- `CRAB_GATES.walk / jog / run` on (all in: knees 0.74-0.76, track max 5.7-6.0, knee out 2.2-2.5, slide 0, elbows 2.5-2.7).
- New `CRAB_STATE_GATES` (asserted on every e2e-anim run, speeds 1-3): idle, start, straight, stop, turn round on;
  90 / 180 changes report-only. `CRAB_STATE_CHECKS`: a turn asserts everything but the track (the pelvis frame turns
  under a planted foot, METRICS.md). New range `CRAB_IDLE` (track 10.5 cm): the idle is a hip-width stance, a start
  leaves from it, a stop settles into it.

## Tests changed
- `keyedWalk.test.ts`: holstered set covers jog / run / idle, drawn keeps the band; continuous blend (no pop); jog / run
  elbows bent >= 70 deg and in; `mixKeyed`; walk asserts moved to M6 (no forward carry, track <= 5 cm, swing <= 0.35 m,
  pelvis yaw > 1.4 deg, rig arm error 3.5 cm).
- `g1Locomotion.test.ts`: steps / cadence (M6), run 4.0, idle feet 0.16-0.24 m apart (was CT 0.3-0.4), first landing
  0.35 s.
- `turnFollow.test.ts`: `PELVIS_FOLLOW_MAX` <= 0.35; standing spins: gaps 3 cm, planted lateral <= 0.32 m (see open
  items), crouched unchanged. `animRig.test.ts`: the format fixture now samples a frozen G8 walk
  (`tests/fixtures/keyedWalkG8.ts`). `analogGear`, `speedGears`, `animAudit`: run 4.0 literals. `animCrabMetrics`:
  the gates. `scripts/e2e-anim.mjs` (holster, state gates, run reach 3.8), `scripts/e2e-pad.mjs` (100 % stick > 3.5).

## Checks
| check | result | time |
| --- | --- | --- |
| vitest (related files during work) | pass | - |
| e2e-anim before (CRAB_STATES) | pass | 23 s |
| e2e-anim after (CRAB_STATES), gated | pass, 135 ok | 20 s / 14 s |
| `npm run check` (lint 0 errors, 184 files / 2029 tests, build) | pass | 87 s |
| `npm run e2e:quick` (4191, E2E_JOBS=2) | 9 ok; e2e-move FAIL (two 4.5 m/s literals: fixed), e2e-stealth FAIL (look input, wall-clock, STATE known), e2e-pad KNOWN FLAKY | 253 s |
| solo reruns | e2e-move pass (after the fix), e2e-stealth pass, e2e-pad pass | 53 / 27 / 189 s |
| Blender bakes (walk, jog, run, idle) x 3 rounds | ok | ~1 min each round |
| GPU sheets (4189, 14 before + 14 after) | ok | ~2.5 min each set |

Not run (the job lead sends them): e2e-ctcourse, e2e-coop, e2e-netmove (laptop). They read the run speed only through
`GEARS` (grep found no 4.5 literal), but the speed cap (4.0) and the narrower stance reach them.
The desktop lock was shared: Course Ready overwrote it during my check run (19:26) and my batch deleted the file at the end
(19:31); their bake was ~1 min, but tell them.

## Files changed
src: `anim/animGraph.ts` (keyedSet, KEYED_GAITS, KEYED_IDLE_PERIOD, IDLE_STANCE), `anim/keyed.ts` (mixKeyed),
`anim/footPlanner.ts` (FREE_GAP, stand band, SPIN_SCRUB, HEEL_RISE, the swing wait, the toe-off guard),
`anim/turnFollow.ts` (PELVIS_FOLLOW_MAX, KNEE_SWING_SHARE), `anim/motion.ts` (WALK_STEP, CROUCH_STEP),
`anim/audit/limits.ts` (gates, CRAB_IDLE, CRAB_STATE_*), `player/characterRig.ts` (keyed knee bow, swing pole, neck
look), `config/movement.ts` (run 4.0, steps), `anim/clips/keyed/{walk,jog,run,idle}.ts` (generated).
Keys: `scripts/anim-keys/keys/{walk,jog,run,idle}.json`. Scripts: `e2e-anim.mjs`, `e2e-move.mjs`, `e2e-pad.mjs`,
`anim-sheet.mjs` (scenarios idle, turnround, change90). Tests: listed above plus `tests/fixtures/keyedWalkG8.ts`.
Docs: this report, `METRICS.md`, `CHANGELOG.md` (Unreleased - anim-rework), `TESTING.md`,
`docs/systems/{movement,world-and-characters,input-and-loop}.md`.

## Sheets (`docs/anim-rework/shots/s2/`, before over after, gameplay camera `-ots` and side `-side`)
idle, walk, jog, run, start, turnround (180 from a standstill), change90 (at ~2 m/s). "Before" was rendered on the 17:03
dist, i.e. the old Wren LODs (before anim-rig #47's toe weights); "after" on this tree with the new LODs.

What Michael should look at on /ct/ (holstered, standing): push the stick slowly to full (walk -> jog -> run, no pop, the
lean only at the run, fewer longer steps); the legs from the front (knees and feet under the hips); the arms (along the
sides, no zombie reach); stand still 12 s (breathing, weight shift, head scan); starts, stops, a turn round from a
standstill (no hop, no slide).

## Open items / not done
- 90 / 180 deg direction changes at 1.4-2.1 m/s: slides are gone (4-10 -> 0 cm), but for a few frames the knees open to
  1.3-1.4 x and a knee reads 5-13 cm outside its ankle, and at 2 m/s the feet cross in the pelvis frame. Cause: the
  450 deg/s travel turn (G25 / G33, not ours to change) turns the hips past a planted foot faster than two steps can
  follow. Next: a plant-and-pivot step for the outside foot, or the pelvis held over the plant foot through the turn.
- Pure-planner spins (turnFollow harness, tight 450 deg/s circles at 2-4 m/s): with no scrub in the first 0.5 s a planted
  foot sits up to 0.3 m out before it steps (bound relaxed, crouched unchanged). Not seen in e2e.
- The idle track reads 8.3-8.9 cm mean, max 10.2 against 10.5: near the edge (the feet keep the stance they stood in).
- Weight (M6.5), the procedural bank in run turns under the keyed trunk (lost; keyed trunk replaces it), drawn states.
- Michael's eye: the walk arms now hang straight (M6.4); if they read stiff, the next pass adds a little elbow bend.

## STATE draft (for "Now")
- Slice 2 implemented (uncommitted, `S2-REPORT.md`): holstered standing keyed walk / jog / run as one speed blend and a
  keyed idle; M6 folded in (run 4.0 m/s, longer steps, no lean below the run, legs under the hips, arms along the
  sides). The wide walk was the planner's fixed 13 cm landing gap (fixed). CRAB_GATES walk / jog / run on; state gates
  idle / start / straight / stop / turn round on; 90 / 180 changes report-only (knees open at 1.4-2.1 m/s).
- Checks: npm run check pass; e2e:quick pass after the e2e-move literal fix (e2e-stealth solo pass, e2e-pad flaky solo
  pass). Next: independent check, laptop e2e-ctcourse / e2e-coop / e2e-netmove, Michael on /ct/ with
  `shots/s2/`.

## Fix round (after the independent check passed 6546a1ca)
| item | change |
| --- | --- |
| 1. idle head scan invisible | the graph outputs `RigTargets.keyScan` (the keyed idle neck's body yaw x the idle share); the rig adds it to the world-stabilised head yaw only standing holstered still, so the aim and look still drive the head everywhere else |
| 2. hip follow and swing knee pole leaked | `PELVIS_FOLLOW_MAX` back to 0.05 (crouched, drawn) and `PELVIS_FOLLOW_KEYED` 0.35, blended by the new `RigTargets.keyHol` (standing holstered on foot); `KNEE_SWING_SHARE` blended by `keyHol` too (0.5 elsewhere, as before) |
| 3. stale comment | `turnFollow.ts` doc matches the values |
| 4. idle track margin | idle keys narrower (legs add 1.2 deg, half 7.6 cm at 1.75 m; weight shift 0.9 cm), `IDLE_STANCE.extra` -0.015 standing holstered only (0 for drawn and the hostage hold: g7CloseQuarters feet stay apart); e2e-anim's crab recordings now start from a fresh stance (the speed 1 idle read the sneak's leftover feet) |
| 5. arm error bound | one-line reason at `keyedWalk.test.ts` |

Tests: `keyedWalk.test.ts` new "idle head scan reaches the head (keyScan) and the standing holstered weight (keyHol)"
(scan 0.2-0.4 rad still holstered, 0 walking / drawn, keyHol 0 drawn / crouched); `turnFollow.test.ts` back to
`PELVIS_FOLLOW_MAX <= 0.05` plus the keyed cap; `turnHarness.ts` models the holstered player's cap standing.

Results (desktop, lock held with noclobber):
| check | result | time |
| --- | --- | --- |
| `npm run check` | pass, 2030 tests | 85 s |
| `CRAB_STATES=1` e2e-anim + e2e-move (4191) | both pass | 68 s |

After the fix (holstered standing): idle track max 6.8 / 9.2 / 9.1 cm at speeds 1-3 (limit 10.5: 1.3 cm or more margin),
knees 0.85-0.99; start, stop and turn round all in range including the track; walk / jog / run unchanged; 90 / 180 deg
changes unchanged (open, as agreed), the planner-only spin bound unchanged (open).

### STATE draft (fix round)
- Slice 2 fix round done (uncommitted): the idle head scan reaches the head; the hip follow and swing knee pole are
  standing holstered only (crouched and drawn as before); the idle feet narrower (1.3 cm margin). npm run check pass;
  e2e-anim (CRAB_STATES) and e2e-move pass. Open: 90 / 180 deg changes at 1.4-2.1 m/s, the planner-only spin bound.
