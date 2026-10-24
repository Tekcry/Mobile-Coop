# SPOT-HEIGHT: search spots keep their storey all the way to `goTo` (A193 back on + plan / ring spots)

Builder: Opus. You need nothing from the conversation that wrote this.
Open item: "spot-height slice (A193 + plan / ring spots, check B polish 5)".

## Why
- PR #377 (`feature/guard-ai-polish2`, head 4fac8536d) built **A193**: a heard spot snaps to the noise's storey, not
  the searcher's.
- POLISH2-CHECK-B blocking 1 (`docs/guard-ai/slices/POLISH2-CHECK-B.md` on that branch) found that this pins a searcher
  at his floor's edge for up to 60 s:
  - The spot's x/z moves onto the other storey.
  - The search branch still calls `goTo(this.spot, dt, 0.6, NaN, ..)`, and `goTo` turns NaN into his own height. So the
    path goal is the cell on HIS storey nearest the spot.
  - `findPath` ends the path at the spot's x/z (off his floor), so `tryMove` refuses the last step.
  - He is never "there" (2D 1.1 m), and `wp` is never null, so the unreachable skip never fires.
- The fix round turned A193 off (`HEAR_STOREY = false`, the code kept, its test `it.skip`). POLISH2-RECHECK.md:33-42
  confirms the off state restores the pre-A193 behaviour exactly.
- **Check B polish 5:** plan and ring spots have the same pin, and it predates #377 (A11, batch 1):
  - they snap to the hunt position's storey (`snapSpot(k ? k.y : this.pos.y)`);
  - they reach `goTo` with his own height.
- The fix both checks name: keep the snapped cell's height (`spotY`) and pass it to `goTo`. He then paths to that storey,
  or finds no path and skips the spot as unreachable.

## Where
- Builds after #377 merges, off master. If #377 is not merged when you start, stop and tell the job lead.
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-spot-height`, branch `feature/guard-ai-spot-height` (cut from
  origin/master after the #377 merge).
- Branch guard before every write:
  `cd /c/NightShift/Mobile-Coop-guard-ai-spot-height && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-ai-spot-height && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-ai-spot-height"`
- Read `docs/systems/agent-preamble.md` first and follow it. Commits are path-limited: never `git add -A`. Use hyphens,
  not em dashes.
- Line numbers below are on origin/feature/guard-ai-polish2 4fac8536d. After the merge, find each one by the quoted
  anchor (`grep -n`).

## How heights flow today (read before you change anything)
- `snapSpot(y)` (`src/ai/enemy.ts:1232-1240`) moves `spot` to `nav.nearestWalkable(x, z, 4, y)`:
  - the cell on the storey nearest `y`, soft;
  - `src/ai/navGrid.ts:533-560`; `LAYER_PICK` 1.2 m at :85.
  - It keeps only x/z: the cell's height is thrown away.
- **Callers:**
  - `hearSearch` (enemy.ts:1216), anchor `HEAR_STOREY && y === y ? y : this.pos.y`. The manager passes the noise's
    `pos.y` at `enemyManager.ts:2889` (anchor `e.hearSearch(pos.x, pos.y, pos.z`).
  - The search branch's spot pick (enemy.ts:2795), anchor `this.snapSpot(!SNAP_STOREY ? Number.NaN : k ? k.y : this.pos.y)`.
    It covers the LKP look (`searchK === 0`, `lkpLate`), plan points (`ctx.searchPoint`) and ring points (`ringPoint`).
- **Plan points** (`enemyManager.ts` `buildPlan`, :3195-3270):
  - cover candidates on the cover's own storey (`nearestWalkable(x, z, 2, cs.y[j])`);
  - lattice cells on the LKP's storey (`cellOf(x, z, cy)`).
  - `SearchPlan` stores x/z only (`searchArea.ts:98-120`). The enemy then re-snaps them to the hunt position's storey.
- **`goTo(p, dt, near, y = NaN, partial)`** (enemy.ts:2627-2662): NaN y becomes `this.pos.y`.
  - `findPath(me, p, 3000, this.pos.y, y, partial)` picks its goal cell on y's storey (`navGrid.ts:600-603`).
  - `lineClear(me, p, this.pos.y, y)` checks the end cell is on y's storey (:571-589).
  - Its "there" null needs `|y - pos.y| < 1.2`.
  - Passing undefined also gives NaN (the default parameter). The stand-in tests rely on this, see below.
