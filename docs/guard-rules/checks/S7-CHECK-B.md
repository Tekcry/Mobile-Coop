# guard-rules S7 check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker B (Opus 5.5, fresh: code, hard rules, hot paths, tests, e2e), branch `feature/guard-rules-s7`, head e75a1f050,
diff `48394def2..e75a1f050` (8 commits, 9 files), against `docs/guard-rules/slices/S7-BRIEF.md`.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on 22 files (lookout, posts, postsWiring, guardAiData, campusPosts, barkCause, coopGuardAi,
  pairsWiring, squadWiring, responseWiring, gearWiring, enemyManagerDespawn, incidents, awarenessWiring, radioWiring,
  alarmCall, camBodyWiring, searchAreaWiring, bodySearch, laserAlarm, alarmRepeat, pairs): 365 pass.
- `npx eslint` on the 4 src and 3 test files: clean. `node --check scripts/e2e-sectorops.mjs`: parses. No e2e run.

## Code and hard rules
- Scope: the owned list plus `scripts/e2e-sectorops.mjs` and `docs/systems/ai.md`. No `enemy.ts`, `src/game`,
  `src/net`, `flags.ts`, map, wire, save or `PROTOCOL_VERSION` change. `barks.ts`: `spotCall` added to `URGENT` only.
- posts.ts / guardAiData.ts match the brief (`lookout?`, `POST.lookoutLeash` 1, `LOOKOUT.callCd` 20, `mayLeave`, the
  two validator rules, the " of a lookout" route suffix).
- Flag: `flags.lookouts` read only in `slotPost` at load. Flag off: no post, `lookoutN` 0, nothing new per step;
  `slot.post` never mutated; all three slot-post reads go through `slotPost`.
- Hot path: `lookoutStep` only when `lookoutN > 0`; field and typed-array reads only; no closures, literals,
  iterators, strings or `Math.hypot`. Typed arrays made once with the manager; `heightAt` / `report` / `bark` only
  when a call fires (at most once per 20 s per lookout).
- Board: `report('noise', stimX, heightAt(x, z), stimZ, -1, 0)` as the brief; with no perceivers a calm free guard
  within 25 m is sent; the lookout is `GV_POSTED` through the high-security copy, so the board never picks him.
- Per-key state: placeSlot sets `lookRise` / `lookCd`; revive re-syncs `lookRise`; despawn zeroes the key; clear
  resets `lookoutN` and both arrays. No stale-state path found.
- Strict TS and imports correct; Babylon untouched in src.
- Beyond the brief: `slotPost(p, dog)` and the `e.dog !== null` gate: a dog is never a lookout (as flag off),
  documented in ai.md and unit-tested.

## Tests and e2e
- lookout.test.ts covers all 8 brief cases plus a dog case, a plain-post pass-through and a despawn / clear reset;
  each would fail if the feature broke; no `Math.random` or wall time; the flag is restored after each test.
- posts.test.ts and postsWiring.test.ts add the brief's one-case additions; the live-map validation stays green.
- e2e: `postSite(G, o)` is the posts site finder lifted unchanged; the posts block stays on `PARAMS`; the lookouts
  block runs on `PARAMS + '&lookouts=1'`. Loops bounded (400 lure steps, 6 s glimpse cap, 0.5 s kind wait, 10 s / 15 s
  windows, 3 light retries with a clean re-place each). Asserts match "Done looks like" and brief 6(a)-(c).

## Fix list
None.

## Polish
1. Log the dog rule as S7-f in the brief's assumptions, with its undo: drop the `dog` argument.
2. e2e (c): the second glimpse starts ~10 s after the call; a lookout still suspicious may go straight to alert
   without a `riseN` bump, a false fail (never a false pass). On a first-run failure read `r.c.gl2`; fix: wait for his
   calm or glimpse dimmer.
3. No unit test proves `spotCall` is in `URGENT` or that `update` gates `lookoutStep` on `lookoutN` (e2e (b) only); a
   one-line barks case could cover the first.
4. `lookoutN` never goes down on despawn (gate stays on for the load); negligible, matches the field doc.
