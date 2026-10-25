status: claimed Night Shift | Cloud Builder 2 2026-10-25T13:01Z

# Brief: player-hygiene S1 - Player step and traversal make no per-step garbage, behaviour bit-identical (Player Build)

Lead: Night Shift | Player Build, 2026-10-25. Opus builder. Job J6 player-hygiene, slice S1 (BRIEF row H2, the player
half). Hot-path allocation cleanup in two files; nothing may play differently. Unit tests only.

## Read first
- Plan: `git show origin/feature/player-hygiene:docs/player-hygiene/PLAN.md` ("How it works today" H2, "Design" H2,
  "Slices" S1). Brief: `git show origin/feature/player-hygiene:docs/player-hygiene/BRIEF.md` (A1 the 16 B goal, A2
  Babylon / Havok internals out of the claim, A3 allocations in other modules stay for J21).
- `tests/helpers/allocPerCall.ts` (`bytesPerCall`, `HEAP_NUMBER` = 16, `sink`; the measured loop must not allocate).
- `tests/marlowStaleSupport.test.ts` (real Havok in a NullEngine scene: copy its setup).

## Base and branch
- Base `origin/feature/player-hygiene-s1` at `b81c4945bc19a337010b3da31d4d206573944e1c` (master train 96, #439; the
  branch exists with no own commits). Continue that branch; push `origin feature/player-hygiene-s1` only (fast-forward,
  no force). No master merge, no rebase, no other branch. `npm ci` once.
- Why not `feature/player-hygiene` (2d4b290b): the remote S1 branch already exists at b81c4945 (a push from 2d4b290b
  would need a force). Both files are byte-identical on 2148ec96, b81c4945 and origin/master d6a04cee
  (`git diff 2148ec969 origin/master -- src/player/playerController.ts src/player/traversal.ts` is empty), so every
  line number below holds. The plan docs are not on this branch: read them with `git show` as above.

## Files (only these)
- `src/player/playerController.ts`
- `src/player/traversal.ts`
- `tests/playerStepAlloc.test.ts` (new)
- `tests/fixtures/player-hygiene-s1.json` (new, written by the test)
- `changes/feature-player-hygiene-s1.md` (new fragment, `changes/README.md`)
Nothing else. Not `src/player/movement.ts`, `src/world/anchors.ts`, `src/core/mathx.ts`, `src/player/moveState.ts` (S5
only), `src/player/attachController.ts`. An allocation found in another module goes in the report (A3), not fixed.
Overlap check: `feature/mixamo-i2` (b62a8313), `feature/mixamo-retarget` (3754df04) and `-m2`..`-m5` touch neither
file; `feature/player-batch-j19` S6 will later edit `traversal.ts:205-235` (gate order: S1 lands first, it rebases).

## What is there now (b81c4945; re-found)
`src/player/playerController.ts`:
- `:88-89` module `UP`, `DOWN`. `:201` `private support: CharacterSurfaceInfo | null`; `:209` member `tmp` (the
  desired velocity); `:828-830` `get onGroundSupport()` returns `this.support` (no reader in `src`).
- `:250-252` `syncFeet()`: `subtractToRef(new Vector3(0, this.height / 2, 0), this.pos)` - runs EVERY step (`:488`,
  `:687`, `:808`); not listed in PLAN but on the per-step path: fix it too.
- `:459-466` `hasHeadroom()`: `this.pos.add(new Vector3(...))`, `top.add(new Vector3(...))`, a query literal and
  `PhysicsEngine.raycast` (a new `PhysicsRaycastResult`); called from `applyCrouch` `:748` every step while crouched
  wanting to stand under a ceiling.
- `:485-486` kinematic step: `ov.kinematic.add(new Vector3(0, this.height / 2 + 0.02, 0))`, `Vector3.Zero()`.
- `:628` `this.support = this.cc.checkSupport(dt, DOWN)` (Babylon builds a fresh info + 3 vectors, then
  `checkSupportToRef`, which resets every field: `node_modules/@babylonjs/core/Physics/v2/characterController.js:1101-1170`).
  `:631` may set `support.supportedState = UNSUPPORTED` (the stale-support rule).
