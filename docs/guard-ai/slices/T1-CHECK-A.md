FIX - 1 blocking item (off-screen guards whose shadow lands in view now pose at 1/8 rate)

# guard-ai T1 check A (Opus, fresh): animation consumers of the off-screen period

Change: `git diff origin/master...HEAD` on feature/guard-ai-t1-anim-tier (3871722d): `ANIM_TIER_OFFSCREEN` 4 -> 8
(src/ai/animTier.ts:28), tests, changelog fragment. Angle: what the doubled solve interval does to everything that
consumes it.

## Blocking

1. **A guard outside the frustum whose shadow is in view: his shadow now updates at 7.5 Hz at 60 fps and 3.75 Hz at
   30 fps (was 15 / 7.5 Hz).** Between solves his whole leg pose slides with the body and then snaps back. This is a
   visible pop that is worse than with 4, and it happens in a case the project builds for on purpose.
   - Visibility is camera culling only. `markSeen` runs on `onAfterActiveMeshesEvaluationObservable`, so shadow and
     RTT passes never mark a guard seen (src/ai/animTierView.ts:9-10, :20-31, :38, :89). The S4 checker accepted this
     at period 4 (docs/guard-render/STATE.md:490).
   - A skipped solve also skips the figure's pose (src/ai/guardBody.ts:236, `skip` from src/ai/enemy.ts:3828). The
     skinned figure keeps stale bones, and every shadow map draws those bones. Character lamp shadows refresh every
     frame on High and above (src/world/charShadowSet.ts:125-131). The moon CSM and partner torch maps also draw
     guards (src/world/world.ts:550, src/world/torchShadows.ts:1-12).
   - The body root is placed every frame (src/ai/enemy.ts:3755-3756), and the figure root is a child of the rig root
     (src/operators/runtime/guardFigure.ts:301, :342-343). So on each skipped frame the stale limbs travel with the
     body: a planted foot slides by v x (period-1)/fps before the next solve puts it back.
     - Patrol walk, 0.9 m/s (src/config/enemies.json:7): up to 10.5 cm at 60 fps, 21 cm at 30 fps (was 4.5 / 9 cm).
     - Run, 3.2 m/s (:8): up to 37 cm / 75 cm (was 16 / 32 cm).
   - At 30 fps a run's solved pose is also no longer a coherent gait. The scratch rig run below gives these numbers.
     - With period 8, its contact state disagrees with a full-rate rig on 80% of solves at 3.2 m/s (period 4: 40%).
     - Mean ankle/wrist error at the solve frames is 64 cm with period 8 (period 4: 12 cm).
     - Cause: a solve dt of 0.267 s is longer than a swing, so the swing ends inside one solve
       (src/anim/footPlanner.ts:1094, :1102).
   - Sector Ops makes it worse. The render freeze disables every guard who is outside the frustum and whose shadow
     cannot reach the screen (src/game/sectorGuardFreeze.ts:9-17, wired at src/game/modes/sectorMode.ts:338); those
     go to the FROZEN tier, not this one. So in Sector Ops the guards T1 slows down are mostly the ones whose lamp or
     moon shadow may land in view. The project wants that shadow to look right: a look shot of "an off-screen guard's
     lamp shadow sliding into view" is on the guard-render list (docs/guard-render/PLAN2.md:53, STATE.md:16, :23).
   - The brief's "Look: none (off-screen only)" (guard-cap PLAN T1 brief) misses this case.
   - Fix options (lead's call; each touches `animTierView.ts`, which gm-perf owns, or reverts the constant):
     - (a) Count a guard as seen while a shadowing light can land his shadow in the frustum. The freeze's
       `guardFrustum` / `lampProbe` verdict already exists in Sector. Elsewhere, an equivalent check against the
       char-shadow lamp slots and the moon.
     - (b) Use 8 only when no character-shadow lamp slot or moon caster list holds him, else 4.
     - (c) Keep 4 and take the anim saving elsewhere.
   - Why it blocks: the brief's rule counts "a visible pop worse than with 4" as blocking. Under CLAUDE.md's stricter
     "broken or unplayable" rule this is cosmetic. Nothing breaks, nothing is unplayable, and gameplay is untouched.
     So if the lead goes by CLAUDE.md, this becomes polish item 0 and the verdict is PASS.
   - If Michael looks at it and accepts the shadow cadence, this drops to polish. A look shot at 30 and 60 fps would
     settle it: a guard behind the camera under a lamp, his shadow forward into view, period 4 vs 8.

## Evidence (what is not broken)

- **Callers.** `animTierStep` / `animTierPeriod` / `animTierThaw` are called only from src/ai/animTierView.ts:110, :139.
  `GuardAnimTier` is used only by `Enemy`: `frame` at src/ai/enemy.ts:3825-3828, `die` at :2091, `thawPose` at :3840.
  The dog is not on the tier (:3817). Co-op puppets are not on it yet: the C1 brief is future work, and
  tests/puppetAnimTier.test.ts does not exist.
- **Large-dt stability.** Frame dt is capped at 0.1 s (src/core/loop.ts:179), so the worst solve dt is now 0.8 s on
  hitches (was 0.4 s) and 0.133 s at 60 fps.
  - The rig springs are closed-form and stable for any dt: `Spring` / `springStep` (src/anim/rigMath.ts:158-195), the
    weight layers' `springStep` (src/anim/weight.ts:171-), and `approach` / `approachTo` (rigMath.ts:169,
    src/player/characterRig.ts:280).
  - Every other dt term in the solve path is a rate cap, a clamp or `1-exp`: characterRig.ts:2046, :2430, :2467,
    :2484, :2507, :2868, :2891, :2899; animGraph.ts:1191, :1198, :1318, :1378, :1747-1749, :1764, :2484;
    strikeBody.ts:247.
  - The one explicit Euler integrator is the run-arm follower (characterRig.ts:3297-3298, w = 1/0.08). In
    semi-implicit form it is unstable above w*dt ~0.83 (dt > 66 ms). Its output is only applied when the run share
    is above 0 (:3299-3300). That needs `keyMocap`, which needs `carrier` (characterRig.ts:1821; animGraph.ts:1966).
    Only the player and remote avatars set `carrier` (src/player/player.ts:195, src/net/remoteAvatar.ts:220), so on a
    guard the state can diverge but is never read. Latent only: see polish 3.
  - The scratch rig run below showed no NaN, and the hip-to-ankle distance never went past the full-rate value
    (92-93 cm) at any speed, frame rate or period.
