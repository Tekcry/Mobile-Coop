# Light model, baked lamps and vision rendering
Owner: Sector Ops Build (lighting on every map). Status: current.
Purpose: the gameplay light registry and light field, desktop baked lamps, darkness, night vision, thermal and electro
rendering, and the lamp light volume kept for the level editor.
Design authority: docs/DECISIONS.md (G41, G45, G47, G73, G101, G102, G181, G352), then docs/design-bible.md
(Section 5.1).

Light parity (bible 5.1): what the player sees, the light meter and guard perception agree. Gameplay reads only the light
field (collision, the light bake, the noise model), never the render state. Character shadows in the meter and guard
perception (G352) are built dark behind `charShadowLight` (`?charlight=1`; owner Sector Ops Build; switched on by
Michael's yes on the walk item, char-shadow-meter BRIEF A9): Parity below.
Security cameras are outside the light model (marlow-jammer, Michael M3): each has its own IR illuminator, so inside its
range and cone it reads every body at `CAMERA.irLight` 1 (fully lit); lamps, jammed or shot lamps and dark corners do
not change what a camera sees. Lights matter for guards and the meter only. (camera-range) Only distance thins a camera's
rate: its falloff runs over its own range (`docs/systems/gadgets.md`, Security cameras).

## Decided direction
- Decided, not built yet (G329, "Real-world levels"; G368, "Australian standards"): each space type gets a real-world
  illuminance band from the Australian lighting standards (outdoor car parks AS/NZS 1158.3.1, interiors AS/NZS 1680; EN
  12464 where they are silent); engine light is calibrated to lux once, Michael approves the band table with the S1
  car-park light map, and each space is measured from the bake at greybox exit. Stealth comes only from real gaps (between poles,
  under the carport, behind cars, cut circuits, shot lamps), never from leaving lit places unlit; the 40-60% shadow-share
  target yields to the band. Michael: "car parks are generally well lit". No dark spots from lights left off (G367,
  "Never"): every fitting works and is on, on every map; a dead fitting (intensity 0, below) is not used to make a
  dark pocket. The light-realism job (Sector Ops,
  `feature/light-realism`, S1 car park first) builds the calibration; the level rule lives in docs/level-design.md.
- Decided (G333, "Everywhere"): hardened lit choke points are allowed on campaign and Sector Ops maps:
  un-shootable fixtures and guarded or locked breakers. A route around the choke point always stays. This loosens the
  older "every lit chokepoint can be darkened at least two ways" (docs/level-design.md).
- Built (G41, sector-batch): one 15% door threshold. `DOOR_SHUT` 0.15 in `world/lightField.ts` (the field, the bake's
  shut flags, the torch shadow set) equals `DOOR.driveShut` (`world/doors.ts`; `tests/doorLight.test.ts` pins it). A
  peek crack and a stick-driven door under 15% keep `open` 0, so they are shut; guard sight and sound: `ai.md`.
- Decided, light half built (G45): clear glass passes light and sight; frosted glass and blinds pass light only; thermal never
  sees through glass. Light half built (bible L15): glass, clear or frosted, is never a light shape
  (`src/voxel/lightShapes.ts:23-24`), so the light field and the bake pass it. The sight rules (clear glass passes
  sight; frosted glass and blinds do not) sit with the AI, not in the light field.
- Built (G100, G101, G102; prototype A5, lr16v, LR16-6): an instant goggle cut (G181: the wheel picks the mode, one
  button toggles it), CT grain (thermal on warm areas only, none in electro), thermal as CT (CT colour ramp; people
  behind closed doors as a dim blue silhouette, below).
- Parked (G195, refines G69): Wren keeps her current goggle; the goggle redesign is parked, only the stowed-on-brow
  export remains (cleanup, G161). Until then the goggle stays over the eyes and only the glow follows G73 (dim with
  vision off, full with vision on). Code: `player/goggleGlow.ts` lights the current lenses always.
- Decided (G47): the parity test, long lamps and motion lights keep their plans and are sorted out when built.

## Light model (3.6: one light function)
- The canonical bake (`world/lightBake.ts` `bakeLevelLight`): lamp visibility (`voxel/lampBake.ts`), moon visibility
  (`voxel/skyBake.ts` `bakeMoon`, 0.5 m cells) and the 1 m ambient grid (`world/ambientGrid.ts`), all from the canonical
  shapes (`voxel/lightShapes.ts`: visible blockout pieces >= 5 cm plus the Medium dressing). Keys hold only the map, seed,
  shapes, lights and the moon's direction.
- One light model (LR16; no falloff setting). The parts, one line each:
  - photometric falloff with a smooth near term and a feathered cone: `world/lampMath.ts` (LR16b)
  - contact-hardening penumbra in the bake: `voxel/lampBake.ts` (LR16e)
  - one-bounce fill in the ambient grid's G channel: `voxel/lampBounce.ts`, `world/bounceGrid.ts` (LR16-1)
  - torch shadow atlas: `world/torchShadows.ts`, `world/torchShadowSet.ts` (LR16t)
  - character shadows on every shadow tier but Off: one lamp (the nearest) on Low and Medium, 2 / 3 / 4 on High /
    Ultra / Epic (`CHAR_SHADOW_PRESET`; bible L18's "2-4 at High+" is the multi-lamp part); Off keeps the capsules:
    `world/charShadows.ts`, `world/charShadowSet.ts` (LR16-7 / LR16f / LR16-3)
- `world/lampMath.ts` (pure): one light model (LR16a, Michael 2026-10-23 ~18:12 "Disable returning to original lighting
  system, focus on only the one new system"). Baked lamps: the photometric falloff `photoFalloff` (inverse square from
  3 m, `PHOTO`, windowed to 0 at the reach = radius x 1.6; `LightRegistry.add` scales fixed lamps' radius once,
  flashlights unchanged) x the cosine cone (lamps without a cone: the hemisphere below them, exponent 1; spots: squared,
  cut at the outer angle). Flashlights: the linear `lampTerm`. `bakedLamps.ts` builds its GLSL from `LAMP_MATH_GLSL`
  and the same constants (`LAMP_CONE_COS`, `LAMP_EXP`, `SPOT_EXP`; `LIGHT_GAIN` 1.6 is rendering only,
  `LAMP_LEVEL_GAIN` 1.2 gameplay only). `moonLight(theme)`: the moon's gameplay share of `lightLevel`. `?gfx=min` keeps Babylon's linear
  real lights for the picture (the field is photometric). History: docs/archive/lighting-review/PROPOSAL.md section 7
  (LR13), numbers in docs/sector-redesign/checks/light-measure.md; tests `tests/lampFalloff.test.ts`.
- (shadow audit; always on since LR16a) `world/shadowAccuracy.ts`: the field reads the ambient fill trilinearly as the
  shaders do; each lamp's door list skips doorways the lamp cannot see (`doorSeen`, `bakeVisSampler`; field and shaders
  build the one list); the light rig sets the game's PBR materials (figures, weapons) to the standard falloff so
  flashlights light them as they light the level (`gameLightFalloff`) and gives shadow maps to cut beams first
  (`torchShadowPass`); guards' body-light samples test flashlights against static geometry (`rayOccluder`). Findings:
  docs/sector-redesign/checks/light-measure.md (shadow audit); test `tests/shadowAccuracy.test.ts`.
  LR15: 8 door slots per lamp (`DOORS_PER_LAMP_ACCURATE`: doors 5-8 in one extra texel per lamp, field and shaders share
  the list; `LAMP_DOORS8`) and torches without a shadow map drawn in `LampPlugin` with the field's `lampTerm` x a cut at
  the beam's reach (`LAMP_TORCH`, `lampTorch` UBO); non-PBR lit materials (fences, ropes, decals) then get no unshadowed
  torch light.
  Build and check: docs/sector-redesign/checks/lr15-build.md, `lr15-check.md`.
- `world/lightField.ts` (pure) `LightField` (`World.lightField`): `levelAt` = ambient grid + moon x moon visibility + the
  lamps listed for the 2 m column x `LAMP_LEVEL_GAIN` x intensity x formula x trilinear baked visibility, closed doors
  (`Doors.list`, `DOOR_SHUT`) cutting a lamp by one segment-leaf test; `dynamicAt` = non-baked lights (flashlights);
  `totalAt`; `bodyLevel` = brighter of chest / head. Allocation-free (a unit test bounds the bytes per query). Without a
  bake: registry ambient, every light dynamic.
- (marlow-jammer) Jammed lamps: the pistol jammer switches a fixed electric lamp (`lamp` / `spot`) through
  `LightRegistry.setOn` from one timeline (`jammer.ts` `lightLit`: a 0.5 s flicker off, off while held, 4 s off after the
  release, a 0.5 s flicker on), so the bake's lamp term, the meter, the guards and the picture agree on every frame; the
  co-op client runs the host's timeline (`sec.dv`) on its own registry. (jammer-fixes) The registry keeps a jammed lamp's
  base state under the jam (`jamStart` / `jamLit` / `jamEnd`, `jammer.ts` `applyJamLight`): wall switches (`setGroup`), the
  EMP and shots move the base, the jam only its flicker; at the end of the jam the lamp takes its base as it is then (a
  group switched off or EMPed during the jam stays off). `baseOn` / `groupBaseOn` leave the jam out: the course's mains
  gates read them, so a jam never counts as the group switched off.
- (piano SO1; its scene caller is gone, the call is kept) `LightRegistry.mainsOff(x, y, z, over = 0.8)`: the mains cut for good. Every electric light (not shot) goes
  dark nearest first, the farthest at `over` s (the per-step `update` runs the ripple, no allocation); torches and
  `window` lights stay. No switch, jam end, EMP outage end, `restore` or `resetTo` (a section restart) turns one back on,
  and `breaker.ts` `darkState` reads it as `DARK_NONE` (no reset walk). The client gets it in the `lamps` snapshot.
- Gameplay reads only the field: `GameState.updateLight` (10 Hz, the local player and, on the host, every remote player's
  `PlayerRef.light`), `Enemy.perceive`, body light (`EnemyManager`, 1 Hz), `Enemy.torchWanted`.
- (guard-ai S15) Guards turn circuits back on: a guard who resets a breaker calls `StealthSystems.resetCircuit`, the
  player's own `toggle` (`LightRegistry.setGroup`, the switch labels and indicator, the `lightSwitch` event), so the field,
  the meter, perception and the picture follow as for a player press; co-op clients get it through the existing light
  sync (Sector Ops `lamps`, `net/lampSync.ts`, reads `baseOn`; Course `lights.groups` reads `groupBaseOn`): no wire
  change. `setGroup` skips destroyed lamps, so a shot lamp is never relit. A course mains gate's circuit is never
  relit by a guard (`StealthSystems.mainsGroups`: cutting it opens the gate). Late discovery reads the registry only
  (`destroyed`, `baseOn`, `group`, `version`) and collision for its one ray (`ai/breaker.ts` `DarkList`).
- (guard-ai LR16-4) The board switch-back sink is wired: `IsolatorBoards.switchBack(i)` (`game/isolators.ts`, the old
  "GA4 hook point") is what a guard's breaker walk calls at a cut breaker board (`StealthSystems.breakerHost.reset`), so
  every circuit of the board comes back through `restore` -> `setGroup` -> the sink's `back(i, BACK_HAND)`, as a player's
  switch-back (labels, wall switches, the `lightSwitch` event, the co-op `lamps` sync). Shot lamps stay dark. A running
  timed window is the player's: `switchBack` refuses it and the timer brings the circuits back.
- Guard flashlights (`world/torches.ts`, pure; coop-torches): `addTorchSlots` (dark maps: `FLASHLIGHTS` 4 slots,
  radius 13, intensity 0.85, cone 0.34 / 0.2 rad), `placeTorch` (eye height x scale, 0.35 m ahead, 0.15 m right,
  pitched 0.16 rad down; crouched past half way 1.0 m) and `beamReach` (rendering only) are the one code for the host
  (`EnemyManager` / `Enemy.placeTorch`) and the co-op client (`net/torchMirror.ts`, from the snapshot's torch bit and
  the guard as drawn). Both pages light the same registry slots from the same values, so the client's meter (its own
  `updateLight` over its field) reads a guard's torch as the host's perception does; the only difference is the
  client's interpolation delay (about 0.12 s behind the host). `tests/coopTorches.test.ts` compares the light at points
  from a host-built and a client-built torch.
