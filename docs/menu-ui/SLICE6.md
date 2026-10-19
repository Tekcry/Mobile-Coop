# Menu UI - slice 6 (cinematic menu background)

Branch `feature/menu`, 2026-10-19 (overnight, unattended). Prototype first (G87), desktop only (G12). Covers step 11
(the shot director) in full and step 12 in a reworked form. The orchestrator's override let this slice edit
`src/world/menuScene.ts`.

## Direction changes during the slice (Michael, through the orchestrator)
1. **Brief**: step 12 reduced to S1 door peek, S2 wall edge with blinds, S3 inverted pipe, all primitive rooms.
2. **No pipes** (Michael): S3 became a standing overhead-pool setup. Wren stands idle in every shot.
3. **Hero close-ups in a black void** (Michael, after the first room shots): no rooms or set pieces. Hard key and rim
   light on the hero LOD. The rooms (door, blinds, pool) were built, shot and then removed.
   Michael showed the Batman: Arkham Knight title and main menu as a **style reference only**: no shot, asset or
   other IP is copied from it.
4. **Darker and moodier, no weapon**: mostly rim light and a narrow key, the face in shadow, the goggle as the focal
   point. The old voxel weapon is hidden in the void.
5. **Cinematography over flat angles** (Michael: "all of your angles are just flat in different locations"): every
   shot has its own angle, lens and pass (arc, crane, track, tilt, orbit, push) plus light passes (a sweep, a rim
   swing, the goggle powering on). Nothing is framed straight on.
6. **Final direction** (Michael):
   - **Title**: a close-up of Wren facing the camera, framed on the face and night-vision goggle, right of centre. The
     lenses start dark, flicker, then lock on.
   - **Into the main menu**: pressing start carries the same shot on with no cut, eases back to clear the list, holds,
     then the equipment shots begin.
   - **Equipment shots**: macros of hard, tactical equipment and armour only. No straps, buckles, webbing, knee pads or
     clothing details.
   - The time-box was lifted: "Take your time, I'd rather you get me a complete prototype."

## Built
- **Director** (`src/world/menuShots.ts`, pure, no Babylon import, no allocation in `update`):
  - Contexts title / main / loadout / lobby.
  - **Title**: T1 plays once and holds its last frame (`once`).
  - **Main cycle**: opens on T2 (`intro`), the title shot carried on, then a seeded deck of H1-H6. Every shot plays
    once per round and none repeats back to back.
  - **Transitions**: a 1.6 s crossfade through black; a 0.4 s cut to black when the light family differs (unused now:
    every shot shares the void's light).
  - Loadout = S6 and lobby = S7, both today's stage.
  - **Reduced motion** (`prefers-reduced-motion`; no menu setting exists yet): a still frame, with the title on its last
    frame so the goggle is lit and the main menu on T2.
  - Returning from a sub-screen keeps the main cycle where it was.
  - **Debug hooks**: `?menuShot=<id>` (holds a shot), `?menuClock=fast` (8x), `?menuT=<0..1>` (freezes a held shot at
    that moment, for screenshots).
  - Pure helpers: `easeInOut` and `goggleLevel` (off, a stuttering ramp, then full).
- **Shots** (`src/world/menuSets.ts`, lights plus camera paths, no set pieces):
  - Each hero shot has a lens (`fov`), a start and an end camera pose eased over the shot, and a horizontal placement
    (`frameX`, Wren right of centre, the list over black).
  - Each has three shared spot lights. A light with `to` or `atTo` moves its lamp or its aim over the shot (the sweeps).
  - `goggleOn` sets the power-on window. `glowLight` names a light that follows the goggle level (its green on the
    cheeks).
  - The void's only geometry is a near-black floor disc and an optional back glow card (built at start, unused by the
    current shots).
  - T1 title: a 22 degree lens on her face and goggle, three-quarter, a slow push. The goggle flickers on at 12-36 % of
    the shot.
  - T2 main menu opening: from T1's last frame, eases back and a little round, held 10 s.
  - H1 goggle unit: an 18 degree lens, low from her left front, arcing in.
  - H2 front plate: low from her left, a push.
  - H3 magazine pouches: low from her right, a slide while the key sweeps across.
  - H4 belt pouches: low three-quarter, a slide under a grazing beam.
  - H5 thigh holster: from her right, an orbit round the front.
  - H6 back plate: high from behind her left shoulder, an arc.
  - The equipment rig (`macro`): a narrow key raking in about 95 degrees from the lens, so normal detail and edges
    catch. A rim behind the piece and a weaker rim on the other side.
