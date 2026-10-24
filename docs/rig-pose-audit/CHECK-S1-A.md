# rig-pose-fix: check S1 (+ S4), checker A

Fresh Opus checker, 2026-10-24. Diff `6dcac873..bb750a5b -- src scripts tests` (S1's merge into `feature/rig-pose-fix`).
S3's areas (`coopHost.ts` `recordHistory` / `judge`, `enemyPuppet.ts`) not judged.

## Verdict: FAIL (1 blocker, small fix)

## Tests run (desktop, one at a time)

| File | Result |
| --- | --- |
| `tests/playerVolumes.test.ts` | 10 / 10 |
| `tests/playerVolumesParity.test.ts` | 262 / 262 |
| `tests/net.test.ts` | 76 / 76 |
| `tests/guardHeadParity.test.ts` | 165 / 165 |
| `tests/wallController.test.ts` | 36 / 36 |
| `tests/wallStance.test.ts` | 5 / 5 |
| `tests/coopPerception.test.ts` | 8 / 8 |
| `npx tsc --noEmit -p .` | clean |

No e2e, no full vitest, no `npm run check`.

## Blocker

**B1. The host kneels the client next to an unaware guard; the client does not (host / client mismatch, about 0.33 m on the head).**
- The owner: `src/player/playerController.ts:708` sets `kneeling` only when `!this.tense`. `tense` (line 575) means crouched, grounded, no override, and an unaware guard within `TENSE.radius` 5 m (`tenseNear`). `localBodyIn` (`src/player/playerVolumes.ts:633`) passes `c.kneeling` on.
- The host: `src/net/remotePlayer.ts:168` / `:172` kneels the client after `BODY_KNEEL_STILL` crouched and still, with no tense check.
- Size: crouched at low ready, the kneel offset (`KNEEL_L`) moves the head about 0.33 m (+0.17 up, -0.28 forward) and the neck about 0.24 m. That is more than the head volume's diameter. So the host's head volume, the guards' head line of sight and the aim point all sit off the body the client sees.
- When it happens: crouched and still at low ready within 5 m of an unaware guard. That is the normal stealth approach with a drawn pistol.
- Regression: the old remote capsule followed the drawn copy, and the drawn copy already applies `!tense` (`src/net/remoteAvatar.ts:645`, `:696`). S1's parity test hides the gap because it passes the same `kneel` to both sides by hand (`tests/net.test.ts`, "its kneel timer (settled)").
- Fix:
  - `src/net/remotePlayer.ts:168-172`: `const tense = crouched && (s.f & PF.grounded) !== 0 && (!mvm || mvm === 'ground') && tenseNear(s.x, s.z);`, then pass `this.kneelT > BODY_KNEEL_STILL && !tense` to `wireBodyIn`. Import `tenseNear` from `../player/tenseSneak`. The host's tense source is its own guards, the same ones the owner's tense uses on the host, so no wire change is needed.
  - Do the same in `src/net/remoteAvatar.ts:817` (`bodyIn`): keep the line-645 `tense` in a field and use `out.kneel = this.kneelT > KNEEL_STILL && !tense`. This covers the friendly-fire boxes, and the drawn copy's own rig already does it.
  - Test: move the host's kneel rule into a small pure helper, for example in `playerVolumes.ts`. In `tests/net.test.ts` add a case "tense: crouched still near an unaware guard, no kneel on either side": `setTenseSource` with one unaware guard, the owner with `kneeling: false`, and the host through the helper.

## Judged items

1. **Local player (G1 / G2 / G14, G5, P12): pass.**
   - `PlayerTarget` volumes, `center`, `aimPoint` and `headPoint` come from `playerBody(localBodyIn(...))`. The wall light sample (`gameState.ts:1589`) and the HUD exposure (`gameState.ts:3093`) read `target.body`. The suppression near-miss reads `headPoint`.
   - The rig reads left in `gameState.ts` are presentation only: `:880` (`rtCapsules`, lamp soft shadows) and `:3455` (`drawRope`).
   - One render-rate input is left: `Player.rootLift`, written per render frame by `attachController.ts:1240-1268` from the interpolated `s` and the pipe-change blend. It is the 1.68 m vs 1.75 m height lift (a few cm), so it is listed under polish.
2. **Host's view of the client (G3 / G4): pass except B1.**
   - Every model input is on the wire and parsed: x / y / z, `yaw` (`c.yaw`, the capsule yaw on both sides), `pitch` (`cam.pitch`), `speed`, the crouch flag, and `mv` m / a / s / sub / ph / r / dw / u. That covers the wall side, the edge, the peek bit, the attach phase and pipe mode, and the traversal phase.
   - Crouch, peek and kneel are rebuilt on the host. Crouch uses the same ease. Peek uses the same smoothstep; its ease-out lag is inherited and transient. Kneel is B1.
   - The "same MoveState" test does go through the real `pstate` parse and `wireBodyIn`. But it builds `mv` by hand, not through `localMoveState`, and it feeds the inferred inputs (kneel, eased peek) to both sides. So it proves the mapping, not the inference. That is how B1 got past it.
3. **Behaviour changes: decisions for the orchestrator, not blockers.** See below.
   - Lag: guards now aim at and hit the client's latest accepted state. Both the aim point and the volumes come from it. That is about one-way latency behind the client's present. Before, the volumes were another 0.1 s behind on the drawn copy, while the guards aimed at the feet-based point from the latest state. So rounds now land closer to where the client is, and aim and hit volume agree.
4. **Light parity: pass.**
   - On a wall, the client's meter reads `PlayerTarget.body.head`. The host's sample of the client reads `RemotePlayer.ref.head`, the same model on the same inputs.
   - Off the wall, both stay on the unchanged `bodyLevel` path. The wall branch ignores the kneel, so B1 does not reach the meter.
   - The e2e-netmove peek check (5 cm) now compares the two model heads.
5. **Fit bounds: acceptable for hit volumes in the prototype.** Measured errors: T1 0.027 / 0.075 m, wall 0.063 m, traversal 0.074 m, hang 0.14 m, transitions 0.152 m, against a head radius of about 0.1 m and a body radius of about 0.15 m.
   - The mocap-OFF residual (0.29 m on the hand-keyed run) is only against the drawn body under the developer rollback `?mocap=0`. The model is the same on both machines, so judging stays consistent.
6. **Allocation: pass.**
   - `playerBody` writes in place into a module `Float64Array` and the `out` objects. The measured about 52 B is the project's accepted boxed-double reading (`tests/helpers/allocPerCall.ts`, the same rule as lightField `bodyLevel` at 64 B).
   - Call rate: once per fixed step for the local player, once per accepted state per remote, and once per render frame per partner box. It is never called per guard per tick: guards read `center` / `aimPoint` / `headPoint`, which copy node positions.
   - `PlayerHitVolumes.setEnabled` allocates an array literal and an iterator, but only on a state change (dead / alive), not per call.

## Decisions for the orchestrator (S1 assumed; keep or revert)

- **D-S1b:** the client on the host now has split volumes with the local player's part multipliers (head x1.3, legs x0.75). It used to be one capsule at x1 everywhere. This brings CT co-op parity, since both players are judged the same way. It is a gameplay change: the client can be headshot. Recommend keep.
- **D-S1c:** the host judges the client at the latest accepted state, not the 0.1 s drawn copy. This is more accurate and consistent with the guards' aim (item 3 above). Friendly-fire boxes stay on the drawn copy, so the shooter hits what it sees. Recommend keep.
- **Existing asymmetry, not S1's:** the roll's x0.5 damage applies only to the client (`remotePlayer.ts` `applyDamage`). The local `PlayerTarget` has no roll multiplier. Decide whether both should get it.
- **D-S1a / D-S1d:** fitted to mocap ON, and the residuals are listed. Acceptable while the no-refining rule holds.

## Polish (not blocking)

- Host kneel timing: the owner waits `KNEEL_STILL_AIM` 0.35 s when aiming and `stopEaseT < 0` (the CT stop ease). The host uses 0.05 s for both. This is transient, under 0.07 m when raised, and up to about 0.3 s. `kneelStill(raise > 0)` and the wire `qs` would close it.
- Local `rootLift` (render rate, interpolated, with the pipe-change blend) vs the host's `attachLiftOf` (sim `s`, no blend). The difference is a few cm. Computing the local lift with `attachLiftOf` from the attach machine would make the two exactly equal.
- `RemoteAvatar.bodyIn` uses `wp.yaw` (the wall point) on a wall. The owner's model uses the capsule yaw, which turns toward it at `WALL_TURN_RATE`. Friendly fire only, and it settles.
- The `src/ai/enemy.ts` `PlayerRef.head` comment still says "posed copy" (S1 noted this).
- Strengthen the net parity case: build `mv` through `localMoveState`, or a stub of it, instead of by hand.
