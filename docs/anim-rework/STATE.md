# Animation and controls rework - state

Updated 2026-10-21 03:12 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Now
- Michael (overnight 2026-10-21): "Turn off movement slices and any research." Only already-built work lands: S2b and
  slices 4 + 5 as PRs; no slice 5 wall round, no slice 6 (Sector Ops stopped it before any code: feature/anim-hold
  8b6f6f7b holds only its stop record). Then CT Core does tool support only: the Weight tuner group next.
- Slice 4 (crouched set, A6 squat idle, crouched drawn, stand <-> crouch re-step) at b59c6e3d + A6 d2ffd4a4; report
  S4-REPORT.md, sheets shots/s4/. Independent check PASS (review only), no fix round. Merged master 4.20.1 (tuner hooks
  kept and re-pointed: kneeOutMul on kneeOut0, tuckMul over READY_ELBOW_TUCK_CROUCH, trackMul over KNEEL_NARROW) at
  517ca25a and Sector Ops' slice 5 walls (feature/anim-walls f67652cb) at 130ff997; added `o.kneeRest *= 1 - keyWallS`
  so the squat's knee IK yields to the wall set.
- Tier on 130ff997: npm run check pass (2129); e2e-anim, e2e-wall, e2e-clip, e2e-move pass; e2e-mouse fails in the remap
  section (the second autostart=proving page times out after 60 s) identically on master 6a4fb07f, so not ours
  (machine load: e2e-move took 490 s). Laptop e2e-ctcourse / e2e-coop / e2e-netmove on the PR head: sent. Slice 5 laptop
  confirm on f67652cb: check, e2e-anim, e2e-wall pass.
- S2b: implementer still running on feature/anim-s2b (C:/NightShift/Mobile-Coop-anim-s2b); straight to a PR on its own
  checks.

## Next
- The Weight tuner group (orchestrator 2026-10-21, Michael: "weight", tunable): feature/anim-weight from master with
  feature/tuner-camera df00a947's section registry (src/anim/tuneRegistry.ts, docs/anim-tuner/STATE.md "Section
  registry"; group ids prefixed "weight-"): momentum ramps, lean / bank / stop counter-lean, plant and landing loading,
  critically damped springs (chest, head, arms, sling, pouches), anticipation wind-ups, a camera-lag hook; identity =
  today's output exactly; e2e-anim / move / clip unchanged at identity; one check; minor PR.
- Keep the tuner-v2 hooks (characterRig jointOffsets / IK targets, player.ts jointsBegin / jointsEnd, weaponModel gun
  scale, 13 footPlanner reads) when editing those lines.

## Open items
- Movement slices are off (Michael); everything below waits for his hand tuning or a later ask.
- Slice 5 wall rows report-only, out of range (laptop f67652cb): slide R / L knees 1.32 / 1.47x, track 16.5 / 21.6 cm,
  knee-out 7.6 / 11 cm (footPlanner's side step at the wall); peek R / L knees 1.31 / 1.27x, knee-out 9.6 cm (peeks at
  keyed weight 0); crouched idle elbows 11.4 cm; crouched peek knees 1.66 / 1.57x, elbows 8.3 / 10.7 cm. Rig: the keyed
  gate should take `|| this.input.wall` (now WALL_KEYS.gate keyDrawn >= 0.02); no drawn-at-wall carrier flag; the
  knee-hand path ignores the crouched wrist frames.
- Slice 4 polish: CROUCH_POP margin thin (crouched aimed strafe 6.7 vs 7.5 cm); KNEE_HAND gate loose (dist 7 vs 1.4 cm
  measured); turnFollow.test.ts crouched latMin now lets a planted foot pass the midline; sneak has no head scan while
  moving; KEYED_CROUCH_POSE lean / drop belongs in the clips; crouch walk steps long (0.64 m at 1.7 m/s); crouch-run
  forearms near horizontal; remotes ease the crouch exponentially.
- Slice 6 not started: the S6 keys (S6-KEYS.md) stay unwired.
- e2e-mouse remap section times out on master 4.20.x (the second autostart page); for the master side.
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
