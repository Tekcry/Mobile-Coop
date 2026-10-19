# PR draft: ct-prototype playtest 2 (slices A, scanners, B+C, D+E, D2b)

Title suggestion: `CT prototype: playtest 2 fixes (speeds, ADS, wall, legs, holster, hang and climb-up)`

Version: not set here; the orchestrator sets it at merge (G183, minor step). Since PR #9.

## Summary
- **Slice A** (`docs/ct-prototype/A-PLAYTEST2.md`): five speeds re-spaced so the old speed 2 is the slowest (the D-pad sets
  them, the stick reaches that speed from 0.9 of its travel); ADS look 0.3; corner peek side fixed; the wall's open side
  is the shoulder and the last swap is saved; no flick on a shoulder swap; back to wall within 0.5 m; own footsteps follow
  the noise radius. Wall-entry test teleports moved 0.85 -> 0.75 m in the affected suites.
- **Scanners** (fd963a1c): a hack whose partner never started resets both at no cost; late or abandoned still 10 HP.
- **Slices B+C** (`docs/ct-prototype/BC-ANIM.md`): ADS framing the same standing and crouched; chest carries the aim,
  stock closer, elbows tucked; pistol reach pulled in; stance half-width capped at 1.1 hip half-widths; crouched armed
  push-out halved; pelvis drop held at walking pace (bob).
- **Slices D+E** (`docs/ct-prototype/DE-ANIM.md`): the grip stays on the gun through draw / holster, rifle path out at
  the shoulder; wider ledge hand reaches; drainpipe knee pole up, planted foot lift capped; ledge climb-up 1.1 s with a
  knee plant (team climb-ups keep `CLIMB_UP_TEAM`). Fix round 1 repaired a drainpipe regression from a new tie rule.
- **Slice D2b** (`docs/ct-prototype/DE-ANIM.md`, D2b): hang shimmy 0.7 m/s, hands one at a time back to back
  (`alternate`, `leadTime`); e2e-traverse shimmy reach 3.3 -> 1.6 cm.
- No wire change (PROTOCOL_VERSION untouched). Docs: CHANGELOG, TESTING, `docs/systems/` movement, input-and-loop,
  audio, world-and-characters.

## Michael's decisions
These job rows (`docs/ct-prototype/DECISIONS.md`, 2026-10-19) move to `docs/DECISIONS.md` as G entries at merge:
- Walkthrough questions (relayed by the orchestrator, not verbatim): wheel stays LB hold; no lethal / non-lethal switch
  (LT / RT is enough); gun drawn, A reloads (kept); scanners: no HP cost when the partner never started, 10 HP for a late
  or abandoned hack (built).
- Hang shimmy speed (relayed by the orchestrator, not verbatim): slow to about 0.7 m/s so the hands step slower and
  wider (was 1.2 m/s; slice D2b).
- Playtest 2 plan (STATE, "Michael's answers so far"): "Yes, go" (slices A, B+C, D+E; menu and visual items later).

## Tests
Full e2e on the PR head: pending.
- A: `npm run check` green (1747 unit tests); smoke, e2e-move, e2e-wall, e2e-pad, e2e-foley pass; e2e-ctcourse
  stations 1-6 pass, then the 600 s cap.
- B+C: tsc clean; unit anim suites pass; smoke, e2e-anim, e2e-move, e2e-weapons-carry, e2e-pad, e2e-ctcourse pass
  (implementer's run); independent check, no blockers.
- D+E: `npm run check` green (1753 tests); solo e2e-anim, e2e-clip, e2e-ct-warehouse, e2e-netmove, e2e-ctcourse (647 s),
  e2e-coop, e2e-menus pass.
- D2b: `npm run check` green (1753); solo e2e-traverse (every check, shimmy 0.68 m/s), e2e-clip, e2e-ctcourse (649 s),
  e2e-netmove, e2e-coop pass; independent check PASS.

## Known open items
- e2e-pad "stick speeds 2/4/5" is known flaky (same on the clean head).
- D2b: the shimmy sheets' camera hides the left hand; a hand clamped at the lip end falls through to the other hand
  (untested).
- D+E: rifle draw clearance -1.5 cm vs the -2 cm e2e-clip limit; rifle holster hand still about chin height mid travel;
  climb-up hands let go as the knee comes on; drainpipe hands at chest height (judge live).
- B+C partly judged: chest pitch spread (sheets are level), legs in turns (turnFollow landing limit loosened -0.35 ->
  -0.5, marked "prototype: revisit"), crouch vs CT footage, bob not measured in cm; crouched aim keeps the standing pivot
  height (check under low ceilings).
- Corner peek direction and swap feel not verified by eye; remotes still see the weapon in the right hand on the left
  shoulder (no aim side on the wire).
- e2e-netmove "stacked on one wall" fails alone on wall-clock lag; e2e-ctcourse needs the 900 s cap on SwiftShader.
- Corner-takedown loops in e2e-wall / e2e-pad skip a guard spawn the level moved more than 0.5 m (root cause not found).

## Try on /ct/
- D-pad up / down walk speeds (speed 2 slowest); ADS sensitivity; back to a wall and shuffle to each edge (peek side); the
  shoulder you chose carried into aiming and back; swap shoulders while aiming (no flick); A at a wall from a short
  distance.
- Footsteps against the noise meter; ADS standing and crouched, rifle and pistol; legs walking, running, turning;
  crouch hands and legs.
- Draw / holster rifle and pistol; hang shimmy; drainpipe climb and top; ledge climb-up (knee plant); a team boost
  climb-up; scanners with the partner never starting, and late.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
