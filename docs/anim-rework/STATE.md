# Animation and controls rework - state

Updated 2026-10-21 11:40 Sydney. Branch feature/ct-prototype (folder C:/NightShift/Mobile-Coop-ct-prototype), merged
with master 4.14.1 and the side branches #38 / #40 (anim-metrics), #39 (anim-rig), #41 (anim-guard). Brief `BRIEF.md`
(Michael 13:30-13:40, M1-M5, A1-A3), plan `PLAN.md` (slices 1-6 and the wide-stance findings), metrics `METRICS.md`,
rig `RIG.md`.

## Resume
New local session, Opus. Paste:
```
CT Core Build: RESUME anim-rework. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/anim-rework/BRIEF.md, PLAN.md and STATE.md (this file), then carry on from STATE "Now". CT Core has first claim on the desktop lock; before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after; send long logic suites (e2e-ctcourse, e2e-coop, e2e-netmove, full e2e) with the exact commit to "Night Shift | Character Build" (laptop). Each slice: Opus implementer from the brief, Opus independent check, one fix round, npm run check, desktop e2e:quick + laptop co-op suites solo, a contact sheet for Michael, /ct/, a small PR to master the orchestrator merges. Report to "Night Shift | Orchestrator". No em dashes.
```

## Pause (2026-10-21 ~11:10, account switch): CT Core resume point
- In flight: PR #79 (feature/gl-warning-fix @ 005a4cfa, Menu Notes) npm run check + full e2e, run by CT Core as the
  desktop test runner (laptop was offline) from the detached worktree C:/NightShift/Mobile-Coop-testrun-desktop with
  scratchpad testrun.sh (E2E_PORT=4191 E2E_JOBS=2 E2E_SUITE_TIMEOUT=1500). Summary: C:/NightShift/scratch/runs/
  desktop-pr79-005a4cfa/summary.txt (check.log, e2e.log beside it). It removes its heavy.lock line
  ("CT Core Build | test runner pr79-005a4cfa") when it ends. NEXT SESSION: if that line is still in
  C:/NightShift/heavy.lock and no node / e2e process runs from Mobile-Coop-testrun-desktop, the run died with the old
  session: delete the line, then report the summary (or "did not finish") to Menu Notes and the orchestrator.
- #67 (S2b) parked: see the S2b line below and "## #67 parked" in S2B-REPORT.md on feature/anim-s2b (6c96715f).
- #77 (no-aim-assist) green on the laptop, for the orchestrator to merge (docs/no-aim-assist/STATE.md).
- #80 tuner-ui: the laptop runs it, not CT Core.
- After the switch: CT Core is idle unless the orchestrator sends work.

## Now
- Movement slices are off (Michael 2026-10-21: "Turn off movement slices and any research"); CT Core does tool support.
- Merged: slice 2 (#52, 4.17.0), slice 3 (#54, 4.19.0), slices 4 + 5 (#66, 4.24.0; full e2e pass on 515b1f07, e2e-pad
  known flaky). Slice 6 not started (S6 keys unwired).
- S2b PR #67 PARKED for the morning (feature/anim-s2b 6c96715f; detail: "## #67 parked" at the end of
  S2B-REPORT.md on that branch). Fixed: the crouch -> stand wrist pop (KEYED_GAITS.paceTau 0.1 s, 2b9904c0). Open: the
  e2e-stealth-ai peek assert ("a peek past the edge exposes the head alone ... (null)") fails because S2b's step line
  (movement.ts stepLen0 0.36 / stepLenK 0.25, motion.ts WALK_STEP 0.42 + 0.155 v) stops the wall slide on different
  feet, so the peek puts head and chest 15.9 cm past the edge (master 13.8) and no spot sees the head alone (master
  passes on one spot, segment 149). Next: restore one value at a time to find the reader on the wall path and keep the
  pre-S2b line there, or make the check less dependent on one spot. Probe: scripts/probe-wall-peek.mjs. Still to do
  after that: merge master 4.27.0 and apply the tuneStep 6 -> 4 cm patch (scratchpad s2b-tuneStep-fix.patch: S2b's
  longer run step makes replant 0.8 lift the trailing foot ~5 cm sooner), then a full e2e.
- Weight tuner section merged (#70, 4.27.0).

## Next
- After #67 and the Weight PR: tool support only, as the orchestrator asks.
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
