# Slices D+E: holstering, hang shimmy, drainpipe climb, ledge climb-up (playtest 2)

Prototype pass; every number a starting value (G10). Brief: `DE-BRIEF.md`. No wire change (PROTOCOL_VERSION
untouched): the climb-up's longer time rides in the replicated progress (`mv.ph`), and remotes use the same grip weight
functions (`attachGripWeight`, `climbUpFootWeight` in moveState.ts). Remotes still holster by the instant hand-off
(remoteAvatar.ts, unchanged): the draw / holster travel is local only, as before.

## Per note
1. D1 Holstering (built). The trigger hand stays on the gun for the whole draw and holster:
   - `CharacterRig.weaponTravel` (set by `WeaponModel.beginTravel`, cleared by `endTravel` / `hold` / `holster`): while a
     travel runs the rig holds the hand on the grip at weight 1 at once (`travelHold`, easing back to the graph's grip
     over 0.2 s after). The graph's grip channel heads for 1 too, still rate-limited, so e2e-anim's channel continuity
     holds. Before, the 5/s grip rate lagged the 0.145 s pistol travel and the gun floated ahead of the hand.
   - A draw waits in the slot until the wrist is within 0.13 m of the grip (or 40 % of the travel, `CATCH_DIST` /
     `CATCH_MAX`), then runs the rest of the path in the time left: the draw times are unchanged.
   - Swap clip hR keys follow the travel (out 0.06-0.38, in 0.5-0.8) instead of reaching the slot at 0.26 and holding
     0.5-0.6 (`travelKeys`, actions.ts); the sling hand-off keeps its old keys.
   - Rifle waypoint `TRAVEL_VIA.back` [0.28, 0.3, 0.08] -> [0.36, 0.15, 0.18]: out at the right shoulder, not beside the
     head. The turn is spread over the path (`TRAVEL_TURN` 0.6 -> 0.95; a draw from 5 %). The brief's x 0.32 / z 0.08
     put the rifle 2 cm into the trunk mid-draw (e2e-clip "aim walking + crouched" -2.0 cm, limit -2); at
     [0.36, 0.15, 0.18] it is -1.5 cm (baseline +1.0). Turning earlier was worse (-5.8), a larger out-step too (-1.9).
   - One ease: the path runs on one smoothstep in time (the curve is spatial only).
2. D2 Hang shimmy (partly). Ledge hands ±0.24 (was 0.22), slack 0.14 (0.12), reach 0.18 s (0.13), lead 0.8 (1), lift
   0.09 m and outward arc 0.08 m (0.05 / 0.06). A tie (both hands due at once, the start of a shimmy) now sends the
   trailing hand first (gripStepper.ts). pipeH: slack 0.16 (0.12), swing 0.2 s (0.15).
   Not reached: the brief's ~2 reaches a second one hand at a time. At the unchanged 1.2 m/s that needs ~0.7 m reaches
   per hand; every slower set tried (0.22-0.3 s reaches, one at a time or 55-65 % overlap, offsets ±0.24-0.29) left a
   waiting hand off its grip, drifting under the body or past the arm's reach (e2e-traverse grip reach 4-33 cm). The
   hands still step ~4-5 times a second per hand. Slower, wider hands need a slower shimmy: Michael's call (try 0.6-0.8
   m/s with offsets ±0.28, slack 0.24, reach 0.3 s, one at a time).