- **Stage** (`src/world/menuScene.ts`):
  - The director runs every frame; `main.ts` tells it which screen is on top (title / lobby / main; the loadout framing
    means loadout).
  - A shot change only moves the three shared spots and the camera and toggles stage / void meshes. Nothing is built or
    compiled per shot.
  - The camera pass is applied with a slow hand-held drift. A change with no black over it (title into the main menu)
    eases the camera across in 1.6 s.
  - Goggle power-on: the per-player glow colour is scaled through `OperatorFigure.setGlowColour`, with no edit to the
    operators code.
  - The fade is a DOM layer over the canvas, under the menus. Navigation is never blocked.
  - Wren is holstered (the weapon is hidden) with the rig's breathing idle plus a slow yaw sway. The loadout and the
    lobby get the weapon back in the hands on today's stage, unchanged.
  - Debug hook: `MenuState.shotId`, `shotChanges`, `shotFade`, `shotContext` (read as `window.__app.current.shotId`).
- **Hero LOD**: `setAvatar` asks for `loadCloseUp()` right away, next to the existing progressive chain (`loadMenuLods`).
  The menu camera is in `CLOSE_CAMERAS`, so the PC (any preset but `?gfx=min`) shows the hero LOD as soon as it loads.
  `?gfx=min` (software-GL tests) shows LOD2. A failed load keeps the lower LOD on screen.
- **Fix outside the slice**: `src/core/babylon.ts` gains the side-effect import of `procedural.vertex`. Without it the
  surface atlas's ProceduralTexture fetched the shader by URL, Vite returned index.html, and the menu rendered black in
  dev with a `SurfacePlugin.bindForSubMesh` null error on every frame. It is the same at the merge commit 98f0a95 (from
  the Wren merge), not caused by this slice.
- **Tests**:
  - `tests/menuShots.test.ts` (16): determinism; T2 first and never again; the deck (no repeat inside a round, never back
    to back); durations 10-16 s; crossfade and cut windows; reduced motion; title once and hold; sub-contexts resume the
    main cycle; the hooks, including `?menuT`; easing; the goggle ramp (off, dips, full); each hero shot has a real pass,
    several lenses and no equipment shot straight on; every director shot has a hero shot; no allocation in `update`.
  - `scripts/e2e-menus.mjs`: the parity checks run over the held T2 shot (`?menuShot=T2`, the cheapest background), so a
    software-GL frame rate under load never starves the pad hold-repeat timing. `sameBoxes` settles for 400 ms after
    each device switch: at a fast frame rate two frames fell inside the CSS transitions. Its own pages check the rest:
    `?menuShot=H3` reports H3 through the hook; `?menuClock=fast` changes the shot within a few
    seconds; the focus moves during a fade, then by a real key press; reduced motion holds T2 with no change and no
    fade; no page errors.
- **Screenshots**: `scripts/menu-shots6.mjs` writes 1920x1080 PNGs, frozen with `?menuT`. Software GL by default; the
  GPU run uses `E2E_GPU=1 SHOT_GFX=high`.

## Files
- New: `src/world/menuShots.ts`, `src/world/menuSets.ts`, `tests/menuShots.test.ts`, `scripts/menu-shots6.mjs`,
  `docs/menu-ui/SLICE6.md`, `docs/menu-ui/shots/6-hero-*.png`, `docs/menu-ui/shots/6-hero-gpu-*.png`.
- Changed: `src/world/menuScene.ts` (director, void shots, hero LOD request, weapon hidden in the void),
  `src/main.ts` (`screenContext`), `src/core/babylon.ts` (procedural vertex shader import),
  `scripts/e2e-menus.mjs` (slice 6 block).
- Left out: `tests/__snapshots__/visionIsolation.test.ts.snap` (line endings only).

## Findings
- **Textures**: the menu uses the game's material path (`buildLodAsset`, the same KTX2 loader). A GPU probe showed the
  hero LOD's textures all ready: cloth albedo 4096, kit and hardware 2048, normal and ORM maps. The early "clay" look
  was lighting, not textures. A flat frontal key at high gain, plus shadow maps whose self-shadow acne at 1 m turned
  the suit black.
