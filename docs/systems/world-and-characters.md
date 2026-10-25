# World, level design pointers and characters
Owner: Player Build (characters, guard models). Status: current.
Purpose: maps, the level builder, the Warehouse, and the shared character rig (proportions, animation, foot planner, weapons).
Design authority: docs/DECISIONS.md (G53-G57, G68-G75), then docs/design-bible.md (Sections 5.12 and 7).

## Level design
- The level rules live in `docs/level-design.md` only (the standard every map follows, per mode); this file does not
  restate them. Read it, then docs/DECISIONS.md, before laying out a map.
- `docs/templates/map-spec.md`: the template for a new map's spec (fill it, then run its phases).
- Map specs: Marlow Yard in `docs/marlow-final/` (SPEC.md, PLAN.md), Saltmarsh Park in `docs/sector-redesign/`
  (SPEC.md, PLAN.md), Tallow Wharf (campaign Mission 1) and the first four mission prototypes in `docs/missions/` (the
  mission-framework job, PR #372), Kestrel in `docs/kestrel/` (paused, G53), the Fallow bunker in
  `docs/archive/training/`. Decided, not built yet (G55): one folder per map under one maps folder. The retired maps
  (the 1934 Exchange, Trunk Annex, Dead Line v1 and v2) are deleted; their design files are in `docs/archive/maps/`.

## World and player
- Maps (`world/maps/*.ts`) are `MapDef`s: a `build(builder, seed)` that places modular pieces through
  `LevelBuilder` and returns a `MapLayout` (spawns, props, objectives, pickups, optional `rooms`). Register in
  `world/maps/index.ts` (`MAPS`: `warehouse`, `warehouseOps` (the old Sector Ops map), `campusOps` (Saltmarsh Park,
  Sector Ops), `proving` (Proving Grounds), `kestrel`, `seclab` (debug map, off every menu), `ctcourse` (Marlow Yard,
  Course mode), `courselab`, and with `?legacy=1` `bunker` (the Fallow bunker, built from `bunkerUpper` /
  `bunkerPlant` / `bunkerShaft` / `bunkerDeep`); an unknown id falls back to Proving Grounds). `listed.ts`
  `LISTED_MAP_IDS` (`warehouse`, `proving`, `kestrel`, `campusOps`) is the pure list content filters on (`MISSIONS` = `ALL_MISSIONS` on listed maps); the first map listing a
  mode is its default (a mode change on the Play screen starts on its default map). The 2.x maps are parked in
  `maps/parked.ts` (not imported). Free Roam
  (`sandbox`) places the training dummies only on Proving Grounds. `LevelBuilder.wallX/wallZ` build walls with door gaps.
- Warehouse (`world/maps/warehouse.ts`): truck yard, loading dock, dispatch, workshop, a 2.2 m service corridor,
  racking aisles, factory floor, a mezzanine deck (stairs) and two offices; roofed (visual only: roof and lights
  do not collide, so the nav sampler sees the floor) with skylight strips. Nine tagged rooms with squads (3.2.0: the
  corridor has a patrol). 3.2.0 Chaos Theory routes: the south roof strip (x -22..21, top 6.275) is a solid walkway
  (`overhead`, metal surface) reached by a drainpipe (west yard) or from the 4.2 m pump house (east lot; co-op boost /
  human ladder), a rappel point over the dispatch window, the corridor's walls at 4 m over x 6.5..11.5 (a 1.86 m split gap), a deck
  pipe from the mezzanine (x 17, 4.4 m) over the floor patrol, the press at 3.3 m (wall jump), a yard fence (x 14.5)
  closing the dark lane off from the east lot (`scripts/e2e-ct-warehouse.mjs`). Proving
  Grounds has a three-room mini set (north west) for tests. (Locomotion step 13) the Proving shed's north doorway
  (x 24.4-25.6, z -2) has a hinged door (`b.door(24.4, 0, -2, 1.2, PI / 2, { swing: 1 })`, swinging into the shed,
  `doors.list[0]`) for the door-peek e2e and audit cases; the wall-edge doorway cases (step 12, the 1.1 m gap at
  z +-8) are unaffected.
- Door crack (locomotion step 13, A25 / A52, `world/doors.ts`): `Doors.crack(d, on)` eases the drawn leaf
  (`DoorState.ajar`) to `DOOR.crack` 0.12 of the swing over `DOOR.crackTime` 0.6 s (closed in 0.4 s) and sets
  `DoorState.cracked`; the swing `open` stays 0, so the collision body, the light field and baked lamps (`DOOR_SHUT`
  0.15) and guard sight see a closed door (nothing in `src/ai`, the light bake or the lamp bake reads `cracked`). A
  full open (`open` / `setOpen`, anyone, guards walking through included) clears `cracked` and swings on from the
  cracked angle. The door-peek core (pure, Babylon-free) is `world/doorPeek.ts` (see movement.md). Built (G97, G41):
  the CT door menu (movement.md); one 15% door threshold, `DOOR.driveShut` 0.15 for a stick-driven door and
  `DOOR_SHUT` 0.15 for light (sector-batch); guards close doors behind them on a calm patrol and notice a door open
  that should be shut (docs/systems/ai.md).
- `LevelBuilder.build` emits thin instances (boxes, cylinders) and one static body with a container shape.
  Use `visible=false` pieces for collision-only helpers (stairs collide as a ramp).
- Characters use `CharacterRig` (see "Characters" below) with a `PartFactory`; `PartLibrary` instances share unit meshes and one
  material with per-instance colour, so any number of characters costs ~5 draw calls.
- `PlayerController` runs in `fixedUpdate`; `Player.frameUpdate` interpolates, updates camera and animation.
- Collision groups/masks/budgets live in `physics/groups.ts`. Shots raycast with membership `PROJECTILE`
  and a `collideWith` mask; hit volumes (`ai/hitboxes.ts`, `game/playerTarget.ts`) are ANIMATED bodies
  registered in the `DamageRegistry`, which maps bodies to `Damageable`s.

## Campus art kit
The detail art of Saltmarsh Park (`campusOps`, Sector Ops) is a shared, instanced prop and material kit drawn over the
level-builder boxes. Gameplay never reads it: collision, cover, ledges, nav, perception, the light bake and the meter use
only the boxes. `?gfx=min`, a GLB that fails to load, or `buildCampus(b, { dress: false })` show the plain greybox.
Plan and rules: `docs/sector-redesign/briefs/ART-PLAN.md`; builds: `docs/sector-redesign/checks/art-kit-build.md`,
`art-join.md`.

- **Generated, not drawn.** Headless Blender scripts in the repo (`scripts/campus-props/`: `lib.py`, `kit.py`,
  `hero_s1.py` .. `hero_s5.py`, driver `build.mjs`; `npm run campus-props:build [-- --set kit|hero-s<N>]`). Output is
  deterministic (byte-identical GLB per run) and lands in `src/world/campusArt/assets/` as `campus-kit.glb/.json` and
  `hero-s<N>.glb/.json`. Factor-only materials, no UVs, no textures. The kit is 60 ids, about 7 k triangles.
- **Base dressing by room tag.** Each section lists an art tag per room (`S<N>_ART_TAGS`, `artTags.ts`). The rule table
  (`dressRules.ts`, `DRESS_RULES`, plus `DOOR_EXTRAS`) fills free floor, wall and ceiling by tag: `per`, `max`, `perRun`,
  `alt`, `tile`. Finish colours per room come from `finishes.ts`.
- **Bespoke hero sets.** One catalogue per section (`HERO_S<N>`, ids `H1`..`H5`): S1 gatehouse, S2 atrium, S3 lab block,
  S4 data hall, S5 Old House strongroom. Placed by hand at exact positions before the base pass.
- **Dressers.** `src/world/maps/campusS<N>Dress.ts` exports `S<N>_ART_TAGS`, `HERO_S<N>` and `dressS<N>(d)`; the registry
  is `maps/campusDress.ts` (do not edit). API in `campusArt/dresser.ts`: skins, then heroes, then `d.base()` last.
  - `d.add(piece, x, y, z, yaw, { cls, why, s?, group?, tint?, free? })`: exact placement. Throws `ArtRuleError`
    (`rule`: 'K1'..'K13', 'C', 'V', 'S', 'W', 'B', 'FIT'; `msg`) on any keepout, skin-rule, overlap or fit failure.
  - `d.tryAdd(piece, spots, { cls, why, ... })`: the first `{ x, y, z, yaw }` spot that passes, or -1. Each refusal goes
    to `d.refusals` (`{ piece, spot, rule, msg }`) and to `report.dropped`. A hero with fallback spots uses it; a hero
    that may be lost goes in an explicit omitted list the test asserts, never a bare `try / catch`.
  - `d.skin(piece, boxIndex, yaw, { why, dy?, group? })`: skins one greybox box, scaled within the piece's own fit range.
  - `d.skinFace(piece, boxIndex, face, { why, group?, tint?, dy?, at?, from?, to?, fitY? })`: a visual panel flush on one
    face of a box (`'n'` +z, `'e'` +x, `'s'` -z, `'w'` -x), at most `ART_PROUD` (0.05) off it. It writes no box: the
    greybox face stays the collision, light and sight. Modules go at `at` (one per centre), along `from`..`to`, or at
    the piece's pitch. All modules or none.
  - `d.skinHide(...)`: as `skin`, and hides the box's own drawn instance (cars, the S5 van).
  - `d.skinCyl(piece, cylIndex, { why, group? })`: cylinders (tree trunks).
  - `d.skinRow(piece, boxIndex, alongX, faceSign, { why, group? })`: tiles a long box with whole modules; `group` goes on
    every module.
  - `group` is optional on all skin calls and ties a piece to a circuit group.
  - Fit: `PropCatalogue.fitRange` gives a piece its own scale range (`fitRange()`; default 0.8-1.25; `batteryRack`
    0.8-1.3, `labBench` 0.65-1.25, `F:meshPanel` 0.8-1.3, now also fit in height, so a 3.0 m cage wall fits; `kitchenRun` 0.8-1.4).
  - Floor decals: a visual piece under `DECAL_H` (0.05 m) tall on a floor (`K:floorTileGrid`, `F:glandPlate`) is exempt
    from K1-K6, K13 and the greybox overlap; its y snaps to 1 mm. K7-K12 still apply.
  - Door frames: a piece in the catalogue's `frame` list, placed visual, whose hull spans one door's opening (width to
    width + `FRAME_WRAP` 0.2) and reaches the door head. It passes K1 and K2 for legs through that opening and K3 and K13
    for that door. It is checked as its jambs and head, so camera rays through the opening stay clear. Check it with
    `frameDoor`.
  - Pieces are named `'K:whiteboard'`, `'F:filingCabinet'`, `'H2:atriumModel'`. Find boxes with `boxAt` / `cylAt`
    (`geometry.ts`).
- **Keepouts.** `keepouts.ts` builds the shapes once per section (`buildKeepouts`); `blocked` returns the first rule a
  placement breaks. A prop never lands on one:
  - K1 player route legs (climbs included); K2 guard patrol legs, entry run-ins, reinforce and sweep points, stage
    response legs; K3 doors (zone, swing, wall edges); K4 items and the wall round them; K5 takedown spots; K6 hide,
    spawn, nav seed and checkpoint spots, the extract zone; K7 co-op lips (headroom and the box and wall rules); K8
    camera sight rays; K9 laser tubes; K10 lamps; K11 traversal anchors; K12 glass boxes; K13 escape doors.
  - Other rule ids: `C` cover (a new box tall enough to hide behind stays 3.0 m off route and patrol legs), `V` rule V
    (`ruleV` in `catalogue.ts`), `S` the skin rule, `W` no wall, `B` a box over another box, `FIT` a scale outside the
    piece's range.
  - A visual piece that writes no box (a skin, a decal, a frame) keeps the rules its mount gives it, as above.
  - Every art box is `noLedge`. Light class and the three prop classes: ART-PLAN section 2.
- **Gameplay gate.** `tests/campusArtGameplay.test.ts` (`-t S<N>`): legs, protected nav cells, patrols, cover, lips,
  cameras, lasers, reach, ledges, split gaps (computed from the greybox, whatever the dressing order), `checkDressing`,
  budgets. `tests/campusArtLight.test.ts` bakes and checks every protected point within 0.02. Others: `campusArtKit`
  (the API above, one case per kit item), `campusDressRules`, `campusArtRender`, `campusS<N>Dress`.
- **Render.** `campusArtRender.ts` draws one instanced mesh per (section, material); the World hook and
  `BuiltLevel.hidePieces` (`levelBuilder.ts`) hide the boxes a skin replaces.
- **Budget.** At most 40 draws, 150 k triangles and 2500 placements per section. Now: S1 35 / S2 33 / S3 27 / S4 19 /
  S5 29 draws; the campus is 143 draws and 186 k triangles (1930 placements). S1 sits at 35 of 40. Perf budgets: `docs/systems/performance.md`; shots: `scripts/campus-art-shots.mjs`.

## Characters (one rig for player, enemies, coop remotes, dummies and the menu operator)
- (anim-natural-n2) Wren's body motion layer (`src/anim/bodyMotion.ts`, pure): per tuner body row (`BODY_MOTION`,
  one literal per field: hipTurn / hipTime, chestTurn / chestTime deg and cycles, sway / swayTime cm and cycles,
  headFollow share, headNod deg) a pelvis yaw swing, a shoulder counter swing, a pelvis lateral sway and a head nod on
  the gait phase, blended as phasors by the graph's own weights (moveW, crouch, drawn share, raise, the KEYED_GAITS /
  KEYED_CROUCH speed shares: co-op parity). `AnimGraph.bodyMotion` writes `RigTargets.motion` after the studio drive,
  gated on `wrenReady` and on foot (eased over KEYED_WALK_BAND.tau); the rig adds the sway to the pelvis before the
  feet's reach, turns the pelvis and takes it back at the spine after the keyed trunk (`motionTrunk`), and lets
  `headFollow` of the chest's yaw off the facing through the world-stabilised head (not aiming). Added only when
  non-zero: guards and every other rig are unchanged bit for bit (`tests/bodyMotion.test.ts` pins amounts 0 to the
  pre-layer Wren fixture).
