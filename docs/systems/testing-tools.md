# Commands, e2e suites, test helpers and the debug overlay
Purpose: every npm command, the headless e2e suites with what each checks, the helper scripts and the in-game debug overlay.
Design authority: docs/design-bible.md (Section 9, definition of done)

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run e2e` - serves `dist/` and runs the headless e2e suites (needs a prior `npm run build`):
  - `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot)
  - `scripts/e2e-pad.mjs` controller-only navigation through every menu using a fake Gamepad API pad; 3.2.0 in a match:
    D-pad up / down gears, D-pad left tap vs hold (wheel), View tap goggles / hold emote
  - `scripts/e2e-touch.mjs` touch-only: taps menus, floating move stick, rate-based camera stick, drag-look,
    fire button never moves the camera, control sizes, action button only for "use", take-cover prompt tap, no cover badge in cover, a push away leaves;
    3.2.0 speed rocker (up / down halves, pips, HUD pips fade), a forward roll by touch, the jump button, the action
    button dimmed when idle / taking cover at the prompt, prompts are indicators only
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
    aiming, after a sprint / cover / lean, no residual offsets, level horizon after a shake) + headless cover bars: 3 m snap glide, hand
    contact, sticky exit, sprint slide, edge peeks, peek in/out timing, left-edge hand switch, corner offered and swung on the button (never automatic), no spin from quick aim /
    direction changes, tuck,
    auto shoulder, routed cover-to-cover, push-back cancel
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
    `REPORT=1`) shows the look before Step 4b (no curve, the old phone floor)
  - `scripts/e2e-combat.mjs` weapons, hits, headshots, reload, swap, grenades, barrels, death/respawn
  - `scripts/e2e-modes.mjs` wave progression, mission flow, enemy types, ragdolls
  - `scripts/e2e-progression.mjs` Loadout by controller (live weapon preview, lock line, upgrade, buy in place), suit / HQ by touch, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-cover.mjs` (A cover, B crouch, Y traverse) snap side-on, turn-and-swap, kneel, peek/blind
    fire/vault, B keeps cover, stand/crouch at high cover + crouched edge peek, lean in place, outside corners (corner prompt + A, never automatic) /
    inside corners, edge stop a step back, no cover badge, SWAT turn, cover-to-cover only when looking at it with the stick held towards it + slide + marker,
    world prompts (low on the surface; 3.2.0: the touch action button does what they show), manual cover only (walking / sprinting into a wall never
    snaps), crouched aim over low cover, keyboard Space; 3.2.0 cover strafe pace by gear
  - `scripts/e2e-clip.mjs` traversal: no body point (trunk, head, thighs, calves, upper arms; raycast from the hips)
    > 3 cm into the world while climbing, hanging, shimmying, climbing up, crawling, dropping through a vent,
    vaulting a window, on a zipline or rolling; plus the weapon clipping sweep: every frame of wall-side movement, high / low cover (idle,
    moving, turn-and-swap, reload, swap), edge-peek aim sweeps both edges standing / crouched (with step-out),
    aim over, vault, aim every weapon, aim walking / crouched: no gun point inside the world (> 2 cm), legs grazed
    <= 2.5 cm, gun clear of the head (> -1 cm) and trunk (> -2 cm), elbows (> -3 cm), knees above the floor and
    > 9 cm apart, feet > 6 cm apart (`--only=name --log`)
  - `scripts/e2e-tactics.mjs` doorway check, contextual lean, slicing the pie, split hit volumes, suppression,
    exposure HUD, enemy grenades/flanker, footstep noise investigation, a wall muffles a noise
  - `scripts/e2e-takedown.mjs` takedown kinds (ground rules, over low cover, above, below, window; 3.2.0: the grab -
    walk, sidearm, human shield, knock out / kill / shove - and drop attacks from a pipe / split, the inverted choke), tap / hold,
    5 cm alignment, damage interrupt, Execute charge, marks through cover, no execute out of sight, execute; no takedown
    on a guard in combat who saw you, one alerted without seeing you still can be
  - `scripts/e2e-enemies.mjs` heavy (plates / back / face plate, lethal-only frontal takedown), enforcer (shield,
    no frontal grab, pushes), sniper (laser, glint refuses a mark, relocates), dog (smell in the dark, takedown),
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
    ways, a client execute, a client gas cloud on the host's guards, a dual takedown, a client reviving the host),
    Infiltration objectives on the client, Team Deathmatch (teams, opponents-only hit volumes, no friendly fire,
    a validated elimination, respawn, results; 3.1.9: each player's own FOV, no cap) and
    Free-for-all; host leaving, offline
  - `scripts/e2e-cosmetics.mjs` Loadout appearance by controller, live / locked previews on the operator, revert on exit, emotes, camo, in-game look
  - `scripts/e2e-clear.mjs` Warehouse + Clear mode: only "Enemies left N" (alive + pending), no room tags /
    counts / lives / score / blips, no per-room feedback, "DOWN", OPERATION COMPLETE stinger, results without a
    rooms row; Wave keeps room tags; doorway checks; mini room set; the Play screen: Warehouse default for every mode
    but Training, Infiltration lists the Warehouse missions only
  - `scripts/e2e-training.mjs` the training course by touch: hints per device, each step advancing, the
    Takedown / Mark / Execute buttons, HUD defaults (no health bar, ammo fades), the results
  - `scripts/e2e-netmove.mjs` (3.2.0) two pages `?net=local`, Free Roam on Proving: the client in low cover (+ over
    peek), high cover (+ edge peek), ladder (+ after a climb), drainpipe, pipe, ledge, duct (hands / feet / head within
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
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast. `e2e-lib` adds
  `?gfx=min` (every graphics feature off, DPR 1; not saved) unless the params name a `gfx=` (a preset, or `user`
  for the saved settings): the PC renderer at Epic on software GL takes seconds per frame.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the Loadout operator (proportion/silhouette checks)
  - `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
    reload|swap|grenade|cover|highcover|peek|vault> [frames] [interval] [side|front|back|ots]` contact sheet
  - `node scripts/perf.mjs [--desktop | --phone] [--preset=<p> [--mobile]] [--budget]` (`--phone` (3.6): the real phone light look, its own budget; `--preset`: 3.1 phone budgets per preset; `--desktop`: the PC path at `?gfx=epic`; else the `?gfx=min` test
    path; `STEALTH=1`: ten unaware enemies perceiving) Warehouse, 10 enemies: main thread p95 (sim per 120 Hz frame +
    the render's JS), animation ms per character, allocations per second (top allocators), draw calls and triangles
    over every pass (`PROFILE=1` CPU profile)
  - `node scripts/soak.mjs [minutes=10] [url]` (`MAP=`, `MODE=`) real-time soak: pacing, CPU, adaptive quality, heap growth (leak check)
  Uses the preinstalled Chromium (Pixel 7 landscape emulation, SwiftShader GL - FPS there is not representative).

## GPU runs (Michael's PC only)
- `E2E_GPU=1 npm run e2e` (or any script: `E2E_GPU=1 node scripts/perf.mjs --desktop --budget`): `e2e-lib` launches Chromium with the hardware GPU
  (Windows: ANGLE D3D11, GPU blocklist ignored) instead of SwiftShader. Always headless (no window, no real pointer lock);
  `E2E_HEADED=1` (debugging) opens a window parked off-screen with a faked pointer lock. Browser: `E2E_BROWSER`, the cloud's
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
  p50/p95/p99 + drops, CPU per frame, quality + resolution scale, player, carry, cover, combat, anim (layer
  weights, active clip timeline, `!limit` = joint-rate limiter hits). The bar graph is frame pacing against the
  budget line; `addTrace` graphs values per frame (weapon bob, speed, acceleration, camera angular velocity).

## 3.5 e2e suite lists
- `scripts/run-e2e.mjs`: `REQUIRED` (what `npm run e2e` runs) and `LEGACY` (`npm run e2e:legacy`: `e2e-progression`, `e2e-cosmetics`, `e2e-clear`, run with
  `LEGACY=1`; report only). `e2e-lib` `openPage` appends `legacy=1` to the params when `LEGACY=1` (or a suite names `legacy=1`); suites can be named on the command
  line (`node scripts/run-e2e.mjs e2e-missions`; add `--legacy` for `LEGACY=1`).
- `scripts/e2e-park.mjs` (3.5): the legacy-off menus (title Night Shift, badge without level / credits, Play lists Infiltration / Training / Free Roam, Loadout root
  rows, every weapon selectable with nothing unlocked or bought, the choice kept across a reload, attachments only, a new co-op room on Infiltration listing
  Infiltration / Free Roam, save export / import) and the legacy-on menus.
- Mixed suites stay required: `e2e-coop` opens its pages with `legacy=1` (its lobby walk-through hosts Wave / Hunter / TDM / FFA rooms); `e2e-missions` expects no
  Ghost / Panther / Assault bars (3 with `LEGACY=1`).
