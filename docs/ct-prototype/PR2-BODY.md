# CT prototype: the hold-A action menu, walls and doors, grab / hold / knockout (G5-G7) from the footage

Version: not set here; the orchestrator sets it at merge (G183, minor step). Since PR #31 (4.10.0). No wire change
(PROTOCOL_VERSION 24).

## Summary
- **Michael's guard-menu corrections** (08:10 / 08:20 / 08:25, verbatim in `docs/ct-prototype/DECISIONS.md`): behind a
  guard the hold-A list is only GRAB CHARACTER / BACK TO GAME; once grabbed RT kills, LT knocks out, aim is the human
  shield, the guard is never let go, there is no BACK TO GAME, and hold-A shows INTERROGATE only when the guard has
  information (none do yet, so no menu). Assumed A3: ledge / pipe / window takedowns keep one KNOCK OUT row.
- **G5 the hold-A action menu** (`docs/ct-prototype/G5-REPORT.md`; Michael: "requires holding A and selecting which
  option you would like to proceed with, including returning to game (no action). I want it to be identical."): one
  context menu for everything in reach. INTERACT list top right; hold A: BACK TO GAME on top with row 1 highlighted, the
  stick / D-pad (wheel or W / S) moves it, release runs it (BACK TO GAME runs nothing); a quick tap runs row 1; hold
  rows (hacks, medkits, alarms, revive) fill while A stays on them. Replaces the door and grab menus. Layout from the
  measured footage, our own art. Fix round: a row that leaves the list while held falls back to BACK TO GAME; pause
  resets the menu; B closes a held list only.
- **G6 walls, corners and doors** (`G6-REPORT.md`): crouched on a wall she is side-on with a hand on her knee (Michael),
  turning through on a reversal and kneeling when still; slide 0.35 / 0.5 m/s; the standing slide turned toward
  travel; Open steps to the latch side with the hand on the leaf (spot ray-cleared), stealth open slower; guard doors
  0.4 / 0.35 s. Fix round: remote wall-crouch parity (knee pole from the body yaw), the crouched reversal off the wall.
- **G7 grab, hold, knockout, carry** (`G7-REPORT.md`): grab step-in 0.42 s and pull-in 0.6 s, forearm across the
  throat, hostage walk 0.75 m/s, knockout lowering 0.85 s, interrogate 1.5 s, body pick-up 2.0 s, carry 0.8 m/s with
  doors, drop 0.8 s; fix round: drop and lift without clipping or pops, client knockout posed.

## Tests
- `npm run check` green on the final head 367197a0 (1924 unit tests).
- Full `npm run e2e` on 8ce58ee2 (desktop, E2E_JOBS=2, 42 min): all pass except e2e-ctcourse (900 s cap under load; PASS solo on the laptop on 8ce58ee2, 237 s), e2e-pad (known flaky) and e2e-stealth (look-input wait). Laptop solo on 8ce58ee2: e2e-netmove 121 s, e2e-ctcourse 237 s, e2e-coop 82 s, all pass.
- Slice tier on the final head 367197a0 (Michael 08:10-08:25 guard menu + the door-open spot fix, both after the full run): TIER_LINE
- Independent Opus checks: G7 PASS (then a clipping fix round); G5 + G6 + G7 fix: four blocks (menu row fallback, a
  per-step iterator, the door-open step into thick walls, the crouched reversal clip), fixed in 8ce58ee2; re-check: three
  fixed, the fourth (the door-open spot on the push side of a thick wall) fixed in 367197a0.

## Known open items
- Client guard doors swing at the player's times (0.75 / 0.8 s) where the host uses 0.4 / 0.35 s; the shared
  kinematic step still allocates two vectors per step (older code, now used during door opens).
- The guard's fists do not rest on her forearm in the hold (needs hand IK); the carried body's arms swing level mid-hoist.
- Aiming at a wall raises the rifle but firing is not blocked; an ajar-door menu is not built.
- e2e-pad, e2e-stealth (look-input waits) and e2e-menus (title fade) can fail under load; they pass solo.
- Remaining measured gaps: `docs/ct-prototype/audit/` (scope view, rope climb, floor trap, shaft, goggle touch, free
  jump arcs, crouched climb-over).

## Try
- Hold A at a door, a guard, a panel: move the highlight, release; release on BACK TO GAME; a quick tap.
- Crouch on a wall and slide both ways, reverse, stop; open a door normally and stealthily.
- Grab a guard from behind, walk him, interrogate, knock out; pick up the body, carry it through a door, drop it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