- **The search branch** (enemy.ts:2755-2856):
  - `const there = d < 1.1` (2D, :2812-2813);
  - `this.goTo(this.spot, dt, 0.6, Number.NaN, part)` (:2838);
  - the unreachable skip `!wp && lvl === 'searching' && this.routePath.length === 0 && d > 1.1` (:2845).

## Changes (exact)

### 1. `src/ai/navGrid.ts:85`
Change `const LAYER_PICK = 1.2;` to `export const LAYER_PICK = 1.2;`. No other change.

### 2. `src/ai/enemy.ts`
1. **Switches.**
   - `HEAR_STOREY` (:314-317): set it to `true`. Rewrite its doc as "(polish2 A193, on with A196) a heard spot snaps to
     the noise's storey; `spotY` takes him there or skips it. Undo: false (his own storey, A11)".
   - Next to `SNAP_STOREY` (:295), add
     `/** (spot-height A196) A snapped search spot keeps its cell's height (spotY): goTo paths to that storey, "there" needs that storey, no path skips it. Undo: false (goTo on his own storey, the 4.100 behaviour). */ const SPOT_HEIGHT = true;`
2. **Field**, next to `heardSpot` (:518):
   `/** (A196) The search spot's floor height (its snapped nav cell's); NaN: none (his own storey). */ private spotY = Number.NaN;`
3. **`snapSpot`** (:1232):
   - First line: `this.spotY = Number.NaN;`.
   - After the snap: `if (SPOT_HEIGHT && y === y) this.spotY = nav.cellHeight(c);` (`cellHeight` is at navGrid.ts:429).
     - A NaN snap (`SNAP_STOREY` off) keeps NaN.
     - No cell found (c < 0) keeps NaN.
4. **Investigating** (:2756-2762, anchor `// the latest stimulus is the spot`): add `this.spotY = Number.NaN;`. The
   stimulus has no height, so A184's near-side walk stays as it is.
5. **Clamps** (:2797-2810):
   - Where `this.spotClamped = true` is set (hold room, search room), also set `this.spotY = Number.NaN`.
   - The high-security leash line becomes
     `if (pd && pd.highSecurity) { clampToLeash(...); this.spotY = Number.NaN; }`. A post never leaves his storey.
6. **"There"** (:2812-2813):
   - Use `const sy = this.spotY;` and
     `const there = d < 1.1 && !(Math.abs(sy - this.pos.y) > LAYER_PICK);`.
   - Import `LAYER_PICK` from `./navGrid`.
   - Write it in this NaN-safe form on purpose: a NaN or undefined `spotY` (old stand-ins built with
     `Object.create(Enemy.prototype)` skip field initialisers) counts as his storey, which is today's rule.
7. **`goTo`** (:2838): `const wp = this.goTo(this.spot, dt, 0.6, this.spotY, part);`.
8. **Unreachable skip** (:2845): replace `d > 1.1` with `!there`. A spot right under or over him on another storey is
   then skipped when no path exists, instead of standing still.
9. **Comments:**
   - `hearSearch` doc (:1203-1210): the noise's storey, and the walk or skip.
   - The A11 comment at :2794: the height kept (A196).

Nothing else changes:
- patrol, combat, the dog, the revive and the pair meet keep `goTo` without a height;
- the `routeGoal` replan rule is untouched (see Risks).

### 3. Out of scope (pre-existing, left as is; say so in ai.md)
A plan point keeps being re-snapped to the hunt position's storey, not its own. A cover point upstairs with the LKP
downstairs searches the ground under it. Giving `SearchPlan` a `y` and `ctx.searchPoint` a height out is its own small
slice if the e2e or Michael ever shows it.

## Tests: `tests/guardPolish2.test.ts`, the A193 block (:326-370)
Rename the block to "A193 + A196: a heard / plan spot on its storey, walked on that storey or skipped". Keep
`twoStorey()` (:327-343). It has no stairs, so nothing on one storey can reach the other. The enemy.ts switches are
module consts: flip each by hand once to see its tests fail, as the file header says (:14-15).
1. **Un-skip the on case** (:365-370), renamed "a step on the ground heard from the upper floor snaps to the ground
   (A193)":
   - `e.hearSearch(5.2, 0, 5.2)`: `e.spot[0] < 5.5` and `spotY === 0`.
   - Read the field with `(e as unknown as { spotY: number }).spotY`.