- **Motion driver.** Guards drive the gait clock, motion state, acceleration and goal yaw from the sim's
  `MotionDriver` in the fixed step (enemy.ts:3792-3797). The rig only reads them, so the doubled interval adds no
  drift on the driver side.
- **IK** is geometric (no dt). Joint rate limits scale with dt (`limitJoint`, characterRig.ts:2620-2621, :2944-2947).
- **One-shot events.** The rig fires none for guards.
  - Footstep sounds are the local player's only (src/audio/gameAudio.ts:152-161 from src/player/player.ts:584).
  - Muzzle, tracer and flash come from the sim (enemy.ts:3394-3437). The head hit volume is the sim's
    (src/ai/guardHead.ts:4). No gameplay code reads a guard rig bone (grep of `.rig.<bone>` outside the anim, ragdoll
    and carry code).
  - Emotes, takedowns, holds and climbs are pinned, so they solve every frame (enemy.ts:3826). A takedown happens
    inside the 4 m near-player rule anyway (animTier.ts:64).
- **Thaw / re-plant** is untouched: FROZEN carry cap, `thaw`, `replantIfMoved` (animTier.ts:92-98,
  animTierView.ts:124-142).
- **Weapon glide** runs every frame before the skip (characterRig.ts:1775-1777).
- **LOD half rate.** The figure's LOD2 half rate takes every out-of-phase call (src/operators/runtime/guardLod.ts:47-49:
  `frame - posedAt >= 2`), so period 8 is never halved again.
