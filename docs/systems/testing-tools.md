# Commands, e2e suites, test helpers and the debug overlay
Purpose: every npm command, the headless e2e suites with what each checks, the helper scripts and the in-game debug overlay.
Design authority: docs/DECISIONS.md (G13 tests run as a desktop, G51, G94), then docs/design-bible.md (Section 9).

## Commands
The core commands (dev, build, typecheck, test, lint, check, e2e and its variants): `docs/RULES.md` "Commands". Also:
- `npm run dev` serves with `vite --host` (also reachable on the LAN); `npm run editor` opens `editor.html` on port 5199
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run sfx:fetch` / `sfx:render` (movement foley), `sfx:fetch-weapons` / `sfx:render-weapons` (weapon sounds),
  `music:fetch` / `music:orch` (the score): download the CC0 sources (SHA-256 checked) into git-ignored caches and
  render the committed sprites / tracks (Windows: Media Foundation MP3). Only a change of takes needs them (audio.md).
- `npm run e2e` - the REQUIRED suites (below); `npm run e2e:quick` - `smoke` + the suites covering the changed folders;
  `npm run e2e:serial` - one at a time with live output; `npm run e2e:legacy` - the parked-content suites;
  `npm run e2e:audio` - the audio suites; `npm run e2e:gpu` - the visual read-backs (Michael's PC, `E2E_GPU=1` only);
  `npm run e2e:editor` - the level editor suite (not required).

## Test tiers
Which change runs what, where, and on which machine: `docs/RULES.md` "Test tiers" and "Machines" (the only owner).
This page lists the suites and how they are picked.

## Stale literals in asserts
- Asserts that copy a tuning value go stale when the table changes (the holster budget read 400 ms against
  `HOLSTER_TIME` 0.55). Read the number from the game's own table (through `window.__app`) instead of a literal when a
  suite is next touched. Known literals: e2e-netmove's walk-off (1.55 m in 6 s, crouched), e2e-ctcourse's 12 s leg-up
  wait, e2e-traverse's pipe 0.85 / shimmy 1.2 / crawl 0.9 m/s and its drainpipe settle frames, e2e-ct's legs-up 0.5,
  rappel 1.6 / 1.0, fence 0.9 / 0.6 m/s, e2e-move's top speed 4.2, e2e-wall's shuffle 0.27 / 0.35, e2e-anim's 0.08 s
  and 720 deg/s, e2e-foley's >= 4 plants, and every wall-clock wait in the two-page suites (the co-op fix job).

## The runner (`scripts/run-e2e.mjs`)
- Serves `dist/` once (`vite preview`; needs a prior `npm run build`) and runs the suites in a pool, each suite its own
  process and browser, the slowest first (`scripts/e2e-times.json`, rewritten by every clean full run). Each suite's
  output prints as one block and is kept in `test-results/e2e/`. `e2e-desktop` runs as jobs `e2e-desktop:1`, `:2`, `:4`
  (`--part=N`; its sections are independent); part 3 (the Epic renderer) is in the GPU list. `e2e-ctcourse` runs as
  `e2e-ctcourse:1` to `:4` (marlow-final: A1-A2, A3-A4, A5-A6, A7-A8), each its own pair of pages started at its first
  set through the host session's `courseBay`; named alone (`node scripts/run-e2e.mjs e2e-ctcourse`) it runs all eight
  sets in sequence (test-speed A3). `scripts/e2e-times.json` holds 150 s per part as an estimate until a clean full run
  rewrites it (pending laptop run). `e2e-sectorops` runs as `e2e-sectorops:1` to `:5` (sector-fixes-r RE: the suite before slice R, the
  solo route checks, the co-op routes of sections 1-3); named alone it runs all five in sequence.
- Pool size: default min(5, cores / 3) (`--jobs=N` / `E2E_JOBS`). The laptop queue sets it per run (the numbers:
  `docs/RULES.md` "Machines"); cloud VMs use `E2E_JOBS=2`.
- A suite past `E2E_SUITE_TIMEOUT` (default 600 s) is killed and fails. The laptop queue runs with
  `E2E_SUITE_TIMEOUT=900` (e2e-desktop takes about 553 s and e2e-mouse about 405 s solo).
- `--quick` (`--since=<ref>`, default: the working tree plus unpushed commits): `smoke` + the suites mapped to the
  changed folders (`QUICK_COVERS` in `scripts/e2e-affected.mjs`, master's map unchanged, first match wins: the studio files (`src/anim/studio*`, `tuneHistory`,
  `src/game/studioStage`, `src/world/maps/studio.ts`, `src/save/animTuneStore`, `src/ui/studio*`, `tuneSnapshots`,
  `overlayProject`, `animTune*`, `tuner*` (tunerLayout, tunerMouse, tunerTarget, tunerPhone): `e2e-studio` plus their folder's suites; `tuner*`, `animTune*`, `studioStage` and `src/player/freeView` also `e2e-tuner-phone`), `src/core/quality`, `display`, `settings`
  and `flags` by file, the section rating files (`src/ui/hud/ratingCard`, `src/game/rating/`, `src/save/ratingRecord`; `courseMode`
  and `sectorMode` also pick `e2e-section-rating`), the Marlow Yard sets (`src/world/maps/ctcourseSets/`, `ctcourseGreybox.ts`:
  `e2e-ctcourse`), then the folders); a set step module `scripts/e2e-ctcourse/<set>.mjs` reruns `e2e-ctcourse` (`SUITE_DIRS`);
  an unmapped `src/` path, `e2e-lib`, the runner or `package.json` runs `CORE` = e2e-move,
  e2e-combat, e2e-anim. A picked suite outside REQUIRED (a legacy or audio suite, `anim-audit`) runs REPORT ONLY; GPU
  suites never run there. `--list` prints what would run. Target: about 10 minutes for a single-folder change.
- The folder -> suites maps live in `scripts/e2e-affected.mjs` (pure, tested by `tests/e2eAffected.test.ts`): `QUICK_COVERS`
  (`--quick`, master's map and rules unchanged; the test holds a frozen copy and checks it row by row), `DIRECT_COVERS`
  (`--affected`) and `WIDE_COVERS` (`--affected --wide`). Edit them there and keep their rule comments true. A name with a
  part (`e2e-sectorops:1`) is one job; a whole suite absorbs its parts. `scripts/auto-train.mjs` reads them too (auto-drop:
  `suiteSetFor` over `DIRECT_COVERS` picks the failed train's culprit, `coverFolders` over `QUICK_COVERS` is its fallback).
- The lists (process audit, 2026-10-19): REQUIRED = the co-op training level (Marlow Yard) and the systems it stands
  on. LEGACY (`--legacy`): `e2e-progression`, `e2e-cosmetics`, `e2e-clear`, `e2e-bunker` (these four get `LEGACY=1`, so
  `e2e-lib` adds `legacy=1`), `e2e-missions`, `e2e-modes`, `e2e-enemies`, `e2e-ct-warehouse`, `e2e-wall:flanker`,
  `e2e-kestrel`, `e2e-camera-bounds`, `e2e-security`. AUDIO (`--audio`): `e2e-music`, `e2e-score`, `e2e-foley`,
  `e2e-weapon-audio`. GPU (`--gpu`, refuses without `E2E_GPU=1`): `e2e-darkness`, `e2e-desktop:3`, `e2e-coop-gpu`. REPORT: `anim-audit`
  (never fails a run; quick picks it for `src/anim`, `src/player`, `src/net`).
- Flaky and quarantined suites: "Flakes and quarantine" below.
- The two-page suites (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-course) wait on the pages' own sim clocks
  (`e2e-net-lib.mjs` `until` / `waitSim`, `setSimPages`): on software GL the sim runs at a fraction of real time
  (at most 4 fixed steps per rendered frame), so a wall-clock timeout expired mid-move. A wall cap (10 x the timeout,
  at least 60 s; `E2E_SIM_CAP`) is the hang guard, and a timeout names each page's sim seconds, sim rate and fps.
  e2e-netmove and e2e-ctcourse open at 960 x 480; e2e-coop and e2e-course keep 1280 x 640 (they click through the
  lobby, which lays out at 1280 x 720 at least). Match loads (map build, light bake, both pages joining) run outside
  the sim clock: they wait up to `LOAD_MS` (`e2e-net-lib`, 120 s wall, `E2E_LOAD_MS`). Timed in-page input chains use
  `window.__afterSim(sec, fn)` (`e2e-lib`): `fn` runs once the match clock has moved `sec` on, never an in-page
  `setTimeout`.
- Load safety (test-speed, 2026-10-20): every suite's browser launches without background throttling (a two-page
  suite's second page is a background tab), page navigations wait up to 120 s, and `press` / `stick` hold for exactly
  one input poll (a page without the app's input falls back to a 3-frame hold), so a slow frame can neither drop nor
  double a press. Read fades, toasts and screens with a condition wait (a cap of a few seconds), never a fixed pause.
- Suites named on the command line run alone (`node scripts/run-e2e.mjs e2e-missions`); a part by name
  (`e2e-wall:flanker`, `e2e-desktop:3`).
- `E2E_PROFILE=1` makes each suite print where its time went (launch, boot, match build, frames, fixed waits,
  `stepHeadless`, screenshots).

## Choosing suites for a change
- `node scripts/run-e2e.mjs --affected <base-ref> [--wide]` (e.g. `origin/master`): the suites a PR must pass (the laptop is the
  bottleneck, so the default is the DIRECT tier; `--wide` adds the cross-area readers). Changed files =
  `git diff --name-only <merge-base of base and HEAD> HEAD` (committed work only, so it works on a detached commit on the
  laptop; `--quick` reads the working tree). Add `--list` to print the chosen suites one per line and exit without running
  (what the laptop queue service and leads use to know what a PR must pass). Without `--list` it runs them like `--quick`:
  `smoke` first, suites outside REQUIRED REPORT ONLY, GPU suites never.
- DIRECT rules (default): `src/player` -> move, anim, stealth, clip; `src/anim` -> anim, clip, move; `src/game` -> gadgets,
  tactics, takedown, park, plus `e2e-sectorops` for `src/game/sectors` and `src/game/modes`, the course suites (`e2e-course`,
  `e2e-ctcourse`) for `src/game/course` and `courseMode`; `src/world` -> levels, anchors (a map file with its own suite: that suite);
  the lamp files (`src/world/light*`, `lamp*`, `bakedLamps`, `ambientGrid`, `darkCurve`) and `src/voxel` -> lightbake, desktop;
  `src/config`, `src/core` -> CORE (`e2e-move`, `e2e-combat`, `e2e-anim`); `src/weapons` -> combat, weapons-carry, stealth-ai,
  `e2e-sectorops:1` (`weapons.lastShotNoise` drives guard hearing; train 30); `src/ai` -> stealth-ai, guard-carry,
  `e2e-sectorops:1`; `src/net`, `src/save` (the shape; the tuner store picks the studio) and `src/security/data` -> the co-op group
  (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`); the studio and tuner files -> `e2e-studio` (and `e2e-tuner-phone` / `e2e-menus`);
  the section rating files (`src/ui/hud/ratingCard`, `src/game/rating/`, `src/save/ratingRecord`: a kv key, not the save shape)
  -> `e2e-section-rating`, which `courseMode` and `sectorMode` also pick; the Marlow Yard sets (`src/world/maps/ctcourseSets/`,
  `ctcourseGreybox.ts`) -> `e2e-ctcourse`; `src/player/smoothBody*` and `bodyEffectRecovery` also `e2e-guard-carry`.
  Every LEGACY and GPU suite is reachable from the area that owns it (REPORT ONLY / dropped outside `--gpu` by the runner):
  `src/progression` -> progression, `src/cosmetics` -> cosmetics, `clearMode` -> clear, `missionMode` -> modes,
  `infiltrationMode` and `src/game/missions.ts` -> missions, `src/ai/archetypes` / `enemyDefs` -> enemies, the Fallow files
  (`src/world/maps/bunker*`) -> bunker, `src/world/maps/warehouse.ts` / `warehouseDress` -> ct-warehouse, the camera files
  (`shoulderCamera`, `cameraBounds`, `src/config/camera`) -> camera-bounds, the lamp files -> darkness, `src/net/remoteAvatar` /
  `remotePlayer` -> coop-gpu. The other folders (input, ui, physics, cover, vfx, security, audio, ...) keep their quick row.
  Outside `src/`: only `docs/**`, `*.md`, `changes/**`, `tests/**` -> no suites; a `scripts/e2e-<x>.mjs` -> that suite (a helper
  -> what it serves; a set step module `scripts/e2e-ctcourse/<set>.mjs` -> `e2e-ctcourse`, `SUITE_DIRS`); `e2e-lib`, the runner,
  `package.json` / lock, `index.html`, `vite.config`, `public/` and an unknown `src/` path -> smoke + CORE.
  Example: optic-cable 13 jobs direct, 30 wide (e2e-ctcourse is 4 parts); guard-ai-carry-fix 7 direct, 15 wide.