3. E1 Drainpipe climb (built, hands left alone). The knee pole points up as well as forward while climbing
   (`CLIMB_KNEE_UP` 0.5, ladder and drainpipe): the knee no longer flips when a raised foot's hip-ankle line runs along
   the level pole. A planted foot's CLIMB clip lift is capped so the sole stays 0.35 m under the hip joints' rest height
   (`CLIMB_FOOT_BELOW`). Drainpipe soles 0.08 m out from the wall (was 0.02). The brief's "no clip lift" and foot
   offR 0.3 / slack 0.16 lowered the feet so far the pelvis sank away from the hands (e2e-traverse drainpipe grip reach
   4-8 cm); the foot offsets stay 0.12 / 0.38, slack 0.2. Hands: not changed (anim-cleanup's palms; see the sheets).
4. E2 Ledge climb-up (built). `CLIMB_UP_TIME` 0.85 -> 1.1 s, three phases (ledge and the top of a drainpipe):
   - Root (`CLIMB_UP_PATH`): 1.2 m under the top by k 0.4 (chest to the lip: the root is the feet, so the brief's
     "lip - 0.3" put her shoulders 0.9 m above the lip with the hands 30-50 cm off it), on the top by 0.7; in over the
     top from 0.6 over 0.4, out from the face until 0.65 (an earlier step in put the ankles 4-12 cm into the wall,
     e2e-clip).
   - Hands (`CLIMB_UP_HANDS`, moveState.ts): on the lip through the pull-up and press, weight
     1 - smooth((k - 0.5) / 0.25) (was released from k 0). The brief's 0.6-0.9 left the hands 30-40 cm above the lip
     with weight 1 once she rose onto the knee (the arms are too short), so they let go as the knee comes on. The feet
     leave a drainpipe by k 0.4 (`climbUpFootWeight`; held with the hands they put the ankles 69 cm into the wall).
   - CLIMB_UP clip: pelvis down to -0.5 and pitched 0.55-0.6 for 0.6-0.78, the left knee over the lip at 0.58 with the
     shin flat on the top (fLZ -0.38, fLPitch 1.2) to 0.8, the right foot steps up 0.78-0.9, then stand.

## Also fixed
- B+C's `PELVIS_HOLD` (slow pelvis release with body speed) no longer applies with free feet (hanging, climbing): the
  shimmy's body speed held the drop. It did not change the e2e-traverse shimmy reach (below).

## Fix round 1
- BLOCKER, drainpipe pose (fixed). Cause: D2's tie rule in `gripStepper.ts` ("both limbs due at once: the trailing one
  goes first") judged "leading" by the sign of a limb's own offset. A drainpipe's hands (1.35 / 1.6) and feet (0.12 /
  0.38) have offsets of one sign, so both limbs counted as leading and neither ever let go: the grips stayed where she
  grabbed while the body climbed (probe: hand target fixed at y 1.32 while the root rose 0.5 -> 1.75 m), so she hung
  upright beside the pipe until the top. Not a harness artefact. The rule now applies only to limbs either side of the
  body (a ledge's hands, offsets of opposite sign); ladders and drainpipes step exactly as before this slice (the same
  contact numbers frame by frame as a clean build of the branch head). New unit test: offsets of one sign still step.
  e2e-traverse did not catch it: its drainpipe reach check measures planted hands after a plant, and there were none.
- report.json: mid-climb drainpipe frames 1.0-2.0 s now show both hands on the pipe, `geomMm` 0 (palm on the solved
  grip point). `targetMm` stays 88-94 mm on a correct climb and cannot go under 30: it is the palm's distance to the
  raw grip target (the pipe axis point the wrist IK is given), not to the pipe surface. A clean build of the branch
  head gives the same 88-94 mm (scratch run); the broken frames were 197-743 mm and growing.
- Team climb-ups: the boost, relay and rope-top climb-ups (teamController) keep the old one-rise clip
  (`CLIMB_UP_TEAM`). The rig latches `ledgeClimb` when a climbUp starts with the hands on world grips (a ledge or
  drainpipe hang, local or remote), and only then plays the knee-plant clip. No wire change.
- `rig.weaponTravel` is now derived from `rig.travelNode` (the node being carried): it counts only while that node is
  the held weapon, enabled and not disposed. `WeaponModel.setVisible(false)` mid-travel ends the travel, `dispose()`
  clears it.
