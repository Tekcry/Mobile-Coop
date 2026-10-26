FIX: 2 blocking items (A193 pins a searcher at his floor's edge; A188 can leave the LKP unvisited for the whole search)

# Guard AI polish 2: check B (Opus, 2026-10-25)

Scope: A185, A188, A191, A192, A193, T1 (`tests/reconDroneSight.test.ts`), and the docs (ai.md polish-2 bullet, BRIEF
A184-A194, `changes/feature-guard-ai-polish2.md`, TESTING.md). Branch `feature/guard-ai-polish2`, head d45d526e9. I
reviewed only `git diff origin/feature/guard-ai-polish...HEAD`. Line numbers are at that head.

## Blocking

### 1. A193: a searcher can be pinned at his floor's edge for the rest of the search (up to 60 s)
The heard spot now snaps to the noise's storey (enemy.ts:1200). The search branch still walks to it with
`goTo(this.spot, dt, 0.6, NaN, ..)` (enemy.ts:2809), and `goTo` turns NaN into his own height (enemy.ts:2611). So the
nav goal is the cell on his own storey nearest the spot (`nearestWalkable` 12 rings, height-weighted, navGrid.ts:533).
But `findPath` always ends the path at `to`, the spot's x/z (navGrid.ts:672), and `goTo` returns `p` once the path is
used up (enemy.ts:2641). The spot's x/z is off his floor, so `tryMove` refuses the step (`canStep`, enemy.ts:3959).
Whenever his nearest own-storey cell is more than about 1.1 m from the spot, he is never "there" (enemy.ts:2787).
`wp` is never null either, so the unreachable skip (enemy.ts:2817) never fires. He presses against the edge until
the search ends (`ALERT.searchTime` 60) or another noise comes.

Before A193 this case was fine: the snap with his own `y` put the spot on his own cell within 2 m, and he walked
there and looked.

Probe on the A193 test's own grid (ground 10 x 10, upper floor at 4 m for x >= 6, guard upstairs at (8, 5)). The
`vite-node` probe is in the scratchpad (`a193/probe.ts`):

| noise x | snap with own y (4.98) | snap with noise y (A193) | goTo goal (own storey) | gap to spot x/z |
| --- | --- | --- | --- | --- |
| 5.2 | (6.25, 5.25) upper | (5.25, 5.25) ground | (6.25, 5.25) upper | 1.0 (arrives) |
| 4.7 | (6.25, 5.25) upper | (4.75, 5.25) ground | (6.25, 5.25) upper | 1.5: pinned (edge 6.0, d 1.25) |
| 4.4 | (6.25, 5.25) upper | (4.25, 5.25) ground | (6.25, 5.25) upper | 2.0: pinned |
| 3.9 | (3.75, 5.25) ground | same | (6.25, 5.25) upper | 2.5 (same as 4.98) |

A193 only changes the spot when his own storey has a cell within the 2 m snap radius but not in the noise's column.
In exactly that case `goTo` keeps him on his own storey, because own cells within 2 m cost at most 16 and the other
storey costs 36-64. So the fix never takes him to the noise's floor. It only moves the spot off his own floor. This
hits atrium balconies, warehouse catwalks, and a mezzanine over a solid block.

Smallest fix: set `HEAR_STOREY = false` (enemy.ts:316) and leave A193 for the spot-height slice the docs already name
("a spot height for `goTo` is its own slice"). Restate A193 in BRIEF.md, ai.md and the changelog fragment as deferred.
The guardPolish2 A193 test then asserts the undo (spot on his own storey). The real fix is that slice: keep the
snapped cell's height (`spotY`) for a heard spot and pass it to `goTo`, so he paths to that storey or skips it as
unreachable.

### 2. A188: the LKP can stay unvisited for the whole search when its holder drops out before his look
`searchLkp` is asked only at `searchK === 0` (enemy.ts:2759). A mate told "no" gets `searchK = 1` and never asks
again in that search.

Freeing on death, leaving the level, or changing hunt works (enemyManager.ts:3172-3176). But it only helps a guard
who joins later. In the likeliest case, the player takes down the guard walking to the LKP. The mates already on
plan points never go there, and B4 removes every plan candidate within `spacing` of the centre (it counts the centre
as "his first look"). Only ring 0 (2 m out) is left, and only once the plan runs dry.

There is a second gap. A holder pulled onto a body or KO search (`bodySearch` / `koSearch` set
`combatSearch = false`, enemy.ts:1086 / 1105) stays searching, alive and on the same hunt. `planSweep` therefore keeps
`lkpBy` for him, and nobody gets the LKP at all. Before A188, every searcher looked at the LKP first.

Test gap: the `searchAreaWiring` "freed for the next" step calls `ctx.searchLkp(c)` directly. In the game, `c` is
already past `searchK` 0 and would not ask.

Smallest fix (enemy.ts plus one line in the manager):
- (a) Keep a `lkpWait` flag, set when the answer is no and cleared wherever `searchK` resets.
- (b) On each later spot pick in the same combat plan search, ask again while `lkpWait` is set. On true, take the LKP
  as the spot. Its look end should not advance `searchK`, as for `heardSpot`.
- (c) In `planSweep`, also free `lkpBy` when the holder is no longer on a combat plan search (`!combatSearch` or
  `searchOwn`). This needs a getter.

A second look after a finished look and a departed holder costs one 3 s look. That is acceptable. A
`SearchPlan.lkpDone` flag can stop it if wanted.

## Evidence per item

### A185 (one "I heard something." per noise): OK
- `hear` resets `hearBarked` (enemyManager.ts:2831). `hearFight` passes `!(POLISH2.oneHeardBark && hearBarked)` and
  sets it when he barks (enemyManager.ts:2889). `hearSearch` returns whether he barked (enemy.ts:1195-1211).
- All searchers still get the spot, `heardT = 0` and the released claim. The S26 throttle (`heardAt < gap`) and the
  hearing tiers are untouched. `hearFight` is reached only from `hear` (enemyManager.ts:2840). Nothing in `bark` or
  `hearSearch` re-enters `hear`.
- No allocation (a boolean field).
- Undo `POLISH2.oneHeardBark`: the test flips it, and off gives 3 barks.
- On origin the test fails (POLISH2 is missing: TypeError). Its off case pins the old count of 3 against the on case's
  1.

### A188 (only the first searcher looks at the LKP): blocking item 2, otherwise OK
- The gate equals `searchPoint`'s (enemy.ts:2758 vs 2763), so a lone searcher, calm searches, the parked modes and
  high-security posts are unchanged.
- `searchLkpFor` (enemyManager.ts:3136) uses the same plan-centre rule as `searchPointFor`. A same-centre rebuild
  keeps `lkpBy` (`reset(keep)`, searchArea.ts:247-252). A moved centre or `forgetStep` clears it.
- No allocation (index loop).
- Undo `POLISH2.lkpOnce` works.
- On origin all 3 tests fail. The search-branch test fails on behaviour: `[[5,-3],[-1,-1],[9,-7]]` vs the expected
  plan point first.

### A191 (quiet device-search resume): OK
- `resume` is computed before the barks from the same terms as the old A1 condition (enemy.ts:2026-2027). Nothing in
  between changes `responder` / `alive` / `taken`.
- The `standDown` radio call stays (enemy.ts:2036). The resume itself is unchanged (enemy.ts:2129).
- Undo `RESUME_QUIET`. On origin the test fails (`['clear']`).

### A192 (armour casts best first): OK
- With `late`, scoring keeps the best `min(coverCasts 6, CV_IDX 8)` uncast (enemy.ts:3542-3543). The try loop casts
  best first and is capped by `paths < tries` A* (enemy.ts:3592-3604). So casts <= kept <= 6 and A* <= 3.
- Without armour, `keepN = tries`, and `paths` can never cut below `kept`: unchanged.
- No allocation.
- Undo `ARMOUR_CAST_LATE` restores the old path exactly.
- On origin the test fails (`pickCover` false).
- The pick still finds a clear cover when one is among the 6 best by score. If all 6 are armoured and a worse one is
  clear, he picks nothing. BRIEF and ai.md state this, and the old index-order casts gave no guarantee either.

### A193 (heard spot on the noise's storey): blocking item 1
- Signature, NaN fallback and undo are correct (enemy.ts:1200). The manager passes `pos.y`, which is feet height.
- On origin the test fails (6.25). It asserts only the snapped x and never walks him.

### T1 (recon drone sight): OK
- NullEngine scene with a stand-in `hitDistance`. It covers 0.2 m short sees, 0.5 m short blocks, a miss sees, behind
  the drone and > 3 m at 90 degrees casts no ray, < 3 m below casts, and beyond range casts no ray.
- It matches reconDrone.ts:175-181 (threshold 0.3, `half` 40 degrees, range 16).
- Passes, and passes on origin too, as it should (no source change).

### Docs
- The const names in BRIEF A184-A194 and ai.md are right: `POLISH2.oneHeardBark` / `lkpOnce`, `RESUME_QUIET`,
  `ARMOUR_CAST_LATE`, `ARMOUR_FIRE.coverCasts` 6, `COVER_TRIES`, `HEAR_STOREY`, `COVER_DETOUR.flankK`.
- TESTING.md has the A184 / A185 / A186 / A188 lines the plan asks for (A184's "about 4 s" = `investigateLook` 4).
- The fragment parses (`tests/changesFragments.test.ts` passes).
- The A193 text ("for a column without his own storey" it helps) is wrong per item 1. Fix it with item 1.

### Runs
- HEAD: `combatHearing`, `searchAreaWiring`, `guardPolish2`, `reconDroneSight`, `enemyManagerDespawn`,
  `armourFireWiring`, `guardPolishA`: 7 files, 96 tests pass. `changesFragments` passes.
- Origin (`git archive origin/feature/guard-ai-polish` into the scratchpad, HEAD's 4 test files copied in):
  `combatHearing` fails 2 (A185), `searchAreaWiring` fails 3 (A188), `guardPolish2` fails 6 (A186, A189, A191, A192,
  A193, A194), `reconDroneSight` passes.
- Note: `npx vite-node` fetched vite-node 6.0.0 into the npx cache for the probe. Nothing in the repo changed.

## Polish (non-blocking)
1. A185: the per-guard throttle makes the searchers bark in turn on later noises (t0 A, t1.5 B, t3 C with `gap` 1.5,
   `bark` 6). That is the same 3 lines per 6 s, staggered instead of overlapping. A manager-level `COMBAT_HEAR.bark`
   throttle would give one line per 6 s. The plan's wording ("his own throttle still applies") allows today's
   behaviour.
2. A188: while the plan is not built yet (chase field not round the LKP), `searchLkp` returns true without recording
   a holder. Early askers all look, and a later one can take `lkpBy` and look again.
3. `hearSearch` doc: "a searcher nearer the manager's list" should read "earlier in the manager's list"
   (enemy.ts:1191).
4. Changelog fragment: the A193 sentence is an indented continuation of the A185 bullet, not its own bullet.
5. Pre-existing (A11, batch 1, not this delta): plan / ring spots snapped to the hunt position's storey
   (enemy.ts:2769) reach `goTo` with his own height too, so they have the same edge pin as item 1. The spot-height
   slice should cover both.
6. The A193 test checks the spot only. Item 1's fix should add a walk: he reaches the spot, or skips it.
