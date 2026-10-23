# Rig pose audit - where gameplay reads the animated / rendered pose

Player Build spare job 12 (backlog 28). Read-only audit of `src/` (excluding `src/anim`, `src/vfx`, `src/ui`, `src/editor`, `src/dev`), 2026-10-23. No code changed.

- Base: `origin/master` 41204e30 = **4.80.0** (the brief asked for at least 4.81.0; master was still 4.80.0 when this ran).
- Branch: `feature/rig-pose-audit`.
- Rules checked:
  - CLAUDE.md "Gameplay never reads graphics state ... It reads collision, occupancy, anchors, the light bake and the noise model only".
  - "Light parity: what the player sees, the light meter and guard perception must agree".
- Method: grep for `headNode`, `hips`, `spine`, `torso`, `neck`, `wristL|R`, `ankleL|R`, `weaponPivot`, `muzzle`, `getAbsolutePosition`, `computeWorldMatrix`, `absolutePosition`, `getWorldMatrix`, `absoluteRotationQuaternion`, and every `rig.` / `vr.` / `bodyRig` read in `src/ai`, `src/game`, `src/weapons`, `src/player` and `src/net`. Each hit was followed to its consumer.

## What makes a rig read differ (between frames, machines, host and client)

| Key | Source | Where |
| --- | --- | --- |
| **mocap** | `LOCO.mocap` is a per-machine setting (`settings.gameplay.mocapLoco`, `?mocap=`). It applies to "carrier" rigs only: the local player and every remote avatar, never guards or puppets. Host and client can run different sets for the same player. | `src/core/app.ts:137-141`, `src/player/characterRig.ts:1802` |
| **LOD** | Rigs animated without `solveDt` (player, remote avatars, client puppets, dummies) skip every other solve beyond `ANIM_LOD_DISTANCE` (22 m) x the Detail scale x the governor's `partLod`, measured from the local camera. | `src/player/characterRig.ts:453-458, 1761-1772`, `src/world/world.ts:394-396, 435-437` |
| **tier** | Host guard rigs skip solves when off-screen (every 4th frame) or far (every 2nd), staggered by guard number: the guards' "render freeze". | `src/ai/animTier.ts:1-80`, `src/ai/enemy.ts:3236` |
| **fps** | Rigs pose once per render frame. A read in a fixed step (60 Hz) sees the last rendered pose, built on the render-interpolated root, not the sim. At 30 fps two steps read one pose. | `src/player/player.ts:364-371`, `src/ai/enemy.ts:3176-3178` |
| **interp** | A remote avatar on the host is drawn `INTERP_DELAY` 0.1 s behind (0.12 s on the client). | `src/net/coopHost.ts:60, 1440-1443`, `src/net/coopClient.ts:48` |
| **tuner** | Tuner sliders and the baked base table move the visual root (`tuneRoot`, `moveTuneRoot`, the wall root push, the rate-limited visual yaw). They also move the weapon pivot (`gunFwd`, `gunUp`, `gunPitch` ...). | `src/player/player.ts:370-404`, `src/anim/tune.ts:172-179, 844-856` |
| **ragdoll** | Havok ragdoll from the death pose, capped by `BUDGET.maxRagdolls` (otherwise the body is laid flat). Host and client simulate their own. | `src/ai/ragdoll.ts`, `src/ai/body.ts:65, 183`, `src/net/coopClient.ts:612-620` |

## Table

Classes:
- **GAMEPLAY:** perception, hit tests, damage, takedown / carry validity, noise, AI, host validation, light meter.
- **PRESENTATION:** drawing, VFX, sound placement, haptics, camera feel, HUD indicators.
- **CLEAN:** reads verified to use sim state only.

Risk: H = wrong outcomes are likely in normal co-op play; M = visible in some situations; L = edge cases or latent.

### GAMEPLAY