- hang-shimmy-dense re-shot at 0.5-0.98 s (after the grab, during the reaches).
- Results, final build, solo on 4193: `npm run check` passes (156 files, 1753 tests, 1 skipped). e2e-clip ok, e2e-netmove ok (246 s), e2e-traverse
  only the old shimmy 3.3 cm, e2e-anim ok, e2e-ct-warehouse ok (the leg-up / boost suite with ctcourse and netmove), e2e-ctcourse ok (647 s; one
  earlier run timed out at station 7 "the client takes the rope" at 5 fps, x0.25 sim rate, and passed the solo rerun).
  (The first fix attempt, which also reordered ladders, failed e2e-netmove "ladder after a climb: ankleL 0.288";
  restricting the rule to ledges fixed it.)

## D2b Hang shimmy at 0.7 m/s (Michael's answer)
- Speed: `ATTACH.ledge.speed` 1.2 -> 0.7 m/s (attach.ts). tests/attach.test.ts states the new band; e2e-traverse reads
  the speed from the game (`ac.m.spec.speed`) for its band (0.71-1.08 x, as the old 0.85-1.3 at 1.2) and scales its
  timed walks along the lip (jump across, corner) by 1.2 / speed; the walk back past the drainpipe now drops off until
  free (at 0.7 m/s it could end mid-transfer, where one drop press waited).
- Hands, strictly one at a time, back to back: ±0.26 (was 0.24), reach 0.28 s (0.18), ~0.39 m per reach at full speed:
  ~1.8 reaches a second per hand (was ~5 at 1.2 m/s). Lift 9 cm and outward arc 8 cm kept.
  - New in gripStepper.ts: `leadTime` (the re-grip lands ahead by |speed| x 0.42 s, not by the slack: at full speed
    each hand lands ~0.1 m ahead of its spot, and a reach taken as she stops lands on its spot instead of past the
    arm's reach) and `alternate` (once a hand lands the other goes as soon as it trails 2 cm, so the reaches run back
    to back instead of a waiting hand drifting a whole reach). A hand ahead of its spot never steps while moving. The
    first reach after a grab runs at twice the pace, so the other hand is not left behind while the body speeds up.
  - Slack 0.08 (only the first reach and a restart wait on it). The brief's slack 0.22-0.26 left the waiting hand at
    the start ~0.35 m off its spot, under the body (e2e-traverse reach 4-7 cm).
  - Planted hands stay between -0.42 and +0.40 m of the body (new unit test), against ~0.34 / 0.42 before.
- e2e-traverse "shimmy: hands reach their grips": fixed, not relaxed: 1.6 cm (limit 3; was 3.3). The 3.3 cm was the
  leading hand left planted from the grab while the trailing one reached: at the start both hands reached their slack
  together and one waited a full reach. The quick first reach fixes it.
- Ladders, drainpipes and pipes are unchanged (`alternate` and `leadTime` are set on ledges only).
- Sheets: `traverse/hang-shimmy-dense-0.6..1.4` (after the grab, both hands alternating every ~0.3 s; one hand up and out
  at a time) and hang-shimmy-0.5/1.2/2.2.
- Results (final build, solo on 4193): `npm run check` passes (156 files, 1753 tests, 1 skipped);
  e2e-traverse ok (50 s, every check, shimmy 0.68 m/s, reach 1.6 cm), e2e-clip ok, e2e-ctcourse ok (649 s), e2e-netmove ok
  (248 s), e2e-coop ok (205 s). No wire change (speed and hands are shared code).

## Files
src/weapons/weaponModel.ts, src/anim/animGraph.ts, src/anim/clips/actions.ts, src/anim/clips/traverse.ts,
src/player/characterRig.ts, src/player/attachGrips.ts, src/player/gripStepper.ts, src/player/attachController.ts,
src/player/moveState.ts, src/net/remoteAvatar.ts, tests/gripStepper.test.ts (new ledge test), scripts/anim-cleanup/
traverse-shots.mjs (dense moves hang-climb-dense, hang-shimmy-dense, drainpipe-dense), CHANGELOG.md.
TESTING.md: no ct-prototype section, nothing added.

