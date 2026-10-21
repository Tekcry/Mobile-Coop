# anim-joints J1 - checker report

Checker: fresh session, read-only on source. Reviewed the uncommitted working tree on `feature/anim-joints` (HEAD
ca26e028) against BRIEF A1-A7, PLAN slice J1 and `J1-REPORT.md`.

## Verdict: PASS

Nothing broken or unplayable found. No fix list. Polish notes below.

## Evidence per check item

1. **Checks.** `npm run check` passes: lint 0 errors / 41 warnings (none in touched files), Vitest 219 files, 2398 passed,
   5 skipped, build ok. e2e (desktop, port 4191, `E2E_JOBS=2`, under the heavy lock): `e2e-studio` ok, `e2e-coop` ok,
   0 failures. The J1 asserts in e2e-studio: hold pair, Wren picks `idle` and the guard has no flag; a base row `idle`
   elbowR 40 turns her elbow 40.0 deg with the tuner at identity; guard moves 0.024 deg (limit 1); role B of the boost
   pair picks `crouchIdle` and its base row turns its elbow 40.0 deg.
2. **Base table correctness.** `tuneBakeBase.ts` matches A1: joints add then `wrapDeg`; offsets add; `gunScale` (unit
   `x`) multiplies; trigger (unit `mode`) is the delta's when not 0, else the base's; IK multiplies, clamped 0..1. The
   runtime (`rebuild`, `handCompose`, `ikRowLive`) uses the same functions, so bake and runtime agree. Unit test (c): bake,
   load, reset gives the same effective values (joints and IK exact, hands to 1e-9). Version 1 export (through
   `migrateTuneChanged`, migrated rows `wallCrouchIdle` / `aimStill` / `crouchRun` included) and version 2 export bake
   to literal expected texts. Ledger re-run is a no-op (test d). A value outside the wide range refuses (test b, the
   check runs before any base routing, `tuneBake.ts` line 497). My scratch probe confirmed: print(parse(print(x))) is
   stable, splice is idempotent, output does not depend on key insertion order, 540 deg wraps to -180, composing back
   to identity drops the entry, a non-base section throws, unknown rows / joints / weapons / IK rows are reported and
   skipped. Keys are row id / joint name / param id everywhere (`GROUP_INDEX`, `J[name]`, `HP[id]`). Tables are sized
   from `JOINTS.length` / `HAND_PARAMS`, and `JOINT_ROW_OF` is built by name. The only positional parts are the
   `[x, y, z]` axes and the 4 IK limbs, which the BRIEF shape fixes.
3. **Per-rig window.** Each flagged rig owns `TuneRigState` (allocated once in the `tuneRows` setter). The flag is set
   only in `operatorRig`, which is used by the player, `remoteAvatar`, `studioStage` and the menu preview. Guards, VIP,
   dummy and lab rigs never set it. `jointApply` reads `act` and `ikStrength` reads `act.ikCur`, both gated by
   `JOINTS_CUR.on` / `HANDS_CUR.ikOn`, which only `jointsBeginRig` / `open(st)` set true for the current rig and which
   `tuneRigEnd` clears in a `finally`. Every `HANDS_GUN` read (characterRig 2185, 2779, 2813) is behind `HANDS_CUR.on`,
   and `WeaponModel.tuneVisual` copies values at once without keeping a reference, so another rig cannot see stale
   `HANDS_GUN` data. Probe: rig A live on `idle`, then rig B on `walk`: B sees all windows off and `jointApply` does
   nothing. Unit test: an interleaved idle Wren, walking Wren and guard. Only the idle rig changes; the other two stay
   bit-identical. `player.ts` no longer opens the joints / hands windows (no double apply). When nothing is live, the
   fast path returns before any easing (test e: flagged rig equals unflagged rig, no window opened).
4. **Hot paths.** `tuneRigBegin` / `tuneRigEnd`, `jointsBeginRig`, `handsBeginRig`, `open` (TypedArray `set` between
   preallocated arrays) and `ikEase` allocate nothing. `syncBackground` per frame: 2 Joints rows (~90 keyed reads each),
   6 Hands + Weapon rows, 2 IK rows. That is a few hundred property reads, no allocation, setters only on a real
   difference (no hook churn: the clamp ranges equal the slider ranges, and `put` returns false on equal values).
   Nothing calls `jointsLoad` / `handsLoad` per frame, so `loadGen` does not churn. No `Math.hypot` in the diff or the
   new files.
