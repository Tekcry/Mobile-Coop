# Changelog

## Unreleased - menu-notes (Michael's walk-test menu notes, `docs/menu-notes/`)
- Launch (M1, M2, notes 1-2): one black screen with the NIGHT / SHIFT wordmark only, held until Wren's hero model,
  both weapon meshes and the shaders are ready (`src/world/menuGate.ts`: a stall timeout of 12 s with no bytes
  arriving, a hard cap of 120 s, never stranded); then only the press prompt fades in. The title stage is pure black;
  the press fades the wordmark and prompt out, Wren's goggles flicker on in full darkness with no menu on screen, then
  the light rises on the close-up and the main menu fades in (M3; a second press skips to the lit menu, A3; launch only).
- Music: the menu theme decodes at boot and plays on the title, or starts on the first key, click or pad press when
  autoplay is blocked.
- Main menu: Back no longer returns to the title (A1). The Pause menu's Controls item is gone; Settings > Controls is the
  one place (A2). Settings > Gameplay drops the Default shoulder row (CT: the camera is always over the right shoulder
  when holstered); the Controls screen lists the CT trigger and mouse verbs (holstered knockout / lethal palm strike,
  drawn secondary / primary fire; right click draws and holsters).
- Hero quality (note 4): the menu close-ups always draw the hero LOD on desktop presets (no fix needed; the jump was the
  LOD2 -> LOD0 -> hero load order, now behind the load gate); read-back `MenuState.heroLod`.
- Menu weapons (notes 5-6): the Blender rifle and pistol on Wren in every title and main-menu shot, one held at low or
  compressed ready, the other holstered or on the back (`src/world/menuPoses.ts`; new shots W1, W2); the void no
  longer shows a lone magazine or placeholder gun; a unit guard keeps the support hand off the magazine.
- Tactical shot (M4): W3 joins the main-menu deck, Wren on the sights with the rifle shouldered (Michael's pick X5 of
  the slice 4b mock-ups). The green goggle-spill spot in the face shots is gone: it reflected as a stray glow on the
  goggle housing and helmet above the lenses; the lens flicker itself is unchanged.
- Tests: `tests/menuGate.test.ts`, `tests/menuPoses.test.ts`, menuShots; `tests/titleSequence.test.ts`; e2e-menus checks the load
  gate, the dark title, the prompt fade, the sequence and the skip; e2e-pad follows the shorter Pause menu and the pad skip; GPU script `scripts/menu-boot-shots.mjs`.

## 4.7.5 - lightField heap check stable under load (2026-10-19, PR #26)
- tests/lightField "allocation-free under a loop" is stable under load: up to 40 rounds with yields so the optimizing
  compiler can finish (each measurement keeps its smallest round), and the control's vector escapes into a ring so it
  is never optimized away (272 B a query every run, was 63-272). Same limits. It failed `npm run check` on a busy
  laptop (41.97 < 39.54). Tests only.

## 4.7.4 - Orchestrator docs: new Claude account (2026-10-19, PR #25)
Docs only. Every session restarted in the new Claude account; the new dashboard
(https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh); the roadmap and orchestrator state at 22:55 (CT Core slice F
checks, Menu Notes fixes for CT Core, Sector Ops fix round, lightfield-heap runs).

## 4.7.3 - Orchestrator docs: walk notes, account handover, test runner and priority state (2026-10-19, PR #24)
Docs only. Michael's playtest-2 walk notes (docs/ct-prototype/WALK-2026-10-19.md), the account-switch handover
(docs/orchestrator/STATE.md), the roadmap (Menu Notes, Sector Ops restart bug M9, CT footage awaited), the menu notes
start prompt, and the dashboard with the walk-test checklist.

## 4.7.2 - The version label shows the build's own commit (2026-10-19, PR #23)
- The in-game version label shows the commit the build was made from. Preview slots read master's commit (/ct/ built
  from ct-movement e5fc5870 read "fca0e26"): vite.config.ts took GITHUB_SHA first, which every slot build in the deploy
  workflow inherits. The checked-out folder's HEAD now wins; GITHUB_SHA is the fallback (`src/core/buildSha.ts`, tested).

## 4.7.1 - e2e-traverse grate kick: a closed grate before the kick (2026-10-19, PR #22)
- e2e-traverse: the grate-kick check gets a closed grate. The keyboard vent section before it sometimes kicked the
  grate open on real frames, so the kick check entered an open duct silently (noise 0, about 1 run in 3). Tests only.