- (anim-weight) The local player's Weight layers (lean, bank, plant / landing load, chest / head / arm / gear springs,
  anticipation) sit after the graph's pose in `AnimGraph.writeTargets` (`weightApplyPose`) and on the carried guns
  (`WeaponModel.weightGear`); local pose only, identity by default (`src/anim/weight.ts`,
  `docs/archive/anim-tuner/WEIGHT.md`).
- Wren's hands (weapons job, anim-cleanup): morph targets `gripR`, `gripL`, `wrapR`, `relaxR`, `relaxL` on her game files,
  blended by `rig.handGrip` and `rig.rightTrigger` (trigger, support, wrap, relaxed). Magazines are a separate `<id>-mag`
  mesh moved by the reload clips (`reloadClipFor`); the audit sheets are `scripts/anim-cleanup/sheets.mjs` and
  `traverse-shots.mjs`.
- `player/proportions.ts` (pure) is the single source of body sizes. Average build at 1.75 m (with the ANSUR II
  corrections of ops SPEC 4.3 A1, A3-A7 since operators step 11e, G72, every character):

  | Landmark | Value | | Limb (len, r0 -> r1) | Value |
  | --- | --- | --- | --- | --- |
  | Head h / w / d | 0.229 / 0.158 / 0.20 (7.5 heads tall) | | Upper arm | 0.30, 0.050 -> 0.038 |
  | Shoulder joint y / outer width | 1.40 / 0.49 | | Forearm | 0.26, 0.040 -> 0.028 |
  | Neck base / waist / hip joint y | 1.48 / 1.05 / 0.915 | | Thigh | 0.39, 0.082 -> 0.054 |
  | Knee / ankle y | 0.50 / 0.075 | | Calf | 0.425, 0.057 -> 0.036 |
  | Chest w x d / waist w x d / pelvis w | 0.34 x 0.24 / 0.30 x 0.215 / 0.35 | | Hand / foot | 0.19 / 0.27 long |

  Builds (`average | lean | athletic | broad`) only scale girth (0.88-1.15), shoulders (0.95-1.10), waist and
  chest within that range (`BUILD_MODS`). Enemies: runner lean 1.74 m, grunt average 1.77 m, heavy broad
  1.83 m with plates (`config/enemies.json` `height/build/plated/gun`). `hitVolumes(p)` derives hit capsules.
