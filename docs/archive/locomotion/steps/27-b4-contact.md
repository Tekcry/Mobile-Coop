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
12. Two-page `drag` coverage (M12, no bot partner): an e2e-coop case where page B drags a body and page A sees it
    posed from MoveState < 10 cm with the body position synced, plus the netmove case below; an anim-audit remote
    `drag` row.

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
  `node scripts/run-e2e.mjs e2e-takedown e2e-stealth e2e-clip e2e-anim e2e-netmove e2e-coop`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): durations, contacts, char-vs-char, alignment; batches 1-3 pass.
- `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet for back-to-wall set (left and right edges, pistol and rifle, low-wall side lean and
  over-the-top), each takedown kind, grab, carry, drag, duck, sideways gap, side / front,
  local and remote: "no clipping between bodies, hands on contact" (PROVISIONAL in the cloud).
- From step 09: hostDrawPhase must force dw 0 while carrying or dragging a body (add with the drag MoveState mode).
- From step 11 (A47): wall rows still failing - entry 180 deg turn joint rate ~45 deg / frame (smooth the turn over the settle), selfShanks 8.8-10 cm and selfThighs 3.5 cm at the entry turn, selfForearmL 9.5 cm moving and selfForearmR 9.2 cm crouched (weapon carriage tuck vs the flat-back chest), exit pelvisJump 8.4 cm (leave needs the entry's smoothing), remote wallClip 3.9 cm in the settle, kneeL ~120-127 deg, footSlideR 1.0-1.5 cm. All must pass after this step.
- Also from the step 11 check: wallGap@120 4.4 cm (limit 3), selfForearmR, kneeL ~120 deg, footSlideR 1.3-1.5 cm.
- From step 12 (A47): local SWAT pose: ankle ~0.7 m off the root mid-move, walledge@60 pelvisJump 33.7 cm; remote walledge poseError 67-75 cm during the SWAT and the return from a lean. Give the SWAT a real crouched cross-step and match it on remotes; gate the joints in the existing "swat mid-move" e2e-netmove case (<= 10 cm).
- From step 12b (D9 deviation, logged in REVIEW-NOTES): at wall edges the weapon grips read 17-70 cm in the audit (wallopenL / R rifle and pistol, walllowL / R; worst left edge + pistol) and joint rate 137-177 deg per frame, so D9's "grips < 2 cm, no pop on the hand switch" is not yet met. Solve the mirrored grip and the edge peek / switch pose; gate the 12b rows. Also: a left-edge peek starts ~0.25 s later than a right one because the lean waits for the hand switch - let the head lead during the switch.
- From step 12b r1: after a hand switch ends (plain or reversed) the edge lean-out restarts and the weapon dips up to ~15 cm per frame in y over ~6 frames (the plain-switch test measures only x). Fix and test y / z.
- From step 13 (A47 scope extended to door peek): doorpeek rows fail pelvisJump 3.1 cm local / 3.5-3.7 cm remote (limit 2), jointRate 24.5 deg @120 local and 35.1 deg remote, remote poseError 28 cm (report-only) - the 0.25 s settle glide (~0.4 m) and the pelvis following the capsule. Smooth the settle (slower / stepped) with the batch 4 door-frame contact work.
- From PC1 (desktop GPU, 2026-10-15, PC-PASS 33-34, 40, 49-50): sheets show the off hand never flat on the wall when still (holstered hands on the hips), legs crossing in the slide (wallslide-front 1.0 s, selfShanks 8.8 cm), the body off the wall at the edge (walledge-side 0.9-1.1 s, wallGap 5.1 cm), the right forearm across the chest at the edge draw, and the slung rifle between the back and the wall (lowwall-side, walledge16-side 1.1-1.5 s). Desktop grips at edges: L-rifle 29.4 / 11.2, R-rifle 27.7 / 30.7, L-pistol 57.4 / 63.4 (worst), R-pistol 17.3 / 50.8 cm; hands leave the weapon in the lean-out switch (frames 150-250) and the settle (frame 313). Remote SWAT mid-move 74-104 cm. Doorpeek local pelvisJump 3.15 cm / jointRate 25.1 deg at entry frames 32-33.
- From PC1 (PC-PASS 42, new e2e-wall `midSwitch()` case): releasing or re-pushing the open-side lean-out within 0.25 s jumps the weapon 27-50 cm and the wrists 10-12 cm in one frame (release 46 / 10, re-push 50 / 11, drawn re-push 27 / 12 cm; limit 5 cm per frame), against D9's "never a pop". Suspects: src/weapons/playerWeapons.ts `setStowed` mid-draw `holsterAll` (~:222-225: the gun goes straight back to its slot) and the `reverse` path's `inHand` / swapT jump (~:403-410). The check is report-only ("KNOWN FAIL (PC-PASS 42)"); after the fix make `PC42_STRICT=1` the default in scripts/e2e-wall.mjs.
- From step 15 (A58): the medkit pose is hands-only (no kit or injector mesh). Add a small kit / injector prop (code-built) held in the off hand and moved to the thigh by the right hand, and extend the anim-audit `medkit` rows to measure both hands < 2 cm on the prop, local and remote.
- From step 21w (implementer 3, items not finished in budget; audit test-results/aa-s21w3, sheets pc/s21w3): (3) leaving the wall still jumps the pelvis (wall@60 pelvisJump 8.04 cm @343, limit 5.33; @120 8.07 cm): blend the leave (Inertializer). (4) and walledge@120 footSlideL fixed in 21w (implementer 4: WALL_STANCE.pelYStand, pc/s21w4). (5) walledge@60 footSlideL 2.25 -> 2.35 cm; wall@120 footSlideL 1.6 cm / footSinkL-R 1.2-1.8 cm (new with the standing-wall pelvis raise). Also open from 21w: walledge / wallopenR-rifle selfForearmL 1.8 -> 2.9-3.3 cm and wristFlexL 37 -> 46 deg (the 0.4 m weapon glide during the lean-out draw), walllowR selfUpperArmR 0 -> 6.0 cm (present with the glide off: implementer 1's wall pose changes), walllowL / walllowR selfShanks 7.4 -> 9.6 cm (WALL_WIDTH crouch).
- BLOCKED from step 21w (M16): leaving the wall still jumps the pelvis (wall@60 / @120 pelvisJump 8.15 / 8.17 cm): blend the leave.
- From the 21w check (desktop, worse than the pre-21w baseline, carried with numbers): wall@60 entry ankleR jointRate 42.7 -> 63.9 deg at frame 11 with selfShanks 8.6 -> 9.6 cm at frame 10 (already failing before 21w; happens on every entry: look first); walllowR footSlideR 1.87 cm (new fail); wallGap walllowL 0.09 -> 2.2 cm, remote 2.7 cm (within 3 cm). Step 25 carry: wallopenR-pistol wristR jointRate 131.9 -> 179 deg and selfForearmL 7.1 -> 13.2 cm at the lean start (frames 229-230), with PC-PASS 42.
