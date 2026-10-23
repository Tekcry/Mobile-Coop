# S25b fix round re-check (fresh Opus, 2026-10-23)

Verdict: PASS (src and unit tests; the e2e 'search area' 'wall' run needs the change below before the laptop run)

Branch feature/guard-ai-s25 @ 7a7725ef. Read: agent preamble, CLAUDE.md Hard rules, S25B-CHECK-A.md, S25B-CHECK-B.md,
S25B-FIX.md, `git diff 702d60d7..7a7725ef`, the merge 702d60d7 (`--cc` on `enemyManager.ts`), the S25 search code in
`enemy.ts` (`:2365-2430`), `searchArea.ts` (`SearchPlan`, `pointScore`), `sweepTeam.ts`, check B's warehouse path grid
(scratchpad `cov/wh.txt`).

## Blockers
None in play. One e2e assert pair is expected to fail on a correct build (E1 below): fix before running e2e.

## (1) B1 closed
- `src/ai/coverGrid.ts:146` `queryNearest`: correct bounded max-heap on squared distance. Sift-up while the parent is
  nearer; when full, a point replaces the root only if strictly nearer, sift-down to the larger child. Returns the
  `min(out, d2)` nearest within r, no z or row bias. Out-of-grid bounds give an empty loop. No allocation (caller's
  `planCoverD`, made once, `enemyManager.ts:186`).
- `PLAN_COVER` 1024, `PLAN_CAND` = 1024 + 21 x 21 = 1465, which matches the worst `n` in `buildPlan`. Campus max 913
  within 20 m, so the heap never fills on today's maps. Cost per build is about 1000 x (`nearestWalkable` ring 2 +
  `levelAt`), a shell sort of 1465 and 1465 `offer`s x 12 `hyp2`, so well under 1 ms. A build runs only when a
  searcher picks a point, at most once per intruder per 2 s round the same centre (see (2) for a moving centre).
  Acceptable.
- Wiring test (`tests/searchAreaWiring.test.ts:494`): more than 1024 cover points in R on both sides. It asserts that
  the old `query` with 128 misses the dark north cover, and that the plan hands it out first. With the old code,
  `point(g)` would be a lit south cover, so the test fails on the real bug. The brute-force test (`:473`) checks the
  heap. Good.

## (2) A1 stale centre and the moved-centre rebuild
- Gate `enemyManager.ts:2724`: plan points only when the plan centre is within 1 m of `intruders.x/z[s]`. This is the
  same 2D measure as `buildPlan`'s `moved`, so they agree. Otherwise the result is false and the ring round the new
  LKP is used (`enemy.ts:2389`).
- `:2781` moved rebuild with live claims. No stranding:
  - `reset` frees all claims and done flags. An old holder keeps `planPoint` and walks to his old spot.
  - On arrival or unreachable, `planOver` -> `finishBy` finds no claim, which is a no-op. His next pick is a fresh
    `take`.
  - `planSweep` loops claimed points only, so a claimless holder is invisible to it.
  - The search still ends on the alert clock (`alertState.ts:189`), so nobody is stuck in search or kept from cooldown.
- No double assignment: `take` hands out only `claim === -1` points and releases the taker's own claims first. The
  stale holder's old spot may coincide with a new free point, so a second guard may look there too. This is a harmless
  repeat look.
- No per-frame thrash: a moved rebuild needs the slot field rebuilt round the new position (`:2783`). That rebuild is
  gated by `FLOW_MIN` 0.5 s, so it happens at most twice a second per slot, and only when a searcher asks. An LKP only
  moves while the intruder is sensed again, which ends the search anyway. Worst case is about 2 builds/s, about
  1 ms/s.

## (3) A2 / contactHunt / A3
- A2 (`:2753`): correct, and safe. A member who is sweeping never reaches the search branch (`enemy.ts:2365` returns
  `sweepStep` first), so he cannot re-take while sweeping. If the sweep stops (leader down or out of search) while he
  still searches, he resumes his old spot with `planPoint` true and no claim. It finishes as a no-op, which is
  harmless (polish P1).
- contactHunt (`:753`): uses the contact's slot only while `intruders.valid` is 1, else -1. `contactHunt` is reset in
  `resetAlarm` (`:740`) and `clear` (`:3332`). The test at `:569` covers both branches.
- A3 is true: `resetMemory` (`:1703`) -> `despawnAll` (`:1690`) -> `clear` -> `plans[s].reset(0, 0, -1)` (`:3331`).
  The test asserts `n` 0, `builtAt` -1 and no claim for every plan.
- Merge 702d60d7: both sides kept in the field block (plan fields, then `contactHunt`) and in `clear()` (plan reset
  loop, then `contactHunt = -1`). Clean.

