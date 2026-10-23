# G7 report: integration

Branch `feature/gm-g7` off feature/guard-models 480c6182. Opus. Started early on Wren's LOD files as the stand-in (G5's
`STAND_IN_PREFIX` path) while G4 bakes the real guard files.

**`flags.guardModels` is DEFAULT OFF on this branch** (`?guardmodels=1` turns it on; `?guardmodels=0` is today's
merged S1 body, A10). G8 flips the default (`params.get('guardmodels') !== '0'`) after its budget run.

## What
- `src/core/flags.ts`: `guardModels` (default off, see above).
- `src/operators/guards/guardAssets.ts` (new, no Babylon): the resolver. **The seam for G4 is the two
  `import.meta.glob` lines** over `src/operators/assets/guards/`: `guard-<base>-lod0/1/2.glb`, `guard-<base>.json`
  (`{ pieces, tintSlots, refHeight }`, the manifest minus urls) and `guard-shield_riot-lod0/1/2.glb`. A base with all
  four files (valid by `validateGuardManifest`) uses them; otherwise it resolves to `guardStandInManifest` on Wren's
  play LODs (a warning names the reason when some files are present). Dropping G4's files in the folder is the whole
  switch-over; no code change.
- `src/operators/guards/guardTints.ts` (new, pure): SPEC 8 tint table per guard (uniform / kit / headwear / hair /
  skin / none, kit order), linear target / neutral, fabric jitter, encoded with `toGammaSpace` (pow 1 / 2.2) to match
  the plugin's `toLinearSpace`. Sources: faction torso (runner, officer: own torso), faction backpack, faction helmet
  (heavy / enforcer `#14161a`, officer his own helmet colour), variant hair colour and skin tone. Stand-in: untinted.
- `src/ai/guardBody.ts` (new): `GuardBody`, the figure over a guard's CharacterRig. Built right after the rig (in
  `buildEnemyRig` and `buildBodyRig`), scale `def.height / manifest.refHeight` (A2), LOD2 first (`?gfx=min`: LOD2
  only), then `warmPlayLods` with the base's play urls. The merged body (or the parts) stays enabled until the first
  LOD is in, then is disabled (no invisible guard; a failed load leaves it). One `onBeforeRender` observer per scene
  runs every guard body: heat (`rig.heat`), the owner's flash, then `figure.update(camera)`, skipped while the owner's
  S4 anim tier skipped the solve (`skip`, never on the first show). Look (`setLook`, the 7-bit seed) and gear
  (`setGear`) rewrite pieces / tints only on a real change; pieces are `setPieces(p.ids, p.count)` from G6's reused
  `applyGear` output, never `options.pieces`. `guardBodyOf(rig)` finds the body over a rig (a dead guard's rig as his
  `Body`); each owner disposes it before the rig, and the rig root's dispose frees it as a fallback (the co-op client's
  ragdolls, whose code G7 does not touch). No per-frame allocation.
- `src/ai/enemyRig.ts`: `buildEnemyRig` returns `figure` (GuardBody or null: flag off, the dog).
- `src/ai/enemy.ts`: gear sync (`showGear`) sets the figure's pieces instead of building placeholders; the frame sets
  the look seed (the manager sets `look` after the constructor; a wake copies it) and the flash, `animTier.watch`es
  `gb.viewMesh` (re-read every frame, so a LOD switch is followed) and gates the pose with the tier's `dt < 0`; the
  knock-off hides the helmet piece and drops helmet_std's box (below); dispose frees the figure first; death hands the
  figure on with the rig (flash cleared). Enforcer: `guardShieldFor` else `buildShieldPart`.
- `src/net/enemyPuppet.ts` (gear and seed lines): figure from `buildEnemyRig`; gear bits -> `gb.setGear`; the wire
  seed (`lookSeed`, G6n) -> `gb.setLook` each frame from the state shown; the drop with helmet_std's box;
  `gearShown` reads the figure; `shownPieces` getter for e2e; dispose / die as the host. No wire change,
  `PROTOCOL_VERSION` untouched.
