# S25b check A (fresh Opus checker, 2026-10-23)

Verdict: PASS

Branch feature/guard-ai-s25 @ 73038a40 (base S24 96d565e5 + merge of S25a 2f04b4bd + the S25b commit). Read: S25.md
(origin/feature/guard-ai, whole), the cloud brief + builder report (origin/cloud-queue briefs/guard-ai-S25b.md), the S25a
check (S25A-CHECK.md), CLAUDE.md Hard rules, the agent preamble, `git diff 96d565e5..73038a40 -- src tests`, and the S24
fix diff (`96d565e5..origin/feature/guard-ai-s24`).

## Blockers
None.

## Correctness vs the brief (all hold)
- Search branch (`enemy.ts:2371-2379`): point 0 is the LKP (`searchK === 0`); after that `ctx.searchPoint` only when
  `lvl === 'searching' && combatSearch && !searchOwn && hunt >= 0 && SEARCH_AREA.enabled`; else `ringPoint` at
  `searchK - 1 - planN`. `planN` is 0 whenever no plan point was given, so `enabled = false` (short-circuits before the
  hook) and every calm search (`searchOwn` / not `combatSearch`) give exactly today's ring. The index never goes negative
  (each plan point gets its own `searchK++` before the next spot; every `searchK = 0` also zeroes `planN`).
- Claims: `take` claims one free, not-done point per guard and releases his earlier claim first, so two guards never
  hold one point. `searchDone` goes through `finishBy(num)` over every plan (`enemyManager.ts` `searchDoneFor`), never
  a saved index. Release: `onKilled` (kill and knockout both go through `die`), `despawn`, the per-update `planSweep`
  (`:2717-2727`: gone / dead / not searching / `!onPlan` / `hunt !== s`), `clear` and `forgetStep` reset the plan.
  `onLevel` and `koSearch` / `bodySearch` drop `planPoint`, so the sweep frees the claim within one update.
- `buildPlan` (`:2738-2822`): due = never built / older than `rebuild` / centre moved > 1 m; returns on any live claim
  (`:2750`) and when the slot's field is missing, from another nav version or round another position (`:2752-2753`).
  Candidates collected into fixed scratch, `orderByScore` (shell sort, gap sequence ends at 0 correctly), offered best
  first. Cover: `nearestWalkable(.., 2, y)`, path test `f[c] * cell <= r` (`flowField` is in cells, confirmed
  `navGrid.ts:712`). Lattice `m = floor(r / 2) <= 10` so at most 441 cells; `PLAN_CAND` = 128 + 441 fits.
- One plan per intruder slot; `e.hunt` is fixed during a search (`tell` only rebinds alerted guards), so no plan is
  built round the wrong intruder.
- Searches still end on the alert machine's clock (`alertState.ts:189`), independent of `searchK` / the plan; an
  unreachable plan point is finished (`reached` false) and skipped as before, so no guard is stuck on a plan point.
- Hot paths: no closures, iterators or temporary arrays added on any per-frame path (`planSweep`, `searchPointFor`,
  `take`, `finishBy`); all arrays made once; `hyp2` / `hyp3` only, no `Math.hypot`.

## S24 fix interaction (origin/feature/guard-ai-s24 e31edd54)
- `git merge-tree 73038a40 origin/feature/guard-ai-s24`: `enemy.ts` auto-merges (takeSighting and planOver sit side by
  side, no overlap). `enemyManager.ts` has 2 trivial conflicts, keep both sides in each:
  1. the field block after `private alarmHunt = -1;` (S24 adds `contactHunt`, S25b adds the plan fields);
  2. `clear()` after `this.alarmHunt = -1;` (S24 `this.contactHunt = -1;`, S25b the plan reset loop).
- Semantics: no conflict. The fix binds more hunt -1 joiners in combat, so more combat searchers get a plan (good).
  Searching guards with hunt -1 still get the ring (S25b requires `hunt >= 0`), as designed.

## Polish (not blocking)
1. Stale plan centre (`enemyManager.ts:2697`, `:2750-2753`): when `buildPlan` returns early because a claim is live or
   the chase field is not yet rebuilt, `searchPointFor` still hands out points from the OLD plan (`builtAt >= 0`), round
   the previous LKP. Scenario: intruder searched at A; a guard out of radio reach keeps searching A with a claim; the
   intruder is fought and lost at B 30 m away; B's searchers get A's points and walk back to A. Also the 0.5 s window
   after any LKP move before the slot field rebuilds. Fix: after `buildPlan`, return false (the ring) when
   `hyp2(p.cx - lkpX, p.cz - lkpZ) > PLAN_MOVE`; and with `finishBy` in place a rebuild on a MOVED centre could be
   allowed even with live claims (the old index hazard is gone).
2. Rebuild by age is near-impossible with 2+ searchers (someone almost always holds a claim), so R stays at its first
   value and a grown area is not added until the claims happen to clear. Fine as a prototype; note for Michael's playtest.
3. Response team sweep (`enemy.ts:2355`): a crew member who holds a plan point when his team starts sweeping keeps the
   claim (`planPoint` true, still searching, same hunt) for the whole sweep, which never ends for an aggressive team.
   That point is never searched by anyone else, and `anyClaim` blocks every rebuild of that slot's plan until the next
   contact. Fix: release in `planSweep` when `e.crew?.sweeping`, or `planOver`/clear `planPoint` on entering `sweepStep`.
4. `resetMemory` (`:1685`, Sector Ops checkpoint restart) does not reset the plans (claims are freed by `despawnAll`).
   If the intruder is seen again within 1 m of the old centre before `forgetStep` drops him, the rebuild keeps the old
   life's done flags (`!moved` path). Add the same `reset(0, 0, -1)` loop as `clear`.
5. Clamped points are finished as searched: a high-security post's leash clamp (`enemy.ts:2395`) or a `hold` room clamp
   (`:2389`) moves the spot, and the look there marks the real plan point done. Skip the plan for `highSecurity` posts,
   or finish with `reached` false and let another searcher take it.
6. Cover query cap (`PLAN_COVER = 128`, `:112`): cover points are every 1.7 m along every segment, so a 20 m disk in a
   dense warehouse can exceed 128; `coverGrid.query` stops in row order, dropping cover on the +z side. The lattice still
   covers dark cells; raise the cap (e.g. 512) or query at a smaller radius first.
7. `plans` is a literal 4-entry array (`:176`) while everything else loops `MAX_INTRUDERS`; build it from
   `MAX_INTRUDERS` so a change there cannot index past the end.
8. A rebuild round the same centre re-marks any new point within 3 m of an old done point as done (never searched);
   acceptable, worth one line in `docs/systems/ai.md`.
9. `searchDone`'s `reached` is ignored by the manager (both are done, per the brief); fine, but the hook comment could
   say so.

## What I ran
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/searchArea.test.ts tests/searchAreaWiring.test.ts tests/bodySearch.test.ts tests/urgency.test.ts
  tests/sweep.test.ts tests/twoIntruders.test.ts`: 6 files, 63 / 63 passed.
- `git merge-tree --write-tree 73038a40 origin/feature/guard-ai-s24`: 1 file conflicted (`enemyManager.ts`, 2 hunks
  above), `enemy.ts` clean.
- No full suite, no e2e, no eslint (not asked).
