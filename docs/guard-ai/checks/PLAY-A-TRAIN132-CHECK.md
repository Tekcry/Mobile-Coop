# Play A train 132 fix check - PR #588 (feature/guard-ai-home, fix e967d906e)

Fresh Opus checker. Read-only on code. Scope: e967d906e only (sliced long plan home, `NavGrid.slice*`, `Enemy.homeStep` /
`homeLongPlan`, the S1 limit and the new nav tests).

## Verdict: FIX

Two FIX items: a running sliced plan is starved and then lost when an earlier-listed guard also wants a long plan
(FIX 1, reproduced), and `GIVE_UP.homeCap` 60000 is below what S1 v2-c needs from a quarter of the site (FIX 2,
measured). The NavGrid search itself is correct.

## Runs

Temp worktree: e967d906e merged with origin/master and origin/feature/light-realism-l1 (removed afterwards).

- `npx vitest run tests/guardHome.test.ts tests/nav.test.ts`: 33/33 (guardHome 13, nav 20; the commit message says
  "nav tests 28/28").
- S1 runs: (50, -76) path 248 m, home in 265.1 s (limit 398); (-18, -60) 43 m, 45.5 s; (20, -32) 213 m, 227.3 s;
  guard 4 (12, -19) 88 m, 94.6 s. Each takes about the shortest path's walk time (x1.0-1.07).
- `npm run typecheck:fast` (PR worktree): clean.
- Scratch probes (deleted with the temp worktree): the starvation repro (FIX 1) and an S1 expansion scan (FIX 2).

## 1. NavGrid

- **findPath unchanged.** `buildPath` is the old tail with `this.came` / `this.cameLink` / `from` passed in; findPath
  passes the same values. Same output.
- **Sliced search correct.** Same A* as findPath (octile heuristic, lazy re-push, goal test on pop), same expansion
  count semantics (`expanded < end`, `end = min(cap, expanded + budget)`), so the path is the shortest and equal to
  findPath's (nav test 1 checks the length). It reads and writes only `sl.heap` / `sl.gScore` / `sl.came` /
  `sl.cameLink` / `sl.stamp`; the shared scratch it touches (`nb`, `nbCost`, `nbLink`, `endP`) is used and done with
  inside one call, so a findPath or flow query between slices cannot corrupt it.
- **Edge cases.** Version change: null at the next step (slot freed). s = g: `[[tx, tz]]`. Cap: null once
  `expanded >= cap` with the heap left. Empty heap: null. Cancel: frees only the owner's slot. Hand-over: a new
  `sliceStart` takes the slot, and the old owner's next step returns null.
- **Allocation.** The buffers are allocated once on first use (grid size is fixed after build). Per slice: none except
  the final `buildPath` and the s = g array, as findPath does. `octile` still destructures `this.center(i)` (a 2-array
  per push); this predates the commit and findPath does it too (Polish P1).

## 2. Enemy

Fine: the goal change cancels the slot (`sliceCancel`); `rejoinHome` / leaving calm / a pair talk set `homeG = null`,
so the next `homeStep` cancels and starts over; a dead or despawned owner is taken over after `SLICE_IDLE` asks. The
stuck window does not run during slicing (the slicing branch returns before `homeT += dt`), so there is no give-up
while a slice runs. A finished slice sets `homeLong`, so no second long plan per point. During slicing he walks the
partial path (no straight press). At most one slice per frame: each `sliceStep` is behind `longPlanFree()`.

### FIX 1 - a waiting guard burns the frame's token, starves the running slice, then takes it over (the owner loses it)

`src/ai/enemy.ts:2818` (and `2823`/`2828`): a guard takes the frame's long-plan token (`longPlanFree()`) *before*
asking whether the slice is free. In `homeLongPlan` (`enemy.ts:2871`) `sliceFree` is false while another guard's
search runs, so he returns null having used the frame's only token, doing nothing. `EnemyManager.update` steps the
guards in fixed list order (`enemyManager.ts:3815`), so:

- Guard A (later in the list) starts a sliced plan (S1 east gate case: ~5 slices).
- Guard B (earlier in the list) has a partial path home too (`part`, `!homeLong`). Each frame B thinks first, takes the
  token and calls `sliceFree(B)` (`navGrid.ts:743`, `++idle`), which returns false. A then finds the token gone
  (`enemy.ts:2810`) and returns `wp`. A never steps again.
- After `SLICE_IDLE` (8) frames B's ask returns true: B's `sliceStart` takes the live search over.
- When A next gets the token, `sliceStep(A)` returns null (`by !== owner`, `navGrid.ts:791`). `homeLongPlan` treats
  that as "no path": `homeLong = true` (`enemy.ts:2884`). A walks the partial path to its dead end, the window passes
  and `walker.giveUp`: a post guard stands there for the calm spell. This is the train 132 failure again, for any
  second guard walking home far out.