2. **Rewrite the off case** (:345-362) as "own storey and no height":
   - `hearSearch(6.2, 4, 5.2)`: spot x > 6 and `spotY` 4.
   - `hearSearch(5.2, NaN, 5.2)` with him upstairs: spot x > 6 and `spotY` 4 (his `pos.y`).
3. **Pin gone: no path means skipped, never pressed against the edge.**
   - Guard upstairs at (8, 5, 4), searching, `hearSearch(4.7, 0, 5.2)`. That is check B's pinned row (gap 1.5).
   - The `searcher` helper's ctx needs the real `nav` (`{ nav }`, as the existing cases pass it). Add `lineClear` and
     `findPath` to it from the real grid.
   - Call the calm decide once: `(e as any).calmDecide(1/60)`, or whatever the helper's `Searcher.decide` wraps.
   - Expect:
     - `e.spotSet === false` (skipped);
     - `searchK` unchanged (a heard spot keeps K, A12);
     - `heardSpot === false`.
   - The next decide picks a new spot.
   - With `SPOT_HEIGHT` false (by hand), the goal is the upper-floor edge cell and `spotSet` stays true: the pin.
4. **Under him on another storey: not "there", skipped.**
   - Guard upstairs at (6.25, 5.25, 4), `hearSearch(6.3, 0, 5.2)`: the spot is (6.25, 5.25) on the ground and the 2D
     distance is 0.
   - One decide: `spotArrived === false` (no look from the wrong floor) and `spotSet === false`.
   - Before the change he "arrived" and looked from upstairs.
5. **The height reaches `findPath`; reachable means walked.**
   - Stand-in `nav` with:
     - `nearestWalkable: () => 7`, `cellHeight: () => 4`, `cols` / `w` / `ox` / `oz` / `cell` set so (5, 5) is cell 7;
     - `lineClear: () => false`;
     - `findPath: vi.fn(() => [[5.25, 5.25]])`, `version: 0`.
   - Guard on the ground at (0, 5, 0), searching:
     - a plan spot comes from `ctx.searchPoint` writing (5, 5) (as guardPolishA.test.ts:607-612 does);
     - `hunt: 0, combatSearch: true, searchK: 1`, `lkpOf: () => new Vector3(5, 4, 5)`.
   - Expect:
     - `findPath` was called with `toY === 4` (5th argument);
     - the goal point returned is (5.25, 5.25).
   - Then move `pos` to (5.25, 4, 5.25): the next decide is "there" (`spotArrived` true).
   - With `pos.y` 0 at the same x/z: not there.
6. **Clamp and high security drop the height.**
   - A high-security post (`postDef: { highSecurity: true, leash: 4 }, post: [0, 0]`) with a spot snapped upstairs:
     after one decide, `spotY` is NaN and `findPath` / `lineClear` got NaN or his own y.
   - Reuse the guardPolishA high-security setup (:595-600).

Also run, unchanged (their stand-ins have no `spotY`; the NaN-safe forms keep them green):
`guardPolishA`, `searchAreaWiring`, `combatHearing`, `bodySearch`, `deviceTrip`, `postsWiring`, `urgency`,
`lockedDoorPath`, `twoIntruders`, `nav`.
- If one fails because a stand-in nav lacks `cellHeight`, add `cellHeight: () => 0` to that stand-in. Do not change the
  code's NaN-safety.

**Run:**
- `npx vitest run --maxWorkers=2 tests/guardPolish2.test.ts tests/guardPolishA.test.ts tests/searchAreaWiring.test.ts tests/combatHearing.test.ts tests/bodySearch.test.ts tests/deviceTrip.test.ts tests/postsWiring.test.ts tests/urgency.test.ts tests/lockedDoorPath.test.ts tests/twoIntruders.test.ts tests/nav.test.ts tests/coopPerception.test.ts`
- Then the CORE list: every `tests/**/*.test.ts` importing `src/ai/enemy.ts`, `src/ai/enemyManager.ts` or
  `src/ai/navGrid.ts`, in chunks of about 20.
- Then `npx tsc --noEmit -p .` and `npx eslint src/ai/enemy.ts src/ai/navGrid.ts tests/guardPolish2.test.ts`.

