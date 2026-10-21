# anim-joints J2 - the e2e-menus stall (diagnosis)

> Correction (2026-10-22, job havok-stall, `docs/havok-stall/REPORT.md` on `feature/havok-stall`): there is no Havok
> spin. The desktop's software GL runs the page at 1-4 fps and the suite ran past the 600 s limit; the stacks below were
> snapshots of slow frames. The rest of this file is kept as the record of the first diagnosis.

2026-10-21, 21:01-21:44, this PC (software GL). Implementer. No source change; nothing committed.

## Result: J2 does not cause it

The merge base, 39b97591 (master 4.39.0, T2 and J1 in, no J2), stalls at the same step, in the same way, on this
PC. The cause is outside J2 and outside this job's files. The PR #88 pass of 4.39.0 was on the laptop, so the stall
depends on the machine or the frame rate.

## What the stall is

It is not a JS exception. The page's main thread spins inside the Havok WASM. `frames()` waits on
requestAnimationFrame, so it never returns.

How it was captured: temporary instrumentation in `scripts/e2e-menus.mjs` (now reverted). It raced the
`(tuner-camera)` `frames(P, 30)` against 20 s. On a timeout it paused the page through CDP (`Debugger.pause`) and
printed the stack, the frames' `this`, and a scan of the scene. A rAF hook also logged the player's state every frame.

| Run | Tree | Result | Stack top (JS) |
| --- | --- | --- | --- |
| 1 | HEAD edf60afa (dist 20:47) | stall, 493 s (suite killed by the probe) | `HP_World_ShapeProximityWithCollector` <- `_castWithCollectors` <- `_integrateManifolds` <- character controller `integrate` <- controller `fixedUpdate` <- `Player.fixedUpdate` <- game `fixedUpdate` <- `GameLoop.frame` |
| 2 | HEAD | stall, about 470 s | `HP_World_CastRayWithCollector` <- `raycast` <- `raycastToRef` <- controller `floorUnder` <- `settleGap` <- controller `fixedUpdate` <- ... |
| 3 | HEAD | stall, 422 s | as run 2 |
| 4 | 39b97591 (`git archive` into the scratchpad, `vite build`) | stall, 474 s | as run 2 |

The evidence from runs 1-4:
- `errors` was empty before and after the stall: no page error and no console error.
- Every frame up to the stall was normal. The player stood still at (18, 0.02, -24.5), with velocity 0, yaw 0,
  grounded, no input, the tuner off and timeScale 1. The last logged frame was about 26 frames after Menu closed the
  tuner.
- A scan of the scene during the stall found nothing bad. All 1331 meshes and 413 transform nodes had finite
  positions, rotations and scales, as did all 42 physics bodies and every skeleton bone. The bodies were props, glass,
  grates, doors, the player's CC and hit capsules, the guards' `hb-*` and the recon drone.
- The game time at the stall was 5.18 s, 5.42 s and 5.30 s (over runs 2-4).

The hang therefore sits inside Havok's own queries, on finite inputs. The CC's shape proximity and a plain floor ray
both hung, so the physics world itself is in a bad state: no single query or caller is at fault.

## What does not reproduce it (scratch probe `scripts/e2e-zstall.mjs`, deleted)

| Probe | Result |
| --- | --- |
| The tuner pad sequence alone (no pause / objectives / disconnect steps), no menu page | passed, 74 s, `frames(30)` ok |
| The e2e-menus tuner block verbatim (lines 385-543), with the menu page open beside it | passed, 218 s, `frames(30)` ok |
| The same mission, no input, 15.7 s of game time | passed, 61 s, no hang |

The suite stalls 5 times out of 5 (the 3 earlier J2-FIX runs and runs 1-3 here, plus run 4 on the base). The verbatim
block alone does not stall. In the full suite the M page runs at a lower frame rate, behind several minutes of the
menu page's work, so more game time passes for each press. This points at the frame rate or the step timing (for
example the many real seconds held at timeScale 0 by "pause while tuning", then the release), not at J2's data. This
was not narrowed further: it is outside the job's files (`src/physics`, `src/core/gameLoop`, the CC in `src/player` is
shared but the base tree without J2 hangs the same).

## Suggested owner and next steps

- Owner: the CT core / physics side (the hang is in the Havok step and queries, on 4.39.0).
- Next steps: rerun `e2e-menus` alone on master tip (4.40.0) on this PC, to confirm it stalls there too. Then pin the
  step timing: log `GameLoop` acc / steps per frame and every `_step` dt around the tuner's freeze and unfreeze. Check
  for a zero or huge dt, or a body moved while the world is not stepped (the ANIMATED hit capsules use
  `disablePreStep = false`).
- Until then the full `npm run e2e` will fail e2e-menus on this PC, with or without J2.

## Housekeeping

- The `scripts/e2e-menus.mjs` instrumentation was reverted to the committed file. The scratch suite
  `scripts/e2e-zstall.mjs` was deleted. `git status` is clean, apart from this file.
- The base tree was exported into the scratchpad. Its `node_modules` was a junction to this checkout's, and only the
  junction was removed.
- Heavy lock held 21:01-21:44 ("CT Core Build | anim-joints stall"). Port 4191 was freed before and after.
- `dist/` is unchanged: the 20:47 build of HEAD.
