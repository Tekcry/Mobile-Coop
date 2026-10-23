# guard-render S3a: builder brief (sim-side guard head hit volume)

You are the builder for slice S3a of the Night Shift Mobile-Coop job "guard-render" (Babylon.js 9 + Havok PWA,
desktop, strict TypeScript). This brief is your whole context: follow it exactly. Line numbers are verified on
`70470c30` (the branch head this brief was written on); re-check them with `grep -n` before each edit.

## Why
Orchestrator answer M2 (`docs/guard-render/BRIEF.md`): the guard's head hit volume must come from the sim, not from the
rendered rig. Today `Enemy.frame` (render rate) copies the rig's head node into `this.head`
(`src/ai/enemy.ts:1816-1820`) and the fixed step's `syncHitboxes` puts the head sphere there
(`src/ai/enemy.ts:1760-1763`). That is gameplay reading graphics state (CLAUDE.md hard rule), and the rig's anim LOD
(far guards solve every other frame, `src/player/characterRig.ts:1703-1713`) already makes it lag. S4 (anim tiers) and
S5 (anim cost) are blocked until the head no longer depends on the pose.

## Where you work
- Worktree `C:/NightShift/Mobile-Coop-guard-render-s3a`, branch `feature/guard-render-s3a`. Nowhere else.
- Branch guard before every command that writes (files, git):
  `cd /c/NightShift/Mobile-Coop-guard-render-s3a && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-render-s3a && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-render-s3a"`
- First, once: `npm ci` (the worktree has no `node_modules`; timeout 600000 ms). Do not merge, rebase, stash, reset or
  checkout anything; work on the branch head as it is.
- Rules (CLAUDE.md "Hard rules"): Babylon only through `src/core/babylon.ts`; strict TS (`noUncheckedIndexedAccess`,
  `import type` for types); hot paths do not allocate (no closures, iterators, object literals or temporary vectors per
  step); `hyp2` / `hyp3`, never `Math.hypot`; pure logic in Babylon-free modules with Vitest tests. Docs: hyphens, never
  em dashes.

## The change

### 1. New pure module `src/ai/guardHead.ts` (Babylon-free)
- Imports only `../player/proportions` (`proportions`, `type Build`) and `import type { GuardCqMode } from
  '../game/closeQuarters'`. No `../core/babylon`, no `CharacterRig`, nothing from `src/anim` or `src/world`.
- Exports:
  - `interface GuardHeadRest` - the per-guard constants scaled for its build and height (the standing head offset above
    the feet, crouch drop / forward, lean side / drop, wall offset, held / blind pitches as offsets), built once.
  - `function guardHeadRest(height: number, build: Build): GuardHeadRest` - called once in the Enemy constructor.
    Start from the rig's own geometry: the rig's head node sits `p.neck.len + p.head.h * 0.42` above the neck joint
    (`characterRig.ts:1257`), the neck at `p.y.neck` (`proportions.ts:66-110`), so the standing head is about
    `p.y.neck + p.neck.len + p.head.h * 0.42` (= `hitVolumes(p).headY`, `proportions.ts:128-137`) plus the rig's
    rest offsets you measure (step 3). Everything scales with `height / 1.75` as `proportions` does.
  - `interface GuardHeadIn` (plain numbers, no Babylon types): `x, y, z` (feet = `Enemy.pos`), `yaw`, `crouch` (0..1),
    `speed` (m/s, `hyp2(vel.x, vel.z)`), `aim` (0..1, the same value `frame` computes), `aimPitch`, `wall` (boolean:
    `coverPose === 'high'`), `wallSide` (-1 / 0 / 1), `lean` (-1..1, the sim-eased lean, step 2), `held`
    (`GuardCqMode | null`), `heldK` (0..1, the struggle ramp), `koK` (0..1, `cq.k` in mode 'ko'), `blind` (0..1),
    `climb` (boolean).
  - `function guardHead(i: GuardHeadIn, r: GuardHeadRest, out: { x: number; y: number; z: number }): void` - writes the
    head sphere centre in world space. No allocation (a `Vector3` fits `out` structurally; the module never names the
    type).
