# Backlog (feedback inbox)

Every piece of feedback lands here with where it goes. Michael decides scope; Claude adds items, never silently drops
them. When an item ships, mark it done with the job and version. Jobs and their order: `docs/ROADMAP.md` (on
origin/feature/menu). CT is the default; Michael's decisions override it (docs/VISION.md, docs/DECISIONS.md).

Format: `N. Item - destination - status`.

## Open

1. **Free Roam: shoot out lights, use switches and alarms.** Must work in Free Roam for testing. Destination: the light parity work (G47).
2. **FPS / perf overlay is too big.** Make it a minimal bar along the top edge, critical numbers only. Destination: unscheduled.
5. **Ghost copy of the operator on Epic. CLOSED by voxel-retire (2026-10-23): the voxel body code is gone.** A second copy of the operator's voxel body, its level-of-detail mesh `player-vox-lod` (`src/voxel/voxelBody.ts`), can draw beside the real one; detail in `docs/archive/progress-phases.md` ("Noted fixes"). Destination: graphics fix batch (Michael: "don't do it yet").
6. **Voice test, a later idea (G82).** Generate the Mission 1 opening three ways: the browser's built-in speech, a free open-source voice model run on this PC, a paid AI voice service; Michael picks by ear. Until then radio and subtitles are text. Write all radio lines short and voice-ready. Original voices only: never clone or imitate a real actor. Destination: unscheduled.
7. **Epic misses its design targets on the RTX 4090 laptop.** Main thread about 4.3 ms against 3 ms, frame spikes. The goals are rewritten to the laptop's numbers (G14). Destination: graphics fix batch.
9. **Skin shader D3D warning X4576 (dynamically indexed array).** Makes it recompile slowly, a likely hitch when guards first appear. Destination: graphics fix batch.
12. **Benchmark at 7680x2067 (RTX 4090 Laptop, v3.5.0, 2026-10-09, `sbd-feedback-2026-10-09.html`).** Low 120 fps (1% low 79), Medium 77 (19), High 64 (29), Ultra 48 (14), Epic 45 (10, worst spike 227 ms, main thread p95 6.8 ms). Data for item 7. Destination: graphics fix batch.
13. **Thermal vision as CT (G102).** CT's colour ramp (cold background deep blue to purple; heat blue, green, yellow, orange to red at the torso), soft blurred edges, no fine texture, a tube vignette; people behind closed doors as a dim silhouette. Original art only. Destination: the CT prototype.
15. **Strip lamps light from the whole fitting (Michael, 2026-10-09).** A lamp's light falls off from the fitting's centre (`world/lampMath.ts`), so a long strip lights like a point; real linear fittings are line sources (`docs/research/night-vision-and-lamps.md`). Proposal: measure from the nearest point on the strip's glowing length. Changes gameplay light, the bake, the desktop path and an engine fact (`docs/level-design.md` Section 12). Approved by Michael 2026-10-09; sorted out when the light parity work is built (G47).
16. **Night vision realism proposals** (`docs/research/night-vision-and-lamps.md` section 4): a guard's flashlight whites out the goggles; muzzle flashes and flashbangs flash brighter; scintillation in total darkness; gain lag from dark into light; no colour as a puzzle rule. Only what CT shows survives (G1); grain as CT (G101). Destination: the CT prototype, with thermal.
23. **Ring airfoil** (`docs/systems/ct-toolkit.md` 3.8). CT's gadget set is settled by the CT co-op research (G76).
24. **Knife** (`docs/systems/ct-toolkit.md` 3.10: knife takedown and cutting). Its role is settled by the CT co-op research (G76).
25. **A30 must judge fire stairs per building** (`rooms[].building`). Today A30 compares floor heights only, so a fire stair in one building counts as serving a level of the other (`docs/kestrel/schema.md` section 6). Destination: Kestrel tools, when Kestrel resumes (G53).
27. **FIXED (gl-warning-fix, docs/archive/gl-warning-fix/REPORT.md).** **GPU-only GL warning on RT + TAAU + Panini (2026-10-21, Menu Notes GPU run).** e2e-desktop under `E2E_GPU=1` fails "ray traced + TAAU + Panini render without console errors" on master d537cbd8 and #58 alike: repeated "GL_INVALID_VALUE: glGetProgramiv: Program object expected" (ANGLE D3D11 only; software GL passes). Something queries a deleted program on that path. Fix the query, or let that assert ignore the warning if it is harmless.
26. **Phone is launch-only and untested (G182).** A phone opens the game on the minimum settings with the UI scaled to its screen and a Bluetooth pad as the input; no touch controls, no phone checks or tests, no device runs. Destination: none (testing only).
28. **Gameplay reads the rig pose (log only, havok-stall 2026-10-21; for later review).** Not graphics state, but gameplay
    tied to the animation: the guard's perception eye comes from `rig.headNode` (`src/ai/enemy.ts:1779-1781`), the
    player's hit volumes follow the rig (`src/game/playerTarget.ts:101-119`), and `src/ai/body.ts:96-124` reads the
    pose too. An animation change can move what a guard sees or where a shot lands. No change made; review whether these
    should read the gameplay root (controller position, crouch, lean) instead. Destination: unscheduled.
