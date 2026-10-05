# Changelog

## 0.8.0 - Phase 8: Audio, VFX polish, performance, adaptive quality
- WebAudio engine (no files): compressor, sfx/music/ui buses tied to settings, voice cap, per-sound
  throttling, cheap stereo-pan + distance attenuation for positional sounds. Context unlocks on first gesture.
- Synth SFX: per-class gunshots (near and distant/muffled enemy fire), reload clicks, dry fire, swap,
  impacts, hit/headshot/kill cues, hurt, explosions, grenade throw, runner swipe, heavy wind-up, footsteps,
  pickups, objective chime, wave/alarm horn, level-up arpeggio, UI move/confirm/back/denied.
- Procedural music: minor chord pad bed + combat layer (bass pulse, kick, hats) that fades with the
  number of active enemies.
- Adaptive quality (`core/quality.ts`, pure + tested): four levels (render scale, DPR cap, shadows,
  shadow refresh rate, VFX density); 'Auto' steps down after ~2 s of slow frames and up after ~12 s of
  headroom, with warm-up and cooldowns; fixed presets also available. Live-applied, shown in the FPS overlay.
- Level shading plugin: distance-faded world grid, wall-base contact darkening, face tint, speckle.
- Enemy hit flash, ejected casings, landing dust + camera thump.
- Performance: nav-grid searches no longer allocate (generator removed) - CPU per fixed step with 10
  enemies fell from ~1.9 ms to ~1.0 ms and GC churn from ~3.6 MB/s to ~0.9 MB/s in the headless probe;
  camera collision rays reuse results; enemy movement reuses vectors. ~10 draw calls in a 10-enemy fight.
- `scripts/perf.mjs` performance probe. Fixed: sounds could throw before audio was unlocked.

## 0.7.0 - Phase 7: Avatar customiser and cosmetics
- Customiser with live 3D preview on the menu stage (rotate by right stick or drag): body type, head,
  hair, torso, legs, helmet, backpack, skin/hair/clothing/accent/boot/gear colours, clothing pattern.
- Procedural patterns via a StandardMaterial plugin with per-instance attributes (`pattern`, `color2`):
  stripes, camo, digital, tiger, checker, carbon, hex. Still one draw call per part shape.
- Weapon camos: Factory, mastery camos per weapon (Woodland, Desert, Urban, Tiger, Gold at mastery 1-5)
  and Store camos (Carbon, Arctic, Neon); picked in the Armory, shown in the preview and in matches.
- Cosmetic catalogue registers every part, pattern, camo, emote, title and emblem in the unlock table
  with level/price/mastery requirements; locked items can be previewed (with an Unlock button) but are
  never saved until owned.
- Emotes (wave, salute, point, dance, flex, clap, laugh) as procedural rig poses; 4 slots, d-pad
  right/down/left in matches, emote bar in the pause menu, cancelled by moving or shooting.
- Player tag: callsign (text or random), title, emblem, colour; shown on the profile badge.
- `scripts/e2e-cosmetics.mjs`.

## 0.6.0 - Phase 6: Progression, unlocks, upgrades, saves
- XP and levels (1-50, quadratic curve), credits, level-up bonus credits (`progression/levels.ts`).
- Match rewards from kills by type, headshots, waves/objectives, victory, accuracy, difficulty
  multiplier; clamped against bad input (`progression/rewards.ts`).
- Weapon mastery from kills (5 levels). Upgrade trees per weapon: damage, magazine, recoil, reload
  (5 levels each, credit cost scaled by weapon tier, player-level gates).
- Attachments (optic, barrel, underbarrel, magazine; 8 total) as multiplicative stat modifiers,
  one per slot, weapon compatibility rules. Suppressor reduces gunfire alert radius.
- Unlock tables (`progression/unlocks.ts`) for weapons and attachments with level/mastery/price
  requirements; free items auto-granted; extensible for cosmetics.
- Save system: IndexedDB profile with versioned schema (v3), migrations from v1/v2, sanitiser that
  repairs tampered values, automatic backups before migrations/imports/resets (last 3 kept),
  export to a JSON file (share sheet on mobile, download elsewhere) and import with confirmation.
- UI: profile badge (level, XP bar, credits, tag), Armory (loadout, stat bars with upgrade deltas,
  upgrade tree, attachment slots, mastery), Store (unlock catalogue by category), rewards breakdown
  with animated XP bar and level-up/unlock notices, Settings > Data tab.
- Locked/unaffordable buttons stay focusable for controllers and explain why when pressed.
- Spatial navigation scoring uses edge gaps (more reliable in multi-column screens).
- `scripts/e2e-progression.mjs`.

## 0.5.0 - Phase 5: Enemies, AI, modes, second map
- Nav grid (`ai/navGrid.ts`, pure): heights sampled from Havok at load, walls/cover/pillars rasterised
  analytically with agent radius, step-height connectivity, unreachable islands pruned. A* with string
  pulling, multi-source Dijkstra flow field (shared chase field, refreshed at 2 Hz), line checks.
- Enemies from `config/enemies.json` (validated): Grunt (rifle bursts, takes cover, peeks from low cover,
  steps out from high cover, abandons flanked cover), Runner (zigzag charge, lunge, melee), Heavy (armour,
  minigun wind-up, staggers). Perception with LOS + view cone + gunfire noise, accuracy that settles over
  time and drops against moving targets, separation steering, nav-constrained movement.
- Three-body physics ragdolls (ball-and-socket hips), budget-capped, settle then sink.
- Wave Survival: escalating compositions (pure, tested), off-screen spawn selection, intermissions,
  pickups refresh, scoring, game over -> results.