- WIDE rules (`--wide`): DIRECT plus the cross-area readers: `src/weapons` also enemies, gadgets, clip; `src/ai` also levels,
  tactics, takedown, weapons-carry, coop, `e2e-sectorops:6`; `src/player` / `src/anim` the quick rows plus takedown; `src/game`
  also ctcourse and sectorops; `src/world` also lightbake, guard-carry, ctcourse; the lamp files and `src/voxel` the light readers
  (desktop, stealth-ai, security, darkness); `src/net` / `src/save` the quick rows plus the co-op group; `src/game/rating` also
  sectorops and course, `src/save/ratingRecord` also sectorops and menus (the missions screen reads it); the Marlow Yard map and
  set files also `e2e-section-rating` (it rates A2-A8).
- Selection is pure (`selectSuites(files, map)`, map = `DIRECT_COVERS` by default: paths in, sorted unique suite list out); the runner orders it (REQUIRED first) and
  drops GPU suites and suites without a script.

## Ports
Which port is for what, and freeing one: `docs/RULES.md` "Ports" (G94). Script defaults when no port or url is given:
4173 (`e2e-lib`, `anim-audit`, `perf.mjs`) and 4179 (`run-e2e.mjs`, `E2E_PORT`; `scripts/kestrel/render-top.mjs`).
`E2E_HOST` overrides the host; on Windows the runner binds 127.0.0.1 (`localhost` can resolve to a blocked `::1`
behind a VPN adapter).

## How the suites run
- Desktop browser context (G13): `e2e-lib` `launch()` opens a plain 1280 x 640 context (no touch, no mobile user agent;
  the e2e-mouse and e2e-score centre coordinates assume it), `smoke.mjs` likewise. Pages get `?gfx=min` (every
  graphics feature off, DPR 1; not saved) unless the params name a `gfx=` (a preset, or `user` for the saved settings):
  the Epic renderer on software GL takes seconds per frame. The preinstalled Chromium with SwiftShader GL: FPS there is
  not representative.
- Speed: a wait for N simulated seconds is `stepHeadless` (`window.__app.loop.stepHeadless(seconds)`, no rendering), or
  `window.__ff()` right after a suite wraps `state.fixedUpdate`; fixed pauses after a match starts are
  `frames(page, n)`. Real time is kept where the suite is about it: the two-page co-op suites, `e2e-stealth` (real-time
  camera), `e2e-mouse`, `e2e-pad` (input timing), `e2e-desktop` (benchmark flights, the 15 s resolution revert, shader
  compiles), `e2e-offline`, and the rAF-sampled foot-slide check in `e2e-move`. The light bake is about 0.5 s a page
  load so it is not shared between browsers.
- Two-page suites (`?net=local`): the `until()` helper in `e2e-net-lib`, `e2e-coop`, `e2e-course` and `e2e-bunker`
  polls from Node (`page.evaluate` every 50-100 ms): in a desktop context the in-page polling stops on the background
  page. A throwing predicate shows as a timeout.
- Boot waits: with `autostart` in `params`, `launch` / `openPage` wait (120 s cap) for the match; a page that hosts a
  `?net=local` course / sector room alone returns as soon as it is in the lobby (its match starts when the next page joins).
- Checks marked "(CT prototype)" below test behaviour the CT prototype replaces (sprint, gear 6, the lean-out, the SWAT
  turn, the crack peek, the planted pivot, 720 deg/s turns); the prototype job rewrites them.