5. **dt 0 = at once.** For dt > 0 the ease factor is unchanged (`1 - exp(-dt / tau)`). Probe: first 1/60 s frame
   applies 0.084 of 0.342, so normal play still eases with no snap. dt 0 only comes from `loop.paused` (`frameUpdate(paused ? 0 : dt)`)
   and the tuner / studio freezes. No test or e2e passes dt 0 to `jointsBegin` / `handsBegin`, so nothing relied on the
   old freeze. See polish note 2.
6. **animate split.** The diff on `characterRig.ts` is 34 lines: the import, `tuneSt` / `tuneRows`, the
   `animate` -> `animateFrame` split, one doc line. The body of `animateFrame` is the old tail of `animate`, unchanged.
   Its `return`s now leave `animateFrame` and the `finally` still runs. The LOD skip stays in `animate` before any
   window opens, and the carried `lodDt` is added before `tuneRigBegin`.
7. **Scope.** Changed files: CHANGELOG, TESTING, BAKE.md, ui.md, `scripts/anim-tune-bake.mjs` (comment),
   `scripts/e2e-studio.mjs` (PLAN step 5), `src/anim/tuneBake*`, `tuneHands.ts` (A3), `tuneJoints.ts`,
   `tuneV2Sections.ts`, `src/player/*`, the approved line in `src/operators/runtime/playerFigure.ts`, the new files and
   tests. Nothing in `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`, `src/anim/tuneRows.ts`,
   `scripts/anim-keys/*`, `src/net/*`, `src/game/*`.
8. **Docs.** CHANGELOG has "Unreleased - anim-joints" above T1a; TESTING has the base-table line; BAKE.md describes
   the file, the shape, the A1 rules, the targets (match `baseTarget`), the reset-after-bake step, the ledger, the
   v1 migration, the manual `joint.options` and the `__animBase` hook. ui.md has the tuner line.

## Polish list (non-blocking)

1. PLAN J1 step 5 asked for a co-op e2e where the partner's avatar reads a base row set through the dev hook. It was not
   added (the implementer's report says so). Today the partner is covered only indirectly: it is made by the same
   `operatorRig` (flag set), the unit test interleaves flagged rigs, and e2e-studio proves a second Wren rig (role B)
   reads its own row. Suggest adding it in J2 (e2e-coop or e2e-netmove: `__animBase.setJoint` on the partner's row,
   check the remote avatar's elbow).
2. dt 0 at once: when the loop pauses (pause menu, tuner Pause), an ease still running completes on the first paused
   frame. That is at most the remaining ~0.18 s of a row change, and only with a live row, so a tiny pop at most in the
   frozen frame. Normal play is unchanged.
3. Row pick versus panel follow: the rig picks its row inside `animate`, from the pose after `tuneBegin` (lean x
   `peekLeanMul`) and `moveTuneBegin` (the move `crouch` slider). The panel follow (`TUNE_STATE.body`) uses the pose
   before those changes. With `peekLeanMul` at 0, or a move crouch edit that crosses 0.5, the local player can apply a
   different row than the panel shows. This is an edge case and affects the local player only.
4. Bake rounding is 4 significant digits (shared `bakeFmt`): joint angles of 100 deg or more keep 0.1 deg, and IK
   products round (0.95 x 0.95 x 0.95 -> 0.8574). Repeated bakes can drift by less than 0.05 deg. A single bake is
   exact for slider-step values (test c).
5. `window.__animBase` is installed in production builds as well, the same as the existing `__tuneV2`.

## Commands run (2026-10-21, desktop)

| Command | Result | Time |
| --- | --- | --- |
| heavy lock taken 16:57 (`CT Core Build \| anim-joints J1 check`), port 4191 freed | - | - |
| `npm run check` | exit 0: lint 0 errors / 41 warnings; Vitest 219 files, 2398 passed, 5 skipped; build ok | 99 s |
| `E2E_PORT=4191 E2E_JOBS=2 node scripts/run-e2e.mjs e2e-studio e2e-coop` | all passed: e2e-studio ok 189 s, e2e-coop ok 299 s | 301 s wall |
| scratch probe (`node --import ./scripts/operators/ts-resolve.mjs <scratchpad>/probe/p1.mjs`): round trip, determinism, wrap, unknown names, window leak between rigs, dt 0, dt > 0 ease, base reset jump | 15 / 15 ok | < 5 s |
| port 4191 freed, lock released 17:04 | - | - |

No reruns needed (no failures).
