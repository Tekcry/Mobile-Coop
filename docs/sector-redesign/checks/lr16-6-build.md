# LR16-6 vision polish build (Opus)

Base `origin/feature/sector-redesign-lr16-entry` 6e53e036; branch `feature/sector-redesign-lr16-6`. Authority: G100, G102
(DECISIONS), G181 (the wheel picks the mode, one button toggles, no flip between modes), bible Vision table and 5.x
goggle modes, CT measure `docs/locomotion/research/ct-measure-walls-doors-combat-vision.md` s.4 (thermal: "a guard behind a
closed wooden door shows as a dim blue silhouette", low end of the ramp, soft; mode switch an instant cut).

## Found at the base
- G100 was already built by prototype A5 and lr16v (5ee3a270): `VisionState` has no flip, `CinematicPost` no flip band.
  Left: a wheel switch with the goggles on changed the picture with no HUD label (only the button reset the timer).
- G102 was built by lr16v as one ellipsoid blob per guard / host-side partner (rendering group 1: drawn over everything,
  the player's own body included), from `enemyMgr.enemies` and `remotePlayers()` only: nothing on the co-op client
  (no enemy manager, no remotes list there), no bodies, dogs drawn as human blobs, rays `G.STATIC` only (glass passed),
  one draw per blob. Its emissive 0.72 is display-space: with the pipeline's exposure 1.08 the thermal pass read ~0.75,
  heat ~0.5 (teal / green), not CT's dim blue.

## What G100 / G102 now do
- G100: every change of the mode on screen (button or wheel) is an instant cut and flashes the HUD label for 1.5 s
  (`gameState.renderVision`, `visionShown`). The goggle sound stays on on / off only (G181).
- G102: `vfx/doorGhosts.ts` draws a posed silhouette of every warm rig behind a fully shut leaf:
  - who: `LIVE_RIGS` minus the local player's rig and dog stand-ins (`CharacterRig.standIn`, set in `ai/enemy.ts` and
    `net/enemyPuppet.ts` for quadrupeds), heat >= `THERMAL.doorMinHeat` 0.5 x `bodyEmit` (guards, partners, a body for
    its first ~30 s of cooling), within `THERMAL.doorRange` 14 m, floor line camera -> hips through a shut leaf
    (`open` 0), and two rays (camera -> 0.2 m before the leaf, 0.2 m past it -> chest) clear of `G.STATIC | G.GLASS`.
    Host and client both walk `LIVE_RIGS`, so each peer draws its own; frozen Sector Ops guards still count.
  - how: the rig's limbs and head (`vfx/silhouettes.ts`, the LKP ghost's figure builder) with each joint slid along its
    own camera ray to `THERMAL.doorFront` 0.06 m in front of the leaf (`thermalGhost.doorPlaneFactor`): on screen it is
    exactly the body's shape and pose; normal depth test, so the player or a crate in front covers it and wall faces
    round the frame clip the part past the leaf.
  - look: the thermal pass reads it at `THERMAL.doorGhost` 0.62 (was 0.72; `ghostEmissive` divides out the exposure):
    heat ~0.15, between CT's deep blue (3,12,222) and blue rim stops. The pass's 4-tap soften blurs its edge.
- Gameplay, the light meter and guard perception never read any of it (render frame only; `visionIsolation` passes).

## Files
- `src/vfx/thermalGhost.ts` (new, pure): `closedDoorIndex`, `closedDoorCrossing`, `inGhostRange`, `ghostWarm`,
  `doorPlaneFactor`, `ghostEmissive`.
- `src/vfx/doorGhosts.ts`: rewritten on `Silhouettes` + the pure rules; re-exports `closedDoorCrossing` / `GhostDoor`.
- `src/vfx/silhouettes.ts`: `add(rig, warp?)` (a `PointWarp` moves each point and scales sizes), the joint list hoisted
  (it allocated an array per call), `fog` constructor flag, `setGrey`.
