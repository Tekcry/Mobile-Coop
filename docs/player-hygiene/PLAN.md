# player-hygiene: plan
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/player-hygiene/BRIEF.md`.
Every file:line below was re-found on master 2148ec969 (CONFORMANCE.md's numbers are older).

## How it works today (the allocations, per row)
**H2 player step** (`PlayerController.fixedUpdate`, every fixed step).
- Kinematic step: `ov.kinematic.add(new Vector3(...))` and `Vector3.Zero()` (`src/player/playerController.ts:485-486`).
- Free step: `cc.checkSupport` builds a new surface info and 3 vectors (`:628`; Babylon's `checkSupport` wraps
  `checkSupportToRef`); `cc.calculateMovement` returns a new vector (`:638`) fed by `forwardVec()` (`:814-816`, new
  vector); slope projection `cross` twice (`:645-646`); `averageSurfaceNormal.scale(...)` (`:650`); air step
  `new Vector3(...)` plus `GRAVITY.scale(dt)` (`:676`).
- `hasHeadroom` (crouched and wanting to stand: every step while a ceiling blocks): two `add(new Vector3)`, a query
  literal and `PhysicsEngine.raycast` (new result) (`:460-464`).
- Traversal (`src/player/traversal.ts`): the committed move writes a new override literal every step (`:333`); the
  probe every 0.2 s and on a press (`:410-414`): `probeDir()` literal (`:291-297`), `for (const h of [0.25, 0.6, 1.0,
  1.4])` (`:207`), result literals with `new Vector3` ends (`:225`, `:233`, `:264-265`, `:287`), the window probe's
  `['window']` array (`:270`) and template key `glass:${w.id}` (`:273`).
- Pad poll (`src/input/gamepadSource.ts` `poll`, every frame): `scan()` builds a `Set` and `Array.from(getGamepads())`
  (`:68-74`, `:76-98`), `pads()` again (`:102`), `p.buttons.some(closure)` (`:109`), `pads.find(closure)` (`:116`),
  `pad.buttons.map(closure)` plus a snapshot literal (`:137`), a 27-name array literal iterated each poll (`:143-150`).
  `mapPad` (`src/input/gamepadMapping.ts:136-171`): two closures, an `out` record, three `{x, y}` literals,
  `Object.keys(out)`, the frame literal; `applyRadialDeadzone` / `applyCurve` return literals
  (`src/input/stickMath.ts:8-13`, `:27-32`).

**H3 takedown offer scan** (`TakedownController.fixedUpdate` -> `find` -> `tryVictim`, every step, up to 3 candidates):
`ballistics.ray` allocates a result and clones two vectors (`src/game/takedownController.ts:313`, `:346`;
`src/weapons/ballistics.ts:117-123`); `pickTakedown` builds a `ground` closure and a plan literal per call
(`src/game/takedown.ts:220-230`, `:270-280`, `:289-291`, `:298-308`, `:327-337`, `:350-361`, `:365-376`), `assistPlan`
a literal (`:202`); each offer is a new object (`takedownController.ts:315`, `:354`). `start()` stores `o.plan` in
`active` and mutates `o.plan.approach` (`:226-229`, `:236-247`).

**H4 carry pick and wheel ring.** `carryStep` runs `bodies.find((x) => x.enemyId === this.carryId)` every step for up
to 1.5 s (`takedownController.ts:608-615`). The open wheel calls `refreshRing()` every step (`src/game/gadgetSystem.ts:186`)
which builds two arrays and an object per slot (`:236-246`) and `buildWheel` spreads each into a new segment
(`src/game/selectionWheel.ts:50-55`). The HUD compares the ring by contents, not identity
(`src/ui/hud/gadgetWheel.ts:165-196`).

**H5** `Math.hypot` in the Operator Lab: `src/operators/lab/retarget.ts:21`, `:22` (3 args), `:28` (4 args).

**H10 partner and team moves.**
- `RemoteAvatar.update` (every render frame per partner): a new `RigPose` literal (`src/net/remoteAvatar.ts:751-811`;
  enemy, puppet and player reuse one: `src/ai/enemy.ts:375`, `src/net/enemyPuppet.ts:121`, `src/player/player.ts:141`);
  `emptyMovePose()` when no move state (`:556`, `src/player/moveState.ts:303-305`); attached only:
  `unpackAttachSub` literal (`:612`, `moveState.ts:149-158`), template key `${sub.pipe}>${to}` (`:625`), the `vent`
  literal (`:639`), `gp.some(closure)` (`:642`). `buf.sample` is already allocation-free (`src/net/interp.ts:128-131`).
- `teamMates()` pushes a new object per mate every call (`src/net/coopHost.ts:1059-1069`,
  `src/net/coopClient.ts:343-351`); single player gets a new `[]` per call (`src/game/teamController.ts:119`).
- `TeamController`: `mate()` and `idle()` iterate with for-of (`:662`, `:675`, `:679`); new `this.offer` literals
  (`:689`, `:694`, `:698`, `:701`, `:704`); `boostTarget` apex literal (`:897`); per-step override literals while a
  move runs (`:233`, `:244`, `:358`, `:377`, `:411`, `:593`, `:603`, `:625`, `:644`, `:887`, `:1065`, `:1084`,
  `:1112`; the builder marks which run per step and which once).

**Comments.** `src/net/protocol.ts:38` cites G2 for "Sector Ops take two players" (truth: G308). `src/game/gadgetSystem.ts:71`
"time slows" (G181: no time slow). `src/ui/screens/controlsScreen.ts:59` "the pad also by holding B 1 s" (G22: Menu /
Start or Esc; `src/input/gamepadSource.ts:8-9`). `src/net/remoteAvatar.ts:158-159`: a dangling doc comment on the
removed SWAT turn (`swatN` exists nowhere). `src/player/characterRig.ts:2901` "the lean-out arc (M16, up to 175 deg)"
(lean-out removed: DECISIONS loco M20 Q1). Paths to job docs J1 (#437) moves to `docs/archive/`:
`src/anim/mocap.ts:2` (`docs/mocap-trial/BRIEF.md`), `tests/animFixPass.test.ts:4`, `:14` (the `OUT` path, written only
with `AFP_WRITE_NUMBERS=1`), `:49`, `tests/mocapRunFeet.test.ts:11`, `:13`, `:94`, `tests/mocapCrouch.test.ts:2`,
`tests/mocapPlayer.test.ts:132`. Kept on purpose: BRIEF A6, A7.

## Design (per row; behaviour bit-identical)
- **Pattern.** Each owner keeps its scratch objects as members (vectors, results, records); index `for` loops; no
  closures in a step; the allocating public API stays as a thin wrapper where tests or cold callers use it
  (`mapPad`, `pickTakedown`, `assistPlan`, `applyRadialDeadzone`, `applyCurve`, `unpackAttachSub`, `buildWheel`), and
  the step calls a new `...Into(..., out)` form with the same arithmetic in the same order.
- **H2.** `checkSupportToRef` into a member `CharacterSurfaceInfo` (Babylon's `checkSupport` is exactly a fresh info +
  `checkSupportToRef`, which resets every field: `node_modules/@babylonjs/core/Physics/v2/characterController.js:1101-1131`);
  `calculateMovementToRef` with a member forward vector, zeroing the member movement vector before each call (the
  wrapper starts from `new Vector3(0, 0, 0)`, and the ToRef form returns false without writing when forward x up is ~0); `crossToRef` / `scaleToRef` into members (check aliasing: the
  second cross writes the step's output); kinematic step `setPosition` from a member set to `kin + (0, h/2 + 0.02, 0)`,
  `setVelocity` from a member zero; `hasHeadroom` with `raycastToRef` into a member result and member query (Babylon's
  `raycast` = new result + the same plugin call). Traversal: one member probe result with its own `end` vector (the
  hint is copied at commit, `traversal.ts:445-448`; outside, `gameState.ts:1929` sets it null and
  `gameState.ts:3428`, `:3508` read `traversal.hint` in the same frame for the HUD, safe with one member result), module-level height and kinds constants, the window's `glass:<id>` key built once per anchor (a member
  `Map<WindowAnchor, string>`), `probeDir` into a member, the committed move's override a member
  object whose every field is reassigned each step. Pad: one `getGamepads()` read per poll passed to `scan`, index
  loops, a reused known-index list instead of the `Set`, a member snapshot whose `buttons` is a reused number array,
  `mapPadInto(snapshot, tuning, table, frame)` filling a member `PadFrame` (buttons record cleared by an index list of
  the actions it can set, `active` from a set-count instead of `Object.keys`), the 27 action names a module constant,
  `applyRadialDeadzoneTo` / `applyCurveTo` writing into members.
- **H3.** `ballistics.hitDistance` (`ballistics.ts:84-88`) for both line-of-sight rays: `!hit || distance > D - 0.2`
  equals `hitDistance(eye, head, mask) > D - 0.2` (no hit returns D). `pickTakedownInto(i, out): boolean` and
  `assistPlanInto` write a member scratch plan with its own `victimTo` buffer (`victimTo` set to the buffer or null);
  the offer is one member object `{ e, plan, lethalOnly }` reused; `start()` copies the offered plan into a member
  `activePlan` (own buffer) before mutating `approach`, so the active takedown never aliases the scan's scratch.
- **H4.** `carryStep`: an index loop with the same first-match rule. Ring: `refreshRing` updates a member ring in place
  (guns' loaded / reserve, gadgets' counts) and rebuilds (allocates) only when its shape changes: slot count, a gun's
  index or name, or the gadget list. The HUD's content compare already draws in-place changes; fix its comment
  (`gadgetWheel.ts:75` "rebuilt every step") and `gadgetSystem.ts:81`.
- **H5.** `hyp3` for `:21-22`; `:28` inline `Math.sqrt(q0*q0 + q1*q1 + q2*q2 + q3*q3)`. No new helper in
  `src/core/mathx.ts` (a wire path: see the PROTOCOL note).
- **H10.** One member `RigPose` per avatar, every field the literal sets reassigned each frame in the same order, and
  every field a consumer writes into it reset each frame (found: `TeamPoser.begin` adds `p.sway`, which the literal
  never sets, `src/anim/clips/team.ts:623-627`; `moveTuneBegin` writes `tumble`, `crouch`, `traverseT`,
  `src/anim/moveTune.ts:424-427`; the builder greps every consumer and lists each field). A member empty move pose
  reset per frame (`resetMovePose(out)` beside `emptyMovePose` in `moveState.ts`), `unpackAttachSubInto(sub, out)`, a
  numeric pipe key (`pipe * 4 + to`) in place of the string, a member vent record, an index loop for `gp`. Host and
  client keep one `TeamMate` per remote / avatar (refreshed in place, the array refilled by index; Map iteration
  replaced by an array mirror if the test shows iterator garbage); `TeamController` uses a module empty array, index
  loops, one member offer object with all six fields set each time (`toss` / `hang` / `rope` set to `undefined`, not
  false, where the literal omitted them), a member apex, and member override objects per shape (each field reassigned,
  omitted fields set to `undefined`; overrides are compared by identity only against their owners' own objects:
  `gameState.ts:2840`, `:2905`, `:3102`, `opticSystem.ts:112-125`, `bodyCarry.ts:206`).

## Claims
```claims
files:
  - docs/player-hygiene/**
  - src/player/playerController.ts
  - src/player/traversal.ts
  - src/player/moveState.ts
  - src/player/characterRig.ts
  - src/input/gamepadSource.ts
  - src/input/gamepadMapping.ts
  - src/input/stickMath.ts
  - src/game/takedown.ts
  - src/game/takedownController.ts
  - src/game/gadgetSystem.ts
  - src/game/selectionWheel.ts
  - src/game/teamController.ts
  - src/ui/hud/gadgetWheel.ts
  - src/ui/screens/controlsScreen.ts
  - src/net/remoteAvatar.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/protocol.ts
  - src/operators/lab/retarget.ts
  - src/anim/mocap.ts
  - tests/playerStepAlloc.test.ts
  - tests/padPollAlloc.test.ts
  - tests/takedownAlloc.test.ts
  - tests/wheelRingAlloc.test.ts
  - tests/partnerAlloc.test.ts
  - tests/fixtures/player-hygiene-*.json
  - tests/animFixPass.test.ts
  - tests/mocapRunFeet.test.ts
  - tests/mocapCrouch.test.ts
  - tests/mocapPlayer.test.ts
  - tests/coopWalkFixes.test.ts
  - tests/hangDownTakedown.test.ts
maps: none
protocol: none
save: none
```
Wire: no message or field changes. S5 touches `src/net/` and `src/player/moveState.ts`, both wire paths
(`scripts/merge-train.mjs:325-338`: every file under `src/net/` plus each module `protocol.ts` imports, decided per
file with no content check), so its train bumps `PROTOCOL_VERSION`; a comment-only protocol.ts change alone would too
(BRIEF A5). S1-S4 and S6 touch no wire path; builders must not add helpers to `src/core/mathx.ts` or
`src/player/moveState.ts` outside S5.

## Slices
Each slice: its own branch `feature/player-hygiene-s<n>` in its own worktree, one PR, one changelog fragment
`changes/feature-player-hygiene-s<n>.md`. Every code slice (S1-S5; S6 is exempt, `retarget.ts` may move ~1e-16, A4) starts with the parity record: a commit that
adds the slice's golden-trace test on unchanged master code and its fixture. The `...Into` vs wrapper comparisons in S2-S4
compare the code with itself once the wrappers delegate, so their parity commit records sweeps from the unchanged master
`mapPad`, `pickTakedown` + `assistPlan` and `buildWheel` into `tests/fixtures/player-hygiene-s<n>.json` and the
refactored forms are checked against those fixtures (float64 bit patterns hashed as in
`tests/helpers/animSkeletonIdentity.ts`), then the refactor commit; the test file and fixture do not change in between.

**S1 Player step and traversal (Opus).** H2 player half: `playerController.ts` and `traversal.ts` as designed.
`tests/playerStepAlloc.test.ts`: (a) golden trace on real Havok (NullEngine scene as `tests/marlowStaleSupport.test.ts`):
walk, run, crouch under a low ceiling and try to stand, step off a ledge (air steps), a ramp (slope projection), a
kinematic override; position, velocity, yaw, grounded per step; (b) `bytesPerCall` on `fixedUpdate` over the same
states with the character controller and physics engine swapped for no-allocation stubs after construction (BRIEF A2),
goal <= `HEAP_NUMBER`; (c) the traversal probe and a committed-move step through a minimal fake player and stub engine,
same goal (if the fake grows past ~80 lines, (c) measures `probe` only and the report says so).
- Files: `src/player/playerController.ts`, `src/player/traversal.ts`, `tests/playerStepAlloc.test.ts`,
  `tests/fixtures/player-hygiene-s1.json`. Est. lines: ~120 src + ~330 tests.
- Checks: `npm run typecheck:fast`; vitest `tests/playerStepAlloc.test.ts`, `tests/marlowStaleSupport.test.ts`,
  `tests/crouchStrafe.test.ts`, `tests/playerTargetTeleport.test.ts`, `tests/mocapSimParity.test.ts`. e2e affected
  (`src/player/traversal`: e2e-move, e2e-anim, e2e-stealth, e2e-clip, e2e-traverse) plus requested e2e-coop +
  e2e-netmove (RULES checker gate for `src/player`).
- Done looks like: trace identical before / after; reading <= 16 B per step in every state; no `new Vector3`,
  `.add(`, `.scale(`, `.cross(`, literal or closure left on a per-step line of the two files.
- Flag: none (G355 fix).

**S2 Pad poll (Opus: a runtime input hot-path rewrite, RULES "A job").** H2 pad half as designed. `tests/padPollAlloc.test.ts`: `mapPadInto` vs
`mapPad` equal over a sweep of buttons, axes, dead zones, curves and invert (every field, `toBe`); `GamepadSource.poll`
with a stubbed `window` / `navigator.getGamepads` returning a fixed array (A2), the hook and capture paths off:
`bytesPerCall` <= `HEAP_NUMBER`; the same `InputState` results as a recorded run.
- Files: `src/input/gamepadSource.ts`, `src/input/gamepadMapping.ts`, `src/input/stickMath.ts`,
  `tests/padPollAlloc.test.ts`, `tests/fixtures/player-hygiene-s2.json`. Est. lines: ~110 src + ~200 tests.
- Checks: typecheck; vitest `tests/padPollAlloc.test.ts`, `tests/input.test.ts`, every test importing `stickMath`.
  e2e affected (`src/input/`: e2e-pad, e2e-mouse, e2e-move, e2e-menus).
- Done looks like: equal frames; reading <= 16 B per poll; `mapPad` still answers `tests/input.test.ts` unchanged.
- Flag: none.

**S3 Takedown scan and carry pick (Opus).** H3 and the H4 carry half as designed. `tests/takedownAlloc.test.ts`:
`pickTakedownInto` / `assistPlanInto` vs the wrappers over a grid of attacker states, offsets, yaws and wall / window
inputs (every plan field, `toBe`); `TakedownController.fixedUpdate` on a fake game (as `tests/coopWalkFixes.test.ts:136`)
with 3 victims in reach and a stub ballistics: `bytesPerCall` <= `HEAP_NUMBER` for the scan and for a carry wait; a
started takedown keeps its plan when the next scan would overwrite the scratch (the alias case).
- Files: `src/game/takedown.ts`, `src/game/takedownController.ts`, `tests/takedownAlloc.test.ts`,
  `tests/fixtures/player-hygiene-s3.json`. Est. lines: ~170
  src + ~260 tests.
- Checks: typecheck; vitest `tests/takedownAlloc.test.ts`, `tests/coopWalkFixes.test.ts`,
  `tests/hangDownTakedown.test.ts`, `tests/animN4dKill.test.ts`, `tests/bunkerMap.test.ts`. e2e affected (`src/game/`:
  e2e-gadgets, e2e-tactics, e2e-takedown, e2e-park) plus requested e2e-coop + e2e-netmove.
- Done looks like: plans equal; readings <= 16 B; no `ballistics.ray` left in the offer scan.
- Flag: none.

**S4 Wheel ring (Sonnet, strict brief).** H4 ring half as designed, plus the `gadgetSystem.ts:71` "time slows" comment
(G181) and the two "rebuilt every step" comments. `tests/wheelRingAlloc.test.ts`: the in-place ring equals
`buildWheel` of the same loadout after ammo, reserve and count changes and after a gun is added or removed;
`bytesPerCall` on the open wheel's step <= `HEAP_NUMBER` when nothing changes shape.
- Files: `src/game/gadgetSystem.ts`, `src/game/selectionWheel.ts`, `src/ui/hud/gadgetWheel.ts` (comment),
  `tests/wheelRingAlloc.test.ts`, `tests/fixtures/player-hygiene-s4.json`. Est. lines: ~70 src + ~150 tests.
- Checks: typecheck; vitest `tests/wheelRingAlloc.test.ts`, `tests/selectionWheel.test.ts`. e2e affected (`src/game/`
  and `src/ui/` suites) plus requested e2e-coop + e2e-netmove.
- Done looks like: ring contents identical every step; reading <= 16 B; the wheel draws ammo changes live as today.
- Flag: none.

**S5 Partner and team moves (Opus; two independent Opus checkers).** H10 as designed, the `remoteAvatar.ts:158-159`
comment, and the `protocol.ts:38` comment to G308 (only if PR #317 has not already rewritten it, BRIEF A5).
`tests/partnerAlloc.test.ts`: `unpackAttachSubInto` / `resetMovePose` equal the allocating forms; `TeamController`
idle and running steps on a fake game (as `tests/teamClimb.test.ts:112`) with 1 and 3 mates: same offers, prompts and
overrides as a golden trace, `bytesPerCall` <= `HEAP_NUMBER`; host and client `teamMates()` readings <= 16 B (fake
remotes); the partner pose: the pose fields handed to `rig.animate` each frame over a recorded partner sequence
(free walk, wall, ladder with a pipe change, vent exit, team brace) hashed against the fixture, and a reused pose with a
team brace followed by a free frame equals a fresh literal (the `sway` case). If `RemoteAvatar` cannot be built in
node, the builder extracts the pose fill into a pure function in `remoteAvatar.ts` and tests that.
- Files: `src/net/remoteAvatar.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/protocol.ts` (comment),
  `src/game/teamController.ts`, `src/player/moveState.ts`, `tests/partnerAlloc.test.ts`,
  `tests/fixtures/player-hygiene-s5.json`. Est. lines: ~250 src + ~380 tests.
- Checks: typecheck; vitest `tests/partnerAlloc.test.ts`, `tests/teamClimb.test.ts`, `tests/hangDown.test.ts`,
  `tests/hostageGait.test.ts`, `tests/doorPeekParity.test.ts`, `tests/remoteAvatarSeed.test.ts`,
  `tests/animSkeletonIdentity.test.ts`. e2e affected (`src/net/remoteAvatar`: e2e-coop, e2e-netmove, e2e-ctcourse;
  `src/game/team`: GAME + e2e-coop).
- Done looks like: traces and pose hashes identical; readings <= 16 B; partner and team moves look and behave as today.
- Flag: none. Depends on: PR #317 (coop4, FOLDED J4) merged first (it edits 5 of the 6 S5 code files, all but `moveState.ts`; its rewrite of `protocol.ts:38` still settles S9); line numbers
  re-found after it.

**S6 Operator Lab and comment fixes (Sonnet, strict brief).** H5 as designed; the comments at
`controlsScreen.ts:59` (Menu / Start or Esc cancels, G22), `characterRig.ts:2901` (drop "lean-out arc (M16 ...)":
describe the current turned-body case, or mark it history), and the moved-doc paths listed above (only paths to files
J1 moved change; `animFixPass.test.ts:14` `OUT` becomes `docs/archive/anim-fix-pass/before/numbers.md`). Every changed
line is a comment or a doc path string, except `retarget.ts:21-28`.
- Files: `src/operators/lab/retarget.ts`, `src/ui/screens/controlsScreen.ts`, `src/player/characterRig.ts`,
  `src/anim/mocap.ts`, `tests/animFixPass.test.ts`, `tests/mocapRunFeet.test.ts`, `tests/mocapCrouch.test.ts`,
  `tests/mocapPlayer.test.ts`. Est. lines: ~30.
- Checks: typecheck; vitest `tests/operatorLab.test.ts`, `tests/operatorsRuntime.test.ts` and the four touched test
  files; `grep -rn "Math.hypot" src/operators` empty; every new path exists (`test -e`). e2e: the affected set runs by
  itself (src/ui, src/player, src/anim, src/operators); the lead also requests e2e-coop + e2e-netmove for the
  `characterRig.ts` comment (RULES test tiers), no waiver label.
- Done looks like: no `Math.hypot` in `src/operators`; no stale path or fact in the listed lines; unit tests green.
- Flag: none. Depends on: J1 PR #437 merged (the archive moves exist on master).

| Slice | Model | Est. lines | Depends on | Runs with |
| --- | --- | --- | --- | --- |
| S1 | Opus | ~450 | - | S2, S3, S4 now |
| S2 | Opus | ~310 | - | S1, S3, S4 |
| S3 | Opus | ~430 | - | S1, S2, S4 |
| S4 | Sonnet | ~220 | - | S1, S2, S3 |
| S5 | Opus | ~630 | #317 merged | any |
| S6 | Sonnet | ~30 | #437 merged | any |
No two slices share a file. Small slices may ride one batch PR (RULES "A job"), keeping their parity commits.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| none: fixes to shipped features with no behaviour change (G355) | - | Night Shift \| Player Build | - | - |

## Walk items
- None for Michael: nothing should look or feel different. The orchestrator's walk card may carry one line, "Play,
  Marlow Yard in co-op: moving, takedowns, the wheel and team moves feel exactly as before". No look video (no
  animation change; S5 proves the partner pose bit-identical in tests).

## Risks and open questions
- A reused object read later as if it were fresh (aliasing): the takedown active plan (S3 copies it), the traversal hint
  (consumed in the controller), team offers and overrides (identity checks only against owners' own objects), the
  partner pose (a consumer-written field surviving a frame: S5 lists every field and tests the `sway` case).
- Measured readings depend on V8 tiering: `allocPerCall` forces synchronous tier-up; a stub that allocates by itself
  hides nothing (the reading rises) but must be checked once with `ALLOC_TRACE=1`.
- Overlap: PR #317 (J4) edits `coopHost.ts`, `coopClient.ts`, `remoteAvatar.ts`, `teamController.ts`, `protocol.ts`,
  `characterRig.ts`: S5 waits for it; S6's one-line `characterRig.ts` comment may need a trivial rebase. Gate order
  with J19 (origin/feature/player-batch-j19 PLAN L303-311) and J15: S1 lands before J19 S6 (`traversal.ts:205-235`; J19 S6
  deletes the hop at :218-227); S3 lands before J19 S1 and J15 (`takedown.ts`, `takedownController.ts`); S2 lands before
  J19 S6 too (both edit `gamepadSource.ts:143-150`, the action-name list with 'dash'). S6 shares `characterRig.ts`,
  `mocap.ts`, `animFixPass.test.ts` with J19, and S5 shares `coopHost`, `coopClient`, `protocol` with J19, J15, J24 and
  map-ready: these merge in train order, the later branch rebased.
- Golden traces on real Havok are deterministic in one process; if a trace is not stable across runs on unchanged
  code, the slice records positions to 1e-9 instead of bit patterns and says so.
- Needs Michael: nothing.
