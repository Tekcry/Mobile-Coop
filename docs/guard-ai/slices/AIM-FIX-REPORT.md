# Guard aim fix (feature/guard-ai-aim-fix)
Owner: guard-ai. Status: built, awaiting check.

Michael, storm mill playtest 2026-10-27: "they currently shoot at you without actually aiming at you (ie facing away
from you) which is unrealistic."

## Cause
`Enemy.tryFire` (src/ai/enemy.ts:4383) never looked at the guard's facing. `shoot` aims muzzle -> target whatever
`this.yaw` is, so a round went out from a body pointing anywhere. Worst case: `seekCover` fires on the run to cover
(enemy.ts:4046) while the goal has no facing (`face: null`), so the body faces the travel direction, often straight away
from the player. Also: the first round on entering `attack` / `inCover` / the enforcer push came before the turn
(decide runs before `move` turns him), and suppress / blind rounds go at `lastKnown` / `suppressAim` while the body
faces `faceTarget()` (feet or the known spot), which can differ.

## Fix (src/ai/enemy.ts, the single gate every path goes through)
- `FIRE_CONE` = 15 deg (enemy.ts:418, exported). `tryFire` (enemy.ts:4414) holds the round while
  `|wrap(aimYaw - yaw)| > FIRE_CONE`, where aimYaw is the flat yaw from his position to this round's aim point
  (`facesAim`, enemy.ts:4430, the same `aimAt` point `shoot` uses). The burst, pause and wind-up are kept; only the round
  waits. Counter `aimHeld` (tests / debug).
- `aimFace` (enemy.ts:505) is set to that yaw whenever a round is due; reset at the top of `decide` (enemy.ts:3863).
- `faceFor` (enemy.ts:4443): `update` (enemy.ts:2753) hands `move` the aim yaw instead of the goal's facing when the
  goal has one (an aimed goal), so he turns onto the exact point he is about to shoot, at the aimed combat rate
  (`ENEMY_MOTION.turnAim` 110 deg/s, `turnAccel` 12), then fires. A goal with no facing (the run to cover) keeps his
  travel facing: he is not spun off his run, and fires on the move only when the run already faces the target.
- Already facing: identical rounds on identical steps (tested against the gate bypassed).

### Why 15 deg
The aimed turn eases in at 12 rad/s^2, so a guard tracking a target sweeping across him at the full 110 deg/s trails it
by w^2 / (2a) = 1.92^2 / 24 = 0.15 rad (8.8 deg). 15 deg keeps a tracking guard's fire rate unchanged (test: a 60 deg/s
sweep at 10 m holds no round) and is under the driver's on-the-spot step threshold (`turnThreshold` 26 deg), so a guard
who fires has visibly squared up. The cone is measured from his body position, not the muzzle (the muzzle sits 0.18 m to
the right: at 1.5 m that alone is ~10 deg, and would wrongly hold close-range fire).

## Fire paths (all call `tryFire`, all gated)
| Path | Call | Facing goal | Result |
|---|---|---|---|
| attack, in sight | enemy.ts:3999 | toTarget | turns, then fires |
| attack, sight just lost (suppress at lastKnown) | enemy.ts:4000 | toTarget -> aim yaw | turns to lastKnown, then fires |
| enforcer push, in sight / suppress | enemy.ts:3921-3922 | toTarget | turns, then fires |
| seekCover, firing on the run | enemy.ts:4046 | none (travel) | fires only if the run faces the target |
| inCover peek | enemy.ts:4130 | toTarget | turns, then fires |
| inCover blind fire (hide phase) | enemy.ts:4132 | toTarget -> aim yaw | turns, then fires (if the 1 s window allows) |
| overwatch suppress from cover (S27) | enemy.ts:4123 -> 3826 | toTarget -> aim yaw | turns to suppressAim, then fires |
| overwatch suppress waiting in the open (S27) | enemy.ts:3771 -> 3826 | toTarget (role goal) -> aim yaw | same |

Runner, heavy, sniper, officer, droneOp: same paths (no kind has its own fire code). Dogs: melee, excluded. Grenades
(`tactics`, enemy.ts ~4173): a throw, not a shot; unchanged. `src/ai/guardActor.ts` `fire()`: the piano intro's
scripted render-only actors (no damage, no target); unchanged.

## Co-op (src/net: unchanged)
Guard shots are decided on the host (`Enemy.shoot` -> `ctx.onShot` -> `coopHost` pushes a `tracer` event,
src/net/coopHost.ts:355). The client only replays the tracer and the puppet's yaw from snapshots, so the fix covers co-op
with no net change.

## Picture vs sim lag found (report only; no change)
- Host / single player: the rig root's yaw is interpolated `prevYaw -> yaw` by `alpha` (enemy.ts `frame`): at most one
  fixed step behind. The guard figure is parented to that root; `rp.aimYaw` is never set for guards (the gun follows
  the body). The anim tier can skip pose solves for far guards (stale arms), but the root yaw is set every frame. No
  real lag.
- Co-op client: the puppet's yaw is sampled at `renderTime` (`CLIENT_INTERP_DELAY` 0.16 s behind,
  src/net/interp.ts:34, src/net/enemyPuppet.ts:481), but the `tracer` event is drawn on arrival
  (src/net/coopClient.ts:876). A client sees a host guard's round ~0.16 s before the puppet shows the end of the turn.
  With the sim fix the turn is at most ~0.16 s of a turn at 110 deg/s (~18 deg) behind the tracer. A follow-up could
  delay the tracer event to the render time; out of scope here.

## Tests
- New `tests/guardAimFix.test.ts` (27 cases, stand-in guards on Enemy's prototype, turned each step by the real
  `MotionDriver` with `ENEMY_MOTION` exactly as `move` turns a standing guard). Per fire path (8): facing away holds every
  round; already facing fires the same rounds on the same steps as the gate bypassed; facing away turns, fires no sooner
  than (away - 15 deg) / 110 deg/s, and every round leaves from a body within the cone. Plus the run to cover (no forced
  turn; fires only facing), a 60 deg/s sweep tracked with no held round, and zero allocation on the held path
  (`bytesPerCall`, <= 16 B).
- All 27 fail on 593b22c58 (run with src/ai/enemy.ts stashed). There they first fail on the missing `FIRE_CONE` / `faceFor`; past that, the old `tryFire` has no facing check, so the away cases would see rounds at once from a body 126 deg off.
- `tests/carryState.test.ts`: its `tryFire` stand-in stubs `facesAim` (as it stubs `armourBlocks`).
- `npm run typecheck:fast`: clean. `npx vitest run` on the new file plus every test importing enemy.ts,
  enemyManager.ts, armourFire or weapon code (125 files): 1696 passed, 2 skipped, 0 failed.

## Notes for the checker
- Walk the storm mill: a guard who spots you from behind or side-on should turn (about 1 s for 126 deg) before the first
  tracer; a guard running to cover away from you should not fire over his shoulder.
- A guard tracking a sprinting player keeps firing (lag under the cone); a player circling faster than 110 deg/s around
  him (point-blank) makes him hold until he catches up: intended.
- Blind fire has a 1 s window in the hide cycle; a guard facing far off may now skip it (he turns, the window closes).
- `FIRE_CONE` is one exported constant; `aimHeld` counts held steps for debug.