- `src/vfx/visionLook.ts`: `THERMAL.doorGhost` 0.62, `doorFront`, `doorMax`, `doorMinHeat`.
- `src/game/gameState.ts`: `renderVision` passes `LIVE_RIGS` and the player's rig; label on any mode change.
- `src/player/characterRig.ts` (`standIn`), `src/ai/enemy.ts`, `src/net/enemyPuppet.ts` (one line each: set it on dogs).
  Render-only field, no wire change.
- `cinematicPost.ts` and `vision.ts`: unchanged (no flip left to remove).
- `scripts/e2e-darkness.mjs`: thermal leg (below). Docs: `docs/systems/lighting.md`, `docs/systems/gadgets.md`,
  `docs/systems/testing-tools.md`, `TESTING.md`, `changes/feature-sector-redesign-lr16-6.md`.

## Perf / cost
- Textures / samplers: none added; the cinematic pass is unchanged (no uniform, no sampler, no branch). No new pass.
- Draws: 2 (limbs + heads, thin instances) while 1-8 figures show, 0 otherwise (meshes disabled). lr16v drew one per blob.
- Upload: the limb buffer (8 x 11 x 64 B = 5.6 KB) and head buffer only on frames with a figure (or the frame they go).
- CPU in thermal per frame: per live rig a cached `getAbsolutePosition` + range test; in range a door loop; per
  candidate behind a shut door 2 Havok rays, 23 joint reads, 12 matrix composes. Thermal off: nothing (one early gate).
- No per-frame allocation (joint array hoisted, scratch vectors and the crossing object reused, `Vector3.Distance`).
  (Fix round: at 543cb6da this was not true of the 2 rays, `Ballistics.ray` built a result object and vectors per
  call; they now use the allocation-free `Ballistics.hitDistance`.)
- The silhouette material compiles the first time a figure shows (a possible one-off shader hitch; the spike log tags
  it). Not prewarmed.

## Tests
- `tests/thermalThroughDoor.test.ts` (new, 6): door index and crossing, range, warmth threshold vs the 1/16 cooling
  steps, the look (dim blue, low on the ramp, exposure divided out), the figure plane (every point lands
  `doorFront` in front on its own ray; in front / parallel untouched; floor 0.02), and `DoorGhosts` on a real
  `CharacterRig` (NullEngine): one figure with its head at -doorFront; none with thermal off, the door open, a wall /
  glass hit, cold, a stand-in, out of range, or the player's own rig.
- `tests/doorGhosts.test.ts` (4, unchanged, via the re-export), `tests/vision.test.ts`, `tests/nightVision.test.ts`,
  `tests/visionIsolation.test.ts`: 5 files, 38 passed.
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (42 warnings, none in changed files).
- `scripts/e2e-darkness.mjs` thermal leg (GPU list, unrun: no e2e on the desktop): the button cuts to thermal on the
  first rendered frame; a guard placed 1.2 m behind a shut hinged Warehouse door (first of up to 6 that works, HUD
  hidden, guards stilled) gives `doorGhosts.count` 1 and the screen centre reads dim blue (blue +40 over the same view
  with him moved away, red < 70, green < 110); door open -> 0; the button cuts back to off on the first frame.

## For the laptop (Test Runner)
- `E2E_GPU=1 node scripts/run-e2e.mjs e2e-darkness` on port 4189 (GPU list). If the colour assert fails, the printed
  `silhouette rgb ... guard gone rgb ...` line says which way `THERMAL.doorGhost` must move.
- GPU shot: thermal at a shut door with a guard 1-2 m behind it (Warehouse or campus S1), and one with the player
  standing between the camera and the door (her body must cover the figure).

## Open
- A part of the figure past the leaf's edge shows only where the wall face round the frame is less than 0.06 m in front
  of the leaf line (flush-mounted doors): it can spill a little onto that wall. A stencil clip would fix it if seen.
- Dogs behind a door show no silhouette (no four-legged figure; co-op has no dogs, G155).
- Photo mode skips the vision frame: a photo keeps the silhouettes of the frame it froze on.

## Fix round (Opus, after check A FIX / check B PASS)

Base 543cb6da. Render only throughout: no wire, `PROTOCOL_VERSION` or save change; single player still reaches
`src/net` only through the dynamic import (`GameState.bodyStamp` is a plain function field; `src/net/keptBodies.ts` is
imported by `coopClient.ts` only).