- `src/ai/body.ts`: `buildBodyRig(..., gear)` gives a carried body's fresh rig a GuardBody with the guard's look seed
  and helmet / armour as he went down (`Body.gearNow`: from the figure he fell in, else `body.guard`); the body adopts
  the rig's figure at construction and frees it before the rig.
- `src/ai/helmetDrops.ts` (A6): `HELMET_STD_DROP` (G3's `anchors.drop`, 0.253 x 0.202 x 0.2605 m at 1.77 m) and
  `guardHelmetDrop(height)`: with the flag on every kind drops helmet_std's box scaled to his height (confirmed:
  helmet_heavy has no drop anchor, so heavies and enforcers drop helmet_std too). Once a real average / lean base file
  with a helmet_std piece is in, drops are instances of `guardHelmet.ts`'s mesh (helmet_std's own LOD1 triangles,
  centred, faction helmet colour as vertex colour over the base's shared material), scaled to the asked box; the
  placeholder box until then and with the flag off (unchanged).
- `src/ai/guardHelmet.ts` (new): the helmet drop mesh source (per scene, built on the first drop).
- `src/ai/guardShield.ts` (new): the enforcer's shield_riot GLB skinned on the figure's own skeleton (joints matched
  by name: elL / wrL), parented with the shown LOD's meshes, following LOD switches; LOD1 at every distance, always
  active, +1 draw per enforcer. Only when the shield files and a real broad base are in; else `buildShieldPart`.
- `src/ai/animTierView.ts`: `GuardAnimTier.watch(mesh)` (swap the tracked mesh, no allocation). Needed: the merged
  body is disabled once the figure draws, so the old track would read the guard as off-screen for ever.
- `src/operators/runtime/offline.ts`: `warmPlayLods` was once per page (a second call with other urls returned the
  first run and never warmed them). Now each url once per page; later calls queue behind, in their own order; urls asked
  before the worker controls the page are warmed at `controllerchange`. Wren's first call behaves as before.
- `vite.config.ts`: `guards` runtime cache (CacheFirst, `/assets/guard-*.glb`, 24 entries = two builds of 12 files)
  before the `operators` rule, so the guards never evict Wren's 8 entries. (PLAN said "the operators cache"; a cache of
  its own is the weapons' pattern.)
