status: open

# Brief: player-hygiene S3 - Takedown offer scan and carry pick make no per-step garbage, behaviour bit-identical (Player Build)

Lead: Night Shift | Player Build, 2026-10-25. Opus builder. Job J6 player-hygiene, slice S3 (BRIEF rows H3 and the H4
carry half). The parity test and its master fixture are already committed; this brief continues that branch to the
refactor. Unit tests only.

## Read first
- Plan: `git show origin/feature/player-hygiene:docs/player-hygiene/PLAN.md` ("How it works today" H3 / H4, "Design"
  H3 / H4, "Slices" S3). Brief: `git show origin/feature/player-hygiene:docs/player-hygiene/BRIEF.md` (A1 the 16 B goal,
  A3 other modules' allocations stay for J21).
- On the branch: `docs/player-hygiene/S3-REPORT.md` (what is done and left), `tests/takedownAlloc.test.ts` (the
  parity and allocation test, 405 lines), `tests/fixtures/player-hygiene-s3.json` (the master record).
- `tests/helpers/allocPerCall.ts` (`bytesPerCall`, `HEAP_NUMBER` = 16).

## Base and branch
- Continue `origin/feature/player-hygiene-s3` at `ee7993e2d08c865c9225a993a30f06f2f168b6f4` (two WIP commits on master
  b81c4945 train 96: the test, then the fixture and S3-REPORT). Push `origin feature/player-hygiene-s3` only
  (fast-forward). No master merge, no rebase, no other branch. `npm ci` once.
- `src/game/takedown.ts`, `src/game/takedownController.ts` and `src/weapons/ballistics.ts` are byte-identical on
  b81c4945 and origin/master d6a04cee: every line number below holds.

## Files (only these)
- `src/game/takedown.ts`
- `src/game/takedownController.ts`
- `tests/takedownAlloc.test.ts` (frozen once commit 1 below is made)
- `tests/fixtures/player-hygiene-s3.json` (frozen likewise)
- `docs/player-hygiene/S3-REPORT.md` (update at the end)
- `changes/feature-player-hygiene-s3.md` (new fragment, `changes/README.md`)
Nothing else: not `src/weapons/ballistics.ts` (its `hitDistance` already exists), not `src/ai/*`, not `src/net/*`.

## Known overlap: Guard AI J15 (keep this line merge-friendly)
`origin/feature/guard-rules-s2` (71cec23d; same hunk on `guard-rules` 211a66d5 and `guard-rules-s5`) changes
`takedownController.ts:277-278` to
`// (G348) a dog: no takedown of any kind, from any state` + `if (!e.alive || e.def.quadruped || ((e.taken || ...`.
Do NOT edit `:274-279` (the `for` header, `const e = vs[k]!;`, the P6 comment, the skip `if ... continue;`): no reflow,
no renamed locals (`e`, `known`, `net`, `vs`, `k`), no moved lines around them. Whichever branch lands second rebases
and keeps the dog skip (`e.def.quadruped ||`). Gate order (PLAN Risks): S3 lands before J19 S1 and J15.

## What is there now (re-found on ee7993e2)
`src/game/takedown.ts`:
- `:146-171` `TakedownInput`, `:173-186` `TakedownPlan` (`victimTo: {x,y,z} | null`).
- `:198-203` `assistPlan(ax, ay, az, vx, vy, vz, los)`: a plan literal (`victimTo: null`) or null.
- `:206-341` `pickTakedown(i)`: the `ground` closure `:220-230` (literal per call); `wallLow` overCover writes
  `p.approach = T.approach + 0.2; p.arc = 0.6` on a ground plan `:258-261`; literals at `:270-280` (inverted,
  `victimTo` literal `:279`), `:289-291` (hangDown: `to` literal filled by `hangHoldPoint`, which writes x, z, y),
  `:298-308` (below, `victimTo` `:307`), `:327-337` (window, `victimTo` `:336`).
- `:347-361` `drop(...)`, `:363-376` `above(...)`: literals (module functions, `victimTo: null`).
`src/game/takedownController.ts`:
- `:93` `offer: { e; plan; lethalOnly } | null`; `:95` `active: { e; plan; ... } | null`; `:114` member `inp`;
  `:117-118` members `eye`, `head`.
- `:198` `if (this.carryId) this.carryStep(dt)`; `:204` `this.offer = ... this.find()` every step.
- `:217-255` `start()`: `:231-235` mutates `o.plan.approach` (grab: `HANG_GRAB.reach` or `GRAB.approach`), `:240`
  `o.e.beginTakedown(lethal !== true, o.plan.approach)` (after the mutation), `:241-251` `this.active = { e: o.e,
  plan: o.plan, ... }`, `:254` the event's `kind: o.plan.kind`.
- `:261-301` `find()` (index loops already; `:274-279` the J15 lines above).
- `:303-355` `tryVictim()`: assist path `:310-316` (`g.ballistics.ray(eye, head, G.STATIC)` `:313`, `assistPlan(...,
  !hr.hit || hr.distance > Vector3.Distance(eye, head) - 0.2)` `:314`, offer literal `:315`); normal path `:346`
  `g.ballistics.ray(eye, head, G.STATIC | G.GLASS)`, `:347` `i.los = !h.hit || h.distance > Vector3.Distance(...) - 0.2`,
  `:348` `pickTakedown(i)`, `:354` offer literal.
- `:608-616` `carryStep`: `g.enemyMgr?.bodies.find((x) => x.enemyId === this.carryId)` (closure every step, up to
  1.5 s); `bodies` is `readonly Body[]` (`src/ai/enemyManager.ts:238`).
- `src/weapons/ballistics.ts:84-88` `hitDistance(from, to, mask)`: the first hit's distance, else
  `Vector3.Distance(from, to)`; no allocation. `ray` (`:113-135`) allocates a result and clones two vectors.
  Equivalence: `!hit || distance > D - 0.2` == `hitDistance(eye, head, mask) > D - 0.2` (a hit: the same distance; no
  hit: D > D - 0.2 always), with D = `Vector3.Distance(this.eye, this.head)` as today.
- External readers: `gameState.ts:3447-3452` (offer `e`, `lethalOnly`, `plan.kind`, read in the frame),
  `:2017` (`offer?.plan.kind`), `localMoveState.ts:46` and `coopClient.ts` (`active.e`). Nobody compares `offer` or a
  plan by identity or keeps one across steps.

## Build
Commit 1 (parity check, before any src change): run `npx vitest run tests/takedownAlloc.test.ts` on the unchanged code.
The parity test must pass against the committed fixture (the `...Into` test is skipped, the readings are only
logged). If it fails because the test itself is wrong (type error, a fake missing a field the unchanged controller
reads), fix the test only; if the record does not match the unchanged code, re-record with `S3_RECORD=1` on the
unchanged code and say so in the report. Commit that state (or note "verified, no change" in S3-REPORT). From here the
test and fixture do not change.

Commit 2 (refactor), exact signatures the test calls (`tests/takedownAlloc.test.ts:27-31`):
1. `takedown.ts`: `export function pickTakedownInto(i: TakedownInput, out: TakedownPlan, to: { x: number; y: number;
   z: number }): boolean` - the body of today's `pickTakedown` with every `return <plan>` turned into writes of ALL
   nine fields of `out` (`kind`, `alignX`, `alignY`, `alignZ`, `faceYaw`, `approach`, `arc`, `strike`, `victimTo`) with
   the same expressions in the same order, then `return true`; `return null` -> `return false`. `victimTo`: for
   inverted / below / window write `to.x`, `to.y`, `to.z` (same expressions) and set `out.victimTo = to`; for hangDown
   call `hangHoldPoint(..., to)` and set `out.victimTo = to`; every other kind sets `out.victimTo = null`. The
   `ground` closure becomes a module function `groundInto(out, kind, i, ux, uz, face)` (no closure); `drop` / `above`
   become `dropInto(out, i, dx, dz, dy, face, ux, uz): boolean` / `aboveInto(out, i, face, ux, uz): void` (guard
   checks before any write). overCover: `groundInto` then `out.approach = T.approach + 0.2; out.arc = 0.6`. zipline:
   `if (dropInto(...)) return true;` then the above check.
2. `export function assistPlanInto(ax, ay, az, vx, vy, vz, los: boolean, out: TakedownPlan): boolean` - same guard,
   writes all nine fields (`victimTo = null`).
3. Wrappers keep their signatures and allocate as before: `pickTakedown(i)` = a fresh plan + a fresh `to`, `return
   pickTakedownInto(i, out, to) ? out : null`; `assistPlan(...)` likewise. (Callers: only the controller and tests.)
4. `takedownController.ts` members: `scanPlan` (a `TakedownPlan`, `victimTo: null`), `scanTo` `{ x: 0, y: 0, z: 0 }`,
   one offer object `{ e, plan: this.scanPlan, lethalOnly: false }` (`e` initialised with a cast placeholder; it is
   only exposed through `offer` after being set), `activePlan` (a `TakedownPlan`) and `activeTo` `{x, y, z}`.
5. `tryVictim`: both LOS rays via `g.ballistics.hitDistance(this.eye, this.head, mask) > Vector3.Distance(this.eye,
   this.head) - 0.2` (same masks: `G.STATIC` for the assist path, `G.STATIC | G.GLASS` for the normal one; same eye /
   head set-up and order); `assistPlanInto(..., this.scanPlan)` / `pickTakedownInto(i, this.scanPlan, this.scanTo)`;
   on success fill the member offer (`e = best`, `lethalOnly` as today; `plan` stays `scanPlan`) and return it; else
   null. Same grab rule and order.
6. `start()`: first copy the offer's plan into `activePlan` (all nine fields; `victimTo` -> copy x, y, z into
   `activeTo` and point at it, or null), then apply the grab approach to `activePlan.approach`, pass
   `activePlan.approach` to `beginTakedown`, set `active.plan = activePlan`, use `activePlan.kind` where `o.plan.kind`
   was read. The scan's scratch is never mutated. The `active` object literal and its `clone()`s stay (once per start).
