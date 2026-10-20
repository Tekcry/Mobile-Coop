# Animation and controls rework - state

Updated 2026-10-20 20:10 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Now
- Slice 2 (standing holstered locomotion, A4) done: 6546a1ca (keyed idle / walk / jog / run as one speed blend; the wide
  walk was the foot planner's fixed 13 cm landing gap; M6: run 4.0 m/s, 3.2 steps/s at the run, no lean below the run,
  knees 0.75x hips, arms along the sides) + fix round 534962d0 (visible idle head scan, hip follow / knee swing standing
  holstered only, idle track margin). Report `S2-REPORT.md`, sheets `shots/s2/` (before sheets on the pre-#47 meshes).
- Gates on: CRAB_GATES walk / jog / run; CRAB_STATE_GATES idle / start / straight / stop / turn round; CRAB_IDLE range
  (10.5 cm, hip-width idle). 90 / 180 changes report-only.
- Tier: npm run check pass (2030); desktop e2e:quick pass (e2e-stealth solo rerun pass); laptop e2e-ctcourse 243 s,
  e2e-coop 83 s, e2e-netmove 121 s pass on 6546a1ca and again on 534962d0 (239 / 80 / 119 s). Independent Opus check PASS; fresh check of
  the fix round PASS.
- /ct/ moved to the slice 2 head; slice 2 PR to master opened (orchestrator runs the full e2e and merges).
- Keys for slices 3-6 are in, unwired (Course Ready, new files only): S3 eb2190cd... see `S3-KEYS.md` (f8c744f5),
  `S4-KEYS.md` (eb2190cd), `S5-KEYS.md` (3b34fe3c), `S6-KEYS.md` (7aaa1394), each with its wiring notes.

## Next
- Slice 3 (low ready and aiming, rifle and pistol, standing and crouched, the glide, all weapon transitions incl. the
  sling draw): wire `ready_stance` / `glide_*` (S3-KEYS.md: mirror the strafe for the left, arms stay procedural, duty
  and liftH to match the planner). Owns the aimed strafe crab (knees 2-2.8x hips, feet 45-53 cm off) and aimed
  backwards. Then slice 4 (S4-KEYS.md: the clips' pel y is the full crouch depth; the knee hand needs keyedArm on while
  crouched idle), slice 5 (S5-KEYS.md: mirror; the keys duplicate WALL_STANCE / WALL_SIDE_POSE terms), slice 6
  (S6-KEYS.md: the choke needs root motion; wires #41's guard clips).

## Open items
- Slice 2 polish: 90 / 180 deg direction changes at 1.4-2.1 m/s open the knees to 1.3-1.4x and a knee 5-13 cm
  outside its ankle for a few frames (the 450 deg/s travel turn outruns two steps; gates change90 / change180 off);
  planner-only tight spins splay a standing planted foot up to 0.32 m (turnFollow.test.ts); the run's keyed trunk no
  longer leans into turns; crouch-sneak then stand still keeps the crouched foot spacing until PLANNER.idleErr (a
  re-step on crouch-to-stand); keyScan assumes near pure-yaw neck keys.
- Course Ready's S3-S5 preview strips sink toes-down planted feet (preview only, no game effect).
- Slice 1 polish not done: `player.ts`: while the gun is suspended (team move, carry, strike) with LT held, `ads` stays
  true and the aim camera stays up (as before the slice).
- Vision mode carousel in the selection wheel (Michael): given to the night-vision job, not ours.
- e2e-menus' title fade check and e2e-stealth's look-input check are wall-clock sensitive on a loaded desktop.
- H1 (park/ct-h1-wip, local branch, unverified): the crouch-run roll may still be wanted in slice 4.

## Michael's answers in this job (docs/ct-prototype/DECISIONS.md rows dated 2026-10-20)
- 13:30-13:40 the brief (M1 X tap holster / draw; M2 LT from holstered draws to aim slower, a sling draw; M3 RT tap
  knockout / hold kill; M4 traversal auto-holsters and returns; M5 the guard hold: slow, backward-first, limited turning,
  knife at the throat, choke / knife).
- 14:45 "The character definitely had a wide stance in the previous walk test".
- 14:55 jammer: "Another button - what makes sense? RF?" (RB / F held while aiming the pistol); A: "Interact always"
  (reload is X hold).
- 15:25 Toggle aim: "Remove it".
- Assumed A1 (KBM Shift run, Alt creep), A2 (reload on X hold; A no longer reloads after 14:55), A3 (no fire from low
  ready).