## (4) e2e (scripts/e2e-stealth-ai.mjs; not run)
Setup is sound:
- every run is seeded;
- `t.reset()` is called;
- waits are sim-time steps only;
- the spots are picked from `flowOf(hunt)`, `lightField.levelAt`, `coverSet` and `searchAreaTable`;
- the e2e score formula equals `pointScore` (R is always `max` 20 in a combat search, so using `SA.max` is right);
- the 'near' asserts (a plan point within 3 m, a searcher within 1.5 m or a find) fail on the real bug.

'lkp' (0, -20): the new probe matches the hide spot. Path 35 m is past R + 3, and the ring (`searchMax` 11) never got
to the old 19 m spot. The end-of-search timing (25 s + 50 s against 12 s lost sight + 60 s search) is unchanged.

### E1 'wall': the straight-distance asserts fail on correct behaviour (expected FAIL; change before running)
Check B's warehouse path grid (doors open) from the LKP (-0.5, 0) has one place with path > 23 m within 9 m straight:
- the thin-walled pocket at x ~ -9, z -4..3 (path 22-28, straight ~8.5 m);
- its neighbours 1 m west (x -10, path 13-18) and 2-4 m east (the west bay x -5..-7, path 6-8) are inside R = 20;
- the west bay is the dark area check B itself listed as the near candidates.

So the pick lands in the pocket, and the correct plan then:
- puts a dark lattice point at (-6.5, z) or west-bay cover 1.3-3 m from the hide spot, which fails `nearB > 3`
  (`:745-746`);
- sends the searcher there, which fails `b.closest >= 4` (`:747`).

Straight distance near a thin wall says nothing about "behind the wall". The property is path distance.

Exact change:
1. `:670`, record each plan point's path from the LKP:
   ```js
   for (let q = 0; q < p0.n; q++) {
     const qc = nav.nearestWalkable(p0.x[q], p0.z[q], 2, Ly);
     pts.push([r1(p0.x[q]), r1(p0.z[q]), +p0.score[q].toFixed(2), qc >= 0 ? r1(f[qc] * cell) : 'none']);
   }
   ```
2. Replace `:745-747` (`nearB` and its assert, and the `b.closest >= 4` assert) with:
   ```js
   const pastR = Math.max(...b.plans.flatMap((p) => p.pts.map((q) => (typeof q[3] === 'number' ? q[3] - p.R : 99))));
   assert(pastR <= 0.5, `wall: every plan point is within R by path; none behind the wall (worst ${pastR.toFixed(1)} m past R; hide ${JSON.stringify(b.hide)}; plans ${JSON.stringify(b.plans)})`);
   ```
   Keep the `maxPath <= R + 1` assert: it is the "no searcher goes round the wall" check, by path. Both fail if the
   plan or the walk used straight distance. `near2` stays for 'near'.

### Other e2e risks (tweaks if they fail)
- 'near', the 20 s limit: point 0 at the LKP (3 s look) plus earlier plan points (walk + 3 s each).
  - Dark cover with a shorter path, and a dark lattice cell at the LKP (check B P6), can rank above the hide spot. The
    hide spot is only the best in the 5-7.5 m band, not overall.
  - Rank 1-2 makes it in about 10-14 s. Rank 3 or lower is borderline.
  - If it fails, read the rank in the printed `plans`, then assert that the hide spot's plan index is <= 2 and allow
    30 s, or pick the hide spot as the best-scoring candidate overall with path >= 4 m.
- 'near', homing false positive: the 'alert' homing check (`:682`, `d < 2`, `sinceSeen > 1`) also fires if the picked
  spot is within 2 m of the guard's own walk from his spawn (0, 5) to the LKP. The band at 5-7.5 m includes
  (-1..1, 4..6). Tweak in `consider` (`:604`): skip candidates within 3 m of the segment (0, 5) -> (Lx, Lz).
- `t.reset()` shuts every door, but check B's grid was measured with doors open. The picks read the live field, so
  they adapt. Only the E1 reasoning above is from the open-door grid; the path-based asserts hold either way.
- 'three': three guards must see the lit player within 900 frames or be bound by radio. A guard left with hunt -1
  fails `seen.hunt` with a clear message. Low risk.

## Polish (not blocking)
- P1. A guard whose claim was released while he walks to it (moved rebuild, a sweep that stops) keeps `planPoint`
  true. The point can be handed to a second guard, which gives a repeat look. Optionally clear `planPoint` on the next
  pick only. No change is needed.
- P2. `planSweep` / `searchDoneFor` behaviour is unchanged by this round. Check B P2 (the same top 12 on a rebuild at
  the R cap) and P4 (no height on plan points) are still open, as the fix report lists.

## What I ran
- `npx tsc --noEmit -p .`: exit 0.
- `node --check scripts/e2e-stealth-ai.mjs`: exit 0.
- `npx vitest run tests/searchArea.test.ts tests/searchAreaWiring.test.ts tests/twoIntruders.test.ts
  tests/responseWiring.test.ts tests/sweep.test.ts`: 5 files, 72 / 72 passed.
- No e2e, no full suite. No src, tests or scripts edited; nothing committed.
