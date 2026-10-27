# Guard aim fix: check (feature/guard-ai-aim-fix @ 58bbbdab2)
Owner: guard-ai. Status: checked.

**Verdict: PASS.** No FIX items.

Scope: `git diff origin/master...58bbbdab2` (src/ai/enemy.ts, tests/guardAimFix.test.ts, tests/carryState.test.ts,
changes/feature-guard-ai-aim-fix.md, AIM-FIX-REPORT.md). Michael 2026-10-27: "they currently shoot at you without
actually aiming at you (ie facing away from you) which is unrealistic."

## Intent
- **Every fire path gated.** The only round in the game sim is `Enemy.shoot` (enemy.ts:4473); its only caller is
  `tryFire` (enemy.ts:4425), and the gate (enemy.ts:4414) sits before it. Callers: enforcer push 3921-3922, attack
  3999-4000, seekCover 4046, inCover peek 4130, blind fire 4132, overwatch `suppressLkp` 3826 (from roleStep 3771 and
  inCover 4123). Sniper, runner, heavy, officer, droneOp, response teams and lookouts all run this `decide`; dogs are
  melee only (enemies.json: no kind has both weapon and melee). No other emitter does damage: `GuardActor.fire`
  (piano intro) is render-only; teammates, ballistics and grenades are not guard shots. None missed.
- **He turns and never freezes.** `aimFace` is set by `facesAim` on every step a round is due; `faceFor` hands it to
  `move` whenever the goal has a facing. `move` then sets `mi.aiming` (no weapon-carrying kind is melee), so the driver
  takes the continuous eased turn (motion.ts:618-621, `turnAim` 110 deg/s while alerted: `aimedMotion`), never the
  standing stepped turn with its 26 deg threshold. So no 15-26 deg dead band. Every gated path's goal has a facing
  (`toTarget`, roleGoal.face = toTarget at 3720) except seekCover (`null`, by design). Nothing else writes `yaw` after
  `move` (814 / 1024 are spawn / teleport; links skip `decide`, so no fire there). Posts only steer calm guards.
  seekCover cannot hold forever: it ends at the path end (inCover) or stateT > 6.
- **No added delay when facing.** The check runs before `fireT`; a facing guard takes the same branch as before. Tests
  compare round-by-round against the gate bypassed. The 60 deg/s sweep test holds no round.
- **Run to cover:** face `null` kept, fires only if the run already faces the target. Blind fire may be skipped when
  far off: accepted per brief.
- **Cone from the body, not the muzzle:** correct; the muzzle's 0.18 m right offset would add ~10 deg at 1.5 m and
  wrongly hold point-blank fire.
- **Co-op:** host decides (`shoot` -> `onShot` -> coopHost.ts:356 tracer event); no src/net change, no wire change.
  The 0.16 s client facing lag (tracer drawn on arrival, puppet at `renderTime`) is reported correctly; a follow-up.
- **Zero allocation:** `facesAim` uses module scratch `FACE_AIM`, `hyp2`, `atan2`; no closure. Tested
  (`bytesPerCall`).
- **Tests are real:** with the gate disabled in the working tree (`facesAim` still called, result ignored), 18 of 27
  fail: every "holds every round", every "turns then fires", the seekCover case and the alloc case (it asserts 0
  rounds). The 9 that pass are the "already facing, same as before" checks and the sweep, which are regression guards
  and should pass either way. Restored with `git checkout -- src/ai/enemy.ts`; tree clean.

## Polish (no block)
1. enemy.ts:4606: pressed into a corner on both axes, `move` calls `motion.reset`, zeroing `yawRate` every step, so the
   eased turn runs at ~accel x dt (about 11 deg/s) until the strafe re-rolls (2-4 s). This was already true of his
   facing; now it also delays his first round in that corner. A slowdown, not a freeze.
2. `GuardActor.fire` (piano intro) fires on its timetable with no facing check. Render-only and strafe-locked to its aim
   point, so in practice it faces; worth a look if the intro is ever re-cut.
3. inCover can run `suppressLkp` and blind fire in one step; the later call's `aimFace` wins. Both point near the
   last known spot: harmless.
4. Co-op: delaying the client's tracer event to `renderTime` would close the 0.16 s gap (report's follow-up).
5. The test stand-in turns a standing guard only; the real attack strafes while aiming at the same `turnAim` rate, so
   the result holds. A strafe-driven case would be nice to have.

## Commands
- `git rev-parse --abbrev-ref HEAD`: feature/guard-ai-aim-fix.
- `npm run typecheck:fast`: exit 0.
- `npx vitest run tests/guardAimFix.test.ts tests/carryState.test.ts tests/guardAiAllocManager.test.ts` plus every test
  importing src/ai/enemy: 67 files, 1015 passed, 1 skipped, 0 failed.
- Gate disabled spot-check, `npx vitest run tests/guardAimFix.test.ts`: 18 failed, 9 passed; restored, tree clean.
