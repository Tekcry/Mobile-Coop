# rig-pose-fix S2: shot origin from sim (audit G6, P6)

Branch `feature/rpf-s2` off `feature/rig-pose-fix` 63f22ad2 (master 4.88.1). Ranked fix 2 of `REPORT.md`.

## What
- Every player round (ray and projectile) starts at a sim point, not the animated muzzle. The wall-poke test runs from
  a sim eye, not `rig.headNode`. Before: `playerWeapons.ts:994-997`, the same lines on 4.80.0 and 4.88.1.
- The client's claimed origin is the same point. Damage claims send `HitInfo.sourcePos`, which was `cam.pivot`; it is now
  the round's origin. Lamp and pendant claims send the `onRay` origin, which is now sim too. `coopClient.ts` is unchanged.
- The animated muzzle (`WeaponModel.muzzleWorld`) now places only the tracer, flash and casing (P6).

## Files
- New `src/weapons/shotOrigin.ts` (pure, no Babylon, no allocation). `shotOrigin(pose, out)` and `shotEye(pose, out)`.
  - Inputs (`ShotPose`): feet, crouch blend, lean, shoulder side, inverted, pistol or long gun, aim direction, and the
    weapon's `muzzle` [1] / [2] after attachments (a suppressor lengthens the barrel).
  - Model in the aim frame: origin = feet + B(c, p, lean, side) + dir x muzzleZ + up(p) x muzzleY, and eye = feet + E(...).
  - B and E are cubic in pitch with crouch cross terms. The right row flips with the side and adds the lean; the up and
    forward rows add |lean|. The inverted case has its own quadratic in pitch. Pitch is clamped to the camera's -1.2 .. 1.05.
- `src/weapons/playerWeapons.ts`:
  - `shotPoint(dir, outO, outE)` at :182 builds the pose from `controller.pos`, `crouchBlend`, `pose.lean`,
    `attachAim.inverted`, `def.class` and `def.muzzle`. The side is `cam.shoulder < 0 && handSwitchOk`, the rig's own
    `openLeft` rule off the wall (aiming leaves the wall).
  - `shoot()` at :1029-1038 uses it. `resolveHit` and `penetrate` take the round's origin `from`, which becomes the
    hit's `sourcePos` (:1111). A projectile keeps its own copy.
- `tests/shotOrigin.test.ts`: new.
- `docs/systems/combat.md`: one bullet.

## Fit (Wren's rig at rest, NullEngine, built as `operatorRig` does, aimed)
Sweep: rifle and suppressed pistol, both sides, crouch 0 / 0.5 / 1, pitch -1.2 .. 1.05 in 9 steps, lean 0 / +-0.2.
Inverted: the pistol on a pipe at pitch -0.8 .. 0.6. Residuals vs the rig, as printed by the test:

| Case | Muzzle max (rms) | Head max |
| --- | --- | --- |
| Rifle | 3.2 cm (1.4) | 2.6 cm |
| Pistol | 7.9 cm (2.6) | 5.1 cm |
| Aim turned / in-between stances (not fitted), rifle / pistol | 1.6 / 3.8 cm | - |
| Inverted pistol | 0.6 cm | 1.3 cm |

- The pistol's worst point: the body clearance pushes the low pistol out 6 cm between pitch -0.3 and -0.6. The rig
  itself jumps there.
- Regenerate the sweep with `SHOT_ORIGIN_SWEEP=<file.tsv> npx vitest run tests/shotOrigin.test.ts`. The fit is a least
  squares of the model terms on (muzzle - barrel) and on the head node, at 1 mm rounding.
  - That fit script was a scratch script and is not committed (prototype rule).

## Decisions (undo: revert this slice)
- D1: the stance frame turns with the aim yaw, not the rate-limited visual body yaw. The upper body follows the aim when raised.
- D2: the side comes from the camera shoulder plus `handSwitchOk`, not from the rig's eased hand blend.
  - During a shoulder swap the origin switches sides at once while the drawn gun eases over.
- D3: the round's origin replaces `cam.pivot` as `sourcePos` for player hits. Guards' stimulus and `lastKnown` now point
  at the gun, about 0.5-0.9 m in front of the old pivot.
- D4: the long-gun table is used for every non-pistol class (only the rifle exists). The upright tables are also used
  for the split, rappel and hostage holds.

## Host check (read only: `src/net/coopHost.ts` 1183-1277, `src/net/validate.ts` 91-106, `src/net/lampSync.ts` 145-171)
- Hit claims (`judge` -> `checkShot`): the origin must be within 3.5 m horizontally and between -1 m (2.2 m hanging)
  and +3 m vertically of the feet.
  - The sim origin is accepted in every stance, both weapons, the full aim range, with or without the suppressor.
  - The LOS ray from the claimed origin is unchanged in kind. A wall-poke round starts at the eye; its LOS to the
    target is blocked, so it scores 0, the same as locally.
- Lamp and pendant claims (`lampShotOk` / `swayShotOk`, `LAMP_SHOT_ORIGIN` = 2 m from feet + 1.2):
  - Upright: max 1.48 m, accepted.
  - Hanging inverted: up to 2.013 m (pistol with suppressor, pitch -0.6). Some inverted lamp / pendant shots are rejected.
  - Not a regression: the rig muzzle sent the same point (the fit there is within 0.6 cm).
  - Tolerance needed: `LAMP_SHOT_ORIGIN` 2.1 m, or measure the inverted origin from the feet rather than feet + 1.2.
  - For S1 / S3 or the lead to decide. `lampSync.ts` and `coopHost.ts` are not edited here.

## Tests run (desktop, one at a time)
- `tests/shotOrigin.test.ts`: 7 passed. Covers the pure model, host acceptance and NullEngine parity.
- `tests/weapons.test.ts` 15, `n3DrawMotion` 36, `sectorRestart` 9, `tuneClipSpeed` 12, `tuneHands` 12: all passed.
- `npx tsc --noEmit -p .`: clean. ESLint on the three changed source and test files: clean.
- No e2e, no full vitest, no `npm run check`.

## e2e to run (laptop queue)
`e2e-combat`, `e2e-wall`, `e2e-weapons-carry`. `e2e-combat` prints `lastShot.origin`, which is now the sim point.

## Open items
- The host's lamp / pendant origin tolerance for inverted shots (above).
- Not fitted:
  - the gait (moving aimed: the rig bobs, the sim does not, by design);
  - the inverted aim off its centre (the body does not turn; the model does);
  - the hang-down root (team move) and the split / rappel / hostage holds.
- S1's `playerVolumes` head and this `shotEye` are two sim heads. Consider one model once S1 lands.
- No changelog fragment: the lead writes the batch's.