- `world/lights.ts` (pure): `LightRegistry` holds state only (lights, on / destroyed, groups, EMP, `zones`, `ambientAt` /
  `zoneAt`, `version`); `contribution` calls `lampMath`; `LIGHT` thresholds 0.28 / 0.6 (bible L6); `visibilityFromLight`;
  `nearestLights`; `lightOnRay` (a padded fixture box or the bulb sphere along the round; walk 4.72: a round landing
  within `LAMP_MOUNT_REACH` 0.35 m under a head, inside its footprint, counts too, so a head on top of its own pole breaks).
  The reach is measured at the segment's end, so callers must pass the round's true landing, not a stretched or
  range-length ray (`lampShotOk` tries the exact claimed landing first). A hit through the reach alone also needs a clear
  static line straight up from just off the landing to the head's underside (`lampReachProbe`, polish2): a round on a
  door soffit under a wall lamp on the far face does not break it. `StealthSystems.shotRay`, the client's `lampRay` and
  the host's `onLampShot` all run that probe (`G.STATIC`), so host and client agree. The fixture box ignores the light's
  `yaw` (axis-aligned `sx` / `sz`): a bulkhead on an x-facing wall keeps `sx` along x, so its footprint reaches ~0.14 m
  into the wall; harmless with 0.2 m walls.
