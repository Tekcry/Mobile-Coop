# Step 27 - batch 4: stealth contact, drag (H1), contact IK (D5.9)

Model: implementer opus; checker opus (network step). Depends on: 26. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 27: contact batch: back-to-wall clips, takedown timing, grab / carry, drag verb, contact IK"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D5.9, D8, D9, D10, A5; PLAN.md H1, H3.
- docs/design-bible.md 5.3 "Bodies" (`grep -n 'Drag (3b)' docs/design-bible.md`, +-10 lines); :680-685 (C11);
  :824-834 (durations: grab 0.5, lift 1.0, takedown 1.0-1.5 s).
- docs/locomotion/AUDIT.md 1e (S01-S08).
- src/game/takedown.ts:28-66 (times, grab), :265-279 (approach path); src/game/takedownController.ts:272-278.
- src/game/stealthSystems.ts:30-40, :115-130 (carrying, drop body, hiding spot).
- src/player/wallController.ts (step 11-12; read its header and exported API only).
- The generic committed-move protocol from step 10: `grep -n "cmove\|cstart\|cdeny" src/net/protocol.ts src/net/coopHost.ts`.
- src/player/moveState.ts MOVE_MODES; src/game/localMoveState.ts (precedence); src/net/remoteAvatar.ts:157-215.
- src/player/characterRig.ts:1410-1470 (solveArm, reach); src/config/noise.ts (floor loudness).

## Numbers
- Takedown today: approach 0.22 + strike 0.7 = 0.92 s (takedown.ts:32-33) vs bible 1.0 s -> strike 0.80 (total 1.02).
- Grab >= 0.5 s; lift to carry >= 1.0 s (bible :832-833). Grab hesitate 1.5 s, hostage 0.42 m (takedown.ts:53-66).
- Drag speed = crouch gear 2 = 0.9 m/s (movement.ts:160). Char-vs-char clip <= 3 cm; paired alignment <= 3 cm at
  contact on host and client (bible :808, :859). Hand contacts < 1 cm.

## Task
1. Back-to-wall dedicated clip set: enter (standing / crouched), slide loop, edge peek, lean-out aim, SWAT turn, exit,
   interrupted exit; replace the stand-ins from steps 11-12b. Back and support hand on the wall < 1 cm. The set
   covers both edge sides with mirrored hands (D9: left edge pistol left hand, rifle left shoulder), the low-wall
   crouched side lean past the end and the rise over the top (D10, head below the wall top).
2. Takedowns: strike 0.70 -> 0.80 s; every kind (behind, front, side, above, below, window, drop, inverted, corner from
   the wall) plays from the host's shared start time: add 'takedown' and 'grab' to CKind (`cstart {.., t0}`), the
   existing `td` result path stays; both machines play from t0.
3. Grab / human shield / shove: >= 0.5 s grab, shared start time, attacker and victim aligned <= 3 cm.
4. Carry: lift >= 1.0 s; put down gently (quiet) or drop (noise); hide spots remove the body.
5. Drag (new verb): crouched, 0.9 m/s, hands at the collar, body pinned at the shoulders and trailing; silent on quiet
   floors, a scrape noise event on loud floors (noise.ts floor classes); interact hold switches drag <-> carry.
6. Drag is a committed start: add 'drag' to CKind; `cmove {kind:'drag'}` -> host `cstart {.., t0}` or `cdeny`; the host decides who holds the
   body and syncs the body position (C11). New MoveState mode `drag` (appended).
7. Hook H1: `DragTarget = guard | body | player`; only guard and body are wired; a downed team-mate is accepted by the
   type and rejected by the host with a `cdeny` reason (Phase 5). Unit test proves the type and the denial.
8. No climbing, sprint, back-to-wall or traversal while dragging or carrying (bible 5.3).
9. D5.9: hand contact IK on door frames and outside corners when passing within 0.4 m at gears 1-3 (support hand
   brushes, < 1 cm when touching); never while aiming. Back-to-wall edge: the free hand (the one not on the weapon,
   so it flips with D9) holds the wall corner, < 1 cm, at left and right edges, high wall and low-wall end.
10. Duck under low geometry: head clearance probe; spine / knees flex to clear with >= 3 cm, no world clip > 3 cm.
11. Sideways through gaps narrower than 0.7 m: torso turns up to 60 deg (spine limit) and steps sideways.
12. Add `drag` to the bot partner command table (step 20) and to the e2e-bot suite.

## D8
- New mode `drag`: e2e-netmove case; host-approved start; body position synced; denial path tested.
- Remote char-vs-char <= 3 cm and paired alignment <= 3 cm in the remote audit (takedown, grab, drag, carry).
- Harness re-checks D9 / D10 with the new clips, local and remote: grips < 2 cm, no weapon through the wall
  (<= 2 cm) at both edges with pistol and rifle; low-wall side lean head below the wall top.
- D5.9 contact IK on remotes from their pose and local geometry probes; no new field.
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget), remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-takedown e2e-stealth e2e-clip e2e-anim e2e-netmove e2e-coop e2e-bot`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): durations, contacts, char-vs-char, alignment; batches 1-3 pass.
- `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet for back-to-wall set (left and right edges, pistol and rifle, low-wall side lean and
  over-the-top), each takedown kind, grab, carry, drag, duck, sideways gap, side / front,
  local and remote: "no clipping between bodies, hands on contact" (PROVISIONAL in the cloud).
- From step 09: hostDrawPhase must force dw 0 while carrying or dragging a body (add with the drag MoveState mode).
- From step 11 (A47): wall rows still failing - entry 180 deg turn joint rate ~45 deg / frame (smooth the turn over the settle), selfShanks 8.8-10 cm and selfThighs 3.5 cm at the entry turn, selfForearmL 9.5 cm moving and selfForearmR 9.2 cm crouched (weapon carriage tuck vs the flat-back chest), exit pelvisJump 8.4 cm (leave needs the entry's smoothing), remote wallClip 3.9 cm in the settle, kneeL ~120-127 deg, footSlideR 1.0-1.5 cm. All must pass after this step.
- Also from the step 11 check: wallGap@120 4.4 cm (limit 3), selfForearmR, kneeL ~120 deg, footSlideR 1.3-1.5 cm.
