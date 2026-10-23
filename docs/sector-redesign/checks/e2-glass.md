# E2 glass (EW6, DEC G45) - build report

Branch `feature/sector-redesign-e2` (Opus). Commits: ed420072 (WIP), f1e97c6e (unit tests), 3f498230 (campus data,
campus test), then the sight-ray step and this report.

## Built
- **Pane piece**: `LevelBuilder.glass(ax, az, bx, bz, height, y, kind, color)` - one collision box `GLASS_THICK` 0.1 deep
  (a fence panel's nav footprint), `visible: false`, `noLedge`, `glass: 'clear' | 'frosted'` (guard-ai's flag on
  `BoxPiece`). Drawn by `buildGlass`: its own static body and one see-through thin-instanced mesh per kind (clear alpha
  0.16, frosted 0.6), not a shadow caster.
- **Light**: `canonicalLightShapes` skips every `glass` piece (clear and frosted, visible or not), so the lamp and moon
  bakes see the pane as an open gap. The meter (`bodyLevel`), guard light reads (`totalAt`) and the picture read one
  field; the meter's runtime light rays are `G.STATIC` and the pane is `G.GLASS`, so they pass too.
- **Collision groups** (`src/physics/groups.ts`): `G.GLASS` (1 << 12), `G.GLASS_FROSTED` (1 << 13, frosted carries both).
  `MASK.SIGHT = STATIC | GLASS_FROSTED`, `MASK.HEARING = STATIC | GLASS`. Glass is in `PLAYER_COLLIDE`, `PROP_COLLIDE`,
  `RAGDOLL_COLLIDE`, `PROJECTILE_COLLIDE`, grenades and ragdoll shapes. Not in `PLAYER_SHOT` / `ENEMY_SHOT` (bullets
  pass) and not in `MASK.WORLD` (camera boom, wall-block and level probes pass).
- **Sight** (G45: clear sees, frosted not): `losClear` (guard sight), `EnemyManager.seesPoint` (lights-out notice),
  the door notice (`stealthSystems`), the recon drone, the security camera lens ray (`securitySystem` `lensRay`) and
  its cue view (`cameraCueView`) all cast `MASK.SIGHT`. `SightWorld` (sector checks): clear glass passes sight, frosted
  is solid, both stop a body.
- **Hearing**: the guard-to-guard and noise wall rays cast `MASK.HEARING` (both kinds are a wall).
- **Nav = fence**: a pane is a nav blocker with the fence footprint (0.1 x len); the down-cast and `pieceBottom` skip it
  (Havok's down-cast is `G.STATIC` only, as for fences). Also never voxels, cover, ledges or detail dressing.
- **Bullets (assumed, A-E2-1)**: G45 says nothing on bullets; panes let bullets through (CT-style "glass is no cover"),
  no shatter. Undo: add `G.GLASS` to `PLAYER_SHOT` / `ENEMY_SHOT`.

## Campus data (SPEC EW6)
21 panes on 15 lines, 6 frosted (the three meeting-room fronts, each cut by its doorway):
- S2: MR1 / MR2 / MR3 fronts, frosted band 0 - 1.2 (`S2_FROSTED_BAND`, over a crouched 1.15 body: SPEC "crouch under the
  meeting rooms' frosted band"), clear to 2.4; facilities glass (A75) clear.
- S3: C2 landing glass over the hall (A23), viewing corridor (west and east), write-up office front, clean room glass:
  clear.
- S4: NOC window clear (E10 makes it armoured, arm-noc).
- The 8 weldmesh fences (S1 site, S3 gas cage) stay fences. Guard nav grid identical cell for cell to the fence fallback.

## Files
src/physics/groups.ts, src/world/levelBuilder.ts, src/voxel/lightShapes.ts, src/voxel/levelVoxels.ts,
src/ai/navBuild.ts, src/ai/perception.ts, src/ai/enemyManager.ts, src/ai/ragdoll.ts, src/ai/reconDrone.ts,
src/cover/coverData.ts, src/world/anchors.ts, src/world/detailPass.ts, src/weapons/grenades.ts,
src/game/sectorCheck.ts, src/game/stealthSystems.ts, src/security/securitySystem.ts, src/vfx/cameraCueView.ts,
src/world/maps/campusS2.ts, campusS3.ts, campusS4.ts; tests/glass.test.ts (9), tests/campusGlass.test.ts (4),
tests/helpers/runtimeNav.ts. Not touched: campusS4Data.ts, campusS5Data.ts, campusSectors.ts.

## Checks
- `npx tsc --noEmit`: clean.
- vitest (single files): glass, campusGlass, perception, securityCamera, securityCameraE8: 72 / 72 pass. campusS1-S5,
  campusRuntimeNav, kestrelCampus, detailPass, lampBake, lampGridLossless, laserPanels, sectors, ctcourseLight,
  securityBodies, securityRoom: 297 pass, 1 skipped (pre-existing).
- No e2e run (brief). Owed at the slice: `e2e-sectorops` campus parts (S2 / S3 routes past the panes), GPU look at the
  pane materials.

## Open items
- **S2 L1 / L2 atrium balustrades** (SPEC "glass balustrade", 1.1 m): still solid `GLASS`-coloured boxes (block light,
  sight, bullets, camera). Converting them changes cover and the CR2 human-ladder edge rays (`teamController`, `G.STATIC`);
  needs a design check before it is done.
- **S5 audit room glass** (SPEC Observe: "from the archive ... through the audit room glass, the anteroom"): the archive
  sits over the anteroom, no line for a pane exists in campusS5.ts; a design call (and S5 is another lane's area).
- S1 gatehouse windows stay `windowAt` panes (already out of the light shapes); sight through a closed one is unchanged.
- Thermal never sees through glass (G45): no thermal vision mode reads collision yet; when it does, cast `G.STATIC |
  G.GLASS`.
- Remaining `G.STATIC` rays that are not sight (takedown, team moves, lift, laser beams, co-op host LOS) pass glass;
  lasers through clear glass are intended, the co-op host's aim LOS (coopHost 962) should follow `MASK.SIGHT` if it is
  used for detection.

## Armoured glass (E10): own collision group - yes
Armoured glass must stop bullets while still passing light and (clear) sight, and normal glass lets bullets through,
so it needs its own bit. What to do:
- groups.ts: `G.GLASS_ARMOURED: 1 << 14`; an armoured pane's body is `G.GLASS | G.GLASS_ARMOURED` (plus
  `G.GLASS_FROSTED` if frosted); add `G.GLASS_ARMOURED` to `MASK.PLAYER_SHOT` and `MASK.ENEMY_SHOT`.
- levelBuilder: an `armoured?: boolean` on `BoxPiece` (or a third kind) and `buildGlass` groups panes by kind + armour.
- **guard-ai must**: (1) carry the armoured flag in its `BoxPiece` glass type / validator; (2) make the guard's
  fire decision test the fire line with `MASK.ENEMY_SHOT` (enemy.ts already fires on it, so the shot stops; the
  "can I shoot / should I move" choice must not use `MASK.SIGHT`, or guards will empty magazines into the NOC window);
  (3) keep sight on `MASK.SIGHT` (armoured clear glass still sees) and treat an armoured pane as a wall for hearing
  (already true: it carries `G.GLASS`).
