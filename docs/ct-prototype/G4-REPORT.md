# G4 report: traversal against the CT footage (2026-10-20)

Implementer, slice G4. Sources: `docs/ct-prototype/audit/AUDIT-TRAVERSAL.md` (TRAV #1-#22) and the traversal rows of
`AUDIT-EXTRA-NEW.md` (EXN #4-#13, #16, #17) / `AUDIT-EXTRA-OLD.md` (EXO #18-#19). Michael: "Footage wins" over D2b / D+E / F5.
Every number is a starting value. Nothing committed.

## Checks run

- `npm run typecheck` (tsc), eslint on every changed file: clean.
- Vitest: `attach`, `gripStepper`, `moveState`, `rappelFence`, `teamMoves`, `splitJump`, `committedMoves`, new
  `attachGripsG4`: all pass.
- At the coordinator's request (heavy lock held): `npx vite build`, then `E2E_PORT=4193 node scripts/run-e2e.mjs --serial
  e2e-clip e2e-traverse`: both pass. e2e-clip knees: ladder climb 26.1 cm, ladder down 11.7, drainpipe 19.7, shimmy 18.1
  (limit 9).
- GPU sheets (one render round): `docs/ct-prototype/shots/g4/` + `report.json`. Climb-up knee and crouch, drainpipe
  inchworm, ladder 2-rung reach look right. `duct` and `window-vault` did not run in the sheet (`kind none`: the sheet's
  set-up does not open the grate or reach the window). Nothing else run.

## Per row

| Row | Status | Old -> new (what it replaces) | Files |
| --- | --- | --- | --- |
| TRAV #1 drainpipe hands | done | pipeV hand slack 0.16 -> 0.5 (lead 0.8 kept), swing 0.18 s scaled -> `CLIMB_HAND_SWING` 0.3 s; right hand starts higher so the hands alternate. About one reach per hand a second (was ~3/s) | attachGrips.ts |
| TRAV #2 drainpipe legs | done | alternating feet 0.12 / 0.38 (E1) -> one pair at 0.28 m, stepping together after each hand lands (`PIPE_FEET`, 0.18 s draw-up, 0.32 s push); new clip `PIPE_CLIMB` (kind `pipeClimb`) keyed on how drawn up the feet are, so the hips sit low when compact and surge up on the push | attachGrips.ts, traverse.ts, animGraph.ts (kind + clip map), characterRig.ts (climb checks), moveState.ts, attachController.ts |
| TRAV #3 drainpipe speed | done (kept) | 0.9 m/s kept; down uses the same cycle | - |
| TRAV #4 shimmy | done (partial on cycle) | `ATTACH.ledge.speed` 0.7 (D2b) -> 0.5; swing 0.28 -> 0.32 s, lead 0.42 -> 0.6 s, spots 0.26 -> 0.25. Hand cycle about 0.8 s (CT 1.0): a 0.75-0.9 s lead (1.0 s cycle) put the lead hand 4 cm past Wren's reach in e2e-traverse | attach.ts, attachGrips.ts |
| TRAV #5 shimmy pendulum | done | none -> `AttachGrips.hangSwing`: hips trail the hands' midpoint (1.4 rad/m, max 0.3 rad) through a damped spring (0.7 s, zeta 0.4: lag plus one overshoot on a stop); HANG is now a looping clip keyed on the swing (`traverseT`, remotes via `cadence`). The pelvis moves 0.08 m and the feet 0.45 m (a full body swing about the hands took the shoulders off the grip: 17.9 cm reach error) | attachGrips.ts, traverse.ts, attachController.ts, moveState.ts |
| TRAV #6 climb-up | done | `CLIMB_UP_TIME` 1.3 (F5) -> 0.85 s to a crouch on top, then `CLIMB_UP_STAND` 0.45 s only with the stick held (else the crouch toggle is set). Clip retimed: chest at the lip 0.26 s, knee wide and on top 0.47 s, hands off 0.49-0.65 s (`CLIMB_UP_HANDS` 0.6/0.14 -> 0.38/0.12), crouched 0.85 s. Root path `CLIMB_UP_PATH` retimed, `climbUpFootWeight` 0.34 -> 0.2 | attachController.ts, traverse.ts, moveState.ts |
| TRAV #7 mantle | partial | `MIN_TIME.mantle` 0.75 -> 0.9. Knee at k 0.5 not done (MANTLE lives in clips/actions.ts, not mine) | traversal.ts |
| TRAV #8 jump-grab | done | ledge grab from the ground 0.3 s -> `jumpGrabTime` 0.3 + 0.25 x clamp((lip - 2.0) / 0.4) | attachController.ts |
| TRAV #9 drop from a hang | partial | a drop from a ledge / pipe by the hands now lands crouched (crouch toggle). Release arm fling not done | attachController.ts |
| TRAV #10 / EXN #4 ladder cadence | done | `LADDER_RUNG_RATE` 3 -> 1.7, `LADDER_SPRINT_RATE` 5 -> 3, new `LADDER_DOWN_RATE` 1.3x; hand / foot slack 1.05 -> 1.9 rungs, lead 0.5 -> 0.05 (2 rungs a reach), spots up 0.3 m, swing 0.3 s. Descent lean not done | attach.ts, attachGrips.ts, attachController.ts |
| TRAV #11 / EXN #7 ladder top-out | done | spec exit 0.45 s (mantle, standing, 0.2 m in) -> `LADDER_TOPOUT_TIME` 0.85 s, the CLIMB_UP knee to its crouch, 0.4 m in, ends crouched (remote maps `ph` the same) | attachController.ts, moveState.ts |
| TRAV #12 ladder let-go | done | none -> drop below `LADDER_DROP_MAX` 1.2 m (prompt "Drop"), slide above | attachController.ts, gameState.ts (prompt) |
| EXN #5 ladder mount bottom | not done | timing already matched (0.35 s) | - |
| EXN #6 ladder mount top | done | `LADDER_TOP_TIME` 0.6 -> 1.2 s: turn first (k 0-0.33, feet held), then lowered; posed as a mantle backwards (local only: remotes keep the climb pose in the enter, no wire bit for it) | attachController.ts |
| TRAV #13 rappel hook-on | done | `RAPPEL.hookTime` 0.8 -> 1.8 s (roof; the 1.3 s ledge start not split out) | config/movement.ts |
| TRAV #14 rappel speed | done | `RAPPEL.descend` 1.6 -> 0.6, `descendSprint` 3.0 -> 1.2. Pose unchanged | config/movement.ts |
| TRAV #15 rappel unhook height | not done | kept 2.0: 4.0 breaks the Fallow layout test (`bunkerMap.test` checks the landing from `unhookHeight`) | - |
| TRAV #16 / EXN #11-#12 duct camera | not done | camera presets are G3's | - |
| EXN #9 crawl exit | done | wall-vent exit 0.45 s -> `DUCT_CRAWL_OUT` 2.5 s: crawl out 1.0 s, rise to the crouch (new clip `CRAWL_OUT`, kind `crawlOut`), ends crouched; hands leave the duct floor early (`attachGripWeight(..., 'crawlOut')`). Remotes derive it from mode duct + exit phase (no wire change; one line in `net/remoteAvatar.ts`) | attachController.ts, traverse.ts, moveState.ts, remoteAvatar.ts |
| EXN #10 crawl speed | not done | 0.9 kept (TRAV #16 says keep; EXN #10 says 0.7; no ruler in the footage) | - |
| EXN #8 hang idle sway | done | static -> 0.1 rad sway at 1.7 s, 0.06 after 3 s still (part of `hangSwing`) | attachGrips.ts |
| TRAV #17 / EXN #13 floor trap, shaft | not done | new states, left for later | - |
| TRAV #18 rail vault | done | `MIN_TIME.vault` 0.42 -> 0.6; a vault onto a floor 0.3 m+ lower lands crouched | traversal.ts |
| TRAV #19 / #21 / EXN #16 crouched climb-over | not done | not cheap (new clip and probe); a slow vault is derivable from `c.dur` without a wire change if wanted | - |
| TRAV #20, #22 | no change | matched | - |
| Missing #1 free rope | not done | new state | - |

Also: climbing knees get an outward pole share `CLIMB_KNEE_OUT` 0.45 (characterRig.ts): the 2-rung steps and the paired
drainpipe feet put the knees 8.4 cm apart in e2e-clip (limit 9); now 11.7 cm and more.

## Tests changed and why

- `tests/attach.test.ts`: shimmy 0.7 -> 0.5, ladder 1.7 rungs/s (the new CT values).
- `tests/rappelFence.test.ts`: descend 0.6, sprint 1.2, hook 1.8.
- `tests/gripStepper.test.ts`: the ledge config literal follows AttachGrips (0.25 / 0.32 s / 0.6 s), reach counts for the
  slower cycle (7-11 in 4 s), the planted-hand error bound now allows the designed speed lead ahead of the spot (it was the
  behind-only bound); the ladder reach test uses the 2-rung reach and expects the 0.3 s swing at the climb's own pace.
- `tests/moveState.test.ts`: the climb-up test retimed (knee at 0.36, hands off by 0.5, crouched at 0.654, monotone
  stand); a new test for the `pipeClimb`, hang swing, ladder top-out, `crawlOut` poses and grip weight.
- New `tests/attachGripsG4.test.ts`: drainpipe reaches per hand, alternation, paired feet, inchworm span; ladder 2 rungs
  a reach; the pendulum trails and settles; the CT timing constants.
- `scripts/e2e-traverse.mjs`: ladder rate bands 1.45-1.85, top-out and climb-up end crouched, slide starts above 1.2 m,
  a new ladder let-go near the foot, `tp` clears the crouch toggle.
- `scripts/e2e-ct.mjs`, `scripts/e2e-ct-warehouse.mjs`: rappel hook waits 1.0 -> 2.0 s, descent band 0.45-0.7 m/s over
  2.5 s, longer descents to the window / the unhook height. e2e-ctcourse untouched; it should pass (its pull-ups wait for
  `grounded`, moves teleport), but a player now stands up crouched after a climb-up there: the job lead's run will tell.
- Not run by me: e2e-ct, e2e-ct-warehouse, e2e-ctcourse, e2e-netmove, e2e-coop, e2e-move, npm test (full).

## What still differs from CT

- The drainpipe at 0.9 m/s needs two leg pushes per hand cycle; CT shows one push per ~1.1 s cycle with ~0.5 m reaches,
  which works out to ~0.45 m/s. The audit's 0.9 m/s speed estimate and its cadence disagree; I kept 0.9 as briefed.
- The shimmy hand cycle is ~0.8 s (CT 1.0 s): a longer reach outruns Wren's arm.
- The ladder top mount and the hang pendulum's exact feel are unverified by eye beyond one render round; remotes show the
  plain climb pose during the top mount.
- Not done: floor trap, shaft, free rope, crouched climb-over, rappel sit / pose / unhook 4 m, release arm fling, ladder
  descent lean, duct camera, MANTLE knee timing.

## What Michael should try

Proving Grounds: shimmy a lip and stop (the legs should trail and settle); climb up with and without the stick held
(crouched on top vs standing); a drainpipe (feet together, knees up, slower hands); the ladder up, over the top, down
from the top, and B low on it; a rappel (slower); crawl out of a wall vent.