- `world/lightRig.ts`: emissive bulbs (one thin-instanced mesh) for every light, and a fixed pool of `MAX_REAL_LIGHTS` spot
  lights given to the nearest lights at 4 Hz; quality sets how many are lit (`QualityLevel.realLights`). Pool lights are
  never enabled / disabled (no recompiles). Maps without lights create nothing.
- Fitting models (warehouse-lamps; the LED family since sector-fixes L; Sector Ops only): each section's lamps come from
  room tables (`world/maps/lampRooms.ts` `addLampRooms`; `S1_LAMPS`, `S2_LAMPS`, `S3_LAMPS`): per room one model (`panel`
  flush under a ceiling, `strip` on wires under a roof, `bulkhead` on a wall bracket), one height and a regular grid or
  row; per fitting [x, z, radius, intensity], intensity 0 a dead fitting (drawn dark, radius 0, never lit). Every light
  works (G329; Michael 2026-10-25 "Never" to dark spots from lights left off): no map adds a dead fitting, and the
  light-realism job re-lights the existing ones to the band (FOLDED-PLAN J10; warehouseOps is frozen as built,
  Michael 2026-10-25). Strips sit
  under the solid roof strips, never under a sheet. `world/lampMount.ts` (pure) measures each mount from the level's boxes
  (wires <= 0.6 m, a panel's gap <= 0.03, a bracket <= 0.35: wall lights stand 0.3 m off the face so the conservative bake
  sees past their wall) and reports any that cut a ceiling, hang in the air or miss a wall; the light never moves.
  `world/fixtureModels.ts` (pure) builds the meshes; `LightRig.buildFittings` draws a body (one shared pale PBR material)
  and an emissive diffuser per model, thin-instanced, and every link (wires, brackets) as one box mesh.
  `tests/warehouseLamps.test.ts` pins every mount (3 cm), one height and a full regular grid per room, no lamp on or over
  a roof and none within 0.8 m of a climbing pipe, ladder or duct. Each fitting's radius and intensity were tuned against
  the section light tests' bands (`tests/warehouseS{1,2,3}Light.test.ts`); a layout change re-runs them.
- Roof sheets (warehouse-lamps; `LevelBuilder.sheet`, `world/roofSheets.ts`): a translucent sheet is a collision-only
  box (not in the light shapes) plus one see-through mesh that is not a shadow caster, so light passes it in the bake,
  the meter, the guards and the picture alike. A dimmer pass-through needs a translucency rule in the bake (G45).
- Map dressing as `detail` boxes (e.g. `world/maps/warehouseDress.ts`) is out of the light shapes (`canonicalLightShapes`
  skips `detail` pieces); collision-only boxes (`visible: false`) are too. Neither changes the bake.

