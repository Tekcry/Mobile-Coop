# Step 30 - batch 7: co-op bodies, team moves, 4-player run (D8)

Model: implementer opus; checker opus (network step). Depends on: 29. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 30: co-op batch: capsule separation, shoulder turn, wall stacking, team moves with contact IK, 4-player run"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D8, D9, A4, A5; PLAN.md H3, H4.
- docs/design-bible.md:680-685 (C11), :711-718 (C20), :808 and :859 (char-vs-char, paired alignment).
- docs/locomotion/AUDIT.md 1h (N01-N10).
- src/game/teamMoves.ts:9-80 (TeamKind, checks, boostPath); src/game/teamController.ts:28-70, :335-345.
- src/config/movement.ts:390-400 (boostTime 0.9, ladderFeet 1.45, ladderGrab 4.1, ladderClimb 0.8).
- src/net/coopHost.ts:47 (DUAL_WINDOW), :225-240 (duals), :573-602 (tmove / tstart);
  src/net/remoteAvatar.ts:157-215, :270-302.
- src/ai/enemy.ts:1510-1525 (the separation pattern used for enemies and players).
- src/player/attachGrips.ts:45 (grips); src/player/wallController.ts (stacking API from step 11).
- scripts/e2e-coop.mjs:30-45, :475-485 (third page); scripts/e2e-netmove.mjs (two pages, page B inputs / hooks).
  Step 20 (bot partner) was dropped (M12): every co-op check here is a multi-page e2e case, an anim-audit remote row
  or a two-tab PC-PASS item.

## Numbers
- Capsule r 0.3 m -> minimum centre distance 0.6 m. Char-vs-char clip <= 3 cm; paired moves align <= 3 cm at
  contact on host and client (bible :808, :859). Netmove limit 10 cm.
- Boost 0.9 s; human ladder feet 1.45 m, grab 4.1 m, climb 0.8 s; dual takedown window 1.5 s.

## Task
1. Capsule separation: each machine pushes its own player out of other players' capsules (soft, <= 2 m/s push, never
   a teleport); the host's view and the client's view agree; no interpenetration > 3 cm in any audit frame.
2. Shoulder turn to pass: two players closer than 0.9 m and passing (relative speed > 0.3 m/s) turn the torso up to
   35 deg away from each other (ASSUMED, next free A-number, for the radius and angle; alternative 0.8 m / 45 deg).
   Derived locally on every machine from positions and velocities.
3. Head look-at to team-mates (step 23) polished: glance on approach, look at a mate who pings or speaks a radio line.
4. Muzzle discipline (step 25) verified for 2-4 players, including remotes aiming past each other.
5. Two-player wall stacking: the second player stacks 0.7 m behind on the same wall, shoulder to back, no clipping;
   leaving the stack and a SWAT turn past the stack partner stay clean. Two players stacked at a left edge: the
   lead's open-side switch (D9, WALL_SUB leftHand) poses on the partner's screen; the rear player's mirrored weapon
   never sweeps the lead (muzzle discipline) and never clips the lead's body (<= 3 cm).
6. Existing team moves only (A4): brace, boost, human ladder, dual takedown. Each gets the D5 layer (anticipation,
   compression, one settle) and contact IK: hands to cupped hands / shoulders / feet on shoulders < 1 cm, bodies
   <= 3 cm, both machines aligned <= 3 cm from the shared `tstart {t0}`.
7. Dual takedown: both strikes start from host-approved `cstart {t0}`; banner unchanged.
8. H4: split-jump boost, back-to-back, pull-up, rappel anchor stay reserved kinds; no clips built.
9. Remote replays of everything: run the remote audit over every MoveState mode (loop the netmove cases) and record
   worst errors per mode in AUDIT.md.
10. 4-player run: a 4-page e2e-coop case, `?net=local` host + 3 client pages each driven by its own inputs / window
    hooks (extend the third-page pattern at e2e-coop.mjs:475-485): back-to-wall stacking, takedowns, elbow strike,
    medkits; every page sees every other player posed from MoveState under 10 cm. This also owns step 15's 4-player
    medkit run.
11. Two-page e2e-netmove / e2e-coop cases for any new behaviour (stack position, pass-by), page B scripted.
12. From step 08 (carried via the dropped step 20): remote stance / weapon settle compared against B's own
    crouchBlend at t - lag (the remote eases a binary crouch flag at 10/s); paired-move alignment palm vs ball-of-foot,
    reported on both pages; harness remote runtime (target 60 s) and the 120 Hz pump jitter probe.

## D8
- No new mode unless a team pose needs one (then a netmove case). Remote D5 derived locally, no bandwidth (size test).
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget) with 4 characters on screen.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-netmove e2e-coop e2e-anim e2e-clip`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): char-vs-char, alignment, all batches 1-6 still pass.
- Block D end: full `npm run e2e` in the background (read the summary, no sleep polling) and
  `node scripts/perf-trend.mjs` (sim p95 <= 3.31 ms, anim <= 0.063 ms on this VM).
- e2e-netmove (two pages): stacked pair at a left and a right edge, page A leads and leans out; both pages pose the
  open-side weapon < 10 cm; centres >= 0.6 m, char-vs-char <= 3 cm. e2e-coop 4-page case (task 10) passes.
- PC-PASS: anim-sheet with a second `?net=local` page as the mate (two pages; plus a two-tab hand check for Michael) for stacking (incl. a left-edge open-side lean), pass-by, boost, human ladder, dual takedown, both views:
  "no clipping, contacts held" (PROVISIONAL in the cloud).
- From step 10: a client's queued second strike lands at ~host t0 + 1.4 s + RTT; above ~100 ms RTT it misses the 1.0 s stagger window (staggers again instead of KO), and a slow host can refuse it as busy. Judge `staggered` when the request is accepted (or extend the stagger by the lag slack); add a unit test, and a test for damage cancelling a strike (cdeny reason hit).
