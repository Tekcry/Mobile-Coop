# Animation and controls rework - state

Updated 2026-10-20 21:42 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Now
- Slice 2 merged to master (#52, 4.17.0). Michael on /preview/: "almost worse than before"; he tunes with anim-tuner
  (Course Ready, feature/anim-tuner) first (Open items).
- Slice 3 (low ready and aiming, rifle and pistol, standing; the glide; the M2 sling draw) done at 5248dfad. Report
  `S3-REPORT.md`, sheets `shots/s3/`. Drawn keyed set (ready stance; low ready on the slice 2 legs; aiming = glide fwd /
  back / strafe by direction, left mirrored); the glide shuffle fixes the aimed strafe crab (knees 2.9x -> 1.23x max,
  track 46-55 -> 16-18 cm, never crossed); aimed back 1.24x -> 0.70x. Rifle low ready muzzle 39 deg down, elbows 4 cm;
  pistol compressed ready; sling draw 0.75 s (rifle, local only). CRAB_DRAWN_GATES on; CRAB_STRAFE range (reason in
  limits.ts). A5 (BRIEF): aimed strafe 0.7 m/s at full stick (was 1.26).
- Tier: npm run check pass (2058); desktop e2e:quick pass (e2e-stealth solo pass), e2e-mouse ok, e2e-pad solo pass;
  independent Opus check PASS (no fixes, so no fix round). Laptop e2e-ctcourse / e2e-coop / e2e-netmove on 5248dfad:
  pass (243 / 81 / 128 s). /ct/ moved; slice 3 PR to master opened.

## Next
- Slice 4 (sneak, crouch walk and run, crouched idle with the knee hand; crouched holstered from A4 and crouched drawn):
  wire `crouch_walk` / `crouch_run` / `sneak` / `crouch_idle` (S4-KEYS.md: the clips' pel y is the full crouch depth,
  use dy about the clip mean or replace the procedural drop; duty / liftH to the planner; the knee hand needs keyedArm
  on while crouched idle, characterRig.ts ~2053). Then slice 5 (S5-KEYS.md: mirror; the keys duplicate WALL_STANCE /
  WALL_SIDE_POSE terms) and slice 6 (S6-KEYS.md: the choke needs root motion; wires #41's guard clips; recheck
  keyedDrawn's bend gate for the human shield).
- Fold in Michael's anim-tuner values when he exports them.

## Open items
- Slice 3 polish: CRAB_STRAFE knee max 1.5 is slack (measured 1.26; about 1.35 still catches a regression); the sling
  draw has the rifle high near the head for a frame or two (~0.42 s); the pistol aim leans the chest over the gun
  (PISTOL_REACH.lean) and the slung rifle juts behind the back (both older); no crossover step at speed (with A5,
  Michael's call); the local MotionDriver starts the glide from aiming, the graph from raise > 0.5 (~0.15 s); remotes
  show no sling-draw path (the gun pops into hand on dw, as before).
- Michael on /preview/ 4.17.0 (slice 2, played on the phone): "There is animation issues, almost worse than before. I will wait for the anim tuner to try adjust it first." No specifics; he tunes with Course Ready's anim-tuner (feature/anim-tuner) and exports values, folded in later. CT Core read of shots/s2/walk-side.png: the after walk is upright and narrow as asked, but stiff: the arms hang nearly still (little swing at 1.4 m/s), the knees near straight at contact and through stance, the trunk rigid, so it can read robotic. Likely first tuner knobs: arm swing at the walk, stance knee flex, trunk counter-rotation. The phone runs at a lower and varying frame rate, which shows planner steps more.
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
