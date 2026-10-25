# anim-fix-pass: PR #247 CI fix (run 39933387046, 13 unit tests in 8 files)

Opus triage + fix agent, 2026-10-23 ~21:15-22:00. Branch head before: e70951e3. Fix commit: 0448c359.

## Branch red or master red?
- Branch head e70951e3 as is: the same 13 tests fail with the same numbers as CI (mocapStrafe passed locally).
- Scratch merge (e70951e3 + origin/master 33fff449 = 4.82.0, throwaway worktree, removed): identical results. Master
  4.82.0 touches no anim / player / ai code (`git diff bbd49206 origin/master` in src: lights, net UI, sector modes).
- Bisect over the slice merges (footTurn, turnFollow, g1Locomotion, mocapGuards): green at 44ed5389 (AF0/1/2/5),
  20a67cd7 (+AF4a), 1617d678 (+AF6); red from 236601dc (+AF3); g1 row 4 red from 3168f31a (+AF4b).
  The AF3 / AF4b checkers did not run these files (their reports list other files).
- Verdict: branch already red, caused by AF3 and AF4b. Nothing from master.

## Cause per file, decision, fix
| File / test | Cause | Intended? | Fix |
| --- | --- | --- | --- |
| animSkeletonGuardIdentity (grunt:crouchAim hash) | AF3 KEYED_CROUCH_POSE (walk lean 0.12 -> 0.18, `back` 0.10) and CROUCH_STEP reach guards: every graph applies them, and the graph's gait clock calls `gaitRate(..., MOVEMENT)` on guards too | No: AF3 / BRIEF P2 is Wren's crouch walk; no slice names guards; mt2-guardgate and anim-bake-1022 ("Wren's rows never touch guards") | Gate (below). Fixture untouched |
| guardPoseGolden (grunt:crouchAim:60 0.115) | same | No ("Never re-capture") | Gate. Fixture untouched |
| mocapGuards identity 64/64 (8 crouchAim moved) | same | No | Gate. Fixture untouched |
| guardHeadParity T1 crouch walk 1 (head yaw 0.7: 8.9-10.9 cm vs 5) | same: the guard rig's crouch walk moved its head off the perception sim's | No (gameplay reads the guard head) | Gate |
| footTurn crouch spin 0.85 (cap 7.5 deg vs 0.5 / 3, lift 30.9 vs 30) | AF3 CROUCH_STEP k 0.2 -> 0.115 raises the crouched linear cadence; `gait.turning = smoothstep(angRate / linRate - 0.5)` then reads less turn at the spin's entry (yaw rate 1.4-3.2 rad/s), the duty stays long, a rule step lifted the right foot 3 frames after it landed and the left foot stayed planted 1.03 s through the spin into the twist cap | Cadence yes (AF3, BRIEF A3); the turn-share side effect no | linRate (the turn share's reference) on the pre-AF3 line |
| turnFollow crouched spin 2.1 (planted twist 0.517 vs 0.45) | same: at 2.1 m/s x 7 rad/s turning 0.90 (was 1), longer turning stance | Side effect, no | same line |
| g1Locomotion row 7 (stepLength(2, crouch 1) 0.565 vs 0.7) | pins the old crouched line | Yes: AF3 CROUCH_STEP (BRIEF A3 undo line names it) | Test pins AF3's line `0.3 + 0.115 v + 0.35 (v - 1.9)` |
| g1Locomotion row 4 (kneel side from the lead, armed default input) | AF4b: an armed rig kneels on the gun hand's knee (P4 "pistol shifts between knees") | Yes for Wren (AF4b); no for guards | Test: the lead rule holstered (AF4b keeps it) and for a guard (mocapOk false); new assert: armed Wren kneels on the gun-hand knee |
| mocapStrafe aimed strafe alloc | load-sensitive, pre-existing; passed locally on head, merge and fix | n/a | none (note only) |

## The gate (src/anim/animGraph.ts, src/anim/motion.ts)
- `AnimGraph.afRig = i.mocapOk || this.wrenReady` each frame: a Wren rig (player, partner, studio / menu puppets:
  `CharacterRig.tuneRows`) or a carrier / bare graph. Guards (`buildEnemyRig`: carrier false, no tuneRows) are not.
  mocapOk alone was not enough: the player identity harness and drawHarness drive Wren rigs with carrier false
  (animSkeletonIdentity, bodyMotion, crouchStrafe pop test went red with it).
- Gated on afRig (non-Wren rigs exactly as before AF3 / AF4b): crouchSet lean / hips-back (`dw` path: leanD, no back),
  the graph clock's crouched step line (`CROUCH_STEP` vs new `CROUCH_STEP_GUARD` = the pre-AF3 `{ k 0.2, runK 0 }`,
  through a new trailing `cs` parameter on `stepLength` / `gaitRate`, default CROUCH_STEP), and AF4b's armed kneel
  side, armed wall lean, crouched wall carry (`gs`), PISTOL_REACH_CROUCH and CROUCH_GUN.pistol (`pck`).