- Model (fit the constants in step 3; add a term only when the parity test shows it is needed):
  - root-local offset `(sx, up, fwd)`: standing rest, minus the crouch drop times `crouch` (plus its forward lean),
    plus the run / dash forward lean by speed if measured > 2 cm, the wall flat-back offset when `wall`, the lean's side
    offset and drop times `lean`, and for `held` / `blind` the chest and neck pitch of the scripted pose turned about
    the chest joint (`p.y.chest`) and neck joint (`p.y.neck`): a +x pitch moves the head forward and down.
  - Held pitches per mode, copied from `GuardCq.write` / `hostage` (`src/game/closeQuarters.ts:270-330`): seized neck
    -0.5 chest -0.15; seizedLethal neck 0.35 chest 0.25; hostage neck -0.3 chest -0.12; ko blends toward neck 0.55
    chest 0.4 by `koK`; interrogate = hostage with neck -0.15 more (ignore the yaw sway and flails). All times `heldK`.
    Blind (`enemy.ts:352-355`): neck 0.45, chest 0.3, pelvis -0.06, times `blind`.
  - World: `out.x = x + sx * cos(yaw) + fwd * sin(yaw)`, `out.z = z - sx * sin(yaw) + fwd * cos(yaw)`,
    `out.y = y + up` (the rig's own root-local convention, `characterRig.ts:1947-1952`).

### 2. `src/ai/enemy.ts` (Guard AI Build's file: keep the diff small, about 30-40 lines)
- Import `guardHead, guardHeadRest, type GuardHeadIn, type GuardHeadRest` from `./guardHead`.
- Fields next to `private head = new Vector3();` (line 185): `private readonly headRest: GuardHeadRest;`,
  `private readonly headIn: GuardHeadIn = { ... }` (allocated once), `private headLean = 0;`, `private heldT = 0;`, `private blindAge = 0;`.
- Constructor, after `this.hitboxes = new Hitboxes(...)` (line 303): `this.headRest = guardHeadRest(def.height, def.build);`.
- `beginTakedown` (lines 366-378): `this.heldT = 0;`.
- Extract the `aiming` expression of `frame` (line 1782) into `private aimWeight(): number` and use it in `frame`
  (same value, same order of tests) and in the head input.
- `syncHitboxes` (lines 1760-1763) becomes `syncHitboxes(dt: number)`: for a human guard (`!this.dog`) fill
  `this.headIn` from sim state only (`pos`, `yaw`, `crouch`, `hyp2(vel.x, vel.z)`, `aimWeight()`, `aimPitch`,
  `coverPose === 'high'`, `coverWallSide`, `headLean`, `taken ? this.cq.mode : null`, the ramp
  `clamp01((heldT - this.cq.delay) * 5)`, `this.cq.mode === 'ko' ? this.cq.k : 0`, `blindT > 0 ? Math.min(1, blindAge * 6) :
  0` (`blind()` at lines 345-356 sets `blindAge = 0`; the blind branch of `update`, lines 821-831, adds `dt`), `climbing`), call `guardHead(this.headIn, this.headRest,
  this.head)`, then `this.hitboxes.sync(this.pos, this.head)` as now. Ease `headLean` toward `coverPeek` here at a rate
  that passes the transition tolerance (the rig's body lean is a spring at 24 /s, `src/anim/animGraph.ts:1334-1336`).
  Advance `heldT += dt` while `taken`. The dog keeps today's path (`this.head` from `this.dog.head`).
- The four call sites pass `dt`: lines 817, 824, 864, 870.
- `frame` (lines 1812-1820): the human branch keeps `this.rig.animate(dt, rp);` and drops
  `this.rig.headNode.computeWorldMatrix(true);` and `this.head.copyFrom(this.rig.headNode.getAbsolutePosition());`.
  The dog branch stays as it is.
- Nothing else in `enemy.ts` changes: perception's `eye()` (line 494), `center`, `aimPoint`, the brain, cover logic.

### 3. Tests (add, do not edit others)
- `tests/guardHead.test.ts` (pure, no Babylon): rotation by yaw (yaw 0, pi/2, -2.3), crouch lowers the head
  monotonically, lean moves it sideways by the sign, held / blind pitch moves it forward, scaling with height (1.6 vs
  1.95), `out` written in place (same object). Plus a table check: for each `GuardCqMode`, `new GuardCq()` after
  `seize(false, 0)`, `set(mode)`, `k = 1` and `pose(2)` gives the neck / chest x pitches your table in `guardHead.ts`
  uses (within 1e-6; flail terms excluded by picking `t` where they are 0, or compare the mode constants only).
- `tests/guardHeadParity.test.ts` (NullEngine): the sim head against the rig's head node, the parity check.
  - Setup as `tests/helpers/animSkeletonGuardIdentity.ts` (`runGuardIdentity`): `NullEngine`, `Scene`, `PartLibrary`,
    the stub `world`, `buildEnemyRig(scene, world, def, name)`, the seeded `Math.random`, `DT = 1 / 60`. Kinds: grunt,
    runner (1.74 lean), heavy (1.83 broad). Root yaw 0.7 and -2.3, root position off the origin.
  - Each frame: set the sim state, build the `RigPose` exactly as `Enemy.frame` does (lines 1786-1811: speed, localX /
    localZ, crouch, aimPitch, aim, kick 0, melee -1, wall, wallSide, lean, dash, stride, velX / velZ, traverse /
    traverseT), `rig.animate(DT, pose)`, then `rig.headNode.computeWorldMatrix(true)` and compare its absolute position
    with `guardHead(...)` of the same state. Held: `rig.emote = (_r, t) => cq.pose(t) ?? undefined` on a `GuardCq`, as
    `beginTakedown` does; blind: the emote closure of `enemy.ts:352-355` copied into the test (comment that it mirrors
    `Enemy.blind`).
  - Poses and tolerances (3D distance, metres; head sphere radius 0.115 m for the grunt):
    - T1 steady upright, max over 1 s after a 1 s settle: idle, patrol walk 1.4 m/s, run / dash 4.5 m/s, aim 1 at
      aimPitch -0.3 / 0 / 0.3, crouch idle, crouch walk 1 m/s, crouch aim: <= 0.05.
    - T2 steady posed, same sampling: wall flat-back (wallSide -1 and 1), wall lean -1 and 1, low-cover crouch lean,
      held seized / seizedLethal / hostage / ko (koK 1, crouch 1) / interrogate, blind, ladder climb: <= 0.08.
    - T3 transitions, every frame: crouch 0 -> 1 -> 0 at the sim's rate (`crouch += (want - crouch) * min(1, dt * 8)`),
      lean 0 -> 1 -> 0, seize start, release: <= 0.12, and back under the T1 / T2 bound within 0.3 s.
  - Fitting: run once with `GUARD_HEAD_PRINT=1` to print the rig head's root-local offset per pose, put the constants
    into `guardHead.ts` (1 mm rounding, each with a comment naming the pose it came from), then the assertions. If a
    pose cannot meet its bound with a reasonable term, do not loosen the bound: mark that one case `it.skip` with a
    comment giving the measured error, and report it as a doubt.
- Unit tests that must still pass unchanged: `tests/animSkeletonGuardIdentity.test.ts` (the rig is untouched),
  `tests/enemyManagerDespawn.test.ts`, `tests/hearing.test.ts`, `tests/smoothBody.test.ts`.

## Commands (only these; each with a timeout)
- `npx tsc --noEmit -p tsconfig.json`
- `npx eslint src/ai/guardHead.ts src/ai/enemy.ts tests/guardHead.test.ts tests/guardHeadParity.test.ts`
- `npx vitest run tests/guardHead.test.ts`, `npx vitest run tests/guardHeadParity.test.ts`, and the four unchanged files
  above one at a time.
- Never: `npm run check`, a full `vitest run`, `npm run build` loops, any e2e, a browser, anything headed, `npm run dev`
  / `preview` / watch.

## Commits
1. `guard-render S3a: guardHead pure sim head + unit tests` (`src/ai/guardHead.ts`, `tests/guardHead.test.ts`).
2. `guard-render S3a: guard head parity test (sim vs rig, NullEngine)` (`tests/guardHeadParity.test.ts`, constants).
3. `guard-render S3a: guard head hit volume from the sim (enemy.ts)` (`src/ai/enemy.ts`, optional comment-only line in
   `src/ai/hitboxes.ts:70-73`).
Each message ends with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. After each commit:
`git push -u origin feature/guard-render-s3a` (first) / `git push`.

## Files you touch (the full list)
- New: `src/ai/guardHead.ts`, `tests/guardHead.test.ts`, `tests/guardHeadParity.test.ts`.
- Edit: `src/ai/enemy.ts` (lines 1-41 import, ~185 fields, ~303 constructor, 345-356 `blind`, 366-378 `beginTakedown`, 809-871 `update`
  (the `heldT` / `blindAge` / `dt` lines only), 1760-1763
  `syncHitboxes`, the four calls 817 / 824 / 864 / 870, 1779-1782 `aimWeight`, 1816-1820 `frame` head copy).
- Optional, comment only: `src/ai/hitboxes.ts` lines 70-73 (the `sync` doc: guards pass the sim head).

## Do NOT touch
- `src/player/characterRig.ts`, anything in `src/anim/`, `src/player/smoothBody*.ts`, `src/world/`, `src/voxel/`.
- `src/ai/hitboxes.ts` code, `src/ai/enemyRig.ts`, `src/ai/body.ts`, `src/ai/dogModel.ts` (the dog keeps its model
  head: a doubt for the orchestrator, not this slice).
- `src/net/` (`enemyPuppet.ts:312-314` still reads its rig head on the co-op client; the host resolves hits from
  `Enemy`; no wire change, `PROTOCOL_VERSION` stays). `src/game/trainingDummy.ts`, `src/net/coopHost.ts`,
  `src/net/partnerTarget.ts` (players and dummies keep their posed heads).
- `src/game/closeQuarters.ts` (read its constants; do not export new things from it).
- Fixtures under `tests/fixtures/`, `docs/` (the job lead updates STATE.md), `CHANGELOG.md`, `package.json`.

## e2e the job lead will run later (not you)
On the pushed head, via Character Build (laptop): `e2e-stealth-ai`, `e2e-takedown` (seize, hostage, KO head),
`e2e-sectorops` (kills with `part: 'head'`), `e2e-combat` (headshots on the dummy: unchanged path, a regression check),
`e2e-enemies` (heavy face plate head hits), `e2e-coop` (host-resolved hits on guards), `e2e-ctcourse` (Marlow Yard).

## Report (final message)
Commit shas and messages; files changed with line counts; the printed offsets table and the constants you chose; the
worst error per pose group (T1 / T2 / T3) from the parity test; the output lines of each test run and of `tsc` /
`eslint`; doubts (poses near or over a bound, the dog, the co-op client puppet, anything that read the old `this.head`).
