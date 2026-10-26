# guard-rules S6: pair checks and posted pairs (slice brief)
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.guardPairs` (F0). Rows: A4, A5. Assumptions: A10, A11
(`docs/archive/guard-rules/BRIEF.md`; G335 "paired patrols that check on each other"). Source: `docs/archive/guard-rules/PLAN.md`
"PR3" S6. Every anchor below is checked against `feature/guard-rules-s5` at a09495007 (PR1 + S5); S5 moved
`enemyManager.ts` lines, so use these, not PLAN's (drift list at the end).

## Goal
With the flag on, a pair walking together notices a missing partner within ~3 s, outside the meeting window too; two
posted guards named as a pair talk on a fixed 40 s clock and check on each other the same way. Flag off: bit-identical
to today.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-rules-s6`, branch `feature/guard-rules-s6`, cut from the F0 commit
  (`docs/archive/guard-rules/slices/F0-BRIEF.md`; it adds `flags.guardPairs`). Start from `docs/systems/agent-preamble.md`
  (origin/master); branch guard before every write; commit and push each finished sub-step, `git add <your files>`
  only.

## Files owned (wave 3, file-disjoint from S4)
- `src/ai/pairs.ts`, `src/ai/enemyManager.ts`
- `tests/pairs.test.ts`, `tests/pairsWiring.test.ts`
- `scripts/e2e-sectorops.mjs`
- No ai.md edit: write your ai.md lines (Talking pairs, 187-201) in your final report; the lead folds them in (S4 is
  PR3's ai.md editor).

## Steps
### 1. `src/ai/pairs.ts` (pure, no Babylon / DOM, no flag import)
1. `PAIRS` (21-41): add, each with a doc line:
   `togetherR: 4` (m: a partner this close counts as walking with him), `notice: 3` (s: gone this long -> missing),
   `postedPeriod: 40` (s: a posted pair's clock), `postedOpen: 12` (s: its window, the first part of each period).
2. `PairDef` (77-91): add optional `watch?: boolean` (A10: the check outside the window) and `posted?: boolean` (A11:
   built from two posts; informational, the clock comes from `period` / `t0` / `open` / `close`).
3. New pure helper after `pickMeet` (172-199):
   `export function postedDef(id: number, aPt: Pt, bPt: Pt): PairDef` returning
   `{ id, period: PAIRS.postedPeriod, t0: 0, open: 0, close: PAIRS.postedOpen, aPt, bPt, watch: true, posted: true }`.
   The window opens on the first step after build (no randomness, G143). Load time only.
4. `PairMeet` (204-420): new private fields `together = false`, `goneT = 0`.
   - `step` (276-315): after the `lastAX` / `lastBX` updates (283-290), before `const inW` (291):
     `if (this.def.watch && this.state !== 'missing' && this.watch(dt)) return;` (`inWindow` / `wasIn` are not touched
     on that return; the pair is missing until `reset`).
   - New `private watch(dt: number): boolean`:
     - both present: `together = hyp2(a.x - b.x, a.z - b.z) <= PAIRS.togetherR`, `goneT = 0`, return false;
     - both absent: `together = false`, `goneT = 0`, return false;
     - one absent: if `!together` return false; the one left (`a.present ? a : b`) not calm: `goneT = 0`, return false
       (he is busy; `together` is kept); else `goneT += dt`; at `goneT >= PAIRS.notice`: `clearTalk()`,
       `state = 'missing'`, `requested = true`, `lookFor = a.present ? 0 : 1`, `lookX` / `lookZ` = the partner's last
       route point (`lastBX` / `lastBZ` or `lastAX` / `lastAZ`, exactly as `waiting`, 329-337), `together = false`,
       `goneT = 0`, `missT = 0`, return true.
   - `reset` (267-274): also `together = false`, `goneT = 0`.
   - `waiting` (317-347), `meeting` (359-396) and the window logic are unchanged: inside the window today's `grace` path
     still runs; with `watch` the 3 s check simply fires first when they were together.
   - Header comment (1-17): one paragraph for `watch` and posted pairs (A10, A11).

### 2. `src/ai/enemyManager.ts`
1. Import `flags` from `'../core/flags'` (as `src/ai/guardBody.ts:21`) and `postedDef` from `./pairs` (50).
2. `buildPair` (2173-2228):
   - the timed-loop path's `new PairMeet({...})` (2226): add `watch: flags.guardPairs`. Nothing else in that path.
   - the skip branch (2203-2208): when `why` is set and `flags.guardPairs`, try the posted pair first:
     `const pw = this.postedWhyNot(A, B); if (!pw) { build; return; }`; build =
     `const pa = A.postPoint, pb = B.postPoint;` `new PairMeet(postedDef(id, [pa[0], pa[1]], [pb[0], pb[1]]))` pushed
     as `{ pm, sa: lo, sb: hi }`. When `pw` is set, the logged message is
     `section S slots lo + hi: ${why} (posted pair: ${pw})`, so today's `why` text is still in it.
   - flag off: the branch reads nothing new (no `postDef` / `postPoint` access), so the fakes in other test files are
     unaffected.
3. New `private postedWhyNot(A: Enemy, B: Enemy): string` next to `pairWhyNot` (2231-2238), '' when they can:
   - `'a dog does not talk'` for a dog;
   - each must stand: `e.patrolRoute === null` (a standing guard: Tallow's `posted(...)` slots) or
     (`e.postDef !== null` and `!e.patrolRoute.loop`) (a post with a short untimed route); else `'not both standing a post'`;
   - `hyp2` between their `postPoint`s (`enemy.ts:1855`) <= `PAIRS.meetMax`; else
     `` `posts ${d.toFixed(1)} m apart (over ${PAIRS.meetMax} m)` `` (load time: the string is fine there).
4. `pairWhyNot` (2231-2238), `fillPair` (2241-2254), `pairStep` (2263-2287), `pairHold` (2290-2294) and `pairMissing`
   (2303-2318) are unchanged in shape. A watch request goes through the same `pm.requested -> pairMissing` path (a
   `missing` incident with the one left as lead, `missingCall`, the partner added to `silent`).
5. Read only these `Enemy` members (no `enemy.ts` edit, S4 owns it): `patrolRoute` (966), `postDef` (1647),
   `postPoint` (1855), `dog`, `def.walkSpeed`. A posted guard's hold at his meet point works through `pairFace` /
   `pairPt` as today (`enemy.ts:2706-2722`: the calm branch walks him to `pairPt` and faces his partner, route or not;
   after the talk `PatrolWalker` turns him back to his post yaw).

### 3. Tests (vitest)
- `tests/pairs.test.ts` (pure). New describe `(guard-rules S6) watch and posted pairs`:
  1. watch on, walking together (both within `togetherR`), B down outside the window: request at
     `notice` (+ one step), `lookFor === 0`, `lookX` / `lookZ` = B's route point.
  2. watch off (today's def), same run: no request before the window opens + `grace` (today's timing; the existing
     case at 210-233 stays as is).
  3. watch on, B down while > `togetherR` from A: no early request (the window `grace` path only).
  4. watch on, A not calm while B is gone: no request while not calm; calm again: request `notice` s later.
  5. watch on, B back before `notice`: no request; `reset()` clears `together` / `goneT`.
  6. `postedDef`: opens on the first step, both at their points meet at once, two lines, done; the next meeting at
     `postedPeriod`; same inputs, same lines (deterministic).
  7. posted: one down after the talk -> request after `notice`.
- `tests/pairsWiring.test.ts`. The fake guard (`guard()`, 76-142) gains `postDef: null` and
  `postPoint: [x, z]` (its spawn point; for a route guard the route's first point). Import `flags` from
  `../src/core/flags`; every case that sets `flags.guardPairs = true` restores it (`afterEach`).
  1. flag off: two standing guards (no route) tagged as a pair -> no pair, skip text contains `timed loop` (today).
  2. flag on: the same two, 1.2 m apart -> one pair, `def.posted && def.watch`, `aPt` / `bPt` = their post points, id
     section x 100 + lower slot; `sim` 12 s -> `pairLines === 2`.
  3. flag on: standing guards 8 m apart -> skipped, text contains `posted pair` and `over 6 m`.
  4. flag on: one timed loop + one standing -> skipped (today's `timed loop` text).
  5. flag on: the timed-loop pair (`routeA` / `routeB`) gets `def.watch === true`; flag off `false`.
  6. flag on: two timed loops walking side by side (within 4 m), B down between meetings -> `A.pairSearch` once, within
     `notice + PAIRS.tick + 0.05` s of the take; `missing` incident.
  7. "live map data" (246-265): stop reading `a.route!` blind: a pair whose two slots both have a `loop` keeps the
     `pickMeet` check; a pair with no route on either side checks the two slots are within `PAIRS.meetMax`; anything
     else fails the test with its ids. Campus data today has only the car-park route pair, so it still counts >= 1.
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/pairs.test.ts tests/pairsWiring.test.ts tests/squadWiring.test.ts tests/responseWiring.test.ts tests/gearWiring.test.ts`
  (the last three call `placeSlot` on fakes: they must stay green with the flag off). Never `npm run check`.

### 4. e2e (`scripts/e2e-sectorops.mjs`, written by the builder, run only by the lead)
- New block right after the talking pairs block (2734-2861), `if (want(1)) {`, its own page:
  `run(PARAMS + '&guardpairs=1', ...)`. Reuse the lane finder of 2741-2757 (move it into a module helper used by both
  blocks, or copy it). Same stand-in setup as 2759-2786 (despawn all, dark `updateLight`, `radioT` 1e9, player 40 m
  off, guards built with `spawn` + `setPatrol` + `placeSlot`, no map data edited).
  - (c) walking together: the (a)/(b) slots (lanes 1.2 m apart, A 3.4 m from B). Built pair has `def.watch === true`.
    Knock B out at 0.5 s behind A's back: `em.pairMisses === 1` at 3.0-4.0 s after the knock-out (`notice` 3 s + one
    0.2 s pair step + read granularity), well before the window's `open + grace`; A's incident kind is `missing`; he
    reaches B's spot and finds him (as 2859).
  - (d) posted pair: two guards with no route, 1.2 m apart, back to back (A yaw -pi/2, B yaw +pi/2), tagged `pair`.
    Built (`n === 1`, no skips, `def.posted`); they meet inside 12 s and say two lines, one each; once both have turned
    back to their post yaw (>= 2 s after the talk ends), knock B out: the request comes 3.0-4.0 s later, kind
    `missing`.
  - Use `Math.hypot` only in page code as the existing block does (e2e, not a hot path).
- The existing (a) / (b) parts stay on `PARAMS` (flag off) and must pass unchanged: that is the flag-off proof in play.
- The lead requests (builder runs no e2e): PR3 gate e2e-anim, e2e-combat, e2e-guard-carry, e2e-move, e2e-sectorops,
  e2e-stealth-ai, smoke; plus e2e-coop, e2e-netmove, e2e-ctcourse for the PR (S4's wire append). For this slice the
  deciding suite is e2e-sectorops part 1 (`--part=1`).

## Hot-path rules
`PairMeet.step` / `watch` and `pairStep` run every 0.2 s per pair: fields only, no closures, arrays, objects, iterators
or strings per step; `hyp2`, never `Math.hypot` in `src`. Allocation is allowed only at build time (`buildPair`,
`postedDef`, the skip messages).

## Flag gating
`flags.guardPairs` is read only in `buildPair` (load time). Off: no posted pair is built (today's skip and warning), and
every timed-loop pair has `watch: false`, so `PairMeet` runs exactly today's code path. Do not read the flag in
`pairs.ts` or per step. Tallow's four posted pairs (on feature/mission-engine) start working once the flag is on: no
data edit here.

## Wire
None. Host only; no `src/net` change; no `PROTOCOL_VERSION` edit. Pair lines keep going as text (`sayLine`).

## Done looks like (flag on)
- A pair walking together reacts to a missing partner within ~3-4 s, inside or outside the meeting window.
- Two posted guards named as a pair within 6 m talk at load and every 40 s, and check on each other the same way.
- Flag off: no behaviour change (the existing talking pairs e2e and unit cases pass untouched).
- The vitest files above green; tsc clean; ai.md lines for Talking pairs in the report.

## Est. lines
~450 (pairs ~70, manager ~45, tests ~210, e2e ~125).

## Assumptions (logged here; closest to PLAN / BRIEF)
- S6-a: "two posts or no timed loops" (PLAN) = each guard stands: no route at all, or a post with an untimed route;
  their meet points are their post points. Undo: flag off.
- S6-b: a posted pair checks on each other only when its posts are within `togetherR` 4 m (A10's rule, one radius);
  4-6 m apart they rely on the window's `grace`. Undo: pass `PAIRS.meetMax` as the posted radius.
- S6-c: the watch timer counts only while the one left is calm; busy (suspicious, on a task), he does not notice; the
  window `grace` path is unchanged and still applies.
- S6-d: the watch request reuses `lookX` / `lookZ` = the partner's last route point (PLAN: "the same outputs as
  waiting"), not his last position.

## Must NOT touch
`src/ai/enemy.ts`, `src/ai/barks.ts` (S4), `src/core/flags.ts` (F0), `docs/systems/ai.md`, `src/net/**`, map data
(`src/world/maps/**`, Tallow is Campaign's), any other test or e2e file. No default flip of `guardPairs`.

## PLAN pointer drift (PLAN says -> now, a09495007)
- `enemyManager.ts` `buildPair` 2077-2132 -> 2173-2228; `pairWhyNot` 2135-2142 -> 2231-2238; `pairStep` /
  `pairMissing` 2167-2220 -> `fillPair` 2241-2254, `pairStep` 2263-2287, `pairHold` 2290-2294, `pairMissing`
  2303-2318.
- `pairs.ts` `waiting` 317-345 -> 317-347 (`PairMeet` 204-420 unchanged).
- `pairsWiring.test.ts` 247-265 -> the "live map data" describe 246-265 (the case at 247).
- `e2e-sectorops.mjs` "talking pairs" 2716 -> block 2734-2861 (log line 2735).
- `ai.md` Talking pairs 183-197 -> 187-201.