- `gait.turning` reads linRate on CROUCH_STEP_GUARD for every rig; cycleTime and the phase keep AF3's cadence; with no
  yaw rate turning is 0, so straight crouched gaits (AF3's bars) are unchanged (animFixPass, mocapCrouch pass).
- Tried and dropped: a crouched rule-step window look-ahead in footPlanner (fixed footTurn, not turnFollow, and moved
  heavy:crouchWalk in the guard golden).
- No fixture regenerated, no threshold changed. src/ai, src/net and the save shape untouched.

## Numbers (before -> after, fix commit)
- crouch spin 0.85 (footTurn): cap 7.50 -> 0 deg, twist at lift 30.9 -> <= 30 (14.3 with the old line).
- crouched spin 2.1 (turnFollow): planted twist 0.517 -> <= 0.45 rad.
- Guard fixtures: identity 56/64 -> 64/64; golden grunt:crouchAim:60 0.115 -> < 1e-4; guardHeadParity T1 crouch walk
  8.9 / 10.9 / 9.3 cm -> <= 5 cm.

## Tests (desktop, single files, one at a time, on the fix)
The 8: animSkeletonGuardIdentity 1 (+1 skipped), footTurn 14, g1Locomotion 13, guardHeadParity 165, guardPoseGolden 1
(+1 skipped), mocapGuards 3, mocapStrafe 12, turnFollow 48: all pass.
Regression set: crouchStrafe 16, animSkeletonIdentity 1 (+1), bodyMotion 13 (+1), mocapCrouch 7, animFixPass 1,
mocapCrouchShift 2, crouchEntryRig 1, keyedCrouch 8, footPlanner 12, posture 9, partnerAnim 9, mocapRunFeet 6 (+1),
guardGunCarry 2, guardHead 14, coopGuardCarry 8: all pass.
`npx tsc --noEmit -p .` 0 errors; eslint on animGraph.ts, motion.ts, g1Locomotion.test.ts clean. No e2e (desktop rule).

## Open
- e2e-anim / e2e-clip on the laptop queue for 0448c359 (src/anim changed; the player's paths are unchanged except
  the crouched turn share, so e2e-anim's crouch turn rows are the ones to watch).
- mocapStrafe alloc stays load-sensitive in CI (pre-existing).
- animFixPass rewrites docs/archive/anim-fix-pass/before/numbers.md when run (known since AF4b); restored, not committed.

Changelog: changes/feature-afp-af3.md "(CI fix) Guards keep their crouch ..." line.

# PR #247 CI fix 2: mocapStrafe aimed strafe allocation (run 39942525621, both attempts)

Opus fix agent, 2026-10-23. Head before: afea69d3.

## Noise or real?
Real. CI attempt 1 read steady R off 1883.9 / on 1930.9, attempt 2 off 1915.9 / on 1962.9: the absolute bytes move by
32 between attempts, the gap stays 47.0 (3 boxed doubles; the limit is off + 2 x 16 + 1). Locally (Node 24; CI Node 22)
the test alone (`-t "allocates no more"`) is deterministic: head off 1440.0 / on 1504.0 every run (limit 1473), master
33fff449 off 1392.0 / on 1424.0. In the full file the earlier tests' warm-up hides it locally (head and fix both read
1408 / 1424), which is why it "passed locally" before.

Bisect (throwaway detached worktree, test alone): 69662cf2 and 0c886207 1392 / 1424 (master's); 44ed5389 (+AF1)
1392 / 1440; 236601dc (+AF3) 1440 / 1504; unchanged through 48b9b73c, e70951e3, 0448c359. The CI fix 0448c359 added
nothing.

Cause: `approach`, `clamp` and `smoothstep` are never inlined into `AnimGraph.update` / `writeTargets` / `clipFeet`
(`--trace-turbo-inlining`: 0 of 30 / 18 / 15 call sites in update, on master too), so a call with a non-integer double
argument boxes it (16 B). AF3 added `this.cBackK = approach(..., clamp(...), ...)`, run every frame (48 B, OFF and ON);
AF1 added two `smoothstep(...)` calls on the speed band (`hF` in writeTargets, `tk` in clipFeet), run every frame (16 B ON).

## Fix (src/anim/animGraph.ts)
The three written out, the same arithmetic bit for bit (clamp = max(lo, min(hi, v)); approach with tau > 0 =
target + (x - target) exp(-dt / tau); smoothstep = c c (3 - 2c)), as motion.ts already does for sideStepAt. No test, threshold or
measurement changed.

## Numbers (steady R, B a frame, off / on; limit off + 33)
- Test alone: head 1440.0 / 1504.0 (fail) -> 1392.0 / 1424.0 (master's exactly); all four plans now read master's
  (steady L 1424 / 1424, diagonal 1532.2 / 1548.2, flips 1438.9 / 1458.6).
- Full file: 1408.0 / 1424.0 before and after (local).

## Tests
mocapStrafe 5 runs in a row: 12/12 each. `npx tsc --noEmit -p .` 0 errors; eslint src/anim/animGraph.ts clean. No e2e
(desktop rule). Open: CI on the new head (Node 22).

Changelog: none (no behaviour change; the fragment's AF1 / AF3 lines cover the code).