## The suites (REQUIRED unless marked)
- `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot); (anim-tuner) opens F3 > Anim, moves
  the walk "foot width" slider through the page and checks the table value and its change-log entry (then puts it back)
- `e2e-pad` controller-only navigation through every menu with a fake Gamepad API pad; in a match D-pad up / down
  change no speed (anim-rework S1), the weapon states (X tap low ready / holster, LT held aims, A3 no fire at low ready,
  X held reloads, the sling draw from LT), D-pad left tap vs hold (wheel), View tap goggles / View held leaves the goggles untouched; the analogue speed (stick 50 / 80 / 100 %), the internal cap, rumble;
  the pad verb table (every default button raises its action); remap capture (B held until the capture ends); a pad
  disconnect falls back to keyboard and mouse; the Difficulty row by d-pad (fixed levels). (Process audit: the palm
  strike, wall, door menu and edge verb sections went to their system suites.)
- `e2e-mouse` mouse capture: a click captures (never fires), look, RMB held aims and LMB fires, let go low ready (no
  fire), X holsters, the wheel and = / - change no speed, W / Shift + W / Alt + W walk / run / creep, T swaps, Esc pauses,
  Resume re-captures; the keyboard verb table; N toggles vision; Controls remap. (Process audit: the palm strike, wall
  medkit, wall, difficulty, edge verb, door menu and loadout sections went to their system suites.)
- `e2e-move` (`gear=none`: no cap) every named speed at its stick point both stances, half stick, the cap kept through stances, zero
  velocity on the release step, planted feet < 2 cm on a stop, the stop holds its stride (aiming lets go; crouched: no
  kneel), forward roll (0.7 s, ~3 m, crouched, 2 m noise), aim strafe / backstep, sprint toggle and aim ends a sprint
  (CT prototype), no free jump, kneel, contextual vault / climb / step / drop / hop, steps / slopes / stairs / tunnel /
  props on Proving Grounds
- `e2e-traverse` Proving Grounds course (north east): ladder bottom / top entry, climb rate, slide, step off; drainpipe;
  ledge grab, shimmy, jump across, outside corner, climb up, hold-B lower in, drop; horizontal pipe; landing bands (soft
  / roll / heavy + noise + recovery); grab while falling; zipline; open / glazed windows; duct unscrew, crawl, vent drop
  + roll, kick; keyboard E, crouch lets go, vent hold by key; planted hands / feet locked (< 1 cm), arms reach grips
- `e2e-anchors` every placed anchor on Proving (ladders, drainpipes, pipes, ziplines, ducts, windows both sides) is
  offered from its approach and engages; hangable lips (`--only=warehouse` / `--only=bunker` run a parked map by hand)
- `e2e-stealth` real-time camera repro (free orbit: 360 deg looks standing, crouched, moving, aiming, after a traversal,
  no residual offsets, level horizon after a shake)
- `e2e-weapons-carry` Free Roam loadout (the two CT kit guns, plus a `pistolSd,rifle` loadout): back guns within 10 deg
  of the spine in six gaits, no clipping (both avatar styles, with a backpack), hands within 2 cm of the grips, swap
  reach and timing
- `e2e-anim` quality bars in the running game: first-frame response, 95% speed within 0.08 s, a stop on the release
  step, the stride held, no planted pivot, 720 deg/s turns (CT prototype), lean into turns, stance and aim raise / lower
  times, weapon clip timings, foot locking (< 1 cm) in seven gaits, pose continuity, flinch, camera lag / blends / bob /
  drift / sprint FOV (CT prototype) / stick-look bounds, 60 / 120 / 144 / 165 / 240 Hz parity
  (anim-metrics) plus the anti-crab metrics per gait (knee separation, planted track, knee over ankle, slide, elbow
  wing; report-only until `CRAB_GATES` turns a gait on; `CRAB_JSON=1` prints them as JSON; `CRAB_STATES=1` adds the walk sub-states at speeds 1-3;
  `docs/anim-rework/METRICS.md`). The same metrics show live in the debug overlay (F3)
- `e2e-lightbake` the Warehouse under `?gfx=min`, `?gfx=low` and `?gfx=epic` bakes the same canonical shapes and the
  same lamp / moon / ambient bytes (cache keys and a content hash from `World.lightInfo()`); Epic draws the bake
- `e2e-darkness` (GPU list) display brightness targets (bible L5): on the Warehouse a matte 50% grey card (`World.addLightProbe`)
  at field levels ~0.12 / 0.27 / 0.40 / 0.70, the camera 0.8 m in front, the HUD hidden; the screenshot centre as Rec.
  709 luma at Epic, night vision off and on (`REPORT=1` prints without asserting); turning with night vision on reads
  as moving every frame; night vision's bloom runs every frame; (LR16-6) thermal: the button cuts on the first frame
  both ways, a guard placed 1.2 m behind a shut hinged door shows one silhouette that reads dim blue at his chest as
  projected on screen against the same pixels with him gone, none with the door open
- `e2e-coop-gpu` (GPU list, port 4189) the real menu flow, two players (shared and separate contexts at High, shared at Epic; `COOPGPU_ALL=1` adds separate at Epic): fails on a "failed to load" console message, no host avatar or LOD on the joiner, the host not drawn (body mesh enabled, visible, active, bounds over 0.5 m), or "Connecting to host" still shown; `scripts/repro-coop-avatar.mjs` is the diagnostic version
- `e2e-combat` weapons (rifle, `pistolSd` magazine 15), hits, headshots, reload, swap, grenades, barrels, death /
  respawn
- `e2e-modes` (LEGACY) mission flow, ragdolls on Mission, enemy types on `proving&mode=mission`, Infiltration
- `e2e-clip` traversal: no body point > 3 cm into the world while climbing, hanging, shimmying, crawling, dropping
  through a vent, vaulting a window, on a zipline or rolling; the weapon clipping sweep along a wall (both sides), crouch
  run, aim every weapon: no gun point inside the world (> 2 cm), gun clear of head, trunk, elbows; knees and feet apart
  (`--only=name --log`)
- `e2e-tactics` doorway check, contextual lean, slicing the pie, split hit volumes, suppression, exposure HUD, enemy
  grenades / flanker (five alerted grunts on `proving&mode=mission`), footstep noise investigation, a wall muffles a noise
- `e2e-wall` back-to-wall on Proving: entry reach, slide speed caps (CT prototype), quieter than walking, the
  outside-end stop with its edge flag, pull-away and context exits; Warehouse: two guards against a player on a wall (a
  flanker after > 4 s, a grenade after > 6 s: `e2e-wall:flanker`, LEGACY). e2e-netmove adds "wall", "wall crouch" and
  "stack"; the pad and keyboard verb tables cover the button
- `e2e-stealth-ai` night Warehouse: shadow vs light detection, the arc warns first, no sight through walls, noise ->
  suspicious -> investigating, squad radio, the shout, a spotter taken out first tells nobody, LKP + ghost + converge +
  search ends, (walk 4.82) a lone guard reports then moves up on the last known position, the probable-area search ('search area': the near dark spot checked, the room behind a wall not, three
  searchers on three spots), patrols, the optic cable (the door menu pick, the view under the door at floor height, the look limits,
  night vision, the tip never seen, the kneeling body seen, crouch leaves, a sealed door refuses); (coop4 AI6) 'four
  intruders (coop4)': the local player plus up to 3 test-only stand-in refs (`t.fakes`): a calm guard with 4 in view
  casts <= 9 rays a think and sees all 4 in turn, 4 own slots / LKPs, the alarm's reinforcements split (the raiser's
  first), a team shares one hunt and is ticked on its own LKP, a leaver's slot kept for his rejoin, a new id takes a gone
  slot; a 2-player control (today's rules). The 3-4 browser asserts: `docs/coop4/briefs/AI6-E2E-SPEC.md`
- `e2e-guard-carry` Warehouse Infiltration (High): a calm holstered grunt and officer (S21 carry) and then drawing ones
  are drawn: body among the active meshes, material ready, GPU-skinned effect (no CPU-skinning fallback), no effect
  compile error (its error line printed). Run with `E2E_GPU=1`
- `e2e-takedown` takedown kinds (ground rules, over low cover, above, below, window; the grab - walk, sidearm, human
  shield, knock out / kill / shove - and drop attacks from a pipe / split, the inverted choke), tap / hold, 5 cm
  alignment, damage interrupt; no takedown on a guard in combat who saw you
- `e2e-gadgets` wheel (hold opens + slows time, stick picks, release selects, mouse-mode slot click; ends in pad mode),
  arc preview, gas knock-out, flashbang blind -> alert + white-out, EMP lights out and back, noisemaker lure (muffled
  behind a wall), sticky cam feed (operator still, ping, gas, back), mine
- `e2e-enemies` (LEGACY) heavy (plates, lethal-only frontal takedown), enforcer (shield, no frontal grab, pushes), sniper (laser,
  glint, relocates), dog (smell in the dark, takedown), drone operator (the enemy recon drone: spots, shot down, EMP),
  officer (buff, alarm first), radio check, callouts, Perfectionist
- `e2e-levels` multi-level AI: three storeys per column, Warehouse ladder links both ways, a runner chasing the player
  up a rack ladder and back down
- `e2e-missions` (LEGACY) Infiltration objective types to success (download pauses away + noticed pulses, intel any order,
  plant, rescue + escort, sabotage, extraction, results rating) and failure (the no-detection rule, three downs) on the
  Warehouse missions (Ledger, Courier, Blackout, Cold Storage); routes per objective; no style bars (3 with `LEGACY=1`);
  Hunter's alarm doubles the hostiles
- `e2e-sectorops` Sector Ops on `warehouseOps` with `?sectorGuards=4`: a solo walk through the three sections (the near
  door locked before the objective, hack / grab / download, the connector cycle: near door locked, guards, bodies and
  devices unloaded, the next section's guards in, the far door open, the checkpoint moved) to the extraction and the
  result line with Ghost (AI and cameras held still); an alarm (stage up, reinforcements hunting, a kill breaks the
  Ghost); a solo down in section 2 (the section restarts at C2: guards reset, objective open, alarm back); the nav check
  (every walked leg of every route has a nav path, each section's objective and exit are reachable, the next section is
  reached only through the connector). Step 3 and the fix round add: the star saved at the extraction and shown filled
  in the op list; a guard (AI on) running section 2's own alarm panel, the stage rising through the panel, and again
  after a restart; a two-page `?net=local` pair (the client mirrors the live section's devices, door locks and the
  syringes line, then section 2 after the connector). The quick map picks it for the Sector Ops files, `src/net/`,
  `src/security/`, `src/save/sectorRecord` and the op list screen. `SECTOR_SHOTS=<dir>` adds three layout shots
  (software GL). (sector-fixes-r RE) It runs as five jobs, `e2e-sectorops:1` to `:5` (`--part=N`; named alone it runs
  all five in sequence): part 1 is everything above; part 2 (solo, the loop stepped at 120 Hz) checks slice R's co-op
  routes: the game's boost search finds each planned 4.4 m lip from its spot and none at R3N's east face, one player
  alone never holds a co-op lip (under it: grab / wall jump / jump; a running jump pressed at the face and in the air;
  R2N's 4.0 top jumped at R3N), the links the routes rely on (S1 monorail up to the bay main and along it onto the
  deck, the sill climb-up and the crouch-walk under 1.4 m onto the deck, S3's climb-ups under the 1.63 m roof, the
  valve platform's west lip to the hall main and back, the drive platform's east lip to the branch and the main), every
  way down alone, and each section's team door (the near side gets no Unbolt and stays locked, the far side's Unbolt
  opens it and the partner walks through, a checkpoint restart bolts it again); parts 3, 4 and 5 are two pages (host
  and client) in sections 1, 2 and 3: each co-op route walked with the real buttons (the client's leg-up, then the
  host's relay or two-person rope; both on the 4.4 m top; S1 C1 on to the deck, S1 C2 over the checker and let go)
  and the section's team door unbolted by the client from the far side for both pages (refused from the near side) and
  re-bolted on both pages by the host's checkpoint restart.
- `e2e-section-rating` (section-rating S7 / S6) the stealth rating: solo Sector Ops (a clean section: 4 ticks; a kill:
  No kills missed; the extraction: results lines), co-op (a synced pair on both cards, the client top-up, the host syringe,
  a rejoin with no second grant) and solo Marlow Yard (A1 unrated, A2 rated with the gadget grant, A3 rated clean after a
  kill and a restart). In the required list; the quick map picks it for the rating files and both modes.
- `e2e-park` the legacy-off menus (title Night Shift, badge without level / credits, the main menu Sector Ops / Co-op / Loadout /
  Settings / Feedback, the Sector Ops briefing, Loadout root rows, every weapon selectable with nothing unlocked, the choice kept
  across a reload, a new co-op room on Campaign (Marlow Yard) with Campaign and Sector Ops listed, save export / import) and the
  legacy-on menus (Hunter default; Missions and Free roam listed)
- `e2e-coop` two pages over `?net=local`, opened with `legacy=1`: lobby, a Hunter match (puppet alert levels, door sync,
  a client door use and takedown, kept / hidden bodies, pings both ways, a client gas cloud, a client grab and (coop-walk-fixes
  P6) the host's team takedown on that hostage, a dual takedown, a client
  reviving the host, the team wipe), validated hits, revive, results; Infiltration objectives on the client; the host's
  fixed difficulty level read-only on the client and running on both; a client using the host's wall medkit station;
  host leaving, offline (known flaky)
- `e2e-netmove` two pages, Free Roam on Proving: the client on a ladder, drainpipe, pipe, ledge, duct (hands / feet /
  head within 10 cm on the host), zipline and a roll mirrored; CT moves (split, wall jump, pipe legs up / inverted,
  rappel + rope, fence); team moves (the client braces and boosts the host onto the 4.2 m lip, the human ladder, a
  request without a braced partner is denied); wall, wall crouch, stack; lean-out at a wall end (CT prototype); last,
  role-swapped (test-chores-13): the host braces and the client leads the leg-up, the host's brace on the client's copy
  and the client's hang on the host's copy within 10 cm (known flaky)
- `e2e-course` two pages, Course on courselab: the airlock refuses one player, cycles with both; a forced both-down
  restart, then every gate kind by the client (the host's gates are e2e-ctcourse's); door locks and the lamp group reach the client within 0.5 s; friendly fire
  (a host shot and a client grenade down the partner, who is revived); automatic airlocks and the locked rear door
- `e2e-ctcourse` (marlow-final) two pages on `?net=local&autostart=ctcourse&mode=course`, Marlow Yard A1-A8 as four parts
  (`--part=N`, run as the jobs `:1` A1-A2, `:2` A3-A4, `:3` A5-A6, `:4` A7-A8; a part after the first starts at its first
  set through the host session's `courseBay`). `scripts/e2e-ctcourse.mjs` owns the helper object `t` (`t.A` host page,
  `t.B` client page, `until`, `assert`, `moveHost` / `moveClient`, `use`, the team-move and jammer helpers, `t.point(id)`)
  and the part dispatch; each set's steps are a module in `scripts/e2e-ctcourse/<set>.mjs` exporting `SET` and
  `walk(t, n)`, called in route order (`a1Gate`, `a2CarriageShed`, `a3OfficeRange`, `a4GoodsShed`, `a5Substation`,
  `a6PumpHouse`, `a7DataHall`, `a8Strongroom`). Between sets both players stand on the holding room's pad: the near door
  locks, the far door unlocks on both pages. Every part checks the join (both avatars drawn, the objective line); part 1
  also the host-only pause restart at A1 (the client's rows disabled "Host only"); part 4 ends with a revive in the cash
  dock (one of two used) and the both-in exit zone (G138). Per set: A1 the claim swap, leg-up, hang-drop, bolt refused from
  the apron and opened from the yard, the relay variant after a restart, the yard switch's light on both pages; A2 the
  isolator (15 s dark on both pages, the timer line, re-arm refusal, the lure, restart), the crossing and the mirror; A3
  the send-back (also in the dark), the window miss, the relay and the swap, the office lure; A4 the lure and restart,
  the console (refused with the officer up, 60 s loop, 20 s re-arm, the loop running out), `a4-floor`, the dual takedown
  banner, the push bar and the wicket; A5 the throw, flood jam, kiosk release, the panel jam variant; A6 the leg-up and
  rescue line, the hang-down hold (the client's hold pulses the host's noise), the cage fallback pass; A7 the claim, the
  corridor in the camera's blind windows, the late-hack fail (10 HP) and the synced hack, cage and east door; A8 the leg-up,
  the cross-level jam, the console loop, the board (25 s cut, grille), the throw over the beams, the time locks, the vault
  and `a8-out`. Teleport legs are allowed on open floor (the walks are the unit tests'); a door a route opens is opened
  by `use(P, 'door-<anchor id>')` and asserted open on both pages first. The old bunker stations' steps are in git at
  5920cce5. The ghost run with every bonus and the revive on each co-op surface (A1 yard, A2 staging, A6 gallery, A8
  gallery) are not in the suite yet. Results for the head: pending laptop run.
- Marlow Yard unit tests (`npm test`, Babylon-free where they can be; each set's file is its builder's contract, run by
  the set agent): `tests/ctcourse/<set>.test.ts` per set (the part passes `checkSetPart`, register rows and counts equal
  the builder's, geometry and keep-clear, no solo way up a co-op lip (`soloJumpThreats`), the gates, steps and role claim
  in `CourseState`, lamps and groups against `MARLOW_CIRCUITS`, the tuned light levels, guards and walkers, cameras,
  nav seeds), `tests/ctcourse/facility.test.ts`, `tests/ctcourse.test.ts`, `ctcourseGreybox.test.ts`,
  `ctcourseLight.test.ts` (the whole map's light frame: pools >= 0.60, read floor >= 0.40, dark pockets <= 0.22, a cut
  circuit <= 0.24, standby 0.14, house 0.30), `facilityKit.test.ts`, `facilityProps.test.ts` (kit and prop render, the
  static merge); the engine pieces: `marlowN1Objectives`, `marlowN2Isolator` (with the Q9 occupancy rule),
  `marlowN3Console`, `marlowN4Hold` (with Q2 stealth and Q4 despawn), `marlowN6Scanners`, `marlowN9SlideDoor`,
  `marlowPassAny`, `marlowHoldNoise` (the client's hold pulse), `marlowClientSwitch`, `marlowStaleSupport` (the
  controller's stale floor after a kinematic move), `marlowLightingCircuits`, `marlowLightingLevels`,
  `marlowLightingSchedule` (`tests/marlow*.test.ts`; `marlowT1a` / `marlowT2` are the animation tuner's). A set's light
  levels are re-tuned with `CTLIGHT_WRITE=<set>|all npx vitest run tests/ctcourseLight.test.ts`, which writes
  `tests/ctcourse/<set>.light.json` (`CTLIGHT_PRINT=1` prints every set's json), then rerun without the variable.
- `e2e-bunker` (LEGACY) two pages on `?net=local&autostart=bunker&mode=course`, Fallow by bay: B1 the objective list on both
  pages, every course prompt on the client, "Waiting for partner", the seal and the locked rear door; B2 a lane lever
  pulled by the client unlocks the doors on both pages
- `e2e-ct-warehouse` (LEGACY) the Warehouse CT routes (Hunter, guards frozen): drainpipe -> roof, rappel -> kick through the
  dispatch window, skylight drop, the pump house boost target, press wall jump, corridor split + drop, deck pipe + drop,
  yard fence + the nav path round it
- `e2e-ct` the Proving CT course: the manual jump, split jump, wall jump, pipe facing along + legs up + inverted, the flip
  drop, rappel (hook on, speeds, kick out, sidearm, kick through a window), fence (bullets / sight pass, climb / shimmy,
  rattle by gear, flip over)
- `e2e-feedback` playtest notes: Pause > Report feedback with the context, photo mode (frozen game, no HUD, free camera,
  take / retake / keep / cancel, two photos), IndexedDB after a reload, Settings > Feedback list, the HTML report
  download, photo mode on the menu stage
- `e2e-desktop` (parts 1, 2, 4; part 3, the Epic renderer in a match, is in the GPU list) menu scale, Mouse & Keyboard rebinding, the Graphics menu (presets, Custom, frame cap), the
  benchmark (a short flight saved as feedback; every preset), Auto graphics (GPU name, `?detect=1&renderer=...`
  calibration, no re-measure), the frame governor stepping down, baked lamps, 16:10 / 21:9 / 32:9 windows, the Epic
  renderer in a match, every material within 16 textures, no `GameState` survives a release (`SHOTS=dir` saves shots)
- `e2e-offline` service worker precache (every manifest entry), offline boot + match, backgrounding pauses, co-op offline
  state, a v1 save in IndexedDB migrated on boot with a backup
- `e2e-studio` (anim-studio; covers `src/anim/studio*`, `src/anim/tuneHistory`, `src/game/studioStage`, `src/ui/studio*`,
  `src/ui/tuneSnapshots`, `src/ui/animTune*`, the studio map and the tuner store): `?autostart=studio` boots the stage with
  the tuner panel and its Studio section; a keyed clip in place on Wren's graph, paused a key step moves the phase by one
  key and back; mirror reaches the drive; a state walks by synthesised input; 2x game speed in the studio; a slider
  change undoes and redoes; a preset saves to the tuner's IndexedDB store and loads back; no studio row in the studio's
  pause menu; quitting to the menu leaves time scale 1 and no studio state; the main menu row. (tuner-ui, also covers
  `src/ui/tunerLayout`) Picking a loop sets the tuner's state; a walk state on the spot keeps the root within 5 cm while
  the gait runs; a side snap holds the camera to her facing as she turns; the pause menu stops a moving loop. (e2e-menus
  has the tuner-ui pad checks: tabs by LB / RB, the drop-down, values shown and light on dark, the hint strip under the
  rows, pause while tuning.) (marlow-bays slice T, also covers `src/ui/tunerMouse`, `tunerTarget`) Keyboard and mouse: the
  open tuner is in drag view with no pointer lock; a left drag on the scene turns the camera; the header button and F4
  switch to the game camera and back; a row clicked in the Joints part is marked (`tt-sel`) and the scene marker sits on
  its joint, another row moves it, the Camera tab has none; the Keyed box plays `keyed:walk` from `state:walk` and back,
  greyed on a keyed-only clip; a state picked in the Joints part's state list plays its loop (the tab stays); on the spot
  (header button, F8) the walk holds its root under 5 cm over 2 s of live play, off she walks; the four stage lights light
  her meshes, keep their offset in the view frame (from her toward the camera, T2) as she walks, and the Stage light slider scales them. (marlow-bays T2) The
  studio hides the game HUD (`body.tt-studio`) and the canvas ends where the docked panel starts; a click on the body
  map's left knee shows only knee sliders and marks the knee; a click on her head in the scene picks the head; pin and
  unpin a slider (chip, star), a moved slider heads the recent chips; the Joints rows fold in groups (a header opens and
  closes its group). (marlow-bays T1a) A
  key step lands on the clip's next key (the walk's 8 keys, the mirrored half included); the Keys tab's clip and key
  pick plays `keyed:jog` on the spot paused on key 2 (the readout "jog - key 2 of 8 (mirror of 6), frame 4", the hint,
  the Mirror box on, the list of own keys), "Key ▶" and F2 step with the picker following (on key 6 it shows key 2), F1
  steps back, the forearm twist row marks the forearm; a forearm twist key edit turns the right forearm bone 30-60 deg
  with the elbow still; Mirror on carries a left elbow edit at key 2 to the right arm at key 6, Mirror off lists 8 keys
  and lets the right arm at key 6 go back while key 2 keeps its edit; the playback bar shows on the Body tab and F9
  plays and pauses; a pistol picked in Hands & feet plays the low ready and the pistol comes out; a climb move and a
  co-op role play `trav:vault` and `pair:boost`; aim standing (pistol), crouch aim standing and moving (rifle) put the
  tuner's state on `aimStill`, `aimCrouch` and `aimCrouchMove` with that gun. (anim-studio-2, also
  covers `src/anim/moveTune`) A co-op pair (`pair:boost`): two puppets, paused and scrubbed into the boost A is up off B's
  hands and B on the floor, both posed at one clock time, a key step moves both by one frame; a traversal loop
  (`trav:ladder`) reaches the ladder by the synthesised Y; `state:idle` puts Wren back in the middle, off the ladder
- `e2e-tuner-phone` (marlow-bays item 26; covers `src/ui/tuner*`, `src/ui/animTune*`, `src/game/studioStage`,
  `src/player/freeView`; about 1 minute): `?autostart=studio` on three pages. Landscape 844 x 390 and portrait 390 x 844
  with touch emulation (`hasTouch`, `isMobile`; `launch({ context })` in e2e-lib): the drawer / sheet is chosen and the
  canvas gives up its width / height; (26b) touch: the drawer about 38% wide / the sheet about 45% high, every visible
  touch target >= 34 px, 13 px text; a fake pad press (`window.__pad`) switches live to the pad density (26 px rows,
  11 px text, 34% / 40%) and a touch back; the panel scrolls; the F3
  readout is off, the Settings toggle and F3 show and hide it; a tap on her head picks the head; one finger dragged
  orbits (camera yaw), a pinch zooms (orbit distance), two fingers pan (the circled point), touches on the panel move
  nothing; the handle collapses and expands. Multi-touch through the DevTools protocol (`Input.dispatchTouchEvent`);
  Babylon's "Max number of touches exceeded" note (the emulator's `maxTouchPoints` is 1) is not counted as an error.
  Desktop 1280 x 640 without touch: the T2 layout and dock unchanged, the map's own targets, the readout on.
- `e2e-security` (LEGACY; Kestrel-owned, covers `src/security/`): the debug map `?autostart=seclab&mode=sandbox`: cameras detect
  a walker in the lit strip within SN08 + 0.5 s, not a crouched player in the dark corner; the panning camera misses a
  player at its far pause; a shot camera stops detecting; desk and panel checks
- `e2e-kestrel` (LEGACY; Kestrel-owned, covers `src/world/maps/kestrel*`): the B0 massing walk from
  `docs/kestrel/kestrel.blocks.json`: spawn at `meta.entry`, a teleport per zone, the controller walks a tour (entry,
  stairs, roof and back), the camera's two rays along the tour (findings printed), the critical path crouched at gear 3
- `e2e-camera-bounds` (LEGACY; Kestrel-owned, covers the camera files): on kestrel in sandbox every frame a ray from the head to
  the camera and to the four near-plane corners hits nothing: hugging both walls of the longest corridor and turning on
  each shoulder, every stair, crouched along level U (a 1.5 m test box while level U is not built), the open yard
  framing within 2% of the pre-CAM values
- `e2e-music` (AUDIO) the old V3 sketch picker (`?musiclab=1`): the picker comes first, each sketch loads its three stems, the
  ladder moves the stem gains, every decoded loop joins without a seam, the playback cost, no console errors
- `e2e-score` (AUDIO) the V4 score: after the first click the menu theme plays and fades from full into a match; in a Warehouse
  match the mission tracks decode in the background, Calm is silent, a suspicious guard gives Cautious, an alerted one
  Alert (with Evasion alongside)
- `e2e-weapon-audio` (AUDIO) on Proving: the sprite decodes with a small alignment shift; automatic fire plays one shot per
  round with brass and stays under 24 voices; a suppressed rifle plays its suppressed bank and guards hear it less; a
  reload, a dry click and a shot 20 m away play, (coop-walk-fixes P7) a partner's suppressed pistol round plays suppressed; the weapon lab (`?weaponlab=1`) fires the two kit guns, an automatic
  run, a suppressed guard shot at 18 m, both reloads, brass and dry fire
- `e2e-foley` (AUDIO) on Proving: the sprite decodes; one foley step per real foot plant at a walk and a sprint (the walk
  check reads 3 or 4 plants against >= 4 at the step-22 speed: parked, not fixed), silence standing still, a drop
  plays a landing, the guards' footstep noise unchanged; the foley lab (`?foleylab=1`) walks every surface
- Also LEGACY (`npm run e2e:legacy`): `e2e-progression` (Loadout by controller, upgrades, rewards, IndexedDB,
  export / import), `e2e-cosmetics` (Loadout
  appearance by controller, live / locked previews, the Tag page, camo, in-game look), `e2e-clear` (Hunter on the
  Warehouse: "Enemies left N", "DOWN", the OPERATION COMPLETE stinger, results; doorway checks on Mission; no Training
  mode)
- `npm run e2e:editor` (`scripts/e2e-editor.mjs`, not required): the Kestrel editor by a fake controller alone; starts
  its own Vite dev server on a free port; never saves.

## Network conditions (D11)
- `E2E_NETSIM=typical node scripts/run-e2e.mjs e2e-netmove e2e-coop` (or one suite): `e2e-lib` adds `&netsim=typical`
  to every `?net=local` page (coop.md). Report mode, never a gate: `assert` prints `NETSIM FAIL - <check>` and carries
  on, and the suite ends with `NETSIM REPORT (<preset>): N check(s) failed`. Every page runs a probe: `NETSIM-POP` for
  a remote root step more than 25 cm beyond a 7 m/s pace in one frame (host teleport grace excluded), and `NETSIM-STAT`
  every 5 s. `E2E_NETSIM=off` runs the same probe on a clean network (the baseline). Results: docs/locomotion/LOG.md
  "20b".

## Helper scripts
- `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
- `node scripts/rig-shot.mjs out.png [yaw]` close-up of the Loadout operator (proportion / silhouette checks)
- `npm run weapons:shots [outDir] [view ...]` (feature/weapons; `E2E_GPU=1`, port 4189, needs `npm run build`): the
  in-game weapon views (aim, hands, body, carry, holster, knife) on the training map, `STAGE=warehouse` under a lamp
