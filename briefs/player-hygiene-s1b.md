status: claimed Night Shift | Cloud Builder 3 2026-10-26T00:40Z (resumed after the swap)

# Brief: player-hygiene S1b - Player step and probe box no numbers (the S1 residual), behaviour bit-identical (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Opus builder. Job J6 player-hygiene, new slice S1b: the residual S1
left (`bb4590ab`, blocked on "16 B goal not reachable in brief scope"). After S1 every remaining per-step allocation
is a 16 B HeapNumber: V8 boxing a double that crosses a call it does not inline. This slice removes those in our code
and tightens the S1 test. Nothing may play differently. Unit tests only.

## Read first
- `git show origin/cloud-queue:briefs/player-hygiene-s1.md`: the S1 brief and its `## Report` (the readings after S1:
  walk 304, run 176, ramp 368, air 240, crouch under ceiling 32, kinematic 64, probe vault 288, mantle 736, drop 288,
  hop 240, nothing 32, probeDir 0, committed step 48 B per call; the named boxers; walk read 288-416 B run to run).
- Plan and brief: `git show origin/feature/player-hygiene:docs/player-hygiene/PLAN.md` (Design "Pattern", Claims and
  the wire note under it, Risks) and `.../BRIEF.md` (A1 the 16 B rule and its "Undo: tighten the goals to 0", A2, A3).
- `tests/playerStepAlloc.test.ts` on the base (the whole file: `REFACTORED` `:55`, `sampled` `:442-478`, `readings`
  `:485-493`, (b) `:499-566`, (c) allocation `:726-768`), `tests/helpers/allocPerCall.ts` (`bytesPerCall`, `ALLOC_TRACE=1`).