- `:638` `this.cc.calculateMovement(dt, this.forwardVec(), ...)`: Babylon's wrapper is
  `const result = new Vector3(0, 0, 0); this.calculateMovementToRef(..., result); return result;`
  (`characterController.js:1755-1759`); the ToRef form returns false WITHOUT writing when forward x up is ~0
  (`:1698-1703`). `forwardVec()` `:814-816` returns a new vector.
- `:643-647` slope projection: `const c = n.cross(out); out = c.cross(UP).scaleInPlace(horiz);` (`cross` =
  `Vector3.CrossToRef(this, other, new Vector3())`; `CrossToRef` reads into locals, then writes: alias-safe).
- `:650` `out.subtractInPlace(support.averageSurfaceNormal.scale(PlayerController.stickForce))`.
- `:676` air step `out = new Vector3(cur.x + (tx - cur.x) * k, cur.y, cur.z + (tz - cur.z) * k).addInPlace(GRAVITY.scale(dt))`.
- `:683` `this.cc.setVelocity(out)` (Babylon copies: `_velocity.copyFrom`), `:684` `integrate`.
- Cold, leave as is: constructor `:223`, `teleport` `:371-372`.
`src/player/traversal.ts`:
- `:15` module query `Q`. `:81` `private kin = new Vector3()` (the committed path's feet, written by `path()` `:530-532`).
- `:203-266` `probe()`: `:209` `for (const h of [0.25, 0.6, 1.0, 1.4])` (array literal + iterator); result literals
  with `new Vector3` ends at `:225` (hop), `:233` (drop), `:264-265` (vault / mantle); `:262`
  `pickTraversal({ height, depth, landingClear, topClear })` literal (not in PLAN, same row: fix it).
- `:269-288` `windowProbe()`: `:270` `nearestInReach(..., ['window'])` (array literal; `nearestInReach` itself
  allocates: `src/world/anchors.ts:785-815`, A3, out of scope), `:273` template key `` `glass:${w.id}` ``, `:287` result
  literal.
- `:291-297` `probeDir()` returns `{ x, z }` literals.
- `:333` committed move: `c.override = { kinematic: this.kin, yaw: Math.atan2(...), crouch: ... }` every step.
- `:410-418` the probe tick (every 0.2 s and on a press): `this.hint = this.probe(c.pos, d.x, d.z)`; `:437-452` the
  commit copies the hint (`:447` `this.to.copyFrom(this.hint.end)`) then sets `hint = null`; `:440` the break key.
- Hint readers outside: `src/game/gameState.ts:1929` (sets null), `:3428`, `:3508`, `:3518` (read in the same frame).
  Override identity is only compared by owners against their own objects (`gameState.ts:2840`, `:2905`, `:3102`,
  `opticSystem.ts:112-125`, `bodyCarry.ts:206`, `takedownController.ts:753`); nobody writes into a traversal override.

## Build (behaviour bit-identical: same arithmetic, same order)
Commit 1 (parity record, no src change): the test below and its fixture recorded on the UNCHANGED code
(`PH_S1_WRITE=1 npx vitest run tests/playerStepAlloc.test.ts`), then a plain run passes against it. Commit 2: the
refactor. The test file and fixture do not change between the two commits (if the refactor seems to need a fixture
change, it is not bit-identical: fix the code).

`playerController.ts` (members, all `private readonly`, names free):
1. `syncFeet`: a member half-height vector set `(0, this.height / 2, 0)` then `subtractToRef` into `this.pos`.
2. `hasHeadroom`: `const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null; if (!eng) return true;` (old:
   no engine = no hit = headroom), member `top` = `pos + (0, height, 0)` via `addToRef` with a member offset, member
   `end` = `top + (0, MOVEMENT.standHeight - this.height + 0.05, 0)` via `addToRef`, `eng.raycastToRef(top, end,
   memberResult, memberQuery)` with a member query `{ membership: G.PLAYER, collideWith: G.STATIC }` (its own object;
   do not share `stepQuery`), `return !memberResult.hasHit`. (Havok's `raycast` resets the result: the same as fresh.)
3. Kinematic step: member `kinPos` = `ov.kinematic + (0, this.height / 2 + 0.02, 0)` via `addToRef` with a member
   offset; `setPosition(kinPos)`; `setVelocity(memberZero)` (a member `new Vector3()` never written).
4. Support: a member `CharacterSurfaceInfo` `{ isSurfaceDynamic: false, supportedState:
   CharacterSupportedState.UNSUPPORTED, averageSurfaceNormal: new Vector3(), averageSurfaceVelocity: new Vector3(),
   averageAngularSurfaceVelocity: new Vector3() }`; each step `this.cc.checkSupportToRef(dt, DOWN, info)` then
   `const support = (this.support = info)` (keeps `onGroundSupport` null before the first free step).
5. Movement: member `move` vector. Grounded: `move.setAll(0)` then `this.cc.calculateMovementToRef(dt,
   this.forwardVec(), n, cur, sv, desired, UP, move)` (ignore its boolean, as the wrapper did); `out = move`.
   `forwardVec()` sets and returns a member vector. Slope: `Vector3.CrossToRef(n, out, memberCross);
   Vector3.CrossToRef(memberCross, UP, out); out.scaleInPlace(horiz);`. Stick force: `n.scaleToRef(
   PlayerController.stickForce, memberStick); out.subtractInPlace(memberStick)`. Air: `GRAVITY.scaleToRef(dt,
   memberGrav); out = move.set(cur.x + (tx - cur.x) * k, cur.y, cur.z + (tz - cur.z) * k).addInPlace(memberGrav)`.
   `cur` (`getVelocity()`) is read before `move` is written in both branches; keep that order.
`traversal.ts`:
6. Module constants: `const PROBE_HEIGHTS = [0.25, 0.6, 1.0, 1.4] as const;` (index loop, same order) and
   `const WINDOW_KINDS: readonly AnchorKind[] = ['window'];` (`import type { AnchorKind }` from `../world/anchors`).
7. One member probe result `{ kind: 'none', front: 0, height: 0, depth: 0, end: new Vector3() }` typed
   `TraverseProbe`; every return site that returned a literal sets all four scalars and `end.set(...)` with the exact
   expressions of today, then returns the member. `probe` and `windowProbe` share it (windowProbe returning it ends the
   probe, so no overwrite). Safe with one object: the hint is copied at commit (`:447`) and read by the HUD in the same
   frame.
8. A member `TraversalProbe` input for `pickTraversal`, its four fields reassigned before the call.
9. Glass key: `private readonly glassKeys = new WeakMap<WindowAnchor, string>()` and `glassKey(w)` building
   `` `glass:${w.id}` `` once per anchor; use it at `:273` (only when `this.breakables` is set: `?.` must still skip the
   lookup when null, as the template skipped) and `:440`. Leave `:124` (kick-through, cold).
10. `probeDir()` writes a member `{ x: 0, z: 0 }` and returns it (both branches, same expressions).
11. The committed override: a member `MoveOverride` `{ kinematic: this.kin, yaw: 0, crouch: false }` declared after
   `kin`; each step reassign `kinematic = this.kin`, `yaw = Math.atan2(this.dir.x, this.dir.z)`, `crouch = ...` (same
   expression), then `c.override = member`. No other field set (the literal had none).
12. Comments in the house style with a `(player-hygiene S1)` tag on each member group.

## Test `tests/playerStepAlloc.test.ts` (new)
The lead started this test on the desktop (uncommitted, not visible here; it was well along). Rebuild it to this shape:
- Header comment: (a) (b) (c) below, the fixture path, and that `PH_S1_WRITE=1` rewrites the fixture (only ever on the
  pre-refactor code).
- A cyrb53 `Hasher` over each value's float64 bit pattern (a `Float64Array(1)` + `Uint32Array` view; normalise -0 to
  +0), as `tests/helpers/animSkeletonIdentity.ts`. Fixture shape `{ trace: {name: {steps, hash, last}}, probe: {name:
  row | null}, commit: {name: {steps, hash, last}} }`; compare `last`, `steps`, `hash` per name (`last` makes a
  mismatch readable). Write the fixture in `afterAll` when `PH_S1_WRITE`.
- (a) Golden trace on real Havok: `HavokPhysics({ wasmBinary })` from `node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm`,
  `NullEngine`, `Scene`, `HavokPlugin(false, hk)`, `setTimeStep(1/60)`, `scene.enablePhysics(GRAVITY, plugin)`. Static
  boxes (`PhysicsAggregate`, mass 0, `filterMembershipMask = G.STATIC`): a floor; a low ceiling (underside 1.4 m: crouched
  fits, standing does not); a 1 m platform to step off; a ~14 deg ramp. One fixed step = `c.fixedUpdate(dt, input,
  camYaw)` then the engine's `_step(dt)`. Per step hash `pos.xyz, cc.getVelocity().xyz, yaw, grounded, crouched,
  speed`. Cases, each on a fresh `PlayerController(scene, spawn, yaw)`, disposed after: walk -> run -> diagonal turn ->
  stop; crouch press under the ceiling, walk, press again (wants to stand, blocked: still crouched), idle, walk out
  (stands); step off the ledge (some steps not grounded, then landed); up the ramp (feet end above 0.5 m); a kinematic
  override (`{ kinematic, yaw: 0.6, crouch: true }`, `kinematic` moved along an arc for 30 steps) then free. Add the
  sanity `expect`s that prove each case reaches its state (e.g. still crouched under the ceiling).
- (b) `bytesPerCall` on `fixedUpdate` (A2): build a controller on the real scene, then swap `c.cc` for a stub
  character controller (no allocation; both `checkSupport` / `checkSupportToRef` and `calculateMovement` /
  `calculateMovementToRef`, `getPosition`, `setPosition` and `setVelocity` copying into its own vectors,
  `getVelocity`, `integrate` a no-op, `shape` filter fields, `acceleration` / `maxAcceleration` / `maxSlopeCosine`,
  `setShapeOptions`, `dispose`; a `supported` flag, a support `normal` and a `lift` added to the movement's y for the
  ramp) and `c.scene` for `{ getPhysicsEngine: () => boxWorld }`, where `boxWorld` answers `raycastToRef(from, to,
  result, query)` against axis-aligned boxes with no allocation (`result.reset(from, to)`, slab test,
  `setHitData(normal, point)`, `setHitDistance`) and also `raycast(from, to)` returning one reused result (so the
  pre-refactor reading is the caller's bytes). States: walk, run, ramp (tilted normal + lift), air (`supported`
  false), crouched under a ceiling box wanting to stand (assert still crouched), kinematic override. `{ n: 1000, warm:
  20000 }`; log the readings with `console.info`. Assert every reading `<= HEAP_NUMBER` only after the refactor:
  detect it the way `tests/takedownAlloc.test.ts` on `feature/player-hygiene-s3` does (a flag the test can read without
  changing between commits), e.g. `const REFACTORED = 'glassKey' in TraversalController.prototype` (or any member the
  refactor adds that you name here and keep). Before the refactor the readings are only logged.
- (c) Traversal through a fake player (`{ controller, pose, alive: true, ads: false }` cast to `Player`; controller
  fields `pos`, `wishDir`, `yaw`, `speed`, `teleports`, `landings`, `lastLanding`, `override`, `landT`, `grounded`,
  `crouched`, `rollHeld`, `gear`, `vel`, `motion.carry`, `setCrouchToggle`, `clearCrouchToggle`, `takeRollHold`) and
  `new TraversalController({ getPhysicsEngine: () => boxWorld } as unknown as Scene, player, new TraversalAnchors())`.
  Probe cases along +z: vault (0.9 m wall, 0.25 deep), mantle (1.2 m box, 2 m deep), drop (2 m down, speed 4), hop
  (1.6 m gap at a run), nothing (open floor). Record each `probe()` as `[kind, front, height, depth, end.x, end.y,
  end.z]` (or null). A window case: `anchors.add<WindowAnchor>({ kind: 'window', ..., breakable: false, open: false })`
  with a fake `breakables` whose `isOpen` records its key and returns true: the probe's row, `hintWindow` is the anchor,
  the key asked is `glass:<id>`; a jump press through it opens `glass:<id>` and the pose is `windowVault`. Committed
  moves (vault, mantle, drop) from a jump press: hash every step's override (`kinematic.xyz`, `yaw`, `crouch`) and pose
  (`traverse` index, `traverseT`, `traverseH`, `traverseD`) until it ends (`kind` back to `none`, override null).
  Readings (same `REFACTORED` gate): `probe` per case, `probeDir` (facing and stick; a private call through a cast),
  and a committed step held mid-move (`tr.t = 0` before each `fixedUpdate(dt, false, false)`). If the fake grows past
  ~80 lines, measure `probe` only and say so in the report (PLAN S1).
- If a trace is not stable across two runs on the unchanged code, record positions rounded to 1e-9 instead of bit
  patterns and say so in the report (PLAN Risks).

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck`;
`npx eslint src/player/playerController.ts src/player/traversal.ts tests/playerStepAlloc.test.ts`;
`npx vitest run tests/playerStepAlloc.test.ts tests/marlowStaleSupport.test.ts tests/crouchStrafe.test.ts tests/playerTargetTeleport.test.ts tests/mocapSimParity.test.ts tests/player.test.ts tests/wallController.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` on a small box). Run `tests/playerStepAlloc.test.ts` on commit 1 (record, then a plain pass) and
again on commit 2.