- **Scratch rig run** (NullEngine, `CharacterRig` with `guardRows`, a synthetic gait clock of 0.5 + 0.3v cycles/s; not
  in the repo, at C:/Users/Micha/AppData/Local/Temp/claude/C--NightShift/957a46dc-6e1b-4e37-82ae-c73a5c1c8b63/scratchpad/t1check/tierDt.test.ts).
  It runs a tiered rig in lockstep with a full-rate rig over the same root path, off-screen for 6 s and then on screen.

  | case | solve-frame err mean, P4 -> P8 | contact mismatch, P4 -> P8 | ankle jump on return, P4 -> P8 (full-rate max per frame) |
  | --- | --- | --- | --- |
  | 60 fps, 0.9 m/s | 6.9 -> 8.4 cm | 3 -> 13% | 4.7 -> 4.4 cm (25.8) |
  | 60 fps, 3.2 m/s | 10.4 -> 15.8 cm | 11 -> 34% | 13.8 -> 34.0 cm (26.5) |
  | 60 fps, 4.2 m/s | 13.1 -> 22.9 cm | 16 -> 55% | 22.0 -> 13.6 cm (28.1) |
  | 30 fps, 0.9 m/s | 8.4 -> 14.6 cm | 17 -> 40% | 8.7 -> 27.2 cm (29.7) |
  | 30 fps, 3.2 m/s | 12.0 -> 63.6 cm | 40 -> 80% | 48.2 -> 74.0 cm (38.6) |
  | 30 fps, 4.2 m/s | 21.6 -> 98.1 cm | 63 -> 33% | 16.9 -> 24.5 cm (45.6) |

  After the return the tiered rig's per-frame ankle travel stays inside the full-rate range (max 10-35 cm), and it
  reconverges within 20-60 frames (error 0-14 cm, the same with P4 and P8). The return jump is one sample per case, so
  it depends on the slot timing.
- **Tests:** `npx vitest run --maxWorkers=1 tests/animTier.test.ts tests/guardBody.test.ts
  tests/sectorGuardFreezeView.test.ts tests/guardLod.test.ts`: 4 files, 55/55 pass.

## Polish

1. **The frame a guard comes back on screen.** The seen test reads the previous render (animTierView.ts:86-89). So
   the first frame drawn shows a pose up to 7 frames old (was 3); the root is current. One frame only.
   - Planted-foot offset at that frame: walk up to 10.5 cm at 60 fps (was 4.5); run 3.2 m/s up to 37 cm (was 16).
   - Scratch: the return jump is 34 cm at 60 fps / 3.2 m/s, against a full-rate per-frame maximum of 26.5 cm.
   - Possible fix (gm-perf's file): a catch-up solve when a guard is first marked seen, like `thawPose` does for the
     freeze (enemy.ts:3833-3844).
2. **Off-screen gait at 30 fps runs is incoherent** (see the table). Only visible through blocking item 1.
3. **Latent:** the run-arm follower (characterRig.ts:3288-3300) is explicit Euler, stable only up to dt ~66 ms.
   - Period 4 at 60 fps was right at the edge (|lambda| ~1.017); period 8 is well past it.
   - If a guard rig ever becomes a `carrier` or gets `keyMocap`, an off-screen guard grows a NaN arm.
   - Worth an exact (closed-form) follower or a dt sub-step when that path is touched.
4. **The 2 m "jump" rule** (characterRig.ts:1902-1912) now trips at a solve dt of 0.48 s or more: 8 frames at 16.8 fps
   or less (was 8.4 fps). It re-plants the feet off-screen, which is harmless.
5. **The `phRate` gate** (animGraph.ts:1067, `d < 0.25`) stops measuring at 30 fps runs (about 0.4 cycle per solve).
   It is only a floor under the clip rate (:2647). Stale, harmless.
6. **Emote onset while off-screen.** The first pinned solve takes the carried time, so `emoteTime` starts up to
   0.133 s / 0.267 s in and `emoteW` jumps by up to 0.67 / 1.0 (characterRig.ts:2074, :2078). It happens off-screen,
   and no event is lost.
7. **Ragdoll start pose.** An off-screen-tier kill seeds the ragdoll from limbs up to 7 frames stale (ragdoll.ts:57-62).
   C9's catch-up solve covers frozen guards only (enemy.ts:2091). The lie is sim (enemyManager.ts:676-680), so this is
   cosmetic and off-screen.
8. **Stale "every 4th" text:**
   - src/core/flags.ts:60 ("off-screen every 4th frame");
   - tests/guardLod.test.ts:51 ("every 4th frame (the off-screen tier)");
   - the guard-cap PLAN C1 brief ("tests/puppetAnimTier.test.ts ... off-screen solves every 4th") should read
     `ANIM_TIER_OFFSCREEN`.