## Baked lamps (3.2)
- `voxel/lampBake.ts` (pure, in the bake workers): per fixed light (`bakedLights(reg)`: every kind but flashlight) a box
  over its reach of `LAMP_CELL` 0.2 m cells: the share of the fixture's sample points each air cell sees through
  conservative occupancy; solid cells take their brightest air neighbour. (LR16-L) The box's cell planes run through the
  light point (`lampBox`), so a lamp hung up to a cell under its mount sits under the mount's solid row and never shadows
  itself from it (walk 4.82 item 8: the toothed dark band on upper walls); `tests/lampBoxAlign.test.ts` audits every map
  for lamps inside their mount (known data errors listed there). `packLampAtlas` / `fillLampAtlas`, `lampGrid` (2 m
  columns, <= 8 lights each, nearest first; a cone light only in the columns its beam reaches, `lampPlanReach` /
  `lampColumnDist`: radius x sin(its widest angle from straight down) and the cone's plan box, lossless since the
  formula is 0 outside the outer angle; sector-fixes L). `voxel/lampJobs.ts` `bakeLevelLamps` splits the lights across the `WorkerPool`
  and caches (`lamps:` keys, `LAMP_VERSION`).
- `world/bakedLamps.ts` `BakedLamps` (`World.lamps`; built on every path but `cheap` (`?gfx=min`), `?baked=0` off): an R8 3D
  atlas + one RGBA32F data texture (per lamp 8 texels, the 8th its character shadow slot; `MAX_CAPSULES` 16 character
  capsules from `GameState.rtCapsules`, 4 per lamp, re-written each frame). `LampPlugin` (priority 250, on every `PBRMaterial` via `attachAll`): per pixel the lamps
  in its 2 m column - range falloff, cone, N.L - x the atlas x `lampCapsule` soft shadows, added to `finalDiffuse`.
  `LightRig.setBaked(ids)`: the pools skip baked lights and hold <= 4 (`BAKED_POOL`) lights, <= 2 shadowed (`BAKED_SHADOWS`;
  1 with micro detail): the flashlights. GLSL names must not clash with Babylon's macros (`E` is one).
- A material made after load gets the lamp plugin on the next frame (`BakedLamps.frame` re-scans when the material count
  changes).

## Per-section lamp bake (section-bake; Saltmarsh Park only)
Decided, not built yet (G405): the campus lamp bakes ship pre-built with the game instead of baking on the player's PC
(the map-ready job; `docs/systems/performance.md` "Near-instant loads"). The pre-built maps are
`world/shippedBake.ts` `SHIPPED_BAKE_MAPS` (campusOps; a list since piano SO2): `scripts/prebake.mjs` bakes each into
its own `.prebake-cache/<h>/` folder and the game reads `bakes/<map>.json` for each; a map with no section split ships
one file.
Brief and decisions SB1-SB14: docs/sector-redesign/briefs/SECTION-BAKE.md; build report
docs/sector-redesign/checks/section-bake-build.md.
- Opt-in by map id (`world/sectionBake.ts` `SECTION_BAKE_MAPS`: campusOps; regions in `world/maps/campusBake.ts`, per
  section plan rects + its connectors, grown 2 m). Every other map, `?fullbright` and a full cache hit bake as before.
- On a cache miss `bakeLevelLight` lays the whole result out at once (`lampLayout`: every box from `lampBox`, zero cells)
  and starts a `SectionBaker` (`voxel/sectionJobs.ts`, `LightBake.sections`): one lamp per worker job, the live section
  first, biggest box first. A lamp counts for every section its influence square (reach + `BOUNCE.reach` + 2 ambient
  cells + a lamp cell) touches. `GameState.create` waits for the live section beside the shader warm-up; the rest bakes
  in the background. `SectorMode.loadSection` (host) and the client's `ls` move the live section first (no wire
  change); the host's connector cycle waits until the next section is in (normally long done).
- Landing (promise callbacks, never per frame): the visibility in place, the bounce re-joined (`BounceGrid.adopt`, exact
  integer sums), door lists per landed lamp (`lampDoorListInto`), in `LightField` and `BakedLamps` alike. A live-section
  lamp is uploaded and lit at once; any other lamp's atlas tile goes up in `texSubImage3D` slabs (`TILE_BUDGET` 4 MB a
  frame) and its colour fades in over `LAND_FADE_MS` 1.5 s (rendering only: it reaches no point of the live section).
- Parity: per-lamp bytes are independent of the job, so the field at any point of the live section equals the full
  bake's (`tests/sectionBake.test.ts`, exact at random points; the joined result byte-identical). The joined result is
  cached under the full key at the next section change or the match's end (SB14: no mid-play clone).
- Failures (section-bake robust, docs/sector-redesign/checks/section-bake-robust.md): a worker error or a job in flight
  past `JOB_CAP_MS` (60 s: a worker that died silently) is tried once more on the pool (that retry capped at
  `JOB_RETRY_CAP_MS`, 20 s), then baked inline, one lamp per task. A job past its cap is cancelled on the pool; a running
  one's worker is terminated and replaced, so the pool keeps its size (if the replacement cannot start, the pool runs one
  short); the first capped first try is logged once with its elapsed ms (bake5). Once the match plays, an inline lamp of the live
  section bakes at once even while pool jobs run; any other inline lamp waits until the pool is idle or `setLive`
  makes its section live (bake3). A lamp that fails every way lands dark for
  this match only: logged once, and the result is never cached. A load that throws after the bake started
  (`World.create`) stops its bakers (`disposeSectionBakersSince`). During play a live-section landing goes to the head of
  the tile queue (budgeted); `setLive` snaps the new live section's fading and queued lamps to full and moves their
  tiles first. Without `texSubImage3D` the whole atlas goes up for live-section landings and once at the end, never
  per background batch.