- `src/operators/lab/glb.ts`: `parseGlb` reads `_PIECE` / `_TINT` into `GlbMesh.piece` / `tint` (G5 decision 8: "G4 /
  G7 add two lines"). Without it G4's files would load with every vertex as the body piece.
- Not touched: `src/operators/runtime/guardFigure*.ts`, `gearMask.ts`, `scripts/operators/**`, `src/net/protocol.ts`,
  `src/ai/gearParts.ts` (placeholders kept for `?guardmodels=0`).

## Decisions I assumed
1. Default off (lead's instruction) until G8.
2. G4's file names and the `guard-<base>.json` shape above (nothing in GB / G4 named them yet). Tint slot index =
   `guards.json` `tintSlots` order.
3. One render observer per scene drives every guard body (living, ragdoll, carried, client ragdoll), after the game
   frame and before active-mesh evaluation; headless steps (no render) pose no figure (render only).
4. Carried bodies keep the gear bits they went down with (helmet still on unless knocked off).
5. Officer: one headwear slot, so his cap and any helmet take his own `look.colors.helmet`.
6. The stand-in is drawn untinted (Wren's albedo has no tint mask) and with one piece, so gear changes are tracked
   (`helmetOn` / `shownPieces`) but not visible until G4's files.
7. Shield on the figure skeleton (skinned by joint name) rather than a rigid node attach: G3 built it in the broad bind
   pose on elL / wrL, so the base skeleton's bind matches exactly.
8. Flash on a dead guard's figure is cleared at death (the body is not flashed).

## Tests
- `npx tsc --noEmit -p .`: clean. `npx eslint` on all 17 changed / new files: clean.
- New: `tests/guardResolve.test.ts` 9 passed (resolver: none / full / partial / invalid / other base, shield urls,
  warm order and dedupe; SPEC 8 example urban torso -> (0.11, 0.13, 0.16) and its byte round trip, slot sources,
  skin / hair / jitter, white tail; helmet_std drop box). `tests/guardBody.test.ts` 14 passed (NullEngine, a synthetic
  guard GLB with `_PIECE` / `_TINT` attributes through the real reader: flag off = no figure, merged body drawn, dog
  never; flag on: merged body until the first LOD, then off, the figure shows on the next render, scale, shadow list;
  every manifest piece shown iff in `applyGear`'s list across look / gear changes, a shrinking list's stale tail never
  shown, no rewrite on no change, a new seed re-varies; tier skip gates the pose but not the first show, flash and heat
  forwarded; despawn by owner and by rig dispose alone; a carried body keeps look / gear / pieces and frees the old
  figure, hide frees the new; host and client same pieces and tints per seed; stand-in untinted; helmet_std drop mesh
  centred and drops instanced and scaled, box when no file has it; shield skinned on the shown skeleton by joint name
  and freed with the figure, none without files or for other kinds; `GuardAnimTier.watch`; host `Enemy` and client
  `EnemyPuppet` gear sync on stand-ins: pieces via `setGear`, no placeholder parts, drop with helmet_std's box and the
  faction helmet colour).
- Must stay green: `guardPoseGolden` 1 passed / 1 skipped (capture), `animSkeletonGuardIdentity` 1 / 1 skipped
  (capture), `mocapGuards` 3.
- Also run, all pass: gearWiring 21, guardFigure 13, gearMask 10, guardVariant 30, guardLook 13, coopGuardAi 16,
  coopGuardCarry 9, coopTorches 12, smoothBody 4, guardGunCarry 2, carry 9, operatorsRuntimeFigure 3,
  operatorsRuntime 18 / 1 skipped, enemyManagerDespawn 4, sectorRestart 9, responseWiring 17, bodySearch 7.
- Totals: 22 files, 225 passed, 3 skipped (all pre-existing capture / file skips).

## Laptop suites wanted
- Flag off (today's path, regression; `src/net/enemyPuppet.ts`, `src/ai`, `offline.ts`, `vite.config.ts` changed):
  `e2e-enemies`, `e2e-combat`, `e2e-takedown`, `e2e-guard-carry`, `e2e-stealth`, `e2e-coop`, `e2e-netmove`,
  `e2e-offline`, `e2e-ctcourse`, `e2e-sectorops`.
- Flag on (first real GPU compile of `GuardFigurePlugin`, the stand-in in play): a scratch commit with the default
  flipped to `!== '0'`, `E2E_GPU=1`: `e2e-enemies`, `e2e-combat`, `e2e-guard-carry`, `e2e-coop`, plus one console check
  on `?autostart=ctcourse&mode=course&guardmodels=1` (no shader errors, guards visible). Or add an `E2E_GUARDMODELS`
  switch to the runner like `E2E_FALLOFF` (scripts, not G7's files).

## Open items
- Level load does not await the guard LOD2s (PLAN G7 last bullet): needs a hook in the loading screen / gameState
  (not G7's files). The merged body covers the gap, so no guard is invisible; the same hook should warm the plugin's
  shader variant (PLAN 8 risk).
- Per-base carry mounts (`guards.json` `mounts`, 0 placeholders): need G4's bodies and the look sheet's S21 carry poses;
  data only, nothing reads them yet (the rig's own weapon mounts are used).
- `_PIECE` / `_TINT` are read as unnormalised integers (as `_GOGGLE`); G4 must write them so.
- The helmet drop mesh and the shield are tested on synthetic files only; recheck when G4's files land (shield bind
  must be the broad base's bind; G3 notes elL / wrL 0.5 shear on wrist bend).
- Stand-in visuals: Wren at guard height, both goggle states, untinted (cosmetic; gone with G4's files).
- With `?guardmerge=0` and the figures on, the anim tier has no body to watch and never marks a guard off-screen
  (full-rate solve); only a comparison mode.
- G5 polish still open: two varyings in the plugin may hit the PBR varying limit at the first GPU compile (pack into
  one vec4); `groupByPiece` uses a triangle's first vertex (G4 splits vertices at piece seams).