Reproduced (scratch test, the check B wall grid, the per-slice budget mocked to 20 to need several slices, A starts
first, then B thinks before A each frame): log `a:run` (1 slice), 9 frames with no slice, B's search over 98 slices,
then `a:null`; A ends with `homeLong = true` and no long path. A search ends with several guards walking home at once,
so this will happen in play. Also, with the ask-counted idle, 9+ waiting guards could take a live search over within
one frame.

Minimal fix:
1. Ask the slot before the token, so a guard who cannot run a slice never uses the frame's token:
   `enemy.ts:2818` `part && !this.homeLong && this.ctx.nav.sliceFree(this) && this.longPlanFree()`; `enemy.ts:2823`
   `... && !this.homeLong && !(this.ctx.nav.sliceFree(this) && this.longPlanFree())`.
2. Count `SLICE_IDLE` in frames, not asks: `sliceFree` only reads (`idle > SLICE_IDLE`); add a `NavGrid.sliceTick()`
   (`if (slice && slice.by) slice.idle++`) called once per `EnemyManager.update` beside `longPlanFree = true`;
   `sliceStep` keeps resetting it. A live owner then steps every frame and is never taken over; a dead one is, after 8
   frames.
3. Losing the slot is not "no path": in `homeLongPlan`, before `sliceStep`, if the slot is no longer his (add
   `sliceOwns(owner)`, or return a distinct value), set `homeSlicing = false` and return null *without* setting
   `homeLong`, so he starts again on a later frame. (A ladder climb mid-slice, `runLink` with no `decide`, can still
   lose it after 8 frames.)
4. Test: the check B case with a mocked small per-slice budget, the later-listed guard starting first, both guards
   thinking every frame: both get a long path (`homeLong` with a non-empty `routePath`), max 1 slice per frame.

### FIX 2 - `GIVE_UP.homeCap` 60000 is too low for S1 v2-c

`src/ai/enemy.ts:271`. The cap was set from the one test start (~45000). A scan on the merged S1 v2-c grid (starts
every 12 m over -120..120, walkable with a path; the least `maxExpand` at which `findPath` reaches the post, same count
as the slice):

| Post | Starts within 80 m over 60000 | Worst within 80 m | Whole map: over 60000 / starts | Worst on the map |
| --- | --- | --- | --- | --- |
| guard 0 gate (14.6, -76) | 4 / 73 | 67076 from (60, -36) | 36 / 140 | 76634 from (48, 60) |
| guard 5 smoker (8, -48.5) | 10 / 100 | 65601 from (60, -36) | 33 / 140 | 74477 |
| guard 13 patrol (24, -54) | 10 / 85 | 66183 from (60, 12) | 35 / 140 | 73119 |
| guard 14 smoker (7, -50.8) | 3 / 97 | 61428 from (60, 0) | - | - |

From about a quarter of the site the gate officer's plan hits the cap, so he stands for the calm spell: (60, -36) is
~56 m from his post. No start needs over 120000. Fix: `homeCap: 120000` (12 frames at 10000; only the number of
frames grows, the per-frame cost stays the same). Add an S1 case from (60, -36) to the guardHome S1 list.

## 3. Tests

- **S1 limit by walk time: right.** The guard's times match the shortest path's walk at his calm pace (265 s for 248 m
  against an ideal ~265 s), so the x1.5 limit proves he follows the way round and never sticks; a flat 60 s could only
  pass if the map had a short way. It does not hide an AI problem. It does show a layout fact for the S1 v2-c owner
  (#525 / #518): 35 m east of the gatehouse the way to the gate post is 248 m, and from north of the fence (20, -32)
  213 m: about 4 minutes' walk home. Whether the gatehouse needs a second way in is a map question for the
  orchestrator, not for this PR.
- **nav.test.ts sliced tests: sound** for what they cover (several slices, shared queries in between, same length as
  findPath; cap -> null; hand-over -> the old owner gets null). Test 2 encodes the ask-counted idle (`while
  (!g.sliceFree(other)) asks++`) and changes with FIX 1 step 2. Not covered: version change mid-search, s = g, cancel
  (Polish P2).
- **check B test**: counts slices, but on its small map one slice ends each plan, so it never covers two plans
  competing over several frames (FIX 1 step 4).

## Polish

- P1 `navGrid.ts` `octile`: `const [x, z] = this.center(i)` allocates a 2-array per heap push (findPath and the slice);
  use `centerInto` with a private scratch. Predates this commit.
- P2 nav tests for a closure change mid-slice (null, slot free), s = g, and `sliceCancel`.
- P3 A closure change mid-slice (`navGrid.ts:793`) ends the plan as "no path" (`homeLong = true`); restarting
  (`homeLong` left false) would be kinder. Rare (locked doors, sector stages, team doors).
- P4 Commit message: "nav tests 28/28" is 20/20.