## Moving lights: flicker and stutter (LR16-5, Michael M13)
- `world/lampFlicker.ts` (pure): a fire's multiplier (value noise 0.75..1, a few Hz) and a failing tube's stutter
  (mostly on; a burst every ~8 s: chatter off / dim / on, or a drop-out with starter blinks), each a function of the
  lamp's seed (map id + match seed + registry id) and the sim time only. `STUTTER_TUBES`: one tube per main map,
  matched by position at `World.create` (`applyMapFlicker`); every `kind: 'fire'` light enrols itself.
- `LightRegistry.tickFlicker(t)` (once per fixed step in `GameState.updateLight`, before the meter samples; `t` the
  shared clock `NetAttachment.simTime`, snapped to the 60 Hz step) writes `LightDef.flicker` and bumps `flickerVersion`,
  never `version` (the caches, the bounce and the lamp sync do not re-run per frame). No wire traffic.
- Every reader multiplies by `flicker`: `contribution`, the light field (baked and unbaked), the baked lamps' colour
  texel (`writeFlicker`: the flickering lamps only, no new sampler), the pooled lights, the fitting glow, the haze.
  Off / shot / jammed stays off: the multiplier never touches `on` / `destroyed`.

## Moving lights: swinging pendants (LR16-5b, Michael M14; Marlow Yard only)
- `world/lampSway.ts` (pure): a hung fitting on two parallel hangers (bifilar: it translates and stays level, the cone
  never tilts) swings as a damped pendulum, `w = sqrt(g / L)` from its claimed hangers' mean length, `tau` 5 s. Its offset
  is a pure function of its kicks (t, amplitude, heading; 4 a pendant in a ring) and the sim time; a kick is capped so
  the envelope never passes `SWAY.maxAmp` 0.25 m (the visibility stays the rest-pose bake: the audit accepts < 0.3 m).
- Kicks (solo and host, `GameState`): a round within 0.6 m of the fitting (or landing within 1.5 m), a blast within
  6 m, a head within 0.35 m of the fitting box; 0.2 s apart per pendant. Co-op: the host sends each accepted kick (the
  `sway` event, protocol 39) and the client applies it verbatim; a client's own round asks the host (`shot` at
  `sw-<id>`, re-checked there). No per-frame wire.
- `SWAY_PENDANTS` (by map id and light position, matched at `World.create` by `applyMapSway`, before the build): every
  entry that matches a fixture box with 2+ thin vertical hangers above it; the hangers are hidden from the level
  (`visible = false`, already out of the light bake) and drawn by the light rig with the swing.
- `LightRegistry.tickSway(t)` (every fixed step, beside `tickFlicker`) writes `LightDef.swx / swy / swz` and bumps
  `swayVersion`, never `version`. Readers at rest + offset: `contribution` / `lightTerm`, the light field's baked lamp
  (`lampInto`), the baked lamps' t0 texel and `spheres` (`writeSway`, folded into the frame's one data upload; the
  capsules, the doors' test and the character shadow follow t0), the rig's fitting and hangers, the pooled light, the
  haze. At rest: the lamp's visibility (read at the receiver) and the shot test (`lightOnRay`).
- The character-shadow picker holds a swinging lamp's slot and re-renders its map every frame (`moving`).

## Character silhouette shadows (LR14, sector-redesign charshadow)
Rendering only (plan and budget: docs/archive/lighting-review/LR14-PLAN.md; build report:
docs/sector-redesign/checks/lr14-build.md). As in CT, the lamps nearest the player throw the real shape of a guard,
the partner, a body or a held weapon; static geometry stays in the baked visibility atlas; every other lamp keeps the
capsules.
- `world/charShadowSet.ts` (pure): `CHAR_SHADOW_PRESET` (per shadow tier: Off 0 lamps, Low 1 x 256 px, Medium 1 x 512 px,
  High 2 x 512 px, Ultra 3 x 1024, Epic 4 x 1024; bible L18, `charShadowSet.ts:46-53`) into `ShadowSpec.charLamps` /
  `charTile`; `charShadowSpec(tier, mode)` with the settings override (`'auto' | 'on' | 'off'`; on with the tier Off =
  High's set). `LampSlotPicker`: lit baked lamps whose radius + 3 m
  reaches the nearest focus point (the local player, the camera), nearest first, re-picked at 10 Hz; a held lamp
  competes at 0.75 x its distance, holds its slot 0.5 s at least and stays a candidate 1 m further; a lamp going dark
  lets go on the next frame; slots (atlas tiles) stay with their lamp. `fitCone`: each slot's spot frustum around the
  casters' bounding spheres (+ 0.3 m), half-angle capped at 1.25 rad (`partial`); `coneCovers`. Allocation-free.
- `world/charShadows.ts` `CharShadows` (`World.charShadows`, made with the baked lamps; `BakedLamps.charShadows`): per
  slot a `SpotLight` kept off every mesh (`includeOnlyWithLayerMask`: no light, no sampler) and a `ShadowGenerator` (float
  red target, no filter, back faces only) drawing `World.charCasters` in the lamp's reach (`addShadowCaster` minus props,
  through `getCustomRenderList`); after each render (`onAfterUnbindObservable`) an `EffectWrapper` copies the map into its
  tile of ONE float atlas (2 x 2 tiles) and snapshots its view-projection and depth range. Far slots (> 8 m) refresh
  every 2nd frame, x the governor's `shadowEvery`; a slot with no character in reach draws nothing.