- The precedent for a written-out call: `src/anim/motion.ts:167-169` ("sideStepAt written out: a call with a double
  boxes it").
- Wire paths: `scripts/merge-train.mjs:326` `wirePaths` (every `../x/y` import of `src/net/protocol.ts` is a wire path,
  `import type` included). `src/net/protocol.ts:9` imports `src/core/mathx.ts`, `:18` imports `src/anim/motion.ts`.

## Base and branch
- Base `origin/feature/player-hygiene-s1` at `bb4590ab442a0e9679fc7a9a1ee65814b0cb6b48` (S1 built; not on master).
  New branch `feature/player-hygiene-s1b` from it; push `origin feature/player-hygiene-s1b` only (no force, no master
  merge, no rebase, no other branch; never push `feature/player-hygiene-s1`). `npm ci` once. S1b merges after S1 (or in
  the same PR); if S1 is rebased first, the lead rebases S1b.
- The plan docs are not on this branch: read them with `git show` as above.

## Files (only these)
- `src/player/playerController.ts`
- `src/player/traversal.ts`
- `src/player/speedGears.ts` (`AnalogGear`, `stickCurve`, `stickSpeed`, `gearCap`). Other importers, whose results
  must not change: `src/player/movement.ts:9` (`stickCurve`, `gearCap`), `src/player/player.ts:17`,
  `src/game/strikeController.ts:9`, `src/game/takedownController.ts:10`, `src/net/validate.ts:12` (`gearCap`),
  `src/player/freeView.ts:1`, `src/anim/studio.ts:12` (`stickMagFor`). Not a wire path.
- `src/anim/motion.ts` (`MotionDriver`), ONLY in commit 3 below and only for boxing the profile proves. It IS a wire path
  (`protocol.ts:18`): a change to it makes the train bump `PROTOCOL_VERSION` and puts the PR in the co-op e2e group, so
  it stays in its own commit for the lead to keep or drop. Other users, whose results must not change: guards
  `src/ai/enemy.ts:644` (`ENEMY_MOTION`), `src/game/vip.ts:48`, exported `gaitRate` / `stepLength` / `CROUCH_STEP` /
  `GLIDE_SIDE` in `src/anim/animGraph.ts:20`, `sideStepAt` in `src/anim/mocap.ts:18`, `wrapPi` / `easeInOut` in
  `remoteAvatar.ts`, `player.ts`, `localMoveState.ts`, `takedownController.ts`, `playerVolumes.ts`.
- `tests/playerStepAlloc.test.ts` (commit 1 only)
- `tests/fixtures/player-hygiene-s1b.json` (new, written by the test)
- `changes/feature-player-hygiene-s1b.md` (new fragment, `changes/README.md`)
Nothing else, and `tests/fixtures/player-hygiene-s1.json` never changes. Not `src/core/mathx.ts` (a wire path; PLAN:
no edits outside S5): where a `hyp2` call boxes, write it out at the call site in a claimed file. Not
`src/anim/rigMath.ts` (`Spring`), `src/anim/weight.ts` (`springStep`, `weightSim`), `src/anim/tune.ts`,
`src/player/traversePath.ts`, `src/player/attachController.ts`, `src/world/anchors.ts`, `src/player/movement.ts`,
`src/player/moveState.ts`, anything in `src/net/`. An allocator found there goes in the report (A3), not fixed.

## What is there now (bb4590ab; re-found)
`src/player/playerController.ts`:
- `:480-486` `floorUnder(eng, x, y, z, feet): number | null` (`raycastToRef` into `settleRay`, returns
  `settleRay.hitPointWorld.y` or `null`). Callers: `settleGap` `:441-442` (`hit`, then `:443` reads
  `settleRay.hitNormalWorld.y` from that same ray), the rim loop `:452-454` (`h`); `floorNear` `:474-475` (`h`).
  `settleGap` runs every grounded step (`:687`).
- `hyp2` on the step: `:511` (kinematic), `:541` (`mag`), `:640` (`moving`), `:727` (`speed`). `this.analog.update(...)`
  `:511`, `:582` (a computed double argument `mag`). `this.motion.step(dt, mi, ...)` `:625`; `this.motion.speed`
  (a getter returning `hyp2`) `:607`, `:620`, `:623`, `:758`. `Vector3.set` with computed doubles: `:280`, `:482-483`,
  `:492-493`, `:516`, `:543`, `:654`, `:690`, `:712`, `:822-836`, `:853` (Babylon's method: not ours to change).
- In-file double-returning helpers on the step: `turnTowards` / `wrapAngle` `:875-885` (exported).
`src/player/traversal.ts`:
- `:203-207` `ray(from, to): number | null` = `Vector3.Distance(from, rr.hitPoint)` or `null` (Babylon 9.29
  `Distance` is `Math.sqrt(DistanceSquared(a, b))`, `DistanceSquared` = `x = a.x - b.x; ... return x * x + y * y + z * z`,
  `@babylonjs/core/Maths/math.vector.pure.js:2645-2660`). `:210-216` `floor(x, z, yFrom, depth): number | null`.
- Callers: the attach callbacks in the constructor `:131-133` (`(x, z, y) => this.floor(x, z, y, 3)` returns
  `number | null` to `AttachController`; `(...) => this.ray(...) === null`): their signatures stay; `roomAt` `:156`;
  `probe` `:248-249` (the four heights), `:255-256`, `:259-260` (the hop loop), `:262`, `:267-268` (`land = f ?? feet.y - 4`),
  `:279-280` (`topY`), `:285-286` (the depth loop: up to ~15 floors a call, the mantle's 736 B), `:292`, `:294`, `:295`,
  `:299` (two rays), `:307` (`landY ?? feet.y`); `windowProbe` `:326-327`; `startRoll` `:560-561`.
- `hyp2`: `:336` (`probeDir`), `:381` (the committed step), `:498`, `:520`, `:539`, `:550` (press / roll), `:147`
  (kick-through, cold).
`src/player/speedGears.ts`: `:26-30` `stickCurve` and `:42-56` `stickSpeed` return doubles; `:20-23` `gearCap` returns
an array double; `:206-229` `AnalogGear.update(maxGear, crouched, mag)` calls all three (`gearCap` in the band loop
`:226`).
`src/anim/motion.ts`: `MotionDriver.step` `:305-427`, `stepCt` `:438-519`, `finish` `:533-556` (`gaitRate` ->
`stepLength` `:544`, `:546`; `rootModulation` `:550`), `updateYaw` `:568-622`, `turnToward` `:625-636`, `get speed`
`:269-271`, `travelRate` `:640-644`, `wrapPi` `:76-81`, `easeInOut` `:212-215`, `smoothUnit` `:206-209`; the pace
spring `this.paceSpring.step(...)` `:495` (`Spring`, `rigMath.ts`: outside).

## Method
1. Measure first, on the unchanged base: for each state of (b) and (c), the `sampled` profile's leaf functions and
   `ALLOC_TRACE=1`. A HeapNumber is made where a double is passed to or returned from a call V8 did not inline (and
   where a double is stored into a slot that also holds `null` / objects). Record where each 16 B comes from.
2. Fix in this order, re-measuring after each: (a) the `number | null` returns in the two files; (b) `hyp2` and other
   in-file calls the profile names; (c) `AnalogGear` / `stickCurve` / `stickSpeed` / `gearCap`; (d) only then
   `MotionDriver` (commit 3).
3. Forms that do not box: a `boolean` return plus the value in a member `number` field (initialised to a number, never
   assigned `null` / `undefined`: a field that has held a non-number boxes every double stored into it) or in a member
   `Float64Array`; a call written out at the call site with the exact same expression and operation order (as
   `motion.ts:167-169`), with a one-line comment. Locals: never a `number | null` local (a mixed local is tagged and
   boxes): a `boolean` hit plus a `number` value local.
4. Exported functions and public getters keep their signatures and results (other callers, tests). An in-place or
   written-out form may be added beside them; when the old function stays exported for other callers, the new form
   must be proved equal to it by the (d) sweep below.
5. Babylon (`Vector3.set` arguments, `raycastToRef`) and V8 itself are outside the claim (A2). If a residual is in
   Babylon or V8 internals, do not work around it with Babylon internals (`_x`): report it with evidence (the profile
   leaf and stack, `%GetOptimizationStatus`, or `--trace-turbo-inlining` output showing the call not inlined).

## Build
Commit 1 (test, no src change): the test changes below, the new fixture recorded on the UNCHANGED base
(`PH_S1B_WRITE=1 npx vitest run tests/playerStepAlloc.test.ts`), then a plain run passes. The test file and both
fixtures do not change after commit 1.
Commit 2 (the two player files + `speedGears.ts`):
1. `traversal.ts`: `ray` -> `private rayHit(from, to): boolean` setting a member `hitD` to `Math.sqrt(x * x + y * y + z * z)`
   with `x = from.x - hp.x` etc. (Babylon's `Distance` order, bit-identical) when it hits; `floor` -> `private floorHit(x, z,
   yFrom, depth): boolean` setting a member `hitY = rr.hitPoint.y`. Keep `rr.reset(from, to)` before each cast (S1).
   Every call site reads the member at once into a `number` local next to a `boolean` (later casts overwrite it):
   `f === null || feet.y - f > 0.6` -> `!fHit || feet.y - fY > 0.6`; `f ?? feet.y - 4` -> `fHit ? fY : feet.y - 4`;
   `landY ?? feet.y` likewise; `=== null` -> `!rayHit(...)`; `Math.min(front, d)` only on a hit. Same casts in the
   same order (the `&&` short-circuit at `:299` stays). The attach callbacks keep their contract: `(x, z, y) =>
   (this.floorHit(x, z, y, 3) ? this.hitY : null)`, `(...) => !this.rayHit(...)`.
2. `playerController.ts`: `floorUnder` -> `floorHit(eng, x, y, z, feet): boolean` + member `floorY`; `settleGap` and
   `floorNear` as above, `ny` still read from `settleRay` right after the centre cast, before the rim casts.
3. `hyp2` calls on a measured path that the profile shows boxing (`playerController.ts:511`, `:541`, `:640`, `:727`;
   `traversal.ts:336`, `:381`): `Math.sqrt(a * a + b * b)` written out (hyp2's exact expression), commented.
   Leave cold ones (`traversal.ts:147`, `:498`, `:520`, `:539`, `:550`) unless the profile names them.
4. `speedGears.ts`: whatever the profile names in `AnalogGear.update` and its callees, with the forms in Method 3/4
   (e.g. `stickCurve` / `stickSpeed` / `gearCap` written out inside `update`, or an in-place update reading `mag` from a
   field the controller sets); `update(maxGear, crouched, mag)` keeps working for `tests/analogGear.test.ts`.
5. One new prototype METHOD for the test's flag (class fields are not on the prototype), e.g.
   `TraversalController.prototype.rayHit`; name it in the test header.
Commit 3 (only if the profile still names `src/anim/motion.ts` after commit 2): the same forms inside `motion.ts`
(e.g. `finish` with `gaitRate` / `stepLength` written out or an internal no-box form, `get speed` callers in the step
reading `vx` / `vz` with hyp2's expression); exported `gaitRate`, `stepLength`, `travelRate`, `wrapPi`, `easeInOut`,
`rootModulation` and the `speed` / `accel` getters unchanged for their other callers. Add one new prototype method or
export for the test's second flag. Commit 3 touches `src/anim/motion.ts` only.
Comments in the house style with a `(player-hygiene S1b)` tag on each change.

## Test `tests/playerStepAlloc.test.ts` (commit 1)
- Header: add the S1b paragraph (goal, flags, tiers, the new fixture and `PH_S1B_WRITE=1`). Keep everything S1 checks;
  the (a) traces, probe rows, committed paths and `player-hygiene-s1.json` stay exactly as they are.
- Flags: `const S1B = '<method>' in TraversalController.prototype` (commit 2) and `const S1B_MOTION = <a check on the
  method or export commit 3 adds>`. Before them the new assertions only log.
- (d) new, fixture `tests/fixtures/player-hygiene-s1b.json`: a parity sweep of every function commit 2 / 3 may touch,
  through their public forms, recorded on the base: `stickCurve`, `stickSpeed`, `gearCap` over grids (mag -0.1..1.1,
  both stances, gears 0..6 and NaN); `AnalogGear.update` over a scripted stick sequence (gear, band, v, moving per
  step); `MotionDriver` driven by scripted `MotionInput` sequences (free walk, run, turn, reversal / pivot, stop, ct
  and non-ct, aiming, slowest backwards, `mocapSide`, tense) with `MOVEMENT`, `ENEMY_MOTION` and the cover / glide
  tunings the player passes (`playerController.ts:625`), hashing vx, vz, ax, az, outX, outZ, yaw, yawRate, state,
  phase, simPhase, backward per step; `gaitRate` / `stepLength` over a grid of their arguments. Float64 bit patterns,
  -0 as +0 (as S1).
- Tiers: after `S1B`, per state keep the strongest that holds 3 full runs of the file in a row:
  T0 `bytesPerCall(fn, 0) === 0`; T1 `bytesPerCall <= HEAP_NUMBER` (A1); T2 sampled `ours <= 0.1` B per call (no
  HeapNumber in the two files on even 1 call in 160: only V8's one-off re-optimisation samples) plus the S1 "no object"
  assertion, bytes logged. A state on T1 or T2 carries a comment naming what is left (file:line, or "V8 / Babylon:
  `Vector3.set` arguments" with the evidence in the report). States that call `MotionDriver.step` (walk, run, ramp,
  air, crouch under ceiling) may reach a higher tier only when `S1B_MOTION`; without it they assert their commit-2
  tier, so the test holds whether or not the lead keeps commit 3. The probe, probeDir, committed-step and kinematic
  states assert on `S1B` alone. The window probe stays logged only (`nearestInReach`, A3).
- Order of work: do the refactor in a scratch working copy, read the tiers there (3 runs), then write commit 1 on the
  base with the final tier table (state -> tier per flag, as data at the top of (b) / (c)), then commits 2 and 3.
  The test file must not change after commit 1.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck:fast`;
`npx eslint src/player/playerController.ts src/player/traversal.ts src/player/speedGears.ts src/anim/motion.ts tests/playerStepAlloc.test.ts`
(drop `motion.ts` if commit 3 is not made);
`npx vitest run tests/playerStepAlloc.test.ts tests/marlowStaleSupport.test.ts tests/crouchStrafe.test.ts tests/playerTargetTeleport.test.ts tests/mocapSimParity.test.ts tests/player.test.ts tests/wallController.test.ts tests/analogGear.test.ts tests/speedGears.test.ts tests/freeView.test.ts tests/changesFragments.test.ts`;
with commit 3 also
`npx vitest run tests/motion.test.ts tests/g1Locomotion.test.ts tests/animWeight.test.ts tests/tuneStep.test.ts tests/mocapStrafe.test.ts tests/turnFollow.test.ts tests/guardSpacing.test.ts tests/guardDoors.test.ts tests/keyedCrouch.test.ts`
(add `--maxWorkers=2` on a small box). `tests/playerStepAlloc.test.ts` on commit 1 (record, then a plain pass), on
commit 2, and on the final head three times in a row.

## Rules
- CLAUDE.md hot paths: no closures, iterators, literals or temporary vectors on a per-step line; `hyp2` / `hyp3`,
  never `Math.hypot` (a written-out `Math.sqrt(a * a + b * b)` with hyp2's exact expression is allowed where hyp2 boxes,
  as `motion.ts:167`). Babylon only through `src/core/babylon.ts`. Strict TS, `import type` for type-only imports.
- Behaviour bit-identical: the same expressions in the same order; S1's traces, rows and paths equal
  `player-hygiene-s1.json`, and (d) equals `player-hygiene-s1b.json`, on every commit.
- No wire change in commits 1-2; no `PROTOCOL_VERSION` edit by hand in any commit (the train bumps it if commit 3 is
  kept); no flag (G355).

## Done when
- Commit 1 (test + new fixture on the base), commit 2, optional commit 3; the test file and both fixtures identical from
  commit 1 on (`git diff <commit 1> HEAD -- tests/` empty; `git diff bb4590ab HEAD -- tests/fixtures/player-hygiene-s1.json` empty).
- Every state asserts its tier and passes 3 full runs in a row on the final head; the probe states and the committed
  step at T0 or T1 with commit 2 alone, or the report proves why not.
- `grep -nE "number \| null" src/player/playerController.ts src/player/traversal.ts` shows only the attach callbacks'
  contract (or nothing); every written-out call carries its comment.
- tsc and eslint clean; the vitest files above pass; `git diff --stat bb4590ab` lists only files from the list above.
- `changes/feature-player-hygiene-s1b.md`: line 1 `# Player step and obstacle probe stop boxing numbers`, line 2
  `kind: patch`, one or two `- ` bullets (no behaviour change; the movement step and the obstacle probe no longer make
  small number objects each step; proved bit-identical by the S1 golden trace).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/player-hygiene-s1b`.
  Then append `## Report` here and set line 1 to `status: done feature/player-hygiene-s1b <sha>`; commit, push
  `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.

## Report (fill in)
- Branch and commit shas (1, 2, 3 or "no commit 3").
- Where each 16 B came from on the base (state -> function:line -> bytes), and what removed it (file:line).
- Readings per state, `bytesPerCall` B per call and sampled `ours` / `other`: base -> commit 2 -> commit 3; the tier
  each state asserts, per flag; the three final runs.
- Residuals with evidence: V8 / Babylon (A2) and outside modules (A3: `Spring`, `springStep`, `weightSim`, `tuneSim`,
  `traversePath`, `nearestInReach`, ...), file:line and bytes.
- Whether commit 3 exists, and that it makes the PR a wire change (train `PROTOCOL_VERSION` bump, co-op e2e group).
- Tests: names and counts per file. Deviations, each with the reason.
- Pending PC run: e2e-move, e2e-anim, e2e-stealth, e2e-clip, e2e-traverse, plus e2e-coop and e2e-netmove (RULES
  checker gate for `src/player`); with commit 3 also e2e-ctcourse and the affected set for `src/anim`
  (`node scripts/run-e2e.mjs --affected origin/master --list`).
