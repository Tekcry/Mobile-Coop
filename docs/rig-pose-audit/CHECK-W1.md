# rig-pose-fix: check W1 (S2 shot origin, S5 body position, S6 dog head, S7 small batch)

Fresh Opus checker, 2026-10-24. Range `63f22ad2..6dcac873` (`src`, `scripts`, `tests`) on `feature/rig-pose-fix`; HEAD
003009e2 differs only by `STATE.md`. S1 and S3 are out of scope.

## Verdict: PASS

No blockers. Nothing is broken or unplayable. No slice leaves a gameplay read of the render state that it claims to
fix. No host / client mismatch is introduced. No hot-path allocation.

## Per slice

### S2 shot origin (G6)
- `shoot()` (`playerWeapons.ts:1036-1066`) takes the ray and projectile origin, the wall-poke eye, `lastShot.origin`,
  `onRay` (lamp / pendant / camera / stealth claims, impact noise) and `sourcePos` (via `from`) from
  `shotPoint` -> `shotOrigin` / `shotEye`. Inputs: controller pos, crouch blend, `pose.lean`, `cam.shoulder`,
  `handSwitchOk`, `attachAim.inverted`, def class and muzzle. All sim. The muzzle is used only for the tracer, casing and flash.
- `sourcePos` consumers checked:
  - guard stimulus / `lastKnown` (`enemy.ts:1916-1965`): now about 0.5-0.9 m forward of the old pivot, still at the shooter.
  - client `sendShot` (`coopClient.ts:681`): origin plus a direction to the hit point. Same shape as before.
  - host `judge` / `checkShot` (`coopHost.ts:1183`): the origin bounds are met in every fitted stance, and LOS now runs
    from the gun, not from the pivot behind cover.
  - host `hurt` bearing (`coopHost.ts:365`): direction only.
  - `lampSync` claims: upright max 1.48 m, inverted 2.013 m, against the new 2.1 m.
  - The projectile clones `from`; the ray paths alias the fields only until `sourcePos: from.clone()`.

  Nothing breaks.
- Fit numbers are plausible: rifle 3.2 cm max, pistol 7.9 cm max (rig clearance jump), inverted 0.6 cm.
  `shotOrigin.ts` is pure and does not allocate (module scratch).
- Hang-down uses the inverted table: `gameState.ts:1855-1859` sets `attachAim.inverted`, and the hang root
  `hangRootY` (head 0.62 m under the root) is consistent with the table's eye at -0.44 m. This case is not fitted (S2
  open item), so e2e must cover it.

### S5 body position (G8, G9, P13)
- `Body.pos` / `lie` are set only in the constructor (`deathLieOn` from `e.pos`, `e.yaw` and the impulse,
  `enemyManager.ts:657-660`) and in `drop` (`dropLie`). `sync` is gone.
- Grep of `body.ts`, `enemyManager.ts` and `stealthSystems.ts`:
  - Left in: `shoulders` and `knees` (hand IK, P8) and `captureLying` (hoist pose, P9). All presentation.
  - The step-in and the carry side read `lieChest` / `carrySide`.
  - Nothing else reads the ragdoll (`Ragdoll.torso` has no caller).
- The ragdoll snap is visual: it eases the nodes after the physics settle, `keep` only, and allocates once per body.
- The client lie (`coopClient.ts:748-761`) comes from `buf.latest()` feet / yaw and the killer's position. The client
  ragdoll is visual only (client carry goes through the host).
- Fall direction matches the host for rounds and for takedowns: `takedownController.ts:785`, dir = attacker `faceYaw`.
- Snapshot lag is up to one interval (a few cm at walk). The explosion caveat is known and accepted.

### S6 dog head (G10)
- `dogHead` / `dogPose` are pure and write into an out object.
- `syncHitboxes` (fixed step, once per step on every path, `enemy.ts:2036-2095`) steps `dogPhase` and decays `dogBite`.
  `dogBite` is set at the melee in the fixed step (`:2817`).
- `frame` only draws; `this.head` is no longer copied from the model. The yaw convention matches (`rotation.y`,
  forward `(sin, cos)`).
- The 630-state NullEngine parity passes at 1 mm. No allocation.

### S7 small batch (G15-G18)
- **G15, `rig.openLeft`:** sim. Its only local writer is `gameState.ts:2759` in `wallStep` (fixed step, `:1834`), from
  `w.leftHand`, `cam.shoulder` (a discrete toggle set by the `shoulderSwap` press in `player.ts:281`) and `handSwitchOk`.
  `weapons.fixedUpdate` (`:1964`) steps `hand` in the same step, after that write. `remoteAvatar.ts:626` writes only
  remote rigs. The swap timing is the same on every machine.