- `LampPlugin` `LAMP_CSHADOW` (one sampler `lampCsAtlas`, UBO `lampCsM` / `lampCsP` / `lampCsI`): in the lamp loop after
  N.L, a lamp whose t7 names a slot multiplies `nsCharShadow` (normal offset 2 cm + 0.4% of the distance, Babylon's shadow
  metric, 2 x 2 bilinear PCF on texelFetch, bias 3 cm, floor 0.15 as the capsules'); its capsule list keeps only the
  characters its map does not hold (a partial fit). A fresh pick draws capsules until its map has been copied once.
- Budget: one texture per lit shader while on. Without WebGL2 float or half-float targets the capsules stay. (The voxel
  render path and `?voxels=1` are removed, G282.)
- Parity, flag off (today's default): the meter and guard perception have no character shadows (the capsules are
  render-only). The darkness curve's input (`nsLampRaw`) is unchanged. On screen a mapped lamp's term drops to 0.15
  inside a silhouette, also from casters the capsules lack (partner, bodies, weapons, poses) and on a body's own limbs;
  the meter reads that lamp in full there (`lr14-build.md`, parity note).
- Parity, with `charShadowLight` on (G352, replaces G315's render-only shadows and the bible's old L11; job
  char-shadow-meter): one character contract (`world/charOccluders.ts` `CharOccluders`: one upright capsule per
  character, filled from the sim every step; today's interim fill, `game/charOccluderFill.ts`, holds the players and
  the live guards, dogs as guards; bodies and the real shapes come with Guard AI's and Player's fills) is read by the meter, guard perception and the picture's round shadows (`pictureInto` feeds
  `BakedLamps.capsules`). A source's share at a point is multiplied by the soft capsules between them:
  `level(p) = ambient + bounce + moon x T_moon + sum of lamps L_i x T_i + sum of flashlights D_j x T_j`, `T_s` the
  product of `capsuleTransmit(p, s, c)` over the capsules c between (the sampled character's own skipped, A4; a
  character holding the source, within r + 0.6 m of its axis, skipped, A5; a lamp under `CHAR_LIGHT.minLevel` 0.04 not
  shaded). `capsuleTransmit` is the shaders' `lampCapsule` line for line (`LAMP_CAPSULE_GLSL` is built from the same
  `CAPSULE` numbers). The picture's darkness curve reads the same shadowed level (`BakedLamps.charLevel`, the
  shader's `lampDark.w`: the outline map and the round capsules scale the curve's lamp term as they scale the lit one),
  so a surface in a character's shadow renders as an unshadowed one at that field level (S4 triage). "Every preset darkens a character's shadow on you from the same lamps by the same amount; higher
  presets draw the real outline from the nearest lamps, the others draw soft round shadows." A carried body is one
  capsule on its carrier's shoulder (`fillOperator`, Player J16), owned by the carrier's key, so his own meter skips
  it; on a co-op page it appears when that page's carry shows the body lifted.

  | Preset | Picture under a character | Meter |
  | --- | --- | --- |
  | Off (char shadows off) | round shadow from every lamp (16 capsules, 4 per lamp) | same formula, every set lamp |
  | Low / Medium | real outline from the 1 nearest lamp, round from the rest; both floor 0.15 | same; the outline lamp reads the capsule |
  | High / Ultra / Epic | real outline from 2 / 3 / 4 nearest, round from the rest | same |
  | Shadows Off (moon) | no moon character shadow (cascades off) | moon counted (A6) |
  | Flashlights | torch shadow maps on every tier (`TORCH_SHADOW_PRESET.off` 256, `world/torchShadowSet.ts`) | the capsule formula per flashlight, the holder rule (A5) |
  | `?gfx=min` debug path | no baked lamps, no round shadows | unchanged rule; not a player preset |
- Known limits with the flag on (picture only): 16 capsules in all, 4 per lamp (`bakedLamps.ts` `MAX_CAPSULES`,
  `CAPS_PER_LAMP`), in contract order (players, then the others nearest the local player); outline edges differ from
  the capsule by limbs and weapons; the holder rule (A5) also skips a baked lamp within r + 0.6 m of a character's axis
  in the meter while the picture still shades it; at Shadows Off the picture draws no moon character shadow while the
  meter counts it (A6).
- Co-op: each machine uses its own setting and its own nearest lamps; no wire change. With the flag on a client's own
  meter reads snapshot guard positions, so a shadow edge can lead or trail the host's by up to ~0.3 s (A7). A client
  fills its partners from its own sim view of them (`net/charMates.ts`), in the host's player order.
- Tests: `tests/charShadowSet.test.ts`, `tests/charOccluders.test.ts`, `tests/charOccluderFill.test.ts`;
  `scripts/e2e-lightbake.mjs` (smooth Epic: on, 4 slots, `LAMP_CSHADOW`
  compiled, maps copied, every shader <= 16 textures with the guards alerted).

