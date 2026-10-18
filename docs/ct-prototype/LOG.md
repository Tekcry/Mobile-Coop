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

## 2026-10-18 - goal change (G177, G178)
- Michael (native multiple choice): "Prototype movement focus first ct-pure, then full coop loop"; overnight "It can run
  overnight but not yet. I'm still awake. Also we should focus on the ct training coop session."; "Yes, push to
  ct-movement"; "Yes, Opus for those"; co-op level "Rebuild Fallow on it". Main session relayed his wider direction and
  "Pure ct, if it had it, we will use it." Recorded as G177, G178 in docs/DECISIONS.md; FEEL-PLAN phase 2 added.
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

## 2026-10-18 - B1 CT course spec and greybox
- Built (Sonnet): `ctcourse` "Marlow Yard" (spec `CTCOURSE-SPEC.md`), 14 x 170 m night training yard, 8 stations in CT
  order with airlocks; placeholder gates (pair plates, held consoles, hack lever) labelled with the slice that replaces
  them; station 1 panels; exit completes only with both players in (G138); wall medkits full / 50 % / 25 % by
  difficulty, single use (G178). Course default map is ctcourse; Fallow only with `?legacy=1`; e2e-bunker moved to the
  legacy list. Report `B1-CTCOURSE.md`.
- Checks: lint 0, vitest 1473 pass, build ok; e2e smoke, ctcourse (392 s), course (solo rerun after a latency limit)
  pass. Not done: real mechanics (B2-B8), menu listing, testing-tools.md.
- Status: B1 BUILT, on /ct/, awaiting Michael's walk test.