## Rules
- CLAUDE.md hot paths: no closures, iterators, literals or temporary vectors on a per-step line; `hyp2` / `hyp3`, never
  `Math.hypot`. Babylon only through `src/core/babylon.ts` (`CharacterSupportedState`, `PhysicsRaycastResult` are already imported).
  `import type` for type-only imports. Strict TS (`noUncheckedIndexedAccess`).
- No wire change, no `PROTOCOL_VERSION` change, no flag (G355: a fix to a shipped feature).
- If an allocation is left in a state after both files are clean, find it (`ALLOC_TRACE=1`, narrowing the measured
  call); if it is outside the two files (A3, e.g. `MotionDriver`, `AnalogGear`, `tuneSim`), do not fix it: list file:line
  and bytes in the report, and for that state assert `<=` the measured ceiling rounded up to a multiple of 16 with a
  comment naming the allocator. Everything inside the two files must read clean.

## Done when
- Commit 1 (test + fixture on unchanged code) then commit 2 (refactor); test and fixture identical in both.
- Traces, probe rows and committed paths equal the fixture after the refactor; every reading `<= HEAP_NUMBER` (or the
  documented outside-allocator ceiling above).
- `grep -nE "new Vector3|\.add\(|\.scale\(|\.cross\(|Vector3\.Zero\(" src/player/playerController.ts src/player/traversal.ts`
  shows only member initialisers, the constructor, `teleport`, and cold paths you name in the report.
- tsc and eslint clean; the vitest files above pass; `git diff --stat b81c4945b` lists only the five files above.
- `changes/feature-player-hygiene-s1.md`: line 1 `# Player step and traversal make no per-step garbage`, line 2
  `kind: patch`, one or two `- ` bullets (no behaviour change; the movement step, the obstacle probe and the committed
  vault / mantle / drop reuse their objects; proved bit-identical by a golden trace).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/player-hygiene-s1`.
  Then append `## Report` here (what changed with file:line, test names and counts, the readings per state before and
  after, any outside allocator, deviations) and set line 1 to `status: done feature/player-hygiene-s1 <sha>`; commit,
  push `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.