- Mission "Operation Blackout": pre-placed unaware squads, hold-to-hack terminals, intel cache, alarm
  reinforcements, timed extraction zone, 3 lives with checkpoints.
- Second map "Dust Depot": procedural 3x3 compound from modules (warehouses, container yard, ruins,
  plaza with high ground), seeded variation.
- Walk-over ammo/health pickups, objective props with HUD prompt and hold progress.
- Play setup screen (mode, map, difficulty), results screen (Play again / Main menu).
- Difficulty (enemy damage, accuracy, health). Spawn protection after respawn.
- `GameLoop.stepHeadless()` for fast automated simulation; `scripts/e2e-modes.mjs`.

## 0.4.0 - Phase 4: Shooting and HUD
- Data-driven weapons (`config/weapons.json`, validated on load): pistol, SMG, assault rifle, shotgun
  (9 pellets), sniper (swept-ray projectile with drop), plus frag grenade (`config/grenade.json`).
  Per-weapon fire rate, fire mode, spread (hip/ADS/move/bloom), recoil pattern, damage falloff, head
  multiplier, magazine, reserve, reload time, ADS zoom, move speed, impulse, primitive model parts.
- Pure stats maths (`weapons/weaponStats.ts`): upgrade tracks (damage, magazine, recoil, reload), falloff,
  spread, recoil pattern, DPS. Unit-tested, including balance invariants.
- Hit detection: crosshair ray from the player's depth along the camera, then muzzle-to-aim-point ray;
  shoulder-to-muzzle check so cover in front of the barrel is respected. Head and body hit volumes.
- Damage registry, health + regenerating shield, explosions with line-of-sight and falloff, explosive
  barrels (chain reactions queued), prop impulses, player death and respawn.
- Aim assist (friction, magnetism, ADS snap) for controller and touch, levels Off/Low/Standard/High.
- Recoil (mostly transient with recovery), camera shake on firing/explosions, controller rumble.
- Pooled instanced VFX: tracers, muzzle flash, sparks, dust, bullet decals, explosions.
- HUD: health/shield, ammo + grenades, dynamic crosshair (spread, on-target), hit/headshot/kill markers,
  reload ring, damage direction arcs, low-health vignette, compass with markers, rotating minimap,
  objective line, banner, interact prompt, feed.
- Sandbox mode: all five weapons, infinite reserve, training dummies (static and strafing) that respawn.
- `scripts/e2e-combat.mjs`.

## 0.3.0 - Phase 3: Player, camera, test map
- Havok `PhysicsCharacterController` player: walk/sprint/crouch/roll/jump, slopes up to ~50°, ray-probe step
  assist for steps up to 0.42 m (Havok's own step-up needs the sweep to clear the capsule radius), ground
  stick force along the surface normal, headroom check before standing, render interpolation.
- Over-the-shoulder camera: shoulder swap (smooth), ADS boom and FOV zoom, boom collision against static
  geometry (snap in, ease out), recoil with recovery, trauma shake, smoothed foot height, horizontal FOV.
- Modular level kit: boxes/ramps/stairs/walls/cover/pillars rendered as thin instances (1 draw call per
  shape) and one static Havok body with a container shape. Stairs collide as a smooth invisible ramp.
- Primitive modular character rig (body type, head, hair, torso, legs, backpack, helmet) with procedural
  walk/crouch/roll/air/aim animation; parts are instanced from a shared part library (per-instance colour).
- Physics props (crates, barrels, explosive barrels, boxes), instanced, budget-capped, pushable.
- Proving Grounds test map: step row, slope row, stairs and ramp onto a platform, crouch tunnel, cover.
- Sky dome, fog, sun with optional shadow map following the player.
- `scripts/e2e-move.mjs`: automated movement checks (walk speed, jump, crouch, roll, steps, slopes, stairs,
  tunnel, prop pushing).

## 0.2.0 - Phase 2: Input and menus
- Action map with touch, gamepad (standard mapping) and keyboard/mouse sources feeding one `InputState`.
- Touch: floating left stick (push past rim to sprint), right-side look, fire-and-look button, ADS, reload,
  jump, crouch/roll, swap, grenade, interact, shoulder swap, pause. Size, opacity and per-control position
  configurable; drag-to-edit layout editor that also works by controller (grab, move, resize).
- Gamepad: radial dead zones, trigger dead zone, response curves, invert-Y, per-axis and ADS sensitivity,
  aim-assist level setting, vibration with test button. Hot-plug, iOS first-press detection, connect toasts.
- Automatic input-mode switching (touch / controller / keyboard), Xbox and PlayStation glyph prompts.
- Shared spatial focus-navigation system; screen stack; main menu, settings (Touch, Controller, Video,
  Audio, Gameplay tabs), pause menu, confirm dialog, toasts. Bumpers switch tabs.
- Settings stored in IndexedDB, sanitised/clamped on load.
- Controls test bed showing live action state.
- Headless e2e suites: controller-only menu walkthrough and touch multi-touch test (`npm run e2e`).

## 0.1.0 - Phase 1: Scaffold
- Vite 7 + TypeScript 6 (strict) + Babylon.js 9 + Havok physics with locally bundled WASM.
- Fixed-timestep game loop with manual physics stepping.
- PWA: manifest (fullscreen, landscape), procedurally generated icons, Workbox precache of the full build incl. WASM.
- Rotate-to-landscape overlay, fullscreen/orientation-lock helper, browser gesture suppression, safe-area CSS vars.
- Debug overlay (F3 / 3-finger tap / `?debug=1`): FPS, frame-time graph, sim/physics ms, draw calls, resolution.
- GitHub Actions workflow: lint, test, build with repo base path, deploy to Pages.
- Headless mobile-emulated smoke test script.
