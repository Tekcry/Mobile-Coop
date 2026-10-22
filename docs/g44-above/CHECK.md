# g44-above - fresh check

Branch feature/g44-above at 5b810766, diff `origin/master...HEAD` (5 files, +64 / -7).

## Verdict: PASS

No required fixes.

## What was checked

- Pitch sign and heights: `src/ai/enemy.ts:876` takes `atan2(chest.y - eye.y, hyp2(dx, dz))`, + = above, in rad.
  The eye is `Enemy.eye` (1.55 m x scale standing, 1.0 crouched). The chest is `aimPoint` (upper chest, follows the
  pose; remote / partner 1.3 m over the feet). `hyp2` is used, no `Math.hypot`. dx = dz = 0 gives atan2(y, 0) = +-pi/2,
  not NaN.
- Units: the `PERCEPTION` bounds are degrees converted to rad (`perception.ts` table). The tests use `deg` the same way.
- `pitchFactor` (`perception.ts:148`): 1 at `upFull` (`<=`), smoothstep to exactly `upFloor` 0.15 at `upEnd` and above
  (`smooth` clamps 0..1). Below the eye: 1 to -40 deg, 0.6 at -75 deg and below (the test checks -90). It is continuous
  at 0 and at both knees.
- The multiplier is on the sight term only (`perception.ts:168`). The close felt term (1.8 m, moving) is untouched, so a
  body moving right next to a guard is still noticed. `instantDetect` (`perception.ts:184`) adds `pitch <= upFull`.
  Looking down does not gate the instant rule, which is correct.
- Exemptions (`enemy.ts:914`): `alerted` (combat) sends 0, so a guard in combat still tracks and shoots you overhead.
  A dog sends 0 (a low eye, and smell covers it anyway). Searching / suspicious guards keep the limit but look harder
  (sensitivity). Both make sense against G44.
- Other `sightRate` callers leave `pitch` unset, so `?? 0` gives a factor of 1 and they are unchanged: `security/camera.ts:84`
  (cameras), `tests/ctcourseLight.test.ts` (light bands), `tests/securityCamera.test.ts`, `tests/visionIsolation.test.ts`
  (snapshot still matches). Light parity is untouched: the light meter is not read or changed.
- Co-op: `perceive` runs only on a real `Enemy` (host / solo). Clients run `EnemyPuppet`, which does not perceive. The
  remote player's pitch comes from its own `aimPoint` (feet + 1.3 m), the same height the chest LOS already used.
- Allocation: one local number and a field write on the reused `this.sight`. No new objects per think.
  `pitchFactor` allocates nothing.
- Guard on a raised catwalk looking down: pitch is negative. Full sight to -40 deg, easing to 0.6 by -75 deg. A guard
  4 m up sees a player 3 m out at about -55 deg at about 0.8x: sane, and gentler than looking up, as intended.
- Gameplay does not read graphics state in the new code. `PlayerTarget.aimPoint` reading `torso.node.position` is
  older than this branch (the chest LOS already uses it), so it is not from this job.

## Runs

- `npx tsc --noEmit`: clean.
- Vitest: perception, visionIsolation, securityCamera, ctcourseLight, vision, enemyManagerDespawn, guardInfo, guardTune:
  8 files, 90 passed, 1 skipped (already skipped before this branch).

## e2e scan

Searched `scripts/e2e-*.mjs` for perception, sightRate, instantDetect, hang, ledge, pipe, roof, mezzanine and meter.
No assert needs a guard to spot a player well above him. The overhead scenarios (takedown from above, from a hang, from
a pipe; the warehouse skylight lip over a patrol) want the guard to stay unaware, and G44 only makes that more likely.
The stealth-ai peek test reads `los` / `losHead`, which this branch does not change.

## Polish list (not blocking, Michael's numbers)

- A crouched guard (eye 1.0 m) right next to a standing player: the chest is above 22 deg at under about 1 m, so the
  instant point-blank rule drops out and sight is reduced. The felt term still catches a moving player. Check in play
  whether a crouched guard should look up at someone standing beside him.
- The pitch is measured to the chest only. A head peeking over a high ledge with the chest hidden is judged by the chest
  angle (a little higher than the head's would be). This is minor.
- The tests cover the 60 deg cases. One mid-band case through `sightRate` (for example 35 deg at 6 m) would pin the
  smoothstep in the full formula. The test now checks `pitchFactor` alone there.
- The ai.md bullet says "Numbers are Night Shift's own". If Michael tunes them, the doc numbers (22 / 48 / 0.15, -40 /
  -75 / 0.6) need to be kept in step.

## e2e suites for the laptop

- e2e-stealth-ai (required)
- e2e-stealth
- e2e-takedown (from above / hanging / pipe over guards)
- e2e-ct-warehouse (skylight lip over a patrol, mezzanine pipe)
- e2e-coop (host perception of a remote player)
