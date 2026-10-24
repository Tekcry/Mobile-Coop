# rig-pose-fix S7: small batch (audit G15, G16, G17, G18; S2 host-check note)

Branch `feature/rpf-s7` off `feature/rig-pose-fix` b189ed6a (4.88.1 + S2, S5, S6). Ranked fix 7 of `REPORT.md`.
The report's file:line numbers were written on 4.80.0; re-found below on this base.

## What
- **G15, sim hand-switch timer.** The weapon swap held on the rig's eased blend (`rig.weaponHand` /
  `rig.handSwitching`, render rate; 4.88.1 `playerWeapons.ts:774, 778`). It now holds on a sim clock,
  `PlayerWeapons.hand` (`playerWeapons.ts:185`, stepped at `:638` in `fixedUpdate`, read at `:782, :786`).
  - The easing maths moved out of `CharacterRig.animate` (was `characterRig.ts:1938-1977`) into a pure class,
    `src/player/handSwitch.ts` `HandSwitch` (the reversal rewind and the Hermite tangent kept as they were;
    `EDGE_HAND_TIME` lives there and `characterRig.ts` re-exports it).
  - The rig steps its own `HandSwitch` (`characterRig.ts:1034, 1938`) toward the same target, so the drawn switch is
    unchanged. `rig.handSwap` is now a getter.
- **G16, dummy head from sim.** `trainingDummy.ts:109`: the head volume is the sim feet + `hitVolumes(rig.p).headY`
  + `DUMMY_HEAD` (`:16`, 7.5 cm forward along the yaw and 4 cm down). Before, it was the rig `headNode` after
  `animate` (no `solveDt`: LOD skipped). It does not use S1's `playerVolumes`.
- **G17, mocap out of the sim clock.** `MotionDriver.simPhase` (`motion.ts:238`) is a second gait clock. It never
  takes the mocap strafe's side-step, and the root modulation of the sim velocity runs on it (`:548-550`).
  - `phase`, the drawn clock, still takes it: the rig's feet and the wire's `gph` are unchanged.
  - `playerController.ts:378` resets both clocks on a teleport.
- **G18, ragdolls out of player rounds.** `groups.ts:41`: `MASK.PLAYER_SHOT` drops `G.RAGDOLL`.
- **S2 note, inverted lamp claim.** `lampSync.ts:112`: `LAMP_SHOT_ORIGIN` goes from 2 to 2.1 m, so the host's
  `lampShotOk` / `swayShotOk` accept an inverted-hang origin (up to 2.013 m from feet + 1.2). No wire change, host
  check only.

## Files
- New: `src/player/handSwitch.ts`, `tests/trainingDummyHead.test.ts`, `tests/mocapSimParity.test.ts`.
- Changed: `src/player/characterRig.ts`, `src/weapons/playerWeapons.ts`, `src/game/trainingDummy.ts`,
  `src/anim/motion.ts`, `src/player/playerController.ts`, `src/physics/groups.ts`, `src/net/lampSync.ts`.
- Tests changed: `tests/animN4cHandSwap.test.ts`, `tests/motion.test.ts`, `tests/weapons.test.ts`,
  `tests/sectorLampSync.test.ts`, `tests/shotOrigin.test.ts` (the inverted case now asserts `< LAMP_SHOT_ORIGIN`).
- Docs: one line each in `docs/systems/combat.md` (G15, G16, G18), `movement.md` (G17), `coop.md` (lamp origin).
- Not touched (S1 / S3 own them): `gameState.ts`, `playerTarget.ts`, `remotePlayer.ts`, `partnerTarget.ts`,
  `coopHost.ts`, `wallController.ts`, `enemyPuppet.ts`. `PROTOCOL_VERSION` is unchanged.

## Decisions (undo: revert the slice, or the line named)
- D1 (G15): the rig eases its own copy at the render rate. It does not sample the sim clock, because sampling would
  step at 60 Hz on a 144 Hz screen.
  - Same maths, same target: identical at 60 fps (tested frame by frame). At other rates both end within one render
    frame.
  - The sim clock's target is `rig.openLeft`. It is a plain flag that `gameState.ts` `wallStep` writes in the fixed
    step (`gameState.ts:2759`), not a pose. Moving it to a weapons field needs a `gameState.ts` edit, which S1 owns.