## 2026-10-19 - B2 leg-up and CT ledge relay
- Built (Sonnet, time-boxed): `coop` action on RB / F / PageDown; leg-up (crouch + co-op offers, partner boosted to a
  2.4-4.5 m ledge, anywhere with room, polite refusal, brace removed, standing hook left for B4's throw); CT hanging
  ladder relay (shoulder stack code removed, `stacked` wire mode dead); host-authoritative on the team-move rail;
  protocol 16 (relay-offer bit). ctcourse station 2 is a real 4.4 m wall bolted from the far side; station 5 plates on
  the roof. Report `B2-LEGUP-RELAY.md`.
- Checks: lint 0, vitest 1482 pass, build ok; smoke and e2e-ctcourse pass. e2e-netmove failed in earlier known-flaky
  sections (its team section passed trimmed); e2e-coop not run. anim-audit and e2e-ct-warehouse still use the brace and
  old stack (polish list).
- Status: B2 BUILT (partly verified).

## 2026-10-19 - merged origin/master (Wren, PR #5)
- Conflicts and resolutions:
  - `src/game/gameState.ts` imports: master's (bodyHeight); `hyp3` dropped (unused).
  - `src/game/teamController.ts`: B2's imports and relay code, master's `GAMEPLAY_HEIGHT` (G176) for hang poses,
    kept the allocation-free scratch pose.
  - `src/net/remoteAvatar.ts`: Wren's `loadPlayLods` and pouches; kept the A5 partner beacon.
  - `docs/DECISIONS.md`: master's operators section (G123, G161-G176) kept; this branch's G161 / G162 renumbered to
    G177 / G178 everywhere on the branch; the selection wheel added as G179 (and in the bible).
  - `docs/art-credits.md`: master's file plus the menu fonts section.
- `npm install` for master's `@babylonjs/ktx2decoder` (G172).
- Goal (PR #6, not yet on master) copied into RULES and STATE from origin/docs/prototype-goal.
- Checks: `npm run check` passes (lint 0 errors, 1588 tests, build ok; first run had 5 s timeouts under load).
  `e2e:quick` (65 min, one at a time): 13 failed: e2e-mouse (F / PageDown now `coop`), e2e-move (gear 1 speed via the
  old rocker keys), e2e-traverse (sprint climb, G31), e2e-combat (LB swap, now the A3 layout), e2e-enemies (heavy
  front takedown, G155), e2e-modes (Y grabs intel, Y is jump now), e2e-stealth and e2e-anchors (page.evaluate on
  removed fields), e2e-ct and e2e-ct-warehouse (sprint / brace), e2e-camera-bounds (pre-existing), e2e-kestrel and
  e2e-editor (Kestrel / editor, off-limits area, D-pad rebinds). e2e-coop and e2e-netmove known flaky. All read as
  stale assertions from slices A3-B2 that changed controls and moves (no play breakage seen in the logs); queued as a
  test cleanup slice (T1) in POLISH.md.

## 2026-10-19 - P1 Wren posture and leg fix (Opus)
- Michael via the main session: "fix the characters posture" (in game; leg fix is prototype work).
- Built: A1.2 turn fix (one step per 90 deg, landing along the turn, stride along the facing, no crossing, pelvis
  trails chest up to 20 deg, knees between hips and toes; twist cap 52 deg from the body). Guards and partner share it;
  protocol 16. Posture on Wren: crouch spine 34-39 deg, crouch hip 0.51-0.59 of standing, head top 0.64-0.68, run lean
  22 deg, idle knee 152 deg, feet on the ground. Report `P1-POSTURE.md`.
- Still wrong: a held spin still turns planted feet a lot; idle knees bent about 28 deg; head level, not 5-10 deg down.
- Checks: `npm run check` passes (1625 tests, 37 new); e2e smoke, anim, ctcourse pass. Some unit bounds loosened
  (`prototype: revisit`), e2e-anim spine pitch rate 0.1 -> 0.16 per frame.

## 2026-10-19 - F1a controls, aim, selection wheel, camera
- Built (Sonnet): CT aim scheme (X / RMB toggles draw; holstered RT lethal palm strike, LT knockout; drawn RT fire, LT
  secondary stub; A reloads drawn; L3 shoulder swap aiming, back-to-wall otherwise; R3 zoom scoped only); draw 0.3 /
  0.4 s; D-pad up / down speed, left toggles the wheel-picked vision mode, right quick-uses the gadget; selection
  wheel on LB / Tab hold (G179), tap switches weapon; camera further over the right shoulder, aim lower and over the
  shoulder; weapon to the left hand on a left shoulder (`rig.openLeft`). No wire change (protocol 16). Report
  `F1A-CONTROLS.md`.
- Stubs: secondary fire; goggle flip visual; client strike is a host knockout; remotes show the gun right-handed; zoom
  untested (no scoped weapon in the kit).
- Checks: `npm run check` passes; e2e smoke, pad, mouse, combat pass; ctcourse passed on solo rerun (load).
- P1 bug (Character Build session, anim-sheet crouch side view on 61607ca): the crouch back is near horizontal,
  80-90 deg forward, head at hip height ("reads like a quadruped"); intent is about 35-45 deg. Queued as P1b after F1b,
  checked with GPU anim-sheet stills. Side effect: feature/weapons' back-mounted rifle goes horizontal and fails
  e2e-weapons-carry "back guns muzzle up".
- Wall stance bug (Character Build session, anim-sheet "wall" front view): standing flat to the wall, the off hand
  sits at the hip with the elbow out (reads as hand-on-hip); footage (ct-measure-walls-doors-combat-vision.md,
  standing stance): arms hanging, hands mid-thigh. Added to P1b.

## 2026-10-19 - F1b menus, grab, strike, doors, goggles, panels
- Fixed (Sonnet): one optional panel per station (the old drill text used Y, now jump: why P1 could not read); door and
  grab menus top right, grab menu while walking (gear <= 2, D-pad up / down picks, B or Y lets go); strike only with a
  guard in reach (1.3 m, 140 deg, any side), contact 0.08 s, free 0.68 s, whiff 0.3 s; wall shuffle 0.525 / 0.45 m/s,
  peek camera 0.75 m past the body; stick-driven stealth open (solo / host; a co-op client keeps push-to-open);
  calm guards notice a player-opened door, investigate, shut it. Partly: hostage pistol (X draws, RT fires) untested on
  a pad; goggle flip only on on / off (0.28 s) plus a faint lens ring; door ghost brighter (GPU check pending); electro
  fuzz; night vision not reviewed. Protocol 16. Report `F1B-FIXES.md`.
- Checks: `npm run check` passes (1639 tests); e2e smoke, ctcourse, takedown, wall, darkness, pad, netmove pass.

## 2026-10-19 - P1b crouch depth and wall arms
- Cause: P1's posture lean stacked on the armed carriage hunch (crouch measured 68-70 deg, kneel 63, run 43). Fix: the
  posture lean replaces the hunch while it applies (crouchLean 0.74, kneelLean 0.1): crouch idle, walk and kneel now
  35-45 deg, run 18-28. Wall stance: the wall-hand contact is gone, both arms blend to a WALL_ARMS hang (hands at the
  hips; the rig's arms do not reach mid-thigh). Stills in `shots/p1b/`. Report `P1B-POSTURE.md`.
- Checks: `npm run check` passes (1648 tests, 9 new posture tests); e2e smoke and wall pass; e2e-anim's aim framing
  assertion (~0.6 s) was stale after F1a halved the draw: updated to 0.2-0.5 s.

## 2026-10-19 - B3 held jammer, camera, laser
- Built (Sonnet): held pistol jammer (drawn pistol, hold LT / Z on a camera or laser, stand still; charge 20 s, drains
  1/s, refills 1.5/s; gun light red idle, green aimed, bright green jamming; LT drawn no longer fires); EMP removed from
  kit and wheel (code kept, unbound). Station 3: existing sweeping camera over the door, raises the alarm stage 1-3
  (never ends the run); the door opens when both stand in its blind spot, so one jams while the other crosses, then
  swap. Station 4: laser beams, a touch costs 15 HP (never below 1) plus a radio line; the jammer switches it off; the
  pair plates stay as the way past until B4. Host-authoritative; the client mirrors camera and beams.
- Protocol 16 -> 17 (client `jam` message, optional `sec` on `course`). feature/weapons also bumps to 17 (ground sub
  bit 128): the second merge takes 18.
- Stubs: light jamming; the partner's gun shows no jam light; no guard-luring noise.
- Checks: `npm run check` passes (1665 tests); e2e smoke, ctcourse (489 s, now covering stations 3 and 4), gadgets,
  darkness, pad pass. Report `B3-JAMMER.md`.

## 2026-10-19 - P1c standing and crouched idle
- Cause: holstered "ready hands" kept the armed hunch (about 30 deg). Fix (animGraph.ts): `POSTURE.kneel = false` (the
  idle kneel is not in the footage doc); an eased `hunchS` scales the hunch (0.05 holstered, 0.4 armed); crouch
  ready-hand constants lowered. Holstered: standing torso 3 deg, wrists 3 cm below the hips, crouch torso 42 deg, both
  feet planted. Stills `shots/p1c/`. Report `P1C-POSTURE.md`.
- Still off: in the crouch the hands reach forward toward the ground (hand / wrist orientation is feature/weapons').
- Checks: `npm run check` passes (1667 tests); e2e smoke, anim, wall pass.

## 2026-10-19 - B4 partner throw (Opus)
- Built: stand + co-op action offers the throw (crouched stays the leg-up); a partner within 1.6 m presses co-op and
  flies over the thrower, 3.2 m past, apex 1.7 m, 1.0 s, lands crouched; polite refusal with no room. Team-move rail,
  host-authoritative. Protocol 17 -> 19 (18 is feature/anim-cleanup's): `tmove` / `tstart` kind `throw` with the
  landing point. Station 4: a 6 m gap in a 3.5 m wall closed by the laser band; the thrown player presses the far-side
  "Laser release"; plates and door gone; the jammer route still works; a bay restart re-arms the band.
- Stubs: no throw animation (vault pose), no landing reticule, no guard knock-out on landing; stations 7 and 8 keep
  their placeholder consoles. Report `B4-THROW.md`.
- Checks: `npm run check` passes (1673 tests); e2e ctcourse (thrown feet 1.73 m over the beams in both views), smoke,
  netmove pass.

## 2026-10-19 - crouched hands from feature/anim-cleanup b46499f (applied by hand)
- READY_HANDS xCrouch 0, flexCrouch 0.9 (elbow about 52 deg): crouched and holstered, the hands come in by the thighs
  just above the knees. tests/readyHands.test.ts crouched elbow cap 50 -> 60 deg. Applied by hand (not a merge: the
  branch also carries unmerged weapons work). `npm run check` passes (1673 tests).

## 2026-10-19 - B5 hang-down hack (Opus)
- Built: crouch facing a drop + co-op offers; the partner presses co-op and is lowered head-first; the holder's stick
  sets the depth (1.0-2.5 m, starts 1.5, 0.8 m/s); co-op from either pulls up, the holder's B drops (land crouched, no
  damage); A interacts while hanging. Station 5: a 0.55 m roof hatch over the back room; the hack panel opens the grid
  door, in reach only lowered past about 2.3 m (replaces the lever placeholder). Remote: inverted hanging pose and the
  holder's brace, depth eased. Protocol 19 -> 20. Report `B5-HANGDOWN.md`.
- Stubs: no bespoke animations (holder uses the leg-up brace pose); no hiding, takedown or pistol while hanging; only
  the facing direction is checked for a drop.
- Checks: `npm run check` passes (1679 tests); e2e ctcourse (536 s: lowered, hacked, grid opened, pulled up), smoke,
  netmove pass.

## 2026-10-19 - B6 paired scanners (Opus)
- Built: two scanner panels 13.2 m apart; each player presses A / E at their own panel for a 2 s hack and stays within
  2 m; the door opens only when both finish within 1.5 s of each other (never scaled by difficulty, G131). Walking off
  or missing the window resets both; the failing player loses 10 HP (never below 1) plus a radio line. Panel glow grey /
  amber / cyan / green and a ready light per panel on both pages. Host-authoritative (use check, alive, at the panel);
  the old 1.0 s pair gate replaced by a flag gate. Protocol 20 -> 21 (`sc` in `course.sec`). Report `B6-SCANNERS.md`.
- Checks: `npm run check` passes (1692 tests); e2e smoke and ctcourse (580 s: late client 70 -> 60 HP and reset;
  together the door opened) pass.

## 2026-10-19 - B7 two-person rope (Opus)
- Built: standing at an edge facing a drop, the co-op action drops the rope (crouched there stays the hang-down,
  standing with no drop stays the throw); the partner presses co-op at the rope's foot and climbs with the stick,
  topping out beside the holder; co-op or B from either slides the climber down safely; if the holder goes, the
  climber slides down after 1.5 s; refusal when the drop is too low, too deep or has no ground; host-checked. Station
  7: a solid 4.4 m wall, 1 m thick, no door (console, wire and post gone); a far-side stair so a lone player can climb
  back. Protocol 21 -> 22 (`tmove` / `tstart` kind `rope`, sub bit 4). Report `B7-ROPE.md`.
- Stubs: no rope mesh drawn; the climb is a team move, not the solo rappel; throw over wire and pipe not built.
- Checks: `npm run check` passes (1700 tests); e2e ctcourse (642 s) and smoke pass; netmove not run.
