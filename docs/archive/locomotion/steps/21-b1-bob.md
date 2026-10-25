# Step 21 - batch 1a: D2 bob fixes and trained posture (D5.6)

Model: implementer opus; checker opus. Depends on: 20b (step 20 dropped, M12). (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 21: D2 bob fixes (sway, heel kick, camera kick, breathing, sway settle), trained posture"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D2, D5.6, D8.
- docs/locomotion/AUDIT.md sections 2 (bob sources) and 4 (metrics); audit/a-anim-rig.md section 2.
- src/anim/clips/locomotion.ts:16-28 (GAIT_STYLE, bob, sway) and every `pelX: sway(` line (:64-240).
- src/anim/animGraph.ts:42 (FADE), :280 (HEEL_KICK), :398-402 (heelStrike), :437-441, :490 (kneel fade),
  :660-680 (breathing), :700-740 (weapon sway), :810-826 (pelSpring, supportX, pelBase).
- src/player/characterRig.ts:153-167 (JOINT_RATE), :1008 (heel caller), :1225-1247 (soft knees `legLen*0.97`).
- src/player/shoulderCamera.ts:40, :100, :222-232, :297-298; src/player/player.ts:371-373; src/config/camera.ts:72-73.
- src/config/movement.ts:60-70 and :125-131 (player and guard crouchTime / kneelTime / standTime).
- src/anim/footPlanner.ts:420-454 (toe / heel pitch); src/config/noise.ts (silent bands).

## Numbers (p2p sway = amp x 2.4, from `sway()` +-amp x GAIT_STYLE.sway 1.2, locomotion.ts:16,26)
- Over 3 cm now: creep 0.020 -> 4.8 cm (:64), walk 0.022 -> 5.3 (:80), brisk 0.018 -> 4.3 (:96), jog 0.014 -> 3.4
  (:113), walkBack 0.020 -> 4.8, strafe 0.016 -> 3.8, crouchWalk 0.020 -> 4.8, crouchBack 0.018 -> 4.3,
  crouchStrafe 0.014 -> 3.4, sneak 0.022 -> 5.3, crouchRun 0.014 -> 3.4. Dash 0.012 -> 2.9 passes.
- Heel kick -0.45 x mass (clamp 0.6-1.6) at omega 15 (animGraph.ts:280,401,815) = second dip of 1.5-3 cm per step.
- Camera footstep kick -0.05 x min(1.5, s) (shoulderCamera.ts:231), ~1.6 mm; called each `landed` (player.ts:373).
- Weapon sway (0.005 sin 1.3t + 0.003 sin 0.7t) x mass, 8 mm peak, never decays (animGraph.ts:707).
- Breathing sin(idleT x 1.6) x 0.008 rad spine pitch in every state (animGraph.ts:664,676).
- 25 deg per 60 Hz frame = 0.436 rad / (1/60) = 26.2 rad/s. Knee 30 rad/s = 28.6 deg / frame (over); hip 26 rad/s =
  24.8 deg / frame (0.2 deg margin).
- Kneel fade 0.35 s (animGraph.ts:490) vs Inertializer 0.1-0.25 s; standTime 0.28 vs crouch-to-stand 0.3 s (bible :824).
- Settle in 0.2 s, critically damped, to 2 %: t = 5.8 / omega -> omega >= 29 rad/s.

## Task
1. Lateral sway: every gait clip with amp > 0.0125 goes to amp <= 0.0115 (2.76 cm p2p), crouch, back and strafe clips
   included: stricter than A7 (step 07 checks sway on stand 1-3 only); log as ASSUMED, next free A-number,
   alternative: fix stand 1-3 only. Measured sum incl. supportX <= 3 cm.
2. Heel strike: remove the pelvis-height kick (heelStrike no longer moves pelY). Keep `pelSpring` for D5.3 (step 22).
   Weight on heel strike stays in the clip's own single dip; optional chest follow-through <= 0.5 deg.
3. Harness proves exactly one low and one high pelvis point per step on every gear, both stances.
4. Camera: delete `footstep()` and its call (player.ts:371-373) and the comment at shoulderCamera.ts:40. `impact()`
   keeps `sBob` until step 24 replaces it with the landing dip.
5. Delete the dead `dashBob` (config/camera.ts:72-73) and any reference.
6. Weapon and kit sway: no free-running sines. A critically damped spring (omega >= 29) settles in <= 0.2 s after a
   stop, no secondary wobble; the only idle weapon motion is what the chest breathing carries.
7. Breathing: only when still > 2 s (idle, crouch idle, kneel), head / chest travel <= 1 cm; none while moving or
   aiming. Exertion breathing is step 22 (D5.5).
8. JOINT_RATE: knee 25, hip 25 rad/s (23.9 deg / frame). Check foot slide and knee-floor IK do not regress.
9. Kneel fade 0.35 -> 0.22 s; standTime 0.28 -> 0.30 s for player and guards (movement.ts:67,130).
10. D5.6 trained posture: soft knees kept (legLen x 0.97), level stabilised head (pitch / roll <= 2 deg), ready hands
    while holstered (forearms forward, not hanging), heel-to-toe roll at gears 1-3 and all crouch gears, matching the
    silent bands in config/noise.ts.
11. Every change runs on guards and remotes through the shared rig (no player-only branch).

## D8
- No protocol field; remotes get the same fixes through CharacterRig. Remote audit must show the same limits.
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget) on this VM, remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-anim e2e-move e2e-netmove e2e-coop`
  (netmove / coop are KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): pelvis p2p, one low / high, sway, head, settle, breathing, joint
  rate pass for batch 1 rows; nothing else regresses. `node scripts/perf-trend.mjs` (rig touched).
- PC-PASS: `E2E_GPU=1 node scripts/anim-sheet.mjs <out> <walk|jog|sneak|crouchrun|sprint|stop> 12 0.1 <side|front|ots>`
  - "no visible bob, one dip per step, sway <= 3 cm" (PROVISIONAL in the cloud).
- From step 09: holstered-only local regressions vs the step-08 baseline: drop09@120 neckTwist 9.26 -> 13.95 deg; crouch balance flat-crouch4@120 3.1 -> 3.5 cm, stairs / ramp crouch3 0 -> 0.04 cm (gone when forced drawn). Fix with the D5.6 trained posture (ready hands / holstered carriage).
- From PC1 (desktop GPU, 2026-10-15, PC-PASS 25-26; same numbers as the cloud baseline): crouched holstered ready hands hang straight-armed to the knees (aa flat-crouch3 holstered elbow 5.1 deg both arms; sheets crouch-*, crouchstop-side, crouchrun-side, sneak-side). Suspect the pelvis drop counted twice: src/anim/animGraph.ts:791-800 (`ry = shY - READY_HANDS.y`) vs :906-911 (`readyFy`). Standing ready-hands elbow 104-109 deg (aa flat-stand2) against A42's 60-90: tune READY_HANDS (animGraph.ts:296; z -0.02 sits behind the shoulder line). Gate both in the audit (elbow 60-90 holstered, standing and crouched). Also seen: stop-side holds a wide lunge through 1.1 s of idle; no arm swing at sprint while holstered.
