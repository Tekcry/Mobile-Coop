# Commands, e2e suites, test helpers and the debug overlay
Purpose: every npm command, the headless e2e suites with what each checks, the helper scripts and the in-game debug overlay.
Design authority: docs/design-bible.md (Section 9, definition of done)

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run editor` - the Kestrel level editor on this PC (`editor.html`, dev server only; docs/kestrel/editor.md)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run sfx:fetch` / `npm run sfx:render` - the movement foley: download the CC0 packs (`scripts/sfx/foley-sources.json`,
  SHA-256 checked) into `.sfx-cache/`, then cut the takes and write `src/assets/sfx/foley.mp3` + `foley.json` (Windows:
  Media Foundation MP3; decodes the OGGs in headless Chromium). The sprite is committed, so only a change of takes needs it
- `npm run e2e` (`scripts/run-e2e.mjs`) - serves `dist/` once and runs the suites in a pool (default 4 at a time, `--jobs=N` / `E2E_JOBS`), each suite its own process and browser, the slowest first (`scripts/e2e-times.json`, rewritten by every clean full run), each suite's output printed as one block and kept in `test-results/e2e/`. `e2e-desktop` runs as four jobs (`e2e-desktop:1`..`:4`, `--part=N`; its sections are independent). A suite past 600 s (`E2E_SUITE_TIMEOUT`) is killed and fails. `--serial` (`npm run e2e:serial`): one at a time, output live. `--quick` (`npm run e2e:quick`, `--since=<ref>`): `smoke` + the suites mapped to the changed folders (`COVERS` in the runner; an unmapped `src/` path, `e2e-lib`, `package.json` run a core set); `--list` prints what would run. `E2E_PROFILE=1` makes each suite print where its time went (launch, boot, match build, first frames, rendered frames, fixed waits, `stepHeadless`, screenshots). Known-flaky suites: see below. The suites:
  - `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot)
  - `scripts/e2e-pad.mjs` controller-only navigation through every menu using a fake Gamepad API pad; 3.2.0 in a match:
    D-pad up / down gears, D-pad left tap vs hold (wheel), View tap goggles / hold emote
  - `scripts/e2e-touch.mjs` touch-only: taps menus, floating move stick, rate-based camera stick, drag-look,
    fire button never moves the camera, control sizes, action button only for "use";
    3.2.0 speed rocker (up / down halves, pips, HUD pips fade), a forward roll by touch, the jump button, the action
    button dimmed when idle, prompts are indicators only
  - `scripts/e2e-mouse.mjs` PC mouse capture: click captures (never fires), look, fire, wheel = speed gear (3.2.0),
    X swaps, = / -, Esc pauses, Resume re-captures
  - `scripts/e2e-move.mjs` (3.2.0, `gear=none`: spawn gear 3) every gear's speed both stances, stick scaling, gear kept
    through stances, zero velocity on the release step, planted feet < 2 cm on a stop, the stop holds its stride
    (1.2 s, aiming lets go; crouched: no kneel; a creep and a sprint; a pad stick springing back), forward roll (0.7 s, ~3 m,
    crouched, 2 m noise) and none at gear 3, aim strafe/backstep, sprint toggle, aim ends a sprint, no free jump,
    kneel, contextual vault/climb/step/drop/hop, steps/slopes/stairs/tunnel/props on Proving Grounds
  - `scripts/e2e-traverse.mjs` Proving Grounds course (north east): ladder bottom / top entry, climb rate, slide, step
    off; drainpipe to a lip, climb up; ledge grab, shimmy rate, jump across, outside corner, climb up, hold-B lower
    in, drop; horizontal pipe; landing bands (soft / roll / heavy + noise + recovery); grab while falling; zipline;
    open / glazed windows; duct unscrew, crawl, vent drop + roll, kick (fresh page); keyboard E; touch: the action
    button at the prompts (grab, held at a vent: unscrew), crouch lets go;
    planted hands / feet locked (< 1 cm), arms reach grips
  - `scripts/e2e-anchors.mjs` every placed anchor on every listed map (Proving, Warehouse) (ladders bottom / top, drainpipes, pipes, ziplines,
    ducts, windows both sides) is offered from its approach and engages; hangable lips per map
  - `scripts/e2e-stealth.mjs` real-time camera repro (free orbit: 360 deg looks standing, crouched, moving,
    aiming, after a sprint / traversal, no residual offsets, level horizon after a shake); the player cover bars
    left with snap cover (back-to-wall checks arrive with e2e-wall, step 11)
  - `scripts/e2e-weapons-carry.mjs` Free Roam loadout: five slots, back guns within 10 deg of the spine in six
    gaits, no clipping (both avatar styles, with a backpack), hands within 2 cm of the grips, swap reach + timing
  - `scripts/e2e-anim.mjs` quality bars in the running game: first-frame response, 3.2.0 Chaos Theory: 95% speed
    within 0.08 s, a stop on the release step, the stride held (no settling step), no planted pivot, 720 deg/s turns, turn rates, lean into turns, stance and aim raise/lower times, weapon clip
    timings, foot locking (< 1 cm) in seven gaits, pose continuity, flinch, camera lag/blends/bob/drift/sprint
    FOV/stick-look bounds, 60 / 120 / 144 / 165 / 240 Hz parity (each run from gait phase 0)
  - `scripts/e2e-lightbake.mjs` (3.6) the Warehouse under `?gfx=min`, the phone look, `?gfx=low` and `?gfx=epic` bakes the same canonical shapes and the
    same lamp / moon / ambient bytes (cache keys and a content hash from `World.lightInfo()`)
  - `scripts/e2e-phonelamps.mjs` (3.6) the phone light look (`platform=mobile`, no `?gfx=`): the lamps from the light volume
    on the standard materials, the ambient grid fill, the baked moon, two plain lights for flashlights, the phone black
    floor; a probe behind a wall from a lamp reads dark in the volume (`BakedLamps.volumeAt`) and in the field, one in view
    reads lit; Warehouse and Proving Grounds boot without console errors
  - `scripts/e2e-darkness.mjs` (3.6 Step 4b, bible L5) display brightness targets: on the Warehouse, a matte 50% grey card
    (`World.addLightProbe`) at points of field level ~0.12 / 0.27 / 0.40 / 0.70 facing the strongest light, the camera
    0.8 m in front, the HUD hidden; the screenshot's centre read as Rec. 709 luma - phone light look and Epic, night
    vision off and on. `LOOK=phone|epic` runs one look; `REPORT=1` prints without asserting; `DARK_OFF=1` (with
    `REPORT=1`) shows the look before Step 4b (no curve, the old phone floor); and (Step 4b fix) turning the camera with
    night vision on reads as moving every frame (`Camera.hasMoved`: TAA must not blend stale history), and night
    vision's bloom (`NightBloom`) runs every frame with a glow
  - `scripts/e2e-combat.mjs` weapons, hits, headshots, reload, swap, grenades, barrels, death/respawn
  - `scripts/e2e-modes.mjs` wave progression, mission flow, enemy types, ragdolls
  - `scripts/e2e-progression.mjs` Loadout by controller (live weapon preview, lock line, upgrade, buy in place), suit / HQ by touch, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-clip.mjs` traversal: no body point (trunk, head, thighs, calves, upper arms; raycast from the hips)
    > 3 cm into the world while climbing, hanging, shimmying, climbing up, crawling, dropping through a vent,
    vaulting a window, on a zipline or rolling; plus the weapon clipping sweep: every frame of walking / crouch-walking along a wall
    (both sides), sprint, crouch run, aim every weapon, aim walking / crouched: no gun point inside the world (> 2 cm), legs grazed
    <= 2.5 cm, gun clear of the head (> -1 cm) and trunk (> -2 cm), elbows (> -3 cm), knees above the floor and
    > 9 cm apart, feet > 6 cm apart (`--only=name --log`)
  - `scripts/e2e-tactics.mjs` doorway check, contextual lean, slicing the pie, split hit volumes, suppression,
    exposure HUD, enemy grenades/flanker, footstep noise investigation, a wall muffles a noise
  - `scripts/e2e-takedown.mjs` takedown kinds (ground rules, over low cover, above, below, window; 3.2.0: the grab -
    walk, sidearm, human shield, knock out / kill / shove - and drop attacks from a pipe / split, the inverted choke), tap / hold,
    5 cm alignment, damage interrupt; no takedown
    on a guard in combat who saw you, one alerted without seeing you still can be
  - `scripts/e2e-enemies.mjs` heavy (plates / back / face plate, lethal-only frontal takedown), enforcer (shield,
    no frontal grab, pushes), sniper (laser, glint, relocates), dog (smell in the dark, takedown),
    drone operator (spots, shot down, EMP), officer (buff, alarm first), radio check, callouts, Perfectionist
  - `scripts/e2e-levels.mjs` multi-level AI: three storeys per column, Warehouse ladder links both ways, a runner
    chasing the player up a rack ladder and back down
  - `scripts/e2e-missions.mjs` Hunter alarm doubles the hostiles; Infiltration objective types to success (download
    pauses away + noticed pulses, intel any order, plant, rescue + escort, sabotage, extraction, results rating and
    style bars) and failure (Ghost contract detection, three downs) on the Warehouse missions (Ledger, Courier,
    Blackout, Cold Storage); routes per objective + 25 anchors
  - `scripts/e2e-gadgets.mjs` wheel (hold opens + slows time, stick picks, release selects, touch tap), arc preview,
    gas knock-out, flashbang blind -> alert + white-out, EMP lights out and back, noisemaker lure (muffled behind a wall), sticky cam feed
    (operator still, ping, gas, back), drone (flies, dart, battery), mine
  - `scripts/e2e-stealth-ai.mjs` night Warehouse: shadow vs light detection, the arc warns first, no sight through
    walls, noise -> suspicious -> investigating, squad radio after the spotter's radio window, the shout to guards
    close by, a spotter taken out first tells nobody, LKP + ghost + converge + search ends, patrols
  - `scripts/e2e-coop.mjs` two pages over `?net=local` (a third for PvP): lobby, wave match, validated hits, revive, results;
    Hunter (puppet alert levels, door sync, a client door use, a client takedown, kept / hidden bodies, pings both
    ways, a client gas cloud on the host's guards, a dual takedown, a client reviving the host),
    Infiltration objectives on the client, Team Deathmatch (teams, opponents-only hit volumes, no friendly fire,
    a validated elimination, respawn, results; 3.1.9: each player's own FOV, no cap) and
    Free-for-all; host leaving, offline
  - `scripts/e2e-cosmetics.mjs` Loadout appearance by controller, live / locked previews on the operator, revert on exit, emotes, camo, in-game look
  - `scripts/e2e-clear.mjs` Warehouse + Clear mode: only "Enemies left N" (alive + pending), no room tags /
    counts / lives / score / blips, no per-room feedback, "DOWN", OPERATION COMPLETE stinger, results without a
    rooms row; Wave keeps room tags; doorway checks; mini room set; the Play screen: Warehouse default for every mode
    but Training, Infiltration lists the Warehouse missions only
  - `scripts/e2e-training.mjs` the training course by touch: hints per device, each step advancing, the
    Takedown button, HUD defaults (no health bar, ammo fades), the results
  - `scripts/e2e-wall.mjs` (locomotion step 11) back-to-wall on Proving: entry reach (none from 1.3 m, the press
    within 0.9 m settles in 0.2 s), slide at the gear 3 cap and capped at gear 4, quieter than walking, the outside-end
    stop with its edge flag, pull-away and context exits, the stick-into-wall entry after 0.35 s; Warehouse (Clear): two
    guards against a player held on a wall - a flanker is assigned (> 4 s) and a grenade is lobbed (> 6 s). Required; in
    the quick map for `src/player/` and `src/cover/`. e2e-netmove adds "wall", "wall crouch" (joints <= 10 cm, the copy's
    `s` within 5 cm) and "stack" (both pages on one wall >= 0.6 m apart); e2e-pad (A / stick / A) and e2e-mouse (Space / D
    / Space) cover the verb.
  - `scripts/e2e-netmove.mjs` (3.2.0) two pages `?net=local`, Free Roam on Proving: the client on a
    ladder (+ after a climb), drainpipe, pipe, ledge, duct (hands / feet / head within
    10 cm on the host), zipline and a roll mirrored; CT moves (split, wall jump, pipe legs up / inverted, rappel +
    rope, fence); team moves (phase 5: the client braces and boosts the host onto the 4.2 m lip, the host braces and
    the client climbs the human ladder and grabs the lip, a request without a braced partner is denied); TDM: a host
    shot at a client hanging off a lip hits the head
  - `scripts/e2e-ct-warehouse.mjs` (3.2.0) the Warehouse CT routes (Hunter, guards frozen; one brought in for
    the drop checks): drainpipe -> roof, rappel -> kick through the dispatch window, skylight drop, the pump house
    boost target (out of reach alone) and the climb to the roof, press wall jump, corridor split + drop, deck pipe +
    drop, yard fence + the nav path round it
  - `scripts/e2e-ct.mjs` (3.2.0) the Proving CT course (north): the manual jump (up and down, grabs a pipe / lip /
    drainpipe), split jump (shown only facing along; one Y jumps, a second in the air braces facing the way it
    jumped, feet 2.5 m up on both walls, legs within 15 deg of level, no travel, sidearm aim band + fire, B drop, Y up to
    a lip over it; falls of 0.75-2.5 m rest within 3 cm of the floor), wall jump (straight, too far, inside
    corner), pipe facing along it + turning round, legs up (0.5 m/s, feet up), inverted (camera upright, sidearm + spread x1.3), curl up, hands, damage
    mid-change, the flip drop; rappel (hook on, rope speeds, kick out + sideways, sidearm, kick through a window,
    unhook height), fence (bullets / sight pass, blocks the body, climb / shimmy speeds, rattle by gear, flip over)
  - `scripts/e2e-feedback.mjs` playtest notes: pause > Report feedback with the context, photo mode (frozen game,
    no HUD, free camera, take / retake / keep / cancel, two photos), IndexedDB after a reload, Settings > Feedback
    list, the HTML report download, photo mode on the menu stage
  - `scripts/e2e-desktop.mjs` desktop detection, menu scale, Mouse & Keyboard rebinding, the Graphics menu (presets,
    Custom, frame cap), the Interface switch, the benchmark (a short flight, saved as feedback; every preset in
    turn; 3.1: Low .. Epic), Auto graphics (GPU name, `?detect=1&renderer=Apple%20GPU` calibration, no re-measure),
    the frame governor stepping down (TAAU input), baked lamps (every fixed light baked, the rig holds only flashlights, a shot lamp goes dark), 16:10 / 21:9 / 32:9 windows (centred 16:9 menus, the HUD inset on 32:9, Hor+ up to the FOV cap), the Epic
    renderer booting in a match (`SHOTS=dir` saves the aspect screenshots)
  - `scripts/e2e-offline.mjs` service worker precache (every manifest entry), offline boot + match, backgrounding
    pauses, co-op offline state, v1 save in IndexedDB migrated on boot with a backup
  - `scripts/e2e-music.mjs` (music project) the V3 sketch picker (`?musiclab=1`) on phone emulation and desktop: the picker
    comes first, each sketch loads its three MP3 stems, Calm / Alert / Evasion and the ladder move the stem gains, every decoded
    loop joins without a seam, the playback cost (60 s of three stems rendered offline), no console errors. Needs no GPU
  - `scripts/e2e-score.mjs` (music V4) the score in the game: after the first click the menu theme plays (only the menu
    track decoded), and entering a match it fades from full (not from part-way down); in a Warehouse match the four mission tracks decode in the background, Calm is silent, a suspicious
    guard turns the music Cautious, a guard on alert gives Alert (with its Evasion mix running alongside). Needs no GPU.
    Note: if another server holds port 4179, run with `E2E_PORT=4183`.
  - Music V4 test page (music project, manual): `npm run dev`, then open `/music-test.html` (linked from
  - `scripts/e2e-foley.mjs` movement foley on Proving Grounds: the sprite decodes and its alignment shift is small,
    one foley step per real foot plant at a walk and a sprint (a sprint plants faster), silence standing still, a drop
    plays a landing, the guards' footstep noise unchanged (9 m at a sprint on concrete); then the foley lab
    (`?foleylab=1`) walks on every surface and plays a vault, a roll and a heavy landing. No console errors. Needs no GPU
  - Music V4 test page (music project, manual, no e2e yet): `npm run dev`, then open `/music-test.html` (linked from
    nowhere in the game). The themes alone, two menu sketches, two mission sketches with live Calm / Cautious / Alert
    switching, the stinger, fake footsteps, guard voice and noise cue, and a volume slider per layer. Unit tests:
    `tests/score.test.ts` (themes, arrangements, the director's hysteresis, the pure synthesis)
  Speed rules for suites: a wait for N simulated seconds is `stepHeadless` (or, where a suite wraps `state.fixedUpdate` and resolves when its condition holds, `window.__ff()` right after the wrapper is installed: it steps the loop until the wrapper takes itself off). `e2e-move` 112 s -> 12 s, `e2e-combat` 27 -> 4 s with the same checks. Fixed pauses after a match starts are `frames(page, n)`. Real time is kept where the suite is about it: the two-page co-op suites (`e2e-coop`, `e2e-netmove`: network sync and interpolation between two renderers), `e2e-stealth` (real-time camera), `e2e-mouse`, `e2e-pad`, `e2e-touch` (input timing), `e2e-desktop` (the benchmark flights, the 15 s resolution revert, shader compiles), `e2e-offline`, and the `rAF`-sampled foot-slide check in `e2e-move`. The light bake is about 0.5 s a page load and the voxel (Epic) bake cache is 190 MB, so neither is shared between browsers; `e2e-lightbake` bakes cold in four browsers at once on purpose.
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast. `e2e-lib` adds
  `?gfx=min` (every graphics feature off, DPR 1; not saved) unless the params name a `gfx=` (a preset, or `user`
  for the saved settings): the PC renderer at Epic on software GL takes seconds per frame.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the Loadout operator (proportion/silhouette checks)
  - `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
    reload|swap|grenade|vault> [frames] [interval] [side|front|back|ots]` contact sheet (the `cover` / `highcover` /
    `lowpeek` / `peek` scenarios tap the removed cover action: dead until step 11 rewrites them for back-to-wall)
  - `node scripts/perf.mjs [--desktop | --phone] [--preset=<p> [--mobile]] [--budget]` (`--phone` (3.6): the real phone light look, its own budget; `--preset`: 3.1 phone budgets per preset; `--desktop`: the PC path at `?gfx=epic`; else the `?gfx=min` test
    path; `STEALTH=1`: ten unaware enemies perceiving) Warehouse, 10 enemies: main thread p95 (sim per 120 Hz frame +
    the render's JS), animation ms per character, allocations per second (top allocators), draw calls and triangles
    over every pass (`PROFILE=1` CPU profile)
  - `node scripts/soak.mjs [minutes=10] [url]` (`MAP=`, `MODE=`) real-time soak: pacing, CPU, adaptive quality, heap growth (leak check)
  - `node scripts/anim-audit.mjs [url] [--local | --remote] [--quick] [--only=<scenario>] [--out=dir] [--shots] [--strict] [--compare=<file>] [--band=<file>]`
    Step 11 adds the `wall` transition (local 60 / 120 Hz and a remote row): a free high wall on Proving, enter, slide, stop, crouch, slide back; `wallGap` / `wallClip` (back and shoulder blades vs the face, <= 3 cm, `WALL_GAP` in limits.ts) on top of the common foot-slide, self-intersection and joint-rate metrics.
    (locomotion steps 07-08) animation audit, local player and remote poses (default: both), Proving Grounds (bible 5.12.2, 5.12.4.2, 5.17 D2 / D5). Bundles the pure `src/anim/audit/metrics.ts` +
    `limits.ts` with esbuild into `test-results/anim-audit/lib`; the page only records joints / camera / capsule / planner every
    rendered frame (60 and 120 Hz), node computes. Full run: flat every gear both stances at 60 + 120 Hz, stairs and the 20.4 deg ramp
    every gear at 60, stairs and the 35 deg slope (stand 2 / 4 / 6, crouch 2 / 6) at 120, transitions (stance, quick 180, raise, swap,
    vault over low cover, mantle onto the 0.9 m block (driven as e2e-move: settle, read the hint, one jump press; a harness
    error when the expected move never runs), ladder, 0.9 / 2.4 m drops, idle, crouch tunnel) at both rates, 60 v 120 parity:
    ~50 s on software GL. Slopes / stairs measure from one stride after the capsule starts climbing; feet against a world down-ray,
    float / sink on the lowest sole point (heel or toe along the foot's axes, calibrated at rest; 1e-4 m tolerance, so an exact
    2 cm float passes); joint rate in each joint's parent frame (hips in world); crouch / stand times round up to the 60 Hz sim
    step at 120 Hz; weapon settle flags any > 2 mm rise within 0.25 s after a decline, counted from the stop;
    hands as the absolute wrist-to-grip-target distance while the grip IK is on; wrists as the change from the neutral low-ready
    grip; arms and the held weapon against the torso capsule. Body / weapon vs world is not measured here (covered by e2e-clip;
    noted in both outputs). `--quick` (flat stand
    2 / 4 / 6 + crouch 3 at both rates, idle): ~12 s. Writes `<out>/local.json` (per scenario and metric: worst, frame, limit, pass,
    bible line) and `<out>/fails.txt` (scenario, Hz, metric, value, limit, frame), prints a summary table and the wall time. Report
    mode exits 0 unless the harness errors; `--strict` exits 1 on any fail. `DUMP=1` also writes the raw recordings to `<out>/raw/`.
    Serves `dist/` itself when no url is given and nothing is up on 4173 (`npm run build` first). `--shots` is PC only (`E2E_GPU=1`).
    The local run stops the engine's render loop (only `stepHeadless` advances the page: the step 07 wall-clock leak) and
    refreshes the camera's view matrix before every frame update (nothing else does then, and the rig's 22 m anim LOD reads
    `camera.globalPosition`: frozen at spawn it halved the solve rate far from it).
    Remote (step 08, `--remote`, also in the default run): host A and client B over `?net=local` (shared helpers in
    `scripts/e2e-net-lib.mjs`: `hostAndJoin`, `startMode`, `until`, `localJoints`, `remoteJoints`, `allowTeleport`), sandbox on
    Proving; B moves with scripted input in real time (its loop's own tick on a 16 ms timer: B is the background page and Chromium
    holds its rAF to ~15 Hz); A is in front and records its copy of B every rendered frame with the measured dt, in the local record
    layout plus dt, move mode, the host's team clock and own joints. Software GL: neither page draws (`scene.render` off; two drawn
    match scenes ran at 2-12 frames/s); `E2E_GPU=1` keeps the draw. Same metric functions as local, continuity limits scaled per
    frame to the measured dt; no camera metrics (A's camera is its own). Both pages refresh their camera view matrix every frame
    and A's player stands 3.5 m behind B's start (A's camera within the copy's 22 m anim LOD); `lodSkip` fails a row with any
    frame either rig skipped. Remote-only (step 08 r1, A38): `poseError` = the gating part (root, head, wrists, plus the ankles
    on settled frames: B's ankles and root still < 1 cm for 1 s, e2e-netmove's rule) vs B's own pose at t - lag (lag fitted on
    the moving frames in 0-0.25 s, <= 10 cm; `allJointsWorst` in the JSON); `gaitPhase` (reported, not gated: the copy's stride
    phase offset from B's, cycles; no gait phase on the wire); `lowerBody` (hips / knees / ankles root-relative in each body's
    yaw frame against B's frame of the nearest gait phase within 0.5 s, moving frames, <= 10 cm); `pops` = rubber-banding only:
    a root step of the copy unlike B's own over the same interval by more than speed x dt + 2 cm, or a joint step (over at least
    1/60 s) over the joint-rate limit that B's own track does not have around t - lag; `pairAlign` / `pairPenetration`
    (brace + boost, host side, <= 3 cm). Each scenario starts with B's and the copy's gait phase and idle clocks at zero;
    stop + idle has a 1.5 s idle tail, its breath measured from the settle (both feet planted, speed < 0.05) + 0.2 s. Scenarios: flat stand 2 / 4 / 6,
    crouch 3, stairs and ramp stand 3, stop + idle, stance, brace + boost at 60 Hz; the flat set again at 120 Hz through an 8 ms
    page-side frame pump on A (A's loop manual), skipped as "pending PC" when the pump's p95 jitter is over 2 ms. Writes
    `<out>/remote.json`; `fails.txt` lines carry a `local` / `remote` tag (remote frames are A's frames). `--quick` remote: flat
    stand 4 + crouch 3 at 60 Hz. Every run writes `<out>/baseline.json` (worst per scenario x metric); `--compare=<file>` lists
    regressions against one (worse than max(10%, noise tolerance: 1e-4 m / 2%, 0.5 deg, wrist 2 deg, 1 frame, grip / self-clip
    0.5 cm; traversal scenarios joint rate 25 deg, grip / self-clip 1.5 cm) or a new fail) and every pass / fail flip; like
    modes only (a quick or `--only` run against a full baseline exits 2). Remote rows (A39, A40: `poseError` report-only until step 22) gate `poseError` (gating part, from step 22),
    `pops` at 60 Hz, `pairAlign` and `lodSkip`, against the baseline's noise band (worse than the worse of its two runs by more
    than max(2x their spread, 10%, 2 mm for lengths, 2 counts for pops); `lodSkip` any rise); `lowerBody`, 120 Hz `pops` (both
    vary up to 2x between identical runs through the 120 Hz pump) and the other remote metrics are report-only: listed, not
    counted. The compare output prints which remote metrics are gated and which are report-only. `--band=<baseline.json>` (an
    earlier full run) makes this run's baseline keep both runs' worst and spread for those metrics. Committed baseline
    (two full runs: `--out=r1`, then `--band=r1/baseline.json`): `docs/locomotion/audit/anim-baseline.json` (steps 21-31
    run `--compare` against it and must show no regression).
    In `run-e2e`: the REPORT list (`npm run e2e` runs it, printed REPORT ONLY, never fails the run; REQUIRED from step 32); the
    quick map runs it (with `--quick`) for `src/anim/`, `src/player/` and `src/net/`, and with e2e-netmove for a change to
    `scripts/e2e-net-lib.mjs` (the `-lib` helpers are never suites themselves; `e2e-lib.mjs` reruns CORE).
  Uses the preinstalled Chromium (Pixel 7 landscape emulation, SwiftShader GL - FPS there is not representative).

## Network conditions (locomotion step 20b, D11)
- `E2E_NETSIM=typical node scripts/run-e2e.mjs e2e-netmove e2e-coop` (or a single suite): `e2e-lib` adds `&netsim=typical`
  to every `?net=local` page (the local transport's simulator, coop.md: 80 ms RTT, +-20 ms jitter, 1% loss as
  retransmits, reliable ordered). REPORT mode, never a gate and never in REQUIRED under netsim: `assert` prints
  `NETSIM FAIL - <check>` and carries on (a `until` timeout or thrown error still ends the suite), and the suite ends
  with `NETSIM REPORT (<preset>): N check(s) failed`. Every page runs a probe: `NETSIM-POP` for a remote root step
  more than 25 cm beyond a 7 m/s pace in one frame (host teleport grace excluded), and `NETSIM-STAT` every 5 s (pops,
  worst excess step, host clamps = `RemotePlayer.violations`, simulator sent / retransmitted / max delay).
  `E2E_NETSIM=off` runs the same probe and report mode on a clean network (the baseline: test teleports also show as
  pops there). Results: docs/locomotion/LOG.md "20b".

## GPU runs (Michael's PC only)
- `E2E_GPU=1 npm run e2e` (or any script: `E2E_GPU=1 node scripts/perf.mjs --desktop --budget`): `e2e-lib` launches Chromium with the hardware GPU
  (Windows: ANGLE D3D11, GPU blocklist ignored) instead of SwiftShader. Always headless (no window) with a faked pointer lock (the hidden window's real one grabbed the PC's cursor);
  `E2E_HEADED=1` (debugging) opens a window parked off-screen (faked pointer lock too). Browser: `E2E_BROWSER`, the cloud's
  preinstalled Chromium, else playwright-core's own (`npx playwright-core install chromium`). `navigator.canShare` is stubbed off in
  every run so exports take the download path (Windows would open the OS share sheet). `run-e2e.mjs` serves on 127.0.0.1 on Windows
  (`E2E_HOST` overrides; `localhost` can resolve to a blocked `::1` behind a VPN adapter) and prints each suite's time.
- Graphical and performance checks (perf budgets, contact sheets, visual parity and probe checks, phone-look emulation, beauty
  shots) run here only. Cloud sessions run unit tests and logic e2e and report those checks "pending PC run".
- `perf.mjs` with `E2E_GPU=1` uses the local budget profile (`LOCAL_BUDGET` in the script): no machine-speed scaling, main thread (sim p95 +
  render JS) and rendered frame pacing enforced. Measured on the RTX 4090 laptop (3.5.0, Warehouse, 10 enemies): `gfx=min` sim p95 0.8 ms,
  main 2.6 ms; `--phone` 0.8 / 2.5 ms, 30 draws; `--desktop` (Epic) sim p95 2.2-2.3 ms, animation 0.055-0.067 ms per character, main 4.1-4.4 ms,
  ~205 draws, 0.6 M triangles, frame p99 ~30 ms (spikes). Epic misses the design targets (sim 2 ms, animation 0.04 ms, main 3 ms): the
  profile is a regression check at today's numbers.
- GPU-only: D3D11 compiles the Epic voxel characters' `partSkinMat` shader slowly (several seconds after spawn). An uncompiled
  effect's `_samplerList` holds every candidate (61); it is trimmed to the real list once compiled (11 for `partSkinMat`, 15 for
  the level `voxMat`, limit 16; the phone look peaks at 5, it draws no skin material). `e2e-desktop` therefore waits for the
  effects of every drawn mesh before counting ("every material shader within 16 textures"). Not a texture-unit overflow.

## Debug overlay
- F3 / 3-finger tap. Buttons: Skeleton (bones, controller capsules, hit volumes and foot contacts as lines:
  green = planted, orange = swinging to its landing spot; things register in `ui/debugVolumes.ts`), Tune (sliders
  for `MOVEMENT`, `CAMERA`, `CARRY`) and slow motion (1x / 0.5x / 0.25x). Lines: display Hz + budget, pacing
  p50/p95/p99 + drops, CPU per frame, quality + resolution scale, player, carry, combat, anim (layer
  weights, active clip timeline, `!limit` = joint-rate limiter hits). The bar graph is frame pacing against the
  budget line; `addTrace` graphs values per frame (weapon bob, speed, acceleration, camera angular velocity).

## 3.5 e2e suite lists
- `npm run e2e:editor` (`scripts/e2e-editor.mjs`): the Kestrel level editor driven by a fake controller alone (hold-Y radial, Build > Wall, a 6 m wall drawn with A and the D-pad, X undo and X held redo, View cycling, Build > Door > Double door placed with A, B and Y tap). Starts its own Vite dev server on a free port (the editor is dev-only, never in `dist/`); never saves; `SHOTS=<dir>` keeps screenshots. Not part of the required `npm run e2e` set.
- `scripts/run-e2e.mjs`: `REQUIRED` (what `npm run e2e` runs) and `LEGACY` (`npm run e2e:legacy`: `e2e-progression`, `e2e-cosmetics`, `e2e-clear`, run with
  `LEGACY=1`; report only). `e2e-lib` `openPage` appends `legacy=1` to the params when `LEGACY=1` (or a suite names `legacy=1`); suites can be named on the command
  line (`node scripts/run-e2e.mjs e2e-missions`; add `--legacy` for `LEGACY=1`).
- `scripts/e2e-park.mjs` (3.5): the legacy-off menus (title Night Shift, badge without level / credits, Play lists Infiltration / Training / Free Roam, Loadout root
  rows, every weapon selectable with nothing unlocked or bought, the choice kept across a reload, attachments only, a new co-op room on Infiltration listing
  Infiltration / Free Roam, save export / import) and the legacy-on menus.
- Mixed suites stay required: `e2e-coop` opens its pages with `legacy=1` (its lobby walk-through hosts Wave / Hunter / TDM / FFA rooms); `e2e-missions` expects no
  Ghost / Panther / Assault bars (3 with `LEGACY=1`).

## Dead Line G1 (greybox)
- `node scripts/gen-dead-line.mjs [--check]` regenerates `src/world/maps/deadLine.geo.json` from the design JSON (a test fails when it is stale).
- `scripts/e2e-dead-line.mjs [url] [--routes=M,EX-3] [--verbose]` (REQUIRED): boots `?autostart=dead-line&mode=sandbox`, the real controller walks every design route and VDUCT, every debug teleport, rule 27 camera rays.
- `node scripts/gen-dead-line-v2.mjs [--check]` regenerates `src/world/maps/deadLineV2.geo.json` (Dead Line v2 Area 1 greybox, G1) from `map-dead-line-v2.json`; `tests/deadLineV2Map.test.ts` compares the built level with the JSON (0.25 m) and fails when the file is stale.
- `scripts/e2e-dead-line-v2.mjs [url] [--routes=M,BELOW] [--verbose]` (REQUIRED): boots `?autostart=dead-line-v2&mode=sandbox`, the real controller walks M, UP, UPQ, BELOW and FP1 (ladders, downpipes up and down, drops, doors), floor surfaces, the 17 debug teleports, rule 27 camera rays. `scripts/e2e-dead-line-v2-menu.mjs` (REQUIRED): Play, "Dead Line v2", Deploy, asserts map `dead-line-v2` and the S1 spawn. `E2E_GPU=1 E2E_UNCAP=1 node scripts/g1v2-perf.mjs`: uncapped frame time (`E2E_UNCAP=1` removes the display-rate limit); `node scripts/g1v2-plan.mjs`: top-down render beside the SVG plan.
- `scripts/e2e-security.mjs [url]` (REQUIRED, covers `src/security/`): boots the debug map `?autostart=seclab&mode=sandbox` (off every menu). Kestrel S1 Part A, cameras: a walker in the lit strip is detected within SN08 + 0.5 s, a crouched player in the dark corner is not, the panning camera misses a player at its far pause, a shot camera (the weapon ray hook) stops detecting. Part B adds the desk and panel checks.
- `scripts/e2e-kestrel.mjs [url] [--verbose]` (REQUIRED, covers `src/world/maps/kestrel*`): Kestrel B0 massing walk, boots `?autostart=kestrel&mode=sandbox`. Reads `docs/kestrel/kestrel.blocks.json` through `src/world/maps/kestrelGeo.ts` (esbuild-compiled in the script; no coordinate is typed). Checks the operator stands within 0.7 m of `meta.entry`, a teleport per zone lands on its floor, the real controller walks a tour (entry, front door, main stair, fire stair 2, fire stair 1 to the roof and its ground landing, and back), the camera's two rays (rule 27) along the tour (hits inside the dog-leg cores, at the spawn, and at doors under twice the shoulder offset or inside the A07 corner rule are printed as findings for P04), and the 03B critical path crouched at gear 3 with its walking time (two walls where P04 puts a door are hopped). `node scripts/kestrel/render-top.mjs [url] [outDir] [planDir]`: a top-down section render per level beside `docs/kestrel/plans/blocks-<L>.png` into `docs/kestrel/builds/B0-<L>.png` (needs `npm run build` and a `vite preview` on port 4179).
- `scripts/e2e-camera-bounds.mjs [url] [--verbose]` (REQUIRED, covers `src/player/shoulderCamera.ts`, `src/player/cameraBounds.ts`, `src/config/camera.ts`): the shoulder camera's wall and low-space safety on kestrel in sandbox. Every frame checks a ray from the head to the camera and rays to the four near-plane corners hit nothing, and the camera is inside the run's space: hugging both walls of the longest ground corridor and turning 360 degrees on each shoulder; walking up every stair (inside the core, or out through one of its openings); crouched along level U, or a 1.5 m test box built in the yard while the map has no level U (prints "level U not built yet, rerun after B0"); and the open yard framing (distance and height) within 2% of the pre-CAM values.
- `node docs/archive/maps/design/map-dead-line-v2-analysis.mjs`: Dead Line v2 Area 1 (D1) checks on `map-dead-line-v2.json` with the engine perception, light and noise: route timing, light share, guard cones, the timing window per encounter and route, roof exposure, the FP1 dark window, the vent grating, the sniper reach, the eaves, both bots, rule 27; writes `map-dead-line-v2-validation.md`, `map-dead-line-v2-results.json` and the element register table in `dead-line-v2-area1.md`. `--fast` skips the slow measurements while iterating. `node docs/archive/maps/design/map-dead-line-v2-svg.mjs` draws `dead-line-v2-area1.svg` from the JSON; `node docs/archive/maps/design/map-dead-line-v2-perception.mjs` measures the proposed dim-light rule (`map-dead-line-v2-dimnear.mjs`) on Area 1, the D1 campus and the Trunk Annex.
- `E2E_GPU=1 node scripts/g1-perf.mjs` frame time at six spots; `node scripts/g1-floors.mjs` top-down renders beside the plan (`docs/gates/G1/`).
