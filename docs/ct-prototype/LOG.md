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

## 2026-10-18 - A3 wall, doors, CT pad (prototype)
- Michael: "Continue, I haven't tried yet".
- Built (Sonnet): CT pad (A interact, B crouch, Y jump, X equip, L3 wall, RB co-op action, LB quick inventory, D-pad up
  goggles / down gadget, View mission device, speed rocker on D-pad left / right); wall entry L3 only, shuffle 0.35 /
  0.3 m/s, peek at once with a stricter peek camera (pivot 0.4 m, turn 12 deg); SWAT and lean-out removed incl. wire;
  door menu on A (open, stealth open, bash, optic cable stub); guards close doors they opened on calm patrols.
  PROTOCOL_VERSION 15. Report `A3-WALL-DOORS.md`.
- Stubs: stealth-open crack fixed 0.12 (not analog); client bash is a plain open; no lock picking in code; guards do not
  yet notice doors left open.
- Checks: lint 0, vitest 1457 pass, build ok; e2e smoke, wall, pad, mouse, netmove (solo rerun), stealth-ai pass.
  Not run: e2e-coop, modes, traverse, takedown; anim-audit / anim-sheet and e2e-ct still use removed verbs.
- Status: A3 BUILT, awaiting Michael's play.

## 2026-10-18 - A4 strike and grab (prototype)
- Built (Sonnet): palm strike one hit on any guard, no stagger (wind-up 0.10 s, contact 0.12 s, free 1.4 s after
  contact, lunge cap 0.4 m); grab from behind on A / E with a "Held" menu: Knock out, Kill, Carry, Force to device (not
  yet), Interrogate (later); B lets go. Tap / hold selector and B shove removed; heavy / dog exception removed from
  strike and grab (G155). No wire change (protocol 15). Report `A4-STRIKE-GRAB.md`.
- Open for Michael: the strike stays on RT (holstered fire press); the research layout puts the knockout on LT, but LT
  is aim. Settings row "grabToggle" is dead (menu job).
- Checks: lint 0, vitest 1458 pass, build ok; e2e smoke, takedown, coop (client strike denied passed), stealth-ai, pad
  pass; e2e-stealth fails at the pre-existing camera free-orbit step. Not run: netmove, enemies.
- Status: A4 BUILT, awaiting Michael's play.

## 2026-10-18 - A5 goggles (prototype)
- Built (Sonnet): instant cut off, thermal, electro, night, off (0.2 s flip gone); CT thermal ramp, grain per G101;
  closed-door silhouettes in thermal within 14 m (`src/vfx/doorGhosts.ts`, render-only); partner lamp blue for player
  1, red for player 2 (from `PlayerInfo.host` / net role, no wire change, protocol 15). G73 brow / eyes stubbed (Wren).
  Report `A5-GOGGLES.md`.
- Checks: lint and tsc clean, vitest 1454 pass, build ok; e2e smoke, pad, coop, stealth-ai, darkness (after a script
  fix) pass; e2e-mouse not run. GPU look pending PC run.
- Status: A5 BUILT. Movement areas A1-A5 all built once (prototype pass); next merge feature/menu, then phase 2 bunker.

## 2026-10-18 - merged feature/menu (Michael: "Can you merge the menu updates with this branch also?")
- Merged origin/feature/menu (8982c3d, 12 commits). Conflicts: `src/input/gamepadSource.ts` (menu's Start cancels a
  capture, G22, kept); `tests/keybinds.test.ts` (CT keys plus the menu keys). `tests/input.test.ts` and
  `scripts/e2e-menus.mjs` updated for the CT layout (F is the co-op action, bind id `coop`).
- Checks: lint 0 errors, vitest 1468 pass, build ok; e2e smoke, pad, menus pass.
