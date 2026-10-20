# CT prototype: playtest 2 fixes, slice F and the CT footage movement pass (G1-G4)

Version: not set here; the orchestrator sets it at merge (G183, minor step). Since PR #9. No wire change
(PROTOCOL_VERSION 24). Settings gain `padV` (F7) and `camV` (G3), each with a migration and a literal old-settings test.

## Summary
- **Footage audit** (Michael, 2026-10-19 / 20: "Every movement aspect must be audited and brought into night shift"):
  all 90 CT clips catalogued (`docs/ct-prototype/FOOTAGE-CATALOGUE.md`); every move measured against ours
  (`docs/ct-prototype/audit/`: locomotion, camera, aim, walls, traversal, action menu, two EXTRA files for the gaps, two
  COVERAGE maps tying every catalogue move to an audit row; `AUDIT.md` the plan). Where the footage disagrees with an
  earlier number, the footage wins (Michael 00:50).
- **G1 legs and gait** (`G1-REPORT.md`): legs turn with the body, narrow planted feet, upright walk, run 4.5 m/s at 4.7
  steps/s with a lean and bank, quick kneel on a crouched stop, crouch knees off the floor, drop landing, the tense
  sneak near unaware guards (new).
- **G2 aim and weapons** (`G2-REPORT.md`): rifle draw 0.3 s, muzzle up at the shoulder; holster 0.15 s; diagonal back
  sling; rigid aimed upper body; lower compact pistol; recoil about 6x smaller; holstered swap selection only.
- **G3 camera** (`G3-REPORT.md`): FOV 86 and shoulder 0.15 (Michael: "Match CT"); open spaces 2.8 m, tight 1.8 m; aim
  head on the left with the reticle clear; slower wall pull-in; door push-in while passing; traversal cameras centred.
- **G4 traversal** (`G4-REPORT.md`): drainpipe rhythm and paired feet, shimmy 0.5 m/s with a pendulum, climb-up ends
  crouched (stand on a held stick), ladder 1.7 rungs/s with a 1.2 s top mount, rappel 0.6 m/s, vent crawl-out. A crouch a
  move adds by itself (or one being stood up from) counts as standing for co-op offers.
- **Slice F** (`F-REPORT.md`): shoulder always right holstered, crouched aim camera follows the body, crouch idle kneels,
  corner lean from the edge with a camera slide, climb-up knees then stand, rifle draw without a low dip, pad D-pad
  migration.
- **Playtest 2 slices A, B+C, D+E, D2b**, scanners (earlier entries in CHANGELOG "Unreleased - ct-prototype").

## Michael's decisions (move to docs/DECISIONS.md as G entries at merge)
Job rows in `docs/ct-prototype/DECISIONS.md` dated 2026-10-19 / 20: the walkthrough answers, the shimmy speed, the
playtest-2 walk, the overnight footage brief (23:15 / 23:20), the morning expectation (23:45), movement only and
review every animation (00:40 / 00:45 / 00:50: shoulder 0.15, FOV 86, footage wins), every movement aspect (00:55),
every movement in the videos (01:05). Assumed A2 (footage beats earlier numbers) confirmed 00:50.

## Tests
- Full `npm run e2e` on the PR head: E2E_LINE
- `npm run check` green on every slice commit (latest 1838 unit tests).
- Slice tiers: F on 637d41d5 / ee12d3e4; G1 + G3 on 0675cb12 (laptop ctcourse, coop, netmove pass; desktop quick set
  pass after the fix round); G2 + G4 + fix rounds on 3cf58345 / e84776d4 (see `STATE.md`).
- Independent Opus checks: F PASS; G1 + G3 PASS; G2 one block (a reversed holster swept through the body) fixed; G4
  and the fix rounds PASS.
- GPU contact sheets: `docs/ct-prototype/shots/f`, `g1`, `g2`, `g3`, `g4`.

## Known open items
- e2e-pad is known flaky; e2e-stealth's look-input waits are wall-clock (pass solo); e2e-camera-bounds level U fails on
  master too (legacy).
- Measured gaps still open (audit files): walk head travel 3.2-4.4 cm vs CT 2-3; shimmy hand cycle 0.8 s vs 1.0;
  drainpipe 0.9 m/s vs CT cadence ~0.45; corner peek 0.35 / 0.3 s vs 0.2 / 0.17 (e2e-wall's 6 cm cap); the scope view,
  rope climb, floor trap, shaft descent, crouched climb-over, goggle-touch animation, free jump arcs, guard door timing,
  the hold-A action menu (G5), walls and doors (G6) and grab / hold / knockout (G7) are not built yet.
- Polish lists: `POLISH.md`.

## Try
- Walk, jog, run, turn on the spot, stop; crouch and stop (kneel); creep near an unaware guard (tense sneak).
- The camera in the yard vs the airlocks; aim rifle and pistol (head left, reticle clear); FOV 86.
- Draw / holster the rifle quickly and repeatedly; the pistol hold.
- Drainpipe, shimmy, ledge climb-up (crouched end, hold the stick to stand), ladder up / down / top, rappel; the co-op
  rope after a climb-up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