## Results
- tsc clean; eslint: no new problems (41 warnings, all existing). `npm run check` passes after the last change
  (156 files, 1752 tests, 1 skipped). Unit: gripStepper (new ledge test), attach, moveState, drawState, handHold, rig,
  animAudit, anim pass.
- e2e on 4193, one at a time, final build: e2e-anim ok, e2e-clip ok, e2e-weapons-carry ok, e2e-ctcourse ok (637 s
  solo; station 2 ledge hang passes), e2e-coop ok (214 s), e2e-netmove ok (247 s), e2e-menus ok (200 s solo).
- e2e-traverse FAIL at "shimmy: hands reach their grips (3.3 cm, limit 3)": pre-existing. The same 3.3 cm on a clean
  build of the branch head (82c8c6cb) and of the commit before B+C (763a6d0c^), and with the old ledge numbers on this
  build. With that one check relaxed (a scratch copy) everything else in the suite passes on this build, including
  the drainpipe climb, its climb-up (y 3.62) and the ledge climb-up (y 2.32).
- e2e-pad: FAIL (KNOWN FLAKY) "stick 50 / 80 / 100% -> speeds 3 / 4 / 5 (2 / 4 / 5)" solo; the same failure on the clean
  branch-head build, so not from this slice.
- e2e:quick (two at a time, before the last climb-up retune): smoke, anim, anchors, clip, combat, ct, gadgets, move,
  wall, weapons-carry, netmove ok; enemies report only; ctcourse killed at 900 s under load (all stations to 7 ok),
  coop timed out under load (x0.08 sim rate), both pass solo; e2e-stealth failed under load and once solo ("pitch
  follows look input", a wall-clock wait), then passed two solo reruns (it passes on the clean build too).
  e2e:quick was not re-run after the last climb-up change; the suites it touches (traverse, clip, ctcourse, coop,
  netmove) were, solo.

## Sheets
E2E_GPU=1 on this PC, after only (no before sheets: making them needs the old code, and git stash is not allowed).
Before: `docs/archive/anim-cleanup/audit/` (draw-front34, drawpistol-front34, holster-front34, holsterpistol-front34) and
`docs/archive/anim-cleanup/audit/traverse/` (drainpipe-*, hang-shimmy-*, hang-climb-*, pipe-hands-*).
After: `docs/ct-prototype/shots/de/`: draw-front34, draw-side, drawpistol-front34, holster-front34, holster-side,
holsterpistol-front34; `traverse/`: drainpipe-*, drainpipe-dense-1.0..2.0 (wider camera), hang-shimmy-*,
hang-shimmy-dense-*, hang-climb-*, hang-climb-dense-0.6..1.7, pipe-hands-*, report.json (palm contact per frame).
Looked at: the draw takes the rifle off the back with the hand and swings it past the right shoulder; the pistol comes
out of the holster in the hand; the holster's hand now peaks about chin height (before: forehead). The climb-up shows
a kneel on the top at 1.2 s. Drainpipe: no leg flip; the hands sit on the pipe at chest height.

## Still off / try on /ct/
- Draw and holster the rifle and pistol standing, crouched and walking: the hand should stay on the gun; the rifle
  should pass the right shoulder, not the ear. The rifle passes close to the back (-1.5 cm in the clip check).
- Shimmy along a ledge: wider and a little slower, but still quick at 1.2 m/s (see D2).
- Drainpipe up and down: knees bend up and towards the wall; feet below the hips.
- Ledge climb-up and the climb-up off the drainpipe top: pull up, knee, stand. 1.1 s may feel long; the hands let go
  as the knee comes on (not after).
- e2e-traverse "shimmy: hands reach their grips" fails at 3.3 cm on the branch head and before B+C (763a6d0c^), so
  older than this slice: the hands at the start of a shimmy, not the new numbers (same 3.3 cm with the old ones).