7. `carryStep`: an index loop over `g.enemyMgr?.bodies` with the same first-match rule (`break` on the first
   `enemyId === this.carryId`), then the same branches.
8. `(player-hygiene S3)` tags on the new members and functions, in the house comment style.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck`;
`npx eslint src/game/takedown.ts src/game/takedownController.ts tests/takedownAlloc.test.ts`;
`npx vitest run tests/takedownAlloc.test.ts tests/takedown.test.ts tests/coopWalkFixes.test.ts tests/hangDownTakedown.test.ts tests/hangDown.test.ts tests/animN4dKill.test.ts tests/bunkerMap.test.ts tests/holdToggle.test.ts tests/strikePops.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` on a small box). The two parity sweeps take seconds (timeouts 60 s in the test).

## Rules
- Bit-identical: same arithmetic in the same order; the test hashes float64 bit patterns with -0 kept.
- CLAUDE.md hot paths: no closures, iterators, literals or temporary vectors on the scan or carry path; `hyp2` /
  `hyp3`, never `Math.hypot`. `import type` for type-only imports. Strict TS.
- No wire change, no `PROTOCOL_VERSION`, no flag (G355). No helper added to `src/core/mathx.ts`.
- An allocation left on the measured path outside the two files (A3): report file:line and bytes; do not fix.

## Done when
- In `tests/takedownAlloc.test.ts` (unchanged after commit 1): the wrapper parity passes, the `...Into` parity runs (not
  skipped) and passes with `bad` 0, the scan and carry-wait readings are `<= HEAP_NUMBER`, both alias tests pass.
- `grep -n "ballistics.ray" src/game/takedownController.ts` shows nothing in `tryVictim`; no `.find(` in `carryStep`.
- `git diff ee7993e2 -- src/game/takedownController.ts` does not touch `:274-279`.
- tsc and eslint clean, the vitest files above pass; `git diff --stat ee7993e2` lists only the files above.
- `docs/player-hygiene/S3-REPORT.md`: Done / Left updated (Left: the laptop suites, affected + e2e-coop + e2e-netmove,
  run by the lead).
- `changes/feature-player-hygiene-s3.md`: line 1 `# Takedown search and body pick-up make no per-step garbage`, line 2
  `kind: patch`, one or two `- ` bullets (no behaviour change; the takedown offer scan reuses one plan and offer and the
  shorter sight check, the started takedown keeps its own copy; the carry pick no longer builds a closure).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/player-hygiene-s3`.
  Then append `## Report` here (what changed with file:line, test names and counts, readings before / after,
  deviations) and set line 1 to `status: done feature/player-hygiene-s3 <sha>`; commit, push `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.