29. **DONE (anim-bake-all, 2026-10-22): every tuner slider bakes.** The sliders below bake into the base table's generic
    `sections` key (`docs/archive/anim-tuner/BAKE.md`, "The generic table"), strideMul per moving state; a shared target whose
    groups differ bakes per state; BAKE_MANUAL holds the Joints mirror lock only. Still open (a later job): the remote
    partner reading the move sections (it needs the role on the wire), and the Body root offsets on the partner and
    puppets (BAKE.md, Body base, "Open"). The list as it was:
    **Tuner sliders that do not bake yet (rule: every slider the tuner shows must bake; anim-bake-targets, 2026-10-22).**
    The bake reports these "manual" (`src/anim/tuneBakeTable.ts` BAKE_MANUAL; `docs/archive/anim-tuner/BAKE.md`). Each needs
    a code target (usually a per-state default every rig reads). Destination: unscheduled (a later bake-targets job).
    - Body strideMul: one shared target (MOVEMENT step lengths); bakes only when all 13 moving states agree, otherwise
      "manual: shared target". Needs a per-state stride table.
    - Gun, aimed (rifle / pistol aim groups): gunUp (the sight-to-eye solve holds the sight at the eye; PISTOL_REACH.y
      is also the sight drop); gunPitch, gunYaw, gunCant (no code value: aimed, the weapon rotation follows the aim).
    - Camera: camFovAdd (a player setting, video.fovH; CAMERA.fov is only the settings default); camZoomMul (no code
      value: the aim zoom is 1 without a scope); camBlendMul in the aim groups (the aim-in time is the weapon's draw
      time, not a camera constant).
    - Speed: glideFwdMul (it scales the whole aimed glide; adsSpeed only caps it).
    - Step: lift (the moving gaits' lift is clip data, liftH); lock at idle (no effect while still); dur (no single
      constant); slide (inline literals in footPlanner); stride0 / stride1 / stride2 (no per-pace constant, LAND_AHEAD
      is one share); toeOff (HEEL_RAISE plus an inline literal); heel (HEEL_ROLL.pitch plus an inline literal);
      replant (inline literals).
    - Weight: chestDampMul, headDampMul, armDampMul, gearDampMul (WEIGHT_BASE.zeta is one value for all four springs);
      stopSettle, accelLean, stopLean, bank, plantDrop, landDepth, chestLag, headLag, armLag, gearLag, antStart,
      antJump, camLag, camDip (no code value: the layer's amount is the slider; needs a per-state default table).
    - Co-op moves (team_boost, team_relay, team_throw, team_hang, team_rope, team_revive) and Traversal (trav, every
      slider): visual offsets on the local rig only, no code value; needs per-move base offsets every rig reads.
30. **Baked lamps can miss a material made in the same frame one is disposed (possible real bug, gpu-tests
    2026-10-22).** `BakedLamps.frame` (`src/world/bakedLamps.ts`) attaches the lamp plugin to new materials only when
    `scene.materials.length` changes, so an add and a dispose in one frame leave the new material unlit by the baked
    lamps (a light parity break). Not seen in a run: found while fixing e2e-lightbake's GPU-only timing failure. Fix:
    track a material-added flag (the scene's new-material event, read next frame) instead of the count. Destination:
    unscheduled (the light parity work).
    **Fixed (lamp-plugin-gap, 2026-10-22):** the new-material event marks the next frame beside the count check (`tests/lampPluginGap.test.ts`).
31. **A fast look-drag may eat the next tap on a real touch device (low priority; phones are for testing only, G182;
    gpu-tests-3 2026-10-22).** In headless Chrome a 200 px CDP drag in ~80 ms became a fling, and the next touch only
    cancelled it: the on-screen pause button's first tap did nothing (#148 fixed the test by holding still before the
    lift). The game already sets `touch-action: none` on html / body and `#game` (`src/styles.css`, and the canvas's
    `touch-action` attribute in `index.html`), yet the fling still happened, so check on a real phone whether a quick
    look-swipe then a tap on the pause button (`.touch-pause`, a DOM button in `#ui-root`, its own `touch-action` not
    set) needs two taps. If it does: act on `pointerdown` / `pointerup` instead of `click`, or give the button
    `touch-action: none`. Destination: unscheduled.

## Flaky e2e suites

`scripts/e2e-quarantine.json` lists the quarantined suites (owner, expiry, reason; the flake budget in
`docs/systems/testing-tools.md`): they always run, a failure is printed "KNOWN FLAKY" and does not fail the run until
the expiry, a failure in any other suite does. Remove the entry when the test is fixed. Rerun a suspect alone
(`E2E_PORT=4191 node scripts/run-e2e.mjs e2e-coop`) before reading anything into one failure.

Process audit (2026-10-19, approved by Michael; `docs/process-audit/REPORT.md` section 2): the co-op suites are fixed
by their own desktop job (the likely shared cause: wall-clock waits against a sim slower than real time on software
GL); the rest are parked, not fixed. Co-op test fix (2026-10-19, `docs/archive/coop-tests/`): the cause confirmed and fixed
(sim-clock waits), plus stale test numbers (the walk-off crouch, the medkit heal) and a crouch race; e2e-coop,
e2e-netmove and e2e-ctcourse passed 3 solo rounds and 2 full runs on the laptop. `KNOWN_FLAKY` is e2e-pad only.

- **Four load flakes (fixed in the tests, flake-fix 2026-10-22; `docs/flake-fix/`)** - each passed solo and failed under
  `E2E_JOBS=2` on the laptop. Not on `KNOWN_FLAKY`.
  - e2e-stealth-ai "the guard there sees the peeking head only" (los true, head false): the spot was picked from one
    look at the held peek, but the pose sways a few mm and the picked spot cleared the chest by about 5 mm, so the
    guard's think tick (a random phase) caught the chest. Fix (fix round 2): candidate spots are floor points on a 5 cm
    grid where a guard can stand, judged with a real grunt's eye offset; a spot counts only if it hides chest and head
    before the peek and sees the head and not the chest after every fixed step of 2 s of the held peek (each step's
    target points are the pose the guards perceive that step), ranked by the largest margin it held. A calm grunt is then
    put on the exact spot (not its 0.5 m nav cell's centre, where the spawn snaps it: a 1 cm margin and cell centres left
    no spot, the head-only wedge is a few cm wide) and made passive (it never turns or walks; its think still sets
    los / losHead). Over 2 s more its own eye must hold at every step (else the next spot, up to 8), and at every one of
    its thinks (at least 5) it must report the head only; released, hidden again. A failure prints the first bad think
    (lines, chest and head points) or why each segment gave no spot.
  - e2e-netmove "timed out waiting for client assists": the client's `assist` lasts the boost's 0.9 s of game time and
    began and ended between two polls on a slow page. Fix: `watchTeam` (e2e-net-lib) logs every team state with sim
    time; the check reads whether the client went through `assist`; a failure prints both views (`teamLog`).
  - e2e-mouse "the capture times out after 5 s": the screen's wall-clock 5 s timer fired after the test's fixed 5.6 s
    look on a slow page. Fix: the page times it (click, a 4.5 s probe that must still be capturing, the moment
    `cancelCapture` runs, a 5 s probe armed after the click); the give-up must come at 5 s and before that probe.
  - e2e-ctcourse "station 4: the client is thrown": the cause is suspected, not proven. The old failure dump showed no
    `lastThrowRoom` and no refusal, so `requestThrow` (teamController) never ran and the landing was never measured:
    the press most likely never reached it, either because the offer dropped out at the press frame (and the client
    began its own `throwOffer`) or because GameState's gates swallowed the press (`pistolAsk`, `wallWas`, `busy`).
    Kept as a sound stabiliser: the press waits until the client's view of the host matches the host (10 cm, 0.05 rad),
    the host still offers and the client stands free. Diagnosis: both pages' team logs print on a failure, and
    `teamLog` (e2e-net-lib) now adds those gates (wall core, door peek and door open active, pistol aim asked, the
    current weapon class, carrying), so the next failure says why.

- **e2e-ctcourse:4 "A8 pass 2 grille: closes A8-grille" (fixed in the test, marlow-batch-1025 2026-10-25; owner Marlow
  Build)** - auto-quarantined 48 h after 2 flakes in 44 runs this week (5 "failure stands" on 10-23); train 106 failed
  it on the first try and passed it alone on the rerun. The assert is the door item's `use` in `closeDoor`
  (`scripts/e2e-ctcourse/a8Strongroom.mjs`), right after the grille relocks open; the `use` helper
  (`scripts/e2e-ctcourse.mjs` `use`) returns 'disabled' when the item is off (it skips reach, so the host's position and
  a guard nearby play no part). The "fails=1, 1:late" sync in the log is step 8's deliberate late hack of pass 1, not
  part of this failure. Cause: on the host step the lock lands, `StealthSystems.fixedUpdate` (`gameState.ts` ~:2000)
  sets the item from the Q9 rule (open, so usable though locked) before the lock, then `CourseMode.applyLocks` (in
  `mode.fixedUpdate`, ~:2109; `courseMode.ts` ~:1047) turns it off with `!locked` and sends the course message with the
  lock; the next step's `StealthSystems.fixedUpdate` turns it back on. The test waits for the lock on the host and on
  the client, both of which can be seen inside that one-step gap, and on a loaded host frame (a few frames a second,
  up to 4 steps each) the gap is long enough for the `use` to land in it. Fix: `closeDoor` waits (sim clock, 5 s) until
  the page's door item is enabled before the `use`; a door item that stays off still fails the step there, and the
  relock-keeps-it-open, the close and the shut-and-locked 'disabled' asserts are unchanged. Evidence pending: the
  laptop e2e-ctcourse run on the fix head. Game-side follow-up (not changed here, a src change for Marlow Build):
  `applyLocks` writes `!on` against the Q9 rule `!locked || target !== 0`, so for one step the item is off; a
  player's own press never sees it (`updateInteract` runs after the stealth step), but a client's `use` message handled
  between steps (`coopHost.onUse`, `!it.enabled`) would be dropped and the mirrored item list can carry `on: false` once.
- **e2e-menus "stall" at (tuner-camera) on the desktop (fixed in the test, havok-stall 2026-10-21; `docs/archive/havok-stall/REPORT.md`)** -
  the full suite failed 5 of 5 on the desktop (i7-7700K, software GL) right after "tuner: Menu closes it and the game
  runs". It was not a hang: the runner killed the suite at its 600 s limit (`E2E_SUITE_TIMEOUT`), and at `E2E_JOBS=1`
  the runner streams the output and drops its "KILLED" line, so it looked like one. The match page ran at about 1.5
  rendered frames a second (the menu page's 1920 x 1080 backdrop stayed open beside it, both on SwiftShader, the CPU at
  100%), and the tuner-camera block waited 360 rendered frames; with `E2E_SUITE_TIMEOUT=900` the old suite passed in
  894 s. The Havok stacks from CDP pauses (J2-STALL) were samples of slow frames, not a spin: frames kept completing,
  physics always got 1/60 s, at most 4 steps a frame. Fix: the menu page goes to about:blank before the match page
  launches, and the tuner-camera settles run on the sim clock (`stepHeadless`); the suite alone 894 s -> 312 s. Not on
  `KNOWN_FLAKY`. Open (outside the job): `scripts/run-e2e.mjs` should print the KILLED line in streamed mode too.
- **e2e-levels "a runner climbs the rack ladder" (watch, havok-stall 2026-10-21)** - took 9-30 s of game time on master
  against its 30 s budget (guard think ticks draw `Math.random`; real-time frames before each chase). Now the chases
  run on the manual clock and each seeds `Math.random` (7919): 3 solo runs gave 15.5, 10.25 and 15.5 s (the rest of the
  spread is the world state when the manual clock takes over). Not on `KNOWN_FLAKY`; remove this entry after a few
  clean full runs.
- **e2e-coop** (fixed 2026-10-19, `docs/archive/coop-tests/`; off the list) - failed 1 of 4 full serial runs, about 1 of 5 alone (2026-10-09). Failure: "client grabs a host guard from behind": the match's guards re-alert after the steps before and the picked guard turns to face the client, so the offer becomes the front takedown. Kept fix: the picked guard's `update` is switched off (a statue) from the pick until the grab is held. **The statue covers the netcode only; guard perception and turning in co-op are not tested by this step.** Open: "client strike denied" (pre-existing; wait until the client strike can start and assert `begin()` returns true).
- **e2e-menus** (2026-10-21, not a hang; not in `KNOWN_FLAKY`): on the desktop the suite was killed at the 600 s suite
  limit at its "(tuner-camera)" step (the runner prints no KILLED line at `E2E_JOBS=1`, so it looked like a stall).
  Cause (job havok-stall, `docs/archive/havok-stall/REPORT.md`): software GL there runs the page at 1-4 fps, and that block
  waited 360 rendered frames; the Havok stacks in `docs/archive/anim-joints/J2-STALL.md` were snapshots of slow frames, not a
  spin. Fixed on `feature/havok-stall` (sim-time waits, the idle menu page blanked: 312 s alone). The laptop passes it.
- **e2e-darkness** (moved to the GPU list: it reads final pixels) - failed on an idle machine in the Epic look (the driver compiles the probe card's shaders for seconds after first draw). Fixed in the test: wait for `scene.isReady()` and filter the driver's "glGetProgramiv: Program object expected" warning. Kept in the list until it has run clean for a few full runs.
- **e2e-netmove** (fixed 2026-10-19, `docs/archive/coop-tests/`: sim-clock waits, the walk-off un-crouch; off the list) - timing failures under load: "ladder after a climb: host mode ground" (fixed in the test), "timed out waiting for host braces" (host frames 307-418 ms with other suites running; passed serially), and once "Execution context was destroyed", suspected to be the app reloading when a service worker activates externally (`src/pwa`). Blocking service workers in the test contexts makes every suite's "no console errors" check fail; not fixed.
  Two more fixed in the test (player-flake-fix 2026-10-26): "host sees the client climbing the hanging body" (the
  ~0.8 s climb was polled from Node; now latched on every host step, with the host's copy modes logged on a
  failure) and "client rolls" (the run was timed by the slowest page, so under load the client ran into a wall;
  now timed on its own steps until it is at roll speed).
- **e2e-weapons-carry** (off the list 2026-10-19: two clean full runs) - failed once (reason not captured), passed in every other run. Next step if it recurs: read `test-results/e2e/e2e-weapons-carry.log`.
- **e2e-pad** (fixed in the test, player-flake-fix 2026-10-26; out of quarantine) - from hud-guidance B5 (7ff3c4ce7,
  train 112) every run failed "focus Report feedback": B5 added a Notes row to the field menu and the test walked
  three downs to Report feedback; the quarantine printed it KNOWN FLAKY, so nothing after it ran. Now the pad walks
  the whole menu by row keys (Resume, Objectives, Notes, Settings, Report feedback, Animation tuner, Quit). The old
  remap failure (full run 2, 2026-10-19) was fixed by test-speed and load-latent-ui1 (`pressPair`) and has not
  recurred. Open: one desktop run (68c15083, 2026-10-25) died "Execution context was destroyed" after the quit to
  the main menu (a PWA update reload at the menu suspected, unproven); the suite now prints a main-page navigation.
- **e2e-stealth-ai wall-peek block (watch, 2026-10-21)** - failed in laptop full runs (E2E_JOBS=1) on #65 (no assert
  printed) and #71 ("the guard there sees the peeking head only": los true, head false); passed solo on both. On #67
  (S2b) the edge peek fails solo too: real there. Suspect load timing in the peek sampling. Not on `KNOWN_FLAKY`; if it
  fails a third time on a head without S2b, read its log and add a settle wait.
- **e2e-kestrel (not flaky, failing on master; moved to LEGACY, Kestrel paused)** - fails alone on master 9295c65 (the Wren merge)
  and on feature/weapons: "camera rays along the tour: ... 133 inside them go to P04". Camera vs level check,
  found by the weapons job (2026-10-19); for the test fixes job or the camera tuning.
- **e2e-camera-bounds (LEGACY, parked with Kestrel; known failure)** - fails at level U (U-Z4V): the operator falls
  through the floor (head y -33 to -35), so the camera check reads below the floor. Known legacy failure: REPORT ONLY
  in affected runs once J20 T4 lands (S3a); for the camera tuning or the test fixes job.
- **e2e-foley** (moved to AUDIO, parked) - the walk-plants check sits on its threshold at the step-22 walk speed (0.64 m/s: 3 or 4 plants against >= 4). Retuned with the CT prototype's speeds.
- **e2e-bunker** (LEGACY, off the flaky list) - "the partner teleported across the host's spot is never solid" fails intermittently (training REVIEW-NOTES T5b2 under load; in the consolidation 2 of 4 solo runs failed with 6-13 frames solid, 2 passed). Suspect: host-page timing in the desktop browser context (snapshot gaps near the 0.3 s stall rule). The co-op test fixes job (G51) looks at it with e2e-coop and e2e-netmove.
- **e2e-anim draw pop (fixed in feature/anim-cleanup)** - the draw from holstered popped (~0.14 per frame on the right
  hand inside the swap fade). The draw / holster now carries the gun along a path in the trigger hand to the back mount
  and the holster (WeaponModel travel): max 0.083 per frame, asserted < 0.1 like every other transition; the arm still
  hits its joint-rate limit on some frames (reported).

## Pending input

- Night vision and thermal reference images received 2026-10-09 (items 10, 13).

## Done

8. **Epic's level material (voxMat) uses 15 of 16 texture units** - void: the voxel render path and `voxMat` are removed (G282).
3. **Desktop blur** - fixed 2026-10-09 (3.6.0): depth of field read its paused depth pass as "at the lens"; now not aiming is fully sharp (`vfx/dofAperture.ts`).
4. **Holstered unless aiming, no hip fire, a strike on the fire button** - built in the locomotion run; now G21 (holstered rules) and G42 (palm strike); timings retuned in the CT prototype.
10, 17, 18, 19, 20. **Night vision look, glare, smear, fade, desktop darkness** - built in the Step 4b fix rounds 1-5 (2026-10-09), approved by Michael.
11. **"SONAR" label** - sonar is off the goggles button; thermal replaces it.
14. **iPhone crash at the menu** - void: desktop only (G12).
21. **Exchange v2 parked items** - void: the Exchange is retired (`docs/archive/maps/`).
26. **Unpark Hunter, Wave and Mission as PvP attack and defend** - replaced: only Hunter comes back, later (G7); Wave and a team-versus-team Mission do not (G8).