## Lamp light volume (Kestrel editor only)
The game never builds it; the level editor's light view does (`src/editor/lightView.ts`, G15). Removing it needs an editor
change.
- `BakedLamps` volume mode on standard materials (`standard` / `standardLook`, `remixes`, `volumeAt`), class `LampVolume`,
  pure grid / regions in `voxel/lampVolume.ts`: two RGBA8 3D render targets over the lamp boxes at `LAMP_CELL` (A rgb =
  sqrt(light / `LAMP_VOL_MAX`), B = light-weighted mean direction + how one-way it is), drawn slice by slice by `MIX_GLSL`
  from the data texture and visibility atlas at load and over changed lamps' regions on a registry change. `LampPlugin`
  `LAMP_VOLUME`: two taps, N.L against the direction, capsule shadows from `VOL_CAPS` 4 nearest characters.
- Its darkness parameters are `DARK_STANDARD` (gamma-space standard materials).

## The darkness curve (3.6, bible L5 / L7)
- How bright a space is comes from its lamps and the real-world band for its type ("Decided direction"); the curve only
  decides how a level of light renders, so a lit car park reads lit and dark reads dark where the real gaps are.
- Rendering only. `world/darkCurve.ts` (pure): `curve(s) = s x g x w(g s)`, `w(x) = floor + (top - floor) / (1 + (centre /
  x)^steep)`, from a pixel's summed static level `s` (fill + baked moon + baked lamps, as `LightField` sums them) to the
  level it renders with; `g` the night-vision gain. `DARK_DESKTOP` (linear PBR, then the tone map's toe and the sRGB
  encode) is the game's set, tuned on real pixels to `DARK_TARGETS` (L5); `DARK_STANDARD` serves the editor.
- `LampPlugin` applies it per pixel: each light's diffuse is told apart as it is summed (`CUSTOM_LIGHT{X}_COLOR`:
  directional = the moon, static; hemisphere = replaced by the ambient grid where the grid fills; the rest = flashlights
  and moving lights, added after the curve) on `finalDiffuse`, `finalIrradiance`, `finalRadianceScaled` and `finalAmbient`.
  Uniforms `lampDark`, `lampDarkP`.