- `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
  reload|swap|grenade|vault|lowreadywalk|aimback|aimstrafep|readytoaim> [frames] [interval] [side|front|back|ots]` contact sheet
  (anim-rework S3: the drawn scenarios; `draw` is the sling draw, LT from holstered) (the `cover` / `highcover` /
  `lowpeek` / `peek` scenarios tap the removed snap-cover action and are dead until rewritten for back-to-wall)
- `node scripts/perf.mjs [--desktop | --preset=<p>] [--budget] [--json]` (`--desktop`: the Epic path; `--preset`: that
  preset, governor off; else the `?gfx=min` test path; `STEALTH=1`: ten unaware guards perceiving; `PROFILE=1` CPU
  profile; `PASSES=1` draws per pass) Warehouse, 10 guards: main thread p95, animation per character, allocations per
  second (top allocators), draws and triangles over every pass. Budgets: performance.md.
- `node scripts/perf-trend.mjs [perf args]` serves `dist/`, runs `perf.mjs` once without `--budget`: a trend against this
  machine's own baseline, never a pass claim.
- `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs [--maps=sectorops,ctcourse] [--counts=0,12] [--cells=patrol,away,alert]
  [--gfx=epic] [--viewport=1920x1080] [--warm=5] [--secs=10] [--out=<dir>]` (feature/guard-cap; laptop, headless, needs
  `npm ci` and `npm run build`) is the Course-mode perf measure (marlow-final): per map and guard count a fresh browser,
  the cells patrol / facing, patrol / away (camera turned, render only) and alert, each with the sim split (AI, nav, rays,
  light reads, step total) and the render split (frame, frame CPU, GPU ms from the timer query, draws and triangles over
  every pass). Report only: it writes `guard-cap.json`, `guard-cap.csv` and `RESULTS.md` into `--out`, never a pass
  claim and never in cloud (software GL needs `--software` and is no perf result). The Marlow Yard budget read from it is
  GPU <= 7.5 ms at Epic 1080p, 0 guards; baseline 5100141d and the facility perf pass: `docs/marlow-final/slices/S9-perf.md`
  (the "after" numbers: pending laptop run).
