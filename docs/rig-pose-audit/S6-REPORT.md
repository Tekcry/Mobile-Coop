# rig-pose-fix S6: pure dog head (audit G10, ranked fix 6)

Branch `feature/rpf-s6` off `feature/rig-pose-fix` 63f22ad2 (master 4.88.1). Opus builder, 2026-10-24.

## What
- Before (re-found on 4.88.1): `src/ai/dogModel.ts:114-116` read the head pivot back through the scene graph
  (`computeWorldMatrix` + `getAbsolutePosition`, + 0.14 m) once per render frame, at the render-interpolated root, on the
  model's own render-rate gait clock; `src/ai/enemy.ts:3623-3624` (`frame`) copied it into `Enemy.head`, which the next
  fixed step's `syncHitboxes` gave the hit volume. The client puppet does the same at `src/net/enemyPuppet.ts:401-402`.
- Now: new Babylon-free `src/ai/dogHead.ts`: `dogHead(pos, yaw, speed, phase, alert, bite, out)` (writes and returns
  `out`, no allocation), plus `dogPose` (the standing pose the model draws), the gait clock `dogGaitStep` /
  `dogGaitRate` / `dogGaitAmp` / `dogPhaseBack`, the build constants and `DOG_MEAN_PHASE`.
- Host: `Enemy` owns the sim gait clock `dogPhase` and bite pose `dogBite` (`src/ai/enemy.ts:312-313`; the bite set to 1
  next to the melee `kick` at `:2817`). `syncHitboxes` (fixed step, `:3532-3536`) steps both and writes `Enemy.head` from
  `dogHead(this.pos, this.yaw, |vel|, dogPhase, alert, dogBite)`. Nothing copies `DogModel.head` any more.
- Model: `DogModel.update` (`src/ai/dogModel.ts:86-112`) draws its standing pose from `dogPose` and fills its `head`
  (now presentation only) with `dogHead` at the drawn root; no scene-graph read. A new optional last argument `phase`
  takes the sim clock; `Enemy.frame` (`src/ai/enemy.ts:3639`) passes `dogPhaseBack(dogPhase, speed, (1 - alpha) *
  FIXED_DT)` (the clock at the drawn root's time) and `dogBite`. Without it (puppet, lying body) the model steps its own
  clock with the same `dogGaitStep`. The lying-down pose stays model presentation (no head volume when down: the hit
  volumes are disposed at death).

## Fit and residuals
Not a fit: the dog body is procedural, so `dogHead` is the model's transform chain written out (root, yaw, body at
`DOG_BODY_Y` + trot bob `|cos phase| x amp x 0.04`, pivot at (0, 0.14, 0.3744 + 0.12 x bite), + 0.14 m world y). The
NullEngine parity test builds the real `DogModel` and compares the scene-graph pivot + lift with `dogHead` over 630
states (speed 0 / 0.5 / 1.1 / 3 / 6, 7 phases, alert 0 / 1, bite 0 / 0.4 / 1, 3 yaws): tolerance 1 mm, passes (float
rounding only). The drawn `DogModel.head` equals `dogHead` to 1e-9.
- The pivot pitch (alert, bite, gait nod) turns the skull about the pivot and never moved the old centre; `dogHead`
  keeps that (alert is an input with no effect on the centre).
- Host timing: the volume now sits at the sim position and clock of the step it is used in (before: the last drawn
  frame, up to one frame stale, interpolated, frame-rate dependent). The trot bob, the only phase term, is at most 3 cm.

## Decisions (undo: revert the slice commit)
- D1: the bite pose is a sim clock (`dogBite`, 1 at the bite, -8 per s in the fixed step) instead of the render-rate
  `kick` decay; the drawn bite steps at 60 Hz (0.125 s long, not visible). `kick` is untouched for guards.
- D2: the gait clock wraps at 20 pi (`DOG_PHASE_WRAP`): every pose term's period divides it, so the wrap is seamless.
- D3: the puppet (no host gait clock on the wire, no wire change) uses `DOG_MEAN_PHASE` (bob at its mean): at most
  1.92 cm from the host's head at any phase; deterministic from wire state, no model read.
- D4: `DogModel.head` kept (presentation, standing pose) so `enemyPuppet.ts` compiles unchanged until S3.

## S3 one-liner (`src/net/enemyPuppet.ts`, S3 owns it)
Replace line 402 `this.hitboxes?.sync(this.pos, this.dog.head);` with:
```ts
      this.hitboxes?.sync(this.pos, dogHead(this.pos, this.yaw, this.speed, DOG_MEAN_PHASE, this.alerted ? 1 : 0, this.kick, this.head));
```
and add the import `import { DOG_MEAN_PHASE, dogHead } from '../ai/dogHead';`. (`this.head` is the puppet's existing
`Vector3`, idle for a dog.) After that nothing reads `DogModel.head`; it may then be deleted.

## Tests
- New `tests/dogHead.test.ts` (8): pure (rest point, yaw / bite, alert has no centre effect, bob <= 3 cm and mean phase
  <= 1.92 cm, gait clock / wrap / back-step), NullEngine parity (630 states, 1 mm), wiring (host steps it in
  `syncHitboxes`, no `this.dog.head`, no scene-graph read in `dogModel.ts`). Pass.
- Run one at a time: `tests/guardHeadParity.test.ts` 165 pass; dog tests `tests/archetypes.test.ts` 13,
  `tests/visionIsolation.test.ts` 3, `tests/enemyManagerDespawn.test.ts` 4: pass.
- `npx tsc --noEmit -p .` clean; eslint on the 4 changed / new code files clean. No e2e, no full vitest (as briefed).

## e2e
`e2e-enemies` is legacy. Non-legacy suites that spawn dogs: `e2e-stealth-ai` (scenario `vision-dog`: spawns a dog,
thermal on its body, lies dead) and `e2e-sectorops` part 1 ("sector tags": a handler dog). `e2e-coop` filters dogs
out. Suggested for the wave run: `e2e-stealth-ai`, `e2e-sectorops` (part 1).

## Open items
- S3: the puppet one-liner above.
- The centre ignores the skull's pitch and sits 0.14 m behind the skull sphere (pivot + 0.14 up, as before); moving it
  onto the skull is a gameplay change, left for after the playtest (no refining).
- Changelog fragment left to the job lead (one fragment per branch; slices merge into `feature/rig-pose-fix`).