1. MUST (A1), co-op client bodies never cooled, so a kept body behind a shut door showed for good on the client
   (~30 s on the host). `src/net/coopClient.ts`: `keptAt` (:78) set beside `kept.set` (:731), deleted in `dropBody`
   (:1099), cleared on dispose (:1159); `stampBodies` (:1091) wired as `g.bodyStamp` (:218, nulled on dispose :219).
   The loop is `src/net/keptBodies.ts` `stampKeptBodies` (`Map.forEach` with a module function: no iterator or closure
   per frame). `src/game/gameState.ts`: field `bodyStamp` (:2534), `if (on && !bodies) this.bodyStamp?.(f);` after the
   host bodies block (:2596). The cooling curve moved to `vfx/thermalGhost.ts` `bodyHeat` (:57), used for rigs and dogs
   in `paintHeat` (:2603, :2613; same arithmetic). Also fixes the client's main-pass body cooling.
2. SHOULD (A2), Sector Ops door figures were statues. `CharacterRig.ghostFrame` (characterRig.ts:4666, -1 never);
   `DoorGhosts.consider` stamps it before `fig.add` (doorGhosts.ts:104); `GuardAnimTier.animate` (animTierView.ts:107)
   treats a rig stamped this or last frame as not frozen and as seen (`dt(..., shown)`, :75), so it solves every frame
   like a guard in view, not at the off-screen tier's 1 in 4. At most `THERMAL.doorMax` 8 rigs, CPU only.
3. Polish taken: the 2 rays use `Ballistics.hitDistance` (gameState.ts:2569; doorGhosts.ts:97 and :100, the ray now
   returns a number; camera side blocked under the full length - 1e-3, body side under it - `BODY_SLACK`), the Perf
   claim above corrected; `doorPlaneFactor` returns 1 when the leaf line is behind the camera (thermalGhost.ts:85);
   the e2e colour read is a 12 px square at the guard's projected chest (hips-neck midpoint, `Vector3.Project`), the same
   pixels with him gone (e2e-darkness.mjs:253-272); the `Math.random` spy is restored (`afterEach`); `lighting.md` says
   a vault door hides the figure, and documents the client cooling and the frozen-guard solve.

Tests: `thermalThroughDoor.test.ts` +2 cases (`bodyHeat` half-`coolTime` cut; `stampKeptBodies` on the client: a body
past half `coolTime` no longer `ghostWarm`) and extended (t <= 0; the ray stub now a `hitDistance` one; body-side hit
within `BODY_SLACK` shows, well short blocks; `ghostFrame` stamped on the figure only); `sectorGuardFreezeView.test.ts`
+1 (a disabled-root rig with a fresh `ghostFrame` animates, one frame behind still does, stale or unstamped stays frozen).

Runs: `npx tsc --noEmit` clean; `npm run lint` 0 errors (42 warnings, none in changed files); vitest `--maxWorkers=2`
under a slot lock: thermalThroughDoor, doorGhosts, vision, nightVision, visionIsolation, animTier, sectorGuardFreeze,
sectorGuardFreezeSeeThrough, sectorGuardFreezeView, enemyGunMerge, enemyLightsOut, enemyManagerDespawn, net, netSim,
coopFix, coopGuardAi, coopGuardCarry, coopTorches, coopWalkFixes, ratingRejoin: 20 files, 250 passed.
`node --check scripts/e2e-darkness.mjs` clean. No e2e, build or GPU.

Laptop: `E2E_GPU=1` e2e-darkness (port 4189; the colour read moved to the chest), e2e-coop and e2e-netmove (`src/net`
and `src/game` changed). GPU look: a guard walking behind a shut door in Sector Ops (figure walks, no glide); co-op
client in thermal, a body behind a shut door gone after ~30 s as on the host.

Left for later (polish): A4 / B5 unplaced puppets and first-snapshot rigs for a frame, A7 prewarm, B2 grazing
angle, B4 photo mode, B6 `Silhouettes.jn`.
