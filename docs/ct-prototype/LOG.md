# CT core feel job - log

One section per step: built, numbers, Michael's notes (verbatim), open items, status line.

## 2026-10-18 - job start
- Starting point: slice M1 (body logic, `M1.md`), Michael's M1 notes (`M1-FEEDBACK.md`): "it's on the right track";
  camera manual only; tense tiptoe crouch near enemies.
- Job docs created. Step 0 code review started (read-only, Sonnet).
- Review done: ADJUST body, anim, strike, goggles, wire; REWRITE camera framing core; wall and doors ADJUST, pad tables REWRITE.
- Michael: camera core rewrite; wall and doors adjust, pad tables rewrite; adjust the rest; first round cleanup + camera.
- Status: STEP 0 DONE. A2.1 started.

## 2026-10-18 - A2.1 camera and cleanup
- Michael: "Prototype pass now (Recommended)", "Keep Opus orchestrator", "After each area (Recommended)" (RULES updated).
- Built (Sonnet): auto recentre and aim assist deleted (settings rows inert, menu job leftovers); camera rigid, 1.8 m
  boom, 0.15 m shoulder, pitch 17 deg, aim 0.4 m / 0.16 m no zoom, shoulder swap only aiming (0.4 s arc); G103 draw
  0.6 / 0.75 s, holster 0.55 s. `stepAssist` is the stair helper: kept, now allocation-free. Report `A2-CAMERA.md`.
- Checks: lint 0 errors, 1462 unit tests pass, build ok. e2e pass: smoke, move, netmove, pad, mouse (M1's three
  verified), anim, wall, takedown, gadgets, combat, weapon-audio, weapons-carry, tactics, enemies, bunker, modes,
  course. Failing identically on untouched HEAD: camera-bounds level U, stealth, traverse, stealth-ai, ct (sprint
  check), clear (menu text). e2e-coop: known "client strike denied".
- Open: a wall right behind the camera can show through (one-sided faces ignored by camera casts); weapon does not
  cross the chest on a shoulder swap (aim side not on the wire).
- Status: A2.1 BUILT, awaiting Michael's play.

## 2026-10-18 - goal change (G161, G162)
- Michael (native multiple choice): "Prototype movement focus first ct-pure, then full coop loop"; overnight "It can run
  overnight but not yet. I'm still awake. Also we should focus on the ct training coop session."; "Yes, push to
  ct-movement"; "Yes, Opus for those"; co-op level "Rebuild Fallow on it". Main session relayed his wider direction and
  "Pure ct, if it had it, we will use it." Recorded as G161, G162 in docs/DECISIONS.md; FEEL-PLAN phase 2 added.
- Status: A2.1 awaiting Michael's play (now on /ct/).

## 2026-10-18 - A1.1 turn follow (prototype)
- Michael: "Yes start it, remember prototype only".
- Built (Sonnet): turn cap 450 deg/s up to 3.0 m/s and all crouched speeds, falling to 350 deg/s at 4.2 m/s; planted
  feet step round with the body in every state (turnStep 0.75 rad, wall 1.2); pivot leftovers removed, crossing guard
  and swing bow-out use the landing foot's yaw. No wire change (PROTOCOL_VERSION 14). Report `A1-TURN.md`.
- Checks: lint 0, vitest 1464 pass, build ok; e2e smoke, move, anim pass; e2e-netmove failed once, rerun not confirmed
  (known flaky). Open: a swinging foot can cross for a few frames in a fast spin; enemy turns share the planner, check
  in play.
- Status: A1.1 BUILT, awaiting Michael's play.
