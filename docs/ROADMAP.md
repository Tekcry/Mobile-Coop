# Night Shift - roadmap

State only: what is happening, what comes next, what waits on Michael, what is done. The rules (the orchestrator,
machines, merges, versions, test tiers) live in CLAUDE.md "Sessions". Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh (new account, 2026-10-19 22:55; the old page belongs to the old account)

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Priority (Michael, 2026-10-19 16:30): "Sector ops should be low priority over anything else. I want to get coop training
bunker fully functional and running, but sector ops can at least run when there is opportunity." So the co-op training
course (CT Core) comes first for the desktop lock, the laptop test runner and the orchestrator's reviews; Sector Ops
runs only on spare capacity and yields the desktop lock whenever CT Core needs it.

Priority (Michael, 2026-10-20 10:30): "movement and animations are the top priority". CT Core (G8 keyframed clips, then movement gaps) has first claim on the desktop lock, the laptop runner and the orchestrator's reviews; everything else fits around it.

Last updated: 2026-10-19 23:25 Sydney (new Claude account: every session restarted from git at 22:40).

## Waiting on Michael
1. Walk slice F on /ct/ in the morning (CT Core, overnight).
2. Prune old branches and worktrees when convenient (docs/process-audit/REPORT.md section 5). feature/ct-research is deleted.