- D2 (G16): a fitted offset (`DUMMY_HEAD`) on top of the report's bare `hitVolumes(p).headY`.
  - Vs the posed head (standing, the 0.3 aim, still or strafing): 2.1 cm vertical and 1.1 cm horizontal, against
    6.1 / 7.8 cm without it. The head sphere radius is 11.5 cm.
  - Undo: `DUMMY_HEAD = { fwd: 0, drop: 0 }`.
- D3 (G17): a separate sim clock, not removing the mocap side-step from the gait clock. That keeps the mocap feet and
  the wire as they are.
  - Cost: with mocap on, in a standing aimed strafe, the root's heel-strike dip runs at the non-mocap cadence, a
    little off the drawn feet (about 2 mm of path).
  - Undo: run `rootModulation` on `phase` again.
- D4 (G18): drop `G.RAGDOLL`. Grep found nothing in gameplay that needs it: ragdoll bodies are not in the damage
  registry, and no other shot mask has the bit.
  - Effects: player rounds, the launcher projectile (`collideWith: PLAYER_SHOT`) and the camera aim rays
    (`gameState.ts:3244, 3470`) pass through bodies. No sparks or impact noise on a ragdoll. A body no longer shields
    a guard behind it on one machine only.
  - The host's `HOST_LOS` already ignored ragdolls.
  - Undo: add `G.RAGDOLL` back to `PLAYER_SHOT`.
- D5 (S2 note): raise the tolerance to 2.1 m, not measure from the feet when inverted. That needs no new input and no
  wire change; the margin is 8.7 cm over S2's worst point. Undo: `LAMP_SHOT_ORIGIN = 2`.

## Tests (desktop, one file at a time)
| File | Result | New cases |
| --- | --- | --- |
| `tests/animN4cHandSwap.test.ts` | 9 passed | +2: rig = sim clock every frame at 60 fps (switch, mid-switch reversal, back); the clock ends on time at 30 / 60 / 144 fps |
| `tests/motion.test.ts` | 31 passed | +1: `mocapSide` on vs off gives the same `outX/outZ` trace; drawn `phase` differs |
| `tests/mocapSimParity.test.ts` | 1 passed | Havok `PlayerController`, aimed strafe 280 steps, mocap on vs off: 0.000 mm (old code: 2.383 mm, fails) |
| `tests/trainingDummyHead.test.ts` | 1 passed | Parity: sim head vs posed head < 3 cm |
| `tests/weapons.test.ts` | 16 passed | +1: `PLAYER_SHOT` and `HOST_LOS` have no `G.RAGDOLL` |
| `tests/sectorLampSync.test.ts` | 13 passed | +1: a 2.05 m inverted claim is accepted, 2.15 m refused |
| `tests/shotOrigin.test.ts` | 7 passed | - |
| `tests/rig.test.ts` | 21 passed | - |
| `tests/strikePops.test.ts` | 7 passed | - |
| `tests/lampSway.test.ts` | 13 passed | - |

- The G17 tests were also run against the old `motion.ts`: both fail, so they catch the bug.
- `npx tsc --noEmit -p .`: clean. ESLint on the 8 changed source files and 7 test files: clean.
- Not run: e2e, the full vitest suite, `npm run check`.

## e2e to run (laptop queue)
`e2e-ctcourse`, `e2e-weapons-carry`.

## Open items
- G15: the sim clock reads `rig.openLeft`, the sim-written flag. Moving it to `PlayerWeapons` (for example
  `weapons.handLeft`, set in `wallStep`) needs a `gameState.ts` edit. Do it once S1 has merged.
- G17: a whole mocap session setting (the report's alternative) is not done. Only the sim clock is separated.
- G16: the dummy offset fits its one pose. A dummy that crouches or leans would need a stance input.
- No changelog fragment: the lead writes the batch's.
