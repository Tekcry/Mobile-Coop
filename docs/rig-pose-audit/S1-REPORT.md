# rig-pose-fix S1 (+ S4): the player body model from sim

Slice S1 of `PLAN.md` (REPORT items G1-G5, G11, G12, G14, P12; ranked fixes 1 and 4, A1 folds S4 in). Branch
`feature/rpf-s1` off `feature/rig-pose-fix` 63f22ad2 (master 4.88.1). Opus builder, 2026-10-24.

## What

- New Babylon-free `src/player/playerVolumes.ts`: `playerBody(in, out)` gives the pelvis, chest (the rig's torso joint),
  neck and head centres from sim state only: feet, capsule yaw, crouch blend, kneel, speed and its sideways share, the
  weapon (drawn, raise, camera pitch), the wall stance (side, the peek's share) and the traversal family (kind, phase,
  tumble) with the attach root lift. No allocation (out-param; only the doubles V8 boxes across calls, ~52 B a call).
  - `localBodyIn` (the owner, from `Player`), `wireBodyIn` + `bodyFromMoveState` + `attachLiftOf` (the host, from the
    accepted `PlayerState` / `MoveState`), `crouchStep` / `crouchBlendOf` (the controller's crouch ease for a receiver),
    `peekShare`.
- New `src/game/playerHitVolumes.ts`: `PlayerHitVolumes`, the split kinematic volumes (legs, torso, head;
  `G.PLAYER_HITBOX`) placed from `playerBody`, and `playerPartMult` (head x1.3, legs x0.75).
- Wired:
  - G1 / G2 / G14: `PlayerTarget` (local) builds the body each fixed step (`sync(drawn)`, `GameState` passes the draw phase)
    and its volumes, `center`, `aimPoint`, `headPoint` read it. The suppression near-miss reads `headPoint`.
  - G3: `RemotePlayer` (host's view of a client) now has the same split volumes on `playerBody(wireBodyIn(accepted
    state))` at the host's sim time; `followPose` / the rig-follow capsule are gone. Its `center` / `aimPoint` /
    `headPoint` come from the model; damage takes the same part multipliers as the local player.
  - G4 / G5 / P12 (S4): the wall head / chest sample is the model's on both machines: the local light meter
    (`GameState.updateLight`), the HUD exposure (`updateExposure`), the host's light sample for a client (`r.head` =
    `RemotePlayer.ref.head`, set in `accept`), perception's head point. `setPosedHead` is gone. `posedHeadSample`
    (wallController) is unchanged, now fed the model head.
  - G11 / G12: client `PartnerTarget` and host `partnerBoxes` (course friendly fire) sit on `playerBody` of the drawn copy's
    state (`RemoteAvatar.bodyIn`: interpolated position, capsule yaw, eased crouch / peek, kneel, pace, MoveState, grips
    lift), no rig reads.
- Fit: `tests/helpers/playerBodyHarness.ts` drives Wren's rig (NullEngine, `operatorRig`, carrier) the way
  `Player.frameUpdate` does (MotionDriver on the player's tuning, the controller's crouch ease, the wall root push, the
  peek step, the side-on visual yaw, `tuneBegin` / `tuneEnd`); `tests/playerVolumesSweep.test.ts` writes the knot means,
  `scripts/player-body-fit.mjs` writes the tables into `playerVolumes.ts` (`--write`, between the markers). Same pattern
  as `guardHead` / `scripts/guard-head-fit.mjs`.

## Files

- New: `src/player/playerVolumes.ts`, `src/game/playerHitVolumes.ts`, `scripts/player-body-fit.mjs`,
  `tests/helpers/playerBodyHarness.ts`, `tests/playerVolumes.test.ts`, `tests/playerVolumesParity.test.ts`,
  `tests/playerVolumesSweep.test.ts`.
- Changed: `src/game/playerTarget.ts`, `src/game/gameState.ts` (target sync, light sample, HUD exposure),
  `src/net/remotePlayer.ts`, `src/net/coopHost.ts` (frameUpdate: the remote volume / wall head and `partnerBoxes` parts
  only; `recordHistory` / `judge` untouched), `src/net/partnerTarget.ts`, `src/net/remoteAvatar.ts` (`bodyIn`, two
  fields), `src/player/wallController.ts` (doc only), `tests/net.test.ts` (one case), `scripts/e2e-netmove.mjs` (the peek
  head check compares the host's head to the client's sim head; the client's rig head is logged beside it).
- Docs: `docs/systems/combat.md`, `coop.md`, `movement.md`; `docs/locomotion/DECISIONS.md` (A51 marked superseded).
- Not touched: S2 / S5 / S6 files, `src/net/coopClient.ts`, `src/ai/enemy.ts` (its `PlayerRef.head` doc comment still
  says "posed copy": stale, cosmetic, for whoever next owns enemy.ts).

## Fit numbers and tolerances (mocap ON, the game's set; 3D distance per joint, every sampled frame, two yaws)

| Tier (bound) | Cases | Worst measured | Where |
| --- | --- | --- | --- |
| T1 free still (0.04 m) | crouch knots and between, kneel, raise 0 / 0.5 / 1, pitch -0.5..0.5 | 0.027 m | half raise (r 0.5) |
| T1 free moving (0.08 m) | holstered / low ready walk-run, crouched sneak, aimed walk four directions and between | 0.075 m | the mocap jog at 3 m/s (gait bob on the mean) |
| T2 wall (0.08 m) | flat, side-on crouch, peek standing / crouched / drawn, both sides, slide, off-knot crouch / peek | 0.063 m (peeks 0.025-0.05) | standing slide, left side |
| T2 traversal (0.08 m) | 20 families, phased at 9 knots and between | 0.074 m | drainpipe climb (cycle mean) |
| exception: ledge hang (0.15 m) | the pendulum swing about the cycle mean (cadence not on the wire) | 0.140 m | head |
| T3 transitions (0.16 m) | crouch, walk / run start, peek in | 0.152 m | the run's CT start from rest |

- Mocap OFF (the developer rollback `?mocap=0`; AF5 made mocap the player's only path): free still, wall and traversal
  are unchanged (those clips are hand-keyed in both sets). Holstered movement differs: the hand-keyed run at 4 m/s
  0.294 m (it leans far forward), the run start 0.306 m, the crouched sneak at 0.85 m/s 0.13 m, the jog 0.075 m. Not
  held by the test (`PLAYER_BODY_MOCAP=0 PLAYER_BODY_PRINT=1` prints it).
- The sweep is not bit-reproducible: the rig's idle variation moves a rerun's knot means by up to ~6 mm (the tables in
  the commit are one run; the parity test passes on reruns).
- The local and the host body for the same state agree within 2 mm (`tests/net.test.ts`, free / kneel / wall peek both
  edges / ladder / vault, through the real `pstate` parse). In motion the host eases the crouch and the peek from the bits
  as the owner does; its peek stays out up to `WALL.peekBlend` longer on the way back (the bit stays set while the owner
  eases out: the existing conservative rule).

## Decisions assumed (undo: revert the slice commit)

- D-S1a: fitted to the mocap ON set (the game's only path since AF5); the OFF residual is documented, not bounded.
- D-S1b: the client on the host gets the local player's split volumes and part multipliers (head x1.3, legs x0.75); the
  old single capsule took every hit at x1. Gameplay change: a client can now be headshot (and takes less on the legs).
- D-S1c: the host's view of a client is the latest accepted state (host sim time), no longer the 0.1 s interpolated drawn
  copy. Friendly-fire boxes stay on the drawn copy's state (the shooter aims at what it sees), now through the model.
- D-S1d: left out of the model (residual): the gait bob, the aim twist, the head glance, start / stop / turn moments, the
  hold / carry bend (takedown, grab, strike use the free stance), a pipe change's tumble blend, the boost hang-down
  tumble. The low-wall head cap (`RigPose.headCap`) is never set in game (no setter in src), so there is no low-wall sink
  to model; a low wall is the crouched wall stance.
- D-S1e: `PlayerHitVolumes` sizes the volumes from `proportions('average', 1.68)` (what Wren's rig is built from), not
  from a rig instance.
- A2 (BRIEF) applied: A51's posed-rig wall sample is superseded by the model.

## Wire

No wire change. Everything the host uses was already on the wire (`PlayerState` x / y / z / yaw / pitch / speed / f,
`MoveState` m / a / s / sub / ph / r / dw / u). `PROTOCOL_VERSION` untouched.

## Tests (desktop, one file at a time)

- New: `tests/playerVolumes.test.ts` 10/10; `tests/playerVolumesParity.test.ts` 262/262; `tests/net.test.ts` 76/76
  (new case "same MoveState, same volumes local and on the host").
- Existing: `tests/guardHeadParity.test.ts` 165/165, `wallController` 36, `wallStance` 5, `coopPerception` 8, `tactics` 6,
  `bodyHeight` 4, `coopFix` 13, `coopGuardAi` 15, `poseParity` 12, `holdToggle` 4, `teamClimb` 6, `animN4dKill` 11: all pass.
- `npx tsc --noEmit -p .` clean; eslint on the changed files clean. No e2e, no full vitest, no `npm run check` (desktop rules).

## e2e to run (laptop)

- Must: `e2e-combat`, `e2e-wall`, `e2e-netmove` (its peek head check changed), `e2e-coop`.
- Also touched by the moved perception points / friendly-fire boxes: `e2e-course` (friendly fire aims at
  `partnerBoxes`), `e2e-stealth-ai` and `e2e-tactics` (read `target.headPoint` / `aimPoint`), `e2e-ctcourse`.

## Open items

- The ledge hang's pendulum (0.14 m) and the drainpipe climb (0.074 m) are cycle means: a phase input would need the grips'
  cadence on the wire (not sent; no wire change made).
- The host's peek ease-out lag (above) and the kneel timer from the measured speed are inherited approximations.
- S3 (wave 2) still owns the guard-head judge; S2 the shot origin (its wall-poke test can read `PlayerTarget.body.head`).
- `src/ai/enemy.ts` `PlayerRef.head` comment is stale (S6's file).
- Changelog fragment: the lead's (not written here).
