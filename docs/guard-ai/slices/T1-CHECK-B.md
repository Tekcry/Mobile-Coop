FIX - 1 blocking item (visible, worse than with 4; no gameplay or co-op parity defect found)

# guard-ai T1 check B: gameplay and co-op parity (Opus, fresh, 2026-10-24)

Branch `feature/guard-ai-t1-anim-tier` @ 3871722d (PR #360), diff vs origin/master: `src/ai/animTier.ts` (:13, :27-28),
`tests/animTier.test.ts`, `changes/feature-guard-ai-t1-anim-tier.md`. The code change matches the brief exactly.
Run: `npx vitest run --maxWorkers=1 tests/animTier.test.ts tests/guardBody.test.ts`: 2 files, 38/38 passed.

## Blocking

1. **The shadow of an out-of-frustum guard that lands in view now updates its limbs every 8th frame (was every 4th).**
   - "Seen" is only the camera pass: the observer is `onAfterActiveMeshesEvaluationObservable`
     (`src/ai/animTierView.ts:38`). It matches `mesh._renderId` to the camera's render id (`:30`). Babylon bumps
     `_renderId` again for every shadow RTT after that evaluation
     (`node_modules/@babylonjs/core/scene.pure.js:4110, 4130, 4163`). A guard drawn only into a shadow map is therefore
     `seen = false`, and he gets the off-screen period (`src/ai/animTier.ts:65`).
   - Guards are skinned casters in real shadow maps:
     - rig and gun: `src/ai/enemyRig.ts:30, 37`;
     - figure: `src/ai/guardBody.ts:143`;
     - lamp maps: `src/world/charShadows.ts:3-4`;
     - moon cascades within 40 m: `src/world/sunCascadeCull.ts:4`;
     - torch maps: `src/world/torchShadows.ts`.
   - Skipped frames keep the last bones and the root moves every frame:
     - figure pose: `src/ai/guardBody.ts:232-237`;
     - figure root under `rig.root`: `src/operators/runtime/guardFigure.ts:343`.
     So the shadow glides with frozen limbs, then snaps by the whole carried time.
   - In Sector Ops this hits most guards on the off-screen tier. The freeze disables every out-of-frustum guard whose
     shadow cannot reach the view (`src/game/sectorGuardFreeze.ts:9-13`). The guards it leaves enabled are mostly the
     ones whose moon, lamp or torch shadow can reach it. On maps without the freeze, every out-of-frustum guard over 4 m
     from a player is on this tier.
   - Cadence: at 60 fps 7.5 Hz (was 15). At 30 fps 3.75 Hz (was 7.5), which looks like stop-motion on a long low-moon
     shadow or a lamp shadow on a lit wall.
   - guard-render treats this cue as a look item ("an off-screen guard's lamp shadow sliding into view",
     `docs/guard-render/STATE.md:16, 23, 63`). The T1 brief's "Look: none (off-screen only)"
     (guard-cap `PLAN.md:127`) assumed off-screen means invisible.
   - Not fixable inside the brief's two files: `animTier.ts` has no shadow input, and `animTierView.ts` (gm-perf) and
     `enemy.ts` are off-limits. One of these is needed before merge:
     - (a) The lead takes a GPU look (8 vs `?animtier=0`, 30 and 60 fps): a guard walking just outside the frustum, more
       than 4 m away, with his lamp or low-moon shadow in view. Michael accepts what he sees.
     - (b) Count a guard whose shadow can reach the view as seen. The freeze already computes this per guard
       (`sectorGuardFreezeView.ts`). This belongs to the gm-perf owner of `animTierView.ts`: `dt(..., shown)` at
       `animTierView.ts:80` already takes a "shown another way" flag. On non-Sector maps it needs the same test.
     - (c) Hold 8 for off-screen guards that are frozen-eligible only. In practice this is the same as (b).
   - Why it blocks: the brief for this check counts "a visible defect worse than with 4" as blocking. CLAUDE.md's
     current-goal rule says checkers block only on broken or unplayable work. Nothing here is broken or unplayable. If
     the lead applies the CLAUDE.md rule, this becomes polish item 0, with (a) as the follow-up.

## Evidence: what reads the pose, and why it is not affected

Gameplay never reads the host guard's animated pose. Every reader below is sim, or full rate whenever it matters.

- **Guard hit volumes:** the sim head `guardHead` (`src/ai/enemy.ts:599, 3739`), synced from `pos` every step
  (`:3741`). The rig is not read (`src/ai/guardHead.ts:1-7`).
- **Guard perception eye:** sim, `pos` plus a constant height (`src/ai/enemy.ts:869-871`).
- **Muzzle origin of guard shots:** the sim eye with fixed offsets (`src/ai/enemy.ts:3394-3401`). The armour gate
  (`:3411-3416`) and the shot ray (`:3421-3435`) use it. Tracer and flash are drawn from the same sim origin
  (`:3436-3437`), so a guard behind the camera shoots exactly as before.
- **Picking and raycasts against guard meshes:** none.
  - Merged body and figure are `isPickable = false` (`src/player/smoothBody.ts:248`,
    `src/operators/runtime/guardFigure.ts:479`).
  - The only `scene.pick` is the editor (`src/editor/scene3d.ts:1292`).
  - Ballistics hits sim hitboxes.
- **Mesh bounds:** fixed rest boxes ("the skinned bounds never refresh", `src/player/smoothBody.ts:250-251`;
  `guardFigure.ts:491`), so culling does not depend on the pose. `alwaysSelectAsActiveMesh` is set only on a loose
  (ragdoll) body (`smoothBody.ts:319`).
- **Takedown and grab alignment:**
  - The player's hands read the victim's neck and shoulder (`src/game/takedownController.ts:686-702`) only while a
    takedown is active. The victim is `taken` then, so pinned and solved every frame (`src/ai/enemy.ts:3826`,
    `animTier.ts:64`).
  - Approach and grab happen within reach, under the 4 m near-player rule (`animTier.ts:64`). The partners' feet are in
    that list (`src/game/gameState.ts` `playerRefsInto`, which pushes `remotePlayers()`).
- **Torches:** placed from sim `pos` / `yaw` / crouch (`src/ai/enemy.ts:1884-1886`, `src/world/torches.ts:44`). The
  client mirrors them the same way (`src/net/torchMirror.ts:72`).
- **Light meter and light parity:** the light field has no character shadow (`src/world/charShadows.ts:7`), and the
  guards' torches are sim. T1 changes nothing the meter or perception reads, so light parity holds.
- **Footsteps and noise:** guard steps do not come from rig foot plants. The only plant-driven steps are the player's
  (`src/audio/gameAudio.ts:161`).
- **Bodies:**
  - `Body.pos` and the lie come from the sim (`src/ai/body.ts:34-60, 71`), and the ragdoll snaps to that lie
    (`body.ts:118-119`).
  - The stale pose at death seeds only the ragdoll's limbs. Render only: polish 2.
- **Thermal door figure:** a stamped rig counts as seen, frozen or not (`src/ai/animTierView.ts:122, 125`;
  `src/vfx/doorGhosts.ts:104`).
- **Night vision:** a normal camera pass.
- **LKP ghost:** captures the player's rig only (`src/vfx/lkpGhost.ts:24-26`).
- **Views:**
  - The optic cable and the sticky cams move the one main camera (`src/game/opticSystem.ts:179`,
    `src/game/gadgetSystem.ts:611-617`), so they are local views and count as seen.
  - No CCTV feed or remote view renders through its own RTT camera. The RTTs are post buffers only
    (`src/vfx/taau.ts:200`, `src/vfx/nightBloom.ts:268-285`) and `bakedLamps`' 3D texture (`src/world/bakedLamps.ts:1017`).
  - Nothing sets `activeCameras` (only read, `animTierView.ts:98`).
- **Co-op:**
  - The tier runs only on the host's `Enemy` (`src/ai/enemy.ts:551, 3826`). "Drawn in no local view" means the host's
    own camera pass only.
  - The client draws its own `EnemyPuppet`, solved every frame with no tier (`src/net/enemyPuppet.ts:500`). Its hit
    head comes from `guardHead` on wire inputs (`:487, 502-503`).
  - A guard off-screen on the host but visible to the client therefore looks smooth on the client, and nothing
    pose-derived goes on the wire:
    - judge rewind from sim feet and heads (`src/net/coopHost.ts:1286, 1626-1627`);
    - no rig branch in `src/net/shotHistory.ts:10`;
    - partner volumes from its sim body (`src/net/coopHost.ts:1805-1816`).
  - A partner shooting a guard the host cannot see is judged on sim volumes, as with 4. No parity break.
- **The figure's own half rate:** `guardPosesNow` (`src/operators/runtime/guardLod.ts:44-47`) has a
  `frame - posedAt >= 2` escape, so an even tier period cannot alias it into never posing.
- **Tests:** the tier constant is not pinned outside `tests/animTier.test.ts`. `tests/guardBody.test.ts:227-252`
  checks the far tier, and `tests/sectorGuardFreezeView.test.ts:365+` checks the frozen tier. Both pass.

## Polish (not blocking)

1. **First visible frame:** a guard entering view (a camera swing, a hard cut into a sticky cam or the optic) is drawn
   once with a pose up to 7 frames old (was 3), then catches up the next frame. S4 doubt 2 (`docs/guard-render/STATE.md:479-480`)
   now reads "up to 7". The 1 m box pad hides most slow turns. Fix (gm-perf): solve in the camera evaluation for a
   guard just turned seen, as the freeze's `thawPose` does.
2. **Ragdoll seed at death:** a non-frozen off-screen guard killed (a partner's shot, a grenade) seeds his ragdoll from a
   pose up to 7 frames old (`src/ai/enemy.ts:2091` solves only a frozen rig). Render only: `Body.pos` and the lie are
   sim. A `solveNow` when `animTier.skipped` would close it (`enemy.ts`, off-limits for T1).
3. **Recoil:** `rp.kick` decays every frame (`src/ai/enemy.ts:3782`), so an off-screen guard firing shows a recoil pulse
   on at most 1 of 8 frames (was 1 of 4). Visible only in his shadow (S4 checker polish 2, pre-existing).
4. **Frame rate:** the period counts frames, not time. At 30 fps, 8 frames is 267 ms. If item 1 is accepted as is,
   consider a time cap for the off-screen period (for example at most about 0.13 s), so slow machines are not hit
   hardest.
5. **Stale "every 4th" text:**
   - The guard-cap C1 brief text (`PLAN.md:94`, "off-screen solves every 4th") should read `ANIM_TIER_OFFSCREEN` when
     the puppet tier lands.
   - The guard-render S4 plan line (`docs/guard-render/PLAN.md:90`) still says 4.
6. **Changelog fragment:** "Gameplay is unaffected (hit volumes come from the sim)" is accurate. It could add "a guard's
   shadow in view updates its pose at the off-screen rate", which matters if item 1 is accepted as is.