- `E2E_GPU=1 E2E_PORT=4189 node scripts/shots-ctcourse.mjs <dir> <suffix> [prefix]` (marlow-final): one GPU shot per
  `SHOT_VANTAGES` entry of Marlow Yard (the facility's `f-*` and each set's `a<n>-*`), written as
  `<dir>/<name>-<suffix>.png`, with the printed `meter field` row per vantage (fails when the two differ by more than
  0.02: light parity). `prefix` limits it to one set.
- `node scripts/soak.mjs [minutes=10] [url]` (`MAP=`, `MODE=`, default Hunter) real-time soak: pacing, CPU, adaptive
  quality, heap growth (leak check)
- `node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json> [--dry-run] [--only section,...] [--allow-shared]`
  (anim-bake) bakes an animation tuner export into the code defaults: `--dry-run` prints the diff and the table and
  writes nothing; a real run writes the source files, the key JSONs (Keys) and the ledger `src/anim/tuneBakeLog.json`,
  then prints the key clips' rebake commands (Blender is never run). Shared targets, refusals and the mapping:
  `docs/anim-tuner/BAKE.md`. Pure logic in `src/anim/tuneBake.ts` (tests: `tests/animTuneBake.test.ts`, on temp copies).
- `node scripts/plan-svg.mjs [mapId]` top-down plan SVGs of a built map, one per storey (default `bunker`; output in
  `test-results/training/`, never committed)