| # | file:line | What is read | Used for | Varies with | Risk | Proposed fix (one line) |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | `src/game/playerTarget.ts:101-120` (called in the fixed step, `src/game/gameState.ts:1883`) | Local player rig `hips`, `neck`, `headNode` world positions (cached, no refresh) | The local player's split hit volumes (legs / torso / head, `PLAYER_HITBOX`): every guard round, grenade, the head x1.3 | mocap, fps, tuner (visual root push, visual yaw, `bodyUpAdd`), every pose change | **H** | Volumes from a sim model of the player (feet, yaw, crouch, lean, wall / peek offsets, attach mode) fitted to the rig, as `guardHead` did for guards |
| G2 | `src/game/playerTarget.ts:80-93` (read by `src/ai/enemy.ts:1892-1920`) | `center` / `aimPoint` / `headPoint` = the G1 volumes | Guard perception: LOS to chest / head / hips, exposure, vertical view limit, `lastKnown`, the guards' aim point | as G1 | **H** | Same sim model as G1, one model for local and remote targets |
| G3 | `src/net/coopHost.ts:1443-1448` -> `src/net/remotePlayer.ts:219-230` | The host's drawn copy of the client: rig `hips` -> `headNode` | The client's only hit capsule on the host: every guard round at the client | **interp** (0.1 s), host **mocap**, host **LOD**, host **fps** | **H** | Pose the capsule from the client's wire `MoveState` through the G1 model at the rewound sim time |
| G4 | `src/net/coopHost.ts:1449` -> `src/net/remotePlayer.ts:97-102, 214-216`, `src/game/gameState.ts:1564-1569` | `rig.posedHead` of the host's drawn copy while the client is on a wall | Guard perception head sample and the host's light level for the client (guards read `ref.light`) | interp, host mocap / LOD / fps. The client's own meter reads its own rig (G5), so the two can disagree (light parity) | **H** | Wall head from a sim function of the wall state (peek / lean kind / low-wall sink), fitted to the rig, the same on both machines |
| G5 | `src/game/gameState.ts:1552-1557` | Local `rig.posedHead` on a wall | The light meter (`lightLevel`, `localRef.light` read by guards) | mocap, tuner, fps | M | As G4. Assumed decision A51 / A51 update (`docs/locomotion/DECISIONS.md:173-175`) chose the posed rig: needs review |
| G6 | `src/weapons/playerWeapons.ts:994-997`; also feeds `onRay` -> lamp shots (`src/net/coopClient.ts:535-545`) and impact noise (`src/game/gameState.ts:707-711`) | `WeaponModel.muzzleWorld` (gun on `rig.weaponPivot`) and `rig.headNode` (cached) | Where every player round starts (ray and projectile), the wall-poke fallback, the client's claimed `ox/oy/oz` | mocap, tuner gun sliders, draw / glide pose, fps | **H** | Origin from a sim shoulder / eye point (feet, crouch, lean, camera shoulder side) plus barrel length along the aim. Muzzle for tracer / flash only |
| G7 | `src/net/enemyPuppet.ts:436-439`, judged at `src/net/coopHost.ts:1050-1067` | Client puppet rig `headNode` | The client's guard head volume decides head vs body. The host accepts a claim within 0.77 m of a stance constant (`feet + 1.62 / 1.15`), not `guardHead` | client **LOD** (Detail, governor), client fps. Three head models for one guard | **H** | Puppet head from `guardHead` (the inputs it already gives its rig). The host records `Enemy.head` in its history and judges against the rewound head |
| G8 | `src/ai/body.ts:99-104` (`sync`); start pose `src/ai/ragdoll.ts:40-60` | A body's rig `hips` (ragdoll-driven or laid flat) | `Body.pos`: guards noticing a body (`src/ai/enemy.ts:1960-1977`), its light (`src/ai/enemyManager.ts:2801`), searches and calls (`enemyManager.ts:622-643, 800`), the pick-up prompt (`src/game/stealthSystems.ts:204, 789`), a revived guard's spawn (`enemyManager.ts:1352`) | ragdoll budget, death pose (**tier**: up to 3 frames stale off-screen), physics. The client's ragdoll (`coopClient.ts:617`) lies elsewhere | M | `Body.pos` from sim: the guard's sim pos at death plus a pure settle offset (`at` on a drop). The ragdoll stays visual and is snapped to it |
| G9 | `src/ai/body.ts:119-131` -> `src/game/stealthSystems.ts:310-331` | Lying body `torso`, `shoulderL/R`, `hips -> headNode` direction | The pick-up step-in target (moves the player's sim position via `holdStill`) and the carry shoulder side | ragdoll pose | M | Store the body's lie (chest point, head yaw) in sim at death / drop. The hands keep reading the rig (P8) |
| G10 | `src/ai/dogModel.ts:114-116` -> `src/ai/enemy.ts:3233` (host), `src/net/enemyPuppet.ts:402` (client) | Dog model's animated `headPivot` | Dog head hit volume on both machines | fps (copied in `frame`, used in the next fixed step), render-interpolated root | M | Pure `dogHead(pos, yaw, speed, phase, alert, bite)` in the fixed step. The model draws from it |
| G11 | `src/net/partnerTarget.ts:50-60` | Client's drawn partner: `headNode`, `hips` | Course friendly fire on the client: the head vs body claim | interp, client mocap, LOD | M | G1 model from the partner's `MoveState` |
| G12 | `src/net/coopHost.ts:1451-1463` | Host's drawn partner: `headNode`, `hips` | Course friendly fire on the host (`partnerBoxes`) | interp, host mocap, LOD | M | As G11 |
| G13 | `src/net/coopHost.ts:1340-1356` | `by.avatar.pos` / `yaw` (drawn, interpolated; not a rig node) | Where the host holds a client's hostage (a human shield) | interp, host fps (deliberate: marlow-bays item 1, hostage-gait) | M | Review only: hold from the rewound wire state at the fixed rate |
| G14 | `src/game/gameState.ts:543-550` | `PlayerTarget.headPoint` (G1) | Suppression near-miss -> `spreadMul` (weapon spread) | as G1 | L | Fixed by G1 |
| G15 | `src/weapons/playerWeapons.ts:742-746` | `rig.weaponHand` (`handBlend`), `rig.handSwitching` | Holds the weapon swap timer while the gun changes hands | fps (eased in `animate`) | L | A sim hand-switch timer (wall edge / shoulder state + `EDGE_HAND_TIME`) that the rig follows |
| G16 | `src/game/trainingDummy.ts:90-95` | Dummy rig `headNode` after `animate` (no `solveDt`) | Course dummy head volume | LOD (Detail, governor) | L | `hitVolumes(p).headY` over the dummy's sim position |
| G17 | `src/player/playerController.ts:523` -> `src/anim/motion.ts:527-531` | `LOCO.mocap` (an anim setting, not a pose) | Gait clock rate while strafing, which drives `rootModulation` of the sim velocity | **mocap** per machine (owner-authoritative, so no host / client split) | L | Keep the mocap side-step out of the sim clock, or make mocap a session setting |
| G18 | `src/physics/groups.ts:39` with `src/ai/ragdoll.ts` | Ragdoll physics bodies (`G.RAGDOLL`) built from the render rig | `PLAYER_SHOT` stops rounds on a ragdoll. Host `HOST_LOS` ignores them, and each machine has its own ragdoll | ragdoll budget, physics | L | Drop `G.RAGDOLL` from `PLAYER_SHOT`, or accept and note it |
| G19 | `src/net/coopHost.ts:1451` | `r.avatar.pos` (drawn, 0.1 s old) | Partner blocker collision against the host's player | interp | L | Accept (feel); note only |
| G20 | `src/net/coopHost.ts:1262-1275` (`recordHistory`), `1020-1053` (`rewindHist`, `judge`) | A `rig` branch that would record `headNode` / `hips` into the shot history | Never taken: no caller passes a rig, so `posed` is always false | latent | L | Delete it, or replace with G7's sim head |

### PRESENTATION

| # | file:line | What is read | Used for | Risk | Note |
| --- | --- | --- | --- | --- | --- |
| P1 | `src/player/shoulderCamera.ts:488-489` | Local `headNode` | Head / body fade | L | Camera feel |
| P2 | `src/game/gameState.ts:846-851` | Local `headNode.y` | Character capsules for the baked lamps' soft shadows (a shader texture) | L | The light meter's occluder (`gameState.ts:1646-1655`) rays `G.STATIC` only |
| P3 | `src/game/gameState.ts:3366-3371` | Local `hips` | Rappel rope | L | |
| P4 | `src/net/remoteAvatar.ts:659-665` | Remote `hips` | Remote rappel rope | L | |
| P5 | `src/net/remoteAvatar.ts:686-697` | Remote `muzzleWorld` | Partner tracer, flash, `remoteShot` sound position (`src/audio/gameAudio.ts:118`) | L | Guards hear remote shots at `r.feet` (`coopHost.ts:1293-1309`) |
| P6 | `src/weapons/playerWeapons.ts:1018-1027` | Local muzzle | Tracer, casing, flash | L | Keep when G6 moves the origin |
| P7 | `src/game/takedownController.ts:676-735` | Victim `neck`, `shoulderL/R`, `headNode` | Attacker hand IK | L | Plan and timing are sim |
| P8 | `src/game/stealthSystems.ts:836-865, 876-893`, `src/ai/body.ts:167-174` | Body shoulders and knees; player `torso` | Carry hand IK, carry socket | L | |
| P9 | `src/ai/carryPose.ts:114-152, 220-226`, `src/ai/body.ts:139-165` | Corpse / carried rig joints | Hoist, carry, slide poses | L | Feeds G8 only through `drop` -> `sync` |
| P10 | `src/ai/gearParts.ts:28-52`, `src/ai/enemyRig.ts:25`, `src/weapons/knifeModel.ts:22`, `src/weapons/grenadePouches.ts:27-31`, `src/weapons/weaponModel.ts:218-672`, `src/world/menuScene.ts:453-457`, `src/operators/lab/lab.ts:208-222` | Rig nodes as parents; `torso` / `hips` matrices | Gear, gun, helmet, armour attachment and glide | L | Parenting only |
| P11 | `src/player/player.ts:577-584` | Foot planner `landed` | Haptics (`gameState.ts:640-642`), foley (`src/audio/gameAudio.ts:153`) | L | Footstep noise is sim (C4) |
| P12 | `src/game/gameState.ts:3006` | Local `posedHead` / `posedChest` on a wall | HUD exposure indicator (`gameState.ts:3253`) | L | Should follow G2 / G4 so the HUD matches the guards |
| P13 | `src/net/coopClient.ts:612-620` | Puppet rig handed to a client ragdoll | The client's body on the floor | L | Lies elsewhere than the host's `Body.pos` (G8) |
| P14 | `src/player/smoothBody.ts:130-186, 327-328`, `src/operators/runtime/figure.ts`, `src/world/menuPoses.ts`, `src/world/menuSets.ts` | Rig matrices | Skinning, Wren's figure, menu poses | L | |

### CLEAN (verified sim-only)

| # | file:line | Looks like | Actually reads |
| --- | --- | --- | --- |
| C1 | `src/ai/enemy.ts:686-688` | Guard eye (backlog 28 cited `enemy.ts:1779-1781` `rig.headNode`) | `pos + EYE_STAND x scale` (crouch 1.0). The old read is gone |
| C2 | `src/ai/enemy.ts:2873-2900` | Guard muzzle | From `eye()` |
| C3 | `src/ai/enemy.ts:3127-3161`, `src/ai/guardHead.ts` | Guard head volume | `guardHead` sim fit (`tests/guardHeadParity.test.ts`). Unaffected by the anim tier |
| C4 | `src/game/gameState.ts:1890-1905`, `src/net/coopHost.ts:1288-1300` | Footstep noise | Speed, stance, surface, suit |
| C5 | `src/game/gameState.ts:1543`, `src/net/remotePlayer.ts:74` | Light sample height | `rig.height` / `rig.p`: static proportions |
| C6 | `src/net/remotePlayer.ts:87-102` | Remote aim / head points off a wall | `feet` + stance constants + the wire peek offset |
| C7 | `src/game/takedown.ts:58-95`, `src/game/takedownController.ts:543`, `src/net/hangHold.ts:55` | Hang-down reach | `HANG_GRAB` / `HANG_HEAD` constants |
| C8 | `src/player/attachGrips.ts`, `src/player/attachController.ts:413-414`, `src/game/teamController.ts:384-473` | `rig.height`, `reachL/R`, `plantL/R` | Static height; IK targets are written, not read |

## Ranked fix list

1. **Player body model from sim (G1, G2, G3, G11, G12, G14).**
   - What: new Babylon-free `src/player/playerVolumes.ts` giving pelvis, neck and head centres. Inputs: feet, yaw, crouch blend, lean, the wall state (`wallPeekOffset`, side lean, low-wall sink) and the attach / hang mode. Fit it to Wren's rig like `guardHead` (sweep + fit script, tolerances).
   - Where it is used:
     - `src/game/playerTarget.ts` (local player).
     - `src/net/remotePlayer.ts` + `src/net/coopHost.ts` on the host, from the wire `MoveState` at the sim time, replacing `followPose`.
     - `src/net/partnerTarget.ts` and the host `partnerBoxes`.
   - The remote gets the same split volumes as the local player (headshots possible). Split 1a local / 1b remote if needed.
   - Tests:
     - New `tests/playerVolumes.test.ts`.
     - New `tests/playerVolumesParity.test.ts` (NullEngine rig vs model, as `guardHeadParity`).
     - `tests/net.test.ts` case "same MoveState, same volumes local and on the host".
     - e2e `e2e-combat`, `e2e-wall`, `e2e-netmove`, `e2e-coop`.
2. **Shot origin from sim (G6).**
   - What: new pure `src/weapons/shotOrigin.ts` taking feet, crouch, lean, camera shoulder side, aim direction and barrel length from `weapons.json`.
   - Where: `src/weapons/playerWeapons.ts:994-997` uses it, plus its sim head for the wall-poke test. The muzzle stays for P6.
   - Tests: new `tests/shotOrigin.test.ts`; e2e `e2e-combat`, `e2e-wall`, `e2e-weapons-carry`.
3. **One guard head for every judge (G7, G20).**
   - What:
     - `src/net/enemyPuppet.ts` takes its head from `guardHead`.
     - `src/net/coopHost.ts` `recordHistory` stores `Enemy.head`.
     - `judge` checks head claims against the rewound head instead of `feet + 1.62 / 1.15`.
     - Delete the dead rig branch.
   - Tests:
     - `tests/net.test.ts` cases "puppet head = host `guardHead` for the same inputs" and "judge uses the rewound head".
     - `guardHeadParity` unchanged.
     - e2e `e2e-coop`, `e2e-netmove`.
4. **Wall head sample from sim (G4, G5, P12).**
   - What: replace `rig.posedHead` / `posedChest` with a pure function of the wall state in `src/player/wallController.ts`, fitted to the rig.
   - Where: `src/game/gameState.ts:1552-1557, 3006` and `src/net/coopHost.ts:1449`.
   - Needs a review of A51 (`docs/locomotion/DECISIONS.md:173-175`). Can fold into slice 1.
   - Tests: `tests/wallStance.test.ts` parity, the `tests/net.test.ts:724` case; e2e `e2e-wall`, `e2e-netmove` (wall edge sections).
5. **Body position from sim (G8, G9).**
   - What:
     - `src/ai/body.ts`: `pos` and the lie (chest point, head yaw) are set at death from the guard's sim state plus a pure settle offset, and from `at` on a drop.
     - The ragdoll becomes visual and is snapped to that position.
     - `src/game/stealthSystems.ts:310-331` steps in from the stored lie.
     - The client ragdoll (P13) is placed at the host position.
   - Tests: `tests/bodySearch.test.ts`, new `tests/bodyPos.test.ts`; e2e `e2e-stealth-ai`, `e2e-guard-carry`, `e2e-stealth`.
6. **Dog head pure (G10).**
   - What: `dogHead()` in a Babylon-free module, stepped in the `Enemy` fixed step and on the puppet. `src/ai/dogModel.ts` draws from it.
   - Tests: new `tests/dogHead.test.ts`; e2e `e2e-enemies`.
7. **Small batch (G15, G16, G17, G18).**
   - What:
     - A sim hand-switch timer (`src/weapons/playerWeapons.ts`).
     - Dummy head from `hitVolumes` (`src/game/trainingDummy.ts`).
     - Mocap side-step out of the sim root modulation (`src/player/playerController.ts:523`, `src/anim/motion.ts:527-531`).
     - Decide `G.RAGDOLL` in `PLAYER_SHOT`.
   - Tests: `tests/animN4cHandSwap.test.ts`, `tests/motion.test.ts`, `tests/weapons.test.ts`; e2e `e2e-ctcourse`, `e2e-weapons-carry`.
8. **Review only (G13, G19).**
   - The hostage hold and the partner blocker read the drawn (interpolated) remote position on purpose (marlow-bays item 1, hostage-gait). They are not rig reads.
   - The orchestrator decides whether to keep them or move them to the rewound wire state.

## Summary

- **Counts:** GAMEPLAY 20 (H 6, M 7, L 7), PRESENTATION 14 (all L), CLEAN 8 (verified sim-only, including the guard eye and head named by backlog 28 and `guardHead.ts:4`).
  - G13 and G19 read the drawn position, not a rig node; they are counted as GAMEPLAY because they feed gameplay.
- **Top 3 risks:**
  1. **G1-G3, player hit volumes and guard perception points come from the rig pose.**
     - The host player is hit and seen through its rendered pose, as split volumes with a head.
     - The client is hit and seen through the host's 0.1 s old drawn copy (host mocap setting, anim LOD x governor, host frame rate), as one capsule with no head volume.
     - The two players are judged differently, and an animation change moves where a round lands.
  2. **G6, every player round starts at the animated muzzle or the rig head.** Mocap, tuner gun sliders, draw / glide poses and frame rate move the shot origin and the wall-poke test. The client sends that origin to the host as its claim.
  3. **G7, a client's guard headshot is decided on the puppet's rendered head.** The client's LOD and frame rate pick head vs body. The host accepts within 0.77 m of a stance-constant head while its own rounds use `guardHead`: three head models for one guard.
  - Next: G4 / G5, the wall head sample for the light meter and perception. The client's meter and the host's view of the client can disagree (light parity).