- **G16:** the dummy head is a constant offset over the sim pos. Its yaw never changes, so the precomputed offset is valid.
- **G17:** the root modulation runs on `simPhase` (never `mocapSide`). `mocapSimParity` measures 0.000 mm. The teleport
  resets both clocks.
- **G18:** with `G.RAGDOLL` dropped, player rounds, the aim-point ray and projectiles pass through bodies. The camera rays
  (`gameState.ts:3244` ping, `:3470` HUD on-target) also pass through; those are HUD / ping only, with no gameplay
  effect. Both machines now agree (the host's `HOST_LOS` already ignored ragdolls).
- **`LAMP_SHOT_ORIGIN` 2.1:** 8.7 cm over S2's worst inverted point. Host only, no wire change.

### Cross-slice
- Merged cleanly. S7 was cut from the S2 / S5 / S6 merge, and the S2 test edit (lamp constant) is consistent.
- Two notions of the gun's side remain:
  - S2 `shotPoint` flips at once on `cam.shoulder && handSwitchOk`.
  - S7 `hand` eases from `openLeft`.

  This is not a conflict: S2 D2 chose it on purpose, both are sim, and they do not write the same value. It is on the
  polish list.

## Tests (desktop, one file at a time)
shotOrigin 7, bodyPos 12, bodySearch 8, dogHead 8, mocapSimParity 1, trainingDummyHead 1, animN4cHandSwap 9, motion 31,
weapons 16, sectorLampSync 13, guardHeadParity 165, carry 9: all pass. `npx tsc --noEmit -p .`: clean.

## Polish list (no fix round needed)
1. **S5, floor at death** (`src/ai/body.ts:34` `deathLieOn`, `bodyLie.ts:83`). The lie uses the feet's y and settles
   0.47 m along the fall without a floor probe. A guard killed mid-air (ladder, ledge drop) or at an open ledge lip then
   has `Body.pos` floating. The ragdoll eases up to it after 3.5 s, and the pick-up step-in target can sit over the drop.
   Fix: one down ray on `G.STATIC` from the settled pelvis (and from the feet). Take the floor y from it, and when there
   is no floor within ~0.4 m, settle 0 at the feet's floor.
2. **S2 / S7 side** (`playerWeapons.ts:201`). With S7 merged, read the gun's side from `this.hand.hand` (or
   `rig.openLeft`, which also covers the wall `leftHand` during a leave ease) so the origin and the swap clock agree.
3. **S2:** `shotEye` and S1's `playerVolumes` head are two sim heads. Unify them once S1 lands (known).
4. **S5:** the settle ease can turn a body up to 180 degrees in 0.3 s, and a wall-side death can lay the head into the
   wall visually (known).
5. **S6:** the client puppet still feeds its hitbox from `DogModel.head` (`enemyPuppet.ts:402`). It no longer reads the
   scene graph, but it is still the drawn root at render rate. This is S3's one-liner (S6 report).
6. **S7:** `openLeft` is a sim-written flag stored on the rig object. Move it to `PlayerWeapons` after S1 (known).
7. Dead code: `PlayerWeapons.muzzlePoint()` (`playerWeapons.ts:214`) has no caller.
8. Stale comment: `enemy.ts:1993-1996` says the frozen-rig solve keeps `Body.pos` independent of the camera. It only
   shapes the ragdoll's start pose now.
9. S7 G16: the dummy offset fits one pose (known).
10. Not fitted, verify in e2e: the S2 hang-down root, the split / rappel / hostage holds, and the in-game pipe
    `grips.lift` offset (G176) against the NullEngine fit.

## e2e for the laptop (these four slices)
- S2: `e2e-combat`, `e2e-wall`, `e2e-weapons-carry`.
- S5: `e2e-stealth-ai`, `e2e-guard-carry`, `e2e-stealth`.
- S6: `e2e-stealth-ai` (vision-dog), `e2e-sectorops` (part 1, handler dog).
- S7: `e2e-ctcourse`, `e2e-weapons-carry`.
- Slice tier (`src/net`, `src/player` and `src/game` changed): `e2e-coop`, `e2e-netmove`. These cover the client kill
  lie, the lamp claims and the hang-down shot origin.