- `node scripts/anim-audit.mjs [url] [--local | --remote] [--quick] [--only=<scenario>] [--out=dir] [--shots]
  [--strict] [--compare=<file>] [--band=<file>]`: the animation audit (bible 5.12.2, 5.12.4.2), local player and
  remote poses (default both), Proving Grounds. Bundles the pure `src/anim/audit/metrics.ts` + `limits.ts` with esbuild
  into `test-results/anim-audit/lib`; the page records joints / camera / capsule / planner every rendered frame (60 and
  120 Hz), node computes.
  - Local full run: flat every gear both stances at 60 + 120 Hz, stairs and the 20.4 deg ramp every gear at 60, stairs
    and the 35 deg slope at 120, transitions (stance, quick 180, raise, swap, vault over low cover, mantle onto the 0.9 m
    block, ladder, 0.9 / 2.4 m drops, idle, crouch tunnel, the `wall` transition) at both rates, 60 v 120 parity; ~50 s
    on software GL. `--quick` (flat stand 2 / 4 / 6 + crouch 3 at both rates, idle): ~12 s. Metrics: foot slide, float /
    sink on the lowest sole point (1e-4 m tolerance), joint rate in each joint's parent frame, crouch / stand times,
    weapon settle (> 2 mm rise within 0.25 s after a decline), hands (wrist-to-grip distance), wrists, arms and weapon
    against the torso capsule, `wallGap` / `wallClip` (<= 3 cm). Body / weapon vs world is e2e-clip's. The local run
    stops the render loop (only `stepHeadless` advances) and refreshes the camera's view matrix before every frame update.
  - Remote (`--remote`): host A and client B over `?net=local` (helpers in `scripts/e2e-net-lib.mjs`), sandbox on
    Proving; B moves with scripted input in real time; A records its copy of B every rendered frame. Software GL: neither
    page draws; `E2E_GPU=1` keeps the draw. Same metrics, continuity limits scaled to the measured dt; `poseError` (root,
    head, wrists, settled ankles vs B at t - lag, <= 10 cm), `gaitPhase` (reported), `lowerBody` (<= 10 cm), `pops`
    (rubber-banding only), `pairAlign` / `pairPenetration` (brace + boost, <= 3 cm), `lodSkip`. Scenarios: flat stand 2 /
    4 / 6, crouch 3, stairs and ramp stand 3, stop + idle, stance, brace + boost at 60 Hz; the flat set at 120 Hz through
    an 8 ms frame pump on A ("pending PC" when its p95 jitter is over 2 ms). `--quick` remote: flat stand 4 + crouch 3.
  - Output: `<out>/local.json`, `<out>/remote.json`, `<out>/fails.txt`, `<out>/baseline.json`; `DUMP=1` writes the raw
    recordings. Report mode exits 0 unless the harness errors; `--strict` exits 1 on any fail. `--compare=<file>` lists
    regressions against a baseline (worse than max(10%, the noise tolerance) or a new fail; remote `poseError`, 60 Hz
    `pops`, `pairAlign` and `lodSkip` gated against the baseline's noise band, the rest report-only); like modes only.
    `--band=<baseline.json>` keeps both runs' worst and spread. Committed baseline: `docs/locomotion/audit/anim-baseline.json`.
  - Serves `dist/` itself when no url is given and nothing is up on 4173. `--shots` is PC only (`E2E_GPU=1`). In
    `run-e2e` it is the REPORT entry; the quick map runs it (`--quick`) for `src/anim/`, `src/player/`, `src/net/` and
    `scripts/e2e-net-lib.mjs`.
- `node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics docs/design/metrics.json]` (level-validator)
  the level-graph validator (pure Node, no Babylon, no `src/` import; CI runs its Vitest, `tests/levelValidate.test.ts`).
  Reads one map graph (several files, one per section, are merged: `meta` from the first, `spaces` and `links`
  concatenated) and checks it against OUR numbers: structure, dimensions (room classes, openings, 0.5 m grid, ceilings,
  level changes in the step band over 0.40 up to 0.45 m, corridor widths), 2-player reach with no softlock, the linear
  spine between sections, encounter approaches (3+ links that can enter the space, of 2+ kinds, shadow + high + loud,
  routes cross; dead ends counted by ways out), 2+ edge-disjoint routes per section (entry to exit), co-op coverage,
  co-op links with a solo twin (ERR on a campaign map, WARN on Sector Ops) and splits (legs <= 90 s, parity within 20% by link traversal time, an
  overwatch space, an assist, partner reach <= 15 s, shared links >= 2.0 m) and beat pacing. Declared `shadow_pct`,
  `sees_pct`, `los_break_s` and partner reach are targets (missing or outside = ERROR); the greybox measurement step
  (V6, later) will write `measured` values beside them. It holds no size or time constant: every number comes from
  `docs/design/metrics.json` (`--metrics <path>` overrides it). Output: `ERROR: ...` / `WARN:  ...` / `INFO:  ...` lines,
  then `N error(s), M warning(s).` (guard counts below 3-6 early / 6-10 late WARN; no upper limit, Michael 2026-10-24). Exit codes: 0 no errors (WARNs allowed, justify them in the map's design doc), 1 any ERROR, 2 bad
  usage. When it runs: for every map, before Phase 3 (greybox), as the gate at the end of Phase 2 (`docs/level-design.md`
  sections 11, 14 and 15; `docs/templates/map-spec.md`). Schema and an example graph: `docs/level-validator/graph-schema.md`,
  `docs/level-validator/example.graph.json`. First run: campus Sector Ops, all five sections (S1-S5).
- `node scripts/metrics-gen.mjs` (level-validator) parses `docs/design/scale-sheet.md` (sections 1 and 3, the section 7
  room table "Room sizes by type" and section 8 "Validator numbers": speeds, split / reach times, shared width, shadow,
  vantage and LOS targets, step band, grid) and writes `docs/design/metrics.json`, the one source of sizes and times
  for the validator. Run it after every edit to those sheet sections and commit the JSON: `tests/metricsGen.test.ts`
  fails when the committed JSON differs from a fresh generation. `node scripts/metrics-gen.mjs --check` writes nothing
  and compares instead (exit 0 matches, 1 the JSON differs from the sheet, 2 a table is missing or malformed). Without
  `--check`: exit 0 on success, non-zero when a table is missing or malformed.

## Laptop queue
A service on the laptop (`scripts/laptop-queue/service.mjs`, one scheduled task every minute; its first build plan:
`docs/archive/laptop-queue-PLAN-2026-10-23.md`, history) runs e2e for you and posts the verdict as a commit status on the
tested sha. No message per verdict. Slots, job counts and the desktop's gates: `docs/RULES.md` "Machines".
- Request (from any desktop, never touches your working tree): `node scripts/laptop-queue/request.mjs --sha <ref> [--pr N]
  [--set name] [--jobs N] [--requester "<title>"] (--suites "e2e-coop e2e-netmove" | --full | --alone --step "<cmd>" [--env K=V])`.
  Needs a pushed sha. It pushes `requests/<id>.json` to the `laptop-queue` branch and prints the id. `--dry-run` shows
  the JSON and pushes nothing. An `--alone` step may start with `serve ` (runs `scripts/laptop-queue/serve.mjs`).
- Order: trains (an `origin/train/<n>` head with no `laptop-e2e` status; both slots, sharded by suite times; a head whose
  `auto-train/*` status is failure or error is skipped), then train reruns, then pr / full
  requests (one slot), then alone-measurements (both slots; one waiting over 30 min (`ALONE_AGE_MIN`) goes ahead of pr work).
- Train reruns (2026-10-24, auto-train): `request.mjs --train-rerun --pr N --suites "a b" --requester auto-train` writes
  `"trainRerun": true` (kind pr). It runs right after trains, before every other request and alone run, never held by
  the alone hold, on one laptop slot at `E2E_JOBS=1` with the suites at once (no sharding; the desktop never takes it).
  Its context is `laptop-e2e/<set>` like any pr request (auto-train sends `--set train<n>-rerun` and reads
  `laptop-e2e/train<n>-rerun`); only a rerun with no `--set` gets `laptop-e2e/rerun-<suites without e2e->`. A full pass also posts `laptop-e2e` success on the sha,
  "laptop rerun passed: <suites> (desktop fail)": the combined status keeps the latest status per context, so that
  replaces the desktop's `laptop-e2e` failure and release sees the train green. A fail posts only its own context (the
  train stays red) and comments on the PR as usual.
- Duplicates (2026-10-24): a new request that runs exactly what another one runs (same sha, kind, suites sorted or steps
  in order, env, set, jobs, pr; any requester) is marked done unrun as "duplicate of <id>" (one push, no status) while
  that one is open (older), claimed or running on either worker, or was done on this worker within `LQ_DUP_WINDOW_MIN`
  (60) min with result success. A failure, error, build, nosha or incomplete result never retires a new request (a
  rerun of a failure runs, e.g. the laptop's rerun of a desktop failure, or a `--jobs 1` solo rerun). Supersede still
  retires one requester's older pr / full requests. state.json keeps done entries 7 days (pruned on each save once their
  done claim is on the branch).
- Yield (2026-10-24): while a train head is pending, a pr / full / alone run that has not started its suites or steps
  (waiting for its lock, fetch, npm ci, build) gives its slot back: locks released, claim dropped, log "<id>: yields to
  train <n>"; the request stays queued. Once its suites or steps start it runs to the end. A train rerun never yields.
- Statuses: `laptop-e2e` (trains), `laptop-e2e/<set>` (pr, set defaults to the suites joined by `+`), `laptop-e2e/full`,
  `laptop-e2e/alone-<set>`. Description "N/N pass, <s> s", plus "; flake: x" and "; FAIL: y". A failure also comments on the
  PR (suite, failing line, log path on the laptop). Logs: `C:/NightShift/scratch/laptop-queue/runs/<id>/`.
- Affected e2e on every PR head (process audit 2026-10-24, finding 5; laptop service only, every `LQ_AFFECTED_POLL_MIN`
  (2; 0 = off) min): each open non-train, non-draft PR head with no `affected-e2e` status and no open affected request
  gets the suites `request.mjs --affected` picks (merge-base with `origin/master`, `git diff --name-only --no-renames`,
  the DIRECT tier; the same code, `affectedSuites` in `scripts/laptop-queue/lib.mjs`), without the GPU and LEGACY
  suites (`affectedGateSuites` in `scripts/e2e-affected.mjs`, which holds the runner's GPU / LEGACY lists: a request's
  suites run by name, where nothing is REPORT ONLY, so they used to run and gate; audit 2026-10-25). No browser suite reached: the
  head gets `affected-e2e` success "no browser suites (docs / unit only)". Otherwise the service enqueues a pr request
  itself (requester `affected-e2e`, set `affected`, the PR number and branch) and posts `affected-e2e` pending; the run
  posts its verdict on `laptop-e2e/affected` and on `affected-e2e` (failures comment on the PR as usual). A newer head
  on the same branch supersedes the older open request (its `affected-e2e` gets error "superseded"); other PRs' requests
  never supersede each other, and each PR branch takes its turn in arrival order beside the leads' requests. Opt out
  per PR with the label `no-affected-e2e`. Heads older than `LQ_AFFECTED_MAX_AGE_H` (24 h; 0 = no limit) and fork heads
  (no merge-base on the laptop) are skipped. A lead's own `request.mjs --affected` still works as before.
- Flakes, the flake budget and auto-quarantine: "Flakes and quarantine" below.
- Manual runs keep working: the service uses the `C:/NightShift/heavy-<slot>.lock` files and waits while one is held; its
  log says "<port> waiting on manual lock: <holder>" once per holder and the wait in minutes when it takes the lock.
- Desktop overflow lane (Michael 2026-10-23 ~20:45): the same service with `LQ_WORKER=desktop` (task
  `NightShift-desktop-queue`, `install-task.ps1 -Worker desktop`) takes pr requests only, on 4191 in
  `C:/NightShift/Mobile-Coop-testrun-4191` under `C:/NightShift/heavy.lock` (and 4192 in `...-testrun-4192` under
  `heavy2.lock`), `E2E_GPU=1 E2E_JOBS=1`. Its start gates (backlog, CPU, lock, laptop silent for trains) are in
  `docs/RULES.md` "Machines"; the env names are `LQ_DESKTOP_BACKLOG` (service default 3, `install-task.ps1` default 0),
  `LQ_DESKTOP_CPU` / `LQ_DESKTOP_CPU2` (80; CPU of Normal or higher priority processes, lib `gatedCpu`) and `LQ_LAPTOP_SILENT_MIN` (10). Full and
  alone runs stay on the laptop. Its statuses read "desktop: ..."; logs
  `C:/NightShift/scratch/laptop-queue-desktop/runs/<id>/` on the desktop.
  While auto-train runs `merge-train build` it writes `<AUTO_TRAIN_SCRATCH or C:/NightShift/scratch>/auto-train-building.json` ({ train, version,
  pid, at }; deleted after); while that file exists and is younger than `LQ_BUILD_MARKER_MAX_MIN` (30) min the desktop
  starts no new request or train (log "train <n> building: no new claims", once per marker; an older one is ignored as
  stale, logged once; runs already going continue). `LQ_BUILD_MARKER` overrides the path (tests).
- Claims: each worker pushes `claims/<id>.json` (a train: `claims/<train-sha>.json`) to the `laptop-queue` branch before
  a run and marks it done after, so the two never run the same request or train. An open claim older than 3 h (`LQ_CLAIM_MAX_H`) is a dead worker's and is taken over.
- Install / remove the task: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/install-task.ps1 [-Remove]`.
  Dry run: `node scripts/laptop-queue/service.mjs --once --dry-run`.
- Scheduled tasks (Michael 2026-10-24 07:13, after 87 old hand-made `NightShift-chain-*` one-shots fired again at
  2026-10-23 23:59 and held the slot locks for hours): hand-made chains are retired; e2e runs go through the queue
  (`request.mjs`). The permanent tasks are `NightShift-laptop-queue` (`install-task.ps1`), `NightShift-desktop-queue`
  (`install-task.ps1 -Worker desktop`) and `NightShift auto-train` (`scripts/auto-train-task.ps1`). The only way to
  schedule an ad-hoc run is `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/laptop-queue/one-shot-task.ps1
  -Name NightShift-run-<what> -Command "<powershell command>" [-At <time>] [-ExpireMinutes 240] [-WhatIf]`: one hidden
  run whose trigger expires at At + ExpireMinutes (also its run time limit), after which Windows deletes the task.
- Task guard: at start and every `LQ_TASK_GUARD_MIN` (10; 0 = off) min on both workers (desktop dry run 2026-10-24: only "NightShift auto-train" and NightShift-desktop-queue, both allowed), disable (Disable-ScheduledTask only; never
  stop, kill or delete; a running instance keeps running) every enabled task named `NightShift-*` that is not one of the
  three above, a `NightShift-run-*` with an expiry or in `LQ_TASK_ALLOW` (comma list), and every other enabled task whose
  action mentions `C:\NightShift\scratch` or `laptop-runner.ps1`. Log line "task guard: disabled <name> (<state>, <why>)";
  each pass that disabled something pushes `alerts/<ts>-<worker>-tasks.json` ({ worker, disabled, at }) to the `laptop-queue`
  branch for the orchestrator. `--dry-run` logs "would disable" / "keeps" only.

## Flakes and quarantine
The only owner of the flaky-suite rule (process audit 2026-10-24 finding 5; replaces "flake stands" and the old
`KNOWN_FLAKY` list in `docs/backlog.md`).
- What counts: a failure in a quarantined suite before its expiry prints KNOWN FLAKY (owner, expiry) and does not fail
  the run; the suite still runs. Any other failure counts only if it also fails in a solo rerun on the same sha. A
  suite that fails and then passes on the same sha is a flake: it counts as a pass, and its owner fixes the test in the
  next batch PR. A crash or timeout mid-suite is never a pass.
- Committed quarantine: `scripts/e2e-quarantine.json` lists { suite, owner, expiry, reason } (a part like
  `e2e-sectorops:6` or a whole suite) and `owners` (who fixes each suite's flakes). Add an entry only with an owner, an
  expiry and the failure written up in `docs/backlog.md`. An expired entry counts again; the owner removes or shortens
  the entry once the test is fixed. run-e2e also reads `E2E_QUARANTINE_FILE` (the queue's automatic list below).
- Auto-quarantine (laptop queue): a failed, non-quarantined suite reruns once alone on the same sha; a pass is logged as
  a flake (state.json `flakes`, runs per day in `suiteRuns`). A suite may flake 2 times in 7 days (lib `FLAKE_BUDGET`,
  `FLAKE_BUDGET_DAYS`); the next flake quarantines it for 48 h (`C:/NightShift/scratch/laptop-queue/quarantine.json`,
  owner from `owners`, else the orchestrator), so later runs print it KNOWN FLAKY instead of rerunning it.
  `flake-budget.md` in the same folder holds the per-suite rates; a run that flaked or hit a quarantined failure adds
  that table to its PR comment (a passing run comments only when it recorded a new flake). Only flakes after a suite's
  last auto quarantine count, so it does not renew on the same flakes; an auto entry just expires. The desktop worker
  keeps its own list (`laptop-queue-desktop/`). Commits cut before this change ignore `E2E_QUARANTINE_FILE` and keep
  their hardcoded e2e-pad.

## GPU runs (Michael's PC only)
- `E2E_GPU=1 npm run e2e` (or any script, e.g. `E2E_GPU=1 node scripts/perf.mjs --desktop --budget`): `e2e-lib` launches
  Chromium with the hardware GPU (Windows: ANGLE D3D11, GPU blocklist ignored) instead of SwiftShader, headless with a
  faked pointer lock; `E2E_HEADED=1` (debugging) opens a window parked off-screen. Browser: `E2E_BROWSER`, the
  preinstalled Chromium, else playwright-core's own (`npx playwright-core install chromium`). `navigator.canShare` is
  stubbed off so exports take the download path.
- Graphical and performance checks (perf budgets, contact sheets, visual parity and probe checks, beauty shots) run here
  only. Cloud sessions run unit tests and logic e2e and report those checks "pending PC run"; they never claim a perf or
  visual result from SwiftShader.
- `perf.mjs` with `E2E_GPU=1` uses the laptop goals (`LOCAL_BUDGET`, performance.md).
- D3D11 compiles the characters' `partSkinMat` shader slowly (seconds after spawn); an uncompiled effect's
  `_samplerList` holds every candidate (61), trimmed once compiled (11 for `partSkinMat`, limit 16). `e2e-desktop` therefore waits for every drawn mesh's effects before counting textures.

## Debug overlay
- F3 (or the settings switch); `?debug=1` shows it at boot. Buttons: Skeleton (bones, controller capsules, hit volumes
  and foot contacts as lines: green = planted, orange = swinging; things register in `ui/debugVolumes.ts`), Tune
  (sliders for `MOVEMENT`, `CAMERA`, `CARRY`), Anim (the animation tuner, top right: `docs/systems/ui.md`, "Debug
  overlay") and slow motion (1x / 0.5x / 0.25x). Lines: display Hz + budget, pacing
  p50 / p95 / p99 + drops, CPU per frame, quality + resolution scale, player, carry, combat, anim (layer weights, the
  active clip timeline, `!limit` = joint-rate limiter hits). The bar graph is frame pacing against the budget line;
  `addTrace` graphs values per frame.