- Mesh rules: bodies, gear and weapons use only smooth shapes from `world/smoothMeshes.ts` via `PartLibrary`
  (`sphere, capsule, limbA, limbL, torso, dome, helmet, rcyl, rbox, pill, torus`): surfaces of revolution or
  superellipsoids with shared vertices and computed normals (no seams). Hard shapes (`box, cyl, cone, hex`) are
  for world props only. Each smooth shape has a hi and lo tessellation (`LOD_DISTANCE` 16 m, per-instance LOD).
  Joints are spheres sleeved into tapered limbs (limbs hang along -Y from their joint) so no pose opens gaps.
  Patterns/camos are procedural with smoothstep edges. One material, instanced: ~20 draw calls for all characters.
- Merged guard body (guard-render S1): guards (`ai/enemyRig.ts`), carried and fresh bodies (`ai/body.ts`) pass `merge: true`
  to `CharacterRig`, which builds a `SmoothBody` (`src/player/smoothBody.ts`, pure part `smoothBodyMerge.ts`) instead of
  instanced parts: every part's hi and lo geometry is merged once into one rigidly skinned mesh per LOD (one bone per
  joint node, bind identity; positions in joint space, colour / pattern / `ppos` / `pnrm` baked per vertex; cached per
  joints + parts + instance values). Each skeleton poses its bones in `onBeforeComputeObservable` (no allocation); one scene
  `onBeforeRenderObservable` observer marks all bodies' skeletons dirty and keeps ragdolls (re-parented joints) always active. The LOD swaps as one at the body's sphere centre
  (`partLibrary.trackLod`, `setLodScale` moves it), so parts ~1 m from the centre swap a little earlier or later than
  the instanced parts did. Bounds are a fixed root-local rest box (`restBox`) with margins 1 m sideways and 0.3 m up /
  down: a keyed pose reaching further can cull a frame early at the screen edge. `SmoothBodyPlugin` (priority 220,
  define `SMOOTHBODY`) on the part skin material reads `ppos` for the pattern and surface position. `setHeadVisible` is
  a no-op here (only the player's camera fades a head). Flag `guardMerge` (`?guardmerge=0`: the old instanced parts, for
  comparisons). Casters under 0.3 m are skipped by the lamp / moon shadows (`lightRig.ts`, `world.ts`): heads, hands,
  forearms and feet were, the merged body is not, so they cast shadows now. Measured (24 guards, laptop GPU, Epic):
  `docs/archive/guard-render/run-s1` against `run-s1-off`. A body effect that will not finish compiling (Babylon's poll timed
  out, the compile failed, its program was disposed under it, or as a last resort 90 s and 30 frames unready; a slow
  parallel compile is left to finish, body watchdog) is dropped and recompiled,
  at most 3 times per variant with a console warning (`bodyEffectRecovery.ts`, guard-ai carry fix: a stall during a
  new variant's compile left guards invisible on the laptop GPU); the meshes holding it are switched back to GPU
  skinning (Babylon's first fallback had set `computeBonesUsingShaders` false, drawing the body unskinned; carry fix 2).
- Guard figures (guard-models, `docs/guard-models/`; `flags.guardModels`: `?guardmodels=1` turns it on and the default is
  OFF for now, G8 flips it to `!== '0'` after its budget run; `?guardmodels=0` is the merged S1 body above, A10). The
  seven human kinds (grunt, runner, heavy, sniper, enforcer, droneOp, officer; the dog keeps its model) draw as a
  `GuardFigure` (`operators/runtime/guardFigure.ts`, on Wren's `OperatorLibrary` / `OperatorPoser`) that `GuardBody`
  (`ai/guardBody.ts`) builds over the rig in `buildEnemyRig` and `buildBodyRig`; the merged body stays until the
  figure's first LOD is in, then is disabled. Gameplay never reads it (hitboxes, perception and the light meter read
  the rig). All male, larger than Wren.
  - Bases (A2): `average` (grunt, droneOp, officer; ref height 1.77 m), `lean` (runner, sniper; 1.76 m), `broad` (heavy,
    enforcer; 1.825 m), from the MakeHuman base body, scaled `def.height / refHeight` (within +-2%).
  - Heads, faces, tones, hair (M1): `average-1..4` and `lean-1..4` (open faces, each with its own iris and
    clean / stubble / beard), `broad-1` (the eye region under the balaclava); eyes sit inside the head piece. Four skin
    tones (0-3), hair caps `buzz`, `crop`, `sidepart`, `receding`, `fade`, `bald` (no mesh) in four colours (`black`,
    `darkbrown`, `brown`, `grey`); heavy and enforcer have no hair cap. Faces are shaped from the CC0 MakeHuman face
    targets, skin, eyes and hair are baked procedurally in-repo; no face bones, no blink (A15).
  - Outfits per kind: `uniform` (grunt, droneOp, heavy, enforcer; faction tint), `uniform_rolled` (sniper, sleeves
    rolled), `work` (runner; his own colour, A11), `uniform_jacket` (officer; his own colour). Headwear: grunt cap /
    beanie / none, runner beanie / none, sniper boonie / cap, droneOp headset (a cap over it 40% of the time), officer
    `cap_officer`, heavy and enforcer balaclava. Eyewear: the sniper always wears dark glasses; grunt (clear or dark),
    droneOp and officer (clear) rarely wear any. Small kit: `radio`, `pouch_belt`, `holster_thigh`, `flashlight_mount`, some fixed per
    kind (grunt radio and torch mount, officer radio, droneOp belt), the rest picked from the seed.
  - Gear pieces and the gameplay bits (A5, A14): the gear shows only what stops a round. `Enemy.helmet` /
    `Enemy.armour` (`GEAR_BY_STAGE`: armour at alarm stage 2, helmet too at 3; response teams) are the wire bits
    `AL_HELMET` / `AL_ARMOUR`. `applyGear(variant, helmet, armour, plated, kind, out)` turns them into the visible
    piece set: helmet bit -> `helmet_std` (heavy and enforcer: `helmet_heavy`), which hides the hair cap and the
    headwear except the balaclava and headset; armour bit -> `vest_soft`; `plate_heavy` always on heavy and enforcer
    (both `plated`); the enforcer's `shield_riot` is its own GLB skinned on the figure's skeleton (`ai/guardShield.ts`).
    The seed never adds a helmet or armour the gameplay does not have. A knocked-off helmet (first head hit) hides
    through the mask and drops as `helmet_std`'s own mesh in the guard's helmet colour (`ai/helmetDrops.ts`,
    `guardHelmet.ts`, A6); the cap or hair shows again. Carried and fresh bodies keep the guard's seed and gear
    (`ai/body.ts`).
  - LODs and the runtime figure: three LODs per base, one skinned mesh and one material each (LOD0 < 8 m, LOD1 8-25 m,
    LOD2 beyond, 10% hysteresis, `lodPick.ts`; no hero), so a guard is one draw per pass (+1 shield, + gun). Triangle
    and texture budgets: `performance.md`. Every head, hair cap, headwear, eyewear, kit and gear piece is baked into the
    base's mesh and tagged per vertex (`_PIECE`, `_TINT`). Static vertex buffers are shared per (base, LOD) per scene
    (`GuardLibrary`); per guard a skeleton, `gvis` (RGBA8 per vertex: tint rgb for the vertex's slot, alpha = visible /
    flash / heat, 0 = hidden) and an index buffer of the visible pieces only, rewritten on a spawn, gear, tint or flash
    change (`operators/guards/gearMask.ts`, pure), so piece toggles cost no draw and hidden pieces leave the shadow
    maps and the G-buffer. The material plugin (`guardFigurePlugin.ts`, one packed varying) tints where the albedo atlas
    alpha is set and flashes / heats in the same draw. Culling is a fixed root-local rest box; a ragdoll (a re-parented
    joint) is always active and poses through the world-matrix path. With the flag on, the level load awaits LOD2 of
    every base and compiles the guard shader on hidden warm meshes under the warm-up cap (`ai/guardWarm.ts`).
  - Look seed (M3): `Enemy.look`, a 7-bit seed set once at spawn from the spawn slot (`ai/guardLook.ts`, never
    `Enemy.num`), so a section restart or a reload gives every slot the same look; it rides the wire (`AL_LOOK`,
    `coop.md`) so host and client draw the same man. `guardVariant(seed, kind, mapId, out)`
    (`operators/guards/guardVariant.ts`, pure, no allocation after the first call per kind and map) picks head, skin
    tone, hair cap and colour, headwear, eyewear, kit and a +-6% colour jitter by the archetype matrix (SPEC section 3);
    `guardTints.ts` turns it and the faction palette into slot tints.
  - Files and the offline bake: the bake's output is bundled in `src/operators/assets/guards/` (~29 MB:
    `guard-<base>-lod0..2.glb`, `guard-<base>.json`, `guard-shield_riot-lod0..2.glb`; KTX2 textures inside the GLBs);
    `operators/guards/guardAssets.ts` is the one seam (two eager `import.meta.glob` lines: the GLBs as `?url` strings
    only, nothing fetched; the three JSON files, under 1 KB together, inlined). A base without all its files resolves
    to the stand-in (Wren's play LODs, untinted, one piece). Guard figures are off by default; their files load only
    with `?guardmodels=1`, never precached: every fetch is behind `flags.guardModels` (`GuardBody` via
    `guardModelsFor`, `warmGuardModels`, the helmet drop's mesh, the shield), the precache lists
    (`src/pwa/precacheGlobs.ts`, used by `vite.config.ts`) take no `.glb` and ignore `**/guard-*.glb` /
    `**/guard-*.ktx2`, and the runtime rule (`src/pwa/runtimeCaching.ts`) keeps a fetched `/assets/guard-*.glb` in the
    worker's own `guards` cache (CacheFirst, 24 entries). Tested by `tests/guardAssetsOffline.test.ts` (the lists globbed
    as workbox does; no fetch with the flag off) and `tests/swRuntimeCaching.test.ts` (every runtime rule self-contained,
    as workbox writes it into `sw.js` as text, and the built `sw.js` routes each GLB to its cache). Bake (laptop, headless Blender, MPFB2 CC0 data; none on the desktop):
    `node scripts/operators/guard-bake.mjs --stage <prep|bodies|heads|garments|gear|lods|check|sheet>` runs one stage as
    parallel jobs and skips jobs whose input hash is unchanged; `guard-sheet.mjs` draws the variety contact sheet. It
    builds on Wren's pipeline (`scripts/operators/README.md`); plan, spec and per-slice reports: `docs/guard-models/`.
    Kit data: `scripts/operators/data/guards.json` (ids and budgets, `operators/guards/guardKit.ts` validates).
  - Tests: `guardKit`, `guardVariant`, `gearMask`, `guardLook`, `guardFigure` (NullEngine), `guardBody`,
    `guardResolve`, `guardAssets` (the bundled files against the budgets), `guardAssetsOffline`; `e2e-coop` checks the
    seed and pieces on host and client (`E2E_GUARDMODELS=1`).
- Rig: root -> body (tumble pivot) -> pelvis(`hips`) -> spine -> chest(`torso`) -> neck -> head(`headNode`, head
  centre); chest -> shoulder -> elbow -> wrist; pelvis -> hip -> knee -> ankle; sockets `weaponPivot` (aim
  pocket), `backSocket`, `hipSocket`. Joints use `rotationQuaternion` (root uses Euler `rotation.y`).
- Avatar style (`video.avatarStyle`, `setAvatarStyle`): `detailed` (default since 2.0; `avatarStyleV` 2 moves older
  settings once) or `stick` (capsule limbs, sphere joints and head, pill feet on the same skeleton). Saves and
  cosmetics are unchanged (colours apply to both). The default look is the operator (`torso: 'operator'`: suit,
  carrier, pouches, pads, gloves; `helmet: 'trilens'`: balaclava + a three-lens goggle, `rig.setLensGlow` from the
  vision mode). Enemy looks get the map's faction colours (`ai/factions.ts` `factionLook`, `MapTheme.faction`).
- **Players are Wren (operators step 11e, G123: "Both play as Wren").** The local player, the co-op partner and the
  main menu's operator are Wren, the realistic operator from the offline pipeline (feature/operators, G68); dummies
  and the VIP keep the part bodies above, and guards keep the merged body unless `?guardmodels=1` (guard figures below). No dev switch.
  - `operators/runtime/playerFigure.ts` `operatorRig()` builds a player's `CharacterRig` at Wren's height (1.68 m,
    G74; build `average`, style `detailed`) and puts an `OperatorFigure` (`operators/runtime/figure.ts`)
    on it. The rig stays the pose and gameplay body: animation, IK, sockets (weapons attach to the rig's sockets as
    before), the light-meter samples (`game/bodyHeight.ts` `lightSampleHeight(rig.height, crouch)`, local and partner
    via `PlayerRef.height`; the cover exposure points scale the same way) and the hit volumes (`playerTarget.ts`,
    `net/remotePlayer.ts`: `hitVolumes(rig.p)`) follow Wren's size. Its part meshes are still built (back gear and thigh widths are measured from them for the
    weapon carry) but disabled; Wren is what renders. The controller capsule, speeds, noise, traversal anchors and the
    camera are unchanged (G38). Traversal positions use `GAMEPLAY_HEIGHT` 1.75 for every player (G176); while attached
    the rig root is drawn at the gameplay root plus `attachLift` (`AttachGrips.lift`, `Player.rootLift`; visual only),
    so Wren's hands meet the lip, rung or pipe. An elbow inside the trunk after the arm IK swivels out
    (`characterRig.keepElbowOut`, `rigMath.elbowSwivelClear`).
  - Wren's files: `src/operators/assets/wren/wren-{hero,lod0,lod1,lod2}.glb` (skinned, KTX2 UASTC textures, 81.4 MB;
    `assets.ts` imports them with Vite `?url`, same-origin fetch only). Play uses LOD0 (< 8 m), LOD1 (8-25 m), LOD2
    (beyond), 10 % hysteresis, LOD2 loaded first; the hero (55.5 MB) only for the main menu and registered close-up
    cameras (photo mode; `setCloseCamera`, D21, D33 "Yes use hero for menu"), loaded lazily after the game LODs.
    `HERO_CLOSE_UPS` in `figure.ts` switches it off. The service worker caches every `assets/*.glb` fetched through
    it (CacheFirst, cache `operators`); they are not precached. The first visit loads Wren before the worker controls
    the page, so once it does `operators/runtime/offline.ts` `warmPlayLods` fetches each missing play LOD through it
    (`playLodUrls`: LOD2, LOD0, LOD1; `?gfx=min`: LOD2): one online start that reaches the menu is enough for offline
    play (ops A109). A load cut off by a reload or a disposed scene is not reported (`pageLeaving`, A110).
  - Two Wren bodies share geometry, materials and textures per scene (`OperatorLibrary`); each has its own skeleton
    and goggle glow. Goggle (G73): the glow is dim with vision off, full with a vision mode on (`setVision(shown)`);
    the stowed goggle on the brow waits for its export (cleanup), so the goggle sits over the eyes in both states.
    Colour per player (G135, ops A112): `goggleSlot` / `goggleColour` (goggle.ts, pure) give the host (and solo) the
    lens's own green and the partner cyan; the co-op host and client apply it with `setPlayerGlow` (playerFigure.ts)
    through `OperatorFigure.setGlowColour` (the per-body glow material).
    The partner's vision is not sent: its glow stays dim. The glow is emissive only, never a light (light parity).
    Thermal warms Wren with a white per-mesh overlay (`setHeat`, from the rig's `heat`). The camera fade's head hide
    scales her head joint to zero.
- Decided, not built yet: the old three-lens goggle stays only on parked looks (G69). Realistic characters everywhere
  (G68): only two operators, Wren and Moth, are built and playable (G71); they move the same and differ in look and
  height only (G109; Wren 1.68 m, G74); the camera height is the same for every operator (G38). Operator details stay
  on feature/operators (G75).
- Rendering extras: `LightRig` light cones (additive, thin-instanced, `CONE_*`), `vfx/blobShadows.ts` contact
  shadows (`GameState.drawShadows`, `NetAttachment.shadows`), `CinematicPost.setGrade(MapTheme.grade)`.
- Animation: callers pass a `RigPose` (speed, local move dir, grounded, crouch, kneel, aim = weapon raise 0..1,
  carry = ready-position weights, weight, aimPitch/aimYaw, kick, dash, slide, landing, reload/reloadEmpty, swap,
  grenade, wall/wallSide/lean, traverse/traverseT, check, melee, gait phase, motion
  state, acceleration, root velocity, goal yaw, stop point, stick intent, swap from/to slots) to
  `rig.animate(dt, pose)` every render frame (120 Hz). `rig.onPosed` callbacks run after each solved pose.
- Clips (`anim/clips/*.ts`) are keyed curves over named pose channels (`anim/pose.ts`: pelvis, spine, head,
  weapon, hand targets and weights, foot offsets), monotone cubic, cycles keyed over the gait phase with duty and
  lift, timed clips in seconds with events (`magOut`, `magIn`, `charge`, `holstered`, `release`, ...).
  `addClip` (additive vs neutral) / `overClip` (override); `mirrorClip` for left/right.
- Keyed clips (CT prototype G8, `docs/ct-prototype/G8-PLAN.md`; anim-rework S2): hand-keyed poses baked in Blender
  (`scripts/anim-keys/keys/<clip>.json` -> `anim/clips/keyed/<clip>.ts`, `anim/keyed.ts`) played over the procedural
  layer (foot planner, foot IK and locking, speed matching, look-at stay procedural). Standing and holstered (free hands)
  the graph plays one keyed set (`AnimGraph.keyedSet`): `walk` -> `jog` -> `run` cross-faded by the effort pace
  (`KEYED_GAITS`: walk to 2.1 m/s, jog from ~2.6 to ~3.3, run from ~3.8; the walk's swing scales with its pace) on the
  gait phase, and `idle` (a 12 s cycle, `KEYED_IDLE_PERIOD`: breathing, weight shifts, a head scan) by the still share;
  the blended track half-width, knee pole, duty and lift go to the planner. `mixKeyed` blends two sampled poses. Drawn
  (anim-rework S3; a carrier with the gun in hand, standing on foot, `AnimInput.keyedDrawn`) the graph mixes the drawn
  set in by its share (`keyedDrawnSet`, `RigTargets.keyDrawn`): at low ready the speed set's legs and trunk moving and
  `ready_stance` still (an 8 s cycle, `READY_STANCE`: the support foot 9 cm ahead, the strong foot as far behind);
  aiming (by the eased raise) the glide by the smoothed local direction (`glide_fwd`, `glide_back`, `glide_strafe`; the
  left strafe is the right one mirrored half a cycle on, `mirrorKeyed`) and `ready_stance` still. The aimed share's
  pelvis offsets ride on the procedural pose (the clip's swing about its mean), its trunk is not applied
  (`RigTargets.keyTrunk` = 1 - drawn x raise: the upper body stays the procedural gun platform), the pelvis twist is cut
  (`GLIDE.yawCut`) and the hips ride over the feet across the body (`GLIDE_HIP`); the glides' track (`GLIDE.halfK`)
  and knee pole (`GLIDE.kneeOut`) are set for the planner. (anim-rework S4) Crouched (`crouchSet`, `KEYED_CROUCH`, by
  the crouch blend, holstered and drawn): `sneak` -> `crouch_walk` -> `crouch_run` by the crouched effort pace (eased,
  `paceTau`), the game's extra lean and drop on top (`KEYED_CROUCH_POSE`, the arms turned back by the lean), the planner's
  duty and lift from `KEYED_CROUCH_LEG`, a knee pole a little in (`KEYED_CROUCH.kneeOut`); still, `crouch_idle` (a 12 s
  squat, the hands on the knees, a wrist frame; its share eased in and out, `settleIn` / `settleOut`). The clips' pelvis
  height is the whole crouch depth: by the crouched share it replaces the procedural drop. Holstered and still the
  squat replaces the kneel (`KEYED_CROUCH.squat`); drawn and still the procedural kneel stays and the keyed set fades
  under it (`RigTargets.kneel`; its knee pole `KNEEL_KNEE_OUT`, its feet `KNEEL_NARROW` in, its cycle `KNEEL_RATE`);
  the tense sneak keeps its own carriage. The rig puts each squat palm on top of its own posed knee
  (`RigTargets.kneeRest`, `CharacterRig.kneeRest`: the keyed arm re-aimed by the palm's miss from the knee top,
  `KNEE_REST`, two-bone, the keyed wrist frame kept). Crouched low ready elbows tuck more (`READY_ELBOW_TUCK_CROUCH`). The rig applies it
  (`keyedTrunk` with the look's neck yaw on top, `keyedArm`); under the keyed set the knee bow-out rule
  (`KEYED_KNEE_GAP` 0.11 m) bows only a swinging leg, gently (`KEYED_KNEE_BOW`), and, standing holstered (`keyHol`), a
  swinging leg's knee pole stays nearer the pelvis forward (`KNEE_SWING_SHARE`). The idle's head scan reaches the
  head through `RigTargets.keyScan` (added to the world-stabilised head yaw: the camera aim and look still drive it). Remotes pose the same from MoveState (speed, crouch, the graph's own
  clock); no wire change.
- (mocap-trial) Mocap locomotion (`anim/mocap.ts`) is the player's only path: players get mocap only, with no
  player-facing switch (G399; anim-fix-pass AF5 removed the Settings row; a stored `gameplay.mocapLoco: false` no
  longer sticks, `core/app.ts` ~:136-140). The hand-keyed set is a developer rollback only: `?mocap=0/1`, then the
  animation tuner's More > Panel box (a dev tool: this page only, not saved); it is per machine and drives the co-op
  partner's copy on this machine too. `LOCO.set` picks the
  clip set the standing holstered speed set samples (`speedSet`: the hand-keyed `HAND_KEYED_SET` or `MOCAP_SET`,
  `anim/clips/mocap/*` in the keyed format), plus its optional one-shot slots (`MocapSlots`: turn in place, turn on
  the move L / R, start, stop). The set also holds three more captures: the crouched sneak band (`crouchWalk`, CMU
  136_09, `crouchSet`), the sprint past the run (`sprint`, 127_07) and the aimed strafe (`strafeL` 69_59 / `strafeR`
  69_56, `keyedDrawnSet`, side-step `mocapSideStep`; `mocap.ts` ~:176-195). The faster crouched bands, the drawn gait
  (gun out) apart from its strafe, the idle and the wall sets stay hand-keyed.
  A mocap clip with a `feet` channel drives the planner's clip feet mode
  (`FootPlanner.clipFoot`: the clip places the steps, the planner grounds and pins them; `MOCAP_FEET` gates it: holstered,
  under 1 rad/s of turn or what turns the body 0.35 rad over one stance, over 0.3 m/s; the gait clock keeps the clip's stance
  window through a hand-off, the rig caps foot pitch at 18 rad/s). The CMU clips: walk / jog / run from subject 16, the
  walking turns / start / stop (walking pace only, `MOCAP_SLOT.walkMax`), a turn on the spot from subject 69.
  Mixamo clips are also allowed (G406; none converted yet, Player Build): retargeted onto wren-rig-game and the guard
  rigs (the Mixamo skeleton is never used in game), from FBX without skin that Michael downloads into
  `C:/NightShift/scratch/mixamo/clips/`; converted clips bundled, raw files not committed, credited in
  `docs/art-credits.md`.
  `MOCAP_LAYERS` scales the procedural layers on the mocap share (`RigTargets.keyMocap`): 0 for the arm swing, twist,
  lean, pelvis follow, load, elbows, stop settle and N2's motion layers (the capture holds its own); 1 for
  `motionArmCap` and `keyPelRate` (the two limiters stay, `mocap.ts` ~:95-96) and `turnStep` (N1's turn rules
  stay). (afp-af2) The run carriage over the capture (`MOCAP_RUN_POSE`, `characterRig.ts` `mocapRunPose`, eased in
  from 2 to 3 m/s, none walking): the capture's own means are followed, its bob scaled and the whole lifted, the chest
  pitched to the CT run and sprint lean; its four `MOCAP_LAYERS` entries (`pelHeight`, `trunkMean`, `bankWipe`,
  `armSmooth`) are 0 (1 undoes it). Nothing on the wire. With placeholder clips the plumbing is bit-identical on and
  off (`tests/mocapSwitch.test.ts`). Format: `docs/mocap-trial/CLIP-FORMAT.md`.
- `AnimGraph` builds a source pose per frame: locomotion 2D blend space (`FORWARD_NODES` creep / walk / jog /
  sprint, `CROUCH_NODES` sneak / crouch walk / crouch run x forward/back/strafe), start / stop / pivot clips from
  the `MotionDriver` state, a first-order stick-intent lean (visible on the first frame), acceleration lean and
  roll (leans into turns, <= 8 deg walking; G1 `BANK` up to 31 deg at a run), the flat-back wall stance and tuck (reload / swap / grenade at the wall), traversal,
  slide, land, reloads, per-slot swaps (`swapClipFor(from, to)`), grenade, ready positions blended to the aim
  pose, head-first lean (head ~60 ms ahead, body/weapon out ~0.2 s, back ~0.2 s; gated by the 0.18 s open-left hand
  switch `EDGE_HAND_TIME`, dormant until step 12b drives `rig.openLeft`),
  breathing, recoil, heel-strike compression (`HEEL_KICK`), hit flinch (`rig.hit`, recovers 0.3-0.6 s). State
  switches trigger the `Inertializer` (offset decays critically damped per channel group, 120-250 ms). Playtest 2: the
  chest carries the aim (`AIM_CHEST`), the stance half-width on foot is capped at 1.1 hip half-widths, the pelvis drop is
  held at walking pace and above (`PELVIS_HOLD`, less bob; not while hanging or climbing), and a draw / holster keeps the
  hand on the grip (`CharacterRig.weaponTravel`).
- Gait style: `GAIT_STYLE` (`clips/locomotion.ts`) keeps height smooth (small loading dip and rise, smaller still at
  jog / sprint) and shows the weight in hip sway and twist; armed, the body carries a tactical `HUNCH` (chest well
  forward over the hips, knees bent, head up; deeper at a wall; `crouch`: bent over the knees, half of it
  straightening into a raised weapon). Decided, not built yet: the CT prototype replaces this posture with the one in
  the footage (loco M20 Q9, M25 (4)) and removes the sprint, the planted pivot (G25), the lean-out and the open-left
  weapon switch (loco M20 Q1); the CT movement rules are in movement.md. Footfalls: a small `MOVEMENT.rootDip` speed check, `HEEL_KICK` and a tiny
  camera footstep kick.
- `FootPlanner` (world space): contacts from the gait clock while moving (landing spot = where the hip will be
  mid-stance; distance-matched to the stop point), locked while planted (< 1 cm), swing arcs with toe-off and
  heel pitch, no crossing (a swing passing the planted foot bows out to `PLANNER.swingGap`; a controller teleport
  resets the planner and the gait clock), error-driven idle steps (turning on the spot plants steps). Side-steps are 60% length
  (`stepLength(..., lateral)`). Two-bone IK puts feet on it and hands on the weapon's `grip`/`foregrip`/magazine
  well (wrists offset behind / under the palm points in weapon space, `WRIST_TRIGGER` / `WRIST_SUPPORT`, so the
  elbows bend) or the wall (`rig.wallHand`; the right hand takes it when `openLeft` puts the weapon in the left); the pelvis drops so both feet stay reachable (each leg measured from its own hip
  joint; a growing need is met at once, release eases); leg IK twist references stay defined in a deep sneak
  (kneecap away from the shin); planted feet measure reach from under the hip and toe off early at speed; a
  relaxed stance tolerates a front-back stagger (one settling step); the head is world-stabilised; the
  weapon's orientation lags by its mass. Legs solve (and are rate limited) before the head and weapon: knees never go under
  `KNEE_FLOOR` (the hips rise) and knees closer than `KNEE_GAP` bow outward (steeper pole). The weapon blends from the body to the
  aim by `aimW`, sits beside the head when aimed (`SIGHT_RAISE`, `NECK_WELD`), and `clearBody()` pushes it out
  of the trunk, head and leg capsules (`rig.gunSpan` from `WeaponModel.hold`). `rig.openLeft` (dormant, D9 at
  step 12b) mirrors the aim pocket (weapon x, yaw, roll) and swaps the grip and support arms. A per-joint angular rate limit (`JOINT_RATE`) is the safety net
  (`rig.limited`). The rig refreshes world matrices top-down once per node (`fresh`), never
  `computeWorldMatrix(true)` per joint (it re-forces the whole chain). The FK pose override slot (`rig.emote` /
  `emoteTime`: grabbed and hostage guards, the VIP, the co-op enemy puppet, bodies) returns an `FkPose` slerped over
  the result; player emotes are deleted (G24). Rigs beyond `ANIM_LOD_DISTANCE` (22 m) animate at half rate; `animate` is a no-op after `dispose`.
- CT prototype G1 (legs and gait, `docs/ct-prototype/G1-REPORT.md`): standing, a planted leg reaches `SOFT_KNEE_STAND`
  0.997 of its length before the pelvis drops (was 0.97: ~28 deg of knee at every plant), the standing clips sit nearly
  straight (idle knee ~11 deg), the drop eases back with `PELVIS_HOLD` 0.06 (was 0.7) and counts the heel lift; late in
  each stance the heel rises onto the toes (`HEEL_RAISE`, `TOE_BALL`: 0.45 rad walking, 0.55 running, 1.0 crouched); landings
  aim `LAND_AHEAD` 0.45 of the stance ahead; moving crouched the knees stay `KNEE_FLOOR_MOVING` 0.12 m up (an eased hip
  lift); the run has a flight phase (`JOG` duty 0.45, `DASH` 0.38, higher heel lift) and pumps its arms from `POSTURE.runFrom`
  1.6 to `runTo` 3.0 m/s; fast turns bank (`BANK`: k x (speed x yaw rate)^2, cap 0.55 rad, from 2.5 m/s, 40 % pelvis);
  the kneel starts with the crouch, keeps the lead foot planted (`KNEEL_M` mirrored) and rests the forearm on the front
  thigh (`KNEEL_HANDS`); a fall of about a metre lands deep with the arms out (`LAND_DEEP`, `LAND_ARMS`); the tense sneak
  is `TENSE_SNEAK` with `TENSE_HANDS`. `tests/g1Locomotion.test.ts` drives the real rig on a NullEngine for these numbers.
  G1 fix round: `PELVIS_HOLD` 0 (the walk's dip is taken by the heel and toe: `HEEL_RAISE` 0.6 rad from 0.4 of the
  stance, the heel-first strike 0.3 rad, `heelLift` also in the air), `REACH_HARD` 0.999 (a planted leg is never asked
  past full stretch), `REST_SHIFT` 0.22 m (standing still the hips settle over the frozen feet), `CROUCH_REACH` 0.8
  (crouched, the rear leg trails long), `IDLE_STANCE` (feet ~0.33 m apart standing still).
- Weapons (`config/weapons.json`: the CT kit (G76), the rifle 0.84 m and the suppressed pistol; guards carry these two
  models too;
  parts carry a `role`: barrel, receiver, grip, mag, ...; `modelExtents`): `WeaponModel.hold(rig)` (aim pocket,
  hands IK'd to `grip` / `foregrip` within 2 cm, magazine well from the mag part) / `holster(rig, slot)` /
  `inHand(rig)` (mid-swap). `weapons/carrySlots.ts` (pure; class-keyed, so the compact-gun and second-long-gun slots
  stay for CT's rifle attachments) gives every loadout weapon its own slot: long guns
  on the back: the side slots vertical (`backL/backR`, muzzle up, thin side to the back, splayed from the butt), the
  centre one (`backC`, CT prototype G2) slung DIAGONALLY like CT's (stock at the right shoulder blade, muzzle down to the
  left hip, flat on the back plate; `weapons/backDiag.ts`: its draw sweeps round the right side, muzzle up at the
  shoulder, then onto the line; its holster goes muzzle down, never up), standing
  off `rig.backGear` = vest / hood / backpack depth measured from the parts), compact guns on the left-hip
  `sling` (pushed out by the thigh after each pose via `rig.onPosed`), the pistol low on the right `thigh`
  (standing off `rig.thighOuter`); `GrenadePouches` on the belt. (feature/weapons) An operator body brings its own
  kit frames: `rig.thighMount` (her built holster's `pistolHolster` frame) and `rig.backMount` (her back plate's
  receiver sockets, the long gun hung by its `backStud`, left side flat to the plate), and her hands (`rig.setHands`:
  holds solved so the palm sits on the grip, handHold.ts; `rig.handGrip` closes her fingers; since anim-skeleton S2 through 15 finger joints per hand on the hero, LOD0 and
  LOD1 (`anim/fingers.ts`: per-finger curl / spread -> MCP / PIP / DIP, the thumb with opposition; grip shapes plus the
  Hands & feet values (base table plus tuner delta, every Wren rig) plus the clip slot `rig.fingerClip`), the grip morphs left at 0 on those files;
  LOD2 has no finger joints. A clavicle per side (`clavL` / `clavR`, `anim/clavicle.ts`, input `rig.clavIn`; at zero
  the shoulders are exactly as before) and goggle joints `goggleUse` / `goggleStow` under the head (`GOGGLE_OFFSET`,
  copied per rig in `goggleFrame`). Asset patch: `scripts/anim-skeleton/skin.mjs`; docs/archive/anim-skeleton). Keyed
  clips carry optional channels `clav`, `fing`, `leg` (FK legs over the planner by a per-key weight) and `legd`
  (per-joint leg deltas; a planted leg is re-solved onto its plant, `anim/legDelta.ts`, so the foot never slides;
  `rig.footSlide` reports it); the Keys tab edits them on every clip and a clip opts in on its first edit (anim-skeleton
  S3 / S4). Joints rows `clavicleL` / `clavicleR`.; a weapon hand out of reach brings its shoulder forward
  (`PROTRACT_MAX` 7 cm). Swaps: holster at 38%, take the next from its slot at 58%, in the aim pocket at 80% (0.9 s).
  Co-op remotes build the same from the lobby `loadout`. Deaths: `Ragdoll` = 5 Havok bodies (torso, legs, arms) with
  ball-and-socket joints at hips and shoulders, limbs never collide with their own torso, capped by
  `BUDGET.maxRagdolls`.