## Decided (Michael, 2026-10-19 dashboard)
- Movement rebuild from the footage (23:15): "Catalogue them, audit, and update our movement system to match the recorded animatimations, movements camera angels, speeds, everything about movement. Must be exactly the same as the recorded movement, only made original by you." (23:20) "I expect a thorough audit of the movement system and have it replicated in my game using original code." This lifts the no-refining rule for movement. Footage: C:/NightShift/Mobile-Coop-ct-prototype/pc/ct-work/ (gitignored; 88 clip folders, 62 from 2026-10-17, 26 new from 2026-10-19). CT Core, after slice F.
- Morning bar (23:45): "my expectation in the morning is that night shift movement and animations will operate identically to those recorded. It should feel the exact same when i play it. I expect prototype animations for all of it, with no clipping and must be believable." Told: identical everywhere overnight is not realistic; the biggest gaps closed plus a measured list of what remains.
- Co-op training walkthrough (23:45): "I also want coop bunker/training fully prepared for a coop walkthrough test, including prototype/light visual pass over it to ensure theres sufficient lighting where required." New job course-ready (Night Shift | Course Ready Build, feature/course-ready); movement keeps first claim on the desktop GPU (23:47).
- Sector Ops Warehouse (23:45): reviewed and overhauled for fun flow, several stealth routes per section (pipes, ceiling crawl spaces, co-op passages), logical guard routes, realistic buildings; dogs carry no flashlight. 23:47: tonight a spec for all 3 sections and section 1 as a greybox; the spec may loosen docs/level-design.md where it blocks fun flow, each change logged for Michael. New job warehouse-redesign (Sector Ops Build session, after sector-restart), PR after Michael approves the direction.
- One build (23:55): "i also want everything merged into one build by the morning, so i can try it all from one session. Dont want to swap between versions or branches to test it". He chose master on /preview/: before 07:00 the orchestrator merges ct-prototype, course-ready, menu-notes, sector-restart and warehouse-redesign (section 1 greybox) into master, each once its tests pass. PRs open by 06:00 (ct-prototype at about 04:30 after its last slice).
- Focus (2026-10-20 00:40): "I would be happy if you only completed the movement video audit at high quality and updated animations/movement feel to match CT reference." Movement is the only job tonight; course-ready (S1 walkthrough fixes only) and sector-restart each open one PR and stop; warehouse-redesign paused (dog fix and review on its branch). Usage: at 00:25 the 5-hour window was 40% used; load was cut (Michael chose "Cut load to fit").
- All animations (00:45): "I would rather you check review all animations against the videos and fine tune as necessary to more accurately replicate the movement system. This system is one of the highlights of the game". Answers (00:50): explore shoulder offset matches CT (0.15 m, was 0.32); FOV matches CT (86, was 75); where the footage disagrees with G103 / F1a, the footage wins. CT Core audit: docs/ct-prototype/audit/AUDIT.md; slices G1 legs and gait, G2 aim and weapons, G3 camera, G4 traversal, G5 hold-A action menu, G6 walls and doors.
- Laptop (23:45): full power until about 09:30, then low priority (BelowNormal, E2E_JOBS=1) until Michael says.
- Action menu behind a guard (2026-10-20 08:10): "The action menu behind guard should only show grab or return, once they are grabbed it can show interrogate (if they have information), and rt or Lt to either knock out or kill, and aim button to aim pistol while holding them. It shouldn't have kill/knock out/carry in the list."
- Held guard (08:20): "The guard cannot be let go either, only knocked out. Killed, or used as human shield (aiming pistol)". No release; interrogating keeps the hold.
- Held menu (08:25): "There is no back to game option once the grab is initiated." While holding, hold-A shows only INTERROGATE (when the guard has information).
- Keep going (08:45): "Don't stop any works, just keep going regardless of time until I say to stop." Resumed: course-ready S2 lighting pass + S3 walkthrough guide. CT Core: PR 2 (#32), PR 3 interrogation guard in Marlow Yard (08:40: "Add one in Marlow Yard"), then the audit's remaining gaps. Ledge / pipe / window takedowns keep one KNOCK OUT row (08:40). Warehouse stays paused. Laptop low priority from 09:30.
- Test speed (09:55): "Are any of the suite tests causing consistent problems that should be diagnosed and fixed? i dont want us to got bogged down waiting for them if they are inefficient". New job test-speed (Character Build, laptop, feature/test-speed): co-op suites on sim time or exclusive, e2e-ctcourse split, e2e-stealth condition wait, e2e-pad fixed or parked, netmove door-peek ankle checked; goal a full run at E2E_JOBS=2 in 15-20 min with no reruns.
- Playtest of 4.12.0 (10:10): "i played through it and want to focus on fine tuning the animations, they all look weird and unnatural". Worst: walk / jog / run. "Legs are out too wide, looks like a crab. Elbows also go out too wide when moving quicker. This all translates to crouching too, and crouching idles too quick, and the hand resting on the knee is upside down and not sitting on the knee, looks weird"; also stiff or robotic, wrong poses, feet / legs off. CT Core slice G8 (animation feel), first priority: side-by-side sheets footage vs ours, then the fixes; if the rig blocks it, a proposal with evidence.
- Keyframed clips (10:25): after "You have all walking videos from CT, why cant we match it", Michael chose keyframed clips: walk, jog, run, crouch walk, crouch idle and the wall-knee hand authored headless in Blender, keyed against the footage as reference (never traced from it, IP rule); the procedural layer keeps blending, turning and foot IK. Walk cycle first as proof; about 1-2 days for the core set (CT Core, G8).
- Walk proof (10:55): Michael asked to trace CT's animations; the orchestrator declined frame-by-frame tracing (copies CT's animation work, G5) and offered pose matching or his own capture. He chose: "Tight pose matching, also consider the camera angle being used in the CT videos also is different. Try to match the camera angle also to ensure it matches". CT Core: matched comparison camera, measured key poses per phase with overlays, our own keys to those targets.
- Co-op bugs (11:00, /preview/, two windows on one PC): "the host character was invisible in coop for the person joining. There was a constant Connecting to host label on the person joining even in game also." New job coop-fix (Course Ready Build session, feature/coop-fix, a patch): diagnose, fix, e2e-coop asserts the remote avatar is visible and the label is cleared.
- Ghosting (12:30): "The graphics have also had ghosting too, set to epic preset"; where: "I think it was when aiming/holstering". Job ghost-fix (Course Ready Build, after coop-fix): TAAU history / motion vectors for skinned figures and attached weapons. Co-op bug 1 root cause (12:25): on GPU presets the LampPlugin on shared figure materials fails to clone, so the partner figure never loads; one-line fix in coop-fix.
- Sector Ops (13:05): "Is there capacity to continue the sector ops on desktop when nothing else is running, it shouldn't take priority". warehouse-redesign resumed at the lowest priority: light work any time, heavy work only when the desktop lock is free and CT Core is not waiting.
- Animation and controls rework (13:30): "the ct movement is getting worse. Can you ignore CT movement references." Analogue speed from the stick (no speed toggle); LT held aims; three states holstered / low ready / aiming; X tap holsters; RT tap knockout / hold kill; traversal auto-holsters and returns to the state. All movement animations reworked to a real-world trained-operator standard. Brief: docs/anim-rework/BRIEF.md.
- Speed-up (13:50): "movement is top priority. any spare bandwidth that can be used to speed it up should be used, otherwise continue with other fixes if not needed". anim-rework runs in parallel: CT Core slices 1-6 on feature/ct-prototype; anim-rig (Course Ready, feature/anim-rig: toe joints, wrist frame, sling socket); anim-metrics (Character Build, feature/anim-metrics: anti-crab metrics in e2e-anim); then the guard hold clips (Course Ready). Side branches are cut from feature/ct-prototype and their PRs merge into it.
- MPFB2 (14:40): "Yes, download it": the MakeHuman Blender add-on (GPL, official release only) installed into the desktop Blender for a rebake of Wren's toe weights; nothing from it bundled; version, source and licences recorded in docs/operators. anim-rig #39 (toes, wrist frame, sling sockets) into feature/ct-prototype; anti-crab metrics #38 merged there.
- Slice 1 controls (14:55): jammer "Another button - what makes sense? RF?" read as RB while aiming the pistol (RB stays the co-op action otherwise); A at low ready: "Interact always" (reload is X hold only).
- Section 1 walk (15:00): "section 1 is ok, better than before at least but not perfect. Its hard to tell, the night vision is so poor. I cant see properly at night, and the bodies are very bright. It needs work to make it look more realistic, and to expand the goggle outline to be less intrusive and show more of the screen, it feels claustrophobic." Vision modes (15:05): "pressing a button while in the weapon menu hovered over the vision mode to cycle between them ... press A ... like a carousel". New job nv-pass (Menu Notes Build session, feature/nv-pass): realistic NV, a wider thinner goggle outline, the wheel carousel (after anim-rework slice 1 merges). Sector Ops goes on with section 2.
- Toggle aim (15:25): "Remove it": aim is always LT held.
- Phone (17:55): "phone loads well but zero shadows, can we update to it shows shadows/lights but kept to a minimum. I don't want to spend time or resources on phone. Also screen has letterbox on sides, can we change that too. Minimal work to make it functional. I don't want phones to overload and get hot. Basic graphics but at least with shadows and light". A small patch job (phone-min): the minimum preset on phones shows baked lamp light and one cheap character shadow (no real-time shadow maps), a frame cap for heat, and no side letterbox (fill any aspect). Screenshot docs/orchestrator/phone-2026-10-20.png (it showed v4.14.1, a stale cache). After movement work, whoever frees up first.
- Movement feedback on 4.15.x (2026-10-20 ~19:10), to CT Core slice 2: "full speed is too quick, and the leg strides should be further apart with less steps, it's too many steps"; "walking forward on all gears leans too much, it shouldn't lean at all until full speed which should be similar to the lean it has now"; "the legs when walking are too far apart, bring knees and legs in line with the body, I would say almost completely vertical."; "arms go out in front of body when moving, it looks weird like a zombie. Arms should stay parallel the body and swing naturally increase slightly more each time you speed up."; "none of the movement feel weighted, but we will focus on these animations first."; "prototype quick passes only, must be believable, not perfect."
- Weekly budget (2026-10-21 ~01:25): weekly all-models 75% and rising ~2.4%/h with every job running; Michael chose "Pause non-anim": Marlow bunker pass paused at its next commit, warehouse-lamps holds (merge on a pass, no fix round, GPU look later), camera-cue GPU shots skipped. Finished PRs still merge; the laptop keeps testing. Then he went to sleep.
- Tuner additions (2026-10-21 ~01:15-01:20): barrel marker bug ("Barrel marker also caused half the screen to go grey") fixed in tuner-camera's second pass. Michael chose: smooth state changes, Import JSON, wider ranges (double-range toggle, typed values), bake script (export into code defaults), bypass button (hold for the untuned animation), slow motion 0.1-1x in normal play, slider search: Course Ready. Per-limb targeting strength (hand / foot IK weight): Menu Notes, with tuner-v2 item 2. Copy state to state: not wanted.
- Usage trim (2026-10-21 ~00:58): "Change nothing, reduce token usage at 85% 5 hour window (unless within 30 mins of reset), top priority is animation work." Per-slice Opus checkers stay; all jobs keep running until the 5-hour window reaches 85%.
- Overnight focus (2026-10-21 ~00:40): "Priority overnight is the animation system. Movement has become less important as I will manually fine tune everything as needed." / "Turn off movement slices and any research." Built work lands (S2b, slice 4 + walls merge as PRs, no new rounds); slice 5 wall round and slice 6 stopped (feature/anim-hold WIP); no more reviews. Tools (tuner-camera, Anim Studio, tuner-v2) continue.
- Tuner v2 (2026-10-21 ~00:20): "I want freedom to manipulate the body/animation as needed ... Possibly even a basic stage similar to the old main menu that allows me to make all the adjustments on the spot using controller or k&m"; "Can I reposition hands on guns, fingers, gun overall size etc?". Course Ready: camera sliders, free view, Anim Studio stage, loop player, viewing aids, undo / A-B / presets. Menu Notes (after camera-cue): per-joint offsets, hand / foot placement, stepping controls (stuck feet), per-key editing exported as clip keys, weapon group (gun scale visual only, grip, support hand, fingers).
- Priorities (~23:40): "Focus should be coop training bunker completion, then campaign level. Movement still needs work which is top priority." Warehouse rebuild deferred ("We'll revisit later"; docs/reviews/warehouse-layout-review.md). Guard AI / model: review in docs/reviews/guards-review.md, not scheduled yet.
- Marlow Yard bunker pass (~23:40): the full shortlist of docs/reviews/marlow-yard-audit.md (ceilings, lamp fittings, airlocks, dressing, walls to ceilings, paint, lifts, fiction); keep the open floor at 0.30. Cloud session marlow-bunker (card for Michael to start).
- Warehouse (~22:30): lamps snapped to ceilings, 3 quick code fittings, translucent corrugated roof sheets in the open sections ("opaque type of corrugated plastic sheet that allow light in but cant be passed through"), walls / ceiling detail and dead-space clutter: cloud session warehouse-lamps. Extra touches (fans, flicker, grime, dock, sound, accents) after it.
- Camera cue (~22:35): "a visible cue of where a cameras vision is ... a red laser grid that is projected onto the surfaces its monitoring possibly"; chose "Always, faint" (stronger in electro). Job camera-cue (Menu Notes, after wheel-ui). Michael's decision, not CT.
- Voxels (~22:40): "there still looks to be voxel graphics in the map which is no longer the goal"; chose "Turn voxels off by default" (replaces G68's voxel line). Job smooth-world (Character Build).
- Tuner (~22:10): merge fast on desktop tests + CI, full e2e after; pad control for the tuner right after the merge (Course Ready).
- 4.17.0 walk (~21:00, phone screenshots): "There is animation issues, almost worse than before. I will wait for the anim tuner to try adjust it first." "Weapon wheel needs to adjust dynamically based on screen size. Also when is it getting a quick visual Ui pass to make it look better, like the reference." "Night vision is good now." New job wheel-ui (Menu Notes, feature/wheel-ui): the wheel scales to the screen, a quick original radial restyle after the reference, the FPS banner off the top HUD. The tuner must open from a menu and work by touch.
- Anim tuner (~20:30): "Yes add the sliders as another task to be built. Doesn't have to look pretty, just functional. Build fast". New job anim-tuner (Course Ready, feature/anim-tuner): an F3 slider panel per state (gait widths, knees, elbows, arm swing, lean, step, crouch depth, wall gap, climb reach, hold gap) and gun hold per weapon and state, live, saved in IndexedDB, exported as JSON. Blender round-trip and a posing editor were discussed, not chosen.
- Phone WebGPU (~20:20): asked if WebGPU helps the phone; answered no for now (the parked trial after the playtest); 4.16.2 caps phones at 75% resolution (Michael chose it).
- Phone follow-ups (~18:35-18:50): native resolution, 100% scale (4.15.2); "menu hero should be best quality on phones if it doesn't cost much" (4.15.3: menu at High). Token use lean across sessions; full bandwidth on both machines.
- Action menu (23:20): "the action menu that shows up requires holding A and selecting which option you would like to proceed with, including returning to game (no action). I want it to be identical." CT Core.
- Overnight merges (23:15): green, reviewed PRs merge without asking tonight (lightfield-heap, Menu Notes, Sector Ops restart); not the ct-prototype PR.
- Selection wheel stays on LB hold; no lethal / non-lethal switch (LT / RT covers it); with a gun drawn A reloads (CT).
- Scanners: no HP cost when the partner never started; the 10 HP cost stays for a late or abandoned hack (CT Core,
  a later slice).
- Goggle flicker plays only at launch, not after a match.
- Goggle: keep Wren's current goggle; the redesign is parked (Michael rejected the A / B / C scratch options). Only the
  stowed-on-brow export remains, in the cleanup job.
- Moth's goggle is purple (bible 5.14 amber is replaced). A scratch Moth prototype when nothing urgent waits, possibly
  overnight on the desktop.
- Cleanup job (Wren loose ends: stowed goggle, slung-rifle carry offsets, hero VRAM after photo mode, old part meshes,
  kit labels, doc fixes): after the core-loop playtest.

## Now
| Session | Machine | Branch | Doing | Next checkpoint |
| --- | --- | --- | --- | --- |
| Orchestrator | desktop | `docs/*`, reviews | New account (22:40): all sessions restarted; this roadmap, reviews and merges | Menu Notes PR; lightfield-heap and Sector Ops PRs as they turn green |
| CT Core Build | desktop | `feature/ct-prototype` | First priority. Slice F (F1-F7) at 637d41d5: check green, laptop suites pass; e2e:quick, GPU sheets, check, /ct/. Then the footage catalogue, the movement audit and slices to match CT; the hold-A action menu | Slice F on /ct/; catalogue; audit |
| Character Build | laptop (second heavy slot) | test runner | The laptop test runner; order CT Core, Menu Notes, Sector Ops. lightfield-heap merged (#26, 4.7.5) | Menu Notes full e2e (4ae2d2f2), then Sector Ops |
| Menu Notes Build | desktop | `feature/menu-notes` | All notes and M1-M4 built; master 4.7.3 merged (c32eb324); CT Core's two menu fixes done (4ae2d2f2); check + full e2e on the laptop | PR (minor, 4.8.0) |
| Course Ready Build | desktop | `feature/course-ready` | New (23:48). Marlow Yard walkthrough-ready for 2 players + a prototype lighting pass; src/world, src/game/course; CT Core merges it into ct-prototype for /ct/ | Slices to /ct/ via CT Core; PR (minor) |
| Sector Ops Build | desktop | `feature/sector-restart` | Spare capacity. M9 clean checkpoint restart; fix round 839a3a07 in a fresh check; master merged (cb7e1061); suites queued on the laptop | PR (patch); then warehouse-redesign (spec all 3, greybox section 1; dog flashlight fix) |

## Next (in order)
1. **Playtest 2 slices B + C** (CT Core): aiming compared with the CT footage (view unchanged when crouched,
   upper body tight, arms less outstretched, natural pistol aim); legs in line with the body walking, running, turning;
   crouch hands and legs. `docs/ct-prototype/PLAYTEST-2.md`.
2. **Playtest 2 slices D + E** (CT Core): rifle and pistol holstering; hanging shimmy (wider, slower hands); vertical
   pipe climb; ledge climb-up onto the knees.
3. **Michael's core-loop playtest** of the co-op training course on /ct/. Refining starts only after this (goal rule).
4. **Selection wheel restyle**: slightly bigger, not just boxes, original (CT Core).
5. **Menu notes** (started 2026-10-19 18:40, job `docs/menu-notes/`, from `docs/menu-ui/SLICES.md`): music from the title screen; preload shaders and the hero with
   a Night Shift load screen; no way back to "press any key"; confirm the hero LOD; the hand clipping the magazine in the
   idle; rifle and pistol in the menu with holding and idle poses; merge Controls and Settings > Controls.
6. **Visual pass** on the training level: lighting, materials, dressing (last, per the goal).

## Later (after the prototype)
- Moth as player 2's character (2-3 days; goggle purple; a scratch prototype first, when nothing urgent waits).
- GPU perf checks on the PC: the menu void, the weapon meshes, the `?gfx=min` budgets.
- WebGPU (Michael, 2026-10-19: measure first): the Sector Ops perf run on the PC (full section, 20-25 guards) decides. If rendering is the bottleneck, a 1-day WebGPU trial behind a flag (Babylon 9 WebGPUEngine, snapshot rendering; shader conversion bundled, no CDN). If the sim is the bottleneck, WebGPU does not help. Not before the core-loop playtest.
- Cleanup job (Wren loose ends), after the core-loop playtest.
- Co-op client never draws guards' flashlights: torch state is not on the wire (light-parity gap, found by Sector Ops 2026-10-20; a wire change, protocol 25).
- warehouse-redesign (paused, feature/warehouse-redesign 6393805a): dog flashlight fix (checker PASS), REVIEW.md, DRAFT SPEC.md with 11 proposed level-standard loosenings L1-L11 for Michael; sections 2-3 outline; greybox waits on decisions in its STATE (C1).
- Test fixes: e2e-pad (known flaky); the keyboard vent: Space then an unseen E hold counts as a kick (T1, CT Core); lightField "allocation-free under a loop" fails its heap check when the machine is
  loaded (passes alone; skip under load or warm up longer, #20 STATE); pre-existing e2e-kestrel / camera-bounds failures.
- The older follow-up list in `docs/progress.md` (medkit stations, missing sounds, music revision, art guide, one folder
  per map, Kestrel, Fallow bunker rebuild).

## Done
| Date | PR | What |
| --- | --- | --- |
| 2026-10-17 | #3 | 4.0.0 consolidation: one vision, non-CT deletions |
| 2026-10-18 | #4 | CT co-op research, decisions G124-G160, the prototype plan |
| 2026-10-18 | #5 | Wren is the player character (both players) |
| 2026-10-19 | #7 | Weapons: rifle with launcher, pistol with jammer, knife, believable holds and carry |
| 2026-10-19 | #6 | CLAUDE.md "Current goal" |
| 2026-10-19 | #8 | Menu: Arkham-plan menus, dialog fixes, cinematic hero background |
| 2026-10-21 | #60 | 4.20.1: the animation tuner works with the pad |
| 2026-10-21 | #56 | 4.20.0: animation tuner: live sliders per state for gaits, poses and the gun hold, target hints, IndexedDB, export (F3, Pause, Settings) |
| 2026-10-20 | #57 | 4.19.1: test-speed: co-op suites on sim time, load waits, full e2e ~20 min at E2E_JOBS=2 |
| 2026-10-20 | #54 | 4.19.0: anim-rework slice 3: low ready, aiming with the glide (aimed strafe crab fixed, A5 0.7 m/s for Michael), the sling draw |
| 2026-10-20 | #55 | 4.18.1: phones render at a fixed 50% resolution (no dynamic resolution; the 60 cap stays) |
| 2026-10-20 | #50 | 4.18.0: Sector Ops Warehouse sections 2 and 3 rebuilt (greybox), section 1 lamp pass |
| 2026-10-20 | #52 | 4.17.0: anim-rework slice 2: holstered standing walk / jog / run / idle as one blend, starts, stops, turns; M6 (run 4.0, no lean below the run, legs under the hips, arms along the body); slice 3-6 keys (unwired) |
| 2026-10-20 | #53 | 4.16.2: phones render at 75% of native, dynamic down to 50% |
| 2026-10-20 | #51 | 4.16.1: the 60 fps cap holds on 90 / 144 Hz (deadline limiter); phones scale resolution on slow frames |
| 2026-10-20 | #49 | 4.16.0: nv-pass: realistic night vision (auto-gain, no clipping, dim bodies), a wider thinner goggle frame, the vision-mode carousel on the wheel |
| 2026-10-20 | #48 | 4.15.4: Settings FPS overlay is a one-line top banner (F3 keeps the full overlay) |
| 2026-10-20 | #47 | anim-rig into feature/ct-prototype: MPFB2 toe weights, slingBack anchor |
| 2026-10-20 | #46 | 4.15.3: the phone menu draws at High (play stays Low) |
| 2026-10-20 | #45 | 4.15.2: phones render at native resolution and a 1.0 scale (Low preset, 60 fps cap) |
| 2026-10-20 | #44 | 4.15.1: phones run the Low preset (lamp light, contact shadows) at DPR 1, 0.75 scale, a 60 fps cap; menus fill the screen |
| 2026-10-20 | #43 | 4.15.0: anim-rework slice 1, the new controls (analogue speed, holstered / low ready / aiming, LT held aim, X holster, RT tap knockout / hold kill, RB jammer, A always interacts, auto-holster traversal, the sling draw), with the CT walk round 3b, the rig extension, the guard clips (unwired) and the crab metrics |
| 2026-10-20 | #42 | 4.14.1: orchestrator docs (roadmap, the anim-rework brief, state) |
| 2026-10-20 | #37 | 4.14.0: Sector Ops Warehouse section 1 rebuilt (three routes: ground, high, service; logical guard posts; dogs carry no torch); sections 2-3 next |
| 2026-10-20 | #36 | 4.13.2: no ghosting at Epic when aiming, drawing or holstering (TAA history reset, clamp) |
| 2026-10-20 | #35 | 4.13.1: co-op fixes: the host draws on the joiner at High / Epic (LampPlugin clone), the connecting label clears, a hidden co-op window keeps stepping; e2e-coop-gpu |
| 2026-10-20 | #34 | 4.13.0: Marlow Yard interrogation guard (station 1 guard with information; INTERROGATE in the held menu) |
| 2026-10-20 | #33 | 4.12.0: Marlow Yard prototype light pass (19 -> 29 baked lights, light-field test, GPU shots) and the walkthrough guide docs/course-ready/WALKTHROUGH.md |
| 2026-10-20 | #32 | 4.11.0: CT movement 2: grab / hold / knockout / carry (G7), the hold-A action menu with Michael's guard rules (G5), walls and doors with the wall knee (G6) |
| 2026-10-20 | #31 | 4.10.0: CT prototype into master: CT controls and posture, slices A-F, the footage audit (docs/ct-prototype/audit/AUDIT.md) and slices G1 legs and gait, G2 aim and weapons, G3 camera (shoulder 0.15, FOV 86), G4 traversal; G5-G7 next |
| 2026-10-20 | #30 | 4.9.0: Marlow Yard co-op walkthrough fixes (course-ready S1: per-station HUD step, radio cues, bay restart brings the partner back); lighting pass S2 and guide S3 parked |
| 2026-10-20 | #29 | 4.8.2: Sector Ops checkpoint restart is a clean start (M9) |
| 2026-10-19 | #28 | 4.8.1: menu boot time measured (the gate adds about 0.9 s; docs only) |
| 2026-10-19 | #27 | 4.8.0: menu notes: black launch screen, goggle flicker in the dark, menu shot X5, weapons and poses in the menu, title music, one Controls place |
| 2026-10-19 | #26 | 4.7.5: lightField heap check stable under load (tests only) |
| 2026-10-19 | #25 | 4.7.4: orchestrator docs, new Claude account and dashboard |
| 2026-10-19 | #24 | 4.7.3: orchestrator docs, walk notes, account handover |
| 2026-10-19 | #23 | 4.7.2: the version label shows the build's own commit (preview slots showed master's) |
| 2026-10-19 | #22 | 4.7.1: e2e-traverse grate kick gets a closed grate (flake fixed; the keyboard vent kick is open for CT Core) |
| 2026-10-19 | #21 | 4.7.0: Sector Ops (3 Warehouse sections, connectors, stars, revive syringes), the prototype menu, co-op mode switch (G184-G191) |
| 2026-10-19 | #20 | 4.6.8: unit tests survive a loaded machine (120 s timeout, settings.test save race fixed) |
| 2026-10-19 | #19 | 4.6.7: the laptop is the test runner; co-op training first, Sector Ops on spare capacity |
| 2026-10-19 | #18 | 4.6.6: e2e-menus slider check waits on the condition (no game change) |
| 2026-10-19 | #17 | 4.6.5: co-op test fix (coop, netmove, ctcourse reliable; only e2e-pad flaky) |
| 2026-10-19 | #15 | 4.6.3: process audit (one rules file, test tiers, full e2e 62 -> 26 min) |
| 2026-10-19 | #14 | 4.6.2: version numbers follow the merges (G183), the in-game label shows the commit |
| 2026-10-19 | #12 | Animation clean-up: weapon travel, reloads, shoulder swap, traversal grips, hand shapes |
| 2026-10-19 | #13 | Phone launch for testing only (G182): minimum settings, UI fits the screen, pad input |
| 2026-10-19 | #9 | CT prototype: posture, CT controls, selection wheel, 8-station co-op course, revive |

## Previews
- `/preview/` = `dev` = master (moved by the orchestrator after each merge).
- `/ct/` = `ct-movement` = `feature/ct-prototype` (moved by CT Core after each slice; frozen while Michael walks it).

## Dashboard
The orchestrator publishes this file as a page after every update, so Michael can check it from his phone. Git stays
the source of truth.
