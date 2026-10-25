# guard-ai-mission-hooks S1a-1 check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker B (Opus 5.5, fresh: code, hard rules, tests), branch `feature/guard-ai-mission-hooks-s1a1`, head 758e3fe03,
base ca9f4d56a (3 commits, +807 lines).

## Checks run
- `npm run typecheck:fast`, eslint on the 3 files: clean. vitest missionOrders: 15 pass. No e2e in scope.

## Code and hard rules
- Flags as briefed, additive, default off, unread. Purity: mathx, hearing, posts plus type imports; no Babylon, DOM,
  `src/game`, `Math.hypot`.
- Hot path: board methods and `OrderLeg.step` use indexed loops, typed arrays, number locals and constant strings only;
  template strings, `Set` and `for..of` only in `checkMissionOrders` (data time); `name` / `cause` written only at
  open / reset / drop.
- Index math (`slot*3`, `slot*per + j`) has no off-by-one. NaN handling consistent (no via, no storey, no yaw, no face
  point, room y). Ids > 31 fine. `clear()` keeps identity. `live` exact; a dropped re-offer never drops a live member.
- Deviations (documented): arrival heading from the via; `LEG_RESET` with no face point faces `base`.

## Tests
- No randomness, wall time or tautologies; every brief item covered (ORDER, tags, resolve, board, leg, checker faults
  with exact counts and messages).

## Fix list
None.

## Polish
1. missionOrders.ts:401-411: a NaN `pt` makes the leg "arrive" at once; add `if (px !== px) { this.state = LEG_GIVEUP;
   return this.idle(); }` before the arrival test.
2. missionOrders.ts:308-313: `fail` on a full board records nothing.
3. Test :157, :167: start, via, post collinear, so "heading from the via" is not distinguished; move the via to (5, 5).
4. Test :171: a frozen face passes; assert max deviation > 0.5 x `POST.lureSweep`.
5. Test :175: `toBeCloseTo(ORDER.lookT, 0)` allows 0.5 s; tighten.
6. Untested: `fail` on a running order keeps members; `LEG_RESET` with no face point; pend + done reads 'offered';
   `isLive` for 'gathering'.
7. `wrapPi` duplicates posts.ts:126. 8. `x === x` NaN test could read `!Number.isNaN`. 9. Re-pin after PR4.
