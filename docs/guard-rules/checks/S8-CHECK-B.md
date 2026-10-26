# guard-rules S8 check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker B (Opus 5.5, fresh: code, hard rules, hot paths, tests, e2e), branch `feature/guard-rules-s8`, head a5d18b277,
diff `48394def2..a5d18b277` (6 files, +473 / -19, 4 commits), against `docs/guard-rules/slices/S8-BRIEF.md`.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on dogRelease, sectorStageActions, killScore, postsWiring, barkCause, guardPolish2, guardPolishA,
  campusS4, campusS5: 9 files, 168 pass (1 skip, in neither S8 file).
- `npx eslint` on the 6 changed files: 0 errors (e2e-stealth-ai.mjs is on eslint's ignore list).
- `node --check scripts/e2e-stealth-ai.mjs`: parses. e2e not run (the lead queues it).

## Code and hard rules
- Scope: only the 6 owned files. No enemyManager, posts, guardAiData, barks, flags.ts, map data, ai.md, src/net, wire
  or save change; no `PROTOCOL_VERSION` change.
- `sectorStage.ts`: `raise` returns `{ lights, doors, dogs }`; the early return carries `dogs: false`; `dogs` is an
  edge, true only when the raise reaches a `releaseDogs` stage in (from, to]; `dogsReleased` and its reset in
  `release()` kept.
- `sectorMode.ts`: `stageActions(from, to, live = true)` reads `flags.dogRelease` only on a `dogs` edge (event time).
  `releaseDogs` is an index loop over `em.enemies` filtered by `e.dog && e.section === run.index`. `beginSection`
  passes `live` false (S8-a); `raised` keeps the default.
- `enemy.ts` `releaseHeel`: free-dog guard, then target: shared last known position, else `handler ?? leader`, else its
  own spot; `searchAt(x, z, null)`, then `rush = true`. The extra commit dee832134 (a dog already searching starts
  over, the `koSearch` / `bodySearch` reset) is correct and needed: in 'searching' the alert machine ignores
  `i.search`. `onLevel` keeps `rush` through unaware -> searching.
- Hot paths: nothing per step; no closures, iterators, vectors or array literals in AI code; no `Math.hypot` in src.
- Pooled state: no new fields; `rush`, `searchReq`, `searchOwn` and the stimulus are reset by spawn, revive,
  level-change and clear.
- Strict TS holds; `import type` where needed; no Babylon imports added. Flag `dogRelease` (`?dogrelease=1`, default
  off) read only in `stageActions`. Releases only through `raised` (host or solo); no wire change.

## Tests and e2e
- dogRelease.test.ts (Enemy): known position sets stimulus, `searchReq`, `searchOwn`, `rushing`, then 'searching';
  no known position falls back handler, leader, own spot; not a dog / dead / alerted / passive / held returns false;
  already searching resets; heel-back in cooldown returns the heel spot at the far-run pace.
- dogRelease.test.ts (mode): flag on releases each live-section dog once (not another section's, not a human, not
  again); flag off records only; no `releaseDogs` stage or `live` false releases none; source check on `beginSection`.
- The tests fail if the flag, `live`, section or dog filter or the `dogs` edge breaks; no `Math.random` or wall time.
- sectorStageActions.test.ts: results gain `dogs: false`; the stub case became the edge case.
- e2e 'dog release (guard-rules S8)': deterministic (seeded `Math.random`, restored in `finally`), bounded loops (at
  most 820 of 900 steps), asserts cover every "Done looks like" point; 80 s allowed against the 60 s search.

## Fix list
None.

## Polish
1. enemy.ts ~1673-1682: the "start over" reset block is in three places (`koSearch`, `bodySearch`, `releaseHeel`); a
   private `restartSearch()` keeps them in step.
2. enemy.ts ~1690: `this.handler ?? this.leader` can pick a dead `leader` (`releaseHeel` does not drop dead leaders as
   `findLeader` does); only for a handler-less dog.
3. ai.md: say "a dog already searching starts over round the release spot" (dee832134; folded by S7 at the lead's
   word).
4. e2e: "handler stays calm and put" relies on `reportIntruder(0, ..., true)` not pulling the grunt in through the
   board; check this first if it fails on the laptop.
5. e2e heel-back counts `held` on `d['spot']` only; a stale spot gives a false fail at `spotToH < 2`, never a false
   pass.
6. Enemy case 1 steps `AlertMachine` by hand; the `searchReq` -> alert input wiring is covered by the e2e only.