- **Shadows are off in the void**. On the stage they are as before.
- The old voxel weapon's standard material has no distance falloff, so close-up light gain blew it out. It is hidden in
  the void until the Blender weapons arrive.
- A narrow key on the old white projection texture showed a square edge, so the key no longer has a projection texture.
- **Software GL**: a full-frame PBR close-up drew at about 3 fps at 1080p in SwiftShader (the old stage about 4-5 fps
  with Settings open, with the PC at 99 % CPU from other work). Under `?gfx=min` only (the test path), the void renders at
  a third of the resolution. Every real preset renders at full resolution.
- The idle stance (knees slightly bent, arms a little out) reads oddly from a low side angle. It is animation-owned and
  not changed here; the macro shots avoid showing it.

## Fine-tune pass (after checkpoint b1ead8a, until 08:00)
Progress log with times: `docs/menu-ui/SLICE6-PROGRESS.md`. GPU shots: `docs/menu-ui/shots/6-hero-gpu-*.png`.
- **Lights**: T1 face key 1.8 -> 2.7; H6 key 4.5 -> 7.5 and raised to rake down the back plate (its edges and fittings
  read); H3 key 3.2 -> 7 (the magazine pouches read); macro main rim 6 -> 7.
- **Framing**: H3 lower onto the magazine pouches with a narrower slide, so they stay in frame from start to end. H4 lower
  onto the belt pouches and further round so the hand leaves the frame (a soft forearm stays at the left edge, behind the
  list; a high-angle version was tried and read worse). H2's key slides down the plate. H1 reframed up and right (the target lower and forward on
  the goggle, a touch further out) so both lenses stay clear of the description panel for the whole pass.
- **Shadows in the void: tried and dropped.** Only the key cast, with its depth range fitted per shot (bias 0.004, normal
  bias 0.025). There was no acne, but the arm and shoulders swallowed the raking key on H2-H6 (they went dark), so the
  void stays unshadowed. `tuneShadow()` keeps the stage's values.
- **Depth of field per shot**: `PostStack.lensMm` drives the DOF focal length; H1 62 mm, others 50 (presets with DOF,
  high and up). The stage resets it to 50.
- **Dutch roll**: per-shot roll (H1 +0.07, H3 -0.09, H5 +0.12 rad) via `MenuState.dutch()`, the camera's up turned about
  the line of sight. Start, middle and end frames checked: the framing holds.
- **Fades** ease (smoothstep). **Title flicker**: `goggleLevel` is authored (two blips, a stutter, a warm-up ramp with a
  shimmer that settles).
- `scripts/menu-shots6.mjs`: a 180 s screenshot timeout (software GL under load timed out at 30 s).

## Skipped / polish list
- Shadows on the close-ups: a key that casts but is not blocked by the arm needs per-mesh casters (the body is one skinned
  mesh) or keys placed clear of the arms; not done.
- The SPEC 8.1 rooms (S1-S5), S7 lobby stack, phones, `perf.mjs --menu` and the SPEC 8.4 budgets, the
  `menu-sheet.mjs` contact sheet (`menu-shots6.mjs` covers the stills), removing `DevMenuScreen`.
- A menu reduced-motion setting (MD17): the director reads the OS preference only.
- Weapons in the void once the Blender weapons exist.

## Open items
- A GPU perf check of the void (hero LOD, three spots, no shadows) against the menu budget: pending a PC run.
- Whether the title should also run the flicker after a match (it plays once per menu stage: today the title shows once
  per launch).

## Results
- Checkpoint b1ead8a: `npm run check`, smoke, e2e-menus and e2e-desktop green.
- Fine-tune pass (2026-10-19, 05:10), port 4191, one runner at a time, `E2E_SUITE_TIMEOUT=1700`, another session loading
  the PC:
  - `npm run check`: pass (lint 0 errors / 41 warnings, 141 files / 1600 tests pass, 1 skipped, build ok).
  - e2e-menus: pass. smoke: pass.
  - e2e-desktop: failed once on "the result is saved as a performance note without a tap" (the benchmark's feedback save
    raced the assert at 3 fps under load; not menu-background code), then passed on a solo rerun (634 s).
- Shots: `docs/menu-ui/shots/6-hero-gpu-*.png` (GPU, `SHOT_GFX=high`, hero LOD) and `6-hero-*.png` (software GL; T1 and H1
  show LOD2 there, layout only).
- GPU perf of the void: pending a PC run with `perf.mjs` (not run).