## 4.7.0 - Sector Ops: prototype menu, 3-section Sector Ops, co-op mode switch (2026-10-19, PR #21)
- Main menu: Sector Ops, Co-op, Loadout, Settings, Feedback. Missions, Training and Free roam only with `?legacy=1`.
  Sector Ops opens the op list (each op's difficulty stars), then the op's briefing (its sections, Difficulty, Weather,
  Start).
- Sector Ops (`?autostart=warehouseOps&mode=sector`), solo or co-op: the Warehouse in three sections played in order,
  joined by connector rooms that are the checkpoints. Each section has an objective (download, grab, hack), its own
  guards, cameras, laser bands and alarm panel; being spotted raises the alarm stage and sends guards in. No lives:
  solo, going down restarts the section at its checkpoint; co-op revives with the op's syringes. Completing the op
  fills its difficulty star. The result line shows time, kills, times spotted and Ghost. Details per step below.
- Co-op is the campaign: a new room hosts Marlow Yard in Course mode; the host can switch to Sector Ops (two players).
  Hunter, Infiltration and Free Roam only with `?legacy=1`. The Co-op entry no longer calls the Fallow bunker the
  tutorial. Protocol 24 (the `sector` mode and message: the client mirrors the live section's devices and door locks).
- Tests: a new required suite `e2e-sectorops`; e2e-menus, e2e-park and e2e-pad follow the new menu and lobby.
- Sector Ops slice 2 step 1 (logic): sections and connectors (`ConnectorMachine`: locked, open, cycling, sealed; the
  near door waits for a clear doorway), the run with a carried-over alarm stage, checkpoints and `restartSection` (no
  lives, M7; a down respawns at the checkpoint until step 2 restarts the section); revive syringes per difficulty;
  `EnemyManager.despawn` / `despawnAll` and a per-mode live cap `maxAlive` (12 everywhere, Sector Ops 32 from step 2);
  the difficulty stars record (`src/save/sectorRecord.ts`, a kv key, no SAVE_VERSION bump). Unit tests moved to
  `tests/` (the first cut's `src/game/sectors.test.ts` was never run by Vitest).
- Sector Ops slice 2 step 2 (the three sections, M7, M8): the Warehouse in three sections sealed from each other but for
  their connector rooms: 1 the service entrance (yard, dock, dispatch, workshop, corridor; download at the workshop
  terminal), C2 a vestibule in the dock, 2 the racking aisles (take the case), C3 the ground-floor office, 3 the factory
  floor, the mezzanine and the manager's office (hack on the deck), extraction by the freight lift. The connector cycle
  locks the near door, unloads the section (guards, bodies, its cameras and lasers), loads the next behind the far door
  and opens it; the connector is the checkpoint. No lives: everyone down restarts the section there (its guards,
  objective, devices and alarm stage reset; tallies kept). Per M8 the sections were re-laid with pockets (loads parked in
  the cross aisle, chicanes, a stores cage, a plant room, a split floor, deck crates) and new ways through (a rack-top
  route with ladders and planks, a manager's office door onto the floor, crates under the zipline gap): three routes
  per section, every guard in its own pocket with a takedown spot no other guard sees (10, 10 and 11 guards). Alarm
  reinforcements come from the section's own points (2, 2 and 3 per stage). Sector Ops raises the live guard cap to 32.
  `?sectorGuards=N` caps the guards per section (dev, tests). `buildWarehouse(b, opts)`: the plain Warehouse is
  unchanged.
- Sector Ops slice 2 step 3 (stars, syringes, co-op, M7): Sector Ops opens an op list (the Warehouse for now; every map
  with sections appears) with four difficulty stars, filled for each difficulty the op was completed on, and the best
  time per difficulty in the context panel; the main menu entry and the host's lobby Map row show the stars too.
  Completing a run saves its star (solo and co-op host; the co-op client saves its own, without a time). Co-op: a
  downed player is revived by the partner while the op's syringes last (Rookie 3, Normal 2, Realistic 1, Perfectionist
  1), shown as "Syringes n" on the HUD; with none left, or the 30 s window over, the section restarts at the checkpoint
  and both players come back there. The connector and the extraction wait for every player, a downed one too (revive
  them first). The client sees only the live section's cameras and lasers, the host's door locks and shot-out cameras.
  Guards the client holds are let go before a section unloads. A camera shot out comes back on a restart. Protocol 24.
- Sector Ops fix round: only the live section's alarm panel works (panels tagged by section; section 2 has its own),
  and the panel alarm is armed again on every section load and restart (it used to latch once per run and send guards
  to panels behind locked connector doors). The far door opens silently (no door noise for the new guards). A restart
  also clears the section's camera meters and re-arms disabled panels.

## 4.6.8 - Unit test timeouts under load (2026-10-19, PR #20)
- Vitest's test timeout is 120 s (was the 5 s default): under load (an e2e run alongside) the unit run is about 10x
  slower and heavy tests timed out. Per-test timeouts under 120 s are dropped (readyHands, menuShots, score).
- settings.test's round trip waits for its own debounced save, which under load overwrote kv/settings in a later test.
- Tests only; what each test checks is unchanged.

## 4.6.7 - Laptop test runner; co-op training first (2026-10-19, PR #19)
Docs only (Michael). The laptop (Character Build) runs the desktop jobs' logic e2e on pushed commits when the desktop
lock is held (CLAUDE.md "Machines", test tiers). Priority: the co-op training course first, Sector Ops on spare capacity
(ROADMAP.md). Dashboard and orchestrator state updated.

## 4.6.6 - e2e-menus slider fix: hold-repeat waits on the condition (2026-10-19, PR #18)
- e2e-menus: holding right on the Effects slider waits until a fast step lands and sfx passes 0.2 (15 s cap)
  instead of a fixed 3.2 s; under load fewer frames ran in that time and the check failed. The results-screen wait
  is a 60 s hang guard (was 15 s; it ran out under load). Tests only.

## 4.6.5 - Co-op test fix: reliable co-op suites (2026-10-19, PR #17)
The process audit's section 2 (Michael approved; `docs/coop-tests/`). Tests only, no game change.
- The two-page suites (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-course) wait on the game's own clock: on software GL
  the sim runs at a fraction of real time, so wall-clock timeouts expired mid-move (e2e-ctcourse's leg-up, e2e-coop's
  holster). A timeout now names each page's sim seconds, sim rate and fps; netmove and ctcourse open at 960 x 480.
- Stale checks fixed: e2e-netmove's walk-off stands up first (B keeps the crouch), the stacked check waits for the
  host's copy; e2e-coop's wall medkit heals to full on Normal (G180); the crouch helpers wait to stand before pressing.
- e2e-coop runs legacy-off: Infiltration (the Ledger) and Free Roam instead of Hunter, two players (G2).
- e2e-coop, e2e-netmove and e2e-weapons-carry leave KNOWN_FLAKY (3 solo rounds and 2 full runs on the laptop, 23 min
  each); e2e-pad stays (one remap failure in full run 2, parked).

## 4.6.4 - Docs: the laptop is a second heavy slot; roadmap is state only (2026-10-19)
- CLAUDE.md "Machines": two heavy slots, the laptop at low priority, everything headless and invisible (Michael).
- docs/ROADMAP.md keeps state only; its rules moved to CLAUDE.md "Sessions". Sector Ops and the co-op test fix on the roadmap.

## 4.6.3 - Process audit: test tiers, shorter e2e, one rules file (2026-10-19, PR #15)
Michael approved the audit's report as written (2026-10-19; `docs/process-audit/REPORT.md`).
- The full e2e run is the training level and the systems it stands on (estimated 62 -> about 28 minutes at two
  suites at a time): the parked-content suites (Hunter / Mission, Fallow, Kestrel, the Warehouse routes and AI
  archetypes) move to `npm run e2e:legacy`, the audio suites to `npm run e2e:audio`, the visual read-backs (darkness,
  the Epic boot) to `npm run e2e:gpu` on Michael's PC, and the animation audit runs only from the quick map.
- e2e-pad and e2e-mouse keep input (menus, capture, the verb tables, remap) and drop the gameplay sections their system
  suites own; e2e-pad gains a pad verb table. e2e-course walks the gates once. `e2e:quick` no longer pulls the input
  suites for every core or config change.
- One set of rules in CLAUDE.md "Sessions" (orchestrator, machines, a job, test tiers, branches and previews), a
  3-file job format (BRIEF, PLAN, STATE), a shared subagent preamble; deploy.md and session-method.md agree with it;
  finished and parked job docs carry a history banner. The goggle job's records (M1-M3) and D36 (Moth's goggle is
  purple) reach master.

## 4.6.2 - Version numbers you can read (2026-10-19)
- Every merge to master gets the next version (G183): a job or feature is a minor step, a fix or docs-only merge a
  patch. The in-game label (title screen, main menu, playtest notes) adds the build's commit: `v4.6.2 · a1b2c3d`, with
  `PREVIEW CT` on /ct/. Versions 4.1.0-4.6.1 below were numbered after the fact, in merge order; each master release
  has a git tag (`v4.6.2`).

## 4.6.1 - Orchestrator docs (2026-10-19, PR #11)
- Roadmap, machine rule (heavy work on the desktop, heavy.lock), the orchestrator's resume point and dashboard source,
  Michael's dashboard answers (G-level decisions in ROADMAP "Decided"), Moth's goggle purple (bible 5.14).

## 4.6.0 - Phone launch for testing (2026-10-19, PR #13)
- A phone can launch the game for testing only (G182): the minimum settings (`?gfx=min`, no Auto detection, no
  governor) and the menus and HUD scaled down to fit its screen. No touch controls; a Bluetooth pad drives it. Untested.

## 4.5.0 - Animation clean-up (2026-10-19, PR #12)

Prototype pass over Wren's animations (Michael, 2026-10-19): accurate, believable, no clipping. `docs/anim-cleanup/`.

- **Draw and holster:** the current gun is put away before the next comes out. The rifle travels over the right shoulder
  onto the back plate stud, the pistol into the thigh holster, along a curved path clear of the head and trunk
  (`WeaponModel.beginTravel` / `travel`, `TRAVEL_VIA`, `TRAVEL_OUT`; beats `TRAVEL_OUT` / `TRAVEL_IN` in
  `playerWeapons.ts`). The draw pop is gone (e2e-anim asserts the draw).
- **Reloads with real magazines:** a separate magazine mesh leaves the gun with the support hand, goes to its pouch
  (rifle: chest; pistol: left hip), a fresh one is seated; an empty reload works the charging handle or racks the slide
  (`reloadClipFor`, pistol clips; a swap or a grenade mid-reload cancels it cleanly).
- **Shoulder swap moves the gun:** on the left shoulder the gun goes to the left hand once it is settled
  (`weapons.handSwitchOk`); the partner sees it (ground MoveState sub bit 128, `SHOULDER_LEFT_SUB`; it was protocol 18,
  counted in today's 22).
- **Hands on the real geometry:** ladder rungs, drainpipes, pipes, ledge lips, the zipline cable, the rappel rope and fence
  rails: the palm sits on the surface and the fingers wrap it (`attachGrips` grip axes, `CharacterRig.solveWorldGrip`);
  rungs and fence wires take a fixed overhand grip.
- **Hand shapes:** trigger, support, wrap and relaxed shapes blend from Wren's morph targets; free hands hang lightly curled.
- Crouched ready hands sit by the thighs (`READY_HANDS` crouch values, with CT Core's P1c).

## 4.4.1 - Docs: roadmap, merge approvals, walk-test menu notes (2026-10-19, PR #10)

## 4.4.0 - CT prototype (2026-10-19, PR #9)
- Posture, CT controls, the selection wheel, the 8-station co-op training course, revive. `docs/ct-prototype/`.

## 4.3.0 - Menus (2026-10-19, PR #8)
- Arkham-plan menus, dialog fixes, the cinematic hero background. `docs/menu-ui/`.

## 4.2.1 - CLAUDE.md "Current goal" (2026-10-19, PR #6)

## 4.2.0 - Weapons (2026-10-19, PR #7)
Placeholder weapons that look real at a glance, held and carried believably (Michael, 2026-10-19: "Holding weapons and
holstering should at least look believable but only prototype quick run").

- The CT kit as baked meshes from an offline Blender pipeline (`npm run weapons:build`, scripts/weapons/): the Heron
  Carbine with the co-op launcher always fitted and a suppressor (11.7 k triangles, 2K textures), the Hush 9 SD with its
  jammer emitter in the frame's nose (9.7 k, 1K), the knife (1.8 k, 512; shown in the right fist when drawn, no knife
  verb yet). Original designs, real proportions, KTX2 textures. Download +10.4 MB.
- Wren holds them: her fingers close round the grips (morph targets from her hero hand rig), the palm sits on the grip
  and the knuckles wrap it, the support hand under the launcher (the rifle) or cupping the trigger hand (the pistol).
  Her wrists now land on the rig's (her forearms were 35 degrees bent, the hands 16 cm off every grip).
- Stance: the support shoulder comes forward to reach the handguard with the elbow bent; the pistol is aimed out at
  near arm's length with both hands (CT).
- Carry: the pistol sits in her built thigh holster (it cut 20 mm into the shell); the rifle hangs flat from the receiver
  bar on her back plate by a keyhole stud, muzzle up, the grip to her right hand (it stood off her back on its optic).
- Guards keep their guns (A6). Gameplay unchanged: muzzle, hand points and carry extents still come from weapons.json
  (the rifle's support point moved back to the launcher sleeve's rear, its proxy parts follow the mesh).

## 4.1.0 - Wren, the player character (2026-10-18, PR #5)
Operators run (feature/operators): Wren replaces the player body for every player (G123: "I want wren in to replace the
existing character anyway; before the prototype is done", "Both play as Wren").

- Solo, the local co-op player and the co-op partner are Wren, the realistic operator built offline in Blender (G68):
  a one-piece stealth suit, slim armour, rigid kit, the original goggle. The main menu shows her hero model (D33: "Yes
  use hero for menu"). Guards keep their bodies.
- Gameplay unchanged (G38): the same capsule, speeds, noise, traversal and camera. The body drawn, the light-meter
  samples, the cover exposure points and the hit volumes follow Wren's size (1.68 m, G74; the meter samples 7 cm lower
  standing, 4.6 cm crouched, for the partner too); weapons sit in her hands.
- Body proportions corrected for every character (G72, ANSUR II): shoulder joint 3.5 cm lower, wider shoulders, longer
  hands, deeper chest, fuller waist and pelvis, head 1 cm deeper, thigh 2.5 cm shorter.
- The goggle glows dim with vision off and full with it on (G73); it sits over the eyes in both states until the stowed
  model is exported (cleanup).
- Each player's goggle is their own colour, the partner beacon (G135: "partner beacon (distinct light colour per
  player)"): the host (and solo) green, the partner cyan, the same on both screens. Emissive only; guards never see it.
- Download: 81.4 MB more, fetched on first use and then cached for offline play (LOD2 2.5 MB first, LOD0 18.4 MB,
  LOD1 5.1 MB; the menu's hero 55.5 MB loads after them). Once the service worker controls the page the play LODs go
  into its cache, so one online start that reaches the menu is enough to play Wren offline; the hero is cached the
  first time the menu or photo mode shows it. A body load cut off by a reload is not reported as an error.
- Ladders and drainpipes: a hand's reach is never quicker than the arm can swing (from the body's proportions); a
  sprint up a ladder keeps the hands on the rungs with Wren's shorter arms.
- Ledges, wall jumps, ladders and pipes play the same for every player (G176: "Keep gameplay fixed"): the attached
  root path uses the 1.75 m gameplay height; Wren's body is drawn lifted onto her grips (7.6 cm on a hang), visual
  only.
- Elbows never pass through the chest: after the arm IK an elbow inside the trunk swivels round the shoulder-wrist
  axis until it is out (the hand stays on the grip).
- Hot paths: the attach path reuses its move override, the pipe grip blend lost its per-frame closure, the soft-knee
  share no longer changes field representation mid-match (a deopt of the rig update).
- Tools: every child process the e2e runner and its helpers start (vite preview, suites, taskkill, Blender, KTX
  tools) is spawned with `windowsHide: true`, so no terminal windows open on Windows. e2e-coop asserts the goggle
  colours on both screens. `waitOperator` in `scripts/e2e-lib.mjs`; `anim-sheet.mjs` and `perf.mjs` wait for Wren's LOD0 and exit 1
  when she never loads; e2e-coop's offline check waits for the service worker first; e2e-offline asserts the offline
  player is Wren; e2e-desktop drives Wren's head fade and goggle glow directly. `@babylonjs/ktx2decoder` is a runtime
  dependency (the game transcodes her KTX2 textures).

## 4.0.0 - Consolidation (2026-10-18, PR #3)
One branch with all finished and paused work, one vision (docs/DECISIONS.md, G1-G118). The entries below this one are
the merged branches' own notes, kept as their history.

Came in:
- Locomotion run (feature/ct-locomotion, paused at step 22, with feature/kestrel inside it): Chaos Theory movement,
  back-to-wall, traversal, holstered carry, goggles, the anim audit, Kestrel's level editor and Mission 1 work (paused,
  G53).
- Movement foley (feature/footsteps), weapon sounds (feature/weapon-audio), Music V4 (feature/music, as is; revised in
  its own job).
- Fallow training bunker (feature/training-bunker; the co-op tutorial, G78; rebuilt on CT moves after the prototype,
  G79).
- Menu and HUD plan (feature/menu-ui-spec, docs only).
- Not included: feature/operators (its own PR, G75); ct-movement's 99da75b "phone loads and plays on Low" (superseded
  by desktop only).

Deleted (Michael, "In this merge"; logs in docs/consolidation/deleted-*.md):
- Wave, Team Deathmatch, Free-for-all and all player-versus-player code (G8, G9).
- Retired maps: the 1934 Exchange, Trunk Annex, Dead Line v1 and v2, with their missions and suites; design data
  archived (G12, G91).
- Phones and touch: touch input, the layout editor, the phone look and phone render paths, phone budgets; the e2e
  suites now run in a desktop browser (G12, G13).
- Emotes and the old solo Training mode (G24, G116); the Fallow course is the only training.
- Every gun outside the CT kit: 14 player guns removed; kept the rifle and the suppressed pistol (G76, G115).
- The player drone, the custom difficulty sliders (fixed difficulties again) and carried medkits (wall stations only)
  (G7, G98, G106, G115).

Changed:
- Co-op lobby defaults to Infiltration (Hunter under `?legacy=1`). PROTOCOL_VERSION 11 -> 13, MAX_PLAYERS 8 -> 4.
- SAVE_VERSION 8 -> 9: old saves migrate (emotes, deleted guns and drone presets dropped or mapped to the kept gun);
  old settings records load and drop touch, phone, custom difficulty and medkit-bind fields.
- The one wall medkit station (Proving Grounds) heals +40 directly (starting value, ASSUMED).
- Docs rewritten to one current vision: docs/DECISIONS.md (new), CLAUDE.md, the design bible 2.0, story 2.1,
  docs/progress.md as an ordered job list, every docs/systems file, level-design Section 12, TESTING.md (one desktop
  checklist plus a release checklist). Old lists and phase logs are in docs/archive.
- Tests: e2e-foley is known flaky (walk threshold since the step-22 speeds); e2e-pad's capture step waits for the
  capture to end; legacy e2e-progression steps to Deploy.

## Unreleased - Weapon sounds (feature/weapon-audio)
- Sound: every gun now plays real CC0 recordings instead of a filtered noise burst. The 16 guns borrow the closest of
  12 recorded guns (The Free Firearm Sound Library, `docs/audio-credits.md`): .45 pistol, 9 mm and 7.62 SMGs, 5.56
  and 7.62 rifles, a .30-06 bolt rifle, 12-gauge pumps. Each has near takes (the player and close guards) and
  mid-distance takes (far guards), crossfaded and darkened with distance.
- Suppressed guns finally sound suppressed (before, the suppressed pistol and a fitted suppressor played the full report). The
  suppressed shots are made from each gun's own recording: the blast and tail cut away, a dull thump, a puff of gas,
  the slide or bolt clack, a little room.
- Automatic fire chokes each shot into the next, so only the last round rings out. Brass (and shotgun shells) land on
  the floor you stand on (concrete, deck plate, wood; muffled on carpet). The pump and the sniper bolt cycle after
  each shot. Reloads are laid out over the real reload time (magazine out and in, the slide or charging handle on an
  empty reload, shell by shell for the tube shotguns) and stop on a swap. A dry click on an empty gun. The crossbow
  has its own string and limb thunk.
- Gameplay is unchanged: guards hear the noise model (the weapon's `noise` stat), never the audio.
- `?weaponlab=1`: a listening screen with every gun, the campaign arsenal's six first (single, burst, auto), suppressed, player or guard at 6 / 18 / 40 m,
  reloads, dry fire, brass per floor, a footstep for level, and an A/B against the old sounds.
- Tools: `npm run sfx:fetch-weapons`, `npm run sfx:render-weapons`; tests `tests/weapons-audio.test.ts` and
  `scripts/e2e-weapon-audio.mjs` (required).
- Rule: CC0 audio is now allowed for every sound (Michael, 2026-10-16; `CLAUDE.md`, bible S7).

## Music V4 (feature/music, not yet released)
- The game has a score. The main menu plays the menu theme ("Grand, dialled back": Hook A on strings, the melody
  on cellos, then violins). In a match the music follows the guards:
  - **Calm (nobody aware): silence.**
  - **Cautious** (a guard suspicious, investigating or searching): the plucked broken hook, a heartbeat and a faint
    tremolo.
  - **Alert:** a spotted hit, then "Alert, under fire" on its downbeat.
  - **Coming down:** Evasion, then a slow step down through Cautious to silence.
- The music director has hysteresis, so a glance does not flip the music. The music never reads guard count,
  distance or direction, and gameplay never reads the music.
- The music is real orchestral recordings (CC0, VSCO 2 CE), mixed offline into nine MP3 files (5.9 MB, precached for
  offline play). Rebuild with `npm run music:orch` (the samples come from `scripts/music/fetch-samples.mjs`).
- Test page for the score (`/music-test.html` on the dev server). New e2e suite: `e2e-score`.
- Test page: "Hook thread" (round 23) with four Calm and three Cautious alternatives, and Calm / Cautious choosers in
  the in-game test (the game's tracks are unchanged until Michael picks). A position slider scrolls through a piece
  playing alone (with jumps of 8 bars and to the last 4 bars before the loop).
- The music volume defaults to 15 % (an untouched old default, 50 % or 30 %, moves to 15 % once). A short build (a roll
  and climbing strings) leads into Alert.
- The menu theme is twice as long ("Menu theme, extended", 64 bars, 2 min 50 s): the theme as before, then low drums (no
  sticks, cymbals or rolls), a string pulse that turns to sixteenths, and an epic brass layer (the hook on tuba and
  trombones, big brass chords) build to a peak, and it comes back down to the low D it opens with, so the loop joins
  smoothly.
- Fades no longer cut: every music fade starts from the level playing at that moment. Before, a fade after an earlier
  fade began part-way down (entering a match the menu theme dropped to about a quarter at once). Into a match the menu
  fades over 4 s; leaving one the mission music fades over 2.5 s.

## Locomotion run (Phase 3 + 3b, in progress, branch feature/ct-locomotion)
- PC1 (desktop GPU catch-up): Epic desktop no longer fails the voxel shader compile when guards alert (one flashlight shadow at a time with micro detail on, A54; e2e-desktop re-counts samplers after alerting); remote wall peek eases in like the local one (no foot re-plant); empty goggles slot no longer leaves a gap in the HUD tactical row. Harness: anim-audit per-scenario reset and usable `--shots` (side camera, no HUD, no TAAU ghosting, one per scenario + metric); anim-sheet drawn reload / swap, movement turn, aimed wall-edge sheets; e2e-wall mid-switch reversal case (report-only until step 27); anim-audit runs on Windows.
- 22: weight (Michael's play check, M14 / M17): every speed about 17% lower (standing 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 m/s), 0.3 s to full pace, 0.25 s to stop with one closing step and a single settle, turn inertia at speed, a planted pivot on a reversal above 1.2 m/s; aim, draw, strike, crouch and jump stay instant. Gait posed by gear with stride from the real pace, arm swing with effort, acceleration lean, heel-to-toe roll at walking pace, remotes derive acceleration from their velocity. Noise: part stick stays a silent walk. A88, A89.
- 21v: visible sensor grain and slight softening on thermal, electro and night vision (Michael's play check, M14; render only, A87).
- 21w: back-to-wall polish (Michael's play check, M14 / M16): the body stops at a wall end and keeps hugging it (pushing on peeks; only a held pull-away or the context button leaves), crouch on any wall, a slow shuffle (0.9 m/s standing, 0.6 crouched, analog), entry by the context button only (A83), deliberate peeks (no flicker), the peek camera eases over 0.45 s and the shoulder swaps smoothly (never inside a wall), lean-out aim limited to about 85 deg past the edge (aim further round leaves the wall), feet under the hips with the back flat on the wall, crouched knees apart, weapon glides instead of popping when re-held on a wall. A83-A86.
- 21: no bob (D2) and trained posture: heel-strike kick and camera footstep / dash bob removed (camera vertical osc ~0.1 mm), walk sway capped (2.8-2.9 cm), pelvis one low / one high per step on every gear (run / sprint pelvis travel 12-14 cm -> ~1.9 cm), constant gait head pitch, breathing only after 2 s still and fading out on the first step, weapon sway settles in 0.2 s; holstered arms relaxed at the sides with counter-swing and a sprint pump (M14), right arm clear of the thigh holster (A81); crouched arms no longer straight; remote start ankle snaps and stair step-down pelvis fixed. A76-A82.
- 20b: network conditions simulator for local co-op tests (`?net=local&netsim=typical`, E2E_NETSIM: 80 ms RTT, 20 ms jitter, 1% retransmit, A75); e2e-netmove and e2e-coop report under typical: no committed move stuck, no desync, pose within limits (D11). Step 20 (bot partner) dropped (M12).
- 19: custom difficulty (D7): sliders for guard perception speed, guard aim and alarm tolerance (A72) on top of the presets (Rookie / Normal / Veteran as bases, A74), values in steps of 0.05 (A73); saved in settings; in co-op the host's difficulty applies (PROTOCOL_VERSION 10, `dc` on lobby / start, read-only on clients); medkit carry and rewards follow the base preset. Fixed: hidden settings rows were still shown (`.row[hidden]`).
- 18: full remapping (D7): Controller and Keyboard & mouse tabs, two slots per verb, conflict warnings (a shared input is allowed and warned, A71), capture on release with hold-B / Esc / 5 s cancel (A69), reset per device; hold or toggle for aim, crouch, sprint, back-to-wall and grab (hold-mode grab knocks out on release, A70); in-game pad prompts follow the bindings; saved in settings (IndexedDB), local only.
- 17: pad first (D1, D5.12): analog stick speed with gear snapping and hysteresis (50 / 80 / 100% -> gears 2 / 4 / 5, sprint -> 6, A63), the rocker / wheel set the maximum gear (1-5, A64), HUD gear pips lit to the current gear and dimmed to the maximum; rumble table (landings, footfalls, takedown, elbow, shots, explosions, hurt) with a Rumble strength setting, local only; touch trimmed to the D1 basic scheme (touch layout v7 reset; takedown on the context button, A65; the stick spans gears 1-5, A66; training skips the gadget step on touch, A67); Nintendo glyphs; full binding table in docs/systems/input-and-loop.md checked by a unit test.
- 16: the arsenal (bible 5.6, A28, A59-A62): campaign set rifle / SMG / pump / marksman plus Hush 9 SD / Warden .45 sidearms (defaults rifle + Hush 9 SD), mapped at use from the save (no save change); the issued rifle carries a suppressor (A62); every real-brand gun renamed (Heron Carbine, Marten 9 SMG, Mason 12 Pump, Spotter 7.62 Marksman, Hush 9 SD, Warden .45, Kite 5.7, Ferret .45 SMG, Swift 5.7 PDW, Steppe 5.45 Rifle, Ibex Bullpup, Talon 12 Semi, Ridgeline Bolt, Anvil 5.56 LMG); the rest stay in code for legacy. Loadout screen shows Primary / Sidearm in the campaign; the co-op lobby sends the issued loadout (fixed a host weapon / shot desync for old saves).
- 15: medkits (bible 5.13): health 100, no regen; a medkit heals 40 over 1.5 s (pad X held 0.4 s while not aiming, KBM H), damage interrupts (kit spent, A56), aim / jump / sprint cancel; carry 2 (3 at Rookie, host difficulty in co-op); health pickups give a kit; Proving wall medkit station (hold 0.6 s, single use); HUD health bar on by default with kit count and heal fill. Host-authoritative hp and kit counts (`mk`), committed move `medkit` with shared start, MoveState `medkit` (28), PROTOCOL_VERSION 9. Fixed in the step: host cancelled a client heal on a late snapshot; no interactables in sandbox. anim-audit medkit rows.
- 14: thermal and electro vision (bible 5.5, A26, A53): the goggles cycle off / night / thermal / electro, each switch one goggle flip, HUD label for 1.5 s. Both are a `vk` branch in the existing post pass (desktop and phone grade pass, no new render target) fed by a render-only `pattern.w` glow: thermal lights every live rig and dog body, a dead body or dog cools over 60 s; electro lights cameras, laser sights, the sticky-cam lens and powered interactables (switch, alarm, terminal, charge). Render-only and local-only: never sent, never read by perception, the light meter or alarms (unit isolation test, e2e-stealth-ai `vision-detect` / `vision-dog`); e2e-pad / e2e-mouse / e2e-touch cycle the modes.
- 13: door peek (bible 5.3 Doors, A25, A52): the context action (pad A, Space, the touch context button) at a closed, unlocked door within 1.0 m and 60 deg settles at the frame (hand on the handle) and cracks the leaf 0.12 over 0.6 s, quietly; the view goes to the crack (FOV x0.85, look +-35 deg, never inside geometry, local only); the context action again or the stick back closes it, the stick in or interact opens it quietly; damage, aim, jump or sprint end the peek. The crack is drawn only: collision, light (bake unchanged) and guard sight treat the door as closed. MoveState `doorPeek` (27), host-authoritative crack (`door {i, crack}`, snapshot `dcr`), PROTOCOL_VERSION 8. Proving's shed north doorway gets a hinged door. e2e-pad / e2e-mouse / e2e-touch / e2e-netmove / e2e-coop cases and an anim-audit `doorpeek` row (local + remote).
- 12b: D9 open-side weapon at back-to-wall edges (left edge: pistol in the left hand with a mirrored grip, rifle on the left shoulder, camera follows; 0.25 s switch, reversible without a pop; exposure from the real mirrored pose) and D10 aim around low cover (crouched side lean past a low wall's end with the head kept under the top, over the top otherwise; crouched peek round the end). The host samples a remote's head from its posed copy on walls (light parity). No protocol change.
- 12: back-to-wall edges (bible 5.3): corner peek (head only, light and perception from the real head pose, local and remote), lean-out aim and fire past the edge, over-the-top aim on low walls, step round, SWAT turn across doorways (MoveState swat, host-checked, remote replay), corner takedown from the wall; `lk` field and PROTOCOL_VERSION 7; level builder highCover / lowCover renamed highWall / lowWall.
- 11: back-to-wall (bible 5.3, A23, A45): the context action (pad A, Space, touch context button) puts the back to a cover face within 0.9 m and 100 deg (a 0.2-0.45 s settle: 0.2 s + 0.3 s per metre of approach, A46), or the stick held into a high face for 0.35 s at gear <= 4 (a stick held through a traversal or a fall must be released first, A48); slides at the gear's pace capped at gear 4 (2.8 / 1.8 m/s) with crouch-band footsteps; low walls always crouched; inside corners wrap, outside ends stop (edge flags); leaves on the context press again (`gameplay.wallToggle`, default on), pulling away 0.15 s, jump, sprint, takedown or traversal; MoveState `wall` (segment, metres along it, WALL_SUB) posed on remotes; guards flank and grenade-flush a wall-held player (host and clients); two players stack >= 0.62 m apart; camera preset `wall`; PROTOCOL_VERSION 6; new e2e suite `e2e-wall`; anim-audit `wall` scenario (its remaining pose fails are baseline rows carried to step 27, A47)
- 10: elbow strike (bible 5.4): fire while holstered (pad RT, LMB, touch fire) strikes; behind an unaware guard it knocks out, from the front it staggers, a second strike inside the stagger knocks out; 0.9 s committed, contact at 0.5 s. Co-op: generic host-approved committed-move protocol `cmove` / `cstart {t0}` / `cdeny` (A5, A21), MoveState `strike` (index 25), PROTOCOL_VERSION 5; the shared elbow arc also drives the lethal takedown blow.
- 09: holstered unless aiming (bible 5.6): matches start holstered, aim draws (0.3 s pistol / 0.4 s primary) and release holsters (0.4 s); no hip fire (fire while holstered does nothing); ADS spread table (x0.7 crouched and still, movement up to 2.8 m/s); reload is never cancelled by releasing aim (A43); RB swaps while aiming; ready hands while holstered (A42). Co-op: MoveState `dw`, PROTOCOL_VERSION 4, host-authoritative drawn state, weapon in hand and shot weapon (A20, A41), no latency-triggered holster.
- 08: the audit harness also measures remote poses over `?net=local` (host copy vs owner, lag-compensated: gating pose error, gait phase offset, phase-aligned lower body, rubber-band pops, paired-move alignment, LOD skips); `--compare` against `docs/locomotion/audit/anim-baseline.json` (local deterministic; remote gated per A39 / A40); joined to `npm run e2e` as a report-only suite; e2e helpers moved to `scripts/e2e-net-lib.mjs`.
- 07: animation audit harness (`node scripts/anim-audit.mjs`, `--quick`, `--only=`, `--shots`): drives the local player headless at 60 and 120 Hz over every gear, both stances, flat / stairs / ramp / 35 deg slope, stance, raise, swap, ladder, vault, mantle, drops and quick 180; measures the bible 5.12.2 limits, D2 and the measurable D5 items in a Babylon-free `src/anim/audit` module with unit tests; writes local.json and a fail list with frames. Report only for now.
- 06: cover rig poses and clips removed (low-cover curl / lift, blind fire, cover turns, cover foot pins); MoveState slot 1 renamed `wall`, PROTOCOL_VERSION 3 (A2); flat-back stance kept as WALL_STANCE / wallHand / offWall (A6); the open-left weapon mirroring kept dormant for D9; e2e-cover and docs/systems/cover.md deleted; guards in high cover lean to the correct side.
- 05: player snap cover removed (cover controller, glide, cover-to-cover, blind fire, cover aim limits, the doorway / corner lean (A1), coverDash setting); `cover` input kept as the context action; enemy cover AI (coverData, corners, tactics) unchanged. Fix: a reset mid-vault no longer leaves the vault override stuck.
- 02: sonar removed (pulse, marks, ring, HUD, audio, difficulty flag, suit / HQ hooks); the vision button is night vision only.
- 01: Mark & Execute removed (marks, execute, chevrons, charge pips, `ex` shot field, RB / T / Y bindings, touch buttons; touch layout v6).
- 03: regenerating shield removed: `Health(maxHp)`, no regen; effective player toughness 150 -> 100 (-33%). HUD shield bar and `PlayerState.sh` off the wire (no PROTOCOL_VERSION bump yet, step 06). Pistol guard at Normal: 26 per hit, 4 hits to down 100 hp.
- 04: style tracker and style cash removed (`StealthRating` counters stub), results style bars gone, HQ sonar / marks and challenge executes removed; SAVE_VERSION 8 with a v7 -> v8 migration (mission style keys, hq.sonar / marks, executes dropped). HQ credits spent on sonar / marks are not refunded (parked economy). Default presets renamed Silent / Flash / Loud.
## 3.9.0 - Fallow training bunker (Block C, branch `feature/training-bunker`, in progress)
- T5g: the Deep level rebuilt to BAYS v2 at its own offsets (the T5f shift is gone): B7 The House (a 30 x 30 cavern round
  the two-storey kill house, its office behind glass, annex roof, water main, bench, sandbags, the store door into A7),
  B8 The Range (60 x 16: glass firing-line screen, six lanes, shoot-house, glazed tower, catwalk and its caged stair,
  sniper scaffold), A8 with its medkit, B9 The Plot (a three-floor well with glass balcony fronts, cabins, bridge, rope,
  zipline and tube duct to the lift lobby) and the exit lift. Objectives listed by name; relief doors placed.
- T5f: B5 Standby Plant, A5, B6 Mock Site, S6 and A6 rebuilt to BAYS v2; B4 / A4 at their v2 offsets (66, 14) / (70, 8)
  (the T5e passage is gone) and A4's wall medkit. B5: one 30 x 24 guarded hall: EL (screened but for its stair), gensets
  (wall-jump roofs), trench, cable gallery, glazed switch room (MB, the mains gate on A5), fuel bay. B6: one line RC ->
  AH -> plant ladder -> supply duct -> vent drop -> records -> corridor (2.0 clear), then the operator / runner split
  (lockers, CR stair, mezzanine / L-leg, mantrap, server room) -> keypad -> S6 (rising north) -> A6. Relief doors (A62)
  placed as visual leaves with course data. v1 Deep moved by (+17.5, -29) until T5g (A74). New R1 / R2 nav tests.
- T5e: B3 The Intake and B4 The Cistern rebuilt to BAYS v2. B3 sits against A2 (no more passage): one line up the shaft
  (riser slot, two wall jumps, the damper bar) and down again (two rope stages, the control-room window, the zipline,
  the fan guard, twin ducts). B4: three cells, W1 boost and bolt door, W2 human ladder and sluice, outlet platform; it
  stands at an interim offset with a passage from A3 until the Plant rebuild.
- T5b walk-1 fixes: airlocks are automatic (R6, D46): a marked 4 x 4 m floor pad set 1 m in from the walls; one player
  on it shows "Waiting for partner" on both screens, both on it with the bay's objectives done seal it (the rear door
  shuts and locks for good, a 4 s cycle, the front door opens). The Cycle button is gone. The cycle holds while anyone
  stands in the rear doorway. The client now gets every course prompt (course items are sent first; `MAX_ITEMS` 128,
  `MAX_DOORS` 256) and shuts any rear door the host locks. The objective list is always on screen for both players
  (R5, D45) with the airlock status under it. New two-page suite `e2e-bunker` (B1, B2).
- T5b2 partners block each other (D49) in every co-op mode, on both screens (a partner capsule in its own collision
  group; off while the partner is down or in a boost or human ladder). Remote players snap on a teleport instead of
  sliding through the space between (a jump over 2 m faster than 25 m/s, or across a stall that a 90-degree turn at
  the earlier speed cannot explain), so a teleported partner no longer shoves anyone.
- T5d Upper rebuilt to the v2 bay plans: B1 Muster is five small rooms in a chain (lift lobby, kit room, briefing room
  with a glass wall onto the gear run, the 20 m gear run, the dark store), B2 The Lanes is one 52 m lane both players
  run in order (plinth, rail, block wall, caged ladder, pipe over a pit, hang-drop, trench, downpipe and beam ledge
  round a column, gap jump to the portal sill, three drop pads, the window wall). Glass is see-through and not
  climbable; every bay's objectives are listed by name.

## 3.8.0 - Fallow training bunker (Block B, branch `feature/training-bunker`, in progress)
- T2 Upper level (y 16): B1 Muster (lift lobby, kit room, briefing room, dark store, the gear-run corridor), airlocks
  A1 and A2 (locked blast doors the course opens, bench, vision slot), B2 The Lanes (two mirrored obstacle lanes with
  every ground and climbing verb, glass walkway, lever-gated lane doors, drop pads and pit). Map `bunker` ("Fallow",
  `?autostart=bunker&mode=course`, not listed) with a course stub (B1, B2). `scripts/plan-svg.mjs` draws a map's
  storey plans headless. Tests: `tests/bunkerMap.test.ts`.
- T3 shaft and reservoir (Plant level, y 6): B3 The Intake (24 m shaft with galleries G1-G3, riser-casing split slot,
  wall-jump lip, damper bar, hoist rope past the control-room window, spoil zipline, fan guard and discharge duct, catch
  nets), airlock A3, B4 The Cistern (three cells, 4.4 co-op walls, inspection door, sluice, valve gallery, overflow
  channel, float shaft, sump, outlet platform) and airlock A4 on the outlet platform. Course stub B1-B4 with the fan
  isolator, bolts, the sluice hold and the outlet ladder.
- T4 Plant level, rest (y 6) and Stair 6: B5 Standby Plant (three gensets with wall-jump roofs, grating walkway over a
  secret cable trench with lift-out panels, cable gallery with a hang-drop, glazed switch room with the mains breaker
  switch, fuel bay and day tank, duty desk, entry landing and stair at A4's door), airlock A5 and its service passage
  (plant platform under the supply duct), B6 Mock Site (reception, corridor and L, open office with partitions and the
  glazed manager's office, control-room mezzanine at 3.6 behind a reader door, lockers, records with the duct's
  ceiling grille, mantrap, server room, exit keypad lobby), S6 (33-riser enclosed stair to y 0) and airlock A6.
  `BUNKER_DEVICES` mount points for T7a. Course stub B1-B6: the mains gate on A5, card readers, keypad, egress, S6's
  one-way top door; Finish in A6.
- T5 Deep level (y 0): B7 The House (rock cavern, two-storey kill house with roof parapet and hatch, kitchen annex,
  water main, rock-bolting bench, sandbags, skip, recesses, the store door), airlock A7, B8 The Range (firing line, kit
  lockers, lane stands, penetration wall, barrels, lamp gantry, shoot-house barricades, catwalk, control tower, caged
  catwalk stair bolted from below, sniper scaffold), airlock A8 (medkit), B9 The Plot (plot floor and map table,
  balconies 4.5 / 9.0 with cabins, bridge, stair towers, the north-west boost gap, bridge rope, zipline to the lift
  lobby, message-tube duct) and the exit lift L9. Course stub B1-B9: store key, catwalk bolt, keys A / B, the case and
  the two-key lift; the course ends in the lift. e2e-anchors covers the bunker.

## 3.7.0 - Training course framework (Block A, branch `feature/training-bunker`)
- Course mode (T1a, T1b): `CourseState` (pure, host only) runs bays, airlocks and gates (lever, bolt, hold, timed hold,
  pair, egress, mains, pickup / flag, anchor lock), checkpoints and bay restarts; `CourseMode` puts down the devices,
  keeps door, anchor and lamp locks in step and speaks LANTERN's radio (text only, held while guards are alerted).
  Co-op "Training course" takes two players (host P1, client P2): the `course` message mirrors state, locks and lights;
  friendly fire is on (D38). Debug map `courselab` (`?autostart=courselab&mode=course`, not listed); dev solo flag
  `?course=solo`.
- Drills and tutorial (T1c): `drillDetect` derives every drill verb in one place (edge-triggered); the client reports
  its local-only verbs as `ctick`; takedowns, thrown gadgets, doors and team moves resolve and tick on the host. The
  tutorial HUD lists the bay's drills with P1 / P2 tick columns and the current step in LANTERN's voice; drill-done
  toasts and radio on both pages; next-drill markers (Settings > Gameplay "Course markers"). Airlocks and the course
  end device ("Finish", `devices.end`) refuse while drills are open, naming them. No skip path (D30).
- Results: a course panel (per-bay and total time, detections, alarms, knock-outs, kills, revives, team moves, per
  player and team; the finale's Ghost / Silent / Loud tier). Course record `course:fallow` (IndexedDB kv; no save
  version change); the co-op lobby offers "Start at bay N" for finished bays, and both players start in that bay's
  entry airlock.
- Net: `PROTOCOL_VERSION` 3 (`course`, `ctick`, `start.bay`, `td.kind`). Tests: `tests/course*.test.ts`,
  `tests/courseTutorial.test.ts`, e2e `e2e-course`.

## 3.6.x - First Playable (in progress)
- Docs: 2026-10-10 cleanup (retired maps archived, docs match the new campaign).
- Docs: story 2.0 (D1, approved): present-day campaign, Mission 1 Dead Line at Cinder Yard (Ostler Colocation's data centre), Mission 5 The Strongroom, Kestrel Exchange retired.
- Dead Line v2 G1 (Area 1, 3.5.1): the Cable Lane greybox (`?autostart=dead-line-v2&mode=sandbox`, main menu card "Dead Line v2"), generated from `docs/design/map-dead-line-v2.json` by `scripts/gen-dead-line-v2.mjs`: lane, viaduct, lean-to roofs with downpipes, roof lights, palisades, spikes, cars, substation rooms, cable tunnel with M1 and M2 shafts and ladders, vent grating, flat debug markers, debug Teleport (encounters, checkpoints, spawns). Gate report `docs/archive/maps/gates/dead-line-v2-G1.md`. The old Dead Line is unchanged.
- Per-object hold noise: `Interactable.holdNoise` sounds at the start of a hold and every 0.5 s while it runs (`holdNoisePulse`, `HOLD_NOISE_PULSE` in `config/noise.ts`); `MANHOLE_LIFT_NOISE_RADIUS` 10 m for cast-iron covers. Holds without it stay silent.
- Nav layers per map: `MapDef.navLayers` (default 3, `DEFAULT_NAV_LAYERS`); Dead Line keeps 5 surfaces per column for v2's A block (basement to roof).
- G1: Mission 1 DEAD LINE campus greybox (`?autostart=dead-line&mode=sandbox`), generated from `docs/design/map-dead-line.json` by `scripts/gen-dead-line.mjs`: four floors plus the trench and culvert, 12 doors, stairs, ladders, drops, ducts, ledge and roof beam, flat debug markers, flat light, no guards or lamps. Debug overlay Teleport menu (chapter starts, spawns, objectives). Gate report `docs/archive/maps/gates/G1.md`.
- T1: the Kestrel Trunk Annex ("Dead Line") is a listed map and mission (`?autostart=trunk-annex&mode=infiltration`): a walkable 36 x 28 m greybox on three levels with the yard, Goods-in, break room, switch hall and gallery, generator room, core switch cage, Test and Control rooms, roof, open stair, fire stair and four ladders; four insertions, objectives O1 and O2, exits E1 and E2; six guards on 40 s master-clock loops (timed patrol routes). NavGrid path costs are Float64 (a long search could loop and find no path). No lights, switches, panels or trench yet (T2, T3).
- S1a: the Kestrel Exchange greybox is a listed map (`?autostart=exchange&mode=sandbox`): cable tunnel and chamber, ground floor shell, basement stair, main stair to a first-floor landing. No lights, guards or objective yet (S1b, S1c).
- S1b: the Exchange's first floor, roof and rear goods yard: switchroom, offices, server hall with its cage, gallery and motor-room stairs, roof with parapets and the steel stair to the yard, yard with cover. Nine rooms.
- R1: Exchange layout v2, basement and ground floor: cable chamber, rectifier, battery, generator, boiler, riser base, service tunnel, MDF hall, test and transmission rooms, foyer, security, canteen, meeting room, cleaners, goods-in, workshop, light well, ring corridor, with the C ladder, B, V and R stairs, the plant ramp and the coke stair. The first floor and roof are rebuilt in R2.
## Unreleased - Movement foley (feature/footsteps)
- Sound: the player's footsteps, landings and moves are real CC0 recordings (Kenney Impact Sounds and RPG Audio,
  `docs/audio-credits.md`) instead of one filtered noise burst per surface. Each step is a heel and a toe from separately
  picked takes with their own pitch and level, the two feet a touch apart, no take repeated back to back, no gear
  sound at all: the suit is built not to make noise. Crouch, walk, run and sprint each sound different (a slow soft roll to a slap); concrete, metal
  (deck ring), grate (rattle), wood (boots on boards), gravel (crunch) and carpet each have their own takes. Landings
  (soft, roll, heavy), vaults, mantles, hops and rolls have their own sounds, all damped by the suit (dull, short, quiet).
- Steps now follow the animation's real foot plants instead of a timer, so they match what the feet do (turning on
  the spot, stopping, a stride at any speed gear).
- Gameplay is unchanged: guards still hear the noise model, never the audio.
- `?foleylab=1`: a listening screen with every surface and gait, the landings and moves, and an A/B against the old steps.
- Tools: `npm run sfx:fetch`, `npm run sfx:render`; tests `tests/foley.test.ts` and `scripts/e2e-foley.mjs` (required).
- Rule: `CLAUDE.md` and the bible (S7) allow CC0 movement foley (Michael, 2026-10-16).

## 3.5.0 - Chaos Theory foundation
- Direction: the game is now **Night Shift**, an original stealth game in the spirit of Splinter Cell: Chaos Theory
  (`docs/design-bible.md` v1.7, story in `docs/story.md`). This release changes no gameplay and no feel.
- Integration: `ct-movement` now carries `master` 3.4.0 (the light phone renderer, baked lamps, the Phone check) with the
  Chaos Theory movement (3.2.0-ct) and the Warehouse CT routes. The Kestrel Exchange is a paper design only (map phases
  0-2, `docs/archive/maps/prompts/exchange-design.md`; paused until roadmap Phase 3b); the old Exchange blockout is gone. The split
  jump can be jumped out of again.
- Design bible: `docs/design-bible.md` is the authority on design (vision, pillars, systems, out-of-scope list, process,
  roadmap Phases 0-7 with 3b); `docs/progress.md` says where the project stands.
- Docs: `CLAUDE.md` 142.7 KB -> 9.6 KB, a lean core with a doc index; everything else moved word for word into
  `docs/systems/*.md` (19 files, read on demand; a script checked that no line was lost). `CHANGELOG.md` 137.9 -> 45.2 KB
  and `TESTING.md` 84.4 -> 32.0 KB keep 3.0.0 onwards; older entries are in `docs/archive/`.
- `?legacy=1`: Wave Survival, Mission, Hunter, Team Deathmatch and Free-for-all, credits / XP / level, the Loadout suit,
  appearance, tag and emotes, HQ, challenges, weapon upgrades and camos, and the Ghost / Panther / Assault bars are hidden
  unless the URL has `?legacy=1` (never saved). Without it: the Play screen offers Infiltration (the default), Training and
  Free Roam; the co-op lobby Infiltration and Free Roam; the Loadout screen weapons, attachments, gadget and presets, with
  every weapon and attachment selectable (nothing is bought, unlocked or saved as owned: the save keeps your choice).
  Nothing is deleted, progression still records, saves are unchanged (no `SAVE_VERSION` change), and
  `?autostart=...&mode=...` starts any mode.
- Title: the game's name is Night Shift on the menu, the loading screen, the page and app titles and the install
  manifest ("Night Shift (Preview CT)" on `/ct/`). The internal ids keep the old names (IndexedDB `shoulder-strike`, the
  save export magic, the co-op app id).
- Tests: `npm run e2e` runs the required suites; `npm run e2e:legacy` runs `e2e-progression`, `e2e-cosmetics` and
  `e2e-clear` (parked content, report only). New: `e2e-park` (the legacy-off and legacy-on menus), `tests/legacy.test.ts`.
  `e2e-traverse` and `e2e-netmove` wait for the match / the host's copy to settle on slow machines.

## 3.4.0 - Light phone renderer
- Direction: desktop first. Phones no longer chase the PC renderer: on the iPhone the voxel look reached ~65 fps cool
  and fell to 18-30 once warm, whatever was cut. Before 3.0 phones ran smoothly because they drew the plain level in
  simple materials with no post effects - that is what they draw again.
- The phone look: the Warehouse's plain blockout (no voxels) in simple materials, smooth characters and weapons, the
  nearest six lamps as plain lights, contact shadows under characters, the scene fog, the vignette / goggles pass and
  nothing else (no shadow maps, no TAAU, no post effects). Native resolution; the frame governor steps down to 75%,
  then holds 30 fps, as before. The Loadout operator on a phone is the smooth one too.
- Gameplay is unchanged: collision, cover, navigation, enemy sight and the light meter always read the plain level, so
  a phone player sees and hides behind the same things as a PC player (co-op and PvP across devices stay fair).
- The Phone check (about 8 minutes): the phone look at 100% and 75%, with the moon's shadow, the 3.3 voxel look for
  comparison, the first run again (heat), then 3 minutes held at 60.

## 3.3.2 - Phone check without the heat
- The iPhone dropped from ~100 fps to ~20 during the Phone check and came back after a few seconds on the home
  screen: heat, not a leak - textures, shaders and memory stay flat across six benchmark matches and return to the
  menu's level after (checked headless). Uncapped runs keep the GPU flat out; a hot iPhone slows its GPU hard, and a
  few seconds idle cool the chip (not the case) enough for it to run fast again until it heats up.
- The Phone check now cools down for 30 s between runs (nothing drawn, a countdown on the run tag), so a run measures
  its settings rather than the runs before it, and ends with 3 minutes at the match's 60 fps cap: per-minute
  averages say whether 60 holds once the phone is warm. About 12 minutes; start with the phone cool.

## 3.3.1 - Reading the Phone check
- The first Phone check (iPhone 17 Pro Max): the phone look at 75% averaged 69 fps (median frame 14 ms), at 100% 42;
  the per-lamp loop 61, the voxel detail 52. The frame rate fell at the end of every run: not the next run loading (it
  loads only after the run's result is taken) but the route - 20 s at a walk ends where the camera leaves the
  dead-end office and looks down the corridor into the hall at the first guards (rifles, pouches, a dog, a recon
  drone, barrels, pickups: ~100 meshes on screen against ~30 before).
- Each run's line now ends with its frame rate per 2.5 s of the route (`by 2.5 s (7 m): ...`), so a slow stretch shows
  where it is.
- The spike log counted nearly every frame of an uncapped run as a spike (14 ms frames against a 120 Hz screen's
  8.3 ms): a spike is now 1.5x the budget or the typical frame, whichever is longer.
- The Phone check runs the phone look at 75% again last: the later runs were all ~56 fps whatever they changed
  (taking bounce light out included), which looks like the phone heating up; the repeat says by how much.

## 3.3.0 - One phone look
- Phones have no graphics settings any more: one fixed look built for 60 fps on the iPhone 17 Pro Max. Settings >
  Display keeps the field of view, the FPS overlay, the avatar style, the interface switch and fullscreen.
- Resolution 75 - 100% of the screen, sharpened to full resolution (TAAU), chosen in the match by the frame governor:
  a match starts at 75% and steps up while there is room; it never goes under 75%. A phone that still misses 60 there
  holds a steady 30 instead of wobbling, and tries 60 again later.
- What the phone look keeps: every lamp's light and shadows (walls, racks, doorways) and the characters' shadows under
  them, bounce light, the moon's shadows (one cascade), one flashlight shadow, the height fog. What it drops: ambient
  occlusion, reflections, bloom, light shafts, depth of field, lens effects, the 2.5 cm prop layer, and on the voxel
  walls the AO, worn edges and fine surface texture.
- The lamps cost two texture reads a pixel instead of a loop over up to eight lamps: they are mixed into one light
  volume (the bake's own 0.2 m cells: light and the direction it comes from) on the GPU - at load, and again over
  the cells of any lamp that switches, is shot out or goes down to an EMP (2 - 4 ms once, not every frame). Next to the
  per-lamp version it looks the same (TESTING.md has the comparison).
- Spike log: every frame over 1.5x the budget is tagged with what happened around it - shaders compiled, voxel
  levels of detail swapped, lamps re-mixed, the governor stepping, else the main thread or the GPU. Each benchmark
  run's line ends with it; feedback notes from a match carry it.
- Settings > Display > Phone check: eight 20 s flights - the phone look at 75% and at 100%, then the per-lamp loop,
  the voxel detail, bloom, light shafts and High shadows put back one at a time, and bounce light taken out. Runs are
  uncapped so the headroom shows. Send the note: it says what the phone can keep at 60.
- Measured before this (iPhone 17 Pro Max, 3.2.2): Medium at 75% 33 fps, at 56% 54 fps - the cost is the shading of
  every pixel, not the passes after it.

## 3.2.5 - A walking benchmark flight
- The benchmark flight cut straight from room middle to room middle - through walls - and was then lifted over
  whatever was below it, so it bobbed up and down over crates and racks. It now follows the guards' walking routes:
  the rooms in a short loop, through the doorways and down the corridors, up the mezzanine stairs (never a ladder),
  rounded off and kept clear of the walls, at a steady 1.9 m eye height (lower only under a beam or a deck), at a
  walking pace (2.8 m/s), the view looking ahead along the route and turning gently (under 100 deg/s); a dead-end room
  is circled rather than reversed on the spot, and the view turns towards the open side at tight corners. The doors
  stand open with their leaves hidden during the benchmark, so nothing stands out into a corridor. Warehouse: a 180 m
  loop through the nine rooms, no step crossing the level, nothing within 0.3 m of the camera.
- A run now covers part of the loop (30 s at a walk) - the same part on every run, so runs compare; results are not
  comparable with earlier versions' benchmarks (different views).

## 3.2.4 - Landscape only, either grip
- Phones are always landscape, whatever the orientation or rotation lock: held upright, the page turns - now the way
  of the landscape grip last held (clockwise after one, anticlockwise after the other), so turning the phone upright
  leaves the game where it was on the glass. Where the browser allows a lock (Android in fullscreen or installed), the
  screen is locked to landscape on the first tap; an installed app locks too. (iPhone browsers have no lock: the page
  turns itself.)

## 3.2.3 - Low's floors, the benchmark flight, turning the phone
- Low drew floors and crate tops as flat haze ("no floor"): the surface atlas made while the map loads came out empty,
  and every preset but Low replaced it when its size changed - Low's size (256) never did. It is always drawn anew
  on the first graphics apply.
- The benchmark flight went through the solid block under the mezzanine deck (the Mezzanine room's middle at 2.2 m)
  and the frame rate fell through the floor there: the flight is sampled densely and every point kept 1.6 m over
  whatever solid is below it, under the roof.
- Turning the phone mid-match fired several resizes with in-between sizes, each re-making every full-resolution
  target; at Ultra the memory spike closed the tab. The engine now resizes once the size has settled (250 ms).

## 3.2.2 - Phone memory and per-pixel cost
- The iPhone (3.2.0 benchmark) is GPU bound - frame time follows the pixel count (Medium 33 fps native, 54 at 75%;
  the "main thread" figure falls with resolution: it is waiting on the GPU) - and Ultra ran out of memory on its
  second or third run. Per match: GPU textures 251 -> 159 MB and JS heap ~400 -> 289 MB (headless, phone Ultra):
  - the voxel brick pools and the lamp bake no longer keep a CPU copy of their textures (kept only to rebuild after a
    lost WebGL context; 64 MB per voxel layer);
  - phones: the moon's shadow maps at most 1024 (Ultra's 2048 cascades took 72 MB), surface textures at most High.
- Phones: one flashlight shadow (every shadowed light is sampled by every pixel), no on-the-fly reflection filtering
  (several cube taps per pixel; the probe's mips / spherical harmonics instead), voxel corner shading from 4
  neighbours instead of 12; FXAA no longer runs behind TAAU (every device).
- Shaders compile on the loading screen (every material ready before the match starts; the benchmark counted 37-57
  compiles inside each run).
- Phone benchmark: each run frees the last match and pauses 2.5 s before the next loads ("freeing memory").
- The mid-match shadow rebuild did not reproduce headless (same draws and render time after it): most likely memory
  pressure on the phone; this release frees a lot of it.

## 3.2.1 - Desktop resolutions are the monitor's own
- Settings > Graphics > Resolution (desktop) lists the monitor's standard resolutions instead of percentages of the
  window: a 7680 x 2160 monitor offers 7680 x 2160 (native), 5120 x 1440 and 3840 x 1080 (same shape, down to half
  its height; 16:9, 16:10, 21:9 and 32:9 tables; an unusual shape gets its native size at 75 / 67 / 50%). Fullscreen
  draws exactly that; a window draws the same share of itself.
- Benchmark lines and feedback notes name the chosen resolution, with the real size when a window differs
  ("5120x1440 (window 1707x1005)"); the display line adds the monitor. Benchmark > Resolutions runs each of the
  monitor's resolutions.

## 3.2.0 - Baked lamps: every lamp lights and shadows correctly
- Every fixed light in the map (lamp strips, floods) is baked when the map loads: how much of each lamp's fixture
  every 20 cm of its reach can see through the level - walls, racks, crates, shelves, doorways. Every material shades
  each lamp by it, so all of them cast correct shadows (before, only the nearest 2-4 did; the rest shone through
  walls and racks while the guards' light model said you were in shadow). Strip lamps are area lights: soft along
  the strip, sharper across it. Characters get soft shadows from every lamp (a capsule each).
- Switches, shot-out lamps and EMP still change a lamp at once (its intensity; nothing re-bakes).
- Cheaper on every device: lamps are no longer real lights or shadow maps (the Ultra phone path: lamp shadow-map
  draws 45 -> 10, render JS 6.5 -> 5.2 ms on software GL); only flashlights stay real lights (up to 4, two with
  shadows). Settings > Graphics: Real-time lights is gone; Shadows is the moon and the flashlights.
- The bake runs in the voxel workers on first load (about 2 s headless) and is cached (IndexedDB `lamps:` keys, the
  newest two). `?baked=0` renders the old way, for comparisons.
- No second draw of the scene for depth: without ambient occlusion / reflections (every phone preset, desktop Low /
  Medium) the fog, light shafts and TAAU read the scene pass's own depth buffer (a depth texture on the first post
  process's target) instead of a separate depth pass. Phone Ultra: 223 -> 159 draw calls (baked lamps included).
- Benchmark > Feature costs adds: the settings at 75% render scale (faster = the GPU is the limit), anti-aliasing FXAA
  instead of TAA, and Detail Medium (no fine prop layer).
- Bounce light: the lamp circuits are mixed into one texture whenever a circuit changes (switch, shot, EMP), so a
  pixel takes one GI sample instead of one per circuit (9 in the Warehouse).

## 3.2.0-ct - Chaos Theory movement (ct-movement branch)
Phase 0 - speed gears, instant stop, roll:
- Speed gears: six paces, stepped one at a time (controller D-pad up / down, mouse wheel or = / - on PC, the new speed
  rocker on touch). Crouched 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8 m/s, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0 m/s;
  the stick scales the gear's pace, a keyboard or a stick at its rim gives the full pace. Every spawn and respawn
  starts in gear 3; crouching and standing keep the gear. Sprint is gear 6 standing while it lasts; aiming is still
  capped at the aim pace. The HUD shows SPD pips by the light meter for 1.5 s after a change; the touch rocker shows
  them all the time.
- Footstep noise: crouched gears 1-4 and standing gears 1-2 are silent; faster gears are heard further.
- Chaos Theory feel on free movement: letting go of the stick stops the operator dead on the next step (the feet
  stay planted), starts reach full pace within 0.08 s, direction and gear changes
  take effect at once, no planted pivots, the body turns at up to 720 deg/s. Cover, cover-to-cover, traversal and
  the guards move as before (the guards' tuning is now pinned by a test).
- Stopping holds the exact stride you stopped in (a foot in the air sets straight down) until the next input - the
  stick, aiming, a stance change, cover or a climb - from any pace, crouched (no automatic kneel) or out of a sprint.
  A controller stick springing back counts as letting go from the full pace (it no longer slows you on the way).
- Cover: the speed gear sets the pace along the wall (gear 1 creeps, gear 6 hurries; no faster than 2.8 m/s standing,
  1.8 crouched; gear 3 is about the old pace).
- Forward roll: tap crouch while moving standing in gear 5-6 (or sprinting) - a committed 3 m roll in 0.7 s that
  comes up crouched; guards within 2 m hear it.
- Controller: D-pad right is now the gadget (hold to aim, release to throw); D-pad left tapped pings (co-op), held
  opens the gadget wheel; View tapped is goggles, held plays emote 1. PC: the mouse wheel changes the speed gear
  (weapons stay on Q / X); new bindable keys Speed up (=) / Speed down (-).
- Touch layout v4: the speed rocker (right of the move stick's zone) is added to every preset and the layout editor;
  saved layouts keep every placement.
- Debug Tune panel: a Chaos Theory table (stop blend, start time, turn rate, roll time / length).

Phase 1 - networked movement state:
- Co-op and PvP: team-mates and opponents are shown doing exactly what they are doing - in high or low cover (hiding,
  peeking over, leaning out at an edge, kneeling), climbing a ladder or drainpipe, hanging from a pipe or a lip,
  crawling a duct, riding a zipline, vaulting, mantling, rolling and in a takedown - posed by the same code as the
  player (hands and feet on the same rungs, within a few cm), instead of sliding upright between positions.
- A committed move (vault, mantle, step, drop, hop, roll, window vault) is sent once at its start and replayed on
  the other screens along the same path, so it never cuts corners through the obstacle.
- A change of mode (taking cover, grabbing a ladder) is sent at once, not on the next 20 Hz tick.
- Hit volumes on other players follow their pose (hanging, crawling, leaning): a shot at a hanging player's head is a
  headshot. The host's lag compensation rewinds the posed head and body, not just the feet.
- Host checks: a client's free movement is held to its speed gear's pace (+15%); a client claiming a ladder or lip
  stays within half a metre of it (clamped, never kicked).

Phase 2 - split jump, wall jump, pipe legs up / inverted:
- Split jump: between two tall walls 1.2-1.95 m apart, facing along them, a double jump braces in a split with the
  legs straight out to both walls 2.5 m up. Aim (LT) draws the sidearm one-handed (turn up to 100 deg either way, look
  down steeply), RT fires; B drops (or a drop attack). Nothing else leaves it.
- Wall jump: facing a wall under a lip 2.7-3.8 m up (too high to grab standing), Y ("Wall jump") kicks off the wall up
  to a hang on it; at an inside corner the kick goes off the adjoining wall to the lip beside it.
- Horizontal pipes: hanging by the hands, Y ("Legs up") crosses the legs over the pipe - a slow shimmy along it with the
  feet well up out of the way; Y again ("Invert") hangs upside down by the knees: no travel, the sidearm aims and fires
  (spread x1.3) while the camera stays upright; Y curls back up, B goes back to the hands; inverted, B lets go and flips
  over onto the feet. Changes take about half a second; getting hit during one drops back to the hands.
- Co-op / PvP: other players see all of it (split braced and aiming, the wall kick, legs up, inverted), hit volumes
  follow the pose.
- Proving Grounds: a Chaos Theory course north of the platform (a split corridor with lips above, a wall-jump block
  with an inside corner, a pipe over open ground).

Phase 3 - rappel and fences:
- Rappel: at a roof edge with a rappel point, Y ("Rappel") hooks on and steps over. Stick down descends (1.6 m/s, 3 m/s
  with sprint held), up climbs (1 m/s; at the top back over the edge). Y kicks out from the wall and swings back,
  sideways with the stick (up to 1.5 m either way). Aim (LT) turns round on the rope with the sidearm. Beside a window,
  Y kicks through it (the glass breaks) into the room. B unhooks within 2 m of the floor; at the bottom it unhooks.
- Fences (chain-link): Y ("Climb") grabs one; climb up / down 0.9 m/s, shimmy 0.6 m/s; at the top Y flips over and
  down the far side; B drops. Climbing above gear 3 rattles it (heard 4 m away); gears 1-3 are quiet. Fences stop
  bodies, never bullets or sight, and give no cover.
- Co-op / PvP: other players see you on the rope (with the rope drawn) and on fences.
- Proving Grounds: a 5.5 m rappel house north east (ladder up its west side, a rappel point over a glazed window, a
  doorway east) and a fence north west of the platform.

Phase 4 - Chaos Theory takedowns and the grab:
- Drop attack: hanging from a lip or a pipe (by the hands or legs up), braced in a split, on a zipline or a rope, a
  guard 1.2-5 m below within a metre of where you would land: "Drop attack" (tap knocks out, hold kills).
- Hanging inverted on a pipe, a guard right beneath: choke him up (tap) or break his neck (hold); you stay hanging.
- Hanging at a lip, a guard standing at it above is still pulled over (the ledge pull).
- The grab replaces the instant takedown from behind (dogs excepted): Y ("Grab") takes the guard and holds him in front.
  Holding him you walk (gear 2 at most), LT / RT aim and fire the pistol one-handed over his shoulder (spread x1.2);
  Y again: tap knocks him out, hold kills; B shoves him away (he staggers a second, then raises the alarm). Guards who
  see you hold their fire for 1.5 s, then aim at your head only - and their shots hit him first. If he dies, he drops.
  An Execute charge is earned as with any takedown.
- Co-op: a client's grab holds the host's guard in front of that player (a shield for them too).
- PvP: the drop attack, the ledge pull and the inverted choke work on opponents (the host checks them); no grabs.
- Training: the takedown step is now a grab and a second press.

Phase 5 - co-op team moves:
- Brace: with a team-mate within 3 m and a wall right behind you, hold Y - back to the wall, hands cupped. B stands up.
- Boost: facing a braced team-mate (within 1.2 m), tap Y - a step into their hands and a toss up to a lip, pipe or
  split above (up to 4.5 m) that you could not reach alone. The prompt shows only when there is one in reach.
- Human ladder: facing a braced team-mate, hold Y - you climb onto their shoulders (feet 1.45 m up) and stand there
  free to turn, aim and fire; Y grabs a lip up to 4.1 m over the floor, B hops down. The bottom holds still; B drops
  the climber.
- The host checks every request on both players' states (alive, team-mates - same side in Team Deathmatch - the
  partner braced, the climber on the ground, within reach, the target in range; one request a second) and starts it
  on both screens at once; refused requests do nothing.
- Y order: takedown > team move > Chaos Theory move > traversal > interact.
- A teleport (respawn, insertion) now drops any committed move in flight and is never counted as a fall (no landing
  roll where it lands).
- Proving Grounds: a 4.2 m block north (out of reach alone) for boosts and the human ladder.

Warehouse - Chaos Theory routes (more ways in, more height):
- A roof walkway over the south facade (6.3 m, moonlit, a loud metal deck): up a drainpipe in the west yard, or - with a
  team-mate - a boost or the human ladder up the new pump house in the east lot and a climb from its top.
- A rappel point on the roof edge over the glazed dispatch window: down the rope, kick through into dispatch.
- The skylight edge over the workshop: hang from it and drop on the patrol below.
- The service corridor's walls stand 4 m along a 5 m stretch (1.86 m apart, no cabinets): split jump over the new
  corridor patrol and drop on him.
- A pipe from the mezzanine deck out over the factory floor at 4.4 m, above the floor patrol: legs up, inverted, drop.
- The big press stands 3.3 m: a wall jump up to a perch over the floor.
- A chain-link fence closes the dark yard lane off from the east lot: climb it in the dark (quietly at gears 1-3) or walk
  round through the lit gap by the facade. Guards walk round.
- One more guard: a corridor patrol (Hunter / Infiltration counts include him).
- The gatehouse in the east lot moved south, clear of the pump house.
- Takedowns: the offer now tries the three nearest guards (a guard behind a wall no longer hides the one under you);
  a grab whose hostage is shot dead ends at once.

Playtest changes (Michael, 2026-10-08):
- Jump: a new touch Jump button; with a controller / keyboard, Y / E jumps when nothing else is on offer. A jump keeps
  the run's pace (about 0.8 m up) and the hands grab what comes in reach on the way: a lip, a horizontal pipe, a
  drainpipe or a ladder. A second press in the air between two tall walls braces in a split (a double jump); the split
  prompt says so.
- Split jump: the feet brace 2.5 m up (was 1.9 m); the walls need 3.6 m.
- Horizontal pipes: hanging by the hands faces along the pipe (hand over hand, not side-on like a lip), and so does
  hanging upside down (the legs wrapped round it); hold the stick back against the facing to turn round on it.
  Standing under a pipe, Y / the action button takes it before a mantle over anything beside it; the mezzanine deck
  pipe now starts further back over the deck.
- Touch action button: one button does what the world prompts show - take cover, vault, climb, grab, rappel, wall
  jump, boost, cover-to-cover, corner, leave cover, use - dimmed when nothing is on offer. The prompts stay on the
  surfaces as indicators (no longer tapped). With a cover face and an obstacle both prompted, moving (or the stick
  pushed at it) goes over / up it, standing still takes cover. Touch layout v5 adds the Jump button beside it; saved
  layouts keep every placement.

Playtest changes, second round (Michael, 2026-10-08):
- Split jump: the legs go almost straight out to the walls (the body sits lower, hips just over the feet), so the
  hallway can be wider: 1.2-1.95 m between the walls (was 0.9-1.7). It faces down the hallway the way you jumped, so
  either way works. No jumping out of it: drop (B), a drop attack on a guard under you, or aim and shoot the pistol.
- Warehouse: the corridor cabinet bank is gone; the corridor's own two walls stand 4 m along a 5 m stretch, 1.86 m
  apart. Proving Grounds: the split corridor is 1.8 m wide.
- Fix: after a fall (or stepping off a curb) the operator could come to rest floating 4-14 cm over the floor. The
  character now settles onto it.
- Fix: a respawn / insertion puts the feet straight into a stance where you appear (they used to walk over from where
  you were), and a foot stepping back past the other bows round it instead of brushing through it.
- Split jump: jumping out of it is back (Michael, 2026-10-08). Braced, Jump (or Y) jumps up to a lip, pipe or ladder
  over the split ahead of you; drop, a drop attack and the pistol stay as before.

- Docs: level design standard (`docs/level-design.md`), map spec template (`docs/templates/map-spec.md`) and the
  Kestrel Exchange spec (`docs/archive/maps/prompts/exchange-map.md`).

## 3.1.9 - Epic's half-fog, the phone's display rate, no locks, lighter phone passes
- Desktop Epic sometimes drew the bottom half of the screen as flat fog: ray-traced reflections and depth of field
  share one depth pass, and depth of field paused it whenever nothing was in focus - the reflections (and the fog
  where they composite) then read a stale depth. Depth of field only pauses that pass when nothing else reads it.
- The phone read its 120 Hz screen as 16 / 24 / 48 Hz in heavy matches (the detector took the median frame time, and a
  GPU-bound frame lasts whole refresh periods), so the frame governor saw every slow frame as on time and never
  stepped down. The detector now reads the fast end of the frames, and in a match it can only raise the rate (a real
  cap - low-power mode, a browser at 60 - shows on the menu).
- Phones toward 120 fps: ambient occlusion (the costliest pass measured: Medium 54 -> 74 fps without it; the voxels
  darken corners themselves), screen-space reflections, depth of field, motion blur, lens effects and Panini are off
  on phones whatever the preset; bloom is cheaper. Lighting, shadows, bounce light and light shafts stay. Settings
  hides those rows on phones; motion blur is gone everywhere (no preset used it).
- The phone target is now 60 fps at Ultra, native resolution: no resolution lock - phones choose the output in
  Settings > Graphics > Output resolution: Native (the default; 2868 x 1320 on the iPhone 17 Pro Max), 2x (1912 x
  880, as before) or 1.5x. Ultra on a phone renders native (no upscaling); a phone's Target frame rate starts at 60
  (once; "Display refresh" is still there) so the frame governor holds 60.
- No PvP locks: the shared PvP graphics look, the 90 deg / 16:9 field of view cap and Panini-off in PvP are gone;
  everyone plays on their own settings.

## 3.1.8 - Epic shadows fixed, a Resolution list, no hidden resolution drops
- Desktop "all fog but the lamps" was Epic shadows: 8 soft lamp shadows took the level's and characters' shaders past
  the 16 textures a shader may use on the laptop (Chrome on D3D11; headless software GL allows 32, so tests passed);
  those shaders failed and the level drew black under the fog. Every preset now stays within 16: lamp / flashlight
  shadows are PCF (one texture each) and at most 4 (`MAX_SHADOW_CASTERS`); Epic keeps 2048 maps and the moon's 4
  high-quality cascades. The desktop e2e checks every material shader at Epic against 16.
- The blurry desktop: with Adaptive detail off, the old dynamic resolution (still on in older settings) lowered the
  render resolution whenever a frame missed 120 Hz. Retired: only Adaptive detail may change it in a match.
- Settings > Graphics > Resolution (desktop): a list of real render resolutions from the native output (50% .. 200%);
  a pick applies at once and asks "Keep this resolution?" - no answer within 15 s (or Revert / Back) puts the last one
  back. Phones keep the Resolution scale slider.

## 3.1.7 - Every match stayed in memory
- The phone crash reports (High / Ultra benchmarks a minute in, and a crash 14 minutes into a session): every match
  stayed in memory after it ended - about 80 MB each at Low, far more at Ultra. Babylon's engine-wide shader cache keyed
  each match's material shaders by a plugin id that counts up, so none was ever reused, and each held its material,
  its scene and the whole match. The cache is emptied whenever a scene is freed (before the next one loads), and going
  back to the menu frees the match first too. Headless: back at the menu the heap returns to ~50 MB after every match
  (it climbed 80 MB per match before).
- Feedback notes carry every setting: `settings` (every graphics / display setting, the preset's features included)
  and `changed` (everything else that differs from the defaults; a moved touch layout or rebound keys as "custom").
  Benchmark and crash notes carry the same full context. Settings > Feedback > Copy as text now puts each note's
  context on the line under it (device, display, GPU, frames, settings), so a pasted report says what it ran on.
- Desktop Ultra (all grey but the lamps in every benchmark run) is not yet reproduced: see TESTING.md.

## 3.1.6 - Forced landscape
- iPhone browsers cannot lock the orientation (the manifest's `landscape` and `screen.orientation.lock` only work on
  Android), so with rotation locked the game sat on a "rotate your device" screen. Now a touch device held upright
  gets the whole page turned 90 degrees: hold the phone turned left (the Dynamic Island on the left). Menus, HUD,
  sticks and buttons work as in landscape; the safe areas follow the turn. The rotate screen is gone. Turning the
  phone to landscape with rotation unlocked still uses the browser's own landscape.

## 3.1.5 - Benchmark crash safety, crash reports
- iPhone Feature costs on 3.1.4 (Medium, 1912 x 880, every run in its own match - the first valid per-feature
  numbers): your settings 52 fps (1% low 20); without ambient occlusion 70 (1% low 42); textures Low 56 (1% low 40);
  shadows Low 55; light shafts, bloom and lamps 8 within 2 fps. A post-effects rebuild mid-match is fine (49); a
  shadow rebuild mid-match drops it to 15 fps (main thread 29 ms) - the slowdown comes from rebuilding the shadows, not
  the post effects (still to find: headless Chromium shows nothing different after it).
- Ultra and High closed the tab during the benchmark: the next run's match was built while the last one was still in
  memory (~0.5 GB of JS heap each at High in headless Chromium). A match now frees the last one (or the menu stage)
  before it loads (`App.releaseState`), for every match start, not only the benchmark.
- Crash reports: a heartbeat every 5 s and on every stage change (menu, loading, in a match, benchmark run n/N) with
  the feedback context; hiding or closing the page marks it clean. If the page died while open, the next start saves
  a "Crash report" note (Settings > Feedback) saying what was running, and shows a toast.
- The benchmark's note is saved after every run ("Benchmark (3 of 9 runs so far) - ..."), so a crash keeps the runs
  before it; the final save replaces it.
- A run tag at the top of the screen during the benchmark and its loading screens: "Run 3/9 · without bloom · 52 fps".

## 3.1.4 - Every benchmark run in its own match
- iPhone Feature costs on 3.1.3: unchanged (Medium 53 fps with your settings, Ultra 21; the runs after the first
  still 8-20 fps), so the 3.1.3 material refresh is not the cure. Headless Chromium shows nothing different after a
  rebuild (same passes, draws, light tiles, no GL errors): what goes stale is particular to the iPhone's GPU.
- Every benchmark run (Feature costs, Every preset, Resolutions) now loads its own match with its settings set before
  the map loads - the way the first run, always the fast one, was built. A preset's Detail tier (voxel layers) now
  takes effect too; before, every preset ran on the first match's.
- Feature costs ends with two diagnosis runs at your settings: the post effects rebuilt mid-match, then (same match)
  the shadows rebuilt mid-match. Their lines say whether a rebuild alone slows the phone and whether new shadows put
  it right.

## 3.1.3 - Graphics changes in a match no longer slow every frame
- iPhone Feature costs on 3.1.2 (1912 x 880): Medium 57 fps with your settings, Ultra 22. But every run that rebuilt
  the post effects without touching shadows (ambient occlusion, light shafts, reflections, bloom, depth of field,
  post-effect resolution or textures off) dropped to 8-20 fps and stayed there; the shadow and lamp runs, which make
  every material rebuild its shaders, were back at full speed. The same happened when changing those settings from
  the pause menu.
- A post-effects rebuild in a match now has every frozen material re-read its setup for two frames (as a shadow
  change already did), then freeze again.
- Turning ambient occlusion (and screen-space reflections) off mid-match on a preset with depth of field left fog and
  TAAU reading a depth pass depth of field had paused (a stale depth: smeared upscaling, wrong fog). The camera's
  depth passes are released with the old effects and the fog's is always running.

## 3.1.2 - Feature costs benchmark
- iPhone 17 Pro Max on 3.1.1 (1912 x 880): Low 76 fps, Medium 47, High 41, Ultra 21 (3.1.0: 60 / 19 / 15 / 12) -
  better, still short of the target, and the 1% lows (8-15 fps) show hitches.
- Settings > Graphics > Benchmark > Feature costs: your settings, then one run per costly feature turned off or down
  (ambient occlusion, light shafts, reflections, bloom, depth of field, shadows, lamps, post-effect resolution,
  textures), 20 s each - the device's own GPU says what costs most.
- Every benchmark line now counts hitches (frames over 50 ms) and the shaders compiled during the run.
- The benchmark result saves itself to Settings > Feedback the moment it finishes; the report scrolls inside its
  window (it outgrew a phone screen) and Copy text puts it on the clipboard.
- Benchmark runs hold the frame governor off (it was adapting during "current settings" runs, so those measured a
  moving target).

## 3.1.1 - Phone GPU fixes from the first iPhone benchmark
- iPhone 17 Pro Max benchmark on 3.1.0 (2868 x 1320): Low 60 fps (Safari's cap), Medium 19, High 15, Ultra 12 -
  the GPU was the limit (the main thread waits on it). Fixes:
  - The fog / light-shaft pass runs ahead of TAAU at the scene's resolution (it marched 6-8 lamps x 16 steps for
    every native pixel); TAAU's jitter is now set as the camera starts rendering, so a pass ahead of it is resolved
    with everything else. 8 steps per lamp below Epic.
  - SSAO / SSR's geometry buffer renders at the scene's resolution with TAAU, not the native canvas.
  - Phones render at most 2 device pixels per CSS pixel (the iPhone's 3x: 2.25x fewer pixels for every
    full-resolution pass; no visible difference on a ~460 ppi screen). PCs stay native.
- Changing Shadows (or a preset) in the middle of a match no longer leaves frozen materials on the old shadow setup
  (WebGL "unbound uniform buffer" warnings every frame, undefined rendering on some GPUs).

## 3.1.0 - One graphics ladder for PC and phones, Auto graphics, adaptive detail, fair crossplay
- Graphics > Preset: Auto (the default; 3.0 installs still on Epic move to it). The game picks the preset for the
  device from its GPU's name, or - when the browser hides it, as every iPhone does - measures the device for a few
  seconds on the main menu (once per device; "Detect again" measures anew). Settings say what was found.
- Adaptive detail (on by default; replaces Dynamic resolution): in a match the game steps detail down when frames are
  missed and back up when there is room - render resolution first, then shadow refresh, light shafts, distant voxel
  detail, effects, lights, character detail. It never changes fog, cover, sight lines or anything gameplay reads.
  A hot device that keeps slowing is noted (debug overlay, feedback notes); iOS Low Power Mode (30 fps) is shown once.
- Frame-rate cap is now Target frame rate (Display refresh, 30, 60, 90, 120, ...): the detail adapts to it.
- PvP: lamp count, lamp and moon shadows, bounce light, contact shadows (off), light shafts (off) and effects density
  are the same for everyone, whatever the preset - how dark or hidden a player looks never depends on the device.
- `perf.mjs --preset=<p> [--mobile]`: a preset's CPU side against the phone budgets (`PASSES=1`: draws per pass).
- Phone tuning (draw calls on the phone platform, 10 guards, Warehouse): Ultra 531 -> 233, Low 227 -> 103. Below
  Epic the level casts its shadows from a plain blockout stand-in (one or two draws per shadow map instead of dozens
  of voxel chunks; shadows within half a voxel of before); the moon's cascades skip characters under the roof (it
  cannot reach them) and small props; fog and TAAU read the G-buffer's depth when SSAO / SSR draw one (no second
  depth pass; depth of field's own depth pass runs only while aiming); guards are one voxel mesh (the head split
  stays for the player's camera fade); Low's moon shades only the level (characters get contact shadows).
- Graphics presets are one ladder for every device: Low, Medium, High, Ultra, Epic (PC only) and Custom. Each preset
  also sets its render scale (Low 67%, Medium 75%, High 85%, Ultra 90% with the TAAU upscaler; Epic native). Phones
  never get Epic or ray-traced reflections (Epic shows as Ultra there). Settings from 3.0 keep their preset (with the
  new values) or their Custom choices.
- New graphics options: Volumetric lights (how many lamps scatter light in the air, 2-12) and Post effects
  resolution (ambient occlusion and screen-space reflections at half or full resolution). Low and Medium keep props
  in the 5 cm voxels (no 2.5 cm prop layer); Low has a lighter shadow set (sun only), Medium two lamp shadows.
- Fog is drawn on every preset (Volumetric light now only adds the light shafts): what a player can see at a
  distance does not depend on graphics settings.
- Far-away voxels never turn see-through: thin walls and panels (doors, partitions, signs) used to drop out of the
  coarsest level of detail now and then; every filled piece is at least one voxel thick there.
- PvP (Team Deathmatch, Free-for-all) is fair between PC and phones: the field of view is capped at 90 and held at
  its 16:9 width on wider screens (ultrawide and phones see no more of the sides), Panini is off. The lobby says so.
- The benchmark's "every preset" runs Low to Epic (Low to Ultra on phones).

## 3.0.0 - PC renderer, Warehouse focus, desktop interface, playtest feedback
- Focus: the Warehouse is the one playable map and runs every mode - Hunter, Wave, Mission, Infiltration (four
  missions: Cold Storage, Ledger, Courier, Blackout - every objective type), Free Roam (new: the whole map, no
  guards, every weapon), co-op and PvP. Proving Grounds stays as a plain range for Free Roam and Training. Embassy,
  Mansion, Port, Refinery and Dust Depot are parked (not offered; kept as they were in 2.3.0 to come back later);
  their mission records and challenges stay in the save.
- Voxels: the Warehouse and Proving Grounds are built from voxels - 5 cm at Epic near the camera, 10 / 20 cm further
  out (levels of detail by distance, nearer on High / Ultra) - with a per-voxel colour and roughness variation,
  ambient occlusion and worn edges between voxels and the procedural surface textures inside each face. Built on all
  but four of the CPU's threads at load and cached on the device (the second load is quick). Gameplay is untouched:
  collision, cover, ledges and the guards' navigation are the same as before.
- Warehouse in voxels: concrete block walls with mortar lines, corrugated cladding over a concrete plinth with rust
  streaks, cast concrete with chipped edges, saw-cut floor slabs with oil stains and yard puddles, painted steel with
  worn edges and seams, plank crates, shrink-wrapped loads in the racking bays, hazard stripes, grime up the wall
  bases, conduit and junction boxes, electrical boxes, vents and signs. Props, furniture, machines and vehicles at
  2.5 cm. Inside under the roof is dark but for the lamps and what falls through the skylights and doorways (the map's
  open sky is baked at load); cover, ledges and floors stay exactly where they were.
- Weather on the Warehouse (Play screen and co-op lobby): Clear, Rain (no rain indoors - it falls through the
  skylights; the yard and the open floor go wet and glossy, puddles turn to mirrors) or Fog (thick, with moonlit
  shafts under the skylights and through the doors). Visual only.
- Voxel characters: the operator, every guard, co-op players and the menu operator are built from 2 cm voxels (4 cm
  further away) - suit, carrier, pouches, pads and the tri-lens goggles - with a tone per voxel and fine seams up close,
  animated as before (ragdolls included); the lens glow, hit flash and the camera's head fade work on them. The stick
  avatar style stays as it was.
- Voxel weapons and gadgets: every gun (in the hands, on the back, the hip and the thigh, in the Loadout preview) is
  built from 1 cm voxels with 5 mm sights, pins and triggers; thrown grenades and the drone are voxels too.
- Global illumination (Epic; Graphics > Global illumination): the lamps' light bounces off floors and walls into the
  rooms around them, per circuit - switch a room's lights off, shoot a lamp out or set off an EMP and its bounce light
  goes with it.
- Ray-traced reflections (Settings > Graphics > Reflections: Off / Screen space / Ray traced): wet floors, puddles
  and steel reflect the voxel world off screen too - walls, racks, lamps, the sky through the skylights - and the
  characters; half rate (a checkerboard, default) or full.
- TAAU upscaling (Settings > Graphics > Display > Upscaler): with a resolution scale under 100% the game renders
  smaller and rebuilds a sharp full-resolution image over frames (e.g. 7680 x 2160 from 67%).
- Panini projection (Display): keeps very wide fields of view from stretching at the sides (ultrawide screens).
- Bullet chips: shots knock a voxel-sized pock out of walls, floors and props with a spray of debris in the struck
  material's colour (cosmetic - cover and collision never change).
 21:9 and 32:9 (up to 7680 x 2160) - the view widens with the screen up to a widest field of
  view (default 120 deg, then the sides stop growing), menus stay a centred 16:9 layout, the HUD keeps to a centred
  16:9 on 32:9 (HUD width: auto / 16:9 / 21:9 / full); the frame-rate cap names the display's refresh (up to 240
  Hz); photos are saved at full output resolution.
- Laptops: the game asks for the high-performance GPU and tells you once if the browser is on the integrated one
  (and how to switch); Settings > Graphics shows the GPU in use.
- Benchmark (Settings > Graphics): a camera flight through the Warehouse - the current settings, every preset, the
  render pixel counts of 2560 x 1600, 4K and 7680 x 2160, or a 10-minute sustained run (first vs last minute, for a
  laptop that slows once hot); average and 1% low per run, saved as a feedback note.
- One renderer for every device, built for a gaming PC (phones run the same, slower): Graphics presets High /
  Ultra / Epic (default) with every feature adjustable (Custom): up to 48 real lights (clustered), lamps and every
  guard flashlight casting shadows (soft on Epic), cascaded sun / moon shadows, ambient occlusion, screen-space
  reflections, volumetric light and height fog, bloom, depth of field (aiming, the menu operator), motion blur,
  lens effects, TAA / MSAA / FXAA, HDR tone mapping; native resolution with a 50-200% scale, optional dynamic
  resolution, a frame-rate cap (30-240), FOV to 120. The menu stage gets shadows, bloom and depth of field.
- Materials: every level piece, character, weapon and prop is PBR with procedural surfaces drawn on the GPU at load
  (sixteen tileable kinds - concrete, floors, asphalt, gravel, grass, plaster, wood planks, corrugated paint,
  brushed steel, rust, tiles, carpet, brick, checker plate, rubber, fabric - with albedo detail, roughness, normals
  and cavity), picked per piece by what it is (floors by what is underfoot, the rest by colour); image-based light
  from a probe of each map.
- Detail: a dressing pass on every map (Detail Ultra / Epic, visual only - nav, cover and ledges are unchanged):
  skirting, conduit with junction boxes and switches, electrical boxes, vents, signs, floor stains, puddles and
  debris; draw and animation distances x2-4; spent brass that stays on the floor, longer-lasting bullet holes.
- Weather (engine): falling rain streaks with wet glossy floors that the reflections pick up, blown dust, heat
  haze (the Warehouse gets its weather choice with the voxel art pass).
- Desktop interface (detected, or Settings > Graphics > Interface): menus scale to the window, no touch settings or
  touch controls (a touchscreen laptop gets them back when touched), hover states, fullscreen on demand.
- Mouse & Keyboard settings: sensitivity, aim sensitivity, invert, raw input, and every key rebindable (two per
  action, extra mouse buttons too); prompts and the controls list follow the bindings.
- Playtest feedback: Settings > Feedback and Pause > Report feedback write a note (type, text, the map / mode /
  position / graphics it was written in) with photos from photo mode - the game freezes, the HUD hides, a free
  camera flies to the problem; take, retake or keep, as many photos as needed. Notes stay on the device; Export
  report makes one HTML file with every note and photo (share sheet on phones), or copy them as text.

## Older versions
- 2.3.0 and earlier: [docs/archive/CHANGELOG-pre-3.0.md](docs/archive/CHANGELOG-pre-3.0.md)
