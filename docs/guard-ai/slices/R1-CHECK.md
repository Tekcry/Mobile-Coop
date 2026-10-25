# R1 check: allocation-free sight rays

Checker: fresh Opus. Commit 9008f458 on master 6e8a450b, `git diff 6e8a450b 9008f458`. Brief: origin/feature/guard-cap
`docs/guard-cap/briefs/R1.md`.

## Verdict: PASS

The verdicts are identical for every caller. Nothing is broken. One finding matters for the slice's stated goal (P1
below): `hitDistance` still allocates. It is not a verdict change, so it does not block, but the changelog and doc
claim "no allocation", which is not true yet.

## Results run
- vitest, `--maxWorkers=2`: perception, armour, coopPerception, glass, armourFire, armourFireWiring,
  editor/lightPreview, editor/security. 8 files, 109 tests, all pass.
- `npm run typecheck:fast`: clean. eslint on the 3 changed source and test files: clean.
- No e2e, dev server or full vitest run (laptop CPU 41% at start).

## (1) Verdicts
- `ray` and `hitDistance` share one cast (`src/weapons/ballistics.ts:83-88` vs `:115-136`): the same `res.reset()`, the
  same `q.collideWith = mask`, the same `raycastToRef`, the same query object. There is no glass or pass-through filter,
  no other pick predicate, and no back-face or start-inside difference. `ray`'s registry, prop and armour lookups never
  touch `hit` or `distance`.
- Hit: both return `Vector3.Distance(from, res.hitPoint)`, bit for bit, so `d > len - slack` is identical.
- Miss: `hitDistance` returns `Vector3.Distance(from, to)`. Babylon 9.29 `DistanceSquared` is
  `(from - to)^2` per axis, summed x+y+z. `hyp3` (`src/core/mathx.ts:9`) is `(to - eye)^2`, summed in the same order.
  Squaring a negated difference is exact, so `len` is bit-identical. The comparison `len > len - slack` is true exactly
  when slack > 0, which matches the old `!hit` = clear.
- Slack 0: confirmed it must fall back (on a miss, `len > len` is false and would read as blocked). The guard
  `b.hitDistance && slack > 0` (`src/ai/perception.ts:90`) does this. A negative or NaN slack also takes the `ray` path.
  The brief's ">= 0" was wrong. The build's "> 0" is right.
- eye == to (zero length): both paths cast the same zero-length ray. Miss: `0 > -slack` is true, the old path gave
  true. Hit: `0 > -slack` is true for both. Identical.
- Mask: `MASK.SIGHT` on both paths (`perception.ts:90-91`) and in the drone (`reconDrone.ts:180`).
- Callers (all slack > 0): `enemy.ts:1222` (0.35), `:2228` (0.3), `:2233` (0.2), `:2240` (0.2), `:2347` (0.35), all
  through `losTo` at `:2351`. Also `lightView.ts:500/503` (0.3/0.2) and `editor/security.ts:453` (SAMPLES 0.3/0.2).
- Recon drone `reconDrone.ts:180`: on a miss, `Distance(eye,to) > Distance(eye,to) - 0.3` is true; on a hit the
  distance is identical. Same verdict.

## (2) Typing
- `hitDistance?(from: P3, ...)` accepts `Ballistics.hitDistance(from: Vector3, ...)` through method bivariance. No cast
  was added.
- `Ballistics.hitDistance` does NOT work on plain `{x,y,z}`. Babylon's `Vector3.DistanceSquared` and Havok's
  `_bVecToV3WithOffset` read `_x/_y/_z`. The same was already true of `ray` (`res.reset` copyFrom, `to.clone()`), so
  nothing new is exposed.
- Every live caller passes Vector3s:
  - `enemy.ts:2350`: `losTo(eye: Vector3, to: Vector3)`, with `ctx.ballistics: Ballistics` (`:133`).
  - `lightView.ts:500/503`: `this.a`/`this.b` are `new Vector3()` (`:153-154`).
  - `editor/security.ts:453`: reached only through `securityTool.ts:282/292` with `c.pts = { eye: this.a, to: this.b }`
    (`lightView.ts:556`), which are Vector3s. The plain default `PTS` (`security.ts:428`) is used only by test doubles
    in tests/editor/security.test.ts, which are ray-only.
  - The drone: `this.eye`/`this.to` are Vector3s.

## (3) Allocation
- The slice removes the `RayHit` literal and the `clone()`/`Vector3.Up()` calls. That is the bulk of the per-call
  garbage, and the code in `hitDistance` itself is clean.
- **P1, should fix (not blocking):** `hitDistance` still allocates two Vector3s per call. `this.res.reset()`
  (`ballistics.ts:84`, and the same in `clear`, `cast`, `armouredFirst` and `ray`) calls
  `PhysicsRaycastResult.reset(from = Vector3.Zero(), to = Vector3.Zero())`
  (node_modules/@babylonjs/core/Physics/physicsRaycastResult.js:62), and the default parameters allocate on every call.
  The call is also redundant: `HavokPlugin.raycast` itself calls `raycastResult.reset(from, to)` first
  (havokPlugin.js:2274-2281), with no default parameters. Fix: drop `this.res.reset()` from the five cast methods, or
  pass `this.res.reset(from, to)`. Either one ends the two Vector3s per sight ray for every Ballistics cast. If src/weapons
  is not this slice's to touch, reword the changelog (`changes/feature-guard-ai-r1-rays.md:3`) and docs/systems/ai.md
  to say "allocate less", not "no longer allocate".
- Residual allocation inside Babylon/Havok (note only, not fixable here): `HavokPlugin.raycast` builds small arrays on
  every cast (`offsetFrom`, `offsetTo`, `hkQuery`, `[membership, collideWith]`, `[BigInt(0)]`, `[result]`) plus the
  wasm return tuples.

## (4) Editor callers
- `editor/security.ts:419` `SightRay = Parameters<typeof losClear>[0]` now carries the optional `hitDistance`. It still
  compiles (tsc clean), and the ray-only doubles still satisfy it.
- `lightView.ts:500/503` and the security tool pass the real `Ballistics`, so they now take the `hitDistance` path, not
  `ray`. Verdicts are the same, per (1).
- **P2 (doc):** `perception.ts:81` ("Test doubles and editor rays without it ... keep the `ray` path") and
  docs/systems/ai.md:35 ("else through `ray` (test doubles, editor rays, ...)") are inaccurate. The editor's rays are a
  real `Ballistics` and use `hitDistance`. Only test doubles and a slack of 0 keep `ray`.

## (5) Tests against the brief
- tests/perception.test.ts:432-473 covers everything the brief lists:
  - a double with both methods as spies, where only `hitDistance` is called, with `MASK.SIGHT`;
  - the four cases (hit before the point, hit inside the slack, hit past the point, miss), each checked against the
    ray-only verdict;
  - ray-only still works;
  - plus slack 0 keeping `ray`.
- armour and coopPerception tests are unchanged and pass.
- **P3 (polish):** there is no unit test of the drone verdict. It is one line, and the e2e suites cover the drone.
- **P4 (polish):** the test double's `ray` on a miss returns `distance: len` (`perception.test.ts:438`). That is fine,
  but a miss case with `distance: 0`, as in lightPreview.test.ts:151, would also prove the `!hit` branch ignores
  distance.

## Out of scope (as the brief says)
`takedownController.ts:313/346`, the `teamController.ts` rays and `gameState.ts:3130` still use `ray` for yes/no
tests, per player action.
