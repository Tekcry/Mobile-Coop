# Animation and controls rework - state

Updated 2026-10-21 00:08 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Now
- Overnight (orchestrator 2026-10-20 late, Michael asleep, approved overnight merges of green PRs): S2b PR, slice 4,
  merge Sector Ops' slice 5, slice 6. Lean prompts, one fix round, no polish; STATE after every step; each PR to the
  orchestrator with its tier results.
- Merged: slice 2 (#52, 4.17.0), slice 3 (#54, 4.19.0). feature/ct-prototype at master 813d13a4 + slice 4 work.
- S2b (the review's 5 causes of the "robotic" slice 2 walk: arm swing / ampMin, trunk counter-rotation,
  SOFT_KNEE_STAND, step length / cadence, weight transfer; plus the run pitch sum): Opus implementer on feature/anim-s2b,
  folder C:/NightShift/Mobile-Coop-anim-s2b, from master b125599e, logic e2e on port 4192; report S2B-REPORT.md; then
  one check, PR to master, then master merged into feature/ct-prototype.
- Slice 4 (crouched holstered set, the knee hand, crouched drawn, stand <-> crouch re-step): Opus implementer in this
  folder; report S4-REPORT.md.
- Slice 5 (walls): Sector Ops done at feature/anim-walls f67652cb (from f46426a5; S5-REPORT.md, check-s5.md PASS on the
  code; npm run check pass, e2e-wall pass; sheets not made, GPU lock busy). Only the standing wall idle passes in play;
  9 wall rows report-only. CT Core merges it after slice 4 is committed, then a wall round: footPlanner's side step at
  the wall (feet cross, 39-53 cm out), knee-out 7.6 cm, peeks at keyed weight 0, crouched idle track 10.9 vs 10.5 cm, the
  rig's keyed gate (`|| this.input.wall` instead of the keyDrawn >= 0.02 workaround), drawn-at-wall carrier flag,
  knee-hand path ignoring crouched wrist frames.
- Slice 6 (close quarters): briefed to Sector Ops 2026-10-21 on feature/anim-hold from master 4.20.0 (folder
  C:/NightShift/Mobile-Coop-anim-hold, port 4193; hold branch of animGraph + new holdKeyed.ts, closeQuarters /
  takedown hold parts; not footPlanner / motion / keyed / limits / characterRig outside the hold hand targets).
- Master 4.20.0 has the anim tuner (multiplier hooks in animGraph, motion, characterRig): merge master into S2b and
  feature/ct-prototype at commit time, keep the hooks.

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