- Surfaces (characters, props, weapons, and the level's own boxes) take the ambient grid
  as their fill in place of the hemisphere. `tests/smoothWorldLight.test.ts`
  proves the light shapes and the light field are the same on every smooth path (Epic, Low, `?gfx=min`).
- No light cones: a beam is not seen in clean air, only where it lands. The volumetric haze (post stack) stays. Research:
  `docs/research/night-vision-and-lamps.md`.
- Volumetric beams (post stack, `src/vfx/volLights.ts`, vol-cone-fix): torches (`kind: 'flashlight'`) and cone lights
  without an LED fitting model (floods) draw a long beam; lamps and LED fittings (`fixture.model`: strips, panels,
  bulkheads, with or without a beam optic) scatter a short haze under their shade. A map whose `theme.lampBeams` is
  false (Saltmarsh Park; fog triage, Michael on 4.95.0: "Campus lights look very foggy, can't see through them") beams
  torches only: its 76 glowing-box cone fittings haze like lamps (`PostStackOptions.lampBeams`; Marlow Yard and the base
  Warehouse keep their flood beams). Report: docs/sector-redesign/checks/fog-triage.md; test `tests/volLights.test.ts`.
- Brightness calibration (`BrightnessScreen`, Settings > Display): an exposure multiplier in the grade, `BRIGHTNESS_MIN` ..
  `MAX`. `GameState.brightnessLocked` (nothing sets it now; its mission was the Confrontation, removed by G9).

## Night vision
- Gain: `VISION_GAIN` 6, the darkness curve's floor eased up to `VISION_FLOOR` 1.0 under the goggles (`visionDark`);
  `GameState` eases `BakedLamps.visionGain` with the goggles. Bodies: the flat ambient fill on surfaces is
  scaled by `BODY_FILL` (nv 0.35, render path only; lamp light untouched).
- The tube (`vfx/nightVision.ts`, pure; GLSL `NV_GLSL`): `CinematicPost` maps luma through `nvDrive` (contrast `gamma` 1.3)
  and `nvColor` (a green phosphor, tint 0.35 / 0.85 / 0.30, that clips to pale white from drive 0.85), adds intensifier
  grain (strongest in the dark; `SENSOR_GRAIN.night` 0.06) and the goggle frame (`GOGGLE_FRAME` in `vfx/visionLook.ts`: a
  wide, thin rounded rectangle, about 89% clear at 16:9, corners about 30%). `?gfx=min` lifts the tube input (`postLift` 3).
- Frame auto-gain (`vfx/nightExposure.ts`, pure; measured in `NightBloom`): the scene's mean luma eases (0.5 s) into a
  1x1 target and `CinematicPost` scales the tube input by a clamped gain: 1 inside a band, up to 3 in near-black frames,
  down to 0.6 in over-bright ones. Render path only.
- Bloom (`vfx/nightBloom.ts` runs it while the goggles are on, from `PostProcessManager.onBeforeRenderObservable`): a bright pass
  at `BLOOM.scale` 0.25 (4 bilinear taps masked by `brightShare`), then `passes` 3 x a horizontal and vertical 9-tap
  Gaussian (`spread` 1.3); `CinematicPost` adds the glow's luma x `strength` to the drive. Numbers in `BLOOM`
  (`vfx/nightVision.ts`): `bright` threshold 0.8 on the compressed luma l / (1 + l) (half float; 8-bit keeps `ldrThreshold` 0.85 on raw luma), knee 0.1, strength 0.6 (linear, before TAA and tone mapping); the default pipeline bloom is weight 0 while the goggles are on. Targets are half float where supported, else 8-bit divided by `range` 4. What glows
  is what is bright on screen; nothing glows through a wall.
- Auto-gain (`vfx/nightAutoGain.ts`): up to `GLARE.max` 8 fixed lamps in view within 45 m with a clear Havok ray from the
  camera (each fading over 0.12 s); near lamps (`abcWeight`) turn the gain down (`veil`; `abcAttack` 0.25 s, `abcRelease`
  0.6 s; the image divides by 1 + veil x `gainDrop` 0.6, except highlights from `gainKeep` 0.75 up).
  `LightRig.setVisionBoost` raises the fixtures (`NV_BULB` 8; electro `ELECTRO_BULB` 2.5). Rendering only.
- `NightAutoGain` runs from `scene.onBeforeCameraRenderObservable`, after the camera's update. Reading the camera's matrices
  earlier in the frame marks its view as current, so Babylon sees a moving camera as still and TAA blends stale history
  (the night-vision smear; `e2e-darkness` checks a turning camera reads as moving). Per-frame code must not call
  `getViewMatrix` / `getTransformationMatrix` / `getDirection*` / `getWorldMatrix` on the active camera before the scene
  renders.
- The switch (G181; G100 before it): an instant cut. `VisionState` has no flip; the first frame drawn after the button
  or a wheel pick is the new mode (`e2e-darkness` thermal leg). A change of mode on screen flashes the HUD label for 1.5
  s; the goggle sound plays on on / off only (G181). Wren's goggle moving to the eyes is the figure's
  (`figure.setVision`), not the picture's.

## Thermal and electro (locomotion step 14)
- `vfx/visionLook.ts` (pure, GLSL `VISION_GLSL`): a `vk` branch in the cinematic post pass (1 thermal, 2 electro). No new
  render target or material. Warm bodies and live devices set the free `pattern.w` channel of the PatternPlugin (per
  instance, or per vertex on merged guard bodies), a white emissive added to the lit colour; the ramp then colours by luma.
  Thermal softens with 4 taps in the same pass. Sensor grain and softening on all three modes (A87). Render-only: the light
  meter, the light bake and guard perception never read it.
- Through a shut door (G102, LR16-6; `vfx/doorGhosts.ts`, pure rules `vfx/thermalGhost.ts`,
  `tests/thermalThroughDoor.test.ts`): every rig in `LIVE_RIGS` but the local player's and a dog's hidden stand-in
  (`CharacterRig.standIn`), with thermal heat >= `THERMAL.doorMinHeat` x `bodyEmit` (guards, partners, a body for its
  first 30 s), within `THERMAL.doorRange` 14 m, whose floor line from the camera crosses a fully shut leaf (`open` 0)
  with nothing else static or glass on the sight line (two rays, `G.STATIC | G.GLASS`, the leaf left out). The figure is
  the rig's posed limbs and head (`vfx/silhouettes.ts`, up to `THERMAL.doorMax` 8 figures in 2 thin-instanced draw
  calls), each joint slid along its own camera ray to `THERMAL.doorFront` 0.06 m in front of the leaf: it looks exactly
  like the body, keeps the normal depth test (the player or a crate in front covers it; the wall faces round the frame
  clip what spills past the leaf). The thermal pass reads it at `THERMAL.doorGhost` 0.62 (`ghostEmissive` divides out
  the image-processing exposure): heat ~0.15, CT's dim blue. Cost: no texture, no sampler, no pass; 2 draws while a
  figure shows, 0 otherwise; per frame in thermal a range check per live rig, a door loop and 2 Havok rays per
  candidate behind a shut door (`Ballistics.hitDistance`, no allocation). Each peer draws its own (host and client both
  walk `LIVE_RIGS`; vision is never sent); the co-op client cools its kept bodies on the host's curve (`bodyHeat`,
  stamped through `GameState.bodyStamp` from `net/keptBodies.ts`), so a body stops showing on both peers alike.
  Guards the Sector Ops render freeze disabled still show and walk: a figure stamps its rig's `ghostFrame`, and
  `GuardAnimTier.animate` keeps solving a frozen rig stamped this or last frame (at most 8 rigs, CPU only).
  A vault door (prop leaf, `leaf: 'slide'` anchor) is thick: the figure 0.06 m off its line sits inside the leaf and is
  hidden, so thermal shows nobody through a steel vault door.
  Photo mode skips the vision frame, so a photo keeps the silhouettes of the frame it froze on.
- What glows in each mode: `docs/systems/gadgets.md`.
- The goggle glow (`player/goggleGlow.ts`): the goggle lenses and a rear battery LED as emissive instances of one unlit
  sphere (one draw), always on (brighter in a vision mode), hidden with the head. Visual only.

## Spike log
- `core/spikes.ts` (pure `SpikeLog`): frames over `SPIKE.over` x the budget or the typical frame (`typicalMs`) tagged
  shaders / lod / governor (event bits from the frame and the one before) else cpu / gpu; `GameState.trackSpikes` per render
  frame; benchmark lines end with the run's summary, `feedbackContext().spikes`.
- Tests: `tests/darkCurve.test.ts`, `tests/lampBake.test.ts`, `tests/nightVision.test.ts`, `tests/benchmark.test.ts`;
  `scripts/e2e-darkness.mjs` (GPU list: `npm run e2e:gpu` on Michael's PC), `scripts/e2e-lightbake.mjs`.
- (guard-models) Guard materials are frozen (`guardFigure.ts:136`, like the S1 skin material): a frozen material binds its lights once per material per pass, so every guard must share one light set. A per-mesh light list (`includedOnlyMeshes`, `requireLightSorting`) would silently mis-light every guard but the first drawn.
