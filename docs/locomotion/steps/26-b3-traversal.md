# Step 26 - batch 3: common traversal, D5.3 exits, D5.9 ledges, D5.11, momentum carry

Model: implementer opus; checker opus. Depends on: 22. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 26: traversal batch: durations, single settle on exits, ledge hand IK, momentum-scaled moves"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D5.3, D5.9, D5.11, D8.
- docs/design-bible.md 5.3 "Add (3b)" (momentum carry, `grep -n 'Momentum carry' docs/design-bible.md`), :171-172.
- docs/locomotion/AUDIT.md 1d (T01-T16).
- src/player/traversal.ts:15-31 (TRAVERSE_TIME, MIN_TIME, traverseDuration), :115-130 (window), :345-349,
  :398-401, :433-470 (jump, contextual jump).
- src/player/traversePath.ts:17-45; src/player/playerController.ts:535-542 (landT, 30 % carry), :583 (resumeSprint).
- src/anim/clips/actions.ts:223-311 (vault, mantle, stepUp, drop, slide, land); src/anim/animGraph.ts:612.
- src/player/attach.ts:53-82 (rung rates, ATTACH table); src/player/attachController.ts:60-70.
- src/player/characterRig.ts:1410-1470 (solveArm, reach); src/net/remoteAvatar.ts:157-178 (traverse replay).

## Numbers
- Vault MIN 0.42 s vs bible 0.5 s (traversal.ts:21); windowVault = vault x 0.9 (inherits the shortfall).
- Ladder sprint 5 rungs/s = 0.2 s per rung vs 0.3 s (attach.ts:56); normal 3 rungs/s = 0.33 s (passes).
  Max legal rate 1 / 0.3 = 3.33 rungs/s.
- Mantle 1.0 / 0.75 s (>= 0.6 passes); step 0.4 / 0.22; drop 0.35 / 0.25; hop 0.5 / 0.38; roll 0.62 / 0.55.
- Land clip dips -16 cm then -5 cm (actions.ts:311): two dips -> one.
- Landing keeps 30 % horizontal speed (playerController.ts:542).

## Task
1. Vault MIN_TIME 0.42 -> 0.50 s; windowVault clamps to >= 0.50 s after the x0.9.
2. LADDER_SPRINT_RATE 5 -> 3.3 rungs/s (0.30 s per rung); normal rate 3 unchanged (ASSUMED, next free A-number:
   sprint is now only 10 % faster; alternative: normal 2.5, sprint 3.3, which changes a level metric).
3. D5.3: one damped settle at the exit of mantle, vault, step, drop, window, ladder / pipe / ledge exits and landings;
   land clip reduced to a single dip scaled by band (soft / roll / heavy); no rebound.
4. D5.11: pose scales with entry speed: from a sprint the vault is low and fast (hips low, one hand), from a walk it is
   careful (two hands, higher hips). Speed = path length / committed duration, so remotes derive it from MoveCommit.
5. Momentum carry: a run carries its speed into the start of a mantle, vault, grab or drop; never automatic, every
   move is a press (bible 5.3). Exit speed hands back to the controller so the run resumes without a stop.
6. D5.9 ledge: hand contact IK on the lip (< 1 cm), fingers over the edge, during hang, shimmy and climb-up.
7. Jump: anticipation dip inside the jump's first 0.1 s without delaying control; add MoveState mode `air`
   (appended) so remotes pose airborne from it, not from position.
8. Every attached state gets a blended interrupted exit on hit and on anchor gone (5.12.2.9), no snap to idle.
9. Roll and landing feed the camera landing dip (step 24) and rumble (step 17) once each.
10. Unit tests: duration table vs minimums, momentum pose scale, carry speed hand-back.

## D8
- New mode `air`: e2e-netmove case. Every traversal case stays < 10 cm (baselines: ladder 0.3, pipeV 0.2, ledge 0 cm).
- D5.11 and settles on remotes from MoveCommit + velocity, no new field (size test).
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget), remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-traverse e2e-anchors e2e-move e2e-anim e2e-clip e2e-netmove e2e-coop`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): durations, hands on lips, single settle; batches 1-2 still pass.
- `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet `vault` (from walk and from sprint), mantle, drop, ladder, ledge, landing roll, side / front,
  local and remote: "one settle, hands on the lip, fast low vault vs careful vault" (PROVISIONAL in the cloud).