## e2e (one laptop pr request on the pushed head, `E2E_GPU=1`)
```
node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --set spot-height --requester "Night Shift | Guard AI Build" --suites "e2e-stealth-ai e2e-ctcourse e2e-sectorops e2e-coop e2e-enemies"
```
- `e2e-stealth-ai`: the S26 heard-in-search and the search area / lkp legs.
- `e2e-sectorops`: campus storeys, S13 response team.
- `e2e-coop`: S24 / S26.
- `e2e-ctcourse`: the Marlow A7 cage and S28 locks.
- `e2e-enemies`: `findPath` everywhere.
- Watch any assert on where a searcher stands after a heard noise, or on a search-point count over time. A searcher now
  climbs to the hunt's storey or skips more spots, so counts can move. A moved count is a test update only when the
  log shows him reaching or skipping the spot. A pin (same spot for more than 10 s, `spotSet` true, no progress) is a
  bug.

## Docs
- `docs/guard-ai/BRIEF.md`:
  - rewrite A193: "ON with A196 (spot-height slice); was deferred in #377";
  - add **A196**: "A snapped search spot (heard, LKP, plan, ring) keeps its storey's height; `goTo` paths to it, 'there'
    needs that storey, no path skips it; investigate and high-security posts keep their own storey. Undo:
    `SPOT_HEIGHT = false` (and `HEAR_STOREY = false` for A193 alone)."
  - A195 is the T1-SHADOW slice's number. If either number is taken when you write, use the next free one and tell
    the lead.
- `docs/systems/ai.md`: in the polish-2 block (A193 bullet, ~:642), replace DEFERRED with the A193 + A196 rule and the
  out-of-scope plan-height note.
- `changes/feature-guard-ai-spot-height.md` (`kind: patch`):
  - "A guard searching after hearing a noise on another floor (a balcony, a catwalk) now goes to that floor by the
    stairs, or gives that spot up when there is no way there. Before, he pressed against the floor's edge for the rest
    of the search."
  - "Search spots round a last known position on another floor work the same way."
- `TESTING.md`: one line. "Marlow / campus: make a noise below a guard searching on an upper floor: he takes the stairs
  down or moves on, never stands at the edge."

## Risks
- **More cross-storey walks.** The LKP look, plan and ring spots now take him to the hunt position's storey when he is
  on another one. This was A11's intent (before, he looked from the wrong floor). It means:
  - longer walks;
  - more 3000-expansion A* to other storeys (the budget is unchanged);
  - more unreachable skips.
  The e2e watch above covers it.
- **The noise's `y` is the noise's point, not always feet** (a shot impact on a wall at 2.5 m). `nearestWalkable` picks
  the storey softly (`(dh / cell)^2` against plan distance), so a point between two storeys can pick either. Check the
  `hear` callers' `pos` (enemyManager.ts around :2840-2890). If any passes a non-floor point, pass its floor (the
  noise emitter's feet) or `NaN` there.
- **Replan on a storey-only change.** `goTo`'s `moved` test is 2D (:2641-2650). A new spot at the same x/z but on
  another storey keeps the old path until it runs out, then replans (`retry`, since `routePath` is empty and
  `routeMiss` is false). This self-heals within one walk. Do not add a y to `routeGoal`: patrol calls pass NaN, so
  `pos.y` would drift on a ramp and replan every second.
- **Stand-ins.** About 9 test files build `Enemy` with `Object.create`, so `spotY` is undefined there. Keep every read
  NaN-safe: the `goTo` default parameter, and `!(abs > LAYER_PICK)`.
- **#377 merge drift.** If the merge or a later train changes the search branch, re-read check B's table (POLISH2-CHECK-B.md:24-32)
  and keep its four rows as the truth:
  - 5.2 arrives;
  - 4.7 skipped (was pinned);
  - 4.4 skipped (was pinned);
  - 3.9 unchanged.

## Size
- 3 source and test files plus 4 docs.
- enemy.ts about +15 / -4 lines, navGrid.ts 1 line, guardPolish2.test.ts about +110 / -20 lines, docs about 25 lines.
- About 3-4 h of build plus one e2e queue run.

## Done when
- `HEAR_STOREY` is true and `SPOT_HEIGHT` is new and true. The 6 tests above pass and fail with their switch flipped
  (checked by hand, noted in the report).
- The listed vitest files, CORE, tsc and eslint are clean.
- The e2e set is green on the pushed head.
- The docs and fragment are written.
- Commits are path-limited on `feature/guard-ai-spot-height`, pushed, and a PR to master is opened (patch).
- Report: built, files, tests, e2e result, any count that moved and why. The lead then runs two fresh checkers.
